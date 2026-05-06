// Site bootstrap. Keep page-level wiring here; individual visual effects live in assets/js/background-effects/.
window.addEventListener("DOMContentLoaded", () => {
  const lorenzCanvas = document.querySelector("#lorenz-canvas");
  window.BackgroundEffects?.mountLorenzAttractor?.(lorenzCanvas);
});
