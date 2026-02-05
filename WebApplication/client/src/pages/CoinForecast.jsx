import { useEffect, useMemo, useState, useRef } from "react";
import { useParams, useNavigate, useLocation, Link } from "react-router-dom";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Area, ReferenceDot, ReferenceLine, Legend } from "recharts";
import { api } from "../services/api";
import { slugToSymbol, symbolToCoin } from "../constants/coins";
import { useLiveTickers } from "../hooks/useLiveTickers";
import { useFxRate, CURRENCIES } from "../hooks/useFxRate";

const HORIZONS = [7, 15, 30];  // Daily horizons only - hourly uses "Next 24 Hours" button

// Indicator calculation functions
function calculateSMA(prices, period) {
  if (prices.length < period) return prices.map(() => null);
  const result = [];
  for (let i = 0; i < period - 1; i++) result.push(null);
  for (let i = period - 1; i < prices.length; i++) {
    const sum = prices.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
    result.push(sum / period);
  }
  return result;
}

function calculateEMA(prices, period) {
  if (prices.length < period) return prices.map(() => null);
  const result = [];
  const multiplier = 2 / (period + 1);
  result[period - 1] = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < prices.length; i++) {
    result[i] = (prices[i] - result[i - 1]) * multiplier + result[i - 1];
  }
  for (let i = 0; i < period - 1; i++) result[i] = null;
  return result;
}

function calculateBB(prices, period = 20, stdDev = 2) {
  const sma = calculateSMA(prices, period);
  const result = { upper: [], middle: [], lower: [] };

  for (let i = period - 1; i < prices.length; i++) {
    const slice = prices.slice(i - period + 1, i + 1);
    const mean = sma[i];
    const variance = slice.reduce((acc, price) => acc + Math.pow(price - mean, 2), 0) / period;
    const std = Math.sqrt(variance);
    result.upper.push(mean + stdDev * std);
    result.middle.push(mean);
    result.lower.push(mean - stdDev * std);
  }

  // Pad with nulls
  for (let i = 0; i < period - 1; i++) {
    result.upper.unshift(null);
    result.middle.unshift(null);
    result.lower.unshift(null);
  }

  return result;
}

function calculateRSI(prices, period = 14) {
  if (prices.length < period + 1) return prices.map(() => null);
  const result = [];
  const gains = [];
  const losses = [];

  // Calculate initial average gain and loss
  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 1; i <= period; i++) {
    const change = prices[i] - prices[i - 1];
    if (change > 0) {
      avgGain += change;
    } else {
      avgLoss += Math.abs(change);
    }
  }
  avgGain /= period;
  avgLoss /= period;

  // First RSI value
  for (let i = 0; i < period; i++) result.push(null);

  let prevAvgGain = avgGain;
  let prevAvgLoss = avgLoss;
  for (let i = period; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? Math.abs(change) : 0;

    avgGain = (prevAvgGain * (period - 1) + gain) / period;
    avgLoss = (prevAvgLoss * (period - 1) + loss) / period;

    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    const rsi = 100 - (100 / (1 + rs));
    result.push(rsi);

    prevAvgGain = avgGain;
    prevAvgLoss = avgLoss;
  }

  return result;
}

export default function CoinForecast() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const coinSymbol = slugToSymbol[slug];
  const coin = symbolToCoin[coinSymbol] || { name: slug, ticker: slug };
  const [horizon, setHorizon] = useState(7);  // Default to 7 days
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [timeStep, setTimeStep] = useState(60);
  const [epochs, setEpochs] = useState(50);
  const [forceRetrain, setForceRetrain] = useState(false);
  const [dbAvailable, setDbAvailable] = useState(true); // track backend DB availability
  const [currency, setCurrency] = useState("USD"); // currency selection
  const [isHourlyMode, setIsHourlyMode] = useState(false);  // Track if "Next 24 Hours" is selected

  // UI states: slider for arbitrary days, predictions table, live price, and indicators
  const [sliderDays, setSliderDays] = useState(horizon);
  const [showPredictions, setShowPredictions] = useState(false);
  const [indicatorOptions, setIndicatorOptions] = useState({ sma: false, ema: true, bb: false, rsi: false });
  const [indicatorParams, setIndicatorParams] = useState({ smaWindow: 20, emaShort: 12, emaLong: 26, bbWindow: 20, rsiPeriod: 14 });
  const debounceRef = useRef(null);

  // Live price hook
  const tickers = useLiveTickers(coinSymbol ? [coinSymbol] : []);
  const liveTicker = tickers?.[coinSymbol] || null;

  // Fx rate for currency conversion
  const fxRate = useFxRate(currency);

  // Get currency symbol
  const currencySymbol = useMemo(() => {
    const curr = CURRENCIES.find(c => c.code === currency);
    return curr?.symbol || '$';
  }, [currency]);

  // Format currency helper
  const formatCurrency = (value, curr = "USD") => {
    if (value === undefined || value === null || Number.isNaN(value)) return "--";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: curr,
      maximumFractionDigits: 2
    }).format(value);
  };

  // Format value with currency symbol for charts
  const formatChartValue = (value) => {
    if (value === undefined || value === null || Number.isNaN(value)) return "--";
    return `${currencySymbol}${Number(value).toFixed(0)}`;
  };

  const formatChartValueDetailed = (value) => {
    if (value === undefined || value === null || Number.isNaN(value)) return "--";
    return `${currencySymbol}${Number(value).toFixed(2)}`;
  };

  const fetchForecast = async () => {
    setLoading(true);
    setError(null);
    try {
      let response;
      if (isHourlyMode) {
        // Call hourly endpoint for 24-hour forecast
        const payload = { coin: coinSymbol, force_retrain: forceRetrain };
        response = await api.post("/forecast/hourly", payload);
      } else {
        // Call regular daily forecast endpoint
        const payload = { coin: coinSymbol, horizon_days: horizon, time_step: timeStep, epochs, force_retrain: forceRetrain };
        response = await api.post("/forecast", payload);
      }
      setData(response.data);
    } catch (err) {
      setError(err?.response?.data?.detail || "Forecast failed");
    } finally {
      setLoading(false);
    }
  };

  // Check server health on mount (but do NOT auto-fetch forecast)
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data: health } = await api.get("/health");
        if (!mounted) return;
        setDbAvailable(Boolean(health.db));
        // Do NOT auto-fetch - user must click Generate Forecast button
      } catch (err) {
        // if health check fails, mark DB unavailable
        setDbAvailable(false);
      }
    })();
    return () => (mounted = false);
  }, [coinSymbol]);

  // Sync sliderDays with horizon when horizon changes
  useEffect(() => {
    setSliderDays(horizon);
  }, [horizon]);

  const TIME_OFFSET_MS = 5 * 60 * 60 * 1000; // 5 hours
  // const historical = useMemo(() => (data?.historical || []).map((d) => ({ ...d, time: new Date(d.time).getTime() })), [data]);
  // const forecast = useMemo(() => (data?.forecast || []).map((d) => ({ ...d, time: new Date(d.time).getTime() })), [data]);
  // const cumulative = useMemo(() => (data?.cumulative_returns || []).map((d) => ({ ...d, time: new Date(d.time).getTime() })), [data]);
  const sentiment = data?.sentiment || [];
  const historical = useMemo(
    () =>
      (data?.historical || []).map((d) => ({
        ...d,
        time: new Date(d.time).getTime() + TIME_OFFSET_MS,
      })),
    [data]
  );

  const forecast = useMemo(
    () =>
      (data?.forecast || []).map((d) => ({
        ...d,
        time: new Date(d.time).getTime() + TIME_OFFSET_MS,
      })),
    [data]
  );

  const cumulative = useMemo(
    () =>
      (data?.cumulative_returns || []).map((d) => ({
        ...d,
        time: new Date(d.time).getTime() + TIME_OFFSET_MS,
      })),
    [data]
  );

  // whether using hourly forecasting mode (Next 24 Hours)
  const isHourly = isHourlyMode;

  const stats = useMemo(() => {
    if (!data) return null;
    const histPrices = historical.map((p) => p.price);
    const fcPrices = forecast.map((p) => p.price);
    const combined = [...histPrices, ...fcPrices];
    if (!combined.length) return null;
    return {
      histHigh: Math.max(...histPrices),
      histLow: Math.min(...histPrices),
      forecastHigh: Math.max(...fcPrices),
      forecastLow: Math.min(...fcPrices),
    };
  }, [data, historical, forecast]);

  const tickFormatter = (t) => (isHourly ? new Date(t).toLocaleString() : new Date(t).toLocaleDateString());

  // build combined arrays and anchored forecast line so the dashed forecast starts at the last historical point
  const lastHistoricalTime = historical.length ? historical[historical.length - 1].time : null;
  const lastHistoricalPrice = historical.length ? historical[historical.length - 1].price : null;

  // choose forecast display length based on mode: hourly => all 24 points; daily => sliderDays
  const forecastDisplay = useMemo(() => {
    if (!forecast.length) return [];
    // If we have a last historical time, ensure forecast starts strictly after it to avoid overlap
    const filtered = lastHistoricalTime ? forecast.filter((f) => f.time > lastHistoricalTime) : forecast;
    if (isHourly) {
      // For hourly mode, show all 24 points
      return filtered;
    }
    // For daily, show up to sliderDays points
    return filtered.slice(0, sliderDays);
  }, [forecast, sliderDays, isHourly, lastHistoricalTime]);

  // Anchored forecast display: includes the last historical point as anchor so line connects properly
  const forecastDisplayAnchored = useMemo(() => {
    if (!forecastDisplay.length) return [];
    if (lastHistoricalTime && lastHistoricalPrice) {
      return [{ time: lastHistoricalTime, price: lastHistoricalPrice }, ...forecastDisplay];
    }
    return forecastDisplay;
  }, [forecastDisplay, lastHistoricalTime, lastHistoricalPrice]);

  const forecastStartTime = forecastDisplay.length ? forecastDisplay[0].time : null;

  // ticks every 12 points for hourly charts to mirror notebook (12-hour labels)
  const xTicks = useMemo(() => {
    if (!isHourly) return undefined;
    const combined = [...historical, ...forecastDisplay];
    if (!combined.length) return undefined;
    const step = 12;
    const ticks = [];
    for (let i = 0; i < combined.length; i += step) ticks.push(combined[i].time);
    // ensure last tick present
    if (!ticks.includes(combined[combined.length - 1].time)) ticks.push(combined[combined.length - 1].time);
    return ticks;
  }, [historical, forecastDisplay, isHourly]);

  // Split cumulative into historical and forecast anchored arrays (for separate styling and fills)
  const { cumulativeHistorical, cumulativeForecastAnchored } = useMemo(() => {
    if (!cumulative.length || !lastHistoricalTime) return { cumulativeHistorical: [], cumulativeForecastAnchored: [] };
    // find first cumulative entry strictly after the last historical time
    const splitIdx = cumulative.findIndex((c) => c.time > lastHistoricalTime);
    if (splitIdx === -1) return { cumulativeHistorical: cumulative, cumulativeForecastAnchored: [] };
    const cumHist = cumulative.slice(0, splitIdx);
    const anchorPrice = cumulative[splitIdx - 1] ? cumulative[splitIdx - 1].price : cumulative[0].price;
    const cumFc = [{ time: lastHistoricalTime, price: anchorPrice }, ...cumulative.slice(splitIdx)];
    return { cumulativeHistorical: cumHist, cumulativeForecastAnchored: cumFc };
  }, [cumulative, lastHistoricalTime]);

  // Calculate indicators for combined historical and forecast data
  const combinedPrices = useMemo(() => {
    const histPrices = historical.map((d) => d.price);
    const fcPrices = forecastDisplay.map((d) => d.price);
    return [...histPrices, ...fcPrices];
  }, [historical, forecastDisplay]);

  // Calculate indicators with currency conversion
  const indicators = useMemo(() => {
    if (combinedPrices.length === 0) return {};

    const histPrices = historical.map((d) => d.price);
    const fcPrices = forecastDisplay.map((d) => d.price);
    const allPrices = [...histPrices, ...fcPrices];

    const histLength = histPrices.length;
    const fcLength = fcPrices.length;

    const sma = calculateSMA(allPrices, indicatorParams.smaWindow);
    const emaShort = calculateEMA(allPrices, indicatorParams.emaShort);
    const emaLong = calculateEMA(allPrices, indicatorParams.emaLong);
    const bb = calculateBB(allPrices, indicatorParams.bbWindow, 2);

    // Calculate RSI only on historical data to avoid forecast contamination
    const rsiHistorical = calculateRSI(histPrices, indicatorParams.rsiPeriod);
    // Calculate RSI on full data for forecast continuation
    const rsiFull = calculateRSI(allPrices, indicatorParams.rsiPeriod);

    // Combine data with indicators AND separate price keys for historical vs forecast
    const combinedData = [...historical, ...forecastDisplay].map((d, idx) => {
      const isHistorical = idx < histLength;
      const isTransitionPoint = idx === histLength - 1; // last historical point
      const isFirstForecast = idx === histLength; // first forecast point

      // Apply currency conversion
      const convertedPrice = d.price * fxRate;

      return {
        ...d,
        price: convertedPrice,
        // Historical price: show for historical points and transition point
        historicalPrice: isHistorical ? convertedPrice : null,
        // Forecast price: show for forecast points and transition point (to connect the lines)
        forecastPrice: isHistorical ? (isTransitionPoint ? convertedPrice : null) : convertedPrice,
        sma: sma[idx] != null ? sma[idx] * fxRate : null,
        emaShort: emaShort[idx] != null ? emaShort[idx] * fxRate : null,
        emaLong: emaLong[idx] != null ? emaLong[idx] * fxRate : null,
        bbUpper: bb.upper[idx] != null ? bb.upper[idx] * fxRate : null,
        bbMiddle: bb.middle[idx] != null ? bb.middle[idx] * fxRate : null,
        bbLower: bb.lower[idx] != null ? bb.lower[idx] * fxRate : null,
        // RSI: historical uses historical-only calculation, forecast uses full calculation
        rsi: rsiFull[idx],
        // Separate RSI keys for distinct line styling
        rsiHistorical: isHistorical ? rsiHistorical[idx] : (isFirstForecast && histLength > 0 ? rsiHistorical[histLength - 1] : null),
        rsiForecast: isHistorical ? (isTransitionPoint ? rsiFull[idx] : null) : rsiFull[idx],
        isHistorical: isHistorical,
      };
    });

    return {
      data: combinedData,
      historicalData: combinedData.filter((d) => d.isHistorical),
      forecastData: combinedData.filter((d) => !d.isHistorical),
    };
  }, [historical, forecastDisplay, indicatorParams, fxRate]);

  // Get prediction price values from current to selected horizon
  const predictionValues = useMemo(() => {
    if (!forecastDisplay.length || !lastHistoricalPrice) return [];
    const currentTime = lastHistoricalTime;
    const currentPrice = lastHistoricalPrice;

    const values = [{ time: currentTime, price: currentPrice, isCurrent: true }];
    forecastDisplay.forEach((f, idx) => {
      values.push({ ...f, day: idx + 1, isCurrent: false });
    });
    return values;
  }, [forecastDisplay, lastHistoricalTime, lastHistoricalPrice]);

  const activeSection = location.pathname.endsWith("/training")
    ? "training"
    : location.pathname.endsWith("/forecast")
      ? "forecast"
      : "historical";

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <img src={coin.image} alt="" className="h-10 w-10 rounded" />
            <div>
              <h1 className="text-2xl font-semibold text-white">{coin.name} Forecasting</h1>
              <p className="text-sm text-slate-400">Horizon-aware model selection</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Live Price Display */}
          {liveTicker && (
            <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-2">
              <div className="text-xs text-slate-400">Live Price</div>
              <div className="text-lg font-semibold text-white">{formatCurrency(liveTicker.price * fxRate, currency)}</div>
              <div className={`text-xs ${liveTicker.change >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {liveTicker.change >= 0 ? "▲" : "▼"} {Math.abs(liveTicker.change).toFixed(2)}%
              </div>
            </div>
          )}
          <Link
            to="/"
            className="rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:border-accent"
          >
            ← Back to markets
          </Link>
        </div>
      </div>

      {/* Section selector: Historical / Training / Forecast */}
      <div className="mt-6 flex items-center gap-3">
        <button
          onClick={() => navigate(`/coin/${slug}`)}
          disabled={loading}
          className={`rounded-full px-4 py-2 text-sm font-medium ${activeSection === "historical" ? "bg-accent text-slate-900" : "bg-white/5 text-slate-300"} ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          Historical Analysis
        </button>
        <button
          onClick={() => navigate(`/coin/${slug}/training`)}
          disabled={loading}
          className={`rounded-full px-4 py-2 text-sm font-medium ${activeSection === "training" ? "bg-accent text-slate-900" : "bg-white/5 text-slate-300"} ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          Training &amp; Testing
        </button>
        <button
          onClick={() => navigate(`/coin/${slug}/forecast`)}
          disabled={loading}
          className={`rounded-full px-4 py-2 text-sm font-medium ${activeSection === "forecast" ? "bg-accent text-slate-900" : "bg-white/5 text-slate-300"} ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          Forecasting
        </button>
      </div>

      <div className="mt-6 space-y-4">
        <div className="glass card-border rounded-3xl p-5">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-4">
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-accent">
                  {isHourly ? "Price at t+24h" : "Forecasted Price"}
                </div>
                <div className="text-3xl font-semibold text-white">
                  {data ? formatCurrency(data.forecasted_price * fxRate, currency) : "--"}
                </div>
              </div>
              {/* Currency selector next to forecasted price */}
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm font-medium text-white outline-none cursor-pointer hover:border-accent transition-colors"
              >
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code} className="bg-slate-900">
                    {c.code} - {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Prediction Horizon - now inside Forecasted Price section */}
          <div className="mt-4 pt-4 border-t border-white/10">
            <div className="text-sm font-semibold text-white mb-3">Prediction Horizon</div>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-2">
                {/* Next 24 Hours button for hourly forecasting */}
                <button
                  onClick={() => { setIsHourlyMode(true); setSliderDays(1); }}
                  disabled={loading}
                  className={`rounded-full px-3 py-2 text-sm font-semibold transition-all ${isHourlyMode ? "bg-amber-500 text-slate-900" : "bg-white/5 text-slate-300 hover:bg-white/10"} ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  Next 24h
                </button>
                <span className="text-slate-500 text-xs px-1">|</span>
                {/* Daily horizon buttons */}
                {HORIZONS.map((h) => (
                  <button
                    key={h}
                    onClick={() => { setIsHourlyMode(false); setSliderDays(h); setHorizon(h); }}
                    disabled={loading}
                    className={`rounded-full px-3 py-2 text-sm font-semibold transition-all ${!isHourlyMode && sliderDays === h ? "bg-accent text-slate-900" : "bg-white/5 text-slate-300 hover:bg-white/10"} ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    {h}d
                  </button>
                ))}
                <span className="text-slate-500 text-xs px-2">|</span>
                {/* Generate Forecast button */}
                <button
                  onClick={fetchForecast}
                  className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-accent/80 transition-all"
                  disabled={loading}
                >
                  {loading ? "Generating..." : "Generate Forecast"}
                </button>
                {/* Force retrain checkbox with info tooltip */}
                <div className="flex items-center gap-2 ml-2 relative group">
                  <label className="flex items-center gap-2 text-xs text-slate-300">
                    <input
                      type="checkbox"
                      checked={forceRetrain}
                      onChange={(e) => setForceRetrain(e.target.checked)}
                      disabled={loading}
                      className="accent-accent"
                    />
                    Force retrain
                  </label>
                  {/* Info icon with tooltip */}
                  <div className="relative">
                    <svg
                      className="w-4 h-4 text-slate-400 hover:text-accent cursor-help transition-colors"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {/* Tooltip popup */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 rounded-xl bg-slate-800 border border-white/10 shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                      <div className="text-xs text-white font-semibold mb-1">💡 Tip</div>
                      <div className="text-xs text-slate-300 leading-relaxed">
                        <strong className="text-amber-400">First forecast of the day?</strong><br />
                        Enable "Force retrain" to train the model with the latest data for best accuracy.
                        <br /><br />
                        <strong className="text-emerald-400">Already forecasted today?</strong><br />
                        Leave unchecked to use the cached model for faster results.
                      </div>
                      {/* Arrow */}
                      <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-slate-800"></div>
                    </div>
                  </div>
                </div>
              </div>
              {/* Historical & Forecast High/Low - positioned on the right */}
              {stats && (
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl border border-white/5 bg-white/5 px-4 py-2">
                    <div className="text-xs text-slate-400">Historical High / Low</div>
                    <div className="text-sm text-white font-semibold">
                      {formatChartValueDetailed(stats.histHigh * fxRate)} / {formatChartValueDetailed(stats.histLow * fxRate)}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-white/5 bg-white/5 px-4 py-2">
                    <div className="text-xs text-slate-400">Forecast High / Low</div>
                    <div className="text-sm text-white font-semibold">
                      {formatChartValueDetailed(stats.forecastHigh * fxRate)} / {formatChartValueDetailed(stats.forecastLow * fxRate)}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* model info / cached banner */}
          {data?.using_cached_model && (
            <div className="mt-3 rounded-md bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">⚡ Prediction completed instantly using cached model</div>
          )}
          {data?.model_info?.timestamp && (
            <div className="mt-2 text-xs text-slate-400">Model trained: {new Date(data.model_info.timestamp).toLocaleString()} • Time step: {data.model_info.time_step || timeStep}</div>
          )}

          {error && <div className="mt-3 rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-200">{error}</div>}
          {loading && <div className="mt-3 rounded-lg bg-blue-500/10 px-3 py-2 text-sm text-blue-200">Generating forecast... Please wait.</div>}

          {/* Prediction Values Table Toggle */}
          {data && predictionValues.length > 0 && (
            <div className="mt-4">
              <button
                onClick={() => setShowPredictions(!showPredictions)}
                className="rounded-lg border border-white/10 px-4 py-2 text-sm text-white hover:border-accent transition-all"
              >
                {showPredictions ? "Hide" : "Show"} Prediction Values
              </button>

              {showPredictions && (
                <div className="mt-3 rounded-lg border border-white/5 bg-white/5 p-4 max-h-96 overflow-y-auto">
                  <div className="text-sm font-semibold text-white mb-3">
                    {isHourly ? "Prediction Prices (Current to t+24h)" : `Prediction Prices (Current to ${sliderDays} day${sliderDays !== 1 ? 's' : ''})`}
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-white/10">
                          <th className="text-left py-2 px-3 text-slate-400">{isHourly ? "Hour" : "Day"}</th>
                          <th className="text-left py-2 px-3 text-slate-400">Date/Time</th>
                          <th className="text-right py-2 px-3 text-slate-400">Price ({currency})</th>
                        </tr>
                      </thead>
                      <tbody>
                        {predictionValues.slice(0, isHourly ? 25 : sliderDays + 1).map((pv, idx) => (
                          <tr key={idx} className={`border-b border-white/5 ${pv.isCurrent ? "bg-emerald-500/10" : ""}`}>
                            <td className="py-2 px-3 text-white">
                              {pv.isCurrent ? "Current" : (isHourly ? `t+${pv.day}` : pv.day)}
                            </td>
                            <td className="py-2 px-3 text-slate-300">
                              {new Date(pv.time).toLocaleString()}
                            </td>
                            <td className="py-2 px-3 text-white font-semibold text-right">
                              {formatChartValueDetailed(pv.price * fxRate)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Price Forecast Chart - Clean, no indicators */}
        <div className="glass card-border rounded-3xl p-5">
          <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
            <div>
              <div className="text-sm font-semibold text-white">Price Forecast</div>
              <div className="text-xs text-slate-400">
                {isHourly ? "Last 48 hours + Next 24 hours (hourly)" : `Historical + ${horizon}-day forecast (daily)`}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4 mb-3">
            <div className="flex items-center gap-2 text-sm text-slate-300">
              <span className="w-3 h-3 rounded-full bg-[#06b6d4] inline-block" /> Historical {isHourly ? "(48h)" : ""}
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-300">
              <span className="w-3 h-3 rounded-full bg-[#f59e0b] inline-block" /> Forecast {isHourly ? "(24h)" : ""}
              <span className="ml-2 text-xs text-slate-500">({forecastDisplay.length} pts)</span>
            </div>
          </div>

          <div className="mt-3 h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={indicators.data || [...historical, ...forecastDisplay]}
                margin={{ top: 10, right: 12, left: 12, bottom: 20 }}
              >
                {/* Gradient definitions for beautiful shading with shadow glow */}
                <defs>
                  <linearGradient id="historicalGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.6} />
                    <stop offset="30%" stopColor="#06b6d4" stopOpacity={0.35} />
                    <stop offset="60%" stopColor="#0891b2" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="#164e63" stopOpacity={0.03} />
                  </linearGradient>
                  <linearGradient id="forecastGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.55} />
                    <stop offset="30%" stopColor="#f59e0b" stopOpacity={0.3} />
                    <stop offset="60%" stopColor="#d97706" stopOpacity={0.12} />
                    <stop offset="100%" stopColor="#92400e" stopOpacity={0.03} />
                  </linearGradient>
                  {/* Drop shadow filter for glow effect */}
                  <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                    <feMerge>
                      <feMergeNode in="coloredBlur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>
                <XAxis
                  dataKey="time"
                  type="number"
                  domain={['dataMin', 'dataMax']}
                  tickFormatter={tickFormatter}
                  stroke="#94a3b8"
                  ticks={xTicks}
                />
                <YAxis
                  stroke="#94a3b8"
                  tickFormatter={formatChartValue}
                  domain={[(dataMin) => dataMin * 0.995, (dataMax) => dataMax * 1.005]}
                  padding={{ bottom: 20, top: 10 }}
                />
                <Tooltip
                  labelFormatter={(t) => (isHourly ? new Date(t).toLocaleString() : new Date(t).toLocaleDateString())}
                  formatter={(v, name) => {
                    if (name === 'historicalPrice' || name === 'forecastPrice' || name === 'price') {
                      return v != null ? formatChartValueDetailed(v) : null;
                    }
                    return v;
                  }}
                  contentStyle={{ backgroundColor: "#0b1224", borderColor: "#1f2937" }}
                />
                <Legend />

                {/* forecast start vertical divide */}
                {forecastStartTime && <ReferenceLine x={forecastStartTime} stroke="#9be7b8" strokeDasharray="3 6" />}

                {/* historical series gradient shadow fill under curve */}
                <Area
                  type="monotone"
                  dataKey="historicalPrice"
                  stroke="none"
                  fill="url(#historicalGradient)"
                  fillOpacity={1}
                  connectNulls={false}
                  isAnimationActive={true}
                />
                {/* forecast series gradient shadow fill under curve */}
                <Area
                  type="monotone"
                  dataKey="forecastPrice"
                  stroke="none"
                  fill="url(#forecastGradient)"
                  fillOpacity={1}
                  connectNulls={false}
                  isAnimationActive={true}
                />
                {/* historical series line */}
                <Line
                  type="monotone"
                  dataKey="historicalPrice"
                  stroke="#06b6d4"
                  dot={false}
                  strokeWidth={2}
                  name="Historical Price"
                  connectNulls={false}
                />

                {/* forecast series (dashed) */}
                <Line
                  type="monotone"
                  dataKey="forecastPrice"
                  stroke="#f59e0b"
                  dot={false}
                  strokeWidth={2}
                  strokeDasharray="4 6"
                  name="Forecast Price"
                  connectNulls={false}
                />

                {/* forecast start marker */}
                {lastHistoricalTime && lastHistoricalPrice && (
                  <ReferenceDot
                    x={lastHistoricalTime}
                    y={lastHistoricalPrice}
                    r={6}
                    fill="#28a745"
                    stroke="#fff"
                    strokeWidth={2}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Indicator Analysis Section - Separate from Price Chart */}
        <div className="glass card-border rounded-3xl p-5">
          <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
            <div>
              <div className="text-sm font-semibold text-white">Indicator Analysis</div>
              <div className="text-xs text-slate-400">Technical indicators based on historical and forecasted data</div>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <label className="flex items-center gap-2 text-xs text-slate-300">
                <input type="checkbox" checked={indicatorOptions.sma} onChange={(e) => setIndicatorOptions({ ...indicatorOptions, sma: e.target.checked })} className="accent-accent" />
                SMA
              </label>
              <label className="flex items-center gap-2 text-xs text-slate-300">
                <input type="checkbox" checked={indicatorOptions.ema} onChange={(e) => setIndicatorOptions({ ...indicatorOptions, ema: e.target.checked })} className="accent-accent" />
                EMA
              </label>
              <label className="flex items-center gap-2 text-xs text-slate-300">
                <input type="checkbox" checked={indicatorOptions.bb} onChange={(e) => setIndicatorOptions({ ...indicatorOptions, bb: e.target.checked })} className="accent-accent" />
                Bollinger Bands
              </label>
              <label className="flex items-center gap-2 text-xs text-slate-300">
                <input type="checkbox" checked={indicatorOptions.rsi} onChange={(e) => setIndicatorOptions({ ...indicatorOptions, rsi: e.target.checked })} className="accent-accent" />
                RSI
              </label>
            </div>
          </div>

          {/* SMA Indicator Graph */}
          {indicatorOptions.sma && indicators.data && (
            <div className="mb-6">
              <div className="text-xs font-semibold text-white mb-2 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#10b981] inline-block" />
                Simple Moving Average (SMA-{indicatorParams.smaWindow})
              </div>
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={indicators.data}
                    margin={{ top: 10, right: 12, left: 12, bottom: 0 }}
                  >
                    <XAxis
                      dataKey="time"
                      type="number"
                      domain={['dataMin', 'dataMax']}
                      tickFormatter={tickFormatter}
                      stroke="#94a3b8"
                      ticks={xTicks}
                    />
                    <YAxis
                      stroke="#94a3b8"
                      tickFormatter={formatChartValue}
                      domain={['dataMin', 'dataMax']}
                    />
                    <Tooltip
                      labelFormatter={(t) => (isHourly ? new Date(t).toLocaleString() : new Date(t).toLocaleDateString())}
                      formatter={(v) => v != null ? formatChartValueDetailed(v) : null}
                      contentStyle={{ backgroundColor: "#0b1224", borderColor: "#1f2937" }}
                    />
                    {forecastStartTime && <ReferenceLine x={forecastStartTime} stroke="#9be7b8" strokeDasharray="3 6" />}
                    <Line
                      type="monotone"
                      dataKey="historicalPrice"
                      stroke="#06b6d4"
                      strokeWidth={1}
                      dot={false}
                      name="Price"
                      opacity={0.5}
                    />
                    <Line
                      type="monotone"
                      dataKey="forecastPrice"
                      stroke="#f59e0b"
                      strokeWidth={1}
                      strokeDasharray="4 6"
                      dot={false}
                      name="Forecast"
                      opacity={0.5}
                    />
                    <Line
                      type="monotone"
                      dataKey="sma"
                      stroke="#10b981"
                      strokeWidth={2}
                      dot={false}
                      name="SMA"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* EMA Indicator Graph */}
          {indicatorOptions.ema && indicators.data && (
            <div className="mb-6">
              <div className="text-xs font-semibold text-white mb-2 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#3b82f6] inline-block" />
                Exponential Moving Average (EMA-{indicatorParams.emaShort} / EMA-{indicatorParams.emaLong})
              </div>
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={indicators.data}
                    margin={{ top: 10, right: 12, left: 12, bottom: 0 }}
                  >
                    <XAxis
                      dataKey="time"
                      type="number"
                      domain={['dataMin', 'dataMax']}
                      tickFormatter={tickFormatter}
                      stroke="#94a3b8"
                      ticks={xTicks}
                    />
                    <YAxis
                      stroke="#94a3b8"
                      tickFormatter={formatChartValue}
                      domain={['dataMin', 'dataMax']}
                    />
                    <Tooltip
                      labelFormatter={(t) => (isHourly ? new Date(t).toLocaleString() : new Date(t).toLocaleDateString())}
                      formatter={(v) => v != null ? formatChartValueDetailed(v) : null}
                      contentStyle={{ backgroundColor: "#0b1224", borderColor: "#1f2937" }}
                    />
                    <Legend />
                    {forecastStartTime && <ReferenceLine x={forecastStartTime} stroke="#9be7b8" strokeDasharray="3 6" />}
                    <Line
                      type="monotone"
                      dataKey="historicalPrice"
                      stroke="#06b6d4"
                      strokeWidth={1}
                      dot={false}
                      name="Price"
                      opacity={0.5}
                    />
                    <Line
                      type="monotone"
                      dataKey="forecastPrice"
                      stroke="#f59e0b"
                      strokeWidth={1}
                      strokeDasharray="4 6"
                      dot={false}
                      name="Forecast"
                      opacity={0.5}
                    />
                    <Line
                      type="monotone"
                      dataKey="emaShort"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={false}
                      name={`EMA ${indicatorParams.emaShort}`}
                    />
                    <Line
                      type="monotone"
                      dataKey="emaLong"
                      stroke="#6366f1"
                      strokeWidth={2}
                      strokeDasharray="2 2"
                      dot={false}
                      name={`EMA ${indicatorParams.emaLong}`}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Bollinger Bands Graph */}
          {indicatorOptions.bb && indicators.data && (
            <div className="mb-6">
              <div className="text-xs font-semibold text-white mb-2 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#8b5cf6] inline-block" />
                Bollinger Bands (Period: {indicatorParams.bbWindow})
              </div>
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={indicators.data}
                    margin={{ top: 10, right: 12, left: 12, bottom: 0 }}
                  >
                    <XAxis
                      dataKey="time"
                      type="number"
                      domain={['dataMin', 'dataMax']}
                      tickFormatter={tickFormatter}
                      stroke="#94a3b8"
                      ticks={xTicks}
                    />
                    <YAxis
                      stroke="#94a3b8"
                      tickFormatter={formatChartValue}
                      domain={['dataMin', 'dataMax']}
                    />
                    <Tooltip
                      labelFormatter={(t) => (isHourly ? new Date(t).toLocaleString() : new Date(t).toLocaleDateString())}
                      formatter={(v) => v != null ? formatChartValueDetailed(v) : null}
                      contentStyle={{ backgroundColor: "#0b1224", borderColor: "#1f2937" }}
                    />
                    <Legend />
                    {forecastStartTime && <ReferenceLine x={forecastStartTime} stroke="#9be7b8" strokeDasharray="3 6" />}
                    <Area
                      type="monotone"
                      dataKey="bbUpper"
                      stroke="none"
                      fill="#8b5cf6"
                      fillOpacity={0.1}
                      name="BB Upper"
                    />
                    <Line
                      type="monotone"
                      dataKey="historicalPrice"
                      stroke="#06b6d4"
                      strokeWidth={1}
                      dot={false}
                      name="Price"
                      opacity={0.7}
                    />
                    <Line
                      type="monotone"
                      dataKey="forecastPrice"
                      stroke="#f59e0b"
                      strokeWidth={1}
                      strokeDasharray="4 6"
                      dot={false}
                      name="Forecast"
                      opacity={0.7}
                    />
                    <Line
                      type="monotone"
                      dataKey="bbUpper"
                      stroke="#8b5cf6"
                      strokeWidth={1.5}
                      strokeDasharray="2 2"
                      dot={false}
                      name="Upper Band"
                    />
                    <Line
                      type="monotone"
                      dataKey="bbMiddle"
                      stroke="#a78bfa"
                      strokeWidth={1.5}
                      dot={false}
                      name="Middle Band"
                    />
                    <Line
                      type="monotone"
                      dataKey="bbLower"
                      stroke="#8b5cf6"
                      strokeWidth={1.5}
                      strokeDasharray="2 2"
                      dot={false}
                      name="Lower Band"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* RSI Indicator Graph */}
          {indicatorOptions.rsi && indicators.data && (
            <div className="mb-2">
              <div className="text-xs font-semibold text-white mb-2 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#f43f5e] inline-block" />
                Relative Strength Index (RSI-{indicatorParams.rsiPeriod})
              </div>
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={indicators.data}
                    margin={{ top: 10, right: 12, left: 12, bottom: 0 }}
                  >
                    <XAxis
                      dataKey="time"
                      type="number"
                      domain={['dataMin', 'dataMax']}
                      tickFormatter={tickFormatter}
                      stroke="#94a3b8"
                      ticks={xTicks}
                    />
                    <YAxis
                      stroke="#94a3b8"
                      domain={[0, 100]}
                      tickFormatter={(v) => `${v}`}
                    />
                    <Tooltip
                      labelFormatter={(t) => (isHourly ? new Date(t).toLocaleString() : new Date(t).toLocaleDateString())}
                      formatter={(v, name) => {
                        if (v == null) return null;
                        const label = name === 'rsiHistorical' ? 'RSI (Historical)' : name === 'rsiForecast' ? 'RSI (Forecast)' : name;
                        return [`${Number(v).toFixed(2)}`, label];
                      }}
                      contentStyle={{ backgroundColor: "#0b1224", borderColor: "#1f2937" }}
                    />
                    <Legend />
                    {forecastStartTime && <ReferenceLine x={forecastStartTime} stroke="#9be7b8" strokeDasharray="3 6" />}
                    <ReferenceLine y={70} stroke="#f43f5e" strokeDasharray="2 2" label={{ value: "Overbought (70)", position: "right", fill: "#f43f5e", fontSize: 10 }} />
                    <ReferenceLine y={30} stroke="#22c55e" strokeDasharray="2 2" label={{ value: "Oversold (30)", position: "right", fill: "#22c55e", fontSize: 10 }} />
                    <ReferenceLine y={50} stroke="#94a3b8" strokeDasharray="1 2" />
                    {/* Historical RSI - solid line */}
                    <Line
                      type="monotone"
                      dataKey="rsiHistorical"
                      stroke="#06b6d4"
                      dot={false}
                      strokeWidth={2}
                      name="RSI (Historical)"
                      connectNulls={false}
                    />
                    {/* Forecast RSI - dashed line, connects from last historical point */}
                    <Line
                      type="monotone"
                      dataKey="rsiForecast"
                      stroke="#f59e0b"
                      dot={false}
                      strokeWidth={2}
                      strokeDasharray="4 6"
                      name="RSI (Forecast)"
                      connectNulls={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Message when no indicators selected */}
          {!indicatorOptions.sma && !indicatorOptions.ema && !indicatorOptions.bb && !indicatorOptions.rsi && (
            <div className="text-center py-8 text-slate-400">
              <div className="text-sm">Select an indicator above to view its analysis</div>
            </div>
          )}
        </div>

        {/* Cumulative Returns Chart - Enhanced with positive/negative shading */}
        <div className="glass card-border rounded-3xl p-5">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="text-sm font-semibold text-white">Cumulative Returns</div>
              <div className="text-xs text-slate-400">Historical and forecasted returns with positive/negative zones</div>
            </div>
          </div>
          <div className="mt-3 h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={[...cumulativeHistorical, ...cumulativeForecastAnchored]}
                margin={{ top: 10, right: 12, left: 12, bottom: 0 }}
              >
                <defs>
                  {/* Gradient for positive returns (green) */}
                  <linearGradient id="positiveGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22c55e" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#22c55e" stopOpacity={0.05} />
                  </linearGradient>
                  {/* Gradient for negative returns (red) */}
                  <linearGradient id="negativeGradient" x1="0" y1="1" x2="0" y2="0">
                    <stop offset="0%" stopColor="#ef4444" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#ef4444" stopOpacity={0.05} />
                  </linearGradient>
                  {/* Gradient for historical line */}
                  <linearGradient id="historicalGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#06b6d4" stopOpacity={0.05} />
                  </linearGradient>
                  {/* Gradient for forecast line */}
                  <linearGradient id="forecastGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="time"
                  tickFormatter={tickFormatter}
                  stroke="#94a3b8"
                  ticks={xTicks}
                />
                <YAxis
                  stroke="#94a3b8"
                  tickFormatter={(v) => `${(v * 100).toFixed(1)}%`}
                  domain={['dataMin', 'dataMax']}
                />
                <Tooltip
                  labelFormatter={(t) => (isHourly ? new Date(t).toLocaleString() : new Date(t).toLocaleDateString())}
                  formatter={(v, name) => {
                    const pct = (v * 100).toFixed(2);
                    const color = v >= 0 ? '#22c55e' : '#ef4444';
                    return [`${pct}%`, name];
                  }}
                  contentStyle={{ backgroundColor: "#0b1224", borderColor: "#1f2937" }}
                />
                <Legend />

                {/* Zero reference line */}
                <ReferenceLine y={0} stroke="#64748b" strokeWidth={1.5} strokeDasharray="3 3" />

                {/* Forecast start reference line */}
                {lastHistoricalTime && <ReferenceLine x={lastHistoricalTime} stroke="#28a745" strokeDasharray="3 6" label={{ value: "Forecast Start", position: "top", fill: "#28a745", fontSize: 10 }} />}

                {/* Historical Returns - Positive Area (above 0) */}
                {cumulativeHistorical.length > 0 && (
                  <Area
                    type="monotone"
                    data={cumulativeHistorical.map(d => ({ ...d, positivePrice: d.price >= 0 ? d.price : 0 }))}
                    dataKey="positivePrice"
                    stroke="none"
                    fill="url(#positiveGradient)"
                    baseLine={0}
                  />
                )}

                {/* Historical Returns - Negative Area (below 0) */}
                {cumulativeHistorical.length > 0 && (
                  <Area
                    type="monotone"
                    data={cumulativeHistorical.map(d => ({ ...d, negativePrice: d.price < 0 ? d.price : 0 }))}
                    dataKey="negativePrice"
                    stroke="none"
                    fill="url(#negativeGradient)"
                    baseLine={0}
                  />
                )}

                {/* Forecast Returns - Positive Area */}
                {cumulativeForecastAnchored.length > 0 && (
                  <Area
                    type="monotone"
                    data={cumulativeForecastAnchored.map(d => ({ ...d, positivePrice: d.price >= 0 ? d.price : 0 }))}
                    dataKey="positivePrice"
                    stroke="none"
                    fill="#22c55e"
                    fillOpacity={0.15}
                    baseLine={0}
                  />
                )}

                {/* Forecast Returns - Negative Area */}
                {cumulativeForecastAnchored.length > 0 && (
                  <Area
                    type="monotone"
                    data={cumulativeForecastAnchored.map(d => ({ ...d, negativePrice: d.price < 0 ? d.price : 0 }))}
                    dataKey="negativePrice"
                    stroke="none"
                    fill="#ef4444"
                    fillOpacity={0.15}
                    baseLine={0}
                  />
                )}

                {/* Historical Returns Line */}
                {cumulativeHistorical.length > 0 && (
                  <Line
                    type="monotone"
                    data={cumulativeHistorical}
                    dataKey="price"
                    stroke="#06b6d4"
                    dot={false}
                    strokeWidth={2.5}
                    name="Historical Returns"
                  />
                )}

                {/* Forecast Returns Line */}
                {cumulativeForecastAnchored.length > 0 && (
                  <Line
                    type="monotone"
                    data={cumulativeForecastAnchored}
                    dataKey="price"
                    stroke="#f59e0b"
                    dot={false}
                    strokeWidth={2.5}
                    strokeDasharray="6 4"
                    name="Forecast Returns"
                  />
                )}

                {/* Current position marker */}
                {lastHistoricalTime && cumulativeHistorical.length > 0 && (
                  <ReferenceDot
                    x={lastHistoricalTime}
                    y={cumulativeHistorical[cumulativeHistorical.length - 1]?.price || 0}
                    r={5}
                    fill="#28a745"
                    stroke="#fff"
                    strokeWidth={2}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Summary Stats */}
          {(cumulativeHistorical.length > 0 || cumulativeForecastAnchored.length > 0) && (
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {cumulativeHistorical.length > 0 && (
                <>
                  <div className="rounded-xl border border-white/5 bg-white/5 p-3">
                    <div className="text-xs text-slate-400">Historical Return</div>
                    <div className={`text-lg font-semibold ${(cumulativeHistorical[cumulativeHistorical.length - 1]?.price || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {((cumulativeHistorical[cumulativeHistorical.length - 1]?.price || 0) * 100).toFixed(2)}%
                    </div>
                  </div>
                </>
              )}
              {cumulativeForecastAnchored.length > 1 && (
                <>
                  <div className="rounded-xl border border-white/5 bg-white/5 p-3">
                    <div className="text-xs text-slate-400">Forecast Return</div>
                    <div className={`text-lg font-semibold ${(cumulativeForecastAnchored[cumulativeForecastAnchored.length - 1]?.price || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {((cumulativeForecastAnchored[cumulativeForecastAnchored.length - 1]?.price || 0) * 100).toFixed(2)}%
                    </div>
                  </div>
                  <div className="rounded-xl border border-white/5 bg-white/5 p-3">
                    <div className="text-xs text-slate-400">Expected Change</div>
                    <div className={`text-lg font-semibold ${((cumulativeForecastAnchored[cumulativeForecastAnchored.length - 1]?.price || 0) - (cumulativeHistorical[cumulativeHistorical.length - 1]?.price || 0)) >= 0
                      ? 'text-emerald-400' : 'text-rose-400'
                      }`}>
                      {(((cumulativeForecastAnchored[cumulativeForecastAnchored.length - 1]?.price || 0) - (cumulativeHistorical[cumulativeHistorical.length - 1]?.price || 0)) * 100).toFixed(2)}%
                    </div>
                  </div>
                  <div className="rounded-xl border border-white/5 bg-white/5 p-3">
                    <div className="text-xs text-slate-400">Trend</div>
                    <div className={`text-lg font-semibold ${(cumulativeForecastAnchored[cumulativeForecastAnchored.length - 1]?.price || 0) > (cumulativeForecastAnchored[0]?.price || 0)
                      ? 'text-emerald-400' : 'text-rose-400'
                      }`}>
                      {(cumulativeForecastAnchored[cumulativeForecastAnchored.length - 1]?.price || 0) > (cumulativeForecastAnchored[0]?.price || 0) ? '↑ Upward' : '↓ Downward'}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

      </div>
    </main >
  );
}