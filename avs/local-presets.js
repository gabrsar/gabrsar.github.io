(() => {
  const KEY='avs-local-presets-v1';
  const $=id=>document.getElementById(id),status=$('local-preset-status');
  let records=[];
  function validate(record){
    if(!record||typeof record.name!=='string'||!record.name.trim()||typeof record.code!=='string')throw Error('Preset inválido: faltam nome ou código.');
    if(record.code.length>1000000)throw Error('Código muito grande (limite: 1 MB por preset).');
    new Function('p','a','s',record.code);
    return {name:record.name.trim().slice(0,100),code:record.code,seed:String(record.seed??'1337').slice(0,80)};
  }
  try{
    const saved=JSON.parse(localStorage.getItem(KEY)||'[]');
    if(!Array.isArray(saved))throw Error('Biblioteca inválida.');
    records=saved.map(record=>({...validate(record),id:String(record.id),createdAt:record.createdAt,updatedAt:record.updatedAt}));
  }catch(error){status.textContent='Não foi possível ler a biblioteca local: '+error.message;}
  const id=()=>crypto.randomUUID();
  const pause=()=>document.dispatchEvent(new Event('avs-editor-user-edit'));
  function persist(next){
    localStorage.setItem(KEY,JSON.stringify(next)); // commit before replacing the in-memory list
    records=next;window.presetLibrary.setLocals(records);
  }
  function unique(name){let next=name,suffix=2;while(records.some(record=>record.name===next))next=name+' ('+(suffix++)+')';return next;}
  function save(copy){
    pause();
    try{
      const value=validate({name:$('local-preset-name').value||'Meu preset',code:codeEditor.getValue(),seed:$('preset-seed').value});
      const selected=$('preset').value,existing=!copy&&selected.startsWith('local:')?records.find(record=>'local:'+record.id===selected):null;
      const now=new Date().toISOString();
      const record=existing?{...existing,...value,updatedAt:now}:{...value,name:unique(value.name),id:id(),createdAt:now,updatedAt:now};
      persist(existing?records.map(item=>item.id===existing.id?record:item):[...records,record]);
      window.presetLibrary.load('local:'+record.id);status.textContent='Salvo neste navegador: '+record.name;
    }catch(error){status.textContent='Não foi salvo: '+error.message;}
  }
  window.presetLibrary.setLocals(records);
  $('local-save').onclick=()=>save(false);$('local-copy').onclick=()=>save(true);
  $('local-new').onclick=()=>{
    pause();$('local-preset-name').value=unique('Meu preset');$('preset').value='';
    codeEditor.setValue(`// Novo preset: p = p5.js, a = áudio + interação, s = estado.
const dt=a.dt||1/60;
p.background(4,8,15,255*(1-Math.exp(-dt/.12)));
s.phase ??= a.rand(0,p.TWO_PI);
s.phase += dt*(.2+a.level*2);
const x=p.width*(.5+Math.sin(s.phase)*.28);
const y=p.height*(.5+Math.cos(s.phase*.7)*.24);
const hover=a.mouse.inside?Math.hypot(a.mouse.nx-.5,a.mouse.ny-.5):0;
p.noStroke();
p.fill(100+a.clock.hour*4,220,200,150);
p.circle(x,y,12+a.level*90+hover*25);
if(a.mouse.clicked)s.phase+=.3;
if(a.keyboard.pressed('Space'))s.phase=0;
// a.fps, a.elapsed, a.seed, a.mouse.ax/ay também estão disponíveis.
`);
    apply();document.dispatchEvent(new Event('avs-preset-draft'));status.textContent='Novo rascunho · dê um nome e clique em Salvar local.';
  };
  document.addEventListener('avs-preset-loaded',event=>{$('local-preset-name').value=event.detail.name;});
  $('local-load').onclick=()=>$('local-preset-files').click();
  $('local-preset-files').onchange=async event=>{
    pause();
    try{
      const incoming=[];
      for(const file of event.target.files){
        if(file.size>5000000)throw Error('Arquivo maior que 5 MB: '+file.name);
        const text=await file.text();
        if(file.name.toLowerCase().endsWith('.json')){
          const data=JSON.parse(text);const list=Array.isArray(data)?data:data.presets;
          if(!Array.isArray(list))throw Error('JSON sem uma lista presets.');
          incoming.push(...list.map(validate));
        }else incoming.push(validate({name:file.name.replace(/\.[^.]+$/,''),code:text,seed:$('preset-seed').value}));
      }
      if(!incoming.length)return;
      const now=new Date().toISOString(),next=[...records];
      for(const item of incoming){let name=item.name,n=2;while(next.some(record=>record.name===name))name=item.name+' ('+(n++)+')';next.push({...item,name,id:id(),createdAt:now,updatedAt:now});}
      persist(next);window.presetLibrary.load('local:'+next[records.length-incoming.length].id);
      status.textContent=incoming.length+' preset(s) carregado(s) e salvo(s) localmente.';
    }catch(error){status.textContent='Importação cancelada: '+error.message;}
    event.target.value='';
  };
  $('local-export').onclick=()=>{
    const blob=new Blob([JSON.stringify({format:'avs-lab-presets',version:1,presets:records},null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='meus-presets-avs.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    status.textContent='Biblioteca exportada como JSON. Use Carregar presets para restaurar.';
  };
  $('preset-seed').onchange=()=>{pause();apply();status.textContent='Seed aplicada. Salve o preset para guardá-la.';};
  $('new-seed').onclick=()=>{$('preset-seed').value=String(crypto.getRandomValues(new Uint32Array(1))[0]);$('preset-seed').onchange();};
  window.localPresets={count:()=>records.length};
})();
