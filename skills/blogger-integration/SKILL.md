---
name: blogger-integration
description: Connect product websites to the shared Blogger API blog module. Use when Codex needs to add blog listing/detail/category pages to a product website, fetch published posts by site slug, wire SEO metadata from Blogger fields, or document/use the Blogger integration API with AccessKey authentication.
---

# Blogger Integration

Use this skill to integrate a product website with the shared Blogger service.

## Workflow

1. Identify the product site's blog route base. Default to `/blog` unless the existing site already uses another route.
2. Get these required values from environment/config:
   - `BLOGGER_API_URL`
   - `BLOGGER_ACCESS_KEY`
   - `BLOGGER_SITE_SLUG`
3. Read [references/api.md](references/api.md) before implementing API calls or mapping response fields.
4. Use only `/api/integration/*` endpoints in product websites. Do not call admin CRUD endpoints from a public website.
5. Render `html_content` as the article body and use `language`, `meta_title`, `meta_description`, `cover_image_url`, `canonical_url`, `published_at`, `author`, and `category` for page metadata and UI.
6. Keep the product website's routing source of truth aligned with Blogger's `path` field. The default path is `/blog/{post_slug}`.

## Implementation Rules

- Send the AccessKey as `X-Access-Key: blog_sk_...` or `Authorization: Bearer blog_sk_...`.
- Fetch only published content from integration endpoints.
- Use standard short language codes such as `en`, `zh`, `ja`, or `de` with the `language` query parameter when the host website has locale-specific pages.
- Treat `slug` as unique per site.
- Prefer server-side fetching for SEO-capable frameworks.
- Cache listing/detail responses according to the host site's existing data-fetching conventions.
- On `401`, surface a deployment/configuration issue. On `404`, render the site's normal not-found page.
- When using React, render article HTML with the framework's explicit raw-HTML mechanism. The API sanitizes Markdown output, but do not concatenate untrusted local strings into `html_content`.

## Quick Endpoint Map

- `GET /api/integration/sites`
- `GET /api/integration/sites/{site_slug}/categories`
- `GET /api/integration/sites/{site_slug}/posts?limit=20&offset=0&language=en`
- `GET /api/integration/sites/{site_slug}/posts/{post_slug}?language=en`

See [references/api.md](references/api.md) for request examples, response schemas, and framework snippets.
