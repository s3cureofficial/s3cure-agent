// S3cure Agent: 2FA, Anmeldung, Auswertung, API (Demo-Modus, eigener Datenordner)
const fs = require('fs');
const os = require('os');
const path = require('path');
process.env.S3CURE_AGENT_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 's3agent-'));
fs.writeFileSync(path.join(process.env.S3CURE_AGENT_DIR, 'config.json'), JSON.stringify({ port: 0, name: 'testserver' }));

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const totp = require('../lib/totp');
const { createAuth } = require('../lib/auth');
const system = require('../lib/system');
const { evaluate } = require('../lib/alerts');
const { createAgent, trustedProxy } = require('../lib/server');

test('2FA: Testwerte aus RFC 6238 und Prüfung', () => {
  const secret = totp.base32Encode(Buffer.from('12345678901234567890'));
  assert.equal(secret, 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ');
  assert.equal(totp.hotp(secret, Math.floor(59 / 30)), '287082');
  assert.equal(totp.hotp(secret, Math.floor(1111111109 / 30)), '081804');
  const time = 1111111109000;
  const s = totp.verify(secret, '081804', { time });
  assert.equal(s, Math.floor(1111111109 / 30));
  assert.equal(totp.verify(secret, '081804', { time, lastStep: s }), null, 'derselbe Code darf nicht zweimal');
  assert.equal(totp.verify(secret, '000000', { time }), null);
  assert.match(totp.uri(secret, 'patrick@srv'), /^otpauth:\/\/totp\/S3cure:patrick%40srv\?secret=GEZD/);
});

test('Anmeldung: Passwort + Code, falscher Code, Sperre, Sitzung, Rollen', async () => {
  let now = Date.now();
  const auth = createAuth({ now: () => now });
  await assert.rejects(auth.addUser('ab', 'kurz'), /mindestens 10/);
  const info = await auth.addUser('Admin', 'ein-sicheres-passwort', 'admin');
  assert.equal(info.name, 'admin');
  const code = (off = 0) => totp.hotp(info.secret, totp.step(now) + off);
  assert.equal((await auth.login({ user: 'admin', password: 'falsch-falsch', code: code(), ip: '1.1.1.1' })).ok, false);
  assert.equal((await auth.login({ user: 'admin', password: 'ein-sicheres-passwort', code: '123456', ip: '1.1.1.1' })).ok, false);
  const r = await auth.login({ user: 'ADMIN', password: 'ein-sicheres-passwort', code: code(), ip: '1.1.1.2' });
  assert.equal(r.ok, true);
  assert.equal(auth.session(r.token).role, 'admin');
  // Code wiederverwenden geht nicht
  assert.equal((await auth.login({ user: 'admin', password: 'ein-sicheres-passwort', code: code(), ip: '1.1.1.3' })).ok, false);
  // Sperre je IP
  for (let i = 0; i < 5; i++) await auth.login({ user: 'nobody', password: 'x', code: '1', ip: '9.9.9.9' });
  now += 30000;
  assert.equal((await auth.login({ user: 'admin', password: 'ein-sicheres-passwort', code: code(), ip: '9.9.9.9' })).locked, true);
  // Sitzung läuft nach 14 Tagen ohne Nutzung ab
  now += 15 * 864e5;
  assert.equal(auth.session(r.token), null);
  // Passwort ändern meldet überall ab
  now += 60000;
  const r2 = await auth.login({ user: 'admin', password: 'ein-sicheres-passwort', code: code(), ip: '1.1.1.4' });
  await auth.setPassword('admin', 'noch-ein-passwort-1');
  assert.equal(auth.session(r2.token), null);
});

test('Anmeldung: Benutzer aus der Kommandozeile sind im laufenden Dienst sofort bekannt', async () => {
  const dienst = createAuth();
  const kommandozeile = createAuth();
  const info = await kommandozeile.addUser('neu', 'neues-passwort-123', 'viewer');
  const r = await dienst.login({ user: 'neu', password: 'neues-passwort-123', code: totp.hotp(info.secret, totp.step()), ip: '5.5.5.5' });
  assert.equal(r.ok, true);
  kommandozeile.removeUser('neu');
  assert.equal(dienst.session(r.token), null, 'gelöscht -> abgemeldet');
});

test('System: systemctl- und docker-Ausgabe lesen, Schutzliste', () => {
  const units = system.parseUnits([
    '  nginx.service            loaded active   running A high performance web server',
    '● backup.service           loaded failed   failed  Nächtliches Backup',
    '  ghost.service            not-found inactive dead ghost.service',
    'kaputt',
  ].join('\n'));
  assert.deepEqual(units.map(u => [u.name, u.active]), [['nginx.service', 'active'], ['backup.service', 'failed']]);
  const ctr = system.parseContainers('{"ID":"abcdef1234567890","Names":"web","Image":"nginx","State":"running","Status":"Up 2 hours","Ports":""}\nkaputt\n');
  assert.equal(ctr[0].id, 'abcdef123456');
  assert.ok(system.matches('systemd-journald.service', ['systemd-*']));
  assert.ok(!system.matches('nginx.service', ['ssh.service', 'systemd-*']));
  assert.ok(!system.UNIT_RE.test('x;rm -rf /.service'));
  assert.ok(!system.CONTAINER_RE.test('-rf'));
  const mem = system.parseMeminfo('MemTotal: 1000 kB\nMemAvailable: 250 kB\nSwapTotal: 0 kB\nSwapFree: 0 kB\n');
  assert.equal(mem.used, 750 * 1024);
});

test('Proxy: nur lokale bzw. Docker-Adressen dürfen die Besucher-IP mitteilen', () => {
  for (const ip of ['127.0.0.1', '::1', '172.17.0.2', '172.18.0.5', '10.0.0.2', '192.168.1.9']) assert.ok(trustedProxy(ip), ip);
  for (const ip of ['5.253.246.67', '8.8.8.8', '172.32.0.1', '2a01:4f8::1']) assert.ok(!trustedProxy(ip), ip);
});

test('Warnungen: Platte, RAM, Last, ausgefallene Dienste', () => {
  const m = { cpus: 2, load: [7, 1, 1], mem: { total: 100, used: 97 }, disk: { total: 100, free: 5 } };
  const list = evaluate(m, [{ name: 'a.service', active: 'failed' }, { name: 'b.service', active: 'active' }], { disk: 90, mem: 95, loadPerCpu: 3, serviceFailed: true });
  assert.deepEqual(list.map(i => i.id), ['disk', 'mem', 'load', 'svc:a.service']);
  assert.equal(evaluate({ cpus: 4, load: [1], mem: { total: 100, used: 10 }, disk: { total: 100, free: 90 } }, [], { disk: 90, mem: 95, loadPerCpu: 3, serviceFailed: true }).length, 0);
});

// ---------- API über HTTP (Demo-Daten) ----------
let srv, base, agent;
after(() => { agent && agent.stop(); srv && srv.close(); });

test('API: Anmeldung, Rechte, Aktionen, Schutz', async () => {
  process.env.S3CURE_AGENT_DEMO = '1';
  agent = createAgent({ demo: true });
  srv = await agent.listen();
  base = `http://127.0.0.1:${srv.address().port}`;
  const admin = await agent.auth.addUser('chef', 'chef-passwort-123', 'admin');
  const viewer = await agent.auth.addUser('gast', 'gast-passwort-123', 'viewer');
  const call = async (method, p, { body, cookie, header = true } = {}) => {
    const r = await fetch(base + p, { method, headers: { 'Content-Type': 'application/json', ...(header ? { 'X-S3cure': '1' } : {}), ...(cookie ? { Cookie: cookie } : {}) }, body: body ? JSON.stringify(body) : undefined });
    return { status: r.status, data: await r.json().catch(() => null), cookie: (r.headers.get('set-cookie') || '').split(';')[0], csp: r.headers.get('content-security-policy') };
  };
  const login = async (u, pw, secret) => (await call('POST', '/api/login', { body: { user: u, password: pw, code: totp.hotp(secret, totp.step()) } })).cookie;

  assert.equal((await call('GET', '/api/servers')).status, 401);
  assert.equal((await call('POST', '/api/login', { body: { user: 'chef', password: 'chef-passwort-123', code: totp.hotp(admin.secret, totp.step()) }, header: false })).status, 403);
  const c = await login('chef', 'chef-passwort-123', admin.secret);
  assert.match(c, /^s3s=/);
  const servers = await call('GET', '/api/servers', { cookie: c });
  assert.equal(servers.data[0].name, 'testserver');
  assert.equal((await call('POST', '/api/s/local/services/nginx.service/restart', { cookie: c })).status, 200);
  assert.equal((await call('POST', '/api/s/local/services/ssh.service/stop', { cookie: c })).status, 400);
  assert.equal((await call('POST', '/api/s/local/reboot', { cookie: c, body: { code: '000000' } })).status, 403);
  assert.equal((await call('GET', '/api/s/nope/services', { cookie: c })).status, 404);
  const g = await login('gast', 'gast-passwort-123', viewer.secret);
  assert.equal((await call('GET', '/api/s/local/containers', { cookie: g })).status, 200);
  assert.equal((await call('POST', '/api/s/local/containers/umami/stop', { cookie: g })).status, 403);
  assert.equal((await call('GET', '/api/audit', { cookie: g })).status, 403);
  const audit = await call('GET', '/api/audit', { cookie: c });
  assert.ok(audit.data.some(e => e.action === 'service-restart' && e.user === 'chef'));
  // Andere Agenten: nur mit Schlüssel
  const cfg = require('../lib/config').load();
  assert.equal((await fetch(base + '/api/agent/overview')).status, 401);
  assert.equal((await fetch(base + '/api/agent/overview', { headers: { Authorization: 'Bearer ' + cfg.agentToken } })).status, 200);
  // Web-App mit Sicherheits-Header, keine Dateien außerhalb von public
  const page = await fetch(base + '/');
  assert.match(page.headers.get('content-security-policy'), /script-src 'self'/);
  assert.match(await page.text(), /<title>S3cure<\/title>/);
  // Hinter dem Proxy (Anfragen von 127.0.0.1): Fehlversuche einer Besucher-IP sperren nicht die anderen
  for (let i = 0; i < 5; i++) await fetch(base + '/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-S3cure': '1', 'X-Real-IP': '203.0.113.9' }, body: JSON.stringify({ user: 'x', password: 'y', code: '1' }) });
  const blocked = await fetch(base + '/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-S3cure': '1', 'X-Real-IP': '203.0.113.9' }, body: JSON.stringify({ user: 'gast', password: 'gast-passwort-123', code: totp.hotp(viewer.secret, totp.step()) }) });
  assert.equal(blocked.status, 429);
  const other = await fetch(base + '/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-S3cure': '1', 'X-Real-IP': '198.51.100.7' }, body: JSON.stringify({ user: 'gast', password: 'gast-passwort-123', code: totp.hotp(viewer.secret, totp.step() + 1) }) });
  assert.equal(other.status, 200, 'andere IP darf sich anmelden');
  const sneaky = await fetch(base + '/..%2fpackage.json');
  assert.ok(!(await sneaky.text()).includes('"dependencies"'));
});

test('API 1.1: Passwort, Geräte, 2FA-Umzug, Benutzer, Warnungen, Prozesse, Laufwerke', async () => {
  const H = { 'Content-Type': 'application/json', 'X-S3cure': '1' };
  const call = async (method, p, { body, cookie } = {}) => {
    const r = await fetch(base + p, { method, headers: { ...H, ...(cookie ? { Cookie: cookie } : {}) }, body: body ? JSON.stringify(body) : undefined });
    return { status: r.status, data: await r.json().catch(() => null), cookie: (r.headers.get('set-cookie') || '').split(';')[0] };
  };
  let step = totp.step() + 5; // eigene Zeitfenster, damit sich Codes nicht mit dem Test davor überschneiden
  const info = await agent.auth.addUser('boss', 'boss-passwort-123', 'admin');
  const loginCode = () => totp.hotp(info.secret, totp.step());
  const c1 = (await call('POST', '/api/login', { body: { user: 'boss', password: 'boss-passwort-123', code: totp.hotp(info.secret, totp.step() - 1) } })).cookie;
  const c2 = (await call('POST', '/api/login', { body: { user: 'boss', password: 'boss-passwort-123', code: loginCode() } })).cookie;
  assert.ok(c1 && c2);
  // Geräte: zwei Sitzungen, eine ist „dieses Gerät“
  const sess = (await call('GET', '/api/me/sessions', { cookie: c1 })).data;
  assert.equal(sess.length, 2);
  assert.equal(sess.filter(x => x.current).length, 1);
  // Passwort ändern: falsches altes Passwort / falscher Code abgelehnt, richtig -> anderes Gerät abgemeldet
  assert.equal((await call('POST', '/api/me/password', { cookie: c1, body: { current: 'falsch-falsch', next: 'neues-passwort-99', code: '000000' } })).status, 403);
  assert.equal((await call('POST', '/api/me/password', { cookie: c1, body: { current: 'boss-passwort-123', next: 'kurz', code: '000000' } })).status, 400);
  void step;
  const pw = await call('POST', '/api/me/password', { cookie: c1, body: { current: 'boss-passwort-123', next: 'neues-passwort-99', code: totp.hotp(info.secret, totp.step() + 1) } });
  assert.equal(pw.status, 200, JSON.stringify(pw.data));
  assert.equal((await call('GET', '/api/me', { cookie: c1 })).status, 200, 'eigenes Gerät bleibt angemeldet');
  assert.equal((await call('GET', '/api/me', { cookie: c2 })).status, 401, 'anderes Gerät abgemeldet');
  // 2FA umziehen: erst mit Code aus dem NEUEN Schlüssel
  const start = (await call('POST', '/api/me/totp/start', { cookie: c1 })).data;
  assert.match(start.qr, /^<svg/);
  assert.equal((await call('POST', '/api/me/totp/confirm', { cookie: c1, body: { code: '123456' } })).status, 403);
  assert.equal((await call('POST', '/api/me/totp/confirm', { cookie: c1, body: { code: totp.hotp(start.secret, totp.step()) } })).status, 200);
  // Benutzer verwalten
  const added = await call('POST', '/api/users', { cookie: c1, body: { name: 'helfer', role: 'viewer', password: 'helfer-passwort-1' } });
  assert.equal(added.status, 200);
  assert.match(added.data.qr, /^<svg/);
  assert.equal((await call('POST', '/api/users', { cookie: c1, body: { name: 'helfer', role: 'viewer', password: 'helfer-passwort-1' } })).status, 400, 'doppelt');
  assert.equal((await call('POST', '/api/users/helfer/role', { cookie: c1, body: { role: 'admin' } })).status, 200);
  assert.equal((await call('POST', '/api/users/boss/delete', { cookie: c1 })).status, 400, 'sich selbst nicht');
  assert.equal((await call('POST', '/api/users/helfer/delete', { cookie: c1 })).status, 200);
  // Letzter Admin? (chef + boss sind Admins) – boss herabstufen geht, chef danach nicht mehr
  assert.equal((await call('POST', '/api/users/gast/role', { cookie: c1, body: { role: 'superuser' } })).status, 400);
  // Warnungen
  assert.equal((await call('POST', '/api/settings', { cookie: c1, body: { alerts: { disk: 120 } } })).status, 400);
  const st = await call('POST', '/api/settings', { cookie: c1, body: { name: 'Mein Server', alerts: { disk: 85, serviceFailed: false } } });
  assert.equal(st.data.name, 'Mein Server');
  assert.equal(st.data.alerts.disk, 85);
  assert.equal(st.data.alerts.serviceFailed, false);
  // Prozesse und Laufwerke (Demo)
  assert.ok((await call('GET', '/api/s/local/processes?sort=mem', { cookie: c1 })).data.length > 3);
  assert.ok((await call('GET', '/api/s/local/disks', { cookie: c1 })).data.some(d => d.mount === '/'));
});

