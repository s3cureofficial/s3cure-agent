// Updates (Debian/Ubuntu, apt): verfügbare anzeigen (Sicherheits-Updates markiert), installieren als
// Hintergrund-Auftrag mit Protokoll, automatischer Zeitplan mit Neustart-Regel (config.json "updates").
const fs = require('fs');
const { execFile, spawn } = require('child_process');
const config = require('./config');

const ENV = { ...process.env, LC_ALL: 'C', DEBIAN_FRONTEND: 'noninteractive', NEEDRESTART_MODE: 'a', APT_LISTCHANGES_FRONTEND: 'none' };
const PKG_RE = /^[a-z0-9][a-z0-9+.-]{0,100}$/;

// "openssl/bookworm-security 3.0.15-1~deb12u1 amd64 [upgradable from: 3.0.14-1~deb12u2]"
function parseUpgradable(text) {
  const out = [];
  for (const line of String(text).split('\n')) {
    const m = /^([^/\s]+)\/(\S+)\s+(\S+)\s+(\S+)\s+\[upgradable from: ([^\]]+)\]/.exec(line.trim());
    if (m) out.push({ name: m[1], suite: m[2], version: m[3], arch: m[4], from: m[5], security: /-security/.test(m[2]) });
  }
  return out.sort((a, b) => (b.security - a.security) || a.name.localeCompare(b.name));
}

const run = (cmd, args, timeout = 120000) => new Promise(r => execFile(cmd, args, { env: ENV, timeout, maxBuffer: 16 * 1024 * 1024 }, (e, out, err) => r({ code: e ? (e.code || 1) : 0, out: String(out || ''), err: String(err || '') })));
const has = f => { try { fs.accessSync(f, fs.constants.X_OK); return true; } catch { return false; } };
const mtime = f => { try { return fs.statSync(f).mtimeMs; } catch { return null; } };

function createUpdates({ notify, getCfg, demo = false, reboot }) {
  let job = null; // laufender oder letzter Auftrag { id, kind, started, finished, code, log, by }
  let jobs = config.readJson('update-jobs.json', []);
  const saveJobs = () => config.writeJson('update-jobs.json', jobs.slice(0, 20));
  const supported = () => demo || has('/usr/bin/apt-get');

  async function status() {
    if (!supported()) return { supported: false, list: [] };
    if (demo) {
      return { supported: true, refreshed: Date.now() - 3 * 3600e3, rebootRequired: false, list: parseUpgradable([
        'openssl/bookworm-security 3.0.15-1~deb12u1 amd64 [upgradable from: 3.0.14-1~deb12u2]',
        'libssl3/bookworm-security 3.0.15-1~deb12u1 amd64 [upgradable from: 3.0.14-1~deb12u2]',
        'nginx/bookworm 1.22.1-9+deb12u1 amd64 [upgradable from: 1.22.1-9]',
        'tzdata/bookworm-updates 2025b-0+deb12u1 all [upgradable from: 2024b-0+deb12u1]',
      ].join('\n')), job: job && view(job), schedule: getCfg().updates };
    }
    const r = await run('apt', ['list', '--upgradable']);
    return {
      supported: true, list: parseUpgradable(r.out),
      refreshed: mtime('/var/lib/apt/periodic/update-success-stamp') || mtime('/var/cache/apt/pkgcache.bin'),
      rebootRequired: fs.existsSync('/var/run/reboot-required'),
      job: job && view(job), schedule: getCfg().updates,
    };
  }

  const view = j => ({ ...j, log: j.log.slice(-20000) });

  // Auftrag im Hintergrund: Befehle nacheinander, Ausgabe ins Protokoll
  function start(kind, steps, by) {
    if (job && !job.finished) throw Object.assign(new Error('Es läuft schon ein Update-Auftrag.'), { status: 409 });
    job = { id: Date.now().toString(36), kind, by, started: Date.now(), finished: null, code: null, log: '' };
    const j = job;
    (async () => {
      for (const [cmd, args] of steps) {
        j.log += `$ ${cmd} ${args.join(' ')}\n`;
        if (demo) { await new Promise(r => setTimeout(r, 700)); j.log += '(Demo) … erledigt\n'; continue; }
        const code = await new Promise(resolve => {
          const p = spawn(cmd, args, { env: ENV });
          const add = d => { j.log += d.toString('utf8'); if (j.log.length > 400000) j.log = j.log.slice(-300000); };
          p.stdout.on('data', add); p.stderr.on('data', add);
          p.on('error', e => { j.log += e.message + '\n'; resolve(127); });
          p.on('close', c => resolve(c ?? 1));
        });
        if (code !== 0) { j.code = code; break; }
      }
      if (j.code == null) j.code = 0;
      j.finished = Date.now();
      jobs.unshift({ ...j, log: j.log.slice(-20000) }); saveJobs();
      const server = getCfg().name;
      if (kind !== 'refresh') notify.send({ title: `${server}: Updates`, body: j.code === 0 ? 'Updates installiert ✓' : `Updates fehlgeschlagen (Exit ${j.code})`, level: j.code === 0 ? 'ok' : 'bad', url: '/#/s/local/updates' }).catch(() => {});
      // Neustart-Regel nach automatischen Updates
      const sched = getCfg().updates || {};
      if (kind === 'auto' && j.code === 0 && sched.reboot === 'if-needed' && fs.existsSync('/var/run/reboot-required')) reboot();
    })();
    return view(j);
  }

  function refresh(by) { return start('refresh', [['apt-get', ['update']]], by); }

  function install(packages, by, kind = 'install') {
    const list = (packages || []).filter(p => PKG_RE.test(p));
    if (packages && packages.length && list.length !== packages.length) throw Object.assign(new Error('Ungültiger Paketname.'), { status: 400 });
    const opts = ['-y', '-o', 'Dpkg::Options::=--force-confdef', '-o', 'Dpkg::Options::=--force-confold'];
    return start(kind, [['apt-get', ['update']], list.length ? ['apt-get', [...opts, 'install', '--only-upgrade', ...list]] : ['apt-get', [...opts, 'upgrade']]], by);
  }

  // Zeitplan: { auto: bool, day: -1 (täglich) | 0–6 (So–Sa), hour: 0–23, reboot: 'never' | 'if-needed' }
  function setSchedule(s) {
    const cfg = config.load();
    cfg.updates = {
      auto: !!s.auto, day: Math.max(-1, Math.min(6, Number.isFinite(Number(s.day)) ? Number(s.day) : -1)),
      hour: Math.max(0, Math.min(23, Number(s.hour) || 4)), reboot: s.reboot === 'if-needed' ? 'if-needed' : 'never',
    };
    config.save(cfg);
    return cfg.updates;
  }

  // Jede Minute vom Agenten aufgerufen
  let lastAuto = 0;
  function tick(now = new Date()) {
    const s = getCfg().updates;
    if (!s || !s.auto || !supported()) return;
    if (now.getMinutes() !== 0 || now.getHours() !== s.hour || (s.day >= 0 && now.getDay() !== s.day)) return;
    if (Date.now() - lastAuto < 3600e3) return;
    lastAuto = Date.now();
    try { install(null, 'Zeitplan', 'auto'); } catch {}
  }

  return { status, refresh, install, setSchedule, tick, job: () => job && view(job), history: () => jobs.map(({ log, ...j }) => j) };
}

module.exports = { createUpdates, parseUpgradable };
