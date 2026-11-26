// Heuristic frequency/attack groups, not instrument separation.
class AudioGroups {
  constructor(container) {
    this.container=container;this.revision=0;
    const layout=document.getElementById('band-layout'),ceiling=document.getElementById('band-ceiling');
    const configure=()=>this.configure(layout?.value||'detail48',Number(ceiling?.value)||12000);
    if(layout)layout.onchange=configure;if(ceiling)ceiling.onchange=configure;
    configure();
  }
  configure(layout='detail48',ceiling=12000) {
    this.container.replaceChildren();this.layout=layout;this.ceiling=ceiling;this.revision++;
    // Faixas contíguas; sem os grandes grupos de instrumentos sobrepostos.
    // 8 faixas graves com largura >=20 Hz + 40 faixas logarítmicas.
    // A FFT de 4096 a 48 kHz tem bins de ~11,7 Hz; evita faixas vazias.
    let edges;
    if(layout==='octaves')edges=[25,50,100,200,400,800,1600,3200,6400,ceiling];
    else if(layout==='thirds'){
      edges=[25];while(edges[edges.length-1]*Math.pow(2,1/3)<ceiling)edges.push(Math.round(edges[edges.length-1]*Math.pow(2,1/3)));edges.push(ceiling);
    }else if(layout==='bass')edges=[25,40,55,70,85,100,120,145,175,210,250,320,450,700,1200,2200,4000,7000,ceiling];
    else if(layout==='voices')edges=[25,80,160,250,350,450,570,710,880,1100,1400,1800,2300,2900,3700,4700,6000,8000,ceiling];
    else{
      edges=[25,45,65,90,120,150,180,210,250];
      const count=layout==='balanced24'?16:40;
      for(let i=1;i<=count;i++)edges.push(Math.round(250*Math.pow(ceiling/250,i/count)));
    }
    edges=[...new Set(edges.filter(value=>value<ceiling).concat(ceiling))].sort((a,b)=>a-b);
    edges=edges.reduce((result,value)=>{if(!result.length||value-result[result.length-1]>=12)result.push(value);return result;},[]);
    function bandColor(index){
      const h=(index/(edges.length-2)*.86+.98)%1,s=.65,l=.68;
      const hue=p=>{const k=(p+h*12)%12;return l-s*Math.min(l,1-l)*Math.max(-1,Math.min(k-3,9-k,1));};
      return '#'+[0,8,4].map(n=>Math.round(hue(n)*255).toString(16).padStart(2,'0')).join('');
    }
    const definitions=edges.slice(0,-1).map((lo,i)=>[
      'hz'+lo,lo+'–'+edges[i+1]+' Hz',lo,edges[i+1],bandColor(i),'energy'
    ]);
    this.groups = {};
    for (const [key,label,low,high,color,type] of definitions) {
      const group = {label,low,high,color,type,gain:1,enabled:true};
      this.groups[key] = group;
      const row = document.createElement('div');
      row.className = 'group-row';
      row.innerHTML = `<label style="color:${color}"><input type="checkbox" checked> ${label}</label><label>De <input type="number" min="20" max="20000" step="10" value="${low}" aria-label="${label}: frequência mínima"></label><label>até <input type="number" min="20" max="20000" step="10" value="${high}" aria-label="${label}: frequência máxima"> Hz</label><label>Sensibilidade <input type="range" min="0.25" max="4" step="0.05" value="1" aria-label="${label}: sensibilidade"></label><meter min="0" max="1" value="0" aria-label="${label}: intensidade"></meter>`;
      const inputs = row.querySelectorAll('input');
      inputs[0].onchange = e => {group.enabled=e.target.checked};
      inputs[1].oninput = e => {if(e.target.value!=='') group.low=Math.max(20,Math.min(20000,+e.target.value))};
      inputs[2].oninput = e => {if(e.target.value!=='') group.high=Math.max(20,Math.min(20000,+e.target.value))};
      inputs[3].oninput = e => {group.gain=+e.target.value};
      group.meter = row.querySelector('meter');
      this.container.append(row);
    }
    window.avsGroupNames=Object.keys(this.groups);
    this.reset();
  }
  features() {
    const energy=[0,0,0,0,0,0];
    const bounds=[25,120,400,1200,3500,7000,22000];
    let total=0;
    for(const g of Object.values(this.groups)){
      if(!g.enabled)continue;
      const power=g.magnitude*g.magnitude;total+=power;
      const width=Math.max(1,g.high-g.low);
      for(let i=0;i<6;i++)energy[i]+=power*Math.max(0,Math.min(g.high,bounds[i+1])-Math.max(g.low,bounds[i]))/width;
    }
    return {revision:this.revision,db:10*Math.log10(Math.max(1e-12,total)),
      shape:energy.map(value=>total>1e-12?value/total:0),
      low:energy[0]+energy[1],mid:energy[2]+energy[3],high:energy[4]+energy[5]};
  }
  reset() {
    this.previous=null;this.lastMeterPaint=-Infinity;
    for(const g of Object.values(this.groups)) Object.assign(g,{
      magnitude:0,db:-120,level:0,energy:0,attack:0,sustain:0,hit:false,peak:.04,
      fluxMean:0,fluxPeak:.005,lastHit:-10,tail:0
    });
  }
  update(spectrum,binHz,dt,time,magnitudes) {
    dt=Math.max(.001,Math.min(.1,dt));
    if(!this.previous || this.previous.length!==spectrum.length){
      this.previous=new Float32Array(spectrum.length);
    }
    const paintMeters=time-this.lastMeterPaint>=.08;
    for(const g of Object.values(this.groups)) {
      const start=Math.max(1,Math.ceil(g.low/binHz));
      const end=Math.min(spectrum.length-1,Math.ceil(g.high/binHz)-1);
      let sum=0,flux=0,count=0,power=0;
      for(let i=start;i<=end;i++) {
        const v=spectrum[i];sum+=v*v;if(magnitudes)power+=magnitudes[i]*magnitudes[i];
        const rise=Math.max(0,v-this.previous[i]);flux+=rise*rise;count++;
      }
      const raw=Math.sqrt(sum/Math.max(1,count));
      // Fixed spectral amplitude reference; deliberately no automatic gain.
      const magnitude=g.enabled?Math.sqrt(power)*g.gain:0;
      g.magnitude+=(magnitude-g.magnitude)*(1-Math.exp(-dt/(magnitude>g.magnitude?.012:.10)));
      g.db=20*Math.log10(Math.max(1e-6,g.magnitude));
      flux=Math.sqrt(flux/Math.max(1,count))*Math.min(2,(1/60)/dt);
      g.peak=Math.max(.04,raw,g.peak*Math.exp(-dt/6));
      g.fluxPeak=Math.max(.005,flux,g.fluxPeak*Math.exp(-dt/3));
      const energy=Math.min(1,raw/g.peak)*Math.min(1,raw/.035);
      g.hit=g.enabled && flux>Math.max(.002,g.fluxMean*1.8)
        && raw>.015 && time-g.lastHit>(g.type==='attack'?.10:.16);
      g.fluxMean+=(flux-g.fluxMean)*(1-Math.exp(-dt/1.3));
      if(g.hit)g.lastHit=time;
      const attack=Math.min(1,flux/g.fluxPeak)*Math.min(1,raw/.035);
      g.attack=Math.max(attack,g.attack*Math.exp(-dt/.12));
      g.energy=energy;
      g.sustain+=(energy-g.sustain)*(1-Math.exp(-dt/.16));
      g.tail=Math.max(g.hit?energy:0,g.tail*Math.exp(-dt/.6));
      let target=energy;
      if(g.type==='attack')target=g.attack;
      if(g.type==='sustain')target=g.sustain*(1-.45*g.attack);
      if(g.type==='pluck')target=g.tail*.7+g.attack*.3;
      target=g.enabled?Math.min(1,target*g.gain):0;
      g.level+=(target-g.level)*(1-Math.exp(-dt/(target>g.level?.012:.12)));
      if(!g.enabled){g.attack=0;g.hit=false}
      if(paintMeters)g.meter.value=g.level;
    }
    if(paintMeters)this.lastMeterPaint=time;
    this.previous.set(spectrum);
    return this.groups;
  }
}
window.AudioGroups=AudioGroups;
