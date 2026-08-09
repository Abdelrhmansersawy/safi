/* ═══════════ shared helpers ═══════════ */
export const esc = s => String(s).replace(/[&<>"']/g,
  c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export const money = v =>
  v.toLocaleString("en-US", {minimumFractionDigits:2, maximumFractionDigits:2});

/* [0] on "🙂 محمد" returns half a surrogate pair and renders as �.
   Spreading iterates code points. */
export const initial = n => ([...String(n).trim()][0] || "?");

/* Identity key for duplicate detection. «احمد» and «أحمد» are the same person
   to everyone except a string comparison — and two near-identical chips
   produce a settlement telling someone to pay themselves. Normalizes the
   comparison only; the name is always stored exactly as typed. */
export const normKey = n => String(n)
  .normalize("NFKC")
  .replace(/[\u064B-\u0652\u0670]/g, "")   // harakat
  .replace(/[أإآٱ]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه")
  .replace(/\s+/g, " ")
  .trim()
  .toLowerCase();

export const $  = sel => document.querySelector(sel);
export const $$ = sel => [...document.querySelectorAll(sel)];

let toastTimer;
export function toast(msg){
  const el = document.getElementById("toastMsg");
  if(!el) return;
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 2600);
}

/* base64url so a shared group survives being pasted into any chat app */
export const encodeState = o =>
  btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(o))))
    .replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");

export const decodeState = s =>
  JSON.parse(new TextDecoder().decode(
    Uint8Array.from(atob(s.replace(/-/g,"+").replace(/_/g,"/")), c => c.charCodeAt(0))));

export const loadScript = src => new Promise((resolve, reject) => {
  const el = document.createElement("script");
  el.src = src;
  el.onload = resolve;
  el.onerror = () => reject(new Error("offline"));
  document.head.appendChild(el);
});
