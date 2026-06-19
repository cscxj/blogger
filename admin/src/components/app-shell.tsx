import { useEffect, useMemo, useState } from "react"
import type { ComponentType } from "react"
import {
  BookOpen,
  FileText,
  FolderTree,
  Globe2,
  KeyRound,
  LogOut,
  RefreshCw,
  UserCircle,
} from "lucide-react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { useQueryClient } from "@tanstack/react-query"

import { IconButton } from "@/components/icon-button"
import { LanguageMenu } from "@/components/language-menu"
import { SimpleSelect } from "@/components/simple-select"
import { ThemeMenu } from "@/components/theme-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { AuthScreen } from "@/features/auth/auth-screen"
import { AccessKeysView } from "@/features/access-keys/access-keys-view"
import { CategoriesView } from "@/features/categories/categories-view"
import { PostsView } from "@/features/posts/posts-view"
import { ProfileView } from "@/features/profile/profile-view"
import { SitesView } from "@/features/sites/sites-view"
import {
  useAccessKeys,
  useCategories,
  useMe,
  usePosts,
  useSites,
} from "@/hooks/use-blogger-queries"
import { ApiError, API_URL } from "@/lib/api"
import { cn } from "@/lib/utils"
import { useAuth } from "@/context/auth-context"

type View = "posts" | "categories" | "sites" | "keys" | "profile"

const navItems: Array<{
  id: View
  icon: ComponentType<{ className?: string }>
  labelKey: string
}> = [
  { id: "posts", icon: FileText, labelKey: "nav.posts" },
  { id: "categories", icon: FolderTree, labelKey: "nav.categories" },
  { id: "sites", icon: Globe2, labelKey: "nav.sites" },
  { id: "keys", icon: KeyRound, labelKey: "nav.keys" },
  { id: "profile", icon: UserCircle, labelKey: "nav.profile" },
]

export function AppShell() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { token, user, setUser, signOut } = useAuth()
  const [view, setView] = useState<View>("posts")
  const [selectedSiteId, setSelectedSiteId] = useState("")

  const meQuery = useMe(token)
  const sitesQuery = useSites(token)
  const accessKeysQuery = useAccessKeys(token)
  const sites = useMemo(() => sitesQuery.data ?? [], [sitesQuery.data])

  const selectedSite = useMemo(
    () => sites.find((site) => site.id === selectedSiteId) ?? sites[0] ?? null,
    [selectedSiteId, sites]
  )
  const categoriesQuery = useCategories(token, selectedSite?.id ?? null)
  const postsQuery = usePosts(token, selectedSite?.id ?? null)

  useEffect(() => {
    if (meQuery.data) {
      setUser(meQuery.data)
    }
  }, [meQuery.data, setUser])

  useEffect(() => {
    const error =
      meQuery.error ||
      sitesQuery.error ||
      accessKeysQuery.error ||
      categoriesQuery.error ||
      postsQuery.error

    if (!error) {
      return
    }

    if (error instanceof ApiError && error.status === 401) {
      signOut()
      return
    }

    toast.error(error instanceof Error ? error.message : String(error))
  }, [
    accessKeysQuery.error,
    categoriesQuery.error,
    meQuery.error,
    postsQuery.error,
    signOut,
    sitesQuery.error,
  ])

  if (!token) {
    return <AuthScreen />
  }

  const activeUser = user ?? meQuery.data ?? null

  if (meQuery.isLoading && !activeUser) {
    return <AppSkeleton />
  }

  async function refreshAll() {
    await queryClient.invalidateQueries()
  }

  return (
    <div className="min-h-svh bg-background">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 border-r border-sidebar-border bg-sidebar px-4 py-5 text-sidebar-foreground lg:block">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            <BookOpen className="size-5" aria-hidden="true" />
          </div>
          <div>
            <div className="text-sm font-medium">{t("app.name")}</div>
            <div className="text-xs text-muted-foreground">
              {t("app.subtitle")}
            </div>
          </div>
        </div>
        <nav className="space-y-1">
          {navItems.map((item) => (
            <NavButton
              key={item.id}
              active={view === item.id}
              icon={item.icon}
              label={t(item.labelKey)}
              onClick={() => setView(item.id)}
            />
          ))}
        </nav>
      </aside>

      <main className="lg:pl-64">
        <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
          <div className="flex min-h-16 flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between lg:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <SimpleSelect
                aria-label={t("nav.sites")}
                value={selectedSite?.id ?? ""}
                onValueChange={setSelectedSiteId}
                className="w-56"
                placeholder={t("posts.createSiteFirst")}
                disabled={sites.length === 0}
                options={sites.map((site) => ({
                  value: site.id,
                  label: site.name,
                }))}
              />
              <Badge variant="outline" className="hidden md:inline-flex">
                {t("common.api")}: {API_URL.replace(/^https?:\/\//, "")}
              </Badge>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => void refreshAll()}
                disabled={
                  sitesQuery.isFetching ||
                  categoriesQuery.isFetching ||
                  postsQuery.isFetching
                }
              >
                <RefreshCw
                  className={cn(
                    (sitesQuery.isFetching ||
                      categoriesQuery.isFetching ||
                      postsQuery.isFetching) &&
                      "animate-spin"
                  )}
                />
                {t("common.refresh")}
              </Button>
              <LanguageMenu />
              <ThemeMenu />
              <div className="hidden items-center gap-2 md:flex">
                <Avatar className="size-7">
                  <AvatarImage src={activeUser?.avatar_url ?? undefined} />
                  <AvatarFallback>
                    {(activeUser?.nickname || activeUser?.email || "B")
                      .slice(0, 1)
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="max-w-40 truncate text-sm text-muted-foreground">
                  {activeUser?.nickname || activeUser?.email}
                </div>
              </div>
              <IconButton label={t("common.signOut")} onClick={signOut}>
                <LogOut />
              </IconButton>
            </div>
          </div>
          <div className="flex gap-1 overflow-x-auto border-t px-4 py-2 lg:hidden">
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <Button
                  key={item.id}
                  variant={view === item.id ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setView(item.id)}
                >
                  <Icon />
                  {t(item.labelKey)}
                </Button>
              )
            })}
          </div>
        </header>

        <div className="px-4 py-5 lg:px-6">
          {view === "posts" ? (
            <PostsView
              token={token}
              site={selectedSite}
              categories={categoriesQuery.data ?? []}
              posts={postsQuery.data ?? []}
            />
          ) : null}
          {view === "categories" ? (
            <CategoriesView
              token={token}
              site={selectedSite}
              categories={categoriesQuery.data ?? []}
            />
          ) : null}
          {view === "sites" ? (
            <SitesView
              token={token}
              sites={sites}
              selectedSiteId={selectedSite?.id ?? ""}
              onSelectSite={setSelectedSiteId}
            />
          ) : null}
          {view === "keys" ? (
            <AccessKeysView
              token={token}
              accessKeys={accessKeysQuery.data ?? []}
            />
          ) : null}
          {view === "profile" && activeUser ? (
            <ProfileView
              token={token}
              user={activeUser}
              onUserChange={setUser}
            />
          ) : null}
        </div>
      </main>
    </div>
  )
}

function NavButton({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean
  icon: ComponentType<{ className?: string }>
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors",
        active
          ? "bg-sidebar-primary text-sidebar-primary-foreground"
          : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
      )}
    >
      <Icon className="size-4" />
      {label}
    </button>
  )
}

function AppSkeleton() {
  return (
    <div className="grid min-h-svh gap-4 p-6">
      <Skeleton className="h-10 w-56" />
      <div className="grid gap-4 md:grid-cols-[280px,1fr]">
        <Skeleton className="h-96" />
        <Skeleton className="h-96" />
      </div>
    </div>
  )
}
