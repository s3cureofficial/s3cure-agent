// Datei-Browser: Ordner ansehen, Textdateien ansehen/bearbeiten, hoch- und herunterladen,
// Ordner anlegen, umbenennen, löschen. Der Agent läuft als root – darum nur für Admins mit
// frischem 2FA-Code (siehe server.js) und mit geschützten Systempfaden.
// Im Demo-Modus arbeitet alles in einem Spielordner im Datenverzeichnis.
const fs = require('fs');
const path = require('path');
const config = require('./config');

const MAX_TEXT = 1024 * 1024; // Vorschau/Bearbeiten bis 1 MB
// Diese Ordner selbst dürfen nie gelöscht oder umbenannt werden
const PROTECTED = new Set(['/', '/bin', '/boot', '/dev', '/etc', '/home', '/lib', '/lib32', '/lib64', '/libx32', '/media', '/mnt', '/opt', '/proc', '/root', '/run', '/sbin', '/srv', '/sys', '/tmp', '/usr', '/var', '/var/lib', '/var/log', '/etc/ssh', '/etc/systemd', '/usr/bin', '/usr/lib', '/usr/sbin']);
// Hier wird gar nichts geschrieben (Kernel-Dateisysteme)
const READ_ONLY = /^\/(proc|sys|dev)(\/|$)/;

const bad = (msg, status = 400) => Object.assign(new Error(msg), { status });

// Pfad prüfen und vereinheitlichen: absolut, ohne „..“-Tricks, keine Steuerzeichen
function clean(p) {
  const s = String(p || '');
  if (!s.startsWith('/')) throw bad('Pfad muss mit / beginnen.');
  if (/[\0\r\n]/.test(s) || s.length > 4096) throw bad('Ungültiger Pfad.');
  const n = path.posix.normalize(s);
  return n.length > 1 ? n.replace(/\/+$/, '') : n;
}
const validName = n => typeof n === 'string' && n.length > 0 && n.length <= 255 && !/[\/\0\r\n]/.test(n) && n !== '.' && n !== '..';

function modeString(st) {
  const t = st.isDirectory() ? 'd' : st.isSymbolicLink() ? 'l' : '-';
  const m = st.mode;
  const r = (b, c) => (m & b ? c : '-');
  return t + r(0o400, 'r') + r(0o200, 'w') + r(0o100, 'x') + r(0o40, 'r') + r(0o20, 'w') + r(0o10, 'x') + r(0o4, 'r') + r(0o2, 'w') + r(0o1, 'x');
}

function createFiles({ demo = false } = {}) {
  const root = demo ? config.file('demo-files') : '';
  if (demo && !fs.existsSync(root)) seedDemo(root);
  const real = v => (demo ? path.join(root, v) : v);

  // Benutzer- und Gruppennamen (für die Anzeige „root“, „www-data“ …)
  let names = null;
  const owner = uid => {
    if (demo) return uid === 0 ? 'root' : 'www-data';
    if (!names) {
      names = new Map();
      try { for (const l of fs.readFileSync('/etc/passwd', 'utf8').split('\n')) { const f = l.split(':'); if (f.length > 2) names.set(Number(f[2]), f[0]); } } catch {}
    }
    return names.get(uid) || String(uid);
  };

  const guardWrite = v => { if (READ_ONLY.test(v)) throw bad('Hier kann nichts geändert werden.'); };
  const guardProtected = v => { if (PROTECTED.has(v)) throw bad(`${v} ist ein Systemordner und geschützt.`); };

  function list(dir) {
    const v = clean(dir);
    let st;
    try { st = fs.statSync(real(v)); } catch { throw bad('Ordner gibt es nicht.', 404); }
    if (!st.isDirectory()) throw bad('Das ist kein Ordner.');
    let entries;
    try { entries = fs.readdirSync(real(v), { withFileTypes: true }); } catch (e) { throw bad(e.code === 'EACCES' ? 'Kein Zugriff.' : 'Ordner kann nicht gelesen werden.', 403); }
    const out = [];
    for (const e of entries.slice(0, 5000)) {
      let s, target = null, isDir = e.isDirectory();
      try {
        s = fs.lstatSync(path.join(real(v), e.name));
        if (s.isSymbolicLink()) { try { target = fs.readlinkSync(path.join(real(v), e.name)); isDir = fs.statSync(path.join(real(v), e.name)).isDirectory(); } catch {} }
      } catch { continue; }
      out.push({ name: e.name, dir: isDir, link: s.isSymbolicLink(), target, size: s.isFile() ? s.size : null, mtime: s.mtimeMs, mode: modeString(s), owner: owner(s.uid) });
    }
    out.sort((a, b) => (b.dir - a.dir) || a.name.localeCompare(b.name, 'de', { numeric: true }));
    return { path: v, parent: v === '/' ? null : path.posix.dirname(v), entries: out, truncated: entries.length > 5000 };
  }

  function stat(p) {
    const v = clean(p);
    try { return { v, st: fs.statSync(real(v)) }; } catch { throw bad('Datei gibt es nicht.', 404); }
  }

  // Textdatei lesen (für Vorschau und Bearbeiten)
  function read(p) {
    const { v, st } = stat(p);
    if (!st.isFile()) throw bad('Das ist keine Datei.');
    if (st.size > MAX_TEXT) return { path: v, size: st.size, tooBig: true };
    const buf = fs.readFileSync(real(v));
    if (buf.includes(0)) return { path: v, size: st.size, binary: true };
    return { path: v, size: st.size, mtime: st.mtimeMs, text: buf.toString('utf8') };
  }

  // Textdatei speichern. mtime: Stand beim Öffnen – hat jemand anderes die Datei inzwischen geändert, abbrechen.
  function write(p, text, mtime) {
    const v = clean(p);
    guardWrite(v);
    const t = String(text ?? '');
    if (Buffer.byteLength(t) > MAX_TEXT) throw bad('Zu groß zum Bearbeiten (max. 1 MB).');
    let st = null;
    try { st = fs.statSync(real(v)); } catch {}
    if (st && !st.isFile()) throw bad('Das ist keine Datei.');
    if (st && mtime && Math.abs(st.mtimeMs - Number(mtime)) > 1) throw bad('Die Datei wurde inzwischen geändert. Bitte neu öffnen.', 409);
    atomicWrite(real(v), Buffer.from(t, 'utf8'), st ? st.mode : 0o644, st);
    return { path: v, size: Buffer.byteLength(t), mtime: fs.statSync(real(v)).mtimeMs };
  }

  // Erst in eine Hilfsdatei schreiben, dann umbenennen – so ist die Datei nie halb geschrieben
  function atomicWrite(file, buf, mode, st) {
    const tmp = path.join(path.dirname(file), `.${path.basename(file)}.s3tmp-${process.pid}`);
    fs.writeFileSync(tmp, buf, { mode: mode & 0o7777 });
    if (st && !demo) { try { fs.chownSync(tmp, st.uid, st.gid); } catch {} }
    fs.renameSync(tmp, file);
  }

  function mkdir(dir, name) {
    const v = clean(dir);
    guardWrite(v);
    if (!validName(name)) throw bad('Ungültiger Name.');
    const target = path.posix.join(v, name);
    if (fs.existsSync(real(target))) throw bad('Gibt es schon.', 409);
    fs.mkdirSync(real(target), { mode: 0o755 });
    return { path: target };
  }

  function rename(p, name) {
    const v0 = clean(p);
    guardWrite(v0); guardProtected(v0);
    const { v } = lstatV(v0);
    if (!validName(name)) throw bad('Ungültiger Name.');
    const target = path.posix.join(path.posix.dirname(v), name);
    if (target === v) return { path: v };
    if (fs.existsSync(real(target))) throw bad('Eine Datei mit diesem Namen gibt es schon.', 409);
    fs.renameSync(real(v), real(target));
    return { path: target };
  }

  function lstatV(p) {
    const v = clean(p);
    try { return { v, st: fs.lstatSync(real(v)) }; } catch { throw bad('Datei gibt es nicht.', 404); }
  }

  function remove(p) {
    const v0 = clean(p);
    guardWrite(v0); guardProtected(v0);
    const { v, st } = lstatV(v0);
    if (st.isDirectory()) fs.rmSync(real(v), { recursive: true, force: false });
    else fs.unlinkSync(real(v));
    return { path: v, dir: st.isDirectory() };
  }

  // Zum Herunterladen: echter Pfad + Größe
  function openRead(p) {
    const { v, st } = stat(p);
    if (!st.isFile()) throw bad('Nur Dateien können heruntergeladen werden.');
    return { path: v, size: st.size, stream: () => fs.createReadStream(real(v)) };
  }

  // Hochladen: Ziel vorbereiten, die Daten schreibt server.js direkt aus der Anfrage
  function prepareUpload(dir, name, overwrite) {
    const v = clean(dir);
    guardWrite(v);
    if (!validName(name)) throw bad('Ungültiger Dateiname.');
    let st;
    try { st = fs.statSync(real(v)); } catch { throw bad('Ordner gibt es nicht.', 404); }
    if (!st.isDirectory()) throw bad('Das ist kein Ordner.');
    const target = path.posix.join(v, name);
    let old = null;
    try { old = fs.statSync(real(target)); } catch {}
    if (old && !overwrite) throw bad('Die Datei gibt es schon.', 409);
    if (old && !old.isFile()) throw bad('Dort liegt ein Ordner.', 409);
    const file = real(target);
    const tmp = path.join(path.dirname(file), `.${name}.s3up-${Date.now()}`);
    return {
      path: target, tmp,
      finish: () => { if (old && !demo) { try { fs.chownSync(tmp, old.uid, old.gid); fs.chmodSync(tmp, old.mode & 0o7777); } catch {} } fs.renameSync(tmp, file); return { path: target, size: fs.statSync(file).size }; },
      abort: () => { try { fs.unlinkSync(tmp); } catch {} },
    };
  }

  return { list, read, write, mkdir, rename, remove, openRead, prepareUpload, home: demo ? '/root' : (process.env.HOME && fs.existsSync(process.env.HOME) ? process.env.HOME : '/root') };
}

function seedDemo(root) {
  const w = (p, s) => { fs.mkdirSync(path.dirname(path.join(root, p)), { recursive: true }); fs.writeFileSync(path.join(root, p), s); };
  w('root/.bashrc', '# ~/.bashrc\nalias ll="ls -la"\nexport EDITOR=nano\n');
  w('root/notizen.txt', 'Backups laufen nachts um 3 Uhr.\nPostgres-Passwort liegt im Tresor.\n');
  w('root/backup.sh', '#!/bin/bash\nset -e\npg_dump app > /var/backups/app-$(date +%F).sql\n');
  w('etc/nginx/sites-available/s3cure.conf', 'server {\n  listen 80;\n  server_name s3cure.xyz;\n  location / { proxy_pass http://127.0.0.1:3000; }\n}\n');
  w('etc/hostname', 's3cure\n');
  w('var/log/syslog', 'Nov  5 03:00:01 s3cure CRON[1234]: (root) CMD (backup.sh)\n');
  w('var/www/html/index.html', '<h1>Hallo</h1>\n');
  fs.mkdirSync(path.join(root, 'home/deploy'), { recursive: true });
  fs.mkdirSync(path.join(root, 'tmp'), { recursive: true });
}

module.exports = { createFiles, clean, PROTECTED };
