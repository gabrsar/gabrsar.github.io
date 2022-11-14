const quote1 = "Feliz  Aniversário !";
const quote2 = "Diego Lemos <3";
let size = 32;
const q1size = quote1.length*(size+2);
console.log(q1size);
const Y_AXIS = 1;


let windNoiseX = Math.random()*1000;
let windNoiseY = Math.random()*1000;
let bgNoise = Math.random()*1000;


let q1 = quote1.split("").map((l,i)=>({t:l,x:0+i*size,y:0}));

let q2 = quote2.split("").map((l,i)=>({t:l,x:0+i*size,y:-1000, dX:1,dY:1}));

const nBallons = 50+Math.random()*50;

let midBallons = Math.floor(nBallons/2);
let ballons = [];

function makeBallons(){
 
for(let i = 0 ; i< nBallons;i++){
  ballons.push(
    {
    y:windowHeight + Math.random()*2000,
    x:Math.random()*windowWidth,
    c:[
      Math.floor(Math.random()*255),
      Math.floor(Math.random()*255),
      Math.floor(Math.random()*255)
    ],
    w:30+Math.random()*20,
    h:40+Math.random()*40,
    z:Math.random(),
    l:10+Math.random()*10,
    m:Math.random()
              
});
} 
}

let t=0;
let tX =0;
let pY = 0;
let cpX =0;
let opY =0;

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  size = min(windowHeight,windowWidth)/30;

}

function setup() {
  makeBallons();
  
  textSize(size);

  noCursor();
  textFont('Monospace');
  frameRate(30);
  const x = createCanvas(windowWidth, windowHeight);
  x.style('display', 'block');

  size = min(windowHeight,windowWidth)/30;


}

function draw() {
  t+=0.1;

  bgNoise+=0.01;
  windNoiseY+=0.1;
  windNoiseX+=0.1;


  push();
  colorMode(HSB);
  fill(noise(bgNoise)*255,noise(bgNoise+100)*100,10);
  rect(0,0,windowWidth,windowHeight);
  pop();

  const q1x = (t*100)%(windowWidth+q1size)

  q1 = q1.map((lc,i)=>({t:lc.t,x:q1x-(q1size)+(i*size)+Math.cos(t+(1+i))*size/2,y:200+Math.sin(t+(1+i))*size/3}));
  textSize(size);
  
  ballons.slice(0,midBallons).forEach((b)=>drawBallon(b));
  
  
  const nq2 = [];

  for(let i=0;i<q2.length;i++){
    lc = q2[i];
    plc = q2[i-1]
    blc = plc || lc;
    const x = (mouseX) +(i*size*2+Math.sin(t/10)*20);
    const y = mouseY;
    const dX = blc.dX + (1/(1+i*10))*(x-blc.dX)+size;
    const dY = blc.dY + (1/(1+i*10))*(y-blc.dY);
    const nlc = {
      t:lc.t,
      x,
      y,
      dX,
      dY
    };

    nq2[i] = nlc;
  }

  q2 = nq2;
  
  
  

  push();
    colorMode(HSB);

  q1.forEach((l,i)=>{
    fill((t*20+i*10)%360,100,100);
    text(l.t,l.x,l.y);
  });
  
  
  const layers=30;
  const colorStart=80;
  const colorMin=50;
  const layerDelta=(colorStart-colorMin)/layers;
  const perspectiveSize=2;

  for(let j=0;j<layers;j+=1){
    q2.forEach((l,i)=>{
      const c = j==(layers-1) ? 100: colorMin+j*layerDelta;
      fill((t*30+i*10)%360,100,c);

      const perspectiveX=j*perspectiveSize*((mouseX-windowWidth/2)/windowWidth);
      const perspectiveY=j*perspectiveSize*((mouseY-windowHeight/2)/windowHeight);
      textSize(size-(layers-j)/3);

      text(l.t,l.dX+perspectiveX,l.dY+perspectiveY);
    });
  }
  pop();
 
  ballons.slice(midBallons,nBallons).forEach((b)=>drawBallon(b));
  ballons = ballons.map((b)=>animateBallon(b));
}


function animateBallon(b){
  
  if(b.y< -100){
    b.y = windowHeight + Math.random()*200;
    b.x = (Math.random()*windowWidth)-300;
    b.c = [
      Math.floor(Math.random()*255),
      Math.floor(Math.random()*255),
      Math.floor(Math.random()*255)
    ];
  }
  
  return {
    ...b,
    x:b.x+noise(windNoiseX*b.z)*5,
    y: b.y < -100 ? windowHeight+100: b.y-noise(windNoiseY*b.z)-(b.m*10)-0.1
  }
}

function drawBallon(b){
  push();
  const c = `rgba(${[...b.c,b.z].join(",")})`;
  fill(c);
  noStroke();
  ellipse(b.x,b.y,b.w,b.h);
  stroke( `rgba(255,255,255,${b.z})`);

  line(b.x,b.y+b.h/2+1,b.x,b.y+b.h+b.l);
  pop();
  
}


function setGradient(x, y, w, h, c1, c2, axis) {
  noFill();

  if (axis === Y_AXIS) {
    // Top to bottom gradient
    for (let i = y; i <= y + h; i++) {
      let inter = map(i, y, y + h, 0, 1);
      let c = lerpColor(c1, c2, inter);
      stroke(c);
      line(x, i, x + w, i);
    }
  } else if (axis === X_AXIS) {
    // Left to right gradient
    for (let i = x; i <= x + w; i++) {
      let inter = map(i, x, x + w, 0, 1);
      let c = lerpColor(c1, c2, inter);
      stroke(c);
      line(i, y, i, y + h);
    }
  }
}
