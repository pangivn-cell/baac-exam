/* sync.js — ซิงก์คิวและคลังส่วนตัวข้ามเครื่อง (Firestore ใต้บัญชีของผู้ใช้เอง)
   โครงข้อมูล
     users/{uid}/docs/{key}              ข้อมูลเอกสาร + สถานะคิว + lease (เอกสารเล็ก)
     users/{uid}/docs/{key}/pages/{i}    ข้อความแต่ละหน้า แบ่งก้อนละไม่เกิน ~600 KB
     users/{uid}/docs/{key}/cards/{i}    บัตรความรู้/ข้อสอบ แบ่งก้อน
     users/{uid}/figs/{figId}            รูปประกอบ (บีบแล้ว < 700 KB)
   key = "s"+sha256 เมื่อมีลายนิ้วมือ (ไฟล์เดียวกันทุกเครื่องใช้คีย์เดียวกัน) · ไม่มี sha ใช้ "l"+รหัสในเครื่อง
   lease = เครื่องที่กำลังประมวลผล (3 นาที) กันสองเครื่องย่อยไฟล์เดียวกันพร้อมกัน · AI key ไม่เคยออกจากเครื่อง
   ต้องเผยแพร่กฎใน firestore.rules ก่อน ไม่งั้นระบบจะเก็บงานไว้ในเครื่องเหมือนเดิม */
const SYNC_LEASE_MS=3*60000;
var SYNC={on:false,dev:'',timer:null,pullBusy:false,last:0,err:'',warned:false,meta:new Map(),
  pushing:new Set(),dirty:new Set(),hydrating:new Set(),firstPush:false,pushN:0};
const PFIG_WAIT={};

function syncDevice(){
  if(SYNC.dev)return SYNC.dev;
  try{SYNC.dev=localStorage.getItem('exam-device')||''}catch(e){}
  if(!SYNC.dev){SYNC.dev='d'+Math.random().toString(36).slice(2,10);try{localStorage.setItem('exam-device',SYNC.dev)}catch(e){}}
  return SYNC.dev;
}
const syncOk=()=>typeof ME!=='undefined'&&!!ME&&typeof fb==='function';
/* เอกสารที่ผูกกับบัญชีอื่น (เช่น เคยล็อกอินอีกคนบนเบราว์เซอร์นี้) ห้ามถูกส่งเข้าบัญชีที่กำลังล็อกอินอยู่ */
const syncMine=d=>docMine(d);
const syncKey=d=>d&&(d.sha?'s'+d.sha:'l'+d.id);
const syncRank=s=>({queued:0,read:1,ocr:2,digest:3,embed:4,conflict:5,ready:6})[s]??-1;
const syncStatus=d=>d.stage==='ready'?'ready':d.err?'error':(d.leaseBy?'processing':'queued');
const syErr=e=>{const c=String(e&&(e.code||e.message)||e);SYNC.err=/permission-denied/i.test(c)
  ?'ยังไม่ได้เผยแพร่กฎ Firestore สำหรับซิงก์คิว (วางกฎจาก firestore.rules แล้วกดเผยแพร่)':c;
  if(!SYNC.warned){SYNC.warned=true;console.warn('sync',e)}}
const jbytes=x=>{try{return new TextEncoder().encode(JSON.stringify(x)).length}catch(e){return JSON.stringify(x).length*3}};
/* แบ่งรายการเป็นก้อนตามขนาดไบต์จริง (อักษรไทย 3 ไบต์) ไม่ให้เกินขีดจำกัด 1 MB ของ Firestore */
function jchunks(list,max){
  max=max||600000;const out=[];let cur=[],len=2;
  for(const x of list){
    let n=jbytes(x)+1;
    if(n>max){ /* ชิ้นเดียวยังใหญ่เกิน: ตัดข้อความยาว ๆ ลงก่อน (เกิดได้น้อยมาก) */
      const y=JSON.parse(JSON.stringify(x));
      if(Array.isArray(y.pages))y.pages.forEach(pg=>{if(pg.text&&pg.text.length>200000)pg.text=pg.text.slice(0,200000)});
      if(typeof y.fact==='string'&&y.fact.length>100000)y.fact=y.fact.slice(0,100000);
      x=y;n=jbytes(x)+1;
    }
    if(cur.length&&len+n>max){out.push(cur);cur=[];len=2}
    cur.push(x);len+=n;
  }
  if(cur.length)out.push(cur);return out;
}
const hashStr=s=>{let h=5381;const t=String(s);for(let i=0;i<t.length;i++)h=((h<<5)+h+t.charCodeAt(i))|0;return(h>>>0).toString(36)};

/* ---------- start / stop ---------- */
function syncStart(){
  if(!syncOk()){syncStop();return}
  if(SYNC.on)return;
  SYNC.on=true;syncDevice();SYNC.err='';
  if(P.subject&&String(P.subject).startsWith('doc_')){const d=DOCS.find(x=>x.id===String(P.subject).slice(4));if(d&&!docMine(d)){P.subject='ineq';save()}}
  syncPull().catch(e=>syErr(e));
  SYNC.timer=setInterval(()=>{if(!document.hidden)syncPull().catch(e=>syErr(e))},180000);
  document.addEventListener('visibilitychange',syncVisible);
}
function syncStop(){
  SYNC.on=false;if(SYNC.timer)clearInterval(SYNC.timer);SYNC.timer=null;
  document.removeEventListener('visibilitychange',syncVisible);
}
function syncVisible(){if(!document.hidden&&SYNC.on)syncPull().catch(e=>syErr(e))}

/* ---------- อ่านจาก Firestore ---------- */
function syncDocFromMeta(m){
  /* รหัสบันทึกบนคลาวด์ = 'l'+รหัสในเครื่อง (ไม่มี sha) · ถ้า meta ไม่มี localId ต้องตัด 'l' ออก ไม่งั้นได้รหัสใหม่ 'll…' แล้วเกิดรายการซ้ำที่ลบไม่หาย */
  const id=m.localId||(/^l/.test(m.id)&&!m.sha?m.id.slice(1):m.id),figs=Array.isArray(m.figs)?m.figs:[];
  return{id,name:m.name||'เอกสาร',sha:m.sha||'',driveId:m.driveId||'',srcFile:m.srcFile||'',size:m.size||0,
    type:m.type||'',unit:m.unit||'หน้า',chars:m.chars||0,pages:[],bad:m.bad||[],figPages:m.figPages||[],
    group:m.group||'spec',show:m.show!==false,kind:m.kind||'kb',topic:topicName(m.topic||''),topicDesc:'',newSubj:false,
    noShare:!!m.noShare,stage:m.stage||'queued',ocrDone:m.ocrDone||[],digDone:m.digDone||0,
    summ:Array.isArray(m.summ)?m.summ:[],err:'',prog:'',fileMB:0,pagesParts:m.pagesParts||0,cardsParts:m.cardsParts||0,
    figMeta:figs,stored:m.driveId?'drive':'',at:+m.createdMs||Date.now(),syncAt:Date.now(),
    leaseBy:m.leaseBy||'',leaseAt:+m.leaseAt||0,delCards:Array.isArray(m.delCards)?m.delCards:[],cardsResetAt:+m.cardsResetAt||0,pagesRev:+m.pagesRev||0,cardsRev:+m.cardsRev||0,
    label:m.label||'',pagesRemote:(m.pagesParts||0)>0,cardsRemote:(m.cardsParts||0)>0,cardCount:+((m.counts&&m.counts.cards)||0),qCount:+((m.counts&&m.counts.q)||0),
    txtSha:m.txtSha||'',dupOf:m.dupOf||'',dupSkipped:+m.dupSkipped||0,subs:Array.isArray(m.subs)?m.subs:[],ownerUid:m.ownerUid||ME.uid,remote:true,
    /* เดิมไม่ได้รับสถานะ "เก็บตก" มาด้วย เครื่องใหม่จึงย่อยทั้งไฟล์ซ้ำตั้งแต่ต้นจนบัตรซ้ำ */
    fill:m.stage!=='ready'&&!!m.fill,audit:m.stage!=='ready'&&!!m.audit,reprocess:m.stage!=='ready'&&!!m.fill,reqAt:+m.reqAt||0,doneAt:+m.doneAt||0,
    win:+m.win||0,qBy:m.qBy||'',qAt:+m.qAt||0,cardsPS:Array.isArray(m.cardsPS)&&m.cardsPS.length===(+m.cardsParts||0)?m.cardsPS:[]};
}
function syncRememberFigs(doc,figs){
  for(const f of figs||[])if(f&&f.id)PFIG.set(f.id,{id:f.id,docId:doc.id,page:+f.page||1,desc:f.desc||'',w:+f.w||0,h:+f.h||0});
}
/* many=true: เรียกทีละหลายเอกสาร (syncPull) ผู้เรียกจัดรายวิชาครั้งเดียวตอนจบ — เดิมจัดทุกเอกสาร 138 × ~50 ms หน้าเว็บค้าง 6 วินาที */
async function syncAdopt(m,many){
  const id=m.localId||(/^l/.test(m.id)&&!m.sha?m.id.slice(1):m.id);
  let doc=DOCS.find(d=>d.id===id&&!d.central)||DOCS.find(d=>!d.central&&syncKey(d)===m.id);
  if(!doc&&m.sha){doc=DOCS.find(d=>!d.central&&d.sha===m.sha)}
  if(!doc){
    doc=syncDocFromMeta(m);DOCS.push(doc);await saveDoc(doc);
  }else await syncMerge(doc,m);
  syncRememberFigs(doc,m.figs);
  if(PROC_ID!==doc.id){
    const have=CARDS.filter(c=>c.docId===doc.id).length,rc=(m.counts&&+m.counts.cards)||0;
    if(have<rc)syncHydrateQueue(doc,{cards:true});
    if(m.stage!=='ready'&&(!doc.pages||!doc.pages.length)&&(m.pagesParts||0)>0)syncHydrateQueue(doc,{cards:false,pages:true});
  }
  if(!many)syncDocSubjects();
}
/* คิวโหลดเนื้อหา: ทีละไฟล์ กันยิง Firestore พร้อมกันหลายสิบรายการตอนเพิ่งล็อกอิน */
const SYNC_HYQ=[];let SYNC_HYRUN=false;
function syncHydrateQueue(doc,opts){
  const ex=SYNC_HYQ.find(x=>x[0]===doc);
  if(ex){ex[1]={...ex[1],...(opts||{})};return}
  SYNC_HYQ.push([doc,opts||{}]);syncHydrateRun();
}
async function syncHydrateRun(){
  if(SYNC_HYRUN)return;SYNC_HYRUN=true;
  try{while(SYNC_HYQ.length){const [d,o]=SYNC_HYQ.shift();try{await syncHydrate(d,o)}catch(e){}}}finally{SYNC_HYRUN=false}
}
async function syncMerge(local,m){
  if(!local||local.central||PROC_ID===local.id||local._lease)return;
  const rms=m.updatedAt&&m.updatedAt.toMillis?m.updatedAt.toMillis():0;
  if(rms&&rms<=(local.syncAt||0))return;
  let ch=false;
  const rk=syncRank(m.stage),lk=syncRank(local.stage),rq=+m.reqAt||0,dn=+m.doneAt||0;
  /* อีกเครื่องสั่งงานรอบใหม่ (เก็บตก/ตรวจซ้ำ/ย่อยใหม่) ที่ยังไม่เสร็จ: รับสถานะงานเดียวกันมา
     ให้ระบบจองคิวตัดสินว่าเครื่องไหนทำ (เดิมเครื่องนี้ไม่รู้ ส่วนเครื่องใหม่ย่อยทั้งไฟล์ซ้ำ) */
  if(rq>(+local.reqAt||0)&&m.stage!=='ready'&&!(dn>rq)){
    Object.assign(local,{reqAt:rq,reprocess:true,fill:!!m.fill,audit:!!m.audit,stage:m.stage||'digest',digDone:+m.digDone||0,win:+m.win||0,
      ocrDone:Array.isArray(m.ocrDone)?m.ocrDone:(local.ocrDone||[]),err:'',errCode:'',tries:0,nextTry:0});ch=true}
  /* ไฟล์ที่สั่งเก็บตก/ประมวลผลใหม่ในเครื่องนี้: ไม่เอาสถานะ "พร้อมใช้" เดิมจากคลาวด์มาทับ ไม่งั้นงานไม่ได้เริ่ม
     ยกเว้นคลาวด์เสร็จหลังเวลาที่สั่งงานนี้ (อีกเครื่องทำงานเดียวกันจนจบแล้ว) */
  const redo=!!(local.fill||local.reprocess)&&!(m.stage==='ready'&&dn>(+local.reqAt||0));
  if(m.stage==='ready'&&local.stage!=='ready'&&!redo&&(local.fill||local.reprocess||local.audit)){Object.assign(local,{fill:false,reprocess:false,audit:false});ch=true}
  if(dn>(+local.doneAt||0)){local.doneAt=dn;ch=true}
  if(!redo&&(rk>lk||(+m.digDone||0)>(local.digDone||0))){
    local.digDone=Math.max(local.digDone||0,+m.digDone||0);if(+m.win)local.win=+m.win;
    if(rk>lk)local.stage=m.stage;
    local.ocrDone=[...new Set([...(local.ocrDone||[]),...(m.ocrDone||[])])].sort((a,b)=>a-b);
    if(Array.isArray(m.summ)&&m.summ.length)local.summ=m.summ;
    local.err='';ch=true;
  }
  if(m.stage==='ready'&&local.stage!=='ready'&&!redo){local.stage='ready';local.err='';ch=true}
  for(const k of ['group','show','kind','topic','noShare'])if(m[k]!=null){const v=k==='topic'?topicName(m[k]):m[k];if(local[k]!==v){local[k]=v;ch=true}}
  if(m.pagesParts!=null&&local.pagesParts!==m.pagesParts){local.pagesParts=m.pagesParts;ch=true}
  if(m.cardsParts!=null&&local.cardsParts!==m.cardsParts){local.cardsParts=m.cardsParts;ch=true}
  /* ลายนิ้วมือก้อนบัตรบนคลาวด์: ใช้ดึงเฉพาะก้อนที่เปลี่ยน และใช้เทียบตอนเครื่องนี้ส่งขึ้น (ไม่มี = ผู้เขียนรุ่นเก่า ต้องโหลด/ส่งทั้งชุด) */
  {const ps=Array.isArray(m.cardsPS)&&m.cardsPS.length===(+m.cardsParts||0)?m.cardsPS:[];if(ps.join()!==(local.cardsPS||[]).join()){local.cardsPS=ps;ch=true}}
  if(m.counts){local.cardCount=+m.counts.cards||0;local.qCount=+m.counts.q||0}
  if(m.label!=null&&local.label!==m.label){local.label=m.label;ch=true}
  if(Array.isArray(m.subs)&&(m.subs||[]).join('|')!==(local.subs||[]).join('|')){local.subs=m.subs.slice();ch=true}
  if(m.txtSha&&local.txtSha!==m.txtSha){local.txtSha=m.txtSha;ch=true}
  if(m.dupOf&&local.dupOf!==m.dupOf){local.dupOf=m.dupOf;ch=true}
  if(m.dupSkipped!=null&&local.dupSkipped!==+m.dupSkipped){local.dupSkipped=+m.dupSkipped;ch=true}
  let needCards=false,needPages=false;
  if(Array.isArray(m.delCards)&&(m.delCards.length||(local.delCards||[]).length)){local.delCards=[...new Set([...(local.delCards||[]),...m.delCards])].slice(-1000);ch=true;needCards=true}
  if((+m.cardsResetAt||0)>(+local.cardsResetAt||0)){local.cardsResetAt=+m.cardsResetAt;ch=true;needCards=true}
  if((+m.cardsRev||0)>(+local.cardsRev||0)){local.cardsRev=+m.cardsRev;needCards=true;ch=true}
  if((+m.pagesRev||0)>(+local.pagesRev||0)){local.pagesRev=+m.pagesRev;local.pages=[];local.pagesPS=[];local.pagesRemote=(m.pagesParts||0)>0;ch=true;needPages=true}
  if(Array.isArray(m.figs)){
    const keep=new Set(m.figs.map(f=>f.id));
    const drop=[...PFIG].filter(([id,f])=>f.docId===local.id&&!keep.has(id)).map(([id])=>id);
    if(drop.length){try{await dropFigs(drop)}catch(e){}}
    if(m.figs.length!==(local.figMeta||[]).length){local.figMeta=m.figs;ch=true}
    syncRememberFigs(local,m.figs);
  }
  if(local.leaseBy!==(m.leaseBy||'')||local.leaseAt!==(+m.leaseAt||0)){local.leaseBy=m.leaseBy||'';local.leaseAt=+m.leaseAt||0}
  if(m.qBy!=null&&(local.qBy!==(m.qBy||'')||local.qAt!==(+m.qAt||0))){local.qBy=m.qBy||'';local.qAt=+m.qAt||0;ch=true}
  if(ch){await saveDoc(local);syncDocSubjects()}
  const have=CARDS.filter(c=>c.docId===local.id).length;
  if(needCards||((m.counts&&+m.counts.cards||0)>have))syncHydrateQueue(local,{cards:true,pages:false});
  if(needPages)syncHydrateQueue(local,{cards:false,pages:true});
}
async function syncPull(){
  if(!syncOk()||SYNC.pullBusy)return;
  SYNC.pullBusy=true;
  try{
    const f=await fb(),uid=ME.uid;
    const snap=await f.fs.getDocs(f.fs.collection(f.db,'users',uid,'docs'));
    const metas=new Map();
    for(const s of snap.docs)metas.set(s.id,{id:s.id,...s.data()});
    SYNC.meta=metas;
    for(const m of metas.values()){
      if(m.deleted){await syncDropLocal(m.id,m.localId);continue}
      /* บันทึกที่ยังว่าง (ไม่มีหน้า ไม่มีต้นฉบับ ไม่มีบัตร): ไม่ดึงมาสร้างรายการใหม่ในเครื่องนี้
         (ไม่ลบบนคลาวด์ เพราะอาจเป็นไฟล์ที่อีกเครื่องเพิ่งอัปโหลดและยังส่งหน้าไม่เสร็จ) */
      if(m.stage!=='ready'&&!(+m.pagesParts>0)&&!m.driveId&&!m.srcFile&&!(+m.cardsParts>0)&&!((m.counts&&+m.counts.cards)>0)
        &&!DOCS.some(d=>!d.central&&(d.id===(m.localId||m.id)||syncKey(d)===m.id)))continue;
      await syncAdopt(m,true);
    }
    if(!SYNC.firstPush){SYNC.firstPush=true;syncPushLocal(metas).catch(e=>syErr(e))}
    SYNC.last=Date.now();SYNC.err='';
  }catch(e){syErr(e)}
  finally{
    SYNC.pullBusy=false;syncDocSubjects();renderSide();
    if(VIEW==='kb')renderKB();else if(VIEW==='practice'&&R&&R.status!=='loading')render();
  }
}
/* เอกสารถูกลบจากอีกเครื่อง */
async function syncDropLocal(key,localId){
  const doc=DOCS.find(d=>!d.central&&(d.id===localId||syncKey(d)===key));
  if(!doc)return;
  const ids=CARDS.filter(c=>c.docId===doc.id).map(c=>c.id);
  try{await kbDelMany('docs',[doc.id]);await kbDelMany('files',[doc.id]);await kbDelMany('cards',ids)}catch(e){}
  await dropFigs(docFigs(doc.id).map(f=>f.id));
  DOCS=DOCS.filter(d=>d!==doc);CARDS=CARDS.filter(c=>c.docId!==doc.id);
  if(P.subject==='doc_'+doc.id)P.subject='ineq';
}

/* ---------- โหลดส่วนที่แยกไว้ (เฉพาะเมื่อต้องใช้) ---------- */
async function syncHydrate(doc,{cards=true,pages=false}={}){
  if(!syncOk()||!doc||doc.central||SYNC.hydrating.has(doc.id))return;
  const key=syncKey(doc);if(!key)return;
  SYNC.hydrating.add(doc.id);
  try{
    const f=await fb(),base=['users',ME.uid,'docs',key];
    if(pages&&(doc.pagesParts||0)>0&&(!doc.pages||!doc.pages.length)){
      const snap=await f.fs.getDocs(f.fs.collection(f.db,...base,'pages'));
      const list=snap.docs.slice().sort((a,b)=>+a.id-+b.id).flatMap(s=>s.data().pages||[]);
      if(list.length){
        const by=new Map();for(const p of doc.pages||[])by.set(+p.n,p);
        for(const p of list){const old=by.get(+p.n);by.set(+p.n,(old&&old.text&&!p.text)?old:p)}
        doc.pages=[...by.values()].sort((a,b)=>a.n-b.n);
        doc.chars=doc.pages.reduce((a,p)=>a+(p.text||'').length,0);
        doc.pagesPS=[];   /* ข้อความหน้ามาจากคลาวด์: ครั้งหน้าที่ส่งขึ้นต้องส่งทุกก้อน */
        await saveDoc(doc);
      }
      if(doc.pagesRemote){doc.pagesRemote=false;await saveDoc(doc)}
    }
    if(cards&&!SYNC.pushing.has(doc.id)&&PROC_ID!==doc.id&&((doc.cardsParts||0)>0||(doc.delCards||[]).length||(doc.cardsResetAt||0))){
      /* ดึงเฉพาะก้อนที่ลายนิ้วมือต่างจากที่เครื่องนี้มีแล้ว · โหลดทั้งชุดเมื่อ: ครั้งแรก ไม่มีลายนิ้วมือ (ผู้เขียนรุ่นเก่า) หรือมีการล้างบัตรทั้งชุดใหม่ */
      const ps=doc.cardsPS||[],got=doc.cardsPSGot||[],reset=+doc.cardsResetAt||0;
      const part=ps.length>0&&ps.length===(doc.cardsParts||0)&&got.length>0&&!(reset>(+doc.cardsResetSeen||0));
      let shots;
      if(part){const idx=ps.map((h,i)=>h!==got[i]?i:-1).filter(i=>i>=0);
        shots=(await Promise.all(idx.map(i=>f.fs.getDoc(f.fs.doc(f.db,...base,'cards',String(i)))))).filter(s=>s.exists())}
      else shots=(await f.fs.getDocs(f.fs.collection(f.db,...base,'cards'))).docs.slice().sort((a,b)=>+a.id-+b.id);
      const remote=new Map();
      for(const s of shots)for(const c of s.data().cards||[])if(c&&c.id)remote.set(c.id,vizIn(c));
      SYNC.cardParts=(SYNC.cardParts||0)+shots.length;
      const have=new Map(CARDS.filter(c=>c.docId===doc.id).map(c=>[c.id,c])),add=[];
      for(const [id,rc] of remote){
        const old=have.get(id);
        const rt=topicName(rc.topic);
        if(old){if((+rc.editedAt||0)>(+old.editedAt||0)){Object.assign(old,{...rc,topic:rt,docId:doc.id,st:old.st||rc.st||{}});add.push(old)}}
        else{const nc={...rc,topic:rt,docId:doc.id,st:rc.st||{}};CARDS.push(nc);have.set(id,nc);add.push(nc)}
      }
      if(add.length)await saveCards(add);
      if(doc.cardsRemote){doc.cardsRemote=false;doc.cardCount=CARDS.filter(c=>c.docId===doc.id).length;doc.qCount=CARDS.filter(c=>c.docId===doc.id&&c.type==='q').length;await saveDoc(doc)}
      /* บัตรที่ถูกลบ (หรือล้างทั้งชุดตอนอ่านใหม่) จากอีกเครื่อง ต้องหายจากเครื่องนี้ด้วย */
      const del=new Set(doc.delCards||[]);
      const gone=CARDS.filter(c=>c.docId===doc.id&&(del.has(c.id)||(!part&&reset&&!remote.has(c.id))));
      if(gone.length){CARDS=CARDS.filter(c=>!gone.includes(c));try{await kbDelMany('cards',gone.map(c=>c.id))}catch(e){}}
      /* จำว่าก้อนไหนมีแล้ว (ไม่มีลายนิ้วมือบนคลาวด์ = ครั้งหน้าโหลดทั้งชุดเหมือนเดิม) */
      if(ps.length===(doc.cardsParts||0)){doc.cardsPSGot=ps.slice();doc.cardsResetSeen=reset;await saveDoc(doc)}
      if(add.length||gone.length){syncDocSubjects();renderSide();if(VIEW==='kb')renderKB();}
      /* ทำดัชนีความหมายให้บัตรที่ดึงมาจากเครื่องอื่น (ถ้ามี AI key) เพื่อให้ค้นหา/ถาม AI ได้เหมือนเดิม */
      if(typeof canEmbed==='function'&&canEmbed()){const miss=CARDS.filter(c=>c.docId===doc.id&&!c.emb).slice(0,100);if(miss.length)embedCards(miss).catch(()=>{})}
    }
  }catch(e){syErr(e)}
  finally{SYNC.hydrating.delete(doc.id)}
}
/* ข้อความหน้าเอกสาร: ถ้ามีแต่บนคลาวด์ให้ดึงเมื่อต้องใช้ (ดูตัวอย่าง / ประมวลผลต่อ) */
async function ensureDocPages(doc){
  if(!doc)return[];
  if(doc.pages&&doc.pages.length)return doc.pages;
  if(!doc.pagesParts)return doc.pages||[];
  await syncHydrate(doc,{cards:false,pages:true});
  return doc.pages||[];
}
/* รูปประกอบของคลังส่วนตัว: ดึงเฉพาะรูปที่จะแสดงจริง */
function fetchPersonalFig(id){
  if(PFIG_WAIT[id])return PFIG_WAIT[id];
  return PFIG_WAIT[id]=(async()=>{
    try{
      if(!syncOk())return false;
      const f=await fb(),s=await f.fs.getDoc(f.fs.doc(f.db,'users',ME.uid,'figs',id));
      if(!s.exists())return false;
      const x=s.data(),bin=atob(x.data||''),u8=new Uint8Array(bin.length);
      for(let i=0;i<bin.length;i++)u8[i]=bin.charCodeAt(i);
      await saveFigs([{id,docId:x.docId||'',page:+x.page||1,mime:x.mime||'image/jpeg',blob:new Blob([u8],{type:x.mime||'image/jpeg'}),
        desc:x.desc||'',w:+x.w||0,h:+x.h||0,at:Date.now()}]);
      PFIG.set(id,{id,docId:x.docId||'',page:+x.page||1,desc:x.desc||'',w:+x.w||0,h:+x.h||0});
      document.querySelectorAll(`img[data-pfig="${id}"]`).forEach(im=>{im.src=figURL(id);im.removeAttribute('data-pfig')});
      return true;
    }catch(e){syErr(e);return false}
    finally{delete PFIG_WAIT[id]}
  })();
}

/* ---------- เขียนขึ้น Firestore ---------- */
function syncMetaOf(doc){
  const list=CARDS.filter(c=>c.docId===doc.id);
  const counts=doc.cardsRemote?{cards:Math.max(+doc.cardCount||0,list.length),q:Math.max(+doc.qCount||0,list.filter(c=>c.type==='q').length)}
    :{cards:list.length,q:list.filter(c=>c.type==='q').length};
  return{
    v:1,localId:doc.id,ownerUid:doc.ownerUid||ME.uid,name:doc.name,sha:doc.sha||'',driveId:doc.driveId||'',srcFile:doc.srcFile||'',size:+doc.size||0,
    type:doc.type||'',unit:doc.unit||'หน้า',chars:+doc.chars||0,group:doc.group||'spec',show:doc.show!==false,
    kind:doc.kind||'kb',topic:doc.topic||'',label:doc.label||'',noShare:!!doc.noShare,stage:doc.stage||'',status:syncStatus(doc),
    leaseBy:doc.stage==='ready'?'':(doc.leaseBy||''),leaseAt:doc.stage==='ready'?0:(+doc.leaseAt||0),digDone:+doc.digDone||0,win:+doc.win||0,fill:!!doc.fill,ocrDone:doc.ocrDone||[],
    summ:doc.summ||[],bad:doc.bad||[],figPages:doc.figPages||[],pagesParts:+doc.pagesParts||0,cardsParts:+doc.cardsParts||0,pagesRev:+doc.pagesRev||0,cardsRev:+doc.cardsRev||0,
    figs:(doc.figMeta||[]).map(f=>({id:f.id,page:+f.page||1,desc:f.desc||'',w:+f.w||0,h:+f.h||0})),
    delCards:(doc.delCards||[]).slice(-1000),cardsResetAt:+doc.cardsResetAt||0,cardsPS:Array.isArray(doc.cardsPS)?doc.cardsPS.slice(0,200):[],
    txtSha:doc.txtSha||'',dupOf:doc.dupOf||'',dupSkipped:+doc.dupSkipped||0,subs:(doc.subs||[]).slice(0,20),
    /* งานรอบปัจจุบัน (สั่งเมื่อ reqAt เสร็จเมื่อ doneAt) + เครื่องที่จองไว้ ให้ทุกเครื่องเห็นงานชุดเดียวกัน */
    audit:!!doc.audit,reqAt:+doc.reqAt||0,doneAt:+doc.doneAt||0,qBy:doc.stage==='ready'?'':(doc.qBy||''),qAt:doc.stage==='ready'?0:(+doc.qAt||0),
    counts,createdMs:+doc.at||Date.now(),deleted:false
  };
}
async function syncPushMeta(doc){
  if(doc&&doc.deleted)return;
  if(!syncOk()||!doc||doc.central||!syncMine(doc))return;
  if(!doc.ownerUid){doc.ownerUid=ME.uid;try{await saveDoc(doc)}catch(e){}}
  const f=await fb(),key=syncKey(doc);if(!key)return;
  try{
    await f.fs.setDoc(f.fs.doc(f.db,'users',ME.uid,'docs',key),
      {...syncMetaOf(doc),updatedAt:f.fs.serverTimestamp()},{merge:true});
    doc.syncAt=Date.now();
  }catch(e){syErr(e)}
}
async function syncPushPages(doc,force){
  if(!syncOk()||!doc||doc.central||!syncMine(doc))return;
  /* เอกสารที่ยังไม่ได้โหลดข้อความหน้าจากคลาวด์ ห้ามตีความว่า "ไม่มีหน้า" แล้วลบของเดิม */
  if(doc.pagesRemote&&(!doc.pages||!doc.pages.length))return;
  if(!doc.pages||!doc.pages.length){
    if(doc.pagesParts>0)await syncDeleteParts(doc,'pages',doc.pagesParts);
    if(doc.pagesParts!==0){doc.pagesParts=0;doc.pagesSig='';doc.pagesRemote=false;await saveDoc(doc);await syncPushMeta(doc)}
    return;
  }
  const sig=doc.pages.length+'|'+doc.chars+'|'+hashStr(doc.pages.map(p=>p.text||'').join('\n'));
  if(!force&&doc.pagesSig===sig&&doc.pagesParts>0)return;
  const f=await fb(),key=syncKey(doc),parts=jchunks(doc.pages,600000);
  /* ส่งเฉพาะก้อนหน้าที่เปลี่ยน (ระหว่างอ่านภาพ ส่งทุก 8 หน้า เดิมส่งข้อความทั้งไฟล์ซ้ำทุกรอบ) */
  const ps=parts.map(p=>hashStr(JSON.stringify(p))),was=Array.isArray(doc.pagesPS)?doc.pagesPS:[],had=doc.pagesParts||0;
  try{
    for(let i=0;i<parts.length;i++){if(!force&&i<had&&was[i]===ps[i])continue;
      await f.fs.setDoc(f.fs.doc(f.db,'users',ME.uid,'docs',key,'pages',String(i)),{pages:parts[i],updatedAt:f.fs.serverTimestamp()})}
    if((doc.pagesParts||0)>parts.length)await syncDeleteParts(doc,'pages',doc.pagesParts,parts.length);
    doc.pagesParts=parts.length;doc.pagesPS=ps;doc.pagesSig=sig;doc.pagesRev=(doc.pagesRev||0)+1;doc.pagesRemote=false;await saveDoc(doc);await syncPushMeta(doc);
  }catch(e){syErr(e)}
}
const syncCardOut=c=>{const {emb,em,st,srcText,...rest}=c;return fsClean(vizOut(rest))};
async function syncPushCards(doc,force){
  if(!syncOk()||!doc||doc.central||!syncMine(doc))return;
  if(doc.cardsRemote&&(doc.cardsParts||0)>0)return;
  const list=CARDS.filter(c=>c.docId===doc.id).map(syncCardOut).sort((a,b)=>(a.at||0)-(b.at||0)||String(a.id).localeCompare(String(b.id)));
  const sig=list.length+'|'+hashStr(JSON.stringify(list));
  if(!force&&doc.cardsSig===sig&&doc.cardsParts>0)return;
  const f=await fb(),key=syncKey(doc),parts=jchunks(list,600000);
  /* ส่งเฉพาะก้อนที่เปลี่ยน: บัตรเรียงตามเวลาสร้าง บัตรใหม่ต่อท้าย ก้อนต้นๆ จึงเหมือนเดิม (เดิมส่งทั้งไฟล์ซ้ำทุกช่วงที่ย่อยเสร็จ
     ไฟล์ 1,211 บัตร × 201 ช่วง = ส่งก้อนเดิมหลายร้อยรอบ) · cardsPS = ลายนิ้วมือของแต่ละก้อนที่อยู่บนคลาวด์
     force (ผู้ใช้แก้/ลบบัตร) ส่งทุกก้อน เผื่ออีกเครื่องเพิ่งเขียนทับก้อนเดียวกัน */
  const ps=parts.map(p=>hashStr(JSON.stringify(p))),was=Array.isArray(doc.cardsPS)?doc.cardsPS:[],had=doc.cardsParts||0;
  try{
    for(let i=0;i<parts.length;i++){if(!force&&i<had&&was[i]===ps[i])continue;
      await f.fs.setDoc(f.fs.doc(f.db,'users',ME.uid,'docs',key,'cards',String(i)),{cards:parts[i],ps:ps[i],updatedAt:f.fs.serverTimestamp()})}
    const old=doc.cardsParts||0;
    if(old>parts.length)await syncDeleteParts(doc,'cards',old,parts.length);
    doc.cardsParts=parts.length;doc.cardsPS=ps;doc.cardsPSGot=ps;doc.cardsSig=sig;doc.cardsRev=(doc.cardsRev||0)+1;doc.cardsRemote=false;
    doc.cardCount=list.length;doc.qCount=list.filter(c=>c.type==='q').length;await saveDoc(doc);await syncPushMeta(doc);
  }catch(e){syErr(e)}
}
async function syncPushFigs(doc){
  if(!syncOk()||!doc||doc.central||!syncMine(doc))return;
  const have=new Set((doc.figMeta||[]).map(f=>f.id)),add=[];
  for(const fig of docFigs(doc.id)){
    if(have.has(fig.id))continue;
    const e=await figForCloud(fig.id);
    if(!e)continue;
    try{
      const f=await fb();
      await f.fs.setDoc(f.fs.doc(f.db,'users',ME.uid,'figs',fig.id),
        {docId:doc.id,page:+fig.page||1,mime:e.mime,data:e.data,desc:e.desc||fig.desc||'',w:+fig.w||0,h:+fig.h||0,at:f.fs.serverTimestamp()});
      add.push({id:fig.id,page:+fig.page||1,desc:e.desc||fig.desc||'',w:+fig.w||0,h:+fig.h||0});have.add(fig.id);
    }catch(e){syErr(e)}
  }
  if(add.length){doc.figMeta=[...(doc.figMeta||[]).filter(f=>have.has(f.id)),...add];await saveDoc(doc);await syncPushMeta(doc)}
}
/* ล้างรูปเดิมของเอกสาร (ใช้ตอน "ให้ AI อ่านทุกหน้าใหม่") ไม่ให้เครื่องอื่นเห็นรูปที่ถูกลบแล้ว */
async function syncClearFigs(doc){
  if(!doc||doc.central||!syncMine(doc))return;
  const old=doc.figMeta||[];doc.figMeta=[];await saveDoc(doc);
  if(syncOk()){try{const f=await fb();for(const fig of old)try{await f.fs.deleteDoc(f.fs.doc(f.db,'users',ME.uid,'figs',fig.id))}catch(e){}}catch(e){syErr(e)}}
  await syncPushMeta(doc);
}
async function syncDeleteParts(doc,kind,count,from){
  const f=await fb(),key=syncKey(doc);
  for(let i=from==null?0:from;i<count;i++)try{await f.fs.deleteDoc(f.fs.doc(f.db,'users',ME.uid,'docs',key,kind,String(i)))}catch(e){}
}
/* รวบการเขียนหลายอย่างเป็นรอบเดียว กันเขียนถี่เกินระหว่างประมวลผล */
const SYNC_FLAGS={},SYNC_TIMER={};
function syncQueue(doc,flags){
  if(!syncOk()||!doc||doc.central)return;
  const k=doc.id;SYNC_FLAGS[k]={pages:false,cards:false,figs:false,...(SYNC_FLAGS[k]||{}),...(flags||{})};
  clearTimeout(SYNC_TIMER[k]);
  SYNC_TIMER[k]=setTimeout(()=>{const f=SYNC_FLAGS[k]||{};delete SYNC_FLAGS[k];delete SYNC_TIMER[k];syncPushDoc(doc,f).catch(e=>syErr(e))},1200);
}
async function syncPushDoc(doc,flags){
  if(!syncOk()||!doc||doc.central||doc.deleted)return;
  const fl={pages:true,cards:true,figs:true,...(flags||{})};
  if(SYNC.pushing.has(doc.id)){SYNC.dirty.add(doc.id);return}
  SYNC.pushing.add(doc.id);
  try{
    /* เขียนส่วนเนื้อหาก่อน แล้วเขียน meta ที่อ้างถึงจำนวนก้อนทีหลัง */
    if(fl.pages)await syncPushPages(doc,fl.force);
    if(fl.cards)await syncPushCards(doc,fl.force);
    if(fl.figs)await syncPushFigs(doc);
    await syncPushMeta(doc);
  }catch(e){syErr(e)}
  finally{
    SYNC.pushing.delete(doc.id);
    if(SYNC.dirty.delete(doc.id))setTimeout(()=>syncPushDoc(doc,fl).catch(e=>syErr(e)),600);
  }
}
/* เครื่องนี้มีเอกสารที่บัญชียังไม่มี (เช่น เพิ่งล็อกอินครั้งแรก) → ส่งขึ้นทีละไฟล์ */
async function syncPushLocal(metas){
  const list=DOCS.filter(d=>!d.central&&syncMine(d)&&!metas.has(syncKey(d)));
  if(!list.length)return;
  SYNC.pushN=list.length;
  toast(`กำลังซิงก์คลัง ${list.length} ไฟล์ขึ้นบัญชี...`);
  let done=0,bad=false;
  for(const d of list){
    if(!syncOk())break;
    await syncPushDoc(d,{force:false});
    done++;SYNC.pushN--;
    if(/permission-denied/i.test(SYNC.err||'')){bad=true;break}
    await new Promise(r=>setTimeout(r,250));
  }
  SYNC.pushN=0;
  if(bad)toast('ซิงก์คลังไม่สำเร็จ: ยังไม่ได้เผยแพร่กฎ Firestore','bad');
  else toast(done>1?`ซิงก์คลังขึ้นบัญชีแล้ว ${done} ไฟล์`:'ซิงก์คลังขึ้นบัญชีแล้ว');
}

/* ---------- lease: กันสองเครื่องย่อยไฟล์เดียวกัน ---------- */
/* เจ้าของคิว: lease กันได้แค่ไฟล์ที่กำลังทำอยู่ ไฟล์ที่รอคิวในเครื่องหนึ่ง (เช่น เก็บตก 10 ไฟล์) เครื่องอื่นเคยหยิบไปย่อยซ้ำ
   ตอนนี้ไฟล์ที่เข้าคิวจดเครื่องเจ้าของไว้ (qBy) เครื่องที่มีงานส่งสัญญาณมีชีวิตทุกนาทีที่ users/{uid}/qlog/devs
   เครื่องอื่นไม่แตะจนกว่าเจ้าของเงียบเกิน 6 นาที (ปิดเว็บ/ปิดเครื่อง) แล้วจึงรับช่วงต่อจากความคืบหน้าบนคลาวด์ */
const DEV_FRESH=6*60000;
var DEVBEAT={},DEVBEAT_OK=false,DEVBEAT_W=0;
/* ยังไม่ได้อ่านรายชื่อเครื่อง (เพิ่งเปิดเว็บ): ถือว่าเจ้าของยังอยู่ไว้ก่อน ไม่แย่งงาน */
const devAlive=dev=>!!dev&&(dev===syncDevice()||!DEVBEAT_OK||Date.now()-(+((DEVBEAT[dev]||{}).at)||0)<DEV_FRESH);
const devLabel=dev=>(DEVBEAT[dev]||{}).name||'เครื่องอื่น';
function devName(){const u=navigator.userAgent;return `${/Android/.test(u)?'Android':/iPhone|iPad/.test(u)?'iPhone/iPad':/Windows/.test(u)?'Windows':/Mac/.test(u)?'Mac':'เครื่อง'} · ${/Edg\//.test(u)?'Edge':/Chrome\//.test(u)?'Chrome':/Firefox/.test(u)?'Firefox':/Safari/.test(u)?'Safari':'เบราว์เซอร์'}`}
const ownedElsewhere=d=>!!(d&&d.stage!=='ready'&&d.qBy&&d.qBy!==syncDevice()&&devAlive(d.qBy));
const leasedElsewhere=d=>!!(d&&d.stage!=='ready'&&d.leaseBy&&d.leaseBy!==syncDevice()&&(Date.now()-(+d.leaseAt||0)<SYNC_LEASE_MS));
function docBusyElsewhere(d){return leasedElsewhere(d)||ownedElsewhere(d)}
const devHasWork=()=>!!PROC_ID||PROCQ.length>0||DOCS.some(d=>!d.central&&d.stage!=='ready'&&d.qBy===syncDevice());
async function devBeat(force){
  if(!syncOk())return;
  try{const f=await fb(),ref=fsDoc('users',ME.uid,'qlog','devs');
    if(devHasWork()&&(force||Date.now()-DEVBEAT_W>50000)){DEVBEAT_W=Date.now();await f.fs.setDoc(ref,{[syncDevice()]:{at:Date.now(),name:devName()}},{merge:true})}
    const s=await f.fs.getDoc(ref);DEVBEAT=s.exists()?s.data():{};DEVBEAT_OK=true;
  }catch(e){}
}
/* เข้าคิวในเครื่องนี้ = จองไฟล์ไว้ให้เครื่องนี้ (บอกเครื่องอื่นทันที ไม่ต้องรอรอบซิงก์) */
async function syncOwn(doc){
  if(!doc||doc.central||doc.stage==='ready'||!syncMine(doc))return;
  if(doc.qBy===syncDevice()&&Date.now()-(+doc.qAt||0)<DEV_FRESH)return;
  doc.qBy=syncDevice();doc.qAt=Date.now();try{await saveDoc(doc)}catch(e){}
  if(!syncOk())return;
  devBeat(true);
  try{const f=await fb();await f.fs.updateDoc(f.fs.doc(f.db,'users',ME.uid,'docs',syncKey(doc)),{qBy:doc.qBy,qAt:doc.qAt,updatedAt:f.fs.serverTimestamp()});doc.syncAt=Date.now()}
  catch(e){if(!/not-found/i.test(String(e&&(e.code||e.message))))syErr(e)}
}
/* ส่งงานให้เครื่องหลัก (รอ AI ในเครื่อง): ปล่อยการจอง ให้เครื่องหลักรับไปทำ */
async function syncDisown(doc){
  if(!doc||doc.qBy!==syncDevice())return;
  doc.qBy='';doc.qAt=0;try{await saveDoc(doc)}catch(e){}
  if(syncOk())try{const f=await fb();await f.fs.updateDoc(f.fs.doc(f.db,'users',ME.uid,'docs',syncKey(doc)),{qBy:'',qAt:0,updatedAt:f.fs.serverTimestamp()})}catch(e){}
}
async function syncClaim(doc){
  if(!syncOk()||!doc||doc.central||!syncMine(doc))return{ok:true};
  const f=await fb(),key=syncKey(doc);if(!key)return{ok:true};
  try{
    const res=await f.fs.runTransaction(f.db,async tx=>{
      const ref=f.fs.doc(f.db,'users',ME.uid,'docs',key),s=await tx.get(ref),d=s.exists()?s.data():{};
      if(!s.exists()){tx.set(ref,{...syncMetaOf(doc),updatedAt:f.fs.serverTimestamp()},{merge:true});return{ok:true,created:true}}
      if(d.deleted)return{ok:true};
      /* เสร็จบนคลาวด์หลังจากสั่งงานนี้แล้ว (อีกเครื่องรับช่วงทำจนจบ) = ไม่ต้องทำซ้ำ */
      if(d.stage==='ready'&&(!doc.reprocess||(+d.doneAt||0)>(+doc.reqAt||0)))return{ok:false,ready:true};
      if(d.leaseBy&&d.leaseBy!==syncDevice()&&(Date.now()-(+d.leaseAt||0)<SYNC_LEASE_MS))return{ok:false,lease:true};
      /* เครื่องอื่นจองไว้ในคิวและยังเปิดอยู่: ไม่แย่ง (ยกเว้นผู้ใช้กดสั่งทำที่เครื่องนี้เอง) */
      if(!doc.takeOver&&d.stage!=='ready'&&d.qBy&&d.qBy!==syncDevice()&&devAlive(d.qBy))return{ok:false,owned:true,by:d.qBy};
      tx.set(ref,{status:'processing',leaseBy:syncDevice(),leaseAt:Date.now(),qBy:syncDevice(),qAt:Date.now(),localId:doc.id,updatedAt:f.fs.serverTimestamp()},{merge:true});
      return{ok:true,meta:d};
    });
    if(res&&res.ok){doc.leaseBy=syncDevice();doc.leaseAt=Date.now();doc.qBy=syncDevice();doc.qAt=Date.now();doc.takeOver=false;if(res.meta)takeProgress(doc,res.meta)}
    else if(res&&res.owned){doc.qBy=res.by;doc.qAt=Date.now()}
    return res||{ok:true};
  }catch(e){syErr(e);return{ok:true}}
}
/* ก่อนเริ่มประมวลผล: ถ้าบนคลาวด์ไปได้ไกลกว่าในเครื่อง (ทำต่อจากอีกเครื่อง หรือเครื่องนี้บันทึกไม่ทัน) ใช้ความคืบหน้าที่ไกลกว่า ไม่เริ่มใหม่ */
function takeProgress(doc,m){
  /* สั่งย่อยใหม่ทั้งชุด: ความคืบหน้าบนคลาวด์ใช้ได้เฉพาะเมื่อเป็นงานเดียวกัน (เครื่องเจ้าของเดิมทำค้างไว้) */
  if(!m||doc.reprocess&&!doc.fill&&!((+m.reqAt||0)&&+m.reqAt===+doc.reqAt))return;
  const rk=syncRank(m.stage),lk=syncRank(doc.stage),cd=+m.digDone||0,cw=+m.win||0;
  /* นับช่วงคนละขนาดกันไม่ได้: ใช้ของคลาวด์เมื่อขนาดช่วงตรงกัน (หรือในเครื่องยังไม่เริ่มย่อย) */
  if(cd>(doc.digDone||0)&&(!doc.digDone||!cw||!doc.win||cw===doc.win)){doc.digDone=cd;if(cw)doc.win=cw}
  if(rk>lk&&rk<syncRank('ready'))doc.stage=m.stage;
  doc.ocrDone=[...new Set([...(doc.ocrDone||[]),...(m.ocrDone||[])])].sort((a,b)=>a-b);
  if(Array.isArray(m.summ)&&m.summ.length>(doc.summ||[]).length)doc.summ=m.summ;
  /* ข้อความหน้าที่ AI อ่านจากภาพแล้วอยู่บนคลาวด์ใหม่กว่า: โหลดใหม่ก่อนทำต่อ */
  if((+m.pagesRev||0)>(+doc.pagesRev||0)&&(m.pagesParts||0)>0){doc.pagesRev=+m.pagesRev;doc.pagesParts=+m.pagesParts;doc.pages=[];doc.pagesPS=[];doc.pagesRemote=true}
}
async function syncLease(doc){
  if(!syncOk()||!doc||doc.central)return;
  /* updateDoc ไม่ใช่ setDoc: ไฟล์ที่ถูกลบไปแล้วจะไม่เกิดบันทึกว่างค้างบนคลาวด์ */
  try{const f=await fb();await f.fs.updateDoc(f.fs.doc(f.db,'users',ME.uid,'docs',syncKey(doc)),
    {status:'processing',leaseBy:syncDevice(),leaseAt:Date.now(),qBy:syncDevice(),qAt:Date.now(),updatedAt:f.fs.serverTimestamp()})}catch(e){}
  devBeat();
}
async function syncRelease(doc){
  if(!doc||doc.central)return;
  doc.leaseBy='';doc.leaseAt=0;if(doc.stage==='ready'){doc.qBy='';doc.qAt=0}
  if(syncOk())try{const f=await fb();await f.fs.updateDoc(f.fs.doc(f.db,'users',ME.uid,'docs',syncKey(doc)),
    {status:syncStatus(doc),leaseBy:'',leaseAt:0,...(doc.stage==='ready'?{qBy:'',qAt:0}:{}),updatedAt:f.fs.serverTimestamp()})}catch(e){}
  try{await saveDoc(doc)}catch(e){}
}

/* ---------- เครื่องประมวลผลหลัก (AI ในเครื่อง) ----------
   เครื่องที่เปิดใช้ AI ในเครื่อง และเชื่อมต่อได้ ส่งสัญญาณ "ออนไลน์" ทุกนาทีที่ users/{uid}/qlog/llmhost (สิทธิ์เดียวกับตั้งค่า AI)
   เครื่องอื่นอ่านสัญญาณนี้: ออนไลน์ = ปล่อยไฟล์ให้เครื่องหลักทำ · ออฟไลน์ = ใช้ AI ของตัวเอง ถ้าใช้ไม่ได้ก็รอคิวเครื่องหลัก */
const HOST_FRESH=3*60000;
var HOSTBEAT=null;
const hostAlive=()=>!!HOSTBEAT&&HOSTBEAT.dev!==syncDevice()&&Date.now()-(+HOSTBEAT.at||0)<HOST_FRESH;
async function hostTick(){
  const was=localUp();await pingLocal();
  if(was!==localUp()){const e=document.getElementById('hstat');if(e){e.textContent=hostStatusText();e.className='hint '+(localUp()?'ok':LLMHOST.on?'err':'')}}
  if(!syncOk())return;
  await devBeat();
  try{const f=await fb(),ref=fsDoc('users',ME.uid,'qlog','llmhost');
    if(localUp()){HOSTBEAT={at:Date.now(),dev:syncDevice(),model:LLMHOST.model};await f.fs.setDoc(ref,HOSTBEAT);
      /* เครื่องหลักดึงรายการไฟล์ใหม่จากเครื่องอื่นทุกนาที แม้แท็บอยู่เบื้องหลัง */
      if(!SYNC.pullBusy&&Date.now()-SYNC.last>55000)syncPull().catch(e=>syErr(e))}
    else{const s=await f.fs.getDoc(ref);HOSTBEAT=s.exists()?s.data():null}
  }catch(e){}
}
onAppReady(()=>{setTimeout(hostTick,4000);setInterval(hostTick,60000)});

/* ---------- ลบ ---------- */
const SYNC_DEL_KEY='exam-sync-del';
function syncDeletedList(){try{return JSON.parse(localStorage.getItem(SYNC_DEL_KEY)||'[]')}catch(e){return[]}}
function syncDeletedMark(key){try{const l=syncDeletedList();if(!l.includes(key)){l.push(key);localStorage.setItem(SYNC_DEL_KEY,JSON.stringify(l.slice(-200)))} }catch(e){}}
function syncDeletedUnmark(key){try{localStorage.setItem(SYNC_DEL_KEY,JSON.stringify(syncDeletedList().filter(k=>k!==key)))}catch(e){}}
async function syncDeleteDoc(doc){
  if(!doc||doc.central||!syncMine(doc))return;
  const key=syncKey(doc);
  if(!syncOk()){syncDeletedMark(key);return}
  const f=await fb();
  try{
    /* ตั้ง tombstone ก่อน เพื่อให้เครื่องอื่นหยุดใช้ทันที แม้ลบส่วนย่อยไม่สำเร็จ */
    await f.fs.setDoc(f.fs.doc(f.db,'users',ME.uid,'docs',key),
      {deleted:true,localId:doc.id,name:doc.name,updatedAt:f.fs.serverTimestamp(),leaseBy:'',leaseAt:0},{merge:true});
    for(let i=0;i<(doc.pagesParts||0);i++)try{await f.fs.deleteDoc(f.fs.doc(f.db,'users',ME.uid,'docs',key,'pages',String(i)))}catch(e){}
    for(let i=0;i<(doc.cardsParts||0);i++)try{await f.fs.deleteDoc(f.fs.doc(f.db,'users',ME.uid,'docs',key,'cards',String(i)))}catch(e){}
    for(const fig of doc.figMeta||[])try{await f.fs.deleteDoc(f.fs.doc(f.db,'users',ME.uid,'figs',fig.id))}catch(e){}
    syncDeletedUnmark(key);
  }catch(e){syErr(e);syncDeletedMark(key)}
}
async function syncFlushDeletes(){
  const list=syncDeletedList();
  for(const key of list){
    try{const f=await fb();await f.fs.setDoc(f.fs.doc(f.db,'users',ME.uid,'docs',key),
      {deleted:true,updatedAt:f.fs.serverTimestamp(),leaseBy:'',leaseAt:0},{merge:true});syncDeletedUnmark(key)}catch(e){break}
  }
}

/* ---------- ใช้ตอนอัปโหลด: ไฟล์นี้อยู่ในบัญชีแล้วหรือยัง ---------- */
async function syncRemoteBySha(sha){
  if(!syncOk()||!sha)return null;
  try{const f=await fb(),s=await f.fs.getDoc(f.fs.doc(f.db,'users',ME.uid,'docs','s'+sha));
    return s.exists()?{id:s.id,...s.data()}:null}catch(e){syErr(e);return null}
}
