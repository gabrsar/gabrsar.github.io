// Lorenz attractor background effect for the home hero.
//
// Public API:
//   window.BackgroundEffects.mountLorenzAttractor(canvas)
//
// This file owns only the canvas simulation. Page text, cards, layout, and
// navigation stay in HTML/CSS so the site can swap this background for another
// effect without touching the rest of the hero.
(function () {
  const BackgroundEffects =
    window.BackgroundEffects || (window.BackgroundEffects = {});

  function mountLorenzAttractor(canvas) {
    if (!canvas) {
      return null;
    }
    const context = canvas.getContext("2d");
    context.lineCap = "round";
    context.lineJoin = "round";
    const bloomCanvas = document.createElement("canvas");
    const bloomContext = bloomCanvas.getContext("2d");
    bloomContext.lineCap = "round";
    bloomContext.lineJoin = "round";
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const temperatureMin = 800;
    const synthwavePalette = [
      { r: 255, g: 79, b: 216 },
      { r: 124, g: 84, b: 255 },
      { r: 0, g: 233, b: 255 },
      { r: 255, g: 92, b: 170 },
      { r: 102, g: 255, b: 214 },
      { r: 255, g: 153, b: 92 },
    ];
    const particles = [];
    let frame = 0;
    const mouseGlow = {
      x: 0,
      y: 0,
      previousX: 0,
      previousY: 0,
      vx: 0,
      vy: 0,
      active: false,
      pressed: false,
      pointerType: "mouse",
      radius: 140,
    };
    const attractor = {
      x: 0,
      y: 0,
    };
    const particleTuning = {
      min: 640,
      max: 4200,
      minObservedFrameMs: 1000 / 60,
      renderCostMs: 0,
      lastTimestamp: 0,
      lastAdjustment: 0,
      stableFrames: 0,
    };
    let retinaBurn = 0;
    let clickBurst = 0;
    let clickChain = 0;
    let attractorEnergy = 0;
    let attractorLooseness = 0;
    const clickFlashes = [];
    let explosionUntil = 0;
    let nextClickAllowedAt = 0;
    let lastClickAt = 0;
    // Above this energy, the fake "Eddington limit" pushes particles outward.
    // It is not a real luminosity calculation; it is a visual metaphor for
    // radiation pressure overpowering the attractor's gravity-like pull.
    const eddingtonThreshold = 18;
    const startupWarmupFrames = 120;

    function clamp(value, min, max) {
      return Math.min(max, Math.max(min, value));
    }

    function lerp(start, end, amount) {
      return start + (end - start) * amount;
    }

    function lerpColor(a, b, amount) {
      return {
        r: Math.round(lerp(a.r, b.r, amount)),
        g: Math.round(lerp(a.g, b.g, amount)),
        b: Math.round(lerp(a.b, b.b, amount)),
      };
    }

    function blackbodyRgb(kelvin) {
      // Tanner Helland-style blackbody approximation. It maps color temperature
      // to RGB, then blends very hot values toward white so high energy reads as
      // retina-burning rather than simply blue.
      const temp = kelvin / 100;
      const red =
        temp <= 66 ? 255 : 329.698727446 * (temp - 60) ** -0.1332047592;
      const green =
        temp <= 66
          ? 99.4708025861 * Math.log(temp) - 161.1195681661
          : 288.1221695283 * (temp - 60) ** -0.0755148492;
      const blue =
        temp >= 66
          ? 255
          : temp <= 19
            ? 0
            : 138.5177312231 * Math.log(temp - 10) - 305.0447927307;
      const whiteMix = clamp(
        (Math.log10(Math.max(temperatureMin, kelvin)) - Math.log10(6500)) /
          (Math.log10(50000) - Math.log10(6500)),
        0,
        1,
      );
      const whitened = whiteMix ** 0.92;
      const mixedRed = lerp(red, 255, whitened);
      const mixedGreen = lerp(green, 255, whitened);
      const mixedBlue = lerp(blue, 255, whitened);

      return {
        r: Math.round(clamp(mixedRed, 0, 255)),
        g: Math.round(clamp(mixedGreen, 0, 255)),
        b: Math.round(clamp(mixedBlue, 0, 255)),
      };
    }

    function energyToTemperature(energy) {
      // Internal particle energy is dimensionless. This curve turns it into a
      // Kelvin-like value with a soft cold start and a very steep hot end.
      return temperatureMin * Math.pow(1 + Math.max(0, energy), 2.8);
    }

    function temperatureRadiance(kelvin) {
      // Stefan-Boltzmann says emitted power is proportional to T^4. This keeps
      // that shape, then compresses it with an exposure curve so the canvas does
      // not instantly clip to white.
      const normalized = Math.pow(kelvin / temperatureMin, 4);
      return 1 - Math.exp(-normalized / 6);
    }

    function exposureCurve(value) {
      return 1 - Math.exp(-Math.max(0, value));
    }

    function colorForEnergy(energy, alpha) {
      const temperature = energyToTemperature(energy);
      const color =
        temperature < 1000
          ? blackbodyRgb(temperature)
          : blackbodyRgb(temperature);
      return `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`;
    }

    function synthwaveColorForParticle(point, temperature, alpha) {
      const thresholdMix = clamp((1000 - temperature) / 300, 0, 1);
      const lowIndex = point.coolA % synthwavePalette.length;
      const highIndex = point.coolB % synthwavePalette.length;
      const base = lerpColor(
        synthwavePalette[lowIndex],
        synthwavePalette[highIndex],
        0.5 + 0.5 * Math.sin(point.coolPhase + point.life * 6),
      );
      const vivid = lerpColor(
        base,
        { r: 255, g: 255, b: 255 },
        thresholdMix * 0.18,
      );
      return `rgba(${vivid.r}, ${vivid.g}, ${vivid.b}, ${alpha})`;
    }

    function colorForPoint(point, energy, alpha) {
      const temperature = energyToTemperature(energy);
      if (temperature < 1000) {
        return synthwaveColorForParticle(point, temperature, alpha);
      }

      const color = blackbodyRgb(temperature);
      return `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`;
    }

    function isTouchLikePointer(event) {
      return event.pointerType === "touch" || event.pointerType === "pen";
    }

    function updateMouseGlow(event) {
      const bounds = canvas.getBoundingClientRect();
      const nextX = event.clientX - bounds.left;
      const nextY = event.clientY - bounds.top;
      if (mouseGlow.active) {
        mouseGlow.vx = lerp(mouseGlow.vx, nextX - mouseGlow.previousX, 0.62);
        mouseGlow.vy = lerp(mouseGlow.vy, nextY - mouseGlow.previousY, 0.62);
      }
      mouseGlow.previousX = nextX;
      mouseGlow.previousY = nextY;
      mouseGlow.x = event.clientX - bounds.left;
      mouseGlow.y = event.clientY - bounds.top;
      mouseGlow.pointerType = event.pointerType || "mouse";
      const inside =
        mouseGlow.x >= 0 &&
        mouseGlow.x <= bounds.width &&
        mouseGlow.y >= 0 &&
        mouseGlow.y <= bounds.height;
      mouseGlow.active =
        inside && (!isTouchLikePointer(event) || mouseGlow.pressed);
      canvas.dataset.glow = mouseGlow.active ? "on" : "off";
    }

    function hideMouseGlow() {
      mouseGlow.active = false;
      mouseGlow.pressed = false;
      mouseGlow.vx = 0;
      mouseGlow.vy = 0;
      canvas.dataset.glow = "off";
    }

    function resizeCanvas() {
      // The particle budget follows viewport area and then self-tunes in
      // tuneParticleCount(). This keeps the attractor dense without sacrificing
      // frame rate on smaller or slower screens.
      const bounds = canvas.getBoundingClientRect();
      const scale = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.floor(bounds.width * scale));
      canvas.height = Math.max(1, Math.floor(bounds.height * scale));
      context.setTransform(scale, 0, 0, scale, 0, 0);
      bloomCanvas.width = Math.max(1, Math.floor(bounds.width * 0.42));
      bloomCanvas.height = Math.max(1, Math.floor(bounds.height * 0.42));
      if (!attractor.x && !attractor.y) {
        attractor.x = bounds.width * 0.72;
        attractor.y = bounds.height * 0.52;
      }
      particleTuning.max = Math.max(
        1400,
        Math.min(7600, Math.floor((bounds.width * bounds.height) / 180)),
      );
      if (particles.length === 0) {
        setParticleCount(
          Math.min(
            particleTuning.max,
            Math.max(960, Math.floor(particleTuning.max * 0.22)),
          ),
        );
      } else {
        setParticleCount(
          clamp(particles.length, particleTuning.min, particleTuning.max),
        );
      }
    }

    function makeParticle() {
      const particle = {
        x: -12 + Math.random() * 24,
        y: -14 + Math.random() * 28,
        z: 8 + Math.random() * 24,
        energy: 0.002 + Math.random() * 0.01,
        heat: 0,
        hoverCharge: 0,
        insistenceHold: 0,
        insistenceScale: 1,
        starScale: 1,
        starBrightness: 1,
        canBecomeStar: Math.random() < 0.01,
        coolA: Math.floor(Math.random() * synthwavePalette.length),
        coolB: Math.floor(Math.random() * synthwavePalette.length),
        coolPhase: Math.random() * Math.PI * 2,
        pulse: Math.random() * Math.PI * 2,
        life: 0.2 + Math.random() * 0.8,
      };

      for (let warmup = 0; warmup < 320; warmup += 1) {
        stepLorenz(particle);
      }

      return particle;
    }

    function setParticleCount(count) {
      const nextCount = Math.round(
        clamp(count, particleTuning.min, particleTuning.max),
      );
      while (particles.length < nextCount) {
        particles.push(makeParticle());
      }
      if (particles.length > nextCount) {
        particles.length = nextCount;
      }
      canvas.dataset.particles = particles.length;
    }

    function stepLorenz(point, heat = 0) {
      // Lorenz system:
      //   dx/dt = sigma * (y - x)
      //   dy/dt = x * (rho - z) - y
      //   dz/dt = x * y - beta * z
      //
      // Heat loosens the constants gradually, making the attractor wider and
      // faster after interaction without jerking the whole scene.
      const looseness = clamp(heat, 0, 1);
      const sigma = 10 - looseness * 2.6;
      const rho = 28 + looseness * 9;
      const beta = 8 / 3 - looseness * 0.42;
      const dt = 0.0005;
      const dx = sigma * (point.y - point.x);
      const dy = point.x * (rho - point.z) - point.y;
      const dz = point.x * point.y - beta * point.z;
      point.x += dx * dt;
      point.y += dy * dt;
      point.z += dz * dt;
    }

    function drawGrid(width, height) {
      context.strokeStyle = "rgba(255,255,255,0.045)";
      context.lineWidth = 1;
      for (let x = 0; x < width; x += 76) {
        context.beginPath();
        context.moveTo(x, 0);
        context.lineTo(x, height);
        context.stroke();
      }
      for (let y = 0; y < height; y += 76) {
        context.beginPath();
        context.moveTo(0, y);
        context.lineTo(width, y);
        context.stroke();
      }
    }

    function drawMouseHalo(glowFade) {
      if (glowFade <= 0) {
        return;
      }

      const gradient = context.createRadialGradient(
        mouseGlow.x,
        mouseGlow.y,
        0,
        mouseGlow.x,
        mouseGlow.y,
        mouseGlow.radius * 1.18,
      );
      gradient.addColorStop(0, `rgba(227, 177, 91, ${0.09 * glowFade})`);
      gradient.addColorStop(0.34, `rgba(31, 111, 104, ${0.07 * glowFade})`);
      gradient.addColorStop(1, "rgba(31, 111, 104, 0)");
      context.fillStyle = gradient;
      context.fillRect(
        mouseGlow.x - mouseGlow.radius * 1.2,
        mouseGlow.y - mouseGlow.radius * 1.2,
        mouseGlow.radius * 2.4,
        mouseGlow.radius * 2.4,
      );
    }

    function energizeParticle(point, multiplier) {
      if (multiplier <= 0) {
        return;
      }

      const boost = 0.004 + multiplier * 0.024;
      point.energy = Math.min(
        point.energy * (1 + multiplier * 0.36) + boost,
        1e8,
      );
      point.heat = Math.min((point.heat || 0) + 0.036 + multiplier * 0.28, 8);
    }

    function doubleHotParticle(point, multiplier) {
      const currentHeat = point.heat || 0;
      if (currentHeat <= 0.08) {
        energizeParticle(point, multiplier);
        return;
      }

      const streak = point.hoverCharge || 0;
      const ramp = 1 / (1 + Math.exp((streak - 2.4) * 1.35));
      const gentleGain = multiplier * (0.045 + 0.2 * ramp);
      const heatGain = currentHeat * (0.007 + 0.021 * ramp);

      point.hoverCharge = Math.min(8, streak + 1);
      point.heat = Math.min(
        currentHeat * (1.004 + 0.004 * ramp) + heatGain,
        24,
      );
      point.energy = Math.min(
        point.energy * (1.002 + 0.011 * ramp) + gentleGain + heatGain * 0.15,
        1e8,
      );

      if (streak >= 6) {
        point.energy = Math.min(point.energy + currentHeat * 0.18 + 0.12, 1e8);
        point.heat = Math.min(point.heat * 1.018 + 0.1, 24);
        point.hoverCharge = 0;
      }
    }

    function perturbParticle(point, glowPower, scale) {
      const pointerSpeed = Math.hypot(mouseGlow.vx, mouseGlow.vy);
      if (glowPower <= 0 || pointerSpeed <= 0.08) {
        return;
      }

      const impulse = glowPower * clamp(pointerSpeed / 34, 0, 1.65);
      const unitScale = Math.max(scale, 1);
      point.x += clamp(mouseGlow.vx / unitScale, -4, 4) * impulse * 0.028;
      point.y += clamp(mouseGlow.vy / unitScale, -4, 4) * impulse * 0.028;
      point.z += impulse * 0.02;
    }

    function spawnClickFlash(x, y, strength, reach = 1, duration = 360) {
      clickFlashes.push({
        x,
        y,
        strength,
        reach,
        startedAt: performance.now(),
        duration,
      });
    }

    function drawClickFlashes(width, height, timestamp) {
      for (let index = clickFlashes.length - 1; index >= 0; index -= 1) {
        const flash = clickFlashes[index];
        const progress = clamp(
          (timestamp - flash.startedAt) / flash.duration,
          0,
          1,
        );
        if (progress >= 1) {
          clickFlashes.splice(index, 1);
          continue;
        }

        const eased = 1 - Math.pow(1 - progress, 3);
        const maxRadius =
          Math.hypot(
            Math.max(flash.x, width - flash.x),
            Math.max(flash.y, height - flash.y),
          ) * flash.reach;
        const radius = maxRadius * eased;
        const alpha = (1 - progress) * flash.strength;

        context.save();
        context.globalCompositeOperation = "lighter";
        context.lineWidth = Math.max(
          2,
          12 * flash.strength * (1 - progress * 0.55),
        );
        context.strokeStyle = `rgba(255, 247, 218, ${0.68 * alpha})`;
        context.beginPath();
        context.arc(flash.x, flash.y, Math.max(1, radius), 0, Math.PI * 2);
        context.stroke();

        context.fillStyle = `rgba(255, 225, 154, ${0.09 * alpha})`;
        context.beginPath();
        context.arc(
          flash.x,
          flash.y,
          Math.max(1, radius * 0.55),
          0,
          Math.PI * 2,
        );
        context.fill();

        if (flash.reach > 0.95) {
          const wash = context.createRadialGradient(
            flash.x,
            flash.y,
            0,
            flash.x,
            flash.y,
            radius * 0.86,
          );
          wash.addColorStop(0, `rgba(255, 255, 246, ${0.16 * alpha})`);
          wash.addColorStop(0.34, `rgba(255, 215, 150, ${0.07 * alpha})`);
          wash.addColorStop(1, "rgba(255, 255, 255, 0)");
          context.fillStyle = wash;
          context.fillRect(0, 0, width, height);
        }
        context.restore();
      }
    }

    function detonateAttractorPulse() {
      // Clicks are local energy injections. The first click turns sufficiently
      // hot particles in range into diffraction stars; repeated clicks over the
      // same region double the brightness of stars that already exist there.
      const now = performance.now();
      if (now < nextClickAllowedAt) {
        return;
      }

      if (now - lastClickAt > 1200) {
        clickChain = 0;
      }

      clickChain = Math.min(4, clickChain + 1);
      const chainLevel = clickChain;
      lastClickAt = now;
      nextClickAllowedAt = now + 80 * Math.pow(1.45, chainLevel - 1);

      const pulseCenterX = mouseGlow.active ? mouseGlow.x : attractor.x;
      const pulseCenterY = mouseGlow.active ? mouseGlow.y : attractor.y;
      const pulseRadius =
        chainLevel < 4
          ? mouseGlow.radius * (0.9 + chainLevel * 0.28)
          : mouseGlow.radius * 3.2;
      const pulseRadiusSquared = pulseRadius * pulseRadius;
      const chainScale =
        chainLevel < 4 ? 0.16 * Math.pow(1.75, chainLevel - 1) : 4.2;
      clickBurst = Math.max(
        clickBurst,
        chainLevel < 4 ? 0.045 * chainScale : 1,
      );
      const flashReach = chainLevel < 4 ? 0.16 + chainLevel * 0.1 : 1.08;
      const flashStrength = chainLevel < 4 ? 0.16 + chainLevel * 0.08 : 1;
      const flashDuration = chainLevel < 4 ? 240 + chainLevel * 45 : 560;
      spawnClickFlash(
        pulseCenterX,
        pulseCenterY,
        flashStrength,
        flashReach,
        flashDuration,
      );
      if (chainLevel >= 4) {
        explosionUntil = now + 1300;
        clickChain = 0;
        nextClickAllowedAt = now + 220;
      }

      particles.forEach((point) => {
        const px = attractor.x + point.x * 0.01;
        const py = attractor.y + point.y * 0.01;
        const dx = px - pulseCenterX;
        const dy = py - pulseCenterY;
        const distanceSquared = dx * dx + dy * dy;
        if (distanceSquared >= pulseRadiusSquared) {
          return;
        }

        const falloff = 1 - distanceSquared / pulseRadiusSquared;
        const burst = falloff * falloff * falloff;
        const explosiveGain =
          chainLevel < 4
            ? (0.12 + burst * 0.55) * chainScale
            : (2.4 + burst * 14) * chainScale;
        point.energy = Math.min(point.energy + explosiveGain, 1e8);
        point.heat = Math.min(
          (point.heat || 0) +
            (chainLevel < 4 ? 0.06 : 1.2) +
            burst * (chainLevel < 4 ? 0.22 : 4.2) * chainScale,
          24,
        );
        const clickTemperature = energyToTemperature(
          point.energy + (point.heat || 0) * 0.11,
        );
        if (clickTemperature >= 6000) {
          const wasStar = (point.starScale || 1) > 1.05;
          point.canBecomeStar = true;
          point.starScale = Math.max(point.starScale || 1, 3.2 + burst * 1.4);
          point.starBrightness = wasStar
            ? Math.min((point.starBrightness || 1) * 2, 64)
            : 1;
        }
      });
    }

    function drawBloomSegment(point, energy, x1, y1, x2, y2) {
      return;
    }

    function starPowerForScale(insistenceScale) {
      return clamp(Math.log2(Math.max(1, insistenceScale)) / 5, 0, 1);
    }

    function drawDiffractionStar(
      point,
      energy,
      temperature,
      x,
      y,
      radiance,
      insistenceScale,
    ) {
      // Hubble-like diffraction spikes: two fixed axes create four points.
      // A particle only becomes visually stellar above 6000K.
      const temperaturePower = clamp((temperature - 6000) / 2400, 0, 1);
      const starPower = starPowerForScale(insistenceScale) * temperaturePower;
      if (starPower <= 0.02) {
        return;
      }

      const easedStar = starPower * starPower * (3 - 2 * starPower);
      const starBrightness = clamp(point.starBrightness || 1, 1, 64);
      const brightnessLift = Math.log2(starBrightness);
      const spikeLength = clamp(
        5 + easedStar * (120 + radiance * 42 + brightnessLift * 9),
        3,
        220,
      );
      const coreRadius = clamp(1 + easedStar * 16, 1, 18);
      const color = colorForPoint(
        point,
        energy + brightnessLift * 0.18,
        clamp(0.12 + easedStar * (0.52 + brightnessLift * 0.08), 0, 1),
      );

      context.save();
      context.globalCompositeOperation = "lighter";
      context.strokeStyle = color;
      context.lineCap = "round";

      for (let spike = 0; spike < 2; spike += 1) {
        const angle = -Math.PI / 2 + spike * (Math.PI / 2);
        const dx = Math.cos(angle) * spikeLength;
        const dy = Math.sin(angle) * spikeLength;
        const width =
          (spike === 0 ? 1.08 : 0.86) *
          (0.25 + easedStar * (1.45 + brightnessLift * 0.22));

        context.lineWidth = width;
        context.beginPath();
        context.moveTo(x - dx, y - dy);
        context.lineTo(x + dx, y + dy);
        context.stroke();
      }

      context.fillStyle = colorForPoint(
        point,
        energy + brightnessLift * 0.18,
        clamp(0.1 + easedStar * (0.42 + brightnessLift * 0.08), 0, 1),
      );
      context.beginPath();
      context.arc(x, y, coreRadius, 0, Math.PI * 2);
      context.fill();
      context.restore();
    }

    function drawParticleSegment(point, x1, y1, x2, y2, energy, bloomEligible) {
      const temperature = energyToTemperature(energy);
      const radiance = temperatureRadiance(temperature);
      const rawInsistenceScale = Math.max(
        point.insistenceScale || 1,
        point.starScale || 1,
      );
      const isStarTemperature = temperature >= 6000;
      const insistenceScale = isStarTemperature ? rawInsistenceScale : 1;
      const insistenceGlow = Math.log2(insistenceScale);
      const starPower = starPowerForScale(insistenceScale);
      const visibleStarPower =
        starPower * clamp((temperature - 6000) / 2400, 0, 1);
      const trailFade = 1 - visibleStarPower;
      const alpha = clamp(
        (lerp(0.42, 0.98, radiance) + insistenceGlow * 0.035) * trailFade,
        0,
        1,
      );
      const trailScale =
        1 + (radiance * 1.55 + insistenceGlow * 0.08) * trailFade;
      const tailX = x2 - (x2 - x1) * trailScale;
      const tailY = y2 - (y2 - y1) * trailScale;

      if (alpha > 0.02) {
        context.strokeStyle = colorForPoint(point, energy, alpha);
        context.lineWidth =
          (0.74 + 2.2 * radiance) * lerp(insistenceScale, 1, visibleStarPower);
        context.beginPath();
        context.moveTo(tailX, tailY);
        context.lineTo(x2, y2);
        context.stroke();
      }
      drawDiffractionStar(
        point,
        energy,
        temperature,
        x2,
        y2,
        radiance,
        insistenceScale,
      );

      if (bloomEligible) {
        drawBloomSegment(point, energy, x1, y1, x2, y2);
      }

      return radiance;
    }

    function tuneParticleCount(timestamp, frameMs) {
      // Simple feedback controller: reduce particles when render cost exceeds
      // the measured frame budget, and slowly add them back when frames are cheap.
      if (
        prefersReducedMotion ||
        frame < 14 ||
        timestamp - particleTuning.lastAdjustment < 240
      ) {
        return;
      }

      const frameBudget = clamp(
        particleTuning.minObservedFrameMs * 0.82,
        6,
        14,
      );
      const tooExpensive = particleTuning.renderCostMs > frameBudget;

      if (tooExpensive) {
        setParticleCount(Math.max(particleTuning.min, particles.length * 0.8));
        particleTuning.stableFrames = 0;
        particleTuning.lastAdjustment = timestamp;
        return;
      }

      if (particleTuning.renderCostMs < frameBudget * 0.7) {
        particleTuning.stableFrames += 1;
      } else {
        particleTuning.stableFrames = 0;
      }

      if (
        particleTuning.stableFrames >= 10 &&
        particles.length < particleTuning.max
      ) {
        setParticleCount(
          Math.min(
            particleTuning.max,
            particles.length + Math.max(120, particles.length * 0.16),
          ),
        );
        particleTuning.stableFrames = 0;
        particleTuning.lastAdjustment = timestamp;
      }
    }

    function render(timestamp = performance.now()) {
      const startedAt = performance.now();
      const previousTimestamp = particleTuning.lastTimestamp || timestamp;
      const frameMs = Math.max(1, timestamp - previousTimestamp);
      particleTuning.lastTimestamp = timestamp;
      if (frameMs < particleTuning.minObservedFrameMs && frameMs > 4) {
        particleTuning.minObservedFrameMs = frameMs;
      }

      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      const baseAttractorX = width * 0.72;
      const baseAttractorY = height * 0.52;
      const targetAttractorX = baseAttractorX;
      const targetAttractorY = baseAttractorY;
      const targetLooseness = clamp(
        attractorEnergy * 0.012 + retinaBurn * 0.5,
        0,
        1,
      );
      attractorLooseness = lerp(attractorLooseness, targetLooseness, 0.018);
      const attractorHeat = attractorLooseness;
      const attractorLerp = 0.03 + attractorHeat * 0.04;
      attractor.x = lerp(attractor.x, targetAttractorX, attractorLerp);
      attractor.y = lerp(attractor.y, targetAttractorY, attractorLerp);
      context.fillStyle = frame < 2 ? "#080b0e" : "rgba(8, 11, 14, 0.072)";
      context.fillRect(0, 0, width, height);
      drawGrid(width, height);

      const glowFade = mouseGlow.active ? 1 : 0;
      const glowRadiusSquared = mouseGlow.radius * mouseGlow.radius;
      const coreRadiusSquared = glowRadiusSquared * 0.03;
      const energizeRadiusSquared = glowRadiusSquared * 0.24;
      if (glowFade <= 0 && canvas.dataset.glow !== "off") {
        canvas.dataset.glow = "off";
      }
      drawMouseHalo(glowFade);

      const orbitSpeed = 0.00025 + attractorHeat * 0.00073;
      const orbit = frame * orbitSpeed;
      const cosOrbit = Math.cos(orbit);
      const sinOrbit = Math.sin(orbit);
      const scale = Math.min(width, height) * (0.022 + attractorHeat * 0.004);
      const centerX = attractor.x;
      const centerY = attractor.y;
      const cooling = Math.pow(0.5, frameMs / 1050);
      const frameScale = frameMs / (1000 / 60);
      const startupHeat = clamp(frame / startupWarmupFrames, 0, 1);
      const burstFade = clickBurst;
      clickBurst *= Math.pow(0.5, frameMs / 140);
      const insistenceRadiusSquared = 24 * 24;
      let hotParticles = 0;
      let bloomSegments = 0;
      let maxEnergy = 0;

      particles.forEach((point, index) => {
        const pulse =
          0.03 +
          0.035 *
            point.life *
            (0.5 + 0.5 * Math.sin(frame * 0.018 + point.pulse));
        let chargedThisFrame = false;
        let insistedThisFrame = false;
        let emittedLoss = 0;
        if (!point.canBecomeStar) {
          point.insistenceHold = 0;
          point.insistenceScale = 1;
        }
        const heatEnergy = (point.heat || 0) * 0.11;
        const clickRadiation = clickChain < 4 ? burstFade * 8 : burstFade * 26;
        const radiationPressure = clamp(
          (point.energy + heatEnergy + clickRadiation - eddingtonThreshold) /
            40,
          0,
          5,
        );
        for (let i = 0; i < 2; i += 1) {
          const previousX = point.x;
          const previousY = point.y;
          const previousZ = point.z;
          stepLorenz(point, attractorHeat);

          if (radiationPressure > 0) {
            const push = radiationPressure * 0.0018;
            const spread = radiationPressure * 0.0009;
            point.x += point.x * push;
            point.y += point.y * push;
            point.z += point.z * push * 0.72;
            point.x += (point.x - previousX) * spread;
            point.y += (point.y - previousY) * spread;
            point.z += (point.z - previousZ) * spread * 0.5;
          }

          const px = previousX * cosOrbit - previousZ * sinOrbit;
          const pz = previousX * sinOrbit + previousZ * cosOrbit;
          const nx = point.x * cosOrbit - point.z * sinOrbit;
          const nz = point.x * sinOrbit + point.z * cosOrbit;
          const x1 = centerX + px * scale;
          const y1 = centerY + (previousY - 14) * scale - pz * scale * 0.08;
          const x2 = centerX + nx * scale;
          const y2 = centerY + (point.y - 14) * scale - nz * scale * 0.08;
          let glowPower = 0;

          if (glowFade > 0) {
            const middleX = (x1 + x2) * 0.5;
            const middleY = (y1 + y2) * 0.5;
            const distanceX = middleX - mouseGlow.x;
            const distanceY = middleY - mouseGlow.y;
            const distanceSquared =
              distanceX * distanceX + distanceY * distanceY;

            if (distanceSquared < glowRadiusSquared) {
              const falloff = 1 - distanceSquared / glowRadiusSquared;
              glowPower = falloff * falloff * falloff * glowFade;
              if (
                point.canBecomeStar &&
                !insistedThisFrame &&
                distanceSquared < insistenceRadiusSquared
              ) {
                const insistenceProximity =
                  1 - distanceSquared / insistenceRadiusSquared;
                point.insistenceHold = Math.min(
                  10,
                  (point.insistenceHold || 0) +
                    (frameMs / 1000) * (0.68 + insistenceProximity * 0.32),
                );
                insistedThisFrame = true;
              }
              if (
                distanceSquared < coreRadiusSquared &&
                (point.heat || 0) > 0.22
              ) {
                point.hoverCharge = Math.min(
                  8,
                  (point.hoverCharge || 0) + falloff * 0.03,
                );
              }
              if (
                !chargedThisFrame &&
                distanceSquared < energizeRadiusSquared
              ) {
                const hoverBoost =
                  distanceSquared < coreRadiusSquared
                    ? point.hoverCharge * 0.004
                    : 0;
                doubleHotParticle(point, 0.42 * glowPower + hoverBoost);
                chargedThisFrame = true;
              }
              perturbParticle(point, glowPower * 0.72, scale);
            }
          }

          const drawEnergy = Math.max(
            0,
            point.energy +
              pulse +
              heatEnergy +
              (clickChain < 4 ? burstFade * 0.12 : burstFade * 0.9),
          );
          const bloomEligible = drawEnergy > 0.18 && i === 1 && index % 2 === 0;
          if (bloomEligible) {
            bloomSegments += 1;
          }
          const emittedRadiance = drawParticleSegment(
            point,
            x1,
            y1,
            x2,
            y2,
            drawEnergy,
            bloomEligible,
          );
          emittedLoss +=
            emittedRadiance *
            (0.017 + 0.012 * point.life) *
            (0.7 + 0.35 * frameScale);
        }

        point.energy = Math.max(
          0,
          point.energy * cooling - emittedLoss - radiationPressure * 0.12,
        );
        point.heat = Math.max(
          0,
          (point.heat || 0) * Math.pow(0.5, frameMs / 5200) -
            emittedLoss * 0.01,
        );
        point.hoverCharge = Math.max(
          0,
          (point.hoverCharge || 0) * Math.pow(0.5, frameMs / 650),
        );
        if (!insistedThisFrame) {
          point.insistenceHold = Math.max(
            0,
            (point.insistenceHold || 0) - frameMs / 700,
          );
        }
        const particleTemperature = energyToTemperature(
          point.energy + (point.heat || 0) * 0.11,
        );
        const insistenceSeconds =
          point.canBecomeStar && particleTemperature >= 6000
            ? clamp((point.insistenceHold || 0) - 5, 0, 5)
            : 0;
        const targetInsistenceScale = Math.pow(2, insistenceSeconds);
        point.insistenceScale = lerp(
          point.insistenceScale || 1,
          targetInsistenceScale,
          0.12,
        );
        point.energy +=
          0.00016 *
            point.life *
            (0.5 + 0.5 * Math.sin(frame * 0.01 + point.pulse)) +
          (clickChain < 4 ? burstFade * 0.008 : burstFade * 0.06);
        if (point.energy < 0.015) {
          point.energy = 0;
        } else {
          hotParticles += 1;
        }
        maxEnergy = Math.max(maxEnergy, point.energy);

        if (Math.abs(point.x) > 60 || Math.abs(point.y) > 72 || point.z > 96) {
          point.x = -12 + Math.random() * 24;
          point.y = -14 + Math.random() * 28;
          point.z = 8 + Math.random() * 24;
          point.energy = Math.min(point.energy, 0.2);
          point.insistenceHold = 0;
          point.insistenceScale = 1;
          point.starScale = 1;
          point.starBrightness = 1;
        }
      });

      const explosionActive = performance.now() < explosionUntil;
      const sceneRadiance = explosionActive
        ? (startupHeat + burstFade * 0.7) *
          (maxEnergy > 0.18
            ? temperatureRadiance(energyToTemperature(maxEnergy))
            : 0)
        : 0;
      attractorEnergy = attractorEnergy * 0.84 + maxEnergy * 0.16;
      const hotCharge = particles.reduce(
        (sum, point) => sum + Math.min(1, point.hoverCharge || 0),
        0,
      );
      const superHot =
        explosionActive &&
        (maxEnergy > 24 ||
          sceneRadiance > 0.72 ||
          retinaBurn > 0.85 ||
          hotCharge > 2600);
      document.body.dataset.superhot = superHot ? "on" : "off";
      retinaBurn = Math.max(
        retinaBurn * Math.pow(0.5, frameMs / 1800),
        sceneRadiance * 1.15,
      );
      if (sceneRadiance > 0.02) {
        context.save();
        context.globalCompositeOperation = "lighter";
        const sceneColor = blackbodyRgb(energyToTemperature(maxEnergy));
        const sceneGlow = context.createRadialGradient(
          centerX,
          centerY,
          0,
          centerX,
          centerY,
          Math.hypot(width, height) * 0.95,
        );
        sceneGlow.addColorStop(
          0,
          `rgba(${sceneColor.r}, ${sceneColor.g}, ${sceneColor.b}, ${0.18 * sceneRadiance})`,
        );
        sceneGlow.addColorStop(
          0.35,
          `rgba(${sceneColor.r}, ${sceneColor.g}, ${sceneColor.b}, ${0.08 * sceneRadiance})`,
        );
        sceneGlow.addColorStop(1, "rgba(255,255,255,0)");
        context.fillStyle = sceneGlow;
        context.fillRect(0, 0, width, height);
        context.restore();
      }

      if (retinaBurn > 0.01) {
        const burn = exposureCurve(retinaBurn * 2.35);
        const edgeFade = 1 - Math.max(0, Math.min(1, retinaBurn * 0.68));
        context.save();
        context.globalCompositeOperation = "lighter";
        context.globalAlpha = 0.82 * burn;
        const flash = context.createRadialGradient(
          centerX,
          centerY,
          Math.min(width, height) * 0.04,
          centerX,
          centerY,
          Math.hypot(width, height) * 0.88,
        );
        flash.addColorStop(0, `rgba(255, 255, 248, ${0.98 * burn})`);
        flash.addColorStop(0.18, `rgba(255, 244, 208, ${0.72 * burn})`);
        flash.addColorStop(0.46, `rgba(255, 214, 140, ${0.36 * burn})`);
        flash.addColorStop(1, `rgba(255, 255, 255, ${0.06 * burn * edgeFade})`);
        context.fillStyle = flash;
        context.fillRect(0, 0, width, height);
        context.restore();
      }

      drawClickFlashes(width, height, timestamp);

      particleTuning.renderCostMs =
        particleTuning.renderCostMs * 0.86 +
        (performance.now() - startedAt) * 0.14;
      canvas.dataset.frameCost = particleTuning.renderCostMs.toFixed(2);
      canvas.dataset.frameInterval = frameMs.toFixed(2);
      canvas.dataset.hotParticles = hotParticles;
      canvas.dataset.bloomSegments = bloomSegments;
      canvas.dataset.maxEnergy = maxEnergy.toFixed(3);
      canvas.dataset.retinaBurn = retinaBurn.toFixed(3);
      canvas.dataset.attractorX = attractor.x.toFixed(2);
      canvas.dataset.attractorY = attractor.y.toFixed(2);
      tuneParticleCount(timestamp, frameMs);

      frame += 1;
      if (!prefersReducedMotion) {
        window.requestAnimationFrame(render);
      }
    }

    window.addEventListener("pointermove", updateMouseGlow, { passive: true });
    window.addEventListener(
      "pointerdown",
      (event) => {
        mouseGlow.pressed = true;
        updateMouseGlow(event);
        detonateAttractorPulse();
      },
      { passive: true },
    );
    window.addEventListener(
      "pointerup",
      (event) => {
        mouseGlow.pressed = false;
        if (isTouchLikePointer(event)) {
          hideMouseGlow();
        }
      },
      { passive: true },
    );
    window.addEventListener("pointercancel", hideMouseGlow, { passive: true });
    window.addEventListener("pointerleave", hideMouseGlow);
    window.addEventListener("blur", hideMouseGlow);
    window.addEventListener("resize", resizeCanvas);
    resizeCanvas();
    render();

    return {
      resize: resizeCanvas,
    };
  }

  BackgroundEffects.mountLorenzAttractor = mountLorenzAttractor;
})();
