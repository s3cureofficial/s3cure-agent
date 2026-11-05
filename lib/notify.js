// Warnungen verschicken: Push aufs Handy (lib/push.js), Discord-Webhook, eigener Webhook (JSON), E-Mail.
// Einstellungen in config.json unter "notify": { discord: [url], webhooks: [url], email: { host, port, secure, user, pass, from, to } }
const COLORS = { bad: 0xe11d2a, warn: 0xd97706, ok: 0x16a34a, info: 0x6f9bff };

const isDiscord = u => /^https:\/\/(?:ptb\.|canary\.)?(discord|discordapp)\.com\/api\/webhooks\/\d+\/[\w-]+$/.test(String(u));
const isHttps = u => /^https:\/\/[^\s]+$/.test(String(u));

// Eingaben prüfen und säubern (für POST /api/notify)
function clean(input = {}) {
  const out = { discord: [], webhooks: [], email: null };
  for (const u of [].concat(input.discord || [])) {
    const s = String(u).trim();
    if (!s) continue;
    if (!isDiscord(s)) throw Object.assign(new Error(`Kein Discord-Webhook: ${s.slice(0, 60)}`), { status: 400 });
    out.discord.push(s);
  }
  for (const u of [].concat(input.webhooks || [])) {
    const s = String(u).trim();
    if (!s) continue;
    if (!isHttps(s)) throw Object.assign(new Error(`Webhook muss mit https:// beginnen: ${s.slice(0, 60)}`), { status: 400 });
    out.webhooks.push(s);
  }
  const e = input.email;
  if (e && e.host) {
    const port = Number(e.port) || 587;
    if (!/^[A-Za-z0-9.-]+$/.test(e.host) || port < 1 || port > 65535) throw Object.assign(new Error('E-Mail-Server ungültig.'), { status: 400 });
    if (!/^[^@\s]+@[^@\s]+$/.test(String(e.to || ''))) throw Object.assign(new Error('Empfänger-Adresse ungültig.'), { status: 400 });
    out.email = { host: e.host, port, secure: !!e.secure, user: String(e.user || ''), pass: String(e.pass || ''), from: String(e.from || e.user || e.to), to: String(e.to) };
  }
  return out;
}

function createNotify({ getCfg, push, fetchImpl = globalThis.fetch }) {
  const post = (url, body) => fetchImpl(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(10000) })
    .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); });

  async function mail(e, subject, text) {
    const nodemailer = require('nodemailer');
    const t = nodemailer.createTransport({ host: e.host, port: e.port, secure: e.secure, auth: e.user ? { user: e.user, pass: e.pass } : undefined, connectionTimeout: 10000 });
    await t.sendMail({ from: e.from, to: e.to, subject, text });
  }

  // event: { title, body, level: bad|warn|ok|info, url, tag }  ·  only: nur diese Wege (für Tests)
  async function send(event, { only = null, skipPush = false } = {}) {
    const cfg = getCfg();
    const n = cfg.notify || {};
    const level = event.level || 'warn';
    const link = /^https:\/\//.test(cfg.publicUrl || '') ? cfg.publicUrl.replace(/\/+$/, '') + (event.url || '/') : undefined;
    const jobs = [];
    const want = k => !only || only === k;
    if (want('push') && !skipPush) jobs.push(['push', push.send({ title: event.title, body: event.body, url: event.url || '/', tag: event.tag, urgent: level === 'bad' })]);
    if (want('discord')) for (const u of n.discord || []) jobs.push(['discord', post(u, { username: 'S3cure', embeds: [{ title: event.title, description: event.body, color: COLORS[level] || COLORS.info, url: link, timestamp: new Date().toISOString(), footer: { text: cfg.name } }] })]);
    if (want('webhook')) for (const u of n.webhooks || []) jobs.push(['webhook', post(u, { source: 's3cure-agent', server: cfg.name, level, title: event.title, body: event.body, url: link || null, at: new Date().toISOString() })]);
    if (want('email') && n.email && n.email.host) jobs.push(['email', mail(n.email, `[S3cure] ${event.title}`, `${event.body}\n\n${link || ''}`)]);
    const res = await Promise.allSettled(jobs.map(j => j[1]));
    return res.map((r, i) => ({ channel: jobs[i][0], ok: r.status === 'fulfilled', error: r.status === 'rejected' ? String(r.reason && r.reason.message || r.reason) : null }));
  }

  // Für die App: Einstellungen ohne Passwort zurückgeben
  function publicSettings() {
    const n = getCfg().notify || {};
    return { discord: n.discord || [], webhooks: n.webhooks || [], email: n.email ? { ...n.email, pass: n.email.pass ? '••••••' : '' } : null };
  }

  return { send, publicSettings };
}

module.exports = { createNotify, clean, isDiscord };
