import { useEffect, useState, useCallback } from "react";
import { api } from "../services/api";

const AVAILABLE_COINS = [
  { value: "", label: "All Coins" },
  { value: "BTCUSDT", label: "Bitcoin (BTC)" },
  { value: "ETHUSDT", label: "Ethereum (ETH)" },
  { value: "BNBUSDT", label: "Binance Coin (BNB)" },
  { value: "SOLUSDT", label: "Solana (SOL)" },
  { value: "XRPUSDT", label: "Ripple (XRP)" },
  { value: "DOGEUSDT", label: "Dogecoin (DOGE)" },
  { value: "ADAUSDT", label: "Cardano (ADA)" },
];

const COIN_NAMES = {
  BTCUSDT: "Bitcoin",
  ETHUSDT: "Ethereum",
  BNBUSDT: "BNB",
  SOLUSDT: "Solana",
  XRPUSDT: "XRP",
  DOGEUSDT: "Dogecoin",
  ADAUSDT: "Cardano",
};

export default function History() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [stats, setStats] = useState(null);

  // Filters
  const [selectedCoin, setSelectedCoin] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [verifiedOnly, setVerifiedOnly] = useState(false);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedCoin) params.append("coin", selectedCoin);
      if (startDate) params.append("start_date", startDate);
      if (endDate) params.append("end_date", endDate);
      if (verifiedOnly) params.append("verified_only", "true");

      const queryString = params.toString();
      const url = `/forecast/history${queryString ? `?${queryString}` : ""}`;

      const { data } = await api.get(url);
      setItems(data.items || []);
    } catch (error) {
      console.error("Failed to load history:", error);
    } finally {
      setLoading(false);
    }
  }, [selectedCoin, startDate, endDate, verifiedOnly]);

  const loadStats = async () => {
    try {
      const { data } = await api.get("/forecast/history/stats");
      setStats(data);
      return data;
    } catch (error) {
      console.error("Failed to load stats:", error);
      return null;
    }
  };

  const verifyEntries = async (showAlert = true) => {
    setVerifying(true);
    try {
      const { data } = await api.post("/forecast/history/verify");
      if (showAlert) {
        if (data.updated > 0) {
          alert(`✓ Successfully verified ${data.updated} forecast entries!`);
        } else {
          alert("No entries to verify. Either all entries are already verified, or horizons haven't ended yet.");
        }
      }
      loadHistory();
      loadStats();
      return data;
    } catch (error) {
      console.error("Failed to verify entries:", error);
      if (showAlert) {
        alert("Failed to verify entries. Please try again.");
      }
      return null;
    } finally {
      setVerifying(false);
    }
  };

  // Auto-verify function that runs silently on page load
  const autoVerifyIfNeeded = async () => {
    try {
      // First check if there are pending entries that can be verified
      const statsData = await loadStats();
      if (statsData && statsData.pending_verification > 0) {
        // Run verification silently (no alerts)
        const result = await verifyEntries(false);
        if (result && result.updated > 0) {
          console.log(`Auto-verified ${result.updated} forecast entries`);
        }
      }
    } catch (error) {
      console.error("Auto-verify failed:", error);
    }
  };

  const deleteEntry = async (entryId) => {
    if (!confirm("Are you sure you want to delete this entry?")) return;
    try {
      await api.delete(`/forecast/history/${entryId}`);
      loadHistory();
      loadStats();
    } catch (error) {
      console.error("Failed to delete entry:", error);
    }
  };

  const clearHistory = async () => {
    if (!confirm("Are you sure you want to clear ALL history? This cannot be undone.")) return;
    try {
      await api.delete("/forecast/history");
      loadHistory();
      loadStats();
    } catch (error) {
      console.error("Failed to clear history:", error);
    }
  };

  useEffect(() => {
    loadHistory();
    // Auto-verify pending entries on page load
    autoVerifyIfNeeded();
  }, [loadHistory]);

  const formatPrice = (price) => {
    if (price == null) return "—";
    return `$${Number(price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatChange = (change, direction) => {
    if (change == null) return "—";
    const isUp = direction === "up";
    return (
      <span className={`flex items-center gap-1 ${isUp ? "text-emerald-400" : "text-red-400"}`}>
        <span>{isUp ? "▲" : "▼"}</span>
        <span>{Math.abs(change).toFixed(2)}%</span>
      </span>
    );
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    // Ensure UTC timestamps are properly parsed by adding 'Z' if not present
    let dateString = dateStr;
    if (!dateString.endsWith('Z') && !dateString.includes('+')) {
      dateString = dateString + 'Z';
    }
    return new Date(dateString).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <main className="mx-auto max-w-7xl px-4 py-10">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            Forecast History
          </h1>
          <p className="text-slate-400 mt-1">Track and verify your cryptocurrency predictions</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={verifyEntries}
            disabled={verifying}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
          >
            {verifying ? (
              <>
                <span className="animate-spin">⟳</span> Verifying...
              </>
            ) : (
              <>✓ Verify Completed</>
            )}
          </button>
          <button
            onClick={clearHistory}
            className="px-4 py-2 rounded-xl bg-red-500/20 text-red-400 font-medium hover:bg-red-500/30 transition-colors"
          >
            Clear All
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="glass card-border rounded-2xl p-4">
            <div className="text-2xl font-bold text-white">{stats.total_forecasts}</div>
            <div className="text-sm text-slate-400">Total Forecasts</div>
          </div>
          <div className="glass card-border rounded-2xl p-4">
            <div className="text-2xl font-bold text-emerald-400">{stats.verified}</div>
            <div className="text-sm text-slate-400">Verified</div>
          </div>
          <div className="glass card-border rounded-2xl p-4">
            <div className="text-2xl font-bold text-amber-400">{stats.pending_verification}</div>
            <div className="text-sm text-slate-400">Pending</div>
          </div>
          <div className="glass card-border rounded-2xl p-4">
            <div className="text-2xl font-bold text-cyan-400">{stats.coins_forecasted?.length || 0}</div>
            <div className="text-sm text-slate-400">Coins Tracked</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="glass card-border rounded-2xl p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[150px]">
            <label className="block text-xs text-slate-400 mb-1">Coin</label>
            <select
              value={selectedCoin}
              onChange={(e) => setSelectedCoin(e.target.value)}
              className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              {AVAILABLE_COINS.map((coin) => (
                <option key={coin.value} value={coin.value}>
                  {coin.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[150px]">
            <label className="block text-xs text-slate-400 mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>
          <div className="flex-1 min-w-[150px]">
            <label className="block text-xs text-slate-400 mb-1">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="verifiedOnly"
              checked={verifiedOnly}
              onChange={(e) => setVerifiedOnly(e.target.checked)}
              className="w-4 h-4 rounded bg-slate-800 border-slate-700 text-cyan-500 focus:ring-cyan-500"
            />
            <label htmlFor="verifiedOnly" className="text-sm text-slate-300">
              Verified only
            </label>
          </div>
          <button
            onClick={() => {
              setSelectedCoin("");
              setStartDate("");
              setEndDate("");
              setVerifiedOnly(false);
            }}
            className="px-4 py-2 rounded-xl bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center py-12">
          <div className="animate-spin text-3xl text-cyan-400">⟳</div>
        </div>
      )}

      {/* History Table */}
      {!loading && items.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs text-slate-400 border-b border-slate-700">
                <th className="pb-3 px-2">Coin</th>
                <th className="pb-3 px-2">Timestamp</th>
                <th className="pb-3 px-2">Horizon</th>
                <th className="pb-3 px-2 text-right">Current Price</th>
                <th className="pb-3 px-2 text-right">Predicted</th>
                <th className="pb-3 px-2 text-right">Actual</th>
                <th className="pb-3 px-2 text-right">Pred. High/Low</th>
                <th className="pb-3 px-2 text-right">Actual High/Low</th>
                <th className="pb-3 px-2 text-center">Pred. Change</th>
                <th className="pb-3 px-2 text-center">Actual Change</th>
                <th className="pb-3 px-2 text-center">Status</th>
                <th className="pb-3 px-2"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr
                  key={item._id}
                  className="border-b border-slate-800 hover:bg-slate-800/30 transition-colors"
                >
                  <td className="py-4 px-2">
                    <div className="font-semibold text-white">{COIN_NAMES[item.coin] || item.coin}</div>
                    <div className="text-xs text-slate-500">{item.coin}</div>
                  </td>
                  <td className="py-4 px-2">
                    <div className="text-sm text-white">{formatDate(item.timestamp)}</div>
                  </td>
                  <td className="py-4 px-2">
                    <span className={`inline-block px-2 py-1 rounded-lg text-xs font-medium ${item.horizon === "24h"
                      ? "bg-purple-500/20 text-purple-400"
                      : "bg-cyan-500/20 text-cyan-400"
                      }`}>
                      {item.horizon}
                    </span>
                  </td>
                  <td className="py-4 px-2 text-right">
                    <span className="text-white font-mono">{formatPrice(item.current_price)}</span>
                  </td>
                  <td className="py-4 px-2 text-right">
                    <span className="text-cyan-400 font-mono">{formatPrice(item.predicted_price)}</span>
                  </td>
                  <td className="py-4 px-2 text-right">
                    <span className={`font-mono ${item.actual_price ? "text-emerald-400" : "text-slate-500"}`}>
                      {formatPrice(item.actual_price)}
                    </span>
                  </td>
                  <td className="py-4 px-2 text-right">
                    <div className="text-xs">
                      <div className="text-emerald-400">{formatPrice(item.predicted_high)}</div>
                      <div className="text-red-400">{formatPrice(item.predicted_low)}</div>
                    </div>
                  </td>
                  <td className="py-4 px-2 text-right">
                    <div className="text-xs">
                      <div className={item.actual_high ? "text-emerald-400" : "text-slate-500"}>
                        {formatPrice(item.actual_high)}
                      </div>
                      <div className={item.actual_low ? "text-red-400" : "text-slate-500"}>
                        {formatPrice(item.actual_low)}
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-2 text-center">
                    {formatChange(item.predicted_change, item.predicted_change_direction)}
                  </td>
                  <td className="py-4 px-2 text-center">
                    {formatChange(item.actual_change, item.actual_change_direction)}
                  </td>
                  <td className="py-4 px-2 text-center">
                    {item.is_verified ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium bg-emerald-500/20 text-emerald-400">
                        ✓ Verified
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium bg-amber-500/20 text-amber-400">
                        ⏳ Pending
                      </span>
                    )}
                  </td>
                  <td className="py-4 px-2">
                    <button
                      onClick={() => deleteEntry(item._id)}
                      className="text-slate-500 hover:text-red-400 transition-colors"
                      title="Delete"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty State */}
      {!loading && items.length === 0 && (
        <div className="text-center py-16">
          <div className="text-4xl mb-4">📊</div>
          <h3 className="text-xl font-semibold text-white mb-2">No forecast history yet</h3>
          <p className="text-slate-400">
            Start making forecasts to track your predictions here.
          </p>
        </div>
      )}

      {/* Legend */}
      <div className="mt-8 glass card-border rounded-2xl p-4">
        <h3 className="text-sm font-semibold text-white mb-3">Understanding Your History</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-slate-400">
          <div>
            <strong className="text-slate-300">Current Price:</strong> The price when the forecast was made
          </div>
          <div>
            <strong className="text-slate-300">Predicted Price:</strong> The forecasted price at horizon end
          </div>
          <div>
            <strong className="text-slate-300">Actual Price:</strong> The real price when the horizon ended (filled after verification)
          </div>
          <div>
            <strong className="text-slate-300">Pred. High/Low:</strong> Highest and lowest prices in your forecast range
          </div>
          <div>
            <strong className="text-slate-300">Actual High/Low:</strong> Real highest and lowest prices during the horizon period
          </div>
          <div>
            <strong className="text-slate-300">Verify Completed:</strong> Click to fetch actual prices for completed forecasts
          </div>
        </div>
      </div>
    </main>
  );
}
