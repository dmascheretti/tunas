// Utilità di interfaccia: escape, icone, toast, fogli modali, visore immagini.

export const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const svg = (d, extra = '') =>
  `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${d}</svg>`;

export const icon = {
  home: svg('<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>'),
  play: svg('<circle cx="12" cy="12" r="9"/><path d="M10 8l6 4-6 4z" fill="currentColor"/>'),
  book: svg('<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 19V5"/><path d="M9 7h6"/>'),
  image: svg('<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 17l-5-5-9 8"/>'),
  chart: svg('<path d="M4 20V10"/><path d="M10 20V4"/><path d="M16 20v-7"/><path d="M22 20H2"/>'),
  tool: svg('<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z"/>'),
  gear: svg('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'),
  plus: svg('<path d="M12 5v14M5 12h14"/>'),
  close: svg('<path d="M6 6l12 12M18 6L6 18"/>'),
  check: svg('<path d="M5 12l5 5 9-10"/>'),
  x: svg('<path d="M7 7l10 10M17 7L7 17"/>'),
  zoom: svg('<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3M11 8v6M8 11h6"/>'),
  back: svg('<path d="M15 18l-6-6 6-6"/>'),
  next: svg('<path d="M9 18l6-6-6-6"/>'),
  trash: svg('<path d="M4 7h16M10 11v6M14 11v6M5 7l1 13h12l1-13M9 7V4h6v3"/>'),
  edit: svg('<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M14 6l4 4"/>'),
  download: svg('<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>'),
  upload: svg('<path d="M12 20V9M7 14l5-5 5 5M5 4h14"/>'),
  link: svg('<path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/>'),
  camera: svg('<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>'),
  clock: svg('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
  scale: svg('<path d="M12 3v18M5 7h14M5 7l-3 7a3 3 0 0 0 6 0zM19 7l-3 7a3 3 0 0 0 6 0z"/>'),
  ruler: svg('<rect x="2" y="8" width="20" height="8" rx="1"/><path d="M6 8v3M10 8v4M14 8v3M18 8v4"/>'),
  search: svg('<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>'),
  fish: svg('<path d="M2 12c3-5 9-6 14-3l5-3-1 6 1 6-5-3c-5 3-11 2-14-3z"/><circle cx="7" cy="11" r="1" fill="currentColor"/>'),
  key: svg('<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M17 6l3 3"/>'),
  trophy: svg('<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/>'),
  info: svg('<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>'),
};

let toastTimer;
export function toast(msg, tone = 'info') {
  let el = $('#toast');
  el.textContent = msg;
  el.dataset.tone = tone;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2800);
}

export function vibrate(pattern) {
  if (window.__haptics && navigator.vibrate) {
    try {
      navigator.vibrate(pattern);
    } catch {
      /* ignorato */
    }
  }
}

/** Foglio modale (bottom sheet su telefono, dialog centrato su tablet). */
export function openSheet({ title, body, onMount, onClose, wide = false }) {
  const root = $('#sheet-root');
  const wrap = document.createElement('div');
  wrap.className = 'sheet-backdrop';
  wrap.innerHTML = `<div class="sheet ${wide ? 'wide' : ''}" role="dialog" aria-modal="true" aria-label="${esc(title)}">
    <header class="sheet-head"><h2>${esc(title)}</h2><button class="icon-btn" data-close aria-label="Chiudi">${icon.close}</button></header>
    <div class="sheet-body">${body}</div></div>`;
  root.appendChild(wrap);
  requestAnimationFrame(() => wrap.classList.add('open'));
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    onClose?.();
    wrap.classList.remove('open');
    document.removeEventListener('keydown', onKey);
    setTimeout(() => wrap.remove(), 220);
  };
  const onKey = (e) => e.key === 'Escape' && close();
  document.addEventListener('keydown', onKey);
  wrap.addEventListener('click', (e) => {
    if (e.target === wrap || e.target.closest('[data-close]')) close();
  });
  onMount?.(wrap.querySelector('.sheet'), close);
  return close;
}

export function confirmDialog(message, { ok = 'Conferma', danger = false } = {}) {
  return new Promise((resolve) => {
    let answer = false;
    openSheet({
      title: 'Conferma',
      body: `<p class="lead">${esc(message)}</p><div class="row end gap"><button class="btn ghost" data-close>Annulla</button><button class="btn ${danger ? 'danger' : 'primary'}" data-yes>${esc(ok)}</button></div>`,
      onMount: (el, close) => {
        el.querySelector('[data-yes]').onclick = () => { answer = true; close(); };
      },
      onClose: () => resolve(answer),
    });
  });
}

/** Visore a schermo intero con zoom (pinch, rotella, doppio tocco) e trascinamento. */
export function openViewer(innerHtml) {
  const el = document.createElement('div');
  el.className = 'viewer';
  el.innerHTML = `<div class="viewer-stage"><div class="viewer-content">${innerHtml}</div></div>
    <div class="viewer-bar"><span>Pizzica o doppio tocco per ingrandire</span><button class="icon-btn light" aria-label="Chiudi">${icon.close}</button></div>`;
  document.body.appendChild(el);
  const content = el.querySelector('.viewer-content');
  let scale = 1, tx = 0, ty = 0;
  const pointers = new Map();
  let startDist = 0, startScale = 1, last = null, lastTap = 0;
  const apply = () => { content.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`; };
  const stage = el.querySelector('.viewer-stage');
  stage.addEventListener('pointerdown', (e) => {
    stage.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      startDist = Math.hypot(a.x - b.x, a.y - b.y);
      startScale = scale;
    } else {
      last = { x: e.clientX, y: e.clientY };
      const now = Date.now();
      if (now - lastTap < 300) { scale = scale > 1 ? 1 : 2.5; if (scale === 1) { tx = 0; ty = 0; } apply(); }
      lastTap = now;
    }
  });
  stage.addEventListener('pointermove', (e) => {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      scale = Math.min(6, Math.max(1, (startScale * Math.hypot(a.x - b.x, a.y - b.y)) / startDist));
      apply();
    } else if (last && scale > 1) {
      tx += e.clientX - last.x; ty += e.clientY - last.y;
      last = { x: e.clientX, y: e.clientY };
      apply();
    }
  });
  const up = (e) => { pointers.delete(e.pointerId); last = null; };
  stage.addEventListener('pointerup', up);
  stage.addEventListener('pointercancel', up);
  stage.addEventListener('wheel', (e) => {
    e.preventDefault();
    scale = Math.min(6, Math.max(1, scale * (e.deltaY < 0 ? 1.15 : 0.87)));
    if (scale === 1) { tx = 0; ty = 0; }
    apply();
  }, { passive: false });
  const close = () => { el.remove(); document.removeEventListener('keydown', onKey); };
  const onKey = (e) => e.key === 'Escape' && close();
  document.addEventListener('keydown', onKey);
  el.querySelector('.viewer-bar button').onclick = close;
}

/** Ridimensiona un file immagine e lo restituisce come data URL JPEG. */
export function fileToDataUrl(file, max = 1600) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * k);
      c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL('image/jpeg', 0.86));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Immagine non leggibile')); };
    img.src = url;
  });
}

/** Prova a scaricare un'immagine remota per conservarla offline (richiede CORS). */
export async function urlToDataUrl(url, max = 1600) {
  const res = await fetch(url, { mode: 'cors' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const blob = await res.blob();
  if (!blob.type.startsWith('image/')) throw new Error('Il collegamento non è un\'immagine');
  return fileToDataUrl(blob, max);
}

export function download(filename, text) {
  const blob = new Blob([text], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}
