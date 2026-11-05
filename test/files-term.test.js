// Runde 3: Freischalten, Dateien, Web-Terminal
const fs = require('fs');
const os = require('os');
const path = require('path');
process.env.S3CURE_AGENT_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 's3ft-'));
fs.writeFileSync(path.join(process.env.S3CURE_AGENT_DIR, 'config.json'), JSON.stringify({ port: 0, name: 'ft' }));

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const totp = require('../lib/totp');
const { clean } = require('../lib/files');
const { createTerminals } = require('../lib/terminal');
const { createAgent } = require('../lib/server');

test('Pfade: nur absolut, ohne Tricks', () => {
  assert.equal(clean('/root/../etc/./ssh/'), '/etc/ssh');
  assert.equal(clean('/'), '/');
  assert.throws(() => clean('etc'), /beginnen/);
  assert.throws(() => clean('/a\0b'), /Ungültig/);
});

let agent, srv;
after(() => { agent && agent.stop(); if (srv) { srv.closeAllConnections(); srv.close(); } });

test('API: Freischalten, Dateien, Terminal (Demo)', async () => {
  agent = createAgent({ demo: true });
  srv = await agent.listen();
  const base = `http://127.0.0.1:${srv.address().port}`;
  const u = await agent.auth.addUser('admin', 'admin-passwort-1', 'admin');
  const gast = await agent.auth.addUser('gast', 'gast-passwort-1', 'viewer');
  const H = { 'Content-Type': 'application/json', 'X-S3cure': '1' };
  const login = async (user, pw, code) => (await fetch(base + '/api/login', { method: 'POST', headers: H, body: JSON.stringify({ user, password: pw, code }) })).headers.get('set-cookie').split(';')[0];
  const cookie = await login('admin', 'admin-passwort-1', totp.hotp(u.secret, totp.step() - 1));
  const call = async (m, p, body, c = cookie) => { const r = await fetch(base + p, { method: m, headers: { ...H, Cookie: c }, body: body ? JSON.stringify(body) : undefined }); return { status: r.status, data: await r.json().catch(() => null) }; };

  // Ohne Freischaltung: gesperrt
  const locked = await call('GET', '/api/files/list?path=/root');
  assert.equal(locked.status, 403);
  assert.equal(locked.data.unlock, true);
  assert.equal((await call('POST', '/api/term', { cols: 80, rows: 24 })).status, 403);
  assert.equal((await call('POST', '/api/unlock', { code: '000000' })).status, 403);
  assert.equal((await call('POST', '/api/unlock', { code: totp.hotp(u.secret, totp.step()) })).data.active, true);

  // Dateien
  const ls = await call('GET', '/api/files/list?path=/root');
  assert.ok(ls.data.entries.some(e => e.name === 'notizen.txt'));
  const rd = await call('GET', '/api/files/read?path=/root/notizen.txt');
  assert.match(rd.data.text, /Backups/);
  assert.equal((await call('POST', '/api/files/write', { path: '/root/notizen.txt', text: 'neu', mtime: rd.data.mtime })).status, 200);
  assert.equal((await call('POST', '/api/files/write', { path: '/root/notizen.txt', text: 'alt', mtime: 1 })).status, 409); // inzwischen geändert
  assert.equal((await call('POST', '/api/files/mkdir', { path: '/root', name: 'neu' })).status, 200);
  const up = await fetch(base + '/api/files/upload?path=/root/neu&name=a.txt', { method: 'POST', headers: { 'X-S3cure': '1', Cookie: cookie }, body: 'hallo' });
  assert.equal(up.status, 200);
  assert.equal((await fetch(base + '/api/files/upload?path=/root/neu&name=a.txt', { method: 'POST', headers: { 'X-S3cure': '1', Cookie: cookie }, body: 'x' })).status, 409);
  const dl = await fetch(base + '/api/files/download?path=/root/neu/a.txt', { headers: { Cookie: cookie } });
  assert.equal(await dl.text(), 'hallo');
  assert.equal((await call('POST', '/api/files/rename', { path: '/root/neu/a.txt', name: '../../x' })).status, 400);
  assert.equal((await call('POST', '/api/files/rename', { path: '/root/neu/a.txt', name: 'b.txt' })).data.path, '/root/neu/b.txt');
  for (const p of ['/', '/etc', '/root', '/usr']) assert.equal((await call('POST', '/api/files/delete', { path: p })).status, 400, p);
  assert.equal((await call('POST', '/api/files/delete', { path: '/root/neu' })).status, 200);
  assert.equal((await call('GET', '/api/files/list?path=/root/neu')).status, 404);

  // Nur Admins
  const g = await login('gast', 'gast-passwort-1', totp.hotp(gast.secret, totp.step()));
  assert.equal((await call('POST', '/api/unlock', { code: totp.hotp(gast.secret, totp.step() + 1) }, g)).status, 403);
  assert.equal((await call('GET', '/api/files/list?path=/root', null, g)).status, 403);
  assert.equal((await call('GET', '/api/term', null, g)).status, 403);

  // Terminal (Demo-Shell)
  const tm = await call('POST', '/api/term', { cols: 100, rows: 30 });
  assert.equal(tm.status, 200);
  const es = await fetch(base + `/api/term/${tm.data.id}/stream`, { headers: { Cookie: cookie } });
  assert.match(es.headers.get('content-type'), /event-stream/);
  const reader = es.body.getReader();
  let got = '';
  const readUntil = async re => { const end = Date.now() + 3000; while (!re.test(got) && Date.now() < end) { const { value, done } = await reader.read(); if (done) break; got += Buffer.from(value).toString(); } };
  await readUntil(/s3cure/);
  assert.equal((await call('POST', `/api/term/${tm.data.id}/input`, { data: 'whoami\r' })).status, 200);
  await readUntil(/root\\r\\n/);
  assert.match(got, /whoami/);
  assert.match(got, /whoami\\r\\nroot\\r\\n/);
  assert.equal((await call('POST', `/api/term/${tm.data.id}/resize`, { cols: 60, rows: 20 })).status, 200);
  assert.equal((await call('POST', `/api/term/${tm.data.id}/close`)).status, 200);
  reader.cancel().catch(() => {});
  assert.equal((await call('GET', '/api/term')).data.length, 0);
  assert.equal((await call('POST', `/api/term/${tm.data.id}/input`, { data: 'x' })).status, 404);

  // Sperren
  await call('POST', '/api/unlock/end');
  assert.equal((await call('GET', '/api/files/list?path=/root')).status, 403);
  await new Promise(r => setTimeout(r, 100));
  const log = fs.readFileSync(path.join(process.env.S3CURE_AGENT_DIR, 'audit.log'), 'utf8');
  for (const a of ['unlock', 'file-save', 'file-upload', 'file-delete', 'terminal-open', 'terminal-close']) assert.match(log, new RegExp(`"action":"${a}"`), a);
  assert.doesNotMatch(log, /whoami/); // Eingaben werden nicht protokolliert
});

// Echte Shell über „script“ – nur unter Linux (CI)
test('Terminal: echte Shell unter Linux', { skip: process.platform !== 'linux' }, async () => {
  const terms = createTerminals({});
  const t = terms.open({ user: 'x', cols: 90, rows: 25 });
  let out = '';
  const off = terms.attach(t.id, 'x', ev => { if (ev.data) out += ev.data; });
  const wait = async re => { const end = Date.now() + 8000; while (!re.test(out) && Date.now() < end) await new Promise(r => setTimeout(r, 50)); };
  terms.input(t.id, 'x', 'stty size; echo S3OK-$((40+2))\r');
  await wait(/S3OK-42/);
  assert.match(out, /S3OK-42/);
  assert.match(out, /25 90/);
  await terms.resize(t.id, 'x', 120, 40);
  out = '';
  terms.input(t.id, 'x', 'stty size\r');
  await wait(/40 120/);
  assert.match(out, /40 120/);
  off();
  terms.close(t.id, 'x');
  terms.stopAll();
});
