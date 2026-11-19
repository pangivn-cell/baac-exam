/* animal-gen.js — ตัวสร้างโจทย์นับขาสัตว์หลายรูปแบบ (คิดเฉลยด้วยโค้ดทุกข้อ ไม่ใช้ AI)
   คลังเดิม (animal-bank.js) มีแบบเดียวต่อระดับ ผู้ใช้เห็นแพทเทิร์นซ้ำ → ตัวสร้างนี้สลับโจทย์ได้หลายแบบในแต่ละระดับ
   ต้องโหลดหลัง generators.js (ใช้ mkMC ri rnd shuffle LOCAL) */
const AN_LEGS={0:['งู','ไส้เดือน','ปลา'],2:['ไก่','เป็ด','นก','ห่าน','หงส์'],4:['วัว','ควาย','หมู','หมา','แมว','แพะ','ม้า','กระต่าย'],6:['มด','ผึ้ง','ตั๊กแตน','แมลงสาบ'],8:['แมงมุม','แมงป่อง']};
/* สุ่มชื่อสัตว์ตามจำนวนขา ไม่ซ้ำกับที่ใช้ไปแล้วในข้อเดียวกัน */
/* ตัวเลือกหลอกต้องเป็นจำนวนเต็มไม่ติดลบ ไม่งั้นเดาคำตอบได้จากรูปตัวเลข */
const anMC=(stem,ans,dist,steps)=>mkMC(stem,ans,dist.filter(d=>Number.isInteger(d)&&d>=0),steps);
function anPick(legs,used){const a=AN_LEGS[legs].filter(x=>!used.includes(x));const n=rnd(a);used.push(n);return n}
const anLegNote=(n,l)=>l?`${n}มี ${l} ขา`:`${n}ไม่มีขา`;
const AN_POOL={
  1:['single','reverse','twoKinds'],
  2:['threeKinds','legDiff','sameLegs','twoKinds','reverse','lessThan'],
  3:['headsLegs','moreThan','swapSell','legGap','lessThan'],
  4:['ratio','equalLegs','zeroLeg','swapKinds','moreThan','lessThan'],
  5:['miscount','legsMinusHeads','bugsSpiders','ratio3','swapKinds','ratio','equalLegs','zeroLeg','lessThan']};
function genAnimal1(level,kind){
  const u=[];kind=kind||rnd(AN_POOL[level]||AN_POOL[3]);
  switch(kind){
    case 'single':{const l=rnd([2,4,6,8]),a=anPick(l,u),n=ri(5,25),ans=n*l;
      return anMC(`ในสวนสัตว์มี${a} ${n} ตัว นับขาได้ทั้งหมดกี่ขา`,ans,[ans-l,ans+l,n*(l+2),n+l],[[`${anLegNote(a,l)} → ${n} × ${l} = ${ans} ขา`,'']])}
    case 'reverse':{const l=rnd([2,4,6,8]),a=anPick(l,u),n=ri(4,20),L=n*l;
      return anMC(`นับขา${a}ทั้งหมดได้ ${L} ขา มี${a}กี่ตัว`,n,[n+1,n-1,L/2,n*2],[[`${anLegNote(a,l)} → ${L} ÷ ${l} = ${n} ตัว`,'']])}
    case 'twoKinds':{const a=anPick(2,u),b=anPick(rnd([4,6,8]),u),lb=AN_LEGS[4].includes(b)?4:AN_LEGS[6].includes(b)?6:8,x=ri(3,15),y=ri(3,15),ans=2*x+lb*y;
      return anMC(`มี${a} ${x} ตัว และ${b} ${y} ตัว มีขารวมกันกี่ขา`,ans,[ans-2,ans+lb,4*(x+y),2*(x+y)+lb],[[`${a} ${x} × 2 = ${2*x} ขา, ${b} ${y} × ${lb} = ${lb*y} ขา`,''],[`รวม ${2*x} + ${lb*y} = ${ans} ขา`,'']])}
    case 'threeKinds':{const ls=shuffle([2,4,6,8]).slice(0,3),ns=ls.map(()=>ri(2,12)),as=ls.map(l=>anPick(l,u)),ans=ls.reduce((s,l,i)=>s+l*ns[i],0);
      return anMC(`มี${as[0]} ${ns[0]} ตัว ${as[1]} ${ns[1]} ตัว และ${as[2]} ${ns[2]} ตัว มีขารวมกันกี่ขา`,ans,[ans-2,ans+4,ans-ls[2],ans+ls[0]],
        [[as.map((a,i)=>`${a} ${ns[i]} × ${ls[i]} = ${ns[i]*ls[i]}`).join(', '),''],[`รวม ${ans} ขา`,'']])}
    case 'legDiff':{const [la,lb]=shuffle([2,4,6,8]).slice(0,2),a=anPick(la,u),b=anPick(lb,u);let x,y;do{x=ri(3,15);y=ri(3,15)}while(la*x===lb*y);
      const big=la*x>lb*y,ans=Math.abs(la*x-lb*y);
      return anMC(`มี${a} ${x} ตัว และ${b} ${y} ตัว ขาของ${big?a:b}มากกว่าขาของ${big?b:a}กี่ขา`,ans,[Math.abs(x-y),ans+2,ans-2,la*x+lb*y],
        [[`${a} ${x} × ${la} = ${la*x} ขา, ${b} ${y} × ${lb} = ${lb*y} ขา`,''],[`ต่างกัน ${ans} ขา`,'']])}
    case 'sameLegs':{const [la,lb]=rnd([[2,4],[2,6],[2,8],[4,8],[6,8],[4,6]]),a=anPick(la,u),b=anPick(lb,u),g=la*lb/gcd(la,lb),k=ri(1,4),L=g*k*ri(1,3),x=L/la,ans=L/lb;
      return anMC(`มี${a} ${x} ตัว ต้องมี${b}กี่ตัว จึงจะมีขาเท่ากับ${a}`,ans,[x,ans+1,ans*2,ans-1],[[`ขา${a} = ${x} × ${la} = ${L} ขา`,''],[`${b}: ${L} ÷ ${lb} = ${ans} ตัว`,'']])}
    case 'headsLegs':{const a=anPick(2,u),b=anPick(4,u),x=ri(3,20),y=ri(3,20),H=x+y,L=2*x+4*y,askA=Math.random()<.5,ans=askA?x:y;
      return anMC(`ในเล้ามี${a}และ${b} นับหัวได้ ${H} หัว นับขาได้ ${L} ขา มี${askA?a:b}กี่ตัว`,ans,[askA?y:x,ans+1,ans-2,L/4],
        [[`ถ้าทั้ง ${H} ตัวเป็น${a} จะมีขา ${2*H} ขา ขาดไป ${L-2*H} ขา`,''],[`${b}มีขามากกว่า${a}ตัวละ 2 → ${b} = ${(L-2*H)}/2 = ${y} ตัว, ${a} = ${x} ตัว`,'']])}
    case 'moreThan':{const la=2,lb=rnd([4,6]),a=anPick(la,u),b=anPick(lb,u),x=ri(3,15),d=ri(2,8),y=x+d,L=la*x+lb*y,askA=Math.random()<.5,ans=askA?x:y;
      return anMC(`มี${b}มากกว่า${a} ${d} ตัว นับขารวมกันได้ ${L} ขา มี${askA?a:b}กี่ตัว`,ans,[askA?y:x,ans+d,ans+1,ans-1],
        [[`ให้${a} = x ตัว, ${b} = x + ${d} ตัว`,''],[`${la}x + ${lb}(x + ${d}) = ${L} → ${la+lb}x = ${L-lb*d} → x = ${x}`,''],[`${a} ${x} ตัว, ${b} ${y} ตัว`,'']])}
    /* แบบข้อสอบจริง: สัตว์ขามากมีน้อยกว่าสัตว์ 2 ขาอยู่ d ตัว ตัวเลขใหญ่ (หลักร้อย) ตัวเลือกห่างกันทีละ 5 */
    case 'lessThan':{const place=rnd(['ฟาร์มแห่งหนึ่ง','เกษตรกรคนหนึ่ง','ฟาร์มแห่งหนึ่ง','สวนสัตว์แห่งหนึ่ง']),farm=place!=='สวนสัตว์แห่งหนึ่ง',
        lb=farm?4:rnd([4,6,8]),a=farm?rnd(['ไก่','เป็ด','ห่าน']):anPick(2,u),b=farm?rnd(['หมู','วัว','ควาย','แพะ']):anPick(lb,u),
        d=level>=3?ri(4,18)*5:ri(10,40),y=level>=3?ri(20,90):ri(5,30),x=y+d,L=2*x+lb*y,askA=Math.random()<.6,ans=askA?x:y,
        trap=(L-lb*d)/(2+lb),sp=level>=3?5:1;
      const verb=place==='สวนสัตว์แห่งหนึ่ง'?'มี':'เลี้ยง';
      return anMC(`${place}${verb}${b}น้อยกว่า${verb}${a}อยู่ ${d} ตัว เมื่อนับขา${b}และขา${a}รวมกันได้ ${L} ขา ${place.replace(/แห่งหนึ่ง|คนหนึ่ง/,'แห่งนี้').replace('เกษตรกรแห่งนี้','เกษตรกรคนนี้')}${verb}${askA?a:b}กี่ตัว`,ans,
        [askA?y:x,trap,ans-sp,ans+sp,ans+2*sp,ans-2*sp],[
        [`ให้${b} = y ตัว → ${a} = y + ${d} ตัว (${a}มากกว่า)`,'อ่านให้ดีว่าตัวไหนมากกว่า ตัวลวงที่พบบ่อยคือกลับข้าง'],
        [`${lb}y + 2(y + ${d}) = ${L} → ${lb+2}y + ${2*d} = ${L} → ${lb+2}y = ${L-2*d} → y = ${y}`,''],
        [`${b} ${y} ตัว · ${a} = ${y} + ${d} = ${x} ตัว`,''],
        [`วิธีลัด: แยก${a}ส่วนเกิน ${d} ตัวออกก่อน (${2*d} ขา) เหลือ ${L-2*d} ขา จับคู่${b}กับ${a} คู่ละ ${lb+2} ขา → ${(L-2*d)/(lb+2)} คู่`,`ตรวจ: ${y} × ${lb} + ${x} × 2 = ${lb*y} + ${2*x} = ${L} ✓`]])}
    case 'swapSell':{const a=anPick(2,u),b=anPick(4,u),x=ri(5,20),y=ri(5,20),L=2*x+4*y,s=ri(2,Math.min(y,8)),k=ri(1,10),ans=L-4*s+2*k;
      return anMC(`ฟาร์มมี${a}และ${b} นับขารวมได้ ${L} ขา ต่อมาขาย${b}ไป ${s} ตัว และซื้อ${a}เพิ่ม ${k} ตัว ตอนนี้มีขารวมกี่ขา`,ans,[L-2*s+4*k,L-4*s,L+2*k,L-s+k],
        [[`ขาย${b} ${s} ตัว ขาหาย ${s} × 4 = ${4*s} ขา`,''],[`ซื้อ${a} ${k} ตัว ขาเพิ่ม ${k} × 2 = ${2*k} ขา`,''],[`${L} − ${4*s} + ${2*k} = ${ans} ขา`,'']])}
    case 'legGap':{const a=anPick(2,u),b=anPick(4,u),x=ri(3,18),y=ri(3,18),H=x+y,L=2*x+4*y,ans=Math.abs(4*y-2*x),big=4*y>=2*x;
      if(ans===0)return null;
      return anMC(`มี${a}และ${b}รวม ${H} ตัว มีขารวม ${L} ขา ขาของ${big?b:a}มากกว่าขาของ${big?a:b}กี่ขา`,ans,[Math.abs(x-y),ans+2,ans-4,L-H],
        [[`ถ้าเป็น${a}ทั้งหมด ขา = ${2*H} ขาดไป ${L-2*H} → ${b} = ${y} ตัว, ${a} = ${x} ตัว`,''],[`ขา${b} ${4*y} ขา, ขา${a} ${2*x} ขา ต่างกัน ${ans} ขา`,'']])}
    case 'ratio':{const la=2,lb=rnd([4,6,8]),a=anPick(la,u),b=anPick(lb,u),m=ri(2,4),y=ri(2,10),x=m*y,L=la*x+lb*y,askA=Math.random()<.5,ans=askA?x:y;
      return anMC(`มี${a}เป็น ${m} เท่าของ${b} นับขารวมกันได้ ${L} ขา มี${askA?a:b}กี่ตัว`,ans,[askA?y:x,ans+m,ans+1,ans-1],
        [[`ให้${b} = y ตัว, ${a} = ${m}y ตัว`,''],[`${la}(${m}y) + ${lb}y = ${L} → ${la*m+lb}y = ${L} → y = ${y}`,''],[`${b} ${y} ตัว, ${a} ${x} ตัว`,'']])}
    case 'equalLegs':{const [la,lb]=rnd([[2,4],[2,6],[2,8],[4,8],[4,6],[6,8]]),a=anPick(la,u),b=anPick(lb,u),g=gcd(la,lb),pa=lb/g,pb=la/g,k=ri(2,6),x=pa*k,y=pb*k,H=x+y,askA=Math.random()<.5,ans=askA?x:y;
      return anMC(`มี${a}และ${b}รวมกัน ${H} ตัว ขาของ${a}เท่ากับขาของ${b}พอดี มี${askA?a:b}กี่ตัว`,ans,[askA?y:x,H/2,ans+1,ans-1],
        [[`ขาเท่ากัน → ${la} × ${a} = ${lb} × ${b} → ${a} : ${b} = ${pa} : ${pb}`,''],[`${H} ÷ ${pa+pb} = ${k} → ${a} ${x} ตัว, ${b} ${y} ตัว`,'']])}
    case 'zeroLeg':{const z=anPick(0,u),a=anPick(2,u),b=anPick(4,u),s=ri(2,8),x=ri(3,15),y=ri(3,15),H=s+x+y,L=2*x+4*y,ans=y;
      return anMC(`มี${z} ${s} ตัว ${a}และ${b}อีกจำนวนหนึ่ง นับหัวได้ ${H} หัว นับขาได้ ${L} ขา มี${b}กี่ตัว`,ans,[x,(L-2*H)/2,ans+s,ans-1],
        [[`${z}ไม่มีขา → ${a}กับ${b}รวม ${H} − ${s} = ${x+y} ตัว`,''],[`ถ้าเป็น${a}ทั้งหมด ขา = ${2*(x+y)} ขาดไป ${L-2*(x+y)} → ${b} = ${y} ตัว`,'']])}
    case 'swapKinds':{const a=anPick(2,u),b=anPick(4,u);let x,y;do{x=ri(3,18);y=ri(3,18)}while(x===y);const L=2*x+4*y,L2=4*x+2*y,more=L2>L,askA=Math.random()<.5,ans=askA?x:y;
      return anMC(`มี${a}และ${b} นับขาได้ ${L} ขา ถ้าสลับจำนวน${a}กับ${b}กัน ขาจะ${more?'เพิ่ม':'ลด'}เป็น ${L2} ขา เดิมมี${askA?a:b}กี่ตัว`,ans,[askA?y:x,ans+1,ans-1,Math.abs(L2-L)/2],
        [[`2${a} + 4${b} = ${L} และ 4${a} + 2${b} = ${L2}`,''],[`บวกกัน: 6(${a}+${b}) = ${L+L2} → รวม ${x+y} ตัว · ลบกัน: 2(${a}−${b}) = ${L2-L}`,''],[`${a} ${x} ตัว, ${b} ${y} ตัว`,'']])}
    case 'miscount':{const a=anPick(2,u),b=anPick(4,u),x=ri(3,15),y=ri(3,15),wrong=2*(x+y),L=2*x+4*y,ans=y;
      return anMC(`เด็กคนหนึ่งนับขา${a}และ${b} โดยเข้าใจผิดว่า${b}ทุกตัวมี 2 ขา จึงนับได้ ${wrong} ขา แต่ที่จริงมี ${L} ขา มี${b}กี่ตัว`,ans,[x,L-wrong,(L-wrong)/4,ans+1],
        [[`${b}แต่ละตัวถูกนับขาขาดไป 2 ขา`,''],[`ขาที่ขาด ${L} − ${wrong} = ${L-wrong} → ${b} = ${L-wrong} ÷ 2 = ${y} ตัว`,'']])}
    case 'legsMinusHeads':{const a=anPick(2,u),b=anPick(rnd([4,6]),u),lb=AN_LEGS[4].includes(b)?4:6,x=ri(3,15),y=ri(3,15),H=x+y,D=2*x+lb*y-H,askA=Math.random()<.5,ans=askA?x:y;
      return anMC(`มี${a}และ${b}รวม ${H} ตัว จำนวนขามากกว่าจำนวนหัว ${D} มี${askA?a:b}กี่ตัว`,ans,[askA?y:x,ans+1,ans-1,D-H],
        [[`ขารวม = ${D} + ${H} = ${D+H} ขา`,''],[`ถ้าเป็น${a}ทั้งหมด ขา = ${2*H} ขาดไป ${D+H-2*H} → ${b} = ${D-H} ÷ ${lb-2} = ${y} ตัว, ${a} ${x} ตัว`,'']])}
    case 'bugsSpiders':{const a=anPick(6,u),b=anPick(8,u),c=anPick(4,u),z=ri(2,6),x=ri(3,15),y=ri(3,15),H=x+y+z,L=6*x+8*y+4*z,askA=Math.random()<.5,ans=askA?x:y;
      return anMC(`มี${c} ${z} ตัว ${a}และ${b}อีกจำนวนหนึ่ง รวมกัน ${H} ตัว นับขาได้ ${L} ขา มี${askA?a:b}กี่ตัว`,ans,[askA?y:x,ans+1,ans-1,ans+z],
        [[`${c} ${z} × 4 = ${4*z} ขา → ${a}กับ${b} ${x+y} ตัว มีขา ${L-4*z} ขา`,''],[`ถ้าเป็น${a}ทั้งหมด ขา = ${6*(x+y)} ขาดไป ${L-4*z-6*(x+y)} → ${b} = ÷2 = ${y} ตัว, ${a} ${x} ตัว`,'']])}
    case 'ratio3':{const a=anPick(2,u),b=anPick(4,u),c=anPick(8,u),y=ri(2,6),x=2*y,z=ri(1,5),L=2*x+4*y+8*z,H=x+y+z;
      return anMC(`มี${a} ${b} และ${c} รวม ${H} ตัว นับขาได้ ${L} ขา โดยมี${a}เป็น 2 เท่าของ${b} มี${c}กี่ตัว`,z,[y,z+1,z+2,x],
        [[`ให้${b} = y, ${a} = 2y, ${c} = ${H} − 3y`,''],[`4y + 4y + 8(${H} − 3y) = ${L} → ${8*H} − 16y = ${L} → y = ${y}`,''],[`${c} = ${H} − ${3*y} = ${z} ตัว`,'']])}
  }
  return null;
}
/* ตัวสร้างล้วน · ข้อจากคลังเดิมเติมให้ใน offlineItems ตาม bankShare ของวิชา (20%) */
/* ชุดเดียวกันวนแบบโจทย์ให้ครบก่อนซ้ำแบบเดิม (สุ่มล้วนเคยได้แบบเดียวกัน 3 ใน 5 ข้อ) */
LOCAL.animallegs=(l,n)=>{const kinds=[...new Set(AN_POOL[l]||AN_POOL[3])];let bag=[];
  return many(()=>{if(!bag.length)bag=shuffle(kinds.slice());return genAnimal1(l,bag.pop())},n)};
