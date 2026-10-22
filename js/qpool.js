/* qpool.js — คลังโจทย์กลาง: โจทย์ที่ AI สร้างแล้ว เก็บไว้ให้ทุกคนใช้ซ้ำโดยไม่ต้องเสียเครดิต AI อีก */
/* ---------- คลังโจทย์กลาง (Firestore qpool) ----------
   qpool/{id} = โจทย์ที่ AI สร้างในครั้งหนึ่ง {sub, subName, level, by, at, n, items:[โจทย์ JSON string]}
   สร้างชุดใหม่: หยิบจากคลังก่อน (ระดับใกล้เคียง ไม่ซ้ำกับที่เคยตอบถูก/ใช้ไปแล้ว) ให้ AI สร้างเฉพาะที่ขาด แล้วส่งโจทย์ใหม่เข้าคลัง
   ไม่แบ่งโจทย์ที่สร้างจากเอกสารส่วนตัว (ไฟล์ที่ไม่ได้ส่งเข้าคลังกลาง)
   used: {รหัสโจทย์:[uid ที่ทำแล้ว]} ทำชุดจบ = ใช้แล้ว ไม่ส่งข้อนั้นให้คนเดิมอีก · ข้อที่ทุกคนในระบบใช้แล้วถูกลบออก (poolCleanup) */
const POOL={cache:new Map(),used:new Set()};
const POOL_TTL=10*60e3;
async function poolDocs(s){
  const c=POOL.cache.get(s.id);if(c&&Date.now()-c.at<POOL_TTL)return c.docs;
  try{
    const f=await fb(),snap=await f.fs.getDocs(f.fs.query(f.fs.collection(f.db,'qpool'),f.fs.where('sub','==',s.id),f.fs.limit(60)));
    const docs=snap.docs.map(d=>({id:d.id,...d.data()}));POOL.cache.set(s.id,{at:Date.now(),docs});return docs;
  }catch(e){console.warn('qpool',e&&e.code||e);return c?c.docs:[]}
}
/* โจทย์ที่ใช้ในชุดนี้ได้: ระดับห่างไม่เกิน 1 ไม่ใช่ข้อที่ตอบถูกแล้ว ไม่ใช่ข้อที่ใช้ไปแล้วในรอบนี้ */
async function poolTake(s,level,k){
  if(k<=0||s.doc)return[];
  const docs=(await poolDocs(s)).filter(d=>!level||!d.level||Math.abs(d.level-level)<=1),out=[],seen=new Set();
  for(const d of shuffle(docs.slice()))for(const raw of d.items||[]){
    let q;try{q=JSON.parse(raw)}catch(e){continue}
    const key=qKey(q),done=(d.used&&d.used[key])||[];
    if(seen.has(key)||POOL.used.has(key)||qMastered(q)||(typeof ME!=='undefined'&&ME&&done.includes(ME.uid)))continue;seen.add(key);
    out.push(withCard({...q,sub:s.id,subName:s.name,pool:true,poolId:d.id},null));
  }
  const pick=shuffle(out).slice(0,k);for(const q of pick)POOL.used.add(qKey(q));
  return pick;
}
/* โจทย์ที่แบ่งได้: AI สร้าง และไม่ได้มาจากเอกสารส่วนตัว */
function poolable(q){
  if(!q||q.gen!=='ai'||!q.stem||!Array.isArray(q.choices)||q.answer==null)return false;
  if(!q.card)return true;const c=CARDS.find(x=>x.id===q.card);
  return !!c&&String(c.docId).startsWith('c_');
}
async function poolPut(s,level,items){
  if(typeof ME==='undefined'||!ME||s.doc)return;
  const list=items.filter(poolable).map(q=>{const {srcText,retry,pool,by,sub,subName,...keep}=q;return JSON.stringify(keep)}).filter(x=>x.length<12000).slice(0,40);
  if(!list.length)return;
  try{const f=await fb();
    const ref=await f.fs.addDoc(f.fs.collection(f.db,'qpool'),{sub:s.id,subName:s.name,level:level||0,by:ME.uid,n:list.length,items:list,used:{},at:f.fs.serverTimestamp()});
    for(const q of items){POOL.used.add(qKey(q));if(poolable(q))q.poolId=ref.id}POOL.cache.delete(s.id);
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
    POOL.cache.clear();return{users,removed,docs};
  }catch(e){console.warn('qpool cleanup',e&&e.code||e);return null}
}
