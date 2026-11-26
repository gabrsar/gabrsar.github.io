// PRISMA LÍQUIDO / psicodelia cromática com fluxos lentos, sem estrobo.
/* global p, a, s */
const dt=Math.min(a.dt||1/60,.06),t=a.elapsed??a.time,w=p.width,h=p.height;
const bands=Object.values(a.groups||{}).sort((x,y)=>x.low-y.low);
const value=g=>g.enabled?(a.visualLevel?a.visualLevel(g.db??-120):Math.max(0,Math.min(1,((g.db??-120)+80)/55))):0;
const strengths=bands.map(value),loud=strengths.length?Math.max(...strengths):0;
const region=(lo,hi)=>{const list=strengths.filter((_,i)=>bands[i].low<hi&&bands[i].high>lo);return list.reduce((n,x)=>n+x,0)/Math.max(1,list.length);};
const low=region(25,250),mid=region(250,4000),high=region(4000,20000);
const rand=(lo=0,hi=1)=>a.rand?a.rand(lo,hi):lo+Math.random()*(hi-lo);
const mouse=a.mouse||{inside:false,nx:.5,ny:.5,vx:0,clicked:false};
const keys=a.keyboard||{down:()=>false,pressed:()=>false};
p.blendMode(p.BLEND);p.colorMode(p.RGB,255);

s.phase ??= rand(0,6);s.phase+=dt*(.09+low*.18);
p.background(7,3,16,255*(1-Math.exp(-dt/.16)));
p.translate(w/2,h/2);p.colorMode(p.HSB,360,100,100,255);p.noFill();
const R=Math.hypot(w,h)*.55;
const pointer=mouse.inside?(mouse.nx-.5)*.25:0;
for(let ribbon=0;ribbon<28;ribbon++){
 const energy=strengths[Math.floor(ribbon/28*strengths.length)]||0;
 const hue=(240+ribbon*8+s.phase*11+(a.clock?.hour||0))%360;
 p.stroke(hue,72,60+energy*35,25+energy*55);p.strokeWeight(.7+energy*.8);p.beginShape();
 for(let j=0;j<=160;j++){
  const angle=j/160*Math.PI*2;
  const fold=Math.sin(angle*3+s.phase)*(.14+low*.10)+Math.cos(angle*7-s.phase*.6)*high*.08;
  const radius=R*(.08+ribbon*.028)*(1+fold);
  const twist=angle+s.phase*.10+ribbon*.028+pointer;
  p.vertex(Math.cos(twist)*radius*(1+.1*Math.sin(s.phase*.4)),Math.sin(twist)*radius*.78);
 }
 p.endShape(p.CLOSE);
}
p.colorMode(p.RGB,255);
