// TERRENO MUSICAL / faces opacas, arestas e objetos low poly esparsos.
/* global p, a, s */
const dt=Math.min(a.dt||1/60,.06),t=a.time,w=p.width,h=p.height;
const bands=Object.values(a.groups||{}).sort((x,y)=>x.low-y.low);
const clamp=v=>Math.max(0,Math.min(1,v));
// Leitura local reduzida, sem mudar os grupos dos outros presets.
const inputLevels=bands.map(g=>g.enabled?(a.visualLevel?a.visualLevel(g.db??-120):clamp(((g.db??-120)+80)/55)):0);
const bandCount=Math.min(16,bands.length),ceiling=Math.max(250,...bands.map(g=>g.high));
const levels=Array.from({length:bandCount},(_,i)=>{
  const lo=25*Math.pow(ceiling/25,i/bandCount),hi=25*Math.pow(ceiling/25,(i+1)/bandCount);
  let sum=0,weight=0;
  bands.forEach((g,k)=>{const overlap=Math.max(0,Math.log(Math.max(1,Math.min(hi,g.high)) / Math.max(lo,g.low)));sum+=inputLevels[k]*overlap;weight+=overlap;});
  return weight?sum/weight:0;
});
const loud=levels.length?Math.max(...levels):0;
const HISTORY=24,RATE=5,COLS=24,WIDTH=1500,LENGTH=4200;
if(!s.g){
  s.g=p.createGraphics(Math.max(64,Math.floor(w*.75)),Math.max(64,Math.floor(h*.75)),p.WEBGL);s.g.pixelDensity(1);s.dispose=()=>s.g.remove();
  s.rows=[];s.objects=[];s.lastSample=-10;s.lastSpawn=-10;s.nextSpawn=t+6;s.previous=0;
}
// Resolução da malha independente das bandas: sem colunas demarcando frequências.
const terrainSample=index=>{
  let sum=0,weight=0;
  for(let offset=-2;offset<=2;offset++){
    const k=Math.max(0,Math.min(levels.length-1,index+offset));
    const mix=[1,3,6,3,1][offset+2];sum+=(levels[k]||0)*mix;weight+=mix;
  }
  return sum/weight;
};
const values=Array.from({length:COLS+1},(_,i)=>{
  const pos=i/COLS*Math.max(0,levels.length-1),lo=Math.floor(pos),f=pos-lo;
  const eased=f*f*(3-2*f);
  return Math.pow(terrainSample(lo)*(1-eased)+terrainSample(lo+1)*eased,1.5);
});
if(t-s.lastSample>=1/RATE){s.rows.push({born:t,values});s.lastSample=t;}
s.rows=s.rows.filter(row=>t-row.born<HISTORY);
const strongBeat=bands.some((g,i)=>g.enabled&&g.hit&&(inputLevels[i]||0)>.72);
const abnormal=loud>.88&&s.previous<.70;s.previous=loud;
if(loud>.10&&t-s.lastSpawn>3&&((strongBeat||abnormal)||t>s.nextSpawn)){
  const col=3+Math.floor(Math.random()*(COLS-6));
  s.objects.push({born:t,col,ground:30-values[col]*230,
    kind:Math.floor(Math.random()*6),turn:Math.random()*Math.PI*2,seed:Math.random()});
  s.lastSpawn=t;s.nextSpawn=t+5+Math.random()*10;
}
s.objects=s.objects.filter(o=>t-o.born<HISTORY).slice(-12);
const g=s.g,rw=Math.max(64,Math.floor(w*.75)),rh=Math.max(64,Math.floor(h*.75));
if(g.width!==rw||g.height!==rh)g.resizeCanvas(rw,rh);
g.clear();g.resetMatrix();g.colorMode(p.HSB,360,100,100,255);g.background(225,60,4);
g.perspective(Math.PI*.36,w/h,5,9000);g.camera(0,-300,720,0,-50,-1500,0,1,0);
const gl=g.drawingContext;gl.depthMask(true);gl.enable(gl.DEPTH_TEST);gl.disable(gl.CULL_FACE);
const far={born:t-HISTORY,values:new Array(COLS+1).fill(0)};
const current={born:t,values};
const rows=[far,...s.rows.filter(row=>t-row.born>1/RATE),current];
g.strokeWeight(.65);
// Triangle strips com preenchimento escuro: wireframe com oclusão real.
for(let j=0;j<rows.length-1;j++){
  const older=rows[j],newer=rows[j+1],age=(t-newer.born)/HISTORY;
  const fog=Math.pow(1-age,1.3);
  g.fill(220,50,4+fog*5,255);g.stroke(165+age*65,58,10+fog*48,255);
  g.beginShape(p.TRIANGLE_STRIP);
  for(let i=0;i<=COLS;i++){
    const x=(i/COLS-.5)*WIDTH;
    g.vertex(x,30-older.values[i]*230,150-(t-older.born)/HISTORY*LENGTH);
    g.vertex(x,30-newer.values[i]*230,150-(t-newer.born)/HISTORY*LENGTH);
  }
  g.endShape();
}
for(const object of s.objects){
  const age=(t-object.born)/HISTORY,fog=Math.pow(1-age,1.2);
  const x=(object.col/COLS-.5)*WIDTH,z=150-age*LENGTH;
  g.push();g.translate(x,object.ground,z);g.rotateY(object.turn);
  g.stroke((145+object.kind*28)%360,60,20+fog*65,255);g.strokeWeight(.8);
  g.fill(220,40,4+fog*7,255);
  if(object.kind===0){
    g.push();g.translate(0,-14,0);g.cylinder(4,28,5,1);g.pop();
    for(let layer=0;layer<2;layer++){g.push();g.translate(0,-36-layer*18,0);g.cone(24-layer*7,48-layer*10,6,1);g.pop();}
  }else if(object.kind===1){
    g.push();g.translate(0,-20,0);g.rotateY(object.seed+t*.06);g.box(35,40,35);g.pop();
  }else if(object.kind===2){
    g.push();g.translate(0,-26,0);g.cone(35,52,4,1);g.pop();
  }else if(object.kind===3){
    // Animal estilizado: corpo, cabeça e quatro pernas.
    g.push();g.translate(0,-23,0);g.box(34,15,14);g.pop();
    g.push();g.translate(21,-30,0);g.box(13,15,12);g.pop();
    for(const dx of [-11,11])for(const dz of [-5,5]){g.push();g.translate(dx,-9,dz);g.box(4,18,4);g.pop();}
  }else if(object.kind===4){
    g.translate(0,-90-Math.sin(t*1.8+object.seed*7)*9,0);
    const flap=Math.sin(t*3+object.seed*6)*13;
    g.line(-32,flap,0,0,0,0);g.line(0,0,0,32,flap,0);
    g.line(-32,flap,0,-15,flap+7,-12);g.line(32,flap,0,15,flap+7,-12);
  }else{
    g.push();g.translate(0,-24,0);g.rotateZ(.3);g.sphere(27,5,3);g.pop();
  }
  g.pop();
}
p.blendMode(p.BLEND);p.colorMode(p.RGB,255);p.background(2,3,10);p.imageMode(p.CORNER);p.image(g,0,0,w,h);
p.noStroke();p.fill(130,185,180,170);p.textSize(10);p.textAlign(p.LEFT,p.TOP);
p.text('MUNDO MUSICAL',12,12);
