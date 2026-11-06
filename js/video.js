/* video.js — เมนูวิดีโอ: คลิปเรียนเพิ่มเติมที่ผู้ใช้แบ่งกัน 2 แบบ
   - ลิงก์ YouTube: เก็บแค่รหัสคลิป เล่นผ่าน youtube-nocookie
   - ไฟล์วิดีโอ: ส่งขึ้น Google Drive ผ่านตัวรับไฟล์ของแอดมิน (uploadOriginal ใน sources.js ตั้งแชร์ "ทุกคนที่มีลิงก์ดูได้" ให้เอง) เล่นผ่านหน้า preview ของ Drive
   videos/{id} = {src:'yt'|'drive', vid, title, desc, subject, uid, name, at} · ทุกคนดูได้ · ล็อกอินแล้วเพิ่มได้ · เจ้าของ/ผู้ตรวจลบได้ */
const VIDEO={list:null,at:0,err:'',q:'',play:'',auto:false,ups:[],watchT:null,manage:false,pick:new Set()};
const VIDEO_CACHE='exam-videos';
const VIDEO_MAX=1024*1024*1024;
try{const c=JSON.parse(localStorage.getItem(VIDEO_CACHE)||'null');if(Array.isArray(c))VIDEO.list=c}catch(e){}

/* รหัสคลิปจากลิงก์ YouTube ทุกรูปแบบ (watch?v= · youtu.be/ · shorts/ · embed/ · live/) */
function ytId(s){
  s=String(s||'').trim();
  const m=s.match(/(?:youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/|v\/)|youtu\.be\/)([\w-]{11})/);
  return m?m[1]:/^[\w-]{11}$/.test(s)?s:'';
}
const vidThumb=v=>v.src==='yt'?`https://i.ytimg.com/vi/${v.vid}/hqdefault.jpg`:`https://drive.google.com/thumbnail?id=${encodeURIComponent(v.vid)}&sz=w480`;
const vidEmbed=(v,auto)=>v.src==='yt'?`https://www.youtube-nocookie.com/embed/${v.vid}?rel=0${auto?'&autoplay=1':''}`:`https://drive.google.com/file/d/${encodeURIComponent(v.vid)}/preview`;
const vidOpen=v=>v.src==='yt'?`https://www.youtube.com/watch?v=${v.vid}`:`https://drive.google.com/file/d/${encodeURIComponent(v.vid)}/view`;
const canDelVid=v=>!!ME&&(v.uid===ME.uid||isReviewerMe());

async function loadVideos(force){
  if(!force&&VIDEO.list&&Date.now()-VIDEO.at<5*60e3)return VIDEO.list;
  try{
    const f=await fb(),snap=await f.fs.getDocs(f.fs.query(f.fs.collection(f.db,'videos'),f.fs.orderBy('at','desc'),f.fs.limit(500)));
    VIDEO.list=snap.docs.map(d=>({id:d.id,...d.data()}));VIDEO.at=Date.now();VIDEO.err='';
    try{localStorage.setItem(VIDEO_CACHE,JSON.stringify(VIDEO.list))}catch(e){}
  }catch(e){VIDEO.err=String(e&&e.code||e).includes('permission')?'ฐานข้อมูลยังไม่เปิดสิทธิ์ส่วนวิดีโอ':'โหลดรายการวิดีโอไม่ได้ ตรวจอินเทอร์เน็ต'}
  return VIDEO.list||[];
}

/* หัวข้อให้เลือกตอนเพิ่มคลิป: วิชาในระบบ + หัวข้อที่คลิปเดิมใช้อยู่ */
function vidSubjects(){
  const s=new Set((typeof SUBJ!=='undefined'?SUBJ:[]).filter(x=>!x.doc&&x.id!=='specall').map(x=>x.name));
  for(const v of VIDEO.list||[])if(v.subject)s.add(v.subject);
  return [...s];
}
const vidSubOpts=cur=>`<option value="">ไม่ระบุวิชา</option>${vidSubjects().map(n=>`<option value="${esc(n)}"${n===cur?' selected':''}>${esc(n)}</option>`).join('')}`;

/* ---------- คลิปที่ดูแล้ว (ความคืบหน้าของแต่ละรายวิชา) ----------
   เก็บในเครื่อง และกับบัญชีที่ users/{uid}/qlog/vwatch (สิทธิ์เดียวกับประวัติทำข้อสอบ) ล็อกอินเครื่องไหนก็เห็นความคืบหน้าเดียวกัน */
const VWATCH_KEY='exam-vwatch',VPREF_KEY='exam-vpref';
let VWATCH=new Set();try{VWATCH=new Set(JSON.parse(localStorage.getItem(VWATCH_KEY)||'[]'))}catch(e){}
Object.assign(VIDEO,{filter:'all',sort:'name',mode:'card',course:null});
try{const p=JSON.parse(localStorage.getItem(VPREF_KEY)||'{}');for(const k of ['filter','sort','mode'])if(p[k])VIDEO[k]=p[k]}catch(e){}
const saveVPref=()=>{try{localStorage.setItem(VPREF_KEY,JSON.stringify({filter:VIDEO.filter,sort:VIDEO.sort,mode:VIDEO.mode}))}catch(e){}};
const saveWatchLocal=()=>{try{localStorage.setItem(VWATCH_KEY,JSON.stringify([...VWATCH]))}catch(e){}};
let VWATCH_UID='',VWATCH_T=null;
async function pullWatch(){
  if(typeof ME==='undefined'||!ME||VWATCH_UID===ME.uid)return;VWATCH_UID=ME.uid;
  try{const f=await fb(),s=await f.fs.getDoc(fsDoc('users',ME.uid,'qlog','vwatch'));
    if(s.exists()){const n=VWATCH.size;for(const id of s.data().ids||[])VWATCH.add(id);if(VWATCH.size!==n){saveWatchLocal();if(VIEW==='video')renderVideo()}}}catch(e){}
}
function setWatched(id,on){
  if(on)VWATCH.add(id);else VWATCH.delete(id);saveWatchLocal();
  clearTimeout(VWATCH_T);VWATCH_T=setTimeout(async()=>{if(!ME)return;try{const f=await fb();await f.fs.setDoc(fsDoc('users',ME.uid,'qlog','vwatch'),{ids:[...VWATCH].slice(-3000),at:Date.now()})}catch(e){}},1500);
}

/* ---------- รายวิชา = กลุ่มคลิปตามวิชา ---------- */
const NO_SUBJ='ไม่ระบุวิชา';
const vOrd=v=>typeof v.ord==='number'?v.ord:(+v.at||0);
function vidCourses(){
  const m=new Map();
  for(const v of VIDEO.list||[]){const k=v.subject||NO_SUBJ;if(!m.has(k))m.set(k,[]);m.get(k).push(v)}
  return [...m].map(([name,clips])=>{
    clips.sort((a,b)=>vOrd(a)-vOrd(b));                            /* ลำดับบทเรียน: ที่จัดไว้ (ord) หรือลำดับที่เพิ่ม */
    const s=(typeof SUBJ!=='undefined'?SUBJ:[]).find(x=>x.name===name);
    const done=clips.filter(v=>VWATCH.has(v.id)).length;
    const cover=[...clips].reverse().find(v=>v.src==='yt')||clips[clips.length-1];
    return{name,clips,cat:s?(s.group==='gen'?'ความรู้ความสามารถทั่วไป':s.group==='spec'?'ความรู้เฉพาะตำแหน่ง':'วิชาในระบบ'):(name===NO_SUBJ?'คลิปทั่วไป':'หัวข้อที่ผู้ใช้ตั้ง'),
      done,pct:Math.round(done*100/clips.length),last:Math.max(...clips.map(v=>+v.at||0)),cover};
  });
}
/* ปกสำรองเมื่อไม่มีภาพ: สีจากชื่อวิชา */
const vHue=t=>{let h=0;for(const c of String(t))h=(h*31+c.charCodeAt(0))%360;return h};
const coverHTML=c=>`<span class="ccover" style="--h:${vHue(c.name)}"><span class="ccname">${esc(c.name)}</span>${c.cover?`<img src="${esc(vidThumb(c.cover))}" alt="" loading="lazy" onerror="this.remove()">`:''}</span>`;
const pctHTML=c=>`<span class="cpct"><span class="cbar"><span style="width:${c.pct}%"></span></span><span class="src">${c.pct}% complete · ${c.done}/${c.clips.length} คลิป</span></span>`;

function courseListHTML(){
  if(VIDEO.list===null)return '<div class="state"><div class="spin" aria-hidden="true"></div><p>กำลังโหลดรายการวิดีโอ...</p></div>';
  const q=VIDEO.q.trim().toLowerCase();
  const cs=vidCourses().filter(c=>VIDEO.filter==='all'||(VIDEO.filter==='done'?c.pct===100:VIDEO.filter==='doing'?c.pct>0&&c.pct<100:c.pct===0))
    .filter(c=>!q||(c.name+' '+c.cat+' '+c.clips.map(v=>v.title).join(' ')).toLowerCase().includes(q));
  cs.sort(VIDEO.sort==='recent'?(a,b)=>b.last-a.last:VIDEO.sort==='progress'?(a,b)=>b.pct-a.pct||a.name.localeCompare(b.name,'th'):(a,b)=>(a.name===NO_SUBJ)-(b.name===NO_SUBJ)||a.name.localeCompare(b.name,'th'));
  if(!cs.length)return `<p class="src" style="text-align:center">${(VIDEO.list||[]).length?'ไม่พบรายวิชาที่ตรงกับตัวกรอง':'ยังไม่มีวิดีโอ เริ่มเพิ่มคลิปแรกได้เลย'}</p>`;
  return `<div class="${VIDEO.mode==='list'?'clist':'cgrid'}">${cs.map(c=>`<button type="button" class="ccard" data-course="${esc(c.name)}">
    ${coverHTML(c)}<span class="cbody"><span class="ccat">${esc(c.cat)}</span><span class="ct">${esc(c.name)}</span>${pctHTML(c)}</span></button>`).join('')}</div>`;
}

const upsHTML=()=>VIDEO.ups.map(u=>`<div class="cloudbox"><p><b>${esc(u.title)}</b></p><p class="src">${u.err?`<span class="kerr">ส่งไม่สำเร็จ: ${esc(u.err)}</span>`:`กำลังส่งขึ้น Google Drive ${Math.round(u.p*100)}% · เปิดเมนูอื่นได้ แต่อย่าปิดหน้าเว็บจนกว่าจะเสร็จ`}</p>${u.err?'':`<div class="vprog"><span style="width:${Math.round(u.p*100)}%"></span></div>`}</div>`).join('');
const vSel=(id,label,opts,cur)=>`<select class="tx vsel" id="${id}" aria-label="${label}">${opts.map(([v,t])=>`<option value="${v}"${v===cur?' selected':''}>${t}</option>`).join('')}</select>`;
const vAddBtns='<span class="vadd"><button class="primary" id="vaddyt">＋ ลิงก์ YouTube</button><button class="ghost" id="vaddfile">＋ อัปโหลดไฟล์วิดีโอ</button></span>';

function renderVideo(){
  if(VIEW!=='video')return;
  pullWatch();
  const el=document.getElementById('sheet'),$=id=>document.getElementById(id);
  const course=VIDEO.course!=null&&vidCourses().find(c=>c.name===VIDEO.course);
  if(!course){
    VIDEO.course=null;
    head('วิดีโอ','รายวิชาวิดีโอสำหรับเรียนเพิ่มเติม · เลือกรายวิชาเพื่อดูคลิป หรือเพิ่มคลิปจาก YouTube และไฟล์วิดีโอ');
    el.innerHTML=`<div class="vhead"><p class="vh">☰ ภาพรวมรายวิชา</p>${vAddBtns}</div>
      <div class="vbar">
        ${vSel('vfilter','กรองรายวิชา',[['all','ทั้งหมด'],['doing','กำลังเรียน'],['todo','ยังไม่เริ่ม'],['done','เรียนจบแล้ว']],VIDEO.filter)}
        <input class="tx" id="vq" type="search" placeholder="ค้นหา" value="${esc(VIDEO.q)}" aria-label="ค้นหารายวิชาหรือคลิป">
        ${vSel('vsort','เรียงลำดับ',[['name','เรียงตามชื่อรายวิชา'],['recent','เรียงตามคลิปล่าสุด'],['progress','เรียงตามความคืบหน้า']],VIDEO.sort)}
        ${vSel('vmode','รูปแบบการแสดง',[['card','การ์ด'],['list','รายการ']],VIDEO.mode)}
      </div>
      ${upsHTML()}${VIDEO.err?`<p class="kerr">${esc(VIDEO.err)}</p>`:''}
      <div id="vlist">${courseListHTML()}</div>`;
    const wire=()=>el.querySelectorAll('[data-course]').forEach(b=>b.onclick=()=>{VIDEO.course=b.dataset.course;VIDEO.play='';VIDEO.auto=false;renderVideo();window.scrollTo(0,0)});
    const relist=()=>{$('vlist').innerHTML=courseListHTML();wire()};
    $('vq').oninput=e=>{VIDEO.q=e.target.value;relist()};
    $('vfilter').onchange=e=>{VIDEO.filter=e.target.value;saveVPref();relist()};
    $('vsort').onchange=e=>{VIDEO.sort=e.target.value;saveVPref();relist()};
    $('vmode').onchange=e=>{VIDEO.mode=e.target.value;saveVPref();relist()};
    $('vaddyt').onclick=addYouTube;$('vaddfile').onclick=addVideoFile;wire();
  }else{
    head(course.name,`${course.cat} · ${course.clips.length} คลิป`);
    /* คลิปในตัวเล่น: ที่ผู้ใช้เลือก หรือคลิปแรกที่ยังไม่ได้ดู (ไม่เล่นเองจนกว่าจะกด) */
    let cur=course.clips.find(v=>v.id===VIDEO.play);
    if(!cur){cur=course.clips.find(v=>!VWATCH.has(v.id))||course.clips[0];VIDEO.play=cur.id;VIDEO.auto=false}
    const n=course.clips.indexOf(cur);
    el.innerHTML=`<div class="vhead"><button class="ghost" id="vback">← รายวิชาทั้งหมด</button>${vAddBtns}</div>
      ${pctHTML(course)}${upsHTML()}
      <div class="vcourse">
        <div class="vplay">
          <div class="vframe"><iframe src="${esc(vidEmbed(cur,VIDEO.auto))}" title="${esc(cur.title)}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" referrerpolicy="strict-origin-when-cross-origin"></iframe></div>
          <p class="kn">${n+1}. ${esc(cur.title)}</p>
          ${cur.desc?`<p style="white-space:pre-wrap">${esc(cur.desc)}</p>`:''}
          <p class="src">${cur.src==='yt'?'YouTube':'ไฟล์บน Google Drive'} · เพิ่มโดย ${esc(cur.name||'-')} · ${fmtDate(+cur.at||0)}</p>
          <div class="btnrow" style="justify-content:flex-start">
            <button class="${VWATCH.has(cur.id)?'ghost':'primary'}" id="vdone">${VWATCH.has(cur.id)?'✓ ดูจบแล้ว (กดเพื่อยกเลิก)':'ทำเครื่องหมายว่าดูจบแล้ว'}</button>
            ${n<course.clips.length-1?'<button class="ghost" id="vnext">คลิปถัดไป →</button>':''}
            <a class="ghost" href="${esc(vidOpen(cur))}" target="_blank" rel="noopener">เปิดใน${cur.src==='yt'?' YouTube':' Google Drive'} ↗</a>
            ${canDelVid(cur)?`<button class="ghost" data-vedit="${esc(cur.id)}">✎ แก้ไข / ย้ายรายวิชา</button><button class="ghost" data-vdel="${esc(cur.id)}">ลบคลิปนี้</button>`:''}
          </div>
        </div>
        <div class="vside">
        ${course.clips.some(canDelVid)?`<div class="vmanage">${VIDEO.manage?`<button class="primary" id="vmovesel" ${VIDEO.pick.size?'':'disabled'}>ย้ายที่เลือก (${VIDEO.pick.size}) ไปรายวิชา…</button><button class="ghost" id="vmanage">เสร็จ</button>`
          :'<button class="ghost" id="vmanage">⚙ จัดการบทเรียน (เลือกหลายคลิป · เรียงลำดับ)</button>'}</div>`:''}
        <ol class="vlessons">${course.clips.map((v,i)=>{const ed=VIDEO.manage&&canDelVid(v);return `<li class="${ed?'ed':''}">${ed?`<input type="checkbox" data-vpick="${esc(v.id)}" aria-label="เลือก ${esc(v.title)}"${VIDEO.pick.has(v.id)?' checked':''}>`:''}<button type="button" class="vles${v.id===cur.id?' on':''}" data-vplay="${esc(v.id)}">
          <span class="vlthumb"><img src="${esc(vidThumb(v))}" alt="" loading="lazy" onerror="this.remove()"></span>
          <span class="vlt"><span>${i+1}. ${esc(v.title)}</span><span class="src">${v.src==='yt'?'YouTube':'ไฟล์'}${VWATCH.has(v.id)?' · <b class="vok">✓ ดูแล้ว</b>':''}</span></span></button>
          ${ed?`<span class="vupdn"><button class="ghost" data-vup="${esc(v.id)}" ${i?'':'disabled'} aria-label="เลื่อนขึ้น">↑</button><button class="ghost" data-vdn="${esc(v.id)}" ${i<course.clips.length-1?'':'disabled'} aria-label="เลื่อนลง">↓</button></span>`:''}</li>`}).join('')}</ol>
        </div>
      </div>`;
    $('vback').onclick=()=>{VIDEO.course=null;VIDEO.play='';VIDEO.manage=false;VIDEO.pick=new Set();renderVideo();window.scrollTo(0,0)};
    $('vaddyt').onclick=addYouTube;$('vaddfile').onclick=addVideoFile;
    el.querySelectorAll('[data-vplay]').forEach(b=>b.onclick=()=>{VIDEO.play=b.dataset.vplay;VIDEO.auto=true;renderVideo();el.querySelector('.vplay').scrollIntoView({behavior:'smooth',block:'start'})});
    $('vdone').onclick=()=>{setWatched(cur.id,!VWATCH.has(cur.id));renderVideo()};
    const nx=$('vnext');if(nx)nx.onclick=()=>{setWatched(cur.id,true);VIDEO.play=course.clips[n+1].id;VIDEO.auto=true;renderVideo()};
    el.querySelectorAll('[data-vdel]').forEach(b=>b.onclick=()=>delVideo(b.dataset.vdel));
    el.querySelectorAll('[data-vedit]').forEach(b=>b.onclick=()=>editVideo(b.dataset.vedit));
    const mg=$('vmanage');if(mg)mg.onclick=()=>{VIDEO.manage=!VIDEO.manage;VIDEO.pick=new Set();renderVideo()};
    const ms=$('vmovesel');if(ms)ms.onclick=()=>moveManyVideos(course.clips.filter(v=>VIDEO.pick.has(v.id)).map(v=>v.id));
    el.querySelectorAll('[data-vpick]').forEach(c=>c.onchange=()=>{if(c.checked)VIDEO.pick.add(c.dataset.vpick);else VIDEO.pick.delete(c.dataset.vpick);const b=$('vmovesel');if(b){b.disabled=!VIDEO.pick.size;b.textContent=`ย้ายที่เลือก (${VIDEO.pick.size}) ไปรายวิชา…`}});
    el.querySelectorAll('[data-vup]').forEach(b=>b.onclick=()=>moveVideo(b.dataset.vup,-1));
    el.querySelectorAll('[data-vdn]').forEach(b=>b.onclick=()=>moveVideo(b.dataset.vdn,1));
    /* เปิดเล่นคลิปนานเกิน 1 นาที = นับว่าดูแล้ว */
    clearTimeout(VIDEO.watchT);
    if(VIDEO.auto&&!VWATCH.has(cur.id))VIDEO.watchT=setTimeout(()=>{if(VIEW==='video'&&VIDEO.play===cur.id&&!VWATCH.has(cur.id)){setWatched(cur.id,true);renderVideo()}},60000);
  }
  if(VIDEO.list===null||Date.now()-VIDEO.at>5*60e3)loadVideos().then(()=>renderVideo());
}

async function needLogin(){if(ME)return true;toast('เข้าสู่ระบบก่อนจึงเพิ่มวิดีโอได้','bad');if(typeof loginDialog==='function')return !!(await loginDialog())&&!!ME;return false}
/* เลือกรายวิชา (บังคับ): รายวิชาวิดีโอที่มีอยู่ · วิชาในระบบ · สร้างรายวิชาใหม่ */
function courseSelHTML(cur){
  const have=vidCourses().map(c=>c.name).filter(n=>n!==NO_SUBJ).sort((a,b)=>a.localeCompare(b,'th'));
  const sys=vidSubjects().filter(n=>!have.includes(n));
  const o=n=>`<option value="${esc(n)}"${n===cur?' selected':''}>${esc(n)}</option>`;
  return `<label class="lbl" for="vs">รายวิชา <span class="kerr">*</span></label>
  <select class="tx" id="vs" style="width:100%"><option value="">— เลือกรายวิชา —</option>${have.length?`<optgroup label="รายวิชาวิดีโอที่มีอยู่">${have.map(o).join('')}</optgroup>`:''}<optgroup label="วิชาในระบบ">${sys.map(o).join('')}</optgroup><option value="__new">＋ สร้างรายวิชาใหม่…</option></select>
  <input class="tx" id="vsnew" maxlength="80" placeholder="ชื่อรายวิชาใหม่ เช่น ติว TGAT" style="width:100%" hidden>`;
}
const curCourse=()=>VIDEO.course&&VIDEO.course!==NO_SUBJ?VIDEO.course:'';
const vidForm=(extra,v)=>`${extra}
  <label class="lbl" for="vt">ชื่อคลิป</label><input class="tx" id="vt" maxlength="150" value="${esc(v&&v.title||'')}" style="width:100%">
  <label class="lbl" for="vd">คำอธิบาย (ไม่บังคับ)</label><textarea class="cetx" id="vd" rows="3" maxlength="2000" style="width:100%">${esc(v&&v.desc||'')}</textarea>
  ${courseSelHTML(v?(v.subject||''):curCourse())}<p class="kerr" id="vferr" hidden></p>`;
const readCourse=()=>{const v=document.getElementById('vs').value;return v==='__new'?(document.getElementById('vsnew').value||'').trim().slice(0,80):v};
const readVidForm=()=>({title:(document.getElementById('vt').value||'').trim().slice(0,150),desc:(document.getElementById('vd').value||'').trim().slice(0,2000),subject:readCourse()});
/* เปิดหน้าต่าง แล้วตรวจก่อนปิด: ช่องที่ผิดแจ้งในหน้าต่าง ไม่ต้องกรอกใหม่ทั้งหมด */
function vidModal(html,okText,check){
  const pr=modal(html,[{t:'ยกเลิก'},{t:okText,cls:'primary'}]);
  const sel=document.getElementById('vs'),nw=document.getElementById('vsnew');
  if(sel&&nw)sel.onchange=()=>{nw.hidden=sel.value!=='__new';if(!nw.hidden)nw.focus()};
  const ok=document.querySelector('#dlg .dlgbtns .primary'),err=document.getElementById('vferr');
  if(ok)ok.onclick=()=>{const m=check?check():'';if(m){if(err){err.textContent=m;err.hidden=false}else toast(m,'bad');return}closeModal(1)};
  return pr;
}
const needCourse=()=>readCourse()?'':document.getElementById('vs').value==='__new'?'ใส่ชื่อรายวิชาใหม่':'เลือกรายวิชาก่อน';

async function saveVideo(rec){
  const f=await fb(),doc={...rec,uid:ME.uid,name:ME.name||'',at:Date.now()};
  const ref=await f.fs.addDoc(f.fs.collection(f.db,'videos'),doc);
  VIDEO.list=[{id:ref.id,...doc},...(VIDEO.list||[])];try{localStorage.setItem(VIDEO_CACHE,JSON.stringify(VIDEO.list))}catch(e){}
  return ref.id;
}

async function addYouTube(){
  if(!(await needLogin()))return;
  if(await vidModal(`<p class="mt">เพิ่มคลิปจาก YouTube</p>${vidForm('<label class="lbl" for="vu">ลิงก์ YouTube</label><input class="tx" id="vu" style="width:100%" placeholder="https://www.youtube.com/watch?v=... หรือ https://youtu.be/...">',null)}<p class="src">ถ้าเว้นชื่อคลิป ระบบใช้ชื่อจาก YouTube</p>`,'เพิ่มคลิป',
    ()=>!ytId(document.getElementById('vu').value)?'ลิงก์ YouTube ไม่ถูกต้อง':needCourse())!==1)return;
  const id=ytId(document.getElementById('vu').value),o=readVidForm();
  if((VIDEO.list||[]).some(v=>v.src==='yt'&&v.vid===id)){toast('มีคลิปนี้ในรายการแล้ว','bad');const ex=VIDEO.list.find(v=>v.src==='yt'&&v.vid===id);VIDEO.play=ex.id;VIDEO.course=ex.subject||NO_SUBJ;renderVideo();return}
  if(!o.title){try{const r=await fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent('https://www.youtube.com/watch?v='+id)}`);if(r.ok)o.title=String((await r.json()).title||'').slice(0,150)}catch(e){}}
  if(!o.title){toast('ใส่ชื่อคลิปด้วย (ดึงชื่อจาก YouTube ไม่ได้)','bad');return}
  try{VIDEO.play=await saveVideo({src:'yt',vid:id,...o});VIDEO.course=o.subject||NO_SUBJ;VIDEO.auto=false;toast('เพิ่มคลิปแล้ว ทุกคนดูได้');renderVideo()}
  catch(e){toast('เพิ่มไม่สำเร็จ: '+(String(e&&e.code||e).includes('permission')?'ฐานข้อมูลยังไม่เปิดสิทธิ์':String(e&&e.code||e)),'bad')}
}

async function addVideoFile(){
  if(!(await needLogin()))return;
  const isVid=f=>/^video\//.test(f.type||'')||/\.(mp4|mov|m4v|webm|mkv|avi|3gp)$/i.test(f.name);
  if(await vidModal(`<p class="mt">อัปโหลดไฟล์วิดีโอ</p>${vidForm(`<label class="lbl" for="vf">ไฟล์วิดีโอ (ไม่เกิน 1 GB)</label><input id="vf" type="file" accept="video/*" style="width:100%">`,null)}<p class="src">ไฟล์จะถูกเก็บใน Google Drive ของระบบ และตั้งให้ทุกคนที่มีลิงก์ดูได้ ไฟล์ใหญ่ใช้เวลาส่งนาน ระหว่างส่งเปิดเมนูอื่นได้แต่อย่าปิดหน้าเว็บ</p>`,'อัปโหลด',
    ()=>{const f=(document.getElementById('vf').files||[])[0];return !f?'เลือกไฟล์วิดีโอก่อน':!isVid(f)?'ไฟล์นี้ไม่ใช่วิดีโอ':f.size>VIDEO_MAX?'ไฟล์ใหญ่เกิน 1 GB ลองย่อขนาดหรืออัปขึ้น YouTube แล้วใช้ลิงก์แทน':needCourse()})!==1)return;
  const file=(document.getElementById('vf').files||[])[0],o=readVidForm();
  if(!o.title)o.title=file.name.replace(/\.[^.]+$/,'').slice(0,150);
  const up={title:o.title,p:0,err:''};VIDEO.ups.push(up);renderVideo();
  const tick=()=>{if(VIEW==='video'){const bar=[...document.querySelectorAll('.vprog span')][VIDEO.ups.indexOf(up)];if(bar){bar.style.width=Math.round(up.p*100)+'%';bar.closest('.cloudbox').querySelector('.src').firstChild.textContent=`กำลังส่งขึ้น Google Drive ${Math.round(up.p*100)}% · เปิดเมนูอื่นได้ แต่อย่าปิดหน้าเว็บจนกว่าจะเสร็จ`}}};
  const busy=e=>{e.preventDefault();e.returnValue=''};window.addEventListener('beforeunload',busy);
  try{
    /* ชื่อไม่ซ้ำ: ตัวรับไฟล์ถือว่าชื่อเดิมที่ไม่มี sha คือไฟล์เดิม */
    const name=`video_${Date.now().toString(36)}_${file.name}`.slice(0,200);
    const r=await uploadOriginal(name,file,file.type||'video/mp4',p=>{up.p=p;tick()});
    const nid=await saveVideo({src:'drive',vid:r.id,...o});if(VIEW==='video'&&!VIDEO.course){VIDEO.course=o.subject;VIDEO.play=nid}
    VIDEO.ups.splice(VIDEO.ups.indexOf(up),1);toast(`อัปโหลด "${o.title}" แล้ว ทุกคนดูได้ (Drive อาจใช้เวลาสักครู่ก่อนเล่นได้)`);
  }catch(e){up.err=e&&e.why||String(e&&e.code||e)}
  finally{window.removeEventListener('beforeunload',busy);renderVideo()}
}

/* ---------- แก้ไขคลิป · จัดลำดับ · ย้ายหลายคลิป (เจ้าของคลิปหรือผู้ตรวจ) ---------- */
async function patchVideo(id,patch){
  const f=await fb();await f.fs.updateDoc(fsDoc('videos',id),patch);
  const v=(VIDEO.list||[]).find(x=>x.id===id);if(v)Object.assign(v,patch);
  try{localStorage.setItem(VIDEO_CACHE,JSON.stringify(VIDEO.list))}catch(e){}
}
const vErr=e=>String(e&&e.code||e).includes('permission')?'ไม่มีสิทธิ์แก้คลิปนี้':String(e&&e.code||e);
async function editVideo(id){
  const v=(VIDEO.list||[]).find(x=>x.id===id);if(!v||!canDelVid(v))return;
  if(await vidModal(`<p class="mt">แก้ไขคลิป</p>${vidForm('',v)}`,'บันทึก',()=>!(document.getElementById('vt').value||'').trim()?'ใส่ชื่อคลิป':needCourse())!==1)return;
  const o=readVidForm(),moved=o.subject!==(v.subject||'');
  try{await patchVideo(id,moved?{...o,ord:Date.now()}:o);if(moved){VIDEO.course=o.subject;toast(`ย้ายไปรายวิชา "${o.subject}" แล้ว`)}else toast('บันทึกแล้ว');renderVideo()}
  catch(e){toast('บันทึกไม่สำเร็จ: '+vErr(e),'bad')}
}
/* เลื่อนบทเรียนขึ้น/ลง: เปลี่ยน ord ของคลิปที่เลื่อนคลิปเดียว (ไว้กึ่งกลางระหว่างคลิปข้างเคียง) จึงไม่ต้องแก้คลิปของคนอื่น */
async function moveVideo(id,dir){
  const c=vidCourses().find(x=>x.clips.some(v=>v.id===id));if(!c)return;
  const cl=c.clips,i=cl.findIndex(v=>v.id===id),j=i+dir;if(j<0||j>=cl.length)return;
  const a=cl[dir<0?j-1:j],b=cl[dir<0?j:j+1];
  const ord=!a?vOrd(b)-60000:!b?vOrd(a)+60000:(vOrd(a)+vOrd(b))/2;
  try{await patchVideo(id,{ord});renderVideo()}catch(e){toast('เลื่อนไม่สำเร็จ: '+vErr(e),'bad')}
}
async function moveManyVideos(ids){
  if(!ids.length)return;
  if(await vidModal(`<p class="mt">ย้าย ${ids.length} คลิปไปรายวิชา</p>${courseSelHTML('')}<p class="kerr" id="vferr" hidden></p>`,'ย้าย',needCourse)!==1)return;
  const to=readCourse();let ok=0,bad=0,base=Date.now();
  for(const [k,id] of ids.entries()){try{await patchVideo(id,{subject:to,ord:base+k});ok++}catch(e){bad++}}
  VIDEO.pick=new Set();VIDEO.manage=false;VIDEO.course=to;VIDEO.play='';
  toast(`ย้ายไป "${to}" แล้ว ${ok} คลิป${bad?` · ย้ายไม่ได้ ${bad} คลิป (ไม่มีสิทธิ์)`:''}`,bad?'bad':'');renderVideo();
}

async function delVideo(id){
  const v=(VIDEO.list||[]).find(x=>x.id===id);if(!v||!canDelVid(v))return;
  if(await modal(`<p class="mt">ลบคลิปนี้ออกจากรายการ?</p><p>${esc(v.title)}</p><p class="src">${v.src==='drive'?'ไฟล์ใน Google Drive ยังอยู่ (แอดมินลบเองได้ใน Drive)':'คลิปบน YouTube ไม่ได้ถูกลบ'}</p>`,[{t:'ยกเลิก'},{t:'ลบ',cls:'primary'}])!==1)return;
  try{const f=await fb();await f.fs.deleteDoc(fsDoc('videos',id));VIDEO.list=VIDEO.list.filter(x=>x.id!==id);if(VIDEO.play===id)VIDEO.play='';try{localStorage.setItem(VIDEO_CACHE,JSON.stringify(VIDEO.list))}catch(e){}renderVideo();toast('ลบแล้ว')}
  catch(e){toast('ลบไม่สำเร็จ: '+String(e&&e.code||e),'bad')}
}
