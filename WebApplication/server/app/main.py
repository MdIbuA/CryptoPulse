from fastapi import FastAPI
from fastapi import Depends
from fastapi.middleware.cors import CORSMiddleware
from starlette.staticfiles import StaticFiles
from pathlib import Path

from .config import get_settings
from .routers import auth, profile, forecast, dashboard, news


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title=settings.app_name)
    origins = [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:5175",
    ]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(auth.router)
    app.include_router(profile.router)
    app.include_router(forecast.router)
    app.include_router(dashboard.router)
    app.include_router(news.router)

    uploads_dir = Path(__file__).resolve().parent / "uploads"
    uploads_dir.mkdir(exist_ok=True, parents=True)
    app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")

    # Profile photos folder
    profilephotos_dir = Path(__file__).resolve().parent / "profilephotos"
    profilephotos_dir.mkdir(exist_ok=True, parents=True)
    app.mount("/profilephotos", StaticFiles(directory=profilephotos_dir), name="profilephotos")

    @app.get("/health")
    async def health():
        # Dynamically import get_db to avoid resolving dependency at definition time
        from .db import get_db  # type: ignore
        db_ok = False
        db_error = None
        try:
            db = get_db()
            # Motor client: use admin ping
            await db.client.admin.command("ping")
            db_ok = True
        except Exception as e:
            db_error = str(e)

        # Check TensorFlow availability without importing at top-level
        tf_ok = True
        try:
            import importlib
            importlib.import_module("tensorflow")
        except Exception:
            tf_ok = False

        return {"status": "ok", "db": db_ok, "db_error": db_error, "tf": tf_ok}

    return app


app = create_app()

