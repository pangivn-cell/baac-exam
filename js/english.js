/* ---------- ภาษาอังกฤษ: ตัวสร้างโจทย์ในเครื่อง (ไม่ใช้ AI) ----------
   แบ่ง 4 ส่วนแบบข้อสอบจริง และวนส่วนทุกข้อ ชุดไหนก็ครบทั้ง 4 ส่วน
   Part 1 Conversation บทสนทนา · Part 2 Structure/Grammar (tense, preposition, passive, if, gerund/to, comparison, who/which)
   Part 3 Vocabulary (คำเหมือน คำตรงข้าม ความหมาย เติมคำ) · Part 4 Reading (ประกาศ อีเมล โฆษณา บทความสั้น)
   เฉลยภาษาไทยทุกข้อ: แปลโจทย์ → ความหมายของทุกตัวเลือก → กฎ/เหตุผล → ทำไมตัวลวงผิด → เทคนิคตอบเร็ว
   (ข้อที่สร้างที่นี่มีคำแปลในตัว ติด engTr ไว้ ระบบไม่ต้องให้ AI แปลซ้ำ) */
const EN_NAMES=['Somchai','Malee','Wichai','Suda','Thanakorn','Napa','Kanda','Arun','Pranee','Somsak'];
const EN_PROV=['Khon Kaen','Chiang Mai','Nakhon Ratchasima','Surin','Phitsanulok','Ubon Ratchathani','Chanthaburi','Roi Et','Lampang','Trang'];
const EN_DAYS=['Monday','Tuesday','Wednesday','Thursday','Friday'];
const EN_DAYS_TH={Monday:'จันทร์',Tuesday:'อังคาร',Wednesday:'พุธ',Thursday:'พฤหัสบดี',Friday:'ศุกร์'};
const EN_MON=['January','February','March','April','May','June','July','August','September','October','November','December'];
const EN_MON_TH=['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
const monTh=m=>EN_MON_TH[EN_MON.indexOf(m)]||m;
let EN_ROT=Math.floor(Math.random()*4);
/* tr = คำแปลโจทย์ · gl = ความหมายของตัวเลือก {ตัวเลือก: คำแปล} แสดงเฉพาะตัวเลือกที่ออกจริง */
/* เว้นวรรคระหว่างอักษรไทยกับอังกฤษ (สาขาRoi Et → สาขา Roi Et) อ่านง่ายขึ้น */
const thSp=t=>String(t==null?'':t).replace(/([฀-๿])([A-Za-z])/g,'$1 $2').replace(/([A-Za-z])([฀-๿])/g,'$1 $2');
function enMC(part,stem,ans,dist,steps,o){
  o=o||{};if(o.tr)o.tr=thSp(o.tr);if(o.gl){const g={};for(const k in o.gl)g[k]=thSp(o.gl[k]);o.gl=g}if(o.bi)o.bi=o.bi.map(x=>x&&[x[0],thSp(x[1])]);steps=steps.map(x=>[thSp(x[0]),thSp(x[1])]);const ds=[...new Set(dist.filter(d=>d&&d!==ans))];if(ds.length<3)return null;
  const pick=shuffle(ds).slice(0,3),gl=o.gl||{},shown=[ans,...pick].filter(c=>gl[c]);
  const pre=[];if(o.tr)pre.push([`แปลโจทย์: ${o.tr}`,'อ่านให้เข้าใจก่อนว่าโจทย์ถามอะไร']);
  if(shown.length)pre.push([`ความหมายตัวเลือก: ${shown.map(c=>`${c} = ${gl[c]}`).join(' · ')}`,'รู้ความหมายทุกตัวเลือกก่อนตัดสินใจ']);
  const q=mkMCtext(stem,ans,pick,[...pre,...steps]);q.engPart=part;q.topic=ENG_PARTS[part][0];q.engTr=true;
  /* biling = แปลทีละประโยค [อังกฤษ, ไทย] · vocab = คำศัพท์น่าจำจากโจทย์และตัวเลือก (พจนานุกรมย่อ english-dict.js) */
  if(o.bi)q.biling=o.bi.filter(x=>x&&x[0]&&x[1]);
  if(typeof enVocab==='function')q.vocab=enVocab(stem.replace(/^Read the passage and answer the question\.|Choose the most suitable response for the blank\./g,'')+' '+[ans,...pick].join(' '),12);
  return q;
}

/* ===== Part 1: Conversation =====
   [บทสนทนา, คำตอบ, ตัวลวง 3, สถานการณ์, แปลคำตอบ, ทำไมตัวลวงผิด, เทคนิค, แปลประโยคของอีกฝ่าย, แปลตัวลวง 3 (ลำดับเดียวกับตัวลวง)] */
const EN_CONV=[
 ["{A}: Good morning. How can I help you?\n{B}: ____","I'd like to open a savings account, please.",["I'm fine, thank you. And you?","Yes, you can help me tomorrow.","No, I don't need you."],"พนักงานถามว่า มีอะไรให้ช่วยไหม","ฉันต้องการเปิดบัญชีออมทรัพย์ครับ/ค่ะ","ตัวลวงตอบเรื่องสุขภาพ (I'm fine) หรือตอบไม่สุภาพ ไม่ได้บอกว่าต้องการอะไร","How can I help you? = ให้ตอบว่า ต้องการอะไร (I'd like to ... / I want to ...)","สวัสดีตอนเช้า มีอะไรให้ช่วยไหมครับ",["ฉันสบายดี ขอบคุณ แล้วคุณล่ะ","ได้ คุณช่วยฉันได้พรุ่งนี้","ไม่ ฉันไม่ต้องการคุณ"]],
 ["{A}: Thank you very much for your help.\n{B}: ____","You're welcome.",["Yes, I am.","Me too.","Help yourself."],"อีกฝ่ายขอบคุณที่ช่วยเหลือ","ด้วยความยินดี / ไม่เป็นไร","Help yourself = เชิญตามสบาย (ใช้ตอนเชิญกินอาหาร) · Me too / Yes, I am ไม่ใช่คำตอบรับคำขอบคุณ","Thank you → You're welcome. / My pleasure. / Not at all.","ขอบคุณมากที่ช่วยเหลือ",["ใช่ ฉันเป็น","ฉันด้วย","เชิญตามสบาย (หยิบกินเองได้เลย)"]],
 ["{A}: I'm sorry I'm late.\n{B}: ____","That's all right. Please sit down.",["Congratulations!","Yes, you're welcome.","I'm sorry to hear that."],"อีกฝ่ายขอโทษที่มาสาย","ไม่เป็นไร เชิญนั่ง","I'm sorry to hear that = เสียใจด้วย (ใช้เมื่อได้ยินข่าวร้าย) · Congratulations = ยินดีด้วย · You're welcome ใช้ตอบคำขอบคุณ","ตอบคำขอโทษ: That's all right. / Never mind. / No problem.","ขอโทษที่มาสาย",["ยินดีด้วย!","ใช่ ด้วยความยินดี","เสียใจด้วยที่ได้ยินอย่างนั้น"]],
 ["{A}: Could you tell me where the post office is?\n{B}: ____","Go straight and turn left at the traffic lights.",["It opens at 8:30.","Yes, I could.","I don't like the post office."],"อีกฝ่ายถามทางไปไปรษณีย์","เดินตรงไปแล้วเลี้ยวซ้ายที่ไฟจราจร","ถามว่า where (ที่ไหน) ต้องบอกทาง ไม่ใช่บอกเวลาเปิด · Yes, I could ตอบแค่ว่าทำได้แต่ไม่บอกทาง","Could you tell me where ...? เป็นคำถามขอข้อมูล ให้ตอบข้อมูลนั้นเลย ไม่ต้องตอบ Yes/No","ช่วยบอกได้ไหมว่าที่ทำการไปรษณีย์อยู่ที่ไหน",["เปิดเวลา 8:30 น.","ได้ ฉันบอกได้","ฉันไม่ชอบที่ทำการไปรษณีย์"]],
 ["{A}: Hello. May I speak to Mr. {N}, please?\n{B}: ____","Hold on, please. I'll put you through.",["No, you may not speak.","He speaks English very well.","I'm fine, thanks."],"คุยโทรศัพท์ ผู้โทรขอสายคุณ {N}","กรุณารอสักครู่ จะโอนสายให้","He speaks English very well ตอบเรื่องความสามารถพูด ไม่ใช่การโอนสาย · No, you may not speak ไม่สุภาพ","ศัพท์โทรศัพท์: hold on = รอสาย · put you through = โอนสาย · Speaking. = กำลังพูดอยู่ (ถ้าเป็นคนนั้นเอง)","สวัสดีครับ ขอสายคุณ {N} หน่อยครับ",["ไม่ คุณพูดไม่ได้","เขาพูดภาษาอังกฤษเก่งมาก","ฉันสบายดี ขอบคุณ"]],
 ["{A}: Would you like some coffee?\n{B}: ____","Yes, please. With a little sugar.",["Here you are.","You're welcome.","Yes, I do."],"อีกฝ่ายเสนอกาแฟ","ครับ/ค่ะ ขอน้ำตาลนิดหน่อย","Here you are = นี่ครับ (ใช้ตอนยื่นของให้) · Yes, I do ใช้ตอบคำถาม Do you ...? ไม่ใช่ Would you like ...?","Would you like ...? → Yes, please. / No, thank you.","รับกาแฟหน่อยไหมครับ",["นี่ครับ (ใช้ตอนยื่นของให้)","ด้วยความยินดี","ใช่ ฉันทำ (ใช้ตอบคำถาม Do you...?)"]],
 ["{A}: How about going to the market this weekend?\n{B}: ____","That sounds like a good idea.",["Yes, I went there last weekend.","By car, please.","It's about 50 baht."],"อีกฝ่ายชวนไปตลาดสุดสัปดาห์นี้","ฟังดูเป็นความคิดที่ดี","went there last weekend เป็นอดีต ไม่ได้ตอบคำชวน · By car / 50 baht ตอบคนละเรื่อง","How about + V-ing? / Let's ... = คำชวน → ตอบรับ That sounds good. / Good idea. หรือปฏิเสธสุภาพ I'm sorry, I can't.","สุดสัปดาห์นี้ไปตลาดกันไหม",["ใช่ ฉันไปที่นั่นเมื่อสุดสัปดาห์ที่แล้ว","ไปโดยรถยนต์","ราคาประมาณ 50 บาท"]],
 ["{A}: I have passed the bank examination!\n{B}: ____","Congratulations! I'm very happy for you.",["Never mind. Try again next time.","I'm sorry to hear that.","Take care of yourself."],"อีกฝ่ายบอกข่าวดีว่าสอบผ่าน","ยินดีด้วย ดีใจกับคุณมาก","Never mind / I'm sorry to hear that ใช้กับข่าวร้าย · Take care ใช้ตอนลาหรือคนป่วย","ข่าวดี → Congratulations! / Well done! · ข่าวร้าย → I'm sorry to hear that. / Never mind.","ฉันสอบเข้าธนาคารผ่านแล้ว!",["ไม่เป็นไร ครั้งหน้าลองใหม่","เสียใจด้วยที่ได้ยินอย่างนั้น","ดูแลตัวเองด้วยนะ"]],
 ["{A}: I failed my driving test again.\n{B}: ____","Never mind. You'll pass next time.",["Congratulations!","Good for you!","You're welcome."],"อีกฝ่ายบอกว่าสอบใบขับขี่ไม่ผ่านอีกแล้ว","ไม่เป็นไร ครั้งหน้าก็ผ่าน","Congratulations / Good for you = ยินดีด้วย ใช้กับข่าวดี · You're welcome ตอบคำขอบคุณ","ข่าวร้าย → ให้กำลังใจ: Never mind. / Don't worry. / Better luck next time.","ฉันสอบใบขับขี่ไม่ผ่านอีกแล้ว",["ยินดีด้วย!","ดีจังเลย!","ด้วยความยินดี"]],
 ["{A}: Do you mind if I open the window?\n{B}: ____","No, not at all. Go ahead.",["Yes, please open it.","No, I don't. Please don't open it.","Yes, I'd love to."],"อีกฝ่ายขออนุญาตเปิดหน้าต่าง","ไม่รังเกียจเลย เปิดได้เลย","Do you mind = คุณรังเกียจไหม ตอบ Yes = รังเกียจ จึงขัดกับ please open it · No, I don't แล้วห้ามเปิด ขัดกันเอง","Do you mind ...? ถ้าอนุญาตต้องตอบ No (ไม่รังเกียจ) เช่น No, not at all. / Of course not.","คุณจะรังเกียจไหมถ้าฉันเปิดหน้าต่าง",["ใช่ (รังเกียจ) แต่เปิดเลย (ขัดกันเอง)","ไม่รังเกียจ แต่อย่าเปิดนะ (ขัดกันเอง)","ได้ ฉันอยากทำมาก"]],
 ["{A}: How long have you worked at this branch?\n{B}: ____","For about five years.",["Since five years.","Five kilometers.","Every day."],"ถามว่าทำงานที่สาขานี้มานานเท่าไร","ประมาณ 5 ปี","Since ต้องตามด้วยจุดเริ่มต้นของเวลา (since 2020) ไม่ใช่ระยะเวลา · kilometers คือระยะทาง · Every day คือความถี่","How long = นานเท่าไร → for + ระยะเวลา (for five years) / since + จุดเริ่ม (since 2020)","คุณทำงานที่สาขานี้มานานเท่าไรแล้ว",["ตั้งแต่ห้าปี (ผิดไวยากรณ์)","ห้ากิโลเมตร","ทุกวัน"]],
 ["{A}: How often do you visit your parents?\n{B}: ____","Once a month.",["For two hours.","Next month.","By bus."],"ถามว่าไปเยี่ยมพ่อแม่บ่อยแค่ไหน","เดือนละครั้ง","For two hours ตอบระยะเวลา · Next month ตอบเมื่อไร · By bus ตอบวิธีเดินทาง","How often = บ่อยแค่ไหน → once a week / twice a month / every day / sometimes","คุณไปเยี่ยมพ่อแม่บ่อยแค่ไหน",["เป็นเวลาสองชั่วโมง","เดือนหน้า","โดยรถบัส"]],
 ["{A}: What does your father do?\n{B}: ____","He is a rubber farmer.",["He is fine, thank you.","He is fifty years old.","He does it every day."],"ถามว่าพ่อทำอาชีพอะไร","พ่อเป็นชาวสวนยาง","He is fine ตอบเรื่องสุขภาพ (How is ...?) · fifty years old ตอบอายุ (How old ...?)","What does he do? / What do you do? = ทำอาชีพอะไร → ตอบอาชีพ","พ่อของคุณทำอาชีพอะไร",["พ่อสบายดี ขอบคุณ","พ่ออายุห้าสิบปี","พ่อทำมันทุกวัน"]],
 ["{A}: Excuse me, is this seat taken?\n{B}: ____","No, it's free. Please sit down.",["Yes, please take it.","I take it every day.","No, thank you."],"อีกฝ่ายถามว่าที่นั่งนี้มีคนนั่งหรือยัง","ยังไม่มีคน เชิญนั่งได้","Yes = มีคนจองแล้ว จึงขัดกับ please take it · No, thank you ใช้ปฏิเสธข้อเสนอ","Is this seat taken? → No, it's free. (ว่าง) / Yes, I'm sorry. (มีคนแล้ว)","ขอโทษครับ ที่นั่งนี้มีคนนั่งหรือยัง",["มีคนแล้ว เชิญนั่งเลย (ขัดกันเอง)","ฉันนั่งที่นี่ทุกวัน","ไม่ ขอบคุณ (ใช้ปฏิเสธข้อเสนอ)"]],
 ["{A}: I'd like to withdraw 5,000 baht, please.\n{B}: ____","Certainly. May I see your passbook and ID card, please?",["Sure. How much would you like to withdraw?","I'd like to deposit it too.","Congratulations on your money."],"ลูกค้าบอกพนักงานธนาคารว่าจะถอนเงิน 5,000 บาท","ได้ครับ ขอดูสมุดบัญชีและบัตรประชาชนด้วยครับ","ลูกค้าบอกจำนวนเงินแล้ว ถามซ้ำว่าเท่าไรจึงไม่เหมาะ · deposit = ฝาก ตรงข้ามกับ withdraw = ถอน","ศัพท์ธนาคาร: withdraw ถอน · deposit ฝาก · passbook สมุดบัญชี · transfer โอน","ฉันต้องการถอนเงิน 5,000 บาทครับ",["ได้ครับ คุณต้องการถอนเท่าไร","ฉันอยากฝากเงินด้วย","ยินดีด้วยกับเงินของคุณ"]],
 ["{A}: Can I pay by credit card?\n{B}: ____","I'm afraid we only accept cash.",["No, I can't pay.","It costs 300 baht.","Yes, you paid yesterday."],"ลูกค้าถามว่าจ่ายด้วยบัตรเครดิตได้ไหม","เกรงว่าเรารับแต่เงินสด","No, I can't pay = ฉันจ่ายไม่ได้ (คนขายไม่ได้เป็นคนจ่าย) · 300 baht ตอบราคา ไม่ได้ตอบวิธีจ่าย","I'm afraid ... = ขอโทษนะ/เกรงว่า ใช้ปฏิเสธอย่างสุภาพ","จ่ายด้วยบัตรเครดิตได้ไหม",["ไม่ ฉันจ่ายไม่ได้","ราคา 300 บาท","ได้ คุณจ่ายไปเมื่อวานแล้ว"]],
 ["{A}: Shall we meet at 10 o'clock tomorrow?\n{B}: ____","I'm sorry, I'm busy then. How about 2 o'clock?",["Yes, we met at 10 o'clock.","No, I don't have a watch.","It's 10 o'clock now."],"อีกฝ่ายนัดพบพรุ่งนี้ 10 โมง","ขอโทษ ช่วงนั้นไม่ว่าง บ่ายสองโมงได้ไหม","we met เป็นอดีต แต่การนัดเป็นอนาคต · It's 10 o'clock now บอกเวลาปัจจุบัน","Shall we ...? = นัดหรือชวน → ตอบรับหรือขอเปลี่ยนเวลาอย่างสุภาพ How about ...?","พรุ่งนี้เจอกันสิบโมงดีไหม",["ใช่ เราเจอกันตอนสิบโมง (อดีต)","ไม่ ฉันไม่มีนาฬิกา","ตอนนี้สิบโมงแล้ว"]],
 ["{A}: What's the matter? You look pale.\n{B}: ____","I have a terrible headache.",["I'm a bank officer.","I like pale colors.","It doesn't matter."],"อีกฝ่ายถามว่าเป็นอะไร ดูหน้าซีด","ปวดหัวมาก","It doesn't matter = ไม่สำคัญ/ไม่เป็นไร (คนละความหมายกับ What's the matter) · I like pale colors เข้าใจคำว่า pale ผิด","What's the matter? / What's wrong? = เป็นอะไรไป → บอกอาการหรือปัญหา","เป็นอะไรไป ดูหน้าซีดนะ",["ฉันเป็นพนักงานธนาคาร","ฉันชอบสีอ่อนๆ","ไม่เป็นไร / ไม่สำคัญ"]],
 ["{A}: Can you help me carry these boxes?\n{B}: ____","Sure. Where do you want me to put them?",["You're welcome.","Yes, I can't.","They are very cheap."],"อีกฝ่ายขอให้ช่วยยกกล่อง","ได้ จะให้วางไว้ที่ไหน","You're welcome ตอบคำขอบคุณ · Yes, I can't ขัดกันเอง · They are very cheap ไม่เกี่ยว","Can you help me ...? → Sure. / Of course. / No problem.","ช่วยฉันยกกล่องพวกนี้หน่อยได้ไหม",["ด้วยความยินดี","ได้ ฉันทำไม่ได้ (ขัดกันเอง)","มันราคาถูกมาก"]],
 ["{A}: Goodbye. Have a nice weekend!\n{B}: ____","Thanks. You too.",["Nice to meet you too.","Good morning.","Yes, I have."],"อีกฝ่ายบอกลาและอวยพรให้สุดสัปดาห์ที่ดี","ขอบคุณ คุณก็เช่นกัน","Nice to meet you ใช้ตอนพบกันครั้งแรก · Good morning ใช้ทักทาย · Yes, I have ตอบผิดความหมาย","Have a nice ...! → Thanks. You too. / Same to you.","ลาก่อน ขอให้มีความสุขในวันหยุดสุดสัปดาห์",["ยินดีที่ได้รู้จักเช่นกัน","สวัสดีตอนเช้า","ใช่ ฉันมี"]],
 ["{A}: Nice to meet you, Mr. {N}.\n{B}: ____","Nice to meet you too.",["Fine, thank you.","See you later.","Yes, I meet you."],"พบกันครั้งแรก อีกฝ่ายทักว่ายินดีที่ได้รู้จัก","ยินดีที่ได้รู้จักเช่นกัน","Fine, thank you ตอบ How are you? · See you later ใช้ตอนลา","Nice to meet you. → Nice to meet you too. / Pleased to meet you too.","ยินดีที่ได้รู้จักครับ คุณ {N}",["สบายดี ขอบคุณ","แล้วเจอกันนะ","ใช่ ฉันพบคุณ"]],
 ["{A}: Could you lend me your pen?\n{B}: ____","Sure. Here you are.",["Sure, I'd like to borrow it.","Yes, it is a pen.","You're welcome."],"อีกฝ่ายขอยืมปากกา","ได้ นี่ครับ","borrow = ยืม (คนขอเป็นคนยืม คนให้คือ lend) · You're welcome ตอบคำขอบคุณ","lend = ให้ยืม · borrow = ขอยืม · ยื่นของให้ใช้ Here you are.","ขอยืมปากกาหน่อยได้ไหม",["ได้ ฉันอยากยืมมัน","ใช่ มันคือปากกา","ด้วยความยินดี"]],
 ["{A}: This ATM card doesn't work.\n{B}: ____","I'm sorry about that. Let me check it for you.",["Congratulations!","That's a good card.","Please work harder."],"ลูกค้าแจ้งว่าบัตร ATM ใช้ไม่ได้","ขออภัยด้วย ขอตรวจสอบให้นะครับ","Congratulations ใช้กับข่าวดี · work harder เข้าใจคำว่า work (ทำงานได้) ผิดความหมาย","ลูกค้าแจ้งปัญหา → ขอโทษ + เสนอช่วย: I'm sorry about that. Let me ...","บัตร ATM ใบนี้ใช้ไม่ได้",["ยินดีด้วย!","เป็นบัตรที่ดี","กรุณาทำงานให้หนักขึ้น"]],
 ["{A}: Which would you prefer, tea or coffee?\n{B}: ____","Coffee, please.",["Yes, please.","Both of them are tea.","I prefer."],"อีกฝ่ายให้เลือกชาหรือกาแฟ","ขอกาแฟครับ/ค่ะ","คำถาม Which ... A or B? ต้องเลือกตอบ ตอบ Yes, please ไม่ได้ · I prefer ไม่ครบประโยค","Which ... A or B? → เลือกอย่างหนึ่ง เช่น Coffee, please. / I'd prefer tea.","คุณอยากได้ชาหรือกาแฟ",["ครับ/ค่ะ (ตอบรับข้อเสนอ ไม่ได้เลือก)","ทั้งสองอย่างเป็นชา","ฉันชอบมากกว่า (ประโยคไม่ครบ)"]],
 ["{A}: Is the bank far from here?\n{B}: ____","No, it's only about five minutes' walk.",["Yes, it's very near.","It costs five baht.","I go there every day."],"อีกฝ่ายถามว่าธนาคารไกลจากที่นี่ไหม","ไม่ไกล เดินแค่ 5 นาที","Yes (ไกล) แต่ very near (ใกล้) ขัดกันเอง · five baht ตอบราคา","ถามไกลไหม → ตอบ No/Yes ให้สอดคล้องกับข้อมูลที่ตามมา","ธนาคารอยู่ไกลจากที่นี่ไหม",["ใช่ (ไกล) มันใกล้มาก (ขัดกันเอง)","ราคาห้าบาท","ฉันไปที่นั่นทุกวัน"]],
 ["{A}: May I take a message?\n{B}: ____","Yes, please tell him that {N} called.",["Yes, you may take it home.","No, I'll take a taxi.","Yes, he is here."],"คุยโทรศัพท์ คนรับสายเสนอรับฝากข้อความ","ได้ ช่วยบอกเขาว่า {N} โทรมา","take a message = รับฝากข้อความ ไม่ใช่เอาไปบ้าน · Yes, he is here ขัดกับการฝากข้อความ (ถ้าอยู่ก็คุยเองได้)","ศัพท์โทรศัพท์: take a message = รับฝากข้อความ · leave a message = ฝากข้อความ · call back = โทรกลับ","จะฝากข้อความไว้ไหมครับ",["ได้ คุณเอากลับบ้านได้","ไม่ ฉันจะนั่งแท็กซี่","ใช่ เขาอยู่ที่นี่"]],
];
function genConv(){
  const it=rnd(EN_CONV),[A,B]=shuffle([...EN_NAMES]).slice(0,2),N=rnd(EN_NAMES.filter(x=>x!==A&&x!==B)),f=t=>t.replace(/\{A\}/g,A).replace(/\{B\}/g,B).replace(/\{N\}/g,N);
  const [dl,ans,ds,sit,th,why,tip,thA,thD]=it.map(x=>Array.isArray(x)?x.map(f):f(x));
  const gl={[ans]:th};ds.forEach((d,i)=>gl[d]=thD[i]);
  return enMC(0,`${dl}\nChoose the most suitable response for the blank.`,ans,ds,[[`สถานการณ์: ${sit}`,'อ่านประโยคก่อนช่องว่างให้รู้ว่าอีกฝ่ายถาม ขอ หรือบอกข่าวอะไร'],
    [`คำตอบ: "${ans}" แปลว่า ${th}`,'ตอบตรงกับสิ่งที่ถาม และสุภาพเหมาะกับสถานการณ์'],[`ตัวลวง: ${why}`,'ตัวลวงถูกไวยากรณ์แต่ไม่เข้ากับสถานการณ์'],[`เทคนิค: ${tip}`,'จำคู่ประโยคถาม-ตอบที่ออกสอบบ่อย']],
    {tr:`${A}: "${thA}" แล้ว ${B} ควรตอบว่าอะไร (Choose the most suitable response = เลือกคำตอบที่เหมาะสมที่สุด)`,gl,
     bi:[[dl.split(/\n/)[0],`${A}: ${thA}`],[`${B}: ${ans}`,`${B}: ${th}`],['Choose the most suitable response for the blank.','เลือกคำตอบที่เหมาะสมที่สุดเติมในช่องว่าง']]});
}

/* ===== Part 2: Structure / Grammar ===== */
/* [V1, V-s, V-ing, V2, V3, ความหมาย, กรรม, ความหมายกรรม] */
const EN_VERBS=[['visit','visits','visiting','visited','visited','เยี่ยม','the farmers in the village','เกษตรกรในหมู่บ้าน'],['open','opens','opening','opened','opened','เปิด','a new savings account','บัญชีออมทรัพย์ใหม่'],
 ['pay','pays','paying','paid','paid','จ่าย','the electricity bill','ค่าไฟฟ้า'],['write','writes','writing','wrote','written','เขียน','a report','รายงาน'],['buy','buys','buying','bought','bought','ซื้อ','fertilizer','ปุ๋ย'],
 ['sell','sells','selling','sold','sold','ขาย','rice to the mill','ข้าวให้โรงสี'],['send','sends','sending','sent','sent','ส่ง','an email to the manager','อีเมลถึงผู้จัดการ'],['grow','grows','growing','grew','grown','ปลูก','vegetables','ผัก'],
 ['check','checks','checking','checked','checked','ตรวจ','the documents','เอกสาร'],['call','calls','calling','called','called','โทรหา','the customer','ลูกค้า'],['finish','finishes','finishing','finished','finished','ทำ...เสร็จ','the work','งาน'],
 ['study','studies','studying','studied','studied','เรียน','English','ภาษาอังกฤษ'],['meet','meets','meeting','met','met','พบ','the new manager','ผู้จัดการคนใหม่'],['teach','teaches','teaching','taught','taught','สอน','mathematics','คณิตศาสตร์'],
 ['take','takes','taking','took','taken','ถ่าย','photos of the rice field','รูปนาข้าว'],['speak','speaks','speaking','spoke','spoken','คุย','to the customers','กับลูกค้า']];
/* [ประธาน, ชนิด: 1=I 3=เอกพจน์บุรุษที่ 3 0=พหูพจน์/you/we, คำแปล] */
const EN_SUBJ=[['I',1,'ฉัน'],['He',3,'เขา'],['She',3,'เธอ'],['We',0,'พวกเรา'],['They',0,'พวกเขา'],['My father',3,'พ่อของฉัน'],['The manager',3,'ผู้จัดการ'],['The farmers',0,'เกษตรกร'],['{N}',3,'{N}'],['My parents',0,'พ่อแม่ของฉัน']];
const EN_TIME_TH={yesterday:'เมื่อวาน','last week':'สัปดาห์ที่แล้ว','two days ago':'เมื่อสองวันก่อน','last month':'เดือนที่แล้ว','in 2020':'ในปี 2020','every day':'ทุกวัน','every Monday':'ทุกวันจันทร์','every month':'ทุกเดือน','every morning':'ทุกเช้า',now:'ตอนนี้','at the moment':'ขณะนี้','right now':'ตอนนี้เลย','since 2019':'ตั้งแต่ปี 2019','for three years':'เป็นเวลาสามปี','since last year':'ตั้งแต่ปีที่แล้ว','for two months':'เป็นเวลาสองเดือน',tomorrow:'พรุ่งนี้','next week':'สัปดาห์หน้า','next month':'เดือนหน้า','next year':'ปีหน้า','when the phone rang':'ตอนที่โทรศัพท์ดัง'};
const beP=t=>t===1?'am':t===3?'is':'are',beS=t=>t===0?'were':'was',haveP=t=>t===3?'has':'have';
const subjTh=t=>t===1?'I (ใช้ am / have / กริยาไม่เติม s)':t===3?'เอกพจน์บุรุษที่ 3 (ใช้ is / has / was / กริยาเติม s, es)':'พหูพจน์หรือ we/they/you (ใช้ are / have / were / กริยาไม่เติม s)';
const EN_TENSE_TIP='เทคนิค: ดูคำบอกเวลาก่อนเสมอ · yesterday, ago, last ... → V2 · every, usually, always → V1 (s/es) · now, at the moment → am/is/are + V-ing · since, for → has/have + V3 · tomorrow, next ... → will + V1';
function genTense(level){
  const v=rnd(EN_VERBS),[S0,t,St0]=rnd(EN_SUBJ),N=rnd(EN_NAMES),S=S0.replace('{N}',N),St=St0.replace('{N}',N),cap=x=>x[0].toUpperCase()+x.slice(1);
  const forms={past:v[3],pres:t===3?v[1]:v[0],cont:`${beP(t)} ${v[2]}`,perf:`${haveP(t)} ${v[4]}`,fut:`will ${v[0]}`,pcont:`${beS(t)} ${v[2]}`};
  const fTh={past:`${v[5]} (อดีต V2 ทำไปแล้ว)`,pres:`${v[5]} (ปัจจุบัน ทำเป็นประจำ)`,cont:`กำลัง${v[5]} (ตอนนี้)`,perf:`${v[5]}มาแล้ว/ตลอดมา (has/have + V3)`,fut:`จะ${v[5]} (อนาคต)`,pcont:`กำลัง${v[5]} (ตอนนั้นในอดีต)`};
  const ks=level<=2?['past','pres','cont','fut']:['past','pres','cont','perf','fut','pcont'],k=rnd(ks);
  const M={past:[rnd(['yesterday','last week','two days ago','last month','in 2020']),'Past Simple (อดีตที่จบแล้ว)','ประธาน + V2'],
    pres:[rnd(['every day','every Monday','every month','every morning']),'Present Simple (ทำเป็นประจำ)','ประธาน + V1 (เอกพจน์บุรุษที่ 3 เติม s/es)'],
    cont:[rnd(['now','at the moment','right now']),'Present Continuous (กำลังทำอยู่ตอนนี้)','ประธาน + am/is/are + V-ing'],
    perf:[rnd(['since 2019','for three years','since last year','for two months']),'Present Perfect (ทำมาตั้งแต่อดีตจนถึงตอนนี้)','ประธาน + has/have + V3'],
    fut:[rnd(['tomorrow','next week','next month','next year']),'Future Simple (อนาคต)','ประธาน + will + V1'],
    pcont:['when the phone rang','Past Continuous (กำลังทำอยู่ ณ ตอนนั้นในอดีต แล้วมีเหตุการณ์อื่นแทรก)','ประธาน + was/were + V-ing']}[k];
  const stem=`${cap(S)} ____ ${v[6]} ${M[0]}.`,ans=forms[k],gl={};for(const x of Object.keys(forms))gl[forms[x]]=fTh[x];
  const asp={past:'',pres:'',cont:'กำลัง',perf:'',fut:'จะ',pcont:'กำลัง'}[k],tail=k==='perf'?'มา':'';
  return enMC(1,stem,ans,Object.entries(forms).filter(([x])=>x!==k).map(([,y])=>y),[[`คำบอกเวลา "${M[0]}" (${EN_TIME_TH[M[0]]}) → ใช้ ${M[1]}`,'คำบอกเวลาเป็นตัวบอกว่าต้องใช้ tense ไหน'],[`โครงสร้าง: ${M[2]}`,'จำโครงสร้างของแต่ละ tense'],
    [`ประธาน "${S}" เป็น${subjTh(t)} → ${ans}`,`กริยา ${v[0]} = ${v[5]} (V2 ${v[3]}, V3 ${v[4]})`],[`ประโยคเต็ม: ${stem.replace('____',ans)}`,'แทนคำตอบลงในช่องว่างแล้วอ่านทวน'],[EN_TENSE_TIP,'ตัวลวงคือกริยาเดียวกันใน tense อื่น']],
    {tr:`${St}${asp}${v[5]}${v[7]}${tail} ${EN_TIME_TH[M[0]]}`,gl,bi:[[stem.replace('____',ans),`${St}${asp}${v[5]}${v[7]}${tail} ${EN_TIME_TH[M[0]]}`]]});
}
const PREP_GL={at:'ที่ / เวลา (จุดที่เจาะจง)',on:'บน / ในวัน (วัน วันที่ ถนน)',in:'ใน (ช่วงเวลายาว พื้นที่กว้าง)',for:'เป็นเวลา (บอกระยะเวลา)',by:'ภายใน / โดย',to:'ไปยัง (บอกทิศทาง)',into:'เข้าไปใน (เคลื่อนที่เข้าไป)'};
function genPrepTime(){
  const N=rnd(EN_NAMES),dd=ri(1,28),mo=rnd(EN_MON),yr=String(ri(2015,2030));
  const at=[['9 a.m.','เวลา 9 นาฬิกา'],['8:30','เวลา 8:30 น.'],['noon','ตอนเที่ยงวัน'],['midnight','ตอนเที่ยงคืน'],["10 o'clock",'เวลาสิบโมง']],on=[['Monday','วันจันทร์'],['Friday','วันศุกร์'],[`${dd} ${mo}`,`วันที่ ${dd} ${monTh(mo)}`],['my birthday','วันเกิดของฉัน'],["New Year's Day",'วันขึ้นปีใหม่']],inn=[[mo,`เดือน${monTh(mo)}`],[yr,`ปี ${yr}`],['the morning','ตอนเช้า'],['the afternoon','ตอนบ่าย'],['the rainy season','ฤดูฝน']];
  const p=rnd(['at','on','in']),[x,xt]=rnd(p==='at'?at:p==='on'?on:inn),fr=rnd([['The meeting starts ____ X.','การประชุมเริ่ม'],['The bank opens ____ X.','ธนาคารเปิด'],['{N} was born ____ X.','{N} เกิด'],['We will pay the loan ____ X.','เราจะชำระเงินกู้']]);
  const stem=fr[0].replace('{N}',N).replace('X',x),rule={at:'at + เวลาเจาะจงเป็นจุด (at 9 a.m., at noon, at midnight)',on:'on + วัน หรือวันที่ (on Monday, on 5 May, on my birthday)',in:'in + เดือน ปี ฤดู หรือช่วงของวัน (in May, in 2025, in the morning)'}[p];
  return enMC(1,stem,p,['at','on','in','for','by'],[[`"${x}" เป็น${p==='at'?'เวลาเจาะจงเป็นจุด':p==='on'?'วันหรือวันที่':'เดือน ปี ฤดู หรือช่วงเวลาที่ยาว'} → ใช้ ${p}`,'บุพบทบอกเวลาเลือกตามความยาวของเวลา'],[`กฎ: ${rule}`,'จำกฎ at-on-in'],
    ['ตัวลวง: for + ระยะเวลา (for two hours) · by = ภายใน/ไม่เกิน (by Friday)','ใช้ไม่ได้กับจุดเวลา/วัน/เดือนในประโยคนี้'],['เทคนิค: จำเป็นพีระมิด in (กว้างสุด: ปี เดือน) → on (วัน) → at (จุดเวลา) ยิ่งเจาะจงยิ่งเลื่อนลงล่าง','ข้อยกเว้นที่ออกบ่อย: in the morning แต่ at night']],
    {tr:`${fr[1].replace('{N}',N)} ${xt} (เติมบุพบทบอกเวลา)`,gl:PREP_GL,bi:[[stem.replace('____',p),`${fr[1].replace('{N}',N)} ${xt}`]]});
}
function genPrepPlace(){
  const N=rnd(EN_NAMES),p=rnd(['in','on','at']),pv=rnd(EN_PROV),addr=`${ri(10,199)} Moo ${ri(1,12)}`;
  const [x,xt]=p==='in'?rnd([[pv,`จังหวัด${pv}`],['Thailand','ประเทศไทย'],['a small village','หมู่บ้านเล็กๆ']]):p==='on'?rnd([['Rama 9 Road','ถนนพระราม 9'],['the second floor','ชั้นสอง'],['Silom Road','ถนนสีลม']]):rnd([[addr,`บ้านเลขที่ ${addr}`],['the bus stop','ป้ายรถเมล์'],['the front desk','โต๊ะประชาสัมพันธ์']]);
  const fr=rnd([['{N} lives ____ X.','{N} อาศัยอยู่'],['The branch is ____ X.','สาขาตั้งอยู่'],['Please wait for me ____ X.','กรุณารอฉัน']]),stem=fr[0].replace('{N}',N).replace('X',x);
  const rule={in:'in + พื้นที่กว้าง เมือง จังหวัด ประเทศ หรือภายในบริเวณ',on:'on + ถนน หรือชั้นของอาคาร (on Silom Road, on the 2nd floor)',at:'at + บ้านเลขที่ หรือจุดที่เจาะจง (at 25 Moo 3, at the bus stop)'}[p];
  return enMC(1,stem,p,['in','on','at','to','into'],[[`"${x}" → ใช้ ${p}`,rule],['ตัวลวง: to / into บอกทิศทางการเคลื่อนที่ (go to, walk into) ไม่ใช่ตำแหน่งที่อยู่','ประโยคนี้บอกตำแหน่ง ไม่ได้บอกการเคลื่อนที่'],['เทคนิค: in (พื้นที่กว้าง) → on (ถนน/พื้นผิว/ชั้น) → at (จุดเจาะจง บ้านเลขที่)','ใช้หลักพีระมิดเหมือนบุพบทเวลา']],
    {tr:`${fr[1].replace('{N}',N)}ที่${xt} (เติมบุพบทบอกสถานที่)`,gl:PREP_GL,bi:[[stem.replace('____',p),`${fr[1].replace('{N}',N)}ที่${xt}`]]});
}
function genPassive(){
  const it=rnd([['The report','write','by the manager','รายงาน','โดยผู้จัดการ'],['The new branch','open','by the governor','สาขาใหม่','โดยผู้ว่าการ'],['These letters','send','to all customers','จดหมายเหล่านี้','ถึงลูกค้าทุกคน'],['Rice','grow','in this area','ข้าว','ในพื้นที่นี้'],['The documents','check','by the officer','เอกสาร','โดยเจ้าหน้าที่'],['The loan','pay','in full','เงินกู้','เต็มจำนวน'],['English','teach','at this school','ภาษาอังกฤษ','ที่โรงเรียนนี้'],['The fertilizer','sell','at a low price','ปุ๋ย','ในราคาถูก']]);
  const v=EN_VERBS.find(x=>x[0]===it[1]),pl=/(letters|documents)/.test(it[0])?1:0,tm=rnd([['yesterday','past','เมื่อวาน'],['every year','pres','ทุกปี'],['next month','fut','เดือนหน้า']]);
  const be=tm[1]==='past'?(pl?'were':'was'):tm[1]==='pres'?(pl?'are':'is'):'will be',ans=`${be} ${v[4]}`;
  const act=tm[1]==='past'?v[3]:tm[1]==='pres'?(pl?v[0]:v[1]):`will ${v[0]}`,perf=`${pl?'have':'has'} ${v[4]}`,cont=`${pl?'are':'is'} ${v[2]}`,wrong=`${be} ${v[0]}`;
  const gl={[ans]:`ถูก${v[5]} (passive)`,[act]:`${v[5]} (ประธานทำเอง active)`,[perf]:`${v[5]}มาแล้ว (ประธานทำเอง)`,[cont]:`กำลัง${v[5]} (ประธานทำเอง)`,[wrong]:'ผิดโครงสร้าง (be + V1 ไม่มีในภาษาอังกฤษ)'};
  return enMC(1,`${it[0]} ____ ${it[2]} ${tm[0]}.`,ans,[act,perf,cont,wrong],
    [[`ประธาน "${it[0]}" (${it[3]}) ${v[5]}เองไม่ได้ แต่ถูก${v[5]} → ใช้ Passive Voice`,'ถ้าประธานเป็นผู้ถูกกระทำ ใช้ประโยค passive'],[`โครงสร้าง Passive: ประธาน + verb to be + V3 (${v[0]} → ${v[4]})`,'ส่วน V3 ไม่เปลี่ยน เปลี่ยนแค่ verb to be ตาม tense'],
     [`คำบอกเวลา "${tm[0]}" (${tm[2]}) → verb to be = ${be}${tm[1]!=='fut'?` (ประธาน${pl?'พหูพจน์':'เอกพจน์'})`:''} → ${ans}`,'เลือก verb to be ตาม tense และประธาน'],['ตัวลวง: ใช้รูป active (ประธานทำเอง) หรือ be + V1 ซึ่งผิดโครงสร้าง','passive ต้องเป็น V3 เสมอ'],['เทคนิค: เห็น by + ผู้กระทำ หรือประธานเป็นสิ่งของ ให้นึกถึง passive (be + V3) ก่อน','ถามตัวเองว่า ประธานทำเองได้ไหม']],
    {tr:`${it[3]}${tm[1]==='fut'?'จะ':''}ถูก${v[5]}${it[4]} ${tm[2]}`,gl,bi:[[`${it[0]} ${ans} ${it[2]} ${tm[0]}.`,`${it[3]}${tm[1]==='fut'?'จะ':''}ถูก${v[5]}${it[4]} ${tm[2]}`]]});
}
/* [ส่วน If แบบ 1/2/3, ประธานผล, V1, V3, กรรม, แปลเงื่อนไข, แปลประธานผล, แปลกริยา+กรรม, ส่วนท้ายแบบที่ 1] */
const EN_IF=[[['it rains','it rained','it had rained'],'we','cancel','cancelled','the trip','ฝนตก','เรา','ยกเลิกการเดินทาง',' tomorrow'],
 [['I have enough money','I had enough money','I had had enough money'],'I','buy','bought','a new tractor','ฉันมีเงินพอ','ฉัน','ซื้อรถแทรกเตอร์คันใหม่',''],
 [['she studies hard','she studied hard','she had studied hard'],'she','pass','passed','the exam','เธอขยันเรียน','เธอ','สอบผ่าน',''],
 [['the bank lowers the interest rate','the bank lowered the interest rate','the bank had lowered the interest rate'],'more farmers','borrow','borrowed','money','ธนาคารลดอัตราดอกเบี้ย','เกษตรกร','กู้เงินมากขึ้น',''],
 [['you save 10% of your salary','you saved 10% of your salary','you had saved 10% of your salary'],'you','have','had','enough money for a house','คุณออมเงิน 10% ของเงินเดือน','คุณ','มีเงินพอซื้อบ้าน','']];
function genIf(level){
  const sc=rnd(EN_IF),ty=level<=3?rnd([1,1,2]):rnd([1,2,3]),cond=sc[0][ty-1],tail=ty===1?sc[8]:'';
  const fw=`will ${sc[2]}`,fd=`would ${sc[2]}`,fh=`would have ${sc[3]}`,fp=sc[3],fwh=`will have ${sc[3]}`,res=ty===1?fw:ty===2?fd:fh;
  const stem=`If ${cond}${tail}, ${sc[1]} ____ ${sc[4]}.`;
  const info={1:['If + V1 (ปัจจุบัน) → will + V1','เงื่อนไขที่เป็นไปได้จริงในอนาคต'],2:['If + V2 (อดีต) → would + V1','สมมติสิ่งที่ไม่จริงในปัจจุบัน'],3:['If + had + V3 → would have + V3','สมมติย้อนอดีต (เรื่องที่ผ่านไปแล้ว เปลี่ยนไม่ได้)']}[ty];
  const tr={1:`ถ้า${sc[5]}${tail?' พรุ่งนี้':''} ${sc[6]}จะ${sc[7]}`,2:`ถ้า${sc[5]} (สมมติ ซึ่งตอนนี้ไม่เป็นจริง) ${sc[6]}ก็คงจะ${sc[7]}`,3:`ถ้า${sc[5]} (สมมติย้อนอดีต ซึ่งไม่ได้เกิดขึ้นจริง) ${sc[6]}ก็คงได้${sc[7]}ไปแล้ว`}[ty];
  const gl={[fw]:`จะ${sc[7]} (if แบบที่ 1)`,[fd]:`คงจะ${sc[7]} (if แบบที่ 2 สมมติปัจจุบัน)`,[fh]:`คงได้${sc[7]}ไปแล้ว (if แบบที่ 3 สมมติอดีต)`,[fp]:`${sc[7]} (อดีตธรรมดา ไม่ใช้กับ if แบบนี้)`,[fwh]:`จะ${sc[7]}เสร็จแล้ว (future perfect)`};
  return enMC(1,stem[0].toUpperCase()+stem.slice(1),res,[fw,fd,fh,fp,fwh],[[`ส่วน If ใช้ "${cond}" → If แบบที่ ${ty}`,'ดูกริยาในส่วน If ก่อน แล้วจับคู่กับอีกส่วน'],[`สูตร: ${info[0]}`,info[1]],[`คำตอบ: ${res}`,'แทนในช่องว่างให้ครบประโยค'],['เทคนิค: จำคู่ V1 → will · V2 → would · had V3 → would have V3','ตัวลวงคือการจับคู่ผิดแบบ']],{tr,gl,bi:[[(stem[0].toUpperCase()+stem.slice(1)).replace('____',res),tr]]});
}
function genGerund(){
  const g=rnd([['enjoy','enjoys','ชอบ'],['avoid','avoids','หลีกเลี่ยงการ'],['finish','finishes','ทำเสร็จ:'],['suggest','suggests','แนะนำให้'],['consider','considers','พิจารณาที่จะ'],['keep','keeps','ทำต่อไปเรื่อยๆ:']]),inf=rnd([['want','wants','ต้องการ'],['decide','decides','ตัดสินใจ'],['plan','plans','วางแผนจะ'],['hope','hopes','หวังว่าจะ'],['agree','agrees','ตกลงจะ'],['refuse','refuses','ปฏิเสธที่จะ'],['promise','promises','สัญญาว่าจะ']]);
  const useG=Math.random()<.5,m=useG?g:inf,v=rnd(EN_VERBS.filter(x=>!['speak','take'].includes(x[0]))),[S0,t,St0]=rnd(EN_SUBJ.filter(x=>x[0]!=='I')),N=rnd(EN_NAMES),S=S0.replace('{N}',N),St=St0.replace('{N}',N);
  const ans=useG?v[2]:`to ${v[0]}`,stem=`${S} ${t===3?m[1]:m[0]} ____ ${v[6]}.`;
  const gl={[v[2]]:`การ${v[5]} (V-ing / gerund)`,[`to ${v[0]}`]:`ที่จะ${v[5]} (to + V1 / infinitive)`,[v[0]]:`${v[5]} (V1 เปล่าๆ)`,[v[3]]:`${v[5]}แล้ว (V2 อดีต)`,[`to ${v[2]}`]:'ผิดรูป (to ต้องตามด้วย V1)'};
  return enMC(1,stem,ans,[v[2],`to ${v[0]}`,v[0],v[3],`to ${v[2]}`],[[`กริยาหลัก "${m[0]}" (${m[2].replace(':','')}) ${useG?'ต้องตามด้วย V-ing (gerund)':'ต้องตามด้วย to + V1 (infinitive)'}`,'กริยาแต่ละตัวกำหนดรูปของกริยาที่ตามมา'],[`คำตอบ: ${stem.replace('____',ans)}`,'แทนแล้วอ่านทวน'],
    ['จำกลุ่ม + V-ing: enjoy, avoid, finish, mind, suggest, consider, keep, practise','ส่วนใหญ่เป็นกริยาที่พูดถึงการกระทำที่ทำอยู่/ทำแล้ว'],['จำกลุ่ม + to V1: want, decide, plan, hope, agree, refuse, promise, need, expect','ส่วนใหญ่เป็นกริยาที่มองไปข้างหน้า (ตั้งใจ วางแผน)'],['เทคนิค: ตัดตัวเลือก V2 กับ to + V-ing ทิ้งก่อน เพราะผิดทุกกรณี เหลือเลือกแค่ V-ing กับ to V1','ลดตัวเลือกให้เหลือ 2 ข้อ']],
    {tr:`${St}${m[2].replace(':','')}${v[5]}${v[7]}`,gl,bi:[[stem.replace('____',ans),`${St}${m[2].replace(':','')}${v[5]}${v[7]}`]]});
}
function genCompare(){
  const a=rnd([['cheap','cheaper','cheapest','ถูก'],['high','higher','highest','สูง'],['large','larger','largest','ใหญ่'],['busy','busier','busiest','ยุ่ง'],['good','better','best','ดี'],['expensive','more expensive','most expensive','แพง'],['important','more important','most important','สำคัญ'],['convenient','more convenient','most convenient','สะดวก'],['safe','safer','safest','ปลอดภัย']]);
  const k=rnd(['cmp','sup','eq']),fr=k==='cmp'?rnd([['This loan is ____ than that one.','เงินกู้นี้{A}กว่าอันนั้น'],['The interest rate this year is ____ than last year.','อัตราดอกเบี้ยปีนี้{A}กว่าปีที่แล้ว']]):k==='sup'?rnd([['This is the ____ branch in the province.','นี่คือสาขาที่{A}ที่สุดในจังหวัด'],['Saving is the ____ way to prepare for the future.','การออมเป็นวิธีที่{A}ที่สุดในการเตรียมตัวสำหรับอนาคต']]):rnd([['This account is as ____ as the old one.','บัญชีนี้{A}เท่ากับบัญชีเก่า'],['The new branch is as ____ as the main office.','สาขาใหม่{A}เท่ากับสำนักงานใหญ่']]);
  const ans=k==='cmp'?a[1]:k==='sup'?a[2]:a[0],wrong=a[1].startsWith('more')?`more ${a[0]}er`:`more ${a[1]}`;
  const gl={[a[0]]:`${a[3]} (รูปปกติ)`,[a[1]]:`${a[3]}กว่า (ขั้นกว่า)`,[a[2]]:`${a[3]}ที่สุด (ขั้นสุด)`,[wrong]:'ผิดรูป (ใช้ more ซ้อนกับ -er)'};
  return enMC(1,fr[0],ans,[a[0],a[1],a[2],wrong],[[k==='cmp'?'เห็นคำว่า than → ใช้ขั้นกว่า (comparative)':k==='sup'?'เห็น the + ... in/of → ใช้ขั้นสุด (superlative)':'เห็น as ... as → ใช้คำคุณศัพท์รูปปกติ','คำสัญญาณบอกขั้นของคำเปรียบเทียบ'],
    [`${a[0]} (${a[3]}) → ขั้นกว่า ${a[1]} → ขั้นสุด ${a[2]}`,a[1].startsWith('more')?'คำยาว 2–3 พยางค์ขึ้นไป ใช้ more / most นำหน้า':'คำสั้น เติม -er / -est (good → better → best เป็นรูปพิเศษ)'],[`ตัวลวง: ${wrong} ผิดเพราะใช้ more ซ้อนกับ -er`,'ใช้ได้อย่างใดอย่างหนึ่งเท่านั้น'],['เทคนิค: than = กว่า · the ...est / the most = ที่สุด · as ... as = เท่ากับ','หาคำสัญญาณในประโยคก่อนดูตัวเลือก']],
    {tr:fr[1].replace('{A}',a[3]),gl,bi:[[fr[0].replace('____',ans),fr[1].replace('{A}',a[3])]]});
}
function genRel(){
  const k=rnd(['who','which','whose','where']);
  const [stem,tr]={who:rnd([['The man ____ is talking to the manager is my uncle.','ผู้ชายที่กำลังคุยกับผู้จัดการคือลุงของฉัน'],['The officer ____ helped me was very kind.','เจ้าหน้าที่ที่ช่วยฉันใจดีมาก']]),which:rnd([['The tractor ____ he bought last year is still new.','รถแทรกเตอร์ที่เขาซื้อเมื่อปีที่แล้วยังใหม่อยู่'],['The loan ____ I applied for was approved.','เงินกู้ที่ฉันยื่นขอได้รับการอนุมัติแล้ว']]),whose:rnd([['The farmer ____ land is near the river grows mangoes.','ชาวนาที่ที่ดินของเขาอยู่ใกล้แม่น้ำปลูกมะม่วง'],['The woman ____ son works at the bank is my teacher.','ผู้หญิงที่ลูกชายของเธอทำงานที่ธนาคารคือครูของฉัน']]),where:rnd([['This is the village ____ I was born.','นี่คือหมู่บ้านที่ฉันเกิด'],['That is the branch ____ my sister works.','นั่นคือสาขาที่พี่สาวของฉันทำงานอยู่']])}[k];
  const why={who:'คำนามข้างหน้าเป็นคน และตามด้วยกริยา → who',which:'คำนามข้างหน้าเป็นสิ่งของ → which',whose:'ตามด้วยคำนาม (land, son) แสดงความเป็นเจ้าของ "ของเขา" → whose',where:'คำนามข้างหน้าเป็นสถานที่ และตามด้วยประโยคครบ (ประธาน + กริยา) → where'}[k];
  const gl={who:'ผู้ซึ่ง (ใช้กับคน)',which:'ซึ่ง (ใช้กับสิ่งของ/สัตว์)',whose:'ซึ่ง...ของเขา (แสดงความเป็นเจ้าของ + คำนาม)',where:'ที่ซึ่ง (ใช้กับสถานที่)',whom:'ผู้ซึ่ง (คนที่เป็นกรรม)'};
  return enMC(1,stem,k,['who','which','whose','where','whom'].filter(x=>x!==k),[[why,'ดูคำนามหน้าช่องว่าง และสิ่งที่ตามหลังช่องว่าง'],[`ประโยคเต็ม: ${stem.replace('____',k)}`,'แทนแล้วอ่านทวน'],['สรุป: who = คน · which = สิ่งของ/สัตว์ · whose + คำนาม = ของ... · where = สถานที่','ใช้ตัดตัวเลือก'],['เทคนิค: ถ้าหลังช่องว่างเป็นคำนามทันที ให้ตอบ whose เกือบทุกครั้ง','จุดที่ออกสอบบ่อย']],{tr,gl,bi:[[stem.replace('____',k),tr]]});
}
function genGrammar(level){
  const k=level<=1?rnd(['tense','prepT','prepP','compare']):level===2?rnd(['tense','prepT','prepP','compare','gerund','rel']):rnd(['tense','tense','passive','if','gerund','rel','compare','prepT']);
  return {tense:genTense,prepT:genPrepTime,prepP:genPrepPlace,passive:genPassive,if:genIf,gerund:genGerund,compare:genCompare,rel:genRel}[k](level);
}

/* ===== Part 3: Vocabulary ===== [คำ, ชนิด, ความหมาย, คำเหมือน, คำตรงข้าม, ประโยค (คำที่ถามเป็นตัวพิมพ์ใหญ่), แปลประโยค, ความหมายคำตรงข้าม] */
const EN_VOC=[
 ['huge','adj','ใหญ่มาก มหาศาล','enormous','tiny','The company made a HUGE profit this year.','บริษัททำกำไรได้มหาศาลในปีนี้','เล็กมาก'],
 ['rapid','adj','รวดเร็ว','quick','slow','There has been a RAPID increase in prices.','ราคาสินค้าเพิ่มขึ้นอย่างรวดเร็ว','ช้า'],
 ['essential','adj','จำเป็นอย่างยิ่ง','necessary','unnecessary','Water is ESSENTIAL for growing rice.','น้ำจำเป็นอย่างยิ่งต่อการปลูกข้าว','ไม่จำเป็น'],
 ['ancient','adj','เก่าแก่ โบราณ','old','modern','Sukhothai is an ANCIENT city.','สุโขทัยเป็นเมืองโบราณ','ทันสมัย'],
 ['wealthy','adj','ร่ำรวย','rich','poor','He comes from a WEALTHY family.','เขามาจากครอบครัวที่ร่ำรวย','ยากจน'],
 ['polite','adj','สุภาพ','courteous','rude','The officer was very POLITE to the customers.','เจ้าหน้าที่สุภาพกับลูกค้ามาก','หยาบคาย'],
 ['accurate','adj','ถูกต้องแม่นยำ','correct','incorrect','Please make sure the figures are ACCURATE.','กรุณาตรวจให้แน่ใจว่าตัวเลขถูกต้อง','ไม่ถูกต้อง'],
 ['difficult','adj','ยาก','hard','easy','The exam was more DIFFICULT than I expected.','ข้อสอบยากกว่าที่ฉันคาดไว้','ง่าย'],
 ['brief','adj','สั้น กระชับ','short','long','The manager gave a BRIEF speech.','ผู้จัดการกล่าวสุนทรพจน์สั้นๆ','ยาว'],
 ['reliable','adj','เชื่อถือได้','dependable','unreliable','She is a RELIABLE employee.','เธอเป็นพนักงานที่เชื่อถือได้','เชื่อถือไม่ได้'],
 ['famous','adj','มีชื่อเสียง','well-known','unknown','Chiang Mai is FAMOUS for its temples.','เชียงใหม่มีชื่อเสียงเรื่องวัด','ไม่มีใครรู้จัก'],
 ['vacant','adj','ว่าง (ไม่มีคน)','empty','occupied','There are two VACANT positions at the branch.','สาขามีตำแหน่งว่างสองตำแหน่ง','มีคนอยู่ ไม่ว่าง'],
 ['permanent','adj','ถาวร','lasting','temporary','She finally got a PERMANENT job.','ในที่สุดเธอก็ได้งานประจำแบบถาวร','ชั่วคราว'],
 ['fertile','adj','อุดมสมบูรณ์ (ดิน)','productive','barren','The soil in this area is very FERTILE.','ดินในพื้นที่นี้อุดมสมบูรณ์มาก','แห้งแล้ง ปลูกอะไรไม่ขึ้น'],
 ['sufficient','adj','เพียงพอ','enough','insufficient','We do not have SUFFICIENT funds for the project.','เรามีเงินทุนไม่เพียงพอสำหรับโครงการ','ไม่เพียงพอ'],
 ['cautious','adj','ระมัดระวัง','careful','careless','Be CAUTIOUS when you sign a contract.','ระมัดระวังเมื่อเซ็นสัญญา','ประมาท สะเพร่า'],
 ['annual','adj','ประจำปี','yearly','','The ANNUAL meeting is held in December.','การประชุมประจำปีจัดในเดือนธันวาคม',''],
 ['angry','adj','โกรธ','furious','calm','The customer was ANGRY because he waited for an hour.','ลูกค้าโกรธเพราะรอนานหนึ่งชั่วโมง','สงบ ใจเย็น'],
 ['purchase','v','ซื้อ','buy','sell','The farmer plans to PURCHASE a new tractor.','เกษตรกรวางแผนจะซื้อรถแทรกเตอร์คันใหม่','ขาย'],
 ['assist','v','ช่วยเหลือ','help','hinder','Our staff will ASSIST you with the form.','พนักงานของเราจะช่วยคุณกรอกแบบฟอร์ม','ขัดขวาง'],
 ['increase','v','เพิ่มขึ้น','raise','decrease','The bank will INCREASE the interest rate next month.','ธนาคารจะขึ้นอัตราดอกเบี้ยเดือนหน้า','ลดลง'],
 ['reduce','v','ลดลง','cut','increase','We must REDUCE our expenses.','เราต้องลดค่าใช้จ่าย','เพิ่มขึ้น'],
 ['postpone','v','เลื่อนออกไป','delay','','We have to POSTPONE the meeting until Friday.','เราต้องเลื่อนการประชุมไปเป็นวันศุกร์',''],
 ['obtain','v','ได้รับ หามาได้','get','lose','You can OBTAIN the form at any branch.','คุณขอรับแบบฟอร์มได้ที่ทุกสาขา','สูญเสีย ทำหาย'],
 ['repair','v','ซ่อม','fix','damage','The technician will REPAIR the ATM tomorrow.','ช่างจะซ่อมตู้ ATM พรุ่งนี้','ทำให้เสียหาย'],
 ['reject','v','ปฏิเสธ ไม่รับ','refuse','accept','The bank may REJECT incomplete applications.','ธนาคารอาจปฏิเสธใบสมัครที่ไม่ครบถ้วน','ยอมรับ'],
 ['inform','v','แจ้ง บอกให้ทราบ','tell','conceal','Please INFORM the customer about the new rate.','กรุณาแจ้งลูกค้าเรื่องอัตราดอกเบี้ยใหม่','ปกปิด'],
 ['complete','v','ทำให้เสร็จ ทำให้ครบ','finish','start','Please COMPLETE this form in English.','กรุณากรอกแบบฟอร์มนี้ให้ครบเป็นภาษาอังกฤษ','เริ่ม'],
 ['improve','v','ปรับปรุง ทำให้ดีขึ้น','develop','worsen','The bank wants to IMPROVE its services.','ธนาคารต้องการปรับปรุงบริการ','ทำให้แย่ลง'],
 ['permit','v','อนุญาต','allow','forbid','The rules do not PERMIT smoking in the office.','ระเบียบไม่อนุญาตให้สูบบุหรี่ในสำนักงาน','ห้าม'],
 ['profit','n','กำไร','gain','loss','The cooperative made a good PROFIT last year.','สหกรณ์มีกำไรดีเมื่อปีที่แล้ว','ขาดทุน'],
 ['income','n','รายได้','earnings','expense','Her monthly INCOME is about 20,000 baht.','รายได้ต่อเดือนของเธอประมาณ 20,000 บาท','รายจ่าย'],
 ['benefit','n','ประโยชน์','advantage','disadvantage','One BENEFIT of this account is free transfers.','ประโยชน์อย่างหนึ่งของบัญชีนี้คือโอนเงินฟรี','ข้อเสีย'],
 ['drought','n','ภัยแล้ง','dry spell','flood','The DROUGHT destroyed most of the crops.','ภัยแล้งทำลายพืชผลเกือบทั้งหมด','น้ำท่วม'],
 ['customer','n','ลูกค้า','client','','Every CUSTOMER receives a free calendar.','ลูกค้าทุกคนได้รับปฏิทินฟรี',''],
 ['collateral','n','หลักประกัน','security','','Land can be used as COLLATERAL for a loan.','ที่ดินใช้เป็นหลักประกันเงินกู้ได้',''],
 ['debt','n','หนี้','liability','','He finally paid off his DEBT.','ในที่สุดเขาก็ใช้หนี้หมด',''],
 ['opportunity','n','โอกาส','chance','','This training is a great OPPORTUNITY for young farmers.','การอบรมนี้เป็นโอกาสที่ดีของเกษตรกรรุ่นใหม่',''],
];
/* ความหมายของทุกคำที่อาจเป็นตัวเลือก (คำเหมือนแปลเหมือนคำหลัก คำตรงข้ามใช้คำแปลที่เขียนไว้) */
const EN_GLOSS=(()=>{const g={};for(const x of EN_VOC){g[x[0]]=x[2];g[x[3]]=x[2];if(x[4])g[x[4]]=x[7]}
  Object.assign(g,{signature:'ลายมือชื่อ',signatures:'ลายมือชื่อ',receipt:'ใบเสร็จ',balance:'ยอดเงินคงเหลือ',interest:'ดอกเบี้ย',harvest:'การเก็บเกี่ยว ผลผลิต',branch:'สาขา',branches:'สาขา',installments:'งวดผ่อนชำระ',customers:'ลูกค้า',debt:'หนี้',loss:'การขาดทุน',drought:'ภัยแล้ง',withdraw:'ถอนเงิน',withdraws:'ถอนเงิน',deposit:'ฝากเงิน',deposits:'ฝากเงิน',borrow:'ยืม กู้ (เป็นผู้รับ)',lend:'ให้ยืม ให้กู้ (เป็นผู้ให้)',lends:'ให้ยืม ให้กู้',owe:'เป็นหนี้',owes:'เป็นหนี้',transfer:'โอนเงิน',receive:'ได้รับ',fertilizer:'ปุ๋ย',insurance:'ประกันภัย',collateral:'หลักประกัน',stand:'ยืน',sit:'นั่ง',lie:'นอน',run:'วิ่ง'});return g})();
/* เติมคำ: [ประโยค, คำตอบ, ตัวลวง 3 (ใส่แล้วความหมายไม่เข้า), แปล] */
const EN_FILL=[
 ['Please sign your ____ at the bottom of the form.','signature',['receipt','balance','interest'],'กรุณาลงลายมือชื่อที่ด้านล่างของแบบฟอร์ม'],
 ['You can check your account ____ at any ATM.','balance',['signature','harvest','branch'],'คุณตรวจสอบยอดเงินคงเหลือในบัญชีได้ที่ตู้ ATM ทุกตู้'],
 ['Please keep the ____ as proof of payment.','receipt',['debt','loss','drought'],'กรุณาเก็บใบเสร็จไว้เป็นหลักฐานการชำระเงิน'],
 ['You can pay back the loan in twelve monthly ____.','installments',['customers','branches','signatures'],'คุณผ่อนชำระเงินกู้คืนได้ 12 งวดรายเดือน'],
 ['The bank pays 2% ____ per year on savings accounts.','interest',['harvest','receipt','signature'],'ธนาคารจ่ายดอกเบี้ย 2% ต่อปีสำหรับบัญชีออมทรัพย์'],
 ['The rice ____ was very good this year because of the rain.','harvest',['receipt','debt','balance'],'ผลผลิตข้าวที่เก็บเกี่ยวปีนี้ดีมากเพราะฝนดี'],
 ['If you want to take money out of your account, you need to ____ it.','withdraw',['deposit','borrow','lend'],'ถ้าต้องการเอาเงินออกจากบัญชี ต้องถอนเงิน'],
 ['He went to the bank to ____ his salary into his savings account.','deposit',['withdraw','borrow','owe'],'เขาไปธนาคารเพื่อฝากเงินเดือนเข้าบัญชีออมทรัพย์'],
 ['Farmers can ____ money from the bank to buy seeds.','borrow',['lend','deposit','owe'],'เกษตรกรกู้ยืมเงินจากธนาคารเพื่อซื้อเมล็ดพันธุ์ได้'],
 ['The bank agreed to ____ him 50,000 baht for his new business.','lend',['borrow','deposit','withdraw'],'ธนาคารตกลงให้เขากู้ 50,000 บาทสำหรับธุรกิจใหม่'],
 ['Please ____ the money to my account by Friday.','transfer',['borrow','owe','receive'],'กรุณาโอนเงินเข้าบัญชีของฉันภายในวันศุกร์'],
 ['The new ____ of the bank will open in our district next month.','branch',['harvest','receipt','debt'],'สาขาใหม่ของธนาคารจะเปิดในอำเภอเราเดือนหน้า'],
 ['He ____ the bank 30,000 baht and must pay it back next year.','owes',['lends','deposits','withdraws'],'เขาเป็นหนี้ธนาคาร 30,000 บาท และต้องใช้คืนปีหน้า'],
 ['The farmers use ____ to make their plants grow faster.','fertilizer',['insurance','interest','collateral'],'เกษตรกรใช้ปุ๋ยเพื่อให้พืชโตเร็วขึ้น'],
 ['You should buy crop ____ to protect yourself against floods.','insurance',['fertilizer','receipt','signature'],'คุณควรซื้อประกันภัยพืชผลเพื่อป้องกันความเสียหายจากน้ำท่วม'],
 ['Please ____ in line and wait for your number to be called.','stand',['sit','lie','run'],'กรุณายืนต่อแถวรอเรียกหมายเลข'],
];
function genVocab(level){
  const k=level<=1?rnd(['mean','fill','fill','syn']):level<=3?rnd(['syn','ant','mean','fill']):rnd(['syn','ant','ant','fill']);
  if(k==='fill'){const [s,a,d,th]=rnd(EN_FILL);
    return enMC(2,s,a,d,[[`คำตอบ: ${a} (${EN_GLOSS[a]}) ทำให้ประโยคมีความหมายถูกต้อง`,'แทนคำตอบลงในช่องว่างแล้วอ่านทวน'],[`ตัวลวง: ${d.join(', ')} เป็นคำชนิดเดียวกันแต่ใส่แล้วความหมายผิด`,'ตัวลวงในข้อศัพท์มักเป็นคำหมวดเดียวกัน'],['เทคนิค: จำคู่ศัพท์ธนาคารที่สับสนบ่อย: borrow (ยืม/กู้) ↔ lend (ให้ยืม) · deposit (ฝาก) ↔ withdraw (ถอน) · owe (เป็นหนี้)','อ่านว่าใครเป็นผู้ให้ ใครเป็นผู้รับ']],
      {tr:th,gl:EN_GLOSS,bi:[[s.replace('____',a),th]]})}
  const pool=EN_VOC.filter(x=>k!=='ant'||x[4]),w=rnd(pool),same=EN_VOC.filter(x=>x[1]===w[1]&&x!==w),W=w[0].toUpperCase(),pos={adj:'คำคุณศัพท์',v:'คำกริยา',n:'คำนาม'}[w[1]];
  const ctx=[`${W} = ${w[2]} (${pos})`,'ดูความหมายของคำที่ถามในประโยคก่อน'];
  if(k==='syn')return enMC(2,`${w[5]}\nThe word ${W} is closest in meaning to ____.`,w[3],[...(w[4]?[w[4]]:[]),...shuffle(same.map(x=>x[3]))].filter(x=>x!==w[3]),
    [ctx,[`คำเหมือน (synonym) ของ ${w[0]} คือ ${w[3]}`,'ความหมายเดียวกัน ใช้แทนกันในประโยคได้'],...(w[4]?[[`ตัวลวงสำคัญ: ${w[4]} เป็นคำตรงข้าม (opposite) ไม่ใช่คำเหมือน`,'ข้อสอบชอบใส่คำตรงข้ามมาหลอก']]:[]),['เทคนิค: แทนตัวเลือกลงในประโยคแทนคำตัวพิมพ์ใหญ่ ข้อที่อ่านแล้วความหมายไม่เปลี่ยนคือคำตอบ','ใช้บริบทช่วยเดาความหมายได้แม้ไม่รู้ศัพท์']],
    {tr:`${w[6]} · คำถาม: คำว่า ${W} มีความหมายใกล้เคียงกับคำใด`,gl:EN_GLOSS,bi:[[w[5],w[6]],[`The word ${W} is closest in meaning to ${w[3]}.`,`คำว่า ${W} มีความหมายใกล้เคียงกับ ${w[3]} (${w[2]})`]]});
  if(k==='ant')return enMC(2,`${w[5]}\nThe word ${W} is OPPOSITE in meaning to ____.`,w[4],[w[3],...shuffle(same.filter(x=>x[4]).map(x=>x[4]))].filter(x=>x!==w[4]),
    [ctx,[`คำตรงข้าม (opposite/antonym) ของ ${w[0]} คือ ${w[4]} (${w[7]})`,'ความหมายกลับกัน'],[`ตัวลวงสำคัญ: ${w[3]} เป็นคำเหมือน (ความหมายเดียวกัน) ไม่ใช่คำตรงข้าม`,'อ่านโจทย์ให้ชัดว่าถาม opposite หรือ closest in meaning'],['เทคนิค: คำที่ขึ้นต้นด้วย un-, in-, dis- มักเป็นคำตรงข้ามของคำหลัก (reliable ↔ unreliable)','แต่ต้องดูความหมายประกอบด้วย']],
    {tr:`${w[6]} · คำถาม: คำว่า ${W} มีความหมายตรงข้ามกับคำใด`,gl:EN_GLOSS,bi:[[w[5],w[6]],[`The word ${W} is opposite in meaning to ${w[4]}.`,`คำว่า ${W} มีความหมายตรงข้ามกับ ${w[4]} (${w[7]})`]]});
  return enMC(2,`${w[5]}\nThe word ${W} means ____.`,w[2],shuffle(same.map(x=>x[2])),[ctx,[`${w[0]} แปลว่า ${w[2]} คำเหมือนคือ ${w[3]}${w[4]?` คำตรงข้ามคือ ${w[4]} (${w[7]})`:''}`,'จำเป็นชุด คำ-คำเหมือน-คำตรงข้าม'],['เทคนิค: ถ้าไม่รู้ศัพท์ ให้ดูคำรอบข้างในประโยคเพื่อเดาความหมาย','บริบทในประโยคเป็นตัวช่วยสำคัญ']],
    {tr:`${w[6]} · คำถาม: คำว่า ${W} หมายถึงอะไร`,bi:[[w[5],w[6]]]});
}

/* ===== Part 4: Reading ===== แต่ละเรื่องสุ่มรายละเอียด แล้วสุ่มคำถามจากเรื่องเดียวกัน
   คำถาม: [คำถาม, คำตอบ, ตัวลวง 3, ประโยคหลักฐาน, แปลหลักฐาน, เทคนิค(หรือ null), ยาก(1=ระดับ 3 ขึ้นไป), แปลคำถาม, แปลตัวเลือก [คำตอบ, ตัวลวง 3]] */
const EN_READ_TIP='เทคนิค: อ่านคำถามก่อน จับคำสำคัญ แล้ว scan หาคำนั้นในบทความ ไม่ต้องแปลทุกคำ';
/* S = บทความเป็นคู่ประโยค [อังกฤษ, ไทย] · head = หัวเรื่องที่ขึ้นบรรทัดแยก (NOTICE, ชื่อโฆษณา) */
function readQ(S,qs,level,head){
  const body=S.slice(head?1:0),text=(head?S[0][0]+'\n':'')+body.map(x=>x[0]).join(' ').replace(/ (Regards,|Dear all,)/g,'\n$1').replace(/(Dear all,|Regards,) /g,'$1\n');
  const [q,ans,ds,ev,th,tip,,qTh,chTh]=rnd(level<=2?qs.filter(x=>!x[6]):qs),gl={};[ans,...ds].forEach((c,i)=>{if(chTh&&chTh[i])gl[c]=chTh[i]});
  return enMC(3,`Read the passage and answer the question.\n\n${text}\n\n${q}`,ans,ds,[[`หาคำตอบจาก: "${ev}"`,`แปล: ${th}`],[`คำตอบ: ${ans}`,'ตรงกับข้อความในบทความ'],['ตัวลวง: ข้อมูลที่ไม่มีในบทความ หรือสลับรายละเอียด (วัน เวลา ชื่อ ตัวเลข) กับส่วนอื่นของบทความ','อย่าตอบจากความรู้สึกหรือความรู้เดิม ต้องมีหลักฐานในบทความ'],[tip||EN_READ_TIP,'จับใจความเร็วโดยไม่ต้องแปลทุกคำ']],
    {tr:`${qTh} (Read the passage and answer the question = อ่านบทความแล้วตอบคำถาม)`,gl,bi:[...S,[q.replace('____',ans),qTh]]});
}
function genReading(level){
  const k=rnd(['notice','email','ad','story']);
  if(k==='notice'){const [b1,b2]=shuffle([...EN_PROV]).slice(0,2),d=rnd(EN_DAYS),dn=ri(2,28),mo=rnd(EN_MON),dt=`${dn} ${mo}`,o=rnd(['8:30 a.m.','9:00 a.m.']),c=rnd(['3:30 p.m.','4:00 p.m.']),c2=c==='3:30 p.m.'?'4:00 p.m.':'3:30 p.m.';
    const S=[['NOTICE','ประกาศ'],[`The ${b1} Branch will be closed on ${d}, ${dt} for system maintenance.`,`สาขา${b1}จะปิดทำการวัน${EN_DAYS_TH[d]}ที่ ${dn} ${monTh(mo)} เพื่อบำรุงรักษาระบบ`],
      ['During this time, customers can still use ATMs and mobile banking.','ระหว่างนี้ ลูกค้ายังใช้ตู้ ATM และโมบายแบงก์กิ้ง (ธนาคารบนมือถือ) ได้'],
      [`For other services, please visit the ${b2} Branch, which will be open from ${o} to ${c}`,`หากต้องการบริการอื่น กรุณาไปที่สาขา${b2} ซึ่งเปิดตั้งแต่ ${o} ถึง ${c}`],['We apologize for any inconvenience.','เราขออภัยในความไม่สะดวก']];
    return readQ(S,[
      ['Why will the branch be closed?','For system maintenance.',['For a public holiday.','Because of a flood.','For staff training.'],`will be closed on ${d} for system maintenance`,'สาขาจะปิดเพื่อบำรุงรักษาระบบ',null,0,'ทำไมสาขาจึงปิด',['เพื่อบำรุงรักษาระบบ','เพราะเป็นวันหยุดราชการ','เพราะน้ำท่วม','เพื่ออบรมพนักงาน']],
      ['Which service can customers still use?','ATMs and mobile banking',['Opening a new account','Applying for a loan','Visiting the closed branch'],'customers can still use ATMs and mobile banking','ลูกค้ายังใช้ตู้ ATM และโมบายแบงก์กิ้งได้',null,0,'ลูกค้ายังใช้บริการใดได้อยู่',['ตู้ ATM และโมบายแบงก์กิ้ง','การเปิดบัญชีใหม่','การยื่นขอสินเชื่อ','การไปที่สาขาที่ปิด']],
      ['Where should customers go for other services?',`The ${b2} Branch`,[`The ${b1} Branch`,'The head office','The post office'],`please visit the ${b2} Branch`,`กรุณาไปใช้บริการที่สาขา${b2}`,null,0,'ลูกค้าควรไปที่ไหนเพื่อใช้บริการอื่น',[`สาขา${b2}`,`สาขา${b1}`,'สำนักงานใหญ่','ที่ทำการไปรษณีย์']],
      [`What time does the ${b2} Branch close?`,c,[o,c2,'5:00 p.m.'],`open from ${o} to ${c}`,`เปิดตั้งแต่ ${o} ถึง ${c}`,null,0,`สาขา${b2}ปิดกี่โมง`,[`${c} (เวลาปิด)`,`${o} (เวลาเปิด ไม่ใช่เวลาปิด)`,c2,'5:00 p.m.']],
      ['What is the main purpose of this notice?','To inform customers that a branch will be closed for one day',['To advertise a new mobile banking service','To invite customers to a party','To announce new opening hours for all branches'],`The ${b1} Branch will be closed on ${d}`,'สาขาจะปิดในวันดังกล่าว (ประโยคแรกของประกาศคือใจความหลัก)','เทคนิค: จุดประสงค์/ใจความหลักของประกาศมักอยู่ในประโยคแรก',1,'จุดประสงค์หลักของประกาศนี้คืออะไร',['เพื่อแจ้งลูกค้าว่าสาขาจะปิดหนึ่งวัน','เพื่อโฆษณาบริการโมบายแบงก์กิ้งใหม่','เพื่อเชิญลูกค้ามางานเลี้ยง','เพื่อประกาศเวลาเปิดทำการใหม่ของทุกสาขา']],
      ['The word "inconvenience" in the passage is closest in meaning to ____.','trouble',['comfort','payment','service'],'We apologize for any inconvenience','ขออภัยในความไม่สะดวก (inconvenience = ความไม่สะดวก ความลำบาก)','เทคนิค: คำที่มี in-/un- นำหน้า มักมีความหมายตรงข้ามกับคำหลัก (convenience = ความสะดวก)',1,'คำว่า "inconvenience" ในบทความมีความหมายใกล้เคียงกับคำใด',['ความลำบาก ความยุ่งยาก','ความสบาย','การชำระเงิน','การบริการ']]],level,1)}
  if(k==='email'){const [d0,d1,d2]=shuffle([...EN_DAYS]).slice(0,3),tm=rnd(['9:00 a.m.','10:30 a.m.','1:30 p.m.']),[nm,snd]=shuffle([...EN_NAMES]).slice(0,2),city=rnd(EN_PROV),r=ri(201,320);
    const S=[['Dear all,','เรียนทุกท่าน'],[`The monthly staff meeting will be moved from ${d1} to ${d2} because the manager has to attend a training course in ${city}.`,`การประชุมพนักงานประจำเดือนจะย้ายจากวัน${EN_DAYS_TH[d1]}เป็นวัน${EN_DAYS_TH[d2]} เพราะผู้จัดการต้องไปอบรมที่${city}`],
      [`The meeting will start at ${tm} in Room ${r}.`,`การประชุมจะเริ่มเวลา ${tm} ที่ห้อง ${r}`],['Please bring your sales reports.','กรุณานำรายงานยอดขายของคุณมาด้วย'],
      [`If you cannot attend, please inform ${nm} by ${d0}.`,`หากคุณเข้าร่วมไม่ได้ กรุณาแจ้ง ${nm} ภายในวัน${EN_DAYS_TH[d0]}`],['Regards,','ด้วยความนับถือ'],[snd,`${snd} (ผู้เขียน)`]];
    return readQ(S,[
      ['When will the meeting be held now?',`On ${d2}`,[`On ${d1}`,`On ${d0}`,'Next month'],`will be moved from ${d1} to ${d2}`,`การประชุมย้ายจากวัน${EN_DAYS_TH[d1]}เป็นวัน${EN_DAYS_TH[d2]} (move from A to B = ย้ายจาก A ไป B)`,null,0,'ตอนนี้การประชุมจะจัดเมื่อไร',[`วัน${EN_DAYS_TH[d2]}`,`วัน${EN_DAYS_TH[d1]} (วันเดิมก่อนย้าย)`,`วัน${EN_DAYS_TH[d0]} (วันสุดท้ายที่ต้องแจ้ง)`,'เดือนหน้า']],
      ['Why was the meeting moved?','The manager has to attend a training course.',['The meeting room is not available.','Many staff members are on holiday.','The sales reports are not ready.'],'because the manager has to attend a training course','เพราะผู้จัดการต้องไปอบรม',null,0,'ทำไมการประชุมจึงถูกเลื่อน',['ผู้จัดการต้องไปอบรม','ห้องประชุมไม่ว่าง','พนักงานหลายคนลาพักร้อน','รายงานยอดขายยังไม่เสร็จ']],
      ['What should the staff bring to the meeting?','Their sales reports',['Their ID cards','Their laptops','Their lunch'],'Please bring your sales reports','กรุณานำรายงานยอดขายมาด้วย',null,0,'พนักงานควรนำอะไรมาประชุม',['รายงานยอดขาย','บัตรประชาชน','คอมพิวเตอร์โน้ตบุ๊ก','อาหารกลางวัน']],
      ['Who should staff contact if they cannot attend?',nm,[snd,'The manager','The training course'],`please inform ${nm} by ${d0}`,`ถ้ามาไม่ได้ กรุณาแจ้ง ${nm} ภายในวัน${EN_DAYS_TH[d0]}`,null,0,'ถ้าเข้าร่วมไม่ได้ พนักงานควรติดต่อใคร',[`${nm} (คนที่ต้องแจ้ง)`,`${snd} (ผู้เขียนอีเมล)`,'ผู้จัดการ','หลักสูตรอบรม']],
      ['Who most likely wrote this email?','A person who works in the same office',['A customer of the bank','The manager of the training course','A teacher at a school'],'Dear all, ... staff meeting ... Regards','อีเมลถึงพนักงานทุกคนเรื่องประชุมพนักงาน ผู้เขียนจึงน่าจะเป็นคนในสำนักงานเดียวกัน','เทคนิค: ข้อ most likely ให้หาเหตุผลจากเนื้อหา ไม่ต้องมีคำตอบตรงตัวในบทความ',1,'ใครน่าจะเป็นผู้เขียนอีเมลนี้มากที่สุด',['คนที่ทำงานในสำนักงานเดียวกัน','ลูกค้าของธนาคาร','ผู้จัดการหลักสูตรอบรม','ครูในโรงเรียน']]],level)}
  if(k==='ad'){const rt=rnd([3,3.5,4,4.5,5]),amt=rnd(['100,000','200,000','300,000']),y=rnd([3,5,7]),lim=rnd(['50,000','30,000']),mo=rnd(EN_MON),moT=monTh(mo);
    const S=[['SPECIAL LOAN FOR FARMERS','สินเชื่อพิเศษสำหรับเกษตรกร'],['Do you need money to buy seeds or fertilizer?','คุณต้องการเงินซื้อเมล็ดพันธุ์หรือปุ๋ยไหม'],
      [`Our new Green Farm Loan offers an interest rate of only ${rt}% per year.`,`สินเชื่อกรีนฟาร์มใหม่ของเราคิดอัตราดอกเบี้ยเพียง ${rt}% ต่อปี`],[`You can borrow up to ${amt} baht and pay it back within ${y} years.`,`คุณกู้ได้สูงสุด ${amt} บาท และผ่อนคืนภายใน ${y} ปี`],
      [`No collateral is needed for loans under ${lim} baht.`,`กู้ไม่เกิน ${lim} บาท ไม่ต้องใช้หลักประกัน`],[`Apply at any branch before ${mo} 31.`,`สมัครได้ทุกสาขา ก่อนวันที่ 31 ${moT}`]];
    return readQ(S,[
      ['Who is this loan for?','Farmers',['Students','Bank staff','Shop owners in the city'],'SPECIAL LOAN FOR FARMERS','สินเชื่อพิเศษสำหรับเกษตรกร',null,0,'สินเชื่อนี้สำหรับใคร',['เกษตรกร','นักเรียน','พนักงานธนาคาร','เจ้าของร้านค้าในเมือง']],
      ['What is the interest rate of this loan?',`${rt}% per year`,[`${rt+1}% per year`,`${y}% per year`,`${rt}% per month`],`an interest rate of only ${rt}% per year`,`อัตราดอกเบี้ยเพียง ${rt}% ต่อปี`,null,0,'สินเชื่อนี้มีอัตราดอกเบี้ยเท่าไร',[`${rt}% ต่อปี`,`${rt+1}% ต่อปี`,`${y}% ต่อปี (เอาจำนวนปีมาสับสน)`,`${rt}% ต่อเดือน (ผิดหน่วย)`]],
      ['How long can borrowers take to pay the loan back?',`Up to ${y} years`,[`Up to ${y+2} years`,'One year','Until 31 '+mo],`pay it back within ${y} years`,`ผ่อนคืนได้ภายใน ${y} ปี`,null,0,'ผู้กู้ผ่อนคืนได้นานเท่าไร',[`ไม่เกิน ${y} ปี`,`ไม่เกิน ${y+2} ปี`,'หนึ่งปี',`ถึงวันที่ 31 ${moT} (วันปิดรับสมัคร)`]],
      ['Which statement is TRUE according to the advertisement?',`Loans under ${lim} baht do not need collateral.`,['All loans need collateral.',`You can borrow more than ${amt} baht.`,'You must apply at the head office only.'],`No collateral is needed for loans under ${lim} baht`,`กู้ไม่เกิน ${lim} บาท ไม่ต้องใช้หลักประกัน`,'เทคนิค: ข้อ TRUE/NOT TRUE ให้เทียบตัวเลือกทีละข้อกับบทความ ข้อที่มีคำเด็ดขาด (all, only, never) มักเป็นตัวลวง',1,'ข้อใดถูกต้องตามโฆษณา',[`กู้ไม่เกิน ${lim} บาทไม่ต้องใช้หลักประกัน`,'ทุกสินเชื่อต้องใช้หลักประกัน',`กู้ได้มากกว่า ${amt} บาท`,'ต้องสมัครที่สำนักงานใหญ่เท่านั้น']],
      ['What can the money from this loan be used for?','Buying seeds or fertilizer',['Buying a new house','Paying school fees','Travelling abroad'],'Do you need money to buy seeds or fertilizer?','คุณต้องการเงินซื้อเมล็ดพันธุ์หรือปุ๋ยไหม',null,1,'เงินกู้นี้นำไปใช้ทำอะไรได้',['ซื้อเมล็ดพันธุ์หรือปุ๋ย','ซื้อบ้านหลังใหม่','จ่ายค่าเล่าเรียน','เที่ยวต่างประเทศ']]],level,1)}
  const N=rnd(EN_NAMES),pv=rnd(EN_PROV),pc=rnd([10,15,20]);
  const S=[[`${N} is a rice farmer in ${pv}.`,`${N}เป็นชาวนาใน${pv}`],['Last year, a drought destroyed half of his crop, so his income fell sharply.','ปีที่แล้ว ภัยแล้งทำลายพืชผลของเขาไปครึ่งหนึ่ง รายได้ของเขาจึงลดลงอย่างมาก'],
    [`This year he decided to grow vegetables as well as rice, and to save ${pc}% of his income every month.`,`ปีนี้เขาตัดสินใจปลูกผักควบคู่ไปกับข้าว และออมเงิน ${pc}% ของรายได้ทุกเดือน`],['Now he feels more secure about the future.','ตอนนี้เขารู้สึกมั่นคงมากขึ้นเกี่ยวกับอนาคต']];
  return readQ(S,[
    [`What happened to ${N} last year?`,'A drought destroyed half of his crop.',['A flood destroyed his house.','He sold all of his land.','He borrowed money to buy a tractor.'],'Last year, a drought destroyed half of his crop','ปีที่แล้ว ภัยแล้งทำลายพืชผลของเขาไปครึ่งหนึ่ง',null,0,`ปีที่แล้วเกิดอะไรขึ้นกับ${N}`,['ภัยแล้งทำลายพืชผลไปครึ่งหนึ่ง','น้ำท่วมทำลายบ้าน','เขาขายที่ดินทั้งหมด','เขากู้เงินซื้อรถแทรกเตอร์']],
    [`How much of his income does ${N} save every month?`,`${pc}%`,[`${pc*2}%`,'Half','None'],`save ${pc}% of his income every month`,`ออมเงิน ${pc}% ของรายได้ทุกเดือน`,null,0,`${N}ออมเงินเท่าไรของรายได้ทุกเดือน`,[`${pc}%`,`${pc*2}%`,'ครึ่งหนึ่ง (ครึ่งหนึ่งคือพืชผลที่เสียหาย)','ไม่ออมเลย']],
    [`Why did ${N} most likely start growing vegetables?`,'To have more than one source of income',['Because rice is too expensive to eat','Because the bank told him to stop growing rice','Because he does not like rice farming'],'grow vegetables as well as rice','ปลูกผักควบคู่กับข้าว (as well as = และยัง...ด้วย ไม่ได้เลิกปลูกข้าว) จึงมีรายได้มากกว่าทางเดียว','เทคนิค: ข้อ most likely / why ให้เชื่อมเหตุกับผล รายได้ลดเพราะภัยแล้ง → หารายได้ทางอื่นเพิ่ม',1,`ทำไม${N}จึงน่าจะเริ่มปลูกผัก`,['เพื่อให้มีรายได้มากกว่าหนึ่งทาง','เพราะข้าวแพงเกินกว่าจะกิน','เพราะธนาคารสั่งให้เลิกปลูกข้าว','เพราะเขาไม่ชอบทำนา']],
    [`How does ${N} feel now?`,'More secure about the future',['Worried about his debt','Angry with the weather','Bored with farming'],'Now he feels more secure about the future','ตอนนี้เขารู้สึกมั่นคงมากขึ้นเรื่องอนาคต',null,0,`ตอนนี้${N}รู้สึกอย่างไร`,['มั่นคงขึ้นเรื่องอนาคต','กังวลเรื่องหนี้','โกรธสภาพอากาศ','เบื่อการทำนา']],
    ['What is the best title for this passage?','A Farmer Who Learned to Plan Ahead',['How to Grow Vegetables','The Worst Drought in History','Banks in Thailand'],`${N} ... decided to grow vegetables ... and to save ... Now he feels more secure`,'เรื่องเล่าถึงเกษตรกรที่ปรับตัวและวางแผนการเงินหลังเจอภัยแล้ง','เทคนิค: ชื่อเรื่องที่ดีต้องครอบคลุมทั้งเรื่อง ไม่แคบ (เรื่องปลูกผักอย่างเดียว) และไม่กว้างเกิน (ธนาคารในประเทศไทย)',1,'ชื่อเรื่องที่เหมาะสมที่สุดของบทความนี้คืออะไร',['ชาวนาผู้เรียนรู้การวางแผนล่วงหน้า','วิธีปลูกผัก (แคบเกินไป)','ภัยแล้งที่ร้ายแรงที่สุดในประวัติศาสตร์ (ไม่ใช่ใจความหลัก)','ธนาคารในประเทศไทย (กว้างเกินและไม่เกี่ยว)']]],level);
}

/* วนส่วนทุกข้อ (0→1→2→3) ชุดไหนก็ได้ครบทั้ง 4 ส่วน */
function genEng1(level){const p=EN_ROT;EN_ROT=(EN_ROT+1)%4;const lv=Math.max(1,Math.min(5,level||1));
  for(let i=0;i<6;i++){const q=[genConv,genGrammar,genVocab,genReading][p](lv);if(q)return q}return null}
LOCAL.eng=(l,n)=>many(()=>genEng1(l),n);
