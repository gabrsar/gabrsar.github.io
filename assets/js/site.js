// Site bootstrap. Keep page-level wiring here; individual visual effects live in assets/js/background-effects/.
window.addEventListener("DOMContentLoaded", () => {
  const backgroundCanvas = document.querySelector("#hero-background-canvas");
  document.body.dataset.backgroundEffect = "game-of-life";
  window.BackgroundEffects?.mountGameOfLife?.(backgroundCanvas);
});
