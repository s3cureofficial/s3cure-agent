// Benutzer, Anmeldung (Passwort + 2FA-Code), Sitzungen und Schutz vor Passwort-Raten.
// Rollen: admin (darf steuern und Benutzer verwalten), viewer (nur ansehen).
// Passwörter: scrypt mit Salz. Sitzungen: zufälliges Token im Cookie, gespeichert wird nur sein Hash.
const fs = require('fs');
const crypto = require('crypto');
const config = require('./config');
const totp = require('./totp');

const SCRYPT = { N: 1 << 15, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
const SESSION_DAYS = 30;
const IDLE_DAYS = 14;
const MAX_FAILS_IP = 5;      // je IP in 15 Minuten
const MAX_FAILS_USER = 10;   // je Benutzer in 15 Minuten
const WINDOW = 15 * 60 * 1000;
const NAME_RE = /^[a-z0-9][a-z0-9._-]{1,31}$/;

// Fehler mit HTTP-Status (für die API)
class AuthError extends Error { constructor(status, msg) { super(msg); this.status = status; } }

const sha = s => crypto.createHash('sha256').update(s).digest('hex');
const hashPassword = (password, salt = crypto.randomBytes(16)) =>
  new Promise((resolve, reject) => crypto.scrypt(String(password), salt, 64, SCRYPT, (err, key) => (err ? reject(err) : resolve({ salt: salt.toString('base64'), hash: key.toString('base64') }))));

function createAuth({ now = () => Date.now() } = {}) {
  let users = config.readJson('users.json', {});
  let sessions = config.readJson('sessions.json', {});
  const fails = new Map(); // "ip:<ip>" / "user:<name>" -> [Zeitpunkte]

  // Die Kommandozeile (s3cure-agent user …) ändert die Dateien, während der Dienst läuft.
  // Darum vor jeder Prüfung schauen, ob sie sich geändert haben, und dann neu lesen.
  const mtimes = { users: 0, sessions: 0 };
  const mtime = name => { try { return fs.statSync(config.file(name)).mtimeMs; } catch { return 0; } };
  function fresh() {
    const u = mtime('users.json'), se = mtime('sessions.json');
    if (u !== mtimes.users) { users = config.readJson('users.json', {}); mtimes.users = u; }
    if (se !== mtimes.sessions) { sessions = config.readJson('sessions.json', {}); mtimes.sessions = se; }
  }
  const saveUsers = () => { config.writeJson('users.json', users); mtimes.users = mtime('users.json'); };
  const saveSessions = () => { config.writeJson('sessions.json', sessions); mtimes.sessions = mtime('sessions.json'); };

  function failCount(key) {
    const list = (fails.get(key) || []).filter(t => now() - t < WINDOW);
    fails.set(key, list);
    return list.length;
  }
  const addFail = key => fails.set(key, [...(fails.get(key) || []), now()]);

  // ---------- Benutzer ----------
  async function addUser(name, password, role = 'viewer') {
    fresh();
    const n = String(name || '').toLowerCase();
    if (!NAME_RE.test(n)) throw new Error('Benutzername: 2–32 Zeichen, nur a–z, 0–9, Punkt, Strich, Unterstrich.');
    if (users[n]) throw new Error(`Benutzer „${n}“ gibt es schon.`);
    if (String(password || '').length < 10) throw new Error('Passwort: mindestens 10 Zeichen.');
    if (!['admin', 'viewer'].includes(role)) throw new Error('Rolle: admin oder viewer.');
    const pw = await hashPassword(password);
    const secret = totp.newSecret();
    users[n] = { ...pw, role, totp: secret, lastStep: -1, created: now() };
    saveUsers();
    return { name: n, secret, uri: totp.uri(secret, `${n}@${config.load().name}`) };
  }

  function removeUser(name) {
    fresh();
    const n = String(name).toLowerCase();
    if (!users[n]) throw new Error(`Benutzer „${n}“ gibt es nicht.`);
    delete users[n];
    saveUsers();
    for (const [k, s] of Object.entries(sessions)) if (s.user === n) delete sessions[k];
    saveSessions();
  }

  async function setPassword(name, password) {
    fresh();
    const n = String(name).toLowerCase();
    if (!users[n]) throw new Error(`Benutzer „${n}“ gibt es nicht.`);
    if (String(password || '').length < 10) throw new Error('Passwort: mindestens 10 Zeichen.');
    Object.assign(users[n], await hashPassword(password));
    saveUsers();
    logoutAll(n);
  }

  function resetTotp(name) {
    fresh();
    const n = String(name).toLowerCase();
    if (!users[n]) throw new Error(`Benutzer „${n}“ gibt es nicht.`);
    users[n].totp = totp.newSecret();
    users[n].lastStep = -1;
    saveUsers();
    logoutAll(n);
    return { name: n, secret: users[n].totp, uri: totp.uri(users[n].totp, `${n}@${config.load().name}`) };
  }

  const listUsers = () => (fresh(), Object.entries(users)).map(([name, u]) => ({ name, role: u.role, created: u.created, lastLogin: u.lastLogin || null }));

  // ---------- Anmelden ----------
  // Prüft immer alles (auch bei unbekanntem Namen), damit man an der Dauer nichts ablesen kann
  async function login({ user, password, code, ip = '?', ua = '' }) {
    fresh();
    const n = String(user || '').toLowerCase();
    if (failCount('ip:' + ip) >= MAX_FAILS_IP || failCount('user:' + n) >= MAX_FAILS_USER) {
      return { ok: false, locked: true };
    }
    const u = users[n];
    const salt = u ? Buffer.from(u.salt, 'base64') : crypto.randomBytes(16);
    const { hash } = await hashPassword(password, salt);
    const pwOk = !!u && crypto.timingSafeEqual(Buffer.from(hash, 'base64'), Buffer.from(u.hash, 'base64'));
    const usedStep = u ? totp.verify(u.totp, code, { time: now(), lastStep: u.lastStep }) : null;
    if (!pwOk || usedStep == null) {
      addFail('ip:' + ip); addFail('user:' + n);
      return { ok: false };
    }
    fails.delete('user:' + n);
    u.lastStep = usedStep;
    u.lastLogin = now();
    saveUsers();
    const token = crypto.randomBytes(32).toString('base64url');
    sessions[sha(token)] = { user: n, created: now(), seen: now(), ip, ua: String(ua).slice(0, 200) };
    pruneSessions();
    saveSessions();
    return { ok: true, token, user: n, role: u.role };
  }

  // Zweiter Code für heikle Aktionen (z. B. Server neu starten)
  function confirmCode(name, code) {
    fresh();
    const u = users[name];
    if (!u) return false;
    const s = totp.verify(u.totp, code, { time: now(), lastStep: u.lastStep });
    if (s == null) { addFail('user:' + name); return false; }
    u.lastStep = s;
    saveUsers();
    return true;
  }

  function pruneSessions() {
    const t = now();
    for (const [k, s] of Object.entries(sessions)) {
      if (!users[s.user] || t - s.created > SESSION_DAYS * 864e5 || t - s.seen > IDLE_DAYS * 864e5) delete sessions[k];
    }
  }

  // Sitzung zum Token (oder null). Aktualisiert „zuletzt gesehen“ höchstens einmal pro Minute auf der Platte.
  function session(token) {
    if (!token) return null;
    fresh();
    const key = sha(token);
    const s = sessions[key];
    if (!s) return null;
    const t = now();
    if (!users[s.user] || t - s.created > SESSION_DAYS * 864e5 || t - s.seen > IDLE_DAYS * 864e5) { delete sessions[key]; saveSessions(); return null; }
    if (t - s.seen > 60000) { s.seen = t; saveSessions(); }
    return { user: s.user, role: users[s.user].role, key };
  }

  function logout(token) { delete sessions[sha(String(token || ''))]; saveSessions(); }
  function logoutAll(name) { for (const [k, s] of Object.entries(sessions)) if (s.user === name) delete sessions[k]; saveSessions(); }

  // ---------- Eigenes Konto (aus der App) ----------
  async function verifyPassword(name, password) {
    const u = users[name];
    if (!u) return false;
    const { hash } = await hashPassword(password, Buffer.from(u.salt, 'base64'));
    return crypto.timingSafeEqual(Buffer.from(hash, 'base64'), Buffer.from(u.hash, 'base64'));
  }

  // Andere Sitzungen des Benutzers beenden, die eigene (keepKey) bleibt
  function logoutOthers(name, keepKey) {
    for (const [k, s] of Object.entries(sessions)) if (s.user === name && k !== keepKey) delete sessions[k];
    saveSessions();
  }

  async function changePassword(name, current, next, code, keepKey) {
    fresh();
    if (failCount('user:' + name) >= MAX_FAILS_USER) throw new AuthError(429, 'Zu viele Fehlversuche. Bitte 15 Minuten warten.');
    if (!(await verifyPassword(name, current))) { addFail('user:' + name); throw new AuthError(403, 'Das aktuelle Passwort stimmt nicht.'); }
    if (String(next || '').length < 10) throw new AuthError(400, 'Das neue Passwort braucht mindestens 10 Zeichen.');
    if (!confirmCode(name, code)) throw new AuthError(403, 'Der 2FA-Code stimmt nicht.');
    Object.assign(users[name], await hashPassword(next));
    saveUsers();
    logoutOthers(name, keepKey);
  }

  // 2FA auf ein neues Handy: neuen Schlüssel erst merken, erst nach richtigem Code damit umstellen
  const pendingTotp = new Map(); // Benutzer -> { secret, until }
  function startTotp(name) {
    const secret = totp.newSecret();
    pendingTotp.set(name, { secret, until: now() + 10 * 60000 });
    return { secret, uri: totp.uri(secret, `${name}@${config.load().name}`) };
  }
  function confirmTotp(name, code, keepKey) {
    fresh();
    const p = pendingTotp.get(name);
    if (!p || p.until < now()) throw new AuthError(400, 'Die Einrichtung ist abgelaufen. Bitte neu starten.');
    const step = totp.verify(p.secret, code, { time: now() });
    if (step == null) { addFail('user:' + name); throw new AuthError(403, 'Der Code stimmt nicht – kommt er aus dem neuen Eintrag?'); }
    users[name].totp = p.secret;
    users[name].lastStep = step;
    pendingTotp.delete(name);
    saveUsers();
    logoutOthers(name, keepKey);
  }

  function sessionsOf(name, currentKey) {
    fresh(); pruneSessions();
    return Object.entries(sessions).filter(([, s]) => s.user === name)
      .map(([k, s]) => ({ id: k.slice(0, 16), current: k === currentKey, ua: s.ua, ip: s.ip, created: s.created, seen: s.seen }))
      .sort((a, b) => (b.current - a.current) || b.seen - a.seen);
  }
  // id: Anfang des Sitzungs-Schlüssels oder 'others' (alle anderen)
  function revoke(name, id, currentKey) {
    for (const [k, s] of Object.entries(sessions)) {
      if (s.user === name && k !== currentKey && (id === 'others' || (String(id).length >= 8 && k.startsWith(String(id))))) delete sessions[k];
    }
    saveSessions();
  }

  // ---------- Benutzer verwalten (Admin) ----------
  const adminCount = () => Object.values(users).filter(u => u.role === 'admin').length;
  function setRole(name, role) {
    fresh();
    const n = String(name).toLowerCase();
    if (!users[n]) throw new AuthError(404, `Benutzer „${n}“ gibt es nicht.`);
    if (!['admin', 'viewer'].includes(role)) throw new AuthError(400, 'Rolle: admin oder viewer.');
    if (users[n].role === 'admin' && role !== 'admin' && adminCount() <= 1) throw new AuthError(400, 'Es muss mindestens einen Admin geben.');
    users[n].role = role;
    saveUsers();
  }
  function canRemove(name) {
    fresh();
    const u = users[String(name).toLowerCase()];
    if (!u) throw new AuthError(404, 'Benutzer gibt es nicht.');
    if (u.role === 'admin' && adminCount() <= 1) throw new AuthError(400, 'Der letzte Admin kann nicht gelöscht werden.');
  }

  const reload = () => { mtimes.users = mtimes.sessions = -1; fresh(); };

  return { addUser, removeUser, setPassword, resetTotp, listUsers, login, confirmCode, session, logout, logoutAll, reload,
    changePassword, startTotp, confirmTotp, sessionsOf, revoke, setRole, canRemove, hasUsers: () => (fresh(), Object.keys(users).length > 0) };
}

module.exports = { createAuth, hashPassword, NAME_RE, AuthError };
