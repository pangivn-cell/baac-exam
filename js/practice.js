/* practice.js — หน้าทำข้อสอบ สอบจริง (Mock) กันโกง ประวัติสอบ */
/* ---------- round ---------- */
function subj(){return SUBJ.find(s=>s.id===P.subject)||SUBJ[0]}
async function start(go){
  if(genCtl){genCtl.abort();genCtl=null}
  const s=subj(),level=lvOf(s.id),n=P.count;
  R={subject:s.id,level,mode:P.mode,items:[],picks:[],i:0,status:'loading',go:go===true};
  const ai=!!activeAI(),nb=bankFor(s).length;
  if(!ai||(!s.ai&&!cardMixCount(s,n)&&!nb)){
    if(s.ai&&!nb){R.status='needai';render();return}
    R.items=offlineItems(s,level,n);R.status='play';R.t0=Date.now();render();return}
  if(!R.go){R.status='idle';render();return}
  render();
  const my=R;genCtl=new AbortController();
  try{
    const items=await makeItems(s,level,n,{signal:genCtl.signal,weak:(P.weak[s.id]||[]).slice(-5),onProg:d=>{const el=document.getElementById('genp');if(el)el.textContent=`ได้แล้ว ${d} จาก ${n} ข้อ`}});
    if(R!==my)return;
    if(!items.length){R.status='error';R.err='ได้โจทย์ที่ใช้ไม่ได้ ลองสร้างชุดใหม่อีกครั้ง';render();return}
    R.items=items;R.status='play';R.t0=Date.now();render();
  }catch(e){
    if(R!==my)return;const code=e&&e.code;
    if(code==='cancelled')return;
    R.status=HIDE_CODES.includes(code)||code==='no_ai'?'needai':'error';
    R.err=code==='need_figs'?'วิชานี้ต้องใช้รูปโจทย์จากเอกสาร อัปโหลดเอกสารแนวข้อสอบมิติสัมพันธ์ (เลือกกลุ่มความรู้ความสามารถทั่วไป) ในคลังความรู้ก่อน AI วาดรูปโจทย์ใหม่เองไม่ได้':code==='no_vision'?'วิชานี้ต้องใช้ AI ที่ดูรูปได้ ตั้งค่า Gemini หรือ OpenAI key':code==='no_doc'?'ไม่พบเอกสารนี้ในคลังความรู้แล้ว':code==='doc_empty'?'เอกสารนี้ยังไม่มีข้อความ (น่าจะเป็นไฟล์สแกน) ไปที่คลังความรู้แล้วกด ประมวลผลด้วย AI ก่อน':errCopy(code,'สร้างโจทย์');
    render();
  }finally{if(R===my)genCtl=null}
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
  return `${q.retry?'<p class="origtag retrytag">🔁 ข้อที่เคยตอบผิด ลองตอบใหม่อีกครั้ง</p>':''}${q.orig?'<p class="origtag">ข้อสอบจริงจากคลัง</p>':''}${q.fig?figHTML(q.fig):''}${q.svg?`<figure class="qsvgw">${q.svg}</figure>`:''}${q.viz?renderViz(q.viz):''}<div class="stem">${esc(q.stem)}</div>`;
}
function choicesHTML(q,pick,locked){
  const mc=!isTFU(q),pics=mc&&q.chSvg;
  return `<div class="choices${mc?' mc':''}${pics?' pics':''}">${q.choices.map((t,j)=>{
    let cls='ch';if(locked){if(j===q.answer)cls+=' right';else if(j===pick)cls+=' wrong'}else if(j===pick)cls+=' sel';
    return `<button class="${cls}" data-j="${j}" ${locked?'disabled':''} aria-pressed="${j===pick}">${pics?`<b>${TH[j]}</b><span class="chsvg">${q.chSvg[j]}</span>`:mc?`<b>${TH[j]}</b><span>${esc(t)}</span>`:esc(t)}</button>`}).join('')}</div>`;
}
function explainHTML(q,pick){
  const ok=pick===q.answer;
  let h=`<div class="explain"><p class="verdict ${ok?'good':'bad'}">${pick==null?'ไม่ได้ตอบ':ok?'ถูกต้อง':'ยังไม่ใช่'} · เฉลย ${isTFU(q)?'':TH[q.answer]+(q.chSvg?'':'. ')}${q.chSvg?'':esc(q.choices[q.answer])}</p>`;
  if(q.kind==='ineq'){const x=q.ctx;h+=`<p class="lbl">แถวรวม <span class="src">(มาจาก: คูณ ${x.k} ทุกตัวในบรรทัดล่างให้ ${FR[x.k]}${esc(x.H)} เป็น ${esc(x.H)} แล้วต่อกับบรรทัดบนตรง ${esc(x.H)})</span></p>${mergedHTML(x,q.hl)}`}
  if(q.exSvg)h+=`<figure class="qsvgw">${q.exSvg}</figure>`;
  if(q.expViz)h+=renderViz(q.expViz);
  if(q.steps.length)h+=`<ol class="steps">${q.steps.map(([t,s])=>`<li>${esc(t)}${s?` <span class="src">(มาจาก: ${esc(s)})</span>`:''}</li>`).join('')}</ol>`;
  if(q.ansAI)h+=`<p class="kwarn" style="margin:0">เฉลยข้อนี้ AI ดูจากรูปเอง เพราะเอกสารไม่มีเฉลย อาจผิดได้ ถ้าสงสัยให้ถาม AI ด้านล่าง หรือแก้บัตรความรู้ในคลังความรู้</p>`;
  if(q.cite)h+=`<p class="cite">📄 อ้างอิง: ${esc(q.cite)}${q.by?` · อัปโหลดโดย ${esc(q.by)}`:''}</p>`;
  if(typeof cloudCardOf==='function'&&cloudCardOf(q))h+=`<div><button class="ghost" type="button" data-rpt="${esc(q.card)}">⚑ รายงานเฉลยผิด</button></div>`;
  return h+`</div>`;
}
function askHTML(id,q,pick){
  const ok=pick===q.answer;
  return `<div class="askbox" id="ab-${id}" ${activeAI()?'':'hidden'}>
   <p class="lbl">สงสัยตรงไหน ถามแย้งได้เลย</p>
   <div class="quick">${!ok&&pick!=null?`<button type="button" class="qk" data-q="ทำไมไม่ตอบว่า ${esc(q.choices[pick])}">ทำไมไม่ตอบว่า ${esc(q.choices[pick])}</button>`:''}<button type="button" class="qk" data-q="อธิบายข้อนี้ให้ง่ายกว่านี้อีก">อธิบายให้ง่ายกว่านี้</button></div>
   <div class="thread"></div>
   <form class="askform"><label for="ai-${id}" class="lbl">พิมพ์คำถามของคุณ</label><textarea id="ai-${id}" rows="2" placeholder="เช่น ถ้าคิดอีกแบบ ข้อนี้น่าจะตอบอีกข้อไม่ใช่เหรอ"></textarea><div class="askrow"><span class="asknote"></span><button type="button" class="stop" hidden>หยุด</button><button type="submit" class="send">ถาม</button></div></form>
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
- ตอบเป็นภาษาไทย สั้น กระชับ ไม่เกินประมาณ 8 บรรทัด ภาษาพูดง่ายๆ
- ห้ามใช้ markdown เช่น ** หรือ # หรือตาราง ถ้าแบ่งขั้นให้ขึ้นบรรทัดใหม่ขึ้นต้นด้วย ① ② ③
- ห้ามข้ามขั้น ทุกครั้งที่มีค่าหรือพจน์ที่ไม่ได้อยู่ในโจทย์ตรงๆ ต้องบอกว่ามาจากไหน
- ถ้าเฉลยถูกต้อง และนักเรียนแย้ง ให้ชี้อย่างสุภาพว่าเหตุผลพลาดตรงไหน ถ้าตรวจแล้วพบว่าเฉลยผิดจริง ให้ยอมรับตรงๆ และบอกคำตอบที่ถูก
- ไม่ต้องแทนตัวเลขสมมติ เว้นแต่นักเรียนขอ
- ถ้าคำถามไม่เกี่ยวกับข้อนี้ ตอบสั้นๆ แล้วชวนกลับมาที่ข้อนี้`;
}
function wireAsk(id,q,pick){
  const box=document.getElementById('ab-'+id);if(!box||box.dataset.w)return;box.dataset.w='1';
  const thread=box.querySelector('.thread'),form=box.querySelector('form'),inp=box.querySelector('textarea'),send=box.querySelector('.send'),stop=box.querySelector('.stop'),note=box.querySelector('.asknote');
  let RULES=rulesFor(q,pick),turns=[],ctl=null;
  /* questions without their own source: pull related knowledge cards (meaning-based) on the first question asked */
  let ctxDone=!!q.srcText||!CARDS.length;
  const bubble=(cls,t)=>{const d=document.createElement('div');d.className='msg '+cls;d.textContent=t;thread.append(d);return d};
  async function ask(text){
    text=text.trim();if(!text||!activeAI()||send.disabled)return;
    note.textContent='';bubble('me',text);turns.push({role:'user',content:text});turns=turns.slice(-10);
    const b=bubble('ai wait','กำลังคิด...');ctl=new AbortController();send.disabled=true;stop.hidden=false;
    try{
      if(!ctxDone){ctxDone=true;try{const hits=await searchCards(`${q.stem||qLabel(q)}\n${text}`,4);
        if(hits.length)RULES+=`\n\nความรู้จากคลังความรู้ที่อาจเกี่ยวข้อง (ใช้เฉพาะถ้าเกี่ยวข้องจริง ถ้าใช้ให้ปิดท้ายด้วย "อ้างอิง:" ตามด้วยป้ายในวงเล็บเหลี่ยม):\n${hits.map(c=>`[${cardCite(c)}] ${c.title}: ${c.fact}`).join('\n')}`}catch(e){}}
      let first=RULES;if(q.fig&&canVision()){const im=await figForAI(q.fig);if(im)first={text:RULES+'\n\nภาพที่แนบคือรูปประกอบของโจทย์ข้อนี้ ดูรูปจริงก่อนตอบ',images:[im]}}
      const t=await aiText([{role:'user',content:first},...turns],{signal:ctl.signal,onText:({text})=>{b.classList.remove('wait');b.textContent=text}});
      b.classList.remove('wait');b.textContent=t;turns.push({role:'assistant',content:t});
    }catch(e){
      b.classList.remove('wait');if(e&&e.text)b.textContent=e.text;else b.remove();
      const code=e&&e.code;
      if(HIDE_CODES.includes(code)||code==='no_ai'){box.hidden=true;return}
      note.textContent=code==='cancelled'?'':errCopy(code,'ถาม');
    }finally{send.disabled=false;stop.hidden=true}
  }
  form.onsubmit=e=>{e.preventDefault();const t=inp.value;inp.value='';ask(t)};
  inp.onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();form.requestSubmit()}};
  stop.onclick=()=>ctl&&ctl.abort();
  box.querySelectorAll('.qk').forEach(k=>k.onclick=()=>ask(k.dataset.q));
}

var SIDE_OPEN=null;
function renderSide(){
  if(!SIDE_OPEN)SIDE_OPEN=Object.assign({gen:false,spec:false},P.sideOpen||{});
  const btn=(s,f)=>`<button class="subj" data-s="${s.id}" aria-current="${VIEW==='practice'&&s.id===P.subject}" title="${esc(s.name)}"${f?` data-f="${esc((s.name+' '+s.desc+' '+(s.kw||[]).join(' ')).toLowerCase())}"`:''}><span class="sn">${esc(s.name)}</span>${aiTag(s)}<span class="lv">ระดับ ${lvOf(s.id)}</span></button>`;
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
  const s=subj();document.getElementById('title').textContent=s.group==='spec'?`${SPEC_LABEL} · ${s.name}`:s.name;document.getElementById('desc').textContent=`${s.ai&&!/AI/.test(subjDesc(s))?'ใช้ AI สร้างโจทย์ · ':''}${subjDesc(s)} · ระดับ ${lvOf(s.id)}`;
}
function render(){
  if(VIEW!=='practice')return;
  renderSide();
  const el=document.getElementById('sheet');if(!R)return;
  if(R.status==='loading'){el.innerHTML=`<div class="state"><div class="spin" aria-hidden="true"></div><p><b>กำลังให้ AI สร้างโจทย์ใหม่ ระดับ ${R.level}</b></p><p class="src" id="genp">ใช้เวลาประมาณครึ่งนาทีถึงหนึ่งนาที</p><button class="ghost" id="cancelgen">ยกเลิก</button></div>`;document.getElementById('cancelgen').onclick=()=>{genCtl&&genCtl.abort();R.status='error';R.err='ยกเลิกแล้ว กดสร้างชุดใหม่เมื่อพร้อม';render()};return}
  if(R.status==='idle'){el.innerHTML=`<div class="state"><p><b>พร้อมสร้างโจทย์ชุดใหม่ ระดับ ${R.level}</b></p><p class="src">AI จะสร้างโจทย์ ${P.count} ข้อตามระดับของคุณ ใช้ ${AINAME[activeAI()]||'AI'} จากบัญชีของคุณ</p><button class="primary" id="go">สร้างโจทย์</button></div>`;document.getElementById('go').onclick=()=>start(true);return}
  if(R.status==='needai'){el.innerHTML=`<div class="state"><p><b>${aiReady?'วิชานี้ต้องใช้ AI สร้างโจทย์':'กำลังเชื่อมต่อ AI...'}</b></p><p class="src">${aiReady?(inViewer?'หน้านี้ยังใช้ Claude ไม่ได้ ลองกดอีกครั้งแล้วกดอนุญาต ส่วนอีก 4 วิชาระบบสร้างโจทย์เองได้':'ใส่ API key ของ Gemini หรือ OpenAI ในเมนู ตั้งค่า AI ด้านซ้ายก่อน ส่วนอีก 4 วิชาระบบสร้างโจทย์เองได้โดยไม่ต้องใช้ AI'):''}</p>${aiReady?'<button class="primary" id="retry">ลองอีกครั้ง</button>':''}</div>`;const r=document.getElementById('retry');if(r)r.onclick=()=>{if(!inViewer&&!activeAI()){const d=document.getElementById('aiset');d.open=true;d.scrollIntoView({block:'nearest'});return}start(true)};return}
  if(R.status==='error'){el.innerHTML=`<div class="state"><p><b>${esc(R.err||'เกิดข้อผิดพลาด')}</b></p><button class="primary" id="retry">สร้างชุดใหม่</button></div>`;document.getElementById('retry').onclick=()=>start(true);return}
  if(R.status==='done'){renderDone(el);return}
  const n=R.items.length,q=R.items[R.i],pick=R.picks[R.i],locked=R.mode==='now'&&pick!=null;
  const done=R.picks.filter((p,j)=>p!=null&&p===R.items[j].answer).length;
  el.innerHTML=fx(`<div class="meta"><span>ข้อ ${R.i+1} จาก ${n}</span><span>${R.mode==='now'?`ถูก ${done}`:`ตอบแล้ว ${R.picks.filter(p=>p!=null).length}`}</span></div>
   <div class="bar"><i style="width:${R.i/n*100}%"></i></div>
   ${questionHTML(q)}
   ${choicesHTML(q,pick,locked)}
   ${locked?explainHTML(q,pick)+askHTML('cur',q,pick):''}
   <div class="navrow"><span class="src">${R.mode==='end'?'เฉลยทั้งหมดจะแสดงตอนท้าย':''}</span><button class="primary" id="next" ${pick==null?'disabled':''}>${R.i+1<n?'ข้อต่อไป':'ส่งคำตอบ'}</button></div>`);
  el.querySelectorAll('.ch').forEach(b=>b.onclick=()=>{R.picks[R.i]=+b.dataset.j;render();const nb=document.getElementById('next');if(nb&&R.mode==='now')nb.focus({preventScroll:true})});
  if(locked)wireAsk('cur',q,pick);
  document.getElementById('next').onclick=()=>{if(R.i+1<n){R.i++;render();el.scrollIntoView({block:'start',behavior:'smooth'})}else finish()};
}
function finish(){
  const n=R.items.length,score=R.items.filter((q,j)=>R.picks[j]===q.answer).length,pct=n?score/n:0;
  const before=R.level;let after=before;if(pct>=.8)after=before+1;else if(pct<.5)after=Math.max(1,before-1);
  P.levels[R.subject]=after;
  const wrong=R.items.filter((q,j)=>R.picks[j]!==q.answer).map(q=>qLabel(q).replace(/\s+/g,' ').slice(0,90));
  P.weak[R.subject]=[...(P.weak[R.subject]||[]),...wrong].slice(-5);if(!wrong.length)P.weak[R.subject]=[];
  save();Object.assign(R,{status:'done',score,pct,after});recordCards(R.items,R.picks);logQs(R.items,R.picks);awardPoints(roundPoints(R.items,R.picks,before));
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
  const lvTxt=R.after>R.level?`รอบหน้าขึ้นเป็นระดับ ${R.after}`:R.after<R.level?`รอบหน้าลดเป็นระดับ ${R.after}`:`รอบหน้ายังอยู่ระดับ ${R.after}`;
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
  const out=[],seen=new Set();let fails=0;
  while(out.length<n&&fails<3){
    const k=Math.min(20,n-out.length),base=out.length;let items;
    try{const pr=await promptFn(k,base);items=cleanAI(typeof pr!=='string'?await aiVisionJSON(pr.text,pr.images,{signal}):await aiJSON(pr,{signal,onText:({text})=>{const m=(text.match(/"stem"/g)||[]).length;if(onProg)onProg(base+Math.min(m,k))}}))}
    catch(e){if(e&&e.code==='invalid_json'){fails++;continue}throw e}
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
var VIEW='practice',M=null,G=null,HF='all';
function setView(v){
  if(M&&M.status==='run'&&v!=='mock')return;
  if(v==='kb'&&VIEW!=='kb'&&typeof KB_TAB!=='undefined')KB_TAB='main';
  VIEW=v;
  document.querySelectorAll('#views button').forEach(b=>b.setAttribute('aria-current',b.dataset.v===v));
  document.getElementById('pside').classList.toggle('off',v!=='practice');
  document.getElementById('pctl').hidden=v!=='practice';
  if(v!=='mock'){document.getElementById('tbar').hidden=true;document.querySelector('.app').classList.remove('exam')}
  if(v==='practice')render();else if(v==='mock')renderMock();else if(v==='kb')renderKB();else if(v==='review')renderReview();else if(v==='study')renderStudy();else if(v==='rank')renderRank();else if(v==='home')renderHome();else if(v==='welcome')renderWelcome();else renderHist();
}
const head=(t,d)=>{document.getElementById('title').textContent=t;document.getElementById('desc').textContent=d||''};

/* ---------- mock exam ---------- */
const MKEY='exam-mock-v1',MSKEY='exam-mock-set';
const CATS={gen:'ความรู้ความสามารถทั่วไป',spec:'ความรู้เฉพาะตำแหน่งงานสินเชื่อ'};
const MOCK_N=[20,40,60,80,100],MOCK_MIN=[15,30,45,60,90,120];
const MOCK_MIX=[['math',.22],['series',.12],['ineq',.15],['logic',.12],['dir',.06],['data',.08],['spatial',.07],['thai',.1],['eng',.08]];
const SPEC_TOPICS=SPEC.map(x=>x[1]);
let MS={cat:'gen',n:40,min:60,custom:60,limit:3,action:'warn'};
try{const s=JSON.parse(localStorage.getItem(MSKEY)||'null');if(s)MS={...MS,...s}}catch(e){}
const saveMS=()=>{try{localStorage.setItem(MSKEY,JSON.stringify(MS))}catch(e){}};
try{M=JSON.parse(localStorage.getItem(MKEY)||'null');if(!M||!['run','done'].includes(M.status)||!Array.isArray(M.items))M=null}catch(e){M=null}
const saveM=()=>{try{if(M)localStorage.setItem(MKEY,JSON.stringify(M));else localStorage.removeItem(MKEY)}catch(e){}};
const mockMins=()=>MS.min==='custom'?Math.max(1,Math.min(300,Math.round(+MS.custom||60))):+MS.min;

function genPlan(n,useAI){
  const ok=id=>{const s=SUBJ.find(x=>x.id===id);return bankFor(s).length>0||(s.figOnly&&!LOCAL[s.id]?useAI&&canVision()&&figCards().some(c=>c.topic===s.name):useAI||!s.ai)};
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
รหัสชุด ${Math.random().toString(36).slice(2,8)} (ใช้เพื่อให้โจทย์ไม่ซ้ำกับชุดก่อน)
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
- ทุกข้อมีตัวเลือก 4 ตัว ถูกเพียงตัวเดียว คละตำแหน่งคำตอบที่ถูก ห้ามมีข้อที่กำกวม
- เฉลยแต่ละข้อมี 2–4 ขั้น สั้น ภาษาง่าย แต่ละขั้นบอกที่มา (from) เช่น ชื่อกฎหมายและมาตรา หรือชื่อหลักการ
- ใช้ภาษาไทย ศัพท์เฉพาะภาษาอังกฤษเขียนได้ ห้ามใช้ markdown ไม่ต้องใส่ ก ข ค ง หน้าตัวเลือก
ตอบเป็น JSON เท่านั้น รูปแบบ:
{"questions":[{"topic":"ชื่อหัวข้อตามที่กำหนด","stem":"โจทย์","choices":["ตัวเลือก1","ตัวเลือก2","ตัวเลือก3","ตัวเลือก4"],"answer":0,"viz":null,"ref":"","steps":[{"text":"ขั้นอธิบาย","from":"ที่มา"}]}]}`;
}
async function buildMock(){
  const cat=MS.cat,n=MS.n,useAI=!!activeAI(),ctl=new AbortController();
  G={status:'gen',cat,n,ctl};renderMock();
  const prog=k=>{const el=document.getElementById('mgenp');if(el)el.textContent=`ได้แล้ว ${Math.min(k,n)} จาก ${n} ข้อ`};
  try{
    let items=[];
    if(cat==='gen'){
      for(const p of genPlan(n,useAI)){
        const s=SUBJ.find(x=>x.id===p.id),base=items.length;
        const qs=await makeItems(s,3,p.k,{signal:ctl.signal,onProg:d=>prog(base+d)});
        items.push(...qs);prog(items.length);
        await new Promise(r=>setTimeout(r,0));
        if(G&&G.ctl!==ctl)return;
      }
      if(items.length<n){const s=SUBJ.find(x=>x.id==='math');items.push(...LOCAL.math(3,n-items.length).map(q=>({...q,sub:'math',subName:s.name})))}
    }else{
      items=(await makeItems(SUBJ.find(x=>x.id==='specall'),0,n,{signal:ctl.signal,onProg:prog}))
        .map(q=>({...q,sub:'spec',subName:SPEC_TOPICS.includes(q.topic)?q.topic:'อื่นๆ'}));
    }
    if(!G||G.ctl!==ctl)return;
    if(!items.length)throw{code:'empty'};
    G={status:'ready',cat,n,items:items.slice(0,n)};
  }catch(e){
    if(!G||G.ctl!==ctl)return;
    if(e&&e.code==='cancelled'){G=null}else G={status:'error',err:e&&e.code==='empty'?'ได้ข้อสอบที่ใช้ไม่ได้ ลองสร้างใหม่อีกครั้ง':errCopy(e&&e.code,'สร้างข้อสอบ')};
  }
  if(VIEW==='mock')renderMock();
}
let graceUntil=0,tickT=null;
function beginMock(){
  const mins=mockMins(),now=Date.now();
  M={status:'run',cat:G.cat,catName:CATS[G.cat],items:G.items,picks:Array(G.items.length).fill(null),i:0,startAt:now,endAt:now+mins*60000,mins,viol:[],warned:[],limit:MS.limit,action:MS.action,away:false};
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
  const end=Math.min(Date.now(),M.endAt),n=M.items.length,score=M.items.filter((q,j)=>M.picks[j]===q.answer).length;
  const groups=groupStats(M.items,M.picks,q=>q.subName);
  Object.assign(M,{status:'done',endedAt:end,used:(end-M.startAt)/1000,score,pct:n?score/n:0,auto:reason||'',groups,away:false});
  recordCards(M.items,M.picks);logQs(M.items,M.picks);awardPoints(roundPoints(M.items,M.picks,3));
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
    el.innerHTML=`<div class="state"><div class="spin" aria-hidden="true"></div><p><b>กำลังเตรียมข้อสอบ ${G.n} ข้อ</b></p><p class="src" id="mgenp">${G.cat==='gen'?'วิชาที่ระบบสร้างเองเสร็จทันที ส่วนภาษาไทยและอังกฤษรอ AI':'AI กำลังสร้างทีละชุด ชุดละ 20 ข้อ'}</p><button class="ghost" id="mcancel">ยกเลิก</button></div>`;
    document.getElementById('mcancel').onclick=()=>{const c=G&&G.ctl;G=null;if(c)c.abort();renderMock()};return;
  }
  if(G&&G.status==='error'){
    el.innerHTML=`<div class="state"><p><b>${esc(G.err)}</b></p><div class="btnrow"><button class="primary" id="mretry">ลองอีกครั้ง</button><button class="ghost" id="mback">กลับไปตั้งค่า</button></div></div>`;
    document.getElementById('mretry').onclick=buildMock;document.getElementById('mback').onclick=()=>{G=null;renderMock()};return;
  }
  if(G&&G.status==='ready'){
    const n=G.items.length,act=MS.action==='submit'?'ระบบจะส่งข้อสอบอัตโนมัติ':'ระบบจะแจ้งเตือนและบันทึกไว้ในผลสอบ';
    el.innerHTML=`<div class="state"><p class="mt">ข้อสอบพร้อมแล้ว ${n} ข้อ · ${mockMins()} นาที</p>${n<G.n?`<p class="catnote warn">AI สร้างได้ ${n} จาก ${G.n} ข้อ สอบเท่าที่มีได้ หรือกลับไปสร้างใหม่</p>`:''}
      <ul class="rules"><li>เวลานับถอยหลังทันทีที่กดเริ่มสอบ และไม่หยุดแม้ปิดหน้าไป</li><li>ระบบเตือนเมื่อเหลือ 10, 5 และ 1 นาที</li><li>หมดเวลา ระบบส่งข้อสอบให้อัตโนมัติ และแก้คำตอบไม่ได้อีก</li><li>ห้ามเปลี่ยนแท็บ ย่อหน้าต่าง สลับไปโปรแกรมอื่น หรือรีโหลดหน้า ถ้าครบ ${MS.limit} ครั้ง ${act}</li><li>ระหว่างสอบเลื่อนไปข้อไหนก็ได้ และเปลี่ยนคำตอบได้จนกว่าจะส่ง</li></ul>
      <div class="btnrow"><button class="primary" id="mbegin">เริ่มสอบ</button><button class="ghost" id="mback">ยกเลิก</button></div></div>`;
    document.getElementById('mbegin').onclick=beginMock;document.getElementById('mback').onclick=()=>{G=null;renderMock()};return;
  }
  renderSetup(el);
}
function renderSetup(el){
  const ai=!!activeAI(),opt=(v,t,cur)=>`<option value="${v}"${String(v)===String(cur)?' selected':''}>${t}</option>`;
  const note=MS.cat==='gen'
    ?(ai?'<p class="catnote">คณิตศาสตร์ อนุกรม เงื่อนไขสัญลักษณ์ เงื่อนไขภาษา ภาษาไทย และภาษาอังกฤษ (ไทยและอังกฤษสร้างโดย AI) ระดับความยากเท่าข้อสอบจริง</p>'
        :'<p class="catnote warn">ยังไม่ได้ตั้งค่า AI จึงมีเฉพาะคณิตศาสตร์ อนุกรม เงื่อนไขสัญลักษณ์ และเงื่อนไขภาษา ตั้งค่า AI ในแถบซ้ายเพื่อเพิ่มภาษาไทยและภาษาอังกฤษ</p>')
    :`<p class="catnote">${SPEC_TOPICS.join(' · ')}</p><p class="catnote warn">${!ai?'หมวดนี้ต้องใช้ AI สร้างข้อสอบ ตั้งค่า AI ในแถบซ้ายก่อน':activeCards().some(c=>SPEC_TOPICS.includes(c.topic))?`ออกข้อสอบจากบัตรความรู้ ${activeCards().filter(c=>SPEC_TOPICS.includes(c.topic)).length} ใบที่ AI ย่อยจากเอกสารในคลัง เน้นเรื่องที่ยังไม่เคยถามและที่เคยตอบผิด หัวข้อที่ยังไม่มีบัตร AI ใช้หลักการทั่วไป`:DOCS.length?`AI ใช้เอกสาร ${DOCS.length} ไฟล์ในคลังความรู้ประกอบ ข้อที่มาจากเอกสารจะมีอ้างอิงหน้า หัวข้อที่เอกสารไม่ครอบคลุม AI ใช้ความรู้ทั่วไป`:'ยังไม่มีเอกสารในคลังความรู้ AI สร้างจากความรู้ทั่วไป ตัวเลขหรือระเบียบเฉพาะของ ธ.ก.ส. อาจไม่ตรงกับปัจจุบัน อัปโหลดเอกสารได้ที่เมนูคลังความรู้'}</p>`;
  el.innerHTML=`<div class="form">
    <div class="field"><span class="fl" id="mcat-l">วิชา</span><div class="seg" role="group" aria-labelledby="mcat-l"><button data-cat="gen" aria-pressed="${MS.cat==='gen'}">${CATS.gen}</button><button data-cat="spec" aria-pressed="${MS.cat==='spec'}">${CATS.spec}</button></div></div>
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
  tb.innerHTML=`<span class="clock" id="tclock" role="timer" aria-label="เวลาที่เหลือ"></span><span class="tmeta">ตอบแล้ว ${answered}/${n}</span><span class="tmeta${v?' bad':''}">ออกนอกหน้า ${v}/${M.limit}</span><button class="primary" id="msubmit">ส่งข้อสอบ</button>`;
  document.getElementById('msubmit').onclick=askSubmit;tick();
}
function renderRun(el){
  const n=M.items.length,i=M.i,q=M.items[i],pick=M.picks[i];
  el.innerHTML=fx(`<div class="meta"><span>ข้อ ${i+1} จาก ${n}</span><span>${esc(q.subName||'')}</span></div>
    ${questionHTML(q)}
    ${choicesHTML(q,pick,false)}
    <div class="navrow"><button class="ghost" id="mprev" ${i?'':'disabled'}>← ข้อก่อนหน้า</button><button class="${pick!=null?'primary':'ghost'}" id="mnext">${i+1<n?'ข้อต่อไป →':'ส่งข้อสอบ'}</button></div>
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
