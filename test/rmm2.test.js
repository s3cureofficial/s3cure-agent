// RMM-Funktionen (Runde 2): Aufgaben, Wartung, Prozesse, Zuordnung, Sammelaktionen
const fs = require('fs');
const os = require('os');
const path = require('path');
process.env.S3CURE_AGENT_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 's3rmm2-'));
fs.writeFileSync(path.join(process.env.S3CURE_AGENT_DIR, 'config.json'), JSON.stringify({ port: 0, name: 'rmm2' }));

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const totp = require('../lib/totp');
const { cleanSchedule, due } = require('../lib/tasks');
const { createAgent } = require('../lib/server');
const system = require('../lib/system');

test('Aufgaben: Zeitpläne prüfen und fällig werden', () => {
  assert.equal(cleanSchedule({ type: 'daily', time: '3:05' }).time, '03:05');
  assert.throws(() => cleanSchedule({ type: 'daily', time: '25:00' }), /Uhrzeit/);
  assert.throws(() => cleanSchedule({ type: 'interval', every: 1 }), /5–1440/);
  const at = (d, h, m) => new Date(2026, 10, d, h, m);
  const daily = { schedule: cleanSchedule({ type: 'daily', time: '03:00' }) };
  assert.equal(due(daily, at(5, 3, 0)), true);
  assert.equal(due(daily, at(5, 3, 1)), false);
  const weekly = { schedule: cleanSchedule({ type: 'weekly', day: 1, time: '04:30' }) }; // Montag
  assert.equal(due(weekly, at(9, 4, 30)), true); // 9.11.2026 ist ein Montag
  assert.equal(due(weekly, at(10, 4, 30)), false);
  const hourly = { schedule: cleanSchedule({ type: 'hourly', minute: 15 }) };
  assert.equal(due(hourly, at(5, 7, 15)), true);
  const iv = { schedule: cleanSchedule({ type: 'interval', every: 30 }), lastRun: at(5, 7, 0).getTime() };
  assert.equal(due(iv, at(5, 7, 20)), false);
  assert.equal(due(iv, at(5, 7, 30)), true);
  // gleiche Minute nicht doppelt
  const once = { ...daily, lastMinute: Math.floor(at(5, 3, 0).getTime() / 60000) };
  assert.equal(due(once, at(5, 3, 0)), false);
});

test('Prozesse: Systemprozesse sind geschützt', () => {
  for (const n of ['systemd', 'sshd', 'dockerd', 'init']) assert.ok(system.PROTECTED_PROCS.test(n), n);
  assert.ok(!system.PROTECTED_PROCS.test('node'));
  assert.ok(system.SERVICE_ACTIONS.includes('disable'));
});

let agent, srv;
after(() => { agent && agent.stop(); srv && srv.close(); });

test('API: Aufgaben, Wartung, Prozesse, Zuordnung, Sammel-Neustart', async () => {
  agent = createAgent({ demo: true });
  srv = await agent.listen();
  const base = `http://127.0.0.1:${srv.address().port}`;
  const u = await agent.auth.addUser('admin', 'admin-passwort-1', 'admin');
  const H = { 'Content-Type': 'application/json', 'X-S3cure': '1' };
  const login = await fetch(base + '/api/login', { method: 'POST', headers: H, body: JSON.stringify({ user: 'admin', password: 'admin-passwort-1', code: totp.hotp(u.secret, totp.step() - 1) }) });
  const cookie = login.headers.get('set-cookie').split(';')[0];
  const call = async (m, p, body) => { const r = await fetch(base + p, { method: m, headers: { ...H, Cookie: cookie }, body: body ? JSON.stringify(body) : undefined }); return { status: r.status, data: await r.json().catch(() => null) }; };

  // Aufgaben
  const sc = (await call('GET', '/api/scripts')).data[0];
  assert.equal((await call('POST', '/api/tasks', { name: 'x', script: 'gibtsnicht', servers: ['local'] })).status, 400);
  const tk = await call('POST', '/api/tasks', { name: 'Nachts aufräumen', script: sc.id, servers: ['local'], schedule: { type: 'daily', time: '03:00' } });
  assert.equal(tk.status, 200, JSON.stringify(tk.data));
  const runs = (await call('POST', `/api/tasks/${tk.data.id}/run`)).data;
  assert.equal(runs[0].task, tk.data.id);
  await new Promise(r => setTimeout(r, 700));
  assert.equal((await call('GET', '/api/tasks')).data[0].lastStatus, 'ok');
  assert.equal((await call('POST', `/api/tasks/${tk.data.id}/delete`)).data.length, 0);

  // Wartung
  assert.equal((await call('GET', '/api/s/local/maintenance')).data.active, false);
  const m = await call('POST', '/api/s/local/maintenance', { minutes: 30, reason: 'Umzug' });
  assert.equal(m.data.active, true);
  assert.equal((await call('GET', '/api/servers')).data[0].maintenance.reason, 'Umzug');
  assert.equal((await call('POST', '/api/s/local/maintenance/end')).data.active, false);

  // Prozesse
  assert.ok((await call('GET', '/api/s/local/processes?limit=150')).data.length > 3);
  assert.equal((await call('POST', '/api/s/local/processes/1/kill', { signal: 'KILL' })).status, 400);
  assert.equal((await call('POST', '/api/s/local/processes/4242/kill', {})).status, 200);

  // Dienst beim Start aus/an (ssh geschützt)
  assert.equal((await call('POST', '/api/s/local/services/ssh.service/disable')).status, 400);
  assert.equal((await call('POST', '/api/s/local/services/nginx.service/disable')).status, 200);
  assert.equal((await call('GET', '/api/s/local/services')).data.list.find(x => x.name === 'nginx.service').enabled, 'disabled');

  // Zuordnung
  const meta = await call('POST', '/api/meta/local', { client: 'Kunde A', site: 'Berlin', tags: 'web, prod, web', notes: 'Root nur per Schlüssel' });
  assert.deepEqual(meta.data.tags, ['web', 'prod']);
  assert.equal((await call('GET', '/api/servers')).data[0].meta.client, 'Kunde A');
  assert.equal((await call('POST', '/api/meta/unbekannt', { client: 'x' })).status, 404);

  // Sammel-Neustart: nur mit Code
  assert.equal((await call('POST', '/api/bulk/reboot', { servers: ['local'], code: '000000' })).status, 403);
  const rb = await call('POST', '/api/bulk/reboot', { servers: ['local'], code: totp.hotp(u.secret, totp.step()) });
  assert.equal(rb.status, 200);
  assert.equal(rb.data[0].ok, true);
});
