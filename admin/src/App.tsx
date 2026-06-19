import type { FormEvent, HTMLAttributes, ReactNode } from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  BookOpen,
  Check,
  FileText,
  FolderTree,
  Globe2,
  KeyRound,
  Loader2,
  LogOut,
  Plus,
  RefreshCw,
  Save,
  Search,
  Settings,
  Trash2,
  UserCircle,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { api, API_URL } from '@/lib/api'
import { cn, formatDate, slugify } from '@/lib/utils'
import type { AccessKey, AccessKeyCreated, Category, Post, PostPayload, Site, User } from '@/types'

type View = 'posts' | 'categories' | 'sites' | 'keys' | 'profile'

const TOKEN_KEY = 'blogger-admin-token'
const NONE_VALUE = '__none__'

const emptyPostForm: PostPayload = {
  title: '',
  slug: '',
  status: 'draft',
  markdown_content: '',
  excerpt: '',
  cover_image_url: '',
  meta_title: '',
  meta_description: '',
  canonical_url: '',
  category_id: null,
}

function App() {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY))
  const [user, setUser] = useState<User | null>(null)
  const [sites, setSites] = useState<Site[]>([])
  const [selectedSiteId, setSelectedSiteId] = useState('')
  const [categories, setCategories] = useState<Category[]>([])
  const [posts, setPosts] = useState<Post[]>([])
  const [accessKeys, setAccessKeys] = useState<AccessKey[]>([])
  const [view, setView] = useState<View>('posts')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const selectedSite = useMemo(
    () => sites.find((site) => site.id === selectedSiteId) ?? sites[0] ?? null,
    [selectedSiteId, sites],
  )

  const showError = useCallback((value: unknown) => {
    setError(value instanceof Error ? value.message : String(value))
    setMessage('')
  }, [])

  const showMessage = useCallback((value: string) => {
    setMessage(value)
    setError('')
  }, [])

  const refresh = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const [me, nextSites, keys] = await Promise.all([api.me(token), api.listSites(token), api.listAccessKeys(token)])
      setUser(me)
      setSites(nextSites)
      setAccessKeys(keys)
      const nextSelected = selectedSiteId || nextSites[0]?.id || ''
      setSelectedSiteId(nextSelected)
      if (nextSelected) {
        const [nextCategories, nextPosts] = await Promise.all([
          api.listCategories(token, nextSelected),
          api.listPosts(token, nextSelected),
        ])
        setCategories(nextCategories)
        setPosts(nextPosts)
      } else {
        setCategories([])
        setPosts([])
      }
    } catch (err) {
      showError(err)
      if (err instanceof Error && err.message.toLowerCase().includes('authentication')) {
        localStorage.removeItem(TOKEN_KEY)
        setToken(null)
      }
    } finally {
      setLoading(false)
    }
  }, [selectedSiteId, showError, token])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    async function loadSiteData() {
      if (!token || !selectedSiteId) return
      try {
        const [nextCategories, nextPosts] = await Promise.all([
          api.listCategories(token, selectedSiteId),
          api.listPosts(token, selectedSiteId),
        ])
        setCategories(nextCategories)
        setPosts(nextPosts)
      } catch (err) {
        showError(err)
      }
    }
    void loadSiteData()
  }, [selectedSiteId, showError, token])

  function handleAuthenticated(nextToken: string, nextUser: User) {
    localStorage.setItem(TOKEN_KEY, nextToken)
    setToken(nextToken)
    setUser(nextUser)
    showMessage('Signed in')
  }

  function signOut() {
    localStorage.removeItem(TOKEN_KEY)
    setToken(null)
    setUser(null)
    setSites([])
    setCategories([])
    setPosts([])
    setAccessKeys([])
  }

  if (!token) {
    return <AuthScreen onAuthenticated={handleAuthenticated} onError={showError} />
  }

  return (
    <div className="min-h-svh bg-background">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 border-r bg-white px-4 py-5 lg:block">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <BookOpen className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <div className="text-sm font-semibold">Blogger</div>
            <div className="text-xs text-muted-foreground">Content admin</div>
          </div>
        </div>
        <nav className="space-y-1">
          <NavButton active={view === 'posts'} icon={<FileText />} label="Posts" onClick={() => setView('posts')} />
          <NavButton
            active={view === 'categories'}
            icon={<FolderTree />}
            label="Categories"
            onClick={() => setView('categories')}
          />
          <NavButton active={view === 'sites'} icon={<Globe2 />} label="Sites" onClick={() => setView('sites')} />
          <NavButton active={view === 'keys'} icon={<KeyRound />} label="Access Keys" onClick={() => setView('keys')} />
          <NavButton active={view === 'profile'} icon={<UserCircle />} label="Profile" onClick={() => setView('profile')} />
        </nav>
      </aside>

      <main className="lg:pl-64">
        <header className="sticky top-0 z-10 border-b bg-white/95 backdrop-blur">
          <div className="flex min-h-16 flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between lg:px-6">
            <div className="flex items-center gap-3">
              <SimpleSelect
                aria-label="Current site"
                value={selectedSite?.id ?? ''}
                onValueChange={setSelectedSiteId}
                className="w-56"
                placeholder="No site"
                disabled={sites.length === 0}
                options={sites.map((site) => ({ value: site.id, label: site.name }))}
              />
              <Badge variant="outline">{API_URL.replace(/^https?:\/\//, '')}</Badge>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => void refresh()} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Refresh
              </Button>
              <div className="text-sm text-muted-foreground">{user?.nickname || user?.email}</div>
              <Button variant="ghost" size="icon" onClick={signOut} title="Sign out" aria-label="Sign out">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="flex gap-1 overflow-x-auto border-t px-4 py-2 lg:hidden">
            {[
              ['posts', 'Posts'],
              ['categories', 'Categories'],
              ['sites', 'Sites'],
              ['keys', 'Keys'],
              ['profile', 'Profile'],
            ].map(([id, label]) => (
              <Button
                key={id}
                variant={view === id ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setView(id as View)}
              >
                {label}
              </Button>
            ))}
          </div>
        </header>

        <div className="px-4 py-5 lg:px-6">
          {message ? (
            <div className="mb-4 flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
              <Check className="h-4 w-4" />
              {message}
            </div>
          ) : null}
          {error ? (
            <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">{error}</div>
          ) : null}

          {view === 'posts' ? (
            <PostsView
              token={token}
              site={selectedSite}
              categories={categories}
              posts={posts}
              onPostsChange={setPosts}
              onMessage={showMessage}
              onError={showError}
            />
          ) : null}
          {view === 'categories' ? (
            <CategoriesView
              token={token}
              site={selectedSite}
              categories={categories}
              onCategoriesChange={setCategories}
              onMessage={showMessage}
              onError={showError}
            />
          ) : null}
          {view === 'sites' ? (
            <SitesView
              token={token}
              sites={sites}
              selectedSiteId={selectedSite?.id ?? ''}
              onSitesChange={setSites}
              onSelectSite={setSelectedSiteId}
              onMessage={showMessage}
              onError={showError}
            />
          ) : null}
          {view === 'keys' ? (
            <KeysView
              token={token}
              accessKeys={accessKeys}
              onKeysChange={setAccessKeys}
              onMessage={showMessage}
              onError={showError}
            />
          ) : null}
          {view === 'profile' && user ? (
            <ProfileView token={token} user={user} onUserChange={setUser} onMessage={showMessage} onError={showError} />
          ) : null}
        </div>
      </main>
    </div>
  )
}

function NavButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean
  icon: ReactNode
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors ${
        active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      }`}
    >
      <span className="h-4 w-4 [&>svg]:h-4 [&>svg]:w-4">{icon}</span>
      {label}
    </button>
  )
}

function AuthScreen({
  onAuthenticated,
  onError,
}: {
  onAuthenticated: (token: string, user: User) => void
  onError: (error: unknown) => void
}) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nickname, setNickname] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setLoading(true)
    try {
      const response =
        mode === 'login' ? await api.login(email, password) : await api.register(email, password, nickname || undefined)
      onAuthenticated(response.access_token, response.user)
    } catch (err) {
      onError(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-background px-4 py-8">
      <Panel className="w-full max-w-md bg-white">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Blogger Admin</h1>
            <p className="text-sm text-muted-foreground">{mode === 'login' ? 'Sign in' : 'Create account'}</p>
          </div>
        </div>
        <form className="space-y-4" onSubmit={submit}>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </div>
          {mode === 'register' ? (
            <div className="space-y-2">
              <Label htmlFor="nickname">Nickname</Label>
              <Input id="nickname" value={nickname} onChange={(event) => setNickname(event.target.value)} />
            </div>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={8}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {mode === 'login' ? 'Sign in' : 'Register'}
          </Button>
        </form>
        <Button
          className="mt-3 w-full"
          variant="ghost"
          onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
        >
          {mode === 'login' ? 'Create an account' : 'Use existing account'}
        </Button>
      </Panel>
    </div>
  )
}

function PostsView({
  token,
  site,
  categories,
  posts,
  onPostsChange,
  onMessage,
  onError,
}: {
  token: string
  site: Site | null
  categories: Category[]
  posts: Post[]
  onPostsChange: (posts: Post[]) => void
  onMessage: (message: string) => void
  onError: (error: unknown) => void
}) {
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<Post | null>(null)
  const [form, setForm] = useState<PostPayload>(emptyPostForm)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (editing) {
      setForm({
        title: editing.title,
        slug: editing.slug,
        status: editing.status,
        markdown_content: editing.markdown_content,
        excerpt: editing.excerpt || '',
        cover_image_url: editing.cover_image_url || '',
        meta_title: editing.meta_title || '',
        meta_description: editing.meta_description || '',
        canonical_url: editing.canonical_url || '',
        category_id: editing.category_id,
      })
    } else {
      setForm(emptyPostForm)
    }
  }, [editing])

  const filteredPosts = posts.filter((post) => {
    const value = query.toLowerCase()
    return post.title.toLowerCase().includes(value) || post.slug.toLowerCase().includes(value)
  })

  async function savePost(event: FormEvent) {
    event.preventDefault()
    if (!site) return
    setSaving(true)
    try {
      const payload = normalizePostPayload(form)
      const saved = editing
        ? await api.updatePost(token, site.id, editing.id, payload)
        : await api.createPost(token, site.id, payload)
      onPostsChange(editing ? posts.map((post) => (post.id === saved.id ? saved : post)) : [saved, ...posts])
      setEditing(saved)
      onMessage('Post saved')
    } catch (err) {
      onError(err)
    } finally {
      setSaving(false)
    }
  }

  async function changePostStatus(post: Post, action: 'publish' | 'unpublish') {
    if (!site) return
    try {
      const saved =
        action === 'publish'
          ? await api.publishPost(token, site.id, post.id)
          : await api.unpublishPost(token, site.id, post.id)
      onPostsChange(posts.map((item) => (item.id === saved.id ? saved : item)))
      if (editing?.id === saved.id) setEditing(saved)
      onMessage(action === 'publish' ? 'Post published' : 'Post moved to draft')
    } catch (err) {
      onError(err)
    }
  }

  async function deletePost(post: Post) {
    if (!site || !confirm(`Delete "${post.title}"?`)) return
    try {
      await api.deletePost(token, site.id, post.id)
      onPostsChange(posts.filter((item) => item.id !== post.id))
      if (editing?.id === post.id) setEditing(null)
      onMessage('Post deleted')
    } catch (err) {
      onError(err)
    }
  }

  if (!site) {
    return <EmptyState icon={<Globe2 />} title="Create a site first" />
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(320px,420px),1fr]">
      <Panel className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Posts</h2>
            <p className="text-sm text-muted-foreground">{site.name}</p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => setEditing(null)}>
            <Plus className="h-4 w-4" />
            New
          </Button>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search posts" value={query} onChange={(event) => setQuery(event.target.value)} />
        </div>
        <div className="max-h-[calc(100svh-230px)] space-y-2 overflow-auto pr-1">
          {filteredPosts.map((post) => (
            <button
              key={post.id}
              type="button"
              onClick={() => setEditing(post)}
              className={`w-full rounded-md border p-3 text-left transition-colors ${
                editing?.id === post.id ? 'border-primary bg-muted' : 'bg-white hover:bg-muted'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{post.title}</div>
                  <div className="truncate text-xs text-muted-foreground">/blog/{post.slug}</div>
                </div>
                <Badge variant={post.status === 'published' ? 'default' : 'outline'}>{post.status}</Badge>
              </div>
              <div className="mt-2 text-xs text-muted-foreground">{formatDate(post.updated_at)}</div>
            </button>
          ))}
        </div>
      </Panel>

      <form className="space-y-4" onSubmit={savePost}>
        <Panel className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">{editing ? 'Edit post' : 'New post'}</h2>
              <p className="text-sm text-muted-foreground">{editing ? editing.id : site.slug}</p>
            </div>
            <div className="flex gap-2">
              {editing ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void changePostStatus(editing, editing.status === 'published' ? 'unpublish' : 'publish')}
                >
                  {editing.status === 'published' ? 'Unpublish' : 'Publish'}
                </Button>
              ) : null}
              {editing ? (
                <Button type="button" variant="destructive" size="icon" onClick={() => void deletePost(editing)} title="Delete post">
                  <Trash2 className="h-4 w-4" />
                </Button>
              ) : null}
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save
              </Button>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Title">
              <Input
                value={form.title}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    title: event.target.value,
                    slug: current.slug || slugify(event.target.value),
                  }))
                }
                required
              />
            </Field>
            <Field label="Slug">
              <Input value={form.slug} onChange={(event) => setForm({ ...form, slug: slugify(event.target.value) })} required />
            </Field>
            <Field label="Status">
              <SimpleSelect
                value={form.status}
                onValueChange={(value) => setForm({ ...form, status: value as Post['status'] })}
                options={[
                  { value: 'draft', label: 'Draft' },
                  { value: 'published', label: 'Published' },
                ]}
              />
            </Field>
            <Field label="Category">
              <SimpleSelect
                value={form.category_id || NONE_VALUE}
                onValueChange={(value) => setForm({ ...form, category_id: value === NONE_VALUE ? null : value })}
                options={[
                  { value: NONE_VALUE, label: 'None' },
                  ...categories.map((category) => ({ value: category.id, label: category.name })),
                ]}
              />
            </Field>
          </div>
          <Field label="Markdown">
            <Textarea
              className="min-h-72 font-mono"
              value={form.markdown_content}
              onChange={(event) => setForm({ ...form, markdown_content: event.target.value })}
            />
          </Field>
        </Panel>

        <Panel className="space-y-4">
          <h2 className="text-lg font-semibold">SEO</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Meta title">
              <Input value={form.meta_title || ''} onChange={(event) => setForm({ ...form, meta_title: event.target.value })} />
            </Field>
            <Field label="Canonical URL">
              <Input value={form.canonical_url || ''} onChange={(event) => setForm({ ...form, canonical_url: event.target.value })} />
            </Field>
          </div>
          <Field label="Meta description">
            <Textarea
              className="min-h-20"
              value={form.meta_description || ''}
              onChange={(event) => setForm({ ...form, meta_description: event.target.value })}
            />
          </Field>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Cover image URL">
              <Input
                value={form.cover_image_url || ''}
                onChange={(event) => setForm({ ...form, cover_image_url: event.target.value })}
              />
            </Field>
            <Field label="Excerpt">
              <Input value={form.excerpt || ''} onChange={(event) => setForm({ ...form, excerpt: event.target.value })} />
            </Field>
          </div>
        </Panel>

        {editing ? (
          <Panel>
            <h2 className="mb-3 text-lg font-semibold">HTML preview</h2>
            <div className="prose-preview rounded-md border bg-background p-4" dangerouslySetInnerHTML={{ __html: editing.html_content }} />
          </Panel>
        ) : null}
      </form>
    </div>
  )
}

function normalizePostPayload(payload: PostPayload): PostPayload {
  return {
    ...payload,
    excerpt: payload.excerpt || null,
    cover_image_url: payload.cover_image_url || null,
    meta_title: payload.meta_title || null,
    meta_description: payload.meta_description || null,
    canonical_url: payload.canonical_url || null,
    category_id: payload.category_id || null,
  }
}

function CategoriesView({
  token,
  site,
  categories,
  onCategoriesChange,
  onMessage,
  onError,
}: {
  token: string
  site: Site | null
  categories: Category[]
  onCategoriesChange: (categories: Category[]) => void
  onMessage: (message: string) => void
  onError: (error: unknown) => void
}) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  async function createCategory(event: FormEvent) {
    event.preventDefault()
    if (!site) return
    try {
      const category = await api.createCategory(token, site.id, {
        name,
        slug: slugify(name),
        description: description || null,
      })
      onCategoriesChange([...categories, category])
      setName('')
      setDescription('')
      onMessage('Category created')
    } catch (err) {
      onError(err)
    }
  }

  async function deleteCategory(category: Category) {
    if (!site || !confirm(`Delete "${category.name}"?`)) return
    try {
      await api.deleteCategory(token, site.id, category.id)
      onCategoriesChange(categories.filter((item) => item.id !== category.id))
      onMessage('Category deleted')
    } catch (err) {
      onError(err)
    }
  }

  if (!site) {
    return <EmptyState icon={<Globe2 />} title="Create a site first" />
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[420px,1fr]">
      <Panel>
        <h2 className="mb-4 text-lg font-semibold">New category</h2>
        <form className="space-y-4" onSubmit={createCategory}>
          <Field label="Name">
            <Input value={name} onChange={(event) => setName(event.target.value)} required />
          </Field>
          <Field label="Description">
            <Textarea value={description} onChange={(event) => setDescription(event.target.value)} />
          </Field>
          <Button type="submit">
            <Plus className="h-4 w-4" />
            Create
          </Button>
        </form>
      </Panel>
      <Panel>
        <h2 className="mb-4 text-lg font-semibold">Categories</h2>
        <div className="divide-y rounded-md border">
          {categories.map((category) => (
            <div key={category.id} className="flex items-center justify-between gap-4 p-3">
              <div className="min-w-0">
                <div className="font-medium">{category.name}</div>
                <div className="text-sm text-muted-foreground">/{category.slug}</div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => void deleteCategory(category)} title="Delete category">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  )
}

function SitesView({
  token,
  sites,
  selectedSiteId,
  onSitesChange,
  onSelectSite,
  onMessage,
  onError,
}: {
  token: string
  sites: Site[]
  selectedSiteId: string
  onSitesChange: (sites: Site[]) => void
  onSelectSite: (id: string) => void
  onMessage: (message: string) => void
  onError: (error: unknown) => void
}) {
  const [name, setName] = useState('')
  const [baseUrl, setBaseUrl] = useState('')
  const [description, setDescription] = useState('')

  async function createSite(event: FormEvent) {
    event.preventDefault()
    try {
      const site = await api.createSite(token, {
        name,
        slug: slugify(name),
        base_url: baseUrl || null,
        description: description || null,
      })
      onSitesChange([...sites, site])
      onSelectSite(site.id)
      setName('')
      setBaseUrl('')
      setDescription('')
      onMessage('Site created')
    } catch (err) {
      onError(err)
    }
  }

  async function deleteSite(site: Site) {
    if (!confirm(`Delete "${site.name}" and all posts?`)) return
    try {
      await api.deleteSite(token, site.id)
      const nextSites = sites.filter((item) => item.id !== site.id)
      onSitesChange(nextSites)
      onSelectSite(nextSites[0]?.id || '')
      onMessage('Site deleted')
    } catch (err) {
      onError(err)
    }
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[420px,1fr]">
      <Panel>
        <h2 className="mb-4 text-lg font-semibold">New site</h2>
        <form className="space-y-4" onSubmit={createSite}>
          <Field label="Name">
            <Input value={name} onChange={(event) => setName(event.target.value)} required />
          </Field>
          <Field label="Base URL">
            <Input value={baseUrl} onChange={(event) => setBaseUrl(event.target.value)} placeholder="https://example.com" />
          </Field>
          <Field label="Description">
            <Textarea value={description} onChange={(event) => setDescription(event.target.value)} />
          </Field>
          <Button type="submit">
            <Plus className="h-4 w-4" />
            Create
          </Button>
        </form>
      </Panel>
      <Panel>
        <h2 className="mb-4 text-lg font-semibold">Sites</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {sites.map((site) => (
            <div key={site.id} className={`rounded-md border bg-white p-4 ${selectedSiteId === site.id ? 'border-primary' : ''}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate font-medium">{site.name}</div>
                  <div className="truncate text-sm text-muted-foreground">{site.slug}</div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => void deleteSite(site)} title="Delete site">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              {site.base_url ? <div className="mt-3 truncate text-sm text-muted-foreground">{site.base_url}</div> : null}
              <Button className="mt-4" variant="outline" size="sm" onClick={() => onSelectSite(site.id)}>
                <Settings className="h-4 w-4" />
                Select
              </Button>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  )
}

function KeysView({
  token,
  accessKeys,
  onKeysChange,
  onMessage,
  onError,
}: {
  token: string
  accessKeys: AccessKey[]
  onKeysChange: (keys: AccessKey[]) => void
  onMessage: (message: string) => void
  onError: (error: unknown) => void
}) {
  const [name, setName] = useState('')
  const [created, setCreated] = useState<AccessKeyCreated | null>(null)

  async function createKey(event: FormEvent) {
    event.preventDefault()
    try {
      const key = await api.createAccessKey(token, name)
      setCreated(key)
      onKeysChange([key, ...accessKeys])
      setName('')
      onMessage('AccessKey created')
    } catch (err) {
      onError(err)
    }
  }

  async function revokeKey(key: AccessKey) {
    if (!confirm(`Revoke "${key.name}"?`)) return
    try {
      const revoked = await api.revokeAccessKey(token, key.id)
      onKeysChange(accessKeys.map((item) => (item.id === key.id ? revoked : item)))
      onMessage('AccessKey revoked')
    } catch (err) {
      onError(err)
    }
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[420px,1fr]">
      <Panel>
        <h2 className="mb-4 text-lg font-semibold">Create AccessKey</h2>
        <form className="space-y-4" onSubmit={createKey}>
          <Field label="Name">
            <Input value={name} onChange={(event) => setName(event.target.value)} required />
          </Field>
          <Button type="submit">
            <KeyRound className="h-4 w-4" />
            Create
          </Button>
        </form>
        {created ? (
          <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3">
            <Label>New key</Label>
            <Input className="mt-2 font-mono" value={created.access_key} readOnly onFocus={(event) => event.currentTarget.select()} />
          </div>
        ) : null}
      </Panel>
      <Panel>
        <h2 className="mb-4 text-lg font-semibold">Access Keys</h2>
        <div className="divide-y rounded-md border">
          {accessKeys.map((key) => (
            <div key={key.id} className="flex items-center justify-between gap-4 p-3">
              <div className="min-w-0">
                <div className="font-medium">{key.name}</div>
                <div className="font-mono text-sm text-muted-foreground">{key.key_prefix}...</div>
                <div className="text-xs text-muted-foreground">Last used {formatDate(key.last_used_at)}</div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={key.revoked_at ? 'destructive' : 'outline'}>{key.revoked_at ? 'revoked' : 'active'}</Badge>
                {!key.revoked_at ? (
                  <Button variant="ghost" size="icon" onClick={() => void revokeKey(key)} title="Revoke key">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  )
}

function ProfileView({
  token,
  user,
  onUserChange,
  onMessage,
  onError,
}: {
  token: string
  user: User
  onUserChange: (user: User) => void
  onMessage: (message: string) => void
  onError: (error: unknown) => void
}) {
  const [nickname, setNickname] = useState(user.nickname || '')
  const [avatarUrl, setAvatarUrl] = useState(user.avatar_url || '')

  async function saveProfile(event: FormEvent) {
    event.preventDefault()
    try {
      const saved = await api.updateMe(token, {
        nickname: nickname || null,
        avatar_url: avatarUrl || null,
      })
      onUserChange(saved)
      onMessage('Profile saved')
    } catch (err) {
      onError(err)
    }
  }

  return (
    <Panel className="max-w-2xl">
      <h2 className="mb-4 text-lg font-semibold">Profile</h2>
      <form className="space-y-4" onSubmit={saveProfile}>
        <Field label="Email">
          <Input value={user.email} readOnly />
        </Field>
        <Field label="Nickname">
          <Input value={nickname} onChange={(event) => setNickname(event.target.value)} />
        </Field>
        <Field label="Avatar URL">
          <Input value={avatarUrl} onChange={(event) => setAvatarUrl(event.target.value)} />
        </Field>
        <Button type="submit">
          <Save className="h-4 w-4" />
          Save
        </Button>
      </form>
    </Panel>
  )
}

function Panel({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <Card className={cn('bg-white p-4 shadow-sm', className)} {...props} />
}

function SimpleSelect({
  value,
  onValueChange,
  options,
  placeholder = 'Select',
  className,
  disabled,
  'aria-label': ariaLabel,
}: {
  value: string
  onValueChange: (value: string) => void
  options: Array<{ value: string; label: string; disabled?: boolean }>
  placeholder?: string
  className?: string
  disabled?: boolean
  'aria-label'?: string
}) {
  return (
    <Select value={value || undefined} onValueChange={onValueChange} disabled={disabled || options.length === 0}>
      <SelectTrigger className={cn('w-full', className)} aria-label={ariaLabel}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  )
}

function EmptyState({ icon, title }: { icon: ReactNode; title: string }) {
  return (
    <Panel className="flex min-h-60 items-center justify-center">
      <div className="text-center">
        <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-md bg-muted text-muted-foreground [&>svg]:h-5 [&>svg]:w-5">
          {icon}
        </div>
        <div className="font-medium">{title}</div>
      </div>
    </Panel>
  )
}

export default App
