// LISSAJOUS / osciloscópio XY: uma amostra contra sua versão atrasada.
/* global p, a, s */
const dt=Math.min(a.dt||1/60,.06),t=a.time;
const bands=Object.values(a.groups||{}).sort((x,y)=>x.low-y.low);
const clamp=v=>Math.max(0,Math.min(1,v));
const intensity=g=>g&&g.enabled?(a.visualLevel?a.visualLevel(g.db??-120):clamp(((g.db??-120)+80)/55)):0;
const strengths=bands.map(intensity);
const loud=strengths.length?Math.max(...strengths):0;
const region=(lo,hi)=>{const selected=strengths.filter((_,i)=>bands[i].low<hi&&bands[i].high>lo);return selected.reduce((n,x)=>n+x,0)/Math.max(1,selected.length);};
const low=region(25,250);
const high=region(4000,22000);
const w=p.width,h=p.height;
p.blendMode(p.BLEND);p.colorMode(p.RGB,255);


p.background(3,4,12,255*(1-Math.exp(-dt/.045)));
p.translate(w/2,h/2);p.noFill();p.blendMode(p.BLEND);
const n=a.waveform.length,radius=Math.min(w,h)*.47;
const peak=a.waveform.reduce((max,v)=>Math.max(max,Math.abs(v)),0);
s.viewGain ??= 1;
const desiredGain=Math.min(3, .85/Math.max(.08,peak));
s.viewGain+=(desiredGain-s.viewGain)*(1-Math.exp(-dt/.8));
const step=Math.max(1,Math.floor(n/420));
for(let layer=0;layer<2;layer++){
  p.stroke(layer?235:85,layer?105:220,255,loud*(layer?32:88));
  p.strokeWeight(layer?.65:1.05);p.beginShape();
  const lag=Math.floor(n*(.018+layer*.04+low*.012));
  for(let j=0;j<n;j+=step){
    const x=a.waveform[j]*radius*s.viewGain,y=a.waveform[(j+lag)%n]*radius*s.viewGain;
    const angle=layer*.10+Math.sin(t*.055)*.055;
    p.vertex(x*Math.cos(angle)-y*Math.sin(angle),x*Math.sin(angle)+y*Math.cos(angle));
  }
  p.endShape();
}
// Réguas discretas, sem somar ao traço musical.
p.stroke(90,130,160,13);p.strokeWeight(.5);
p.line(-radius,0,radius,0);p.line(0,-radius,0,radius);
