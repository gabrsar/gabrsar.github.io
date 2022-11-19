var direction = 1;
var lastX = 0;
var lastY = 0;
var a = 0;
var noiseStrengthMultiplier = 0.1;
var velocityOffset;
var noiseIncrement = 0.01;
var maxCenterWanderDistance;
var lastCoordinates;
var curveDeviationOffset;
var curveCenterOffset;
var midScreen;
var curveSizeOffset;
function makeCanvas() {
    createCanvas(windowWidth, windowHeight);
    background(220);
    midScreen = createVector(windowWidth / 2, windowHeight / 2);
    maxCenterWanderDistance = Math.min(windowWidth, windowHeight) * 0.4;
}
function bigRandom(a) {
    if (a === void 0) { a = Math.pow(10, 9); }
    return Math.random() * a;
}
function startValues() {
    lastCoordinates = createVector(0, 0);
    curveDeviationOffset = createVector(bigRandom(), bigRandom());
    curveCenterOffset = createVector(bigRandom(), bigRandom());
    curveSizeOffset = createVector(bigRandom(), bigRandom());
    velocityOffset = bigRandom();
}
function setup() {
    startValues();
    makeCanvas();
    angleMode(DEGREES);
}
function windowResized() {
    makeCanvas();
}
function draw() {
    if (frameCount % 5 == 0) {
        background("rgba(220, 220, 220, 0.02)");
    }
    a++;
    var velocity = 4;
    var t = (a / 100 * velocity);
    if (t % 360 == 0) {
        direction *= -1;
        a = 0;
    }
    var baseCurveSize = createVector(noise(curveSizeOffset.x += 0.001), noise(curveSizeOffset.y += 0.001));
    var curveSize = createVector(0.6 + noise(curveDeviationOffset.x += 0.05) * noiseStrengthMultiplier, 0.4 + noise(curveDeviationOffset.y += 0.01) * noiseStrengthMultiplier);
    var curveCenter = createVector((-0.5 + noise(curveCenterOffset.x += noiseIncrement)) * maxCenterWanderDistance, (-0.5 + noise(curveCenterOffset.y += noiseIncrement)) * maxCenterWanderDistance);
    translate(midScreen.x, midScreen.y);
    var x = curveCenter.x + (direction * midScreen.x * curveSize.x * Math.cos(t));
    var y = curveCenter.y + (direction * midScreen.y * curveSize.y * Math.sin(t * 2));
    line(x, y, lastCoordinates.x || x, lastCoordinates.y || y);
    lastCoordinates.x = x;
    lastCoordinates.y = y;
}
//# sourceMappingURL=../sketch/sketch/build.js.map