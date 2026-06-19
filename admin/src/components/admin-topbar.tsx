import { LogOut, RefreshCw, Shield, UserCircle } from "lucide-react"
import { useTranslation } from "react-i18next"

import { LanguageMenu } from "@/components/language-menu"
import { SiteSelect } from "@/components/site-select"
import { ThemeMenu } from "@/components/theme-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { API_URL } from "@/lib/api"
import { cn } from "@/lib/utils"
import type { Site, User } from "@/types"

export function AdminTopbar({
  title,
  selectedSite,
  sites,
  isRefreshing,
  onSelectSite,
  onRefresh,
  user,
  isSuperAdmin,
  onProfile,
  onSignOut,
}: {
  title: string
  selectedSite: Site | null
  sites: Site[]
  isRefreshing: boolean
  onSelectSite: (siteId: string) => void
  onRefresh: () => void
  user: User | null
  isSuperAdmin: boolean
  onProfile: () => void
  onSignOut: () => void
}) {
  const { t } = useTranslation()

  return (
    <header className="flex min-h-16 shrink-0 flex-col gap-2 border-b bg-background px-4 py-3 md:flex-row md:items-center md:justify-between">
      <div className="flex min-w-0 items-center gap-2">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 hidden h-4 md:block" />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbPage className="line-clamp-1">{title}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <div className="flex flex-wrap items-center gap-2 md:justify-end">
        <SiteSelect
          value={selectedSite?.id ?? ""}
          onValueChange={onSelectSite}
          sites={sites}
          className="w-full sm:w-60"
          placeholder={t("posts.createSiteFirst")}
        />
        <Badge variant="outline" className="hidden lg:inline-flex">
          {t("common.api")}: {API_URL.replace(/^https?:\/\//, "")}
        </Badge>
        <Button variant="outline" size="sm" onClick={onRefresh} disabled={isRefreshing}>
          <RefreshCw className={cn("size-4", isRefreshing && "animate-spin")} />
          {t("common.refresh")}
        </Button>
        <LanguageMenu />
        <ThemeMenu />
        <UserMenu
          user={user}
          isSuperAdmin={isSuperAdmin}
          onProfile={onProfile}
          onSignOut={onSignOut}
        />
      </div>
    </header>
  )
}

function UserMenu({
  user,
  isSuperAdmin,
  onProfile,
  onSignOut,
}: {
  user: User | null
  isSuperAdmin: boolean
  onProfile: () => void
  onSignOut: () => void
}) {
  const { t } = useTranslation()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <Avatar className="size-7">
            <AvatarImage src={user?.avatar_url ?? undefined} />
            <AvatarFallback>
              {(user?.nickname || user?.email || "B").slice(0, 1).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="hidden max-w-36 truncate md:inline">{user?.nickname || user?.email}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="truncate">{user?.email}</div>
          <div className="mt-1 flex items-center gap-1 text-xs font-normal text-muted-foreground">
            {isSuperAdmin ? <Shield className="size-3" /> : <UserCircle className="size-3" />}
            {isSuperAdmin ? t("users.superAdmin") : t("users.operator")}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onProfile}>
          <UserCircle />
          {t("profile.title")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onSignOut}>
          <LogOut />
          {t("common.signOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
