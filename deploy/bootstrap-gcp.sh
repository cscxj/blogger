#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="${PROJECT_ID:-$(gcloud config get-value project 2>/dev/null)}"
REGION="${REGION:-us-central1}"
REPOSITORY="${REPOSITORY:-blogger}"
INSTANCE="${INSTANCE:-blogger-postgres}"
DB_NAME="${DB_NAME:-blogger}"
DB_USER="${DB_USER:-blogger}"
ASSET_BUCKET="${ASSET_BUCKET:-${PROJECT_ID}-blogger-assets}"

if [[ -z "${PROJECT_ID}" ]]; then
  echo "PROJECT_ID is required" >&2
  exit 1
fi

gcloud config set project "${PROJECT_ID}" >/dev/null

gcloud services enable \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com \
  run.googleapis.com \
  secretmanager.googleapis.com \
  storage.googleapis.com \
  sqladmin.googleapis.com

if ! gcloud artifacts repositories describe "${REPOSITORY}" --location "${REGION}" >/dev/null 2>&1; then
  gcloud artifacts repositories create "${REPOSITORY}" \
    --repository-format=docker \
    --location="${REGION}" \
    --description="Blogger container images"
fi

if ! gcloud sql instances describe "${INSTANCE}" >/dev/null 2>&1; then
  gcloud sql instances create "${INSTANCE}" \
    --database-version=POSTGRES_16 \
    --edition=ENTERPRISE \
    --tier=db-f1-micro \
    --region="${REGION}" \
    --storage-size=10GB \
    --storage-type=SSD \
    --availability-type=ZONAL
fi

if ! gcloud sql databases describe "${DB_NAME}" --instance="${INSTANCE}" >/dev/null 2>&1; then
  gcloud sql databases create "${DB_NAME}" --instance="${INSTANCE}"
fi

if ! gcloud storage buckets describe "gs://${ASSET_BUCKET}" >/dev/null 2>&1; then
  gcloud storage buckets create "gs://${ASSET_BUCKET}" \
    --location="${REGION}" \
    --uniform-bucket-level-access
fi

gcloud storage buckets add-iam-policy-binding "gs://${ASSET_BUCKET}" \
  --member=allUsers \
  --role=roles/storage.objectViewer >/dev/null

DB_PASSWORD_SECRET="${DB_PASSWORD_SECRET:-blogger-db-password}"
SECRET_KEY_SECRET="${SECRET_KEY_SECRET:-blogger-secret-key}"
ACCESS_KEY_PEPPER_SECRET="${ACCESS_KEY_PEPPER_SECRET:-blogger-access-key-pepper}"
DATABASE_URL_SECRET="${DATABASE_URL_SECRET:-blogger-database-url}"

ensure_secret() {
  local name="$1"
  local value="$2"
  if ! gcloud secrets describe "${name}" >/dev/null 2>&1; then
    printf '%s' "${value}" | gcloud secrets create "${name}" --data-file=-
  fi
}

DB_PASSWORD="$(openssl rand -hex 24)"
ensure_secret "${DB_PASSWORD_SECRET}" "${DB_PASSWORD}"
DB_PASSWORD="$(gcloud secrets versions access latest --secret="${DB_PASSWORD_SECRET}")"

if ! gcloud sql users list --instance="${INSTANCE}" --format='value(name)' | grep -qx "${DB_USER}"; then
  gcloud sql users create "${DB_USER}" --instance="${INSTANCE}" --password="${DB_PASSWORD}"
else
  gcloud sql users set-password "${DB_USER}" --instance="${INSTANCE}" --password="${DB_PASSWORD}"
fi

ensure_secret "${SECRET_KEY_SECRET}" "$(openssl rand -hex 32)"
ensure_secret "${ACCESS_KEY_PEPPER_SECRET}" "$(openssl rand -hex 32)"

CONNECTION_NAME="${PROJECT_ID}:${REGION}:${INSTANCE}"
DATABASE_URL="postgresql+psycopg://${DB_USER}:${DB_PASSWORD}@/${DB_NAME}?host=/cloudsql/${CONNECTION_NAME}"

if ! gcloud secrets describe "${DATABASE_URL_SECRET}" >/dev/null 2>&1; then
  printf '%s' "${DATABASE_URL}" | gcloud secrets create "${DATABASE_URL_SECRET}" --data-file=-
else
  printf '%s' "${DATABASE_URL}" | gcloud secrets versions add "${DATABASE_URL_SECRET}" --data-file=-
fi

cat <<EOF
Bootstrap complete.
PROJECT_ID=${PROJECT_ID}
REGION=${REGION}
REPOSITORY=${REPOSITORY}
INSTANCE=${INSTANCE}
CONNECTION_NAME=${CONNECTION_NAME}
ASSET_BUCKET=${ASSET_BUCKET}
EOF
