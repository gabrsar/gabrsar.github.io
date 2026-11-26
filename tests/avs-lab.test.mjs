import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root=fileURLToPath(new URL('../avs/',import.meta.url));
const read=name=>fs.readFileSync(root+name,'utf8');

function makeGroups(){
  const context={window:{},document:{getElementById:()=>null,createElement:()=>({
    querySelectorAll:()=>Array.from({length:4},()=>({})),querySelector:()=>({})
  })}};
  vm.createContext(context);vm.runInContext(read('audio-groups.js'),context);
  return new context.window.AudioGroups({replaceChildren(){},append(){}});
}

test('frequency layouts cover the requested interval without duplicate or unresolved FFT bins',()=>{
  const engine=makeGroups();
  for(const layout of ['detail48','balanced24','thirds','octaves','bass','voices'])for(const cutoff of [8000,12000,16000,20000]){
    engine.configure(layout,cutoff);const groups=Object.values(engine.groups),seen=new Set();
    assert.equal(groups[0].low,25);assert.equal(groups.at(-1).high,cutoff);
    for(const group of groups){
      const start=Math.ceil(group.low/(48000/4096)),end=Math.ceil(group.high/(48000/4096))-1;
      assert.ok(end>=start,`${layout}: empty ${group.label}`);
      for(let bin=start;bin<=end;bin++){assert.ok(!seen.has(bin));seen.add(bin);}
    }
  }
});

test('spectral dB retains a fixed reference and a factor of ten changes it by 20 dB',()=>{
  const engine=makeGroups(),spectrum=new Float32Array(2048),magnitude=new Float32Array(2048);
  const sample=value=>{engine.reset();magnitude.fill(0);magnitude[26]=value;spectrum[26]=.5;
    for(let i=0;i<120;i++)engine.update(spectrum,48000/4096,1/60,i/60,magnitude);
    return Object.values(engine.groups).find(g=>g.low<=26*48000/4096&&g.high>26*48000/4096).db;
  };
  assert.ok(Math.abs(sample(.01)-sample(.001)-20)<1e-5);
  magnitude.fill(0);spectrum.fill(0);for(let i=0;i<600;i++)engine.update(spectrum,48000/4096,1/60,2+i/60,magnitude);
  assert.ok(Object.values(engine.groups).every(g=>g.db<-100));
});

test('rolling music windows identify sustained rises and falls, remain bounded, and reset on regrouping',()=>{
  const context={window:{}};vm.createContext(context);vm.runInContext(read('music-window.js'),context);
  const music=new context.window.RollingMusic();let state;
  const sample=(time,db,revision=1)=>music.update({time,dt:.1,features:{revision,db,shape:[.3,.3,.2,.1,.05,.05]},groups:{}});
  for(let i=0;i<100;i++)state=sample(i/10,-75+i*.45);
  assert.ok(state.trend>.2);assert.equal(state.direction,'rising');
  for(let i=100;i<200;i++)state=sample(i/10,-30-(i-100)*.45);
  assert.ok(state.trend<-.2);assert.equal(state.direction,'falling');assert.ok(music.samples.length<=130);
  state=sample(20,-45,2);assert.equal(music.samples.length,1);assert.ok(Math.abs(state.trend)<.01);
});

function mockRenderer(){
  const counters={vertices:0,points:0,shapes:0,pushes:0,removed:0};
  const finite=(...args)=>{assert.ok(args.every(Number.isFinite),'non-finite geometry');counters.vertices++;};
  const noop=()=>{};
  const surface=(width=1000,height=650)=>new Proxy({
    width,height,canvas:{},drawingContext:{save(){},restore(){},drawImage(){},depthMask(){},enable(){},disable(){}},
    resizeCanvas(w,h){this.width=w;this.height=h;},remove(){counters.removed++;},get:()=>({}),
    createShader:()=>({setUniform(_name,value){if(typeof value==='number')assert.ok(Number.isFinite(value));}}),
    vertex:finite,line:finite,quad:finite,triangle:finite,ellipse:finite,circle:finite,box:finite,camera:finite,
    point(...args){finite(...args);counters.points++;},strokeWeight:v=>assert.ok(Number.isFinite(v)&&v>=0),
    rect(x,y,w,h){assert.ok([x,y,w,h].every(Number.isFinite));assert.ok(w>=0&&h>=0);},
    push(){counters.pushes++;},pop(){assert.ok(--counters.pushes>=0);},
    beginShape(){counters.shapes++;},endShape(){assert.ok(--counters.shapes>=0);}
  },{get:(target,key)=>key in target?target[key]:noop});
  const p=surface();p.createGraphics=surface;
  p.createImage=(width,height)=>({width,height,pixels:new Uint8ClampedArray(width*height*4),loadPixels(){},updatePixels(){}});
  p.color=()=>({setAlpha:v=>assert.ok(Number.isFinite(v))});p.noise=(x,y,z=0)=>.5+.15*Math.sin(x+y+z);
  p.random=(lo,hi)=>hi===undefined?lo*.4:(lo+hi)/2;
  return {p,counters};
}

test('every bundled preset tolerates silence, input, source regrouping and resize with finite geometry',()=>{
  const engine=makeGroups(),{p,counters}=mockRenderer();
  const a={time:0,elapsed:0,dt:1/30,frame:0,fps:60,seed:1337,rand:(lo=0,hi=1)=>lo+(hi-lo)*.37,
    mouse:{inside:true,nx:.4,ny:.6,vx:50,clicked:false},keyboard:{down:()=>false,pressed:()=>false},clock:{hour:12},
    renderScale:.75,music:{energy:.5,trend:.2,brightness:.2,volatility:.1,pulse:0,hue:180,flow:{x:.1,y:-.2}},
    visualLevel:db=>db<=-80?0:Math.sqrt(Math.min(1,Math.pow(10,(db+25)/20))),
    spectrum:new Float32Array(2048),waveform:new Float32Array(4096),binHz:48000/4096};
  for(const file of fs.readdirSync(root+'presets').filter(name=>name.endsWith('.js'))){
    const draw=new Function('p','a','s',read('presets/'+file)),state={};
    for(const [mode,layout]of ['detail48','balanced24','octaves','voices'].entries()){
      engine.configure(layout,12000);a.groups=engine.groups;
      for(let frame=0;frame<45;frame++){
        a.time=a.elapsed=(mode*45+frame)/30;a.frame=frame;
        for(const group of Object.values(a.groups)){group.db=frame<8?-120:-42+Math.sin(frame*.1+group.low*.003)*12;group.hit=frame===25;}
        for(let i=0;i<a.waveform.length;i++)a.waveform[i]=frame<8?0:Math.sin(i*.03+frame*.1)*.3;
        draw(p,a,state);assert.equal(counters.shapes,0,file);assert.equal(counters.pushes,0,file);
      }
    }
    p.width=720;p.height=480;draw(p,a,state);p.width=1000;p.height=650;
    if(state.dispose)state.dispose();
    if(state.rows)assert.ok(state.rows.length<=200,file);
    if(state.objects)assert.ok(state.objects.length<=12,file);
    if(state.orbits)for(const orbit of state.orbits)assert.ok(orbit.points.length<=1400);
  }
  assert.ok(counters.vertices>0);assert.ok(counters.removed>0);
});

test('fractal navigation has bounded translation and zoom velocities',()=>{
  const {p}=mockRenderer(),engine=makeGroups();
  for(const group of Object.values(engine.groups))group.db=-35;
  for(const file of ['fractal-julia.js','fractal-mandelbrot.js']){
    const draw=new Function('p','a','s',read('presets/'+file)),state={};let previous;
    for(let frame=0;frame<1800;frame++){
      const a={groups:engine.groups,time:frame/30,dt:1/30,waveform:[],music:{trend:.5}};
      draw(p,a,state);const cam=state.travel;
      if(previous){
        assert.ok(Math.abs(cam.logZoom-previous.logZoom)<=a.dt*.045+1e-8);
        assert.ok(Math.hypot(cam.x-previous.x,cam.y-previous.y)<=a.dt*.035/Math.exp(previous.logZoom)+1e-6);
      }
      previous={...cam};
    }
    assert.ok(state.travel.waypoint>0);state.dispose();
  }
});

test('local saves commit storage before replacing the library; invalid imports preserve earlier presets',async()=>{
  class Element{constructor(){this.value='';this.handlers={};}addEventListener(name,fn){this.handlers[name]=fn;}}
  const ids=['local-preset-status','local-preset-name','preset','preset-seed','local-save','local-copy','local-new','local-load','local-preset-files','local-export','new-seed'];
  const elements=Object.fromEntries(ids.map(id=>[id,new Element()]));elements['preset-seed'].value='1337';
  let records=[],code='p.background(0);',fail=false,counter=0;
  const context={window:{},document:{getElementById:id=>elements[id],addEventListener(){},dispatchEvent(){}},
    localStorage:{getItem:()=>null,setItem(){if(fail)throw Error('quota');}},
    codeEditor:{getValue:()=>code,setValue:value=>{code=value;}},apply:()=>true,
    crypto:{randomUUID:()=>String(++counter)},Event,CustomEvent:class{},Blob,URL,setTimeout};
  context.window.presetLibrary={setLocals:value=>{records=value;},load:value=>{elements.preset.value=value;}};
  vm.createContext(context);vm.runInContext(read('local-presets.js'),context);
  elements['local-preset-name'].value='First';elements['local-save'].onclick();assert.equal(records.length,1);
  assert.equal(records[0].code,'p.background(0);');
  fail=true;code='p.background(255);';elements['local-save'].onclick();assert.equal(records[0].code,'p.background(0);');
  fail=false;await elements['local-preset-files'].onchange({target:{files:[{name:'broken.json',size:20,text:async()=>JSON.stringify({presets:[{name:'bad',code:'const ='}]})}],value:'x'}});
  assert.equal(records.length,1);assert.match(elements['local-preset-status'].textContent,/cancelada/);
});

test('published HTML references all required controls and its local assets exist',()=>{
  const html=read('index.html'),ids=new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(match=>match[1]));
  for(const script of ['app.js','audio-groups.js','preset-library.js','studio-ui.js','local-presets.js','input-parameters.js']){
    for(const match of read(script).matchAll(/(?:getElementById\(|\$\()'([^']+)'\)/g))assert.ok(ids.has(match[1]),`${script}: ${match[1]}`);
  }
  for(const match of html.matchAll(/(?:src|href)="([^"#]+)"/g))if(!match[1].startsWith('http')&&!match[1].startsWith('../'))assert.ok(fs.existsSync(root+match[1].split('?')[0]),match[1]);
  const paths=[...read('preset-library.js').matchAll(/path:'([^']+)'/g)].map(match=>match[1]);
  assert.equal(paths.length,new Set(paths).size);paths.forEach(path=>assert.ok(fs.existsSync(root+path)));
  assert.match(html,/não gravam nem enviam o áudio/);assert.match(html,/presets criados e preferências/);
});
