/* video.js — เมนูวิดีโอ: คลิปเรียนเพิ่มเติมที่ผู้ใช้แบ่งกัน 2 แบบ
   - ลิงก์ YouTube: เก็บแค่รหัสคลิป เล่นผ่าน youtube-nocookie
   - ไฟล์วิดีโอ: ส่งขึ้น Google Drive ผ่านตัวรับไฟล์ของแอดมิน (uploadOriginal ใน sources.js ตั้งแชร์ "ทุกคนที่มีลิงก์ดูได้" ให้เอง) เล่นผ่านหน้า preview ของ Drive
   videos/{id} = {src:'yt'|'drive', vid, title, desc, subject, uid, name, at} · ทุกคนดูได้ · ล็อกอินแล้วเพิ่มได้ · เจ้าของ/ผู้ตรวจลบได้ */
const VIDEO={list:null,at:0,err:'',q:'',sub:'',play:'',ups:[]};
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
const vidEmbed=v=>v.src==='yt'?`https://www.youtube-nocookie.com/embed/${v.vid}?rel=0&autoplay=1`:`https://drive.google.com/file/d/${encodeURIComponent(v.vid)}/preview`;
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

/* หัวข้อให้เลือกตอนเพิ่มคลิป/กรอง: วิชาในระบบ + หัวข้อที่คลิปเดิมใช้อยู่ */
function vidSubjects(){
  const s=new Set((typeof SUBJ!=='undefined'?SUBJ:[]).filter(x=>!x.doc&&x.id!=='specall').map(x=>x.name));
  for(const v of VIDEO.list||[])if(v.subject)s.add(v.subject);
  return [...s];
}
const vidSubOpts=(cur,all)=>`${all?`<option value="">ทุกวิชา</option>`:'<option value="">ไม่ระบุวิชา</option>'}${vidSubjects().map(n=>`<option value="${esc(n)}"${n===cur?' selected':''}>${esc(n)}</option>`).join('')}`;

function vidListHTML(){
  const all=VIDEO.list||[],q=VIDEO.q.trim().toLowerCase();
  const list=all.filter(v=>(!VIDEO.sub||v.subject===VIDEO.sub)&&(!q||`${v.title} ${v.desc||''} ${v.subject||''} ${v.name||''}`.toLowerCase().includes(q)));
  return VIDEO.list===null?'<div class="state"><div class="spin" aria-hidden="true"></div><p>กำลังโหลดรายการวิดีโอ...</p></div>'
      :list.length?`<div class="vgrid">${list.map(v=>`<button class="vcard${v.id===VIDEO.play?' on':''}" data-vplay="${esc(v.id)}" type="button">
        <span class="vthumb"><img src="${esc(vidThumb(v))}" alt="" loading="lazy" onerror="this.remove()"><span class="vsrc">${v.src==='yt'?'YouTube':'ไฟล์'}</span><span class="vpi" aria-hidden="true">▶</span></span>
        <span class="vt">${esc(v.title)}</span>
        <span class="src">${v.subject?`${esc(v.subject)} · `:''}${esc(v.name||'-')} · ${fmtDate(+v.at||0)}</span></button>`).join('')}</div>`
      :`<p class="src" style="text-align:center">${all.length?'ไม่พบคลิปที่ตรงกับการค้นหา':'ยังไม่มีวิดีโอ เริ่มเพิ่มคลิปแรกได้เลย'}</p>`;
}
function wireVidList(){
  document.querySelectorAll('#vlist [data-vplay]').forEach(b=>b.onclick=()=>{VIDEO.play=b.dataset.vplay;renderVideo();document.querySelector('.vplay')?.scrollIntoView({behavior:'smooth',block:'start'})});
}
function renderVideo(){
  if(VIEW!=='video')return;
  head('วิดีโอ','คลิปสำหรับเรียนเพิ่มเติม · แนบลิงก์ YouTube หรืออัปโหลดไฟล์วิดีโอให้ทุกคนดูได้');
  const el=document.getElementById('sheet'),all=VIDEO.list||[];
  const cur=all.find(v=>v.id===VIDEO.play);
  el.innerHTML=`
    <div class="vbar">
      <button class="primary" id="vaddyt">＋ ลิงก์ YouTube</button>
      <button class="ghost" id="vaddfile">＋ อัปโหลดไฟล์วิดีโอ</button>
      <input class="tx" id="vq" type="search" placeholder="ค้นหาคลิป" value="${esc(VIDEO.q)}" aria-label="ค้นหาคลิป">
      <select class="tx" id="vsub" aria-label="กรองตามวิชา">${vidSubOpts(VIDEO.sub,true)}</select>
    </div>
    ${VIDEO.ups.map(u=>`<div class="cloudbox"><p><b>${esc(u.title)}</b></p><p class="src">${u.err?`<span class="kerr">ส่งไม่สำเร็จ: ${esc(u.err)}</span>`:`กำลังส่งขึ้น Google Drive ${Math.round(u.p*100)}% · เปิดเมนูอื่นได้ แต่อย่าปิดหน้าเว็บจนกว่าจะเสร็จ`}</p>${u.err?'':`<div class="vprog"><span style="width:${Math.round(u.p*100)}%"></span></div>`}</div>`).join('')}
    ${cur?`<div class="vplay">
      <div class="vframe"><iframe src="${esc(vidEmbed(cur))}" title="${esc(cur.title)}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" referrerpolicy="strict-origin-when-cross-origin"></iframe></div>
      <p class="kn">${esc(cur.title)}</p>
      ${cur.desc?`<p style="white-space:pre-wrap">${esc(cur.desc)}</p>`:''}
      <p class="src">${cur.subject?`<span class="tag">${esc(cur.subject)}</span> · `:''}${cur.src==='yt'?'YouTube':'ไฟล์บน Google Drive'} · เพิ่มโดย ${esc(cur.name||'-')} · ${fmtDate(+cur.at||0)}</p>
      <div class="btnrow" style="justify-content:flex-start"><a class="ghost" href="${esc(vidOpen(cur))}" target="_blank" rel="noopener">เปิดใน${cur.src==='yt'?' YouTube':' Google Drive'} ↗</a><button class="ghost" id="vclose">ปิดคลิป</button>${canDelVid(cur)?`<button class="ghost" data-vdel="${esc(cur.id)}">ลบคลิปนี้</button>`:''}</div>
    </div>`:''}
    ${VIDEO.err?`<p class="kerr">${esc(VIDEO.err)}</p>`:''}
    <div id="vlist">${vidListHTML()}</div>`;
  const $=id=>document.getElementById(id);
  /* ค้นหา/กรอง: วาดเฉพาะรายการ ไม่แตะคลิปที่กำลังเล่น */
  const relist=()=>{$('vlist').innerHTML=vidListHTML();wireVidList()};
  $('vq').oninput=e=>{VIDEO.q=e.target.value;relist()};
  $('vsub').onchange=e=>{VIDEO.sub=e.target.value;relist()};
  $('vaddyt').onclick=addYouTube;$('vaddfile').onclick=addVideoFile;
  wireVidList();
  const c=$('vclose');if(c)c.onclick=()=>{VIDEO.play='';renderVideo()};
  el.querySelectorAll('[data-vdel]').forEach(b=>b.onclick=()=>delVideo(b.dataset.vdel));
  if(VIDEO.list===null||Date.now()-VIDEO.at>5*60e3)loadVideos().then(()=>renderVideo());
}

async function needLogin(){if(ME)return true;toast('เข้าสู่ระบบก่อนจึงเพิ่มวิดีโอได้','bad');if(typeof loginDialog==='function')return !!(await loginDialog())&&!!ME;return false}
const vidForm=(extra,title)=>`${extra}
  <label class="lbl" for="vt">ชื่อคลิป</label><input class="tx" id="vt" maxlength="150" value="${esc(title||'')}" style="width:100%">
  <label class="lbl" for="vd">คำอธิบาย (ไม่บังคับ)</label><textarea class="cetx" id="vd" rows="3" maxlength="2000" style="width:100%"></textarea>
  <label class="lbl" for="vs">วิชา</label><select class="tx" id="vs" style="width:100%">${vidSubOpts(VIDEO.sub,false)}</select>`;
const readVidForm=()=>({title:(document.getElementById('vt').value||'').trim().slice(0,150),desc:(document.getElementById('vd').value||'').trim().slice(0,2000),subject:document.getElementById('vs').value||''});

async function saveVideo(rec){
  const f=await fb(),doc={...rec,uid:ME.uid,name:ME.name||'',at:Date.now()};
  const ref=await f.fs.addDoc(f.fs.collection(f.db,'videos'),doc);
  VIDEO.list=[{id:ref.id,...doc},...(VIDEO.list||[])];try{localStorage.setItem(VIDEO_CACHE,JSON.stringify(VIDEO.list))}catch(e){}
  return ref.id;
}

async function addYouTube(){
  if(!(await needLogin()))return;
  if(await modal(`<p class="mt">เพิ่มคลิปจาก YouTube</p>${vidForm('<label class="lbl" for="vu">ลิงก์ YouTube</label><input class="tx" id="vu" style="width:100%" placeholder="https://www.youtube.com/watch?v=... หรือ https://youtu.be/...">','')}<p class="src">ถ้าเว้นชื่อคลิป ระบบใช้ชื่อจาก YouTube</p>`,[{t:'ยกเลิก'},{t:'เพิ่มคลิป',cls:'primary'}])!==1)return;
  const id=ytId(document.getElementById('vu').value),o=readVidForm();
  if(!id){toast('ลิงก์ YouTube ไม่ถูกต้อง','bad');return}
  if((VIDEO.list||[]).some(v=>v.src==='yt'&&v.vid===id)){toast('มีคลิปนี้ในรายการแล้ว','bad');VIDEO.play=(VIDEO.list.find(v=>v.src==='yt'&&v.vid===id)||{}).id||'';renderVideo();return}
  if(!o.title){try{const r=await fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent('https://www.youtube.com/watch?v='+id)}`);if(r.ok)o.title=String((await r.json()).title||'').slice(0,150)}catch(e){}}
  if(!o.title){toast('ใส่ชื่อคลิปด้วย (ดึงชื่อจาก YouTube ไม่ได้)','bad');return}
  try{VIDEO.play=await saveVideo({src:'yt',vid:id,...o});toast('เพิ่มคลิปแล้ว ทุกคนดูได้');renderVideo()}
  catch(e){toast('เพิ่มไม่สำเร็จ: '+(String(e&&e.code||e).includes('permission')?'ฐานข้อมูลยังไม่เปิดสิทธิ์':String(e&&e.code||e)),'bad')}
}

async function addVideoFile(){
  if(!(await needLogin()))return;
  if(await modal(`<p class="mt">อัปโหลดไฟล์วิดีโอ</p>${vidForm(`<label class="lbl" for="vf">ไฟล์วิดีโอ (ไม่เกิน 1 GB)</label><input id="vf" type="file" accept="video/*" style="width:100%">`,'')}<p class="src">ไฟล์จะถูกเก็บใน Google Drive ของระบบ และตั้งให้ทุกคนที่มีลิงก์ดูได้ ไฟล์ใหญ่ใช้เวลาส่งนาน ระหว่างส่งเปิดเมนูอื่นได้แต่อย่าปิดหน้าเว็บ</p>`,[{t:'ยกเลิก'},{t:'อัปโหลด',cls:'primary'}])!==1)return;
  const file=(document.getElementById('vf').files||[])[0],o=readVidForm();
  if(!file){toast('เลือกไฟล์วิดีโอก่อน','bad');return}
  if(!/^video\//.test(file.type||'')&&!/\.(mp4|mov|m4v|webm|mkv|avi|3gp)$/i.test(file.name)){toast('ไฟล์นี้ไม่ใช่วิดีโอ','bad');return}
  if(file.size>VIDEO_MAX){toast('ไฟล์ใหญ่เกิน 1 GB ลองย่อขนาดหรืออัปขึ้น YouTube แล้วใช้ลิงก์แทน','bad');return}
  if(!o.title)o.title=file.name.replace(/\.[^.]+$/,'').slice(0,150);
  const up={title:o.title,p:0,err:''};VIDEO.ups.push(up);renderVideo();
  const tick=()=>{if(VIEW==='video'){const bar=[...document.querySelectorAll('.vprog span')][VIDEO.ups.indexOf(up)];if(bar){bar.style.width=Math.round(up.p*100)+'%';bar.closest('.cloudbox').querySelector('.src').firstChild.textContent=`กำลังส่งขึ้น Google Drive ${Math.round(up.p*100)}% · เปิดเมนูอื่นได้ แต่อย่าปิดหน้าเว็บจนกว่าจะเสร็จ`}}};
  const busy=e=>{e.preventDefault();e.returnValue=''};window.addEventListener('beforeunload',busy);
  try{
    /* ชื่อไม่ซ้ำ: ตัวรับไฟล์ถือว่าชื่อเดิมที่ไม่มี sha คือไฟล์เดิม */
    const name=`video_${Date.now().toString(36)}_${file.name}`.slice(0,200);
    const r=await uploadOriginal(name,file,file.type||'video/mp4',p=>{up.p=p;tick()});
    await saveVideo({src:'drive',vid:r.id,...o});
    VIDEO.ups.splice(VIDEO.ups.indexOf(up),1);toast(`อัปโหลด "${o.title}" แล้ว ทุกคนดูได้ (Drive อาจใช้เวลาสักครู่ก่อนเล่นได้)`);
  }catch(e){up.err=e&&e.why||String(e&&e.code||e)}
  finally{window.removeEventListener('beforeunload',busy);renderVideo()}
}

async function delVideo(id){
  const v=(VIDEO.list||[]).find(x=>x.id===id);if(!v||!canDelVid(v))return;
  if(await modal(`<p class="mt">ลบคลิปนี้ออกจากรายการ?</p><p>${esc(v.title)}</p><p class="src">${v.src==='drive'?'ไฟล์ใน Google Drive ยังอยู่ (แอดมินลบเองได้ใน Drive)':'คลิปบน YouTube ไม่ได้ถูกลบ'}</p>`,[{t:'ยกเลิก'},{t:'ลบ',cls:'primary'}])!==1)return;
  try{const f=await fb();await f.fs.deleteDoc(fsDoc('videos',id));VIDEO.list=VIDEO.list.filter(x=>x.id!==id);if(VIDEO.play===id)VIDEO.play='';try{localStorage.setItem(VIDEO_CACHE,JSON.stringify(VIDEO.list))}catch(e){}renderVideo();toast('ลบแล้ว')}
  catch(e){toast('ลบไม่สำเร็จ: '+String(e&&e.code||e),'bad')}
}
