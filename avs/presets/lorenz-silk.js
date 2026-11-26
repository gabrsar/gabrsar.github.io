// LORENZ / integração RK4 com trajetória limitada.
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

const DUAL=false;
if(!s.g){
  s.g=p.createGraphics(w,h,p.WEBGL);s.g.pixelDensity(1);s.dispose=()=>s.g.remove();
  s.orbits=Array.from({length:DUAL?2:1},(_,i)=>({x:.1+i*.0002,y:0,z:0,points:[]}));
  s.clock=0;s.particleClock=0;s.low=0;s.high=0;s.mid=0;s.power=0;s.rotation=0;s.hue=195;s.impact=0;
  s.particles=[];s.active=64;s.warmed=false;
}
const mid=region(250,4000);
for(const [key,value]of [['low',low],['high',high],['mid',mid],['power',loud]])s[key]+=(value-s[key])*(1-Math.exp(-dt/.5));
const strongHit=bands.some(g=>g.enabled&&g.hit&&(a.visualLevel?a.visualLevel(g.db??-120):loud)>.50);
s.impact=Math.max(strongHit?s.power:0,s.impact*Math.exp(-dt/.3));
s.rotation+=dt*(.045+s.mid*.18+s.low*.10+(a.music?.trend||0)*.025);s.hue+=dt*(1.8+s.high*9+(a.music?.trend||0)*3);
// A música altera também o campo, em uma faixa estreita que preserva o atrator.
const rho=27+s.low*2.5,sigma=9.5+s.mid*1.5;
// RK4 escalar: evita criar milhares de arrays por frame nas partículas.
const advance=(o,step)=>{
  const x=o.x,y=o.y,z=o.z,beta=8/3;
  const ax=sigma*(y-x),ay=x*(rho-z)-y,az=x*y-beta*z;
  const x2=x+ax*step/2,y2=y+ay*step/2,z2=z+az*step/2;
  const bx=sigma*(y2-x2),by=x2*(rho-z2)-y2,bz=x2*y2-beta*z2;
  const x3=x+bx*step/2,y3=y+by*step/2,z3=z+bz*step/2;
  const cx=sigma*(y3-x3),cy=x3*(rho-z3)-y3,cz=x3*y3-beta*z3;
  const x4=x+cx*step,y4=y+cy*step,z4=z+cz*step;
  const dx=sigma*(y4-x4),dy=x4*(rho-z4)-y4,dz=x4*y4-beta*z4;
  o.x=x+step/6*(ax+2*bx+2*cx+dx);
  o.y=y+step/6*(ay+2*by+2*cy+dy);
  o.z=z+step/6*(az+2*bz+2*cz+dz);
};
if(!s.warmed){
  for(let j=0;j<2000;j++)for(const orbit of s.orbits){advance(orbit,.008);if(j>=600)orbit.points.push([orbit.x,orbit.y,orbit.z,0]);}
  for(let j=0;j<(DUAL?260:200);j++){
    const orbit=s.orbits[j%s.orbits.length],point=orbit.points[Math.floor(Math.random()*orbit.points.length)];
    s.particles.push({x:point[0]+Math.random()*.03,y:point[1],z:point[2],orbit:j%s.orbits.length,trail:[],seed:Math.random()});
  }
  s.warmed=true;
}
s.clock+=dt*(70+s.low*150);let steps=0;
while(s.clock>=1&&steps++<14){
  s.clock--;
  for(const orbit of s.orbits){advance(orbit,.008);orbit.points.push([orbit.x,orbit.y,orbit.z,s.power]);if(orbit.points.length>1400)orbit.points.shift();}
}
s.active+=((64+s.power*(s.particles.length-64))-s.active)*(1-Math.exp(-dt/.7));
const active=Math.floor(s.active);
s.particleClock+=dt*(65+s.low*120);let iterations=0;
while(s.particleClock>=1&&iterations++<14){
  s.particleClock--;
  for(let j=0;j<active;j++){
    const dot=s.particles[j];advance(dot,.007);
    if(!Number.isFinite(dot.x)||Math.hypot(dot.x,dot.y,dot.z)>100){dot.x=.1;dot.y=0;dot.z=0;dot.trail=[];}
  }
}
const g=s.g;if(g.width!==w||g.height!==h)g.resizeCanvas(w,h);
g.clear();g.resetMatrix();g.colorMode(p.HSB,360,100,100,255);g.background(225,65,3);
g.perspective(Math.PI/3,w/h,1,5000);g.camera(0,0,Math.max(95,95*h/w),0,0,0,0,1,0);
g.rotateY(s.rotation);g.rotateX(-.22+Math.sin(t*.055)*(.12+s.high*.12));g.rotateZ(Math.sin(t*.035)*.055);
g.scale(1+s.low*.08);g.noFill();
for(let k=0;k<s.orbits.length;k++){
  const points=s.orbits[k].points,offset=DUAL?(k?3:-3):0;
  g.strokeWeight(.55);
  for(let j=1;j<points.length;j++){
    const age=j/points.length,a1=points[j-1],a2=points[j];
    g.stroke((s.hue+k*125+age*40)%360,70,75,Math.pow(age,1.8)*(20+a2[3]*45));
    g.line(a1[0]+offset,a1[1]*.9,-a1[2]+25,a2[0]+offset,a2[1]*.9,-a2[2]+25);
  }
}
// Partículas com caudas curtas e brilho limitado; sem nuvem branca no centro.
for(let j=0;j<active;j++){
  const dot=s.particles[j],offset=DUAL?(dot.orbit?3:-3):0;
  dot.trail.push([dot.x+offset,dot.y*.9,-dot.z+25]);if(dot.trail.length>6)dot.trail.shift();
  const hue=(s.hue+dot.orbit*125+dot.seed*45)%360;
  g.strokeWeight(.6);
  for(let k=1;k<dot.trail.length;k++){
    g.stroke(hue,75,90,(k/dot.trail.length)*(12+s.power*35));
    g.line(...dot.trail[k-1],...dot.trail[k]);
  }
  g.stroke(hue,60,100,100+s.high*60+s.impact*50);
  g.strokeWeight(1.4+dot.seed+s.high*1.8+s.impact*1.6);
  g.point(dot.x+offset,dot.y*.9,-dot.z+25);
}
p.blendMode(p.BLEND);p.background(2,3,10);p.imageMode(p.CORNER);p.image(g,0,0,w,h);
