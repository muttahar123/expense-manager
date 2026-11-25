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
import { createTransaction, createInvestmentReturn } from '../lib/api.js';
import { useUser } from '../context/UserContext.jsx';

const typeAccent = {
  Expense: 'bg-white',
  Income: 'bg-accent-income',
  Investment: 'bg-accent-invest',
  Return: 'bg-accent-income',
};

const typeRing = {
  Expense: 'focus:ring-accent-expense/50',
  Income: 'focus:ring-accent-income/50',
  Investment: 'focus:ring-accent-invest/50',
  Return: 'focus:ring-accent-income/50',
};

/**
 * The "Omni-Input" — one unified, lightning-fast form to log an Expense,
 * Income/Salary, or Investment with 1–2 clicks. Smart defaults (today's date,
 * recent-category chips) minimize friction.
 */
export default function OmniInput({ onSaved, investments = [] }) {
  const [type, setType] = useState('Expense');
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [categoryQuery, setCategoryQuery] = useState('');
  const [status, setStatus] = useState(null); // 'saving' | 'saved' | 'error'
  const [errorMessage, setErrorMessage] = useState('');
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
    defaultValues: { amount: '', category: '', date: todayISO(), notes: '', assetType: 'Stocks', investmentId: '', sale: true },
  });

  const categoryValue = watch('category');

  const categoryOptions = useMemo(() => {
    if (type === 'Income') return INCOME_CATEGORIES;
    if (type === 'Return') return [];
    if (type === 'Investment') return ASSET_TYPES;
    return EXPENSE_CATEGORIES;
  }, [type]);
  const categoryChoices = [...new Set([...suggestions(type), ...categoryOptions])];
  const visibleCategoryChoices = categoryQuery.trim()
    ? categoryChoices.filter((category) => category.toLowerCase().includes(categoryQuery.trim().toLowerCase()))
    : categoryChoices;
  const categoryField = register('category', { required: type === 'Investment' ? 'Name this holding' : 'Choose a category' });

  // Smart default: pre-select a sensible category per type.
  useEffect(() => {
    const recent = suggestions(type);
    const fallback = type === 'Income' ? 'Salary' : type === 'Investment' ? '' : '';
    setValue('category', recent[0] || fallback);
    setCategoryQuery('');
    setCategoryOpen(false);
  }, [type, setValue, suggestions]);

  const onSubmit = async (data) => {
    setStatus('saving');
    setErrorMessage('');
    try {
      const payload = {
        type,
        amount: Number(data.amount),
        category: data.category,
        date: data.date,
        notes: data.notes,
      };
      if (type === 'Return') {
        await createInvestmentReturn({ ...payload, investmentId: data.investmentId, sale: data.sale });
      } else {
        if (type === 'Investment') payload.assetType = data.assetType;
        await createTransaction(payload);
      }
      remember(type, data.category);
      setStatus('saved');
      reset({ amount: '', category: data.category, date: todayISO(), notes: '', assetType: data.assetType, investmentId: '', sale: true });
      onSaved?.();
      setTimeout(() => setStatus(null), 1600);
    } catch (err) {
      const missingRealizedColumn = /realized_value.*schema cache|schema cache.*realized_value/i.test(err?.message || '');
      setErrorMessage(missingRealizedColumn
        ? "Your database needs the investment-return update. In Supabase SQL Editor, run: ALTER TABLE public.investments ADD COLUMN IF NOT EXISTS realized_value numeric NOT NULL DEFAULT 0 CHECK (realized_value >= 0); then run NOTIFY pgrst, 'reload schema'; and retry."
        : err?.code === 'PGRST205'
        ? 'Run supabase/schema.sql in your Supabase SQL Editor, then refresh this page.'
        : err?.message || 'Check your Supabase settings and try again.');
      setStatus('error');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="glass-panel w-full max-w-md p-5 sm:p-6"
    >
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-green-300/80">Quick entry</p>
          <h2 className="mt-1 text-lg font-semibold tracking-tight text-white">Add a transaction</h2>
        </div>
        <span className="flex h-9 w-9 items-center justify-center rounded-full border border-green-300/15 bg-green-300/[0.07] text-lg text-green-200">＋</span>
      </div>

      {/* Segmented control */}
      <LayoutGroup>
        <div className="relative grid grid-cols-4 gap-1 rounded-2xl bg-ink-900 p-1 mb-6">
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
            {type === 'Investment' ? 'Asset name' : type === 'Return' ? 'Return amount' : 'Category'}
          </label>

          {type === 'Return' ? (
            <select {...register('investmentId', { required: 'Choose an investment' })} className="w-full rounded-2xl bg-ink-900 border border-white/10 px-4 py-3 text-white outline-none">
              <option value="">Choose investment…</option>
              {investments.filter((item) => item.status === 'Active').map((item) => <option key={item.id} value={item.id}>{item.assetName} · {item.assetType}</option>)}
            </select>
          ) : type === 'Investment' ? (
            <input
              type="text"
              placeholder="e.g. Apple, Bitcoin, My Cafe"
              {...register('category', { required: 'Name this holding' })}
              className={`w-full rounded-2xl bg-ink-900 border border-white/10 px-4 py-3 outline-none focus:ring-2 ${typeRing[type]} transition`}
            />
          ) : (
            <div className="relative">
              <input
                type="text"
                placeholder="Choose or type a category…"
                autoComplete="off"
                role="combobox"
                aria-autocomplete="list"
                aria-expanded={categoryOpen}
                aria-controls="omni-category-options"
                {...categoryField}
                onFocus={() => { setCategoryQuery(''); setCategoryOpen(true); }}
                onChange={(event) => { categoryField.onChange(event); setCategoryQuery(event.target.value); setCategoryOpen(true); }}
                onBlur={(event) => { categoryField.onBlur(event); window.setTimeout(() => setCategoryOpen(false), 120); }}
                className={`w-full rounded-2xl bg-ink-900 border border-white/10 px-4 py-3 pr-11 outline-none focus:ring-2 ${typeRing[type]} transition`}
              />
              <button type="button" aria-label="Show all categories" onMouseDown={(event) => event.preventDefault()} onClick={() => { setCategoryQuery(''); setCategoryOpen((open) => !open); }} className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-slate-400 hover:text-white">
                <span aria-hidden="true" className={`transition-transform ${categoryOpen ? 'rotate-180' : ''}`}>⌄</span>
              </button>
              {categoryOpen && (
                <div id="omni-category-options" role="listbox" className="absolute left-0 right-0 top-full z-30 mt-2 max-h-52 overflow-y-auto rounded-2xl border border-white/10 bg-[#0b100d] p-2 shadow-2xl shadow-black/50">
                  <p className="px-2 pb-1.5 pt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">{categoryQuery ? 'Matching categories' : 'All categories'}</p>
                  {visibleCategoryChoices.length ? visibleCategoryChoices.map((category) => (
                    <button key={category} type="button" role="option" aria-selected={categoryValue === category} onMouseDown={(event) => event.preventDefault()} onClick={() => { setValue('category', category, { shouldValidate: true }); setCategoryQuery(''); setCategoryOpen(false); }} className={`block w-full rounded-xl px-3 py-2 text-left text-sm transition ${categoryValue === category ? 'bg-green-300/10 text-green-100' : 'text-slate-300 hover:bg-white/[0.06] hover:text-white'}`}>
                      {category}
                    </button>
                  )) : (
                    <p className="px-3 py-2 text-xs leading-5 text-slate-500">No saved match. You can still use “{categoryQuery}” as a custom category.</p>
                  )}
                </div>
              )}
            </div>
          )}
          {errors.investmentId && <p className="mt-1 text-xs text-accent-expense">{errors.investmentId.message}</p>}
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
                    onClick={() => { setValue('category', c, { shouldValidate: true }); setCategoryQuery(''); setCategoryOpen(false); }}
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

        {type === 'Return' && (
          <label className="flex items-start gap-2 text-xs leading-5 text-slate-300">
            <input type="checkbox" {...register('sale')} className="mt-1 accent-green-400" />
            This is a full sale: the entered proceeds go to savings and this holding closes. Uncheck for dividends or profit payouts that leave the holding active.
          </label>
        )}

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
            : type === 'Return' ? 'Add investment payout to savings' : `Add ${type}`}
        </motion.button>

        <AnimatePresence>
          {status === 'error' && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center text-sm text-accent-expense"
            >
              Couldn’t save — {errorMessage}
            </motion.p>
          )}
        </AnimatePresence>
      </form>
    </motion.div>
  );
}
