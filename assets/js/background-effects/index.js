// Background effect bootstrap. Individual effects own their canvas behavior;
// this file only chooses which effect should be mounted for the hero.
(function () {
  function mountSelectedBackgroundEffect() {
    const backgroundCanvas = document.querySelector("#hero-background-canvas");
    if (!backgroundCanvas) {
      return;
    }

    const effects = [
      {
        id: "game-of-life",
        aliases: ["life", "game", "conway", "gol"],
        mount: () =>
          window.BackgroundEffects?.mountGameOfLife?.(backgroundCanvas),
      },
      {
        id: "hilbert-curve",
        aliases: ["hilbert", "curve", "fractal", "space-filling"],
        mount: () =>
          window.BackgroundEffects?.mountHilbertCurve?.(backgroundCanvas),
      },
      {
        id: "lorenz-attractor",
        aliases: ["lorenz", "attractor", "particles"],
        mount: () =>
          window.BackgroundEffects?.mountLorenzAttractor?.(backgroundCanvas),
      },
    ];

    const selectedEffect =
      effects.find((effect) => effect.id === "hilbert-curve") || effects[0];

    document.body.dataset.backgroundEffect = selectedEffect.id;
    window.sessionStorage.setItem("lastBackgroundEffect", selectedEffect.id);
    selectedEffect.mount();
  }

  window.addEventListener("DOMContentLoaded", mountSelectedBackgroundEffect);
})();
