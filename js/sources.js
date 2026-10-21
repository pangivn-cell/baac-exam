/* sources.js — เปิดไฟล์ต้นฉบับจากบรรทัดอ้างอิง (ไฟล์ในเครื่อง หรือ Google Drive ที่แอดมินแชร์โฟลเดอร์ไว้) */
/* ---------- แหล่งไฟล์ต้นฉบับ ----------
   แอดมินเพิ่มโฟลเดอร์ Google Drive ได้หลายโฟลเดอร์ (แชร์แบบ "ทุกคนที่มีลิงก์ดูได้") เก็บไว้ที่ Firestore config/srcdirs
   ระบบอ่านรายชื่อไฟล์ในโฟลเดอร์ (รวมโฟลเดอร์ย่อย) ด้วย Drive API แล้วจับคู่กับชุดในคลังกลางจากชื่อไฟล์
   ชุดไหนชื่อไม่ตรง ผู้ตรวจตั้งลิงก์ไฟล์เองได้ (kb/{id}.srcFile) */
const SRC_IDX_KEY='exam-src-idx',DRIVE_API='https://www.googleapis.com/drive/v3/files';
const SRC={dirs:[],files:new Map(),at:0,err:'',loading:null,ready:false};
const PDF_CACHE=new Map();
/* ชื่อไฟล์ → รหัสสำหรับจับคู่ (ไม่สนตัวพิมพ์ เว้นวรรค นามสกุล เลขนำหน้าแบบ 6361925..._9. และ (1) ท้ายชื่อ) */
function srcKeys(name){
  const b=String(name||'').toLowerCase().replace(/ \(ส่วนที่ \d+\)$/,'').replace(/\.[a-z0-9]{2,5}$/,'');
  const clean=x=>x.replace(/\s*\(\d+\)\s*$/,'').replace(/[\s_\-.]+/g,'');
  const noPre=b.replace(/^[0-9a-f]{10,}_\d+\./,'').replace(/^\d{6,}_\d+\./,'');
  return [...new Set([clean(b),clean(noPre)])].filter(k=>k.length>=3);
}
const driveIdOf=s=>{s=String(s||'').trim();const m=s.match(/\/folders\/([\w-]{10,})/)||s.match(/\/d\/([\w-]{10,})/)||s.match(/[?&]id=([\w-]{10,})/);return m?m[1]:/^[\w-]{10,}$/.test(s)?s:''};
const driveView=id=>`https://drive.google.com/file/d/${id}/view`;
async function driveList(folderId){
  const out=[];
  const walk=async(id,depth)=>{let tok='';do{
    const u=new URL(DRIVE_API);
    for(const [k,v] of Object.entries({q:`'${id}' in parents and trashed=false`,fields:'nextPageToken,files(id,name,mimeType,size)',pageSize:'1000',key:FB_CFG.apiKey,supportsAllDrives:'true',includeItemsFromAllDrives:'true'}))u.searchParams.set(k,v);
    if(tok)u.searchParams.set('pageToken',tok);
    const r=await fetch(u),j=await r.json().catch(()=>({}));
    if(!r.ok)throw{code:j.error&&j.error.status||String(r.status),message:j.error&&j.error.message||''};
    for(const f of j.files||[]){if(f.mimeType==='application/vnd.google-apps.folder'){if(depth<5)await walk(f.id,depth+1)}else out.push(f)}
    tok=j.nextPageToken||'';
  }while(tok)};
  await walk(folderId,0);return out;
}
function srcErrText(e){
  const c=String(e&&e.code||''),m=String(e&&e.message||'');
  if(/has not been used|disabled|SERVICE_DISABLED/i.test(m))return 'ยังไม่ได้เปิด Google Drive API ในโปรเจกต์ Firebase';
  if(c==='NOT_FOUND'||c==='404')return 'ไม่พบโฟลเดอร์ หรือโฟลเดอร์ยังไม่ได้แชร์แบบ "ทุกคนที่มีลิงก์"';
  if(c==='PERMISSION_DENIED'||c==='403')return 'ไม่มีสิทธิ์อ่าน ตั้งแชร์โฟลเดอร์เป็น "ทุกคนที่มีลิงก์ดูได้"';
  return m||c||'อ่าน Google Drive ไม่สำเร็จ';
}
/* โหลดรายชื่อโฟลเดอร์จากฐานข้อมูล แล้วอ่านรายชื่อไฟล์ (ใช้ของที่จำไว้ได้ 12 ชั่วโมง) */
function loadSrcIndex(force){
  if(SRC.loading)return SRC.loading;
  return SRC.loading=(async()=>{
    try{
      if(!ME){SRC.err='เข้าสู่ระบบเพื่อเปิดไฟล์ต้นฉบับจากคลังกลาง';return}
      const f=await fb(),s=await f.fs.getDoc(fsDoc('config','srcdirs'));
      SRC.dirs=s.exists()?(s.data().dirs||[]):[];
      const dk=SRC.dirs.map(d=>d.id).sort().join(',');
      let cache=null;try{cache=JSON.parse(localStorage.getItem(SRC_IDX_KEY)||'null')}catch(e){}
      if(!force&&cache&&cache.dk===dk&&Date.now()-cache.at<12*3600e3){SRC.files=new Map(cache.files);SRC.at=cache.at;SRC.err=cache.err||'';SRC.ready=true;return}
      const files=new Map(),errs=[];
      for(const d of SRC.dirs){
        try{d.n=0;for(const x of await (d.up?scriptList(d):driveList(d.id))){d.n++;for(const k of srcKeys(x.name))if(!files.has(k))files.set(k,{id:x.id,name:x.name,mime:x.mimeType,size:+x.size||0,up:d.up||''})}d.err=''}
        catch(e){d.err=srcErrText(e);errs.push(`${d.name||d.id}: ${d.err}`)}
      }
      SRC.files=files;SRC.at=Date.now();SRC.err=errs.join(' · ');SRC.ready=true;
      try{localStorage.setItem(SRC_IDX_KEY,JSON.stringify({dk,at:SRC.at,err:SRC.err,files:[...files]}))}catch(e){}
    }catch(e){SRC.err=srcErrText(e)}
    finally{SRC.loading=null}
  })();
}
/* ไฟล์ต้นฉบับของเอกสาร/ชุด: ลิงก์ที่ผู้ตรวจตั้งไว้ก่อน แล้วค่อยจับคู่จากชื่อไฟล์ */
function srcFor(d){
  if(!d)return null;
  const base=d.central?DOCS.filter(x=>x.central&&String(x.cloudId).replace(/_\d+$/,'')===String(d.cloudId).replace(/_\d+$/,'')):[d];
  const set=base.map(x=>x.srcFile).find(Boolean);if(set)return{id:set,name:d.name,mime:/\.pdf/i.test(d.name)?'application/pdf':''};
  for(const k of srcKeys(d.name)){const f=SRC.files.get(k);if(f)return f}
  return null;
}
/* อ่านผ่านตัวรับไฟล์ (Apps Script) — โฟลเดอร์ไม่ต้องแชร์สาธารณะ */
async function idTok(){const f=await fb();return f.auth.currentUser.getIdToken()}
async function scriptList(d){
  const j=await upCall(`${d.up}${d.up.includes('?')?'&':'?'}a=list&t=${encodeURIComponent(await idTok())}`);
  if(!j.ok)throw{message:j.error||'อ่านรายชื่อไฟล์ไม่ได้'};return j.files||[];
}
async function scriptBytes(up,id){
  const t=encodeURIComponent(await idTok()),parts=[];let off=0,size=1;
  while(off<size){
    const j=await upCall(`${up}${up.includes('?')?'&':'?'}a=file&id=${encodeURIComponent(id)}&off=${off}&t=${t}`);
    if(!j.ok)throw{message:j.error||'อ่านไฟล์ไม่ได้'};
    const bin=atob(j.data),u8=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u8[i]=bin.charCodeAt(i);
    parts.push(u8);size=j.size;off+=u8.length;if(!u8.length)break;
  }
  return await new Blob(parts).arrayBuffer();
}
/* ไฟล์ต้นฉบับ: ผ่านตัวรับไฟล์ของโฟลเดอร์นั้นก่อน (ไม่รู้ว่าอยู่โฟลเดอร์ไหนก็ลองทุกตัว) แล้วค่อยลอง Drive API ตรงๆ */
async function srcBytes(s){
  if(PDF_CACHE.has(s.id))return PDF_CACHE.get(s.id);
  const ups=s.up?[s.up]:SRC.dirs.filter(d=>d.up).map(d=>d.up);let err=null;
  for(const up of ups){try{const b=await scriptBytes(up,s.id);if(PDF_CACHE.size>4)PDF_CACHE.delete(PDF_CACHE.keys().next().value);PDF_CACHE.set(s.id,b);return b}catch(e){err=e}}
  try{return await driveBytes(s.id)}catch(e){throw err||e}
}
async function driveBytes(id){
  if(PDF_CACHE.has(id))return PDF_CACHE.get(id);
  const r=await fetch(`${DRIVE_API}/${id}?alt=media&supportsAllDrives=true&key=${FB_CFG.apiKey}`);
  if(!r.ok){let j={};try{j=await r.json()}catch(e){}throw{code:j.error&&j.error.status||String(r.status),message:j.error&&j.error.message||''}}
  const buf=await r.arrayBuffer();if(PDF_CACHE.size>4)PDF_CACHE.delete(PDF_CACHE.keys().next().value);PDF_CACHE.set(id,buf);return buf;
}
/* หน้าต่างดูต้นฉบับ: วาดหน้า PDF ที่อ้างอิง เลื่อนหน้าได้ พร้อมข้อความต้นฉบับที่เก็บไว้ */
async function openSource(cardId){
  const c=CARDS.find(x=>x.id===cardId),d=c&&docOf(c);
  if(!c||!d){toast('ไม่พบที่มาของข้อนี้','bad');return}
  let page=Math.max(1,+c.page||1),pdf=null,link='',why='';
  const text=c.src||((d.pages||[]).find(p=>p.n===page)||{}).text||'';
  modal(`<p class="mt">📂 ต้นฉบับ: ${esc(d.name)} · ${esc(d.unit||'หน้า')} ${page}</p>
    <div id="srcv" class="srcv"><p class="src"><span class="spin sm" aria-hidden="true"></span> กำลังเปิดไฟล์ต้นฉบับ...</p></div>
    <div id="srcnav" class="btnrow" hidden><button class="ghost" id="srcprev">← หน้าก่อน</button><span class="src" id="srcpg"></span><button class="ghost" id="srcnext">หน้าถัดไป →</button><a class="ghost" id="srclink" target="_blank" rel="noopener" hidden>เปิดใน Google Drive</a></div>
    ${text?`<details class="kprev"><summary>ข้อความต้นฉบับที่ระบบเก็บไว้ (${esc(d.unit||'หน้า')} ${page})</summary><pre class="srctext">${esc(text.slice(0,3000))}</pre></details>`:''}`,[{t:'ปิด'}]);
  const box=document.getElementById('srcv');
  try{
    let buf=null;
    if(!d.central){const f=await kbGet('files',d.id);if(f&&f.buf)buf=f.buf}
    if(!buf){
      if(!ME)throw{why:'เข้าสู่ระบบก่อน จึงจะเปิดไฟล์ต้นฉบับจาก Google Drive ได้'};
      if(!SRC.ready)await loadSrcIndex();
      const s=srcFor(d);
      if(!s)throw{why:SRC.dirs.length?`ยังไม่พบไฟล์ชื่อนี้ในโฟลเดอร์ Google Drive ที่ตั้งไว้${isReviewerMe()?' (ตั้งลิงก์ไฟล์เองได้ที่หน้า ข้อมูลในคลังกลาง)':''}`:'แอดมินยังไม่ได้ตั้งโฟลเดอร์ไฟล์ต้นฉบับ (Google Drive)'};
      link=driveView(s.id);
      if(!/pdf/i.test(s.mime||'')&&!/\.pdf$/i.test(s.name||''))throw{why:'ไฟล์นี้ไม่ใช่ PDF เปิดดูใน Google Drive แทน'};
      buf=await srcBytes(s);
    }
    pdf=await openPDF(buf);
  }catch(e){why=e&&e.why||srcErrText(e)}
  const lk=document.getElementById('srclink');if(lk&&link){lk.href=link;lk.hidden=false}
  if(!pdf){if(box)box.innerHTML=`<p class="kwarn">${esc(why)}</p>${link?`<p><a href="${link}" target="_blank" rel="noopener">เปิดไฟล์ใน Google Drive</a></p>`:''}`;const nv=document.getElementById('srcnav');if(nv&&link){nv.hidden=false;['srcprev','srcnext','srcpg'].forEach(x=>document.getElementById(x).hidden=true)}return}
  const draw=async()=>{
    const b=document.getElementById('srcv');if(!b)return;
    page=Math.min(Math.max(1,page),pdf.numPages);
    const pg=await pdf.getPage(page),w=Math.min(860,(b.clientWidth||600)),vp0=pg.getViewport({scale:1}),dpr=window.devicePixelRatio||1;
    const vp=pg.getViewport({scale:w/vp0.width*dpr}),cv=document.createElement('canvas');cv.width=vp.width;cv.height=vp.height;cv.style.width='100%';
    await pg.render({canvasContext:cv.getContext('2d'),viewport:vp,intent:'print'}).promise;
    b.innerHTML='';b.append(cv);
    document.getElementById('srcpg').textContent=`${d.unit||'หน้า'} ${page} / ${pdf.numPages}${page===(+c.page||1)?' (หน้าที่อ้างอิง)':''}`;
  };
  document.getElementById('srcnav').hidden=false;
  document.getElementById('srcprev').onclick=()=>{page--;draw()};
  document.getElementById('srcnext').onclick=()=>{page++;draw()};
  await draw();
}
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-src]');if(b){e.preventDefault();openSource(b.dataset.src)}});
const srcBtn=q=>{const c=q&&q.card&&CARDS.find(x=>x.id===q.card);const d=c&&docOf(c);return c&&d?`<button class="ghost srcbtn" type="button" data-src="${esc(c.id)}">📂 เปิดต้นฉบับ${c.page?` ${esc(d.unit||'หน้า')} ${esc(String(c.page))}`:''}</button>`:''};

/* ---------- ส่วนของผู้ตรวจ/แอดมิน ในหน้า ข้อมูลในคลังกลาง ---------- */
async function saveSrcDirs(dirs){
  const f=await fb();await f.fs.setDoc(fsDoc('config','srcdirs'),{dirs:dirs.map(({id,name,up})=>({id,name,up:up||''})),updatedAt:f.fs.serverTimestamp(),by:ME.name});
}
function srcAdminHTML(){
  if(!isReviewerMe())return '';
  const packs=DOCS.filter(d=>d.central),found=packs.filter(srcFor).length;
  return `<div class="cloudbox"><p><b>📂 ไฟล์ต้นฉบับ (Google Drive)</b> · จับคู่ได้ ${found} จาก ${packs.length} ชุด</p>
    <p class="src">วางลิงก์โฟลเดอร์ + URL ตัวรับไฟล์ (Apps Script ที่ติดตั้งในบัญชีเจ้าของโฟลเดอร์ ดูวิธีใน apps-script/Code.gs) เพิ่มได้หลายโฟลเดอร์ ระบบจับคู่ไฟล์กับชุดจากชื่อไฟล์ ผู้ที่ล็อกอินกด "เปิดต้นฉบับ" ในเฉลยแล้วเห็นหน้าที่อ้างอิงได้ทันที</p>
    ${SRC.dirs.map((d,i)=>`<div class="hrow"><div class="t"><b>${esc(d.name||'โฟลเดอร์')}</b><span class="src">${i===0?'หลัก':`สำรอง ${i}`} · ${d.err?`<span class="kerr">${esc(d.err)}</span>`:`${d.n!=null?`${d.n} ไฟล์ · `:''}`}${d.up?(d.quota?(d.quota.free<0?'พื้นที่ไม่จำกัด':`ใช้ไป ${gb(d.quota.used)} จาก ${gb(d.quota.limit)} · ว่าง ${gb(d.quota.free)}${d.quota.free<UP_MARGIN*2?' <b class="kerr">ใกล้เต็ม</b>':''}`):d.qerr?`<span class="kerr">ตัวรับไฟล์: ${esc(d.qerr)}</span>`:'กำลังตรวจพื้นที่...'):'ยังไม่มีตัวรับไฟล์ (อ่านอย่างเดียว)'} · <a href="https://drive.google.com/drive/folders/${esc(d.id)}" target="_blank" rel="noopener">เปิดโฟลเดอร์</a></span></div><button class="ghost" data-srcup="${i}">${d.up?'แก้':'ตั้ง'}ตัวรับไฟล์</button><button class="ghost" data-srcdel="${i}">เอาออก</button></div>`).join('')}
    ${SRC.err&&!SRC.dirs.some(d=>d.err)?`<p class="kerr">${esc(SRC.err)}</p>`:''}
    <div class="btnrow" style="justify-content:flex-start"><input id="srcurl" class="cetx" style="flex:1;min-width:220px" placeholder="ลิงก์โฟลเดอร์ Google Drive"><input id="srcupurl" class="cetx" style="flex:1;min-width:220px" placeholder="URL ตัวรับไฟล์ Apps Script (ไม่ใส่ก็ได้)"><input id="srcname" class="cetx" style="width:160px" placeholder="ชื่อเรียก (ไม่ใส่ก็ได้)"><button class="primary" id="srcadd">เพิ่มโฟลเดอร์</button></div>
    <p class="src">ไฟล์ที่ทุกคนอัปโหลดจะถูกส่งต้นฉบับขึ้นโฟลเดอร์แรกที่มีพื้นที่ว่างพอ (เรียงตามลำดับ หลัก → สำรอง) อัตโนมัติตอนส่งเข้าคลังกลาง</p>
    <div class="btnrow" style="justify-content:flex-start"><button class="ghost" id="srcscan">สแกนไฟล์ใหม่</button>${SRC.dirs.some(d=>d.up)?'<button class="ghost" id="srcupall">📤 ส่งต้นฉบับที่ยังขาดขึ้น Drive (จากไฟล์ในเครื่องนี้)</button>':''}</div></div>`;
}
function wireSrcAdmin(el,rerender){
  const add=el.querySelector('#srcadd');if(!add)return;
  add.onclick=async()=>{
    const id=driveIdOf(el.querySelector('#srcurl').value),name=el.querySelector('#srcname').value.trim(),up=el.querySelector('#srcupurl').value.trim();
    if(up&&!/^https:\/\/script\.google(usercontent)?\.com\//.test(up)){toast('URL ตัวรับไฟล์ต้องเป็นลิงก์ script.google.com','bad');return}
    if(!id){toast('วางลิงก์โฟลเดอร์ Google Drive ก่อน','bad');return}
    if(SRC.dirs.some(d=>d.id===id)){toast('มีโฟลเดอร์นี้แล้ว');return}
    add.disabled=true;
    try{await saveSrcDirs([...SRC.dirs,{id,name,up}]);await loadSrcIndex(true);toast('เพิ่มโฟลเดอร์แล้ว')}catch(e){toast('บันทึกไม่สำเร็จ: '+String(e&&e.code||e),'bad')}
    rerender();
  };
  el.querySelectorAll('[data-srcup]').forEach(b=>b.onclick=async()=>{
    const d=SRC.dirs[+b.dataset.srcup];if(!d)return;
    if(await modal(`<p class="mt">ตัวรับไฟล์ของ ${esc(d.name||'โฟลเดอร์')}</p><input id="srcupv" class="cetx" style="width:100%" value="${esc(d.up||'')}" placeholder="https://script.google.com/macros/s/.../exec"><p class="src">URL ของเว็บแอป Apps Script ที่ติดตั้งในบัญชีเจ้าของโฟลเดอร์นี้ (ดูวิธีติดตั้งใน apps-script/Code.gs) · เว้นว่าง = อ่านอย่างเดียว</p>`,[{t:'ยกเลิก'},{t:'บันทึก',cls:'primary'}])!==1)return;
    const v=((document.getElementById('srcupv')||{}).value||'').trim();
    if(v&&!/^https:\/\/script\.google(usercontent)?\.com\//.test(v)){toast('URL ต้องเป็นลิงก์ script.google.com','bad');return}
    try{d.up=v;d.quota=null;await saveSrcDirs(SRC.dirs);if(v)await upQuota(d);toast('บันทึกแล้ว')}catch(e){toast('บันทึกไม่สำเร็จ: '+String(e&&e.code||e),'bad')}
    rerender();
  });
  const ua=el.querySelector('#srcupall');if(ua)ua.onclick=async()=>{ua.disabled=true;await uploadMissing(ua);rerender()};
  const pend=SRC.dirs.filter(d=>d.up&&!d.quota&&!d.qerr&&!d.qbusy);
  if(pend.length){pend.forEach(d=>d.qbusy=true);Promise.all(pend.map(upQuota)).then(()=>{pend.forEach(d=>d.qbusy=false);if(VIEW==='kb'&&KB_TAB==='central')rerender()})}
  el.querySelector('#srcscan').onclick=async()=>{toast('กำลังสแกนไฟล์ใน Google Drive...');await loadSrcIndex(true);rerender()};
  el.querySelectorAll('[data-srcdel]').forEach(b=>b.onclick=async()=>{
    const d=SRC.dirs[+b.dataset.srcdel];if(!d||await modal(`<p class="mt">เอาโฟลเดอร์ ${esc(d.name||d.id)} ออก?</p><p class="src">ไฟล์ใน Google Drive ไม่ถูกลบ แค่ระบบจะไม่ใช้โฟลเดอร์นี้หาไฟล์ต้นฉบับ</p>`,[{t:'ยกเลิก'},{t:'เอาออก',cls:'primary'}])!==1)return;
    try{await saveSrcDirs(SRC.dirs.filter(x=>x!==d));await loadSrcIndex(true)}catch(e){toast('บันทึกไม่สำเร็จ: '+String(e&&e.code||e),'bad')}
    rerender();
  });
}
/* สถานะต้นฉบับบนการ์ดของแต่ละชุด + ปุ่มตั้งลิงก์เอง (ผู้ตรวจ) */
function packSrcHTML(d){
  if(!ME)return '';
  const s=srcFor(d);
  return `<p class="src">📂 ต้นฉบับ: ${s?`<a href="${driveView(s.id)}" target="_blank" rel="noopener">${esc(s.name||'เปิดใน Google Drive')}</a>`:'ยังไม่พบใน Google Drive'}${isReviewerMe()?` · <button class="linkbtn" type="button" data-srcset="${esc(d.id)}">${s?'เปลี่ยน':'ตั้ง'}ลิงก์ไฟล์</button>`:''}</p>`;
}
function wirePackSrc(el,rerender){
  el.querySelectorAll('[data-srcset]').forEach(b=>b.onclick=async()=>{
    const d=DOCS.find(x=>x.id===b.dataset.srcset);if(!d)return;
    if(await modal(`<p class="mt">ลิงก์ไฟล์ต้นฉบับของ ${esc(d.name)}</p><input id="srcfile" class="cetx" style="width:100%" placeholder="https://drive.google.com/file/d/.../view"><p class="src">ไฟล์ต้องแชร์แบบ "ทุกคนที่มีลิงก์ดูได้" · เว้นว่างเพื่อกลับไปจับคู่จากชื่อไฟล์</p>`,[{t:'ยกเลิก'},{t:'บันทึก',cls:'primary'}])!==1)return;
    const raw=(document.getElementById('srcfile')||{}).value||'',id=raw.trim()?driveIdOf(raw):'';
    if(raw.trim()&&!id){toast('ลิงก์ไม่ถูกต้อง','bad');return}
    const parts=DOCS.filter(x=>x.central&&String(x.cloudId).replace(/_\d+$/,'')===String(d.cloudId).replace(/_\d+$/,''));
    try{const f=await fb();for(const x of parts){await f.fs.updateDoc(fsDoc('kb',x.cloudId),{srcFile:id,updatedAt:f.fs.serverTimestamp()});x.srcFile=id;await saveDoc(x)}toast('บันทึกลิงก์ต้นฉบับแล้ว')}
    catch(e){toast('บันทึกไม่สำเร็จ: '+String(e&&e.code||e),'bad')}
    rerender();
  });
}

/* ---------- ส่งไฟล์ต้นฉบับขึ้น Google Drive ผ่านตัวรับไฟล์ (Apps Script ของแต่ละบัญชี) ----------
   เลือกโฟลเดอร์ตามลำดับ: ตรวจพื้นที่ว่างก่อน ถ้าไม่พอหรือเต็มใช้โฟลเดอร์ถัดไป (ตัวสำรอง) */
const UP_CHUNK=8*1024*1024,UP_MARGIN=50*1024*1024;
async function upCall(url,body){
  const r=await fetch(url,body?{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(body)}:{});
  const j=await r.json().catch(()=>({ok:false,error:'ตัวรับไฟล์ตอบกลับไม่ถูกต้อง'}));return j;
}
async function upQuota(d){try{const j=await upCall(d.up+(d.up.includes('?')?'&':'?')+'a=quota');d.quota=j.ok?j:null;d.qerr=j.ok?'':j.error||'';return d.quota}catch(e){d.quota=null;d.qerr='ติดต่อตัวรับไฟล์ไม่ได้';return null}}
const b64=blob=>new Promise((ok,no)=>{const r=new FileReader();r.onload=()=>ok(String(r.result).split(',')[1]);r.onerror=no;r.readAsDataURL(blob)});
const gb=n=>(n/1073741824).toFixed(n>=1073741824*10?0:1)+' GB';
async function uploadOriginal(name,buf,mime,onProg){
  if(!ME)throw{why:'ต้องเข้าสู่ระบบก่อน'};
  if(!SRC.ready)await loadSrcIndex();
  const ups=SRC.dirs.filter(d=>d.up);if(!ups.length)throw{why:'แอดมินยังไม่ได้ตั้งตัวรับไฟล์ (Apps Script)'};
  const f=await fb(),tok=await f.auth.currentUser.getIdToken(),size=buf.byteLength,blob=new Blob([buf],{type:mime||'application/pdf'});
  for(const d of ups){
    const q=await upQuota(d);if(!q)continue;
    if(q.free>=0&&q.free<size+UP_MARGIN)continue;              /* เต็มหรือเกือบเต็ม ใช้โฟลเดอร์ถัดไป */
    const s=await upCall(d.up,{a:'start',idToken:tok,name,mime:mime||'application/pdf',size});
    if(s.full)continue;
    if(!s.ok)throw{why:s.error||'เริ่มส่งไฟล์ไม่สำเร็จ'};
    if(s.done)return{id:s.id,dir:d.id};
    for(let off=0;off<size;){
      onProg&&onProg(off/size);
      const part=blob.slice(off,Math.min(size,off+UP_CHUNK));
      const r=await upCall(d.up,{a:'chunk',idToken:tok,session:s.session,offset:off,total:size,mime:mime||'application/pdf',data:await b64(part)});
      if(!r.ok)throw{why:r.error||'ส่งไฟล์ไม่สำเร็จ'};
      if(r.done){onProg&&onProg(1);return{id:r.id,dir:d.id}}
      off=r.next;
    }
  }
  throw{why:'พื้นที่ Google Drive ทุกโฟลเดอร์เต็มหรือติดต่อไม่ได้ ให้แอดมินเพิ่มโฟลเดอร์สำรอง'};
}
/* ไฟล์ต้นฉบับในเครื่องของชุดในคลังกลาง (ชุดที่เครื่องนี้เป็นคนส่ง หรือชื่อไฟล์ตรงกัน) */
async function localOriginalFor(pack){
  const base=String(pack.cloudId||'').replace(/_\d+$/,'');
  const cand=DOCS.filter(x=>!x.central&&(x.subId===base||baseName(x.name)===baseName(pack.name)));
  for(const x of cand){const f=await kbGet('files',x.id);if(f&&f.buf)return{doc:x,buf:f.buf}}
  return null;
}
async function setPackSrc(pack,id){
  const f=await fb(),parts=DOCS.filter(x=>x.central&&String(x.cloudId).replace(/_\d+$/,'')===String(pack.cloudId).replace(/_\d+$/,''));
  for(const x of parts){await f.fs.updateDoc(fsDoc('kb',x.cloudId),{srcFile:id,updatedAt:f.fs.serverTimestamp()});x.srcFile=id;await saveDoc(x)}
}
/* แอดมิน: ส่งต้นฉบับของชุดที่ยังไม่มีไฟล์ใน Drive (เฉพาะชุดที่เครื่องนี้ยังมีไฟล์ต้นฉบับ) */
async function uploadMissing(btn){
  const packs=[...new Map(DOCS.filter(d=>d.central&&!srcFor(d)).map(d=>[String(d.cloudId).replace(/_\d+$/,''),d])).values()];
  let ok=0,skip=0,fail='';
  for(const [i,p] of packs.entries()){
    const lo=await localOriginalFor(p);if(!lo){skip++;continue}
    if(btn)btn.textContent=`กำลังส่ง ${i+1}/${packs.length}: ${p.name.slice(0,30)}`;
    try{const r=await uploadOriginal(lo.doc.name,lo.buf,lo.doc.type==='pdf'?'application/pdf':'',x=>{if(btn)btn.textContent=`กำลังส่ง ${i+1}/${packs.length} · ${Math.round(x*100)}%`});await setPackSrc(p,r.id);ok++}
    catch(e){fail=e&&e.why||String(e&&e.code||e);break}
  }
  toast(`ส่งต้นฉบับขึ้น Drive แล้ว ${ok} ชุด${skip?` · ไม่มีไฟล์ในเครื่องนี้ ${skip} ชุด`:''}${fail?` · หยุดเพราะ: ${fail}`:''}`,fail?'bad':'');
}
