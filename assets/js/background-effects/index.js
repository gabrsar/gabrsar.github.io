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
        id: "lorenz-attractor",
        aliases: ["lorenz", "attractor", "particles"],
        mount: () =>
          window.BackgroundEffects?.mountLorenzAttractor?.(backgroundCanvas),
      },
    ];

    const effectFromUrl = new URLSearchParams(window.location.search)
      .get("effect")
      ?.trim()
      .toLowerCase();
    const forcedEffect = effects.find(
      (effect) =>
        effect.id === effectFromUrl || effect.aliases.includes(effectFromUrl),
    );
    const lastEffectId = window.sessionStorage.getItem("lastBackgroundEffect");
    const randomEffects =
      effects.length > 1
        ? effects.filter((effect) => effect.id !== lastEffectId)
        : effects;
    const selectedEffect =
      forcedEffect ||
      randomEffects[Math.floor(Math.random() * randomEffects.length)];

    document.body.dataset.backgroundEffect = selectedEffect.id;
    window.sessionStorage.setItem("lastBackgroundEffect", selectedEffect.id);
    selectedEffect.mount();
  }

  window.addEventListener("DOMContentLoaded", mountSelectedBackgroundEffect);
})();
