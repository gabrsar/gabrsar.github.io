const velocities = [ 1, 2, 3 ];
const pos = [ 0, 0, 0 ];

let mokey;

function preload() {
  // Load model with normalise parameter set to true
  mokey = loadModel('monkey.obj', true);
}


function setup() {
  frameRate(60);
  let width = window.innerWidth;
  let height = window.innerHeight;
  createCanvas(width, height, WEBGL);
  blendMode(MULTIPLY);
  angleMode(DEGREES);

}

function makeRing(radius, width, depth, final, color,) {
  fill(color);
  push();
  {
    rotateZ(depth * 90);
    torus(radius, width, 64, 32);

    const holderSize = 4 * width;

    const numberOfFaces = final ? 10 : 5;

    push();
    {
      rotateZ(90);
      translate(-radius, 0, 0);
      box(holderSize, holderSize);
      translate(2 * radius, 0, 0);
      box(holderSize, holderSize);
    }
    pop();

    translate(-radius, 0, 0);

    box(holderSize, holderSize);
    translate(2 * radius, 0, 0);
    box(holderSize, holderSize);

    push();
    {
      translate(-2 * width, 0, 0);
      rotateZ(90);
      cylinder(width, radius / 2, 10, numberOfFaces);
    }
    pop();

    push();
    {
      translate(-2 * radius + 2 * width, 0, 0);
      rotateZ(90);
      cylinder(width, radius / 2, 10, numberOfFaces);
    }
    pop();
  }
  pop();
}

function draw() {
  ambientLight(100);
  ambientMaterial(255, 255, 0);
  let dirX = (mouseX / width - 0.5) * 2;
  let dirY = (mouseY / height - 0.5) * 2;
  directionalLight(250, 250, 250, -dirX, -dirY, -1);
  smooth();
  orbitControl();

  background(50);

  push();
  {
    // FIXED RING
    rotateZ(45);
    makeRing(280, 10, 0, false, [ 255, 0, 255 ]);
    push();
    {
      rotateX(pos[0]);
      makeRing(200, 10, 1, false, [ 255, 255, 0 ]);
      push();
      {
        rotateY(pos[1]);
        makeRing(130, 10, 2, false, [ 0, 255, 255 ]);
        push();
        {
          rotateX(pos[2]);
          makeRing(60, 8, 3, true, [ 255, 255, 255 ]);
          normalMaterial(); // For effect
          push();
          {
            scale(0.3);
            model(mokey);
          }
          pop();

        }
        pop();
      }
      pop();
    }
    pop();
  }
  pop();

  pos[0] += 1;
  pos[1] += 1;
  pos[2] += 1;

}