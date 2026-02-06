import { useEffect, useState } from "react";
import { api } from "../services/api";
import { useTheme } from "../context/ThemeContext";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  LineChart,
  Line,
  Legend,
} from "recharts";

// Helper to get first element of array or value
const getFirstHorizon = (perHorizon, key) => {
  if (perHorizon && perHorizon[key] && Array.isArray(perHorizon[key]) && perHorizon[key].length > 0) {
    return perHorizon[key][0];
  }
  return null;
};

// Helper to get average of array
const getAverage = (arr) => {
  if (!Array.isArray(arr) || arr.length === 0) return null;
  return arr.reduce((sum, val) => sum + val, 0) / arr.length;
};

// Format number based on magnitude
const formatMetric = (value, decimals = 4) => {
  if (value === null || value === undefined) return "—";
  if (Math.abs(value) < 0.01) return value.toFixed(6);
  if (Math.abs(value) < 1) return value.toFixed(4);
  if (Math.abs(value) < 100) return value.toFixed(2);
  return value.toFixed(0);
};

// Metric Card Component
const MetricCard = ({ title, trainValue, testValue, unit = "", icon, colorClass, isDark }) => (
  <div className={`rounded-2xl p-5 transition-all duration-200 ${isDark
    ? "bg-white/5 border border-white/10 hover:border-white/20"
    : "bg-white border border-slate-200 shadow-sm hover:shadow-md"
    }`}>
    <div className="flex items-start justify-between mb-3">
      <div className={`p-2 rounded-xl ${colorClass}`}>
        {icon}
      </div>
      <span className={`text-xs font-medium px-2 py-1 rounded-full ${isDark ? "bg-white/10 text-slate-300" : "bg-slate-100 text-slate-600"
        }`}>
        {title}
      </span>
    </div>

    <div className="space-y-3">
      {/* Training */}
      <div>
        <div className={`text-xs uppercase tracking-wide mb-1 ${isDark ? "text-slate-500" : "text-slate-400"}`}>
          Training
        </div>
        <div className={`text-xl font-bold ${isDark ? "text-emerald-400" : "text-emerald-600"}`}>
          {formatMetric(trainValue)}{unit}
        </div>
      </div>

      {/* Testing */}
      <div className={`pt-3 border-t ${isDark ? "border-white/10" : "border-slate-100"}`}>
        <div className={`text-xs uppercase tracking-wide mb-1 ${isDark ? "text-slate-500" : "text-slate-400"}`}>
          Testing
        </div>
        <div className={`text-xl font-bold ${isDark ? "text-blue-400" : "text-blue-600"}`}>
          {formatMetric(testValue)}{unit}
        </div>
      </div>
    </div>
  </div>
);

// Architecture Card Component
const ArchitectureCard = ({ architecture, isDark }) => {
  if (!architecture) return null;

  const { model_config, callbacks } = architecture;

  return (
    <div className={`rounded-2xl p-5 ${isDark
      ? "bg-gradient-to-br from-purple-500/10 to-indigo-500/10 border border-purple-500/20"
      : "bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200"
      }`}>
      <div className="flex items-center gap-2 mb-4">
        <div className={`p-2 rounded-xl ${isDark ? "bg-purple-500/20" : "bg-purple-100"}`}>
          <svg className={`w-5 h-5 ${isDark ? "text-purple-400" : "text-purple-600"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
          </svg>
        </div>
        <span className={`text-sm font-semibold ${isDark ? "text-purple-300" : "text-purple-700"}`}>
          Model Architecture
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className={`rounded-xl p-3 ${isDark ? "bg-white/5" : "bg-white/80"}`}>
          <div className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>LSTM Units</div>
          <div className={`font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>
            {model_config?.lstm_units?.join(" → ") || "—"}
          </div>
        </div>
        <div className={`rounded-xl p-3 ${isDark ? "bg-white/5" : "bg-white/80"}`}>
          <div className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>Optimizer</div>
          <div className={`font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>
            {model_config?.optimizer || "—"}
          </div>
        </div>
        <div className={`rounded-xl p-3 ${isDark ? "bg-white/5" : "bg-white/80"}`}>
          <div className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>Learning Rate</div>
          <div className={`font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>
            {model_config?.learning_rate || "—"}
          </div>
        </div>
        <div className={`rounded-xl p-3 ${isDark ? "bg-white/5" : "bg-white/80"}`}>
          <div className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>Dropout</div>
          <div className={`font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>
            {model_config?.dropout ? `${(model_config.dropout * 100).toFixed(0)}%` : "—"}
          </div>
        </div>
      </div>

      {callbacks && (
        <div className={`mt-3 pt-3 border-t ${isDark ? "border-white/10" : "border-purple-200"}`}>
          <div className="flex flex-wrap gap-2">
            {callbacks.early_stopping && (
              <span className={`text-xs px-2 py-1 rounded-full ${isDark ? "bg-amber-500/20 text-amber-300" : "bg-amber-100 text-amber-700"
                }`}>
                Early Stopping (patience: {callbacks.early_stopping.patience})
              </span>
            )}
            {callbacks.reduce_lr_on_plateau && (
              <span className={`text-xs px-2 py-1 rounded-full ${isDark ? "bg-blue-500/20 text-blue-300" : "bg-blue-100 text-blue-700"
                }`}>
                LR Scheduler (factor: {callbacks.reduce_lr_on_plateau.factor})
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Per-Horizon Chart Component
const HorizonChart = ({ data, isDark }) => {
  if (!data || !data.rmse || data.rmse.length === 0) return null;

  const chartData = data.rmse.map((_, idx) => ({
    horizon: `${idx + 1}h`,
    RMSE: data.rmse[idx],
    MAE: data.mae[idx],
    R2: data.r2[idx],
  }));

  return (
    <div className={`rounded-2xl p-5 ${isDark
      ? "bg-white/5 border border-white/10"
      : "bg-white border border-slate-200 shadow-sm"
      }`}>
      <div className="flex items-center justify-between mb-4">
        <span className={`text-sm font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>
          Performance by Horizon
        </span>
        <span className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
          {chartData.length} horizons
        </span>
      </div>

      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}
            />
            <XAxis
              dataKey="horizon"
              tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 10 }}
              interval={3}
            />
            <YAxis
              tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 10 }}
              width={50}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: isDark ? '#1e293b' : '#ffffff',
                border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e2e8f0',
                borderRadius: '12px',
                color: isDark ? '#fff' : '#1e293b'
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="RMSE"
              stroke="#14b8a6"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="MAE"
              stroke="#f59e0b"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default function Dashboard() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedCoin, setExpandedCoin] = useState(null);
  const { isDark } = useTheme();

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const { data } = await api.get("/dashboard/metadata");
        if (!cancelled) setItems(data.items || []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      {/* Header */}
      <div className={`rounded-3xl p-6 mb-8 ${isDark
        ? "bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20"
        : "bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200"
        }`}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className={`text-2xl font-bold ${isDark ? "text-white" : "text-slate-900"}`}>
              Training & Testing Dashboard
            </h1>
            <p className={`text-sm mt-1 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
              Comprehensive Metrics, Models Transparency
            </p>
          </div>
          <div className="flex items-center gap-3">
            {loading && (
              <div className={`flex items-center gap-2 px-3 py-2 rounded-full ${isDark ? "bg-white/10" : "bg-white"
                }`}>
                <svg className="w-4 h-4 animate-spin text-emerald-500" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span className={`text-sm ${isDark ? "text-slate-300" : "text-slate-600"}`}>Loading...</span>
              </div>
            )}
            <div className={`px-3 py-2 rounded-full text-sm font-medium ${isDark
              ? "bg-emerald-500/20 text-emerald-300"
              : "bg-emerald-100 text-emerald-700"
              }`}>
              {items.length} Models
            </div>
          </div>
        </div>
      </div>

      {/* Coin Cards */}
      <div className="space-y-6">
        {items.map((item) => {
          const trainPerHorizon = item.metrics?.train?.per_horizon;
          const testPerHorizon = item.metrics?.test?.per_horizon;

          // Training: first element of each array
          const trainRmse = getFirstHorizon(trainPerHorizon, 'rmse');
          const trainMae = getFirstHorizon(trainPerHorizon, 'mae');
          const trainR2 = getFirstHorizon(trainPerHorizon, 'r2');

          // Testing: average for RMSE/MAE, but use the direct test value for R2
          const testRmse = testPerHorizon?.rmse ? getAverage(testPerHorizon.rmse) : item.metrics?.test?.rmse;
          const testMae = testPerHorizon?.mae ? getAverage(testPerHorizon.mae) : item.metrics?.test?.mae;
          const testR2 = item.metrics?.test?.r2; // Use direct test R2 value, not average

          const isExpanded = expandedCoin === item.coin;

          return (
            <div
              key={item.coin}
              className={`rounded-3xl overflow-hidden transition-all duration-300 ${isDark
                ? "bg-white/[0.03] border border-white/10 hover:border-white/20"
                : "bg-white border border-slate-200 shadow-lg hover:shadow-xl"
                }`}
            >
              {/* Coin Header */}
              <div
                className={`p-6 cursor-pointer ${isDark ? "hover:bg-white/5" : "hover:bg-slate-50"
                  }`}
                onClick={() => setExpandedCoin(isExpanded ? null : item.coin)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg ${isDark
                      ? "bg-gradient-to-br from-emerald-500/20 to-teal-500/20 text-emerald-400"
                      : "bg-gradient-to-br from-emerald-100 to-teal-100 text-emerald-600"
                      }`}>
                      {item.coin.replace('USDT', '').slice(0, 3)}
                    </div>
                    <div>
                      <h2 className={`text-xl font-bold ${isDark ? "text-white" : "text-slate-900"}`}>
                        {item.coin}
                      </h2>
                      <div className={`flex items-center gap-3 mt-1 text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                        <span className="flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          Train: {item.train_range?.split(' - ')[0]?.split(' ')[0] || "—"}
                        </span>
                        <span>→</span>
                        <span>Test: {item.test_range?.split(' - ')[1]?.split(' ')[0] || "—"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {/* Quick Stats Preview */}
                    <div className="hidden sm:flex items-center gap-4">
                      <div className="text-right">
                        <div className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>Test R²</div>
                        <div className={`font-bold ${testR2 > 0.9
                          ? (isDark ? "text-emerald-400" : "text-emerald-600")
                          : testR2 > 0.8
                            ? (isDark ? "text-amber-400" : "text-amber-600")
                            : (isDark ? "text-rose-400" : "text-rose-600")
                          }`}>
                          {formatMetric(testR2)}
                        </div>
                      </div>
                    </div>

                    {/* Expand Icon */}
                    <div className={`p-2 rounded-xl transition-transform duration-200 ${isDark ? "bg-white/5" : "bg-slate-100"
                      } ${isExpanded ? "rotate-180" : ""}`}>
                      <svg className={`w-5 h-5 ${isDark ? "text-slate-400" : "text-slate-500"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              {/* Expanded Content */}
              {isExpanded && (
                <div className={`px-6 pb-6 space-y-6 ${isDark ? "border-t border-white/10" : "border-t border-slate-100"}`}>
                  {/* Metrics Grid */}
                  <div className="grid gap-4 sm:grid-cols-3 pt-6">
                    <MetricCard
                      title="RMSE"
                      trainValue={trainRmse}
                      testValue={testRmse}
                      icon={
                        <svg className={`w-5 h-5 ${isDark ? "text-emerald-400" : "text-emerald-600"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      }
                      colorClass={isDark ? "bg-emerald-500/20" : "bg-emerald-100"}
                      isDark={isDark}
                    />
                    <MetricCard
                      title="MAE"
                      trainValue={trainMae}
                      testValue={testMae}
                      icon={
                        <svg className={`w-5 h-5 ${isDark ? "text-amber-400" : "text-amber-600"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                      }
                      colorClass={isDark ? "bg-amber-500/20" : "bg-amber-100"}
                      isDark={isDark}
                    />
                    <MetricCard
                      title="R² Score"
                      trainValue={trainR2}
                      testValue={testR2}
                      icon={
                        <svg className={`w-5 h-5 ${isDark ? "text-blue-400" : "text-blue-600"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      }
                      colorClass={isDark ? "bg-blue-500/20" : "bg-blue-100"}
                      isDark={isDark}
                    />
                  </div>

                  {/* Architecture */}
                  <ArchitectureCard architecture={item.architecture} isDark={isDark} />

                  {/* Per-Horizon Chart */}
                  <HorizonChart data={testPerHorizon} isDark={isDark} />
                </div>
              )}
            </div>
          );
        })}

        {!items.length && !loading && (
          <div className={`text-center py-12 rounded-3xl ${isDark ? "bg-white/5 border border-white/10" : "bg-white border border-slate-200"
            }`}>
            <svg className={`w-12 h-12 mx-auto mb-4 ${isDark ? "text-slate-600" : "text-slate-300"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className={`text-lg font-medium ${isDark ? "text-slate-400" : "text-slate-600"}`}>
              No model metadata available yet
            </p>
            <p className={`text-sm mt-1 ${isDark ? "text-slate-500" : "text-slate-500"}`}>
              Train some models to see their performance metrics here
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
