// VELUDO / lounge vinho: fitas rubi, ameixa e ouro, com bastante respiro.
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

s.phase ??= rand(0,5);s.phase+=dt*(.035+low*.035);
p.background(14,4,12,255*(1-Math.exp(-dt/.20)));
p.noFill();
for(let layer=0;layer<11;layer++){
 const energy=strengths[Math.floor(layer/11*strengths.length)]||0;
 p.stroke(125+layer*7,32+layer*4,65+layer*5,24+energy*36);p.strokeWeight(.65+energy*.65);p.beginShape();
 for(let j=0;j<=100;j++){
  const u=j/100,x=u*w,y=h*(.25+layer*.045)+Math.sin(u*5+s.phase+layer*.18)*h*(.05+energy*.04);
  p.vertex(x,y);
 }
 p.endShape();
}
p.stroke(195,154,95,18+mid*25);p.strokeWeight(.7);p.beginShape();
for(let j=0;j<=100;j++){const u=j/100;p.vertex(u*w,h*.6+Math.sin(u*5+s.phase*.8)*h*.1);}p.endShape();
