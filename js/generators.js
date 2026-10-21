/* generators.js — ตัวสร้างโจทย์ในเครื่อง: เงื่อนไขสัญลักษณ์ อนุกรม คณิต เงื่อนไขภาษา มิติสัมพันธ์ */
/* ---------- inequality generator (answers derived by rule, always consistent) ---------- */
const TPL=[
 {d:'m',f:x=>({text:`${x.Y} > ${x.H}`,ans:'U',hl:[1,3],steps:[[`ในแถวรวมมีแค่ ${c(x.k,x.Y)} ไม่มี ${x.Y} ตัวเดียว`,`คูณ ${x.k} บรรทัดล่าง`],[`ลากจาก ${c(x.k,x.Y)} ไป ${x.H} ได้ ${c(x.k,x.Y)} > ${x.H} คือ ${x.Y} ${x.k} ตัวรวมกันมากกว่า ${x.H}`,'แถวรวม'],[`ไม่ได้บอกว่า ${x.Y} ตัวเดียวมากกว่า ${x.H} จึงสรุปไม่ได้`,'ความหมายของการคูณ']]})},
 {d:'m',f:x=>({text:`${x.X} < ${x.M}`,ans:'U',hl:[0,4],steps:[[`ในแถวรวมมีแค่ ${c(x.k,x.X)} ไม่มี ${x.X} ตัวเดียว`,`คูณ ${x.k} บรรทัดล่าง`],[`ลากจาก ${c(x.k,x.X)} ไป ${x.M} ได้ ${c(x.k,x.X)} > ${x.M} คือ ${x.X} ${x.k} ตัวรวมกันมากกว่า ${x.M}`,'แถวรวม'],[`ไม่ได้บอกว่า ${x.X} ตัวเดียวน้อยกว่าหรือมากกว่า ${x.M} จึงสรุปไม่ได้`,'ความหมายของการคูณ']]})},
 {d:'e',f:x=>{const p=Array.from({length:x.k},(_,i)=>i%2?x.Y:x.X);return{text:`${p.join(' + ')} > ${x.H}`,ans:'T',hl:[0,3],steps:[[`${x.Y} = ${x.X} เปลี่ยน ${x.Y} เป็น ${x.X} ได้ ทั้งหมดจึงเป็น ${x.X} ${x.k} ตัว คือ ${c(x.k,x.X)}`,'บรรทัดล่าง'],[`บรรทัดบนมี ${c(x.k,x.X)} > ${x.H} อยู่แล้ว`,'บรรทัดบน'],['ดังนั้นข้อสรุปจริง','ข้อ 1 และ 2']]}}},
 {d:'e',f:x=>({text:`${x.X} ≠ ${x.Y}`,ans:'F',hl:[0,1],steps:[[`บรรทัดล่างบอก ${x.X} = ${x.Y}`,'บรรทัดล่าง'],['ข้อสรุปบอกว่าไม่เท่ากัน ขัดกับโจทย์ จึงไม่จริง','เทียบกับโจทย์']]})},
 {d:'e',f:x=>({text:`${c(x.k,x.Q)} > ${x.M}`,ans:'T',hl:[2,4],steps:[[`ลากจาก ${c(x.k,x.Q)} ไป ${x.M} ผ่าน > > ได้ ${c(x.k,x.Q)} > ${x.M}`,'แถวรวม'],['ตรงกับข้อสรุป จึงจริง','เทียบกับข้อสรุป']]})},
 {d:'e',f:x=>({text:`${c(x.k,x.Y)} < ${x.M}`,ans:'F',hl:[1,4],steps:[[`ลากจาก ${c(x.k,x.Y)} ไป ${x.M} ผ่าน > > > ได้ ${c(x.k,x.Y)} > ${x.M}`,'แถวรวม'],['ข้อสรุปบอกกลับด้าน จึงไม่จริง','เทียบกับข้อสรุป']]})},
 {d:'h',f:x=>({text:`2${x.R} + ${x.S} < ${x.M}`,ans:'F',hl:[4,5],steps:[[`แยก 2${x.R} + ${x.S} เป็น (${x.R} + ${x.S}) + ${x.R}`,'แยกชิ้นในข้อสรุป'],[`${x.M} ≯ ${x.R} + ${x.S} แปลว่า ${x.R} + ${x.S} มากกว่าหรือเท่ากับ ${x.M}`,'บรรทัดบน'],[`บวก ${x.R} เพิ่ม (มากกว่า 0) ยิ่งมากกว่า ${x.M} ได้ 2${x.R} + ${x.S} > ${x.M}`,'ทุกตัวมากกว่าศูนย์'],['ข้อสรุปบอกกลับด้าน จึงไม่จริง','เทียบกับข้อสรุป']]})},
 {d:'m',f:x=>({text:`${x.R} > ${x.M}`,ans:'U',hl:null,steps:[[`${x.R} อยู่ในก้อน ${x.R} + ${x.S} เท่านั้น แยกออกมาตัวเดียวไม่ได้`,'บรรทัดบน'],[`ไม่มี ${x.R} ตัวเดียวให้ลากเส้นไปหา ${x.M} จึงสรุปไม่ได้`,'แถวรวม']]})},
 {d:'m',f:x=>({text:`${c(x.k,x.Q)} < ${x.R}`,ans:'U',hl:null,steps:[[`${x.R} อยู่ในก้อน ${x.R} + ${x.S} เท่านั้น และก้อนนี้ต่อกับแถวด้วย ≯`,'บรรทัดบน'],[`ไม่มีทางลากเส้นจาก ${c(x.k,x.Q)} ไป ${x.R} ตัวเดียว จึงสรุปไม่ได้`,'แถวรวม']]})},
 {d:'h',f:x=>({text:`${c(x.k,x.Q)} + ${x.H} > 2${x.M}`,ans:'T',hl:[2,4],steps:[[`แยก 2${x.M} เป็น ${x.M} + ${x.M} แล้วจับคู่ทีละชิ้น`,'แยกชิ้นในข้อสรุป'],[`ชิ้นแรก ${c(x.k,x.Q)} > ${x.M}`,'แถวรวม'],[`ชิ้นที่สอง ${x.H} > ${x.M}`,'บรรทัดบน'],['ฝั่งซ้ายชนะทั้งสองชิ้น บวกกันก็ชนะ จึงจริง','ข้อ 2 และ 3']]})},
 {d:'h',f:x=>({text:`${c(x.k,x.X)} + ${x.Y} > ${c(x.k,x.Q)}`,ans:'T',hl:[0,2],steps:[[`ลากจาก ${c(x.k,x.X)} ไป ${c(x.k,x.Q)} ผ่าน = > ได้ ${c(x.k,x.X)} > ${c(x.k,x.Q)}`,'แถวรวม'],[`ฝั่งซ้ายยังบวก ${x.Y} เพิ่ม (มากกว่า 0) ยิ่งชนะ จึงจริง`,'ทุกตัวมากกว่าศูนย์']]})},
 {d:'h',f:x=>({text:`${x.M} + ${x.H} < ${c(2*x.k,x.Y)}`,ans:'T',hl:[1,4],steps:[[`แยก ${c(2*x.k,x.Y)} เป็น ${c(x.k,x.Y)} + ${c(x.k,x.Y)}`,'แยกชิ้นในข้อสรุป'],[`ชิ้นแรก ${c(x.k,x.Y)} > ${x.H} และชิ้นที่สอง ${c(x.k,x.Y)} > ${x.M}`,'แถวรวม'],[`ฝั่ง ${x.Y} ชนะทั้งสองชิ้น บวกกันก็ชนะ จึงจริง`,'ข้อ 1 และ 2']]})},
 {d:'e',f:x=>({text:`${x.H} < ${x.M}`,ans:'F',hl:[3,4],steps:[[`บรรทัดบนบอก ${x.H} > ${x.M}`,'บรรทัดบน'],['ข้อสรุปบอกกลับด้าน จึงไม่จริง','เทียบกับโจทย์']]})},
 {d:'m',f:x=>({text:`${x.Q} > ${x.M}`,ans:'U',hl:[2,4],steps:[[`ในแถวรวมมีแค่ ${c(x.k,x.Q)} ไม่มี ${x.Q} ตัวเดียว`,`คูณ ${x.k} บรรทัดล่าง`],[`รู้แค่ ${c(x.k,x.Q)} > ${x.M} ไม่พอบอกว่า ${x.Q} ตัวเดียวมากกว่า ${x.M} จึงสรุปไม่ได้`,'แถวรวม']]})},
 {d:'h',f:x=>({text:`2${x.M} > ${x.H} + ${c(x.k,x.X)}`,ans:'F',hl:[0,4],steps:[[`แยก 2${x.M} เป็น ${x.M} + ${x.M}`,'แยกชิ้นในข้อสรุป'],[`${x.H} > ${x.M} และ ${c(x.k,x.X)} > ${x.M}`,'บรรทัดบน'],[`ได้ ${x.H} + ${c(x.k,x.X)} > 2${x.M} ข้อสรุปบอกกลับด้าน จึงไม่จริง`,'ข้อ 1 และ 2']]})},
 {d:'h',f:x=>({text:`${c(x.k+1,x.Y)} < ${x.M}`,ans:'F',hl:[1,4],steps:[[`${c(x.k+1,x.Y)} คือ ${c(x.k,x.Y)} + ${x.Y}`,'แยกชิ้นในข้อสรุป'],[`ลากจาก ${c(x.k,x.Y)} ไป ${x.M} ได้ ${c(x.k,x.Y)} > ${x.M}`,'แถวรวม'],[`บวก ${x.Y} เพิ่มยิ่งมากกว่า ได้ ${c(x.k+1,x.Y)} > ${x.M} ข้อสรุปบอกกลับด้าน จึงไม่จริง`,'ทุกตัวมากกว่าศูนย์']]})},
];
const ILV={1:{d:'e',k:[2]},2:{d:'em',k:[2]},3:{d:'emh',k:[2,3]},4:{d:'mhh',k:[3,4]},5:{d:'hhm',k:[4,5]}};
function ctxFor(k){const L=shuffle('ABCDEFGHJKLMNPQRSTUVWXYZ'.split('')).slice(0,7);return{X:L[0],Y:L[1],Q:L[2],H:L[3],M:L[4],R:L[5],S:L[6],k}}
function genIneq(level,n){
  const cfg=ILV[level];const out=[];let last=-1;
  for(let i=0;i<n;i++){
    const d=rnd(cfg.d.split(''));let pool=TPL.map((t,j)=>j).filter(j=>TPL[j].d===d&&j!==last);
    const j=rnd(pool);last=j;const ctx=ctxFor(rnd(cfg.k));const q=TPL[j].f(ctx);
    out.push({kind:'ineq',ctx,text:q.text,hl:q.hl,steps:q.steps,choices:TFU.map(a=>LBL[a]),answer:TFU.indexOf(q.ans)});
  }
  return out;
}

/* ---------- เงื่อนไขสัญลักษณ์: engine v2 ---------- */
/* LP feasibility (phase-1 simplex, Bland's rule). rows: {a:[...n], b, t:'ge'|'eq'} meaning a·x >= b or a·x = b, x >= 0 */
function lpFeasible(rows,n){
  const m=rows.length,ns=rows.filter(r=>r.t==='ge').length,N=n+ns+m,T=[],basis=[];
  let si=n;
  rows.forEach((r,i)=>{const row=new Array(N+1).fill(0);for(let j=0;j<n;j++)row[j]=r.a[j]||0;if(r.t==='ge'){row[si]=-1;si++}row[N]=r.b;
    if(row[N]<0)for(let k=0;k<=N;k++)row[k]=-row[k];row[n+ns+i]=1;T.push(row);basis.push(n+ns+i)});
  const z=new Array(N+1).fill(0);
  for(let j=0;j<n+ns;j++){let s=0;for(let i=0;i<m;i++)s+=T[i][j];z[j]=-s}
  {let s=0;for(let i=0;i<m;i++)s+=T[i][N];z[N]=-s}
  for(let it=0;it<800;it++){
    let j=-1;for(let k=0;k<N;k++)if(z[k]<-1e-9){j=k;break}
    if(j<0)break;
    let r=-1,best=Infinity;
    for(let i=0;i<m;i++)if(T[i][j]>1e-9){const q=T[i][N]/T[i][j];if(q<best-1e-12||(Math.abs(q-best)<=1e-12&&basis[i]<basis[r])){best=q;r=i}}
    if(r<0)break;
    const pv=T[r][j];for(let k=0;k<=N;k++)T[r][k]/=pv;
    for(let i=0;i<m;i++)if(i!==r&&Math.abs(T[i][j])>1e-12){const f=T[i][j];for(let k=0;k<=N;k++)T[i][k]-=f*T[r][k]}
    {const f=z[j];for(let k=0;k<=N;k++)z[k]-=f*T[r][k]}
    basis[r]=j;
  }
  return Math.abs(z[N])<1e-6;
}
const NEG={'>':'≤','<':'≥','≥':'<','≤':'>','=':'≠','≠':'=','≯':'>','≮':'<'};
function relRows(op,L,R,V){
  const d=V.map(v=>(L[v]||0)-(R[v]||0)),nd=d.map(x=>-x);
  switch(op){
    case '>':return[[{a:d,b:1,t:'ge'}]];case '<':return[[{a:nd,b:1,t:'ge'}]];
    case '≥':case '≮':return[[{a:d,b:0,t:'ge'}]];case '≤':case '≯':return[[{a:nd,b:0,t:'ge'}]];
    case '=':return[[{a:d,b:0,t:'eq'}]];case '≠':return[[{a:d,b:1,t:'ge'}],[{a:nd,b:1,t:'ge'}]];
  }
}
const SUMSEP='+';
function atomMap(at){const m={};if(at.node.includes(SUMSEP))for(const l of at.node.split(SUMSEP))m[l]=(m[l]||0)+at.k;else m[at.node]=at.k;return m}
function piecesMap(pcs){const m={};for(const p of pcs){const a=atomMap(p);for(const l in a)m[l]=(m[l]||0)+a[l]}return m}
function premRows(P,V){
  const rows=V.map((v,i)=>({a:V.map((_,j)=>j===i?1:0),b:1,t:'ge'}));
  for(const line of P.lines)for(let i=0;i<line.ops.length;i++)rows.push(...relRows(line.ops[i],atomMap(line.atoms[i]),atomMap(line.atoms[i+1]),V)[0]);
  return rows;
}
function possible(base,op,L,R,V){return relRows(op,L,R,V).some(alt=>lpFeasible([...base,...alt],V.length))}
function lpVerdict(base,op,L,R,V){
  if(!possible(base,NEG[op],L,R,V))return'T';
  if(!possible(base,op,L,R,V))return'F';
  return'U';
}

/* formatting */
function fmtK(k){
  if(Math.abs(k-1)<1e-9)return'';
  if(Math.abs(k-Math.round(k))<1e-9)return String(Math.round(k));
  const U={'0.5':'½','0.333':'⅓','0.25':'¼','0.667':'⅔','0.2':'⅕','0.75':'¾'},key=String(Math.round(k*1000)/1000);
  if(U[key])return U[key];
  for(let d=2;d<=12;d++){const nn=k*d;if(Math.abs(nn-Math.round(nn))<1e-9)return`${Math.round(nn)}/${d}`}
  return String(Math.round(k*100)/100);
}
function atomStr(k,node){return node.includes(SUMSEP)?(Math.abs(k-1)<1e-9?node.split(SUMSEP).join(' + '):`${fmtK(k)}(${node.split(SUMSEP).join(' + ')})`):fmtK(k)+node}
function mapStr(m){return Object.keys(m).filter(l=>m[l]>1e-9).map(l=>fmtK(m[l])+l).join(' + ')}
function lineStr(line){let s=atomStr(line.atoms[0].k,line.atoms[0].node);for(let i=0;i<line.ops.length;i++)s+=` ${line.ops[i]} ${atomStr(line.atoms[i+1].k,line.atoms[i+1].node)}`;return s}

/* relation graph: edge u→v (w, strict, eq) means u >= w·v */
function buildGraph(P){
  const E={};const add=(u,v,w,strict,eq,src)=>{(E[u]=E[u]||[]).push({v,w,strict,eq,src})};
  P.lines.forEach((line,li)=>{for(let i=0;i<line.ops.length;i++){
    const A=line.atoms[i],B=line.atoms[i+1],op=line.ops[i],src=li;
    if(op==='>')add(A.node,B.node,B.k/A.k,true,false,src);
    else if(op==='≥'||op==='≮')add(A.node,B.node,B.k/A.k,false,false,src);
    else if(op==='<')add(B.node,A.node,A.k/B.k,true,false,src);
    else if(op==='≤'||op==='≯')add(B.node,A.node,A.k/B.k,false,false,src);
    else if(op==='='){add(A.node,B.node,B.k/A.k,false,true,src);add(B.node,A.node,A.k/B.k,false,true,src)}
  }});
  for(const line of P.lines)for(const at of line.atoms)if(at.node.includes(SUMSEP))for(const l of at.node.split(SUMSEP))if(!(E[at.node]||[]).some(e=>e.v===l&&e.part))(E[at.node]=E[at.node]||[]).push({v:l,w:1,strict:true,eq:false,src:-1,part:true});
  return E;
}
function allPaths(E,u,v){
  const out=[];
  (function dfs(n,seen,edges){if(n===v&&edges.length){out.push(edges.slice());return}if(edges.length>7)return;
    for(const e of E[n]||[])if(!seen.has(e.v)){seen.add(e.v);edges.push(e);dfs(e.v,seen,edges);edges.pop();seen.delete(e.v)}})(u,new Set([u]),[]);
  return out;
}
const RANK={'>':3,'=':2,'≥':1};
/* does c·u relate to d·v? returns {rel:'>'|'='|'≥'|null, chain, srcs, near} */
function dom(E,c,u,d,v){
  if(u===v){const rel=c>d+1e-9?'>':Math.abs(c-d)<1e-9?'=':null;return{rel,chain:rel?`${atomStr(c,u)} ${rel} ${atomStr(d,v)}`:'',srcs:[],same:true}}
  let best=null,near=null;
  for(const p of allPaths(E,u,v)){
    let w=1,strict=false,eq=true;for(const e of p){w*=e.w;strict=strict||e.strict;eq=eq&&e.eq}
    const val=c*w;let rel=null;
    if(val>d+1e-9)rel='>';else if(Math.abs(val-d)<1e-9)rel=strict?'>':eq?'=':'≥';
    const info={rel,p,w,val};
    if(rel&&(!best||RANK[rel]>RANK[best.rel]||(RANK[rel]===RANK[best.rel]&&p.length<best.p.length)))best=info;
    if(!rel&&(!near||val>near.val))near=info;
  }
  const chainOf=info=>{let k=c,s=atomStr(k,u);for(const e of info.p){k*=e.w;s+=` ${e.eq?'=':e.strict?'>':'≥'} ${atomStr(k,e.v)}`}return{s,end:k}};
  if(best){const ch=chainOf(best);return{rel:best.rel,chain:ch.s,end:ch.end,srcs:[...new Set(best.p.map(e=>e.src))],node:v}}
  if(near){const ch=chainOf(near);return{rel:null,chain:ch.s,end:ch.end,srcs:[...new Set(near.p.map(e=>e.src))],node:v,near:true}}
  return{rel:null,chain:'',srcs:[]};
}
const srcTxt=(srcs,scaled)=>{const ls=srcs.filter(s=>s>=0).map(s=>`บรรทัดที่ ${s+1}`),pt=srcs.includes(-1);
  return [ls.length?ls.join(' และ '):'',pt?'ผลบวกมากกว่าส่วนย่อยแต่ละตัว':'',scaled?'ปรับตัวคูณให้ตัวเชื่อมตรงกัน':''].filter(Boolean).join(' · ')||'โจทย์'};
function expandUnits(pcs){const u=[];for(const p of pcs){if(Math.abs(p.k-Math.round(p.k))<1e-9&&p.k>1)for(let i=0;i<Math.round(p.k);i++)u.push({node:p.node,k:1});else u.push(p)}return u}
function perms(n,r){const out=[];(function go(cur,used){if(cur.length===r){out.push(cur.slice());return}for(let i=0;i<n;i++)if(!used[i]){used[i]=1;cur.push(i);go(cur,used);cur.pop();used[i]=0}})([],[]);return out}
/* derive Big vs Small; returns {rel, steps} */
function derive(E,Big,Small){
  const bu=expandUnits(Big),su=expandUnits(Small);
  if(bu.length===1&&su.length===1){
    const r=dom(E,bu[0].k,bu[0].node,su[0].k,su[0].node);
    if(r.rel){const steps=[];
      if(r.same)steps.push([`${r.chain} เพราะเป็นตัวเดียวกันแต่ตัวคูณ${r.rel==='>'?'มากกว่า':'เท่ากัน'}`,'เทียบตัวคูณ']);
      else{const scaled=r.chain.match(/[½⅓¼⅔⅕¾\d]/);steps.push([`ไล่จากโจทย์: ${r.chain}`,srcTxt(r.srcs,scaled)]);
        if(Math.abs(r.end-su[0].k)>1e-9)steps.push([`${atomStr(r.end,su[0].node)} มากกว่า ${atomStr(su[0].k,su[0].node)} เพราะตัวคูณมากกว่า จึงได้ ${atomStr(bu[0].k,bu[0].node)} > ${atomStr(su[0].k,su[0].node)}`,'เทียบตัวคูณ'])}
      return{rel:r.rel,steps};
    }
    return{rel:null,near:r,steps:[]};
  }
  if(bu.length<su.length)return{rel:null,steps:[]};
  let best=null;
  for(const pm of perms(bu.length,su.length)){
    const rs=pm.map((bi,si)=>dom(E,bu[bi].k,bu[bi].node,su[si].k,su[si].node));
    if(rs.every(r=>r.rel)){const sc=rs.filter(r=>r.rel==='>').length+(bu.length>su.length?1:0),eqAll=rs.every(r=>r.rel==='=')&&bu.length===su.length;
      if(!best||sc>best.sc)best={pm,rs,sc,eqAll}}
  }
  if(!best)return{rel:null,steps:[]};
  const rel=best.sc>0?'>':best.eqAll?'=':'≥';
  const steps=[[`แยกเป็นชิ้น: ${bu.map(p=>atomStr(p.k,p.node)).join(' , ')} เทียบกับ ${su.map(p=>atomStr(p.k,p.node)).join(' , ')}`,'แยกชิ้นในข้อสรุป']];
  best.rs.forEach((r,si)=>{const tail=!r.same&&Math.abs(r.end-su[si].k)>1e-9?` และ ${atomStr(r.end,su[si].node)} > ${atomStr(su[si].k,su[si].node)} เพราะตัวคูณมากกว่า`:'';steps.push([`จับคู่: ${r.chain}${tail}`,r.same?'เทียบตัวคูณ':srcTxt(r.srcs,/[½⅓¼⅔⅕¾\d]/.test(r.chain))])});
  const used=new Set(best.pm),left=bu.filter((_,i)=>!used.has(i));
  steps.push([`ฝั่ง ${mapStr(piecesMap(Big))} ชนะทุกคู่${left.length?` และยังเหลือ ${left.map(p=>atomStr(p.k,p.node)).join(' + ')} ซึ่งมากกว่า 0`:''} จึงได้ ${mapStr(piecesMap(Big))} ${rel} ${mapStr(piecesMap(Small))}`,'บวกชิ้นที่ชนะเข้าด้วยกัน']);
  return{rel,steps};
}
/* engine verdict + explanation for: Lp op Rp */
function explain(E,op,Lp,Rp){
  const Ls=mapStr(piecesMap(Lp)),Rs=mapStr(piecesMap(Rp));
  const claim={'>':[Lp,Rp,true],'<':[Rp,Lp,true],'≥':[Lp,Rp,false],'≮':[Lp,Rp,false],'≤':[Rp,Lp,false],'≯':[Rp,Lp,false]}[op];
  const meaning={'≯':`${Ls} ≯ ${Rs} แปลว่า ${Ls} ไม่มากกว่า ${Rs} (น้อยกว่าหรือเท่ากับ)`,'≮':`${Ls} ≮ ${Rs} แปลว่า ${Ls} ไม่น้อยกว่า ${Rs} (มากกว่าหรือเท่ากับ)`,'≠':`ข้อสรุปบอกว่า ${Ls} กับ ${Rs} ไม่เท่ากัน`}[op];
  const pre=meaning?[[meaning,'ความหมายของเครื่องหมาย']]:[];
  if(claim){
    const [B,S,strict]=claim,Bs=mapStr(piecesMap(B)),Ss=mapStr(piecesMap(S));
    const d1=derive(E,B,S);
    if(d1.rel&&(d1.rel==='>'||!strict))return{v:'T',steps:[...pre,...d1.steps,[`ตรงกับข้อสรุป จึง จริง`,'เทียบกับข้อสรุป']]};
    const d2=derive(E,S,B);
    if(d2.rel&&(d2.rel!=='≥'||strict)&&(strict||d2.rel==='>'))return{v:'F',steps:[...pre,...d2.steps,[`ได้ ${Ss} ${d2.rel} ${Bs} ซึ่งขัดกับข้อสรุป จึง ไม่จริง`,'เทียบกับข้อสรุป']]};
    if(d1.rel)return{v:'U',steps:[...pre,...d1.steps,[`ได้แค่ ${Bs} ${d1.rel} ${Ss} ซึ่งอาจเท่ากันได้ จึงยืนยันว่า ${Bs} > ${Ss} ไม่ได้ ตอบ สรุปไม่ได้`,'เทียบกับข้อสรุป']]};
    if(d2.rel)return{v:'U',steps:[...pre,...d2.steps,[`ได้แค่ ${Ss} ${d2.rel} ${Bs} ซึ่งอาจเท่ากันได้ ข้อสรุปจึงไม่ผิดแน่นอน และไม่ถูกแน่นอน ตอบ สรุปไม่ได้`,'เทียบกับข้อสรุป']]};
    return{v:'U',steps:[...pre,...uSteps(d1,B,S)]};
  }
  const d1=derive(E,Lp,Rp),d2=derive(E,Rp,Lp);
  if(op==='='){
    if(d1.rel==='=')return{v:'T',steps:[...d1.steps,['ทุกขั้นเป็นเครื่องหมาย = จึงเท่ากัน ข้อสรุป จริง','เทียบกับข้อสรุป']]};
    if(d1.rel==='>')return{v:'F',steps:[...d1.steps,[`${Ls} มากกว่า ${Rs} จึงไม่เท่ากัน ข้อสรุป ไม่จริง`,'เทียบกับข้อสรุป']]};
    if(d2.rel==='>')return{v:'F',steps:[...d2.steps,[`${Rs} มากกว่า ${Ls} จึงไม่เท่ากัน ข้อสรุป ไม่จริง`,'เทียบกับข้อสรุป']]};
    const dd=d1.rel?d1:d2;
    if(dd.rel)return{v:'U',steps:[...dd.steps,['ได้แค่ ≥ อาจเท่ากันหรือไม่เท่าก็ได้ จึง สรุปไม่ได้','เทียบกับข้อสรุป']]};
    return{v:'U',steps:uSteps(d1,Lp,Rp)};
  }
  if(op==='≠'){
    if(d1.rel==='>')return{v:'T',steps:[...pre,...d1.steps,[`${Ls} มากกว่า ${Rs} จึงไม่เท่ากันแน่นอน ข้อสรุป จริง`,'เทียบกับข้อสรุป']]};
    if(d2.rel==='>')return{v:'T',steps:[...pre,...d2.steps,[`${Rs} มากกว่า ${Ls} จึงไม่เท่ากันแน่นอน ข้อสรุป จริง`,'เทียบกับข้อสรุป']]};
    if(d1.rel==='=')return{v:'F',steps:[...pre,...d1.steps,['ทั้งสองเท่ากัน ข้อสรุปที่บอกว่าไม่เท่าจึง ไม่จริง','เทียบกับข้อสรุป']]};
    const dd=d1.rel?d1:d2;
    if(dd.rel)return{v:'U',steps:[...pre,...dd.steps,['ได้แค่ ≥ อาจเท่ากันได้ จึงยืนยันว่าไม่เท่ากันไม่ได้ ตอบ สรุปไม่ได้','เทียบกับข้อสรุป']]};
    return{v:'U',steps:[...pre,...uSteps(d1,Lp,Rp)]};
  }
}
function uSteps(d,A,B){
  const As=mapStr(piecesMap(A)),Bs=mapStr(piecesMap(B));
  if(d.near&&d.near.chain&&!d.near.same){const r=d.near;return[[`ไล่จากโจทย์ได้: ${r.chain}`,srcTxt(r.srcs,true)],[`แต่ ${atomStr(r.end,r.node)} น้อยกว่า ${Bs} ตัวคูณไม่พอ จึงบอกไม่ได้ว่าใครมากกว่า ตอบ สรุปไม่ได้`,'เทียบตัวคูณ']]}
  if(expandUnits(A).length+expandUnits(B).length>2)return[[`ลองจับคู่ชิ้นของ ${As} กับ ${Bs} แล้ว ไม่มีฝั่งไหนชนะได้ครบทุกคู่`,'แยกชิ้นในข้อสรุป'],['ข้อมูลไม่พอยืนยันทั้งสองทาง ตอบ สรุปไม่ได้','เทียบกับข้อสรุป']];
  return[[`ลากเส้นจาก ${As} ไปหา ${Bs} ตามทิศเดียวกันไม่ได้ และจาก ${Bs} ไป ${As} ก็ไม่ได้ (เจอเครื่องหมายกลับทิศคั่นหรือไม่มีตัวเชื่อม)`,'โจทย์'],['ข้อมูลไม่พอยืนยันทั้งสองทาง ตอบ สรุปไม่ได้','เทียบกับข้อสรุป']];
}

/* problem generator */
const I2={
 1:{nl:[1],len:[4,5],ops:['>','>','≥','='],sum:0,coef:0,cops:['>','<','='],fmt:['tfu'],sumC:0,cks:[1]},
 2:{nl:[2],len:[3,4],ops:['>','>','≥','=','<','≤'],sum:0,coef:0,cops:['>','<','≥','≤','=','≠'],fmt:['tfu','tfu','pick'],sumC:0,cks:[1]},
 3:{nl:[2,2,3],len:[3,4],ops:['>','≥','=','<','≤','≯','≮'],sum:.4,coef:0,cops:['>','<','≥','≤','=','≠','≯','≮'],fmt:['tfu','pick'],sumC:.2,cks:[1]},
 4:{nl:[2],len:[3,4],ops:['>','≥','=','<','≤','≯'],sum:.6,coef:1,cops:['>','<','≥','≤','=','≯','≮'],fmt:['tfu','tfu','pick'],sumC:.4,cks:[1,1,2,0.5]},
 5:{nl:[2,3],len:[3,5],ops:['>','≥','=','<','≤','≯','≮'],sum:.7,coef:2,cops:['>','<','≥','≤','≠','≯','≮'],fmt:['tfu','pick'],sumC:.6,cks:[1,2,3,0.5]},
};
function genProblem(level){
  const cf=I2[level];
  for(let tries=0;tries<60;tries++){
    const pool=shuffle('ABCDEFGHJKLMNPQRSTUVWXYZ'.split(''));let pi=0;const take=()=>pool[pi++];
    const nl=rnd(cf.nl),lines=[];const singles=[];
    for(let li=0;li<nl;li++){
      const len=ri(cf.len[0],cf.len[1]),atoms=[];
      const linkPos=li>0?ri(0,len-1):-1;
      for(let i=0;i<len;i++){
        if(i===linkPos){const l=rnd(singles);let k=1;if(cf.coef&&Math.random()<.75)k=rnd(cf.coef>1?[0.5,2,1/3,3]:[0.5,2]);atoms.push({node:l,k})}
        else{const l=take();atoms.push({node:l,k:1})}
      }
      if(cf.coef>1&&Math.random()<.4){const i=ri(0,len-1);if(i!==linkPos)atoms[i].k=rnd([2,3])}
      if(Math.random()<cf.sum){const i=Math.random()<.5?0:len-1;if(i!==linkPos)atoms[i]={node:take()+SUMSEP+take(),k:1}}
      for(const a of atoms)if(!a.node.includes(SUMSEP)&&!singles.includes(a.node))singles.push(a.node);
      const ops=[];for(let i=0;i<len-1;i++)ops.push(rnd(cf.ops));
      lines.push({atoms,ops});
    }
    const V=[...new Set(lines.flatMap(l=>l.atoms.flatMap(a=>a.node.split(SUMSEP))))];
    const P={lines,V};const base=premRows(P,V);
    if(!lpFeasible(base,V.length))continue;
    P.base=base;P.E=buildGraph(P);P.singles=singles;P.sums=[...new Set(lines.flatMap(l=>l.atoms.filter(a=>a.node.includes(SUMSEP)).map(a=>a.node)))];
    return P;
  }
  return null;
}
function randConcl(P,level){
  const cf=I2[level],nodes=[...P.singles,...P.sums];
  const op=rnd(cf.cops);
  let Lp,Rp;
  if(Math.random()<cf.sumC&&nodes.length>=3){
    const n1=ri(2,level>=5?3:2),n2=ri(1,2);
    Lp=[...Array(n1)].map(()=>({node:rnd(nodes),k:1}));Rp=[...Array(n2)].map(()=>({node:rnd(nodes),k:1}));
  }else{
    const u=rnd(nodes);let v=rnd(nodes);if(v===u)v=rnd(nodes);if(v===u)return null;
    Lp=[{node:u,k:rnd(cf.cks)}];Rp=[{node:v,k:rnd(cf.cks)}];if(Lp[0].k===Rp[0].k&&Lp[0].k!==1)return null;
  }
  const Lm=piecesMap(Lp),Rm=piecesMap(Rp);
  const covers=(A,B)=>Object.keys(B).every(l=>(A[l]||0)>=B[l]-1e-9);
  if(Lp.length+Rp.length>2&&(covers(Lm,Rm)||covers(Rm,Lm)))return null;
  if(Object.keys(Lm).every(l=>Math.abs((Lm[l]||0)-(Rm[l]||0))<1e-9)&&Object.keys(Rm).every(l=>Math.abs((Lm[l]||0)-(Rm[l]||0))<1e-9))return null;
  const text=`${mapStr(Lm)} ${op} ${mapStr(Rm)}`;
  const v=lpVerdict(P.base,op,Lm,Rm,P.V);
  const ex=explain(P.E,op,Lp,Rp);
  if(!ex||ex.v!==v)return null;
  return{text,v,steps:ex.steps};
}
function findConcl(P,level,want,avoid){
  let any=null;
  for(let t=0;t<120;t++){const c=randConcl(P,level);if(!c||avoid.has(c.text))continue;if(!want||want.includes(c.v))return c;any=any||c}
  return want?null:any;
}
function genIneq2One(level){
  for(let t=0;t<30;t++){
    const P=genProblem(level);if(!P)continue;
    const lines=P.lines.map(lineStr);
    const fmt=rnd(I2[level].fmt);
    if(fmt==='tfu'){
      const want=rnd(['T','F','U']);const c=findConcl(P,level,[want],new Set());if(!c)continue;
      return{kind:'ineq2',fmt,lines,text:c.text,choices:TFU.map(a=>LBL[a]),answer:TFU.indexOf(c.v),steps:c.steps};
    }
    const avoid=new Set(),T=findConcl(P,level,['T'],avoid);if(!T)continue;avoid.add(T.text);
    const others=[];for(let i=0;i<3;i++){const o=findConcl(P,level,i===0?['F']:i===1?['U']:['F','U'],avoid);if(!o)break;avoid.add(o.text);others.push(o)}
    if(others.length<3)continue;
    const all=shuffle([T,...others]);
    const steps=[[`ข้อที่ถูกแน่นอนคือ ${T.text}`,'ตรวจทีละตัวเลือก'],...T.steps,...others.map(o=>[`${o.text} → ${LBL[o.v]}`,'ตรวจแบบเดียวกัน'])];
    return{kind:'ineq2',fmt,lines,text:'ข้อใดสรุปได้ถูกต้องแน่นอน',choices:all.map(c=>c.text),answer:all.indexOf(T),steps,detail:all.map(c=>({text:c.text,v:c.v}))};
  }
  return null;
}
function genIneq2(level,n){
  const out=[],seen=new Set();let g=0;
  while(out.length<n&&g++<n*6){const q=genIneq2One(level);if(q&&!seen.has(q.lines.join('|')+q.text)){seen.add(q.lines.join('|')+q.text);out.push(q)}}
  return out;
}

/* ---------- shared multiple-choice builder ---------- */
const ri=(a,b)=>a+Math.floor(Math.random()*(b-a+1));
const r2=x=>Math.round(x*100)/100;
const nf=x=>{x=r2(x);return Math.abs(x)>=1000?x.toLocaleString('en-US'):String(x)};
function mkMC(stem,ans,dist,steps,fmt){
  fmt=fmt||nf;const seen=new Set([fmt(ans)]),ds=[];
  for(const d of dist){if(d==null||!isFinite(d))continue;const s=fmt(d);if(!seen.has(s)){seen.add(s);ds.push(s)}if(ds.length===3)break}
  let k=1;while(ds.length<3){for(const d of [ans+k,ans-k]){const s=fmt(d);if(ds.length<3&&!seen.has(s)){seen.add(s);ds.push(s)}}k++}
  const choices=shuffle([fmt(ans),...ds]);return{kind:'mc',stem,choices,answer:choices.indexOf(fmt(ans)),steps};
}
function mkMCtext(stem,ans,dist,steps){const choices=shuffle([ans,...dist.slice(0,3)]);return{kind:'mc',stem,choices,answer:choices.indexOf(ans),steps}}
function many(fn,n){const out=[],seen=new Set();let guard=0;while(out.length<n&&guard++<n*40){const q=fn(),k=q&&q.stem+(q.svg||'');if(q&&!seen.has(k)){seen.add(k);out.push(q)}}return out}

/* ---------- อนุกรม ---------- */
const PRIMES=[2,3,5,7,11,13,17];
const SER_POOL={1:['ar','geo'],2:['ar','geo','sq'],3:['d2','fib','inter','aff','sq'],4:['inter','alt','dgeo','d2','cube'],5:['alt','dgeo','fact','prime','inter','aff']};
function serRule(kind,level){
  const t=[];let rule,calc;
  switch(kind){
    case 'ar':{const a=ri(1,20)+(level>1?ri(0,30):0),d=level===1?ri(2,9):rnd([-7,-6,-5,-4,4,5,6,7,8,9,11,12]);for(let i=0;i<7;i++)t.push(a+i*d);
      rule=`ผลต่างของตัวที่ติดกันคงที่ แต่ละตัว${d>0?'บวก '+d:'ลบ '+(-d)}`;calc=i=>`${t[i-1]} ${d>0?'+ '+d:'− '+(-d)} = ${t[i]}`;break}
    case 'geo':{const a=ri(1,5),r=level===1?rnd([2,3]):rnd([2,3,4]);for(let i=0;i<7;i++)t.push(a*r**i);rule=`แต่ละตัวคูณ ${r}`;calc=i=>`${t[i-1]} × ${r} = ${t[i]}`;break}
    case 'sq':{const n0=ri(1,6),cc=level>=2?rnd([0,0,1,-1,2]):0;for(let i=0;i<7;i++)t.push((n0+i)**2+cc);
      rule=`เป็นกำลังสองเรียงกัน ${n0}², ${n0+1}², ${n0+2}², …${cc?` แล้ว${cc>0?'บวก '+cc:'ลบ '+(-cc)}`:''}`;calc=i=>`${n0+i}² ${cc?(cc>0?'+ '+cc:'− '+(-cc)):''} = ${t[i]}`;break}
    case 'd2':{const a=ri(1,15),d0=ri(1,5),e=ri(1,4);t.push(a);for(let i=1;i<7;i++)t.push(t[i-1]+d0+(i-1)*e);
      rule=`ผลต่างคือ ${d0}, ${d0+e}, ${d0+2*e}, … เพิ่มขึ้นทีละ ${e}`;calc=i=>`${t[i-1]} + ${d0+(i-1)*e} = ${t[i]}`;break}
    case 'fib':{t.push(ri(1,5),ri(1,6));for(let i=2;i<7;i++)t.push(t[i-1]+t[i-2]);rule='แต่ละตัวเท่ากับสองตัวก่อนหน้าบวกกัน';calc=i=>`${t[i-2]} + ${t[i-1]} = ${t[i]}`;break}
    case 'inter':{const a1=ri(1,20),d1=ri(2,7),a2=ri(20,60),d2=rnd([-5,-4,-3,3,4,5,6]);for(let i=0;i<7;i++)t.push(i%2===0?a1+(i/2)*d1:a2+((i-1)/2)*d2);
      rule=`แยกเป็น 2 ชุดสลับกัน ตำแหน่งคี่บวก ${d1} ทุกครั้ง ตำแหน่งคู่${d2>0?'บวก '+d2:'ลบ '+(-d2)} ทุกครั้ง`;calc=i=>{const d=i%2===0?d1:d2;return `${t[i-2]} ${d>0?'+ '+d:'− '+(-d)} = ${t[i]} (ดูตัวที่อยู่ห่างกัน 2 ตำแหน่ง)`};break}
    case 'aff':{const m=rnd([2,3]),cc=rnd([1,-1,2,3]);t.push(ri(2,5));for(let i=1;i<7;i++)t.push(t[i-1]*m+cc);
      rule=`แต่ละตัว = ตัวก่อนหน้า × ${m} ${cc>0?'+ '+cc:'− '+(-cc)}`;calc=i=>`${t[i-1]} × ${m} ${cc>0?'+ '+cc:'− '+(-cc)} = ${t[i]}`;break}
    case 'alt':{const p=ri(1,5),q=rnd([2,3]);t.push(ri(1,9));for(let i=1;i<7;i++)t.push(i%2===1?t[i-1]+p:t[i-1]*q);
      rule=`ทำสลับกัน บวก ${p} แล้วคูณ ${q} ไปเรื่อยๆ`;calc=i=>i%2===1?`${t[i-1]} + ${p} = ${t[i]}`:`${t[i-1]} × ${q} = ${t[i]}`;break}
    case 'dgeo':{const a=ri(1,10),d=ri(1,3),r=rnd([2,3]);t.push(a);for(let i=1;i<7;i++)t.push(t[i-1]+d*r**(i-1));
      rule=`ผลต่างคือ ${d}, ${d*r}, ${d*r*r}, … คูณ ${r} ทุกครั้ง`;calc=i=>`${t[i-1]} + ${d*r**(i-1)} = ${t[i]}`;break}
    case 'cube':{const n0=ri(1,4);for(let i=0;i<7;i++)t.push((n0+i)**3);rule=`เป็นกำลังสามเรียงกัน ${n0}³, ${n0+1}³, ${n0+2}³, …`;calc=i=>`${n0+i}³ = ${t[i]}`;break}
    case 'fact':{t.push(ri(1,3));for(let i=1;i<7;i++)t.push(t[i-1]*(i+1));rule='แต่ละตัวคูณด้วยเลขที่เพิ่มขึ้น × 2, × 3, × 4, …';calc=i=>`${t[i-1]} × ${i+1} = ${t[i]}`;break}
    case 'prime':{t.push(ri(1,20));for(let i=1;i<7;i++)t.push(t[i-1]+PRIMES[i-1]);rule='ผลต่างเป็นจำนวนเฉพาะเรียงกัน 2, 3, 5, 7, 11, …';calc=i=>`${t[i-1]} + ${PRIMES[i-1]} = ${t[i]}`;break}
  }
  return{t,rule,calc};
}
function genSeries1(level){
  const kind=rnd(SER_POOL[level]),{t,rule,calc}=serRule(kind,level);
  if(t.some(v=>Math.abs(v)>99999))return null;
  const missing=level>=4&&Math.random()<.35&&kind!=='fib';
  let shown,idx;
  if(missing){idx=ri(2,4);shown=t.slice(0,6).map((v,i)=>i===idx?'?':v)}else{idx=5;shown=[...t.slice(0,5),'?']}
  const ans=t[idx],prev=t[idx-1],pp=t[idx-2];
  const naive=prev+(prev-pp);
  return mkMC(`จงหาจำนวนที่แทน ?\n${shown.join(',  ')}`,ans,shuffle([naive,ans+(ans-prev),ans+1,ans-1,ans+2,ans-2]).sort((a,b)=>(b===naive)-(a===naive)),
    [[rule,'ดูความสัมพันธ์ของตัวที่ติดกัน'],[`จำนวนที่หายไป: ${calc(idx)}`,'ใช้กฎในข้อ 1']]);
}

/* ---------- คณิตศาสตร์ทั่วไป ---------- */
const MATH_POOL={1:['pct','disc','speed'],2:['pct','disc','profit','speed','ratio'],3:['profit','avg','ratio','work','interest'],4:['profit','age','work','updown','avg'],5:['age','updown','pctpct','work','profit']};
const WORK=[[3,6],[4,12],[6,12],[10,15],[12,24],[20,30],[12,4],[8,24],[5,20],[9,18],[15,10],[30,20]];
const pf=x=>nf(x)+'%',bf=x=>nf(x)+' บาท',df=x=>nf(x)+' วัน',yf=x=>nf(x)+' ปี',kf=x=>nf(x)+' กม.';
function genMath1(level){
  switch(rnd(MATH_POOL[level])){
    case 'pct':{const x=rnd([5,10,15,20,25,30,40,50,60,75]),N=20*ri(2,100),a=N*x/100;
      return mkMC(`${x}% ของ ${nf(N)} มีค่าเท่าใด`,a,[N*x/10,N*(100-x)/100,a+x],[[`${x}% คือ ${x} ส่วนใน 100`,'ความหมายของร้อยละ'],[`${nf(N)} × ${x} ÷ 100 = ${nf(a)}`,'ข้อ 1']])}
    case 'disc':{const P=100*ri(2,50),x=rnd([10,15,20,25,30,40]),off=P*x/100,a=P-off;
      return mkMC(`สินค้าราคา ${nf(P)} บาท ลดราคา ${x}% ต้องจ่ายกี่บาท`,a,[off,P-x,P+off],[[`ส่วนลด = ${nf(P)} × ${x} ÷ 100 = ${nf(off)} บาท`,'ร้อยละของราคาเต็ม'],[`จ่ายจริง = ${nf(P)} − ${nf(off)} = ${nf(a)} บาท`,'ราคาเต็มลบส่วนลด']],bf)}
    case 'profit':{const C=20*ri(5,50),p=rnd([10,20,25,30,40,50]),S=C*(100+p)/100;
      return mkMC(`ซื้อของมา ${nf(C)} บาท ขายไป ${nf(S)} บาท ได้กำไรกี่เปอร์เซ็นต์`,p,[(S-C)/S*100,p+10,p/2],[[`กำไร = ${nf(S)} − ${nf(C)} = ${nf(S-C)} บาท`,'ราคาขายลบราคาทุน'],[`คิดเป็นร้อยละของทุน = ${nf(S-C)} ÷ ${nf(C)} × 100 = ${p}%`,'กำไรขาดทุนคิดเทียบกับทุนเสมอ']],pf)}
    case 'speed':{const v=10*ri(4,10),t=rnd([1.5,2,2.5,3,4]),a=v*t;
      return mkMC(`รถวิ่งด้วยความเร็ว ${v} กม./ชม. เป็นเวลา ${t} ชั่วโมง ได้ระยะทางกี่กิโลเมตร`,a,[v/t,v+t,v*(t+1)],[['ระยะทาง = ความเร็ว × เวลา','สูตรความเร็ว'],[`${v} × ${t} = ${nf(a)} กม.`,'ข้อ 1']],kf)}
    case 'avg':{const m=ri(20,80),xs=[0,0,0,0].map(()=>ri(m-20,m+20)),s4=xs.reduce((a,b)=>a+b,0),a=5*m-s4;if(a<=0||a>200)return null;
      return mkMC(`ค่าเฉลี่ยของจำนวน 5 จำนวนเท่ากับ ${m} ถ้า 4 จำนวนแรกคือ ${xs.join(', ')} จำนวนที่ 5 คือเท่าใด`,a,[m,Math.round(s4/4),a+5],[[`ผลรวมทั้ง 5 จำนวน = ${m} × 5 = ${5*m}`,'ค่าเฉลี่ย × จำนวนตัว'],[`ผลรวม 4 จำนวนแรก = ${s4}`,'บวกจำนวนที่โจทย์ให้'],[`จำนวนที่ 5 = ${5*m} − ${s4} = ${a}`,'ข้อ 1 ลบข้อ 2']])}
    case 'ratio':{let a=ri(1,7),b=ri(1,7);if(a===b)b=a+1;const u=10*ri(2,30),T=(a+b)*u,ans=a*u;
      return mkMC(`แบ่งเงิน ${nf(T)} บาท ให้ ก และ ข ในอัตราส่วน ${a} : ${b} ก ได้เงินกี่บาท`,ans,[b*u,T/a,T*a/b],[[`รวมทั้งหมด ${a} + ${b} = ${a+b} ส่วน`,'บวกตัวเลขในอัตราส่วน'],[`1 ส่วน = ${nf(T)} ÷ ${a+b} = ${nf(u)} บาท`,'เงินทั้งหมดหารจำนวนส่วน'],[`ก ได้ ${a} ส่วน = ${a} × ${nf(u)} = ${nf(ans)} บาท`,'ข้อ 2']],bf)}
    case 'work':{const [a,b]=rnd(WORK),ans=a*b/(a+b);
      return mkMC(`ก ทำงานชิ้นหนึ่งเสร็จใน ${a} วัน ข ทำงานเดียวกันเสร็จใน ${b} วัน ถ้าช่วยกันทำจะเสร็จในกี่วัน`,ans,[(a+b)/2,a+b,Math.abs(a-b)],[[`ใน 1 วัน ก ทำได้ 1/${a} ของงาน ข ทำได้ 1/${b} ของงาน`,'ทำเสร็จใน n วัน = วันละ 1/n'],[`ช่วยกัน 1 วันได้ 1/${a} + 1/${b} = ${a+b}/${a*b} ของงาน`,'บวกเศษส่วน'],[`งานทั้งหมดเสร็จใน ${a*b} ÷ ${a+b} = ${nf(ans)} วัน`,'กลับเศษเป็นส่วน']],df)}
    case 'interest':{const P=1000*ri(1,50),r=rnd([2,3,4,5,6,8]),t=rnd([2,3,4,5]),y1=P*r/100,a=y1*t;
      return mkMC(`ฝากเงิน ${nf(P)} บาท ได้ดอกเบี้ยเชิงเดียว ${r}% ต่อปี เป็นเวลา ${t} ปี ได้ดอกเบี้ยรวมกี่บาท`,a,[y1,a+P,a*10],[[`ดอกเบี้ย 1 ปี = ${nf(P)} × ${r} ÷ 100 = ${nf(y1)} บาท`,'ร้อยละต่อปี'],[`${t} ปี = ${nf(y1)} × ${t} = ${nf(a)} บาท`,'ดอกเบี้ยเชิงเดียวคูณจำนวนปีได้เลย']],bf)}
    case 'age':{const S=ri(5,15),k=rnd([2,3]),n=ri(2,10),d=(k-1)*(S+n);
      return mkMC(`ปัจจุบันพ่ออายุมากกว่าลูก ${d} ปี อีก ${n} ปีข้างหน้าพ่อจะมีอายุเป็น ${k} เท่าของลูก ปัจจุบันลูกอายุกี่ปี`,S,[S+n,S+k,S-2],[[`ให้ลูกอายุ x ปี พ่ออายุ x + ${d} ปี`,'โจทย์บอกพ่อมากกว่าลูก '+d+' ปี'],[`อีก ${n} ปี: x + ${d+n} = ${k} × (x + ${n})`,'ทั้งคู่อายุเพิ่ม '+n+' ปีเท่ากัน'],[`x + ${d+n} = ${k}x + ${k*n} ย้ายข้างได้ ${d+n-k*n} = ${k-1}x ดังนั้น x = ${S}`,'แก้สมการ']],yf)}
    case 'updown':{const x=rnd([10,20,25,30,40,50]),up=100+x,cut=up*x/100,fin=up-cut,loss=100-fin;
      return mkMCtext(`ราคาสินค้าเพิ่มขึ้น ${x}% แล้วลดลง ${x}% ราคาสุดท้ายเทียบกับราคาเดิมเป็นอย่างไร`,`ลดลง ${nf(loss)}%`,shuffle(['เท่าเดิม',`ลดลง ${x}%`,`เพิ่มขึ้น ${nf(loss)}%`]),[[`สมมติราคาเดิม 100 บาท เพิ่ม ${x}% เป็น ${up} บาท`,'ใช้ 100 เพื่อให้อ่านเป็นร้อยละได้ทันที'],[`ลด ${x}% ของ ${up} คือ ${nf(cut)} บาท เหลือ ${nf(fin)} บาท`,'การลดคิดจากราคาใหม่ ไม่ใช่ราคาเดิม'],[`เทียบกับ 100 บาท ลดลง ${nf(loss)}%`,'เทียบกับราคาเดิม']])}
    case 'pctpct':{const x=rnd([10,20,25,40,50]),y=rnd([10,20,25,40,50]),N=400*ri(1,10),m=N*y/100,a=m*x/100;
      return mkMC(`${x}% ของ ${y}% ของ ${nf(N)} เท่ากับเท่าใด`,a,[N*(x+y)/100,N*x/100,a*10],[[`${y}% ของ ${nf(N)} = ${nf(m)}`,'คิดจากด้านในสุดก่อน'],[`${x}% ของ ${nf(m)} = ${nf(a)}`,'ข้อ 1']])}
  }
}

/* ---------- เงื่อนไขภาษา ---------- */
const NOUNS=['แมว','นก','ปากกา','ต้นไม้','ครู','ดอกไม้','หนังสือ','ปลา','นักร้อง','ผลไม้','ทหาร','รถ','ดินสอ','นักเรียน','ช้าง','เพชร'];
const LG_TYPES={1:['all'],2:['all','all','some'],3:['all','some','none'],4:['all','some','none'],5:['all','some','none','someNot']};
const say={all:(X,Y)=>`ทุก${X}เป็น${Y}`,some:(X,Y)=>`${X}บางส่วนเป็น${Y}`,none:(X,Y)=>`ไม่มี${X}ใดเป็น${Y}`,someNot:(X,Y)=>`${X}บางส่วนไม่เป็น${Y}`};
function holds(type,x,y,m){
  const both=m.some(r=>(r>>x&1)&&(r>>y&1)),xNotY=m.some(r=>(r>>x&1)&&!(r>>y&1));
  return type==='all'?!xNotY:type==='some'?both:type==='none'?!both:xNotY;
}
function genLogic1(level){
  const ns=level>=4?4:3,names=shuffle([...NOUNS]).slice(0,ns),types=LG_TYPES[level];
  const prem=[];for(let i=0;i<ns-1;i++){const t=rnd(types),flip=Math.random()<.5;prem.push({t,x:flip?i+1:i,y:flip?i:i+1})}
  const R=(1<<ns)-1,valid=[];
  for(let mask=1;mask<(1<<R);mask++){
    const m=[];for(let r=1;r<=R;r++)if(mask>>(r-1)&1)m.push(r);
    let ok=true;for(let s=0;s<ns&&ok;s++)if(!m.some(r=>r>>s&1))ok=false;
    if(ok&&prem.every(p=>holds(p.t,p.x,p.y,m)))valid.push(m);
  }
  if(!valid.length)return null;
  const A=0,Z=ns-1,cands=[];
  for(const [x,y] of [[A,Z],[Z,A]])for(const t of ['all','some','none','someNot']){
    const res=valid.map(m=>holds(t,x,y,m)),st=res.every(Boolean)?'T':res.some(Boolean)?'U':'F';
    cands.push({text:say[t](names[x],names[y]),st});
  }
  const T=cands.filter(c=>c.st==='T'),N=shuffle(cands.filter(c=>c.st!=='T')),NONE='ไม่มีข้อใดสรุปได้แน่นอน';
  if(N.length<3)return null;
  let correct,dist;
  if(T.length){correct=rnd(T).text;dist=N.slice(0,3).map(c=>c.text);if(level>=3&&Math.random()<.3)dist[2]=NONE}
  else{if(level<=2&&Math.random()<.6)return null;correct=NONE;dist=N.slice(0,3).map(c=>c.text)}
  const stem=`กำหนดให้\n${prem.map(p=>'• '+say[p.t](names[p.x],names[p.y])).join('\n')}\nข้อใดสรุปได้ถูกต้องแน่นอน`;
  const lab={T:'จริงเสมอ ไม่ว่าจะวาดวงกลมแบบใด',F:'ขัดกับเงื่อนไข',U:'เป็นไปได้ทั้งจริงและไม่จริง จึงสรุปไม่ได้'};
  const steps=[[`วาดวงกลมแทน ${names.join(', ')} แล้วลองจัดวางทุกแบบที่ไม่ขัดกับเงื่อนไข`,'เงื่อนไขในโจทย์'],
    ...[correct,...dist].filter(t=>t!==NONE).map(t=>{const c0=cands.find(c=>c.text===t);return[`${t}: ${lab[c0.st]}`,'ตรวจกับทุกแบบที่วาดได้']}),
    ...(correct===NONE?[['ไม่มีข้อสรุปใดจริงเสมอ คำตอบจึงเป็น ไม่มีข้อใดสรุปได้แน่นอน','ข้อก่อนหน้า']]:[])];
  return mkMCtext(stem,correct,dist,steps);
}
/* ---------- มิติสัมพันธ์: ระบบวาดรูปเองเป็น SVG จึงรู้คำตอบแน่นอน ไม่ต้องใช้ AI ---------- */
const f1=v=>+(+v).toFixed(1);
const svgBox=(w,h,body,lab)=>`<svg class="qsvg" viewBox="0 0 ${f1(w)} ${f1(h)}" width="${f1(w*1.3)}" height="${f1(h*1.3)}" role="img" aria-label="${lab||'รูปประกอบโจทย์'}">${body}</svg>`;
const poly=(ps,cls)=>`<polygon class="${cls}" points="${ps.map(p=>f1(p[0])+','+f1(p[1])).join(' ')}"/>`;
const seqRow=(parts,arrow)=>parts.join(arrow?'<span class="qarrow" aria-hidden="true">→</span>':'');
/* opts[0] is the right answer {svg,txt,...}; steps may be a function of the shuffled options (to name choices by ก ข ค ง) */
function mkPicMC(stem,svg,opts,steps,desc,extra){
  const o=shuffle(opts.map((x,i)=>({...x,ok:i===0})));
  return{kind:'mc',stem,svg,choices:o.map(x=>x.txt),chSvg:o.map(x=>x.svg),answer:o.findIndex(x=>x.ok),steps:typeof steps==='function'?steps(o):steps,desc,...extra};
}

/* 1) นับลูกบาศก์: กองลูกบาศก์มุมมองสามมิติ (มองจากด้านหน้า-บน) ความสูงลดลงเมื่อเข้าหาผู้มอง จึงเห็นยอดทุกกอง ตอบได้แน่นอน */
const ISO_A=17,ISO_B=9.8,ISO_C=19.6;
function isoMap(gx,mh,k=1,pad=4){const X0=gx*ISO_A*k+pad,Y0=mh*ISO_C*k+pad;return(x,y,z)=>[X0+(y-x)*ISO_A*k,Y0+(x+y)*ISO_B*k-z*ISO_C*k]}
function stackSVG(H){
  const gy=H.length,gx=H[0].length,mh=Math.max(...H.flat()),P=isoMap(gx,mh),cs=[];
  for(let y=0;y<gy;y++)for(let x=0;x<gx;x++)for(let z=0;z<H[y][x];z++)cs.push([x,y,z]);
  cs.sort((p,q)=>p[0]+p[1]+p[2]-q[0]-q[1]-q[2]);
  let b='';for(const [x,y,z] of cs)b+=poly([P(x,y,z+1),P(x+1,y,z+1),P(x+1,y+1,z+1),P(x,y+1,z+1)],'s ft')+poly([P(x+1,y,z),P(x+1,y+1,z),P(x+1,y+1,z+1),P(x+1,y,z+1)],'s fl')+poly([P(x,y+1,z),P(x+1,y+1,z),P(x+1,y+1,z+1),P(x,y+1,z+1)],'s fr');
  return svgBox((gx+gy)*ISO_A+8,(gx+gy)*ISO_B+mh*ISO_C+8,b,'กองลูกบาศก์');
}
function stackTopSVG(H){
  const gy=H.length,gx=H[0].length,k=1.5,P=isoMap(gx,0,k);let b='';
  for(let y=0;y<gy;y++)for(let x=0;x<gx;x++){const [cx,cy]=P(x+.5,y+.5,0);
    if(H[y][x])b+=poly([P(x,y,0),P(x+1,y,0),P(x+1,y+1,0),P(x,y+1,0)],'s ft')+`<text class="tx" x="${f1(cx)}" y="${f1(cy)}">${H[y][x]}</text>`}
  return svgBox((gx+gy)*ISO_A*k+8,(gx+gy)*ISO_B*k+8,b,'จำนวนชั้นของแต่ละกอง มองจากด้านบน');
}
const CUBE_LV={1:[2,2,2],2:[2,3,3],3:[3,3,3],4:[3,4,4],5:[4,4,4]};
function genCubes(level){
  let [gy,gx,mh]=CUBE_LV[level];if(Math.random()<.5)[gy,gx]=[gx,gy];
  const H=[];
  for(let y=0;y<gy;y++){H.push([]);for(let x=0;x<gx;x++){const cap=Math.min(y?H[y-1][x]:mh,x?H[y][x-1]:mh);H[y].push(x+y===0?mh:!cap||(level>=3&&Math.random()<.15)?0:ri(1,cap))}}
  if(H[gy-1].every(v=>!v)||H.every(r=>!r[gx-1]))return null;
  const all=H.flat(),sum=all.reduce((a,b)=>a+b,0);
  let vis=0;for(let y=0;y<gy;y++)for(let x=0;x<gx;x++)for(let z=0;z<H[y][x];z++)
    if(z===H[y][x]-1||x===gx-1||H[y][x+1]<=z||y===gy-1||H[y+1][x]<=z)vis++;
  if(level>=2&&vis===sum)return null;
  const svg=stackSVG(H),ex=stackTopSVG(H),parts=all.filter(Boolean);
  const desc=`กองลูกบาศก์ ${gy}×${gx} ช่อง ความสูงแต่ละกอง (แต่ละแถวคั่นด้วย /): ${H.map(r=>r.join(' ')).join(' / ')} รวม ${sum} ก้อน`;
  const rule='ลูกบาศก์ทุกก้อนขนาดเท่ากัน วางซ้อนกันบนพื้นเรียบ ไม่มีก้อนลอย ก้อนบนต้องมีก้อนรองรับเสมอ';
  const s1=[`มองจากด้านบน นับว่าแต่ละกองซ้อนกันกี่ชั้น (ตัวเลขในรูปเฉลย) ก้อนที่ถูกบังอยู่ข้างใต้หรือข้างหลังต้องนับด้วย`,'ก้อนบนต้องมีก้อนรองรับ'],
    s2=[`รวมทุกกอง ${parts.join(' + ')} = ${sum} ก้อน`,'บวกจำนวนชั้นของทุกกอง'];
  if(level>=3&&Math.random()<.35){
    const full=gx*gy*mh,ans=full-sum;
    return{...mkMC(`จากรูป ต้องเติมลูกบาศก์อีกกี่ก้อน จึงจะเป็นทรงสี่เหลี่ยมมุมฉากขนาด ${gx} × ${gy} ก้อน สูง ${mh} ชั้น\n(${rule})`,ans,[full-vis,sum,ans+gx,ans-1,ans+1],
      [s1,s2,[`ทรงสี่เหลี่ยมเต็ม ${gx} × ${gy} × ${mh} = ${full} ก้อน`,'กว้าง × ยาว × สูง'],[`ต้องเติมอีก ${full} − ${sum} = ${ans} ก้อน`,'ทรงเต็มลบที่มีอยู่']]),svg,exSvg:ex,desc};
  }
  return{...mkMC(`จากรูป มีลูกบาศก์ทั้งหมดกี่ก้อน\n(${rule})`,sum,[vis,sum-1,sum+1,sum+2,sum-2],
    [s1,s2,...(vis<sum?[[`ถ้านับเฉพาะก้อนที่มองเห็นจะได้แค่ประมาณ ${vis} ก้อน ซึ่งขาดก้อนที่ถูกบัง`,'ข้อผิดพลาดที่พบบ่อย']]:[])]),svg,exSvg:ex,desc};
}

/* 2) รูปคลี่กล่อง: พับรูปคลี่จริงด้วยการกลิ้งลูกบาศก์ไปบนรูปคลี่ แล้วตรวจด้านตรงข้าม/มุมมองที่เป็นไปได้ */
const SYM=['<circle cx=".5" cy=".5" r=".2" class="ink"/>','<circle cx=".5" cy=".5" r=".25" class="sym" vector-effect="non-scaling-stroke"/>',
  '<circle cx=".5" cy=".5" r=".27" class="sym" vector-effect="non-scaling-stroke"/><circle cx=".5" cy=".5" r=".09" class="ink"/>',
  '<path d="M.5 .2V.8M.2 .5H.8" class="sym" vector-effect="non-scaling-stroke"/>','<rect x=".3" y=".3" width=".4" height=".4" class="ink"/>',
  '<rect x=".26" y=".26" width=".48" height=".48" class="sym" vector-effect="non-scaling-stroke"/>'];
const SYMN=['วงกลมทึบ','วงกลมโปร่ง','วงกลมซ้อนจุด','เครื่องหมายบวก','สี่เหลี่ยมทึบ','สี่เหลี่ยมโปร่ง'];
const NET_LET=['A','B','C','D','E','F'];
function netList(){
  const L=[];for(let a=0;a<4;a++)for(let b=0;b<4;b++)L.push([[a,0],[0,1],[1,1],[2,1],[3,1],[b,2]]);
  for(const c of [1,2,3])L.push([[0,0],[1,0],[1,1],[2,1],[3,1],[c,2]]);
  L.push([[0,0],[1,0],[1,1],[2,1],[2,2],[3,2]],[[0,0],[1,0],[2,0],[2,1],[3,1],[4,1]]);return L;
}
const NETS=netList();
/* lay the cube on cell 0 and roll it across the net: the face touching each cell is the face that cell becomes.
   The printed side faces out, which is the mirror of rolling, so up/down normals are swapped. x=east y=north z=up */
const NET_NORM={D:[0,0,1],U:[0,0,-1],N:[0,1,0],S:[0,-1,0],E:[1,0,0],W:[-1,0,0]};
const NET_ROLL={E:s=>({...s,D:s.E,E:s.U,U:s.W,W:s.D}),W:s=>({...s,D:s.W,W:s.U,U:s.E,E:s.D}),S:s=>({...s,D:s.S,S:s.U,U:s.N,N:s.D}),N:s=>({...s,D:s.N,N:s.U,U:s.S,S:s.D})};
function foldNet(cells){
  const at=new Map(cells.map((p,i)=>[p[0]+','+p[1],i])),face=cells.map(()=>null),st=[];
  st[0]={D:'D',U:'U',N:'N',S:'S',E:'E',W:'W'};face[0]='D';const q=[0];
  while(q.length){const i=q.shift(),[c,r]=cells[i];
    for(const [d,dx,dy] of [['E',1,0],['W',-1,0],['S',0,1],['N',0,-1]]){const j=at.get((c+dx)+','+(r+dy));if(j==null||face[j])continue;st[j]=NET_ROLL[d](st[i]);face[j]=st[j].D;q.push(j)}}
  return new Set(face).size===6&&face.every(Boolean)?face.map(f=>NET_NORM[f]):null;
}
const vdot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],vcross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],veq=(a,b)=>a.every((v,i)=>v===b[i]);
function netSVG(cells,lab,sym){
  const C=34,W=Math.max(...cells.map(p=>p[0]))+1,H=Math.max(...cells.map(p=>p[1]))+1;let b='';
  cells.forEach(([c,r],i)=>{const x=4+c*C,y=4+r*C;b+=`<rect class="s ft" x="${x}" y="${y}" width="${C}" height="${C}"/>`;
    b+=sym?`<g transform="matrix(${C} 0 0 ${C} ${x} ${y})">${SYM[lab[i]]}</g>`:`<text class="tx big" x="${x+C/2}" y="${y+C/2}">${NET_LET[lab[i]]}</text>`});
  return svgBox(W*C+8,H*C+8,b,'รูปคลี่ของกล่องลูกบาศก์');
}
/* one cube from the front-top corner: top face, left face (normal +x), right face (normal +y) */
function cubeViewSVG(t,l,r){
  const k=2.2,P=isoMap(1,1,k),sub=(a,b)=>[a[0]-b[0],a[1]-b[1]];
  const face=(o,u,v,cls,s)=>{const U=sub(u,o),V=sub(v,o),D=[o[0]+U[0]+V[0],o[1]+U[1]+V[1]];
    return poly([o,u,D,v],'s '+cls)+`<g transform="matrix(${f1(U[0])} ${f1(U[1])} ${f1(V[0])} ${f1(V[1])} ${f1(o[0])} ${f1(o[1])})">${SYM[s]}</g>`};
  return svgBox(2*ISO_A*k+8,2*ISO_B*k+ISO_C*k+8,face(P(0,0,1),P(1,0,1),P(0,1,1),'ft',t)+face(P(1,0,1),P(1,1,1),P(1,0,0),'fl',l)+face(P(0,1,1),P(1,1,1),P(0,1,0),'fr',r),'ลูกบาศก์');
}
function genNet(level){
  let cells=rnd(NETS).map(p=>p.slice());
  const tf=ri(0,7);cells=cells.map(([x,y])=>{let a=tf&4?[y,x]:[x,y];if(tf&1)a[0]=-a[0];if(tf&2)a[1]=-a[1];return a});
  const mx=Math.min(...cells.map(p=>p[0])),my=Math.min(...cells.map(p=>p[1]));cells=cells.map(([x,y])=>[x-mx,y-my]);
  const nrm=foldNet(cells);if(!nrm)return null;
  const lab=shuffle([0,1,2,3,4,5]),normOf=id=>nrm[lab.indexOf(id)],opp=id=>lab[nrm.findIndex(n=>vdot(n,normOf(id))===-1)];
  const pairs=[];for(let i=0;i<6;i++){const o=opp(i);if(i<o)pairs.push([i,o])}
  const view=level>=3&&Math.random()<(level===3?.5:.7);
  if(!view){
    const X=ri(0,5),ans=opp(X),others=shuffle([0,1,2,3,4,5].filter(i=>i!==X&&i!==ans)).slice(0,3);
    return{...mkMCtext(`จากรูปคลี่ เมื่อพับเป็นกล่องลูกบาศก์ (ตัวอักษรอยู่ด้านนอก) ด้านใดอยู่ตรงข้ามกับด้าน ${NET_LET[X]}`,NET_LET[ans],others.map(i=>NET_LET[i]),
      [[`พับรูปคลี่ในใจ: ช่องที่อยู่ติดกับ ${NET_LET[X]} ในรูปคลี่จะเป็นด้านข้างของมัน ส่วนช่องที่อยู่ในแถวเดียวกันโดยเว้นหนึ่งช่องจะอยู่ตรงข้ามกัน`,'หลักการพับรูปคลี่'],
       [`พับแล้วได้คู่ด้านตรงข้าม 3 คู่: ${pairs.map(([a,b])=>NET_LET[a]+'–'+NET_LET[b]).join(', ')}`,'พับครบทุกด้าน'],[`ด้านตรงข้ามกับ ${NET_LET[X]} จึงเป็น ${NET_LET[ans]}`,'ข้อ 2']]),
      svg:netSVG(cells,lab,false),desc:`รูปคลี่ ${cells.map((p,i)=>`${NET_LET[lab[i]]}@(${p})`).join(' ')} คู่ตรงข้าม ${pairs.map(([a,b])=>NET_LET[a]+'–'+NET_LET[b]).join(', ')}`};
  }
  const good=[],mirror=[],opps=[];
  for(let t=0;t<6;t++)for(let l=0;l<6;l++)for(let r=0;r<6;r++){if(t===l||l===r||t===r)continue;
    const T=normOf(t),L=normOf(l),R=normOf(r);
    if(vdot(T,L)||vdot(L,R)||vdot(T,R))opps.push([t,l,r]);else(veq(vcross(L,R),T)?good:mirror).push([t,l,r])}
  const ans=rnd(good),same=mirror.filter(m=>new Set([...m,...ans]).size===3);
  let dist=level>=5?shuffle(same.slice()):level===4?[...shuffle(same).slice(0,2),...shuffle(mirror.filter(m=>!same.includes(m))).slice(0,1)]:[...shuffle(mirror).slice(0,2),rnd(opps)];
  dist=dist.slice(0,3);if(dist.length<3)return null;
  const nm=i=>SYMN[i],why=([t,l,r])=>{const T=normOf(t),L=normOf(l),R=normOf(r);
    if(vdot(T,L)||vdot(L,R)||vdot(T,R)){const [a,b]=vdot(T,L)?[t,l]:vdot(L,R)?[l,r]:[t,r];return `มี${nm(a)}กับ${nm(b)} ซึ่งเป็นด้านตรงข้ามกัน จึงมองเห็นพร้อมกันไม่ได้`}
    return veq(vcross(L,R),T)?`พับได้จริง: บน${nm(t)} ซ้าย${nm(l)} ขวา${nm(r)}`:'สามด้านนี้อยู่ติดกันจริง แต่เรียงกลับด้าน (เป็นภาพสะท้อน) พับจริงไม่ได้'};
  const opt=v=>({svg:cubeViewSVG(...v),txt:`บน ${nm(v[0])} · ซ้าย ${nm(v[1])} · ขวา ${nm(v[2])}`,v});
  return mkPicMC('จากรูปคลี่ เมื่อพับเป็นกล่องลูกบาศก์ (ลวดลายอยู่ด้านนอก) ข้อใดเป็นกล่องที่พับได้จากรูปคลี่นี้',netSVG(cells,lab,true),[opt(ans),...dist.map(opt)],
    o=>[[`หาคู่ด้านตรงข้ามก่อน: ${pairs.map(([a,b])=>nm(a)+' – '+nm(b)).join(', ')} คู่ตรงข้ามจะไม่มีทางเห็นพร้อมกัน`,'พับรูปคลี่'],
      [`ที่มุมที่เห็น 3 ด้าน อ่านวนตามเข็มนาฬิกา บน → ขวา → ซ้าย ต้องได้ ${nm(ans[0])} → ${nm(ans[2])} → ${nm(ans[1])} (หรือเริ่มที่ด้านอื่นแต่วนลำดับเดียวกัน)`,'ลำดับรอบมุมของกล่องที่พับจริง'],
      ...o.map((x,j)=>[`${TH[j]}. ${why(x.v)}`,'ตรวจทีละตัวเลือก'])],
    `รูปคลี่ลวดลาย ${cells.map((p,i)=>`${nm(lab[i])}@(${p})`).join(' ')} คู่ตรงข้าม ${pairs.map(([a,b])=>nm(a)+'–'+nm(b)).join(', ')}`);
}

/* 3) หมุนรูป/ภาพสะท้อน: รูปต่อจากช่องสี่เหลี่ยมที่ไม่สมมาตร ทั้ง 8 แบบ (หมุน 4 × พลิก 2) ต่างกันหมด */
const shpN=c=>{const mx=Math.min(...c.map(p=>p[0])),my=Math.min(...c.map(p=>p[1]));return c.map(([x,y,m])=>[x-mx,y-my,m])};
const shpK=c=>shpN(c).map(p=>p.join(',')).sort().join(';');
const shpRot=c=>c.map(([x,y,m])=>[-y,x,m]),shpFlip=c=>c.map(([x,y,m])=>[-x,y,m]);
const shpRotN=(c,n)=>{for(let i=0;i<n;i++)c=shpRot(c);return shpN(c)};
function shapeSVG(c,mirror){
  c=shpN(c);const C=20,W=Math.max(...c.map(p=>p[0]))+1,H=Math.max(...c.map(p=>p[1]))+1;
  let b=c.map(([x,y,m])=>`<rect class="s ft" x="${4+x*C}" y="${4+y*C}" width="${C}" height="${C}"/>${m?`<circle class="ink" cx="${4+x*C+C/2}" cy="${4+y*C+C/2}" r="5"/>`:''}`).join('');
  if(mirror)b+=`<path class="s ln dash acc" d="M${W*C+16} 2V${H*C+6}"/><text class="tx sm" x="${W*C+16}" y="${H*C+16}">กระจก</text>`;
  return svgBox(W*C+8+(mirror?28:0),H*C+8+(mirror?16:0),b,'รูปโจทย์');
}
function genRot(level){
  const k=[0,4,5,5,6,7][level],mark=level>=4;
  const s=new Set(['0,0']);while(s.size<k){const [x,y]=rnd([...s]).split(',').map(Number),[dx,dy]=rnd([[1,0],[-1,0],[0,1],[0,-1]]);s.add((x+dx)+','+(y+dy))}
  let c=[...s].map(t=>[...t.split(',').map(Number),0]);if(mark)c[ri(0,c.length-1)][2]=1;c=shpN(c);
  if(Math.max(...c.map(p=>p[0]))>3||Math.max(...c.map(p=>p[1]))>3)return null;
  const R=[0,1,2,3].map(n=>shpRotN(c,n)),M=[0,1,2,3].map(n=>shpRotN(shpFlip(c),n));
  if(new Set([...R,...M].map(shpK)).size!==8)return null;
  const RN=['รูปเดิม','หมุนตามเข็ม 90°','หมุน 180°','หมุนทวนเข็ม 90°'],MN=['พลิกซ้าย–ขวา (ภาพในกระจก)','พลิกแล้วหมุนตามเข็ม 90°','พลิกบน–ล่าง','พลิกแล้วหมุนทวนเข็ม 90°'];
  const opR=n=>({svg:shapeSVG(R[n]),txt:RN[n],why:RN[n]}),opM=n=>({svg:shapeSVG(M[n]),txt:MN[n],why:MN[n]+' ไม่ใช่การหมุน'});
  const tip=['หาจุดเด่นของรูป เช่น ส่วนที่ยื่นออกมา'+(mark?' หรือช่องที่มีจุด':'')+' แล้วดูว่าหลังหมุนต้องไปอยู่ตรงไหน','หลักการหมุนรูป'];
  const kind=level>=2&&Math.random()<.3?'mir':level>=3&&Math.random()<.45?'cw':'rot';
  const per=o=>o.map((x,j)=>[`${TH[j]}. ${x.why}`,'ตรวจทีละตัวเลือก']);
  const desc=`รูปจากช่องสี่เหลี่ยม ${c.length} ช่องที่ (หลัก,แถว) ${c.map(p=>`(${p[0]},${p[1]})${p[2]?'มีจุด':''}`).join(' ')}`;
  if(kind==='mir')return mkPicMC('ถ้านำกระจกเงาตั้งไว้ทางขวาของรูป ภาพที่เห็นในกระจกคือข้อใด',shapeSVG(c,true),[{...opM(0),why:'ภาพในกระจก: ซ้ายกลับเป็นขวา บนล่างคงเดิม'},opR(rnd([1,3])),opR(2),{...opM(2),why:'พลิกบน–ล่าง (ภาพสะท้อนในน้ำ) ไม่ใช่ภาพในกระจกที่ตั้งด้านข้าง'}],
    o=>[['กระจกที่ตั้งด้านข้างกลับซ้ายเป็นขวา ส่วนบนกับล่างคงเดิม','หลักภาพสะท้อน'],...per(o)],desc);
  if(kind==='cw'){const cw=Math.random()<.5,a=cw?1:3;
    return mkPicMC(`ถ้าหมุนรูปโจทย์${cw?'ตามเข็มนาฬิกา':'ทวนเข็มนาฬิกา'} 90° จะได้รูปใด`,shapeSVG(c),[opR(a),opR(4-a),opR(2),opM(a)],
      o=>[tip,[`หมุน${cw?'ตามเข็ม':'ทวนเข็ม'} 90°: ส่วนที่อยู่ด้านบนจะไปอยู่ด้าน${cw?'ขวา':'ซ้าย'}`,'ทิศการหมุน'],...per(o)],desc)}
  const pick=shuffle([0,1,2,3]).slice(0,3);
  return mkPicMC('ข้อใดเป็นรูปเดียวกับรูปโจทย์ที่ถูกหมุนบนพื้นราบ (ห้ามพลิกหรือกลับด้าน)',shapeSVG(c),[opR(ri(1,3)),...pick.map(opM)],
    o=>[tip,['ตัวเลือกที่เป็นภาพพลิก หมุนอย่างไรก็ทับรูปเดิมไม่สนิท','ภาพสะท้อนต่างจากการหมุน'],...per(o)],desc);
}

/* 4) พับกระดาษเจาะรู: จำลองการพับครึ่ง/พับทแยง แล้วคลี่ย้อนโดยสะท้อนรูข้ามเส้นพับ */
const PU=16,PN=4;
const FOLD_NM={L:'พับครึ่งจากซ้ายไปขวา',R:'พับครึ่งจากขวาไปซ้าย',T:'พับครึ่งจากบนลงล่าง',B:'พับครึ่งจากล่างขึ้นบน',D1:'พับตามแนวทแยง',D2:'พับตามแนวทแยง'};
function foldRefl(f,[x,y]){const {x0,y0,x1}=f.reg,s=x1-x0;
  return f.t==='L'||f.t==='R'?[2*f.m-x,y]:f.t==='T'||f.t==='B'?[x,2*f.m-y]:f.t==='D1'?[x0+(y-y0),y0+(x-x0)]:[x0+s-(y-y0),y0+s-(x-x0)]}
const holeK=S=>S.map(p=>p.join(',')).sort().join(';');
const holeU=S=>[...new Map(S.map(p=>[p.join(','),p])).values()];
function unfoldH(holes,folds,skip=-1,alt=-1){
  let S=holes.slice();
  for(let i=folds.length-1;i>=0;i--){if(i===skip)continue;let f=folds[i];
    if(i===alt){const {x0,x1,y0,y1}=f.reg;f=f.t==='L'||f.t==='R'?{...f,t:'T',m:(y0+y1)/2}:f.t==='T'||f.t==='B'?{...f,t:'L',m:(x0+x1)/2}:{...f,t:f.t==='D1'?'D2':'D1'}}
    S=holeU([...S,...S.map(p=>foldRefl(f,p))])}
  return S.every(([x,y])=>x>0&&x<PN&&y>0&&y<PN)?S:null;
}
function paperPanel(shape,o){
  const g=(x,y)=>[4+x*PU,4+y*PU];let b=`<rect class="gr dash" x="4" y="4" width="${PN*PU}" height="${PN*PU}"/>`;
  b+=poly(shape.map(p=>g(...p)),'s pp');
  if(o.grid){const xs=shape.map(p=>p[0]),ys=shape.map(p=>p[1]),[a0,a1,b0,b1]=[Math.min(...xs),Math.max(...xs),Math.min(...ys),Math.max(...ys)];if(shape.length===4){for(let i=a0+1;i<a1;i++)b+=`<path class="gr" d="M${4+i*PU} ${4+b0*PU}V${4+b1*PU}"/>`;for(let j=b0+1;j<b1;j++)b+=`<path class="gr" d="M${4+a0*PU} ${4+j*PU}H${4+a1*PU}"/>`}b+=poly(shape.map(p=>g(...p)),'s ln')}
  if(o.line){const [a,c]=o.line.map(p=>g(...p));b+=`<path class="s ln dash acc" d="M${f1(a[0])} ${f1(a[1])}L${f1(c[0])} ${f1(c[1])}"/>`}
  if(o.arrow){const [s,e]=o.arrow.map(p=>g(...p)),dx=e[0]-s[0],dy=e[1]-s[1],cx=(s[0]+e[0])/2-dy*.45,cy=(s[1]+e[1])/2+dx*.45-0;
    const tx=e[0]-cx,ty=e[1]-cy,L=Math.hypot(tx,ty)||1,ux=tx/L,uy=ty/L;
    b+=`<path class="s ln acc" d="M${f1(s[0])} ${f1(s[1])}Q${f1(cx)} ${f1(cy)} ${f1(e[0])} ${f1(e[1])}"/>`+poly([[e[0],e[1]],[e[0]-ux*7-uy*4,e[1]-uy*7+ux*4],[e[0]-ux*7+uy*4,e[1]-uy*7-ux*4]],'accf')}
  for(const [x,y] of o.holes||[]){const [cx,cy]=g(x,y);b+=`<circle class="ink" cx="${f1(cx)}" cy="${f1(cy)}" r="${PU*.27}"/>`}
  return svgBox(PN*PU+8,PN*PU+8,b,o.lab||'กระดาษ');
}
const rectP=({x0,x1,y0,y1})=>[[x0,y0],[x1,y0],[x1,y1],[x0,y1]];
function genPaper(level){
  const nF={1:1,2:2,3:2,4:3,5:3}[level],diag=level===5||(level===4&&Math.random()<.3);
  let reg={x0:0,x1:PN,y0:0,y1:PN};const folds=[];let tri=null;
  for(let i=0;i<nF;i++){
    const w=reg.x1-reg.x0,h=reg.y1-reg.y0;
    if(diag&&i===nF-1){if(w!==h||w<2)return null;
      const t=rnd(['D1','D2']),keepA=Math.random()<.5,{x0,y0,x1,y1}=reg,s=w;
      /* kept triangle and a point in each half for the fold arrow */
      const T=t==='D1'?(keepA?[[x0,y0],[x1,y0],[x1,y1]]:[[x0,y0],[x0,y1],[x1,y1]]):(keepA?[[x1,y0],[x1,y1],[x0,y1]]:[[x0,y0],[x1,y0],[x0,y1]]);
      const inK=t==='D1'?(keepA?(x,y)=>x-x0>y-y0:(x,y)=>x-x0<y-y0):(keepA?(x,y)=>(x-x0)+(y-y0)>s:(x,y)=>(x-x0)+(y-y0)<s);
      const cen=T.reduce((a,p)=>[a[0]+p[0]/3,a[1]+p[1]/3],[0,0]),f={t,reg:{...reg},keep:inK,shape:T};f.from=foldRefl(f,cen);f.to=cen;
      f.line=t==='D1'?[[x0,y0],[x1,y1]]:[[x1,y0],[x0,y1]];folds.push(f);tri=T;break}
    const opts=[];if(w>=2)opts.push('L','R');if(h>=2)opts.push('T','B');
    let t=rnd(opts);if(diag&&nF===3&&i===1){const ax=folds[0].t==='L'||folds[0].t==='R';t=rnd(ax?['T','B']:['L','R'])}
    const v=t==='L'||t==='R',m=v?(reg.x0+reg.x1)/2:(reg.y0+reg.y1)/2,nr={...reg};
    if(t==='L')nr.x0=m;if(t==='R')nr.x1=m;if(t==='T')nr.y0=m;if(t==='B')nr.y1=m;
    const cm=[(nr.x0+nr.x1)/2,(nr.y0+nr.y1)/2],f={t,m,reg:{...reg}};f.to=cm;f.from=foldRefl(f,cm);
    f.line=v?[[m,reg.y0],[m,reg.y1]]:[[reg.x0,m],[reg.x1,m]];folds.push(f);reg=nr;
  }
  const last=folds[folds.length-1],shape=tri||rectP(reg);
  const cand=[];for(let x=reg.x0;x<reg.x1;x++)for(let y=reg.y0;y<reg.y1;y++){const p=[x+.5,y+.5];if(!tri||last.keep(...p))cand.push(p)}
  if(!cand.length)return null;
  const holes=shuffle(cand).slice(0,level>=3&&cand.length>1&&Math.random()<.5?2:1);
  const ans=unfoldH(holes,folds);if(!ans)return null;
  const cands=[];
  for(let i=0;i<folds.length;i++){cands.push({S:unfoldH(holes,folds,i),same:false});cands.push({S:unfoldH(holes,folds,-1,i),same:true})}
  const {x0,x1,y0,y1}=reg;cands.push({S:unfoldH(holes.map(([x,y])=>tri?[x,y]:[x0+x1-x,y]),folds),same:true},{S:unfoldH(holes.map(([x,y])=>tri?[x,y]:[x,y0+y1-y]),folds),same:true});
  for(let g=0;g<8;g++){const S=ans.map(p=>p.slice()),i=ri(0,S.length-1),[dx,dy]=rnd([[1,0],[-1,0],[0,1],[0,-1]]);S[i]=[S[i][0]+dx,S[i][1]+dy];
    if(S[i][0]>0&&S[i][0]<PN&&S[i][1]>0&&S[i][1]<PN&&holeU(S).length===S.length)cands.push({S,same:true,rnd:true})}
  const seen=new Set([holeK(ans)]),dist=[];
  const order=shuffle(cands.filter(c=>c.S)).sort((a,b)=>level>=3?(b.same-a.same)||(!!a.rnd-!!b.rnd):(!!a.rnd-!!b.rnd));
  for(const c of order){const k=holeK(c.S);if(!seen.has(k)&&dist.length<3){seen.add(k);dist.push(c.S)}}
  if(dist.length<3)return null;
  const panels=folds.map(f=>paperPanel(rectP(f.reg),{line:f.line,arrow:[f.from,f.to],lab:FOLD_NM[f.t]}));
  panels.push(paperPanel(shape,{holes,grid:true,lab:'เจาะรู'}));
  const hd=S=>S.slice().sort((a,b)=>a[1]-b[1]||a[0]-b[0]).map(([x,y])=>`(${y+.5},${x+.5})`).join(' ');
  const opt=S=>({svg:paperPanel(rectP({x0:0,x1:PN,y0:0,y1:PN}),{holes:S,grid:true,lab:`กระดาษคลี่ มีรู ${S.length} รู`}),txt:`รู ${S.length} รู ที่ (แถว,หลัก) ${hd(S)}`});
  let cnt=holes.length;const un=[];for(let i=folds.length-1;i>=0;i--){const n2=unfoldH(holes,folds.slice(i)).length;un.push([`คลี่การพับครั้งที่ ${i+1} (${FOLD_NM[folds[i].t]}): รู ${cnt} → ${n2} รู`,'สะท้อนรูข้ามเส้นพับ']);cnt=n2}
  return mkPicMC(`พับกระดาษสี่เหลี่ยมจัตุรัสตามลำดับในรูป (เส้นประคือแนวพับ ลูกศรคือทิศที่พับ) แล้วเจาะรูทะลุทุกชั้นตรงตำแหน่งที่แสดงในรูปสุดท้าย เมื่อคลี่ออกจะได้รูปใด`,
    seqRow(panels,true),[opt(ans),...dist.map(opt)],
    o=>[['คลี่ย้อนจากการพับครั้งสุดท้ายไปครั้งแรก ทุกครั้งที่คลี่ รูจะเพิ่มเป็นสองเท่าโดยสะท้อนข้ามเส้นพับเหมือนกระจก','หลักการพับกระดาษ'],...un,
      [`คลี่ครบได้รู ${ans.length} รู ตรงกับตัวเลือก ${TH[o.findIndex(x=>x.ok)]}`,'ข้อก่อนหน้า']],
    `กระดาษ 4×4 ช่อง พับตามลำดับ: ${folds.map(f=>FOLD_NM[f.t]).join(' แล้ว ')} เจาะที่ (แถว,หลัก) ${hd(holes)} คลี่แล้วได้รูที่ ${hd(ans)}`);
}

/* 5) อนุกรมรูปภาพ: จุดเดินรอบกรอบ ลูกศรหมุน และช่องแรเงาเลื่อน แต่ละอย่างมีกฎของตัวเอง */
const SQ_POS=[[11,11],[32,11],[53,11],[53,32],[53,53],[32,53],[11,53],[11,32]];
const SQ_POSN=['มุมซ้ายบน','กลางขอบบน','มุมขวาบน','กลางขอบขวา','มุมขวาล่าง','กลางขอบล่าง','มุมซ้ายล่าง','กลางขอบซ้าย'];
const SQ_DIRN=['ขึ้น','เฉียงขวาบน','ขวา','เฉียงขวาล่าง','ลง','เฉียงซ้ายล่าง','ซ้าย','เฉียงซ้ายบน'],SQ_QN=['ซ้ายบน','ขวาบน','ขวาล่าง','ซ้ายล่าง'];
const md=(v,n)=>((v%n)+n)%n;
function frameSVG(st,q){
  let b='';
  if(q)return svgBox(64,64,`<rect class="s ln dash" x="3" y="3" width="58" height="58"/><text class="tx big" x="32" y="33">?</text>`,'รูปที่ต้องหา');
  if(st.c!=null){const [x,y]=[[3,3],[32,3],[32,32],[3,32]][st.c];b+=`<rect class="shade" x="${x}" y="${y}" width="29" height="29"/>`}
  b+=`<rect class="s ln" x="3" y="3" width="58" height="58"/>`;
  if(st.b!=null)b+=`<g transform="rotate(${45*st.b} 32 32)"><path class="s ln" d="M32 46V22"/><path class="ink" d="M32 15l-6 9h12z"/></g>`;
  if(st.a!=null){const [x,y]=SQ_POS[st.a];b+=`<circle class="ink" cx="${x}" cy="${y}" r="5.5"/>`}
  return svgBox(64,64,b,'รูปในอนุกรม');
}
function genSeq(level){
  const useA=level>=2||Math.random()<.5,useB=level>=2||!useA,useC=level>=4;
  const da=rnd(level<=2?[1,-1,2]:level===3?[1,-1,2,-2]:[1,2,-1,3,-3]),db=rnd(level===1?[2,-2]:level===2?[2,-2,1]:[1,-1,2,-2,3]),dc=rnd([1,-1]),grow=level===5&&Math.random()<.6;
  const a0=ri(0,7),b0=ri(0,7),c0=ri(0,3);
  const A=i=>md(a0+(grow?Math.sign(da)*i*(i+1)/2:da*i),8),B=i=>md(b0+db*i,8),C=i=>md(c0+dc*i,4);
  const st=i=>({a:useA?A(i):null,b:useB?B(i):null,c:useC?C(i):null}),ans=st(4);
  const key=s=>[s.a,s.b,s.c].join(','),alts=[];
  if(useA)for(const v of [A(3),A(5),md(ans.a+4,8),md(a0-(A(4)-a0),8),md(ans.a+1,8),md(ans.a-1,8)])alts.push({...ans,a:v});
  if(useB)for(const v of [B(3),B(5),md(ans.b+4,8),md(b0-db*4,8),md(ans.b+1,8),md(ans.b-1,8)])alts.push({...ans,b:v});
  if(useC)for(const v of [C(3),md(ans.c+2,4),md(ans.c+1,4)])alts.push({...ans,c:v});
  if(level<=2&&useA&&useB)for(let g=0;g<3;g++)alts.push({...ans,a:md(ans.a+rnd([1,-1,4]),8),b:md(ans.b+rnd([2,-2,4]),8)});
  const seen=new Set([key(ans)]),dist=[];for(const s of shuffle(alts)){const k=key(s);if(!seen.has(k)&&dist.length<3){seen.add(k);dist.push(s)}}
  if(dist.length<3)return null;
  const dir=v=>v>0?'ตามเข็มนาฬิกา':'ทวนเข็มนาฬิกา',rules=[];
  if(useA)rules.push([grow?`จุดดำเดิน${dir(da)}รอบกรอบ ครั้งละ 1, 2, 3, 4 ตำแหน่ง (ก้าวเพิ่มขึ้นทีละ 1 นับมุมและกึ่งกลางขอบรวม 8 ตำแหน่ง)`:`จุดดำเดิน${dir(da)}รอบกรอบ ครั้งละ ${Math.abs(da)} ตำแหน่ง (นับมุมและกึ่งกลางขอบรวม 8 ตำแหน่ง)`,'ดูตำแหน่งจุดในรูปที่ติดกัน']);
  if(useB)rules.push([`ลูกศรหมุน${dir(db)} ครั้งละ ${45*Math.abs(db)}°`,'ดูทิศลูกศรในรูปที่ติดกัน']);
  if(useC)rules.push([`ช่องแรเงาเลื่อน${dir(dc)} ครั้งละ 1 ช่อง`,'ดูช่องแรเงาในรูปที่ติดกัน']);
  const say=s=>[useA&&`จุดที่${SQ_POSN[s.a]}`,useB&&`ลูกศรชี้${SQ_DIRN[s.b]}`,useC&&`แรเงาช่อง${SQ_QN[s.c]}`].filter(Boolean).join(' · ');
  const opt=s=>({svg:frameSVG(s),txt:say(s)});
  return mkPicMC('รูปใดควรเป็นรูปถัดไปของอนุกรมนี้',seqRow([0,1,2,3].map(i=>frameSVG(st(i))).concat(frameSVG(null,true))),[opt(ans),...dist.map(opt)],
    o=>[...rules,[`รูปถัดไปจึงเป็น ${say(ans)} ตรงกับตัวเลือก ${TH[o.findIndex(x=>x.ok)]}`,'ใช้กฎทุกข้อพร้อมกัน']],
    `อนุกรม 4 รูป: ${[0,1,2,3].map(i=>say(st(i))).join(' | ')} | ?`);
}
const SPA_GEN={cube:genCubes,net:genNet,rot:genRot,paper:genPaper,seq:genSeq};
function genSpatial(level,n){
  const order=shuffle(Object.keys(SPA_GEN));let i=0;
  return many(()=>{const k=order[i++%order.length];for(let g=0;g<30;g++){const q=SPA_GEN[k](level);if(q)return q}return null},n);
}
const LOCAL={series:(l,n)=>many(()=>genSeries1(l),n),math:(l,n)=>many(()=>genMath1(l),n),logic:(l,n)=>many(()=>genLogic1(l),n),spatial:genSpatial,dir:(l,n)=>genDir(l,n),data:(l,n)=>genData(l,n)};
