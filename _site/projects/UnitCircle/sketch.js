let A = 0;
let fr = 60;
let loopTime = 60;
let offset = (360 / loopTime) / fr;

let s = 10;
let halfW;
let halfH;

let halfMin;

let r;

let history = [];
let historySize = 300;
let st = 0;
let aRad;

let width;
let height;

let speed = 0.2;

let colorSin = 'rgba(80%,0%,0%,0.5)';
let colorCos = 'rgba(0%,80%,0%,0.5)';
let colorHip = 'rgba(0%,0%,80%,0.5)';
let colorThetaNormal = 'rgba(0%,80%,80%,0.5)';
let colorThetaLocked = 'rgba(40%,80%,80%,0.5)';
let colorTheta = colorThetaNormal;

let getAngle = angleByMouse;
let mouseAngleLocked = false;
let integerStick = false;

function angleByTime() {
  A += speed;
  if (A >= 360) {
    A -= 360;
  } else if (A < 0) {
    A += 360;
  }
}

function angleByMouse() {

  if (mouseAngleLocked) {
    return A;
  }

  let toDegrees = 180 / Math.PI;
  let mw = width / 2;
  let mh = height / 2;
  let x = mouseX - mw;
  let y = mh - mouseY; // Coordinates on screen on Y axis are inverted.
  let h = Math.sqrt(x * x + y * y);
  let ys = Math.sign(y);
  A = ys * Math.acos(x / h) * toDegrees;

  if(integerStick){
    A = Math.round(A);
  }

}

function updateAngleMode() {

  $("#mouse-configuration").hide();
  $("#time-configuration").hide();

  if ($("#mode-time")[0].checked) {
    mouseAngleLocked = false;
    $("#time-configuration").show();
    getAngle = angleByTime;
  } else {
    $("#mouse-configuration").show();
    getAngle = angleByMouse;
  }

}

function updateIntegerStick(){
  integerStick = !integerStick;
}
function setupButtons() {

  $("#mode-mouse").change(updateAngleMode);
  $("#integer-lock").change(updateIntegerStick);
  $("#mode-time").change(updateAngleMode);

  $("#speed").on("input", () => {

    let x = parseFloat($("#speed").val());
    let y = Math.pow(0.1 * x, 3);
    console.log(x, y);
    speed = parseFloat(y.toFixed(4));

    console.log(Date(), speed, y, x);

    let realSpeed = (fr * speed).toFixed(2) + "º/s";

    $("#currentSpeed").text(realSpeed);

  })
}

function setup() {
  updateAngleMode();
  setupButtons();

  for (let i = 0; i < historySize; i++) {
    history[i] = {cos: 0, sin: 0, theta: 0};
  }

  A = map(new Date().getSeconds(), 0, 60, 0, 360);
  angleMode(DEGREES);

  frameRate(fr);


}

function draw() {

  width = window.innerWidth;
  height = window.innerHeight;
  createCanvas(width, height);

  halfW = width / 2;
  halfH = height / 2;
  halfMin = Math.min(halfW, halfH);
  r = halfMin / 2;

  aRad = (Math.PI / 180) * A;

  getAngle();

  background(200);
  drawBoard();

  drawScale();
  drawChart(A);
  drawTrig(A);
  drawHistory(A);

}

function drawTrig(A) {
  push();

  translate(halfW, halfH);

  strokeWeight(2);
  let sin = Math.sin(aRad);
  let cos = Math.cos(aRad);

  stroke(colorSin);
  line(cos * r, 0, cos * r, -sin * r);
  let sinText = sin.toFixed(4);
  fill(255, 100, 100);
  noStroke();
  let sinTextOffset = A < 90 || A > 270 ? - 100:0;


  text("sin(θ): " + sinText, cos * r + 5 + sinTextOffset, -sin * r / 2);

  stroke(colorCos);
  fill(100, 225, 100);
  line(0, 0, cos * r, 0);
  let cosText = cos.toFixed(4);
  noStroke();
  text("cos(θ): " + cosText, cos * r / 2 - 50, 20);

  noStroke();

  pop();
}

function drawEvent(e, t, s) {

  let h = s;
  push();

  let posT = historySize + t;

  stroke(colorSin);
  line(posT, h, posT, h - e.sin * s / 4);

  h += s;

  stroke(colorCos);
  line(posT, h, posT, h - e.cos * s / 4);

  h += s;
  stroke(colorTheta);
  let theta = map(e.theta, 0, 360, 0, s / 4);
  line(posT, h, posT, h - theta);

  pop();

}

function drawHistory(A) {

  let h = height / 4;

  let event = {
    sin: Math.sin(aRad),
    cos: Math.cos(aRad),
    theta: A
  };

  history[st] = event;

  push();
  translate(10, 10);

  drawEvent(event, 0, h);

  let j = -1;
  let i = st;
  for (; i > 0; i--, j--) {
    drawEvent(history[i], j, h);
  }

  i = historySize - 1;
  for (; i > st; i--, j--) {
    drawEvent(history[i], j, h);
  }

  st++;
  if (st > historySize) {
    st = 0;
  }

  pop();

}

function mouseClicked() {
  if (getAngle === angleByMouse) {
    mouseAngleLocked = !mouseAngleLocked;
  }

  if (mouseAngleLocked) {
    $("#mouse-lock").text("Click anywhere to unlock.");
    colorTheta = colorThetaLocked;
  } else {
    $("#mouse-lock").text("Click anywhere to lock.");
    colorTheta = colorThetaNormal;
  }

}

function drawChart(A) {

  let theta = -A;
  let angle = (A).toFixed(4);
  let pirad = (angle / 180).toFixed(4);

  push();
  translate(halfW, halfH);

  fill(50);
  ellipse(0, 0, 10, 10);

  push();
  fill(colorTheta);
  arc(0, 0, r / 3, r / 3, theta, 0);
  pop();

  push();
  rotate(theta);
  text("r : 1", r / 2, -5);

  push();

  fill('rgba(0%,0%,0%,0.5)');
  noStroke();
  rect(r + 20, -10, 190, 20);
  fill(255);
  text("θ: " + angle + "º (" + pirad + "π×rad)", r + 25, +5);
  pop();
  stroke(colorHip);
  strokeWeight(2);

  ellipse(r, 0, 5, 5);
  line(0, 0, r, 0);

  pop();

  pop();

}

function drawBoard() {
  push();

  stroke(150);
  ellipse(halfW, halfH, halfMin, halfMin);
  line(0, halfH, width, halfH);
  line(halfW, 0, halfW, height);

  fill(0);
  stroke(200);

  text("X", width - 50, halfH - s);
  text("Y", halfW + s, 50);

  translate(halfW, halfH);

  let steps = 10;
  let stepSize = r / steps;

  stroke(210, 210, 210);

  for (let i = -steps; i < steps; i++) {
    line(stepSize * i, -10, stepSize * i, 10);
    line(-10, stepSize * i, 10, stepSize * i);
  }

  text("1", r - s, -s);
  ellipse(r, 0, 5, 5);

  text("-1", -r, -s);
  ellipse(-r, 0, 5, 5);

  text("1", s, -r + 2 * s);
  ellipse(0, -r, 5, 5);

  text("-1", s, +r - s);
  ellipse(0, r, 5, 5);

  pop();
}

function drawScale() {
  push();
  translate(halfW, halfH);

  fill(0);
  stroke(0);

  for (let i = 0; i < 360; i += 1) {
    let size = 5;

    push();
    noStroke();
    if (i % 5 === 0 && !(i % 10 === 0)) {
      size = 10;
    }

    if (i % 10 === 0) {
      size = 20;
      text(i, r + size * 2, s / 2);
    }
    pop();

    line(r + 5, 0, r + 5 + size, 0);

    rotate(-1);
  }

  pop();
}

