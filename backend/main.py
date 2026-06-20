from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import uvicorn
import logging
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import engine, Base, get_db
from app.api.endpoints import auth, datasets, analytics, dashboards, reports

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("backend")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing database tables on startup...")
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables initialized successfully.")
    except Exception as e:
        logger.error("Error during startup database initialization: %s", str(e))
    yield

app = FastAPI(
    title="Data Analytics & Reporting Platform API",
    description="Backend API for uploading, cleaning, and analyzing business datasets.",
    version="1.0.0",
    debug=settings.DEBUG,
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?|https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(datasets.router, prefix="/api/datasets", tags=["Datasets"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["Analytics"])
app.include_router(dashboards.router, prefix="/api/dashboards", tags=["Dashboards"])
app.include_router(reports.router, prefix="/api/reports", tags=["Reports"])

@app.get("/")
def read_root():
    return {
        "message": "Welcome to the Data Analytics & Reporting Platform API!",
        "docs_url": "/docs"
    }

@app.get("/health")
def health_check(db: Session = Depends(get_db)):
    try:
        # Check database connectivity
        db.execute(text("SELECT 1"))
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        logger.error("Health check failed - database disconnected: %s", str(e))
        return JSONResponse(
            status_code=503,
            content={"status": "unhealthy", "database": "disconnected", "detail": str(e)}
        )

if __name__ == "__main__":
    uvicorn.run("main:app", host=settings.HOST, port=settings.PORT, reload=settings.DEBUG)

