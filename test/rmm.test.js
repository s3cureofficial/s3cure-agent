// RMM-Funktionen (Runde 1): Warnungs-Wege, Checks, Updates, Inventar, Skripte – Bausteine und API (Demo-Modus)
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
process.env.S3CURE_AGENT_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 's3rmm-'));
fs.writeFileSync(path.join(process.env.S3CURE_AGENT_DIR, 'config.json'), JSON.stringify({ port: 0, name: 'rmmtest' }));

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const totp = require('../lib/totp');
const { clean } = require('../lib/notify');
const { cleanCheck, runCheck } = require('../lib/checks');
const { parseUpgradable } = require('../lib/updates');
const inv = require('../lib/inventory');
const { runBash } = require('../lib/scripts');
const { createAgent } = require('../lib/server');

test('Warnungs-Wege: nur echte Discord-Webhooks und https', () => {
  const ok = clean({ discord: ['https://discord.com/api/webhooks/123/abc-DEF_9'], webhooks: ['https://hooks.example.com/x'], email: { host: 'smtp.example.com', port: 587, to: 'a@b.de' } });
  assert.equal(ok.discord.length, 1);
  assert.equal(ok.email.port, 587);
  assert.throws(() => clean({ discord: ['https://evil.example/api/webhooks/1/x'] }), /Discord/);
  assert.throws(() => clean({ webhooks: ['http://unsicher.example'] }), /https/);
  assert.throws(() => clean({ email: { host: 'smtp.example.com', to: 'kaputt' } }), /Empfänger/);
});

test('Checks: Eingaben prüfen', () => {
  assert.equal(cleanCheck({ type: 'http', url: 'https://example.com' }).name, 'example.com');
  assert.equal(cleanCheck({ type: 'service', service: 'nginx' }).service, 'nginx.service');
  assert.equal(cleanCheck({ type: 'cert', host: 'example.com' }).port, 443);
  assert.throws(() => cleanCheck({ type: 'ping', host: 'a;rm -rf /' }), /Adresse/);
  assert.throws(() => cleanCheck({ type: 'http', url: 'ftp://x' }), /http/);
  assert.throws(() => cleanCheck({ type: 'nope' }), /Unbekannt/);
  assert.equal(cleanCheck({ type: 'ping', host: 'example.com', interval: 5 }).interval, 30, 'mindestens 30 s');
});

test('Checks: echte Prüfungen gegen lokale Server (Port, Webseite, Text, Platte, Skript)', async () => {
  const srv = http.createServer((req, res) => { res.writeHead(req.url === '/down' ? 503 : 200); res.end('Hallo S3cure'); });
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  const p = srv.address().port;
  try {
    assert.equal((await runCheck({ type: 'port', host: '127.0.0.1', port: p })).ok, true);
    assert.equal((await runCheck({ type: 'http', url: `http://127.0.0.1:${p}/` })).ok, true);
    assert.equal((await runCheck({ type: 'http', url: `http://127.0.0.1:${p}/down` })).ok, false);
    assert.equal((await runCheck({ type: 'http', url: `http://127.0.0.1:${p}/`, keyword: 'S3cure' })).ok, true);
    assert.equal((await runCheck({ type: 'http', url: `http://127.0.0.1:${p}/`, keyword: 'fehlt' })).ok, false);
  } finally { srv.close(); }
  assert.equal((await runCheck({ type: 'port', host: '127.0.0.1', port: 1 })).ok, false);
  assert.equal((await runCheck({ type: 'disk', path: '/', limit: 99 })).ok, true);
  assert.equal((await runCheck({ type: 'script', body: 'exit 0' })).ok, true);
  assert.equal((await runCheck({ type: 'script', body: 'echo kaputt; exit 2' })).ok, false);
});

test('Updates: apt-Ausgabe lesen, Sicherheits-Updates zuerst', () => {
  const l = parseUpgradable('Listing...\nnginx/bookworm 1.22.1-9+deb12u1 amd64 [upgradable from: 1.22.1-9]\nopenssl/bookworm-security 3.0.15 amd64 [upgradable from: 3.0.14]\n');
  assert.deepEqual(l.map(p => [p.name, p.security]), [['openssl', true], ['nginx', false]]);
});

test('Inventar: lsblk, ip, dpkg lesen', () => {
  const d = inv.parseLsblk(JSON.stringify({ blockdevices: [{ name: 'sda', size: 1000, type: 'disk', model: 'X ', rota: false, children: [{ name: 'sda1', size: 900, fstype: 'ext4', mountpoint: '/' }] }, { name: 'loop0', type: 'loop' }] }));
  assert.equal(d.length, 1); assert.equal(d[0].parts[0].mount, '/');
  const n = inv.parseIp(JSON.stringify([{ ifname: 'lo' }, { ifname: 'eth0', address: 'aa:bb', flags: ['UP'], addr_info: [{ local: '1.2.3.4', prefixlen: 24, scope: 'global' }, { local: 'fe80::1', prefixlen: 64, scope: 'link' }] }]));
  assert.deepEqual(n, [{ name: 'eth0', mac: 'aa:bb', up: true, addresses: ['1.2.3.4/24'] }]);
  assert.equal(inv.parseDpkg('curl\t7.88\t500\n\n').length, 1);
});

test('Skripte: Ausgabe, Exit-Code, Zeitlimit', async () => {
  const r = await runBash('echo hallo; echo fehler >&2; exit 3');
  assert.equal(r.code, 3);
  assert.match(r.output, /hallo/); assert.match(r.output, /fehler/);
  const slow = await runBash('sleep 10', { timeout: 1 });
  assert.equal(slow.timedOut, true);
  assert.equal(slow.code, 124);
});

let agent, srv, base;
after(() => { agent && agent.stop(); srv && srv.close(); });

test('API: Skripte (2FA beim Speichern, Lauf im Hintergrund), Checks, Updates, Inventar, Weitergabe an andere Agenten', async () => {
  agent = createAgent({ demo: true });
  srv = await agent.listen();
  base = `http://127.0.0.1:${srv.address().port}`;
  const u = await agent.auth.addUser('admin', 'admin-passwort-1', 'admin');
  const H = { 'Content-Type': 'application/json', 'X-S3cure': '1' };
  const login = await fetch(base + '/api/login', { method: 'POST', headers: H, body: JSON.stringify({ user: 'admin', password: 'admin-passwort-1', code: totp.hotp(u.secret, totp.step() - 1) }) });
  const cookie = login.headers.get('set-cookie').split(';')[0];
  const call = async (m, p, body) => { const r = await fetch(base + p, { method: m, headers: { ...H, Cookie: cookie }, body: body ? JSON.stringify(body) : undefined }); return { status: r.status, data: await r.json().catch(() => null) }; };

  // Vorlagen sind da
  const lib = (await call('GET', '/api/scripts')).data;
  assert.ok(lib.length >= 5);
  // Speichern ohne Code: abgelehnt; mit Code: gespeichert
  assert.equal((await call('POST', '/api/scripts', { name: 'Test', body: 'echo hi', code: '000000' })).status, 403);
  const saved = await call('POST', '/api/scripts', { name: 'Test', body: 'echo hi', code: totp.hotp(u.secret, totp.step()) });
  assert.equal(saved.status, 200, JSON.stringify(saved.data));
  // Ausführen: sofort Antwort, dann fertig
  const runs = (await call('POST', `/api/scripts/${saved.data.id}/run`, { servers: ['local'] })).data;
  assert.equal(runs[0].status, 'running');
  let done;
  for (let i = 0; i < 20 && !(done && done.status === 'done'); i++) { await new Promise(r => setTimeout(r, 150)); done = (await call('GET', `/api/scripts/runs/${runs[0].id}`)).data; }
  assert.equal(done.status, 'done');
  assert.equal(done.code, 0);
  // Checks anlegen, prüfen, löschen
  const c = await call('POST', '/api/s/local/checks', { type: 'http', url: 'https://example.com' });
  assert.equal(c.status, 200);
  const ran = (await call('POST', `/api/s/local/checks/${c.data.id}/run`)).data;
  assert.equal(ran.state.status, 'ok');
  assert.ok(ran.state.last > 0);
  assert.equal((await call('POST', '/api/s/local/checks', { type: 'ping', host: 'x y' })).status, 400);
  assert.equal((await call('POST', `/api/s/local/checks/${c.data.id}/delete`)).data.length, 0);
  // Updates (Demo)
  const up = (await call('GET', '/api/s/local/updates')).data;
  assert.ok(up.supported && up.list.some(p => p.security));
  const job = await call('POST', '/api/s/local/updates/install', { packages: ['openssl'] });
  assert.equal(job.status, 200);
  assert.equal((await call('POST', '/api/s/local/updates/install', {})).status, 409, 'nur ein Auftrag gleichzeitig');
  assert.equal((await call('POST', '/api/s/local/updates/schedule', { auto: true, day: 1, hour: 3, reboot: 'if-needed' })).data.hour, 3);
  // Inventar (Demo)
  assert.equal((await call('GET', '/api/s/local/inventory/hardware')).data.vendor, 'Hetzner');
  assert.ok((await call('GET', '/api/s/local/inventory/software')).data.list.length > 5);
  // Warnungs-Wege
  assert.equal((await call('POST', '/api/notify', { discord: ['nope'] })).status, 400);
  assert.deepEqual((await call('POST', '/api/notify', { discord: ['https://discord.com/api/webhooks/1/abc'] })).data.discord, ['https://discord.com/api/webhooks/1/abc']);
  // Weitergabe: andere Agenten rufen /api/agent/x/… nur mit Schlüssel
  const token = require('../lib/config').load().agentToken;
  assert.equal((await fetch(base + '/api/agent/x/checks')).status, 401);
  assert.equal((await fetch(base + '/api/agent/x/checks', { headers: { Authorization: 'Bearer ' + token } })).status, 200);
  const ex = await fetch(base + '/api/agent/x-exec', { method: 'POST', headers: { ...H, Authorization: 'Bearer ' + token }, body: JSON.stringify({ body: 'echo hub' }) });
  assert.equal(ex.status, 200);
});
