import test from 'node:test';
import assert from 'node:assert/strict';
import { factorQuadratic as factor, polynomial } from '../cheat-sheet/matematica/fatoracao/factor-math.mjs';

test('common factors, signs, rational denominators and repeated roots', () => {
  for (const [coefs, expected] of [
    [[1, 5, 6], '(x + 2)(x + 3)'],
    [[2, 7, 3], '(2x + 1)(x + 3)'],
    [[6, 21, 9], '3(2x + 1)(x + 3)'],
    [[4, -12, 9], '(2x − 3)²'],
    [[-4, 12, -9], '−(2x − 3)²'],
    [[-6, -21, -9], '−3(2x + 1)(x + 3)'],
    [[1, 0, -9], '(x − 3)(x + 3)'],
    [[6, 12, 0], '6x(x + 2)'],
    [[3, 0, 0], '3x²'],
    [[-1, 0, 0], '−x²'],
    [[1, 0, -2], '(x − √2)(x + √2)'],
    [[2, 2, -1], '2(x + 1/2 − √3/2)(x + 1/2 + √3/2)'],
    [[-2, -2, 1], '−2(x + 1/2 − √3/2)(x + 1/2 + √3/2)'],
    [[1, 0, -8], '(x − 2√2)(x + 2√2)'],
    [[0, -6, 12], '−6(x − 2)'],
    [[0, 2, 3], '(2x + 3)'],
  ]) assert.equal(factor(...coefs).factorization, expected, coefs.join(','));
});

test('irreducible real quadratics retain extracted content', () => {
  assert.equal(factor(1, 0, 1).kind, 'irreducible');
  assert.equal(factor(6, 0, 6).factorization, '6(x² + 1)');
  assert.equal(factor(-1, 0, -1).factorization, '−(x² + 1)');
  assert.equal(factor(0, 0, 0).kind, 'constant');
  assert.equal(factor(0, 0, -5).factorization, '−5');
});

test('rejects incomplete, noninteger and out-of-range coefficients', () => {
  for (const value of [NaN, Infinity, 0.5, 100, -100, '', undefined]) {
    assert.throws(() => factor(value, 1, 2), RangeError);
  }
});

test('factor metadata reconstructs coefficients across signs, zeros and bounds', () => {
  const sample = [-99, -17, -9, -6, -3, -2, -1, 0, 1, 2, 3, 6, 9, 17, 99];
  const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-8, `${actual} vs ${expected}`);
  for (const a of sample) for (const b of sample) for (const c of sample) {
    const f = factor(a, b, c);
    if (!a) continue;
    assert.equal(f.originalDelta, b * b - 4 * a * c);
    assert.deepEqual(f.primitive.map(v => v * f.content || 0), [a, b, c]);
    if (f.kind === 'irreducible') { assert.ok(f.originalDelta < 0); continue; }
    let r1, r2;
    if (f.roots) {
      const [p, q] = f.roots;
      assert.equal(f.scale * p.denominator * q.denominator, a);
      near(-f.scale * (p.numerator * q.denominator + q.numerator * p.denominator), b);
      near(f.scale * p.numerator * q.numerator, c);
      [r1, r2] = f.roots.map(r => r.numerator / r.denominator);
    } else {
      const {offset, coefficient, inside, denominator} = f.radical;
      r1 = (offset + coefficient * Math.sqrt(inside)) / denominator;
      r2 = (offset - coefficient * Math.sqrt(inside)) / denominator;
    }
    near(-a * (r1 + r2), b);
    near(a * r1 * r2, c);
    for (const x of [-4, 0, 1, 2.5]) near(a * (x - r1) * (x - r2), a * x * x + b * x + c);
  }
});

test('polynomial formatting keeps unit coefficients, zero terms and signs clear', () => {
  assert.equal(polynomial(-1, 1, -1), '−x² + x − 1');
  assert.equal(polynomial(0, 0, 0), '0');
  assert.equal(polynomial(0, -1, 3), '−x + 3');
});
