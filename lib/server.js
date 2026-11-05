// Web-Server des Agenten: Web-App (public/) und API. Hört standardmäßig nur auf 127.0.0.1 –
// nach außen über nginx/Caddy mit HTTPS (siehe README). Anmeldung: Passwort + 2FA, Sitzung im Cookie.
// Schutz: SameSite=Strict-Cookie + eigene Kopfzeile bei Änderungen (gegen fremde Webseiten),
// strenge Sicherheits-Header, Rate-Limit bei der Anmeldung, Rollen (admin/viewer), Protokoll aller Aktionen.
const fs = require('fs');
const path = require('path');
const http = require('http');
const crypto = require('crypto');
const config = require('./config');
const { createAuth } = require('./auth');
const { createSystem, createDemo } = require('./system');
const { createHistory } = require('./history');
const { createPush } = require('./push');
const { createAlerts } = require('./alerts');
const { createNotify, clean: cleanNotify } = require('./notify');
const { createScripts, runBash } = require('./scripts');
const { createChecks } = require('./checks');
const { createUpdates } = require('./updates');
const inventory = require('./inventory');
const { createTasks } = require('./tasks');
const { createFiles } = require('./files');
const { createTerminals } = require('./terminal');

const VERSION = require('../package.json').version;
const PUBLIC = path.join(__dirname, '..', 'public');
const COOKIE = 's3s';
const MAX_BODY = 64 * 1024;
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json', '.json': 'application/json', '.ico': 'image/x-icon' };

const SECURITY_HEADERS = {
  'Content-Security-Policy': "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; connect-src 'self'; manifest-src 'self'; worker-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
  'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', 'X-Frame-Options': 'DENY',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()', 'Cross-Origin-Opener-Policy': 'same-origin',
};

// Proxy auf diesem Rechner oder in einem privaten (Docker-)Netz
const trustedProxy = ip => /^(127\.|::1$|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|f[cd][0-9a-f]{2}:)/i.test(String(ip));

class HttpError extends Error { constructor(status, msg) { super(msg); this.status = status; } }
// Terminal-Seite: xterm.js setzt Farben über eigene <style>-Elemente, Skripte bleiben streng
const TERM_CSP = SECURITY_HEADERS['Content-Security-Policy'].replace("style-src 'self'", "style-src 'self' 'unsafe-inline'");

function createAgent({ demo = !!process.env.S3CURE_AGENT_DEMO } = {}) {
  let cfg = config.load();
  const getCfg = () => cfg;
  const auth = createAuth();
  const sys = demo ? createDemo({ protect: cfg.control.protect }) : createSystem({ protect: cfg.control.protect });
  const history = createHistory();
  const push = createPush({ subject: /^https:\/\//.test(cfg.publicUrl) ? cfg.publicUrl : undefined });
  let lastMetrics = null;
  const notify = createNotify({ getCfg, push });
  const scripts = createScripts();
  // Wartungsfenster: solange aktiv, keine Warnungen von diesem Server
  const inMaintenance = () => !!(cfg.maintenance && cfg.maintenance.until > Date.now());
  const checks = createChecks({ notify, getCfg, demo, muted: inMaintenance });
  const updates = createUpdates({ notify, getCfg, demo, reboot: () => sys.reboot() });

  // ---------- Protokoll ----------
  function audit(entry) {
    try {
      config.ensureDir();
      fs.appendFileSync(config.file('audit.log'), JSON.stringify({ at: new Date().toISOString(), ...entry }) + '\n', { mode: 0o600 });
    } catch {}
  }
  function readAudit(n = 200) {
    try { return fs.readFileSync(config.file('audit.log'), 'utf8').trim().split('\n').slice(-n).reverse().map(l => JSON.parse(l)); } catch { return []; }
  }

  // ---------- Server: dieser und weitere (Hub) ----------
  const local = {
    id: 'local',
    async overview() {
      const [m, s] = [lastMetrics || await sys.metrics(), await sys.services().catch(() => ({ list: [] }))];
      return { metrics: m, failed: s.list.filter(x => x.active === 'failed').map(x => x.name), services: s.list, checks: checks.summary(), maintenance: inMaintenance() ? cfg.maintenance : null };
    },
    services: () => sys.services(), serviceAction: (n, a) => sys.serviceAction(n, a), serviceLogs: (n, l) => sys.serviceLogs(n, l),
    containers: () => sys.containers(), containerAction: (n, a) => sys.containerAction(n, a), containerLogs: (n, l) => sys.containerLogs(n, l),
    reboot: () => sys.reboot(),
    processes: (sort, limit) => sys.processes(sort, limit), disks: () => sys.disks(),
  };

  // Anderer Agent: gleiche Aufrufe über HTTPS mit dessen Schlüssel
  function remote(peer) {
    const call = async (method, p, body, timeoutMs) => {
      const res = await fetch(peer.url.replace(/\/+$/, '') + '/api/agent' + p, {
        method, headers: { Authorization: 'Bearer ' + peer.token, 'Content-Type': 'application/json', 'X-S3cure': '1' },
        body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(timeoutMs || (method === 'GET' ? 15000 : 95000)),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new HttpError(res.status === 401 ? 502 : res.status, data.error || `Server ${peer.name}: Fehler ${res.status}`);
      return data;
    };
    const e = encodeURIComponent;
    return {
      id: 'peer:' + peer.name, name: peer.name,
      overview: () => call('GET', '/overview'), services: () => call('GET', '/services'), containers: () => call('GET', '/containers'),
      serviceAction: (n, a) => call('POST', `/services/${e(n)}/${e(a)}`), containerAction: (n, a) => call('POST', `/containers/${e(n)}/${e(a)}`),
      serviceLogs: async (n, l) => (await call('GET', `/services/${e(n)}/logs?lines=${l}`)).text,
      containerLogs: async (n, l) => (await call('GET', `/containers/${e(n)}/logs?lines=${l}`)).text,
      reboot: () => call('POST', '/reboot'),
      processes: (sort, limit) => call('GET', `/processes?sort=${sort === 'mem' ? 'mem' : 'cpu'}&limit=${limit || 10}`), disks: () => call('GET', '/disks'),
      raw: (method, p, body) => call(method, p, body, p === '/x-exec' ? 3700e3 : undefined),
    };
  }

  const servers = () => [{ ...local, name: cfg.name }, ...(cfg.peers || []).map(remote)];
  const server = id => { const s = servers().find(x => x.id === id); if (!s) throw new HttpError(404, 'Server nicht gefunden.'); return s; };

  // Alle Server für Übersicht und Warnungen
  async function collect() {
    return Promise.all(servers().map(async s => {
      try {
        const o = await s.overview();
        return { id: s.id, name: s.name, ok: true, metrics: o.metrics, failed: o.failed, checks: o.checks || null, maintenance: o.maintenance || null, services: o.services || (o.failed || []).map(n => ({ name: n, active: 'failed' })) };
      } catch (err) { return { id: s.id, name: s.name, ok: false, error: String(err.message || err) }; }
    }));
  }

  const alerts = createAlerts({ getCfg, collect, audit, push: { send: p => notify.send({ title: p.title, body: p.body, url: p.url, tag: p.tag, level: p.urgent ? 'bad' : /^(Wieder|Back)/.test(p.body) ? 'ok' : 'warn' }) } });

  // Messwerte alle 10 Sekunden (für Verlauf und schnelle Antworten)
  let sampler = null;
  async function sample() { try { lastMetrics = await sys.metrics(); history.add(lastMetrics); } catch {} }

  // ---------- HTTP-Hilfen ----------
  function send(res, status, body, headers = {}) {
    const data = typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body);
    res.writeHead(status, { ...SECURITY_HEADERS, 'Cache-Control': 'no-store', ...(typeof body === 'object' && !Buffer.isBuffer(body) ? { 'Content-Type': 'application/json; charset=utf-8' } : {}), ...headers });
    res.end(data);
  }

  // Echte IP des Besuchers (für Sperre und Protokoll). Kopfzeilen nur von einem Proxy auf diesem Rechner
  // bzw. aus einem lokalen Docker-Netz glauben (z. B. Nginx Proxy Manager im Container) – der Agent hört
  // ohnehin nur auf 127.0.0.1 oder der Docker-Adresse. X-Real-IP setzt der Proxy selbst; bei
  // X-Forwarded-For zählt der letzte Eintrag (den hat der Proxy angehängt, die davor kann jeder fälschen).
  const clientIp = req => {
    const remoteIp = String(req.socket.remoteAddress || '').replace(/^::ffff:/, '');
    if (!trustedProxy(remoteIp)) return remoteIp;
    const real = String(req.headers['x-real-ip'] || '').trim();
    if (real) return real;
    const fwd = String(req.headers['x-forwarded-for'] || '').split(',').map(x => x.trim()).filter(Boolean);
    return fwd.length ? fwd[fwd.length - 1] : remoteIp;
  };
  const isHttps = req => req.headers['x-forwarded-proto'] === 'https' || /^https:/.test(cfg.publicUrl);

  function cookies(req) {
    const out = {};
    for (const part of String(req.headers.cookie || '').split(';')) { const i = part.indexOf('='); if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim()); }
    return out;
  }

  function readBody(req, max = MAX_BODY) {
    return new Promise((resolve, reject) => {
      let size = 0; const chunks = [];
      req.on('data', c => { size += c.length; if (size > max) { reject(new HttpError(413, 'Zu groß.')); req.destroy(); } else chunks.push(c); });
      req.on('end', () => { if (!chunks.length) return resolve({}); try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); } catch { reject(new HttpError(400, 'Ungültige Anfrage.')); } });
      req.on('error', reject);
    });
  }

  function serveStatic(req, res, pathname) {
    let rel = pathname === '/' ? '/index.html' : pathname;
    const file = path.normalize(path.join(PUBLIC, rel));
    if (!file.startsWith(PUBLIC + path.sep)) return send(res, 404, 'Nicht gefunden', { 'Content-Type': 'text/plain' });
    fs.readFile(file, (err, data) => {
      if (err) {
        // Unbekannte Pfade -> App (Navigation innerhalb der App)
        if (!path.extname(rel)) return serveStatic(req, res, '/');
        return send(res, 404, 'Nicht gefunden', { 'Content-Type': 'text/plain' });
      }
      const ext = path.extname(file);
      // Versionsnummer an App-Dateien hängen: nach einem Update holt das Handy sie garantiert neu –
      // auch wenn ein Proxy davor (z. B. „Cache Assets“ im Nginx Proxy Manager) sie lange zwischenspeichert
      if (rel === '/index.html') data = Buffer.from(String(data).replace(/(href|src)="\/(app\.css|app\.js)"/g, `$1="/$2?v=${VERSION}"`));
      // App-Dateien immer frisch prüfen (nach einem Update sofort die neue Version); nur Symbole zwischenspeichern
      const cache = rel.startsWith('/icons/') ? 'public, max-age=86400' : 'no-cache';
      if (rel === '/term.html') data = Buffer.from(String(data).replace(/(href|src)="\/(term\.css|term\.js)"/g, `$1="/$2?v=${VERSION}"`));
      send(res, 200, data, { 'Content-Type': TYPES[ext] || 'application/octet-stream', 'Cache-Control': cache, ...(rel === '/sw.js' ? { 'Service-Worker-Allowed': '/' } : {}), ...(rel === '/term.html' ? { 'Content-Security-Policy': TERM_CSP } : {}) });
    });
  }

  // ---------- Routen ----------
  const routes = [];
  const route = (method, pattern, opts, fn) => routes.push({ method, re: new RegExp('^' + pattern.replace(/:(\w+)/g, '(?<$1>[^/]+)') + '$'), ...opts, fn });

  route('POST', '/api/login', { public: true }, async ({ req, res, body }) => {
    const ip = clientIp(req);
    const r = await auth.login({ user: body.user, password: body.password, code: body.code, ip, ua: req.headers['user-agent'] });
    audit({ user: String(body.user || '').slice(0, 40), action: r.ok ? 'login' : r.locked ? 'login-locked' : 'login-failed', ip });
    if (!r.ok) throw new HttpError(r.locked ? 429 : 401, r.locked ? 'Zu viele Fehlversuche. Bitte 15 Minuten warten.' : 'Benutzer, Passwort oder Code stimmt nicht.');
    const secure = isHttps(req) ? '; Secure' : '';
    res.setHeader('Set-Cookie', `${COOKIE}=${r.token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${30 * 86400}${secure}`);
    return { user: r.user, role: r.role };
  });

  route('POST', '/api/logout', { public: true }, ({ req, res }) => {
    auth.logout(cookies(req)[COOKIE]);
    res.setHeader('Set-Cookie', `${COOKIE}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0`);
    return { ok: true };
  });

  route('GET', '/api/me', {}, ({ who }) => ({ user: who.user, role: who.role, name: cfg.name, version: VERSION, push: push.publicKey(), devices: push.forUser(who.user), demo }));

  route('GET', '/api/servers', {}, async () => {
    const list = await collect();
    const act = alerts.list();
    const meta = config.readJson('meta.json', {});
    return list.map(s => ({ id: s.id, name: s.name, ok: s.ok, error: s.error, metrics: s.metrics, failed: s.failed || [], checks: s.checks || null, maintenance: s.maintenance || null, meta: meta[s.id] || null, issues: act.filter(i => i.server === s.id) }));
  });

  route('GET', '/api/s/:id/overview', {}, async ({ params, url }) => {
    const s = server(params.id);
    const o = await s.overview();
    const hours = Math.min(168, Math.max(1, Number(url.searchParams.get('hours')) || 24));
    return { id: s.id, name: s.name, metrics: o.metrics, failed: o.failed, history: s.id === 'local' ? history.range(hours) : (o.history || []), maintenance: o.maintenance || null, issues: alerts.list().filter(i => i.server === s.id) };
  });
  route('GET', '/api/s/:id/services', {}, ({ params }) => server(params.id).services());
  route('GET', '/api/s/:id/containers', {}, ({ params }) => server(params.id).containers());
  route('GET', '/api/s/:id/services/:name/logs', {}, async ({ params, url }) => ({ text: await server(params.id).serviceLogs(params.name, Number(url.searchParams.get('lines')) || 200) }));
  route('GET', '/api/s/:id/containers/:name/logs', {}, async ({ params, url }) => ({ text: await server(params.id).containerLogs(params.name, Number(url.searchParams.get('lines')) || 200) }));

  route('POST', '/api/s/:id/services/:name/:action', { admin: true }, async ({ params, who, req }) => {
    const s = server(params.id);
    try { await s.serviceAction(params.name, params.action); } catch (err) { throw new HttpError(err.status || 400, err.message); }
    audit({ user: who.user, action: 'service-' + params.action, target: `${s.name}: ${params.name}`, ip: clientIp(req) });
    return { ok: true };
  });
  route('POST', '/api/s/:id/containers/:name/:action', { admin: true }, async ({ params, who, req }) => {
    const s = server(params.id);
    try { await s.containerAction(params.name, params.action); } catch (err) { throw new HttpError(err.status || 400, err.message); }
    audit({ user: who.user, action: 'container-' + params.action, target: `${s.name}: ${params.name}`, ip: clientIp(req) });
    return { ok: true };
  });

  // Ganzen Server neu starten: nur Admin, nur mit frischem 2FA-Code
  route('POST', '/api/s/:id/reboot', { admin: true }, async ({ params, who, body, req }) => {
    if (!cfg.control.reboot) throw new HttpError(403, 'Neustart ist in der Agent-Konfiguration ausgeschaltet.');
    if (!auth.confirmCode(who.user, body.code)) throw new HttpError(403, 'Der Code stimmt nicht.');
    const s = server(params.id);
    audit({ user: who.user, action: 'reboot', target: s.name, ip: clientIp(req) });
    await s.reboot();
    return { ok: true };
  });

  // Live-Logs (Server-Sent Events) – nur für diesen Server
  route('GET', '/api/s/:id/follow', { raw: true }, ({ params, url, req, res }) => {
    if (params.id !== 'local') throw new HttpError(400, 'Live-Logs gibt es nur für den Hauptserver.');
    const kind = url.searchParams.get('kind') === 'container' ? 'container' : 'service';
    const stop = sys.follow(kind, String(url.searchParams.get('name') || ''), line => res.write(`data: ${JSON.stringify(line)}\n\n`));
    res.writeHead(200, { ...SECURITY_HEADERS, 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', 'X-Accel-Buffering': 'no', Connection: 'keep-alive' });
    res.write(': ok\n\n');
    const ping = setInterval(() => res.write(': ping\n\n'), 20000);
    req.on('close', () => { clearInterval(ping); stop(); });
  });

  route('POST', '/api/push/subscribe', {}, ({ who, body, req }) => { push.subscribe(who.user, body.subscription, req.headers['user-agent']); return { ok: true, devices: push.forUser(who.user) }; });
  route('POST', '/api/push/unsubscribe', {}, ({ who, body }) => { push.unsubscribe(body.subscription); return { ok: true, devices: push.forUser(who.user) }; });
  route('POST', '/api/push/test', {}, async ({ who }) => ({ sent: await push.send({ title: 'S3cure', body: cfg.language === 'en' ? 'Notifications work ✓' : 'Mitteilungen funktionieren ✓', url: '/' }, { user: who.user }) }));

  const plimit = url => Math.max(1, Math.min(300, Number(url.searchParams.get('limit')) || 10));
  route('GET', '/api/s/:id/processes', {}, ({ params, url }) => server(params.id).processes(url.searchParams.get('sort') === 'mem' ? 'mem' : 'cpu', plimit(url)));
  route('GET', '/api/s/:id/disks', {}, ({ params }) => server(params.id).disks());

  route('GET', '/api/audit', { admin: true }, () => readAudit());

  // ---------- Eigenes Konto ----------
  const qr = async uri => { try { return await require('qrcode').toString(uri, { type: 'svg', margin: 1, color: { dark: '#000000', light: '#ffffff' } }); } catch { return ''; } };
  const userErr = fn => async ctx => { try { return await fn(ctx); } catch (err) { throw new HttpError(err.status || 400, err.message); } };

  route('GET', '/api/me/sessions', {}, ({ who }) => auth.sessionsOf(who.user, who.key));
  route('POST', '/api/me/sessions/revoke', {}, ({ who, body }) => { auth.revoke(who.user, String(body.id || ''), who.key); return auth.sessionsOf(who.user, who.key); });
  route('POST', '/api/me/password', {}, userErr(async ({ who, body, req }) => {
    await auth.changePassword(who.user, body.current, body.next, body.code, who.key);
    audit({ user: who.user, action: 'password', ip: clientIp(req) });
    return { ok: true };
  }));
  route('POST', '/api/me/totp/start', {}, async ({ who }) => { const t = auth.startTotp(who.user); return { secret: t.secret, uri: t.uri, qr: await qr(t.uri) }; });
  route('POST', '/api/me/totp/confirm', {}, userErr(({ who, body, req }) => { auth.confirmTotp(who.user, body.code, who.key); audit({ user: who.user, action: 'totp', ip: clientIp(req) }); return { ok: true }; }));

  // ---------- Benutzer verwalten (Admin) ----------
  route('GET', '/api/users', { admin: true }, () => auth.listUsers());
  route('POST', '/api/users', { admin: true }, userErr(async ({ who, body, req }) => {
    const info = await auth.addUser(body.name, body.password, body.role === 'admin' ? 'admin' : 'viewer');
    audit({ user: who.user, action: 'user-add', target: info.name, ip: clientIp(req) });
    return { name: info.name, secret: info.secret, uri: info.uri, qr: await qr(info.uri) };
  }));
  route('POST', '/api/users/:name/role', { admin: true }, userErr(({ who, params, body, req }) => {
    auth.setRole(params.name, body.role);
    audit({ user: who.user, action: 'user-role', target: `${params.name} → ${body.role}`, ip: clientIp(req) });
    return auth.listUsers();
  }));
  route('POST', '/api/users/:name/reset-2fa', { admin: true }, userErr(async ({ who, params, req }) => {
    const info = auth.resetTotp(params.name);
    audit({ user: who.user, action: 'user-2fa', target: info.name, ip: clientIp(req) });
    return { name: info.name, secret: info.secret, uri: info.uri, qr: await qr(info.uri) };
  }));
  route('POST', '/api/users/:name/delete', { admin: true }, userErr(({ who, params, req }) => {
    if (String(params.name).toLowerCase() === who.user) throw new HttpError(400, 'Dich selbst kannst du nicht löschen.');
    auth.canRemove(params.name);
    auth.removeUser(params.name);
    push.dropUser(String(params.name).toLowerCase());
    audit({ user: who.user, action: 'user-delete', target: params.name, ip: clientIp(req) });
    return auth.listUsers();
  }));

  // ---------- Einstellungen des Agenten (Admin) ----------
  route('GET', '/api/settings', { admin: true }, () => ({ name: cfg.name, alerts: cfg.alerts, reboot: !!cfg.control.reboot }));
  route('POST', '/api/settings', { admin: true }, userErr(({ who, body, req }) => {
    const next = config.load();
    const num = (v, min, max) => { const n = Number(v); if (!Number.isFinite(n) || n < min || n > max) throw new HttpError(400, `Wert außerhalb ${min}–${max}.`); return n; };
    if (body.name != null) { const n = String(body.name).trim().slice(0, 40); if (!n) throw new HttpError(400, 'Name fehlt.'); next.name = n; }
    if (body.alerts) {
      const a = body.alerts;
      if (a.disk != null) next.alerts.disk = num(a.disk, 50, 99);
      if (a.mem != null) next.alerts.mem = num(a.mem, 50, 99);
      if (a.loadPerCpu != null) next.alerts.loadPerCpu = num(a.loadPerCpu, 1, 20);
      if (a.serviceFailed != null) next.alerts.serviceFailed = !!a.serviceFailed;
    }
    config.save(next);
    cfg = config.load();
    audit({ user: who.user, action: 'settings', ip: clientIp(req) });
    return { name: cfg.name, alerts: cfg.alerts, reboot: !!cfg.control.reboot };
  }));

  // ---------- Funktionen pro Server (auch für eingebundene weitere Server) ----------
  // scoped('GET', 'checks', …) registriert /api/s/:id/checks (für „local“ direkt, sonst an den anderen
  // Agenten weitergereicht) und /api/agent/x/checks (Aufruf durch den Hub mit Agent-Schlüssel).
  function scoped(method, sub, opts, fn) {
    route(method, '/api/s/:id/' + sub, opts, async ctx => {
      if (ctx.params.id === 'local') return fn({ ...ctx, by: ctx.who.user });
      const srv = server(ctx.params.id);
      const subPath = sub.replace(/:(\w+)/g, (_, k) => encodeURIComponent(ctx.params[k]));
      return srv.raw(method, '/x/' + subPath + ctx.url.search, method === 'GET' ? null : { ...ctx.body, __by: ctx.who.user });
    });
    route(method, '/api/agent/x/' + sub, { agent: true }, ctx => fn({ ...ctx, by: ctx.body && ctx.body.__by ? 'hub:' + String(ctx.body.__by).slice(0, 40) : 'hub' }));
  }
  const fail = (status, msg) => { throw new HttpError(status, msg); };
  const guard = fn => async ctx => { try { return await fn(ctx); } catch (err) { throw err instanceof HttpError ? err : new HttpError(err.status || 400, err.message); } };

  // Checks
  scoped('GET', 'checks', {}, () => checks.list());
  scoped('POST', 'checks', { admin: true }, guard(({ body, by, req }) => { const c = checks.upsert(body); audit({ user: by, action: 'check-save', target: c.name, ip: clientIp(req) }); return c; }));
  scoped('POST', 'checks/:cid/delete', { admin: true }, guard(({ params, by, req }) => { checks.remove(params.cid); audit({ user: by, action: 'check-delete', target: params.cid, ip: clientIp(req) }); return checks.list(); }));
  scoped('POST', 'checks/:cid/run', {}, guard(({ params }) => checks.runNow(params.cid)));

  // Updates
  scoped('GET', 'updates', {}, () => updates.status());
  scoped('GET', 'updates/job', {}, () => ({ job: updates.job(), history: updates.history() }));
  scoped('POST', 'updates/refresh', { admin: true }, guard(({ by }) => updates.refresh(by)));
  scoped('POST', 'updates/install', { admin: true }, guard(({ body, by, req }) => { const j = updates.install(Array.isArray(body.packages) ? body.packages.map(String) : null, by); audit({ user: by, action: 'updates-install', target: (body.packages || []).join(', ') || 'alle', ip: clientIp(req) }); return j; }));
  scoped('POST', 'updates/schedule', { admin: true }, guard(({ body, by, req }) => { const s = updates.setSchedule(body); cfg = config.load(); audit({ user: by, action: 'updates-schedule', ip: clientIp(req) }); return s; }));

  // Inventar
  scoped('GET', 'inventory/hardware', {}, () => inventory.hardware({ demo }));
  scoped('GET', 'inventory/software', {}, () => inventory.software({ demo }));

  // ---------- Skripte (Bibliothek auf diesem Agenten, Ausführen auf beliebigen Servern) ----------
  route('GET', '/api/scripts', {}, () => scripts.list());
  route('GET', '/api/scripts/runs', {}, ({ url }) => scripts.history({ script: url.searchParams.get('script'), limit: 100 }));
  route('GET', '/api/scripts/runs/:rid', {}, guard(({ params }) => scripts.run(params.rid)));
  route('GET', '/api/scripts/:sid', { admin: true }, guard(({ params }) => scripts.get(params.sid)));
  // Anlegen/Ändern: Code läuft als root -> frischer 2FA-Code nötig
  route('POST', '/api/scripts', { admin: true }, guard(({ who, body, req }) => {
    if (!auth.confirmCode(who.user, body.code)) fail(403, 'Der 2FA-Code stimmt nicht.');
    const sc = scripts.save(body, who.user);
    audit({ user: who.user, action: 'script-save', target: sc.name, ip: clientIp(req) });
    return sc;
  }));
  route('POST', '/api/scripts/:sid/delete', { admin: true }, guard(({ who, params, req }) => { const sc = scripts.get(params.sid); scripts.remove(params.sid); audit({ user: who.user, action: 'script-delete', target: sc.name, ip: clientIp(req) }); return scripts.list(); }));
  // Ausführen: startet sofort im Hintergrund (lange Skripte würden sonst am Proxy abbrechen);
  // die App fragt den Stand über /api/scripts/runs/:rid ab
  // Skript auf Servern starten (Hintergrund). onDone(runs) wenn alle fertig sind.
  function startRun(sc, ids, by, task = null, onDone = null) {
    const runs = [...new Set(ids)].map(sid => {
      const srv = server(sid);
      const run = scripts.record({ id: scripts.newId(), script: sc.id, scriptName: sc.name, task, server: sid, serverName: srv.name, by, started: Date.now(), status: 'running', ms: null, code: null, output: '' });
      run.done = (async () => {
        let r;
        try { r = sid === 'local' ? await runBash(sc.body, { timeout: sc.timeout, demo }) : await srv.raw('POST', '/x-exec', { body: sc.body, timeout: sc.timeout, __by: by }); }
        catch (err) { r = { code: 255, output: String(err.message), ms: Date.now() - run.started }; }
        Object.assign(run, { status: 'done', code: r.code, ms: r.ms, output: r.output });
        scripts.touch();
      })();
      return run;
    });
    Promise.all(runs.map(r => r.done)).then(() => { runs.forEach(r => delete r.done); scripts.touch(); onDone && onDone(runs); });
    return runs.map(({ output, done, ...r }) => r);
  }

  // Ausführen: startet sofort im Hintergrund (lange Skripte würden sonst am Proxy abbrechen);
  // die App fragt den Stand über /api/scripts/runs/:rid ab
  route('POST', '/api/scripts/:sid/run', { admin: true }, guard(({ who, params, body, req }) => {
    const sc = scripts.get(params.sid);
    const ids = Array.isArray(body.servers) && body.servers.length ? body.servers.map(String) : ['local'];
    ids.forEach(server); // unbekannte Server -> Fehler
    const runs = startRun(sc, ids, who.user);
    audit({ user: who.user, action: 'script-run', target: `${sc.name} → ${runs.map(x => x.serverName).join(', ')}`, ip: clientIp(req) });
    return runs;
  }));

  // ---------- Geplante Aufgaben ----------
  const tasks = createTasks({
    scriptExists: sid => scripts.list().some(x => x.id === sid),
    runScript: async (sid, ids, by, taskId, onDone) => { const sc = scripts.get(sid); audit({ user: by, action: 'task-run', target: sc.name }); return startRun(sc, ids.filter(i => servers().some(x => x.id === i)), by, taskId, onDone); },
  });
  route('GET', '/api/tasks', {}, () => tasks.list());
  route('POST', '/api/tasks', { admin: true }, guard(({ who, body, req }) => { const t = tasks.upsert(body, who.user); audit({ user: who.user, action: 'task-save', target: t.name, ip: clientIp(req) }); return t; }));
  route('POST', '/api/tasks/:tid/delete', { admin: true }, guard(({ who, params, req }) => { tasks.remove(params.tid); audit({ user: who.user, action: 'task-delete', target: params.tid, ip: clientIp(req) }); return tasks.list(); }));
  route('POST', '/api/tasks/:tid/run', { admin: true }, guard(async ({ who, params }) => tasks.runNow(params.tid, who.user)));

  // ---------- Wartungsfenster (pro Server) ----------
  scoped('GET', 'maintenance', {}, () => ({ active: inMaintenance(), ...(cfg.maintenance || {}) }));
  scoped('POST', 'maintenance', { admin: true }, guard(({ body, by, req }) => {
    const minutes = Math.max(5, Math.min(7 * 24 * 60, Number(body.minutes) || 60));
    const c = config.load(); c.maintenance = { until: Date.now() + minutes * 60000, reason: String(body.reason || '').slice(0, 120), by }; config.save(c); cfg = config.load();
    audit({ user: by, action: 'maintenance-start', target: `${minutes} min${c.maintenance.reason ? ' · ' + c.maintenance.reason : ''}`, ip: clientIp(req) });
    return { active: true, ...cfg.maintenance };
  }));
  scoped('POST', 'maintenance/end', { admin: true }, guard(({ by, req }) => {
    const c = config.load(); delete c.maintenance; config.save(c); cfg = config.load();
    audit({ user: by, action: 'maintenance-end', ip: clientIp(req) });
    return { active: false };
  }));

  // ---------- Prozesse beenden ----------
  scoped('POST', 'processes/:pid/kill', { admin: true }, guard(async ({ params, body, by, req }) => {
    const r = await sys.kill(params.pid, body.signal === 'KILL' ? 'KILL' : 'TERM');
    audit({ user: by, action: 'process-kill', target: `${r.name} (PID ${r.pid}${body.signal === 'KILL' ? ', sofort' : ''})`, ip: clientIp(req) });
    return r;
  }));

  // ---------- Kunden, Standorte, Tags, Notizen (Zuordnung der Server) ----------
  route('GET', '/api/meta', {}, () => config.readJson('meta.json', {}));
  route('POST', '/api/meta/:id', { admin: true }, guard(({ who, params, body, req }) => {
    server(params.id);
    const all = config.readJson('meta.json', {});
    const tags = [...new Set((Array.isArray(body.tags) ? body.tags : String(body.tags || '').split(',')).map(x => String(x).trim()).filter(Boolean))].slice(0, 12).map(x => x.slice(0, 24));
    all[params.id] = { client: String(body.client || '').trim().slice(0, 60), site: String(body.site || '').trim().slice(0, 60), tags, notes: String(body.notes || '').slice(0, 5000), updated: Date.now(), by: who.user };
    config.writeJson('meta.json', all);
    audit({ user: who.user, action: 'meta-save', target: params.id, ip: clientIp(req) });
    return all[params.id];
  }));

  // ---------- Sammelaktion: mehrere Server neu starten (ein 2FA-Code für alle) ----------
  route('POST', '/api/bulk/reboot', { admin: true }, guard(async ({ who, body, req }) => {
    if (!cfg.control.reboot) fail(403, 'Neustart ist in der Agent-Konfiguration ausgeschaltet.');
    if (!auth.confirmCode(who.user, body.code)) fail(403, 'Der Code stimmt nicht.');
    const ids = [...new Set((body.servers || []).map(String))];
    const res = await Promise.all(ids.map(async sid => { try { await server(sid).reboot(); return { server: sid, ok: true }; } catch (e) { return { server: sid, ok: false, error: e.message }; } }));
    audit({ user: who.user, action: 'reboot', target: ids.join(', '), ip: clientIp(req) });
    return res;
  }));

  // ---------- Freischalten für Terminal und Dateien (frischer 2FA-Code, gilt 15 Min. ab letzter Nutzung) ----------
  const UNLOCK_IDLE = 15 * 60e3, UNLOCK_MAX = 4 * 3600e3;
  const unlocked = new Map(); // Sitzungs-Schlüssel -> { since, until }
  const unlockState = who => { const u = unlocked.get(who.key); return u && u.until > Date.now() ? u : null; };
  function needUnlock(who) {
    const u = unlockState(who);
    if (!u) throw Object.assign(new HttpError(403, 'Bitte mit 2FA-Code freischalten.'), { unlock: true });
    u.until = Math.min(u.since + UNLOCK_MAX, Date.now() + UNLOCK_IDLE);
  }
  route('GET', '/api/unlock', { admin: true }, ({ who }) => { const u = unlockState(who); return { active: !!u, until: u ? u.until : null }; });
  route('POST', '/api/unlock', { admin: true }, ({ who, body, req }) => {
    if (!auth.confirmCode(who.user, body.code)) throw new HttpError(403, 'Der 2FA-Code stimmt nicht.');
    const now = Date.now();
    unlocked.set(who.key, { since: now, until: now + UNLOCK_IDLE });
    audit({ user: who.user, action: 'unlock', ip: clientIp(req) });
    return { active: true, until: now + UNLOCK_IDLE };
  });
  route('POST', '/api/unlock/end', { admin: true }, ({ who }) => { unlocked.delete(who.key); return { active: false }; });

  // ---------- Dateien (nur dieser Server) ----------
  const files = createFiles({ demo });
  const fpath = url => String(url.searchParams.get('path') || '');
  const filesRoute = (method, p, opts, fn) => route(method, '/api/files/' + p, { admin: true, ...opts }, guard(ctx => { needUnlock(ctx.who); return fn(ctx); }));
  filesRoute('GET', 'list', {}, ({ url }) => files.list(fpath(url) || files.home));
  filesRoute('GET', 'read', {}, ({ url }) => files.read(fpath(url)));
  filesRoute('POST', 'write', { maxBody: 4 * 1024 * 1024 }, ({ who, body, req }) => { const r = files.write(body.path, body.text, body.mtime); audit({ user: who.user, action: 'file-save', target: r.path, ip: clientIp(req) }); return r; });
  filesRoute('POST', 'mkdir', {}, ({ who, body, req }) => { const r = files.mkdir(body.path, body.name); audit({ user: who.user, action: 'file-mkdir', target: r.path, ip: clientIp(req) }); return r; });
  filesRoute('POST', 'rename', {}, ({ who, body, req }) => { const r = files.rename(body.path, body.name); audit({ user: who.user, action: 'file-rename', target: `${body.path} → ${r.path}`, ip: clientIp(req) }); return r; });
  filesRoute('POST', 'delete', {}, ({ who, body, req }) => { const r = files.remove(body.path); audit({ user: who.user, action: 'file-delete', target: r.path, ip: clientIp(req) }); return r; });
  filesRoute('GET', 'download', { raw: true }, ({ who, url, req, res }) => {
    const f = files.openRead(fpath(url));
    const name = f.path.split('/').pop();
    res.writeHead(200, { ...SECURITY_HEADERS, 'Content-Type': 'application/octet-stream', 'Content-Length': f.size, 'Cache-Control': 'no-store',
      'Content-Disposition': `attachment; filename="${name.replace(/[^\x20-\x7e]|["\\]/g, '_')}"; filename*=UTF-8''${encodeURIComponent(name)}` });
    audit({ user: who.user, action: 'file-download', target: f.path, ip: clientIp(req) });
    const st = f.stream();
    st.on('error', () => res.destroy());
    st.pipe(res);
  });
  const MAX_UPLOAD = 512 * 1024 * 1024;
  filesRoute('POST', 'upload', { stream: true }, ({ who, url, req }) => new Promise((resolve, reject) => {
    const len = Number(req.headers['content-length']);
    if (len > MAX_UPLOAD) return reject(new HttpError(413, 'Zu groß (max. 512 MB).'));
    const up = files.prepareUpload(fpath(url), String(url.searchParams.get('name') || ''), url.searchParams.get('overwrite') === '1');
    const out = fs.createWriteStream(up.tmp, { mode: 0o644 });
    let size = 0, failed = false;
    const fail = err => { if (failed) return; failed = true; out.destroy(); up.abort(); reject(err); };
    req.on('data', c => { size += c.length; if (size > MAX_UPLOAD) { fail(new HttpError(413, 'Zu groß (max. 512 MB).')); req.destroy(); } });
    req.on('aborted', () => fail(new HttpError(400, 'Hochladen abgebrochen.')));
    out.on('error', e => fail(new HttpError(500, e.message)));
    out.on('finish', () => {
      if (failed) return;
      try { const r = up.finish(); audit({ user: who.user, action: 'file-upload', target: r.path, ip: clientIp(req) }); resolve(r); } catch (e) { up.abort(); reject(new HttpError(500, e.message)); }
    });
    req.pipe(out);
  }));

  // ---------- Web-Terminal (nur dieser Server) ----------
  const terms = createTerminals({ demo, onClose: s => audit({ user: s.user, action: 'terminal-close', target: `${Math.round((Date.now() - s.started) / 60000)} min` }) });
  const termRoute = (method, p, opts, fn) => route(method, '/api/term' + p, { admin: true, ...opts }, guard(ctx => { needUnlock(ctx.who); return fn(ctx); }));
  termRoute('GET', '', {}, ({ who }) => terms.list(who.user));
  termRoute('POST', '', {}, ({ who, body, req }) => { const t = terms.open({ user: who.user, cols: body.cols, rows: body.rows }); audit({ user: who.user, action: 'terminal-open', ip: clientIp(req) }); return t; });
  termRoute('POST', '/:tid/input', { maxBody: 160 * 1024 }, ({ who, params, body }) => { terms.input(params.tid, who.user, body.data); return { ok: true }; });
  termRoute('POST', '/:tid/resize', {}, async ({ who, params, body }) => { await terms.resize(params.tid, who.user, body.cols, body.rows); return { ok: true }; });
  termRoute('POST', '/:tid/close', {}, ({ who, params }) => terms.close(params.tid, who.user));
  termRoute('GET', '/:tid/stream', { raw: true }, ({ who, params, req, res }) => {
    let detach = () => {};
    const sendEv = ev => { res.write(`data: ${JSON.stringify(ev)}\n\n`); if (ev.exit != null) setTimeout(() => res.end(), 100); };
    res.writeHead(200, { ...SECURITY_HEADERS, 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', 'X-Accel-Buffering': 'no', Connection: 'keep-alive' });
    try { detach = terms.attach(params.tid, who.user, sendEv); } catch (e) { sendEv({ error: e.message, exit: -1 }); res.end(); return; }
    const ping = setInterval(() => res.write(': ping\n\n'), 20000);
    req.on('close', () => { clearInterval(ping); detach(); });
  });

  // Für den Hub: Skript-Text hier ausführen (nur mit Agent-Schlüssel)
  route('POST', '/api/agent/x-exec', { agent: true }, async ({ body }) => {
    const r = await runBash(String(body.body || ''), { timeout: Number(body.timeout) || 300, demo });
    audit({ user: 'hub:' + String(body.__by || '').slice(0, 40), action: 'script-run', target: String(body.body || '').split('\n')[0].slice(0, 80) });
    return r;
  });

  // ---------- Warnungen: Wege (Discord, Webhook, E-Mail) ----------
  route('GET', '/api/notify', { admin: true }, () => notify.publicSettings());
  route('POST', '/api/notify', { admin: true }, guard(({ who, body, req }) => {
    const next = cleanNotify(body);
    const old = (config.load().notify || {}).email;
    if (next.email && old && (next.email.pass === '••••••' || next.email.pass === '')) next.email.pass = old.pass || '';
    const c = config.load(); c.notify = next; config.save(c); cfg = config.load();
    audit({ user: who.user, action: 'notify-save', ip: clientIp(req) });
    return notify.publicSettings();
  }));
  route('POST', '/api/notify/test', { admin: true }, async ({ body }) => notify.send({ title: cfg.name, body: cfg.language === 'en' ? 'Test notification ✓' : 'Test-Warnung ✓', level: 'info', url: '/' }, { only: ['discord', 'webhook', 'email', 'push'].includes(body.channel) ? body.channel : null }));

  // ---------- Für andere Agenten (Hub) ----------
  route('GET', '/api/agent/overview', { agent: true }, async () => { const o = await local.overview(); return { ...o, history: history.range(24) }; });
  route('GET', '/api/agent/services', { agent: true }, () => local.services());
  route('GET', '/api/agent/containers', { agent: true }, () => local.containers());
  route('GET', '/api/agent/services/:name/logs', { agent: true }, async ({ params, url }) => ({ text: await local.serviceLogs(params.name, Number(url.searchParams.get('lines')) || 200) }));
  route('GET', '/api/agent/containers/:name/logs', { agent: true }, async ({ params, url }) => ({ text: await local.containerLogs(params.name, Number(url.searchParams.get('lines')) || 200) }));
  route('POST', '/api/agent/services/:name/:action', { agent: true }, async ({ params }) => { await local.serviceAction(params.name, params.action); audit({ user: 'hub', action: 'service-' + params.action, target: params.name }); return { ok: true }; });
  route('POST', '/api/agent/containers/:name/:action', { agent: true }, async ({ params }) => { await local.containerAction(params.name, params.action); audit({ user: 'hub', action: 'container-' + params.action, target: params.name }); return { ok: true }; });
  route('GET', '/api/agent/processes', { agent: true }, ({ url }) => local.processes(url.searchParams.get('sort') === 'mem' ? 'mem' : 'cpu', plimit(url)));
  route('GET', '/api/agent/disks', { agent: true }, () => local.disks());
  route('POST', '/api/agent/reboot', { agent: true }, async () => { if (!cfg.control.reboot) throw new HttpError(403, 'Neustart ausgeschaltet.'); audit({ user: 'hub', action: 'reboot', target: cfg.name }); local.reboot(); return { ok: true }; });

  function agentOk(req) {
    const m = /^Bearer (.+)$/.exec(String(req.headers.authorization || ''));
    if (!m) return false;
    const a = Buffer.from(m[1]), b = Buffer.from(cfg.agentToken);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  }

  async function handle(req, res) {
    const url = new URL(req.url, 'http://localhost');
    const p = url.pathname;
    if (!p.startsWith('/api/')) {
      if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, { error: 'Nicht erlaubt.' });
      return serveStatic(req, res, p);
    }
    try {
      const r = routes.find(x => x.method === req.method && x.re.test(p));
      if (!r) throw new HttpError(404, 'Nicht gefunden.');
      const params = Object.fromEntries(Object.entries(r.re.exec(p).groups || {}).map(([k, v]) => [k, decodeURIComponent(v)]));
      // Änderungen nur mit eigener Kopfzeile (fremde Webseiten können sie nicht setzen)
      if (req.method !== 'GET' && req.headers['x-s3cure'] !== '1') throw new HttpError(403, 'Anfrage abgelehnt.');
      let who = null;
      if (r.agent) { if (!agentOk(req)) throw new HttpError(401, 'Nicht berechtigt.'); }
      else if (!r.public) {
        who = auth.session(cookies(req)[COOKIE]);
        if (!who) throw new HttpError(401, 'Bitte anmelden.');
        if (r.admin && who.role !== 'admin') throw new HttpError(403, 'Dafür brauchst du Admin-Rechte.');
      }
      const body = req.method === 'POST' && !r.stream ? await readBody(req, r.maxBody) : {};
      const out = await r.fn({ req, res, url, params, body, who });
      if (!r.raw) send(res, 200, out ?? { ok: true });
    } catch (err) {
      if (res.headersSent) { try { res.end(); } catch {} return; }
      const status = err.status || 500;
      send(res, status, { error: status === 500 ? String(err.message || 'Fehler') : err.message, ...(err.unlock ? { unlock: true } : {}) });
    }
  }

  function listen() {
    const srv = http.createServer((req, res) => { handle(req, res).catch(() => { try { res.end(); } catch {} }); });
    srv.headersTimeout = 20000;
    srv.requestTimeout = 120000;
    return new Promise(resolve => srv.listen(cfg.port, cfg.bind, () => {
      sample(); sampler = setInterval(sample, 10000);
      alerts.start();
      checks.start();
      minute = setInterval(() => { try { updates.tick(); } catch {} try { tasks.tick(); } catch {} }, 60000);
      resolve(srv);
    }));
  }

  let minute = null;
  function stop() { clearInterval(sampler); clearInterval(minute); alerts.stop(); checks.stop(); terms.stopAll(); history.save(); }
  const reloadConfig = () => { cfg = config.load(); auth.reload(); };

  return { listen, stop, handle, auth, push, reloadConfig, collect, alerts };
}

module.exports = { createAgent, SECURITY_HEADERS, VERSION, trustedProxy };
