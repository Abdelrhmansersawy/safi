/* ═══════════ صافي — project configuration ═══════════ */

/* ⚠ ضع رابط الريبو هنا / put your repository URL here */
export const GITHUB = "https://github.com/sersawy/safi";

/* ─────────────────────────────────────────────────────────────
   SKIN REGISTRY — the first entry is the default.

   To add a skin:
     1. assets/css/skins/<id>.css  — define every token (see tokens.css)
     2. index.html                 — link the stylesheet
     3. add an entry below
     4. assets/js/i18n.js          — a label under `skin:` in each language

   No component CSS and no JS beyond this array needs to change.

   `avatars` is the per-person identity ramp. Two rules: every color must
   pass 4.5:1 against white for the initial on top, and NO red — red means
   debt in this app, and nobody should look "in the red" because of their
   initial. Separate by lightness, not hue, so the set survives colorblindness.

   `font` is injected on first activation. Leave it null when the skin's
   faces are already linked in index.html (true for the default skin).
   ───────────────────────────────────────────────────────────── */
export const SKINS = [
  {
    id: "asil",
    font: null,   // Amiri + Aref Ruqaa ship in index.html — this is the default
    avatars: ["#0E6F67","#1F4E79","#6B2D5B","#5A6B1E",
              "#8A5A2B","#2F4F4F","#3E5C76","#7A5C1E"]
  },
  {
    id: "modern",
    font: "https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap",
    avatars: ["#1B62D6","#0E4C9A","#4785EE","#17395E",
              "#5573A8","#2A4A73","#7A8DA8","#3E4C63"]
  }
];

/* ─────────────────────────────────────────────────────────────
   Page-view counter. A static site cannot count itself, so this
   calls a third-party counter. It is progressive enhancement: if
   the request fails or is blocked, the number simply never appears
   and nothing else is affected. Set `enabled:false` to remove the
   only outbound request the app makes at load.
   ───────────────────────────────────────────────────────────── */
export const COUNTER = {
  enabled: true,
  url: "https://api.counterapi.dev/v1/safi-app/visits/up",
  parse: data => data && (data.count ?? data.value)
};

export const PDF_LIBS = [
  "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"
];
