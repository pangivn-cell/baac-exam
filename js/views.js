/* views.js — คะแนน อันดับ หน้าต้อนรับ หน้าแรก สอบถาม AI เมนูมือถือ และเริ่มระบบ (ต้องโหลดเป็นไฟล์สุดท้าย) */
/* แสดงเวอร์ชันให้ตรวจได้ง่าย: เมนูซ้าย (คอม) และมุมล่างขวา (มือถือ) */
try{const _v=document.getElementById('ver'),_b=document.getElementById('vbadge');if(_v)_v.textContent='เวอร์ชัน '+BUILD;if(_b)_b.textContent='v'+BUILD}catch(e){}
/* ---------- คะแนน · ระดับผู้สอบ (ไม่จำกัด) · แรงกิ้ง ---------- */
const lvlFromPts=p=>levelInfo(p).lv;
function periodKeys(d=new Date()){
  const t=new Date(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate())),day=t.getUTCDay()||7;t.setUTCDate(t.getUTCDate()+4-day);
  const ys=new Date(Date.UTC(t.getUTCFullYear(),0,1)),wk=Math.ceil(((t-ys)/864e5+1)/7);
  return{all:'all',week:`w${t.getUTCFullYear()}-${String(wk).padStart(2,'0')}`,month:`m${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`};
}
/* ทำชุดผ่าน = 1 คะแนน ส่งขึ้นอันดับ (rank2) ครั้งละไม่เกิน 5 */
function awardPass(){P.pass=(P.pass||0)+1;P.unsyncedPass=(P.unsyncedPass||0)+1;save();renderAcct();flushPoints()}
async function flushPoints(){
  if(!ME||!(P.unsyncedPass>0)||flushPoints.busy)return;flushPoints.busy=true;
  try{const f=await fb(),K=periodKeys();
    while(P.unsyncedPass>0){const chunk=Math.min(5,P.unsyncedPass);
      for(const per of [K.all,K.week,K.month])
        await f.fs.setDoc(fsDoc('rank2',per,'u',ME.uid),{name:ME.name,pass:f.fs.increment(chunk),rounds:f.fs.increment(chunk),lvl:myLevel(),updatedAt:f.fs.serverTimestamp()},{merge:true});
      P.unsyncedPass-=chunk;save();}
  }catch(e){console.warn('rank',e&&e.code||e)}finally{flushPoints.busy=false}
}
async function loadMyPoints(){
  if(!ME)return;try{const f=await fb(),s=await f.fs.getDoc(fsDoc('rank2','all','u',ME.uid));
    if(s.exists()){const cp=s.data().pass||0;if(cp+(P.unsyncedPass||0)>(P.pass||0)){P.pass=cp+(P.unsyncedPass||0);save()}}renderAcct();if(VIEW==='home')renderHome()}catch(e){}
}
var RK={tab:'week'};
async function renderRank(){
  if(VIEW!=='rank')return;
  head('อันดับผู้สอบ',`ทำชุดข้อสอบผ่าน (ได้ ${Math.round(PASS_PCT*100)}% ขึ้นไป) = 1 คะแนน · เริ่มที่ระดับ 1 · ช่วงคะแนนแรก 5 แล้วช่วงถัดไปเพิ่ม 1.5 เท่า (ระดับ 2 = 13, ระดับ 3 = 24, ระดับ 4 = 41 คะแนน …) ไม่จำกัดระดับ`);
  const el=document.getElementById('sheet'),K=periodKeys(),per={week:K.week,month:K.month,all:K.all}[RK.tab];
  const tab=(v,t)=>`<button data-rk="${v}" aria-pressed="${RK.tab===v}">${t}</button>`;
  el.innerHTML=`<div class="seg" role="group" style="grid-template-columns:repeat(3,1fr)">${tab('week','สัปดาห์นี้')}${tab('month','เดือนนี้')}${tab('all','ตลอดกาล')}</div>
    <div class="tiles"><div class="tile">คะแนนสะสมของฉัน<b>${nf(P.pass||0)}</b></div><div class="tile">ระดับผู้สอบ<b>${myLevel()}</b></div><div class="tile">อีกกี่คะแนนขึ้นระดับ<b>${nf(levelInfo(P.pass).left)}</b></div></div>
    ${ME?'':'<p class="catnote warn">ยังไม่ได้เข้าสู่ระบบ คะแนนเก็บไว้ในเครื่องนี้ก่อน เข้าสู่ระบบแล้วคะแนนจะขึ้นอันดับให้อัตโนมัติ</p>'}
    <div id="rkbody"><div class="state"><div class="spin"></div></div></div>`;
  el.querySelectorAll('[data-rk]').forEach(b=>b.onclick=()=>{RK.tab=b.dataset.rk;renderRank()});
  const body=document.getElementById('rkbody');
  try{const f=await fb();await flushPoints();
    const snap=await f.fs.getDocs(f.fs.query(f.fs.collection(f.db,'rank2',per,'u'),f.fs.orderBy('pass','desc'),f.fs.limit(10)));
    const rows=snap.docs.map((s,i)=>({i:i+1,uid:s.id,...s.data()}));let mine=rows.find(r=>ME&&r.uid===ME.uid);
    if(ME&&!mine){const s=await f.fs.getDoc(fsDoc('rank2',per,'u',ME.uid));if(s.exists())mine={i:'-',uid:ME.uid,...s.data(),out:true}}
    const medal=i=>i===1?'🥇':i===2?'🥈':i===3?'🥉':i;
    body.innerHTML=rows.length?`<div class="hlist">${rows.map(r=>`<div class="hrow rk${ME&&r.uid===ME.uid?' me':''}"><div class="rkn">${medal(r.i)}</div><div class="t"><b>${esc(r.name||'ผู้สอบ')}</b><span class="src">ระดับผู้สอบ ${r.lvl||1}</span></div><div class="hp">${nf(r.pass||0)}<small>คะแนน</small></div></div>`).join('')}
      ${mine&&mine.out?`<p class="src" style="text-align:center">…</p><div class="hrow rk me"><div class="rkn">-</div><div class="t"><b>${esc(mine.name)} (ฉัน)</b><span class="src">ยังไม่ติด 10 อันดับแรก</span></div><div class="hp">${nf(mine.pass||0)}<small>คะแนน</small></div></div>`:''}</div>`
      :'<p class="src" style="text-align:center">ยังไม่มีใครเก็บคะแนนในช่วงนี้ เริ่มทำข้อสอบเพื่อขึ้นอันดับแรก</p>';
  }catch(e){body.innerHTML='<p class="kerr">โหลดอันดับไม่ได้ ตรวจอินเทอร์เน็ต</p>'}
}
async function renameMe(){
  if(!ME)return;
  if(await modal(`<p class="mt">ชื่อที่แสดงในอันดับ</p><input class="tx" id="nm" maxlength="40" value="${esc(ME.name)}">`,[{t:'ยกเลิก'},{t:'บันทึก',cls:'primary'}])!==1)return;
  const v=document.getElementById('nm').value.trim().slice(0,40);if(!v)return;
  try{const f=await fb();await f.fs.updateDoc(fsDoc('users',ME.uid),{name:v});ME.name=v;const K=periodKeys();
    for(const per of [K.all,K.week,K.month])await f.fs.setDoc(fsDoc('rank2',per,'u',ME.uid),{name:v},{merge:true}).catch(()=>{});
    renderAcct();toast('เปลี่ยนชื่อแล้ว')}catch(e){toast('เปลี่ยนชื่อไม่สำเร็จ','bad')}
}

/* ---------- หน้าต้อนรับ (ก่อนล็อกอิน) · หน้าแรก (เมนูหลัก) ---------- */
var SPEC_LABEL='ความรู้เฉพาะตำแหน่งงานสินเชื่อ';
let welcomeSkip=false;try{welcomeSkip=sessionStorage.getItem('exam-onboard-skip')==='1'}catch(e){}
function onboard(){
  if(inViewer)return;
  if(!ME&&!welcomeSkip&&CLOUD.ok!==false&&(VIEW==='home'||VIEW==='welcome'))setView('welcome');
  else if(ME&&VIEW==='welcome')setView('home');
}
function renderWelcome(){
  if(VIEW!=='welcome')return;
  head('ยินดีต้อนรับ','');
  const el=document.getElementById('sheet'),key=!!activeAI();
  el.innerHTML=`<div class="wel">
    <div class="hero"><p class="hk">เตรียมสอบเข้าทำงาน ธ.ก.ส.</p><h2>ซ้อมสอบให้พร้อม ด้วยโจทย์ใหม่ทุกชุด<br>และคลังความรู้ที่ทุกคนช่วยกันสร้าง</h2>
      <p>ความรู้ความสามารถทั่วไป 9 วิชา · ${SPEC_LABEL} 12 หัวข้อ · สอบจริงจับเวลา · ถาม AI ได้ทุกเรื่อง</p></div>
    <div class="wfeat">
      <div><b>📝 ทดสอบรายวิชา</b><span>ความยากปรับตามผล ยิ่งทำถูกยิ่งยาก ระดับไม่มีเพดาน</span></div>
      <div><b>⏱ สอบจริง</b><span>จับเวลา ส่งอัตโนมัติ มีระบบกันโกงเหมือนห้องสอบ</span></div>
      <div><b>💬 สอบถาม AI</b><span>ถามได้แบบ Google แต่ตรวจจากคลังความรู้ก่อนเสมอ</span></div>
      <div><b>📤 คลังความรู้กลาง</b><span>อัปโหลดเอกสาร AI ย่อยเป็นข้อสอบให้ทุกคนใช้</span></div>
    </div>
    <p class="wlead">ก่อนเริ่ม ตั้งค่า 2 อย่าง ใช้เวลาไม่ถึง 3 นาที</p>
    <div class="wstep ${ME?'ok':''}"><div class="wn">${ME?'✓':'1'}</div><div class="wb">
      <h3>เข้าสู่ระบบ ${ME?`<span class="tag">เรียบร้อย · ${esc(ME.name)}</span>`:''}</h3>
      <p class="why">ทำไมต้องเข้าสู่ระบบ</p>
      <ul><li><b>เก็บคะแนนและระดับไว้กับบัญชี</b> เปลี่ยนเครื่องหรือมือถือก็ไม่หาย</li>
        <li><b>ขึ้นอันดับ</b> แข่งกับเพื่อนรายสัปดาห์ รายเดือน</li>
        <li><b>ช่วยเพิ่มข้อมูลเข้าคลังกลาง</b> และรายงานเฉลยที่ผิด ให้ทุกคนได้ข้อมูลที่ถูกต้อง</li></ul>
      <p class="src">ใช้บัญชี Google ได้เลย ระบบเก็บแค่ชื่อและอีเมล ไม่เห็นรหัสผ่านของคุณ</p>
      ${ME?'':'<div class="btnrow" style="justify-content:flex-start"><button class="loginbig" id="wg">เข้าสู่ระบบด้วย Google</button><button class="ghost" id="wm">ใช้อีเมลแทน</button></div>'}
    </div></div>
    <div class="wstep ${key?'ok':''}"><div class="wn">${key?'✓':'2'}</div><div class="wb">
      <h3>ใส่ AI key ${key?`<span class="tag">เรียบร้อย · ${AINAME[activeAI()]}</span>`:''}</h3>
      <p class="why">ทำไมต้องใส่ key</p>
      <ul><li><b>ให้ AI สร้างโจทย์ใหม่ไม่ซ้ำ</b> ทั้งภาษาไทย อังกฤษ และ${SPEC_LABEL}ทุกหัวข้อ</li>
        <li><b>ถาม AI ได้ทุกเรื่อง</b> อธิบายเฉลยทีละขั้น ถามแย้งได้</li>
        <li><b>ให้ AI อ่านเอกสารที่อัปโหลด</b> แล้วแปลงเป็นบัตรความรู้และข้อสอบ</li></ul>
      <p class="src">Gemini ของ Google ใช้ฟรี (มีโควตาต่อวัน) · key เก็บไว้ในเครื่องของคุณเท่านั้น ไม่ส่งให้ระบบหรือคนอื่น · ถ้ามีค่าใช้จ่ายจะคิดกับบัญชีของ key นั้น</p>
      ${key?'':`<ol class="howk"><li>เปิด <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener">aistudio.google.com/apikey</a> แล้วล็อกอิน Google</li><li>กด <b>Create API key</b> แล้วคัดลอก (ขึ้นต้นด้วย AIza)</li><li>วางในช่องด้านล่าง แล้วกด บันทึก</li></ol>
        <div class="wkey"><input class="tx" id="wkey" type="password" autocomplete="off" placeholder="วาง Gemini API key ที่นี่ (AIza...)"><button class="primary" id="wks">บันทึก</button></div><p class="src" id="wkst"></p>`}
    </div></div>
    <div class="wgo"><button class="primary big" id="wgo">${ME&&key?'เริ่มใช้งาน →':'เข้าสู่หน้าแรก →'}</button>${ME&&key?'':'<p class="src">ข้ามไปก่อนก็ได้ วิชาที่ระบบสร้างโจทย์เองและข้อสอบในคลังกลางใช้ได้ทันที</p>'}</div>
  </div>`;
  const $=id=>document.getElementById(id);
  if($('wg'))$('wg').onclick=async()=>{const f=await fb().catch(()=>null);if(!f)return;try{await f.au.signInWithPopup(f.auth,new f.au.GoogleAuthProvider());toast('เข้าสู่ระบบแล้ว')}catch(e){const c=String(e&&e.code||'');toast(c.includes('popup-blocked')?'เบราว์เซอร์บล็อกหน้าต่างล็อกอิน กดอนุญาตป๊อปอัปแล้วลองใหม่':'เข้าสู่ระบบไม่สำเร็จ','bad')}};
  if($('wm'))$('wm').onclick=()=>loginDialog();
  if($('wks'))$('wks').onclick=async()=>{const k=$('wkey').value.trim();if(!/^AIza/.test(k)){$('wkst').textContent='key ของ Gemini ต้องขึ้นต้นด้วย AIza';return}
    AIP.gemini.key=k;if(AIP.provider==='openai')AIP.provider='auto';saveAI();renderAISet();aiChanged();$('wkst').textContent='กำลังทดสอบ key...';
    try{await aiText('ตอบกลับคำว่า พร้อม เพียงคำเดียว');toast('ใช้ AI ได้แล้ว');renderWelcome()}catch(e){$('wkst').textContent=errCopy(e&&e.code,'ทดสอบ')}};
  $('wgo').onclick=()=>{welcomeSkip=true;try{sessionStorage.setItem('exam-onboard-skip','1')}catch(e){}setView('home')};
}
let HOME_PICK=false;
function aiTag(s){return s&&s.ai?`<span class="aitag" title="วิชานี้ใช้ AI สร้างโจทย์ ต้องใส่ AI key" aria-label="ใช้ AI">AI</span>`:''}
function subjBtns(list){return list.map(s=>`<button class="hsub" data-hs="${s.id}"><span class="hsn">${esc(s.name)}${aiTag(s)}</span></button>`).join('')}
function renderHome(){
  if(VIEW!=='home')return;
  const last=SUBJ.find(s=>s.id===P.subject);
  head(ME?`สวัสดี ${ME.name}`:'หน้าแรก',ME?`ระดับผู้สอบ ${myLevel()} · ${nf(P.pass||0)} คะแนน · อีก ${levelInfo(P.pass).left} คะแนนขึ้นระดับ ${myLevel()+1}`:'เลือกสิ่งที่อยากทำ');
  const el=document.getElementById('sheet'),gen=SUBJ.filter(s=>s.group==='gen'),spec=SUBJ.filter(s=>s.group==='spec');
  el.innerHTML=`${!activeAI()?`<div class="hban"><b>ยังไม่ได้ใส่ AI key</b><span>วิชาภาษาไทย อังกฤษ ${SPEC_LABEL} และการถาม AI ต้องใช้ key (Gemini ใช้ฟรี)</span><button class="ghost" id="hkey">ตั้งค่าตอนนี้</button></div>`:''}
    ${!ME&&CLOUD.ok!==false?`<div class="hban"><b>ยังไม่ได้เข้าสู่ระบบ</b><span>คะแนนจะเก็บแค่ในเครื่องนี้ และยังไม่ขึ้นอันดับ</span><button class="ghost" id="hlog">เข้าสู่ระบบ</button></div>`:''}
    <div class="hgrid">
      <button class="hcard main" id="hc-sub" aria-expanded="${HOME_PICK}"><span class="hi">📝</span><b>ทดสอบรายวิชา</b><span>เลือกวิชา ระบบสร้างโจทย์ตามระดับของคุณ</span></button>
      <button class="hcard" data-go="mock"><span class="hi">⏱</span><b>สอบจริง</b><span>จับเวลาเหมือนห้องสอบ</span></button>
      <button class="hcard" data-go="study"><span class="hi">💬</span><b>สอบถาม AI</b><span>ถามได้ทุกเรื่อง ตรวจจากคลังก่อน</span></button>
      <button class="hcard" data-go="kb"><span class="hi">📤</span><b>อัปเดตความรู้</b><span>อัปโหลดเอกสารเข้าคลังกลาง</span></button>
      <button class="hcard sm" data-go="rank"><span class="hi">🏆</span><b>อันดับ</b></button>
      <button class="hcard sm" data-go="hist"><span class="hi">🕘</span><b>ประวัติสอบ</b></button>
    </div>
    <div class="hpick" id="hpick" ${HOME_PICK?'':'hidden'}>
      <div class="hopt"><label for="hcount">จำนวนข้อ</label><select id="hcount">${[5,10,20,50,100].map(v=>`<option value="${v}"${P.count===v?' selected':''}>${v} ข้อ</option>`).join('')}</select>
        <span class="fl">การเฉลย</span><div class="seg" role="group"><button data-hm="now" aria-pressed="${P.mode==='now'}">ทันที</button><button data-hm="end" aria-pressed="${P.mode==='end'}">ตอนท้าย</button></div></div>
      ${last?`<button class="primary" id="hlast">ทำต่อ: ${esc(last.name)}</button>`:''}
      <p class="src">ป้าย <span class="aitag">AI</span> = วิชาที่ใช้ AI สร้างโจทย์ ต้องใส่ AI key ก่อน · วิชาที่ไม่มีป้าย ระบบสร้างโจทย์เองได้ทันที</p>
      <p class="lbl">ความรู้ความสามารถทั่วไป</p><div class="hsubs">${subjBtns(gen)}</div>
      <p class="lbl">${SPEC_LABEL}</p><input class="tx" type="search" id="hq" placeholder="ค้นหาหัวข้อ เช่น หนี้, PDPA" aria-label="ค้นหาหัวข้อ"><div class="hsubs" id="hspec">${subjBtns(spec)}</div>
    </div>`;
  const $=id=>document.getElementById(id);
  if($('hkey'))$('hkey').onclick=()=>{welcomeSkip=false;setView('welcome')};
  if($('hlog'))$('hlog').onclick=()=>loginDialog();
  $('hc-sub').onclick=()=>{HOME_PICK=!HOME_PICK;renderHome();if(HOME_PICK)$('hpick').scrollIntoView({behavior:'smooth',block:'start'})};
  el.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>setView(b.dataset.go));
  const go=id=>{P.subject=id;if(SUBJ.find(s=>s.id===id).group==='spec')P.lastSpec=id;save();setView('practice');renderSide();start(true)};
  el.querySelectorAll('[data-hs]').forEach(b=>b.onclick=()=>go(b.dataset.hs));
  if($('hlast'))$('hlast').onclick=()=>go(last.id);
  if($('hcount'))$('hcount').onchange=e=>{P.count=+e.target.value;save()};
  el.querySelectorAll('[data-hm]').forEach(b=>b.onclick=()=>{P.mode=b.dataset.hm;save();renderHome()});
  if($('hq'))$('hq').oninput=e=>{const q=e.target.value.trim().toLowerCase();$('hspec').querySelectorAll('[data-hs]').forEach(b=>{const s=SUBJ.find(x=>x.id===b.dataset.hs);b.hidden=!!q&&!(s.name+' '+s.desc+' '+(s.kw||[]).join(' ')).toLowerCase().includes(q)})};
}

/* ---------- สอบถาม AI: ตอบแบบ Google แต่ตรวจจากคลังความรู้ก่อน แล้วอ้างอิงที่มา ---------- */
var STU={q:'',src:[],turns:[],answer:'',busy:false,ctl:null,open:false};
const STOPW=['มีอะไรบ้าง','มีอะรัยบ้าง','มีอะไร','มีอะรัย','คืออะไร','คืออะรัย','หมายถึงอะไร','หมายถึง','อย่างไร','ยังไง','ยังงัย','อะไรบ้าง','อะรัยบ้าง','อะไร','อะรัย','อะไล','อาราย','คือ','ไหม','มั้ย','บ้าง','ครับ','ค่ะ','คะ','หน่อย','ช่วย','อธิบาย','เกี่ยวกับ','เรื่อง'];
function qTokens(q){
  let t=q.toLowerCase().replace(/[?？!.,()"'“”]/g,' ');
  return [...new Set(t.split(/\s+/).map(w=>{let x=w;for(let k=0;k<3;k++)for(const s of STOPW){if(x.endsWith(s)&&x.length>s.length)x=x.slice(0,-s.length);if(x.startsWith(s)&&x.length>s.length)x=x.slice(s.length)}return x}).filter(w=>w.length>=2&&!STOPW.includes(w)))];
}
/* ค้นแบบไม่สนเว้นวรรค/ตัวพิมพ์ และยอมให้สะกดผิดเล็กน้อย เช่น Marketcondut → Market Conduct */
const nz=x=>String(x||'').toLowerCase().replace(/[\s\-_.]+/g,'');
function editDist(a,b,max){
  if(Math.abs(a.length-b.length)>max)return max+1;let prev=[...Array(b.length+1).keys()];
  for(let i=1;i<=a.length;i++){const cur=[i];let lo=i;
    for(let j=1;j<=b.length;j++){cur[j]=Math.min(prev[j]+1,cur[j-1]+1,prev[j-1]+(a[i-1]===b[j-1]?0:1));lo=Math.min(lo,cur[j])}
    if(lo>max)return max+1;prev=cur}
  return prev[b.length];
}
function fuzzyEq(tok,term){const a=nz(tok),b=nz(term);if(a.length<3||b.length<3)return a===b;
  if(a===b||(a.length>=4&&b.includes(a))||(b.length>=4&&a.includes(b)))return true;
  return editDist(a,b,a.length>=8?2:a.length>=5?1:0)<=(a.length>=8?2:a.length>=5?1:0)}
/* หาว่าคำค้นตรงกับวิชา/หัวข้อไหน แล้วเติมคำที่ถูกต้องเข้าไปค้นด้วย */
function expandQuery(toks){
  const topics=new Set(),extra=new Set();
  for(const [,name,,kw] of SPEC)for(const term of [name,...kw])if(toks.some(t=>fuzzyEq(t,term))){topics.add(name);extra.add(name);break}
  for(const n of GEN_TOPICS)if(toks.some(t=>fuzzyEq(t,n)))topics.add(n);
  /* คำในการ์ดเอง (ชื่อเรื่อง/หัวข้อ) ที่สะกดใกล้กับคำค้น */
  const words=new Set();for(const c of CARDS)for(const w of String((c.title||'')+' '+(c.topic||'')).split(/[\s,()/]+/))if(/[a-z]/i.test(w)&&w.length>=4)words.add(w);
  for(const t of toks)if(/[a-z]/i.test(t)&&t.length>=5)for(const w of words)if(nz(w)!==nz(t)&&fuzzyEq(t,w))extra.add(w);
  return{topics,extra:[...extra]};
}
async function askSearch(q,more){
  const toks=[...new Set([...qTokens(q),...(more||[]).map(x=>x.toLowerCase())])],all=[...activeCards(),...bankItems()];if(!toks.length)return[];
  const {topics,extra}=expandQuery(toks),terms=[...new Set([...toks,...extra.map(x=>x.toLowerCase())])].map(nz).filter(w=>w.length>=2);
  const qn=nz(q+' '+(more||[]).join(' ')),fx=[...new Map(extra.filter(x=>!qn.includes(nz(x))).map(x=>[nz(x),x])).values()];
  STU.fixed=fx.filter(x=>!fx.some(y=>y!==x&&nz(y).includes(nz(x))));
  const sc=all.map(c=>{const t=nz(c.title),f=nz(c.fact+' '+(c.type==='q'?c.q.stem:''));let s=0;
    for(const w of terms){if(t.includes(w))s+=4;s+=Math.min(6,countHits(f,[w]))*1.5}
    if(topics.has(c.topic))s+=s>0?3:3+(c.imp||2)*.3;if(c.type==='q')s*=.7;return{c,s}}).filter(x=>x.s>=3).sort((a,b)=>b.s-a.s);
  const res=sc.slice(0,12).map(x=>x.c);
  if(canEmbed()){try{for(const c of await searchCards([...toks,...extra].join(' '),8))if(!res.includes(c))res.push(c)}catch(e){}}
  return res.slice(0,14);
}
/* ถ้ายังไม่เจออะไร ให้ AI แก้คำผิดแล้วค้นอีกรอบ */
async function askSearchAI(q){
  let res=await askSearch(q);if(res.length||!activeAI())return res;
  try{const names=SPEC.map(x=>x[1]).concat(GEN_TOPICS).join(', ');
    const r=await aiJSON(`คำค้นนี้อาจพิมพ์ผิดหรือสะกดไม่ตรง: "${q}"
แก้คำผิดแล้วแยกคำสำคัญสำหรับค้นในคลังความรู้เรื่องการสอบงานสินเชื่อ ธ.ก.ส. (หัวข้อที่มี: ${names})
ตอบเป็น JSON เท่านั้น: {"fixed":"คำค้นที่แก้แล้ว","keywords":["คำสำคัญ ทั้งไทยและอังกฤษถ้ามี ไม่เกิน 6 คำ"]}`);
    const kw=[...(r.keywords||[]),r.fixed||''].filter(Boolean).map(String);
    if(kw.length){res=await askSearch(r.fixed||q,kw);if(res.length&&r.fixed)STU.fixed=[r.fixed]}
  }catch(e){}
  return res;
}
/* markdown subset → safe HTML (escape first, then headings / bullets / bold) */
function mdLite(t){
  const L=esc(t).split('\n'),out=[];let list=null;
  const close=()=>{if(list){out.push(`</${list}>`);list=null}};
  const inl=s=>s.replace(/\*\*(.+?)\*\*/g,'<b>$1</b>').replace(/\[([^\]]{1,120})\]/g,'<span class="cref">[$1]</span>');
  for(const raw of L){const l=raw.trim();
    if(!l){close();continue}
    let m;
    if((m=l.match(/^#{1,4}\s+(.*)/))){close();out.push(`<h4>${inl(m[1])}</h4>`);continue}
    if((m=l.match(/^[-*•]\s+(.*)/))){if(list!=='ul'){close();out.push('<ul>');list='ul'}out.push(`<li>${inl(m[1])}</li>`);continue}
    if((m=l.match(/^(\d+)[.)]\s+(.*)/))){if(list!=='ol'){close();out.push('<ol>');list='ol'}out.push(`<li>${inl(m[2])}</li>`);continue}
    close();out.push(/^อ้างอิง/.test(l)?`<p class="aref">${inl(l)}</p>`:`<p>${inl(l)}</p>`);
  }
  close();return out.join('');
}
function askRules(){
  const src=STU.src.slice(0,10);
  return `คุณคือติวเตอร์ผู้เชี่ยวชาญเตรียมสอบเข้าทำงานธนาคารเพื่อการเกษตรและสหกรณ์การเกษตร (ธ.ก.ส.) ตำแหน่งงานสินเชื่อ
ผู้เรียนถามว่า: "${STU.q}"
${src.length?`ข้อมูลที่ระบบค้นได้จากคลังความรู้ (แต่ละรายการมีป้ายที่มาในวงเล็บเหลี่ยม):\n${src.map(c=>`[${cardCite(c)||c.topic}${upBy(c)?` · อัปโหลดโดย ${upBy(c)}`:''}] ${c.type==='q'?`ข้อสอบ: ${c.q.stem} | ตัวเลือก: ${c.q.choices.join(' / ')} | ตอบ: ${c.q.choices[c.q.answer]}`:`${c.title}: ${c.fact}`}`).join('\n')}`:'คลังความรู้ไม่มีข้อมูลที่ตรงกับคำถามนี้'}

วิธีตอบ (ให้ได้แบบสรุปของ Google ที่อ่านแล้วเข้าใจทันที):
- ตรวจข้อมูลจากคลังก่อน ใช้เฉพาะรายการที่เกี่ยวข้องกับคำถามจริงๆ รายการที่ไม่เกี่ยวให้ข้ามไป
- ถ้าคลังมีไม่พอ ให้เติมจากความรู้ทั่วไปที่ถูกต้อง โดยตีความในบริบทงานสินเชื่อและการสอบ ธ.ก.ส. ก่อน (เช่น 7C คือหลักพิจารณาสินเชื่อ) แล้วค่อยบอกความหมายอื่นสั้นๆ ถ้ามี และระบุท้ายประโยคว่า (ความรู้ทั่วไป)
- โครงสร้าง: บรรทัดแรกเป็นคำตอบสั้น 1–2 ประโยค · หัวข้อย่อยขึ้นต้นด้วย ## · รายการขึ้นต้นด้วย - · คำสำคัญใช้ **ตัวหนา** · มีตัวอย่างหรือกรณีลูกค้าสั้นๆ ถ้าช่วยให้เข้าใจ · ปิดด้วยหัวข้อ ## จุดที่มักออกสอบ 2–4 ข้อ
- เขียนให้คนที่ไม่เคยเรียนเรื่องนี้เข้าใจ ขยายคำย่อ อธิบายศัพท์ ห้ามคัดลอกข้อความในคลังที่อ่านยากมาตรงๆ ให้เรียบเรียงใหม่
- บรรทัดสุดท้ายเขียน "อ้างอิง:" ตามด้วยป้ายในวงเล็บเหลี่ยมของรายการจากคลังที่ใช้จริง ถ้าไม่ได้ใช้คลังเลยให้เขียน "อ้างอิง: ความรู้ทั่วไป (ไม่มีในคลังความรู้)"
- ห้ามแต่งตัวเลข อัตรา หรือระเบียบเฉพาะที่ไม่แน่ใจ ภาษาไทยทั้งหมด`;
}
async function askAI(text,first){
  if(!activeAI()||STU.busy)return;
  const box=document.getElementById('aians'),th=document.getElementById('athread');
  let target;
  if(first){STU.turns=[];STU.answer='';box.hidden=false;target=box.querySelector('.abody');target.innerHTML='<p class="msg wait">กำลังค้นในคลังและเรียบเรียงคำตอบ...</p>'}
  else{const me=document.createElement('div');me.className='msg me';me.textContent=text;th.append(me);target=document.createElement('div');target.className='abody msg ai';target.innerHTML='<p class="wait">กำลังคิด...</p>';th.append(target)}
  STU.turns.push({role:'user',content:first?'ตอบคำถามข้างบน':text});STU.busy=true;STU.ctl=new AbortController();
  try{
    let firstTurn=askRules();
    if(canVision()){const ids=STU.src.flatMap(c=>c.figs||[]).filter(id=>hasFig(id)&&!junkFig(id)).slice(0,3),imgs=[];for(const id of ids){const im=await figForAI(id);if(im)imgs.push(im)}
      if(imgs.length)firstTurn={text:firstTurn+'\n\nภาพที่แนบคือรูปประกอบจากคลังความรู้ที่เกี่ยวข้อง',images:imgs}}
    const t=await aiText([{role:'user',content:firstTurn},...STU.turns.slice(-8)],{signal:STU.ctl.signal,onText:({text})=>{target.innerHTML=mdLite(text)}});
    target.innerHTML=mdLite(t);STU.turns.push({role:'assistant',content:t});if(first)STU.answer=t;
  }catch(e){STU.turns.pop();if(!(e&&e.code==='cancelled'))target.innerHTML=`<p class="kerr">${esc(errCopy(e&&e.code,'ถาม'))}</p>`}
  finally{STU.busy=false;STU.ctl=null}
}
function srcHTML(c,i){
  const d=docOf(c),figs=(c.figs||[]).filter(id=>hasFig(id)&&!junkFig(id));
  const body=c.type==='q'?`<p style="white-space:pre-wrap"><b>${esc(c.q.stem)}</b></p><ol class="kq">${c.q.choices.map(x=>`<li>${esc(x)}</li>`).join('')}</ol><details><summary>ดูเฉลย</summary><p class="ok">ตอบ ${TH[c.q.answer]}. ${esc(c.q.choices[c.q.answer])}</p></details>`
    :`<p><b>${esc(c.title)}</b></p><p>${esc(c.fact)}</p>`;
  return `<div class="kc"><p class="src">${c.type==='q'?'ข้อสอบตัวอย่าง':esc(c.kind)} · ${esc(c.topic)}${d?` · ${esc(cardCite(c))} · อัปโหลดโดย ${esc(upBy(c))}`:''}</p>${body}${figs.map(id=>figHTML(id,'kthumb')).join('')}
    ${d?srcBtn({card:c.id}):''}${activeAI()?`<div><button class="ghost" data-exp="${i}">✨ ให้ AI อธิบายเรื่องนี้ให้ละเอียด</button></div>`:''}</div>`;
}
function renderStudy(){
  if(VIEW!=='study')return;
  head('สอบถาม AI','ถามได้ทุกเรื่องเหมือนค้นใน Google · AI ตรวจจากคลังความรู้ก่อน แล้วบอกที่มาทุกครั้ง');
  const el=document.getElementById('sheet'),ai=!!activeAI(),cnt={};for(const c of activeCards())cnt[c.topic]=(cnt[c.topic]||0)+1;
  const sug=['7C คืออะไร','NPL คืออะไร','PDPA ต้องขอความยินยอมเมื่อไร','จัดชั้นหนี้มีกี่ชั้น','5C ต่างจาก 7C อย่างไร','ผลต่างชั้นที่สองในอนุกรม'];
  el.innerHTML=`<form class="ask1" id="askf"><input class="tx" id="askq" type="search" placeholder="พิมพ์คำถาม เช่น 7C คืออะไร" value="${esc(STU.q)}" aria-label="คำถาม" autocomplete="off"><button class="primary">ถาม</button></form>
    ${!STU.q?`<div class="tags">${sug.map(s=>`<button class="tag tbtn" data-sg="${esc(s)}">${esc(s)}</button>`).join('')}</div>
      <p class="src">${Object.keys(cnt).length?`คลังความรู้มี ${activeCards().length} เรื่อง และข้อสอบ ${bankItems().length} ข้อ ให้ AI ใช้อ้างอิง`:'คลังความรู้ยังว่าง AI จะตอบจากความรู้ทั่วไปและบอกให้ทราบ'}</p>`:''}
    ${!ai?'<div class="hban"><b>ยังไม่ได้ใส่ AI key</b><span>ตอนนี้แสดงได้เฉพาะข้อมูลดิบจากคลัง ใส่ key แล้ว AI จะเรียบเรียงคำตอบให้อ่านเข้าใจง่ายพร้อมอ้างอิง</span><button class="ghost" id="askkey">ตั้งค่า</button></div>':''}
    <div class="aians" id="aians" ${STU.answer&&ai?'':'hidden'}><p class="ahd">✨ คำตอบจาก AI <span class="src">ตรวจจากคลังความรู้ ${STU.src.length} รายการ${(STU.fixed||[]).length?` · ค้นหาเป็น: ${esc(STU.fixed.join(', '))}`:''}</span></p><div class="abody">${STU.answer?mdLite(STU.answer):''}</div>
      <div class="thread" id="athread">${STU.turns.slice(2).map(t=>t.role==='user'?`<div class="msg me">${esc(t.content)}</div>`:`<div class="abody msg ai">${mdLite(t.content)}</div>`).join('')}</div>
      <form class="askform" id="askf2"><textarea id="askq2" rows="2" placeholder="ถามต่อ เช่น ยกตัวอย่างกรณีลูกค้าให้หน่อย"></textarea><div class="askrow"><span class="asknote"></span><button type="submit" class="send">ถามต่อ</button></div></form></div>
    ${STU.q?`<details class="asrc" ${STU.open||!ai?'open':''}><summary>ข้อมูลจากคลังความรู้ที่เกี่ยวข้อง (${STU.src.length})${(STU.fixed||[]).length?` · ค้นหาเป็น: ${esc(STU.fixed.join(', '))}`:''}</summary>${STU.src.length?`<div class="kcards stc">${STU.src.map(srcHTML).join('')}</div>`:'<p class="src">ไม่พบในคลังความรู้ AI ตอบจากความรู้ทั่วไป</p>'}</details>`:''}`;
  const $=id=>document.getElementById(id);
  const run=async q=>{STU.q=q.trim();if(!STU.q)return;STU.fixed=[];STU.src=await askSearchAI(STU.q);STU.answer='';STU.turns=[];renderStudy();if(activeAI())askAI(STU.q,true)};
  $('askf').onsubmit=e=>{e.preventDefault();run($('askq').value)};
  el.querySelectorAll('[data-sg]').forEach(b=>b.onclick=()=>run(b.dataset.sg));
  if($('askkey'))$('askkey').onclick=()=>{welcomeSkip=false;setView('welcome')};
  if($('askf2'))$('askf2').onsubmit=e=>{e.preventDefault();const v=$('askq2').value.trim();$('askq2').value='';if(v)askAI(v,false)};
  const det=el.querySelector('.asrc');if(det)det.addEventListener('toggle',()=>{STU.open=det.open});
  el.querySelectorAll('[data-exp]').forEach(b=>b.onclick=()=>{const c=STU.src[+b.dataset.exp];if(!c)return;$('aians').hidden=false;
    if(!STU.turns.length){STU.turns.push({role:'user',content:'ตอบคำถามข้างบน'},{role:'assistant',content:STU.answer||'-'})}
    askAI(`อธิบายรายการนี้จากคลังให้ละเอียด อ่านเข้าใจง่าย พร้อมตัวอย่าง: [${cardCite(c)||c.topic}] ${c.type==='q'?c.q.stem:c.title+': '+c.fact}`,false);$('aians').scrollIntoView({behavior:'smooth',block:'start'})});
}

/* ---------- ส่งเข้าคลังกลางอัตโนมัติเมื่อประมวลผลเสร็จ ---------- */
function autoShare(d){
  if(!d||d.central||d.noShare||d.shareErr||d.subStatus==='rejected'||d.subStatus==='pending'||d.subStatus==='approved')return;
  if(!CARDS.some(c=>c.docId===d.id))return;
  if(ME)submitDoc(d,{auto:true});else{d.shareWait=true;saveDoc(d)}
}
function flushShares(){if(!ME)return;for(const d of DOCS)if(!d.central&&d.stage==='ready'&&!d.noShare&&!d.shareErr&&!d.subId)autoShare(d)}

/* ---------- เมนูบนมือถือ: ปุ่ม ☰ เปิดแถบเมนูจากด้านซ้าย เลือกแล้วปิดเอง ---------- */
const isPhone=()=>matchMedia('(max-width:760px)').matches;
function setMenu(open){
  document.body.classList.toggle('menu-open',open);
  const b=document.getElementById('mmenu');if(b)b.setAttribute('aria-expanded',open);
  if(open){document.getElementById('side').scrollTop=0;const f=document.querySelector('#side .mclose');if(f)f.focus({preventScroll:true})}
}
document.getElementById('mmenu').onclick=()=>setMenu(!document.body.classList.contains('menu-open'));
document.getElementById('mclose').onclick=()=>{setMenu(false);document.getElementById('mmenu').focus()};
document.getElementById('mback').onclick=()=>setMenu(false);
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&document.body.classList.contains('menu-open')){setMenu(false);document.getElementById('mmenu').focus()}});
document.getElementById('side').addEventListener('click',e=>{
  if(isPhone()&&e.target.closest('#views button,#subjects [data-s],#newset'))setTimeout(()=>{setMenu(false);window.scrollTo({top:0})},0);
},true); /* capture: the subject list re-renders inside its own click handler */
/* page title and account shortcut in the top bar follow the page */
new MutationObserver(()=>{const t=document.getElementById('title').textContent;document.getElementById('mtitle').textContent=t||'ระบบซ้อมสอบ'}).observe(document.getElementById('title'),{childList:true,characterData:true,subtree:true});
function renderMav(){
  const b=document.getElementById('mav');if(!b)return;
  if(ME){b.className='mav in';b.textContent=(ME.name||'?').trim().slice(0,1).toUpperCase();b.setAttribute('aria-label','บัญชีของฉัน: '+ME.name);b.onclick=()=>setMenu(true)}
  else{b.className='mav out';b.textContent='เข้าสู่ระบบ';b.removeAttribute('aria-label');b.onclick=()=>loginDialog()}
}
new MutationObserver(renderMav).observe(document.getElementById('acct'),{childList:true});renderMav();
new MutationObserver(()=>{const on=document.querySelector('.app').classList.contains('exam');document.body.classList.toggle('exam-on',on);if(on)setMenu(false)}).observe(document.querySelector('.app'),{attributes:true,attributeFilter:['class']});
matchMedia('(max-width:760px)').addEventListener('change',e=>{if(!e.matches)setMenu(false)});
document.querySelectorAll('#views button').forEach(b=>b.onclick=()=>setView(b.dataset.v));

document.getElementById('count').onchange=e=>{P.count=+e.target.value;save();if(VIEW==='practice'&&R&&!R.picks.some(x=>x!=null)&&R.status!=='loading')start(true);else toast(`ชุดถัดไปจะมี ${P.count} ข้อ`)};
document.getElementById('mode-now').onclick=()=>{P.mode='now';save();renderSide()};
document.getElementById('mode-end').onclick=()=>{P.mode='end';save();renderSide()};
document.getElementById('newq').onclick=async()=>{
  const done=R&&R.status==='play'&&R.picks.some(x=>x!=null);
  if(done&&await modal('<p class="mt">สร้างโจทย์ชุดใหม่?</p><p class="src">ชุดที่กำลังทำอยู่จะถูกยกเลิก และไม่นับคะแนน</p>',[{t:'ทำชุดเดิมต่อ'},{t:'สร้างชุดใหม่',cls:'primary'}])!==1)return;
  start(true);window.scrollTo({top:0,behavior:'smooth'});
};
{const rl=document.getElementById('resetlv');if(rl)rl.remove()}
if(![5,10,20,50,100].includes(P.count)){P.count=10;save()}
renderSide();
start();
if(M&&M.status==='run'){
  if(Date.now()>=M.endAt){setView('mock');submitMock('time')}
  else{
    M.away=false;M.viol.push({at:Date.now(),reason:'ออกจากหน้าสอบหรือรีโหลดหน้า'});saveM();
    if(M.viol.length>=M.limit&&M.action==='submit'){setView('mock');submitMock('cheat')}
    else{graceUntil=Date.now()+1500;setView('mock');startTick();warnViol()}
  }
}else setView(M&&M.status==='done'?'mock':'home');
