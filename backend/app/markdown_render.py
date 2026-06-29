import re

import bleach
import markdown

ALLOWED_TAGS = set(bleach.sanitizer.ALLOWED_TAGS).union(
    {
        "article",
        "aside",
        "blockquote",
        "br",
        "code",
        "del",
        "details",
        "div",
        "figure",
        "figcaption",
        "h1",
        "h2",
        "h3",
        "h4",
        "h5",
        "h6",
        "hr",
        "img",
        "ins",
        "li",
        "ol",
        "p",
        "pre",
        "section",
        "span",
        "strong",
        "summary",
        "table",
        "tbody",
        "td",
        "th",
        "thead",
        "tr",
        "ul",
    }
)

ALLOWED_ATTRIBUTES = {
    "*": ["class", "id"],
    "a": ["href", "rel", "target", "title"],
    "img": ["alt", "src", "title"],
    "td": ["align"],
    "th": ["align"],
}

_AI_REVIEW_SIGNAL_RE = re.compile(
    r"(?is)"
    r"\[!important\]|"
    r"translation request failed|"
    r"server error ['\"]?503|"
    r"503 service unavailable|"
    r"blogger publish endpoint|"
    r"still not live|"
    r"target url still returns|"
    r"memory was updated|"
    r"tried publishing again|"
    r"stopped as requested"
)
_MARKDOWN_REVIEW_HEADING_RE = re.compile(r"(?im)^[ \t]{0,3}#{1,6}[ \t]+Review Notes[ \t]*#*[ \t]*$")
_HTML_REVIEW_HEADING_RE = re.compile(
    r"(?is)<h([1-6])\b[^>]*>\s*(?:<[^>]+>\s*)*Review Notes\s*(?:</[^>]+>\s*)*</h\1>"
)
_HTML_HEADING_RE = re.compile(r"(?is)<h([1-6])\b[^>]*>")


def _is_ai_review_section(section: str) -> bool:
    return bool(_AI_REVIEW_SIGNAL_RE.search(section))


def clean_article_markdown(markdown_text: str) -> str:
    text = markdown_text or ""
    matches = list(_MARKDOWN_REVIEW_HEADING_RE.finditer(text))
    if not matches:
        return text

    cleaned = text
    for index in range(len(matches) - 1, -1, -1):
        match = matches[index]
        start = match.start()
        end = matches[index + 1].start() if index + 1 < len(matches) else len(text)
        section = text[start:end]
        if _is_ai_review_section(section):
            cleaned = f"{cleaned[:start].rstrip()}\n{cleaned[end:].lstrip()}"

    return cleaned.strip()


def clean_article_html(html_text: str) -> str:
    html = html_text or ""
    matches = list(_HTML_REVIEW_HEADING_RE.finditer(html))
    if not matches:
        return html

    cleaned = html
    for match in reversed(matches):
        level = int(match.group(1))
        next_heading = None
        for heading in _HTML_HEADING_RE.finditer(html, match.end()):
            if int(heading.group(1)) <= level:
                next_heading = heading.start()
                break
        end = next_heading if next_heading is not None else len(html)
        section = html[match.start() : end]
        if _is_ai_review_section(section):
            cleaned = f"{cleaned[:match.start()].rstrip()}\n{cleaned[end:].lstrip()}"

    return cleaned.strip()


def render_markdown(markdown_text: str) -> str:
    raw_html = markdown.markdown(
        clean_article_markdown(markdown_text),
        extensions=["extra", "sane_lists", "toc"],
        output_format="html5",
    )
    return sanitize_html_fragment(raw_html)


def sanitize_html_fragment(html_text: str) -> str:
    return bleach.clean(
        clean_article_html(html_text),
        tags=ALLOWED_TAGS,
        attributes=ALLOWED_ATTRIBUTES,
        protocols=["http", "https", "mailto"],
        strip=True,
    )
