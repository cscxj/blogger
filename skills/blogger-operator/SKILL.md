---
name: blogger-operator
description: Operate the shared Blogger system through the npm CLI for blog operations. Use when Codex or another AI tool needs to create, edit, publish, unpublish, list, filter, or delete posts; manage categories; upload cover/avatar images; create or revoke AccessKeys; inspect sites; or perform super-admin-only user and site management using an AccessKey.
---

# Blogger Operator

Use the `blogger` npm CLI for operations instead of calling HTTP endpoints by hand.

## Configuration Gate

Before running any CLI command that contacts the API, confirm the required runtime configuration with the user. Do not infer it from localhost defaults, repository examples, or an existing CLI config unless the user explicitly says to use that exact configured environment.

Before this gate is satisfied, only run non-network commands such as `--help`, package install/build commands, or static file inspection.

Required values:

- API URL: ask for `BLOGGER_API_URL` or `--api-url`. Never default to `http://localhost:8000` unless the user explicitly says the target is local.
- Auth: ask for an AccessKey such as `blog_sk_...`, or for confirmation that the user has already configured one for the intended environment. Normal operations should use AccessKeys.
- Target site: ask for `siteId` for admin/content/category operations, or `siteSlug` for integration reads. If the user does not know it, ask for permission to list sites only after API URL and auth are confirmed.
- Language: ask for the site-specific language key when creating, updating, or filtering localized posts. Do not assume `en-US` or `zh-Hans` is valid for every site.
- Content inputs: for post creation, ask for title, slug, markdown content or file path, and whether drafting content is allowed if content is not supplied.

If any required value is missing, ask a concise follow-up instead of trying commands such as `blogger sites list`, `blogger users me`, or `blogger integration sites`. Do not use `blogger config get` to satisfy the gate, and do not proceed with `localhost` or another discovered value unless the user confirms that it is the intended target.

Example missing-config response:

> Please provide `BLOGGER_API_URL`, an AccessKey, and the target `siteId`, or confirm that I may list sites after auth is configured. For post creation, also provide the language key, title, slug, and markdown content or file path.

## Quick Start

1. Ensure the CLI is installed or runnable from the repo:
   - Package command: `npx @shulex/blogger-operator-cli --help`
   - Repo command: `cd cli && npm install && npm run build && node dist/index.js --help`
2. Configure API and AccessKey:
   - `blogger config set --api-url <API_URL> --access-key <blog_sk_...>`
   - Or set `BLOGGER_API_URL` and `BLOGGER_ACCESS_KEY`.
3. Read [references/cli.md](references/cli.md) before operating posts, users, uploads, or role-restricted commands. Only run API commands after the Configuration Gate is satisfied.

## Operating Rules

- Use AccessKey auth. The CLI also accepts a temporary JWT for bootstrap commands, but normal operations should use AccessKeys.
- Treat created AccessKeys as one-time secrets. Show the full key only immediately after creation and tell the user to store it.
- Do not expose or repeat user-provided AccessKeys in final answers, logs, or summaries.
- Do not pass `status` to create/update post commands. Use `posts publish` and `posts unpublish`.
- Use the language keys configured on the target site with `--language`. Do not assume the global set is fixed.
- Use `uploads image` or `posts --cover-image` for images. Do not ask users to type avatar or cover URLs into admin workflows.
- Remember role limits: only `super_admin` can create/update/delete sites and list/update users. Operators can manage content on existing sites.

## Common Workflows

- Create draft post:
  `blogger posts create --site <siteId> --title "Title" --slug title --language en-US --markdown ./post.md`
- Publish post:
  `blogger posts publish <postId> --site <siteId>`
- Filter posts:
  `blogger posts list --site <siteId> --language en-US --category-id <categoryId> --status published --limit 10 --offset 0`
- Upload cover and create post:
  `blogger posts create --site <siteId> --title "Title" --slug title --markdown ./post.md --cover-image ./cover.png`
- Create category:
  `blogger categories create --site <siteId> --name Product --slug product`
- Super admin user management:
  `blogger users list`
  `blogger users admin-update <userId> --role operator --active true`
