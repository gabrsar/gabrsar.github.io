// HYPERDRIVE / pista tubular procedural, paredes opacas, percurso contínuo e bifurcações visuais.
/* global p, a, s */
const dt=Math.min(a.dt||1/60,.06),t=a.time,w=p.width,h=p.height;
const groups=Object.values(a.groups||{}).sort((x,y)=>x.low-y.low);
const clamp=(v,lo=0,hi=1)=>Math.max(lo,Math.min(hi,v));
const levels=groups.map(g=>g.enabled?(a.visualLevel?a.visualLevel(g.db??-120):clamp(((g.db??-120)+80)/55)):0);
const band=(start,end)=>levels.slice(start,end).reduce((sum,v)=>sum+v,0)/Math.max(1,end-start);
const region=(lo,hi)=>{const selected=levels.filter((_,i)=>groups[i].low<hi&&groups[i].high>lo);return selected.reduce((n,x)=>n+x,0)/Math.max(1,selected.length);};
const bass=region(25,250),mid=region(250,4000),high=region(4000,22000);
const power=levels.length?Math.max(...levels):0;
const STEP=100,COUNT=80,SIDES=18;
if(!s.g){
  s.g=p.createGraphics(Math.max(64,Math.round(w*(a.renderScale??.75))),Math.max(64,Math.round(h*(a.renderScale??.75))),p.WEBGL);s.g.pixelDensity(1);s.dispose=()=>s.g.remove();
  s.sections=[];s.offset=0;s.speed=260;s.roll=0;s.bass=0;s.mid=0;s.high=0;s.power=0;
  s.turn=0;s.slope=0;s.bearing=0;s.pitch=0;s.x=0;s.y=0;s.serial=0;
  s.lookX=0;s.lookY=0;s.hue=205;s.nextMood=t+5;s.targetTurn=0;s.targetSlope=0;s.targetHue=205;
}
for(const [key,value]of [['bass',bass],['mid',mid],['high',high],['power',power]]){
  s[key]+=(value-s[key])*(1-Math.exp(-dt/.4));
}
if(t>s.nextMood){
  s.targetTurn=(Math.random()-.5)*1.5;
  s.targetSlope=(Math.random()-.5)*.75;
  s.targetHue+=50+Math.random()*100;
  s.nextMood=t+3+Math.random()*6;
}
s.turn+=(s.targetTurn*(.25+s.mid*.75)-s.turn)*(1-Math.exp(-dt/2));
s.slope+=(s.targetSlope*(.2+s.high*.8)-s.slope)*(1-Math.exp(-dt/2.5));
s.hue+=(s.targetHue-s.hue)*(1-Math.exp(-dt/3));
s.speed+=((180+s.power*900+s.bass*600+(a.music?.trend||0)*100)-s.speed)*(1-Math.exp(-dt/.8));
const targetRoll=s.turn*.45+Math.sin(t*.13)*s.high*.16;
s.roll+=(targetRoll-s.roll)*(1-Math.exp(-dt/1.8));
function appendSection(){
  // Geração incremental: mudanças da música alteram só o trecho novo da pista.
  s.bearing+=(s.turn*.85-s.bearing)*.12;
  s.pitch+=(s.slope*.7-s.pitch)*.12;
  s.x+=Math.sin(s.bearing)*STEP;s.y+=Math.sin(s.pitch)*STEP;
  const index=s.serial++;
  const obstacle=index%5===0&&Math.random()<.25+s.power*.65?1+Math.floor(Math.random()*4):0;
  s.sections.push({x:s.x,y:s.y,radius:285+s.bass*65+Math.sin(index*.17)*18,
    hue:s.hue,gap:index%61>=51&&index%61<=55,branch:index%37===23?(Math.random()<.5?-1:1):0,obstacle,phase:Math.random()*Math.PI*2,drive:s.power});
}
while(s.sections.length<COUNT+1)appendSection();
s.offset+=s.speed*dt;
while(s.offset>=STEP){s.offset-=STEP;s.sections.shift();appendSection();}
const mix=s.offset/STEP;
const cx=s.sections[0].x+(s.sections[1].x-s.sections[0].x)*mix;
const cy=s.sections[0].y+(s.sections[1].y-s.sections[0].y)*mix;
const g=s.g,rw=Math.max(64,Math.round(w*(a.renderScale??.75))),rh=Math.max(64,Math.round(h*(a.renderScale??.75)));if(g.width!==rw||g.height!==rh)g.resizeCanvas(rw,rh);
g.clear();g.resetMatrix();g.colorMode(p.HSB,360,100,100,255);g.background(230,70,3);
g.perspective(Math.PI*.53,w/h,5,16000);
// Interpola também o alvo à frente: não salta quando troca de segmento.
const aheadX=s.sections[6].x+(s.sections[7].x-s.sections[6].x)*mix;
const aheadY=s.sections[6].y+(s.sections[7].y-s.sections[6].y)*mix;
s.lookX+=((aheadX-cx)*.70-s.lookX)*(1-Math.exp(-dt/.28));
s.lookY+=((aheadY-cy)*.70-s.lookY)*(1-Math.exp(-dt/.28));
g.camera(0,-14,105,s.lookX,s.lookY,-800,Math.sin(s.roll),Math.cos(s.roll),0);
const gl=g.drawingContext;
gl.depthMask(true);gl.enable(gl.DEPTH_TEST);gl.disable(gl.CULL_FACE);
g.blendMode(p.BLEND);
const point=(section,index,j)=>{
  const theta=j/SIDES*Math.PI*2;
  return [section.x-cx+Math.cos(theta)*section.radius,
    section.y-cy+Math.sin(theta)*section.radius*.88,
    -index*STEP+s.offset];
};
// Painéis escuros + malha neon. O desaparecimento na distância é contínuo.
for(let i=COUNT-1;i>=0;i--){
  const section=s.sections[i],next=s.sections[i+1];
  const fog=Math.pow(1-i/COUNT,.75),hue=((section.hue+i*.5)%360+360)%360;
  for(let j=0;j<SIDES;j++){
    const floor=j>=3&&j<=6;
    const value=levels[Math.floor(j/SIDES*levels.length)]||0;
    const opening=section.branch && (section.branch>0?(j===0||j===17):(j===8||j===9));
    if(!(section.gap&&!floor)&&!opening){
      // Faces opacas em triângulos: evita falhas em quads não coplanares.
      g.noStroke();g.fill((hue+j*2)%360,65,(floor?12:7)+fog*(7+value*8),255);
      const a1=point(section,i,j),a2=point(section,i,j+1);
      const b1=point(next,i+1,j),b2=point(next,i+1,j+1);
      g.beginShape(p.TRIANGLES);
      for(const v of [a1,a2,b2,a1,b2,b1])g.vertex(...v);
      g.endShape();
    }
    g.stroke((hue+j*3)%360,75,35+value*55,fog*190);g.strokeWeight(.7+value*.6);
    g.line(...point(section,i,j),...point(next,i+1,j));
    if(i%2===0){g.stroke((hue+35)%360,70,50+section.drive*30,fog*110);g.line(...point(section,i,j),...point(section,i,j+1));}
  }
  // Galeria lateral nas bifurcações; o percurso principal segue contínuo.
  if(section.branch){
    const side=section.branch;
    for(let q=8;q>=0;q--){
      const progress=q/8,rr=section.radius*(.70-progress*.18);
      const bx=section.x-cx+side*(section.radius*.8+q*110);
      const by=section.y-cy-Math.sin(progress*Math.PI)*80;
      const bz=-i*STEP+s.offset-q*75;
      g.stroke((hue+85)%360,65,85,fog*(1-progress*.7)*150);g.strokeWeight(1);
      g.noFill();g.beginShape();
      for(let j=0;j<=12;j++){
        const angle=j/12*Math.PI*2;
        g.vertex(bx+Math.cos(angle)*rr*.62,by+Math.sin(angle)*rr,bz);
      }
      g.endShape();
    }
  }
  // Quatro obstáculos visuais: aros facetados, pilares, portais e prismas.
  if(section.obstacle){
    g.push();g.translate(section.x-cx,section.y-cy,-i*STEP+s.offset);
    const color=(hue+90)%360;
    g.stroke(color,75,95,fog*230);g.strokeWeight(2);g.noFill();
    if(section.obstacle===1){
      g.push();g.rotateZ(section.phase+t*.10*section.drive);
      g.beginShape();for(let j=0;j<=8;j++){const angle=j/8*Math.PI*2;g.vertex(Math.cos(angle)*section.radius*.72,Math.sin(angle)*section.radius*.72,0);}g.endShape();g.pop();
    }else if(section.obstacle===2){
      for(const side of [-1,1]){g.push();g.translate(side*section.radius*.7,0,0);g.fill(color,80,35,fog*230);g.box(28,section.radius*1.3,35);g.pop();}
    }else if(section.obstacle===3){
      g.push();g.rotateZ(section.phase*.2);g.rectMode(p.CENTER);g.rect(0,0,section.radius*1.3,section.radius*1.15);g.pop();
    }else{
      g.push();g.rotateZ(section.phase+t*.08*section.drive);g.translate(section.radius*.65,0,0);
      g.rotateX(t*.15);g.rotateY(t*.12);g.fill(color,80,40,fog*210);g.box(48,48,48);g.pop();
    }
    g.pop();
  }
}
// Mantém a pista visível em silêncio, mas desacelera e retira os impactos.
p.blendMode(p.BLEND);p.background(2,3,10);p.imageMode(p.CORNER);p.image(g,0,0,w,h);
p.colorMode(p.RGB,255);p.noStroke();p.fill(135,185,220,150);p.textSize(10);
p.textAlign(p.LEFT,p.TOP);if(a.showHUD)p.text('HYPERDRIVE · '+Math.round(s.speed)+' · GRAVES: PROPULSÃO / MÉDIOS: CURVAS / AGUDOS: BRILHO',12,12);
