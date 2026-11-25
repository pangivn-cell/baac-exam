/* หน้า Product Catalog: ถ้าที่อยู่เว็บมี token ให้เก็บไว้ในส่วนขยาย (ในเครื่องนี้เท่านั้น)
   แท็บนี้เปิดมาจากเว็บสอบ → ส่งลิงก์กลับไปให้ทันทีแล้วปิดแท็บ */
(function () {
  var u = location.href;
  if (!/^https:\/\/psc\.baac\.tech\/\S*[?&]token=[0-9a-f]{16,}/i.test(u)) return;
  chrome.storage.local.set({ psclink: u, at: Date.now() }, function () {
    var o = window.opener;
    if (!o || o.closed) return;
    ['https://baac-smart-que.web.app', 'https://pangivn-cell.github.io', 'http://localhost:8781'].forEach(function (t) {
      try { o.postMessage({ psclink: u }, t); } catch (e) {}
    });
    setTimeout(function () { window.close(); }, 400);
  });
})();
