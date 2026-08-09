/* ═══════════════════════════════════════════════════════════════
   settle — the math, with no DOM and no storage.

   Everything here works in INTEGER MINOR UNITS (piastres/cents).
   Floats made the printed numbers disagree with each other: 100.00
   split three ways rendered three transfers of 33.33 against a stated
   total of 100.00. In cents the shares foot exactly, and the screen,
   the message and the PDF agree by construction rather than by luck.
   Amounts stay in major units in storage, so old links still parse.
   ═══════════════════════════════════════════════════════════════ */
import { state } from "./state.js";

export const CENTS = 100;
export const toCents = v => Math.round(Number(v) * CENTS);
export const toMajor = c => c / CENTS;

/* A person may legitimately be called "__proto__". On a plain object that
   assignment mutates the prototype instead of creating a key, and the person
   disappears from every balance. A null-prototype object has no such key. */
const bag = keys => {
  const o = Object.create(null);
  keys.forEach(k => o[k] = 0);
  return o;
};

/* Each person's share of one expense, in cents, summing EXACTLY to the total.
   Largest-remainder with an `among`-order tiebreak: `among` is roster order and
   travels inside the share link, so the extra piastre lands on the same person
   on every device and on paper. */
export function sharesOf(expense){
  const total = toCents(expense.amount);
  const among = expense.among;
  const n = among.length;
  const out = Object.create(null);
  if(!n) return out;

  const base = Math.floor(total / n);
  const remainder = total - base * n;     // 0 … n-1
  among.forEach((p, i) => { out[p] = base + (i < remainder ? 1 : 0); });
  return out;
}

/* name → balance in cents. Positive means they are owed. */
export function balances(){
  const b = bag(state.people);
  for(const e of state.expenses){
    const shares = sharesOf(e);
    if(e.payer in b) b[e.payer] += toCents(e.amount);
    for(const p in shares) if(p in b) b[p] -= shares[p];
  }
  return b;
}

/* Greedy, largest-first: pairing the biggest debtor with the biggest creditor
   settles at least one of them per transfer, which is what keeps the count
   minimal. Amounts are cents, so the loop terminates exactly at zero. */
export function computeMoves(){
  const b = balances();
  const debtors   = Object.keys(b).filter(n => b[n] < 0)
    .map(n => ({ n, v: -b[n] })).sort((a, c) => c.v - a.v);
  const creditors = Object.keys(b).filter(n => b[n] > 0)
    .map(n => ({ n, v: b[n] })).sort((a, c) => c.v - a.v);

  const moves = [];
  let i = 0, j = 0;
  while(i < debtors.length && j < creditors.length){
    const m = Math.min(debtors[i].v, creditors[j].v);
    if(m > 0) moves.push({ from: debtors[i].n, to: creditors[j].n, amount: m });
    debtors[i].v -= m;
    creditors[j].v -= m;
    if(debtors[i].v === 0) i++;
    if(creditors[j].v === 0) j++;
  }
  return moves;
}

export function totals(){
  const total = state.expenses.reduce((s, e) => s + toCents(e.amount), 0);
  const paid = bag(state.people);
  for(const e of state.expenses) if(e.payer in paid) paid[e.payer] += toCents(e.amount);
  return { total, paid };
}
