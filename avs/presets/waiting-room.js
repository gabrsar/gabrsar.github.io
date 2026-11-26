// BRISA / ambiente discreto para sala de espera; sem flashes, texto ou reação brusca.
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

s.breath ??= rand(0,6);s.energy ??= 0;
s.energy+=(mid-s.energy)*(1-Math.exp(-dt/3.5));s.breath+=dt*(.095+s.energy*.025);
p.background(224,235,232);p.noStroke();
// Quatro planos amplos e translúcidos, com velocidade limitada e paleta suave.
const palette=[[120,178,170],[157,185,204],[185,202,170],[200,190,172]];
for(let plane=0;plane<4;plane++){
 p.fill(...palette[plane],36+plane*4);p.beginShape();p.vertex(0,h);
 for(let j=0;j<=90;j++){
  const u=j/90,x=u*w;
  const y=h*(.42+plane*.11)+Math.sin(u*3+s.breath+plane*.7)*h*(.075+s.energy*.035);
  p.vertex(x,y);
 }
 p.vertex(w,h);p.endShape(p.CLOSE);
}

// Correntes suaves dão vida sem flashes, textos ou saltos de câmera.
p.noFill();p.strokeWeight(.7);
for(let line=0;line<10;line++){
 p.stroke(100+line*6,155+line*3,150+line*3,18+line);
 p.beginShape();
 for(let j=0;j<=80;j++){
  const u=j/80,x=u*w;
  const y=h*(.22+line*.058)+Math.sin(u*4.3+s.breath*.8+line*.18)*h*.085;
  p.vertex(x,y);
 }
 p.endShape();
}
