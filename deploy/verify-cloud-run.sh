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
ROLE="$(printf '%s' "${REGISTER_JSON}" | python3 -c 'import json,sys; print(json.load(sys.stdin)["user"]["role"])')"
KEY_JSON="$(curl -fsS "${API_URL}/api/access-keys" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H 'Content-Type: application/json' \
  --data '{"name":"cloud-run-verify"}')"
ACCESS_KEY="$(printf '%s' "${KEY_JSON}" | python3 -c 'import json,sys; print(json.load(sys.stdin)["access_key"])')"

if [[ "${ROLE}" == "super_admin" ]]; then
  SITE_JSON="$(curl -fsS "${API_URL}/api/sites" \
    -H "X-Access-Key: ${ACCESS_KEY}" \
    -H 'Content-Type: application/json' \
    --data "{\"name\":\"Verify Site ${VERIFY_EMAIL}\",\"slug\":\"verify-site-$(date +%s)\"}")"
else
  SITE_JSON="$(curl -fsS "${API_URL}/api/sites" -H "X-Access-Key: ${ACCESS_KEY}" | python3 -c 'import json,sys; sites=json.load(sys.stdin); print(json.dumps(sites[0] if sites else {}))')"
fi

SITE_ID="$(printf '%s' "${SITE_JSON}" | python3 -c 'import json,sys; obj=json.load(sys.stdin); print(obj.get("id", ""))')"
SITE_SLUG="$(printf '%s' "${SITE_JSON}" | python3 -c 'import json,sys; obj=json.load(sys.stdin); print(obj.get("slug", ""))')"
if [[ -z "${SITE_ID}" ]]; then
  echo "No site available for mutation verification; created credentials only." >&2
  MUTATION_DETAIL="credentials-only"
else
  POST_JSON="$(curl -fsS "${API_URL}/api/sites/${SITE_ID}/posts" \
    -H "X-Access-Key: ${ACCESS_KEY}" \
    -H 'Content-Type: application/json' \
    --data "{\"title\":\"Verify Post\",\"slug\":\"verify-post-$(date +%s)\",\"language\":\"en\",\"markdown_content\":\"# Verify\"}")"
  POST_ID="$(printf '%s' "${POST_JSON}" | python3 -c 'import json,sys; print(json.load(sys.stdin)["id"])')"
  POST_SLUG="$(printf '%s' "${POST_JSON}" | python3 -c 'import json,sys; print(json.load(sys.stdin)["slug"])')"
  curl -fsS "${API_URL}/api/sites/${SITE_ID}/posts/${POST_ID}/publish" \
    -H "X-Access-Key: ${ACCESS_KEY}" \
    -X POST >/dev/null
  curl -fsS "${API_URL}/api/integration/sites/${SITE_SLUG}/posts/${POST_SLUG}?language=en" \
    -H "X-Access-Key: ${ACCESS_KEY}" >/dev/null
  MUTATION_DETAIL="post-publish-integration"
fi

cat <<EOF
Verify complete.
API_URL=${API_URL}
ADMIN_URL=${ADMIN_URL}
RUN_MUTATION_VERIFY=true
VERIFY_EMAIL=${VERIFY_EMAIL}
ROLE=${ROLE}
MUTATION_DETAIL=${MUTATION_DETAIL}
EOF
