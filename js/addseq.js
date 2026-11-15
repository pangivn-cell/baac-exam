/* addseq.js — ตัวสร้างโจทย์บวกเลขต่อเนื่อง (แทนคลังคงที่ addseq-bank.js)
   ความยาก D = ระดับผู้สอบ (สูงสุด 6) + ความร้อนของวิชานี้ (P.heat.addseq: ทำเต็มชุด +1, ไม่ผ่าน -2)
   ยิ่ง D สูง: จำนวนตัวเลขมากขึ้น หลักมากขึ้น มีลบปน และตัวเลือกต่างกันแค่หลักเดียว
   ตัวเลือกลวง: สร้างเป็น "ชุดรูปแบบ" แล้วสุ่มว่าคำตอบอยู่ตำแหน่งไหนในชุด จึงเดาจากรูปแบบตัวเลือกไม่ได้ */
const AS_MAXD=30;
function asHeat(){try{return Math.max(0,(P.heat&&P.heat.addseq)||0)}catch(e){return 0}}
function asSpec(D){
  const k=Math.min(30,5+D);                                   /* จำนวนตัวเลข */
  const dig=D<=2?[2,2]:D<=3?[2,3]:D<=5?[3,3]:D<=7?[3,4]:D<=10?[4,4]:D<=13?[4,5]:D<=17?[5,5]:D<=22?[5,6]:[6,6];
  const minus=D<9?0:D<12?.25:D<16?.35:.45;                    /* สัดส่วนจำนวนที่เป็นลบ */
  return{k,dig,minus};
}
function asNum(d){const lo=10**(d-1),hi=10**d-1;let x;do{x=ri(lo,hi)}while(x%10===0||(d>=3&&x%100===0));return x}
function asTerms(D){
  const{k,dig,minus}=asSpec(D);
  for(let g=0;g<50;g++){
    const t=[];let run=0,ok=true;
    for(let i=0;i<k;i++){
      const v=asNum(ri(dig[0],dig[1]));
      const neg=i>0&&Math.random()<minus&&run-v>0;
      run+=neg?-v:v;t.push(neg?-v:v);
      if(run<=0){ok=false;break}
    }
    if(ok&&run>=10)return t;
  }
  return null;
}
/* ตัวเลือกลวง: ความผิดพลาดที่พบบ่อยในการบวกหลายจำนวน (ทดผิดหลัก ลืมทด ทดเกิน) */
function asOffsets(ans,D){
  const top=String(ans).length;const pool=[];
  for(let p=D>=8?1:0;p<top;p++){const b=10**p;pool.push(b,-b,2*b,-2*b);if(p>0)pool.push(9*10**(p-1),-9*10**(p-1))}
  if(D<6)for(let p=1;p<Math.min(top,3);p++)pool.push(5*10**p,-5*10**p);   /* ง่าย: มีตัวลวงที่ต่างกันชัดกว่า */
  return shuffle([...new Set(pool)]);
}
function asChoices(ans,D){
  for(let g=0;g<40;g++){
    const o=asOffsets(ans,D),pat=[0];
    /* ต่อจากค่าสุ่มในชุด เพื่อให้รูปแบบเป็นกลุ่ม ไม่ใช่ดาวล้อมคำตอบ */
    for(const x of o){if(pat.length===4)break;const v=pat[ri(0,pat.length-1)]+x;if(!pat.includes(v))pat.push(v)}
    if(pat.length<4)continue;
    const k=ri(0,3),vals=pat.map(v=>ans+v-pat[k]);
    if(vals.some(v=>v<=0)||new Set(vals).size<4)continue;
    return vals;
  }
  return null;
}
const asFmt=v=>v<0?'− '+nf(-v):nf(v);
function genAddseq1(l){
  const D=Math.min(AS_MAXD,Math.min(l,6)+asHeat());
  const t=asTerms(D);if(!t)return null;
  const ans=t.reduce((a,b)=>a+b,0);
  const vals=asChoices(ans,D);if(!vals)return null;
  const hasNeg=t.some(v=>v<0);
  const stem=t.map((v,i)=>i?(v<0?'− ':'+ ')+nf(Math.abs(v)):nf(v)).join(' ')+' = ?';
  const steps=[];
  if(hasNeg){
    const pos=t.filter(v=>v>0),neg=t.filter(v=>v<0).map(v=>-v);
    const sp=pos.reduce((a,b)=>a+b,0),sn=neg.reduce((a,b)=>a+b,0);
    steps.push([`แยกตัวบวกกับตัวลบออกจากกันก่อน: ตัวบวก ${pos.length} จำนวน · ตัวลบ ${neg.length} จำนวน`,'บวกรวดเดียวแล้วลบครั้งเดียว ผิดน้อยกว่าบวกลบสลับไปมา']);
    steps.push([`รวมตัวบวก = ${nf(sp)}`,chunkTxt(pos)]);
    steps.push([`รวมตัวลบ = ${nf(sn)}`,chunkTxt(neg)]);
    steps.push([`ผลลัพธ์ = ${nf(sp)} − ${nf(sn)} = ${nf(ans)}`,'']);
  }else{
    steps.push([`บวกทีละกลุ่ม (กลุ่มละ 4–5 จำนวน) แล้วจดผลรวมย่อยไว้`,chunkTxt(t)]);
  }
  /* แยกหลัก: ใช้ตรวจคำตอบ */
  const abs=t.map(Math.abs),maxd=Math.max(...abs.map(v=>String(v).length));
  if(!hasNeg){
    const names=['หน่วย','สิบ','ร้อย','พัน','หมื่น','แสน'],col=[];
    for(let p=0;p<maxd;p++)col.push(abs.reduce((a,v)=>a+Math.floor(v/10**p)%10,0));
    steps.push([`ตรวจแบบแยกหลัก: ${col.map((c,p)=>`หลัก${names[p]}รวม ${c}`).join(' · ')}`,`${col.map((c,p)=>`${c}${p?'×'+nf(10**p):''}`).join(' + ')} = ${nf(ans)}`]);
  }
  const lastSum=t.reduce((a,v)=>a+(v<0?-1:1)*(Math.abs(v)%10),0),ld=((lastSum%10)+10)%10;
  if(D<8)steps.push([`ตรวจหลักหน่วยก่อนเลือก: หลักหน่วยรวมกันได้ ${lastSum} → คำตอบต้องลงท้ายด้วย ${ld}`,'ตัวเลือกที่ลงท้ายไม่ตรงตัดทิ้งได้ทันที']);
  steps.push([`ตอบ ${nf(ans)}`,D>=8?'ระดับนี้ตัวเลือกทุกข้อลงท้ายเหมือนกัน ตัวลวงมาจากทดผิดหลัก ลืมทด หรือทดเกินในหลักสิบขึ้นไป ต้องตรวจทุกหลัก':'ตัวลวงมาจากทดผิดหลัก ลืมทด หรือทดเกิน ต้องตรวจให้ครบทุกหลัก ไม่ใช่ดูแค่หลักหน่วย']);
  const ch=shuffle(vals.slice()),f=ch.map(nf);
  return{kind:'mc',stem,choices:f,answer:ch.indexOf(ans),steps,keepOrder:false,asD:D};
}
function chunkTxt(a){
  const out=[];let run=0;
  for(let i=0;i<a.length;i+=5){const g=a.slice(i,i+5),s=g.reduce((x,y)=>x+y,0);run+=s;out.push(`${g.map(nf).join(' + ')} = ${nf(s)}${i?` (สะสม ${nf(run)})`:''}`)}
  return out.join(' · ');
}
LOCAL.addseq=(l,n)=>many(()=>genAddseq1(l),n);
/* ย้ายจากระบบเดิม: ใครทำเต็มติดกันอยู่ในวิชานี้ เริ่มความร้อนและโบนัสต่อจากเดิม (เดิมโบนัส = 2 × จำนวนครั้ง) */
try{if(P&&P.heat==null){const s=P.subject==='addseq'?(P.streak||0):0;P.heat={addseq:s};P.streakBy={addseq:s};P.bonusBy={addseq:s?2*s:0}}}catch(e){}
