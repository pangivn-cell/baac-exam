/* ai.js — เชื่อมต่อ AI (Gemini / OpenAI / Claude API / Meta / Claude ในลิงก์ claude.ai) */
/* ---------- AI connection ---------- */
let SAMPLE=null,aiReady=false,R=null,genCtl=null;
const inViewer=!!window.claude;
let AIP={provider:'auto',gemini:{key:'',model:'gemini-flash-latest'},openai:{key:'',model:'gpt-5-mini'},anthropic:{key:'',model:'claude-opus-5-5'},meta:{key:'',model:'muse-spark-1.3'}};
try{const a=JSON.parse(localStorage.getItem('exam-drill-ai')||'null');if(a)AIP={...AIP,...a,gemini:{...AIP.gemini,...(a.gemini||{})},openai:{...AIP.openai,...(a.openai||{})},anthropic:{...AIP.anthropic,...(a.anthropic||{})},meta:{...AIP.meta,...(a.meta||{})}}}catch(e){}
const saveAI=()=>{try{localStorage.setItem('exam-drill-ai',JSON.stringify(AIP))}catch(e){}};
const AINAME={claude:'Claude',gemini:'Gemini',openai:'OpenAI',anthropic:'Claude API',meta:'Meta'};
const KEY_PROVS=['gemini','openai','anthropic','meta'];
function activeAI(){
  if(inViewer)return SAMPLE?'claude':null;
  const p=AIP.provider;
  if(p==='auto')return KEY_PROVS.find(x=>AIP[x].key)||null;
  return AIP[p]&&AIP[p].key?p:null;
}
function normTurns(input){
  const arr=typeof input==='string'?[{role:'user',content:input}]:input,out=[];
  for(const t of arr){const r=t.role==='assistant'?'assistant':'user',last=out[out.length-1];if(last&&last.role===r&&typeof last.content==='string'&&typeof t.content==='string')last.content+='\n\n'+t.content;else out.push({role:r,content:t.content})}
  return out;
}
async function httpFail(res){
  let msg='';try{msg=await res.text()}catch(e){}
  const bad=res.status===401||res.status===403||(res.status===400&&/API[_ ]?key/i.test(msg));
  if(/credit balance|insufficient_quota|exceeded your current quota|billing|payment required/i.test(msg)||res.status===402)throw{code:'no_credit',message:msg.slice(0,300)};
  throw{code:bad?'bad_key':res.status===404?'bad_model':res.status===429?'rate_limited':(res.status>=500||/overloaded|high demand|UNAVAILABLE/i.test(msg))?'overloaded':'upstream_error',message:msg.slice(0,300)};
}
const GEMINI_FALLBACK=['gemini-flash-latest','gemini-2.5-flash','gemini-flash-lite-latest','gemini-2.5-flash-lite'];
let LAST_MODEL='';
const sleep=(ms,signal)=>new Promise((ok,no)=>{const t=setTimeout(ok,ms);if(signal)signal.addEventListener('abort',()=>{clearTimeout(t);no({code:'cancelled'})},{once:true})});
async function keyCall(prov,input,json,signal){
  const models=prov==='gemini'?[AIP.gemini.model,...GEMINI_FALLBACK.filter(m=>m!==AIP.gemini.model)]:[AIP[prov].model];
  let lastErr;
  for(const model of models){
    for(let attempt=0;attempt<3;attempt++){
      try{const t=await keyCallOnce(prov,model,input,json,signal);LAST_MODEL=model;return t}
      catch(e){lastErr=e;if(e&&typeof e==='object'){e.prov=prov;e.model=model}
        if(e.code==='overloaded'||e.code==='network'&&attempt===0){await sleep(1500*(attempt+1),signal);continue}
        if(e.code==='bad_model'||(e.code==='rate_limited'&&prov==='gemini'))break;
        throw e;
      }
    }
  }
  throw lastErr;
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
async function anthCall(model,turns,signal){
  const c=await anthClient(),fb=ANTH_FALLBACK.includes(model);
  const messages=turns.map(t=>({role:t.role,content:typeof t.content==='string'?t.content:[...t.content.images.map(i=>({type:'image',source:{type:'base64',media_type:i.mime,data:i.data}})),{type:'text',text:t.content.text}]}));
  const params={model,max_tokens:64000,messages,...(fb?{betas:['server-side-fallback-2026-07-01'],fallbacks:'default'}:{})};
  let msg;
  try{msg=await (fb?c.beta.messages:c.messages).stream(params,{signal}).finalMessage()}
  catch(e){
    if(signal&&signal.aborted)throw{code:'cancelled'};
    const s=e&&e.status;if(!s)throw{code:'network',message:String(e&&e.message||e)};
    if(/credit balance|billing/i.test(String(e.message||''))||s===402)throw{code:'no_credit',message:String(e.message||'').slice(0,300)};
    throw{code:s===401||s===403?'bad_key':s===404?'bad_model':s===429?'rate_limited':s>=500?'overloaded':'upstream_error',message:String(e.message||'').slice(0,300)};
  }
  if(msg.stop_reason==='refusal')throw{code:'refused'};
  return msg.content.filter(b=>b.type==='text').map(b=>b.text).join('');
}
async function keyCallOnce(prov,model,input,json,signal){
  const turns=normTurns(input);let res;
  if(prov==='anthropic'){const t=await anthCall(model,turns,signal);if(!t.trim())throw{code:'empty_completion'};return t}
  try{
    if(prov==='gemini'){
      res=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,{method:'POST',signal,
        headers:{'Content-Type':'application/json','x-goog-api-key':AIP.gemini.key},
        body:JSON.stringify({contents:turns.map(t=>({role:t.role==='assistant'?'model':'user',parts:typeof t.content==='string'?[{text:t.content}]:[{text:t.content.text},...t.content.images.map(i=>({inline_data:{mime_type:i.mime,data:i.data}}))]})),...(json?{generationConfig:{responseMimeType:'application/json'}}:{})})});
    }else{
      const meta=prov==='meta';
      res=await fetch(meta?'https://api.meta.ai/v1/chat/completions':'https://api.openai.com/v1/chat/completions',{method:'POST',signal,
        headers:{'Content-Type':'application/json','Authorization':'Bearer '+AIP[prov].key},
        body:JSON.stringify({model,messages:turns.map(t=>typeof t.content==='string'?t:{role:t.role,content:[{type:'text',text:t.content.text},...t.content.images.map(i=>({type:'image_url',image_url:{url:`data:${i.mime};base64,${i.data}`}}))]}),...(json&&!meta?{response_format:{type:'json_object'}}:{})})});
    }
  }catch(e){if(e&&e.name==='AbortError')throw{code:'cancelled'};throw{code:'network',message:String(e)}}
  if(!res.ok)await httpFail(res);
  const d=await res.json();
  const mc=d.choices&&d.choices[0]&&d.choices[0].message&&d.choices[0].message.content;
  const text=prov==='gemini'?((d.candidates&&d.candidates[0]&&d.candidates[0].content&&d.candidates[0].content.parts)||[]).map(x=>x.text||'').join(''):Array.isArray(mc)?mc.map(x=>x.text||'').join(''):(mc||'');
  if(!text.trim())throw{code:'empty_completion'};
  return text;
}
function looseJSON(t){
  try{return JSON.parse(t)}catch(e){}
  const f=t.match(/```(?:json)?\s*([\s\S]*?)```/);if(f){try{return JSON.parse(f[1])}catch(e){}}
  const a=Math.min(...['{','['].map(ch=>{const i=t.indexOf(ch);return i<0?Infinity:i})),b=Math.max(t.lastIndexOf('}'),t.lastIndexOf(']'));
  if(isFinite(a)&&b>a){try{return JSON.parse(t.slice(a,b+1))}catch(e){}}
  throw{code:'invalid_json',text:t};
}
async function aiText(input,{signal,onText}={}){
  const p=activeAI();if(!p)throw{code:'no_ai'};
  if(p==='claude')return(await SAMPLE(input,{cache:false,signal,onText})).text;
  const t=await keyCall(p,input,false,signal);if(onText)onText({text:t});return t;
}
async function aiJSON(input,{signal,onText}={}){
  const p=activeAI();if(!p)throw{code:'no_ai'};
  if(p==='claude')return SAMPLE.json(input,{cache:false,signal,onText});
  const t=await keyCall(p,input,true,signal);if(onText)onText({text:t});return looseJSON(t);
}
const HIDE_CODES=['not_granted','sampling_disabled','not_declared','capability_disabled','capability_removed'];
function errCopy(code,what){
  if(code==='no_credit')return 'บัญชี AI นี้เครดิตไม่พอ (ยังไม่ได้เติมเงิน หรือเงินหมด) ให้เติมเงินในเว็บของผู้ให้บริการ หรือเปลี่ยนไปใช้ AI ตัวอื่นในตั้งค่า AI';
  return code==='rate_limited'?`${what}ถี่เกินไปหรือโควตาหมด รอสักครู่แล้วลองใหม่`:code==='bad_key'?'API key ไม่ถูกต้องหรือไม่มีสิทธิ์ ตรวจในตั้งค่า AI':code==='bad_model'?'ไม่พบชื่อโมเดลนี้ แก้ชื่อโมเดลในตั้งค่า AI':code==='overloaded'?'เซิร์ฟเวอร์ AI มีคนใช้เยอะชั่วคราว ระบบลองซ้ำและลองโมเดลสำรองแล้วยังไม่ได้ รอสักครู่แล้วลองใหม่':code==='network'?'เชื่อมต่อผู้ให้บริการ AI ไม่ได้ ตรวจอินเทอร์เน็ต':code==='session_expired'?'กรุณาเข้าสู่ระบบใหม่แล้วลองอีกครั้ง':code==='invalid_json'?'ได้โจทย์ไม่ครบ ลองลดจำนวนข้อแล้วสร้างใหม่':(code==='refused'||code==='empty_completion')?'AI ไม่ตอบข้อนี้ ลองใหม่อีกครั้ง':`${what}ไม่สำเร็จ ลองใหม่อีกครั้ง`;
}
function renderAISet(){
  const pill=document.getElementById('aipill'),body=document.getElementById('aibody');if(!pill||!body)return;
  const a=activeAI();pill.textContent=a?AINAME[a]:'ยังไม่ตั้ง';
  if(inViewer){body.innerHTML=`<p class="hint">เปิดผ่าน Claude อยู่ ระบบใช้ Claude ของบัญชีคุณโดยอัตโนมัติ</p><p class="hint">Gemini และ OpenAI ใช้ได้เมื่อเปิดจากไฟล์ exam-practice.html ในเครื่อง เพราะหน้าที่เปิดใน Claude เชื่อมต่อเว็บอื่นไม่ได้</p>`;return}
  const g=AIP.gemini,o=AIP.openai;
  body.innerHTML=`<div class="field"><label for="aiprov">ใช้ AI จาก</label><select id="aiprov"><option value="auto">อัตโนมัติ (ตัวที่มี key)</option><option value="gemini">Gemini</option><option value="openai">OpenAI</option><option value="anthropic">Claude API</option><option value="meta">Meta (Muse Spark)</option></select></div>
   <div class="field"><label for="gkey">Gemini API key</label><input class="tx" id="gkey" type="password" autocomplete="off" placeholder="วาง key ที่นี่ (ขึ้นต้น AIza)"><a class="klink" href="https://aistudio.google.com/apikey" target="_blank" rel="noopener">สร้าง Gemini key ↗</a></div>
   <div class="field"><label for="gmodel">โมเดล Gemini</label><input class="tx" id="gmodel" type="text" autocomplete="off"></div>
   <div class="field"><label for="okey">OpenAI API key</label><input class="tx" id="okey" type="password" autocomplete="off" placeholder="sk-..."><a class="klink" href="https://platform.openai.com/api-keys" target="_blank" rel="noopener">สร้าง OpenAI key ↗</a></div>
   <div class="field"><label for="omodel">โมเดล OpenAI</label><input class="tx" id="omodel" type="text" autocomplete="off"></div>
   <div class="field"><label for="akey">Claude API key</label><input class="tx" id="akey" type="password" autocomplete="off" placeholder="sk-ant-..."><a class="klink" href="https://platform.claude.com/settings/keys" target="_blank" rel="noopener">สร้าง Claude key ↗</a></div>
   <div class="field"><label for="amodel">โมเดล Claude</label><input class="tx" id="amodel" type="text" autocomplete="off" list="amodels"><datalist id="amodels"><option value="claude-opus-5-5"><option value="claude-sonnet-5-5"><option value="claude-haiku-5-5"></datalist></div>
   <div class="field"><label for="mkey">Meta API key</label><input class="tx" id="mkey" type="password" autocomplete="off" placeholder="วาง Meta Model API key"><a class="klink" href="https://dev.meta.ai/" target="_blank" rel="noopener">สร้าง Meta key ↗</a></div>
   <div class="field"><label for="mmodel">โมเดล Meta</label><input class="tx" id="mmodel" type="text" autocomplete="off" list="mmodels"><datalist id="mmodels"><option value="muse-spark-1.3"><option value="muse-spark-1.3-contributor"></datalist></div>
   <div class="btns"><button class="primary" id="aisave">บันทึก</button><button class="ghost" id="aitest">ทดสอบ</button><button class="ghost" id="aiclear">ลบ key</button></div>
   <p class="hint" id="aistat"></p>
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
<p class="hint">key ถูกเก็บไว้ในเบราว์เซอร์ของเครื่องนี้เท่านั้น อย่าใช้ในเครื่องสาธารณะ และอย่าส่ง key ให้คนอื่น ค่าใช้จ่ายคิดกับบัญชีของ key นั้น</p>`;
  const $=id=>document.getElementById(id);
  $('aiprov').value=AIP.provider;$('gkey').value=g.key;$('gmodel').value=g.model;$('okey').value=o.key;$('omodel').value=o.model;$('akey').value=AIP.anthropic.key;$('amodel').value=AIP.anthropic.model;$('mkey').value=AIP.meta.key;$('mmodel').value=AIP.meta.model;
  const read=()=>{AIP.provider=$('aiprov').value;AIP.gemini={key:$('gkey').value.trim(),model:$('gmodel').value.trim()||'gemini-flash-latest'};AIP.openai={key:$('okey').value.trim(),model:$('omodel').value.trim()||'gpt-5-mini'};AIP.anthropic={key:$('akey').value.trim(),model:$('amodel').value.trim()||'claude-opus-5-5'};AIP.meta={key:$('mkey').value.trim(),model:$('mmodel').value.trim()||'muse-spark-1.3'}};
  const stat=(t,c)=>{const e=$('aistat');e.textContent=t;e.className='hint '+(c||'')};
  $('aisave').onclick=()=>{read();saveAI();renderAISet();aiChanged();document.getElementById('aistat').textContent=activeAI()?`บันทึกแล้ว ใช้ ${AINAME[activeAI()]}`:'บันทึกแล้ว แต่ยังไม่มี key ที่ใช้ได้'};
  $('aiclear').onclick=()=>{for(const x of KEY_PROVS)AIP[x].key='';saveAI();renderAISet();aiChanged();document.getElementById('aistat').textContent='ลบ key แล้ว'};
  $('aitest').onclick=async()=>{read();saveAI();const a2=activeAI();if(!a2){stat('ยังไม่มี key ให้ทดสอบ','err');return}
    stat(`กำลังทดสอบ ${AINAME[a2]}...`);
    try{const t=await aiText('ตอบกลับคำว่า พร้อม เพียงคำเดียว');stat(`${AINAME[a2]} ใช้งานได้ (โมเดล ${LAST_MODEL}) ตอบว่า: ${t.trim().slice(0,40)}`,'ok');renderAISetPill();aiChanged()}
    catch(e){stat(errCopy(e&&e.code,'ทดสอบ')+(e&&e.message?` (${String(e.message).slice(0,120)})`:''),'err')}};
}
function renderAISetPill(){const a=activeAI(),p=document.getElementById('aipill');if(p)p.textContent=a?AINAME[a]:'ยังไม่ตั้ง'}
function aiChanged(){document.querySelectorAll('.askbox').forEach(b=>b.hidden=!activeAI());if(typeof VIEW!=='undefined'&&VIEW==='mock'&&!M&&!G)renderMock();if(R&&(R.status==='needai'||R.status==='idle')){R.status=activeAI()?'idle':'needai';render()}}
onAppReady(async()=>{try{if(window.claude&&window.claude.use){SAMPLE=await window.claude.use('sample')}}catch(e){}aiReady=true;renderAISet();aiChanged()});

function genPrompt(s,level,n){
  const weak=(P.weak[s.id]||[]).slice(-5);
  return `สร้างข้อสอบใหม่ ${n} ข้อ วิชา "${s.name}" (${s.desc}) แนวข้อสอบความรู้ความสามารถทั่วไป ก.พ. และสอบราชการไทย
ระดับความยาก ${level}: ${levelTxt(level)}
รหัสชุด ${Math.random().toString(36).slice(2,8)} (ใช้เพื่อให้โจทย์ไม่ซ้ำกับชุดก่อน)
${weak.length?`ผู้ทำเคยตอบผิดในโจทย์แนวนี้ ให้มีโจทย์แนวคล้ายกันปนอยู่ 2–3 ข้อ (เปลี่ยนตัวเลขและเนื้อหา):\n- ${weak.join('\n- ')}\n`:''}
กติกา:
${VIZ_RULE}
- ทุกข้อมีตัวเลือก 4 ตัว ถูกเพียงตัวเดียว คละตำแหน่งคำตอบที่ถูก
- คิดคำตอบให้ถูกต้องแน่นอน ตรวจคำนวณซ้ำก่อนส่ง ห้ามมีข้อที่กำกวม
- ${s.id==='eng'?'โจทย์และตัวเลือกเป็นภาษาอังกฤษ ส่วนเฉลยอธิบายเป็นภาษาไทย':'ใช้ภาษาไทยทั้งหมด'}
- เฉลยแต่ละข้อมี 2–4 ขั้น สั้น ภาษาง่าย ห้ามข้ามขั้น แต่ละขั้นบอกที่มา (from) เช่น "โจทย์บอก" หรือ "คูณ 2 ทั้งสองข้าง"
- ห้ามใช้ markdown ในข้อความ ไม่ต้องใส่ ก ข ค ง หน้าตัวเลือก
ตอบเป็น JSON เท่านั้น รูปแบบ:
{"questions":[{"stem":"โจทย์","choices":["ตัวเลือก1","ตัวเลือก2","ตัวเลือก3","ตัวเลือก4"],"answer":0,"viz":null,"steps":[{"text":"ขั้นอธิบาย","from":"ที่มา"}]}]}`;
}
function cleanAI(data){
  const arr=Array.isArray(data)?data:(data&&Array.isArray(data.questions)?data.questions:[]);
  return arr.filter(q=>q&&typeof q.stem==='string'&&Array.isArray(q.choices)&&q.choices.length>=2&&Number.isInteger(q.answer)&&q.answer>=0&&q.answer<q.choices.length)
   .map(q=>({kind:'mc',topic:String(q.topic||''),ref:String(q.ref||''),card:String(q.card||''),fig:String(q.fig||''),viz:cleanViz(q.viz),stem:q.stem,choices:q.choices.slice(0,5).map(String),answer:q.answer,steps:(Array.isArray(q.steps)?q.steps:[]).map(s=>typeof s==='string'?[s,'']:[String(s.text||''),String(s.from||'')]).filter(s=>s[0])}));
}
