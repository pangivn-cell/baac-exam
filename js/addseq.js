/* addseq.js — ตัวสร้างโจทย์บวกเลขต่อเนื่อง (แทนคลังคงที่ addseq-bank.js) · 9 รูปแบบสลับกันในชุด
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
/* ---------- รูปแบบโจทย์ (สลับกันในชุด: หยิบจากถุงที่สับแล้ว ไม่ซ้ำจนกว่าจะครบทุกแบบ) ---------- */
const asSum=a=>a.reduce((x,y)=>x+y,0);
const asSign=t=>t.map((v,i)=>i?(v<0?'− ':'+ ')+nf(Math.abs(v)):nf(v)).join(' ');
const asMoney=s=>nf(Math.floor(s/100))+'.'+String(s%100).padStart(2,'0');
const AS_NAMES=['หน่วย','สิบ','ร้อย','พัน','หมื่น','แสน','ล้าน'];
const AS_DAYS=['วันจันทร์','วันอังคาร','วันพุธ','วันพฤหัสบดี','วันศุกร์','วันเสาร์','วันอาทิตย์'];
const AS_MONTHS=['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
const AS_FORMS=[
  {id:'chain',min:0},{id:'column',min:0},{id:'missing',min:0},{id:'sales',min:0},{id:'ledger',min:0},
  {id:'series',min:0},{id:'pairs',min:0},{id:'diff',min:2},{id:'money',min:4}];
let AS_BAG=[];
function asPickForm(D){
  const ok=AS_FORMS.filter(f=>D>=f.min).map(f=>f.id);
  AS_BAG=AS_BAG.filter(x=>ok.includes(x));
  if(!AS_BAG.length)AS_BAG=shuffle(ok.slice());
  return AS_BAG.shift();
}
/* ตรวจแบบแยกหลัก (เฉพาะบวกล้วน) */
function asColCheck(t,ans){
  const abs=t.map(Math.abs),maxd=Math.max(...abs.map(v=>String(v).length)),col=[];
  for(let p=0;p<maxd;p++)col.push(abs.reduce((a,v)=>a+Math.floor(v/10**p)%10,0));
  return[`ตรวจแบบแยกหลัก: ${col.map((c,p)=>`หลัก${AS_NAMES[p]}รวม ${c}`).join(' · ')}`,`${col.map((c,p)=>`${c}${p?'×'+nf(10**p):''}`).join(' + ')} = ${nf(ans)}`];
}
/* ขั้นบวก/ลบมาตรฐาน */
function asSumSteps(t,label){
  const steps=[],ans=asSum(t);
  if(t.some(v=>v<0)){
    const pos=t.filter(v=>v>0),neg=t.filter(v=>v<0).map(v=>-v),sp=asSum(pos),sn=asSum(neg);
    steps.push([`แยกตัวบวกกับตัวลบออกจากกันก่อน: ตัวบวก ${pos.length} จำนวน · ตัวลบ ${neg.length} จำนวน`,'บวกรวดเดียวแล้วลบครั้งเดียว ผิดน้อยกว่าบวกลบสลับไปมา']);
    steps.push([`รวมตัวบวก = ${nf(sp)}`,chunkTxt(pos)]);
    steps.push([`รวมตัวลบ = ${nf(sn)}`,chunkTxt(neg)]);
    steps.push([`${label||'ผลลัพธ์'} = ${nf(sp)} − ${nf(sn)} = ${nf(ans)}`,'']);
  }else{
    steps.push([`บวกทีละกลุ่ม (กลุ่มละ 5 จำนวน) แล้วจดผลรวมย่อยไว้`,chunkTxt(t)]);
    steps.push(asColCheck(t,ans));
  }
  return steps;
}
function asTail(D,ans,fmt){
  return[`ตอบ ${(fmt||nf)(ans)}`,D>=8?'ตัวเลือกทุกข้อลงท้ายเหมือนกัน ตัวลวงมาจากทดผิดหลัก ลืมทด หรือทดเกินในหลักสิบขึ้นไป ต้องตรวจทุกหลัก':'ตัวลวงมาจากทดผิดหลัก ลืมทด หรือทดเกิน ต้องตรวจให้ครบทุกหลัก ไม่ใช่ดูแค่หลักหน่วย'];
}
function asPlus(D,k){/* บวกล้วน k จำนวน ตามหลักของระดับ D */const{dig}=asSpec(D);return Array.from({length:k},()=>asNum(ri(dig[0],dig[1])))}
function asColumnSvg(t){
  const w=t.map(v=>nf(Math.abs(v)).length),cw=13,W=Math.max(...w)*cw+56,lh=26,H=t.length*lh+lh+22;
  let s=`<svg viewBox="0 0 ${W} ${H}" width="${W}" style="max-width:100%;font-family:ui-monospace,Consolas,monospace;font-size:20px" role="img" aria-label="บวกแบบตั้งหลัก">`;
  t.forEach((v,i)=>{const y=(i+1)*lh;s+=`<text x="${W-8}" y="${y}" text-anchor="end" fill="currentColor">${nf(Math.abs(v))}</text>`;
    if(v<0)s+=`<text x="8" y="${y}" fill="currentColor">−</text>`;else if(i===t.length-1)s+=`<text x="8" y="${y}" fill="currentColor">+</text>`});
  const yl=t.length*lh+8;s+=`<line x1="4" y1="${yl}" x2="${W-4}" y2="${yl}" stroke="currentColor" stroke-width="1.5"/><text x="${W-8}" y="${yl+lh}" text-anchor="end" fill="currentColor">?</text>`;
  return s+'</svg>';
}
const AS_GEN={
  chain(D){const t=asTerms(D);if(!t)return null;const ans=asSum(t);
    return{stem:asSign(t)+' = ?',ans,steps:[...asSumSteps(t),...(D<8?[asUnitTip(t)]:[])]}},
  column(D){const{k,minus}=asSpec(D);let t=asTerms(D);if(!t)return null;t=t.slice(0,Math.min(k,14));if(asSum(t)<=0||t.reduce((r,v,i)=>Math.min(r,asSum(t.slice(0,i+1))),1)<=0)return null;const ans=asSum(t);void minus;
    return{stem:'จงหาผลลัพธ์ของการตั้งหลักต่อไปนี้',svg:asColumnSvg(t),ans,steps:[[`ตั้งหลักให้ตรงกัน แล้วบวกจากหลักหน่วยขึ้นไป ทดไปหลักถัดไปทุกครั้งที่เกิน 9`,'แถวที่มีเครื่องหมาย − คือจำนวนที่ต้องลบ'],...asSumSteps(t)]}},
  missing(D){const t=asTerms(D);if(!t)return null;const S=asSum(t);let i=ri(0,t.length-1);if(t[i]<0)i=0;const ans=t[i];
    const shown=t.map((v,j)=>j===i?(j?(v<0?'− ':'+ '):'')+'▢':(j?(v<0?'− ':'+ ')+nf(Math.abs(v)):nf(v))).join(' ');
    const rest=t.filter((_,j)=>j!==i),R=asSum(rest);
    return{stem:`${shown} = ${nf(S)}\n▢ แทนจำนวนใด`,ans,steps:[[`รวมทุกจำนวนที่รู้ค่าก่อน (ไม่รวม ▢) = ${nf(R)}`,chunkTxt(rest)],[`▢ = ${nf(S)} − ${nf(R)} = ${nf(ans)}`,'ผลรวมทั้งหมด − ส่วนที่รู้ = ส่วนที่หายไป'],[`ตรวจ: ${nf(R)} + ${nf(ans)} = ${nf(S)} ✓`,'']]}},
  sales(D){const useM=D>=6||Math.random()<.4,names=useM?AS_MONTHS:AS_DAYS,{k}=asSpec(D),m=Math.min(names.length,Math.max(5,k));
    const start=useM?0:0,lab=names.slice(start,start+m),t=asPlus(D,m),unit=rnd(['บาท','กิโลกรัม','กระสอบ','ฟอง']);
    const what=useM?rnd(['ยอดขายปุ๋ยของสหกรณ์','ยอดรับซื้อข้าวเปลือกของโรงสี','ยอดขายสินค้าของร้านค้าชุมชน']):rnd(['ร้านค้าขายสินค้าได้','ฟาร์มเก็บไข่ได้','วิสาหกิจชุมชนขายผลผลิตได้']);
    const list=lab.map((n,i)=>`${n}  ${nf(t[i])} ${unit}`).join('\n');
    if(D>=4&&Math.random()<.5){const idx=shuffle([...Array(m).keys()]).slice(0,ri(3,Math.min(6,m-1))).sort((a,b)=>a-b),sub=idx.map(i=>t[i]),ans=asSum(sub);
      return{stem:`${what}ดังนี้\n${list}\nรวมเฉพาะ${idx.map(i=>lab[i]).join(' ')} ได้กี่${unit}`,ans,steps:[[`เลือกเฉพาะ${idx.map(i=>lab[i]).join(', ')}: ${sub.map(nf).join(' + ')}`,'ระวังหยิบผิดบรรทัด ขีดเส้นใต้รายการที่ถามก่อนเริ่มบวก'],...asSumSteps(sub)]}}
    const ans=asSum(t);return{stem:`${what}ดังนี้\n${list}\nรวมทั้งหมดกี่${unit}`,ans,steps:asSumSteps(t)}},
  ledger(D){const{k,dig}=asSpec(D),m=Math.min(14,Math.max(4,k-2)),open=asNum(dig[1]+1);let bal=open;const rows=[];
    for(let i=0;i<m;i++){const v=asNum(ri(dig[0],dig[1]));const out=Math.random()<.45&&bal-v>0;bal+=out?-v:v;rows.push(out?-v:v)}
    const dep=rows.filter(v=>v>0),wd=rows.filter(v=>v<0).map(v=>-v),ans=bal;if(!wd.length)return null;
    const list=rows.map((v,i)=>`${i+1}. ${v>0?'ฝาก':'ถอน'}  ${nf(Math.abs(v))} บาท`).join('\n');
    return{stem:`บัญชีเงินฝากออมทรัพย์มียอดยกมา ${nf(open)} บาท ระหว่างเดือนมีรายการดังนี้\n${list}\nยอดคงเหลือปลายเดือนเท่ากับกี่บาท`,ans,
      steps:[[`รวมยอดฝาก ${dep.length} รายการ = ${nf(asSum(dep))}`,chunkTxt(dep)],[`รวมยอดถอน ${wd.length} รายการ = ${nf(asSum(wd))}`,chunkTxt(wd)],
        [`คงเหลือ = ยอดยกมา + ฝาก − ถอน = ${nf(open)} + ${nf(asSum(dep))} − ${nf(asSum(wd))} = ${nf(ans)}`,'อย่าลืมบวกยอดยกมา ตัวลวงที่พบบ่อยคือคิดแค่ฝาก − ถอน']]}},
  series(D){const{dig}=asSpec(D),n=Math.min(80,8+2*D),d=D<3?1:rnd(D<8?[1,2,5]:[2,3,4,5,7,9,11,25]);
    const a=asNum(Math.max(2,dig[0]-1)),last=a+(n-1)*d,ans=n*(a+last)/2;
    return{stem:`${nf(a)} + ${nf(a+d)} + ${nf(a+2*d)} + … + ${nf(last)} = ?\n(บวกทีละ ${d} ไปเรื่อยๆ จนถึง ${nf(last)})`,ans,
      steps:[[`นับจำนวนพจน์: (${nf(last)} − ${nf(a)}) ÷ ${d} + 1 = ${n} จำนวน`,'ระวังลืม +1 ตัวลวงที่พบบ่อยคือนับขาดไป 1 พจน์'],
        [`จับคู่หัวท้าย: ${nf(a)} + ${nf(last)} = ${nf(a+last)} ทุกคู่`,`มี ${n} จำนวน = ${n/2} คู่`],
        [`ผลรวม = ${n} × ${nf(a+last)} ÷ 2 = ${nf(ans)}`,'สูตรลัด: จำนวนพจน์ × (ตัวแรก + ตัวสุดท้าย) ÷ 2']]}},
  pairs(D){const{k,dig}=asSpec(D),R=10**dig[1],m=Math.max(3,Math.floor(k/2)),t=[],pr=[];
    for(let i=0;i<m;i++){const x=ri(Math.ceil(R*.12),Math.floor(R*.88));if(x%10===0)continue;const y=R*rnd([1,1,2])-x;if(y<=0)continue;t.push(x,y);pr.push([x,y])}
    if(pr.length<3)return null;const extra=k%2?asNum(dig[0]):0;if(extra)t.push(extra);const sh=shuffle(t.slice()),ans=asSum(t);
    return{stem:`${sh.map(nf).join(' + ')} = ?`,ans,steps:[[`มองหาคู่ที่รวมกันได้เลขกลมๆ ก่อน`,'บวกเลขกลมเร็วกว่าและผิดยากกว่าบวกเรียงตามลำดับ'],
      [pr.map(([x,y])=>`${nf(x)} + ${nf(y)} = ${nf(x+y)}`).join(' · '),''],
      [`รวม ${pr.map(([x,y])=>nf(x+y)).join(' + ')}${extra?` + ${nf(extra)} (ตัวที่ไม่มีคู่)`:''} = ${nf(ans)}`,'']]}},
  diff(D){const{k}=asSpec(D),h=Math.max(3,Math.ceil(k/2));let A=asPlus(D,h),B=asPlus(D,h);if(asSum(A)===asSum(B))return null;if(asSum(A)<asSum(B))[A,B]=[B,A];
    const sa=asSum(A),sb=asSum(B),ans=sa-sb;
    return{stem:`ชุด ก: ${A.map(nf).join(' + ')}\nชุด ข: ${B.map(nf).join(' + ')}\nผลรวมของชุด ก มากกว่าผลรวมของชุด ข อยู่เท่าใด`,ans,
      steps:[[`ผลรวมชุด ก = ${nf(sa)}`,chunkTxt(A)],[`ผลรวมชุด ข = ${nf(sb)}`,chunkTxt(B)],[`ผลต่าง = ${nf(sa)} − ${nf(sb)} = ${nf(ans)}`,'ทางลัด: ลบเป็นคู่ (ก ตัวที่ 1 − ข ตัวที่ 1) + … ได้ผลเท่ากัน']]}},
  money(D){const{k,dig}=asSpec(D),m=Math.min(12,Math.max(4,k-3)),q=D<10?25:5;
    const t=Array.from({length:m},()=>asNum(Math.max(2,dig[0]-1))*100+q*ri(1,100/q-1));const ans=asSum(t);
    const what=rnd(['ซื้อของ','จ่ายค่าวัสดุสำนักงาน','รับชำระค่าสินค้า']);
    return{stem:`${what} ${m} รายการ ราคา ${t.map(asMoney).join(', ')} บาท\nรวมเป็นเงินกี่บาท`,ans,fmt:asMoney,unit:100,
      steps:[[`รวมสตางค์ก่อน: ${t.map(v=>String(v%100).padStart(2,'0')).join(' + ')} = ${asSum(t.map(v=>v%100))} สตางค์ = ${asMoney(asSum(t.map(v=>v%100)))} บาท`,'ส่วนที่เกิน 100 สตางค์ ทดเป็นบาท'],
        [`รวมบาท: ${t.map(v=>nf(Math.floor(v/100))).join(' + ')} = ${nf(asSum(t.map(v=>Math.floor(v/100))))}`,''],
        [`รวมทั้งหมด = ${asMoney(ans)} บาท`,'ตั้งจุดทศนิยมให้ตรงกันเสมอ']]}},
};
function asUnitTip(t){const s=t.reduce((a,v)=>a+(v<0?-1:1)*(Math.abs(v)%10),0);return[`ตรวจหลักหน่วยก่อนเลือก: หลักหน่วยรวมกันได้ ${s} → คำตอบต้องลงท้ายด้วย ${((s%10)+10)%10}`,'ตัวเลือกที่ลงท้ายไม่ตรงตัดทิ้งได้ทันที']}
function genAddseq1(l,form){
  const D=Math.min(AS_MAXD,Math.min(l,6)+asHeat());
  for(let g=0;g<6;g++){
    const f=form||asPickForm(D),r=AS_GEN[f](D);if(!r||!(r.ans>0))continue;
    const u=r.unit||1,vals=(asChoices(Math.floor(r.ans/u),D)||[]).map(v=>v*u+r.ans%u);if(vals.length<4)continue;
    const fmt=r.fmt||nf,ch=shuffle(vals.slice());
    return{kind:'mc',stem:r.stem,svg:r.svg,choices:ch.map(fmt),answer:ch.indexOf(r.ans),steps:[...r.steps,asTail(D,r.ans,fmt)],asD:D,asF:f};
  }
  return null;
}
function chunkTxt(a){
  const out=[];let run=0;
  for(let i=0;i<a.length;i+=5){const g=a.slice(i,i+5),s=g.reduce((x,y)=>x+y,0);run+=s;out.push(`${g.map(nf).join(' + ')} = ${nf(s)}${i?` (สะสม ${nf(run)})`:''}`)}
  return out.join(' · ');
}
LOCAL.addseq=(l,n)=>many(()=>genAddseq1(l),n);
/* ย้ายจากระบบเดิม: ใครทำเต็มติดกันอยู่ในวิชานี้ เริ่มความร้อนและโบนัสต่อจากเดิม (เดิมโบนัส = 2 × จำนวนครั้ง) */
try{if(P&&P.heat==null){const s=P.subject==='addseq'?(P.streak||0):0;P.heat={addseq:s};P.streakBy={addseq:s};P.bonusBy={addseq:s?2*s:0}}}catch(e){}
