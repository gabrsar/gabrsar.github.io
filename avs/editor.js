// Ace with contextual completions for the three arguments of draw(p, a, s).
(() => {
  const fallback = document.getElementById('editor');
  window.codeEditor = {
    getValue: () => fallback.value,
    setValue: value => { fallback.value = value; }
  };
  fallback.addEventListener('input',()=>document.dispatchEvent(new Event('avs-editor-user-edit')));
  if (!window.ace) return;
  const host = document.createElement('div');
  host.id = 'ace-editor';
  fallback.before(host);
  const editor = ace.edit(host);
  editor.setTheme('ace/theme/tomorrow_night');
  editor.session.setMode('ace/mode/javascript');
  // The editor contains a function body, not a full JavaScript module.
  editor.session.setUseWorker(false);
  editor.setOptions({
    fontSize: 13, fontFamily: 'Consolas, monospace',
    tabSize: 2, useSoftTabs: true, showPrintMargin: false,
    enableBasicAutocompletion: true, enableLiveAutocompletion: true,
    enableSnippets: true, wrap: true,
    textInputAriaLabel: 'Editor de código p5.js'
  });
  const audio = {
    amplitude: 'amplitude(valor) · compressão visual 0…1 (linear, raiz ou log)',
    visualLevel: 'visualLevel(db) · converte dB para a curva escolhida, 0…1',
    features: 'Características globais para detectar viradas de nível e timbre',
    groups: 'Bandas do perfil atual (nomes pelo limite inferior em Hz) · db/level/attack/hit',
    bass: 'Graves · 20–250 Hz · 0…1', mid: 'Médios · 250–4000 Hz · 0…1',
    treble: 'Agudos · 4000–16000 Hz · 0…1', level: 'Amplitude RMS',
    spectrum: 'Float32Array · bins da FFT · 0…1',
    waveform: 'Float32Array · amostras · -1…1',
    energy: 'energy(hzInicial, hzFinal) · média de uma banda',
    time: 'Tempo em segundos', dt: 'Segundos por frame',
    binHz: 'Largura de cada bin em Hz', sampleRate: 'Taxa de amostragem em Hz'
  };
  const signatures = {
    background: 'background(cor ou r, g, b, alpha)', fill: 'fill(r, g, b, alpha)',
    stroke: 'stroke(r, g, b, alpha)', circle: 'circle(x, y, diâmetro)',
    rect: 'rect(x, y, largura, altura)', line: 'line(x1, y1, x2, y2)',
    translate: 'translate(x, y)', rotate: 'rotate(ângulo em radianos)',
    map: 'map(valor, início1, fim1, início2, fim2)',
    noise: 'noise(x, y, z)', random: 'random(min, max)',
    vertex: 'vertex(x, y)', strokeWeight: 'strokeWeight(espessura)'
  };
  function members(object) {
    const names = new Set();
    for (let current = object; current && current !== Object.prototype; current = Object.getPrototypeOf(current)) {
      for (const key of Object.getOwnPropertyNames(current)) {
        if (/^[A-Za-z][\w]*$/.test(key) && key !== 'constructor') names.add(key);
      }
    }
    return [...names];
  }
  const completer = {
    triggerCharacters: ['.'],
    getCompletions(_editor, session, position, prefix, callback) {
      const before = session.getLine(position.row).slice(0, position.column - prefix.length);
      const nested = before.match(/\ba\.groups\.(?:(\w+)\.)?$/);
      if(nested){const names=nested[1]?['db','magnitude','level','energy','attack','sustain','hit','low','high','gain','enabled']:(window.avsGroupNames||[]);callback(null,names.filter(name=>name.startsWith(prefix)).map(name=>({caption:name,value:name,meta:'grupo FFT',score:1100})));return;}
      const match = before.match(/\b(p|a|s|Math)\.$/);
      const root = match && match[1];
      let items = [];
      if (root === 'a') items = Object.keys(audio).map(name => ({name, doc: audio[name], meta: 'áudio'}));
      if (root === 'p') {
        const instance = window.avsP5 || (window.p5 && p5.prototype);
        items = members(instance).map(name => ({name, doc: signatures[name] || `p.${name} · API p5.js`, meta: 'p5.js'}));
      }
      if (root === 'Math') items = members(Math).map(name => ({name, doc: `Math.${name}`, meta: 'JavaScript'}));
      if (root === 's') {
        const keys = new Set([...session.getValue().matchAll(/\bs\.([A-Za-z_$][\w$]*)/g)].map(m => m[1]));
        items = [...keys].map(name => ({name, doc: 'Estado persistente entre frames', meta: 'estado'}));
      }
      if (!root) items = [
        {name: 'p', doc: 'Instância p5.js', meta: 'laboratório'},
        {name: 'a', doc: 'Dados de áudio e FFT', meta: 'laboratório'},
        {name: 's', doc: 'Estado persistente entre frames', meta: 'laboratório'}
      ];
      callback(null, items.filter(item => item.name.startsWith(prefix)).map(item => ({
        caption: item.name, value: item.name, meta: item.meta,
        score: 1000, docText: item.doc
      })));
    }
  };
  ace.require('ace/ext/language_tools').addCompleter(completer);
  editor.commands.on('afterExec',event=>{
    const edits=['insertstring','paste','backspace','del','undo','redo','indent','outdent','removeline','togglecomment','cut'];
    if(edits.includes(event.command.name))document.dispatchEvent(new Event('avs-editor-user-edit'));
  });
  editor.commands.addCommand({
    name: 'applyVisual', bindKey: {win: 'Ctrl-Enter', mac: 'Command-Enter'},
    exec: () => document.getElementById('run').click()
  });
  fallback.hidden = true;
  window.codeEditor = {
    getValue: () => editor.getValue(),
    setValue: value => editor.setValue(value, -1)
  };
  new ResizeObserver(() => editor.resize()).observe(host);
})();
