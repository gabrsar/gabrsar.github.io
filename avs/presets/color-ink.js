// COLOR MIX / tinta CMY com MULTIPLY sobre papel, frequência por fita.
/* global p, a, s */
const dt=Math.min(a.dt||1/60,.06),t=a.time,w=p.width,h=p.height;
const bands=Object.values(a.groups||{}).sort((x,y)=>x.low-y.low);
const clamp=v=>Math.max(0,Math.min(1,v));
const strengths=bands.map(g=>g.enabled?(a.visualLevel?a.visualLevel(g.db??-120):clamp(((g.db??-120)+80)/55)):0);
const loud=strengths.length?Math.max(...strengths):0;
const region=(lo,hi)=>{const selected=strengths.filter((_,i)=>bands[i].low<hi&&bands[i].high>lo);return selected.reduce((n,x)=>n+x,0)/Math.max(1,selected.length);};
const low=region(25,250);
const high=region(4000,22000);
const valueAt=i=>strengths[((i%strengths.length)+strengths.length)%strengths.length]||0;
p.blendMode(p.BLEND);p.colorMode(p.RGB,255);

p.background(240,234,222);p.blendMode(p.MULTIPLY);p.noStroke();
const inks=[[20,210,235],[240,45,155],[250,205,35]];
for(let ink=0;ink<3;ink++){
  p.push();p.translate(w/2,h/2);p.rotate(Math.sin(t*.07+ink*1.8)*.38);
  for(let ribbon=0;ribbon<12;ribbon++){
    const value=valueAt(ribbon*4+ink);if(value<.01)continue;
    p.fill(...inks[ink],value*112);p.beginShape();
    const baseline=(ribbon/12-.5)*h*1.3;
    for(let j=0;j<=48;j++){
      const x=(j/48-.5)*w*1.6;
      const y=baseline+Math.sin(j*.14+t*.22+ink*2)*value*h*.16;
      p.vertex(x,y);
    }
    for(let j=48;j>=0;j--){
      const x=(j/48-.5)*w*1.6;
      const y=baseline+Math.sin(j*.14+t*.22+ink*2)*value*h*.16+5+value*26;
      p.vertex(x,y);
    }
    p.endShape(p.CLOSE);
  }
  p.pop();
}
p.blendMode(p.BLEND);

p.blendMode(p.BLEND);p.stroke(80,70,65,12);p.strokeWeight(.5);
for(let i=1;i<5;i++)p.line(w*.03,h*i/5,w*.97,h*i/5);
