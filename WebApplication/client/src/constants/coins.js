export const COINS = [
  {
    slug: "bitcoin",
    name: "Bitcoin",
    symbol: "BTCUSDT",
    ticker: "BTC",
    gradient: "from-amber-400 via-orange-500 to-amber-600",
    hasLocalData: true,
    image: "https://assets.coingecko.com/coins/images/1/large/bitcoin.png"
  },
  {
    slug: "ethereum",
    name: "Ethereum",
    symbol: "ETHUSDT",
    ticker: "ETH",
    gradient: "from-indigo-400 via-purple-500 to-indigo-600",
    hasLocalData: true,
    image: "https://assets.coingecko.com/coins/images/279/large/ethereum.png"
  },
  {
    slug: "solana",
    name: "Solana",
    symbol: "SOLUSDT",
    ticker: "SOL",
    gradient: "from-emerald-400 via-teal-500 to-cyan-500",
    hasLocalData: true,
    image: "https://assets.coingecko.com/coins/images/4128/large/solana.png"
  },
  {
    slug: "ripple",
    name: "Ripple",
    symbol: "XRPUSDT",
    ticker: "XRP",
    gradient: "from-sky-400 via-blue-500 to-sky-600",
    hasLocalData: true,
    image: "https://assets.coingecko.com/coins/images/44/large/xrp-symbol-white-128.png"
  },
  {
    slug: "dogecoin",
    name: "Dogecoin",
    symbol: "DOGEUSDT",
    ticker: "DOGE",
    gradient: "from-yellow-300 via-amber-400 to-yellow-500",
    hasLocalData: true,
    image: "https://assets.coingecko.com/coins/images/5/large/dogecoin.png"
  },
  {
    slug: "bitcoin-cash",
    name: "Bitcoin Cash",
    symbol: "BCHUSDT",
    ticker: "BCH",
    gradient: "from-lime-400 via-green-500 to-lime-600",
    hasLocalData: false,
    image: "https://assets.coingecko.com/coins/images/780/large/bitcoin-cash.png"
  },
  {
    slug: "binance-coin",
    name: "Binance Coin",
    symbol: "BNBUSDT",
    ticker: "BNB",
    gradient: "from-yellow-400 via-amber-500 to-yellow-600",
    hasLocalData: true,
    image: "https://assets.coingecko.com/coins/images/825/large/bnb-icon2_2x.png"
  },
  {
    slug: "cardano",
    name: "Cardano",
    symbol: "ADAUSDT",
    ticker: "ADA",
    gradient: "from-cyan-400 via-blue-500 to-blue-600",
    hasLocalData: true,
    image: "https://assets.coingecko.com/coins/images/975/large/cardano.png"
  }
];

export const slugToSymbol = COINS.reduce((acc, coin) => {
  acc[coin.slug] = coin.symbol;
  return acc;
}, {});

export const symbolToCoin = COINS.reduce((acc, coin) => {
  acc[coin.symbol] = coin;
  return acc;
}, {});

