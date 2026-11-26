// Report transport problems separately from ordinary musical silence.
(() => {
  const label = document.getElementById('capture-health');
  function report() {
    const parts = [];
    if (mode === 'remote') parts.push(window.remoteAudio.state);
    else if (mode === 'demo') parts.push('Demo sintética');
    else if (mode !== 'live') parts.push('Captura inativa');
    else {
      parts.push('Motor: ' + (context ? context.state : 'inativo'));
      if (stream) {
        const track = stream.getAudioTracks()[0];
        if (!track || track.readyState === 'ended') parts.push('Compartilhamento encerrado · selecione Áudio do PC / aba');
        else if (track.muted) parts.push('Fonte temporariamente sem fornecer áudio');
        else parts.push('Faixa conectada' + (a.level < .0001 ? ' · sem sinal audível' : ' · recebendo sinal'));
      } else if (media) parts.push(media.ended ? 'Arquivo terminou' : media.paused ? 'Arquivo pausado' : 'Arquivo em reprodução');
      if (context && context.state !== 'running') parts.push('Clique em Retomar áudio');
    }
    if (document.hidden) parts.push('Página em segundo plano · desenho pode pausar');
    label.textContent = parts.join(' · ');
  }
  async function resume() {
    if(mode==='remote')window.remoteAudio.resume();
    if (context && context.state !== 'running' && context.state !== 'closed') {
      try { await context.resume(); }
      catch (error) { message('Não foi possível retomar o motor: ' + error.message); }
    }
    report();
  }
  document.getElementById('resume-audio').onclick = resume;
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && (mode === 'live' || mode === 'remote')) resume();
    else report();
  });
  setInterval(report, 500);
  report();
})();
