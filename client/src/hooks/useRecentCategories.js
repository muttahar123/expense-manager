import { useCallback, useState } from 'react';

const KEY = 'wm.recentCategories';

function read() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || {};
  } catch {
    return {};
  }
}

/**
 * Tracks recently-used categories per transaction type (most recent first)
 * for the Omni-Input's "smart suggestions". Persists to localStorage so
 * suggestions are instant and offline — no API round-trip needed.
 */
export default function useRecentCategories() {
  const [store, setStore] = useState(read);

  const remember = useCallback((type, category) => {
    if (!category) return;
    setStore((prev) => {
      const list = prev[type] || [];
      const next = [category, ...list.filter((c) => c !== category)].slice(0, 5);
      const updated = { ...prev, [type]: next };
      try {
        localStorage.setItem(KEY, JSON.stringify(updated));
      } catch {
        /* ignore quota / private-mode errors */
      }
      return updated;
    });
  }, []);

  const suggestions = useCallback((type) => store[type] || [], [store]);

  return { suggestions, remember };
}
