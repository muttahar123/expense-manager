import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import { useUser } from '../context/UserContext.jsx';
import { updateInvestment } from '../lib/api.js';

// Status colors (good / critical) — reserved, paired with +/- sign & labels.
const GAIN = '#4ade80';
const LOSS = '#d3ddd6';
const signColor = (n) => (n >= 0 ? GAIN : LOSS);

function StatTile({ label, value, sub, tone }) {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-3 sm:p-4">
      <p className="text-[11px] text-slate-400">{label}</p>
      <p className={`mt-1 text-lg font-semibold tabular-nums sm:text-xl ${tone || 'text-slate-100'}`}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-slate-500">{sub}</p>}
    </div>
  );
}

// Inline editor for a holding's current value → live PnL recompute.
function HoldingRow({ inv, format, onUpdated }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(inv.currentValue);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      await updateInvestment(inv.id, { currentValue: Number(val) });
      setEditing(false);
      onUpdated?.();
    } finally {
      setBusy(false);
    }
  };

  const up = inv.pnl >= 0;
  return (
    <li className="flex items-center justify-between gap-3 py-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">{inv.assetName}</p>
        <p className="text-xs text-slate-500">
          {inv.assetType} · invested {format(inv.investedAmount, { compact: true })}
        </p>
      </div>

      <div className="flex items-center gap-3">
        {editing ? (
          <div className="flex items-center gap-1">
            <input
              type="number"
              value={val}
              onChange={(e) => setVal(e.target.value)}
              className="w-24 rounded-lg bg-ink-900 border border-white/10 px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-accent-invest/50"
            />
            <button
              onClick={save}
              disabled={busy}
              className="rounded-lg bg-brand-500 px-2 py-1 text-xs font-bold text-ink-900 disabled:opacity-60"
            >
              {busy ? '…' : 'Save'}
            </button>
          </div>
        ) : (
          <div className="text-right">
            <p className="text-sm font-semibold">{format(inv.currentValue, { compact: true })}</p>
            <p className="text-xs font-medium" style={{ color: signColor(inv.pnl) }}>
              {up ? '▲' : '▼'} {up ? '+' : ''}
              {inv.roi}% ({up ? '+' : ''}
              {format(inv.pnl, { compact: true })})
            </p>
          </div>
        )}
        <button
          onClick={() => (editing ? setEditing(false) : setEditing(true))}
          className="text-xs text-slate-400 hover:text-white"
          title="Update current value"
        >
          {editing ? '✕' : '✎'}
        </button>
      </div>
    </li>
  );
}

export default function InvestmentDashboard({ data, onRefresh }) {
  const { format } = useUser();
  const summary = data?.summary;
  const investments = data?.investments || [];

  if (!investments.length) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-slate-500">
        No investments yet — log one from the Quick Add panel (Investment tab).
      </div>
    );
  }

  const chartData = (summary?.classes || []).map((c) => ({
    name: c.assetType,
    pnl: c.pnl,
    roi: c.roi,
  }));

  const gainTone = summary.pnl >= 0 ? 'text-brand-400' : 'text-accent-expense';

  return (
    <div className="space-y-5">
      {/* Portfolio rollup */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatTile label="Invested" value={format(summary.invested, { compact: true })} />
        <StatTile label="Current value" value={format(summary.current, { compact: true })} />
        <StatTile
          label="Total PnL"
          value={`${summary.pnl >= 0 ? '+' : ''}${format(summary.pnl, { compact: true })}`}
          tone={gainTone}
        />
        <StatTile
          label="ROI"
          value={`${summary.roi >= 0 ? '+' : ''}${summary.roi}%`}
          tone={gainTone}
          sub={summary.pnl >= 0 ? 'in profit' : 'in loss'}
        />
      </div>

      {/* PnL by asset class */}
      <div>
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h4 className="text-sm font-semibold text-white">Gain or loss by investment type</h4>
            <p className="mt-1 text-[11px] leading-5 text-slate-500">Green means the value went up. White means it went down. Longer bars show a larger change.</p>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-slate-400">
            <span className="flex items-center gap-1">
              <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: GAIN }} />Profit
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: LOSS }} />Loss
            </span>
          </div>
        </div>
        <div className="w-full" style={{ height: `${Math.max(190, chartData.length * 42)}px` }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
              <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false}
                tickFormatter={(v) => format(v, { compact: true })} />
              <YAxis type="category" dataKey="name" tick={{ fill: '#cbd5d1', fontSize: 11 }} axisLine={false} tickLine={false} width={82} />
              <ReferenceLine x={0} stroke="rgba(255,255,255,0.35)" />
              <Tooltip
                cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                contentStyle={{ background: '#0b0f17', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontSize: 12 }}
                formatter={(value, _n, p) => [`${format(value)} (${p.payload.roi}%)`, 'PnL']}
              />
              <Bar dataKey="pnl" radius={[0, 6, 6, 0]} maxBarSize={24}>
                {chartData.map((d) => (
                  <Cell key={d.name} fill={signColor(d.pnl)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Holdings list */}
      <div>
        <h4 className="mb-1 text-sm font-bold text-slate-300">Holdings</h4>
        <motion.ul layout className="divide-y divide-white/5">
          {investments.map((inv) => (
            <HoldingRow key={inv.id} inv={inv} format={format} onUpdated={onRefresh} />
          ))}
        </motion.ul>
      </div>
    </div>
  );
}
