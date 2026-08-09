/* ═══════════ shared helpers ═══════════ */
export const esc = s => String(s).replace(/[&<>"']/g,
  c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export const money = v =>
  v.toLocaleString("en-US", {minimumFractionDigits:2, maximumFractionDigits:2});

export const initial = n => (String(n).trim()[0] || "?");

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
