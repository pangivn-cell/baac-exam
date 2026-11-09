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
      if(!u){ME=null;if(typeof syncStop==='function')syncStop();renderAcct();refreshCloudViews();if(VIEW==='rank')renderRank();return}
      ME={uid:u.uid,name:u.displayName||(u.email||'').split('@')[0]||'ผู้ใช้',email:u.email||'',role:'user'};
      try{const s=await f.fs.getDoc(fsDoc('users',u.uid));
        if(s.exists())ME.role=s.data().role||'user';
        else await f.fs.setDoc(fsDoc('users',u.uid),{name:ME.name,email:ME.email,role:'user',createdAt:f.fs.serverTimestamp()});
      }catch(e){}
      renderAcct();renderSide();refreshCloudViews();if(typeof pscOnAuth==="function")pscOnAuth();checkSubs();loadMyPoints().then(flushPoints);flushShares();pullQLog();pullAIP();setTimeout(()=>{if(typeof loadSrcIndex==='function'&&!SRC.ready)loadSrcIndex()},3000);setTimeout(()=>poolCleanup(),8000);
      /* ซิงก์คิว/คลังส่วนตัวข้ามเครื่อง (ต้องเผยแพร่กฎใน firestore.rules) */
      setTimeout(()=>{if(typeof syncStart==='function'){syncStart();if(typeof syncFlushDeletes==='function')syncFlushDeletes().catch(()=>{})}},600);
    });
    f.au.onAuthStateChanged(f.auth,()=>setTimeout(onboard,600));
    await syncCentral();
  }catch(e){renderAcct();if(VIEW==='kb')renderKB();setTimeout(onboard,600)}
}
function refreshCloudViews(){if(VIEW==='kb')renderKB();else if(VIEW==='review')renderReview();else if(VIEW==='home')renderHome();else if(VIEW==='rank')renderRank()}
function renderAcct(){
  const el=document.getElementById('acct');if(!el)return;
  const rv=document.getElementById('vreview');if(rv)rv.hidden=!isReviewerMe();
  const pts=P.pass||0,lv=myLevel();
  if(ME){
    el.innerHTML=`<div class="acard"><div class="av" aria-hidden="true">${esc((ME.name||'?').trim().slice(0,1).toUpperCase())}</div><div class="ainfo"><button class="aname" id="rename" title="แตะเพื่อเปลี่ยนชื่อที่แสดงในอันดับ">${esc(ME.name)}</button>
      <span class="src">ระดับ ${lv} · ${nf(pts)} คะแนน (อีก ${levelInfo(pts).left} ขึ้นระดับ ${lv+1})${ME.role!=='user'?` · <b>${ME.role==='admin'?'แอดมิน':'ผู้ตรวจ'}</b>`:''}</span></div></div><button class="logout" id="logout">ออกจากระบบ</button>`;
    document.getElementById('logout').onclick=async()=>{if(await modal('<p class="mt">ออกจากระบบ?</p><p class="src">คะแนนที่ทำต่อจากนี้จะเก็บในเครื่องก่อน แล้วขึ้นอันดับเมื่อเข้าสู่ระบบอีกครั้ง</p>',[{t:'ยกเลิก'},{t:'ออกจากระบบ',cls:'primary'}])!==1)return;
      await FB.au.signOut(FB.auth);if(VIEW==='review')setView('kb')};
    document.getElementById('rename').onclick=renameMe;
  }else{
    el.innerHTML=`<button class="loginbig" id="login">🔑 เข้าสู่ระบบ</button><p class="src">เก็บคะแนน ขึ้นอันดับ จำระดับข้ามเครื่อง และเพิ่มเอกสารเข้าคลังกลาง${pts?` · ในเครื่องนี้ ${nf(pts)} คะแนน (ระดับ ${lv})`:''}</p>`;
    document.getElementById('login').onclick=()=>loginDialog();
  }
}
/* หน้าต่างเข้าสู่ระบบ: ปุ่มอีเมลตรวจข้อมูลก่อน (ช่องว่าง = กรอบแดง + ข้อความ) หน้าต่างไม่ปิดจนกว่าจะสำเร็จ */
async function loginDialog(){
  let f;try{f=await fb()}catch(e){toast('เชื่อมต่อคลังกลางไม่ได้ ตรวจอินเทอร์เน็ต','bad');return false}
  const p=modal(`<p class="mt">เข้าสู่ระบบ</p><button class="primary" id="lg-g" type="button">เข้าสู่ระบบด้วย Google</button>
    <p class="src" style="text-align:center">หรือใช้อีเมล</p>
    <label class="lbl" for="lg-e">อีเมล</label><input class="tx" id="lg-e" type="email" autocomplete="email">
    <label class="lbl" for="lg-p">รหัสผ่าน (อย่างน้อย 6 ตัว)</label><input class="tx" id="lg-p" type="password" autocomplete="current-password">
    <p style="margin:0;text-align:right"><button class="linkbtn" id="lg-forgot" type="button">ลืมรหัสผ่าน?</button></p>
    <p class="kerr" id="lg-err" role="alert" hidden></p><p class="kok" id="lg-ok" role="status" hidden></p>
    <p class="src">ยังไม่มีบัญชี: กรอกอีเมลและตั้งรหัสผ่าน แล้วกด <b>สมัครด้วยอีเมล</b> · มีบัญชีแล้ว: กด <b>เข้าสู่ระบบด้วยอีเมล</b></p>`,[{t:'ยกเลิก'},{t:'สมัครด้วยอีเมล'},{t:'เข้าสู่ระบบด้วยอีเมล',cls:'primary'}]);
  const $=id=>document.getElementById(id),err=$('lg-err'),btns=[...document.querySelectorAll('#dlg .dlgbtns button')];
  const okBox=$('lg-ok');
  const show=(msg,fields)=>{okBox.hidden=true;err.textContent=msg;err.hidden=false;for(const id of ['lg-e','lg-p'])$(id).classList.toggle('bad',fields.includes(id));if(fields[0])$(fields[0]).focus()};
  for(const id of ['lg-e','lg-p'])$(id).addEventListener('input',()=>{$(id).classList.remove('bad');if(!document.querySelector('#dlg .tx.bad'))err.hidden=true});
  $('lg-g').onclick=()=>closeModal(9);
  const emailAct=async signup=>{
    const e=$('lg-e').value.trim(),pw=$('lg-p').value,miss=[];
    if(!e)miss.push('lg-e');if(!pw)miss.push('lg-p');
    if(miss.length)return show(miss.length===2?'กรุณากรอกอีเมลและรหัสผ่านก่อน':!e?'กรุณากรอกอีเมลก่อน':'กรุณากรอกรหัสผ่านก่อน',miss);
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))return show('รูปแบบอีเมลไม่ถูกต้อง เช่น name@gmail.com',['lg-e']);
    if(pw.length<6)return show('รหัสผ่านต้องมีอย่างน้อย 6 ตัว',['lg-p']);
    err.hidden=true;btns.forEach(b=>b.disabled=true);
    try{
      if(signup){const c=await f.au.createUserWithEmailAndPassword(f.auth,e,pw);await f.au.updateProfile(c.user,{displayName:e.split('@')[0]})}
      else await f.au.signInWithEmailAndPassword(f.auth,e,pw);
      closeModal(10);
    }catch(x){
      btns.forEach(b=>b.disabled=false);const c=String(x&&x.code||'');
      if(c.includes('network'))return show('เชื่อมต่อไม่ได้ ตรวจอินเทอร์เน็ตแล้วลองใหม่',[]);
      if(c.includes('too-many-requests'))return show('ลองหลายครั้งเกินไป รอสักครู่แล้วลองใหม่',[]);
      if(signup){
        if(c.includes('email-already-in-use'))return show('อีเมลนี้สมัครไว้แล้ว กรุณากดปุ่ม เข้าสู่ระบบด้วยอีเมล แทน',['lg-e']);
        if(c.includes('weak-password'))return show('รหัสผ่านง่ายเกินไป ใช้อย่างน้อย 6 ตัว',['lg-p']);
        if(c.includes('invalid-email'))return show('รูปแบบอีเมลไม่ถูกต้อง',['lg-e']);
        return show('สมัครไม่สำเร็จ ('+c+')',[]);
      }
      if(c.includes('user-not-found'))return show('ยังไม่มีบัญชีอีเมลนี้ กรุณากดปุ่ม สมัครด้วยอีเมล ก่อน',['lg-e']);
      if(c.includes('wrong-password'))return show('รหัสผ่านไม่ถูกต้อง',['lg-p']);
      /* Firebase ไม่บอกว่าอีเมลนี้เคยสมัครหรือยัง (ป้องกันการเดาบัญชี) จึงแจ้งรวม */
      if(c.includes('invalid-credential')||c.includes('invalid-login'))return show('อีเมลหรือรหัสผ่านไม่ถูกต้อง · ถ้ายังไม่เคยลงทะเบียน กรุณากดปุ่ม สมัครด้วยอีเมล ก่อน',['lg-e','lg-p']);
      if(c.includes('invalid-email'))return show('รูปแบบอีเมลไม่ถูกต้อง',['lg-e']);
      return show('เข้าสู่ระบบไม่สำเร็จ ('+c+')',[]);
    }
  };
  btns[1].onclick=()=>emailAct(true);btns[2].onclick=()=>emailAct(false);
  /* ลืมรหัสผ่าน: ส่งลิงก์ตั้งรหัสผ่านใหม่ไปที่อีเมล (อีเมลภาษาไทย กดแล้วตั้งรหัสใหม่ แล้วกลับมาเข้าสู่ระบบที่เว็บนี้) */
  $('lg-forgot').onclick=async()=>{
    const e=$('lg-e').value.trim();
    if(!e)return show('กรอกอีเมลที่ใช้สมัครในช่องอีเมลก่อน แล้วกด ลืมรหัสผ่าน? อีกครั้ง',['lg-e']);
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))return show('รูปแบบอีเมลไม่ถูกต้อง เช่น name@gmail.com',['lg-e']);
    const b=$('lg-forgot');b.disabled=true;err.hidden=true;
    try{
      f.auth.languageCode='th';
      await f.au.sendPasswordResetEmail(f.auth,e,{url:location.origin+location.pathname});
      okBox.textContent=`ถ้าอีเมล ${e} ลงทะเบียนไว้ ระบบส่งลิงก์ตั้งรหัสผ่านใหม่ให้แล้ว ตรวจกล่องจดหมาย (และโฟลเดอร์ Spam/จดหมายขยะ) กดลิงก์ ตั้งรหัสใหม่ แล้วกลับมาเข้าสู่ระบบด้วยรหัสใหม่ · ถ้าเคยเข้าสู่ระบบด้วย Google ให้กดปุ่ม เข้าสู่ระบบด้วย Google แทน ไม่ต้องใช้รหัสผ่าน`;
      okBox.hidden=false;
    }catch(x){const c=String(x&&x.code||'');
      show(c.includes('too-many-requests')?'ขอรหัสใหม่บ่อยเกินไป รอสักครู่แล้วลองใหม่':c.includes('invalid-email')?'รูปแบบอีเมลไม่ถูกต้อง':c.includes('network')?'เชื่อมต่อไม่ได้ ตรวจอินเทอร์เน็ตแล้วลองใหม่':c.includes('user-not-found')?'ยังไม่มีบัญชีอีเมลนี้ กรุณากดปุ่ม สมัครด้วยอีเมล ก่อน':'ส่งลิงก์ไม่สำเร็จ ('+c+')',c.includes('email')||c.includes('user')?['lg-e']:[]);
    }finally{b.disabled=false}
  };
  $('lg-p').addEventListener('keydown',ev=>{if(ev.key==='Enter'){ev.preventDefault();emailAct(false)}});
  const r=await p;
  if(r===10){toast('เข้าสู่ระบบแล้ว');return true}
  if(r!==9)return false;
  try{await f.au.signInWithPopup(f.auth,new f.au.GoogleAuthProvider());toast('เข้าสู่ระบบแล้ว');return true}
  catch(e){
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
  /* รหัสบัตรที่ชุดอื่นใช้อยู่ด้วย (ชุดซ้ำ/ชุดส่งใหม่ใช้รหัสบัตรเดิม) ห้ามลบออกจากที่เก็บในเครื่อง */
  const other=new Set(CARDS.filter(c=>c.docId!==docId).map(c=>c.id));
  const ids=CARDS.filter(c=>c.docId===docId).map(c=>c.id).filter(id=>!other.has(id));
  CARDS=CARDS.filter(c=>c.docId!==docId);try{await kbDelMany('cards',ids)}catch(e){}
  if(p.deleted){if(old){DOCS.splice(DOCS.indexOf(old),1);try{await kbDelMany('docs',[docId])}catch(e){}}return}
  const d={id:docId,central:true,cloudId:id,name:p.title+(p.parts>1?` (ส่วนที่ ${p.part})`:''),type:'pack',size:0,at:p.approvedAtMs||Date.now(),unit:p.unit||'หน้า',
    pages:[],chars:0,group:p.group||'spec',show:old?!!old.show:!!p.show,kind:p.kind||'kb',stage:'ready',summ:p.summ||[],sha:p.sha||'',txtSha:p.txtSha||'',owner:p.ownerName||'',srcFile:p.srcFile||'',figPages:[],bad:[],warn:'',err:'',subs:(p.subs||[]).map(topicName)};
  if(old)DOCS.splice(DOCS.indexOf(old),1);DOCS.push(d);await saveDoc(d);
  const cs=(p.cards||[]).map(c=>({...vizIn(c),topic:topicName(c.topic),docId,st:st[c.id]||{},at:c.at||Date.now()}));
  CARDS.push(...cs);await saveCards(cs);
}
async function syncCentral(force){
  if(CLOUD.syncing)return;CLOUD.syncing=true;
  refreshQHide();
  try{
    const f=await fb();let since=0;try{since=force?0:(+localStorage.getItem(SYNC_KEY)||0)}catch(e){}
    const q=f.fs.query(f.fs.collection(f.db,'kb'),f.fs.where('updatedAt','>',f.fs.Timestamp.fromMillis(since)),f.fs.orderBy('updatedAt'));
    const snap=await f.fs.getDocs(q);let max=since;
    for(const s of snap.docs){const p=s.data();max=Math.max(max,p.updatedAt?p.updatedAt.toMillis():0);await applyPack(s.id,p)}
    try{localStorage.setItem(SYNC_KEY,String(max))}catch(e){}
    CLOUD.ok=true;CLOUD.err='';CLOUD.last=Date.now();
    rebuildCloudIndex();syncDocSubjects();renderSide();
    if(snap.size){toast(`อัปเดตคลังกลางแล้ว ${snap.size} ชุด`)}
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
    if(c.type==='q'){o.type='q';o.no=c.no||'';o.q=c.q}return fsClean(vizOut(o))});
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
    if(!srcFile&&typeof uploadOriginal==='function'){try{const fo=await docBuf(d).catch(()=>null);if(fo){step='ต้นฉบับ';
      const r=await uploadOriginal(d.name,fo,d.type==='pdf'?'application/pdf':'',x=>setProg(d,`กำลังส่งไฟล์ต้นฉบับขึ้น Google Drive ${Math.round(x*100)}%`),d.sha);srcFile=d.srcFile=r.id;d.srcErr=''}}
      catch(e){d.srcErr=e&&e.why||'ส่งไฟล์ต้นฉบับขึ้น Drive ไม่สำเร็จ'}}
    step='ข้อมูล';
    /* keep each document under the 1 MB Firestore limit */
    const parts=[];let cur=[],size=0;for(const c of cards){const s=utf8Len(c)+20;if(cur.length&&size+s>700000){parts.push(cur);cur=[];size=0}cur.push(c);size+=s}if(cur.length)parts.push(cur);
    const ids=[];
    for(const [i,cs] of parts.entries()){
      const pid=i?`${id}_${i+1}`:id;ids.push(pid);
      await f.fs.setDoc(fsDoc('subs',pid),{title:d.name,sha:d.sha||'',txtSha:d.txtSha||'',kind:d.kind||'kb',group:d.group||'spec',show:!!d.show,unit:d.unit||'หน้า',summ:(d.summ||[]).filter(Boolean).slice(0,20),
        cards:cs,count:cs.length,figIds:[...new Set(cs.flatMap(c=>c.figs||[]))],part:i+1,parts:parts.length,srcFile:srcFile||'',subs:(d.subs||[]).slice(0,20),ownerUid:ME.uid,ownerName:ME.name||'',status:'pending',note:'',
        createdAt:f.fs.serverTimestamp(),updatedAt:f.fs.serverTimestamp()});
    }
    Object.assign(d,{subId:id,subParts:ids,subStatus:'pending',shareWait:false,shareErr:''});await saveDoc(d);step='อนุมัติ';
    if(isReviewerMe()){for(const pid of ids)await approveSub(pid);d.subStatus='approved';await saveDoc(d);await syncCentral()}
    toast(isReviewerMe()?'อนุมัติเข้าคลังกลางแล้ว':'ส่งแล้ว รอผู้ตรวจอนุมัติ');
  }catch(e){const code=String(e&&e.code||e&&e.message||e).slice(0,80);
    const why=code==='invalid-argument'?'ข้อมูลบางส่วนอยู่ในรูปแบบที่ฐานข้อมูลไม่รับ (แก้แล้วในเวอร์ชันนี้ กด ลองส่งเข้าคลังกลางอีกครั้ง)':code==='permission-denied'?(step==='อนุมัติ'?'บัญชีนี้ไม่มีสิทธิ์อนุมัติ ชุดนี้จะรอผู้ตรวจ':'ฐานข้อมูลไม่อนุญาต (ลองออกจากระบบแล้วเข้าใหม่)'):code;
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
  /* ชุดเดิมของไฟล์เดียวกัน (ส่งซ้ำ / เก็บตกแล้วส่งใหม่): ลบก่อน แล้วค่อยวางชุดใหม่ ไม่ให้คลังกลางมีชุดซ้ำ
     ลบก่อนย้ายรูป เพราะรูปของชุดใหม่ใช้รหัสเดิม */
  if((p.part||1)===1){
    const base=pid.replace(/_\d+$/,''),old=new Set();
    const q=async(k,v)=>{if(!v)return;try{const r=await f.fs.getDocs(f.fs.query(f.fs.collection(f.db,'kb'),f.fs.where(k,'==',v)));for(const x of r.docs){const d=x.data();if(!d.deleted&&x.id.replace(/_\d+$/,'')!==base&&(k!=='title'||d.ownerUid===p.ownerUid))old.add(x.id)}}catch(e){}};
    await q('sha',p.sha);await q('txtSha',p.txtSha);await q('title',p.title);
    for(const oid of old)await removePack(oid);
  }
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
/* keep = รูปที่ชุดอื่นยังใช้อยู่ (ชุดซ้ำใช้รหัสรูปเดียวกัน) ห้ามลบ */
async function removePack(pid,keep){
  const f=await fb(),s=await f.fs.getDoc(fsDoc('kb',pid));
  if(s.exists())for(const fid of s.data().figIds||[])if(!(keep&&keep.has(fid)))try{await f.fs.deleteDoc(fsDoc('kbfigs',fid))}catch(e){}
  await f.fs.setDoc(fsDoc('kb',pid),{deleted:true,title:s.exists()?s.data().title:'',cards:[],figIds:[],updatedAt:f.fs.serverTimestamp()});
}
/* ลบชุดออกจากคลังกลางพร้อมทุกอย่างที่มาจากชุดนั้น (ผู้ตรวจ/แอดมิน):
   ทุกส่วนของไฟล์ (kb/{id}_N) · บัตรความรู้/ข้อสอบ · รูป · โจทย์ที่ AI สร้างจากชุดนี้ในคลังโจทย์กลาง · รายงานเฉลยผิดที่ค้าง
   เครื่องของทุกคนลบตามเมื่อซิงก์ (kb/{id}.deleted) · ไฟล์ต้นฉบับบน Google Drive ไม่ถูกลบ */
async function deleteCentralPack(d){
  if(!isReviewerMe())return;
  const base=String(d.cloudId).replace(/_\d+$/,''),parts=DOCS.filter(x=>x.central&&String(x.cloudId).replace(/_\d+$/,'')===base);
  const ids=new Set(parts.map(x=>x.id)),cards=CARDS.filter(c=>ids.has(c.docId)),nq=cards.filter(c=>c.type==='q').length;
  const r=await modal(`<p class="mt">ลบชุดนี้ออกจากคลังกลาง?</p><p><b>${esc(d.name.replace(/ \(ส่วนที่ \d+\)$/,''))}</b>${parts.length>1?` (${parts.length} ส่วน)`:''}</p>
    <p class="src">ลบ${nq?`ข้อสอบ ${nq} ข้อ`:''}${nq&&cards.length>nq?' และ':''}${cards.length>nq?`บัตรความรู้ ${cards.length-nq} ใบ`:''} รูปประกอบ โจทย์ที่ AI สร้างจากชุดนี้ในคลังโจทย์กลาง และรายงานเฉลยผิดที่ค้าง · ทุกคนจะไม่เห็นชุดนี้อีกเมื่อซิงก์ · กู้คืนไม่ได้</p>
    <p class="src">ไฟล์ต้นฉบับบน Google Drive ยังอยู่ ลบเองได้ใน Drive</p>
    <label class="rad"><input type="checkbox" id="cdelok"><span>เข้าใจแล้ว ลบทั้งหมด</span></label>`,[{t:'ยกเลิก'},{t:'ลบทั้งหมด',cls:'primary'}]);
  if(r!==1)return;
  if(!document.getElementById('cdelok').checked){toast('ยังไม่ได้ติ๊ก เข้าใจแล้ว จึงยังไม่ลบ','bad');return}
  toast('กำลังลบชุดนี้...');
  try{
    const f=await fb(),cardIds=new Set(cards.map(c=>c.id));let pool=0,rep=0;
    for(const x of parts)await removePack(x.cloudId);
    /* คลังโจทย์กลาง: เอาข้อที่สร้างจากบัตรของชุดนี้ออก ชุดที่ไม่เหลือข้อลบทั้งชุด */
    try{const snap=await f.fs.getDocs(f.fs.collection(f.db,'qpool'));
      for(const s of snap.docs){const items=s.data().items||[],keep=items.filter(raw=>{try{return !cardIds.has(JSON.parse(raw).card)}catch(e){return true}});
        if(keep.length===items.length)continue;pool+=items.length-keep.length;
        if(keep.length)await f.fs.updateDoc(s.ref,{items:keep,n:keep.length});else await f.fs.deleteDoc(s.ref)}
      POOL.cache.clear()}catch(e){console.warn('qpool clean',e&&e.code||e)}
    try{const snap=await f.fs.getDocs(f.fs.query(f.fs.collection(f.db,'reports'),f.fs.where('status','==','open')));
      for(const s of snap.docs)if(String(s.data().packId).replace(/_\d+$/,'')===base){await f.fs.deleteDoc(s.ref);rep++}}catch(e){}
    /* เครื่องนี้: ลบทันทีไม่ต้องรอซิงก์ */
    for(const x of parts){DOCS.splice(DOCS.indexOf(x),1);try{await kbDelMany('docs',[x.id])}catch(e){}}
    CARDS=CARDS.filter(c=>!ids.has(c.docId));try{await kbDelMany('cards',[...cardIds])}catch(e){}
    rebuildCloudIndex();syncDocSubjects();renderSide();renderKB();
    toast(`ลบแล้ว · บัตร/ข้อสอบ ${cards.length} รายการ${pool?` · โจทย์ในคลังโจทย์กลาง ${pool} ข้อ`:''}${rep?` · รายงาน ${rep} รายการ`:''}`);
  }catch(e){toast('ลบไม่สำเร็จ: '+String(e&&e.code||e),'bad')}
}
/* ชุดซ้ำในคลังกลาง: ไฟล์เดียวกัน (sha / ข้อความเดียวกัน / ชื่อไฟล์+ผู้ส่งเดียวกัน) */
function dupPacks(){
  const by=new Map();
  for(const d of DOCS.filter(x=>x.central)){const b=String(d.cloudId).replace(/_\d+$/,'');if(!by.has(b))by.set(b,{b,parts:[],at:0,d});const g=by.get(b);g.parts.push(d);g.at=Math.max(g.at,+d.at||0)}
  const groups=new Map();
  for(const g of by.values()){const d=g.d;g.n=CARDS.filter(c=>g.parts.some(x=>x.id===c.docId)).length;const k=d.txtSha||d.sha||(baseName(d.name)+'|'+(d.owner||''));if(!groups.has(k))groups.set(k,[]);groups.get(k).push(g)}
  /* เก็บชุดที่มีบัตร/ข้อสอบมากที่สุด (ข้อมูลครบกว่า) เท่ากันเก็บชุดล่าสุด */
  const out=[];for(const l of groups.values())if(l.length>1){l.sort((a,b)=>b.n-a.n||b.at-a.at);out.push(...l.slice(1).map(g=>({...g,keep:l[0]})))}
  return out;
}
async function removeDupPacks(){
  const l=dupPacks();if(!l.length||!isReviewerMe())return;
  if(await modal(`<p class="mt">ลบชุดซ้ำ ${l.length} ชุด?</p><p class="src">${l.map(g=>{const nm=x=>esc(x.d.name.replace(/ \(ส่วนที่ \d+\)$/,'')),dt=x=>new Date(x.at).toLocaleDateString('th-TH');return `ลบ ${nm(g)} (${g.n} รายการ · ${dt(g)}) → เก็บ ${nm(g.keep)} (${g.keep.n} รายการ · ${dt(g.keep)})`}).join('<br>')}</p><p class="src">ของแต่ละไฟล์เก็บชุดที่มีบัตร/ข้อสอบมากที่สุดไว้ (เท่ากันเก็บชุดล่าสุด)</p>`,[{t:'ยกเลิก'},{t:'ลบชุดซ้ำ',cls:'primary'}])!==1)return;
  const gone=new Set(l.flatMap(g=>g.parts.map(x=>x.id)));
  const keep=new Set(CARDS.filter(c=>String(c.docId).startsWith('c_')&&!gone.has(c.docId)).flatMap(c=>c.figs||[]));
  try{for(const g of l)for(const x of g.parts)await removePack(x.cloudId,keep);
    /* ชุดซ้ำใช้รหัสบัตรเดียวกับชุดที่เก็บไว้: แตะชุดที่เก็บให้ทุกเครื่องโหลดบัตรชุดนั้นใหม่ ไม่ให้บัตรหายตามชุดที่ลบ */
    const f=await fb(),kept=new Set(l.map(g=>g.keep));
    for(const g of kept)for(const x of g.parts)try{await f.fs.updateDoc(fsDoc('kb',x.cloudId),{updatedAt:f.fs.serverTimestamp()})}catch(e){}
    await syncCentral(true);toast(`ลบชุดซ้ำแล้ว ${l.length} ชุด`)}
  catch(e){toast('ลบไม่สำเร็จ: '+String(e&&e.code||e),'bad')}
  renderKB();
}
async function editCloudCard(pid,cardId,patch){
  const f=await fb(),s=await f.fs.getDoc(fsDoc('kb',pid));if(!s.exists())throw new Error('ไม่พบชุดนี้');
  const cards=(s.data().cards||[]).map(c=>c.id===cardId?{...c,...patch}:c);
  await f.fs.updateDoc(fsDoc('kb',pid),{cards,updatedAt:f.fs.serverTimestamp()});
}

/* Firestore ไม่รับอาร์เรย์ซ้อนอาร์เรย์ (ตาราง viz.rows) → invalid-argument: เก็บ viz เป็นข้อความ JSON แล้วแปลงกลับตอนโหลด */
const vizOut=c=>c&&c.q&&c.q.viz&&typeof c.q.viz==='object'?{...c,q:{...c.q,viz:JSON.stringify(c.q.viz)}}:c;
const vizIn=c=>{if(c&&c.q&&typeof c.q.viz==='string'){let v=null;try{v=JSON.parse(c.q.viz)}catch(e){}return{...c,q:{...c.q,viz:v}}}return c};
/* ค่า undefined ทำให้ Firestore ปฏิเสธทั้งเอกสาร: ล้างด้วย JSON */
const fsClean=x=>JSON.parse(JSON.stringify(x));
const utf8Len=x=>{try{return new TextEncoder().encode(JSON.stringify(x)).length}catch(e){return JSON.stringify(x).length*3}};

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

/* ---------- ขอลบข้อสอบ ----------
   ผู้ใช้กดลบ → ข้อนั้นไม่แสดงในเครื่องนี้ทันที + ส่งคำขอ (reports type:'delete') ให้ผู้ตรวจ
   ผู้ตรวจอนุมัติ = ลบข้อนั้นออกจากชุดในคลังกลาง คลังโจทย์กลาง และรูปที่ไม่ได้ใช้แล้ว (ทุกเครื่องลบตามตอนซิงก์)
   ผู้ตรวจยกเลิก = ข้อนั้นกลับมาแสดงในเครื่องของผู้ขอ · ข้อจากไฟล์ของตัวเองที่ยังไม่อยู่คลังกลาง ลบได้ทันที */
/* ปุ่มลบอยู่ในหน้าที่วาดเป็นข้อความ: เก็บข้อสอบไว้ในตารางแล้วส่งแค่รหัส */
const QDEL_REF=new Map();let QDEL_N=0;
function qdelRef(q){const id='d'+(++QDEL_N);QDEL_REF.set(id,q);if(QDEL_REF.size>400)QDEL_REF.delete(QDEL_REF.keys().next().value);return id}
/* ข้อที่ไม่ได้มาจากไฟล์ข้อสอบ: โจทย์ในคลังโจทย์กลาง (ขอลบผ่านผู้ตรวจ) หรือโจทย์ที่ AI เพิ่งสร้าง (ซ่อนในเครื่องนี้) */
async function requestDelGenQ(q){
  const pooled=!!q.poolId;
  if(pooled&&!ME&&!(await loginDialog()))return;
  const r=await modal(`<p class="mt">ลบข้อสอบข้อนี้?</p><div style="white-space:pre-wrap">${figText(q.stem,'qfig sm')}</div>
    <p class="src">${pooled?'ข้อนี้เป็นโจทย์ที่ AI สร้างไว้ในคลังโจทย์กลาง จะไม่แสดงในเครื่องของคุณทันที และส่งให้ผู้ตรวจยืนยัน ถ้าผู้ตรวจอนุมัติ ข้อนี้จะถูกลบออกจากคลังถาวร ถ้าผู้ตรวจยกเลิก ข้อนี้จะกลับมา':'ข้อนี้เป็นโจทย์ที่ AI เพิ่งสร้างและยังไม่ได้เก็บในคลัง จะไม่แสดงในเครื่องนี้อีก'}</p>
    <label class="lbl" for="qd-w">เหตุผล</label><textarea id="qd-w" rows="2" class="cetx" placeholder="เช่น เฉลยผิด โจทย์ไม่ครบ ไม่มีตัวเลือกที่ถูก"></textarea>`,[{t:'ยกเลิก'},{t:'ลบข้อนี้',cls:'primary'}]);
  if(r!==1)return;
  const why=document.getElementById('qd-w').value.trim(),key=qKey(q);
  QHIDE['k:'+key]={at:Date.now(),rid:''};saveQHide();
  if(!pooled){toast('ซ่อนข้อนี้แล้ว');return}
  try{const f=await fb();
    const ref=await f.fs.addDoc(f.fs.collection(f.db,'reports'),{type:'delete',uid:ME.uid,name:ME.name,poolId:q.poolId,qkey:key,packId:'',cardId:'',
      stem:String(q.stem||'').slice(0,1500),choices:q.choices,answer:q.answer,why:why.slice(0,1500),status:'open',createdAt:f.fs.serverTimestamp()});
    QHIDE['k:'+key].rid=ref.id;saveQHide();
    toast('ซ่อนข้อนี้แล้ว · ส่งให้ผู้ตรวจยืนยันการลบ');
  }catch(e){toast('ซ่อนข้อนี้ในเครื่องแล้ว แต่ส่งคำขอลบไม่สำเร็จ: '+String(e&&e.code||e&&e.message||e),'bad')}
}
async function requestDelQ(ref){
  const q0=QDEL_REF.get(ref);
  const cardId=q0?q0.card:ref,c=cardId&&CARDS.find(x=>x.id===cardId&&x.type==='q');
  if(!c){if(q0)return requestDelGenQ(q0);return}
  if(!c.q)return;
  const central=String(c.docId).startsWith('c_');
  if(central&&!ME&&!(await loginDialog()))return;
  const r=await modal(`<p class="mt">ลบข้อสอบข้อนี้?</p><div style="white-space:pre-wrap">${figText(c.q.stem,'qfig sm')}</div>
    <p class="src">${central?'ข้อนี้จะไม่แสดงในเครื่องของคุณทันที และส่งให้ผู้ตรวจยืนยัน ถ้าผู้ตรวจอนุมัติ ข้อนี้จะถูกลบออกจากคลังกลางถาวร ถ้าผู้ตรวจยกเลิก ข้อนี้จะกลับมา':'ข้อนี้มาจากไฟล์ของคุณที่ยังไม่อยู่ในคลังกลาง จะลบออกทันที'}</p>
    <label class="lbl" for="qd-w">เหตุผล</label><textarea id="qd-w" rows="2" class="cetx" placeholder="เช่น รูปหาย โจทย์ไม่ครบ ไม่มีตัวเลือกที่ถูก"></textarea>`,[{t:'ยกเลิก'},{t:'ลบข้อนี้',cls:'primary'}]);
  if(r!==1)return;
  const why=document.getElementById('qd-w').value.trim();
  if(!central){
    const d=DOCS.find(x=>x.id===c.docId);
    CARDS=CARDS.filter(x=>x.id!==c.id);try{await kbDelMany('cards',[c.id])}catch(e){}
    if(d){d.delCards=[...new Set([...(d.delCards||[]),c.id])].slice(-1000);await saveDoc(d);if(typeof syncPushCards==='function')syncPushCards(d,true)}
    toast('ลบข้อนี้แล้ว');return;
  }
  QHIDE[c.id]={at:Date.now(),rid:''};saveQHide();
  try{const f=await fb();
    const ref=await f.fs.addDoc(f.fs.collection(f.db,'reports'),{type:'delete',uid:ME.uid,name:ME.name,packId:c.docId.slice(2),cardId:c.id,cardFact:String(c.fact||'').slice(0,1500),
      stem:String(c.q.stem||'').slice(0,1500),choices:c.q.choices,answer:c.q.answer,figs:(c.figs||[]).slice(0,12),why:why.slice(0,1500),status:'open',createdAt:f.fs.serverTimestamp()});
    QHIDE[c.id].rid=ref.id;saveQHide();
    toast('ซ่อนข้อนี้แล้ว · ส่งให้ผู้ตรวจยืนยันการลบ');
  }catch(e){toast('ซ่อนข้อนี้ในเครื่องแล้ว แต่ส่งคำขอลบไม่สำเร็จ: '+String(e&&e.code||e&&e.message||e),'bad')}
}
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-qdel]');if(!b)return;e.preventDefault();requestDelQ(b.dataset.qdel)});
/* ผู้ตรวจยกเลิกคำขอ → เอาข้อนั้นกลับมาในเครื่องของผู้ขอ (เช็กไม่เกินทุก 10 นาที) */
let QHIDE_AT=0;
async function refreshQHide(){
  if(!ME||!Object.keys(QHIDE).length||Date.now()-QHIDE_AT<10*60000)return;QHIDE_AT=Date.now();
  try{const f=await fb(),snap=await f.fs.getDocs(f.fs.query(f.fs.collection(f.db,'reports'),f.fs.where('uid','==',ME.uid),f.fs.where('type','==','delete')));
    let back=0;for(const s of snap.docs){const r=s.data();if(r.status!=='dismissed')continue;
      if(r.cardId&&QHIDE[r.cardId]){delete QHIDE[r.cardId];back++}else if(r.qkey&&QHIDE['k:'+r.qkey]){delete QHIDE['k:'+r.qkey];back++}}
    if(back){saveQHide();toast(`ผู้ตรวจยกเลิกการลบ ${back} ข้อ ข้อสอบกลับมาแล้ว`)}
  }catch(e){}
}
async function approveDelQ(r){
  const f=await fb();
  /* โจทย์ในคลังโจทย์กลาง: เอาข้อนั้นออกจากชุด ชุดที่ไม่เหลือข้อลบทั้งชุด */
  if(r.poolId){
    const s=await f.fs.getDoc(fsDoc('qpool',r.poolId));
    if(s.exists()){const items=s.data().items||[],keep=items.filter(raw=>{try{return qKey(JSON.parse(raw))!==r.qkey}catch(e){return true}});
      if(!keep.length)await f.fs.deleteDoc(fsDoc('qpool',r.poolId));else if(keep.length!==items.length)await f.fs.updateDoc(fsDoc('qpool',r.poolId),{items:keep,n:keep.length})}
    if(typeof POOL!=='undefined')POOL.cache.clear();
    await f.fs.updateDoc(fsDoc('reports',r.id),{status:'resolved',by:ME.name,resolvedAt:f.fs.serverTimestamp()});
    return;
  }
  const s=await f.fs.getDoc(fsDoc('kb',r.packId));
  if(s.exists()&&!s.data().deleted){
    const all=s.data().cards||[],left=all.filter(c=>c.id!==r.cardId);
    if(left.length!==all.length){
      const keepFigs=new Set(left.flatMap(c=>c.figs||[])),gone=(all.find(c=>c.id===r.cardId)||{}).figs||[];
      if(!left.length)await removePack(r.packId);
      else{await f.fs.updateDoc(fsDoc('kb',r.packId),{cards:left,count:left.length,figIds:[...keepFigs],updatedAt:f.fs.serverTimestamp()});
        for(const fid of gone)if(!keepFigs.has(fid))try{await f.fs.deleteDoc(fsDoc('kbfigs',fid))}catch(e){}}
    }
  }
  /* คลังโจทย์กลาง: โจทย์ที่สร้างจากข้อนี้ */
  try{const snap=await f.fs.getDocs(f.fs.collection(f.db,'qpool'));
    for(const p of snap.docs){const items=p.data().items||[],keep=items.filter(raw=>{try{return JSON.parse(raw).card!==r.cardId}catch(e){return true}});
      if(keep.length===items.length)continue;if(keep.length)await f.fs.updateDoc(p.ref,{items:keep,n:keep.length});else await f.fs.deleteDoc(p.ref)}
    if(typeof POOL!=='undefined')POOL.cache.clear()}catch(e){}
  await f.fs.updateDoc(fsDoc('reports',r.id),{status:'resolved',by:ME.name,resolvedAt:f.fs.serverTimestamp()});
  CARDS=CARDS.filter(c=>c.id!==r.cardId);try{await kbDelMany('cards',[r.cardId])}catch(e){}
  rebuildCloudIndex();
}

/* ---------- review view (ผู้ตรวจ/แอดมิน) ---------- */
let RV={tab:'subs',subs:null,reports:null,users:null,open:new Set()};
async function renderReview(){
  if(VIEW!=='review')return;
  head('ตรวจอนุมัติ','ตรวจของที่ส่งเข้าคลังกลาง รายงานเฉลยผิด ข้อความถึงผู้พัฒนา และจัดการคลัง');
  const el=document.getElementById('sheet');
  if(!isReviewerMe()){el.innerHTML='<div class="state"><p><b>หน้านี้สำหรับผู้ตรวจและแอดมิน</b></p></div>';return}
  const tab=(v,t)=>`<button data-rt="${v}" aria-pressed="${RV.tab===v}">${t}</button>`;
  el.innerHTML=`<div class="seg" role="group" style="grid-template-columns:repeat(auto-fit,minmax(78px,1fr))">${tab('subs','รออนุมัติ')}${tab('reports','รายงานเฉลยผิด')}${tab('dels','ขอลบข้อสอบ')}${tab('feedback','ข้อความ')}${tab('kb','คลังกลาง')}${ME.role==='admin'?tab('users','สมาชิก')+tab('psc','Product Catalog'):''}</div><div id="rvbody"><div class="state"><div class="spin"></div></div></div>`;
  el.querySelectorAll('[data-rt]').forEach(b=>b.onclick=()=>{RV.tab=b.dataset.rt;renderReview()});
  const body=document.getElementById('rvbody');
  try{
    const f=await fb();
    if(RV.tab==='psc'){await renderPscAdmin(body);return}
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
      const list=snap.docs.map(s=>({id:s.id,...s.data()})).filter(r=>r.type!=='delete');
      body.innerHTML=list.length?list.map(r=>`<div class="kdoc" data-rp="${r.id}"><p class="src">รายงานโดย ${esc(r.name||'-')}${r.orig?' · ข้อสอบจริงจากคลัง':' · ข้อที่ AI สร้างจากบัตร'}</p>
        <div style="white-space:pre-wrap"><b>${figText(r.stem,'qfig sm')}</b></div><ol class="kq">${(r.choices||[]).map((x,j)=>`<li${j===r.answer?' class="ok"':''}>${figText(x,'qfig chfig')}${j===r.answer?' (เฉลยเดิม)':''}${x===r.proposed?' ← ผู้รายงานเสนอ':''}</li>`).join('')}</ol>
        <p><b>เหตุผล:</b> ${esc(r.why)}</p><p class="src">บัตรต้นทาง: ${esc(r.cardFact)}</p>
        <div class="btnrow" style="justify-content:flex-start"><button class="primary" data-fix>แก้บัตร/ข้อสอบต้นทาง</button><button class="ghost" data-close>ปิดรายงาน (เฉลยถูกแล้ว)</button><button class="ghost danger" data-rdel>🗑 ลบข้อสอบข้อนี้</button></div></div>`).join('')
        :'<p class="src" style="text-align:center">ไม่มีรายงานค้าง</p>';
      body.querySelectorAll('[data-rp]').forEach(box=>{const r=list.find(x=>x.id===box.dataset.rp);
        box.querySelector('[data-close]').onclick=async()=>{await f.fs.updateDoc(fsDoc('reports',r.id),{status:'dismissed',by:ME.name});renderReview()};
        /* ลบข้อนี้ออกจากคลังกลางถาวร (เหมือนอนุมัติคำขอลบ) แล้วปิดรายงาน */
        box.querySelector('[data-rdel]').onclick=async()=>{
          if(await modal(`<p class="mt">ลบข้อสอบข้อนี้ออกจากคลังกลางถาวร?</p><div style="white-space:pre-wrap">${figText(r.stem,'qfig sm')}</div><p class="src">ทุกเครื่องจะลบตามตอนซิงก์ และโจทย์ที่ AI สร้างจากข้อนี้ในคลังโจทย์กลางจะถูกลบด้วย</p>`,[{t:'ยกเลิก'},{t:'ลบถาวร',cls:'primary'}])!==1)return;
          box.querySelectorAll('button').forEach(b=>b.disabled=true);
          try{await approveDelQ(r);toast('ลบข้อนี้ออกจากคลังกลางแล้ว');await syncCentral(true)}catch(e){toast('ลบไม่สำเร็จ: '+String(e&&e.code||e&&e.message||e),'bad')}
          renderReview()};
        box.querySelector('[data-fix]').onclick=async()=>{const c=CARDS.find(x=>x.id===r.cardId);if(!c){toast('ไม่พบบัตรนี้ในเครื่อง ลองซิงก์ก่อน','bad');return}
          const ok=await editCardDialog(c);if(!ok)return;
          try{await editCloudCard(r.packId,c.id,c.type==='q'?{q:c.q,fact:c.fact,title:c.title,ansSrc:c.ansSrc,topic:c.topic}:{fact:c.fact,title:c.title,topic:c.topic});
            await f.fs.updateDoc(fsDoc('reports',r.id),{status:'resolved',by:ME.name});toast('แก้ในคลังกลางแล้ว ทุกคนจะได้ฉบับแก้ตอนซิงก์');await syncCentral()}catch(e){toast('แก้ไม่สำเร็จ: '+(e.code||e.message),'bad')}
          renderReview()};
      });
    }else if(RV.tab==='dels'){
      const snap=await f.fs.getDocs(f.fs.query(f.fs.collection(f.db,'reports'),f.fs.where('status','==','open')));
      const list=snap.docs.map(s=>({id:s.id,...s.data()})).filter(r=>r.type==='delete');
      const pk=id=>id?(DOCS.find(d=>d.cloudId===id)||{}).name||id:'คลังโจทย์กลาง (AI สร้าง)';
      body.innerHTML=list.length?list.map(r=>`<div class="kdoc" data-dq="${r.id}"><p class="src">ขอลบโดย ${esc(r.name||'-')} · ชุด ${esc(pk(r.packId))}</p>
        <div style="white-space:pre-wrap"><b>${figText(r.stem,'qfig sm')}</b></div><ol class="kq">${(r.choices||[]).map((x,j)=>`<li${j===r.answer?' class="ok"':''}>${figText(x,'qfig chfig')}${j===r.answer?' (เฉลย)':''}</li>`).join('')}</ol>
        <p><b>เหตุผล:</b> ${esc(r.why||'-')}</p>
        <div class="btnrow" style="justify-content:flex-start"><button class="primary" data-dok>อนุมัติลบออกจากคลังถาวร</button><button class="ghost" data-dno>ยกเลิกการลบ (คืนข้อสอบ)</button></div></div>`).join('')
        :'<p class="src" style="text-align:center">ไม่มีคำขอลบข้อสอบ</p>';
      body.querySelectorAll('[data-dq]').forEach(box=>{const r=list.find(x=>x.id===box.dataset.dq);
        box.querySelector('[data-dok]').onclick=async()=>{box.querySelectorAll('button').forEach(b=>b.disabled=true);
          try{await approveDelQ(r);toast('ลบข้อนี้ออกจากคลังกลางแล้ว ทุกเครื่องจะลบตามตอนซิงก์');await syncCentral(true)}catch(e){toast('ลบไม่สำเร็จ: '+String(e&&e.code||e&&e.message||e),'bad')}renderReview()};
        box.querySelector('[data-dno]').onclick=async()=>{try{await f.fs.updateDoc(fsDoc('reports',r.id),{status:'dismissed',by:ME.name});toast('ยกเลิกการลบแล้ว ข้อนี้จะกลับมาในเครื่องของผู้ขอ')}catch(e){toast('ไม่สำเร็จ','bad')}renderReview()};
      });
    }else if(RV.tab==='feedback'){
      const snap=await f.fs.getDocs(f.fs.query(f.fs.collection(f.db,'feedback'),f.fs.where('status','==','open')));
      const ms=x=>(x.at&&x.at.toMillis?x.at.toMillis():0);
      const list=snap.docs.map(s=>({id:s.id,...s.data()})).sort((a,b)=>ms(b)-ms(a));
      const when=x=>{const t=ms(x);if(!t)return '';const d=new Date(t);return ` · ${d.toLocaleDateString('th-TH',{day:'numeric',month:'short'})} ${d.toLocaleTimeString('th-TH',{hour:'2-digit',minute:'2-digit'})}`};
      body.innerHTML=list.length?list.map(x=>`<div class="kdoc" data-fb="${x.id}">
        <p class="kn">${esc(FB_KINDS[x.kind]||x.kind||'ข้อความ')}</p>
        <p class="src">${esc(x.name||'-')} · v${esc(x.ver||'?')} ${esc(x.build||'')}${x.view?` · หน้า ${esc(x.view)}`:''}${x.subject?` · ${esc(x.subject)}`:''}${when(x)}</p>
        <p style="white-space:pre-wrap">${esc(x.msg||'')}</p>
        ${x.back?`<p class="src">ติดต่อกลับ: <b>${esc(x.back)}</b></p>`:''}
        <p class="src">${esc(String(x.ua||'').slice(0,120))}</p>
        <div class="btnrow" style="justify-content:flex-start">${x.back&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x.back)?`<a class="ghost" href="mailto:${esc(x.back)}?subject=${encodeURIComponent('ตอบกลับ Baac_Exam')}">ตอบกลับทางอีเมล</a>`:''}<button class="primary" data-done>ทำเครื่องหมายว่าแก้แล้ว</button></div></div>`).join('')
        :'<p class="src" style="text-align:center">ไม่มีข้อความค้าง</p>';
      body.querySelectorAll('[data-fb]').forEach(box=>box.querySelector('[data-done]').onclick=async()=>{
        try{await f.fs.updateDoc(fsDoc('feedback',box.dataset.fb),{status:'resolved',by:ME.name,resolvedAt:f.fs.serverTimestamp()});toast('ปิดข้อความแล้ว')}catch(e){toast('ไม่สำเร็จ','bad')}
        renderReview();
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
  /* เลือกรายวิชา/หัวข้อของบัตรได้เอง (วิชามาตรฐาน วิชาที่แอดมินเพิ่ม และหัวข้อเดิมของบัตร) */
  const topicSel=()=>{
    const names=[...new Set([...SUBJ.filter(s=>!String(s.id).startsWith('doc_')&&s.id!=='specall').map(s=>s.name),c.topic].filter(Boolean))];
    return `<label class="lbl" for="ce-tp">รายวิชา/หัวข้อ</label><select id="ce-tp" class="cetx">${names.map(t=>`<option value="${esc(t)}"${t===c.topic?' selected':''}>${esc(t)}</option>`).join('')}</select>`;
  };
  if(c.type==='q'){
    if(await modal(`<p class="mt">แก้ข้อสอบ</p>${topicSel()}<label class="lbl" for="ce-s">โจทย์</label><textarea id="ce-s" rows="4" class="cetx">${esc(c.q.stem)}</textarea>
      <label class="lbl" for="ce-c">ตัวเลือก (บรรทัดละ 1 ตัวเลือก)</label><textarea id="ce-c" rows="4" class="cetx">${esc(c.q.choices.join('\n'))}</textarea>
      <label class="lbl" for="ce-a">ข้อที่ถูก</label><select id="ce-a"><option value="-1">ยังไม่รู้</option>${c.q.choices.map((x,j)=>`<option value="${j}"${j===c.q.answer?' selected':''}>${TH[j]||j+1}. ${esc(x).slice(0,40)}</option>`).join('')}</select>
      <label class="lbl" for="ce-e">คำอธิบาย (บรรทัดละ 1 ขั้น)</label><textarea id="ce-e" rows="3" class="cetx">${esc((c.q.steps||[]).join('\n'))}</textarea>`,[{t:'ยกเลิก'},{t:'บันทึก',cls:'primary'}])!==1)return false;
    const st=document.getElementById('ce-s').value.trim(),ch=document.getElementById('ce-c').value.split('\n').map(x=>x.trim()).filter(Boolean),a=+document.getElementById('ce-a').value;
    if(!st||ch.length<2)return false;
    c.q={stem:st,choices:ch,answer:a<ch.length?a:-1,steps:document.getElementById('ce-e').value.split('\n').map(x=>x.trim()).filter(Boolean)};
    c.topic=(document.getElementById('ce-tp')||{}).value||c.topic;
    if(c.q.answer>=0)c.ansSrc='doc';c.title=st.slice(0,90);c.fact=`${st}\nตัวเลือก: ${ch.join(' | ')}${c.q.answer>=0?`\nตอบ: ${ch[c.q.answer]}`:''}`;
  }else{
    if(await modal(`<p class="mt">แก้บัตรความรู้</p>${topicSel()}<label class="lbl" for="ce-t">หัวเรื่อง</label><input class="tx" id="ce-t" value="${esc(c.title)}"><label class="lbl" for="ce-f">ความรู้</label><textarea id="ce-f" rows="5" class="cetx">${esc(c.fact)}</textarea>`,[{t:'ยกเลิก'},{t:'บันทึก',cls:'primary'}])!==1)return false;
    const t=document.getElementById('ce-t').value.trim(),f=document.getElementById('ce-f').value.trim();if(!f)return false;
    c.title=t||c.title;c.fact=f;
    c.topic=(document.getElementById('ce-tp')||{}).value||c.topic;
  }
  c.emb=null;c.em='';c.editedAt=Date.now();await saveCards([c]);if(canEmbed())embedCards([c]).catch(()=>{});
  return true;
}
function previewCard(c){
  if(c.type==='q'&&c.q)return `<div class="kc"><p style="white-space:pre-wrap"><b>${esc(c.q.stem)}</b></p><ol class="kq">${c.q.choices.map((x,j)=>`<li${j===c.q.answer?' class="ok"':''}>${esc(x)}${j===c.q.answer?' ✓':''}</li>`).join('')}</ol>${(c.figs||[]).length?'<p class="src">มีรูปประกอบ</p>':''}</div>`;
  return `<div class="kc"><p><b>${esc(c.title)}</b> <span class="src">· ${esc(c.topic)} · ${esc(c.kind)}</span></p><p>${esc(c.fact)}</p>${(c.figs||[]).length?'<p class="src">มีรูปประกอบ</p>':''}</div>`;
}

/* ---------- รายวิชา: เพิ่ม / ซ่อน (แอดมิน/ผู้ตรวจ) ใช้กับทุกคน ---------- */
/* เทียบค่าแบบไม่สนลำดับคีย์ เพราะ Firestore เรียงคีย์ของ map ใหม่เอง (ลำดับต่างแต่ข้อมูลเหมือน = ไม่ต้องรีโหลด) */
function subjCfgSig(o){
  const sk=v=>{const out={};if(v&&typeof v==='object')for(const k of Object.keys(v).sort())out[k]=v[k];return out};
  const c=o||{};return JSON.stringify({add:(c.add||[]).map(sk),hide:c.hide||[],rename:sk(c.rename),alias:sk(c.alias)});
}
/* กำลังทำอะไรอยู่หรือไม่ — ถ้าใช่ ห้ามรีโหลดหน้าเด็ดขาด (ข้อสอบ/ไฟล์ที่ทำค้างจะหาย) */
function subjBusy(){
  try{
    if(document.hidden)return true;
    const d=document.getElementById('dlg');if(d&&d.open)return true;
    if(typeof M!=='undefined'&&M&&M.status==='run')return true;
    if(typeof R!=='undefined'&&R&&R.status==='loading')return true;
    if(typeof PROC_ID!=='undefined'&&PROC_ID)return true;
    if(typeof PROCQ!=='undefined'&&PROCQ&&PROCQ.length)return true;
  }catch(e){}
  return false;
}
let SUBJ_PENDING=null,SUBJ_CHECKED=0;
async function syncSubjects(){
  const t=Date.now();if(t-SUBJ_CHECKED<60000)return;SUBJ_CHECKED=t;
  try{const f=await fb(),snap=await f.fs.getDoc(fsDoc('config','subjects'));
    const cfg=snap.exists()?{add:snap.data().add||[],hide:snap.data().hide||[],rename:snap.data().rename||{},alias:snap.data().alias||{}}:{add:[],hide:[],rename:{},alias:{}};
    if(subjCfgSig(cfg)===subjCfgSig(SUBJ_CFG)){SUBJ_PENDING=null;return}
    SUBJ_PENDING=cfg;
  }catch(e){return}
  applySubjectCfg();
}
/* ใช้ค่าใหม่กับเมนูทันทีโดยไม่รีโหลดหน้า — เก็บลง localStorage ไม่ได้ก็ยังใช้ต่อได้ในหน้านี้ */
function applySubjectCfg(force,quiet){
  if(!SUBJ_PENDING||(!force&&subjBusy()))return;
  const cfg=SUBJ_PENDING;SUBJ_PENDING=null;
  SUBJ_CFG={add:cfg.add||[],hide:cfg.hide||[],rename:cfg.rename||{},alias:cfg.alias||{}};
  try{localStorage.setItem(SUBJ_CFG_KEY,JSON.stringify(SUBJ_CFG))}catch(e){}
  try{rebuildSubjects()}catch(e){}
  try{if(typeof syncDocSubjects==='function')syncDocSubjects()}catch(e){}
  if(!SUBJ.some(s=>s.id===P.subject)){P.subject=(SUBJ[0]||{id:'ineq'}).id;try{save()}catch(e){}}
  try{renderSide()}catch(e){}
  try{if(VIEW==='practice'){if(typeof render==='function')render()}else if(typeof setView==='function')setView(VIEW)}catch(e){}
  if(!quiet)try{toast('อัปเดตรายวิชาจากส่วนกลางแล้ว')}catch(e){}
}
onAppReady(()=>{
  setTimeout(syncSubjects,3000);
  setInterval(syncSubjects,5*60000);
  setInterval(applySubjectCfg,30000);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden){syncSubjects();applySubjectCfg()}});
});
/* วิชาที่ซ่อนอยู่: แสดงเฉพาะตอนมี เพื่อเปิดกลับได้โดยไม่ต้องมีแผงจัดการเต็มรูปแบบ */
function hiddenSubjHTML(){
  if(!isReviewerMe())return '';
  const hid=(SUBJ_CFG.hide||[]).slice();if(!hid.length)return '';
  const btn=id=>{const s=SUBJ_ALL.find(x=>x.id===id);return `<button class="ghost" type="button" data-sunhide="${esc(id)}">${esc(s?s.name:id)} · เปิดกลับ</button>`};
  return `<div class="cloudbox"><p><b>รายวิชาที่ซ่อนอยู่ (${hid.length})</b></p>
    <p class="src">วิชาเหล่านี้ถูกเอาออกจากเมนูของทุกคน แต่ข้อมูลยังอยู่ครบ · กดเพื่อเปิดกลับ</p>
    <div class="btnrow" style="justify-content:flex-start">${hid.map(btn).join('')}</div></div>`;
}
function wireHiddenSubj(el,rerender){
  el.querySelectorAll('[data-sunhide]').forEach(b=>b.onclick=async()=>{
    const id=b.dataset.sunhide;b.disabled=true;
    try{await saveSubjCfg({hide:(SUBJ_CFG.hide||[]).filter(x=>x!==id)});toast('เปิดวิชากลับแล้ว');rerender()}
    catch(e){b.disabled=false;toast('เปิดไม่สำเร็จ: '+String(e&&e.code||e&&e.message||e),'bad')}
  });
}
async function saveSubjCfg(cfg){
  const next={add:cfg.add??SUBJ_CFG.add??[],hide:cfg.hide??SUBJ_CFG.hide??[],rename:cfg.rename??SUBJ_CFG.rename??{},alias:cfg.alias??SUBJ_CFG.alias??{}};
  const f=await fb();await f.fs.setDoc(fsDoc('config','subjects'),{...next,updatedAt:f.fs.serverTimestamp(),by:ME.name});
  SUBJ_PENDING=next;SUBJ_CHECKED=Date.now();
  applySubjectCfg(true,true);   /* อัปเดตเมนูทันที ไม่ต้องรีโหลดหน้าให้งานที่ทำค้างหาย */
  toast('บันทึกรายวิชาแล้ว');
}
/* เปลี่ยนชื่อรายวิชา: แก้ config + alias แล้วย้าย topic ของบัตร/เอกสาร/คลังกลาง/งานรอตรวจให้ตรงกัน
   เครื่องอื่นและผู้ใช้อื่นจะแปลงชื่อเดิมเป็นชื่อใหม่ตอนโหลดผ่าน alias */
async function renameSubject(id,oldName,newName,opt={}){
  if(!isReviewerMe())throw new Error('ต้องเป็นผู้ตรวจหรือแอดมิน');
  const f=await fb();
  const cfg={add:(SUBJ_CFG.add||[]).map(a=>a.id===id?{...a,name:newName}:a),hide:(SUBJ_CFG.hide||[]).slice(),
    rename:{...(SUBJ_CFG.rename||{})},alias:{...(SUBJ_CFG.alias||{})}};
  for(const k of Object.keys(cfg.alias))if(cfg.alias[k]===oldName)cfg.alias[k]=newName;
  cfg.alias[oldName]=newName;cfg.rename[id]=newName;
  /* เขียน config + alias ก่อน ถ้าขั้นตอนย้ายข้อมูลพลาด เครื่องอื่นยังแปลงชื่อเดิมได้ */
  await f.fs.setDoc(fsDoc('config','subjects'),{add:cfg.add,hide:cfg.hide,rename:cfg.rename,alias:cfg.alias,updatedAt:f.fs.serverTimestamp(),by:ME.name});
  try{localStorage.setItem(SUBJ_CFG_KEY,JSON.stringify({add:cfg.add,hide:cfg.hide,rename:cfg.rename,alias:cfg.alias}))}catch(e){}
  SUBJ_CFG.add=cfg.add;SUBJ_CFG.rename={...cfg.rename};SUBJ_CFG.alias={...cfg.alias};
  /* เก็บรายการ pack ในคลังกลางที่ต้องแก้ก่อนเปลี่ยน topic ในเครื่อง */
  const centralPacks=new Set(),changed=[];
  for(const c of CARDS)if(c.topic===oldName){if(String(c.docId).startsWith('c_'))centralPacks.add(c.docId.slice(2));c.topic=newName;changed.push(c)}
  if(changed.length)await saveCards(changed);
  const touchedDocs=new Set(changed.filter(c=>!String(c.docId).startsWith('c_')).map(c=>c.docId));
  const dch=[];
  for(const d of DOCS)if(d.topic===oldName){d.topic=newName;dch.push(d)}
  for(const d of DOCS)if(Array.isArray(d.subs)&&d.subs.includes(oldName)){d.subs=d.subs.map(n=>n===oldName?newName:n);if(!dch.includes(d))dch.push(d)}
  for(const d of dch)await saveDoc(d);
  /* คลังกลางที่อนุมัติแล้ว + งานรออนุมัติ */
  for(const pid of centralPacks){
    try{const s=await f.fs.getDoc(fsDoc('kb',pid));if(!s.exists())continue;
      const cards=(s.data().cards||[]).map(c=>c.topic===oldName?{...c,topic:newName}:c);
      await f.fs.updateDoc(fsDoc('kb',pid),{cards,updatedAt:f.fs.serverTimestamp()});
    }catch(e){console.warn('rename kb',pid,e)}
  }
  try{const snap=await f.fs.getDocs(f.fs.query(f.fs.collection(f.db,'subs'),f.fs.where('status','==','pending')));
    for(const s of snap.docs){const raw=s.data().cards||[];if(!raw.some(c=>c.topic===oldName))continue;
      await f.fs.updateDoc(s.ref,{cards:raw.map(c=>c.topic===oldName?{...c,topic:newName}:c),updatedAt:f.fs.serverTimestamp()})}
  }catch(e){console.warn('rename subs',e)}
  /* คลังส่วนตัวในเครื่องนี้ */
  for(const did of touchedDocs){const d=DOCS.find(x=>x.id===did);if(d&&typeof syncPushCards==='function')syncPushCards(d,true)}
  for(const d of dch)if(typeof syncPushMeta==='function')syncPushMeta(d);
  if(opt.reload!==false){toast(`เปลี่ยนชื่อวิชาเป็น "${newName}" แล้ว กำลังโหลดใหม่`);setTimeout(()=>location.reload(),900)}
}
/* ---------- รวมรายวิชา (ผู้ตรวจ/แอดมิน) ----------
   วิชาต้นทางทุกวิชาส่งข้อมูลทั้งหมดไปที่วิชาปลายทาง แล้วเอาวิชาต้นทางออกจากเมนูของทุกคน
   · บัตรความรู้/ข้อสอบที่ตั้งวิชาต้นทาง → เปลี่ยนเป็นวิชาปลายทาง (ในเครื่อง คลังกลาง และงานรออนุมัติ)
   · ไฟล์ที่เชื่อมต่อทั้งไฟล์กับวิชาต้นทาง → เชื่อมกับวิชาปลายทางแทน
   · วิชาจากไฟล์ → ทุกส่วนของไฟล์เชื่อมต่อทั้งไฟล์กับวิชาปลายทาง
   · โจทย์ที่ AI สร้างไว้ในคลังโจทย์กลาง → ย้ายไปอยู่วิชาปลายทาง
   · alias ชื่อเดิม → ชื่อปลายทาง: เครื่องอื่นแปลงข้อมูลที่ยังใช้ชื่อเดิมให้เองตอนโหลด */
async function mergeSubjects(targetId,srcIds){
  if(!isReviewerMe())throw new Error('ต้องเป็นผู้ตรวจหรือแอดมิน');
  const T=SUBJ.find(s=>s.id===targetId),S=srcIds.map(id=>SUBJ.find(s=>s.id===id)).filter(s=>s&&s.id!==targetId);
  if(!T||!S.length)return;
  const f=await fb(),names=new Set(S.map(s=>s.name)),tn=T.name;
  const cfg={add:(SUBJ_CFG.add||[]).slice(),hide:(SUBJ_CFG.hide||[]).slice(),rename:{...(SUBJ_CFG.rename||{})},alias:{...(SUBJ_CFG.alias||{})}};
  for(const s of S){
    for(const k of Object.keys(cfg.alias))if(cfg.alias[k]===s.name)cfg.alias[k]=tn;
    if(s.name!==tn)cfg.alias[s.name]=tn;
    cfg.hide.push(s.doc?'doc_'+s.doc:s.id);
  }
  cfg.hide=[...new Set(cfg.hide)];
  /* 1) บัตร/ข้อสอบในเครื่อง */
  const centralPacks=new Set(),changed=[];
  for(const c of CARDS)if(names.has(c.topic)){if(String(c.docId).startsWith('c_'))centralPacks.add(c.docId.slice(2));c.topic=tn;changed.push(c)}
  if(changed.length)await saveCards(changed);
  /* 2) ไฟล์: topic / วิชาที่เชื่อมทั้งไฟล์ / ไฟล์ของวิชาจากไฟล์ */
  const fileOf=new Set();for(const s of S)if(s.doc&&typeof subjDocs==='function')for(const d of subjDocs(s))fileOf.add(d.id);
  const dch=[];
  for(const d of DOCS){let ch=false;
    if(names.has(d.topic)){d.topic=tn;ch=true}
    const subs=(d.subs||[]).map(n=>names.has(n)?tn:n);if(fileOf.has(d.id))subs.push(tn);
    const uniq=[...new Set(subs)];if(uniq.join('|')!==(d.subs||[]).join('|')){d.subs=uniq;ch=true}
    if(ch)dch.push(d)}
  for(const d of dch){await saveDoc(d);
    if(d.central){try{await f.fs.updateDoc(fsDoc('kb',d.cloudId),{subs:d.subs,updatedAt:f.fs.serverTimestamp()})}catch(e){console.warn('merge subs',e)}}
    else if(typeof syncPushMeta==='function')syncPushMeta(d)}
  /* 3) คลังกลาง + งานรออนุมัติ */
  for(const pid of centralPacks){
    try{const s=await f.fs.getDoc(fsDoc('kb',pid));if(!s.exists())continue;
      await f.fs.updateDoc(fsDoc('kb',pid),{cards:(s.data().cards||[]).map(c=>names.has(c.topic)?{...c,topic:tn}:c),updatedAt:f.fs.serverTimestamp()})}catch(e){console.warn('merge kb',pid,e)}}
  try{const snap=await f.fs.getDocs(f.fs.query(f.fs.collection(f.db,'subs'),f.fs.where('status','==','pending')));
    for(const s of snap.docs){const raw=s.data().cards||[];if(!raw.some(c=>names.has(c.topic)))continue;
      await f.fs.updateDoc(s.ref,{cards:raw.map(c=>names.has(c.topic)?{...c,topic:tn}:c),updatedAt:f.fs.serverTimestamp()})}}catch(e){console.warn('merge subs',e)}
  /* 4) คลังโจทย์กลาง */
  try{for(const s of S){const snap=await f.fs.getDocs(f.fs.query(f.fs.collection(f.db,'qpool'),f.fs.where('sub','==',s.id)));
    for(const d of snap.docs)await f.fs.updateDoc(d.ref,{sub:T.id,subName:tn})}
    if(typeof POOL!=='undefined')POOL.cache.clear()}catch(e){console.warn('merge qpool',e)}
  for(const did of new Set(changed.filter(c=>!String(c.docId).startsWith('c_')).map(c=>c.docId))){const d=DOCS.find(x=>x.id===did);if(d&&typeof syncPushCards==='function')syncPushCards(d,true)}
  /* 5) เมนู: บันทึกท้ายสุด (alias + ซ่อนวิชาต้นทาง) */
  if(S.some(s=>s.id===P.subject)){P.subject=T.id;save()}
  await saveSubjCfg(cfg);
}
async function mergeSubjectsDialog(){
  if(!isReviewerMe()){toast('รวมรายวิชาได้เฉพาะผู้ตรวจหรือแอดมิน','bad');return}
  const list=SUBJ.filter(s=>s.id!=='specall');
  const grp=(g,t)=>{const l=list.filter(s=>(s.group||'spec')===g);return l.length?`<optgroup label="${esc(t)}">${l.map(s=>`<option value="${esc(s.id)}">${esc(s.name)}</option>`).join('')}</optgroup>`:''};
  const SL=typeof SPEC_LABEL!=='undefined'?SPEC_LABEL:'ความรู้เฉพาะตำแหน่ง';
  const amount=s=>{const q=bankFor(s,true).length,k=activeCards().filter(c=>inSubj(c,s.name)||(s.doc&&typeof subjDocIds==='function'&&subjDocIds(s).has(c.docId))).length;return `${q} ข้อ · ${k} บัตร`};
  const p=modal(`<p class="mt">🔗 รวมรายวิชา</p>
    <p class="src">ข้อมูลทั้งหมดของวิชาที่ติ๊ก (ข้อสอบ บัตรความรู้ ไฟล์ที่เชื่อมต่อ และโจทย์ในคลังโจทย์กลาง) จะย้ายไปรวมที่วิชาปลายทาง แล้ววิชาที่ติ๊กจะหายจากเมนูของทุกคน</p>
    <label class="lbl" for="mg-t">1. วิชาปลายทาง (วิชาที่จะเหลืออยู่)</label>
    <select class="tx" id="mg-t"><option value="">— เลือกวิชา —</option>${grp('gen','ความรู้ความสามารถทั่วไป')}${grp('spec',SL)}</select>
    <p class="lbl">2. วิชาที่จะรวมเข้าไป</p>
    <input class="tx" type="search" id="mg-q" placeholder="ค้นหาวิชา" aria-label="ค้นหาวิชา">
    <div class="lkchips" id="mg-src">${list.map(s=>`<label class="lkchip" data-mgid="${esc(s.id)}"><input type="checkbox" data-mg="${esc(s.id)}"><span>${esc(s.name)} <small class="src">(${amount(s)})</small></span></label>`).join('')}</div>
    <p class="src" id="mg-sum"></p>`,[{t:'ยกเลิก'},{t:'รวมรายวิชา',cls:'primary'}]);
  const $=id=>document.getElementById(id);
  const upd=()=>{const t=$('mg-t').value;document.querySelectorAll('#mg-src .lkchip').forEach(l=>{const me=l.dataset.mgid===t;l.hidden=me||(!!$('mg-q').value.trim()&&!l.textContent.toLowerCase().includes($('mg-q').value.trim().toLowerCase()));if(me)l.querySelector('input').checked=false});
    const n=[...document.querySelectorAll('#dlg [data-mg]:checked')].map(x=>(SUBJ.find(s=>s.id===x.dataset.mg)||{}).name);
    $('mg-sum').textContent=t&&n.length?`รวม ${n.join(', ')} → ${(SUBJ.find(s=>s.id===t)||{}).name}`:''};
  $('mg-t').onchange=upd;$('mg-q').oninput=upd;document.querySelectorAll('#dlg [data-mg]').forEach(x=>x.onchange=upd);
  if(await p!==1)return;
  const t=$('mg-t').value,src=[...document.querySelectorAll('#dlg [data-mg]:checked')].map(x=>x.dataset.mg).filter(id=>id!==t);
  if(!t||!src.length){toast('เลือกวิชาปลายทางและวิชาที่จะรวมก่อน','bad');return}
  const T=SUBJ.find(s=>s.id===t),names=src.map(id=>(SUBJ.find(s=>s.id===id)||{}).name);
  if(await modal(`<p class="mt">ยืนยันรวมรายวิชา?</p><p><b>${esc(names.join(', '))}</b> → <b>${esc(T.name)}</b></p><p class="src">ข้อมูลไม่ถูกลบ แต่ย้ายไปอยู่ที่ ${esc(T.name)} และวิชาต้นทางจะหายจากเมนูของทุกคน (เปิดกลับได้ที่ คลังกลาง → รายวิชาที่ซ่อนอยู่ แต่ข้อมูลจะยังอยู่ที่วิชาปลายทาง)</p>`,[{t:'ยกเลิก'},{t:'รวมเลย',cls:'primary'}])!==1)return;
  toast('กำลังรวมรายวิชา...');
  try{await mergeSubjects(t,src);toast(`รวม ${names.length} วิชาเข้า “${T.name}” แล้ว`);syncDocSubjects();renderSide();if(typeof QGEN!=='undefined')QGEN.counts=null;if(VIEW==='qgen'&&typeof renderQGen==='function')renderQGen()}
  catch(e){toast('รวมไม่สำเร็จ: '+String(e&&e.code||e&&e.message||e),'bad')}
}
/* ปุ่มดินสอข้างวิชาในเมนูซ้าย */
async function renameSideSubject(id){
  const s=SUBJ.find(x=>x.id===id);if(!s)return;
  if(s.doc){
    const d=DOCS.find(x=>x.id===s.doc);if(!d){toast('ไม่พบเอกสารนี้','bad');return}
    if(await modal(`<p class="mt">แก้ไขชื่อวิชาในเมนู</p><p class="src">ไฟล์: ${esc(d.name)} · ชื่อนี้แสดงเฉพาะเมนูของคุณ (ไฟล์ต้นฉบับไม่เปลี่ยน)</p><label class="lbl" for="srn">ชื่อที่แสดง</label><input class="tx" id="srn" maxlength="60" value="${esc(s.name)}">`,[{t:'ยกเลิก'},{t:'บันทึก',cls:'primary'}])!==1)return;
    const name=((document.getElementById('srn')||{}).value||'').trim();
    if(!name||name===s.name)return;
    if(SUBJ.some(x=>x.id!==id&&x.name===name)){toast('มีวิชาชื่อนี้อยู่แล้ว','bad');return}
    d.label=name;await saveDoc(d);
    if(typeof syncPushMeta==='function')syncPushMeta(d);
    syncDocSubjects();renderSide();if(VIEW==='kb')renderKB();
    toast('เปลี่ยนชื่อวิชาในเมนูแล้ว');
    return;
  }
  if(!isReviewerMe()){toast('เฉพาะผู้ตรวจ/แอดมินเท่านั้นที่เปลี่ยนชื่อวิชานี้ได้','bad');return}
  if(await modal(`<p class="mt">แก้ไขชื่อวิชา</p><p class="src">ชื่อเดิม: ${esc(s.name)} · บัตรความรู้และเอกสารที่ผูกกับวิชานี้จะถูกย้ายตาม</p><label class="lbl" for="srn">ชื่อใหม่</label><input class="tx" id="srn" maxlength="60" value="${esc(s.name)}">`,[{t:'ยกเลิก'},{t:'บันทึก',cls:'primary'}])!==1)return;
  const name=((document.getElementById('srn')||{}).value||'').trim();
  if(!name||name===s.name)return;
  if(SUBJ.some(x=>x.id!==id&&x.name===name)){toast('มีวิชาชื่อนี้อยู่แล้ว','bad');return}
  try{await renameSubject(id,s.name,name)}catch(e){toast('เปลี่ยนชื่อไม่สำเร็จ: '+String(e&&e.code||e&&e.message||e),'bad')}
}
/* ---------- ลบวิชาพร้อมข้อมูลทั้งหมด (ผู้ตรวจ/แอดมิน) จากปุ่ม 🗑 ในเมนู ----------
   ลบบัตรความรู้และข้อสอบที่เป็นหัวข้อนี้ออกจากทุกชุดในคลังกลาง (ชุดที่ไม่เหลืออะไรถูกเอาออกทั้งชุด) และในเครื่องนี้
   แล้วเอาวิชาออกจากเมนูของทุกคน · ไฟล์ต้นฉบับใน Google Drive ไม่ถูกลบ */
async function deleteSubject(id){
  if(String(id).startsWith('doc_'))return deleteDocSubject(id);
  const s=SUBJ.find(x=>x.id===id);if(!s||!isReviewerMe())return;
  const name=s.name,cards=CARDS.filter(c=>c.topic===name),packIds=[...new Set(cards.filter(c=>String(c.docId).startsWith('c_')).map(c=>c.docId.slice(2)))];
  const nq=cards.filter(c=>c.type==='q').length,nk=cards.length-nq;
  const p=modal(`<p class="mt">ลบวิชา ${esc(name)}?</p>
    <p>วิชานี้มีบัตรความรู้ <b>${nk}</b> ใบ และข้อสอบ <b>${nq}</b> ข้อ${packIds.length?` · อยู่ในคลังกลาง ${packIds.length} ชุด`:''}</p>
    <p class="src"><b>ลบแค่รายวิชา</b> = เอาออกจากเมนูของทุกคน แต่เก็บบัตร/ข้อสอบและไฟล์ต้นฉบับไว้ครบ (เปิดกลับได้ที่ คลังกลาง → รายวิชาที่ซ่อนอยู่)<br><b>ลบวิชาและข้อมูล</b> = ลบบัตร/ข้อสอบทั้งหมดในวิชานี้${packIds.length?' รวมในคลังกลาง':''} (กู้คืนไม่ได้)</p>
    <label class="rad"><input type="checkbox" id="sdelok"><span><b>เข้าใจแล้ว ลบข้อมูลถาวร</b><span class="src">ติ๊กเฉพาะเมื่อเลือก ลบวิชาและข้อมูล</span></span></label>`,[{t:'ยกเลิก'},{t:'ลบแค่รายวิชา',cls:'primary'},{t:'ลบวิชาและข้อมูล'}]);
  let ok=false;const cb=document.getElementById('sdelok');if(cb)cb.onchange=()=>{ok=cb.checked};
  const r=await p;if(!r)return;
  if(r===1){
    /* เก็บข้อมูลทั้งหมด: แค่ซ่อนวิชาออกจากเมนู (เปิดกลับได้ใน คลังกลาง → รายวิชาที่ซ่อนอยู่) */
    try{
      if(P.subject===id){P.subject='ineq';save()}
      await saveSubjCfg({add:(SUBJ_CFG.add||[]).slice(),hide:[...new Set([...(SUBJ_CFG.hide||[]),id])],rename:SUBJ_CFG.rename||{},alias:SUBJ_CFG.alias||{}});
    }catch(e){toast('ซ่อนวิชาไม่สำเร็จ: '+String(e&&e.code||e&&e.message||e),'bad')}
    return;
  }
  if(!ok){toast('ยังไม่ได้ติ๊ก เข้าใจแล้ว จึงยังไม่ลบข้อมูล','bad');return}
  toast(`กำลังลบวิชา ${name}...`);
  try{
    const f=await fb();
    for(const pid of packIds){
      const snap=await f.fs.getDoc(fsDoc('kb',pid));if(!snap.exists())continue;
      const left=(snap.data().cards||[]).filter(c=>c.topic!==name);
      if(!left.length)await removePack(pid);
      else await f.fs.updateDoc(fsDoc('kb',pid),{cards:left,count:left.length,figIds:[...new Set(left.flatMap(c=>c.figs||[]))],updatedAt:f.fs.serverTimestamp()});
    }
    const ids=cards.map(c=>c.id),touched=[...new Set(cards.filter(c=>!String(c.docId).startsWith('c_')).map(c=>c.docId))];
    CARDS=CARDS.filter(c=>c.topic!==name);try{await kbDelMany('cards',ids)}catch(e){}
    for(const did of touched){const dd=DOCS.find(x=>x.id===did);if(!dd)continue;
      const rm=new Set(cards.filter(c=>c.docId===did).map(c=>c.id));
      dd.delCards=[...new Set([...(dd.delCards||[]),...rm])].slice(-1000);await saveDoc(dd);
      if(typeof syncPushMeta==='function')syncPushMeta(dd);
      if(typeof syncPushCards==='function')syncPushCards(dd,true);
    }
    for(const d of DOCS)if(Array.isArray(d.subs)&&d.subs.includes(name)){d.subs=d.subs.filter(x=>x!==name);await saveDoc(d);if(typeof syncPushMeta==='function')syncPushMeta(d)}
    const custom=(SUBJ_CFG.add||[]).some(a=>a.id===id);
    await saveSubjCfg({add:(SUBJ_CFG.add||[]).filter(a=>a.id!==id),hide:custom?(SUBJ_CFG.hide||[]).filter(x=>x!==id):[...new Set([...(SUBJ_CFG.hide||[]),id])]});
  }catch(e){toast('ลบไม่สำเร็จ: '+String(e&&e.code||e&&e.message||e),'bad')}
}
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-sdelside]');if(!b)return;e.preventDefault();e.stopPropagation();deleteSubject(b.dataset.sdelside)},true);
document.addEventListener('keydown',e=>{const b=e.target.closest&&e.target.closest('[data-sdelside]');if(!b||(e.key!=='Enter'&&e.key!==' '))return;e.preventDefault();e.stopPropagation();deleteSubject(b.dataset.sdelside)},true);
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-srenameside]');if(!b)return;e.preventDefault();e.stopPropagation();renameSideSubject(b.dataset.srenameside)},true);
document.addEventListener('keydown',e=>{const b=e.target.closest&&e.target.closest('[data-srenameside]');if(!b||(e.key!=='Enter'&&e.key!==' '))return;e.preventDefault();e.stopPropagation();renameSideSubject(b.dataset.srenameside)},true);
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
  const f=await fb();const next={add:cfg.add,hide:cfg.hide,rename:SUBJ_CFG.rename||{},alias:SUBJ_CFG.alias||{}};
  await f.fs.setDoc(fsDoc('config','subjects'),{...next,updatedAt:f.fs.serverTimestamp(),by:ME.name});
  /* อัปเดตเมนูทันที ไม่ต้องรีโหลดหน้า (งานที่กำลังประมวลผลอยู่ไม่ถูกตัดกลางคัน) */
  SUBJ_PENDING=next;SUBJ_CHECKED=Date.now();applySubjectCfg(true,true);
  toast(`เพิ่มวิชา "${doc.topic}" แล้ว (มีข้อมูล ${n} รายการ) · อยู่ในเมนูซ้ายแล้ว`);
}
