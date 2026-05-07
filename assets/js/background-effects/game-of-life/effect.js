// Conway Game of Life background effect for the home hero.
//
// Public API:
//   window.BackgroundEffects.mountGameOfLife(canvas)
//
// Controls:
//   click: toggle the cell under the cursor
//   drag: pan the grid
//   arrow keys: pan the grid
//   + / -: zoom in/out
//   Space: pause/resume simulation
//   , / .: decrease/increase target ticks per second
//   Enter: reset target ticks per second
//   letter keys: spawn known Life patterns at the cursor
(function () {
  const BackgroundEffects =
    window.BackgroundEffects || (window.BackgroundEffects = {});

  function mountGameOfLife(canvas) {
    if (!canvas) {
      return null;
    }

    const context = canvas.getContext("2d");
    const toolbar = document.querySelector("#life-toolbar");
    const toolbarToggle = document.querySelector("#life-toolbar-toggle");
    const tpsMeterLabel = document.querySelector("#life-tps-meter-label");
    const tpsMeterFill = document.querySelector("#life-tps-meter-fill");
    const liveCells = new Set();
    const bornCells = new Map();
    const fadedCells = new Map();
    const cellIntensities = new Map();
    const floatingLetters = [];
    const clickBursts = [];
    const pointer = {
      x: 0,
      y: 0,
      active: false,
    };
    const view = {
      cellSize: 18,
      offsetX: 0,
      offsetY: 0,
    };
    const drag = {
      active: false,
      moved: false,
      startX: 0,
      startY: 0,
      offsetX: 0,
      offsetY: 0,
    };

    let frameHandle = 0;
    let lastStepAt = performance.now();
    let lastFrameAt = performance.now();
    let running = true;
    let toolbarFlashUntil = performance.now() + 4200;
    let currentTicksPerSecond = 2;
    let targetTicksPerSecond = 3;
    let generation = 0;
    let activeHint = null;
    let nextHintAt = performance.now() + 1400;

    const defaultTicksPerSecond = 3;
    const resumeTicksPerSecond = 2;
    const tpsRampPerSecond = 2;
    const minTicksPerSecond = 1;
    const maxTicksPerSecond = 60;
    const minCellSize = 7;
    const maxCellSize = 46;
    const fadeMs = 360;
    const hintPromptMs = 3000;
    const touchFirstInput = window.matchMedia(
      "(hover: none), (pointer: coarse)",
    ).matches;
    const greenRamp = [
      { r: 14, g: 68, b: 41 },
      { r: 0, g: 109, b: 50 },
      { r: 38, g: 166, b: 65 },
      { r: 57, g: 211, b: 83 },
      { r: 126, g: 231, b: 135 },
    ];

    function patternFromRows(rows) {
      const cells = [];
      rows.forEach((row, y) => {
        [...row].forEach((char, x) => {
          if (char !== "." && char !== " ") {
            cells.push([x, y]);
          }
        });
      });
      return cells;
    }

    function liveIntensity() {
      return 10 + Math.floor(Math.random() * 6);
    }

    function colorForIntensity(intensity, alpha = 1) {
      const normalized = Math.max(0, Math.min(1, intensity / 15));
      const scaled = normalized * (greenRamp.length - 1);
      const low = Math.floor(scaled);
      const high = Math.min(greenRamp.length - 1, low + 1);
      const mix = scaled - low;
      const start = greenRamp[low];
      const end = greenRamp[high];
      const red = Math.round(start.r + (end.r - start.r) * mix);
      const green = Math.round(start.g + (end.g - start.g) * mix);
      const blue = Math.round(start.b + (end.b - start.b) * mix);

      return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
    }

    const patterns = {
      a: patternFromRows([".OO.....", "OO......", "..O.....", "..OOO..."]), // acorn
      b: patternFromRows(["OOO"]), // blinker
      c: patternFromRows([".OO", "OO.", ".O."]), // clock
      d: patternFromRows([".O.", "O.O", ".O."]), // diamond
      e: patternFromRows(["OO", "OO"]), // block
      f: patternFromRows([".O.", "..O", "OOO"]), // flyer / glider
      g: patternFromRows([".O.", "..O", "OOO"]), // glider
      h: patternFromRows(["OO.OO", "OO.OO"]), // house-ish still life
      i: patternFromRows(["OO.", "O.O", ".OO"]), // integral sign
      j: patternFromRows([".OOO", "O..O", "...O"]), // lightweight spark
      k: patternFromRows(["OO.OO", ".O.O.", "OO.OO"]), // kiss
      l: patternFromRows(["O..", "O..", "OOO"]), // L
      m: patternFromRows(["OOO...OOO", "O.O...O.O", "OOO...OOO"]), // twin blocks
      n: patternFromRows(["OO..", "O.O.", "..O.", "..OO"]), // long snake
      o: patternFromRows([".OO.", "O..O", "O..O", ".OO."]), // ring
      p: patternFromRows([
        "..OOO...OOO..",
        ".............",
        "O....O.O....O",
        "O....O.O....O",
        "O....O.O....O",
        "..OOO...OOO..",
        ".............",
        "..OOO...OOO..",
        "O....O.O....O",
        "O....O.O....O",
        "O....O.O....O",
        ".............",
        "..OOO...OOO..",
      ]), // pulsar
      q: patternFromRows([".OO.", "O..O", "O.O.", ".OOO"]), // quasi-loop
      r: patternFromRows([".OO", "OO.", ".O."]), // R-pentomino
      s: patternFromRows([".OO", "OO.", ".OO"]), // snake
      t: patternFromRows([".OOO", "OOO."]), // toad
      u: patternFromRows(["O.O", "O.O", "OOO"]), // U
      v: patternFromRows(["O...O", ".O.O.", "..O.."]), // V
      w: patternFromRows(["O...O", "O.O.O", ".O.O."]), // W
      x: patternFromRows(["O.O", ".O.", "O.O"]), // cross
      y: patternFromRows(["O...O", ".O.O.", "..O..", "..O.."]), // Y
      z: patternFromRows(["OOO", "..O", ".O.", "OOO"]), // Z
    };

    const patternNames = {
      a: "Acorn",
      b: "Blinker",
      c: "Clock",
      d: "Diamond",
      e: "Block",
      f: "Flyer",
      g: "Glider",
      h: "House",
      i: "Integral",
      j: "Lightweight spark",
      k: "Kiss",
      l: "L",
      m: "Twin blocks",
      n: "Long snake",
      o: "Ring",
      p: "Pulsar",
      q: "Quasi-loop",
      r: "R-pentomino",
      s: "Snake",
      t: "Toad",
      u: "U",
      v: "V",
      w: "W",
      x: "Cross",
      y: "Y",
      z: "Z",
    };
    function t(key, replacements) {
      return window.SiteI18n?.t?.(key, replacements) || key;
    }

    const hintTemplates = [
      {
        label: () => t("life.hint.space"),
        action: "space",
        resultLabel: () => t("life.result.space"),
      },
      ...Object.keys(patternNames).map((key) => ({
        label: key.toUpperCase(),
        action: `key:${key}`,
        resultLabel: patternNames[key],
      })),
    ];

    function keyForCell(x, y) {
      return `${x},${y}`;
    }

    function parseCell(key) {
      const [x, y] = key.split(",").map(Number);
      return { x, y };
    }

    function roundedRect(x, y, width, height, radius) {
      const safeRadius = Math.min(radius, width * 0.5, height * 0.5);
      context.beginPath();
      context.moveTo(x + safeRadius, y);
      context.lineTo(x + width - safeRadius, y);
      context.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
      context.lineTo(x + width, y + height - safeRadius);
      context.quadraticCurveTo(
        x + width,
        y + height,
        x + width - safeRadius,
        y + height,
      );
      context.lineTo(x + safeRadius, y + height);
      context.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
      context.lineTo(x, y + safeRadius);
      context.quadraticCurveTo(x, y, x + safeRadius, y);
    }

    function resizeCanvas() {
      const bounds = canvas.getBoundingClientRect();
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.floor(bounds.width * pixelRatio));
      canvas.height = Math.max(1, Math.floor(bounds.height * pixelRatio));
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

      if (!view.offsetX && !view.offsetY) {
        view.offsetX = bounds.width * 0.5;
        view.offsetY = bounds.height * 0.5;
      }
    }

    function screenToCell(x, y) {
      return {
        x: Math.floor((x - view.offsetX) / view.cellSize),
        y: Math.floor((y - view.offsetY) / view.cellSize),
      };
    }

    function cellToScreen(x, y) {
      return {
        x: view.offsetX + x * view.cellSize,
        y: view.offsetY + y * view.cellSize,
      };
    }

    function setCell(x, y, alive) {
      const key = keyForCell(x, y);
      if (alive) {
        if (!liveCells.has(key)) {
          bornCells.set(key, performance.now());
          cellIntensities.set(key, liveIntensity());
        }
        liveCells.add(key);
        fadedCells.delete(key);
      } else if (liveCells.delete(key)) {
        fadedCells.set(key, {
          diedAt: performance.now(),
          intensity: 5,
        });
        cellIntensities.delete(key);
      }
    }

    function toggleCellAtPointer() {
      const cell = screenToCell(pointer.x, pointer.y);
      const key = keyForCell(cell.x, cell.y);
      const shouldLive = !liveCells.has(key);
      setCell(cell.x, cell.y, shouldLive);

      if (shouldLive) {
        clickBursts.push({
          x: cell.x,
          y: cell.y,
          alive: true,
          startedAt: performance.now(),
        });
      } else {
        clickBursts.push({
          x: cell.x,
          y: cell.y,
          alive: false,
          startedAt: performance.now(),
        });
      }
    }

    function randomPatternKey() {
      const keys = Object.keys(patterns);
      return keys[Math.floor(Math.random() * keys.length)];
    }

    function randomHintDelay() {
      return 2400 + Math.random() * 5200;
    }

    function addFloatingLabel(label, x, y) {
      floatingLetters.push({
        label,
        x,
        y,
        startedAt: performance.now(),
      });
    }

    function spawnPattern(patternKey, options = {}) {
      const pattern = patterns[patternKey.toLowerCase()];
      if (!pattern || !pointer.active) {
        return;
      }

      const anchor = screenToCell(pointer.x, pointer.y);
      const width = Math.max(...pattern.map(([x]) => x)) + 1;
      const height = Math.max(...pattern.map(([, y]) => y)) + 1;
      const originX = anchor.x - Math.floor(width / 2);
      const originY = anchor.y - Math.floor(height / 2);

      pattern.forEach(([x, y]) => {
        setCell(originX + x, originY + y, true);
      });

      if (options.showLetter !== false) {
        const normalizedKey = patternKey.toLowerCase();
        addFloatingLabel(
          patternNames[normalizedKey] || normalizedKey.toUpperCase(),
          pointer.x,
          pointer.y,
        );
      }
    }

    function pointPointerAtCanvasCenter() {
      const bounds = canvas.getBoundingClientRect();
      pointer.x = bounds.width * 0.5;
      pointer.y = bounds.height * 0.5;
      pointer.active = true;
      return bounds;
    }

    function spawnPatternAtPointer(patternKey = randomPatternKey()) {
      if (!pointer.active) {
        pointPointerAtCanvasCenter();
      }
      spawnPattern(patternKey);
    }

    function randomVisibleCell() {
      const bounds = canvas.getBoundingClientRect();
      const left = Math.ceil(
        (-view.offsetX + bounds.width * 0.08) / view.cellSize,
      );
      const right = Math.floor(
        (-view.offsetX + bounds.width * 0.92) / view.cellSize,
      );
      const top = Math.ceil(
        (-view.offsetY + bounds.height * 0.12) / view.cellSize,
      );
      const bottom = Math.floor(
        (-view.offsetY + bounds.height * 0.84) / view.cellSize,
      );

      for (let attempt = 0; attempt < 80; attempt += 1) {
        const candidate = {
          x: left + Math.floor(Math.random() * Math.max(1, right - left + 1)),
          y: top + Math.floor(Math.random() * Math.max(1, bottom - top + 1)),
        };

        if (isHintPositionClear(candidate, bounds)) {
          return candidate;
        }
      }

      return { x: right, y: top };
    }

    function isHintPositionClear(candidate, canvasBounds) {
      const screen = cellToScreen(candidate.x, candidate.y);
      const margin = Math.max(16, view.cellSize * 2);
      const hintRect = {
        left: canvasBounds.left + screen.x - margin,
        top: canvasBounds.top + screen.y - margin,
        right: canvasBounds.left + screen.x + view.cellSize + margin,
        bottom: canvasBounds.top + screen.y + view.cellSize + margin,
      };
      const blockedRects = [
        document.querySelector(".hero-inner")?.getBoundingClientRect(),
        toolbar?.getBoundingClientRect(),
      ].filter(Boolean);

      return !blockedRects.some((rect) => {
        const expanded = {
          left: rect.left - margin,
          top: rect.top - margin,
          right: rect.right + margin,
          bottom: rect.bottom + margin,
        };
        return !(
          hintRect.right < expanded.left ||
          hintRect.left > expanded.right ||
          hintRect.bottom < expanded.top ||
          hintRect.top > expanded.bottom
        );
      });
    }

    function spawnHint(timestamp) {
      const template =
        hintTemplates[Math.floor(Math.random() * hintTemplates.length)];
      const position = randomVisibleCell();
      activeHint = {
        ...template,
        ...position,
        lastShownAt: 0,
        bornAt: timestamp,
      };
    }

    function completeHint(action) {
      if (!activeHint) {
        return;
      }

      const completed =
        action === "dismiss" ||
        activeHint.action === action ||
        (activeHint.action.startsWith("key:") && activeHint.action === action);
      if (!completed) {
        return;
      }

      const screen = cellToScreen(activeHint.x, activeHint.y);
      addFloatingLabel(
        typeof activeHint.resultLabel === "function"
          ? activeHint.resultLabel()
          : activeHint.resultLabel || "ok :)",
        screen.x + view.cellSize * 0.5,
        screen.y,
      );
      activeHint = null;
      nextHintAt = performance.now() + randomHintDelay();
    }

    function seedInitialLife() {
      const bounds = canvas.getBoundingClientRect();
      const center = screenToCell(bounds.width * 0.68, bounds.height * 0.42);
      pointer.x = bounds.width * 0.68;
      pointer.y = bounds.height * 0.42;
      pointer.active = true;

      [
        ["g", center.x - 12, center.y - 7],
        ["b", center.x + 4, center.y - 3],
        ["r", center.x - 4, center.y + 5],
        ["t", center.x + 10, center.y + 6],
      ].forEach(([patternKey, x, y]) => {
        const previousPointer = { ...pointer };
        const position = cellToScreen(x, y);
        pointer.x = position.x;
        pointer.y = position.y;
        spawnPattern(patternKey, { showLetter: false });
        pointer.x = previousPointer.x;
        pointer.y = previousPointer.y;
      });
    }

    function pauseForInteraction() {
      running = false;
      toolbarFlashUntil = 0;
    }

    function resumeSimulation() {
      running = true;
      currentTicksPerSecond = Math.min(
        currentTicksPerSecond,
        resumeTicksPerSecond,
      );
      lastStepAt = performance.now();
      toolbarFlashUntil = performance.now() + 1800;
    }

    function toggleSimulation() {
      if (running) {
        running = false;
        toolbarFlashUntil = 0;
        return;
      }

      resumeSimulation();
    }

    function adjustTargetTicksPerSecond(delta) {
      targetTicksPerSecond = Math.max(
        minTicksPerSecond,
        Math.min(maxTicksPerSecond, targetTicksPerSecond + delta),
      );
      if (currentTicksPerSecond > targetTicksPerSecond) {
        currentTicksPerSecond = targetTicksPerSecond;
      }
      toolbarFlashUntil = performance.now() + 1800;
    }

    function resetTargetTicksPerSecond() {
      targetTicksPerSecond = defaultTicksPerSecond;
      currentTicksPerSecond = resumeTicksPerSecond;
      lastStepAt = performance.now();
      toolbarFlashUntil = performance.now() + 1800;
    }

    function zoomAt(x, y, factor) {
      const before = screenToCell(x, y);
      view.cellSize = Math.max(
        minCellSize,
        Math.min(maxCellSize, view.cellSize * factor),
      );
      const after = cellToScreen(before.x, before.y);
      view.offsetX += x - after.x;
      view.offsetY += y - after.y;
    }

    function stepLife() {
      const neighborCounts = new Map();

      context.shadowBlur = 0;
      liveCells.forEach((key) => {
        const { x, y } = parseCell(key);
        for (let dy = -1; dy <= 1; dy += 1) {
          for (let dx = -1; dx <= 1; dx += 1) {
            if (dx || dy) {
              const neighborKey = keyForCell(x + dx, y + dy);
              neighborCounts.set(
                neighborKey,
                (neighborCounts.get(neighborKey) || 0) + 1,
              );
            }
          }
        }
      });

      const nextCells = new Set();
      neighborCounts.forEach((count, key) => {
        const alive = liveCells.has(key);
        if (count === 3 || (alive && count === 2)) {
          nextCells.add(key);
        }
      });

      liveCells.forEach((key) => {
        if (!nextCells.has(key)) {
          fadedCells.set(key, {
            diedAt: performance.now(),
            intensity: 5,
          });
          cellIntensities.delete(key);
        }
      });

      nextCells.forEach((key) => {
        if (!liveCells.has(key)) {
          bornCells.set(key, performance.now());
          cellIntensities.set(key, liveIntensity());
        }
      });

      liveCells.clear();
      nextCells.forEach((key) => liveCells.add(key));
      generation += 1;
    }

    function drawGrid(width, height) {
      const left = Math.floor(-view.offsetX / view.cellSize) - 1;
      const right = Math.ceil((width - view.offsetX) / view.cellSize) + 1;
      const top = Math.floor(-view.offsetY / view.cellSize) - 1;
      const bottom = Math.ceil((height - view.offsetY) / view.cellSize) + 1;
      context.strokeStyle = "rgba(57, 211, 83, 0.145)";
      context.lineWidth = 1;
      context.beginPath();

      for (let x = left; x <= right; x += 1) {
        const sx = Math.round(view.offsetX + x * view.cellSize) + 0.5;
        context.moveTo(sx, 0);
        context.lineTo(sx, height);
      }

      for (let y = top; y <= bottom; y += 1) {
        const sy = Math.round(view.offsetY + y * view.cellSize) + 0.5;
        context.moveTo(0, sy);
        context.lineTo(width, sy);
      }

      context.stroke();
    }

    function drawCells(timestamp) {
      const pad = Math.max(1, view.cellSize * 0.11);
      const radius = Math.min(5, view.cellSize * 0.22);

      fadedCells.forEach((fade, key) => {
        const progress = (timestamp - fade.diedAt) / fadeMs;
        if (progress >= 1) {
          fadedCells.delete(key);
          return;
        }

        const { x, y } = parseCell(key);
        const screen = cellToScreen(x, y);
        const intensity = Math.max(
          1,
          fade.intensity - Math.floor(progress * 5),
        );
        context.fillStyle = colorForIntensity(
          intensity,
          0.16 + intensity * 0.025,
        );
        context.fillRect(
          screen.x + pad,
          screen.y + pad,
          view.cellSize - pad * 2,
          view.cellSize - pad * 2,
        );
      });

      liveCells.forEach((key) => {
        const { x, y } = parseCell(key);
        const screen = cellToScreen(x, y);
        const bornAt = bornCells.get(key) || timestamp - fadeMs;
        const age = Math.min(1, (timestamp - bornAt) / fadeMs);
        const pulse = 0.9 + age * 0.1;
        const intensity = Math.max(
          10,
          Math.min(15, cellIntensities.get(key) || 10),
        );
        context.fillStyle = colorForIntensity(intensity, 0.92);
        context.globalAlpha = pulse;
        const glowEnabled = liveCells.size < 260;
        if (glowEnabled) {
          context.shadowColor = colorForIntensity(intensity, 0.42);
          context.shadowBlur = Math.max(3, view.cellSize * 0.28);
        }
        roundedRect(
          screen.x + pad,
          screen.y + pad,
          view.cellSize - pad * 2,
          view.cellSize - pad * 2,
          radius,
        );
        context.fill();
        context.globalAlpha = 1;
        if (liveCells.size < 260) {
          context.shadowBlur = 0;
        }

        if (age < 1) {
          context.strokeStyle = `rgba(185, 255, 196, ${0.6 * (1 - age)})`;
          context.stroke();
        }
      });
    }

    function drawClickBursts(timestamp) {
      for (let index = clickBursts.length - 1; index >= 0; index -= 1) {
        const burst = clickBursts[index];
        const progress = (timestamp - burst.startedAt) / 720;
        if (progress >= 1) {
          clickBursts.splice(index, 1);
          continue;
        }

        const screen = cellToScreen(burst.x, burst.y);
        const centerX = screen.x + view.cellSize * 0.5;
        const centerY = screen.y + view.cellSize * 0.5;
        const alpha = 1 - progress;
        const ringSize = view.cellSize * (0.9 + progress * 1.35);
        const color = burst.alive ? "255, 213, 92" : "255, 92, 92";
        const fillColor = burst.alive ? "255, 252, 224" : "255, 140, 140";

        context.save();
        context.strokeStyle = `rgba(${color}, ${alpha * 0.78})`;
        context.lineWidth = Math.max(1, view.cellSize * 0.08 * alpha);
        context.shadowColor = `rgba(${color}, ${alpha * 0.7})`;
        context.shadowBlur = 18 * alpha;
        context.beginPath();
        context.arc(centerX, centerY, ringSize * 0.5, 0, Math.PI * 2);
        context.stroke();

        context.fillStyle = `rgba(${fillColor}, ${alpha * 0.22})`;
        context.fillRect(screen.x, screen.y, view.cellSize, view.cellSize);
        context.restore();
      }
    }

    function drawFloatingLetters(timestamp) {
      for (let index = floatingLetters.length - 1; index >= 0; index -= 1) {
        const item = floatingLetters[index];
        const progress = (timestamp - item.startedAt) / 2400;
        if (progress >= 1) {
          floatingLetters.splice(index, 1);
          continue;
        }

        const y = item.y - progress * 34;
        const hold = progress < 0.55 ? 1 : 1 - (progress - 0.55) / 0.45;
        const alpha = Math.max(0, hold);
        context.save();
        context.font =
          "800 16px Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif";
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.lineJoin = "round";
        context.strokeStyle = `rgba(4, 18, 11, ${0.72 * alpha})`;
        context.lineWidth = 5;
        context.fillStyle = `rgba(185, 255, 196, ${alpha})`;
        context.shadowColor = `rgba(57, 211, 83, ${alpha})`;
        context.shadowBlur = 18;
        context.strokeText(item.label, item.x, y);
        context.fillText(item.label, item.x, y);
        context.restore();
      }
    }

    function getHintUnderPointer() {
      if (!pointer.active || !activeHint) {
        return null;
      }

      const cell = screenToCell(pointer.x, pointer.y);
      return cell.x === activeHint.x && cell.y === activeHint.y
        ? activeHint
        : null;
    }

    function drawHintCells(timestamp) {
      if (!activeHint && timestamp >= nextHintAt) {
        spawnHint(timestamp);
      }

      if (!activeHint) {
        return;
      }

      const hoveredHint = getHintUnderPointer();
      const hint = activeHint;
      const index = hint.bornAt || 0;
      const screen = cellToScreen(hint.x, hint.y);
      const pulse = 0.5 + Math.sin(timestamp * 0.003 + index) * 0.5;
      const isHovered = hint === hoveredHint;
      const pad = view.cellSize * 0.08;
      const size = view.cellSize - pad * 2;
      const glow = isHovered ? 30 : 16 + pulse * 18;

      context.save();
      context.shadowColor = `rgba(255, 213, 92, ${0.48 + pulse * 0.38})`;
      context.shadowBlur = glow;
      context.fillStyle = isHovered
        ? "rgba(255, 225, 92, 0.92)"
        : `rgba(255, 213, 92, ${0.5 + pulse * 0.28})`;
      roundedRect(
        screen.x + pad,
        screen.y + pad,
        size,
        size,
        Math.min(7, view.cellSize * 0.28),
      );
      context.fill();
      context.shadowBlur = 0;
      context.strokeStyle = `rgba(42, 30, 0, ${0.38 + pulse * 0.2})`;
      context.lineWidth = Math.max(1, view.cellSize * 0.2);
      context.stroke();
      context.strokeStyle = isHovered
        ? "rgba(255, 255, 236, 0.96)"
        : `rgba(255, 245, 173, ${0.72 + pulse * 0.22})`;
      context.lineWidth = Math.max(1, view.cellSize * 0.07);
      context.stroke();
      context.restore();

      if (
        hoveredHint &&
        !touchFirstInput &&
        timestamp - hoveredHint.lastShownAt > hintPromptMs
      ) {
        hoveredHint.lastShownAt = timestamp;
        addFloatingLabel(
          typeof hoveredHint.label === "function"
            ? hoveredHint.label()
            : hoveredHint.label,
          pointer.x,
          pointer.y - 14,
        );
      }
    }

    function updateToolbar(timestamp) {
      const visible = Boolean(!running || timestamp < toolbarFlashUntil);
      document.body.dataset.lifeToolbar = visible ? "on" : "off";
      if (!toolbar || !toolbarToggle) {
        return;
      }
      toolbar.dataset.running = String(running);
      toolbar.dataset.tps = targetTicksPerSecond.toFixed(0);
      toolbarToggle.textContent = running ? t("life.pause") : t("life.play");
      toolbarToggle.setAttribute("aria-pressed", String(!running));

      if (tpsMeterLabel && tpsMeterFill) {
        const currentTps = currentTicksPerSecond.toFixed(1);
        const progress = Math.max(
          0.04,
          Math.min(1, currentTicksPerSecond / maxTicksPerSecond),
        );
        tpsMeterLabel.textContent = t("life.tpsLabel", { value: currentTps });
        tpsMeterFill.style.width = `${progress * 100}%`;
      }
    }

    function drawPointerCell() {
      if (!pointer.active) {
        return;
      }

      const cell = screenToCell(pointer.x, pointer.y);
      const screen = cellToScreen(cell.x, cell.y);
      context.strokeStyle = "rgba(255, 255, 255, 0.42)";
      context.lineWidth = 1.5;
      context.strokeRect(
        screen.x + 1,
        screen.y + 1,
        view.cellSize - 2,
        view.cellSize - 2,
      );
    }

    function render(timestamp = performance.now()) {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      const frameSeconds = Math.min(
        0.1,
        Math.max(0, (timestamp - lastFrameAt) / 1000),
      );
      lastFrameAt = timestamp;

      if (running) {
        currentTicksPerSecond = Math.min(
          targetTicksPerSecond,
          currentTicksPerSecond + tpsRampPerSecond * frameSeconds,
        );
      }

      const currentStepMs = 1000 / currentTicksPerSecond;
      if (running && timestamp - lastStepAt >= currentStepMs) {
        const steps = Math.min(
          4,
          Math.floor((timestamp - lastStepAt) / currentStepMs),
        );
        for (let step = 0; step < steps; step += 1) {
          stepLife();
        }
        lastStepAt = timestamp;
      }

      context.clearRect(0, 0, width, height);
      context.fillStyle = "rgba(4, 18, 11, 0.96)";
      context.fillRect(0, 0, width, height);
      drawGrid(width, height);
      drawCells(timestamp);
      drawClickBursts(timestamp);
      drawHintCells(timestamp);
      drawPointerCell();
      drawFloatingLetters(timestamp);
      updateToolbar(timestamp);

      canvas.dataset.generation = String(generation);
      canvas.dataset.cells = String(liveCells.size);
      canvas.dataset.running = String(running);
      canvas.dataset.zoom = view.cellSize.toFixed(2);
      canvas.dataset.tps = currentTicksPerSecond.toFixed(1);
      canvas.dataset.targetTps = targetTicksPerSecond.toFixed(1);

      frameHandle = window.requestAnimationFrame(render);
    }

    function updatePointer(event) {
      const bounds = canvas.getBoundingClientRect();
      pointer.x = event.clientX - bounds.left;
      pointer.y = event.clientY - bounds.top;
      pointer.active =
        pointer.x >= 0 &&
        pointer.x <= bounds.width &&
        pointer.y >= 0 &&
        pointer.y <= bounds.height;
    }

    function onPointerDown(event) {
      if (event.button !== 0) {
        return;
      }

      if (event.target !== canvas) {
        return;
      }

      updatePointer(event);
      drag.active = true;
      drag.moved = false;
      drag.startX = event.clientX;
      drag.startY = event.clientY;
      drag.offsetX = view.offsetX;
      drag.offsetY = view.offsetY;
    }

    function onContextMenu(event) {
      event.preventDefault();
    }

    function onPointerMove(event) {
      updatePointer(event);
      if (!drag.active) {
        return;
      }

      const dx = event.clientX - drag.startX;
      const dy = event.clientY - drag.startY;
      if (Math.hypot(dx, dy) > 4) {
        drag.moved = true;
      }
      view.offsetX = drag.offsetX + dx;
      view.offsetY = drag.offsetY + dy;
    }

    function onPointerUp() {
      if (drag.active && !drag.moved && pointer.active) {
        const hint = getHintUnderPointer();
        if (hint && touchFirstInput) {
          if (hint.action === "space") {
            toggleSimulation();
            completeHint("space");
          } else {
            const key = hint.action.replace("key:", "");
            spawnPatternAtPointer(patterns[key] ? key : randomPatternKey());
            completeHint(hint.action);
          }
        } else {
          toggleCellAtPointer();
          if (hint) {
            completeHint("dismiss");
          }
        }
        pauseForInteraction();
      }
      drag.active = false;
    }

    function handleToolbarClick(event) {
      const control = event.target.closest("[data-life-action]");
      if (!control || !toolbar?.contains(control)) {
        return;
      }

      event.preventDefault();
      const action = control.dataset.lifeAction;

      if (action === "toggle") {
        toggleSimulation();
        return;
      }

      if (action === "zoom-in") {
        const bounds = pointPointerAtCanvasCenter();
        zoomAt(bounds.width * 0.5, bounds.height * 0.5, 1.18);
      } else if (action === "zoom-out") {
        const bounds = pointPointerAtCanvasCenter();
        zoomAt(bounds.width * 0.5, bounds.height * 0.5, 1 / 1.18);
      } else if (action === "tps-down") {
        adjustTargetTicksPerSecond(-2);
      } else if (action === "tps-up") {
        adjustTargetTicksPerSecond(2);
      } else if (action === "tps-reset") {
        resetTargetTicksPerSecond();
      }

      toolbarFlashUntil = performance.now() + 1800;
    }

    function onKeyDown(event) {
      if (event.key === " " || event.code === "Space") {
        event.preventDefault();
        toggleSimulation();
        completeHint("space");
        return;
      }

      if (event.key === "Enter") {
        event.preventDefault();
        resetTargetTicksPerSecond();
        return;
      }

      if (event.key === "," || event.key === "<") {
        event.preventDefault();
        adjustTargetTicksPerSecond(-2);
        return;
      }

      if (event.key === "." || event.key === ">") {
        event.preventDefault();
        adjustTargetTicksPerSecond(2);
        return;
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        view.offsetX += view.cellSize * 2;
        return;
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        view.offsetX -= view.cellSize * 2;
        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        view.offsetY += view.cellSize * 2;
        return;
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
        view.offsetY -= view.cellSize * 2;
        return;
      }

      if (event.key === "+" || event.key === "=") {
        event.preventDefault();
        const bounds = canvas.getBoundingClientRect();
        zoomAt(
          pointer.active ? pointer.x : bounds.width * 0.5,
          pointer.active ? pointer.y : bounds.height * 0.5,
          1.18,
        );
        return;
      }

      if (event.key === "-" || event.key === "_") {
        event.preventDefault();
        const bounds = canvas.getBoundingClientRect();
        zoomAt(
          pointer.active ? pointer.x : bounds.width * 0.5,
          pointer.active ? pointer.y : bounds.height * 0.5,
          1 / 1.18,
        );
        return;
      }

      if (event.key.length === 1 && /[a-z]/i.test(event.key)) {
        spawnPatternAtPointer(event.key);
        completeHint(`key:${event.key.toLowerCase()}`);
      }
    }

    function destroy() {
      window.cancelAnimationFrame(frameHandle);
      window.removeEventListener("resize", resizeCanvas);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointerleave", hidePointer);
      canvas.removeEventListener("contextmenu", onContextMenu);
      toolbar?.removeEventListener("click", handleToolbarClick);
      window.removeEventListener("keydown", onKeyDown);
    }

    function hidePointer() {
      pointer.active = false;
      drag.active = false;
    }

    resizeCanvas();
    seedInitialLife();
    frameHandle = window.requestAnimationFrame(render);

    window.addEventListener("resize", resizeCanvas);
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerdown", onPointerDown, { passive: true });
    window.addEventListener("pointerup", onPointerUp, { passive: true });
    window.addEventListener("pointerleave", hidePointer);
    canvas.addEventListener("contextmenu", onContextMenu);
    toolbar?.addEventListener("click", handleToolbarClick);
    window.addEventListener("keydown", onKeyDown);

    return {
      resize: resizeCanvas,
      destroy,
    };
  }

  BackgroundEffects.mountGameOfLife = mountGameOfLife;
})();
