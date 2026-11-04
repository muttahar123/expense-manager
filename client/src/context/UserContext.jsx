import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getMe, updateMe } from '../lib/api.js';
import { CURRENCY_SYMBOLS } from '../constants/finance.js';

const UserContext = createContext(null);

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setUser(await getMe());
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = useCallback(async (patch) => {
    const updated = await updateMe(patch);
    setUser(updated);
    return updated;
  }, []);

  const currency = user?.baseCurrency || 'USD';
  const symbol = CURRENCY_SYMBOLS[currency] || currency + ' ';

  // Locale-aware currency formatter driven by the user's baseCurrency.
  const format = useCallback(
    (n, { compact = false } = {}) => {
      const amount = Number(n || 0);
      try {
        return new Intl.NumberFormat(undefined, {
          style: 'currency',
          currency,
          maximumFractionDigits: compact ? 0 : 2,
          notation: compact && Math.abs(amount) >= 10000 ? 'compact' : 'standard',
        }).format(amount);
      } catch {
        // Fallback if the currency code isn't ISO-4217 recognized.
        return `${symbol}${amount.toLocaleString(undefined, { maximumFractionDigits: compact ? 0 : 2 })}`;
      }
    },
    [currency, symbol]
  );

  const value = useMemo(
    () => ({ user, loading, currency, symbol, format, save, reload: load }),
    [user, loading, currency, symbol, format, save, load]
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUser must be used within <UserProvider>');
  return ctx;
}
