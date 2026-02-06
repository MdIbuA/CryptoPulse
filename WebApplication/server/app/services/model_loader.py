import pickle
from pathlib import Path
from functools import lru_cache
from typing import Tuple, Any, Optional, Dict
import os
from datetime import datetime

# TensorFlow is imported lazily inside functions to avoid import-time failures on systems without a working
# TF installation (e.g., missing DLLs on Windows). If TensorFlow is unavailable, functions will raise
# ImportError at call time or return (None, None, None) where appropriate.

from ..config import get_settings


def clear_model_cache():
    """Clear the LRU cache for load_model_and_scalers to force fresh model loading."""
    try:
        load_model_and_scalers.cache_clear()
    except Exception:
        pass


COIN_NAME_MAP = {
    "BTCUSDT": "bitcoin",
    "ETHUSDT": "ethereum",
    "BNBUSDT": "binance",
    "SOLUSDT": "solana",
    "XRPUSDT": "ripple",
    "DOGEUSDT": "doge",
    "ADAUSDT": "ada",
    "BCHUSDT": "bitcoin_cash",
}


def _paths_for(coin_symbol: str, horizon_days: int):
    settings = get_settings()
    coin_key = COIN_NAME_MAP.get(coin_symbol.upper())
    if not coin_key:
        raise ValueError("Unsupported coin")

    if horizon_days <= 2:
        model_dir = settings.models_hourly_dir
        scaler_dir = settings.scalers_hourly_dir
        suffix = "48h"
    else:
        model_dir = settings.models_daily_dir
        scaler_dir = settings.scalers_daily_dir
        suffix = "30d"

    model_path = model_dir / f"{coin_key}_lstm_{suffix}_model.h5"
    model_best = model_dir / f"{coin_key}_lstm_{suffix}_best.h5"
    scaler_x_path = scaler_dir / f"{coin_key}_lstm_{suffix}_scaler_X.pkl"
    scaler_y_path = scaler_dir / f"{coin_key}_lstm_{suffix}_scaler_y.pkl"
    meta_path = settings.metadata_dir / f"{coin_key}_lstm_{suffix}_info.pkl"
    return {
        "coin_key": coin_key,
        "model_path": model_path,
        "model_best": model_best,
        "scaler_x": scaler_x_path,
        "scaler_y": scaler_y_path,
        "meta": meta_path,
    }


@lru_cache()
def load_model_and_scalers(coin_symbol: str, horizon_days: int) -> Tuple[Optional[Any], Optional[Any], Optional[Any]]:
    """Attempt to load keras model and corresponding scalers. Return (model, scaler_x, scaler_y) or (None, None, None) if not present."""
    paths = _paths_for(coin_symbol, horizon_days)

    # Prefer best model if present
    model_path = paths["model_best"] if paths["model_best"].exists() else paths["model_path"]

    if not model_path.exists():
        return None, None, None

    # import TensorFlow lazily and handle ImportError clearly
    try:
        import tensorflow as tf
    except Exception as e:
        # If TF fails to import, return None so the caller can fallback to naive behavior
        # and avoid crashing the entire app at startup.
        return None, None, None

    try:
        model = tf.keras.models.load_model(model_path)
    except Exception:
        return None, None, None

    scaler_x = None
    scaler_y = None
    try:
        if paths["scaler_x"].exists():
            with open(paths["scaler_x"], "rb") as f:
                scaler_x = pickle.load(f)
    except Exception:
        scaler_x = None

    try:
        if paths["scaler_y"].exists():
            with open(paths["scaler_y"], "rb") as f:
                scaler_y = pickle.load(f)
    except Exception:
        scaler_y = None

    return model, scaler_x, scaler_y


def load_model_info(coin_symbol: str, horizon_days: int) -> Optional[Dict]:
    paths = _paths_for(coin_symbol, horizon_days)
    meta = paths["meta"]
    if not meta.exists():
        return None
    try:
        with open(meta, "rb") as f:
            info = pickle.load(f)
        return info
    except Exception:
        return None


def save_model_and_scalers(coin_symbol: str, horizon_days: int, model: Any, scaler_x: Any, scaler_y: Any, info: Dict) -> bool:
    paths = _paths_for(coin_symbol, horizon_days)
    model_dir = paths["model_path"].parent
    scaler_dir = paths["scaler_x"].parent
    os.makedirs(model_dir, exist_ok=True)
    os.makedirs(scaler_dir, exist_ok=True)

    try:
        # Save model using tensorflow if available; otherwise raise helpful error
        try:
            import tensorflow as tf
        except Exception:
            raise RuntimeError("TensorFlow is not available; cannot save Keras model")

        # save model
        model.save(paths["model_path"], overwrite=True)
        # also save a backup of best model with timestamp
        try:
            model.save(paths["model_best"], overwrite=True)
        except Exception:
            pass

        # save scalers
        with open(paths["scaler_x"], "wb") as f:
            pickle.dump(scaler_x, f)
        with open(paths["scaler_y"], "wb") as f:
            pickle.dump(scaler_y, f)

        # save metadata
        info_to_save = info.copy()
        info_to_save.setdefault("timestamp", datetime.now())
        with open(paths["meta"], "wb") as f:
            pickle.dump(info_to_save, f)

        # bust cache if necessary
        try:
            load_model_and_scalers.cache_clear()
        except Exception:
            pass

        return True
    except Exception:
        return False


# ==================== ML (Gradient Boosting) Model Functions ====================

def _ml_paths_for(coin_symbol: str, horizon_days: int):
    """Get paths for ML (Gradient Boosting) models."""
    settings = get_settings()
    coin_key = COIN_NAME_MAP.get(coin_symbol.upper())
    if not coin_key:
        raise ValueError("Unsupported coin")

    suffix = f"{horizon_days}d"
    
    model_dir = settings.models_daily_ml_dir
    scaler_dir = settings.scalers_daily_ml_dir
    meta_dir = settings.metadata_ml_dir

    model_path = model_dir / f"{coin_key}_gbr_{suffix}_model.pkl"
    scaler_x_path = scaler_dir / f"{coin_key}_gbr_{suffix}_scaler_X.pkl"
    scaler_y_path = scaler_dir / f"{coin_key}_gbr_{suffix}_scaler_y.pkl"
    meta_path = meta_dir / f"{coin_key}_gbr_{suffix}_metadata.json"
    meta_pkl_path = meta_dir / f"{coin_key}_gbr_{suffix}_info.pkl"
    
    return {
        "coin_key": coin_key,
        "model_path": model_path,
        "scaler_x": scaler_x_path,
        "scaler_y": scaler_y_path,
        "meta_json": meta_path,
        "meta_pkl": meta_pkl_path,
    }


def load_ml_model_and_scalers(coin_symbol: str, horizon_days: int) -> Tuple[Optional[Any], Optional[Any], Optional[Any]]:
    """Load Gradient Boosting model and scalers. Return (model, scaler_x, scaler_y) or (None, None, None)."""
    try:
        paths = _ml_paths_for(coin_symbol, horizon_days)
    except ValueError:
        return None, None, None

    if not paths["model_path"].exists():
        return None, None, None

    try:
        with open(paths["model_path"], "rb") as f:
            model = pickle.load(f)
    except Exception:
        return None, None, None

    scaler_x = None
    scaler_y = None
    
    try:
        if paths["scaler_x"].exists():
            with open(paths["scaler_x"], "rb") as f:
                scaler_x = pickle.load(f)
    except Exception:
        scaler_x = None

    try:
        if paths["scaler_y"].exists():
            with open(paths["scaler_y"], "rb") as f:
                scaler_y = pickle.load(f)
    except Exception:
        scaler_y = None

    return model, scaler_x, scaler_y


def load_ml_model_info(coin_symbol: str, horizon_days: int) -> Optional[Dict]:
    """Load ML model metadata/info."""
    try:
        paths = _ml_paths_for(coin_symbol, horizon_days)
    except ValueError:
        return None
    
    # Try pickle first
    if paths["meta_pkl"].exists():
        try:
            with open(paths["meta_pkl"], "rb") as f:
                return pickle.load(f)
        except Exception:
            pass
    
    # Try JSON
    if paths["meta_json"].exists():
        try:
            import json
            with open(paths["meta_json"], "r") as f:
                return json.load(f)
        except Exception:
            pass
    
    return None


def save_ml_model_and_scalers(coin_symbol: str, horizon_days: int, model: Any, scaler_x: Any, scaler_y: Any, feature_cols: list = None) -> bool:
    """Save Gradient Boosting model and scalers (no metadata)."""
    try:
        paths = _ml_paths_for(coin_symbol, horizon_days)
    except ValueError:
        return False
    
    model_dir = paths["model_path"].parent
    scaler_dir = paths["scaler_x"].parent
    
    os.makedirs(model_dir, exist_ok=True)
    os.makedirs(scaler_dir, exist_ok=True)

    try:
        # Save model
        with open(paths["model_path"], "wb") as f:
            pickle.dump(model, f)

        # Save scalers
        with open(paths["scaler_x"], "wb") as f:
            pickle.dump(scaler_x, f)
        with open(paths["scaler_y"], "wb") as f:
            pickle.dump(scaler_y, f)

        return True
    except Exception as e:
        import logging
        logging.error(f"Failed to save ML model: {e}")
        return False


# ==================== Hourly ML (Gradient Boosting) Model Functions ====================

def _hourly_ml_paths_for(coin_symbol: str):
    """Get paths for Hourly ML (Gradient Boosting) models - 24h forecasting."""
    settings = get_settings()
    coin_key = COIN_NAME_MAP.get(coin_symbol.upper())
    if not coin_key:
        raise ValueError("Unsupported coin")

    model_dir = settings.models_hourly_ml_dir
    scaler_dir = settings.scalers_hourly_ml_dir

    model_path = model_dir / f"{coin_key}_gbr_24h_model.pkl"
    scaler_x_path = scaler_dir / f"{coin_key}_gbr_24h_scaler_X.pkl"
    scaler_y_path = scaler_dir / f"{coin_key}_gbr_24h_scaler_y.pkl"
    
    return {
        "coin_key": coin_key,
        "model_path": model_path,
        "scaler_x": scaler_x_path,
        "scaler_y": scaler_y_path,
    }


def load_hourly_ml_model_and_scalers(coin_symbol: str) -> Tuple[Optional[Any], Optional[Any], Optional[Any]]:
    """Load Hourly Gradient Boosting model and scalers. Return (model, scaler_x, scaler_y) or (None, None, None)."""
    try:
        paths = _hourly_ml_paths_for(coin_symbol)
    except ValueError:
        return None, None, None

    if not paths["model_path"].exists():
        return None, None, None

    try:
        with open(paths["model_path"], "rb") as f:
            model = pickle.load(f)
    except Exception:
        return None, None, None

    scaler_x = None
    scaler_y = None
    
    try:
        if paths["scaler_x"].exists():
            with open(paths["scaler_x"], "rb") as f:
                scaler_x = pickle.load(f)
    except Exception:
        scaler_x = None

    try:
        if paths["scaler_y"].exists():
            with open(paths["scaler_y"], "rb") as f:
                scaler_y = pickle.load(f)
    except Exception:
        scaler_y = None

    return model, scaler_x, scaler_y


def save_hourly_ml_model_and_scalers(coin_symbol: str, model: Any, scaler_x: Any, scaler_y: Any) -> bool:
    """Save Hourly Gradient Boosting model and scalers."""
    try:
        paths = _hourly_ml_paths_for(coin_symbol)
    except ValueError:
        return False
    
    model_dir = paths["model_path"].parent
    scaler_dir = paths["scaler_x"].parent
    
    os.makedirs(model_dir, exist_ok=True)
    os.makedirs(scaler_dir, exist_ok=True)

    try:
        # Save model
        with open(paths["model_path"], "wb") as f:
            pickle.dump(model, f)

        # Save scalers
        with open(paths["scaler_x"], "wb") as f:
            pickle.dump(scaler_x, f)
        with open(paths["scaler_y"], "wb") as f:
            pickle.dump(scaler_y, f)

        return True
    except Exception as e:
        import logging
        logging.error(f"Failed to save hourly ML model: {e}")
        return False

