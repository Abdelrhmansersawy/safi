/* ═══════════════════════════════════════════════════════════════
   bill — builds the printable/PDF document from current state.
   Kept apart from pdf.js: this only produces DOM, so it can be
   rendered, inspected and screenshotted without generating a PDF.
   ═══════════════════════════════════════════════════════════════ */
import { state } from "./state.js";
import { balances, computeMoves, sharesOf, totals, toMajor } from "./settle.js";
import { t, L } from "./i18n.js";
import { esc, initial } from "./utils.js";
import { amount, count, palette } from "./format.js";

/* stable per-day bill number: reprinting the same day gives the same number,
   and the format sorts chronologically */
export function billNo(){
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,"0")}${String(d.getDate()).padStart(2,"0")}-${String(state.expenses.length).padStart(3,"0")}`;
}

export function buildBill(){

  const now = new Date();
  /* -u-nu-latn keeps the date in Latin digits — every amount on this page is
     Latin, and mixing ٩ with 150.00 on one document reads as a mistake */
  const date = now.toLocaleDateString(L().locale, {year:"numeric", month:"long", day:"numeric"});
  const time = now.toLocaleTimeString(L().locale, {hour:"2-digit", minute:"2-digit"});
  const no = `SF-${billNo()}`;

  const total = state.expenses.reduce((s,e) => s + e.amount, 0);
  const b = balances();
  const moves = computeMoves();
  const cur = esc(state.cur);
  const paid = {};
  state.people.forEach(p => paid[p] = 0);
  state.expenses.forEach(e => paid[e.payer] += e.amount);

  const el = document.getElementById("bill");
  el.dir = L().dir;
  el.lang = L().lang;

  el.innerHTML = `
    <div class="b-top">
      <!-- a text glyph, not the inline SVG the app header uses:
           html2canvas silently drops the SVG and leaves an empty blue box -->
      <div class="b-mark">=</div>
      <div class="b-id">${t("brand")}<span>${t("b_sub")}</span></div>
      <div class="b-meta">
        <span>${t("b_no")}</span>
        <b>${no}</b>
        <span>${date} · ${time}</span>
      </div>
    </div>

    <div class="b-head">
      <div class="t">
        <h2 class="b-title">${esc(state.name || t("b_noname"))}</h2>
        <p class="b-sub">${t("b_legal")}</p>
      </div>
      <dl class="b-total">
        <dt>${t("b_total")}</dt>
        <dd>${amount(toMajor(total))} <small>${cur}</small></dd>
      </dl>
    </div>

    <dl class="b-stats">
      <div><dt>${t("b_people")}</dt><dd><span class="v">${count(state.people.length)}</span></dd></div>
      <div><dt>${t("b_count")}</dt><dd><span class="v">${count(state.expenses.length)}</span></dd></div>
      <div><dt>${t("b_avg")}</dt><dd><span class="v">${amount(toMajor(Math.round(total / state.people.length)))}</span> <small>${cur}</small></dd></div>
      <div><dt>${t("b_moves")}</dt><dd><span class="v">${count(moves.length)}</span></dd></div>
    </dl>

    <div class="b-sec">
      <h3>${t("b_details")} <span class="c">${t("b_items", count(state.expenses.length))}</span></h3>
      <table>
        <colgroup>
          <col style="width:7%"><col style="width:27%"><col style="width:18%">
          <col style="width:22%"><col style="width:12%"><col style="width:14%">
        </colgroup>
        <thead><tr>
          <th>${t("b_hash")}</th><th>${t("b_desc")}</th><th>${t("b_payer")}</th>
          <th>${t("b_among")}</th><th class="b-num">${t("b_each")}</th><th class="b-num">${t("b_amount")}</th>
        </tr></thead>
        <tbody>${state.expenses.map((e,i) => `
          <tr>
            <td class="b-dim">${count(i+1)}</td>
            <td class="b-strong">${esc(e.desc)}</td>
            <td>${esc(e.payer)}</td>
            <td class="b-dim">${e.among.length === state.people.length ? esc(t("all")) : esc(e.among.join(t("listsep")))}</td>
            <td class="b-num b-dim">${amount(toMajor(sharesOf(e)[e.among[0]]))}</td>
            <td class="b-num b-strong">${amount(e.amount)}</td>
          </tr>`).join("")}
        </tbody>
        <tfoot><tr>
          <td colspan="5">${t("total")}</td>
          <td class="b-num">${amount(toMajor(total))}</td>
        </tr></tfoot>
      </table>
    </div>

    <div class="b-sec">
      <h3>${t("b_ledger")} <span class="c">${t("b_ledger_c")}</span></h3>
      <table>
        <colgroup>
          <col style="width:40%"><col style="width:19%"><col style="width:19%"><col style="width:22%">
        </colgroup>
        <thead><tr>
          <th>${t("b_name")}</th><th class="b-num">${t("b_paid")}</th><th class="b-num">${t("b_share")}</th><th class="b-num">${t("b_balance")}</th>
        </tr></thead>
        <tbody>${state.people.map(p => {
          const v = b[p];
          const share = paid[p] - v;   /* balance = paid − share  ⇒  share = paid − balance */
          const bal = v > 0.005  ? `<span class="lbl">${esc(t("owed"))}</span> <span class="v">${amount(v)}</span>`
                    : v < -0.005 ? `<span class="lbl">${esc(t("owes"))}</span> <span class="v">${amount(-v)}</span>`
                    : `<span class="lbl">${esc(t("clear"))} ✓</span>`;
          return `<tr>
            <td><span class="b-who"><span class="d">${esc(initial(p))}</span>${esc(p)}</span></td>
            <td class="b-num">${amount(toMajor(paid[p]))}</td>
            <td class="b-num">${amount(toMajor(share))}</td>
            <td class="b-num b-bal">${bal}</td>
          </tr>`;
        }).join("")}</tbody>
      </table>
    </div>

    <div class="b-sec">
      <h3>${t("b_settle")}${moves.length ? ` <span class="c">${t("b_settle_c", count(moves.length))}</span>` : ""}</h3>
      ${moves.length ? moves.map((m,i) => `
        <div class="b-move">
          <span class="i">${count(i+1)}</span>
          <span class="p">
            <span class="n">${esc(m.from)}</span>
            <span class="b-dim">${t("b_pays")}</span>
            <span class="n">${esc(m.to)}</span>
          </span>
          <span class="a">${amount(toMajor(m.amount))} <small>${cur}</small></span>
        </div>`).join("")
        : `<div class="b-clear"><b>${t("settled_big")} ✓</b><span>${t("settled_sub")}</span></div>`}
    </div>

    ${moves.length ? `<div class="b-sign">
      <div>${t("b_sign_from")}</div><div>${t("b_sign_to")}</div>
    </div>` : ""}

    <div class="b-foot">
      <span>${t("b_made")} <b>${t("brand")}</b> · ${t("b_slogan")}</span>
      <span class="l">${no}</span>
    </div>`;
}
