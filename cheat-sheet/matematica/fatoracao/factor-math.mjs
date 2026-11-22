// Exact arithmetic for bounded integer coefficients. No expression evaluation.
export function gcd(a, b) {
  a = Math.abs(a); b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a;
}

export function fraction(numerator, denominator) {
  if (denominator < 0) { numerator *= -1; denominator *= -1; }
  const divisor = gcd(numerator, denominator);
  return { numerator: numerator / divisor, denominator: denominator / divisor };
}

export function fractionText({ numerator, denominator }) {
  return String(numerator).replace('-', '−') + (denominator === 1 ? '' : `/${denominator}`);
}

export function polynomial(a, b, c) {
  return [[a, 'x²'], [b, 'x'], [c, '']].filter(([v]) => v !== 0).map(([v, power], i) => {
    const sign = v < 0 ? (i ? ' − ' : '−') : (i ? ' + ' : '');
    return sign + (Math.abs(v) === 1 && power ? '' : Math.abs(v)) + power;
  }).join('') || '0';
}

function linearFactor(root) {
  const { numerator: n, denominator: d } = root;
  const variable = d === 1 ? 'x' : `${d}x`;
  if (n === 0) return variable;
  return `(${variable} ${n < 0 ? '+' : '−'} ${Math.abs(n)})`;
}

function radicalParts(value) {
  let outside = 1;
  for (let k = 2; k * k <= value; k++) {
    while (value % (k * k) === 0) { outside *= k; value /= k * k; }
  }
  return { outside, inside: value };
}

export function factorQuadratic(a, b, c) {
  if (![a, b, c].every(n => Number.isInteger(n) && Math.abs(n) <= 99)) {
    throw new RangeError('Use coeficientes inteiros entre −99 e 99.');
  }
  const original = polynomial(a, b, c);
  if (a === 0) {
    if (b === 0) return { kind: 'constant', original, factorization: String(c).replace('-', '−'), steps: [c === 0 ? 'A expressão é zero para todo x. Não há um trinômio para fatorar.' : 'A expressão é uma constante: não tem termo com x.'], note: 'Para explorar um polinômio do 2º grau, escolha a diferente de zero.' };
    const root = fraction(-c, b);
    const content = gcd(b, c) * Math.sign(b);
    const factor = linearFactor(fraction(-c / content, b / content));
    const factorization = (content === 1 ? '' : content === -1 ? '−' : String(content).replace('-', '−')) + factor;
    return { kind: 'linear', original, factorization, roots: [root], steps: ['Como a = 0, a expressão tem grau 1.', `Extraia o fator numérico comum: ${factorization}.`, `A raiz é x = ${fractionText(root)}.`], note: 'Para explorar um polinômio do 2º grau, escolha a diferente de zero.' };
  }
  const content = gcd(gcd(a, b), c) * Math.sign(a);
  const A = a / content, B = b / content, C = c / content;
  const delta = B * B - 4 * A * C;
  const originalDelta = b * b - 4 * a * c;
  const prefix = content === 1 ? '' : content === -1 ? '−' : String(content).replace('-', '−');
  const steps = [];
  if (content !== 1) steps.push(`Coloque ${String(content).replace('-', '−')} em evidência: ${prefix}(${polynomial(A, B, C)}).`);
  steps.push(`Calcule Δ na expressão ${content !== 1 ? 'dentro dos parênteses' : 'original'}: (${B})² − 4 · ${A} · (${C}) = ${delta}.`.replaceAll('(-', '(−').replaceAll('= -', '= −'));
  if (delta < 0) {
    const factorization = content === 1 ? original : `${prefix}(${polynomial(A, B, C)})`;
    steps.push('Δ < 0: não existem raízes reais, então o fator quadrático não se decompõe em fatores lineares reais.');
    return { kind: 'irreducible', original, factorization, delta, originalDelta, content, primitive: [A, B, C], steps, note: 'Sem fatores lineares nos reais. Nos complexos, a fatoração seria diferente.' };
  }
  const sqrt = Math.sqrt(delta);
  if (Number.isInteger(sqrt)) {
    const roots = [fraction(-B + sqrt, 2 * A), fraction(-B - sqrt, 2 * A)];
    const factors = roots.map(linearFactor);
    // For a primitive integer quadratic with rational roots, the product of
    // reduced root denominators is its positive leading coefficient (Gauss).
    const scale = content * A / (roots[0].denominator * roots[1].denominator);
    const scaleText = scale === 1 ? '' : scale === -1 ? '−' : String(scale).replace('-', '−');
    const same = delta === 0;
    const product = same ? `${factors[0]}²` : factors.join(factors.every(f => f === 'x') ? ' · ' : '');
    const factorization = scaleText + product;
    steps.push(same ? `Δ = 0: a raiz dupla é x = ${fractionText(roots[0])}.` : `As raízes são x₁ = ${fractionText(roots[0])} e x₂ = ${fractionText(roots[1])}.`);
    steps.push(`Use a(x − x₁)(x − x₂) e reúna os coeficientes para obter ${factorization}.`);
    return { kind: same ? 'repeated' : 'rational', original, factorization, delta, originalDelta, content, primitive: [A, B, C], roots, scale, steps, note: 'Confira expandindo o produto. A expressão fatorada vale para todo x real.' };
  }
  const { outside, inside } = radicalParts(delta);
  const divisor = gcd(gcd(B, outside), 2 * A);
  const offset = -B / divisor, radicalCoefficient = outside / divisor, denominator = 2 * A / divisor;
  const radical = `${radicalCoefficient === 1 ? '' : radicalCoefficient}√${inside}`;
  const numerator = offset === 0 ? `± ${radical}` : `${String(offset).replace('-', '−')} ± ${radical}`;
  const rootsText = denominator === 1 ? numerator : `(${numerator}) / ${denominator}`;
  const factorOffset = B / divisor;
  const body = factorOffset === 0 ? 'x' : `x ${factorOffset > 0 ? '+' : '−'} ${denominator === 1 ? Math.abs(factorOffset) : `${Math.abs(factorOffset)}/${denominator}`}`;
  const rootTerm = radical + (denominator === 1 ? '' : `/${denominator}`);
  const factorization = `${a === 1 ? '' : a === -1 ? '−' : String(a).replace('-', '−')}(${body} − ${rootTerm})(${body} + ${rootTerm})`;
  steps.push(`Δ > 0, mas √Δ não é inteiro. As raízes exatas são x₁, x₂ = ${rootsText}.`);
  steps.push('Substitua as raízes em a(x − x₁)(x − x₂). Os radicais ficam na resposta para preservar a igualdade exata.');
  return { kind: 'irrational', original, factorization, delta, originalDelta, content, primitive: [A, B, C], radical: { offset, coefficient: radicalCoefficient, inside, denominator }, steps, note: 'Há fatores lineares reais, mas não fatores lineares com todos os coeficientes racionais.' };
}
