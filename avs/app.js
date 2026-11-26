'use strict';
const $=id=>document.getElementById(id);
const presets={
'01 · Órbita / feedback':`p.background(5, 8, 14, 24);
p.translate(p.width/2, p.height/2);
p.rotate(a.time * 0.12);
p.noFill();
for (let i=0; i<180; i++) {
  const angle = i / 180 * p.TWO_PI;
  const energy = a.spectrum[Math.floor(i/180*a.spectrum.length*0.3)] || 0;
  const r = 80 + a.bass*130 + energy*170;
  p.stroke(100+155*energy, 255, 130+100*Math.sin(angle+a.time), 180);
  p.line(Math.cos(angle)*r, Math.sin(angle)*r,
    Math.cos(angle+.025)*(r+15+energy*80),
    Math.sin(angle+.025)*(r+15+energy*80));
}`,
'02 · Osciloscópio':`p.background(4, 10, 18, 35);
p.noFill();
p.stroke(110, 255, 175);
p.strokeWeight(2);
p.beginShape();
for (let i=0; i<a.waveform.length; i+=2) {
  p.vertex(i/a.waveform.length*p.width,
    p.height/2+a.waveform[i]*p.height*.4);
}
p.endShape();`,
'03 · Túnel AVS':`p.background(5, 5, 15, 45);
p.translate(p.width/2, p.height/2);
p.noFill();
for(let j=0;j<30;j++) {
  const z=(j/30+a.time*.16)%1;
  const r=z*z*p.width;
  p.push();
  p.rotate(a.time*.3+j*.08+a.bass*.4);
  p.stroke(90+160*z, 100+a.mid*155, 255, z*255);
  p.strokeWeight(1+a.treble*4);
  p.rectMode(p.CENTER);
  p.rect(0,0,r,r);
  p.pop();
}`,
'04 · Partículas':`p.background(3, 8, 12, 30);
s.dots ||= Array.from({length:240},()=>({
  x:p.random(p.width), y:p.random(p.height), t:p.random(p.TWO_PI)
}));
p.noStroke();
for(const d of s.dots) {
  d.t += (p.noise(d.x*.004,d.y*.004,a.time*.1)-.5)*.2;
  const speed=(20+a.bass*180)*a.dt;
  d.x=(d.x+Math.cos(d.t)*speed+p.width)%p.width;
  d.y=(d.y+Math.sin(d.t)*speed+p.height)%p.height;
  p.fill(120+a.treble*135,255,170,200);
  p.circle(d.x,d.y,1+a.level*6);
}`};
const groupEngine=new AudioGroups($('audio-groups'));
let detailMagnitude=new Float32Array(2048);
let detailAnalyser,detailRaw=new Uint8Array(2048),detailSpectrum=new Float32Array(2048);
let context,analyser,source,stream,media,url,mode='silence',generation=0;
let raw=new Uint8Array(1024),wave=new Float32Array(2048);
const a={spectrum:new Float32Array(1024),waveform:wave,bass:0,mid:0,treble:0,level:0,time:0,dt:0,sampleRate:48000,binHz:48000/2048};
// Visual compression of normalized levels; not a calibrated dB measurement.
a.amplitude=value=>{
  const v=Math.max(0,Math.min(1,Number(value)||0));
  const scale=$('amplitude-scale').value;
  if(scale==='linear')return v;
  if(scale==='sqrt')return Math.sqrt(v);
  const curve=+$('amplitude-curve').value;
  return Math.log1p(curve*v)/Math.log1p(curve);
};
// Curvas aplicadas à amplitude física: não apenas ao percentual de uma FFT em dB.
a.visualLevel=db=>{
  if(!Number.isFinite(db)||db<=-80)return 0;
  const floor=1e-4,reference=Math.pow(10,-25/20);
  return a.amplitude(Math.max(0,Math.min(1,(Math.pow(10,db/20)-floor)/(reference-floor))));
};
a.energy=(lo,hi)=>{let start=Math.max(0,Math.ceil(lo/a.binHz)),end=Math.min(a.spectrum.length-1,Math.floor(hi/a.binHz)),sum=0;for(let i=start;i<=end;i++)sum+=a.spectrum[i];return sum/Math.max(1,end-start+1)};
function message(t){$('status').textContent=t}
function resizeFFT(){const n=+$('fft').value;if(analyser)analyser.fftSize=n;raw=new Uint8Array(n/2);wave=new Float32Array(n);a.spectrum=new Float32Array(n/2);a.waveform=wave;a.binHz=a.sampleRate/n}
function disconnect(){window.avsMusic?.reset();window.remoteAudio?.detach();generation++;groupEngine.reset();if(stream)stream.getTracks().forEach(t=>t.stop());stream=null;if(source)source.disconnect();source=null;if(media){media.pause();media.removeAttribute('src');media.load();media=null}if(url)URL.revokeObjectURL(url);url=null;mode='silence'}
async function init(){context ||= new AudioContext();await context.resume();analyser ||= context.createAnalyser();if(!detailAnalyser){detailAnalyser=context.createAnalyser();detailAnalyser.fftSize=4096;detailAnalyser.smoothingTimeConstant=0.05;detailAnalyser.minDecibels=-110;detailAnalyser.maxDecibels=0;}a.sampleRate=context.sampleRate;resizeFFT()}
async function capture(kind){disconnect();const ticket=generation;try{await init();const captured=kind==='system'?await navigator.mediaDevices.getDisplayMedia({video:true,audio:true,systemAudio:'include'}):await navigator.mediaDevices.getUserMedia({audio:true});if(ticket!==generation){captured.getTracks().forEach(t=>t.stop());return}if(!captured.getAudioTracks().length){captured.getTracks().forEach(t=>t.stop());throw Error('Nenhuma faixa de áudio. Selecione uma aba/tela e marque compartilhar áudio.')}stream=captured;source=context.createMediaStreamSource(new MediaStream(stream.getAudioTracks()));source.connect(analyser);source.connect(detailAnalyser);mode='live';stream.getAudioTracks()[0].onended=()=>{if(ticket===generation){disconnect();message('Captura encerrada.')}};message(kind==='system'?'Capturando áudio compartilhado · FFT ao vivo':'Microfone conectado · FFT ao vivo')}catch(e){if(ticket===generation){disconnect();message('Captura não iniciada: '+e.message)}}}
$('system').onclick=()=>capture('system');$('mic').onclick=()=>capture('mic');
$('stop').onclick=()=>{disconnect();message('Áudio parado.')};$('demo').onclick=()=>{disconnect();mode='demo';message('Demo sintética visual · sem áudio real.')};
$('file').onclick=()=>$('upload').click();$('upload').onchange=async e=>{const f=e.target.files[0];if(!f)return;disconnect();const ticket=generation;try{await init();if(ticket!==generation)return;url=URL.createObjectURL(f);media=new Audio(url);media.loop=false;media.onended=()=>{if(ticket===generation)message('Música encerrada. Abra outro arquivo para continuar.')};source=context.createMediaElementSource(media);source.connect(analyser);source.connect(detailAnalyser);source.connect(context.destination);await media.play();if(ticket===generation){mode='live';message('Arquivo: '+f.name)}}catch(err){if(ticket===generation){disconnect();message(err.message)}}e.target.value=''};
$('fft').onchange=resizeFFT;
let drawCode,state={},sketch;
function apply(){try{const fn=new Function('p','a','s',codeEditor.getValue());if(sketch&&drawCode)window.visualTransition?.capture(sketch.canvas);if(typeof state.dispose==='function')state.dispose();drawCode=fn;state={};window.avsInputs?.reset(sketch);if(sketch)sketch.background(0);$('error').textContent='';try{localStorage.setItem('avs-code',codeEditor.getValue())}catch{}return true}catch(e){$('error').textContent=e.message;return false}}
for(const name of Object.keys(presets))$('preset').add(new Option(name,name));
$('preset').onchange=()=>{codeEditor.setValue(presets[$('preset').value]);apply()};
try{codeEditor.setValue(localStorage.getItem('avs-code')||Object.values(presets)[0])}catch{codeEditor.setValue(Object.values(presets)[0])}
$('run').onclick=apply;$('editor').onkeydown=e=>{if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){e.preventDefault();apply()}if(e.key==='Tab'){e.preventDefault();const t=e.target,start=t.selectionStart;t.setRangeText('  ',start,t.selectionEnd,'end')}};
$('save').onclick=()=>{const u=URL.createObjectURL(new Blob([codeEditor.getValue()],{type:'text/javascript'}));const link=document.createElement('a');link.href=u;link.download='visual.js';link.click();setTimeout(()=>URL.revokeObjectURL(u),1000)};
$('import').onclick=()=>$('codefile').click();$('codefile').onchange=async e=>{if(e.target.files[0]){codeEditor.setValue(await e.target.files[0].text());apply()}e.target.value=''};
async function enterFullscreen(target){
  try{
    if(document.fullscreenElement===target)return;
    if(document.fullscreenElement)await document.exitFullscreen();
    await target.requestFullscreen();
  }catch(e){message('Não foi possível abrir tela cheia: '+e.message)}
}
$('full').onclick=()=>enterFullscreen($('stage'));
$('full-lab').onclick=()=>enterFullscreen(document.documentElement);
$('exit-full').onclick=async()=>{
  try{if(document.fullscreenElement)await document.exitFullscreen()}
  catch(e){message(e.message)}
};
document.addEventListener('fullscreenchange',()=>{
  $('exit-full').hidden=!document.fullscreenElement;
});
function audioAvailable(){
  if(!context || context.state!=='running')return false;
  if(stream){const track=stream.getAudioTracks()[0];return !!track && track.readyState==='live' && !track.muted;}
  return !!media && !media.paused && !media.ended;
}
let lastAnalysisTime;
function update(p){a.time=p.millis()/1000;a.dt=Math.min(.1,p.deltaTime/1000);if(lastAnalysisTime!==undefined && a.time-lastAnalysisTime>.5)groupEngine.reset();lastAnalysisTime=a.time;const gain=+$('gain').value;let silent=false;
if(mode==='remote'){
const packet=window.remoteAudio.read();
if(packet){
  a.sampleRate=packet.sampleRate;
  if(wave.length!==packet.wave.length){$('fft').value=String(packet.wave.length);resizeFFT();}
  a.binHz=a.sampleRate/wave.length;
  for(let i=0;i<raw.length;i++)a.spectrum[i]=Math.min(1,packet.bins[i]/255*gain);
  for(let i=0;i<wave.length;i++)wave[i]=Math.max(-1,Math.min(1,packet.wave[i]*gain));
  silent=Math.sqrt(wave.reduce((sum,x)=>sum+x*x,0)/wave.length)<.0001;
  for(let i=0;i<detailSpectrum.length;i++){
    const byte=packet.details[i];detailSpectrum[i]=silent?0:Math.min(1,byte/255*gain);
    const lo=packet.minDb??-100,hi=packet.maxDb??-30;
    detailMagnitude[i]=silent||byte===0?0:Math.pow(10,(lo+byte/255*(hi-lo))/20)*gain;
  }
  if(silent){a.spectrum.fill(0);wave.fill(0);}
}else{a.spectrum.fill(0);wave.fill(0);detailSpectrum.fill(0);detailMagnitude.fill(0);}
}
else if(mode==='live' && audioAvailable()){analyser.smoothingTimeConstant=+$('smooth').value;analyser.getByteFrequencyData(raw);analyser.getFloatTimeDomainData(wave);const rms=Math.sqrt(wave.reduce((sum,x)=>sum+x*x,0)/wave.length);silent=rms<0.0001;if(silent){raw.fill(0);wave.fill(0)}for(let i=0;i<raw.length;i++)a.spectrum[i]=Math.min(1,raw[i]/255*gain);for(let i=0;i<wave.length;i++)wave[i]=Math.max(-1,Math.min(1,wave[i]*gain))}
else if(mode==='demo'){for(let i=0;i<raw.length;i++)a.spectrum[i]=Math.min(1,gain*(.3+.25*Math.sin(i*.03+a.time*3))*Math.exp(-i/raw.length*4)*(.6+.4*Math.sin(a.time*6)));for(let i=0;i<wave.length;i++)wave[i]=Math.sin(i*.04+a.time*5)*(.15+.2*Math.sin(a.time*3))*gain}
else{a.spectrum.fill(0);wave.fill(0)}
a.bass=a.energy(20,250);a.mid=a.energy(250,4000);a.treble=a.energy(4000,16000);a.level=Math.sqrt(wave.reduce((sum,x)=>sum+x*x,0)/wave.length);
if(mode==='live' && audioAvailable()){
  detailAnalyser.getByteFrequencyData(detailRaw);if(silent)detailRaw.fill(0);
  for(let i=0;i<detailRaw.length;i++){
    const byte=detailRaw[i];detailSpectrum[i]=Math.min(1,byte/255*gain);
    detailMagnitude[i]=byte===0?0:Math.pow(10,(detailAnalyser.minDecibels+byte/255*(detailAnalyser.maxDecibels-detailAnalyser.minDecibels))/20)*gain;
  }
  a.groups=groupEngine.update(detailSpectrum,a.sampleRate/4096,a.dt,a.time,detailMagnitude);
}else if(mode==='remote'){
  a.groups=groupEngine.update(detailSpectrum,a.sampleRate/4096,a.dt,a.time,detailMagnitude);
}else{
  const magnitudes=Float32Array.from(a.spectrum,v=>mode==='demo'?v*.03:0);
  a.groups=groupEngine.update(a.spectrum,a.binHz,a.dt,a.time,magnitudes);
}
a.features=groupEngine.features();a.music=window.avsMusic?.update(a);window.avsInputs?.update(p,a);
const c=$('scope'),g=c.getContext('2d');if(c.width!==c.clientWidth*devicePixelRatio||c.height!==120*devicePixelRatio){c.width=c.clientWidth*devicePixelRatio;c.height=120*devicePixelRatio}const w=c.width,h=c.height;g.clearRect(0,0,w,h);for(let i=0;i<100;i++){const hz=20*Math.pow(1000,i/99),v=a.spectrum[Math.min(raw.length-1,Math.floor(hz/a.binHz))];g.fillStyle='#a9ff64';g.fillRect(i*w/100,h,Math.max(1,w/100-2),-v*h)}g.strokeStyle='#57baff';g.beginPath();for(let i=0;i<wave.length;i+=8){const x=i/wave.length*w,y=h/2+wave[i]*h*.4;if(!i)g.moveTo(x,y);else g.lineTo(x,y)}g.stroke();if(p.frameCount%10===0)$('meters').textContent=`${mode.toUpperCase()} · GRAVE ${a.bass.toFixed(2)} · MÉDIO ${a.mid.toFixed(2)} · AGUDO ${a.treble.toFixed(2)} · RMS ${a.level.toFixed(2)} · ${Math.round(p.frameRate())} FPS`;
}
apply();
if(typeof p5==='undefined')message('Não foi possível carregar p5.js. Confira sua conexão e recarregue.');
else new p5(p=>{sketch=p;window.avsP5=p;p.setup=()=>{p.createCanvas($('stage').clientWidth,$('stage').clientHeight);p.pixelDensity(Math.min(devicePixelRatio,2));p.background(0);new ResizeObserver(()=>p.resizeCanvas($('stage').clientWidth,$('stage').clientHeight)).observe($('stage'))};p.draw=()=>{update(p);if(drawCode){p.push();try{drawCode(p,a,state)}catch(e){$('error').textContent=e.stack;drawCode=null}finally{p.pop()}}}},$('stage'));
