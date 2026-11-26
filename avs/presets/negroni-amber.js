// ÂMBAR / lounge geométrico em laranja, cobre e rubi.
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

s.phase ??= rand(0,6);s.phase+=dt*(.025+mid*.04);
p.background(16,7,6,255*(1-Math.exp(-dt/.18)));
p.translate(w/2,h/2);p.noFill();
const R=Math.min(w,h)*.44;
for(let panel=0;panel<18;panel++){
 const energy=strengths[Math.floor(panel/18*strengths.length)]||0;
 const rotation=s.phase*.12+panel*.035;
 p.push();p.rotate(rotation);
 p.stroke(185+panel*3,55+panel*5,28+panel*2,18+energy*42);p.strokeWeight(.7+energy*.5);
 p.rectMode(p.CENTER);const size=R*(.25+panel*.075);
 p.rect(Math.sin(s.phase+panel*.12)*w*.035,Math.cos(s.phase*.7)*h*.025,size*1.35,size*.75,3);p.pop();
}
