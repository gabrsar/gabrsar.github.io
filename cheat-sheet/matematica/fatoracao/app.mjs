import { factorQuadratic } from './factor-math.mjs';

const examples = {
  common: { original: '6x² + 12x', steps: [
    ['Encontre o que aparece nos dois termos: o número 6 e pelo menos um x.', '6x · x + 6x · 2'],
    ['Coloque 6x em evidência. Cada termo é dividido por esse fator.', '6x(x + 2)'],
    ['Confira distribuindo o 6x de volta. Os dois termos reaparecem.', '6x · x + 6x · 2 = 6x² + 12x']
  ] },
  group: { original: 'x³ + 2x² + 3x + 6', steps: [
    ['Separe em dois grupos. A escolha precisa revelar o mesmo fator depois.', '(x³ + 2x²) + (3x + 6)'],
    ['Tire x² do primeiro grupo e 3 do segundo.', 'x²(x + 2) + 3(x + 2)'],
    ['Agora (x + 2) é o fator comum. Coloque o parêntese inteiro em evidência.', '(x² + 3)(x + 2)'],
    ['O fator x² + 3 não se decompõe em fatores lineares reais. Confira a expansão.', 'x³ + 2x² + 3x + 6']
  ] },
  difference: { original: '9x² − 25', steps: [
    ['Os dois termos são quadrados: 9x² = (3x)² e 25 = 5².', '(3x)² − 5²'],
    ['Use A² − B² = (A − B)(A + B), com A = 3x e B = 5.', '(3x − 5)(3x + 5)'],
    ['Ao expandir, os termos do meio se anulam.', '9x² + 15x − 15x − 25 = 9x² − 25']
  ] },
  square: { original: '4x² − 12x + 9', steps: [
    ['Os extremos são quadrados: (2x)² e 3². Só isso ainda não basta.', '(2x)² − 12x + 3²'],
    ['Confira o termo do meio: ele é −2 · 2x · 3 = −12x.', '(2x)² − 2 · 2x · 3 + 3²'],
    ['O padrão é A² − 2AB + B². O sinal negativo vai para o parêntese.', '(2x − 3)²'],
    ['Confira multiplicando os dois parênteses iguais.', '(2x − 3)(2x − 3) = 4x² − 12x + 9']
  ] },
  trinomial: { original: 'x² + 5x + 6', steps: [
    ['Procure dois números cuja soma seja 5 e cujo produto seja 6.', 'm + n = 5; mn = 6'],
    ['Os pares inteiros positivos de 6 são 1 e 6, ou 2 e 3. Só o segundo soma 5.', '2 + 3 = 5; 2 · 3 = 6'],
    ['Coloque os dois números nos fatores, com os sinais encontrados.', '(x + 2)(x + 3)'],
    ['Confira: as parcelas 3x e 2x se juntam no termo do meio.', 'x² + 3x + 2x + 6 = x² + 5x + 6']
  ] },
  'cubes-plus': { original: 'x³ + 8', steps: [
    ['Reconheça os cubos: x³ e 2³. A fórmula de quadrados não serve aqui.', 'x³ + 2³'],
    ['Use A³ + B³ = (A + B)(A² − AB + B²). O sinal do meio é negativo.', '(x + 2)(x² − 2x + 4)'],
    ['Confira expandindo. As parcelas em x² e em x se anulam.', 'x³ − 2x² + 4x + 2x² − 4x + 8 = x³ + 8']
  ] },
  'cubes-minus': { original: 'x³ − 27', steps: [
    ['Reconheça os cubos: x³ e 3³.', 'x³ − 3³'],
    ['Use A³ − B³ = (A − B)(A² + AB + B²). O segundo fator tem sinais positivos.', '(x − 3)(x² + 3x + 9)'],
    ['Confira expandindo. Novamente, as parcelas do meio se anulam.', 'x³ + 3x² + 9x − 3x² − 9x − 27 = x³ − 27']
  ] },
  combined: { original: '2x³ − 18x', steps: [
    ['Comece pelo fator comum: os dois termos têm 2x.', '2x(x² − 9)'],
    ['Olhe de novo para dentro do parêntese: x² − 9 é uma diferença de quadrados.', '2x(x² − 3²)'],
    ['Fatore a diferença de quadrados. Não perca o 2x que já estava do lado de fora.', '2x(x − 3)(x + 3)'],
    ['Confira em duas partes: primeiro os parênteses, depois o fator 2x.', '2x(x² − 9) = 2x³ − 18x']
  ] }
};

const picker = document.querySelector('#example-case');
let step = 1;
function renderExample() {
  const example = examples[picker.value];
  document.querySelector('#example-original').textContent = example.original;
  const list = document.querySelector('#example-steps');
  list.replaceChildren(...example.steps.slice(0, step).map(([explanation, formula]) => {
    const item = document.createElement('li');
    const text = document.createElement('p'); text.textContent = explanation;
    const equation = document.createElement('p'); equation.className = 'equation'; equation.textContent = formula;
    item.append(text, equation); return item;
  }));
  document.querySelector('#step-count').textContent = `Etapa ${step} de ${example.steps.length}`;
  document.querySelector('#previous').disabled = step === 1;
  document.querySelector('#next').disabled = step === example.steps.length;
}
picker.addEventListener('change', () => { step = 1; renderExample(); });
document.querySelector('#previous').addEventListener('click', () => { step--; renderExample(); });
document.querySelector('#next').addEventListener('click', () => { step++; renderExample(); });

const form = document.querySelector('#quadratic-form');
const result = document.querySelector('#quadratic-result');
function renderQuadratic() {
  const values = ['a', 'b', 'c'].map(name => form.elements[name].valueAsNumber);
  let factor;
  try { factor = factorQuadratic(...values); }
  catch (error) { result.textContent = error.message; return; }
  const heading = document.createElement('h3');
  heading.textContent = factor.kind === 'irreducible' ? 'Até onde dá para fatorar nos reais' : 'A mesma expressão, fatorada';
  const original = document.createElement('p'); original.className = 'equation result-original'; original.textContent = factor.original;
  const equation = document.createElement('p'); equation.className = 'equation'; equation.textContent = `= ${factor.factorization}`;
  const steps = document.createElement('ol');
  factor.steps.forEach(text => { const li = document.createElement('li'); li.textContent = text; steps.append(li); });
  const note = document.createElement('p'); note.className = 'result-note'; note.textContent = factor.note;
  result.replaceChildren(heading, original, equation, steps, note);
}
form.addEventListener('submit', event => { event.preventDefault(); renderQuadratic(); });
document.querySelectorAll('[data-coefs]').forEach(button => button.addEventListener('click', () => {
  const coefficients = button.dataset.coefs.split(',');
  ['a', 'b', 'c'].forEach((name, i) => { form.elements[name].value = coefficients[i]; });
  renderQuadratic();
}));
document.querySelector('#print').addEventListener('click', () => window.print());
renderExample();
renderQuadratic();
document.querySelector('#worked-examples').hidden = false;
document.querySelector('#quadratic-lab').hidden = false;
