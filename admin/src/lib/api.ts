import type {
  AccessKey,
  AccessKeyCreated,
  Category,
  Post,
  PostPayload,
  Site,
  TokenResponse,
  User,
} from '../types'

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

type RequestOptions = RequestInit & {
  token?: string | null
}

export class ApiError extends Error {
  status: number
  payload: unknown

  constructor(status: number, message: string, payload: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.payload = payload
  }
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers)
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  if (options.token) {
    headers.set('Authorization', `Bearer ${options.token}`)
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  })

  if (response.status === 204) {
    return undefined as T
  }

  const contentType = response.headers.get('Content-Type') || ''
  const payload = contentType.includes('application/json') ? await response.json() : await response.text()

  if (!response.ok) {
    const detail =
      typeof payload === 'object' && payload && 'detail' in payload ? String(payload.detail) : response.statusText
    throw new ApiError(response.status, detail, payload)
  }

  return payload as T
}

export const api = {
  login: (email: string, password: string) =>
    request<TokenResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  register: (email: string, password: string, nickname?: string) =>
    request<TokenResponse>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, nickname }),
    }),
  me: (token: string) => request<User>('/api/users/me', { token }),
  updateMe: (token: string, payload: Pick<User, 'nickname' | 'avatar_url'>) =>
    request<User>('/api/users/me', {
      method: 'PATCH',
      token,
      body: JSON.stringify(payload),
    }),
  listAccessKeys: (token: string) => request<AccessKey[]>('/api/access-keys', { token }),
  createAccessKey: (token: string, name: string) =>
    request<AccessKeyCreated>('/api/access-keys', {
      method: 'POST',
      token,
      body: JSON.stringify({ name }),
    }),
  revokeAccessKey: (token: string, id: string) =>
    request<AccessKey>(`/api/access-keys/${id}`, {
      method: 'DELETE',
      token,
    }),
  listSites: (token: string) => request<Site[]>('/api/sites', { token }),
  createSite: (token: string, payload: Omit<Site, 'id' | 'created_at' | 'updated_at'>) =>
    request<Site>('/api/sites', {
      method: 'POST',
      token,
      body: JSON.stringify(payload),
    }),
  updateSite: (token: string, id: string, payload: Partial<Omit<Site, 'id' | 'created_at' | 'updated_at'>>) =>
    request<Site>(`/api/sites/${id}`, {
      method: 'PATCH',
      token,
      body: JSON.stringify(payload),
    }),
  deleteSite: (token: string, id: string) =>
    request<void>(`/api/sites/${id}`, {
      method: 'DELETE',
      token,
    }),
  listCategories: (token: string, siteId: string) =>
    request<Category[]>(`/api/sites/${siteId}/categories`, { token }),
  createCategory: (token: string, siteId: string, payload: Pick<Category, 'name' | 'slug' | 'description'>) =>
    request<Category>(`/api/sites/${siteId}/categories`, {
      method: 'POST',
      token,
      body: JSON.stringify(payload),
    }),
  updateCategory: (
    token: string,
    siteId: string,
    categoryId: string,
    payload: Partial<Pick<Category, 'name' | 'slug' | 'description'>>,
  ) =>
    request<Category>(`/api/sites/${siteId}/categories/${categoryId}`, {
      method: 'PATCH',
      token,
      body: JSON.stringify(payload),
    }),
  deleteCategory: (token: string, siteId: string, categoryId: string) =>
    request<void>(`/api/sites/${siteId}/categories/${categoryId}`, {
      method: 'DELETE',
      token,
    }),
  listPosts: (token: string, siteId: string) => request<Post[]>(`/api/sites/${siteId}/posts`, { token }),
  createPost: (token: string, siteId: string, payload: PostPayload) =>
    request<Post>(`/api/sites/${siteId}/posts`, {
      method: 'POST',
      token,
      body: JSON.stringify(payload),
    }),
  updatePost: (token: string, siteId: string, postId: string, payload: Partial<PostPayload>) =>
    request<Post>(`/api/sites/${siteId}/posts/${postId}`, {
      method: 'PATCH',
      token,
      body: JSON.stringify(payload),
    }),
  publishPost: (token: string, siteId: string, postId: string) =>
    request<Post>(`/api/sites/${siteId}/posts/${postId}/publish`, {
      method: 'POST',
      token,
    }),
  unpublishPost: (token: string, siteId: string, postId: string) =>
    request<Post>(`/api/sites/${siteId}/posts/${postId}/unpublish`, {
      method: 'POST',
      token,
    }),
  deletePost: (token: string, siteId: string, postId: string) =>
    request<void>(`/api/sites/${siteId}/posts/${postId}`, {
      method: 'DELETE',
      token,
    }),
}
