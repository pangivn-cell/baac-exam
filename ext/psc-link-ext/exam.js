/* หน้าเว็บสอบ: บอกหน้าเว็บว่ามีส่วนขยาย และส่งลิงก์ Product Catalog ล่าสุดให้ (ตอนเปิดหน้า และทุกครั้งที่ได้ลิงก์ใหม่) */
(function () {
  document.documentElement.setAttribute('data-pscext', '1');
  function give(u, live) {
    if (!u) return;
    var fire = function () { window.dispatchEvent(new CustomEvent('psclink-ext', { detail: (live ? '1|' : '0|') + u })); };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { setTimeout(fire, 0); });
    else fire();
  }
  chrome.storage.local.get('psclink', function (r) { give(r && r.psclink, false); });
  chrome.storage.onChanged.addListener(function (c, area) {
    if (area === 'local' && c.psclink && c.psclink.newValue) give(c.psclink.newValue, true);
  });
})();
