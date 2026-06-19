from fastapi import APIRouter, Depends, File, Form, UploadFile

from app import models, schemas
from app.dependencies import require_user
from app.storage import store_upload

router = APIRouter(prefix="/api/uploads", tags=["uploads"])


@router.post("", response_model=schemas.UploadResponse)
async def upload_file(
    kind: str = Form(default="asset"),
    file: UploadFile = File(...),
    user: models.User = Depends(require_user),
) -> schemas.UploadResponse:
    stored = await store_upload(file, kind=kind, user_id=user.id)
    return schemas.UploadResponse(url=stored.url)
