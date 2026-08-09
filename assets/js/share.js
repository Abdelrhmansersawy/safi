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
import { computeMoves, toMajor, toCents } from "./settle.js";
import { t } from "./i18n.js";
/* money(), NOT amount(): amount() renders Arabic-Indic numerals in the أصيل
   skin, and this message leaves the app — recipients paste these figures into
   InstaPay, a wallet app or a bank, all of which expect Latin digits. The skin
   is a property of our surface, and the message has left it. */
import { money } from "./utils.js";
import { toast } from "./utils.js";

/* WhatsApp truncates very long prefilled text, and the share link already
   carries the whole group in its fragment. Past this, drop the transfer
   list and let the link speak — the link is the part that cannot be
   reconstructed. */
/* The real limit is on the percent-encoded URL, not the raw string: Arabic
   encodes to ~9 bytes per character, so a 1,336-character message becomes a
   2,086-character URL. Measure what actually travels. */
const MAX_URL = 1900;

export function buildMessage({ withLink = true } = {}){
  const moves = computeMoves();
  const total = toMajor(state.expenses.reduce((s, e) => s + toCents(e.amount), 0));
  const cur = state.cur;
  const title = state.name || t("b_noname");

  const lines = [];
  lines.push(`🧾 ${t("brand")} — ${title}`);
  lines.push("");
  lines.push(`${t("b_total")}: ${money(total)} ${cur}`);

  if(moves.length){
    lines.push("");
    lines.push(`${t("b_settle")}:`);
    /* Each line starts with an Arabic name, so the paragraph resolves RTL and
       the trailing amount lands correctly. Do not lead with a digit here. */
    moves.forEach(m => {
      /* U+200F RLM: WhatsApp picks each line's base direction from its first
         strong character, so a line starting with a Latin name flips the whole
         line and reorders the Arabic around it. */
      lines.push(`\u200F• ${m.from} ${t("b_pays")} ${m.to}: ${money(toMajor(m.amount))} ${cur}`);
    });
  }else{
    lines.push("");
    lines.push(`${t("settled_big")} — ${t("settled_sub")}`);
  }

  /* The app absorbing the social cost is the whole premise: a reminder that
     reads as a reminder, not as a demand. */
  lines.push("");
  lines.push(t("wa_ps"));

  const text = lines.join("\n");
  if(!withLink) return text;

  const url = shareURL();
  const full = `${text}\n\n${t("wa_details")}\n${url}`;
  /* keep the link and shed the detail, never the other way round — the link is
     the only part that cannot be reconstructed from the message */
  if(encodeURIComponent(full).length <= MAX_URL) return full;

  return [lines[0], "", `${t("b_total")}: ${money(total)} ${cur}`,
          "", t("wa_ps"), "", t("wa_details"), url].join("\n");
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
