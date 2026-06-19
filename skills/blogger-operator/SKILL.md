---
name: blogger-operator
description: Operate the shared Blogger system through the npm CLI for blog operations. Use when Codex or another AI tool needs to create, edit, publish, unpublish, list, filter, or delete posts; manage categories; upload cover/avatar images; create or revoke AccessKeys; inspect sites; or perform super-admin-only user and site management using an AccessKey.
---

# Blogger Operator

Use the `blogger` npm CLI for operations instead of calling HTTP endpoints by hand.

## Quick Start

1. Ensure the CLI is installed or runnable from the repo:
   - Package command: `npx blogger-operator-cli --help`
   - Repo command: `cd cli && npm install && npm run build && node dist/index.js --help`
2. Configure API and AccessKey:
   - `blogger config set --api-url <API_URL> --access-key <blog_sk_...>`
   - Or set `BLOGGER_API_URL` and `BLOGGER_ACCESS_KEY`.
3. Read [references/cli.md](references/cli.md) before operating posts, users, uploads, or role-restricted commands.

## Operating Rules

- Use AccessKey auth. The CLI also accepts a temporary JWT for bootstrap commands, but normal operations should use AccessKeys.
- Treat created AccessKeys as one-time secrets. Show the full key only immediately after creation and tell the user to store it.
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
