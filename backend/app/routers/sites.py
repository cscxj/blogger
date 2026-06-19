from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app import models, schemas
from app.dependencies import require_user
from app.db import get_db

router = APIRouter(prefix="/api/sites", tags=["sites"])


def owned_site_or_404(db: Session, user_id: str, site_id: str) -> models.Site:
    site = db.get(models.Site, site_id)
    if not site or site.owner_id != user_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Site not found")
    return site


def assert_site_slug_available(db: Session, user_id: str, slug: str, current_id: str | None = None) -> None:
    query = select(models.Site).where(models.Site.owner_id == user_id, models.Site.slug == slug)
    site = db.execute(query).scalar_one_or_none()
    if site and site.id != current_id:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Site slug already exists")


@router.get("", response_model=list[schemas.SiteRead])
def list_sites(
    user: models.User = Depends(require_user),
    db: Session = Depends(get_db),
) -> list[models.Site]:
    return list(db.execute(select(models.Site).where(models.Site.owner_id == user.id)).scalars().all())


@router.post("", response_model=schemas.SiteRead, status_code=status.HTTP_201_CREATED)
def create_site(
    payload: schemas.SiteCreate,
    user: models.User = Depends(require_user),
    db: Session = Depends(get_db),
) -> models.Site:
    assert_site_slug_available(db, user.id, payload.slug)
    site = models.Site(owner_id=user.id, **payload.model_dump())
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
def update_site(
    site_id: str,
    payload: schemas.SiteUpdate,
    user: models.User = Depends(require_user),
    db: Session = Depends(get_db),
) -> models.Site:
    site = owned_site_or_404(db, user.id, site_id)
    data = payload.model_dump(exclude_unset=True)
    if "slug" in data:
        assert_site_slug_available(db, user.id, data["slug"], current_id=site.id)
    for field, value in data.items():
        setattr(site, field, value)
    db.add(site)
    db.commit()
    db.refresh(site)
    return site


@router.delete("/{site_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_site(
    site_id: str,
    user: models.User = Depends(require_user),
    db: Session = Depends(get_db),
) -> None:
    site = owned_site_or_404(db, user.id, site_id)
    db.delete(site)
    db.commit()
