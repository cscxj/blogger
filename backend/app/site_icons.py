from __future__ import annotations

import re
from urllib.parse import urljoin

import httpx

ICON_RE = re.compile(
    r"<link[^>]+rel=[\"'][^\"']*(?:icon|shortcut icon|apple-touch-icon)[^\"']*[\"'][^>]+>",
    re.IGNORECASE,
)
HREF_RE = re.compile(r"href=[\"']([^\"']+)[\"']", re.IGNORECASE)


async def fetch_site_icon(base_url: str | None) -> str | None:
    if not base_url:
        return None

    url = base_url if base_url.startswith(("http://", "https://")) else f"https://{base_url}"
    try:
        async with httpx.AsyncClient(timeout=3.0, follow_redirects=True) as client:
            response = await client.get(url)
            if response.status_code < 400:
                match = ICON_RE.search(response.text[:100_000])
                if match:
                    href = HREF_RE.search(match.group(0))
                    if href:
                        return urljoin(str(response.url), href.group(1))

            fallback = urljoin(url, "/favicon.ico")
            icon_response = await client.head(fallback)
            if icon_response.status_code < 400:
                return fallback
    except httpx.HTTPError:
        return None

    return None
