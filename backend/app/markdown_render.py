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


def render_markdown(markdown_text: str) -> str:
    raw_html = markdown.markdown(
        markdown_text or "",
        extensions=["extra", "sane_lists", "toc"],
        output_format="html5",
    )
    return sanitize_html_fragment(raw_html)


def sanitize_html_fragment(html_text: str) -> str:
    return bleach.clean(
        html_text or "",
        tags=ALLOWED_TAGS,
        attributes=ALLOWED_ATTRIBUTES,
        protocols=["http", "https", "mailto"],
        strip=True,
    )
