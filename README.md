# TunaID – Identificazione tonni

Web app professionale (PWA) per allenarsi a riconoscere i tonni da fotografia:
per ogni immagine l'utente deve indicare **specie**, **peso stimato** e **tipologia** commerciale.
Funziona su iPhone, iPad, Android e computer, si installa sulla schermata Home e lavora anche offline.

## Funzionalità

- **Tre modalità di quiz**
  - *Allenamento*: domande illimitate, correzione immediata con i caratteri distintivi della specie.
  - *Esame*: 5–30 domande, timer opzionale per domanda, voto finale e revisione.
  - *Riconoscimento rapido*: 20 immagini, 15 secondi ciascuna, solo specie.
- **Due livelli**: Base (8 specie comuni nel Mediterraneo) ed Esperto (13 specie).
- **Immagini**
  - Illustrazioni generate dall'app per 13 specie, con metro graduato in cm per stimare lunghezza e peso.
  - **Libreria foto**: aggiungi foto prese da Internet (incollando il link) o dal dispositivo
    (galleria/fotocamera), con la risposta corretta (specie, tipologia, peso, lunghezza, fonte).
    Le foto da link possono essere salvate offline quando il sito lo consente.
  - Importazione/esportazione della libreria in JSON per condividerla con i colleghi.
- **Punteggio**: specie 50 pt, peso 30 pt (pieni entro la tolleranza impostabile, default ±15%), tipologia 20 pt.
  Per le foto senza peso noto il peso non viene valutato.
- **Catalogo specie** con scheda, caratteri distintivi, curva lunghezza→peso interattiva.
- **Strumenti**: calcolatore lunghezza↔peso e chiave di identificazione guidata.
- **Statistiche**: andamento, precisione per specie, confusioni più frequenti, storico sessioni.
- **Impostazioni**: kg/lb, tolleranza, tema chiaro/scuro/automatico, vibrazione, backup/ripristino completo.

### Tipologie

| Tipologia | Specie |
|---|---|
| Tonno maggiore | tonno rosso (atlantico, del Pacifico, del sud), pinne gialle, obeso |
| Tonno medio | alalunga, tonno pinna nera, tonno indiano |
| Tonnetto / tunnide minore | tonnetto striato, alletterato, tombarello, biso, palamita |

## Avvio

Non serve alcuna compilazione: è HTML/CSS/JavaScript puro.

```bash
npm start          # oppure: python3 -m http.server 8080
# apri http://localhost:8080
npm test           # test unitari (Node 18+)
```

Per usarla da telefono/tablet pubblicala su un hosting HTTPS. Il workflow
`.github/workflows/pages.yml` la pubblica su **GitHub Pages** a ogni push su `main`
(abilita Pages in *Settings → Pages → Source: GitHub Actions*).

**Installazione** — iPhone/iPad: Safari → Condividi → *Aggiungi alla schermata Home*.
Android: Chrome → menu ⋮ → *Installa app*.

## Note

- I dati (foto, statistiche, impostazioni) restano sul dispositivo (IndexedDB / localStorage).
- Le relazioni lunghezza-peso sono valori indicativi da letteratura (ICCAT, FishBase) e servono
  all'addestramento, non alla certificazione del pescato.
- Le foto dimostrative caricabili dalla libreria provengono da Wikimedia Commons (pubblico dominio, NOAA);
  rispetta sempre la licenza delle immagini che aggiungi.
