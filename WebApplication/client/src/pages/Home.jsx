import { Link } from "react-router-dom";
import { COINS } from "../constants/coins.js";
import { useLiveTickers } from "../hooks/useLiveTickers.js";
import { useInrRate } from "../hooks/useInrRate.js";
import { useTheme } from "../context/ThemeContext.jsx";

function formatCurrency(value, currency = "USD") {
  if (!value && value !== 0) return "--";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2
  }).format(value);
}

function formatLargeNumber(value) {
  if (!value && value !== 0) return "--";
  if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  if (value >= 1e3) return `$${(value / 1e3).toFixed(2)}K`;
  return `$${value.toFixed(2)}`;
}

function MarketCard({ coin, ticker, inrRate }) {
  const usd = ticker?.price;
  const inr = usd ? usd * inrRate : undefined;
  const change = ticker?.change ?? 0;
  const volume24h = ticker?.volume24h;

  return (
    <Link
      to={`/coin/${coin.slug}`}
      className="glass card-border block rounded-2xl p-4 transition hover:-translate-y-1 hover:border-accent"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative h-10 w-10 rounded-xl overflow-hidden bg-gradient-to-br from-white/10 to-white/5">
            <img
              src={coin.image}
              alt={coin.name}
              className="h-full w-full object-cover"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          </div>
          <div>
            <div className="text-sm text-slate-400">{coin.ticker}</div>
            <div className="text-lg font-semibold">{coin.name}</div>
          </div>
        </div>
      </div>
      <div className="mt-4 space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-slate-400">USD</span>
          <span className="font-semibold">{formatCurrency(usd, "USD")}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">INR</span>
          <span className="font-semibold">{formatCurrency(inr, "INR")}</span>
        </div>
        {volume24h && (
          <div className="flex justify-between pt-2 border-t border-white/5">
            <span className="text-slate-400">24h Volume</span>
            <span className="font-semibold text-white">{formatLargeNumber(volume24h)}</span>
          </div>
        )}
      </div>
      <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
        <span>24h change</span>
        <span className={change >= 0 ? "text-emerald-400" : "text-rose-400"}>
          {change >= 0 ? "▲" : "▼"} {change.toFixed(2)}%
        </span>
      </div>
    </Link>
  );
}

export default function Home() {
  const tickers = useLiveTickers();
  const inrRate = useInrRate();
  const { isDark } = useTheme();

  return (
    <main>
      <section className={`relative overflow-hidden border-b ${isDark ? 'border-white/5 bg-gradient-to-b from-[#0a0f1f] via-[#060b17] to-[#040814]' : 'border-gray-200 bg-gradient-to-b from-white via-gray-50 to-gray-100'}`}>
        {/* Animated background blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-accent/25 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute top-1/2 right-1/4 w-[400px] h-[400px] bg-emerald-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
          <div className="absolute bottom-0 left-1/2 w-[600px] h-[600px] bg-cyan-500/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
          <div className="absolute -top-20 right-0 w-[300px] h-[300px] bg-emerald-400/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '0.5s' }}></div>
        </div>

        <div className="relative mx-auto flex max-w-6xl flex-col gap-10 px-4 pb-16 pt-12 lg:flex-row lg:items-center lg:py-20">
          <div className="flex-1 space-y-6">
            <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${isDark ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200' : 'border-teal-500/40 bg-teal-500/10 text-teal-700'}`}>
              Live multi-asset coverage
              <span className={`h-2 w-2 rounded-full animate-pulse ${isDark ? 'bg-emerald-400 shadow-[0_0_0_6px_rgba(16,185,129,0.25)]' : 'bg-teal-500 shadow-[0_0_0_6px_rgba(13,148,136,0.2)]'}`} />
            </div>
            <h1 className={`text-4xl font-semibold leading-tight sm:text-5xl ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Real-time Crypto Forecasting with Deep Analytics.
            </h1>
            <p className={`max-w-2xl text-lg ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>
              Track the market like CoinMarketCap, jump into coin pages for one-click
              analytics and visualizations using hourly datasets.
            </p>
            <div className="flex flex-wrap gap-3">
              <a
                href="#markets"
                className="rounded-full bg-accent px-5 py-3 text-sm font-semibold text-slate-900 shadow-lg transition hover:bg-accent-strong"
              >
                Explore markets
              </a>
              <Link
                to="/coin/bitcoin"
                className={`rounded-full border px-5 py-3 text-sm font-semibold transition hover:border-accent ${isDark ? 'border-white/10 text-white' : 'border-gray-300 text-gray-700 hover:text-teal-700'}`}
              >
                Open Bitcoin analytics
              </Link>
            </div>
            {/* <div className="grid gap-3 sm:grid-cols-3">
              {["1y of daily OHLC", "30d of hourly candles", "WebSocket live tickers"].map((text) => (
                <div key={text} className="glass card-border rounded-xl px-4 py-3 text-sm text-slate-300">
                  {text}
                </div>
              ))}
            </div> */}
          </div>
          <div className="flex-1">
            <div className="glass card-border rounded-3xl p-5">
              <div className="mb-4 flex items-center justify-between">
                <span className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Live watchlist</span>
                <span className={`rounded-full px-3 py-1 text-xs ${isDark ? 'bg-emerald-500/10 text-emerald-300' : 'bg-teal-500/10 text-teal-600'}`}>
                  INR + USD
                </span>
              </div>
              <div className="space-y-3">
                {COINS.slice(0, 5).map((coin) => (
                  <div
                    key={coin.symbol}
                    className={`flex items-center justify-between rounded-2xl border px-4 py-3 ${isDark ? 'border-white/5 bg-white/5' : 'border-gray-200 bg-gray-50'}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`relative h-8 w-8 rounded-lg overflow-hidden ${isDark ? 'bg-gradient-to-br from-white/10 to-white/5' : 'bg-gray-100'}`}>
                        <img
                          src={coin.image}
                          alt={coin.name}
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                      </div>
                      <div>
                        <div className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{coin.name}</div>
                        <div className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          {formatCurrency(tickers[coin.symbol]?.price, "USD")}
                        </div>
                      </div>
                    </div>
                    <div className={`text-right text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                      {formatCurrency(
                        tickers[coin.symbol]?.price
                          ? tickers[coin.symbol].price * inrRate
                          : undefined,
                        "INR"
                      )}
                      <div
                        className={
                          (tickers[coin.symbol]?.change ?? 0) >= 0
                            ? "text-emerald-400"
                            : "text-rose-400"
                        }
                      >
                        {(tickers[coin.symbol]?.change ?? 0).toFixed(2)}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="markets" className="mx-auto max-w-6xl px-4 py-14">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-accent">Markets</p>
            <h2 className={`text-2xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Multi-asset coverage</h2>
            <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
              Live USD and INR pricing. Click any asset to open analysis.
            </p>
          </div>
          <Link
            to="/coin/ethereum"
            className={`hidden rounded-full border px-4 py-2 text-sm font-semibold transition hover:border-accent sm:block ${isDark ? 'border-white/10 text-white' : 'border-gray-300 text-gray-700'}`}
          >
            Open a coin page
          </Link>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {COINS.map((coin) => (
            <MarketCard
              key={coin.symbol}
              coin={coin}
              ticker={tickers[coin.symbol]}
              inrRate={inrRate}
            />
          ))}
        </div>
      </section>

      <section id="insights" className={`relative overflow-hidden border-y ${isDark ? 'border-white/5 bg-gradient-to-b from-[#070c1a] to-[#0a1020]' : 'border-gray-200 bg-gradient-to-b from-gray-50 to-white'}`}>
        {/* Animated background blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-1/4 w-[400px] h-[400px] bg-emerald-500/15 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-0 left-1/3 w-[500px] h-[500px] bg-accent/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1.5s' }}></div>
        </div>

        <div className="relative mx-auto max-w-6xl px-4 py-16">
          <div className="text-center mb-12">
            <p className="text-sm uppercase tracking-[0.2em] text-accent">Powerful Insights</p>
            <h3 className={`text-3xl font-semibold mt-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>AI-Powered Market Intelligence</h3>
            <p className={`mt-3 max-w-2xl mx-auto ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
              Our platform combines deep learning with real-time market data to deliver accurate price predictions and comprehensive analysis tools.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <div className="glass card-border rounded-2xl p-6 group hover:border-accent transition-all duration-300">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div className={`text-lg font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>LSTM Neural Networks</div>
              <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                Multi-layer LSTM models trained on historical price patterns to generate accurate 1-30 day forecasts.
              </p>
            </div>
            <div className="glass card-border rounded-2xl p-6 group hover:border-accent transition-all duration-300">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-500/5 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                </svg>
              </div>
              <div className={`text-lg font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>Technical Indicators</div>
              <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                EMA, SMA, Bollinger Bands, and RSI overlays to validate predictions with proven technical analysis.
              </p>
            </div>
            <div className="glass card-border rounded-2xl p-6 group hover:border-accent transition-all duration-300">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-500/5 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div className={`text-lg font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>Real-Time Streaming</div>
              <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                Live WebSocket connections to Binance for instant price updates and 24h volume tracking.
              </p>
            </div>
            <div className="glass card-border rounded-2xl p-6 group hover:border-accent transition-all duration-300">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-500/5 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div className={`text-lg font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>Model Caching</div>
              <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                Smart model persistence delivers instant predictions using cached models, retrain only when needed.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="mx-auto max-w-6xl px-4 py-16">
        <div className="text-center mb-12">
          <p className="text-sm uppercase tracking-[0.2em] text-accent">How It Works</p>
          <h3 className={`text-3xl font-semibold mt-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>From Data to Predictions</h3>
          <p className={`mt-3 max-w-2xl mx-auto ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
            Our end-to-end pipeline transforms raw market data into actionable forecasts in milliseconds.
          </p>
        </div>
        <div className="relative">
          {/* Connection line for desktop */}
          <div className="hidden lg:block absolute top-16 left-[10%] right-[10%] h-0.5 bg-gradient-to-r from-emerald-500/50 via-blue-500/50 to-purple-500/50"></div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            <div className="relative">
              <div className="glass card-border rounded-2xl p-6 text-center hover:border-emerald-500/50 transition-all duration-300">
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center mx-auto mb-4 text-emerald-400 font-bold">1</div>
                <div className={`text-lg font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>Data Collection</div>
                <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                  Historical OHLCV data from Binance API spanning daily and hourly timeframes for comprehensive analysis.
                </p>
              </div>
            </div>
            <div className="relative">
              <div className="glass card-border rounded-2xl p-6 text-center hover:border-blue-500/50 transition-all duration-300">
                <div className="w-10 h-10 rounded-full bg-blue-500/20 border-2 border-blue-500 flex items-center justify-center mx-auto mb-4 text-blue-400 font-bold">2</div>
                <div className={`text-lg font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>Feature Engineering</div>
                <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                  Moving averages, volatility metrics, and price momentum indicators engineered as model inputs.
                </p>
              </div>
            </div>
            <div className="relative">
              <div className="glass card-border rounded-2xl p-6 text-center hover:border-purple-500/50 transition-all duration-300">
                <div className="w-10 h-10 rounded-full bg-purple-500/20 border-2 border-purple-500 flex items-center justify-center mx-auto mb-4 text-purple-400 font-bold">3</div>
                <div className={`text-lg font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>LSTM Training</div>
                <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                  Deep learning models with dropout layers trained on 80/20 splits with early stopping optimization.
                </p>
              </div>
            </div>
            <div className="relative">
              <div className="glass card-border rounded-2xl p-6 text-center hover:border-amber-500/50 transition-all duration-300">
                <div className="w-10 h-10 rounded-full bg-amber-500/20 border-2 border-amber-500 flex items-center justify-center mx-auto mb-4 text-amber-400 font-bold">4</div>
                <div className={`text-lg font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>Prediction Delivery</div>
                <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                  FastAPI backend serves forecasts via REST endpoints with interactive visualizations in React.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={`relative border-t ${isDark ? 'border-white/5 bg-gradient-to-b from-[#070c1a] to-[#040810]' : 'border-gray-200 bg-gradient-to-b from-gray-100 to-gray-50'}`}>
        {/* Subtle gradient accent */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent/50 to-transparent"></div>

        <div className="mx-auto max-w-6xl px-4 py-12">
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {/* Brand Column */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-emerald-500 flex items-center justify-center">
                  <svg className="w-6 h-6 text-slate-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <span className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Crypto Pulse</span>
              </div>
              <p className={`text-sm leading-relaxed ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                AI-powered cryptocurrency price predictions using advanced LSTM neural networks and real-time market analysis.
              </p>
              <div className="flex items-center gap-3">
                <a href="#" className={`w-9 h-9 rounded-lg border flex items-center justify-center hover:text-accent hover:border-accent transition-all ${isDark ? 'bg-white/5 border-white/10 text-slate-400' : 'bg-gray-100 border-gray-200 text-gray-500'}`}>
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z" /></svg>
                </a>
                <a href="#" className={`w-9 h-9 rounded-lg border flex items-center justify-center hover:text-accent hover:border-accent transition-all ${isDark ? 'bg-white/5 border-white/10 text-slate-400' : 'bg-gray-100 border-gray-200 text-gray-500'}`}>
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" /></svg>
                </a>
                <a href="#" className={`w-9 h-9 rounded-lg border flex items-center justify-center hover:text-accent hover:border-accent transition-all ${isDark ? 'bg-white/5 border-white/10 text-slate-400' : 'bg-gray-100 border-gray-200 text-gray-500'}`}>
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>
                </a>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className={`text-sm font-semibold uppercase tracking-wider mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Quick Links</h4>
              <ul className="space-y-3">
                <li><a href="#markets" className={`text-sm hover:text-accent transition-colors ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Markets</a></li>
                <li><Link to="/coin/bitcoin" className={`text-sm hover:text-accent transition-colors ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Bitcoin Analysis</Link></li>
                <li><Link to="/coin/ethereum" className={`text-sm hover:text-accent transition-colors ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Ethereum Analysis</Link></li>
                <li><Link to="/dashboard" className={`text-sm hover:text-accent transition-colors ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Training Dashboard</Link></li>
                <li><Link to="/about" className={`text-sm hover:text-accent transition-colors ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>About Us</Link></li>
              </ul>
            </div>

            {/* Resources */}
            <div>
              <h4 className={`text-sm font-semibold uppercase tracking-wider mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Resources</h4>
              <ul className="space-y-3">
                <li><a href="#how-it-works" className={`text-sm hover:text-accent transition-colors ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>How It Works</a></li>
                <li><a href="#insights" className={`text-sm hover:text-accent transition-colors ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>AI Insights</a></li>
                <li><Link to="/history" className={`text-sm hover:text-accent transition-colors ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Forecast History</Link></li>
                <li><Link to="/profile" className={`text-sm hover:text-accent transition-colors ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>My Profile</Link></li>
              </ul>
            </div>

            {/* Supported Coins */}
            <div>
              <h4 className={`text-sm font-semibold uppercase tracking-wider mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Supported Coins</h4>
              <div className="flex flex-wrap gap-2">
                {COINS.slice(0, 8).map((coin) => (
                  <Link
                    key={coin.symbol}
                    to={`/coin/${coin.slug}`}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs hover:text-accent hover:border-accent transition-all ${isDark ? 'bg-white/5 border-white/10 text-slate-400' : 'bg-gray-100 border-gray-200 text-gray-500'}`}
                  >
                    <img src={coin.image} alt={coin.ticker} className="w-4 h-4 rounded" />
                    {coin.ticker}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className={`mt-12 pt-8 border-t ${isDark ? 'border-white/5' : 'border-gray-200'}`}>
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="text-sm text-slate-500">
                © {new Date().getFullYear()} CryptoPulse. Built with ❤️ by Infosys Springboard Batch 6.
              </div>
              <div className="flex items-center gap-6 text-sm text-slate-500">
                <a href="#" className="hover:text-accent transition-colors">Privacy Policy</a>
                <a href="#" className="hover:text-accent transition-colors">Terms of Service</a>
                <a href="#" className="hover:text-accent transition-colors">Contact</a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}

