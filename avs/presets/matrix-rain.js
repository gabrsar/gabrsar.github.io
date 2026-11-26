// MATRIX / chuva de código: áudio, mouse, relógio, teclado e seed.
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

const fontSize=17,count=Math.min(96,Math.ceil(w/fontSize)),cell=w/Math.max(1,count);
if(!s.columns||s.count!==count){
  s.columns=Array.from({length:count},()=>({y:rand(-h,h),speed:rand(28,95),seed:rand(0,1000),timer:0,glyphs:Array.from({length:18},()=>Math.floor(rand(0,64)))}));s.count=count;s.paused=false;s.time=0;s.wind=0;
}
if(keys.pressed('Space'))s.paused=!s.paused;
const activeDt=s.paused?0:dt*(keys.down('ShiftLeft')||keys.down('ShiftRight')?.25:1);
s.time+=activeDt;s.wind+=(Math.max(-.35,Math.min(.35,mouse.vx/1800))-s.wind)*(1-Math.exp(-dt/.4));
p.background(0,5,2,255*(1-Math.exp(-dt/.075)));p.textFont('monospace');p.textSize(fontSize);p.textAlign(p.CENTER,p.TOP);
const chars='ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉ0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const hour=a.clock?.hour??12;
for(let i=0;i<count;i++){
 const column=s.columns[i],index=Math.floor(i/count*strengths.length),energy=strengths[index]||0;
 if(mouse.clicked&&Math.abs((i+.5)/count-mouse.nx)<.12)column.y=mouse.ny*h;
 if(keys.pressed('KeyR'))column.y=rand(-h,0);
 column.y+=activeDt*column.speed*(.5+energy*2.7+low*.5);
 if(column.y>h+fontSize*20)column.y=rand(-h*.7,-fontSize);
 column.timer+=activeDt;
 if(column.timer>.07+(.12-energy*.08)){column.timer=0;const slot=Math.floor(rand(0,column.glyphs.length));column.glyphs[slot]=Math.floor(rand(0,chars.length));}
 for(let row=17;row>=0;row--){
  const y=column.y-row*fontSize;if(y< -fontSize||y>h)continue;
  const fade=Math.pow(1-row/18,1.7),x=(i+.5)*cell+Math.sin(s.time*.25+column.seed)*1.2+s.wind*row*4;
  if(row===0)p.fill(150+energy*70,225+energy*25,175+energy*55,120+energy*110);
  else p.fill(10+hour*.3,95+energy*120,35+energy*55,fade*(50+energy*170));
  p.text(chars[column.glyphs[row]%chars.length],x,y);
 }
}
p.fill(75,150,95,100);p.textSize(9);p.textAlign(p.LEFT,p.TOP);if(a.showHUD)p.text('SPACE pausa · SHIFT câmera lenta · R reinicia · mouse cria vento',10,h-15);
