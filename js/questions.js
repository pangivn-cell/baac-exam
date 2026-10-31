/* questions.js — บัตรความรู้ รูปประกอบ คลังข้อสอบ บันทึกโจทย์ (กันซ้ำ) และการสร้างชุดโจทย์ */
/* ---------- knowledge base: documents → AI reads (OCR for broken PDF pages) → knowledge cards → embeddings ----------
   Everything lives in IndexedDB on this device: docs (text per page), files (original PDF bytes), cards (digested knowledge). */
var DOCS=[],CARDS=[],DOC_OFF=0,UPQ=[],KB_ERR=false,PROCQ=[],PROC_ID=null;
const KB_OPEN=new Set(),FIGS=new Map();
/* PFIG = รูปของคลังส่วนตัวที่อยู่บน Firestore (ยังไม่โหลดไบต์) — ใช้ร่วมกับ FIGS ของเครื่องนี้และ CFIG ของคลังกลาง */
const PFIG=new Map();
const newId=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
function kbOpen(){return new Promise((ok,no)=>{const r=indexedDB.open('exam-kb',3);
  r.onupgradeneeded=()=>{const db=r.result;for(const s of ['docs','files','cards','images'])if(!db.objectStoreNames.contains(s))db.createObjectStore(s,{keyPath:'id'})};
  r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)})}
async function kbTx(store,mode,fn){
  const db=await kbOpen();
  return new Promise((ok,no)=>{const tx=db.transaction(store,mode),q=fn(tx.objectStore(store));let res;
    if(q&&typeof q==='object'&&'onsuccess' in q)q.onsuccess=()=>{res=q.result};
    tx.oncomplete=()=>{db.close();ok(res)};tx.onerror=tx.onabort=()=>{db.close();no(tx.error)}});
}
const kbAll=s=>kbTx(s,'readonly',st=>st.getAll());
const kbGet=(s,id)=>kbTx(s,'readonly',st=>st.get(id));
const kbPutMany=(s,arr)=>kbTx(s,'readwrite',st=>{for(const x of arr)st.put(x)});
const kbDelMany=(s,ids)=>kbTx(s,'readwrite',st=>{for(const id of ids)st.delete(id)});
async function saveDoc(d){const {prog,...rest}=d;try{await kbPutMany('docs',[rest])}catch(e){d.mem=true}}
async function saveCards(arr){if(arr.length)try{await kbPutMany('cards',arr)}catch(e){}}

/* ---------- figures: images kept from documents (never dropped — some questions can't be answered without them) ---------- */
async function saveFigs(arr){for(const f of arr)FIGS.set(f.id,f);if(arr.length)try{await kbPutMany('images',arr.map(({url,...r})=>r))}catch(e){}}
async function dropFigs(ids){for(const id of ids){const f=FIGS.get(id);if(f&&f.url)URL.revokeObjectURL(f.url);FIGS.delete(id);PFIG.delete(id)}if(ids.length)try{await kbDelMany('images',ids)}catch(e){}}
const docFigs=id=>[...FIGS.values()].filter(f=>f.docId===id).sort((a,b)=>a.page-b.page||a.at-b.at);
function figURL(id){const f=FIGS.get(id);if(!f)return '';if(!f.url)f.url=URL.createObjectURL(f.blob);return f.url}
function figHTML(id,cls){const f=FIGS.get(id);
  if(!f&&PFIG.has(id)){fetchPersonalFig(id);return `<figure class="${cls||'qfig'}"><img data-pfig="${id}" alt="กำลังโหลดรูปประกอบ" onclick="this.closest('figure').classList.toggle('big')"></figure>`}
  if(!f&&CFIG.has(id)){fetchCloudFig(id);return `<figure class="${cls||'qfig'}"><img data-cfig="${id}" alt="กำลังโหลดรูปประกอบ" onclick="this.closest('figure').classList.toggle('big')"></figure>`}
  if(!f)return `<p class="src">(ไม่พบรูปประกอบ ${esc(id)})</p>`;
  return `<figure class="${cls||'qfig'}"><img src="${figURL(id)}" alt="${esc(f.desc||'รูปประกอบโจทย์')}" loading="lazy" onclick="this.closest('figure').classList.toggle('big')"></figure>`}
const canvasBlob=(cv,type,q)=>new Promise(ok=>cv.toBlob(ok,type,q));
/* crop part of a rendered page: box is [ymin,xmin,ymax,xmax] on a 0–1000 scale */
async function cropFig(cv,box){
  let [y0,x0,y1,x1]=box.map(v=>Math.max(0,Math.min(1000,+v)));if(!(y1>y0&&x1>x0))[y0,x0,y1,x1]=[0,0,1000,1000];
  const pad=15;y0=Math.max(0,y0-pad);x0=Math.max(0,x0-pad);y1=Math.min(1000,y1+pad);x1=Math.min(1000,x1+pad);
  const sx=Math.round(x0/1000*cv.width),sy=Math.round(y0/1000*cv.height),w=Math.max(8,Math.round((x1-x0)/1000*cv.width)),h=Math.max(8,Math.round((y1-y0)/1000*cv.height));
  const o=document.createElement('canvas');o.width=w;o.height=h;o.getContext('2d').drawImage(cv,sx,sy,w,h,0,0,w,h);
  let b=await canvasBlob(o,'image/png');if(b.size>700*1024)b=await canvasBlob(o,'image/jpeg',.88);
  return{blob:b,mime:b.type,w,h};
}
/* re-encode any stored image as PNG/JPEG (max 1600px) so every AI provider accepts it */
async function figForAI(id){
  if(!FIGS.has(id)){
    if(typeof PFIG!=='undefined'&&PFIG.has(id)){try{await fetchPersonalFig(id)}catch(e){}}
    else if(CFIG.has(id))await fetchCloudFig(id);
  }
  const f=FIGS.get(id);if(!f)return null;
  let bmp;try{bmp=await createImageBitmap(f.blob)}catch(e){return null}
  const sc=Math.min(1,1600/Math.max(bmp.width,bmp.height)),cv=document.createElement('canvas');cv.width=Math.round(bmp.width*sc);cv.height=Math.round(bmp.height*sc);
  const ctx=cv.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,cv.width,cv.height);ctx.drawImage(bmp,0,0,cv.width,cv.height);
  let d=cv.toDataURL('image/png');if(d.length>1.6e6)d=cv.toDataURL('image/jpeg',.85);
  return{mime:d.slice(5,d.indexOf(';')),data:d.split(',')[1]};
}
const SHOWABLE=/^image\/(png|jpe?g|gif|webp|bmp|svg\+xml)$/;

/* ---------- cards: helpers ---------- */
function activeCards(){
  const by=new Map(CARDS.map(c=>[c.id,c])),off=new Set(),docs=new Map(DOCS.map(d=>[d.id,d]));
  for(const c of CARDS)if(c.conf&&by.has(c.conf.other))off.add(c.conf.use==='old'?c.id:c.conf.other);
  return CARDS.filter(c=>!off.has(c.id)&&c.type!=='q'&&!HIDE.has(c.docId)&&docMine(docs.get(c.docId)));
}
const docOf=c=>DOCS.find(d=>d.id===c.docId);
function cardCite(c){const d=docOf(c);return d?`${d.name} ${d.unit} ${c.page}`:''}
function upBy(c){const d=c&&docOf(c);if(!d)return'';return d.central?(d.owner||'ไม่ระบุ'):'คุณ (ไฟล์ในเครื่องนี้)'}
function cardSrc(c){const d=docOf(c),pg=d&&d.pages.find(p=>p.n===+c.page);
  const figs=(c.figs||[]).map(id=>FIGS.get(id)||PFIG.get(id)).filter(Boolean);
  return `บัตรความรู้: ${c.title}\n${c.fact}${figs.length?`\nรูปประกอบ: ${figs.map(f=>f.desc||'รูปโจทย์').join(' / ')}${c.ansSrc==='AI'?'\n(เฉลยของรูปนี้ AI ดูจากรูปเอง เอกสารไม่มีเฉลย)':''}`:''}${pg&&pg.text?`\n\nเนื้อหาต้นฉบับ (${cardCite(c)}):\n${pg.text.slice(0,2500)}`:c.src?`\n\nเนื้อหาต้นฉบับ (${cardCite(c)}):\n${c.src}`:''}`}
function cardScore(c){const s=c.st||{},now=Date.now();
  return (s.w||0)*3-(s.r||0)*1.2+(s.n?0:2.5)+(c.imp||2)*.8+(s.lw&&now-s.lw<3*864e5?2:0)+Math.random()*2.5}
function pickCard(pool,used){
  const fresh=pool.filter(c=>!used.has(c.id)),arr=fresh.length?fresh:pool;if(!arr.length)return null;
  let best=null,bs=-1e9;for(const c of arr){const sc=cardScore(c);if(sc>bs){bs=sc;best=c}}return best;
}
function recordCards(items,picks){
  const ch=[];
  items.forEach((q,j)=>{if(!q.card)return;const c=CARDS.find(x=>x.id===q.card);if(!c)return;const s=c.st||(c.st={});
    s.n=(s.n||0)+1;s.ls=Date.now();if(picks[j]===q.answer)s.r=(s.r||0)+1;else{s.w=(s.w||0)+1;s.lw=Date.now()}ch.push(c)});
  saveCards(ch);
}
/* รูปที่ไม่ช่วยตอบโจทย์ เช่น ลายเซ็น โลโก้ ตราประทับ รูปถ่ายบุคคล QR ห้ามเอาไปทำโจทย์ */
const JUNK_FIG=/ลายเซ็น|ลายมือชื่อ|เซ็นชื่อ|signature|โลโก้|logo|ตราสัญลักษณ์|ตราประทับ|ตราธนาคาร|ตรา ธ\.?ก\.?ส|stamp|seal|รูปถ่ายบุคคล|ภาพถ่ายบุคคล|ภาพบุคคล|รูปบุคคล|รูปผู้บริหาร|ภาพผู้บริหาร|portrait|ลายน้ำ|watermark|qr ?code|คิวอาร์|บาร์โค้ด|barcode|ภาพตกแต่ง|รูปตกแต่ง|decorat/i;
/* รูปที่มีสาระ (แผนผัง ตาราง กราฟ สูตร โจทย์) ไม่นับเป็นรูปขยะ แม้คำอธิบายจะพูดถึงตราประทับ */
const INFO_FIG=/แผนผัง|แผนภาพ|แผนภูมิ|ตาราง|กราฟ(?!ิก)|กราฟแท่ง|สูตร|สมการ|อินโฟกราฟิก|ขั้นตอน|ผังแสดง|โจทย์|ตัวเลือก|มิติ|พับ|แผนที่|เส้นเวลา|ตัวอย่าง/;
/* รูปตกแต่งในเอกสารความรู้ (ไอคอน การ์ตูน ภาพประกอบทั่วไป) ไม่มีข้อมูลให้ถาม */
const DECOR_FIG=/^(ภาพ|รูป)?\s*(ไอคอน|การ์ตูน|ภาพประกอบ|ประกอบ|เครื่องหมาย|ลูกศร|วงเล็บ|ตัวอักษร|ภาพกราฟิกเงา|กราฟิกเงา|ภาพถ่ายกิจกรรม|ภาพถ่ายงาน)|^รูป[^\s]{1,30}$|^รูป\S+(และ\S+)?$/;
const hasFig=id=>FIGS.has(id)||PFIG.has(id);
const figDesc=id=>{const f=FIGS.get(id)||PFIG.get(id);return f?String(f.desc||'').trim():''};
const junkFig=id=>{const d=figDesc(id);return!!d&&JUNK_FIG.test(d)&&!INFO_FIG.test(d)};
const decorFig=id=>{const d=figDesc(id);return!!d&&(/^(ภาพ|รูป)\s*ประกอบ/.test(d)||DECOR_FIG.test(d)&&!INFO_FIG.test(d))};
/* okFig = ใช้ทำโจทย์จากบัตรความรู้ได้ · okQFig = รูปของข้อสอบที่ดึงมาจากไฟล์ข้อสอบ (รูปง่ายๆ ก็อาจเป็นโจทย์ได้) */
/* รูปที่มีแต่ข้อความ (กรอบ/กล่อง/แถบข้อความ ปุ่ม ภาพหน้าจอโจทย์) อ่านเป็นข้อความได้อยู่แล้ว ไม่ต้องแสดงเป็นรูป */
const TEXT_FIG=/^(ภาพ|รูป)?\s*(กรอบ|กล่อง|แถบ|ป้าย|ปุ่ม|หัวข้อ|ข้อความ)|^(โจทย์|คำถาม)\s*ข้อ|^แบบทดสอบ|^ข้อสอบ|^ตัวเลือก/;
const textFig=id=>{const d=figDesc(id);return TEXT_FIG.test(d)&&!STRUCT_FIG.test(d)};
/* บัตรความรู้ใช้รูปได้เฉพาะรูปที่มีโครงสร้างที่ต้องดูจึงตอบได้ (แผนผัง ตาราง กราฟ สูตร รูปมิติสัมพันธ์) */
const STRUCT_FIG=/แผนผัง|แผนภาพ|แผนภูมิ|ตาราง|กราฟ(?!ิก)|กราฟแท่ง|อินโฟกราฟิก|ผังแสดง|ผังขั้นตอน|เส้นเวลา|แผนที่|มิติ|พับ|รูปคลี่|ลูกบาศก์|ลูกเต๋า|รูปทรง|รูปเรขาคณิต|ทิศ/;
const FORMULA_FIG=/สูตร|สมการ|formula|equation|นิยาม|ความหมายของ/i;
const okFig=id=>hasFig(id)&&!junkFig(id)&&!decorFig(id)&&!textFig(id)&&!FORMULA_FIG.test(figDesc(id))&&STRUCT_FIG.test(figDesc(id));
/* รูปเฉลยคำตอบ: คำตอบที่ถูกอยู่ในรูป แต่ตัวลวงแทบไม่อยู่ (ถ้าเป็นตาราง/กราฟที่ทุกตัวเลือกอยู่ในรูป ต้องอ่านข้อมูลก่อน ไม่นับว่าเฉลย) */
function figLeaks(q,id){
  const d=nz(figDesc(id)),ch=(q.choices||[]).map(nz);if(!d||q.answer==null||!ch[q.answer]||ch[q.answer].length<2)return false;
  const ans=d.includes(ch[q.answer]),dis=ch.filter((c,j)=>j!==q.answer&&c.length>=2&&d.includes(c)).length;
  return ans&&dis<2;
}
const okQFig=id=>hasFig(id)&&!junkFig(id);
/* แสดงรูปเฉพาะเมื่อโจทย์อ้างถึงรูปจริง หรือตัวเลือกเป็นรูป
   รูปที่เป็นภาพหน้าจอของโจทย์+ตัวเลือก (ถอดเป็นข้อความแล้ว) ไม่แสดง เพราะมักมีเฉลยติดมาในรูป */
const FIG_REF=/(จาก|ตาม|ดัง|ใน|พิจารณา|ดู)\s*(รูป|ภาพ)(?!แบบ)|(?<![ก-๙])(รูป|ภาพ)(ที่|ต่อไปนี้|ข้าง|ด้าน|ประกอบ|นี้|ใด|\s*\d)|ตาราง|แผนภูมิ|แผนผัง|แผนภาพ|ผังงาน|กราฟ(?!ิก)|แผนที่|ไดอะแกรม|figure|diagram|chart|table|graph|picture/i;
function figNeeded(q){
  const st=String(q.stem||'').trim(),ch=(q.choices||[]).map(x=>String(x||'').trim());
  if(FIG_REF.test(st))return true;
  if(st.length<15)return true;
  return ch.length>0&&ch.every(x=>x.length<=3||/^(รูป|ภาพ)\s*\S{0,3}$/.test(x));
}
function withCard(q,doc){
  const c=q.card&&CARDS.find(x=>x.id===q.card);
  if(c){q.cite=cardCite(c);q.by=upBy(c);q.srcText=cardSrc(c);if(!q.topic)q.topic=c.topic;
    const sub=SUBJ.find(x=>x.id===q.sub||x.name===c.topic)||{};
    /* บัตรความรู้ (สไลด์/เอกสาร) ไม่แสดงรูปในโจทย์ ยกเว้นวิชาที่ต้องดูรูป เพราะรูปมักมีคำตอบอยู่แล้ว */
    const figs=(c.figs||[]).filter(c.type==='q'?okQFig:sub.figOnly?(id=>hasFig(id)&&!junkFig(id)&&!textFig(id)):()=>false);
    if(figs.length){q.fig=figs.includes(q.fig)?q.fig:figs[0];q.ansAI=c.ansSrc==='AI'}else q.fig='';}
  else{q.card='';q.fig='';withCite(q,doc)}
  if(q.fig&&(!figNeeded(q)||(c&&c.type!=='q'&&figLeaks(q,q.fig)))){q.fig='';q.ansAI=false}
  if(!q.fig&&q.stem&&!q.svg&&!q.viz)q.stem=String(q.stem).replace(/^\s*(จาก|ตาม|ดู|ดัง)\s*(รูป|ภาพ|ตาราง|แผนภูมิ|แผนภาพ|แผนผัง|กราฟ|อินโฟกราฟิก)(ที่กำหนด(ให้)?|ข้างต้น|ด้านบน|ข้างบน|ต่อไปนี้|นี้|ประกอบ)?\s*[,:]?\s*/,'');
  return q;
}
const figCards=()=>activeCards().filter(c=>(c.figs||[]).some(id=>hasFig(id)&&!junkFig(id)&&!textFig(id)));
/* ไฟล์ที่ “เชื่อมต่อกับรายวิชา” ไว้: บัตรของไฟล์นั้นใช้ได้กับทุกวิชาที่ผูกไว้ โดยไม่ต้องย้ายบัตร */
const docSubsOf=id=>{const d=DOCS.find(x=>x.id===id);return (d&&Array.isArray(d.subs))?d.subs:[]};
const inSubj=(c,name)=>c.topic===name||docSubsOf(c.docId).includes(name);
/* ---------- question bank: questions taken as-is from files uploaded as "ข้อสอบ/ตัวอย่างโจทย์" ---------- */
const BUILTIN_RAW=[...(typeof BUILTIN_BANK!=='undefined'?BUILTIN_BANK:[]),...(typeof ADDSEQ_BANK!=='undefined'?ADDSEQ_BANK:[])];
const BUILTIN_CARDS=BUILTIN_RAW.map((q,i)=>({id:'b'+i,docId:'builtin',type:'q',topic:q.topic,ansSrc:'',figs:[],q:{stem:q.stem,choices:q.choices.slice(),answer:q.answer,steps:q.steps||[]}}));
const bankItems=()=>{const docs=new Map(DOCS.map(d=>[d.id,d]));const base=CARDS.filter(c=>c.type==='q'&&!HIDE.has(c.docId)&&docMine(docs.get(c.docId))&&c.q&&c.q.answer>=0&&c.q.answer<(c.q.choices||[]).length);return [...base,...BUILTIN_CARDS.filter(c=>!HIDE.has(c.docId)&&docMine(docs.get(c.docId)))]};
function bankFor(s){const b=bankItems().filter(c=>QLOG_OFF||!qMastered(c.q));return s.doc?b.filter(c=>c.docId===s.doc):s.id==='specall'?b.filter(c=>SPEC_TOPICS.some(n=>inSubj(c,n))):b.filter(c=>inSubj(c,s.name))}
const pickBank=(pool,k)=>pool.map(c=>({c,sc:cardScore(c)})).sort((a,b)=>b.sc-a.sc).slice(0,k).map(x=>x.c);
function bankQ(c,s){
  const q=withCard({kind:'mc',stem:c.q.stem,choices:c.q.choices.slice(),answer:c.q.answer,steps:(c.q.steps||[]).map(t=>[t,'']),card:c.id,
    fig:(c.figs||[]).filter(id=>!junkFig(id))[0]||'',viz:c.q.viz||null,orig:true,topic:c.topic,sub:s.id,subName:s.name},null);
  q.ansAI=c.ansSrc==='AI';return q;
}
/* without AI: questions straight from the bank (+ the local generator for subjects that have one) */
function offlineItems(s,level,n){
  const pool=bankFor(s),k=s.ai?Math.min(n,pool.length):Math.min(pool.length,Math.round(n*.4));
  const q=pickBank(pool,k).map(c=>bankQ(c,s));
  return shuffle([...q,...(s.ai?[]:localItems(s,level,n-q.length))]);
}
/* a few real questions of the same kind, so newly generated ones copy their style and difficulty */
function styleEx(pool,k=3){
  const ex=shuffle(pool.slice()).slice(0,k);if(!ex.length)return '';
  return `ตัวอย่างข้อสอบจริงแนวนี้ (ใช้เป็นแบบอย่างรูปแบบ ความยาก และสำนวน ห้ามลอกซ้ำ ให้สร้างข้อใหม่ที่วัดเรื่องเดียวกันแต่ไม่ซ้ำ):
${ex.map((c,i)=>`ตัวอย่าง ${i+1}: ${c.q.stem}${(c.figs||[]).length?' (มีรูปประกอบ)':''}\nตัวเลือก: ${c.q.choices.map((t,j)=>`${TH[j]}. ${t}`).join(' | ')}\nตอบ: ${TH[c.q.answer]}`).join('\n')}
`;
}
function addEx(pr,pool){const ex=styleEx(pool)+(GEN_AVOID.length?`\nโจทย์ที่ผู้ทำเคยทำไปแล้ว ห้ามสร้างซ้ำหรือถามประเด็นเดิมด้วยสำนวนใกล้เคียง:\n- ${GEN_AVOID.join('\n- ')}\n`:'');if(!ex)return pr;const ins=t=>t.includes('กติกา:')?t.replace('กติกา:',ex+'\nกติกา:'):t+'\n\n'+ex;return typeof pr==='string'?ins(pr):{...pr,text:ins(pr.text)}}
/* prompt factory: one card per question slot, weakest/unseen cards first, no repeats within a round */
function cardPF(pool,topicsFn,level,weak,maxUse=Infinity){
  const used=new Map();
  return(k,base)=>{const vis=canVision(),act=pool().filter(c=>vis||!(c.figs&&c.figs.length)),slots=topicsFn(k,base).map(t=>{
      const cand=(t?act.filter(x=>inSubj(x,t)):act).filter(x=>(used.get(x.id)||0)<maxUse),c=pickCard(cand,new Set(used.keys()));
      if(c)used.set(c.id,(used.get(c.id)||0)+1);return{topic:t||(c&&c.topic)||'',card:c}});
    return cardPrompt(slots,level,weak)};
}
/* how many questions of a subject should come from knowledge cards (each card at most twice per round) */
function cardMixCount(s,n){
  const k=activeCards().filter(c=>inSubj(c,s.name)).length;if(!k)return 0;
  return s.ai?Math.min(n,k*2):Math.min(Math.max(1,Math.round(n*.4)),k*2);
}
const rotTopics=()=>{const order=shuffle(SPEC_TOPICS.slice());return(k,b)=>Array.from({length:k},(_,i)=>order[(b+i)%order.length])};
/* ---------- บันทึกโจทย์ที่เคยทำ (เก็บในเครื่องนี้) ----------
   ตอบถูกแล้ว = ไม่แสดงข้อนั้นอีก · ตอบผิด = เก็บทั้งข้อไว้ แล้วนำกลับมาให้ตอบใหม่จนกว่าจะตอบถูก */
const QLOG_KEY='exam-qlog';let QLOG={};
try{QLOG=JSON.parse(localStorage.getItem(QLOG_KEY)||'{}')||{}}catch(e){QLOG={}}
/* ข้อความที่ใช้ระบุโจทย์: โจทย์บางแบบ (เช่น เงื่อนไขสัญลักษณ์) ไม่มี stem ใช้ข้อความที่แสดงบนจอแทน */
const qText=q=>q?String(q.stem||qLabel(q)||''):'';
function qKey(q){
  const t=qText(q).toLowerCase().replace(/[\s"'“”‘’.,:;!?()\[\]\-_/]+/g,'').slice(0,240);
  let h=5381;for(let i=0;i<t.length;i++)h=((h<<5)+h+t.charCodeAt(i))|0;return 'k'+(h>>>0).toString(36)+t.length;
}
const qMastered=q=>{if(QLOG_OFF)return false;const e=QLOG[qKey(q)];return!!e&&e.s==='r'};
/* ลายนิ้วมือบัตรความรู้: ใช้กันบัตรซ้ำเมื่อย่อยไฟล์ซ้ำ/ไฟล์ที่เนื้อหาซ้ำกัน */
const cardKey=c=>{const n=s=>String(s||'').toLowerCase().replace(/[\s\-_.,:;!?()\[\]{}"'“”]+/g,'');return n(c.topic)+'|'+n(c.title)+'|'+n(c.fact).slice(0,400)};
function saveQLog(){
  let ks=Object.keys(QLOG);
  if(ks.length>6000){ks.sort((a,b)=>QLOG[a].t-QLOG[b].t);for(const k of ks.slice(0,ks.length-6000))delete QLOG[k]}
  const w=Object.keys(QLOG).filter(k=>QLOG[k].s==='w').sort((a,b)=>QLOG[a].t-QLOG[b].t);
  for(const k of w.slice(0,Math.max(0,w.length-400)))delete QLOG[k].q;
  try{localStorage.setItem(QLOG_KEY,JSON.stringify(QLOG))}catch(e){}
}
function logQs(items,picks){
  const ch=[];
  items.forEach((q,j)=>{const pk=picks[j];if(pk==null||pk<0||!q||!qText(q))return;const k=qKey(q),now=Date.now();ch.push(k);
    if(pk===q.answer)QLOG[k]={s:'r',t:now,sub:q.sub||'',st:qText(q).slice(0,140)};
    else{const {retry,...keep}=q;QLOG[k]={s:'w',t:now,sub:q.sub||'',st:qText(q).slice(0,140),n:((QLOG[k]&&QLOG[k].n)||0)+1,q:keep}}});
  saveQLog();pushQLog(ch);if(typeof poolMarkUsed==='function')poolMarkUsed(items);
}
/* ---------- ซิงก์บันทึกโจทย์กับบัญชี (users/{uid}/qlog/r และ /w) ทุกเครื่องที่ล็อกอินบัญชีเดียวกันเห็นชุดเดียวกัน ----------
   r = ข้อที่ตอบถูกแล้ว (เก็บแค่รหัส เวลา วิชา) · w = ข้อที่ยังตอบผิด (เก็บทั้งข้อ เพื่อนำกลับมาให้ตอบใหม่) */
const qRemoteR=e=>`${e.t}|${e.sub||''}`;
/* ตัวโจทย์เก็บเป็นข้อความ JSON เพราะ Firestore เก็บอาร์เรย์ซ้อนอาร์เรย์ (steps, viz) ไม่ได้ */
function qRemoteW(e){const {srcText,...q}=e.q||{};return{t:e.t,sub:e.sub||'',st:e.st||'',n:e.n||1,q:e.q?JSON.stringify(q):''}}
async function pushQLog(keys){
  if(!ME||!keys.length)return;
  try{const f=await fb(),r={},w={};
    for(const k of keys){const e=QLOG[k];if(!e)continue;if(e.s==='r'){r[k]=qRemoteR(e);w[k]=f.fs.deleteField()}else w[k]=qRemoteW(e)}
    if(Object.keys(r).length)await f.fs.setDoc(fsDoc('users',ME.uid,'qlog','r'),{m:r},{merge:true});
    await f.fs.setDoc(fsDoc('users',ME.uid,'qlog','w'),{m:w},{merge:true});
  }catch(e){console.warn('qlog sync',e&&e.code||e)}
}
/* ตอนล็อกอิน: รวมของในบัญชีกับของในเครื่อง ข้อเดียวกันใช้ผลที่ตอบล่าสุด แล้วส่งชุดที่รวมแล้วกลับขึ้นไป */
async function pullQLog(){
  if(!ME)return;
  try{const f=await fb(),uid=ME.uid,[rs,ws]=await Promise.all([f.fs.getDoc(fsDoc('users',uid,'qlog','r')),f.fs.getDoc(fsDoc('users',uid,'qlog','w'))]);
    const rm=rs.exists()?rs.data().m||{}:{},wm=ws.exists()?ws.data().m||{}:{};
    for(const [k,v] of Object.entries(rm)){const [t,sub]=String(v).split('|'),l=QLOG[k];if(!l||l.t<+t)QLOG[k]={s:'r',t:+t,sub:sub||'',st:l&&l.st||''}}
    for(const [k,e] of Object.entries(wm)){const l=QLOG[k];if(e&&(!l||l.t<e.t)){let q=null;try{q=e.q?(typeof e.q==='string'?JSON.parse(e.q):e.q):null}catch(x){}QLOG[k]={s:'w',t:e.t,sub:e.sub||'',st:e.st||'',n:e.n||1,...(q?{q}:{})}}}
    saveQLog();
    const r={},w={};for(const [k,e] of Object.entries(QLOG)){if(e.s==='r')r[k]=qRemoteR(e);else w[k]=qRemoteW(e)}
    await f.fs.setDoc(fsDoc('users',uid,'qlog','r'),{m:r});await f.fs.setDoc(fsDoc('users',uid,'qlog','w'),{m:w});
  }catch(e){console.warn('qlog sync',e&&e.code||e)}
}
/* ข้อที่เคยตอบผิดของวิชานี้ เก่าสุดก่อน */
function retryItems(s,k){
  if(k<=0)return[];
  return Object.values(QLOG).filter(e=>e.s==='w'&&e.q&&(e.sub===s.id||(s.id==='specall'&&SPEC_TOPICS.includes(e.q.topic||e.q.subName))))
    .sort((a,b)=>a.t-b.t).slice(0,k).map(e=>({...JSON.parse(JSON.stringify(e.q)),retry:true,sub:e.q.sub||s.id,subName:e.q.subName||s.name}));
}
/* ตัดข้อที่ตอบถูกแล้ว และข้อซ้ำกันในชุดเดียวกัน */
function dedupeQs(list,seen){
  const out=[];for(const q of list){if(!q)continue;const k=qKey(q);if(seen.has(k)||qMastered(q))continue;seen.add(k);out.push(q)}return out;
}
/* โจทย์ที่ทำไปแล้วล่าสุดของวิชานี้ ส่งให้ AI เพื่อไม่ให้สร้างซ้ำ */
let GEN_AVOID=[],QLOG_OFF=false;
const avoidFor=s=>Object.values(QLOG).filter(e=>e.sub===s.id&&e.st).sort((a,b)=>b.t-a.t).slice(0,25).map(e=>e.st);

/* one place that turns a subject into questions: local generator, AI from cards, AI general, or a mix */
async function makeItems(s,level,n,o={}){
  const seen=new Set(),retry=dedupeQs(retryItems(s,Math.ceil(n*.4)),seen);
  if(retry.length>=n)return shuffle(retry.slice(0,n));
  GEN_AVOID=avoidFor(s);
  let items=dedupeQs(await makeItems0(s,level,n-retry.length,o),seen);
  /* ข้อที่ถูกตัดออกเพราะซ้ำ: สร้างเพิ่มอีกรอบ (ไม่เกิน 2 รอบ) */
  for(let r=0;r<2&&items.length<n-retry.length;r++){
    let more=[];try{more=await makeItems0(s,level,n-retry.length-items.length,o)}catch(e){if(e&&e.code==='cancelled')throw e;break}
    const add=dedupeQs(more,seen);if(!add.length)break;items.push(...add);
  }
  /* ถ้าข้อในคลังทำถูกหมดแล้วและสร้างใหม่ไม่ได้ ให้ใช้ข้อเก่าที่ทำนานที่สุดแทน ดีกว่าได้ชุดว่าง */
  if(!items.length&&!retry.length){let old=[];QLOG_OFF=true;try{old=await makeItems0(s,level,n,o)}finally{QLOG_OFF=false}if(old.length){toast('ข้อสอบวิชานี้ในคลังตอบถูกครบแล้ว ใส่ AI key เพื่อสร้างโจทย์ใหม่');return old}}
  return shuffle([...retry,...items.slice(0,n-retry.length)]);
}
async function makeItems0(s,level,n,o={}){
  /* real questions from the bank first (up to half; all of them for picture subjects), the rest newly generated in the same style */
  const pool=bankFor(s);
  if(!activeAI())return offlineItems(s,level,n);
  const orig=pickBank(pool,Math.min(pool.length,Math.ceil(n*(s.figOnly&&!LOCAL[s.id]?1:.5)))).map(c=>bankQ(c,s));
  if(orig.length>=n)return shuffle(orig);
  let gen=[];
  try{gen=await makeNew(s,level,n-orig.length,{...o,onProg:d=>o.onProg&&o.onProg(orig.length+d)},pool)}
  catch(e){if(!orig.length||(e&&e.code==='cancelled'))throw e}
  return shuffle([...orig,...gen]);
}
/* โจทย์ที่ต้องให้ AI สร้าง: หยิบจากคลังโจทย์กลางก่อน ให้ AI สร้างเฉพาะส่วนที่ขาด แล้วส่งโจทย์ใหม่เข้าคลังให้คนอื่นใช้ */
async function makeNew(s,level,n,o,pool){
  let fromPool=[];try{fromPool=typeof poolTake==='function'?await poolTake(s,level,n):[]}catch(e){}
  if(fromPool.length>=n)return fromPool.slice(0,n);
  const gen=await makeNew0(s,level,n-fromPool.length,o,pool);
  if(typeof poolPut==='function')poolPut(s,level,gen);
  return shuffle([...fromPool,...gen]);
}
async function makeNew0(s,level,n,o,pool){
  const weak=o.weak||[],doc=s.doc?DOCS.find(d=>d.id===s.doc):null;let act=activeCards();DOC_OFF=Math.floor(Math.random()*1000);
  /* เอกสารที่เพิ่งดึงมาจากอีกเครื่อง: โหลดบัตรความรู้/ข้อความหน้าให้ครบก่อนสร้างโจทย์ */
  if(doc&&typeof syncHydrate==='function'){try{await syncHydrate(doc,{cards:true})}catch(e){}act=activeCards()}
  const tag=q=>withCard({...q,sub:s.id,subName:s.name,gen:'ai'},doc),run=(pf,k,off=0)=>genAIChunks(async(k2,b)=>addEx(await pf(k2,b),pool),k,{signal:o.signal,onProg:d=>o.onProg&&o.onProg(off+d)});
  if(s.figOnly&&!LOCAL[s.id]&&!figCards().some(c=>inSubj(c,s.name))){if(pool.length)return[];throw{code:'need_figs'}}
  if(s.doc&&doc&&doc.kind==='exam'&&!act.some(c=>c.docId===doc.id))return (await run(k=>genPrompt({name:doc.name,desc:'ข้อสอบแนวเดียวกับตัวอย่าง'},level,k),n)).map(tag);
  if(s.doc){
    if(!doc)throw{code:'no_doc'};
    const has=act.some(c=>c.docId===doc.id);
    if(!has&&(!doc.pages||!doc.pages.length)&&doc.pagesParts>0&&typeof ensureDocPages==='function'){try{await ensureDocPages(doc)}catch(e){}}
    if(!has&&!docWindows(doc).length)throw{code:'doc_empty'};
    return (await run(has?cardPF(()=>activeCards().filter(c=>c.docId===doc.id),k=>Array(k).fill(null),level,weak):(k,b)=>docPrompt(doc,level,k,b,weak),n)).map(tag);
  }
  if(s.id==='specall'){const tf=rotTopics();
    return (await run(act.some(c=>SPEC_TOPICS.includes(c.topic))?cardPF(activeCards,tf,level,weak,2):(k,b)=>specPrompt(tf(k,b),{level,weak}),n)).map(tag)}
  if(s.group==='spec')
    return (await run(act.some(c=>inSubj(c,s.name))?cardPF(activeCards,k=>Array(k).fill(s.name),level,weak,2):k=>specPrompt(Array(k).fill(s.name),{level,weak}),n)).map(tag);
  /* subjects that need pictures (มิติสัมพันธ์): AI can't draw new figures reliably, so figure cards from uploaded documents (each used once)
     plus the local generator that draws its own figures with known answers */
  if(s.figOnly){
    const pool=()=>figCards().filter(c=>inSubj(c,s.name)),k=pool().length,local=LOCAL[s.id];
    if(!local){if(!k)throw{code:'need_figs'};if(!canVision())throw{code:'no_vision'}}
    let fromFig=[];
    if(k&&canVision()){try{fromFig=(await run(cardPF(pool,x=>Array(x).fill(s.name),level,weak,1),Math.min(local?Math.ceil(n/2):n,k))).map(tag).filter(q=>q.fig)}catch(e){if(!local||(e&&e.code==='cancelled'))throw e}}
    return shuffle([...fromFig,...(local?localItems(s,level,n-fromFig.length):[])]);
  }
  /* general subjects: part from cards (documents uploaded to the general group), the rest as before */
  const m=activeAI()?cardMixCount(s,n):0;let fromCards=[];
  if(m){try{fromCards=(await run(cardPF(activeCards,k=>Array(k).fill(s.name),level,weak,2),m)).map(tag).filter(q=>q.card)}catch(e){if(!s.ai||(e&&e.code==='cancelled'))throw e}}
  const rest=n-fromCards.length;
  const base=!s.ai?localItems(s,level,rest):rest?(await run(k=>genPrompt(s,level,k),rest,fromCards.length)).map(tag):[];
  return shuffle([...base,...fromCards]);
}
async function cardPrompt(slots,level,weak){
  const cs=[...new Map(slots.filter(s=>s.card).map(s=>[s.card.id,s.card])).values()];
  const picSub=slots.some(x=>(SUBJ.find(y=>y.name===x.topic)||{}).figOnly);
  const figIds=canVision()&&picSub?[...new Set(cs.flatMap(c=>(c.figs||[]).filter(okFig)))].slice(0,10):[];
  const images=[],sent=[];for(const id of figIds){const im=await figForAI(id);if(im){images.push(im);sent.push(id)}}
  const text=cardPromptText(slots,level,weak,cs,sent);
  return images.length?{text,images}:text;
}
function cardPromptText(slots,level,weak,cs,sent){
  /* แสดงรูปให้ผู้สอบเห็นเฉพาะวิชาที่ต้องดูรูป (มิติสัมพันธ์) วิชาอื่นรูปจากสไลด์มักเฉลยเนื้อหาที่ถามอยู่แล้ว */
  const picSub=slots.some(x=>(SUBJ.find(y=>y.name===x.topic)||{}).figOnly);
  const figLine=c=>{const f=(c.figs||[]).filter(id=>sent.includes(id));return f.length?`\nรูปของบัตรนี้: ${f.map(id=>`${id} (ภาพที่แนบลำดับ ${sent.indexOf(id)+1})`).join(', ')}${c.ansSrc==='AI'?' · เอกสารไม่มีเฉลย ต้องดูรูปและคิดคำตอบเองอย่างรอบคอบ':''}`:''};
  return `สร้างข้อสอบปรนัยใหม่ ${slots.length} ข้อ สำหรับเตรียมสอบเข้าทำงานธนาคารเพื่อการเกษตรและสหกรณ์การเกษตร (ธ.ก.ส.)
${level?`ระดับความยาก ${level}: ${levelTxt(level)}`:'ระดับข้อสอบจริง'}
รหัสชุด ${Math.random().toString(36).slice(2,8)} (ใช้เพื่อให้โจทย์ไม่ซ้ำกับชุดก่อน)
สร้างตามรายการนี้ตามลำดับ:
${slots.map((s,i)=>`ข้อ ${i+1}: หัวข้อ ${s.topic||'-'} · ${s.card?`ใช้บัตร ${s.card.id}`:'ไม่มีบัตร ใช้หลักการมาตรฐานที่เป็นที่ยอมรับทั่วไป ห้ามแต่งตัวเลขหรือข้อเท็จจริงเฉพาะที่ไม่แน่ใจ'}`).join('\n')}

บัตรความรู้ (ระบบย่อยไว้จากเอกสารที่ผู้ใช้อัปโหลด):
${cs.map(c=>`[${c.id}] ${c.topic} · ${c.kind} · ${c.title}\n${c.fact}${figLine(c)}`).join('\n\n')||'-'}
${sent.length?`\nมีภาพแนบ ${sent.length} ภาพ เรียงตามลำดับรหัส: ${sent.join(', ')}\n`:''}
${weak&&weak.length?`\nผู้ทำเคยตอบผิดในโจทย์แนวนี้ ถ้าเกี่ยวข้องให้ถามซ้ำในมุมใหม่:\n- ${weak.join('\n- ')}\n`:''}
กติกา:
${VIZ_RULE}
- ข้อที่ใช้บัตร คำตอบที่ถูกต้องต้องยืนยันได้จากบัตรนั้น ห้ามใช้ข้อเท็จจริงนอกบัตรมาเป็นคำตอบ ใส่ card เป็นรหัสบัตร ข้อที่ไม่มีบัตรใส่ card เป็น ""
- ห้ามลอกประโยคในบัตรมาเป็นโจทย์ ให้ถามว่าเข้าใจจริงไหม ${!level||level>=3?'อย่างน้อยครึ่งหนึ่งเป็นโจทย์สถานการณ์ เช่น กรณีลูกค้าหรือพนักงาน ที่ต้องนำหลักในบัตรไปใช้ตัดสิน':'ถามความหมาย การจำแนก หรือให้เลือกหลักที่ตรงกับกรณีง่ายๆ'}
- ตัวลวงมาจากความเข้าใจผิดที่พบบ่อย หรือจากบัตรอื่นที่คล้ายกัน และต้องผิดชัดเจนเมื่ออ่านบัตร
- ถ้าบัตรเดียวกันถูกใช้หลายข้อ ต้องถามคนละมุม
- ถ้าบัตรเป็นสูตร วิธีคิด หรือเทคนิคทำโจทย์ (เช่น คณิตศาสตร์ อนุกรม เงื่อนไข) ให้สร้างโจทย์ใหม่ที่ต้องใช้วิธีนั้น ใช้ตัวเลขหรือเนื้อหาใหม่ได้ และคำนวณตรวจคำตอบซ้ำก่อนส่ง${sent.length?`
${picSub?`- ห้ามสร้างข้อที่อ่านคำตอบได้จากรูปโดยตรง (เช่น รูปสูตรแล้วถามว่าสูตรใช้ตัวแปรใด) รูปต้องเป็นข้อมูลที่ผู้สอบต้องคิดต่อจึงได้คำตอบ ถ้าบัตรเป็นสูตร ให้ถามโดยไม่แสดงรูป หรือให้ตัวเลขแล้วให้คำนวณ
- เขียน "จากรูป" หรืออ้างถึงรูปได้เฉพาะเมื่อต้องดูรูปจึงตอบได้ (แผนผัง ตาราง กราฟ รูปทรง) ถ้ารูปมีแต่ข้อความ ให้เขียนเนื้อหาที่ต้องใช้ไว้ในโจทย์เป็นข้อความ แล้วให้ fig เป็น ""
- ข้อที่ใช้บัตรที่มีรูป ผู้สอบจะเห็นรูปนั้นในโจทย์ ใส่ fig เป็นรหัสรูปที่ต้องแสดง โจทย์ต้องอ้างถึงรูป (เช่น "จากรูป...") และต้องตอบได้จากรูปจริงที่แนบ ห้ามบรรยายคำตอบไว้ในโจทย์ ห้ามถามสิ่งที่ไม่ปรากฏในรูป`:`- รูปที่แนบมาใช้เพื่อให้คุณเข้าใจเนื้อหาเท่านั้น ผู้สอบจะไม่เห็นรูป ห้ามเขียน "จากรูป" "ตามตาราง" "จากแผนภาพ" หรืออ้างถึงรูป โจทย์ต้องครบในตัวเป็นข้อความ ถ้าต้องใช้ตัวเลขหรือข้อมูลจากรูป ให้เขียนลงในโจทย์ (หรือใส่เป็น viz) และให้ fig เป็น ""`}
- ถ้าตัวเลือกเป็นรูปที่อยู่ในภาพ ให้ choices เป็นป้ายตามที่ปรากฏในภาพ เช่น "ก" "ข" "ค" "ง" หรือ "1" "2" "3" "4" และ answer ต้องตรงกับเฉลยในบัตร ถ้าบัตรไม่มีเฉลยให้วิเคราะห์จากรูปทีละขั้นก่อนตอบ`:''}
- ทุกข้อมีตัวเลือก 4 ตัว ถูกเพียงตัวเดียว คละตำแหน่งคำตอบที่ถูก ห้ามมีข้อที่กำกวม
- เฉลยแต่ละข้อมี 2–4 ขั้น สั้น ภาษาง่าย แต่ละขั้นบอกที่มา (from) เช่น ชื่อกฎหมาย หลักการ หรือ "บัตรความรู้"
- ใช้ภาษาไทย ศัพท์เฉพาะภาษาอังกฤษเขียนได้ ยกเว้นหัวข้อภาษาอังกฤษ ให้โจทย์และตัวเลือกเป็นภาษาอังกฤษแต่เฉลยเป็นไทย ห้ามใช้ markdown ไม่ต้องใส่ ก ข ค ง หน้าตัวเลือก
ตอบเป็น JSON เท่านั้น รูปแบบ:
{"questions":[{"card":"รหัสบัตรหรือว่าง",${sent.length?'"fig":"รหัสรูปหรือว่าง",':''}"topic":"หัวข้อ","stem":"โจทย์","choices":["ตัวเลือก1","ตัวเลือก2","ตัวเลือก3","ตัวเลือก4"],"answer":0,"viz":null,"steps":[{"text":"ขั้นอธิบาย","from":"ที่มา"}]}]}`;
}
