from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app import models, schemas
from app.dependencies import require_super_admin, require_user
from app.db import get_db

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("/me", response_model=schemas.UserRead)
def get_me(user: models.User = Depends(require_user)) -> models.User:
    return user


@router.patch("/me", response_model=schemas.UserRead)
def update_me(
    payload: schemas.UserUpdate,
    user: models.User = Depends(require_user),
    db: Session = Depends(get_db),
) -> models.User:
    data = payload.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(user, field, value)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.get("", response_model=list[schemas.UserRead])
def list_users(
    _admin: models.User = Depends(require_super_admin),
    db: Session = Depends(get_db),
) -> list[models.User]:
    return list(db.execute(select(models.User).order_by(models.User.created_at.desc())).scalars().all())


@router.patch("/{user_id}", response_model=schemas.UserRead)
def update_user(
    user_id: str,
    payload: schemas.UserAdminUpdate,
    admin: models.User = Depends(require_super_admin),
    db: Session = Depends(get_db),
) -> models.User:
    user = db.get(models.User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    data = payload.model_dump(exclude_unset=True)
    if user.id == admin.id and data.get("is_active") is False:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot deactivate yourself")
    for field, value in data.items():
        setattr(user, field, value)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
