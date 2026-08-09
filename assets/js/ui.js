/* ═══════════════════════════════════════════════════════════════
   ui — every render path.
   Rows carry data-action / data-idx attributes instead of inline
   onclick handlers: module scope is not global, so `onclick="fn()"`
   silently breaks once the app is split into ES modules. One
   delegated listener in main.js reads these instead.
   ═══════════════════════════════════════════════════════════════ */
import { state, selected, setSelected, save, nextExpenseId } from "./state.js";
import { balances, computeMoves } from "./settle.js";
import { t } from "./i18n.js";
import { esc, initial, toast } from "./utils.js";
import { amount, count, palette } from "./format.js";

const colorOf = n => palette()[state.people.indexOf(n) % palette().length];
const fmt = v => `<span class="num">${amount(v)}</span> ${esc(state.cur)}`;

/* ── people ── */
export function addPerson(){
  const input = document.getElementById("personName");
  const name = input.value.trim();
  if(!name) return;
  if(state.people.includes(name)) return toast(t("m_exists"));
  state.people.push(name);
  selected.add(name);
  input.value = "";
  input.focus();
  save();
  render();
}

export function removePerson(idx){
  const name = state.people[idx];
  if(name === undefined) return;
  const used = state.expenses.some(e => e.payer === name || e.among.includes(name));
  if(used && !confirm(t("c_person", name))) return;

  state.people.splice(idx, 1);
  state.expenses = state.expenses
    .filter(e => e.payer !== name)
    .map(e => ({...e, among: e.among.filter(p => p !== name)}))
    .filter(e => e.among.length);
  selected.delete(name);
  save();
  render();
  clearSettle();
}

/* ── expenses ── */
export function addExpense(){
  const amount = parseFloat(document.getElementById("amount").value);
  const payer = document.getElementById("payer").value;
  const desc = document.getElementById("desc").value.trim();
  const among = state.people.filter(p => selected.has(p));

  if(state.people.length < 2) return toast(t("m_two"));
  if(!(amount > 0)) return toast(t("m_amount"));
  if(!payer) return toast(t("m_payer"));
  if(!among.length) return toast(t("m_split"));

  state.expenses.push({ id: nextExpenseId(), desc: desc || t("b_desc"), amount, payer, among });
  document.getElementById("amount").value = "";
  document.getElementById("desc").value = "";
  document.getElementById("desc").focus();
  save();
  render();
  clearSettle();
  toast(t("m_saved"));
}

export function removeExpense(id){
  state.expenses = state.expenses.filter(e => e.id !== id);
  save();
  render();
  clearSettle();
}

export function toggleSel(idx){
  const name = state.people[idx];
  selected.has(name) ? selected.delete(name) : selected.add(name);
  renderSplit();
}

export function toggleAll(){
  const all = state.people.length && state.people.every(p => selected.has(p));
  setSelected(all ? new Set() : new Set(state.people));
  renderSplit();
}

/* ── settlement ── */
export function settleUp(){
  if(!state.expenses.length) return toast(t("m_none"));
  const moves = computeMoves();
  const box = document.getElementById("settle");

  if(!moves.length){
    box.innerHTML = `<div class="clear">
      <div class="big">${t("settled_big")} ✓</div>
      <div class="sub">${t("settled_sub")}</div></div>`;
  }else{
    box.innerHTML = `<div class="card">
      <h2><span class="n">✓</span> ${t("settle_title", count(moves.length))}</h2>
      <p class="hint">${t("settle_hint")}</p>` +
      moves.map(m => `<div class="pay">
        <div class="av" style="background:${colorOf(m.from)}">${esc(initial(m.from))}</div>
        <div class="who">${esc(m.from)}</div>
        <div class="arrow">${t("pays_to")}</div>
        <div class="av" style="background:${colorOf(m.to)}">${esc(initial(m.to))}</div>
        <div class="who">${esc(m.to)}</div>
        <div class="amt">${fmt(m.amount)}</div>
      </div>`).join("") + shareActions() + `</div>`;
  }
  box.scrollIntoView({behavior:"smooth", block:"center"});
}

/* The point of the whole app is that this message gets sent — so the action
   sits at the end of the settlement, where the user has just seen the answer,
   rather than buried in the bottom bar. */
function shareActions(){
  return `<div class="send">
    <p class="hint">${esc(t("wa_hint"))}</p>
    <div class="send-row">
      <button class="btn wa" data-action="whatsapp">
        <span aria-hidden="true">💬</span> ${esc(t("wa_send"))}
      </button>
      <button class="btn btn-soft" data-action="copy-msg">${esc(t("wa_copy"))}</button>
    </div>
  </div>`;
}

export const clearSettle = () => { document.getElementById("settle").innerHTML = ""; };

/* ── render ── */
export function render(){
  document.getElementById("groupName").value = state.name;
  document.getElementById("currency").value = state.cur;

  const list = document.getElementById("peopleList");
  list.innerHTML = state.people.length
    ? state.people.map((p, i) => `
        <span class="chip">
          <span class="av" style="background:${colorOf(p)}">${esc(initial(p))}</span>
          ${esc(p)}
          <button class="x" data-action="rm-person" data-idx="${i}"
                  aria-label="${esc(t("del"))} ${esc(p)}">×</button>
        </span>`).join("")
    : `<div class="empty" style="width:100%"><span class="ico">👥</span>${esc(t("empty_people"))}</div>`;

  const sel = document.getElementById("payer");
  const prev = sel.value;
  sel.innerHTML = `<option value="">${esc(t("who_paid"))}</option>` +
    state.people.map(p => `<option value="${esc(p)}">${esc(p)}</option>`).join("");
  if(state.people.includes(prev)) sel.value = prev;

  renderSplit();
  renderExpenses();
  renderBalances();
}

export function renderSplit(){
  document.getElementById("splitAmong").innerHTML = state.people.map((p, i) => `
    <button class="toggle" aria-pressed="${selected.has(p)}"
            data-action="toggle-sel" data-idx="${i}">
      ${selected.has(p) ? "✓" : "＋"} ${esc(p)}
    </button>`).join("");

  document.getElementById("allBtn").textContent =
    state.people.length && state.people.every(p => selected.has(p))
      ? t("clear_all") : t("select_all");
}

function renderExpenses(){
  const ul = document.getElementById("expensesList");
  const totalRow = document.getElementById("totalRow");

  if(!state.expenses.length){
    ul.innerHTML = `<div class="empty"><span class="ico">🧾</span>${esc(t("empty_expenses"))}</div>`;
    totalRow.style.display = "none";
    return;
  }

  ul.innerHTML = state.expenses.map(e => {
    const everyone = e.among.length === state.people.length;
    const who = everyone ? esc(t("all")) : esc(e.among.join(t("listsep")));
    return `<li class="exp">
      <div class="av" style="background:${colorOf(e.payer)}">${esc(initial(e.payer))}</div>
      <div class="meta">
        <div class="t">${esc(e.desc)}</div>
        <div class="s"><b>${esc(t("paid_by", e.payer))}</b> · ${who} ·
          ${amount(e.amount / e.among.length)} ${esc(t("per"))}</div>
      </div>
      <div class="amt num">${amount(e.amount)}</div>
      <button class="del" data-action="rm-expense" data-id="${e.id}"
              aria-label="${esc(t("del"))}">🗑</button>
    </li>`;
  }).join("");

  totalRow.style.display = "flex";
  document.getElementById("totalVal").innerHTML =
    fmt(state.expenses.reduce((s, e) => s + e.amount, 0));
}

function renderBalances(){
  const card = document.getElementById("balCard");
  if(!state.expenses.length){ card.style.display = "none"; return; }
  card.style.display = "block";

  const b = balances();
  document.getElementById("balances").innerHTML = state.people.map(p => {
    const v = b[p];
    const cls = v > 0.005 ? "pos" : v < -0.005 ? "neg" : "zero";
    const txt = v > 0.005 ? `${esc(t("owed"))} ${amount(v)}`
              : v < -0.005 ? `${esc(t("owes"))} ${amount(-v)}`
              : esc(t("clear"));
    return `<div class="bal">
      <div class="av" style="background:${colorOf(p)}">${esc(initial(p))}</div>
      <div class="nm">${esc(p)}</div>
      <div class="v ${cls}">${txt}</div>
    </div>`;
  }).join("");
}
