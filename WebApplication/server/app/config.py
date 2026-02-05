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

    base_dir: Path = Path(__file__).resolve().parents[3]

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
        if self.models_hourly_dir is None:
            self.models_hourly_dir = self.base_dir / "WebApplication" / "Models_Hourly"
        if self.models_daily_dir is None:
            self.models_daily_dir = self.base_dir / "WebApplication" / "Models_Daily"
        if self.scalers_hourly_dir is None:
            self.scalers_hourly_dir = self.base_dir / "WebApplication" / "Scalers_Hourly"
        if self.scalers_daily_dir is None:
            self.scalers_daily_dir = self.base_dir / "WebApplication" / "Scalers_Daily"
        if self.metadata_dir is None:
            # Metadata files produced by training notebooks
            self.metadata_dir = self.base_dir / "WebApplication" / "Metadata"
        # ML (Gradient Boosting) directories - Daily
        if self.models_daily_ml_dir is None:
            self.models_daily_ml_dir = self.base_dir / "WebApplication" / "Models_Daily_ML"
        if self.scalers_daily_ml_dir is None:
            self.scalers_daily_ml_dir = self.base_dir / "WebApplication" / "Scalers_Daily_ML"
        if self.metadata_ml_dir is None:
            self.metadata_ml_dir = self.base_dir / "WebApplication" / "Metadata_ML"
        # ML (Gradient Boosting) directories - Hourly
        if self.models_hourly_ml_dir is None:
            self.models_hourly_ml_dir = self.base_dir / "WebApplication" / "Models_Hourly"
        if self.scalers_hourly_ml_dir is None:
            self.scalers_hourly_ml_dir = self.base_dir / "WebApplication" / "Scalers_Hourly"

@lru_cache()
def get_settings() -> Settings:
    return Settings()
