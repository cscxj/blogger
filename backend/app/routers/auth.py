from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from uuid import uuid4

from app import models, schemas
from app.core.security import create_access_token, hash_password, verify_password
from app.db import get_db

router = APIRouter(prefix="/api/auth", tags=["auth"])


def random_avatar_url() -> str:
    return f"https://api.dicebear.com/9.x/initials/svg?seed={uuid4().hex}"


@router.post("/register", response_model=schemas.Token, status_code=status.HTTP_201_CREATED)
def register(payload: schemas.UserCreate, db: Session = Depends(get_db)) -> schemas.Token:
    email = payload.email.lower()
    exists = db.execute(select(models.User).where(models.User.email == email)).scalar_one_or_none()
    if exists:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")
    user_count = db.execute(select(func.count(models.User.id))).scalar_one()
    user = models.User(
        email=email,
        hashed_password=hash_password(payload.password),
        nickname=payload.nickname or email.split("@")[0],
        avatar_url=payload.avatar_url or random_avatar_url(),
        role="super_admin" if user_count == 0 else "operator",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return schemas.Token(access_token=create_access_token(user.id), user=user)


@router.post("/login", response_model=schemas.Token)
def login(payload: schemas.LoginRequest, db: Session = Depends(get_db)) -> schemas.Token:
    user = db.execute(select(models.User).where(models.User.email == payload.email.lower())).scalar_one_or_none()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    return schemas.Token(access_token=create_access_token(user.id), user=user)
