from binance.client import Client
import pandas as pd
from datetime import datetime
import time

# ---- SETTINGS ----
API_KEY = ""            # optional for public OHLC
API_SECRET = ""         # optional
SYMBOL = "BTCUSDT"
INTERVAL = Client.KLINE_INTERVAL_1HOUR     # change interval here
START_DATE = "2025-11-20"                  # <<< YOUR START DATE
SAVE_AS = "BITCOIN_NEW.csv"

# ------------------
client = Client(API_KEY, API_SECRET)

def get_data(symbol, interval, start_date):
    all_klines = []
    start_ts = int(pd.to_datetime(start_date).timestamp() * 1000)
    
    while True:
        # Get next batch
        klines = client.get_klines(
            symbol=symbol,
            interval=interval,
            startTime=start_ts,
            limit=1000
        )

        if not klines:
            break

        all_klines.extend(klines)

        # Update start timestamp for next batch
        last_close_time = klines[-1][6]
        start_ts = last_close_time + 1

        # Sleep to avoid IP ban
        time.sleep(0.2)

    return all_klines

# ---- DOWNLOAD ----
print("Downloading data...")
klines = get_data(SYMBOL, INTERVAL, START_DATE)
print(f"Downloaded {len(klines)} rows.")

# ---- CONVERT TO DATAFRAME ----
df = pd.DataFrame(klines, columns=[
    "open_time","open","high","low","close","volume",
    "close_time","quote_asset_volume","number_of_trades",
    "taker_buy_base_volume","taker_buy_quote_volume","ignore"
])

# Convert timestamps
df["open_time"] = pd.to_datetime(df["open_time"], unit="ms")
df["close_time"] = pd.to_datetime(df["close_time"], unit="ms")

# ---- SAVE CSV ----
df.to_csv(SAVE_AS, index=False)
print(f"Saved to {SAVE_AS}")
    