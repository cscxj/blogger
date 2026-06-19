import type { ComponentType } from "react"
import {
  BookOpen,
  FileText,
  FolderTree,
  KeyRound,
  Settings,
  Users,
} from "lucide-react"
import { useTranslation } from "react-i18next"
import { NavLink } from "react-router-dom"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { API_URL } from "@/lib/api"

type NavItem = {
  path: string
  icon: ComponentType<{ className?: string }>
  labelKey: string
  superAdminOnly?: boolean
}

const navItems: NavItem[] = [
  { path: "/posts", icon: FileText, labelKey: "nav.posts" },
  { path: "/categories", icon: FolderTree, labelKey: "nav.categories" },
  { path: "/keys", icon: KeyRound, labelKey: "nav.keys" },
  { path: "/sites", icon: Settings, labelKey: "nav.sites", superAdminOnly: true },
  { path: "/users", icon: Users, labelKey: "nav.users", superAdminOnly: true },
]

export function AdminSidebar({
  isSuperAdmin,
  pathname,
}: {
  isSuperAdmin: boolean
  pathname: string
}) {
  const { t } = useTranslation()
  const visibleNavItems = navItems.filter((item) => !item.superAdminOnly || isSuperAdmin)

  return (
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild tooltip={t("app.admin")}>
              <NavLink to="/posts">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <BookOpen className="size-4" aria-hidden="true" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">{t("app.name")}</span>
                  <span className="truncate text-xs">{t("app.subtitle")}</span>
                </div>
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{t("app.admin")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleNavItems.map((item) => (
                <NavButton
                  key={item.path}
                  item={item}
                  label={t(item.labelKey)}
                  isActive={isActiveRoute(pathname, item.path)}
                />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <div className="rounded-md border border-sidebar-border px-2 py-1.5 text-xs text-sidebar-foreground/70 group-data-[collapsible=icon]:hidden">
          {API_URL.replace(/^https?:\/\//, "")}
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

function NavButton({
  item,
  label,
  isActive,
}: {
  item: NavItem
  label: string
  isActive: boolean
}) {
  const Icon = item.icon

  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={isActive} tooltip={label}>
        <NavLink to={item.path}>
          <Icon />
          <span>{label}</span>
        </NavLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

function isActiveRoute(pathname: string, path: string) {
  if (path === "/posts") {
    return pathname === "/posts" || pathname.startsWith("/posts/")
  }

  return pathname === path || pathname.startsWith(`${path}/`)
}
