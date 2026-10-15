// TunaID – shell dell'applicazione, stato condiviso e instradamento.

import { db, loadSettings, saveSettings } from './db.js';
import { $, $$, icon } from './ui.js';
import { renderHome } from './views/home.js';
import { renderQuizSetup, renderQuizPlay } from './views/quiz.js';
import { renderCatalog, renderSpecies } from './views/catalog.js';
import { renderLibrary } from './views/library.js';
import { renderStats } from './views/stats.js';
import { renderTools } from './views/tools.js';
import { renderSettings } from './views/settings.js';

export const state = {
  settings: loadSettings(),
  photos: [],
  sessions: [],
  quiz: null,
};

export function updateSettings(patch) {
  Object.assign(state.settings, patch);
  saveSettings(state.settings);
  applyTheme();
}

export async function reloadData() {
  try {
    [state.photos, state.sessions] = await Promise.all([db.all('photos'), db.all('sessions')]);
    state.photos.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    state.sessions.sort((a, b) => b.date - a.date);
  } catch (err) {
    console.warn('Archivio locale non disponibile', err);
  }
}

function applyTheme() {
  const t = state.settings.theme;
  if (t === 'auto') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.dataset.theme = t;
  window.__haptics = !!state.settings.haptics;
}

const NAV = [
  { path: 'home', label: 'Home', icon: icon.home },
  { path: 'quiz', label: 'Quiz', icon: icon.play },
  { path: 'catalogo', label: 'Specie', icon: icon.book },
  { path: 'libreria', label: 'Foto', icon: icon.image },
  { path: 'statistiche', label: 'Statistiche', icon: icon.chart },
  { path: 'strumenti', label: 'Strumenti', icon: icon.tool, wideOnly: true },
];

function buildNav() {
  const items = NAV.map(
    (n) => `<a href="#/${n.path}" data-nav="${n.path}" class="${n.wideOnly ? 'wide-only' : ''}">${n.icon}<span>${n.label}</span></a>`,
  ).join('');
  $('#sidenav').innerHTML = `<div class="brand">${logo()}<div><strong>TunaID</strong><small>Identificazione tonni</small></div></div><nav>${items}<a href="#/impostazioni" data-nav="impostazioni">${icon.gear}<span>Impostazioni</span></a></nav><p class="side-foot">Funziona anche offline</p>`;
  $('#tabbar').innerHTML = NAV.filter((n) => !n.wideOnly).map(
    (n) => `<a href="#/${n.path}" data-nav="${n.path}">${n.icon}<span>${n.label}</span></a>`,
  ).join('');
}

export function logo(size = 34) {
  return `<svg class="logo" width="${size}" height="${size}" viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" rx="16" fill="var(--brand)"/><path d="M9 33c6-11 21-14 33-7l10-7-2 13 2 13-10-7c-12 7-27 4-33-5z" fill="#fff"/><circle cx="19" cy="31" r="2.6" fill="var(--brand)"/><path d="M30 24l4-6 3 7" fill="#f2c919"/></svg>`;
}

let cleanup = null;

export function setTitle(title, { back = null, actions = '' } = {}) {
  $('#topbar').innerHTML = `
    ${back ? `<a class="icon-btn" href="${back}" aria-label="Indietro">${icon.back}</a>` : `<span class="top-logo">${logo(30)}</span>`}
    <h1>${title}</h1>
    <div class="top-actions">${actions}<a class="icon-btn narrow-only" href="#/strumenti" aria-label="Strumenti">${icon.tool}</a><a class="icon-btn narrow-only" href="#/impostazioni" aria-label="Impostazioni">${icon.gear}</a></div>`;
  document.title = `${title.replace(/<[^>]+>/g, '')} · TunaID`;
}

export function onLeave(fn) {
  cleanup = fn;
}

export async function route() {
  if (cleanup) {
    try { cleanup(); } catch { /* ignorato */ }
    cleanup = null;
  }
  const raw = location.hash.replace(/^#\/?/, '') || 'home';
  const [hash, qs = ''] = raw.split('?');
  const [page, ...rest] = hash.split('/');
  const view = $('#view');
  view.scrollTop = 0;
  window.scrollTo(0, 0);
  $$('[data-nav]').forEach((a) => a.classList.toggle('active', a.dataset.nav === page || (page === 'specie' && a.dataset.nav === 'catalogo')));
  document.body.dataset.page = page;
  const ctx = { view, params: rest, query: new URLSearchParams(qs) };
  switch (page) {
    case 'quiz':
      if (rest[0] === 'gioca') return renderQuizPlay(ctx);
      return renderQuizSetup(ctx);
    case 'catalogo':
      return renderCatalog(ctx);
    case 'specie':
      return renderSpecies(ctx);
    case 'libreria':
      return renderLibrary(ctx);
    case 'statistiche':
      return renderStats(ctx);
    case 'strumenti':
      return renderTools(ctx);
    case 'impostazioni':
      return renderSettings(ctx);
    default:
      return renderHome(ctx);
  }
}

export function go(path) {
  if (location.hash === `#/${path}`) route();
  else location.hash = `#/${path}`;
}

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  window.__installPrompt = e;
});

async function start() {
  applyTheme();
  buildNav();
  await reloadData();
  window.addEventListener('hashchange', route);
  route();
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
}

start();
