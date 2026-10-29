/* kb.js — คลังความรู้: อ่านไฟล์ ประมวลผลด้วย AI อัปโหลด หน้าคลังความรู้ */
/* ---------- subjects & descriptions ---------- */
/* วิชาจากไฟล์: ชื่อเดียวกันแสดงในเมนูแค่วิชาเดียว (เช่น อัปโหลดไฟล์เดิมซ้ำ หรือมีทั้งในเครื่องและในคลังกลาง) ใช้ชุดในคลังกลางก่อน */
const docBase=d=>d.name.replace(/\.[^.]+$/,'').trim();
const docKey=d=>docBase(d).toLowerCase().replace(/\s+/g,' ');
function syncDocSubjects(){
  for(let i=SUBJ.length-1;i>=0;i--)if(SUBJ[i].doc)SUBJ.splice(i,1);
  const seen=new Set(SUBJ.map(s=>String(s.name).trim().toLowerCase().replace(/\s+/g,' ')));
  const hid=typeof HIDE!=='undefined'?HIDE:new Set();
  for(const d of [...DOCS].sort((a,b)=>(b.central?1:0)-(a.central?1:0))){
    /* ไฟล์ที่ยังไม่มีทั้งเนื้อหาและบัตรความรู้ (เช่น เพิ่งอัปโหลดขึ้น Drive) ยังไม่ต้องแสดงเป็นวิชา */
    if(!docMine(d))continue;
    if(!d.central&&(!d.pages||!d.pages.length)&&!CARDS.some(c=>c.docId===d.id))continue;
    if(!d.show||hid.has(d.id)||seen.has(docKey(d)))continue;seen.add(docKey(d));
    SUBJ.push({id:'doc_'+d.id,name:d.label||docBase(d),desc:'',ai:true,group:d.group||'spec',doc:d.id});
  }
}
/* ลบวิชาจากไฟล์ (ปุ่ม 🗑 ในเมนู): เลือกได้ว่าลบเฉพาะชุดที่ซ้ำ หรือลบวิชานี้ทั้งหมด
   ชุดในเครื่องนี้ลบได้เสมอ · ชุดในคลังกลางเฉพาะผู้ตรวจ/แอดมินลบได้ (คนอื่นจะซ่อนจากเมนูของตัวเองแทน) */
async function delLocalDoc(id){
  const gone=DOCS.find(x=>x.id===id);
  const ids=CARDS.filter(c=>c.docId===id).map(c=>c.id);
  try{await kbDelMany('docs',[id]);await kbDelMany('files',[id]);await kbDelMany('cards',ids)}catch(e){}await dropFigs(docFigs(id).map(f=>f.id));
  DOCS=DOCS.filter(x=>x.id!==id);CARDS=CARDS.filter(c=>c.docId!==id);
  if(gone&&!gone.central&&typeof syncDeleteDoc==='function')syncDeleteDoc(gone);
}
async function deleteDocSubject(sid){
  const s=SUBJ.find(x=>x.id===sid),main=s&&DOCS.find(d=>d.id===s.doc);if(!main)return;
  const rev=typeof isReviewerMe==='function'&&isReviewerMe(),key=docKey(main);
  const all=[main,...DOCS.filter(d=>d!==main&&docKey(d)===key)],dups=all.slice(1);
  const nOf=d=>CARDS.filter(c=>c.docId===d.id).length;
  const row=d=>`<li>${esc(d.name)} · ${d.central?'คลังกลาง':'ในเครื่องนี้'} · ${nOf(d)} รายการ${d.show?'':' · ซ่อนอยู่'}${d===main?' <b>(ชุดที่ใช้ในเมนู)</b>':''}</li>`;
  const btns=[{t:'ยกเลิก'},{t:'ซ่อนวิชานี้ (เก็บข้อมูล)',cls:'primary'}];if(dups.length)btns.push({t:`ลบเฉพาะชุดที่ซ้ำ (${dups.length})`});btns.push({t:'ลบวิชานี้ทั้งหมด'});
  const p=modal(`<p class="mt">ลบวิชา ${esc(s.name)}?</p>
    <p>วิชานี้มาจากไฟล์ ${all.length} ชุด${dups.length?' (มีชุดซ้ำ)':''}</p><ul class="src">${all.map(row).join('')}</ul>
    ${all.some(d=>d.central)&&!rev?'<p class="kwarn">ชุดในคลังกลางลบได้เฉพาะผู้ตรวจ ระบบจะซ่อนจากเมนูของคุณแทน</p>':''}
    <p class="src"><b>ซ่อนวิชานี้</b> = เอาออกจากเมนู แต่เก็บเอกสาร/บัตรไว้ครบ (เปิดกลับได้)<br><b>ลบ...</b> = ลบชุด/ข้อมูล (กู้คืนไม่ได้ · ไฟล์ใน Google Drive ไม่ถูกลบ)</p>
    <label class="rad"><input type="checkbox" id="sdelok"><span><b>เข้าใจแล้ว ลบถาวร</b><span class="src">ติ๊กเฉพาะเมื่อเลือก ลบ</span></span></label>`,btns);
  let ok=false;const cb=document.getElementById('sdelok');if(cb)cb.onchange=()=>{ok=cb.checked};
  const r=await p;if(!r)return;
  if(r===1){
    /* ซ่อนวิชานี้: เก็บเอกสารและบัตรทั้งหมด */
    for(const d of all){d.show=false;await saveDoc(d);if(!d.central&&typeof syncPushMeta==='function')syncPushMeta(d)}
    if(all.some(d=>P.subject==='doc_'+d.id)){P.subject='ineq';save()}
    syncDocSubjects();renderSide();if(VIEW==='kb')renderKB();
    toast('ซ่อนวิชานี้แล้ว · เอกสารและบัตรยังอยู่ครบ');
    return;
  }
  if(!ok){toast('ยังไม่ได้ติ๊ก เข้าใจแล้ว จึงยังไม่ลบ','bad');return}
  const targets=dups.length&&r===2?dups:all;let n=0,hidden=0;
  try{
    for(const d of targets){
      if(d.central){if(rev){await removePack(d.cloudId);DOCS=DOCS.filter(x=>x!==d);CARDS=CARDS.filter(c=>c.docId!==d.id);try{await kbDelMany('docs',[d.id])}catch(e){}n++}
        else{d.show=false;await saveDoc(d);hidden++}}
      else{await delLocalDoc(d.id);n++}
    }
  }catch(e){toast('ลบไม่สำเร็จ: '+String(e&&e.code||e&&e.message||e),'bad')}
  if(!SUBJ.some(x=>x.id===P.subject)||targets.some(d=>P.subject==='doc_'+d.id)){P.subject='ineq';save()}
  if(typeof rebuildCloudIndex==='function')rebuildCloudIndex();syncDocSubjects();renderSide();if(VIEW==='kb')renderKB();
  toast(`${targets===dups?'ลบชุดที่ซ้ำแล้ว':'ลบวิชาแล้ว'}${n?` ${n} ชุด`:''}${hidden?` · ซ่อน ${hidden} ชุด`:''}`);
}
const topicsOf=g=>g==='gen'?GEN_TOPICS:SPEC_TOPICS;
function subjDesc(s){const nb=bankFor(s).length,bt=nb?` · ข้อสอบจริงในคลัง ${nb} ข้อ`:'';return subjDesc0(s)+bt}
function subjDesc0(s){
  if(s.id==='specall'){const n=activeCards().filter(c=>SPEC_TOPICS.includes(c.topic)).length;return `${s.desc} · ${n?`อิงบัตรความรู้ ${n} ใบจากคลังความรู้`:'AI สร้างจากความรู้ทั่วไป ยังไม่มีเอกสารในคลัง'}`}
  if(s.group==='gen'&&!s.doc){const n=activeCards().filter(c=>inSubj(c,s.name)).length;if(n)return `${s.desc} · ${activeAI()?`ผสมโจทย์จากบัตรความรู้ ${n} ใบ`:`มีบัตรความรู้ ${n} ใบ (ตั้งค่า AI เพื่อใช้)`}`}
  if(s.doc){const d=DOCS.find(x=>x.id===s.doc);if(!d)return 'ไม่พบเอกสาร';const n=activeCards().filter(c=>c.docId===d.id).length;
    return n?`โจทย์สร้างจากบัตรความรู้ ${n} ใบที่ AI ย่อยจาก ${d.name} มีอ้างอิง${d.unit}ทุกข้อ`:`โจทย์สร้างจากเนื้อหา ${d.name} (ยังไม่ได้ย่อยเป็นบัตรความรู้)`}
  if(s.group==='spec'){const n=activeCards().filter(c=>inSubj(c,s.name)).length;
    return `${s.desc} · ${n?`อิงบัตรความรู้ ${n} ใบจากคลังความรู้`:kbContext([s.name]).text?'อิงเนื้อหาเอกสารในคลังความรู้':'AI สร้างจากความรู้ทั่วไป ยังไม่มีเอกสารในคลัง'}`}
  return s.desc;
}
function countHits(low,kws){let sc=0;for(const k of kws){const kl=k.toLowerCase();let i=0,c=0;while(c<20&&(i=low.indexOf(kl,i))>=0){c++;i+=kl.length}sc+=c}return sc}
/* fallback for documents not yet digested: keyword-picked page excerpts */
function kbContext(topics,max=9000){
  const kws=topics.flatMap(t=>{const x=SPEC.find(z=>z[1]===t);return x?x[3]:[t]});
  if(!DOCS.length||!kws.length)return{text:''};
  const scored=[];
  for(const d of DOCS){if(d.group==='gen'||CARDS.some(c=>c.docId===d.id))continue;for(const pg of d.pages){const sc=countHits(pg.text.toLowerCase(),kws);if(sc>=2)scored.push({d,pg,sc})}}
  scored.sort((a,b)=>b.sc-a.sc);
  let out='';
  for(const x of shuffle(scored.slice(0,12))){const part=`[${x.d.name} ${x.d.unit} ${x.pg.n}]\n${x.pg.text.slice(0,2500)}\n\n`;if(out.length+part.length>max)continue;out+=part}
  return{text:out.trim()};
}
function docTopics(d){
  const cs=CARDS.filter(c=>c.docId===d.id);
  if(cs.length){
    const m={};for(const c of cs)if(c.topic!=='อื่นๆ')m[c.topic]=(m[c.topic]||0)+1;
    const out=Object.entries(m).sort((a,b)=>b[1]-a[1]).map(([t,n])=>({name:t,count:n,link:false}));
    const counted=new Set(out.map(x=>x.name));
    const extra=cs.filter(c=>!c.topic||c.topic==='อื่นๆ'||!counted.has(c.topic)).length;   /* บัตรที่ยังไม่ถูกนับในวิชาไหน */
    for(const n of (d.subs||[]))if(!out.some(x=>x.name===n))out.push({name:n,count:extra,total:cs.length,link:true});   /* ผูกทั้งไฟล์ */
    return out.slice(0,8);
  }
  if(d.group==='gen')return[];
  const low=d.pages.map(p=>p.text).join('\n').toLowerCase();
  return SPEC.map(x=>({name:x[1],h:countHits(low,x[3])})).filter(x=>x.h>=3).sort((a,b)=>b.h-a.h).slice(0,5).map(x=>({name:x.name,count:0,link:false,guess:true}));
}
/* ชิปวิชาของไฟล์: ปุ่ม ✕ เอาไฟล์ออกจากวิชานั้นได้ทันที */
function chipHTML(d,tp){
  const who=isReviewerMe()||docMine(d);
  return tp.map(t=>{
    const label=(t.link?'🔗 ':'')+t.name+(t.link?(t.count?` +${t.count}`:''):(t.count?` ${t.count}`:''));
    const tip=t.link?`${t.name} · ผูกทั้งไฟล์ (ใช้บัตรร่วม ${t.total||0} ใบ)${t.count?` · เพิ่ม ${t.count} ใบที่ยังไม่ถูกนับในวิชาอื่น`:' · บัตรทุกใบถูกนับในวิชาอื่นแล้ว'}`:`${t.name} · ${t.count||0} รายการ`;
    const canX=who&&(t.link||(!d.central&&t.count>0));
    const x=canX?`<button class="tagx" type="button" data-unlink="${esc(t.name)}" aria-label="เอา ${esc(t.name)} ออกจากไฟล์นี้">✕</button>`:'';
    return `<span class="tag tagbtn${t.link?' taglink':''}" role="button" tabindex="0" data-chip="${esc(t.name)}" title="${esc(tip)}">${esc(label)}${x}</span>`}).join('');
}
/* ชุดในคลังกลาง: เก็บการผูกวิชาไว้บนคลาวด์ให้ทุกคนเห็น */
async function savePackSubs(d,subs){
  const f=await fb();
  await f.fs.updateDoc(fsDoc('kb',d.cloudId),{subs,updatedAt:f.fs.serverTimestamp()});
  d.subs=subs;await saveDoc(d);
}
/* กดชิปวิชา = ดูรายการบัตรของวิชานั้นในไฟล์นี้ */
async function showDocSubject(id,name){
  const d=DOCS.find(x=>x.id===id);if(!d)return;
  const linked=(d.subs||[]).includes(name);
  const cards=CARDS.filter(c=>c.docId===id&&inSubj(c,name));
  if(!cards.length){toast('ยังไม่มีบัตรของวิชานี้ในไฟล์','bad');return}
  const text=c=>c.type==='q'?'ข้อสอบ: '+String((c.q&&c.q.stem)||''):String(c.title||c.fact||'');
  const rows=cards.map((c,j)=>`<div class="lkrow"><span class="lktxt">${j+1}. ${esc(text(c)).slice(0,70)}</span><span class="src" style="flex:0 0 auto">${esc(c.topic||'อื่นๆ')}</span></div>`).join('');
  const r=await modal(`<p class="mt">บัตรของ “${esc(name)}” ในไฟล์นี้</p>
    <p class="src">${esc(d.name)} · ${cards.length} รายการ${linked?' · วิชานี้ผูกทั้งไฟล์ (🔗 ใช้บัตรร่วม)':''}</p>
    <div class="kcards lklist">${rows}</div>`,
    [{t:'ปิด'},{t:'เชื่อมต่อ/แก้วิชา',cls:'primary'}]);
  if(r===1)linkDocSubjects(id);
}
/* ✕ ข้างชิป: ปลดวิชา / ย้ายไปวิชาอื่น / ลบรายการของวิชานั้น */
async function unlinkDocSubject(id,topic){
  const d=DOCS.find(x=>x.id===id);if(!d)return;
  if(d.central&&!(d.subs||[]).includes(topic)){toast('ชิปนี้มาจากวิชาของบัตรในชุด (แก้ที่บัตรหรือให้ผู้ส่งแก้)','bad');return}
  if(d.central){
    if(await modal(`<p class="mt">เอา “${esc(topic)}” ออกจากชุดนี้?</p><p class="src">${esc(d.name)} · ชุดในคลังกลาง · บัตรไม่ถูกแก้ · ทุกคนจะเห็นการเปลี่ยนแปลงหลังซิงก์</p>`,[{t:'ยกเลิก'},{t:'เอาไฟล์ออกจากวิชานี้',cls:'primary'}])!==1)return;
    try{const subs=(d.subs||[]).filter(x=>x!==topic);await savePackSubs(d,subs);syncDocSubjects();renderSide();renderKB();toast(`เอา “${topic}” ออกจากชุดนี้แล้ว`)}
    catch(e){toast('ไม่สำเร็จ: '+String(e&&e.code||e&&e.message||e),'bad')}
    return;
  }
  if((d.subs||[]).includes(topic)){
    const cs=CARDS.filter(c=>c.docId===id),own=CARDS.filter(c=>c.docId===id&&c.topic===topic);
    const p=modal(`<p class="mt">เอา “${esc(topic)}” ออกจากไฟล์นี้?</p>
      <p class="src">${esc(d.name)} · ผูกทั้งไฟล์ไว้ (${cs.length} รายการใช้ร่วม) · เอาออกแล้วบัตรยังอยู่ครบ</p>
      ${own.length?`<label class="rad"><input type="checkbox" id="ul-cards"><span><b>ปลดบัตรที่ตั้งวิชานี้อยู่ด้วย (${own.length} ใบ → “อื่นๆ”)</b><span class="src">ถ้าไม่ติ๊ก บัตรยังเป็นวิชานี้ แต่ไฟล์จะไม่ถูกใช้อีก</span></span></label>`:''}`,
      [{t:'ยกเลิก'},{t:'เอาไฟล์ออกจากวิชานี้',cls:'primary'}]);
    if(await p!==1)return;
    d.subs=(d.subs||[]).filter(x=>x!==topic);
    const cb=document.getElementById('ul-cards');
    if(cb&&cb.checked&&own.length){for(const c of own){c.topic='อื่นๆ';c.editedAt=Date.now()}await saveCards(own)}
    await saveDoc(d);
    if(typeof syncPushMeta==='function')syncPushMeta(d);
    if(typeof syncPushCards==='function')syncPushCards(d,true);
    syncDocSubjects();renderSide();renderKB();
    toast(`เอาไฟล์ออกจากวิชา “${topic}” แล้ว`);
    return;
  }
  const cards=CARDS.filter(c=>c.docId===id&&c.topic===topic);
  if(!cards.length){toast('ไม่พบรายการของวิชานี้ในไฟล์','bad');return}
  const names=[...new Set(SUBJ.filter(s=>s.id!=='specall'&&!s.doc).map(s=>s.name))].filter(n=>n!==topic);
  const p=modal(`<p class="mt">เอา “${esc(topic)}” ออกจากไฟล์นี้?</p>
    <p class="src">${esc(d.name)} · ${cards.length} รายการ · ไฟล์ต้นฉบับไม่ถูกลบ</p>
    <label class="lbl" for="ul-to">เก็บรายการไว้ แต่ย้ายไปวิชา</label>
    <select class="tx" id="ul-to"><option value="">— ปลดวิชา (เก็บบัตรไว้ แต่ไม่ใช้ทำข้อสอบ) —</option>${names.map(n=>`<option value="${esc(n)}">${esc(n)}</option>`).join('')}</select>
    <label class="rad" style="margin-top:8px"><input type="checkbox" id="ul-del"><span><b>หรือลบ ${cards.length} รายการนี้ออกเลย</b><span class="src">กู้คืนไม่ได้ · ไฟล์ต้นฉบับยังอยู่</span></span></label>`,
    [{t:'ยกเลิก'},{t:'ยืนยัน',cls:'primary'}]);
  if(await p!==1)return;
  const del=!!(document.getElementById('ul-del')||{}).checked;
  const to=((document.getElementById('ul-to')||{}).value||'').trim();
  if(del){
    const ids=new Set(cards.map(c=>c.id));CARDS=CARDS.filter(c=>!ids.has(c.id));
    try{await kbDelMany('cards',[...ids])}catch(e){}
    d.delCards=[...new Set([...(d.delCards||[]),...ids])].slice(-1000);await saveDoc(d);
    if(typeof syncPushCards==='function')syncPushCards(d,true);
    toast(`ลบ ${cards.length} รายการของ “${topic}” แล้ว`);
  }else{
    const nt=to||'อื่นๆ';
    for(const c of cards){c.topic=nt;c.editedAt=Date.now()}
    await saveCards(cards);
    if(canEmbed())embedCards(cards).catch(()=>{});
    if(typeof syncPushCards==='function')syncPushCards(d,true);
    toast(to?`ย้าย ${cards.length} รายการไป “${to}” แล้ว`:`ปลด “${topic}” ออกจากไฟล์นี้แล้ว (บัตรยังอยู่)`);
  }
  syncDocSubjects();renderSide();renderKB();
}
/* ＋ เพิ่มวิชา: ผูกไฟล์นี้กับวิชาที่จะดึงข้อมูลไปออกข้อสอบ */
async function addDocSubject(id){
  const d=DOCS.find(x=>x.id===id);if(!d)return;
  if(d.central){
    const names=[...new Set(SUBJ.filter(s=>s.id!=='specall'&&!s.doc).map(s=>s.name))];
    const r=await modal(`<p class="mt">เพิ่มวิชาให้ชุดนี้</p>
      <p class="src">${esc(d.name)} · ชุดในคลังกลาง ทุกคนจะเห็นการผูกนี้หลังซิงก์ · บัตรไม่ถูกย้าย</p>
      <label class="lbl" for="as-s">วิชาที่จะใช้ข้อมูลชุดนี้</label>
      <select class="tx" id="as-s">${names.map(n=>`<option value="${esc(n)}">${esc(n)}</option>`).join('')}</select>`,
      [{t:'ยกเลิก'},{t:'เพิ่มวิชา',cls:'primary'}]);
    if(r!==1)return;
    const name=(document.getElementById('as-s')||{}).value||'';if(!name)return;
    try{await savePackSubs(d,[...new Set([...(d.subs||[]),name])]);syncDocSubjects();renderSide();renderKB();toast(`ผูกชุดนี้กับ “${name}” แล้ว`)}
    catch(e){toast('ไม่สำเร็จ: '+String(e&&e.code||e&&e.message||e),'bad')}
    return;
  }
  const all=CARDS.filter(c=>c.docId===id);
  if(!all.length){toast('ไฟล์นี้ยังไม่มีบัตรหรือข้อสอบให้ผูกวิชา','bad');return}
  const cur={};for(const c of all)cur[c.topic]=(cur[c.topic]||0)+1;
  const names=[...new Set(SUBJ.filter(s=>s.id!=='specall'&&!s.doc).map(s=>s.name))];
  const free=all.filter(c=>!c.topic||c.topic==='อื่นๆ').length;
  const p=modal(`<p class="mt">เพิ่มวิชาให้ไฟล์นี้</p>
    <p class="src">${esc(d.name)} · ${all.length} รายการ${Object.keys(cur).length?` · ตอนนี้: ${Object.entries(cur).map(([k,v])=>`${esc(k)} ${v}`).join(' · ')}`:''}</p>
    <label class="lbl" for="as-s">วิชาที่จะใช้ข้อมูลไฟล์นี้ทำข้อสอบ</label>
    <select class="tx" id="as-s">${names.map(n=>`<option value="${esc(n)}">${esc(n)}</option>`).join('')}</select>
    <label class="rad"><input type="radio" name="as-scope" value="link" checked><span><b>ผูกทั้งไฟล์กับวิชานี้ (ใช้บัตรร่วม ไม่ย้ายบัตร)</b><span class="src">บัตรของไฟล์นี้ใช้ได้ทั้งวิชาเดิมและวิชานี้</span></span></label>
    <label class="rad"><input type="radio" name="as-scope" value="free" ${free?'':'disabled'}><span><b>ย้ายเฉพาะรายการที่ยังไม่ผูกวิชา (${free})</b><span class="src">รายการอื่นคงวิชาเดิมไว้</span></span></label>
    <label class="rad"><input type="radio" name="as-scope" value="all"><span><b>ย้ายทุกรายการ (${all.length}) ไปวิชานี้</b><span class="src">ใช้เมื่อทั้งไฟล์เป็นเรื่องของวิชาเดียว</span></span></label>`,
    [{t:'ยกเลิก'},{t:'เพิ่มวิชา',cls:'primary'}]);
  if(await p!==1)return;
  const name=(document.getElementById('as-s')||{}).value||'';
  const scope=((document.querySelector('input[name="as-scope"]:checked')||{}).value)||'link';
  if(!name)return;
  if(scope==='link'){
    d.subs=[...new Set([...(d.subs||[]),name])];
    await saveDoc(d);
    if(typeof syncPushMeta==='function')syncPushMeta(d);
    syncDocSubjects();renderSide();renderKB();
    toast(`ผูกไฟล์นี้กับ “${name}” แล้ว · ใช้บัตรร่วมทั้งไฟล์`);
    return;
  }
  const target=scope==='free'?all.filter(c=>!c.topic||c.topic==='อื่นๆ'):all;
  if(!target.length){toast('ไม่มีรายการให้เปลี่ยน','bad');return}
  for(const c of target){c.topic=name;c.editedAt=Date.now()}
  await saveCards(target);
  if(canEmbed())embedCards(target).catch(()=>{});
  if(typeof syncPushCards==='function')syncPushCards(d,true);
  syncDocSubjects();renderSide();renderKB();
  toast(`ย้าย ${target.length} รายการไป “${name}” แล้ว`);
}
/* ---------- เชื่อมต่อไฟล์กับรายวิชา ----------
   แต่ละบัตร/ข้อสอบมีวิชาประจำตัว วิชาที่เลือกไว้คือวิชาที่ดึงข้อมูลไฟล์นี้ไปออกข้อสอบ
   ไฟล์เดียวจึงแยกข้อมูลให้หลายวิชาได้ (เช่น การเงินธนาคาร 11 รายการ + ความรู้ ธ.ก.ส. 2 รายการ) */
async function linkDocSubjects(id){
  const d=DOCS.find(x=>x.id===id);if(!d)return;
  if(!(typeof isReviewerMe==='function'&&isReviewerMe()||docMine(d))){toast('เชื่อมต่อได้เฉพาะเจ้าของไฟล์หรือผู้ตรวจ/แอดมิน','bad');return}
  const cards=CARDS.filter(c=>c.docId===id);
  if(!cards.length){toast('ไฟล์นี้ยังไม่มีบัตรหรือข้อสอบให้เชื่อมต่อ','bad');return}
  const names=[...new Set([...SUBJ.filter(s=>s.id!=='specall'&&!s.doc).map(s=>s.name),...cards.map(c=>c.topic).filter(Boolean)])];
  const opts=sel=>`<option value="">— เลือกวิชา —</option>`+names.map(n=>`<option value="${esc(n)}"${n===sel?' selected':''}>${esc(n)}</option>`).join('');
  const lab=c=>c.type==='q'?'ข้อสอบ: '+String((c.q&&c.q.stem)||'').slice(0,48):String(c.title||c.fact||'').slice(0,52);
  const rows=cards.map((c,j)=>`<div class="lkrow"><span class="lktxt">${j+1}. ${esc(lab(c))}</span><select class="tx lksel" data-lk="${esc(c.id)}">${opts(c.topic)}</select></div>`).join('');
  const p=modal(`<p class="mt">เชื่อมต่อกับรายวิชา</p>
    <p class="src">${esc(d.name)} · ${cards.length} รายการ · วิชาที่เลือกคือวิชาที่จะดึงข้อมูลไฟล์นี้ไปออกข้อสอบ (ไฟล์เดียวแบ่งให้หลายวิชาได้)</p>
    <div class="lkall"><span class="lbl">ตั้งทั้งหมดเป็น</span><select class="tx" id="lk-all">${opts('')}</select><button class="ghost" type="button" id="lk-apply">ใช้</button></div>
    <div class="kcards lklist">${rows}</div>`,[{t:'ยกเลิก'},{t:'บันทึก',cls:'primary'}]);
  const ap=document.getElementById('lk-apply');
  if(ap)ap.onclick=()=>{const v=document.getElementById('lk-all').value;if(!v)return;
    document.querySelectorAll('#dlg [data-lk]').forEach(s=>{s.value=v});toast(`ตั้งทั้งไฟล์เป็น "${v}" แล้ว · กดบันทึกเพื่อยืนยัน`)};
  if(await p!==1)return;
  const changed=[];
  for(const c of cards){const sel=document.querySelector(`#dlg [data-lk="${c.id}"]`);if(!sel)continue;
    const v=sel.value;if(v&&v!==c.topic){c.topic=v;c.editedAt=Date.now();changed.push(c)}}
  if(!changed.length){toast('ไม่มีการเปลี่ยนแปลง');return}
  await saveCards(changed);
  if(canEmbed())embedCards(changed).catch(()=>{});
  if(typeof syncPushCards==="function")syncPushCards(d,true);
  syncDocSubjects();renderSide();renderKB();
  toast(`เชื่อมต่อกับรายวิชาแล้ว · ${changed.length} รายการ`);
}
function docWindows(doc,max=12000){
  const w=[];let cur=[],len=0;
  for(const pg of doc.pages){if(!pg.text)continue;const t=pg.text.slice(0,max);if(len+t.length>max&&cur.length){w.push(cur);cur=[];len=0}cur.push({n:pg.n,text:t});len+=t.length}
  if(cur.length)w.push(cur);return w;
}
function docPrompt(doc,level,k,base,weak){
  const W=docWindows(doc),win=W[(DOC_OFF+Math.floor(base/20))%W.length];
  return `สร้างข้อสอบปรนัยใหม่ ${k} ข้อ จากเนื้อหาของเอกสาร "${doc.name}" ด้านล่างเท่านั้น สำหรับเตรียมสอบเข้าทำงานธนาคารเพื่อการเกษตรและสหกรณ์การเกษตร (ธ.ก.ส.)
ระดับความยาก ${level}: ${levelTxt(level)}
รหัสชุด ${Math.random().toString(36).slice(2,8)} (ใช้เพื่อให้โจทย์ไม่ซ้ำกับชุดก่อน)
${weak&&weak.length?`ผู้ทำเคยตอบผิดในโจทย์แนวนี้ ถ้าเนื้อหาเกี่ยวข้องให้มีโจทย์แนวคล้ายกันปนอยู่ 2–3 ข้อ:\n- ${weak.join('\n- ')}\n`:''}กติกา:
${VIZ_RULE}
- ทำความเข้าใจเนื้อหาก่อน แล้วถามว่าผู้สอบเข้าใจจริงไหม ไม่ใช่ลอกประโยคมาเว้นช่อง คำตอบที่ถูกต้องต้องยืนยันได้จากเนื้อหาเท่านั้น
- ถามประเด็นสำคัญที่น่าจะออกสอบ ห้ามถามเรื่องเลขหน้า ชื่อไฟล์ หรือรูปแบบเอกสาร กระจายให้ทั่วเนื้อหา ถ้าเนื้อหาไม่พอสำหรับ ${k} ข้อ ให้สร้างเท่าที่ทำได้โดยไม่ซ้ำ
- ref ของแต่ละข้อคือป้ายในวงเล็บเหลี่ยมของช่วงที่ใช้ เช่น "${doc.unit} ${win[0].n}"
- ทุกข้อมีตัวเลือก 4 ตัว ถูกเพียงตัวเดียว คละตำแหน่งคำตอบที่ถูก ห้ามมีข้อที่กำกวม
- เฉลยแต่ละข้อมี 2–4 ขั้น สั้น ภาษาง่าย แต่ละขั้นบอกที่มา (from)
- ใช้ภาษาไทย ถ้าเอกสารเป็นภาษาอังกฤษ โจทย์เป็นภาษาอังกฤษได้แต่เฉลยเป็นไทย ห้ามใช้ markdown ไม่ต้องใส่ ก ข ค ง หน้าตัวเลือก

เนื้อหาเอกสาร:
${win.map(p=>`[${doc.unit} ${p.n}]\n${p.text}`).join('\n\n')}

ตอบเป็น JSON เท่านั้น รูปแบบ:
{"questions":[{"stem":"โจทย์","choices":["ตัวเลือก1","ตัวเลือก2","ตัวเลือก3","ตัวเลือก4"],"answer":0,"viz":null,"ref":"${doc.unit} ${win[0].n}","steps":[{"text":"ขั้นอธิบาย","from":"ที่มา"}]}]}`;
}
function lookupRef(ref,doc){
  ref=String(ref||'').trim();if(!ref)return doc?{cite:doc.name,text:''}:null;
  const m=ref.match(/(\d+)\s*\]?\s*$/)||ref.match(/(\d+)/),num=m?+m[1]:NaN;
  const cands=doc?[doc]:DOCS.filter(d=>ref.includes(d.name)).sort((a,b)=>b.name.length-a.name.length);
  for(const d of cands){const pg=d.pages.find(p=>p.n===num);if(pg)return{cite:`${d.name} ${d.unit} ${num}`,text:pg.text.slice(0,3000)}}
  return doc?{cite:doc.name,text:''}:null;
}
function withCite(q,doc){const r=lookupRef(q.ref,doc);if(r){q.cite=r.cite;if(r.text)q.srcText=r.text}return q}

/* ---------- embeddings: meaning-based search ---------- */
const canEmbed=()=>{const p=activeAI();return p==='gemini'||p==='openai'};
/* อ่านรูปได้: ทุกตัวที่ใช้ key (Claude API และ Meta อ่านรูปได้ แต่ไม่มีดัชนีความหมาย) */
const canVision=()=>KEY_PROVS.includes(activeAI());
const dot=(a,b)=>{let s=0;for(let i=0;i<a.length;i++)s+=a[i]*b[i];return s};
function unit(v){let s=0;for(const x of v)s+=x*x;s=Math.sqrt(s)||1;return Float32Array.from(v,x=>x/s)}
async function embedOnce(p,batch,task){
  const req=async(url,headers,body)=>{let res;try{res=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(body)})}catch(e){throw{code:'network'}}if(!res.ok)await httpFail(res);return res.json()};
  if(p==='gemini'){let last;
    for(const m of ['gemini-embedding-001','text-embedding-004']){
      try{const d=await req(`https://generativelanguage.googleapis.com/v1beta/models/${m}:batchEmbedContents`,{'x-goog-api-key':AIP.gemini.key},
        {requests:batch.map(t=>({model:'models/'+m,content:{parts:[{text:t.slice(0,6000)}]},taskType:task,outputDimensionality:768}))});
        return{m:'g:'+m,v:d.embeddings.map(e=>e.values)}}
      catch(e){last=e;if(e.code==='bad_model')continue;throw e}}
    throw last;
  }
  const d=await req('https://api.openai.com/v1/embeddings',{'Authorization':'Bearer '+AIP.openai.key},{model:'text-embedding-3-small',input:batch.map(t=>t.slice(0,6000))});
  return{m:'o:text-embedding-3-small',v:d.data.map(e=>e.embedding)};
}
async function embedTexts(texts,task){
  if(!canEmbed())throw{code:'no_embed'};
  const p=activeAI(),out=[];let model=null;
  for(let i=0;i<texts.length;i+=100){
    let r;for(let att=0;;att++){try{r=await embedOnce(p,texts.slice(i,i+100),task);break}catch(e){if(e.code==='rate_limited'&&att<3){await sleep(4000*(att+1));continue}throw e}}
    out.push(...r.v);model=r.m;
  }
  return{model,vecs:out.map(unit)};
}
const cardText=c=>`${c.topic}: ${c.title}\n${c.fact}`;
async function embedCards(cs){
  if(!cs.length||!canEmbed())return;
  const {model,vecs}=await embedTexts(cs.map(cardText),'RETRIEVAL_DOCUMENT');
  cs.forEach((c,i)=>{c.emb=vecs[i];c.em=model});await saveCards(cs);
}
async function searchCards(q,k=4){
  const act=activeCards();if(!act.length)return[];
  if(canEmbed()&&act.some(c=>c.emb)){
    try{const {model,vecs}=await embedTexts([q],'RETRIEVAL_QUERY'),qv=vecs[0],min=model.startsWith('o:')?.3:.45;
      return act.filter(c=>c.emb&&c.em===model).map(c=>({c,s:dot(qv,c.emb)})).filter(x=>x.s>=min).sort((a,b)=>b.s-a.s).slice(0,k).map(x=>x.c)}catch(e){}
  }
  const words=q.split(/\s+/).filter(w=>w.length>1);
  return act.map(c=>({c,s:countHits((c.title+' '+c.fact).toLowerCase(),words)})).filter(x=>x.s>0).sort((a,b)=>b.s-a.s).slice(0,k).map(x=>x.c);
}
async function aiVisionJSON(text,images,{signal}={}){
  const p=activeAI();if(!KEY_PROVS.includes(p))throw{code:'no_vision'};
  return looseJSON(await keyCall(p,[{role:'user',content:{text,images}}],true,signal));
}

/* ---------- reading files (PDF via pdf.js, DOCX via JSZip, TXT/HTML natively) ---------- */
const LIBS={};
function loadScript(src){return LIBS[src]||(LIBS[src]=new Promise((ok,no)=>{const s=document.createElement('script');s.src=src;s.onload=ok;s.onerror=()=>{delete LIBS[src];s.remove();no(new Error('โหลดตัวอ่านไฟล์ไม่ได้ ตรวจอินเทอร์เน็ตแล้วลองใหม่'))};document.head.append(s)}))}
const PDFJS='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/',CMAPS='https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/';
const JSZIP='https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
const MAX_MB=300;
/* Thai fonts in many PDFs/Word files use private-use glyphs for shifted marks; map them back */
const PUA={0xF700:0x0E10,0xF701:0x0E34,0xF702:0x0E35,0xF703:0x0E36,0xF704:0x0E37,0xF705:0x0E48,0xF706:0x0E49,0xF707:0x0E4A,0xF708:0x0E4B,0xF709:0x0E4C,0xF70A:0x0E48,0xF70B:0x0E49,0xF70C:0x0E4A,0xF70D:0x0E4B,0xF70E:0x0E4C,0xF70F:0x0E0D,0xF710:0x0E31,0xF711:0x0E4D,0xF712:0x0E47,0xF713:0x0E48,0xF714:0x0E49,0xF715:0x0E4A,0xF716:0x0E4B,0xF717:0x0E4C,0xF718:0x0E38,0xF719:0x0E39,0xF71A:0x0E3A};
function tidy(t){
  return t.replace(/[-]/g,c=>String.fromCharCode(PUA[c.charCodeAt(0)]||c.charCodeAt(0)))
    .replace(/ํา/g,'ำ').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g,'').replace(/\r/g,'')
    .replace(/[ \t ]+/g,' ').replace(/ *\n */g,'\n').replace(/\n{3,}/g,'\n\n').trim();
}
/* a page needs the AI to read its image when the text layer is empty, has control chars, or tone marks came out as digits */
function badText(raw){
  return raw.replace(/\s/g,'').length<25||/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(raw)
    ||/[ัิ-ื็][0-9][ก-ฮ]/.test(raw)||(raw.match(/[\u0080-ÿ\uFFFD]/g)||[]).length>30;
}
function sectionize(paras,max=2500){
  const out=[];let cur='';
  for(const p of paras){const t=p.trim();if(!t)continue;if(cur&&cur.length+t.length>max){out.push(cur);cur=''}cur+=(cur?'\n':'')+t;
    while(cur.length>max*1.6){out.push(cur.slice(0,max));cur=cur.slice(max)}}
  if(cur)out.push(cur);
  return out.map((text,i)=>({n:i+1,text:tidy(text)}));
}
function decodeText(buf){let t=new TextDecoder('utf-8').decode(buf);if((t.match(/\uFFFD/g)||[]).length>5)t=new TextDecoder('windows-874').decode(buf);return t}
async function openPDF(buf){
  await loadScript(PDFJS+'pdf.min.js');const lib=window.pdfjsLib;lib.GlobalWorkerOptions.workerSrc=PDFJS+'pdf.worker.min.js';
  try{return await lib.getDocument({data:new Uint8Array(buf.slice(0)),cMapUrl:CMAPS,cMapPacked:true}).promise}
  catch(e){throw new Error(e&&e.name==='PasswordException'?'PDF นี้ตั้งรหัสผ่านไว้ ให้ปลดรหัสก่อนอัปโหลด':'เปิดไฟล์ PDF ไม่ได้ ไฟล์อาจเสีย')}
}
/* pages that draw pictures: embedded images, or many vector paths (diagrams, charts, spatial-reasoning figures) */
function pageHasFigure(ops,OPS){
  let img=0,path=0;
  for(const f of ops.fnArray){if(f===OPS.paintImageXObject||f===OPS.paintInlineImageXObject||f===OPS.paintImageMaskXObject||f===OPS.paintJpegXObject||f===OPS.paintImageXObjectRepeat)img++;else if(f===OPS.constructPath)path++}
  return img>0||path>=40;
}
async function readPDF(buf,onP){
  const pdf=await openPDF(buf),pages=[],bad=[],figPages=[],OPS=window.pdfjsLib.OPS;
  for(let i=1;i<=pdf.numPages;i++){
    const page=await pdf.getPage(i),tc=await page.getTextContent();let t='';
    for(const it of tc.items){if(!('str' in it))continue;const s=it.str;if(t&&s&&/[A-Za-z0-9]$/.test(t)&&/^[A-Za-z0-9]/.test(s))t+=' ';t+=s;if(it.hasEOL)t+='\n'}
    if(badText(t))bad.push(i);
    try{if(pageHasFigure(await page.getOperatorList(),OPS))figPages.push(i)}catch(e){}
    pages.push({n:i,text:tidy(t)});if(onP)onP(i,pdf.numPages);
  }
  return{unit:'หน้า',pages,bad,figPages};
}
async function pageImage(pdf,n){
  const pg=await pdf.getPage(n),v1=pg.getViewport({scale:1}),vp=pg.getViewport({scale:Math.min(2.2,1500/v1.width)});
  const cv=document.createElement('canvas');cv.width=Math.ceil(vp.width);cv.height=Math.ceil(vp.height);
  const ctx=cv.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,cv.width,cv.height);
  await pg.render({canvasContext:ctx,viewport:vp,intent:'print'}).promise; /* 'print' avoids requestAnimationFrame, which stalls while the tab is in the background */
  return{mime:'image/jpeg',data:cv.toDataURL('image/jpeg',.82).split(',')[1],canvas:cv};
}
const MIME_BY_EXT={png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',gif:'image/gif',webp:'image/webp',bmp:'image/bmp',svg:'image/svg+xml',emf:'image/emf',wmf:'image/wmf',tif:'image/tiff',tiff:'image/tiff'};
/* figure placeholders "[รูป F…]" stay in the text so the AI knows where each picture sits; page = section that holds it */
function placeFigs(pages,figs){for(const f of figs){const pg=pages.find(p=>p.text.includes(`[รูป ${f.id}]`));f.page=pg?pg.n:1}return figs}
async function readDOCX(buf){
  await loadScript(JSZIP);
  let zip;try{zip=await window.JSZip.loadAsync(buf)}catch(e){throw new Error('เปิดไฟล์ DOCX ไม่ได้ ไฟล์อาจเสีย')}
  const x=zip.file('word/document.xml');if(!x)throw new Error('ไฟล์นี้ไม่ใช่เอกสาร Word (.docx)');
  const doc=new DOMParser().parseFromString(await x.async('string'),'application/xml');
  const W='http://schemas.openxmlformats.org/wordprocessingml/2006/main',A='http://schemas.openxmlformats.org/drawingml/2006/main',
    RN='http://schemas.openxmlformats.org/officeDocument/2006/relationships',V='urn:schemas-microsoft-com:vml',paras=[],figs=[];let skipped=0;
  const rels={},rf=zip.file('word/_rels/document.xml.rels');
  if(rf){const rd=new DOMParser().parseFromString(await rf.async('string'),'application/xml');for(const r of rd.getElementsByTagName('Relationship'))rels[r.getAttribute('Id')]=r.getAttribute('Target')}
  const seen={};
  async function figFor(rid){
    if(seen[rid])return seen[rid];const tg=rels[rid];if(!tg)return null;
    const path=tg.startsWith('/')?tg.slice(1):('word/'+tg).replace(/[^/]+\/\.\.\//g,''),zf=zip.file(path);if(!zf)return null;
    const ext=(path.split('.').pop()||'').toLowerCase(),mime=MIME_BY_EXT[ext]||'';
    if(!SHOWABLE.test(mime)){skipped++;return null}
    const f={id:'F'+newId(),mime,blob:new Blob([await zf.async('arraybuffer')],{type:mime}),desc:'',at:Date.now()};figs.push(f);return seen[rid]=f;
  }
  for(const p of doc.getElementsByTagNameNS(W,'p')){
    let t='';for(const n of p.getElementsByTagNameNS(W,'*')){if(n.localName==='t')t+=n.textContent;else if(n.localName==='tab')t+=' ';else if(n.localName==='br')t+='\n'}
    for(const b of [...p.getElementsByTagNameNS(A,'blip')].map(e=>e.getAttributeNS(RN,'embed')).concat([...p.getElementsByTagNameNS(V,'imagedata')].map(e=>e.getAttributeNS(RN,'id')))){
      const f=b&&await figFor(b);if(f)t+=` [รูป ${f.id}] `}
    if(t.trim())paras.push(t);
  }
  const pages=sectionize(paras);
  return{unit:'ส่วนที่',pages,figs:placeFigs(pages,figs),figSkipped:skipped};
}
const readTXT=buf=>({unit:'ส่วนที่',pages:sectionize(decodeText(buf).split(/\n/))});
async function readHTML(buf){
  const doc=new DOMParser().parseFromString(decodeText(buf),'text/html'),figs=[];let skipped=0;
  doc.querySelectorAll('script,style,noscript,template').forEach(e=>e.remove());
  for(const im of [...doc.querySelectorAll('img')]){
    const src=im.getAttribute('src')||'';let blob=null;
    if(/^data:image\//.test(src)||/^https?:/.test(src)){try{const r=await fetch(src);if(r.ok)blob=await r.blob()}catch(e){}}
    if(blob&&SHOWABLE.test(blob.type)){const f={id:'F'+newId(),mime:blob.type,blob,desc:im.getAttribute('alt')||'',at:Date.now()};figs.push(f);im.replaceWith(` [รูป ${f.id}] `)}
    else{skipped++;im.remove()}
  }
  doc.querySelectorAll('svg').forEach(e=>e.remove());
  doc.querySelectorAll('p,div,li,tr,br,h1,h2,h3,h4,h5,h6,section,article,td,th,dd,dt').forEach(e=>e.after('\n'));
  const pages=sectionize((doc.body?doc.body.textContent:'').split(/\n/));
  return{unit:'ส่วนที่',pages,figs:placeFigs(pages,figs),figSkipped:skipped};
}
const extOf=n=>((String(n||'').match(/\.([^.]+)$/)||[])[1]||'').toLowerCase();
const mimeOf=n=>{const e=extOf(n);return e==='pdf'?'application/pdf':e==='docx'?'application/vnd.openxmlformats-officedocument.wordprocessingml.document':e==='txt'?'text/plain':(e==='html'||e==='htm')?'text/html':''};
async function readFile(file,onP){
  return readBuffer(file.name,await file.arrayBuffer(),onP,file.size);
}
/* อ่านไฟล์จากไบต์ (ไม่ต้องเป็น File) — ใช้ทั้งตอนเลือกไฟล์ในเครื่องและตอนดึงไฟล์กลับจาก Google Drive */
async function readBuffer(name,buf,onP,size){
  const ext=extOf(name),bytes=size||buf.byteLength||0;
  if(bytes>MAX_MB*1024*1024)throw new Error(`ไฟล์ใหญ่เกิน ${MAX_MB} MB ลองแยกไฟล์เป็นหลายส่วน (เช่น ทีละบท) แล้วอัปโหลดทีละไฟล์`);
  if(ext==='doc')throw new Error('ไฟล์ .doc รุ่นเก่ายังไม่รองรับ ให้เปิดใน Word แล้วบันทึกเป็น .docx');
  const r=ext==='pdf'?await readPDF(buf,onP):ext==='docx'?await readDOCX(buf):ext==='txt'?readTXT(buf):(ext==='html'||ext==='htm')?await readHTML(buf):null;
  if(!r)throw new Error('ยังไม่รองรับไฟล์ชนิดนี้ (รองรับ PDF, DOCX, TXT, HTML)');
  const chars=r.pages.reduce((a,p)=>a+p.text.length,0);
  if(chars<50&&!(r.bad&&r.bad.length)&&!(r.figs&&r.figs.length))throw new Error('อ่านข้อความจากไฟล์นี้ได้น้อยเกินไป');
  return{...r,ext,chars,buf:ext==='pdf'?buf:null};
}

/* ---------- processing pipeline: ocr → digest → embed → conflict → ready (resumable) ---------- */
const visionTodo=d=>[...new Set([...(d.bad||[]),...(d.figPages||[])])].filter(n=>!(d.ocrDone||[]).includes(n)).sort((a,b)=>a-b);
const STAGE_TXT={queued:'อยู่ใน Google Drive แล้ว · รอเริ่มย่อย',read:'รออ่านไฟล์จาก Google Drive',ocr:'รอ AI อ่านหน้าที่ข้อความเพี้ยนและหน้าที่มีรูป',digest:'รอ AI ย่อยความรู้',embed:'รอทำดัชนีค้นหาตามความหมาย',conflict:'รอเทียบกับเอกสารเดิม',ready:'พร้อมใช้'};
function estCalls(d){
  const ocr=d.stage==='ocr'?Math.ceil(visionTodo(d).length/4):0;
  const dig=['ocr','digest'].includes(d.stage)?Math.max(1,docWindows(d,10000).length-(d.digDone||0)):0;
  return ocr+dig+(d.stage!=='ready'?2:0);
}
function queueDoc(id){if(!PROCQ.includes(id)&&PROC_ID!==id)PROCQ.push(id);runQueue()}
async function runQueue(){
  if(PROC_ID)return;
  while(PROCQ.length){const id=PROCQ.shift(),doc=DOCS.find(d=>d.id===id);if(!doc)continue;PROC_ID=doc.id;try{await processDoc(doc)}finally{PROC_ID=null}}
}
const setProg=(doc,t)=>{doc.prog=t;const e=document.querySelector(`[data-prog="${doc.id}"]`);if(e)e.textContent=t;else renderKB()};
/* ---------- ไฟล์ที่อัปโหลดขึ้น Google Drive ก่อน ----------
   ตอนเลือกไฟล์จะส่งต้นฉบับขึ้น Drive ทันที แล้วสร้างเอกสารสถานะ queued (ยังไม่อ่าน/ยังไม่ย่อย)
   พอถึงคิวประมวลผลจึงดึงไฟล์กลับมาอ่าน ทำให้ผู้ใช้ไม่ต้องรอ AI ตอนอัปโหลด และปิดหน้าไปได้
   ไบต์ที่เพิ่งอัปโหลดในแท็บนี้ยังอยู่ในหน่วยความจำ → ใช้ตัวนั้นเลย ไม่ดาวน์โหลดซ้ำ · เก็บไว้ไม่เกิน 2 ไฟล์ */
const DOCBUF=new Map();let DOCBUF_BYTES=0;
function dropBuf(id){const b=DOCBUF.get(id);if(b){DOCBUF.delete(id);DOCBUF_BYTES-=b.byteLength||0}}
/* เก็บไบต์ที่เพิ่งอัปโหลดไว้ให้คิวใช้ต่อ ไม่ต้องดาวน์โหลดซ้ำ · จำกัด 2 ไฟล์/256 MB กันหน่วยความจำบวม
   ถ้าถูกทิ้งไปก่อนถึงคิว ระบบจะดึงจาก Drive กลับมาแทน (ทำงานถูกเหมือนเดิม) */
function keepBuf(id,buf){
  dropBuf(id);DOCBUF.set(id,buf);DOCBUF_BYTES+=buf.byteLength||0;
  while(DOCBUF.size>2||DOCBUF_BYTES>256*1048576){const k=DOCBUF.keys().next().value;if(k===id)break;dropBuf(k)}
}
async function docBuf(doc){
  if(DOCBUF.has(doc.id))return DOCBUF.get(doc.id);
  const f=await kbGet('files',doc.id);if(f&&f.buf)return f.buf;
  const id=doc.driveId||doc.srcFile;
  if(!id)throw{code:'no_file'};
  if(typeof ME==='undefined'||!ME)throw{code:'drive',why:'ต้องเข้าสู่ระบบก่อน จึงจะดึงไฟล์ต้นฉบับจาก Google Drive ได้'};
  try{await ensureSrcDirs()}catch(e){}
  try{return await srcBytes({id,name:doc.name,size:doc.size||0,up:''})}
  catch(e){throw{code:'drive',why:'ดึงไฟล์จาก Google Drive ไม่ได้: '+(e&&(e.message||e.why)||'ตรวจว่าไฟล์ยังอยู่และยังแชร์ให้ทุกคนที่มีลิงก์ดูได้')}}
}
/* ดึงจาก Drive (หรือใช้ไบต์ที่เพิ่งอัปโหลด) แล้วอ่านข้อความ/รูป เหมือนตอนเลือกไฟล์ในเครื่อง */
async function readDriveDoc(doc){
  setProg(doc,'กำลังดึงไฟล์จาก Google Drive');
  const buf=await docBuf(doc);
  setProg(doc,'กำลังอ่านไฟล์');
  const r=await readBuffer(doc.name,buf,(i,n)=>setProg(doc,`อ่านแล้ว ${i} จาก ${n} หน้า`),buf.byteLength);
  Object.assign(doc,{type:r.ext,unit:r.unit,pages:r.pages,chars:r.chars,bad:r.bad||[],figPages:r.figPages||[],readAt:Date.now(),pagesRemote:false});
  doc.txtSha=await textShaOf(r.pages);
  if(doc.txtSha){
    const dup=DOCS.find(d=>d!==doc&&docMine(d)&&d.txtSha===doc.txtSha);
    if(dup){doc.dupOf=dup.id;doc.stage='ready';doc.digDone=1;doc.err='';doc.warn='';await saveDoc(doc);syncDocSubjects();if(typeof syncPushMeta==='function')syncPushMeta(doc);return}
  }
  if(doc.kindAuto!==false)doc.kind=detectKind(r.pages,doc.name);
  if(r.figs&&r.figs.length)await saveFigs(r.figs.map(x=>({...x,docId:doc.id})));
  doc.stage=(r.bad&&r.bad.length)||(r.figPages&&r.figPages.length)?'ocr':'digest';
  await saveDoc(doc);syncDocSubjects();
  /* ส่งหน้าขึ้นคลาวด์ให้เสร็จก่อนเริ่มย่อย เพื่อให้อีกเครื่องรับงานต่อได้ทันทีถ้าเครื่องนี้ปิด */
  if(typeof syncPushPages==='function'){try{await syncPushPages(doc)}catch(e){}}
  if(typeof syncPushMeta==='function')syncPushMeta(doc);
}
async function processDoc(doc){
  doc.err='';
  if(!activeAI()){doc.err='ตั้งค่า AI ในแถบซ้ายก่อน แล้วกด ประมวลผลต่อ';await saveDoc(doc);renderKB();return}
  /* จองงานข้ามเครื่อง: ถ้าเครื่องอื่นกำลังทำ หรือทำเสร็จแล้ว ให้ข้าม ไม่เสียเครดิต AI ซ้ำ */
  let leaseTimer=null;
  if(typeof syncClaim==='function'){
    const cl=await Promise.race([syncClaim(doc),new Promise(r=>setTimeout(()=>r({ok:true}),4000))]);
    if(!cl.ok){
      doc.err=cl.ready?'ไฟล์นี้ประมวลผลเสร็จบนอีกเครื่องแล้ว · กำลังโหลดผลลัพธ์':'กำลังประมวลผลที่เครื่องอื่น · รอสักครู่แล้วลองใหม่';
      await saveDoc(doc);renderKB();
      if(cl.ready)setTimeout(()=>syncPull().catch(()=>{}),300);
      return;
    }
    doc.reprocess=false;
    leaseTimer=setInterval(()=>syncLease(doc),60000);
    syncPushMeta(doc);
  }
  setProg(doc,'กำลังเริ่ม...');
  try{
    if((!doc.pages||!doc.pages.length)&&doc.pagesParts>0&&typeof ensureDocPages==='function')await ensureDocPages(doc);
    if((doc.driveId||doc.srcFile)&&(!doc.pages||!doc.pages.length))await readDriveDoc(doc);
    if(doc.dupOf){toast(`${doc.name} มีเนื้อหาเดียวกับเอกสารเดิม · ข้ามการประมวลผลซ้ำ`);return}
    if(doc.stage==='queued')doc.stage='digest';
    if(doc.stage==='ocr'){if(canVision())await ocrDoc(doc);else doc.warn='AI ที่ตั้งไว้อ่านภาพหน้า PDF ไม่ได้ ใช้ข้อความที่ดึงได้ไปก่อน และยังดึงรูปจาก PDF ไม่ได้';doc.stage='digest';await saveDoc(doc)}
    if(doc.stage==='digest'&&doc.kindAuto&&!doc.digDone){const k=detectKind(doc.pages,doc.name);if(k!==doc.kind){doc.kind=k;await saveDoc(doc)}}
    if(doc.stage==='digest'){if(!docWindows(doc).length)throw{code:'no_text'};await digestDoc(doc);doc.stage='embed';await saveDoc(doc)}
    if(doc.stage==='embed'){if(canEmbed()){setProg(doc,'กำลังทำดัชนีค้นหาตามความหมาย');await embedCards(CARDS.filter(c=>c.docId===doc.id&&!c.emb))}doc.stage='conflict';await saveDoc(doc)}
    if(doc.stage==='conflict'){if(canEmbed()){setProg(doc,'กำลังเทียบกับเอกสารเดิม หาเนื้อหาที่ขัดกัน');await findConflicts(doc)}doc.stage='ready';await saveDoc(doc)}
    doc.tries=0;doc.nextTry=0;doc.errCode='';
    if(doc.newSubj)setTimeout(()=>addSubjectFromDoc(doc),20);
    setTimeout(()=>autoShare(doc),50);
    toast(`${doc.name} พร้อมแล้ว · ${doc.kind==='exam'?`ข้อสอบ ${CARDS.filter(c=>c.docId===doc.id&&c.type==='q').length} ข้อ`:`บัตรความรู้ ${CARDS.filter(c=>c.docId===doc.id).length} ใบ`}`);
  }catch(e){
    const code=e&&e.code;
    doc.errCode=code||'';
    doc.err=code==='drive'?((e&&e.why)||'ดึงไฟล์จาก Google Drive ไม่ได้')+' · กด ประมวลผลต่อ เพื่อลองใหม่':code==='no_text'?'ไม่มีข้อความให้ย่อย':code==='no_file'?'ไม่พบไฟล์ต้นฉบับ ให้อัปโหลดใหม่':errCopy(code,'ประมวลผลเอกสาร')+(e&&e.model?` [${AINAME[e.prov]||e.prov} · โมเดล ${e.model}]`:'')+' แล้วกด ประมวลผลต่อ (ทำต่อจากจุดเดิม)';
    await saveDoc(doc);
  }finally{
    if(leaseTimer)clearInterval(leaseTimer);
    dropBuf(doc.id);doc.prog='';renderKB();renderSide();
    if(typeof syncPushDoc==='function')(async()=>{try{await syncPushDoc(doc,{force:false})}catch(e){}await syncRelease(doc)})();
  }
}
/* AI looks at page images: re-reads text where the text layer is broken, and finds figures (boxes) to crop and keep */
async function ocrDoc(doc){
  doc.ocrDone=doc.ocrDone||[];
  const todo=visionTodo(doc);if(!todo.length)return;
  const buf=await docBuf(doc);if(!buf)throw{code:'no_file'};
  const pdf=await openPDF(buf),bad=new Set(doc.bad||[]);let fail=0;
  for(let i=0;i<todo.length;i+=4){
    const nums=todo.slice(i,i+4);setProg(doc,`AI กำลังอ่านภาพหน้าเอกสาร (ข้อความเพี้ยนหรือมีรูป) ${Math.min(i+4,todo.length)} จาก ${todo.length} หน้า`);
    const imgs=[];for(const n of nums)imgs.push(await pageImage(pdf,n));
    let got=[];
    try{const r=await aiVisionJSON(`อ่านภาพหน้าเอกสาร ${nums.length} ภาพต่อไปนี้ ภาพเรียงตามลำดับ ${nums.map(n=>'หน้า '+n).join(', ')} แล้วทำ 2 อย่าง
1) text: ถอดข้อความให้ตรงตามต้นฉบับทุกตัวอักษร ภาษาไทยต้องมีสระและวรรณยุกต์ครบถูกตำแหน่ง ไม่สรุป ไม่แปล ไม่แต่งเพิ่ม คงลำดับหัวข้อและย่อหน้า ตารางที่เป็นข้อความให้เขียนทีละแถว คั่นช่องด้วย | ข้ามเลขหน้าและหัวกระดาษท้ายกระดาษที่ซ้ำทุกหน้า ตรงตำแหน่งที่มีรูปในข้อ 2 ให้ใส่ [รูป 1] [รูป 2] ตามลำดับรูปในหน้านั้น หน้าที่ไม่มีข้อความให้เป็น ""
2) figures: รูปที่มีสาระต่อการทำข้อสอบ เช่น รูปโจทย์มิติสัมพันธ์ รูปพับกล่อง รูปตัวเลือกที่เป็นภาพ แผนภูมิ กราฟ แผนผัง แผนที่ ภาพประกอบเนื้อหา ห้ามรวมโลโก้ ตราสัญลักษณ์ ภาพตกแต่ง เส้นคั่น และตารางที่ถอดเป็นข้อความได้แล้ว
   - box_2d คือ [ymin, xmin, ymax, xmax] สเกล 0–1000 ของภาพหน้านั้น ครอบให้ครบทั้งรูป รวมป้ายกำกับและตัวเลือก ก ข ค ง ที่เป็นส่วนของรูป
   - ถ้าโจทย์ข้อเดียวมีรูปโจทย์และรูปตัวเลือกอยู่ใกล้กัน ให้ครอบรวมเป็นกรอบเดียว
   - desc อธิบายรูปสั้นๆ ว่าเป็นรูปอะไร และถ้าเป็นโจทย์ ถามอะไร
   - ถ้าโจทย์และตัวเลือกเป็นข้อความที่อ่านได้ (เช่น ภาพหน้าจอแบบทดสอบ สไลด์คำถาม) ให้ถอดเป็นข้อความใน text อย่างเดียว ห้ามตัดเป็นรูป เพราะรูปแบบนี้มักมีเฉลยติดมา (เช่น ตัวเลือกที่ถูกไฮไลต์สีต่าง) ตัดรูปเฉพาะเมื่อโจทย์อ้างถึงรูป ตาราง กราฟ แผนภูมิ หรือตัวเลือกเป็นรูป
   - ห้ามตัดลายเซ็น ลายมือชื่อ โลโก้ ตราสัญลักษณ์ ตราประทับ รูปถ่ายบุคคล QR code ลายน้ำ และภาพตกแต่ง เพราะใช้ออกข้อสอบไม่ได้
   - หน้าที่ไม่มีรูปแบบนี้ให้ figures เป็น []
ตอบเป็น JSON เท่านั้น: {"pages":[{"n":${nums[0]},"text":"ข้อความทั้งหน้า","figures":[{"box_2d":[100,80,600,920],"desc":"คำอธิบายรูป"}]}]}`,imgs.map(({mime,data})=>({mime,data})));
      got=r&&Array.isArray(r.pages)?r.pages:[]}
    catch(e){if(e&&(e.code==='empty_completion'||e.code==='invalid_json'))fail+=nums.length;else throw e}
    for(let j=0;j<nums.length;j++){
      const n=nums[j],g=got.find(x=>+x.n===n)||got[j]||{},pg=doc.pages.find(p=>p.n===n)||(doc.pages.push({n,text:''}),doc.pages.find(p=>p.n===n));
      let t=bad.has(n)?tidy(String(g.text||'')):'';
      const newFigs=[];
      for(const [k,fg] of (Array.isArray(g.figures)?g.figures:[]).slice(0,8).entries()){
        if(!Array.isArray(fg.box_2d)||fg.box_2d.length!==4||JUNK_FIG.test(String(fg.desc||'')))continue;
        const c=await cropFig(imgs[j].canvas,fg.box_2d);
        const rec={id:'F'+newId(),docId:doc.id,page:n,mime:c.mime,blob:c.blob,w:c.w,h:c.h,desc:String(fg.desc||'').slice(0,300),at:Date.now()+k};
        newFigs.push(rec);
        if(t&&t.includes(`[รูป ${k+1}]`))t=t.replace(`[รูป ${k+1}]`,`[รูป ${rec.id}]`);
      }
      if(t)pg.text=t;
      for(const r of newFigs)if(!pg.text.includes(`[รูป ${r.id}]`))pg.text+=`\n[รูป ${r.id}] ${r.desc}`;
      await saveFigs(newFigs);doc.ocrDone.push(n);
    }
    doc.pages.sort((a,b)=>a.n-b.n);doc.chars=doc.pages.reduce((a,p)=>a+p.text.length,0);await saveDoc(doc);
    /* ส่งข้อความหน้าเป็นระยะ (ทุก ~20 หน้า) ไม่ใช่ทุกชุด 4 หน้า กันการอัปโหลดซ้ำบ่อยเกินไป */
    if(typeof syncQueue==='function'&&(i===0||i%20===0||i+4>=todo.length))syncQueue(doc,{pages:true,figs:true});
  }
  doc.warn=fail?`AI อ่านภาพไม่ได้ ${fail} หน้า (ใช้ข้อความที่ดึงได้แทน)`:'';
}
function digestPrompt(doc,win,figs,onlyFigs){
  return `คุณเป็นผู้เชี่ยวชาญเตรียมสอบเข้าทำงานธนาคารเพื่อการเกษตรและสหกรณ์การเกษตร (ธ.ก.ส.) อ่านเนื้อหาจากเอกสาร "${doc.name}" ด้านล่างให้เข้าใจ แล้วสกัดเป็น "บัตรความรู้" สำหรับใช้ออกข้อสอบภายหลัง
กติกา:
- 1 บัตร = 1 ความรู้ที่สมบูรณ์ในตัว อ่านบัตรเดียวแล้วเข้าใจได้โดยไม่ต้องเห็นเอกสาร ระบุบริบทให้ครบ เช่น ชื่อกฎหมาย ผลิตภัณฑ์ หน่วยงาน
- fact เขียน 2–5 ประโยคเป็นภาษาที่คนเพิ่งเริ่มเรียนอ่านเข้าใจ ขยายคำย่อ อธิบายศัพท์เฉพาะ เรียงเหตุผลให้ต่อเนื่อง ยกตัวอย่างสั้นๆ ถ้าช่วยให้เข้าใจ ห้ามเขียนเป็นวลีห้วนๆ หรือรหัสย่อที่ไม่อธิบาย
- เก็บเฉพาะสาระที่ออกสอบได้: นิยาม หลักการ เงื่อนไข ข้อยกเว้น ขั้นตอน ตัวเลข ระยะเวลา อัตรา สิทธิและหน้าที่ บทลงโทษ ความแตกต่างของสิ่งที่คล้ายกัน
- ข้ามสารบัญ คำนำ หัวกระดาษ ท้ายกระดาษ และข้อความซ้ำ ไม่ต้องทำบัตรเรื่องเล็กน้อยที่ไม่มีทางออกสอบ
- ห้ามเติมความรู้ที่ไม่มีในเนื้อหา ตัวเลขต้องตรงตามเอกสาร ถ้าข้อความต้นฉบับพิมพ์ผิดหรือวรรณยุกต์เพี้ยนแต่ความหมายชัด ให้เขียนให้ถูก
- topic เลือกจาก: ${topicsOf(doc.group).join(', ')} หรือ อื่นๆ
- kind เลือกจาก: นิยาม, หลักการ, เงื่อนไข, ข้อยกเว้น, ขั้นตอน, ตัวเลข, สิทธิหน้าที่, บทลงโทษ, เปรียบเทียบ, ข้อเท็จจริง, สูตรหรือวิธีคิด, ไวยากรณ์หรือการใช้ภาษา${doc.group==='gen'?`
- เอกสารนี้เป็นกลุ่มความรู้ความสามารถทั่วไป ถ้าเป็นเทคนิคหรือตัวอย่างโจทย์ ให้สรุปเป็นวิธีคิดที่นำไปใช้กับโจทย์ใหม่ได้ (ไม่ต้องเก็บตัวเลขของตัวอย่าง)`:''}
- importance 1–3 (3 = สำคัญมาก ออกสอบบ่อย)
- page คือเลขในป้าย [${doc.unit} ...] ของเนื้อหาที่บัตรนั้นมาจาก
- summary คือสรุปเนื้อหาช่วงนี้ 2–3 ประโยค
- ห้ามใช้ markdown${figs&&figs.length?`
- มีภาพแนบ ${figs.length} ภาพ เรียงตามลำดับรหัส: ${figs.join(', ')} ในเนื้อหาจะเห็นป้าย [รูป รหัส] ตรงตำแหน่งของรูป
- บัตรที่ต้องดูรูปจึงจะเข้าใจหรือตอบได้ ให้ใส่ figs เป็นรายการรหัสรูป ห้ามทิ้งรูปที่มีสาระ
- ถ้ารูปเป็นโจทย์ (เช่น มิติสัมพันธ์ แผนภูมิให้อ่านค่า) ให้ทำบัตร kind "โจทย์มีรูป" 1 บัตรต่อ 1 โจทย์ fact บอกว่าโจทย์ถามอะไร ตัวเลือกคืออะไร และคำตอบที่ถูกพร้อมเหตุผล
  ถ้าเอกสารมีเฉลยให้ใช้เฉลยในเอกสาร และ answerSource เป็น "เอกสาร" ถ้าไม่มีเฉลย ให้วิเคราะห์จากรูปอย่างรอบคอบทีละขั้น แล้ว answerSource เป็น "AI"${onlyFigs?`
- รอบนี้ทำบัตรเฉพาะที่เกี่ยวกับภาพที่แนบเท่านั้น บัตรเนื้อหาอื่นทำไปแล้ว`:''}`:''}

เนื้อหา:
${win.map(p=>`[${doc.unit} ${p.n}]\n${p.text}`).join('\n\n')}

ตอบเป็น JSON เท่านั้น รูปแบบ:
{"summary":"สรุป","cards":[{"title":"หัวเรื่องสั้น","topic":"หัวข้อ","kind":"ชนิด","fact":"ความรู้ 2–5 ประโยค อ่านเข้าใจง่าย","page":${win[0].n},"importance":2${figs&&figs.length?',"figs":[],"answerSource":""':''}}]}`;
}
async function digestDoc(doc){
  if(doc.kind==='exam')return extractDoc(doc);
  const W=docWindows(doc,10000);doc.summ=doc.summ||[];
  for(let i=doc.digDone||0;i<W.length;i++){
    setProg(doc,`AI กำลังย่อยความรู้ ช่วงที่ ${i+1} จาก ${W.length}`);
    const pages=W[i].map(p=>p.n);
    /* figures referenced in this window go along as images, 8 per call; later calls only make figure cards */
    const figIds=canVision()?[...new Set(W[i].flatMap(p=>[...p.text.matchAll(/\[รูป (F[a-z0-9]+)\]/g)].map(m=>m[1])))].filter(okFig):[];
    const batches=[];for(let b=0;b<figIds.length;b+=8)batches.push(figIds.slice(b,b+8));if(!batches.length)batches.push([]);
    for(const [bi,ids] of batches.entries()){
      const images=[],sent=[];for(const id of ids){const im=await figForAI(id);if(im){images.push(im);sent.push(id)}}
      const prompt=digestPrompt(doc,W[i],sent,bi>0);
      let r=null;
      for(let att=0;att<2&&!r;att++){try{r=images.length?await aiVisionJSON(prompt,images):await aiJSON(prompt)}catch(e){if(!(e&&e.code==='invalid_json'))throw e}}
      const arr=(r&&Array.isArray(r.cards)?r.cards:[]).filter(c=>c&&typeof c.fact==='string'&&c.fact.trim().length>8).map(c=>{
        const figs=(Array.isArray(c.figs)?c.figs:[]).map(String).filter(id=>sent.includes(id));
        return{id:newId(),docId:doc.id,title:String(c.title||c.fact).slice(0,120),topic:doc.topic||(topicsOf(doc.group).includes(c.topic)?c.topic:'อื่นๆ'),kind:String(c.kind||'ข้อเท็จจริง'),
          fact:c.fact.trim(),page:pages.includes(+c.page)?+c.page:(figs.length?FIGS.get(figs[0]).page:pages[0]),imp:Math.max(1,Math.min(3,Math.round(+c.importance||2))),at:Date.now(),st:{},
          figs,ansSrc:figs.length?(String(c.answerSource||'').includes('เอกสาร')?'doc':'AI'):''}});
      const seen=new Set(CARDS.map(cardKey)),keep=[];
      for(const c of arr){const k=cardKey(c);if(seen.has(k))continue;seen.add(k);keep.push(c)}
      if(arr.length>keep.length)doc.dupSkipped=(doc.dupSkipped||0)+(arr.length-keep.length);
      CARDS.push(...keep);await saveCards(keep);
      if(bi===0&&r&&r.summary)doc.summ[i]=String(r.summary);
    }
    doc.digDone=i+1;await saveDoc(doc);
    if(typeof syncQueue==='function')syncQueue(doc,{cards:true});
  }
}
/* exam files: pull every multiple-choice question out as-is (answer key may sit elsewhere in the file, so it rides along) */
function extractPrompt(doc,win,figs,keyText){
  return `เอกสาร "${doc.name}" เป็นข้อสอบหรือตัวอย่างโจทย์ ดึงข้อสอบปรนัยทุกข้อในเนื้อหาด้านล่างออกมาตามต้นฉบับ เพื่อเก็บเป็นคลังข้อสอบ
กติกา:
${VIZ_RULE}
- 1 รายการ = 1 ข้อ stem คือโจทย์ตามต้นฉบับ แก้ได้เฉพาะคำที่อ่านเพี้ยนจากไฟล์ ถ้าโจทย์ต้องอ่านข้อความหรือตารางร่วม ให้ใส่ข้อความนั้นใน stem ด้วย
- choices คือตัวเลือกตามลำดับเดิม ไม่ต้องใส่ ก ข ค ง หรือ 1 2 3 4 นำหน้า ถ้าตัวเลือกเป็นรูปที่อยู่ในภาพ ให้ใส่ป้ายตามที่เห็นในรูป เช่น "ก" "ข" "ค" "ง"
- answer คือลำดับตัวเลือกที่ถูก เริ่มจาก 0 ถ้าเอกสารมีเฉลย (ในช่วงนี้หรือในส่วนเฉลยที่แนบ) ให้ใช้เฉลยนั้น และ answerSource เป็น "เอกสาร"
  ถ้าไม่มีเฉลย ให้แก้โจทย์เองอย่างรอบคอบทีละขั้น แล้ว answerSource เป็น "AI" ถ้าไม่แน่ใจจริงๆ ให้ answer เป็น -1
- explanation คือเหตุผล 1–3 ขั้น ถ้าเอกสารมีคำอธิบายให้ใช้ของเอกสาร
- topic เลือกจาก: ${topicsOf(doc.group).join(', ')} หรือ อื่นๆ
- page คือเลขในป้าย [${doc.unit} ...] ของข้อนั้น
- ข้ามข้อที่ไม่ใช่ปรนัย และข้อที่โจทย์ขาดหายจนทำไม่ได้${figs.length?`
- มีภาพแนบ ${figs.length} ภาพ เรียงตามลำดับรหัส: ${figs.join(', ')} ในเนื้อหาจะเห็นป้าย [รูป รหัส] ตรงตำแหน่งของรูป ข้อที่ต้องดูรูปให้ใส่ figs เป็นรหัสรูปนั้น (ถ้ารูปเป็นแค่ภาพของตัวโจทย์และตัวเลือกที่เป็นข้อความ ให้ถอดเป็น stem/choices แล้วให้ figs เป็น [] เพราะรูปแบบนี้มักมีเฉลยติดมา) ห้ามทิ้งรูปของโจทย์`:''}
- ห้ามใช้ markdown
${keyText?`\nส่วนเฉลยที่พบในเอกสาร (ใช้จับคู่กับเลขข้อ):\n${keyText}\n`:''}
เนื้อหา:
${win.map(p=>`[${doc.unit} ${p.n}]\n${p.text}`).join('\n\n')}

ตอบเป็น JSON เท่านั้น รูปแบบ:
{"questions":[{"no":"1","topic":"หัวข้อ","stem":"โจทย์","choices":["ตัวเลือก1","ตัวเลือก2","ตัวเลือก3","ตัวเลือก4"],"answer":0,"viz":null,"answerSource":"เอกสาร","explanation":["เหตุผล"],"figs":[],"page":${win[0].n}}]}`;
}
async function extractDoc(doc){
  const W=docWindows(doc,9000);
  const keyText=doc.pages.filter(p=>/เฉลย|answer\s*key|คำตอบที่ถูก/i.test(p.text)).map(p=>`[${doc.unit} ${p.n}]\n${p.text}`).join('\n').slice(0,3500);
  for(let i=doc.digDone||0;i<W.length;i++){
    setProg(doc,`AI กำลังดึงข้อสอบออกจากไฟล์ ช่วงที่ ${i+1} จาก ${W.length}`);
    const pages=W[i].map(p=>p.n);
    const figIds=canVision()?[...new Set(W[i].flatMap(p=>[...p.text.matchAll(/\[รูป (F[a-z0-9]+)\]/g)].map(m=>m[1])))].filter(okQFig).slice(0,12):[];
    const images=[],sent=[];for(const id of figIds){const im=await figForAI(id);if(im){images.push(im);sent.push(id)}}
    const prompt=extractPrompt(doc,W[i],sent,keyText);
    let r=null;
    for(let att=0;att<2&&!r;att++){try{r=images.length?await aiVisionJSON(prompt,images):await aiJSON(prompt)}catch(e){if(!(e&&e.code==='invalid_json'))throw e}}
    const arr=(r&&Array.isArray(r.questions)?r.questions:[]).filter(q=>q&&typeof q.stem==='string'&&q.stem.trim()&&Array.isArray(q.choices)&&q.choices.length>=2).map(q=>{
      const figs=(Array.isArray(q.figs)?q.figs:[]).map(String).filter(id=>sent.includes(id)),choices=q.choices.slice(0,6).map(String);
      const ans=Number.isInteger(+q.answer)&&+q.answer>=0&&+q.answer<choices.length?+q.answer:-1;
      const steps=(Array.isArray(q.explanation)?q.explanation:[q.explanation]).filter(Boolean).map(String);
      return{id:newId(),docId:doc.id,type:'q',no:String(q.no||''),title:q.stem.trim().slice(0,90),topic:doc.topic||(topicsOf(doc.group).includes(q.topic)?q.topic:'อื่นๆ'),kind:'ข้อสอบ',
        fact:`${q.stem.trim()}\nตัวเลือก: ${choices.join(' | ')}${ans>=0?`\nตอบ: ${choices[ans]}`:''}`,page:pages.includes(+q.page)?+q.page:pages[0],imp:2,at:Date.now(),st:{},
        figs,ansSrc:ans<0?'':String(q.answerSource||'').includes('เอกสาร')?'doc':'AI',q:{stem:q.stem.trim(),choices,answer:ans,steps,viz:cleanViz(q.viz)}}});
    const seen=new Set(CARDS.filter(c=>c.type==='q'&&c.q).map(c=>qKey(c.q))),keep=[];
    for(const c of arr){const k=qKey(c.q);if(seen.has(k))continue;seen.add(k);keep.push(c)}
    if(arr.length>keep.length)doc.dupSkipped=(doc.dupSkipped||0)+(arr.length-keep.length);
    CARDS.push(...keep);await saveCards(keep);
    doc.digDone=i+1;await saveDoc(doc);
    if(typeof syncQueue==='function')syncQueue(doc,{cards:true});
  }
}
async function findConflicts(doc){
  const mine=CARDS.filter(c=>c.docId===doc.id&&c.emb&&c.type!=='q'),others=CARDS.filter(c=>c.docId!==doc.id&&c.emb&&c.type!=='q');
  if(!mine.length||!others.length)return;
  const pairs=[];
  for(const c of mine){let best=null,bs=0;for(const o of others){if(o.em!==c.em)continue;const s=dot(c.emb,o.emb);if(s>bs){bs=s;best=o}}
    if(best&&bs>=(c.em.startsWith('o:')?.7:.85))pairs.push({c,o:best,s:bs})}
  pairs.sort((a,b)=>b.s-a.s);
  for(let i=0;i<Math.min(pairs.length,60);i+=30){
    const ch=pairs.slice(i,i+30);
    const r=await aiJSON(`เทียบบัตรความรู้เป็นคู่ คู่ละ 2 ใบ ใบ "เดิม" มาจากเอกสารที่มีอยู่แล้ว ใบ "ใหม่" มาจากเอกสารที่เพิ่งเพิ่ม
ตอบว่าแต่ละคู่ขัดแย้งกันไหม ขัดแย้ง = พูดถึงเรื่องเดียวกันแต่ตัวเลข เงื่อนไข หรือข้อสรุปต่างกันจนใช้ตอบข้อสอบข้อเดียวกันได้คำตอบต่างกัน
ถ้าแค่เสริมกัน พูดคนละแง่ หรือเป็นคนละเรื่อง ให้ตอบ false
${ch.map((p,j)=>`คู่ ${j}:\nเดิม (${cardCite(p.o)}): ${p.o.fact}\nใหม่ (${cardCite(p.c)}): ${p.c.fact}`).join('\n\n')}
ตอบเป็น JSON เท่านั้น: {"results":[{"i":0,"conflict":false,"note":"ถ้าขัดกัน บอกสั้นๆ ว่าต่างกันตรงไหน"}]}`);
    const changed=[];
    for(const x of (r&&Array.isArray(r.results)?r.results:[])){const p=ch[+x.i];if(p&&x.conflict===true){p.c.conf={other:p.o.id,note:String(x.note||''),use:'new'};changed.push(p.c)}}
    await saveCards(changed);
  }
}

/* ---------- upload ---------- */
const radio=(name,val,cur,label,sub)=>`<label class="rad"><input type="radio" name="${name}" value="${val}"${val===cur?' checked':''}><span><b>${label}</b>${sub?`<span class="src">${sub}</span>`:''}</span></label>`;
function subjPickHTML(cur){
  const opt=s=>`<option value="${esc(s.name)}"${s.name===cur?' selected':''}>${esc(s.name)}</option>`;
  const gen=SUBJ.filter(s=>s.group==='gen'),spec=SUBJ.filter(s=>s.group==='spec'&&s.id!=='specall');
  return `<fieldset class="ufs"><legend>รายวิชาของไฟล์นี้</legend>
    <select id="usub" style="width:100%" onchange="document.getElementById('unewsubw').hidden=this.value!=='__new'">
      <option value="">ให้ AI จัดหัวข้อเอง (ไฟล์มีหลายเรื่อง)</option>
      <optgroup label="${esc(SPEC_LABEL)}">${spec.map(opt).join('')}</optgroup><optgroup label="ความรู้ความสามารถทั่วไป">${gen.map(opt).join('')}</optgroup>
      ${typeof isReviewerMe==='function'&&isReviewerMe()?'<option value="__new">＋ เพิ่มวิชาใหม่...</option>':''}
    </select>
    <div id="unewsubw" hidden><input id="unewsub" class="cetx" style="width:100%;margin-top:6px" placeholder="ชื่อวิชาใหม่"><input id="unewdesc" class="cetx" style="width:100%;margin-top:6px" placeholder="ขอบเขตเนื้อหา (ไม่ใส่ก็ได้) ช่วยให้ AI ออกโจทย์ตรง">
      <p class="src">วิชาใหม่จะอยู่ในกลุ่มที่เลือกด้านบน และขึ้นในเมนูเมื่อ AI ย่อยไฟล์นี้เสร็จและมีข้อมูลแล้ว</p></div></fieldset>`;
}
/* ตรวจประเภทไฟล์อัตโนมัติ (ข้อสอบ/ตัวอย่างโจทย์ หรือ เนื้อหา)
   หา "ชุดตัวเลือก" ที่เรียงกันอย่างน้อย 3 ตัว ทุกรูปแบบ: ก. ข. ค. · (1) (2) (3) · 1) 2) · 1. 2. 3. · A B C · a. b. c. และแบบ ถาม-ตอบ (บรรทัด "ตอบ")
   ตัวเลือกแบบตัวเลขนับเฉพาะเมื่อมีคำถามนำ (ข้อใด อะไร เท่าใด กี่ ? …) กันข้อย่อยในตัวบทกฎหมาย/รายการเนื้อหา
   แล้ววัดว่าเนื้อไฟล์เป็นโจทย์กี่ส่วน: เป็นโจทย์ ≥45% (และหนาแน่นพอ) = ข้อสอบ · ไฟล์เกิน 60 หน้าต้องเป็นโจทย์ ≥60%
   ชื่อไฟล์ช่วยตัดสิน (ข้อสอบ แบบทดสอบ โจทย์ เฉลย ถาม-ตอบ) เมื่อมีโจทย์บ้าง หรือเป็นไฟล์สแกนที่อ่านข้อความไม่ได้ */
const KIND_NAME=/ข้อสอบ|แบบทดสอบ|แบบฝึก|โจทย์|เฉลย|ถาม-ตอบ|ถามตอบ|คำถาม|ตะลุย|exam|quiz|test/i;
function kindStats(pages){
  const lines=(pages||[]).map(p=>p.text||'').join('\n').split('\n'),total=lines.reduce((x,l)=>x+l.trim().length,0)||1;
  const fam=[['ก','ข','ค','ง'],['a','b','c','d'],['1','2','3','4']],cue=/ข้อใด|อะไร|เท่าใด|เท่าไร|กี่|ใดต่อไปนี้|\?|…|\.\.\./;
  const marks=l=>{const out=[],str=' '+l,re=/(?:^|\s|\t)[(\[]?([กขคงabcdABCD1-5])[.)\]]?(?=\s|\S)/g;let m;
    while((m=re.exec(str))){const ch=m[1].toLowerCase(),raw=m[0];
      const delim=/[.)\](\[]/.test(raw)||(/^[A-D]$/.test(raw.trim())&&/\s/.test(str[m.index+raw.length]||''));
      if(!delim&&!'กขคง'.includes(ch))continue;
      for(let f=0;f<fam.length;f++){const k=fam[f].indexOf(ch);if(k>=0)out.push([f,k])}}
    return out};
  let q=0,qChars=0,i=0;
  while(i<lines.length){
    const l=lines[i].trim();
    if(/^ตอบ[\s:]/.test(l)){q++;qChars+=l.length+(lines[i-1]||'').trim().length;i++;continue}
    let found=false;
    for(const [f] of marks(l).filter(([,k])=>k===0)){
      let need=1,j=i,span=0,chars=0;const seen=new Set();
      while(j<lines.length&&span<10&&need<3){for(const [g,k] of marks(lines[j]))if(g===f&&k===need)need++;if(!seen.has(j)){chars+=lines[j].trim().length;seen.add(j)}if(need>=3)break;j++;span++}
      if(need<3)continue;
      const prev=(lines[i-1]||'')+' '+(lines[i-2]||'');if(f===2&&!cue.test(prev)&&!cue.test(l))continue;
      q++;qChars+=chars+prev.trim().length;i=j+1;found=true;break;
    }
    if(!found)i++;
  }
  const n=Math.max(1,(pages||[]).length);
  return{q,ratio:qChars/total,dens:q/n,pages:n,perPage:total/n};
}
function detectKind(pages,name){
  const r=kindStats(pages),big=r.pages>60,hint=KIND_NAME.test(name||'');
  if(r.q>=3&&(big?r.ratio>=.6:(r.ratio>=.45&&r.dens>=.6)||(r.ratio>=.3&&r.dens>=1.2)))return'exam';
  if(hint&&!big&&(r.q>=3||r.perPage<150))return'exam';
  return'kb';
}
function docOptHTML(g,show,kind,noShare,withKind){
  return `${withKind?`<fieldset class="ufs"><legend>ประเภทไฟล์ (ระบบตรวจให้อัตโนมัติ เปลี่ยนได้ถ้าผิด)</legend>${radio('uk','kb',kind||'kb','เนื้อหา/คลังข้อมูล','ตำรา คู่มือ ระเบียบ สรุปเนื้อหา · AI ย่อยเป็นบัตรความรู้แล้วคิดโจทย์ใหม่')}${radio('uk','exam',kind||'kb','ข้อสอบ/ตัวอย่างโจทย์','ข้อสอบเก่า แนวข้อสอบ แบบฝึกหัด · ดึงทุกข้อมาใช้ตรงๆ และเป็นแบบอย่างสร้างข้อใหม่')}</fieldset>`:''}
    <fieldset class="ufs"><legend>กลุ่มวิชาของเอกสาร</legend>${radio('ug','spec',g,'ความรู้เฉพาะตำแหน่ง','สินเชื่อ NCB PDPA ระเบียบ ธ.ก.ส. ฯลฯ')}${radio('ug','gen',g,'ความรู้ความสามารถทั่วไป','คณิตศาสตร์ อนุกรม เงื่อนไข ภาษาไทย ภาษาอังกฤษ')}</fieldset>
    <label class="rad"><input type="checkbox" id="unoshare"${noShare?' checked':''}><span><b>เก็บไว้ใช้คนเดียว ไม่ส่งเข้าคลังกลาง</b><span class="src">ปกติไฟล์ที่ประมวลผลเสร็จจะถูกส่งเข้าคลังกลางให้ทุกคนใช้อัตโนมัติ ห้ามส่งเอกสารลับหรือข้อมูลส่วนบุคคลของผู้อื่น</span></span></label>
    <fieldset class="ufs"><legend>การใช้งาน</legend>${radio('us','db',show?'show':'db','ใช้เป็นฐานข้อมูลอย่างเดียว','AI ย่อยความรู้แล้วนำไปออกข้อสอบในวิชาของกลุ่มนี้ตามหัวข้อที่ตรงกัน')}${radio('us','show',show?'show':'db','แสดงเป็นรายวิชาด้วย','มีวิชาชื่อเดียวกับไฟล์ในกลุ่มนี้ ไว้ฝึกจากเอกสารนี้โดยเฉพาะ')}</fieldset>`;
}
const readSubjOpt=()=>{const v=(document.getElementById('usub')||{}).value||'';if(v!=='__new')return{topic:v,newSubj:false};const n=((document.getElementById('unewsub')||{}).value||'').trim();return n?{topic:n,newSubj:true,topicDesc:((document.getElementById('unewdesc')||{}).value||'').trim()}:{topic:'',newSubj:false}};
const readDocOpt=()=>({noShare:!!(document.getElementById('unoshare')||{}).checked,kind:(document.querySelector('#dlg input[name="uk"]:checked')||{}).value||'kb',group:(document.querySelector('#dlg input[name="ug"]:checked')||{}).value||'spec',show:((document.querySelector('#dlg input[name="us"]:checked')||{}).value)==='show'});
/* ลายนิ้วมือไฟล์ SHA-256 */
async function fileSha(buf){try{const h=await crypto.subtle.digest('SHA-256',buf instanceof ArrayBuffer?buf:buf.buffer||buf);return [...new Uint8Array(h)].map(b=>b.toString(16).padStart(2,'0')).join('')}catch(e){return ''}}
/* ลายนิ้วมือเนื้อหา: ไฟล์เดียวกันแต่บันทึกใหม่/เปลี่ยนชื่อ จะได้ค่าเดียวกัน (ตัดช่องว่างซ้ำ) */
async function textShaOf(pages){
  const txt=(pages||[]).map(p=>String(p.text||'').replace(/\s+/g,' ').trim()).filter(Boolean).join('\n');
  return txt?await fileSha(new TextEncoder().encode(txt)):'';
}
/* ชุดในคลังกลางที่เป็นไฟล์เดียวกัน: ลายนิ้วมือตรง หรือ (ชุดเก่าที่ยังไม่มีลายนิ้วมือ) ชื่อไฟล์ตรงกัน */
function centralDupOf(sha,name){
  const packs=DOCS.filter(d=>d.central);
  return (sha&&packs.find(d=>d.sha===sha))||packs.find(d=>!d.sha&&srcKeys(d.name).some(k=>srcKeys(name).includes(k)))||null;
}
/* ไฟล์นี้มีในคลังกลางแล้ว: ไม่ต้องให้ AI ย่อยซ้ำ แค่ส่งต้นฉบับขึ้น Drive แล้วผูกกับชุดนั้น (ผู้ตรวจ/แอดมิน) */
async function attachToCentral(pack,name,buf,job){
  const has=srcFor(pack);
  if(has){toast(`${name} มีในคลังกลางแล้ว (${pack.name}) และมีไฟล์ต้นฉบับแล้ว ข้ามให้`);return}
  if(!buf||!isReviewerMe()){toast(`${name} มีในคลังกลางแล้ว (${pack.name}) ไม่ต้องประมวลผลซ้ำ`);return}
  const j={name,msg:'มีในคลังกลางแล้ว · กำลังส่งไฟล์ต้นฉบับขึ้น Google Drive...'};UPQ.push(j);renderKB();
  try{
    const sha=await fileSha(buf);
    const r=await withRetry(()=>uploadOriginal(name,buf,/\.pdf$/i.test(name)?'application/pdf':'',x=>{j.msg=`มีในคลังกลางแล้ว · ส่งต้นฉบับขึ้น Drive ${Math.round(x*100)}%`;const e=document.querySelector(`[data-job="${UPQ.indexOf(j)}"]`);if(e)e.textContent=j.msg},sha));
    await setPackSrc(pack,r.id);UPQ.splice(UPQ.indexOf(j),1);toast(`ผูกต้นฉบับ ${name} กับชุด ${pack.name} แล้ว`);
  }catch(e){j.err=`มีในคลังกลางแล้ว แต่ส่งต้นฉบับขึ้น Drive ไม่สำเร็จ: ${e&&e.why||e&&e.message||e}`}
}
async function handleFiles(files,opt){
  files=[...files];if(!files.length)return;
  if(VIEW!=='kb')setView('kb');
  let driveOK=false;
  if(!opt){
    if(ME){try{await ensureSrcDirs();driveOK=SRC.dirs.some(d=>d.up)}catch(e){}}
    const df=driveOK&&P.upFirst!==false;
    if(await modal(`<p class="mt">อัปโหลด ${files.length} ไฟล์</p><p class="src">${esc(files.map(f=>f.name).join(', ')).slice(0,200)}</p>
      ${driveOK?`<fieldset class="ufs"><legend>วิธีอัปโหลด</legend><label class="rad"><input type="checkbox" id="udrivefirst"${df?' checked':''}><span><b>อัปโหลดขึ้น Google Drive ก่อน แล้วค่อยย่อยทีหลัง</b><span class="src">ไฟล์ขึ้น Drive ทันที ระบบย่อยให้เบื้องหลัง ปิดหน้านี้ได้ ไม่ต้องรอ · กลับมาเปิดเว็บอีกครั้ง (เครื่องเดิม) ระบบทำต่อจาก Drive ให้เอง</span></span></label><p class="src">ถ้าไม่ติ๊ก ระบบจะอ่านและย่อยในเครื่องนี้ก่อนเหมือนเดิม (ต้องเปิดหน้านี้ไว้จนเสร็จ)</p></fieldset>`:''}
      ${subjPickHTML('')}${docOptHTML(P.upGroup||'spec',!!P.upShow,P.upKind||'kb')}`,[{t:'ยกเลิก'},{t:'อัปโหลด',cls:'primary'}])!==1)return;
    opt={...readDocOpt(),...readSubjOpt()};
    P.upGroup=opt.group;P.upShow=opt.show;P.upKind=opt.kind;
    if(driveOK){opt.driveFirst=!!(document.getElementById('udrivefirst')||{}).checked;P.upFirst=opt.driveFirst}
    save();
  }
  const wantDrive=opt.driveFirst===true;
  for(const f of files){
    const job={name:f.name,msg:wantDrive?'กำลังเตรียมไฟล์...':'กำลังอ่านไฟล์...'};UPQ.push(job);renderKB();
    const say=m=>{job.msg=m;const e=document.querySelector(`[data-job="${UPQ.indexOf(job)}"]`);if(e)e.textContent=m};
    try{
      const ext=extOf(f.name);
      if(ext==='doc')throw new Error('ไฟล์ .doc รุ่นเก่ายังไม่รองรับ ให้เปิดใน Word แล้วบันทึกเป็น .docx');
      if(!['pdf','docx','txt','html','htm'].includes(ext))throw new Error('ยังไม่รองรับไฟล์ชนิดนี้ (รองรับ PDF, DOCX, TXT, HTML)');
      if(f.size>MAX_MB*1024*1024)throw new Error(`ไฟล์ใหญ่เกิน ${MAX_MB} MB ลองแยกไฟล์เป็นหลายส่วน (เช่น ทีละบท) แล้วอัปโหลดทีละไฟล์`);
      const buf=await f.arrayBuffer(),sha=await fileSha(buf);
      const old=DOCS.find(d=>d.name===f.name&&!d.central);
      /* อัปโหลดไฟล์เดิม (ชื่อเดิม + เนื้อหาเดิม): อัปเดตแค่การตั้งค่า ไม่ประมวลผลซ้ำ */
      if(old&&old.sha&&old.sha===sha){
        Object.assign(old,{group:opt.group,show:opt.show,noShare:!!opt.noShare,topic:opt.topic||old.topic,newSubj:opt.newSubj||old.newSubj,topicDesc:opt.topicDesc||old.topicDesc});
        await saveDoc(old);syncDocSubjects();if(typeof syncPushMeta==='function')syncPushMeta(old);
        UPQ.splice(UPQ.indexOf(job),1);
        toast(`${f.name} มีอยู่ในเครื่องแล้วและเนื้อหาเหมือนเดิม · ${old.stage==='ready'?'ไม่ประมวลผลซ้ำ':'ทำต่อจากจุดเดิม'}`);
        if(old.stage!=='ready'&&activeAI())queueDoc(old.id);
        renderKB();continue;
      }
      /* ไฟล์ซ้ำ: เทียบลายนิ้วมือไฟล์ (เนื้อไฟล์เหมือนกันแม้ชื่อต่าง) กับไฟล์ในเครื่องและชุดในคลังกลาง */
      const dupLocal=DOCS.find(d=>!d.central&&d.sha===sha&&d!==old);
      if(dupLocal){UPQ.splice(UPQ.indexOf(job),1);toast(`${f.name} ซ้ำกับไฟล์ที่มีอยู่แล้ว (${dupLocal.name}) ข้ามให้`);renderKB();continue}
      const dupCentral=centralDupOf(sha,f.name);
      if(dupCentral){UPQ.splice(UPQ.indexOf(job),1);await attachToCentral(dupCentral,f.name,buf,job);renderKB();continue}
      /* มีไฟล์เดียวกันอยู่ในบัญชีแล้ว (เช่น อัปโหลดจากอีกเครื่อง) → ใช้ของเดิม ไม่ส่ง/ย่อยซ้ำ */
      if(ME&&typeof syncRemoteBySha==='function'){
        /* เช็กไฟล์ซ้ำในบัญชีแบบไม่ให้การอัปโหลดรอ Firestore นานเกิน 2.5 วิ (เน็ตช้า/ออฟไลต์) */
        const rdup=await Promise.race([syncRemoteBySha(sha).catch(()=>null),new Promise(r=>setTimeout(()=>r(null),2500))]);
        if(rdup&&!rdup.deleted){UPQ.splice(UPQ.indexOf(job),1);toast(`${f.name} อยู่ในบัญชีแล้ว · ใช้ไฟล์เดิม (ไม่ต้องประมวลผลซ้ำ)`);await syncAdopt(rdup);renderKB();continue}
      }
      /* 1) ส่งต้นฉบับขึ้น Drive ก่อน — ไม่ต้องรอ AI จึงปิดหน้าได้ทันทีหลังส่งเสร็จ
             ถ้าส่งไม่ได้ (ยังไม่ตั้ง Drive/พื้นที่เต็ม/เน็ตหลุด) จะถอยไปอ่านในเครื่องแทน ไม่ให้งานหลุด */
      let up=null;
      if(wantDrive){
        /* มีไฟล์เนื้อหาเดียวกันบน Drive แล้ว → ใช้ไฟล์เดิม ไม่สร้างซ้ำ */
        let hit=null;
        if(ME&&typeof driveFindSha==='function')hit=await Promise.race([driveFindSha(sha).catch(()=>null),new Promise(r=>setTimeout(()=>r(null),2500))]);
        if(hit){up={id:hit.id,dir:hit.dir};toast(`ไฟล์นี้อยู่ใน Google Drive แล้ว (${hit.name||f.name}) · ใช้ไฟล์เดิม ไม่สร้างซ้ำ`)}
        else try{up=await uploadOriginal(f.name,buf,mimeOf(f.name),x=>say(`ส่งขึ้น Google Drive ${Math.round(x*100)}%`),sha)}
        catch(e){toast(`ส่งขึ้น Google Drive ไม่ได้ (${e&&e.why||'ตรวจการตั้งค่า Drive'}) · ระบบจะอ่านและย่อยในเครื่องนี้แทน`,'bad')}
      }
      if(old){if(old.sha&&old.sha!==sha&&typeof syncDeleteDoc==='function')syncDeleteDoc(old);const ids=CARDS.filter(c=>c.docId===old.id).map(c=>c.id);CARDS=CARDS.filter(c=>c.docId!==old.id);try{await kbDelMany('cards',ids)}catch(e){}await dropFigs(docFigs(old.id).map(f=>f.id));try{await kbDelMany('files',[old.id])}catch(e){}dropBuf(old.id);DOCS.splice(DOCS.indexOf(old),1)}
      if(up){
        const doc={id:old?old.id:newId(),name:f.name,sha,kindAuto:true,topic:opt.topic||'',newSubj:!!opt.newSubj,topicDesc:opt.topicDesc||'',type:ext,size:f.size,at:Date.now(),unit:'หน้า',pages:[],chars:0,bad:[],
          group:opt.group,show:opt.show,kind:'kb',noShare:!!opt.noShare,figPages:[],stage:'queued',ocrDone:[],digDone:0,summ:[],err:'',cardsResetAt:Date.now(),delCards:[],
          ownerUid:ME?ME.uid:'',driveId:up.id,driveDir:up.dir||'',srcFile:up.id,stored:'drive'};
        if(activeAI())keepBuf(doc.id,buf);
        await saveDoc(doc);DOCS.push(doc);syncDocSubjects();
        UPQ.splice(UPQ.indexOf(job),1);
        toast(`${f.name} อยู่บน Google Drive แล้ว · ระบบจะย่อยให้เบื้องหลัง ปิดหน้านี้ได้`);
        if(typeof syncPushMeta==='function')syncPushMeta(doc);
        if(activeAI())queueDoc(doc.id);
      }else{
        /* 2) อ่าน/ย่อยในเครื่อง (วิธีเดิม หรือกรณีส่งขึ้น Drive ไม่สำเร็จ) */
        const r=await readBuffer(f.name,buf,(i,n)=>say(`อ่านแล้ว ${i} จาก ${n} หน้า`),f.size);
        const txtSha=await textShaOf(r.pages);
        const dupText=txtSha?DOCS.find(d=>d!==old&&d.txtSha===txtSha):null;
        if(dupText){UPQ.splice(UPQ.indexOf(job),1);toast(`${f.name} มีเนื้อหาเดียวกับ "${dupText.name}" · ข้ามไฟล์ซ้ำ`,'bad');renderKB();continue}
        const doc={id:old?old.id:newId(),name:f.name,sha,txtSha,kindAuto:true,topic:opt.topic||'',newSubj:!!opt.newSubj,topicDesc:opt.topicDesc||'',type:r.ext,size:f.size,at:Date.now(),unit:r.unit,pages:r.pages,chars:r.chars,bad:r.bad||[],group:opt.group,show:opt.show,kind:detectKind(r.pages,f.name),noShare:!!opt.noShare,
          figPages:r.figPages||[],stage:(r.bad&&r.bad.length)||(r.figPages&&r.figPages.length)?'ocr':'digest',ocrDone:[],digDone:0,summ:[],err:'',cardsResetAt:Date.now(),delCards:[],ownerUid:ME?ME.uid:'',
          warn:r.figSkipped?`มีรูป ${r.figSkipped} รูปที่ระบบแสดงไม่ได้ (เช่น EMF/WMF หรือรูปที่ลิงก์ไว้นอกไฟล์) ถ้าเป็นรูปโจทย์ แนะนำบันทึกเอกสารเป็น PDF แล้วอัปโหลดใหม่`:''};
        if(r.figs&&r.figs.length)await saveFigs(r.figs.map(f=>({...f,docId:doc.id})));
        if(r.buf){
          try{if(navigator.storage&&navigator.storage.persist)await navigator.storage.persist()}catch(e){}
          try{await kbPutMany('files',[{id:doc.id,buf:r.buf}]);doc.fileMB=Math.round(r.buf.byteLength/104857.6)/10}
          catch(e){ /* not enough browser storage for the original: keep the text, skip reading page images */
            if(doc.stage==='ocr'){doc.stage='digest';doc.bad=[];doc.figPages=[]}
            doc.warn=(doc.warn?doc.warn+' · ':'')+'พื้นที่เก็บข้อมูลในเบราว์เซอร์ไม่พอเก็บไฟล์ต้นฉบับ จึงใช้ได้เฉพาะข้อความที่ดึงได้ (AI อ่านภาพหน้าและตัดรูปจาก PDF ไม่ได้) ลองแยกไฟล์เป็นส่วนเล็กลง'}
        }
        await saveDoc(doc);DOCS.push(doc);syncDocSubjects();
        UPQ.splice(UPQ.indexOf(job),1);
        if(typeof syncPushPages==='function'){try{await syncPushPages(doc)}catch(e){}}
        if(typeof syncPushMeta==='function')syncPushMeta(doc);
        if(activeAI())queueDoc(doc.id);
      }
    }catch(e){job.err=(e&&e.message)||String(e)}
    renderSide();renderKB();
  }
}

/* ---------- knowledge base view ---------- */
function previewText(d){let s='';for(const p of d.pages){if(!p.text)continue;s+=`[${d.unit} ${p.n}]\n${p.text}\n\n`;if(s.length>1500)break}return s.slice(0,1500)+(s.length>1500?' ...':'')}
const det=(key,summary,body,cls)=>`<details class="${cls||'kprev'}" data-k="${key}"${KB_OPEN.has(key)?' open':''}><summary>${summary}</summary>${body}</details>`;
function cardsHTML(d){
  const cs=CARDS.filter(c=>c.docId===d.id),by={};for(const c of cs)(by[c.topic]=by[c.topic]||[]).push(c);
  return Object.entries(by).sort((a,b)=>b[1].length-a[1].length).map(([t,list])=>`<p class="lbl" style="margin-top:8px">${esc(t)} · ${list.length} ${d.kind==='exam'?'ข้อ':'ใบ'}</p>`+list.map(c=>{const s=c.st||{};
    if(c.type==='q')return `<div class="kc" data-c="${c.id}"><p><b>${c.no?`ข้อ ${esc(c.no)} · `:''}</b><span class="src">${d.unit} ${c.page}</span></p><p style="white-space:pre-wrap">${esc(c.q.stem)}</p>${(c.figs||[]).filter(id=>hasFig(id)).map(id=>figHTML(id,'kthumb')).join('')}
      <ol class="kq">${c.q.choices.map((x,j)=>`<li${j===c.q.answer?' class="ok"':''}>${esc(x)}${j===c.q.answer?' ✓':''}</li>`).join('')}</ol>
      ${c.q.answer<0?'<p class="kerr">ยังไม่มีเฉลย ข้อนี้จะยังไม่ถูกนำไปใช้ กด แก้ เพื่อใส่เฉลย</p>':c.ansSrc==='AI'?'<p class="kwarn">เอกสารไม่มีเฉลย AI แก้โจทย์เอง ตรวจได้ แก้ได้ที่ปุ่ม แก้</p>':'<p class="src">เฉลยจากเอกสาร</p>'}
      <p class="src">${s.n?`ถามแล้ว ${s.n} ครั้ง ผิด ${s.w||0}`:'ยังไม่เคยออกข้อสอบ'}</p>
      <div class="kcb"><button class="ghost" data-edit>แก้</button><button class="ghost" data-cdel>ลบ</button></div></div>`;
    return `<div class="kc" data-c="${c.id}"><p><b>${esc(c.title)}</b> <span class="src">· ${esc(c.kind)} · ${d.unit} ${c.page}${'★'.repeat(c.imp||0)}</span></p><p>${esc(c.fact)}</p>${(c.figs||[]).filter(id=>hasFig(id)).map(id=>figHTML(id,'kthumb')).join('')}${c.ansSrc==='AI'?'<p class="kwarn">เฉลยข้อนี้ AI ดูจากรูปเอง (เอกสารไม่มีเฉลย) ตรวจได้ แก้ได้ที่ปุ่ม แก้</p>':''}
      <p class="src">${s.n?`ถามแล้ว ${s.n} ครั้ง ผิด ${s.w||0}`:'ยังไม่เคยออกข้อสอบ'}${c.emb?'':' · ยังไม่มีดัชนีความหมาย'}</p>
      <div class="kcb"><button class="ghost" data-edit>แก้</button><button class="ghost" data-cdel>ลบ</button></div></div>`}).join('')).join('');
}
function figsHTML(d){
  const local=docFigs(d.id),localIds=new Set(local.map(f=>f.id));
  const remote=(d.figMeta||[]).filter(f=>!localIds.has(f.id));
  return [...local,...remote].sort((a,b)=>(+a.page||1)-(+b.page||1)).map(f=>`<div class="kfig">${figHTML(f.id,'kthumb')}<p class="src">${d.unit} ${f.page||1}${f.desc?` · ${esc(f.desc)}`:''} · ใช้ในบัตร ${CARDS.filter(c=>(c.figs||[]).includes(f.id)).length} ใบ</p></div>`).join('');
}
function confHTML(d){
  const list=CARDS.filter(c=>c.docId===d.id&&c.conf&&CARDS.some(o=>o.id===c.conf.other));if(!list.length)return '';
  return `<div class="kconf"><p class="kwarn"><b>⚠️ พบเนื้อหาขัดกับเอกสารเดิม ${list.length} จุด</b> ระบบใช้ฉบับใหม่ในการออกข้อสอบ เลือกใช้ฉบับเดิมได้ถ้าฉบับใหม่ไม่ถูก</p>${list.map(c=>{const o=CARDS.find(x=>x.id===c.conf.other);
    return `<div class="kc" data-conf="${c.id}"><p class="src">${esc(c.conf.note)}</p><p><b>ใหม่</b> (${esc(cardCite(c))}): ${esc(c.fact)}</p><p><b>เดิม</b> (${esc(cardCite(o))}): ${esc(o.fact)}</p>
      <div class="kcb"><button class="${c.conf.use==='new'?'primary':'ghost'}" data-use="new">ใช้ฉบับใหม่</button><button class="${c.conf.use==='old'?'primary':'ghost'}" data-use="old">ใช้ฉบับเดิม</button></div></div>`}).join('')}</div>`;
}
/* หน้าคลังความรู้มี 2 หน้า: main = อัปโหลด + ไฟล์ที่กำลังทำ/มีปัญหา · hist = ประวัติการอัปโหลด (ไฟล์ที่เสร็จแล้ว) */
var KB_TAB='main',KB_DONE_N=0;
/* ไฟล์ในเครื่องที่มีชุดชื่อเดียวกันอยู่ในคลังกลางแล้ว (เช่น ส่งจากเครื่องอื่น) */
const baseName=n=>String(n||'').replace(/ \(ส่วนที่ \d+\)$/,'').trim().toLowerCase();
const sameInCentral=d=>DOCS.some(x=>x.central&&baseName(x.name)===baseName(d.name));
/* ปุ่ม ประมวลผลต่อทั้งหมด: ไฟล์ที่ยังไม่เสร็จหรือผิดพลาด (ไม่รวมที่กำลังทำ) + ไฟล์ที่ส่งเข้าคลังกลางไม่สำเร็จ */
function runAllList(){
  const busy=d=>PROC_ID===d.id||PROCQ.includes(d.id)||(typeof docBusyElsewhere==='function'&&docBusyElsewhere(d));
  return DOCS.filter(d=>!d.central&&docMine(d)&&!busy(d)&&(d.stage!=='ready'||d.shareErr));
}
function runAll(){
  const list=runAllList();let n=0;
  for(const d of list){
    Object.assign(d,{tries:0,nextTry:0});
    if(d.stage!=='ready'){d.err='';d.errCode='';saveDoc(d);queueDoc(d.id);n++}
    else if(d.shareErr&&ME){d.shareErr='';saveDoc(d);submitDoc(d,{auto:true});n++}
  }
  toast(n?`เริ่มประมวลผลต่อ ${n} ไฟล์ ระบบทำทีละไฟล์ตามคิว`:'ไม่มีไฟล์ที่ต้องทำต่อ');renderKB();
}
function renderKB(){
  if(VIEW!=='kb')return;
  head('คลังความรู้','อัปโหลดไฟล์ได้ 2 ประเภท: เนื้อหา (AI ย่อยเป็นบัตรความรู้แล้วคิดโจทย์ใหม่) และข้อสอบ/ตัวอย่างโจทย์ (ดึงทุกข้อมาใช้ตรงๆ และเป็นแบบอย่าง) · อัปโหลดขึ้น Google Drive ก่อนแล้วค่อยย่อยทีหลังได้');
  const el=document.getElementById('sheet'),ai=activeAI(),nCards=activeCards().length,nBank=bankItems().length;
  const docBox=d=>{const tp=docTopics(d),busy=PROC_ID===d.id||PROCQ.includes(d.id),localN=CARDS.filter(c=>c.docId===d.id).length,nc=d.cardsRemote?Math.max(localN,+d.cardCount||0):localN,ex=d.kind==='exam',unit=ex?'ข้อ':'ใบ',lab=ex?'ข้อสอบ':'บัตรความรู้',summ=(d.summ||[]).filter(Boolean),figN=docFigs(d.id).length||(d.figMeta||[]).length,rb=typeof docBusyElsewhere==='function'&&docBusyElsewhere(d);
      return `<div class="kdoc" data-id="${d.id}">
      <div class="kt"><div><p class="kn">${esc(d.name)}</p><p class="src">${d.pages.length?`${d.pages.length} ${d.unit} · ${nf(d.chars)} ตัวอักษร`:(nc?`${lab} ${nc} ${unit}`:'ยังไม่ได้อ่านเนื้อหา')}${d.stored==='drive'?` · ☁ อยู่บน Google Drive${d.size?` (${(d.size/1048576).toFixed(1)} MB)`:''}`:''}${figN?` · รูปประกอบ ${figN} รูป`:''} · เพิ่มเมื่อ ${fmtDate(d.at)}${d.syncAt?' · ☁ ซิงก์แล้ว':''}${d.mem?' · ยังไม่ได้บันทึกถาวร':''}</p></div><span class="tag" style="white-space:nowrap" title="${d.kindAuto?'ระบบตรวจประเภทไฟล์ให้อัตโนมัติ เปลี่ยนได้ที่ ตั้งค่าประเภท/กลุ่ม/การแสดง':''}">${ex?'ข้อสอบ':'เนื้อหา'}${d.kindAuto?' (ตรวจอัตโนมัติ)':''} · ${d.group==='gen'?'ทั่วไป':'เฉพาะตำแหน่ง'} · ${d.show?'แสดงเป็นรายวิชา':'ฐานข้อมูล'}</span></div>
      <p class="kstage ${d.stage==='ready'?'ok':''}">${busy?`<span class="spin sm" aria-hidden="true"></span><span data-prog="${d.id}">${esc(d.prog||'รอคิวประมวลผล')}</span>`:d.stage==='ready'?`✓ พร้อมใช้ · ${lab} ${nc} ${unit}${ex&&CARDS.some(c=>c.docId===d.id&&c.type==='q'&&c.q.answer<0)?` (ไม่มีเฉลย ${CARDS.filter(c=>c.docId===d.id&&c.type==='q'&&c.q.answer<0).length} ข้อ)`:''}`:`${STAGE_TXT[d.stage]||d.stage||'รอประมวลผล'}${d.stage==='ocr'?` (${visionTodo(d).length} หน้า)`:''}${['queued','read','ready'].includes(d.stage)?'':` · ใช้ AI ประมาณ ${estCalls(d)} ครั้ง`}`}</p>
      ${d.stage==='queued'&&!busy?`<p class="src">${rb?'☁ รอคิวอยู่บนคลาวด์':'อัปโหลดขึ้น Google Drive เรียบร้อยแล้ว ปิดหน้านี้ได้'} · กลับมาเปิดเว็บอีกครั้ง (เครื่องเดิม) ระบบจะย่อยต่อให้เอง${ai?'':' (ต้องตั้งค่า AI ก่อน)'}</p>`:''}
      ${rb?`<p class="src">☁ กำลังประมวลผลที่เครื่องอื่น${d.leaseAt?` (เริ่ม ${fmtDate(d.leaseAt)})`:''} · เครื่องนั้นปิดไปแล้วรอ 3 นาทีจะรับงานต่อได้</p>`:''}
      ${d.err&&(d.errCode==='no_credit'||d.errCode==='quota')?`<p class="kwarn">💳 ${esc(d.errCode==='quota'?'โควตาฟรีของ AI หมด':'เครดิต AI หมด')} · รอทำต่อ${d.nextTry&&d.nextTry>Date.now()?` (ลองใหม่เองใน ${Math.max(1,Math.round((d.nextTry-Date.now())/60000))} นาที)`:''}</p>`:d.err?`<p class="kerr">${esc(d.err)}${d.nextTry&&d.nextTry>Date.now()?` · ระบบจะลองใหม่เองใน ${Math.max(1,Math.round((d.nextTry-Date.now())/60000))} นาที (ครั้งที่ ${(d.tries||0)+1})`:''}</p>`:''}
      ${d.stage==='ready'&&!busy&&!nc&&sameInCentral(d)?'<p class="src"><span class="substat ok">มีชุดชื่อเดียวกันในคลังกลางแล้ว ใช้ทำข้อสอบได้จากคลังกลาง</span></p>':''}
      ${d.stage==='ready'&&!busy&&!nc&&!d.dupOf&&!sameInCentral(d)?`<p class="kwarn">ไม่พบ${lab}ในไฟล์นี้ ไฟล์นี้จึงยังไม่ถูกใช้ออกโจทย์ ถ้าคิดว่ามีเนื้อหา ลองกด "ให้ AI อ่านทุกหน้าใหม่" หรือเปลี่ยนประเภทไฟล์ในตั้งค่า</p>`:''}
      ${tp.length?`<div class="tags">${chipHTML(d,tp)}${nc&&(isReviewerMe()||docMine(d))?'<button class="tag tagadd" type="button" data-addsubj>＋ เพิ่มวิชา</button>':''}</div>`:''}
      ${d.warn?`<p class="kwarn">${esc(d.warn)}</p>`:''}
      ${d.dupOf?`<p class="src">ซ้ำกับ "${esc((DOCS.find(x=>x.id===d.dupOf)||{}).name||'เอกสารเดิม')}" · ไม่ประมวลผลซ้ำ</p>`:''}
      ${d.dupSkipped?`<p class="src">ข้ามบัตร/ข้อสอบซ้ำ ${d.dupSkipped} รายการ</p>`:''}
      ${confHTML(d)}
      ${summ.length?det('s'+d.id,'สรุปเนื้อหา',`<div class="ksum">${summ.map(s=>`<p>${esc(s)}</p>`).join('')}</div>`):''}
      ${nc?det('c'+d.id,`${lab} (${nc} ${unit}) · ดู แก้ หรือลบได้`,`<div class="kcards">${KB_OPEN.has('c'+d.id)?cardsHTML(d):''}</div>`):''}
      ${figN?det('f'+d.id,`รูปประกอบ (${figN} รูป)`,`<div class="kfigs">${KB_OPEN.has('f'+d.id)?figsHTML(d):''}</div>`):''}
      ${det('p'+d.id,'ดูข้อความที่ระบบอ่านได้',`<pre>${esc(previewText(d))}</pre>`)}
      <div class="btnrow" style="justify-content:flex-start">${d.show&&nc?'<button class="primary" data-go>ทำข้อสอบจากเอกสารนี้</button>':''}${nc?'<button class="ghost" data-link>เชื่อมต่อกับรายวิชา</button>':''}<button class="ghost" data-opt ${busy?'disabled':''}>ตั้งค่าประเภท/กลุ่ม/การแสดง</button>
        ${!busy&&d.stage!=='ready'?`<button class="ghost" data-run ${ai&&!rb?'':'disabled'}>${d.stage==='queued'?'เริ่มย่อยตอนนี้':d.err||d.digDone||(d.ocrDone||[]).length?'ประมวลผลต่อ':'ประมวลผลด้วย AI'}</button>`:''}
        ${!busy&&d.stage!=='queued'&&d.type==='pdf'&&d.fileMB!==0?'<button class="ghost" data-reocr>ให้ AI อ่านทุกหน้าใหม่</button>':''}
        ${!busy&&d.type==='pdf'&&d.fileMB&&d.stage==='ready'?`<button class="ghost" data-dropfile>ลบไฟล์ต้นฉบับ คืนพื้นที่ ${d.fileMB} MB</button>`:''}
        <button class="ghost" data-del ${busy?'disabled':''}>ลบ</button></div>
      ${d.noShare?'<p class="src"><span class="substat">เก็บส่วนตัว ไม่ส่งเข้าคลังกลาง</span></p>':!d.subId&&d.stage==='ready'&&nc&&!ME?'<p class="src"><span class="substat">จะส่งเข้าคลังกลางอัตโนมัติเมื่อเข้าสู่ระบบ</span></p>':''}
      ${d.srcErr?`<p class="kwarn">ไฟล์ต้นฉบับ: ${esc(d.srcErr)}</p>`:''}
      ${d.shareErr?`<p class="kerr">${esc(d.shareErr)}</p><div><button class="ghost" data-sub>ลองส่งเข้าคลังกลางอีกครั้ง</button></div>`:''}
      ${d.subId?`<p class="src"><span class="substat ${d.subStatus==='approved'?'ok':d.subStatus==='rejected'?'bad':''}">${d.subStatus==='approved'?'อยู่ในคลังกลางแล้ว':d.subStatus==='rejected'?'ไม่ผ่านการตรวจ':'รอผู้ตรวจอนุมัติ'}</span>${d.subNote?` ${esc(d.subNote)}`:''}</p>`:''}</div>`};
  /* เสร็จแล้ว = ประมวลผลจบ ไม่มีข้อผิดพลาด ส่งเข้าคลังกลางไม่ติดปัญหา → ย้ายไปประวัติการอัปโหลด
     หน้าหลักเหลือเฉพาะไฟล์ที่กำลังประมวลผล ยังไม่เสร็จ ผิดพลาด ส่งไม่สำเร็จ หรือผู้ตรวจไม่ผ่าน */
  const isBusy=d=>PROC_ID===d.id||PROCQ.includes(d.id);
  const isDone=d=>d.stage==='ready'&&!isBusy(d)&&!d.err&&!d.prog&&!d.shareErr&&d.subStatus!=='rejected';
  const mine=DOCS.filter(d=>!d.central&&docMine(d)).slice().reverse(),doing=mine.filter(d=>!isDone(d)),done=mine.filter(isDone);
  const empty=done.filter(d=>!d.cardCount&&!CARDS.some(c=>c.docId===d.id)&&!sameInCentral(d)).length;KB_DONE_N=done.length;
  if(KB_TAB==='central'){
    head('ข้อมูลในคลังกลาง','ชุดที่อนุมัติแล้ว ทุกคนที่เปิดเว็บใช้ร่วมกัน');
    el.innerHTML=`<div class="btnrow" style="justify-content:flex-start"><button class="ghost" id="kbback">← กลับไปหน้าคลังความรู้</button></div>
      ${hiddenSubjHTML()}
      ${srcAdminHTML()}
      ${centralListHTML()||'<p class="src" style="text-align:center">คลังกลางยังว่าง</p>'}`;
    if(ME&&!SRC.ready&&!SRC.loading)loadSrcIndex().then(()=>{if(VIEW==='kb'&&KB_TAB==='central')renderKB()});
    document.getElementById('kbback').onclick=()=>{KB_TAB='main';renderKB();window.scrollTo({top:0})};
  }else if(KB_TAB==='hist'){
    head('ประวัติการอัปโหลด','ไฟล์ที่ประมวลผลเสร็จแล้ว · ดู แก้ ตั้งค่า หรือลบได้ที่นี่');
    el.innerHTML=`<div class="btnrow" style="justify-content:flex-start"><button class="ghost" id="kbback">← กลับไปหน้าคลังความรู้</button></div>
      <p class="lbl">เสร็จแล้ว ${done.length} ไฟล์${empty?` · ในนี้ ${empty} ไฟล์ไม่พบเนื้อหา (ดูคำแนะนำในแต่ละไฟล์)`:''}</p>
      ${done.map(docBox).join('')||'<p class="src" style="text-align:center">ยังไม่มีไฟล์ที่ประมวลผลเสร็จ</p>'}`;
    document.getElementById('kbback').onclick=()=>{KB_TAB='main';renderKB();window.scrollTo({top:0})};
  }else{
  el.innerHTML=`<div class="drop" id="drop"><p><b>ลากไฟล์มาวางที่นี่</b> หรือ</p><button class="primary" id="kbpick">เลือกไฟล์</button>
      <p class="src">PDF (รวมไฟล์สแกน), DOCX, TXT, HTML · ไฟล์ละไม่เกิน ${MAX_MB} MB · เลือกหลายไฟล์พร้อมกันได้ · ชื่อไฟล์ซ้ำจะอัปเดตทับของเดิม</p>
      ${ME&&SRC.dirs.some(d=>d.up)?'<p class="src">☁ อัปโหลดขึ้น Google Drive ก่อน แล้วระบบค่อยย่อยให้เบื้องหลัง — ปิดหน้าระหว่างรอได้</p>':''}</div>
    ${!ai?'<p class="catnote warn">อัปโหลดได้เลย แต่การอ่าน PDF ด้วย AI ย่อยความรู้ และสร้างข้อสอบ ต้องตั้งค่า AI ก่อน (แถบซ้าย)</p>':!canVision()?'<p class="catnote warn">AI ที่ใช้อยู่อ่านภาพ PDF และทำดัชนีความหมายไม่ได้ ใช้ Gemini, OpenAI, Claude API หรือ Meta key</p>':!canEmbed()?'<p class="catnote">AI ที่ใช้อยู่ทำดัชนีค้นหาตามความหมายไม่ได้ (มีเฉพาะ Gemini/OpenAI) ระบบค้นด้วยคำแทน ใช้งานอื่นได้ครบ</p>':''}
    ${KB_ERR?'<p class="catnote warn">เบราว์เซอร์นี้ไม่อนุญาตให้เก็บเอกสารถาวร เอกสารจะหายเมื่อปิดหน้า</p>':''}
    <p class="catnote" id="kbstore"></p>
    ${cloudBoxHTML()}
    ${UPQ.map((j,i)=>`<div class="kdoc"><p class="kn">${esc(j.name)}</p>${j.err?`<p class="kerr">${esc(j.err)}</p><div><button class="ghost" data-dismiss="${i}">ปิด</button></div>`:`<p class="src" data-job="${i}">${esc(j.msg)}</p>`}</div>`).join('')}
    ${DOCS.some(d=>!d.central)?`<p class="lbl">เอกสารของฉัน ${mine.length} ไฟล์ (กำลังทำ/มีปัญหา ${doing.length} · เสร็จแล้ว ${done.length}) · บัตรความรู้ทั้งหมด ${nCards} ใบ · ข้อสอบในคลัง ${nBank} ข้อ (รวมคลังกลาง) · ระบบเน้นเรื่องที่ยังไม่เคยถามและที่เคยตอบผิด</p>`:(UPQ.length?'':'<p class="src" style="text-align:center;margin:0">ยังไม่มีเอกสารของคุณในเครื่องนี้</p>')}
    ${(c=>c?`<div class="hban"><b>💳 ${DOCS.some(d=>!d.central&&d.errCode==='no_credit')?'เครดิต AI หมด':'โควตาฟรีของ AI หมด'}</b><span>มี ${c} ไฟล์รอประมวลผล ${DOCS.some(d=>!d.central&&d.errCode==='no_credit')?'เติมเงินในบัญชีของ AI ที่ใช้ หรือเปลี่ยนไปใช้ AI ตัวอื่น':'ระบบจะทำต่อเองเมื่อโควตากลับมา หรือเปลี่ยนไปใช้ AI ตัวอื่น'}</span><button class="ghost" id="kbaiset">ตั้งค่า AI</button></div>`:'')(DOCS.filter(d=>!d.central&&(d.errCode==='no_credit'||d.errCode==='quota')).length)}
    ${(n=>n?`<div class="btnrow" style="justify-content:flex-start"><button class="primary" id="runall" ${ai?'':'disabled'}>▶ ประมวลผลต่อทั้งหมด (${n} ไฟล์)</button>${ai?'':'<span class="src">ตั้งค่า AI ก่อน</span>'}</div>`:'')(runAllList().length)}
    ${doing.map(docBox).join('')}
    ${!doing.length&&done.length?'<p class="src" style="text-align:center;margin:0">ไม่มีไฟล์ที่กำลังประมวลผลหรือมีปัญหา · ไฟล์ที่เสร็จแล้วดูได้ที่ปุ่ม 📁 ประวัติการอัปโหลด</p>':''}
    `;
  if(ME&&!SRC.dirsAt&&!SRC.loading)ensureSrcDirs().then(()=>{if(VIEW==='kb'&&KB_TAB==='main')renderKB()}).catch(()=>{});
  document.getElementById('kbpick').onclick=()=>document.getElementById('kbfile').click();
  const ra=document.getElementById('runall');if(ra)ra.onclick=runAll;
  const kas=document.getElementById('kbaiset');if(kas)kas.onclick=()=>{const a=document.getElementById('aiset');if(a){a.open=true;if(isPhone())setMenu(true);a.scrollIntoView({behavior:'smooth'})}};
  const drop=document.getElementById('drop');
  drop.ondragover=e=>{e.preventDefault();drop.classList.add('over')};
  drop.ondragleave=()=>drop.classList.remove('over');
  drop.ondrop=e=>{e.preventDefault();drop.classList.remove('over');handleFiles(e.dataTransfer.files)};
  }
  el.querySelectorAll('[data-dismiss]').forEach(b=>b.onclick=()=>{UPQ.splice(+b.dataset.dismiss,1);renderKB()});
  el.querySelectorAll('details[data-k]').forEach(x=>x.addEventListener('toggle',()=>{
    const was=KB_OPEN.has(x.dataset.k);if(x.open)KB_OPEN.add(x.dataset.k);else KB_OPEN.delete(x.dataset.k);
    if(x.dataset.k==='hist'){if(was!==x.open)renderKB();return}
    const box=x.querySelector('.kcards');if(x.open&&box&&!box.innerHTML){const d=DOCS.find(z=>'c'+z.id===x.dataset.k);if(d){box.innerHTML=cardsHTML(d);wireCards(box)}}
    const fb=x.querySelector('.kfigs');if(x.open&&fb&&!fb.innerHTML){const d=DOCS.find(z=>'f'+z.id===x.dataset.k);if(d)fb.innerHTML=figsHTML(d)}
    /* ข้อความหน้าอยู่บนคลาวด์: ดึงเมื่อกดดู ไม่ต้องโหลดทุกไฟล์ตอนเปิดหน้า */
    if(x.open&&x.dataset.k.charAt(0)==='p'){const d=DOCS.find(z=>'p'+z.id===x.dataset.k);
      if(d&&(!d.pages||!d.pages.length)&&d.pagesParts>0&&typeof ensureDocPages==='function'){
        const pre=x.querySelector('pre');if(pre)pre.textContent='กำลังโหลดข้อความจากคลาวด์...';
        ensureDocPages(d).then(()=>{const q=x.querySelector('pre');if(q)q.textContent=previewText(d)}).catch(()=>{});
      }}
  }));
  el.querySelectorAll('.kcards').forEach(wireCards);
  el.querySelectorAll('.kdoc[data-id]').forEach(box=>{
    const id=box.dataset.id,d=DOCS.find(x=>x.id===id);
    const go=box.querySelector('[data-go]');if(go)go.onclick=()=>{P.subject='doc_'+id;save();setView('practice');renderSide();start(true)};
    const sb=box.querySelector('[data-sub]');if(sb)sb.onclick=()=>submitDoc(d);
    const lk=box.querySelector('[data-link]');if(lk)lk.onclick=()=>linkDocSubjects(id);
    box.querySelectorAll('[data-unlink]').forEach(b=>b.onclick=ev=>{ev.stopPropagation();unlinkDocSubject(id,b.dataset.unlink)});
    box.querySelectorAll('[data-chip]').forEach(el=>{
      el.onclick=ev=>{if(ev.target.closest('[data-unlink]'))return;showDocSubject(id,el.dataset.chip)};
      el.onkeydown=ev=>{if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();showDocSubject(id,el.dataset.chip)}};
    });
    const ad=box.querySelector('[data-addsubj]');if(ad)ad.onclick=()=>addDocSubject(id);
    box.querySelector('[data-opt]').onclick=async()=>{
      const nc=CARDS.filter(c=>c.docId===id).length;
      if(await modal(`<p class="mt">ตั้งค่าเอกสาร</p><p class="src">${esc(d.name)}</p>${docOptHTML(d.group||'spec',!!d.show,d.kind||'kb',!!d.noShare,true)}${nc?'<p class="src">ถ้าเปลี่ยนประเภทไฟล์หรือกลุ่มวิชา AI ต้องประมวลผลไฟล์นี้ใหม่ ของเดิมของไฟล์นี้จะถูกแทนที่</p>':''}`,[{t:'ยกเลิก'},{t:'บันทึก',cls:'primary'}])!==1)return;
      const o=readDocOpt(),regroup=o.group!==(d.group||'spec')||o.kind!==(d.kind||'kb');
      if(o.kind!==(d.kind||'kb'))d.kindAuto=false;d.show=o.show;d.group=o.group;d.kind=o.kind;const shareNow=d.noShare&&!o.noShare;d.noShare=o.noShare;if(shareNow)setTimeout(()=>autoShare(d),50);
      if(regroup&&(nc||d.digDone)){const ids=CARDS.filter(c=>c.docId===id).map(c=>c.id);CARDS=CARDS.filter(c=>c.docId!==id);try{await kbDelMany('cards',ids)}catch(e){}
        Object.assign(d,{digDone:0,summ:[],stage:d.stage==='ocr'?'ocr':'digest',err:'',reprocess:true,cardsResetAt:Date.now(),delCards:[],dupSkipped:0,dupOf:''})}
      await saveDoc(d);syncDocSubjects();if(!d.show&&P.subject==='doc_'+id){P.subject='ineq';save()}
      if(typeof syncPushMeta==='function')syncPushMeta(d);
      if(regroup&&typeof syncPushCards==='function')syncPushCards(d,true);
      if(regroup&&activeAI())queueDoc(id);renderSide();renderKB();
    };
    const run=box.querySelector('[data-run]');if(run)run.onclick=()=>{d.err='';queueDoc(id);renderKB()};
    const dfb=box.querySelector('[data-dropfile]');if(dfb)dfb.onclick=async()=>{
      if(await modal(`<p class="mt">ลบไฟล์ต้นฉบับ?</p><p>${esc(d.name)} · ${d.fileMB} MB</p><p class="src">ข้อความ บัตรความรู้ ข้อสอบ และรูปที่ตัดไว้แล้วยังอยู่ครบ ใช้ฝึกได้เหมือนเดิม แต่จะสั่ง "ให้ AI อ่านทุกหน้าใหม่" ไม่ได้อีก (ต้องอัปโหลดไฟล์ใหม่แทน)</p>`,[{t:'ยกเลิก'},{t:'ลบไฟล์ต้นฉบับ',cls:'primary'}])!==1)return;
      try{await kbDelMany('files',[id])}catch(e){}d.fileMB=0;await saveDoc(d);renderKB();toast('ลบไฟล์ต้นฉบับแล้ว');
    };
    const re=box.querySelector('[data-reocr]');if(re)re.onclick=async()=>{
      if(await modal(`<p class="mt">ให้ AI อ่านทุกหน้าใหม่?</p><p>${esc(d.name)} · ${d.pages.length} หน้า</p><p class="src">ใช้เมื่อข้อความที่อ่านได้ยังผิดเยอะ ระบบจะอ่านใหม่จากภาพทุกหน้าและย่อยความรู้ใหม่ บัตรความรู้เดิมของไฟล์นี้จะถูกแทนที่ ใช้ AI ประมาณ ${Math.ceil(d.pages.length/4)+Math.ceil(d.chars/10000)+2} ครั้ง</p>`,[{t:'ยกเลิก'},{t:'อ่านใหม่',cls:'primary'}])!==1)return;
      const ids=CARDS.filter(c=>c.docId===id).map(c=>c.id);CARDS=CARDS.filter(c=>c.docId!==id);try{await kbDelMany('cards',ids)}catch(e){}
      await dropFigs(docFigs(id).map(f=>f.id));d.pages.forEach(p=>{p.text=p.text.replace(/\n?\[รูป F[a-z0-9]+\][^\n]*/g,'')});
      Object.assign(d,{bad:d.pages.map(p=>p.n),ocrDone:[],digDone:0,summ:[],stage:'ocr',err:'',warn:'',reprocess:true,figMeta:[],cardsResetAt:Date.now(),delCards:[],dupSkipped:0,dupOf:''});
      await saveDoc(d);
      if(typeof syncPushCards==='function')syncPushCards(d,true);
      if(typeof syncClearFigs==='function')syncClearFigs(d);
      if(typeof syncPushMeta==='function')syncPushMeta(d);
      queueDoc(id);renderKB();
    };
    box.querySelectorAll('[data-conf]').forEach(cb=>cb.querySelectorAll('[data-use]').forEach(b=>b.onclick=async()=>{const c=CARDS.find(x=>x.id===cb.dataset.conf);c.conf.use=b.dataset.use;await saveCards([c]);renderKB();renderSide()}));
    box.querySelector('[data-del]').onclick=async()=>{
      if(await modal(`<p class="mt">ลบเอกสารนี้?</p><p>${esc(d.name)}</p><p class="src">ลบเอกสาร บัตรความรู้ ${CARDS.filter(c=>c.docId===id).length} ใบ และรูปประกอบ ${docFigs(id).length} รูปออกจากเครื่องนี้ กู้คืนไม่ได้</p>`,[{t:'ยกเลิก'},{t:'ลบ',cls:'primary'}])!==1)return;
      await delLocalDoc(id);syncDocSubjects();
      if(P.subject==='doc_'+id){P.subject='ineq';save()}
      renderSide();renderKB();
    };
  });
  showStorage();wireCloudKB(el);checkSubs();
}
/* the central library as seen from the knowledge base page */
function cloudBoxHTML(){
  const packs=DOCS.filter(d=>d.central),nq=CARDS.filter(c=>String(c.docId).startsWith('c_')&&c.type==='q').length,nk=CARDS.filter(c=>String(c.docId).startsWith('c_')&&c.type!=='q').length;
  return `<div class="cloudbox"><p><b>☁ คลังกลาง</b> · ${packs.length} ชุด · บัตรความรู้ ${nk} ใบ · ข้อสอบ ${nq} ข้อ</p>
    <p class="src">${CLOUD.ok===false?esc(CLOUD.err):CLOUD.syncing?'กำลังซิงก์...':CLOUD.last?`ซิงก์ล่าสุด ${fmtDate(CLOUD.last)} · ทุกคนที่เปิดเว็บได้ข้อมูลชุดเดียวกันนี้`:'กำลังเชื่อมต่อ...'}</p>
    <p class="src">${ME?'เอกสารที่ประมวลผลเสร็จแล้วจะส่งเข้าคลังกลางให้อัตโนมัติ (ผู้ตรวจอนุมัติก่อน)':'เข้าสู่ระบบ (แถบซ้าย) เพื่อส่งเอกสารเข้าคลังกลางให้ทุกคนใช้'}</p>
    <p class="src">${ME?(typeof SYNC!=='undefined'&&SYNC.err?`☁ คลังส่วนตัว: <span class="kerr">${esc(SYNC.err)}</span>`:`☁ คลังส่วนตัว (ซิงก์ข้ามเครื่อง): ${SYNC.pushN?`กำลังส่ง ${SYNC.pushN} ไฟล์...`:(SYNC.last?`ซิงก์ล่าสุด ${fmtDate(SYNC.last)} · ${SYNC.meta.size} ไฟล์ในบัญชี`:'กำลังซิงก์...')}`):'เข้าสู่ระบบเพื่อซิงก์คิวและผลลัพธ์ข้ามเครื่อง'}</p>
    <div class="btnrow" style="justify-content:flex-start"><button class="ghost" id="cloudsync" ${CLOUD.syncing?'disabled':''}>ซิงก์ตอนนี้</button>${isReviewerMe()?'<button class="ghost" id="gorev">ไปหน้าตรวจอนุมัติ</button>':''}${DOCS.some(d=>d.central)?`<button class="ghost" id="gocentral">☁ ข้อมูลในคลังกลาง (${DOCS.filter(d=>d.central).length})</button>`:''}${KB_DONE_N?`<button class="ghost" id="gohist">📁 ประวัติการอัปโหลด (${KB_DONE_N})</button>`:''}</div></div>`;
}
function centralListHTML(){
  const packs=DOCS.filter(d=>d.central);if(!packs.length)return '';
  return `<p class="lbl">ชุดในคลังกลาง ${packs.length} ชุด · อนุมัติแล้วทั้งหมด ทุกคนใช้ร่วมกัน</p><p class="src">ป้ายสีฟ้า = วิชาที่โจทย์/ความรู้ในชุดนั้นไปอยู่ พร้อมจำนวน · "แสดงเป็นรายวิชา" = ให้ชุดนี้ขึ้นเป็นวิชาของตัวเองในเมนูซ้าย</p>`+packs.slice().reverse().map(d=>{const nc=CARDS.filter(c=>c.docId===d.id).length,ex=d.kind==='exam',summ=(d.summ||[]).filter(Boolean);
    return `<div class="kdoc" data-cid="${d.id}"><div class="kt"><div><p class="kn">${esc(d.name)}</p><p class="src">ประเภท: ${ex?`คลังข้อสอบ ${nc} ข้อ (ใช้ออกข้อสอบตรงๆ และเป็นแบบอย่างโจทย์)`:`บัตรความรู้ ${nc} ใบ (AI ใช้คิดโจทย์ใหม่)`} · กลุ่ม${d.group==='gen'?'ความรู้ทั่วไป':'เฉพาะตำแหน่ง'} · ส่งโดย ${esc(d.owner||'-')}</p></div><span class="substat ok" style="white-space:nowrap">✓ อนุมัติแล้ว</span></div>
      ${docTopics(d).length?`<div class="tags">${chipHTML(d,docTopics(d))}${nc&&isReviewerMe()?'<button class="tag tagadd" type="button" data-addsubj>＋ เพิ่มวิชา</button>':''}</div>`:''}
      ${summ.length?det('s'+d.id,'สรุปเนื้อหา',`<div class="ksum">${summ.map(s=>`<p>${esc(s)}</p>`).join('')}</div>`):''}
      ${nc?det('c'+d.id,`${ex?'ข้อสอบ':'บัตรความรู้'} (${nc})${isReviewerMe()?' · ผู้ตรวจแก้ได้':''}`,`<div class="kcards">${KB_OPEN.has('c'+d.id)?cardsHTML(d):''}</div>`):''}
      <div class="btnrow" style="justify-content:flex-start">${d.show?'<button class="primary" data-go>ทำข้อสอบจากชุดนี้</button>':''}<button class="ghost" data-cshow>${d.show?'ซ่อนจากรายวิชา':'แสดงเป็นรายวิชา'}</button>${nc&&isReviewerMe()?'<button class="ghost" data-addsubj>＋ เพิ่มวิชา</button>':''}</div>${packSrcHTML(d)}</div>`}).join('');
}
function wireCloudKB(el){
  const s=document.getElementById('cloudsync');if(s)s.onclick=()=>{syncCentral();if(typeof syncPull==='function')syncPull().catch(()=>{})};
  const g=document.getElementById('gorev');if(g)g.onclick=()=>setView('review');
  wireSrcAdmin(el,renderKB);wirePackSrc(el,renderKB);wireHiddenSubj(el,renderKB);
  const gc=document.getElementById('gocentral');if(gc)gc.onclick=()=>{KB_TAB='central';renderKB();window.scrollTo({top:0})};
  const h=document.getElementById('gohist');if(h)h.onclick=()=>{KB_TAB='hist';renderKB();window.scrollTo({top:0})};
  el.querySelectorAll('.kdoc[data-cid]').forEach(box=>{const d=DOCS.find(x=>x.id===box.dataset.cid);if(!d)return;
    const go=box.querySelector('[data-go]');if(go)go.onclick=()=>{P.subject='doc_'+d.id;save();setView('practice');renderSide();start(true)};
    box.querySelector('[data-cshow]').onclick=async()=>{d.show=!d.show;await saveDoc(d);syncDocSubjects();renderSide();renderKB()};
    const ad=box.querySelector('[data-addsubj]');if(ad)ad.onclick=()=>addDocSubject(d.id);
    box.querySelectorAll('[data-unlink]').forEach(b=>b.onclick=ev=>{ev.stopPropagation();unlinkDocSubject(d.id,b.dataset.unlink)});
    box.querySelectorAll('[data-chip]').forEach(el=>{
      el.onclick=ev=>{if(ev.target.closest('[data-unlink]'))return;showDocSubject(d.id,el.dataset.chip)};
      el.onkeydown=ev=>{if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();showDocSubject(d.id,el.dataset.chip)}};
    });
  });
}
/* how much of this browser's storage the knowledge base uses (originals of big PDFs dominate) */
async function showStorage(){
  const el=document.getElementById('kbstore');if(!el||!navigator.storage||!navigator.storage.estimate)return;
  try{
    const {usage=0,quota=0}=await navigator.storage.estimate(),mb=x=>x>=1073741824?(x/1073741824).toFixed(1)+' GB':Math.round(x/1048576)+' MB';
    const files=DOCS.reduce((a,d)=>a+(d.stored==='drive'?0:(d.fileMB||0)),0),pct=quota?usage/quota:0;
    el.className='catnote'+(pct>.8?' warn':'');
    el.textContent=`พื้นที่เก็บในเบราว์เซอร์นี้: ใช้ไป ${mb(usage)} จากที่ใช้ได้ประมาณ ${mb(quota)}${files?` · เป็นไฟล์ PDF ต้นฉบับ ${Math.round(files)} MB (ลบได้หลังประมวลผลเสร็จ)`:''}${pct>.8?' · ใกล้เต็มแล้ว ลบไฟล์ต้นฉบับหรือเอกสารที่ไม่ใช้':''}`;
  }catch(e){}
}
function wireCards(box){
  box.querySelectorAll('.kc[data-c]').forEach(k=>{if(k.dataset.w)return;k.dataset.w='1';const c=CARDS.find(x=>x.id===k.dataset.c);if(!c)return;
    const central=String(c.docId).startsWith('c_'),ed=k.querySelector('[data-edit]'),del=k.querySelector('[data-cdel]');
    if(central&&!isReviewerMe()){if(ed)ed.remove();if(del)del.remove();return}
    if(ed)ed.onclick=async()=>{
      if(!(await editCardDialog(c)))return;
      if(central)try{await editCloudCard(c.docId.slice(2),c.id,c.type==='q'?{q:c.q,fact:c.fact,title:c.title,ansSrc:c.ansSrc}:{fact:c.fact,title:c.title});toast('แก้ในคลังกลางแล้ว')}catch(e){toast('แก้ในคลังกลางไม่สำเร็จ','bad')}
      const dc=DOCS.find(x=>x.id===c.docId);if(!central&&dc&&typeof syncPushCards==='function')syncPushCards(dc,true);
      renderKB();renderSide();
    };
    if(del)del.onclick=async()=>{
      if(central){toast('ชุดในคลังกลาง เอาออกได้จากหน้า ตรวจอนุมัติ','bad');return}
      if(await modal(`<p class="mt">ลบบัตรนี้?</p><p>${esc(c.title)}</p>`,[{t:'ยกเลิก'},{t:'ลบ',cls:'primary'}])!==1)return;
      CARDS=CARDS.filter(x=>x.id!==c.id);try{await kbDelMany('cards',[c.id])}catch(e){}
      const dc=DOCS.find(x=>x.id===c.docId);
      if(dc){dc.delCards=[...(dc.delCards||[]),c.id].slice(-1000);await saveDoc(dc);if(typeof syncPushCards==='function')syncPushCards(dc,true)}
      renderKB();renderSide();
    };
  });
}
document.getElementById('kbfile').onchange=e=>{const f=[...e.target.files];e.target.value='';handleFiles(f)};
onAppReady(async()=>{
  try{DOCS=(await kbAll('docs'))||[];CARDS=(await kbAll('cards'))||[];for(const f of (await kbAll('images'))||[])FIGS.set(f.id,f)}catch(e){DOCS=[];CARDS=[];KB_ERR=true}
  /* แปลงชื่อวิชาเดิมเป็นชื่อปัจจุบัน (หลังแอดมินเปลี่ยนชื่อ) */
  const chc=[];for(const c of CARDS){const t=topicName(c.topic);if(t!==c.topic){c.topic=t;chc.push(c)}}
  if(chc.length)await saveCards(chc);
  for(const d of DOCS){if(d.topic){const t=topicName(d.topic);if(t!==d.topic){d.topic=t;await saveDoc(d)}}}
  let qch=false;try{for(const e of Object.values(QLOG)){if(!e||!e.q||!e.q.topic)continue;const t=topicName(e.q.topic);if(t!==e.q.topic){e.q.topic=t;qch=true}}}catch(e){}
  if(qch)saveQLog();
  for(const d of DOCS){if(!d.stage)d.stage='digest';if(!d.group)d.group='spec';if(d.show==null)d.show=true;d.prog=''}
  syncDocSubjects();renderSide();
  if(FIGS.size){if(VIEW==='practice'&&R&&R.status!=='loading')render();if(VIEW==='mock')renderMock()}
  if(VIEW==='practice'&&String(P.subject).startsWith('doc_')&&(!R||R.subject!==P.subject))start();
  rebuildCloudIndex();
  if(VIEW==='kb')renderKB();
  cloudInit();
});

/* ---------- ลองใหม่อัตโนมัติ ----------
   งานที่ค้างหรือผิดพลาดชั่วคราว (เน็ตหลุด AI คนใช้เยอะ โควตาเต็ม Drive ติดต่อไม่ได้) ระบบลองใหม่เองเป็นระยะจนสำเร็จ
   - ประมวลผลค้าง (ปิดหน้าไประหว่างทำ) → เริ่มต่อทันที
   - ประมวลผลผิดพลาด → ลองใหม่ 2, 5, 15, 30, 60 นาที (โควตาเต็มรอ 60 นาที)
   - ส่งเข้าคลังกลาง / ส่งต้นฉบับขึ้น Drive ไม่สำเร็จ → ลองใหม่ตามรอบเดียวกัน
   ข้อผิดพลาดที่ลองใหม่ไม่ช่วย (ไม่มีข้อความ ไม่มีไฟล์ ไม่มี AI) จะไม่ลองซ้ำ */
const RETRY_MIN=[2,5,15,30,60];
/* เครดิตหมด: ไม่ลองซ้ำเองจนกว่าจะเติมเงิน (กด ประมวลผลต่อทั้งหมด หลังเติม) · โควตาฟรีหมด: ลองใหม่ทุก 60 นาที */
const noRetry=c=>['no_text','no_file','no_ai','bad_key','bad_model','no_credit','cancelled'].includes(c);
function retryLater(d,code){d.tries=(d.tries||0)+1;d.nextTry=Date.now()+(code==='rate_limited'||code==='quota'?60:RETRY_MIN[Math.min(d.tries-1,RETRY_MIN.length-1)])*60000}
async function withRetry(fn,times=4){let e0;for(let i=0;i<times;i++){try{return await fn()}catch(e){e0=e;if(e&&e.full)break;await new Promise(r=>setTimeout(r,[3000,8000,20000,40000][i]||40000))}}throw e0}
let retryBusy=false;
async function autoRetry(){
  if(retryBusy||document.hidden)return;retryBusy=true;
  try{
    const now=Date.now(),mine=DOCS.filter(d=>!d.central&&docMine(d)),busy=d=>PROC_ID===d.id||PROCQ.includes(d.id);
    for(const d of mine){
      if(busy(d)||d.stage==='ready'||!activeAI())continue;
      if(typeof docBusyElsewhere==='function'&&docBusyElsewhere(d))continue;
      if((!d.pages||!d.pages.length)&&(d.driveId||d.srcFile)&&!ME)continue;   /* ต้องล็อกอินก่อนดึงไฟล์จาก Drive มาอ่าน */
      if(!d.err){queueDoc(d.id);continue}                                    /* ค้างกลางทาง */
      if(noRetry(d.errCode))continue;
      if(!d.nextTry){retryLater(d,d.errCode);await saveDoc(d);continue}
      if(now>=d.nextTry){d.nextTry=0;await saveDoc(d);queueDoc(d.id)}
    }
    if(!ME)return;
    for(const d of mine){
      if(d.stage!=='ready'||busy(d))continue;
      if(d.shareErr&&!/สิทธิ์อนุมัติ/.test(d.shareErr)){
        if(!d.nextTry){retryLater(d);await saveDoc(d);continue}
        if(now>=d.nextTry){d.nextTry=0;d.shareErr='';await saveDoc(d);await submitDoc(d,{auto:true});if(d.shareErr){retryLater(d);await saveDoc(d)}else{d.tries=0;await saveDoc(d)}}
      }else if(d.srcErr&&d.subId&&d.subStatus==='pending'&&!d.srcFile){         /* ต้นฉบับยังไม่ขึ้น Drive */
        if(!d.nextTry){retryLater(d);await saveDoc(d);continue}
        if(now>=d.nextTry){
          try{const fo=await docBuf(d).catch(()=>null);if(!fo){d.srcErr='';await saveDoc(d);continue}
            const r=await withRetry(()=>uploadOriginal(d.name,fo,d.type==='pdf'?'application/pdf':'',null,d.sha));
            const f=await fb();for(const pid of d.subParts||[d.subId])await f.fs.updateDoc(fsDoc('subs',pid),{srcFile:r.id,updatedAt:f.fs.serverTimestamp()});
            Object.assign(d,{srcFile:r.id,srcErr:'',tries:0,nextTry:0});await saveDoc(d);
          }catch(e){d.srcErr=e&&e.why||'ส่งไฟล์ต้นฉบับขึ้น Drive ไม่สำเร็จ';retryLater(d);await saveDoc(d)}
        }
      }
    }
  }catch(e){console.warn('autoRetry',e)}
  finally{retryBusy=false;if(VIEW==='kb')renderKB()}
}
onAppReady(()=>{setInterval(autoRetry,60000);setTimeout(autoRetry,15000);window.addEventListener('online',()=>setTimeout(autoRetry,3000))});
