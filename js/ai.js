/* ai.js — เชื่อมต่อ AI (Gemini / OpenAI / Claude API / Meta / Claude ในลิงก์ claude.ai) */
/* ---------- AI connection ---------- */
let SAMPLE=null,aiReady=false,R=null,genCtl=null;
const inViewer=!!window.claude;
/* ผู้ให้บริการแบบ OpenAI-compatible ที่มีโควตาฟรี (ไม่ต้องใช้บัตร) URL ตายตัว ใส่แค่ key กับโมเดล
   ทั้ง 4 เจ้าอนุญาตให้เว็บเรียกตรงได้ (CORS) · ไม่ส่ง response_format (looseJSON แกะ JSON ให้) · ไม่ใช้อ่านรูป */
const OAI_PROVS={
  typhoon:{name:'Typhoon',url:'https://api.opentyphoon.ai/v1',model:'typhoon-v2.5-30b-a3b-instruct',models:['typhoon-v2.5-30b-a3b-instruct'],keyUrl:'https://playground.opentyphoon.ai/settings/api-key',ph:'วาง Typhoon API key',
    note:'โมเดลภาษาไทยของ SCB 10X ฟรี (งานวิจัย) ไม่ต้องใช้บัตร · จำกัด 200 ครั้ง/นาที · เก่งภาษาไทยที่สุดในกลุ่มที่ฟรี · ข้อมูลที่ส่งไปอาจถูกใช้พัฒนาโมเดล',howto:['กดลิงก์ <a href="https://playground.opentyphoon.ai/settings/api-key" target="_blank" rel="noopener">playground.opentyphoon.ai/settings/api-key</a> แล้วสมัครหรือเข้าสู่ระบบ (ใช้บัญชี Google ได้)','ยอมรับข้อตกลงการใช้งานในครั้งแรก','ไปที่เมนู <b>API Key</b> แล้วกดสร้าง key','คัดลอก key มาวางในช่อง Typhoon API key','กด บันทึก แล้วกด ทดสอบ'],tip:'ฟรีเพราะเป็นบริการเพื่องานวิจัยของ SCB 10X ข้อมูลที่ส่งไปอาจถูกใช้พัฒนาโมเดล ถ้าต้องการใช้งานปริมาณมากต้องติดต่อ Typhoon'},
  groq:{name:'Groq',url:'https://api.groq.com/openai/v1',model:'openai/gpt-oss-120b',models:['openai/gpt-oss-120b','openai/gpt-oss-20b','llama-3.3-70b-versatile','qwen/qwen3-32b'],keyUrl:'https://console.groq.com/keys',ph:'gsk_...',
    note:'ฟรีไม่ต้องใช้บัตร · ประมาณ 30 ครั้ง/นาที และ 1,000 ครั้ง/วัน (แล้วแต่โมเดล) · ตอบเร็วมาก',howto:['กดลิงก์ <a href="https://console.groq.com/keys" target="_blank" rel="noopener">console.groq.com/keys</a> แล้วเข้าสู่ระบบ (ใช้บัญชี Google, GitHub หรืออีเมล)','กดปุ่ม <b>Create API Key</b> ตั้งชื่อ เช่น ซ้อมสอบ แล้วกดสร้าง','คัดลอก key (ขึ้นต้นด้วย gsk_) ทันที เพราะระบบให้ดูได้ครั้งเดียว แล้ววางในช่อง Groq API key','กด บันทึก แล้วกด ทดสอบ'],tip:'แบบฟรีไม่ต้องผูกบัตร เพดานนับรายนาทีและรายวันแยกตามโมเดล ดูเพดานจริงได้ที่หน้า Settings → Limits ใน console'},
  openrouter:{name:'OpenRouter',url:'https://openrouter.ai/api/v1',model:'google/gemma-4-31b-it:free',models:['google/gemma-4-31b-it:free','openrouter/free','nvidia/nemotron-3-ultra-550b-a55b:free','google/gemma-4-26b-a4b-it:free'],keyUrl:'https://openrouter.ai/workspaces/default/keys',ph:'sk-or-...',
    note:'ใช้ฟรีเฉพาะโมเดลที่ลงท้าย :free · 50 ครั้ง/วัน (ถ้าเคยเติมเงินครบ $10 ได้ 1,000 ครั้ง/วัน) · openrouter/free = เลือกโมเดลฟรีให้เอง',howto:['กดลิงก์ <a href="https://openrouter.ai/workspaces/default/keys" target="_blank" rel="noopener">openrouter.ai/workspaces/default/keys</a> แล้วเข้าสู่ระบบ (ใช้บัญชี Google หรือ GitHub)','กด <b>New key</b> ตั้งชื่อ (เช่น Exam) ช่อง Expiration และ Credit limit ปล่อยตามเดิมได้ แล้วกด <b>Create</b> (คำเตือนสีเหลืองเรื่องวงเงินไม่มีผล ถ้าไม่ได้เติมเงินไว้ เพราะยอดเงินเป็น 0)','คัดลอก key (ขึ้นต้นด้วย sk-or-) มาวางในช่อง OpenRouter API key','ช่องโมเดลต้องเป็นโมเดลที่ลงท้ายด้วย <b>:free</b> หรือ <b>openrouter/free</b> เท่านั้น โมเดลอื่นคิดเงิน','กด บันทึก แล้วกด ทดสอบ'],tip:'ถ้าทดสอบแล้วขึ้นว่าไม่พบโมเดลที่ตรงกับนโยบายข้อมูล (No endpoints found matching your data policy) ให้ไปที่ หน้าตั้งค่าความเป็นส่วนตัวของ OpenRouter (หน้าเว็บเปลี่ยนบ่อย ลองดูที่ ← Account ด้านซ้ายบน หรือเมนู Guardrails) แล้วเปิดสวิตช์ที่อนุญาตให้ใช้โมเดลฟรีที่อาจนำข้อมูลไปฝึกโมเดล · ถ้าไม่ขึ้นข้อความนี้ ไม่ต้องตั้งอะไร · แบบฟรีได้ 50 ครั้ง/วัน ถ้าเคยเติมเงินครบ $10 เพิ่มเป็น 1,000 ครั้ง/วัน'},
  mistral:{name:'Mistral',paid:true,url:'https://api.mistral.ai/v1',model:'mistral-medium-latest',models:['mistral-medium-latest','mistral-large-latest','mistral-small-latest'],keyUrl:'https://console.mistral.ai/api-keys',ph:'วาง Mistral API key',
    note:'ต้องอัปเกรดเป็นแพ็กเกจเสียเงินก่อน (แพ็กเกจฟรีสร้าง key ได้แต่ใช้ API ไม่ได้)',howto:['กดลิงก์ <a href="https://console.mistral.ai/api-keys" target="_blank" rel="noopener">console.mistral.ai</a> แล้วสมัครหรือเข้าสู่ระบบ','กด <b>Upgrade</b> เลือกแพ็กเกจเสียเงินและผูกบัตร (แพ็กเกจ Free ใช้ API ไม่ได้)','ไปที่ <b>API Keys</b> กด <b>New key</b> ตั้งชื่อ แล้วกดสร้าง','คัดลอก key ทันที เพราะระบบให้ดูได้ครั้งเดียว แล้ววางในช่อง Mistral API key','กด บันทึก แล้วกด ทดสอบ'],tip:'คิดเงินตามการใช้งาน ถ้าต้องการแบบฟรี ใช้ Typhoon, Groq หรือ OpenRouter แทน'}};
let AIP={provider:'auto',gemini:{key:'',model:'gemini-flash-latest'},openai:{key:'',model:'gpt-5-mini'},anthropic:{key:'',model:'claude-opus-5-5'},meta:{key:'',model:'muse-spark-1.3'},
  /* custom = ผู้ให้บริการแบบ OpenAI-compatible ที่ใส่ URL เอง (OpenRouter, DeepSeek, Typhoon, Groq, Ollama/LM Studio ในเครื่อง) key ว่างได้ */
  custom:{key:'',model:'',url:'',vision:false},
  ...Object.fromEntries(Object.entries(OAI_PROVS).map(([p,o])=>[p,{key:'',keys:[],model:o.model}])),
  /* proc = AI สำหรับประมวลผลไฟล์ (อ่านภาพหน้า ย่อยบัตร ดึงข้อสอบ เทียบเนื้อหา) แยกจากตัวออกข้อสอบ เพื่อใช้โมเดลถูกกว่า · provider 'same' = ผู้ให้บริการเดียวกับตัวหลัก */
  proc:{provider:'same',model:''}};
const mergeAIP=a=>({...AIP,...a,gemini:{...AIP.gemini,...(a.gemini||{})},openai:{...AIP.openai,...(a.openai||{})},anthropic:{...AIP.anthropic,...(a.anthropic||{})},meta:{...AIP.meta,...(a.meta||{})},custom:{...AIP.custom,...(a.custom||{})},...Object.fromEntries(Object.keys(OAI_PROVS).map(p=>[p,{...AIP[p],...(a[p]||{})}])),proc:{...AIP.proc,...(a.proc||{})}});
try{const a=JSON.parse(localStorage.getItem('exam-drill-ai')||'null');if(a)AIP=mergeAIP(a)}catch(e){}
/* ตั้งค่า AI (รวม key) ผูกกับบัญชี: เก็บที่ users/{uid}/qlog/aiset (กฎเดียวกับบันทึกโจทย์ อ่าน/เขียนได้เฉพาะเจ้าของ) ล็อกอินเครื่องไหนก็ได้ key ชุดเดียวกัน */
const AIP_AT='exam-drill-ai-at';
/* key รวมกันข้ามเครื่อง (ไม่ใช่เครื่องล่าสุดทับทั้งชุด): KT จำเวลาเพิ่ม/ลบของแต่ละ key
   key อยู่ต่อเมื่อเวลาเพิ่มล่าสุด >= เวลาลบล่าสุด · ลบในเครื่องไหนก็หายทุกเครื่อง ใส่กลับมาใหม่ก็กลับมาทุกเครื่อง */
const AIP_KT='exam-drill-ai-kt';
let KT={add:{},del:{}};try{KT={...KT,...JSON.parse(localStorage.getItem(AIP_KT)||'{}')}}catch(e){}
const saveKT=()=>{try{localStorage.setItem(AIP_KT,JSON.stringify(KT))}catch(e){}};
const keysIn=c=>c?[...new Set((Array.isArray(c.keys)?c.keys:[c.key]).map(k=>String(k||'').trim()).filter(Boolean))]:[];
const keyAlive=(k,kt=KT)=>((kt.add||{})[k]||0)>=((kt.del||{})[k]||0);
const ktMerge=(a,b)=>{const o={add:{...a.add},del:{...a.del}};for(const t of ['add','del'])for(const [k,v] of Object.entries(b&&b[t]||{}))o[t][k]=Math.max(o[t][k]||0,+v||0);return o};
const ktSig=kt=>JSON.stringify(['add','del'].map(t=>Object.entries(kt&&kt[t]||{}).sort()));
/* base = ฝั่งที่ตั้งค่าใหม่กว่า (ผู้ให้บริการ โมเดล ฯลฯ) · key = รวมทั้งสองฝั่ง ตัดตัวที่ถูกลบ */
function aipMerge(base,other,kt){const out=mergeAIP(base);
  for(const p of KEY_PROVS){if(!out[p])continue;const ks=[...new Set([...keysIn(base[p]),...keysIn(other&&other[p])])].filter(k=>keyAlive(k,kt));
    out[p]={...out[p],keys:ks,key:ks.includes(out[p].key)?out[p].key:ks[0]||''}}
  return out}
/* เทียบโดยไม่สน key ที่ใช้อยู่ (สลับไปมาทุกคำขอ) */
const aipSig=a=>JSON.stringify(a,(k,v)=>k==='key'?undefined:v);
const saveAI=(push=true)=>{
  if(push){let old={};try{old=JSON.parse(localStorage.getItem('exam-drill-ai')||'{}')}catch(e){}const now=Date.now();
    for(const p of KEY_PROVS){const a=keysIn(old[p]),b=keysIn(AIP[p]);for(const k of b)if(!a.includes(k)||!keyAlive(k))KT.add[k]=now;for(const k of a)if(!b.includes(k))KT.del[k]=now}saveKT()}
  try{localStorage.setItem('exam-drill-ai',JSON.stringify(AIP));if(push)localStorage.setItem(AIP_AT,String(Date.now()))}catch(e){}if(push)pushAIP()};
/* สถานะการซิงก์ แสดงในหน้าตั้งค่า AI */
const AISYNC={msg:'',bad:false};
const aiSyncMsg=(m,bad)=>{AISYNC.msg=m;AISYNC.bad=!!bad;const e=document.getElementById('aisync');if(e){e.textContent=m;e.className='hint '+(bad?'err':'ok')}};
const syncErr=e=>{const c=String(e&&e.code||e&&e.message||e);return c==='permission-denied'?'ฐานข้อมูลไม่อนุญาต (ลองออกจากระบบแล้วเข้าใหม่)':c==='unavailable'?'เชื่อมต่อฐานข้อมูลไม่ได้ ตรวจอินเทอร์เน็ต':c.slice(0,80)};
async function pushAIP(){
  if(typeof ME==='undefined'||!ME){aiSyncMsg('ยังไม่ได้เข้าสู่ระบบ ตั้งค่า AI เก็บไว้แค่ในเครื่องนี้');return false}
  try{const f=await fb(),ref=fsDoc('users',ME.uid,'qlog','aiset'),s=await f.fs.getDoc(ref);let at=+(localStorage.getItem(AIP_AT)||Date.now());
    /* อ่านของบัญชีก่อน แล้วรวม key ที่เครื่องอื่นเพิ่มไว้ ไม่ให้เครื่องนี้ทับหาย */
    if(s.exists()){const d=s.data();KT=ktMerge(KT,d.kt);saveKT();aipApply(d.at>at?aipMerge(aipParse(d),AIP,KT):aipMerge(AIP,aipParse(d),KT));at=Math.max(at,+d.at||0)}
    await f.fs.setDoc(ref,{aip:JSON.stringify(AIP),at,kt:KT});
    aiSyncMsg(`☁ บันทึกตั้งค่า AI ไว้กับบัญชี ${ME.email||ME.name} แล้ว (${fmtDate(Date.now())}) ${aiKeyCount()} · เครื่องอื่นที่ล็อกอินบัญชีนี้ได้ key ชุดเดียวกันทันที`);return true}
  catch(e){aiSyncMsg('ส่งตั้งค่า AI ขึ้นบัญชีไม่สำเร็จ: '+syncErr(e),true);return false}
}
const aipParse=d=>{try{return JSON.parse(d.aip||'{}')}catch(e){return{}}};
const aiKeyCount=()=>{const n=KEY_PROVS.reduce((a,p)=>a+keysOf(p).length,0);return `(key ทั้งหมด ${n} ตัว)`};
/* ใช้ผลรวมกับเครื่องนี้ · คืน true ถ้ามีอะไรเปลี่ยน */
function aipApply(m){if(aipSig(m)===aipSig(AIP))return false;const before=KEY_PROVS.reduce((a,p)=>a+keysOf(p).length,0);
  /* กำลังพิมพ์ในหน้าตั้งค่า AI: ไม่วาดหน้าใหม่ (ข้อความที่ยังไม่บันทึกจะหาย) แค่อัปเดตป้าย key ที่ได้มารวมตอนกดบันทึก */
  const typing=document.activeElement&&document.activeElement.closest&&document.activeElement.closest('#aibody');
  AIP=m;saveAI(false);if(typing)renderAISetPill();else renderAISet();aiChanged();const n=KEY_PROVS.reduce((a,p)=>a+keysOf(p).length,0);
  if(n>before)toast(`ได้ key เพิ่ม ${n-before} ตัวจากเครื่องอื่นในบัญชีนี้`);return true}
async function aipFromRemote(s,first){
  const localAt=+(localStorage.getItem(AIP_AT)||0),hasLocal=KEY_PROVS.some(provReady);
  if(!s.exists()){if(hasLocal)await pushAIP();else aiSyncMsg(`บัญชี ${ME.email||ME.name} ยังไม่มีตั้งค่า AI ที่บันทึกไว้ ใส่ key แล้วกด บันทึก ในเครื่องที่มี key`,true);return}
  const d=s.data(),r=aipParse(d);KT=ktMerge(KT,d.kt);saveKT();
  const m=(+d.at>localAt||!hasLocal)?aipMerge(r,AIP,KT):aipMerge(AIP,r,KT);
  const got=aipApply(m);try{localStorage.setItem(AIP_AT,String(Math.max(localAt,+d.at||0)))}catch(e){}
  if(got&&first&&activeAI())toast(`ใช้ตั้งค่า AI จากบัญชีของคุณ (${AINAME[activeAI()]})`);
  /* บัญชียังขาด key ที่เครื่องนี้มี ยังมี key ที่ถูกลบแล้ว หรือยังไม่มีบันทึกเพิ่ม/ลบ → ส่งขึ้นไปรวม */
  if(aipSig(mergeAIP(m))!==aipSig(mergeAIP(r))||ktSig(KT)!==ktSig(d.kt))await pushAIP();
  else aiSyncMsg(`☁ ตั้งค่า AI ตรงกับบัญชี ${ME.email||ME.name} แล้ว ${aiKeyCount()}`);
}
/* ฟังการเปลี่ยนแปลงสด: เพิ่ม/ลบ key ในเครื่องหนึ่ง เครื่องอื่นที่เปิดเว็บอยู่ได้ทันทีโดยไม่ต้องโหลดหน้าใหม่ */
let AIP_UNSUB=null;
async function pullAIP(){
  if(!ME)return;
  try{
    const f=await fb(),ref=fsDoc('users',ME.uid,'qlog','aiset');await aipFromRemote(await f.fs.getDoc(ref),true);
    if(AIP_UNSUB)AIP_UNSUB();const uid=ME.uid;
    AIP_UNSUB=f.fs.onSnapshot(ref,s=>{if(s.metadata.hasPendingWrites||!ME||ME.uid!==uid)return;aipFromRemote(s,false).catch(()=>{})},()=>{});
  }catch(e){aiSyncMsg('ดึงตั้งค่า AI จากบัญชีไม่สำเร็จ: '+syncErr(e),true)}
}
const AINAME={claude:'Claude',gemini:'Gemini',openai:'OpenAI',anthropic:'Claude API',meta:'Meta',typhoon:'Typhoon',groq:'Groq',openrouter:'OpenRouter',mistral:'Mistral',custom:'ผู้ให้บริการอื่น',local:'AI ในเครื่อง'};
/* AI ในเครื่องนี้ (Ollama / LM Studio) สำหรับประมวลผลไฟล์: ตั้งเฉพาะเครื่องนี้ ไม่ซิงก์กับบัญชี เพราะ localhost ของเครื่องอื่นไม่ใช่เครื่องนี้
   เครื่องที่เปิดไว้ = เครื่องประมวลผลหลัก รับไฟล์ที่รอประมวลผลของทั้งบัญชีมาทำ (ดู hostTick ใน sync.js) */
/* vision ปิดไว้ก่อน: เทส gemma3:12b ถอดภาษาไทยจากภาพผิดจนความหมายเปลี่ยน (ด้อย→ด้วย) หน้าที่ต้องอ่านภาพจึงส่งให้ AI ตัวหลักแทน */
let LLMHOST={on:false,url:'http://localhost:11434/v1',model:'gemma3:12b',vision:false};
try{const h=JSON.parse(localStorage.getItem('exam-llm-host')||'null');if(h)LLMHOST={...LLMHOST,...h}}catch(e){}
const saveHost=()=>{try{localStorage.setItem('exam-llm-host',JSON.stringify(LLMHOST))}catch(e){}};
const LOCALAI={up:false,why:'',models:[]};
const baseURL=u=>String(u||'').trim().replace(/\/+$/,'').replace(/\/chat\/completions$/,'');
const chatURL=u=>baseURL(u)+'/chat/completions';
async function pingLocal(){
  if(!LLMHOST.on){LOCALAI.up=false;LOCALAI.why='';return false}
  try{const r=await fetch(baseURL(LLMHOST.url)+'/models',{signal:AbortSignal.timeout(5000)});const d=await r.json();
    LOCALAI.models=(d.data||[]).map(m=>String(m.id));LOCALAI.up=r.ok&&LOCALAI.models.includes(LLMHOST.model);
    LOCALAI.why=LOCALAI.up?'':`ไม่พบโมเดล ${LLMHOST.model} (มี: ${LOCALAI.models.join(', ')||'-'})`}
  catch(e){LOCALAI.up=false;LOCALAI.why='เชื่อมต่อ AI ในเครื่องไม่ได้ (โปรแกรม Ollama ยังไม่เปิด หรือยังไม่ได้อนุญาตให้เว็บเรียก)'}
  return LOCALAI.up;
}
const localUp=()=>!!(LLMHOST.on&&LOCALAI.up);
const cfgOf=prov=>prov==='local'?LLMHOST:AIP[prov];
const KEY_PROVS=['gemini','openai','anthropic','meta',...Object.keys(OAI_PROVS),'custom'];
/* หลาย key ต่อผู้ให้บริการ (ไม่จำกัด): AIP[p].keys = ทุก key, AIP[p].key = key ที่ใช้อยู่ตอนนี้
   key ที่โควตา/เครดิตหมดพัก 30 นาที · ถูกจำกัดความถี่พัก 1 นาที · key ผิดพักจนกว่าจะแก้ key
   ระบบสลับไป key ถัดไปของผู้ให้บริการเดียวกันก่อน ครบทุก key แล้วจึงเปลี่ยนไปผู้ให้บริการอื่น (aiText) */
const keysOf=p=>{const c=AIP[p];if(!c)return[];const ks=Array.isArray(c.keys)?c.keys:[c.key];return [...new Set(ks.map(k=>String(k||'').trim()).filter(Boolean))]};
const KEY_DOWN={},KEY_SWITCH=['quota','no_credit','bad_key','rate_limited'];
const KEY_WHY={};
const liveKeys=p=>{const now=Date.now();return keysOf(p).filter(k=>!(KEY_DOWN[k]>now))};
/* ใช้ key ที่ยังไม่พัก (ถ้าพักหมดใช้ตัวแรก) */
const pickKey=p=>{const c=AIP[p];if(!c)return'';const k=liveKeys(p)[0]||keysOf(p)[0]||'';if(k)c.key=k;return k};
for(const p of KEY_PROVS)if(AIP[p]&&!Array.isArray(AIP[p].keys))AIP[p].keys=AIP[p].key?[AIP[p].key]:[];
const provReady=p=>p==='custom'?!!(AIP.custom.url&&AIP.custom.model):keysOf(p).length>0;
/* ผู้ให้บริการ+โมเดลที่ใช้กับงานนั้น: task 'proc' (ประมวลผลไฟล์) ใช้ตัวที่ตั้งแยกไว้ถ้าตั้งไว้ ไม่งั้นใช้ตัวหลัก */
function aiRoute(task){
  /* PROC_CLOUD: ไฟล์ที่ส่งต่อให้คลาวด์ (หน้าภาพ / AI ในเครื่องย่อยไม่ได้) ใช้ AI ตัวหลักแม้เครื่องนี้มี AI ในเครื่อง */
  if(task==='proc'&&localUp()&&!(typeof PROC_CLOUD!=='undefined'&&PROC_CLOUD))return{p:'local',model:LLMHOST.model};
  if(task==='proc'&&!inViewer){const q=AIP.proc||{};
    if(q.provider&&q.provider!=='same'&&provReady(q.provider))return{p:q.provider,model:q.model||(q.provider==='custom'?AIP.custom.model:AIP[q.provider].model)};
    const p=activeAI();if(p&&q.model&&p!=='claude')return{p,model:q.model};}
  return{p:activeAI(),model:''};
}
const visionOK=p=>p==='local'?!!LLMHOST.vision:!!p&&p!=='claude'&&!OAI_PROVS[p]&&(p!=='custom'||!!AIP.custom.vision);
function activeAI(){
  if(inViewer)return SAMPLE?'claude':null;
  const p=AIP.provider;
  if(p==='auto')return KEY_PROVS.find(provReady)||null;
  return provReady(p)?p:null;
}
function normTurns(input){
  const arr=typeof input==='string'?[{role:'user',content:input}]:input,out=[];
  for(const t of arr){const r=t.role==='assistant'?'assistant':'user',last=out[out.length-1];if(last&&last.role===r&&typeof last.content==='string'&&typeof t.content==='string')last.content+='\n\n'+t.content;else out.push({role:r,content:t.content})}
  return out;
}
async function httpFail(res){
  let msg='';try{msg=await res.text()}catch(e){}
  const bad=res.status===401||res.status===403||(res.status===400&&/API[_ ]?key/i.test(msg));
  if(/credit balance|insufficient_quota|payment required/i.test(msg)||res.status===402)throw{code:'no_credit',message:msg.slice(0,300)};
  if(res.status===429&&/quota|RESOURCE_EXHAUSTED|exceeded your current|per day|RPD|TPD|daily|free-models-per-day/i.test(msg))throw{code:'quota',message:msg.slice(0,300)};
  throw{code:bad?'bad_key':res.status===404?'bad_model':res.status===429?'rate_limited':(res.status>=500||/overloaded|high demand|UNAVAILABLE/i.test(msg))?'overloaded':'upstream_error',message:msg.slice(0,300)};
}
const GEMINI_FALLBACK=['gemini-flash-latest','gemini-flash-lite-latest','gemini-3.8-flash','gemini-3.5-flash-lite'];
/* โมเดลที่ Google เลิกให้ใช้แล้ว (ตอบ 404) จำไว้ ไม่ต้องลองซ้ำทุกครั้ง */
const DEAD_MODELS=new Set();
let LAST_MODEL='';
const sleep=(ms,signal)=>new Promise((ok,no)=>{const t=setTimeout(ok,ms);if(signal)signal.addEventListener('abort',()=>{clearTimeout(t);no({code:'cancelled'})},{once:true})});
/* Gemini/OpenRouter: โควตานับแยกต่อโมเดล → key ที่โควตาโมเดลหลักหมด ยังใช้โมเดลสำรองได้ จึงพักเฉพาะคู่ key+โมเดล (KEY_MDOWN) */
const KEY_MDOWN={},KEY_RR={};
const perModel=(prov,code)=>(prov==='gemini'||prov==='openrouter')&&(code==='quota'||code==='rate_limited');
const keyDown=(prov,k,model,code)=>{const until=Date.now()+(code==='bad_key'?864e5:code==='rate_limited'?60e3:30*60e3);
  if(perModel(prov,code))KEY_MDOWN[k+'|'+model]=until;else KEY_DOWN[k]=until;KEY_WHY[k]=code};
const keyModelDown=(k,model)=>KEY_MDOWN[k+'|'+model]>Date.now();
/* โมเดลที่ตอบช้าผิดปกติ (เกินเวลา) จำไว้ 10 นาที แล้วย้ายไปลองท้ายสุด ไม่ให้ทุกคำขอต้องรอจนหมดเวลาซ้ำ */
const SLOW_M={};
/* ลำดับโมเดล: ตัวที่เพิ่งตอบสำเร็จ (10 นาที) ก่อน → ตัวที่ไม่ช้า → ตัวที่ช้า (ตัวที่ถูกพักนานสุดแล้วลองก่อน) */
const GOOD_M={};
const slowLast=(prov,ms)=>{const now=Date.now(),sl=m=>SLOW_M[prov+':'+m]>now?SLOW_M[prov+':'+m]:0,gd=m=>GOOD_M[prov+':'+m]>now?1:0;
  return ms.slice().sort((a,b)=>gd(b)-gd(a)||(!!sl(a))-(!!sl(b))||sl(a)-sl(b))};
const modelsOf=(prov,first)=>slowLast(prov,prov==='gemini'?[first,...GEMINI_FALLBACK.filter(m=>m!==first)]:prov==='openrouter'&&first!=='openrouter/free'?[first,'openrouter/free']:[first]).filter(m=>!DEAD_MODELS.has(prov+':'+m));
/* หลาย key: วนสลับ key ทุกคำขอ (กระจายโควตา) · ลองทุก key กับโมเดลหลักก่อน แล้วค่อยลดไปโมเดลสำรอง */
/* งานที่ผู้ใช้รออยู่ (สร้างโจทย์ ติวเตอร์): Gemini ยิงทีละ key แบบไล่ขั้น และรอไปพร้อมกัน
   รอบแรก: key ไหนไม่ตอบใน 10 วินาที → ยิง key ถัดไปทันที (key เดิมยังรอต่อ ไม่ทิ้ง) วนจนครบทุก key
   รอบสอง: ห่างกัน 20 วินาที รอบสาม 40 · ตัวไหนตอบก่อนใช้ตัวนั้น แล้วยกเลิกที่เหลือ · key ที่ล้มเร็ว (โควตาหมด/ใช้ไม่ได้) ยิงตัวถัดไปทันที
   โมเดลที่ช้าเกินเวลากับ 2 key = โมเดลค้าง ย้ายไปโมเดลสำรองและพักไว้ 10 นาที · ยิงพร้อมกันไม่เกิน 8 คำขอ (ให้ทุกโมเดลได้ลองก่อนต้องรอคำขอที่ค้าง) */
const FAST_ROUNDS=[10,20,40],FAST_MAX=8;
let SLOW_TOAST=0;
/* AI ตัวอื่นที่ใส่ key ไว้แล้ว (ฟรี) ใช้เป็นตัวสำรองตอน Gemini ช้า เรียงตามความเร็วที่วัดได้: Groq → OpenRouter → อื่นๆ → Typhoon */
const ALT_ORDER=['groq','openrouter'],ALT_LAST=['typhoon'];
const altProvs=()=>{const free=Object.keys(OAI_PROVS).filter(p=>!OAI_PROVS[p].paid&&provReady(p)&&liveKeys(p).length);
  return [...ALT_ORDER.filter(p=>free.includes(p)),...free.filter(p=>!ALT_ORDER.includes(p)&&!ALT_LAST.includes(p)),...ALT_LAST.filter(p=>free.includes(p))]};
const PROV_GOOD={};
function slowNotice(){
  /* มี AI ตัวอื่นให้สลับอยู่แล้ว = สลับเงียบๆ ไม่ต้องเตือน · ไม่มีเลยจึงบอกสั้นๆ ไม่เกิน 30 นาทีครั้ง */
  const now=Date.now();if(altProvs().length||now-SLOW_TOAST<30*60000||typeof toast!=='function')return;SLOW_TOAST=now;
  toast('Gemini ตอบช้า · ใส่ key AI ตัวอื่นในตั้งค่า AI จะเร็วขึ้น');
}
function gemFast(input,json,signal,model0){
  const first=model0||AIP.gemini.model,ks=keysOf('gemini'),alts=altProvs();
  const rr=(KEY_RR.gemini=((KEY_RR.gemini||0)+1)%Math.max(1,ks.length)),ring=[...ks.slice(rr),...ks.slice(0,rr)];
  /* ลำดับยิง: Gemini key แรก → ไม่ตอบใน 10 วิ ยิง AI ตัวอื่นที่มี key (Groq ฯลฯ) → Gemini key ถัดไป · รอบสอง/สามเว้นระยะ 20/40 วิ
     ถ้า Gemini ช้าอยู่ (ทุกโมเดลถูกพัก) และ AI ตัวอื่นเพิ่งตอบได้ภายใน 10 นาที ให้ยิงตัวนั้นก่อนเลย */
  const now=Date.now(),gemSlow=modelsOf('gemini',first).every(m=>SLOW_M['gemini:'+m]>now);
  const good=alts.filter(p=>PROV_GOOD[p]>now),slots=[];
  for(const gap of FAST_ROUNDS){
    const gem=ring.map(k=>({p:'gemini',k,gap})),alt=alts.map(p=>({p,k:liveKeys(p)[0],gap}));
    if(gap===FAST_ROUNDS[0]&&gemSlow&&good.length)slots.push(...alt.filter(x=>good.includes(x.p)),...gem.slice(0,1),...alt.filter(x=>!good.includes(x.p)),...gem.slice(1));
    else slots.push(...gem.slice(0,1),...alt,...gem.slice(1));
  }
  return new Promise((resolve,reject)=>{
    const ctls=new Set(),late={},pend={};let done=false,i=0,inflight=0,err=null,timer=null;
    const finish=(ok,v)=>{if(done)return;done=true;clearTimeout(timer);for(const c of ctls)c.abort();if(signal)signal.removeEventListener('abort',onAb);ok?resolve(v):reject(v)};
    const onAb=()=>finish(false,{code:'cancelled'});
    if(signal){if(signal.aborted){reject({code:'cancelled'});return}signal.addEventListener('abort',onAb,{once:true})}
    const next=()=>{
      clearTimeout(timer);if(done)return;
      while(i<slots.length&&(!slots[i].k||KEY_DOWN[slots[i].k]>Date.now()))i++;
      if(i>=slots.length||inflight>=FAST_MAX){if(!inflight)finish(false,err||{code:'overloaded'});return}   /* ไม่มี key ให้ยิงเพิ่ม: รอคำขอที่ค้างอยู่ */
      const s=slots[i++];let model;
      if(s.p==='gemini'){
        /* กระจายโมเดล: เลือกตัวแรกตามลำดับที่ยังมีคำขอค้างน้อยที่สุดในรอบนี้ ไม่ยิงซ้ำโมเดลเดียวที่ค้างอยู่ */
        const ms=modelsOf('gemini',first).filter(m=>!keyModelDown(s.k,m));
        model=ms.reduce((b,m)=>b==null||(pend[m]||0)<(pend[b]||0)?m:b,null);
      }else model=cfgOf(s.p).model||(OAI_PROVS[s.p].models||[])[0]||'';
      if(!model){next();return}
      launch(s,model);
      timer=setTimeout(()=>{if(s.p==='gemini'){late[model]=(late[model]||0)+1;if(late[model]>=Math.min(2,ks.length)){SLOW_M['gemini:'+model]=Date.now()+10*60000;delete GOOD_M['gemini:'+model]}}slowNotice();next()},s.gap*1000);
    };
    const launch=(s,model)=>{
      const c=new AbortController(),pk=s.p+':'+model;ctls.add(c);inflight++;pend[model]=(pend[model]||0)+1;AIP[s.p].key=s.k;   /* key ถูกอ่านตอนสร้างคำขอทันที (ก่อน await แรก) */
      keyCallOnce(s.p,model,input,json,c.signal).then(t=>{LAST_MODEL=model;LAST_AI=s.p;delete KEY_WHY[s.k];delete SLOW_M[pk];
        if(s.p==='gemini')GOOD_M[pk]=Date.now()+10*60000;else PROV_GOOD[s.p]=Date.now()+10*60000;finish(true,t)},e=>{
        ctls.delete(c);inflight--;pend[model]--;if(done)return;
        if(e&&typeof e==='object'){e.prov=s.p;e.model=model;
          if(s.p!=='gemini'){if(KEY_SWITCH.includes(e.code))keyDown(s.p,s.k,model,e.code);delete PROV_GOOD[s.p]}   /* ตัวสำรองล้ม (รวมคำตอบยาวเกิน): รอตัวอื่นต่อ */
          else if(e.code==='bad_model'){if(model!==first)DEAD_MODELS.add(pk)}
          else if(KEY_SWITCH.includes(e.code))keyDown('gemini',s.k,model,e.code);
          else if(e.code==='overloaded'){SLOW_M[pk]=Date.now()+10*60000;delete GOOD_M[pk]}
          else if(!['network','empty_completion','upstream_error'].includes(e.code)){finish(false,e);return}   /* truncated ฯลฯ: ผู้เรียกจัดการเอง (แบ่งงานให้เล็กลง) */
        }
        if(!err||(e&&e.code==='truncated'))err=e;next();   /* ล้มเร็ว: ยิงตัวถัดไปทันที ไม่ต้องรอครบเวลา */
      });
    };
    next();
  });
}
async function keyCall(prov,input,json,signal,model0,o={}){
  if(o.fast&&prov==='gemini'&&keysOf('gemini').length)return gemFast(input,json,signal,model0);
  const ks=prov==='local'?[]:keysOf(prov);
  if(ks.length<2)return keyCall1(prov,input,json,signal,model0);
  const rr=(KEY_RR[prov]=((KEY_RR[prov]||0)+1)%ks.length),ring=[...ks.slice(rr),...ks.slice(0,rr)];
  let err,modelErr;
  for(const model of modelsOf(prov,model0||cfgOf(prov).model)){
    const now=Date.now(),live=ring.filter(k=>!(KEY_DOWN[k]>now)&&!keyModelDown(k,model));
    for(const k of live){AIP[prov].key=k;
      try{const t=await keyCall1(prov,input,json,signal,model,true);delete KEY_WHY[k];return t}
      catch(e){if(!e)throw e;
        if(e.code==='bad_model'){modelErr=e;if(prov==='gemini'&&model!==(model0||cfgOf(prov).model))DEAD_MODELS.add(prov+':'+model);break}
        if(e.code==='overloaded'){err=err||e;break}
        if(!KEY_SWITCH.includes(e.code))throw e;err=e;keyDown(prov,k,model,e.code)}
    }
  }
  /* ทุก key ถูกพักหมด: ลอง key แรกตรงๆ อีกครั้ง (เวลาพักอาจนานกว่าที่ผู้ให้บริการกำหนดจริง) */
  if(!err&&!modelErr){AIP[prov].key=ring[0];return keyCall1(prov,input,json,signal,model0)}
  throw err||modelErr;
}
async function keyCall1(prov,input,json,signal,model0,only){
  const first=model0||cfgOf(prov).model;
  /* OpenRouter: โมเดลฟรีตัวที่ตั้งไว้ถูกจำกัด (คนใช้เยอะ) → ใช้ openrouter/free ที่เลือกโมเดลฟรีที่ว่างให้เอง */
  const models=only?[first]:modelsOf(prov,first);
  let lastErr,keyErr;
  for(const model of models){
    for(let attempt=0;attempt<3;attempt++){
      try{if(prov!=='local'&&keysOf(prov).length===1)AIP[prov].key=keysOf(prov)[0];const t=await keyCallOnce(prov,model,input,json,signal);LAST_MODEL=model;return t}
      catch(e){lastErr=e;if(e&&typeof e==='object'){e.prov=prov;e.model=model}
        if(e.code==='bad_model'&&prov==='gemini'&&model!==first)DEAD_MODELS.add(prov+':'+model);
        if(e.code!=='bad_model')keyErr=keyErr||e;
        if(e.slow)break;
        if(e.code==='overloaded'||e.code==='network'&&attempt===0){await sleep(1500*(attempt+1),signal);continue}
        if(e.code==='bad_model'||((e.code==='rate_limited'||e.code==='quota')&&(prov==='gemini'||prov==='openrouter')))break;
        throw e;
      }
    }
  }
  throw keyErr||lastErr||{code:'bad_model'};
}
/* Claude API: ใช้ SDK ทางการของ Anthropic (โหลดจาก CDN ครั้งแรกที่ใช้) key อยู่ในเบราว์เซอร์ของผู้ใช้เอง */
const ANTH_SDK='https://cdn.jsdelivr.net/npm/@anthropic-ai/sdk@0.132.0/+esm';
/* โมเดลที่รองรับ fallbacks ฝั่งเซิร์ฟเวอร์: ถ้าโมเดลปฏิเสธคำขอ ระบบของ Anthropic ส่งต่อให้โมเดลอื่นทำในคำขอเดียวกัน */
const ANTH_FALLBACK=['claude-fable-5-1','claude-opus-5-5','claude-opus-5','claude-sonnet-5-5'];
let ANTH=null;
async function anthClient(){
  if(!ANTH||ANTH.key!==AIP.anthropic.key){
    let mod;try{mod=await import(ANTH_SDK)}catch(e){throw{code:'network',message:'โหลดตัวเชื่อม Claude ไม่ได้'}}
    const Anthropic=mod.default||mod.Anthropic;
    ANTH={key:AIP.anthropic.key,c:new Anthropic({apiKey:AIP.anthropic.key,dangerouslyAllowBrowser:true,maxRetries:2})};
  }
  return ANTH.c;
}
async function anthCall(model,turns,signal,json){
  const c=await anthClient(),fb=ANTH_FALLBACK.includes(model);
  const messages=turns.map(t=>({role:t.role,content:typeof t.content==='string'?t.content:[...t.content.images.map(i=>({type:'image',source:i.url?{type:'url',url:i.url}:{type:'base64',media_type:i.mime,data:i.data}})),{type:'text',text:t.content.text}]}));
  const params={model,max_tokens:64000,messages,...(fb?{betas:['server-side-fallback-2026-07-01'],fallbacks:'default'}:{})};
  let msg;
  try{msg=await (fb?c.beta.messages:c.messages).stream(params,{signal}).finalMessage()}
  catch(e){
    if(signal&&signal.aborted)throw{code:'cancelled'};
    const s=e&&e.status;if(!s)throw{code:'network',message:String(e&&e.message||e)};
    if(/credit balance|billing/i.test(String(e.message||''))||s===402)throw{code:'no_credit',message:String(e.message||'').slice(0,300)};
    if(s===429&&/quota/i.test(String(e.message||'')))throw{code:'quota',message:String(e.message||'').slice(0,300)};
    throw{code:s===401||s===403?'bad_key':s===404?'bad_model':s===429?'rate_limited':s>=500?'overloaded':'upstream_error',message:String(e.message||'').slice(0,300)};
  }
  if(msg.stop_reason==='refusal')throw{code:'refused'};
  if(json&&msg.stop_reason==='max_tokens')throw{code:'truncated'};
  return msg.content.filter(b=>b.type==='text').map(b=>b.text).join('');
}
const AI_TMO={local:360000};
const gemBody=(turns,json)=>JSON.stringify({contents:turns.map(t=>({role:t.role==='assistant'?'model':'user',parts:typeof t.content==='string'?[{text:t.content}]:[{text:t.content.text},...t.content.images.map(i=>i.url?{file_data:{mime_type:i.mime,file_uri:i.url}}:{inline_data:{mime_type:i.mime,data:i.data}})]})),...(json?{generationConfig:{responseMimeType:'application/json'}}:{})});
async function keyCallOnce(prov,model,input,json,signal){
  /* จำกัดเวลาต่อคำขอ: บางช่วงโมเดลหลักของ Gemini ค้างฝั่ง Google ไม่ตอบเลย (เคยรอเกิน 5 นาที) → หมดเวลาแล้วสลับไปโมเดลสำรอง
     AI ในเครื่อง: หมดเวลา = ถือว่าคำตอบยาวเกิน ให้ aiWin แบ่งช่วงครึ่งหนึ่งแล้วทำใหม่ */
  const ms=AI_TMO[prov]||(json?75000:60000),tsig=AbortSignal.timeout(ms),sig=signal&&AbortSignal.any?AbortSignal.any([signal,tsig]):tsig;
  try{return await keyCallOnce0(prov,model,input,json,sig)}
  catch(e){
    if(tsig.aborted&&!(signal&&signal.aborted)){
      if(prov==='local')throw{code:'truncated',slow:true};
      SLOW_M[prov+':'+model]=Date.now()+10*60000;
      throw{code:'overloaded',slow:true,message:`${model} ไม่ตอบภายใน ${ms/1000} วินาที`};
    }
    throw e;
  }
}
async function keyCallOnce0(prov,model,input,json,signal){
  const turns=normTurns(input);let res;
  if(prov==='anthropic'){const t=await anthCall(model,turns,signal,json);if(!t.trim())throw{code:'empty_completion'};return t}
  try{
    if(prov==='gemini'){
      res=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,{method:'POST',signal,
        headers:{'Content-Type':'application/json','x-goog-api-key':AIP.gemini.key},
        body:gemBody(turns,json)});
    }else{
      const meta=prov==='meta',oai=OAI_PROVS[prov],cus=prov==='custom'||prov==='local'||!!oai,cf=oai?{...cfgOf(prov),url:oai.url}:cfgOf(prov);
      /* custom: ไม่ส่ง response_format เพราะหลายเจ้า/โมเดลในเครื่องไม่รองรับ (looseJSON แกะ JSON จากข้อความให้)
         Typhoon/Groq/OpenRouter: ไม่บอก max_tokens = ใช้ค่าตั้งต้นของเซิร์ฟเวอร์ที่สั้น โจทย์ 3 ข้อก็ถูกตัด (truncated) */
      res=await fetch(cus?chatURL(cf.url):meta?'https://api.meta.ai/v1/chat/completions':'https://api.openai.com/v1/chat/completions',{method:'POST',signal,
        headers:{'Content-Type':'application/json',...(cf.key?{'Authorization':'Bearer '+cf.key}:{})},
        body:JSON.stringify({model,messages:turns.map(t=>typeof t.content==='string'?t:{role:t.role,content:[{type:'text',text:t.content.text},...t.content.images.map(i=>({type:'image_url',image_url:{url:i.url||`data:${i.mime};base64,${i.data}`}}))]}),...(json&&!meta&&!cus?{response_format:{type:'json_object'}}:{}),...(json&&(oai||prov==='local')?{max_tokens:8192}:{})})});
    }
  }catch(e){if(e&&e.name==='AbortError')throw{code:'cancelled'};throw{code:'network',message:String(e)}}
  if(!res.ok)await httpFail(res);
  const d=await res.json();
  const mc=d.choices&&d.choices[0]&&d.choices[0].message&&d.choices[0].message.content;
  const text=prov==='gemini'?((d.candidates&&d.candidates[0]&&d.candidates[0].content&&d.candidates[0].content.parts)||[]).map(x=>x.text||'').join(''):Array.isArray(mc)?mc.map(x=>x.text||'').join(''):(mc||'');
  if(!text.trim())throw{code:'empty_completion'};
  /* คำตอบยาวจนถูกตัด JSON จะไม่ครบ: บอกให้ผู้เรียกแบ่งงานให้เล็กลง (kb.js aiWin) */
  const fin=prov==='gemini'?d.candidates&&d.candidates[0]&&d.candidates[0].finishReason:d.choices&&d.choices[0]&&d.choices[0].finish_reason;
  if(json&&(fin==='MAX_TOKENS'||fin==='length'))throw{code:'truncated'};
  return text;
}
function looseJSON(t){
  try{return JSON.parse(t)}catch(e){}
  const f=t.match(/```(?:json)?\s*([\s\S]*?)```/);if(f){try{return JSON.parse(f[1])}catch(e){}}
  const a=Math.min(...['{','['].map(ch=>{const i=t.indexOf(ch);return i<0?Infinity:i})),b=Math.max(t.lastIndexOf('}'),t.lastIndexOf(']'));
  if(isFinite(a)&&b>a){try{return JSON.parse(t.slice(a,b+1))}catch(e){}}
  throw{code:'invalid_json',text:t};
}
/* ---------- ค้นข้อมูลจากเว็บ (ติวเตอร์ใต้เฉลย / ตรวจเฉลยที่ถูกแย้ง) ----------
   Gemini = Google Search grounding · Claude API = web_search tool · OpenAI = Responses API web_search
   คืน {text, sources:[{url,title}]} · ผู้ให้บริการอื่นค้นเว็บไม่ได้ (code no_web) ผู้เรียกใช้ aiText แทน */
const WEB_PROVS=['gemini','anthropic','openai'];
const canWeb=()=>!inViewer&&WEB_PROVS.includes(activeAI());
const textOnly=turns=>normTurns(turns).map(t=>({role:t.role,content:typeof t.content==='string'?t.content:t.content.text}));
function uniqSrc(list){const seen=new Set(),out=[];for(const s of list){if(!s||!s.url||seen.has(s.url))continue;seen.add(s.url);out.push({url:String(s.url),title:String(s.title||s.url).slice(0,120)})}return out.slice(0,6)}
async function aiWeb(input,{signal}={}){
  const p=activeAI();if(!WEB_PROVS.includes(p))throw{code:'no_web'};
  const now=Date.now(),ks=keysOf(p),live=ks.filter(k=>!(KEY_DOWN[k]>now)&&!keyModelDown(k,AIP[p].model));let err;
  for(const k of (live.length?live:ks.slice(0,1))){AIP[p].key=k;
    try{const r=await aiWeb1(p,input,signal);delete KEY_WHY[k];return r}
    catch(e){if(!e||!KEY_SWITCH.includes(e.code))throw e;err=e;keyDown(p,k,AIP[p].model,e.code)}}
  throw err||{code:'no_ai'};
}
async function aiWeb1(p,input,signal){
  const turns=textOnly(input);
  if(p==='anthropic'){
    const c=await anthClient();let msg;
    try{msg=await c.messages.create({model:AIP.anthropic.model,max_tokens:4000,messages:turns,tools:[{type:'web_search_20250305',name:'web_search',max_uses:3}]},{signal})}
    catch(e){if(signal&&signal.aborted)throw{code:'cancelled'};const s=e&&e.status;throw{code:!s?'network':s===401||s===403?'bad_key':s===404?'bad_model':s===429?'rate_limited':s>=500?'overloaded':'upstream_error',message:String(e&&e.message||'').slice(0,300)}}
    const text=msg.content.filter(b=>b.type==='text').map(b=>b.text).join('').trim();
    const src=[];for(const b of msg.content){if(b.type==='web_search_tool_result'&&Array.isArray(b.content))for(const r of b.content)src.push({url:r.url,title:r.title});if(b.type==='text'&&Array.isArray(b.citations))for(const ci of b.citations)src.push({url:ci.url,title:ci.title})}
    if(!text)throw{code:'empty_completion'};return{text,sources:uniqSrc(src)};
  }
  let res;
  try{
    if(p==='gemini'){
      const models=[AIP.gemini.model,...GEMINI_FALLBACK.filter(m=>m!==AIP.gemini.model)].filter(m=>!DEAD_MODELS.has('gemini:'+m));
      for(const model of models){
        res=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,{method:'POST',signal,
          headers:{'Content-Type':'application/json','x-goog-api-key':AIP.gemini.key},
          body:JSON.stringify({contents:turns.map(t=>({role:t.role==='assistant'?'model':'user',parts:[{text:t.content}]})),tools:[{google_search:{}}]})});
        if(res.status!==404)break;DEAD_MODELS.add('gemini:'+model);
      }
    }else{
      res=await fetch('https://api.openai.com/v1/responses',{method:'POST',signal,headers:{'Content-Type':'application/json','Authorization':'Bearer '+AIP.openai.key},
        body:JSON.stringify({model:AIP.openai.model,input:turns,tools:[{type:'web_search'}]})});
    }
  }catch(e){if(e&&e.name==='AbortError')throw{code:'cancelled'};throw{code:'network',message:String(e)}}
  if(!res.ok)await httpFail(res);
  const d=await res.json();let text='',src=[];
  if(p==='gemini'){const c=d.candidates&&d.candidates[0]||{};text=((c.content&&c.content.parts)||[]).map(x=>x.text||'').join('');
    src=((c.groundingMetadata&&c.groundingMetadata.groundingChunks)||[]).map(g=>g.web&&{url:g.web.uri,title:g.web.title})}
  else{for(const o of d.output||[])for(const c of o.content||[]){if(c.type==='output_text'){text+=c.text||'';for(const a of c.annotations||[])if(a.type==='url_citation')src.push({url:a.url,title:a.title})}}
    if(!text&&d.output_text)text=d.output_text}
  if(!text.trim())throw{code:'empty_completion'};
  return{text:text.trim(),sources:uniqSrc(src)};
}
/* ตัวหลักโควตา/เครดิตหมดหรือล่ม: ลอง AI ตัวอื่นที่ตั้งไว้ แล้วค่อย AI ในเครื่อง · จำตัวที่หมดไว้ 30 นาทีจะได้ไม่เสียเวลาลองซ้ำ */
const FALLBACK_CODES=['quota','no_credit','rate_limited','overloaded','bad_model','network','empty_completion'];
const PROV_DOWN={};var LAST_AI='';
async function aiText(input,{signal,onText}={}){
  const p=activeAI();if(!p&&!localUp())throw{code:'no_ai'};
  if(p==='claude')return(await SAMPLE(input,{cache:false,signal,onText})).text;
  const now=Date.now(),order=[...new Set([p,...KEY_PROVS.filter(provReady)].filter(Boolean))].filter(x=>!(PROV_DOWN[x]>now));
  if(localUp())order.push('local');
  if(!order.length)order.push(p);
  let err;
  for(const x of order){
    try{const t=await keyCall(x,input,false,signal,x==='local'?LLMHOST.model:undefined,{fast:true});LAST_AI=x;if(onText)onText({text:t});return t}
    catch(e){if(!e||!FALLBACK_CODES.includes(e.code))throw e;err=err||e;if(['quota','no_credit'].includes(e.code))PROV_DOWN[x]=now+30*60000}
  }
  throw err;
}
async function aiJSON(input,{signal,onText,task}={}){
  /* signal.route: งานเบื้องหลัง (เติมโจทย์) ระบุ AI เอง ไม่กระทบงานอื่นที่ทำพร้อมกัน */
  const {p,model}=(signal&&signal.route)||aiRoute(task);if(!p)throw{code:'no_ai'};
  if(p==='claude')return SAMPLE.json(input,{cache:false,signal,onText});
  const t=await keyCall(p,input,true,signal,model,{fast:task!=='proc'});if(onText)onText({text:t});return looseJSON(t);
}
const HIDE_CODES=['not_granted','sampling_disabled','not_declared','capability_disabled','capability_removed'];
function errCopy(code,what){
  if(code==='psc_login')return 'วิชาผลิตภัณฑ์ ธ.ก.ส. ต้องเข้าสู่ระบบ Product Catalog ก่อน (ข้อมูลเปิดให้เฉพาะพนักงาน)';
  if(code==='pweb_login')return 'วิชาผลิตภัณฑ์ ธ.ก.ส. ต้องเข้าสู่ระบบเว็บสอบนี้ก่อน (ข้อมูลผลิตภัณฑ์เก็บในคลังกลาง)';
  if(code==='psc_empty')return 'ยังไม่มีข้อมูลผลิตภัณฑ์ในระบบ รอแอดมินกดอัปเดตข้อมูลผลิตภัณฑ์';
  if(code==='psc_load')return 'โหลดข้อมูลผลิตภัณฑ์ไม่สำเร็จ ตรวจอินเทอร์เน็ตแล้วลองอีกครั้ง';
  if(code==='psc_token')return 'ลิงก์ Product Catalog ใช้ไม่ได้หรือ token หมดอายุ เข้า Product Catalog ใหม่แล้วคัดลอกลิงก์ล่าสุดมาวาง';
  if(code==='psc_helper')return typeof PSC_WEB!=='undefined'&&PSC_WEB?'ตัวช่วยอ่านหน้าเว็บไม่ทำงาน ดับเบิลคลิก tools\\psc-img-helper.bat ค้างหน้าต่างไว้แล้วกดอัปเดตอีกครั้ง':'โหลดรูปจาก Product Catalog ไม่ได้ ดับเบิลคลิก tools\\psc-img-helper.bat ค้างหน้าต่างไว้แล้วกดอัปเดตอีกครั้ง';
  if(code==='psc_net')return typeof PSC_WEB!=='undefined'&&PSC_WEB?'อ่านเว็บไซต์ ธ.ก.ส. ไม่ได้ ตรวจอินเทอร์เน็ตแล้วลองอีกครั้ง':'ติดต่อ Product Catalog ไม่ได้ ตรวจอินเทอร์เน็ตแล้วลองอีกครั้ง';
  if(code==='ai_bad_out')return 'AI ตอบกลับมาไม่ครบหรืออ่านไม่ได้ ระบบจะลองใหม่เอง (ถ้าเป็นซ้ำ ลองเปลี่ยน AI ในตั้งค่า AI)';
  if(code==='no_credit')return 'เครดิต AI หมด (บัญชีนี้ยังไม่ได้เติมเงิน หรือเงินหมด) เติมเงินในเว็บของผู้ให้บริการ หรือเปลี่ยนไปใช้ AI ตัวอื่นในตั้งค่า AI';
  if(code==='quota')return 'โควตาฟรีของ AI หมดแล้ว ระบบจะประมวลผลต่อเองเมื่อโควตากลับมา (ทุก 60 นาที / วันถัดไป) หรือเปลี่ยนไปใช้ AI ตัวอื่นในตั้งค่า AI';
  return code==='rate_limited'?`${what}ถี่เกินไปหรือโควตาหมด รอสักครู่แล้วลองใหม่`:code==='bad_key'?'API key ไม่ถูกต้องหรือไม่มีสิทธิ์ ตรวจในตั้งค่า AI':code==='bad_model'?'ไม่พบชื่อโมเดลนี้ แก้ชื่อโมเดลในตั้งค่า AI':code==='overloaded'?'เซิร์ฟเวอร์ AI มีคนใช้เยอะชั่วคราว ระบบลองซ้ำและลองโมเดลสำรองแล้วยังไม่ได้ รอสักครู่แล้วลองใหม่':code==='network'?'เชื่อมต่อผู้ให้บริการ AI ไม่ได้ ตรวจอินเทอร์เน็ต':code==='session_expired'?'กรุณาเข้าสู่ระบบใหม่แล้วลองอีกครั้ง':code==='invalid_json'||code==='truncated'?'ได้โจทย์ไม่ครบ ลองลดจำนวนข้อแล้วสร้างใหม่':(code==='refused'||code==='empty_completion')?'AI ไม่ตอบข้อนี้ ลองใหม่อีกครั้ง':`${what}ไม่สำเร็จ ลองใหม่อีกครั้ง`;
}
/* ช่องใส่ key แบบหลายแถว: แต่ละแถวมีเลขลำดับ สถานะ (พัก/ใช้ไม่ได้) และปุ่มลบ */
/* ข้อความผิดพลาดจากผู้ให้บริการมักเป็น JSON: ดึงเฉพาะข้อความ */
const errMsg=m=>{let t=String(m||'');try{const j=JSON.parse(t),e=j.error||j;t=(e.metadata&&e.metadata.raw)||e.message||t}catch(x){}return String(t).replace(/\s+/g,' ').slice(0,160)};
const KEY_LBL={quota:'โควตาหมด',no_credit:'เครดิตหมด',bad_key:'key ใช้ไม่ได้',rate_limited:'ถูกจำกัดความถี่'};
function keyRow(p,k,i,ph){
  const down=k&&(KEY_DOWN[k]>Date.now()||(AIP[p]&&keyModelDown(k,AIP[p].model))),why=k&&KEY_WHY[k],cur=k&&AIP[p]&&AIP[p].key===k&&keysOf(p).length>1;
  return `<div class="keyrow"><span class="keyn">${i+1}</span><input class="tx" type="password" autocomplete="off" value="${esc(k)}" placeholder="${esc(ph||'')}" aria-label="${esc(AINAME[p])} key ${i+1}">
    ${down?`<span class="keyst bad" title="ระบบข้าม key นี้ชั่วคราว">${esc(KEY_LBL[why]||'พักอยู่')}</span>`:cur?'<span class="keyst ok">ใช้อยู่</span>':''}<button type="button" class="ghost keydel" data-delkey aria-label="ลบ key ${i+1}">✕</button></div>`;
}
const keyList=(p,ph)=>{const ks=keysOf(p);return `<div class="keys" data-keys="${p}" data-ph="${esc(ph)}">${(ks.length?ks:['']).map((k,i)=>keyRow(p,k,i,ph)).join('')}</div><div class="keybtns"><button type="button" class="ghost keyadd" data-addkey="${p}">+ เพิ่ม key</button><button type="button" class="ghost keyadd" data-savekey>💾 บันทึก</button><button type="button" class="ghost keyadd" data-testkey="${p}">🧪 ทดสอบ</button></div><p class="hint keystat" data-keystat="${p}"></p>`};
/* การ์ดผู้ให้บริการ: หัวการ์ด (ชื่อ ป้ายฟรี/เสียเงิน ลิงก์สร้าง key) → คำอธิบาย → ช่อง key (ซ้าย) กับโมเดล (ขวา) */
function pcard(p,name,badge,keyUrl,ph,note,modelHTML){
  const mid=(modelHTML.match(/id="([^"]+)"/)||[])[1]||'';
  return `<section class="pcard" aria-label="${esc(name)}"><div class="pch"><b>${esc(name)}</b>${badge}<a class="klink" href="${keyUrl}" target="_blank" rel="noopener">สร้าง ${esc(name)} key ↗</a></div>
    <p class="pnote">${esc(note)}</p>
    <div class="pcb"><div class="field"><span class="fl">API key</span>${keyList(p,ph)}</div><div class="field"><label for="${mid}">โมเดล</label>${modelHTML}</div></div></section>`;
}
function renderAISet(){
  const pill=document.getElementById('aipill'),body=document.getElementById('aibody');
  const a=activeAI();if(pill)pill.textContent=a?AINAME[a]:'ยังไม่ตั้ง';
  if(!body)return;   /* ตัวตั้งค่าอยู่ในหน้า ตั้งค่า AI เท่านั้น */
  if(inViewer){body.innerHTML=`<p class="hint">เปิดผ่าน Claude อยู่ ระบบใช้ Claude ของบัญชีคุณโดยอัตโนมัติ</p><p class="hint">Gemini และ OpenAI ใช้ได้เมื่อเปิดจากไฟล์ exam-practice.html ในเครื่อง เพราะหน้าที่เปิดใน Claude เชื่อมต่อเว็บอื่นไม่ได้</p>`;return}
  const g=AIP.gemini,o=AIP.openai;
  body.innerHTML=`<div class="field"><label for="aiprov">ใช้ AI จาก</label><select id="aiprov"><option value="auto">อัตโนมัติ (ตัวที่มี key)</option><option value="gemini">Gemini (ฟรีแบบจำกัด/วัน)</option><option value="openai">OpenAI (เสียเงิน)</option><option value="anthropic">Claude API (เสียเงิน)</option><option value="meta">Meta (Muse Spark) (เสียเงิน)</option>${Object.entries(OAI_PROVS).map(([p,o])=>`<option value="${p}">${o.name} (${o.paid?'เสียเงิน':'ฟรี'})</option>`).join('')}<option value="custom">ผู้ให้บริการอื่น (OpenAI-compatible)</option></select></div>
   ${pcard('gemini','Gemini','<span class="pfree">ฟรีแบบจำกัด/วัน</span>','https://aistudio.google.com/apikey','วาง key ที่นี่ (ขึ้นต้น AIza)','ฟรีวันละจำนวนจำกัด (นับต่อโปรเจกต์ ไม่ใช่ต่อ key) · อ่านรูปในเอกสารได้ · ค้นข้อมูลจากเว็บได้','<input class="tx" id="gmodel" type="text" autocomplete="off">')}
   ${pcard('openai','OpenAI','<span class="ppaid">เสียเงิน</span>','https://platform.openai.com/api-keys','sk-...','ต้องเติมเครดิตก่อนใช้ (แยกจาก ChatGPT Plus) · อ่านรูปได้ · ค้นเว็บได้','<input class="tx" id="omodel" type="text" autocomplete="off">')}
   ${pcard('anthropic','Claude API','<span class="ppaid">เสียเงิน</span>','https://platform.claude.com/settings/keys','sk-ant-...','ต้องเติมเครดิตก่อนใช้ (แยกจาก Claude Pro/Max) · อ่านรูปได้ · ค้นเว็บได้','<input class="tx" id="amodel" type="text" autocomplete="off" list="amodels"><datalist id="amodels"><option value="claude-opus-5-5"><option value="claude-sonnet-5-5"><option value="claude-haiku-5-5"></datalist>')}
   ${pcard('meta','Meta','<span class="ppaid">เสียเงิน</span>','https://dev.meta.ai/','วาง Meta Model API key','ต้องเติมเครดิตก่อนใช้ · โมเดล Muse Spark · อ่านรูปได้','<input class="tx" id="mmodel" type="text" autocomplete="off" list="mmodels"><datalist id="mmodels"><option value="muse-spark-1.3"><option value="muse-spark-1.3-contributor"></datalist>')}
   ${Object.entries(OAI_PROVS).map(([p,o])=>pcard(p,o.name,o.paid?'<span class="ppaid">เสียเงิน</span>':'<span class="pfree">ฟรี</span>',o.keyUrl,o.ph,o.note,`<input class="tx" id="m-${p}" type="text" autocomplete="off" list="ml-${p}"><datalist id="ml-${p}">${o.models.map(m=>`<option value="${esc(m)}">`).join('')}</datalist>`)).join('')}
   <details class="howto"${AIP.custom.url?' open':''}><summary>ผู้ให้บริการอื่น / AI ในเครื่อง (OpenAI-compatible) · ฟรีหรือเสียเงินแล้วแต่เจ้า</summary>
   <p class="hint">ใช้ได้กับ OpenRouter, DeepSeek, Typhoon (โมเดลภาษาไทย), Groq และ AI ที่รันในเครื่องเอง (Ollama, LM Studio) ฟรีไม่ต้องใช้ key</p>
   <div class="field"><label for="curl">URL ของบริการ</label><input class="tx" id="curl" type="text" autocomplete="off" list="curls" placeholder="https://openrouter.ai/api/v1"><datalist id="curls"><option value="https://openrouter.ai/api/v1">OpenRouter</option><option value="https://api.deepseek.com/v1">DeepSeek</option><option value="https://api.opentyphoon.ai/v1">Typhoon</option><option value="https://api.groq.com/openai/v1">Groq</option><option value="http://localhost:11434/v1">Ollama ในเครื่อง</option><option value="http://localhost:1234/v1">LM Studio ในเครื่อง</option></datalist></div>
   <div class="field"><span class="fl">API key (AI ในเครื่องเว้นว่างได้)</span>${keyList('custom','')}</div>
   <div class="field"><label for="cmodel">ชื่อโมเดล</label><input class="tx" id="cmodel" type="text" autocomplete="off" placeholder="เช่น deepseek-chat, qwen3:14b"></div>
   <label class="rad"><input type="checkbox" id="cvis"><span>โมเดลนี้อ่านรูปได้ (ใช้อ่านหน้า PDF ที่ข้อความเพี้ยนและรูปประกอบ)</span></label>
   <p class="hint">Ollama: ต้องเปิดให้เว็บเรียกได้ก่อน โดยตั้งตัวแปร OLLAMA_ORIGINS=* แล้วเปิด Ollama ใหม่ · AI ในเครื่องใช้ได้เฉพาะเครื่องที่รันอยู่</p></details>
   <details class="howto"${LLMHOST.on?' open':''}><summary>AI ในเครื่องนี้ (เครื่องประมวลผลหลัก)</summary>
   <label class="rad"><input type="checkbox" id="hon"><span><b>ใช้เครื่องนี้ประมวลผลไฟล์ด้วย AI ในเครื่อง</b><span class="src">ตั้งเฉพาะเครื่องนี้ · ขณะเปิดเว็บไว้ เครื่องนี้จะรับไฟล์ที่รอประมวลผลของทั้งบัญชีมาทำฟรี เครื่องอื่นจะรอให้เครื่องนี้ทำ ถ้าเครื่องนี้ปิดอยู่ เครื่องอื่นใช้ AI ของตัวเองแทน ถ้าใช้ไม่ได้จะเข้าคิวรอเครื่องนี้</span></span></label>
   <div class="field"><label for="hurl">URL</label><input class="tx" id="hurl" type="text" autocomplete="off" list="curls"></div>
   <div class="field"><label for="hmodel">โมเดล</label><input class="tx" id="hmodel" type="text" autocomplete="off" list="hmodels"><datalist id="hmodels">${LOCALAI.models.map(m=>`<option value="${esc(m)}">`).join('')}</datalist></div>
   <label class="rad"><input type="checkbox" id="hvis"><span>ให้ AI ในเครื่องอ่านรูปด้วย (ไม่แนะนำ: ถอดภาษาไทยจากภาพยังผิดบ่อย ปล่อยว่างไว้ หน้าที่ต้องอ่านภาพจะใช้ AI ตัวหลักแทน)</span></label>
   <p class="hint ${localUp()?'ok':LLMHOST.on?'err':''}" id="hstat">${hostStatusText()}</p>
   <div class="keybtns"><button type="button" class="ghost keyadd" data-savekey>💾 บันทึก</button><button type="button" class="ghost keyadd" data-testlocal>🧪 ทดสอบ</button></div></details>
   <div class="field"><label for="pprov">AI สำหรับประมวลผลไฟล์ (ประหยัดเครดิต)</label><select id="pprov"><option value="same">ผู้ให้บริการเดียวกับด้านบน</option><option value="gemini">Gemini (ฟรีแบบจำกัด/วัน)</option><option value="openai">OpenAI (เสียเงิน)</option><option value="anthropic">Claude API (เสียเงิน)</option><option value="meta">Meta (เสียเงิน)</option>${Object.entries(OAI_PROVS).map(([p,o])=>`<option value="${p}">${o.name} (${o.paid?'เสียเงิน':'ฟรี'})</option>`).join('')}<option value="custom">ผู้ให้บริการอื่น</option></select></div>
   <div class="field"><label for="pmodel">โมเดลสำหรับประมวลผลไฟล์ (เว้นว่าง = โมเดลเดิมของผู้ให้บริการนั้น)</label><input class="tx" id="pmodel" type="text" autocomplete="off" list="pmodels" placeholder="เช่น gemini-flash-lite-latest"><datalist id="pmodels"><option value="gemini-flash-lite-latest"><option value="gpt-5-nano"><option value="gpt-5-mini"><option value="claude-haiku-5-5"><option value="muse-spark-1.3-contributor"></datalist></div>
   <p class="hint">งานอ่านไฟล์ ย่อยบัตรความรู้ และดึงข้อสอบจากไฟล์ ใช้ AI มากที่สุด ตั้งเป็นโมเดลราคาถูกตรงนี้ได้ ส่วนการออกข้อสอบและติวเตอร์ยังใช้ตัวด้านบน${(()=>{const r=aiRoute('proc');return r.p?` · ตอนนี้ประมวลผลไฟล์ด้วย ${AINAME[r.p]}${r.model?' · '+esc(r.model):''}`:''})()}</p>
   <div class="keybtns"><button type="button" class="ghost keyadd" data-savekey>💾 บันทึก</button><button type="button" class="ghost keyadd" data-testproc>🧪 ทดสอบ</button></div><p class="hint keystat" data-keystat="proc"></p>
   <p class="hint">ใส่ key ได้หลายอันไม่จำกัดต่อผู้ให้บริการ (กด + เพิ่ม key) เมื่อ key ไหนโควตาหรือเครดิตหมด ระบบสลับไปใช้ key ถัดไปเอง ครบทุก key แล้วจึงเปลี่ยนไปผู้ให้บริการอื่น</p>
   <p class="hint ${AISYNC.bad?'err':'ok'}" id="aisync">${esc(AISYNC.msg||((typeof ME!=='undefined'&&ME)?'':'เข้าสู่ระบบเพื่อเก็บ key ไว้กับบัญชี ใช้ได้ทุกเครื่อง'))}</p>
   <div class="btns"><button class="ghost" id="aisyncbtn">⇅ ซิงก์ตั้งค่า AI กับบัญชี</button></div>
   <details class="howto"><summary>วิธีขอ Gemini key (มีโควตาฟรี)</summary><ol>
<li>กดลิงก์ <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener">aistudio.google.com/apikey</a> แล้วเข้าสู่ระบบด้วยบัญชี Google</li>
<li>ครั้งแรกจะมีหน้าข้อตกลงการใช้งาน ให้กดยอมรับ</li>
<li>กดปุ่ม <b>Create API key</b> (สร้างคีย์ API) ถ้าถามโปรเจกต์ ให้เลือกโปรเจกต์ที่มีหรือให้ระบบสร้างใหม่</li>
<li>คัดลอก key ที่ได้ (ขึ้นต้นด้วย AIza) มาวางในช่อง Gemini API key</li>
<li>กด บันทึก แล้วกด ทดสอบ</li>
</ol><p class="hint">แบบฟรีมีจำกัดจำนวนครั้งต่อวัน และ Google อาจนำข้อมูลที่ส่งไปใช้ปรับปรุงบริการ ถ้าไม่ต้องการให้เปิดการเรียกเก็บเงินในโปรเจกต์</p></details>
<details class="howto"><summary>วิธีขอ OpenAI key (ต้องเติมเงิน)</summary><ol>
<li>กดลิงก์ <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener">platform.openai.com/api-keys</a> แล้วเข้าสู่ระบบ ใช้บัญชีเดียวกับ ChatGPT ได้ แต่ค่าใช้จ่ายแยกกัน แพ็กเกจ ChatGPT Plus ใช้กับ API ไม่ได้</li>
<li>ไปที่ <b>Settings → Billing</b> เพิ่มบัตรและเติมเครดิตก่อน ไม่อย่างนั้น key จะใช้ไม่ได้</li>
<li>กลับมาหน้า API keys กด <b>Create new secret key</b> ตั้งชื่อ เช่น ซ้อมสอบ แล้วกดสร้าง</li>
<li>คัดลอก key (ขึ้นต้นด้วย sk-) ทันที เพราะระบบจะให้ดูได้ครั้งเดียว แล้ววางในช่อง OpenAI API key</li>
<li>กด บันทึก แล้วกด ทดสอบ</li>
</ol></details>
<details class="howto"><summary>วิธีขอ Claude API key (ต้องเติมเงิน)</summary><ol>
<li>กดลิงก์ <a href="https://platform.claude.com/settings/keys" target="_blank" rel="noopener">platform.claude.com</a> แล้วเข้าสู่ระบบ แพ็กเกจ Claude Pro/Max ใช้กับ API ไม่ได้ ค่าใช้จ่ายแยกกัน</li>
<li>ไปที่ <b>Billing</b> เพิ่มบัตรและเติมเครดิตก่อน</li>
<li>กลับมาหน้า <b>API keys</b> กด <b>Create key</b> แล้วคัดลอก key (ขึ้นต้นด้วย sk-ant-) มาวางในช่อง Claude API key</li>
<li>กด บันทึก แล้วกด ทดสอบ</li>
</ol><p class="hint">โมเดลเริ่มต้นคือ claude-opus-5-5 (เก่งที่สุดในกลุ่มนี้) ถ้าต้องการประหยัด เปลี่ยนเป็น claude-sonnet-5-5 หรือ claude-haiku-5-5 ได้ในช่องโมเดล · อ่านรูปในเอกสารได้ แต่ไม่มีดัชนีค้นหาตามความหมาย (ใช้การค้นด้วยคำแทน)</p></details>
<details class="howto"><summary>วิธีขอ Meta API key (ต้องเติมเงิน)</summary><ol>
<li>กดลิงก์ <a href="https://dev.meta.ai/" target="_blank" rel="noopener">dev.meta.ai</a> แล้วเข้าสู่ระบบ</li>
<li>สร้าง API key ของ Model API และตั้งค่าการชำระเงินตามที่หน้าเว็บแจ้ง</li>
<li>คัดลอก key มาวางในช่อง Meta API key แล้วกด บันทึก และ ทดสอบ</li>
</ol><p class="hint">Meta ปิด Llama API เดิมไปแล้ว (ก.ค. 2569) ตอนนี้ใช้ Meta Model API กับโมเดล Muse Spark · โมเดล -contributor ราคาถูกกว่า · อ่านรูปในเอกสารได้ แต่ไม่มีดัชนีค้นหาตามความหมาย</p></details>
${Object.values(OAI_PROVS).map(o=>`<details class="howto"><summary>วิธีขอ ${o.name} key (${o.paid?'ต้องเติมเงิน':'ฟรี ไม่ต้องใช้บัตร'})</summary><ol>${o.howto.map(s=>`<li>${s}</li>`).join('')}</ol>${o.tip?`<p class="hint">${o.tip}</p>`:''}</details>`).join('')}
<p class="hint">มีหลาย key ระบบสลับใช้ทีละ key ทุกคำขอ key ไหนโควตาหมดหรือใช้ไม่ได้จะข้ามไปตัวถัดไปเอง · key เก็บในเบราว์เซอร์และในบัญชีที่ล็อกอิน (เห็นได้เฉพาะเจ้าของบัญชี) เพิ่มหรือลบในเครื่องไหน ทุกเครื่องของบัญชีนี้ได้ตามทันที · อย่าใช้ในเครื่องสาธารณะ และอย่าส่ง key ให้คนอื่น ค่าใช้จ่ายคิดกับบัญชีของ key นั้น</p>`;
  const $=id=>document.getElementById(id);
  $('aiprov').value=AIP.provider;$('gmodel').value=g.model;$('omodel').value=o.model;$('amodel').value=AIP.anthropic.model;$('mmodel').value=AIP.meta.model;
  for(const p of Object.keys(OAI_PROVS))$('m-'+p).value=AIP[p].model||OAI_PROVS[p].model;
  $('curl').value=AIP.custom.url;$('cmodel').value=AIP.custom.model;$('cvis').checked=!!AIP.custom.vision;$('pprov').value=AIP.proc.provider||'same';$('pmodel').value=AIP.proc.model||'';
  $('hon').checked=!!LLMHOST.on;$('hurl').value=LLMHOST.url;$('hmodel').value=LLMHOST.model;$('hvis').checked=!!LLMHOST.vision;
  /* key ที่เครื่องอื่นเพิ่มเข้ามาหลังวาดหน้านี้ (ไม่มีในช่อง) ต้องไม่ถูกนับว่าผู้ใช้ลบ */
  const shown=Object.fromEntries(KEY_PROVS.map(p=>[p,keysOf(p)]));
  const kv=p=>{const dom=[...document.querySelectorAll(`[data-keys="${p}"] input`)].map(x=>x.value.trim()).filter(Boolean);
    const ks=[...new Set([...dom,...keysOf(p).filter(k=>!shown[p].includes(k))])];return{keys:ks,key:ks.includes(AIP[p]&&AIP[p].key)?AIP[p].key:ks[0]||''}};
  const read=()=>{AIP.provider=$('aiprov').value;AIP.gemini={...kv('gemini'),model:$('gmodel').value.trim()||'gemini-flash-latest'};AIP.openai={...kv('openai'),model:$('omodel').value.trim()||'gpt-5-mini'};AIP.anthropic={...kv('anthropic'),model:$('amodel').value.trim()||'claude-opus-5-5'};AIP.meta={...kv('meta'),model:$('mmodel').value.trim()||'muse-spark-1.3'};
    for(const [p,o] of Object.entries(OAI_PROVS))AIP[p]={...kv(p),model:$('m-'+p).value.trim()||o.model};
    AIP.custom={url:$('curl').value.trim(),...kv('custom'),model:$('cmodel').value.trim(),vision:$('cvis').checked};AIP.proc={provider:$('pprov').value,model:$('pmodel').value.trim()};
    LLMHOST={on:$('hon').checked,url:$('hurl').value.trim()||'http://localhost:11434/v1',model:$('hmodel').value.trim()||'gemma3:12b',vision:$('hvis').checked};saveHost()};
  /* ผลทดสอบแสดงใต้ปุ่มของผู้ให้บริการนั้น · หน้าถูกวาดใหม่หลังบันทึก จึงหาช่องสถานะใหม่ทุกครั้ง */
  const pstat=(p,t,c)=>{const e=document.querySelector(`[data-keystat="${p}"]`);if(e){e.textContent=t;e.className='hint keystat '+(c||'')}};
  const doSave=()=>{read();saveAI();if(typeof hostTick==='function')hostTick().then(()=>{renderAISet();if(typeof renderKB==='function'&&VIEW==='kb')renderKB()});renderAISet();aiChanged();
    return activeAI()?`บันทึกแล้ว ใช้ ${AINAME[activeAI()]}`:'บันทึกแล้ว แต่ยังไม่มี key ที่ใช้ได้'};
  body.querySelectorAll('[data-savekey]').forEach(b=>b.onclick=()=>toast(doSave()));
  $('aiprov').onchange=()=>toast(doSave());
  $('aisyncbtn').onclick=async()=>{if(typeof ME==='undefined'||!ME){aiSyncMsg('เข้าสู่ระบบก่อน แล้วกดอีกครั้ง',true);return}aiSyncMsg('กำลังซิงก์...');await pullAIP()};
  body.querySelectorAll('[data-addkey]').forEach(b=>b.onclick=()=>{const box=body.querySelector(`[data-keys="${b.dataset.addkey}"]`);box.insertAdjacentHTML('beforeend',keyRow(b.dataset.addkey,'',box.children.length,box.dataset.ph));box.lastElementChild.querySelector('input').focus()});
  if(!body._kd){body._kd=1;body.addEventListener('click',e=>{const b=e.target.closest('[data-delkey]');if(!b)return;const row=b.closest('.keyrow'),box=row.parentElement;if(box.children.length>1)row.remove();else row.querySelector('input').value='';box.querySelectorAll('.keyn').forEach((n,i)=>n.textContent=i+1)})}
  /* ทดสอบผู้ให้บริการเดียว: ทุก key ของเจ้านั้น ทีละ key */
  body.querySelectorAll('[data-testkey]').forEach(b=>b.onclick=async()=>{const p=b.dataset.testkey;read();saveAI();
    if(p==='custom'&&!(AIP.custom.url&&AIP.custom.model)){renderAISet();pstat(p,'ใส่ URL และชื่อโมเดลก่อน','err');return}
    const ks=keysOf(p),list=p==='custom'?[ks[0]||'']:ks;
    if(!list.length){renderAISet();pstat(p,'ยังไม่ได้ใส่ key','err');return}
    renderAISet();pstat(p,`กำลังทดสอบ ${AINAME[p]}${list.length>1?` ${list.length} key`:''}...`);
    const rep=[];let bad=0;
    for(let i=0;i<list.length;i++){const k=list[i],t0=Date.now(),n=list.length>1?`key ${i+1} `:'';AIP[p].key=k;
      try{await keyCall1(p,'ตอบกลับคำว่า พร้อม เพียงคำเดียว',false);if(k){delete KEY_DOWN[k];delete KEY_WHY[k]}rep.push(`${n}✓ ใช้งานได้ (${LAST_MODEL}) ตอบใน ${((Date.now()-t0)/1000).toFixed(1)} วินาที`)}
      catch(e){bad++;const c=e&&e.code;if(k&&KEY_SWITCH.includes(c)){KEY_DOWN[k]=Date.now()+(c==='bad_key'?864e5:c==='rate_limited'?60e3:30*60e3);KEY_WHY[k]=c}
        rep.push(`${n}✗ ${KEY_LBL[c]||errCopy(c,'ทดสอบ')}${e&&e.message?` (${errMsg(e.message)})`:''}${p==='custom'&&c==='network'?' (ตรวจ URL และถ้าเป็น Ollama ต้องตั้ง OLLAMA_ORIGINS)':''}`)}}
    if(p!=='custom')pickKey(p);renderAISet();aiChanged();pstat(p,rep.join('\n'),bad===list.length?'err':'ok')});
  /* AI ในเครื่องนี้ */
  body.querySelector('[data-testlocal]').onclick=async()=>{read();saveAI();renderAISet();const h=()=>{const e=$('hstat');return e};
    if(!LLMHOST.on){h().textContent='ติ๊ก "ใช้เครื่องนี้ประมวลผลไฟล์ด้วย AI ในเครื่อง" ก่อน';h().className='hint err';return}
    h().textContent='กำลังทดสอบ AI ในเครื่อง...';h().className='hint';await pingLocal();
    if(!localUp()){h().textContent=LOCALAI.why;h().className='hint err';return}
    try{const t0=Date.now(),j=await aiJSON('ตอบเป็น JSON เท่านั้น: {"ok":true,"word":"พร้อม"}',{task:'proc'});h().textContent=`✓ AI ในเครื่องใช้งานได้ (${LLMHOST.model}) ตอบใน ${((Date.now()-t0)/1000).toFixed(1)} วินาที: ${j&&j.word||JSON.stringify(j).slice(0,40)}`;h().className='hint ok';if(typeof hostTick==='function')hostTick()}
    catch(e){h().textContent='AI ในเครื่องใช้ไม่ได้: '+errCopy(e&&e.code,'ทดสอบ')+(e&&e.message?` (${String(e.message).slice(0,120)})`:'');h().className='hint err'}};
  /* AI สำหรับประมวลผลไฟล์ */
  body.querySelector('[data-testproc]').onclick=async()=>{read();saveAI();renderAISet();const r=aiRoute('proc');
    if(!r.p){pstat('proc','ยังไม่มี AI ให้ใช้ ใส่ key ของผู้ให้บริการก่อน','err');return}
    pstat('proc',`กำลังทดสอบ ${AINAME[r.p]}...`);
    try{const t0=Date.now(),j=await aiJSON('ตอบเป็น JSON เท่านั้น: {"ok":true}',{task:'proc'});pstat('proc',`ประมวลผลไฟล์ด้วย ${AINAME[r.p]} (${LAST_MODEL||r.model||''}) ${j&&j.ok?'✓ ใช้งานได้':'ตอบแต่ไม่ใช่ JSON ที่ถูกต้อง'} · ${((Date.now()-t0)/1000).toFixed(1)} วินาที`,j&&j.ok?'ok':'err')}
    catch(e){pstat('proc','✗ '+errCopy(e&&e.code,'ทดสอบ')+(r.p==='custom'&&e&&e.code==='network'?' (ตรวจ URL และถ้าเป็น Ollama ต้องตั้ง OLLAMA_ORIGINS)':''),'err')}};
}
function hostStatusText(){
  if(LLMHOST.on)return localUp()?`✓ AI ในเครื่องพร้อม (${LLMHOST.model}) · เครื่องนี้เป็นเครื่องประมวลผลหลัก`:(LOCALAI.why||'กำลังตรวจการเชื่อมต่อ...');
  const h=typeof HOSTBEAT!=='undefined'&&HOSTBEAT;
  return h?`เครื่องประมวลผลหลักของบัญชีนี้ (${esc(h.model||'')}): ${hostAlive()?'ออนไลน์':'ออฟไลน์'} · ล่าสุด ${fmtDate(+h.at)}`:'ยังไม่ได้ตั้งเครื่องประมวลผลหลัก';
}
function renderAISetPill(){const a=activeAI(),p=document.getElementById('aipill');if(p)p.textContent=a?AINAME[a]:'ยังไม่ตั้ง'}
function aiChanged(){document.querySelectorAll('.askbox').forEach(b=>b.hidden=!activeAI());if(typeof VIEW!=='undefined'&&VIEW==='mock'&&!M&&!G)renderMock();if(R&&(R.status==='needai'||R.status==='idle')){R.status=activeAI()?'idle':'needai';render()}}
onAppReady(async()=>{try{if(window.claude&&window.claude.use){SAMPLE=await window.claude.use('sample')}}catch(e){}aiReady=true;renderAISet();aiChanged()});

/* โจทย์คำนวณ: เฉลยต้องละเอียดพอให้คนพื้นฐานคณิตอ่อนทำตามได้ (ใช้ในทุกพรอมป์สร้างโจทย์) */
const CALC_RULE='- ข้อที่ต้องคำนวณ (ตัวเลข ร้อยละ ดอกเบี้ย อัตราส่วน อนุกรม ฯลฯ) ไม่ต้องจำกัด 2–4 ขั้น ให้เขียนวิธีทำแบบละเอียดสำหรับคนที่ไม่เก่งคณิตเลย 5–10 ขั้น: โจทย์ให้อะไรและถามอะไร → ใช้สูตร/หลักอะไร → แทนค่า → คิดเลขทีละขั้นไม่ข้าม (คูณหารเลขหลายหลักให้แตกให้ดู เช่น 25 × 12 = 250 + 50 = 300) → ได้คำตอบตรงกับตัวเลือกไหน → วิธีตรวจคำตอบง่ายๆ ใช้ × ÷ ไม่ใช้ * · ถ้าโจทย์แนวนี้มีสูตรลัดที่ถูกต้อง ให้ขั้นแรกเป็นสูตรลัดพร้อมแทนค่า เพื่อให้ทำทันเวลาสอบ';
function genPrompt(s,level,n){
  const weak=(P.weak[s.id]||[]).slice(-5);
  return `สร้างข้อสอบใหม่ ${n} ข้อ วิชา "${s.name}" (${s.desc}) แนวข้อสอบความรู้ความสามารถทั่วไป ก.พ. และสอบราชการไทย
ระดับความยาก ${level}: ${levelTxt(level)}
เลขสุ่ม ${Math.random().toString(36).slice(2,8)} ใช้แค่ทำให้โจทย์ชุดนี้ต่างจากชุดก่อน ห้ามใส่เลขนี้หรือคำว่ารหัสชุดลงในโจทย์ ตัวเลือก หรือคำอธิบาย
${weak.length?`ผู้ทำเคยตอบผิดในโจทย์แนวนี้ ให้มีโจทย์แนวคล้ายกันปนอยู่ 2–3 ข้อ (เปลี่ยนตัวเลขและเนื้อหา):\n- ${weak.join('\n- ')}\n`:''}
กติกา:
${VIZ_RULE}
- ทุกข้อมีตัวเลือก 4 ตัว ถูกเพียงตัวเดียว คละตำแหน่งคำตอบที่ถูก
${CHOICE_RULE}
- คิดคำตอบให้ถูกต้องแน่นอน ตรวจคำนวณซ้ำก่อนส่ง ห้ามมีข้อที่กำกวม
- ${s.id==='eng'?'โจทย์และตัวเลือกเป็นภาษาอังกฤษ ส่วนเฉลยอธิบายเป็นภาษาไทย':'ใช้ภาษาไทยทั้งหมด'}
- เฉลยแต่ละข้อมี 2–4 ขั้น สั้น ภาษาง่าย ห้ามข้ามขั้น แต่ละขั้นบอกที่มา (from) เช่น "โจทย์บอก" หรือ "คูณ 2 ทั้งสองข้าง"
${CALC_RULE}
- ห้ามใช้ markdown ในข้อความ ไม่ต้องใส่ ก ข ค ง หน้าตัวเลือก
ตอบเป็น JSON เท่านั้น รูปแบบ:
{"questions":[{"stem":"โจทย์","choices":["ตัวเลือก1","ตัวเลือก2","ตัวเลือก3","ตัวเลือก4"],"answer":0,"viz":null,"steps":[{"text":"ขั้นอธิบาย","from":"ที่มา"}]}]}`;
}
/* ข้อเสียจากการย่อยไฟล์: AI ลอกตัวอย่างรูปแบบ JSON ในคำสั่ง (ตัวเลือกเป็น "ตัวเลือก1..4")
   หรือดึงบรรทัดเฉลย/แนวคิดมาเป็นโจทย์ (เช่น "37.ค") → ตอบไม่ได้ ห้ามเข้าคลังและห้ามออกข้อสอบ */
const PH_CHOICE=/^\s*(ตัวเลือก|choice|option)\s*\d+\s*$/i,KEY_STEM=/^\s*\d{1,3}\s*[.)]?\s*(ตอบ\s*)?[กขคง]\s*\.?\s*$/;
const placeholderQ=q=>!!q&&((Array.isArray(q.choices)&&q.choices.filter(c=>PH_CHOICE.test(String(c))).length>=2)||KEY_STEM.test(String(q.stem||'')));
function cleanAI(data){
  const arr=Array.isArray(data)?data:(data&&Array.isArray(data.questions)?data.questions:[]);
  return arr.filter(q=>q&&!placeholderQ(q)&&typeof q.stem==='string'&&Array.isArray(q.choices)&&q.choices.length>=2&&Number.isInteger(q.answer)&&q.answer>=0&&q.answer<q.choices.length)
   .map(q=>({kind:'mc',topic:String(q.topic||''),ref:String(q.ref||''),card:String(q.card||''),fig:String(q.fig||''),viz:cleanViz(q.viz),stem:q.stem,choices:q.choices.slice(0,5).map(String),answer:q.answer,steps:(Array.isArray(q.steps)?q.steps:[]).map(s=>typeof s==='string'?[s,'']:[String(s.text||''),String(s.from||'')]).filter(s=>s[0])}));
}
