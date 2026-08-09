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

const shoot = (url, out, w, h) => new Promise((ok, fail) => {
  const c = spawn(BROWSER, ["--headless","--disable-gpu","--no-sandbox",
    `--window-size=${w},${h}`, "--virtual-time-budget=9000", `--screenshot=${out}`, url]);
  c.on("error", fail);
  c.on("close", () => ok());
});

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

/* A phone shell drawn in CSS, wrapping the real app in an iframe. Rendering the
   frame rather than compositing keeps the screen pixel-exact and lets the app
   lay out at true device width (393×852 logical, current iPhone Pro geometry). */
async function deviceWrapper(name, innerUrl){
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
  html,body{margin:0;height:100%;background:#EDEAE3;
    display:grid;place-items:center;font-family:system-ui}
  .phone{position:relative;width:417px;height:876px;border-radius:58px;padding:12px;
    background:linear-gradient(155deg,#5B5F63,#2E3134 26%,#8E9398 52%,#33363A 76%,#5B5F63);
    box-shadow:0 30px 60px -24px rgba(0,0,0,.55), 0 2px 0 rgba(255,255,255,.25) inset}
  .screen{position:relative;width:393px;height:852px;border-radius:47px;overflow:hidden;
    background:#000}
  .screen iframe{width:393px;height:852px;border:0;display:block}
  .island{position:absolute;top:11px;left:50%;transform:translateX(-50%);
    width:124px;height:35px;border-radius:20px;background:#000;z-index:3}
  .btn-s{position:absolute;background:#3A3D41;border-radius:2px}
  .vol-up{left:-2px;top:176px;width:3px;height:56px}
  .vol-dn{left:-2px;top:246px;width:3px;height:56px}
  .action{left:-2px;top:118px;width:3px;height:34px}
  .power{right:-2px;top:196px;width:3px;height:92px}
  </style></head><body>
  <div class="phone">
    <div class="btn-s action"></div><div class="btn-s vol-up"></div>
    <div class="btn-s vol-dn"></div><div class="btn-s power"></div>
    <div class="screen"><div class="island"></div>
      <iframe src="${innerUrl}" scrolling="no"></iframe></div>
  </div></body></html>`;
  const file = join(ROOT, `__dev_${name}.html`);
  await writeFile(file, html);
  return { file, url: `http://127.0.0.1:${PORT}/__dev_${name}.html` };
}

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
  { name:"modern-light",    lang:"ar", skin:"modern", theme:"light" },
  { name:"modern-dark-en",  lang:"en", skin:"modern", theme:"dark"  }
];

const server = await serve();
await mkdir(OUT, { recursive: true });
const tmp = [];

try{
  console.log("\n  rendering stills…");
  for(const s of SHOTS){
    const f = await fixture(s.name, { ...s, inject: DEMO_CLICK });
    tmp.push(f.file);
    const png = join(OUT, `${s.name}.png`);
    await shoot(f.url, png, 420, 1500);
    if(has("magick")){
      spawnSync("magick", [png, "-resize", "380x", "-strip", "-quality", "82",
                           join(OUT, `${s.name}.jpg`)]);
      await unlink(png).catch(() => {});
      console.log(`    ✓ ${s.name}.jpg`);
    }else{
      console.log(`    ✓ ${s.name}.png  (install ImageMagick to compress)`);
    }
  }

  if(has("ffmpeg")){
    console.log("  rendering the walkthrough…");
    const steps = [
      { people: [],     items: [] },
      { people: PEOPLE, items: [] },
      { people: PEOPLE, items: ITEMS.slice(0,2), opts:{ focus:"#expensesList" } },
      { people: PEOPLE, items: ITEMS,            opts:{ focus:"#expensesList" } },
      { people: PEOPLE, items: ITEMS,            opts:{ focus:"#balCard" } },
      { people: PEOPLE, items: ITEMS,            opts:{ settle:true, focus:"#settle" } }
    ];
    for(let i = 0; i < steps.length; i++){
      const f = await fixture(`frame${i}`, {
        lang:"ar", skin:"asil", theme:"light",
        inject: frameInject(steps[i].people, steps[i].items, steps[i].opts || {})
      });
      const d = await deviceWrapper(`frame${i}`, `http://127.0.0.1:${PORT}/__shot_frame${i}.html`);
      tmp.push(f.file, d.file);
      await shoot(d.url, `/tmp/safi_frame${i + 1}.png`, 470, 940);
    }
    const pal = "/tmp/safi_palette.png";
    spawnSync("ffmpeg", ["-y","-loglevel","error","-framerate","0.75","-i","/tmp/safi_frame%d.png",
      "-vf","scale=340:-1:flags=lanczos,palettegen=max_colors=96", pal]);
    spawnSync("ffmpeg", ["-y","-loglevel","error","-framerate","0.75","-i","/tmp/safi_frame%d.png",
      "-i", pal, "-lavfi",
      "scale=340:-1:flags=lanczos[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=3",
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
  await shoot(waShot.url, join(OUT, "whatsapp.png"), 420, 700);

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
  await shoot(pdfShot.url, join(OUT, "pdf.png"), 800, 1240);

  if(has("magick")){
    for(const n of ["whatsapp", "pdf"]){
      spawnSync("magick", [join(OUT, `${n}.png`), "-resize", n === "pdf" ? "620x" : "400x",
                           "-strip", "-quality", "84", join(OUT, `${n}.jpg`)]);
      await unlink(join(OUT, `${n}.png`)).catch(() => {});
    }
    console.log("    ✓ whatsapp.jpg  ✓ pdf.jpg");
  }
}finally{
  server.close();
  for(const f of tmp) await unlink(f).catch(() => {});
}
console.log(`\n  written to docs/media\n`);
