---
name: blogger-operator
description: Operate the shared Blogger system through the npm CLI for blog operations. Use when Codex or another AI tool needs to create, edit, publish, unpublish, list, filter, or delete posts; manage categories; upload cover/avatar images; create or revoke AccessKeys; inspect sites; or perform super-admin-only user and site management using an AccessKey.
---

# Blogger Operator

Use the `blogger` npm CLI for operations instead of calling HTTP endpoints by hand.

## Configuration Gate

Before running operation-specific CLI commands, first determine whether the CLI is already logged in for the intended environment. The CLI stores local client config in `~/.blogger/config.json` by default, or in `BLOGGER_CONFIG_PATH` when set.

Safe preflight commands:

- `blogger config get` to inspect the resolved API URL and masked credential.
- `blogger whoami` to verify the saved credential works.
- `blogger --help`, package install/build commands, or static file inspection.

Required base values:

- API URL: the CLI defaults to the hosted Blogger API. Ask for `BLOGGER_API_URL` or `--api-url` only when the task targets a different deployment or the user explicitly says the target is local.
- Auth: prefer saved CLI credentials. If `blogger whoami` fails because no credential is saved, ask the user to run or authorize `blogger login --email <email> --password <password>`; the login command creates and saves a CLI AccessKey by default. Only ask for a raw AccessKey when the user does not want email/password login.

Ask for operation-specific values only when the requested operation needs them:

- Target site: ask the user for the human-readable Site name. Do not ask for raw `siteId` or `siteSlug` as normal input. After API URL and auth are confirmed, run `blogger sites list` for admin/content/category operations or `blogger integration sites` for integration reads, match the Site name to `name` first and `slug` second, then use the resolved `id` or `slug` internally. If there are multiple or no matches, ask the user to choose by Site name.
- Language: ask for the site-specific language key only when creating, updating, or filtering localized posts. If the resolved site includes a `languages` list, use it to infer or present choices. Do not assume `en-US` or `zh-Hans` is valid for every site.
- Content inputs: for post creation, ask for title, slug, markdown content or file path, and whether drafting content is allowed if content is not supplied.

If base auth is missing, ask a concise follow-up instead of requiring every later command to pass `--api-url` or `--access-key`. Do not proceed with a local API URL unless the user confirms that the intended target is local.

Example missing-config response:

> Please log in once with `blogger login --email <email> --password <password>`, or provide an AccessKey if you prefer key-based setup. If this task targets a site, tell me the Site name and I will look up its ID/slug after auth is confirmed.

## Quick Start

1. Ensure the CLI is installed or runnable from the repo:
   - Package command: `npx @shulex/blogger-operator-cli --help`
   - Repo command: `cd cli && npm install && npm run build && node dist/index.js --help`
2. Log in once:
   - `blogger login --email user@example.com --password '...'`
   - The CLI creates and saves an AccessKey in `~/.blogger/config.json`.
   - For alternate deployments, run `blogger --api-url <API_URL> login --email user@example.com --password '...'`.
   - Raw-key setup is still supported with `blogger config set --api-url <API_URL> --access-key <blog_sk_...>`.
3. Read [references/cli.md](references/cli.md) before operating posts, users, uploads, or role-restricted commands. Only run API commands after the Configuration Gate is satisfied.

## Operating Rules

- Use AccessKey auth. The CLI also accepts a temporary JWT for bootstrap commands, but normal operations should use AccessKeys.
- Treat created AccessKeys as secrets. `blogger login` saves the created key locally and prints only a masked credential.
- Do not expose or repeat user-provided AccessKeys in final answers, logs, or summaries.
- Do not ask users for raw site IDs during normal workflows. Ask for the Site name when a site-scoped operation needs it, then resolve the internal ID/slug with the CLI.
- Do not pass `status` to create/update post commands. Use `posts publish` and `posts unpublish`.
- Use the language keys configured on the target site with `--language`. Do not assume the global set is fixed.
- Use `uploads image` or `posts --cover-image` for images. Do not ask users to type avatar or cover URLs into admin workflows.
- Remember role limits: only `super_admin` can create/update/delete sites and list/update users. Operators can manage content on existing sites.

## Common Workflows

- Create draft post:
  `blogger sites list`, match the Site name, then `blogger posts create --site <resolvedSiteId> --title "Title" --slug title --language en-US --markdown ./post.md`
- Publish post:
  `blogger posts publish <postId> --site <resolvedSiteId>`
- Filter posts:
  `blogger posts list --site <resolvedSiteId> --language en-US --category-id <categoryId> --status published --limit 10 --offset 0`
- Upload cover and create post:
  `blogger posts create --site <resolvedSiteId> --title "Title" --slug title --markdown ./post.md --cover-image ./cover.png`
- Create category:
  `blogger categories create --site <resolvedSiteId> --name Product --slug product`
- Super admin user management:
  `blogger users list`
  `blogger users admin-update <userId> --role operator --active true`
