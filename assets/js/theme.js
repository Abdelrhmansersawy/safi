/* ═══════════════════════════════════════════════════════════════
   theme — color mode + visual skin.
   Everything skin-specific is data, read from the SKINS registry in
   config.js. Adding a skin never touches this file.
   ═══════════════════════════════════════════════════════════════ */
import { SKINS } from "./config.js";
import { L } from "./i18n.js";

export const THEMES = ["system", "light", "dark"];

let themeIdx = 0;
let skinIdx  = 0;   // registry order: the first entry is the default

export const currentTheme = () => THEMES[themeIdx];
export const currentSkin  = () => SKINS[skinIdx].id;
export const currentSkinDef = () => SKINS[skinIdx];

/* A skin's faces are injected the first time it is activated, so visitors
   only download the families they actually see. Skins whose fonts are
   already linked in index.html declare `font: null`. */
const fontsLoaded = new Set();
function ensureFont(skin){
  if(!skin.font || fontsLoaded.has(skin.id)) return;
  fontsLoaded.add(skin.id);
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = skin.font;
  document.head.appendChild(link);
}

export function applyTheme(){
  const root = document.documentElement;
  const mode = THEMES[themeIdx];
  const skin = SKINS[skinIdx];

  if(mode === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", mode);

  root.setAttribute("data-skin", skin.id);
  ensureFont(skin);

  const themeBtn = document.getElementById("themeBtn");
  const skinBtn  = document.getElementById("skinBtn");
  if(themeBtn) themeBtn.querySelector(".lbl").textContent = L().theme[mode];
  if(skinBtn)  skinBtn.querySelector(".lbl").textContent  = L().skin[skin.id] || skin.id;

  /* keep the browser chrome in step with the resolved background */
  const meta = document.getElementById("themeColor");
  if(meta) meta.setAttribute("content", getComputedStyle(document.body).backgroundColor);

  try{
    localStorage.setItem("safi-theme", mode);
    localStorage.setItem("safi-skin", skin.id);
  }catch(e){}
}

export function cycleTheme(){
  themeIdx = (themeIdx + 1) % THEMES.length;
  applyTheme();
  return L().theme[THEMES[themeIdx]];
}

export function cycleSkin(){
  skinIdx = (skinIdx + 1) % SKINS.length;
  applyTheme();
  const skin = SKINS[skinIdx];
  return L().skin[skin.id] || skin.id;
}

export function restoreTheme(){
  try{
    const ti = THEMES.indexOf(localStorage.getItem("safi-theme"));
    if(ti > -1) themeIdx = ti;
    const si = SKINS.findIndex(s => s.id === localStorage.getItem("safi-skin"));
    if(si > -1) skinIdx = si;
  }catch(e){}
}
