#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="${PROJECT_ID:-$(gcloud config get-value project 2>/dev/null)}"
REGION="${REGION:-us-central1}"
API_SERVICE="${API_SERVICE:-blogger-api}"
ADMIN_SERVICE="${ADMIN_SERVICE:-blogger-admin}"
RUN_MUTATION_VERIFY="${RUN_MUTATION_VERIFY:-false}"

if [[ -z "${PROJECT_ID}" ]]; then
  echo "PROJECT_ID is required" >&2
  exit 1
fi

run_url() {
  local service="$1"
  gcloud run services describe "${service}" --region "${REGION}" --format=json | python3 -c 'import json,sys
obj=json.load(sys.stdin)
raw=obj.get("metadata", {}).get("annotations", {}).get("run.googleapis.com/urls", "[]")
urls=json.loads(raw)
print(urls[0] if urls else obj.get("status", {}).get("url", ""))'
}

API_URL="$(run_url "${API_SERVICE}")"
ADMIN_URL="$(run_url "${ADMIN_SERVICE}")"

curl -fsS "${API_URL}/api/healthz"
curl -fsS "${ADMIN_URL}/__health"

if [[ "${RUN_MUTATION_VERIFY}" != "true" ]]; then
  cat <<EOF
Verify complete.
API_URL=${API_URL}
ADMIN_URL=${ADMIN_URL}
RUN_MUTATION_VERIFY=false
EOF
  exit 0
fi

VERIFY_EMAIL="verify+$(date +%s)@example.com"
VERIFY_PASSWORD="$(openssl rand -hex 12)"
REGISTER_JSON="$(curl -fsS "${API_URL}/api/auth/register" \
  -H 'Content-Type: application/json' \
  --data "{\"email\":\"${VERIFY_EMAIL}\",\"password\":\"${VERIFY_PASSWORD}\",\"nickname\":\"Verify\"}")"
TOKEN="$(printf '%s' "${REGISTER_JSON}" | python3 -c 'import json,sys; print(json.load(sys.stdin)["access_token"])')"
KEY_JSON="$(curl -fsS "${API_URL}/api/access-keys" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H 'Content-Type: application/json' \
  --data '{"name":"cloud-run-verify"}')"
ACCESS_KEY="$(printf '%s' "${KEY_JSON}" | python3 -c 'import json,sys; print(json.load(sys.stdin)["access_key"])')"
SITE_JSON="$(curl -fsS "${API_URL}/api/sites" \
  -H "X-Access-Key: ${ACCESS_KEY}" \
  -H 'Content-Type: application/json' \
  --data '{"name":"Verify Site","slug":"verify-site"}')"
SITE_ID="$(printf '%s' "${SITE_JSON}" | python3 -c 'import json,sys; print(json.load(sys.stdin)["id"])')"
curl -fsS "${API_URL}/api/sites/${SITE_ID}/posts" \
  -H "X-Access-Key: ${ACCESS_KEY}" \
  -H 'Content-Type: application/json' \
  --data '{"title":"Verify Post","slug":"verify-post","status":"published","markdown_content":"# Verify"}' >/dev/null
curl -fsS "${API_URL}/api/integration/sites/verify-site/posts/verify-post" \
  -H "X-Access-Key: ${ACCESS_KEY}" >/dev/null

cat <<EOF
Verify complete.
API_URL=${API_URL}
ADMIN_URL=${ADMIN_URL}
RUN_MUTATION_VERIFY=true
VERIFY_EMAIL=${VERIFY_EMAIL}
EOF
