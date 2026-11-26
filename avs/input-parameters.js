// Input state belongs to the page, never to a preset; no per-preset listener leaks.
(() => {
  let canvas,started=performance.now(),seed=1337,rng=1337,previousX=0,previousY=0;
  let click=false,release=false,wheel=0,hover=false;
  const held=new Set(),pressed=new Set(),released=new Set();
  const mouse={x:0,y:0,nx:0,ny:0,dx:0,dy:0,vx:0,vy:0,ax:0,ay:0,speed:0,pressed:false,clicked:false,released:false,wheel:0,inside:false};
  const normalize=key=>String(key).toLowerCase();
  const typing=e=>!!e.target?.closest?.('textarea,input,select,[contenteditable="true"],.ace_editor');
  function clearKeys(){for(const key of held)released.add(key);held.clear();mouse.pressed=false;}
  window.addEventListener('keydown',e=>{
    if(typing(e)||(!hover&&document.activeElement!==canvas))return;
    if(document.activeElement===canvas&&['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();
    for(const key of [normalize(e.key),normalize(e.code)]){if(!held.has(key))pressed.add(key);held.add(key);}
  });
  window.addEventListener('keyup',e=>{for(const key of [normalize(e.key),normalize(e.code)]){held.delete(key);released.add(key);}});
  window.addEventListener('blur',clearKeys);
  function bind(target){
    if(canvas===target)return;canvas=target;canvas.tabIndex=0;
    const position=e=>{const r=canvas.getBoundingClientRect();mouse.x=(e.clientX-r.left)*canvas.clientWidth/Math.max(1,r.width);mouse.y=(e.clientY-r.top)*canvas.clientHeight/Math.max(1,r.height);};
    canvas.addEventListener('pointerenter',()=>{hover=true;});
    canvas.addEventListener('pointerleave',()=>{hover=false;});
    canvas.addEventListener('pointermove',position);
    canvas.addEventListener('pointerdown',e=>{position(e);mouse.pressed=true;click=true;if(!typing(e))canvas.focus({preventScroll:true});});
    window.addEventListener('pointerup',()=>{if(mouse.pressed)release=true;mouse.pressed=false;});
    canvas.addEventListener('wheel',e=>{wheel+=e.deltaY;},{passive:true});
  }
  function hash(value){let h=2166136261;for(const c of String(value)){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;}
  function random(lo,hi){
    rng=(rng+0x6D2B79F5)>>>0;let x=rng;x=Math.imul(x^(x>>>15),x|1);x^=x+Math.imul(x^(x>>>7),x|61);
    const unit=((x^(x>>>14))>>>0)/4294967296;
    return lo===undefined?unit:hi===undefined?unit*lo:lo+unit*(hi-lo);
  }
  window.avsInputs={
    reset(p){seed=hash(document.getElementById('preset-seed').value||'1337');rng=seed;started=performance.now();if(p){p.randomSeed(seed);p.noiseSeed(seed);}},
    update(p,a){
      bind(p.canvas);const dt=Math.max(.004,Math.min(.1,a.dt||1/60));
      mouse.dx=mouse.x-previousX;mouse.dy=mouse.y-previousY;previousX=mouse.x;previousY=mouse.y;
      const oldVX=mouse.vx,oldVY=mouse.vy,ease=1-Math.exp(-dt/.08);
      mouse.vx+=(mouse.dx/dt-mouse.vx)*ease;mouse.vy+=(mouse.dy/dt-mouse.vy)*ease;
      mouse.ax=(mouse.vx-oldVX)/dt;mouse.ay=(mouse.vy-oldVY)/dt;mouse.speed=Math.hypot(mouse.vx,mouse.vy);
      mouse.nx=mouse.x/Math.max(1,p.width);mouse.ny=mouse.y/Math.max(1,p.height);mouse.inside=hover;
      mouse.clicked=click;mouse.released=release;mouse.wheel=wheel;click=false;release=false;wheel=0;
      const justPressed=new Set(pressed),justReleased=new Set(released);pressed.clear();released.clear();
      a.mouse=mouse;a.keyboard={down:key=>held.has(normalize(key)),pressed:key=>justPressed.has(normalize(key)),released:key=>justReleased.has(normalize(key))};
      const date=new Date();a.clock={timestamp:date.getTime(),hour:date.getHours(),minute:date.getMinutes(),second:date.getSeconds(),day:date.getDate(),month:date.getMonth()+1,year:date.getFullYear(),weekday:date.getDay()};
      a.elapsed=(performance.now()-started)/1000;a.frame=p.frameCount;a.fps=p.frameRate();a.seed=seed;a.rand=random;
    }
  };
})();
