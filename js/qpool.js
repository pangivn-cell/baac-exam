/* qpool.js — คลังโจทย์กลาง: โจทย์ที่ AI สร้างแล้ว เก็บไว้ให้ทุกคนใช้ซ้ำโดยไม่ต้องเสียเครดิต AI อีก */
/* ---------- คลังโจทย์กลาง (Firestore qpool) ----------
   qpool/{id} = โจทย์ที่ AI สร้างในครั้งหนึ่ง {sub, subName, level, by, at, n, items:[โจทย์ JSON string]}
   สร้างชุดใหม่: หยิบจากคลังก่อน (ระดับใกล้เคียง ไม่ซ้ำกับที่เคยตอบถูก/ใช้ไปแล้ว) ให้ AI สร้างเฉพาะที่ขาด แล้วส่งโจทย์ใหม่เข้าคลัง
   ไม่แบ่งโจทย์ที่สร้างจากเอกสารส่วนตัว (ไฟล์ที่ไม่ได้ส่งเข้าคลังกลาง)
   used: {รหัสโจทย์:[uid ที่ทำแล้ว]} ทำชุดจบ = ใช้แล้ว ไม่ส่งข้อนั้นให้คนเดิมอีก · ข้อที่ทุกคนในระบบใช้แล้วถูกลบออก (poolCleanup) */
const POOL={cache:new Map(),used:new Set()};
const POOL_TTL=10*60e3;
/* ---------- คลังโจทย์กลางเป็นไฟล์ใน Google Drive ของแอดมิน (ลดการอ่าน Firestore ที่มีโควตาฟรีวันละ 50,000) ----------
   config/snap.qpool = {id: รหัสไฟล์ qpool.json ใน Drive, at: เวลาที่สร้าง}
   ผู้ใช้: โหลดไฟล์นั้นครั้งเดียว (อ่านตรงจาก Drive) + อ่านจาก Firestore เฉพาะชุดที่เพิ่มหลังจากนั้น
   แอดมิน: สร้างไฟล์ใหม่ทุก 6 ชั่วโมงที่เปิดเว็บ (อ่าน qpool ทั้งหมด 1 รอบ) ผ่านตัวรับไฟล์ Apps Script
   อ่านไฟล์ไม่ได้ (ยังไม่ได้ตั้ง/Drive API ปิด) → กลับไปอ่านจาก Firestore แบบเดิม */
const SNAP={cfg:null,cfgAt:0,docs:null,id:'',newAt:0,news:new Map(),allAt:0,fail:0};
const snapMs=t=>t&&t.toMillis?t.toMillis():+t||0;
async function snapCfg(){
  if(SNAP.cfg&&Date.now()-SNAP.cfgAt<30*60e3)return SNAP.cfg;
  const f=await fb(),s=await f.fs.getDoc(fsDoc('config','snap'));SNAP.cfg=s.exists()?s.data():{};SNAP.cfgAt=Date.now();return SNAP.cfg;
}
/* ชุดทั้งหมดในคลังกลาง (ไฟล์ Drive + ชุดใหม่จาก Firestore) · null = ใช้ไฟล์ไม่ได้ ให้อ่าน Firestore แบบเดิม */
async function poolAll(){
  if(SNAP.fail>Date.now())return null;
  try{
    const c=(await snapCfg()).qpool;if(!c||!c.id)return null;
    if(SNAP.id!==c.id+'|'+c.at){
      const r=await driveMedia(c.id,c.at);
      if(!r.ok)throw{code:r.status};
      const j=await r.json();SNAP.docs=Array.isArray(j.docs)?j.docs:[];SNAP.id=c.id+'|'+c.at;SNAP.news=new Map();SNAP.newAt=+c.at-10*60e3;
    }
    /* ชุดที่เพิ่มหลังสร้างไฟล์: อ่านเฉพาะที่ใหม่กว่ารอบก่อน (รอบละไม่กี่รายการ) */
    if(Date.now()-SNAP.allAt>POOL_TTL){
      const f=await fb(),t0=Date.now(),snap=await f.fs.getDocs(f.fs.query(f.fs.collection(f.db,'qpool'),f.fs.where('at','>',f.fs.Timestamp.fromMillis(SNAP.newAt)),f.fs.limit(300)));
      for(const d of snap.docs)SNAP.news.set(d.id,{id:d.id,...d.data(),at:snapMs(d.data().at)});
      SNAP.newAt=t0-2*60e3;SNAP.allAt=Date.now();
    }
    const m=new Map(SNAP.docs.map(d=>[d.id,d]));for(const [id,d] of SNAP.news)m.set(id,d);
    return [...m.values()];
  }catch(e){console.warn('qpool snap',e&&e.code||e);SNAP.fail=Date.now()+10*60e3;return null}
}
/* แอดมิน: สร้างไฟล์คลังโจทย์กลางใหม่ (อ่าน qpool ทั้งหมด 1 รอบ แล้วเขียนทับไฟล์เดิมใน Drive) */
async function snapBuild(force){
  if(typeof ME==='undefined'||!ME||ME.role!=='admin')return null;
  const c=(await snapCfg()).qpool||{};if(!force&&c.at&&Date.now()-c.at<6*3600e3)return null;
  await ensureSrcDirs();const d=SRC.dirs.find(x=>x.up);if(!d)return{err:'ยังไม่ได้ตั้งตัวรับไฟล์ (Apps Script)'};
  const f=await fb(),t0=Date.now(),snap=await f.fs.getDocs(f.fs.collection(f.db,'qpool'));
  const docs=snap.docs.map(x=>{const v=x.data();return{id:x.id,sub:v.sub,subName:v.subName,level:v.level||0,by:v.by||'',n:v.n||(v.items||[]).length,items:v.items||[],used:v.used||{},at:snapMs(v.at)}});
  const j=await upCall(d.up,{a:'putjson',idToken:await idTok(),name:'qpool.json',id:c.id||'',content:JSON.stringify({at:t0,docs})});
  if(!j.ok)return{err:j.error||'เขียนไฟล์ไม่สำเร็จ'};
  await f.fs.setDoc(fsDoc('config','snap'),{qpool:{id:j.id,at:t0,n:docs.length,size:j.size}},{merge:true});
  SNAP.cfg=null;SNAP.fail=0;POOL.cache.clear();if(typeof QGEN!=='undefined')QGEN.counts=null;
  return{id:j.id,n:docs.length,size:j.size};
}
onAppReady(()=>setTimeout(()=>{const t=()=>snapBuild().catch(e=>console.warn('snap build',e&&e.code||e));t();setInterval(t,30*60e3)},60e3));
async function poolDocs(s){
  const c=POOL.cache.get(s.id);if(c&&Date.now()-c.at<POOL_TTL)return c.docs;
  const all=await poolAll();
  if(all){const docs=all.filter(d=>d.sub===s.id);POOL.cache.set(s.id,{at:Date.now(),docs});return docs}
  try{
    const f=await fb(),snap=await f.fs.getDocs(f.fs.query(f.fs.collection(f.db,'qpool'),f.fs.where('sub','==',s.id),f.fs.limit(60)));
    const docs=snap.docs.map(d=>({id:d.id,...d.data()}));POOL.cache.set(s.id,{at:Date.now(),docs});return docs;
  }catch(e){console.warn('qpool',e&&e.code||e);return c?c.docs:[]}
}
/* โจทย์ที่ใช้ในชุดนี้ได้: ไม่ใช่ข้อที่ตอบถูกแล้ว ไม่ใช่ข้อที่ใช้ไปแล้วในรอบนี้
   หยิบระดับห่างไม่เกิน 1 ก่อน ไม่พอค่อยเติมจากระดับอื่น (ใกล้ก่อน) · เดิมตัดระดับอื่นทิ้ง ผู้ที่อยู่ระดับ 6 ใช้คลังแทบไม่ได้ ต้องรอ AI ทุกชุด */
async function poolTake(s,level,k){
  if(k<=0||s.doc)return[];
  const dist=d=>!level||!d.level?0:Math.abs(d.level-level),near=d=>dist(d)<=1;
  const docs=(await poolDocs(s)),out=[],seen=new Set();
  for(const d of shuffle(docs.slice()))for(const raw of d.items||[]){
    let q;try{q=JSON.parse(raw)}catch(e){continue}
    if(typeof placeholderQ==='function'&&placeholderQ(q))continue;   /* โจทย์ที่ AI ลอกตัวอย่างรูปแบบมา (ตัวเลือก1..4) */
    if(typeof wrongLang==='function'&&wrongLang(q,s.name))continue;   /* ภาษาอังกฤษในวิชาที่สอบเป็นภาษาไทย (AI ในเครื่องเขียนมา) */
    const key=qKey(q),done=(d.used&&d.used[key])||[];
    if(seen.has(key)||POOL.used.has(key)||qMastered(q)||(typeof QHIDE!=='undefined'&&QHIDE['k:'+key])||(q.card&&typeof SKIPT!=='undefined'&&SKIPT['c:'+q.card])||(typeof ME!=='undefined'&&ME&&done.includes(ME.uid)))continue;seen.add(key);
    out.push({q:withCard({...q,sub:s.id,subName:s.name,pool:true,poolId:d.id},null),d:near(d)?0:dist(d)});
  }
  /* โจทย์ยาวเกิน / เดาจากความยาวได้ ถูกเลื่อนไปท้าย · เรื่องเดียวกัน (topic) ไม่ซ้ำในชุดเดียวกันถ้าเลี่ยงได้ */
  const pen=x=>x.d+(String(x.q.stem||'').length>300?2:0)+(typeof lenTell==='function'&&lenTell(x.q)?2:0)+Math.random();
  const sorted=shuffle(out).sort((a,b)=>pen(a)-pen(b)),tp=new Set(),first=[],rest=[];for(const x of sorted){const t=x.q.topic||'';if(t&&tp.has(t))rest.push(x);else{tp.add(t);first.push(x)}}
  const pick=[...first,...rest].slice(0,k).map(x=>x.q);for(const q of pick)POOL.used.add(qKey(q));
  return pick;
}
/* โจทย์ที่แบ่งได้: AI สร้าง และไม่ได้มาจากเอกสารส่วนตัว */
function poolable(q){
  if(!q||q.gen!=='ai'||!q.stem||!Array.isArray(q.choices)||q.answer==null)return false;
  if(typeof wrongLang==='function'&&wrongLang(q))return false;
  if(!q.card)return true;const c=CARDS.find(x=>x.id===q.card);
  return !!c&&String(c.docId).startsWith('c_');
}
async function poolPut(s,level,items){
  if(typeof ME==='undefined'||!ME||s.doc)return;
  const list=items.filter(poolable).map(q=>{const {srcText,retry,pool,by,sub,subName,...keep}=q;return JSON.stringify(keep)}).filter(x=>x.length<12000).slice(0,40);
  if(!list.length)return;
  try{const f=await fb();
    const ref=await f.fs.addDoc(f.fs.collection(f.db,'qpool'),{sub:s.id,subName:s.name,level:level||0,by:ME.uid,n:list.length,items:list,used:{},at:f.fs.serverTimestamp()});
    for(const q of items){POOL.used.add(qKey(q));if(poolable(q))q.poolId=ref.id}POOL.cache.delete(s.id);SNAP.allAt=0;
  }catch(e){console.warn('qpool put',e&&e.code||e)}
}

/* ทำชุดจบ: บันทึกว่าบัญชีนี้ใช้โจทย์ในคลังข้อนั้นแล้ว */
async function poolMarkUsed(items){
  if(typeof ME==='undefined'||!ME)return;
  const by=new Map();for(const q of items){if(!q||!q.poolId)continue;(by.get(q.poolId)||by.set(q.poolId,[]).get(q.poolId)).push(qKey(q))}
  if(!by.size)return;
  try{const f=await fb();
    for(const [id,keys] of by){const patch={};for(const k of keys)patch['used.'+k]=f.fs.arrayUnion(ME.uid);await f.fs.updateDoc(fsDoc('qpool',id),patch)}
  }catch(e){console.warn('qpool used',e&&e.code||e)}
}
/* ผู้ตรวจ/แอดมินเปิดเว็บ (วันละครั้ง): ลบข้อที่ผู้ใช้ทุกคนในระบบใช้แล้ว ชุดที่ไม่เหลือข้อก็ลบทั้งชุด */
async function poolCleanup(force){
  if(typeof ME==='undefined'||!ME||!isReviewerMe())return null;
  const KEY='exam-qpool-clean';let last=0;try{last=+localStorage.getItem(KEY)||0}catch(e){}
  if(!force&&Date.now()-last<20*3600e3)return null;
  try{
    const f=await fb(),users=(await f.fs.getCountFromServer(f.fs.collection(f.db,'users'))).data().count;
    if(!users)return null;
    const snap=await f.fs.getDocs(f.fs.collection(f.db,'qpool'));let removed=0,docs=0;
    for(const d of snap.docs){
      const x=d.data(),used=x.used||{},keep=[],keepUsed={};
      for(const raw of x.items||[]){let k='';try{k=qKey(JSON.parse(raw))}catch(e){}
        if(k&&(used[k]||[]).length>=users){removed++;continue}keep.push(raw);if(k&&used[k])keepUsed[k]=used[k]}
      if(keep.length===(x.items||[]).length)continue;
      if(!keep.length){await f.fs.deleteDoc(d.ref);docs++}else await f.fs.updateDoc(d.ref,{items:keep,used:keepUsed,n:keep.length});
    }
    try{localStorage.setItem(KEY,String(Date.now()))}catch(e){}
    POOL.cache.clear();if(removed)snapBuild(true).catch(()=>{});return{users,removed,docs};
  }catch(e){console.warn('qpool cleanup',e&&e.code||e);return null}
}
