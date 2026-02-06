import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { api } from "../services/api";
import { slugToSymbol, COINS } from "../constants/coins";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  BarChart,
  Bar,
  LabelList,
} from "recharts";

export default function CoinTraining() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const coinSymbol = slugToSymbol[slug];
  const coin = COINS.find((c) => c.symbol === coinSymbol) || { name: slug, image: "" };
  const [meta, setMeta] = useState(null);

  // Default MI scores provided by the user — used when server-side MI is not available
  const DEFAULT_MI_SCORES = [
    { feature: 'Close', score: 4.500254 },
    { feature: 'High', score: 4.332384 },
    { feature: 'Low', score: 4.297791 },
    { feature: 'Open', score: 4.157018 },
    { feature: 'MA_12', score: 3.791551 },
    { feature: 'MA_24', score: 3.535931 },
    { feature: 'Price_Range', score: 0.458401 },
    { feature: 'Volatility', score: 0.438932 },
    { feature: 'Volume', score: 0.352669 },
    { feature: 'Price_Change', score: 0.196655 },
    { feature: 'Returns', score: 0.041679 },
  ];

  useEffect(() => {
    async function load() {
      try {
        const { data } = await api.get(`/dashboard/metadata/${coinSymbol}`);
        // prefer hourly metadata, then daily
        let match = data.hourly || data.daily || null;
        // legacy compatibility: if server returned {items: [...]}
        if (!match && data.items) {
          match = (data.items || []).find((i) => i.coin === coinSymbol) || null;
        }

        // If we received raw training metadata (has `metrics`), map it into the UI shape
        if (match && match.metrics) {
          const raw = match;
          const metrics_md = raw.metrics || {};
          const train_period = raw.training_period || raw.dataset || {};
          const test_period = raw.testing_period || raw.dataset || {};

          const per_rmse = metrics_md.rmse || [];
          const per_mae = metrics_md.mae || [];
          const per_r2 = metrics_md.r2_by_horizon || [];

          // Use average values for the summary cards (not first element of per-horizon arrays)
          const train_rmse = per_rmse.length ? per_rmse[0] : metrics_md.avg_rmse ?? null;
          const train_mae = per_mae.length ? per_mae[0] : metrics_md.avg_mae ?? null;
          const train_r2 = metrics_md.r2_training ?? null;

          const test_rmse = metrics_md.avg_rmse ?? null;
          const test_mae = metrics_md.avg_mae ?? null;
          const test_r2 = metrics_md.r2_testing ?? (metrics_md.avg_r2 ?? null);

          const metrics = {
            train: {
              rmse: train_rmse,
              mae: train_mae,
              r2: train_r2,
            },
            test: {
              rmse: test_rmse,
              mae: test_mae,
              r2: test_r2,
            },
          };

          if (per_rmse.length || per_mae.length || per_r2.length) {
            metrics.test.per_horizon = { rmse: per_rmse, mae: per_mae, r2: per_r2 };
            metrics.train.per_horizon = { rmse: per_rmse, mae: per_mae, r2: per_r2 };
          }

          const architecture = { layers: [] };
          const lstm_units = raw.model_config?.lstm_units || [];
          lstm_units.forEach((u) => architecture.layers.push({ type: "LSTM", units: u }));
          // include full model_config and callbacks for display
          architecture.model_config = raw.model_config || {};
          architecture.callbacks = raw.callbacks || {};

          const metaObj = {
            coin: coinSymbol,
            train_range: `${train_period.start_date || ""} - ${train_period.end_date || ""}`,
            test_range: `${test_period.start_date || ""} - ${test_period.end_date || ""}`,
            mi_scores: raw.mi_scores || [],
            feature_importance: raw.feature_importance || [],
            feature_list: raw.feature_list || [],
            metrics,
            architecture,
          };

          setMeta(metaObj);
          return;
        }

        setMeta(match || null);
      } catch (err) {
        // fallback to old bulk endpoint
        try {
          const { data } = await api.get("/dashboard/metadata");
          const match = (data.items || []).find((i) => i.coin === coinSymbol);
          setMeta(match || null);
        } catch (e) {
          setMeta(null);
        }
      }
    }
    load();
  }, [coinSymbol]);

  const horizonData = useMemo(() => {
    if (!meta?.metrics?.test?.per_horizon) return [];
    const per = meta.metrics.test.per_horizon;
    const n = Math.max(per.rmse.length, per.mae.length, per.r2.length);
    const arr = [];
    for (let i = 0; i < n; i++) {
      arr.push({ h: i + 1, rmse: per.rmse[i] || 0, mae: per.mae[i] || 0, r2: per.r2[i] || 0 });
    }
    return arr;
  }, [meta]);

  const miData = useMemo(() => {
    const src = (meta?.mi_scores && meta.mi_scores.length) ? meta.mi_scores.slice() : DEFAULT_MI_SCORES.slice();
    return src.sort((a, b) => b.score - a.score);
  }, [meta]);

  // formatting helpers
  const fmt = (v, digits = 4) => (typeof v === "number" ? v.toFixed(digits) : "—");
  const fmtPerc = (v) => (typeof v === "number" ? (v * 100).toFixed(2) + "%" : "—");

  // Helper to render model config nicely
  const renderConfigItem = (label, value) => {
    if (value === undefined || value === null) return null;
    let displayValue = value;
    if (Array.isArray(value)) {
      displayValue = value.join(" → ");
    } else if (typeof value === "boolean") {
      displayValue = value ? "Yes" : "No";
    } else if (typeof value === "object") {
      displayValue = JSON.stringify(value);
    }
    return (
      <div key={label} className="flex justify-between items-center py-2 border-b border-white/5 last:border-b-0">
        <span className="text-slate-400 text-sm">{label}</span>
        <span className="text-white font-medium text-sm">{String(displayValue)}</span>
      </div>
    );
  };

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      {/* Header with coin info */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          {coin.image && <img src={coin.image} alt="" className="h-10 w-10 rounded" />}
          <div>
            <h1 className="text-2xl font-semibold text-white">{coin.name} Training & Testing</h1>
            <p className="text-sm text-slate-400">Transparent metrics and feature insights</p>
          </div>
        </div>
        <Link
          to="/"
          className="rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:border-accent"
        >
          ← Back to markets
        </Link>
      </div>

      {/* Section selector: Historical / Training / Forecast */}
      <div className="mt-6 flex items-center gap-3">
        <button
          onClick={() => navigate(`/coin/${slug}`)}
          className="rounded-full px-4 py-2 text-sm font-medium bg-white/5 text-slate-300 hover:bg-white/10 transition-colors"
        >
          Historical Analysis
        </button>
        <button
          className="rounded-full px-4 py-2 text-sm font-medium bg-accent text-slate-900"
        >
          Training &amp; Testing
        </button>
        <button
          onClick={() => navigate(`/coin/${slug}/forecast`)}
          className="rounded-full px-4 py-2 text-sm font-medium bg-white/5 text-slate-300 hover:bg-white/10 transition-colors"
        >
          Forecasting
        </button>
      </div>

      <div className="mt-6 space-y-4">
        {meta ? (
          <>
            {/* Date Ranges */}
            <div className="glass card-border rounded-3xl p-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-slate-400 uppercase tracking-wider">Training Period</div>
                  <div className="text-white text-lg font-medium mt-1">{meta.train_range}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-400 uppercase tracking-wider">Testing Period</div>
                  <div className="text-white text-lg font-medium mt-1">{meta.test_range}</div>
                </div>
              </div>
            </div>

            {/* Metrics Cards */}
            <div className="glass card-border rounded-3xl p-5">
              <div className="text-sm font-semibold text-white mb-4">Model Performance Metrics</div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-rose-500/10 to-transparent p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 rounded-full bg-rose-500"></div>
                    <div className="text-xs text-slate-400 uppercase tracking-wider">RMSE</div>
                  </div>
                  <div className="text-sm text-slate-300">Train: {fmt(meta.metrics?.train?.rmse)}</div>
                  <div className="text-2xl font-bold text-white mt-1">Test: {fmt(meta.metrics?.test?.rmse, 4)}</div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-blue-500/10 to-transparent p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                    <div className="text-xs text-slate-400 uppercase tracking-wider">MAE</div>
                  </div>
                  <div className="text-sm text-slate-300">Train: {fmt(meta.metrics?.train?.mae)}</div>
                  <div className="text-2xl font-bold text-white mt-1">Test: {fmt(meta.metrics?.test?.mae, 4)}</div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-emerald-500/10 to-transparent p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                    <div className="text-xs text-slate-400 uppercase tracking-wider">R² Score</div>
                  </div>
                  <div className="text-sm text-slate-300">Train: {fmtPerc(meta.metrics?.train?.r2)}</div>
                  <div className="text-2xl font-bold text-white mt-1">Test: {fmtPerc(meta.metrics?.test?.r2)}</div>
                </div>
              </div>
            </div>

            {/* Mutual Information Chart */}
            <div className="glass card-border rounded-3xl p-5">
              <div className="text-sm font-semibold text-white mb-4">Mutual Information & Feature Importance</div>
              <div style={{ width: "100%", height: 360 }}>
                <ResponsiveContainer width="100%" height={360}>
                  <BarChart data={miData} layout="vertical" margin={{ top: 8, right: 8, left: 24, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.06} />
                    <XAxis type="number" tickFormatter={(v) => v.toFixed(3)} />
                    <YAxis dataKey="feature" type="category" width={180} tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(v) => v.toFixed(3)} />
                    <Bar dataKey="score" fill="#34D399" radius={[2, 2, 2, 2]} barSize={18}>
                      <LabelList dataKey="score" formatter={(v) => v.toFixed(3)} position="right" />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Per-horizon Line Chart */}
            <div className="glass card-border rounded-3xl p-5">
              <div className="text-sm font-semibold text-white mb-4">Per-horizon Test Metrics</div>
              {horizonData.length ? (
                <div style={{ width: "100%", height: 420 }}>
                  <ResponsiveContainer width="100%" height={420}>
                    <LineChart data={horizonData} margin={{ top: 8, right: 40, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.06} />
                      <XAxis dataKey="h" label={{ value: "Horizon (hours/days)", position: "bottom", offset: -5 }} />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" domain={[0, 1]} tickFormatter={(v) => (v * 100).toFixed(0) + '%'} />
                      <Tooltip formatter={(value, name) => name === 'r2' ? fmtPerc(value) : fmt(value)} />
                      <Legend />
                      <Line yAxisId="left" type="monotone" dataKey="rmse" stroke="#ef4444" dot={false} name="RMSE" strokeWidth={2} />
                      <Line yAxisId="left" type="monotone" dataKey="mae" stroke="#3b82f6" dot={false} name="MAE" strokeWidth={2} />
                      <Line yAxisId="right" type="monotone" dataKey="r2" stroke="#10b981" strokeDasharray="3 3" dot={false} name="R²" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="text-sm text-slate-400 text-center py-8">No per-horizon data available.</div>
              )}
            </div>

            {/* Per-horizon R² Bar Chart */}
            {horizonData.length > 0 && (
              <div className="glass card-border rounded-3xl p-5">
                <div className="text-sm font-semibold text-white mb-4">Per-horizon R² Score</div>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={horizonData} margin={{ top: 6, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.06} />
                    <XAxis dataKey="h" label={{ value: "Horizon", position: "bottom", offset: -5 }} />
                    <YAxis domain={[0, 1]} tickFormatter={(v) => (v * 100).toFixed(0) + '%'} />
                    <Tooltip formatter={(v) => (v * 100).toFixed(2) + '%'} />
                    <Bar dataKey="r2" fill="#10b981" radius={[6, 6, 6, 6]} name="R² Score" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

          </>
        ) : (
          <div className="glass card-border rounded-3xl p-8 text-center">
            <div className="text-lg text-slate-300">Loading training metadata...</div>
            <div className="text-sm text-slate-400 mt-2">Please wait while we fetch the model information</div>
          </div>
        )}
      </div>
    </main>
  );
}
