import { state, setTitle } from '../app.js';
import { esc, icon } from '../ui.js';
import { SPECIES } from '../species.js';
import { speciesPortrait } from '../fish.js';
import { summarize } from './stats.js';

export function renderHome({ view }) {
  setTitle('TunaID');
  const s = summarize(state.sessions);
  const name = state.settings.player ? `, ${esc(state.settings.player)}` : '';
  const featured = SPECIES[Math.floor(Date.now() / 86400000) % SPECIES.length];

  view.innerHTML = `
  <section class="hero">
    <div class="hero-text">
      <p class="eyebrow">Allenamento professionale</p>
      <h2>Ciao${name}! Riconosci il tonno.</h2>
      <p>Osserva la foto, identifica <b>specie</b>, stima il <b>peso</b> e indica la <b>tipologia</b> commerciale. Usa illustrazioni con metro graduato o le tue foto prese da Internet.</p>
      <div class="row gap wrap">
        <a class="btn primary lg" href="#/quiz">${icon.play}<span>Inizia un quiz</span></a>
        <a class="btn ghost lg" href="#/libreria">${icon.image}<span>Aggiungi foto</span></a>
      </div>
    </div>
    <div class="hero-art">${speciesPortrait('albacares')}</div>
  </section>

  <section class="kpis">
    <div class="kpi"><span class="kpi-label">Sessioni</span><span class="kpi-value">${s.sessions}</span></div>
    <div class="kpi"><span class="kpi-label">Punteggio medio</span><span class="kpi-value">${s.sessions ? s.avgPct + '%' : '—'}</span></div>
    <div class="kpi"><span class="kpi-label">Specie corrette</span><span class="kpi-value">${s.answers ? s.speciesAcc + '%' : '—'}</span></div>
    <div class="kpi"><span class="kpi-label">Errore peso medio</span><span class="kpi-value">${s.weightN ? '±' + s.avgWeightErr + '%' : '—'}</span></div>
  </section>

  <section>
    <h3 class="section-title">Modalità</h3>
    <div class="cards three">
      <a class="card link" href="#/quiz?mode=allenamento">
        <div class="card-icon">${icon.fish}</div>
        <h4>Allenamento</h4><p>Domande illimitate con correzione immediata e spiegazione dei caratteri distintivi.</p>
      </a>
      <a class="card link" href="#/quiz?mode=esame">
        <div class="card-icon">${icon.trophy}</div>
        <h4>Esame</h4><p>Serie di domande a tempo, valutazione finale con voto e revisione degli errori.</p>
      </a>
      <a class="card link" href="#/quiz?mode=rapido">
        <div class="card-icon">${icon.clock}</div>
        <h4>Riconoscimento rapido</h4><p>Solo la specie, 15 secondi a foto: allena l'occhio come al mercato ittico.</p>
      </a>
    </div>
  </section>

  <section class="split">
    <div class="card">
      <h3 class="section-title">Specie del giorno</h3>
      <a class="featured" href="#/specie/${featured.id}">
        <div class="portrait">${speciesPortrait(featured.id)}</div>
        <div><h4>${esc(featured.name)}</h4><p class="sci">${esc(featured.sci)}</p>
        <p class="muted">${esc(featured.features[0])}.</p></div>
      </a>
    </div>
    <div class="card">
      <h3 class="section-title">Libreria foto</h3>
      <p class="big-number">${state.photos.length}</p>
      <p class="muted">${state.photos.length ? 'foto con risposta corretta pronte per i quiz.' : 'Nessuna foto ancora: aggiungi immagini dal web (link) o dalla galleria/fotocamera, indicando specie, peso e tipologia corretti.'}</p>
      <a class="btn ghost" href="#/libreria">${icon.plus}<span>Gestisci foto</span></a>
    </div>
  </section>`;
}
