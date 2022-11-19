let seed = new Date().getTime();
let debug = false;
let step = 0;
let maxSteps = 100;
let run = true;
let width;
let height;
let maxPosY = 0;
let startHeight = 50;
let groundY;
let winnerPath = null;
let fc = 0;
let strikeGlowFrame = 0;
let strikeDuration = 0;
let strikeGlowDuration = 10;
let crazyMode = false;
let lastFrameNewNode = 0;
// let maxActiveBranches = 100;
let activeBranches = 0;

function setup() {
  frameRate(60);
  width = window.innerWidth;
  height = window.innerHeight;
  createCanvas(width, height);
  angleMode(DEGREES);

  groundY = height / 5 * 4;

}

function getBranches(depth, rng, goingAngle) {

  // if (activeBranches > maxActiveBranches) {
  //   return 0;
  // }

  if (winnerPath) {
    if (depth >= winnerPath.length) {
      return 0;
    }
  }

  if (goingAngle < 10) {
    return 1 + (rng.quick() * 1.1);
  }

  if (depth < 10) {
    return 0.9 + (rng.quick() * 1.1);
  }
  if (depth < 20) {
    return 0.6 + (rng.quick() * 2);
  }
  if (depth < 50) {
    return 0.7 + (rng.quick() * 1.1);
  }
  if (depth < 70) {
    return 0.5 + (rng.quick() * 1.8);
  }

  return 0;

}

function raio(ttl, maxTtl, mySeed, goingAngle, previousPosY, previousPath) {

  activeBranches++;
  push();

  const depth = maxTtl - ttl;
  const rng = new Math.seedrandom(mySeed + depth);

  const maxSpread = 25;

  let angle = (sin(rng.quick() * 360)) * maxSpread;
  let newGoingAngle = goingAngle + angle;

  let size = (360 - Math.abs(Math.min(newGoingAngle * 2, 360)) * rng.quick()) / 10;

  let branches = Math.floor(getBranches(depth, rng, newGoingAngle));
  let weight = 1;
  let alpha = 255;
  if (ttl > 0) {
    alpha = Math.max(255 - (ttl * 10), 0);
  } else {
    weight = 4;
  }

  let color = [ 255, 255, 255, alpha ];

  const effectiveSize = cos(newGoingAngle) * size;
  const posY = previousPosY + effectiveSize;

  if (posY > maxPosY) {
    maxPosY = posY;
  }

  const step = {
    angle: angle,
    size: size
  };

  const myPath = previousPath.slice();
  myPath.push(step);

  if (!winnerPath && posY > groundY) {
    winnerPath = myPath;
  }

  drawLightningNode(angle, size, color, weight);

  if (ttl > 0) {
    const newTtl = ttl - 1;
    for (let i = 0; i < branches; i++) {
      if (i === 0) {
        lastFrameNewNode = frameCount;
      }
      raio(newTtl, maxTtl, rng.quick(), newGoingAngle, posY, myPath);
    }
  }
  pop();
  activeBranches--;

}

function mouseClicked() {
  run = !run;
  console.log('RUN', run);
}

function doubleClicked() {
  start();
}

function draw() {

  if (!run) {
    return;
  }

  console.log(`STEP=${step}`);

  fc++;

  if (step >= maxSteps) {
    start();
  }

  background(0);

  const groundSteps = 40;
  const groundStart = height / 4 * 3;
  const groundStepSize = height / 4 / groundSteps;

  push();
  for (let i = 0; i < groundSteps; i++) {
    const slicePosStart = (groundStart + groundStepSize * i);
    const slicePosEnd = (groundStart + groundStepSize * (i + 1));
    noStroke();
    fill(0, i * 2, 0);
    rect(0, slicePosStart, width, slicePosEnd, 0,);
  }
  pop();

  push();
  stroke(255, 255, 255);
  translate(width / 2, startHeight);
  rotate(90);

  const steps = Math.min(step, maxSteps);

  raio(steps, steps, seed, 0, startHeight, []);
  step = step + 1;

  if (winnerPath) {
    winnerPath.forEach((step, i) => {

      const opacity = ((strikeDuration - strikeGlowFrame) / strikeDuration) + Math.random() * 30;
      const nodeWeight = 3 + sin(strikeGlowFrame * 10 + i * 20) * 2;
      drawLightningNode(step.angle, step.size, [ 255, 255, 255, 255 * opacity ], nodeWeight);
    });
  }
  pop();

  if (winnerPath) {

    if (strikeGlowFrame <= strikeGlowDuration) {
      fill(255, 255, 255, 255 * Math.random());
      rect(0, 0, width, height);
    }

    if (strikeGlowFrame > strikeGlowDuration + 10) {

      start();
    }

    strikeGlowFrame++;

  }

  onDebug(() => {
    strokeWeight(1);
    stroke(255, 255, 0);
    line(0, groundY, width, groundY);
    stroke(255, 0, 0);

    line(0, maxPosY, width, maxPosY);
  });

  if (crazyMode) {

    if (lastFrameNewNode + 20 < frameCount) {
      start();
    }

  }

}

function onDebug(f) {
  if (debug) {
    f();
  }
}

function drawLightningNode(angle, size, color, weight) {
  stroke(color);
  strokeWeight(weight);
  rotate(angle);
  line(0, 0, size, 0);
  translate(size, 0);
}

function start() {
  console.clear();
  console.log('START');
  maxPosY = 0;
  strikeGlowDuration = 10 + Math.random() * 25;
  strikeDuration = 15 + Math.random() * 25;
  strikeGlowFrame = 0;
  seed = seed + 1;
  winnerPath = null;
  step = 0;
}