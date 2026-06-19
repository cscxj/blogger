# Blogger

Shared blog service for product websites. The repo contains:

- `backend`: FastAPI + SQLAlchemy API backed by Postgres.
- `admin`: React + Tailwind + shadcn-style management UI.
- `cli`: TypeScript npm CLI for operators and AI tools.
- `skills/blogger-integration`: Codex skill for product-site integration.
- `deploy`: Google Cloud deployment scripts and Cloud Run descriptors.

## Local Development

Start Postgres:

```bash
docker compose up -d postgres
```

Run the API:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp ../.env.example .env
uvicorn app.main:app --reload --port 8000
```

Run the admin app:

```bash
cd admin
npm install
npm run dev -- --host 0.0.0.0
```

Run the CLI from source:

```bash
cd cli
npm install
npm run build
node dist/index.js --help
```

## Authentication

The admin app uses email/password login and receives a JWT. The CLI and product-site integration use an AccessKey.

Supported AccessKey headers:

```http
X-Access-Key: blog_sk_...
```

or:

```http
Authorization: Bearer blog_sk_...
```

## Public Integration API

Product websites should use the skill in `skills/blogger-integration`. The stable read path is:

- `GET /api/integration/sites/{site_slug}/posts`
- `GET /api/integration/sites/{site_slug}/posts/{post_slug}`
- `GET /api/integration/sites/{site_slug}/categories`

These endpoints return published content only and require an AccessKey belonging to the site owner.

## Google Cloud

The deploy scripts assume:

- Cloud Run for `blogger-api` and `blogger-admin`.
- Cloud SQL Postgres for database storage.
- Secret Manager for `DATABASE_URL`, `SECRET_KEY`, and `ACCESS_KEY_PEPPER`.
- Artifact Registry for container images.

Deploy from an authenticated `gcloud` shell:

```bash
PROJECT_ID="$(gcloud config get-value project)" REGION=us-central1 ./deploy/bootstrap-gcp.sh
PROJECT_ID="$(gcloud config get-value project)" REGION=us-central1 ./deploy/deploy-cloud-run.sh
```
