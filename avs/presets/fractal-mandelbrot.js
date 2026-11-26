// FRACTAL / Mandelbrot, deriva suave e paleta espectral.
/* global p, a, s */
const dt=Math.min(a.dt||1/60,.06),t=a.time,w=p.width,h=p.height;
const bands=Object.values(a.groups||{}).sort((x,y)=>x.low-y.low);
const clamp=v=>Math.max(0,Math.min(1,v));
const strengths=bands.map(g=>g.enabled?(a.visualLevel?a.visualLevel(g.db??-120):clamp(((g.db??-120)+80)/55)):0);
const loud=strengths.length?Math.max(...strengths):0;
const region=(lo,hi)=>{const selected=strengths.filter((_,i)=>bands[i].low<hi&&bands[i].high>lo);return selected.reduce((n,x)=>n+x,0)/Math.max(1,selected.length);};
const low=region(25,250);
const high=region(4000,22000);
const valueAt=i=>strengths[((i%strengths.length)+strengths.length)%strengths.length]||0;
p.blendMode(p.BLEND);p.colorMode(p.RGB,255);

const JULIA=false;
if(!s.g){
  s.g=p.createGraphics(Math.max(64,Math.floor(w*(a.renderScale??.75)*.9)),Math.max(64,Math.floor(h*(a.renderScale??.75)*.9)),p.WEBGL);s.g.pixelDensity(1);s.dispose=()=>s.g.remove();
  s.shader=s.g.createShader(`
    precision highp float;
    attribute vec3 aPosition;attribute vec2 aTexCoord;varying vec2 uv;
    void main(){uv=aTexCoord;gl_Position=vec4(aPosition.xy*2.0-1.0,0.,1.);}
  `,`
    precision highp float;varying vec2 uv;
    uniform vec2 resolution,cameraCenter;uniform float cameraZoom;uniform float time,bass,treble,power,isJulia;
    void main(){
      vec2 q=(uv-.5)*vec2(resolution.x/resolution.y,1.)*2.7/cameraZoom+cameraCenter;
      vec2 z=isJulia>.5?q:vec2(0.);
      vec2 c=isJulia>.5?vec2(-.73+sin(time*.025)*.012+bass*.012,.245+treble*.022):q;
      float n=0.;float trap=10.;
      for(int i=0;i<100;i++){
        z=vec2(z.x*z.x-z.y*z.y,2.*z.x*z.y)+c;
        trap=min(trap,abs(length(z)-.6));
        if(dot(z,z)>128.){n=float(i);break;}
      }
      float smoothN=n>0.?n+1.-log2(max(.01,log2(max(1.01,length(z))))):0.;
      vec3 pal=.48+.44*cos(vec3(.0,2.1,4.2)+smoothN*.115+time*.025+treble*.4);
      float brightness=n>0.?.28+.65*pow(clamp(smoothN/45.,0.,1.),.55):.02;
      pal*=brightness*(.55+power*.45);
      pal+=vec3(.07,.12,.18)*exp(-trap*16.)*(.2+power*.3);
      gl_FragColor=vec4(pal,1.);
    }
  `);
}
// Passeio em coordenadas complexas: deslocamento e zoom têm limites de velocidade.
if(!s.travel)s.travel={x:JULIA?0:-.55,y:.02,logZoom:Math.log(1.05),low:0,high:0,power:0,clock:0,waypoint:0,next:18};
const cam=s.travel;cam.clock+=dt;
for(const [key,value]of [['low',low],['high',high],['power',loud]])cam[key]+=(value-cam[key])*(1-Math.exp(-dt/2.8));
const route=JULIA?[[0,.02],[-.50,.13],[.42,-.13],[-.25,-.30],[.18,.32]]:
  [[-.55,.02],[-.74,.15],[-.32,.52],[.18,.36],[-1.05,.04]];
if(cam.clock>cam.next){cam.waypoint=(cam.waypoint+1+(cam.high>.65?1:0))%route.length;cam.next=cam.clock+22+cam.power*12;}
const target=route[cam.waypoint],zoom=Math.exp(cam.logZoom);
const desiredZoom=1.2+cam.low*1.5+(a.music?.trend||0)*.35+(.5+.5*Math.sin(cam.clock*.09))*1.15;
const desiredLog=Math.log(Math.min(4.2,desiredZoom));
// No máximo ~4,5% de zoom por segundo; sem rotação ou pulsação por batida.
cam.logZoom+=Math.max(-dt*.045,Math.min(dt*.045,(desiredLog-cam.logZoom)*(1-Math.exp(-dt/4))));
const dx=target[0]-cam.x,dy=target[1]-cam.y,length=Math.hypot(dx,dy);
const limit=dt*.035/zoom;
if(length>1e-7){const move=Math.min(limit,length*(1-Math.exp(-dt/5)));cam.x+=dx/length*move;cam.y+=dy/length*move;}
const g=s.g,rw=Math.max(64,Math.floor(w*(a.renderScale??.75)*.9)),rh=Math.max(64,Math.floor(h*(a.renderScale??.75)*.9));
if(g.width!==rw||g.height!==rh)g.resizeCanvas(rw,rh);
g.clear();g.resetMatrix();g.shader(s.shader);g.noStroke();
for(const [name,value]of Object.entries({resolution:[g.width,g.height],time:cam.clock,bass:cam.low,treble:cam.high,power:cam.power,isJulia:JULIA?1:0,cameraCenter:[cam.x,cam.y],cameraZoom:Math.exp(cam.logZoom)}))s.shader.setUniform(name,value);
g.rect(0,0,1,1);
p.background(2,3,10);p.imageMode(p.CORNER);p.image(g,0,0,w,h);
