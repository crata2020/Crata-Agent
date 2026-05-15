from fastapi import APIRouter

router = APIRouter(prefix="/health", tags=["health"])


@router.get("")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "crata-ai-office-backend"}
