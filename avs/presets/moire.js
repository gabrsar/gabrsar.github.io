// MOIRÉ / duas tramas de linhas e interferência, moduladas pelo espectro.
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

p.background(3,4,12,255*(1-Math.exp(-dt/.07)));
p.translate(w/2,h/2);p.noFill();p.blendMode(p.ADD);
const extent=Math.hypot(w,h)*.55,spacing=12+low*8;
for(let mesh=0;mesh<2;mesh++){
  p.push();p.rotate((mesh?-.16:.16)+Math.sin(t*.09)*.05*(.1+loud));
  p.strokeWeight(.7+high*.18);
  for(let line=-45;line<=45;line++){
    const index=(line+45)%Math.max(1,strengths.length);
    const value=strengths[index]||0;
    if(value<.01)continue;
    p.stroke(mesh?235:75,mesh?85:225,255,value*95);
    p.beginShape();
    for(let j=0;j<=40;j++){
      const x=(j/40-.5)*extent*2;
      const bend=Math.sin(j*.25+line*.17+t*.5)*value*(20+high*35);
      p.vertex(x,line*spacing+bend);
    }
    p.endShape();
  }
  p.pop();
}
p.blendMode(p.BLEND);
