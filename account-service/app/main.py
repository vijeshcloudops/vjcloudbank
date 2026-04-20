# app/main.py
# Sync version using psycopg2 (Windows compatible)

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
from dotenv import load_dotenv

from app.config.database import connect_db, disconnect_db
from app.routes.account_routes import router as account_router

load_dotenv()


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("\n🚀 Starting VjCloudBank Account Service...")
    connect_db()   # sync call — no await needed
    yield
    print("\n🛑 Shutting down Account Service...")
    disconnect_db()


app = FastAPI(
    title="VjCloudBank Account Service",
    description="Manages bank accounts — create, view, balance, close",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def log_requests(request, call_next):
    import time
    from datetime import datetime
    start = time.time()
    response = await call_next(request)
    duration = round((time.time() - start) * 1000, 2)
    print(f"[{datetime.now().isoformat()}] {request.method} {request.url.path} → {response.status_code} ({duration}ms)")
    return response


app.include_router(account_router)


@app.get("/")
def root():
    return {
        "service": "VjCloudBank Account Service",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", 3002)),
        reload=True
    )
