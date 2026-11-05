// Checks: regelmäßige Prüfungen dieses Servers bzw. von hier aus – Ping, Webseite (HTTP), Port, Zertifikat,
// Dienst läuft, Platte, eigenes Skript. Nach „failAfter“ Fehlschlägen hintereinander gibt es eine Warnung
// (Push, Discord, Webhook, E-Mail), wenn es wieder klappt eine Entwarnung. Gespeichert in checks.json.
const fs = require('fs');
const net = require('net');
const tls = require('tls');
const crypto = require('crypto');
const { execFile } = require('child_process');
const config = require('./config');
const { runBash } = require('./scripts');

const TYPES = ['ping', 'http', 'port', 'cert', 'service', 'disk', 'script'];
const HOST_RE = /^(?=.{1,253}$)[A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?(\.[A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?)*$|^\d{1,3}(\.\d{1,3}){3}$|^[0-9a-fA-F:]+$/;
const UNIT_RE = /^[A-Za-z0-9][A-Za-z0-9@._:\\-]{0,250}(\.service)?$/;
const HISTORY = 120;
const bad = msg => Object.assign(new Error(msg), { status: 400 });

// Eingabe prüfen -> sauberer Check
function cleanCheck(c) {
  const type = String(c.type || '');
  if (!TYPES.includes(type)) throw bad('Unbekannte Art von Check.');
  const out = {
    id: c.id || crypto.randomBytes(6).toString('hex'), type,
    name: String(c.name || '').trim().slice(0, 60),
    interval: Math.max(30, Math.min(86400, Number(c.interval) || 60)),
    failAfter: Math.max(1, Math.min(10, Number(c.failAfter) || 2)),
    enabled: c.enabled !== false,
  };
  if (type === 'ping' || type === 'port' || type === 'cert') {
    const host = String(c.host || '').trim();
    if (!HOST_RE.test(host)) throw bad('Adresse ungültig (z. B. example.com oder 1.2.3.4).');
    out.host = host;
  }
  if (type === 'port' || type === 'cert') {
    const port = Number(c.port) || (type === 'cert' ? 443 : 0);
    if (!(port >= 1 && port <= 65535)) throw bad('Port ungültig (1–65535).');
    out.port = port;
  }
  if (type === 'cert') out.days = Math.max(1, Math.min(90, Number(c.days) || 14));
  if (type === 'http') {
    const url = String(c.url || '').trim();
    if (!/^https?:\/\/[^\s]+$/.test(url)) throw bad('Adresse muss mit http:// oder https:// beginnen.');
    out.url = url;
    out.keyword = String(c.keyword || '').slice(0, 200);
    out.expect = c.expect ? Math.max(100, Math.min(599, Number(c.expect))) : 0;
  }
  if (type === 'service') {
    const s = String(c.service || '').trim();
    if (!UNIT_RE.test(s)) throw bad('Dienstname ungültig.');
    out.service = /\.service$/.test(s) ? s : s + '.service';
  }
  if (type === 'disk') {
    const p = String(c.path || '/').trim();
    if (!p.startsWith('/') || p.length > 300) throw bad('Pfad muss mit / beginnen.');
    out.path = p;
    out.limit = Math.max(50, Math.min(99, Number(c.limit) || 90));
  }
  if (type === 'script') {
    const body = String(c.body || '');
    if (!body.trim()) throw bad('Das Skript ist leer.');
    if (body.length > 16384) throw bad('Skript zu lang.');
    out.body = body;
  }
  if (!out.name) out.name = describe(out);
  return out;
}

function describe(c) {
  switch (c.type) {
    case 'ping': return `Ping ${c.host}`;
    case 'http': return c.url.replace(/^https?:\/\//, '').slice(0, 50);
    case 'port': return `${c.host}:${c.port}`;
    case 'cert': return `Zertifikat ${c.host}`;
    case 'service': return c.service.replace(/\.service$/, '');
    case 'disk': return `Platte ${c.path}`;
    default: return 'Skript';
  }
}

// ---------- Prüfungen ----------
function ping(host) {
  return new Promise(resolve => {
    const t = Date.now();
    execFile('ping', ['-c', '1', '-W', '3', host], { timeout: 6000 }, (err, out) => {
      const m = /time[=<]([\d.]+)\s*ms/.exec(String(out || ''));
      resolve(err ? { ok: false, msg: 'Keine Antwort' } : { ok: true, ms: m ? Number(m[1]) : Date.now() - t, msg: 'Antwort' });
    });
  });
}

async function http(c) {
  const t = Date.now();
  try {
    const res = await fetch(c.url, { redirect: 'follow', signal: AbortSignal.timeout(10000), headers: { 'User-Agent': 'S3cure-Agent-Check' } });
    const ms = Date.now() - t;
    const body = c.keyword ? await res.text() : '';
    if (c.expect ? res.status !== c.expect : res.status >= 400) return { ok: false, ms, msg: `HTTP ${res.status}` };
    if (c.keyword && !body.includes(c.keyword)) return { ok: false, ms, msg: `„${c.keyword}“ nicht gefunden` };
    return { ok: true, ms, msg: `HTTP ${res.status}` };
  } catch (err) {
    return { ok: false, msg: /timeout|aborted/i.test(String(err && err.name) + err) ? 'Zeitüberschreitung' : String((err.cause && err.cause.code) || err.message) };
  }
}

function port(host, p) {
  return new Promise(resolve => {
    const t = Date.now();
    const s = net.connect({ host, port: p, timeout: 5000 });
    const done = r => { s.destroy(); resolve(r); };
    s.on('connect', () => done({ ok: true, ms: Date.now() - t, msg: 'Offen' }));
    s.on('timeout', () => done({ ok: false, msg: 'Zeitüberschreitung' }));
    s.on('error', e => done({ ok: false, msg: e.code === 'ECONNREFUSED' ? 'Abgelehnt (nichts lauscht)' : e.code || e.message }));
  });
}

function cert(c) {
  return new Promise(resolve => {
    const s = tls.connect({ host: c.host, port: c.port, servername: c.host, rejectUnauthorized: false, timeout: 8000 }, () => {
      const crt = s.getPeerCertificate();
      const days = crt && crt.valid_to ? Math.floor((Date.parse(crt.valid_to) - Date.now()) / 864e5) : null;
      const authorized = s.authorized;
      const err = s.authorizationError;
      s.end();
      if (days == null) return resolve({ ok: false, msg: 'Kein Zertifikat' });
      if (!authorized) return resolve({ ok: false, msg: `Ungültig: ${err}`, days });
      resolve({ ok: days >= c.days, msg: days < 0 ? 'Abgelaufen' : `Noch ${days} Tage`, days });
    });
    s.on('timeout', () => { s.destroy(); resolve({ ok: false, msg: 'Zeitüberschreitung' }); });
    s.on('error', e => resolve({ ok: false, msg: e.code || e.message }));
  });
}

function service(name) {
  return new Promise(resolve => execFile('systemctl', ['is-active', name], { timeout: 8000 }, (err, out) => {
    const st = String(out || '').trim() || 'unbekannt';
    resolve({ ok: st === 'active', msg: st });
  }));
}

function disk(c) {
  try {
    const s = fs.statfsSync(c.path);
    const used = Math.round(100 * (s.blocks - s.bavail) / s.blocks);
    return { ok: used < c.limit, msg: `${used} % belegt`, value: used };
  } catch (e) { return { ok: false, msg: e.code === 'ENOENT' ? 'Pfad gibt es nicht' : e.message }; }
}

async function script(c) {
  const r = await runBash(c.body, { timeout: 30 });
  const last = r.output.trim().split('\n').pop() || '';
  return { ok: r.code === 0, msg: (r.code === 0 ? '' : `Exit ${r.code}: `) + last.slice(0, 160), ms: r.ms };
}

async function runCheck(c, { demo = false } = {}) {
  if (demo) {
    const fail = c.type === 'cert' && /expired/.test(c.host || '');
    return { ok: !fail, ms: Math.round(20 + Math.random() * 80), msg: fail ? 'Abgelaufen' : c.type === 'cert' ? 'Noch 62 Tage' : c.type === 'disk' ? '15 % belegt' : 'OK' };
  }
  switch (c.type) {
    case 'ping': return ping(c.host);
    case 'http': return http(c);
    case 'port': return port(c.host, c.port);
    case 'cert': return cert(c);
    case 'service': return service(c.service);
    case 'disk': return disk(c);
    case 'script': return script(c);
    default: return { ok: false, msg: 'Unbekannt' };
  }
}

// ---------- Verwaltung + Takt ----------
function createChecks({ notify, getCfg, muted = () => false, demo = false }) {
  let list = config.readJson('checks.json', []);
  const state = new Map(); // id -> { status, fails, last, msg, ms, history: [[t, ok, ms]] }
  const timers = new Map();
  const save = () => config.writeJson('checks.json', list);

  const st = c => {
    if (!state.has(c.id)) state.set(c.id, { status: 'pending', fails: 0, last: null, msg: '', ms: null, history: [] });
    return state.get(c.id);
  };

  async function execute(c) {
    const s = st(c);
    let r;
    try { r = await runCheck(c, { demo }); } catch (e) { r = { ok: false, msg: e.message }; }
    const before = s.status;
    s.last = Date.now(); s.msg = r.msg || ''; s.ms = r.ms ?? null;
    s.history.push([s.last, r.ok ? 1 : 0, r.ms ?? null]);
    if (s.history.length > HISTORY) s.history.splice(0, s.history.length - HISTORY);
    s.fails = r.ok ? 0 : s.fails + 1;
    s.status = r.ok ? 'ok' : s.fails >= c.failAfter ? 'fail' : (before === 'fail' ? 'fail' : 'warn');
    const server = getCfg().name;
    if (before !== 'fail' && s.status === 'fail' && !muted()) notify.send({ title: `${server}: ${c.name}`, body: `Check fehlgeschlagen – ${s.msg}`, level: 'bad', url: '/#/s/local/checks', tag: 'check-' + c.id }).catch(() => {});
    if (before === 'fail' && s.status === 'ok' && !muted()) notify.send({ title: `${server}: ${c.name}`, body: `Wieder in Ordnung ✓ (${s.msg})`, level: 'ok', url: '/#/s/local/checks', tag: 'check-' + c.id }).catch(() => {});
    return s;
  }

  function schedule(c) {
    clearTimeout(timers.get(c.id));
    if (!c.enabled) return;
    const loop = async () => { await execute(c); timers.set(c.id, setTimeout(loop, c.interval * 1000)); };
    timers.set(c.id, setTimeout(loop, 2000 + Math.random() * 3000));
  }

  const view = c => { const s = st(c); return { ...c, body: c.type === 'script' ? c.body : undefined, state: { status: c.enabled ? s.status : 'paused', last: s.last, msg: s.msg, ms: s.ms, history: s.history.slice(-40) } }; };

  function upsert(input) {
    const c = cleanCheck(input);
    const i = list.findIndex(x => x.id === c.id);
    if (i >= 0) list[i] = c; else { if (list.length >= 100) throw bad('Höchstens 100 Checks.'); list.push(c); }
    state.delete(c.id);
    save(); schedule(c);
    return view(c);
  }
  function remove(cid) { list = list.filter(x => x.id !== cid); clearTimeout(timers.get(cid)); state.delete(cid); save(); }
  async function runNow(cid) { const c = list.find(x => x.id === cid); if (!c) throw Object.assign(new Error('Check gibt es nicht.'), { status: 404 }); await execute(c); return view(c); }

  return {
    start: () => list.forEach(schedule),
    stop: () => { for (const t of timers.values()) clearTimeout(t); },
    list: () => list.map(view), upsert, remove, runNow,
    summary: () => list.filter(c => c.enabled).reduce((m, c) => { const s = st(c).status; m[s] = (m[s] || 0) + 1; return m; }, {}),
  };
}

module.exports = { createChecks, cleanCheck, runCheck, describe, TYPES };
