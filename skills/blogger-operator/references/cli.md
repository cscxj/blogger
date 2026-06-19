# Blogger CLI Reference

All API-contacting commands in this reference assume the user has already confirmed the target API URL and authentication for the intended environment. Do not run them against CLI defaults, discovered local config, or `http://localhost:8000` unless the user explicitly says the target is local.

Before operating, confirm:

- `BLOGGER_API_URL` or an explicit `--api-url`.
- `BLOGGER_ACCESS_KEY` or an explicit `--access-key`.
- `siteId` for admin/content/category commands, or `siteSlug` for integration reads.
- The target site's language key when using `--language`.

If any required value is missing, ask the user for it before running `sites list`, `users me`, `integration sites`, or any other API command. If the user does not know the `siteId`, ask whether you may list sites after API URL and auth are confirmed. Use `config get` only when the user explicitly asks to inspect local CLI config; it does not satisfy the configuration gate by itself.

## Auth And Config

```bash
blogger config set --api-url https://blogger-api-xxxxx.run.app --access-key blog_sk_...
# Only when the user explicitly asks to inspect local CLI config:
blogger config get
blogger auth login --email user@example.com --password '...' --create-key cli
blogger auth register --email user@example.com --password '...' --nickname User --create-key cli
```

## Sites

`sites create`, `sites update`, and `sites delete` require `super_admin`.

```bash
BLOGGER_API_URL=https://blogger-api-xxxxx.run.app BLOGGER_ACCESS_KEY=blog_sk_... blogger sites list
blogger sites create --name "Main Site" --slug main-site --base-url https://example.com --language en-US:English --language zh-Hans:简体中文
blogger sites update <siteId> --base-url https://example.com
blogger sites update <siteId> --language en-US:English --language zh-Hans:简体中文 --language ja-JP:日本語
blogger sites delete <siteId>
```

When `base_url` is set or changed, the API tries to fetch and store `icon_url`.
Language options are configured per site. Repeating `--language key:label` on `sites update` replaces the full language list.

## Categories

```bash
blogger categories list --site <siteId>
blogger categories create --site <siteId> --name Product --slug product
blogger categories update <categoryId> --site <siteId> --name News
blogger categories delete <categoryId> --site <siteId>
```

## Posts

Create/update never accepts `status`; publish state changes use dedicated commands.

```bash
blogger posts list --site <siteId> --language en-US --category-id <categoryId> --status draft --query launch --limit 10 --offset 0
blogger posts get <postId> --site <siteId>
blogger posts create --site <siteId> --title "Launch" --slug launch --language en-US --markdown ./launch.md
blogger posts update <postId> --site <siteId> --title "Launch v2" --markdown ./launch.md
blogger posts publish <postId> --site <siteId>
blogger posts unpublish <postId> --site <siteId>
blogger posts delete <postId> --site <siteId>
```

Markdown can be read from stdin:

```bash
cat post.md | blogger posts create --site <siteId> --title "Launch" --slug launch --markdown -
```

## Uploads

```bash
blogger uploads image ./avatar.png --kind avatar
blogger uploads image ./cover.png --kind cover
blogger posts create --site <siteId> --title "Launch" --slug launch --markdown ./launch.md --cover-image ./cover.png
```

The API returns `{ "url": "..." }`. In production URLs point to GCS-backed public assets.

## AccessKeys

```bash
blogger keys list
blogger keys create --name "automation"
blogger keys revoke <keyId>
```

The full AccessKey is returned only from `keys create`; lists only show prefixes.

## Users

These commands require `super_admin`.

```bash
blogger users list
blogger users admin-update <userId> --role super_admin
blogger users admin-update <userId> --active false
```

Current-user commands:

```bash
blogger users me
blogger users update --nickname "Editor" --avatar-url https://...
```

## Integration Reads

```bash
blogger integration sites
blogger integration categories --site-slug main-site
blogger integration posts --site-slug main-site --language en-US --category-slug product --limit 20 --offset 0
blogger integration post --site-slug main-site --post-slug launch --language en-US
```
