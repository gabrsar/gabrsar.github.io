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
    // In this animation vocabulary, level 0 already has the classic
    // three-segment Hilbert seed. Stopping at visual level 7 corresponds
    // to Hilbert order 8 in the usual mathematical naming.
    const targetOrder = 8;
    const visualLevelCount = 8;
    const maxVisualLevel = visualLevelCount - 1;
    const settingsPrefix = "hilbertCurve.";
    const parameterDefinitions = [
      {
        key: "curveScale",
        label: "Tamanho",
        min: 0.35,
        max: 1,
        step: 0.01,
        defaultValue: 0.9,
        description: "Escala do quadrado da Hilbert dentro da viewport.",
        suffix: "x",
      },
      {
        key: "maxFps",
        label: "FPS budget",
        min: 15,
        max: 120,
        step: 1,
        defaultValue: 60,
        description: "Budget usado para dividir trabalho pesado por frame.",
      },
      {
        key: "holdDurationMs",
        label: "Pausa",
        min: 0,
        max: 5000,
        step: 50,
        defaultValue: 1400,
        description: "Tempo parado entre uma evolucao de nivel e outra.",
        suffix: "ms",
      },
      {
        key: "baseMorphDurationMs",
        label: "Morph base",
        min: 300,
        max: 8000,
        step: 100,
        defaultValue: 3300,
        description: "Duracao inicial do morph; cada nivel dobra esse tempo.",
        suffix: "ms",
      },
      {
        key: "baseTrailDurationMs",
        label: "Trail base",
        min: 0,
        max: 5000,
        step: 50,
        defaultValue: 1200,
        description: "Tempo base do rastro, dividido pelo nivel atual.",
        suffix: "ms",
      },
      {
        key: "minTrailFrames",
        label: "Trail alto",
        min: 0,
        max: 80,
        step: 1,
        defaultValue: 14,
        description: "Maximo de frames antigos guardados nos niveis altos.",
      },
      {
        key: "maxTrailFrames",
        label: "Trail baixo",
        min: 0,
        max: 160,
        step: 1,
        defaultValue: 84,
        description: "Maximo de frames antigos guardados nos niveis baixos.",
      },
      {
        key: "transitionBand",
        label: "Faixa",
        min: 0.02,
        max: 0.4,
        step: 0.01,
        defaultValue: 0.08,
        description: "Largura da frente que transforma a curva aos poucos.",
      },
      {
        key: "overshootAmplitude",
        label: "Overshoot",
        min: 0,
        max: 0.2,
        step: 0.005,
        defaultValue: 0.075,
        description: "Forca da passada alem do alvo antes de retornar.",
      },
      {
        key: "overshootFrequency",
        label: "Oscilacao",
        min: 0.5,
        max: 5,
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
    let currentLevel = prefersReducedMotion ? maxVisualLevel : 0;
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
      return Number.isFinite(parsedValue)
        ? clamp(parsedValue, definition.min, definition.max)
        : definition.defaultValue;
    }

    function formatSettingValue(definition, value) {
      const precision = definition.step < 1 ? 3 : 0;
      const formatted = Number(value).toFixed(precision).replace(/\.?0+$/, "");
      return `${formatted}${definition.suffix || ""}`;
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
          left: 16px;
          z-index: 20;
          display: grid;
          gap: 10px;
          width: min(310px, calc(100vw - 32px));
          max-height: calc(100vh - 32px);
          overflow: auto;
          border: 1px solid rgba(124, 172, 255, 0.2);
          border-radius: 8px;
          padding: 12px;
          background: rgba(5, 10, 18, 0.72);
          color: rgba(233, 242, 255, 0.94);
          font: 12px/1.25 ui-sans-serif, system-ui, sans-serif;
          backdrop-filter: blur(12px);
        }

        .hilbert-control {
          display: grid;
          gap: 5px;
        }

        .hilbert-control-description {
          display: none;
          margin: -1px 0 1px;
          color: rgba(199, 220, 255, 0.68);
        }

        .hilbert-control:hover .hilbert-control-description,
        .hilbert-control:focus-within .hilbert-control-description {
          display: block;
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
      `;
      document.head.append(style);
    }

    function createControls() {
      if (canvas.dataset.hilbertControls !== "on") {
        return null;
      }

      ensureControlsStyles();
      const controls = document.createElement("div");
      controls.className = "hilbert-controls";

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

        const input = document.createElement("input");
        input.type = "range";
        input.min = String(definition.min);
        input.max = String(definition.max);
        input.step = String(definition.step);
        input.value = String(settings[definition.key]);
        input.title = definition.description;

        const description = document.createElement("span");
        description.className = "hilbert-control-description";
        description.textContent = definition.description;

        input.addEventListener("input", () => {
          const value = Number(input.value);
          settings[definition.key] = value;
          window.localStorage.setItem(settingsPrefix + definition.key, value);
          valueText.textContent = formatSettingValue(definition, value);

          if (definition.key === "curveScale") {
            resizeCanvas();
          }
        });

        labelLine.append(labelText, valueText);
        row.title = definition.description;
        row.append(labelLine, description, input);
        controls.append(row);
      });

      document.body.append(controls);
      return controls;
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
      const order = level + 1;
      const levelGridSize = 1 << order;
      const levelGridDivisor = Math.max(1, levelGridSize - 1);
      while (builder.cursor < pointCount && performance.now() < deadline) {
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
      path.moveTo(screenX(points[0]), screenY(points[1]));
      for (let index = 1; index < pointCount; index += 1) {
        const offset = index * 2;
        path.lineTo(screenX(points[offset]), screenY(points[offset + 1]));
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

      const size = Math.min(bounds.width, bounds.height) * settings.curveScale;
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

    function screenX(normalizedX) {
      return curveBox.x + normalizedX * curveBox.size;
    }

    function screenY(normalizedY) {
      return curveBox.y + normalizedY * curveBox.size;
    }

    function drawTip(x, y, timestamp) {
      const pulse = 0.6 + 0.4 * Math.sin(timestamp * 0.0011);
      const glowRadius = curveBox.size * 0.015;
      const tipGlow = context.createRadialGradient(
        x,
        y,
        0,
        x,
        y,
        glowRadius * 2.8,
      );
      tipGlow.addColorStop(0, `rgba(255, 255, 255, ${0.92 * pulse})`);
      tipGlow.addColorStop(0.34, `rgba(109, 190, 255, ${0.5 * pulse})`);
      tipGlow.addColorStop(1, "rgba(109, 190, 255, 0)");
      context.fillStyle = tipGlow;
      context.beginPath();
      context.arc(x, y, glowRadius * 2.8, 0, Math.PI * 2);
      context.fill();

      context.fillStyle = "rgba(255, 255, 255, 0.95)";
      context.beginPath();
      context.arc(x, y, glowRadius * 0.8, 0, Math.PI * 2);
      context.fill();
    }

    function strokeWidthForLevel(level) {
      const t = clamp(level / Math.max(1, maxVisualLevel), 0, 1);
      return lerp(
        Math.max(1.35, curveBox.size / 220),
        Math.max(0.45, curveBox.size / 900),
        t,
      );
    }

    function morphDurationForLevel(fromLevel, toLevel) {
      return (
        settings.baseMorphDurationMs * Math.pow(2, Math.min(fromLevel, toLevel))
      );
    }

    function trailTuningForLevel(level) {
      const t = clamp(level / Math.max(1, maxVisualLevel), 0, 1);
      return {
        durationMs: settings.baseTrailDurationMs / (Math.floor(level) + 1),
        maxFrames: Math.round(
          lerp(settings.maxTrailFrames, settings.minTrailFrames, t),
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
      context.lineCap = "round";
      context.lineJoin = "round";
      context.lineWidth = strokeWidth;
      context.shadowBlur =
        curveBox.size * 0.04 * (1 - currentLevel / (maxVisualLevel + 1));
      context.shadowColor = "rgba(77, 161, 255, 0.28)";
      context.strokeStyle = "rgba(144, 198, 255, 0.82)";
      context.stroke(path);
      context.shadowBlur = 0;
      context.lineWidth = Math.max(0.35, strokeWidth * 0.62);
      context.strokeStyle = "rgba(255, 255, 255, 0.18)";
      context.stroke(path);
      context.restore();
    }

    function drawTrail(timestamp) {
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
        const life = clamp(1 - age / tuning.durationMs, 0, 1);
        if (life <= 0) {
          return;
        }

        context.lineWidth = frame.strokeWidth;
        context.strokeStyle = `rgba(144, 198, 255, ${0.32 * life * life})`;
        context.stroke(frame.path);
      });
      context.restore();
    }

    function drawMorph(fromData, toData, progress, timestamp, waveDirection) {
      const progressValues = getMorphProgressValues(
        fromData.segmentCount,
        toData.segmentCount,
      );
      const transitionBand = settings.transitionBand;
      const waveHead =
        waveDirection > 0
          ? progress * (1 + transitionBand)
          : 1 + transitionBand - progress * (1 + transitionBand);
      const morphLevel = currentLevel + direction * progress;
      const strokeWidth = lerp(
        Math.max(1.35, curveBox.size / 220),
        Math.max(0.45, curveBox.size / 900),
        clamp(morphLevel / Math.max(1, maxVisualLevel), 0, 1),
      );

      context.save();
      const morphPath = new Path2D();
      context.lineCap = "butt";
      context.lineJoin = "miter";
      context.miterLimit = 2;
      const currentStrokeWidth = Math.max(0.4, strokeWidth * 0.72);
      context.lineWidth = currentStrokeWidth;

      let tipX = 0;
      let tipY = 0;
      for (let index = 0; index < progressValues.length; index += 1) {
        const pathProgress = progressValues[index];
        const waveDistance =
          waveDirection > 0
            ? waveHead - pathProgress
            : pathProgress - waveHead + transitionBand;
        const localProgress = overshootReturn(
          clamp(waveDistance / transitionBand, 0, 1),
        );
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

        tipX = x;
        tipY = y;
      }

      drawTrail(timestamp);
      context.strokeStyle = "rgba(144, 198, 255, 0.82)";
      context.stroke(morphPath);
      context.restore();
      trailFrames.push({
        path: morphPath,
        level: morphLevel,
        strokeWidth: currentStrokeWidth,
        timestamp,
      });
      const trailTuning = trailTuningForLevel(morphLevel);
      if (trailFrames.length > trailTuning.maxFrames) {
        trailFrames.splice(0, trailFrames.length - trailTuning.maxFrames);
      }
      drawTip(tipX, tipY, timestamp);
    }

    function pumpBuildWork(deadline) {
      ensureLevel(currentLevel);
      buildLevelSlice(currentLevel, deadline);

      if (performance.now() >= deadline) {
        return;
      }

      const nextLevel = currentLevel + direction;
      if (nextLevel >= 0 && nextLevel <= maxVisualLevel) {
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

      const budgetDeadline = performance.now() + 1000 / settings.maxFps;
      pumpBuildWork(budgetDeadline);

      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      drawBackground(width, height);

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
        drawExactPath(currentData.path);
        if (timestamp - phaseStartedAt >= settings.holdDurationMs) {
          if (currentLevel >= maxVisualLevel) {
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
        const morphDurationMs = morphDurationForLevel(currentLevel, nextLevel);
        morphProgress = clamp(
          (timestamp - phaseStartedAt) / morphDurationMs,
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
            trailFrames.length = 0;
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
    ensureLevel(currentLevel);
    if (currentLevel < maxVisualLevel) {
      ensureLevel(currentLevel + 1);
    }
    window.addEventListener("resize", resizeCanvas);
    rafId = window.requestAnimationFrame(render);

    return {
      resize: resizeCanvas,
      destroy() {
        window.cancelAnimationFrame(rafId);
        window.removeEventListener("resize", resizeCanvas);
        controlsElement?.remove();
      },
    };
  }

  BackgroundEffects.mountHilbertCurve = mountHilbertCurve;
})();
