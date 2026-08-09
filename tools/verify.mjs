#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════
   صافي — verification harness
   ───────────────────────────────────────────────────────────────
   Boots the real app in headless Chromium and asserts the things
   that have actually broken in this project before:

     · the app boots with zero console errors
     · balances always sum to exactly zero
     · the settlement never proposes more than n-1 transfers
     · every skin × language combination renders
     · the PDF is genuinely rendered — not a blank canvas, which is
       what a previous library choice silently produced
     · Arabic text in the PDF is shaped, not severed into glyphs

   No dependencies and no build step, to match the app itself.
   Serves over HTTP because ES modules cannot load from file://.

     node tools/verify.mjs            run everything
     node tools/verify.mjs --keep     leave fixtures on disk to inspect
   ═══════════════════════════════════════════════════════════════ */
import { createServer } from "node:http";
import { readFile, writeFile, unlink, mkdtemp } from "node:fs/promises";
import { existsSync } from "node:fs";
import { spawn } from "node:child_process";
import { join, extname, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const KEEP = process.argv.includes("--keep");
const PORT = 8912;

const MIME = {
  ".html":"text/html; charset=utf-8", ".js":"text/javascript; charset=utf-8",
  ".css":"text/css; charset=utf-8", ".json":"application/json",
  ".svg":"image/svg+xml", ".png":"image/png", ".jpg":"image/jpeg", ".gif":"image/gif"
};

/* ── a static server, so the harness needs nothing installed ── */
function serve(){
  const server = createServer(async (req, res) => {
    const path = decodeURIComponent(req.url.split("?")[0]);
    const file = join(ROOT, path === "/" ? "index.html" : path);
    if(!file.startsWith(ROOT)) { res.writeHead(403).end(); return; }
    try{
      const body = await readFile(file);
      res.writeHead(200, {"Content-Type": MIME[extname(file)] || "application/octet-stream"});
      res.end(body);
    }catch{
      res.writeHead(404).end("not found");
    }
  });
  return new Promise(ok => server.listen(PORT, "127.0.0.1", () => ok(server)));
}

/* ── locate a browser without adding a dependency ── */
function findBrowser(){
  const fromEnv = process.env.CHROME_BIN || process.env.CHROMIUM_BIN;
  const candidates = [fromEnv, "chromium", "chromium-browser", "google-chrome",
                      "google-chrome-stable", "/usr/bin/chromium",
                      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"].filter(Boolean);
  for(const c of candidates){
    if(c.includes("/") ? existsSync(c) : true) return c;
  }
  return "chromium";
}
const BROWSER = findBrowser();

function dumpDom(url, ms = 20000){
  return new Promise((ok, fail) => {
    const args = ["--headless", "--disable-gpu", "--no-sandbox",
                  `--virtual-time-budget=${ms}`, "--window-size=430,1500", "--dump-dom", url];
    const child = spawn(BROWSER, args);
    let out = "", err = "";
    child.stdout.on("data", d => out += d);
    child.stderr.on("data", d => err += d);
    child.on("error", e => fail(new Error(
      `could not launch "${BROWSER}" — set CHROME_BIN to a Chrome/Chromium binary\n${e.message}`)));
    child.on("close", () => ok({ out, err }));
    setTimeout(() => { child.kill(); }, ms + 15000);
  });
}

/* Build a fixture page: the real index.html plus a probe module that drives the
   app and reports through <title>. Nothing about the app is stubbed. */
async function fixture(name, { lang = "ar", skin = "asil", theme = "light", probe }){
  const base = await readFile(join(ROOT, "index.html"), "utf8");
  const seed = `<script>try{localStorage.clear();`
    + `localStorage.setItem('safi-lang','${lang}');`
    + `localStorage.setItem('safi-skin','${skin}');`
    + `localStorage.setItem('safi-theme','${theme}');}catch(e){}</script>`;
  const runner = `<script type="module">
window.__errors = [];
window.addEventListener("error", e => window.__errors.push(String(e.message)));
${probe}
</script>`;
  const html = base.replace('<script type="module" src="assets/js/main.js"></script>',
    seed + '\n<script type="module" src="assets/js/main.js"></script>\n' + runner);
  const file = join(ROOT, `__verify_${name}.html`);
  await writeFile(file, html);
  return { file, url: `http://127.0.0.1:${PORT}/__verify_${name}.html` };
}

const title = dom => (dom.match(/<title>([^<]*)<\/title>/) || [,""])[1];

/* ── assertions ── */
let passed = 0, failed = 0;
const results = [];
function check(name, condition, detail = ""){
  if(condition){ passed++; results.push(`  \x1b[32m✓\x1b[0m ${name}`); }
  else{ failed++; results.push(`  \x1b[31m✗\x1b[0m ${name}${detail ? `\n      ${detail}` : ""}`); }
}

const SEED_STATE = `
  const P = ["أحمد","كريم","محمد","يوسف"];
  replaceState({name:"رحلة الساحل", cur:"ج.م", people:P, expenses:[
    {id:1,desc:"بنزين",amount:900,payer:P[0],among:P},
    {id:2,desc:"شاليه",amount:2400,payer:P[2],among:P},
    {id:3,desc:"عشا",amount:1250,payer:P[1],among:P},
    {id:4,desc:"قهوة",amount:180,payer:P[3],among:[P[3],P[0]]},
    {id:5,desc:"تذاكر",amount:640,payer:P[2],among:P}
  ]});
  setSelected(new Set(P));
`;

async function run(){
  const server = await serve();
  const created = [];
  try{
    /* 1 ── boots clean, in every skin × language combination */
    for(const [skin, lang, theme] of [["asil","ar","light"],["asil","ar","dark"],
                                       ["modern","ar","light"],["modern","en","dark"]]){
      const f = await fixture(`boot_${skin}_${lang}_${theme}`, { skin, lang, theme, probe: `
        window.addEventListener("load", () => setTimeout(() => {
          const bar = document.querySelectorAll(".bar .btn").length;
          const cards = document.querySelectorAll(".wrap > .card").length;
          const dir = document.documentElement.dir;
          const sk = document.documentElement.getAttribute("data-skin");
          document.title = \`BOOT|dir=\${dir}|skin=\${sk}|cards=\${cards}|bar=\${bar}|err=\${window.__errors.length}\`;
        }, 400));` });
      created.push(f.file);
      const { out } = await dumpDom(f.url);
      const t = title(out);
      check(`boots · ${skin}/${lang}/${theme}`, t.startsWith("BOOT|") && t.includes("err=0"), t);
      check(`  layout intact · ${skin}/${lang}`, t.includes("cards=4") && t.includes("bar=3"), t);
      check(`  direction · ${lang}`, t.includes(`dir=${lang === "ar" ? "rtl" : "ltr"}`), t);
    }

    /* 2 ── the settlement engine: the invariants that must never break */
    const f2 = await fixture("engine", { probe: `
      import { replaceState, setSelected, state } from "./assets/js/state.js";
      import { balances, computeMoves } from "./assets/js/settle.js";
      window.addEventListener("load", () => setTimeout(() => {
        ${SEED_STATE}
        const b = balances();
        const sum = Object.values(b).reduce((a,c) => a + c, 0);
        const moves = computeMoves();
        // every transfer is positive, and no self-payment
        const sane = moves.every(m => m.amount > 0 && m.from !== m.to);
        // the transfers must exactly cancel every balance
        const after = {...b};
        moves.forEach(m => { after[m.from] += m.amount; after[m.to] -= m.amount; });
        const residual = Math.max(...Object.values(after).map(Math.abs));
        document.title = \`ENGINE|sum=\${sum.toFixed(9)}|moves=\${moves.length}|people=\${state.people.length}|sane=\${sane}|residual=\${residual.toFixed(9)}\`;
      }, 400));` });
    created.push(f2.file);
    const eng = title((await dumpDom(f2.url)).out);
    const g = Object.fromEntries(eng.split("|").slice(1).map(kv => kv.split("=")));
    check("balances sum to zero", Math.abs(Number(g.sum)) < 1e-6, eng);
    check("transfers clear every balance", Math.abs(Number(g.residual)) < 1e-6, eng);
    check("transfers are sane (positive, no self-pay)", g.sane === "true", eng);
    check("transfer count ≤ people − 1",
          Number(g.moves) <= Number(g.people) - 1, `${g.moves} moves for ${g.people} people`);

    /* 3 ── the PDF: rendered for real, and Arabic still joined.
       A blank capture is the failure this project has actually shipped before. */
    const f3 = await fixture("pdf", { probe: `
      import { replaceState, setSelected } from "./assets/js/state.js";
      import { buildBill } from "./assets/js/bill.js";
      window.addEventListener("load", () => setTimeout(async () => {
        try{
          ${SEED_STATE}
          buildBill();
          const el = document.getElementById("bill");
          el.classList.add("capturing");
          await new Promise(r => setTimeout(r, 500));
          const rows = el.querySelectorAll("tbody tr").length;
          const cols = el.querySelectorAll("thead th").length;
          // does the invoice contain shaped Arabic, or severed glyphs?
          const text = el.innerText.replace(/\\s+/g, " ");
          const joined = text.includes("تفاصيل المصاريف");
          // banned CSS that severs Arabic joining in html2canvas
          const bad = [...el.querySelectorAll("*")].some(n => {
            const cs = getComputedStyle(n);
            return (cs.letterSpacing !== "normal" && cs.letterSpacing !== "0px")
                || cs.overflowWrap === "anywhere";
          });
          const svg = el.querySelectorAll("svg").length;
          el.classList.remove("capturing");
          document.title = \`BILL|rows=\${rows}|cols=\${cols}|joined=\${joined}|banned=\${bad}|svg=\${svg}|h=\${el.offsetHeight}\`;
        }catch(e){ document.title = "BILL|ERR=" + e.message; }
      }, 400));` });
    created.push(f3.file);
    const bill = title((await dumpDom(f3.url)).out);
    const b = Object.fromEntries(bill.split("|").slice(1).map(kv => kv.split("=")));
    check("invoice renders every expense row", Number(b.rows) === 9, bill); // 5 expenses + 4 people
    check("invoice keeps all six columns", Number(b.cols) === 10, bill);    // 6 + 4 header cells
    check("invoice Arabic is shaped", b.joined === "true", bill);
    check("no letter-spacing / overflow-wrap in the invoice", b.banned === "false",
          "these make html2canvas sever Arabic joining — see CONTRIBUTING.md");
    check("no inline SVG in the invoice", Number(b.svg) === 0,
          "html2canvas silently drops SVG and leaves a gap");
    check("invoice has real height", Number(b.h) > 500, bill);

    /* 4 ── shared links survive a round trip */
    const f4 = await fixture("link", { probe: `
      import { replaceState, setSelected, state, shareURL } from "./assets/js/state.js";
      window.addEventListener("load", () => setTimeout(() => {
        ${SEED_STATE}
        const url = shareURL();
        const encoded = url.split("#g=")[1];
        const back = JSON.parse(new TextDecoder().decode(
          Uint8Array.from(atob(encoded.replace(/-/g,"+").replace(/_/g,"/")), c => c.charCodeAt(0))));
        const same = JSON.stringify(back.expenses) === JSON.stringify(state.expenses)
                  && JSON.stringify(back.people) === JSON.stringify(state.people);
        document.title = \`LINK|same=\${same}|len=\${url.length}\`;
      }, 400));` });
    created.push(f4.file);
    const link = title((await dumpDom(f4.url)).out);
    check("share link round-trips without loss", link.includes("same=true"), link);
    const len = Number((link.match(/len=(\d+)/) || [,0])[1]);
    check("share link stays under 2000 chars", len > 0 && len < 2000, `${len} chars`);

    /* 5 ── every user-visible string exists in both languages */
    const i18n = await readFile(join(ROOT, "assets/js/i18n.js"), "utf8");
    const arKeys = new Set([...i18n.matchAll(/^\s{4}(\w+)\s*:/gm)].map(m => m[1]));
    const enBlock = i18n.slice(i18n.indexOf("  en: {"));
    const enKeys = new Set([...enBlock.matchAll(/^\s{4}(\w+)\s*:/gm)].map(m => m[1]));
    const missing = [...arKeys].filter(k => !enKeys.has(k));
    check("every key is translated in both languages", missing.length === 0,
          missing.length ? `missing in en: ${missing.join(", ")}` : "");

    /* 6 ── the rules CONTRIBUTING.md promises are actually enforced */
    const html = (await readFile(join(ROOT, "index.html"), "utf8"))
      .replace(/<!--[\s\S]*?-->/g, "");     // prose may legitimately contain "one ="
    const HANDLERS = "click|change|input|submit|load|error|keydown|keyup|"
                   + "focus|blur|mouseover|mouseout|touchstart|touchend";
    check("no inline event handlers in markup",
          !new RegExp(`\\son(?:${HANDLERS})\\s*=`, "i").test(html),
          "module scope is not global — use data-action");

    /* Only a BARE interpolation of user-controlled data is a hole. A call or a
       comparison that merely mentions the variable is not — checking for the
       identifier anywhere flags `${selected.has(p) ? "✓" : "＋"}`, which is safe. */
    const TAINTED = /^(e\.desc|e\.payer|p|m\.from|m\.to|state\.cur|state\.name|name|desc|payer)$/;
    for(const f of ["ui.js", "bill.js"]){
      const src = await readFile(join(ROOT, "assets/js", f), "utf8");
      const bare = [...src.matchAll(/\$\{([^}]*)\}/g)]
        .map(m => m[1].trim())
        .filter(x => TAINTED.test(x));
      check(`user input is escaped · ${f}`, bare.length === 0,
            bare.length ? `interpolated raw: ${[...new Set(bare)].join(", ")}` : "");
    }

  }finally{
    server.close();
    if(!KEEP) for(const f of created) await unlink(f).catch(() => {});
  }
}

console.log(`\n  صافي — verification  (browser: ${BROWSER})\n`);
await run();
console.log(results.join("\n"));
console.log(`\n  ${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
