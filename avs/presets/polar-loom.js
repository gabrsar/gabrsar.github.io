// POLAR / observatório espiral: histórico facetado, sem emenda.
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

if(s.bandCount!==bands.length){s.rows=[];s.bandCount=bands.length;}
s.rows ||= [];s.sample ??= -10;
if(t-s.sample>=1/8){s.rows.push({born:t,values:[...strengths]});s.sample=t;}
s.rows=s.rows.filter(row=>t-row.born<12);
p.background(2,4,13,255*(1-Math.exp(-dt/.085)));
p.translate(w/2,h/2);p.rotate(Math.sin(t*.035)*.22);
p.colorMode(p.HSB,360,100,100,255);p.noStroke();
const R=Math.min(w,h)*.61,TAU=Math.PI*2,segments=96;
// Perspectiva elíptica e torção por idade dão profundidade sem círculos pulsantes.
for(const row of s.rows){
  const age=(t-row.born)/12,fade=Math.pow(1-age,1.65);
  const radius=R*(.10+age*.88),radialStep=R*.88/(12*8)*.83;
  const twist=age*.75;
  for(let j=0;j<segments;j++){
    const u=j/segments,v=sample(row.values,u);if(v<.012)continue;
    const angle=u*TAU+twist,span=TAU/segments*.85;
    const raised=v*R*.027,r1=radius+raised,r2=r1+radialStep*(.4+v*.9);
    const hue=(190+reflected(u)*150+age*35+t*.7)%360;
    const point=(r,a)=>[Math.cos(a)*r,Math.sin(a)*r*.78-age*R*.08];
    p.fill(hue,72,45+v*55,v*fade*170);
    p.quad(...point(r1,angle),...point(r1,angle+span),...point(r2,angle+span),...point(r2,angle));
    if(j%3===0&&v>.55){p.stroke(hue,45,100,fade*(v-.55)*110);p.strokeWeight(.6);p.line(...point(r2,angle),...point(r2,angle+span));p.noStroke();}
  }
}
// O núcleo mostra o espectro atual, espelhado e interpolado.
p.noFill();p.blendMode(p.ADD);
for(let filament=0;filament<2;filament++){
  p.stroke(190+filament*80,70,100,loud*85);p.strokeWeight(filament? .7:1.4);p.beginShape();
  for(let j=0;j<=192;j++){
    const u=j/192,theta=u*TAU;
    const r=R*(.085+sample(strengths,u)*.055+sample(a.waveform,u)*.025+filament*.012);
    p.vertex(Math.cos(theta)*r,Math.sin(theta)*r*.78);
  }
  p.endShape(p.CLOSE);
}
p.blendMode(p.BLEND);p.colorMode(p.RGB,255);
