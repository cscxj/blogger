from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field

Status = Literal["draft", "published"]
LanguageCode = Literal[
    "en",
    "zh",
    "es",
    "fr",
    "de",
    "ja",
    "ko",
    "pt",
    "it",
    "nl",
    "ru",
    "ar",
    "hi",
    "id",
    "vi",
    "th",
]
UserRole = Literal["super_admin", "operator"]

LANGUAGE_OPTIONS: tuple[LanguageCode, ...] = (
    "en",
    "zh",
    "es",
    "fr",
    "de",
    "ja",
    "ko",
    "pt",
    "it",
    "nl",
    "ru",
    "ar",
    "hi",
    "id",
    "vi",
    "th",
)


class UserBase(BaseModel):
    email: EmailStr
    nickname: str | None = None
    avatar_url: str | None = None


class UserCreate(UserBase):
    password: str = Field(min_length=8, max_length=128)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserUpdate(BaseModel):
    nickname: str | None = Field(default=None, max_length=120)
    avatar_url: str | None = Field(default=None, max_length=1000)


class UserRead(UserBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    role: UserRole
    is_active: bool
    created_at: datetime
    updated_at: datetime


class UserAdminUpdate(BaseModel):
    nickname: str | None = Field(default=None, max_length=120)
    avatar_url: str | None = Field(default=None, max_length=1000)
    role: UserRole | None = None
    is_active: bool | None = None


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserRead


class AccessKeyCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)


class AccessKeyRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    key_prefix: str
    last_used_at: datetime | None
    revoked_at: datetime | None
    created_at: datetime


class AccessKeyCreated(AccessKeyRead):
    access_key: str


class SiteBase(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    slug: str = Field(min_length=1, max_length=120, pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
    base_url: str | None = Field(default=None, max_length=1000)
    description: str | None = None


class SiteCreate(SiteBase):
    pass


class SiteUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=160)
    slug: str | None = Field(default=None, min_length=1, max_length=120, pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
    base_url: str | None = Field(default=None, max_length=1000)
    description: str | None = None


class SiteRead(SiteBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    icon_url: str | None = None
    created_at: datetime
    updated_at: datetime


class CategoryBase(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    slug: str = Field(min_length=1, max_length=120, pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
    description: str | None = None


class CategoryCreate(CategoryBase):
    pass


class CategoryUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    slug: str | None = Field(default=None, min_length=1, max_length=120, pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
    description: str | None = None


class CategoryRead(CategoryBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    site_id: str
    created_at: datetime
    updated_at: datetime


class PostBase(BaseModel):
    title: str = Field(min_length=1, max_length=240)
    slug: str = Field(min_length=1, max_length=160, pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
    language: LanguageCode = "en"
    markdown_content: str = Field(min_length=1)
    excerpt: str | None = None
    cover_image_url: str | None = Field(default=None, max_length=1000)
    meta_title: str | None = Field(default=None, max_length=255)
    meta_description: str | None = Field(default=None, max_length=500)
    canonical_url: str | None = Field(default=None, max_length=1000)
    category_id: str | None = None


class PostCreate(PostBase):
    model_config = ConfigDict(extra="forbid")


class PostUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str | None = Field(default=None, min_length=1, max_length=240)
    slug: str | None = Field(default=None, min_length=1, max_length=160, pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
    language: LanguageCode | None = None
    markdown_content: str | None = Field(default=None, min_length=1)
    excerpt: str | None = None
    cover_image_url: str | None = Field(default=None, max_length=1000)
    meta_title: str | None = Field(default=None, max_length=255)
    meta_description: str | None = Field(default=None, max_length=500)
    canonical_url: str | None = Field(default=None, max_length=1000)
    category_id: str | None = None


class AuthorRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    email: EmailStr
    nickname: str | None
    avatar_url: str | None


class PostRead(PostBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    site_id: str
    author_id: str
    status: Status
    markdown_content: str
    html_content: str
    published_at: datetime | None
    created_at: datetime
    updated_at: datetime
    author: AuthorRead
    category: CategoryRead | None = None


class PostListResponse(BaseModel):
    items: list[PostRead]
    total: int
    limit: int
    offset: int


class IntegrationPost(BaseModel):
    id: str
    site_slug: str
    title: str
    slug: str
    language: LanguageCode
    path: str
    html_content: str
    excerpt: str | None
    cover_image_url: str | None
    meta_title: str | None
    meta_description: str | None
    canonical_url: str | None
    published_at: datetime | None
    updated_at: datetime
    author: AuthorRead
    category: CategoryRead | None = None


class UploadResponse(BaseModel):
    url: str
