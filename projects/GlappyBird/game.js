var birdY = 50;
var birdA = 0;
var dt = 0.2;
var g = 10;
var running = true;
var lost = false;
var maxPoints = 0;
var TIME = 0;

var points = 0;

var DEBUG = false;

DIRECTION_UP = 0;
DIRECTION_DOWN = 1;

var pipes;
var bird;
var clouds;
var backgroundThings;

function onDebug(x) {
  if (DEBUG) {
    x()
  }
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  startGame();
}

function startGame() {
  points = 0;
  running = true;
  lost = false;
  clouds = makeClouds();
  pipes = [
    makePipeGroup(windowWidth / 2),
    makePipeGroup(windowWidth)
  ];

  backgroundThings = [
    new Mountains(0, windowHeight),
    new Mountains(windowWidth, windowHeight),
    new Grass(0, windowHeight - 200),
    new Grass(windowWidth - 200, windowHeight - 200),
    new Vacoelho(Math.random() * windowWidth, windowHeight - 200)
  ];
  bird = new Bird(300, 100);

}

function makePipeGroup(x) {
  var wH20 = windowHeight * 0.1;
  var gapPosY = wH20 + Math.random() * (3 * wH20);
  var gapSize = Math.random() * wH20 + 160;

  return new PipeGroup(
    120,
    gapPosY,
    gapSize,
    x
  );

}

function makeClouds() {
  let number = Math.round(Math.random() * 100);
  return Array(10).fill(10).map(n => {
    return new Cloud()
  });
}

function draw() {

  TIME++;

  background(50, 150, 255);

  backgroundThings.forEach(t => {
    t.step();
    t.show();
  });

  showClouds();

  bird.step();
  bird.show();

  for (var i = 0; i < pipes.length; i++) {
    var destroyPype = handlePipe(pipes[i]);
    if (destroyPype) {
      pipes[i] = makePipeGroup(windowWidth + 20);
    }
  }
  pipes.forEach(p => {

    if (p.colides(bird.x, bird.y)) {
      gameLost();
    }

    p.step();
    p.show();

  });

  if (bird.y < 0 || bird.y > windowHeight) {
    gameLost();
  }

  drawScore();

  if (lost) {
    drawScoreBoard();
  }

}

function drawScore() {
  push();
  strokeWeight(3);
  textAlign(CENTER);
  textStyle(BOLD);
  textSize(60);
  stroke(255, 255, 255);
  text(points, windowWidth / 2, windowHeight / 10);
  pop();
}

function showClouds() {
  clouds.forEach(c => {
    c.step();
    c.show();
  });
}

function handlePipe(pipe) {

  pipe.step();
  pipe.show();

  if (pipe.score && pipe.x() + 50 < bird.x) {
    points++;
    pipe.overcome();
  }

  if (pipe.x() < -100) {
    return true;
  } else {
    return false;
  }

  if (pipe.colides(bird.x, bird.y)) {
    gameLost();
  }

}

function gameLost() {
  running = false;
  lost = true;

  if (maxPoints < points) {
    maxPoints = points;
  }

}

function drawScoreBoard() {
  push();
  fill(255);
  stroke(50);

  let h = windowHeight / 10;
  let w = windowWidth / 10;

  rect(w, h, w * 8, h * 8);

  strokeWeight(3);
  textAlign(CENTER);
  textStyle(BOLD);
  textSize(60);
  fill(0);

  text(`SCORE: ${points}`, w * 5, h * 3);
  text(`YOUR RECORD IS ${maxPoints}`, w * 5, h * 5);
  text("PRESS TO TRY AGAIN", w * 5, h * 8);

  pop();
}

function mouseClicked() {
  if (running) {
    bird.flap();
  }
  if (lost) {
    startGame();
  }
}

function keyPressed() {
  onDebug(() => console.log(`key=${key} keyCode=${keyCode}`, 100, 100));
  if (keyCode === 32) {
    running = !running;
  } else if (keyCode === 68) {
    DEBUG = !DEBUG;
  }
}

class Mountains {
  constructor(x, y, distance) {
    this.img = loadImage(`./img/mountain.png`);
    this.distance = distance;
    this.x = x;
    this.y = y;
  }

  show() {
    image(this.img, this.x, this.y - 400, 300, 300);
  }

  step() {
    if (!running) {
      return;
    }

    this.x = this.x - 0.2;

    if (this.x < -windowWidth) {
      this.x = windowWidth + 300;
    }
  }
}

class Vacoelho {
  constructor(x, y, distance) {
    this.img = loadImage(`./img/vacoelho.png`);
    this.distance = distance;
    this.x = x;
    this.y = y;
  }

  show() {
    push();
    translate(this.x,this.y);
    rotate(this.v);
    image(this.img, 0, 0, 100, 100);
    pop();
  }

  step() {
    if (!running) {
      return;
    }

    this.v = Math.cos((TIME / 10)%180)*0.5;


    this.x = this.x + this.v;
    this.y += this.v * 5;

    if (this.x < -windowWidth) {
      this.x = windowWidth + 300;
    }
  }

}

class Grass {
  constructor(x, y, distance) {
    this.img = loadImage("./img/grass.png");
    this.distance = distance;
    this.x = x;
    this.y = y;
  }

  show() {
    image(this.img, this.x, this.y, windowWidth, windowHeight / 5);
  }

  step() {
    if (!running) {
      return;
    }

    this.x = this.x - 1;

    if (this.x < -windowWidth) {
      this.x = windowWidth + 300;
    }
  }

}

class Cloud {
  constructor() {
    var type = Math.trunc(Math.random() * 6 + 1);
    this.img = loadImage(`./img/clouds/c${type}.png`);
    this.x = Math.random() * windowWidth;
    this.y = Math.random() * windowHeight;
    this.size = Math.random() * 5;
    this.width = Math.random() * 100 + 100;
    this.height = Math.random() * 100 + 50;
    this.makeV();
  }

  makeV() {
    this.v = (Math.random() * 10) / (this.y / 100);
  }

  shuffle() {
    this.y = Math.random() * windowHeight;
    this.x = windowWidth + 50;
    this.makeV();
  }

  show() {
    image(this.img, this.x, this.y, this.width, this.height);
  }

  step() {
    if (!running) {
      return;
    }

    this.x = this.x - this.v;

    if (this.x < -300) {
      this.shuffle();
    }
  }
}

class Bird {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.v = 0;
    this.img = loadImage("img/gird.png");
    this.size = 80;
    this.forceUp = 0;
  }

  show() {
    var ss = this.size / 2;
    var r = Math.tan(Math.sign(this.v) * (this.v * this.v) / 10000);
    push();
    translate(this.x, this.y);
    rotate(r);
    image(this.img, -ss, -ss, this.size, this.size);
    pop();
  }

  step() {
    if (!running) {
      return;
    }

    var fu = 0;
    if (this.forceUp > 0) {
      fu = this.forceUp / 5;
      this.forceUp -= fu;
    }

    this.v = this.v + (g - fu) * dt;
    this.y = this.y + this.v * dt;
    onDebug(() => {
      this.y = mouseY;
      this.v = 0
    });
  }

  flap() {
    this.forceUp += 400;
  }
}

class PipeGroup {

  constructor(width, gapPosY, gapSize, x) {

    var extraHeight = 20;
    this.score = true;

    this.pipes = [
      new Pipe(width, gapPosY + extraHeight, x, -extraHeight, DIRECTION_DOWN),
      new Pipe(width, windowHeight - gapPosY, x, gapPosY + gapSize, DIRECTION_UP)
    ];
  }

  overcome() {
    this.score = false;
  }

  show() {
    this.pipes.forEach(p => p.show());
  }

  step() {
    this.pipes.forEach(p => p.step());
  }

  colides(x, y) {
    return this.pipes.some(p => p.colides(x, y));
  }

  x() {
    return this.pipes[0].x;
  }
}

class Pipe {
  constructor(width, height, x, y, direction) {
    // Todo this should be static from the class not something per object
    this.pipeHead = loadImage("./img/pipeHead.png");
    this.pipeBody = loadImage("./img/pipeBody.png");

    this.height = height;
    this.x = x;
    this.y = y;
    this.width = width;
    this.direction = direction;
  }

  show() {
    let headHeight = this.width / 2;
    push();
    var border = this.width / 15;
    if (this.direction === DIRECTION_UP) {
      image(this.pipeBody, this.x + border, this.y, this.width - border * 2, this.height);
      image(this.pipeHead, this.x, this.y, this.width, headHeight);
      onDebug(() => {
        text(`${this.x}, ${this.y}`, this.x, this.y);
      });
    } else {
      image(this.pipeBody, this.x + border, this.y, this.width - border * 2, this.height);
      image(this.pipeHead, this.x, this.y + this.height - headHeight, this.width, headHeight);
      onDebug(() => {
        text(`${this.x}, ${this.y + this.height}`, this.x, this.y + this.height);
      });
    }

    onDebug(() => {
      noFill();
      stroke(255, 0, 0);
      rect(this.x, this.y, this.width, this.height);
    });
    pop();
  }

  step() {
    if (!running) {
      return;
    }

    this.x -= 1.5;
  }

  colides(x, y) {
    return x > this.x && x < (this.x + this.width) && (y > this.y && y < this.y + this.height);
  }

}

