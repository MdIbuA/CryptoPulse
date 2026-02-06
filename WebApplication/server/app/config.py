from functools import lru_cache
from pathlib import Path
from typing import Optional
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8"
    )

    app_name: str = "Crypto Forecast API"
    mongodb_uri: str = Field("mongodb://localhost:27017", env="MONGODB_URI")
    mongodb_db: str = Field("crypto_forecast", env="MONGODB_DB")
    jwt_secret: str = Field("dev-secret-change", env="JWT_SECRET")
    jwt_algorithm: str = "HS256"
    jwt_exp_hours: int = 12
    cors_origins: str = Field("*", env="CORS_ORIGINS")
    
    # Google OAuth settings
    google_client_id: str = Field("", env="GOOGLE_CLIENT_ID")
    google_client_secret: str = Field("", env="GOOGLE_CLIENT_SECRET")

    # Robust base_dir calculation
    # In deployment (Railway/Docker), code is usually at /app
    # Locally, it's deep in the file system
    # We try to find the 'WebApplication' directory
    
    @property
    def base_dir(self) -> Path:
        # Start from current file: .../WebApplication/server/app/config.py
        current_file = Path(__file__).resolve()
        
        # Try to find 'WebApplication' in the path parents
        for parent in current_file.parents:
            if parent.name == "WebApplication":
                # Found WebApplication directory, return its parent (CryptoPulse root)
                return parent.parent
        
        # Fallback for Docker/Railway deployment where paths might be flattened or different
        # If we are in /app/app/config.py, parents[1] is /app
        # We assume /app is the root for server, so models might be mounted or available relatively
        # For now, let's play safe and allow relative paths if possible or default to cwd
        return Path.cwd()

    models_hourly_dir: Optional[Path] = None
    models_daily_dir: Optional[Path] = None
    scalers_hourly_dir: Optional[Path] = None
    scalers_daily_dir: Optional[Path] = None
    metadata_dir: Optional[Path] = None
    
    # ML (Gradient Boosting) model directories - Daily
    models_daily_ml_dir: Optional[Path] = None
    scalers_daily_ml_dir: Optional[Path] = None
    metadata_ml_dir: Optional[Path] = None
    
    # ML (Gradient Boosting) model directories - Hourly
    models_hourly_ml_dir: Optional[Path] = None
    scalers_hourly_ml_dir: Optional[Path] = None

    # When True, the app will allow a development-mode fallback when MongoDB is unavailable
    allow_db_offline_dev: bool = Field(False, env="ALLOW_DB_OFFLINE_DEV")

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        
        # Helper to safely construct paths (handling deployment differences)
        base = self.base_dir
        
        # On Railway/Render, if we set root directory to WebApplication/server,
        # then 'WebAppliation' folder itself might NOT be in the built image unless we included it.
        # But if we are deployed from repo, we have the full repo content usually unless filtered.
        # Let's try to construct paths relative to the project root.
        
        web_app_path = base / "WebApplication"
        if not web_app_path.exists():
             # Fallback: maybe we are INSIDE WebApplication (e.g. if root provided to build context)
             # Try to find Models directories relative to current working directory
             web_app_path = base
        
        if self.models_hourly_dir is None:
            self.models_hourly_dir = web_app_path / "Models_Hourly"
        if self.models_daily_dir is None:
            self.models_daily_dir = web_app_path / "Models_Daily"
        if self.scalers_hourly_dir is None:
            self.scalers_hourly_dir = web_app_path / "Scalers_Hourly"
        if self.scalers_daily_dir is None:
            self.scalers_daily_dir = web_app_path / "Scalers_Daily"
        if self.metadata_dir is None:
            self.metadata_dir = web_app_path / "Metadata"
            
        # ML (Gradient Boosting) directories - Daily
        if self.models_daily_ml_dir is None:
            self.models_daily_ml_dir = web_app_path / "Models_Daily_ML"
        if self.scalers_daily_ml_dir is None:
            self.scalers_daily_ml_dir = web_app_path / "Scalers_Daily_ML"
        if self.metadata_ml_dir is None:
            self.metadata_ml_dir = web_app_path / "Metadata_ML"
            
        # ML (Gradient Boosting) directories - Hourly
        if self.models_hourly_ml_dir is None:
            self.models_hourly_ml_dir = web_app_path / "Models_Hourly"
        if self.scalers_hourly_ml_dir is None:
            self.scalers_hourly_ml_dir = web_app_path / "Scalers_Hourly"

@lru_cache()
def get_settings() -> Settings:
    return Settings()
