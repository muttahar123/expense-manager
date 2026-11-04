import { motion } from 'framer-motion';

const levelStyle = {
  success: 'border-brand-500/40 bg-brand-500/10 text-brand-400',
  warning: 'border-amber-400/40 bg-amber-400/10 text-amber-300',
  info: 'border-sky-400/30 bg-sky-400/10 text-sky-300',
};

const levelIcon = { success: '✓', warning: '!', info: 'i' };

// Renders the Zero-API Smart Agent output.
export default function InsightsPanel({ data, loading }) {
  if (loading) {
    return <div className="text-sm text-slate-400">Analyzing your finances…</div>;
  }
  if (!data) return null;

  const items = data.insights || [];

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-bold text-slate-300 mb-3">Smart Agent</h3>
      {items.map((it, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.04 }}
          className={`flex gap-2.5 rounded-xl border px-3 py-2.5 text-sm ${levelStyle[it.level] || levelStyle.info}`}
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
