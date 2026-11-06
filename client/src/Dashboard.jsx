import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import OmniInput from './components/OmniInput.jsx';
import InsightsPanel from './components/InsightsPanel.jsx';
import CashflowSankey from './components/CashflowSankey.jsx';
import InvestmentDashboard from './components/InvestmentDashboard.jsx';
import { getInsights, listTransactions, listInvestments } from './lib/api.js';
import { useUser } from './context/UserContext.jsx';
import { useAuth } from './context/AuthContext.jsx';
import { CURRENCY_SYMBOLS } from './constants/finance.js';

const typeDot = { Income: 'bg-accent-income', Expense: 'bg-accent-expense', Investment: 'bg-accent-invest' };

function CurrencySwitcher() {
  const { currency, save } = useUser();
  return (
    <select
      value={currency}
      onChange={(e) => save({ baseCurrency: e.target.value })}
      className="rounded-lg bg-ink-800 border border-white/10 px-2.5 py-1.5 text-sm outline-none focus:ring-2 focus:ring-brand-500/40"
      title="Base currency"
    >
      {Object.keys(CURRENCY_SYMBOLS).map((c) => (
        <option key={c} value={c}>
          {c} {CURRENCY_SYMBOLS[c]}
        </option>
      ))}
    </select>
  );
}

function UserMenu() {
  const { user, signOut } = useAuth();
  const email = user?.email;
  const avatar = user?.user_metadata?.avatar_url;
  return (
    <div className="flex items-center gap-2">
      {avatar ? (
        <img src={avatar} alt="" className="h-8 w-8 rounded-full border border-white/10" />
      ) : (
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-500/20 text-sm font-bold text-brand-400">
          {(email || '?').charAt(0).toUpperCase()}
        </div>
      )}
      <button
        onClick={signOut}
        className="rounded-lg bg-ink-800 border border-white/10 px-2.5 py-1.5 text-sm text-slate-300 hover:text-white hover:border-white/20 transition"
        title={email ? `Signed in as ${email}` : 'Sign out'}
      >
        Sign out
      </button>
    </div>
  );
}

export default function Dashboard() {
  const { format, loading: userLoading } = useUser();
  const [insights, setInsights] = useState(null);
  const [recent, setRecent] = useState([]);
  const [portfolio, setPortfolio] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [ins, txs, inv] = await Promise.all([
        getInsights(),
        listTransactions({ limit: 6 }),
        listInvestments(),
      ]);
      setInsights(ins);
      setRecent(txs);
      setPortfolio(inv);
    } catch {
      setInsights(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const totals = insights?.cashflow?.summary?.totals;
  const cashflowSummary = insights?.cashflow?.summary;

  return (
    <div className="min-h-full">
      {/* Header */}
      <header className="px-5 pt-8 pb-4 max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start justify-between gap-4"
        >
          <div>
            <p className="text-sm text-slate-400">Personal</p>
            <h1 className="text-2xl font-extrabold tracking-tight">
              Wealth & Expense <span className="text-brand-400">Manager</span>
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <CurrencySwitcher />
            <UserMenu />
          </div>
        </motion.div>

        {totals && (
          <div className="mt-5 grid grid-cols-3 gap-3">
            {[
              { label: 'Income', val: totals.income, cls: 'text-accent-income' },
              { label: 'Spent', val: totals.expense, cls: 'text-accent-expense' },
              { label: 'Invested', val: totals.investment, cls: 'text-accent-invest' },
            ].map((s) => (
              <div key={s.label} className="rounded-xl2 bg-ink-800/70 border border-white/5 p-3">
                <p className="text-xs text-slate-400">{s.label}</p>
                <p className={`text-lg font-bold ${s.cls}`}>{format(s.val, { compact: true })}</p>
              </div>
            ))}
          </div>
        )}
      </header>

      {/* Body */}
      <main className="px-5 pb-16 max-w-6xl mx-auto grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="order-2 lg:order-1 space-y-6">
          {/* Sankey cashflow */}
          <section className="rounded-xl2 bg-ink-800/50 border border-white/5 p-5">
            <h3 className="text-sm font-bold text-slate-300 mb-1">Cashflow — where your money goes</h3>
            <CashflowSankey summary={cashflowSummary} />
          </section>

          {/* Investment & PnL dashboard */}
          <section className="rounded-xl2 bg-ink-800/50 border border-white/5 p-5">
            <h3 className="text-sm font-bold text-slate-300 mb-3">Investments &amp; PnL</h3>
            <InvestmentDashboard data={portfolio} onRefresh={refresh} />
          </section>

          {/* Smart Agent */}
          <section className="rounded-xl2 bg-ink-800/50 border border-white/5 p-5">
            <InsightsPanel data={insights} loading={loading || userLoading} />
          </section>

          {/* Recent activity */}
          <section className="rounded-xl2 bg-ink-800/50 border border-white/5 p-5">
            <h3 className="text-sm font-bold text-slate-300 mb-3">Recent activity</h3>
            {recent.length === 0 ? (
              <p className="text-sm text-slate-500">Nothing yet — add your first entry →</p>
            ) : (
              <ul className="divide-y divide-white/5">
                {recent.map((t) => (
                  <li key={t.id} className="flex items-center justify-between py-2.5">
                    <div className="flex items-center gap-3">
                      <span className={`h-2 w-2 rounded-full ${typeDot[t.type]}`} />
                      <div>
                        <p className="text-sm font-medium">{t.category}</p>
                        <p className="text-xs text-slate-500">
                          {new Date(t.date).toLocaleDateString()} · {t.bucket}
                        </p>
                      </div>
                    </div>
                    <span className="text-sm font-semibold">{format(t.amount, { compact: true })}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* Omni-Input */}
        <div className="order-1 lg:order-2 lg:sticky lg:top-6 h-fit flex justify-center">
          <OmniInput onSaved={refresh} />
        </div>
      </main>
    </div>
  );
}
