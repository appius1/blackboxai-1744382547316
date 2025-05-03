from fastapi import APIRouter
from app.nepse_client import get_today_price

router = APIRouter()

@router.get("/today-price")
async def today_price():
    data = await get_today_price()
    return data
