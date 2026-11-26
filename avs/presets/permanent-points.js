// ACUMULAÇÃO / tinta de pontos: nunca limpa o desenho enquanto este preset estiver ativo.
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



const music=a.music||{energy:loud,trend:0,brightness:high,volatility:0,pulse:0,hue:190,flow:{x:0,y:0}};
const random=(lo,hi)=>a.rand?a.rand(lo,hi):lo+Math.random()*(hi-lo);
if(!s.paper){
  s.paper=p.createGraphics(w,h);s.paper.pixelDensity(1);s.paper.background(3,4,12);s.dispose=()=>s.paper.remove();
  s.phase=0;s.carry=0;s.center={x:w/2,y:h/2};s.breath=random(0,6);
}
const g=s.paper;
if(g.width!==w||g.height!==h){const copy=g.get();g.resizeCanvas(w,h);g.background(3,4,12);g.image(copy,0,0,w,h);}
s.phase+=dt*(.10+music.energy*.8+music.volatility*.3);
s.breath+=dt*(.09+music.energy*.12);
// A frase crescente abre e sobe o desenho; a decrescente recolhe e desce.
const desiredX=w*(.5+Math.sin(s.phase*.21)*.18+music.flow.x*.12);
const desiredY=h*(.5+Math.cos(s.phase*.17)*.15+music.flow.y*.12);
s.center.x+=(desiredX-s.center.x)*(1-Math.exp(-dt/2));s.center.y+=(desiredY-s.center.y)*(1-Math.exp(-dt/2));
s.carry+=dt*(15+music.energy*420+music.pulse*180);
const count=Math.min(60,Math.floor(s.carry));s.carry-=count;
g.colorMode(p.HSB,360,100,100,255);g.noStroke();
if(loud>.01)for(let i=0;i<count;i++){
  const u=random(0,1),theta=s.phase+u*Math.PI*2;
  const band=Math.floor(u*strengths.length),value=valueAt(band);
  const breathing=.84+.16*Math.sin(s.breath);
  const spread=(.05+value*.31+music.energy*.10+music.trend*.035)*Math.min(w,h)*breathing;
  const x=s.center.x+Math.sin(theta*3+s.phase*.13)*spread+random(-1,1)*music.volatility*7;
  const y=s.center.y+Math.cos(theta*2-s.phase*.11)*spread;
  const hue=(music.hue+u*80+music.trend*30+360)%360;
  const brightness=40+value*35+music.brightness*15+music.pulse*10;
  const size=.5+value*3.2+music.pulse*1.2;
  g.fill(hue,55+music.energy*30,Math.min(100,brightness),10+value*32+music.energy*20);
  g.circle(x,y,size);
}
// Nunca apaga a camada durante a execução deste preset.
p.blendMode(p.BLEND);p.imageMode(p.CORNER);p.image(g,0,0,w,h);
