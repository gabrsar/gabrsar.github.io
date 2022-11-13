const quote1 = "Feliz  Aniversário !";
const quote2 = "Diego Lemos <3";
const size = 32;

let windNoiseX = Math.random()*1000;
let windNoiseY = Math.random()*1000;

let q1 = quote1.split("").map((l,i)=>({t:l,x:0+i*32,y:0}));

let q2 = quote2.split("").map((l,i)=>({t:l,x:0+i*32,y:-1000, dX:1,dY:1}));

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
}

function setup() {
  makeBallons();
  
  console.clear();
  textSize(size);

  noCursor();
  textFont('Monospace');
  frameRate(Infinity);
  const x = createCanvas(windowWidth, windowHeight);
  x.style('display', 'block');


}

function draw() {
  t+=0.1;
  background(0);
  

  const q1x = (t*100)%(windowWidth+500)

  q1 = q1.map((lc,i)=>({t:lc.t,x:q1x-500+(i*size)+Math.cos(t+(1+i))*size/2,y:100+Math.sin(t+(1+i))*size/3}));
  textSize(size);
  
  ballons.slice(0,midBallons).forEach((b)=>drawBallon(b));
  
  
  const nq2 = [];
  
  for(let i=0;i<q2.length;i++){
    lc = q2[i];
    plc = q2[i-1]
    blc = plc || lc;
    const x = (mouseX) +(i*size*2+Math.sin(t/10)*20);
    const y = mouseY;
    const dX = blc.dX + (1/(2+i))*(x-blc.dX);
    const dY = blc.dY + (1/(2+i))*(y-blc.dY);
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
  
  
  q2.forEach((l,i)=>{
    fill((t*30+i*10)%360,100,200);
    
    text(l.t,l.dX,l.dY);
  });
  pop();
 
    ballons.slice(midBallons,nBallons).forEach((b)=>drawBallon(b));
  ballons = ballons.map((b)=>animateBallon(b));
}


function animateBallon(b){
  
  if(b.y< -100){
    b.y = windowHeight + Math.random()*200;
    b.x = Math.random()*windowWidth;
    b.c = [
      Math.floor(Math.random()*255),
      Math.floor(Math.random()*255),
      Math.floor(Math.random()*255)
    ];
  }
  
  return {
    ...b,
    x:b.x+noise(windNoiseX*b.z),
    y: b.y < -100 ? windowHeight+100: b.y-noise(windNoiseY*b.z)-(b.m*10)
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
