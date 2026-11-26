// AVS OSCILLOSCOPE STAR / releitura de superscope com simetria.
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


p.background(3,3,12,255*(1-Math.exp(-dt/.10)));
p.translate(w/2,h/2);p.rotate(Math.sin(t*.035)*.18);
p.noFill();p.colorMode(p.HSB,360,100,100,255);
const R=Math.min(w,h)*.42,n=a.waveform.length;
for(let strand=0;strand<4;strand++){
 const energy=region(25,4000);if(energy<.01)continue;
 p.stroke((190+strand*38+t*2)%360,75,100,energy*(strand?50:105));p.strokeWeight(strand?.7:1.2);p.beginShape();
 for(let j=0;j<=360;j++){
  const theta=j/360*Math.PI*2,u=j/360,v=u<=.5?u*2:2-u*2;
  const wave=a.waveform[Math.min(n-1,Math.floor(v*(n-1)))]||0;
  const radius=R*(.42+.16*Math.cos(theta*6+t*.06)+wave*(.6+high*.3)+strand*.045);
  p.vertex(Math.cos(theta)*radius,Math.sin(theta)*radius);
 }
 p.endShape(p.CLOSE);
}
p.colorMode(p.RGB,255);
