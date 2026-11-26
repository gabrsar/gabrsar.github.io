// CALEIDOSCÓPIO / vitral de polígonos, cada faixa vira uma peça.
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
g.translate(w/2,h/2);g.rotate(t*.012+Math.sin(t*.045)*.25);
g.colorMode(p.HSB,360,100,100,255);g.noStroke();
const sectors=10,step=Math.PI*2/sectors,R=Math.min(w,h)*.54;
for(let sector=0;sector<sectors;sector++){
  g.push();g.rotate(sector*step);
  for(const mirror of [-1,1]){
    g.push();g.scale(1,mirror);
    for(let cell=0;cell<16;cell++){
      const value=valueAt(cell*3);if(value<.01)continue;
      const inner=R*(.04+cell/18),outer=inner+R/20*(.4+value);
      const angle=step*(.12+.10*Math.sin(t*.22+cell*.5));
      const a1=angle,a2=step*.47;
      g.fill((cell*21+t*4)%360,70+value*25,45+value*55,value*165);
      g.quad(Math.cos(a1)*inner,Math.sin(a1)*inner,
        Math.cos(a2)*inner,Math.sin(a2)*inner,
        Math.cos(a2)*outer,Math.sin(a2)*outer,
        Math.cos(a1)*outer,Math.sin(a1)*outer);
    }
    g.pop();
  }
  g.pop();
}
g.colorMode(p.RGB,255);

p.blendMode(p.BLEND);p.colorMode(p.RGB,255);p.imageMode(p.CORNER);
const ctx=p.drawingContext;ctx.save();
try{
  ctx.filter='blur('+(2.3+low*2).toFixed(2)+'px)';ctx.globalAlpha=.42;
  p.image(g,0,0,w,h);
  ctx.filter='none';ctx.globalAlpha=.88;p.image(g,0,0,w,h);
}finally{ctx.restore();}
