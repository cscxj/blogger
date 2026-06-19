from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app import models, schemas
from app.dependencies import require_super_admin, require_user
from app.db import get_db
from app.site_icons import fetch_site_icon

router = APIRouter(prefix="/api/sites", tags=["sites"])


def owned_site_or_404(db: Session, user_id: str, site_id: str) -> models.Site:
    site = db.get(models.Site, site_id)
    if not site:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Site not found")
    return site


def assert_site_slug_available(db: Session, user_id: str, slug: str, current_id: str | None = None) -> None:
    query = select(models.Site).where(models.Site.slug == slug)
    site = db.execute(query).scalar_one_or_none()
    if site and site.id != current_id:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Site slug already exists")


def language_keys(site: models.Site) -> set[str]:
    return {
        language.get("key", "")
        for language in (site.languages or [])
        if isinstance(language, dict) and language.get("key")
    }


def assert_languages_can_replace(db: Session, site: models.Site, languages: list[schemas.SiteLanguage]) -> None:
    next_keys = {language.key for language in languages}
    used_keys = {
        key
        for key in db.execute(select(models.Post.language).where(models.Post.site_id == site.id).distinct()).scalars().all()
        if key
    }
    missing_keys = sorted(used_keys - next_keys)
    if missing_keys:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot remove languages used by posts: {', '.join(missing_keys)}",
        )


@router.get("", response_model=list[schemas.SiteRead])
def list_sites(
    user: models.User = Depends(require_user),
    db: Session = Depends(get_db),
) -> list[models.Site]:
    return list(db.execute(select(models.Site).order_by(models.Site.name.asc())).scalars().all())


@router.post("", response_model=schemas.SiteRead, status_code=status.HTTP_201_CREATED)
async def create_site(
    payload: schemas.SiteCreate,
    user: models.User = Depends(require_super_admin),
    db: Session = Depends(get_db),
) -> models.Site:
    assert_site_slug_available(db, user.id, payload.slug)
    site = models.Site(owner_id=user.id, **payload.model_dump(), icon_url=await fetch_site_icon(payload.base_url))
    db.add(site)
    db.commit()
    db.refresh(site)
    return site


@router.get("/{site_id}", response_model=schemas.SiteRead)
def get_site(
    site_id: str,
    user: models.User = Depends(require_user),
    db: Session = Depends(get_db),
) -> models.Site:
    return owned_site_or_404(db, user.id, site_id)


@router.patch("/{site_id}", response_model=schemas.SiteRead)
async def update_site(
    site_id: str,
    payload: schemas.SiteUpdate,
    user: models.User = Depends(require_super_admin),
    db: Session = Depends(get_db),
) -> models.Site:
    site = owned_site_or_404(db, user.id, site_id)
    data = payload.model_dump(exclude_unset=True)
    if "slug" in data:
        assert_site_slug_available(db, user.id, data["slug"], current_id=site.id)
    if "languages" in data:
        assert_languages_can_replace(db, site, payload.languages or [])
    for field, value in data.items():
        setattr(site, field, value)
    if "base_url" in data:
        site.icon_url = await fetch_site_icon(site.base_url)
    db.add(site)
    db.commit()
    db.refresh(site)
    return site


@router.delete("/{site_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_site(
    site_id: str,
    user: models.User = Depends(require_super_admin),
    db: Session = Depends(get_db),
) -> None:
    site = owned_site_or_404(db, user.id, site_id)
    db.delete(site)
    db.commit()
