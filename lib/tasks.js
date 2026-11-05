// Geplante Aufgaben: ein Skript aus der Bibliothek nach Zeitplan auf einem oder mehreren Servern ausführen.
// Zeitpläne: täglich (Uhrzeit), wöchentlich (Tag + Uhrzeit), stündlich (Minute), alle N Minuten.
// Gespeichert in tasks.json. Der Agent ruft tick() jede Minute auf.
const crypto = require('crypto');
const config = require('./config');

const bad = msg => Object.assign(new Error(msg), { status: 400 });
const TYPES = ['daily', 'weekly', 'hourly', 'interval'];

function cleanSchedule(s = {}) {
  const type = TYPES.includes(s.type) ? s.type : 'daily';
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(s.time || '03:00'));
  const hour = m ? Number(m[1]) : 3, minute = m ? Number(m[2]) : 0;
  if (hour > 23 || minute > 59) throw bad('Uhrzeit ungültig.');
  const out = { type, time: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}` };
  if (type === 'weekly') { out.day = Number(s.day); if (!(out.day >= 0 && out.day <= 6)) throw bad('Wochentag ungültig.'); }
  if (type === 'hourly') out.minute = Math.max(0, Math.min(59, Number(s.minute) || 0));
  if (type === 'interval') { out.every = Number(s.every); if (!(out.every >= 5 && out.every <= 1440)) throw bad('Intervall: 5–1440 Minuten.'); }
  return out;
}

// Ist die Aufgabe in dieser Minute dran?
function due(task, now = new Date()) {
  const s = task.schedule;
  const [h, m] = s.time.split(':').map(Number);
  const minuteKey = Math.floor(now.getTime() / 60000);
  if (task.lastMinute === minuteKey) return false; // in dieser Minute schon gelaufen
  switch (s.type) {
    case 'daily': return now.getHours() === h && now.getMinutes() === m;
    case 'weekly': return now.getDay() === s.day && now.getHours() === h && now.getMinutes() === m;
    case 'hourly': return now.getMinutes() === s.minute;
    case 'interval': return !task.lastRun || now.getTime() - task.lastRun >= s.every * 60000 - 1000;
    default: return false;
  }
}

function createTasks({ runScript, scriptExists }) {
  let list = config.readJson('tasks.json', []);
  const save = () => config.writeJson('tasks.json', list);
  const get = id => { const t = list.find(x => x.id === id); if (!t) throw Object.assign(new Error('Aufgabe gibt es nicht.'), { status: 404 }); return t; };

  function upsert(input, by) {
    const name = String(input.name || '').trim().slice(0, 60);
    if (!name) throw bad('Name fehlt.');
    if (!scriptExists(String(input.script || ''))) throw bad('Bitte ein Skript wählen.');
    const servers = [...new Set((Array.isArray(input.servers) ? input.servers : []).map(String))].filter(Boolean);
    if (!servers.length) throw bad('Mindestens ein Server.');
    const entry = { name, script: String(input.script), servers, schedule: cleanSchedule(input.schedule), enabled: input.enabled !== false, updated: Date.now(), by };
    if (input.id) { const t = get(input.id); Object.assign(t, entry); save(); return t; }
    if (list.length >= 100) throw bad('Höchstens 100 Aufgaben.');
    const t = { id: crypto.randomBytes(6).toString('hex'), ...entry, lastRun: null, lastStatus: null };
    list.push(t); save(); return t;
  }

  function remove(id) { get(id); list = list.filter(x => x.id !== id); save(); }

  async function runNow(id, by) {
    const t = get(id);
    t.lastRun = Date.now(); t.lastStatus = 'running'; save();
    const runs = await runScript(t.script, t.servers, by, t.id, done => { t.lastStatus = done.every(r => r.code === 0) ? 'ok' : 'fail'; save(); });
    return runs;
  }

  function tick(now = new Date()) {
    for (const t of list) {
      if (!t.enabled || !due(t, now)) continue;
      t.lastMinute = Math.floor(now.getTime() / 60000);
      runNow(t.id, 'Zeitplan').catch(() => { t.lastStatus = 'fail'; save(); });
    }
  }

  return { list: () => list.map(({ lastMinute, ...t }) => t), upsert, remove, runNow, tick };
}

module.exports = { createTasks, cleanSchedule, due };
