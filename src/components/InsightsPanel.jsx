import { motion } from 'framer-motion';

const levelStyle = {
  success: 'border-green-300/15 bg-green-300/[0.06] text-green-200',
  warning: 'border-white/15 bg-white/[0.035] text-white/80',
  info: 'border-white/[0.08] bg-white/[0.025] text-slate-300',
};

const levelIcon = { success: '✓', warning: '!', info: 'i' };

export default function InsightsPanel({ data, loading }) {
  if (loading) {
    return <div className="glass-panel p-5 text-sm text-slate-400">Looking at this month’s money…</div>;
  }
  if (!data) return null;

  const items = data.insights || [];

  return (
    <div className="space-y-2">
      <div className="mb-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-green-300/80">Smart suggestions</p>
        <h3 className="mt-1 text-base font-semibold text-white">A few helpful money tips</h3>
        <p className="mt-1 text-xs text-slate-400">Based on the entries you’ve added this month.</p>
      </div>
      {items.map((it, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.04 }}
          className={`flex gap-3 rounded-xl border px-3 py-3 text-sm ${levelStyle[it.level] || levelStyle.info}`}
        >
          <span className="mt-0.5 font-bold">{levelIcon[it.level] || 'i'}</span>
          <span className="text-slate-200/90">
            <span className="font-semibold">{it.category}: </span>
            {it.message}
          </span>
        </motion.div>
      ))}
    </div>
  );
}
