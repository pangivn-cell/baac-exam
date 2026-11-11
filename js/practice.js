/* practice.js — หน้าทำข้อสอบ สอบจริง (Mock) กันโกง ประวัติสอบ */
/* ---------- round ---------- */
function subj(){return SUBJ.find(s=>s.id===P.subject)||SUBJ[0]}
/* ---------- เตรียมชุดถัดไปไว้ล่วงหน้า ----------
   ระหว่างทำข้อสอบชุดนี้ ระบบสร้างชุดถัดไป (วิชา ระดับ จำนวนข้อเดียวกัน) ไว้เบื้องหลัง กด สร้างโจทย์ชุดใหม่ แล้วได้ทันที
   ทำเฉพาะวิชาที่ต้องใช้ AI · เปลี่ยนวิชา/ระดับ/จำนวนข้อ ชุดที่เตรียมไว้จะไม่ถูกใช้ */
let PREFETCH=null;
const pfKey=(s,level,n)=>`${s.id}|${level}|${n}`;
function prefetchNext(){
  const s=subj();if(!activeAI()||!R||R.subject!==s.id||(!s.ai&&!cardMixCount(s,P.count)))return;
  const key=pfKey(s,lvOf(s.id),P.count);if(PREFETCH&&PREFETCH.key===key)return;
  const ctl=new AbortController(),pf={key,ctl,items:null,err:null};
  pf.p=makeItems(s,lvOf(s.id),P.count,{signal:ctl.signal,weak:(P.weak[s.id]||[]).slice(-5)}).then(it=>{pf.items=it}).catch(e=>{pf.err=e});
  if(PREFETCH)PREFETCH.ctl.abort();PREFETCH=pf;
}
async function takePrefetch(s,level,n){
  const pf=PREFETCH;if(!pf||pf.key!==pfKey(s,level,n))return null;
  PREFETCH=null;await pf.p;
  return pf.items&&pf.items.length?pf.items.filter(q=>!qMastered(q)):null;
}
/* ---------- ทำต่อ: จำชุดที่ทำค้างไว้ในเครื่อง (ปิดเว็บแล้วกลับมาก็ต่อข้อเดิมได้) ---------- */
const RUN_KEY='exam-run',RUN_TTL=3*864e5;
function saveRun(){
  /* ชุดที่ยังไม่ได้ตอบสักข้อ (เช่น ชุดที่สร้างเองตอนเปิดเว็บ) ไม่ทับชุดที่ทำค้างไว้ */
  if(!R||R.status!=='play'||!R.items.length||!R.picks.some(p=>p!=null))return;
  try{localStorage.setItem(RUN_KEY,JSON.stringify({subject:R.subject,level:R.level,mode:R.mode,items:R.items,picks:R.picks,i:R.i,t0:R.t0,at:Date.now()}))}catch(e){}
}
function clearRun(){try{localStorage.removeItem(RUN_KEY)}catch(e){}}
/* ชุดที่ทำค้างของวิชานี้ (ยังมีข้อที่ไม่ได้ตอบ) → {n, next: ลำดับข้อถัดไปที่ยังไม่ตอบ} */
function runOf(id){
  let r=null;
  if(R&&R.subject===id&&R.status==='play'&&R.items.length&&R.picks.some(p=>p!=null))r=R;
  else try{const x=JSON.parse(localStorage.getItem(RUN_KEY)||'null');if(x&&x.subject===id&&Date.now()-x.at<RUN_TTL&&Array.isArray(x.items)&&x.items.length)r=x}catch(e){}
  if(!r)return null;
  const j=r.items.findIndex((_,k)=>r.picks[k]==null);
  return j<0?null:{run:r,n:r.items.length,next:j+1};
}
/* ทำต่อจากข้อแรกที่ยังไม่ตอบ · ไม่มีชุดค้าง = false (ให้เริ่มชุดใหม่) */
function resumeRun(id){
  const x=runOf(id);if(!x)return false;
  P.subject=id;save();
  if(x.run!==R){if(genCtl){genCtl.abort();genCtl=null}if(R&&R.moreCtl)R.moreCtl.abort();
    R={...x.run,picks:x.run.picks.slice(),status:'play',go:true,t0:x.run.t0||Date.now()};delete R.at}
  R.i=x.next-1;
  setView('practice');renderSide();
  return true;
}
async function start(go){
  if(genCtl){genCtl.abort();genCtl=null}
  if(R&&R.moreCtl){R.moreCtl.abort();R.moreCtl=null}
  const s=subj(),level=lvOf(s.id),n=P.count;
  R={subject:s.id,level,mode:P.mode,items:[],picks:[],i:0,status:'loading',go:go===true};
  const ai=!!activeAI(),nb=bankFor(s).length;
  /* ข้อมูลผลิตภัณฑ์โหลดตอนใช้วิชานี้ครั้งแรก */
  if(s.psc&&!PSC){const my=R;R.status='pscload';render();try{await loadPSC()}catch(e){if(R!==my)return;R.status='error';R.code=e&&e.code;R.err=errCopy(e&&e.code,'โหลดข้อมูลผลิตภัณฑ์');render();return}if(R!==my)return}
  if(!ai||s.scene||(!s.ai&&!s.psc&&!cardMixCount(s,n)&&!nb)){
    if(s.ai&&!nb){R.status='needai';render();return}
    R.items=mixAll(offlineItems(s,level,n));R.status='play';R.t0=Date.now();render();return}
  if(!R.go){R.status='idle';render();return}
  render();
  const my=R;genCtl=new AbortController();
  try{
    const pre=await takePrefetch(s,level,n);
    /* ข้อแรกขึ้นทันที: สร้าง 2 ข้อก่อนให้เริ่มทำได้เลย ที่เหลือสร้างต่อเบื้องหลัง */
    const quick=!(pre&&pre.length>=Math.ceil(n*.6))&&n>=4;
    const items=pre&&pre.length>=Math.ceil(n*.6)?pre:await makeItems(s,level,n,{fast:quick,signal:genCtl.signal,weak:(P.weak[s.id]||[]).slice(-5),onProg:d=>{const el=document.getElementById('genp');if(el)el.textContent=`ได้แล้ว ${d} จาก ${n} ข้อ`}});
    if(R!==my)return;
    if(!items.length){R.status='error';R.err='ได้โจทย์ที่ใช้ไม่ได้ ลองสร้างชุดใหม่อีกครั้ง';render();return}
    R.items=items;R.status='play';R.t0=Date.now();
    /* ชุดที่ได้ยังไม่ครบตามจำนวนที่ตั้ง (สร้างเร็ว 2 ข้อแรก หรือชุดที่เตรียมไว้ล่วงหน้าไม่ครบ) สร้างเพิ่มเบื้องหลังจนครบ */
    if(items.length<n)loadMore(my,s,level,n);
    render();
  }catch(e){
    if(R!==my)return;const code=e&&e.code;
    if(code==='cancelled')return;
    R.status=HIDE_CODES.includes(code)||code==='no_ai'?'needai':'error';
    R.err=code==='need_figs'?'วิชานี้ต้องใช้รูปโจทย์จากเอกสาร อัปโหลดเอกสารแนวข้อสอบมิติสัมพันธ์ (เลือกกลุ่มความรู้ความสามารถทั่วไป) ในคลังความรู้ก่อน AI วาดรูปโจทย์ใหม่เองไม่ได้':code==='no_vision'?'วิชานี้ต้องใช้ AI ที่ดูรูปได้ ตั้งค่า Gemini หรือ OpenAI key':code==='no_doc'?'ไม่พบเอกสารนี้ในคลังความรู้แล้ว':code==='doc_empty'?'เอกสารนี้ยังไม่มีข้อความ (น่าจะเป็นไฟล์สแกน) ไปที่คลังความรู้แล้วกด ประมวลผลด้วย AI ก่อน':errCopy(code,'สร้างโจทย์');
    render();
  }finally{if(R===my)genCtl=null}
}

/* สร้างข้อที่เหลือของชุดต่อเบื้องหลัง แล้วต่อท้ายชุดที่กำลังทำ */
async function loadMore(my,s,level,n){
  const ctl=new AbortController();my.more=true;my.target=n;my.moreCtl=ctl;
  try{
    const have=new Set(my.items.map(qKey));let waiting=false;
    /* AI อาจได้โจทย์น้อยกว่าที่ขอ หรือซ้ำกับข้อที่มีแล้ว: ลองเพิ่มสูงสุด 3 รอบจนครบ */
    for(let t=0;t<3&&my.items.length<n;t++){
      const rest=await makeItems(s,level,n-my.items.length+1,{signal:ctl.signal,weak:(P.weak[s.id]||[]).slice(-5)});
      if(R!==my)return;
      waiting=waiting||my.i>=my.items.length-1;let add=0;
      for(const q of rest)if(my.items.length<n&&!have.has(qKey(q))){have.add(qKey(q));my.items.push(q);add++}
      if(add&&VIEW==='practice'&&my.status==='play'){if(waiting){render();waiting=false}else{const m=document.getElementById('pmeta');if(m)m.textContent=`ข้อ ${my.i+1} จาก ${my.items.length}`}}
    }
    my.more=false;my.moreCtl=null;
    if(my.items.length<n)toast(`สร้างได้ ${my.items.length} จาก ${n} ข้อ (โจทย์ของวิชานี้ไม่พอ หรือ AI สร้างไม่ครบ)`,'bad');
    if(VIEW==='practice'&&my.status==='play'&&waiting)render();else{const m=document.getElementById('pmeta');if(m)m.textContent=`ข้อ ${my.i+1} จาก ${my.items.length}`}
  }catch(e){
    if(R!==my||(e&&e.code==='cancelled'))return;
    my.more=false;my.moreCtl=null;toast(`สร้างข้อที่เหลือไม่สำเร็จ ชุดนี้มี ${my.items.length} ข้อ`,'bad');if(VIEW==='practice'&&my.status==='play')render();
  }
}

/* ---------- render ---------- */
function givenHTML(x){return `<div class="given"><span class="k">ถ้า</span><span class="eq">${esc(`${c(x.k,x.X)} > ${x.H} > ${x.M} ≯ ${x.R} + ${x.S}`)} &nbsp;<span class="k">และ</span></span><span></span><span class="eq">${esc(`${x.X} = ${x.Y} > ${x.Q} > ${FR[x.k]}${x.H}`)}</span><span class="note">ทุกตัวอักษรมีค่ามากกว่าศูนย์</span></div>`}
function mergedHTML(x,hl){
  const ch=[c(x.k,x.X),c(x.k,x.Y),c(x.k,x.Q),x.H,x.M,`${x.R}+${x.S}`],ops=['=','>','>','>','≯'];
  const lo=hl?Math.min(...hl):-1,hi=hl?Math.max(...hl):-1;let h='';
  ch.forEach((v,i)=>{const cls=!hl?'':(hl.includes(i)?' hl':(i>lo&&i<hi?'':' dim'));h+=`<span class="chip${cls}">${esc(v)}</span>`;
    if(i<ops.length){const oc=!hl?'':(i>=lo&&i<hi?' hl':' dim');h+=`<span class="op${oc}">${esc(ops[i])}</span>`}});
  return `<div class="row">${h}</div>`}
function questionHTML(q){
  if(q.kind==='ineq2'){const L=q.lines;let g=`<div class="given"><span class="k">ถ้า</span>`;L.forEach((l,i)=>{g+=`${i?'<span></span>':''}<span class="eq">${esc(l)}${i<L.length-1?' &nbsp;<span class="k">และ</span>':''}</span>`});g+=`<span class="note">ทุกตัวอักษรมีค่ามากกว่าศูนย์</span></div>`;
    return g+(q.fmt==='tfu'?`<div class="ask"><div class="lab">ข้อสรุป</div><div class="st">${esc(q.text)}</div></div>`:`<div class="ask"><div class="lab">คำถาม</div><div class="st2">${esc(q.text)}</div></div>`)}
  if(q.kind==='ineq')return `${givenHTML(q.ctx)}<div class="ask"><div class="lab">ข้อสรุป</div><div class="st">${esc(q.text)}</div></div>`;
  return `${q.pool?'<p class="origtag pooltag">♻ โจทย์จากคลังกลาง (ไม่ใช้เครดิต AI)</p>':''}${q.retry?'<p class="origtag retrytag">🔁 ข้อที่เคยตอบผิด ลองตอบใหม่อีกครั้ง</p>':''}${q.orig?'<p class="origtag">ข้อสอบจริงจากคลัง</p>':''}${q.fig&&!String(q.stem||'').includes(`[รูป ${q.fig}]`)?figHTML(q.fig):''}${q.svg?`<figure class="qsvgw">${q.svg}</figure>`:''}${q.viz?renderViz(q.viz):''}<div class="stem">${figText(q.stem)}</div>`;
}
function choicesHTML(q,pick,locked){
  const mc=!isTFU(q),pics=mc&&q.chSvg;
  return `<div class="choices${mc?' mc':''}${pics?' pics':''}">${q.choices.map((t,j)=>{
    let cls='ch';if(locked){if(j===q.answer)cls+=' right';else if(j===pick)cls+=' wrong'}else if(j===pick)cls+=' sel';
    return `<button class="${cls}" data-j="${j}" ${locked?'disabled':''} aria-pressed="${j===pick}">${pics?`<b>${TH[j]}</b><span class="chsvg">${q.chSvg[j]}</span>`:mc?`<b>${TH[j]}</b><span>${figText(t,'qfig chfig')}</span>`:esc(t)}</button>`}).join('')}</div>`;
}
/* ---------- วิธีคิดแบบละเอียด (โจทย์คำนวณ) ----------
   เฉลยเดิมของโจทย์คำนวณมักสั้น 2–4 ขั้น คนพื้นฐานคณิตอ่อนตามไม่ทัน → ให้ AI เขียนเฉลย 2 แบบ (ยึดคำตอบเดิม ห้ามเปลี่ยน)
   1) สูตรลัด/วิธีลัด สำหรับทำให้ทันเวลาสอบ: สูตร → แทนค่า → คิดเลข
   2) วิธีคิดแบบเห็นภาพ ไม่ต้องใช้ตัวแปร x: มองเป็นช่อง/ส่วน ทีละขั้น มีข้อสังเกตกำกับ
   ทำครั้งเดียวต่อข้อ เก็บไว้ในเครื่อง (สูงสุด 400 ข้อ) เปิดเฉลยข้อเดิมอีกครั้งไม่ต้องรอ AI */
const CALCD_KEY='exam-calc-detail2',CALCD_BUSY={},CALCD_Q={};
let CALCD={};try{CALCD=JSON.parse(localStorage.getItem(CALCD_KEY)||'{}')||{};localStorage.removeItem('exam-calc-detail')}catch(e){CALCD={}}
function isCalcQ(q){
  if(!q||!Array.isArray(q.choices)||q.choices.length<2||q.kind==='ineq'||qPic(q))return false;
  const dig=q.choices.filter(c=>/\d/.test(String(c))).length,nums=(String(q.stem||'').match(/\d+(?:[.,]\d+)*/g)||[]).length;
  return dig>=Math.ceil(q.choices.length*.75)&&nums>=2;
}
/* ข้อความคณิต: {ตัวเศษ}/{ตัวส่วน} และ 12/3 แสดงเป็นเศษส่วนซ้อนบนล่าง · **คำ** เป็นตัวหนา */
function mathHTML(t){
  const fr=(a,b)=>`<span class="fr"><span>${a.trim()}</span><span>${b.trim()}</span></span>`;
  return esc(String(t||'')).replace(/\{([^{}]+)\}\s*\/\s*\{([^{}]+)\}/g,(_,a,b)=>fr(a,b)).replace(/\{([^{}]+)\}\s*\/\s*(\d+(?:\.\d+)?)/g,(_,a,b)=>fr(a,b)).replace(/(\d+(?:\.\d+)?)\s*\/\s*\{([^{}]+)\}/g,(_,a,b)=>fr(a,b)).replace(/(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)/g,(_,a,b)=>fr(a,b)).replace(/[{}]/g,'');
}
const richHTML=t=>mathHTML(t).replace(/\*\*([^*]+)\*\*/g,'<b>$1</b>');
const strArr=a=>(Array.isArray(a)?a:[]).map(x=>String(x&&typeof x==='object'?x.text||x.say||'':x||'').trim()).filter(Boolean);
function calcdBody(d){
  let h='';const sc=d.short;
  if(sc&&sc.formula){
    h+=`<p class="ch4">⚡ ${esc(sc.name||'สูตรลัด')}</p><div class="fmla"><div>${richHTML(sc.formula)}</div></div>`;
    if(sc.given.length)h+=`<p class="lbl" style="margin:0">วิธีแทนค่าจากโจทย์</p><ul class="cpts">${sc.given.map(x=>`<li>${richHTML(x)}</li>`).join('')}</ul>`;
    if(sc.calc.length)h+=`<div class="fmla">${sc.calc.map(x=>`<div>${richHTML(x)}</div>`).join('')}</div>`;
    if(sc.when)h+=`<p class="cnote">ใช้ได้เมื่อ: ${richHTML(sc.when)}</p>`;
    h+='<hr class="csep">';
  }
  const v=d.vis;
  if(v&&v.steps.length){
    h+=`<p class="ch4">🧩 ${esc(v.title||'วิธีคิดแบบเห็นภาพ')}</p>${v.intro?`<p style="margin:0">${richHTML(v.intro)}</p>`:''}
      <ol class="csteps">${v.steps.map(s=>`<li><b>${richHTML(s.head)}</b>${s.points.length?`<ul class="cpts">${s.points.map(x=>`<li>${richHTML(x)}</li>`).join('')}</ul>`:''}${s.math?`<div class="cmath">${richHTML(s.math)}</div>`:''}${s.note?`<p class="cnote">${richHTML(s.note)}</p>`:''}</li>`).join('')}</ol>`;
  }
  if(d.check)h+=`<p style="margin:0">✅ <b>ตรวจคำตอบ:</b> ${richHTML(d.check)}</p>`;
  if(d.tip)h+=`<p class="src" style="margin:0">💡 ${richHTML(d.tip)}</p>`;
  return h;
}
function calcdHTML(q){
  if(!isCalcQ(q))return '';
  const k=qKey(q),d=CALCD[k];CALCD_Q[k]=q;
  if(d)return `<div class="calcd">${calcdBody(d)}</div>`;
  if(!activeAI())return '';
  if(CALCD_BUSY[k]==='err')return `<div class="calcd" data-calcd="${esc(k)}"><p class="src">เตรียมวิธีคิดแบบละเอียดไม่สำเร็จ <button type="button" class="ghost" data-calcretry="${esc(k)}">ลองอีกครั้ง</button></p></div>`;
  setTimeout(()=>calcdLoad(k),0);
  return `<div class="calcd" data-calcd="${esc(k)}"><p class="src"><span class="spin sm" aria-hidden="true"></span> AI กำลังเขียนสูตรลัดและวิธีคิดแบบละเอียด…</p></div>`;
}
async function calcdLoad(k){
  const q=CALCD_Q[k];if(!q||CALCD[k]||CALCD_BUSY[k]===1)return;CALCD_BUSY[k]=1;
  const old=(q.steps||[]).map(x=>Array.isArray(x)?x[0]:x).filter(Boolean);
  const prompt=`เขียนเฉลยข้อสอบคำนวณข้อนี้ สำหรับคนที่ไม่เก่งคณิตศาสตร์เลย และต้องการทำให้ทันเวลาสอบ
โจทย์: ${q.stem}
ตัวเลือก: ${q.choices.map((c,i)=>`${TH[i]}. ${c}`).join('  ')}
คำตอบที่ถูก: ${TH[q.answer]}. ${q.choices[q.answer]} (คำตอบนี้ถูกต้องแล้ว ห้ามเปลี่ยน)
${old.length?`เฉลยเดิมแบบย่อ: ${old.join(' / ')}\n`:''}
เขียน 2 ส่วน:
ส่วนที่ 1 short = สูตรลัดหรือวิธีลัดที่ใช้กับโจทย์แนวนี้ได้ทุกข้อ เพื่อทำให้เร็วในห้องสอบ
- name ชื่อสูตร เช่น "สูตรลัดอายุลูก (ปัจจุบัน)"
- formula สูตรเขียนเป็นคำ เช่น อายุลูกปัจจุบัน = {จำนวนปีที่ย้อนไป × (เท่าในอดีต − 1)}/{เท่าในอดีต − เท่าในปัจจุบัน}
- given รายการค่าที่ดึงจากโจทย์ เช่น "จำนวนปีที่ย้อนไป = 12"
- calc บรรทัดแทนค่าและคิดเลขทีละบรรทัดจนได้คำตอบ เช่น "อายุลูก = {12 × (6 − 1)}/{6 − 3}" "= {12 × 5}/{3}" "= 60/3 = **20 ปี**"
- when ใช้สูตรนี้ได้เมื่อไร 1 ประโยค
- ต้องแทนค่าแล้วได้คำตอบตรงกับคำตอบที่ถูกจริง ตรวจซ้ำก่อนส่ง ถ้าโจทย์แนวนี้ไม่มีสูตรลัดที่ถูกต้อง ให้ short เป็น null
ส่วนที่ 2 vis = วิธีคิดแบบเห็นภาพ ไม่ต้องใช้ตัวแปร x (เช่น มองเป็น "ช่อง" หรือ "ส่วน" วาดในใจ เทียบสัดส่วน นับทีละขั้น)
- title เช่น "วิธีคิดแบบเห็นภาพ (ไม่ต้องใช้สูตร ไม่ต้องใช้ตัวแปร x)"
- intro 1 ประโยค บอกว่าจะมองโจทย์เป็นอะไร
- ต้องเป็นการให้เหตุผลจริงจากโจทย์ ห้ามใช้วิธีนำตัวเลือกมาลองแทน (การลองแทนใช้ได้เฉพาะใน check)
- หาสิ่งที่ "คงที่" หรือ "เท่ากัน" ในโจทย์ (เช่น ผลต่างอายุของสองคนไม่เปลี่ยนตามเวลา ผลรวมคงที่ ราคาต่อหน่วยเท่ากัน) แล้วปรับจำนวนส่วนของสองช่วงให้เทียบกันได้ (ส่วนเล็ก/ส่วนใหญ่) จากนั้นหาว่า 1 ส่วนมีค่าเท่าไร
  ตัวอย่างแนวคิด (โจทย์พ่ออายุ 3 เท่าลูก เมื่อ 12 ปีก่อน 6 เท่า): ผลต่างตอนนี้ 2 ส่วน ตอนก่อน 5 ส่วนเล็ก ผลต่างต้องเท่ากัน จึงแบ่งให้ละเอียดเท่ากันที่ 10 ช่อง → ลูกตอนนี้ 5 ช่อง ตอนก่อน 2 ช่อง ต่างกัน 3 ช่อง = 12 ปี → 1 ช่อง = 4 ปี → ลูกอายุ 5 × 4 = 20 ปี
- steps 4–6 ขั้น ขั้นสุดท้ายเป็นการสรุปคำตอบ แต่ละขั้นมี head = หัวข้อขั้น (เช่น "มองภาพปัจจุบัน: พ่ออายุเป็น 3 เท่าของลูก"), points = รายการย่อย 1–3 ข้อ, math = บรรทัดคำนวณของขั้นนั้น (ไม่มีให้ว่าง), note = ข้อสังเกตที่ทำให้เข้าใจว่าทำไม (ไม่มีให้ว่าง)
- คิดเลขทีละขั้น ห้ามข้ามขั้น การคูณหารเลขหลายหลักให้แตกให้เห็น
check = วิธีตรวจคำตอบ 1–2 ประโยค · tip = เคล็ดลับจำสำหรับโจทย์แนวนี้ 1 ประโยค
รูปแบบเลข: ใช้ × ÷ + − = เศษส่วนเขียน {ตัวเศษ}/{ตัวส่วน} หรือ 60/3 ร้อยละเขียน % คำสำคัญหรือคำตอบสุดท้ายครอบด้วย **คำ** ได้ ห้ามเขียนตัวเลขเป็นคำพูด (เช่น "1 ส่วน 20") ไม่ใช้ * เป็นเครื่องหมายคูณ ไม่ใช้ LaTeX ไม่ต้องใส่เลขข้อหน้าขั้น ภาษาไทยทั้งหมด
ตอบเป็น JSON เท่านั้น: {"short":{"name":"","formula":"","given":[""],"calc":[""],"when":""},"vis":{"title":"","intro":"","steps":[{"head":"","points":[""],"math":"","note":""}]},"check":"","tip":""}`;
  try{
    const r=await aiJSON(prompt)||{};
    const clean=v=>String(v||'').replace(/^\s*(ขั้นที่\s*)?\d+[.)]\s*/,'').trim();
    const s0=r.short&&typeof r.short==='object'?r.short:null,v0=r.vis&&typeof r.vis==='object'?r.vis:{};
    const short=s0&&String(s0.formula||'').trim()?{name:String(s0.name||'').trim(),formula:String(s0.formula).trim(),given:strArr(s0.given),calc:strArr(s0.calc),when:String(s0.when||'').trim()}:null;
    const steps=(Array.isArray(v0.steps)?v0.steps:[]).map(x=>x&&typeof x==='object'?{head:clean(x.head||x.say||x.text),points:strArr(x.points),math:String(x.math||'').trim(),note:String(x.note||'').trim()}:{head:clean(x),points:[],math:'',note:''}).filter(x=>x.head||x.math).slice(0,10);
    if(!steps.length&&!short)throw{code:'ai_bad_out'};
    CALCD[k]={short,vis:{title:String(v0.title||'').trim(),intro:String(v0.intro||'').trim(),steps},check:String(r.check||'').trim(),tip:String(r.tip||'').trim().slice(0,240),at:Date.now()};
    const ks=Object.keys(CALCD);if(ks.length>400)ks.sort((a,b)=>CALCD[a].at-CALCD[b].at).slice(0,ks.length-400).forEach(x=>delete CALCD[x]);
    try{localStorage.setItem(CALCD_KEY,JSON.stringify(CALCD))}catch(e){}
    CALCD_BUSY[k]=0;
  }catch(e){CALCD_BUSY[k]='err'}
  document.querySelectorAll('[data-calcd]').forEach(el=>{if(el.dataset.calcd===k)el.outerHTML=calcdHTML(q)});
}
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-calcretry]');if(!b)return;const k=b.dataset.calcretry;CALCD_BUSY[k]=0;const el=b.closest('[data-calcd]');if(el&&CALCD_Q[k])el.outerHTML=calcdHTML(CALCD_Q[k])});
function explainHTML(q,pick){
  const ok=pick===q.answer;
  let h=`<div class="explain"><p class="verdict ${ok?'good':'bad'}">${pick==null?'ไม่ได้ตอบ':ok?'ถูกต้อง':'ยังไม่ใช่'} · เฉลย ${isTFU(q)?'':TH[q.answer]+(q.chSvg?'':'. ')}${q.chSvg?'':esc(String(q.choices[q.answer]).replace(FIG_TOK,'').trim())}</p>`;
  if(q.kind==='ineq'){const x=q.ctx;h+=`<p class="lbl">แถวรวม <span class="src">(มาจาก: คูณ ${x.k} ทุกตัวในบรรทัดล่างให้ ${FR[x.k]}${esc(x.H)} เป็น ${esc(x.H)} แล้วต่อกับบรรทัดบนตรง ${esc(x.H)})</span></p>${mergedHTML(x,q.hl)}`}
  if(q.exSvg)h+=`<figure class="qsvgw">${q.exSvg}</figure>`;
  if(q.expViz)h+=renderViz(q.expViz);
  if(q.steps.length)h+=`<ol class="steps">${q.steps.map(([t,s])=>`<li>${esc(t)}${s?` <span class="src">(มาจาก: ${esc(s)})</span>`:''}</li>`).join('')}</ol>`;
  h+=calcdHTML(q);
  if(q.ansAI)h+=`<p class="kwarn" style="margin:0">เฉลยข้อนี้ AI ดูจากรูปเอง เพราะเอกสารไม่มีเฉลย อาจผิดได้ ถ้าสงสัยให้ถาม AI ด้านล่าง หรือแก้บัตรความรู้ในคลังความรู้</p>`;
  if(q.fixed&&!q.fixed.balance)h+=`<p class="kwarn" style="margin:0">✔ ข้อนี้ถูกแก้แล้วหลังมีผู้แย้งเฉลยและ AI ตรวจซ้ำ 2 รอบ${q.fixed.why?`: ${esc(q.fixed.why)}`:''}${(q.fixed.sources||[]).length?` · แหล่ง: ${q.fixed.sources.slice(0,3).map(x=>`<a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.title)}</a>`).join(', ')}`:''}${typeof isReviewerMe==='function'&&isReviewerMe()?` <button class="ghost" type="button" data-unfix="${esc(q.origKey||'')}">ยกเลิกการแก้</button>`:''}</p>`;
  if(q.cite)h+=`<p class="cite">${q.citeUrl?'📚 ศึกษาเพิ่มเติม':'📄 อ้างอิง'}: ${esc(q.cite)}${q.by?` · อัปโหลดโดย ${esc(q.by)}`:''}${/^https:\/\//.test(q.citeUrl||'')?pscLinkHTML(q.citeUrl):''}</p>`;
  if(q.card&&typeof srcBtn==='function')h+=srcBtn(q);
  {const rp=typeof cloudCardOf==='function'&&cloudCardOf(q),dc=isMC(q)&&q.stem&&(q.card&&CARDS.some(x=>x.id===q.card&&x.type==='q')||q.poolId||q.pool||q.gen==='ai'||q.orig)?qdelRef(q):'';
   const sk=q.card&&CARDS.some(x=>x.id===q.card)?q.card:'',on=sk&&SKIPT['c:'+sk];
   if(rp||dc||sk)h+=`<div class="btnrow" style="justify-content:flex-start">${sk?`<button class="ghost" type="button" data-qskip="${esc(sk)}" aria-pressed="${!!on}">${on?'↩ ยกเลิกการข้ามแนวนี้':'⏭ ข้ามคำถามแนวนี้'}</button>`:''}${rp?`<button class="ghost" type="button" data-rpt="${esc(q.card)}">⚑ รายงานเฉลยผิด</button>`:''}${dc?`<button class="ghost" type="button" data-qdel="${dc}">🗑 ลบข้อสอบข้อนี้</button>`:''}</div>`}
  return h+`</div>`;
}
function askHTML(id,q,pick){
  const ok=pick===q.answer;
  return `<div class="askbox" id="ab-${id}" ${activeAI()?'':'hidden'}>
   <p class="lbl">สงสัยตรงไหน ถามแย้งได้เลย</p>
   <div class="quick">${!ok&&pick!=null?`<button type="button" class="qk" data-q="ทำไมไม่ตอบว่า ${esc(q.choices[pick])}">ทำไมไม่ตอบว่า ${esc(q.choices[pick])}</button>`:''}<button type="button" class="qk" data-q="อธิบายข้อนี้ให้ง่ายกว่านี้อีก">อธิบายให้ง่ายกว่านี้</button><button type="button" class="qk" data-verify>⚖ ตรวจว่าเฉลยถูกไหม</button></div>
   <div class="thread"></div>
   <form class="askform"><label for="ai-${id}" class="lbl">พิมพ์คำถามของคุณ</label><textarea id="ai-${id}" rows="2" placeholder="เช่น ถ้าคิดอีกแบบ ข้อนี้น่าจะตอบอีกข้อไม่ใช่เหรอ (Enter ส่ง · Shift+Enter ขึ้นบรรทัดใหม่)"></textarea><div class="askrow"><label class="webt"${canWeb()?'':' hidden'}><input type="checkbox" class="webchk"> ค้นเว็บประกอบ</label><span class="asknote"></span><button type="button" class="stop" hidden>หยุด</button><button type="submit" class="send">ถาม</button></div></form>
  </div>`;
}
function rulesFor(q,pick){
  let ctx;
  if(q.kind==='ineq'){const x=q.ctx;ctx=`โจทย์:\nบรรทัดบน: ${c(x.k,x.X)} > ${x.H} > ${x.M} ≯ ${x.R} + ${x.S}\nบรรทัดล่าง: ${x.X} = ${x.Y} > ${x.Q} > ${FR[x.k]}${x.H}\nทุกตัวอักษรมีค่ามากกว่าศูนย์ (≯ แปลว่า ไม่มากกว่า)\nแถวรวม (คูณ ${x.k} ทุกตัวในบรรทัดล่างแล้วต่อตรง ${x.H}): ${c(x.k,x.X)} = ${c(x.k,x.Y)} > ${c(x.k,x.Q)} > ${x.H} > ${x.M} ≯ ${x.R} + ${x.S}\nข้อสรุปที่ถาม: ${q.text}\nความหมาย: จริง = โจทย์ยืนยันว่าถูก, ไม่จริง = โจทย์ยืนยันว่าผิด, สรุปไม่ได้ = โจทย์ไม่ได้ยืนยันทั้งสองทาง`}
  else if(q.kind==='ineq2')ctx=`โจทย์ (เงื่อนไขสัญลักษณ์):\n${q.lines.map((l,i)=>`บรรทัดที่ ${i+1}: ${l}`).join('\n')}\nทุกตัวอักษรมีค่ามากกว่าศูนย์ (≯ แปลว่า ไม่มากกว่า, ≮ แปลว่า ไม่น้อยกว่า)\n${q.fmt==='tfu'?`ข้อสรุปที่ถาม: ${q.text}\nความหมาย: จริง = โจทย์ยืนยันว่าถูก, ไม่จริง = โจทย์ยืนยันว่าผิด, สรุปไม่ได้ = โจทย์ไม่ได้ยืนยันทั้งสองทาง`:`คำถาม: ข้อใดสรุปได้ถูกต้องแน่นอน\nตัวเลือก: ${q.choices.map((t,j)=>`${TH[j]}. ${t}`).join(' | ')}`}\nคำตอบถูกตรวจด้วยการคำนวณทางคณิตศาสตร์แล้ว ถูกต้องแน่นอน`;
  else ctx=`วิชา: ${q.subName||subj().name}${q.topic&&q.topic!==q.subName?` (หัวข้อ ${q.topic})`:''}\nโจทย์: ${q.stem}${q.desc?`\nรูปประกอบ (ระบบวาดเองจากข้อมูลนี้ เฉลยคำนวณจากข้อมูลจริง): ${q.desc}`:''}\nตัวเลือก: ${q.choices.map((t,j)=>`${TH[j]}. ${t}`).join(' | ')}`;
  return `คุณคือติวเตอร์ข้อสอบราชการไทย กำลังช่วยนักเรียนที่เพิ่งตอบข้อนี้

${ctx}
เฉลยที่ถูกต้อง: ${q.choices[q.answer]}
เหตุผลในเฉลย: ${q.steps.map(s=>s[0]).join(' / ')}
นักเรียนตอบว่า: ${pick==null?'ไม่ได้ตอบ':q.choices[pick]}
${q.srcText?`
เนื้อหาจากเอกสารอ้างอิง [${q.cite}]:
${q.srcText}
`:''}
วิธีตอบ:
${q.srcText?`- อธิบายโดยอิงเนื้อหาจากเอกสารอ้างอิงข้างบนเป็นหลัก ปิดท้ายทุกคำตอบด้วยบรรทัด "อ้างอิง: ${q.cite}" ถ้าเอกสารไม่ได้พูดถึงสิ่งที่ถาม ให้บอกตรงๆ ว่าเอกสารไม่ได้ระบุ\n`:isSpecSub(q.sub)||(q.subName&&SPEC.some(x=>x[1]===q.subName))?'- ปิดท้ายทุกคำตอบด้วยบรรทัด "อ้างอิง: " ตามด้วยชื่อกฎหมาย มาตรา หรือหลักการที่ใช้ และบอกว่าไม่ได้มาจากเอกสารในคลังความรู้\n':''}
- ตอบคำถามทันทีตั้งแต่ประโยคแรก ห้ามชม ห้ามปลอบ ห้ามทักทาย ห้ามขึ้นต้นด้วยคำอย่าง "หนูทำได้ดีแล้ว" "คำถามดีมาก" "เข้าใจได้ที่สงสัย" และห้ามเรียกผู้ถามว่าหนู
- ถ้าถูกถามซ้ำหรือยังไม่เข้าใจ ห้ามตอบซ้ำแบบเดิม ให้อธิบายด้วยวิธีใหม่ ยกตัวอย่างหรือหลักฐานใหม่ ถ้าไม่มีข้อมูลเพิ่มให้บอกตรงๆ
- ถ้ามีข้อมูลจากการค้นเว็บ ใช้เฉพาะแหล่งที่เชื่อถือได้ และบอกว่ามาจากไหน
- ตอบเป็นภาษาไทย สั้น กระชับ ไม่เกินประมาณ 8 บรรทัด ภาษาพูดง่ายๆ
- ห้ามใช้ markdown เช่น ** หรือ # หรือตาราง ถ้าแบ่งขั้นให้ขึ้นบรรทัดใหม่ขึ้นต้นด้วย ① ② ③
- ห้ามข้ามขั้น ทุกครั้งที่มีค่าหรือพจน์ที่ไม่ได้อยู่ในโจทย์ตรงๆ ต้องบอกว่ามาจากไหน
- ถ้าเฉลยถูกต้อง และนักเรียนแย้ง ให้ชี้ตรงๆ ว่าเหตุผลพลาดตรงไหน ถ้าตรวจแล้วพบว่าเฉลยผิดจริง ให้ยอมรับตรงๆ และบอกคำตอบที่ถูก
- ไม่ต้องแทนตัวเลขสมมติ เว้นแต่นักเรียนขอ
- ถ้าคำถามไม่เกี่ยวกับข้อนี้ ตอบสั้นๆ แล้วชวนกลับมาที่ข้อนี้`;
}
/* บทสนทนาแต่ละข้อเก็บไว้นอกหน้า: หน้าถูกวาดใหม่ (ซิงก์ทุก 3 นาที กลับมาที่แท็บ) แล้วบทสนทนาไม่หาย */
/* ข้ามคำถามแนวนี้: บัตร/ข้อต้นทางแทบไม่ถูกหยิบมาอีก (เหลือเฉพาะเมื่อวิชานั้นไม่มีข้ออื่นแล้ว) หน้าเอกสารเดียวกันถูกหยิบน้อยลงด้วย */
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-qskip]');if(!b)return;e.preventDefault();
  const c=CARDS.find(x=>x.id===b.dataset.qskip);if(!c)return;const k='c:'+c.id,pk=pageKey(c);
  if(SKIPT[k]){delete SKIPT[k];if(pk&&!CARDS.some(x=>x!==c&&SKIPT['c:'+x.id]&&pageKey(x)===pk))delete SKIPT[pk];saveSkipT();toast('ยกเลิกการข้ามแล้ว คำถามแนวนี้จะกลับมาตามปกติ')}
  else{SKIPT[k]=Date.now();if(pk)SKIPT[pk]=Date.now();saveSkipT();toast('ข้ามคำถามแนวนี้แล้ว จะแทบไม่แสดงอีก')}
  const on=!!SKIPT[k];document.querySelectorAll(`[data-qskip="${CSS.escape(c.id)}"]`).forEach(x=>{x.setAttribute('aria-pressed',on);x.textContent=on?'↩ ยกเลิกการข้ามแนวนี้':'⏭ ข้ามคำถามแนวนี้'})});
const ASKST=new Map();
function askState(q,pick){
  const k=(q.origKey||qKey(q))+'|'+pick;let st=ASKST.get(k);
  if(!st){st={k,msgs:[],turns:[],rules:rulesFor(q,pick),ctxDone:!!q.srcText||!CARDS.length,web:canWeb(),draft:'',busy:false,ctl:null,note:''};ASKST.set(k,st)}
  return st;
}
function paintAsk(id,st){
  const box=document.getElementById('ab-'+id);if(!box||box.dataset.k!==st.k)return;
  const thread=box.querySelector('.thread');thread.textContent='';
  for(const m of st.msgs){
    const d=document.createElement('div');d.className='msg '+m.cls;d.textContent=m.text;
    if(m.sources&&m.sources.length){const sd=document.createElement('div');sd.className='msrc';sd.append('แหล่งข้อมูล: ');
      m.sources.forEach((x,i)=>{if(i)sd.append(' · ');const a=document.createElement('a');a.href=x.url;a.target='_blank';a.rel='noopener';a.textContent=x.title||x.url;sd.append(a)});d.append(sd)}
    thread.append(d);
  }
  box.querySelector('.asknote').textContent=st.note;
  box.querySelector('.send').disabled=st.busy;box.querySelector('.stop').hidden=!st.busy;
  box.querySelectorAll('.qk').forEach(k=>k.disabled=st.busy);
}
function wireAsk(id,q,pick){
  const box=document.getElementById('ab-'+id);if(!box||box.dataset.w)return;box.dataset.w='1';
  const st=askState(q,pick);box.dataset.k=st.k;
  const form=box.querySelector('form'),inp=box.querySelector('textarea'),stop=box.querySelector('.stop'),web=box.querySelector('.webchk');
  inp.value=st.draft;inp.oninput=()=>{st.draft=inp.value};
  /* Enter = ถาม · Shift+Enter = ขึ้นบรรทัดใหม่ (ระหว่างพิมพ์ไทยด้วย IME ที่ยังเลือกคำอยู่ ไม่ส่ง) */
  inp.onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();if(inp.value.trim())form.requestSubmit()}};
  if(web){web.checked=st.web;web.onchange=()=>{st.web=web.checked}}
  const paint=()=>paintAsk(id,st);
  /* questions without their own source: pull related knowledge cards (meaning-based) on the first question asked */
  async function addCtx(text){
    if(st.ctxDone)return;st.ctxDone=true;
    try{const hits=await searchCards(`${q.stem||qLabel(q)}\n${text}`,4);
      if(hits.length)st.rules+=`\n\nความรู้จากคลังความรู้ที่อาจเกี่ยวข้อง (ใช้เฉพาะถ้าเกี่ยวข้องจริง ถ้าใช้ให้ปิดท้ายด้วย "อ้างอิง:" ตามด้วยป้ายในวงเล็บเหลี่ยม):\n${hits.map(c=>`[${cardCite(c)}] ${c.title}: ${c.fact}`).join('\n')}`}catch(e){}
  }
  async function ask(text,force){
    text=text.trim();if(!text||(!activeAI()&&!localUp())||st.busy)return;
    st.note='';st.msgs.push({cls:'me',text});st.turns.push({role:'user',content:text});st.turns=st.turns.slice(-10);
    const m={cls:'ai wait',text:'กำลังคิด...'};st.msgs.push(m);st.busy=true;st.ctl=new AbortController();paint();
    const signal=st.ctl.signal;
    try{
      await addCtx(text);
      if(force||(isMC(q)&&DISPUTE.test(text))){
        /* ผู้ใช้แย้งเฉลย: ตรวจ 2 รอบ ถ้าผิดจริงแก้ทั้งระบบ */
        const res=await verifyDispute(q,pick,text,{signal,onStep:t=>{m.text=t;paint()}});
        m.sources=res.sources;
        if(res.verdict==='correct')m.text=`ตรวจแล้ว เฉลยถูก: ${q.choices[q.answer]}\n${res.reason}`;
        else if(res.verdict==='unsure')m.text=`ตรวจ 3 รอบแล้วผลยังไม่ตรงกัน ยังสรุปไม่ได้ว่าเฉลยผิด จึงยังไม่แก้\n${res.reason}${typeof cloudCardOf==='function'&&cloudCardOf(q)?'\nถ้ามั่นใจ กด "รายงานเฉลยผิด" ให้ผู้ตรวจดูอีกครั้ง':''}`;
        else if(computedQ(q))m.text=`ผลตรวจบอกว่า${res.verdict==='bad_question'?'โจทย์มีปัญหา':'เฉลยอาจผิด'}: ${res.reason}\nข้อนี้ระบบคำนวณเฉลยด้วยโปรแกรม จึงไม่แก้อัตโนมัติ แจ้งผู้พัฒนาผ่านเมนูติดต่อผู้พัฒนาได้`;
        else{
          const shared=await applyCorrection(q,res);const p=res.prop;
          m.text=`${res.tie?'ตรวจ 3 รอบ ผลส่วนใหญ่ (2 ใน 3) ตรงกัน':'ตรวจ 2 รอบตรงกัน'}: ${res.verdict==='bad_question'?'โจทย์/ตัวเลือกเดิมมีปัญหา แก้โจทย์แล้ว':'เฉลยเดิมผิด'}\nคำตอบที่ถูก: ${p.choices[p.answer]}\n${res.reason}\n${shared?'แก้ในระบบแล้ว ทุกคนจะได้ข้อที่แก้แล้ว':(typeof ME!=='undefined'&&ME)?'แก้ในเครื่องนี้แล้ว แต่ส่งให้ทุกคนไม่สำเร็จ (ฐานข้อมูลยังไม่เปิดสิทธิ์ส่วนนี้)':'แก้ในเครื่องนี้แล้ว (เข้าสู่ระบบเพื่อแก้ให้ทุกคน)'}`;
          st.rules=rulesFor(q,pick);
          setTimeout(()=>{if(typeof render==='function'&&R&&R.items&&R.items.includes(q))render()},50);
        }
      }else{
        let first=st.rules;if(q.fig&&canVision()){const im=await figForAI(q.fig);if(im)first={text:st.rules+'\n\nภาพที่แนบคือรูปประกอบของโจทย์ข้อนี้ ดูรูปจริงก่อนตอบ',images:[im]}}
        const input=[{role:'user',content:first},...st.turns];
        let done=false;
        if(st.web&&canWeb()){
          m.text='กำลังค้นข้อมูลจากเว็บ...';paint();
          try{const r=await aiWeb(input,{signal});m.text=r.text;m.sources=r.sources;done=true}
          catch(e){if(e&&e.code==='cancelled')throw e;st.note=e&&['quota','no_credit'].includes(e.code)?'ค้นเว็บไม่ได้ (โควตา AI หลักหมด) ตอบจากความรู้ของ AI แทน':'ค้นเว็บไม่สำเร็จ ตอบจากความรู้ของ AI แทน'}
        }
        if(!done){m.text=await aiText(input,{signal,onText:({text})=>{m.cls='ai';m.text=text;paint()}});
          if(LAST_AI&&LAST_AI!==activeAI())st.note=`${AINAME[activeAI()]||'AI หลัก'}ใช้ไม่ได้ตอนนี้ ข้อนี้ตอบโดย ${AINAME[LAST_AI]||LAST_AI}${st.web?' (ไม่ได้ค้นเว็บ)':''}`}
      }
      m.cls='ai';st.turns.push({role:'assistant',content:m.text});
    }catch(e){
      const code=e&&e.code;
      /* ตอบไม่ได้: แสดงในบทสนทนาเลย ไม่ปล่อยคำถามค้างไว้เฉยๆ และไม่เก็บคำถามที่ไม่มีคำตอบไว้ในบริบท */
      if(e&&e.text){m.cls='ai';m.text=e.text}
      else if(code==='cancelled')st.msgs.splice(st.msgs.indexOf(m),1);
      else{m.cls='ai err';m.text='ตอบไม่ได้: '+(code==='quota'?'โควตาฟรีของ AI หมดแล้ว (กลับมาเองทุก 60 นาที หรือวันถัดไป) ลองถามใหม่ภายหลัง หรือเพิ่ม AI ตัวอื่นในตั้งค่า AI ระบบจะสลับไปใช้ให้เอง':errCopy(code,'ถาม'))+(localUp()?'':'\nถ้าเครื่องที่ติดตั้ง AI ในเครื่องเปิดอยู่ ให้ถามจากเครื่องนั้นได้')}
      if(!(e&&e.text)&&st.turns.length&&st.turns[st.turns.length-1].role==='user')st.turns.pop();
      if(HIDE_CODES.includes(code)||code==='no_ai'){const b2=document.getElementById('ab-'+id);if(b2)b2.hidden=true;return}
      st.note='';
    }finally{st.busy=false;st.ctl=null;paint()}
  }
  form.onsubmit=e=>{e.preventDefault();const t=inp.value;inp.value='';st.draft='';ask(t)};
  inp.onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();form.requestSubmit()}};
  stop.onclick=()=>st.ctl&&st.ctl.abort();
  box.querySelectorAll('.qk[data-q]').forEach(k=>k.onclick=()=>ask(k.dataset.q));
  const vb=box.querySelector('[data-verify]');if(vb){if(!isMC(q))vb.hidden=true;vb.onclick=()=>ask(`ตรวจว่าเฉลยข้อนี้ถูกไหม${pick!=null&&pick!==q.answer?` (คำตอบที่เลือก: ${q.choices[pick]})`:''}`,true)}
  paint();
}

var SIDE_OPEN=null;
function renderSide(){
  if(!SIDE_OPEN)SIDE_OPEN=Object.assign({gen:false,spec:false},P.sideOpen||{});
  const btn=(s,f)=>{
    const adm=typeof isReviewerMe==='function'&&isReviewerMe();
    const canSide=s.doc?(adm||!(DOCS.find(x=>x.id===s.doc)||{}).central):adm;
    const acts=s.id!=='specall'&&canSide?`<span class="seditx" role="button" tabindex="0" data-srenameside="${esc(s.id)}" title="แก้ไขชื่อวิชา" aria-label="แก้ไขชื่อวิชา ${esc(s.name)}">✏️</span><span class="sdelx" role="button" tabindex="0" data-sdelside="${esc(s.id)}" title="ลบวิชานี้และข้อมูลทั้งหมด" aria-label="ลบวิชา ${esc(s.name)}">🗑</span>`:'';
    return `<button class="subj" data-s="${s.id}" aria-current="${VIEW==='practice'&&s.id===P.subject}" title="${esc(s.name)}"${f?` data-f="${esc((s.name+' '+s.desc+' '+(s.kw||[]).join(' ')).toLowerCase())}"`:''}><span class="sn">${esc(s.name)}</span>${aiTag(s)}${acts}</button>`;
  };
  const gen=SUBJ.filter(s=>s.group==='gen'),spec=SUBJ.filter(s=>s.group==='spec');
  const grp=(g,label,list,extra)=>`<div class="sgrp"><button class="ghead" data-g="${g}" aria-expanded="${!!SIDE_OPEN[g]}"><span class="gl">${label}</span><span class="gc">${list.length}</span><span class="caret" aria-hidden="true">▾</span></button>
    <div class="gbody" ${SIDE_OPEN[g]?'':'hidden'}>${extra||''}<div class="slist">${list.map(x=>btn(x,g==='spec')).join('')}</div>${g==='spec'?'<p class="src ddnone" hidden>ไม่พบหัวข้อที่ค้นหา</p>':''}</div></div>`;
  document.getElementById('subjects').innerHTML=grp('gen','ความรู้ความสามารถทั่วไป',gen)+grp('spec',SPEC_LABEL,spec,`<input class="tx" type="search" id="ddq" placeholder="ค้นหาหัวข้อ เช่น หนี้, PDPA" autocomplete="off" aria-label="ค้นหาหัวข้อ${SPEC_LABEL}">`);
  document.querySelectorAll('#subjects .ghead').forEach(h=>h.onclick=()=>{const g=h.dataset.g;SIDE_OPEN[g]=!SIDE_OPEN[g];P.sideOpen=SIDE_OPEN;save();renderSide();if(g==='spec'&&SIDE_OPEN.spec){const q=document.getElementById('ddq');if(q)q.focus()}});
  const dq=document.getElementById('ddq');
  if(dq){dq.oninput=()=>{const q=dq.value.trim().toLowerCase();let n=0;dq.parentElement.querySelectorAll('.subj[data-f]').forEach(b=>{const ok=!q||b.dataset.f.includes(q);b.hidden=!ok;if(ok)n++});dq.parentElement.querySelector('.ddnone').hidden=n>0};
    dq.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();const f=[...dq.parentElement.querySelectorAll('.subj[data-f]')].find(b=>!b.hidden);if(f)f.click()}}}
  document.querySelectorAll('#subjects .subj[data-s]').forEach(b=>b.onclick=()=>{
    P.subject=b.dataset.s;if(spec.some(s=>s.id===P.subject))P.lastSpec=P.subject;
    save();if(VIEW!=='practice')setView('practice');renderSide();start(true)});
  document.getElementById('count').value=String(P.count);
  document.getElementById('mode-now').setAttribute('aria-pressed',P.mode==='now');
  document.getElementById('mode-end').setAttribute('aria-pressed',P.mode==='end');
  if(VIEW!=='practice')return;
  const s=subj();document.getElementById('title').textContent=s.group==='spec'?`${SPEC_LABEL} · ${s.name}`:s.name;document.getElementById('desc').textContent=`${s.ai&&!/AI/.test(subjDesc(s))?'ใช้ AI สร้างโจทย์ · ':''}${subjDesc(s)} · ระดับรวม ${myLevel()}`;
}
function render(){
  if(VIEW!=='practice')return;
  renderSide();
  const el=document.getElementById('sheet');if(!R)return;
  if(R.status==='pscload'){el.innerHTML=`<div class="state"><div class="spin" aria-hidden="true"></div><p><b>กำลังโหลดข้อมูลผลิตภัณฑ์</b></p></div>`;return}
  if(R.status==='loading'){el.innerHTML=`<div class="state"><div class="spin" aria-hidden="true"></div><p><b>กำลังให้ AI สร้างโจทย์ใหม่ ระดับ ${R.level}</b></p><p class="src" id="genp">ใช้เวลาประมาณครึ่งนาทีถึงหนึ่งนาที</p><button class="ghost" id="cancelgen">ยกเลิก</button></div>`;document.getElementById('cancelgen').onclick=()=>{genCtl&&genCtl.abort();R.status='error';R.err='ยกเลิกแล้ว กดสร้างชุดใหม่เมื่อพร้อม';render()};return}
  if(R.status==='idle'){el.innerHTML=`<div class="state"><p><b>พร้อมสร้างโจทย์ชุดใหม่ ระดับ ${R.level}</b></p><p class="src">AI จะสร้างโจทย์ ${P.count} ข้อตามระดับของคุณ ใช้ ${AINAME[activeAI()]||'AI'} จากบัญชีของคุณ</p><button class="primary" id="go">สร้างโจทย์</button></div>`;document.getElementById('go').onclick=()=>start(true);return}
  if(R.status==='needai'){el.innerHTML=`<div class="state"><p><b>${aiReady?'วิชานี้ต้องใช้ AI สร้างโจทย์':'กำลังเชื่อมต่อ AI...'}</b></p><p class="src">${aiReady?(inViewer?'หน้านี้ยังใช้ Claude ไม่ได้ ลองกดอีกครั้งแล้วกดอนุญาต ส่วนอีก '+SUBJ.filter(s=>!s.ai).length+' วิชาระบบสร้างโจทย์เองได้':'ใส่ API key ของ Gemini หรือ OpenAI ในเมนู ตั้งค่า AI ด้านซ้ายก่อน ส่วนอีก '+SUBJ.filter(s=>!s.ai).length+' วิชาระบบสร้างโจทย์เองได้โดยไม่ต้องใช้ AI'):''}</p>${aiReady?'<button class="primary" id="retry">ลองอีกครั้ง</button>':''}</div>`;const r=document.getElementById('retry');if(r)r.onclick=()=>{if(!inViewer&&!activeAI()){const d=document.getElementById('aiset');d.open=true;d.scrollIntoView({block:'nearest'});return}start(true)};return}
  /* วิชาผลิตภัณฑ์ ธ.ก.ส.: เข้าสู่ระบบ Product Catalog (เก็บ token ของผู้ใช้) แล้วเริ่มชุดทันที */
  if(R.status==='error'&&(R.code==='psc_login'||R.code==='psc_token')){el.innerHTML=`<div class="state"><p><b>${esc(R.err)}</b></p><button class="primary" id="psclogin">🔑 เข้าสู่ระบบ Product Catalog</button></div>`;
    document.getElementById('psclogin').onclick=async()=>{await pscAskLink();if(pscTok())start(true)};return}
  if(R.status==='error'){el.innerHTML=`<div class="state"><p><b>${esc(R.err||'เกิดข้อผิดพลาด')}</b></p><button class="primary" id="retry">สร้างชุดใหม่</button></div>`;document.getElementById('retry').onclick=()=>start(true);return}
  if(R.status==='done'){renderDone(el);return}
  const n=R.items.length,q=R.items[R.i],pick=R.picks[R.i],locked=R.mode==='now'&&pick!=null,shown=R.more?Math.max(R.target||n,n):n,wait=R.more&&R.i+1>=n;
  const done=R.picks.filter((p,j)=>p!=null&&p===R.items[j].answer).length;
  saveRun();
  el.innerHTML=fx(`<div class="meta"><span id="pmeta">ข้อ ${R.i+1} จาก ${shown}</span><span>${R.mode==='now'?`ถูก ${done}`:`ตอบแล้ว ${R.picks.filter(p=>p!=null).length}`}</span></div>
   <div class="bar"><i style="width:${R.i/shown*100}%"></i></div>
   ${questionHTML(q)}
   ${choicesHTML(q,pick,locked)}
   ${locked?explainHTML(q,pick)+askHTML('cur',q,pick):''}
   <div class="navrow"><span class="navl">${R.i>0?'<button class="ghost" id="prev">← ข้อก่อนหน้า</button>':''}<span class="src">${R.mode==='end'?'เฉลยทั้งหมดจะแสดงตอนท้าย':''}</span></span><button class="primary" id="next" ${pick==null||wait?'disabled':''}>${wait?'กำลังสร้างข้อถัดไป...':R.i+1<n?'ข้อต่อไป':'ส่งคำตอบ'}</button></div>`);
  el.querySelectorAll('.ch').forEach(b=>b.onclick=()=>{R.picks[R.i]=+b.dataset.j;render();if(R.picks.filter(x=>x!=null).length>=Math.ceil(R.items.length/2))prefetchNext();const nb=document.getElementById('next');if(nb&&R.mode==='now')nb.focus({preventScroll:true})});
  if(locked)wireAsk('cur',q,pick);
  /* ย้อนกลับไปดูข้อที่แล้ว: ข้อที่ตอบแล้วในโหมดเฉลยทันทีล็อกคำตอบไว้ เห็นเฉลยเหมือนเดิม */
  const pv=document.getElementById('prev');if(pv)pv.onclick=()=>{R.i--;render();el.scrollIntoView({block:'start',behavior:'smooth'})};
  document.getElementById('next').onclick=()=>{if(R.more&&R.i+1>=R.items.length)return;if(R.i+1<R.items.length){R.i++;render();el.scrollIntoView({block:'start',behavior:'smooth'})}else finish()};
}
function finish(){
  const n=R.items.length,score=R.items.filter((q,j)=>R.picks[j]===q.answer).length,pct=n?score/n:0;
  const before=myLevel(),passed=pct>=PASS_PCT;
  const wrong=R.items.filter((q,j)=>R.picks[j]!==q.answer).map(q=>qLabel(q).replace(/\s+/g,' ').slice(0,90));
  P.weak[R.subject]=[...(P.weak[R.subject]||[]),...wrong].slice(-5);if(!wrong.length)P.weak[R.subject]=[];
  /* โบนัสทำเต็มติดกัน: เต็ม 100% ครั้งที่ 1 = +2, ติดกัน 2 ครั้ง = +4, 3 ครั้ง = +6 ... ไม่เต็มเมื่อไรเริ่มนับใหม่ (ชุดต้องมีอย่างน้อย 5 ข้อ) */
  const perfect=n>=5&&score===n;P.streak=perfect?(P.streak||0)+1:0;
  const pts=perfect?2*P.streak:passed?1:0;
  if(pts)awardPass(pts);
  save();clearRun();Object.assign(R,{status:'done',score,pct,passed,before,after:myLevel(),pts,streak:P.streak});recordCards(R.items,R.picks);logQs(R.items,R.picks);
  const sn=(SUBJ.find(s=>s.id===R.subject)||subj()).name,t0=R.t0||Date.now();
  addHist({at:t0,kind:'practice',title:`ฝึก · ${sn}`,n,score,pct,used:(Date.now()-t0)/1000,groups:[{name:sn,ok:score,n}],viol:0,auto:''});
  render();
}
function verdict(p){
  if(p===1)return{s:'🏆',c:'good',t:'เต็ม! สุดยอดมาก',m:'ทำถูกครบทุกข้อ ความแม่นระดับนี้พร้อมลงสนามจริงแล้ว รอบหน้าระบบจะเพิ่มความยาก เตรียมตัวให้ดี'};
  if(p>=.8)return{s:'🎉',c:'good',t:'เก่งมาก ผ่านเกณฑ์',m:'ถูกเกิน 80% แล้ว รักษามาตรฐานนี้ไว้ รอบหน้าจะยากขึ้นอีกขั้น'};
  if(p>=.6)return{s:'💪',c:'mid',t:'ใช้ได้ แต่ยังไม่พอ',m:'อีกนิดเดียวก็ถึง 80% อ่านเฉลยข้อที่พลาดให้เข้าใจ แล้วลุยรอบใหม่'};
  if(p>=.4)return{s:'😤',c:'mid',t:'ยังพลาดเยอะไปนะ',m:'ถ้าในห้องสอบจริงได้แบบนี้ถือว่าเสี่ยงมาก อย่ารีบเดา ทวนเฉลยข้อที่ผิดทุกข้อก่อนทำรอบต่อไป'};
  return{s:'😱',c:'bad',t:'แบบนี้ไม่ผ่านแน่ ต้องทบทวนด่วน',m:'คะแนนต่ำกว่าครึ่งมาก ตั้งใจกว่านี้อีก รอบหน้าระบบจะลดความยากลงให้ปูพื้นฐานใหม่ อ่านเฉลยทีละข้ออย่างช้าๆ'};
}
function renderDone(el){
  const n=R.items.length,v=verdict(R.pct);
  const li=levelInfo(P.pass),pts=R.pts||1,bonus=R.streak?`🔥 เต็มติดกัน ${R.streak} ครั้ง +${pts} คะแนน (เต็มอีกรอบได้ +${2*(R.streak+1)})`:'',lvTxt=R.passed?(R.after>R.before?`${bonus||`ผ่าน! +${pts} คะแนน`} 🎉 ขึ้นเป็นระดับ ${R.after}`:`${bonus||`ผ่าน! +${pts} คะแนน`} (รวม ${P.pass}) · อีก ${li.left} คะแนนขึ้นระดับ ${li.lv+1}`):`ยังไม่ผ่าน (ต้องได้ ${Math.round(PASS_PCT*100)}% ขึ้นไป จึงได้ 1 คะแนน) · ระดับ ${li.lv} · อีก ${li.left} คะแนนขึ้นระดับ ${li.lv+1}`;
  el.innerHTML=fx(`<div class="result">
    <div class="sticker ${v.c}" role="img" aria-label="${esc(v.t)}">${v.s}</div>
    <p class="big">${R.score} / ${n}</p>
    <p class="msgt">${esc(v.t)}</p>
    <p style="margin:0;max-width:46ch">${esc(v.m)}</p>
    <span class="lvchg">${esc(lvTxt)}</span>
    <button class="primary" id="again">ทำชุดใหม่</button>
    <div class="review">
     <p class="lbl">ทบทวนรายข้อ (กดเพื่อดูเฉลยและถามต่อ)</p>
     ${R.items.map((q,j)=>{const p=R.picks[j],ok=p===q.answer;return `<details data-j="${j}"><summary><span>ข้อ ${j+1}: ${esc(qLabel(q))}</span><span class="${ok?'o':'x'}">${ok?'ถูก':'ผิด'}</span></summary><div class="body">${questionHTML(q)}${choicesHTML(q,p,true)}${explainHTML(q,p)}${askHTML('r'+j,q,p)}</div></details>`}).join('')}
    </div></div>`);
  document.getElementById('again').onclick=()=>start(true);
  el.querySelectorAll('details').forEach(d=>d.addEventListener('toggle',()=>{if(d.open){const j=+d.dataset.j;wireAsk('r'+j,R.items[j],R.picks[j])}}));
  const first=R.items.findIndex((q,j)=>R.picks[j]!==q.answer);
  if(first>=0&&R.mode==='end')el.querySelector(`details[data-j="${first}"]`).open=true;
}

/* ---------- chunked AI generation (max 20 per request so 50–100 ข้อ ไม่ขาดกลางทาง) ---------- */
async function genAIChunks(promptFn,n,{signal,onProg}={}){
  /* Typhoon/Groq/OpenRouter ส่งคำตอบได้ไม่เกิน 8192 โทเคน (ai.js) ≈ 9 ข้อ: ขอชุดละ 6 ข้อ ไม่ต้องรอให้ถูกตัดก่อน */
  const rt=(signal&&signal.route)||aiRoute();
  const out=[],seen=new Set();let fails=0,cap=rt&&OAI_PROVS[rt.p]?6:20;
  while(out.length<n&&fails<3){
    const k=Math.min(cap,n-out.length),base=out.length;let items;
    try{const pr=await promptFn(k,base);items=cleanAI(typeof pr!=='string'?await aiVisionJSON(pr.text,pr.images,{signal}):await aiJSON(pr,{signal,onText:({text})=>{const m=(text.match(/"stem"/g)||[]).length;if(onProg)onProg(base+Math.min(m,k))}}))}
    /* คำตอบยาวเกินที่ AI ส่งได้: รอบถัดไปขอครึ่งเดียว (เดิมขอเท่าเดิมซ้ำ 3 รอบ เสียเวลาเปล่า) */
    catch(e){if(e&&(e.code==='invalid_json'||e.code==='truncated')){if(e.code==='truncated'&&k>1){cap=Math.ceil(k/2);continue}fails++;continue}throw e}
    let add=0;for(const q of shuffle(items))if(out.length<n&&!seen.has(q.stem)){seen.add(q.stem);out.push(q);add++}
    if(!add)fails++;if(onProg)onProg(out.length);
  }
  return out;
}

/* ---------- shared helpers: time, grade, toast, modal ---------- */
const pad=n=>String(n).padStart(2,'0');
const fmtDate=t=>{const d=new Date(t);return `${d.getDate()}/${d.getMonth()+1}/${d.getFullYear()+543} ${pad(d.getHours())}:${pad(d.getMinutes())}`};
const fmtClock=s=>{s=Math.max(0,Math.ceil(s));return `${pad(Math.floor(s/3600))}:${pad(Math.floor(s%3600/60))}:${pad(s%60)}`};
const fmtDur=s=>{s=Math.max(0,Math.round(s));const h=Math.floor(s/3600),m=Math.floor(s%3600/60),x=s%60;return h?`${h} ชม. ${m} นาที`:m?`${m} นาที${x?` ${x} วินาที`:''}`:`${x} วินาที`};
const grade=p=>p>=.8?'A':p>=.7?'B':p>=.6?'C':p>=.5?'D':'F';
const pctS=p=>Math.round(p*100)+'%';
const tone=p=>p>=.7?'ok':p>=.5?'mid':'bad';
function groupStats(items,picks,key){const m=new Map();items.forEach((q,j)=>{const k=key(q)||'อื่นๆ',g=m.get(k)||{name:k,ok:0,n:0};g.n++;if(picks[j]===q.answer)g.ok++;m.set(k,g)});return[...m.values()]}
function mergeGroups(list){const m=new Map();for(const g of list){const x=m.get(g.name)||{name:g.name,ok:0,n:0};x.ok+=g.ok;x.n+=g.n;m.set(g.name,x)}return[...m.values()]}
function strongWeak(groups){const g=groups.filter(x=>x.n).map(x=>({...x,p:x.ok/x.n}));
  return{strong:g.filter(x=>x.p>=.7).sort((a,b)=>b.p-a.p||b.n-a.n).slice(0,2),weak:g.filter(x=>x.p<.6).sort((a,b)=>a.p-b.p||b.n-a.n).slice(0,2)}}
const barRow=g=>{const p=g.n?g.ok/g.n:0;return `<div class="brow"><span title="${esc(g.name)}">${esc(g.name)}</span><div class="bar"><i class="${tone(p)}" style="width:${p*100}%"></i></div><span class="v">${pctS(p)} (${g.ok}/${g.n})</span></div>`};
const swHTML=sw=>`<div class="sw"><div class="s"><p class="lbl">จุดแข็ง</p><p>${sw.strong.map(x=>esc(x.name)).join(', ')||'-'}</p></div><div class="w"><p class="lbl">จุดอ่อน</p><p>${sw.weak.map(x=>esc(x.name)).join(', ')||'-'}</p></div></div>`;

function toast(t,cls){const el=document.getElementById('toast');el.textContent=t;el.className='toast show '+(cls||'');clearTimeout(toast.t);toast.t=setTimeout(()=>{el.className='toast'},6000)}
let dlgDone=null;
function closeModal(v){const d=document.getElementById('dlg');if(d.open)d.close();if(dlgDone){const f=dlgDone;dlgDone=null;f(v)}}
function modal(html,buttons){
  closeModal(-1);
  return new Promise(res=>{
    const d=document.getElementById('dlg');dlgDone=res;
    d.innerHTML=`<div class="dlgb">${html}<div class="dlgbtns">${buttons.map((b,i)=>`<button class="${b.cls||'ghost'}" data-i="${i}">${esc(b.t)}</button>`).join('')}</div></div>`;
    d.querySelectorAll('.dlgbtns button').forEach(b=>b.onclick=()=>closeModal(+b.dataset.i));
    d.oncancel=e=>{e.preventDefault();closeModal(0)};
    d.showModal();const p=d.querySelector('.primary');if(p)p.focus();
  });
}

/* ---------- exam history (this browser only, until Firebase) ---------- */
const HKEY='exam-history-v1';
let HIST=[];try{HIST=JSON.parse(localStorage.getItem(HKEY)||'[]');if(!Array.isArray(HIST))HIST=[]}catch(e){HIST=[]}
const saveHist=()=>{try{localStorage.setItem(HKEY,JSON.stringify(HIST.slice(-300)))}catch(e){}};
function addHist(e){HIST.push({id:Date.now().toString(36)+Math.random().toString(36).slice(2,5),...e});saveHist()}

/* ---------- views ---------- */
var VIEW='practice',M=null,G=null,HF='all',VIEW_FROM='home';
function setView(v){
  if(v==='study'){openAI(true);return}   /* สอบถาม AI เป็นหน้าต่างลอย ไม่ใช่หน้า */
  if(M&&M.status==='run'&&v!=='mock')return;
  if(v==='kb'&&VIEW!=='kb'&&typeof KB_TAB!=='undefined')KB_TAB='main';
  if(v!=='dev')VIEW_FROM=v;   /* จำหน้าล่าสุดไว้แนบไปกับข้อความถึงผู้พัฒนา */
  VIEW=v;
  document.querySelectorAll('#views button,#views2 button,#views3 button').forEach(b=>b.setAttribute('aria-current',b.dataset.v===v));
  document.getElementById('pside').classList.toggle('off',v!=='practice');
  document.getElementById('pctl').hidden=v!=='practice';
  if(v!=='mock'){document.getElementById('tbar').hidden=true;document.querySelector('.app').classList.remove('exam')}
  if(v==='practice')render();else if(v==='mock')renderMock();else if(v==='kb')renderKB();else if(v==='review')renderReview();else if(v==='study')renderStudy();else if(v==='dev')renderDev();else if(v==='video')renderVideo();else if(v==='rank')renderRank();else if(v==='home')renderHome();else if(v==='welcome')renderWelcome();else if(v==='aiset')renderAISetView();else if(v==='qgen')renderQGen();else renderHist();
}
const head=(t,d)=>{document.getElementById('title').textContent=t;document.getElementById('desc').textContent=d||''};
/* หน้า ตั้งค่า AI: ย้ายจากแถบเมนูซ้ายมาเป็นหน้าปกติ เพราะตัวเลือกเยอะ */
function renderAISetView(){
  if(VIEW!=='aiset')return;
  head('ตั้งค่า AI','เลือกผู้ให้บริการ AI ใส่ key และตั้ง AI สำหรับประมวลผลไฟล์ · ค่าที่ตั้งผูกกับบัญชีของคุณ');
  document.getElementById('sheet').innerHTML='<div class="aiset aipage"><div class="bd" id="aibody"></div></div>';
  renderAISet();
}

/* ---------- mock exam ---------- */
const MKEY='exam-mock-v1',MSKEY='exam-mock-set';
const CATS={gen:'ความรู้ความสามารถทั่วไป',spec:'ความรู้เฉพาะตำแหน่งงานสินเชื่อ'};
const MOCK_N=[20,40,60,80,100],MOCK_MIN=[15,30,45,60,90,120];
const MOCK_MIX=[['math',.22],['series',.12],['ineq',.15],['logic',.12],['dir',.06],['data',.08],['spatial',.07],['thai',.1],['eng',.08]];
let SPEC_TOPICS=SPEC.map(x=>x[1]);
function refreshSpecTopics(){SPEC_TOPICS=SPEC.map(x=>x[1])}
let MS={cat:'gen',n:40,min:60,custom:60,limit:3,action:'warn',pick:{gen:[],spec:[]}};
try{const s=JSON.parse(localStorage.getItem(MSKEY)||'null');if(s)MS={...MS,...s}}catch(e){}
const saveMS=()=>{try{localStorage.setItem(MSKEY,JSON.stringify(MS))}catch(e){}};
try{M=JSON.parse(localStorage.getItem(MKEY)||'null');if(!M||!['run','done'].includes(M.status)||!Array.isArray(M.items))M=null;else M.filling=false}catch(e){M=null}
const saveM=()=>{try{if(M)localStorage.setItem(MKEY,JSON.stringify(M));else localStorage.removeItem(MKEY)}catch(e){}};
/* ---------- รายวิชาในหมวดที่ใช้ออกข้อสอบ (ไม่เลือก = ทุกวิชาในหมวด) ---------- */
if(!MS.pick||typeof MS.pick!=='object')MS.pick={gen:[],spec:[]};
const mockSubjs=cat=>SUBJ.filter(x=>x.group===cat&&x.id!=='specall');
/* วิชานี้ออกข้อสอบได้ไหมตอนนี้ (มีคลังข้อสอบ / มีตัวสร้างโจทย์ในเครื่อง / มี AI) */
function mockOK(s,useAI){return bankFor(s).length>0||(s.figOnly&&!LOCAL[s.id]?useAI&&canVision()&&figCards().some(c=>inSubj(c,s.name)):useAI||!s.ai)}
const mockPicked=cat=>{const ids=new Set(mockSubjs(cat).map(x=>x.id));return (MS.pick[cat]||[]).filter(id=>ids.has(id))};
function pickPlan(n,ids){
  /* ทุกวิชาที่เลือกอยู่ในสัดส่วนข้อสอบจริง → ใช้สัดส่วนนั้น · มีวิชาอื่นปน → แบ่งเท่ากัน */
  const w=new Map(MOCK_MIX),real=ids.every(id=>w.has(id));
  const raw=ids.map(id=>({id,x:real?w.get(id):1}));const tot=raw.reduce((a,r)=>a+r.x,0);
  raw.forEach(r=>{r.x=n*r.x/tot;r.k=Math.floor(r.x)});
  let left=n-raw.reduce((a,r)=>a+r.k,0);
  [...raw].sort((a,b)=>(b.x-b.k)-(a.x-a.k)).forEach(r=>{if(left>0){r.k++;left--}});
  return raw.filter(r=>r.k>0);
}
const mockMins=()=>MS.min==='custom'?Math.max(1,Math.min(300,Math.round(+MS.custom||60))):+MS.min;

function genPlan(n,useAI){
  /* วิชาที่แอดมินซ่อนไว้ (ไม่อยู่ใน SUBJ) ข้ามไป ไม่ให้ทั้งชุดล้ม */
  const ok=id=>{const s=SUBJ.find(x=>x.id===id);return !!s&&mockOK(s,useAI)};
  const mix=MOCK_MIX.filter(([id])=>ok(id)),tot=mix.reduce((a,[,w])=>a+w,0);
  const raw=mix.map(([id,w])=>({id,x:n*w/tot}));raw.forEach(r=>r.k=Math.floor(r.x));
  let left=n-raw.reduce((a,r)=>a+r.k,0);
  [...raw].sort((a,b)=>(b.x-b.k)-(a.x-a.k)).forEach(r=>{if(left>0){r.k++;left--}});
  return raw.filter(r=>r.k>0);
}
function specPrompt(list,opt={}){
  const kb=kbContext([...new Set(list)]),weak=opt.weak||[];
  return `สร้างข้อสอบใหม่ ${list.length} ข้อ หมวด "ความรู้เฉพาะตำแหน่ง" สำหรับสอบเข้าทำงานธนาคารเพื่อการเกษตรและสหกรณ์การเกษตร (ธ.ก.ส.) ตำแหน่งพนักงานพัฒนาธุรกิจและงานสินเชื่อ
${opt.level?`ระดับความยาก ${opt.level}: ${levelTxt(opt.level)}`:'ระดับข้อสอบจริง'}
เลขสุ่ม ${Math.random().toString(36).slice(2,8)} ใช้แค่ทำให้โจทย์ชุดนี้ต่างจากชุดก่อน ห้ามใส่เลขนี้หรือคำว่ารหัสชุดลงในโจทย์ ตัวเลือก หรือคำอธิบาย
หัวข้อของแต่ละข้อ ต้องตรงตามลำดับนี้:
${list.map((t,i)=>`ข้อ ${i+1}: ${t}`).join('\n')}
ความหมายของหัวข้อ: ${[...new Set(list)].map(t=>{const x=SPEC.find(z=>z[1]===t);return x?`${t} = ${x[2]}`:t}).join('; ')}
${weak.length?`ผู้ทำเคยตอบผิดในโจทย์แนวนี้ ให้มีโจทย์แนวคล้ายกันปนอยู่ 2–3 ข้อ:\n- ${weak.join('\n- ')}\n`:''}${kb.text?`
เอกสารอ้างอิงจากคลังความรู้ (แต่ละช่วงมีป้ายชื่อเอกสารและหน้าในวงเล็บเหลี่ยม):
${kb.text}
`:''}
กติกา:
${VIZ_RULE}
${kb.text?'- ใช้ข้อมูลจากเอกสารอ้างอิงข้างบนเป็นหลัก ข้อที่ออกจากเอกสารให้ใส่ ref เป็นป้ายในวงเล็บเหลี่ยมของช่วงที่ใช้ เช่น "PDPA.pdf หน้า 22" ถ้าเอกสารไม่ครอบคลุมหัวข้อนั้นจึงใช้หลักการทั่วไปและให้ ref เป็น ""\n':''}- ใช้เฉพาะความรู้ที่เป็นหลักการมาตรฐานและเป็นที่ยอมรับทั่วไป ห้ามแต่งตัวเลข ชื่อโครงการ อัตราดอกเบี้ย วันที่ หรือข้อเท็จจริงเฉพาะที่ไม่แน่ใจ ถ้าไม่แน่ใจให้ถามหลักการแทน
- ทุกข้อมีตัวเลือก 4 ตัว ถูกเพียงตัวเดียว คละตำแหน่งคำตอบที่ถูก
${CHOICE_RULE} ห้ามมีข้อที่กำกวม
- เฉลยแต่ละข้อมี 2–4 ขั้น สั้น ภาษาง่าย แต่ละขั้นบอกที่มา (from) เช่น ชื่อกฎหมายและมาตรา หรือชื่อหลักการ
${CALC_RULE}
- ใช้ภาษาไทย ศัพท์เฉพาะภาษาอังกฤษเขียนได้ ห้ามใช้ markdown ไม่ต้องใส่ ก ข ค ง หน้าตัวเลือก
ตอบเป็น JSON เท่านั้น รูปแบบ:
{"questions":[{"topic":"ชื่อหัวข้อตามที่กำหนด","stem":"โจทย์","choices":["ตัวเลือก1","ตัวเลือก2","ตัวเลือก3","ตัวเลือก4"],"answer":0,"viz":null,"ref":"","steps":[{"text":"ขั้นอธิบาย","from":"ที่มา"}]}]}`;
}
/* ---------- ตรวจชุดข้อสอบก่อนเริ่ม ----------
   ทุกข้อต้องสมบูรณ์ (มีโจทย์ มีตัวเลือกไม่ซ้ำกัน เฉลยชี้ตัวเลือกที่มีจริง) และไม่ซ้ำกันในชุด
   จำนวนต้องครบตามที่ตั้ง: วิชาที่ได้ไม่ครบ ขอเพิ่มอีก 2 รอบ → ยังขาด เติมจากวิชาที่ระบบสร้างเองได้ไม่จำกัด
   → ยังขาด ใช้ข้อในคลังที่เคยตอบถูกแล้ว → ยังขาดจริงๆ แจ้งว่าวิชาไหนขาดเท่าไรเพราะอะไร */
function qValid(q){
  if(!q||!Number.isInteger(q.answer)||q.answer<0||!(qText(q).trim()||q.svg))return false;
  const ch=q.choices;if(!Array.isArray(ch))return !!q.kind&&q.kind!=='mc';
  if(ch.length<2||q.answer>=ch.length||ch.some(c=>String(c==null?'':c).trim()===''&&!q.chSvg))return false;
  return !!q.chSvg||new Set(ch.map(c=>String(c).trim().toLowerCase())).size===ch.length;
}
const canMore=id=>{const s=SUBJ.find(x=>x.id===id);return !!s&&!s.ai&&!!LOCAL[id]};
async function fillSet(plan,level,n,ctl,prog,tag,anyMath,seed,onAdd){
  const got=new Map(plan.map(p=>[p.id,((seed&&seed[p.id])||[]).slice()])),seen=new Set([...got.values()].flat().map(qKey)),rep={bad:0,dup:0,extra:{},old:0,short:[]};
  const total=()=>[...got.values()].reduce((a,l)=>a+l.length,0);
  const add=(p,qs,cap)=>{const l=got.get(p.id);for(const q of qs){if(l.length>=cap||total()>=n)break;
    if(!qValid(q)){rep.bad++;continue}const k=qKey(q);if(seen.has(k)){rep.dup++;continue}seen.add(k);l.push(q);if(onAdd)onAdd(q)}};
  const ask=async(p,k)=>{const s=SUBJ.find(x=>x.id===p.id),b=total();
    try{return (await makeItems(s,level,k,{signal:ctl.signal,onProg:d=>prog(b+d)})).map(q=>tag(q,s))}
    catch(e){if(e&&e.code==='cancelled')throw e;p.err=p.err||e;return[]}};
  const live=()=>!G||G.ctl===ctl;
  /* รอบแรก + ขอเพิ่มอีก 2 รอบเฉพาะวิชาที่ยังได้ไม่ครบ */
  for(let r=0;r<3&&total()<n;r++){
    for(const p of plan){const l=got.get(p.id),need=p.k-l.length;if(need<=0||p.dry)continue;
      /* รอบขอเพิ่ม: ขอเผื่อ เพราะบางข้อซ้ำกับที่มีแล้วจะถูกตัด (เดิมขอพอดี 100 ได้ 98) */
      const b=l.length;add(p,await ask(p,r?need+Math.max(3,Math.ceil(need*.3)):need),p.k);if(r&&l.length===b)p.dry=true;prog(total());
      await new Promise(x=>setTimeout(x,0));if(!live())return null}
    /* ข้อซ้ำที่แจ้งผู้ใช้นับแค่รอบแรก รอบขอเพิ่มจากคลังเล็กได้ข้อเดิมกลับมาเป็นปกติ */
    if(!r)rep.dup0=rep.dup;
  }
  rep.dup=rep.dup0||0;
  /* ยังขาด: เติมจากวิชาที่ระบบสร้างเองได้ไม่จำกัด (ในชุดนี้) ถ้าไม่มีเลยและเป็นชุดทั่วไปที่ไม่ได้เลือกวิชา ใช้คณิตศาสตร์
     เลือกวิชาไว้เอง ไม่เติมวิชาที่ไม่ได้เลือก */
  let fill=plan.filter(p=>canMore(p.id));
  if(!fill.length&&anyMath&&canMore('math')){const m={id:'math',k:0};plan.push(m);got.set('math',[]);fill=[m]}
  for(let r=0;r<4&&total()<n&&fill.length;r++)for(const p of fill){const need=n-total();if(need<=0)break;
    const b=got.get(p.id).length;add(p,await ask(p,Math.ceil(need/fill.length)+2),Infinity);rep.extra[p.id]=(rep.extra[p.id]||0)+got.get(p.id).length-b;
    if(!live())return null}
  /* ยังขาด: ข้อในคลังที่เคยตอบถูกแล้ว ดีกว่าได้ชุดไม่ครบ */
  if(total()<n){QLOG_OFF=true;try{for(const p of plan){const l=got.get(p.id),need=p.k-l.length;if(need<=0||total()>=n)continue;
      const b=total();add(p,await ask(p,need+3),p.k);rep.old+=total()-b;if(!live())return null}}finally{QLOG_OFF=false}}
  for(const p of plan){const l=got.get(p.id).length;if(l<p.k&&!(rep.extra[p.id]))rep.short.push({name:(SUBJ.find(x=>x.id===p.id)||{}).name||p.id,got:l,want:p.k,err:p.err})}
  if(!total()&&plan[0]&&plan[0].err)throw plan[0].err;
  return{items:plan.flatMap(p=>got.get(p.id)),rep};
}
async function buildMock(){
  const cat=MS.cat,n=MS.n,useAI=!!activeAI(),ctl=new AbortController(),job={ctl,live:[],begun:false,M:null,n};
  if(MOCK_JOB)MOCK_JOB.ctl.abort();MOCK_JOB=job;
  G={status:'gen',cat,n,ctl,job};renderMock();
  const prog=()=>{const k=job.live.length,el=document.getElementById('mgenp');if(el)el.textContent=`ได้แล้ว ${Math.min(k,n)} จาก ${n} ข้อ`;
    const b=document.getElementById('mearly');if(b&&k&&k<n){b.hidden=false;b.textContent=`เริ่มสอบเลย (มีแล้ว ${k} ข้อ ที่เหลือ AI สร้างเพิ่มระหว่างสอบ)`}};
  /* ข้อที่ได้เพิ่ม: ก่อนเริ่มสอบเก็บไว้ในชุด · เริ่มสอบไปแล้วต่อท้ายข้อสอบที่กำลังทำ */
  const onAdd=q=>{job.live.push(q);
    if(job.begun){const m=job.M;if(m&&m===M&&m.status==='run'){m.items.push(q);m.picks.push(null);saveM();mockGrow()}}else prog()};
  try{
    const picked=mockPicked(cat).filter(id=>mockOK(SUBJ.find(x=>x.id===id),useAI));
    /* เลือกรายวิชาไว้: ออกข้อสอบเฉพาะวิชาที่เลือก แบ่งจำนวนข้อตามสัดส่วน · ไม่เลือก: สัดส่วนข้อสอบจริง */
    const plan=picked.length?pickPlan(n,picked):cat==='gen'?genPlan(n,useAI):[{id:'specall',k:n}];
    const tag=cat==='spec'&&!picked.length?q=>({...q,sub:'spec',subName:SPEC_TOPICS.includes(q.topic)?q.topic:'อื่นๆ'}):(q,s)=>({...q,sub:q.sub||s.id,subName:s.name});
    const level=cat==='gen'?3:0;
    /* ค้นในคลังก่อน (ข้อสอบจริงจากเอกสาร + คลังโจทย์กลาง) ไม่รอ AI · ได้แล้วกดเริ่มสอบได้ทันที ที่เหลือ AI สร้างต่อเบื้องหลัง */
    const seed={};
    for(const p of plan){const s=SUBJ.find(x=>x.id===p.id);if(!s||!p.k)continue;
      try{seed[p.id]=(await makeItems(s,level,p.k,{fast:true,libOnly:true,signal:ctl.signal})).map(q=>tag(q,s)).filter(qValid).slice(0,p.k)}
      catch(e){if(e&&e.code==='cancelled')throw e;seed[p.id]=[]}
      if(!G||G.ctl!==ctl)return}
    {const sk=new Set();for(const p of plan)seed[p.id]=(seed[p.id]||[]).filter(q=>{const k=qKey(q);if(sk.has(k))return false;sk.add(k);return true});}
    job.live=plan.flatMap(p=>seed[p.id]||[]);prog();
    const r=await fillSet(plan,level,n,ctl,()=>{},tag,cat==='gen'&&!picked.length,seed,onAdd);
    if(job.begun){const m=job.M;if(MOCK_JOB===job)MOCK_JOB=null;if(m&&m===M&&m.status==='run'){m.filling=false;saveM();mockGrow(true);if(m.items.length<n)toast(`สร้างข้อสอบเพิ่มได้ ${m.items.length} จาก ${n} ข้อ`,'warn');else toast(`ข้อสอบครบ ${n} ข้อแล้ว`)}return}
    if(MOCK_JOB===job)MOCK_JOB=null;
    if(!r||!G||G.ctl!==ctl)return;
    if(!r.items.length)throw{code:'empty'};
    /* ชุดทั่วไปเรียงตามวิชาเหมือนข้อสอบจริง ชุดที่เลือกวิชาเองคละกัน */
    G={status:'ready',cat,n,items:picked.length?shuffle(r.items):r.items,rep:r.rep,subs:picked.map(id=>SUBJ.find(x=>x.id===id).name)};
  }catch(e){
    if(job.begun){if(MOCK_JOB===job)MOCK_JOB=null;const m=job.M;if(m&&m===M&&m.status==='run'&&!(e&&e.code==='cancelled')){m.filling=false;saveM();mockGrow(true);toast(`สร้างข้อที่เหลือไม่สำเร็จ ข้อสอบชุดนี้มี ${m.items.length} ข้อ`,'bad')}return}
    if(!G||G.ctl!==ctl)return;
    if(e&&e.code==='cancelled'){G=null}else G={status:'error',err:e&&e.code==='empty'?'ได้ข้อสอบที่ใช้ไม่ได้ ลองสร้างใหม่อีกครั้ง':errCopy(e&&e.code,'สร้างข้อสอบ')};
  }
  if(VIEW==='mock')renderMock();
}
let graceUntil=0,tickT=null,MOCK_JOB=null,GROW_T=null;
/* เริ่มสอบก่อนข้อสอบครบ: ใช้ข้อที่มีแล้ว (จากคลัง + ที่ AI สร้างเสร็จ) ข้อที่เหลือต่อท้ายเข้ามาระหว่างสอบ */
function beginEarly(){
  const job=G&&G.job;if(!job||!job.live.length)return;
  G.items=job.live.slice();beginMock();
  M.filling=true;M.target=job.n;job.M=M;job.begun=true;saveM();renderMock();
}
/* ข้อสอบเพิ่มเข้ามาระหว่างสอบ: อัปเดตแถบบนและรายการข้อ (หน่วงไว้ ไม่วาดหน้าใหม่ถี่เกิน) */
function mockGrow(now){
  if(GROW_T&&!now)return;clearTimeout(GROW_T);
  GROW_T=setTimeout(()=>{GROW_T=null;if(VIEW!=='mock'||!M||M.status!=='run')return;renderBar();const el=document.getElementById('sheet');if(el)renderRun(el)},now?0:1500);
}
function beginMock(){
  const mins=mockMins(),now=Date.now();
  M={status:'run',cat:G.cat,catName:CATS[G.cat]+((G.subs||[]).length?` · ${G.subs.length>2?`${G.subs.slice(0,2).join(', ')} และอีก ${G.subs.length-2} วิชา`:G.subs.join(', ')}`:''),items:G.items,picks:Array(G.items.length).fill(null),i:0,startAt:now,endAt:now+mins*60000,mins,viol:[],warned:[],limit:MS.limit,action:MS.action,away:false};
  G=null;graceUntil=now+1500;saveM();startTick();renderMock();
}
function startTick(){clearInterval(tickT);tickT=setInterval(tick,250);tick()}
function tick(){
  if(!M||M.status!=='run'){clearInterval(tickT);return}
  const rem=(M.endAt-Date.now())/1000;
  const el=document.getElementById('tclock');
  if(el){el.textContent='⏱ '+fmtClock(rem);el.className='clock'+(rem<=60?' bad':rem<=600?' warn':'')}
  for(const thr of [600,300,60])if(rem<=thr&&rem>0&&!M.warned.includes(thr)){
    M.warned.push(thr);saveM();
    if(M.mins*60>thr)toast(`⏱ เหลือเวลาอีก ${thr/60} นาที`,thr===60?'bad':'warn');
  }
  if(rem<=0)submitMock('time');
}
function submitMock(reason){
  if(!M||M.status!=='run')return;
  clearInterval(tickT);closeModal(-1);
  if(MOCK_JOB&&MOCK_JOB.begun){MOCK_JOB.ctl.abort();MOCK_JOB=null}M.filling=false;
  const end=Math.min(Date.now(),M.endAt),n=M.items.length,score=M.items.filter((q,j)=>M.picks[j]===q.answer).length;
  const groups=groupStats(M.items,M.picks,q=>q.subName);
  Object.assign(M,{status:'done',endedAt:end,used:(end-M.startAt)/1000,score,pct:n?score/n:0,auto:reason||'',groups,away:false});
  recordCards(M.items,M.picks);logQs(M.items,M.picks);if(M.pct>=PASS_PCT)awardPass();
  addHist({at:M.startAt,kind:'mock',title:`สอบจริง · ${M.catName}`,n,score,pct:M.pct,used:M.used,limit:M.mins*60,groups,viol:M.viol.length,auto:M.auto});
  saveM();
  if(VIEW!=='mock')setView('mock');else renderMock();
  window.scrollTo({top:0});
  if(reason==='time')toast('หมดเวลา ระบบส่งข้อสอบให้อัตโนมัติแล้ว','bad');
  if(reason==='cheat')toast(`ออกนอกหน้าสอบครบ ${M.limit} ครั้ง ระบบส่งข้อสอบอัตโนมัติ`,'bad');
}
async function askSubmit(){
  const un=M.picks.filter(p=>p==null).length;
  const r=await modal(`<p class="mt">ส่งข้อสอบเลยไหม</p><p>${un?`ยังไม่ได้ตอบ ${un} ข้อ ข้อที่ไม่ได้ตอบนับเป็นผิด`:'ตอบครบทุกข้อแล้ว'}</p><p class="src">ส่งแล้วแก้คำตอบไม่ได้อีก</p>`,[{t:'กลับไปทำต่อ'},{t:'ส่งข้อสอบ',cls:'primary'}]);
  if(r===1)submitMock('');
}

/* ---------- anti-cheat: tab switch, minimise, other window/app, reload ---------- */
let unloading=false; // reload/close is counted once on resume, not again here
function away(reason){
  if(!M||M.status!=='run'||M.away||unloading||Date.now()<graceUntil)return;
  M.away=true;M.viol.push({at:Date.now(),reason});saveM();renderBar();
  if(M.viol.length>=M.limit&&M.action==='submit')submitMock('cheat');
}
function back(){
  if(!M||M.status!=='run'||!M.away||document.hidden||!document.hasFocus())return;
  M.away=false;saveM();renderBar();warnViol();
}
function warnViol(){
  const k=M.viol.length,last=M.viol[k-1];
  const tail=k>=M.limit?'เกินจำนวนที่กำหนดแล้ว ระบบบันทึกไว้ในผลสอบ':M.action==='submit'?`ถ้าครบ ${M.limit} ครั้ง ระบบจะส่งข้อสอบทันที`:'ทุกครั้งจะถูกบันทึกไว้ในผลสอบ';
  modal(`<p class="mt">⚠️ ตรวจพบการออกจากหน้าสอบ</p><p>${esc(last.reason)}</p><p><b>ครั้งที่ ${k} จาก ${M.limit}</b></p><p class="src">${tail}</p>`,[{t:'กลับไปทำข้อสอบ',cls:'primary'}]);
}
document.addEventListener('visibilitychange',()=>{if(document.hidden)away('เปลี่ยนแท็บหรือย่อหน้าต่าง');else setTimeout(back,50)});
window.addEventListener('blur',()=>setTimeout(()=>{if(!document.hasFocus())away(document.hidden?'เปลี่ยนแท็บหรือย่อหน้าต่าง':'สลับไปหน้าต่างหรือโปรแกรมอื่น')},150));
window.addEventListener('focus',()=>setTimeout(back,50));
window.addEventListener('beforeunload',e=>{if(M&&M.status==='run'){unloading=true;setTimeout(()=>{unloading=false},1500);e.preventDefault();e.returnValue=''}});

/* ---------- mock render ---------- */
function renderMock(){
  if(VIEW!=='mock')return;
  const el=document.getElementById('sheet'),app=document.querySelector('.app'),tb=document.getElementById('tbar');
  const running=M&&M.status==='run';
  app.classList.toggle('exam',!!running);tb.hidden=!running;
  if(running){head(`สอบจริง · ${M.catName}`,`${M.items.length} ข้อ · ${M.mins} นาที`);renderBar();renderRun(el);return}
  if(M&&M.status==='done'){head(`ผลสอบ · ${M.catName}`,'');renderMockDone(el);return}
  head('สอบจริง (Mock Exam)','จับเวลาเหมือนห้องสอบ หมดเวลาส่งอัตโนมัติ และตรวจจับการออกนอกหน้าสอบ');
  if(G&&G.status==='gen'){
    el.innerHTML=`<div class="state"><div class="spin" aria-hidden="true"></div><p><b>กำลังเตรียมข้อสอบ ${G.n} ข้อ</b></p><p class="src" id="mgenp">กำลังค้นข้อสอบในคลังก่อน ที่ขาด AI จะสร้างเพิ่ม</p><div class="btnrow"><button class="primary" id="mearly" hidden></button><button class="ghost" id="mcancel">ยกเลิก</button></div></div>`;
    document.getElementById('mearly').onclick=beginEarly;
    if(G.job&&G.job.live.length){const b=document.getElementById('mearly'),k=G.job.live.length;if(k<G.n){b.hidden=false;b.textContent=`เริ่มสอบเลย (มีแล้ว ${k} ข้อ ที่เหลือ AI สร้างเพิ่มระหว่างสอบ)`}}
    document.getElementById('mcancel').onclick=()=>{const c=G&&G.ctl;G=null;if(c)c.abort();renderMock()};return;
  }
  if(G&&G.status==='error'){
    el.innerHTML=`<div class="state"><p><b>${esc(G.err)}</b></p><div class="btnrow"><button class="primary" id="mretry">ลองอีกครั้ง</button><button class="ghost" id="mback">กลับไปตั้งค่า</button></div></div>`;
    document.getElementById('mretry').onclick=buildMock;document.getElementById('mback').onclick=()=>{G=null;renderMock()};return;
  }
  if(G&&G.status==='ready'){
    const n=G.items.length,act=MS.action==='submit'?'ระบบจะส่งข้อสอบอัตโนมัติ':'ระบบจะแจ้งเตือนและบันทึกไว้ในผลสอบ';
    el.innerHTML=`<div class="state"><p class="mt">ข้อสอบพร้อมแล้ว ${n} ข้อ · ${mockMins()} นาที</p>${mockRepHTML(G,n)}
      <ul class="rules"><li>เวลานับถอยหลังทันทีที่กดเริ่มสอบ และไม่หยุดแม้ปิดหน้าไป</li><li>ระบบเตือนเมื่อเหลือ 10, 5 และ 1 นาที</li><li>หมดเวลา ระบบส่งข้อสอบให้อัตโนมัติ และแก้คำตอบไม่ได้อีก</li><li>ห้ามเปลี่ยนแท็บ ย่อหน้าต่าง สลับไปโปรแกรมอื่น หรือรีโหลดหน้า ถ้าครบ ${MS.limit} ครั้ง ${act}</li><li>ระหว่างสอบเลื่อนไปข้อไหนก็ได้ และเปลี่ยนคำตอบได้จนกว่าจะส่ง</li></ul>
      <div class="btnrow"><button class="primary" id="mbegin">เริ่มสอบ</button><button class="ghost" id="mback">ยกเลิก</button></div></div>`;
    document.getElementById('mbegin').onclick=beginMock;document.getElementById('mback').onclick=()=>{G=null;renderMock()};return;
  }
  renderSetup(el);
}
/* ผลตรวจชุดข้อสอบ: ครบไหม เติมจากไหน และถ้าไม่ครบ วิชาไหนขาดเท่าไรเพราะอะไร */
function mockRepHTML(G,n){
  const r=G.rep||{short:[],extra:{}},nm=id=>(SUBJ.find(x=>x.id===id)||{}).name||id;
  const ex=Object.entries(r.extra||{}).filter(([,k])=>k>0).map(([id,k])=>`${nm(id)} ${k} ข้อ`);
  const why=s=>s.err?errCopy(s.err.code,'สร้างข้อสอบ'):activeAI()?'สร้างเพิ่มแล้วได้ข้อซ้ำหรือข้อที่ใช้ไม่ได้':'คลังข้อสอบมีไม่พอ ใส่ AI key เพื่อสร้างเพิ่ม';
  const sh=r.short.map(s=>`<li>${esc(s.name)} ได้ ${s.got} จาก ${s.want} ข้อ · ${esc(why(s))}</li>`).join('');
  const fix=[r.dup?`ตัดข้อซ้ำออกแล้ว ${r.dup} ข้อ`:'',r.bad?`ตัดข้อที่ไม่สมบูรณ์ออกแล้ว ${r.bad} ข้อ`:'',ex.length?`เติมจาก ${ex.join(', ')}`:'',r.old?`ใช้ข้อที่เคยตอบถูกแล้ว ${r.old} ข้อ`:''].filter(Boolean).join(' · ');
  if(n<G.n)return `<p class="catnote warn">ตรวจแล้วได้ ${n} จาก ${G.n} ข้อ ขาด ${G.n-n} ข้อ สอบเท่าที่มีได้ หรือกลับไปสร้างใหม่</p>${sh?`<ul class="rules">${sh}</ul>`:''}${fix?`<p class="src">${fix}</p>`:''}`;
  return `<p class="catnote">✓ ตรวจชุดข้อสอบแล้ว ครบ ${n} ข้อ ไม่มีข้อซ้ำ${fix?` · ${fix}`:''}</p>${sh&&ex.length?`<p class="src">วิชาที่ได้ไม่ครบ: ${r.short.map(s=>`${esc(s.name)} ${s.got}/${s.want}`).join(', ')}</p>`:''}`;
}
function mockPickHTML(ai){
  const list=mockSubjs(MS.cat),picked=new Set(mockPicked(MS.cat));
  return `<div class="field"><span class="fl">รายวิชาที่ใช้ออกข้อสอบ</span>
    <p class="src" style="margin:0">${picked.size?`เลือกไว้ ${picked.size} วิชา · ออกข้อสอบเฉพาะวิชาที่เลือก`:'ยังไม่ได้เลือก · ออกข้อสอบจากทุกวิชาในหมวดนี้'}</p>
    <div class="mpick">${list.map(s=>{const ok=mockOK(s,ai);return `<button type="button" class="mchip" data-mpick="${esc(s.id)}" aria-pressed="${picked.has(s.id)}"${ok?'':' disabled title="ต้องตั้งค่า AI หรือยังไม่มีข้อมูลวิชานี้"'}>${picked.has(s.id)?'✓ ':''}${esc(s.name)}</button>`}).join('')}</div>
    <div class="btnrow" style="justify-content:flex-start;margin:0"><button type="button" class="ghost" id="mpall">เลือกทั้งหมด</button>${picked.size?'<button type="button" class="ghost" id="mpclear">ล้างที่เลือก (ใช้ทุกวิชา)</button>':''}</div></div>`;
}
function renderSetup(el){
  const ai=!!activeAI(),opt=(v,t,cur)=>`<option value="${v}"${String(v)===String(cur)?' selected':''}>${t}</option>`;
  const note=MS.cat==='gen'
    ?(ai?'<p class="catnote">คณิตศาสตร์ อนุกรม เงื่อนไขสัญลักษณ์ เงื่อนไขภาษา ภาษาไทย และภาษาอังกฤษ (ไทยและอังกฤษสร้างโดย AI) ระดับความยากเท่าข้อสอบจริง</p>'
        :'<p class="catnote warn">ยังไม่ได้ตั้งค่า AI จึงมีเฉพาะคณิตศาสตร์ อนุกรม เงื่อนไขสัญลักษณ์ และเงื่อนไขภาษา ตั้งค่า AI ในแถบซ้ายเพื่อเพิ่มภาษาไทยและภาษาอังกฤษ</p>')
    :`<p class="catnote">${SPEC_TOPICS.join(' · ')}</p><p class="catnote warn">${!ai?'หมวดนี้ต้องใช้ AI สร้างข้อสอบ ตั้งค่า AI ในแถบซ้ายก่อน':activeCards().some(c=>SPEC_TOPICS.includes(c.topic))?`ออกข้อสอบจากบัตรความรู้ ${activeCards().filter(c=>SPEC_TOPICS.includes(c.topic)).length} ใบที่ AI ย่อยจากเอกสารในคลัง เน้นเรื่องที่ยังไม่เคยถามและที่เคยตอบผิด หัวข้อที่ยังไม่มีบัตร AI ใช้หลักการทั่วไป`:DOCS.length?`AI ใช้เอกสาร ${DOCS.length} ไฟล์ในคลังความรู้ประกอบ ข้อที่มาจากเอกสารจะมีอ้างอิงหน้า หัวข้อที่เอกสารไม่ครอบคลุม AI ใช้ความรู้ทั่วไป`:'ยังไม่มีเอกสารในคลังความรู้ AI สร้างจากความรู้ทั่วไป ตัวเลขหรือระเบียบเฉพาะของ ธ.ก.ส. อาจไม่ตรงกับปัจจุบัน อัปโหลดเอกสารได้ที่เมนูคลังความรู้'}</p>`;
  el.innerHTML=`<div class="form">
    <div class="field"><span class="fl" id="mcat-l">วิชา</span><div class="seg segbig" role="group" aria-labelledby="mcat-l"><button data-cat="gen" aria-pressed="${MS.cat==='gen'}">${CATS.gen}</button><button data-cat="spec" aria-pressed="${MS.cat==='spec'}">${CATS.spec}</button></div></div>
    ${mockPickHTML(ai)}
    ${note}
    <div class="grid2">
      <div class="field"><label for="mn">จำนวนข้อ</label><select id="mn">${MOCK_N.map(v=>opt(v,v+' ข้อ',MS.n)).join('')}</select></div>
      <div class="field"><label for="mmin">เวลาสอบ</label><select id="mmin">${MOCK_MIN.map(v=>opt(v,v+' นาที',MS.min)).join('')}${opt('custom','กำหนดเอง',MS.min)}</select></div>
      <div class="field" id="mcustw" ${MS.min==='custom'?'':'hidden'}><label for="mcust">กำหนดเวลาเอง (นาที)</label><input class="tx" id="mcust" type="number" min="1" max="300" inputmode="numeric" value="${esc(MS.custom)}"></div>
    </div>
    <fieldset class="cheat"><legend>ระบบกันโกง (ผู้คุมสอบกำหนด)</legend>
      <p class="src">ตรวจจับการเปลี่ยนแท็บ ย่อหน้าต่าง สลับไปหน้าต่างหรือโปรแกรมอื่น และการรีโหลดหน้า</p>
      <div class="grid2">
        <div class="field"><label for="mlim">เมื่อออกนอกหน้าสอบครบ</label><select id="mlim">${[1,2,3,4,5].map(v=>opt(v,v+' ครั้ง',MS.limit)).join('')}</select></div>
        <div class="field"><label for="mact">ให้ระบบ</label><select id="mact">${opt('warn','แจ้งเตือนและบันทึก',MS.action)}${opt('submit','ส่งข้อสอบอัตโนมัติ',MS.action)}</select></div>
      </div>
    </fieldset>
    <button class="primary" id="mgen" ${MS.cat==='spec'&&!ai&&!bankFor(SUBJ.find(x=>x.id==='specall')).length?'disabled':''}>สร้างข้อสอบ</button>
  </div>`;
  const $=id=>document.getElementById(id);
  el.querySelectorAll('[data-cat]').forEach(b=>b.onclick=()=>{MS.cat=b.dataset.cat;saveMS();renderMock()});
  el.querySelectorAll('[data-mpick]').forEach(b=>b.onclick=()=>{const id=b.dataset.mpick,l=new Set(MS.pick[MS.cat]||[]);if(l.has(id))l.delete(id);else l.add(id);MS.pick[MS.cat]=[...l];saveMS();renderMock()});
  const mc=$('mpclear');if(mc)mc.onclick=()=>{MS.pick[MS.cat]=[];saveMS();renderMock()};
  const ma=$('mpall');if(ma)ma.onclick=()=>{MS.pick[MS.cat]=mockSubjs(MS.cat).filter(s=>mockOK(s,!!activeAI())).map(s=>s.id);saveMS();renderMock()};
  $('mn').onchange=e=>{MS.n=+e.target.value;saveMS()};
  $('mmin').onchange=e=>{const v=e.target.value;MS.min=v==='custom'?'custom':+v;saveMS();$('mcustw').hidden=MS.min!=='custom';if(MS.min==='custom')$('mcust').focus()};
  $('mcust').onchange=e=>{MS.custom=Math.max(1,Math.min(300,Math.round(+e.target.value||60)));e.target.value=MS.custom;saveMS()};
  $('mlim').onchange=e=>{MS.limit=+e.target.value;saveMS()};
  $('mact').onchange=e=>{MS.action=e.target.value;saveMS()};
  $('mgen').onclick=buildMock;
}
function renderBar(){
  const tb=document.getElementById('tbar');if(!M||M.status!=='run'||tb.hidden)return;
  const n=M.items.length,answered=M.picks.filter(p=>p!=null).length,v=M.viol.length;
  tb.innerHTML=`<span class="clock" id="tclock" role="timer" aria-label="เวลาที่เหลือ"></span><span class="tmeta">ตอบแล้ว ${answered}/${n}${M.filling?` · AI กำลังเพิ่มข้อ (${n}/${M.target})`:''}</span><span class="tmeta${v?' bad':''}">ออกนอกหน้า ${v}/${M.limit}</span><button class="primary" id="msubmit">ส่งข้อสอบ</button>`;
  document.getElementById('msubmit').onclick=askSubmit;tick();
}
function renderRun(el){
  const n=M.items.length,i=M.i,q=M.items[i],pick=M.picks[i];
  el.innerHTML=fx(`<div class="meta"><span>ข้อ ${i+1} จาก ${n}</span><span>${esc(q.subName||'')}</span></div>
    ${questionHTML(q)}
    ${choicesHTML(q,pick,false)}
    <div class="navrow"><button class="ghost" id="mprev" ${i?'':'disabled'}>← ข้อก่อนหน้า</button>${i+1>=n&&M.filling?'<button class="ghost" id="mnext" disabled>AI กำลังสร้างข้อถัดไป…</button>':`<button class="${pick!=null?'primary':'ghost'}" id="mnext">${i+1<n?'ข้อต่อไป →':'ส่งข้อสอบ'}</button>`}</div>
    <div><p class="lbl" style="margin-bottom:6px">ไปยังข้อ (สีทึบ = ตอบแล้ว)</p><div class="pal">${M.items.map((_,j)=>`<button class="pn${M.picks[j]!=null?' done':''}${j===i?' cur':''}" data-j="${j}" aria-label="ข้อ ${j+1}${M.picks[j]!=null?' ตอบแล้ว':''}"${j===i?' aria-current="true"':''}>${j+1}</button>`).join('')}</div></div>`);
  const go=j=>{M.i=j;saveM();renderRun(el);el.scrollIntoView({block:'start',behavior:'smooth'})};
  el.querySelectorAll('.ch').forEach(b=>b.onclick=()=>{if(M.status!=='run')return;M.picks[M.i]=+b.dataset.j;saveM();renderBar();renderRun(el)});
  el.querySelectorAll('.pn').forEach(b=>b.onclick=()=>go(+b.dataset.j));
  document.getElementById('mprev').onclick=()=>go(i-1);
  document.getElementById('mnext').onclick=()=>{if(i+1<n)go(i+1);else askSubmit()};
}
function renderMockDone(el){
  const n=M.items.length,g=grade(M.pct),sw=strongWeak(M.groups);
  const why=M.auto==='time'?'หมดเวลา ระบบส่งข้อสอบอัตโนมัติ':M.auto==='cheat'?`ออกนอกหน้าสอบครบ ${M.limit} ครั้ง ระบบส่งข้อสอบอัตโนมัติ`:'';
  el.innerHTML=fx(`<div class="result">
    <p class="lbl">${esc(M.catName)} · ${fmtDate(M.startAt)}</p>
    <div class="scorebox"><div><p class="big">${M.score}/${n}</p><p class="src">คะแนนรวม</p></div><div><p class="big">${pctS(M.pct)}</p><p class="src">ร้อยละ</p></div><div><p class="big g-${g}">${g}</p><p class="src">เกรด</p></div></div>
    <p class="src" style="margin:0">ใช้เวลา ${fmtDur(M.used)} จาก ${M.mins} นาที${M.viol.length?` · ออกนอกหน้าสอบ ${M.viol.length} ครั้ง`:''}</p>
    ${why?`<p class="autonote">${esc(why)}</p>`:''}
    <div class="anal"><p class="lbl">วิเคราะห์ราย${M.cat==='spec'?'หัวข้อ':'วิชา'}</p>${M.groups.map(barRow).join('')}</div>
    ${swHTML(sw)}
    ${M.viol.length?`<details class="vlog"><summary>บันทึกการออกนอกหน้าสอบ (${M.viol.length} ครั้ง)</summary><ol>${M.viol.map(v=>`<li>นาทีที่ ${fmtClock((v.at-M.startAt)/1000)} · ${esc(v.reason)}</li>`).join('')}</ol></details>`:''}
    <div class="btnrow"><button class="primary" id="mnew">สอบชุดใหม่</button><button class="ghost" id="mhist">ดูประวัติสอบ</button></div>
    <div class="review"><div class="revhead"><p class="lbl">เฉลยรายข้อ (กดเพื่อดูเฉลยและถาม AI)</p><label><input type="checkbox" id="onlywrong"> เฉพาะข้อที่ผิด</label></div>
    ${M.items.map((q,j)=>{const p=M.picks[j],ok=p===q.answer;return `<details data-j="${j}" data-ok="${ok?1:0}"><summary><span>ข้อ ${j+1}: ${esc(qLabel(q))}</span><span class="${ok?'o':'x'}">${p==null?'ไม่ได้ตอบ':ok?'ถูก':'ผิด'}</span></summary><div class="body"></div></details>`}).join('')}
    </div></div>`);
  document.getElementById('mnew').onclick=()=>{M=null;saveM();renderMock()};
  document.getElementById('mhist').onclick=()=>setView('hist');
  document.getElementById('onlywrong').onchange=e=>el.querySelectorAll('.review details').forEach(d=>d.hidden=e.target.checked&&d.dataset.ok==='1');
  el.querySelectorAll('.review details').forEach(d=>d.addEventListener('toggle',()=>{
    if(!d.open)return;const j=+d.dataset.j,q=M.items[j],p=M.picks[j],b=d.querySelector('.body');
    if(!b.dataset.f){b.dataset.f='1';b.innerHTML=fx(`${questionHTML(q)}${choicesHTML(q,p,true)}${explainHTML(q,p)}${askHTML('m'+j,q,p)}`)}
    wireAsk('m'+j,q,p);
  }));
}

/* ---------- history view ---------- */
function renderHist(){
  if(VIEW!=='hist')return;
  head('ประวัติสอบ','เก็บไว้ในเบราว์เซอร์เครื่องนี้ (ยังไม่ซิงก์ข้ามเครื่อง)');
  const el=document.getElementById('sheet');
  if(!HIST.length){el.innerHTML=`<div class="state"><p><b>ยังไม่มีประวัติสอบ</b></p><p class="src">ทำข้อสอบในโหมดฝึกหรือสอบจริงจนจบ ผลจะมาอยู่ที่นี่</p><button class="primary" id="hgo">ไปสอบจริง</button></div>`;document.getElementById('hgo').onclick=()=>setView('mock');return}
  const list=HIST.filter(h=>HF==='all'||h.kind===HF).slice().reverse();
  const avg=list.length?list.reduce((a,h)=>a+h.pct,0)/list.length:0,last=list[0];
  const sw=strongWeak(mergeGroups(list.flatMap(h=>h.groups||[])));
  const tab=(v,t)=>`<button data-hf="${v}" aria-pressed="${HF===v}">${t}</button>`;
  el.innerHTML=`<div class="seg" role="group" aria-label="กรองประวัติ" style="grid-template-columns:repeat(3,1fr)">${tab('all','ทั้งหมด')}${tab('mock','สอบจริง')}${tab('practice','ฝึก')}</div>
    <div class="tiles"><div class="tile">จำนวนครั้งที่สอบ<b>${list.length}</b></div><div class="tile">คะแนนเฉลี่ย<b>${list.length?pctS(avg):'-'}</b></div><div class="tile">ครั้งล่าสุด<b>${last?pctS(last.pct):'-'}</b></div></div>
    ${swHTML(sw)}
    <div class="hlist">${list.length?list.map(h=>`<div class="hrow"><div class="t"><b>${esc(h.title)}</b><span class="src">${fmtDate(h.at)} · ${h.n} ข้อ · ใช้เวลา ${fmtDur(h.used)}${h.limit?` จาก ${Math.round(h.limit/60)} นาที`:''}</span><span>${h.kind==='mock'?'<span class="badge m">สอบจริง</span>':''}${h.auto==='time'?'<span class="badge">หมดเวลา</span>':''}${h.auto==='cheat'?'<span class="badge">ส่งเพราะออกนอกหน้า</span>':''}${h.viol?`<span class="badge">ออกนอกหน้า ${h.viol} ครั้ง</span>`:''}</span></div><div class="hp g-${grade(h.pct)}">${pctS(h.pct)}<small>${h.score}/${h.n}</small></div></div>`).join(''):'<p class="src">ไม่มีรายการในหมวดนี้</p>'}</div>
    <div class="navrow"><span class="src">เก็บล่าสุดไม่เกิน 300 ครั้ง</span><button class="ghost" id="hclear">ล้างประวัติ</button></div>`;
  el.querySelectorAll('[data-hf]').forEach(b=>b.onclick=()=>{HF=b.dataset.hf;renderHist()});
  document.getElementById('hclear').onclick=async()=>{if(await modal('<p class="mt">ล้างประวัติสอบทั้งหมด?</p><p class="src">ลบแล้วกู้คืนไม่ได้</p>',[{t:'ยกเลิก'},{t:'ล้างประวัติ',cls:'primary'}])===1){HIST=[];saveHist();renderHist()}};
}
