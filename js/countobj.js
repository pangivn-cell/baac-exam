/* countobj.js — วิชานับของ: สร้าง "สถานการณ์" 1 ชุด (ของหมวดเดียวกันทั้งรูป ผลไม้ ผัก หรือรถ แต่ละชนิดมีค่าต่อหน่วย + ตะกร้า/ลานจอดที่มีของวาดเป็นรูป)
   แล้วถามต่อจากรูปเดียวกันครบจำนวนข้อของรอบ · รอบใหม่สร้างสถานการณ์ใหม่ (จำลายเซ็นที่เคยใช้ไว้ ไม่ให้ซ้ำ)
   ตัวเลือกตัวเลขเป็นลำดับห่างเท่ากัน (ห่างเป็นพหุคูณของ ห.ร.ม. ของค่าที่ใช้) คำตอบอยู่ตำแหน่งสุ่ม จึงเดาจากรูปแบบไม่ได้ */

/* รูปผลไม้วาดเอง จุดกึ่งกลาง (0,0) ขนาดราว 60×60 */
const FRUITS={
  strawberry:{name:'สตรอว์เบอร์รี',unit:'ลูก',clash:'red',svg:`<path d="M0,28C-22,12-26-8-18-16C-10-22 10-22 18-16C26-8 22,12 0,28Z" fill="#e53935" stroke="#b71c1c" stroke-width="1.5"/><g fill="#ffe082">${[[-9,-6],[0,-9],[9,-6],[-12,4],[-3,2],[6,4],[13,2],[-6,13],[3,13],[0,22]].map(([x,y])=>`<ellipse cx="${x}" cy="${y}" rx="1.4" ry="2.2"/>`).join('')}</g><path d="M-16-17L-6-13L0-23L6-13L16-17L8-8L0-11L-8-8Z" fill="#43a047" stroke="#2e7d32"/><rect x="-1.5" y="-28" width="3" height="7" rx="1.5" fill="#558b2f"/>`},
  apple:{name:'แอปเปิล',unit:'ลูก',clash:'red',svg:`<path d="M0-12C-10-20-26-14-24,4C-22,20-10,26 0,22C10,26 22,20 24,4C26-14 10-20 0-12Z" fill="#c62828" stroke="#8e0000" stroke-width="1.5"/><ellipse cx="-11" cy="-3" rx="4" ry="7" fill="#fff" opacity=".3" transform="rotate(20 -11 -3)"/><path d="M0-12C0-18 2-22 4-26" stroke="#5d4037" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M4-20C10-28 20-26 22-22C16-16 8-16 4-20Z" fill="#66bb6a" stroke="#2e7d32"/>`},
  watermelon:{name:'แตงโม',unit:'ลูก',svg:`<circle r="24" fill="#43a047" stroke="#1b5e20" stroke-width="1.5"/><g stroke="#1b5e20" stroke-width="3" fill="none">${[-14,-5,5,14].map(x=>`<path d="M${x*.6},-23C${x*1.25},-8 ${x*1.25},8 ${x*.6},23"/>`).join('')}</g><g transform="translate(-6 12)"><path d="M-19,0A19,19 0 0 0 19,0Z" fill="#2e7d32"/><path d="M-16,0A16,16 0 0 0 16,0Z" fill="#ef5350"/><g fill="#212121">${[[-8,4],[0,7],[8,4],[-4,11],[4,11]].map(([x,y])=>`<ellipse cx="${x}" cy="${y}" rx="1.3" ry="2"/>`).join('')}</g></g>`},
  grapes:{name:'องุ่น',unit:'พวง',clash:'purple',svg:`<path d="M2-20C2-26 6-28 10-28" stroke="#6d4c41" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M4-18C12-28 24-24 24-16C16-12 8-12 4-18Z" fill="#7cb342" stroke="#33691e"/>${[[-15,-10],[-5,-12],[5,-12],[15,-10],[-10,0],[0,-1],[10,0],[-5,10],[5,10],[0,20]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="6.6" fill="#7e57c2" stroke="#4527a0" stroke-width="1.2"/><circle cx="${x-2}" cy="${y-2}" r="1.8" fill="#fff" opacity=".4"/>`).join('')}`},
  mangosteen:{name:'มังคุด',unit:'ลูก',clash:'purple',svg:`<circle cy="4" r="21" fill="#6a1b4d" stroke="#38102a" stroke-width="1.5"/><ellipse cx="-8" cy="-3" rx="4" ry="6" fill="#fff" opacity=".2"/>${[-60,-20,20,60].map(a=>`<ellipse cx="0" cy="-15" rx="5" ry="8" fill="#689f38" stroke="#33691e" transform="rotate(${a} 0 -15)"/>`).join('')}<rect x="-2" y="-28" width="4" height="10" rx="2" fill="#558b2f"/>`},
  pineapple:{name:'สับปะรด',unit:'ลูก',svg:`${[-40,-18,0,18,40].map(a=>`<path d="M0-10L-5-22L0-34L5-22Z" fill="#43a047" stroke="#1b5e20" transform="rotate(${a} 0 -10)"/>`).join('')}<ellipse cy="9" rx="16" ry="20" fill="#ffb300" stroke="#e65100" stroke-width="1.5"/><g stroke="#e65100" stroke-width="1.3" fill="none">${[[-7,-4],[3,-4],[-11,4],[-2,4],[7,4],[-7,12],[3,12],[11,12],[-11,20],[-2,20],[7,20],[-4,26],[4,26]].map(([x,y])=>`<path d="M${x},${y}l3,3 3,-3"/>`).join('')}</g>`},
  orange:{name:'ส้ม',unit:'ลูก',svg:`<circle cy="3" r="21" fill="#fb8c00" stroke="#e65100" stroke-width="1.5"/><g fill="#e65100" opacity=".45">${[[-9,-4],[6,-8],[10,6],[-4,10],[-12,8],[2,18],[12,-2]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="1.2"/>`).join('')}</g><ellipse cx="-8" cy="-6" rx="4" ry="6" fill="#fff" opacity=".3"/><path d="M0-18C0-21 1-23 2-25" stroke="#5d4037" stroke-width="2.5" fill="none"/><path d="M2-22C8-30 18-28 20-24C14-18 6-18 2-22Z" fill="#43a047" stroke="#2e7d32"/>`},
  banana:{name:'กล้วย',unit:'หวี',svg:`${[-10,0,10].map((y,i)=>`<path d="M-24,${y-8}C-16,${y+16} 14,${y+16} 24,${y-10}C14,${y+4} -12,${y+4} -24,${y-8}Z" fill="${['#ffee58','#fdd835','#fbc02d'][i]}" stroke="#f57f17" stroke-width="1.2"/>`).join('')}<path d="M24-20L28-24" stroke="#6d4c41" stroke-width="4" stroke-linecap="round"/><circle cx="-24" cy="-18" r="1.8" fill="#4e342e"/><circle cx="-24" cy="-8" r="1.8" fill="#4e342e"/><circle cx="-24" cy="2" r="1.8" fill="#4e342e"/>`},
  coconut:{name:'มะพร้าว',unit:'ลูก',svg:`<circle cy="3" r="22" fill="#8d6e63" stroke="#4e342e" stroke-width="1.5"/><g stroke="#5d4037" stroke-width="1.2" opacity=".6">${[[-14,-8,-8,-12],[6,14,14,10],[-16,10,-10,14],[10,-12,16,-6]].map(([a,b,c,d])=>`<line x1="${a}" y1="${b}" x2="${c}" y2="${d}"/>`).join('')}</g><g fill="#3e2723"><circle cx="-6" cy="-6" r="3"/><circle cx="6" cy="-6" r="3"/><circle cy="3" r="3"/></g>`},
};
/* ผัก */
const VEGS={
  carrot:{name:'แครอท',unit:'หัว',svg:`${[-22,0,22].map(a=>`<ellipse cx="0" cy="-22" rx="3.5" ry="10" fill="#43a047" stroke="#1b5e20" transform="rotate(${a} 0 -12)"/>`).join('')}<path d="M-10-12C-10-17 10-17 10-12L2,28C1,31-1,31-2,28Z" fill="#fb8c00" stroke="#e65100" stroke-width="1.5"/><g stroke="#e65100" stroke-width="1.3">${[[-7,-4,-2],[3,4,7],[-5,12,-1],[1,19,4]].map(([a,y,b])=>`<line x1="${a}" y1="${y}" x2="${b}" y2="${y+1}"/>`).join('')}</g>`},
  cabbage:{name:'กะหล่ำปลี',unit:'หัว',svg:`<circle cy="3" r="23" fill="#9ccc65" stroke="#558b2f" stroke-width="1.5"/><circle cx="3" cy="0" r="13" fill="#c5e1a5" stroke="#7cb342"/><g stroke="#558b2f" stroke-width="1.5" fill="none"><path d="M-20-6C-10-2-8,12-12,22"/><path d="M20-4C10,0 10,14 14,22"/><path d="M3-13C0-4 2,6 3,13"/></g>`},
  corn:{name:'ข้าวโพด',unit:'ฝัก',svg:`<ellipse cy="0" rx="11" ry="25" fill="#fdd835" stroke="#f9a825" stroke-width="1.5"/><g fill="#fff59d">${[-18,-10,-2,6,14].flatMap(y=>[-5,0,5].map(x=>`<ellipse cx="${x}" cy="${y}" rx="2.2" ry="3"/>`)).join('')}</g><path d="M-3,28C-20,14-18-8-12-18C-11,0-8,14-3,28Z" fill="#66bb6a" stroke="#2e7d32"/><path d="M3,28C20,14 18-8 12-18C11,0 8,14 3,28Z" fill="#43a047" stroke="#2e7d32"/>`},
  eggplant:{name:'มะเขือม่วง',unit:'ลูก',svg:`<path d="M-4-12C-16-6-20,14-8,24C4,32 18,22 14,6C12-4 8-10 4-12Z" fill="#6a1b9a" stroke="#38006b" stroke-width="1.5"/><ellipse cx="-6" cy="6" rx="3" ry="8" fill="#fff" opacity=".25"/><path d="M-10-12L0-19L10-12L5-7L0-11L-5-7Z" fill="#7cb342" stroke="#33691e"/><rect x="-2" y="-27" width="4" height="10" rx="2" fill="#558b2f"/>`},
  chili:{name:'พริก',unit:'เม็ด',clash:'red',svg:`<path d="M-3-16C-14-2-12,16 8,28C0,12 2-4 7-14Z" fill="#e53935" stroke="#b71c1c" stroke-width="1.5"/><path d="M-6-15L2-21L8-15L2-12Z" fill="#43a047" stroke="#1b5e20"/><path d="M2-20C2-25 5-28 9-29" stroke="#2e7d32" stroke-width="2.5" fill="none" stroke-linecap="round"/>`},
  broccoli:{name:'บรอกโคลี',unit:'หัว',svg:`<path d="M-7,4L-5,27L5,27L7,4Z" fill="#aed581" stroke="#689f38"/>${[[-13,-4,10],[13,-4,10],[0,-13,11],[-6,4,9],[7,4,9]].map(([x,y,r])=>`<circle cx="${x}" cy="${y}" r="${r}" fill="#388e3c" stroke="#1b5e20"/>`).join('')}<g fill="#66bb6a">${[[-14,-7],[11,-8],[-2,-16],[4,-12],[-6,1],[8,1]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="2.2"/>`).join('')}</g>`},
  tomato:{name:'มะเขือเทศ',unit:'ลูก',clash:'red',svg:`<circle cy="4" r="21" fill="#e53935" stroke="#b71c1c" stroke-width="1.5"/><ellipse cx="-8" cy="-3" rx="4" ry="6" fill="#fff" opacity=".3"/><path d="M-12-14L-3-13L0-21L3-13L12-14L5-8L0-11L-5-8Z" fill="#43a047" stroke="#1b5e20"/>`},
  pumpkin:{name:'ฟักทอง',unit:'ลูก',svg:`<path d="M0-14C-4-20-2-24 2-26" stroke="#6d4c41" stroke-width="4" fill="none" stroke-linecap="round"/>${[[-12,11],[12,11],[0,13]].map(([x,rx])=>`<ellipse cx="${x}" cy="5" rx="${rx}" ry="19" fill="#ff9800" stroke="#e65100" stroke-width="1.5"/>`).join('')}`},
};
/* รถ (มุมด้านข้าง) */
const WHL=(x,y=12,r=7)=>`<circle cx="${x}" cy="${y}" r="${r}" fill="#37474f" stroke="#cfd8dc" stroke-width="1.5"/><circle cx="${x}" cy="${y}" r="${r*.42}" fill="#b0bec5"/>`;
const VEHS={
  car:{name:'รถเก๋ง',unit:'คัน',svg:`<path d="M-30,10L-30,0Q-28-4-20-5L-12-15Q-8-18 0-18L10-18Q16-18 20-12L24-5Q30-4 30,2L30,10Z" fill="#1e88e5" stroke="#0d47a1" stroke-width="1.5"/><path d="M-9-6L-4-14L3-14L3-6Z M7-6L7-14L12-14Q15-14 18-6Z" fill="#bbdefb"/>${WHL(-17)}${WHL(17)}<rect x="25" y="-2" width="4" height="3" rx="1" fill="#fff59d"/>`},
  bus:{name:'รถบัส',unit:'คัน',svg:`<rect x="-32" y="-20" width="64" height="31" rx="5" fill="#fdd835" stroke="#f9a825" stroke-width="1.5"/>${[-28,-17,-6,5].map(x=>`<rect x="${x}" y="-15" width="9" height="10" rx="1.5" fill="#bbdefb"/>`).join('')}<rect x="17" y="-15" width="11" height="22" rx="1.5" fill="#90caf9"/><rect x="-32" y="0" width="49" height="3" fill="#f57f17"/>${WHL(-19)}${WHL(19)}`},
  truck:{name:'รถบรรทุก',unit:'คัน',svg:`<rect x="-32" y="-20" width="40" height="27" rx="2" fill="#ef6c00" stroke="#bf360c" stroke-width="1.5"/><path d="M10,7L10-12L21-12L30-2L30,7Z" fill="#546e7a" stroke="#37474f" stroke-width="1.5"/><path d="M14-9L20-9L26-2L14-2Z" fill="#bbdefb"/><rect x="-32" y="7" width="62" height="4" fill="#37474f"/>${WHL(-21)}${WHL(-7)}${WHL(20)}`},
  moto:{name:'รถจักรยานยนต์',unit:'คัน',svg:`${WHL(-18,10,9)}${WHL(18,10,9)}<path d="M-14,4L-4-6L10-6L16,4Z" fill="#d32f2f" stroke="#8e0000" stroke-width="1.5"/><path d="M-12-9L2-9" stroke="#212121" stroke-width="4" stroke-linecap="round"/><path d="M12-4L16-16L22-16" stroke="#455a64" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M16,4L18,10" stroke="#455a64" stroke-width="3"/>`},
  bicycle:{name:'จักรยาน',unit:'คัน',svg:`<circle cx="-18" cy="10" r="10" fill="none" stroke="#78909c" stroke-width="3"/><circle cx="18" cy="10" r="10" fill="none" stroke="#78909c" stroke-width="3"/><path d="M-18,10L-4-6L12-6L18,10M-4-6L2,10L12-6M2,10L-18,10" stroke="#43a047" stroke-width="3" fill="none" stroke-linejoin="round"/><path d="M-9-11L1-11" stroke="#212121" stroke-width="3.5" stroke-linecap="round"/><path d="M12-6L10-14L17-15" stroke="#37474f" stroke-width="3" fill="none" stroke-linecap="round"/>`},
  van:{name:'รถตู้',unit:'คัน',svg:`<path d="M-30,10L-30-16Q-30-20-26-20L14-20Q20-20 24-10L30-4L30,10Z" fill="#eceff1" stroke="#78909c" stroke-width="1.5"/><path d="M-26-15L-14-15L-14-6L-26-6Z M-11-15L1-15L1-6L-11-6Z M4-15L14-15Q18-15 21-6L4-6Z" fill="#90caf9"/><rect x="-30" y="0" width="60" height="3" fill="#90a4ae"/>${WHL(-17)}${WHL(17)}`},
  tractor:{name:'รถไถ',unit:'คัน',svg:`<path d="M-4,6L-4-6L26-6L28,6Z" fill="#2e7d32" stroke="#1b5e20" stroke-width="1.5"/><rect x="-24" y="-26" width="18" height="22" rx="2" fill="none" stroke="#1b5e20" stroke-width="3"/><rect x="-26" y="-28" width="22" height="4" rx="1" fill="#2e7d32"/><rect x="-24" y="-6" width="22" height="8" fill="#2e7d32"/><path d="M14-6L14-18" stroke="#455a64" stroke-width="3"/>${WHL(-14,6,15)}${WHL(20,12,8)}`},
  pickup:{name:'รถกระบะ',unit:'คัน',svg:`<path d="M-30,10L-30-3L-2-3L2-16L17-16L25-4Q30-3 30,2L30,10Z" fill="#00897b" stroke="#004d40" stroke-width="1.5"/><path d="M5-13L15-13L21-4L5-4Z" fill="#b2dfdb"/><path d="M-30-3L-30-8" stroke="#004d40" stroke-width="2"/>${WHL(-17)}${WHL(17)}`},
};
/* หมวด: ทั้งรูปใช้ของหมวดเดียวกัน · noun ใช้ในโจทย์ box คือที่ใส่ add คือคำกริยาตอนเพิ่มของ rot คือมุมเอียงสูงสุดในรูป */
const CNT_CATS={
  fruit:{noun:'ผลไม้',box:'ตะกร้า',add:'ใส่',rot:22,items:FRUITS},
  veg:{noun:'ผัก',box:'ตะกร้า',add:'ใส่',rot:22,items:VEGS},
  vehicle:{noun:'รถ',box:'ลานจอดรถ',add:'นำ',rot:0,items:VEHS},
};
const ITEM={...FRUITS,...VEGS,...VEHS};
const fruitG=(k,x,y,s=1,rot=0)=>`<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})">${ITEM[k].svg}</g>`;

/* ระดับ → ช่วงจำนวนชนิดในรูป ช่วงค่า จำนวนชนิดในตะกร้า ช่วงจำนวนต่อชนิด ช่วงจำนวนที่ซื้อ */
const CNT_LV={1:{k:[3,3],v:[2,9],inBasket:2,cnt:[1,3],buy:[2,9]},2:{k:[3,4],v:[3,15],inBasket:3,cnt:[1,3],buy:[4,15]},
  3:{k:[4,5],v:[4,20],inBasket:4,cnt:[1,4],buy:[6,20]},4:{k:[4,6],v:[5,25],inBasket:4,cnt:[1,4],buy:[8,24]},5:{k:[5,6],v:[6,30],inBasket:5,cnt:[1,4],buy:[10,30]}};
const CNT_SEEN_KEY='exam-count-seen';
let CNT_SEEN=[];try{CNT_SEEN=JSON.parse(localStorage.getItem(CNT_SEEN_KEY)||'[]')}catch(e){}
const gcd=(a,b)=>b?gcd(b,a%b):Math.abs(a);

function makeScene(level){
  const L=CNT_LV[Math.min(5,Math.max(1,level))];
  for(let g=0;g<60;g++){
    const cat=rnd(Object.keys(CNT_CATS)),C=CNT_CATS[cat];
    const K=ri(L.k[0],L.k[1]),pool=Object.keys(C.items);let src=pool;
    /* หมวดที่มีแบบเดียวกันหลายสี: บางรอบเลือกแค่ 1–2 แบบแต่หลายสี ต้องแยกสีให้ดีจึงนับถูก */
    if(C.variant&&Math.random()<(level>=3?.5:.3)){const ts=shuffle([...new Set(pool.map(k=>C.items[k].type))]).slice(0,ri(1,2)),s2=pool.filter(k=>ts.includes(C.items[k].type));if(s2.length>=K)src=s2}
    /* ชนิดที่สีคล้ายกันไม่อยู่ในรูปเดียวกัน จะได้นับได้ไม่สับสน */
    const kinds=[],used=new Set();
    for(const k of shuffle(src.slice())){const c=C.items[k].clash;if(c&&used.has(c))continue;if(c)used.add(c);kinds.push(k);if(kinds.length===K)break}
    if(kinds.length<K)continue;
    const vals=shuffle([...Array(L.v[1]-L.v[0]+1)].map((_,i)=>L.v[0]+i)).slice(0,K);
    const val=Object.fromEntries(kinds.map((k,i)=>[k,vals[i]]));
    const bk=shuffle(kinds.slice()).slice(0,Math.min(L.inBasket,K)),basket=Object.fromEntries(bk.map(k=>[k,ri(L.cnt[0],L.cnt[1])]));
    const sig=cat+'/'+kinds.map(k=>k+val[k]+':'+(basket[k]||0)).sort().join('|');
    if(CNT_SEEN.includes(sig))continue;
    CNT_SEEN=[...CNT_SEEN.slice(-499),sig];try{localStorage.setItem(CNT_SEEN_KEY,JSON.stringify(CNT_SEEN))}catch(e){}
    const sc={level:Math.max(1,level),C,L,kinds,val,basket,g:vals.reduce(gcd,0)};
    sc.svg=sceneSVG(sc);sc.legSvg=sceneSVG(sc,false);return sc;
  }
  return null;
}
function sceneSVG(sc,box=true){
  const W=640,k=sc.kinds.length,cw=W/k;
  /* ชื่อแบบมีสี (เช่น เสื้อยืด / สีแดง) แสดง 2 บรรทัด */
  const two=sc.kinds.some(f=>ITEM[f].sub),dy=two?18:0,fs=k>=6?13.5:15;
  const leg=sc.kinds.map((f,i)=>{const x=cw*i+cw/2,F=ITEM[f];
    return `${fruitG(f,x,54,1.3)}<text x="${x}" y="116" text-anchor="middle" font-size="${fs}" font-weight="600" fill="var(--ink)">${F.base||F.name}</text>${two?`<text x="${x}" y="134" text-anchor="middle" font-size="${fs}" font-weight="600" fill="var(--ink)">${F.sub||''}</text>`:''}<text x="${x}" y="${137+dy}" text-anchor="middle" font-size="14" fill="var(--ink-2)">(${F.unit}ละ ${sc.val[f]})</text>`}).join('');
  if(!box)return `<svg viewBox="0 0 ${W} ${150+dy}" width="100%" style="max-width:${W}px" role="img" aria-label="ค่าของ${sc.C.noun}แต่ละชนิด" font-family="inherit">${leg}</svg>`;
  /* ของในตะกร้า: วางเป็นตารางแล้วเหลื่อมกับหมุนเล็กน้อย ไม่ซ้อนทับกัน */
  const items=shuffle(Object.entries(sc.basket).flatMap(([f,c])=>Array(c).fill(f)));
  const cols=Math.min(items.length,items.length>8?6:items.length>4?5:4),rows=Math.ceil(items.length/cols),cell=92;
  const bw=cols*cell+40,bx=(W-bw)/2,by=170+dy,bh=rows*cell+34;
  const fr=items.map((f,i)=>{const r=Math.floor(i/cols),c=i%cols,n=r===rows-1?items.length-r*cols:cols,off=(cols-n)*cell/2;
    return fruitG(f,bx+20+off+c*cell+cell/2+ri(-7,7),by+24+r*cell+cell/2+ri(-6,6),1.12,ri(-sc.C.rot,sc.C.rot))}).join('');
  const H=by+bh+12,bl=28+sc.C.box.length*11;
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" style="max-width:${W}px" role="img" aria-label="ค่าของ${sc.C.noun}แต่ละชนิด และ${sc.C.noun}ใน${sc.C.box}" font-family="inherit">${leg}
<rect x="${bx}" y="${by}" width="${bw}" height="${bh}" rx="14" fill="#a1887f" fill-opacity=".14" stroke="#8d6e63" stroke-width="2.5"/>
<rect x="${bx+14}" y="${by-13}" width="${bl}" height="26" rx="13" fill="#8d6e63"/><text x="${bx+14+bl/2}" y="${by+5}" text-anchor="middle" font-size="14" font-weight="600" fill="#fff">${sc.C.box}</text>${fr}</svg>`;
}

/* ---------- ตัวเลือก ---------- */
/* ตัวเลขเรียงจากน้อยไปมาก ห่างเท่ากัน คำตอบอยู่ตำแหน่งสุ่ม · ระยะห่างเป็นพหุคูณของ g (ห.ร.ม. ของค่า) เพื่อไม่ให้ตัดตัวเลือกด้วยเลขคู่/คี่หรือหลักหน่วยได้ */
function apChoices(ans,g){
  /* เลือกตำแหน่งคำตอบก่อน แล้วเลือกระยะห่างที่ไม่ทำให้ตัวเลือกต่ำกว่า 1 · คำตอบเลขน้อยจึงไม่ไปกองอยู่ตัวแรก */
  g=g||1;let r=ri(0,3),ds=[];
  for(;r>=0;r--){ds=[1,2,3,4,5,6,10].map(x=>x*g).filter(d=>d*2<=Math.max(ans,4*g)&&ans-r*d>=1);if(ds.length)break}
  if(r<0)r=0;const d=rnd(ds.length?ds:[g]);
  const c=[0,1,2,3].map(i=>ans+(i-r)*d);return{choices:c.map(String),answer:r,keepOrder:true};
}
/* คู่ตัวเลข "รวม A เหลือ B": ทุกค่าปรากฏ 2 ใน 4 ตัวเลือก */
function pairChoices(a,b,g,fmt){
  const alt=x=>{const s=rnd([1,2,3,4].map(k=>k*(g||1)));return x+(Math.random()<.5&&x-s>0?-1:1)*s},a2=alt(a),b2=alt(b);
  const all=[[a,b],[a2,b],[a,b2],[a2,b2]].map(([x,y])=>fmt(x,y)),ok=fmt(a,b);
  return{choices:all,answer:0,ok};
}
const fn_=(sc,f)=>ITEM[f].name,un_=f=>ITEM[f].unit;
const qty=(f,n)=>`${ITEM[f].name} ${n} ${ITEM[f].unit}`;
const bkList=sc=>Object.entries(sc.basket).map(([f,c])=>qty(f,c)).join(', ');
const bkTotal=sc=>Object.entries(sc.basket).reduce((a,[f,c])=>a+c*sc.val[f],0);
const bkSteps=sc=>[[`ใน${sc.C.box}มี ${bkList(sc)}`,'นับจากรูป'],[`${Object.entries(sc.basket).map(([f,c])=>`${c} × ${sc.val[f]}`).join(' + ')} = ${bkTotal(sc)}`,'จำนวน × ค่าต่อหน่วย แล้วรวม']];
const mulStep=(sc,f,n)=>[`${qty(f,n)} × ${sc.val[f]} = ${n*sc.val[f]}`,`${un_(f)}ละ ${sc.val[f]}`];

/* ---------- แบบคำถาม: แต่ละแบบคืน {stem, ans | choices, steps} หรือ null ถ้าสร้างไม่ได้กับสถานการณ์นี้ ---------- */
const CNT_Q={
  buy:sc=>{const n=sc.level>=4?3:2,fs=shuffle(sc.kinds.slice()).slice(0,n),q=fs.map(()=>ri(sc.L.buy[0],sc.L.buy[1])),ans=fs.reduce((a,f,i)=>a+q[i]*sc.val[f],0);
    const t=fs.map((f,i)=>qty(f,q[i]));
    return{stem:`ถ้า${sc.C.want||'ต้องการ'} ${t.slice(0,-1).join(', ')} และ${t[t.length-1]} รวมเป็นค่าเท่าใด`,ans,steps:[...fs.map((f,i)=>mulStep(sc,f,q[i])),[`รวม ${fs.map((f,i)=>q[i]*sc.val[f]).join(' + ')} = ${ans}`,'บวกกัน']]}},
  total:sc=>({stem:`${sc.C.noun}ทั้งหมดใน${sc.C.box}รวมกันมีค่าเท่าใด`,ans:bkTotal(sc),steps:bkSteps(sc)}),
  kindTotal:sc=>{const f=rnd(Object.keys(sc.basket).filter(f=>sc.basket[f]>1))||null;if(!f)return null;const c=sc.basket[f];
    return{stem:`${fn_(sc,f)}ที่อยู่ใน${sc.C.box}ทั้งหมดมีค่ารวมเท่าใด`,ans:c*sc.val[f],steps:[[`ใน${sc.C.box}มี${qty(f,c)}`,'นับจากรูป'],mulStep(sc,f,c)]}},
  diff:sc=>{const fs=Object.keys(sc.basket);if(fs.length<2)return null;const [a,b]=shuffle(fs.slice()),A=sc.basket[a]*sc.val[a],B=sc.basket[b]*sc.val[b];if(Math.abs(A-B)<4*sc.g)return null;
    const [hi,lo]=A>B?[a,b]:[b,a],H=Math.max(A,B),Lo=Math.min(A,B);
    return{stem:`ใน${sc.C.box} ${fn_(sc,hi)}ทั้งหมดมีค่ามากกว่า${fn_(sc,lo)}ทั้งหมดอยู่เท่าใด`,ans:H-Lo,steps:[mulStep(sc,hi,sc.basket[hi]),mulStep(sc,lo,sc.basket[lo]),[`${H} − ${Lo} = ${H-Lo}`,'ลบกัน']]}},
  addOne:sc=>{const f=rnd(sc.kinds),n=ri(2,sc.level>=3?9:5),t=bkTotal(sc),ans=t+n*sc.val[f];
    return{stem:`ถ้า${sc.C.add}${qty(f,n)}เพิ่มเข้าไปใน${sc.C.box} ${sc.C.noun}ใน${sc.C.box}จะมีค่ารวมเท่าใด`,ans,steps:[...bkSteps(sc),mulStep(sc,f,n),[`${t} + ${n*sc.val[f]} = ${ans}`,'ของเดิม + ของที่เพิ่ม']]}},
  addTwo:sc=>{const [a,b]=shuffle(sc.kinds.slice()),na=ri(2,9),nb=ri(2,9),t=bkTotal(sc),ans=t+na*sc.val[a]+nb*sc.val[b];
    return{stem:`ถ้า${sc.C.add}${qty(a,na)} และ${qty(b,nb)} เพิ่มเข้าไปใน${sc.C.box} ${sc.C.noun}ใน${sc.C.box}จะมีค่ารวมเท่าใด`,ans,steps:[...bkSteps(sc),mulStep(sc,a,na),mulStep(sc,b,nb),[`${t} + ${na*sc.val[a]} + ${nb*sc.val[b]} = ${ans}`,'ของเดิม + ของที่เพิ่ม']]}},
  remove:sc=>{const fs=Object.keys(sc.basket);if(fs.length<2)return null;const rm=shuffle(fs.slice()).slice(0,2),t=bkTotal(sc),out=rm.reduce((a,f)=>a+sc.val[f],0);
    const p=pairChoices(t,t-out,sc.g,(x,y)=>`รวม ${x} เหลือ ${y}`);
    return{stem:`${sc.C.noun}ใน${sc.C.box}รวมกันมีค่าเท่าใด และถ้า${sc.C.take||'นำ'}${fn_(sc,rm[0])}ออก 1 ${un_(rm[0])} กับ${fn_(sc,rm[1])}ออก 1 ${un_(rm[1])} จะเหลือค่าเท่าใด`,choices:p.choices,answer:p.answer,
      steps:[...bkSteps(sc),[`นำออก ${sc.val[rm[0]]} + ${sc.val[rm[1]]} = ${out}`,'ค่าของที่นำออก'],[`เหลือ ${t} − ${out} = ${t-out}`,'ลบกัน']]}},
  equiv:sc=>{for(let g=0;g<30;g++){const [a,b]=shuffle(sc.kinds.slice()),nb=ri(2,12),v=nb*sc.val[b];if(v%sc.val[a])continue;const na=v/sc.val[a];if(na<4)continue;
      return{stem:`ต้องใช้${fn_(sc,a)}กี่${un_(a)} จึงจะมีค่าเท่ากับ${qty(b,nb)}`,ans:na,g:1,steps:[mulStep(sc,b,nb),[`${v} ÷ ${sc.val[a]} = ${na} ${un_(a)}`,`${fn_(sc,a)} ${un_(a)}ละ ${sc.val[a]}`]]}}return null},
  budget:sc=>{const [a,b]=shuffle(sc.kinds.slice()),na=ri(2,8),rest=ri(4,12)*sc.val[b]+ri(0,sc.val[b]-1),M=na*sc.val[a]+rest,ans=Math.floor(rest/sc.val[b]);
    return{stem:`มีงบ ${M} ซื้อ${qty(a,na)}แล้ว งบที่เหลือซื้อ${fn_(sc,b)}ได้มากที่สุดกี่${un_(b)}`,ans,g:1,steps:[mulStep(sc,a,na),[`งบเหลือ ${M} − ${na*sc.val[a]} = ${rest}`,'ลบกัน'],[`${rest} ÷ ${sc.val[b]} = ${ans} เศษ ${rest%sc.val[b]} จึงได้ ${ans} ${un_(b)}`,'ซื้อได้เต็มหน่วยเท่านั้น']]}},
  maxKind:sc=>{const fs=Object.keys(sc.basket);if(fs.length<4)return null;const tot=fs.map(f=>sc.basket[f]*sc.val[f]),m=Math.max(...tot);if(tot.filter(x=>x===m).length>1)return null;
    const ans=fs[tot.indexOf(m)],ch=shuffle(fs.slice()).slice(0,4);if(!ch.includes(ans))return null;
    return{stem:`${sc.C.noun}${sc.C.kindW||'ชนิด'}ใดใน${sc.C.box}มีค่ารวมมากที่สุด`,choices:ch.map(f=>ITEM[f].name),answer:ch.indexOf(ans),steps:[[fs.map((f,i)=>`${fn_(sc,f)} ${sc.basket[f]} × ${sc.val[f]} = ${tot[i]}`).join(' · '),'นับจากรูป × ค่าต่อหน่วย'],[`มากที่สุดคือ${fn_(sc,ans)} (${m})`,'เทียบค่ารวม']]}},
  share:sc=>{const t=bkTotal(sc),ds=[2,3,4,5,6].filter(d=>t%d===0&&t/d>=4);if(!ds.length)return null;const d=rnd(ds);
    return{stem:`ถ้าแบ่งค่าของ${sc.C.noun}ทั้งหมดใน${sc.C.box}ให้ ${d} คนเท่าๆ กัน จะได้คนละเท่าใด`,ans:t/d,g:1,steps:[...bkSteps(sc),[`${t} ÷ ${d} = ${t/d}`,'หารเท่าๆ กัน']]}},
  replace:sc=>{const fs=Object.keys(sc.basket),a=rnd(fs),others=sc.kinds.filter(f=>f!==a),b=rnd(others),c=sc.basket[a],t=bkTotal(sc),ans=t-c*sc.val[a]+c*sc.val[b];if(ans===t)return null;
    return{stem:`ถ้า${sc.C.take||'นำ'}${fn_(sc,a)}ใน${sc.C.box}ออกทั้งหมด แล้ว${sc.C.add}${fn_(sc,b)}แทนในจำนวนเท่ากัน ${sc.C.noun}ใน${sc.C.box}จะมีค่ารวมเท่าใด`,ans,steps:[...bkSteps(sc),[`นำ${qty(a,c)}ออก ค่า ${c} × ${sc.val[a]} = ${c*sc.val[a]}`,'นับจากรูป'],[`${sc.C.add}${qty(b,c)} ค่า ${c} × ${sc.val[b]} = ${c*sc.val[b]}`,`${un_(b)}ละ ${sc.val[b]}`],[`${t} − ${c*sc.val[a]} + ${c*sc.val[b]} = ${ans}`,'ของเดิม − ออก + เข้า']]}},
  addRemove:sc=>{const fs=Object.keys(sc.basket),a=rnd(fs),ra=ri(1,sc.basket[a]),b=rnd(sc.kinds),nb=ri(2,6),t=bkTotal(sc),ans=t-ra*sc.val[a]+nb*sc.val[b];
    return{stem:`ถ้า${sc.C.take||'นำ'}${qty(a,ra)}ออกจาก${sc.C.box} แล้ว${sc.C.add}${qty(b,nb)}เพิ่ม ${sc.C.noun}ใน${sc.C.box}จะมีค่ารวมเท่าใด`,ans,steps:[...bkSteps(sc),[`ออก ${ra} × ${sc.val[a]} = ${ra*sc.val[a]} · เข้า ${nb} × ${sc.val[b]} = ${nb*sc.val[b]}`,'ค่าต่อหน่วย'],[`${t} − ${ra*sc.val[a]} + ${nb*sc.val[b]} = ${ans}`,'ของเดิม − ออก + เข้า']]}},
};
const CNT_TYPES={1:['total','buy','kindTotal','addOne','diff'],2:['total','remove','buy','addTwo','equiv','diff','kindTotal'],
  3:['remove','buy','addTwo','equiv','budget','maxKind','share','diff'],4:['remove','buy','addTwo','equiv','budget','maxKind','replace','addRemove','share'],5:['remove','buy','equiv','budget','maxKind','replace','addRemove','share']};

/* แบบที่ไม่ใช้ของในตะกร้า แสดงแค่ค่าของแต่ละชนิด ไม่มีตะกร้าให้ดูเกิน */
const CNT_NOBOX=new Set(['buy','equiv','budget']);
function sceneQ(sc,type){
  const r=CNT_Q[type](sc);if(!r)return null;
  const c=r.choices?{choices:r.choices,answer:r.answer}:apChoices(r.ans,r.g||sc.g);
  return{kind:'mc',stem:'จากรูป '+r.stem,svg:CNT_NOBOX.has(type)?sc.legSvg:sc.svg,...c,steps:r.steps,topic:'นับของ'};
}
/* 1 สถานการณ์ → n ข้อ (ข้อแรกๆ ใช้แบบคำถามไม่ซ้ำกันก่อน ถ้า n มากกว่าจำนวนแบบ ใช้แบบเดิมด้วยตัวเลขใหม่) */
function genCountSet(level,n){
  const lv=Math.min(5,Math.max(1,Math.round(+level||1)));
  for(let g=0;g<10;g++){
    const sc=makeScene(lv);if(!sc)continue;
    const out=[],seen=new Set(),types=CNT_TYPES[lv].filter(t=>!(sc.C.skip||[]).includes(t));let order=shuffle(types.slice()),i=0,guard=0;
    /* ข้อที่ถามยอดรวมในตะกร้าอยู่ก่อน เพื่อให้คนทำนับของในรูปครั้งเดียวแล้วใช้ต่อ */
    order.sort((a,b)=>(b==='total'||b==='remove')-(a==='total'||a==='remove'));
    while(out.length<n&&guard++<n*30){
      if(i>=order.length){order=shuffle(types.slice());i=0}
      const q=sceneQ(sc,order[i++]);if(q&&!seen.has(q.stem)){seen.add(q.stem);out.push(q)}
    }
    if(out.length)return out;
  }
  return [];
}
/* ข้อเดี่ยวสำหรับผสมในวิชาคณิตศาสตร์ทั่วไป: สถานการณ์ใหม่ทุกข้อ */
function genCount1(level){const lv=Math.min(5,Math.max(1,Math.round(+level||1))),sc=makeScene(lv);return sc?sceneQ(sc,rnd(CNT_TYPES[lv].filter(t=>!(sc.C.skip||[]).includes(t)))):null}
