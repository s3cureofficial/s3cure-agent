// Web-Terminal: xterm.js im Browser, Shell auf dem Server.
// Ausgabe kommt per Server-Sent Events, Eingaben gehen gebündelt per POST.
// Vorher: Freischalten mit 2FA-Code (gilt 15 Minuten ab letzter Nutzung).
(() => {
  'use strict';
  const DE = /^de\b/i.test(navigator.language || '');
  const T = DE ? {
    connecting: 'Verbinde …', live: 'Verbunden', lost: 'Verbindung weg – verbinde neu …', ended: 'Beendet',
    unlockTitle: 'Terminal freischalten', unlockText: 'Das Terminal hat volle root-Rechte. Bitte gib einen frischen Code aus deiner Authenticator-App ein.',
    unlock: 'Freischalten', badCode: 'Der Code stimmt nicht.', endedTitle: 'Terminal beendet', endedText: 'Die Shell wurde geschlossen.',
    restart: 'Neues Terminal', closeAsk: 'Terminal beenden? Laufende Befehle werden abgebrochen.', paste: 'Einfügen', noAdmin: 'Nur für Admins.',
    pasteFail: 'Einfügen nicht erlaubt – bitte lange auf das Terminal tippen.',
  } : {
    connecting: 'Connecting …', live: 'Connected', lost: 'Connection lost – reconnecting …', ended: 'Ended',
    unlockTitle: 'Unlock terminal', unlockText: 'The terminal has full root access. Please enter a fresh code from your authenticator app.',
    unlock: 'Unlock', badCode: 'The code is not correct.', endedTitle: 'Terminal ended', endedText: 'The shell was closed.',
    restart: 'New terminal', closeAsk: 'End terminal? Running commands will be stopped.', paste: 'Paste', noAdmin: 'Admins only.',
    pasteFail: 'Paste not allowed – long-press the terminal instead.',
  };
  const $ = id => document.getElementById(id);
  document.documentElement.lang = DE ? 'de' : 'en';
  $('unlock-title').textContent = T.unlockTitle; $('unlock-text').textContent = T.unlockText; $('unlock-btn').textContent = T.unlock;
  $('ended-title').textContent = T.endedTitle; $('ended-text').textContent = T.endedText; $('restart').textContent = T.restart;
  $('paste').textContent = T.paste;

  const setState = (cls, text) => { $('state').className = cls; $('state-text').textContent = text; };

  async function api(method, url, body) {
    const res = await fetch(url, { method, credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-S3cure': '1' }, body: body ? JSON.stringify(body) : undefined });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401) { location.href = '/#/login'; throw new Error('login'); }
    if (!res.ok) throw Object.assign(new Error(data.error || 'Fehler ' + res.status), { status: res.status, unlock: !!data.unlock });
    return data;
  }

  // ---------- Terminal ----------
  const term = new window.Terminal({
    fontFamily: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace', fontSize: window.innerWidth < 500 ? 13 : 14, lineHeight: 1.15,
    cursorBlink: true, scrollback: 5000, allowProposedApi: false, macOptionIsMeta: true,
    theme: {
      background: '#0b0b0d', foreground: '#ededef', cursor: '#f0353f', cursorAccent: '#0b0b0d', selectionBackground: 'rgba(240,53,63,.35)',
      black: '#1f1f24', red: '#f0353f', green: '#22c55e', yellow: '#f59e0b', blue: '#60a5fa', magenta: '#c084fc', cyan: '#22d3ee', white: '#d4d4d8',
      brightBlack: '#55555e', brightRed: '#ff6b73', brightGreen: '#4ade80', brightYellow: '#fbbf24', brightBlue: '#93c5fd', brightMagenta: '#d8b4fe', brightCyan: '#67e8f9', brightWhite: '#ffffff',
    },
  });
  const fit = new window.FitAddon.FitAddon();
  term.loadAddon(fit);
  term.open($('term'));
  const doFit = () => { try { fit.fit(); } catch {} };
  doFit();

  let tid = null, es = null, ended = false, ctrl = false;

  // Eingaben bündeln und der Reihe nach schicken
  let pending = '', sending = false;
  async function flush() {
    if (sending || !pending || !tid) return;
    sending = true;
    const data = pending; pending = '';
    try { await api('POST', `/api/term/${tid}/input`, { data }); }
    catch (e) { if (e.unlock) showUnlock(); else if (e.status === 404 || e.status === 410) showEnded(); }
    finally { sending = false; if (pending) flush(); }
  }
  const send = d => {
    if (ended) return;
    if (ctrl && d.length === 1) { const c = d.toUpperCase().charCodeAt(0); if (c >= 64 && c <= 95) d = String.fromCharCode(c - 64); setCtrl(false); }
    pending += d; setTimeout(flush, 15);
  };
  term.onData(send);

  // Größe: an den sichtbaren Bereich anpassen (auch wenn die iPhone-Tastatur aufgeht)
  let rsTimer = null;
  const layout = () => {
    if (window.visualViewport) document.body.style.height = window.visualViewport.height + 'px';
    doFit();
    clearTimeout(rsTimer);
    rsTimer = setTimeout(() => { if (tid && !ended) api('POST', `/api/term/${tid}/resize`, { cols: term.cols, rows: term.rows }).catch(() => {}); }, 200);
  };
  window.addEventListener('resize', layout);
  if (window.visualViewport) window.visualViewport.addEventListener('resize', () => { layout(); window.scrollTo(0, 0); });

  // ---------- Verbindung ----------
  function connect() {
    if (es) es.close();
    setState('warn', T.connecting);
    es = new EventSource(`/api/term/${tid}/stream`);
    es.onopen = () => setState('ok', T.live);
    es.onmessage = ev => {
      const m = JSON.parse(ev.data);
      if (m.replay) { term.reset(); }
      if (m.data) term.write(m.data);
      if (m.exit != null) { es.close(); showEnded(); }
    };
    es.onerror = () => {
      if (ended) return;
      setState('warn', T.lost);
      // Prüfen, ob es das Terminal noch gibt bzw. ob die Freischaltung abgelaufen ist
      es.close();
      setTimeout(() => api('GET', '/api/term').then(list => { if (list.some(x => x.id === tid)) connect(); else showEnded(); }).catch(e => { if (e.unlock) showUnlock(); else setTimeout(connect, 3000); }), 1500);
    };
  }

  async function start(fresh) {
    ended = false;
    $('ended').hidden = true;
    try {
      const list = await api('GET', '/api/term');
      const keep = !fresh && sessionStorage.getItem('s3:term');
      const old = list.find(x => x.id === keep) || (!fresh && list[0]);
      tid = old ? old.id : (await api('POST', '/api/term', { cols: term.cols, rows: term.rows })).id;
      sessionStorage.setItem('s3:term', tid);
      connect();
      layout();
      term.focus();
    } catch (e) {
      if (e.unlock) return showUnlock();
      if (e.status === 403) { setState('bad', T.noAdmin); return; }
      setState('bad', e.message);
    }
  }

  function showUnlock() {
    if (es) es.close();
    setState('bad', '');
    $('unlock').hidden = false; $('unlock-err').hidden = true;
    $('code').value = ''; setTimeout(() => $('code').focus(), 50);
  }
  $('unlock-form').addEventListener('submit', async e => {
    e.preventDefault();
    const btn = $('unlock-btn'); btn.disabled = true;
    try { await api('POST', '/api/unlock', { code: $('code').value.trim() }); $('unlock').hidden = true; tid ? connect() : start(false); term.focus(); }
    catch (err) { $('unlock-err').textContent = err.status === 403 ? T.badCode : err.message; $('unlock-err').hidden = false; $('code').select(); }
    finally { btn.disabled = false; }
  });
  $('code').addEventListener('input', () => { if (/^\d{6}$/.test($('code').value)) $('unlock-form').requestSubmit(); });

  function showEnded() {
    ended = true; setState('', T.ended);
    sessionStorage.removeItem('s3:term');
    if (es) es.close();
    $('ended').hidden = false;
  }
  $('restart').addEventListener('click', () => { term.reset(); start(true); });

  $('close').addEventListener('click', async () => {
    if (!tid || ended) { location.href = $('back').href; return; }
    if (!confirm(T.closeAsk)) return;
    try { await api('POST', `/api/term/${tid}/close`); } catch {}
    sessionStorage.removeItem('s3:term');
    location.href = $('back').href;
  });

  // ---------- Sondertasten ----------
  const KEYS = { esc: '\x1b', tab: '\t', up: '\x1b[A', down: '\x1b[B', right: '\x1b[C', left: '\x1b[D', '^c': '\x03' };
  const setCtrl = on => { ctrl = on; $('ctrl').classList.toggle('on', on); };
  for (const b of document.querySelectorAll('.keys button')) {
    // Tastatur offen lassen: Fokus nicht vom Terminal wegnehmen
    b.addEventListener('pointerdown', e => e.preventDefault());
    b.addEventListener('click', async () => {
      const k = b.dataset.k;
      if (k === 'ctrl') { setCtrl(!ctrl); term.focus(); return; }
      if (k === 'paste') {
        try { const txt = await navigator.clipboard.readText(); if (txt) term.paste(txt); } catch { setState('warn', T.pasteFail); setTimeout(() => setState('ok', T.live), 2500); }
        term.focus(); return;
      }
      send(KEYS[k] ?? k);
      term.focus();
    });
  }

  start(false);
})();
