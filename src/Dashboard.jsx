import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import OmniInput from './components/OmniInput.jsx';
import InsightsPanel from './components/InsightsPanel.jsx';
import CashflowBreakdown from './components/CashflowBreakdown.jsx';
import InvestmentDashboard from './components/InvestmentDashboard.jsx';
import { getInsights, listTransactions, listInvestments } from './lib/api.js';
import { useUser } from './context/UserContext.jsx';
import { useAuth } from './context/AuthContext.jsx';
import { CURRENCY_SYMBOLS } from './constants/finance.js';

const typeDot = { Income: 'bg-green-400', Expense: 'bg-white/50', Investment: 'bg-emerald-200' };

function thisMonthRange() {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  return { from: from.toISOString(), to: to.toISOString() };
}

function CurrencySwitcher() {
  const { currency, save } = useUser();
  return (
    <label className="glass-control flex items-center gap-2 rounded-full px-3 py-2">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Currency</span>
      <select value={currency} onChange={(e) => save({ baseCurrency: e.target.value })} className="max-w-[4.5rem] bg-transparent text-xs font-semibold text-white outline-none" title="Base currency">
        {Object.keys(CURRENCY_SYMBOLS).map((code) => <option key={code} value={code} className="bg-ink-900">{code}</option>)}
      </select>
    </label>
  );
}

function UserMenu() {
  const { user, signOut } = useAuth();
  const email = user?.email;
  const [avatarFailed, setAvatarFailed] = useState(false);
  const avatar = user?.user_metadata?.avatar_url || user?.user_metadata?.picture;
  const initials = (user?.user_metadata?.full_name || user?.user_metadata?.name || email || 'U').trim().charAt(0).toUpperCase();
  return (
    <div className="glass-control flex items-center gap-2 rounded-full p-1.5 pr-2">
      {avatar && !avatarFailed ? <img src={avatar} alt="Profile" onError={() => setAvatarFailed(true)} className="h-8 w-8 rounded-full border border-white/15 object-cover" /> : (
        <div aria-label="Profile" className="flex h-8 w-8 items-center justify-center rounded-full border border-green-300/20 bg-green-300/10 text-xs font-bold text-green-200">{initials}</div>
      )}
      <button onClick={signOut} className="px-2 text-xs font-medium text-slate-300 transition hover:text-white" title={email ? `Signed in as ${email}` : 'Sign out'}>Sign out</button>
    </div>
  );
}

function SectionTitle({ eyebrow, title, detail }) {
  return (
    <div className="mb-5">
      {eyebrow && <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-green-300/80">{eyebrow}</p>}
      <h2 className="text-base font-semibold tracking-tight text-white sm:text-lg">{title}</h2>
      {detail && <p className="mt-1 text-xs leading-5 text-slate-400">{detail}</p>}
    </div>
  );
}

export default function Dashboard() {
  const { format, loading: userLoading, schemaMissing } = useUser();
  const [insights, setInsights] = useState(null);
  const [recent, setRecent] = useState([]);
  const [portfolio, setPortfolio] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [nextInsights, transactions, investments] = await Promise.all([
        getInsights(thisMonthRange()), listTransactions({ limit: 6 }), listInvestments(),
      ]);
      setInsights(nextInsights);
      setRecent(transactions);
      setPortfolio(investments);
    } catch {
      setInsights(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const totals = insights?.cashflow?.summary?.totals;
  const cashflowSummary = insights?.cashflow?.summary;
  const stats = [
    { label: 'Regular income', value: totals?.income || 0, note: 'Investment payouts are tracked separately', marker: 'bg-green-300' },
    { label: 'Everyday spending', value: totals?.expense || 0, note: 'Your recorded expenses', marker: 'bg-white/60' },
    { label: 'Active investment', value: portfolio?.summary?.invested || 0, note: 'Principal in open holdings', marker: 'bg-emerald-500' },
    { label: 'Current savings balance', value: totals?.savingsBalance || 0, note: 'Running total across months, including investment payouts', marker: 'bg-sky-300' },
  ];

  return (
    <div className="app-shell relative min-h-screen overflow-hidden px-4 pb-12 sm:px-6 lg:px-8">
      <div className="ambient-orb ambient-orb-one" />
      <div className="ambient-orb ambient-orb-two" />
      <div className="relative mx-auto max-w-7xl">
        <header className="flex flex-col gap-5 py-6 sm:py-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="brand-mark flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-green-100">
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" aria-hidden="true"><path d="M4 16.5 9 11l3.3 3.3L20 6.5M14.5 6.5H20v5.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-green-200/75">Personal finance</p>
              <h1 className="text-lg font-semibold tracking-tight text-white sm:text-xl">Wealth <span className="text-slate-500">/</span> Expenses</h1>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            <CurrencySwitcher />
            <UserMenu />
          </div>
        </header>

        {schemaMissing && (
          <div role="alert" className="glass-panel mb-5 border-green-300/20 p-4 text-sm text-green-50">
            <p className="font-semibold">Finish connecting your Supabase database</p>
            <p className="mt-1 text-green-50/70">Run the full <code>supabase/schema.sql</code> file in your Supabase SQL Editor, then refresh. No extra server is needed.</p>
          </div>
        )}

        <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 flex flex-col gap-2 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm text-slate-400">A little more clarity, every day.</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight text-white sm:text-3xl">Your money this month<span className="text-green-300">.</span></h2>
          </div>
          <p className="text-xs text-slate-500">A live overview of your recorded finances</p>
        </motion.section>

        <section className="mb-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
          {stats.map((stat, i) => (
            <motion.article key={stat.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="glass-panel stat-card p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400">{stat.label}</span>
                <span className={`h-2 w-2 rounded-full ${stat.marker} shadow-[0_0_12px_rgba(134,239,172,0.5)]`} />
              </div>
              <p className="mt-3 break-words text-xl font-semibold tracking-tight text-white sm:text-2xl">{loading && !totals ? '—' : format(stat.value)}</p>
              <p className="mt-1 text-[11px] text-slate-500">{stat.note}</p>
            </motion.article>
          ))}
        </section>

        <main className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-6">
          <div className="order-2 space-y-5 lg:order-1 lg:space-y-6">
            <section className="glass-panel p-4 sm:p-6">
              <SectionTitle eyebrow="Monthly breakdown" title="Where your money went" detail="Regular income funds expenses; investments and their payouts stay separately tracked." />
              <CashflowBreakdown summary={cashflowSummary} />
            </section>

            <section className="glass-panel p-4 sm:p-6">
              <SectionTitle eyebrow="Portfolio" title="Investments & performance" detail="See what you invested, its current value, and the difference." />
              <InvestmentDashboard data={portfolio} onRefresh={refresh} />
            </section>

            <section className="glass-panel p-4 sm:p-6">
              <InsightsPanel data={insights} loading={loading || userLoading} />
            </section>

            <section className="glass-panel p-4 sm:p-6">
              <SectionTitle eyebrow="Latest entries" title="Recent activity" />
              {recent.length === 0 ? <p className="rounded-2xl border border-white/[0.06] bg-black/20 px-4 py-6 text-center text-sm text-slate-400">Nothing here yet. Add your first entry above.</p> : (
                <ul className="divide-y divide-white/[0.07]">
                  {recent.map((transaction) => (
                    <li key={transaction.id} className="flex min-w-0 items-center justify-between gap-3 py-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${typeDot[transaction.type] || 'bg-white/50'}`} />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-white">{transaction.investment ? `${transaction.category} · Investment` : transaction.category}</p>
                          <p className="mt-0.5 text-[11px] text-slate-500">{new Date(transaction.date).toLocaleDateString()} · {transaction.bucket}</p>
                        </div>
                      </div>
                      <span className="shrink-0 text-sm font-semibold tabular-nums text-slate-200">{format(transaction.amount)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <aside className="order-1 lg:order-2 lg:sticky lg:top-5">
            <OmniInput onSaved={refresh} investments={portfolio?.investments || []} />
          </aside>
        </main>
        <footer className="pt-8 text-center text-[10px] tracking-wide text-slate-600">DESIGNED BY MUTTAHAR · POWERED BY SUPABASE</footer>
      </div>
    </div>
  );
}
