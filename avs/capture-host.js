'use strict';
const channel=new BroadcastChannel('avs-audio-v1');
let context,stream,source,fft,detail,wave,bins,details,ticket=0;
function status(){
  const track=stream?.getAudioTracks()[0];
  const active=!!track && track.readyState==='live';
  return {type:'state',active,running:context?.state==='running',muted:!!track?.muted};
}
function announce(){const state=status();channel.postMessage(state);document.getElementById('state').textContent=state.active?'Captura conectada · motor '+context.state+(state.muted?' · fonte sem áudio':''):'Captura inativa';}
function stop(){ticket++;if(stream)stream.getTracks().forEach(t=>t.stop());stream=null;source?.disconnect();source=null;announce();}
async function start(mic){
  stop();const id=ticket;
  try{
    context ||= new AudioContext();context.onstatechange=announce;await context.resume();
    const result=mic?await navigator.mediaDevices.getUserMedia({audio:true}):await navigator.mediaDevices.getDisplayMedia({video:true,audio:true,systemAudio:'include'});
    if(id!==ticket){result.getTracks().forEach(t=>t.stop());return;}
    if(!result.getAudioTracks().length){result.getTracks().forEach(t=>t.stop());throw Error('Selecione compartilhar áudio.');}
    stream=result;fft ||= context.createAnalyser();detail ||= context.createAnalyser();detail.fftSize=4096;detail.smoothingTimeConstant=.05;detail.minDecibels=-110;detail.maxDecibels=0;
    source=context.createMediaStreamSource(new MediaStream(stream.getAudioTracks()));source.connect(fft);source.connect(detail);
    for(const track of stream.getTracks()){track.onended=()=>{if(id===ticket)stop()};track.onmute=announce;track.onunmute=announce;}
    announce();
  }catch(e){if(id===ticket){stop();document.getElementById('state').textContent=e.message;}}
}
channel.onmessage=({data})=>{
  if(data.type==='hello'){announce();return;}
  if(data.type==='stop'){stop();return;}
  if(data.type==='resume'){context?.resume().catch(()=>{});return;}
  if(data.type!=='sample')return;
  const state=status();
  if(!state.active){channel.postMessage(state);return;}
  const n=[512,1024,2048,4096,8192].includes(data.fft)?data.fft:2048;
  if(fft.fftSize!==n)fft.fftSize=n;
  fft.smoothingTimeConstant=Math.max(0,Math.min(.98,Number(data.smooth)||0));
  if(!bins||bins.length!==n/2){bins=new Uint8Array(n/2);wave=new Float32Array(n);}
  details ||= new Uint8Array(2048);
  fft.getByteFrequencyData(bins);fft.getFloatTimeDomainData(wave);detail.getByteFrequencyData(details);
  if(!state.running||state.muted){bins.fill(0);wave.fill(0);details.fill(0);}
  channel.postMessage({...state,type:'data',sampleRate:context.sampleRate,minDb:detail.minDecibels,maxDb:detail.maxDecibels,bins,wave,details});
};
document.getElementById('share').onclick=()=>start(false);
document.getElementById('mic').onclick=()=>start(true);
document.getElementById('stop').onclick=stop;
document.getElementById('resume').onclick=()=>context?.resume().catch(e=>{document.getElementById('state').textContent=e.message});
announce();
