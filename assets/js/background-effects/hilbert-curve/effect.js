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
    const maxFps = 60;
    const frameBudgetMs = 1000 / maxFps;
    const holdDurationMs = 1400;
    const morphDurationMs = 3300;
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
    let rafId = 0;
    let lastTimestamp = 0;
    let currentLevel = prefersReducedMotion ? maxVisualLevel : 0;
    let phase = prefersReducedMotion ? "static" : "build";
    let phaseStartedAt = performance.now();
    let morphProgress = prefersReducedMotion ? 1 : 0;

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

      const size = Math.min(bounds.width, bounds.height) * 0.9;
      curveBox.size = size;
      curveBox.x = (bounds.width - size) / 2;
      curveBox.y = (bounds.height - size) / 2;
      curveBox.centerX = curveBox.x + size / 2;
      curveBox.centerY = curveBox.y + size / 2;
      rebuildCachedPaths();
    }

    function drawBackground(width, height) {
      context.clearRect(0, 0, width, height);

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
      context.shadowBlur = curveBox.size * 0.04 * (1 - currentLevel / (maxVisualLevel + 1));
      context.shadowColor = "rgba(77, 161, 255, 0.28)";
      context.strokeStyle = "rgba(190, 222, 255, 0.22)";
      context.stroke(path);
      context.shadowBlur = 0;
      context.lineWidth = Math.max(0.35, strokeWidth * 0.62);
      context.strokeStyle = "rgba(255, 255, 255, 0.14)";
      context.stroke(path);
      context.restore();
    }

    function drawMorph(fromData, toData, progress, timestamp) {
      const eased = easeInOut(progress);
      const progressValues = getMorphProgressValues(
        fromData.segmentCount,
        toData.segmentCount,
      );
      const morphLevel = currentLevel + eased;
      const strokeWidth = lerp(
        Math.max(1.35, curveBox.size / 220),
        Math.max(0.45, curveBox.size / 900),
        clamp(morphLevel / Math.max(1, maxVisualLevel), 0, 1),
      );

      context.save();
      context.beginPath();
      context.lineCap = "butt";
      context.lineJoin = "miter";
      context.miterLimit = 2;
      context.lineWidth = Math.max(0.4, strokeWidth * 0.72);

      let tipX = 0;
      let tipY = 0;
      for (let index = 0; index < progressValues.length; index += 1) {
        const pathProgress = progressValues[index];
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
        const x = screenX(lerp(fromPoint.x, toPoint.x, eased));
        const y = screenY(lerp(fromPoint.y, toPoint.y, eased));

        if (index === 0) {
          context.moveTo(x, y);
        } else {
          context.lineTo(x, y);
        }

        tipX = x;
        tipY = y;
      }

      context.strokeStyle = "rgba(144, 198, 255, 0.82)";
      context.stroke();
      context.restore();
      drawTip(tipX, tipY, timestamp);
    }

    function pumpBuildWork(deadline) {
      ensureLevel(currentLevel);
      buildLevelSlice(currentLevel, deadline);

      if (performance.now() >= deadline) {
        return;
      }

      if (currentLevel < maxVisualLevel) {
        ensureLevel(currentLevel + 1);
        buildLevelSlice(currentLevel + 1, deadline);
      }

    }

    function render(timestamp) {
      if (!lastTimestamp) {
        lastTimestamp = timestamp;
      }
      const frameMs = timestamp - lastTimestamp;
      lastTimestamp = timestamp;

      const budgetDeadline = performance.now() + frameBudgetMs;
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
          phase = currentLevel < maxVisualLevel ? "hold" : "static";
          phaseStartedAt = timestamp;
        }
      } else if (phase === "hold") {
        drawExactPath(currentData.path);
        if (
          currentLevel < maxVisualLevel &&
          timestamp - phaseStartedAt >= holdDurationMs
        ) {
          phase = "morph";
          phaseStartedAt = timestamp;
          morphProgress = 0;
        } else if (currentLevel >= maxVisualLevel) {
          phase = "static";
        }
      } else if (phase === "morph") {
        const nextData = getLevel(currentLevel + 1);
        morphProgress = clamp(
          (timestamp - phaseStartedAt) / morphDurationMs,
          0,
          1,
        );

        if (nextData) {
          drawMorph(currentData, nextData, morphProgress, timestamp);
          if (morphProgress >= 1) {
            currentLevel += 1;
            phase = currentLevel < maxVisualLevel ? "hold" : "static";
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
      },
    };
  }

  BackgroundEffects.mountHilbertCurve = mountHilbertCurve;
})();
