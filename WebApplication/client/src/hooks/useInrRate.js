import { useEffect, useState } from "react";

export function useInrRate() {
  const [rate, setRate] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("https://api.exchangerate.host/latest?base=USD&symbols=INR");
        const data = await res.json();
        if (!cancelled && data?.rates?.INR) {
          setRate(data.rates.INR);
        }
      } catch (err) {
        console.error("INR rate fetch failed", err);
      }
    }
    load();
  }, []);

  return rate || 83; // sensible fallback
}

