// Smoke test: ซิงก์คิว/คลังส่วนตัวข้ามเครื่อง (Firestore จำลองในหน่วยความจำ)
// รัน: node tests/smoke-sync.mjs
// ตรวจ: push meta/pages/cards, อีกเครื่อง pull แล้วได้เอกสาร+บัตร+หน้า, lease กันสองเครื่อง,
//       ลบแล้วหายทั้งสองเครื่อง, แบ่งก้อนไม่เกิน 1 MB (นับไบต์จริง)
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = process.env.PORT || '8138';
const APP_URL = process.env.APP_URL || `http://127.0.0.1:${PORT}/index.html`;
const chromeBin = [
  process.env.CHROME_BIN,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  '/usr/bin/google-chrome', '/usr/bin/chromium',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
].find(p => p && existsSync(p));
if (!chromeBin) { console.error('ไม่พบ Chrome — ตั้งค่า CHROME_BIN'); process.exit(2); }

const sleep = ms => new Promise(r => setTimeout(r, ms));
const profile = mkdtempSync(path.join(tmpdir(), 'baac-sync-'));
const server = process.env.APP_URL ? null : spawn(process.env.PYTHON || 'python',
  ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1', '--directory', ROOT], { stdio: 'ignore' });
const chrome = spawn(chromeBin, ['--headless=new', '--disable-gpu', '--no-first-run',
  '--remote-debugging-port=9232', `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' });

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
  try { const l = await (await fetch('http://127.0.0.1:9232/json/list')).json(); const p = l.find(t => t.type === 'page'); if (p) { wsUrl = p.webSocketDebuggerUrl; break; } } catch {}
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
  const wait = ms => new Promise(r => setTimeout(r, ms));
  try {
    // ---------- Firestore จำลอง ----------
    const store = new Map();
    const stamp = () => ({ toMillis: () => Date.now() });
    function applyData(path, data, merge) {
      const cur = store.get(path) || {};
      const nx = merge ? { ...cur } : {};
      for (const [k, v] of Object.entries(data || {})) {
        if (v && v.__serverTimestamp) nx[k] = stamp();
        else if (v && v.__delete) delete nx[k];
        else nx[k] = v;
      }
      store.set(path, nx);
    }
    const snapOf = p => ({ id: p.split('/').pop(), exists: () => store.has(p), data: () => store.get(p) });
    const fs = {
      doc: (db, ...seg) => ({ __ref: seg.join('/') }),
      collection: (db, ...seg) => ({ __col: seg.join('/') }),
      setDoc: async (r, data, o) => applyData(r.__ref, data, o && o.merge),
      getDoc: async r => snapOf(r.__ref),
      getDocs: async q => {
        const pre = q.__col || ''; const out = [];
        for (const [k, v] of store) {
          if (!k.startsWith(pre + '/')) continue;
          const rel = k.slice(pre.length + 1);
          if (rel && !rel.includes('/')) out.push({ id: rel, data: () => v });
        }
        return { docs: out };
      },
      deleteDoc: async r => { for (const k of [...store.keys()]) if (k === r.__ref || k.startsWith(r.__ref + '/')) store.delete(k); },
      query: c => c, where: () => ({}), orderBy: () => ({}), limit: () => ({}),
      serverTimestamp: () => ({ __serverTimestamp: true }),
      Timestamp: { fromMillis: m => ({ toMillis: () => m }) },
      runTransaction: async (db, fn) => {
        const ops = [];
        const tx = {
          get: async r => snapOf(r.__ref),
          set: (r, d, o) => ops.push([r.__ref, d, o]),
          update: (r, d) => ops.push([r.__ref, d, { merge: true }]),
          delete: r => ops.push([r.__ref, null])
        };
        const res = await fn(tx);
        for (const [p, d, o] of ops) { if (d) applyData(p, d, o && o.merge); else store.delete(p); }
        return res;
      }
    };
    window.fb = async () => ({ fs, db: {}, auth: { currentUser: { getIdToken: async () => 'tok' } } });

    // ---------- เครื่อง A: สร้างเอกสาร + บัตร แล้วซิงก์ขึ้น ----------
    ME = { uid: 'u1', name: 'tester', role: 'user' };
    SYNC.dev = 'A'; SYNC.on = false; SYNC.firstPush = true;
    VIEW = 'home';
    DOCS = []; CARDS = []; FIGS.clear(); PFIG.clear();
    const doc = {
      id: 'docA', name: 'ทดสอบ.pdf', sha: 'a'.repeat(64), driveId: 'drv1', srcFile: 'drv1', size: 1234,
      type: 'pdf', unit: 'หน้า', chars: 100, pages: [{ n: 1, text: 'หน้า 1' }, { n: 2, text: 'หน้า 2' }],
      bad: [], figPages: [], group: 'spec', show: true, kind: 'kb', topic: '', noShare: true,
      stage: 'ready', ocrDone: [], digDone: 1, summ: ['สรุป'], err: '', pagesParts: 0, cardsParts: 0,
      figMeta: [{ id: 'F1', page: 1, desc: 'แผนผัง', w: 100, h: 100 }], stored: 'drive', at: Date.now()
    };
    DOCS.push(doc); await saveDoc(doc);
    const card = { id: 'c1', docId: 'docA', title: 'บัตร 1', topic: 'สินเชื่อ', kind: 'นิยาม', fact: 'ความรู้ '.repeat(40), page: 1, imp: 2, at: 1, st: { n: 3 }, emb: new Float32Array([1, 2]), em: 'x', figs: ['F1'] };
    CARDS.push(card); await saveCards([card]);

    await syncPushMeta(doc); await syncPushPages(doc); await syncPushCards(doc);
    const key = 's' + doc.sha, base = 'users/u1/docs/' + key;
    ok('ส่งข้อมูลเอกสารขึ้นคลาวด์', store.has(base));
    let meta = store.get(base);
    ok('สถานะพร้อมใช้', meta.status === 'ready', meta.status);
    ok('แบ่งหน้าเป็นก้อน', meta.pagesParts >= 1, meta.pagesParts);
    ok('แบ่งบัตรเป็นก้อน', meta.cardsParts >= 1, meta.cardsParts);
    ok('เก็บรูปในรายการ meta', (meta.figs || []).length === 1);
    const part0 = store.get(base + '/cards/0');
    ok('ตัด emb/st ออกจากบัตรก่อนซิงก์', part0 && part0.cards[0].emb === undefined && part0.cards[0].st === undefined);
    const bySha = await syncRemoteBySha(doc.sha);
    ok('หาไฟล์เดิมด้วย sha ได้', bySha && bySha.id === key);

    // ---------- เครื่อง B: เปิดเว็บใหม่แล้ว pull ----------
    SYNC.dev = 'B'; SYNC.firstPush = true; DOCS = []; CARDS = []; PFIG.clear(); SYNC.meta = new Map();
    await syncPull(); await wait(500);
    const db = DOCS.find(d => d.id === 'docA');
    ok('เครื่อง B เห็นเอกสาร', !!db);
    ok('เครื่อง B ได้บัตรความรู้', CARDS.some(c => c.id === 'c1'));
    ok('เครื่อง B รู้ว่ามีรูป (ยังไม่โหลดไบต์)', PFIG.has('F1'));
    ok('เครื่อง B เห็นสถานะพร้อมใช้', db && db.stage === 'ready', db && db.stage);
    await ensureDocPages(db);
    ok('เครื่อง B โหลดข้อความหน้าเมื่อต้องใช้', db.pages.length === 2, db.pages.length);

    // ---------- รูปประกอบ: A ส่งขึ้น B ดึงเมื่อต้องแสดง ----------
    SYNC.dev = 'A'; DOCS = [doc]; CARDS = [card];
    const cv = document.createElement('canvas'); cv.width = 8; cv.height = 8; cv.getContext('2d').fillRect(0, 0, 8, 8);
    const blob = await new Promise(r => cv.toBlob(r, 'image/png'));
    await saveFigs([{ id: 'F2', docId: 'docA', page: 2, mime: 'image/png', blob, desc: 'กราฟทดสอบ', w: 8, h: 8, at: Date.now() }]);
    await syncPushFigs(doc);
    ok('ส่งรูปขึ้นคลาวด์', store.has('users/u1/figs/F2'));
    SYNC.dev = 'B'; DOCS = [db]; CARDS = [];
    const gotFig = await fetchPersonalFig('F2');
    ok('เครื่อง B ดึงรูปมาแสดงได้', gotFig && FIGS.has('F2'));

    // ---------- แก้บัตรที่ A → B เห็นข้อความใหม่ ----------
    SYNC.dev = 'A'; DOCS = [doc]; CARDS = [card];
    card.fact = 'ข้อความที่แก้ไขแล้ว ' + 'ใหม่ '.repeat(20); card.editedAt = Date.now() + 1000;
    await saveCards([card]); await syncPushCards(doc, true);
    SYNC.dev = 'B'; SYNC.firstPush = true; DOCS = [db]; CARDS = [];
    await syncPull(); await wait(400);
    const edited = CARDS.find(c => c.id === 'c1');
    ok('เครื่อง B ได้บัตรที่แก้ไขล่าสุด', edited && edited.fact.includes('แก้ไขแล้ว'));

    // ---------- ลบบัตรที่ A → B หายตาม ----------
    SYNC.dev = 'A'; DOCS = [doc]; CARDS = [];
    doc.delCards = ['c1']; await saveDoc(doc); await syncPushCards(doc, true);
    SYNC.dev = 'B'; SYNC.firstPush = true; DOCS = [db];
    await syncPull(); await wait(400);
    ok('เครื่อง B ลบบัตรตาม', !CARDS.some(c => c.id === 'c1'));

    // ---------- lease: A กำลังทำ B ต้องรอ ----------
    DOCS = [db]; CARDS = [];
    await fs.setDoc({ __ref: base }, { stage: 'digest', status: 'processing' }, { merge: true });
    SYNC.dev = 'A'; const cA = await syncClaim(db);
    ok('เครื่อง A จองงานได้', cA.ok);
    SYNC.dev = 'B'; const cB = await syncClaim(db);
    ok('เครื่อง B ถูกกันไม่ให้ทำซ้ำ', !cB.ok && cB.lease === true, JSON.stringify(cB));
    const m2 = store.get(base); m2.leaseAt = Date.now() - 4 * 60000;
    const cB2 = await syncClaim(db);
    ok('lease หมดอายุแล้ว B รับงานต่อได้', cB2.ok === true);

    // ---------- ลบจากเครื่อง A → หายจากเครื่อง B ----------
    SYNC.dev = 'A'; db.pagesParts = (store.get(base) || {}).pagesParts || 1; db.cardsParts = (store.get(base) || {}).cardsParts || 1;
    await syncDeleteDoc(db);
    ok('เขียน tombstone', (store.get(base) || {}).deleted === true);
    SYNC.dev = 'B'; SYNC.firstPush = true; DOCS = []; CARDS = []; await syncPull();
    ok('เครื่อง B ลบเอกสารตาม', !DOCS.some(d => d.id === 'docA'));

    // ---------- เอกสารที่ยังไม่โหลดหน้า/บัตร ห้ามซิงก์ทับจนของเดิมหาย ----------
    const ro = { id: 'r1', name: 'remote.pdf', sha: 'c'.repeat(64), pages: [], pagesParts: 1, pagesRemote: true, cardsParts: 1, cardsRemote: true, stage: 'ready', group: 'spec', show: true, kind: 'kb', unit: 'หน้า', ownerUid: 'u1', at: Date.now() };
    DOCS = [ro];
    await fs.setDoc({ __ref: 'users/u1/docs/s' + ro.sha + '/pages/0' }, { pages: [{ n: 1, text: 'หน้าเดิม' }] }, {});
    await fs.setDoc({ __ref: 'users/u1/docs/s' + ro.sha + '/cards/0' }, { cards: [{ id: 'rc1', docId: 'r1', title: 'เดิม', fact: 'เดิม', type: 'kb', at: 1 }] }, {});
    await syncPushPages(ro); await syncPushCards(ro, true);
    ok('ไม่ลบหน้าของเดิมก่อนโหลด', store.has('users/u1/docs/s' + ro.sha + '/pages/0'));
    ok('ไม่ลบบัตรของเดิมก่อนโหลด', store.has('users/u1/docs/s' + ro.sha + '/cards/0'));

    // ---------- แบ่งก้อนไบต์จริง: ข้อความไทย 3 ไบต์/ตัว ----------
    const big = { id: 'docBig', name: 'ใหญ่.pdf', sha: 'b'.repeat(64), pages: [], stage: 'digest', group: 'spec', show: true, kind: 'kb', unit: 'หน้า', at: Date.now() };
    for (let i = 1; i <= 120; i++) big.pages.push({ n: i, text: 'ก'.repeat(5000) });
    await syncPushPages(big);
    const bmeta = store.get('users/u1/docs/s' + big.sha);
    ok('เอกสารใหญ่ถูกแบ่งหลายก้อน', (bmeta.pagesParts || 0) > 1, bmeta.pagesParts);
    let maxPart = 0;
    for (let i = 0; i < (bmeta.pagesParts || 0); i++) {
      const p = store.get('users/u1/docs/s' + big.sha + '/pages/' + i);
      maxPart = Math.max(maxPart, new TextEncoder().encode(JSON.stringify(p)).length);
    }
    ok('แต่ละก้อนไม่เกิน 1 MB', maxPart < 1048576, maxPart);
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
