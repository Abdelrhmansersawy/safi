/* ═══════════════════════════════════════════════════════════════
   format — number presentation.
   The أصيل skin renders Arabic-Indic numerals (٠١٢٣) when the
   interface is in Arabic: Latin digits on a Naskh manuscript page
   read as a foreign insert. The modern skin keeps Latin digits,
   where they are the more legible choice for money.
   Grouping and decimals are always computed in en-US, so only the
   glyphs change — never the format.
   ═══════════════════════════════════════════════════════════════ */
import { currentSkin, currentSkinDef } from "./theme.js";
import { getLang } from "./i18n.js";
import { money } from "./utils.js";

const AR_DIGITS = "٠١٢٣٤٥٦٧٨٩";

export const arabize = s => String(s).replace(/[0-9]/g, d => AR_DIGITS[d]);

export const arabicDigits = () => currentSkin() === "asil" && getLang() === "ar";

/* a money value, ready to print */
export const amount = v => arabicDigits() ? arabize(money(v)) : money(v);

/* a bare count (people, expenses, transfers) */
export const count = n => arabicDigits() ? arabize(n) : String(n);

/* the identity ramp belongs to the skin, like every other color */
export const palette = () => currentSkinDef().avatars;
