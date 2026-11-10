/* psc.js — วิชา "ผลิตภัณฑ์ ธ.ก.ส.": โจทย์จาก Product Catalog BAAC (psc.baac.tech)
   ข้อมูลเก็บใน Firestore config/psc (ข้อมูลรุ่น) + config/psc_p0.. (เนื้อหาแบ่งก้อน) → อ่านได้เฉพาะคนที่ล็อกอิน เขียนได้เฉพาะผู้ตรวจ/แอดมิน
   แอดมินกด "อัปเดต" (แท็บ Product Catalog ในหน้าตรวจอนุมัติ) → ดึงทุกเรื่องผ่าน API ของเว็บด้วย token ของแอดมิน (ไม่เก็บ token ขึ้นคลาวด์)
   เรื่องที่มีแต่รูป ให้ AI อ่านรูป · เรื่องที่ไม่เปลี่ยนใช้ของเดิม ไม่อ่านรูปซ้ำ
   หนึ่งเรื่อง = {id,mod,date,url,title,cat,memo,img,secs:[[หัวข้อ,เนื้อหา]]} · ตัดชื่อส่วนงาน เบอร์ภายใน และไฟล์แนบออก เก็บเลขที่บันทึกไว้ให้ศึกษาต่อ
   ทุกข้อบอกเรื่อง หัวข้อ เลขที่บันทึก และลิงก์หน้าผลิตภัณฑ์ไว้ในเฉลยเท่านั้น (เปิดได้เฉพาะคนที่มีสิทธิ์เข้าระบบ) */
/* แหล่งข้อมูลที่ใช้ตอนนี้: 'web' = เว็บไซต์ ธ.ก.ส. (www.baac.or.th/products เปิดสาธารณะ ไม่ต้องล็อกอิน Product Catalog)
   'catalog' = Product Catalog (สำรองไว้ ข้อมูลเดิมยังอยู่ใน config/psc · เปลี่ยนกลับได้ที่บรรทัดนี้บรรทัดเดียว) */
const PSC_SRC='web';
const PSC_WEB=PSC_SRC==='web',PSC_DOC=PSC_WEB?'pweb':'psc',PSC_LABEL=PSC_WEB?'เว็บไซต์ ธ.ก.ส.':PSC_LABEL;
let PSC=null,PSC_META=null,pscP=null;
const PSC_H={'ระยะเวลาดำเนินโครงการ':'ระยะเวลาโครงการ','ระยะเวลาดำเนินการ':'ระยะเวลาโครงการ','หลักประกันเงินกู้':'หลักประกัน','กำหนดระยะเวลาชำระคืนเงินกู้':'ระยะเวลาการกู้','ระยะเวลาการผ่อนชำระ':'ระยะเวลาการกู้',
  /* เว็บไซต์ ธ.ก.ส. */'วิธิการชำระ':'วิธีการชำระ','วัตถุประสงค์การกู้ยืม':'วัตถุประสงค์การกู้','อัตราดอกเบี้ยต่อปี':'อัตราดอกเบี้ย'};
/* เรื่องที่ไม่เอามาออกข้อสอบ: ปิดการรับฝาก / ยกเลิกแล้ว (ดูจากชื่อเรื่อง)
   ระวัง "…จนกว่าธนาคารแจ้งปิดการรับฝาก" ในเรื่องที่ยังเปิดอยู่ จึงจับเฉพาะขึ้นต้นชื่อเรื่อง หรือ "ปิดรับฝากแล้ว" */
const PSC_CLOSED=/^\s*[(（]?\s*(ปิด(การ)?รับฝาก|ยกเลิก)|[(（]\s*ปิด(การ)?(รับฝาก|จำหน่าย|ให้บริการ)\s*[)）]|ปิด(การ)?รับฝากแล้ว|ยกเลิก(ผลิตภัณฑ์|โครงการ|การให้บริการ|มาตรการ|แคมเปญ)?แล้ว/;
/* เรื่องเดียวกันหลายฉบับ (ปรับปรุงครั้งที่ / แก้ไขเพิ่มเติมครั้งที่): ใช้ฉบับปรับปรุงครั้งล่าสุด ถ้าเท่ากันใช้ฉบับที่อัปเดตล่าสุด */
const PSC_REV=/[(（]?\s*(?:ปรับปรุง|แก้ไขเพิ่มเติม|แก้ไข)\s*(?:ครั้งที่|ครั้ง)\s*(\d+)\s*[)）]?/g;
const pscRev=t=>{let n=0;for(const m of String(t).matchAll(PSC_REV))n=Math.max(n,+m[1]);return n};
const pscBase=t=>pscN(String(t).replace(PSC_REV,'').replace(/^\s*วิธีปฏิบัติ/,'').replace(/&/g,'')).replace(/^โครงการ/,'');
function pscActive(list){
  const best=new Map();
  for(const a of list){if(PSC_CLOSED.test(a.title))continue;const b=pscBase(a.title),o=best.get(b);
    if(!o||pscRev(a.title)>pscRev(o.title)||(pscRev(a.title)===pscRev(o.title)&&String(a.mod||a.date)>String(o.mod||o.date)))best.set(b,a)}
  return list.filter(a=>best.get(pscBase(a.title))===a);
}
let PSC_ALL=null;   /* ทุกเรื่องตามที่ดึงมา (ใช้ตอนอัปเดตเทียบของเดิม) · PSC = เฉพาะเรื่องที่ใช้ออกข้อสอบ */
/* เอกสาร PDF แนบของหน้าผลิตภัณฑ์: เก็บข้อความครั้งเดียวต่อไฟล์ ในเรื่องพิเศษ id "__docs" ({docs:{ลิงก์:{label,text}}})
   เพราะบางไฟล์ (ข้อตกลงการใช้บัตร ฯลฯ) ใช้ร่วมกันหลายผลิตภัณฑ์ · แต่ละเรื่องเก็บแค่ a.docs=[{label,url}] */
let PSC_DOCTXT={};
const PSC_DOCS_ID='__docs';
function setPSC(d){PSC_DOCTXT=(d.find(a=>a.id===PSC_DOCS_ID)||{}).docs||{};d=d.filter(a=>a.id!==PSC_DOCS_ID);PSC_ALL=d;PSC=pscActive(d).map((a,i)=>({...a,k:i,secs:a.secs.map(([h,v])=>[PSC_H[h]||h,v])}))}
/* ที่มาของข้อมูล:
   1. เข้าสู่ระบบเว็บนี้แล้ว → คลังกลาง (ครบรวมเรื่องที่ AI อ่านจากรูป)
   2. ไม่ได้เข้าสู่ระบบเว็บนี้ แต่เชื่อมต่อ Product Catalog แล้ว (มี token ของตัวเอง) → ดึงสดจาก Product Catalog เอง
      Product Catalog เป็นคนตรวจสิทธิ์พนักงาน (token ไม่ถูก = ไม่ได้ข้อมูล) · ไม่มีเรื่องที่มีแต่รูป */
function loadPSC(){
  if(PSC)return Promise.resolve(PSC);
  /* เน็ตช้า/คลังกลางไม่ตอบ: ไม่ปล่อยให้หมุนค้าง 25 วิแล้วขึ้นให้ลองใหม่ */
  return pscP=pscP||Promise.race([new Promise((_,no)=>setTimeout(()=>no({code:'psc_load'}),25000)),(async()=>{
    const me=typeof ME!=='undefined'&&ME,tk=PSC_WEB?null:pscTok();
    /* เว็บไซต์ ธ.ก.ส.: อ่านจากคลังกลางอย่างเดียว (เบราว์เซอร์อ่านเว็บ ธ.ก.ส. ตรงๆ ไม่ได้) */
    if(PSC_WEB&&!me)throw{code:'pweb_login'};
    if(me){try{
      const f=await fb(),m=await f.fs.getDoc(fsDoc('config',PSC_DOC));if(!m.exists())throw{code:'psc_empty'};
      const meta=m.data(),parts=await Promise.all([...Array(meta.parts)].map((_,i)=>f.fs.getDoc(fsDoc('config',PSC_DOC+'_p'+i))));
      setPSC(JSON.parse(parts.map(p=>p.data().d).join('')));PSC_META=meta;return PSC;
    }catch(e){if(!tk)throw e}}
    if(!tk)throw{code:'psc_login'};
    const {posts,cats}=await pscFetchAll(tk.token,tk.id);
    setPSC(posts.map(p=>pscParse(p,cats)).filter(a=>a.secs.length));PSC_META={live:true,n:PSC.length};return PSC;
  })()]).catch(e=>{pscP=null;throw e&&e.code?e:{code:'psc_load'}});
}
/* ดึงทุกเรื่องจาก API ของ Product Catalog ด้วย token (เว็บนั้นอนุญาตเว็บสอบนี้ไว้แล้ว) */
async function pscFetchAll(token,uid,{onProg=()=>{},signal}={}){
  const api=(path,q)=>`https://psc.baac.tech/wp-json/wp/v2/${path}?${q}&token=${encodeURIComponent(token)}${uid?`&id=${encodeURIComponent(uid)}`:''}`;
  const get=async url=>{let r;try{r=await fetch(url,{credentials:'omit',signal})}/* token ผิด/หมดอายุ: เว็บตอบหน้าล็อกอินที่ไม่มีสิทธิ์ข้ามเว็บ เบราว์เซอร์จึงขึ้นเป็น error เครือข่าย */
    catch(e){throw{code:e&&e.name==='AbortError'?'cancelled':navigator.onLine===false?'psc_net':'psc_token'}}
    const t=await r.text();if(!r.ok||!/^\s*[\[{]/.test(t))throw{code:/sklogin/.test(t)?'psc_token':'psc_net'};return{d:JSON.parse(t),pages:+r.headers.get('X-WP-TotalPages')||1}};
  onProg('กำลังอ่านรายชื่อหมวด…');
  const cats=Object.fromEntries((await get(api('categories','per_page=100&_fields=id,name'))).d.map(c=>[c.id,pscUnesc(c.name)]));
  const posts=[];for(let pg=1,n=1;pg<=n;pg++){onProg(`กำลังดึงเรื่อง หน้า ${pg}${n>1?`/${n}`:''}…`);const r=await get(api('posts',`per_page=100&page=${pg}&_fields=id,modified,link,title,content,categories`));n=r.pages;posts.push(...r.d)}
  return{posts,cats};
}

/* ---------- อ่านเรื่องจากเว็บ ---------- */
const PSC_SKIP=/ส่วนงาน|ผู้ประสานงาน|^คู่มือ|^แบบพิมพ์|^Sale Sheet|ผู้รับผิดชอบ|ติดต่อ|เบอร์โทร|^เอกสารแนบ/;
const PSC_PHONE=/(?:Wan|โทร|Tel)\.?\s*[\d\s,\-–]{4,}|https?:\/\/\S+/gi;
const PSC_MEMO=/[ก-ฮ]{1,4}\.?\/ว\.?\s*\d+(?:\s*(?:ลว\.?|ลงวันที่)\s*\d{1,2}\s*[ก-๙.]+\s*\.?\s*\d{2,4})?/;
const pscMemo=t=>{const m=String(t||'').match(PSC_MEMO);return m?m[0].replace(/\s+/g,' ').trim():''};
const pscUnesc=t=>{const d=document.createElement('textarea');d.innerHTML=t;return d.value};
function pscTxt(h){
  h=h.replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi,'').replace(/<img[^>]*>/gi,'').replace(/<\/(p|div|h\d|li)>|<br\s*\/?>/gi,'\n').replace(/<[^>]+>/g,'');
  return pscUnesc(h).replace(/ /g,' ').replace(/​/g,'').split('\n').map(x=>x.replace(/\s+/g,' ').trim()).filter(Boolean).join('\n');
}
function pscParse(p,cats){
  const c=p.content.rendered,secs=[];let memo='';
  for(const tr of c.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi)||[]){
    const tds=(tr.match(/<t[dh][^>]*>[\s\S]*?<\/t[dh]>/gi)||[]).map(pscTxt).filter(Boolean);if(tds.length<2)continue;
    const h=tds[0].replace(/\n/g,' '),v=tds.slice(1).join('\n');
    if(/เลขที่บันทึก/.test(h)){memo=memo||pscMemo(v);continue}
    if(h.length>60||PSC_SKIP.test(h)||v.length<3)continue;
    const vv=v.replace(PSC_PHONE,'').trim();if(vv.length>=3)secs.push([h,vv]);
  }
  /* เรื่องที่ไม่ได้ใช้ตาราง หรือในตารางมีน้อย: เก็บเนื้อหานอกตารางเป็นหัวข้อ "รายละเอียด" */
  if(secs.reduce((a,s)=>a+s[1].length,0)<300){
    const t=pscTxt(c.replace(/<table[\s\S]*?<\/table>/gi,'')).split('\n').filter(l=>!PSC_SKIP.test(l)).join('\n').replace(PSC_PHONE,'').trim();
    if(t.length>=120)secs.push(['รายละเอียด',t]);
  }
  if(!memo)memo=pscMemo(pscTxt(c));
  /* รูปในเรื่อง (ใช้ขนาดใหญ่สุดใน srcset ไม่เกิน 1600px) */
  const img=[];for(const t of c.match(/<img[^>]+>/gi)||[]){
    let u=(t.match(/\ssrc="([^"]+)"/)||[])[1];const ss=(t.match(/srcset="([^"]+)"/)||[])[1];
    if(ss){const best=ss.split(',').map(x=>x.trim().split(/\s+/)).map(([s,w])=>[s,parseInt(w)||0]).filter(x=>x[1]<=1600).sort((a,b)=>b[1]-a[1])[0];if(best)u=best[0]}
    if(u&&/^https:\/\/psc\.baac\.tech\//.test(u)&&!/icon|logo|emoji/i.test(u)&&!img.includes(u))img.push(u);
  }
  return{id:p.id,mod:p.modified,date:String(p.modified).slice(0,10),url:p.link,title:pscUnesc(p.title.rendered).trim(),
    cat:(p.categories||[]).map(x=>cats[x]).filter(x=>x&&x!=='Uncategorized'),memo,secs,imgs:img.slice(0,4)};
}
const pscLen=a=>a.secs.reduce((x,s)=>x+s[1].length,0);
/* เรื่องที่เนื้อหาเป็นตัวหนังสือน้อย แต่มีรูป → ให้ AI อ่านรูป */
const pscNeedImg=a=>a.imgs.length&&pscLen(a)<400;
/* AI เข้า psc.baac.tech ไม่ได้ (เว็บเปิดเฉพาะบางเครือข่าย) และเบราว์เซอร์อ่านรูปข้ามเว็บเองไม่ได้
   → ให้ตัวช่วยในเครื่องแอดมิน (tools/psc-img-helper.bat, localhost:8795) โหลดรูปให้ แล้วส่งตัวรูปให้ AI */
const PSC_HELPER='http://localhost:8795';
async function pscHelperOK(){try{const r=await fetch(PSC_HELPER+'/ping',{signal:AbortSignal.timeout(2500)});return r.ok}catch(e){return false}}
/* เปิดตัวช่วยเอง: ลิงก์ baacpsc://start (ติดตั้งครั้งเดียวด้วย tools\install-psc-helper.ps1) ต้องเรียกตอนกดปุ่มทันที
   Chrome ถามครั้งแรกว่าจะเปิดโปรแกรมไหม ติ๊ก "อนุญาตเสมอ" ครั้งต่อไปจะเปิดเองเงียบๆ · รอให้ตัวช่วยตอบไม่เกิน 20 วิ */
async function pscStartHelper(){
  /* เปิดจากหน้าหลักโดยตรง (Chrome ไม่เปิดลิงก์โปรแกรมจาก iframe ที่ซ่อนไว้) หน้าเว็บไม่เปลี่ยนเพราะเป็นลิงก์ของโปรแกรม */
  location.href='baacpsc://start';
  for(let i=0;i<20;i++){await new Promise(r=>setTimeout(r,1000));if(await pscHelperOK())return true}
  return false;
}
const pscB64=b=>new Promise((ok,no)=>{const f=new FileReader();f.onload=()=>ok(String(f.result).split(',')[1]);f.onerror=no;f.readAsDataURL(b)});
async function pscImgData(url,signal){
  for(const via of [url,`${PSC_HELPER}/img?u=${encodeURIComponent(url)}`]){
    try{const r=await fetch(via,{signal:signal||AbortSignal.timeout(40000)});if(!r.ok)continue;const b=await r.blob();if(!/^image\//.test(b.type))continue;return{mime:b.type,data:await pscB64(b)}}
    catch(e){if(signal&&signal.aborted)throw{code:'cancelled'}}
  }
  return null;
}
async function pscReadImg(a,signal){
  const images=[];for(const u of a.imgs){const im=await pscImgData(u,signal);if(im)images.push(im)}
  if(!images.length)throw{code:'psc_helper'};
  const r=await aiVisionJSON(`ภาพต่อไปนี้มาจาก Product Catalog ของ ธ.ก.ส. เรื่อง "${a.title}"
${a.secs.length?`ข้อความในหน้าเว็บ:\n${a.secs.map(([h,v])=>`${h}: ${v}`).join('\n')}\n`:''}
ถอดข้อมูลผลิตภัณฑ์ แคมเปญ หรือโครงการในภาพออกมาเป็นหัวข้อกับเนื้อหา เช่น วัตถุประสงค์ กลุ่มเป้าหมาย คุณสมบัติ ระยะเวลา เงื่อนไข สิทธิประโยชน์ อัตราดอกเบี้ย ของรางวัล วิธีเข้าร่วม
- คัดลอกตัวเลข วันที่ จำนวนเงิน และเงื่อนไขตามภาพทุกตัวอักษร ห้ามเดา ห้ามเติมสิ่งที่ไม่มีในภาพ ส่วนที่อ่านไม่ออกให้ข้าม
- ไม่ต้องใส่เบอร์โทร ชื่อคน QR code หรือคำโฆษณาที่ไม่มีข้อมูล
- ถ้าภาพไม่มีข้อมูลที่ใช้ออกข้อสอบได้ ให้ secs เป็น []
ตอบเป็น JSON เท่านั้น: {"secs":[["หัวข้อ","เนื้อหา"]]}`,images,{signal,task:'proc'});
  const s=(r&&Array.isArray(r.secs)?r.secs:[]).filter(x=>Array.isArray(x)&&x[0]&&x[1]).map(([h,v])=>[String(h).slice(0,60),String(v).replace(PSC_PHONE,'').trim()]).filter(x=>x[1].length>=3);
  return s;
}
/* ดึงทั้งหมด → แยกหัวข้อ → อ่านรูป → บันทึกขึ้นคลาวด์ (save=false ใช้ทดสอบ ไม่บันทึก) */
async function pscSave(clean,onProg){
  onProg('กำลังบันทึกขึ้นคลังกลาง…');
  const f=await fb(),json=JSON.stringify(clean),parts=[];
  /* Firestore จำกัดเอกสารละ 1MB: แบ่งก้อนละไม่เกิน ~250,000 ตัวอักษร (ภาษาไทย 3 ไบต์ต่อตัว) */
  for(let i=0;i<json.length;i+=250000)parts.push(json.slice(i,i+250000));
  for(let i=0;i<parts.length;i++)await f.fs.setDoc(fsDoc('config',PSC_DOC+'_p'+i),{d:parts[i]});
  await f.fs.setDoc(fsDoc('config',PSC_DOC),{ver:Date.now(),parts:parts.length,n:clean.length,img:clean.filter(a=>a.img).length,at:f.fs.serverTimestamp(),by:ME.name||''});
}

/* ---------- เว็บไซต์ ธ.ก.ส. (www.baac.or.th/products) ----------
   หน้าผลิตภัณฑ์เป็น Next.js: ข้อมูลทุกส่วนอยู่ใน self.__next_f.push([1,"…"]) เป็น {"component":"ชื่อ","data":{…}}
   ใช้ DetailTabs (หัวข้อรายละเอียด) + InfoTable (ตารางดอกเบี้ย/ความคุ้มครอง) + Accordion (คำถามที่พบบ่อย) + Highlight (ชื่อ คำโปรย)
   หน้าที่รวมหลายผลิตภัณฑ์ (แต่ละแท็บมี "ชื่อผลิตภัณฑ์") แยกเป็นเรื่องละผลิตภัณฑ์ */
const PWEB='https://www.baac.or.th';
const PWEB_CATS={loan:'สินเชื่อ',deposit:'เงินฝาก',lottery:'สลากออมทรัพย์',insurance:'ประกันภัย','life-deposit':'ประกันชีวิต','insurance-services':'ประกันภัย',card:'บัตร',digital:'ดิจิทัลแบงก์กิ้ง',service:'บริการ','international-transaction':'ธุรกรรมต่างประเทศ'};
function pwebJSONAt(t,i){
  let d=0,s=false;
  for(let j=i;j<t.length;j++){const c=t[j];
    if(s){if(c==='\\')j++;else if(c==='"')s=false;continue}
    if(c==='"')s=true;else if(c==='{'||c==='[')d++;else if(c==='}'||c===']'){if(!--d){try{return JSON.parse(t.slice(i,j+1))}catch(e){return null}}}}
  return null;
}
function pwebComps(html){
  const t=[...html.matchAll(/self\.__next_f\.push\(\[1,("(?:[^"\\]|\\.)*")\]\)/g)].map(m=>{try{return JSON.parse(m[1])}catch(e){return''}}).join(''),out=[];
  for(const m of t.matchAll(/\{"component":"([A-Za-z]+)","data":/g)){const o=pwebJSONAt(t,m.index+m[0].length);if(o)out.push([m[1],o])}
  return out;
}
const pwebT=h=>pscTxt(String(h||'')).replace(/\n/g,' ').trim();
const pscHash=s=>{let h=5381;for(let i=0;i<s.length;i++)h=(h*33+s.charCodeAt(i))|0;return(h>>>0).toString(36)};
/* ตาราง → บรรทัดละแถว "ช่อง | ช่อง" */
function pwebTable(tb){
  const rows=[];const one=x=>{if(!x)return;const hd=(x.header||[]).map(c=>[pwebT(c.content),...(c.subColumns||[]).map(s=>pwebT(s.content))].filter(Boolean).join(' / '));
    if(x.tableTitle)rows.push(pwebT(x.tableTitle));if(hd.some(Boolean))rows.push(hd.join(' | '));for(const r of x.rows||[])rows.push(r.map(c=>pwebT(c.content)).join(' | '))};
  one(tb.table);for(const x of tb.stackTable||[])one(x);if(tb.remark)rows.push(pscTxt(tb.remark.content||''));
  return rows.filter(Boolean).join('\n');
}
function pwebParse(html,url){
  const cs=pwebComps(html),get=n=>cs.filter(c=>c[0]===n).map(c=>c[1]);
  const path=url.replace(PWEB,'').replace(/[?#].*$/,''),cat=PWEB_CATS[path.split('/')[2]]||'',date=new Date().toISOString().slice(0,10);
  const hl=get('Highlight')[0]||{},nav=get('LocalNav')[0]||{};
  const title=pwebT(hl.title||nav.title||(html.match(/<title>([^<|]*)/)||[])[1]||'');
  const sec=s=>[pwebT(s.title).slice(0,80),pscTxt(String(s.content||'')).replace(PSC_PHONE,'').trim()];
  const tabs=get('DetailTabs').flatMap(d=>d.items||[]);
  /* ส่วนเสริม: ตาราง คำถามที่พบบ่อย คำโปรย (AI ใช้ประกอบ · ไม่ใช้ออกโจทย์แบบระบบโดยตรง) */
  const extra=[];
  if(hl.desc)extra.push(['ภาพรวม',pwebT(hl.desc)]);
  for(const it of get('InfoTable'))for(const tb of it.tables||[]){const v=pwebTable(tb);if(v.length>=10)extra.push([`ตาราง${pwebT(it.title)||''}`,v])}
  const faq=get('Accordion').flatMap(a=>a.items||[]).map(x=>`ถาม: ${pwebT(x.title)}\nตอบ: ${pscTxt(String(x.content||''))}`).join('\n');
  if(faq)extra.push(['คำถามที่พบบ่อย',faq]);
  /* เอกสารดาวน์โหลด (PDF) ของหน้านี้ ใช้กับทุกผลิตภัณฑ์ในหน้า */
  const docs=get('DocumentDownload').flatMap(d=>d.documents||[]).filter(d=>d.src&&/\.pdf$/i.test(d.src)).map(d=>({label:pwebT(d.label)||'เอกสาร',url:/^https?:/.test(d.src)?d.src:PWEB+d.src}));
  const mk=(id,t,secs)=>{secs=secs.filter(([h,v])=>h&&v.length>=2&&!/^ชื่อผลิตภัณฑ์$|^ช่องทาง/.test(h));
    return{id,url,title:t,cat:cat?[cat]:[],date,memo:'',imgs:[],secs,docs,mod:pscHash(JSON.stringify([t,secs,docs]))}};
  const named=tabs.filter(it=>(it.sections||[]).some(s=>pwebT(s.title)==='ชื่อผลิตภัณฑ์'));
  if(named.length>=2)return named.map(it=>{const nm=pwebT((it.sections.find(s=>pwebT(s.title)==='ชื่อผลิตภัณฑ์')||{}).content)||pwebT(it.title);
    return mk(`${path}#${it.id||it.order}`,nm,it.sections.map(sec))}).filter(a=>a.secs.length);
  const a=mk(path,title,[...tabs.flatMap(it=>(it.sections||[]).map(sec)),...extra]);
  return a.title&&tabs.length?[a]:[];
}
async function pwebGet(url,signal){
  let r;try{r=await fetch(`${PSC_HELPER}/page?u=${encodeURIComponent(url)}`,{signal:signal||AbortSignal.timeout(60000)})}
  catch(e){throw{code:signal&&signal.aborted?'cancelled':'psc_helper'}}
  if(!r.ok)throw{code:'psc_net'};return r.text();
}
/* ดาวน์โหลด PDF แนบทุกไฟล์ (ไฟล์ละครั้ง) ผ่านตัวช่วย แล้วถอดข้อความด้วย pdf.js (readPDF ใน kb.js)
   ไฟล์ที่โหลด/อ่านไม่ได้ใช้ข้อความเดิม · หน้าที่เป็นรูป (ไม่มีชั้นข้อความ) ข้ามไป */
const PSC_DOC_MAX=20000;
async function pwebDocs(arts,{onProg=()=>{},signal,rep={}}={}){
  const old=PSC_DOCTXT||{},urls=[...new Set(arts.flatMap(a=>(a.docs||[]).map(d=>d.url)))],label={};
  for(const a of arts)for(const d of a.docs||[])label[d.url]=label[d.url]||d.label;
  const out={};let i=0,done=0;rep.docs=urls.length;rep.docFail=0;rep.docEmpty=0;
  await Promise.all([...Array(3)].map(async()=>{while(i<urls.length){const u=urls[i++];
    try{
      let r;try{r=await fetch(`${PSC_HELPER}/doc?u=${encodeURIComponent(u)}`,{signal:signal||AbortSignal.timeout(90000)})}catch(e){if(signal&&signal.aborted)throw{code:'cancelled'};throw e}
      if(!r.ok)throw new Error('http '+r.status);
      const p=await readPDF(await r.arrayBuffer()),bad=new Set(p.bad);
      const text=p.pages.filter(x=>!bad.has(x.n)).map(x=>x.text).join('\n').replace(PSC_PHONE,'').trim().slice(0,PSC_DOC_MAX);
      if(text.length<50){rep.docEmpty++;if(old[u])out[u]=old[u]}else out[u]={label:label[u],text};
    }catch(e){if(e&&e.code==='cancelled')throw e;rep.docFail++;if(old[u])out[u]=old[u]}
    onProg(`กำลังอ่านเอกสาร PDF ${++done}/${urls.length}…`)}}));
  return out;
}
async function pwebUpdate({onProg=()=>{},save=true,signal}={}){
  if(!await pscHelperOK())throw{code:'psc_helper'};
  const urls=new Set();
  for(const c of Object.keys(PWEB_CATS)){onProg(`กำลังอ่านรายการ${PWEB_CATS[c]}…`);
    let h='';try{h=await pwebGet(`${PWEB}/products/${c}`,signal)}catch(e){if(e.code==='cancelled')throw e;continue}
    /* ลิงก์อยู่ทั้งใน href และในข้อมูลของหน้า ("link":"/products/…") · ไม่เอาที่อยู่รูป/ไฟล์ (/img/page/products/…/…) */
    for(const m of h.matchAll(/(?<![\w/])\/products\/([a-z0-9-]+)\/([a-z0-9-]+)(?=["\\?#])/g))if(PWEB_CATS[m[1]])urls.add(`${PWEB}/products/${m[1]}/${m[2]}`);}
  if(!urls.size)throw{code:'psc_net'};
  let old=[];try{await loadPSC();old=PSC_ALL||[]}catch(e){}
  const prev=new Map(old.map(a=>[a.id,a])),list=[...urls].sort(),out=[],rep={total:list.length,added:0,changed:0,removed:0,skipped:0,img:0,imgFail:0,imgErr:'',fail:0};
  /* อ่านพร้อมกันทีละ 4 หน้า */
  let i=0,done=0;
  await Promise.all([...Array(4)].map(async()=>{while(i<list.length){const u=list[i++];
    try{const arts=pwebParse(await pwebGet(u,signal),u);if(!arts.length)rep.skipped++;
      for(const a of arts){const o=prev.get(a.id);if(o&&o.mod===a.mod){out.push(o);continue}if(o)rep.changed++;else rep.added++;out.push(a)}}
    /* อ่านหน้านี้ไม่ได้: ใช้ข้อมูลเดิมของหน้านี้ต่อ ไม่ลบทิ้ง */
    catch(e){if(e.code==='cancelled')throw e;rep.fail++;out.push(...old.filter(a=>a.url===u))}
    onProg(`กำลังอ่านหน้าผลิตภัณฑ์ ${++done}/${list.length}…`)}}));
  if(!out.length)throw{code:'psc_net'};
  out.sort((x,y)=>x.id<y.id?-1:1);
  const ids=new Set(out.map(a=>a.id));rep.removed=old.filter(a=>!ids.has(a.id)).length;rep.n=out.length;
  const docs=await pwebDocs(out,{onProg,signal,rep});
  const clean=[...out.map(({k,_fn,...a})=>a),{id:PSC_DOCS_ID,title:'',secs:[],docs}];
  if(save)await pscSave(clean,onProg);
  setPSC(clean);PSC_META={...(PSC_META||{}),n:out.length,parts:0,ver:Date.now(),img:0};pscP=null;
  return rep;
}

async function pscUpdate(link,{onProg=()=>{},readImg=true,save=true,signal}={}){
  if(PSC_WEB)return pwebUpdate({onProg,save,signal});
  const u=new URL(link),token=u.searchParams.get('token'),uid=u.searchParams.get('id');if(!token)throw{code:'psc_token'};
  const {posts,cats}=await pscFetchAll(token,uid,{onProg,signal});
  let old=[];try{await loadPSC();old=PSC_ALL||[]}catch(e){}
  const prev=new Map(old.map(a=>[a.id,a])),rep={total:posts.length,added:0,changed:0,removed:0,skipped:0,img:0,imgFail:0,imgErr:''};
  const out=[];
  for(const p of posts){
    const o=prev.get(p.id);
    if(o&&o.mod===p.modified&&(!o.needImg||!readImg)){out.push(o);continue}
    const a=pscParse(p,cats);
    if(pscNeedImg(a)){
      if(o&&o.mod===p.modified&&o.img){out.push(o);continue}
      if(readImg){onProg(`AI กำลังอ่านรูป: ${a.title.slice(0,40)}…`);
        try{const s=await pscReadImg(a,signal);if(s.length){a.secs=[...a.secs.filter(x=>x[0]!=='รายละเอียด'||x[1].length>=120),...s];a.img=true;rep.img++}else a.needImg=false}
        catch(e){if(e&&e.code==='cancelled')throw e;a.needImg=true;rep.imgFail++;rep.imgErr=rep.imgErr||(e&&e.code)||'error';if(e&&e.code==='psc_helper')readImg=false}}
      else a.needImg=true;
    }
    if(!a.secs.length){rep.skipped++;continue}
    if(o)rep.changed++;else rep.added++;
    out.push(a);
  }
  const ids=new Set(out.map(a=>a.id));rep.removed=old.filter(a=>!ids.has(a.id)).length;rep.n=out.length;
  const clean=out.map(({k,...a})=>a);
  if(save)await pscSave(clean,onProg);
  setPSC(clean);PSC_META={...(PSC_META||{}),n:clean.length,parts:0,ver:Date.now(),img:clean.filter(a=>a.img).length};pscP=null;
  return rep;
}

/* ---------- ตัวช่วยออกโจทย์ ---------- */
const PSC_NOQ=new Set(['รายละเอียด']);
const pscN=t=>String(t).replace(/[\s.,()\-–:;"'“”/]/g,'').toLowerCase();
/* ความคล้ายของข้อความ (สัดส่วนคู่ตัวอักษรที่ซ้ำกัน) เกิน 0.7 = ตัวเลือกแยกยาก ไม่ใช้ */
const pscBi=t=>{const s=new Set();for(let i=0;i<t.length-1;i++)s.add(t.slice(i,i+2));return s};
const pscSim=(a,b)=>{const x=pscBi(a),y=pscBi(b);let c=0;for(const k of x)if(y.has(k))c++;return c/Math.max(1,Math.min(x.size,y.size))};
const pscNear=(n,list)=>list.some(u=>u.includes(n)||n.includes(u)||pscSim(u,n)>.7);
function pscClip(v,lim=200){
  const ls=String(v).split('\n');let o='';
  /* บรรทัดเกริ่น ("…ดังนี้" "…:") ต้องมีบรรทัดเนื้อหาตามมาด้วยเสมอ ไม่งั้นตัวเลือกไม่มีสาระ */
  for(const l of ls){if(!o){o=l;continue}if((o+' '+l).length>lim&&!PSC_INTRO.test(o))break;o+=' '+l}
  if(o.length>lim){const c=o.lastIndexOf(' ',lim);o=o.slice(0,c>lim*.6?c:lim)+' …'}
  return o;
}
/* หัวข้อที่เป็นสาระของผลิตภัณฑ์ (ใช้ออกโจทย์ได้) · ตัดขั้นตอนงานภายใน (ตรวจสอบรายชื่อ ส่งไฟล์ ระบบ เอกสาร อำนาจอนุมัติ ฯลฯ)
   และหัวข้อที่ที่จริงเป็นแถวตาราง (ตัวเลข ช่วงอายุ วันที่) */
const PSC_GOODH=/วัตถุประสงค์|คุณสมบัติ|คุณลักษณะ|กลุ่มเป้าหมาย|ผู้มีสิทธิ|วงเงิน|อัตรา|ดอกเบี้ย|ระยะเวลา|อายุสลาก|หลักประกัน|ค่าธรรมเนียม|ค่ารักษาบัญชี|เงื่อนไข|หลักเกณฑ์|คุ้มครอง|ประเภท|ลักษณะ|ชำระ|จำนวนเงิน|เบี้ย|ผู้รับผลประโยชน์|ทรัพย์|สิทธิประโยชน์|พื้นที่|หน่วยละ|เปิดรับฝาก|รอคอย|ความรับผิด|คืนดอกเบี้ย/;
const PSC_BADH=/^ตาราง|^คำถามที่พบบ่อย|^ภาพรวม|ตรวจสอบ|ระบบ|ช่องทาง|ขั้นตอน|แนวทาง|การดำเนิน|อำนาจ|มอบ|เอกสาร|นโยบายบัญชี|จัดชั้น|รหัสโครงการ|ชื่อโครงการ|ชื่อผลิตภัณฑ์|บันทึก|เคลม|สร้างบัญชี|วิธีปฏิบัติ|ข้อควรระวัง|ตรวจเยี่ยม|ต่างสาขา|การเบิก|อนุมัติ/;
const pscOkH=h=>!!h&&PSC_GOODH.test(h)&&!PSC_BADH.test(h)&&!/^[\d*.\s–-]/.test(h);
/* หัวข้อที่เป็นข้อเท็จจริงเฉพาะของแต่ละเรื่อง (ตัวเลข/คุณสมบัติ) ใช้กับโจทย์ "ข้อใดถูกต้อง" เพราะเงื่อนไขทั่วไปของเรื่องอื่นอาจจริงกับเรื่องนี้ด้วย */
const PSC_FACTH=/อัตรา|ดอกเบี้ย|วงเงิน|ระยะเวลา|ค่าธรรมเนียม|จำนวนเงิน|อายุสลาก|หน่วยละ|เบี้ย|หลักประกัน|วัตถุประสงค์/;
const PSC_INTRO=/(ดังนี้|ดังต่อไปนี้|ได้แก่|[:：])\s*[-–]?\s*$/;
/* ตัวเลือกที่ใช้ไม่ได้: ประโยคเกริ่นที่ไม่มีเนื้อหา ชื่อไฟล์/รหัสระบบ */
/* ชื่อบุคคลจริง (คำนำหน้า + ชื่อ + นามสกุล) ไม่เอามาออกข้อสอบ */
const PSC_PERSON=/(?:^|[\s(])(?:นาย|นางสาว|นาง|น\.ส\.|ด\.ช\.|ด\.ญ\.|[จสรพ]\.\s?[สตอท]\.\s?[อทตส]\.|พล\.\s?[ตอท]\.|ร\.ต\.[อทต]\.|ส\.อ\.|จ\.อ\.|พ\.จ\.อ\.)\s*[ก-๙]{2,}\s+[ก-๙]{2,}/;
const pscBadV=t=>{const x=String(t).replace(/\s*…$/,'').trim();return PSC_INTRO.test(x)||PSC_PERSON.test(x)||/\.(csv|xlsx?|pdf|docx?)\b|_[A-Z]{2,}[A-Z0-9_]*/i.test(x)||(x.length<3&&!/\d/.test(x))};
const pscSec=(a,h)=>{const s=a.secs.find(x=>x[0]===h);return s?s[1]:''};
const pscAll=a=>a.secs.map(([h,v])=>`${h}: ${v}`).join('\n');
/* เนื้อหาเต็ม = หน้าเว็บ + เอกสาร PDF แนบ (เอกสารเฉพาะของผลิตภัณฑ์ก่อน เอกสารที่ใช้ร่วมกันหลายผลิตภัณฑ์ไว้ท้าย)
   ใช้ให้ AI สร้างโจทย์/ตรวจเฉลย และกันตัวลวงที่ที่จริงถูกตามเอกสาร */
const pscDocUse=()=>{const m={};for(const a of PSC||[])for(const d of a.docs||[])m[d.url]=(m[d.url]||0)+1;return m};
function pscFull(a,ai){
  const ds=(a.docs||[]).filter(d=>PSC_DOCTXT[d.url]&&PSC_DOCTXT[d.url].text);if(!ds.length)return pscAll(a);
  const use=ai?pscDocUse():{};ds.sort((x,y)=>(use[x.url]||0)-(use[y.url]||0));
  return pscAll(a)+ds.map(d=>`\n\nเอกสารแนบ "${d.label}":\n${PSC_DOCTXT[d.url].text}`).join('');
}
const pscFullN=a=>a._fn||(a._fn=pscN(pscFull(a)));
const pscCat=c=>String(c||'').replace(/_/g,' · ');
/* ที่มา (แสดงในเฉลยเท่านั้น): เรื่อง หัวข้อ เลขที่บันทึก และลิงก์หน้าผลิตภัณฑ์ */
const pscCite=(a,h)=>({cite:`${PSC_LABEL} › ${a.title}${h&&!PSC_NOQ.has(h)?` › หัวข้อ${h}`:''}${a.memo?` · บันทึกที่ ${a.memo}`:''}${a.date?` · ${PSC_WEB?'ข้อมูล ณ':'ปรับปรุง'} ${a.date}`:''}`,citeUrl:a.url,srcText:pscFull(a).slice(0,14000),psc:a.id,pscMod:a.mod});
const pscImgNote=a=>a.img?[['ข้อมูลเรื่องนี้ AI อ่านจากภาพประกาศ ถ้าสงสัยให้เปิดหน้าผลิตภัณฑ์ตรวจอีกครั้ง','']]:[];
/* ซ่อนชื่อเรื่องในเนื้อหา ไม่ให้เฉลยตัวเอง */
const pscMask=(t,a)=>{let o=t;for(const x of [a.title,a.title.replace(/\s*\(.*?\)\s*/g,' ').trim()])if(x.length>=8)o=o.split(x).join('(โครงการนี้)');return o};
/* รายการย่อยในเนื้อหา (บรรทัด/ข้อ 1. 2. ...) */
const PSC_BUL=/^\(?\d+(\.\d+)*[.)]\s*|^[-•●▪*]\s*/;
/* ข้อที่ขึ้นต้นด้วยเลข/สัญลักษณ์ รวมบรรทัดต่อท้ายเข้าข้อเดียวกัน (บรรทัดในเว็บมักตัดกลางประโยค) */
function pscItemsOf(v){
  const ls=String(v).split('\n'),num=ls.filter(l=>PSC_BUL.test(l)).length>=2,out=[];
  for(const l of ls){if(!num||PSC_BUL.test(l)||!out.length)out.push(l.replace(PSC_BUL,'').trim());else out[out.length-1]+=' '+l.trim()}
  return out.filter(l=>l.length>=(num?15:25)&&l.length<=200&&!/[:：]$/.test(l));
}
/* เรื่องอื่น เรียงให้หมวดเดียวกันมาก่อนเมื่อระดับ 3 ขึ้นไป (แยกยากกว่า) */
const pscPool=(a,level,f)=>{const p=shuffle(PSC.filter(b=>b!==a&&(!f||f(b))));if(level>=3||PSC_WEB)p.sort((x,y)=>(y.cat[0]===a.cat[0])-(x.cat[0]===a.cat[0]));return p};
function pscOthers(a,h,k,level,clip){
  /* ตัวลวงต้องไม่ซ้ำ/ไม่คล้ายกัน และต้องไม่มีอยู่ในเนื้อหาของเรื่องนี้เอง (ไม่งั้นตัวลวงอาจถูกด้วย) */
  const me=clip(pscSec(a,h)),used=[pscN(me)],mine=pscFullN(a),own=pscItemsOf(pscSec(a,h)).map(pscN),out=[];
  for(const b of pscPool(a,level,b=>pscSec(b,h))){const v=clip(pscSec(b,h)),n=pscN(v.replace(/\s*…$/,''));
    if(n.length<6||pscBadV(v)||pscNear(n,used)||mine.includes(n)||own.some(o=>o.length>=15&&(n.includes(o)||pscSim(o,n)>.7)))continue;used.push(n);out.push([b,v]);if(out.length===k*4)break}
  /* เลือกตัวลวงที่หน้าตาคล้ายคำตอบ (มี/ไม่มีเลขข้อ 1. 2. และยาวใกล้กัน) ไม่งั้นคำตอบโดดออกมาจนเดาได้ */
  const num=t=>/(^|\s)\d+[.)]\s/.test(t),far=v=>(num(v)!==num(me)?2:0)+Math.abs(Math.log((v.length+20)/(me.length+20)));
  return out.sort((x,y)=>far(x[1])-far(y[1])).slice(0,k);
}
const pscHeads=()=>{const m=new Map();for(const a of PSC)for(const [h] of a.secs)if(!PSC_NOQ.has(h)&&pscOkH(h))m.set(h,(m.get(h)||0)+1);return[...m].filter(([,c])=>c>=4).map(([h])=>h)};
/* choices[0] = คำตอบที่ถูกเสมอ แล้วสลับ (keep: เรียงตามที่ให้มา เช่น ตัวเลขน้อยไปมาก) */
function pscQ(a,h,stem,choices,steps,keep){
  let ord=shuffle([0,1,2,3]);if(keep)ord=[0,1,2,3].sort((x,y)=>keep(choices[x])-keep(choices[y]));
  return{kind:'mc',stem,choices:ord.map(i=>choices[i]),answer:ord.indexOf(0),steps:[...steps,...pscImgNote(a)],topic:a.title,ph:h,...(keep?{keepOrder:true}:{}),...pscCite(a,h)};
}
/* ชื่อที่ใช้ในโจทย์/ตัวเลือก: ตัด "วิธีปฏิบัติ" นำหน้าและ "(แก้ไขเพิ่มเติมครั้งที่ n)" ออก เหลือชื่อผลิตภัณฑ์/โครงการ/มาตรการ (ที่มาในเฉลยยังใช้ชื่อเต็ม) */
const pscName=a=>String(a.title).replace(PSC_REV,' ').replace(/^\s*วิธีปฏิบัติ(ตาม|การ)?\s*/,'').replace(/\s+/g,' ').trim()||a.title;
const pscT=a=>`"${pscName(a)}"`;

/* 1. {หัวข้อ}ของเรื่อง X เป็นอย่างไร */
function pscT1(a,h,lv){
  const clip=v=>pscClip(v,lv>=4?260:200),mine=clip(pscSec(a,h));if(pscN(mine).length<6)return null;
  const o=pscOthers(a,h,3,lv,clip);if(o.length<3)return null;
  return pscQ(a,h,`${pscT(a)} กำหนด${h}ไว้อย่างไร`,[mine,...o.map(x=>pscMask(x[1],x[0]))],
    [[`${a.title} หัวข้อ${h}: ${pscClip(pscSec(a,h),600)}`,PSC_LABEL],[`ตัวเลือกอื่นเป็น${h}ของ ${o.map(x=>`"${x[0].title}"`).join(', ')}`,'']]);
}
/* 2. เนื้อหานี้เป็นของเรื่องใด */
function pscT2(a,h,lv){
  const lim=lv>=4?320:260,v=pscClip(pscSec(a,h),lim);if(pscN(v).length<20)return null;
  const o=pscOthers(a,h,3,lv,x=>pscClip(x,lim));if(o.length<3)return null;
  return pscQ(a,h,`${h}ต่อไปนี้ เป็นของผลิตภัณฑ์ โครงการ หรือมาตรการใด\n"${pscMask(v,a)}"`,[pscName(a),...o.map(x=>pscName(x[0]))],
    [[`เป็น${h}ของ "${a.title}"`,PSC_LABEL],[`ตัวเลือกอื่นมี${h}ต่างจากนี้ เช่น "${o[0][0].title}": ${pscClip(o[0][1],140)}`,'']]);
}
/* 3. ข้อใดถูกต้องเกี่ยวกับเรื่อง X (ตัวลวง = หัวข้อเดียวกันแต่เนื้อหาของเรื่องอื่น) */
function pscT3(a,lv){
  const hs=shuffle(a.secs.map(s=>s[0]).filter(h=>!PSC_NOQ.has(h)&&pscOkH(h)&&PSC_FACTH.test(h)&&pscN(pscSec(a,h)).length>=6&&!pscBadV(pscClip(pscSec(a,h),150))));if(hs.length<2)return null;
  const clip=v=>pscClip(v,150),tH=hs[0],ch=[`${tH}: ${clip(pscSec(a,tH))}`],steps=[];
  for(const h of [...hs.slice(1),...hs.slice(1),tH]){if(ch.length===4)break;const o=pscOthers(a,h,1,lv,clip)[0];if(!o)continue;
    const c=`${h}: ${pscMask(o[1],o[0])}`;if(pscNear(pscN(c),ch.map(pscN)))continue;ch.push(c);steps.push([`"${h}: ${pscClip(o[1],90)}" เป็นของ "${o[0].title}"`,''])}
  if(ch.length<4)return null;
  return pscQ(a,tH,`ข้อใดถูกต้องเกี่ยวกับ ${pscT(a)}`,ch,[[`${a.title} หัวข้อ${tH}: ${pscClip(pscSec(a,tH),500)}`,PSC_LABEL],...steps.slice(0,2)]);
}
/* 4. เติมตัวเลขในช่องว่าง (อัตรา วงเงิน จำนวนงวด ระยะเวลา) */
const PSC_NUM=/\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?/g;
function pscNumAlt(s){
  const comma=s.includes(','),dec=(s.split('.')[1]||'').length,x=+s.replace(/,/g,'');
  const st=dec?(dec>=2?.25:.5):x<10?1:x<50?5:x<200?10:x<1000?50:Math.pow(10,Math.floor(Math.log10(x))-1)*5;
  const fmt=v=>{let t=dec?v.toFixed(dec):String(Math.round(v));if(comma)t=Number(t).toLocaleString('en-US',{minimumFractionDigits:dec,maximumFractionDigits:dec});return t};
  /* สุ่มก่อนว่าคำตอบอยู่ลำดับที่เท่าไร (ตัวเลือกเรียงน้อยไปมาก) แล้วสร้างค่าที่น้อยกว่า/มากกว่าให้พอดี */
  const ok=v=>v>0&&(dec||Number.isInteger(v))&&v!==x,lo=[x-st,x-2*st,x/2,x-3*st].filter(ok),hi=[x+st,x+2*st,x*2,x+3*st].filter(ok);
  const k=Math.min(ri(0,3),lo.length),c=[...lo.slice(0,k),...hi.slice(0,3-k),...lo.slice(k),...hi.slice(3-k)].map(fmt);
  return [...new Set(c)].filter(t=>t!==s).slice(0,3);
}
function pscT4(a,h,lv){
  const ls=shuffle(String(pscSec(a,h)).split('\n').map(l=>l.replace(/^\(?\d+(\.\d+)*[.)]\s*/,'').trim()).filter(l=>l.length>=20&&l.length<=240));
  for(const l of ls){
    const ms=[...l.matchAll(PSC_NUM)].filter(m=>{const v=+m[0].replace(/,/g,'');const unit=/^\s*(ร้อยละ|%|ต่อปี|งวด|ปี|เดือน|บาท|ล้าน|วัน|ราย|คน|หน่วย|เท่า)/.test(l.slice(m.index+m[0].length));return v>0&&(unit||(!/^\d{1,2}$/.test(m[0])&&!/^\d{4}$/.test(m[0])))});
    if(!ms.length)continue;const m=rnd(ms),alt=pscNumAlt(m[0]);if(alt.length<3)continue;
    const blank=l.slice(0,m.index)+'____'+l.slice(m.index+m[0].length);
    return pscQ(a,h,`${h}ของ ${pscT(a)} ระบุว่า\n"${pscMask(blank,a)}"\nตัวเลขในช่องว่างคือข้อใด`,[m[0],...alt],[[`ข้อความเต็ม: ${l}`,`${a.title} หัวข้อ${h}`]],t=>+String(t).replace(/,/g,''));
  }
  return null;
}
/* 5. ข้อใด "ไม่ใช่" {หัวข้อ}ของเรื่อง X */
function pscT5(a,h,lv){
  const it=shuffle(pscItemsOf(pscSec(a,h))),pick=[];for(const x of it)if(pick.length<3&&!pscNear(pscN(x),pick.map(pscN)))pick.push(x);if(pick.length<3)return null;
  const mine=pscFullN(a),own=pscItemsOf(pscAll(a)).map(pscN);
  /* ตัวลวง (ข้อที่ "ไม่ใช่") ต้องไม่อยู่ในเรื่องนี้ และไม่คล้ายข้อใดของเรื่องนี้ */
  for(const b of pscPool(a,lv,b=>pscSec(b,h))){
    const f=pscItemsOf(pscSec(b,h)).find(x=>{const n=pscN(x);return n.length>=20&&!mine.includes(n)&&!pscNear(n,own)});
    if(f)return pscQ(a,h,`ข้อใด "ไม่ใช่" ${h}ของ ${pscT(a)}`,[pscMask(f,b),...pick],[[`"${pscClip(f,120)}" เป็น${h}ของ "${b.title}"`,PSC_LABEL],[`${h}ของ ${a.title}: ${pscClip(pscSec(a,h),400)}`,'']]);
  }
  return null;
}
/* 6. ลูกค้าลักษณะนี้ตรงกับคุณสมบัติของโครงการใด */
const PSC_WHO=/คุณสมบัติ|กลุ่มเป้าหมาย|ผู้มีสิทธิ|ผู้ฝาก|ผู้กู้/;
function pscT6(a,lv){
  const hs=a.secs.filter(([h])=>PSC_WHO.test(h)&&pscOkH(h));if(!hs.length)return null;const [h,v]=rnd(hs);
  const it=shuffle(pscItemsOf(v));
  for(const l of it){const n=pscN(l);if(n.length<15)continue;
    const o=pscPool(a,lv,b=>b.secs.some(([x])=>PSC_WHO.test(x))&&!pscFullN(b).includes(n)).slice(0,3);if(o.length<3)return null;
    return pscQ(a,h,`ลูกค้าที่มีลักษณะต่อไปนี้ ตรงกับ${h}ของผลิตภัณฑ์ โครงการ หรือมาตรการใด\n"${pscMask(l,a)}"`,[pscName(a),...o.map(b=>pscName(b))],[[`${a.title} หัวข้อ${h}: ${pscClip(v,500)}`,PSC_LABEL]]);
  }
  return null;
}
/* 7. Market Code */
const pscCodes=a=>{const t=a.title+'\n'+pscAll(a),s=new Set();for(const m of t.matchAll(/Market\s*Code\s*:?\s*((?:\d{4}[\s,]*(?:และ|หรือ)?\s*)+)/gi))for(const c of m[1].match(/\d{4}/g)||[])s.add(c);return[...s]};
function pscT7(a,lv){
  const mine=pscCodes(a);if(!mine.length)return null;
  const other=shuffle([...new Set(PSC.filter(b=>b!==a).flatMap(pscCodes))].filter(c=>!mine.includes(c))).slice(0,3);if(other.length<3)return null;
  const t=a.title.replace(/\s*\(?Market\s*Code[^)]*\)?/i,'').trim();
  return pscQ({...a},null,`การสร้างบัญชีสินเชื่อของ "${t}" ใช้ Market Code ใด`,[rnd(mine),...other],[[`${t} ใช้ Market Code ${mine.join(', ')}`,PSC_LABEL]],x=>+x);
}
/* 8. หมวดของผลิตภัณฑ์ */
function pscT8(a){
  if(!a.cat.length)return null;/* ตัวลวงต้องไม่ใช่หมวดแม่/ลูกของหมวดที่ถูก (เช่น เงินฝากสงเคราะห์ชีวิต กับ เงินฝากสงเคราะห์ชีวิต_โปรโมชั่น) */
  const root=c=>String(c).split('_')[0].trim(),mine=new Set(a.cat.map(root)),all=shuffle([...new Set(PSC.flatMap(b=>b.cat))].filter(c=>!mine.has(root(c)))).filter((c,i,l)=>l.findIndex(x=>root(x)===root(c))===i).slice(0,3);if(all.length<3)return null;
  return pscQ(a,null,`${pscT(a)} จัดอยู่ในหมวดใด${PSC_WEB?'':'ของ Product Catalog'}`,[pscCat(a.cat[0]),...all.map(pscCat)],[[`${a.title} อยู่ในหมวด ${[...new Set(a.cat)].map(pscCat).join(', ')}`,PSC_LABEL]]);
}
/* 9. เลขที่บันทึกนี้เป็นเรื่องใด */
function pscT9(a,lv){
  if(!a.memo)return null;const o=pscPool(a,lv,b=>b.memo!==a.memo).slice(0,3);if(o.length<3)return null;
  return pscQ(a,null,`บันทึกที่ ${a.memo} เป็นเรื่องใด`,[a.title,...o.map(b=>b.title)],[[`บันทึกที่ ${a.memo} คือ "${a.title}"`,PSC_LABEL]]);
}
/* 10. สถานการณ์แนะนำผลิตภัณฑ์: ลูกค้าลักษณะนี้ + ต้องการสิ่งนี้ ควรแนะนำผลิตภัณฑ์ใด (ตัวเลือก = ผลิตภัณฑ์หมวดเดียวกัน)
   ตัวลวงต้องไม่มีความต้องการนั้นอยู่ในเนื้อหาเลย จึงไม่มีตัวเลือกที่ "ก็ถูกเหมือนกัน" */
const PSC_NEED=/ความคุ้มครอง|วัตถุประสงค์|สิทธิประโยชน์|ลักษณะ/;
const PSC_CUST=['นาย ก','นาง ข','นางสาว ค','นาย ง','นาง จ'];
function pscT10(a,lv){
  const cat=a.cat[0];if(!cat)return null;
  const needs=a.secs.filter(([h])=>PSC_NEED.test(h)&&pscOkH(h)),whos=a.secs.filter(([h])=>PSC_WHO.test(h)&&pscOkH(h));if(!needs.length)return null;
  const [nh,nv]=rnd(needs),need=shuffle(pscItemsOf(nv)).find(l=>pscN(l).length>=15&&l.length<=160);if(!need)return null;
  const who=whos.length?shuffle(pscItemsOf(rnd(whos)[1])).find(l=>pscN(l).length>=10&&l.length<=120):'';
  const nn=pscN(need),wn=who?pscN(who):'';
  /* ตัวลวง: หมวดเดียวกัน และไม่มีความต้องการข้อนี้ (ระดับสูงต้องไม่ตรงคุณสมบัติด้วย ยิ่งต้องอ่านทั้งสองเงื่อนไข) */
  const o=pscPool(a,lv,b=>b.cat[0]===cat&&!pscFullN(b).includes(nn)&&!pscNear(nn,pscItemsOf(pscAll(b)).map(pscN))).slice(0,3);if(o.length<3)return null;
  const c=rnd(PSC_CUST),m=t=>pscMask(String(t).replace(/\s*…$/,''),a);
  const stem=`${c} มาติดต่อที่สาขา ธ.ก.ส.${who?`\nลักษณะของลูกค้า: ${m(who)}`:''}\nสิ่งที่ลูกค้าต้องการ: ${m(need)}\nในฐานะพนักงาน ธ.ก.ส. ควรแนะนำผลิตภัณฑ์ใดให้${c}`;
  return pscQ(a,nh,stem,[pscName(a),...o.map(b=>pscName(b))],
    [[`${a.title} หัวข้อ${nh}: ${pscClip(nv,400)}`,PSC_LABEL],...(who?[[`ลูกค้าเข้าคุณสมบัติของ ${a.title}: ${pscClip(who,160)}`,'']]:[]),
     [`ผลิตภัณฑ์อื่นในหมวด${pscCat(cat)} (${o.map(b=>`"${b.title}"`).join(', ')}) ไม่มี${nh}ข้อนี้`,'']]);
}
/* เลขที่บันทึกอยู่ในเฉลย (ที่มา) เท่านั้น จึงไม่มีโจทย์ถามเลขบันทึก
   เว็บไซต์ ธ.ก.ส.: ไม่ถามหมวด (t8) เพราะชื่อผลิตภัณฑ์บอกหมวดอยู่แล้ว เช่น "ประกันภัย…" "บัตรเดบิต…" · ตัวลวงเอาจากหมวดเดียวกันก่อนทุกระดับ */
const PSC_TYPES=[[.17,'t1'],[.12,'t2'],[.12,'t3'],[.16,'t4'],[.1,'t5'],[.08,'t6'],[.05,'t7'],[.05,'t8'],[.15,'t10']];
function pscLocal(level,n){
  if(!PSC||!PSC.length)return[];
  const lv=level||3,hs=pscHeads(),out=[],seen=new Set(),usedA=new Set();
  for(let t=0;out.length<n&&t<n*20;t++){
    let r=Math.random(),ty='t1';for(const [w,k] of PSC_WEB?PSC_TYPES.filter(t=>t[1]!=='t8'):PSC_TYPES){if(r<w){ty=k;break}r-=w}
    const h=rnd(hs),cand=(ty==='t1'||ty==='t2'||ty==='t4'||ty==='t5')?PSC.filter(a=>pscSec(a,h)):PSC;
    const fresh=cand.filter(a=>!usedA.has(a.id)),a=rnd(fresh.length?fresh:cand);if(!a)continue;
    const q=ty==='t1'?pscT1(a,h,lv):ty==='t2'?pscT2(a,h,lv):ty==='t3'?pscT3(a,lv):ty==='t4'?pscT4(a,h,lv):ty==='t5'?pscT5(a,h,lv):ty==='t6'?pscT6(a,lv):ty==='t7'?pscT7(a,lv):ty==='t10'?pscT10(a,lv):pscT8(a);
    if(!q||(typeof qValid==='function'&&!qValid(q))||q.choices.some(pscBadV)||PSC_PERSON.test(q.stem)||pscHasMemo(q)||(q.ph&&!pscOkH(q.ph)))continue;const k=q.stem;if(seen.has(k))continue;seen.add(k);usedA.add(a.id);out.push({...q,ptype:ty});
  }
  return shuffle(out);
}
LOCAL.psc=(level,n)=>pscLocal(level,n);

/* ---------- AI: ส่งเนื้อหาเรื่องที่สุ่มให้ AI สร้างโจทย์ · ref = รหัสเรื่อง [Pxx] · topic = หัวข้อที่ใช้ตอบ ---------- */
function pscPrompt(arts,k,level){
  return `สร้างข้อสอบปรนัยใหม่ ${k} ข้อ เรื่องผลิตภัณฑ์และโครงการของธนาคารเพื่อการเกษตรและสหกรณ์การเกษตร (ธ.ก.ส.) จากเอกสาร${PSC_WEB?'หน้าผลิตภัณฑ์ในเว็บไซต์ ธ.ก.ส.':' Product Catalog'} ข้างล่างเท่านั้น
${level?`ระดับความยาก ${level}: ${levelTxt(level)}`:'ระดับข้อสอบจริง'}
เลขสุ่ม ${Math.random().toString(36).slice(2,8)} ใช้แค่ทำให้โจทย์ชุดนี้ต่างจากชุดก่อน ห้ามใส่เลขนี้ลงในโจทย์
เอกสาร (แต่ละเรื่องมีรหัสในวงเล็บเหลี่ยม):
${arts.map(a=>`[P${a.k}] ${a.title}\n${pscFull(a,1).slice(0,9000)}`).join('\n\n')}

กติกา:
- ทุกข้อต้องตอบได้จากเอกสารข้างบนเท่านั้น ห้ามใช้ความรู้นอกเอกสาร ห้ามแต่งตัวเลข อัตราดอกเบี้ย วันที่ หรือเงื่อนไขที่ไม่มีในเอกสาร
- ใส่ ref เป็นรหัสเรื่องที่ใช้ เช่น "P12" ข้อละหนึ่งเรื่อง และ topic เป็นชื่อหัวข้อในเอกสารที่ใช้ตอบ (เช่น "อัตราดอกเบี้ย")
- ถามรายละเอียดที่พนักงานต้องรู้จริง: คุณสมบัติผู้กู้/ผู้ฝาก วงเงิน อัตราดอกเบี้ย ระยะเวลา หลักประกัน ค่าธรรมเนียม เงื่อนไข ขั้นตอน ${!level||level>=3?'อย่างน้อยครึ่งหนึ่งเป็นโจทย์สถานการณ์ เช่น ลูกค้าแบบนี้ขอกู้/ฝากได้ไหม ได้ดอกเบี้ยเท่าไร ต้องใช้หลักประกันอะไร ผ่อนได้กี่งวด':'ถามข้อเท็จจริงตรงๆ'}
- ตัวลวงใช้ตัวเลขหรือเงื่อนไขที่ใกล้เคียง หรือของเรื่องอื่นในเอกสาร แต่ต้องผิดชัดเจนเมื่ออ่านเอกสาร
- ตัวเลือกทั้ง 4 ต้องเป็นเรื่องเดียวกับที่ถาม รูปแบบและความยาวใกล้กัน สรุปเป็นประโยคสั้นๆ ไม่ลอกข้อความยาวหรือรายการ 1. 2. 3. มาทั้งก้อน ห้ามให้คำตอบที่ถูกโดดออกมาจนเดาได้โดยไม่ต้องรู้เนื้อหา
- ห้ามใส่ลิงก์ เลขที่บันทึก หรือรหัสเรื่องลงในโจทย์และตัวเลือก
- ทุกข้อมีตัวเลือก 4 ตัว ถูกเพียงตัวเดียว
${CHOICE_RULE}
- เฉลย 2–3 ขั้น ยกข้อความในเอกสารที่ใช้ตอบ ให้ from เป็นชื่อเรื่องและหัวข้อ
- ใช้ภาษาไทย ห้ามใช้ markdown ไม่ต้องใส่ ก ข ค ง หน้าตัวเลือก
ตอบเป็น JSON เท่านั้น รูปแบบ:
{"questions":[{"ref":"P0","topic":"หัวข้อที่ใช้ตอบ","stem":"โจทย์","choices":["ตัวเลือก1","ตัวเลือก2","ตัวเลือก3","ตัวเลือก4"],"answer":0,"steps":[{"text":"ขั้นอธิบาย","from":"ที่มา"}]}]}`;
}
/* โจทย์สถานการณ์ "ควรแนะนำผลิตภัณฑ์ใด": ส่งผลิตภัณฑ์หมวดเดียวกัน 6 ตัว (ย่อเฉพาะหัวข้อที่ใช้แยกผลิตภัณฑ์) ให้ AI แต่งลูกค้า
   ตัวเลือกให้ AI ตอบเป็นรหัส P.. แล้วระบบแปลงเป็นชื่อผลิตภัณฑ์เอง ชื่อในตัวเลือกจึงตรงของจริงเสมอ */
const PSC_RECH=/คุณสมบัติ|กลุ่มเป้าหมาย|ผู้มีสิทธิ|วัตถุประสงค์|คุ้มครอง|ระยะเวลา|วงเงิน|อัตรา|ดอกเบี้ย|เบี้ย|จำนวนเงิน|หลักประกัน|สิทธิประโยชน์|ลักษณะ|เงื่อนไข|ภาพรวม/;
const pscBrief=a=>a.secs.filter(([h])=>PSC_RECH.test(h)&&!/^ตาราง|คำถามที่พบบ่อย/.test(h)).map(([h,v])=>`${h}: ${pscClip(v,450)}`).join('\n').slice(0,2600);
function pscRecGroup(){
  const by={};for(const a of PSC)if(a.cat[0]&&pscLen(a)>=150)(by[a.cat[0]]=by[a.cat[0]]||[]).push(a);
  const cats=Object.keys(by).filter(c=>by[c].length>=4);if(!cats.length)return null;
  return shuffle(by[rnd(cats)]).slice(0,6);
}
function pscRecPrompt(arts,k,level){
  return `สร้างข้อสอบปรนัยใหม่ ${k} ข้อ แบบโจทย์สถานการณ์ "ควรแนะนำผลิตภัณฑ์ใดให้ลูกค้า" สำหรับพนักงานธนาคารเพื่อการเกษตรและสหกรณ์การเกษตร (ธ.ก.ส.) จากข้อมูลผลิตภัณฑ์ข้างล่างเท่านั้น
${level?`ระดับความยาก ${level}: ${levelTxt(level)}`:'ระดับข้อสอบจริง'}
เลขสุ่ม ${Math.random().toString(36).slice(2,8)} ใช้แค่ทำให้โจทย์ชุดนี้ต่างจากชุดก่อน ห้ามใส่เลขนี้ลงในโจทย์
ผลิตภัณฑ์ (หมวดเดียวกัน แต่ละตัวมีรหัสในวงเล็บเหลี่ยม):
${arts.map(a=>`[P${a.k}] ${pscName(a)}\n${pscBrief(a)}`).join('\n\n')}

กติกา:
- โจทย์เล่าลูกค้าสมมติ ใช้ชื่อ นาย ก / นาง ข / นางสาว ค (ห้ามใช้ชื่อคนจริง) บอกลักษณะของลูกค้า (เช่น อายุ อาชีพ สิ่งที่มีอยู่) และความต้องการ (เช่น ต้องการความคุ้มครองแบบไหน กี่ปี วงเงินเท่าไร ใช้เงินทำอะไร) แล้วจบด้วย "ในฐานะพนักงาน ธ.ก.ส. ควรแนะนำผลิตภัณฑ์ใดให้…"
- ห้ามบอกชื่อผลิตภัณฑ์หรือคำเฉพาะในชื่อผลิตภัณฑ์ในโจทย์ ให้ผู้สอบต้องรู้ว่าผลิตภัณฑ์ไหนตรงกับความต้องการ
- เงื่อนไขในโจทย์ต้องมาจากข้อมูลข้างบน เมื่อเทียบกับข้อมูลแล้วต้องมีผลิตภัณฑ์ที่ตรงครบทุกเงื่อนไขเพียงตัวเดียวในตัวเลือก ตัวลวงแต่ละตัวต้องผิดอย่างน้อยหนึ่งเงื่อนไขอย่างชัดเจนตามข้อมูล (เช่น อายุไม่เข้าเกณฑ์ ไม่คุ้มครองเรื่องนั้น ระยะเวลาไม่ตรง)
- ${!level||level>=3?'ใส่ 2–3 เงื่อนไข ให้ตัวลวงบางตัวตรงบางเงื่อนไขแต่ไม่ครบ':'ใส่ 1–2 เงื่อนไขที่แยกผลิตภัณฑ์ได้ชัด'}
- choices ต้องเป็นรหัสผลิตภัณฑ์จากรายการข้างบน 4 รหัสไม่ซ้ำกัน เช่น ["P3","P1","P7","P5"] ห้ามเขียนชื่อ ระบบจะแปลงเป็นชื่อเอง · answer = ลำดับของรหัสที่ถูกใน choices · ref = รหัสที่ถูก
- topic = ชื่อหัวข้อในข้อมูลที่ใช้ตัดสินเป็นหลัก (เช่น "ความคุ้มครอง")
- เฉลย 2–4 ขั้น: ขั้นแรกบอกว่าผลิตภัณฑ์ที่ถูกตรงเงื่อนไขของลูกค้าอย่างไร ยกข้อความจากข้อมูล แล้วบอกว่าตัวลวงแต่ละตัวไม่ตรงเงื่อนไขข้อไหน · from เป็นชื่อผลิตภัณฑ์และหัวข้อ · ในเฉลยเรียกผลิตภัณฑ์ด้วยชื่อ ห้ามใช้รหัส P..
- ใช้ภาษาไทย ห้ามใช้ markdown
ตอบเป็น JSON เท่านั้น รูปแบบ:
{"questions":[{"ref":"P3","topic":"หัวข้อ","stem":"โจทย์","choices":["P3","P1","P7","P5"],"answer":0,"steps":[{"text":"ขั้นอธิบาย","from":"ที่มา"}]}]}`;
}
/* แปลงคำตอบ AI: ตัวเลือกต้องเป็นรหัสในกลุ่มที่ส่งไป 4 ตัวไม่ซ้ำ และคำตอบตรงกับ ref */
function pscRecMap(q,arts){
  const ok=new Set(arts.map(a=>'P'+a.k)),ch=q.choices.map(c=>String(c).trim().toUpperCase());
  if(ch.length!==4||new Set(ch).size!==4||!ch.every(c=>ok.has(c)))return null;
  const a=PSC[+ch[q.answer].slice(1)];if(!a||String(q.ref||'').trim().toUpperCase()!==ch[q.answer])return null;
  const names=ch.map(c=>pscName(PSC[+c.slice(1)]));if(new Set(names).size!==4||names.some(n=>q.stem.includes(n)))return null;
  const h=a.secs.some(x=>x[0]===q.topic)?q.topic:null,unP=t=>String(t).replace(/\[?P(\d+)\]?/g,(m,i)=>PSC[+i]?`"${pscName(PSC[+i])}"`:m);
  return{...q,choices:names,topic:a.title,ptopic:h,ptype:'rec',gen:'ai',steps:[...q.steps.map(([t,f])=>[unP(t),unP(f)]),...pscImgNote(a)],...pscCite(a,h)};
}
/* ใช้แต่ละเรื่องทั่วๆ กันก่อนวนซ้ำ (จำในเครื่อง) */
const PSC_USE_KEY='exam-psc-use';
function pscPick(k){
  let u={};try{u=JSON.parse(localStorage.getItem(PSC_USE_KEY)||'{}')||{}}catch(e){}
  const a=shuffle(PSC.filter(x=>pscLen(x)>=150)).sort((x,y)=>(u[x.id]||0)-(u[y.id]||0)).slice(0,k);
  for(const x of a)u[x.id]=(u[x.id]||0)+1;try{localStorage.setItem(PSC_USE_KEY,JSON.stringify(u))}catch(e){}
  return a;
}
/* โจทย์จากคลังโจทย์กลาง: ใช้ได้เฉพาะข้อที่เรื่องต้นทางยังไม่เปลี่ยน แล้วเติมที่มาใหม่ */
const pscFresh=q=>{const a=PSC.find(x=>x.id===q.psc);return a&&a.mod===q.pscMod&&!pscHasMemo(q)?{...q,...pscCite(a,q.ptopic)}:null};
async function pscItems(s,level,n,o={}){
  await loadPSC();
  const tag=q=>({...q,sub:s.id,subName:s.name});
  if(!activeAI())return pscLocal(level,n).map(tag);
  /* มี AI: ให้ AI คิดโจทย์และตัวเลือกทั้งหมด · โจทย์จากระบบใช้เติมเฉพาะส่วนที่ AI สร้างไม่ครบ */
  const kAI=n;let ai=[];
  try{ai=(await poolTake(s,level,kAI)).map(pscFresh).filter(Boolean)}catch(e){}
  /* fast = ข้อแรกๆ ของชุด: ไม่รอ AI (ใช้คลังกลาง + โจทย์จากระบบ) ให้เริ่มทำได้ทันที ที่เหลือ AI สร้างต่อเบื้องหลัง */
  if(ai.length<kAI&&!o.fast){
    try{
      /* ราว 1 ใน 3 เป็นโจทย์สถานการณ์แนะนำผลิตภัณฑ์ (ทำพร้อมกับชุดปกติ ไม่ให้รอนานขึ้น) */
      const need=kAI-ai.length,recG=[],nRec=need>=3&&pscRecGroup()?Math.round(need/3):0,prog=[0,0],op=i=>x=>{prog[i]=x;if(o.onProg)o.onProg(prog[0]+prog[1])};
      /* แต่ละรอบสุ่มหมวดใหม่ · เก็บทุกกลุ่มที่ส่งไว้ตรวจรหัสตัวเลือก */
      const recP=nRec?genAIChunks(k=>{const g=pscRecGroup();recG.push(...g);return pscRecPrompt(g,k,level)},nRec,{signal:o.signal,onProg:op(1)})
        .then(l=>l.map(q=>pscRecMap(q,recG)).filter(Boolean)).catch(e=>{if(e&&e.code==='cancelled')throw e;return[]}):Promise.resolve([]);
      const [norm,rec]=await Promise.all([genAIChunks((k,b)=>pscPrompt(pscPick(Math.max(2,Math.ceil(k/2))),k,level),need-nRec,{signal:o.signal,onProg:op(0)}),recP]);
      const gen=[...norm
        .map(q=>{const r=String(q.ref||'').trim(),a=/^P\d+$/i.test(r)&&PSC[+r.slice(1)];if(!a)return null;const h=a.secs.some(x=>x[0]===q.topic)?q.topic:null;
          return{...q,topic:a.title,ptopic:h,gen:'ai',steps:[...q.steps,...pscImgNote(a)],...pscCite(a,h)}}),...rec].filter(q=>q&&!pscHasMemo(q));
      if(typeof poolPut==='function')poolPut(s,level,gen.map(tag));
      ai.push(...gen);
    }catch(e){if(e&&e.code==='cancelled')throw e}
  }
  return shuffle([...ai,...pscLocal(level,n-ai.length)]).map(tag);
}

/* ---------- ลิงก์ "เปิดหน้าผลิตภัณฑ์" ในเฉลย ----------
   เบราว์เซอร์ที่ยังไม่เข้าระบบ Product Catalog จะถูกส่งไปหน้าล็อกอินแล้วกลับไปหน้า Home เสมอ
   แต่ลิงก์เรื่องที่ต่อ ?token=&id= ของผู้ใช้เอง เปิดหน้านั้นได้ทันที → แต่ละคนวางลิงก์ของตัวเองไว้ในเครื่องครั้งเดียว (ไม่ขึ้นคลาวด์) */
const PSC_LINK_KEY='exam-psc-link';
function pscTok(){try{const u=new URL(localStorage.getItem(PSC_LINK_KEY)||''),t=u.searchParams.get('token');return t?{token:t,id:u.searchParams.get('id')||''}:null}catch(e){return null}}
function pscLinkParams(){const t=pscTok();return t?`token=${encodeURIComponent(t.token)}${t.id?`&id=${encodeURIComponent(t.id)}`:''}`:''}
const pscHref=url=>{const p=pscLinkParams();return p&&/^https:\/\/psc\.baac\.tech\//.test(url)?url+(url.includes('?')?'&':'?')+p:url};
/* ส่วนลิงก์ในบรรทัดที่มา (practice.js explainHTML) */
function pscLinkHTML(url){
  if(!/^https:\/\/psc\.baac\.tech\//.test(url))return ` · <a href="${esc(url)}" target="_blank" rel="noopener">เปิดหน้าผลิตภัณฑ์</a>`;
  const has=!!pscLinkParams();
  return ` · <a href="${esc(pscHref(url))}" data-pscurl="${esc(url)}" target="_blank" rel="noopener">เปิดหน้าผลิตภัณฑ์</a> ${has?'':`<button type="button" class="ghost" data-psclink style="padding:2px 8px;font-size:.85em">ให้เปิดตรงหน้านี้</button> <span class="src">(ตอนนี้ถ้ายังไม่ได้เข้าระบบ จะไปหน้า Home)</span>`}`;
}
/* เชื่อมต่อ Product Catalog: เปิดเว็บให้เข้าระบบ → ผู้ใช้คัดลอกที่อยู่ (Ctrl+L, Ctrl+C) → กลับมาหน้านี้ ระบบหยิบลิงก์จากคลิปบอร์ดเอง
   (เบราว์เซอร์ไม่ให้เว็บเราอ่านที่อยู่ของเว็บอื่นโดยตรง คลิปบอร์ดจึงเป็นทางที่สั้นที่สุด) */
const PSC_LINK_RE=/https:\/\/psc\.baac\.tech\/\S*[?&]token=[0-9a-f]{16,}\S*/i;
async function pscAskLink(){
  let cur='';try{cur=localStorage.getItem(PSC_LINK_KEY)||''}catch(e){}
  /* กลับมาที่หน้านี้ (หรือกดปุ่มวาง): ลองอ่านคลิปบอร์ด เจอลิงก์ที่มี token ก็บันทึกให้เลย */
  /* หน้าเข้าสู่ระบบเปิดเป็นหน้าต่างเล็กทับหน้านี้ · ได้ลิงก์แล้วปิดหน้าต่างนั้นให้เอง ผู้ใช้กลับมาอยู่หน้าเดิม
     ผู้ใช้ปิดหน้าต่างนั้นเอง (หรือกลับมาคลิกหน้านี้) ก็ลองหยิบลิงก์จากคลิปบอร์ดทันที */
  let win=null,watch=null;
  const grab=async()=>{try{const m=(await navigator.clipboard.readText()).match(PSC_LINK_RE);const i=document.getElementById('psclinkq');if(m&&i){i.value=m[0];if(win&&!win.closed)win.close();closeModal(1)}}catch(e){}};
  const onBack=()=>setTimeout(grab,300);window.addEventListener('focus',onBack);
  const p=modal(`<p class="mt">เข้าสู่ระบบ Product Catalog</p>
    <p>ทำครั้งเดียวต่อเครื่อง ใช้ทำข้อสอบวิชานี้ และให้ลิงก์ในเฉลยเปิดตรงหน้าผลิตภัณฑ์</p>
    <ol class="rules"><li><button type="button" class="primary" id="pscopen">เปิดหน้าเข้าสู่ระบบ Product Catalog</button></li>
      <li>เข้าระบบให้เสร็จ แล้วกด <b>Ctrl+L</b> ตามด้วย <b>Ctrl+C</b> (คัดลอกที่อยู่เว็บ) · บนมือถือ: แตะช่องที่อยู่แล้วกดคัดลอก</li>
      <li>ปิดหน้าต่าง Product Catalog หรือคลิกกลับมาที่หน้านี้ ระบบจะหยิบลิงก์และปิดหน้าต่างนั้นให้เอง (ถ้าเบราว์เซอร์ถามสิทธิ์อ่านคลิปบอร์ด ให้กดอนุญาต)</li></ol>
    <input id="psclinkq" class="cetx" type="url" autocomplete="off" spellcheck="false" placeholder="หรือวางลิงก์ที่มี token= ที่นี่" value="${esc(cur)}" style="width:100%">
    <p style="margin:4px 0 0"><button type="button" class="ghost" id="pscpaste">📋 วางจากคลิปบอร์ด</button></p>
    <p class="src">เก็บไว้ในเครื่องนี้เท่านั้น ไม่ส่งขึ้นระบบ · ถ้าวันหลังลิงก์พาไปหน้าล็อกอินอีก แปลว่า token หมดอายุ ให้เชื่อมต่อใหม่</p>`,[{t:'ยกเลิก'},{t:'บันทึก',cls:'primary'}]);
  document.getElementById('pscopen').onclick=()=>{
    const w=Math.min(1100,screen.availWidth-40),h=Math.min(820,screen.availHeight-60);
    win=window.open('https://sklogin.baac.tech/catalog','pscLogin',`popup,width=${w},height=${h},left=${(screen.availWidth-w)/2|0},top=${(screen.availHeight-h)/2|0}`)||window.open('https://sklogin.baac.tech/catalog','_blank');
    clearInterval(watch);watch=setInterval(()=>{if(win&&win.closed){clearInterval(watch);window.focus();setTimeout(grab,300)}},500);
  };
  document.getElementById('pscpaste').onclick=grab;
  const r=await p;window.removeEventListener('focus',onBack);clearInterval(watch);
  if(r!==1)return;
  const v=((document.getElementById('psclinkq')||{}).value||'').match(PSC_LINK_RE)?.[0]||'';
  if(!/^https:\/\/psc\.baac\.tech\/.*[?&]token=/.test(v.trim())){toast('ลิงก์ต้องเป็นของ psc.baac.tech และมี token=','bad');return}
  try{localStorage.setItem(PSC_LINK_KEY,v.trim())}catch(e){}
  document.querySelectorAll('a[data-pscurl]').forEach(a=>{a.href=pscHref(a.dataset.pscurl)});
  document.querySelectorAll('[data-psclink]').forEach(b=>{const s=b.nextElementSibling;if(s&&s.classList.contains('src'))s.remove();b.remove()});
  toast('เข้าสู่ระบบ Product Catalog แล้ว');
}
document.addEventListener('click',e=>{if(e.target.closest&&e.target.closest('[data-psclink]'))pscAskLink()});
/* เข้าสู่ระบบ Product Catalog จากอีกแท็บ: แท็บนี้ที่ค้างหน้า "ต้องเข้าสู่ระบบ" เริ่มชุดให้เอง */
window.addEventListener('storage',e=>{
  if(e.key!==PSC_LINK_KEY||!e.newValue||typeof R==='undefined'||!R||R.status!=='error'||!/^psc_/.test(R.code||''))return;
  PSC=null;pscP=null;start(true);
});

/* ---------- แท็บ Product Catalog (แอดมินเท่านั้น) ---------- */
async function renderPscAdmin(body){
  if(!ME||ME.role!=='admin'){body.innerHTML='<p class="src" style="text-align:center">เฉพาะแอดมิน</p>';return}
  let meta=null;try{const f=await fb(),m=await f.fs.getDoc(fsDoc('config',PSC_DOC));meta=m.exists()?m.data():null}catch(e){}
  let link='';try{link=localStorage.getItem(PSC_LINK_KEY)||''}catch(e){}
  const when=meta&&meta.at&&meta.at.toDate?fmtDate(meta.at.toDate()):'';
  if(PSC_WEB)return renderPwebAdmin(body,meta,when);
  body.innerHTML=`<div class="kdoc"><p class="kn">ข้อมูลผลิตภัณฑ์จาก Product Catalog BAAC</p>
    <p class="src">${meta?`มี ${meta.n} เรื่อง${meta.img?` (อ่านจากรูป ${meta.img} เรื่อง)`:''} · อัปเดตล่าสุด ${esc(when||'-')}${meta.by?` โดย ${esc(meta.by)}`:''}`:'ยังไม่มีข้อมูลในระบบ'}</p>
    <label class="lbl" for="psclink">ลิงก์เข้า Product Catalog ของคุณ (มี token) · เก็บไว้ในเครื่องนี้เท่านั้น</label>
    <input id="psclink" class="cetx" type="url" autocomplete="off" spellcheck="false" placeholder="https://psc.baac.tech/?token=...&id=..." value="${esc(link)}">
    <label class="chk"><input type="checkbox" id="pscimg" ${canVision('proc')?'checked':'disabled'}> ให้ AI อ่านรูป (เรื่องที่มีแต่รูป)${canVision('proc')?'':' · ต้องตั้งค่า AI ที่ดูรูปได้'}</label>
    <p class="src" id="pschelp">กำลังตรวจตัวช่วยโหลดรูป…</p>
    <div class="btnrow" style="justify-content:flex-start"><button class="primary" id="pscgo">อัปเดตจาก Product Catalog</button></div>
    <p class="src" id="pscprog"></p></div>`;
  const $=id=>body.querySelector('#'+id);
  /* AI อ่านรูปจาก psc.baac.tech เองไม่ได้ ต้องเปิดตัวช่วยในเครื่องนี้ก่อน */
  const helpTxt=ok=>ok?'✓ ตัวช่วยโหลดรูปทำงานอยู่ (localhost:8795)':'ตัวช่วยโหลดรูปยังไม่เปิด ระบบจะเปิดให้เองตอนกดอัปเดต (ถ้า Chrome ถาม ให้กดเปิดและติ๊กอนุญาตเสมอ) · ถ้าเปิดไม่ขึ้น: รัน tools\\install-psc-helper.ps1 ครั้งเดียว หรือดับเบิลคลิก tools\\psc-img-helper.bat (ไม่เปิดก็อัปเดตเรื่องที่เป็นตัวหนังสือได้ตามปกติ)';
  let helpUp=false;pscHelperOK().then(ok=>{helpUp=ok;const e=$('pschelp');if(e)e.textContent=helpTxt(ok)});
  $('pscgo').onclick=async()=>{
    const l=$('psclink').value.trim();if(!/token=/.test(l)){toast('วางลิงก์ที่มี token ก่อน','bad');return}
    try{localStorage.setItem(PSC_LINK_KEY,l)}catch(e){}
    $('pscgo').disabled=true;const pr=$('pscprog');
    try{
      /* ต้องอ่านรูปแต่ตัวช่วยยังไม่เปิด: สั่งเปิดตอนนี้เลย (ยังอยู่ในจังหวะกดปุ่ม Chrome จึงยอมเปิดโปรแกรม) */
      let help=helpUp||await pscHelperOK();
      if(!help&&$('pscimg').checked){pr.textContent='กำลังเปิดตัวช่วยโหลดรูป…';help=await pscStartHelper()}
      helpUp=help;$('pschelp').textContent=helpTxt(help);
      const r=await pscUpdate(l,{readImg:$('pscimg').checked&&help,onProg:t=>{pr.textContent=t}});
      pr.innerHTML=`✓ อัปเดตแล้ว ${r.n} เรื่อง · เพิ่ม ${r.added} · เปลี่ยน ${r.changed} · ลบ ${r.removed}${r.img?` · AI อ่านรูปได้ ${r.img} เรื่อง`:''}${r.imgFail?` · <b>อ่านรูปไม่ได้ ${r.imgFail} เรื่อง</b> (${esc(errCopy(r.imgErr,'อ่านรูป'))}) กดอัปเดตอีกครั้งเพื่อลองเฉพาะเรื่องที่ค้าง`:''}${r.skipped?` · ข้าม ${r.skipped} เรื่องที่ไม่มีเนื้อหาให้ออกข้อสอบ (แบบฟอร์มที่มีแต่ไฟล์แนบ${help?'':' และเรื่องที่มีแต่รูป ซึ่งต้องเปิดตัวช่วยโหลดรูปก่อน'})`:''}`;
      toast('อัปเดตข้อมูลผลิตภัณฑ์แล้ว');
    }catch(e){pr.textContent=errCopy(e&&e.code,'อัปเดต')}
    $('pscgo').disabled=false;
  };
}
/* แท็บแอดมินของแหล่งเว็บไซต์ ธ.ก.ส.: ไม่ต้องมีลิงก์/token · อ่านหน้าเว็บผ่านตัวช่วยในเครื่อง (เปิดให้เองตอนกด) */
function renderPwebAdmin(body,meta,when){
  body.innerHTML=`<div class="kdoc"><p class="kn">ข้อมูลผลิตภัณฑ์จากเว็บไซต์ ธ.ก.ส. (baac.or.th/products)</p>
    <p class="src">${meta?`มี ${meta.n} ผลิตภัณฑ์ · อัปเดตล่าสุด ${esc(when||'-')}${meta.by?` โดย ${esc(meta.by)}`:''}`:'ยังไม่มีข้อมูลในระบบ'}</p>
    <p class="src" id="pschelp">กำลังตรวจตัวช่วยอ่านหน้าเว็บ…</p>
    <div class="btnrow" style="justify-content:flex-start"><button class="primary" id="pscgo">อัปเดตจากเว็บไซต์ ธ.ก.ส.</button></div>
    <p class="src" id="pscprog"></p>
    <p class="src">ข้อมูล Product Catalog เดิมยังเก็บไว้ในระบบ (สำรอง)</p></div>`;
  const $=id=>body.querySelector('#'+id);
  const helpTxt=ok=>ok?'✓ ตัวช่วยอ่านหน้าเว็บทำงานอยู่ (localhost:8795)':'ตัวช่วยอ่านหน้าเว็บยังไม่เปิด ระบบจะเปิดให้เองตอนกดอัปเดต (ถ้า Chrome ถาม ให้กดเปิด) · ถ้าเปิดไม่ขึ้น: ดับเบิลคลิก tools\\psc-img-helper.bat';
  pscHelperOK().then(ok=>{const e=$('pschelp');if(e)e.textContent=helpTxt(ok)});
  $('pscgo').onclick=async()=>{
    $('pscgo').disabled=true;const pr=$('pscprog');
    try{
      let help=await pscHelperOK();
      if(!help){pr.textContent='กำลังเปิดตัวช่วยอ่านหน้าเว็บ…';help=await pscStartHelper()}
      $('pschelp').textContent=helpTxt(help);if(!help)throw{code:'psc_helper'};
      const r=await pscUpdate('',{onProg:t=>{pr.textContent=t}});
      pr.innerHTML=`✓ อัปเดตแล้ว ${r.n} ผลิตภัณฑ์ (จาก ${r.total} หน้า) · เพิ่ม ${r.added} · เปลี่ยน ${r.changed} · ลบ ${r.removed}${r.skipped?` · ข้าม ${r.skipped} หน้าที่ไม่มีรายละเอียด`:''}${r.docs?` · เอกสาร PDF ${r.docs-r.docFail-r.docEmpty}/${r.docs} ไฟล์${r.docEmpty?` (เป็นภาพ อ่านไม่ได้ ${r.docEmpty})`:''}${r.docFail?` <b>(โหลดไม่ได้ ${r.docFail})</b>`:''}`:''}${r.fail?` · <b>อ่านไม่ได้ ${r.fail} หน้า</b> กดอัปเดตอีกครั้งเพื่อลองใหม่`:''}`;
      toast('อัปเดตข้อมูลผลิตภัณฑ์แล้ว');
    }catch(e){pr.textContent=errCopy(e&&e.code,'อัปเดต')}
    $('pscgo').disabled=false;
  };
}
/* เปิดวิชานี้ก่อนที่การเข้าสู่ระบบเว็บสอบจะโหลดเสร็จ (ขึ้น "ต้องเข้าสู่ระบบ") → พอเข้าสู่ระบบแล้วเริ่มชุดให้เอง */
function pscOnAuth(){if(typeof R!=='undefined'&&R&&R.status==='error'&&(R.code==='psc_login'||R.code==='pweb_login')&&typeof VIEW!=='undefined'&&VIEW==='practice'){PSC=null;pscP=null;start(true)}}
/* ข้อที่เคยตอบผิดแล้วระบบเอากลับมาให้ตอบใหม่: ข้อที่สร้างก่อนมีตัวกรองหัวข้อ/ตัวเลือก ถ้าไม่ผ่านเกณฑ์ปัจจุบันก็ไม่เอากลับมา */
function pscRetryOK(q){
  if(!Array.isArray(q.choices)||q.choices.some(pscBadV)||PSC_PERSON.test(q.stem||'')||pscHasMemo(q))return false;
  /* เรื่องที่ปิดรับฝาก/ยกเลิก หรือมีฉบับปรับปรุงใหม่กว่าแล้ว */
  if(PSC&&q.psc&&!PSC.some(a=>a.id===q.psc))return false;
  if(q.gen==='ai')return true;
  if(q.ph)return pscOkH(q.ph)&&(q.ptype!=='t3'||PSC_FACTH.test(q.ph));
  return !/^ข้อใดถูกต้องเกี่ยวกับ/.test(q.stem||'');
}
/* มีเลขที่บันทึก (เช่น งฝ/ว 1808) อยู่ในโจทย์หรือตัวเลือก */
const pscHasMemo=q=>PSC_MEMO.test([q.stem||'',...(q.choices||[])].join(' '));
