from datetime import datetime, timezone, timedelta
from typing import Optional, Tuple
from fastapi import APIRouter, Depends, HTTPException, status, Query
from bson import ObjectId

from ..deps import get_current_user
from ..models import ForecastRequest, ForecastResponse, HourlyForecastRequest
from ..services.forecasting import generate_forecast, generate_hourly_forecast
from ..services.sentiment import build_sentiment_views
from ..db import get_db

AVAILABLE_COINS = ["BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT", "XRPUSDT", "DOGEUSDT", "ADAUSDT", "BCHUSDT"]
VALID_HORIZONS = [7, 15, 30]  # Removed 1 and 2 - use /hourly endpoint instead

router = APIRouter(prefix="/forecast", tags=["forecast"])


def calculate_change(current: float, target: float) -> Tuple[float, str]:
    """Calculate percentage change and direction."""
    if current == 0:
        return 0.0, "up"
    change = ((target - current) / current) * 100
    direction = "up" if change >= 0 else "down"
    return round(change, 2), direction


@router.get("/coins")
async def list_coins():
    return {"coins": AVAILABLE_COINS}


@router.post("", response_model=ForecastResponse)
async def forecast(payload: ForecastRequest, current=Depends(get_current_user), db=Depends(get_db)):
    if not (7 <= payload.horizon_days <= 30):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid horizon (must be 7-30 days). Use /hourly for 24-hour forecasts.")
    if payload.coin not in AVAILABLE_COINS:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported coin")

    # propagate optional training parameters
    time_step = payload.time_step or 60
    epochs = payload.epochs or 50
    force_retrain = bool(payload.force_retrain)

    historical_df, forecast_df, predicted_price, model_info, using_cached = generate_forecast(
        payload.coin, payload.horizon_days, time_step=time_step, epochs=epochs, force_retrain=force_retrain
    )

    sentiment = build_sentiment_views(historical_df["price"], forecast_df["price"], payload.horizon_days)

    # Extract data for enhanced history
    current_price = float(historical_df.iloc[-1]["price"])
    predicted_high = float(forecast_df["price"].max())
    predicted_low = float(forecast_df["price"].min())
    predicted_change, predicted_direction = calculate_change(current_price, predicted_price)
    
    now = datetime.now(timezone.utc)
    horizon_end = now + timedelta(days=payload.horizon_days)

    # Enhanced history entry
    entry = {
        "user_id": current["_id"],
        "timestamp": now,
        "coin": payload.coin,
        "horizon": f"{payload.horizon_days}d",
        "horizon_end_time": horizon_end,
        "current_price": current_price,
        "predicted_price": predicted_price,
        "actual_price": None,
        "predicted_high": predicted_high,
        "predicted_low": predicted_low,
        "actual_high": None,
        "actual_low": None,
        "predicted_change": predicted_change,
        "predicted_change_direction": predicted_direction,
        "actual_change": None,
        "actual_change_direction": None,
        "is_verified": False,
        "model_info": model_info,
        "using_cached": using_cached,
        "forecast_type": "daily",
    }
    await db.history.insert_one(entry)

    return ForecastResponse(
        coin=payload.coin,
        horizon_days=payload.horizon_days,
        forecasted_price=predicted_price,
        historical=[{"time": row.time.to_pydatetime(), "price": float(row.price)} for row in historical_df.itertuples()],
        forecast=[{"time": row.time.to_pydatetime(), "price": float(row.price)} for row in forecast_df.itertuples()],
        cumulative_returns=[{"time": row.time.to_pydatetime(), "price": float(row.price)} for row in forecast_df.assign(price=forecast_df["price"].pct_change().fillna(0).add(1).cumprod().sub(1)).itertuples()],
        sentiment=sentiment,
        model_info=model_info,
        using_cached_model=using_cached,
    )


@router.post("/hourly", response_model=ForecastResponse)
async def hourly_forecast(payload: HourlyForecastRequest, current=Depends(get_current_user), db=Depends(get_db)):
    """Generate 24-hour forecast using hourly data and Gradient Boosting model."""
    if payload.coin not in AVAILABLE_COINS:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported coin")

    force_retrain = bool(payload.force_retrain)

    try:
        historical_df, forecast_df, predicted_price, model_info, using_cached = generate_hourly_forecast(
            payload.coin, force_retrain=force_retrain
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    # Build sentiment for hourly data (use 1 as horizon indicator for hourly)
    sentiment = build_sentiment_views(historical_df["price"], forecast_df["price"], 1)

    # Extract data for enhanced history
    current_price = float(historical_df.iloc[-1]["price"])
    predicted_high = float(forecast_df["price"].max())
    predicted_low = float(forecast_df["price"].min())
    predicted_change, predicted_direction = calculate_change(current_price, predicted_price)
    
    now = datetime.now(timezone.utc)
    horizon_end = now + timedelta(hours=24)

    # Enhanced history entry
    entry = {
        "user_id": current["_id"],
        "timestamp": now,
        "coin": payload.coin,
        "horizon": "24h",
        "horizon_end_time": horizon_end,
        "current_price": current_price,
        "predicted_price": predicted_price,
        "actual_price": None,
        "predicted_high": predicted_high,
        "predicted_low": predicted_low,
        "actual_high": None,
        "actual_low": None,
        "predicted_change": predicted_change,
        "predicted_change_direction": predicted_direction,
        "actual_change": None,
        "actual_change_direction": None,
        "is_verified": False,
        "model_info": model_info,
        "using_cached": using_cached,
        "forecast_type": "hourly",
    }
    await db.history.insert_one(entry)

    return ForecastResponse(
        coin=payload.coin,
        horizon_days=1,  # Indicates hourly 24h forecast
        forecasted_price=predicted_price,
        historical=[{"time": row.time.to_pydatetime(), "price": float(row.price)} for row in historical_df.itertuples()],
        forecast=[{"time": row.time.to_pydatetime(), "price": float(row.price)} for row in forecast_df.itertuples()],
        cumulative_returns=[{"time": row.time.to_pydatetime(), "price": float(row.price)} for row in forecast_df.assign(price=forecast_df["price"].pct_change().fillna(0).add(1).cumprod().sub(1)).itertuples()],
        sentiment=sentiment,
        model_info=model_info,
        using_cached_model=using_cached,
    )


@router.get("/history")
async def history(
    current=Depends(get_current_user),
    db=Depends(get_db),
    coin: Optional[str] = Query(None, description="Filter by coin symbol"),
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    verified_only: Optional[bool] = Query(False, description="Only show verified entries"),
):
    """Get forecast history with optional filters."""
    # Build query
    query = {"user_id": current["_id"]}
    
    if coin:
        query["coin"] = coin
    
    if start_date:
        try:
            start_dt = datetime.strptime(start_date, "%Y-%m-%d").replace(tzinfo=timezone.utc)
            query["timestamp"] = query.get("timestamp", {})
            query["timestamp"]["$gte"] = start_dt
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid start_date format. Use YYYY-MM-DD")
    
    if end_date:
        try:
            end_dt = datetime.strptime(end_date, "%Y-%m-%d").replace(tzinfo=timezone.utc, hour=23, minute=59, second=59)
            if "timestamp" not in query:
                query["timestamp"] = {}
            query["timestamp"]["$lte"] = end_dt
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid end_date format. Use YYYY-MM-DD")
    
    if verified_only:
        query["is_verified"] = True

    entries = []
    async for doc in db.history.find(query).sort("timestamp", -1).limit(100):
        doc["_id"] = str(doc["_id"])
        doc["user_id"] = str(doc["user_id"])
        entries.append(doc)
    
    return {"items": entries, "total": len(entries)}


@router.get("/history/stats")
async def history_stats(current=Depends(get_current_user), db=Depends(get_db)):
    """Get statistics about forecast history."""
    user_id = current["_id"]
    
    # Get counts
    total = await db.history.count_documents({"user_id": user_id})
    verified = await db.history.count_documents({"user_id": user_id, "is_verified": True})
    pending = total - verified
    
    # Get unique coins
    coins = await db.history.distinct("coin", {"user_id": user_id})
    
    return {
        "total_forecasts": total,
        "verified": verified,
        "pending_verification": pending,
        "coins_forecasted": coins,
    }


@router.post("/history/verify")
async def verify_history_entries(current=Depends(get_current_user), db=Depends(get_db)):
    """
    Verify past forecast entries by fetching actual prices.
    This updates entries where the horizon has passed.
    """
    import httpx
    
    now = datetime.now(timezone.utc)
    user_id = current["_id"]
    
    # Find unverified entries where horizon has passed
    query = {
        "user_id": user_id,
        "is_verified": False,
        "horizon_end_time": {"$lte": now}
    }
    
    updated_count = 0
    errors = []
    
    async for doc in db.history.find(query):
        try:
            coin = doc["coin"]
            current_price = doc["current_price"]
            horizon_end = doc["horizon_end_time"]
            forecast_start = doc["timestamp"]
            
            # Calculate time range for fetching actual data
            # For daily forecasts, we need daily data; for hourly, we need hourly data
            forecast_type = doc.get("forecast_type", "daily")
            
            if forecast_type == "hourly":
                interval = "1h"
                limit = 24
            else:
                # Calculate days between start and end
                days = (horizon_end - forecast_start).days
                interval = "1d"
                limit = days + 1
            
            # Fetch actual price data from Binance
            async with httpx.AsyncClient() as client:
                start_ms = int(forecast_start.timestamp() * 1000)
                end_ms = int(horizon_end.timestamp() * 1000)
                
                resp = await client.get(
                    "https://api.binance.com/api/v3/klines",
                    params={
                        "symbol": coin,
                        "interval": interval,
                        "startTime": start_ms,
                        "endTime": end_ms,
                        "limit": limit
                    },
                    timeout=10.0
                )
                
                if resp.status_code == 200:
                    klines = resp.json()
                    if klines:
                        # Extract actual data
                        # kline format: [open_time, open, high, low, close, volume, ...]
                        closes = [float(k[4]) for k in klines]
                        highs = [float(k[2]) for k in klines]
                        lows = [float(k[3]) for k in klines]
                        
                        actual_price = closes[-1]  # Last close price
                        actual_high = max(highs)
                        actual_low = min(lows)
                        actual_change, actual_direction = calculate_change(current_price, actual_price)
                        
                        # Update the document
                        await db.history.update_one(
                            {"_id": doc["_id"]},
                            {"$set": {
                                "actual_price": actual_price,
                                "actual_high": actual_high,
                                "actual_low": actual_low,
                                "actual_change": actual_change,
                                "actual_change_direction": actual_direction,
                                "is_verified": True,
                            }}
                        )
                        updated_count += 1
                    else:
                        errors.append(f"No data returned for {coin}")
                else:
                    errors.append(f"Failed to fetch data for {coin}: {resp.status_code}")
                    
        except Exception as e:
            errors.append(f"Error processing {doc.get('coin', 'unknown')}: {str(e)}")
    
    return {
        "updated": updated_count,
        "errors": errors if errors else None,
        "message": f"Verified {updated_count} forecast entries"
    }


@router.delete("/history")
async def clear_history(current=Depends(get_current_user), db=Depends(get_db)):
    await db.history.delete_many({"user_id": current["_id"]})
    return {"detail": "History cleared"}


@router.delete("/history/{entry_id}")
async def delete_history_entry(entry_id: str, current=Depends(get_current_user), db=Depends(get_db)):
    """Delete a specific history entry."""
    try:
        result = await db.history.delete_one({
            "_id": ObjectId(entry_id),
            "user_id": current["_id"]
        })
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Entry not found")
        return {"detail": "Entry deleted"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
