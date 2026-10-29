#!/bin/sh
# ใช้ก่อนขึ้นเว็บทุกครั้ง: เปลี่ยนเลขเวอร์ชัน (BUILD และ ?v= ของไฟล์ css/js) ให้เบราว์เซอร์โหลดไฟล์ใหม่
# วิธีใช้: sh bump.sh 2026-10-22a        (เปลี่ยน BUILD + ?v= ของ css/js)
#         sh bump.sh 2026-10-22a 2.2     (เปลี่ยนเวอร์ชันที่ผู้ใช้เห็นด้วย)
v="$1"; av="$2"; [ -n "$v" ] || { echo "usage: sh bump.sh <build> [appver เช่น 2.1]"; exit 1; }
sed -i -E "s/^const BUILD='[^']*'/const BUILD='$v'/; s/\?v=[0-9A-Za-z._-]+\"/?v=$v\"/g" index.html
[ -n "$av" ] && sed -i -E "s/^const APP_VER='[^']*'/const APP_VER='$av'/" index.html
grep -c "$v" index.html
