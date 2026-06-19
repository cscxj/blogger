from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app import models, schemas
from app.dependencies import require_user
from app.db import get_db
from app.markdown_render import render_markdown
from app.routers.sites import owned_site_or_404

router = APIRouter(prefix="/api/sites/{site_id}/posts", tags=["posts"])


def owned_post_or_404(db: Session, site_id: str, post_id: str) -> models.Post:
    post = db.execute(
        select(models.Post)
        .options(selectinload(models.Post.author), selectinload(models.Post.category))
        .where(models.Post.id == post_id, models.Post.site_id == site_id)
    ).scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")
    return post


def assert_post_slug_available(db: Session, site_id: str, slug: str, current_id: str | None = None) -> None:
    post = db.execute(
        select(models.Post).where(models.Post.site_id == site_id, models.Post.slug == slug)
    ).scalar_one_or_none()
    if post and post.id != current_id:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Post slug already exists")


def assert_category_belongs_to_site(db: Session, site_id: str, category_id: str | None) -> None:
    if category_id is None:
        return
    category = db.get(models.Category, category_id)
    if not category or category.site_id != site_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid category")


def sync_publish_state(post: models.Post, status_value: str | None) -> None:
    if status_value == "published" and post.published_at is None:
        post.published_at = datetime.now(timezone.utc)
    if status_value == "draft":
        post.published_at = None


@router.get("", response_model=list[schemas.PostRead])
def list_posts(
    site_id: str,
    status_filter: schemas.Status | None = Query(default=None, alias="status"),
    category_id: str | None = None,
    q: str | None = None,
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    user: models.User = Depends(require_user),
    db: Session = Depends(get_db),
) -> list[models.Post]:
    owned_site_or_404(db, user.id, site_id)
    stmt = (
        select(models.Post)
        .options(selectinload(models.Post.author), selectinload(models.Post.category))
        .where(models.Post.site_id == site_id)
        .order_by(models.Post.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    if status_filter:
        stmt = stmt.where(models.Post.status == status_filter)
    if category_id:
        stmt = stmt.where(models.Post.category_id == category_id)
    if q:
        stmt = stmt.where(models.Post.title.ilike(f"%{q}%"))
    return list(db.execute(stmt).scalars().all())


@router.post("", response_model=schemas.PostRead, status_code=status.HTTP_201_CREATED)
def create_post(
    site_id: str,
    payload: schemas.PostCreate,
    user: models.User = Depends(require_user),
    db: Session = Depends(get_db),
) -> models.Post:
    owned_site_or_404(db, user.id, site_id)
    assert_post_slug_available(db, site_id, payload.slug)
    assert_category_belongs_to_site(db, site_id, payload.category_id)
    data = payload.model_dump()
    post = models.Post(
        site_id=site_id,
        author_id=user.id,
        html_content=render_markdown(payload.markdown_content),
        **data,
    )
    sync_publish_state(post, payload.status)
    db.add(post)
    db.commit()
    return owned_post_or_404(db, site_id, post.id)


@router.get("/{post_id}", response_model=schemas.PostRead)
def get_post(
    site_id: str,
    post_id: str,
    user: models.User = Depends(require_user),
    db: Session = Depends(get_db),
) -> models.Post:
    owned_site_or_404(db, user.id, site_id)
    return owned_post_or_404(db, site_id, post_id)


@router.patch("/{post_id}", response_model=schemas.PostRead)
def update_post(
    site_id: str,
    post_id: str,
    payload: schemas.PostUpdate,
    user: models.User = Depends(require_user),
    db: Session = Depends(get_db),
) -> models.Post:
    owned_site_or_404(db, user.id, site_id)
    post = owned_post_or_404(db, site_id, post_id)
    data = payload.model_dump(exclude_unset=True)
    if "slug" in data:
        assert_post_slug_available(db, site_id, data["slug"], current_id=post.id)
    if "category_id" in data:
        assert_category_belongs_to_site(db, site_id, data["category_id"])
    if "markdown_content" in data:
        post.html_content = render_markdown(data["markdown_content"] or "")
    for field, value in data.items():
        setattr(post, field, value)
    sync_publish_state(post, data.get("status"))
    db.add(post)
    db.commit()
    return owned_post_or_404(db, site_id, post.id)


@router.post("/{post_id}/publish", response_model=schemas.PostRead)
def publish_post(
    site_id: str,
    post_id: str,
    user: models.User = Depends(require_user),
    db: Session = Depends(get_db),
) -> models.Post:
    owned_site_or_404(db, user.id, site_id)
    post = owned_post_or_404(db, site_id, post_id)
    post.status = "published"
    sync_publish_state(post, "published")
    db.add(post)
    db.commit()
    return owned_post_or_404(db, site_id, post.id)


@router.post("/{post_id}/unpublish", response_model=schemas.PostRead)
def unpublish_post(
    site_id: str,
    post_id: str,
    user: models.User = Depends(require_user),
    db: Session = Depends(get_db),
) -> models.Post:
    owned_site_or_404(db, user.id, site_id)
    post = owned_post_or_404(db, site_id, post_id)
    post.status = "draft"
    sync_publish_state(post, "draft")
    db.add(post)
    db.commit()
    return owned_post_or_404(db, site_id, post.id)


@router.delete("/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_post(
    site_id: str,
    post_id: str,
    user: models.User = Depends(require_user),
    db: Session = Depends(get_db),
) -> None:
    owned_site_or_404(db, user.id, site_id)
    post = owned_post_or_404(db, site_id, post_id)
    db.delete(post)
    db.commit()
