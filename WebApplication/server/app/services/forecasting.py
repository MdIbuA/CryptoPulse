from datetime import datetime, timedelta
from pathlib import Path
from typing import List, Tuple, Dict
import logging

import numpy as np
import pandas as pd
import requests

from ..services.model_loader import load_model_and_scalers, clear_model_cache
from ..config import get_settings


TIMESTEPS = 1  # notebooks use timestep=1 (samples, 1, features)
BINANCE_KLINES_URL = "https://api.binance.com/api/v3/klines"

def get_history_window_days(horizon_days: int) -> int:
    """Get appropriate history window based on horizon."""
    if horizon_days <= 2:
        return 2  # hourly models use 2 days of history
    elif horizon_days <= 7:
        return 15
    elif horizon_days <= 15:
        return 30
    else:
        return max(90, horizon_days * 3)  # at least 3x the horizon for longer forecasts


def _fetch_binance_klines(symbol: str, interval: str, total_records: int = 1000) -> pd.DataFrame:
    """Fetch real-time OHLCV data from Binance API with pagination.
    
    Args:
        symbol: Trading pair symbol (e.g., 'BTCUSDT')
        interval: Kline interval ('1h' for hourly, '1d' for daily)
        total_records: Total number of klines to fetch (supports > 1000 via pagination)
    
    Returns:
        DataFrame with columns: time, Open, High, Low, Close, Volume
    """
    try:
        all_data = []
        max_limit = 1000  # Binance API limit per request
        iterations = (total_records // max_limit) + 1
        
        for i in range(iterations):
            current_limit = min(max_limit, total_records - len(all_data))
            if current_limit <= 0:
                break
            
            params = {
                "symbol": symbol.upper(),
                "interval": interval,
                "limit": current_limit
            }
            
            # For subsequent requests, fetch data before the earliest we have
            if all_data:
                params['endTime'] = all_data[0][0] - 1
            
            response = requests.get(BINANCE_KLINES_URL, params=params, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            
            if not data:
                break
            
            all_data = data + all_data
        
        if not all_data:
            return None
        
        # Binance kline format: [open_time, open, high, low, close, volume, close_time, ...]
        df = pd.DataFrame(all_data, columns=[
            'open_time', 'Open', 'High', 'Low', 'Close', 'Volume',
            'close_time', 'quote_volume', 'trades', 'taker_buy_base',
            'taker_buy_quote', 'ignore'
        ])
        
        # Convert types
        df['time'] = pd.to_datetime(df['open_time'], unit='ms')
        df['Open'] = df['Open'].astype(float)
        df['High'] = df['High'].astype(float)
        df['Low'] = df['Low'].astype(float)
        df['Close'] = df['Close'].astype(float)
        df['Volume'] = df['Volume'].astype(float)
        
        # Keep only needed columns
        df = df[['time', 'Open', 'High', 'Low', 'Close', 'Volume']]
        df = df.sort_values('time').reset_index(drop=True)
        
        return df
    except Exception as e:
        logging.warning(f"Failed to fetch Binance data for {symbol}: {e}")
        return None


def _load_price_series_from_csv(coin_symbol: str, horizon_days: int = None) -> pd.DataFrame:
    """Load raw OHLCV series for a coin from Milestone1 folders (fallback method).

    Chooses Hourly_Dataset when horizon_days is provided and <= 2, otherwise Daily_Dataset.
    Returns a DataFrame with columns: time (datetime), Open, High, Low, Close, Volume
    """
    settings = get_settings()
    base = settings.base_dir / "WebApplication" / "Milestone1"

    # choose folder based on horizon
    use_hourly = bool(horizon_days is not None and horizon_days <= 2)
    subdir = "Hourly_Dataset" if use_hourly else "Daily_Dataset"
    filename = f"{coin_symbol.upper()}_{'hourly' if use_hourly else 'daily'}.csv"

    path = base / subdir / filename
    if not path.exists():
        raise FileNotFoundError(f"Dataset not found: {path}")

    # Read CSV and detect date column case-insensitively, then normalize column names
    df = pd.read_csv(path)

    # find the date column regardless of casing
    date_col = next((c for c in df.columns if c.strip().lower() == "date"), None)
    if date_col is None:
        raise ValueError(f"No 'Date' column found in {path}; found columns: {list(df.columns)}")
    df[date_col] = pd.to_datetime(df[date_col])

    # standardize column names (case-insensitive mapping to expected names)
    lower_to_standard = {"date": "time", "open": "Open", "high": "High", "low": "Low", "close": "Close", "volume": "Volume"}
    rename_map = {c: lower_to_standard[c.strip().lower()] for c in df.columns if c.strip().lower() in lower_to_standard}
    df.rename(columns=rename_map, inplace=True)

    df = df.sort_values("time").reset_index(drop=True)

    # Ensure numeric types
    df["Close"] = df["Close"].astype(float)
    if "Volume" in df.columns:
        df["Volume"] = df["Volume"].astype(float)
    else:
        df["Volume"] = 0.0

    return df


def _load_price_series(coin_symbol: str, horizon_days: int = None) -> pd.DataFrame:
    """Load real-time OHLCV data from Binance API, with fallback to CSV.

    Fetches hourly data for horizon_days <= 2, daily data otherwise.
    For daily: fetches 5 years (1825 days) of data
    For hourly: fetches 1000 hours of data
    Returns a DataFrame with columns: time (datetime), Open, High, Low, Close, Volume
    """
    use_hourly = bool(horizon_days is not None and horizon_days <= 2)
    interval = "1h" if use_hourly else "1d"
    
    # Fetch enough data for model training
    # For hourly: 1000 hours = ~42 days of data
    # For daily: 1825 days = 5 years of data
    total_records = 1000 if use_hourly else 1825
    
    # Try to fetch real-time data from Binance
    df = _fetch_binance_klines(coin_symbol, interval, total_records)
    
    if df is not None and len(df) > 0:
        logging.info(f"Loaded {len(df)} {interval} klines for {coin_symbol} from Binance API (latest: {df['time'].max()})")
        return df
    
    # Fallback to CSV if API fails
    logging.warning(f"Falling back to CSV data for {coin_symbol}")
    return _load_price_series_from_csv(coin_symbol, horizon_days)


def _prepare_feature_matrix(df: pd.DataFrame, horizon_days: int):
    """Compute features used by the models. Feature set follows training notebooks.

    - For hourly models (horizon_days <= 2): use MA_12, MA_24, MA_168, Returns, Volatility, Price_Range, Price_Change
    - For daily models (horizon_days > 2): use MA_7, MA_14, MA_30, MA_50, Returns, Volatility, Price_Range, Price_Change, Volume_MA_7, High_Low_Ratio

    Returns: X (n_samples, n_features), df_features (DataFrame with engineered cols), feature_cols (list)
    """
    df = df.copy()
    # Hourly features
    if horizon_days is not None and horizon_days <= 2:
        df["MA_12"] = df["Close"].rolling(12).mean()
        df["MA_24"] = df["Close"].rolling(24).mean()
        df["MA_168"] = df["Close"].rolling(168).mean()
        df["Returns"] = df["Close"].pct_change()
        df["Volatility"] = df["Returns"].rolling(12).std()
        df["Price_Range"] = df["High"] - df["Low"]
        df["Price_Change"] = df["Close"] - df["Open"]

        df = df.dropna().reset_index(drop=True)
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
    else:
        # Daily features
        df["MA_7"] = df["Close"].rolling(7).mean()
        df["MA_14"] = df["Close"].rolling(14).mean()
        df["MA_30"] = df["Close"].rolling(30).mean()
        df["MA_50"] = df["Close"].rolling(50).mean()
        df["Returns"] = df["Close"].pct_change()
        df["Volatility"] = df["Returns"].rolling(7).std()
        df["Price_Range"] = df["High"] - df["Low"]
        df["Price_Change"] = df["Close"] - df["Open"]
        df["Volume_MA_7"] = df["Volume"].rolling(7).mean()
        df["High_Low_Ratio"] = df["High"] / df["Low"]

        df = df.dropna().reset_index(drop=True)
        feature_cols = [
            "Open",
            "High",
            "Low",
            "Close",
            "Volume",
            "MA_7",
            "MA_14",
            "MA_30",
            "MA_50",
            "Returns",
            "Volatility",
            "Price_Range",
            "Price_Change",
            "Volume_MA_7",
            "High_Low_Ratio",
        ]

    X = df[feature_cols].fillna(0).values
    return X, df, feature_cols


def _naive_forecast(latest_price: float, horizon_days: int) -> List[float]:
    # simple day-level naive forecast
    drift = 0.0025 * np.arange(1, horizon_days + 1)
    noise = np.random.default_rng().normal(0, 0.001, size=horizon_days)
    return list((latest_price * (1 + drift + noise)).astype(float))


def generate_forecast(coin_symbol: str, horizon_days: int, time_step: int = 60, epochs: int = 50, force_retrain: bool = False) -> Tuple[pd.DataFrame, pd.DataFrame, float, dict, bool]:
    # Clear model cache if force retrain is requested
    if force_retrain:
        clear_model_cache()
    
    df = _load_price_series(coin_symbol, horizon_days)
    latest_price = float(df.iloc[-1]["Close"])

    # provide a sensible historical window depending on horizon
    history_window_days = get_history_window_days(horizon_days)
    cutoff = df["time"].max() - timedelta(days=history_window_days)
    historical = df[df["time"] >= cutoff]

    using_cached_model = False
    model_info = None

    try:
        # For hourly models we use the existing multivariate approach trained elsewhere
        if horizon_days <= 2:
            model, scaler_x, scaler_y = load_model_and_scalers(coin_symbol, horizon_days)

            # compute features (matching the notebooks) and get full array
            X_full, df_features, feature_cols = _prepare_feature_matrix(df, horizon_days)
            if X_full.shape[0] < 1:
                raise ValueError("Series too short for model input")

            # If scaler not available, fallback to MinMaxScaler fit on available data
            from sklearn.preprocessing import MinMaxScaler

            if scaler_x is None:
                scaler_x = MinMaxScaler()
                X_scaled = scaler_x.fit_transform(X_full)
            else:
                X_scaled = scaler_x.transform(X_full)

            # prepare last sample as (1, timesteps=1, features)
            last_sample = X_scaled[-1].reshape(1, TIMESTEPS, X_scaled.shape[1])

            pred_scaled = model.predict(last_sample)
            pred_scaled = pred_scaled.reshape(1, -1)

            if scaler_y is None:
                from sklearn.preprocessing import MinMaxScaler as _MMS
                scaler_y = _MMS()
                n_out = pred_scaled.shape[1]
                y_dummy = np.tile(X_full[-1, 3], (len(X_full), n_out))
                scaler_y.fit(y_dummy)

            pred_prices = scaler_y.inverse_transform(pred_scaled).flatten()

            # maintain existing hourly branch logic (RMSE adjustments etc.)
            n_out = pred_prices.shape[0]

            try:
                y_df = df.copy()
                for k in range(1, n_out + 1):
                    y_df[f"Close_t+{k}"] = y_df["Close"].shift(-k)
                df_multi = y_df.dropna().reset_index(drop=True)
                if len(df_multi) > 3:
                    feature_mat = df_multi[feature_cols].values
                    y_mat = df_multi[[f"Close_t+{k}" for k in range(1, n_out + 1)]].values

                    split_idx = int(0.8 * len(feature_mat))
                    X_train_eval, X_test_eval = feature_mat[:split_idx], feature_mat[split_idx:]
                    y_train_eval, y_test_eval = y_mat[:split_idx], y_mat[split_idx:]

                    from sklearn.preprocessing import MinMaxScaler
                    if scaler_x is None:
                        eval_scaler_x = MinMaxScaler()
                        X_train_s = eval_scaler_x.fit_transform(X_train_eval)
                        X_test_s = eval_scaler_x.transform(X_test_eval)
                    else:
                        X_train_s = scaler_x.transform(X_train_eval)
                        X_test_s = scaler_x.transform(X_test_eval)

                    X_test_in = X_test_s.reshape((X_test_s.shape[0], TIMESTEPS, X_test_s.shape[1]))
                    y_test_pred_scaled = model.predict(X_test_in)
                    if scaler_y is not None:
                        y_test_pred = scaler_y.inverse_transform(y_test_pred_scaled)
                    else:
                        y_test_pred = y_test_pred_scaled

                    from sklearn.metrics import mean_squared_error
                    rmse_array = []
                    for k in range(y_test_eval.shape[1]):
                        mse = mean_squared_error(y_test_eval[:, k], y_test_pred[:, k])
                        rmse_array.append(np.sqrt(mse))
                    rmse_array = np.array(rmse_array)
                else:
                    rmse_array = np.zeros(n_out)
            except Exception:
                rmse_array = np.zeros(n_out)

            last_sample = X_scaled[-1].reshape(1, TIMESTEPS, X_scaled.shape[1])
            future_48_scaled = model.predict(last_sample)[0]
            future_48 = scaler_y.inverse_transform(future_48_scaled.reshape(1, -1))[0] if scaler_y is not None else future_48_scaled

            start_price = df.iloc[-1]["Close"]
            delta = start_price - float(future_48[0])
            try:
                last_actual_t30 = y_test_eval[-1, 29]
                last_pred_t30 = y_test_pred[-1, 29]
                error = last_pred_t30 - last_actual_t30
            except Exception:
                error = 0

            if error < 0:
                future_48_adjusted = future_48 - rmse_array
                future_48_adjusted = future_48_adjusted + delta
            else:
                future_48_adjusted = future_48 + rmse_array
                future_48_adjusted = future_48_adjusted - delta

            last_time = df["time"].max()
            forecast_index = pd.date_range(start=last_time + pd.Timedelta(hours=1), periods=n_out, freq='H')
            forecast_df = pd.DataFrame({"time": forecast_index, "price": future_48_adjusted})
            idx = min(int(horizon_days * 24) - 1, n_out - 1)
            pred_price = float(future_48_adjusted[idx])

        else:
            # DAILY models: Use Gradient Boosting ML instead of LSTM
            from sklearn.preprocessing import StandardScaler
            from sklearn.ensemble import GradientBoostingRegressor
            from sklearn.multioutput import MultiOutputRegressor
            from ..services.model_loader import load_ml_model_and_scalers, load_ml_model_info, save_ml_model_and_scalers

            # Load any saved ML model/scalers and metadata (always 30-step model)
            model, scaler_x, scaler_y = load_ml_model_and_scalers(coin_symbol, 30)
            loaded_info = load_ml_model_info(coin_symbol, 30)

            def meta_compatible(meta: dict, current_data_len: int) -> bool:
                if not meta:
                    return False
                timestamp = meta.get("timestamp")
                if isinstance(timestamp, str):
                    try:
                        from datetime import datetime as dt
                        timestamp = dt.fromisoformat(timestamp)
                    except:
                        return False
                if isinstance(timestamp, datetime):
                    days_old = (datetime.now() - timestamp).days
                    if days_old > 7:
                        return False
                if meta.get("data_shape"):
                    data_diff = abs(current_data_len - meta.get("data_shape")) / float(meta.get("data_shape"))
                    if data_diff > 0.1:
                        return False
                return True

            compatible = meta_compatible(loaded_info, len(df))

            # Use same features as original _prepare_feature_matrix for daily models
            def engineer_ml_features(data: pd.DataFrame) -> pd.DataFrame:
                """Create features for Gradient Boosting (same as original daily features)."""
                data = data.copy()
                data['MA_7'] = data['Close'].rolling(7).mean()
                data['MA_14'] = data['Close'].rolling(14).mean()
                data['MA_30'] = data['Close'].rolling(30).mean()
                data['MA_50'] = data['Close'].rolling(50).mean()
                data['Returns'] = data['Close'].pct_change()
                data['Volatility'] = data['Returns'].rolling(7).std()
                data['Price_Range'] = data['High'] - data['Low']
                data['Price_Change'] = data['Close'] - data['Open']
                data['Volume_MA_7'] = data['Volume'].rolling(7).mean()
                data['High_Low_Ratio'] = data['High'] / data['Low']
                data = data.dropna().reset_index(drop=True)
                return data

            feature_cols = [
                'Open', 'High', 'Low', 'Close', 'Volume',
                'MA_7', 'MA_14', 'MA_30',
                'Returns', 'Volatility',
                'Price_Range', 'Price_Change',
                'Volume_MA_7', 'High_Low_Ratio'
            ]

            if not force_retrain and model is not None and scaler_y is not None and compatible:
                using_cached_model = True
                model_info = loaded_info
                # Use feature_cols from saved info if available
                if loaded_info and 'feature_cols' in loaded_info:
                    feature_cols = loaded_info['feature_cols']
            else:
                # Engineer features
                df_features = engineer_ml_features(df)
                
                if len(df_features) < 100:
                    raise ValueError("Not enough data to train ML model")
                
                # Create multi-output targets (t+1 to t+30 fixed)
                FORECAST_STEPS = 30
                for k in range(1, FORECAST_STEPS + 1):
                    df_features[f'Close_t+{k}'] = df_features['Close'].shift(-k)
                
                df_multi = df_features.dropna().reset_index(drop=True)
                
                X = df_multi[feature_cols].values
                y = df_multi[[f'Close_t+{k}' for k in range(1, FORECAST_STEPS + 1)]].values
                
                # Split train/test (80/20)
                split = int(0.8 * len(X))
                X_train, X_test = X[:split], X[split:]
                y_train, y_test = y[:split], y[split:]
                
                # Scale features
                scaler_x = StandardScaler()
                scaler_y = StandardScaler()
                
                X_train_scaled = scaler_x.fit_transform(X_train)
                X_test_scaled = scaler_x.transform(X_test)
                y_train_scaled = scaler_y.fit_transform(y_train)
                
                # Build Gradient Boosting model with specified parameters
                base_model = GradientBoostingRegressor(
                    n_estimators=50,
                    max_depth=5,
                    learning_rate=0.05,
                    min_samples_split=5,
                    min_samples_leaf=3,
                    subsample=0.8,
                    random_state=42,
                    verbose=0
                )
                
                model = MultiOutputRegressor(base_model, n_jobs=-1)
                model.fit(X_train_scaled, y_train_scaled)
                
                # Calculate metrics for logging
                from sklearn.metrics import mean_squared_error, r2_score
                y_pred_scaled = model.predict(X_test_scaled)
                y_pred = scaler_y.inverse_transform(y_pred_scaled)
                
                rmse_list = []
                for h in range(FORECAST_STEPS):
                    rmse = np.sqrt(mean_squared_error(y_test[:, h], y_pred[:, h]))
                    rmse_list.append(float(rmse))
                
                r2_testing = float(r2_score(y_test.flatten(), y_pred.flatten()))
                
                info = {
                    'timestamp': datetime.now(),
                    'data_shape': len(df_features),
                    'algorithm': 'GradientBoostingRegressor',
                    'forecast_steps': FORECAST_STEPS,
                    'n_estimators': 50,
                    'max_depth': 5,
                    'learning_rate': 0.05,
                    'r2_testing': r2_testing,
                    'avg_rmse': float(np.mean(rmse_list)),
                    'feature_cols': feature_cols,
                }
                
                # Save with fixed horizon (30) for reuse (no metadata)
                save_ml_model_and_scalers(coin_symbol, 30, model, scaler_x, scaler_y, feature_cols)
                model_info = info
                using_cached_model = False

            # Generate predictions (always 30 steps)
            df_features = engineer_ml_features(df)
            X_latest = df_features[feature_cols].iloc[-1:].values
            X_scaled = scaler_x.transform(X_latest)
            
            predictions_scaled = model.predict(X_scaled)
            all_predictions = scaler_y.inverse_transform(predictions_scaled)[0]
            
            # Apply offset to align with current price
            current_price = df['Close'].iloc[-1]
            first_prediction = all_predictions[0]
            offset = current_price - first_prediction
            all_predictions = all_predictions + offset
            
            # Select predictions up to horizon_days (max 30)
            n_days = min(horizon_days, 30)
            predictions = all_predictions[:n_days]
            
            # Create forecast DataFrame
            future_dates = [df['time'].iloc[-1] + timedelta(days=i + 1) for i in range(n_days)]
            forecast_df = pd.DataFrame({
                'time': future_dates,
                'price': predictions
            })
            
            pred_price = float(predictions[-1])

    except Exception as ex:
        # if anything fails, fall back to naive day-level forecast
        logging.error(f"Forecast failed: {ex}")
        forecast_prices = _naive_forecast(latest_price, horizon_days)
        pred_price = float(forecast_prices[-1])
        start_time = df["time"].max()
        forecast_index = pd.date_range(start=start_time + pd.Timedelta(1, unit="D"), periods=horizon_days, freq="D")
        forecast_df = pd.DataFrame({"time": forecast_index, "price": forecast_prices})

    # also build cumulative returns for UI convenience
    returns = forecast_df["price"].pct_change().fillna(0)
    cumulative = (1 + returns).cumprod() - 1
    cumulative_df = pd.DataFrame({"time": forecast_df["time"], "price": cumulative})

    # normalize historical frame to (time, price) for downstream usage
    historical_df = historical[["time", "Close"]].rename(columns={"Close": "price"}).reset_index(drop=True)

    return historical_df, forecast_df, pred_price, (model_info or {}), using_cached_model


def generate_hourly_forecast(coin_symbol: str, force_retrain: bool = False) -> Tuple[pd.DataFrame, pd.DataFrame, float, dict, bool]:
    """Generate 24-hour forecast using Gradient Boosting with hourly data.
    
    Fetches last 6 months of hourly data from Binance, trains/loads GBR model,
    and produces 24-point hourly forecast.
    
    Returns:
        historical_df: Last 48 hours of historical data (time, price)
        forecast_df: 24-hour forecast (time, price)
        predicted_price: Price at t+24
        model_info: Model metadata
        using_cached_model: Whether cached model was used
    """
    from sklearn.preprocessing import StandardScaler
    from sklearn.ensemble import GradientBoostingRegressor
    from sklearn.multioutput import MultiOutputRegressor
    from ..services.model_loader import load_hourly_ml_model_and_scalers, save_hourly_ml_model_and_scalers

    # Fetch 6 months of hourly data (approx 4380 hours)
    HOURS_6_MONTHS = 4380
    df = _fetch_binance_klines(coin_symbol, "1h", HOURS_6_MONTHS)
    
    if df is None or len(df) < 200:
        raise ValueError(f"Insufficient hourly data for {coin_symbol}")
    
    latest_price = float(df.iloc[-1]["Close"])
    using_cached_model = False
    model_info = {}
    
    # Feature engineering for hourly data
    def engineer_hourly_features(data: pd.DataFrame) -> pd.DataFrame:
        """Create features for hourly Gradient Boosting."""
        data = data.copy()
        data['MA_12'] = data['Close'].rolling(12).mean()
        data['MA_24'] = data['Close'].rolling(24).mean()
        data['Returns'] = data['Close'].pct_change()
        data['Volatility'] = data['Returns'].rolling(12).std()
        data['Price_Range'] = data['High'] - data['Low']
        data['Price_Change'] = data['Close'] - data['Open']
        data['Volume_MA_12'] = data['Volume'].rolling(12).mean()
        data['High_Low_Ratio'] = data['High'] / data['Low']
        data = data.dropna().reset_index(drop=True)
        return data
    
    feature_cols = [
        'Open', 'High', 'Low', 'Close', 'Volume',
        'MA_12', 'MA_24',
        'Returns', 'Volatility',
        'Price_Range', 'Price_Change',
        'Volume_MA_12', 'High_Low_Ratio'
    ]
    
    FORECAST_STEPS = 24  # 24 hours
    
    try:
        # Try to load cached model
        model, scaler_x, scaler_y = load_hourly_ml_model_and_scalers(coin_symbol)
        
        if not force_retrain and model is not None and scaler_x is not None and scaler_y is not None:
            using_cached_model = True
            logging.info(f"Using cached hourly GBR model for {coin_symbol}")
        else:
            # Train new model
            logging.info(f"Training new hourly GBR model for {coin_symbol}")
            
            df_features = engineer_hourly_features(df)
            
            if len(df_features) < 500:
                raise ValueError("Not enough hourly data to train model")
            
            # Create multi-output targets (t+1 to t+24)
            for k in range(1, FORECAST_STEPS + 1):
                df_features[f'Close_t+{k}'] = df_features['Close'].shift(-k)
            
            df_multi = df_features.dropna().reset_index(drop=True)
            
            X = df_multi[feature_cols].values
            y = df_multi[[f'Close_t+{k}' for k in range(1, FORECAST_STEPS + 1)]].values
            
            # Split train/test (80/20)
            split = int(0.8 * len(X))
            X_train, X_test = X[:split], X[split:]
            y_train, y_test = y[:split], y[split:]
            
            # Scale features
            scaler_x = StandardScaler()
            scaler_y = StandardScaler()
            
            X_train_scaled = scaler_x.fit_transform(X_train)
            y_train_scaled = scaler_y.fit_transform(y_train)
            
            # Build Gradient Boosting model
            base_model = GradientBoostingRegressor(
                n_estimators=50,
                max_depth=5,
                learning_rate=0.05,
                min_samples_split=5,
                min_samples_leaf=3,
                subsample=0.8,
                random_state=42,
                verbose=0
            )
            
            model = MultiOutputRegressor(base_model, n_jobs=-1)
            model.fit(X_train_scaled, y_train_scaled)
            
            # Save model and scalers
            save_hourly_ml_model_and_scalers(coin_symbol, model, scaler_x, scaler_y)
            
            model_info = {
                'algorithm': 'GradientBoostingRegressor',
                'forecast_steps': FORECAST_STEPS,
                'data_hours': len(df_features),
            }
            using_cached_model = False
        
        # Generate predictions
        df_features = engineer_hourly_features(df)
        X_latest = df_features[feature_cols].iloc[-1:].values
        X_scaled = scaler_x.transform(X_latest)
        
        predictions_scaled = model.predict(X_scaled)
        predictions = scaler_y.inverse_transform(predictions_scaled)[0]
        
        # Apply offset to align with current price
        current_price = df['Close'].iloc[-1]
        first_prediction = predictions[0]
        offset = current_price - first_prediction
        predictions = predictions + offset
        
        # Create forecast DataFrame
        last_time = df['time'].iloc[-1]
        future_dates = [last_time + timedelta(hours=i + 1) for i in range(FORECAST_STEPS)]
        forecast_df = pd.DataFrame({
            'time': future_dates,
            'price': predictions
        })
        
        pred_price = float(predictions[-1])  # Price at t+24
        
    except Exception as ex:
        # Fallback to naive forecast
        logging.error(f"Hourly forecast failed: {ex}")
        predictions = [latest_price * (1 + 0.001 * i + np.random.normal(0, 0.001)) for i in range(FORECAST_STEPS)]
        pred_price = float(predictions[-1])
        last_time = df['time'].iloc[-1]
        future_dates = [last_time + timedelta(hours=i + 1) for i in range(FORECAST_STEPS)]
        forecast_df = pd.DataFrame({'time': future_dates, 'price': predictions})
    
    # Get last 48 hours of historical data for the graph
    historical_48h = df.tail(48).copy()
    historical_df = historical_48h[['time', 'Close']].rename(columns={'Close': 'price'}).reset_index(drop=True)
    
    return historical_df, forecast_df, pred_price, model_info, using_cached_model

