/* visuals.js — ระดับไม่จำกัด ตาราง/กราฟ/แผนที่ ทิศทาง การวิเคราะห์ข้อมูล */
/* ---------- ระดับไม่จำกัด: ระดับของผู้สอบแปลงเป็นความยากของตัวสร้างโจทย์ (1–5) ----------
   ระดับ 1 ง่าย · ระดับ 2 ขึ้นไปยากขึ้นชัดเจน · ตั้งแต่ระดับ 4 ใช้โจทย์ขั้นยากสุดเป็นหลัก ส่วน AI ยากขึ้นต่อไปไม่สิ้นสุด */
function levelTxt(l){
  l=Math.max(1,Math.round(+l||1));
  return {1:'ง่าย พื้นฐาน 1 ขั้นตอน',2:'ปานกลาง 2–3 ขั้นตอน มีตัวลวงที่ต้องคิด',3:'ระดับข้อสอบจริง (ก.พ./ธ.ก.ส.) หลายขั้นตอน',4:'ยาก หลายขั้นตอน ผสมหลายหลักการ ตัวลวงแนบเนียน',5:'ยากมาก ระดับแข่งขันสูง ต้องวิเคราะห์ลึก'}[l]
    ||`ยากกว่าระดับ 5 ขึ้นไปอีก (ระดับ ${l}) โจทย์ซับซ้อน 3–5 ขั้นตอน ผสมหลายหลักการในข้อเดียว ตัวลวงใกล้เคียงคำตอบมาก`;
}
function tierMix(level,n){
  const w=level<=1?[[1,1]]:level===2?[[2,1],[3,2]]:level===3?[[3,1],[4,2]]:level===4?[[4,1],[5,2]]:[[5,1]];
  const tot=w.reduce((a,x)=>a+x[1],0),out=w.map(([t,x])=>({t,k:Math.floor(n*x/tot)}));
  let left=n-out.reduce((a,x)=>a+x.k,0);for(let i=out.length-1;left>0;i=(i+out.length-1)%out.length){out[i].k++;left--}
  return out.filter(x=>x.k>0);
}
function localItems(s,level,n){
  const gen=(t,k)=>s.id==='ineq'?genIneq2(t,k):LOCAL[s.id](t,k);
  return shuffle(tierMix(level,n).flatMap(({t,k})=>gen(t,k))).slice(0,n).map(q=>({...q,sub:s.id,subName:s.name}));
}

/* ---------- ตาราง กราฟ แผนที่: วาดด้วยโค้ดจากข้อมูล (viz) จึงตรงกับเฉลยเสมอ ---------- */
const VZC=['var(--accent)','var(--mark)','var(--ok)','var(--bad)','var(--unk)','var(--ink-2)'];
const vnum=x=>{const n=+x;return isFinite(n)?n:0};
const vfmt=x=>{const n=+x;return isFinite(n)?(Math.abs(n)>=1000?n.toLocaleString('en-US'):String(Math.round(n*100)/100)):esc(String(x))};
function cleanViz(v){
  if(!v||typeof v!=='object')return null;
  const S=x=>String(x==null?'':x).slice(0,60),A=(x,m)=>Array.isArray(x)?x.slice(0,m):[];
  const t=String(v.type||'');
  if(t==='table'){const headers=A(v.headers,8).map(S),rows=A(v.rows,14).map(r=>A(r,8).map(S));return headers.length&&rows.length?{type:t,title:S(v.title),headers,rows}:null}
  if(t==='bar'||t==='line'){const labels=A(v.labels,12).map(S),series=A(v.series,3).map(s=>({name:S(s&&s.name),values:A(s&&s.values,12).map(vnum)})).filter(s=>s.values.length);
    return labels.length&&series.length?{type:t,title:S(v.title),labels,series,unit:S(v.unit)}:null}
  if(t==='pie'){const labels=A(v.labels,7).map(S),values=A(v.values,7).map(vnum);return labels.length===values.length&&labels.length?{type:t,title:S(v.title),labels,values,unit:S(v.unit)}:null}
  if(t==='map'){const points=A(v.points,10).map(p=>({name:S(p&&p.name),x:vnum(p&&p.x),y:vnum(p&&p.y)})).filter(p=>p.name);
    const path=A(v.path,12).map(p=>[vnum(p&&p[0]),vnum(p&&p[1])]);return points.length||path.length?{type:t,title:S(v.title),points,path,unit:S(v.unit)}:null}
  return null;
}
function renderViz(v){
  if(!v)return '';
  const cap=v.title?`<figcaption>${esc(v.title)}</figcaption>`:'';
  if(v.type==='table')return `<figure class="vz">${cap}<div class="vzt"><table><thead><tr>${v.headers.map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${v.rows.map(r=>`<tr>${r.map((c,i)=>`<td${i&&/^[-\d.,%]+$/.test(c)?' class="n"':''}>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div></figure>`;
  if(v.type==='bar'||v.type==='line'){
    const W=380,H=230,L=46,B=34,T=14,Rr=10,all=v.series.flatMap(s=>s.values),mx=Math.max(1,...all),mn=Math.min(0,...all);
    const step=(()=>{const r=(mx-mn)/4,p=10**Math.floor(Math.log10(r||1));return [1,2,2.5,5,10].map(k=>k*p).find(s=>s>=r)||r})();
    const top=Math.ceil(mx/step)*step,bot=Math.floor(mn/step)*step,y=val=>T+(H-T-B)*(1-(val-bot)/((top-bot)||1)),n=v.labels.length,cw=(W-L-Rr)/n;
    let g='';for(let k=bot;k<=top+1e-9;k+=step)g+=`<line x1="${L}" x2="${W-Rr}" y1="${y(k)}" y2="${y(k)}" class="vzg"/><text x="${L-6}" y="${y(k)+4}" text-anchor="end" class="vzl">${vfmt(k)}</text>`;
    v.labels.forEach((lb,i)=>g+=`<text x="${L+cw*i+cw/2}" y="${H-B+18}" text-anchor="middle" class="vzl">${esc(lb)}</text>`);
    if(v.type==='bar'){const sw=cw*.7/v.series.length;v.series.forEach((s,si)=>s.values.forEach((val,i)=>{const x=L+cw*i+cw*.15+sw*si,y0=y(Math.max(0,val)),h=Math.abs(y(val)-y(0));
      g+=`<rect x="${x}" y="${y0}" width="${sw-2}" height="${Math.max(1,h)}" fill="${VZC[si]}"/><text x="${x+(sw-2)/2}" y="${y0-4}" text-anchor="middle" class="vzv">${vfmt(val)}</text>`}))}
    else v.series.forEach((s,si)=>{const pts=s.values.map((val,i)=>[L+cw*i+cw/2,y(val)]);
      g+=`<polyline points="${pts.map(p=>p.join(',')).join(' ')}" fill="none" stroke="${VZC[si]}" stroke-width="2.5"/>`+pts.map((p,i)=>`<circle cx="${p[0]}" cy="${p[1]}" r="3.5" fill="${VZC[si]}"/><text x="${p[0]}" y="${p[1]-8}" text-anchor="middle" class="vzv">${vfmt(s.values[i])}</text>`).join('')});
    const leg=v.series.length>1?`<div class="vzleg">${v.series.map((s,si)=>`<span><i style="background:${VZC[si]}"></i>${esc(s.name)}</span>`).join('')}</div>`:'';
    return `<figure class="vz">${cap}<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(v.title||'กราฟ')}">${g}<line x1="${L}" x2="${W-Rr}" y1="${y(0)}" y2="${y(0)}" class="vza"/></svg>${leg}${v.unit?`<p class="vzu">หน่วย: ${esc(v.unit)}</p>`:''}</figure>`;
  }
  if(v.type==='pie'){
    const tot=v.values.reduce((a,b)=>a+Math.max(0,b),0)||1,cx=110,cy=110,r=95;let a0=-Math.PI/2,g='';
    v.values.forEach((val,i)=>{const a1=a0+2*Math.PI*Math.max(0,val)/tot,lg=a1-a0>Math.PI?1:0;
      g+=v.values.length===1?`<circle cx="${cx}" cy="${cy}" r="${r}" fill="${VZC[i%VZC.length]}"/>`:`<path d="M${cx},${cy} L${cx+r*Math.cos(a0)},${cy+r*Math.sin(a0)} A${r},${r} 0 ${lg} 1 ${cx+r*Math.cos(a1)},${cy+r*Math.sin(a1)} Z" fill="${VZC[i%VZC.length]}" stroke="var(--sheet)" stroke-width="2"/>`;a0=a1});
    return `<figure class="vz">${cap}<div class="vzpie"><svg viewBox="0 0 220 220" role="img" aria-label="${esc(v.title||'แผนภูมิวงกลม')}">${g}</svg><div class="vzleg col">${v.labels.map((lb,i)=>`<span><i style="background:${VZC[i%VZC.length]}"></i>${esc(lb)} ${vfmt(v.values[i])}${esc(v.unit||'')}</span>`).join('')}</div></div></figure>`;
  }
  if(v.type==='map'){
    const xs=[...v.points.map(p=>p.x),...v.path.map(p=>p[0]),0],ys=[...v.points.map(p=>p.y),...v.path.map(p=>p[1]),0];
    const x0=Math.min(...xs)-1,x1=Math.max(...xs)+1,y0=Math.min(...ys)-1,y1=Math.max(...ys)+1,sp=Math.max(x1-x0,y1-y0),S=300/sp,W=(x1-x0)*S+76,H=(y1-y0)*S+40;
    const X=x=>20+(x-x0)*S,Y=y=>20+(y1-y)*S;let g='';
    for(let x=Math.ceil(x0);x<=x1;x++)g+=`<line x1="${X(x)}" x2="${X(x)}" y1="${Y(y1)}" y2="${Y(y0)}" class="vzg"/>`;
    for(let y=Math.ceil(y0);y<=y1;y++)g+=`<line x1="${X(x0)}" x2="${X(x1)}" y1="${Y(y)}" y2="${Y(y)}" class="vzg"/>`;
    if(v.path.length>1){g+=`<polyline points="${v.path.map(p=>X(p[0])+','+Y(p[1])).join(' ')}" fill="none" stroke="var(--mark)" stroke-width="3" marker-end="url(#vzarr)"/>`;
      g+=`<circle cx="${X(v.path[0][0])}" cy="${Y(v.path[0][1])}" r="5" fill="var(--ok)"/>`}
    v.points.forEach(p=>g+=`<circle cx="${X(p.x)}" cy="${Y(p.y)}" r="6" fill="var(--accent)"/><text x="${X(p.x)}" y="${Y(p.y)-11}" text-anchor="middle" class="vzp">${esc(p.name)}</text>`);
    g+=`<g transform="translate(${W-24},34)"><path d="M0,-18 L7,4 L0,0 L-7,4 Z" fill="var(--bad)"/><text y="16" text-anchor="middle" class="vzl">N</text></g>`;
    return `<figure class="vz">${cap}<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(v.title||'แผนที่')}"><defs><marker id="vzarr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="var(--mark)"/></marker></defs>${g}</svg>${v.unit?`<p class="vzu">ช่องตาราง 1 ช่อง = ${esc(v.unit)} · ทิศเหนืออยู่ด้านบน</p>`:'<p class="vzu">ทิศเหนืออยู่ด้านบน</p>'}</figure>`;
  }
  return '';
}
const VIZ_RULE=`- ถ้าโจทย์ต้องอ่านข้อมูลจากตาราง กราฟ หรือแผนที่ ให้ใส่ช่อง viz (ระบบวาดให้ตามข้อมูลจริง) และห้ามพิมพ์ข้อมูลชุดเดียวกันซ้ำใน stem
  ตาราง: {"type":"table","title":"ชื่อ","headers":["หัวคอลัมน์"],"rows":[["ค่า"]]}
  กราฟแท่ง/เส้น: {"type":"bar" หรือ "line","title":"ชื่อ","labels":["ป้ายแกน"],"series":[{"name":"ชุดข้อมูล","values":[ตัวเลข]}],"unit":"หน่วย"}
  วงกลม: {"type":"pie","title":"ชื่อ","labels":["ส่วน"],"values":[ตัวเลข],"unit":"%"}
  แผนที่ทิศ: {"type":"map","points":[{"name":"ชื่อสถานที่","x":0,"y":0}],"unit":"1 กม."} (x เพิ่ม=ไปทางตะวันออก, y เพิ่ม=ไปทางเหนือ)
  ข้อที่ไม่ต้องใช้ให้ viz เป็น null และคำตอบต้องคำนวณจากข้อมูลใน viz ได้ถูกต้องแน่นอน`;

/* ---------- ทิศทาง (วาดแผนที่เอง เฉลยคำนวณ) ---------- */
const DIR8=['เหนือ','ตะวันออกเฉียงเหนือ','ตะวันออก','ตะวันออกเฉียงใต้','ใต้','ตะวันตกเฉียงใต้','ตะวันตก','ตะวันตกเฉียงเหนือ'];
const dirOf=(dx,dy)=>{if(!dx&&!dy)return null;const a=(Math.atan2(dx,dy)*180/Math.PI+360)%360;return Math.round(a/45)%8};
const PLACES=['บ้าน','โรงเรียน','ตลาด','วัด','ธนาคาร','ไปรษณีย์','สถานีตำรวจ','โรงพยาบาล','สวนสาธารณะ','ที่ว่าการอำเภอ'];
const STEP_V=[[0,1],[1,1],[1,0],[1,-1],[0,-1],[-1,-1],[-1,0],[-1,1]];
function dirDist(ans){const o=[(ans+4)%8,(ans+1)%8,(ans+7)%8,(ans+2)%8,(ans+6)%8,(ans+3)%8];return mkMCtext('',DIR8[ans],o.map(i=>DIR8[i]),[])}
function genDir1(t){
  const kind=rnd(t<=1?['map','walk','face']:t<=3?['map','walk','walk','face']:['map','walk','walk','face']);
  if(kind==='face'){
    let h=ri(0,7);const start=h,nT=t<=1?1:t<=2?2:t<=3?3:4,acts=[],steps=[];
    for(let i=0;i<nT;i++){const deg=t<=2?rnd([90,180]):rnd([45,90,135,180]),cw=Math.random()<.5,d=deg/45*(cw?1:-1);h=(h+d+8)%8;
      acts.push(`หมุน${cw?'ตามเข็มนาฬิกา':'ทวนเข็มนาฬิกา'} ${deg} องศา`);steps.push([`${acts[i]} → หันไปทาง${DIR8[h]}`,`ครั้งที่ ${i+1} (45° = 1 ช่องของทิศ 8 ทิศ)`])}
    const q=dirDist(h);q.stem=`นายเอยืนหันหน้าไปทางทิศ${DIR8[start]} แล้ว${acts.join(' จากนั้น')}\nตอนนี้นายเอหันหน้าไปทางทิศใด`;
    q.steps=[[`เริ่มหันไปทางทิศ${DIR8[start]}`,'โจทย์บอก'],...steps];q.choices=q.choices.map(c=>'ทิศ'+c);q.expViz=null;return q;
  }
  if(kind==='map'){
    const names=shuffle(PLACES.slice()).slice(0,t<=1?3:t<=3?4:5),pts=[];
    for(const nm of names){for(let g=0;g<40;g++){const p={name:nm,x:ri(0,8),y:ri(0,7)};if(!pts.some(o=>Math.abs(o.x-p.x)<3&&Math.abs(o.y-p.y)<2)){pts.push(p);break}}}
    let A,Bp,d;for(let g=0;g<60;g++){[A,Bp]=shuffle(pts.slice()).slice(0,2);const dx=A.x-Bp.x,dy=A.y-Bp.y;if((dx===0||dy===0||Math.abs(dx)===Math.abs(dy))&&(dx||dy)){d=dirOf(dx,dy);break}}
    if(d==null)return null;
    const askDist=t>=3&&Math.random()<.5;
    if(askDist){
      const trip=[[3,4,5],[6,8,10],[5,12,13]],[a,b,c]=rnd(t>=4?trip:trip.slice(0,1)),S0=pts[0];
      const P2={name:names[1],x:S0.x+a,y:S0.y+(Math.random()<.5?b:-b)};if(Math.abs(P2.y)>14)return null;pts[1]=P2;
      const viz={type:'map',title:'แผนที่',points:pts,path:[],unit:'1 กม.'};
      const q=mkMC(`จากแผนที่ ระยะทางเป็นเส้นตรงจาก${S0.name}ถึง${P2.name}เท่ากับกี่กิโลเมตร`,c,[a+b,c+1,Math.max(a,b),c-1],[[`${P2.name}อยู่ห่างไปทางตะวันออก ${a} ช่อง และ${P2.y>S0.y?'เหนือ':'ใต้'} ${b} ช่อง`,'นับช่องบนแผนที่'],[`ระยะตรง = √(${a}² + ${b}²) = √${a*a+b*b} = ${c} กม.`,'ทฤษฎีบทพีทาโกรัส']],x=>x+' กม.');
      q.viz=viz;return q;
    }
    const q=dirDist(d);q.viz={type:'map',title:'แผนที่',points:pts,path:[],unit:t>=3?'1 กม.':''};
    q.stem=`จากแผนที่ ${A.name}อยู่ทางทิศใดของ${Bp.name}`;q.choices=q.choices.map(c=>'ทิศ'+c);
    q.steps=[[`ยืนที่${Bp.name}แล้วมองไปหา${A.name}: ไปทาง${A.x>Bp.x?'ขวา (ตะวันออก)':A.x<Bp.x?'ซ้าย (ตะวันตก)':'ไม่ไปซ้ายขวา'} ${Math.abs(A.x-Bp.x)} ช่อง และ${A.y>Bp.y?'ขึ้น (เหนือ)':A.y<Bp.y?'ลง (ใต้)':'ไม่ขึ้นลง'} ${Math.abs(A.y-Bp.y)} ช่อง`,'นับช่องบนแผนที่ ทิศเหนืออยู่ด้านบน'],
      [`จึงอยู่ทางทิศ${DIR8[d]}`,'รวมสองทิศ']];
    return q;
  }
  /* walk: absolute legs (tier 1) or relative turns (tier 2+) */
  const legs=t<=1?2:t<=2?3:t<=3?4:5;let h=rnd([0,2,4,6]),x=0,y=0;const path=[[0,0]],txt=[],steps=[];
  for(let i=0;i<legs;i++){
    if(i){const turn=rnd([2,-2]);h=(h+turn+8)%8;txt.push(t<=1?`จากนั้นเดินไปทางทิศ${DIR8[h]}`:`เลี้ยว${turn>0?'ขวา':'ซ้าย'}แล้วเดิน`)}
    else txt.push(`เริ่มเดินไปทางทิศ${DIR8[h]}`);
    const dist=ri(1,6);x+=STEP_V[h][0]*dist;y+=STEP_V[h][1]*dist;path.push([x,y]);
    txt[i]+=` ${dist} กม.`;steps.push([`ช่วงที่ ${i+1}: ไปทาง${DIR8[h]} ${dist} กม. → อยู่ที่ (${x}, ${y})`,'วาดเส้นทางทีละช่วง (x=ตะวันออก, y=เหนือ)'])}
  if(!x&&!y)return null;
  const d=dirOf(x,y);if(!(x===0||y===0||Math.abs(x)===Math.abs(y)))return null;
  const q=dirDist(d);q.stem=`${txt.join(' ')}\nตอนนี้อยู่ทางทิศใดของจุดเริ่มต้น`;q.choices=q.choices.map(c=>'ทิศ'+c);
  q.steps=[...steps,[`จุดสุดท้ายอยู่ที่ (${x}, ${y}) เทียบกับจุดเริ่ม (0, 0) จึงอยู่ทางทิศ${DIR8[d]}`,'ดูเครื่องหมาย x และ y']];
  q.expViz={type:'map',title:'เส้นทางที่เดิน',points:[{name:'เริ่ม',x:0,y:0},{name:'จบ',x,y}],path,unit:''};
  return q;
}
function genDir(level,n){return many(()=>{for(let g=0;g<40;g++){const q=genDir1(level);if(q)return q}return null},n)}

/* ---------- การวิเคราะห์ข้อมูล (ตาราง/กราฟจริง เฉลยคำนวณ) ---------- */
const DSETS=[{cat:'ไตรมาส',labels:['Q1','Q2','Q3','Q4'],what:'ยอดสินเชื่อ',unit:'ล้านบาท'},{cat:'เดือน',labels:['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.'],what:'จำนวนลูกค้าใหม่',unit:'ราย'},
  {cat:'สาขา',labels:['สาขา ก','สาขา ข','สาขา ค','สาขา ง'],what:'ยอดเงินฝาก',unit:'ล้านบาท'},{cat:'ผลิตภัณฑ์',labels:['ข้าว','ยางพารา','มันสำปะหลัง','อ้อย','ข้าวโพด'],what:'ผลผลิต',unit:'พันตัน'}];
function genData1(t){
  const ds=rnd(DSETS),n=ds.labels.length,base=rnd([20,40,50,100]);
  const vals=ds.labels.map(()=>base*ri(2,12));if(new Set(vals).size<n)return null;
  const chart=t<=1?rnd(['table','bar']):rnd(['table','bar','line']);
  const two=t>=4,y1='ปี 2567',y2='ปี 2568',vals2=two?vals.map(v=>Math.max(base,v+base*ri(-4,5))):null;
  const viz=chart==='table'?{type:'table',title:`${ds.what} (${ds.unit})`,headers:[ds.cat,...(two?[y1,y2]:[ds.what])],rows:ds.labels.map((l,i)=>[l,String(vals[i]),...(two?[String(vals2[i])]:[])])}
    :{type:chart,title:ds.what,labels:ds.labels,series:two?[{name:y1,values:vals},{name:y2,values:vals2}]:[{name:ds.what,values:vals}],unit:ds.unit};
  const kinds=t<=1?['max','sum','diff']:t<=2?['avg','pct','diff','min']:t<=3?['pct','avg','share','pct']:['growth','pct2','share','avg'];
  const k=rnd(kinds),fmtU=x=>nf(x)+' '+ds.unit,lab=i=>ds.labels[i];let q;
  const i1=ri(0,n-2),i2=ri(i1+1,n-1),sum=vals.reduce((a,b)=>a+b,0);
  if(k==='max'||k==='min'){const fn=k==='max'?Math.max:Math.min,v=fn(...vals),i=vals.indexOf(v);
    q=mkMCtext(`จากข้อมูล ${ds.cat}ใดมี${ds.what}${k==='max'?'สูง':'ต่ำ'}ที่สุด`,lab(i),shuffle(ds.labels.filter((_,j)=>j!==i)).slice(0,3),[[`เทียบค่าทุก${ds.cat}: ${ds.labels.map((l,j)=>l+' '+vals[j]).join(', ')}`,'อ่านจากตาราง/กราฟ'],[`${k==='max'?'มากสุด':'น้อยสุด'}คือ ${lab(i)} (${v})`,'เทียบค่า']])}
  else if(k==='sum')q=mkMC(`${ds.what}รวมทุก${ds.cat}เท่ากับเท่าใด`,sum,[sum+base,sum-base,sum+2*base],[[`${vals.join(' + ')} = ${sum}`,'รวมทุกค่า']],fmtU);
  else if(k==='diff'){const d=Math.abs(vals[i2]-vals[i1]);q=mkMC(`${lab(i2)}และ${lab(i1)}มี${ds.what}ต่างกันเท่าใด`,d,[d+base,Math.abs(d-base)||base*3,vals[i2]+vals[i1]],[[`|${vals[i2]} − ${vals[i1]}| = ${d}`,'ลบกัน']],fmtU)}
  else if(k==='avg'){if(sum%n)return null;const a=sum/n;q=mkMC(`${ds.what}เฉลี่ยต่อ${ds.cat}เท่ากับเท่าใด`,a,[a+base/2,a-base/2,sum/(n-1)],[[`รวม ${sum}`,'รวมทุกค่า'],[`${sum} ÷ ${n} = ${a}`,`หารด้วยจำนวน${ds.cat}`]],fmtU)}
  else if(k==='pct'){const p=(vals[i2]-vals[i1])/vals[i1]*100;if(!p||Math.abs(p*4-Math.round(p*4))>1e-9)return null;
    q=mkMC(`${ds.what}ของ${lab(i2)}${p>=0?'เพิ่มขึ้น':'ลดลง'}จาก${lab(i1)}ร้อยละเท่าใด`,Math.abs(p),[Math.abs((vals[i2]-vals[i1])/vals[i2]*100),Math.abs(p)+10,Math.abs(vals[i2]-vals[i1])],[[`ส่วนต่าง ${vals[i2]} − ${vals[i1]} = ${vals[i2]-vals[i1]}`,'ลบกัน'],[`${Math.abs(vals[i2]-vals[i1])} ÷ ${vals[i1]} × 100 = ${nf(Math.abs(p))}%`,'เทียบกับค่าเดิม (ฐาน)']],x=>nf(x)+'%')}
  else if(k==='share'){const p=vals[i1]/sum*100;if(Math.abs(p*4-Math.round(p*4))>1e-9)return null;
    q=mkMC(`${lab(i1)}คิดเป็นร้อยละเท่าใดของ${ds.what}ทั้งหมด`,p,[p+5,100/n,vals[i1]/vals[i2]*100],[[`ทั้งหมด = ${sum}`,'รวมทุกค่า'],[`${vals[i1]} ÷ ${sum} × 100 = ${nf(p)}%`,'ส่วน ÷ ทั้งหมด']],x=>nf(x)+'%')}
  else if(k==='growth'&&two){const g=vals2.map((v,i)=>v-vals[i]),m=Math.max(...g),i=g.indexOf(m);if(g.filter(x=>x===m).length>1)return null;
    q=mkMCtext(`${ds.cat}ใดมี${ds.what}เพิ่มขึ้นจาก ${y1} เป็น ${y2} มากที่สุด (คิดเป็นจำนวน)`,lab(i),shuffle(ds.labels.filter((_,j)=>j!==i)).slice(0,3),[[`ส่วนเพิ่ม: ${ds.labels.map((l,j)=>`${l} ${g[j]>=0?'+':''}${g[j]}`).join(', ')}`,`${y2} − ${y1}`],[`มากที่สุดคือ ${lab(i)}`,'เทียบส่วนเพิ่ม']])}
  else if(k==='pct2'&&two){const s1=vals.reduce((a,b)=>a+b,0),s2=vals2.reduce((a,b)=>a+b,0),p=(s2-s1)/s1*100;if(!p||Math.abs(p*4-Math.round(p*4))>1e-9)return null;
    q=mkMC(`${ds.what}รวม ${y2} ${p>=0?'เพิ่มขึ้น':'ลดลง'}จาก ${y1} ร้อยละเท่าใด`,Math.abs(p),[Math.abs((s2-s1)/s2*100),Math.abs(p)+5,Math.abs(s2-s1)],[[`${y1} รวม ${s1} · ${y2} รวม ${s2}`,'รวมแต่ละปี'],[`|${s2} − ${s1}| ÷ ${s1} × 100 = ${nf(Math.abs(p))}%`,'เทียบกับปีฐาน']],x=>nf(x)+'%')}
  else return null;
  if(two&&k!=='growth'&&k!=='pct2')q.stem=`พิจารณาเฉพาะ${y1} ${q.stem.replace(/^จากข้อมูล /,'')}`;
  q.viz=viz;q.stem=q.stem.startsWith('จากข้อมูล')?q.stem:'จากข้อมูล '+q.stem;return q;
}
function genData(level,n){return many(()=>{for(let g=0;g<60;g++){const q=genData1(level);if(q)return q}return null},n)}
