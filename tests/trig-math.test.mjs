import test from 'node:test';
import assert from 'node:assert/strict';
import {trigValues,FUNCTIONS,graphSegments,radiansLabel,normalize} from '../cheat-sheet/matematica/trigonometria/circulo-unitario/trig-math.mjs';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} should equal ${b}`);
test('cardinal angles preserve zeros and undefined values',()=>{
  assert.deepEqual(trigValues(0),{sin:0,cos:1,tan:0,cot:null,sec:1,csc:null});
  const a=trigValues(90);near(a.sin,1);assert.equal(a.cos,0);assert.equal(a.tan,null);assert.equal(a.sec,null);near(a.cot,0);near(a.csc,1);
  const b=trigValues(180);near(b.cos,-1);assert.equal(b.sin,0);assert.equal(b.cot,null);assert.equal(b.csc,null);near(b.sec,-1);
  const c=trigValues(270);near(c.sin,-1);assert.equal(c.cos,0);assert.equal(c.tan,null);assert.equal(c.sec,null);near(c.csc,-1);
});
test('notable angles and signed values',()=>{
  const a=trigValues(30);near(a.sin,.5);near(a.cos,Math.sqrt(3)/2);near(a.tan,1/Math.sqrt(3));near(a.cot,Math.sqrt(3));near(a.sec,2/Math.sqrt(3));near(a.csc,2);
  const b=trigValues(45);near(b.tan,1);near(b.sec,Math.sqrt(2));near(b.csc,Math.sqrt(2));
  for(const [angle,signs] of [[45,[1,1,1,1,1,1]],[135,[1,-1,-1,-1,-1,1]],[225,[-1,-1,1,1,-1,-1]],[315,[-1,1,-1,-1,1,-1]]]){
    const values=trigValues(angle);FUNCTIONS.forEach((f,i)=>assert.equal(Math.sign(values[f.key]),signs[i]));
  }
});
test('identities and periods hold across negative and multi-turn angles',()=>{
  for(const angle of [-725,-315,-15,12,47,118,204,306,403,754]){
    const v=trigValues(angle);near(v.sin*v.sin+v.cos*v.cos,1);near(1+v.tan*v.tan,v.sec*v.sec);near(1+v.cot*v.cot,v.csc*v.csc);
    near(v.sec*v.cos,1);near(v.csc*v.sin,1);near(v.tan*v.cot,1);
    FUNCTIONS.forEach(f=>near(v[f.key],trigValues(angle+f.period)[f.key]));
  }
  assert.equal(normalize(-90),270);assert.equal(radiansLabel(45),'π/4 rad');assert.equal(radiansLabel(360),'2π rad');
});
test('graph segments never bridge a pole or include undefined values',()=>{
  for(const meta of FUNCTIONS){
    const segments=graphSegments(meta.key);assert.ok(segments.length>0);
    for(const segment of segments){
      assert.ok(segment.every(([d,v])=>Number.isFinite(v)&&d>=0&&d<=360));
      for(const pole of meta.poles)assert.ok(!(segment[0][0]<pole&&segment.at(-1)[0]>pole),`${meta.key} crosses ${pole}`);
    }
  }
});
