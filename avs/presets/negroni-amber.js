// ÂMBAR / lounge geométrico em laranja, cobre e rubi.
/* global p, a, s */
const dt=Math.min(a.dt||1/60,.06),t=a.elapsed??a.time,w=p.width,h=p.height;
const bands=Object.values(a.groups||{}).sort((x,y)=>x.low-y.low);
const value=g=>g.enabled?(a.visualLevel?a.visualLevel(g.db??-120):Math.max(0,Math.min(1,((g.db??-120)+80)/55))):0;
const strengths=bands.map(value),loud=strengths.length?Math.max(...strengths):0;
const region=(lo,hi)=>{const list=strengths.filter((_,i)=>bands[i].low<hi&&bands[i].high>lo);return list.reduce((n,x)=>n+x,0)/Math.max(1,list.length);};
const low=region(25,250),mid=region(250,4000),high=region(4000,20000);
const rand=(lo=0,hi=1)=>a.rand?a.rand(lo,hi):lo+Math.random()*(hi-lo);
const mouse=a.mouse||{inside:false,nx:.5,ny:.5,vx:0,clicked:false};
const keys=a.keyboard||{down:()=>false,pressed:()=>false};
p.blendMode(p.BLEND);p.colorMode(p.RGB,255);

s.phase ??= rand(0,6);s.phase+=dt*(.025+mid*.04);
p.background(16,7,6,255*(1-Math.exp(-dt/.18)));
const scale=a.renderScale??.75,rw=Math.max(64,Math.round(w*scale)),rh=Math.max(64,Math.round(h*scale));
if(!s.layer){s.layer=p.createGraphics(rw,rh);s.layer.pixelDensity(1);s.dispose=()=>s.layer.remove();}
const g=s.layer;if(g.width!==rw||g.height!==rh)g.resizeCanvas(rw,rh);
g.clear();g.resetMatrix();g.colorMode(p.RGB,255);g.scale(scale);g.translate(w/2,h/2);g.noFill();
const R=Math.min(w,h)*.44;
for(let panel=0;panel<18;panel++){
 const energy=strengths[Math.floor(panel/18*strengths.length)]||0;
 const rotation=s.phase*.12+panel*.035;
 g.push();g.rotate(rotation);
 const neon=panel%7===3;
 const trend=a.music?.trend||0;
 g.stroke(neon?90:185+panel*3,neon?175:55+panel*5+trend*8,neon?155:28+panel*2,(neon?12:20)+energy*(neon?18:40));g.strokeWeight(.65+energy*.6);
 g.rectMode(p.CENTER);const size=R*(.25+panel*.075);
 g.rect(Math.sin(s.phase+panel*.12)*w*.035,Math.cos(s.phase*.7)*h*.025,size*1.35,size*.75,3);g.pop();
}

// Um bloom por camada em vez de recalcular sombras em cada retângulo.
p.imageMode(p.CORNER);const ctx=p.drawingContext;ctx.save();
try{ctx.filter='blur('+(3+low*2).toFixed(2)+'px)';ctx.globalAlpha=.30;p.image(g,0,0,w,h);ctx.filter='none';ctx.globalAlpha=.95;p.image(g,0,0,w,h);}finally{ctx.restore();}
