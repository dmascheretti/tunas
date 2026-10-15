import { state, setTitle, reloadData } from '../app.js';
import { esc, icon, $, toast, confirmDialog } from '../ui.js';
import { SPECIES, speciesById } from '../species.js';
import { db } from '../db.js';

const MODE_LABEL = { allenamento: 'Allenamento', esame: 'Esame', rapido: 'Rapido' };

export function summarize(sessions) {
  const answers = sessions.flatMap((s) => s.answers || []);
  const sp = answers.filter((a) => a.res.species != null);
  const w = answers.filter((a) => a.res.errPct != null);
  const ty = answers.filter((a) => a.res.type != null);
  const pct = (n, d) => (d ? Math.round((n / d) * 100) : 0);
  return {
    sessions: sessions.length,
    answers: answers.length,
    avgPct: sessions.length ? Math.round(sessions.reduce((a, s) => a + s.pct, 0) / sessions.length) : 0,
    best: sessions.reduce((m, s) => Math.max(m, s.pct), 0),
    speciesAcc: pct(sp.filter((a) => a.res.species).length, sp.length),
    typeAcc: pct(ty.filter((a) => a.res.type).length, ty.length),
    weightN: w.length,
    avgWeightErr: w.length ? Math.round(w.reduce((a, x) => a + x.res.errPct, 0) / w.length) : 0,
    weightHit: pct(w.filter((a) => a.res.weight).length, w.length),
    all: answers,
  };
}

export function renderStats({ view }) {
  setTitle('Statistiche');
  const s = summarize(state.sessions);

  if (!s.sessions) {
    view.innerHTML = `<div class="empty-state">${icon.chart}<h3>Ancora nessun dato</h3><p>Completa un quiz per vedere i tuoi progressi per specie, peso e tipologia.</p><a class="btn primary" href="#/quiz">${icon.play}<span>Inizia un quiz</span></a></div>`;
    return;
  }

  // Precisione per specie
  const per = SPECIES.map((sp) => {
    const list = s.all.filter((a) => a.truth.species === sp.id);
    const ok = list.filter((a) => a.res.species).length;
    return { sp, n: list.length, acc: list.length ? Math.round((ok / list.length) * 100) : null };
  }).filter((x) => x.n);
  per.sort((a, b) => a.acc - b.acc);

  // Confusioni più frequenti
  const conf = {};
  s.all.filter((a) => a.res.species === false && a.guess.species).forEach((a) => {
    const k = `${a.truth.species}>${a.guess.species}`;
    conf[k] = (conf[k] || 0) + 1;
  });
  const confusions = Object.entries(conf).sort((a, b) => b[1] - a[1]).slice(0, 5);

  // Andamento ultime sessioni
  const recent = state.sessions.slice(0, 20).reverse();
  const W = 600, H = 180, P = 28;
  const pts = recent.map((x, i) => [P + (recent.length > 1 ? (i / (recent.length - 1)) * (W - 2 * P) : (W - 2 * P) / 2), H - P - (x.pct / 100) * (H - 2 * P)]);
  const trend = `<svg viewBox="0 0 ${W} ${H}" class="chart" role="img" aria-label="Andamento punteggi">
    ${[0, 50, 100].map((v) => `<line class="grid" x1="${P}" x2="${W - P}" y1="${H - P - (v / 100) * (H - 2 * P)}" y2="${H - P - (v / 100) * (H - 2 * P)}"/><text class="axis" x="${P - 6}" y="${H - P - (v / 100) * (H - 2 * P) + 4}" text-anchor="end">${v}</text>`).join('')}
    ${pts.length > 1 ? `<path class="line" d="${pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join('')}"/>` : ''}
    ${pts.map((p) => `<circle class="dot" r="4.5" cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}"/>`).join('')}
  </svg>`;

  view.innerHTML = `
  <section class="kpis">
    <div class="kpi"><span class="kpi-label">Sessioni</span><span class="kpi-value">${s.sessions}</span><small>${s.answers} immagini</small></div>
    <div class="kpi"><span class="kpi-label">Media / migliore</span><span class="kpi-value">${s.avgPct}%</span><small>migliore ${s.best}%</small></div>
    <div class="kpi"><span class="kpi-label">Specie corrette</span><span class="kpi-value">${s.speciesAcc}%</span></div>
    <div class="kpi"><span class="kpi-label">Tipologia corretta</span><span class="kpi-value">${s.typeAcc}%</span></div>
    <div class="kpi"><span class="kpi-label">Peso nella tolleranza</span><span class="kpi-value">${s.weightN ? s.weightHit + '%' : '—'}</span><small>${s.weightN ? `errore medio ±${s.avgWeightErr}%` : ''}</small></div>
  </section>

  <div class="split">
    <section class="card">
      <h3 class="section-title">Andamento (ultime ${recent.length} sessioni)</h3>
      ${trend}
    </section>
    <section class="card">
      <h3 class="section-title">Confusioni più frequenti</h3>
      ${confusions.length ? `<ul class="conf">${confusions.map(([k, n]) => {
        const [t, g] = k.split('>');
        return `<li><span><b>${esc(speciesById(t).name)}</b> scambiato per <b>${esc(speciesById(g).name)}</b></span><span class="pill">${n}×</span></li>`;
      }).join('')}</ul>` : '<p class="muted">Nessuna confusione registrata. Ottimo!</p>'}
    </section>
  </div>

  <section class="card">
    <h3 class="section-title">Precisione per specie</h3>
    <div class="bars">
      ${per.map((x) => `<a class="bar-row" href="#/specie/${x.sp.id}"><span class="bar-label">${esc(x.sp.name)}</span>
        <span class="bar"><span class="bar-fill ${x.acc >= 75 ? 'ok' : x.acc >= 50 ? 'warn' : 'bad'}" style="width:${Math.max(x.acc, 2)}%"></span></span>
        <span class="bar-val">${x.acc}% <small>(${x.n})</small></span></a>`).join('')}
    </div>
  </section>

  <section class="card">
    <div class="row between"><h3 class="section-title">Storico sessioni</h3><button class="btn ghost sm" id="clear">${icon.trash}<span>Azzera</span></button></div>
    <div class="table-wrap"><table class="table">
      <thead><tr><th>Data</th><th>Modalità</th><th>Immagini</th><th>Punti</th><th>Voto</th></tr></thead>
      <tbody>${state.sessions.slice(0, 50).map((x) => `<tr>
        <td>${new Date(x.date).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' })}</td>
        <td>${MODE_LABEL[x.mode] || x.mode} · ${x.level === 'esperto' ? 'Esperto' : 'Base'}</td>
        <td>${x.answers.length}</td><td>${x.points}/${x.max}</td>
        <td><span class="pill ${x.pct >= 75 ? 'ok' : x.pct >= 55 ? 'warn' : 'bad'}">${x.pct}%</span></td></tr>`).join('')}</tbody>
    </table></div>
  </section>`;

  $('#clear', view).onclick = async () => {
    if (!(await confirmDialog('Eliminare tutto lo storico delle sessioni?', { ok: 'Azzera', danger: true }))) return;
    await db.clear('sessions');
    await reloadData();
    toast('Storico azzerato');
    renderStats({ view });
  };
}
