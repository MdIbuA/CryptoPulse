import axios from "axios";
import { slugToSymbol } from "../constants/coins";

const COINGECKO_BASE = "https://api.coingecko.com/api/v3";
const BINANCE_BASE = "https://api.binance.com";

// Range mapping with desired provider and params
export const RANGES = [
  { key: "1y", label: "1 Year", provider: "coingecko", days: 365 },
  { key: "6m", label: "6 Months", provider: "coingecko", days: 180 },
  { key: "3m", label: "3 Months", provider: "coingecko", days: 90 },
  { key: "1m", label: "1 Month", provider: "binance", interval: "1h", points: 720 },
  { key: "15d", label: "15 Days", provider: "binance", interval: "30m", points: 720 },
  { key: "7d", label: "7 Days", provider: "binance", interval: "30m", points: 336 },
  { key: "2d", label: "2 Days", provider: "binance", interval: "5m", points: 576 },
  { key: "1d", label: "1 Day", provider: "binance", interval: "5m", points: 288 }
];

function parseCoinGeckoOHLC(data) {
  // data: [[timestamp, open, high, low, close], ...]
  return data.map((row) => ({
    time: row[0],
    open: Number(row[1]),
    high: Number(row[2]),
    low: Number(row[3]),
    close: Number(row[4])
  }));
}

function parseBinanceKlines(klines) {
  // kline: [openTime, open, high, low, close, ... closeTime, ...]
  return klines.map((k) => ({
    time: k[0],
    open: Number(k[1]),
    high: Number(k[2]),
    low: Number(k[3]),
    close: Number(k[4])
  }));
}

export async function getHistoricalOHLC(slug, rangeKey) {
  const range = RANGES.find((r) => r.key === rangeKey);
  if (!range) throw new Error("Unknown range");

  // prefer CoinGecko for daily/long windows when requested
  try {
    if (range.provider === "coingecko") {
      // use ohlc endpoint
      const res = await axios.get(`${COINGECKO_BASE}/coins/${slug}/ohlc`, {
        params: { vs_currency: "usd", days: range.days }
      });
      // CoinGecko returns array of [timestamp, open, high, low, close]
      return parseCoinGeckoOHLC(res.data);
    }

    if (range.provider === "binance") {
      const symbol = slugToSymbol[slug];
      if (!symbol) throw new Error("Binance symbol not found for coin");
      // Binance max limit 1000
      const res = await axios.get(`${BINANCE_BASE}/api/v3/klines`, {
        params: { symbol, interval: range.interval, limit: Math.min(range.points || 500, 1000) }
      });
      return parseBinanceKlines(res.data);
    }
  } catch (err) {
    // fallback: if coingecko ohlc fails, try market_chart/destructure to OHLC
    if (range.provider === "coingecko") {
      const res = await axios.get(`${COINGECKO_BASE}/coins/${slug}/market_chart`, {
        params: { vs_currency: "usd", days: range.days }
      });
      // res.data.prices: [[ts, price], ...] - convert to line-like OHLC using rolling window
      const prices = res.data.prices || [];
      // create synthetic OHLC by grouping per day (coarse but functional)
      const grouped = {};
      prices.forEach(([ts, p]) => {
        const d = new Date(ts).toISOString().slice(0, 10);
        grouped[d] = grouped[d] || [];
        grouped[d].push({ ts, p });
      });
      const result = Object.values(grouped).map((arr) => {
        const open = arr[0].p;
        const close = arr[arr.length - 1].p;
        const high = Math.max(...arr.map((x) => x.p));
        const low = Math.min(...arr.map((x) => x.p));
        return { time: arr[0].ts, open, high, low, close };
      });
      return result;
    }

    throw err;
  }
}
