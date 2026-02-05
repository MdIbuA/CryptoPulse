import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, useLocation, Link } from "react-router-dom";
import { COINS, slugToSymbol } from "../constants/coins";
import { getHistoricalOHLC, RANGES } from "../utils/historicalApi";
import {
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
  ComposedChart,
  Area
} from "recharts";
import { useLiveTickers } from "../hooks/useLiveTickers";
import { useFxRate, CURRENCIES } from "../hooks/useFxRate";

// Horizons with daily data points
const DAILY_HORIZONS = ["1y", "6m", "3m"];

function formatDay(ts, short = false, rangeKey = null) {
  const d = new Date(ts);
  // For daily horizons, show date format (e.g., "Jan 15")
  if (rangeKey && DAILY_HORIZONS.includes(rangeKey)) {
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  }
  // For shorter timeframes, show time
  if (short) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleString();
}

function formatNumber(value, currency = "USD") {
  if (value === undefined || value === null || Number.isNaN(value)) return "--";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2
  }).format(value);
}

function formatVolume(value) {
  if (value === undefined || value === null || Number.isNaN(value)) return "--";
  if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(2)}K`;
  return value.toFixed(2);
}

function useCoin(slug) {
  const coin = COINS.find((c) => c.slug === slug);
  return coin || { name: slug, ticker: slug.toUpperCase() };
}

function RangeTabs({ value, onChange, options }) {
  return (
    <div className="inline-flex rounded-full border border-white/10 bg-white/5 p-1 text-xs">
      {options.map((opt) => (
        <button
          key={opt.key}
          onClick={() => onChange(opt.key)}
          className={`rounded-full px-3 py-1 font-semibold transition ${value === opt.key
            ? "bg-accent text-slate-900 shadow"
            : "text-slate-200 hover:text-white"
            }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function CustomTooltip({ active, payload, fxRate, currency }) {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0].payload;
  const price = data.price || data.close;

  return (
    <div className="rounded-lg border border-white/10 bg-slate-900/95 p-3 shadow-xl backdrop-blur">
      <div className="mb-2 text-xs font-semibold text-slate-400">
        {formatDay(data.time)}
      </div>
      <div className="space-y-1 text-sm">
        <div className="flex justify-between gap-4">
          <span className="text-slate-400">Price:</span>
          <span className="font-semibold text-white">{formatNumber(price * fxRate, currency)}</span>
        </div>
        {data.open && (
          <div className="flex justify-between gap-4">
            <span className="text-slate-400">Open:</span>
            <span className="text-white">{formatNumber(data.open * fxRate, currency)}</span>
          </div>
        )}
        {data.close && (
          <div className="flex justify-between gap-4">
            <span className="text-slate-400">Close:</span>
            <span className="text-white">{formatNumber(data.close * fxRate, currency)}</span>
          </div>
        )}
        {data.high && (
          <div className="flex justify-between gap-4">
            <span className="text-slate-400">High:</span>
            <span className="text-white">{formatNumber(data.high * fxRate, currency)}</span>
          </div>
        )}
        {data.low && (
          <div className="flex justify-between gap-4">
            <span className="text-slate-400">Low:</span>
            <span className="text-white">{formatNumber(data.low * fxRate, currency)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function TradingViewWidget({ symbol }) {
  useEffect(() => {
    const tradingViewSymbol = `BINANCE:${symbol}`;
    const containerId = `tradingview_${symbol}`;

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: tradingViewSymbol,
      interval: "D",
      timezone: "Etc/UTC",
      theme: "dark",
      style: "1",
      locale: "en",
      backgroundColor: "rgba(11, 18, 36, 1)",
      hide_top_toolbar: false,
      hide_legend: false,
      save_image: false,
      container_id: containerId,
      support_host: "https://www.tradingview.com"
    });

    const container = document.getElementById(containerId);
    if (container) {
      container.innerHTML = "";
      container.appendChild(script);
    }

    return () => {
      if (container) container.innerHTML = "";
    };
  }, [symbol]);

  const containerId = `tradingview_${symbol}`;
  return (
    <div className="h-[500px] w-full">
      <div id={containerId} className="h-full w-full" />
    </div>
  );
}

export default function CoinDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const coin = useCoin(slug);
  const symbol = slugToSymbol[slug];

  const [rangeKey, setRangeKey] = useState("1y");
  const [chartType, setChartType] = useState("custom"); // 'custom' or 'tradingview'
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currency, setCurrency] = useState("USD");

  // live price stream for this symbol
  const tickers = useLiveTickers(symbol ? [symbol] : []);
  const liveTicker = tickers?.[symbol] || null;

  // FX rate for selected currency
  const fxRate = useFxRate(currency === "USD" ? "USD" : currency);

  // load historical OHLC
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const ohlc = await getHistoricalOHLC(slug, rangeKey);
        if (!cancelled) setData(ohlc);
      } catch (err) {
        console.error(err);
        if (!cancelled) setError(err.message || "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => (cancelled = true);
  }, [slug, rangeKey]);

  // Merge live ticker into last data point
  useEffect(() => {
    if (!liveTicker) return;
    const livePrice = liveTicker.price;
    setData((prev) => {
      if (!prev || prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      if (last.close === livePrice) return prev;
      const updatedLast = {
        ...last,
        close: livePrice,
        high: Math.max(last.high, livePrice),
        low: Math.min(last.low, livePrice)
      };
      return [...prev.slice(0, -1), updatedLast];
    });
  }, [liveTicker]);

  // Calculate reference line (starting price of the selected horizon)
  const referenceLine = useMemo(() => {
    if (!data?.length) return null;
    // Use the first data point's close price as the baseline
    const startingPrice = data[0]?.close;
    return startingPrice || null;
  }, [data]);

  // Transform data for chart with price above/below reference line
  const chartData = useMemo(() => {
    if (!data?.length || !referenceLine) return [];
    const refAdjusted = referenceLine * fxRate;
    return data.map((d) => {
      const price = d.close * fxRate;
      const isAbove = price >= refAdjusted;
      return {
        ...d,
        time: d.time,
        price,
        priceAbove: isAbove ? price : refAdjusted,  // Clamp to ref when below
        priceBelow: !isAbove ? price : refAdjusted, // Clamp to ref when above
        label: formatDay(d.time, true, rangeKey),   // Pass rangeKey for proper formatting
        refLine: refAdjusted,
      };
    });
  }, [data, fxRate, referenceLine, rangeKey]);

  const currentPrice = useMemo(() => {
    if (!chartData.length) return null;
    return chartData[chartData.length - 1].price;
  }, [chartData]);

  const percentChange = useMemo(() => {
    if (!chartData.length) return 0;
    const start = chartData[0].price;
    const latest = chartData[chartData.length - 1].price;
    return ((latest - start) / start) * 100;
  }, [chartData]);

  // Calculate Y-axis domain based on actual price values
  const yAxisDomain = useMemo(() => {
    if (!chartData.length) return ['auto', 'auto'];
    const prices = chartData.map(d => d.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const padding = (maxPrice - minPrice) * 0.05; // 5% padding
    return [minPrice - padding, maxPrice + padding];
  }, [chartData]);

  const activeSection = location.pathname.endsWith("/training")
    ? "training"
    : location.pathname.endsWith("/forecast")
      ? "forecast"
      : "historical";

  const refAdjusted = referenceLine ? referenceLine * fxRate : null;

  return (
    <main className="mx-auto max-w-6xl px-4 pb-16 pt-10">
      {/* Header */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <div className="relative h-16 w-16 rounded-2xl overflow-hidden bg-gradient-to-br from-white/10 to-white/5">
            <img
              src={coin.image}
              alt={coin.name}
              className="h-full w-full object-cover"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          </div>
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
              {coin.name} • {coin.ticker}
              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_0_6px_rgba(16,185,129,0.25)]" />
            </div>
            <h1 className="text-3xl font-semibold text-white">{coin.name} Analytics</h1>
            <p className="text-sm text-slate-400">
              Historical data analysis with reference line visualization
            </p>
          </div>
        </div>
        <Link
          to="/"
          className="rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:border-accent"
        >
          ← Back to markets
        </Link>
      </div>

      {/* Section selector */}
      <div className="mb-6 flex items-center gap-3">
        <button
          onClick={() => navigate(`/coin/${slug}`)}
          className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${activeSection === "historical" ? "bg-accent text-slate-900" : "bg-white/5 text-slate-300 hover:bg-white/10"}`}
        >
          Historical Analysis
        </button>
        <button
          onClick={() => navigate(`/coin/${slug}/training`)}
          className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${activeSection === "training" ? "bg-accent text-slate-900" : "bg-white/5 text-slate-300 hover:bg-white/10"}`}
        >
          Training &amp; Testing
        </button>
        <button
          onClick={() => navigate(`/coin/${slug}/forecast`)}
          className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${activeSection === "forecast" ? "bg-accent text-slate-900" : "bg-white/5 text-slate-300 hover:bg-white/10"}`}
        >
          Forecasting
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <div className="glass card-border rounded-2xl p-4">
          <div className="text-xs text-slate-400">Live Price</div>
          <div className="text-2xl font-semibold text-white">
            {data.length ? formatNumber(data[data.length - 1].close * fxRate, currency) : "--"}
          </div>
        </div>
        <div className="glass card-border rounded-2xl p-4">
          <div className="text-xs text-slate-400">24h Change</div>
          <div className={`text-2xl font-semibold ${(liveTicker?.change ?? percentChange) >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
            {(liveTicker?.change ?? percentChange).toFixed(2)}%
          </div>
        </div>
        <div className="glass card-border rounded-2xl p-4">
          <div className="text-xs text-slate-400">Range High/Low</div>
          <div className="text-lg font-semibold text-white">
            {data.length ? `${formatNumber(Math.max(...data.map(d => d.high)) * fxRate, currency)} / ${formatNumber(Math.min(...data.map(d => d.low)) * fxRate, currency)}` : "--"}
          </div>
        </div>
        <div className="glass card-border rounded-2xl p-4">
          <div className="text-xs text-slate-400">Currency</div>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="mt-1 bg-transparent text-lg font-semibold text-white border-none outline-none cursor-pointer max-h-60"
          >
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code} className="bg-slate-900">
                {c.code} - {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Chart */}
      <div className="glass card-border rounded-3xl p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-accent">Data Analysis</p>
            <h3 className="text-lg font-semibold text-white">Price Trend Analysis</h3>
            <p className="text-sm text-slate-400">Green areas show prices above starting price, red areas below</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Chart Type Toggle */}
            <div className="inline-flex rounded-full border border-white/10 bg-white/5 p-1 text-xs">
              <button
                onClick={() => setChartType("custom")}
                className={`rounded-full px-3 py-1 font-semibold transition ${chartType === "custom"
                  ? "bg-accent text-slate-900 shadow"
                  : "text-slate-200 hover:text-white"
                  }`}
              >
                Custom Chart
              </button>
              <button
                onClick={() => setChartType("tradingview")}
                className={`rounded-full px-3 py-1 font-semibold transition ${chartType === "tradingview"
                  ? "bg-accent text-slate-900 shadow"
                  : "text-slate-200 hover:text-white"
                  }`}
              >
                TradingView
              </button>
            </div>
            {/* Range Tabs */}
            <RangeTabs value={rangeKey} onChange={setRangeKey} options={RANGES} />
          </div>
        </div>

        <div className="h-[500px]">
          {loading && (
            <div className="flex h-full items-center justify-center text-slate-400">Loading...</div>
          )}
          {error && (
            <div className="flex h-full items-center justify-center text-rose-400">{error}</div>
          )}
          {!loading && !error && chartType === "tradingview" && symbol && (
            <TradingViewWidget symbol={symbol} />
          )}
          {!loading && !error && chartType === "custom" && chartData.length > 0 && refAdjusted && (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData}>
                <defs>
                  {/* Cyan gradient for price above baseline */}
                  <linearGradient id="gradient-above" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.6} />
                    <stop offset="50%" stopColor="#06b6d4" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#0891b2" stopOpacity={0.1} />
                  </linearGradient>
                  {/* Red gradient for price below baseline */}
                  <linearGradient id="gradient-below" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ef4444" stopOpacity={0.1} />
                    <stop offset="50%" stopColor="#ef4444" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#dc2626" stopOpacity={0.6} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis
                  dataKey="label"
                  tick={{ fill: "#9ca3af", fontSize: 11 }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fill: "#9ca3af", fontSize: 11 }}
                  domain={yAxisDomain}
                  tickFormatter={(v) => formatNumber(v, currency).replace(/[$₹€]/g, '')}
                  allowDataOverflow={true}
                />
                <Tooltip content={<CustomTooltip fxRate={fxRate} currency={currency} />} />

                {/* Reference line */}
                <ReferenceLine
                  y={refAdjusted}
                  stroke="#6b7280"
                  strokeDasharray="5 5"
                  strokeWidth={1.5}
                  label={{
                    value: `Start: ${formatNumber(refAdjusted, currency)}`,
                    position: "left",
                    fill: "#9ca3af",
                    fontSize: 11,
                    offset: 10
                  }}
                />

                {/* Cyan area for price above baseline - fills between curve and baseline */}
                <Area
                  type="monotone"
                  dataKey="priceAbove"
                  stroke="none"
                  fill="url(#gradient-above)"
                  fillOpacity={1}
                  baseValue={refAdjusted}
                  isAnimationActive={true}
                />

                {/* Red area for price below baseline - fills between curve and baseline */}
                <Area
                  type="monotone"
                  dataKey="priceBelow"
                  stroke="none"
                  fill="url(#gradient-below)"
                  fillOpacity={1}
                  baseValue={refAdjusted}
                  isAnimationActive={true}
                />

                {/* Main price line */}
                <Area
                  type="monotone"
                  dataKey="price"
                  stroke="#06b6d4"
                  strokeWidth={2.5}
                  fill="transparent"
                  dot={false}
                  activeDot={{ r: 5, fill: "#06b6d4", strokeWidth: 2, stroke: "#0b1224" }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
          {!loading && !error && chartType === "custom" && (!chartData.length || !refAdjusted) && (
            <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-white/10 text-sm text-slate-400">
              No data available for this range.
            </div>
          )}
        </div>

        {/* Legend */}
        {chartType === "custom" && refAdjusted && currentPrice && (
          <div className="mt-4 flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-4 py-2">
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-cyan-400" />
                <span className="text-slate-300">Above Starting Price</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-red-400" />
                <span className="text-slate-300">Below Starting Price</span>
              </div>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <div className="text-slate-400">
                Start Price: {formatNumber(refAdjusted, currency)}
              </div>
              <div className={`rounded-lg px-3 py-1 font-semibold ${currentPrice >= refAdjusted ? 'bg-cyan-400/20 text-cyan-300' : 'bg-red-400/20 text-red-300'}`}>
                Current: {formatNumber(currentPrice, currency)}
              </div>
              <div className={`rounded-lg px-3 py-1 font-semibold ${percentChange >= 0 ? 'bg-cyan-400/20 text-cyan-300' : 'bg-red-400/20 text-red-300'}`}>
                {percentChange >= 0 ? '▲' : '▼'} {Math.abs(percentChange).toFixed(2)}%
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
