// AURORA / noise waves + 48 faixas, sem partículas.
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

p.background(2,5,14,255*(1-Math.exp(-dt/.13)));
p.blendMode(p.ADD);p.noFill();
for(let k=0;k<16;k++){
  const index=Math.min(bands.length-1,Math.floor(k/16*bands.length));
  const value=strengths[index]||0;
  if(value<.01)continue;
  const c=p.color(bands[index].color);c.setAlpha(value*65);p.stroke(c);
  for(let strand=0;strand<4;strand++){
    p.strokeWeight(strand===1?1.5:.7);p.beginShape();
    for(let j=0;j<=100;j++){
      const x=j/100*w;
      const cloud=(p.noise(j*.025,k*.13,t*.08)-.5)*h*.58*value;
      const ripple=Math.sin(j*.12+t*(.3+value)+k*.6)*value*16;
      const sample=a.waveform[Math.floor(j/101*a.waveform.length)]||0;
      p.vertex(x,h*(.18+k/16*.64)+cloud+ripple+sample*30+strand*(2+value*3));
    }
    p.endShape();
  }
}
p.blendMode(p.BLEND);
