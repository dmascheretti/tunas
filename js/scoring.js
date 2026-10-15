// Calcolo del punteggio di una risposta.

export const POINTS = { species: 50, weight: 30, type: 20 };

/** Errore relativo percentuale tra stima e peso reale. */
export function weightError(guessKg, trueKg) {
  if (!(trueKg > 0) || !(guessKg >= 0)) return null;
  return (Math.abs(guessKg - trueKg) / trueKg) * 100;
}

/**
 * Punti per la stima del peso: pieni entro la tolleranza,
 * poi decrescono linearmente fino a zero al triplo della tolleranza.
 */
export function weightPoints(errPct, tolerance) {
  if (errPct == null) return 0;
  if (errPct <= tolerance) return POINTS.weight;
  const zeroAt = tolerance * 3;
  if (errPct >= zeroAt) return 0;
  return Math.round(POINTS.weight * (1 - (errPct - tolerance) / (zeroAt - tolerance)));
}

/**
 * Valuta una risposta.
 * @param {{species:string,type:string,weightKg?:number|null}} truth
 * @param {{species?:string,type?:string,weightKg?:number|null}} answer
 * @param {{tolerance:number, ask:{species:boolean,weight:boolean,type:boolean}}} opts
 */
export function scoreAnswer(truth, answer, { tolerance = 15, ask = { species: true, weight: true, type: true } } = {}) {
  const res = { points: 0, max: 0, species: null, type: null, weight: null, errPct: null };
  if (ask.species) {
    res.max += POINTS.species;
    res.species = answer.species === truth.species;
    if (res.species) res.points += POINTS.species;
  }
  if (ask.type) {
    res.max += POINTS.type;
    res.type = answer.type === truth.type;
    if (res.type) res.points += POINTS.type;
  }
  if (ask.weight && truth.weightKg > 0) {
    res.max += POINTS.weight;
    res.errPct = weightError(answer.weightKg, truth.weightKg);
    const wp = weightPoints(res.errPct, tolerance);
    res.weight = res.errPct != null && res.errPct <= tolerance;
    res.weightPts = wp;
    res.points += wp;
  }
  res.pct = res.max ? Math.round((res.points / res.max) * 100) : 0;
  return res;
}

export function grade(pct) {
  if (pct >= 90) return { label: 'Esperto', tone: 'ok' };
  if (pct >= 75) return { label: 'Avanzato', tone: 'ok' };
  if (pct >= 55) return { label: 'Intermedio', tone: 'warn' };
  return { label: 'Principiante', tone: 'bad' };
}

export const KG_PER_LB = 0.45359237;
export const toUnit = (kg, unit) => (unit === 'lb' ? kg / KG_PER_LB : kg);
export const fromUnit = (v, unit) => (unit === 'lb' ? v * KG_PER_LB : v);

export function fmtWeight(kg, unit = 'kg') {
  if (kg == null || Number.isNaN(kg)) return '—';
  const v = toUnit(kg, unit);
  const digits = v < 10 ? 1 : 0;
  return `${v.toLocaleString('it-IT', { maximumFractionDigits: digits, minimumFractionDigits: 0 })} ${unit}`;
}
