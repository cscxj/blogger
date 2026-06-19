import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api"

export const queryKeys = {
  me: (token: string | null) => ["me", token] as const,
  sites: (token: string | null) => ["sites", token] as const,
  accessKeys: (token: string | null) => ["access-keys", token] as const,
  categories: (token: string | null, siteId: string | null) =>
    ["categories", token, siteId] as const,
  posts: (token: string | null, siteId: string | null) =>
    ["posts", token, siteId] as const,
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

export function useCategories(token: string | null, siteId: string | null) {
  return useQuery({
    queryKey: queryKeys.categories(token, siteId),
    queryFn: () => api.listCategories(token ?? "", siteId ?? ""),
    enabled: Boolean(token && siteId),
    initialData: [],
  })
}

export function usePosts(token: string | null, siteId: string | null) {
  return useQuery({
    queryKey: queryKeys.posts(token, siteId),
    queryFn: () => api.listPosts(token ?? "", siteId ?? ""),
    enabled: Boolean(token && siteId),
    initialData: [],
  })
}
