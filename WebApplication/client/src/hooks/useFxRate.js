import { useEffect, useState, useRef } from "react";

// Currency rates relative to USD (fallback values)
const FALLBACK_RATES = {
  USD: 1,
  INR: 83.5,
  EUR: 0.92,
  GBP: 0.79,
  JPY: 149.5,
  AUD: 1.54,
  CAD: 1.36,
  CHF: 0.88,
  CNY: 7.15,
  SGD: 1.34,
  AED: 3.67,
  KRW: 1310,
  BRL: 4.95,
  RUB: 92.5,
  MXN: 17.2,
  ZAR: 18.6,
};

// Live FX rate hook with multiple API fallbacks
export function useFxRate(target = "INR", intervalMs = 30000) {
  const [rate, setRate] = useState(FALLBACK_RATES[target] || 1);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    let t;

    async function fetchRate() {
      if (target === "USD") {
        setRate(1);
        return;
      }

      // Try multiple APIs with fallbacks
      const apis = [
        // Primary: ExchangeRate-API (free tier)
        async () => {
          const res = await fetch(`https://api.exchangerate-api.com/v4/latest/USD`);
          const data = await res.json();
          return data?.rates?.[target];
        },
        // Fallback 1: Open Exchange Rates (via allorigins proxy)
        async () => {
          const res = await fetch(`https://open.er-api.com/v6/latest/USD`);
          const data = await res.json();
          return data?.rates?.[target];
        },
        // Fallback 2: Use cached/static rates
        async () => {
          return FALLBACK_RATES[target];
        }
      ];

      for (const api of apis) {
        try {
          const r = await api();
          if (!mounted.current) return;
          if (r && typeof r === 'number') {
            setRate(r);
            return;
          }
        } catch (err) {
          console.warn("FX API failed, trying next...", err.message);
        }
      }
    }

    fetchRate();
    t = setInterval(fetchRate, intervalMs);

    return () => {
      mounted.current = false;
      clearInterval(t);
    };
  }, [target, intervalMs]);

  return rate;
}

// Export available currencies with their details
export const CURRENCIES = [
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "INR", symbol: "₹", name: "Indian Rupee" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "GBP", symbol: "£", name: "British Pound" },
  { code: "JPY", symbol: "¥", name: "Japanese Yen" },
  { code: "AUD", symbol: "A$", name: "Australian Dollar" },
  { code: "CAD", symbol: "C$", name: "Canadian Dollar" },
  { code: "CHF", symbol: "Fr", name: "Swiss Franc" },
  { code: "CNY", symbol: "¥", name: "Chinese Yuan" },
  { code: "SGD", symbol: "S$", name: "Singapore Dollar" },
  { code: "AED", symbol: "د.إ", name: "UAE Dirham" },
  { code: "KRW", symbol: "₩", name: "South Korean Won" },
  { code: "BRL", symbol: "R$", name: "Brazilian Real" },
  { code: "RUB", symbol: "₽", name: "Russian Ruble" },
  { code: "MXN", symbol: "$", name: "Mexican Peso" },
  { code: "ZAR", symbol: "R", name: "South African Rand" },
];
