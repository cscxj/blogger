# Blogger Integration API

## Base Configuration

Required environment variables:

```bash
BLOGGER_API_URL=https://blogger-api-xxxxx.run.app
BLOGGER_ACCESS_KEY=blog_sk_...
BLOGGER_SITE_SLUG=my-product-site
```

Use this header for every request:

```http
X-Access-Key: blog_sk_...
```

`Authorization: Bearer blog_sk_...` is also supported.

## Endpoints

### List Sites

```http
GET /api/integration/sites
```

Returns sites owned by the AccessKey owner.

### List Categories

```http
GET /api/integration/sites/{site_slug}/categories
```

Returns:

```json
[
  {
    "id": "uuid",
    "site_id": "uuid",
    "name": "Product",
    "slug": "product",
    "description": "Product updates",
    "created_at": "2026-06-19T12:00:00Z",
    "updated_at": "2026-06-19T12:00:00Z"
  }
]
```

### List Published Posts

```http
GET /api/integration/sites/{site_slug}/posts?limit=20&offset=0&category_slug=product&language=en
```

`category_slug` and `language` are optional. `language` uses standard short language codes:

`en`, `zh`, `es`, `fr`, `de`, `ja`, `ko`, `pt`, `it`, `nl`, `ru`, `ar`, `hi`, `id`, `vi`, `th`.

Returns:

```json
[
  {
    "id": "uuid",
    "site_slug": "my-product-site",
    "title": "First post",
    "slug": "first-post",
    "language": "en",
    "path": "/blog/first-post",
    "html_content": "<h1>First post</h1>",
    "excerpt": "Short summary",
    "cover_image_url": "https://example.com/cover.png",
    "meta_title": "SEO title",
    "meta_description": "SEO description",
    "canonical_url": "https://example.com/blog/first-post",
    "published_at": "2026-06-19T12:00:00Z",
    "updated_at": "2026-06-19T12:00:00Z",
    "author": {
      "id": "uuid",
      "email": "author@example.com",
      "nickname": "Author",
      "avatar_url": "https://example.com/avatar.png"
    },
    "category": {
      "id": "uuid",
      "site_id": "uuid",
      "name": "Product",
      "slug": "product",
      "description": "Product updates",
      "created_at": "2026-06-19T12:00:00Z",
      "updated_at": "2026-06-19T12:00:00Z"
    }
  }
]
```

### Get Published Post

```http
GET /api/integration/sites/{site_slug}/posts/{post_slug}?language=en
```

Returns the same object shape as one list item. `language` is optional.

## Fetch Helper

```ts
type BloggerConfig = {
  apiUrl: string
  accessKey: string
  siteSlug: string
}

async function bloggerFetch<T>(config: BloggerConfig, path: string): Promise<T> {
  const response = await fetch(`${config.apiUrl}${path}`, {
    headers: {
      'X-Access-Key': config.accessKey,
    },
  })

  if (!response.ok) {
    throw new Error(`Blogger API ${response.status}: ${await response.text()}`)
  }

  return response.json() as Promise<T>
}

export function listBlogPosts(config: BloggerConfig, language = 'en') {
  return bloggerFetch(config, `/api/integration/sites/${config.siteSlug}/posts?limit=20&language=${language}`)
}

export function getBlogPost(config: BloggerConfig, slug: string, language = 'en') {
  return bloggerFetch(config, `/api/integration/sites/${config.siteSlug}/posts/${slug}?language=${language}`)
}
```

## React Rendering

```tsx
export function BlogArticle({ post }: { post: { title: string; html_content: string } }) {
  return (
    <article>
      <h1>{post.title}</h1>
      <div dangerouslySetInnerHTML={{ __html: post.html_content }} />
    </article>
  )
}
```

## SEO Mapping

- Document title: `meta_title || title`
- Meta description: `meta_description || excerpt`
- Canonical URL: `canonical_url || site_origin + path`
- Open Graph image: `cover_image_url`
- Locale: `language`
- Published time: `published_at`
- Modified time: `updated_at`
- Author display: `author.nickname || author.email`

## Error Handling

- `401`: missing, revoked, or invalid AccessKey. Treat as deployment misconfiguration.
- `404`: site or post not found. Render the product site's not-found page.
- `422`: invalid query/path parameter.
- `5xx`: API outage. Follow the product site's existing retry or stale-cache strategy.
