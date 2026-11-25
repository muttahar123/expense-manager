import { useMemo, useState } from 'react';
import { createLoan, recordLoanPayment } from '../lib/api.js';
import { useUser } from '../context/UserContext.jsx';
import { todayISO } from '../constants/finance.js';

function Field({ label, children }) {
  return <label className="block min-w-0 text-xs font-medium text-slate-400"><span className="mb-1.5 block">{label}</span>{children}</label>;
}

function MoneyField(props) {
  return <input {...props} type="number" min="0.01" step="0.01" inputMode="decimal" required className="w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-green-300/40 focus:ring-2 focus:ring-green-300/10" />;
}

export default function LoansDashboard({ loans = [], onRefresh }) {
  const { format } = useUser();
  const [direction, setDirection] = useState('Lent');
  const [personName, setPersonName] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [paymentFor, setPaymentFor] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(todayISO());
  const [paymentNote, setPaymentNote] = useState('');
  const [paymentBusy, setPaymentBusy] = useState(false);

  const summary = useMemo(() => loans.reduce((result, loan) => {
    if (loan.status === 'Open') result[loan.direction] += loan.outstandingAmount;
    return result;
  }, { Lent: 0, Borrowed: 0 }), [loans]);

  const saveLoan = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await createLoan({ direction, personName, amount, dueDate, notes });
      setPersonName('');
      setAmount('');
      setDueDate('');
      setNotes('');
      await onRefresh?.();
    } catch (err) {
      setError(err?.message || 'Could not save this loan.');
    } finally {
      setSaving(false);
    }
  };

  const savePayment = async (event, loan) => {
    event.preventDefault();
    setPaymentBusy(true);
    setError('');
    try {
      await recordLoanPayment(loan, { amount: paymentAmount, date: paymentDate, notes: paymentNote });
      setPaymentFor(null);
      setPaymentAmount('');
      setPaymentNote('');
      await onRefresh?.();
    } catch (err) {
      setError(err?.message || 'Could not record this repayment.');
    } finally {
      setPaymentBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-3 sm:p-4">
          <p className="text-[11px] text-slate-400">People owe you</p>
          <p className="mt-1 text-lg font-semibold tabular-nums text-green-200">{format(summary.Lent)}</p>
        </div>
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-3 sm:p-4">
          <p className="text-[11px] text-slate-400">You owe people</p>
          <p className="mt-1 text-lg font-semibold tabular-nums text-white">{format(summary.Borrowed)}</p>
        </div>
      </div>

      <p className="rounded-xl border border-white/[0.06] bg-black/15 px-3 py-2.5 text-xs leading-5 text-slate-400">
        The savings balance above already reflects these loans: lent money is deducted and borrowed money is added. Repayments reverse that adjustment and stay in the payment history.
      </p>

      <form onSubmit={saveLoan} className="space-y-3 rounded-2xl border border-white/[0.07] bg-black/20 p-3 sm:p-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-white">Add a loan record</h3>
          <div className="flex rounded-full border border-white/[0.08] bg-black/25 p-1" role="group" aria-label="Loan direction">
            {['Lent', 'Borrowed'].map((value) => (
              <button key={value} type="button" onClick={() => setDirection(value)} className={`rounded-full px-3 py-1.5 text-[11px] font-semibold transition ${direction === value ? 'bg-green-300 text-ink-900' : 'text-slate-400 hover:text-white'}`}>
                {value === 'Lent' ? 'I lent' : 'I borrowed'}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={direction === 'Lent' ? 'Person you lent to' : 'Person you borrowed from'}>
            <input value={personName} onChange={(event) => setPersonName(event.target.value)} required maxLength={100} placeholder="Name" className="w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-green-300/40 focus:ring-2 focus:ring-green-300/10" />
          </Field>
          <Field label="Amount"><MoneyField value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0.00" /></Field>
          <Field label="Due date (optional)"><input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} className="w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2.5 text-sm text-white outline-none focus:border-green-300/40" /></Field>
          <Field label="Note (optional)"><input value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={300} placeholder="Add a detail" className="w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-green-300/40" /></Field>
        </div>
        <button disabled={saving} className="w-full rounded-xl bg-green-300 px-4 py-3 text-sm font-semibold text-ink-900 transition hover:bg-green-200 disabled:opacity-50 sm:w-auto">
          {saving ? 'Saving…' : direction === 'Lent' ? 'Add money lent' : 'Add money borrowed'}
        </button>
      </form>

      {error && <p role="alert" className="rounded-xl border border-white/15 bg-white/[0.04] px-3 py-2 text-sm text-white/90">{error}</p>}

      <div className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-white">Your records</h3>
            <p className="mt-1 text-[11px] text-slate-500">Outstanding amount updates as you record repayments.</p>
          </div>
          <span className="text-[11px] text-slate-500">{loans.length} total</span>
        </div>

        {loans.length === 0 ? (
          <p className="rounded-2xl border border-white/[0.06] bg-black/15 px-4 py-6 text-center text-sm text-slate-400">No loans recorded yet.</p>
        ) : loans.map((loan) => {
          const settled = loan.status === 'Settled';
          return (
            <article key={loan.id} className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-3 sm:p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="max-w-full truncate text-sm font-semibold text-white">{loan.direction === 'Lent' ? `Lent to ${loan.personName}` : `Borrowed from ${loan.personName}`}</h4>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${settled ? 'bg-white/[0.06] text-slate-400' : 'bg-green-300/10 text-green-200'}`}>{loan.status}</span>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500">Started {new Date(loan.createdAt).toLocaleDateString()}{loan.dueDate ? ` · Due ${new Date(`${loan.dueDate}T00:00:00`).toLocaleDateString()}` : ''}</p>
                </div>
                <div className="shrink-0 sm:text-right">
                  <p className="text-base font-semibold tabular-nums text-white">{format(loan.outstandingAmount)}</p>
                  <p className="text-[11px] text-slate-500">of {format(loan.principalAmount)} remaining</p>
                </div>
              </div>

              {loan.notes && <p className="mt-2 text-xs text-slate-400">{loan.notes}</p>}
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.06] pt-3">
                <span className="text-[11px] text-slate-500">{format(loan.repaidAmount)} repaid · {loan.payments.length} {loan.payments.length === 1 ? 'payment' : 'payments'}</span>
                {!settled && <button type="button" onClick={() => { setPaymentFor(paymentFor === loan.id ? null : loan.id); setError(''); }} className="rounded-full border border-green-300/20 bg-green-300/[0.06] px-3 py-1.5 text-xs font-semibold text-green-100 transition hover:bg-green-300/10">{loan.direction === 'Lent' ? 'Record received' : 'Record repayment'}</button>}
              </div>

              {paymentFor === loan.id && !settled && (
                <form onSubmit={(event) => savePayment(event, loan)} className="mt-3 grid gap-2 rounded-xl border border-white/[0.06] bg-black/20 p-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                  <Field label="Amount received/paid"><MoneyField value={paymentAmount} onChange={(event) => setPaymentAmount(event.target.value)} max={loan.outstandingAmount} placeholder="0.00" /></Field>
                  <Field label="Date"><input type="date" value={paymentDate} onChange={(event) => setPaymentDate(event.target.value)} required className="w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2.5 text-sm text-white outline-none focus:border-green-300/40" /></Field>
                  <button disabled={paymentBusy} className="rounded-xl bg-green-300 px-4 py-2.5 text-xs font-semibold text-ink-900 disabled:opacity-50">{paymentBusy ? 'Saving…' : 'Save payment'}</button>
                  <Field label="Payment note (optional)"><input value={paymentNote} onChange={(event) => setPaymentNote(event.target.value)} maxLength={300} placeholder="Note" className="w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-green-300/40" /></Field>
                </form>
              )}

              {loan.payments.length > 0 && (
                <details className="mt-3 border-t border-white/[0.06] pt-2">
                  <summary className="cursor-pointer text-xs text-slate-400 hover:text-white">Payment history</summary>
                  <ul className="mt-2 divide-y divide-white/[0.05]">
                    {loan.payments.map((payment) => <li key={payment.id} className="flex min-w-0 justify-between gap-3 py-2 text-xs"><span className="min-w-0 truncate text-slate-400">{new Date(`${payment.date}T00:00:00`).toLocaleDateString()}{payment.notes ? ` · ${payment.notes}` : ''}</span><span className="shrink-0 font-medium text-white">{format(payment.amount)}</span></li>)}
                  </ul>
                </details>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
