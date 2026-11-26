// AVS ROTO BLITTER / releitura de rotação, escala e realimentação.
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


if(!s.buffers){s.buffers=[p.createGraphics(w,h),p.createGraphics(w,h)];for(const g of s.buffers){g.pixelDensity(1);g.background(3,4,12);}s.front=0;s.dispose=()=>s.buffers.forEach(g=>g.remove());}
for(const g of s.buffers)if(g.width!==w||g.height!==h){g.resizeCanvas(w,h);g.background(3,4,12);}
const front=s.buffers[s.front],back=s.buffers[1-s.front];
back.resetMatrix();back.colorMode(p.RGB,255);back.blendMode(p.BLEND);back.background(3,4,12);
back.push();back.translate(w/2,h/2);back.rotate(dt*(.08+low*.25));
back.scale(Math.exp(dt*(.12+low*.13)));back.tint(255,255*Math.exp(-dt/.65));back.imageMode(p.CENTER);back.image(front,0,0,w,h);back.noTint();back.pop();
back.colorMode(p.HSB,360,100,100,255);back.noFill();back.strokeWeight(.8);
for(let ribbon=0;ribbon<6;ribbon++){
 const value=valueAt(ribbon*7);if(value<.01)continue;
 back.stroke((185+ribbon*28+t*2)%360,80,100,value*85);back.beginShape();
 for(let j=0;j<=96;j++){
  const u=j/96,x=w*(.18+u*.64),wave=a.waveform[Math.floor(u*(a.waveform.length-1))]||0;
  const y=h/2+Math.sin(u*Math.PI*2+t*.23+ribbon*.4)*value*h*.13+wave*h*.1+(ribbon-2.5)*7;
  back.vertex(x,y);
 }
 back.endShape();
}
s.front=1-s.front;p.background(3,4,12);p.imageMode(p.CORNER);p.image(back,0,0,w,h);
