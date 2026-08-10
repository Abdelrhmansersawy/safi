#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════
   صافي — regenerate the README media
   ───────────────────────────────────────────────────────────────
   Renders the app in each skin × language × color mode, plus an
   animated walkthrough, so the images in the README can never drift
   from the actual UI. Run it after any visual change.

     node tools/screenshots.mjs

   Needs: chromium (or CHROME_BIN), ImageMagick `magick`, and ffmpeg
   for the animation. Missing ffmpeg/magick only skips those steps.
   ═══════════════════════════════════════════════════════════════ */
import { createServer } from "node:http";
import { readFile, writeFile, unlink, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { spawn, spawnSync } from "node:child_process";
import { join, extname, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "docs/media");
const PORT = 8913;
const BROWSER = process.env.CHROME_BIN || "chromium";
const MIME = { ".html":"text/html; charset=utf-8", ".js":"text/javascript; charset=utf-8",
               ".css":"text/css; charset=utf-8", ".svg":"image/svg+xml" };

const serve = () => new Promise(ok => {
  const s = createServer(async (req, res) => {
    const p = decodeURIComponent(req.url.split("?")[0]);
    try{
      const body = await readFile(join(ROOT, p === "/" ? "index.html" : p));
      res.writeHead(200, {"Content-Type": MIME[extname(p)] || "application/octet-stream"});
      res.end(body);
    }catch{ res.writeHead(404).end(); }
  });
  s.listen(PORT, "127.0.0.1", () => ok(s));
});

const capture = (url, out, w, h) => new Promise((ok, fail) => {
  const c = spawn(BROWSER, ["--headless","--disable-gpu","--no-sandbox",
    `--window-size=${w},${h}`, "--virtual-time-budget=9000", `--screenshot=${out}`, url]);
  c.on("error", fail);
  c.on("close", () => ok());
});

/* This headless build ignores --window-size for LAYOUT — every page lays out
   at a fixed 485px regardless — so a "393px phone" screenshot was really a
   485px layout cropped to 393, which shifted the whole image. Pinning the app
   inside an iframe of exact size gives it a real viewport; the wrapper is LTR
   and the frame sits at 0,0, so the capture lines up with it exactly. */
let pinCount = 0;
async function shoot(url, out, w, h){
  const name = `pin${pinCount++}`;
  const file = join(ROOT, `__pin_${name}.html`);
  await writeFile(file, `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
html,body{margin:0;padding:0;background:#fff}
iframe{position:absolute;top:0;left:0;width:${w}px;height:${h}px;border:0;display:block}
</style></head><body><iframe src="${url}" scrolling="no"></iframe></body></html>`);
  tmp.push(file);
  await capture(`http://127.0.0.1:${PORT}/__pin_${name}.html`, out, w, h);
}

const has = bin => { try { return spawnSync(bin, ["-version"]).status === 0
                             || spawnSync(bin, ["--version"]).status === 0; } catch { return false; } };

/* A fixture is the real index.html with storage pre-seeded and, optionally,
   state injected directly — so frames are deterministic. */
async function fixture(name, { lang, skin, theme, inject = "" }){
  const base = await readFile(join(ROOT, "index.html"), "utf8");
  const seed = `<script>try{localStorage.clear();`
    + `localStorage.setItem('safi-lang','${lang}');`
    + `localStorage.setItem('safi-skin','${skin}');`
    + `localStorage.setItem('safi-theme','${theme}');}catch(e){}</script>`;
  const file = join(ROOT, `__shot_${name}.html`);
  await writeFile(file, base.replace(
    '<script type="module" src="assets/js/main.js"></script>',
    `${seed}\n<script type="module" src="assets/js/main.js"></script>\n${inject}`));
  return { file, url: `http://127.0.0.1:${PORT}/__shot_${name}.html` };
}

const DEMO_CLICK = `<script type="module">
window.addEventListener("load", () => setTimeout(() => {
  document.querySelector('[data-action="demo"]').click();
  window.scrollTo(0, 0);
}, 300));
</script>`;

/* Progressive frames for the animation. Each frame also names what to bring
   into view — on a 852px screen the expense list sits below the fold, so
   without this every frame looks identical. */
const frameInject = (people, items, { focus = null, settle = false } = {}) => `<script type="module">
import { replaceState, setSelected } from "./assets/js/state.js";
import { render, settleUp } from "./assets/js/ui.js";
window.addEventListener("load", () => setTimeout(() => {
  replaceState({name:"رحلة الساحل الشمالي", cur:"ج.م",
    people:${JSON.stringify(people)}, expenses:${JSON.stringify(items)}});
  setSelected(new Set(${JSON.stringify(people)}));
  render();
  ${settle ? "settleUp();" : ""}
  const focus = ${JSON.stringify(focus)};
  requestAnimationFrame(() => {
    if(focus){
      const el = document.querySelector(focus);
      if(el) el.scrollIntoView({ block: "center" });
    }else{
      window.scrollTo(0, 0);
    }
  });
}, 300));
</script>`;

const PEOPLE = ["أحمد","كريم","محمد","يوسف","محمود"];
const ITEMS = [
  {id:1, desc:"بنزين الطريق",   amount:900,  payer:"أحمد",  among:PEOPLE},
  {id:2, desc:"إيجار الشاليه",  amount:2400, payer:"محمد",  among:PEOPLE},
  {id:3, desc:"عشا مطعم السمك", amount:1250, payer:"كريم",  among:PEOPLE},
  {id:4, desc:"قهوة وحاجات",    amount:180,  payer:"يوسف",  among:["يوسف","أحمد"]},
  {id:5, desc:"تذاكر الأكواريوم",amount:640,  payer:"محمود", among:PEOPLE}
];

const SHOTS = [
  { name:"asil-light",      lang:"ar", skin:"asil",   theme:"light" },
  { name:"asil-dark",       lang:"ar", skin:"asil",   theme:"dark"  },
  { name:"arabi-light",     lang:"ar", skin:"arabi",  theme:"light" },
  { name:"arabi-dark",      lang:"ar", skin:"arabi",  theme:"dark"  },
  { name:"modern-light",    lang:"ar", skin:"modern", theme:"light" },
  { name:"modern-dark-en",  lang:"en", skin:"modern", theme:"dark"  }
];

const tmp = [];
const server = await serve();
await mkdir(OUT, { recursive: true });

try{
  console.log("\n  rendering stills…");
  for(const s of SHOTS){
    const f = await fixture(s.name, { ...s, inject: DEMO_CLICK });
    tmp.push(f.file);
    const png = join(OUT, `${s.name}.png`);
    await shoot(f.url, png, 393, 1560);
    if(has("magick")){
      /* WebP at method 6 is roughly half the bytes of an equivalent JPEG,
         and GitHub renders it inline. */
      spawnSync("magick", [png, "-resize", "360x", "-strip", "-quality", "76",
                           "-define", "webp:method=6", join(OUT, `${s.name}.webp`)]);
      await unlink(png).catch(() => {});
      console.log(`    ✓ ${s.name}.webp`);
    }else{
      console.log(`    ✓ ${s.name}.png  (install ImageMagick to compress)`);
    }
  }

  if(has("ffmpeg")){
    /* A smooth vertical pan over one tall screenshot, rather than a handful of
       stepped frames. Panning a still is what makes it read as scrolling an
       app instead of a slideshow, and it costs one render.
       No device shell: it dates the asset and competes with the brand. The
       padding is the app's own parchment plus a gold hairline — the frame is
       صافي, not a phone. */
    console.log("  rendering the walkthrough…");
    const full = await fixture("walk", {
      lang:"ar", skin:"asil", theme:"light",
      inject: frameInject(PEOPLE, ITEMS, { settle:true })
    });
    tmp.push(full.file);
    await shoot(full.url, "/tmp/safi_walk.png", 393, 2600);

    const H = 690, W = 393, SECS = 5, FPS = 10;
    const pal = "/tmp/safi_palette.png";
    /* hold at the top, glide down, hold at the settlement */
    const pan = `crop=${W}:${H}:0:'min(max(0\,(t-0.9)*300)\,ih-${H})'`;
    const brand = "pad=iw+28:ih+28:14:14:0xF6EFE0,pad=iw+4:ih+4:2:2:0xA67C1A";

    spawnSync("ffmpeg", ["-y","-loglevel","error","-loop","1","-t",String(SECS),
      "-i","/tmp/safi_walk.png","-vf",
      `${pan},${brand},scale=252:-1:flags=lanczos,fps=${FPS},palettegen=max_colors=64`, pal]);
    spawnSync("ffmpeg", ["-y","-loglevel","error","-loop","1","-t",String(SECS),
      "-i","/tmp/safi_walk.png","-i",pal,"-lavfi",
      `${pan},${brand},scale=252:-1:flags=lanczos,fps=${FPS}[x];`
      + "[x][1:v]paletteuse=dither=bayer:bayer_scale=4",
      "-loop","0", join(OUT, "demo.gif")]);
    console.log("    ✓ demo.gif");
  }else{
    console.log("  ! ffmpeg not found — skipping demo.gif");
  }

  /* Two feature shots the README calls out by name. Each hides the rest of the
     page so the image is about one thing. */
  console.log("  rendering feature shots…");

  const waShot = await fixture("wa", { lang:"ar", skin:"asil", theme:"light", inject: `
    <script type="module">
    window.addEventListener("load", () => setTimeout(() => {
      document.querySelector('[data-action="demo"]').click();
      setTimeout(() => {
        document.querySelectorAll('.wrap > .card, header, footer, .bar')
          .forEach(n => n.style.display = 'none');
        document.getElementById('settle').style.marginTop = '0';
        document.body.style.padding = '14px 16px';
        window.scrollTo(0, 0);
      }, 220);
    }, 320));
    </script>` });
  tmp.push(waShot.file);
  await shoot(waShot.url, join(OUT, "whatsapp.png"), 393, 720);

  const pdfShot = await fixture("pdf", { lang:"ar", skin:"asil", theme:"light", inject: `
    <script type="module">
    import { replaceState, setSelected } from "./assets/js/state.js";
    import { buildBill } from "./assets/js/bill.js";
    window.addEventListener("load", () => setTimeout(() => {
      replaceState({name:"رحلة الساحل الشمالي", cur:"ج.م",
        people:${JSON.stringify(PEOPLE)}, expenses:${JSON.stringify(ITEMS)}});
      setSelected(new Set(${JSON.stringify(PEOPLE)}));
      buildBill();
      document.querySelectorAll('.wrap, .bar').forEach(n => n.style.display = 'none');
      const bill = document.getElementById('bill');
      bill.style.position = 'relative';
      bill.style.left = 'auto';
      bill.style.margin = '0 auto';
      bill.style.boxShadow = '0 10px 34px rgba(0,0,0,.28)';
      document.body.style.background = '#8A8578';
      document.body.style.padding = '20px 0';
      window.scrollTo(0, 0);
    }, 320));
    </script>` });
  tmp.push(pdfShot.file);
  await shoot(pdfShot.url, "/tmp/safi_pdf_full.png", 820, 1300);
  /* The whole A4 sheet shrunk to README width is unreadable. Crop to the part
     that carries the design and the answer, cut on a section boundary:
     letterhead, headline total, the detail table and its total row. */
  if(has("magick")){
    spawnSync("magick", ["/tmp/safi_pdf_full.png", "-crop", "820x628+0+0", "+repage",
                         "-bordercolor", "#D8C9A9", "-border", "1",
                         join(OUT, "pdf.png")]);
  }

  if(has("magick")){
    for(const n of ["whatsapp", "pdf"]){
      spawnSync("magick", [join(OUT, `${n}.png`), "-resize", n === "pdf" ? "620x" : "380x",
                           "-strip", "-quality", "78", "-define", "webp:method=6",
                           join(OUT, `${n}.webp`)]);
      await unlink(join(OUT, `${n}.png`)).catch(() => {});
    }
    console.log("    ✓ whatsapp.webp  ✓ pdf.webp");
  }
}finally{
  server.close();
  for(const f of tmp) await unlink(f).catch(() => {});
}
console.log(`\n  written to docs/media\n`);
