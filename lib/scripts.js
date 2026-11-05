// Skript-Bibliothek: eigene Bash-Skripte speichern und auf einem oder mehreren Servern ausführen.
// Ausgeführt wird als root (der Agent läuft als root) – darum: nur Admins, Anlegen/Ändern nur mit 2FA-Code.
// Ergebnisse (Ausgabe, Exit-Code, Dauer) bleiben im Verlauf (runs.json, die letzten 300).
const crypto = require('crypto');
const { spawn } = require('child_process');
const config = require('./config');

const MAX_OUT = 256 * 1024;
const MAX_RUNS = 300;

const SAMPLES = [
  { name: 'Speicherplatz aufräumen', description: 'Paket-Zwischenspeicher leeren, alte Journal-Logs (älter als 14 Tage) löschen, danach freien Platz zeigen.',
    body: 'set -e\ndf -h /\napt-get clean 2>/dev/null || true\njournalctl --vacuum-time=14d 2>/dev/null || true\necho\ndf -h /' },
  { name: 'Docker aufräumen', description: 'Gestoppte Container, ungenutzte Netzwerke und Images ohne Namen entfernen.',
    body: 'docker system df\ndocker system prune -f\ndocker system df' },
  { name: 'Offene Ports', description: 'Welche Programme auf welchen Ports lauschen.', body: 'ss -tulpn' },
  { name: 'Letzte Anmeldungen', description: 'Die letzten 25 Anmeldungen am Server.', body: 'last -n 25 -a 2>/dev/null || journalctl _COMM=sshd -n 40 --no-pager' },
  { name: 'Größte Ordner in /var', description: 'Wo ist der Platz hin? Die 15 größten Ordner unter /var.', body: 'du -xh /var 2>/dev/null | sort -rh | head -n 15' },
  { name: 'Fehlgeschlagene Dienste', description: 'Alle ausgefallenen systemd-Dienste mit den letzten Log-Zeilen.', body: 'systemctl --failed --no-pager\nfor u in $(systemctl list-units --state=failed --no-legend --plain | awk \'{print $1}\'); do echo; echo "== $u"; journalctl -u "$u" -n 10 --no-pager; done' },
];

const id = () => crypto.randomBytes(8).toString('hex');

// Bash-Skript ausführen (ohne Terminal). Rückgabe: { code, output, ms, timedOut }
function runBash(body, { timeout = 120, demo = false } = {}) {
  if (demo) {
    return new Promise(r => setTimeout(() => r({ code: 0, ms: 420, timedOut: false, output: `$ ${String(body).split('\n')[0]}\n(Demo) Ausgabe des Skripts …\nfertig.\n` }), 400));
  }
  return new Promise(resolve => {
    const started = Date.now();
    const p = spawn('bash', ['-c', String(body)], { env: { ...process.env, LC_ALL: 'C.UTF-8', DEBIAN_FRONTEND: 'noninteractive', TERM: 'dumb' }, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '', cut = false, timedOut = false;
    const add = d => { if (out.length < MAX_OUT) out += d.toString('utf8'); else cut = true; };
    p.stdout.on('data', add); p.stderr.on('data', add);
    const timer = setTimeout(() => { timedOut = true; try { p.kill('SIGKILL'); } catch {} }, Math.max(5, Math.min(3600, timeout)) * 1000);
    p.on('error', err => { clearTimeout(timer); resolve({ code: 127, output: String(err.message), ms: Date.now() - started, timedOut: false }); });
    p.on('close', code => {
      clearTimeout(timer);
      resolve({ code: timedOut ? 124 : code ?? 1, output: out + (cut ? '\n… (gekürzt)' : '') + (timedOut ? `\n… nach ${timeout} s abgebrochen` : ''), ms: Date.now() - started, timedOut });
    });
  });
}

function createScripts() {
  let lib = config.readJson('scripts.json', null);
  if (!lib) { // erste Start: Vorlagen anlegen
    lib = SAMPLES.map(s => ({ id: id(), ...s, timeout: 300, sample: true, updated: Date.now(), by: 'S3cure' }));
    config.writeJson('scripts.json', lib);
  }
  let runs = config.readJson('runs.json', []);
  const saveLib = () => config.writeJson('scripts.json', lib);
  const saveRuns = () => config.writeJson('runs.json', runs);

  const list = () => lib.map(({ body, ...rest }) => ({ ...rest, lines: String(body).split('\n').length }));
  const get = sid => { const s = lib.find(x => x.id === sid); if (!s) throw Object.assign(new Error('Skript gibt es nicht.'), { status: 404 }); return s; };

  function save(input, by) {
    const name = String(input.name || '').trim().slice(0, 60);
    const body = String(input.body || '').replace(/\r\n/g, '\n');
    if (!name) throw Object.assign(new Error('Name fehlt.'), { status: 400 });
    if (!body.trim()) throw Object.assign(new Error('Das Skript ist leer.'), { status: 400 });
    if (body.length > 64 * 1024) throw Object.assign(new Error('Das Skript ist zu lang (max. 64 KB).'), { status: 400 });
    const entry = { name, description: String(input.description || '').slice(0, 300), body, timeout: Math.max(5, Math.min(3600, Number(input.timeout) || 300)), updated: Date.now(), by };
    if (input.id) { const s = get(input.id); Object.assign(s, entry, { sample: false }); saveLib(); return s; }
    const s = { id: id(), ...entry };
    lib.push(s); saveLib(); return s;
  }

  function remove(sid) { get(sid); lib = lib.filter(x => x.id !== sid); saveLib(); }

  function record(run) {
    runs.unshift(run);
    if (runs.length > MAX_RUNS) runs.length = MAX_RUNS;
    saveRuns();
    return run;
  }
  const history = ({ script = null, limit = 50 } = {}) => runs.filter(r => !script || r.script === script).slice(0, limit).map(({ output, ...r }) => ({ ...r, preview: String(output || '').split('\n').filter(Boolean).slice(-1)[0] || '' }));
  const run1 = rid => { const r = runs.find(x => x.id === rid); if (!r) throw Object.assign(new Error('Lauf gibt es nicht.'), { status: 404 }); return r; };

  return { list, get, save, remove, record, history, run: run1, newId: id, touch: saveRuns };
}

module.exports = { createScripts, runBash, SAMPLES };
