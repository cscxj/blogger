from __future__ import annotations

import json
from dataclasses import dataclass

import httpx
from pydantic import BaseModel, Field, ValidationError

from app.core.config import settings


class TranslationUnavailableError(RuntimeError):
    pass


@dataclass(frozen=True)
class TranslationSource:
    title: str
    excerpt: str | None
    meta_title: str | None
    meta_description: str | None
    html_content: str
    source_language: str
    target_language: str
    target_language_label: str


class TranslationResult(BaseModel):
    title: str = Field(min_length=1, max_length=240)
    excerpt: str | None = None
    meta_title: str | None = Field(default=None, max_length=255)
    meta_description: str | None = Field(default=None, max_length=500)
    html_content: str = Field(min_length=1)


def _endpoint(base_url: str) -> str:
    normalized = base_url.rstrip("/")
    if normalized.endswith("/chat/completions"):
        return normalized
    if normalized.endswith("/v1"):
        return f"{normalized}/chat/completions"
    return f"{normalized}/v1/chat/completions"


def _message_text(content: object) -> str:
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts: list[str] = []
        for item in content:
            if isinstance(item, dict) and item.get("type") == "text" and isinstance(item.get("text"), str):
                parts.append(item["text"])
        return "".join(parts)
    return ""


def _load_json_object(raw: str) -> dict[str, object]:
    text = raw.strip()
    if not text:
        raise TranslationUnavailableError("Translation model returned empty content")
    try:
        value = json.loads(text)
        if isinstance(value, dict):
            return value
    except json.JSONDecodeError:
        start = text.find("{")
        end = text.rfind("}")
        if start >= 0 and end > start:
            value = json.loads(text[start : end + 1])
            if isinstance(value, dict):
                return value
    raise TranslationUnavailableError("Translation model did not return a valid JSON object")


def _system_prompt() -> str:
    return (
        "You translate technical B2B blog articles into high-quality localized versions. "
        "Preserve HTML structure, links, tables, code snippets, image URLs, and heading ids when possible. "
        "Translate only user-visible natural language. Keep brand names, product names, model ids, URLs, and code literals unchanged unless a common localized form is clearly required. "
        "Return JSON only with keys: title, excerpt, meta_title, meta_description, html_content."
    )


async def translate_post(source: TranslationSource) -> TranslationResult:
    if not settings.translation_api_base_url or not settings.translation_api_key or not settings.translation_model:
        raise TranslationUnavailableError("Translation API is not configured")

    payload = {
        "model": settings.translation_model,
        "temperature": 0.2,
        "response_format": {"type": "json_object"},
        "messages": [
            {"role": "system", "content": _system_prompt()},
            {
                "role": "user",
                "content": json.dumps(
                    {
                        "task": "Translate this blog post into the target language as a draft article.",
                        "source_language": source.source_language,
                        "target_language": source.target_language,
                        "target_language_label": source.target_language_label,
                        "article": {
                            "title": source.title,
                            "excerpt": source.excerpt,
                            "meta_title": source.meta_title,
                            "meta_description": source.meta_description,
                            "html_content": source.html_content,
                        },
                        "requirements": [
                            "Preserve HTML tags and structure.",
                            "Preserve href, src, code, and product names.",
                            "Do not add new sections or remove factual content.",
                            "Keep output concise in SEO fields when they are present.",
                        ],
                    },
                    ensure_ascii=False,
                ),
            },
        ],
    }

    headers = {
        "Authorization": f"Bearer {settings.translation_api_key}",
        "Content-Type": "application/json",
    }

    try:
        async with httpx.AsyncClient(timeout=settings.translation_timeout_seconds) as client:
            response = await client.post(_endpoint(settings.translation_api_base_url), headers=headers, json=payload)
            response.raise_for_status()
    except httpx.HTTPError as exc:
        raise TranslationUnavailableError(f"Translation request failed: {exc}") from exc

    try:
        body = response.json()
    except json.JSONDecodeError as exc:
        raise TranslationUnavailableError("Translation provider returned invalid JSON") from exc

    choices = body.get("choices")
    if not isinstance(choices, list) or not choices:
        raise TranslationUnavailableError("Translation provider returned no choices")
    first = choices[0]
    if not isinstance(first, dict):
        raise TranslationUnavailableError("Translation provider returned an invalid choice payload")
    message = first.get("message")
    if not isinstance(message, dict):
        raise TranslationUnavailableError("Translation provider returned no message content")

    raw_content = _message_text(message.get("content"))
    data = _load_json_object(raw_content)
    try:
        return TranslationResult.model_validate(data)
    except ValidationError as exc:
        raise TranslationUnavailableError(f"Translation payload validation failed: {exc}") from exc
