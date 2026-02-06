import { useState, useEffect, useMemo } from "react";
import { api } from "../services/api";
import { COINS } from "../constants/coins";

// Sentiment badge component
const SentimentBadge = ({ sentiment }) => {
    const colors = {
        positive: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
        negative: "bg-rose-500/20 text-rose-400 border-rose-500/30",
        neutral: "bg-slate-500/20 text-slate-400 border-slate-500/30",
    };

    const icons = {
        positive: (
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
        ),
        negative: (
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
        ),
        neutral: (
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
        ),
    };

    return (
        <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium border ${colors[sentiment.label]}`}>
            {icons[sentiment.label]}
            <span className="capitalize">{sentiment.label}</span>
            <span className="opacity-60">({Math.round(sentiment.score * 100)}%)</span>
        </div>
    );
};

// News card component
const NewsCard = ({ news }) => {
    const timeAgo = (dateStr) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        return `${diffDays}d ago`;
    };

    return (
        <a
            href={news.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block group"
        >
            <div className="glass rounded-2xl overflow-hidden border border-white/5 hover:border-accent/30 transition-all duration-300 h-full">
                {/* Image */}
                {news.image_url && (
                    <div className="relative h-48 overflow-hidden">
                        <img
                            src={news.image_url}
                            alt=""
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            onError={(e) => e.target.style.display = 'none'}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0f1a] to-transparent" />
                    </div>
                )}

                {/* Content */}
                <div className="p-5">
                    {/* Source and time */}
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-medium text-accent">{news.source}</span>
                        <span className="text-xs text-slate-500">{timeAgo(news.published_at)}</span>
                    </div>

                    {/* Title */}
                    <h3 className="text-lg font-semibold text-white mb-3 line-clamp-2 group-hover:text-accent transition-colors">
                        {news.title}
                    </h3>

                    {/* Body preview */}
                    <p className="text-sm text-slate-400 mb-4 line-clamp-3">
                        {news.body}
                    </p>

                    {/* Sentiment and categories */}
                    <div className="flex items-center justify-between flex-wrap gap-2">
                        <SentimentBadge sentiment={news.sentiment} />
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                            Read more
                        </div>
                    </div>

                    {/* Categories tags */}
                    {news.categories && news.categories.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-white/5">
                            {news.categories.slice(0, 5).map((cat, idx) => (
                                <span key={idx} className="px-2 py-0.5 rounded-full text-[10px] bg-white/5 text-slate-400">
                                    {cat}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </a>
    );
};

// Trending news sidebar item
const TrendingItem = ({ item, rank }) => (
    <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-start gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors group"
    >
        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center text-accent font-bold text-sm">
            {rank}
        </div>
        <div className="flex-1 min-w-0">
            <h4 className="text-sm font-medium text-white line-clamp-2 group-hover:text-accent transition-colors">
                {item.title}
            </h4>
            <div className="flex items-center gap-2 mt-1">
                <SentimentBadge sentiment={item.sentiment} />
            </div>
        </div>
    </a>
);

export default function TopNews() {
    const [news, setNews] = useState([]);
    const [trending, setTrending] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedCoin, setSelectedCoin] = useState("ALL");
    const [dateRange, setDateRange] = useState("30d");

    // Coin options for filter
    const coinOptions = useMemo(() => [
        { value: "ALL", label: "All Cryptocurrencies", ticker: "ALL" },
        ...COINS.map(c => ({ value: c.ticker, label: c.name, ticker: c.ticker, image: c.image }))
    ], []);

    // Fetch news
    const fetchNews = async () => {
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams();
            if (selectedCoin && selectedCoin !== "ALL") {
                params.append("coin", selectedCoin);
            }
            params.append("date_range", dateRange);

            const { data } = await api.get(`/news?${params.toString()}`);
            setNews(data.news || []);
        } catch (err) {
            setError(err?.response?.data?.detail || "Failed to fetch news");
            setNews([]);
        } finally {
            setLoading(false);
        }
    };

    // Fetch trending
    const fetchTrending = async () => {
        try {
            const { data } = await api.get("/news/trending");
            setTrending(data.trending || []);
        } catch (err) {
            console.error("Failed to fetch trending:", err);
        }
    };

    useEffect(() => {
        fetchNews();
    }, [selectedCoin, dateRange]);

    useEffect(() => {
        fetchTrending();
    }, []);

    // Sentiment stats
    const sentimentStats = useMemo(() => {
        if (!news.length) return { positive: 0, negative: 0, neutral: 0 };
        const counts = { positive: 0, negative: 0, neutral: 0 };
        news.forEach(n => counts[n.sentiment?.label || 'neutral']++);
        return counts;
    }, [news]);

    return (
        <main className="mx-auto max-w-7xl px-4 py-10">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-accent/20 to-emerald-500/20 flex items-center justify-center">
                        <svg className="w-6 h-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                        </svg>
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-white">Top News</h1>
                        <p className="text-slate-400">Latest crypto market news with AI sentiment analysis</p>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="glass rounded-2xl p-4 mb-6 border border-white/5">
                <div className="flex flex-wrap items-center gap-4">
                    {/* Coin filter */}
                    <div className="flex-1 min-w-[200px]">
                        <label className="block text-xs text-slate-400 mb-1.5">Filter by Coin</label>
                        <select
                            value={selectedCoin}
                            onChange={(e) => setSelectedCoin(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-accent/50 transition-colors cursor-pointer"
                        >
                            {coinOptions.map((opt) => (
                                <option key={opt.value} value={opt.value} className="bg-slate-900">
                                    {opt.label} ({opt.ticker})
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Date range filter */}
                    <div>
                        <label className="block text-xs text-slate-400 mb-1.5"></label>
                        <div className="flex rounded-xl overflow-hidden border border-white/10">
                            <button
                                onClick={() => setDateRange("today")}
                                className={`px-3 py-2 text-sm font-medium transition-colors ${dateRange === "today"
                                    ? "bg-accent text-slate-900"
                                    : "bg-white/5 text-slate-300 hover:bg-white/10"
                                    }`}
                            >
                                Today
                            </button>
                            <button
                                onClick={() => setDateRange("30d")}
                                className={`px-3 py-2 text-sm font-medium transition-colors ${dateRange === "30d"
                                    ? "bg-accent text-slate-900"
                                    : "bg-white/5 text-slate-300 hover:bg-white/10"
                                    }`}
                            >
                                More
                            </button>
                        </div>
                    </div>

                    {/* Sentiment overview */}
                    <div className="ml-auto">
                        <label className="block text-xs text-slate-400 mb-1.5">Sentiment</label>
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-1.5 text-xs">
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                                <span className="text-emerald-400 font-medium">{sentimentStats.positive}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs">
                                <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                                <span className="text-slate-400 font-medium">{sentimentStats.neutral}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs">
                                <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                                <span className="text-rose-400 font-medium">{sentimentStats.negative}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex gap-6">
                {/* Main news grid */}
                <div className="flex-1">
                    {loading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {[...Array(6)].map((_, i) => (
                                <div key={i} className="glass rounded-2xl p-5 animate-pulse">
                                    <div className="h-40 bg-white/5 rounded-xl mb-4" />
                                    <div className="h-4 bg-white/5 rounded w-3/4 mb-2" />
                                    <div className="h-4 bg-white/5 rounded w-1/2 mb-4" />
                                    <div className="h-3 bg-white/5 rounded w-full mb-2" />
                                    <div className="h-3 bg-white/5 rounded w-2/3" />
                                </div>
                            ))}
                        </div>
                    ) : error ? (
                        <div className="glass rounded-2xl p-8 text-center">
                            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-rose-500/10 flex items-center justify-center">
                                <svg className="w-8 h-8 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-semibold text-white mb-2">Failed to Load News</h3>
                            <p className="text-slate-400 text-sm mb-4">{error}</p>
                            <button
                                onClick={fetchNews}
                                className="px-4 py-2 bg-accent text-slate-900 rounded-xl font-medium text-sm hover:bg-accent/90 transition-colors"
                            >
                                Try Again
                            </button>
                        </div>
                    ) : news.length === 0 ? (
                        <div className="glass rounded-2xl p-8 text-center">
                            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-500/10 flex items-center justify-center">
                                <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-semibold text-white mb-2">No News Found</h3>
                            <p className="text-slate-400 text-sm">Try adjusting your filters or check back later.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {news.map((item) => (
                                <NewsCard key={item.id} news={item} />
                            ))}
                        </div>
                    )}
                </div>

                {/* Trending sidebar */}
                <div className="hidden lg:block w-80 flex-shrink-0">
                    <div className="glass rounded-2xl p-4 border border-white/5 sticky top-24">
                        <div className="flex items-center gap-2 mb-4">
                            <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
                            </svg>
                            <h3 className="text-sm font-semibold text-white">Trending Now</h3>
                        </div>

                        {trending.length > 0 ? (
                            <div className="space-y-1">
                                {trending.map((item, idx) => (
                                    <TrendingItem key={item.id || idx} item={item} rank={idx + 1} />
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-6">
                                <p className="text-sm text-slate-500">Loading trending news...</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </main>
    );
}
