/* ═══════════ the math — kept apart from any DOM ═══════════ */
import { state } from "./state.js";

export function balances(){
  const b = {};
  state.people.forEach(p => b[p] = 0);
  state.expenses.forEach(e => {
    const share = e.amount / e.among.length;
    b[e.payer] += e.amount;
    e.among.forEach(p => b[p] -= share);
  });
  return b;
}

/* Greedy, largest-first: pairing the biggest debtor with the biggest creditor
   settles at least one of them per transfer, which is what keeps the count
   minimal. Shared by the screen and the PDF, so paper can never disagree
   with what the user was shown. */
export function computeMoves(){
  const b = balances();
  const debtors = Object.entries(b)
    .filter(([, v]) => v < -0.005).map(([n, v]) => ({n, v:-v}))
    .sort((a, c) => c.v - a.v);
  const creditors = Object.entries(b)
    .filter(([, v]) => v > 0.005).map(([n, v]) => ({n, v}))
    .sort((a, c) => c.v - a.v);

  const moves = [];
  let i = 0, j = 0;
  while(i < debtors.length && j < creditors.length){
    const m = Math.min(debtors[i].v, creditors[j].v);
    moves.push({from: debtors[i].n, to: creditors[j].n, amount: m});
    debtors[i].v -= m;
    creditors[j].v -= m;
    if(debtors[i].v < 0.005) i++;
    if(creditors[j].v < 0.005) j++;
  }
  return moves;
}

export function totals(){
  const total = state.expenses.reduce((s, e) => s + e.amount, 0);
  const paid = {};
  state.people.forEach(p => paid[p] = 0);
  state.expenses.forEach(e => paid[e.payer] += e.amount);
  return { total, paid };
}
