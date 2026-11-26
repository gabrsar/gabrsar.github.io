// AVS DOT PLANE / releitura: horizonte de pontos, ondas e espectro.
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


p.background(2,3,12,255*(1-Math.exp(-dt/.065)));
p.colorMode(p.HSB,360,100,100,255);p.noStroke();
const rows=48,cols=54,R=Math.min(w,h);
const turn=Math.sin(t*.045)*.15;
for(let row=rows-1;row>=0;row--){
 const z=90+row*25,fade=Math.pow(1-row/rows,.7);
 for(let col=0;col<cols;col++){
  const u=col/(cols-1),v=valueAt(Math.floor(u*Math.max(0,strengths.length-1)));
  const x=(u-.5)*1400;
  const y=80-v*130-Math.sin(row*.24-t*.9+u*4)*low*42;
  const xx=x*Math.cos(turn)-z*Math.sin(turn),zz=z*Math.cos(turn)+x*Math.sin(turn);
  const perspective=500/(zz+500),px=w/2+xx*perspective,py=h*.37+y*perspective+R*.35*perspective;
  p.fill((180+u*130+t*.7)%360,65,45+v*55,fade*(22+v*140));
  p.circle(px,py,Math.max(.5,(1+v*2.2)*perspective));
 }
}
p.colorMode(p.RGB,255);
