// TÚNEL PRISMÁTICO / ecos retangulares, inspirado na linguagem visual do AVS.
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

if(s.bandCount!==bands.length){s.frames=[];s.bandCount=bands.length;}
s.frames ||= [];s.sample ??= -10;
if(t-s.sample>1/10){s.frames.push({born:t,levels:[...strengths],power:loud});s.sample=t;}
s.frames=s.frames.filter(frame=>t-frame.born<6);
p.background(2,3,12,255*(1-Math.exp(-dt/.08)));
p.translate(w/2,h/2);p.noFill();p.blendMode(p.ADD);
for(const frame of s.frames){
  const age=(t-frame.born)/6,fade=Math.pow(1-age,2);
  if(frame.power<.01)continue;
  const radius=18+Math.pow(age,.88)*Math.hypot(w,h)*1.05;
  p.push();p.rotate(t*.045+Math.sin(frame.born*.13)*.38);
  for(let edge=0;edge<4;edge++){
    const value=frame.levels[Math.floor(edge/4*frame.levels.length)]||0;
    p.colorMode(p.HSB,360,100,100,255);
    p.stroke((185+edge*28+frame.born*3+t*.8)%360,75,95,fade*frame.power*105);
    p.strokeWeight(.8+value*1.3);p.beginShape();
    for(let j=0;j<=32;j++){
      const u=j/32,v=(frame.levels[Math.floor(u*(frame.levels.length-1))]||0)*12;
      const x=(u*2-1)*radius,y=-radius-v;
      const angle=edge*Math.PI/2;
      p.vertex(x*Math.cos(angle)-y*Math.sin(angle),x*Math.sin(angle)+y*Math.cos(angle));
    }
    p.endShape();
  }
  p.pop();
}
p.blendMode(p.BLEND);p.colorMode(p.RGB,255);
