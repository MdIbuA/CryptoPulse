from datetime import datetime
from typing import Optional, Dict, Any, List
from bson import ObjectId
from pydantic import BaseModel, EmailStr, Field


class PyObjectId(ObjectId):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v, *args, **kwargs):
        # pydantic v2 may pass additional context arguments, so accept *args/**kwargs for compatibility
        if isinstance(v, ObjectId):
            return v
        if isinstance(v, str):
            return ObjectId(v)
        raise TypeError("ObjectId required")


    @classmethod
    def __get_pydantic_json_schema__(cls, core_schema):
        # Represent ObjectId as a JSON string in generated schema
        return {"type": "string", "title": "ObjectId"}


class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


class GoogleAuthPayload(BaseModel):
    credential: str  # Google ID token from frontend


class UserPublic(BaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    username: str
    email: EmailStr
    created_at: datetime
    profile_photo: Optional[str] = None
    last_login_at: Optional[datetime] = None
    auth_provider: Optional[str] = "local"

    class Config:
        validate_by_name = True
        json_encoders = {ObjectId: str, PyObjectId: str}


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int


class ForecastRequest(BaseModel):
    coin: str
    horizon_days: int
    time_step: Optional[int] = None
    epochs: Optional[int] = None
    force_retrain: Optional[bool] = False


class HourlyForecastRequest(BaseModel):
    """Request model for 24-hour hourly forecast."""
    coin: str
    force_retrain: Optional[bool] = False


class ForecastPoint(BaseModel):
    time: datetime
    price: float


class SentimentView(BaseModel):
    horizon: int
    label: str
    score: float
    indicators: Dict[str, Any]


class ForecastResponse(BaseModel):
    coin: str
    horizon_days: int
    forecasted_price: float
    historical: List[ForecastPoint]
    forecast: List[ForecastPoint]
    cumulative_returns: List[ForecastPoint]
    sentiment: List[SentimentView]
    model_info: Optional[Dict[str, Any]] = None
    using_cached_model: Optional[bool] = False


class ForecastHistoryEntry(BaseModel):
    """Enhanced forecast history entry with comprehensive tracking data."""
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    user_id: PyObjectId
    timestamp: datetime  # When forecast was made
    coin: str
    horizon: str  # e.g., "7d", "15d", "30d", "24h"
    horizon_end_time: datetime  # When horizon ends (for actual price lookup)
    
    # Prices
    current_price: float  # Price when forecast was made
    predicted_price: float  # Predicted price at horizon end
    actual_price: Optional[float] = None  # Actual price at horizon end (filled later)
    
    # High/Low predictions
    predicted_high: float  # Highest price in forecast
    predicted_low: float  # Lowest price in forecast
    actual_high: Optional[float] = None  # Actual highest price during horizon
    actual_low: Optional[float] = None  # Actual lowest price during horizon
    
    # Change percentages
    predicted_change: float  # % change from current to predicted
    predicted_change_direction: str  # "up" or "down"
    actual_change: Optional[float] = None  # % change from current to actual
    actual_change_direction: Optional[str] = None  # "up" or "down"
    
    # Status
    is_verified: bool = False  # Whether actual values have been filled
    model_info: Optional[Dict[str, Any]] = None
    forecast_type: Optional[str] = "daily"  # "daily" or "hourly"

    class Config:
        validate_by_name = True
        json_encoders = {ObjectId: str, PyObjectId: str}

