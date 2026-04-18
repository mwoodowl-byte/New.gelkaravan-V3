"""Manager router — TODO: implement."""
from fastapi import APIRouter

router = APIRouter()


@router.get("")
async def placeholder():
    return {"module": "manager", "status": "not implemented yet"}
