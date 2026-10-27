/**
 * Baac_Exam — ตัวรับไฟล์ต้นฉบับขึ้น Google Drive (ติดตั้ง 1 ชุดต่อ 1 บัญชี Google ที่ใช้เก็บไฟล์)
 *
 * ติดตั้ง
 * 1. ล็อกอินบัญชี Google เจ้าของโฟลเดอร์ แล้วเปิด https://script.google.com → โครงการใหม่ → วางไฟล์นี้แทนของเดิม
 * 2. ตั้งค่าโครงการ (รูปเฟือง) → Script properties เพิ่ม
 *      FOLDER_ID         รหัสโฟลเดอร์ที่จะเก็บไฟล์ (ส่วนท้ายของลิงก์ .../folders/<รหัส>)
 *      FIREBASE_API_KEY  AIzaSyD5w5BpdC_26Vm8hKXvuy6TUGWHY74yHZo
 * 3. ทำให้ใช้งานได้ → การทำให้ใช้งานได้รายการใหม่ → ประเภท เว็บแอป
 *      เรียกใช้ในฐานะ: ฉัน   ·   ผู้ที่มีสิทธิ์เข้าถึง: ทุกคน
 *    กดอนุญาตสิทธิ์ (ไดรฟ์ + เชื่อมต่อภายนอก) แล้วคัดลอก URL ของเว็บแอปไปวางในหน้า "ข้อมูลในคลังกลาง" ของเว็บ
 *
 * ทำอะไร
 * - GET  ?a=quota            บอกพื้นที่ที่ใช้/ทั้งหมดของบัญชีนี้ เว็บใช้เลือกว่าจะส่งไฟล์ไปบัญชีไหน (เต็มแล้วใช้ตัวสำรอง)
 * - GET  ?a=list&t=<token>   รายชื่อไฟล์ในโฟลเดอร์ (ผู้ที่ล็อกอินเว็บเท่านั้น)
 * - GET  ?a=file&id=&off=&t=  อ่านไฟล์ทีละ 8 MB เพื่อเปิดหน้าที่อ้างอิง (เฉพาะไฟล์ในโฟลเดอร์นี้) โฟลเดอร์จึงไม่ต้องแชร์สาธารณะ
 * - POST {a:'start',...}     ตรวจว่าผู้ส่งล็อกอินเว็บจริง ตรวจพื้นที่ว่าง แล้วเปิดการอัปโหลดแบบแบ่งส่ง
 * - POST {a:'chunk',...}     รับไฟล์ทีละส่วน (ไฟล์ใหญ่ส่งได้) ส่วนสุดท้ายได้รหัสไฟล์กลับไป
 * ไฟล์ชื่อซ้ำในโฟลเดอร์จะไม่อัปโหลดซ้ำ ใช้ไฟล์เดิม
 */
const MARGIN = 50 * 1024 * 1024; // เผื่อพื้นที่ไว้ 50 MB

function props_() { return PropertiesService.getScriptProperties(); }
function out_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

function quota_() {
  const limit = DriveApp.getStorageLimit(), used = DriveApp.getStorageUsed();
  return { limit: limit, used: used, free: limit > 0 ? limit - used : -1 };
}

function doGet(e) {
  try {
    const a = (e && e.parameter && e.parameter.a) || 'quota';
    if (a === 'list' || a === 'file' || a === 'findsha') verify_(e.parameter.t);
    if (a === 'list') {                      // รายชื่อไฟล์ทั้งหมดในโฟลเดอร์ (รวมโฟลเดอร์ย่อย)
      const files = [], walk = (f, depth) => {
        const it = f.getFiles(); while (it.hasNext()) { const x = it.next(); files.push({ id: x.getId(), name: x.getName(), mimeType: x.getMimeType(), size: x.getSize() }); }
        if (depth < 5) { const sub = f.getFolders(); while (sub.hasNext()) walk(sub.next(), depth + 1); }
      };
      walk(DriveApp.getFolderById(props_().getProperty('FOLDER_ID')), 0);
      return out_({ ok: true, files: files });
    }
    if (a === 'file') {                      // อ่านไฟล์ทีละส่วน (ส่งเป็น base64) เพื่อเปิดหน้าที่อ้างอิง
      const id = e.parameter.id, off = +e.parameter.off || 0, len = Math.min(+e.parameter.len || 8388608, 8388608);
      const f = DriveApp.getFileById(id), size = f.getSize();
      if (!inFolder_(f)) return out_({ ok: false, error: 'ไฟล์นี้ไม่ได้อยู่ในโฟลเดอร์ต้นฉบับ' });
      const r = UrlFetchApp.fetch('https://www.googleapis.com/drive/v3/files/' + id + '?alt=media&supportsAllDrives=true', {
        headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken(), Range: 'bytes=' + off + '-' + Math.min(size - 1, off + len - 1) }, muteHttpExceptions: true });
      if (r.getResponseCode() >= 300) return out_({ ok: false, error: 'อ่านไฟล์ไม่ได้ (' + r.getResponseCode() + ')' });
      const bytes = r.getContent();
      return out_({ ok: true, size: size, off: off, data: Utilities.base64Encode(bytes), mime: f.getMimeType(), name: f.getName() });
    }
    if (a === 'findsha') {                 // หาไฟล์เดิมจากลายนิ้วมือ SHA-256 ที่เก็บใน description (กันอัปโหลดซ้ำ)
      const sha = String(e.parameter.sha || '');
      if (!sha) return out_({ ok: false, error: 'missing sha' });
      let found = null;
      const walk = (f, depth) => {
        const it = f.getFiles();
        while (it.hasNext() && !found) { const x = it.next(); if (String(x.getDescription() || '') === 'baac:' + sha) found = { id: x.getId(), name: x.getName(), size: x.getSize(), mimeType: x.getMimeType() }; }
        if (!found && depth < 5) { const sub = f.getFolders(); while (sub.hasNext() && !found) walk(sub.next(), depth + 1); }
      };
      walk(DriveApp.getFolderById(props_().getProperty('FOLDER_ID')), 0);
      return out_(found ? Object.assign({ ok: true }, found) : { ok: false });
    }
    if (a === 'quota') {
      const folder = DriveApp.getFolderById(props_().getProperty('FOLDER_ID'));
      return out_(Object.assign({ ok: true, folder: folder.getId(), name: folder.getName() }, quota_()));
    }
    return out_({ ok: false, error: 'unknown action' });
  } catch (err) { return out_({ ok: false, error: String(err && err.message || err) }); }
}

/* ผู้ส่งต้องล็อกอินเว็บ Baac_Exam (Firebase) — ตรวจ ID token กับ Google */
function verify_(idToken) {
  if (!idToken) throw new Error('ต้องเข้าสู่ระบบก่อน');
  const key = props_().getProperty('FIREBASE_API_KEY');
  const r = UrlFetchApp.fetch('https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=' + key, {
    method: 'post', contentType: 'application/json', payload: JSON.stringify({ idToken: idToken }), muteHttpExceptions: true });
  const j = JSON.parse(r.getContentText() || '{}');
  if (r.getResponseCode() !== 200 || !j.users || !j.users.length) throw new Error('ยืนยันผู้ใช้ไม่ผ่าน ลองออกจากระบบแล้วเข้าใหม่');
  return j.users[0].localId;
}

/* อ่านได้เฉพาะไฟล์ที่อยู่ใต้โฟลเดอร์ต้นฉบับ (กันไม่ให้ใช้สคริปต์นี้เปิดไฟล์อื่นใน Drive) */
function inFolder_(file) {
  const root = props_().getProperty('FOLDER_ID'), seen = {};
  const q = []; let it = file.getParents(); while (it.hasNext()) q.push(it.next());
  while (q.length) { const f = q.shift(); if (f.getId() === root) return true; if (seen[f.getId()]) continue; seen[f.getId()] = 1;
    const p = f.getParents(); while (p.hasNext()) q.push(p.next()); }
  return false;
}

function doPost(e) {
  try {
    const b = JSON.parse(e.postData.contents || '{}');
    verify_(b.idToken);
    const folderId = props_().getProperty('FOLDER_ID'), folder = DriveApp.getFolderById(folderId);
    if (b.a === 'start') {
      const name = String(b.name || 'file.pdf').slice(0, 200), size = +b.size || 0, sha = String(b.sha || '');
      /* ชื่อซ้ำ: ใช้ไฟล์เดิมเฉพาะเมื่อเป็นไฟล์เดียวกันจริง (sha ตรง) หรือผู้เรียกเวอร์ชันเก่าไม่ส่ง sha มา
         ไฟล์ที่แก้ไขแล้วแต่ใช้ชื่อเดิมจะได้ไฟล์ใหม่ ไม่ทำให้เนื้อหาที่อ่านได้เป็นของเก่า */
      const same = folder.getFilesByName(name);
      let first = null, match = null;
      while (same.hasNext()) {
        const f = same.next(); if (!first) first = f;
        if (sha && String(f.getDescription() || '') === 'baac:' + sha) { match = f; break; }
      }
      if (match) return out_({ ok: true, done: true, id: match.getId(), name: name, existed: true });
      if (first && !sha) return out_({ ok: true, done: true, id: first.getId(), name: name, existed: true });
      const q = quota_();
      if (q.free >= 0 && q.free < size + MARGIN) return out_({ ok: false, full: true, free: q.free });
      const r = UrlFetchApp.fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&supportsAllDrives=true', {
        method: 'post', contentType: 'application/json; charset=UTF-8',
        headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken(), 'X-Upload-Content-Type': b.mime || 'application/pdf', 'X-Upload-Content-Length': String(size) },
        payload: JSON.stringify({ name: name, parents: [folderId] }), muteHttpExceptions: true });
      const loc = r.getHeaders()['Location'] || r.getHeaders()['location'];
      if (!loc) return out_({ ok: false, error: 'เปิดการอัปโหลดไม่ได้: ' + r.getContentText().slice(0, 200) });
      return out_({ ok: true, session: loc });
    }
    if (b.a === 'chunk') {
      const bytes = Utilities.base64Decode(b.data), from = +b.offset, total = +b.total;
      const r = UrlFetchApp.fetch(b.session, {
        method: 'put', contentType: b.mime || 'application/pdf', payload: bytes, muteHttpExceptions: true,
        headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken(), 'Content-Range': 'bytes ' + from + '-' + (from + bytes.length - 1) + '/' + total } });
      const code = r.getResponseCode();
      if (code === 308) return out_({ ok: true, next: from + bytes.length });
      if (code === 200 || code === 201) {
        const f = JSON.parse(r.getContentText());
        try { const file = DriveApp.getFileById(f.id); file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); if (b.sha) file.setDescription('baac:' + String(b.sha)); } catch (x) {}
        return out_({ ok: true, done: true, id: f.id, name: f.name });
      }
      return out_({ ok: false, error: 'ส่งไฟล์ไม่สำเร็จ (' + code + '): ' + r.getContentText().slice(0, 200) });
    }
    return out_({ ok: false, error: 'unknown action' });
  } catch (err) { return out_({ ok: false, error: String(err && err.message || err) }); }
}
