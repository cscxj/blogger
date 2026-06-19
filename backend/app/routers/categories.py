from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app import models, schemas
from app.dependencies import require_user
from app.db import get_db
from app.routers.sites import owned_site_or_404

router = APIRouter(prefix="/api/sites/{site_id}/categories", tags=["categories"])


def owned_category_or_404(db: Session, site_id: str, category_id: str) -> models.Category:
    category = db.get(models.Category, category_id)
    if not category or category.site_id != site_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
    return category


def assert_category_slug_available(db: Session, site_id: str, slug: str, current_id: str | None = None) -> None:
    category = db.execute(
        select(models.Category).where(models.Category.site_id == site_id, models.Category.slug == slug)
    ).scalar_one_or_none()
    if category and category.id != current_id:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Category slug already exists")


@router.get("", response_model=list[schemas.CategoryRead])
def list_categories(
    site_id: str,
    user: models.User = Depends(require_user),
    db: Session = Depends(get_db),
) -> list[models.Category]:
    owned_site_or_404(db, user.id, site_id)
    return list(
        db.execute(
            select(models.Category)
            .where(models.Category.site_id == site_id)
            .order_by(models.Category.name.asc())
        )
        .scalars()
        .all()
    )


@router.post("", response_model=schemas.CategoryRead, status_code=status.HTTP_201_CREATED)
def create_category(
    site_id: str,
    payload: schemas.CategoryCreate,
    user: models.User = Depends(require_user),
    db: Session = Depends(get_db),
) -> models.Category:
    owned_site_or_404(db, user.id, site_id)
    assert_category_slug_available(db, site_id, payload.slug)
    category = models.Category(site_id=site_id, **payload.model_dump())
    db.add(category)
    db.commit()
    db.refresh(category)
    return category


@router.patch("/{category_id}", response_model=schemas.CategoryRead)
def update_category(
    site_id: str,
    category_id: str,
    payload: schemas.CategoryUpdate,
    user: models.User = Depends(require_user),
    db: Session = Depends(get_db),
) -> models.Category:
    owned_site_or_404(db, user.id, site_id)
    category = owned_category_or_404(db, site_id, category_id)
    data = payload.model_dump(exclude_unset=True)
    if "slug" in data:
        assert_category_slug_available(db, site_id, data["slug"], current_id=category.id)
    for field, value in data.items():
        setattr(category, field, value)
    db.add(category)
    db.commit()
    db.refresh(category)
    return category


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(
    site_id: str,
    category_id: str,
    user: models.User = Depends(require_user),
    db: Session = Depends(get_db),
) -> None:
    owned_site_or_404(db, user.id, site_id)
    category = owned_category_or_404(db, site_id, category_id)
    for post in category.posts:
        post.category_id = None
        db.add(post)
    db.delete(category)
    db.commit()
