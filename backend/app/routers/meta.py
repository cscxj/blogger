from fastapi import APIRouter

from app import schemas

router = APIRouter(prefix="/api/meta", tags=["meta"])


@router.get("/default-site-languages", response_model=list[schemas.SiteLanguage])
def default_site_languages() -> list[schemas.SiteLanguage]:
    return schemas.default_site_languages()


@router.get("/languages", response_model=list[schemas.SiteLanguage])
def list_languages() -> list[schemas.SiteLanguage]:
    return schemas.default_site_languages()
