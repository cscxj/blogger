# Blogger CLI Reference

## Auth And Config

```bash
blogger config set --api-url https://blogger-api-xxxxx.run.app --access-key blog_sk_...
blogger config get
blogger auth login --email user@example.com --password '...' --create-key cli
blogger auth register --email user@example.com --password '...' --nickname User --create-key cli
```

## Sites

`sites create`, `sites update`, and `sites delete` require `super_admin`.

```bash
blogger sites list
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
