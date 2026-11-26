// MICÉLIO / ramificações orgânicas em movimento lento, guiadas por noise e seed.
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

if(!s.branches){s.branches=Array.from({length:30},()=>({x:rand(0,w),y:rand(0,h),angle:rand(0,Math.PI*2),seed:rand(0,1000),age:rand(0,20)}));s.phase=0;}
s.phase+=dt*(.05+low*.10);
p.background(5,8,13,255*(1-Math.exp(-dt/.85)));
p.colorMode(p.HSB,360,100,100,255);p.noFill();
for(let k=0;k<s.branches.length;k++){
 const branch=s.branches[k],energy=strengths[k%Math.max(1,strengths.length)]||0;
 const oldX=branch.x,oldY=branch.y;
 const field=p.noise(branch.x*.003,branch.y*.003,branch.seed+s.phase)*Math.PI*4;
 branch.angle+=Math.sin(field-branch.angle)*dt*.5;
 const speed=9+energy*25;branch.x+=Math.cos(branch.angle)*speed*dt;branch.y+=Math.sin(branch.angle)*speed*dt;
 if(branch.x< -20||branch.x>w+20||branch.y< -20||branch.y>h+20||mouse.clicked){branch.x=mouse.clicked?mouse.nx*w:rand(0,w);branch.y=mouse.clicked?mouse.ny*h:rand(0,h);continue;}
 p.stroke((145+branch.seed*.08+high*20)%360,50,70,25+energy*45);p.strokeWeight(.65+energy*.6);p.line(oldX,oldY,branch.x,branch.y);
 if(Math.sin(branch.age)> .94){const side=branch.angle+Math.PI/2;p.stroke(195,40,80,12+energy*18);p.line(branch.x,branch.y,branch.x+Math.cos(side)*8,branch.y+Math.sin(side)*8);}
 branch.age+=dt*(.3+energy);
}
p.colorMode(p.RGB,255);
