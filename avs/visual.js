// MEMÓRIA / câmera manual e fileira do presente destacada.
/* global p, a, s */
const MAX_HISTORY=30, MIN_RENDER_TAIL=6, SAMPLE_RATE=12, TRAIL=.07;
const TAIL_FADE_SECONDS=4; // dissolve só a ponta antiga, sem mover o histórico
const TARGET_FPS=60;
const FOV_DEGREES=85;
const END_WIDTH=.12;     // passado converge a 12% da largura no horizonte
const OPACITY_START_DB=-90, OPACITY_END_DB=-60;
const WIDTH_END_DB=-40, THICKNESS_END_DB=-20, GLOW_END_DB=0;
const ramp=(lo,hi,v)=>{const x=Math.max(0,Math.min(1,(v-lo)/(hi-lo)));return x*x*(3-2*x);};
const t=a.time,dt=Math.min(a.dt||1/60,.06);
if(!a.groups){p.background(2,3,10);return;}
const keys=Object.keys(a.groups).sort((x,y)=>a.groups[x].low-a.groups[y].low);
if(s.g && s.keySignature!==keys.join(',')){s.dispose();s.g=null;}
if(!s.g){
  s.g=p.createGraphics(Math.max(64,Math.round(p.width*(a.renderScale??.75))),Math.max(64,Math.round(p.height*(a.renderScale??.75))),p.WEBGL);s.g.pixelDensity(1);
  const canvas=p.canvas;
  const initial=()=>({yaw:0,pitch:.95,zoom:1,panX:0,panY:0});
  s.camera=initial();s.drag=null;
  const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
  const onDown=e=>{
    if(e.button!==0&&e.button!==2)return;
    e.preventDefault();canvas.focus({preventScroll:true});
    canvas.setPointerCapture(e.pointerId);
    s.drag={id:e.pointerId,x:e.clientX,y:e.clientY,pan:e.button===2||e.shiftKey};
  };
  const onMove=e=>{
    if(!s.drag||s.drag.id!==e.pointerId)return;
    const dx=e.clientX-s.drag.x,dy=e.clientY-s.drag.y;
    s.drag.x=e.clientX;s.drag.y=e.clientY;
    if(s.drag.pan){s.camera.panX-=dx*s.camera.zoom;s.camera.panY-=dy*s.camera.zoom;}
    else{s.camera.yaw-=dx*.005;s.camera.pitch=clamp(s.camera.pitch+dy*.005,-1.35,1.35);}
  };
  const onUp=e=>{if(s.drag?.id===e.pointerId)s.drag=null;};
  const onWheel=e=>{e.preventDefault();s.camera.zoom=clamp(s.camera.zoom*Math.exp(clamp(e.deltaY,-100,100)*.0015),.4,2.8);};
  const onKey=e=>{
    if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','=','-','_','r','R'].includes(e.key))return;
    e.preventDefault();
    if(e.key==='r'||e.key==='R'){s.camera=initial();return;}
    if(e.key==='+'||e.key==='=')s.camera.zoom=clamp(s.camera.zoom*.92,.4,2.8);
    if(e.key==='-'||e.key==='_')s.camera.zoom=clamp(s.camera.zoom/ .92,.4,2.8);
    if(e.shiftKey){
      if(e.key==='ArrowLeft')s.camera.panX-=15;
      if(e.key==='ArrowRight')s.camera.panX+=15;
      if(e.key==='ArrowUp')s.camera.panY-=15;
      if(e.key==='ArrowDown')s.camera.panY+=15;
    }else{
      if(e.key==='ArrowLeft')s.camera.yaw-=.04;
      if(e.key==='ArrowRight')s.camera.yaw+=.04;
      if(e.key==='ArrowUp')s.camera.pitch=clamp(s.camera.pitch-.04,-1.35,1.35);
      if(e.key==='ArrowDown')s.camera.pitch=clamp(s.camera.pitch+.04,-1.35,1.35);
    }
  };
  const onMenu=e=>e.preventDefault();
  canvas.tabIndex=0;canvas.style.touchAction='none';
  canvas.setAttribute('aria-label','Visual 3D: arraste para orbitar, scroll para zoom, setas para direção, R para restaurar');
  const listeners=[['pointerdown',onDown],['pointermove',onMove],['pointerup',onUp],
    ['pointercancel',onUp],['lostpointercapture',onUp],['wheel',onWheel],['keydown',onKey],['contextmenu',onMenu]];
  for(const [event,handler]of listeners)canvas.addEventListener(event,handler,{passive:false});
  s.dispose=()=>{for(const [event,handler]of listeners)canvas.removeEventListener(event,handler);s.g.remove();};
  s.rows=[];s.sample=-10;s.started=t;
  s.tailCut=MAX_HISTORY;s.targetTail=MAX_HISTORY;s.frameMs=1000/TARGET_FPS;
  s.budgetAt=t;s.goodTime=0;s.keySignature=keys.join(',');
  s.colors=keys.map(k=>[0,2,4].map(i=>parseInt(a.groups[k].color.slice(1+i,3+i),16)));
  p.background(2,3,10);
}
const g=s.g;
const rw=Math.max(64,Math.round(p.width*(a.renderScale??.75))),rh=Math.max(64,Math.round(p.height*(a.renderScale??.75)));
if(g.width!==rw||g.height!==rh)g.resizeCanvas(rw,rh);
if(t-s.sample>=1/SAMPLE_RATE){
  s.rows.push({born:t,db:keys.map(k=>a.groups[k].db??-120)});s.sample=t;
}
s.rows=s.rows.filter(row=>t-row.born<MAX_HISTORY);
// Tempo, espaçamento e amostragem ficam FIXOS. Só o final antigo é ocultado.
const actualMs=a.dt*1000;
if(actualMs>0&&actualMs<150)s.frameMs+=(actualMs-s.frameMs)*(1-Math.exp(-dt/.8));
if(t-s.budgetAt>=1 && t-s.started>1.5){
  const measuredFPS=1000/s.frameMs;
  if(measuredFPS<54){
    s.targetTail=Math.max(MIN_RENDER_TAIL,s.targetTail-(measuredFPS<40?3:1.5));
    s.goodTime=0;
  }else if(measuredFPS>=58){
    s.goodTime++;
    if(s.goodTime>=3){s.targetTail=Math.min(MAX_HISTORY,s.targetTail+1);s.goodTime=0;}
  }else s.goodTime=0;
  s.budgetAt=t;
}
// Limita a velocidade da borda e dá vários segundos para ela se dissolver.
s.tailCut+=Math.max(-dt*.8,Math.min(dt*.35,s.targetTail-s.tailCut));
const MEMORY=MAX_HISTORY;
// Vista baixa: o presente fica na frente e o passado vai ao horizonte.
const worldW=p.width-2*Math.min(30,p.width*.04),worldH=p.height*.70;
const laneW=worldW/keys.length,centerY=-p.height*.05;
const aspect=g.width/g.height,fov=FOV_DEGREES*Math.PI/180;
const distance=Math.max(worldW/aspect,worldH)*.5/Math.tan(fov/2)*1.45*s.camera.zoom;
const c=s.camera,look=[c.panX,c.panY,8];
const eye=[look[0]+Math.sin(c.yaw)*Math.cos(c.pitch)*distance,
  look[1]+Math.sin(c.pitch)*distance,look[2]+Math.cos(c.yaw)*Math.cos(c.pitch)*distance];
g.clear();g.perspective(fov,aspect,1,Math.max(10000,distance*8));
g.camera(...eye,...look,0,1,0);
g.colorMode(p.RGB,255);g.blendMode(p.BLEND);
// Trilhos discretos marcam as bandas mesmo em silêncio.
g.noFill();g.strokeWeight(.7);
for(let k=0;k<keys.length;k++){
  if(!a.groups[keys[k]].enabled)continue;
  const x=((k+.5)/keys.length-.5)*worldW;
  g.stroke(...s.colors[k],17);g.line(x*END_WIDTH,-worldH/2+centerY,0,x,worldH/2+centerY,0);
}
// Fileira de agora atualizada a cada frame, independente da amostragem do histórico.
const present={born:t,db:keys.map(k=>a.groups[k].db??-120),isNow:true};
// Culling só depois do fade; não remove fileiras do meio nem muda a geometria.
const tailOpacity=seconds=>1-ramp(Math.max(0,s.tailCut-TAIL_FADE_SECONDS),s.tailCut,seconds);
const rows=[...s.rows.filter(row=>{
  const seconds=t-row.born;
  return seconds>=1/SAMPLE_RATE && tailOpacity(seconds)>.003;
}),present];
// Régua fina distingue a borda do presente mesmo em silêncio.
g.stroke(190,215,240,65);g.strokeWeight(1);
g.line(-worldW/2,worldH/2+centerY,1,worldW/2,worldH/2+centerY,1);
const cells=[];
for(const row of rows){
  const age=(t-row.born)/MEMORY;
  const fade=Math.pow(1-age,1.8)*tailOpacity(t-row.born);
  for(let k=0;k<keys.length;k++){
    const db=row.db[k];
    if(!a.groups[keys[k]].enabled||db<=OPACITY_START_DB)continue;
    const opacity=ramp(OPACITY_START_DB,OPACITY_END_DB,db);
    const wide=ramp(OPACITY_END_DB,WIDTH_END_DB,db);
    const thick=ramp(WIDTH_END_DB,THICKNESS_END_DB,db);
    const perspective=1-age*(1-END_WIDTH);
    const x=((k+.5)/keys.length-.5)*worldW*perspective,y=(.5-age)*worldH+centerY;
    const width=laneW*(.10+wide*.72)*perspective,height=(row.isNow?3.4:.8)+thick*2.6;
    // Profundidade real: as barras mais fortes se erguem para fora do plano.
    const volume=1+thick*38,z=volume/2;
    const glow=ramp(THICKNESS_END_DB,GLOW_END_DB,db)*Math.exp(-(t-row.born)/.35)*fade;
    const depth=(x-eye[0])*(look[0]-eye[0])+(y-eye[1])*(look[1]-eye[1])+(z-eye[2])*(look[2]-eye[2]);
    cells.push({x,y,z,width,height,volume,glow,alpha:fade*opacity*(row.isNow?255:145),isNow:!!row.isNow,k,depth});
  }
}
// Transparências ordenadas conforme o ponto de vista atual.
cells.sort((a,b)=>b.depth-a.depth);
const gl=g.drawingContext;gl.depthMask(false);
g.noStroke();
for(const cell of cells){
  const original=s.colors[cell.k];
  // Presente mais saturado: remove o cinza sem esbranquiçar a cor.
  const lo=Math.min(...original),span=Math.max(1,Math.max(...original)-lo);
  const c=cell.isNow?original.map(v=>Math.round(25+(v-lo)/span*230)):original;
  g.push();g.translate(cell.x,cell.y,cell.z);
  if(cell.glow>.008){
    g.blendMode(p.ADD);
    for(let halo=3;halo>=1;halo--){
      g.fill(...c,cell.glow*(9+halo*2));
      g.box(Math.min(laneW*.98,cell.width+halo*3),cell.height+halo*3,cell.volume+halo*3);
    }
    g.blendMode(p.BLEND);
  }
  g.fill(...c,cell.alpha);
  if(cell.isNow){g.stroke(...c,cell.alpha*.85);g.strokeWeight(.65);}
  g.box(cell.width,cell.height,cell.volume);
  g.noStroke();
  g.pop();
}
gl.depthMask(true);
// Composição mantém o rastro curto e o texto da interface nítido.
p.blendMode(p.BLEND);p.colorMode(p.RGB,255);
p.background(2,3,10,255*(1-Math.exp(-dt/TRAIL)));
p.imageMode(p.CORNER);p.image(g,0,0,p.width,p.height);
p.noStroke();p.textAlign(p.LEFT,p.TOP);p.textSize(10);p.fill(150,170,195,200);
if(a.showHUD)p.text('AGORA: FILEIRA CLARA · ARRASTE: ÓRBITA · SCROLL: ZOOM · SETAS: DIREÇÃO · SHIFT: PAN · R: RESET',12,10);
const hz=v=>v>=1000?(v/1000).toFixed(v%1000?1:0)+'k':String(v);
p.textAlign(p.CENTER,p.TOP);p.textSize(9);
const labelEvery=Math.max(1,Math.ceil(keys.length*32/p.width));
for(let k=0;k<keys.length;k++){
  const group=a.groups[keys[k]],x=(k+.5)/keys.length*p.width;
  p.fill(...s.colors[k],group.enabled?190:40);
  p.rectMode(p.CENTER);p.rect(x,p.height-17,Math.max(2,p.width/keys.length*.7),3);
  if(k%labelEvery===0)p.text(hz(group.low),x,p.height-34);
}

p.textAlign(p.LEFT,p.TOP);p.fill(150,170,195,180);if(a.showHUD)p.text(keys.length+' BANDAS · '+MAX_HISTORY+'s FIXOS · '+Math.round(1000/s.frameMs)+' FPS · FOV '+FOV_DEGREES+'°',12,p.height-55);
