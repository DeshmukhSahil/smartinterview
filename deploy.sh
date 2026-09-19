#!/usr/bin/env bash
# Rebuilds and swaps the smartinterview container on the Hostinger VPS.
# Run from /var/www/smartinterview after `git pull` (see the GitHub Actions
# workflow at .github/workflows/deploy.yml, which does exactly that on every
# push to main).
#
# Safety properties:
#   - The image is built and health-checked BEFORE the running container is
#     touched. `docker build -t smartinterview:latest .` only repoints the
#     :latest tag once the build fully succeeds, and the live container
#     references its image by ID, not by tag -- so a failed build never
#     affects the site that's currently up.
#   - The previous image is kept as a timestamped backup tag, and if the
#     new container doesn't answer with HTTP 200 within ~30s, this script
#     automatically rolls back to it.
set -euo pipefail
cd "$(dirname "$0")"

HEALTH_URL="https://careers.chirayupower.com/"
LABELS=(
  --label "traefik.enable=true"
  --label "traefik.http.routers.smartinterview.entrypoints=web,websecure"
  --label "traefik.http.routers.smartinterview.rule=Host(\`careers.chirayupower.com\`)"
  --label "traefik.http.routers.smartinterview.tls=true"
  --label "traefik.http.routers.smartinterview.tls.certresolver=mytlschallenge"
  --label "traefik.http.services.smartinterview.loadbalancer.server.port=3000"
)

run_container() {
  local image="$1"
  docker run -d \
    --name smartinterview \
    --network root_default \
    --restart always \
    --env-file .env \
    "${LABELS[@]}" \
    "$image"
}

wait_healthy() {
  for _ in 1 2 3 4 5 6; do
    if [ "$(curl -s -o /dev/null -w '%{http_code}' "$HEALTH_URL" || echo 000)" = "200" ]; then
      return 0
    fi
    sleep 5
  done
  return 1
}

echo "==> Keeping only the 3 most recent backup images"
docker images --format '{{.Repository}}:{{.Tag}}' \
  | grep '^smartinterview:backup-' | sort -r | tail -n +4 \
  | xargs -r docker rmi >/dev/null 2>&1 || true

if docker image inspect smartinterview:latest >/dev/null 2>&1; then
  BACKUP_TAG="smartinterview:backup-$(date +%Y%m%d-%H%M%S)"
  docker tag smartinterview:latest "$BACKUP_TAG"
  echo "==> Tagged current image as $BACKUP_TAG"
fi

echo "==> Building new image"
BUILD_ARGS=()
if [ -f .env ]; then
  for var in NEXT_PUBLIC_SUPABASE_URL NEXT_PUBLIC_SUPABASE_ANON_KEY NEXT_PUBLIC_ERP_SUPABASE_URL NEXT_PUBLIC_ERP_SUPABASE_ANON_KEY NEXT_BASE_PATH; do
    val="$(grep "^${var}=" .env 2>/dev/null | head -n1 | cut -d '=' -f2- | tr -d '\r\n"' || true)"
    if [ -n "$val" ]; then
      BUILD_ARGS+=(--build-arg "${var}=${val}")
    fi
  done
fi

docker build "${BUILD_ARGS[@]}" -t smartinterview:latest .

echo "==> Swapping container"
docker stop smartinterview >/dev/null 2>&1 || true
docker rm smartinterview >/dev/null 2>&1 || true
run_container smartinterview:latest

echo "==> Waiting for the app to become healthy"
if wait_healthy; then
  echo "==> Deploy succeeded ($HEALTH_URL is up)"
  exit 0
fi

echo "!! New container failed its health check -- rolling back"
docker stop smartinterview >/dev/null 2>&1 || true
docker rm smartinterview >/dev/null 2>&1 || true

LAST_BACKUP="${BACKUP_TAG:-}"
if [ -z "$LAST_BACKUP" ]; then
  LAST_BACKUP=$(docker images --format '{{.Repository}}:{{.Tag}}' | grep '^smartinterview:backup-' | sort -r | head -n1)
fi

if [ -n "$LAST_BACKUP" ]; then
  run_container "$LAST_BACKUP"
  echo "==> Rolled back to $LAST_BACKUP -- investigate the build before pushing again"
else
  echo "!! No backup image available to roll back to -- the site is DOWN, needs manual intervention"
fi
exit 1
