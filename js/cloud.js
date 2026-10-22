/* cloud.js — Firebase: ล็อกอิน คลังกลาง ส่งเข้าคลัง ตรวจอนุมัติ รายงานเฉลยผิด */
/* ---------- คลังกลาง (Firebase, แพ็กเกจฟรี): ล็อกอิน · ส่งเข้าคลัง · ผู้ตรวจอนุมัติ · ซิงก์ให้ทุกคน ----------
   kb/{id}      ชุดความรู้/ข้อสอบที่อนุมัติแล้ว ใครก็อ่านได้   kbfigs/{id}  รูปของชุดนั้น
   subs/{id}    ที่ส่งเข้ามารออนุมัติ                         subfigs/{id} รูปที่รออนุมัติ
   reports/{id} รายงานเฉลยผิด                                users/{uid}  บทบาท user / reviewer / admin */
const FB_CFG={apiKey:'AIzaSyD5w5BpdC_26Vm8hKXvuy6TUGWHY74yHZo',authDomain:'baac-smart-que.firebaseapp.com',projectId:'baac-smart-que',
  storageBucket:'baac-smart-que.firebasestorage.app',messagingSenderId:'162370427452',appId:'1:162370427452:web:2bf521af46c434072b4139'};
const FBU='https://www.gstatic.com/firebasejs/10.12.2/';
var FB=null,ME=null,CLOUD={ok:null,err:'',last:0,syncing:false},HIDE=new Set(),CFIG=new Map();
let fbP=null;
function fb(){
  return fbP||(fbP=(async()=>{
    const [a,au,fs]=await Promise.all([import(FBU+'firebase-app.js'),import(FBU+'firebase-auth.js'),import(FBU+'firebase-firestore.js')]);
    const app=a.initializeApp(FB_CFG);FB={app,auth:au.getAuth(app),db:fs.getFirestore(app),au,fs};return FB;
  })().catch(e=>{fbP=null;CLOUD.ok=false;CLOUD.err='เชื่อมต่อคลังกลางไม่ได้ ตรวจอินเทอร์เน็ต';throw e}));
}
const isReviewerMe=()=>!!ME&&(ME.role==='reviewer'||ME.role==='admin');
const fsDoc=(...p)=>FB.fs.doc(FB.db,...p);

/* ---------- account ---------- */
async function cloudInit(){
  renderAcct();
  try{
    const f=await fb();
    f.au.onAuthStateChanged(f.auth,async u=>{
      if(!u){ME=null;renderAcct();refreshCloudViews();if(VIEW==='rank')renderRank();return}
      ME={uid:u.uid,name:u.displayName||(u.email||'').split('@')[0]||'ผู้ใช้',email:u.email||'',role:'user'};
      try{const s=await f.fs.getDoc(fsDoc('users',u.uid));
        if(s.exists())ME.role=s.data().role||'user';
        else await f.fs.setDoc(fsDoc('users',u.uid),{name:ME.name,email:ME.email,role:'user',createdAt:f.fs.serverTimestamp()});
      }catch(e){}
      renderAcct();renderSide();refreshCloudViews();checkSubs();loadMyPoints().then(flushPoints);flushShares();pullQLog();pullAIP();setTimeout(()=>poolCleanup(),8000);
    });
    f.au.onAuthStateChanged(f.auth,()=>setTimeout(onboard,600));
    await syncCentral();
  }catch(e){renderAcct();if(VIEW==='kb')renderKB();setTimeout(onboard,600)}
}
function refreshCloudViews(){if(VIEW==='kb')renderKB();else if(VIEW==='review')renderReview();else if(VIEW==='home')renderHome();else if(VIEW==='rank')renderRank()}
function renderAcct(){
  const el=document.getElementById('acct');if(!el)return;
  const rv=document.getElementById('vreview');if(rv)rv.hidden=!isReviewerMe();
  const pts=P.pts||0,lv=lvlFromPts(pts);
  if(ME){
    el.innerHTML=`<div class="acard"><div class="av" aria-hidden="true">${esc((ME.name||'?').trim().slice(0,1).toUpperCase())}</div><div class="ainfo"><button class="aname" id="rename" title="แตะเพื่อเปลี่ยนชื่อที่แสดงในอันดับ">${esc(ME.name)}</button>
      <span class="src">ระดับผู้สอบ ${lv} · ${nf(pts)} คะแนน${ME.role!=='user'?` · <b>${ME.role==='admin'?'แอดมิน':'ผู้ตรวจ'}</b>`:''}</span></div></div><button class="logout" id="logout">ออกจากระบบ</button>`;
    document.getElementById('logout').onclick=async()=>{if(await modal('<p class="mt">ออกจากระบบ?</p><p class="src">คะแนนที่ทำต่อจากนี้จะเก็บในเครื่องก่อน แล้วขึ้นอันดับเมื่อเข้าสู่ระบบอีกครั้ง</p>',[{t:'ยกเลิก'},{t:'ออกจากระบบ',cls:'primary'}])!==1)return;
      await FB.au.signOut(FB.auth);if(VIEW==='review')setView('kb')};
    document.getElementById('rename').onclick=renameMe;
  }else{
    el.innerHTML=`<button class="loginbig" id="login">🔑 เข้าสู่ระบบ</button><p class="src">เก็บคะแนน ขึ้นอันดับ จำระดับข้ามเครื่อง และเพิ่มเอกสารเข้าคลังกลาง${pts?` · ในเครื่องนี้ ${nf(pts)} คะแนน (ระดับ ${lv})`:''}</p>`;
    document.getElementById('login').onclick=()=>loginDialog();
  }
}
async function loginDialog(){
  let f;try{f=await fb()}catch(e){toast('เชื่อมต่อคลังกลางไม่ได้ ตรวจอินเทอร์เน็ต','bad');return false}
  const p=modal(`<p class="mt">เข้าสู่ระบบ</p><button class="primary" id="lg-g" type="button">เข้าสู่ระบบด้วย Google</button>
    <p class="src" style="text-align:center">หรือใช้อีเมล</p>
    <label class="lbl" for="lg-e">อีเมล</label><input class="tx" id="lg-e" type="email" autocomplete="email">
    <label class="lbl" for="lg-p">รหัสผ่าน (อย่างน้อย 6 ตัว)</label><input class="tx" id="lg-p" type="password" autocomplete="current-password">
    <p class="kerr" id="lg-err" hidden></p>`,[{t:'ยกเลิก'},{t:'สมัครด้วยอีเมล'},{t:'เข้าสู่ระบบด้วยอีเมล',cls:'primary'}]);
  document.getElementById('lg-g').onclick=()=>closeModal(9);
  const r=await p;
  try{
    if(r===9)await f.au.signInWithPopup(f.auth,new f.au.GoogleAuthProvider());
    else if(r===1||r===2){
      const e=document.getElementById('lg-e').value.trim(),pw=document.getElementById('lg-p').value;
      if(!e||pw.length<6){toast('กรอกอีเมลและรหัสผ่านอย่างน้อย 6 ตัว','bad');return false}
      if(r===1){const c=await f.au.createUserWithEmailAndPassword(f.auth,e,pw);await f.au.updateProfile(c.user,{displayName:e.split('@')[0]})}
      else await f.au.signInWithEmailAndPassword(f.auth,e,pw);
    }else return false;
    toast('เข้าสู่ระบบแล้ว');return true;
  }catch(e){
    const c=String(e&&e.code||'');
    toast(c.includes('popup-blocked')||c.includes('operation-not-supported')?'เบราว์เซอร์บล็อกหน้าต่างล็อกอิน กดอนุญาตป๊อปอัป (ไอคอนที่แถบที่อยู่) แล้วลองใหม่ หรือใช้อีเมลแทน':c.includes('popup-closed')||c.includes('cancelled-popup')?'ปิดหน้าต่างล็อกอินก่อนเสร็จ':c.includes('invalid-credential')||c.includes('wrong-password')||c.includes('user-not-found')?'อีเมลหรือรหัสผ่านไม่ถูกต้อง':c.includes('email-already-in-use')?'อีเมลนี้สมัครไว้แล้ว ให้กดเข้าสู่ระบบ':c.includes('unauthorized-domain')?'เว็บนี้ยังไม่ได้รับอนุญาตให้ล็อกอิน':c.includes('weak-password')?'รหัสผ่านสั้นเกินไป':'เข้าสู่ระบบไม่สำเร็จ ('+c+')','bad');
    return false;
  }
}

/* ---------- sync approved packs into this browser (only what changed since last time) ---------- */
const SYNC_KEY='exam-cloud-sync';
function rebuildCloudIndex(){
  CFIG=new Map();for(const c of CARDS)if(String(c.docId).startsWith('c_'))for(const id of c.figs||[])CFIG.set(id,c.docId.slice(2));
  const have=new Set(DOCS.filter(d=>d.central).map(d=>d.cloudId.replace(/_\d+$/,'')));
  HIDE=new Set(DOCS.filter(d=>!d.central&&d.subId&&have.has(d.subId)).map(d=>d.id));
}
async function applyPack(id,p){
  const docId='c_'+id,old=DOCS.find(d=>d.id===docId),st={};
  for(const c of CARDS)if(c.docId===docId)st[c.id]=c.st;
  const ids=CARDS.filter(c=>c.docId===docId).map(c=>c.id);
  CARDS=CARDS.filter(c=>c.docId!==docId);try{await kbDelMany('cards',ids)}catch(e){}
  if(p.deleted){if(old){DOCS.splice(DOCS.indexOf(old),1);try{await kbDelMany('docs',[docId])}catch(e){}}return}
  const d={id:docId,central:true,cloudId:id,name:p.title+(p.parts>1?` (ส่วนที่ ${p.part})`:''),type:'pack',size:0,at:p.approvedAtMs||Date.now(),unit:p.unit||'หน้า',
    pages:[],chars:0,group:p.group||'spec',show:old?!!old.show:!!p.show,kind:p.kind||'kb',stage:'ready',summ:p.summ||[],sha:p.sha||'',owner:p.ownerName||'',srcFile:p.srcFile||'',figPages:[],bad:[],warn:'',err:''};
  if(old)DOCS.splice(DOCS.indexOf(old),1);DOCS.push(d);await saveDoc(d);
  const cs=(p.cards||[]).map(c=>({...c,docId,st:st[c.id]||{},at:c.at||Date.now()}));
  CARDS.push(...cs);await saveCards(cs);
}
async function syncCentral(force){
  if(CLOUD.syncing)return;CLOUD.syncing=true;
  try{
    const f=await fb();let since=0;try{since=force?0:(+localStorage.getItem(SYNC_KEY)||0)}catch(e){}
    const q=f.fs.query(f.fs.collection(f.db,'kb'),f.fs.where('updatedAt','>',f.fs.Timestamp.fromMillis(since)),f.fs.orderBy('updatedAt'));
    const snap=await f.fs.getDocs(q);let max=since;
    for(const s of snap.docs){const p=s.data();max=Math.max(max,p.updatedAt?p.updatedAt.toMillis():0);await applyPack(s.id,p)}
    try{localStorage.setItem(SYNC_KEY,String(max))}catch(e){}
    CLOUD.ok=true;CLOUD.err='';CLOUD.last=Date.now();
    rebuildCloudIndex();
    if(snap.size){syncDocSubjects();renderSide();toast(`อัปเดตคลังกลางแล้ว ${snap.size} ชุด`)}
  }catch(e){CLOUD.ok=false;CLOUD.err=CLOUD.err||'ซิงก์คลังกลางไม่สำเร็จ'}
  finally{CLOUD.syncing=false;if(VIEW==='kb')renderKB()}
}
/* figures of central packs are downloaded only when a question needs them, then kept in this browser */
const figWait={};
function fetchCloudFig(id){
  if(figWait[id])return figWait[id];
  return figWait[id]=(async()=>{
    try{const f=await fb(),s=await f.fs.getDoc(fsDoc('kbfigs',id));if(!s.exists())return false;const x=s.data();
      const bin=atob(x.data),u8=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u8[i]=bin.charCodeAt(i);
      await saveFigs([{id,docId:'c_'+(x.packId||CFIG.get(id)||''),page:x.page||1,mime:x.mime,blob:new Blob([u8],{type:x.mime}),desc:x.desc||'',at:Date.now()}]);
      document.querySelectorAll(`img[data-cfig="${id}"]`).forEach(im=>{im.src=figURL(id);im.removeAttribute('data-cfig')});return true;
    }catch(e){return false}finally{delete figWait[id]}
  })();
}
/* smaller JPEG for the free database (1 MB per document) */
async function figForCloud(id){
  const f=FIGS.get(id);if(!f)return null;let bmp;try{bmp=await createImageBitmap(f.blob)}catch(e){return null}
  for(const max of [1400,1100,850,650]){
    const sc=Math.min(1,max/Math.max(bmp.width,bmp.height)),cv=document.createElement('canvas');cv.width=Math.round(bmp.width*sc);cv.height=Math.round(bmp.height*sc);
    const ctx=cv.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,cv.width,cv.height);ctx.drawImage(bmp,0,0,cv.width,cv.height);
    const d=cv.toDataURL('image/jpeg',.82).split(',')[1];if(d.length<700000)return{mime:'image/jpeg',data:d,desc:f.desc||'',page:f.page||1};
  }
  return null;
}

/* ---------- contribute: send a processed document to the review queue ---------- */
function packCards(d){
  return CARDS.filter(c=>c.docId===d.id).map(c=>{const pg=d.pages.find(p=>p.n===+c.page);
    const o={id:c.id,title:c.title,topic:c.topic,kind:c.kind,fact:c.fact,page:c.page,imp:c.imp||2,figs:c.figs||[],ansSrc:c.ansSrc||'',src:pg&&pg.text?pg.text.slice(0,600):(c.src||'')};
    if(c.type==='q'){o.type='q';o.no=c.no||'';o.q=c.q}return o});
}
async function submitDoc(d,opt={}){
  if(!ME&&(opt.auto||!(await loginDialog())))return;
  const cards=packCards(d);if(!cards.length){toast('ไฟล์นี้ยังไม่มีบัตรความรู้หรือข้อสอบ ให้ประมวลผลก่อน','bad');return}
  if(!opt.auto&&await modal(`<p class="mt">ส่งเข้าคลังกลาง?</p><p>${esc(d.name)} · ${d.kind==='exam'?'ข้อสอบ':'บัตรความรู้'} ${cards.length} ${d.kind==='exam'?'ข้อ':'ใบ'}</p>
    <p class="src">ส่งเฉพาะสิ่งที่ AI ย่อยแล้วและรูปที่ตัดไว้ ไม่ส่งไฟล์ต้นฉบับ ${isReviewerMe()?'คุณเป็นผู้ตรวจ ระบบจะอนุมัติให้ทันที':'ผู้ตรวจจะตรวจก่อนเข้าคลังกลาง แล้วทุกคนจะได้ใช้'}</p>
    <p class="src">ห้ามส่งเอกสารลับหรือข้อมูลส่วนบุคคลของผู้อื่น</p>`,[{t:'ยกเลิก'},{t:'ส่งเข้าคลังกลาง',cls:'primary'}])!==1)return;
  /* ส่งซ้ำได้เฉพาะชุดที่ยังรอตรวจ ชุดที่ไม่ผ่าน/ส่งค้างจะใช้รหัสใหม่ (กฎฐานข้อมูลห้ามแก้ชุดที่ตรวจแล้ว) */
  const f=await fb(),id=d.subId&&d.subStatus==='pending'?d.subId:newId();let step='รูป';
  setProg(d,'กำลังส่งเข้าคลังกลาง...');
  try{
    const figIds=[...new Set(cards.flatMap(c=>c.figs))].filter(x=>FIGS.has(x)),sent=[];
    for(const [i,fid] of figIds.entries()){setProg(d,`กำลังส่งรูป ${i+1} จาก ${figIds.length}`);const e=await figForCloud(fid);
      if(e){const rec={...e,packId:id,ownerUid:ME.uid,createdAt:f.fs.serverTimestamp()};
        try{await f.fs.setDoc(fsDoc('subfigs',fid),rec)}catch(er){if(er&&er.code!=='permission-denied')throw er;await f.fs.deleteDoc(fsDoc('subfigs',fid));await f.fs.setDoc(fsDoc('subfigs',fid),rec)}
        sent.push(fid)}}
    step='ข้อมูล';
    cards.forEach(c=>{c.figs=c.figs.filter(x=>sent.includes(x))});
    /* ไฟล์ต้นฉบับ: ส่งขึ้น Google Drive ของแอดมิน (โฟลเดอร์แรกที่ยังมีที่ว่าง) ถ้าส่งไม่ได้ก็ส่งเข้าคลังต่อได้ */
    let srcFile=d.srcFile||'';
    if(!srcFile&&typeof uploadOriginal==='function'){try{const fo=await kbGet('files',d.id);if(fo&&fo.buf){step='ต้นฉบับ';
      const r=await uploadOriginal(d.name,fo.buf,d.type==='pdf'?'application/pdf':'',x=>setProg(d,`กำลังส่งไฟล์ต้นฉบับขึ้น Google Drive ${Math.round(x*100)}%`));srcFile=d.srcFile=r.id;d.srcErr=''}}
      catch(e){d.srcErr=e&&e.why||'ส่งไฟล์ต้นฉบับขึ้น Drive ไม่สำเร็จ'}}
    step='ข้อมูล';
    /* keep each document under the 1 MB Firestore limit */
    const parts=[];let cur=[],size=0;for(const c of cards){const s=JSON.stringify(c).length*1.1;if(cur.length&&size+s>800000){parts.push(cur);cur=[];size=0}cur.push(c);size+=s}if(cur.length)parts.push(cur);
    const ids=[];
    for(const [i,cs] of parts.entries()){
      const pid=i?`${id}_${i+1}`:id;ids.push(pid);
      await f.fs.setDoc(fsDoc('subs',pid),{title:d.name,sha:d.sha||'',kind:d.kind||'kb',group:d.group||'spec',show:!!d.show,unit:d.unit,summ:(d.summ||[]).filter(Boolean).slice(0,20),
        cards:cs,count:cs.length,figIds:[...new Set(cs.flatMap(c=>c.figs))],part:i+1,parts:parts.length,srcFile,ownerUid:ME.uid,ownerName:ME.name,status:'pending',note:'',
        createdAt:f.fs.serverTimestamp(),updatedAt:f.fs.serverTimestamp()});
    }
    Object.assign(d,{subId:id,subParts:ids,subStatus:'pending',shareWait:false,shareErr:''});await saveDoc(d);step='อนุมัติ';
    if(isReviewerMe()){for(const pid of ids)await approveSub(pid);d.subStatus='approved';await saveDoc(d);await syncCentral()}
    toast(isReviewerMe()?'อนุมัติเข้าคลังกลางแล้ว':'ส่งแล้ว รอผู้ตรวจอนุมัติ');
  }catch(e){const code=String(e&&e.code||e&&e.message||e).slice(0,80);
    const why=code==='permission-denied'?(step==='อนุมัติ'?'บัญชีนี้ไม่มีสิทธิ์อนุมัติ ชุดนี้จะรอผู้ตรวจ':'ฐานข้อมูลไม่อนุญาต (ลองออกจากระบบแล้วเข้าใหม่)'):code;
    d.shareErr=`ส่ง${step}เข้าคลังกลางไม่สำเร็จ: ${why}`;try{await saveDoc(d)}catch(x){}
    if(!opt.auto)toast(d.shareErr,'bad');else console.warn(d.name,d.shareErr)}
  finally{d.prog='';renderKB()}
}
let subsChecked=0;
async function checkSubs(){
  if(!ME||Date.now()-subsChecked<15000)return;subsChecked=Date.now();
  const mine=DOCS.filter(d=>d.subId&&d.subStatus!=='approved');if(!mine.length)return;
  try{const f=await fb();let ch=false;
    for(const d of mine){const s=await f.fs.getDoc(fsDoc('subs',(d.subParts||[d.subId])[0]));const st=s.exists()?s.data().status:'';
      if(st&&st!==d.subStatus){d.subStatus=st;d.subNote=s.data().note||'';await saveDoc(d);ch=true}}
    if(ch&&VIEW==='kb')renderKB();
  }catch(e){}
}

/* ---------- reviewer actions ---------- */
async function approveSub(pid){
  const f=await fb(),s=await f.fs.getDoc(fsDoc('subs',pid));if(!s.exists())return;const p=s.data();
  for(const fid of p.figIds||[]){const x=await f.fs.getDoc(fsDoc('subfigs',fid));
    if(x.exists()){const {ownerUid,...rest}=x.data();await f.fs.setDoc(fsDoc('kbfigs',fid),{...rest,packId:pid});await f.fs.deleteDoc(fsDoc('subfigs',fid))}}
  const {status,note,...pack}=p;
  await f.fs.setDoc(fsDoc('kb',pid),{...pack,approvedBy:ME.name,approvedAtMs:Date.now(),deleted:false,updatedAt:f.fs.serverTimestamp()});
  await f.fs.updateDoc(fsDoc('subs',pid),{status:'approved',updatedAt:f.fs.serverTimestamp()});
}
async function rejectSub(pid,note){
  const f=await fb(),s=await f.fs.getDoc(fsDoc('subs',pid));if(!s.exists())return;
  for(const fid of s.data().figIds||[])try{await f.fs.deleteDoc(fsDoc('subfigs',fid))}catch(e){}
  await f.fs.updateDoc(fsDoc('subs',pid),{status:'rejected',note:note||'',cards:[],updatedAt:f.fs.serverTimestamp()});
}
async function removePack(pid){
  const f=await fb(),s=await f.fs.getDoc(fsDoc('kb',pid));
  if(s.exists())for(const fid of s.data().figIds||[])try{await f.fs.deleteDoc(fsDoc('kbfigs',fid))}catch(e){}
  await f.fs.setDoc(fsDoc('kb',pid),{deleted:true,title:s.exists()?s.data().title:'',cards:[],figIds:[],updatedAt:f.fs.serverTimestamp()});
}
async function editCloudCard(pid,cardId,patch){
  const f=await fb(),s=await f.fs.getDoc(fsDoc('kb',pid));if(!s.exists())throw new Error('ไม่พบชุดนี้');
  const cards=(s.data().cards||[]).map(c=>c.id===cardId?{...c,...patch}:c);
  await f.fs.updateDoc(fsDoc('kb',pid),{cards,updatedAt:f.fs.serverTimestamp()});
}

/* ---------- report a wrong answer (spec 18–19) ---------- */
const cloudCardOf=q=>{const c=q&&q.card&&CARDS.find(x=>x.id===q.card);return c&&String(c.docId).startsWith('c_')?c:null};
async function reportQ(q){
  const c=cloudCardOf(q);if(!c)return;
  if(!ME&&!(await loginDialog()))return;
  const r=await modal(`<p class="mt">รายงานเฉลยผิด</p><p style="white-space:pre-wrap">${esc(q.stem||qLabel(q))}</p>
    <p class="src">เฉลยตอนนี้: ${esc(TH[q.answer]+'. '+q.choices[q.answer])}</p>
    <label class="lbl" for="rp-a">คำตอบที่ถูกควรเป็น</label><select id="rp-a">${q.choices.map((x,j)=>`<option value="${j}"${j===q.answer?' selected':''}>${TH[j]}. ${esc(x).slice(0,60)}</option>`).join('')}<option value="-1">ไม่แน่ใจ แต่เฉลยนี้ผิด</option></select>
    <label class="lbl" for="rp-w">เหตุผล / อ้างอิง</label><textarea id="rp-w" rows="3" class="cetx" placeholder="เช่น ตามระเบียบฉบับปี 2567 ข้อ 5 กำหนดว่า..."></textarea>`,[{t:'ยกเลิก'},{t:'ส่งรายงาน',cls:'primary'}]);
  if(r!==1)return;
  const prop=+document.getElementById('rp-a').value,why=document.getElementById('rp-w').value.trim();
  if(!why){toast('ใส่เหตุผลสั้นๆ ด้วย ผู้ตรวจจะได้ตรวจได้','bad');return}
  try{const f=await fb();
    await f.fs.addDoc(f.fs.collection(f.db,'reports'),{uid:ME.uid,name:ME.name,packId:c.docId.slice(2),cardId:c.id,cardFact:c.fact.slice(0,1500),
      stem:String(q.stem||qLabel(q)).slice(0,1500),choices:q.choices,answer:q.answer,proposed:prop>=0?q.choices[prop]:'',why:why.slice(0,1500),orig:!!q.orig,status:'open',createdAt:f.fs.serverTimestamp()});
    toast('ส่งรายงานแล้ว ขอบคุณที่ช่วยตรวจ');
  }catch(e){toast('ส่งรายงานไม่สำเร็จ','bad')}
}
document.addEventListener('click',e=>{
  const b=e.target.closest('[data-rpt]');if(!b)return;
  const pool=[...(R&&R.items||[]),...(M&&M.items||[])],q=pool.find(x=>x.card===b.dataset.rpt);if(q)reportQ(q);
});

/* ---------- review view (ผู้ตรวจ/แอดมิน) ---------- */
let RV={tab:'subs',subs:null,reports:null,users:null,open:new Set()};
async function renderReview(){
  if(VIEW!=='review')return;
  head('ตรวจอนุมัติ','ตรวจของที่ส่งเข้าคลังกลาง รายงานเฉลยผิด และจัดการคลัง');
  const el=document.getElementById('sheet');
  if(!isReviewerMe()){el.innerHTML='<div class="state"><p><b>หน้านี้สำหรับผู้ตรวจและแอดมิน</b></p></div>';return}
  const tab=(v,t)=>`<button data-rt="${v}" aria-pressed="${RV.tab===v}">${t}</button>`;
  el.innerHTML=`<div class="seg" role="group" style="grid-template-columns:repeat(${ME.role==='admin'?4:3},1fr)">${tab('subs','รออนุมัติ')}${tab('reports','รายงานเฉลยผิด')}${tab('kb','คลังกลาง')}${ME.role==='admin'?tab('users','สมาชิก'):''}</div><div id="rvbody"><div class="state"><div class="spin"></div></div></div>`;
  el.querySelectorAll('[data-rt]').forEach(b=>b.onclick=()=>{RV.tab=b.dataset.rt;renderReview()});
  const body=document.getElementById('rvbody');
  try{
    const f=await fb();
    if(RV.tab==='subs'){
      const snap=await f.fs.getDocs(f.fs.query(f.fs.collection(f.db,'subs'),f.fs.where('status','==','pending')));
      const list=snap.docs.map(s=>({id:s.id,...s.data()}));
      body.innerHTML=list.length?list.map(p=>`<div class="kdoc" data-sub="${p.id}"><div class="kt"><div><p class="kn">${esc(p.title)}${p.parts>1?` (ส่วนที่ ${p.part}/${p.parts})`:''}</p>
        <p class="src">ส่งโดย ${esc(p.ownerName||'-')} · ${p.kind==='exam'?'ข้อสอบ':'บัตรความรู้'} ${p.count} ${p.kind==='exam'?'ข้อ':'ใบ'} · ${p.group==='gen'?'ทั่วไป':'เฉพาะตำแหน่ง'}${(p.figIds||[]).length?` · รูป ${p.figIds.length}`:''}</p></div></div>
        <details class="kprev"><summary>ดูตัวอย่าง ${Math.min(30,p.count)} รายการแรก</summary><div class="kcards">${(p.cards||[]).slice(0,30).map(previewCard).join('')}</div></details>
        <div class="btnrow" style="justify-content:flex-start"><button class="primary" data-ok>อนุมัติเข้าคลังกลาง</button><button class="ghost" data-no>ไม่อนุมัติ</button></div></div>`).join('')
        :'<p class="src" style="text-align:center">ไม่มีรายการรออนุมัติ</p>';
      body.querySelectorAll('[data-sub]').forEach(box=>{const pid=box.dataset.sub;
        box.querySelector('[data-ok]').onclick=async()=>{box.querySelector('[data-ok]').disabled=true;try{await approveSub(pid);toast('อนุมัติแล้ว');await syncCentral()}catch(e){toast('อนุมัติไม่สำเร็จ: '+(e.code||e.message),'bad')}renderReview()};
        box.querySelector('[data-no]').onclick=async()=>{if(await modal('<p class="mt">ไม่อนุมัติ</p><label class="lbl" for="rj">เหตุผล (ผู้ส่งจะเห็น)</label><textarea id="rj" rows="3" class="cetx"></textarea>',[{t:'ยกเลิก'},{t:'ไม่อนุมัติ',cls:'primary'}])!==1)return;
          try{await rejectSub(pid,document.getElementById('rj').value.trim());toast('บันทึกแล้ว')}catch(e){toast('ไม่สำเร็จ','bad')}renderReview()};
      });
    }else if(RV.tab==='reports'){
      const snap=await f.fs.getDocs(f.fs.query(f.fs.collection(f.db,'reports'),f.fs.where('status','==','open')));
      const list=snap.docs.map(s=>({id:s.id,...s.data()}));
      body.innerHTML=list.length?list.map(r=>`<div class="kdoc" data-rp="${r.id}"><p class="src">รายงานโดย ${esc(r.name||'-')}${r.orig?' · ข้อสอบจริงจากคลัง':' · ข้อที่ AI สร้างจากบัตร'}</p>
        <p style="white-space:pre-wrap"><b>${esc(r.stem)}</b></p><ol class="kq">${(r.choices||[]).map((x,j)=>`<li${j===r.answer?' class="ok"':''}>${esc(x)}${j===r.answer?' (เฉลยเดิม)':''}${x===r.proposed?' ← ผู้รายงานเสนอ':''}</li>`).join('')}</ol>
        <p><b>เหตุผล:</b> ${esc(r.why)}</p><p class="src">บัตรต้นทาง: ${esc(r.cardFact)}</p>
        <div class="btnrow" style="justify-content:flex-start"><button class="primary" data-fix>แก้บัตร/ข้อสอบต้นทาง</button><button class="ghost" data-close>ปิดรายงาน (เฉลยถูกแล้ว)</button></div></div>`).join('')
        :'<p class="src" style="text-align:center">ไม่มีรายงานค้าง</p>';
      body.querySelectorAll('[data-rp]').forEach(box=>{const r=list.find(x=>x.id===box.dataset.rp);
        box.querySelector('[data-close]').onclick=async()=>{await f.fs.updateDoc(fsDoc('reports',r.id),{status:'dismissed',by:ME.name});renderReview()};
        box.querySelector('[data-fix]').onclick=async()=>{const c=CARDS.find(x=>x.id===r.cardId);if(!c){toast('ไม่พบบัตรนี้ในเครื่อง ลองซิงก์ก่อน','bad');return}
          const ok=await editCardDialog(c);if(!ok)return;
          try{await editCloudCard(r.packId,c.id,c.type==='q'?{q:c.q,fact:c.fact,title:c.title,ansSrc:c.ansSrc}:{fact:c.fact,title:c.title});
            await f.fs.updateDoc(fsDoc('reports',r.id),{status:'resolved',by:ME.name});toast('แก้ในคลังกลางแล้ว ทุกคนจะได้ฉบับแก้ตอนซิงก์');await syncCentral()}catch(e){toast('แก้ไม่สำเร็จ: '+(e.code||e.message),'bad')}
          renderReview()};
      });
    }else if(RV.tab==='kb'){
      const packs=DOCS.filter(d=>d.central);
      body.innerHTML=`<p class="src">ชุดในคลังกลาง ${packs.length} ชุด (ข้อมูลจากการซิงก์ล่าสุด)</p>`+packs.map(d=>`<div class="hrow" data-pk="${d.cloudId}"><div class="t"><b>${esc(d.name)}</b><span class="src">${d.kind==='exam'?'ข้อสอบ':'บัตรความรู้'} ${CARDS.filter(c=>c.docId===d.id).length} · โดย ${esc(d.owner||'-')}</span></div><button class="ghost" data-rm>เอาออกจากคลัง</button></div>`).join('');
      body.querySelectorAll('[data-pk]').forEach(row=>row.querySelector('[data-rm]').onclick=async()=>{
        if(await modal(`<p class="mt">เอาชุดนี้ออกจากคลังกลาง?</p><p class="src">ทุกคนจะไม่ได้ข้อสอบจากชุดนี้อีกหลังซิงก์ครั้งถัดไป</p>`,[{t:'ยกเลิก'},{t:'เอาออก',cls:'primary'}])!==1)return;
        try{await removePack(row.dataset.pk);await syncCentral();toast('เอาออกแล้ว')}catch(e){toast('ไม่สำเร็จ','bad')}renderReview()});
    }else if(RV.tab==='users'&&ME.role==='admin'){
      const snap=await f.fs.getDocs(f.fs.collection(f.db,'users'));
      body.innerHTML=snap.docs.map(s=>{const u=s.data();return `<div class="hrow" data-uid="${s.id}"><div class="t"><b>${esc(u.name||'-')}</b><span class="src">${esc(u.email||'')}</span></div>
        <select data-role ${s.id===ME.uid?'disabled':''}>${['user','reviewer','admin'].map(r=>`<option value="${r}"${u.role===r?' selected':''}>${r==='user'?'ผู้ใช้':r==='reviewer'?'ผู้ตรวจ':'แอดมิน'}</option>`).join('')}</select></div>`}).join('');
      body.querySelectorAll('[data-uid]').forEach(row=>row.querySelector('[data-role]').onchange=async e=>{
        try{await f.fs.updateDoc(fsDoc('users',row.dataset.uid),{role:e.target.value});toast('เปลี่ยนบทบาทแล้ว')}catch(err){toast('ไม่สำเร็จ','bad')}});
    }
  }catch(e){body.innerHTML=`<p class="kerr">โหลดไม่สำเร็จ: ${esc(String(e&&e.code||e&&e.message||e))}</p>`}
}
/* edit a card or bank question in place (used by the knowledge base list and by the report fixer); true when saved */
async function editCardDialog(c){
  if(c.type==='q'){
    if(await modal(`<p class="mt">แก้ข้อสอบ</p><label class="lbl" for="ce-s">โจทย์</label><textarea id="ce-s" rows="4" class="cetx">${esc(c.q.stem)}</textarea>
      <label class="lbl" for="ce-c">ตัวเลือก (บรรทัดละ 1 ตัวเลือก)</label><textarea id="ce-c" rows="4" class="cetx">${esc(c.q.choices.join('\n'))}</textarea>
      <label class="lbl" for="ce-a">ข้อที่ถูก</label><select id="ce-a"><option value="-1">ยังไม่รู้</option>${c.q.choices.map((x,j)=>`<option value="${j}"${j===c.q.answer?' selected':''}>${TH[j]||j+1}. ${esc(x).slice(0,40)}</option>`).join('')}</select>
      <label class="lbl" for="ce-e">คำอธิบาย (บรรทัดละ 1 ขั้น)</label><textarea id="ce-e" rows="3" class="cetx">${esc((c.q.steps||[]).join('\n'))}</textarea>`,[{t:'ยกเลิก'},{t:'บันทึก',cls:'primary'}])!==1)return false;
    const st=document.getElementById('ce-s').value.trim(),ch=document.getElementById('ce-c').value.split('\n').map(x=>x.trim()).filter(Boolean),a=+document.getElementById('ce-a').value;
    if(!st||ch.length<2)return false;
    c.q={stem:st,choices:ch,answer:a<ch.length?a:-1,steps:document.getElementById('ce-e').value.split('\n').map(x=>x.trim()).filter(Boolean)};
    if(c.q.answer>=0)c.ansSrc='doc';c.title=st.slice(0,90);c.fact=`${st}\nตัวเลือก: ${ch.join(' | ')}${c.q.answer>=0?`\nตอบ: ${ch[c.q.answer]}`:''}`;
  }else{
    if(await modal(`<p class="mt">แก้บัตรความรู้</p><label class="lbl" for="ce-t">หัวเรื่อง</label><input class="tx" id="ce-t" value="${esc(c.title)}"><label class="lbl" for="ce-f">ความรู้</label><textarea id="ce-f" rows="5" class="cetx">${esc(c.fact)}</textarea>`,[{t:'ยกเลิก'},{t:'บันทึก',cls:'primary'}])!==1)return false;
    const t=document.getElementById('ce-t').value.trim(),f=document.getElementById('ce-f').value.trim();if(!f)return false;
    c.title=t||c.title;c.fact=f;
  }
  c.emb=null;c.em='';await saveCards([c]);if(canEmbed())embedCards([c]).catch(()=>{});
  return true;
}
function previewCard(c){
  if(c.type==='q'&&c.q)return `<div class="kc"><p style="white-space:pre-wrap"><b>${esc(c.q.stem)}</b></p><ol class="kq">${c.q.choices.map((x,j)=>`<li${j===c.q.answer?' class="ok"':''}>${esc(x)}${j===c.q.answer?' ✓':''}</li>`).join('')}</ol>${(c.figs||[]).length?'<p class="src">มีรูปประกอบ</p>':''}</div>`;
  return `<div class="kc"><p><b>${esc(c.title)}</b> <span class="src">· ${esc(c.topic)} · ${esc(c.kind)}</span></p><p>${esc(c.fact)}</p>${(c.figs||[]).length?'<p class="src">มีรูปประกอบ</p>':''}</div>`;
}

/* ---------- รายวิชา: เพิ่ม / ซ่อน (แอดมิน/ผู้ตรวจ) ใช้กับทุกคน ---------- */
async function syncSubjects(){
  try{const f=await fb(),snap=await f.fs.getDoc(fsDoc('config','subjects'));
    const cfg=snap.exists()?{add:snap.data().add||[],hide:snap.data().hide||[]}:{add:[],hide:[]};
    const now=JSON.stringify(cfg),was=JSON.stringify({add:SUBJ_CFG.add||[],hide:SUBJ_CFG.hide||[]});
    if(now===was)return;
    try{localStorage.setItem(SUBJ_CFG_KEY,now)}catch(e){}
    if(!(M&&M.status==='run')&&!(R&&R.status==='loading'))location.reload();
  }catch(e){}
}
onAppReady(()=>setTimeout(syncSubjects,1500));
function subjAdminHTML(){
  if(!isReviewerMe())return '';
  const hide=new Set(SUBJ_CFG.hide||[]),grp=g=>SUBJ_ALL.filter(s=>s.group===g&&s.id!=='specall');
  const row=s=>`<label class="srow"><input type="checkbox" data-sshow="${esc(s.id)}" ${hide.has(s.id)?'':'checked'}> ${esc(s.name)}${s.custom?' <span class="tag">เพิ่มเอง</span>':''}${s.custom?` <button class="linkbtn" type="button" data-sdel="${esc(s.id)}">ลบ</button>`:''}</label>`;
  return `<div class="cloudbox"><p><b>📚 จัดการรายวิชา</b> · ใช้กับทุกคน</p>
    <p class="src">เอาเครื่องหมายถูกออก = ซ่อนวิชานั้นจากเมนูและการสร้างโจทย์ (ข้อมูลในคลังยังอยู่ เปิดกลับได้) · วิชาที่เพิ่มเองใช้ AI สร้างโจทย์ วิชาเฉพาะตำแหน่งจะใช้บัตรความรู้ในคลังที่ตรงหัวข้อด้วย</p>
    <p class="lbl">ความรู้ความสามารถทั่วไป</p><div class="sgrid">${grp('gen').map(row).join('')}</div>
    <p class="lbl">${esc(SPEC_LABEL)}</p><div class="sgrid">${grp('spec').map(row).join('')}</div>
    <p class="src">เพิ่มวิชาใหม่: ตอนอัปโหลดไฟล์ เลือก "＋ เพิ่มวิชาใหม่" แล้วตั้งชื่อ วิชาจะถูกสร้างเมื่อ AI ย่อยไฟล์นั้นเสร็จและมีข้อมูลแล้ว · ลบวิชาพร้อมข้อมูล: กดรูปถังขยะ 🗑 ข้างชื่อวิชาในเมนูซ้าย</p>
    <div class="btnrow" style="justify-content:flex-start"><button class="primary" id="ssave" disabled>บันทึกการแสดง/ซ่อน</button></div></div>`;
}
async function saveSubjCfg(cfg){
  const f=await fb();await f.fs.setDoc(fsDoc('config','subjects'),{add:cfg.add,hide:cfg.hide,updatedAt:f.fs.serverTimestamp(),by:ME.name});
  try{localStorage.setItem(SUBJ_CFG_KEY,JSON.stringify({add:cfg.add,hide:cfg.hide}))}catch(e){}
  toast('บันทึกรายวิชาแล้ว กำลังเปิดหน้าใหม่');setTimeout(()=>location.reload(),700);
}
function wireSubjAdmin(el){
  const sv0=el.querySelector('#ssave');if(!sv0)return;
  const cur=()=>({add:(SUBJ_CFG.add||[]).slice(),hide:(SUBJ_CFG.hide||[]).slice()});
  const sv=el.querySelector('#ssave');
  el.querySelectorAll('[data-sshow]').forEach(c=>c.onchange=()=>{sv.disabled=false});
  sv.onclick=async()=>{const cfg=cur();cfg.hide=[...el.querySelectorAll('[data-sshow]')].filter(c=>!c.checked).map(c=>c.dataset.sshow);
    if(cfg.hide.length>=SUBJ_ALL.length-1){toast('ต้องเหลืออย่างน้อย 1 วิชา','bad');return}
    try{await saveSubjCfg(cfg)}catch(e){toast('บันทึกไม่สำเร็จ: '+String(e&&e.code||e),'bad')}};
  el.querySelectorAll('[data-sdel]').forEach(b=>b.onclick=async()=>{
    const id=b.dataset.sdel,s=SUBJ_ALL.find(x=>x.id===id);if(!s)return;
    if(await modal(`<p class="mt">ลบวิชา ${esc(s.name)}?</p><p class="src">บัตรความรู้และข้อสอบในคลังที่เป็นหัวข้อนี้ยังอยู่ แต่จะไม่มีวิชานี้ในเมนู ถ้าแค่ไม่อยากให้เห็นชั่วคราว ให้เอาเครื่องหมายถูกออกแทน</p>`,[{t:'ยกเลิก'},{t:'ลบวิชา',cls:'primary'}])!==1)return;
    const cfg=cur();cfg.add=cfg.add.filter(x=>x.id!==id);cfg.hide=cfg.hide.filter(x=>x!==id);
    try{await saveSubjCfg(cfg)}catch(e){toast('บันทึกไม่สำเร็จ: '+String(e&&e.code||e),'bad')}
  });
}

/* ---------- ลบวิชาพร้อมข้อมูลทั้งหมด (ผู้ตรวจ/แอดมิน) จากปุ่ม 🗑 ในเมนู ----------
   ลบบัตรความรู้และข้อสอบที่เป็นหัวข้อนี้ออกจากทุกชุดในคลังกลาง (ชุดที่ไม่เหลืออะไรถูกเอาออกทั้งชุด) และในเครื่องนี้
   แล้วเอาวิชาออกจากเมนูของทุกคน · ไฟล์ต้นฉบับใน Google Drive ไม่ถูกลบ */
async function deleteSubject(id){
  const s=SUBJ.find(x=>x.id===id);if(!s||!isReviewerMe())return;
  const name=s.name,cards=CARDS.filter(c=>c.topic===name),packIds=[...new Set(cards.filter(c=>String(c.docId).startsWith('c_')).map(c=>c.docId.slice(2)))];
  const nq=cards.filter(c=>c.type==='q').length,nk=cards.length-nq;
  const p=modal(`<p class="mt">ลบวิชา ${esc(name)} และข้อมูลทั้งหมด?</p>
    <p>จะลบบัตรความรู้ <b>${nk}</b> ใบ และข้อสอบ <b>${nq}</b> ข้อ ที่อยู่ในวิชานี้${packIds.length?` (จากคลังกลาง ${packIds.length} ชุด ทุกคนจะไม่เห็นอีก)`:''} แล้วเอาวิชานี้ออกจากเมนูของทุกคน</p>
    <p class="kwarn">ลบแล้วกู้คืนไม่ได้ · ไฟล์ต้นฉบับใน Google Drive ไม่ถูกลบ ถ้าแค่ไม่อยากให้เห็นชั่วคราว ให้ซ่อนในกล่อง จัดการรายวิชา แทน</p>
    <label class="rad"><input type="checkbox" id="sdelok"><span><b>เข้าใจแล้ว ลบวิชาและข้อมูลถาวร</b></span></label>`,[{t:'ยกเลิก'},{t:'ลบวิชาและข้อมูล',cls:'primary'}]);
  let ok=false;const cb=document.getElementById('sdelok');if(cb)cb.onchange=()=>{ok=cb.checked};
  if(await p!==1)return;
  if(!ok){toast('ยังไม่ได้ติ๊ก เข้าใจแล้ว จึงยังไม่ลบ','bad');return}
  toast(`กำลังลบวิชา ${name}...`);
  try{
    const f=await fb();
    for(const pid of packIds){
      const snap=await f.fs.getDoc(fsDoc('kb',pid));if(!snap.exists())continue;
      const left=(snap.data().cards||[]).filter(c=>c.topic!==name);
      if(!left.length)await removePack(pid);
      else await f.fs.updateDoc(fsDoc('kb',pid),{cards:left,count:left.length,figIds:[...new Set(left.flatMap(c=>c.figs||[]))],updatedAt:f.fs.serverTimestamp()});
    }
    const ids=cards.map(c=>c.id);CARDS=CARDS.filter(c=>c.topic!==name);try{await kbDelMany('cards',ids)}catch(e){}
    const custom=(SUBJ_CFG.add||[]).some(a=>a.id===id);
    await saveSubjCfg({add:(SUBJ_CFG.add||[]).filter(a=>a.id!==id),hide:custom?(SUBJ_CFG.hide||[]).filter(x=>x!==id):[...new Set([...(SUBJ_CFG.hide||[]),id])]});
  }catch(e){toast('ลบไม่สำเร็จ: '+String(e&&e.code||e&&e.message||e),'bad')}
}
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-sdelside]');if(!b)return;e.preventDefault();e.stopPropagation();deleteSubject(b.dataset.sdelside)},true);
document.addEventListener('keydown',e=>{const b=e.target.closest&&e.target.closest('[data-sdelside]');if(!b||(e.key!=='Enter'&&e.key!==' '))return;e.preventDefault();e.stopPropagation();deleteSubject(b.dataset.sdelside)},true);
/* ---------- เพิ่มวิชาจากไฟล์ที่อัปโหลด: สร้างเมื่อย่อยเสร็จและมีข้อมูลแล้ว ---------- */
async function addSubjectFromDoc(doc){
  const n=CARDS.filter(c=>c.docId===doc.id).length;
  if(!doc.newSubj||!doc.topic||!n)return;
  doc.newSubj=false;await saveDoc(doc);
  if(SUBJ_ALL.some(s=>s.name===doc.topic)&&!(SUBJ_CFG.hide||[]).includes((SUBJ_ALL.find(s=>s.name===doc.topic)||{}).id))return;
  if(!isReviewerMe()){toast(`ไฟล์ ${doc.name} ใช้หัวข้อ "${doc.topic}" ซึ่งยังไม่มีในเมนู ให้แอดมินเพิ่มวิชาให้`);return}
  const old=SUBJ_ALL.find(s=>s.name===doc.topic);
  const cfg=old?{add:(SUBJ_CFG.add||[]).slice(),hide:(SUBJ_CFG.hide||[]).filter(x=>x!==old.id)}
    :{add:[...(SUBJ_CFG.add||[]),{id:'u'+newId(),name:doc.topic,group:doc.group||'spec',desc:doc.topicDesc||doc.topic,kw:[doc.topic]}],hide:(SUBJ_CFG.hide||[]).slice()};
  const f=await fb();await f.fs.setDoc(fsDoc('config','subjects'),{add:cfg.add,hide:cfg.hide,updatedAt:f.fs.serverTimestamp(),by:ME.name});
  try{localStorage.setItem(SUBJ_CFG_KEY,JSON.stringify(cfg))}catch(e){}
  toast(`เพิ่มวิชา "${doc.topic}" แล้ว (มีข้อมูล ${n} รายการ) · หน้าเว็บจะเปิดใหม่เมื่อประมวลผลไฟล์อื่นเสร็จ`);
  const wait=()=>{if(PROC_ID||PROCQ.length||(M&&M.status==='run'))return setTimeout(wait,5000);location.reload()};setTimeout(wait,2500);
}
