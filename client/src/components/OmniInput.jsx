import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import {
  TX_TYPES,
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  ASSET_TYPES,
  todayISO,
} from '../constants/finance.js';
import useRecentCategories from '../hooks/useRecentCategories.js';
import { createTransaction } from '../lib/api.js';
import { useUser } from '../context/UserContext.jsx';

const typeAccent = {
  Expense: 'bg-accent-expense',
  Income: 'bg-accent-income',
  Investment: 'bg-accent-invest',
};

const typeRing = {
  Expense: 'focus:ring-accent-expense/50',
  Income: 'focus:ring-accent-income/50',
  Investment: 'focus:ring-accent-invest/50',
};

/**
 * The "Omni-Input" — one unified, lightning-fast form to log an Expense,
 * Income/Salary, or Investment with 1–2 clicks. Smart defaults (today's date,
 * recent-category chips) minimize friction.
 */
export default function OmniInput({ onSaved }) {
  const [type, setType] = useState('Expense');
  const [status, setStatus] = useState(null); // 'saving' | 'saved' | 'error'
  const { suggestions, remember } = useRecentCategories();
  const { symbol: currency } = useUser();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: { amount: '', category: '', date: todayISO(), notes: '', assetType: 'Stocks' },
  });

  const categoryValue = watch('category');

  const categoryOptions = useMemo(() => {
    if (type === 'Income') return INCOME_CATEGORIES;
    if (type === 'Investment') return ASSET_TYPES;
    return EXPENSE_CATEGORIES;
  }, [type]);

  // Smart default: pre-select a sensible category per type.
  useEffect(() => {
    const recent = suggestions(type);
    const fallback = type === 'Income' ? 'Salary' : type === 'Investment' ? '' : '';
    setValue('category', recent[0] || fallback);
  }, [type, setValue, suggestions]);

  const onSubmit = async (data) => {
    setStatus('saving');
    try {
      const payload = {
        type,
        amount: Number(data.amount),
        category: data.category,
        date: data.date,
        notes: data.notes,
      };
      if (type === 'Investment') payload.assetType = data.assetType;

      await createTransaction(payload);
      remember(type, data.category);
      setStatus('saved');
      reset({ amount: '', category: data.category, date: todayISO(), notes: '', assetType: data.assetType });
      onSaved?.();
      setTimeout(() => setStatus(null), 1600);
    } catch (err) {
      setStatus('error');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="w-full max-w-md rounded-xl2 bg-ink-800/80 backdrop-blur border border-white/5 shadow-glow p-5 sm:p-6"
    >
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-lg font-bold tracking-tight">Quick Add</h2>
        <span className="text-xs text-slate-400">One-tab entry</span>
      </div>

      {/* Segmented control */}
      <LayoutGroup>
        <div className="relative grid grid-cols-3 gap-1 rounded-2xl bg-ink-900 p-1 mb-6">
          {TX_TYPES.map((t) => {
            const active = type === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setType(t.key)}
                className={`relative z-10 py-2.5 text-sm font-semibold rounded-xl transition-colors ${
                  active ? 'text-ink-900' : 'text-slate-300 hover:text-white'
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="seg-pill"
                    className={`absolute inset-0 -z-10 rounded-xl ${typeAccent[t.key]}`}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                {t.label}
              </button>
            );
          })}
        </div>
      </LayoutGroup>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Amount — the hero field */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">Amount</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-semibold text-slate-400">
              {currency}
            </span>
            <input
              autoFocus
              type="number"
              step="0.01"
              inputMode="decimal"
              placeholder="0.00"
              {...register('amount', {
                required: 'Enter an amount',
                min: { value: 0.01, message: 'Must be greater than 0' },
              })}
              className={`w-full rounded-2xl bg-ink-900 border border-white/10 pl-10 pr-4 py-4 text-2xl font-bold tracking-tight outline-none focus:ring-2 ${typeRing[type]} transition`}
            />
          </div>
          {errors.amount && <p className="mt-1 text-xs text-accent-expense">{errors.amount.message}</p>}
        </div>

        {/* Category / Asset */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">
            {type === 'Investment' ? 'Asset name' : 'Category'}
          </label>

          {type === 'Investment' ? (
            <input
              type="text"
              placeholder="e.g. Apple, Bitcoin, My Cafe"
              {...register('category', { required: 'Name this holding' })}
              className={`w-full rounded-2xl bg-ink-900 border border-white/10 px-4 py-3 outline-none focus:ring-2 ${typeRing[type]} transition`}
            />
          ) : (
            <input
              list="omni-categories"
              type="text"
              placeholder="Pick or type…"
              {...register('category', { required: 'Choose a category' })}
              className={`w-full rounded-2xl bg-ink-900 border border-white/10 px-4 py-3 outline-none focus:ring-2 ${typeRing[type]} transition`}
            />
          )}
          <datalist id="omni-categories">
            {categoryOptions.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
          {errors.category && <p className="mt-1 text-xs text-accent-expense">{errors.category.message}</p>}

          {/* Recent-habit suggestion chips */}
          <AnimatePresence>
            {suggestions(type).length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-2 flex flex-wrap gap-1.5"
              >
                {suggestions(type).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setValue('category', c, { shouldValidate: true })}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition ${
                      categoryValue === c
                        ? 'bg-white/10 border-white/30 text-white'
                        : 'bg-ink-900 border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Asset type (Investment only) */}
        <AnimatePresence initial={false}>
          {type === 'Investment' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Asset class</label>
              <select
                {...register('assetType')}
                className="w-full rounded-2xl bg-ink-900 border border-white/10 px-4 py-3 outline-none focus:ring-2 focus:ring-accent-invest/50 transition"
              >
                {ASSET_TYPES.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Date + Notes row */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Date</label>
            <input
              type="date"
              {...register('date')}
              className={`w-full rounded-2xl bg-ink-900 border border-white/10 px-3 py-3 outline-none focus:ring-2 ${typeRing[type]} transition`}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Note (optional)</label>
            <input
              type="text"
              placeholder="Add a note"
              {...register('notes')}
              className={`w-full rounded-2xl bg-ink-900 border border-white/10 px-3 py-3 outline-none focus:ring-2 ${typeRing[type]} transition`}
            />
          </div>
        </div>

        {/* Submit */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          type="submit"
          disabled={isSubmitting || status === 'saving'}
          className={`w-full rounded-2xl py-4 text-base font-bold text-ink-900 ${typeAccent[type]} disabled:opacity-60 transition`}
        >
          {status === 'saving'
            ? 'Saving…'
            : status === 'saved'
            ? '✓ Saved'
            : `Add ${type}`}
        </motion.button>

        <AnimatePresence>
          {status === 'error' && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center text-sm text-accent-expense"
            >
              Couldn’t save — is the API running?
            </motion.p>
          )}
        </AnimatePresence>
      </form>
    </motion.div>
  );
}
