#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import { stdin } from 'node:process'
import { Command } from 'commander'
import { z } from 'zod'

import { ApiClient, ApiError } from './api.js'
import { configPath, loadConfig, resolveConfig, saveConfig } from './config.js'

type GlobalOptions = {
  apiUrl?: string
  accessKey?: string
}

const StatusSchema = z.enum(['draft', 'published'])
const LanguageKeySchema = z.string().trim().min(1).max(64).regex(/^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$/)
const LanguageLabelSchema = z.string().trim().min(1).max(120)

const program = new Command()
  .name('blogger')
  .description('Operate the shared Blogger API')
  .version('0.1.0')
  .option('--api-url <url>', 'API base URL')
  .option('--access-key <key>', 'AccessKey or temporary JWT credential')

function client() {
  const options = program.opts<GlobalOptions>()
  const config = resolveConfig(options)
  return new ApiClient(config.apiUrl, config.accessKey)
}

function print(value: unknown) {
  if (value === undefined) return
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`)
}

function requiredCredential() {
  const config = resolveConfig(program.opts<GlobalOptions>())
  if (!config.accessKey) {
    throw new Error('Missing AccessKey. Set BLOGGER_ACCESS_KEY or run `blogger config set --access-key ...`.')
  }
}

async function readText(path?: string) {
  if (!path) return ''
  if (path === '-') {
    const chunks: Buffer[] = []
    for await (const chunk of stdin) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
    }
    return Buffer.concat(chunks).toString('utf8')
  }
  return readFileSync(path, 'utf8')
}

async function uploadImage(path: string, kind: string): Promise<{ url: string }> {
  const form = new FormData()
  form.set('kind', kind)
  const data = readFileSync(path)
  form.set('file', new Blob([data]), path.split(/[\\/]/).pop() || 'upload')
  return client().request<{ url: string }>('/api/uploads', { method: 'POST', body: form })
}

function compact<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined)) as Partial<T>
}

function collect(value: string, previous: string[] = []) {
  return [...previous, value]
}

function parseLanguageKey(value: string) {
  return LanguageKeySchema.parse(value)
}

function parseSiteLanguages(values?: string[]) {
  if (!values?.length) return undefined
  const languages = values.map((value) => {
    const separator = value.indexOf(':')
    if (separator <= 0 || separator === value.length - 1) {
      throw new Error('Language must use key:label format, for example en-US:English')
    }
    return {
      key: parseLanguageKey(value.slice(0, separator)),
      label: LanguageLabelSchema.parse(value.slice(separator + 1)),
    }
  })
  const keys = new Set(languages.map((language) => language.key))
  if (keys.size !== languages.length) {
    throw new Error('Language keys must be unique')
  }
  return languages
}

const config = program.command('config').description('Manage local CLI config')

config
  .command('get')
  .description('Print current resolved config')
  .action(() => {
    const current = resolveConfig(program.opts<GlobalOptions>())
    print({ ...current, accessKey: current.accessKey ? `${current.accessKey.slice(0, 18)}...` : undefined, path: configPath })
  })

config
  .command('set')
  .description('Persist API URL and AccessKey')
  .option('--api-url <url>', 'API base URL')
  .option('--access-key <key>', 'AccessKey')
  .action((options: { apiUrl?: string; accessKey?: string }) => {
    const current = loadConfig()
    const saved = saveConfig({
      apiUrl: options.apiUrl || current.apiUrl,
      accessKey: options.accessKey || current.accessKey,
    })
    print({ ...saved, accessKey: saved.accessKey ? `${saved.accessKey.slice(0, 18)}...` : undefined, path: configPath })
  })

const auth = program.command('auth').description('Bootstrap credentials with email and password')

auth
  .command('login')
  .requiredOption('--email <email>', 'Email')
  .requiredOption('--password <password>', 'Password')
  .option('--create-key <name>', 'Create and save an AccessKey after login')
  .action(async (options: { email: string; password: string; createKey?: string }) => {
    const response = await client().request<{ access_token: string; user: unknown }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: options.email, password: options.password }),
    })
    if (!options.createKey) {
      print(response)
      return
    }
    const current = resolveConfig(program.opts<GlobalOptions>())
    const key = await new ApiClient(current.apiUrl, response.access_token).request<{ access_key: string }>(
      '/api/access-keys',
      {
        method: 'POST',
        body: JSON.stringify({ name: options.createKey }),
      },
    )
    saveConfig({ ...loadConfig(), apiUrl: current.apiUrl, accessKey: key.access_key })
    print({ user: response.user, access_key: key.access_key, saved: configPath })
  })

auth
  .command('register')
  .requiredOption('--email <email>', 'Email')
  .requiredOption('--password <password>', 'Password')
  .option('--nickname <nickname>', 'Nickname')
  .option('--create-key <name>', 'Create and save an AccessKey after registration')
  .action(async (options: { email: string; password: string; nickname?: string; createKey?: string }) => {
    const response = await client().request<{ access_token: string; user: unknown }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: options.email,
        password: options.password,
        nickname: options.nickname,
      }),
    })
    if (!options.createKey) {
      print(response)
      return
    }
    const current = resolveConfig(program.opts<GlobalOptions>())
    const key = await new ApiClient(current.apiUrl, response.access_token).request<{ access_key: string }>(
      '/api/access-keys',
      {
        method: 'POST',
        body: JSON.stringify({ name: options.createKey }),
      },
    )
    saveConfig({ ...loadConfig(), apiUrl: current.apiUrl, accessKey: key.access_key })
    print({ user: response.user, access_key: key.access_key, saved: configPath })
  })

const users = program.command('users').description('Manage current user')

users
  .command('me')
  .action(async () => {
    requiredCredential()
    print(await client().request('/api/users/me'))
  })

users
  .command('update')
  .option('--nickname <nickname>', 'Nickname')
  .option('--avatar-url <url>', 'Avatar URL')
  .action(async (options: { nickname?: string; avatarUrl?: string }) => {
    requiredCredential()
    print(
      await client().request('/api/users/me', {
        method: 'PATCH',
        body: JSON.stringify(compact({ nickname: options.nickname, avatar_url: options.avatarUrl })),
      }),
    )
  })

users.command('list').description('List users, super admin only').action(async () => {
  requiredCredential()
  print(await client().request('/api/users'))
})

users
  .command('admin-update <id>')
  .description('Update a user, super admin only')
  .option('--nickname <nickname>', 'Nickname')
  .option('--avatar-url <url>', 'Avatar URL')
  .option('--role <role>', 'super_admin or operator')
  .option('--active <true|false>', 'Set active state')
  .action(
    async (
      id: string,
      options: { nickname?: string; avatarUrl?: string; role?: string; active?: string },
    ) => {
      requiredCredential()
      print(
        await client().request(`/api/users/${id}`, {
          method: 'PATCH',
          body: JSON.stringify(
            compact({
              nickname: options.nickname,
              avatar_url: options.avatarUrl,
              role: options.role ? z.enum(['super_admin', 'operator']).parse(options.role) : undefined,
              is_active: options.active === undefined ? undefined : options.active === 'true',
            }),
          ),
        }),
      )
    },
  )

const uploads = program.command('uploads').description('Upload images')

uploads
  .command('image <path>')
  .option('--kind <kind>', 'avatar, cover, site, or asset', 'asset')
  .action(async (path: string, options: { kind: string }) => {
    requiredCredential()
    print(await uploadImage(path, options.kind))
  })

const keys = program.command('keys').description('Manage AccessKeys')

keys.command('list').action(async () => {
  requiredCredential()
  print(await client().request('/api/access-keys'))
})

keys
  .command('create')
  .requiredOption('--name <name>', 'Key name')
  .action(async (options: { name: string }) => {
    requiredCredential()
    print(
      await client().request('/api/access-keys', {
        method: 'POST',
        body: JSON.stringify({ name: options.name }),
      }),
    )
  })

keys
  .command('revoke <id>')
  .action(async (id: string) => {
    requiredCredential()
    print(await client().request(`/api/access-keys/${id}`, { method: 'DELETE' }))
  })

const sites = program.command('sites').description('Manage sites')

sites.command('list').action(async () => {
  requiredCredential()
  print(await client().request('/api/sites'))
})

sites
  .command('create')
  .requiredOption('--name <name>', 'Site name')
  .requiredOption('--slug <slug>', 'Site slug')
  .option('--base-url <url>', 'Site base URL')
  .option('--description <description>', 'Description')
  .option('--language <key:label>', 'Configured language, repeatable. Example: --language en-US:English', collect, [])
  .action(async (options: { name: string; slug: string; baseUrl?: string; description?: string; language?: string[] }) => {
    requiredCredential()
    print(
      await client().request('/api/sites', {
        method: 'POST',
        body: JSON.stringify({
          name: options.name,
          slug: options.slug,
          base_url: options.baseUrl,
          description: options.description,
          languages: parseSiteLanguages(options.language),
        }),
      }),
    )
  })

sites
  .command('update <id>')
  .option('--name <name>', 'Site name')
  .option('--slug <slug>', 'Site slug')
  .option('--base-url <url>', 'Site base URL')
  .option('--description <description>', 'Description')
  .option('--language <key:label>', 'Configured language, repeatable. Replaces the site language list.', collect, [])
  .action(async (id: string, options: { name?: string; slug?: string; baseUrl?: string; description?: string; language?: string[] }) => {
    requiredCredential()
    print(
      await client().request(`/api/sites/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(
          compact({
            name: options.name,
            slug: options.slug,
            base_url: options.baseUrl,
            description: options.description,
            languages: parseSiteLanguages(options.language),
          }),
        ),
      }),
    )
  })

sites.command('delete <id>').action(async (id: string) => {
  requiredCredential()
  await client().request(`/api/sites/${id}`, { method: 'DELETE' })
  print({ deleted: id })
})

const categories = program.command('categories').description('Manage categories')

categories
  .command('list')
  .requiredOption('--site <siteId>', 'Site ID')
  .action(async (options: { site: string }) => {
    requiredCredential()
    print(await client().request(`/api/sites/${options.site}/categories`))
  })

categories
  .command('create')
  .requiredOption('--site <siteId>', 'Site ID')
  .requiredOption('--name <name>', 'Category name')
  .requiredOption('--slug <slug>', 'Category slug')
  .option('--description <description>', 'Description')
  .action(async (options: { site: string; name: string; slug: string; description?: string }) => {
    requiredCredential()
    print(
      await client().request(`/api/sites/${options.site}/categories`, {
        method: 'POST',
        body: JSON.stringify({
          name: options.name,
          slug: options.slug,
          description: options.description,
        }),
      }),
    )
  })

categories
  .command('update <id>')
  .requiredOption('--site <siteId>', 'Site ID')
  .option('--name <name>', 'Category name')
  .option('--slug <slug>', 'Category slug')
  .option('--description <description>', 'Description')
  .action(async (id: string, options: { site: string; name?: string; slug?: string; description?: string }) => {
    requiredCredential()
    print(
      await client().request(`/api/sites/${options.site}/categories/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(compact({ name: options.name, slug: options.slug, description: options.description })),
      }),
    )
  })

categories
  .command('delete <id>')
  .requiredOption('--site <siteId>', 'Site ID')
  .action(async (id: string, options: { site: string }) => {
    requiredCredential()
    await client().request(`/api/sites/${options.site}/categories/${id}`, { method: 'DELETE' })
    print({ deleted: id })
  })

const posts = program.command('posts').description('Manage posts')

posts
  .command('list')
  .requiredOption('--site <siteId>', 'Site ID')
  .option('--language <key>', 'Site language key')
  .option('--category-id <id>', 'Category ID')
  .option('--status <status>', 'draft or published')
  .option('--query <text>', 'Search title')
  .option('--limit <number>', 'Limit', '50')
  .option('--offset <number>', 'Offset', '0')
  .action(
    async (options: {
      site: string
      language?: string
      categoryId?: string
      status?: string
      query?: string
      limit: string
      offset: string
    }) => {
    requiredCredential()
      const params = new URLSearchParams({ limit: options.limit, offset: options.offset })
      if (options.language) params.set('language', parseLanguageKey(options.language))
      if (options.categoryId) params.set('category_id', options.categoryId)
      if (options.status) params.set('status', StatusSchema.parse(options.status))
      if (options.query) params.set('q', options.query)
      print(await client().request(`/api/sites/${options.site}/posts?${params}`))
    },
  )

posts
  .command('get <id>')
  .requiredOption('--site <siteId>', 'Site ID')
  .action(async (id: string, options: { site: string }) => {
    requiredCredential()
    print(await client().request(`/api/sites/${options.site}/posts/${id}`))
  })

posts
  .command('create')
  .requiredOption('--site <siteId>', 'Site ID')
  .requiredOption('--title <title>', 'Post title')
  .requiredOption('--slug <slug>', 'Post slug')
  .requiredOption('--markdown <path>', 'Markdown file path, or - for stdin')
  .requiredOption('--language <key>', 'Site language key configured on the site')
  .option('--category-id <id>', 'Category ID')
  .option('--excerpt <excerpt>', 'Excerpt')
  .option('--cover-image <path>', 'Upload cover image from file')
  .option('--cover-image-url <url>', 'Existing cover image URL')
  .option('--meta-title <title>', 'SEO meta title')
  .option('--meta-description <description>', 'SEO meta description')
  .option('--canonical-url <url>', 'Canonical URL')
  .action(
    async (options: {
      site: string
      title: string
      slug: string
      language: string
      markdown?: string
      categoryId?: string
      excerpt?: string
      coverImage?: string
      coverImageUrl?: string
      metaTitle?: string
      metaDescription?: string
      canonicalUrl?: string
    }) => {
      requiredCredential()
      const markdownContent = await readText(options.markdown)
      const coverImageUrl = options.coverImage
        ? (
            await uploadImage(options.coverImage, 'cover')
          ).url
        : options.coverImageUrl
      print(
        await client().request(`/api/sites/${options.site}/posts`, {
          method: 'POST',
          body: JSON.stringify({
            title: options.title,
            slug: options.slug,
            language: parseLanguageKey(options.language),
            markdown_content: markdownContent,
            category_id: options.categoryId,
            excerpt: options.excerpt,
            cover_image_url: coverImageUrl,
            meta_title: options.metaTitle,
            meta_description: options.metaDescription,
            canonical_url: options.canonicalUrl,
          }),
        }),
      )
    },
  )

posts
  .command('update <id>')
  .requiredOption('--site <siteId>', 'Site ID')
  .option('--title <title>', 'Post title')
  .option('--slug <slug>', 'Post slug')
  .option('--language <key>', 'Site language key')
  .option('--markdown <path>', 'Markdown file path, or - for stdin')
  .option('--category-id <id>', 'Category ID')
  .option('--excerpt <excerpt>', 'Excerpt')
  .option('--cover-image <path>', 'Upload cover image from file')
  .option('--cover-image-url <url>', 'Existing cover image URL')
  .option('--meta-title <title>', 'SEO meta title')
  .option('--meta-description <description>', 'SEO meta description')
  .option('--canonical-url <url>', 'Canonical URL')
  .action(
    async (
      id: string,
      options: {
        site: string
        title?: string
        slug?: string
        language?: string
        markdown?: string
        categoryId?: string
        excerpt?: string
        coverImage?: string
        coverImageUrl?: string
        metaTitle?: string
        metaDescription?: string
        canonicalUrl?: string
      },
    ) => {
      requiredCredential()
      const coverImageUrl = options.coverImage
        ? (
            await uploadImage(options.coverImage, 'cover')
          ).url
        : options.coverImageUrl
      print(
        await client().request(`/api/sites/${options.site}/posts/${id}`, {
          method: 'PATCH',
          body: JSON.stringify(
            compact({
              title: options.title,
              slug: options.slug,
              language: options.language ? parseLanguageKey(options.language) : undefined,
              markdown_content: options.markdown ? await readText(options.markdown) : undefined,
              category_id: options.categoryId,
              excerpt: options.excerpt,
              cover_image_url: coverImageUrl,
              meta_title: options.metaTitle,
              meta_description: options.metaDescription,
              canonical_url: options.canonicalUrl,
            }),
          ),
        }),
      )
    },
  )

posts
  .command('publish <id>')
  .requiredOption('--site <siteId>', 'Site ID')
  .action(async (id: string, options: { site: string }) => {
    requiredCredential()
    print(await client().request(`/api/sites/${options.site}/posts/${id}/publish`, { method: 'POST' }))
  })

posts
  .command('unpublish <id>')
  .requiredOption('--site <siteId>', 'Site ID')
  .action(async (id: string, options: { site: string }) => {
    requiredCredential()
    print(await client().request(`/api/sites/${options.site}/posts/${id}/unpublish`, { method: 'POST' }))
  })

posts
  .command('delete <id>')
  .requiredOption('--site <siteId>', 'Site ID')
  .action(async (id: string, options: { site: string }) => {
    requiredCredential()
    await client().request(`/api/sites/${options.site}/posts/${id}`, { method: 'DELETE' })
    print({ deleted: id })
  })

const integration = program.command('integration').description('Read published integration data')

integration.command('sites').action(async () => {
  requiredCredential()
  print(await client().request('/api/integration/sites'))
})

integration
  .command('categories')
  .requiredOption('--site-slug <slug>', 'Site slug')
  .action(async (options: { siteSlug: string }) => {
    requiredCredential()
    print(await client().request(`/api/integration/sites/${options.siteSlug}/categories`))
  })

integration
  .command('posts')
  .requiredOption('--site-slug <slug>', 'Site slug')
  .option('--category-slug <slug>', 'Category slug')
  .option('--language <key>', 'Site language key')
  .option('--limit <number>', 'Limit', '20')
  .option('--offset <number>', 'Offset', '0')
  .action(async (options: { siteSlug: string; categorySlug?: string; language?: string; limit: string; offset: string }) => {
    requiredCredential()
    const params = new URLSearchParams({ limit: options.limit, offset: options.offset })
    if (options.categorySlug) params.set('category_slug', options.categorySlug)
    if (options.language) params.set('language', parseLanguageKey(options.language))
    print(await client().request(`/api/integration/sites/${options.siteSlug}/posts?${params}`))
  })

integration
  .command('post')
  .requiredOption('--site-slug <slug>', 'Site slug')
  .requiredOption('--post-slug <slug>', 'Post slug')
  .option('--language <key>', 'Site language key')
  .action(async (options: { siteSlug: string; postSlug: string; language?: string }) => {
    requiredCredential()
    const params = new URLSearchParams()
    if (options.language) params.set('language', parseLanguageKey(options.language))
    const suffix = params.size ? `?${params}` : ''
    print(await client().request(`/api/integration/sites/${options.siteSlug}/posts/${options.postSlug}${suffix}`))
  })

program.parseAsync().catch((error: unknown) => {
  if (error instanceof ApiError) {
    process.stderr.write(`${JSON.stringify({ status: error.status, message: error.message, payload: error.payload }, null, 2)}\n`)
  } else if (error instanceof z.ZodError) {
    process.stderr.write(`${JSON.stringify({ message: 'Validation failed', issues: error.issues }, null, 2)}\n`)
  } else {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`)
  }
  process.exitCode = 1
})
