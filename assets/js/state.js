/* ═══════════ state — the single source of truth ═══════════ */
import { encodeState, decodeState, normKey } from "./utils.js";

export const state = { name:"", cur:"ج.م", people:[], expenses:[] };
export let selected = new Set();

export function setSelected(next){ selected = next; }

/* A shared link is untrusted input: anyone can hand-edit the fragment, and an
   older build may have written a shape this one no longer expects. Without this,
   a decodable-but-nonsense payload propagates NaN through every balance and into
   the signed PDF. Everything that cannot be repaired is dropped, not guessed. */
export function sanitize(next){
  const people = [];
  const seen = new Set();
  for(const raw of (Array.isArray(next.people) ? next.people : [])){
    const name = String(raw ?? "").trim().slice(0, 40);
    if(!name) continue;
    const key = normKey(name);
    if(seen.has(key)) continue;      // a duplicate would be told to pay itself
    seen.add(key);
    people.push(name);
  }

  const expenses = [];
  let nextId = 1;
  for(const raw of (Array.isArray(next.expenses) ? next.expenses : [])){
    if(!raw || typeof raw !== "object") continue;
    const amount = Number(raw.amount);
    if(!Number.isFinite(amount) || amount <= 0) continue;
    if(!people.includes(raw.payer)) continue;
    const among = (Array.isArray(raw.among) ? raw.among : []).filter(p => people.includes(p));
    if(!among.length) continue;
    const id = Number.isFinite(Number(raw.id)) ? Number(raw.id) : nextId;
    nextId = Math.max(nextId, id) + 1;
    expenses.push({
      id,
      desc: String(raw.desc ?? "").trim().slice(0, 80),
      amount: Math.round(amount * 100) / 100,   // money has two decimals
      payer: raw.payer,
      among
    });
  }

  return {
    name: String(next.name ?? "").slice(0, 60),
    cur: String(next.cur || "ج.م").slice(0, 6),
    people,
    expenses
  };
}

export function replaceState(next){
  const clean = sanitize(next);
  state.name = clean.name;
  state.cur = clean.cur;
  state.people = clean.people;
  state.expenses = clean.expenses;
}

/* iOS private browsing and a full quota both make writes throw. The footer
   promises the data is kept on the device, so a silent failure is a lie —
   the caller surfaces it instead. */
export let storageBroken = false;

/* The two fields a user edits directly in the chrome rather than through a
   form submit. save() deliberately does not read the DOM — state.js must not
   know about elements — so the handlers push the values in. Leaving this out
   is what made a typed group name vanish from the link, the message and the
   invoice, and made the currency select snap back on every change. */
export function setName(v){ state.name = String(v).slice(0, 60); }
export function setCurrency(v){ state.cur = String(v).slice(0, 6); }

export function save(){
  try{
    localStorage.setItem("safi", JSON.stringify(state));
  }catch(e){
    storageBroken = true;
  }
}

export function restore(){
  try{
    const s = JSON.parse(localStorage.getItem("safi"));
    if(s && Array.isArray(s.people)){ replaceState(s); return true; }
  }catch(e){}
  return false;
}

/* Anchored, so an unrelated fragment like #img=... or #lang=ar is not mistaken
   for a Safi payload and reported as a broken link. */
export function fromHash(){
  const m = location.hash.match(/(?:^#|&)g=([^&]+)/);
  if(!m) return false;
  replaceState(decodeState(m[1]));
  return true;
}

/* Importing a link used to overwrite whatever group was already on the device,
   with no way back. Keep the outgoing one so it can be offered as a rescue. */
export function stashCurrent(){
  try{
    const prev = localStorage.getItem("safi");
    if(prev && JSON.parse(prev)?.people?.length) localStorage.setItem("safi-prev", prev);
  }catch(e){}
}

export function takeStashed(){
  try{
    const prev = localStorage.getItem("safi-prev");
    localStorage.removeItem("safi-prev");
    return prev ? JSON.parse(prev) : null;
  }catch(e){ return null; }
}

export const shareURL = () =>
  location.origin + location.pathname + "#g=" + encodeState(state);

export function nextExpenseId(){
  /* one id-less row makes Math.max return NaN, which makes every later
     `e.id !== id` comparison true — and the delete button stops working
     on every expense, not just that one */
  const ids = state.expenses.map(e => Number(e.id)).filter(Number.isFinite);
  return ids.length ? Math.max(...ids) + 1 : 1;
}
