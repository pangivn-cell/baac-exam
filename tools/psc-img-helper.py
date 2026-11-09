# ตัวช่วยโหลดรูปจาก Product Catalog (psc.baac.tech) ให้หน้าเว็บสอบ
# ทำไมต้องมี: AI (Gemini/OpenAI/Claude) เข้า psc.baac.tech ไม่ได้ (เว็บเปิดเฉพาะบางเครือข่าย) และเบราว์เซอร์อ่านรูปข้ามเว็บเองไม่ได้ (ไม่มี CORS)
#   → เครื่องนี้โหลดรูปแทน แล้วส่งให้หน้าเว็บที่ http://localhost:8795/img?u=<ลิงก์รูป> หน้าเว็บส่งตัวรูปต่อให้ AI อ่าน
# รับเฉพาะรูปใน psc.baac.tech/wp-content/uploads/ และตอบเฉพาะหน้าเว็บสอบ · เปิดไว้ระหว่างกดอัปเดต แล้วปิดหน้าต่างได้เลย
import http.server, urllib.request, urllib.parse, socketserver, sys

PORT = 8795
ALLOW_ORIGINS = {'https://pangivn-cell.github.io', 'http://localhost:8781', 'http://localhost:8783'}
ALLOW_PREFIX = 'https://psc.baac.tech/wp-content/uploads/'
MAX_BYTES = 15 * 1024 * 1024


class H(http.server.BaseHTTPRequestHandler):
    def cors(self):
        o = self.headers.get('Origin', '')
        if o in ALLOW_ORIGINS:
            self.send_header('Access-Control-Allow-Origin', o)
            self.send_header('Vary', 'Origin')
            # Chrome: หน้าเว็บสาธารณะเรียกเครื่องตัวเอง ต้องตอบ header นี้ด้วย
            self.send_header('Access-Control-Allow-Private-Network', 'true')

    def do_OPTIONS(self):
        self.send_response(204)
        self.cors()
        self.send_header('Access-Control-Allow-Methods', 'GET')
        self.send_header('Access-Control-Allow-Headers', '*')
        self.end_headers()

    def do_GET(self):
        p = urllib.parse.urlparse(self.path)
        if p.path == '/ping':
            return self.reply(200, b'ok', 'text/plain')
        if p.path != '/img':
            return self.reply(404, b'not found', 'text/plain')
        u = urllib.parse.parse_qs(p.query).get('u', [''])[0]
        if not u.startswith(ALLOW_PREFIX) or '..' in u:
            return self.reply(403, b'only psc.baac.tech uploads', 'text/plain')
        try:
            req = urllib.request.Request(urllib.parse.quote(u, safe=':/?&=%#'), headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req, timeout=30) as r:
                ct = r.headers.get('Content-Type', '')
                data = r.read(MAX_BYTES + 1)
            if not ct.startswith('image/') or len(data) > MAX_BYTES:
                return self.reply(415, b'not an image', 'text/plain')
            print('ok', len(data) // 1024, 'KB', u[-60:], flush=True)
            return self.reply(200, data, ct)
        except Exception as e:
            print('fail', u[-60:], e, flush=True)
            return self.reply(502, str(e).encode('utf-8', 'replace'), 'text/plain; charset=utf-8')

    def reply(self, code, body, ct):
        self.send_response(code)
        self.cors()
        self.send_header('Content-Type', ct)
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Cache-Control', 'no-store')
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *a):
        pass


class S(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True


if __name__ == '__main__':
    try:
        srv = S(('127.0.0.1', PORT), H)
    except OSError:
        print('Port %d is busy - the helper is probably already running.' % PORT)
        sys.exit(0)
    print('Product Catalog image helper running on http://localhost:%d' % PORT)
    print('Keep this window open while you press Update on the exam site. Close it when done.')
    srv.serve_forever()
