/* ═══════════════════════════════════════════════════════════════
   share — turning a settlement into a message someone can send.

   The reason this exists: research on this product category finds the
   dominant failure is not bad arithmetic, it is that nobody closes the
   loop — people pay in cash and never mark it, and chasing friends for
   money is socially expensive. So the app does the asking. One tap
   produces a message the organizer can drop into the group chat.

   Plain text only, by design: it has to read correctly in any chat app,
   and be forwardable by someone who never opens صافي.
   ═══════════════════════════════════════════════════════════════ */
import { state, shareURL } from "./state.js";
import { computeMoves } from "./settle.js";
import { t } from "./i18n.js";
import { amount } from "./format.js";
import { toast } from "./utils.js";

/* WhatsApp truncates very long prefilled text, and the share link already
   carries the whole group in its fragment. Past this, drop the transfer
   list and let the link speak — the link is the part that cannot be
   reconstructed. */
const MAX_TEXT = 1600;

export function buildMessage({ withLink = true } = {}){
  const moves = computeMoves();
  const total = state.expenses.reduce((s, e) => s + e.amount, 0);
  const cur = state.cur;
  const title = state.name || t("b_noname");

  const lines = [];
  lines.push(`🧾 ${t("brand")} — ${title}`);
  lines.push("");
  lines.push(`${t("b_total")}: ${amount(total)} ${cur}`);

  if(moves.length){
    lines.push("");
    lines.push(`${t("b_settle")}:`);
    /* Each line starts with an Arabic name, so the paragraph resolves RTL and
       the trailing amount lands correctly. Do not lead with a digit here. */
    moves.forEach(m => {
      lines.push(`• ${m.from} ${t("b_pays")} ${m.to}: ${amount(m.amount)} ${cur}`);
    });
  }else{
    lines.push("");
    lines.push(`${t("settled_big")} — ${t("settled_sub")}`);
  }

  let text = lines.join("\n");

  if(withLink){
    const url = shareURL();
    const withUrl = `${text}\n\n${t("wa_details")}\n${url}`;
    /* keep the link and shed the detail, never the other way round */
    if(withUrl.length <= MAX_TEXT) return withUrl;
    const short = [lines[0], "", `${t("b_total")}: ${amount(total)} ${cur}`,
                   "", t("wa_details"), url].join("\n");
    return short;
  }
  return text;
}

/* wa.me works on every platform: it opens the installed app when there is
   one and falls back to WhatsApp Web otherwise, and it does NOT require
   knowing anyone's phone number — the sender picks the chat. */
export function sendToWhatsApp(){
  if(!state.expenses.length) return toast(t("m_none"));
  const text = buildMessage();
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener");
}

export async function copyMessage(){
  if(!state.expenses.length) return toast(t("m_none"));
  const text = buildMessage();
  try{
    await navigator.clipboard.writeText(text);
    toast(t("m_msg_copied"));
  }catch{
    /* clipboard is blocked without a secure context or user gesture —
       a prompt still lets the user copy manually */
    prompt(t("wa_copy"), text);
  }
}
