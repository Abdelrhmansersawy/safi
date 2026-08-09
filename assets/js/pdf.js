/* ═══════════════════════════════════════════════════════════════
   pdf — rasterize the bill and write it into an A4 PDF.

   We photograph the bill rather than emitting PDF text runs, because
   jsPDF's text engine has no Arabic shaping or bidi: «صافي» would come
   out as disconnected letters in reverse order. The browser already
   shaped the text correctly, so we capture that. Trade-off: the text in
   the PDF is not selectable.

   html2canvas and jsPDF are loaded separately rather than through the
   html2pdf wrapper — the wrapper picks its own canvas geometry and
   pagination, and got both wrong here (it cropped a third of the page,
   taking the amount columns with it). Slicing by hand is exact.
   ═══════════════════════════════════════════════════════════════ */
import { PDF_LIBS } from "./config.js";
import { state } from "./state.js";
import { t } from "./i18n.js";
import { toast, loadScript } from "./utils.js";
import { buildBill, billNo } from "./bill.js";

let libsPromise = null;

function loadPdfLibs(){
  if(window.html2canvas && window.jspdf) return Promise.resolve();
  if(libsPromise) return libsPromise;
  libsPromise = Promise.all(PDF_LIBS.map(loadScript))
    .then(() => { if(!window.html2canvas || !window.jspdf) throw new Error("lib missing"); })
    .catch(err => { libsPromise = null; throw err; });
  return libsPromise;
}

/* Where the canvas MAY be cut: the bottom edge of every row, card and block.
   Slicing a bitmap has no notion of a table row, so without these a page
   break can shear one in half. Measured while the bill is in capture
   position, so the offsets are real. */
function breakPoints(el, scale){
  const top = el.getBoundingClientRect().top;
  const pts = new Set();
  el.querySelectorAll("tr, .b-move, .b-sec, .b-stats, .b-head, .b-sign, .b-clear, .b-foot")
    .forEach(n => pts.add(Math.round((n.getBoundingClientRect().bottom - top) * scale)));
  return [...pts].sort((a, b) => a - b);
}

export function canvasToPdf(canvas, margin, pts){
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({unit:"mm", format:"a4", orientation:"portrait", compress:true});
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const imgW = pageW - margin * 2;
  const pxPerMm = canvas.width / imgW;
  const maxH = Math.floor((pageH - margin * 2) * pxPerMm);

  let y = 0, first = true;
  while(y < canvas.height){
    let h = Math.min(maxH, canvas.height - y);

    if(y + h < canvas.height && pts && pts.length){
      /* last safe boundary that fits — but never carve off a stub of a page */
      const fits = pts.filter(p => p > y + maxH * 0.4 && p <= y + maxH);
      if(fits.length) h = fits[fits.length - 1] - y;
    }

    const part = document.createElement("canvas");
    part.width = canvas.width;
    part.height = h;
    part.getContext("2d").drawImage(canvas, 0, y, canvas.width, h, 0, 0, canvas.width, h);

    if(!first) pdf.addPage();
    pdf.addImage(part.toDataURL("image/jpeg", 0.95), "JPEG", margin, margin, imgW, h / pxPerMm);
    first = false;
    y += h;
  }
  return pdf;
}

export async function exportBill(btn){
  if(!state.expenses.length) return toast(t("m_nobill"));

  const el = document.getElementById("bill");
  buildBill();

  const label = btn ? btn.innerHTML : null;
  if(btn){ btn.setAttribute("aria-busy", "true"); btn.textContent = t("preparing"); }

  const wait = document.getElementById("pdfWait");
  try{
    await loadPdfLibs();
    /* the real face must be loaded, or the capture rasterizes a fallback */
    if(document.fonts && document.fonts.ready) await document.fonts.ready;

    /* overlay first, THEN return the bill to normal flow, so it never flashes.
       html2canvas cannot rasterize an out-of-flow element — the capture comes
       back blank — so for ~1s the bill is genuinely on the page. */
    wait.classList.add("on");
    document.body.classList.add("locked");
    el.classList.add("capturing");
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

    const cuts = breakPoints(el, 2);   // must match the scale below
    const canvas = await window.html2canvas(el, {
      scale: 2,
      backgroundColor: "#FFFFFF",
      useCORS: true,
      logging: false,
      width: el.offsetWidth,
      height: el.offsetHeight,
      windowWidth: el.offsetWidth,
      scrollX: 0,
      scrollY: -window.scrollY
    });

    canvasToPdf(canvas, 8, cuts).save(`Safi-${billNo()}.pdf`);
    toast(t("m_pdfok"));
  }catch(err){
    /* offline, or a blocked CDN — the print dialog still produces a PDF */
    toast(t("m_pdfoff"));
    setTimeout(() => window.print(), 900);
  }finally{
    el.classList.remove("capturing");
    document.body.classList.remove("locked");
    wait.classList.remove("on");
    if(btn){ btn.removeAttribute("aria-busy"); btn.innerHTML = label; }
  }
}
