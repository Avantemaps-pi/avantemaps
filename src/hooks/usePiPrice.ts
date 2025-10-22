
import { useState, useEffect } from 'react';

export const usePiPrice = () => {
  const [piPrice, setPiPrice] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPiPrice = async () => {
      try {
        // Fetch real-time Pi price from OKX API
        const response = await fetch('https://www.okx.com/api/v5/market/ticker?instId=PI-USDT');
        const data = await response.json();
        
        if (data.code === '0' && data.data && data.data[0]) {
          const lastPrice = parseFloat(data.data[0].last);
          setPiPrice(lastPrice);
          setError(null);
        } else {
          throw new Error('Invalid OKX API response');
        }
      } catch (err) {
        console.error('Error fetching Pi price from OKX:', err);
        // Fallback to cached price or default
        if (!piPrice) {
          setPiPrice(0.65); // Reasonable fallback based on current Pi market price
        }
        setError('Using cached Pi price');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPiPrice();
    // Refresh price every 5 minutes
    const interval = setInterval(fetchPiPrice, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const convertUsdToPi = (usdAmount: number) => {
    if (!piPrice) return null;
    return (usdAmount / piPrice).toFixed(2);
  };

  return { piPrice, isLoading, error, convertUsdToPi };
};
