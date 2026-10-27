// Smoke test: "อัปโหลดขึ้น Google Drive ก่อน แล้วค่อยย่อยทีหลัง"
//
// รันด้วย:  node tests/smoke-drive-first.mjs
// ต้องมี Chrome และ Python 3 (ใช้เป็นเว็บเซิร์ฟเวอร์ในทดสอบ)
// เปลี่ยนที่อยู่ได้ด้วย env: CHROME_BIN, PYTHON, PORT, APP_URL
//
// ทดสอบจริงในเบราว์เซอร์ headless โดยไม่แตะ Firebase/Google Drive/AI ของจริง
// (สลับฟังก์ชัน uploadOriginal / docBuf / digestDoc ในหน้าเว็บเป็นตัวจำลอง)
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import http from 'node:http';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = process.env.PORT || '8137';
const APP_URL = process.env.APP_URL || `http://127.0.0.1:${PORT}/index.html`;

const chromeBin = [
  process.env.CHROME_BIN,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
].find(p => p && existsSync(p));
if (!chromeBin) { console.error('ไม่พบ Chrome — ตั้งค่า CHROME_BIN'); process.exit(2); }

const sleep = ms => new Promise(r => setTimeout(r, ms));
const profile = mkdtempSync(path.join(tmpdir(), 'baac-smoke-'));

// ตัวรับไฟล์จำลอง: พูดภาษาเดียวกับ Apps Script (quota / start / chunk)
const uploads = [];
const upSrv = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  if (req.method === 'OPTIONS') { res.statusCode = 204; return res.end(); }
  if (req.method === 'GET') {
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ ok: true, limit: 1e10, used: 0, free: 1e10 }));
  }
  let body = '';
  req.on('data', c => body += c);
  req.on('end', () => {
    const b = JSON.parse(body || '{}');
    if (b.a === 'start') { uploads.push({ start: b }); return res.end(JSON.stringify({ ok: true, session: 'sess' })); }
    if (b.a === 'chunk') { uploads.push({ chunk: b }); return res.end(JSON.stringify({ ok: true, done: true, id: 'real-drive-1' })); }
    res.end(JSON.stringify({ ok: false, error: 'unknown' }));
  });
});
await new Promise(r => upSrv.listen(0, '127.0.0.1', r));
const UPPORT = upSrv.address().port;

const server = process.env.APP_URL ? null : spawn(process.env.PYTHON || 'python',
  ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1', '--directory', ROOT], { stdio: 'ignore' });
const chrome = spawn(chromeBin, [
  '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
  '--remote-debugging-port=9231', `--user-data-dir=${profile}`, 'about:blank'
], { stdio: 'ignore' });

let failed = 0;
const problems = [];
function done() {
  try { chrome.kill(); server?.kill(); upSrv.close(); } catch {}
  try { rmSync(profile, { recursive: true, force: true }); } catch {}
}
process.on('exit', done);

async function wsUrlFor(port) {
  for (let i = 0; i < 60; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      const page = list.find(t => t.type === 'page');
      if (page) return page.webSocketDebuggerUrl;
    } catch {}
    await sleep(250);
  }
  throw new Error('เชื่อมต่อ Chrome DevTools ไม่ได้');
}

for (let i = 0; i < 40 && !process.env.APP_URL; i++) {
  try { if ((await fetch(APP_URL)).ok) break; } catch {}
  await sleep(250);
}

const ws = new WebSocket(await wsUrlFor(9231));
await new Promise((ok, no) => { ws.onopen = ok; ws.onerror = no; });

let seq = 0;
const pending = new Map();
ws.onmessage = ev => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); return; }
  if (m.method === 'Runtime.exceptionThrown') {
    const d = m.params.exceptionDetails;
    problems.push('EXCEPTION: ' + (d.exception?.description || d.text));
  }
  if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') {
    problems.push('CONSOLE: ' + m.params.args.map(a => a.value ?? a.description).join(' '));
  }
};
const send = (method, params = {}) => new Promise(res => {
  const id = ++seq; pending.set(id, res);
  ws.send(JSON.stringify({ id, method, params }));
});

await send('Page.enable');
await send('Runtime.enable');
await send('Page.navigate', { url: APP_URL });
await sleep(6000);

const test = String.raw`(async () => {
  const steps = [];
  const ok = (name, pass, extra) => steps.push({ name, pass: !!pass, extra });
  const pause = ms => new Promise(r => setTimeout(r, ms));
  try {
    // ---------- จำลองภายนอก: ล็อกอินอยู่ มีตัวรับไฟล์ Drive อยู่แล้ว ----------
    const realUpload = uploadOriginal;   // เก็บของจริงไว้ทดสอบโปรโตคอลในข้อ 5
    // ตัด Firestore ออกจากการทดสอบนี้ (มีเทสต์ซิงก์แยก) — ให้ฟังก์ชันซิงก์เป็น no-op
    ['syncRemoteBySha','syncPushMeta','syncPushDoc','syncPushPages','syncPushFigs','syncQueue','syncLease','syncRelease','syncAdopt','syncDeleteDoc','syncClearFigs','syncPull','syncStart','syncFlushDeletes','syncHydrate','ensureDocPages','driveFindSha'].forEach(n=>{try{window[n]=async()=>{}}catch(e){}});
    window.syncClaim=async()=>({ok:true});
    window.syncRemoteBySha=async()=>null;
    window.docBusyElsewhere=()=>false;
    ME = { uid: 'u1', name: 'tester', role: 'user' };
    SRC.dirs = [{ id: 'folder1', up: 'https://script.google.com/macros/s/test/exec' }];
    SRC.dirsAt = Date.now();
    window.ensureSrcDirs = async () => SRC.dirs;
    let uploaded = 0, progress = 0, lastSha = '';
    window.uploadOriginal = async (name, buf, mime, onProg, sha) => {
      lastSha = sha || '';
      onProg && onProg(0.5); progress++;
      onProg && onProg(1); progress++;
      return { id: 'drive-' + (++uploaded), dir: 'folder1' };
    };
    window.activeAI = () => '';            // ตอนอัปโหลดยังไม่ต้องย่อย
    window.canEmbed = () => false;
    window.canVision = () => false;
    window.digestDoc = async d => { d.digDone = 1; };
    window.findConflicts = async () => {};
    window.autoShare = () => {};
    const txt = 'บทที่ 1 หลักการให้สินเชื่อ\n'.repeat(40);
    const txtBuf = new TextEncoder().encode(txt).buffer;
    window.docBuf = async () => txtBuf;

    // ---------- 0) หน้าต่างอัปโหลดเสนอ "ขึ้น Drive ก่อน" และติ๊กไว้เป็นค่าเริ่มต้น ----------
    const modalP = handleFiles([new File([txt + 'หน้าต่าง'], 'modal.txt', { type: 'text/plain' })]);
    await pause(300);
    const dlg = document.getElementById('dlg');
    ok('หน้าต่างอัปโหลดมีตัวเลือกขึ้น Drive ก่อน', !!dlg.querySelector('#udrivefirst') && dlg.querySelector('#udrivefirst').checked);
    ok('อธิบายว่าปิดหน้าระหว่างรอได้', dlg.innerHTML.includes('ปิดหน้านี้ได้'));
    dlg.querySelector('.dlgbtns button.primary').click();
    await modalP; await pause(300);
    ok('อัปโหลดผ่านหน้าต่างแล้วได้สถานะรอ', DOCS.some(d => d.name === 'modal.txt' && d.driveId && d.stage === 'queued'));

    // ---------- 1) อัปโหลดขึ้น Drive ก่อน: ไฟล์อยู่บน Drive, ยังไม่อ่าน/ไม่เก็บสำเนาในเครื่อง ----------
    const before = uploaded;
    await handleFiles([new File([txt], 'ทดสอบสินเชื่อ.txt', { type: 'text/plain' })],
      { driveFirst: true, group: 'spec', show: true, kind: 'kb', noShare: true, topic: '' });
    await pause(400);
    const doc = DOCS.find(d => d.name === 'ทดสอบสินเชื่อ.txt');
    ok('สร้างเอกสาร', !!doc);
    ok('ส่งขึ้น Drive แล้ว', uploaded === before + 1 && doc && doc.driveId === 'drive-' + (before + 1), doc && doc.driveId);
    ok('ผูก srcFile กับไฟล์บน Drive', doc && doc.srcFile === doc.driveId);
    ok('รายงานความคืบหน้าอัปโหลด', progress >= 2);
    ok('ส่งลายนิ้วมือ SHA-256 ไปตรวจไฟล์ซ้ำ', lastSha.length === 64, lastSha.length);
    ok('ไม่เก็บสำเนาไฟล์ไว้ในเบราว์เซอร์', doc && !doc.fileMB);
    ok('ยังไม่ขึ้นเป็นวิชาก่อนอ่านเนื้อหา', !SUBJ.some(s => s.doc === doc.id));
    const html = document.querySelector('#sheet').innerHTML;
    ok('หน้าเว็บบอกว่าอยู่บน Drive และปิดหน้าได้', html.includes('อยู่บน Google Drive') && html.includes('ปิดหน้านี้ได้'));

    // ---------- 2) กลับมาประมวลผล: ดึงจาก Drive, อ่านข้อความ, จบที่พร้อมใช้ ----------
    window.activeAI = () => 'gemini';
    doc.pages = []; doc.stage = 'queued';
    await processDoc(doc);
    ok('อ่านเนื้อหาจาก Drive ได้', doc.pages.length > 0, doc.pages.length);
    ok('สถานะไปถึงพร้อมใช้', doc.stage === 'ready', doc.stage);
    ok('ขึ้นเป็นวิชาหลังอ่านเสร็จ', SUBJ.some(s => s.doc === doc.id));
    ok('ไม่ส่งไฟล์ซ้ำตอนกลับมาทำต่อ', uploaded === before + 1, uploaded);

    // ---------- 3) จำลองเปิดหน้าใหม่: ไม่มีไบต์ในหน่วยความจำ → ดึงจาก Drive อีกครั้ง ----------
    let fetched = 0;
    window.docBuf = async () => { fetched++; return txtBuf; };
    doc.pages = []; doc.stage = 'queued';
    await readDriveDoc(doc);
    ok('เปิดหน้าใหม่แล้วดึงไฟล์กลับมาอ่านเอง', fetched === 1 && doc.pages.length > 0, fetched);

    // ---------- 4) ส่งขึ้น Drive ไม่ได้ → ถอยไปอ่านในเครื่อง ไม่ให้งานหลุด ----------
    window.uploadOriginal = async () => { throw { why: 'พื้นที่เต็ม' }; };
    await handleFiles([new File([txt + 'เนื้อหาต่างกัน'], 'สำรอง.txt', { type: 'text/plain' })],
      { driveFirst: true, group: 'spec', show: true, kind: 'kb', noShare: true, topic: '' });
    await pause(400);
    const doc2 = DOCS.find(d => d.name === 'สำรอง.txt');
    ok('ส่ง Drive ไม่ได้ก็ยังประมวลผลได้', !!doc2 && !doc2.driveId && doc2.pages.length > 0, doc2 && doc2.stage);
    // ---------- 5) โปรโตคอลอัปโหลดจริง (start/chunk + sha) ไปหาเซิร์ฟเวอร์จำลอง ----------
    SRC.dirs = [{ id: 'local', up: 'http://127.0.0.1:' + __UPPORT__ }];
    SRC.dirsAt = Date.now();
    window.ensureSrcDirs = async () => SRC.dirs;
    window.fb = async () => ({ auth: { currentUser: { getIdToken: async () => 'tok' } } });
    let progSeen = 0, dbg = '';
    try { dbg = JSON.stringify(await upCall('http://127.0.0.1:' + __UPPORT__ + '?a=quota')); }
    catch (e) { dbg = 'fetch failed: ' + (e && (e.message || e.why) || e); }
    ok('ตัวรับไฟล์จำลองตอบ quota', dbg.includes('"ok":true'), dbg);
    const real = await realUpload('โปรโตคอล.txt', new TextEncoder().encode('hello-drive').buffer,
      'text/plain', () => progSeen++, 'b'.repeat(64));
    ok('อัปโหลดผ่านโปรโตคอล start/chunk ได้', real && real.id === 'real-drive-1', real && real.id);
    ok('รายงานความคืบหน้าระหว่างส่ง', progSeen >= 2, progSeen);
  } catch (e) {
    steps.push({ name: 'ทดสอบไม่จบ', pass: false, extra: String(e && (e.stack || e.why || e.message) || e) });
  }
  return steps;
})()`;

const testWithPort = test.replaceAll('__UPPORT__', String(UPPORT));

const res = await send('Runtime.evaluate', { expression: testWithPort, awaitPromise: true, returnByValue: true });
const steps = res.result?.result?.value || [];

// ตรวจฝั่งเซิร์ฟเวอร์ว่าได้ข้อมูลครบตามที่ตกลงกับ Apps Script
const start = uploads.find(u => u.start)?.start;
const chunk = uploads.find(u => u.chunk)?.chunk;
const decoded = chunk ? Buffer.from(chunk.data, 'base64').toString() : '';
steps.push({ name: 'ตัวรับไฟล์ได้ชื่อ/ขนาด/sha', pass: !!start && start.name === 'โปรโตคอล.txt' && start.size === 11 && String(start.sha).length === 64 });
steps.push({ name: 'ตัวรับไฟล์ได้เนื้อไฟล์ครบ', pass: decoded === 'hello-drive' });
steps.push({ name: 'ตัวรับไฟล์ได้ sha ตอนส่งชิ้นสุดท้าย', pass: !!chunk && String(chunk.sha).length === 64 });
for (const s of steps) {
  if (!s.pass) failed++;
  console.log(`${s.pass ? 'PASS' : 'FAIL'}  ${s.name}${s.extra !== undefined ? '  [' + s.extra + ']' : ''}`);
}
if (problems.length) { failed++; console.log('\nปัญหาในคอนโซล:\n' + problems.join('\n')); }
console.log(`\n${steps.filter(s => s.pass).length}/${steps.length} ผ่าน`);
ws.close();
process.exit(failed ? 1 : 0);
