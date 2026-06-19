# Blogger API Change Sync Agent

Use this agent workflow whenever a change touches backend request or response contracts.

## Trigger

Run this workflow for any change under:

- `backend/app/models.py`
- `backend/app/schemas.py`
- `backend/app/routers/**`
- API authentication, roles, uploads, pagination, or integration response fields

## Required Sync Checklist

1. Update backend tests in `backend/tests`.
2. Update admin API types and calls:
   - `admin/src/types.ts`
   - `admin/src/lib/api.ts`
   - affected hooks/features
3. Update CLI source and generated package output:
   - `cli/src/index.ts`
   - `cli/src/api.ts` when auth, headers, uploads, or body formats change
   - run `npm run typecheck && npm run build` in `cli`
4. Update skills:
   - `skills/blogger-integration` for website integration API changes
   - `skills/blogger-operator` for CLI behavior changes
5. Update deployment or environment docs when new env vars, cloud resources, or IAM permissions are required.
6. Verify:
   - `cd backend && pytest -q`
   - `cd cli && npm run typecheck && npm run build`
   - `cd admin && pnpm lint && pnpm build`

## Completion Rule

Do not mark an API contract change complete until backend, admin, CLI, and skills all reflect the same request/response shape and the verification commands pass.
