import httpx
import asyncio
from cachetools import TTLCache, cached

cache = TTLCache(maxsize=100, ttl=300)  # Cache for 5 minutes

NEPSE_API_URL = "https://newweb.nepalstock.com/api/nots/nepse-data/today-price"

@cached(cache)
async def get_today_price():
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(NEPSE_API_URL, timeout=10)
            response.raise_for_status()
            return response.json()
        except httpx.RequestError:
            # Fallback or return cached data if available
            return {"error": "Failed to fetch live data, fallback not implemented yet."}
