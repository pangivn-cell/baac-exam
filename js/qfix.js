/* qfix.js — ตรวจเฉลยที่ผู้ใช้แย้ง และแก้ข้อที่ผิดให้ทุกคน ทุกแหล่งโจทย์
   qfix/{qKey ของโจทย์เดิม} = {stem, choices, answer, steps, why, sources, verdict, origAnswer, uid, name, at}
   โหลดตอนเปิดเว็บ (แคชในเครื่อง) แล้วทาบทับโจทย์ที่ระบบหยิบมาทุกข้อ (fixAll ใน makeItems/offlineItems) ไม่ว่าจะมาจาก
   คลังในตัว คลังโจทย์กลาง คลังความรู้กลาง หรือเอกสารของผู้ใช้ · แหล่งที่แก้ตรงได้ (บัตรของตัวเอง, ผู้ตรวจแก้คลังกลาง) ก็แก้ที่ต้นทางด้วย */
const QFIX=new Map(),QFIX_KEY='exam-qfix';
try{for(const [k,v] of JSON.parse(localStorage.getItem(QFIX_KEY)||'[]'))QFIX.set(k,v)}catch(e){}
const saveQFixLocal=()=>{try{localStorage.setItem(QFIX_KEY,JSON.stringify([...QFIX]))}catch(e){}};
async function loadQFix(){
  try{const f=await fb(),snap=await f.fs.getDocs(f.fs.collection(f.db,'qfix'));
    const local=[...QFIX].filter(([,v])=>v.localOnly);QFIX.clear();for(const d of snap.docs)QFIX.set(d.id,d.data());for(const [k,v] of local)if(!QFIX.has(k))QFIX.set(k,v);saveQFixLocal()}
  catch(e){console.warn('qfix',e&&e.code||e)}
}
onAppReady(()=>setTimeout(loadQFix,1500));

const isMC=q=>q&&(!q.kind||q.kind==='mc')&&Array.isArray(q.choices)&&q.stem;
function fixQ(q){
  if(!isMC(q)||q.fixed)return q;
  const k=q.origKey||qKey(q),f=QFIX.get(k);if(!f)return q;
  if(!Array.isArray(f.choices)||f.choices.length<2||!(f.answer>=0&&f.answer<f.choices.length))return q;
  q.origKey=k;q.stem=f.stem||q.stem;q.choices=f.choices.slice();q.answer=f.answer;
  if(Array.isArray(f.steps)&&f.steps.length)q.steps=f.steps.map(t=>[String(t),'']);
  q.fixed={why:f.why||'',by:f.name||'',sources:f.sources||[],balance:f.verdict==='balance'};
  return q;
}
const fixAll=a=>Array.isArray(a)?a.map(fixQ):a;

/* โจทย์ที่โปรแกรมคำนวณเฉลยเอง (ตัวสร้างโจทย์ในเครื่อง / คลังในตัวที่ตรวจด้วยโค้ดแล้ว): ตรวจได้ แต่ไม่แก้อัตโนมัติ */
const computedQ=q=>!!q.calc||(!q.card&&!q.orig&&q.gen!=='ai'&&!q.pool);
const DISPUTE=/เฉลยผิด|เฉลยไม่ถูก|ผิดหรือเปล่า|ผิดไหม|ผิดมั้ย|ถูกไหม|ถูกมั้ย|แย้ง|ไม่เห็นด้วย|ไม่น่าใช่|น่าจะตอบ|ต้องตอบ|ควรตอบ|ควรเป็นข้อ|โจทย์ผิด|ตัวเลือกผิด|คำตอบผิด|ไม่มีคำตอบที่ถูก|ถูกหลายข้อ/;
const qBlock=(q,choices,showKey)=>`โจทย์: ${q.stem}\nตัวเลือก:\n${choices.map((t,j)=>`${j}) ${t}`).join('\n')}${showKey?`\nเฉลยในระบบ: ${q.answer}) ${q.choices[q.answer]}\nเหตุผลในเฉลย: ${(q.steps||[]).map(s=>s[0]).join(' / ')||'-'}`:''}${q.srcText?`\nเนื้อหาจากเอกสารต้นทาง [${q.cite||''}]:\n${q.srcText.slice(0,3000)}`:''}`;

/* ตรวจเฉลย 2 รอบ: รอบแรกตรวจพร้อมเห็นเฉลยและหลักฐานจากเว็บ · ถ้าว่าผิด รอบสองแก้โจทย์เองแบบไม่เห็นเฉลย (สลับตัวเลือก)
   แก้ในระบบเมื่อทั้งสองรอบได้คำตอบตรงกันเท่านั้น */
async function verifyDispute(q,pick,claim,{signal,onStep}={}){
  const step=t=>onStep&&onStep(t);let evidence='',sources=[];
  if(canWeb()&&!computedQ(q)){
    step('กำลังค้นข้อมูลจากเว็บเพื่อตรวจเฉลย...');
    try{const r=await aiWeb(`ค้นข้อมูลที่เชื่อถือได้ (กฎหมาย ระเบียบ เว็บหน่วยงาน ตำรา) เพื่อตัดสินว่าข้อสอบนี้ข้อไหนถูก สรุปเฉพาะข้อเท็จจริงที่พบพร้อมระบุแหล่ง ไม่เกิน 12 บรรทัด ห้ามเดา ถ้าไม่พบให้บอกว่าไม่พบ\n\n${qBlock(q,q.choices,false)}`,{signal});evidence=r.text;sources=r.sources}
    catch(e){if(e&&e.code==='cancelled')throw e}
  }
  step('กำลังตรวจเฉลยรอบที่ 1...');
  const r1=await aiJSON(`คุณเป็นผู้ตรวจข้อสอบ ตรวจข้อสอบปรนัยข้อนี้อย่างเป็นกลาง ผู้ทำข้อสอบแย้งว่าเฉลยผิด
${qBlock(q,q.choices,true)}
ผู้ทำตอบ: ${pick==null?'ไม่ได้ตอบ':`${pick}) ${q.choices[pick]}`}
ข้อแย้งของผู้ทำ: ${claim}
${evidence?`\nข้อมูลที่ค้นได้จากเว็บ:\n${evidence}\n`:''}
วิธีตรวจ: แก้โจทย์เองทีละขั้นก่อน แล้วค่อยเทียบกับเฉลย อย่าเชื่อเฉลยหรือข้อแย้งโดยไม่ตรวจ
- verdict "correct" = เฉลยในระบบถูกแล้ว
- verdict "wrong_key" = โจทย์ใช้ได้ แต่เฉลยผิด ให้ answer เป็นเลขตัวเลือกที่ถูก
- verdict "bad_question" = โจทย์หรือตัวเลือกผิด/กำกวม (ไม่มีข้อถูก ถูกหลายข้อ ข้อมูลผิด) ให้เขียน stem และ choices ที่แก้แล้ว (4 ตัวเลือก ถูกตัวเดียว) และ answer
- confidence "high" เฉพาะเมื่อมีหลักฐานหรือการคำนวณที่ยืนยันได้ชัด
- reason อธิบายสั้นๆ 1–3 ประโยค ตรงประเด็น ไม่ต้องชมหรือปลอบ
ตอบเป็น JSON เท่านั้น: {"verdict":"correct","answer":0,"stem":"","choices":[],"steps":["ขั้นอธิบายเฉลยที่ถูก"],"reason":"","confidence":"high"}`,{signal});
  const v=r1&&String(r1.verdict||'');
  const out={verdict:v||'correct',reason:String(r1&&r1.reason||''),sources,applied:false,agree:false};
  if(v!=='wrong_key'&&v!=='bad_question')return out;
  const prop=v==='bad_question'&&Array.isArray(r1.choices)&&r1.choices.length>=2&&r1.stem
    ?{stem:String(r1.stem),choices:r1.choices.slice(0,6).map(String),answer:+r1.answer}
    :{stem:q.stem,choices:q.choices.slice(),answer:+r1.answer};
  if(!(Number.isInteger(prop.answer)&&prop.answer>=0&&prop.answer<prop.choices.length)||(v==='wrong_key'&&prop.answer===q.answer)){out.verdict='unsure';return out}
  prop.steps=(Array.isArray(r1.steps)?r1.steps:[]).map(String).filter(Boolean).slice(0,4);
  out.prop=prop;
  /* รอบ 2: แก้โจทย์ที่เสนอแบบไม่เห็นเฉลย ตัวเลือกสลับลำดับ */
  step('กำลังตรวจซ้ำรอบที่ 2 (แก้โจทย์ใหม่โดยไม่ดูเฉลย)...');
  const order=shuffle(prop.choices.map((_,j)=>j));
  const r2=await aiJSON(`แก้ข้อสอบปรนัยข้อนี้ คิดทีละขั้นอย่างรอบคอบ แล้วเลือกคำตอบที่ถูกที่สุด
โจทย์: ${prop.stem}
ตัวเลือก:
${order.map((j,i)=>`${i}) ${prop.choices[j]}`).join('\n')}
${q.srcText?`\nเนื้อหาจากเอกสารต้นทาง:\n${q.srcText.slice(0,3000)}\n`:''}${evidence?`\nข้อมูลจากเว็บ:\n${evidence}\n`:''}
ถ้าไม่มีตัวเลือกที่ถูก หรือถูกมากกว่าหนึ่งข้อ ให้ answer เป็น -1
ตอบเป็น JSON เท่านั้น: {"answer":0,"reason":"สั้นๆ"}`,{signal});
  const a2=r2&&Number.isInteger(+r2.answer)&&+r2.answer>=0&&+r2.answer<order.length?order[+r2.answer]:-1;
  out.agree=a2===prop.answer;
  if(out.agree)return out;
  /* รอบ 3 ตัดสินชี้ขาด: 2 รอบแรกไม่ตรงกัน → ให้เทียบเหตุผลของทั้งสองฝั่งกับเอกสาร/หลักฐาน
     ถ้ารอบ 3 เลือกข้อที่รอบ 1 เสนอ (2 ใน 3 เสียงตรงกัน) แก้เลย ไม่ต้องรอผู้ตรวจ */
  step('ผล 2 รอบไม่ตรงกัน กำลังตรวจรอบที่ 3 เพื่อชี้ขาด...');
  const L=j=>j>=0&&j<prop.choices.length?`${j}) ${prop.choices[j]}`:'ไม่มีข้อถูก/ถูกหลายข้อ';
  const oldA=v==='wrong_key'?q.answer:-2;
  const r3=await aiJSON(`คุณเป็นผู้ชี้ขาดข้อพิพาทเรื่องเฉลยข้อสอบ ตัดสินอย่างเป็นกลางจากเนื้อหาและหลักฐาน
โจทย์: ${prop.stem}
ตัวเลือก:
${prop.choices.map((t,j)=>`${j}) ${t}`).join('\n')}
${oldA>=0?`เฉลยเดิมในระบบ: ${L(oldA)}\n`:''}ฝ่าย A เสนอว่าข้อที่ถูกคือ ${L(prop.answer)} เหตุผล: ${out.reason}
ฝ่าย B (แก้ใหม่โดยไม่ดูเฉลย) ได้ ${L(a2)} เหตุผล: ${String(r2&&r2.reason||'-')}
ผู้ทำข้อสอบแย้งว่า: ${claim}
${q.srcText?`\nเนื้อหาจากเอกสารต้นทาง:\n${q.srcText.slice(0,3000)}\n`:''}${evidence?`\nข้อมูลจากเว็บ:\n${evidence}\n`:''}
ตรวจเหตุผลของแต่ละฝ่ายทีละประเด็น แล้วเลือกเลขตัวเลือกที่ถูกที่สุดตามระเบียบ/เนื้อหาจริง
confidence "high" เมื่อเหตุผลหรือหลักฐานยืนยันได้ชัด
ตอบเป็น JSON เท่านั้น: {"answer":0,"reason":"สั้นๆ 1–3 ประโยค","confidence":"high"}`,{signal});
  const a3=r3&&Number.isInteger(+r3.answer)?+r3.answer:-1;
  out.reason3=String(r3&&r3.reason||'');
  if(a3===prop.answer&&String(r3&&r3.confidence||'')!=='low'){out.agree=true;out.tie=true;out.reason=`${out.reason}\nรอบชี้ขาด: ${out.reason3}`;return out}
  if(a3===oldA){out.verdict='correct';out.reason=`ตรวจ 3 รอบ ส่วนใหญ่ยืนยันเฉลยเดิม: ${out.reason3}`;return out}
  out.verdict='unsure';out.reason=`รอบ 1 เสนอ ${L(prop.answer)}: ${out.reason}\nรอบ 2 ได้ ${L(a2)}: ${String(r2&&r2.reason||'-')}\nรอบ 3 ได้ ${L(a3)}: ${out.reason3}`;
  return out;
}

/* แก้ข้อที่ผิด: บันทึก qfix (ทุกคนเห็น) + แก้ต้นทางที่แก้ได้ + แก้ข้อที่เปิดอยู่ในหน้านี้ */
async function applyCorrection(q,res){
  const key=q.origKey||qKey(q),p=res.prop;
  const rec={stem:p.stem,choices:p.choices,answer:p.answer,steps:p.steps||[],why:res.reason.slice(0,600),sources:(res.sources||[]).slice(0,5),verdict:res.verdict==='unsure'?'':res.verdict,
    origAnswer:q.answer,origStem:String(q.stem).slice(0,1500),sub:q.sub||'',at:Date.now(),uid:ME?ME.uid:'',name:ME?ME.name:''};
  let shared=false;
  if(typeof ME!=='undefined'&&ME){try{const f=await fb();await f.fs.setDoc(fsDoc('qfix',key),rec);shared=true}catch(e){console.warn('qfix put',e&&e.code||e)}}
  QFIX.set(key,shared?rec:{...rec,localOnly:true});saveQFixLocal();
  /* ต้นทาง: ข้อสอบจากเอกสาร (บัตรชนิด q) */
  const c=q.card&&CARDS.find(x=>x.id===q.card);
  if(c&&c.type==='q'&&c.q){
    c.q={...c.q,stem:p.stem,choices:p.choices.slice(),answer:p.answer,steps:p.steps&&p.steps.length?p.steps:c.q.steps};
    c.fact=`${p.stem}\nตัวเลือก: ${p.choices.join(' | ')}\nตอบ: ${p.choices[p.answer]}`;c.ansSrc='AI';c.editedAt=Date.now();
    try{await saveCards([c])}catch(e){}
    const pack=String(c.docId).startsWith('c_');
    if(pack&&typeof isReviewerMe==='function'&&isReviewerMe()){try{await editCloudCard(c.docId.slice(2),c.id,{q:c.q,fact:c.fact,ansSrc:c.ansSrc})}catch(e){}}
    else if(pack&&shared){try{const f=await fb();await f.fs.addDoc(f.fs.collection(f.db,'reports'),{uid:ME.uid,name:ME.name,packId:c.docId.slice(2),cardId:c.id,cardFact:String(c.fact).slice(0,1500),
      stem:String(rec.origStem),choices:q.choices,answer:q.answer,proposed:p.choices[p.answer],why:('[AI ตรวจ 2 รอบแล้ว แก้ให้ทุกคนแล้ว] '+rec.why).slice(0,1500),orig:!!q.orig,status:'open',createdAt:f.fs.serverTimestamp()})}catch(e){}}
    else if(!pack){const d=DOCS.find(x=>x.id===c.docId);if(d&&typeof syncPushCards==='function')syncPushCards(d,true).catch(()=>{})}
  }
  /* คลังโจทย์กลาง: ผู้ตรวจแก้ข้อในชุดได้เลย คนอื่นใช้ qfix ทาบทับ */
  if(q.poolId&&typeof isReviewerMe==='function'&&isReviewerMe()){
    try{const f=await fb(),ref=fsDoc('qpool',q.poolId),s=await f.fs.getDoc(ref);
      if(s.exists()){const items=(s.data().items||[]).map(raw=>{try{const x=JSON.parse(raw);return qKey(x)===key?JSON.stringify({...x,stem:p.stem,choices:p.choices,answer:p.answer,steps:(p.steps||[]).map(t=>[t,''])}):raw}catch(e){return raw}});await f.fs.updateDoc(ref,{items})}}catch(e){}
  }
  /* ข้อที่เปิดอยู่ในหน้านี้ (ชุดฝึก / สอบจริง) */
  for(const x of [...((typeof R!=='undefined'&&R&&R.items)||[]),...((typeof M!=='undefined'&&M&&M.items)||[])])if(x&&(x.origKey||qKey(x))===key){x.fixed=null;fixQ(x)}
  return shared;
}

/* ---------- ปรับตัวเลือกที่เดาจากความยาวได้ ----------
   ให้ AI เขียนตัวเลือกใหม่: ย่อข้อถูกให้เหลือสาระหลัก เขียนตัวลวงให้ยาว/ละเอียดใกล้กัน โจทย์และความหมายของข้อถูกเหมือนเดิม
   แล้วให้ AI แก้โจทย์ฉบับใหม่แบบไม่เห็นเฉลย (สลับตัวเลือก) ต้องได้ข้อเดิม จึงเก็บเป็น qfix (verdict "balance") ให้ทุกคน */
async function balanceChoices(q,signal){
  const r=await aiJSON(`ข้อสอบปรนัยข้อนี้ คำตอบที่ถูกยาวและละเอียดกว่าตัวเลือกอื่นมาก ผู้สอบเดาถูกได้จากความยาวโดยไม่ต้องรู้เนื้อหา ให้เขียนตัวเลือกใหม่ทั้งหมด
โจทย์: ${q.stem}
ตัวเลือกเดิม:
${q.choices.map((t,j)=>`${j}) ${t}`).join('\n')}
ข้อที่ถูก: ${q.answer}
กติกา:
- ห้ามเปลี่ยนโจทย์ ห้ามเปลี่ยนความหมายของข้อที่ถูก ให้ย่อข้อที่ถูกให้กระชับเหลือสาระหลัก ตัดคำอธิบายเสริม วงเล็บ และเครื่องหมายคำพูดที่ไม่จำเป็น
- ตัวลวงต้องยังผิดชัดเจนสำหรับคนที่รู้เนื้อหา แต่เขียนให้ฟังดูน่าเชื่อ ยาว ระดับรายละเอียด และสำนวนใกล้เคียงกับข้อที่ถูก
- ความยาวของทุกตัวเลือกต่างกันไม่เกินประมาณ 20%
- จำนวนตัวเลือกเท่าเดิม ลำดับเดิม ข้อที่ถูกยังอยู่ตำแหน่ง ${q.answer} ห้ามใส่ ก ข ค ง หน้าตัวเลือก
ตอบเป็น JSON เท่านั้น: {"choices":["ตัวเลือก0","ตัวเลือก1"]}`,{signal});
  const ch=r&&Array.isArray(r.choices)?r.choices.map(t=>String(t||'').trim()):[];
  if(ch.length!==q.choices.length||ch.some(t=>!t))return null;
  const nq={...q,choices:ch};if(lenTell(nq))return null;
  const order=shuffle(ch.map((_,j)=>j));
  const r2=await aiJSON(`แก้ข้อสอบปรนัยข้อนี้ คิดทีละขั้นอย่างรอบคอบ แล้วเลือกคำตอบที่ถูกที่สุด
โจทย์: ${q.stem}
ตัวเลือก:
${order.map((j,i)=>`${i}) ${ch[j]}`).join('\n')}
ถ้าไม่มีตัวเลือกที่ถูก หรือถูกมากกว่าหนึ่งข้อ ให้ answer เป็น -1
ตอบเป็น JSON เท่านั้น: {"answer":0}`,{signal});
  const a=r2&&Number.isInteger(+r2.answer)&&+r2.answer>=0&&+r2.answer<order.length?order[+r2.answer]:-1;
  return a===q.answer?nq:null;
}
/* ปรับแล้วบันทึก qfix · คืน true เมื่อสำเร็จ */
async function balanceSave(q,signal){
  const key=q.origKey||qKey(q);if(QFIX.has(key))return true;
  const nq=await balanceChoices(q,signal);if(!nq)return false;
  const rec={stem:q.stem,choices:nq.choices,answer:q.answer,steps:[],why:'ปรับความยาวตัวเลือกให้ใกล้กัน เดิมข้อที่ถูกยาวกว่าข้ออื่นจนเดาได้',sources:[],verdict:'balance',
    origAnswer:q.answer,origStem:String(q.stem).slice(0,1500),origChoices:q.choices.slice(),sub:q.sub||'',at:Date.now(),uid:ME?ME.uid:'',name:ME?ME.name:''};
  let shared=false;
  if(typeof ME!=='undefined'&&ME){try{const f=await fb();await f.fs.setDoc(fsDoc('qfix',key),rec);shared=true}catch(e){console.warn('qfix balance',e&&e.code||e)}}
  QFIX.set(key,shared?rec:{...rec,localOnly:true});saveQFixLocal();
  return true;
}
/* ข้อที่ยังเดาง่าย: ข้อสอบจริงในคลัง + โจทย์ในคลังโจทย์กลางที่โหลดไว้แล้ว (ข้อที่ปรับไม่ผ่าน เว้นไว้ 7 วัน) */
const BAL_KEY='exam-bal-fail';let BALFAIL={};try{BALFAIL=JSON.parse(localStorage.getItem(BAL_KEY)||'{}')||{}}catch(e){BALFAIL={}}
function tellQueue(){
  const out=[],seen=new Set(),now=Date.now();
  const add=q=>{if(!q||!q.stem||!lenTell(q))return;const k=qKey(q);if(seen.has(k)||QFIX.has(k)||(BALFAIL[k]&&now-BALFAIL[k]<7*864e5))return;seen.add(k);out.push(q)};
  for(const c of bankItems())if(c.q)add({stem:c.q.stem,choices:c.q.choices,answer:c.q.answer,sub:''});
  if(typeof POOL!=='undefined')for(const [sub,v] of POOL.cache)for(const d of (v&&v.docs)||[])for(const raw of d.items||[]){try{const x=JSON.parse(raw);add({stem:x.stem,choices:x.choices,answer:x.answer,sub})}catch(e){}}
  return out;
}
async function balanceSome(n,route){
  const list=tellQueue().slice(0,n);let ok=0;
  for(const q of list){const sig=Object.assign(new AbortController().signal,{route});
    let done=false;try{done=await balanceSave(q,sig)}catch(e){if(e&&e.code==='cancelled')break;console.warn('balance',e&&e.code||e)}
    if(done)ok++;else{BALFAIL[qKey(q)]=Date.now();try{localStorage.setItem(BAL_KEY,JSON.stringify(BALFAIL))}catch(e){}}}
  return{ok,tried:list.length};
}

/* ผู้ตรวจยกเลิกการแก้ */
async function undoFix(key){
  try{const f=await fb();await f.fs.deleteDoc(fsDoc('qfix',key))}catch(e){toast('ยกเลิกไม่สำเร็จ: '+(e.code||e.message),'bad');return}
  QFIX.delete(key);saveQFixLocal();toast('ยกเลิกการแก้แล้ว ข้อนี้จะกลับไปใช้เฉลยเดิมเมื่อเปิดชุดใหม่');
}
document.addEventListener('click',e=>{const b=e.target.closest('[data-unfix]');if(b)undoFix(b.dataset.unfix)});
