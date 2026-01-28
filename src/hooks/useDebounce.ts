import { useState, useEffect } from "react";

/**
 * Hook för att debounce ett värde
 * @param value Värdet som ska debounce:as
 * @param delay Fördröjning i millisekunder (default: 300ms)
 * @returns Det debounce:ade värdet
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}
