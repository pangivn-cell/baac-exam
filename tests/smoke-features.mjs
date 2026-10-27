// Smoke test: 3 ฟีเจอร์ใหม่
//   1) แอดมินเปลี่ยนชื่อรายวิชา (local + central + config/alias)
//   2) แก้บัตรความรู้แล้วเลือกรายวิชา/หัวข้อได้
//   3) กันไฟล์ซ้ำ: ชื่อเดิม+sha เดิม, ไฟล์บน Drive เดิม, เนื้อหาเดิมคนละชื่อ
// รัน: node tests/smoke-features.mjs
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = process.env.PORT || '8139';
const APP_URL = process.env.APP_URL || `http://127.0.0.1:${PORT}/index.html`;
const chromeBin = [
  process.env.CHROME_BIN,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  '/usr/bin/google-chrome', '/usr/bin/chromium',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
].find(p => p && existsSync(p));
if (!chromeBin) { console.error('ไม่พบ Chrome — ตั้งค่า CHROME_BIN'); process.exit(2); }

const sleep = ms => new Promise(r => setTimeout(r, ms));
const profile = mkdtempSync(path.join(tmpdir(), 'baac-feat-'));
const server = process.env.APP_URL ? null : spawn(process.env.PYTHON || 'python',
  ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1', '--directory', ROOT], { stdio: 'ignore' });
const chrome = spawn(chromeBin, ['--headless=new', '--disable-gpu', '--no-first-run',
  '--remote-debugging-port=9233', `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' });

let failed = 0;
const problems = [];
function cleanup() {
  try { chrome.kill(); server?.kill(); } catch {}
  try { rmSync(profile, { recursive: true, force: true }); } catch {}
}
process.on('exit', cleanup);

for (let i = 0; i < 40 && !process.env.APP_URL; i++) {
  try { if ((await fetch(APP_URL)).ok) break; } catch {}
  await sleep(250);
}
let wsUrl;
for (let i = 0; i < 60; i++) {
  try { const l = await (await fetch('http://127.0.0.1:9233/json/list')).json(); const p = l.find(t => t.type === 'page'); if (p) { wsUrl = p.webSocketDebuggerUrl; break; } } catch {}
  await sleep(250);
}
const ws = new WebSocket(wsUrl);
await new Promise((ok, no) => { ws.onopen = ok; ws.onerror = no; });
let seq = 0; const pending = new Map();
ws.onmessage = ev => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); return; }
  if (m.method === 'Runtime.exceptionThrown') problems.push('EXCEPTION: ' + (m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text));
  if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') problems.push('CONSOLE: ' + m.params.args.map(a => a.value ?? a.description).join(' '));
};
const send = (method, params = {}) => new Promise(res => { const id = ++seq; pending.set(id, res); ws.send(JSON.stringify({ id, method, params })); });

await send('Page.enable'); await send('Runtime.enable');
await send('Page.navigate', { url: APP_URL });
await sleep(6000);

const test = String.raw`(async () => {
  const steps = [];
  const ok = (name, pass, extra) => steps.push({ name, pass: !!pass, extra });
  const pause = ms => new Promise(r => setTimeout(r, ms));
  try {
    // ---------- Firestore จำลอง ----------
    const store = new Map();
    const stamp = () => ({ toMillis: () => Date.now() });
    function applyData(p, data, merge) {
      const cur = store.get(p) || {}; const nx = merge ? { ...cur } : {};
      for (const [k, v] of Object.entries(data || {})) { if (v && v.__serverTimestamp) nx[k] = stamp(); else nx[k] = v; }
      store.set(p, nx);
    }
    const snapOf = p => ({ id: p.split('/').pop(), exists: () => store.has(p), data: () => store.get(p) });
    const fs = {
      doc: (db, ...seg) => ({ __ref: seg.join('/') }),
      collection: (db, ...seg) => ({ __col: seg.join('/') }),
      setDoc: async (r, data, o) => applyData(r.__ref, data, o && o.merge),
      updateDoc: async (r, data) => applyData(r.__ref, data, true),
      getDoc: async r => snapOf(r.__ref),
      getDocs: async q => {
        const pre = q.__col || ''; const out = [];
        for (const [k, v] of store) { if (!k.startsWith(pre + '/')) continue; const rel = k.slice(pre.length + 1); if (rel && !rel.includes('/')) out.push({ id: rel, data: () => v }); }
        return { docs: out };
      },
      deleteDoc: async r => { for (const k of [...store.keys()]) if (k === r.__ref || k.startsWith(r.__ref + '/')) store.delete(k); },
      query: c => c, where: () => ({}), orderBy: () => ({}), limit: () => ({}),
      serverTimestamp: () => ({ __serverTimestamp: true }),
      Timestamp: { fromMillis: m => ({ toMillis: () => m }) },
      runTransaction: async (db, fn) => { const ops = []; const tx = { get: async r => snapOf(r.__ref), set: (r, d, o) => ops.push([r.__ref, d, o]), update: (r, d) => ops.push([r.__ref, d, { merge: true }]), delete: r => ops.push([r.__ref, null]) }; const res = await fn(tx); for (const [p, d, o] of ops) { if (d) applyData(p, d, o && o.merge); else store.delete(p); } return res; }
    };
    FB = { fs, db: {} };
    window.fb = async () => ({ fs, db: FB.db, auth: { currentUser: { getIdToken: async () => 'tok' } } });
    window.ensureSrcDirs = async () => [{ id: 'f1', up: 'https://script.google.com/macros/s/test/exec' }];
    SRC.dirs = [{ id: 'f1', up: 'https://script.google.com/macros/s/test/exec' }]; SRC.dirsAt = Date.now();
    ME = { uid: 'u1', name: 'admin', role: 'admin' };
    const realFileSha = fileSha;
    VIEW = 'kb';
    DOCS = []; CARDS = []; UPQ = []; FIGS.clear(); PFIG.clear();

    // ---------- 1) เปลี่ยนชื่อรายวิชา ----------
    const doc1 = { id: 'd1', name: 'ระเบียบ.pdf', sha: 'd'.repeat(64), group: 'spec', show: true, kind: 'kb', stage: 'ready', topic: 'PDPA', pages: [{ n: 1, text: 'x' }], chars: 1, bad: [], figPages: [], ocrDone: [], digDone: 1, summ: [], err: '', at: 1, ownerUid: 'u1' };
    DOCS = [doc1]; await saveDoc(doc1);
    const c1 = { id: 'kc1', docId: 'd1', type: 'kb', title: 'บัตร PDPA', fact: 'เนื้อหา PDPA', topic: 'PDPA', kind: 'นิยาม', imp: 2, at: 1 };
    const cc1 = { id: 'cc1', docId: 'c_p1', type: 'kb', title: 'บัตรกลาง', fact: 'กลาง', topic: 'PDPA', kind: 'นิยาม', imp: 2, at: 1 };
    CARDS = [c1, cc1]; await saveCards([c1, cc1]);
    store.set('kb/p1', { cards: [{ id: 'cc1', topic: 'PDPA', fact: 'กลาง' }], updatedAt: stamp() });
    await renameSubject('pdpa', 'PDPA', 'PDPA และความเป็นส่วนตัว', { reload: false });
    const cfg = store.get('config/subjects') || {};
    ok('บันทึกชื่อใหม่ใน config', cfg.rename && cfg.rename.pdpa === 'PDPA และความเป็นส่วนตัว', JSON.stringify(cfg.rename));
    ok('เก็บชื่อเดิมเป็น alias', cfg.alias && cfg.alias.PDPA === 'PDPA และความเป็นส่วนตัว', JSON.stringify(cfg.alias));
    ok('ย้าย topic บัตรในเครื่อง', c1.topic === 'PDPA และความเป็นส่วนตัว');
    ok('ย้าย topic เอกสารในเครื่อง', doc1.topic === 'PDPA และความเป็นส่วนตัว');
    ok('ย้าย topic ในคลังกลาง', store.get('kb/p1').cards[0].topic === 'PDPA และความเป็นส่วนตัว');
    ok('alias ใช้แปลงชื่อได้ทันที', topicName('PDPA') === 'PDPA และความเป็นส่วนตัว', topicName('PDPA'));

    // ---------- 2) แก้บัตรแล้วเลือกรายวิชา ----------
    const p = editCardDialog(c1);
    await pause(200);
    const sel = document.getElementById('ce-tp');
    ok('หน้าต่างแก้บัตรมีช่องเลือกรายวิชา', !!sel);
    sel.value = 'NCB';
    document.getElementById('ce-f').value = 'เนื้อหาใหม่';
    document.querySelector('#dlg .dlgbtns button.primary').click();
    const saved = await p;
    ok('บันทึกบัตรพร้อมรายวิชาใหม่', saved === true && c1.topic === 'NCB' && c1.fact === 'เนื้อหาใหม่', c1.topic);

    // ---------- 2.1) ปุ่มดินสอข้างวิชาในเมนู ----------
    syncDocSubjects(); renderSide();
    ok('มีปุ่มแก้ชื่อข้างวิชาในเมนู', !!document.querySelector('[data-srenameside="doc_d1"]'));
    const rp = renameSideSubject('doc_d1');
    await pause(150);
    document.getElementById('srn').value = 'เอกสารระเบียบ (เมนู)';
    document.querySelector('#dlg .dlgbtns button.primary').click();
    await rp;
    ok('แก้ชื่อวิชาในเมนูได้', doc1.label === 'เอกสารระเบียบ (เมนู)' && SUBJ.some(x => x.id === 'doc_d1' && x.name === 'เอกสารระเบียบ (เมนู)'), doc1.label);

    // ---------- 3) กันไฟล์ซ้ำ ----------
    // 3.1 ชื่อเดิม + sha เดิม → อัปเดตแค่ตัวเลือก ไม่ประมวลผลซ้ำ
    window.fileSha = async () => 'a'.repeat(64);
    DOCS = [{ id: 's1', name: 'same.txt', sha: 'a'.repeat(64), stage: 'ready', group: 'gen', show: true, kind: 'kb', ownerUid: 'u1', pages: [], chars: 0, bad: [], figPages: [], ocrDone: [], digDone: 1, summ: [], err: '', at: 1 }];
    await handleFiles([new File(['x'], 'same.txt', { type: 'text/plain' })], { driveFirst: false, group: 'gen', show: false, kind: 'kb', noShare: true, topic: '' });
    ok('ไฟล์เดิมชื่อเดิมไม่ถูกประมวลผลซ้ำ', DOCS.length === 1 && DOCS[0].show === false, DOCS.length);

    // 3.2 มีไฟล์ SHA เดียวกันบน Drive → ใช้ไฟล์เดิม ไม่ upload
    let uploaded = 0;
    window.fileSha = async () => 'b'.repeat(64);
    window.syncRemoteBySha = async () => null;
    window.driveFindSha = async () => ({ id: 'drive-1', name: 'old.pdf', dir: 'f1' });
    window.uploadOriginal = async () => { uploaded++; throw new Error('ไม่ควรอัปโหลด'); };
    DOCS = [];
    await handleFiles([new File([new Uint8Array(10)], 'new.pdf', { type: 'application/pdf' })], { driveFirst: true, group: 'spec', show: true, kind: 'kb', noShare: true, topic: '' });
    ok('ใช้ไฟล์เดิมบน Drive ไม่สร้างซ้ำ', DOCS.length === 1 && DOCS[0].driveId === 'drive-1' && uploaded === 0, DOCS[0] && DOCS[0].driveId);

    // 3.3 เนื้อหาเดิมคนละชื่อ (sha ต่าง) → ข้ามด้วยลายนิ้วมือเนื้อหา
    window.fileSha = realFileSha;
    const tsha = await textShaOf([{ n: 1, text: 'hello world' }]);
    DOCS = [{ id: 't1', name: 'existing.txt', sha: 'c'.repeat(64), txtSha: tsha, stage: 'ready', group: 'gen', show: true, kind: 'kb', ownerUid: 'u1', pages: [{ n: 1, text: 'hello world' }], chars: 11, bad: [], figPages: [], ocrDone: [], digDone: 1, summ: [], err: '', at: 1 }];
    await handleFiles([new File(['hello world'], 'other.txt', { type: 'text/plain' })], { driveFirst: false, group: 'gen', show: true, kind: 'kb', noShare: true, topic: '' });
    ok('เนื้อหาเดิมคนละชื่อถูกกัน', DOCS.length === 1, DOCS.length);
  } catch (e) {
    steps.push({ name: 'ทดสอบไม่จบ', pass: false, extra: String(e && (e.stack || e.why || e.message) || e) });
  }
  return steps;
})()`;

const res = await send('Runtime.evaluate', { expression: test, awaitPromise: true, returnByValue: true });
const steps = res.result?.result?.value || [];
for (const s of steps) {
  if (!s.pass) failed++;
  console.log(`${s.pass ? 'PASS' : 'FAIL'}  ${s.name}${s.extra !== undefined ? '  [' + s.extra + ']' : ''}`);
}
if (problems.length) { failed++; console.log('\nปัญหาในคอนโซล:\n' + problems.join('\n')); }
console.log(`\n${steps.filter(s => s.pass).length}/${steps.length} ผ่าน`);
ws.close();
process.exit(failed ? 1 : 0);
