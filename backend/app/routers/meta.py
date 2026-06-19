from fastapi import APIRouter

from app import schemas

router = APIRouter(prefix="/api/meta", tags=["meta"])


@router.get("/languages", response_model=list[str])
def list_languages() -> list[str]:
    return list(schemas.LANGUAGE_OPTIONS)
