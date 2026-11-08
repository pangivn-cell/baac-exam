/* countmore.js — หมวดเพิ่มของวิชานับของ (ต่อจาก countobj.js): เสื้อผ้า คน รถหลากสี สัตว์ เครื่องเขียน ขนม ดอกไม้ ลูกบอล
   หมวดที่มีหลายสี สร้างทุกแบบ × ทุกสีเป็นคนละชนิด (เช่น เสื้อยืดสีแดง กับ เสื้อยืดสีน้ำเงิน) จึงมีชนิดให้สุ่มมาก โจทย์วนซ้ำยาก */

/* สี: เส้นขอบเข้มกว่าพื้น ถ้าพื้นเข้มมากใช้ขอบสีอ่อน จะได้เห็นชัดทั้งพื้นสว่างและพื้นมืด */
const CLR={แดง:'#e53935',น้ำเงิน:'#1e88e5',เขียว:'#43a047',เหลือง:'#fdd835',ชมพู:'#f48fb1',ดำ:'#37474f',ขาว:'#fafafa',ม่วง:'#8e24aa',ส้ม:'#fb8c00',เทา:'#9e9e9e',ฟ้า:'#81d4fa',น้ำตาล:'#8d6e63'};
function edgeOf(h){const n=parseInt(h.slice(1),16),r=n>>16,g=n>>8&255,b=n&255;
  if(.2126*r+.7152*g+.0722*b<70)return '#b0bec5';const f=v=>Math.round(v*.62).toString(16).padStart(2,'0');return '#'+f(r)+f(g)+f(b)}
/* สร้างชนิดจากแบบ × สี: key ต้องไม่ซ้ำกับหมวดอื่น */
function variants(pre,types,colors){
  const out={};
  for(const [t,T] of Object.entries(types))for(const cn of T.colors||colors){const c=CLR[cn]||cn;
    out[`${pre}_${t}_${cn}`]={name:`${T.name}${T.sep??'สี'}${T.cname?.[cn]||cn}`,base:T.name,sub:`${T.sep??'สี'}${T.cname?.[cn]||cn}`,unit:T.unit,type:t,svg:T.draw(c,edgeOf(c))}}
  return out;
}
const SW='stroke-width="1.6" stroke-linejoin="round"';

/* ---------- เสื้อผ้า ---------- */
const CLOTH_T={
  tshirt:{name:'เสื้อยืด',unit:'ตัว',draw:(c,s)=>`<path d="M-12-22L-27-13L-21-1L-14-5L-14,24L14,24L14-5L21-1L27-13L12-22Q0-13-12-22Z" fill="${c}" stroke="${s}" ${SW}/>`},
  shirt:{name:'เสื้อเชิ้ต',unit:'ตัว',draw:(c,s)=>`<path d="M-11-22L-28-12L-25,12L-17,11L-15,24L15,24L17,11L25,12L28-12L11-22L0-12Z" fill="${c}" stroke="${s}" ${SW}/><path d="M0-12V24" stroke="${s}" stroke-width="1.4"/><path d="M-11-22L0-12L-7-7Z M11-22L0-12L7-7Z" fill="#fff" stroke="${s}" stroke-width="1.2"/>${[-2,6,14].map(y=>`<circle cx="2.6" cy="${y}" r="1.3" fill="${s}"/>`).join('')}`},
  pants:{name:'กางเกงขายาว',unit:'ตัว',draw:(c,s)=>`<path d="M-14-24L14-24L17,27L4,27L0-4L-4,27L-17,27Z" fill="${c}" stroke="${s}" ${SW}/><path d="M-14-18H14" stroke="${s}" stroke-width="1.4"/>`},
  shorts:{name:'กางเกงขาสั้น',unit:'ตัว',draw:(c,s)=>`<path d="M-17-14L17-14L20,12L3,12L0-1L-3,12L-20,12Z" fill="${c}" stroke="${s}" ${SW}/><path d="M-17-8H17" stroke="${s}" stroke-width="1.4"/>`},
  skirt:{name:'กระโปรง',unit:'ตัว',draw:(c,s)=>`<path d="M-10-18L10-18L23,20L-23,20Z" fill="${c}" stroke="${s}" ${SW}/><path d="M-10-13H10M-4-13L-8,20M4-13L8,20" stroke="${s}" stroke-width="1.3" fill="none"/>`},
  dress:{name:'ชุดเดรส',unit:'ชุด',draw:(c,s)=>`<path d="M-9-26L-9-15M9-26L9-15" stroke="${s}" stroke-width="2.4"/><path d="M-9-15L9-15L11-4L23,26L-23,26L-11-4Z" fill="${c}" stroke="${s}" ${SW}/><path d="M-11-4H11" stroke="${s}" stroke-width="1.4"/>`},
  cap:{name:'หมวกแก๊ป',unit:'ใบ',draw:(c,s)=>`<path d="M-20,6A20,20 0 0 1 20,6Z" fill="${c}" stroke="${s}" ${SW}/><path d="M14,6Q30,6 32,13L12,13Z" fill="${c}" stroke="${s}" ${SW}/><path d="M0-14V6M-12-8Q-6,0-6,6M12-8Q6,0 6,6" stroke="${s}" stroke-width="1.2" fill="none"/><circle cy="-14" r="2.4" fill="${s}"/>`},
  socks:{name:'ถุงเท้า',unit:'คู่',draw:(c,s)=>[[-9,-1],[8,2]].map(([x,y])=>`<g transform="translate(${x} ${y})"><path d="M-6-22L6-22L6,4L14,10Q19,17 12,22L-1,22Q-8,20-6,11Z" fill="${c}" stroke="${s}" ${SW}/><path d="M-6-17H6" stroke="${s}" stroke-width="2"/></g>`).join('')},
  shoes:{name:'รองเท้าผ้าใบ',unit:'คู่',draw:(c,s)=>[[-3,-9,.85],[3,9,1]].map(([x,y,k])=>`<g transform="translate(${x} ${y}) scale(${k})"><path d="M-20,4Q-20-6-12-8L-4-13Q3-4 12-2Q21,0 21,6L21,8L-20,8Z" fill="${c}" stroke="${s}" ${SW}/><rect x="-21" y="7" width="43" height="5" rx="2" fill="#eceff1" stroke="#90a4ae"/><path d="M-6-8L-1-4M-3-10L2-6" stroke="#fff" stroke-width="1.5"/></g>`).join('')},
  hoodie:{name:'เสื้อกันหนาว',unit:'ตัว',draw:(c,s)=>`<path d="M-12-20L-28-8L-26,20L-18,20L-16,0L-15,26L15,26L16,0L18,20L26,20L28-8L12-20Z" fill="${c}" stroke="${s}" ${SW}/><path d="M-12-20Q0-36 12-20Q0-11-12-20Z" fill="${c}" stroke="${s}" ${SW}/><path d="M-7,8H7V17H-7Z" fill="none" stroke="${s}" stroke-width="1.3"/>`},
};
const CLOTHES=variants('cl',CLOTH_T,['แดง','น้ำเงิน','เขียว','เหลือง','ชมพู','ดำ','ขาว','ม่วง','ส้ม']);

/* ---------- รถยนต์แยกแบบแยกสี ---------- */
const WIN='#bbdefb';
const CAR_T={
  sedan:{name:'รถเก๋ง',unit:'คัน',draw:(c,s)=>`<path d="M-30,10L-30,0Q-28-4-20-5L-12-15Q-8-18 0-18L10-18Q16-18 20-12L24-5Q30-4 30,2L30,10Z" fill="${c}" stroke="${s}" ${SW}/><path d="M-9-6L-4-14L3-14L3-6Z M7-6L7-14L12-14Q15-14 18-6Z" fill="${WIN}"/>${WHL(-17)}${WHL(17)}`},
  pickup:{name:'รถกระบะ',unit:'คัน',draw:(c,s)=>`<path d="M-30,10L-30-3L-2-3L2-16L17-16L25-4Q30-3 30,2L30,10Z" fill="${c}" stroke="${s}" ${SW}/><path d="M5-13L15-13L21-4L5-4Z" fill="${WIN}"/>${WHL(-17)}${WHL(17)}`},
  van:{name:'รถตู้',unit:'คัน',draw:(c,s)=>`<path d="M-30,10L-30-16Q-30-20-26-20L14-20Q20-20 24-10L30-4L30,10Z" fill="${c}" stroke="${s}" ${SW}/><path d="M-26-15L-14-15L-14-6L-26-6Z M-11-15L1-15L1-6L-11-6Z M4-15L14-15Q18-15 21-6L4-6Z" fill="${WIN}"/>${WHL(-17)}${WHL(17)}`},
  suv:{name:'รถเอสยูวี',unit:'คัน',draw:(c,s)=>`<path d="M-30,10L-30-12Q-30-18-24-18L12-18Q18-18 22-10L30-6L30,10Z" fill="${c}" stroke="${s}" ${SW}/><path d="M-26-14L-12-14L-12-7L-26-7Z M-9-14L5-14L5-7L-9-7Z M8-14L13-14Q16-14 19-7L8-7Z" fill="${WIN}"/><rect x="-32" y="-2" width="4" height="8" rx="1" fill="#546e7a"/>${WHL(-17,11,8)}${WHL(17,11,8)}`},
  sport:{name:'รถสปอร์ต',unit:'คัน',draw:(c,s)=>`<path d="M-32,10L-32,2Q-30-2-20-3L-8-11Q0-13 10-11L22-4Q32-2 32,4L32,10Z" fill="${c}" stroke="${s}" ${SW}/><path d="M-6-4L-2-9L8-9L14-4Z" fill="${WIN}"/><path d="M-32-1L-26-4" stroke="${s}" stroke-width="2.5"/>${WHL(-18,11,7)}${WHL(18,11,7)}`},
  taxi:{name:'แท็กซี่',unit:'คัน',draw:(c,s)=>`<rect x="-7" y="-23" width="14" height="5" rx="1.5" fill="#fff59d" stroke="#f9a825"/><path d="M-30,10L-30,0Q-28-4-20-5L-12-15Q-8-18 0-18L10-18Q16-18 20-12L24-5Q30-4 30,2L30,10Z" fill="${c}" stroke="${s}" ${SW}/><path d="M-9-6L-4-14L3-14L3-6Z M7-6L7-14L12-14Q15-14 18-6Z" fill="${WIN}"/>${WHL(-17)}${WHL(17)}`,colors:['ชมพู','เหลือง','เขียว','ส้ม','ฟ้า']},
};
const CARS=variants('car',CAR_T,['แดง','ขาว','ดำ','น้ำเงิน','เทา','เหลือง','เขียว']);

/* ---------- คน: แยกเพศ วัย และอาชีพ (สีผิวเดียวกันทุกคน) ---------- */
const SKIN='#f2c79a';
function person(o){
  const k=o.kid?.78:1,t=o.top,b=o.bottom||'#37474f',hc=o.hair||'#3e2723',s=edgeOf(t);
  let g='';
  if(o.long)g+=`<path d="M-8.5-21Q-9.5-31 0-31Q9.5-31 8.5-21L9.5-9L-9.5-9Z" fill="${hc}"/>`;
  /* ขา: กางเกงขายาว ขาสั้น หรือกระโปรง */
  if(o.skirt)g+=`<rect x="-6" y="16" width="4" height="12" fill="${SKIN}"/><rect x="2" y="16" width="4" height="12" fill="${SKIN}"/><path d="M-11,6L11,6L15,19L-15,19Z" fill="${b}" stroke="${edgeOf(b)}" stroke-width="1.2"/>`;
  else if(o.shorts)g+=`<rect x="-8" y="16" width="6" height="12" fill="${SKIN}"/><rect x="2" y="16" width="6" height="12" fill="${SKIN}"/><path d="M-10,6L10,6L10,17L1,17L0,12L-1,17L-10,17Z" fill="${b}" stroke="${edgeOf(b)}" stroke-width="1.2"/>`;
  else g+=`<path d="M-10,6L10,6L9,28L2,28L0,13L-2,28L-9,28Z" fill="${b}" stroke="${edgeOf(b)}" stroke-width="1.2"/>`;
  g+=`<rect x="-15.5" y="-12" width="5" height="17" rx="2.5" fill="${t}" stroke="${s}" stroke-width="1.2"/><rect x="10.5" y="-12" width="5" height="17" rx="2.5" fill="${t}" stroke="${s}" stroke-width="1.2"/>`;
  g+=`<path d="M-11-10Q-11-14-7-14L7-14Q11-14 11-10L11,8L-11,8Z" fill="${t}" stroke="${s}" stroke-width="1.3"/>`;
  g+=o.extra||'';
  g+=`<circle cy="-21" r="7.5" fill="${SKIN}" stroke="#bf8a5c" stroke-width="1"/><circle cx="-2.6" cy="-21" r="1" fill="#3e2723"/><circle cx="2.6" cy="-21" r="1" fill="#3e2723"/>`;
  if(!o.long&&!o.hat)g+=`<path d="M-7.5-21Q-8-30 0-30Q8-30 7.5-21Q4-26 0-26Q-4-26-7.5-21Z" fill="${hc}"/>`;
  if(o.long)g+=`<path d="M-7.5-22Q-6-29 0-29Q6-29 7.5-22Q3-26-7.5-22Z" fill="${hc}"/>`;
  if(o.tails)g+=`<circle cx="-9.5" cy="-24" r="3.5" fill="${hc}"/><circle cx="9.5" cy="-24" r="3.5" fill="${hc}"/>`;
  if(o.bun)g+=`<circle cy="-30" r="3.8" fill="${hc}"/>`;
  g+=o.hat||'';
  if(o.cane)g+=`<path d="M17,-1L19,28M17,-1Q17-5 13-5" stroke="#6d4c41" stroke-width="2.4" fill="none" stroke-linecap="round"/>`;
  return `<g transform="translate(0 ${o.kid?6:0}) scale(${k})">${g}</g>`;
}
const HELMET=(c)=>`<path d="M-9-23A9,9 0 0 1 9-23Z" fill="${c}" stroke="${edgeOf(c)}" stroke-width="1.2"/><rect x="-11" y="-24" width="22" height="2.5" rx="1" fill="${c}" stroke="${edgeOf(c)}" stroke-width="1"/>`;
const PEOPLE={
  man:{name:'ผู้ชาย',unit:'คน',svg:person({top:'#1e88e5',bottom:'#37474f'})},
  woman:{name:'ผู้หญิง',unit:'คน',svg:person({top:'#f06292',bottom:'#8e24aa',skirt:true,long:true})},
  boy:{name:'เด็กชาย',unit:'คน',svg:person({kid:true,top:'#fdd835',bottom:'#1565c0',shorts:true})},
  girl:{name:'เด็กหญิง',unit:'คน',svg:person({kid:true,top:'#e53935',bottom:'#e53935',skirt:true,tails:true})},
  grandpa:{name:'คุณตา',unit:'คน',svg:person({top:'#8d6e63',bottom:'#757575',hair:'#bdbdbd',cane:true})},
  grandma:{name:'คุณยาย',unit:'คน',svg:person({top:'#7e57c2',bottom:'#2e7d32',skirt:true,hair:'#bdbdbd',bun:true,cane:true})},
  police:{name:'ตำรวจ',unit:'คน',clash:'navy',svg:person({top:'#283593',bottom:'#283593',hat:`<path d="M-9-25H9L10-31Q0-35-10-31Z" fill="#1a237e"/><rect x="-11" y="-26" width="22" height="3" rx="1" fill="#212121"/><circle cy="-29" r="1.6" fill="#fdd835"/>`,extra:`<circle cx="-5" cy="-6" r="1.6" fill="#fdd835"/>`})},
  soldier:{name:'ทหาร',unit:'คน',svg:person({top:'#558b2f',bottom:'#33691e',hat:HELMET('#558b2f')})},
  doctor:{name:'หมอ',unit:'คน',clash:'white',svg:person({top:'#fafafa',bottom:'#546e7a',extra:`<path d="M-4-14L0-6L4-14Z" fill="#81d4fa"/><path d="M-6-13Q-7-1 0-1Q7-1 6-13" stroke="#546e7a" stroke-width="1.5" fill="none"/><circle cy="-1" r="1.8" fill="#546e7a"/>`})},
  nurse:{name:'พยาบาล',unit:'คน',clash:'white',svg:person({top:'#fafafa',bottom:'#fafafa',skirt:true,long:true,hair:'#4e342e',hat:`<path d="M-7-28H7L6-33H-6Z" fill="#fafafa" stroke="#90a4ae"/><path d="M0-32.5V-28.5M-2-30.5H2" stroke="#e53935" stroke-width="1.3"/>`})},
  chef:{name:'พ่อครัว',unit:'คน',clash:'white',svg:person({top:'#fafafa',bottom:'#212121',hat:`<path d="M-6-27H6V-32Q10-35 6-38Q3-42 0-38Q-3-42-6-38Q-10-35-6-32Z" fill="#fafafa" stroke="#90a4ae"/>`,extra:`<path d="M-3-8H3M-3-2H3" stroke="#90a4ae" stroke-width="2" stroke-dasharray="2 2"/>`})},
  farmer:{name:'ชาวนา',unit:'คน',clash:'navy',svg:person({top:'#3949ab',bottom:'#3949ab',hat:`<path d="M-17-25L17-25L6-30L0-37L-6-30Z" fill="#d7b56d" stroke="#8d6e63" stroke-width="1"/>`,extra:`<path d="M-11-2H11" stroke="#e53935" stroke-width="2.5"/>`})},
  builder:{name:'ช่างก่อสร้าง',unit:'คน',svg:person({top:'#fb8c00',bottom:'#1565c0',hat:HELMET('#fdd835'),extra:`<path d="M-11-4H11M-11,2H11" stroke="#fff59d" stroke-width="2"/>`})},
  fire:{name:'นักดับเพลิง',unit:'คน',svg:person({top:'#c62828',bottom:'#c62828',hat:HELMET('#ffb300'),extra:`<path d="M-11-2H11" stroke="#fff176" stroke-width="2.5"/>`})},
  stuboy:{name:'นักเรียนชาย',unit:'คน',clash:'white',svg:person({kid:true,top:'#fafafa',bottom:'#1a237e',shorts:true})},
  stugirl:{name:'นักเรียนหญิง',unit:'คน',clash:'white',svg:person({kid:true,top:'#fafafa',bottom:'#1a237e',skirt:true,tails:true})},
};

/* ---------- สัตว์ (มุมด้านข้าง หันขวา) ---------- */
function beast(o){
  const b=o.body,s=edgeOf(b),L=o.leg||b,legs=[-14,-7,6,13].map((x,i)=>`<rect x="${x}" y="${o.ly||5}" width="${o.lw||4}" height="${o.lh||17}" rx="1.5" fill="${L}" stroke="${edgeOf(L)}" stroke-width="1"/>`).join('');
  return `${o.back||''}${legs}<ellipse cx="-1" cy="0" rx="${o.rx||20}" ry="${o.ry||11}" fill="${b}" stroke="${s}" stroke-width="1.5"/>${o.mid||''}<ellipse cx="${o.hx||19}" cy="${o.hy||-9}" rx="${o.hr||8}" ry="${o.hry||7}" fill="${o.head||b}" stroke="${edgeOf(o.head||b)}" stroke-width="1.5"/><circle cx="${(o.hx||19)+2}" cy="${(o.hy||-9)-2}" r="1.3" fill="#212121"/>${o.front||''}`;
}
const ANIMALS={
  cow:{name:'วัว',unit:'ตัว',svg:beast({body:'#fafafa',mid:`<ellipse cx="-8" cy="-3" rx="6" ry="4" fill="#424242"/><ellipse cx="7" cy="3" rx="4" ry="3" fill="#424242"/>`,back:`<path d="M-21-2Q-27,4-25,12" stroke="#9e9e9e" stroke-width="2" fill="none"/>`,front:`<ellipse cx="25" cy="-6" rx="3.5" ry="3" fill="#f8bbd0"/><path d="M15-15L13-20M21-15L23-20" stroke="#bcaaa4" stroke-width="2.2" stroke-linecap="round"/>`})},
  buffalo:{name:'ควาย',unit:'ตัว',svg:beast({body:'#546e7a',front:`<path d="M14-14Q6-20 12-24M23-14Q30-20 25-24" stroke="#d7ccc8" stroke-width="2.6" fill="none" stroke-linecap="round"/>`,back:`<path d="M-21-2Q-27,4-25,12" stroke="#546e7a" stroke-width="2" fill="none"/>`})},
  pig:{name:'หมู',unit:'ตัว',svg:beast({body:'#f8bbd0',ly:6,lh:13,lw:5,front:`<ellipse cx="27" cy="-8" rx="2.5" ry="3.5" fill="#f48fb1" stroke="#c2185b" stroke-width="1"/><path d="M14-15L17-21L20-15Z" fill="#f48fb1" stroke="#c2185b" stroke-width="1"/>`,back:`<path d="M-21-2q-5-3-3-6q3-1 2,3" stroke="#c2185b" stroke-width="1.5" fill="none"/>`})},
  goat:{name:'แพะ',unit:'ตัว',svg:beast({body:'#d7ccc8',rx:17,ry:10,front:`<path d="M19-2L21,6L24-2Z" fill="#a1887f"/><path d="M15-15Q11-22 7-21M19-15Q16-23 12-23" stroke="#8d6e63" stroke-width="2" fill="none"/>`})},
  sheep:{name:'แกะ',unit:'ตัว',svg:`${[-14,-7,6,13].map(x=>`<rect x="${x}" y="5" width="4" height="16" fill="#424242"/>`).join('')}${[[-14,-4],[-6,-8],[3,-8],[11,-4],[-10,4],[0,5],[9,4]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="8" fill="#f5f5f5" stroke="#bdbdbd" stroke-width="1.2"/>`).join('')}<ellipse cx="20" cy="-8" rx="6" ry="7" fill="#424242" stroke="#b0bec5" stroke-width="1"/><circle cx="22" cy="-10" r="1.3" fill="#fff"/>`},
  horse:{name:'ม้า',unit:'ตัว',svg:beast({body:'#8d6e63',hx:20,hy:-14,hr:5.5,hry:10,lh:19,front:`<path d="M15-22Q10-16 12-6" stroke="#4e342e" stroke-width="4" fill="none"/>`,back:`<path d="M-20-4Q-28,2-26,14" stroke="#4e342e" stroke-width="4" fill="none" stroke-linecap="round"/>`})},
  elephant:{name:'ช้าง',unit:'เชือก',svg:beast({body:'#90a4ae',rx:22,ry:14,lw:7,ly:6,lh:16,hx:18,hy:-6,hr:10,hry:10,front:`<ellipse cx="12" cy="-5" rx="6" ry="9" fill="#78909c" stroke="#546e7a" stroke-width="1.2"/><path d="M26-4Q30,8 26,18" stroke="#90a4ae" stroke-width="5" fill="none" stroke-linecap="round"/>`})},
  rabbit:{name:'กระต่าย',unit:'ตัว',svg:`<ellipse cx="-3" cy="10" rx="15" ry="12" fill="#eceff1" stroke="#90a4ae" stroke-width="1.5"/><circle cx="-17" cy="8" r="4" fill="#fff" stroke="#90a4ae"/><ellipse cx="9" cy="20" rx="7" ry="3" fill="#eceff1" stroke="#90a4ae"/><ellipse cx="4" cy="-22" rx="3.5" ry="11" fill="#eceff1" stroke="#90a4ae" stroke-width="1.3" transform="rotate(-12 4 -22)"/><ellipse cx="11" cy="-21" rx="3.5" ry="11" fill="#eceff1" stroke="#90a4ae" stroke-width="1.3" transform="rotate(14 11 -21)"/><circle cx="9" cy="-5" r="9" fill="#eceff1" stroke="#90a4ae" stroke-width="1.5"/><circle cx="12" cy="-7" r="1.4" fill="#212121"/><circle cx="17" cy="-4" r="1.3" fill="#f48fb1"/>`},
  chicken:{name:'ไก่',unit:'ตัว',svg:`<path d="M-14-6L-24-16L-20-2L-26-6L-18,6Z" fill="#6d4c41"/><path d="M-4,14V26M4,14V26" stroke="#ff8f00" stroke-width="2.2"/><ellipse cx="-2" cy="4" rx="15" ry="12" fill="#a1887f" stroke="#5d4037" stroke-width="1.5"/><circle cx="10" cy="-10" r="8" fill="#a1887f" stroke="#5d4037" stroke-width="1.5"/><path d="M5-17Q7-24 10-18Q12-24 15-17Z" fill="#e53935"/><path d="M17-11L23-9L17-7Z" fill="#fdd835"/><path d="M15-5Q16,0 13,0" fill="#e53935" stroke="#e53935"/><circle cx="12" cy="-11" r="1.3" fill="#212121"/>`},
  duck:{name:'เป็ด',unit:'ตัว',svg:`<path d="M-4,14V24L-8,26M4,14V24L0,26" stroke="#ff8f00" stroke-width="2.2" fill="none"/><path d="M-18,0Q-24-6-20-8Q-14-2-10-2Z" fill="#fafafa" stroke="#9e9e9e"/><ellipse cx="-2" cy="5" rx="17" ry="10" fill="#fafafa" stroke="#9e9e9e" stroke-width="1.5"/><circle cx="11" cy="-10" r="7.5" fill="#fafafa" stroke="#9e9e9e" stroke-width="1.5"/><path d="M17-11Q25-11 25-7L17-7Z" fill="#ff9800"/><circle cx="12" cy="-12" r="1.3" fill="#212121"/>`},
};

/* ---------- เครื่องเขียน ---------- */
const STAT_T={
  pencil:{name:'ดินสอ',unit:'แท่ง',draw:(c,s)=>`<g transform="rotate(-35)"><rect x="-26" y="-4.5" width="5" height="9" rx="1.5" fill="#f48fb1"/><rect x="-21" y="-4.5" width="3" height="9" fill="#bdbdbd"/><rect x="-18" y="-4.5" width="30" height="9" fill="${c}" stroke="${s}" stroke-width="1.2"/><path d="M12-4.5L24,0L12,4.5Z" fill="#ffe0b2" stroke="#bcaaa4"/><path d="M20-1.5L24,0L20,1.5Z" fill="#424242"/></g>`},
  pen:{name:'ปากกา',unit:'ด้าม',draw:(c,s)=>`<g transform="rotate(-35)"><rect x="-26" y="-3.5" width="38" height="7" rx="3" fill="#eceff1" stroke="#90a4ae"/><rect x="-26" y="-4.5" width="14" height="9" rx="2" fill="${c}" stroke="${s}" stroke-width="1.2"/><path d="M-14-4.5H-4" stroke="${c}" stroke-width="2"/><path d="M12-3.5L22,0L12,3.5Z" fill="${c}" stroke="${s}"/></g>`},
  book:{name:'สมุด',unit:'เล่ม',draw:(c,s)=>`<rect x="-16" y="-22" width="32" height="44" rx="2" fill="${c}" stroke="${s}" ${SW}/><rect x="-7" y="-12" width="18" height="9" rx="1" fill="#fff" stroke="${s}" stroke-width=".8"/>${[-16,-8,0,8,16].map(y=>`<circle cx="-16" cy="${y}" r="2.2" fill="none" stroke="#90a4ae" stroke-width="1.5"/>`).join('')}`},
  eraser:{name:'ยางลบ',unit:'ก้อน',draw:(c,s)=>`<g transform="rotate(-20)"><rect x="-20" y="-9" width="40" height="18" rx="3" fill="#fafafa" stroke="#9e9e9e" stroke-width="1.3"/><rect x="-4" y="-10" width="24" height="20" rx="1" fill="${c}" stroke="${s}" stroke-width="1.3"/></g>`},
};
const STATIONERY={...variants('st',STAT_T,['แดง','น้ำเงิน','เขียว','เหลือง','ม่วง']),
  ruler:{name:'ไม้บรรทัด',unit:'อัน',svg:`<g transform="rotate(-30)"><rect x="-28" y="-7" width="56" height="14" rx="1.5" fill="#ffe082" stroke="#f9a825" stroke-width="1.4"/>${[...Array(11)].map((_,i)=>`<path d="M${-25+i*5}-7V${i%2?-3:0}" stroke="#795548" stroke-width="1"/>`).join('')}</g>`},
  scissors:{name:'กรรไกร',unit:'อัน',svg:`<path d="M-6,8L22-14M-6-8L22,14" stroke="#90a4ae" stroke-width="4" stroke-linecap="round"/><circle cx="-13" cy="12" r="7" fill="none" stroke="#e53935" stroke-width="4"/><circle cx="-13" cy="-12" r="7" fill="none" stroke="#e53935" stroke-width="4"/><circle cx="2" cy="0" r="2" fill="#546e7a"/>`},
};

/* ---------- ขนม ---------- */
const SNACK_T={
  donut:{name:'โดนัท',unit:'ชิ้น',sep:'หน้า',cname:{'#6d4c41':'ช็อกโกแลต'},draw:(c,s)=>`<circle r="20" fill="#e0a868" stroke="#a1662f" stroke-width="1.5"/><path d="M-17-4Q-18-17-4-18Q12-19 17-8Q19,4 13,10Q8,6 4,12Q-4,8-9,12Q-15,8-17-4Z" fill="${c}" stroke="${s}" stroke-width="1.2"/><circle r="6" fill="var(--paper,#fff)" stroke="#a1662f" stroke-width="1.5"/>${[[-10,-9,'#fff59d'],[8,-11,'#81d4fa'],[11,2,'#a5d6a7'],[-12,3,'#fff']].map(([x,y,f])=>`<rect x="${x}" y="${y}" width="4" height="1.6" rx=".8" fill="${f}" transform="rotate(30 ${x} ${y})"/>`).join('')}`,colors:['ชมพู','#6d4c41','ขาว','เขียว']},
  cupcake:{name:'คัพเค้ก',unit:'ชิ้น',sep:'ครีม',draw:(c,s)=>`<path d="M-15,2L15,2L11,24L-11,24Z" fill="#ffcc80" stroke="#ef6c00" stroke-width="1.3"/><path d="M-8,2L-6,24M0,2V24M8,2L6,24" stroke="#ef6c00" stroke-width="1"/><path d="M-17,3Q-20-8-10-10Q-10-20 0-19Q10-20 10-10Q20-8 17,3Z" fill="${c}" stroke="${s}" stroke-width="1.3"/><circle cy="-22" r="4" fill="#e53935"/>`,colors:['ชมพู','ขาว','ฟ้า','ม่วง']},
  icecream:{name:'ไอศกรีม',unit:'โคน',sep:'รส',cname:{'#f48fb1':'สตรอว์เบอร์รี','#6d4c41':'ช็อกโกแลต','#a5d6a7':'ชาเขียว','#fff8e1':'วานิลลา'},draw:(c,s)=>`<path d="M-12-2L12-2L0,28Z" fill="#e0a868" stroke="#a1662f" stroke-width="1.3"/><path d="M-8,4L4,18M-2,-1L8,10M6-2L-6,12" stroke="#a1662f" stroke-width="1"/><circle cy="-12" r="14" fill="${c}" stroke="${s}" stroke-width="1.4"/><path d="M-14-6Q-10-1-6-5Q-2,0 2-5Q6,0 10-5Q14-1 14-6" fill="${c}" stroke="${s}" stroke-width="1.2"/>`,colors:['#f48fb1','#6d4c41','#a5d6a7','#fff8e1']},
  candy:{name:'ลูกอม',unit:'เม็ด',draw:(c,s)=>`<path d="M-12,0L-26-9L-26,9Z M12,0L26-9L26,9Z" fill="${c}" stroke="${s}" stroke-width="1.2" stroke-linejoin="round"/><circle r="12" fill="${c}" stroke="${s}" stroke-width="1.4"/><path d="M-6-8Q0-2-2,8" stroke="#fff" stroke-width="2.5" opacity=".6" fill="none"/>`,colors:['แดง','เขียว','เหลือง','ม่วง','ส้ม']},
};
const SNACKS={...variants('sn',SNACK_T,[]),
  cookie:{name:'คุกกี้',unit:'ชิ้น',svg:`<circle r="20" fill="#d7a86e" stroke="#8d6e63" stroke-width="1.5"/>${[[-8,-8],[6,-10],[10,4],[-4,6],[-12,4],[2,13],[-2,-2]].map(([x,y])=>`<ellipse cx="${x}" cy="${y}" rx="2.6" ry="2" fill="#4e342e"/>`).join('')}`},
  cake:{name:'เค้ก',unit:'ชิ้น',svg:`<path d="M-22,20L-22,0L20-14L20,6Z" fill="#fff8e1" stroke="#bcaaa4" stroke-width="1.3"/><path d="M-22,0L20-14L22-12L-20,2Z" fill="#fafafa"/><path d="M-22,10L20-4" stroke="#f48fb1" stroke-width="3"/><path d="M-22,20L20,6L20,20L-22,24Z" fill="#ffe0b2" stroke="#bcaaa4"/><circle cx="2" cy="-12" r="5" fill="#e53935"/><path d="M2-17Q4-21 7-20" stroke="#43a047" stroke-width="1.6" fill="none"/>`},
};

/* ---------- ดอกไม้ ---------- */
const STEM=`<path d="M0,6V28" stroke="#388e3c" stroke-width="2.6"/><path d="M0,20Q-10,12-14,18Q-6,24 0,20Z" fill="#66bb6a" stroke="#2e7d32"/>`;
const FLOWER_T={
  rose:{name:'ดอกกุหลาบ',unit:'ดอก',draw:(c,s)=>`${STEM}<circle cy="-6" r="13" fill="${c}" stroke="${s}" stroke-width="1.4"/><path d="M-2-8Q4-12 4-6Q4,0-3-1Q-9-3-7-10Q-4-17 4-15Q12-12 9-4" stroke="${s}" stroke-width="1.3" fill="none"/>`,colors:['แดง','ชมพู','ขาว','เหลือง']},
  tulip:{name:'ดอกทิวลิป',unit:'ดอก',draw:(c,s)=>`${STEM}<path d="M-11-18Q-13,4 0,6Q13,4 11-18L5-9L0-20L-5-9Z" fill="${c}" stroke="${s}" stroke-width="1.4" stroke-linejoin="round"/>`,colors:['แดง','เหลือง','ม่วง','ส้ม','ชมพู']},
  lotus:{name:'ดอกบัว',unit:'ดอก',draw:(c,s)=>`<path d="M0,10V28" stroke="#388e3c" stroke-width="2.6"/>${[-50,-25,25,50,0].map(a=>`<path d="M0,8Q-9-6 0-24Q9-6 0,8Z" fill="${c}" stroke="${s}" stroke-width="1.2" transform="rotate(${a} 0 8)"/>`).join('')}`,colors:['ชมพู','ขาว','ม่วง']},
  marigold:{name:'ดอกดาวเรือง',unit:'ดอก',draw:(c,s)=>`${STEM}${[0,40,80,120,160,200,240,280,320].map(a=>`<circle cx="${f1(9*Math.cos(a*Math.PI/180))}" cy="${f1(-6+9*Math.sin(a*Math.PI/180))}" r="6" fill="${c}" stroke="${s}" stroke-width="1"/>`).join('')}<circle cy="-6" r="6" fill="${c}" stroke="${s}" stroke-width="1"/>`,colors:['ส้ม','เหลือง']},
};
const FLOWERS={...variants('fl',FLOWER_T,[]),
  sunflower:{name:'ดอกทานตะวัน',unit:'ดอก',svg:`${STEM}${[...Array(12)].map((_,i)=>`<ellipse cx="0" cy="-20" rx="3.6" ry="7" fill="#fdd835" stroke="#f9a825" transform="rotate(${i*30} 0 -6)"/>`).join('')}<circle cy="-6" r="8" fill="#6d4c41" stroke="#3e2723"/>`},
  daisy:{name:'ดอกเดซี่',unit:'ดอก',svg:`${STEM}${[...Array(10)].map((_,i)=>`<ellipse cx="0" cy="-17" rx="3" ry="7" fill="#fafafa" stroke="#bdbdbd" transform="rotate(${i*36} 0 -6)"/>`).join('')}<circle cy="-6" r="5" fill="#fdd835" stroke="#f9a825"/>`},
};

/* ---------- ลูกบอล ---------- */
const BALLS={
  football:{name:'ลูกฟุตบอล',unit:'ลูก',svg:(()=>{const P=(r,a)=>[f1(r*Math.cos(a*Math.PI/180)),f1(r*Math.sin(a*Math.PI/180))].join(','),A=[0,1,2,3,4].map(i=>-90+72*i);
    return `<circle r="20" fill="#fafafa" stroke="#616161" stroke-width="1.5"/>${A.map(a=>`<path d="M${P(7,a)}L${P(13.5,a)}" stroke="#616161" stroke-width="1.2"/><polygon points="${[[19.6,a-17],[14,a-13],[13,a],[14,a+13],[19.6,a+17]].map(([r,b])=>P(r,b)).join(' ')}" fill="#212121"/>`).join('')}<polygon points="${A.map(a=>P(7,a)).join(' ')}" fill="#212121"/>`})()},
  basket:{name:'ลูกบาสเกตบอล',unit:'ลูก',svg:`<circle r="20" fill="#ef6c00" stroke="#4e342e" stroke-width="1.5"/><path d="M-20,0H20M0-20V20M-14-14Q-6,0-14,14M14-14Q6,0 14,14" stroke="#3e2723" stroke-width="1.5" fill="none"/>`},
  tennis:{name:'ลูกเทนนิส',unit:'ลูก',svg:`<circle r="15" fill="#d4e157" stroke="#9e9d24" stroke-width="1.5"/><path d="M-11-10Q-3,0-11,10M11-10Q3,0 11,10" stroke="#fff" stroke-width="2" fill="none"/>`},
  volley:{name:'ลูกวอลเลย์บอล',unit:'ลูก',svg:`<circle r="20" fill="#fafafa" stroke="#616161" stroke-width="1.5"/><path d="M0,0Q-2-12-14-14A20,20 0 0 1 14-14Q4-10 0,0Z" fill="#1e88e5"/><path d="M0,0Q12,4 18,14A20,20 0 0 0 20,0Q8-2 0,0Z" fill="#fdd835"/><path d="M0,0Q-10,8-8,19" stroke="#616161" stroke-width="1.3" fill="none"/>`},
  baseball:{name:'ลูกเบสบอล',unit:'ลูก',svg:`<circle r="15" fill="#fafafa" stroke="#9e9e9e" stroke-width="1.5"/><path d="M-9-11Q-3,0-9,11M9-11Q3,0 9,11" stroke="#e53935" stroke-width="1.3" fill="none" stroke-dasharray="2 2"/>`},
  beach:{name:'ลูกบอลชายหาด',unit:'ลูก',svg:`<circle r="20" fill="#fafafa" stroke="#757575" stroke-width="1.5"/><path d="M0-20Q-14,0 0,20Q-20,14-20,0Q-20-14 0-20Z" fill="#e53935"/><path d="M0-20Q14,0 0,20Q20,14 20,0Q20-14 0-20Z" fill="#1e88e5"/><path d="M0-20Q-6,0 0,20Q6,0 0-20Z" fill="#fdd835"/><circle cy="-2" r="3" fill="#fafafa" stroke="#757575"/>`},
  rugby:{name:'ลูกรักบี้',unit:'ลูก',svg:`<ellipse rx="24" ry="14" fill="#8d6e63" stroke="#4e342e" stroke-width="1.5" transform="rotate(-25)"/><path d="M-8,4L8-4M-6-1L-3,4M-2-3L1,2M2-5L5,0" stroke="#fafafa" stroke-width="1.6" transform="rotate(0)"/>`},
  pingpong:{name:'ลูกปิงปอง',unit:'ลูก',svg:`<circle r="11" fill="#ff9800" stroke="#e65100" stroke-width="1.5"/><ellipse cx="-4" cy="-4" rx="3" ry="2" fill="#fff" opacity=".5"/>`},
};

Object.assign(ITEM,CLOTHES,CARS,PEOPLE,ANIMALS,STATIONERY,SNACKS,FLOWERS,BALLS);
Object.assign(CNT_CATS,{
  clothes:{noun:'เสื้อผ้า',box:'ตะกร้าผ้า',add:'ใส่',rot:12,items:CLOTHES,variant:true},
  cars:{noun:'รถยนต์',box:'ลานจอดรถ',add:'นำ',rot:0,items:CARS,variant:true},
  /* คน: ไม่ถามแบบซื้อ แลกค่า งบประมาณ หรือแบ่งค่าของคน */
  people:{noun:'คน',box:'ห้องโถง',add:'พา',take:'ให้',want:'มี',kindW:'กลุ่ม',rot:0,items:PEOPLE,skip:['buy','equiv','budget','share']},
  animals:{noun:'สัตว์',box:'คอก',add:'นำ',rot:0,items:ANIMALS},
  stationery:{noun:'เครื่องเขียน',box:'กล่อง',add:'ใส่',rot:15,items:STATIONERY,variant:true},
  snacks:{noun:'ขนม',box:'ถาด',add:'วาง',rot:10,items:SNACKS,variant:true},
  flowers:{noun:'ดอกไม้',box:'ตะกร้า',add:'ใส่',rot:12,items:FLOWERS,variant:true},
  balls:{noun:'ลูกบอล',box:'ตะกร้า',add:'ใส่',rot:20,items:BALLS},
});
