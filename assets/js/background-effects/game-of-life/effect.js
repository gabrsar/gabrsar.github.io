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
//   letter keys: spawn known Life patterns at the cursor
(function () {
  const BackgroundEffects =
    window.BackgroundEffects || (window.BackgroundEffects = {});

  function mountGameOfLife(canvas) {
    if (!canvas) {
      return null;
    }

    const context = canvas.getContext("2d");
    const liveCells = new Set();
    const bornCells = new Map();
    const fadedCells = new Map();
    const cellIntensities = new Map();
    const floatingLetters = [];
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
    let nextAutoSpawnAt = performance.now() + 2600;
    let running = true;
    let temporaryPauseUntil = 0;
    let userPausedFromTimer = false;
    let currentStepMs = 140;
    let generation = 0;

    const stepMs = 140;
    const resumeStepMs = 560;
    const minCellSize = 7;
    const maxCellSize = 46;
    const fadeMs = 360;
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
      setCell(cell.x, cell.y, !liveCells.has(keyForCell(cell.x, cell.y)));
    }

    function addFloatingLetter(letter, x, y) {
      floatingLetters.push({
        letter: letter.toUpperCase(),
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
        addFloatingLetter(patternKey, pointer.x, pointer.y);
      }
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

    function timerCenter() {
      return {
        x: canvas.clientWidth * 0.5,
        y: canvas.clientHeight * 0.5,
      };
    }

    function isTimerHit() {
      const center = timerCenter();
      return Math.hypot(pointer.x - center.x, pointer.y - center.y) <= 78;
    }

    function pauseForInteraction() {
      const now = performance.now();
      if (temporaryPauseUntil > now && isTimerHit()) {
        temporaryPauseUntil = 0;
        userPausedFromTimer = true;
        running = false;
        return;
      }

      if (userPausedFromTimer) {
        userPausedFromTimer = false;
        running = true;
        currentStepMs = resumeStepMs;
        lastStepAt = now;
        return;
      }

      running = false;
      temporaryPauseUntil = now + 3000;
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
      const pad = Math.max(1, view.cellSize * 0.16);

      for (let y = top; y <= bottom; y += 1) {
        for (let x = left; x <= right; x += 1) {
          const screen = cellToScreen(x, y);
          const shimmer = Math.abs((x * 19 + y * 23 + generation) % 5) / 5;
          context.fillStyle = `rgba(14, 68, 41, ${0.07 + shimmer * 0.025})`;
          context.fillRect(
            screen.x + pad,
            screen.y + pad,
            view.cellSize - pad * 2,
            view.cellSize - pad * 2,
          );
        }
      }

      context.strokeStyle = "rgba(57, 211, 83, 0.035)";
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
        context.shadowColor = colorForIntensity(intensity, 0.5);
        context.shadowBlur = Math.max(
          6,
          view.cellSize * (0.28 + intensity * 0.012),
        );
        roundedRect(
          screen.x + pad,
          screen.y + pad,
          view.cellSize - pad * 2,
          view.cellSize - pad * 2,
          radius,
        );
        context.fill();
        context.globalAlpha = 1;
        context.shadowBlur = 0;

        if (age < 1) {
          context.strokeStyle = `rgba(185, 255, 196, ${0.6 * (1 - age)})`;
          context.stroke();
        }
      });
    }

    function drawFloatingLetters(timestamp) {
      for (let index = floatingLetters.length - 1; index >= 0; index -= 1) {
        const item = floatingLetters[index];
        const progress = (timestamp - item.startedAt) / 1200;
        if (progress >= 1) {
          floatingLetters.splice(index, 1);
          continue;
        }

        const y = item.y - progress * 42;
        const alpha = 1 - progress;
        context.save();
        context.font =
          "800 18px Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif";
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.fillStyle = `rgba(185, 255, 196, ${alpha})`;
        context.shadowColor = `rgba(57, 211, 83, ${alpha})`;
        context.shadowBlur = 18;
        context.fillText(item.letter, item.x, y);
        context.restore();
      }
    }

    function drawPauseTimer(timestamp) {
      if (!temporaryPauseUntil && !userPausedFromTimer && running) {
        return;
      }

      const remaining = Math.max(0, temporaryPauseUntil - timestamp);
      const text = userPausedFromTimer
        ? "PAUSADO"
        : remaining > 0
          ? `${Math.ceil(remaining / 1000)}`
          : "";

      if (!text) {
        return;
      }

      context.save();
      const pulse = userPausedFromTimer
        ? 1
        : 1 + Math.sin(timestamp * 0.014) * 0.08;
      context.font = `${userPausedFromTimer ? 800 : 900} ${userPausedFromTimer ? 28 : 72}px Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif`;
      context.textAlign = "center";
      context.textBaseline = "middle";
      const center = timerCenter();
      context.translate(center.x, center.y);
      context.scale(pulse, pulse);
      context.fillStyle = "rgba(4, 18, 11, 0.48)";
      context.beginPath();
      context.arc(0, 0, userPausedFromTimer ? 76 : 84, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = "rgba(57, 211, 83, 0.56)";
      context.lineWidth = 2;
      context.beginPath();
      context.arc(0, 0, userPausedFromTimer ? 76 : 84, 0, Math.PI * 2);
      context.stroke();
      context.fillStyle = "rgba(185, 255, 196, 0.94)";
      context.shadowColor = "rgba(57, 211, 83, 0.62)";
      context.shadowBlur = userPausedFromTimer ? 18 : 34;
      context.fillText(text, 0, userPausedFromTimer ? 0 : 2);
      context.restore();
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

      if (temporaryPauseUntil && timestamp >= temporaryPauseUntil) {
        temporaryPauseUntil = 0;
        running = true;
        currentStepMs = resumeStepMs;
        lastStepAt = timestamp;
      }

      if (running) {
        currentStepMs = Math.max(stepMs, currentStepMs * 0.985);
      }

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

      if (timestamp >= nextAutoSpawnAt) {
        const keys = Object.keys(patterns);
        const previousPointer = { ...pointer };
        if (!pointer.active) {
          pointer.x = width * (0.55 + Math.random() * 0.28);
          pointer.y = height * (0.24 + Math.random() * 0.36);
          pointer.active = true;
        }
        spawnPattern(keys[Math.floor(Math.random() * keys.length)]);
        pointer.x = previousPointer.x;
        pointer.y = previousPointer.y;
        pointer.active = previousPointer.active;
        nextAutoSpawnAt = timestamp + 6400 + Math.random() * 3600;
      }

      context.clearRect(0, 0, width, height);
      context.fillStyle = "rgba(4, 18, 11, 0.96)";
      context.fillRect(0, 0, width, height);
      drawGrid(width, height);
      drawCells(timestamp);
      drawPointerCell();
      drawFloatingLetters(timestamp);
      drawPauseTimer(timestamp);

      canvas.dataset.generation = String(generation);
      canvas.dataset.cells = String(liveCells.size);
      canvas.dataset.running = String(running);
      canvas.dataset.temporaryPause = String(temporaryPauseUntil > timestamp);
      canvas.dataset.zoom = view.cellSize.toFixed(2);
      canvas.dataset.stepMs = currentStepMs.toFixed(1);

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
        if (!isTimerHit()) {
          toggleCellAtPointer();
        }
        pauseForInteraction();
      }
      drag.active = false;
    }

    function onKeyDown(event) {
      if (event.key === " " || event.code === "Space") {
        event.preventDefault();
        running = !running;
        temporaryPauseUntil = 0;
        userPausedFromTimer = !running;
        if (running) {
          currentStepMs = resumeStepMs;
        }
        lastStepAt = performance.now();
        return;
      }

      if (event.key === "Enter") {
        running = !running;
        temporaryPauseUntil = 0;
        userPausedFromTimer = !running;
        if (running) {
          currentStepMs = resumeStepMs;
        }
        lastStepAt = performance.now();
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
        spawnPattern(event.key);
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
    window.addEventListener("keydown", onKeyDown);

    return {
      resize: resizeCanvas,
      destroy,
    };
  }

  BackgroundEffects.mountGameOfLife = mountGameOfLife;
})();
