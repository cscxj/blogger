export function getAdminPageTitle(pathname: string, t: (key: string) => string) {
  if (pathname === "/posts/new") {
    return t("posts.new")
  }

  if (pathname.startsWith("/posts/")) {
    return t("posts.edit")
  }

  if (pathname.startsWith("/categories")) {
    return t("nav.categories")
  }

  if (pathname.startsWith("/keys")) {
    return t("nav.keys")
  }

  if (pathname.startsWith("/profile")) {
    return t("nav.profile")
  }

  if (pathname.startsWith("/sites")) {
    return t("nav.sites")
  }

  if (pathname.startsWith("/users")) {
    return t("nav.users")
  }

  return t("nav.posts")
}
