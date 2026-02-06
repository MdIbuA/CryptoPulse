from typing import List, Dict
import numpy as np
import pandas as pd


def _rsi(series: pd.Series, period: int = 14) -> float:
    delta = series.diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
    rs = gain / loss.replace({0: np.nan})
    rsi = 100 - (100 / (1 + rs))
    return float(rsi.iloc[-1])


def _ema(series: pd.Series, span: int) -> float:
    return float(series.ewm(span=span, adjust=False).mean().iloc[-1])


def _macd(series: pd.Series) -> Dict[str, float]:
    ema12 = series.ewm(span=12, adjust=False).mean()
    ema26 = series.ewm(span=26, adjust=False).mean()
    macd_line = ema12 - ema26
    signal = macd_line.ewm(span=9, adjust=False).mean()
    return {"macd": float(macd_line.iloc[-1]), "signal": float(signal.iloc[-1])}


def _volatility(series: pd.Series, window: int = 10) -> float:
    return float(series.pct_change().rolling(window).std().iloc[-1])


def classify_sentiment(latest_actual: pd.Series, forecast: pd.Series, horizon: int) -> Dict:
    combined = pd.concat([latest_actual, forecast]).reset_index(drop=True)
    rsi_val = _rsi(combined)
    macd_vals = _macd(combined)
    ema_short = _ema(combined, 9)
    ema_long = _ema(combined, 21)
    vol = _volatility(combined)
    momentum = float(combined.diff().iloc[-1])

    label = "Neutral"
    score = 0.0

    if macd_vals["macd"] > macd_vals["signal"] and ema_short > ema_long and rsi_val > 55:
        label = "Bullish"
        score = 0.7 + min((rsi_val - 55) / 100, 0.3)
    elif macd_vals["macd"] < macd_vals["signal"] and ema_short < ema_long and rsi_val < 45:
        label = "Bearish"
        score = -0.7 - min((45 - rsi_val) / 100, 0.3)

    return {
        "horizon": horizon,
        "label": label,
        "score": score,
        "indicators": {
            "rsi": rsi_val,
            "macd": macd_vals["macd"],
            "macd_signal": macd_vals["signal"],
            "ema_short": ema_short,
            "ema_long": ema_long,
            "volatility": vol,
            "momentum": momentum,
        },
    }


def build_sentiment_views(historical: pd.Series, forecast: pd.Series, horizon: int) -> List[Dict]:
    return [classify_sentiment(historical, forecast, horizon)]

