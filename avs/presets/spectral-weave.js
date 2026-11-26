// TAPEÇARIA / histórico em células, frequência × tempo, ataques em costuras.
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

if(s.bandCount!==bands.length){s.rows=[];s.bandCount=bands.length;}
s.rows ||= [];s.sample ??= -10;
if(t-s.sample>=1/12){s.rows.push({born:t,values:[...strengths],hits:bands.map(g=>g.hit&&g.enabled)});s.sample=t;}
s.rows=s.rows.filter(row=>t-row.born<12);
p.background(3,4,10);p.noStroke();p.rectMode(p.CORNER);
const columns=Math.max(1,bands.length),cellW=w/columns;
for(const row of s.rows){
  const age=(t-row.born)/12,y=(1-age)*(h-22),cellH=(h-22)/144;
  for(let k=0;k<columns;k++){
    const value=row.values[k]||0;if(value<.01||!bands[k].enabled)continue;
    const c=p.color(bands[k].color);c.setAlpha(value*230*Math.pow(1-age,.65));p.fill(c);
    const inset=(1-value)*cellW*.40;
    p.rect(k*cellW+inset,y,Math.max(.5,cellW-2*inset-1),Math.max(.8,cellH*.78));
    if(row.hits[k]){p.fill(235,245,255,value*180*(1-age));p.rect(k*cellW+inset,y,Math.max(.5,cellW-2*inset-1),.8);}
  }
}
for(let k=0;k<columns;k++){
  const value=strengths[k]||0,c=p.color(bands[k].color);c.setAlpha(value*255);p.fill(c);
  p.rect(k*cellW+1,h-17,Math.max(.5,cellW-2),value*12);
}

p.stroke(150,175,200,30);p.strokeWeight(.7);p.line(0,h-21,w,h-21);
p.noStroke();p.fill(170,190,210,120);p.textSize(9);p.textAlign(p.LEFT,p.TOP);p.text('AGORA',5,h-16);
