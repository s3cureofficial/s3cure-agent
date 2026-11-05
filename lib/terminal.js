// Web-Terminal: eine echte Shell (bash) auf dem Server, im Browser mit xterm.js angezeigt.
// Ohne zusätzliche native Pakete: „script“ (util-linux, auf Debian/Ubuntu immer da) stellt das
// Pseudoterminal bereit. Größe ändern über „stty -F /dev/pts/N“ (der Kernel schickt dann SIGWINCH).
// Ausgabe geht per Server-Sent Events an den Browser, Eingaben kommen per POST.
// Tastatureingaben werden nicht protokolliert – nur Öffnen und Schließen.
const fs = require('fs');
const crypto = require('crypto');
const { spawn, execFile } = require('child_process');

const MAX_SESSIONS = 4;
const SCROLLBACK = 128 * 1024; // so viel Ausgabe bekommt ein Browser beim (Wieder-)Verbinden
const IDLE_MS = 30 * 60 * 1000; // ohne verbundenen Browser nach 30 Minuten beenden

const dims = (cols, rows) => [Math.max(20, Math.min(400, Number(cols) || 80)), Math.max(5, Math.min(200, Number(rows) || 24))];

function createTerminals({ demo = false, onClose = () => {} } = {}) {
  const sessions = new Map();

  function open({ user, cols, rows }) {
    for (const s of sessions.values()) if (s.closed) sessions.delete(s.id);
    if (sessions.size >= MAX_SESSIONS) throw Object.assign(new Error(`Höchstens ${MAX_SESSIONS} Terminals gleichzeitig. Bitte ein anderes schließen.`), { status: 429 });
    const [c, r] = dims(cols, rows);
    const s = { id: crypto.randomBytes(12).toString('hex'), user, started: Date.now(), seen: Date.now(), buf: '', listeners: new Set(), closed: false, code: null, cols: c, rows: r };
    // Ausgabe kurz sammeln (8 ms) – viel weniger Nachrichten bei viel Text
    let pend = '', timer = null;
    const flushOut = () => { timer = null; const text = pend; pend = ''; if (text) for (const fn of s.listeners) fn({ data: text }); };
    const out = d => {
      const text = typeof d === 'string' ? d : d.toString('utf8');
      s.buf += text;
      if (s.buf.length > SCROLLBACK) s.buf = s.buf.slice(-SCROLLBACK);
      pend += text;
      if (!timer) timer = setTimeout(flushOut, 8);
    };
    const done = code => {
      if (s.closed) return;
      clearTimeout(timer); flushOut();
      s.closed = true; s.code = code;
      for (const fn of s.listeners) fn({ exit: code });
      clearInterval(s.idle);
      onClose(s);
    };
    s.pendLen = () => pend.length;
    if (demo) s.proc = demoShell(out, done);
    else {
      // stty setzt die Anfangsgröße, dann eine normale Login-Shell
      const p = spawn('script', ['-qfec', `stty rows ${r} cols ${c} 2>/dev/null; exec bash -l`, '/dev/null'], {
        cwd: process.env.HOME && fs.existsSync(process.env.HOME) ? process.env.HOME : '/root',
        env: { ...process.env, TERM: 'xterm-256color', COLORTERM: 'truecolor', LANG: process.env.LANG || 'C.UTF-8', S3CURE_TERMINAL: '1' },
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      p.stdout.on('data', out); p.stderr.on('data', out);
      p.on('error', e => { out(`\r\n${e.code === 'ENOENT' ? '„script“ fehlt auf dem Server (Paket bsdutils/util-linux).' : e.message}\r\n`); done(127); });
      p.on('close', code => done(code ?? 0));
      s.proc = { write: d => { try { p.stdin.write(d); } catch {} }, kill: () => { try { p.kill('SIGHUP'); } catch {} setTimeout(() => { try { p.kill('SIGKILL'); } catch {} }, 2000); }, pid: p.pid };
    }
    // Ohne Browser nicht ewig laufen lassen
    s.idle = setInterval(() => { if (!s.listeners.size && Date.now() - s.seen > IDLE_MS) close(s.id, user); }, 60000);
    sessions.set(s.id, s);
    return info(s);
  }

  const info = s => ({ id: s.id, user: s.user, started: s.started, closed: s.closed, cols: s.cols, rows: s.rows });

  function get(id, user) {
    const s = sessions.get(String(id));
    if (!s || s.user !== user) throw Object.assign(new Error('Terminal gibt es nicht (mehr).'), { status: 404 });
    s.seen = Date.now();
    return s;
  }

  function input(id, user, data) {
    const s = get(id, user);
    if (s.closed) throw Object.assign(new Error('Das Terminal ist beendet.'), { status: 410 });
    const d = String(data || '');
    if (d.length > 64 * 1024) throw Object.assign(new Error('Zu viel auf einmal.'), { status: 413 });
    s.proc.write(d);
  }

  async function resize(id, user, cols, rows) {
    const s = get(id, user);
    const [c, r] = dims(cols, rows);
    if (s.closed || (c === s.cols && r === s.rows)) return;
    s.cols = c; s.rows = r;
    if (demo || !s.proc.pid) return;
    const tty = ptyOf(s.proc.pid);
    if (tty) await new Promise(res => execFile('stty', ['-F', tty, 'rows', String(r), 'cols', String(c)], { timeout: 3000 }, () => res()));
  }

  // Das Pseudoterminal der Shell finden: Kind-Prozess von „script“, dessen Eingabe /dev/pts/N ist
  function ptyOf(pid) {
    try {
      const kids = fs.readFileSync(`/proc/${pid}/task/${pid}/children`, 'utf8').trim().split(/\s+/).filter(Boolean);
      for (const k of kids) { const t = fs.readlinkSync(`/proc/${k}/fd/0`); if (/^\/dev\/pts\/\d+$/.test(t)) return t; }
    } catch {}
    return null;
  }

  // Browser verbindet sich: bisherige Ausgabe, dann live weiter. Rückgabe: zum Abmelden
  function attach(id, user, fn) {
    const s = get(id, user);
    // bisherige Ausgabe (ohne den noch nicht verschickten Rest – der kommt gleich live)
    fn({ data: s.buf.slice(0, s.buf.length - s.pendLen()), replay: true });
    if (s.closed) { fn({ exit: s.code }); return () => {}; }
    s.listeners.add(fn);
    return () => { s.listeners.delete(fn); s.seen = Date.now(); };
  }

  function close(id, user) {
    const s = get(id, user);
    if (!s.closed) s.proc.kill();
    sessions.delete(s.id);
    return info(s);
  }

  const list = user => [...sessions.values()].filter(s => s.user === user && !s.closed).map(info);
  const stopAll = () => { for (const s of sessions.values()) { clearInterval(s.idle); if (!s.closed) s.proc.kill(); } sessions.clear(); };

  return { open, input, resize, attach, close, list, stopAll };
}

// Demo: kleine Spiel-Shell ohne echten Server
function demoShell(out, done) {
  let line = '';
  const prompt = () => out('\x1b[1;32mroot@s3cure\x1b[0m:\x1b[1;34m~\x1b[0m# ');
  setTimeout(() => { out('Willkommen auf s3cure (Demo-Terminal)\r\n\r\n'); prompt(); }, 50);
  const answers = {
    ls: 'backup.sh  notizen.txt', uptime: ' 03:14:15 up 21 days,  2 users,  load average: 0.12, 0.20, 0.18', whoami: 'root',
    'df -h': 'Filesystem  Size  Used Avail Use% Mounted on\r\n/dev/sda1    79G   12G   64G  16% /', hostname: 's3cure', date: new Date().toString(),
  };
  let closed = false;
  return {
    write(d) {
      if (closed) return;
      for (const ch of d) {
        if (ch === '\r') {
          out('\r\n');
          const cmd = line.trim(); line = '';
          if (cmd === 'exit') { closed = true; out('logout\r\n'); setTimeout(() => done(0), 50); return; }
          if (cmd) out((answers[cmd] ?? `${cmd.split(' ')[0]}: (Demo) nicht verfügbar`) + '\r\n');
          prompt();
        } else if (ch === '\x7f') { if (line) { line = line.slice(0, -1); out('\b \b'); } }
        else if (ch === '\x03') { line = ''; out('^C\r\n'); prompt(); }
        else if (ch >= ' ') { line += ch; out(ch); }
      }
    },
    kill() { if (!closed) { closed = true; setTimeout(() => done(0), 10); } },
    pid: null,
  };
}

module.exports = { createTerminals };
