// COLOR MIX / três campos RGB em SCREEN; cruzamentos criam novas cores.
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

p.background(2,3,10,255*(1-Math.exp(-dt/.12)));
p.blendMode(p.SCREEN);p.noStroke();
const energies=[low,region(250,4000),high];
const colors=[[255,35,65],[35,255,170],[60,100,255]];
for(let field=0;field<3;field++){
  const value=energies[field];if(value<.01)continue;
  const phase=t*(.075+field*.019)+field*Math.PI*2/3;
  const x=w/2+Math.sin(phase)*w*.22,y=h/2+Math.cos(phase*.81)*h*.22;
  for(let layer=18;layer>0;layer--){
    const size=Math.min(w,h)*(.20+layer/18*.65)*(.5+value*.5);
    p.fill(...colors[field],value*(1-layer/20)*16);
    p.ellipse(x,y,size*(1+.2*Math.sin(phase*.5)),size*(.65+.25*Math.cos(phase*.7)+value*.15));
  }
}
p.blendMode(p.BLEND);
