export const EPSILON = 1e-10;
export const TAU = 2 * Math.PI;
export const normalize = degrees => ((degrees % 360) + 360) % 360;
export function trigValues(degrees) {
  const radians = normalize(degrees) * Math.PI / 180;
  const clean = value => Math.abs(value) < EPSILON ? 0 : value;
  const sin = clean(Math.sin(radians)), cos = clean(Math.cos(radians));
  return {sin, cos, tan: cos === 0 ? null : sin / cos,
    cot: sin === 0 ? null : cos / sin, sec: cos === 0 ? null : 1 / cos,
    csc: sin === 0 ? null : 1 / sin};
}
export const FUNCTIONS = [
  {key:'sin',name:'Seno',short:'sen',formula:'sen θ = y',description:'É a altura do ponto no círculo. Acima do eixo horizontal, o seno é positivo; abaixo, negativo. No triângulo retângulo, é cateto oposto ÷ hipotenusa. Aqui a hipotenusa vale 1.',geometry:'O segmento vertical liga a projeção no eixo x ao ponto P.',domain:'Todos os ângulos',range:'[−1, 1]',period:360,limit:1.25,poles:[]},
  {key:'cos',name:'Cosseno',short:'cos',formula:'cos θ = x',description:'É a posição horizontal do ponto. À direita da origem, o cosseno é positivo; à esquerda, negativo. No triângulo retângulo, é cateto adjacente ÷ hipotenusa. Aqui a hipotenusa vale 1.',geometry:'O segmento horizontal liga a origem à projeção de P no eixo x.',domain:'Todos os ângulos',range:'[−1, 1]',period:360,limit:1.25,poles:[]},
  {key:'tan',name:'Tangente',short:'tg',formula:'tg θ = sen θ / cos θ = y / x',description:'É a inclinação da reta que passa pela origem e por P: quanto ela sobe para cada unidade que avança em x. Fica indefinida quando o cosseno é zero. Perto desses ângulos, seu módulo cresce sem limite.',geometry:'Prolongue a reta OP até x = 1. A altura da interseção T é a tangente, inclusive quando a reta precisa ser prolongada no sentido oposto a P.',domain:'cos θ ≠ 0',range:'Todos os reais',period:180,limit:4,poles:[90,270]},
  {key:'cot',name:'Cotangente',short:'cotg',formula:'cotg θ = cos θ / sen θ = x / y',description:'É quanto a reta avança em x para cada unidade que sobe em y. É o recíproco da tangente onde ambas estão definidas e a tangente não é zero. Quando o seno é zero, a cotangente é indefinida.',geometry:'Prolongue a reta OP até y = 1. A coordenada horizontal da interseção U é a cotangente.',domain:'sen θ ≠ 0',range:'Todos os reais',period:180,limit:4,poles:[0,180,360]},
  {key:'sec',name:'Secante',short:'sec',formula:'sec θ = 1 / cos θ',description:'É o recíproco do cosseno e tem o mesmo sinal que ele. Seu módulo nunca é menor que 1. Se o cosseno é zero, a secante é indefinida. Não confunda secante com arco cosseno: uma é recíproco, o outro é função inversa.',geometry:'Na reta OP, o segmento da origem até T, em x = 1, tem módulo |sec θ|. O sinal é positivo no sentido de P e negativo no sentido oposto.',domain:'cos θ ≠ 0',range:'(−∞, −1] ∪ [1, ∞)',period:360,limit:4,poles:[90,270]},
  {key:'csc',name:'Cossecante',short:'cossec',formula:'cossec θ = 1 / sen θ',description:'É o recíproco do seno e tem o mesmo sinal que ele. Seu módulo nunca é menor que 1. Se o seno é zero, a cossecante é indefinida. Em inglês, costuma aparecer como csc.',geometry:'Na reta OP, o segmento da origem até U, em y = 1, tem módulo |cossec θ|. O sinal é positivo no sentido de P e negativo no sentido oposto.',domain:'sen θ ≠ 0',range:'(−∞, −1] ∪ [1, ∞)',period:360,limit:4,poles:[0,180,360]},
];
export function format(value, digits=3) {
  if(value===null)return 'indefinida';
  const magnitude=Math.abs(value);
  if(magnitude>0&&magnitude<10**-digits)return value.toLocaleString('pt-BR',{maximumSignificantDigits:4,notation:magnitude<1e-6?'scientific':'standard'});
  if(magnitude>=1e6)return value.toLocaleString('pt-BR',{notation:'scientific',maximumFractionDigits:3});
  return (value===0?0:value).toLocaleString('pt-BR',{minimumFractionDigits:digits,maximumFractionDigits:digits});
}
export function radiansLabel(degrees) {
  const common = {0:'0',15:'π/12',30:'π/6',45:'π/4',60:'π/3',90:'π/2',120:'2π/3',135:'3π/4',150:'5π/6',180:'π',210:'7π/6',225:'5π/4',240:'4π/3',270:'3π/2',300:'5π/3',315:'7π/4',330:'11π/6',360:'2π'};
  return (common[degrees] ?? format(degrees*Math.PI/180))+' rad';
}
export function graphSegments(key, samples=720) {
  const meta=FUNCTIONS.find(f=>f.key===key),segments=[];
  let segment=[];
  for(let i=0;i<=samples;i++){
    const degrees=360*i/samples,value=trigValues(degrees)[key];
    if(value===null||Math.abs(value)>meta.limit+.2){if(segment.length>1)segments.push(segment);segment=[];continue;}
    segment.push([degrees,value]);
  }
  if(segment.length>1)segments.push(segment);
  return segments;
}
