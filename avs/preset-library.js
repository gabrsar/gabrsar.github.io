(() => {
  const select=document.getElementById('preset');
  const description=document.getElementById('preset-description');
  const library=[
    {name:'★ Histórico 3D · visual.js',path:'visual.js',text:'Seu visual principal: 48 bandas, histórico e câmera manual.'},
    {name:'Aurora · cortinas espectrais',path:'presets/aurora.js',text:'Faixas de ruído Perlin que respiram com as frequências.'},
    {name:'Lissajous · osciloscópio XY',path:'presets/lissajous.js',text:'Duas curvas XY ampliadas, luminosidade controlada e waveform real.'},
    {name:'Moiré · interferência',path:'presets/moire.js',text:'Duas tramas de linhas revelam padrões de interferência ligados às bandas.'},
    {name:'Moiré Fluido · zoom e metamorfose',path:'presets/moire-fluid.js',text:'Moiré com espessura, cores, ângulos, zoom e proporções seguindo alvos aleatórios independentes e suaves.'},
    {name:'Túnel prismático · AVS',path:'presets/prism-tunnel.js',text:'Seis segundos de ecos geométricos com o espectro nas bordas.'},
    {name:'Caleidoscópio · seda',path:'presets/kaleido-silk.js',text:'Seda que transborda a tela, rotação lenta, espessuras variáveis e blur leve.'},
    {name:'Caleidoscópio · vitral',path:'presets/kaleido-glass.js',text:'Peças de vidro colorido com bloom suave e bordas preservadas.'},
    {name:'Doom Fire · braseiro',path:'presets/doom-fire.js',text:'Fogo pixelado com combustível por frequência e vento musical.'},
    {name:'Doom Fire · plasma polar',path:'presets/doom-plasma.js',text:'A mesma simulação de calor, projetada radialmente em violeta.'},
    {name:'Polar · tear espectral',path:'presets/polar-loom.js',text:'Observatório polar facetado, amostragem espelhada e doze segundos de memória.'},
    {name:'Polar · rosas harmônicas',path:'presets/polar-rose.js',text:'Esculturas harmônicas com relevo, nervuras e amostragem espelhada sem emenda.'},
    {name:'Color Mix · luz RGB',path:'presets/color-additive.js',text:'Campos de luz sobrepostos em SCREEN.'},
    {name:'Color Mix · tinta CMY',path:'presets/color-ink.js',text:'Fitas de tinta ciano, magenta e amarelo com MULTIPLY.'},
    {name:'Hyperdrive · túnel musical',path:'presets/hyperdrive.js',text:'Viagem longa com paredes opacas, câmera interpolada, curvas, vãos e ramificações visuais.'},
    {name:'Fractal · Julia',path:'presets/fractal-julia.js',text:'Julia em GPU com passeio lento, zoom amortecido e influência musical.'},
    {name:'Fractal · Mandelbrot',path:'presets/fractal-mandelbrot.js',text:'Mandelbrot com zoom limitado, passeio suave por pontos de interesse e cores espectrais.'},
    {name:'Lorenz · seda caótica',path:'presets/lorenz-silk.js',text:'Lorenz com até 200 partículas, avanço e rotação 3D influenciados pela música.'},
    {name:'Lorenz · órbitas gêmeas',path:'presets/lorenz-twin.js',text:'Dois atratores e até 260 partículas, com cores, rotação e velocidade musicais.'},
    {name:'Pontos · tinta permanente',path:'presets/permanent-points.js',text:'Acumula pontos sem apagar enquanto estiver ativo. O áudio controla densidade e dispersão.'},
    {name:'Terreno · mundo musical',path:'presets/terrain-history.js',text:'Terreno leve: até 16 bandas locais, 24 colunas, faces opacas e objetos low poly esparsos.'},
    {name:'AVS · Bass Spin',path:'presets/avs-bass-spin.js',text:'Releitura do clássico: lâminas geométricas movidas pelos graves.'},
    {name:'AVS · Dot Plane',path:'presets/avs-dot-plane.js',text:'Releitura do horizonte pontilhado modulado por ondas e espectro.'},
    {name:'AVS · Scope Star',path:'presets/avs-scope-star.js',text:'Superscope de estrela com waveform espelhado e brilho controlado.'},
    {name:'AVS · Roto Feedback',path:'presets/avs-roto-feedback.js',text:'Releitura de rotação/escala com realimentação visual e rastro contínuo.'},
    {name:'Matrix · chuva de código',path:'presets/matrix-rain.js',text:'Chuva digital musical: mouse cria vento, clique reativa colunas, Space pausa, Shift desacelera.'},
    {name:'Psicodélico · prisma líquido',path:'presets/psychedelic-liquid.js',text:'Fluxos cromáticos e formas ondulantes, sem estrobo.'},
    {name:'Psicodélico · micélio',path:'presets/organic-mycelium.js',text:'Ramificações lentas e orgânicas; clique para plantar novos pontos.'},
    {name:'Lounge · veludo e vinho',path:'presets/wine-velvet.js',text:'Fitas rubi e ameixa, um fio dourado e movimento discreto.'},
    {name:'Lounge · âmbar e negroni',path:'presets/negroni-amber.js',text:'Geometria lenta em tons de cobre, rubi e laranja.'},
    {name:'Ambiente · brisa da sala de espera',path:'presets/waiting-room.js',text:'Planos suaves e discretos, sem flashes ou reação brusca ao som.'},
    {name:'Tapeçaria · espectrograma',path:'presets/spectral-weave.js',text:'Doze segundos em células de cor: frequência × tempo, com ataques destacados.'}
  ];
  const group=document.createElement('optgroup');group.label='Biblioteca · editáveis no WebStorm';
  for(const entry of library)group.append(new Option(entry.name,'file:'+entry.path));
  select.replaceChildren();select.prepend(group);select.value='file:visual.js';description.textContent=library[0].text;
  const legacyChange=select.onchange;
  let disabled=new Set();
  try{const stored=JSON.parse(localStorage.getItem('avs-disabled-presets-v1')||'[]');if(Array.isArray(stored))disabled=new Set(stored);}catch{}
  const entryValue=entry=>entry.value||'file:'+entry.path;
  const announceLibrary=()=>document.dispatchEvent(new Event('avs-library-changed'));
  function persistEnabled(){
    try{localStorage.setItem('avs-disabled-presets-v1',JSON.stringify([...disabled]));}catch{}
    bag=[];announceLibrary();
  }
  let revision=0,loading=false,shuffle=false,nextAt=0,bag=[],lastSwitch=0,detector=null,changeFrames=0;
  const shuffleButton=document.getElementById('shuffle-presets');
  const interval=document.getElementById('shuffle-interval');
  const schedule=()=>{
    const base=Number(interval.value)*1000;
    lastSwitch=Date.now();nextAt=lastSwitch+Math.max(10000,base*(.65+Math.random()*.95));
  };
  function musicalTurn(){
    if(!document.getElementById('shuffle-musical').checked||typeof a==='undefined'||!a.features)return false;
    const f=a.features;
    if(!detector||detector.revision!==f.revision){detector={revision:f.revision,db:f.db,shape:[...f.shape]};changeFrames=0;return false;}
    const levelChange=Math.abs(f.db-detector.db);
    const timbre=f.shape.reduce((sum,v,i)=>sum+Math.abs(v-detector.shape[i]),0);
    const audible=f.db>-65;
    const changed=(audible&&levelChange>9)||(audible&&timbre>.65)||(f.db<-85&&detector.db>-60);
    changeFrames=changed?changeFrames+1:Math.max(0,changeFrames-1);
    // Baseline tracks musical phrases, not individual frames.
    detector.db+=(f.db-detector.db)*.03;
    detector.shape=detector.shape.map((v,i)=>v+(f.shape[i]-v)*.03);
    if(Date.now()-lastSwitch<9000){changeFrames=0;return false;}
    if(changeFrames>=3){changeFrames=0;return true;}
    return false;
  }
  function varyReading(){
    if(!document.getElementById('shuffle-reading').checked)return;
    const layouts=['detail48','balanced24','thirds','octaves','bass','voices'];
    const scales=['sqrt','linear','log'];
    const layout=document.getElementById('band-layout'),scale=document.getElementById('amplitude-scale');
    layout.value=layouts[Math.floor(Math.random()*layouts.length)];
    scale.value=scales[Math.floor(Math.random()*scales.length)];
    layout.dispatchEvent(new Event('change',{bubbles:true}));detector=null;changeFrames=0;
  }
  function stopShuffle(){shuffle=false;shuffleButton.textContent='⇄ Shuffle: desligado';shuffleButton.setAttribute('aria-pressed','false');}
  shuffleButton.onclick=()=>{
    if(!shuffle&&library.filter(entry=>!disabled.has(entryValue(entry))).length<2){description.textContent='Ative pelo menos dois presets para usar o shuffle.';return;}
    shuffle=!shuffle;shuffleButton.textContent='⇄ Shuffle: '+(shuffle?'aleatório':'desligado');
    shuffleButton.setAttribute('aria-pressed',String(shuffle));bag=[];schedule();
  };
  interval.onchange=schedule;
  for(const [id,event]of [['run','click'],['codefile','change'],['reload-script','click'],['watch-script','change']]){
    document.getElementById(id).addEventListener(event,stopShuffle,true);
  }
  setInterval(()=>{
    if(!shuffle||loading||document.hidden)return;
    const phraseChange=musicalTurn();
    if(Date.now()<nextAt&&!phraseChange)return;
    if(!bag.length){
      bag=library.map(entryValue).filter(value=>value!==select.value&&!disabled.has(value));
      for(let i=bag.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[bag[i],bag[j]]=[bag[j],bag[i]];}
    }
    bag=bag.filter(value=>!disabled.has(value));
    const value=bag.pop();if(!value){schedule();return;}
    varyReading();select.value=value;select.dispatchEvent(new Event('change',{bubbles:true}));schedule();
  },500);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)schedule();});
  const invalidate=()=>{revision++;loading=false};
  document.addEventListener('avs-editor-user-edit',()=>{stopShuffle();invalidate();});
  for(const [id,event]of [['run','click'],['codefile','change'],['reload-script','click'],['watch-script','change']]){
    document.getElementById(id).addEventListener(event,invalidate,true);
  }
  select.onchange=async()=>{
    const ticket=++revision;loading=true;schedule();
    const entry=library.find(item=>(item.value||'file:'+item.path)===select.value);
    if(!entry){loading=false;description.textContent='Preset clássico · código editável';legacyChange();return;}
    description.textContent='Carregando '+entry.name+'…';
    try{
      let code=entry.code;
      if(typeof code!=='string'){const response=await fetch('./'+entry.path,{cache:'no-store'});if(!response.ok)throw Error('HTTP '+response.status);code=await response.text();}
      if(ticket!==revision)return;
      new Function('p','a','s',code);
      if(entry.seed!==undefined)document.getElementById('preset-seed').value=String(entry.seed);
      codeEditor.setValue(code);
      if(apply()){
        if(entry.path)window.followScript(entry.path,code);
        else document.getElementById('watch-script').checked=false;
        description.textContent=entry.text;
        document.getElementById('script-status').textContent=entry.path?'Preset: '+entry.path+' · acompanhando alterações no WebStorm':'Preset local · salvo neste navegador';
        document.dispatchEvent(new CustomEvent('avs-preset-loaded',{detail:{value:select.value,name:entry.name}}));
      }else description.textContent='Erro ao aplicar · consulte o editor';
    }catch(error){if(ticket===revision)description.textContent='Não foi possível carregar: '+error.message;}
    finally{if(ticket===revision)loading=false;}
  };
  for(const [id,step]of [['preset-prev',-1],['preset-next',1]]){
    document.getElementById(id).onclick=()=>{
      const eligible=library.map(entryValue).filter(value=>!disabled.has(value));
      if(!eligible.length)return;
      const index=eligible.indexOf(select.value);select.value=eligible[(index+step+eligible.length)%eligible.length];
      select.dispatchEvent(new Event('change',{bubbles:true}));
    };
  }
  let localGroup;
  window.presetLibrary={
    setLocals(records){
      for(let i=library.length-1;i>=0;i--)if(library[i].value?.startsWith('local:'))library.splice(i,1);
      localGroup?.remove();localGroup=document.createElement('optgroup');localGroup.label='Meus presets · somente neste navegador';
      for(const record of records){
        library.push({name:record.name,value:'local:'+record.id,code:record.code,seed:record.seed,text:'Preset local: '+record.name});
        localGroup.append(new Option(record.name,'local:'+record.id));
      }
      select.append(localGroup);bag=[];announceLibrary();
    },
    entries(){return library.map(entry=>({value:entryValue(entry),name:entry.name,text:entry.text,enabled:!disabled.has(entryValue(entry))}));},
    setEnabled(value,enabled){if(enabled)disabled.delete(value);else disabled.add(value);persistEnabled();if(library.filter(entry=>!disabled.has(entryValue(entry))).length<2)stopShuffle();},
    setAllEnabled(enabled){disabled=new Set(enabled?[]:library.map(entryValue));persistEnabled();if(!enabled)stopShuffle();},
    load(value){select.value=value;select.dispatchEvent(new Event('change',{bubbles:true}));},
    pause(){stopShuffle();invalidate();}
  };
  document.getElementById('reload-script').addEventListener('click',()=>{select.value='file:visual.js';description.textContent=library[0].text;});
})();
