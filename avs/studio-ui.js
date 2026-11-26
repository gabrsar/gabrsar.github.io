(() => {
  const $=id=>document.getElementById(id),body=document.body;
  // Global transport avoids arrows/Space, which belong to the camera and presets.
  $('deck-prev').onclick=()=>$('preset-prev').click();
  $('deck-next').onclick=()=>$('preset-next').click();
  $('preset-hold').onclick=()=>window.presetLibrary.hold();
  document.addEventListener('avs-sequence-changed',event=>{
    const running=event.detail.shuffle;
    $('preset-hold').setAttribute('aria-pressed',String(!running));
    $('sequence-state').textContent=running?'Shuffle ativo':'Preset fixo';
  });
  document.addEventListener('keydown',event=>{
    if(event.repeat||event.ctrlKey||event.altKey||event.metaKey||event.shiftKey)return;
    if(event.target.closest('input,textarea,select,[contenteditable],.ace_editor'))return;
    const target={KeyZ:'deck-prev',KeyX:'preset-hold',KeyC:'deck-next'}[event.code];
    if(target){event.preventDefault();$(target).click();}
  });
  let theme='night';try{theme=localStorage.getItem('avs-theme')||'night';}catch{}
  function setTheme(value){
    theme=value==='day'?'day':'night';body.dataset.theme=theme;
    $('theme-toggle').textContent=theme==='day'?'☀ Dia':'☾ Noite';
    $('theme-toggle').setAttribute('aria-pressed',String(theme==='day'));
    $('theme-toggle').setAttribute('aria-label',theme==='day'?'Ativar modo noite':'Ativar modo dia');
    document.querySelector('meta[name="theme-color"]').content=theme==='day'?'#d5d9e2':'#11121b';
    try{localStorage.setItem('avs-theme',theme);}catch{}
  }
  $('theme-toggle').onclick=()=>setTheme(theme==='day'?'night':'day');setTheme(theme);
  const categories={organic:'Orgânico / psicodélico',geometry:'Geometria',worlds:'Mundos e viagens',lounge:'Lounge / ambiente',science:'Ciência / fractais',classic:'Clássicos AVS',local:'Seu preset'};
  function category(entry){
    if(entry.value.startsWith('local:'))return 'local';
    if(/avs-/i.test(entry.value))return 'classic';
    if(/fractal|lorenz|lissajous/i.test(entry.value))return 'science';
    if(/wine|negroni|waiting-room/i.test(entry.value))return 'lounge';
    if(/hyperdrive|terrain|matrix|doom|visual.js/i.test(entry.value))return 'worlds';
    if(/aurora|mycelium|psychedelic|polar|permanent/i.test(entry.value))return 'organic';
    return 'geometry';
  }
  function title(name){return name.replace(/^★\s*/,'').replace(/ · visual\.js$/,'');}
  function setMode(mode){
    if(!['discover','play','studio'].includes(mode))mode='discover';
    body.dataset.mode=mode;
    document.querySelectorAll('[data-mode-switch]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.modeSwitch===mode)));
    if(mode==='discover')setPanel('explore');
    try{localStorage.setItem('avs-ui-mode',mode);}catch{}
    window.dispatchEvent(new Event('resize'));
  }
  function setPanel(panel){
    body.dataset.panel=panel;
    document.querySelectorAll('[data-panel-switch]').forEach(button=>button.setAttribute('aria-selected',String(button.dataset.panelSwitch===panel)));
    for(const name of ['explore','sound','code'])$('panel-'+name).hidden=name!==panel;
    // Ace observes its own size; opening a tab also triggers its layout observer.
    window.dispatchEvent(new Event('resize'));
  }
  document.querySelectorAll('[data-mode-switch]').forEach(button=>button.onclick=()=>setMode(button.dataset.modeSwitch));
  document.querySelectorAll('[data-panel-switch]').forEach(button=>button.onclick=()=>{if(button.dataset.panelSwitch==='code')setMode('studio');setPanel(button.dataset.panelSwitch);});
  $('welcome-demo').onclick=()=>{if($('preset').value==='file:visual.js')window.presetLibrary.load('file:presets/moire-fluid.js');$('demo').click();};
  $('welcome-file').onclick=()=>$('file').click();
  $('open-create').onclick=()=>{setMode('studio');setPanel('code');$('local-new').click();};
  const palette={organic:'#ba8bc9',geometry:'#84b4ad',worlds:'#b6c880',lounge:'#cc906c',science:'#8fa3cf',classic:'#ac9ac5',local:'#a3be83'};
  const cards=new Map();
  function renderLibrary(){
    const entries=window.presetLibrary.entries(),query=$('preset-search').value.toLocaleLowerCase(),filter=$('preset-category').value;
    const eligible=entries.filter(entry=>entry.enabled);
    $('preset-count').textContent=entries.length;
    $('enabled-count').textContent=eligible.length+' de '+entries.length+' ativos';
    const fragment=document.createDocumentFragment();cards.clear();let count=0;
    for(const entry of entries){
      const family=category(entry);
      if(filter!=='all'&&family!==filter)continue;
      if(query&&!((entry.name+' '+entry.text).toLocaleLowerCase().includes(query)))continue;
      const card=document.createElement('article');card.className='preset-card';card.dataset.active=String(entry.value===$('preset').value);card.dataset.enabled=String(entry.enabled);
      const pick=document.createElement('button');pick.className='preview-pick';pick.setAttribute('aria-label','Ver '+entry.name);pick.title=entry.text;
      const art=document.createElement('div');art.className='preset-art art-'+family;art.style.setProperty('--art-color',palette[family]);art.setAttribute('aria-hidden','true');
      const name=document.createElement('span');name.className='preset-card-name';name.textContent=title(entry.name);
      const tag=document.createElement('span');tag.className='preset-card-tag';tag.textContent=categories[family];
      pick.append(art,name,tag);pick.onclick=()=>window.presetLibrary.load(entry.value);
      const label=document.createElement('label');label.className='preset-enable';label.title='Incluir no shuffle';
      const check=document.createElement('input');check.type='checkbox';check.checked=entry.enabled;check.setAttribute('aria-label','Ativar '+entry.name+' no shuffle');check.onchange=()=>window.presetLibrary.setEnabled(entry.value,check.checked);label.append(check);
      card.append(pick,label);fragment.append(card);cards.set(entry.value,card);count++;
    }
    $('preset-cards').replaceChildren(fragment);$('library-empty').hidden=count>0;
  }
  function updateSelected(){
    const selected=window.presetLibrary.entries().find(entry=>entry.value===$('preset').value);
    if(!selected)return;
    $('visual-title').textContent=title(selected.name);
    $('visual-family').textContent=categories[category(selected)].toLocaleUpperCase();
    for(const [value,card]of cards)card.dataset.active=String(value===selected.value);
  }
  $('preset-search').oninput=renderLibrary;$('preset-category').onchange=renderLibrary;
  $('presets-enable-all').onclick=()=>window.presetLibrary.setAllEnabled(true);
  $('presets-disable-all').onclick=()=>window.presetLibrary.setAllEnabled(false);
  document.addEventListener('avs-library-changed',renderLibrary);
  document.addEventListener('avs-preset-loaded',event=>{updateSelected();try{localStorage.setItem('avs-last-preset',event.detail.value);}catch{}});
  document.addEventListener('avs-preset-draft',()=>{$('visual-title').textContent='Novo preset';$('visual-family').textContent='SEU EXPERIMENTO';});
  $('gain').addEventListener('input',()=>$('gain-value').textContent=Number($('gain').value).toFixed(1)+'×');
  $('smooth').addEventListener('input',()=>$('smooth-value').textContent=Math.round(Number($('smooth').value)*100)+'%');
  const updateLog=()=>$('log-control').hidden=$('amplitude-scale').value!=='log';
  $('amplitude-scale').addEventListener('change',updateLog);updateLog();
  let fps=60,lastMode='';
  setInterval(()=>{
    if(typeof a==='undefined')return;
    fps+=(Math.max(0,a.fps||0)-fps)*.25;
    const active=typeof mode!=='undefined'?mode:'silence';
    $('fps-pill').textContent='● '+Math.round(fps)+' FPS';
    $('fps-pill').dataset.slow=String(fps<40);
    $('visual-error').hidden=!$('error').textContent.trim();
    const labels={remote:'Captura conectada',live:'Recebendo áudio',demo:'Demo visual',silence:'Sem sinal'};
    $('signal-label').textContent=labels[active]||'Sem sinal';
    $('stage-mode-label').textContent=active==='demo'?'DEMO · SEM ÁUDIO REAL':'ÁUDIO REATIVO';
    if(active!==lastMode){document.querySelectorAll('.source-button').forEach(button=>button.dataset.active=String((active==='demo'&&button.id==='demo')||(active==='remote'&&button.id==='system')));lastMode=active;}
    updateLog();
  },400);
  let initial='discover';try{initial=localStorage.getItem('avs-ui-mode')||'discover';}catch{}
  setMode(initial);setPanel('explore');renderLibrary();updateSelected();
  try{const remembered=localStorage.getItem('avs-last-preset');if(remembered&&window.presetLibrary.entries().some(entry=>entry.value===remembered))window.presetLibrary.load(remembered);}catch{}
})();
