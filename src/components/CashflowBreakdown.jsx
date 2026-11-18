import { useUser } from '../context/UserContext.jsx';

const allocations = [
  { key: 'Needs', color: 'bg-emerald-200' },
  { key: 'Wants', color: 'bg-green-400' },
  { key: 'Investments', color: 'bg-green-600' },
  { key: 'Savings', color: 'bg-white' },
];

// Clear, direct comparison: each row shows the amount and share of income.
export default function CashflowBreakdown({ summary }) {
  const { format } = useUser();
  const totals = summary?.totals;
  const buckets = summary?.buckets || {};
  const income = Number(totals?.income) || 0;

  if (!summary || income <= 0) {
    return (
      <div className="flex min-h-52 flex-col items-center justify-center rounded-2xl border border-white/[0.06] bg-black/20 px-5 text-center">
        <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-xl text-brand-400">↗</span>
        <p className="text-sm font-semibold text-white">Your money snapshot will appear here</p>
        <p className="mt-1 max-w-xs text-xs leading-5 text-slate-400">Add income, then track expenses and savings to see how your money is allocated.</p>
      </div>
    );
  }

  const spent = (Number(totals.expense) || 0) + (Number(totals.investment) || 0);
  const remaining = Math.max(income - spent, 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 rounded-2xl border border-white/[0.08] bg-gradient-to-br from-green-400/[0.12] via-white/[0.035] to-transparent p-4 sm:flex-row sm:items-end sm:justify-between sm:p-5">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">Total income</p>
          <p className="mt-1 text-3xl font-semibold tracking-tight text-white sm:text-4xl">{format(income, { compact: true })}</p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:min-w-64">
          <div className="rounded-xl border border-white/[0.08] bg-black/20 p-3">
            <p className="text-[11px] text-slate-400">Spent + invested</p>
            <p className="mt-1 text-sm font-semibold text-white">{format(spent, { compact: true })}</p>
          </div>
          <div className="rounded-xl border border-green-300/15 bg-green-300/[0.08] p-3">
            <p className="text-[11px] text-green-100/70">Left over</p>
            <p className="mt-1 text-sm font-semibold text-green-100">{format(remaining, { compact: true })}</p>
          </div>
        </div>
      </div>

      <div className="space-y-4" aria-label="Income allocation">
        {allocations.map(({ key, color }) => {
          const amount = Number(buckets[key]) || 0;
          const share = amount / income * 100;
          const width = Math.min(share, 100);
          return (
            <div key={key}>
              <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                <span className="font-medium text-slate-200">{key}</span>
                <span className="shrink-0 text-right tabular-nums text-slate-300">
                  {format(amount, { compact: true })}<span className="ml-2 text-xs text-slate-500">{Math.round(share)}%</span>
                </span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-white/[0.07]">
                <div className={`h-full rounded-full ${color} shadow-[0_0_14px_rgba(74,222,128,0.25)] transition-[width] duration-700`} style={{ width: `${width}%` }} />
              </div>
            </div>
          );
        })}
      </div>

      <p className="border-t border-white/[0.06] pt-3 text-xs leading-5 text-slate-500">
        Each bar is that category’s share of your income. If expenses are higher than income, bars can reach 100%.
      </p>
    </div>
  );
}
