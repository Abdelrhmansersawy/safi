/* ═══════════════════════════════════════════════════════════════
   main — boot and wiring. The only module that touches events.
   ═══════════════════════════════════════════════════════════════ */
import { GITHUB, COUNTER } from "./config.js";
import { L, t, getLang, setLang, restoreLang, paintStrings } from "./i18n.js";
import { state, selected, setSelected, replaceState, save, restore, fromHash, shareURL,
         stashCurrent, takeStashed, storageBroken } from "./state.js";
import { applyTheme, cycleTheme, cycleSkin, restoreTheme, currentTheme, THEMES } from "./theme.js";
import { render, addPerson, removePerson, addExpense, removeExpense,
         toggleSel, toggleAll, settleUp, clearSettle } from "./ui.js";
import { exportBill } from "./pdf.js";
import { sendToWhatsApp, copyMessage } from "./share.js";
import { toast } from "./utils.js";
import { count } from "./format.js";

/* ── demo — a realistic group, so a first-time visitor sees the point
   of the app before typing anything ── */
const DEMO = {
  ar: { name:"رحلة الساحل الشمالي", cur:"ج.م",
        people:["أحمد","كريم","محمد","يوسف","محمود"],
        items:[["بنزين الطريق", 900, 0, null],
               ["إيجار الشاليه", 2400, 2, null],
               ["عشا مطعم السمك", 1250, 1, null],
               ["قهوة وحاجات", 180, 3, [3, 0]],
               ["تذاكر الأكواريوم", 640, 4, null]] },
  en: { name:"North Coast trip", cur:"$",
        people:["Ahmed","Karim","Mohamed","Youssef","Mahmoud"],
        items:[["Fuel for the drive", 900, 0, null],
               ["Beach house", 2400, 2, null],
               ["Seafood dinner", 1250, 1, null],
               ["Coffee run", 180, 3, [3, 0]],
               ["Aquarium tickets", 640, 4, null]] }
};

function loadDemo(){
  if(state.expenses.length && !confirm(t("c_demo"))) return;
  const d = DEMO[getLang()];
  replaceState({ name:d.name, cur:d.cur, people:d.people.slice(), expenses:[] });
  d.items.forEach(([desc, amount, payer, only], i) => {
    state.expenses.push({
      id: i + 1, desc, amount,
      payer: d.people[payer],
      among: only ? only.map(x => d.people[x]) : d.people.slice()
    });
  });
  setSelected(new Set(state.people));
  history.replaceState(null, "", location.pathname);
  save(); render(); settleUp();
  toast(t("m_demo"));
}

function resetAll(){
  if(state.people.length && !confirm(t("c_reset"))) return;
  replaceState({ name:"", cur:state.cur, people:[], expenses:[] });
  setSelected(new Set());
  history.replaceState(null, "", location.pathname);
  save(); render(); clearSettle();
}

async function share(){
  if(!state.people.length) return toast(t("m_needppl"));
  save();
  const url = shareURL();
  try{
    if(navigator.share){
      await navigator.share({ title:`${t("brand")} · ${state.name || ""}`, url });
      return;
    }
    await navigator.clipboard.writeText(url);
    toast(t("m_copied"));
  }catch(err){
    if(err.name !== "AbortError") prompt(t("share"), url);
  }
}

function applyLang(){
  paintStrings();
  document.getElementById("starBtn").title =
    getLang() === "ar" ? "ادعم صافي بنجمة على GitHub" : "Star Safi on GitHub";
  document.getElementById("langBtn").querySelector(".lbl").textContent = L().other;
  applyTheme();   // its labels are translated too
  render();
}

function toggleLang(){
  setLang(getLang() === "ar" ? "en" : "ar");
  applyLang();
  clearSettle();
}

/* ── events. Rendered rows carry data-action, so one delegated listener
   replaces the inline onclick handlers that module scope would break ── */
function wire(){
  document.body.addEventListener("click", ev => {
    const el = ev.target.closest("[data-action]");
    if(!el) return;
    const { action, idx, id } = el.dataset;
    ({
      "add-person":  () => addPerson(),
      "rm-person":   () => removePerson(Number(idx)),
      "add-expense": () => addExpense(),
      "rm-expense":  () => removeExpense(Number(id)),
      "toggle-sel":  () => toggleSel(Number(idx)),
      "toggle-all":  () => toggleAll(),
      "settle":      () => settleUp(),
      "share":       () => share(),
      "pdf":         () => exportBill(el),
      "whatsapp":    () => sendToWhatsApp(),
      "copy-msg":    () => copyMessage(),
      "demo":        () => loadDemo(),
      "reset":       () => resetAll(),
      "lang":        () => toggleLang(),
      "theme":       () => toast(t("m_theme", cycleTheme())),
      "skin":        () => toast(t("skin_to", cycleSkin()))
    }[action] || (() => {}))();
  });

  document.getElementById("personName").addEventListener("keydown", e => {
    if(e.key === "Enter") addPerson();
  });
  ["desc", "amount"].forEach(id =>
    document.getElementById(id).addEventListener("keydown", e => {
      if(e.key === "Enter") addExpense();
    }));

  document.getElementById("groupName").addEventListener("input", save);
  document.getElementById("currency").addEventListener("change", () => {
    save(); render();
    clearSettle();   /* a shown settlement would keep quoting the old symbol */
  });

  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    if(currentTheme() === "system") applyTheme();
  });
}

/* Page views. Deliberately fire-and-forget: a counter is never worth
   delaying first paint or surfacing an error for. */
async function countView(){
  if(!COUNTER.enabled) return;
  try{
    const res = await fetch(COUNTER.url, {cache:"no-store"});
    const n = COUNTER.parse(await res.json());
    if(!Number.isFinite(Number(n))) return;
    const el = document.getElementById("views");
    el.textContent = `· ${count(Number(n))} ${t("views")}`;
    el.hidden = false;
  }catch(err){ /* offline or blocked — the counter just stays hidden */ }
}

/* ── boot ── */
(function init(){
  document.getElementById("starBtn").href = GITHUB;

  restoreLang();
  restoreTheme();

  let badLink = false, imported = false;
  try{
    if(location.hash.includes("g=")){
      stashCurrent();          /* an import used to destroy the local group */
      imported = fromHash();
    }
    if(!imported) restore();
  }catch(err){ badLink = true; restore(); }

  /* Consume the fragment once imported. Leaving it means every reload re-imports
     the sender's snapshot and silently discards whatever the user added since. */
  if(imported || badLink) history.replaceState(null, "", location.pathname + location.search);

  setSelected(new Set(state.people));
  wire();
  applyLang();
  save();

  if(badLink) setTimeout(() => toast(t("m_badlink")), 400);
  countView();
})();
