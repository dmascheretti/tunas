import { state, setTitle, reloadData } from '../app.js';
import { esc, icon, $, $$, toast, openSheet, confirmDialog, fileToDataUrl, urlToDataUrl, download, openViewer } from '../ui.js';
import { SPECIES, TYPES, speciesById, typeById, weightFromLength } from '../species.js';
import { fmtWeight, toUnit, fromUnit } from '../scoring.js';
import { db, uid } from '../db.js';

// Foto dimostrative da Wikimedia Commons (pubblico dominio, NOAA).
// Il peso reale non è documentato, quindi viene valutata solo specie e tipologia.
export const DEMO_PHOTOS = [
  {
    url: 'https://commons.wikimedia.org/wiki/Special:FilePath/Yellowfin_tuna_nurp.jpg?width=1280',
    species: 'albacares',
    credit: 'NOAA / Wikimedia Commons (pubblico dominio)',
    note: 'Foto subacquea di tonno a pinne gialle',
  },
  {
    url: 'https://commons.wikimedia.org/wiki/Special:FilePath/Bluefin-big.jpg?width=1280',
    species: 'thynnus',
    credit: 'NOAA / Wikimedia Commons (pubblico dominio)',
    note: 'Tonno rosso atlantico',
  },
];

export function renderLibrary({ view }) {
  setTitle('Libreria foto', { actions: `<button class="btn primary sm" id="add">${icon.plus}<span class="hide-xs">Aggiungi</span></button>` });
  let filter = '';

  const draw = () => {
    const list = state.photos.filter((p) => !filter || p.species === filter);
    view.innerHTML = `
      <section class="card intro">
        <div>
          <h3>Le tue foto di tonni</h3>
          <p class="muted">Raccogli immagini da Internet (incolla il link) o dal dispositivo (galleria o fotocamera). Per ogni foto indica la risposta corretta: specie, peso e tipologia. Le foto entrano automaticamente nei quiz.</p>
        </div>
        <div class="row gap wrap">
          <button class="btn primary" data-add="url">${icon.link}<span>Da link Internet</span></button>
          <button class="btn ghost" data-add="file">${icon.camera}<span>Da dispositivo</span></button>
          <button class="btn ghost" id="more">${icon.download}<span>Importa / esporta</span></button>
        </div>
      </section>
      ${state.photos.length ? `
      <div class="toolbar">
        <label class="field inline grow"><span>Filtra</span>
          <select id="filter"><option value="">Tutte le specie (${state.photos.length})</option>
          ${SPECIES.filter((s) => state.photos.some((p) => p.species === s.id)).map((s) => `<option value="${s.id}" ${filter === s.id ? 'selected' : ''}>${esc(s.name)} (${state.photos.filter((p) => p.species === s.id).length})</option>`).join('')}
          </select></label>
      </div>
      <div class="photo-grid">
        ${list.map((p) => {
          const s = speciesById(p.species);
          return `<article class="photo-card">
            <button class="photo-img" data-view="${p.id}" aria-label="Apri foto"><img src="${esc(p.data || p.url)}" alt="${esc(s?.name || '')}" loading="lazy" referrerpolicy="no-referrer" onerror="this.closest('.photo-card').classList.add('broken')"><span class="broken-msg">${icon.image}Non raggiungibile</span></button>
            <div class="photo-meta">
              <strong>${esc(s?.name || 'Specie sconosciuta')}</strong>
              <small>${p.weightKg ? fmtWeight(p.weightKg, state.settings.unit) : 'peso n.d.'} · ${esc(typeById(p.type || s?.type)?.short || '')}${p.data ? ' · offline' : ' · link'}</small>
            </div>
            <div class="photo-actions">
              <button class="icon-btn" data-edit="${p.id}" aria-label="Modifica">${icon.edit}</button>
              <button class="icon-btn" data-del="${p.id}" aria-label="Elimina">${icon.trash}</button>
            </div>
          </article>`;
        }).join('')}
      </div>` : `
      <div class="empty-state">
        ${icon.image}
        <h3>Nessuna foto</h3>
        <p>Aggiungi la prima foto, oppure carica le foto dimostrative da Wikimedia Commons.</p>
        <button class="btn ghost" id="demo">Carica foto dimostrative</button>
      </div>`}`;

    $$('[data-add]', view).forEach((b) => (b.onclick = () => editPhoto(null, b.dataset.add, draw)));
    $('#filter', view)?.addEventListener('change', (e) => { filter = e.target.value; draw(); });
    $$('[data-edit]', view).forEach((b) => (b.onclick = () => editPhoto(state.photos.find((p) => p.id === b.dataset.edit), null, draw)));
    $$('[data-view]', view).forEach((b) => (b.onclick = () => {
      const p = state.photos.find((x) => x.id === b.dataset.view);
      openViewer(`<img src="${esc(p.data || p.url)}" alt="" referrerpolicy="no-referrer">`);
    }));
    $$('[data-del]', view).forEach((b) => (b.onclick = async () => {
      if (!(await confirmDialog('Eliminare questa foto dalla libreria?', { ok: 'Elimina', danger: true }))) return;
      await db.del('photos', b.dataset.del);
      await reloadData();
      toast('Foto eliminata');
      draw();
    }));
    $('#demo', view)?.addEventListener('click', async () => {
      for (const d of DEMO_PHOTOS) {
        await db.put('photos', { id: uid(), createdAt: Date.now(), type: speciesById(d.species).type, weightKg: null, lengthCm: null, data: null, ...d });
      }
      await reloadData();
      toast('Foto dimostrative aggiunte');
      draw();
    });
    $('#more', view).onclick = () => importExport(draw);
  };
  $('#add').onclick = () => editPhoto(null, 'url', draw);
  draw();
}

function editPhoto(photo, startMode, onDone) {
  const unit = state.settings.unit;
  const p = photo ? { ...photo } : { id: uid(), createdAt: Date.now(), url: '', data: null, species: '', type: '', weightKg: null, lengthCm: null, credit: '', note: '' };
  let mode = photo ? (photo.data && !photo.url ? 'file' : 'url') : startMode;

  openSheet({
    title: photo ? 'Modifica foto' : 'Nuova foto',
    wide: true,
    body: `
      <div class="editor">
        <div class="editor-media">
          <div class="seg" id="src-mode"><button data-m="url">${icon.link} Link Internet</button><button data-m="file">${icon.camera} Dispositivo</button></div>
          <div id="src-url" class="src">
            <label class="field"><span>Indirizzo dell'immagine (URL)</span>
              <input id="url" type="url" inputmode="url" placeholder="https://…/tonno.jpg" value="${esc(p.url || '')}"></label>
            <label class="switch"><input type="checkbox" id="offline" ${p.data || !photo ? 'checked' : ''}><span></span>Salva una copia per l'uso offline (se il sito lo consente)</label>
            <p class="hint">Suggerimento: apri l'immagine nel browser, tieni premuto e scegli "Copia indirizzo immagine".</p>
          </div>
          <div id="src-file" class="src">
            <label class="dropzone" id="drop">
              <input id="file" type="file" accept="image/*">
              ${icon.upload}<span>Scegli dalla galleria, scatta una foto o trascina qui</span>
            </label>
          </div>
          <div class="preview" id="preview">${p.data || p.url ? `<img src="${esc(p.data || p.url)}" alt="" referrerpolicy="no-referrer">` : '<span class="muted">Anteprima</span>'}</div>
        </div>
        <form class="editor-form" id="form">
          <p class="eyebrow">Risposta corretta</p>
          <label class="field"><span>Specie *</span>
            <select id="species" required><option value="">Seleziona…</option>
            ${SPECIES.map((s) => `<option value="${s.id}" ${p.species === s.id ? 'selected' : ''}>${esc(s.name)} — ${esc(s.sci)}</option>`).join('')}</select></label>
          <label class="field"><span>Tipologia</span>
            <select id="type">${TYPES.map((t) => `<option value="${t.id}" ${(p.type || speciesById(p.species)?.type) === t.id ? 'selected' : ''}>${esc(t.name)}</option>`).join('')}</select></label>
          <div class="two-col">
            <label class="field"><span>Peso reale (${unit})</span>
              <input id="weight" type="number" inputmode="decimal" min="0" step="0.1" placeholder="facoltativo" value="${p.weightKg ? +toUnit(p.weightKg, unit).toFixed(1) : ''}"></label>
            <label class="field"><span>Lunghezza (cm)</span>
              <input id="length" type="number" inputmode="decimal" min="0" step="1" placeholder="facoltativa" value="${p.lengthCm || ''}"></label>
          </div>
          <button type="button" class="btn ghost sm" id="estimate">${icon.scale} Stima il peso dalla lunghezza</button>
          <p class="hint">Senza peso reale la foto viene usata per specie e tipologia, senza punteggio sul peso.</p>
          <label class="field"><span>Fonte / crediti</span><input id="credit" type="text" placeholder="es. sito, autore, licenza" value="${esc(p.credit || '')}"></label>
          <label class="field"><span>Note</span><textarea id="note" rows="2" placeholder="Luogo, data, mercato…">${esc(p.note || '')}</textarea></label>
          <div class="row end gap"><button type="button" class="btn ghost" data-close>Annulla</button><button type="submit" class="btn primary" id="save">Salva foto</button></div>
        </form>
      </div>`,
    onMount: (el, close) => {
      const setMode = (m) => {
        mode = m;
        $$('#src-mode button', el).forEach((b) => b.classList.toggle('on', b.dataset.m === m));
        $('#src-url', el).hidden = m !== 'url';
        $('#src-file', el).hidden = m !== 'file';
      };
      setMode(mode);
      $$('#src-mode button', el).forEach((b) => (b.onclick = () => setMode(b.dataset.m)));

      const preview = (src) => {
        $('#preview', el).innerHTML = src ? `<img src="${esc(src)}" alt="" referrerpolicy="no-referrer">` : '<span class="muted">Anteprima</span>';
        const img = $('#preview img', el);
        if (img) img.onerror = () => ($('#preview', el).innerHTML = '<span class="bad-text">Impossibile caricare l\'immagine da questo indirizzo.</span>');
      };
      let urlTimer;
      $('#url', el).addEventListener('input', (e) => {
        clearTimeout(urlTimer);
        urlTimer = setTimeout(() => { p.url = e.target.value.trim(); if (mode === 'url') { p.data = null; preview(p.url); } }, 400);
      });
      const handleFile = async (file) => {
        if (!file) return;
        try {
          p.data = await fileToDataUrl(file);
          p.url = '';
          preview(p.data);
        } catch (err) {
          toast(err.message, 'bad');
        }
      };
      $('#file', el).addEventListener('change', (e) => handleFile(e.target.files[0]));
      const drop = $('#drop', el);
      drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('over'); });
      drop.addEventListener('dragleave', () => drop.classList.remove('over'));
      drop.addEventListener('drop', (e) => { e.preventDefault(); drop.classList.remove('over'); handleFile(e.dataTransfer.files[0]); });

      $('#species', el).addEventListener('change', (e) => {
        const s = speciesById(e.target.value);
        if (s) $('#type', el).value = s.type;
      });
      $('#estimate', el).onclick = () => {
        const s = speciesById($('#species', el).value);
        const L = parseFloat($('#length', el).value);
        if (!s) return toast('Seleziona la specie', 'warn');
        if (!(L > 0)) return toast('Inserisci la lunghezza in cm', 'warn');
        $('#weight', el).value = +toUnit(weightFromLength(s, L), unit).toFixed(1);
        toast('Peso stimato dalla relazione lunghezza-peso');
      };

      $('#form', el).addEventListener('submit', async (e) => {
        e.preventDefault();
        p.species = $('#species', el).value;
        p.type = $('#type', el).value;
        const w = parseFloat(String($('#weight', el).value).replace(',', '.'));
        p.weightKg = w > 0 ? Math.round(fromUnit(w, unit) * 100) / 100 : null;
        const L = parseFloat($('#length', el).value);
        p.lengthCm = L > 0 ? L : null;
        p.credit = $('#credit', el).value.trim();
        p.note = $('#note', el).value.trim();
        if (mode === 'url') {
          p.url = $('#url', el).value.trim();
          if (!/^https?:\/\//i.test(p.url)) return toast('Inserisci un indirizzo valido (https://…)', 'warn');
          if ($('#offline', el).checked && !p.data) {
            const btn = $('#save', el);
            btn.disabled = true;
            btn.textContent = 'Scarico…';
            try {
              p.data = await urlToDataUrl(p.url);
            } catch {
              toast('Il sito non consente la copia: salvo solo il link', 'warn');
            }
            btn.disabled = false;
            btn.textContent = 'Salva foto';
          } else if (!$('#offline', el).checked) {
            p.data = null;
          }
        } else if (!p.data) {
          return toast('Scegli un\'immagine dal dispositivo', 'warn');
        }
        if (!p.species) return toast('Indica la specie corretta', 'warn');
        try {
          await db.put('photos', p);
          await reloadData();
          toast(photo ? 'Foto aggiornata' : 'Foto aggiunta alla libreria', 'ok');
          close();
          onDone();
        } catch {
          toast('Spazio di archiviazione insufficiente', 'bad');
        }
      });
    },
  });
}

function importExport(onDone) {
  openSheet({
    title: 'Importa / esporta',
    body: `
      <p class="muted">Condividi la libreria con colleghi o trasferiscila su un altro dispositivo (iPhone, iPad, Android, computer).</p>
      <div class="stack">
        <button class="btn ghost block" id="exp">${icon.download}<span>Esporta libreria foto (.json)</span></button>
        <label class="btn ghost block file-btn">${icon.upload}<span>Importa libreria (.json)</span><input type="file" id="imp" accept="application/json,.json"></label>
        <button class="btn ghost block" id="demo2">${icon.image}<span>Aggiungi foto dimostrative (Wikimedia)</span></button>
      </div>`,
    onMount: (el, close) => {
      $('#exp', el).onclick = () => {
        download(`tunaid-foto-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify({ app: 'TunaID', version: 1, photos: state.photos }, null, 1));
        toast('Esportazione completata', 'ok');
      };
      $('#imp', el).onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        try {
          const json = JSON.parse(await file.text());
          const list = Array.isArray(json) ? json : json.photos;
          if (!Array.isArray(list)) throw new Error();
          let n = 0;
          for (const raw of list) {
            if (!raw || !speciesById(raw.species) || !(raw.url || raw.data)) continue;
            await db.put('photos', {
              id: raw.id || uid(),
              createdAt: raw.createdAt || Date.now(),
              url: typeof raw.url === 'string' ? raw.url : '',
              data: typeof raw.data === 'string' && raw.data.startsWith('data:image/') ? raw.data : null,
              species: raw.species,
              type: TYPES.some((t) => t.id === raw.type) ? raw.type : speciesById(raw.species).type,
              weightKg: raw.weightKg > 0 ? +raw.weightKg : null,
              lengthCm: raw.lengthCm > 0 ? +raw.lengthCm : null,
              credit: String(raw.credit || ''),
              note: String(raw.note || ''),
            });
            n++;
          }
          await reloadData();
          toast(`${n} foto importate`, 'ok');
          close();
          onDone();
        } catch {
          toast('File non valido', 'bad');
        }
      };
      $('#demo2', el).onclick = async () => {
        for (const d of DEMO_PHOTOS) {
          if (state.photos.some((p) => p.url === d.url)) continue;
          await db.put('photos', { id: uid(), createdAt: Date.now(), type: speciesById(d.species).type, weightKg: null, lengthCm: null, data: null, ...d });
        }
        await reloadData();
        toast('Foto dimostrative aggiunte', 'ok');
        close();
        onDone();
      };
    },
  });
}
