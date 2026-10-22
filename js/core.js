/* core.js — ข้อมูลวิชา ตั้งค่าที่จำไว้ ตัวช่วยทั่วไป */
const SUBJ=[
 {id:'ineq',name:'เงื่อนไขสัญลักษณ์',desc:'อสมการ 2 บรรทัด ตัดสินข้อสรุปว่า จริง ไม่จริง หรือสรุปไม่ได้',ai:false},
 {id:'series',name:'อนุกรม',desc:'อนุกรมตัวเลข หาจำนวนถัดไปหรือจำนวนที่หายไป',ai:false},
 {id:'math',name:'คณิตศาสตร์ทั่วไป',desc:'ร้อยละ อัตราส่วน กำไรขาดทุน ความเร็ว อายุ และโจทย์ปัญหา',ai:false},
 {id:'logic',name:'เงื่อนไขภาษา',desc:'ให้ข้อความเงื่อนไข 2–3 ข้อ แล้วเลือกข้อสรุปที่ถูกต้อง',ai:false},
 {id:'thai',name:'ภาษาไทย',desc:'การเข้าใจภาษา การใช้ภาษา เรียงประโยค และคำผิด · โจทย์สร้างโดย AI',ai:true},
 {id:'eng',name:'ภาษาอังกฤษ',desc:'Grammar, vocabulary และ reading สั้นๆ · โจทย์สร้างโดย AI',ai:true},
 {id:'dir',name:'ทิศทาง',desc:'อ่านแผนที่ การเดินและหันตามทิศ ระยะทาง (มีแผนที่ประกอบ)',ai:false},
 {id:'data',name:'การวิเคราะห์ข้อมูล',desc:'อ่านตาราง กราฟแท่ง กราฟเส้น ร้อยละ ค่าเฉลี่ย และการเปรียบเทียบ',ai:false},
 {id:'spatial',name:'มิติสัมพันธ์',desc:'นับลูกบาศก์ รูปคลี่กล่อง หมุนและพลิกรูป พับกระดาษเจาะรู อนุกรมรูปภาพ · ระบบวาดรูปเองจึงเฉลยถูกแน่นอน และใช้โจทย์รูปจากเอกสารในคลังความรู้ร่วมด้วย',ai:false,figOnly:true},
];
/* ความรู้เฉพาะตำแหน่ง: [id, ชื่อ, ขอบเขต, คำค้นในคลังความรู้] */
const SPEC=[
 ['credit','สินเชื่อ','หลักการให้สินเชื่อ ประเภทสินเชื่อ เงื่อนไขและขั้นตอนการขอสินเชื่อ',['สินเชื่อ','เงินกู้','ผู้กู้','วงเงิน']],
 ['creditan','วิเคราะห์สินเชื่อ','การวิเคราะห์ความสามารถชำระหนี้ งบการเงิน กระแสเงินสด และหลักประกัน',['วิเคราะห์สินเชื่อ','ความสามารถในการชำระหนี้','กระแสเงินสด','งบการเงิน','DSCR','หลักประกัน']],
 ['c5','5C','หลักพิจารณาสินเชื่อ 5C: Character, Capacity, Capital, Collateral, Condition',['5C','5 C','Character','Capacity','Collateral','Condition']],
 ['c7','7C','หลักพิจารณาสินเชื่อ 7C (5C เพิ่ม Coverage/Control และ Country/Community ตามแต่ละตำรา)',['7C','7 C','Coverage','Control']],
 ['ncb','NCB','บริษัทข้อมูลเครดิตแห่งชาติ รายงานเครดิตบูโร และกฎหมายธุรกิจข้อมูลเครดิต',['NCB','เครดิตบูโร','ข้อมูลเครดิต','รายงานข้อมูลเครดิต']],
 ['pdpa','PDPA','พ.ร.บ.คุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562',['PDPA','ข้อมูลส่วนบุคคล','คุ้มครองข้อมูล','เจ้าของข้อมูล','ผู้ควบคุมข้อมูล']],
 ['mconduct','Market Conduct','การดูแลผู้ใช้บริการทางการเงินอย่างเป็นธรรมตามแนวทางธนาคารแห่งประเทศไทย',['Market Conduct','ผู้ใช้บริการทางการเงิน','อย่างเป็นธรรม','การเสนอขาย']],
 ['debtmgmt','บริหารหนี้','การติดตามทวงถามหนี้ การปรับโครงสร้างหนี้ และการแก้ไขหนี้',['ปรับโครงสร้างหนี้','บริหารหนี้','ติดตามหนี้','ทวงถามหนี้','ไกล่เกลี่ย']],
 ['debtclass','จัดชั้นหนี้','การจัดชั้นสินทรัพย์ หนี้ค้างชำระ NPL และการกันเงินสำรอง',['จัดชั้น','NPL','กันเงินสำรอง','ค้างชำระ','TFRS 9','ด้อยคุณภาพ']],
 ['bankfin','การเงินธนาคาร','ดอกเบี้ย เงินฝาก สภาพคล่อง ความเสี่ยง และคณิตศาสตร์การเงินธนาคาร',['อัตราดอกเบี้ย','เงินฝาก','สภาพคล่อง','ความเสี่ยง','เงินกองทุน']],
 ['agecon','เศรษฐกิจการเกษตร','เศรษฐกิจเกษตรไทย ราคาสินค้าเกษตร สหกรณ์ และตลาดสินค้าเกษตร',['เกษตรกร','สหกรณ์','สินค้าเกษตร','เศรษฐกิจการเกษตร','ผลผลิต']],
 ['baac','ความรู้ ธ.ก.ส.','บทบาท พันธกิจ โครงสร้าง และผลิตภัณฑ์ของ ธ.ก.ส.',['ธ.ก.ส.','ธกส','BAAC','ธนาคารเพื่อการเกษตรและสหกรณ์']],
];
/* รายวิชาที่แอดมินเพิ่ม/ซ่อน (Firestore config/subjects ทุกคนอ่านได้) จำไว้ในเครื่องเพื่อใช้ตั้งแต่ตอนเปิดหน้า
   add: [{id,name,desc,group:'gen'|'spec',kw:[]}]  hide: [id]  ถ้าค่าในฐานข้อมูลเปลี่ยน cloud.js จะเปิดหน้าใหม่ให้ */
const SUBJ_CFG_KEY='exam-subjects';
let SUBJ_CFG={add:[],hide:[]};try{SUBJ_CFG={add:[],hide:[],...(JSON.parse(localStorage.getItem(SUBJ_CFG_KEY)||'null')||{})}}catch(e){}
for(const a of SUBJ_CFG.add||[]){if(!a||!a.id||!a.name)continue;
  if(a.group==='spec')SPEC.push([a.id,a.name,a.desc||a.name,a.kw&&a.kw.length?a.kw:[a.name]]);else SUBJ.push({id:a.id,name:a.name,desc:a.desc||'โจทย์สร้างโดย AI',ai:true,custom:true})}
SUBJ.forEach(s=>s.group='gen');
SUBJ.push({id:'specall',name:'รวมทุกวิชา',desc:'สุ่มโจทย์จากทุกหัวข้อความรู้เฉพาะตำแหน่ง',ai:true,group:'spec',kw:[]});
SPEC.forEach(([id,name,scope,kw])=>SUBJ.push({id,name,desc:scope,ai:true,group:'spec',kw}));
for(const a of SUBJ_CFG.add||[]){const s=SUBJ.find(x=>x.id===a.id);if(s)s.custom=true}
/* ซ่อนรายวิชา: เอาออกจากเมนูและการสร้างโจทย์ ข้อมูลในคลังยังอยู่ (เปิดกลับได้) */
const SUBJ_ALL=SUBJ.map(s=>({id:s.id,name:s.name,group:s.group,custom:!!s.custom}));
for(const id of SUBJ_CFG.hide||[]){const i=SUBJ.findIndex(s=>s.id===id);if(i>=0)SUBJ.splice(i,1);const j=SPEC.findIndex(x=>x[0]===id);if(j>=0)SPEC.splice(j,1)}
const GEN_TOPICS=SUBJ.filter(s=>s.group==='gen').map(s=>s.name);
const isSpecSub=id=>id==='spec'||id==='specall'||SPEC.some(x=>x[0]===id)||String(id).startsWith('doc_');
const LEVEL_TXT={1:'ง่ายมาก พื้นฐาน ขั้นตอนเดียว',2:'ง่าย 1–2 ขั้นตอน',3:'ปานกลาง ระดับข้อสอบ ก.พ. ทั่วไป',4:'ยาก หลายขั้นตอน มีตัวลวง',5:'ยากมาก ระดับแข่งขันสูง ตัวลวงแนบเนียน'};
const LBL={T:'จริง',F:'ไม่จริง',U:'สรุปไม่ได้'};
const TFU=['T','F','U'];
const TH=['ก','ข','ค','ง','จ'];
const isTFU=q=>q.kind==='ineq'||(q.kind==='ineq2'&&q.fmt==='tfu');
const qLabel=q=>q.kind==='ineq'?q.text:q.kind==='ineq2'?(q.fmt==='tfu'?`${q.lines.join(' และ ')} ⇒ ${q.text}`:`${q.lines.join(' และ ')} ⇒ ข้อใดถูกแน่นอน`):q.stem;

/* ---------- prefs (per-viewer convenience) ---------- */
let P={subject:'ineq',count:5,mode:'now',levels:{},weak:{}};
/* งานที่ต้องรอให้ทุกไฟล์ใน js/ โหลดครบก่อน (ฟังก์ชันอยู่คนละไฟล์) */
const onAppReady=fn=>document.readyState==='loading'?document.addEventListener('DOMContentLoaded',()=>fn()):fn();
try{const s=JSON.parse(localStorage.getItem('exam-drill-v1')||'null');if(s)P={...P,...s}}catch(e){}
if(P.subject&&!String(P.subject).startsWith('doc_')&&!SUBJ.some(s=>s.id===P.subject))P.subject=SUBJ[0].id;
const save=()=>{try{localStorage.setItem('exam-drill-v1',JSON.stringify(P))}catch(e){}};
/* ระดับรวมของผู้สอบ (ใช้กับทุกวิชา): ทำชุดข้อสอบผ่าน (ได้ 60% ขึ้นไป) = 1 คะแนน
   ระดับ 2 ที่ 5 คะแนน แล้วแต่ละระดับต้องเก็บเพิ่มมากขึ้นอีก 2 คะแนน (5, 7, 9, 11 …): ระดับ 3 ที่ 12, ระดับ 4 ที่ 21 … ไม่จำกัด */
const PASS_PCT=.6;
function levelInfo(n){n=Math.max(0,n||0);let lv=1,need=5,acc=0;while(n>=acc+need){acc+=need;lv++;need+=2}return{lv,from:acc,to:acc+need,left:acc+need-n}}
const myLevel=()=>levelInfo(P.pass).lv;
const lvOf=id=>myLevel();
/* เปลี่ยนจากระบบเดิม: นับชุดที่เคยผ่านจากประวัติสอบในเครื่องเป็นคะแนนเริ่มต้น */
if(P.pass==null){let h=[];try{h=JSON.parse(localStorage.getItem('exam-history-v1')||'[]')}catch(e){}
  P.pass=(Array.isArray(h)?h:[]).filter(x=>x&&x.pct>=PASS_PCT).length;P.unsyncedPass=P.pass;try{localStorage.setItem('exam-drill-v1',JSON.stringify(P))}catch(e){}}

/* ---------- helpers ---------- */
const esc=t=>String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const fx=h=>h.replace(/≯/g,'<span class="nge">&gt;</span>').replace(/≮/g,'<span class="nge">&lt;</span>');
const c=(n,L)=>n===1?L:n+L;
const FR={2:'½',3:'⅓',4:'¼',5:'⅕'};
const rnd=a=>a[Math.floor(Math.random()*a.length)];
function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
