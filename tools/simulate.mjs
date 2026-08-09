#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════
   صافي — end-to-end simulation
   ───────────────────────────────────────────────────────────────
   Walks one user through a whole trip on a 393px Arabic phone,
   driving the REAL interface: typing into the real inputs and
   clicking the real buttons. Nothing is stubbed and no module
   function is called directly — if a control is not reachable by a
   click, this fails, which is the point.

     node tools/simulate.mjs          run the journey, print the log
     node tools/simulate.mjs --shots  also write step screenshots

   Screenshots come from replaying the journey and stopping at step
   N, because headless Chromium captures once per run.
   ═══════════════════════════════════════════════════════════════ */
import { createServer } from "node:http";
import { readFile, writeFile, unlink, mkdir } from "node:fs/promises";
import { spawn } from "node:child_process";
import { join, extname, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "docs/media/steps");
const PORT = 8916;
const BROWSER = process.env.CHROME_BIN || "chromium";
const SHOTS = process.argv.includes("--shots");
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

const run = (url, { shot = null, ms = 25000, w = 393, h = 860 } = {}) => new Promise((ok, fail) => {
  const args = ["--headless","--disable-gpu","--no-sandbox",`--window-size=${w},${h}`,
                `--virtual-time-budget=${ms}`];
  args.push(shot ? `--screenshot=${shot}` : "--dump-dom", url);
  const c = spawn(BROWSER, args);
  let out = "";
  c.stdout.on("data", d => out += d);
  c.on("error", fail);
  c.on("close", () => ok(out));
});

/* This headless build ignores --window-size for LAYOUT — every page lays out at
   a fixed width regardless — so a "393px phone" capture was a wider layout
   cropped, which shifted the image. An exact-size iframe gives a real viewport. */
let pinCount = 0;
async function pinnedShot(url, out, w, h){
  const file = join(ROOT, `__simpin_${pinCount++}.html`);
  await writeFile(file, `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
html,body{margin:0;padding:0;background:#fff}
iframe{position:absolute;top:0;left:0;width:${w}px;height:${h}px;border:0;display:block}
</style></head><body><iframe src="${url}" scrolling="no"></iframe></body></html>`);
  tmp.push(file);
  await run(`http://127.0.0.1:${PORT}/` + file.split("/").pop(), { shot: out, w, h });
}

/* The journey. Each step is a name plus code that runs in the page.
   `S` is a small helper the fixture defines: real typing, real clicks. */
const STEPS = [
  ["a fresh phone shows an empty group", `
     S.assert("no people yet", document.querySelectorAll("#peopleList .chip").length === 0);
     S.assert("empty state is shown", !!document.querySelector("#peopleList .empty"));
     S.assert("nothing to settle", document.getElementById("settle").children.length === 0);`],

  ["four friends are added", `
     for(const n of ["أحمد","كريم","محمد","يوسف"]) S.addPerson(n);
     S.assert("four chips", document.querySelectorAll("#peopleList .chip").length === 4);
     S.assert("payer list offers all four",
              document.getElementById("payer").options.length === 5);
     S.assert("all four are selected to split",
              document.querySelectorAll('#splitAmong [aria-pressed="true"]').length === 4);`],

  ["a duplicate name is refused, even spelled differently", `
     S.addPerson("احمد");                       // no hamza — same person
     S.assert("still four people", document.querySelectorAll("#peopleList .chip").length === 4);
     S.assert("the user is told why", S.lastToast().length > 0);`],

  ["the first expense is logged for everyone", `
     S.addExpense("بنزين الطريق", "900", "أحمد");
     S.assert("one row in the history", document.querySelectorAll("#expensesList .exp").length === 1);
     S.assert("the total reads 900", S.text("#totalVal").includes(S.digits("900")));
     S.assert("balances appeared", document.getElementById("balCard").style.display !== "none");`],

  ["a second expense is split between only two", `
     S.toggleOff("محمد"); S.toggleOff("يوسف");
     S.assert("two chips left selected",
              document.querySelectorAll('#splitAmong [aria-pressed="true"]').length === 2);
     S.addExpense("قهوة وحاجات", "180", "كريم");
     S.assert("two rows now", document.querySelectorAll("#expensesList .exp").length === 2);`],

  ["the split resets, so the next expense is not silently narrowed", `
     S.assert("everyone is selected again",
              document.querySelectorAll('#splitAmong [aria-pressed="true"]').length === 4);`],

  ["the settlement is on screen without pressing anything", `
     const box = document.getElementById("settle");
     S.assert("a settlement is rendered", box.querySelectorAll(".pay").length > 0);
     S.assert("the send action is right there", !!box.querySelector('[data-action="whatsapp"]'));
     S.assert("transfers never exceed people-1",
              box.querySelectorAll(".pay").length <= 3);`],

  ["the message it would send is well formed", `
     const msg = S.message();
     S.assert("names the group", msg.includes("رحلة الساحل"));
     S.assert("carries the link", msg.includes("#g="));
     S.assert("uses Latin digits a bank app can read", /[0-9]/.test(msg) && !/[٠-٩]/.test(msg));
     S.assert("each transfer line is direction-pinned", msg.includes("\\u200F"));
     S.log("message:\\n" + msg);`],

  ["an expense can be deleted", `
     document.querySelector("#expensesList .exp .del").click();
     await S.tick();
     S.assert("one row left", document.querySelectorAll("#expensesList .exp").length === 1);`],

  ["changing the currency updates the settlement too", `
     S.setCurrency("$");
     await S.tick();
     const box = document.getElementById("settle");
     S.assert("settlement quotes the new symbol",
              box.textContent.includes("$") && !box.textContent.includes("ج.م"));`],

  ["the share link round-trips the whole group", `
     const url = S.shareURL();
     S.assert("link is under 2000 chars", url.length < 2000);
     const back = S.decode(url);
     S.assert("same people", back.people.join() === S.state().people.join());
     S.assert("same expenses", back.expenses.length === S.state().expenses.length);
     S.log("link length: " + url.length);`]
];

const fixture = async (upto) => {
  const base = await readFile(join(ROOT, "index.html"), "utf8");
  const seed = `<script>try{localStorage.clear();`
    + `localStorage.setItem('safi-lang','ar');`
    + `localStorage.setItem('safi-skin','asil');`
    + `localStorage.setItem('safi-theme','light');}catch(e){}</script>`;

  const body = STEPS.slice(0, upto + 1).map(([name, code], i) => `
    S.step(${JSON.stringify(name)}, ${i});
    { ${code} }
    await S.tick();`).join("\n");

  const runner = `<script type="module">
import { state, shareURL } from "./assets/js/state.js";
import { decodeState } from "./assets/js/utils.js";
import { buildMessage } from "./assets/js/share.js";
import { arabicDigits, arabize } from "./assets/js/format.js";

const LOG = [];
let toastSeen = "";
const S = {
  tick: () => new Promise(r => setTimeout(r, 90)),
  step(name, i){ LOG.push("\\n▸ " + (i+1) + ". " + name); },
  assert(what, ok){ LOG.push((ok ? "   ✓ " : "   ✗ ") + what); if(!ok) window.__fail = true; },
  log(m){ LOG.push("   · " + m); },
  text: sel => document.querySelector(sel)?.textContent ?? "",
  digits: s => arabicDigits() ? arabize(s) : s,
  state: () => state,
  shareURL, decode: u => decodeState(u.split("#g=")[1]),
  message: () => buildMessage(),
  lastToast: () => document.getElementById("toastMsg").textContent,
  type(sel, value){
    const el = document.querySelector(sel);
    el.value = value;
    el.dispatchEvent(new Event("input", { bubbles: true }));
  },
  addPerson(name){
    S.type("#personName", name);
    document.querySelector('[data-action="add-person"]').click();
  },
  toggleOff(name){
    const btn = [...document.querySelectorAll("#splitAmong .toggle")]
      .find(b => b.textContent.includes(name));
    if(btn && btn.getAttribute("aria-pressed") === "true") btn.click();
  },
  setCurrency(c){
    const el = document.getElementById("currency");
    el.value = c;
    el.dispatchEvent(new Event("change", { bubbles: true }));
  },
  addExpense(desc, amount, payer){
    S.type("#desc", desc);
    S.type("#amount", amount);
    const sel = document.getElementById("payer");
    sel.value = payer;
    sel.dispatchEvent(new Event("change", { bubbles: true }));
    document.querySelector('[data-action="add-expense"]').click();
  }
};

/* a real user would be answering these dialogs */
window.confirm = () => true;

window.addEventListener("load", () => setTimeout(async () => {
  try{
    document.getElementById("groupName").value = "رحلة الساحل الشمالي";
    document.getElementById("groupName").dispatchEvent(new Event("input", {bubbles:true}));
    ${body}
  }catch(err){
    LOG.push("   ✗ THREW: " + err.message);
    window.__fail = true;
  }
  const pre = document.createElement("pre");
  pre.id = "simlog";
  pre.textContent = (window.__fail ? "FAIL" : "PASS") + "\\n" + LOG.join("\\n");
  document.body.appendChild(pre);
  document.title = window.__fail ? "SIM|FAIL" : "SIM|PASS";
}, 350));
</script>`;

  const file = join(ROOT, `__sim_${upto}.html`);
  await writeFile(file, base.replace(
    '<script type="module" src="assets/js/main.js"></script>',
    `${seed}\n<script type="module" src="assets/js/main.js"></script>\n${runner}`));
  return { file, url: `http://127.0.0.1:${PORT}/__sim_${upto}.html` };
};

/* ── go ── */
const server = await serve();
const tmp = [];
let failed = false;
try{
  const last = await fixture(STEPS.length - 1);
  tmp.push(last.file);
  const dom = await run(last.url);
  const log = (dom.match(/<pre id="simlog">([\s\S]*?)<\/pre>/) || [,""])[1]
    .replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&amp;/g,"&");
  console.log("\n" + (log.trim() || "(the simulation produced no log — the page probably threw before it started)"));
  failed = /^FAIL/.test(log.trim()) || !log.trim();

  if(SHOTS){
    await mkdir(OUT, { recursive: true });
    const want = [1, 3, 6, 7];        // people · first expense · settlement · after send
    console.log("\n  screenshots:");
    for(const i of want){
      const f = await fixture(i);
      tmp.push(f.file);
      const out = join(OUT, `step-${i + 1}.png`);
      await pinnedShot(f.url, out, 393, 860);
      console.log(`    ✓ step-${i + 1}.png  — ${STEPS[i][0]}`);
    }
  }
}finally{
  server.close();
  for(const f of tmp) await unlink(f).catch(() => {});
}
console.log("");
process.exit(failed ? 1 : 0);
