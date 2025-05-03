from fastapi import FastAPI
from app.api import router

app = FastAPI(title="NEPSE Simulator Backend")

app.include_router(router)

@app.get("/")
async def root():
    return {"message": "NEPSE Simulator Backend is running"}
