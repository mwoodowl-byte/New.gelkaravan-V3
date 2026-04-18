"""Boris router — TODO: implement."""
from fastapi import APIRouter

router = APIRouter()


@router.get("")
async def placeholder():
    return {"module": "boris", "status": "not implemented yet"}
