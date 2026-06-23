// Animated Hilbert curve background effect for the home hero.
//
// Public API:
//   window.BackgroundEffects.mountHilbertCurve(canvas)
(function () {
  const BackgroundEffects =
    window.BackgroundEffects || (window.BackgroundEffects = {});

  function mountHilbertCurve(canvas) {
    if (!canvas) {
      return null;
    }

    const context = canvas.getContext("2d");
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const settingsPrefix = "hilbertCurve.";
    const advancedParameterKeys = new Set(["curveScale", "maxFps", "maxLevel"]);
    const rushJitterLevel = 4;
    const parameterDefinitions = [
      {
        key: "curveScale",
        label: "Tamanho",
        min: 0.1,
        niceMax: 1,
        yoloMax: 2,
        step: 0.01,
        defaultValue: 0.9,
        description: "Escala do quadrado da Hilbert dentro da viewport.",
        suffix: "x",
        advanced: true,
        inputMode: "number",
      },
      {
        key: "maxFps",
        label: "FPS budget",
        min: 1,
        niceMax: 120,
        yoloMax: 240,
        step: 1,
        defaultValue: 60,
        description: "Budget usado para dividir trabalho pesado por frame.",
        advanced: true,
        inputMode: "number",
      },
      {
        key: "maxLevel",
        label: "Nivel max",
        min: 0,
        niceMax: 10,
        yoloMax: 12,
        step: 1,
        defaultValue: 7,
        description: "Aviso: acima de 10 pode travar seu computador.",
        advanced: true,
        inputMode: "number",
      },
      {
        key: "holdDurationMs",
        label: "Pausa",
        min: 0,
        niceMax: 5000,
        yoloMax: 12000,
        step: 50,
        defaultValue: 1400,
        description: "Tempo parado entre uma evolucao de nivel e outra.",
        suffix: "ms",
      },
      {
        key: "baseMorphDurationMs",
        label: "Morph base",
        min: 300,
        niceMax: 8000,
        yoloMax: 20000,
        step: 100,
        defaultValue: 3300,
        description: "Duracao do morph entre uma evolucao de nivel e outra.",
        suffix: "ms",
      },
      {
        key: "baseTrailDurationMs",
        label: "Trail base",
        min: 0,
        niceMax: 5000,
        yoloMax: 12000,
        step: 50,
        defaultValue: 1200,
        description: "Tempo base do rastro, dividido pelo nivel atual.",
        suffix: "ms",
      },
      {
        key: "minTrailFrames",
        label: "Trail alto",
        min: 0,
        niceMax: 80,
        yoloMax: 160,
        step: 1,
        defaultValue: 100,
        description: "Maximo de frames antigos guardados nos niveis altos.",
      },
      {
        key: "maxTrailFrames",
        label: "Trail baixo",
        min: 0,
        niceMax: 160,
        yoloMax: 320,
        step: 1,
        defaultValue: 200,
        description: "Maximo de frames antigos guardados nos niveis baixos.",
      },
      {
        key: "transitionBand",
        label: "Faixa",
        min: 0.02,
        niceMax: 0.4,
        yoloMax: 1,
        step: 0.01,
        defaultValue: 0.08,
        description: "Largura da frente que transforma a curva aos poucos.",
      },
      {
        key: "overshootAmplitude",
        label: "Overshoot",
        min: 0,
        niceMax: 0.2,
        yoloMax: 0.5,
        step: 0.005,
        defaultValue: 0.075,
        description: "Forca da passada alem do alvo antes de retornar.",
      },
      {
        key: "overshootFrequency",
        label: "Oscilacao",
        min: 0.5,
        niceMax: 5,
        yoloMax: 12,
        step: 0.1,
        defaultValue: 2.4,
        description: "Frequencia da ondulacao usada no overshoot.",
      },
    ];
    const settings = Object.fromEntries(
      parameterDefinitions.map((definition) => [
        definition.key,
        readSetting(definition),
      ]),
    );
    const rushStorageKey = `${settingsPrefix}rushMode`;
    const focusWaypointsStorageKey = `${settingsPrefix}focusWaypoints`;
    const focusWaypointProgressStorageKey = `${settingsPrefix}focusWaypointProgress`;
    const zoomNodesStorageKey = `${settingsPrefix}zoomNodes`;
    const rushMaxLevel = 7;
    const rushCompletionSeconds = 150;
    const introLineSegments = 3;
    const rushAudioSrc = "/assets/sounds/In-the-hall-of-the-mountain-king.mp3";
    const rushTimeline = [
      {start: 0, end: 2, type:"none",},
      { start: 2, end: 3.5, type: "draw", level: -1 },
      { start: 3.5, end: 5, type: "morph", from: -1, to: 0 },
      { start: 5, end: 22, type: "morph", from: 0, to: 1 },
      { start: 22, end: 39, type: "morph", from: 1, to: 2 },
      { start: 39, end: 54, type: "morph", from: 2, to: 3 },
      { start: 54, end: 69, type: "morph", from: 3, to: 4 },
      { start: 69, end: 84, type: "morph", from: 4, to: 5 },
      { start: 84, end: 96, type: "morph", from: 5, to: 6 },
      { start: 96, end: rushCompletionSeconds, type: "morph", from: 6, to: 7 },
      { start: rushCompletionSeconds, end: Infinity, type: "hold", level: 7 },
    ];
    const rushContext = {
      enabled: window.localStorage.getItem(rushStorageKey) === "on",
      startedAt: performance.now(),
      overshootScale: 1,
      trailScale: 1,
      transitionBandScale: 1,
      zoomScale: 1,
      zoomProgress: 0,
      zoomFocusX: 0.5,
      zoomFocusY: 0.5,
      zoomTargetX: 0.5,
      zoomTargetY: 0.5,
      audioStoppedAtEnd: false,
    };
    const defaultFocusWaypoints = [
      { x: 0, y: 0 },
      { x: 0, y: 0.62 },
      { x: 0, y: 1 },
      { x: 0.5, y: 1 },
      { x: 0.5, y: 1 },
      { x: 1, y: 1 },
      { x: 1, y: 0.62 },
      { x: 1, y: 0 },
    ];
    const defaultFocusWaypointProgress = [0, 0.18, 0.36, 0.5, 0.5, 0.66, 0.82, 1];
    const defaultZoomNodes = [
      { time: 0, progress: 0, zoom: 1, locked: true },
      { time: 69, progress: 0, zoom: 1 },
      { time: 84, progress: 0.5, zoom: 2 },
      { time: 96, progress: 0.66, zoom: 1.35 },
      { time: rushCompletionSeconds, progress: 1, zoom: 4 },
    ];
    const focusWaypoints = readPointList(
      focusWaypointsStorageKey,
      defaultFocusWaypoints,
    );
    const focusWaypointProgress = readProgressList(
      focusWaypointProgressStorageKey,
      defaultFocusWaypointProgress,
    );
    const zoomNodes = readZoomNodes();
    let rushAudio = null;
    let rushAudioNeedsGesture = false;
    let debugDrag = null;
    const curveBox = {
      x: 0,
      y: 0,
      size: 0,
      centerX: 0,
      centerY: 0,
    };
    const builtLevels = new Map();
    const levelBuilders = new Map();
    const morphProgressCache = new Map();
    const trailFrames = [];
    let rafId = 0;
    let lastTimestamp = 0;
    let currentLevel = prefersReducedMotion ? maxVisualLevel() : 0;
    let phase = prefersReducedMotion ? "static" : "build";
    let phaseStartedAt = performance.now();
    let morphProgress = prefersReducedMotion ? 1 : 0;
    let direction = 1;
    let controlsElement = null;

    function readSetting(definition) {
      const storedValue = window.localStorage.getItem(
        settingsPrefix + definition.key,
      );
      const parsedValue = storedValue === null ? NaN : Number(storedValue);
      return normalizeSetting(
        definition,
        Number.isFinite(parsedValue) ? parsedValue : definition.defaultValue,
      );
    }

    function readPointList(storageKey, fallback) {
      try {
        const parsed = JSON.parse(window.localStorage.getItem(storageKey));
        if (!Array.isArray(parsed) || parsed.length !== fallback.length) {
          return fallback.map((point) => ({ ...point }));
        }

        return parsed.map((point, index) => ({
          x: Number.isFinite(Number(point.x))
            ? clamp(Number(point.x), 0, 1)
            : fallback[index].x,
          y: Number.isFinite(Number(point.y))
            ? clamp(Number(point.y), 0, 1)
            : fallback[index].y,
        }));
      } catch {
        return fallback.map((point) => ({ ...point }));
      }
    }

    function readProgressList(storageKey, fallback) {
      try {
        const parsed = JSON.parse(window.localStorage.getItem(storageKey));
        if (!Array.isArray(parsed) || parsed.length !== fallback.length) {
          return fallback.slice();
        }

        return parsed.map((value, index) =>
          Number.isFinite(Number(value))
            ? clamp(Number(value), 0, 1)
            : fallback[index],
        );
      } catch {
        return fallback.slice();
      }
    }

    function readZoomNodes() {
      try {
        const parsed = JSON.parse(window.localStorage.getItem(zoomNodesStorageKey));
        if (!Array.isArray(parsed)) {
          return defaultZoomNodes.map((node) => ({ ...node }));
        }

        const migratedNodes =
          parsed.length === defaultZoomNodes.length - 1
            ? [defaultZoomNodes[0], ...parsed]
            : parsed;
        if (migratedNodes.length !== defaultZoomNodes.length) {
          return defaultZoomNodes.map((node) => ({ ...node }));
        }

        return migratedNodes.map((node, index) => ({
          time: defaultZoomNodes[index].locked
            ? defaultZoomNodes[index].time
            : Number.isFinite(Number(node.time))
            ? clamp(Number(node.time), 0, rushCompletionSeconds)
            : defaultZoomNodes[index].time,
          progress: defaultZoomNodes[index].progress,
          zoom: defaultZoomNodes[index].locked
            ? defaultZoomNodes[index].zoom
            : Number.isFinite(Number(node.zoom))
            ? clamp(Number(node.zoom), 0.2, 8)
            : defaultZoomNodes[index].zoom,
          locked: Boolean(defaultZoomNodes[index].locked),
        }));
      } catch {
        return defaultZoomNodes.map((node) => ({ ...node }));
      }
    }

    function saveFocusWaypoints() {
      window.localStorage.setItem(
        focusWaypointsStorageKey,
        JSON.stringify(focusWaypoints),
      );
      window.localStorage.setItem(
        focusWaypointProgressStorageKey,
        JSON.stringify(focusWaypointProgress),
      );
    }

    function saveZoomNodes() {
      window.localStorage.setItem(zoomNodesStorageKey, JSON.stringify(zoomNodes));
    }

    function normalizeSetting(definition, value) {
      if (!Number.isFinite(value)) {
        return definition.defaultValue;
      }

      return definition.step >= 1 ? Math.floor(value) : value;
    }

    function niceMax(definition) {
      return definition.niceMax ?? definition.max ?? definition.defaultValue;
    }

    function yoloMax(definition) {
      return definition.yoloMax ?? definition.max ?? niceMax(definition);
    }

    function curvedAmount(amount) {
      const curve = 3;
      return (Math.exp(curve * amount) - 1) / (Math.exp(curve) - 1);
    }

    function inverseCurvedAmount(amount) {
      const curve = 3;
      return Math.log(1 + amount * (Math.exp(curve) - 1)) / curve;
    }

    function sliderValueToSetting(definition, sliderValue) {
      const sliderNicePosition = 0.8;
      const min = definition.min;
      const nice = niceMax(definition);
      const yolo = yoloMax(definition);
      const sliderAmount = clamp(Number(sliderValue), 0, 1);
      const inNiceRange = sliderAmount <= sliderNicePosition;
      const rangeStart = inNiceRange ? min : nice;
      const rangeEnd = inNiceRange ? nice : yolo;
      const localAmount = inNiceRange
        ? sliderAmount / sliderNicePosition
        : (sliderAmount - sliderNicePosition) / (1 - sliderNicePosition);
      const value = lerp(rangeStart, rangeEnd, curvedAmount(localAmount));
      return normalizeSetting(definition, value);
    }

    function settingToSliderValue(definition, value) {
      const sliderNicePosition = 0.8;
      const min = definition.min;
      const nice = niceMax(definition);
      const yolo = yoloMax(definition);
      const normalizedValue = normalizeSetting(definition, value);

      if (normalizedValue <= nice) {
        const amount = (normalizedValue - min) / Math.max(0.000001, nice - min);
        return sliderNicePosition * inverseCurvedAmount(clamp(amount, 0, 1));
      }

      const amount = (normalizedValue - nice) / Math.max(0.000001, yolo - nice);
      return (
        sliderNicePosition +
        (1 - sliderNicePosition) * inverseCurvedAmount(clamp(amount, 0, 1))
      );
    }

    function formatSettingValue(definition, value) {
      const precision = definition.step < 1 ? 3 : 0;
      const fixedValue = Number(value).toFixed(precision);
      const formatted =
        precision > 0 ? fixedValue.replace(/\.?0+$/, "") : fixedValue;
      return `${formatted}${definition.suffix || ""}`;
    }

    function maxVisualLevel() {
      const configuredLevel = Math.max(0, Math.floor(settings.maxLevel));
      return rushContext.enabled
        ? Math.max(configuredLevel, rushMaxLevel)
        : configuredLevel;
    }

    function getRushAudio() {
      if (!rushAudio) {
        rushAudio = new Audio(rushAudioSrc);
        rushAudio.preload = "auto";
        rushAudio.loop = false;
      }

      return rushAudio;
    }

    function startRushAudio() {
      const audio = getRushAudio();
      rushContext.audioStoppedAtEnd = false;
      rushAudioNeedsGesture = false;
      audio.pause();
      audio.volume = 1;
      audio.currentTime = 0;
      const playPromise = audio.play();
      if (playPromise?.catch) {
        playPromise.catch(() => {
          rushAudioNeedsGesture = true;
          // Browsers may block playback unless Rush was started by a gesture.
        });
      }
    }

    function resumeRushAudioAfterGesture() {
      if (
        !rushContext.enabled ||
        rushContext.audioStoppedAtEnd
      ) {
        return;
      }

      const audio = getRushAudio();
      if (!rushAudioNeedsGesture && !audio.paused) {
        return;
      }

      rushAudioNeedsGesture = false;
      const playPromise = audio.play();
      if (playPromise?.catch) {
        playPromise.catch(() => {
          rushAudioNeedsGesture = true;
        });
      }
    }

    function stopRushAudio() {
      if (!rushAudio) {
        return;
      }

      rushAudioNeedsGesture = false;
      rushAudio.pause();
      rushAudio.currentTime = 0;
    }

    function resetCurveState() {
      builtLevels.clear();
      levelBuilders.clear();
      morphProgressCache.clear();
      trailFrames.length = 0;
      rushContext.overshootScale = 1;
      rushContext.trailScale = 1;
      rushContext.transitionBandScale = 1;
      rushContext.zoomScale = 1;
      rushContext.zoomProgress = 0;
      rushContext.zoomFocusX = 0.5;
      rushContext.zoomFocusY = 0.5;
      rushContext.zoomTargetX = 0.5;
      rushContext.zoomTargetY = 0.5;
      currentLevel = clamp(Math.floor(currentLevel), 0, maxVisualLevel());
      direction = currentLevel >= maxVisualLevel() ? -1 : 1;
      phase = prefersReducedMotion ? "static" : "build";
      phaseStartedAt = performance.now();
      morphProgress = prefersReducedMotion ? 1 : 0;
      stopRushAudio();
      resizeCanvas();
      ensureLevel(currentLevel);
      if (currentLevel < maxVisualLevel()) {
        ensureLevel(currentLevel + 1);
      }
    }

    function resetRushState() {
      rushContext.startedAt = performance.now();
      rushContext.overshootScale = 1;
      rushContext.trailScale = 1;
      rushContext.transitionBandScale = 1;
      rushContext.zoomScale = 1;
      rushContext.zoomProgress = 0;
      rushContext.zoomFocusX = 0.5;
      rushContext.zoomFocusY = 0.5;
      rushContext.zoomTargetX = 0.5;
      rushContext.zoomTargetY = 0.5;
      rushContext.audioStoppedAtEnd = false;
      builtLevels.clear();
      levelBuilders.clear();
      morphProgressCache.clear();
      trailFrames.length = 0;
      currentLevel = -1;
      direction = 1;
      phase = "build";
      phaseStartedAt = rushContext.startedAt;
      morphProgress = 0;
      resizeCanvas();
      ensureLevel(-1);
      ensureLevel(0);
      startRushAudio();
    }

    function ensureControlsStyles() {
      if (document.getElementById("hilbert-controls-styles")) {
        return;
      }

      const style = document.createElement("style");
      style.id = "hilbert-controls-styles";
      style.textContent = `
        .hilbert-controls {
          position: fixed;
          top: 16px;
          z-index: 20;
          display: grid;
          gap: 10px;
          width: min(310px, calc(100vw - 32px));
          max-height: calc(100vh - 32px);
          overflow: auto;
          border: 1px solid rgba(124, 172, 255, 0.2);
          border-radius: 8px;
          padding: 12px;
          background:
            linear-gradient(
              135deg,
              rgba(11, 22, 38, 0.72),
              rgba(4, 8, 15, 0.56)
            );
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.08),
            0 18px 44px rgba(0, 0, 0, 0.32);
          color: rgba(233, 242, 255, 0.94);
          font: 12px/1.25 ui-sans-serif, system-ui, sans-serif;
          backdrop-filter: blur(22px) saturate(1.3);
          -webkit-backdrop-filter: blur(22px) saturate(1.3);
        }

        .hilbert-controls--main {
          left: 16px;
        }

        .hilbert-controls--advanced {
          right: 16px;
        }

        .hilbert-control {
          display: grid;
          gap: 5px;
        }

        .hilbert-controls-section {
          display: grid;
          gap: 10px;
        }

        .hilbert-controls-section + .hilbert-controls-section {
          border-top: 1px solid rgba(124, 172, 255, 0.16);
          padding-top: 10px;
        }

        .hilbert-controls-heading {
          cursor: pointer;
          margin: 0;
          color: rgba(154, 196, 255, 0.96);
          font-size: 12px;
          font-weight: 760;
          letter-spacing: 0;
        }

        .hilbert-control-warning {
          display: block;
          border-left: 2px solid rgba(255, 195, 113, 0.78);
          margin: -1px 0 1px;
          padding-left: 8px;
          color: rgba(255, 216, 166, 0.86);
        }

        .hilbert-control-description {
          display: block;
          min-height: 28px;
          margin: -1px 0 1px;
          opacity: 0;
          color: rgba(199, 220, 255, 0.68);
          transition:
            opacity 0.16s ease 0s;
        }

        .hilbert-control:hover .hilbert-control-description,
        .hilbert-control:focus-within .hilbert-control-description {
          opacity: 1;
          transition:
            opacity 0.18s ease 0.28s;
        }

        .hilbert-control-label {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .hilbert-control-value {
          color: rgba(154, 196, 255, 0.92);
          font-variant-numeric: tabular-nums;
        }

        .hilbert-control input {
          width: 100%;
          accent-color: #90c6ff;
        }

        .hilbert-control-editor {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 74px;
          gap: 8px;
          align-items: center;
        }

        .hilbert-slider-wrap {
          position: relative;
          display: grid;
          align-items: center;
          min-height: 24px;
        }

        .hilbert-slider-ticks {
          position: absolute;
          inset: 0;
          border-radius: 999px;
          background:
            repeating-linear-gradient(
              90deg,
              transparent 0,
              transparent calc(10% - 1px),
              rgba(233, 242, 255, 0.2) calc(10% - 1px),
              rgba(233, 242, 255, 0.2) 10%
            ),
            linear-gradient(
              90deg,
              rgba(233, 242, 255, 0.54) 0 1px,
              transparent 1px calc(80% - 1px),
              rgba(118, 189, 255, 0.9) calc(80% - 1px) calc(80% + 1px),
              transparent calc(80% + 1px) calc(100% - 1px),
              rgba(255, 136, 136, 0.92) calc(100% - 1px) 100%
            );
          opacity: 0.72;
          pointer-events: none;
        }

        .hilbert-control input[type="range"] {
          position: relative;
          z-index: 1;
          height: 18px;
          border-radius: 999px;
          background:
            linear-gradient(
              90deg,
              rgba(105, 176, 255, 0.84) 0%,
              rgba(105, 176, 255, 0.84) 80%,
              rgba(255, 122, 122, 0.88) 100%
            );
        }

        .hilbert-control input[type="number"] {
          border: 1px solid rgba(124, 172, 255, 0.24);
          border-radius: 6px;
          padding: 7px 8px;
          background: rgba(5, 10, 18, 0.7);
          color: rgba(233, 242, 255, 0.94);
          font: inherit;
        }

        .hilbert-rush-toggle {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          border-bottom: 1px solid rgba(124, 172, 255, 0.16);
          padding-bottom: 10px;
        }

        .hilbert-rush-toggle strong {
          display: block;
          color: rgba(233, 242, 255, 0.96);
          font-size: 12px;
        }

        .hilbert-rush-toggle span {
          display: block;
          margin-top: 2px;
          color: rgba(199, 220, 255, 0.62);
          font-size: 11px;
        }

        .hilbert-rush-switch {
          position: relative;
          flex: 0 0 auto;
          width: 46px;
          height: 26px;
        }

        .hilbert-rush-switch input {
          position: absolute;
          inset: 0;
          opacity: 0;
        }

        .hilbert-rush-switch i {
          position: absolute;
          inset: 0;
          border: 1px solid rgba(124, 172, 255, 0.28);
          border-radius: 999px;
          background: rgba(5, 10, 18, 0.88);
          transition:
            background 0.18s ease,
            border-color 0.18s ease;
        }

        .hilbert-rush-switch i::after {
          content: "";
          position: absolute;
          top: 3px;
          left: 3px;
          width: 18px;
          height: 18px;
          border-radius: 999px;
          background: rgba(199, 220, 255, 0.86);
          box-shadow: 0 0 12px rgba(144, 198, 255, 0.22);
          transition:
            transform 0.18s ease,
            background 0.18s ease;
        }

        .hilbert-rush-switch input:checked + i {
          border-color: rgba(94, 232, 181, 0.54);
          background: rgba(32, 115, 87, 0.7);
        }

        .hilbert-rush-switch input:checked + i::after {
          transform: translateX(20px);
          background: rgba(179, 255, 224, 0.96);
        }

        @media (max-width: 720px) {
          .hilbert-controls {
            width: calc(50vw - 24px);
          }

          .hilbert-control-editor {
            grid-template-columns: 1fr;
          }
        }
      `;
      document.head.append(style);
    }

    function createControls() {
      if (canvas.dataset.hilbertControls !== "on") {
        return null;
      }

      ensureControlsStyles();
      const root = document.createElement("div");
      const controls = document.createElement("div");
      controls.className = "hilbert-controls hilbert-controls--main";
      const advancedControls = document.createElement("div");
      advancedControls.className = "hilbert-controls hilbert-controls--advanced";
      const mainSection = document.createElement("div");
      mainSection.className = "hilbert-controls-section";
      const rushToggle = document.createElement("label");
      rushToggle.className = "hilbert-rush-toggle";
      const rushCopy = document.createElement("span");
      const rushTitle = document.createElement("strong");
      rushTitle.textContent = "Modo Rush · com som";
      const rushDescription = document.createElement("span");
      rushDescription.textContent =
        "Liga o som!";
      const rushSwitch = document.createElement("span");
      rushSwitch.className = "hilbert-rush-switch";
      const rushInput = document.createElement("input");
      rushInput.type = "checkbox";
      rushInput.checked = rushContext.enabled;
      rushInput.title = "Ativa o Rush com musica.";
      rushToggle.title = "Ativa o Rush com musica. Aumenta o volume.";
      const rushKnob = document.createElement("i");
      const advancedSection = document.createElement("div");
      advancedSection.className = "hilbert-controls-section";
      const advancedSummary = document.createElement("div");
      advancedSummary.className = "hilbert-controls-heading";
      advancedSummary.textContent = "Configs avancadas";
      advancedSection.append(advancedSummary);

      rushInput.addEventListener("change", () => {
        rushContext.enabled = rushInput.checked;
        window.localStorage.setItem(
          rushStorageKey,
          rushContext.enabled ? "on" : "off",
        );
        if (rushContext.enabled) {
          resetRushState();
        } else {
          resetCurveState();
        }
      });

      rushCopy.append(rushTitle, rushDescription);
      rushSwitch.append(rushInput, rushKnob);
      rushToggle.append(rushCopy, rushSwitch);

      parameterDefinitions.forEach((definition) => {
        const row = document.createElement("label");
        row.className = "hilbert-control";

        const labelLine = document.createElement("span");
        labelLine.className = "hilbert-control-label";

        const labelText = document.createElement("span");
        labelText.textContent = definition.label;

        const valueText = document.createElement("span");
        valueText.className = "hilbert-control-value";
        valueText.textContent = formatSettingValue(
          definition,
          settings[definition.key],
        );

        const editor = document.createElement("span");
        editor.className = "hilbert-control-editor";
        const sliderWrap = document.createElement("span");
        sliderWrap.className = "hilbert-slider-wrap";
        const sliderTicks = document.createElement("span");
        sliderTicks.className = "hilbert-slider-ticks";

        const sliderInput = document.createElement("input");
        sliderInput.type = "range";
        sliderInput.min = "0";
        sliderInput.max = "1";
        sliderInput.step = "0.001";
        sliderInput.value = String(
          settingToSliderValue(definition, settings[definition.key]),
        );
        sliderInput.title = definition.description;

        const numberInput = document.createElement("input");
        numberInput.type = "number";
        numberInput.step = String(definition.step);
        numberInput.value = String(settings[definition.key]);
        numberInput.title = definition.description;

        const description = document.createElement("span");
        description.className = "hilbert-control-description";
        description.textContent = definition.description;

        const warning = document.createElement("span");
        warning.className = "hilbert-control-warning";
        warning.textContent =
          "Acima de 10 pode travar seu computador. Vai com carinho.";

        function applyControlValue(value) {
          settings[definition.key] = value;
          window.localStorage.setItem(settingsPrefix + definition.key, value);
          valueText.textContent = formatSettingValue(definition, value);
          numberInput.value = String(value);
          sliderInput.value = String(settingToSliderValue(definition, value));

          if (definition.key === "curveScale") {
            resizeCanvas();
          } else if (definition.key === "maxLevel") {
            if (rushContext.enabled) {
              resetRushState();
            } else {
              resetCurveState();
            }
          }
        }

        sliderInput.addEventListener("input", () => {
          applyControlValue(
            sliderValueToSetting(definition, Number(sliderInput.value)),
          );
        });

        numberInput.addEventListener("input", () => {
          applyControlValue(normalizeSetting(definition, Number(numberInput.value)));
        });

        sliderWrap.append(sliderTicks, sliderInput);
        editor.append(sliderWrap, numberInput);

        labelLine.append(labelText, valueText);
        row.title = definition.description;
        row.append(labelLine);
        if (definition.key === "maxLevel") {
          row.append(warning);
        }
        row.append(editor, description);
        if (definition.advanced || advancedParameterKeys.has(definition.key)) {
          advancedSection.append(row);
        } else {
          mainSection.append(row);
        }
      });

      controls.append(mainSection);
      advancedControls.append(rushToggle, advancedSection);
      root.append(controls, advancedControls);
      document.body.append(root);
      return root;
    }

    function clamp(value, min, max) {
      return Math.min(max, Math.max(min, value));
    }

    function lerp(start, end, amount) {
      return start + (end - start) * amount;
    }

    function easeInOut(amount) {
      return amount < 0.5
        ? 4 * amount * amount * amount
        : 1 - Math.pow(-2 * amount + 2, 3) / 2;
    }

    function overshootReturn(amount) {
      const eased = easeInOut(amount);
      const overshoot =
        settings.overshootAmplitude *
        rushContext.overshootScale *
        Math.sin(Math.PI * eased) *
        Math.sin(Math.PI * eased * settings.overshootFrequency);
      return eased + overshoot;
    }

    function rotate(n, point, rx, ry) {
      let x = point.x;
      let y = point.y;

      if (ry === 0) {
        if (rx === 1) {
          x = n - 1 - x;
          y = n - 1 - y;
        }

        const temp = x;
        x = y;
        y = temp;
      }

      point.x = x;
      point.y = y;
      return point;
    }

    function hilbertIndexToPoint(order, index) {
      const size = 1 << order;
      const point = { x: 0, y: 0 };
      let distance = index;

      for (let step = 1; step < size; step *= 2) {
        const rx = 1 & (distance >> 1);
        const ry = 1 & (distance ^ rx);
        rotate(step, point, rx, ry);
        point.x += step * rx;
        point.y += step * ry;
        distance >>= 2;
      }

      return point;
    }

    function segmentCountForLevel(level) {
      if (level === -1) {
        return introLineSegments;
      }

      return Math.pow(4, level + 1) - 1;
    }

    function pointCountForLevel(level) {
      return segmentCountForLevel(level) + 1;
    }

    function ensureLevel(level) {
      if (builtLevels.has(level) || levelBuilders.has(level)) {
        return;
      }

      const pointCount = pointCountForLevel(level);
      levelBuilders.set(level, {
        level,
        pointCount,
        cursor: 0,
        points: new Float32Array(pointCount * 2),
      });
    }

    function buildLevelSlice(level, deadline) {
      const builder = levelBuilders.get(level);
      if (!builder) {
        return builtLevels.get(level) || null;
      }

      const pointCount = builder.pointCount;
      const segmentCount = pointCount - 1;
      if (level === -1) {
        for (let index = 0; index < pointCount; index += 1) {
          const offset = index * 2;
          builder.points[offset] = index / segmentCount;
          builder.points[offset + 1] = 0;
        }
        builder.cursor = pointCount;
      }

      const order = level + 1;
      const levelGridSize = 1 << order;
      const levelGridDivisor = Math.max(1, levelGridSize - 1);
      while (
        level >= 0 &&
        builder.cursor < pointCount &&
        performance.now() < deadline
      ) {
        const point = hilbertIndexToPoint(order, builder.cursor);
        const offset = builder.cursor * 2;
        builder.points[offset] = point.x / levelGridDivisor;
        builder.points[offset + 1] = point.y / levelGridDivisor;
        builder.cursor += 1;
      }

      if (builder.cursor >= pointCount) {
        const finished = {
          level,
          pointCount,
          segmentCount,
          points: builder.points,
          path: buildScreenPath(builder.points, pointCount),
        };
        levelBuilders.delete(level);
        builtLevels.set(level, finished);
        return finished;
      }

      return null;
    }

    function getLevel(level) {
      ensureLevel(level);
      return builtLevels.get(level) || null;
    }

    function buildScreenPath(points, pointCount) {
      const path = new Path2D();
      path.moveTo(baseScreenX(points[0]), baseScreenY(points[1]));
      for (let index = 1; index < pointCount; index += 1) {
        const offset = index * 2;
        path.lineTo(
          baseScreenX(points[offset]),
          baseScreenY(points[offset + 1]),
        );
      }
      return path;
    }

    function rebuildCachedPaths() {
      builtLevels.forEach((levelData) => {
        levelData.path = buildScreenPath(levelData.points, levelData.pointCount);
      });
    }

    function readPoint(points, index) {
      const offset = index * 2;
      return {
        x: points[offset],
        y: points[offset + 1],
      };
    }

    function pointOnPolyline(points, segmentCount, progress) {
      if (segmentCount <= 0) {
        return readPoint(points, 0);
      }

      const distance = clamp(progress, 0, 1) * segmentCount;
      const segmentIndex = Math.min(segmentCount - 1, Math.floor(distance));
      const local = distance - segmentIndex;
      const start = readPoint(points, segmentIndex);
      const end = readPoint(points, segmentIndex + 1);

      return {
        x: lerp(start.x, end.x, local),
        y: lerp(start.y, end.y, local),
      };
    }

    function resizeCanvas() {
      const bounds = canvas.getBoundingClientRect();
      const deviceScale = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.floor(bounds.width * deviceScale));
      canvas.height = Math.max(1, Math.floor(bounds.height * deviceScale));
      context.setTransform(deviceScale, 0, 0, deviceScale, 0, 0);

      const safeCurveScale = Math.max(0, settings.curveScale);
      const baseSize =
        canvas.dataset.hilbertControls === "on"
          ? Math.min(bounds.width, bounds.height)
          : Math.max(bounds.width, bounds.height);
      const size = baseSize * safeCurveScale;
      curveBox.size = size;
      curveBox.x = (bounds.width - size) / 2;
      curveBox.y = (bounds.height - size) / 2;
      curveBox.centerX = curveBox.x + size / 2;
      curveBox.centerY = curveBox.y + size / 2;
      trailFrames.length = 0;
      rebuildCachedPaths();
    }

    function paintAtmosphere(width, height, alpha) {
      context.save();
      context.globalAlpha = alpha;
      const glow = context.createRadialGradient(
        curveBox.centerX,
        curveBox.centerY,
        curveBox.size * 0.06,
        curveBox.centerX,
        curveBox.centerY,
        Math.max(width, height) * 0.9,
      );
      glow.addColorStop(0, "rgba(56, 134, 230, 0.16)");
      glow.addColorStop(0.42, "rgba(18, 45, 92, 0.14)");
      glow.addColorStop(1, "rgba(4, 7, 12, 0)");
      context.fillStyle = glow;
      context.fillRect(0, 0, width, height);
      context.restore();
    }

    function drawBackground(width, height) {
      context.clearRect(0, 0, width, height);
      context.fillStyle = "rgb(5, 7, 11)";
      context.fillRect(0, 0, width, height);
      paintAtmosphere(width, height, 1);

      context.strokeStyle = "rgba(120, 168, 255, 0.08)";
      context.lineWidth = 1;
      context.strokeRect(curveBox.x, curveBox.y, curveBox.size, curveBox.size);
    }

    function cubicBezierPoint(p0, p1, p2, p3, amount) {
      const t = clamp(amount, 0, 1);
      const inverse = 1 - t;
      const inverse2 = inverse * inverse;
      const t2 = t * t;
      return {
        x:
          inverse2 * inverse * p0.x +
          3 * inverse2 * t * p1.x +
          3 * inverse * t2 * p2.x +
          t2 * t * p3.x,
        y:
          inverse2 * inverse * p0.y +
          3 * inverse2 * t * p1.y +
          3 * inverse * t2 * p2.y +
          t2 * t * p3.y,
      };
    }

    function rushZoomGuidePoint(amount) {
      const eased = easeInOut(clamp(amount, 0, 1));
      const firstHalf = eased < 0.5;
      const local = firstHalf ? eased * 2 : (eased - 0.5) * 2;
      return firstHalf
        ? cubicBezierPoint(
            focusWaypoints[0],
            focusWaypoints[1],
            focusWaypoints[2],
            focusWaypoints[3],
            local,
          )
        : cubicBezierPoint(
            focusWaypoints[4],
            focusWaypoints[5],
            focusWaypoints[6],
            focusWaypoints[7],
            local,
          );
    }

    function drawDebugDot(point, radius, fillStyle, strokeStyle) {
      context.beginPath();
      context.arc(
        baseScreenX(point.x),
        baseScreenY(point.y),
        radius,
        0,
        Math.PI * 2,
      );
      context.fillStyle = fillStyle;
      context.fill();
      if (strokeStyle) {
        context.strokeStyle = strokeStyle;
        context.lineWidth = 1;
        context.stroke();
      }
    }

    function waypointSpectrumColor(progress, alpha = 0.86) {
      const hue = clamp(progress, 0, 1) * 360;
      return `hsla(${hue}, 92%, 64%, ${alpha})`;
    }

    function zoomGraphMetrics() {
      return {
        x: curveBox.x + curveBox.size + 18,
        y: curveBox.y,
        width: 150,
        height: Math.min(curveBox.size, 180),
      };
    }

    function zoomNodeScreenPosition(node) {
      const graph = zoomGraphMetrics();
      const zoomAmount = clamp((node.zoom - 1) / 3, 0, 1);
      return {
        x: graph.x + (node.time / rushCompletionSeconds) * graph.width,
        y: graph.y + graph.height * (1 - zoomAmount),
      };
    }

    function drawRushZoomDebug(elapsedSeconds) {
      if (!rushContext.enabled || canvas.dataset.hilbertControls !== "on") {
        return;
      }

      const graph = zoomGraphMetrics();

      context.save();
      context.lineCap = "round";
      context.lineJoin = "round";
      context.lineWidth = 2;
      for (let index = 1; index <= 120; index += 1) {
        const previousProgress = (index - 1) / 120;
        const progress = index / 120;
        const previousPoint = rushZoomGuidePoint(previousProgress);
        const point = rushZoomGuidePoint(progress);
        const segment = new Path2D();
        segment.moveTo(baseScreenX(previousPoint.x), baseScreenY(previousPoint.y));
        segment.lineTo(baseScreenX(point.x), baseScreenY(point.y));
        context.strokeStyle = waypointSpectrumColor(
          (previousProgress + progress) * 0.5,
          0.78,
        );
        context.stroke(segment);
      }

      const zoomGraphPath = new Path2D();
      for (let index = 0; index <= 80; index += 1) {
        const time = (index / 80) * rushCompletionSeconds;
        const zoomAmount = (zoomStateForElapsed(time).zoom - 1) / 3;
        const x = graph.x + (time / rushCompletionSeconds) * graph.width;
        const y = graph.y + graph.height * (1 - zoomAmount);
        if (index === 0) {
          zoomGraphPath.moveTo(x, y);
        } else {
          zoomGraphPath.lineTo(x, y);
        }
      }
      context.strokeStyle = "rgba(188, 137, 255, 0.78)";
      context.lineWidth = 2;
      context.stroke(zoomGraphPath);
      context.strokeStyle = "rgba(188, 137, 255, 0.28)";
      context.lineWidth = 1;
      context.strokeRect(graph.x, graph.y, graph.width, graph.height);

      focusWaypoints.forEach((point, index) => {
        const progress = focusWaypointProgress[index];
        const timeLabel = guideTimestampForProgress(progress);
        const zoomLabel = zoomScaleForGuideProgress(progress);
        const percentLabel = clamp(progress, 0, 1) * 100;
        drawDebugDot(
          point,
          index === 0 || index === 6 ? 4 : 3,
          waypointSpectrumColor(progress, 0.9),
          "rgba(5, 7, 11, 0.9)",
        );
        context.font = "600 10px ui-monospace, SFMono-Regular, monospace";
        context.fillStyle = waypointSpectrumColor(progress, 0.96);
        context.fillText(
          `${index + 1} ${percentLabel.toFixed(0)}% ${timeLabel.toFixed(0)}s ${zoomLabel.toFixed(1)}x`,
          baseScreenX(point.x) + 6,
          baseScreenY(point.y) - 6,
        );
      });
      const currentZoomAmount = (rushContext.zoomScale - 1) / 3;
      context.fillStyle = "rgba(188, 137, 255, 0.9)";
      context.fillRect(
        graph.x +
          (clamp(elapsedSeconds, 0, rushCompletionSeconds) /
            rushCompletionSeconds) *
            graph.width -
          2,
        graph.y + graph.height * (1 - currentZoomAmount) - 2,
        4,
        4,
      );
      zoomNodes.forEach((node, index) => {
        const position = zoomNodeScreenPosition(node);
        context.beginPath();
        context.arc(position.x, position.y, 5, 0, Math.PI * 2);
        context.fillStyle = "rgba(188, 137, 255, 0.92)";
        context.fill();
        context.strokeStyle = "rgba(255, 255, 255, 0.72)";
        context.lineWidth = 1;
        context.stroke();
        context.font = "600 10px ui-monospace, SFMono-Regular, monospace";
        context.fillStyle = "rgba(222, 202, 255, 0.96)";
        context.fillText(
          `Z${index} ${node.time.toFixed(1)}s ${node.zoom.toFixed(2)}x`,
          position.x + 7,
          position.y - 7,
        );
      });
      drawDebugDot(
        { x: rushContext.zoomTargetX, y: rushContext.zoomTargetY },
        5,
        "rgba(255, 105, 105, 0.9)",
        "rgba(255, 255, 255, 0.75)",
      );
      drawDebugDot(
        { x: rushContext.zoomFocusX, y: rushContext.zoomFocusY },
        6,
        "rgba(118, 240, 255, 0.9)",
        "rgba(255, 255, 255, 0.75)",
      );

      context.font = "600 12px ui-monospace, SFMono-Regular, monospace";
      context.fillStyle = "rgba(233, 242, 255, 0.92)";
      context.fillText(
        `t=${elapsedSeconds.toFixed(1)}s  zoom=${rushContext.zoomScale.toFixed(2)}x  path=${rushContext.zoomProgress.toFixed(3)}`,
        curveBox.x + 10,
        curveBox.y + 18,
      );
      context.fillStyle = "rgba(118, 240, 255, 0.9)";
      context.fillText("cyan: foco", curveBox.x + 10, curveBox.y + 36);
      context.fillStyle = "rgba(255, 105, 105, 0.9)";
      context.fillText("red: alvo", curveBox.x + 92, curveBox.y + 36);
      context.fillStyle = "rgba(188, 137, 255, 0.9)";
      context.fillText("purple: zoom nodes", graph.x, graph.y + graph.height + 16);
      context.restore();
    }

    function pointerPosition(event) {
      const bounds = canvas.getBoundingClientRect();
      return {
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
      };
    }

    function hitDebugNode(position) {
      if (!rushContext.enabled || canvas.dataset.hilbertControls !== "on") {
        return null;
      }

      for (let index = focusWaypoints.length - 1; index >= 0; index -= 1) {
        const point = focusWaypoints[index];
        const dx = position.x - baseScreenX(point.x);
        const dy = position.y - baseScreenY(point.y);
        if (Math.hypot(dx, dy) <= 12) {
          return { type: "focus", index };
        }
      }

      for (let index = zoomNodes.length - 1; index >= 0; index -= 1) {
        if (zoomNodes[index].locked) {
          continue;
        }
        const point = zoomNodeScreenPosition(zoomNodes[index]);
        if (Math.hypot(position.x - point.x, position.y - point.y) <= 12) {
          return { type: "zoom", index };
        }
      }

      return null;
    }

    function dragDebugNode(position) {
      if (!debugDrag) {
        return;
      }

      if (debugDrag.type === "focus") {
        focusWaypoints[debugDrag.index].x = clamp(
          (position.x - curveBox.x) / Math.max(1, curveBox.size),
          0,
          1,
        );
        focusWaypoints[debugDrag.index].y = clamp(
          (position.y - curveBox.y) / Math.max(1, curveBox.size),
          0,
          1,
        );
        saveFocusWaypoints();
        return;
      }

      const graph = zoomGraphMetrics();
      const node = zoomNodes[debugDrag.index];
      if (node.locked) {
        return;
      }
      const previousNode = zoomNodes[debugDrag.index - 1];
      const nextNode = zoomNodes[debugDrag.index + 1];
      const minTime = previousNode ? previousNode.time + 0.25 : 0;
      const maxTime = nextNode
        ? nextNode.time - 0.25
        : rushCompletionSeconds;
      node.time = clamp(
        ((position.x - graph.x) / graph.width) * rushCompletionSeconds,
        minTime,
        maxTime,
      );
      node.zoom = clamp(
        1 + (1 - (position.y - graph.y) / graph.height) * 3,
        0.2,
        8,
      );
      saveZoomNodes();
    }

    function handleDebugPointerDown(event) {
      const hit = hitDebugNode(pointerPosition(event));
      if (!hit) {
        return;
      }

      debugDrag = hit;
      canvas.setPointerCapture?.(event.pointerId);
      event.preventDefault();
    }

    function handleDebugPointerMove(event) {
      const position = pointerPosition(event);
      if (!debugDrag) {
        canvas.style.cursor = hitDebugNode(position) ? "grab" : "";
        return;
      }

      canvas.style.cursor = "grabbing";
      dragDebugNode(position);
      event.preventDefault();
    }

    function handleDebugPointerUp(event) {
      if (!debugDrag) {
        return;
      }

      debugDrag = null;
      canvas.releasePointerCapture?.(event.pointerId);
      canvas.style.cursor = "";
      event.preventDefault();
    }

    function handleDebugWheel(event) {
      const hit = hitDebugNode(pointerPosition(event));
      if (!hit || hit.type !== "focus") {
        return;
      }

      const index = hit.index;
      const secondsStep = event.altKey ? 0.1 : event.shiftKey ? 0.25 : 1;
      const progressDelta =
        (Math.sign(event.deltaY) * secondsStep) / rushCompletionSeconds;
      focusWaypointProgress[index] = clamp(
        focusWaypointProgress[index] + progressDelta,
        0,
        1,
      );
      saveFocusWaypoints();
      event.preventDefault();
    }

    function baseScreenX(normalizedX) {
      return curveBox.x + normalizedX * curveBox.size;
    }

    function baseScreenY(normalizedY) {
      return curveBox.y + normalizedY * curveBox.size;
    }

    function updateRushZoomFocus(level, frameMs) {
      if (!rushContext.enabled) {
        rushContext.zoomTargetX = 0.5;
        rushContext.zoomTargetY = 0.5;
        rushContext.zoomFocusX = lerp(rushContext.zoomFocusX, 0.5, 0.08);
        rushContext.zoomFocusY = lerp(rushContext.zoomFocusY, 0.5, 0.08);
        return;
      }

      const focus = rushZoomGuidePoint(rushContext.zoomProgress);
      rushContext.zoomTargetX = focus.x;
      rushContext.zoomTargetY = focus.y;
      const smoothing = 1 - Math.pow(0.08, Math.max(1, frameMs) / 1000);
      rushContext.zoomFocusX = lerp(
        rushContext.zoomFocusX,
        rushContext.zoomTargetX,
        smoothing,
      );
      rushContext.zoomFocusY = lerp(
        rushContext.zoomFocusY,
        rushContext.zoomTargetY,
        smoothing,
      );
    }

    function screenX(normalizedX) {
      if (!rushContext.enabled || rushContext.zoomScale === 1) {
        return baseScreenX(normalizedX);
      }

      return baseScreenX(
        rushContext.zoomFocusX +
          (normalizedX - rushContext.zoomFocusX) * rushContext.zoomScale,
      );
    }

    function screenY(normalizedY) {
      if (!rushContext.enabled || rushContext.zoomScale === 1) {
        return baseScreenY(normalizedY);
      }

      return baseScreenY(
        rushContext.zoomFocusY +
          (normalizedY - rushContext.zoomFocusY) * rushContext.zoomScale,
      );
    }

    function strokeWidthForLevel(level) {
      const t = clamp(Math.max(0, level) / Math.max(1, maxVisualLevel()), 0, 1);
      return lerp(
        Math.max(1.35, curveBox.size / 220),
        Math.max(0.45, curveBox.size / 900),
        t,
      );
    }

    function defaultLineColor(alpha) {
      return `rgba(144, 198, 255, ${alpha})`;
    }

    function morphedLineColor(alpha) {
      return `rgba(190, 158, 255, ${alpha})`;
    }

    function smoothstep(amount) {
      const t = clamp(amount, 0, 1);
      return t * t * (3 - 2 * t);
    }

    function trailTuningForLevel(level) {
      const effectiveLevel = Math.max(0, level);
      const t = clamp(effectiveLevel / Math.max(1, maxVisualLevel()), 0, 1);
      const trailScale = rushContext.trailScale;
      return {
        durationMs:
          (Math.max(0, settings.baseTrailDurationMs) * trailScale) /
          (Math.floor(effectiveLevel) + 1),
        maxFrames: Math.round(
          lerp(settings.maxTrailFrames, settings.minTrailFrames, t) *
            trailScale,
        ),
      };
    }

    function morphProgressKey(fromSegmentCount, toSegmentCount) {
      return `${fromSegmentCount}:${toSegmentCount}`;
    }

    function getMorphProgressValues(fromSegmentCount, toSegmentCount) {
      const key = morphProgressKey(fromSegmentCount, toSegmentCount);
      const cached = morphProgressCache.get(key);
      if (cached) {
        return cached;
      }

      const values = [];
      let fromIndex = 0;
      let toIndex = 0;
      while (fromIndex <= fromSegmentCount || toIndex <= toSegmentCount) {
        const fromProgress =
          fromIndex <= fromSegmentCount
            ? fromIndex / Math.max(1, fromSegmentCount)
            : Infinity;
        const toProgress =
          toIndex <= toSegmentCount
            ? toIndex / Math.max(1, toSegmentCount)
            : Infinity;
        const progress = Math.min(fromProgress, toProgress);
        values.push(progress);

        while (
          fromIndex <= fromSegmentCount &&
          Math.abs(fromIndex / Math.max(1, fromSegmentCount) - progress) <
            0.0000001
        ) {
          fromIndex += 1;
        }
        while (
          toIndex <= toSegmentCount &&
          Math.abs(toIndex / Math.max(1, toSegmentCount) - progress) <
            0.0000001
        ) {
          toIndex += 1;
        }
      }

      const typedValues = new Float32Array(values);
      morphProgressCache.set(key, typedValues);
      return typedValues;
    }

    function drawExactPath(path) {
      if (!path) {
        return;
      }

      const strokeWidth = strokeWidthForLevel(currentLevel);
      context.save();
      context.lineCap = "butt";
      context.lineJoin = "miter";
      context.miterLimit = 2;
      context.lineWidth = Math.max(0.4, strokeWidth * 0.72);
      context.strokeStyle = defaultLineColor(0.82);
      context.stroke(path);
      context.restore();
    }

    function buildDisplayPath(levelData) {
      const path = new Path2D();
      path.moveTo(screenX(levelData.points[0]), screenY(levelData.points[1]));
      for (let index = 1; index < levelData.pointCount; index += 1) {
        const offset = index * 2;
        path.lineTo(
          screenX(levelData.points[offset]),
          screenY(levelData.points[offset + 1]),
        );
      }
      return path;
    }

    function drawExactLevel(levelData) {
      if (rushContext.enabled && rushContext.zoomScale !== 1) {
        drawExactPath(buildDisplayPath(levelData));
        return;
      }

      drawExactPath(levelData.path);
    }

    function drawActiveSegmentColor(segments, strokeWidth) {
      if (!segments.length) {
        return;
      }

      context.save();
      context.lineCap = "butt";
      context.lineJoin = "miter";
      context.miterLimit = 2;
      context.lineWidth = Math.max(0.4, strokeWidth);
      segments.forEach((segment) => {
        const path = new Path2D();
        path.moveTo(segment.x1, segment.y1);
        path.lineTo(segment.x2, segment.y2);
        context.strokeStyle = segment.color;
        context.stroke(path);
      });
      context.restore();
    }

    function drawPartialPath(levelData, progress) {
      if (!levelData) {
        return;
      }

      const visibleProgress = clamp(progress, 0, 1);
      const visibleDistance = visibleProgress * levelData.segmentCount;
      const visibleSegments = Math.floor(visibleDistance);
      const partialPath = new Path2D();
      partialPath.moveTo(
        screenX(levelData.points[0]),
        screenY(levelData.points[1]),
      );

      for (
        let index = 1;
        index <= Math.min(levelData.segmentCount, visibleSegments);
        index += 1
      ) {
        const offset = index * 2;
        partialPath.lineTo(
          screenX(levelData.points[offset]),
          screenY(levelData.points[offset + 1]),
        );
      }

      if (visibleProgress < 1 && visibleSegments < levelData.segmentCount) {
        const point = pointOnPolyline(
          levelData.points,
          levelData.segmentCount,
          visibleProgress,
        );
        partialPath.lineTo(screenX(point.x), screenY(point.y));
      }

      context.save();
      context.lineCap = "butt";
      context.lineJoin = "miter";
      context.miterLimit = 2;
      context.lineWidth = Math.max(0.4, strokeWidthForLevel(currentLevel) * 0.72);
      context.strokeStyle = defaultLineColor(0.82);
      context.stroke(partialPath);
      context.restore();
    }

    function drawTrail(timestamp) {
      if (rushContext.trailScale <= 0) {
        trailFrames.length = 0;
        return;
      }

      while (
        trailFrames.length > 0 &&
        timestamp - trailFrames[0].timestamp >
          trailTuningForLevel(trailFrames[0].level).durationMs
      ) {
        trailFrames.shift();
      }

      context.save();
      context.lineCap = "butt";
      context.lineJoin = "miter";
      context.miterLimit = 2;
      trailFrames.forEach((frame) => {
        const age = timestamp - frame.timestamp;
        const tuning = trailTuningForLevel(frame.level);
        if (tuning.durationMs <= 0) {
          return;
        }
        const life = clamp(1 - age / tuning.durationMs, 0, 1);
        if (life <= 0) {
          return;
        }

        context.lineWidth = frame.strokeWidth;
        context.strokeStyle = defaultLineColor(0.32 * life * life);
        context.stroke(frame.path);
      });
      context.restore();
    }

    function drawMorph(fromData, toData, progress, timestamp, waveDirection) {
      const progressValues = getMorphProgressValues(
        fromData.segmentCount,
        toData.segmentCount,
      );
      const transitionBand = Math.max(
        0.002,
        settings.transitionBand * rushContext.transitionBandScale,
      );
      const waveHead =
        waveDirection > 0
          ? progress * (1 + transitionBand)
          : 1 + transitionBand - progress * (1 + transitionBand);
      const morphLevel = currentLevel + direction * progress;
      const strokeWidth = lerp(
        Math.max(1.35, curveBox.size / 220),
        Math.max(0.45, curveBox.size / 900),
        clamp(morphLevel / Math.max(1, maxVisualLevel()), 0, 1),
      );

      context.save();
      const morphPath = new Path2D();
      const transformedPath = new Path2D();
      const activeSegments = [];
      const colorBlendStart = 0.75;
      context.lineCap = "butt";
      context.lineJoin = "miter";
      context.miterLimit = 2;
      const currentStrokeWidth = Math.max(0.4, strokeWidth * 0.72);
      context.lineWidth = currentStrokeWidth;
      let previousX = 0;
      let previousY = 0;
      let hasPreviousPoint = false;
      let transformedHasPreviousPoint = false;
      let transformedPreviousX = 0;
      let transformedPreviousY = 0;

      for (let index = 0; index < progressValues.length; index += 1) {
        const pathProgress = progressValues[index];
        const waveDistance =
          waveDirection > 0
            ? waveHead - pathProgress
            : pathProgress - waveHead + transitionBand;
        const waveAmount = clamp(waveDistance / transitionBand, 0, 1);
        const localProgress = overshootReturn(waveAmount);
        const fromPoint = pointOnPolyline(
          fromData.points,
          fromData.segmentCount,
          pathProgress,
        );
        const toPoint = pointOnPolyline(
          toData.points,
          toData.segmentCount,
          pathProgress,
        );
        const x = screenX(lerp(fromPoint.x, toPoint.x, localProgress));
        const y = screenY(lerp(fromPoint.y, toPoint.y, localProgress));

        if (index === 0) {
          morphPath.moveTo(x, y);
        } else {
          morphPath.lineTo(x, y);
        }

        if (index > 0 && hasPreviousPoint && waveAmount >= 1) {
          if (!transformedHasPreviousPoint) {
            transformedPath.moveTo(previousX, previousY);
            transformedHasPreviousPoint = true;
          } else if (
            Math.abs(previousX - transformedPreviousX) > 0.01 ||
            Math.abs(previousY - transformedPreviousY) > 0.01
          ) {
            transformedPath.moveTo(previousX, previousY);
          }
          transformedPath.lineTo(x, y);
          transformedPreviousX = x;
          transformedPreviousY = y;
        } else if (index > 0 && hasPreviousPoint) {
          const morphColorAmount = smoothstep(
            (waveAmount - colorBlendStart) / (1 - colorBlendStart),
          );
          const colorAlpha = 0.82 * morphColorAmount;
          if (colorAlpha > 0.001) {
            activeSegments.push({
              x1: previousX,
              y1: previousY,
              x2: x,
              y2: y,
              alpha: colorAlpha,
              color: morphedLineColor(colorAlpha),
            });
          }
        }

        previousX = x;
        previousY = y;
        hasPreviousPoint = true;
      }

      drawTrail(timestamp);
      context.strokeStyle = "rgba(144, 198, 255, 0.82)";
      context.stroke(morphPath);
      context.strokeStyle = morphedLineColor(0.82);
      context.stroke(transformedPath);
      drawActiveSegmentColor(activeSegments, currentStrokeWidth);
      context.restore();
      trailFrames.push({
        path: morphPath,
        level: morphLevel,
        strokeWidth: currentStrokeWidth,
        timestamp,
      });
      const trailTuning = trailTuningForLevel(morphLevel);
      if (trailTuning.maxFrames <= 0) {
        trailFrames.length = 0;
      } else if (trailFrames.length > trailTuning.maxFrames) {
        trailFrames.splice(0, trailFrames.length - trailTuning.maxFrames);
      }
    }

    function currentRushStep(elapsedSeconds) {
      return (
        rushTimeline.find(
          (step) =>
            elapsedSeconds >= step.start && elapsedSeconds < step.end,
        ) || rushTimeline[rushTimeline.length - 1]
      );
    }

    function rushCurrentLevel(elapsedSeconds) {
      const step = currentRushStep(elapsedSeconds);
      return step.type === "morph" ? step.to : step.level;
    }

    function levelScaleForRush(level) {
      if (level < 0) {
        return 0;
      }

      return Math.pow(0.5, level);
    }

    function easeSlowZoom(amount) {
      const eased = easeInOut(clamp(amount, 0, 1));
      return eased * eased;
    }

    function zoomScaleForGuideProgress(progress) {
      const clampedProgress = clamp(progress, 0, 1);
      const sortedNodes = [...zoomNodes].sort((a, b) => a.progress - b.progress);
      if (clampedProgress <= sortedNodes[0].progress) {
        return sortedNodes[0].zoom;
      }

      for (let index = 0; index < sortedNodes.length - 1; index += 1) {
        const start = sortedNodes[index];
        const end = sortedNodes[index + 1];
        if (clampedProgress <= end.progress) {
          return lerp(
            start.zoom,
            end.zoom,
            easeInOut(
              (clampedProgress - start.progress) /
                Math.max(0.0001, end.progress - start.progress),
            ),
          );
        }

      }

      return sortedNodes[sortedNodes.length - 1].zoom;
    }

    function guideTimestampForProgress(progress) {
      const clampedProgress = clamp(progress, 0, 1);
      const sortedNodes = [...zoomNodes].sort((a, b) => a.progress - b.progress);
      if (clampedProgress <= sortedNodes[0].progress) {
        return sortedNodes[0].time;
      }

      for (let index = 0; index < sortedNodes.length - 1; index += 1) {
        const start = sortedNodes[index];
        const end = sortedNodes[index + 1];
        if (clampedProgress <= end.progress) {
          return lerp(
            start.time,
            end.time,
            (clampedProgress - start.progress) /
              Math.max(0.0001, end.progress - start.progress),
          );
        }
      }

      return sortedNodes[sortedNodes.length - 1].time;
    }

    function zoomStateForElapsed(elapsedSeconds) {
      const sortedNodes = [...zoomNodes].sort((a, b) => a.time - b.time);
      if (elapsedSeconds <= sortedNodes[0].time) {
        return {
          progress: sortedNodes[0].progress,
          zoom: sortedNodes[0].zoom,
        };
      }

      for (let index = 0; index < sortedNodes.length - 1; index += 1) {
        const start = sortedNodes[index];
        const end = sortedNodes[index + 1];
        if (elapsedSeconds <= end.time) {
          const amount = easeInOut(
            (elapsedSeconds - start.time) /
              Math.max(0.0001, end.time - start.time),
          );
          return {
            progress: lerp(start.progress, end.progress, amount),
            zoom: lerp(start.zoom, end.zoom, amount),
          };
        }
      }

      return {
        progress: sortedNodes[sortedNodes.length - 1].progress,
        zoom: sortedNodes[sortedNodes.length - 1].zoom,
      };
    }

    function updateRushContext(elapsedSeconds) {
      const level = rushCurrentLevel(elapsedSeconds);
      rushContext.overshootScale = elapsedSeconds >= 54 ? 0 : 1;
      rushContext.trailScale = level >= 5 ? 0 : levelScaleForRush(level);

      if (level >= 6) {
        rushContext.transitionBandScale = 0;
      } else {
        rushContext.transitionBandScale = levelScaleForRush(level);
      }

      const zoomState = zoomStateForElapsed(elapsedSeconds);
      rushContext.zoomProgress = zoomState.progress;
      rushContext.zoomScale = zoomState.zoom;
    }

    function buildRushLevels(step, deadline) {
      if (step.type === "none") {
        return;
      }

      const requiredLevels =
        step.type === "morph" ? [step.from, step.to] : [step.level || 0];
      const levels = [...requiredLevels];
      for (let level = -1; level <= rushMaxLevel; level += 1) {
        if (!levels.includes(level)) {
          levels.push(level);
        }
      }

      for (let index = 0; index < levels.length; index += 1) {
        const level = levels[index];
        ensureLevel(level);
        buildLevelSlice(level, deadline);
        if (performance.now() >= deadline) {
          break;
        }
      }
    }

    function renderRush(timestamp, budgetDeadline, frameMs) {
      const elapsedSeconds = (timestamp - rushContext.startedAt) / 1000;
      const step = currentRushStep(elapsedSeconds);
      updateRushContext(elapsedSeconds);
      if (
        elapsedSeconds >= rushCompletionSeconds &&
        !rushContext.audioStoppedAtEnd
      ) {
        stopRushAudio();
        rushContext.audioStoppedAtEnd = true;
      }
      buildRushLevels(step, budgetDeadline);

      if (step.type === "none") {
        currentLevel = -1;
        direction = 1;
        trailFrames.length = 0;
        drawRushZoomDebug(elapsedSeconds);
        return null;
      }

      if (step.type === "draw") {
        currentLevel = step.level;
        direction = 1;
        const levelData = getLevel(step.level);
        updateRushZoomFocus(step.level, frameMs);
        if (levelData) {
          if (step.level >= 0) {
            drawTrail(timestamp);
          } else {
            trailFrames.length = 0;
          }
          const drawProgress =
            (elapsedSeconds - step.start) / Math.max(0.001, step.end - step.start);
          drawPartialPath(
            levelData,
            drawProgress,
          );
        }
        drawRushZoomDebug(elapsedSeconds);
        return levelData;
      }

      if (step.type === "morph") {
        currentLevel = step.from;
        direction = step.to >= step.from ? 1 : -1;
        const fromData = getLevel(step.from);
        const toData = getLevel(step.to);
        updateRushZoomFocus(step.from, frameMs);
        const progress = clamp(
          (elapsedSeconds - step.start) / Math.max(0.001, step.end - step.start),
          0,
          1,
        );
        if (fromData && toData) {
          drawMorph(fromData, toData, progress, timestamp, direction);
          drawRushZoomDebug(elapsedSeconds);
          return progress >= 1 ? toData : fromData;
        }
        if (fromData) {
          drawTrail(timestamp);
          drawExactLevel(fromData);
        } else if (toData) {
          drawTrail(timestamp);
          drawExactLevel(toData);
        }
        drawRushZoomDebug(elapsedSeconds);
        return fromData || toData || null;
      }

      currentLevel = step.level;
      direction = 1;
      const levelData = getLevel(step.level);
      updateRushZoomFocus(step.level, frameMs);
      if (levelData) {
        drawTrail(timestamp);
        drawExactLevel(levelData);
      }
      drawRushZoomDebug(elapsedSeconds);
      return levelData;
    }

    function pumpBuildWork(deadline) {
      ensureLevel(currentLevel);
      buildLevelSlice(currentLevel, deadline);

      if (performance.now() >= deadline) {
        return;
      }

      const nextLevel = currentLevel + direction;
      if (nextLevel >= 0 && nextLevel <= maxVisualLevel()) {
        ensureLevel(nextLevel);
        buildLevelSlice(nextLevel, deadline);
      }

    }

    function render(timestamp) {
      if (!lastTimestamp) {
        lastTimestamp = timestamp;
      }
      const frameMs = timestamp - lastTimestamp;
      lastTimestamp = timestamp;

      const safeMaxFps = Math.max(1, Math.abs(settings.maxFps));
      const budgetDeadline = performance.now() + 1000 / safeMaxFps;
      if (!rushContext.enabled) {
        pumpBuildWork(budgetDeadline);
      }

      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      drawBackground(width, height);

      if (rushContext.enabled) {
        const rushData = renderRush(timestamp, budgetDeadline, frameMs);
        if (!rushData) {
          context.fillStyle = "rgba(180, 214, 255, 0.18)";
          context.font = "600 12px ui-monospace, SFMono-Regular, monospace";
          context.fillText("building hilbert...", curveBox.x, curveBox.y - 12);
        }
        canvas.dataset.hilbertLevel = String(currentLevel);
        canvas.dataset.hilbertSegments = String(rushData?.segmentCount || 0);
        canvas.dataset.hilbertPhase = "rush";
        rafId = window.requestAnimationFrame(render);
        return;
      }

      const currentData = getLevel(currentLevel);
      if (!currentData) {
        context.fillStyle = "rgba(180, 214, 255, 0.18)";
        context.font = "600 12px ui-monospace, SFMono-Regular, monospace";
        context.fillText("building hilbert...", curveBox.x, curveBox.y - 12);
        rafId = window.requestAnimationFrame(render);
        return;
      }

      if (prefersReducedMotion) {
        drawExactPath(currentData.path);
      } else if (phase === "build") {
        drawExactPath(currentData.path);
        if (currentData && performance.now() < budgetDeadline) {
          phase = "hold";
          phaseStartedAt = timestamp;
        }
      } else if (phase === "hold") {
        drawTrail(timestamp);
        drawExactPath(currentData.path);
        if (timestamp - phaseStartedAt >= settings.holdDurationMs) {
          if (currentLevel >= maxVisualLevel()) {
            direction = -1;
          } else if (currentLevel <= 0) {
            direction = 1;
          }
          phase = "morph";
          phaseStartedAt = timestamp;
          morphProgress = 0;
          trailFrames.length = 0;
        }
      } else if (phase === "morph") {
        const nextLevel = currentLevel + direction;
        const nextData = getLevel(nextLevel);
        morphProgress = clamp(
          (timestamp - phaseStartedAt) /
            Math.max(1, Math.abs(settings.baseMorphDurationMs)),
          0,
          1,
        );

        if (nextData) {
          drawMorph(
            currentData,
            nextData,
            morphProgress,
            timestamp,
            direction,
          );
          if (morphProgress >= 1) {
            currentLevel = nextLevel;
            phase = "hold";
            phaseStartedAt = timestamp;
            morphProgress = 0;
          }
        } else {
          drawExactPath(currentData.path);
        }
      } else {
        drawExactPath(currentData.path);
      }

      canvas.dataset.hilbertLevel = String(currentLevel);
      canvas.dataset.hilbertSegments = String(currentData.segmentCount);
      canvas.dataset.hilbertPhase = phase;

      rafId = window.requestAnimationFrame(render);
    }

    resizeCanvas();
    controlsElement = createControls();
    window.addEventListener("resize", resizeCanvas);
    window.addEventListener("pointerdown", resumeRushAudioAfterGesture, true);
    window.addEventListener("click", resumeRushAudioAfterGesture, true);
    window.addEventListener("keydown", resumeRushAudioAfterGesture, true);
    window.addEventListener("touchstart", resumeRushAudioAfterGesture, true);
    canvas.addEventListener("pointerdown", handleDebugPointerDown);
    canvas.addEventListener("pointermove", handleDebugPointerMove);
    canvas.addEventListener("pointerup", handleDebugPointerUp);
    canvas.addEventListener("pointercancel", handleDebugPointerUp);
    canvas.addEventListener("wheel", handleDebugWheel, { passive: false });
    if (canvas.dataset.hilbertControls === "on") {
      canvas.style.touchAction = "none";
    }
    if (rushContext.enabled) {
      resetRushState();
    } else {
      ensureLevel(currentLevel);
      if (currentLevel < maxVisualLevel()) {
        ensureLevel(currentLevel + 1);
      }
    }
    rafId = window.requestAnimationFrame(render);

    return {
      resize: resizeCanvas,
      destroy() {
        window.cancelAnimationFrame(rafId);
        window.removeEventListener("resize", resizeCanvas);
        window.removeEventListener("pointerdown", resumeRushAudioAfterGesture, true);
        window.removeEventListener("click", resumeRushAudioAfterGesture, true);
        window.removeEventListener("keydown", resumeRushAudioAfterGesture, true);
        window.removeEventListener("touchstart", resumeRushAudioAfterGesture, true);
        canvas.removeEventListener("pointerdown", handleDebugPointerDown);
        canvas.removeEventListener("pointermove", handleDebugPointerMove);
        canvas.removeEventListener("pointerup", handleDebugPointerUp);
        canvas.removeEventListener("pointercancel", handleDebugPointerUp);
        canvas.removeEventListener("wheel", handleDebugWheel);
        stopRushAudio();
        controlsElement?.remove();
      },
    };
  }

  BackgroundEffects.mountHilbertCurve = mountHilbertCurve;
})();
