(() => {
  const channel=new BroadcastChannel('avs-audio-v1');
  let active=sessionStorage.getItem('avs-persistent-audio')==='yes',latest,lastRequest=0,pending=false;
  const remote={
    state:'Captura persistente inativa',
    open(){
      if(mode!=='remote')disconnect();active=true;sessionStorage.setItem('avs-persistent-audio','yes');
      // Reuse a named window without navigating or reloading an existing capture.
      const popup=window.open('','avs-capture','popup,width=540,height=460');
      if(!popup){message('Permita a janela de captura no Chrome.');return;}
      try{if(popup.location.href==='about:blank')popup.location.href='capture.html';}catch{}
      popup.focus();channel.postMessage({type:'hello'});
      message('Na janela de captura, clique em Compartilhar. Depois mantenha-a aberta.');
    },
    detach(){if(active)channel.postMessage({type:'stop'});active=false;latest=null;sessionStorage.setItem('avs-persistent-audio','no');},
    resume(){channel.postMessage({type:'resume'});},
    read(){
      const now=performance.now();
      if(!pending||now-lastRequest>500){pending=true;lastRequest=now;channel.postMessage({type:'sample',fft:+$('fft').value,smooth:+$('smooth').value});}
      return latest&&now-latest.received<750&&latest.wave.length===+$('fft').value?latest:null;
    }
  };
  channel.onmessage=({data})=>{
    if(!active)return;
    pending=false;
    remote.state=!data.active?'Compartilhamento encerrado · abra a janela de captura':!data.running?'Motor suspenso · Retomar áudio':data.muted?'Fonte temporariamente sem áudio':'Captura persistente conectada';
    if(data.active && mode!=='remote'){groupEngine.reset();mode='remote';}
    if(data.type==='data')latest={...data,received:performance.now()};
    if(!data.active || !data.running || data.muted)latest=null;
  };
  window.remoteAudio=remote;
  $('system').onclick=()=>remote.open();
  channel.postMessage({type:'hello'});
})();
