/* spatial2.js — มิติสัมพันธ์เพิ่มเติม (ต่อจาก generators.js): มองภาพจากด้านข้าง ลูกบาศก์ทาสี นับรูป และรูปที่แตกต่าง
   ทุกแบบคำนวณคำตอบจากข้อมูลที่ใช้วาดรูป จึงเฉลยถูกแน่นอน */

/* กองลูกบาศก์แบบเดียวกับ genCubes (ความสูงลดลงเมื่อเข้าหาผู้มอง) */
function stackH(level){
  let [gy,gx,mh]=CUBE_LV[level];if(Math.random()<.5)[gy,gx]=[gx,gy];
  const H=[];
  for(let y=0;y<gy;y++){H.push([]);for(let x=0;x<gx;x++){const cap=Math.min(y?H[y-1][x]:mh,x?H[y][x-1]:mh);H[y].push(x+y===0?mh:!cap||(level>=3&&Math.random()<.15)?0:ri(1,cap))}}
  return H[gy-1].every(v=>!v)||H.every(r=>!r[gx-1])?null:H;
}
const arrowP=(s,e)=>{const dx=e[0]-s[0],dy=e[1]-s[1],L=Math.hypot(dx,dy)||1,ux=dx/L,uy=dy/L;
  return `<path class="s ln acc" d="M${f1(s[0])} ${f1(s[1])}L${f1(e[0])} ${f1(e[1])}"/>`+poly([e,[e[0]-ux*9-uy*5,e[1]-uy*9+ux*5],[e[0]-ux*9+uy*5,e[1]-uy*9-ux*5]],'accf')};

/* 6) มองจากด้านข้าง: ลูกศร ก ชี้เข้าด้าน +x (ซ้ายหน้าของรูป) ลูกศร ข ชี้เข้าด้าน +y (ขวาหน้า) */
function stackArrowSVG(H){
  const gy=H.length,gx=H[0].length,mh=Math.max(...H.flat()),pad=46,P=isoMap(gx,mh,1,pad),cs=[];
  for(let y=0;y<gy;y++)for(let x=0;x<gx;x++)for(let z=0;z<H[y][x];z++)cs.push([x,y,z]);
  cs.sort((p,q)=>p[0]+p[1]+p[2]-q[0]-q[1]-q[2]);
  let b='';for(const [x,y,z] of cs)b+=poly([P(x,y,z+1),P(x+1,y,z+1),P(x+1,y+1,z+1),P(x,y+1,z+1)],'s ft')+poly([P(x+1,y,z),P(x+1,y+1,z),P(x+1,y+1,z+1),P(x+1,y,z+1)],'s fl')+poly([P(x,y+1,z),P(x+1,y+1,z),P(x+1,y+1,z+1),P(x,y+1,z+1)],'s fr');
  const z=Math.min(1,mh/2),a0=P(gx+2.4,gy/2,z),a1=P(gx+.5,gy/2,z),b0=P(gx/2,gy+2.4,z),b1=P(gx/2,gy+.5,z);
  b+=arrowP(a0,a1)+arrowP(b0,b1)+`<text class="tx" x="${f1(a0[0]-8)}" y="${f1(a0[1]+6)}">ก</text><text class="tx" x="${f1(b0[0]+8)}" y="${f1(b0[1]+6)}">ข</text>`;
  return svgBox((gx+gy)*ISO_A+8+2*pad,(gx+gy)*ISO_B+mh*ISO_C+8+2*pad,b,'กองลูกบาศก์ และลูกศรบอกทิศที่มอง');
}
/* ภาพด้านข้าง: คอลัมน์จากซ้ายไปขวา แต่ละคอลัมน์สูงเท่ากองที่สูงที่สุดในแนวนั้น */
function sideSVG(cols){
  const C=18,mh=Math.max(...cols,1),W=cols.length*C+8,H=mh*C+10;let b='';
  cols.forEach((h,i)=>{for(let z=0;z<h;z++)b+=`<rect class="s ft" x="${4+i*C}" y="${4+(mh-1-z)*C}" width="${C}" height="${C}"/>`});
  b+=`<path class="s ln" d="M2 ${4+mh*C+1}H${W-2}"/>`;
  return svgBox(W,H,b,'ภาพที่มองเห็น');
}
function genView(level){
  const H=stackH(level);if(!H)return null;
  const gy=H.length,gx=H[0].length;
  /* มองจาก +x: ขวามือของผู้มองคือ +y · มองจาก +y: ขวามือคือ −x */
  const vA=[...Array(gy)].map((_,y)=>Math.max(...H[y])),vB=[...Array(gx)].map((_,i)=>Math.max(...H.map(r=>r[gx-1-i])));
  const useA=Math.random()<.5,ans=useA?vA:vB,oth=useA?vB:vA,lab=useA?'ก':'ข';
  const key=c=>c.join(','),seen=new Set([key(ans)]),dist=[];
  const cands=[oth,ans.slice().reverse(),oth.slice().reverse()];
  for(let g=0;g<12;g++){const c=ans.slice(),i=ri(0,c.length-1);c[i]=Math.max(1,c[i]+rnd([1,-1]));cands.push(c)}
  for(const c of cands){const k=key(c);if(!seen.has(k)&&dist.length<3){seen.add(k);dist.push(c)}}
  if(dist.length<3)return null;
  const why=c=>key(c)===key(oth)?`เป็นภาพที่มองจากลูกศร ${useA?'ข':'ก'}`:key(c)===key(ans.slice().reverse())?'กลับซ้าย–ขวา (มองจากด้านตรงข้าม)':'ความสูงบางคอลัมน์ไม่ตรงกับกองที่สูงที่สุดในแนวนั้น';
  const opt=c=>({svg:sideSVG(c),txt:`ความสูงจากซ้ายไปขวา ${c.join(', ')}`,why:why(c)});
  return mkPicMC(`จากรูป ถ้ามองกองลูกบาศก์ในทิศทางของลูกศร ${lab} (มองตรงระดับพื้น) จะเห็นภาพใด`,stackArrowSVG(H),[{...opt(ans),why:'ตรงกับความสูงที่มองเห็นทุกคอลัมน์'},...dist.map(opt)],
    o=>[[`ยืนที่ลูกศร ${lab} แล้วมองตรงเข้าไป แต่ละคอลัมน์ที่เห็นคือกองที่สูงที่สุดในแนวนั้น กองที่เตี้ยกว่าถูกบัง`,'หลักการมองภาพด้านข้าง'],
      [`จากซ้ายไปขวาจะเห็นสูง ${ans.join(', ')} ก้อน`,'อ่านจากรูป'],...o.map((x,j)=>[`${TH[j]}. ${x.why}`,'ตรวจทีละตัวเลือก'])],
    `กองลูกบาศก์ความสูง (แถวคั่นด้วย /): ${H.map(r=>r.join(' ')).join(' / ')} มองจาก ${lab} เห็น ${ans.join(',')}`);
}

/* 7) ลูกบาศก์ทาสีแล้วตัด: นับทุกก้อนจริงว่ามีด้านติดสีกี่ด้าน */
const PAINT_SETS=[{f:['x0','x1','y0','y1','z0','z1'],t:'ทาสีทุกด้าน'},{f:['x0','x1','y0','y1','z1'],t:'ทาสีทุกด้านยกเว้นด้านล่าง'},
  {f:['z0','z1'],t:'ทาสีเฉพาะด้านบนและด้านล่าง'},{f:['x0','x1','y0','y1'],t:'ทาสีเฉพาะด้านข้างทั้งสี่ด้าน (ไม่ทาด้านบนและด้านล่าง)'},{f:['x1','y1','z1'],t:'ทาสีเฉพาะ 3 ด้านที่มองเห็นในรูป (บน ซ้าย และขวา)'}];
function genPaint(level){
  const n=[3,3,3,4,4,5][Math.min(5,level)],ps=level<=2?PAINT_SETS[0]:rnd(level===3?PAINT_SETS.slice(0,2):PAINT_SETS),cnt={};
  for(let x=0;x<n;x++)for(let y=0;y<n;y++)for(let z=0;z<n;z++){const on={x0:x===0,x1:x===n-1,y0:y===0,y1:y===n-1,z0:z===0,z1:z===n-1},k=ps.f.filter(f=>on[f]).length;cnt[k]=(cnt[k]||0)+1}
  const ks=Object.keys(cnt).map(Number).filter(k=>cnt[k]>0&&(level>=2||k>0)),k=rnd(ks),ans=cnt[k];
  const H=[...Array(n)].map(()=>Array(n).fill(n)),all=ps.f.length===6,m=n-2;
  const formula=all?[[`ก้อนมุม (3 ด้าน) 8 ก้อน · ก้อนขอบ (2 ด้าน) 12 × (${n}−2) = ${12*m} · ก้อนหน้า (1 ด้าน) 6 × (${n}−2)² = ${6*m*m} · ก้อนใน (ไม่มีสี) (${n}−2)³ = ${m**3}`,'สูตรลูกบาศก์ทาสีทุกด้าน']]:[];
  const kn=k=>k?`มีสี ${k} ด้าน`:'ไม่มีสีเลย';
  return{...mkMC(`ลูกบาศก์ไม้ขนาด ${n} × ${n} × ${n} ตามรูป ${ps.t} แล้วตัดออกเป็นลูกบาศก์เล็ก ${n**3} ก้อนเท่าๆ กัน จะมีลูกบาศก์เล็กที่${kn(k)}กี่ก้อน`,ans,
    shuffle(ks.filter(x=>x!==k).map(x=>cnt[x])).concat([ans+n,ans+4,Math.abs(ans-4)||ans+8]),
    [[`ตัดได้ ${n} × ${n} × ${n} = ${n**3} ก้อน`,'กว้าง × ยาว × สูง'],...formula,
     [`นับแยกตามจำนวนด้านที่มีสี: ${Object.keys(cnt).sort().map(x=>`${kn(+x)} ${cnt[x]} ก้อน`).join(' · ')} (รวม ${n**3})`,'ดูตำแหน่ง มุม ขอบ หน้า และด้านใน เทียบกับด้านที่ทาสี'],
     [`ก้อนที่${kn(k)}จึงมี ${ans} ก้อน`,'ข้อก่อนหน้า']]),svg:stackSVG(H),desc:`ลูกบาศก์ ${n}×${n}×${n} ${ps.t} นับได้ ${JSON.stringify(cnt)}`};
}

/* 8) นับรูปในภาพ: ตาราง (สี่เหลี่ยมจัตุรัส/สี่เหลี่ยมมุมฉาก) และสามเหลี่ยมที่มีเส้นจากยอด */
const C2=n=>n*(n-1)/2;
function gridSVG(m,n){const C=26,W=n*C+8,H=m*C+8;let b='';
  for(let i=0;i<=n;i++)b+=`<path class="s ln" d="M${4+i*C} 4V${4+m*C}"/>`;for(let j=0;j<=m;j++)b+=`<path class="s ln" d="M4 ${4+j*C}H${4+n*C}"/>`;
  return svgBox(W,H,b,`ตาราง ${m} × ${n} ช่อง`)}
function fanSVG(p,q){const W=170,H=130,A=[W/2,6],L=[6,H-6],R=[W-6,H-6];let b='';
  const lerp=(a,c,t)=>[a[0]+(c[0]-a[0])*t,a[1]+(c[1]-a[1])*t];
  for(let i=0;i<=p;i++){const e=lerp(L,R,i/p);b+=`<path class="s ln" d="M${f1(A[0])} ${f1(A[1])}L${f1(e[0])} ${f1(e[1])}"/>`}
  for(let j=1;j<=q;j++){const a=lerp(A,L,j/q),c=lerp(A,R,j/q);b+=`<path class="s ln" d="M${f1(a[0])} ${f1(a[1])}L${f1(c[0])} ${f1(c[1])}"/>`}
  return svgBox(W,H,b,'สามเหลี่ยมที่มีเส้นแบ่ง')}
function genShapeCount(level){
  const lv=Math.min(5,level),kind=rnd(lv<=1?['sq','tri']:lv===2?['sq','tri','tri']:['sq','rect','tri','rect']);
  if(kind==='tri'){const p=ri(lv<=2?2:3,lv<=2?3:lv+1),q=ri(lv<=1?1:2,lv<=2?2:lv<=3?3:4),ans=C2(p+1)*q;
    return{...mkMC('จากรูป มีรูปสามเหลี่ยมทั้งหมดกี่รูป (นับทุกขนาด)',ans,[p*q,C2(p+1),ans-q,ans+p,(p+1)*q],
      [[`เส้นที่ลากจากยอดมี ${p+1} เส้น เลือก 2 เส้นได้ ${p+1} × ${p} ÷ 2 = ${C2(p+1)} แบบ`,'สามเหลี่ยมทุกรูปใช้ยอดเดียวกัน'],
       [`เส้นขวางมี ${q} เส้น (นับฐานด้วย) แต่ละเส้นปิดเป็นสามเหลี่ยมได้ ${C2(p+1)} รูป`,'ขอบล่างของสามเหลี่ยม'],[`รวม ${C2(p+1)} × ${q} = ${ans} รูป`,'คูณกัน']]),svg:fanSVG(p,q),desc:`สามเหลี่ยม เส้นจากยอด ${p+1} เส้น เส้นขวาง ${q} เส้น`}}
  const sz={1:[[2,2],[2,3]],2:[[3,3],[2,3],[2,4]],3:[[3,3],[3,4],[2,4]],4:[[4,4],[3,4],[3,5]],5:[[4,4],[4,5],[5,5]]}[lv];
  let [m,n]=rnd(sz);if(Math.random()<.5)[m,n]=[n,m];
  let sq=0;for(let k=1;k<=Math.min(m,n);k++)sq+=(m-k+1)*(n-k+1);const rc=C2(m+1)*C2(n+1);
  if(kind==='sq'){const parts=[];for(let k=1;k<=Math.min(m,n);k++)parts.push(`ขนาด ${k}×${k} มี ${(m-k+1)*(n-k+1)} รูป`);
    return{...mkMC('จากรูป มีรูปสี่เหลี่ยมจัตุรัสทั้งหมดกี่รูป (นับทุกขนาด)',sq,[m*n,sq-1,rc,sq+Math.min(m,n)],
      [['นับแยกตามขนาด เริ่มจากช่องเล็กสุด แล้วขยายทีละขนาด','นับอย่างเป็นระบบ'],[parts.join(' · '),`ขนาด k×k มี (${m}−k+1) × (${n}−k+1) รูป`],[`รวม ${sq} รูป`,'บวกทุกขนาด']]),svg:gridSVG(m,n),desc:`ตาราง ${m}×${n} ช่อง`}}
  return{...mkMC('จากรูป มีรูปสี่เหลี่ยมมุมฉากทั้งหมดกี่รูป (นับทุกขนาด รวมสี่เหลี่ยมจัตุรัสด้วย)',rc,[sq,m*n,rc-m*n,rc+m+n],
    [[`เส้นแนวตั้งมี ${n+1} เส้น เลือก 2 เส้นได้ ${C2(n+1)} แบบ`,'ด้านซ้ายและขวาของสี่เหลี่ยม'],[`เส้นแนวนอนมี ${m+1} เส้น เลือก 2 เส้นได้ ${C2(m+1)} แบบ`,'ด้านบนและล่างของสี่เหลี่ยม'],
     [`รวม ${C2(n+1)} × ${C2(m+1)} = ${rc} รูป`,'คูณกัน']]),svg:gridSVG(m,n),desc:`ตาราง ${m}×${n} ช่อง`};
}

/* 9) รูปที่แตกต่าง: 3 ตัวเลือกเป็นรูปเดียวกันที่ถูกหมุน อีก 1 ตัวเป็นภาพพลิก (หมุนอย่างไรก็ทับไม่สนิท) */
function genOdd(level){
  const k=[0,4,5,5,6,7][Math.min(5,level)],mark=level>=4;
  const s=new Set(['0,0']);while(s.size<k){const [x,y]=rnd([...s]).split(',').map(Number),[dx,dy]=rnd([[1,0],[-1,0],[0,1],[0,-1]]);s.add((x+dx)+','+(y+dy))}
  let c=[...s].map(t=>[...t.split(',').map(Number),0]);if(mark)c[ri(0,c.length-1)][2]=1;c=shpN(c);
  if(Math.max(...c.map(p=>p[0]))>3||Math.max(...c.map(p=>p[1]))>3)return null;
  const R=[0,1,2,3].map(n=>shpRotN(c,n)),M=[0,1,2,3].map(n=>shpRotN(shpFlip(c),n));
  if(new Set([...R,...M].map(shpK)).size!==8)return null;
  const rs=shuffle([0,1,2,3]).slice(0,3),mi=ri(0,3);
  return mkPicMC('รูปใดแตกต่างจากรูปอื่น',null,[{svg:shapeSVG(M[mi]),txt:'ภาพพลิก',why:'เป็นภาพพลิก (ภาพในกระจก) หมุนอย่างไรก็ทับรูปอื่นไม่สนิท'},...rs.map(n=>({svg:shapeSVG(R[n]),txt:'รูปที่ถูกหมุน',why:'เป็นรูปเดียวกับรูปอื่นที่ถูกหมุน'}))],
    o=>[['หมุนรูปในใจให้ส่วนที่เด่นที่สุด'+(mark?' หรือช่องที่มีจุด':'')+'อยู่ทิศเดียวกัน แล้วเทียบทีละรูป','หลักการหมุนรูป'],...o.map((x,j)=>[`${TH[j]}. ${x.why}`,'ตรวจทีละตัวเลือก'])],
    `รูปจากช่องสี่เหลี่ยม ${c.length} ช่อง 3 รูปหมุน 1 รูปพลิก`);
}
Object.assign(SPA_GEN,{view:genView,paint:genPaint,count:genShapeCount,odd:genOdd});
