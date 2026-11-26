// FOGO DOOM POLAR / fornalha violeta, calor propagado radialmente.
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
const POLAR=true;
// Propagação de calor para cima com resfriamento estocástico.
// Referência de técnica: fabiensanglard.net/doom_fire_psx/index.html
const FW=160,FH=144;
if(!s.heat){
  s.heat=new Float32Array(FW*FH);s.next=new Float32Array(FW*FH);s.clock=0;
  s.image=p.createImage(POLAR?192:FW,POLAR?192:FH);
  s.palette=Array.from({length:256},(_,i)=>{
    const v=i/255;
    if(POLAR)return [Math.min(255,v*600),Math.min(255,Math.max(0,v-.22)*430),Math.min(255,Math.max(0,v-.03)*350)];
    return [Math.min(255,v*800),Math.min(255,Math.max(0,v-.25)*450),Math.min(255,Math.max(0,v-.70)*850)];
  });
}
s.clock+=dt;let count=0;
while(s.clock>=1/30&&count++<3){
  s.clock-=1/30;s.next.fill(0);
  for(let x=0;x<FW;x++){
    const u=x/(FW-1),mirrored=u<=.5?u*2:2-u*2;
    const v=valueAt(Math.floor((POLAR?mirrored:u)*Math.max(0,strengths.length-1)));
    s.heat[(FH-1)*FW+x]=v<.01?0:v*(230+Math.random()*25);
    s.next[(FH-1)*FW+x]=s.heat[(FH-1)*FW+x];
  }
  const wind=Math.sin(t*.21)*(1+high*2);
  for(let y=1;y<FH;y++)for(let x=0;x<FW;x++){
    const index=y*FW+x;
    const heat=(s.heat[index]+s.heat[y*FW+(x+1)%FW]+s.heat[y*FW+(x+FW-1)%FW])/3;
    const shift=Math.floor(wind+(Math.random()-.5)*3);
    const target=(y-1)*FW+((x+shift+FW)%FW);
    s.next[target]=Math.max(s.next[target],heat-Math.random()*1.3-.45);
  }
  const swap=s.heat;s.heat=s.next;s.next=swap;
}
const image=s.image;image.loadPixels();
for(let y=0;y<image.height;y++)for(let x=0;x<image.width;x++){
  let index;
  if(POLAR){
    const dx=(x-image.width/2)/(image.width/2),dy=(y-image.height/2)/(image.height/2);
    const radius=Math.hypot(dx,dy),angle=(Math.atan2(dy,dx)+Math.PI)/(Math.PI*2);
    const fy=Math.floor((1-(radius-.12)/.88)*(FH-1));
    index=radius<.12||radius>1||fy<0||fy>=FH?-1:fy*FW+Math.min(FW-1,Math.floor(angle*FW));
  }else index=y*FW+x;
  const heat=index<0?0:Math.max(0,Math.min(255,Math.floor(s.heat[index])));
  const color=s.palette[heat],offset=(y*image.width+x)*4;
  image.pixels[offset]=color[0];image.pixels[offset+1]=color[1];image.pixels[offset+2]=color[2];image.pixels[offset+3]=255;
}
image.updatePixels();p.background(0);p.imageMode(p.CORNER);
if(POLAR){p.translate(w/2,h/2);p.rotate(Math.sin(t*.1)*.15);p.imageMode(p.CENTER);p.image(image,0,0,Math.min(w,h)*1.04,Math.min(w,h)*1.04);}
else{p.noSmooth();p.image(image,0,0,w,h);p.smooth();}
