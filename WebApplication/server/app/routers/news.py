from datetime import datetime, timedelta, timezone
from typing import Optional, List
from fastapi import APIRouter, Query, HTTPException
from pydantic import BaseModel
import httpx
import asyncio

# Free crypto news APIs we'll try
NEWS_APIS = [
    # CryptoCompare News API (free tier)
    {
        "name": "CryptoCompare",
        "url": "https://min-api.cryptocompare.com/data/v2/news/",
        "params_builder": lambda coin, categories: {"categories": coin.upper() if coin else "BTC,ETH,XRP,SOL,DOGE"},
    },
]

# Simple sentiment analysis using VADER-like approach
# We'll use a lightweight rule-based sentiment analyzer
POSITIVE_WORDS = {
    'surge', 'surges', 'soar', 'soars', 'rally', 'rallies', 'gain', 'gains', 'bullish', 'bull',
    'rise', 'rises', 'rising', 'up', 'uptick', 'upward', 'growth', 'growing', 'boom', 'booming',
    'profit', 'profits', 'profitable', 'win', 'wins', 'winning', 'success', 'successful',
    'breakout', 'breakthrough', 'positive', 'optimistic', 'optimism', 'hope', 'hopeful',
    'strong', 'stronger', 'strength', 'recover', 'recovery', 'recovering', 'rebound',
    'adoption', 'adopt', 'adopted', 'innovation', 'innovative', 'breakthrough', 'milestone',
    'record', 'all-time high', 'ath', 'pump', 'moon', 'mooning', 'upgrade', 'launch',
    'partnership', 'partner', 'invest', 'investment', 'institutional', 'approval', 'approved',
    'green', 'outperform', 'beat', 'exceed', 'exceeds', 'exceeded', 'exciting', 'excited'
}

NEGATIVE_WORDS = {
    'crash', 'crashes', 'plunge', 'plunges', 'drop', 'drops', 'fall', 'falls', 'falling',
    'bearish', 'bear', 'down', 'downturn', 'decline', 'declining', 'loss', 'losses', 'lose',
    'losing', 'dump', 'dumping', 'sell-off', 'selloff', 'panic', 'fear', 'fearful',
    'negative', 'pessimistic', 'pessimism', 'weak', 'weaker', 'weakness', 'fail', 'failed',
    'failure', 'scam', 'fraud', 'fraudulent', 'hack', 'hacked', 'hacking', 'breach',
    'ban', 'banned', 'banning', 'regulation', 'crackdown', 'warning', 'warn', 'warns',
    'risk', 'risky', 'danger', 'dangerous', 'volatile', 'volatility', 'uncertainty',
    'lawsuit', 'sue', 'sued', 'investigation', 'investigate', 'collapse', 'collapsed',
    'bankruptcy', 'bankrupt', 'red', 'underperform', 'miss', 'missed', 'concern', 'worried'
}

def analyze_sentiment(text: str) -> dict:
    """Simple rule-based sentiment analysis for crypto news"""
    if not text:
        return {"label": "neutral", "score": 0.5, "confidence": 0.0}
    
    text_lower = text.lower()
    words = set(text_lower.split())
    
    positive_count = sum(1 for word in words if word in POSITIVE_WORDS)
    negative_count = sum(1 for word in words if word in NEGATIVE_WORDS)
    
    # Also check for phrases
    for phrase in ['all-time high', 'all time high', 'sell-off', 'sell off']:
        if phrase in text_lower:
            if 'high' in phrase:
                positive_count += 2
            else:
                negative_count += 2
    
    total = positive_count + negative_count
    if total == 0:
        return {"label": "neutral", "score": 0.5, "confidence": 0.3}
    
    positive_ratio = positive_count / total
    
    if positive_ratio > 0.6:
        label = "positive"
        score = 0.5 + (positive_ratio - 0.5) * 0.8
    elif positive_ratio < 0.4:
        label = "negative"
        score = 0.5 - (0.5 - positive_ratio) * 0.8
    else:
        label = "neutral"
        score = 0.5
    
    confidence = min(total / 5, 1.0)  # More keywords = higher confidence
    
    return {
        "label": label,
        "score": round(score, 3),
        "confidence": round(confidence, 3)
    }


class NewsItem(BaseModel):
    id: str
    title: str
    body: str
    url: str
    source: str
    image_url: Optional[str] = None
    published_at: datetime
    categories: List[str] = []
    sentiment: dict


class NewsResponse(BaseModel):
    news: List[NewsItem]
    total: int
    filter_coin: Optional[str] = None
    date_range: str


router = APIRouter(prefix="/news", tags=["news"])


async def fetch_cryptocompare_news(coin: Optional[str] = None) -> List[dict]:
    """Fetch news from CryptoCompare API"""
    url = "https://min-api.cryptocompare.com/data/v2/news/"
    params = {"lang": "EN"}
    
    if coin:
        # Map ticker to category
        coin_categories = {
            "BTC": "BTC", "ETH": "ETH", "XRP": "XRP", "SOL": "SOL",
            "DOGE": "DOGE", "BCH": "BCH", "BNB": "BNB", "ADA": "ADA",
            "ALL": ""
        }
        category = coin_categories.get(coin.upper(), coin.upper())
        if category:
            params["categories"] = category
    
    async with httpx.AsyncClient(timeout=15.0) as client:
        try:
            response = await client.get(url, params=params)
            response.raise_for_status()
            data = response.json()
            return data.get("Data", [])
        except Exception as e:
            print(f"CryptoCompare API error: {e}")
            return []


@router.get("", response_model=NewsResponse)
async def get_crypto_news(
    coin: Optional[str] = Query(None, description="Filter by coin ticker (e.g., BTC, ETH). Leave empty for all."),
    date_range: str = Query("30d", description="Date range: 'today' or '30d'")
):
    """
    Get crypto news with sentiment analysis.
    - coin: Filter by specific cryptocurrency (BTC, ETH, XRP, SOL, DOGE, BCH, BNB, ADA)
    - date_range: 'today' for today only, '30d' for past 30 days
    """
    # Fetch news from CryptoCompare
    raw_news = await fetch_cryptocompare_news(coin if coin and coin.upper() != "ALL" else None)
    
    if not raw_news:
        return NewsResponse(news=[], total=0, filter_coin=coin, date_range=date_range)
    
    # Calculate date filter
    now = datetime.now(timezone.utc)
    if date_range == "today":
        cutoff = now.replace(hour=0, minute=0, second=0, microsecond=0)
    else:
        cutoff = now - timedelta(days=30)
    
    # Process and filter news
    processed_news = []
    for item in raw_news:
        try:
            # Parse timestamp
            published_ts = item.get("published_on", 0)
            published_at = datetime.fromtimestamp(published_ts, tz=timezone.utc)
            
            # Filter by date
            if published_at < cutoff:
                continue
            
            # Extract categories/tags
            categories = []
            if item.get("categories"):
                categories = [cat.strip() for cat in item["categories"].split("|") if cat.strip()]
            
            # Combine title and body for sentiment analysis
            full_text = f"{item.get('title', '')} {item.get('body', '')}"
            sentiment = analyze_sentiment(full_text)
            
            news_item = NewsItem(
                id=str(item.get("id", hash(item.get("url", "")))),
                title=item.get("title", ""),
                body=item.get("body", "")[:500] + "..." if len(item.get("body", "")) > 500 else item.get("body", ""),
                url=item.get("url", ""),
                source=item.get("source_info", {}).get("name", item.get("source", "Unknown")),
                image_url=item.get("imageurl"),
                published_at=published_at,
                categories=categories,
                sentiment=sentiment
            )
            processed_news.append(news_item)
        except Exception as e:
            print(f"Error processing news item: {e}")
            continue
    
    # Sort by published date (newest first)
    processed_news.sort(key=lambda x: x.published_at, reverse=True)
    
    # Limit results
    processed_news = processed_news[:50]
    
    return NewsResponse(
        news=processed_news,
        total=len(processed_news),
        filter_coin=coin,
        date_range=date_range
    )


@router.get("/trending")
async def get_trending_news():
    """Get trending/hot crypto news (top 10 most recent with high sentiment scores)"""
    raw_news = await fetch_cryptocompare_news()
    
    if not raw_news:
        return {"trending": [], "total": 0}
    
    # Process news with sentiment
    processed = []
    for item in raw_news[:30]:  # Check last 30 items
        try:
            full_text = f"{item.get('title', '')} {item.get('body', '')}"
            sentiment = analyze_sentiment(full_text)
            
            # Calculate "hotness" score based on recency and sentiment strength
            published_ts = item.get("published_on", 0)
            age_hours = (datetime.now(timezone.utc).timestamp() - published_ts) / 3600
            recency_score = max(0, 1 - (age_hours / 48))  # Higher score for more recent
            sentiment_strength = abs(sentiment["score"] - 0.5) * 2  # 0 to 1
            hotness = recency_score * 0.6 + sentiment_strength * 0.4
            
            processed.append({
                "id": str(item.get("id", "")),
                "title": item.get("title", ""),
                "url": item.get("url", ""),
                "source": item.get("source_info", {}).get("name", item.get("source", "Unknown")),
                "image_url": item.get("imageurl"),
                "published_at": datetime.fromtimestamp(published_ts, tz=timezone.utc).isoformat(),
                "sentiment": sentiment,
                "hotness": round(hotness, 3)
            })
        except Exception:
            continue
    
    # Sort by hotness and take top 10
    processed.sort(key=lambda x: x["hotness"], reverse=True)
    
    return {"trending": processed[:10], "total": len(processed[:10])}
