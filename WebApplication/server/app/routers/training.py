from fastapi import APIRouter, HTTPException
import pandas as pd
from pathlib import Path
from ..config import get_settings
from ..services.forecasting import _load_price_series
import json

import numpy as np
from sklearn.feature_selection import mutual_info_regression
import joblib
import tensorflow as tf
from ..services.model_loader import COIN_NAME_MAP

router = APIRouter(prefix="/coin/<coin>/training", tags=["training"])


def _compute_mi_for_coin(settings, coin: str):
    """Compute mutual information scores and normalized feature importance for hourly features.
    Returns (mi_scores_list, feature_importance, feature_cols)
    """
    try:
        hourly_csv = settings.base_dir / "Milestone1" / "Hourly_Dataset" / f"{coin}_hourly.csv"
        if not hourly_csv.exists():
            return [], [], []

        df = pd.read_csv(hourly_csv, parse_dates=["Date"])
        df = df.sort_values("Date")
        df = df[["Date", "Open", "High", "Low", "Close", "Volume"]]
        for col in ["Open", "High", "Low", "Close", "Volume"]:
            df[col] = df[col].astype(float)

        df["MA_12"] = df["Close"].rolling(12).mean()
        df["MA_24"] = df["Close"].rolling(24).mean()
        df["MA_168"] = df["Close"].rolling(168).mean()
        df["Returns"] = df["Close"].pct_change()
        df["Volatility"] = df["Returns"].rolling(12).std()
        df["Price_Range"] = df["High"] - df["Low"]
        df["Price_Change"] = df["Close"] - df["Open"]
        df.dropna(inplace=True)

        # targets t+1..t+48
        for k in range(1, 49):
            df[f"Close_t+{k}"] = df["Close"].shift(-k)
        df_multi = df.dropna().reset_index(drop=True)

        feature_cols = [
            "Open",
            "High",
            "Low",
            "Close",
            "Volume",
            "MA_12",
            "MA_24",
            "MA_168",
            "Returns",
            "Volatility",
            "Price_Range",
            "Price_Change",
        ]

        X = df_multi[feature_cols]
        y = df_multi[[f"Close_t+{k}" for k in range(1, 49)]]

        split = int(0.8 * len(X))
        X_train, y_train = X.iloc[:split], y.iloc[:split]

        # Try to use precomputed scaler if available for stable MI scores
        coin_key = COIN_NAME_MAP.get(coin)
        X_train_arr = None
        try:
            if coin_key:
                scaler_x_path = settings.scalers_hourly_dir / f"{coin_key}_lstm_scaler_X.pkl"
                if scaler_x_path.exists():
                    scaler_x = joblib.load(scaler_x_path)
                    X_train_arr = scaler_x.transform(X_train.fillna(0))
        except Exception:
            X_train_arr = None

        if X_train_arr is None:
            # fallback: scale using StandardScaler
            from sklearn.preprocessing import StandardScaler

            scaler = StandardScaler()
            X_train_arr = scaler.fit_transform(X_train.fillna(0).values)

        mi_scores = mutual_info_regression(X_train_arr, y_train.iloc[:, 0], random_state=42)
        mi_pairs = sorted(zip(feature_cols, mi_scores), key=lambda x: x[1], reverse=True)
        mi_scores_list = [{"feature": f, "score": float(s)} for f, s in mi_pairs]
        total = sum(s for _, s in mi_pairs) or 1.0
        feature_importance = [{"feature": f, "importance": float(s / total)} for f, s in mi_pairs]
        return mi_scores_list, feature_importance, feature_cols
    except Exception:
        return [], [], []

def _metrics_for_series(series: pd.Series):
    returns = series.pct_change().dropna()
    rmse = float((returns ** 2).mean() ** 0.5)
    mae = float(returns.abs().mean())
    r2 = float(max(0.0, 1 - returns.var()))
    return {"rmse": rmse, "mae": mae, "r2": r2}


def _aggregate_metrics_from_arrays(y_true: np.ndarray, y_pred: np.ndarray):
    # y_true / y_pred: (n_samples, horizons)
    from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

    n_horizons = int(y_true.shape[1])
    rmse_list = []
    mae_list = []
    r2_list = []
    for k in range(n_horizons):
        y_t = y_true[:, k]
        y_p = y_pred[:, k]
        mae = float(mean_absolute_error(y_t, y_p))
        mse = float(mean_squared_error(y_t, y_p))
        rmse = float(np.sqrt(mse))
        # r2 can be nan if variance is zero; clamp to 0.0
        try:
            r2 = float(r2_score(y_t, y_p))
        except Exception:
            r2 = 0.0
        mae_list.append(mae)
        rmse_list.append(rmse)
        r2_list.append(r2)

    return {
        "rmse": float(np.mean(rmse_list)),
        "mae": float(np.mean(mae_list)),
        "r2": float(np.mean(r2_list)),
        "per_horizon": {"rmse": [float(x) for x in rmse_list], "mae": [float(x) for x in mae_list], "r2": [float(x) for x in r2_list]},
    }

@router.get("/metadata")
async def metadata():
    settings = get_settings()
    coins = ["BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT", "XRPUSDT", "ADAUSDT", "DOGEUSDT", "DOTUSDT", "MATICUSDT", "LTCUSDT"]
    payload = []

    for coin in coins:
        # Prefer metadata files when available to avoid recomputing heavy metrics
        try:
            md_dir = settings.metadata_dir
            # Try 48h first, then 24h pattern
            hourly_meta = md_dir / f"{coin}_lstm_48h_training_metadata.json"
            if not hourly_meta.exists():
                hourly_meta = md_dir / f"{coin}_lstm_24h_training_metadata.json"
            daily_meta = md_dir / f"{coin}_lstm_30d_training_metadata.json"
        except Exception:
            hourly_meta = None
            daily_meta = None

        # If hourly metadata exists, use it to populate the dashboard entry
        if hourly_meta and hourly_meta.exists():
            try:
                with open(hourly_meta, "r", encoding="utf-8") as f:
                    md = json.load(f)

                metrics_md = md.get("metrics", {})
                train_period = md.get("training_period", {})
                test_period = md.get("testing_period", {})

                # Per-horizon arrays
                per_rmse = metrics_md.get("rmse") or []
                per_mae = metrics_md.get("mae") or []
                per_r2 = metrics_md.get("r2_by_horizon") or []

                # Train: use first horizon value if available, else avg
                train_rmse = per_rmse[0] if per_rmse else metrics_md.get("avg_rmse")
                train_mae = per_mae[0] if per_mae else metrics_md.get("avg_mae")
                train_r2 = metrics_md.get("r2_training")

                # Test: use average values
                test_rmse = metrics_md.get("avg_rmse")
                test_mae = metrics_md.get("avg_mae")
                test_r2 = metrics_md.get("r2_testing") or metrics_md.get("avg_r2")

                metrics = {
                    "train": {
                        "rmse": train_rmse,
                        "mae": train_mae,
                        "r2": train_r2,
                    },
                    "test": {
                        "rmse": test_rmse,
                        "mae": test_mae,
                        "r2": test_r2,
                    },
                }

                # Add per-horizon data if available
                if len(per_rmse) or len(per_mae) or len(per_r2):
                    metrics["test"]["per_horizon"] = {
                        "rmse": per_rmse,
                        "mae": per_mae,
                        "r2": per_r2,
                    }
                    metrics["train"]["per_horizon"] = {
                        "rmse": per_rmse,
                        "mae": per_mae,
                        "r2": per_r2,
                    }

                # Compute MI/feature importance from hourly dataset (prefer scaler when available)
                try:
                    mi_scores_list, feature_importance, feature_list = _compute_mi_for_coin(settings, coin)
                except Exception:
                    mi_scores_list, feature_importance, feature_list = [], [], []

                architecture = {"layers": []}
                lstm_units = md.get("model_config", {}).get("lstm_units")
                if lstm_units:
                    for u in lstm_units:
                        architecture["layers"].append({"type": "LSTM", "units": int(u)})

                # include full model_config and callbacks if present
                architecture["model_config"] = md.get("model_config", {})
                architecture["callbacks"] = md.get("callbacks", {})

                payload.append(
                    {
                        "coin": coin,
                        "train_range": f"{train_period.get('start_date')} - {train_period.get('end_date')}",
                        "test_range": f"{test_period.get('start_date')} - {test_period.get('end_date')}",
                        "mi_scores": mi_scores_list,
                        "feature_importance": feature_importance,
                        "feature_list": feature_list,
                        "metrics": metrics,
                        "architecture": architecture,
                    }
                )
                continue
            except Exception:
                # If reading metadata fails for any reason, fall back to computation below
                pass
        try:
            # Attempt to build hourly features (matching notebooks) if hourly dataset exists
            hourly_csv = settings.base_dir / "Milestone1" / "Hourly_Dataset" / f"{coin}_hourly.csv"
            if hourly_csv.exists():
                df = pd.read_csv(hourly_csv, parse_dates=["Date"])
                df = df.sort_values("Date")
                df = df[["Date", "Open", "High", "Low", "Close", "Volume"]]
                for col in ["Open", "High", "Low", "Close", "Volume"]:
                    df[col] = df[col].astype(float)
                # features
                df["MA_12"] = df["Close"].rolling(12).mean()
                df["MA_24"] = df["Close"].rolling(24).mean()
                df["MA_168"] = df["Close"].rolling(168).mean()
                df["Returns"] = df["Close"].pct_change()
                df["Volatility"] = df["Returns"].rolling(12).std()
                df["Price_Range"] = df["High"] - df["Low"]
                df["Price_Change"] = df["Close"] - df["Open"]
                df.dropna(inplace=True)

                # targets t+1..t+48
                for k in range(1, 49):
                    df[f"Close_t+{k}"] = df["Close"].shift(-k)
                df_multi = df.dropna().reset_index(drop=True)

                feature_cols = [
                    "Open",
                    "High",
                    "Low",
                    "Close",
                    "Volume",
                    "MA_12",
                    "MA_24",
                    "MA_168",
                    "Returns",
                    "Volatility",
                    "Price_Range",
                    "Price_Change",
                ]

                X = df_multi[feature_cols]
                y = df_multi[[f"Close_t+{k}" for k in range(1, 49)]]

                split = int(0.8 * len(X))
                X_train, X_test = X.iloc[:split], X.iloc[split:]
                y_train, y_test = y.iloc[:split], y.iloc[split:]

                # Mutual information (using first horizon as representative)
                try:
                    mi_scores_list, feature_importance, feature_cols = _compute_mi_for_coin(settings, coin)
                except Exception:
                    mi_scores_list = []
                    feature_importance = []

                # Load scalers and model if available to compute train/test metrics
                coin_key = COIN_NAME_MAP.get(coin)
                model_info = {"layers": []}
                metrics = {"train": None, "test": None}
                try:
                    if coin_key:
                        scaler_x_path = settings.scalers_hourly_dir / f"{coin_key}_lstm_scaler_X.pkl"
                        scaler_y_path = settings.scalers_hourly_dir / f"{coin_key}_lstm_scaler_y.pkl"
                        model_path = settings.models_hourly_dir / f"{coin_key}_lstm_48h_best.h5"
                        if not model_path.exists():
                            model_path = settings.models_hourly_dir / f"{coin_key}_lstm_48h_model.h5"

                        if scaler_x_path.exists() and scaler_y_path.exists() and model_path.exists():
                            scaler_x = joblib.load(scaler_x_path)
                            scaler_y = joblib.load(scaler_y_path)
                            model = tf.keras.models.load_model(model_path)

                            X_train_scaled = scaler_x.transform(X_train)
                            X_test_scaled = scaler_x.transform(X_test)

                            # reshape as in notebooks: (samples, 1, features)
                            X_train_in = X_train_scaled.reshape((X_train_scaled.shape[0], 1, X_train_scaled.shape[1]))
                            X_test_in = X_test_scaled.reshape((X_test_scaled.shape[0], 1, X_test_scaled.shape[1]))

                            y_train_pred_scaled = model.predict(X_train_in)
                            y_test_pred_scaled = model.predict(X_test_in)

                            y_train_pred = scaler_y.inverse_transform(y_train_pred_scaled)
                            y_test_pred = scaler_y.inverse_transform(y_test_pred_scaled)

                            metrics["train"] = _aggregate_metrics_from_arrays(y_train.values, y_train_pred)
                            metrics["test"] = _aggregate_metrics_from_arrays(y_test.values, y_test_pred)

                            # simple architecture summary
                            for l in model.layers:
                                info = {"type": l.__class__.__name__}
                                if hasattr(l, "units"):
                                    info["units"] = int(getattr(l, "units"))
                                if hasattr(l, "rate"):
                                    info["rate"] = float(getattr(l, "rate"))
                                model_info["layers"].append(info)
                except Exception:
                    # If anything fails, fall back to simpler metrics
                    metrics["train"] = None
                    metrics["test"] = None

                payload.append(
                    {
                        "coin": coin,
                        "train_range": f"{X_train.index.min()} - {X_train.index.max()}" if len(X_train) else "",
                        "test_range": f"{X_test.index.min()} - {X_test.index.max()}" if len(X_test) else "",
                        "mi_scores": mi_scores_list,
                        "feature_importance": feature_importance,
                        "feature_list": feature_cols,
                        "metrics": metrics,
                        "architecture": model_info,
                    }
                )
                continue

            # Fallback: use the simple price series metadata
            df_simple = _load_price_series(coin)
            metrics_simple = _metrics_for_series(df_simple["price"])
            payload.append(
                {
                    "coin": coin,
                    "train_range": f"{df_simple['time'].min().date()} - {df_simple['time'].max().date()}",
                    "test_range": f"{df_simple['time'].max().date()} - {df_simple['time'].max().date()}",
                    "mi_scores": [],
                    "feature_importance": [],
                    "metrics": {"train": metrics_simple, "test": metrics_simple},
                    "architecture": {"layers": []},
                }
            )
        except Exception:
            # skip coin on error
            continue

    return {"items": payload}


@router.get("/metadata/{coin}")
async def coin_metadata(coin: str):
    """Return training/testing metadata JSON for a specific coin (hourly and daily if available)."""
    coin = coin.upper()
    settings = get_settings()
    md_dir = settings.metadata_dir
    result = {}

    # Try 48h first, then 24h pattern
    hourly_meta = md_dir / f"{coin}_lstm_48h_training_metadata.json"
    if not hourly_meta.exists():
        hourly_meta = md_dir / f"{coin}_lstm_24h_training_metadata.json"
    daily_meta = md_dir / f"{coin}_lstm_30d_training_metadata.json"

    found = False
    if hourly_meta.exists():
        try:
            with open(hourly_meta, "r", encoding="utf-8") as f:
                result["hourly"] = json.load(f)
            found = True
            # Ensure the hourly metadata includes MI/feature importance (compute if missing)
            try:
                if "mi_scores" not in result["hourly"] or "feature_importance" not in result["hourly"]:
                    mi_scores_list, feature_importance, feature_list = _compute_mi_for_coin(settings, coin)
                    if mi_scores_list:
                        result["hourly"]["mi_scores"] = mi_scores_list
                        result["hourly"]["feature_importance"] = feature_importance
                        result["hourly"]["feature_list"] = feature_list
            except Exception:
                pass
        except Exception:
            raise HTTPException(status_code=500, detail="Failed to read hourly metadata")

    if daily_meta.exists():
        try:
            with open(daily_meta, "r", encoding="utf-8") as f:
                result["daily"] = json.load(f)
            found = True
        except Exception:
            raise HTTPException(status_code=500, detail="Failed to read daily metadata")

    if not found:
        raise HTTPException(status_code=404, detail="Metadata not found for coin")

    return result

