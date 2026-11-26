// AVS BASS SPIN / releitura própria do efeito clássico de triângulos.
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


s.rotation ??= 0;s.rotation+=dt*(.12+low*1.4);
p.background(3,4,12,255*(1-Math.exp(-dt/.14)));
p.translate(w/2,h/2);p.colorMode(p.HSB,360,100,100,255);p.blendMode(p.ADD);
const R=Math.min(w,h)*.43;
for(let layer=0;layer<3;layer++){
  const energy=region(layer?250:25,layer?4000:250);if(energy<.01)continue;
  p.push();p.rotate(s.rotation*(layer%2?-1:1)+layer*.4);
  for(let blade=0;blade<4;blade++){
    p.push();p.rotate(blade*Math.PI/2);
    const length=R*(.3+energy*.65)*(1-layer*.13);
    p.fill((180+layer*55+t*2)%360,85,90,energy*38);p.stroke((200+layer*55+t*2)%360,65,100,energy*120);
    p.strokeWeight(.8);p.triangle(12,0,length,-length*(.08+high*.12),length*.76,length*.12);
    p.pop();
  }
  p.pop();
}
p.blendMode(p.BLEND);p.colorMode(p.RGB,255);
