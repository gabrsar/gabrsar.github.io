// CALEIDOSCÓPIO / seda espectral, simetria e reflexões.
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

if(!s.surface){s.surface=p.createGraphics(w,h);s.surface.pixelDensity(1);s.dispose=()=>s.surface.remove();}
const g=s.surface;if(g.width!==w||g.height!==h)g.resizeCanvas(w,h);
g.clear();g.resetMatrix();
p.background(3,3,12,255*(1-Math.exp(-dt/.065)));
g.translate(w/2,h/2);g.rotate(t*.035+Math.sin(t*.045)*.12);
g.colorMode(p.HSB,360,100,100,255);g.blendMode(p.ADD);g.noFill();
const sectors=12,wedge=Math.PI*2/sectors,R=Math.hypot(w,h)*.66;
for(let sector=0;sector<sectors;sector++){
  g.push();g.rotate(sector*wedge);
  for(const mirror of [-1,1]){
    g.push();g.scale(1,mirror);
    for(let strand=0;strand<10;strand++){
      const value=valueAt(strand*4);if(value<.01)continue;
      g.stroke((strand*23+t*5)%360,80,100,value*50);g.strokeWeight(.45+(.5+.5*Math.sin(t*.28+strand*.9))*(.7+value*.8));
      g.beginShape();
      for(let j=0;j<=56;j++){
        const u=j/56,r=R*(.08+u*.86);
        const angle=wedge*.25*(1+Math.sin(u*9+t*.3+strand*.35)*value);
        const ripple=(a.waveform[Math.floor(u*(a.waveform.length-1))]||0)*R*.08;
        g.vertex(Math.cos(angle)*(r+ripple),Math.sin(angle)*(r+ripple));
      }
      g.endShape();
    }
    g.pop();
  }
  g.pop();
}
g.blendMode(p.BLEND);g.colorMode(p.RGB,255);

p.blendMode(p.BLEND);p.colorMode(p.RGB,255);p.imageMode(p.CORNER);
const ctx=p.drawingContext;ctx.save();
try{
  ctx.filter='blur('+(2.3+low*2).toFixed(2)+'px)';ctx.globalAlpha=.42;
  p.image(g,0,0,w,h);
  ctx.filter='none';ctx.globalAlpha=.88;p.image(g,0,0,w,h);
}finally{ctx.restore();}
