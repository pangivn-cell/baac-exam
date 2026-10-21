#!/bin/sh
# ใช้ก่อนขึ้นเว็บทุกครั้ง: เปลี่ยนเลขเวอร์ชัน (BUILD และ ?v= ของไฟล์ css/js) ให้เบราว์เซอร์โหลดไฟล์ใหม่
# วิธีใช้: sh bump.sh 2026-10-22a
v="$1"; [ -n "$v" ] || { echo "usage: sh bump.sh <version>"; exit 1; }
sed -i -E "s/^const BUILD='[^']*'/const BUILD='$v'/; s/\?v=[0-9A-Za-z._-]+\"/?v=$v\"/g" index.html
grep -c "$v" index.html
