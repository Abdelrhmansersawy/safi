# Contributing

No build step, no dependencies. Serve the folder and edit.

```bash
python3 -m http.server 8000
```

ES modules require HTTP — opening `index.html` from disk will fail on CORS.

## Ground rules

**Components never name a color.** Everything in `components.css` reads a token.
If you find yourself writing a hex value outside `assets/css/skins/`, that belongs
in a skin.

**Strings never live in markup or logic.** Add a key to both languages in
`assets/js/i18n.js` and reference it with `data-i18n` (markup) or `t()` (JS).
Untranslated copy is a bug.

**No inline event handlers.** Module scope is not global, so `onclick="fn()"`
silently breaks. Rendered elements carry `data-action`; one delegated listener
in `main.js` dispatches them.

**Escape everything user-typed.** Names and descriptions flow into `innerHTML`.
Use `esc()` from `utils.js` — there is no exception to this.

## Adding a theme

1. **`assets/css/skins/<id>.css`** — define every token listed at the top of
   `assets/css/tokens.css`, for all three color states: bare `:root[data-skin="<id>"]`
   (light), `@media (prefers-color-scheme: dark)` guarded with
   `:root[data-skin="<id>"]:not([data-theme="light"])`, and
   `:root[data-skin="<id>"][data-theme="dark"]`. Miss the third and the manual
   toggle won't work; miss the second and OS dark mode won't.

2. **`index.html`** — link the stylesheet. Skins are scoped by `[data-skin]`, so
   all of them can be linked at once without conflicting.

3. **`assets/js/config.js`** — add an entry to `SKINS`:

   ```js
   { id: "<id>",
     font: "https://fonts.googleapis.com/...",   // or null if linked in index.html
     avatars: ["#…", …] }                        // 8 colors
   ```

   The first entry in the array is the default skin.

4. **`assets/js/i18n.js`** — add a label under `skin:` in every language.

Nothing else changes. Ornament beyond tokens (patterns, flourishes) goes in its
own file scoped to `[data-skin="<id>"]`, like `skins/asil-ornament.css`.

### Contrast requirements

Measure text against the card it sits on, not against white:

| token | minimum |
|---|---|
| `--ink` | 12:1 |
| `--ink-2` | 7:1 |
| `--ink-3` | 4.5:1 |
| `--accent` (as text) | 4.5:1 |
| `--btn-fg` on `--btn` | 4.5:1 |

In dark mode, target **6:1** for body text rather than 4.5:1 — light-on-dark reads
measurably worse. Never use pure `#000` as a dark ground: it haloes around thin
Arabic letterforms.

`avatars` colors must pass 4.5:1 against white, and must contain **no red** — red
means debt in this app, and nobody should look "in the red" because of their initial.

## Adding a language

Add a block to `I18N` in `assets/js/i18n.js` with every key from an existing
language, plus `dir`, `locale`, `nums`, and `listsep`. Then extend the toggle in
`main.js` if you are going past two languages.

Translate the register, not the words. The Arabic is spoken Egyptian; a literal
rendering of «مين دفع إيه؟» into formal English reads like a tax form.

## Touching the invoice

`bill.js` builds DOM; `pdf.js` rasterizes it. Two rules that are not obvious:

- **No `letter-spacing` and no `overflow-wrap: anywhere` inside `#bill`.** Either
  makes html2canvas lay text out glyph-by-glyph, which severs Arabic joining
  («فاتورة» → «ف ا ت و ر ة») and eats the spaces between words.
- **No inline SVG inside `#bill`.** html2canvas silently drops it and leaves a gap.

To check a change, render the invoice and look at the actual PDF — not the DOM.
The DOM can look perfect while the capture is broken.
