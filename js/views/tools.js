import { state, setTitle } from '../app.js';
import { esc, icon, $, $$ } from '../ui.js';
import { SPECIES, speciesById, typeById, weightFromLength, lengthFromWeight } from '../species.js';
import { speciesPortrait } from '../fish.js';
import { fmtWeight, toUnit, fromUnit } from '../scoring.js';

// Chiave dicotomica semplificata per il riconoscimento sul campo.
const KEY = {
  start: { q: 'Sul ventre ci sono da 3 a 5 strisce scure longitudinali?', yes: 'R:pelamis', no: 'back' },
  back: { q: 'Il dorso presenta disegni scuri (linee ondulate, oblique o barre)?', yes: 'pattern', no: 'pect' },
  pattern: { q: 'Strisce oblique che attraversano tutto il dorso, bocca ampia con denti evidenti?', yes: 'R:sarda', no: 'dots' },
  dots: { q: 'Ci sono alcune macchie scure tra pettorale e ventrale, e le due dorsali sono vicine?', yes: 'R:alletteratus', no: 'auxis' },
  auxis: { q: 'Corpo relativamente alto con linee quasi verticali sul dorso?', yes: 'R:thazard', no: 'R:rochei' },
  pect: { q: 'Le pinne pettorali sono lunghissime (oltre l\'inizio della pinna anale) e la coda ha il bordo bianco?', yes: 'R:alalunga', no: 'yellow' },
  yellow: { q: 'Seconda dorsale e anale gialle e molto allungate a falce, con banda laterale dorata?', yes: 'R:albacares', no: 'eye' },
  eye: { q: 'Occhio molto grande e corpo "panciuto" con pettorali lunghe?', yes: 'R:obesus', no: 'finlets' },
  finlets: { q: 'Pinnule scure (non gialle) ed esemplare sotto i 20 kg?', yes: 'R:atlanticus', no: 'slim' },
  slim: { q: 'Corpo snello con file di macchie ovali chiare sul ventre?', yes: 'R:tonggol', no: 'area' },
  area: {
    q: 'Pettorali corte e corpo massiccio: è un tonno rosso. Dove è stato pescato?',
    choices: [
      ['Atlantico / Mediterraneo', 'R:thynnus'],
      ['Pacifico settentrionale', 'R:orientalis'],
      ['Oceani meridionali (carene gialle)', 'R:maccoyii'],
    ],
  },
};

export function renderTools({ view }) {
  setTitle('Strumenti');
  const unit = state.settings.unit;
  view.innerHTML = `
  <div class="split">
    <section class="card">
      <h3 class="section-title">${icon.scale} Calcolatore lunghezza ↔ peso</h3>
      <label class="field"><span>Specie</span><select id="c-sp">${SPECIES.map((s) => `<option value="${s.id}">${esc(s.name)}</option>`).join('')}</select></label>
      <div class="two-col">
        <label class="field"><span>Lunghezza alla forca (cm)</span><input id="c-len" type="number" inputmode="decimal" min="1" value="100"></label>
        <label class="field"><span>Peso (${unit})</span><input id="c-w" type="number" inputmode="decimal" min="0" step="0.1"></label>
      </div>
      <div class="result-box" id="c-out"></div>
      <p class="hint">Relazioni allometriche indicative (W = a·L<sup>b</sup>). Il peso reale varia con stagione e condizione dell'esemplare (±10–15%).</p>
    </section>
    <section class="card">
      <h3 class="section-title">${icon.key} Chiave di identificazione</h3>
      <div id="key"></div>
    </section>
  </div>`;

  // Calcolatore
  const sel = $('#c-sp', view), len = $('#c-len', view), w = $('#c-w', view);
  const out = (sp, L, kg) => {
    const outOfRange = L < sp.len[0] * 0.8 || L > sp.len[1] * 1.15;
    $('#c-out', view).innerHTML = `<div><span class="muted">Peso stimato</span><b>${fmtWeight(kg, unit)}</b></div><div><span class="muted">Lunghezza</span><b>${Math.round(L)} cm</b></div><div><span class="muted">Tipologia</span><b>${esc(typeById(sp.type).short)}</b></div>${outOfRange ? '<p class="warn-text">Fuori dalla gamma di taglia comune per questa specie.</p>' : ''}`;
  };
  const fromLen = () => {
    const sp = speciesById(sel.value);
    const L = parseFloat(len.value);
    if (!(L > 0)) return;
    const kg = weightFromLength(sp, L);
    w.value = +toUnit(kg, unit).toFixed(1);
    out(sp, L, kg);
  };
  const fromW = () => {
    const sp = speciesById(sel.value);
    const kg = fromUnit(parseFloat(w.value), unit);
    if (!(kg > 0)) return;
    const L = lengthFromWeight(sp, kg);
    len.value = Math.round(L);
    out(sp, L, kg);
  };
  sel.onchange = fromLen;
  len.oninput = fromLen;
  w.oninput = fromW;
  fromLen();

  // Chiave
  const keyEl = $('#key', view);
  const path = [];
  const drawKey = (node) => {
    if (node.startsWith('R:')) {
      const sp = speciesById(node.slice(2));
      keyEl.innerHTML = `<div class="key-result"><div class="portrait">${speciesPortrait(sp.id)}</div>
        <p class="eyebrow">Probabile identificazione</p><h4>${esc(sp.name)}</h4><p class="sci">${esc(sp.sci)}</p>
        <div class="row gap wrap"><a class="btn primary sm" href="#/specie/${sp.id}">Apri scheda</a><button class="btn ghost sm" id="k-reset">Ricomincia</button></div></div>`;
      $('#k-reset', keyEl).onclick = () => { path.length = 0; drawKey('start'); };
      return;
    }
    const n = KEY[node];
    const choices = n.choices || [['Sì', n.yes], ['No', n.no]];
    keyEl.innerHTML = `<p class="muted">Domanda ${path.length + 1}</p><p class="lead">${esc(n.q)}</p>
      <div class="stack">${choices.map(([l, t]) => `<button class="btn ghost block" data-to="${t}">${esc(l)}</button>`).join('')}</div>
      ${path.length ? '<button class="btn link sm" id="k-back">← Indietro</button>' : ''}`;
    $$('[data-to]', keyEl).forEach((b) => (b.onclick = () => { path.push(node); drawKey(b.dataset.to); }));
    $('#k-back', keyEl)?.addEventListener('click', () => drawKey(path.pop()));
  };
  drawKey('start');
}
