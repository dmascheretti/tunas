// Generatore di illustrazioni SVG realistiche-schematiche dei tunnidi,
// con metro di riferimento in centimetri per la stima di lunghezza e peso.

import { speciesById } from './species.js';

/** PRNG deterministico (mulberry32) per illustrazioni riproducibili. */
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const f = (n) => Math.round(n * 10) / 10;

// Profilo del corpo: semi-altezza normalizzata in funzione di x (0 = muso, 1 = forca)
function profile(x) {
  const peak = 0.38;
  if (x <= peak) {
    const u = (peak - x) / peak;
    return 0.06 + 0.94 * Math.pow(Math.max(0, 1 - u * u), 0.62);
  }
  const t = Math.min(1, (x - peak) / (0.9 - peak));
  return 0.085 + 0.915 * Math.pow(Math.cos((t * Math.PI) / 2), 1.25);
}

function bodyPoints(L, H, belly = 1.06) {
  const top = [];
  const bot = [];
  for (let i = 0; i <= 60; i++) {
    const x = (i / 60) * 0.9;
    const g = profile(x);
    top.push([x * L, (-H / 2) * g]);
    bot.push([x * L, (H / 2) * g * belly]);
  }
  return { top, bot };
}

const topY = (x, H) => (-H / 2) * profile(x);
const botY = (x, H) => (H / 2) * profile(x) * 1.06;

function smoothPath(points) {
  let d = `M${f(points[0][0])},${f(points[0][1])}`;
  for (let i = 1; i < points.length; i++) d += ` L${f(points[i][0])},${f(points[i][1])}`;
  return d;
}

function fishSvg(sp, L, opts) {
  const lk = sp.look;
  const H = lk.depth * L;
  const id = opts.uid;
  const { top, bot } = bodyPoints(L, H);
  const body = `${smoothPath(top)} ${bot
    .slice()
    .reverse()
    .map((p) => `L${f(p[0])},${f(p[1])}`)
    .join(' ')} Z`;

  const parts = [];
  // Coda lunata
  const pedX = 0.885 * L;
  parts.push(
    `<path d="M${f(pedX)},${f(-0.035 * H)} Q${f(0.95 * L)},${f(-0.07 * L)} ${f(1.085 * L)},${f(-0.17 * L)} Q${f(1.03 * L)},${f(-0.06 * L)} ${f(L)},0 Q${f(1.03 * L)},${f(0.06 * L)} ${f(1.085 * L)},${f(0.17 * L)} Q${f(0.95 * L)},${f(0.07 * L)} ${f(pedX)},${f(0.035 * H)} Z" fill="${lk.fin}" />`,
  );
  if (lk.tailEdge) {
    parts.push(
      `<path d="M${f(1.085 * L)},${f(-0.17 * L)} Q${f(1.03 * L)},${f(-0.06 * L)} ${f(L)},0 Q${f(1.03 * L)},${f(0.06 * L)} ${f(1.085 * L)},${f(0.17 * L)}" fill="none" stroke="${lk.tailEdge}" stroke-width="${f(L * 0.008)}" stroke-linecap="round"/>`,
    );
  }

  // Prima dorsale (spinosa)
  const d1s = 0.3;
  const d1e = lk.gap ? 0.4 : 0.47;
  parts.push(
    `<path d="M${f(d1s * L)},${f(topY(d1s, H) + 2)} L${f((d1s + 0.03) * L)},${f(topY(d1s + 0.03, H) - 0.1 * L)} Q${f((d1s + 0.07) * L)},${f(topY(d1s + 0.06, H) - 0.06 * L)} ${f(d1e * L)},${f(topY(d1e, H) - 0.006 * L)} L${f(d1e * L)},${f(topY(d1e, H) + 2)} Z" fill="${lk.fin}" opacity="0.95"/>`,
  );
  // Seconda dorsale e anale (falciformi)
  const d2s = 0.5;
  const d2h = lk.dorsal2 * L;
  parts.push(
    `<path d="M${f(d2s * L)},${f(topY(d2s, H) + 2)} Q${f((d2s + 0.02) * L)},${f(topY(d2s, H) - d2h * 0.7)} ${f((d2s + 0.02 + lk.dorsal2 * 0.45) * L)},${f(topY(d2s, H) - d2h)} Q${f((d2s + 0.05) * L)},${f(topY(d2s + 0.05, H) - d2h * 0.25)} ${f((d2s + 0.1) * L)},${f(topY(d2s + 0.1, H) + 2)} Z" fill="${lk.fin === lk.finlets ? lk.finlets : lk.fin}"/>`,
  );
  const as = 0.53;
  const ah = lk.anal * L;
  parts.push(
    `<path d="M${f(as * L)},${f(botY(as, H) - 2)} Q${f((as + 0.02) * L)},${f(botY(as, H) + ah * 0.7)} ${f((as + 0.02 + lk.anal * 0.45) * L)},${f(botY(as, H) + ah)} Q${f((as + 0.05) * L)},${f(botY(as + 0.05, H) + ah * 0.25)} ${f((as + 0.1) * L)},${f(botY(as + 0.1, H) - 2)} Z" fill="${lk.fin === lk.finlets ? lk.finlets : lk.fin}"/>`,
  );

  // Pinnule dorsali e ventrali
  const finlet = (x, y, dir) => {
    const w = 0.022 * L;
    const h = 0.03 * L * dir;
    return `<path d="M${f(x)},${f(y)} L${f(x + w)},${f(y - h)} L${f(x + w * 0.9)},${f(y)} Z" fill="${lk.finlets}" stroke="#1a1f2b" stroke-width="${f(L * 0.0018)}"/>`;
  };
  for (let i = 0; i < 9; i++) {
    const x = 0.64 + i * 0.028;
    parts.push(finlet(x * L, topY(x, H) + 1, 1));
  }
  for (let i = 0; i < 8; i++) {
    const x = 0.66 + i * 0.028;
    parts.push(finlet(x * L, botY(x, H) - 1, -1));
  }

  // Corpo
  parts.push(`<path d="${body}" fill="url(#g${id})" />`);

  // Decorazioni ritagliate sul corpo
  const deco = [];
  const r = opts.rand;
  if (lk.band) {
    deco.push(
      `<path d="M${f(0.08 * L)},${f(-0.06 * H)} C${f(0.3 * L)},${f(-0.14 * H)} ${f(0.6 * L)},${f(-0.1 * H)} ${f(0.9 * L)},0" stroke="${lk.band}" stroke-width="${f(H * 0.07)}" fill="none" opacity="0.75" stroke-linecap="round"/>`,
    );
  }
  switch (lk.pattern) {
    case 'spots':
      for (let i = 0; i < 26; i++) {
        const x = 0.25 + r() * 0.55;
        const y = 0.05 * H + r() * 0.3 * H * profile(x);
        deco.push(`<ellipse cx="${f(x * L)}" cy="${f(y)}" rx="${f(L * 0.006)}" ry="${f(L * 0.004)}" fill="#ffffff" opacity="0.55"/>`);
      }
      break;
    case 'bars':
      for (let i = 0; i < 14; i++) {
        const x = 0.28 + i * 0.04;
        deco.push(
          `<path d="M${f(x * L)},${f(0.05 * H)} l0,${f(0.28 * H * profile(x))}" stroke="#ffffff" stroke-width="${f(L * 0.004)}" stroke-dasharray="${f(L * 0.008)} ${f(L * 0.006)}" opacity="0.5"/>`,
        );
      }
      break;
    case 'ovals':
      for (let row = 0; row < 3; row++) {
        for (let i = 0; i < 10; i++) {
          const x = 0.32 + i * 0.05 + row * 0.02;
          const y = (0.18 + row * 0.1) * H * profile(x);
          deco.push(`<ellipse cx="${f(x * L)}" cy="${f(y)}" rx="${f(L * 0.012)}" ry="${f(L * 0.006)}" fill="#ffffff" opacity="0.45"/>`);
        }
      }
      break;
    case 'bellyStripes':
      for (let i = 0; i < 4; i++) {
        const y0 = (0.1 + i * 0.1) * H;
        deco.push(
          `<path d="M${f(0.24 * L)},${f(y0 * 0.9)} C${f(0.45 * L)},${f(y0 * 1.05)} ${f(0.7 * L)},${f(y0 * 0.6)} ${f(0.88 * L)},${f(y0 * 0.15)}" stroke="#2a3248" stroke-width="${f(H * 0.035)}" fill="none" opacity="0.8"/>`,
        );
      }
      break;
    case 'wavyBack':
      for (let i = 0; i < 9; i++) {
        const x = 0.45 + i * 0.048;
        let d = `M${f(x * L)},${f(topY(x, H) * 0.95)}`;
        for (let k = 1; k <= 4; k++) {
          const xx = x + k * 0.012 * (k % 2 ? 1 : -1) + k * 0.006;
          d += ` Q${f((x + 0.015 * (k % 2 ? 1 : -1)) * L)},${f(topY(x, H) * (1 - k * 0.12))} ${f(xx * L)},${f(topY(x, H) * (1 - k * 0.2))}`;
        }
        deco.push(`<path d="${d}" stroke="#0e1726" stroke-width="${f(L * 0.006)}" fill="none" opacity="0.85"/>`);
      }
      if (lk.dots) {
        for (let i = 0; i < 5; i++) {
          deco.push(`<circle cx="${f((0.22 + r() * 0.08) * L)}" cy="${f((0.12 + r() * 0.2) * H)}" r="${f(L * 0.007)}" fill="#151c28" opacity="0.8"/>`);
        }
      }
      break;
    case 'obliqueBack':
      for (let i = 0; i < 12; i++) {
        const x = 0.44 + i * 0.035;
        deco.push(
          `<path d="M${f(x * L)},${f(topY(x, H))} l${f(-0.012 * L)},${f(H * 0.32 * profile(x))}" stroke="#0e1726" stroke-width="${f(L * 0.006)}" opacity="0.8"/>`,
        );
      }
      break;
    case 'obliqueStripes':
      for (let i = 0; i < 9; i++) {
        const x = 0.24 + i * 0.07;
        deco.push(
          `<path d="M${f(x * L)},${f(topY(x, H))} L${f((x - 0.09) * L)},${f(-0.02 * H)}" stroke="#0f1a2c" stroke-width="${f(L * 0.007)}" opacity="0.75" stroke-linecap="round"/>`,
        );
      }
      break;
    default:
      break;
  }
  parts.push(`<g clip-path="url(#c${id})">${deco.join('')}</g>`);

  // Opercolo, bocca, occhio
  parts.push(
    `<path d="M${f(0.2 * L)},${f(topY(0.2, H) * 0.55)} Q${f(0.235 * L)},${f(0.05 * H)} ${f(0.19 * L)},${f(botY(0.19, H) * 0.75)}" stroke="#0b1220" stroke-opacity="0.45" stroke-width="${f(L * 0.004)}" fill="none"/>`,
  );
  parts.push(`<path d="M${f(0.005 * L)},${f(0.02 * H)} L${f(0.06 * L)},${f(0.06 * H)}" stroke="#0b1220" stroke-opacity="0.6" stroke-width="${f(L * 0.003)}"/>`);
  const er = lk.eye * L;
  parts.push(`<circle cx="${f(0.075 * L)}" cy="${f(-0.07 * H)}" r="${f(er)}" fill="#d9dde3" stroke="#3a4250" stroke-width="${f(L * 0.002)}"/>`);
  parts.push(`<circle cx="${f(0.073 * L)}" cy="${f(-0.07 * H)}" r="${f(er * 0.62)}" fill="#0b0f16"/>`);
  parts.push(`<circle cx="${f(0.069 * L)}" cy="${f(-0.08 * H)}" r="${f(er * 0.2)}" fill="#ffffff" opacity="0.8"/>`);

  // Pettorale e ventrale (sopra il corpo)
  const px = 0.24;
  const pl = lk.pect;
  parts.push(
    `<path d="M${f(px * L)},${f(0.0 * H)} Q${f((px + pl * 0.45) * L)},${f(-0.06 * H)} ${f((px + pl) * L)},${f(-0.02 * H)} Q${f((px + pl * 0.5) * L)},${f(0.06 * H)} ${f(px * L)},${f(0.1 * H)} Z" fill="${lk.fin}" opacity="0.92" stroke="#0b1220" stroke-opacity="0.25" stroke-width="${f(L * 0.002)}"/>`,
  );
  parts.push(
    `<path d="M${f(0.27 * L)},${f(botY(0.27, H) * 0.85)} L${f(0.33 * L)},${f(botY(0.3, H) + 0.03 * L)} L${f(0.31 * L)},${f(botY(0.3, H) * 0.95)} Z" fill="${lk.fin}" opacity="0.9"/>`,
  );
  if (lk.keel) {
    parts.push(`<ellipse cx="${f(0.88 * L)}" cy="0" rx="${f(0.025 * L)}" ry="${f(0.008 * L)}" fill="${lk.keel}"/>`);
  }

  const defs = `<linearGradient id="g${id}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${lk.back}"/>
      <stop offset="0.38" stop-color="${lk.back}"/>
      <stop offset="0.55" stop-color="${lk.side}"/>
      <stop offset="0.78" stop-color="${lk.belly}"/>
      <stop offset="1" stop-color="${lk.belly}"/>
    </linearGradient>
    <clipPath id="c${id}"><path d="${body}"/></clipPath>`;
  return { defs, body: parts.join(''), H };
}

const SCENES = [
  { name: 'oceano', bg: ['#0d4f7a', '#083555'], floor: null },
  { name: 'banco', bg: ['#c9cfd6', '#9aa4ae'], floor: '#b7bfc8' },
  { name: 'ponte', bg: ['#8a6a4a', '#6b4f36'], floor: '#7b5d40' },
  { name: 'ghiaccio', bg: ['#e7f1f7', '#c3d8e6'], floor: '#d6e6f0' },
];

/**
 * Crea un "esemplare" simulato riproducibile.
 * @returns {{species:string,lengthCm:number,weightKg:number,seed:number}}
 */
export function makeSpecimen(speciesId, seed) {
  const sp = speciesById(speciesId);
  const r = rng(seed);
  const [lo, hi] = sp.len;
  // distribuzione che favorisce le taglie centrali
  const u = (r() + r()) / 2;
  const lengthCm = Math.round(lo + u * (hi - lo));
  const condition = 0.92 + r() * 0.16;
  const weightKg = sp.lw.a * Math.pow(lengthCm, sp.lw.b) * condition;
  return { species: speciesId, lengthCm, weightKg: Math.round(weightKg * 10) / 10, seed };
}

/**
 * Restituisce il markup SVG di una scena con l'esemplare e un metro graduato.
 */
export function specimenSvg(spec, { showRuler = true, plain = false } = {}) {
  const sp = speciesById(spec.species);
  const r = rng(spec.seed * 7 + 3);
  const W = 1000;
  const Hs = 600;
  const scene = plain ? null : SCENES[Math.floor(r() * SCENES.length)];
  const Lpx = plain ? 820 : 560 + r() * 160;
  const rulerCm = Math.ceil((spec.lengthCm * 1.12) / 10) * 10;
  const span = Math.max(Lpx * 1.09, (rulerCm * Lpx) / spec.lengthCm);
  const x0 = plain ? 60 : 50 + r() * Math.max(0, W - span - 80);
  const cy = plain ? 250 : 250 + (r() - 0.5) * 40;
  const tilt = plain ? 0 : (r() - 0.5) * 4;
  const uid = `${spec.species}${spec.seed}`.replace(/[^a-z0-9]/gi, '');
  const fish = fishSvg(sp, Lpx, { uid, rand: r });

  let bg = '';
  if (scene) {
    bg += `<defs><linearGradient id="bg${uid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${scene.bg[0]}"/><stop offset="1" stop-color="${scene.bg[1]}"/></linearGradient></defs>`;
    bg += `<rect width="${W}" height="${Hs}" fill="url(#bg${uid})"/>`;
    if (scene.name === 'ponte') {
      for (let i = 0; i < 9; i++) bg += `<rect x="0" y="${i * 68}" width="${W}" height="66" fill="${i % 2 ? '#7a5c3f' : '#83644a'}"/><line x1="0" x2="${W}" y1="${i * 68 + 66}" y2="${i * 68 + 66}" stroke="#4d3826" stroke-width="2"/>`;
    } else if (scene.name === 'banco') {
      for (let i = 0; i < 40; i++) bg += `<line x1="${i * 26}" y1="0" x2="${i * 26 - 80}" y2="${Hs}" stroke="#ffffff" stroke-opacity="0.08" stroke-width="2"/>`;
    } else if (scene.name === 'ghiaccio') {
      for (let i = 0; i < 70; i++) {
        bg += `<rect x="${f(r() * W)}" y="${f(r() * Hs)}" width="${f(14 + r() * 26)}" height="${f(10 + r() * 20)}" rx="5" fill="#ffffff" opacity="${f(0.25 + r() * 0.4)}" transform="rotate(${f(r() * 60)})"/>`;
      }
    } else {
      for (let i = 0; i < 8; i++) bg += `<path d="M0,${60 + i * 70} Q250,${40 + i * 70} 500,${60 + i * 70} T1000,${60 + i * 70}" stroke="#ffffff" stroke-opacity="0.06" stroke-width="3" fill="none"/>`;
    }
  } else {
    bg = '';
  }

  const shadow = scene && scene.name !== 'oceano'
    ? `<ellipse cx="${f(x0 + Lpx * 0.5)}" cy="${f(cy + fish.H * 0.62)}" rx="${f(Lpx * 0.5)}" ry="${f(fish.H * 0.12)}" fill="#000" opacity="0.18"/>`
    : '';

  let ruler = '';
  if (showRuler) {
    const pxPerCm = Lpx / spec.lengthCm;
    const totalCm = rulerCm;
    let minor = 1;
    let label = 10;
    if (totalCm > 160) { minor = 10; label = 50; } else if (totalCm > 60) { minor = 5; label = 10; } else if (totalCm > 30) { minor = 1; label = 5; }
    const ry = plain ? 470 : Math.min(Hs - 70, cy + fish.H * 0.5 + 0.22 * Lpx);
    const rw = totalCm * pxPerCm;
    ruler += `<g transform="translate(${f(x0)},${f(ry)})">`;
    ruler += `<rect x="-6" y="-4" width="${f(rw + 12)}" height="46" rx="4" fill="#f6d84a" stroke="#6b5a12" stroke-width="1.5"/>`;
    for (let c = 0; c <= totalCm; c += minor) {
      const x = c * pxPerCm;
      const big = c % label === 0;
      ruler += `<line x1="${f(x)}" x2="${f(x)}" y1="-4" y2="${big ? 18 : 8}" stroke="#2b2408" stroke-width="${big ? 2 : 1}"/>`;
      if (big) ruler += `<text x="${f(x)}" y="35" font-size="15" font-family="system-ui,sans-serif" font-weight="600" text-anchor="middle" fill="#2b2408">${c}</text>`;
    }
    ruler += `<text x="${f(rw + 2)}" y="35" font-size="12" font-family="system-ui,sans-serif" text-anchor="end" fill="#2b2408" dx="-2" opacity="0">cm</text>`;
    ruler += `</g>`;
    ruler += `<text x="${f(x0 - 2)}" y="${f(ry - 10)}" font-size="13" font-family="system-ui,sans-serif" fill="${scene && (scene.name === 'oceano' || scene.name === 'ponte') ? '#ffffff' : '#1d2633'}" opacity="0.85">metro (cm) · lo zero è allineato al muso</text>`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${Hs}" role="img" aria-label="Esemplare da identificare" preserveAspectRatio="xMidYMid meet">
${bg}
<defs>${fish.defs}</defs>
${shadow}
<g transform="translate(${f(x0)},${f(cy)}) rotate(${f(tilt)})">${fish.body}</g>
${ruler}
</svg>`;
}

/** Ritratto della specie per il catalogo (senza scena). */
export function speciesPortrait(speciesId) {
  const sp = speciesById(speciesId);
  const uid = `p${speciesId}`;
  const L = 820;
  const fish = fishSvg(sp, L, { uid, rand: rng(42) });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 380" role="img" aria-label="${sp.name}"><defs>${fish.defs}</defs><g transform="translate(70,190)">${fish.body}</g></svg>`;
}
