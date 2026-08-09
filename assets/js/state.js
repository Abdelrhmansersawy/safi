/* ═══════════ state — the single source of truth ═══════════ */
import { encodeState, decodeState } from "./utils.js";

export const state = { name:"", cur:"ج.م", people:[], expenses:[] };
export let selected = new Set();

export function setSelected(next){ selected = next; }

export function replaceState(next){
  state.name = next.name || "";
  state.cur = next.cur || "ج.م";
  state.people = Array.isArray(next.people) ? next.people : [];
  state.expenses = Array.isArray(next.expenses) ? next.expenses : [];
}

export function save(){
  try{ localStorage.setItem("safi", JSON.stringify(state)); }catch(e){}
}

export function restore(){
  try{
    const s = JSON.parse(localStorage.getItem("safi"));
    if(s && Array.isArray(s.people)){ replaceState(s); return true; }
  }catch(e){}
  return false;
}

export function fromHash(){
  const m = location.hash.match(/g=([^&]+)/);
  if(!m) return false;
  replaceState(decodeState(m[1]));
  return true;
}

export const shareURL = () =>
  location.origin + location.pathname + "#g=" + encodeState(state);

export function nextExpenseId(){
  return state.expenses.length ? Math.max(...state.expenses.map(e => e.id)) + 1 : 1;
}
