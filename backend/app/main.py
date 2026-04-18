"""GelKaravan v2 — B2B wholesale platform API."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import os

from app.database import init_db
from app.routers import auth, catalog, cart, orders, favorites, boris, admin, manager


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(
    title="GelKaravan API v2",
    version="2.0.0",
    docs_url="/api/docs",
    redoc_url=None,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        os.getenv("FRONTEND_URL", "https://new.gelkaravan.ru"),
        "http://localhost:5173",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth.router,     prefix="/api/auth",     tags=["auth"])
app.include_router(catalog.router,  prefix="/api/catalog",  tags=["catalog"])
app.include_router(cart.router,     prefix="/api/cart",     tags=["cart"])
app.include_router(orders.router,   prefix="/api/orders",   tags=["orders"])
app.include_router(favorites.router,prefix="/api/favorites",tags=["favorites"])
app.include_router(boris.router,    prefix="/api/boris",    tags=["boris"])
app.include_router(admin.router,    prefix="/api/admin",    tags=["admin"])
app.include_router(manager.router,  prefix="/api/manager",  tags=["manager"])


@app.get("/api/health")
async def health():
    return {"status": "ok", "version": "2.0.0"}
