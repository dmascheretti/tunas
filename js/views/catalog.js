import { state, setTitle } from '../app.js';
import { esc, icon, $, $$ } from '../ui.js';
import { SPECIES, TYPES, speciesById, typeById, weightFromLength } from '../species.js';
import { speciesPortrait } from '../fish.js';
import { fmtWeight } from '../scoring.js';

export function renderCatalog({ view }) {
  setTitle('Catalogo specie');
  let filter = 'tutte';
  let term = '';
  view.innerHTML = `
    <div class="toolbar">
      <div class="search grow">${icon.search}<input id="q" type="search" placeholder="Cerca specie, nome scientifico o inglese" autocomplete="off"></div>
      <div class="seg" id="types"><button class="on" data-t="tutte">Tutte</button>${TYPES.map((t) => `<button data-t="${t.id}">${esc(t.short)}</button>`).join('')}</div>
    </div>
    <div class="cards species-grid" id="grid"></div>
    <section class="card mt">
      <h3 class="section-title">Le tipologie</h3>
      <div class="type-list">${TYPES.map((t) => `<div><span class="tag type-${t.id}">${esc(t.name)}</span><p class="muted">${esc(t.desc)}</p></div>`).join('')}</div>
    </section>`;

  const draw = () => {
    const list = SPECIES.filter((s) => (filter === 'tutte' || s.type === filter) && (!term || `${s.name} ${s.sci} ${s.en}`.toLowerCase().includes(term)));
    $('#grid', view).innerHTML = list.length
      ? list.map((s) => `
        <a class="card link species-card" href="#/specie/${s.id}">
          <div class="portrait">${speciesPortrait(s.id)}</div>
          <h4>${esc(s.name)}</h4>
          <p class="sci">${esc(s.sci)}</p>
          <div class="row between"><span class="tag type-${s.type}">${esc(typeById(s.type).short)}</span><small class="muted">fino a ${fmtWeight(s.maxKg, state.settings.unit)}</small></div>
        </a>`).join('')
      : '<p class="empty">Nessuna specie trovata.</p>';
  };
  $('#q', view).addEventListener('input', (e) => { term = e.target.value.trim().toLowerCase(); draw(); });
  $$('#types button', view).forEach((b) => (b.onclick = () => {
    filter = b.dataset.t;
    $$('#types button', view).forEach((x) => x.classList.toggle('on', x === b));
    draw();
  }));
  draw();
}

function lwChart(sp, unit) {
  const [lo, hi] = sp.len;
  const W = 520, H = 240, P = { l: 52, r: 16, t: 14, b: 38 };
  const maxW = weightFromLength(sp, hi);
  const x = (L) => P.l + ((L - lo) / (hi - lo)) * (W - P.l - P.r);
  const y = (w) => H - P.b - (w / maxW) * (H - P.t - P.b);
  let d = '';
  for (let i = 0; i <= 40; i++) {
    const L = lo + ((hi - lo) * i) / 40;
    d += `${i ? 'L' : 'M'}${x(L).toFixed(1)},${y(weightFromLength(sp, L)).toFixed(1)}`;
  }
  const ticksX = [0, 0.25, 0.5, 0.75, 1].map((k) => Math.round(lo + (hi - lo) * k));
  const ticksY = [0, 0.5, 1].map((k) => maxW * k);
  return `<svg viewBox="0 0 ${W} ${H}" class="chart" role="img" aria-label="Curva lunghezza-peso">
    ${ticksY.map((w) => `<line x1="${P.l}" x2="${W - P.r}" y1="${y(w)}" y2="${y(w)}" class="grid"/><text x="${P.l - 8}" y="${y(w) + 4}" text-anchor="end" class="axis">${esc(fmtWeight(w, unit))}</text>`).join('')}
    ${ticksX.map((L) => `<text x="${x(L)}" y="${H - P.b + 20}" text-anchor="middle" class="axis">${L} cm</text>`).join('')}
    <path d="${d}" class="line"/>
    <circle id="lw-dot" r="6" class="dot" cx="${x((lo + hi) / 2)}" cy="${y(weightFromLength(sp, (lo + hi) / 2))}"/>
  </svg>`;
}

export function renderSpecies({ view, params }) {
  const sp = speciesById(params[0]);
  if (!sp) { view.innerHTML = '<p class="empty">Specie non trovata.</p>'; return; }
  const unit = state.settings.unit;
  setTitle(esc(sp.name), { back: '#/catalogo' });
  const mid = Math.round((sp.len[0] + sp.len[1]) / 2);
  const photos = state.photos.filter((p) => p.species === sp.id);
  view.innerHTML = `
  <article class="species-detail">
    <div class="card portrait-lg">${speciesPortrait(sp.id)}</div>
    <div class="detail-grid">
      <section class="card">
        <p class="sci big">${esc(sp.sci)}</p>
        <p class="muted">${esc(sp.en)}</p>
        <dl class="facts">
          <dt>Tipologia</dt><dd><span class="tag type-${sp.type}">${esc(typeById(sp.type).name)}</span></dd>
          <dt>Peso tipico</dt><dd>${esc(sp.typicalKg)} kg</dd>
          <dt>Peso massimo</dt><dd>${fmtWeight(sp.maxKg, unit)}</dd>
          <dt>Lunghezza comune</dt><dd>${sp.len[0]}–${sp.len[1]} cm</dd>
          <dt>Distribuzione</dt><dd>${esc(sp.area)}</dd>
        </dl>
      </section>
      <section class="card">
        <h3 class="section-title">Caratteri distintivi</h3>
        <ul class="checks">${sp.features.map((f) => `<li>${icon.check}<span>${esc(f)}</span></li>`).join('')}</ul>
      </section>
      <section class="card span2">
        <h3 class="section-title">Lunghezza → peso</h3>
        <div class="lw">
          ${lwChart(sp, unit)}
          <div class="lw-calc">
            <label class="field"><span>Lunghezza alla forca: <b id="len-out">${mid} cm</b></span>
            <input type="range" id="len" min="${sp.len[0]}" max="${sp.len[1]}" value="${mid}"></label>
            <p class="big-number" id="w-out">${fmtWeight(weightFromLength(sp, mid), unit)}</p>
            <p class="hint">W = ${sp.lw.a.toExponential(3)} × L<sup>${sp.lw.b}</sup> (valori indicativi da letteratura).</p>
          </div>
        </div>
      </section>
      ${photos.length ? `<section class="card span2"><h3 class="section-title">Le tue foto (${photos.length})</h3>
        <div class="photo-strip">${photos.map((p) => `<img src="${esc(p.data || p.url)}" alt="" loading="lazy" referrerpolicy="no-referrer">`).join('')}</div></section>` : ''}
    </div>
  </article>`;

  const slider = $('#len', view);
  const [lo, hi] = sp.len;
  const maxW = weightFromLength(sp, hi);
  slider.addEventListener('input', () => {
    const L = +slider.value;
    const w = weightFromLength(sp, L);
    $('#len-out', view).textContent = `${L} cm`;
    $('#w-out', view).textContent = fmtWeight(w, unit);
    const dot = $('#lw-dot', view);
    dot.setAttribute('cx', 52 + ((L - lo) / (hi - lo)) * (520 - 52 - 16));
    dot.setAttribute('cy', 240 - 38 - (w / maxW) * (240 - 14 - 38));
  });
}
