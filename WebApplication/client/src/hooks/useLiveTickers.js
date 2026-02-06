import { useEffect, useMemo, useState } from "react";
import { COINS } from "../constants/coins.js";

const STREAM_URL = "wss://stream.binance.com:9443/stream";

export function useLiveTickers(symbols = COINS.map(c => c.symbol)) {
  const [tickers, setTickers] = useState({});

  const streams = useMemo(
    () => symbols.map(s => `${s.toLowerCase()}@miniTicker`).join("/"),
    [symbols]
  );

  useEffect(() => {
    if (!streams) return;
    const ws = new WebSocket(`${STREAM_URL}?streams=${streams}`);

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        const data = payload.data || payload;
        const symbol = data.s;
        const close = parseFloat(data.c);
        const open = parseFloat(data.o);
        const change = open ? ((close - open) / open) * 100 : 0;
        // q is quote volume (volume in USDT/USD)
        const volume24h = parseFloat(data.q) || 0;

        setTickers((prev) => ({
          ...prev,
          [symbol]: {
            price: close,
            open,
            change,
            volume24h
          }
        }));
      } catch (err) {
        console.error("WS parse error", err);
      }
    };

    ws.onerror = (e) => console.error("Ticker stream error", e);
    return () => ws.close();
  }, [streams]);

  return tickers;
}

