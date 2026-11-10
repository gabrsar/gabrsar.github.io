import {FUNCTIONS, trigValues, normalize, format, radiansLabel, graphSegments} from './trig-math.mjs';

const $ = selector => document.querySelector(selector);
const lab=$('.lab'), circle=$('#unit-circle'), functionPicker=$('#functions'), pointsControl=$('#points');
const degreeInput=$('#angle-number'), slider=$('#angle-range'), unitSelect=$('#units'), play=$('#play');
const NS='http://www.w3.org/2000/svg', STORAGE='gabriel-trig-v2';
const names=['A','B','C','D'];
const newPoints=()=>names.map((name,i)=>({name,angle:Math.round((i*90+18+Math.random()*54)*10)/10}));
let state={angle:45,key:'sin',units:'deg',view:'circle',points:newPoints(),point:null};
try {
  const saved=JSON.parse(localStorage.getItem(STORAGE));
  if(saved && Number.isFinite(saved.angle) && saved.angle>=0 && saved.angle<=360){
    state.angle=saved.angle;
    if(FUNCTIONS.some(f=>f.key===saved.key))state.key=saved.key;
    if(['deg','rad'].includes(saved.units))state.units=saved.units;
    if(['circle','graphs','both'].includes(saved.view))state.view=saved.view;
    if(Array.isArray(saved.points)&&saved.points.length===4&&saved.points.every((p,i)=>p?.name===names[i]&&Number.isFinite(p.angle)&&p.angle>=0&&p.angle<360))state.points=saved.points;
  }
} catch { /* Storage is optional, including in private browsing. */ }
let geometry, dragging=false, playing=false, animationFrame=null, previousTime=null, lastPaint=0, resizeFrame=null, diagramWidth=null;
const graphViews=new Map(), cards=new Map();
const degreeText=n=>n.toLocaleString('pt-BR',{maximumFractionDigits:1})+'°';
const angleText=()=>state.units==='rad'?radiansLabel(state.angle):degreeText(state.angle);
const color=key=>`var(--${key})`;
function save(){try{localStorage.setItem(STORAGE,JSON.stringify(state));}catch{}}
function node(tag,attrs={},text){const el=document.createElementNS(NS,tag);Object.entries(attrs).forEach(([key,value])=>el.setAttribute(key,value));if(text!==undefined)el.textContent=text;return el;}
function add(parent,tag,attrs,text){const el=node(tag,attrs,text);parent.append(el);return el;}
function setAngle(value,{persist=true}={}){
  if(!Number.isFinite(value))return;
  state.angle=value===360?360:normalize(value);state.point=null;render();if(persist)save();
}
function setFunction(key){state.key=key;render();save();}
function stop(){playing=false;play.textContent='▶ Animar';play.setAttribute('aria-pressed','false');$('#selection-status').setAttribute('aria-live','polite');if(animationFrame!==null)cancelAnimationFrame(animationFrame);animationFrame=null;previousTime=null;save();}
function animate(time){
  if(!playing)return;
  if(previousTime===null)previousTime=time;
  const elapsed=Math.min((time-previousTime)/1000,.1);previousTime=time;
  state.angle=normalize(state.angle+elapsed*Number($('#speed').value));state.point=null;
  if(time-lastPaint>=1000/30){render();lastPaint=time;}
  animationFrame=requestAnimationFrame(animate);
}
play.addEventListener('click',()=>{
  if(playing){stop();return;}
  playing=true;previousTime=null;play.textContent='Ⅱ Pausar';play.setAttribute('aria-pressed','true');$('#selection-status').setAttribute('aria-live','off');animationFrame=requestAnimationFrame(animate);
});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&playing)stop();});
degreeInput.addEventListener('input',()=>{
  const value=degreeInput.valueAsNumber;if(!Number.isFinite(value))return;
  stop();setAngle(state.units==='rad'?value*180/Math.PI:value);
});
degreeInput.addEventListener('blur',()=>render());
slider.addEventListener('input',()=>{if(playing)stop();setAngle(Number(slider.value));});
unitSelect.value=state.units;
unitSelect.addEventListener('change',()=>{state.units=unitSelect.value;render();save();});
document.querySelectorAll('button[data-view]').forEach(button=>button.addEventListener('click',()=>{
  state.view=button.dataset.view;applyView();render();save();
}));
function applyView(){
  lab.dataset.view=state.view;
  document.querySelectorAll('button[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===state.view)));
}

FUNCTIONS.forEach(meta=>{
  const button=document.createElement('button');button.type='button';button.className='function-card';button.style.setProperty('--series',color(meta.key));
  const label=document.createElement('span');label.className='function-name';
  const swatch=document.createElement('span');swatch.className='swatch';swatch.setAttribute('aria-hidden','true');label.append(swatch,document.createTextNode(meta.short+' θ'));
  const value=document.createElement('span');value.className='function-value';button.append(label,value);button.addEventListener('click',()=>setFunction(meta.key));
  functionPicker.append(button);cards.set(meta.key,{button,value});
  const article=document.createElement('article');article.className='graph-card';article.style.setProperty('--series',color(meta.key));
  const heading=document.createElement('h3'),name=document.createElement('span');
  const dot=swatch.cloneNode();name.append(dot,document.createTextNode(meta.name));
  const output=document.createElement('output');heading.append(name,output);
  const svg=node('svg',{class:'trig-plot',role:'img','aria-label':`Gráfico de ${meta.name.toLowerCase()} em função do ângulo`});
  const caption=document.createElement('small');caption.textContent=meta.poles.length?'Tracejado: assíntota vertical. A curva continua além da escala.':'Uma volta completa: 0 a 360° (0 a 2π rad).';
  article.append(heading,svg,caption);$('#graphs').append(article);
  const view={meta,svg,output,width:null,segments:graphSegments(meta.key),guide:null,marker:null,scale:null};graphViews.set(meta.key,view);
  svg.addEventListener('pointerdown',event=>{
    const box=svg.getBoundingClientRect();if(!view.scale||!box.width)return;
    const x=(event.clientX-box.left)*view.width/box.width;
    if(playing)stop();state.key=meta.key;setAngle(Math.max(0,Math.min(360,(x-view.scale.left)/(view.scale.right-view.scale.left)*360)));
  });
});

function updatePoints(){
  // Keep the controls mounted so keyboard focus survives a selection.
  if(!pointsControl.children.length){
    names.forEach((name,i)=>{
      const b=document.createElement('button');b.type='button';b.className='button';
      b.addEventListener('click',()=>{if(playing)stop();state.angle=state.points[i].angle;state.point=name;render();save();});pointsControl.append(b);
    });
    const random=document.createElement('button');random.type='button';random.className='button';random.textContent='↻ Sortear';
    random.addEventListener('click',()=>{if(playing)stop();state.points=newPoints();state.angle=state.points[0].angle;state.point='A';render();save();});pointsControl.append(random);
  }
  state.points.forEach((point,i)=>{const b=pointsControl.children[i];b.textContent=`${point.name} · ${degreeText(point.angle)}`;b.setAttribute('aria-pressed',String(state.point===point.name));});
}

function drawCircle(values){
  const width=circle.parentElement.getBoundingClientRect().width;
  if(!width||state.view==='graphs')return;
  diagramWidth=width;
  const w=circle.getBoundingClientRect().width||width,r=Math.max(60,Math.min(168,(w-68)/3.05)),h=3.1*r+48,cx=w/2,cy=h/2,limit=1.36;
  geometry={w,h,r,cx,cy};circle.setAttribute('viewBox',`0 0 ${w} ${h}`);circle.style.height=h+'px';circle.replaceChildren();
  const X=x=>cx+x*r,Y=y=>cy-y*r;
  const line=(x1,y1,x2,y2,stroke,width=1,dashed=false)=>add(circle,'line',{x1:X(x1),y1:Y(y1),x2:X(x2),y2:Y(y2),stroke,'stroke-width':width,...(dashed?{'stroke-dasharray':'5 5'}:{})});
  const label=(x,y,text,anchor='middle',direct=false)=>add(circle,'text',{x:X(x),y:Y(y),'text-anchor':anchor,...(direct?{class:'direct'}:{})},text);
  add(circle,'title',{},`Ângulo ${degreeText(state.angle)}. ${FUNCTIONS.find(f=>f.key===state.key).name}: ${format(values[state.key])}.`);
  add(circle,'desc',{},'Círculo de raio 1. O ponto P tem coordenadas cosseno e seno do ângulo. Use os controles de ângulo para navegar com o teclado.');
  line(-1.42,0,1.42,0,'var(--line)');line(0,-1.42,0,1.42,'var(--line)');
  add(circle,'circle',{cx,cy,r,fill:'none',stroke:'#8d9e94','stroke-width':1.4});
  label(1.49,-.035,'x');label(.06,1.44,'y','start');
  label(-1.1,-.11,'−1');label(1,-.14,'1');label(-.07,1.01,'1','end');label(-.07,-.99,'−1','end');label(-.055,-.13,'0','end');
  const a=state.angle*Math.PI/180,c=values.cos,s=values.sin;
  add(circle,'path',{d:`M ${cx} ${cy} L ${X(c)} ${cy} L ${X(c)} ${Y(s)} Z`,fill:'var(--cos)','fill-opacity':.06});
  line(0,0,c,s,'var(--ink)',2);
  const arc=.24,theta=Math.min(state.angle,359.99)*Math.PI/180;
  if(state.angle>0)add(circle,'path',{d:`M ${X(arc)} ${cy} A ${r*arc} ${r*arc} 0 ${state.angle>180?1:0} 0 ${X(arc*Math.cos(theta))} ${Y(arc*Math.sin(theta))}`,fill:'none',stroke:'var(--ink)','stroke-width':1.2});
  const mid=(state.angle||40)*Math.PI/360;label(.36*Math.cos(mid),.36*Math.sin(mid)-.035,'θ','middle',true);
  let clipped=false;
  function construction(ex,ey,key,kind){
    const factor=Math.min(1,limit/Math.max(Math.abs(ex),Math.abs(ey))),endX=ex*factor,endY=ey*factor;
    clipped=factor<1;
    line(0,0,endX,endY,key==='sec'||key==='csc'?color(key):'#95a59a',key==='sec'||key==='csc'?4:1.2,key==='tan'||key==='cot');
    if(key==='tan')line(1,0,1,Math.max(-limit,Math.min(limit,ey)),color(key),4);
    if(key==='cot')line(0,1,Math.max(-limit,Math.min(limit,ex)),1,color(key),4);
    if(!clipped){add(circle,'circle',{cx:X(ex),cy:Y(ey),r:4,fill:color(key)});label(ex+.055,ey+.07,kind,'start',true);}
    else {
      const q=key==='tan'?{x:1,y:Math.sign(ey)*limit}:key==='cot'?{x:Math.sign(ex)*limit,y:1}:{x:endX,y:endY};
      add(circle,'circle',{cx:X(q.x),cy:Y(q.y),r:3,fill:color(key)});
    }
  }
  if(['tan','sec'].includes(state.key)){
    line(1,-limit,1,limit,'var(--line)');label(1.05,limit+.07,'x = 1','start');
    if(values.tan!==null)construction(1,values.tan,state.key,'T');
  }
  if(['cot','csc'].includes(state.key)){
    line(-limit,1,limit,1,'var(--line)');label(-limit,1.08,'y = 1','start');
    if(values.cot!==null)construction(values.cot,1,state.key,'U');
  }
  line(0,0,c,0,color('cos'),state.key==='cos'?5:3);line(c,0,c,s,color('sin'),state.key==='sin'?5:3);
  if(Math.abs(c)>.36)label(c*.5,s>=0?-.15:.08,'cos','middle',true);
  if(Math.abs(s)>.35)label(c+(c>=0?-.07:.07),s*.5,'sen',c>=0?'end':'start',true);
  if(Math.abs(c)>.18&&Math.abs(s)>.18){const z=.06;add(circle,'path',{d:`M ${X(c-Math.sign(c)*z)} ${cy} L ${X(c-Math.sign(c)*z)} ${Y(Math.sign(s)*z)} L ${X(c)} ${Y(Math.sign(s)*z)}`,stroke:'var(--muted)',fill:'none','stroke-width':1});}
  state.points.forEach(p=>{
    if(p.name===state.point)return;
    const q=p.angle*Math.PI/180;
    add(circle,'circle',{cx:X(Math.cos(q)),cy:Y(Math.sin(q)),r:4,fill:'#96a69a'});label(1.1*Math.cos(q),1.1*Math.sin(q)-.025,p.name);
  });
  add(circle,'circle',{cx:X(c),cy:Y(s),r:7,fill:'var(--ink)',stroke:'var(--surface)','stroke-width':2});
  label(c+(c>=0?.08:-.08),s+(s>=0?.09:-.17),state.point||'P',c>=0?'start':'end',true);
  $('#geometry-status').textContent=values[state.key]===null?'Neste ângulo, a função selecionada é indefinida.':clipped?'O segmento selecionado continua além do quadro; o valor completo está ao lado.':'';
}

function drawGraph(view){
  const {svg,meta}=view,w=svg.getBoundingClientRect().width;
  if(w<10)return;
  if(view.width===w&&view.units===state.units)return;
  view.width=w;view.units=state.units;svg.replaceChildren();
  const h=184,left=38,right=w-18,top=14,bottom=151;
  const x=d=>left+d/360*(right-left),y=v=>bottom-(v+meta.limit)/(2*meta.limit)*(bottom-top);
  view.scale={left,right,top,bottom,x,y};svg.setAttribute('viewBox',`0 0 ${w} ${h}`);svg.style.height=h+'px';
  add(svg,'title',{},`${meta.name}: uma volta completa, com escala vertical de ${-meta.limit} a ${meta.limit}.`);
  const clipId=`plot-clip-${meta.key}`,defs=add(svg,'defs'),clip=add(defs,'clipPath',{id:clipId});add(clip,'rect',{x:left,y:top,width:right-left,height:bottom-top});
  const ticks=meta.limit<2?[-1,0,1]:[-4,-2,0,2,4];
  ticks.forEach(t=>{add(svg,'line',{x1:left,y1:y(t),x2:right,y2:y(t),stroke:'var(--line)','stroke-width':1});add(svg,'text',{x:left-8,y:y(t)+4,'text-anchor':'end'},String(t).replace('-','−'));});
  [0,90,180,270,360].forEach(d=>{
    const text=state.units==='rad'?({0:'0',90:'π/2',180:'π',270:'3π/2',360:'2π'})[d]:String(d)+'°';
    add(svg,'text',{x:x(d),y:bottom+20,'text-anchor':d===0?'start':d===360?'end':'middle'},text);
  });
  add(svg,'text',{x:left,y:10},meta.short+' θ');
  meta.poles.forEach(d=>add(svg,'line',{x1:x(d),y1:top,x2:x(d),y2:bottom,stroke:'#99a49b','stroke-width':1,'stroke-dasharray':'4 4'}));
  const plot=add(svg,'g',{'clip-path':`url(#${clipId})`});
  view.segments.forEach(segment=>add(plot,'path',{d:segment.map(([d,v],i)=>`${i?'L':'M'} ${x(d).toFixed(2)} ${y(v).toFixed(2)}`).join(' '),fill:'none',stroke:color(meta.key),'stroke-width':2.2,'stroke-linejoin':'round'}));
  view.guide=add(svg,'line',{y1:top,y2:bottom,stroke:'var(--ink)','stroke-width':1,'stroke-dasharray':'3 3'});
  view.marker=add(plot,'circle',{r:4.5,fill:color(meta.key),stroke:'var(--surface)','stroke-width':1.5});
}
function updateGraphs(values){
  if(state.view==='circle')return;
  graphViews.forEach(view=>{
    drawGraph(view);if(!view.scale)return;
    const value=values[view.meta.key],{x,y}=view.scale;
    view.guide.setAttribute('x1',x(state.angle));view.guide.setAttribute('x2',x(state.angle));
    const visible=value!==null&&Math.abs(value)<=view.meta.limit;
    view.marker.style.display=visible?'':'none';
    if(visible){view.marker.setAttribute('cx',x(state.angle));view.marker.setAttribute('cy',y(value));}
    view.output.textContent=`${angleText()} → ${format(value)}`;
  });
}
function render(){
  const values=trigValues(state.angle),meta=FUNCTIONS.find(f=>f.key===state.key);
  updatePoints();
  cards.forEach(({button,value},key)=>{button.setAttribute('aria-pressed',String(key===state.key));button.setAttribute('aria-label',`${FUNCTIONS.find(f=>f.key===key).name}: ${format(values[key])}. Ver explicação.`);value.textContent=format(values[key]);value.classList.toggle('is-undefined',values[key]===null);});
  $('#point-coordinates').textContent=`${state.point||'P'} = (${format(values.cos)}; ${format(values.sin)})`;
  if(document.activeElement!==degreeInput)degreeInput.value=String(Number((state.units==='rad'?state.angle*Math.PI/180:state.angle).toFixed(5)));
  degreeInput.step=state.units==='rad'?'0.01':'0.1';degreeInput.setAttribute('aria-label',`Ângulo em ${state.units==='rad'?'radianos':'graus'}`);
  slider.value=state.angle;$('#angle-unit').textContent=state.units==='rad'?'rad':'°';
  $('#function-title').textContent=meta.name;$('#formula').textContent=meta.formula;
  $('#function-description').textContent=meta.description;$('#function-geometry').textContent=meta.geometry;
  $('#domain').textContent=meta.domain;$('#range').textContent=meta.range;$('#period').textContent=state.units==='rad'?radiansLabel(meta.period):degreeText(meta.period);
  const components={sin:`y = ${format(values.sin)}`,cos:`x = ${format(values.cos)}`,tan:`${format(values.sin)} ÷ ${format(values.cos)}`,cot:`${format(values.cos)} ÷ ${format(values.sin)}`,sec:`1 ÷ ${format(values.cos)}`,csc:`1 ÷ ${format(values.sin)}`};
  $('#numeric-example').textContent=`${meta.short}(${angleText()}) = ${components[state.key]}${['sin','cos'].includes(state.key)?'':` = ${format(values[state.key])}`}`;
  const axis=values.cos===0||values.sin===0,quadrant=axis?'Sobre um eixo':`${Math.floor(normalize(state.angle)/90)+1}º quadrante`;
  $('#selection-status').textContent=`${degreeText(state.angle)} = ${radiansLabel(state.angle)} · ${quadrant}`;
  drawCircle(values);updateGraphs(values);
}

function pointerAngle(event){
  const box=circle.getBoundingClientRect();if(!geometry||!box.width)return;
  const {w,h,cx,cy}=geometry,x=(event.clientX-box.left)*w/box.width-cx,y=cy-(event.clientY-box.top)*h/box.height;
  if(Math.hypot(x,y)<12)return;
  let degrees=normalize(Math.atan2(y,x)*180/Math.PI);
  const cardinal=Math.round(degrees/90)*90;if(Math.abs(cardinal-degrees)<1)degrees=normalize(cardinal);
  setAngle(Math.round(degrees*10)/10,{persist:false});
}
circle.addEventListener('pointerdown',event=>{
  if(event.button!==0||!geometry)return;
  if(playing)stop();dragging=true;circle.setPointerCapture(event.pointerId);
  const box=circle.getBoundingClientRect(),{w,h,r,cx,cy}=geometry;
  const x=(event.clientX-box.left)*w/box.width-cx,y=cy-(event.clientY-box.top)*h/box.height;
  const near=state.points.find(p=>Math.hypot(x-r*Math.cos(p.angle*Math.PI/180),y-r*Math.sin(p.angle*Math.PI/180))<18);
  if(near){state.angle=near.angle;state.point=near.name;render();}else pointerAngle(event);
});
circle.addEventListener('pointermove',event=>{if(dragging)pointerAngle(event);});
circle.addEventListener('pointerup',()=>{if(dragging){dragging=false;save();}});
circle.addEventListener('pointercancel',()=>{dragging=false;});

function scheduleResize(){
  if(resizeFrame!==null)return;
  const changed=state.view!=='graphs'&&Math.abs(circle.parentElement.getBoundingClientRect().width-(diagramWidth||0))>.5;
  const changedGraph=state.view!=='circle'&&[...graphViews.values()].some(v=>Math.abs(v.svg.getBoundingClientRect().width-(v.width||0))>.5);
  if(!changed&&!changedGraph)return;
  resizeFrame=requestAnimationFrame(()=>{resizeFrame=null;if(lab.isConnected)render();});
}
applyView();render();
if(typeof ResizeObserver==='function'){
  const observer=new ResizeObserver(scheduleResize);observer.observe(circle.parentElement);graphViews.forEach(v=>observer.observe(v.svg.parentElement));
}else window.addEventListener('resize',scheduleResize);
