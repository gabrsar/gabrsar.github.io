// POLAR / esculturas harmônicas, relevo e amostragem contínua.
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

// Amostragem triangular: frequência/waveform sobem e depois voltam.
const reflected=u=>{const q=((u%1)+1)%1;return q<=.5?q*2:2-q*2;};
const sample=(array,u)=>{
  if(!array.length)return 0;
  const pos=reflected(u)*(array.length-1),i=Math.floor(pos),f=pos-i;
  return (array[i]||0)*(1-f)+(array[Math.min(i+1,array.length-1)]||0)*f;
};

p.background(3,3,13,255*(1-Math.exp(-dt/.11)));
p.translate(w/2,h/2);p.colorMode(p.HSB,360,100,100,255);
const R=Math.min(w,h)*.52,TAU=Math.PI*2;
// Formas orgânicas com duas famílias de harmônicos em velocidades opostas.
for(let layer=13;layer>=0;layer--){
  const energy=valueAt(layer*3);if(energy<.012)continue;
  const radius=R*(.16+layer*.052),spin=Math.sin(t*.045)*.23+layer*.055;
  const hue=(205+layer*12+t*1.4)%360;
  p.fill(hue,65,25+energy*35,energy*8);p.stroke(hue,65,85+energy*15,energy*65);
  p.strokeWeight(layer%4===0?1.2:.55);p.beginShape();
  for(let j=0;j<=240;j++){
    const u=j/240,theta=u*TAU;
    const spectral=sample(strengths,u);
    const harmonic=Math.cos(theta*5+t*.09)*( .12+low*.16)
      +Math.sin(theta*8-t*.055)*high*.13;
    const radiusHere=radius*(1+harmonic+spectral*.22)+sample(a.waveform,u)*R*.035;
    const angle=theta+spin;
    p.vertex(Math.cos(angle)*radiusHere,Math.sin(angle)*radiusHere*(.85+.04*Math.sin(t*.06)));
  }
  p.endShape(p.CLOSE);
}
// Nervuras muito finas conectam as camadas, sem somar um brilho branco.
p.noFill();p.strokeWeight(.55);
for(let j=0;j<48;j++){
  const u=j/48,energy=sample(strengths,u);if(energy<.1)continue;
  const theta=u*TAU+Math.sin(t*.045)*.23;
  p.stroke((205+reflected(u)*140+t*1.4)%360,65,90,energy*35);
  p.line(Math.cos(theta)*R*.19,Math.sin(theta)*R*.19*.85,
    Math.cos(theta+.12)*R*(.55+energy*.27),Math.sin(theta+.12)*R*(.55+energy*.27)*.85);
}
p.colorMode(p.RGB,255);
