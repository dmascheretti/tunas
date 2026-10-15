import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scoreAnswer, weightError, weightPoints, fmtWeight, fromUnit } from '../js/scoring.js';
import { SPECIES, weightFromLength, lengthFromWeight } from '../js/species.js';
import { makeSpecimen, specimenSvg } from '../js/fish.js';

test('errore percentuale del peso', () => {
  assert.equal(weightError(110, 100), 10);
  assert.equal(weightError(90, 100), 10);
  assert.equal(weightError(10, 0), null);
});

test('punti peso: pieni entro tolleranza, zero oltre il triplo', () => {
  assert.equal(weightPoints(10, 15), 30);
  assert.equal(weightPoints(15, 15), 30);
  assert.equal(weightPoints(30, 15), 15);
  assert.equal(weightPoints(45, 15), 0);
  assert.equal(weightPoints(null, 15), 0);
});

test('risposta perfetta = 100%', () => {
  const r = scoreAnswer({ species: 'thynnus', type: 'maggiore', weightKg: 200 }, { species: 'thynnus', type: 'maggiore', weightKg: 205 });
  assert.equal(r.points, 100);
  assert.equal(r.pct, 100);
});

test('foto senza peso: il peso non entra nel massimo', () => {
  const r = scoreAnswer({ species: 'pelamis', type: 'minore', weightKg: null }, { species: 'pelamis', type: 'medio', weightKg: 3 });
  assert.equal(r.max, 70);
  assert.equal(r.points, 50);
  assert.equal(r.weight, null);
});

test('modalità solo specie', () => {
  const r = scoreAnswer({ species: 'sarda', type: 'minore', weightKg: 2 }, { species: 'rochei' }, { ask: { species: true, weight: false, type: false } });
  assert.equal(r.max, 50);
  assert.equal(r.pct, 0);
});

test('relazioni lunghezza-peso plausibili e invertibili', () => {
  for (const s of SPECIES) {
    const mid = (s.len[0] + s.len[1]) / 2;
    const w = weightFromLength(s, mid);
    assert.ok(w > 0.05 && w < s.maxKg, `${s.id}: ${w}`);
    assert.ok(Math.abs(lengthFromWeight(s, w) - mid) < 0.01);
  }
});

test('esemplari simulati riproducibili e SVG valido', () => {
  const a = makeSpecimen('albacares', 123);
  const b = makeSpecimen('albacares', 123);
  assert.deepEqual(a, b);
  const svg = specimenSvg(a);
  assert.match(svg, /^<svg[\s\S]*<\/svg>$/);
});

test('conversione unità', () => {
  assert.equal(fmtWeight(12.34, 'kg'), '12 kg');
  assert.equal(fmtWeight(2.34, 'kg'), '2,3 kg');
  assert.ok(Math.abs(fromUnit(10, 'lb') - 4.5359237) < 1e-9);
});
