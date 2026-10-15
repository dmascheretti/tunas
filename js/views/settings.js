import { state, setTitle, updateSettings, reloadData } from '../app.js';
import { esc, icon, $, $$, toast, confirmDialog, download } from '../ui.js';
import { db } from '../db.js';

export function renderSettings({ view }) {
  setTitle('Impostazioni');
  const s = state.settings;
  view.innerHTML = `
  <div class="settings">
    <section class="card">
      <h3 class="section-title">Profilo</h3>
      <label class="field"><span>Nome (facoltativo)</span><input id="player" type="text" maxlength="40" value="${esc(s.player)}" placeholder="es. Mario"></label>
    </section>
    <section class="card">
      <h3 class="section-title">Valutazione</h3>
      <label class="field"><span>Unità di misura</span>
        <div class="seg" id="unit"><button data-v="kg">Chilogrammi (kg)</button><button data-v="lb">Libbre (lb)</button></div></label>
      <label class="field"><span>Tolleranza peso per il punteggio pieno: <b id="tol-out">±${s.tolerance}%</b></span>
        <input id="tol" type="range" min="5" max="40" step="5" value="${s.tolerance}"></label>
    </section>
    <section class="card">
      <h3 class="section-title">Aspetto e interazione</h3>
      <label class="field"><span>Tema</span>
        <div class="seg" id="theme"><button data-v="auto">Automatico</button><button data-v="light">Chiaro</button><button data-v="dark">Scuro</button></div></label>
      <label class="switch"><input type="checkbox" id="haptics" ${s.haptics ? 'checked' : ''}><span></span>Vibrazione al tocco (dispositivi compatibili)</label>
    </section>
    <section class="card">
      <h3 class="section-title">Dati</h3>
      <p class="muted">Tutti i dati restano su questo dispositivo. Usa il backup per trasferirli.</p>
      <div class="stack">
        <button class="btn ghost block" id="backup">${icon.download}<span>Backup completo (foto + statistiche)</span></button>
        <label class="btn ghost block file-btn">${icon.upload}<span>Ripristina backup</span><input type="file" id="restore" accept="application/json,.json"></label>
        <button class="btn danger block" id="reset">${icon.trash}<span>Cancella tutti i dati</span></button>
      </div>
    </section>
    <section class="card">
      <h3 class="section-title">Installa l'app</h3>
      <p class="muted"><b>iPhone / iPad:</b> in Safari tocca <i>Condividi</i> → <i>Aggiungi alla schermata Home</i>.<br>
      <b>Android:</b> in Chrome apri il menu ⋮ → <i>Installa app</i>.<br>
      Una volta installata, TunaID funziona a schermo intero e anche senza connessione.</p>
      <button class="btn primary" id="install" hidden>Installa ora</button>
    </section>
    <p class="muted center small">TunaID 1.0 · Illustrazioni generate dall'app · Relazioni lunghezza-peso indicative (ICCAT, FishBase)</p>
  </div>`;

  const seg = (id, key) => {
    $$(`#${id} button`, view).forEach((b) => {
      b.classList.toggle('on', b.dataset.v === s[key]);
      b.onclick = (e) => {
        e.preventDefault();
        updateSettings({ [key]: b.dataset.v });
        $$(`#${id} button`, view).forEach((x) => x.classList.toggle('on', x === b));
      };
    });
  };
  seg('unit', 'unit');
  seg('theme', 'theme');
  $('#player', view).onchange = (e) => updateSettings({ player: e.target.value.trim() });
  $('#tol', view).oninput = (e) => {
    updateSettings({ tolerance: +e.target.value });
    $('#tol-out', view).textContent = `±${e.target.value}%`;
  };
  $('#haptics', view).onchange = (e) => updateSettings({ haptics: e.target.checked });

  $('#backup', view).onclick = () => {
    download(`tunaid-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify({ app: 'TunaID', version: 1, settings: state.settings, photos: state.photos, sessions: state.sessions }));
    toast('Backup scaricato', 'ok');
  };
  $('#restore', view).onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (data.app !== 'TunaID') throw new Error();
      if (!(await confirmDialog('Ripristinare il backup? I dati attuali verranno sostituiti.', { ok: 'Ripristina' }))) return;
      await db.clear('photos');
      await db.clear('sessions');
      for (const p of data.photos || []) if (p && p.id && p.species) await db.put('photos', p);
      for (const x of data.sessions || []) if (x && x.id && Array.isArray(x.answers)) await db.put('sessions', x);
      if (data.settings) updateSettings(data.settings);
      await reloadData();
      toast('Backup ripristinato', 'ok');
      renderSettings({ view });
    } catch {
      toast('File di backup non valido', 'bad');
    }
  };
  $('#reset', view).onclick = async () => {
    if (!(await confirmDialog('Cancellare foto, statistiche e impostazioni? L\'operazione non è reversibile.', { ok: 'Cancella tutto', danger: true }))) return;
    await db.clear('photos');
    await db.clear('sessions');
    try { localStorage.clear(); } catch { /* ignorato */ }
    location.reload();
  };

  const btn = $('#install', view);
  if (window.__installPrompt) {
    btn.hidden = false;
    btn.onclick = async () => {
      window.__installPrompt.prompt();
      await window.__installPrompt.userChoice;
      window.__installPrompt = null;
      btn.hidden = true;
    };
  }
}
