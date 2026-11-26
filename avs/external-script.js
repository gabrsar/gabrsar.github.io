// Reload only the visual, keeping the audio connection and p5 canvas alive.
(() => {
  const watch = document.getElementById('watch-script');
  const status = document.getElementById('script-status');
  let previous, busy = false, revision = 0, currentPath='visual.js';
  window.followScript=(path,code)=>{revision++;currentPath=path;previous=code;watch.checked=true;};
  function pause() {
    watch.checked = false;
    revision++;
    status.textContent = 'Editor manual · arquivo não acompanhado';
  }
  for (const [id, event] of [['run', 'click'], ['preset', 'change'], ['codefile', 'change']]) {
    document.getElementById(id).addEventListener(event, pause, true);
  }
  document.addEventListener('avs-editor-user-edit',pause);
  async function reload(force = false) {
    if (busy) return;
    busy = true;
    const ticket = revision;
    try {
      const response = await fetch('./'+currentPath, {cache: 'no-store'});
      if (!response.ok) throw new Error('HTTP ' + response.status);
      const code = await response.text();
      if (ticket !== revision) return;
      if (!force && code === previous) return;
      previous = code;
      // Validate before replacing the editor or the running function.
      new Function('p', 'a', 's', code);
      codeEditor.setValue(code);
      if (apply()) {
        const preset=document.getElementById('preset');
        if([...preset.options].some(option=>option.value==='file:'+currentPath))preset.value='file:'+currentPath;
        status.textContent = currentPath+' aplicado às ' + new Date().toLocaleTimeString();
      } else {
        status.textContent = 'Erro ao aplicar '+currentPath+' · consulte o editor';
      }
    } catch (error) {
      if (ticket === revision) status.textContent = currentPath+': ' + error.message;
    } finally {
      busy = false;
    }
  }
  document.getElementById('reload-script').onclick = () => {revision++;currentPath='visual.js';reload(true);};
  watch.onchange = () => {
    revision++;
    if (watch.checked) reload(true);
    else status.textContent = 'Acompanhamento pausado';
  };
  setInterval(() => { if (watch.checked) reload(); }, 1000);
  reload(true);
})();
