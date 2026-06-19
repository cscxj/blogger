from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app import models, schemas
from app.dependencies import Principal, get_current_principal
from app.db import get_db

router = APIRouter(prefix="/api/integration", tags=["integration"])


def owned_site_by_slug_or_404(db: Session, user_id: str, site_slug: str) -> models.Site:
    site = db.execute(
        select(models.Site).where(models.Site.owner_id == user_id, models.Site.slug == site_slug)
    ).scalar_one_or_none()
    if not site:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Site not found")
    return site


def integration_post(site: models.Site, post: models.Post) -> schemas.IntegrationPost:
    return schemas.IntegrationPost(
        id=post.id,
        site_slug=site.slug,
        title=post.title,
        slug=post.slug,
        path=f"/blog/{post.slug}",
        html_content=post.html_content,
        excerpt=post.excerpt,
        cover_image_url=post.cover_image_url,
        meta_title=post.meta_title,
        meta_description=post.meta_description,
        canonical_url=post.canonical_url,
        published_at=post.published_at,
        updated_at=post.updated_at,
        author=post.author,
        category=post.category,
    )


@router.get("/sites", response_model=list[schemas.SiteRead])
def list_integration_sites(
    principal: Principal = Depends(get_current_principal),
    db: Session = Depends(get_db),
) -> list[models.Site]:
    return list(db.execute(select(models.Site).where(models.Site.owner_id == principal.user.id)).scalars().all())


@router.get("/sites/{site_slug}/categories", response_model=list[schemas.CategoryRead])
def list_integration_categories(
    site_slug: str,
    principal: Principal = Depends(get_current_principal),
    db: Session = Depends(get_db),
) -> list[models.Category]:
    site = owned_site_by_slug_or_404(db, principal.user.id, site_slug)
    return list(
        db.execute(
            select(models.Category)
            .where(models.Category.site_id == site.id)
            .order_by(models.Category.name.asc())
        )
        .scalars()
        .all()
    )


@router.get("/sites/{site_slug}/posts", response_model=list[schemas.IntegrationPost])
def list_integration_posts(
    site_slug: str,
    category_slug: str | None = None,
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    principal: Principal = Depends(get_current_principal),
    db: Session = Depends(get_db),
) -> list[schemas.IntegrationPost]:
    site = owned_site_by_slug_or_404(db, principal.user.id, site_slug)
    stmt = (
        select(models.Post)
        .options(selectinload(models.Post.author), selectinload(models.Post.category))
        .where(models.Post.site_id == site.id, models.Post.status == "published")
        .order_by(models.Post.published_at.desc(), models.Post.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    if category_slug:
        stmt = stmt.join(models.Category).where(models.Category.slug == category_slug)
    posts = list(db.execute(stmt).scalars().all())
    return [integration_post(site, post) for post in posts]


@router.get("/sites/{site_slug}/posts/{post_slug}", response_model=schemas.IntegrationPost)
def get_integration_post(
    site_slug: str,
    post_slug: str,
    principal: Principal = Depends(get_current_principal),
    db: Session = Depends(get_db),
) -> schemas.IntegrationPost:
    site = owned_site_by_slug_or_404(db, principal.user.id, site_slug)
    post = db.execute(
        select(models.Post)
        .options(selectinload(models.Post.author), selectinload(models.Post.category))
        .where(
            models.Post.site_id == site.id,
            models.Post.slug == post_slug,
            models.Post.status == "published",
        )
    ).scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")
    return integration_post(site, post)
