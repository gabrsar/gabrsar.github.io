// Rolling windows: sample at 10 Hz, regress the recent phrase instead of each beat.
class RollingMusic {
  constructor(){this.reset();}
  reset(){this.samples=[];this.last=-Infinity;this.revision=null;this.state={energy:0,trend:0,brightness:0,spectralCenter:.5,volatility:0,pulse:0,direction:'steady',hue:180,flow:{x:0,y:0},windowSeconds:12,sampleCount:0,dbPerSecond:0};}
  regression(rows,key){
    if(rows.length<3)return 0;
    const origin=rows[0].time;let sx=0,sy=0,sxx=0,sxy=0;
    for(const row of rows){const x=row.time-origin,y=row[key];sx+=x;sy+=y;sxx+=x*x;sxy+=x*y;}
    const n=rows.length,den=n*sxx-sx*sx;
    return den>1e-8?(n*sxy-sx*sy)/den:0;
  }
  update(a){
    const f=a.features;if(!f)return this.state;
    const clamp=(v,lo=0,hi=1)=>Math.max(lo,Math.min(hi,v));
    if(f.revision!==this.revision||a.time-this.last>1.5||a.time<this.last){this.reset();this.revision=f.revision;}
    if(a.time-this.last>=.1){
      const shape=f.shape||[],sum=shape.reduce((n,v)=>n+v,0);
      const center=sum?shape.reduce((n,v,i)=>n+v*i/Math.max(1,shape.length-1),0)/sum:.5;
      this.samples.push({time:a.time,db:f.db,energy:clamp((f.db+75)/55),brightness:clamp((shape[4]||0)+(shape[5]||0)),center});
      this.samples=this.samples.filter(row=>a.time-row.time<=12).slice(-130);this.last=a.time;
      const recent=this.samples.filter(row=>a.time-row.time<=3.5);
      const phrase=this.samples.filter(row=>a.time-row.time<=8);
      const mean=phrase.reduce((n,row)=>n+row.energy,0)/Math.max(1,phrase.length);
      const deviation=Math.sqrt(phrase.reduce((n,row)=>n+(row.energy-mean)**2,0)/Math.max(1,phrase.length));
      const latest=this.samples.at(-1);
      this.target={energy:latest.energy,trend:clamp(this.regression(recent,'energy')*7,-1,1),
        brightness:latest.brightness,spectralCenter:center,volatility:clamp(deviation*3),dbPerSecond:this.regression(recent,'db')};
    }
    const dt=Math.max(.001,Math.min(.1,a.dt||1/60)),ease=1-Math.exp(-dt/.45);
    if(this.target)for(const key of ['energy','trend','brightness','spectralCenter','volatility','dbPerSecond'])this.state[key]+=(this.target[key]-this.state[key])*ease;
    const hit=f.db>-70&&Object.values(a.groups||{}).some(g=>g.enabled&&g.hit);
    this.state.pulse=Math.max(hit?this.state.energy:0,this.state.pulse*Math.exp(-dt/.25));
    this.state.direction=this.state.trend>.12?'rising':this.state.trend<-.12?'falling':'steady';
    this.state.hue=((this.state.spectralCenter*280+this.state.trend*35+360)%360);
    this.state.flow={x:(this.state.spectralCenter-.5)*1.4,y:-this.state.trend};
    this.state.sampleCount=this.samples.length;
    return this.state;
  }
}
window.RollingMusic=RollingMusic;
window.avsMusic=new RollingMusic();
