// MOIRÉ FLUIDO / cópia independente: zoom, blur e proporções em metamorfose.
/* global p, a, s */
const dt=Math.min(a.dt||1/60,.06),t=a.time;
const bands=Object.values(a.groups||{}).sort((x,y)=>x.low-y.low);
const clamp=v=>Math.max(0,Math.min(1,v));
const intensity=g=>g&&g.enabled?(a.visualLevel?a.visualLevel(g.db??-120):clamp(((g.db??-120)+80)/55)):0;
const strengths=bands.map(intensity);
const loud=strengths.length?Math.max(...strengths):0;
const region=(lo,hi)=>{const selected=strengths.filter((_,i)=>bands[i].low<hi&&bands[i].high>lo);return selected.reduce((n,x)=>n+x,0)/Math.max(1,selected.length);};
const low=region(25,250);
const high=region(4000,22000);
const w=p.width,h=p.height;
p.blendMode(p.BLEND);p.colorMode(p.RGB,255);

// Cada parâmetro escolhe seu próprio alvo e tempo de transição.
// A aleatoriedade acontece entre alvos, nunca como ruído a cada frame.
const SPEED=.65, BLUR_MAX=1.7;
if(!s.layer){
  s.layer=p.createGraphics(w,h);s.layer.pixelDensity(1);
  s.dispose=()=>s.layer.remove();
  s.phase=0;s.low=0;s.high=0;s.tracks={};s.angles=[.14,-.14];
}
const random=(lo,hi)=>lo+Math.random()*(hi-lo);
const drift=(name,initial,lo,hi,minSeconds,maxSeconds)=>{
  let track=s.tracks[name];
  if(!track)track=s.tracks[name]={from:initial,to:random(lo,hi),start:t,duration:random(minSeconds,maxSeconds)};
  let u=Math.max(0,Math.min(1,(t-track.start)/track.duration));
  const eased=u*u*(3-2*u),value=track.from+(track.to-track.from)*eased;
  if(u>=1){track.from=value;track.to=random(lo,hi);track.start=t;track.duration=random(minSeconds,maxSeconds);}
  return value;
};
s.phase+=dt*SPEED*(.45+loud*.55);
s.low+=(low-s.low)*(1-Math.exp(-dt/.45));
s.high+=(high-s.high)*(1-Math.exp(-dt/.25));
const phase=s.phase;
const zoom=drift('zoom',1,.65,1.65,5,14)+s.low*.12;
const stretch=drift('stretch',1,.72,1.4,7,18);
const tilt=drift('shear',0,-.28,.28,6,17);
const blur=drift('blur',.3,0,BLUR_MAX,4,11);
const trail=drift('trail',.09,.035,.20,5,13);
const bendFrequency=drift('bendFrequency',.19,.11,.29,9,22);
p.background(3,4,12,255*(1-Math.exp(-dt/trail)));
const g=s.layer;
if(g.width!==w||g.height!==h)g.resizeCanvas(w,h);
g.clear();g.resetMatrix();g.colorMode(p.HSB,360,100,100,255);
g.translate(w/2,h/2);g.scale(zoom*stretch,zoom/stretch);g.shearX(tilt);
g.noFill();g.blendMode(p.ADD);
const extent=Math.hypot(w,h)*1.05;
for(let mesh=0;mesh<2;mesh++){
  const id='mesh'+mesh;
  const speed=drift(id+'speed',mesh?-.025:.025,-.10,.10,6,18);
  s.angles[mesh]+=speed*dt;
  const spacing=drift(id+'spacing',11,7,19,5,16)+s.low*3;
  const width=drift(id+'width',.75,.30,2.6,3,10);
  const hue=drift(id+'hue',mesh?290:185,0,720,8,24);
  const saturation=drift(id+'saturation',75,50,100,6,18);
  const brightness=drift(id+'brightness',94,65,100,5,12);
  const gradient=drift(id+'gradient',20,-70,70,8,20);
  const ratio=drift(id+'ratio',1,.82,1.24,8,19);
  const offset=drift(id+'offset',0,-35,35,7,17);
  g.push();g.rotate(s.angles[mesh]);g.scale(ratio,1/ratio);g.translate(0,offset);
  for(let line=-58;line<=58;line++){
    const index=(line+58+mesh*7)%Math.max(1,strengths.length);
    const value=strengths[index]||0;
    if(value<.01)continue;
    // A espessura evolui por malha, com uma resposta pequena aos agudos.
    g.strokeWeight(width*(.85+.15*Math.sin(line*.12+phase*.2))+.25*s.high);
    const colorHue=((hue+line/58*gradient)%360+360)%360;
    g.stroke(colorHue,saturation,brightness,value*95/Math.sqrt(Math.max(.7,width)));
    g.beginShape();
    for(let j=0;j<=52;j++){
      const x=(j/52-.5)*extent*2;
      const bend=Math.sin(j*bendFrequency+line*.17+phase*.65)
        *value*(16+s.high*38);
      const arch=Math.sin(x/extent*Math.PI+phase*.15)*s.low*18;
      g.vertex(x,line*spacing+bend+arch);
    }
    g.endShape();
  }
  g.pop();
}
// Blur real aplicado uma vez na composição; não refaz todos os traços.
p.blendMode(p.BLEND);p.imageMode(p.CORNER);
const ctx=p.drawingContext;
ctx.save();
try{ctx.filter='blur('+blur.toFixed(2)+'px)';p.image(g,0,0,w,h);}
finally{ctx.restore();}
