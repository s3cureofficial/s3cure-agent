// 2FA-Code als 6 Kästchen. Jedes <input class="code"> wird automatisch umgebaut.
// Das echte Eingabefeld bleibt (unsichtbar) darüber liegen: Tippen, Einfügen und
// iPhone-Autofill („Code aus Nachricht“) funktionieren wie gewohnt, und der übrige Code
// liest/setzt weiter einfach input.value.
(() => {
  'use strict';
  const N = 6;
  const proto = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');

  function enhance(input) {
    if (input.dataset.otp) return;
    input.dataset.otp = '1';
    input.maxLength = N;
    input.setAttribute('inputmode', 'numeric');
    input.setAttribute('autocomplete', 'one-time-code');
    input.removeAttribute('placeholder');
    input.classList.add('otp-in');
    const wrap = document.createElement('div');
    wrap.className = 'otp';
    const boxes = document.createElement('div');
    boxes.className = 'otp-boxes';
    boxes.setAttribute('aria-hidden', 'true');
    const cells = Array.from({ length: N }, () => { const s = document.createElement('span'); boxes.appendChild(s); return s; });
    input.parentNode.insertBefore(wrap, input);
    wrap.appendChild(boxes);
    wrap.appendChild(input);

    const paint = () => {
      const v = proto.get.call(input);
      const focus = document.activeElement === input;
      cells.forEach((c, i) => {
        c.textContent = v[i] || '';
        c.classList.toggle('filled', i < v.length);
        c.classList.toggle('active', focus && i === Math.min(v.length, N - 1));
      });
      wrap.classList.toggle('full', v.length === N);
    };
    // Auch wenn der Code den Wert setzt (z. B. leeren nach falschem Code), Kästchen nachziehen
    Object.defineProperty(input, 'value', { configurable: true, get: () => proto.get.call(input), set: v => { proto.set.call(input, v); paint(); } });
    input.addEventListener('input', () => {
      const clean = proto.get.call(input).replace(/\D/g, '').slice(0, N);
      if (clean !== proto.get.call(input)) proto.set.call(input, clean);
      paint();
    });
    // Cursor immer ans Ende (Kästchen sind kein Textfeld mit Markierung)
    const toEnd = () => { const l = proto.get.call(input).length; try { input.setSelectionRange(l, l); } catch {} };
    input.addEventListener('focus', () => { toEnd(); paint(); });
    input.addEventListener('blur', paint);
    input.addEventListener('click', toEnd);
    input.addEventListener('keyup', toEnd);
    paint();
  }

  const scan = root => { if (root.querySelectorAll) for (const el of root.querySelectorAll('input.code')) enhance(el); };
  new MutationObserver(list => { for (const m of list) for (const n of m.addedNodes) if (n.nodeType === 1) { if (n.matches && n.matches('input.code')) enhance(n); else scan(n); } })
    .observe(document.documentElement, { childList: true, subtree: true });
  scan(document);
})();
