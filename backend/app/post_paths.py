from app import models


def default_language_key(site: models.Site) -> str | None:
    for language in site.languages or []:
        if isinstance(language, dict) and language.get("key"):
            return str(language["key"])
    return None


def localized_post_path(site: models.Site, language: str, slug: str) -> str:
    default_language = default_language_key(site)
    if language == default_language or default_language is None:
        return f"/blog/{slug}"
    return f"/{language}/blog/{slug}"


def localized_post_canonical_url(site: models.Site, language: str, slug: str) -> str | None:
    if not site.base_url:
        return None
    return f"{site.base_url.rstrip('/')}{localized_post_path(site, language, slug)}"
