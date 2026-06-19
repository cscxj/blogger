import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api"
import type { PostListParams } from "@/types"

export const queryKeys = {
  me: (token: string | null) => ["me", token] as const,
  sites: (token: string | null) => ["sites", token] as const,
  accessKeys: (token: string | null) => ["access-keys", token] as const,
  users: (token: string | null) => ["users", token] as const,
  categories: (token: string | null, siteId: string | null) =>
    ["categories", token, siteId] as const,
  posts: (token: string | null, siteId: string | null, params: PostListParams = {}) =>
    ["posts", token, siteId, params] as const,
  post: (token: string | null, siteId: string | null, postId: string | null) =>
    ["post", token, siteId, postId] as const,
}

export function useMe(token: string | null) {
  return useQuery({
    queryKey: queryKeys.me(token),
    queryFn: () => api.me(token ?? ""),
    enabled: Boolean(token),
  })
}

export function useSites(token: string | null) {
  return useQuery({
    queryKey: queryKeys.sites(token),
    queryFn: () => api.listSites(token ?? ""),
    enabled: Boolean(token),
    initialData: [],
  })
}

export function useAccessKeys(token: string | null) {
  return useQuery({
    queryKey: queryKeys.accessKeys(token),
    queryFn: () => api.listAccessKeys(token ?? ""),
    enabled: Boolean(token),
    initialData: [],
  })
}

export function useUsers(token: string | null, enabled = true) {
  return useQuery({
    queryKey: queryKeys.users(token),
    queryFn: () => api.listUsers(token ?? ""),
    enabled: Boolean(token) && enabled,
    initialData: [],
  })
}

export function useCategories(token: string | null, siteId: string | null) {
  return useQuery({
    queryKey: queryKeys.categories(token, siteId),
    queryFn: () => api.listCategories(token ?? "", siteId ?? ""),
    enabled: Boolean(token && siteId),
    initialData: [],
  })
}

export function usePosts(token: string | null, siteId: string | null, params: PostListParams = {}) {
  return useQuery({
    queryKey: queryKeys.posts(token, siteId, params),
    queryFn: () => api.listPosts(token ?? "", siteId ?? "", params),
    enabled: Boolean(token && siteId),
    initialData: {
      items: [],
      total: 0,
      limit: params.limit ?? 20,
      offset: params.offset ?? 0,
    },
  })
}

export function usePost(token: string | null, siteId: string | null, postId: string | null) {
  return useQuery({
    queryKey: queryKeys.post(token, siteId, postId),
    queryFn: () => api.getPost(token ?? "", siteId ?? "", postId ?? ""),
    enabled: Boolean(token && siteId && postId),
  })
}
