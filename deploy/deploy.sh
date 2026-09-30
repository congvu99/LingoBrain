#!/usr/bin/env bash
# git pull → build image (tag = commit) → backup DB → thay container → đợi /api/words 200 → lỗi thì quay về bản cũ
# Chạy trên VPS bằng user deploy: bash deploy/deploy.sh  (FORCE=1 để build lại cùng commit)
set -euo pipefail
cd "$(dirname "$0")/.."
exec 9>/tmp/lingobrain-deploy.lock
flock -n 9 || { echo "deploy khác đang chạy"; exit 1; }

git pull --ff-only
TAG=$(git rev-parse --short HEAD)
PREV=$(cat .deployed-tag 2>/dev/null || true)
if [ "$TAG" = "$PREV" ] && [ -z "${FORCE:-}" ]; then echo "already at $TAG, nothing to deploy"; exit 0; fi

IMAGE_TAG=$TAG docker compose build app
if [ -n "$PREV" ]; then bash deploy/backup.sh; fi
IMAGE_TAG=$TAG docker compose up -d --no-build

# /api/words chỉ 200 khi DB sẵn sàng và đã có bộ từ; "/" thì 200 cả khi DB sập nên không dùng để kiểm
for _ in $(seq 1 45); do
  if docker compose exec -T app wget -q -O /dev/null http://127.0.0.1:3000/api/words 2>/dev/null; then
    echo "$TAG" > .deployed-tag
    docker tag "lingobrain:$TAG" lingobrain:latest
    docker images lingobrain --format '{{.Tag}}' | grep -vxE "latest|$TAG|${PREV:-none}" \
      | xargs -r -I{} docker rmi "lingobrain:{}" >/dev/null 2>&1 || true
    echo "deploy ok: $TAG"; exit 0
  fi
  sleep 2
done

docker compose logs --tail 60 app
if [ -n "$PREV" ]; then
  IMAGE_TAG=$PREV docker compose up -d --no-build app
  echo "deploy FAILED ($TAG), rolled back to $PREV"
else
  echo "deploy FAILED ($TAG), chưa có bản cũ để quay về"
fi
exit 1
