import { state, setTitle, onLeave, go, updateSettings, reloadData } from '../app.js';
import { esc, icon, $, $$, toast, vibrate, openViewer, confirmDialog } from '../ui.js';
import { SPECIES, TYPES, speciesById, typeById, weightFromLength } from '../species.js';
import { makeSpecimen, specimenSvg } from '../fish.js';
import { scoreAnswer, grade, fmtWeight, toUnit, fromUnit } from '../scoring.js';
import { db, uid } from '../db.js';

export const LEVELS = {
  base: { label: 'Base', desc: '8 specie comuni nel Mediterraneo e sui mercati', ids: ['thynnus', 'albacares', 'obesus', 'alalunga', 'pelamis', 'alletteratus', 'rochei', 'sarda'] },
  esperto: { label: 'Esperto', desc: 'Tutte le 13 specie, incluse quelle molto simili', ids: SPECIES.map((s) => s.id) },
};

const MODES = {
  allenamento: { label: 'Allenamento', desc: 'Correzione immediata, senza limiti', icon: icon.fish },
  esame: { label: 'Esame', desc: 'Domande a tempo, voto finale', icon: icon.trophy },
  rapido: { label: 'Riconoscimento rapido', desc: 'Solo specie, 15 secondi', icon: icon.clock },
};

const SOURCES = { tutte: 'Illustrazioni + foto', illustrazioni: 'Solo illustrazioni', foto: 'Solo foto della libreria' };

/* ---------------------------- Impostazione ---------------------------- */

export function renderQuizSetup({ view, query }) {
  setTitle('Nuovo quiz');
  const st = state.settings;
  const cfg = {
    mode: MODES[query.get('mode')] ? query.get('mode') : 'allenamento',
    level: st.level,
    source: st.source,
    count: st.examLength,
    timer: st.examTimer,
    ruler: st.showRuler,
  };

  const draw = () => {
    const photoCount = state.photos.length;
    view.innerHTML = `
    <div class="setup">
      <section class="card">
        <h3 class="section-title">Modalità</h3>
        <div class="choice-grid" role="radiogroup">
          ${Object.entries(MODES).map(([k, m]) => `
            <button type="button" class="choice ${cfg.mode === k ? 'on' : ''}" data-mode="${k}" role="radio" aria-checked="${cfg.mode === k}">
              ${m.icon}<strong>${m.label}</strong><small>${m.desc}</small></button>`).join('')}
        </div>
      </section>
      <section class="card">
        <h3 class="section-title">Livello</h3>
        <div class="choice-grid two" role="radiogroup">
          ${Object.entries(LEVELS).map(([k, l]) => `
            <button type="button" class="choice ${cfg.level === k ? 'on' : ''}" data-level="${k}" role="radio" aria-checked="${cfg.level === k}">
              <strong>${l.label}</strong><small>${l.desc}</small></button>`).join('')}
        </div>
        <h3 class="section-title mt">Immagini</h3>
        <div class="seg" role="radiogroup">
          ${Object.entries(SOURCES).map(([k, l]) => `<button type="button" class="${cfg.source === k ? 'on' : ''}" data-source="${k}">${l}</button>`).join('')}
        </div>
        <p class="hint">${photoCount ? `${photoCount} foto disponibili in libreria.` : 'La libreria foto è vuota: verranno usate le illustrazioni. <a href="#/libreria">Aggiungi foto</a>.'}</p>
      </section>
      <section class="card">
        <h3 class="section-title">Opzioni</h3>
        ${cfg.mode === 'esame' ? `
        <label class="field"><span>Numero di domande</span>
          <select id="count">${[5, 10, 15, 20, 30].map((n) => `<option ${n === cfg.count ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
        <label class="field"><span>Tempo per domanda</span>
          <select id="timer">${[[0, 'Nessun limite'], [30, '30 secondi'], [60, '60 secondi'], [90, '90 secondi'], [120, '2 minuti']].map(([v, l]) => `<option value="${v}" ${v === cfg.timer ? 'selected' : ''}>${l}</option>`).join('')}</select></label>` : ''}
        ${cfg.mode !== 'rapido' ? `
        <label class="switch"><input type="checkbox" id="ruler" ${cfg.ruler ? 'checked' : ''}><span></span>Mostra il metro graduato nelle illustrazioni</label>` : '<p class="muted">20 immagini, 15 secondi ciascuna. Conta solo la specie.</p>'}
        <p class="hint">Punteggio: specie 50 · peso 30 (pieno entro ±${st.tolerance}%) · tipologia 20.</p>
      </section>
      <div class="sticky-cta"><button class="btn primary lg block" id="start">${icon.play}<span>Inizia ${MODES[cfg.mode].label.toLowerCase()}</span></button></div>
    </div>`;

    $$('[data-mode]', view).forEach((b) => (b.onclick = () => { cfg.mode = b.dataset.mode; draw(); }));
    $$('[data-level]', view).forEach((b) => (b.onclick = () => { cfg.level = b.dataset.level; draw(); }));
    $$('[data-source]', view).forEach((b) => (b.onclick = () => {
      if (b.dataset.source === 'foto' && !state.photos.length) { toast('Aggiungi prima delle foto in libreria', 'warn'); return; }
      cfg.source = b.dataset.source; draw();
    }));
    $('#count', view)?.addEventListener('change', (e) => (cfg.count = +e.target.value));
    $('#timer', view)?.addEventListener('change', (e) => (cfg.timer = +e.target.value));
    $('#ruler', view)?.addEventListener('change', (e) => (cfg.ruler = e.target.checked));
    $('#start', view).onclick = () => {
      updateSettings({ level: cfg.level, source: cfg.source, examLength: cfg.count, examTimer: cfg.timer, showRuler: cfg.ruler });
      state.quiz = createQuiz(cfg);
      go('quiz/gioca');
    };
  };
  draw();
}

/* ------------------------------ Motore ------------------------------ */

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function createQuiz(cfg) {
  const ids = LEVELS[cfg.level].ids;
  let photos = cfg.source === 'illustrazioni' ? [] : state.photos.filter((p) => speciesById(p.species));
  if (cfg.source === 'foto' && !photos.length) cfg.source = 'tutte';
  const options = new Set(ids);
  photos.forEach((p) => options.add(p.species));
  const total = cfg.mode === 'esame' ? cfg.count : cfg.mode === 'rapido' ? 20 : Infinity;
  const q = {
    id: uid(),
    mode: cfg.mode,
    level: cfg.level,
    source: cfg.source,
    ruler: cfg.mode === 'rapido' ? true : cfg.ruler,
    timer: cfg.mode === 'rapido' ? 15 : cfg.mode === 'esame' ? cfg.timer : 0,
    ask: cfg.mode === 'rapido' ? { species: true, weight: false, type: false } : { species: true, weight: true, type: true },
    options: SPECIES.filter((s) => options.has(s.id)).map((s) => s.id),
    total,
    index: 0,
    items: [],
    answers: [],
    points: 0,
    max: 0,
    startedAt: Date.now(),
    done: false,
    photoBag: [],
    speciesBag: [],
    photos,
    ids,
  };
  return q;
}

function nextItem(q) {
  const usePhoto = q.photos.length && (q.source === 'foto' || Math.random() < 0.45);
  if (usePhoto) {
    if (!q.photoBag.length) q.photoBag = shuffle([...q.photos]);
    const p = q.photoBag.pop();
    return {
      kind: 'photo',
      photoId: p.id,
      src: p.data || p.url,
      species: p.species,
      type: p.type || speciesById(p.species).type,
      weightKg: p.weightKg > 0 ? p.weightKg : null,
      lengthCm: p.lengthCm || null,
      credit: p.credit || '',
    };
  }
  if (!q.speciesBag.length) q.speciesBag = shuffle([...q.ids]);
  const sid = q.speciesBag.pop();
  const spec = makeSpecimen(sid, Math.floor(Math.random() * 2 ** 31));
  return { kind: 'sim', ...spec, type: speciesById(sid).type };
}

function itemMedia(item, ruler = true) {
  if (item.kind === 'sim') return specimenSvg(item, { showRuler: ruler });
  return `<img src="${esc(item.src)}" alt="Tonno da identificare" referrerpolicy="no-referrer" />`;
}

export function itemThumb(item) {
  if (item.kind === 'sim') return specimenSvg(item, { showRuler: false });
  const p = state.photos.find((x) => x.id === item.photoId);
  const src = p ? p.data || p.url : item.src;
  return src ? `<img src="${esc(src)}" alt="" loading="lazy" referrerpolicy="no-referrer"/>` : icon.image;
}

/* ------------------------------ Gioco ------------------------------ */

export function renderQuizPlay({ view }) {
  const q = state.quiz;
  if (!q) return go('quiz');
  if (q.done) return renderResults(view, q);

  let timerId = null;
  onLeave(() => clearInterval(timerId));

  if (!q.items[q.index]) q.items[q.index] = nextItem(q);
  const item = q.items[q.index];
  const unit = state.settings.unit;
  const answer = { species: null, type: null, weightKg: null };

  const finite = Number.isFinite(q.total);
  const progress = finite ? (q.index / q.total) * 100 : 0;
  setTitle(MODES[q.mode].label, {
    actions: `<button class="btn ghost sm" id="quit">${finite ? 'Esci' : 'Termina'}</button>`,
  });

  const maxKg = Math.max(...q.options.map((id) => speciesById(id).maxKg));
  const minKg = 0.1;
  const toPos = (kg) => (Math.log(kg / minKg) / Math.log(maxKg / minKg)) * 1000;
  const fromPos = (p) => minKg * Math.pow(maxKg / minKg, p / 1000);

  view.innerHTML = `
  <div class="quiz">
    <div class="quiz-status">
      <div class="progress"><span style="width:${progress}%"></span></div>
      <div class="row between">
        <span class="pill">${finite ? `Domanda ${q.index + 1} di ${q.total}` : `Domanda ${q.index + 1}`}</span>
        ${q.timer ? `<span class="pill timer" id="timer">${icon.clock}<b>${q.timer}</b>s</span>` : ''}
        <span class="pill score">${q.max ? Math.round((q.points / q.max) * 100) : 0}% · ${q.points} pt</span>
      </div>
    </div>
    <div class="quiz-grid">
      <figure class="stage ${item.kind}">
        <div class="media" id="media">${itemMedia(item, q.ruler)}</div>
        <button class="icon-btn zoom" id="zoom" aria-label="Ingrandisci">${icon.zoom}</button>
        <figcaption>${item.kind === 'photo' ? `Foto${item.credit ? ` · ${esc(item.credit)}` : ''}` : q.ruler ? 'Illustrazione con metro: lo zero è allineato al muso, misura fino alla forca della coda' : 'Illustrazione senza riferimento metrico'}</figcaption>
      </figure>
      <div class="answers" id="answers">
        <fieldset class="block" id="f-species">
          <legend><span class="num">1</span>Specie</legend>
          ${q.options.length > 8 ? `<div class="search">${icon.search}<input id="sp-search" type="search" placeholder="Cerca per nome..." autocomplete="off"></div>` : ''}
          <div class="opt-grid" id="sp-list">
            ${q.options.map((id) => { const s = speciesById(id); return `<button type="button" class="opt" data-sp="${id}" data-q="${esc((s.name + ' ' + s.sci + ' ' + s.en).toLowerCase())}"><strong>${esc(s.name)}</strong><small>${esc(s.sci)}</small></button>`; }).join('')}
          </div>
        </fieldset>
        ${q.ask.weight ? `
        <fieldset class="block" id="f-weight">
          <legend><span class="num">2</span>Peso stimato ${item.weightKg ? '' : '<em class="muted">(non valutato per questa foto)</em>'}</legend>
          <div class="weight-row">
            <button type="button" class="icon-btn round" data-step="-1" aria-label="Diminuisci">−</button>
            <label class="weight-input"><input id="w-num" type="number" inputmode="decimal" min="0" step="0.1" placeholder="0"><span>${unit}</span></label>
            <button type="button" class="icon-btn round" data-step="1" aria-label="Aumenta">+</button>
          </div>
          <input id="w-range" type="range" min="0" max="1000" value="500" aria-label="Peso (scala logaritmica)">
          <div class="range-labels"><span>${fmtWeight(minKg, unit)}</span><span>${fmtWeight(maxKg, unit)}</span></div>
          ${q.mode === 'allenamento' && item.kind === 'sim' && q.ruler ? `
          <details class="helper"><summary>${icon.ruler} Aiuto: stima dal metro</summary>
            <div class="row gap wrap"><label class="field inline"><span>Lunghezza alla forca</span><input id="len" type="number" inputmode="decimal" placeholder="cm"></label>
            <button type="button" class="btn ghost sm" id="calc">Calcola peso</button></div>
            <p class="hint">Usa la relazione lunghezza-peso della specie selezionata.</p>
          </details>` : ''}
        </fieldset>` : ''}
        ${q.ask.type ? `
        <fieldset class="block" id="f-type">
          <legend><span class="num">3</span>Tipologia</legend>
          <div class="type-choices">
            ${TYPES.map((t) => `<button type="button" class="opt" data-type="${t.id}"><strong>${esc(t.name)}</strong><small>${esc(t.desc.split(':')[0].split('(')[0].trim())}</small></button>`).join('')}
          </div>
        </fieldset>` : ''}
        <div class="sticky-cta"><button class="btn primary lg block" id="submit" ${q.mode === 'rapido' ? 'hidden' : ''}>Conferma risposta</button></div>
      </div>
    </div>
  </div>`;

  // Immagine non disponibile
  const img = $('#media img', view);
  if (img) {
    img.onerror = () => {
      $('#media', view).innerHTML = `<div class="img-error">${icon.image}<p>Immagine non disponibile (collegamento non raggiungibile o offline).</p><button class="btn ghost sm" id="skip">Salta foto</button></div>`;
      $('#skip', view).onclick = () => { q.items[q.index] = nextItem({ ...q, photos: [] }); renderQuizPlay({ view }); };
    };
  }

  $('#zoom', view).onclick = () => openViewer(itemMedia(item, q.ruler));
  $('#media', view).onclick = (e) => { if (!e.target.closest('button')) openViewer(itemMedia(item, q.ruler)); };

  // Specie
  $$('[data-sp]', view).forEach((b) => (b.onclick = () => {
    answer.species = b.dataset.sp;
    $$('[data-sp]', view).forEach((x) => x.classList.toggle('on', x === b));
    $('#f-species', view).classList.remove('missing');
    vibrate(8);
    if (q.mode === 'rapido') submit();
  }));
  $('#sp-search', view)?.addEventListener('input', (e) => {
    const t = e.target.value.trim().toLowerCase();
    $$('[data-sp]', view).forEach((b) => (b.hidden = t && !b.dataset.q.includes(t)));
  });

  // Peso
  const num = $('#w-num', view);
  const range = $('#w-range', view);
  const setWeight = (kg, from) => {
    answer.weightKg = kg > 0 ? kg : null;
    if (from !== 'num' && num) num.value = kg > 0 ? +toUnit(kg, unit).toFixed(toUnit(kg, unit) < 10 ? 1 : 0) : '';
    if (from !== 'range' && range && kg > 0) range.value = toPos(Math.min(maxKg, Math.max(minKg, kg)));
    $('#f-weight', view)?.classList.remove('missing');
  };
  if (num) {
    num.addEventListener('input', () => setWeight(fromUnit(parseFloat(String(num.value).replace(',', '.')), unit), 'num'));
    range.addEventListener('input', () => setWeight(fromPos(+range.value), 'range'));
    $$('[data-step]', view).forEach((b) => (b.onclick = () => {
      const cur = answer.weightKg || fromPos(500);
      const k = +b.dataset.step > 0 ? 1.05 : 1 / 1.05;
      setWeight(Math.max(minKg, cur * k));
    }));
  }
  $('#calc', view)?.addEventListener('click', () => {
    const len = parseFloat(String($('#len', view).value).replace(',', '.'));
    if (!answer.species) return toast('Seleziona prima una specie', 'warn');
    if (!(len > 0)) return toast('Inserisci la lunghezza misurata in cm', 'warn');
    setWeight(weightFromLength(speciesById(answer.species), len));
  });

  // Tipologia
  $$('[data-type]', view).forEach((b) => (b.onclick = () => {
    answer.type = b.dataset.type;
    $$('[data-type]', view).forEach((x) => x.classList.toggle('on', x === b));
    $('#f-type', view).classList.remove('missing');
    vibrate(8);
  }));

  // Timer
  if (q.timer) {
    let left = q.timer;
    const el = $('#timer b', view);
    timerId = setInterval(() => {
      left -= 1;
      el.textContent = left;
      $('#timer', view).classList.toggle('urgent', left <= 5);
      if (left <= 0) {
        clearInterval(timerId);
        toast('Tempo scaduto', 'warn');
        submit(true);
      }
    }, 1000);
  }

  let submitted = false;
  function submit(force = false) {
    if (submitted) return;
    if (!force) {
      const missing = [];
      if (!answer.species) missing.push('f-species');
      if (q.ask.weight && !answer.weightKg && item.weightKg) missing.push('f-weight');
      if (q.ask.type && !answer.type) missing.push('f-type');
      if (missing.length) {
        missing.forEach((id) => $('#' + id, view).classList.add('missing'));
        $('#' + missing[0], view).scrollIntoView({ behavior: 'smooth', block: 'center' });
        toast('Completa tutte le risposte', 'warn');
        vibrate([20, 40, 20]);
        return;
      }
    }
    submitted = true;
    clearInterval(timerId);
    const res = scoreAnswer(item, answer, { tolerance: state.settings.tolerance, ask: q.ask });
    q.answers[q.index] = { guess: { ...answer }, res };
    q.points += res.points;
    q.max += res.max;
    vibrate(res.species ? 15 : [30, 50, 30]);

    if (q.mode === 'allenamento') return showFeedback(view, q, item, answer, res);
    if (q.mode === 'rapido') {
      const right = $(`[data-sp="${item.species}"]`, view);
      right?.classList.add('right');
      if (answer.species && answer.species !== item.species) $(`[data-sp="${answer.species}"]`, view)?.classList.add('wrong');
      setTimeout(() => advance(view, q), 900);
      return;
    }
    advance(view, q);
  }
  $('#submit', view).onclick = () => submit();

  $('#quit').onclick = async () => {
    if (q.mode === 'allenamento') {
      if (!q.answers.filter(Boolean).length) { state.quiz = null; return go('quiz'); }
      return finish(view, q);
    }
    if (await confirmDialog('Uscire dal quiz? Le risposte date finora non verranno salvate.', { ok: 'Esci', danger: true })) {
      state.quiz = null;
      go('home');
    }
  };
}

function advance(view, q) {
  q.index += 1;
  if (q.index >= q.total) return finish(view, q);
  renderQuizPlay({ view });
}

async function finish(view, q) {
  q.done = true;
  q.items = q.items.slice(0, q.answers.length);
  const pct = q.max ? Math.round((q.points / q.max) * 100) : 0;
  const session = {
    id: q.id,
    date: Date.now(),
    mode: q.mode,
    level: q.level,
    duration: Math.round((Date.now() - q.startedAt) / 1000),
    points: q.points,
    max: q.max,
    pct,
    answers: q.answers.map((a, i) => {
      const it = q.items[i];
      return {
        kind: it.kind,
        photoId: it.photoId || null,
        seed: it.seed ?? null,
        truth: { species: it.species, type: it.type, weightKg: it.weightKg, lengthCm: it.lengthCm },
        guess: a.guess,
        res: { species: a.res.species, type: a.res.type, weight: a.res.weight, errPct: a.res.errPct, points: a.res.points, max: a.res.max },
      };
    }),
  };
  try {
    await db.put('sessions', session);
    await reloadData();
  } catch {
    toast('Impossibile salvare la sessione', 'bad');
  }
  renderQuizPlay({ view });
}

function showFeedback(view, q, item, answer, res) {
  const sp = speciesById(item.species);
  const unit = state.settings.unit;
  const row = (ok, label, mine, truth) => `
    <li class="${ok == null ? 'na' : ok ? 'ok' : 'bad'}">
      <span class="badge">${ok == null ? '–' : ok ? icon.check : icon.x}</span>
      <div><strong>${label}</strong><small>${mine}</small></div><span class="truth">${truth}</span></li>`;
  $('#answers', view).innerHTML = `
    <div class="feedback ${res.pct >= 70 ? 'good' : res.pct >= 40 ? 'mid' : 'poor'}">
      <div class="fb-score"><span>${res.points}</span><small>/ ${res.max} punti</small></div>
      <ul class="fb-list">
        ${row(res.species, 'Specie', `Tua risposta: ${esc(speciesById(answer.species)?.name || '—')}`, esc(sp.name))}
        ${item.weightKg ? row(res.weight, 'Peso', `Tua stima: ${fmtWeight(answer.weightKg, unit)}${res.errPct != null ? ` · errore ${Math.round(res.errPct)}% · ${res.weightPts} pt` : ''}`, fmtWeight(item.weightKg, unit)) : row(null, 'Peso', 'Peso reale non indicato per questa foto', '—')}
        ${row(res.type, 'Tipologia', `Tua risposta: ${esc(typeById(answer.type)?.short || '—')}`, esc(typeById(item.type).short))}
      </ul>
      ${item.lengthCm ? `<p class="muted">Lunghezza alla forca: <b>${item.lengthCm} cm</b>.</p>` : ''}
      <div class="fb-key">
        <h4>Come riconoscere il ${esc(sp.name.toLowerCase())} <em>${esc(sp.sci)}</em></h4>
        <ul>${sp.features.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
        <a href="#/specie/${sp.id}" class="link-more">Scheda completa ${icon.next}</a>
      </div>
      <div class="sticky-cta"><button class="btn primary lg block" id="next">Prossima immagine ${icon.next}</button></div>
    </div>`;
  $('#answers', view).scrollIntoView({ behavior: 'smooth', block: 'start' });
  const go2 = () => { document.removeEventListener('keydown', onKey); advance(view, q); };
  const onKey = (e) => { if (e.key === 'Enter') go2(); };
  document.addEventListener('keydown', onKey);
  onLeave(() => document.removeEventListener('keydown', onKey));
  $('#next', view).onclick = go2;
  $('.pill.score', view).textContent = `${Math.round((q.points / q.max) * 100)}% · ${q.points} pt`;
}

/* ------------------------------ Risultati ------------------------------ */

function renderResults(view, q) {
  setTitle('Risultati');
  const pct = q.max ? Math.round((q.points / q.max) * 100) : 0;
  const g = grade(pct);
  const n = q.answers.length;
  const sp = q.answers.filter((a) => a.res.species).length;
  const ty = q.answers.filter((a) => a.res.type).length;
  const werr = q.answers.filter((a) => a.res.errPct != null).map((a) => a.res.errPct);
  const unit = state.settings.unit;

  view.innerHTML = `
  <section class="result-hero tone-${g.tone}">
    <div class="ring" style="--p:${pct}"><span>${pct}%</span></div>
    <div><p class="eyebrow">${MODES[q.mode].label} · livello ${LEVELS[q.level].label}</p>
      <h2>${g.label}</h2>
      <p>${q.points} punti su ${q.max} · ${n} immagini</p></div>
  </section>
  <section class="kpis">
    <div class="kpi"><span class="kpi-label">Specie</span><span class="kpi-value">${sp}/${n}</span></div>
    ${q.ask.type ? `<div class="kpi"><span class="kpi-label">Tipologia</span><span class="kpi-value">${ty}/${n}</span></div>` : ''}
    ${q.ask.weight ? `<div class="kpi"><span class="kpi-label">Errore peso medio</span><span class="kpi-value">${werr.length ? '±' + Math.round(werr.reduce((a, b) => a + b, 0) / werr.length) + '%' : '—'}</span></div>` : ''}
  </section>
  <section>
    <h3 class="section-title">Revisione</h3>
    <div class="review">
      ${q.answers.map((a, i) => {
        const it = q.items[i];
        const s = speciesById(it.species);
        return `<article class="review-item">
          <div class="thumb">${itemThumb(it)}</div>
          <div class="review-body">
            <div class="row between"><strong>${i + 1}. ${esc(s.name)}</strong><span class="pill ${a.res.pct >= 70 ? 'ok' : a.res.pct >= 40 ? 'warn' : 'bad'}">${a.res.points}/${a.res.max}</span></div>
            <p class="${a.res.species ? 'ok-text' : 'bad-text'}">Specie: ${esc(speciesById(a.guess.species)?.name || 'nessuna risposta')}</p>
            ${q.ask.weight ? `<p>Peso: ${fmtWeight(a.guess.weightKg, unit)} · reale ${fmtWeight(it.weightKg, unit)}${a.res.errPct != null ? ` (${Math.round(a.res.errPct)}%)` : ''}</p>` : ''}
            ${q.ask.type ? `<p class="${a.res.type ? 'ok-text' : 'bad-text'}">Tipologia: ${esc(typeById(a.guess.type)?.short || '—')} · corretta ${esc(typeById(it.type).short)}</p>` : ''}
          </div></article>`;
      }).join('')}
    </div>
  </section>
  <div class="row gap wrap center mt">
    <button class="btn primary lg" id="again">${icon.play}<span>Rigioca</span></button>
    <a class="btn ghost lg" href="#/statistiche">${icon.chart}<span>Statistiche</span></a>
  </div>`;

  $('#again', view).onclick = () => {
    state.quiz = createQuiz({ mode: q.mode, level: q.level, source: q.source, count: q.total, timer: q.timer, ruler: q.ruler });
    go('quiz/gioca');
  };
}
