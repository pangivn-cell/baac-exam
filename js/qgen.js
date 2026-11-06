/* qgen.js — เมนู "สร้างโจทย์": ดูจำนวนโจทย์ของแต่ละวิชา และเติมให้ครบขั้นต่ำ (ค่าเริ่มต้น 50 ข้อ) อัตโนมัติ
   จำนวนของวิชา = ข้อสอบจริงจากไฟล์ + โจทย์ในคลังโจทย์กลาง (qpool)
   เครื่องประมวลผลหลัก (AI ในเครื่องเปิดอยู่) เติมเองเมื่อว่าง: ทีละวิชา ทีละ 10 ข้อ ใช้ AI ในเครื่องก่อน (ฟรี)
   AI ในเครื่องสร้างไม่ได้ (วิชาที่ต้องดูรูป / สร้างไม่สำเร็จ / ตรวจเฉลยตัวเองไม่ผ่าน) → สลับไปใช้ AI คลาวด์ตัวหลัก
   โจทย์ที่ AI ในเครื่องสร้าง ให้ AI ในเครื่องแก้ซ้ำโดยไม่เห็นเฉลย เก็บเฉพาะข้อที่คำตอบตรงกัน
   วิชาที่ระบบสร้างโจทย์ด้วยโปรแกรม (ไม่ใช้ AI) สร้างได้ไม่จำกัดอยู่แล้ว · วิชาจากไฟล์ส่วนตัวไม่แบ่งเข้าคลังกลาง จึงไม่เติม */
const QGEN_KEY='exam-qgen';
const QGEN={auto:true,min:50,local:{},log:[],busy:'',counts:null,countAt:0,tickAt:0};
try{Object.assign(QGEN,JSON.parse(localStorage.getItem(QGEN_KEY)||'{}'));QGEN.busy='';QGEN.counts=null;QGEN.countAt=0}catch(e){}
const saveQGen=()=>{try{const {auto,min,local,log}=QGEN;localStorage.setItem(QGEN_KEY,JSON.stringify({auto,min,local,log:log.slice(0,30)}))}catch(e){}};
const QGEN_BATCH=10,QGEN_LEVELS=[3,2,4,1,5];
/* วิชาที่ต้องเติม: ใช้ AI สร้างโจทย์ และแบ่งเข้าคลังกลางได้ */
const qgenSubj=s=>s&&s.ai&&!s.doc&&s.id!=='specall';
async function qgenCounts(force){
  if(!force&&QGEN.counts&&Date.now()-QGEN.countAt<10*60e3)return QGEN.counts;
  const pool={};
  try{const f=await fb(),snap=await f.fs.getDocs(f.fs.collection(f.db,'qpool'));
    for(const d of snap.docs){const x=d.data();pool[x.sub]=(pool[x.sub]||0)+((x.items||[]).length)}}catch(e){console.warn('qgen count',e&&e.code||e)}
  const out={};
  for(const s of SUBJ){if(s.id==='specall')continue;const real=bankFor(s,true).length;out[s.id]={real,pool:pool[s.id]||0,total:real+(pool[s.id]||0)}}
  QGEN.counts=out;QGEN.countAt=Date.now();return out;
}
/* ใช้ AI ตัวไหนกับวิชานี้: AI ในเครื่องก่อน ยกเว้นวิชาที่ต้องดูรูป หรือ AI ในเครื่องสร้างไม่สำเร็จ 2 รอบติด (จำไว้ 1 วัน) */
function qgenRoute(s,manual){
  const lf=QGEN.local[s.id],localBad=s.figOnly||(lf&&lf.fail>=2&&Date.now()-lf.at<864e5);
  if(localUp()&&!localBad)return{p:'local',model:LLMHOST.model};
  const p=activeAI();if(p&&p!=='claude')return{p,model:''};
  return manual&&localUp()?{p:'local',model:LLMHOST.model}:null;
}
/* AI ในเครื่องแก้โจทย์ที่ตัวเองสร้างซ้ำ (สลับตำแหน่งตัวเลือก ไม่บอกเฉลย) เก็บเฉพาะข้อที่ได้คำตอบเดิม */
async function qgenSelfCheck(items,signal){
  if(!items.length)return items;
  const mix=items.map(q=>{const o=shuffle(q.choices.map((t,j)=>j));return{q,o}});
  const text=`แก้ข้อสอบปรนัยต่อไปนี้ทีละข้ออย่างรอบคอบ คิดทีละขั้นก่อนตอบ
${mix.map(({q,o},i)=>`ข้อ ${i}: ${q.stem}\n${o.map((j,k)=>`  ${k}) ${q.choices[j]}`).join('\n')}`).join('\n\n')}
ตอบเป็น JSON เท่านั้น: {"answers":[{"i":0,"answer":0}]} answer คือเลขตัวเลือกที่ถูก (เริ่มจาก 0) ถ้าไม่มีตัวเลือกที่ถูกหรือโจทย์ไม่ครบ ให้ answer เป็น -1`;
  const sig=Object.assign(new AbortController().signal,{route:{p:'local',model:LLMHOST.model}});
  const r=await aiJSON(text,{signal:signal||sig});
  const got=new Map((r&&Array.isArray(r.answers)?r.answers:[]).map(a=>[+a.i,+a.answer]));
  return mix.filter(({q,o},i)=>{const a=got.get(i);return Number.isInteger(a)&&a>=0&&o[a]===q.answer}).map(x=>x.q);
}
/* สร้างโจทย์ใหม่ k ข้อให้วิชา s แล้วส่งเข้าคลังโจทย์กลาง · คืน {n, by} */
async function qgenRun(s,k,manual){
  if(!ME)throw{code:'login'};
  const route=qgenRoute(s,manual);if(!route)throw{code:'no_ai'};
  const level=QGEN_LEVELS[Math.floor(Math.random()*QGEN_LEVELS.length)];
  const ctl=new AbortController();ctl.signal.route=route;
  QGEN.busy=s.id;if(VIEW==='qgen')renderQGen();
  const run=async rt=>{ctl.signal.route=rt;
    const prev=GEN_AVOID;GEN_AVOID=[...avoidFor(s),...qgenAvoid(s)].slice(0,40);
    try{return await makeNew0(s,level,k,{signal:ctl.signal},atLevel(bankFor(s,true),level))}finally{GEN_AVOID=prev}};
  let items=[],by=route.p;
  try{
    try{items=await run(route)}catch(e){if(route.p!=='local'||(e&&e.code==='cancelled'))throw e;items=[]}
    if(route.p==='local'&&items.length){const before=items.length;items=await qgenSelfCheck(items);QGEN.lastDrop=before-items.length}
    if(route.p==='local'){
      const lf=QGEN.local[s.id]||{fail:0,at:0};
      if(items.length){lf.fail=0}else{lf.fail++;lf.at=Date.now()}QGEN.local[s.id]=lf;
      /* AI ในเครื่องสร้างไม่ได้ → ใช้ AI คลาวด์แทนในรอบเดียวกัน */
      const p=activeAI();
      if(!items.length&&p&&p!=='claude'){by=p;items=await run({p,model:''})}
    }
    items=items.filter(q=>q&&q.gen==='ai');
    if(items.length)await poolPut(s,level,items.map(q=>({...q,qgen:by})));
    QGEN.log.unshift({at:Date.now(),sub:s.name,n:items.length,by,level});QGEN.log=QGEN.log.slice(0,30);
    if(QGEN.counts&&QGEN.counts[s.id]){QGEN.counts[s.id].pool+=items.length;QGEN.counts[s.id].total+=items.length}
    saveQGen();return{n:items.length,by};
  }finally{QGEN.busy='';if(VIEW==='qgen')renderQGen()}
}
/* โจทย์ที่มีอยู่แล้วในคลังกลาง (บางส่วน) ส่งให้ AI เลี่ยงสร้างซ้ำ */
function qgenAvoid(s){
  const c=POOL.cache.get(s.id);if(!c)return[];
  const out=[];for(const d of c.docs)for(const raw of d.items||[]){try{out.push(String(JSON.parse(raw).stem).slice(0,120))}catch(e){}}
  return shuffle(out).slice(0,15);
}
/* เติมอัตโนมัติ: เฉพาะเครื่องที่เปิด AI ในเครื่องไว้ เมื่อไม่มีไฟล์รอประมวลผลและไม่ได้สอบอยู่ */
async function qgenTick(){
  if(!QGEN.auto||QGEN.busy||!ME||!localUp())return;
  if((typeof PROC_ID!=='undefined'&&PROC_ID)||(typeof PROCQ!=='undefined'&&PROCQ.length)||(typeof AUDIT_BUSY!=='undefined'&&AUDIT_BUSY))return;
  if(typeof M!=='undefined'&&M&&M.status==='run')return;
  const cnt=await qgenCounts();
  const need=SUBJ.filter(s=>qgenSubj(s)&&cnt[s.id]&&cnt[s.id].total<QGEN.min&&qgenRoute(s))
    .sort((a,b)=>cnt[a.id].total-cnt[b.id].total);
  if(!need.length)return;
  const s=need[0];
  try{await poolDocs(s);const r=await qgenRun(s,Math.min(QGEN_BATCH,QGEN.min-cnt[s.id].total));
    if(r.n)toast(`เติมโจทย์ “${s.name}” ${r.n} ข้อ (${AINAME[r.by]||r.by}) · มี ${cnt[s.id].total} จาก ${QGEN.min} ข้อ`)}
  catch(e){console.warn('qgen',e&&e.code||e);QGEN.log.unshift({at:Date.now(),sub:s.name,n:0,by:'',err:String(e&&e.code||e&&e.message||e)});saveQGen()}
}
setInterval(()=>{qgenTick().catch(()=>{})},90e3);

function renderQGen(){
  if(VIEW!=='qgen')return;
  head('สร้างโจทย์','ทุกวิชาต้องมีโจทย์อย่างน้อยตามขั้นต่ำ วิชาที่ยังไม่ครบ ระบบสร้างเพิ่มเองเมื่อว่าง ด้วย AI ในเครื่องก่อน สร้างไม่ได้จึงใช้ AI คลาวด์');
  const el=document.getElementById('sheet'),cnt=QGEN.counts;
  if(!ME){el.innerHTML='<div class="state"><p><b>เข้าสู่ระบบก่อน</b></p><p class="src">โจทย์ที่สร้างจะเก็บในคลังโจทย์กลางให้ทุกคนใช้</p></div>';return}
  if(!cnt){el.innerHTML='<div class="state"><span class="spin"></span><p>กำลังนับจำนวนโจทย์ของแต่ละวิชา...</p></div>';qgenCounts().then(()=>renderQGen());return}
  const host=localUp(),cloud=activeAI();
  const row=s=>{const c=cnt[s.id]||{real:0,pool:0,total:0},ok=c.total>=QGEN.min,pct=Math.min(100,c.total/QGEN.min*100);
    const rt=qgenSubj(s)?qgenRoute(s,true):null,lf=QGEN.local[s.id];
    const note=!s.ai?'โปรแกรมในเว็บสร้างโจทย์และคำนวณเฉลยเองทันที ไม่ใช้ AI ไม่เสียเครดิต':s.doc?'วิชาจากไฟล์: ใช้ข้อสอบในไฟล์ และสร้างใหม่ตอนทำข้อสอบ (ไม่เก็บเข้าคลังกลาง)'
      :QGEN.busy===s.id?'⏳ กำลังสร้าง...':ok?'✓ ครบแล้ว':`ขาด ${QGEN.min-c.total} ข้อ`+(rt?` · จะใช้ ${AINAME[rt.p]||rt.p}`:' · ยังไม่มี AI ให้ใช้')+(s.figOnly?' (ต้องดูรูป ใช้ AI คลาวด์)':lf&&lf.fail>=2?' (AI ในเครื่องสร้างไม่ได้ สลับใช้ AI คลาวด์)':'');
    return `<div class="qgrow${ok?' ok':''}"><div class="qgn"><b>${esc(s.name)}</b><span class="src">${note}</span></div>
      <div class="qgc">${!s.ai?`${c.real?`<span title="ข้อสอบจริงจากไฟล์">📄 ${c.real}</span>`:''}<b>⚙️ ไม่ใช้เครดิต</b>`:`<span title="ข้อสอบจริงจากไฟล์">📄 ${c.real}</span>${s.doc?'':`<span title="โจทย์ที่ AI สร้างในคลังกลาง">✨ ${c.pool}</span>`}<b>${s.doc?c.real:c.total}${s.doc?' ข้อ':'/'+QGEN.min}</b>`}</div>
      <div class="qgbar"><i style="width:${s.ai&&!s.doc?pct:100}%" class="${ok||!s.ai||s.doc?'ok':''}"></i></div>
      ${qgenSubj(s)?`<button class="ghost" data-qg="${esc(s.id)}" ${QGEN.busy||!rt?'disabled':''}>สร้างเพิ่ม ${QGEN_BATCH} ข้อ</button>`:'<span></span>'}</div>`};
  const grp=(t,l)=>l.length?`<section class="hsec"><div class="hsech"><h2>${t}</h2></div>${l.map(row).join('')}</section>`:'';
  const gen=SUBJ.filter(s=>s.group==='gen'),spec=SUBJ.filter(s=>s.group==='spec'&&s.id!=='specall');
  const due=SUBJ.filter(s=>qgenSubj(s)&&cnt[s.id]&&cnt[s.id].total<QGEN.min).length;
  el.innerHTML=`<div class="qgtop">
      <label class="rad"><input type="checkbox" id="qg-auto" ${QGEN.auto?'checked':''}><span><b>เติมโจทย์อัตโนมัติเมื่อว่าง</b><span class="src">${host?'เครื่องนี้มี AI ในเครื่อง เติมให้ได้':'ทำงานเฉพาะเครื่องที่เปิด AI ในเครื่องไว้ (ตั้งที่ ตั้งค่า AI → AI ในเครื่องนี้)'}</span></span></label>
      <div class="hopt"><label for="qg-min">ขั้นต่ำต่อวิชา</label><input class="tx" type="number" id="qg-min" min="10" max="500" step="10" value="${QGEN.min}" style="width:90px"><span class="src">ข้อ</span>
        <button class="ghost" id="qg-re">นับใหม่</button></div>
      <p class="src">AI ในเครื่อง: ${host?'<b class="okt">พร้อม</b>':'ไม่พร้อม'} · AI คลาวด์: ${cloud?esc(AINAME[cloud]||cloud):'ยังไม่ตั้ง'} · วิชาที่ยังไม่ครบ ${due} วิชา${QGEN.busy?` · กำลังสร้าง “${esc((SUBJ.find(s=>s.id===QGEN.busy)||{}).name||'')}”`:''}</p>
    </div>
    ${grp('ความรู้ความสามารถทั่วไป',gen)}${grp(typeof SPEC_LABEL!=='undefined'?SPEC_LABEL:'ความรู้เฉพาะตำแหน่ง',spec)}
    ${QGEN.log.length?`<section class="hsec"><div class="hsech"><h2>🕘 ประวัติการสร้าง</h2></div><div class="hrec">${QGEN.log.slice(0,12).map(l=>`<div class="hrecr"><div><b>${esc(l.sub)}</b><span class="src">${fmtDate(l.at)}${l.level?` · ระดับ ${l.level}`:''}</span></div><span class="src">${l.err?'ไม่สำเร็จ: '+esc(l.err):esc(AINAME[l.by]||l.by||'')}</span><b class="${l.n?'okt':'badt'}">${l.n?'+'+l.n:'0'}</b></div>`).join('')}</div></section>`:''}`;
  const $=id=>document.getElementById(id);
  $('qg-auto').onchange=e=>{QGEN.auto=e.target.checked;saveQGen();if(QGEN.auto)qgenTick()};
  $('qg-min').onchange=e=>{QGEN.min=Math.max(10,Math.min(500,Math.round(+e.target.value/10)*10||50));saveQGen();renderQGen()};
  $('qg-re').onclick=async()=>{QGEN.counts=null;POOL.cache.clear();renderQGen()};
  el.querySelectorAll('[data-qg]').forEach(b=>b.onclick=async()=>{const s=SUBJ.find(x=>x.id===b.dataset.qg);if(!s)return;
    try{await poolDocs(s);const r=await qgenRun(s,QGEN_BATCH,true);if(r.n)toast(`สร้าง “${s.name}” เพิ่ม ${r.n} ข้อแล้ว (${AINAME[r.by]||r.by})`);else toast('สร้างไม่สำเร็จ ลองอีกครั้ง','bad')}
    catch(e){toast('สร้างไม่สำเร็จ: '+(e&&e.code==='login'?'เข้าสู่ระบบก่อน':errCopy(e&&e.code,'สร้างโจทย์')),'bad')}});
}
