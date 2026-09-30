#!/usr/bin/env bash
# dump DB (bỏ dữ liệu cache TTS, server tự tạo lại) → /srv/backups/lingobrain, giữ 14 ngày
set -euo pipefail
cd "$(dirname "$0")/.."
DIR=/srv/backups/lingobrain
mkdir -p "$DIR"
F="$DIR/lingobrain-$(date +%Y%m%d-%H%M%S).dump"
docker compose exec -T db pg_dump -U lingo -d lingobrain -Fc --exclude-table-data=tts_clips > "$F.tmp"
mv "$F.tmp" "$F"
chmod 600 "$F"
find "$DIR" -name 'lingobrain-*.dump' -mtime +14 -delete
echo "backup ok: $F ($(du -h "$F" | cut -f1))"
