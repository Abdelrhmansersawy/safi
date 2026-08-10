/* ═══════════════════════════════════════════════════════════════
   i18n — Arabic is the default; English is the guest.
   The Arabic copy is spoken Egyptian. The English is written to match
   that register (contractions, plain words) rather than being a literal
   gloss — a word-for-word rendering of «مين دفع إيه؟» reads like a tax form.
   Values may be strings or functions of their arguments.
   ═══════════════════════════════════════════════════════════════ */

export const I18N = {
  ar: {
    dir:"rtl", lang:"ar", other:"EN", locale:"ar-EG-u-nu-latn", nums:["١","٢","٣","٤"],
    title:"صافي · اقسموا وخلّصوا",
    brand:"صافي", tagline:"الحساب صافي، والصحبة باقية", star:"نجمة",
    skin:{modern:"حديث", asil:"أصيل", arabi:"عربي"}, skin_to:s => "التصميم: " + s,
    demo:"جرّب ديمو", new_group:"جروب جديد",
    group_ph:"اسم الخروجة أو الرحلة", currency:"العملة",
    s1:"مين معانا؟", s1_hint:"اكتب أسماء اللي شاركوا في المصاريف.",
    person_ph:"اسم الشخص", add:"إضافة",
    s2:"مين دفع إيه؟", s2_hint:"سجّل كل مبلغ اتدفع ومين اللي مستفيد منه.",
    desc_ph:"على إيه؟ (عشا، بنزين…)", amount_ph:"المبلغ", who_paid:"مين دفع؟",
    split_on:"مقسومة على:", select_all:"تحديد الكل", clear_all:"إلغاء الكل",
    add_expense:"تسجيل المصروف",
    s3:"السجل", total:"الإجمالي",
    s4:"الأرصدة", s4_hint:"كل واحد له كام أو عليه كام.",
    share:"شارك", pdf:"فاتورة PDF", settle:"اعملها صافي", listsep:"، ",
    wa_send:"ابعتها للجروب", wa_copy:"انسخ الرسالة",
    wa_details:"التفاصيل كلها هنا:",
    wa_hint:"ابعت التسوية في جروب الواتس، عشان محدش يحتاج يفكّر حد.",
    wa_ps:"مفيش استعجال، بس عشان محدش ينسى 🙂",
    footer:"من غير تسجيل دخول · بياناتك محفوظة على جهازك", views:"مشاهدة",
    preparing:"بنجهّز الفاتورة…",
    empty_people:"ابدأ بإضافة الأسماء فوق", empty_expenses:"مافيش مصاريف لسه",
    theme:{system:"تلقائي", light:"فاتح", dark:"داكن"},

    m_exists:"الاسم ده موجود بالفعل",
    m_two:"ضيف شخصين على الأقل الأول",
    m_amount:"اكتب مبلغ صحيح",
    m_payer:"اختار مين اللي دفع",
    m_split:"اختار مين المقسوم عليهم",
    m_saved:"اتسجّل ✓",
    m_none:"مافيش مصاريف مسجّلة لسه",
    m_nobill:"مافيش مصاريف تتحط في فاتورة",
    m_needppl:"ضيف ناس الأول عشان تشارك",
    m_copied:"اللينك اتنسخ ✓ ابعته لأصحابك",
    m_msg_copied:"الرسالة اتنسخت ✓",
    m_badlink:"اللينك مش مظبوط",
    m_pdfok:"الفاتورة اتحمّلت ✓",
    m_pdfoff:"مافيش نت — هنفتح الطباعة، اختار «حفظ كـ PDF»",
    m_theme:x => "الثيم: " + x,
    m_demo:"ده ديمو — دوس «جروب جديد» تبدأ من الأول",
    c_person:n => `«${n}» موجود في مصاريف مسجّلة. تشيله ومعاه المصاريف دي؟`,
    c_reset:"هتبدأ جروب جديد من الأول. متأكد؟",
    c_demo:"هيمسح اللي مكتوب دلوقتي ويحطّ بيانات الديمو. تمام؟",

    owed:"له", owes:"عليه", clear:"صافي",
    paid_by:n => `${n} دفع`, all:"الكل", per:"للفرد", del:"حذف",
    settle_title:n => `التسوية — ${n} تحويل بس`,
    settle_hint:"أقل عدد تحويلات ممكن يخلّص الحسابات كلها.",
    settled_big:"صافي", settled_sub:"مفيش حد عليه حاجة لحد. تمام كده.",
    pays_to:"←",

    b_sub:"فاتورة تقسيم مصاريف", b_no:"رقم الفاتورة", b_noname:"جروب من غير اسم",
    bill_mark:"✦",
    b_legal:"كشف حساب بين الأصدقاء · مستند غير رسمي، مش فاتورة ضريبية",
    b_total:"إجمالي المصاريف",
    b_people:"عدد الأفراد", b_count:"عدد المصاريف", b_avg:"متوسط الفرد", b_moves:"تحويلات التسوية",
    b_details:"تفاصيل المصاريف", b_items:n => `${n} بند`,
    b_hash:"#", b_desc:"البيان", b_payer:"اللي دفع", b_among:"مقسومة على",
    b_each:"للفرد", b_amount:"المبلغ",
    b_ledger:"حساب كل فرد", b_ledger_c:"دفع · نصيبه · الرصيد",
    b_name:"الاسم", b_paid:"دفع", b_share:"نصيبه", b_balance:"الرصيد",
    b_settle:"التسوية المطلوبة", b_settle_c:n => `${n} تحويل يخلّصوا الحساب`,
    b_pays:"يدفع لـ",
    b_sign_from:"توقيع الدافع", b_sign_to:"توقيع المستلم",
    b_made:"اتعملت بـ", b_slogan:"الحساب صافي، والصحبة باقية"
  },

  en: {
    dir:"ltr", lang:"en", other:"ع", locale:"en-GB", nums:["1","2","3","4"],
    title:"Safi · Split it, settle it",
    brand:"Safi", tagline:"Bills settled, friendships intact", star:"Star",
    skin:{modern:"Modern", asil:"Classic", arabi:"Arabic"}, skin_to:s => "Design: " + s,
    demo:"Try the demo", new_group:"New group",
    group_ph:"Name this trip or night out", currency:"Currency",
    s1:"Who's in?", s1_hint:"Add everyone who shared the costs.",
    person_ph:"Name", add:"Add",
    s2:"Who paid for what?", s2_hint:"Log each amount and who it was for.",
    desc_ph:"What for? (dinner, fuel…)", amount_ph:"Amount", who_paid:"Who paid?",
    split_on:"Split between:", select_all:"Select all", clear_all:"Clear all",
    add_expense:"Add expense",
    s3:"History", total:"Total",
    s4:"Balances", s4_hint:"What each person is owed, or owes.",
    share:"Share", pdf:"PDF", settle:"Settle up", listsep:", ",
    wa_send:"Send to the group", wa_copy:"Copy message",
    wa_details:"Full breakdown:",
    wa_hint:"Send the settlement to the group chat, so nobody has to chase anyone.",
    wa_ps:"No rush — just so nobody forgets 🙂",
    footer:"No sign-up · your data stays on your device", views:"views",
    preparing:"Preparing your bill…",
    empty_people:"Start by adding names above", empty_expenses:"No expenses yet",
    theme:{system:"Auto", light:"Light", dark:"Dark"},

    m_exists:"That name is already in the group",
    m_two:"Add at least two people first",
    m_amount:"Enter a valid amount",
    m_payer:"Choose who paid",
    m_split:"Choose who to split between",
    m_saved:"Added ✓",
    m_none:"No expenses logged yet",
    m_nobill:"Nothing to put on a bill yet",
    m_needppl:"Add people before sharing",
    m_copied:"Link copied ✓ send it to your friends",
    m_msg_copied:"Message copied ✓",
    m_badlink:"That link is broken",
    m_pdfok:"Bill downloaded ✓",
    m_pdfoff:"You're offline — opening print, choose “Save as PDF”",
    m_theme:x => "Theme: " + x,
    m_demo:"This is demo data — hit “New group” to start fresh",
    c_person:n => `“${n}” appears in logged expenses. Remove them and those expenses?`,
    c_reset:"This starts a brand-new group. Sure?",
    c_demo:"This replaces what you have now with demo data. OK?",

    owed:"gets back", owes:"owes", clear:"settled",
    paid_by:n => `${n} paid`, all:"everyone", per:"each", del:"Delete",
    settle_title:n => `Settle up — just ${n} transfer${n > 1 ? "s" : ""}`,
    settle_hint:"The fewest transfers that clear every balance.",
    settled_big:"All settled", settled_sub:"Nobody owes anybody. You're good.",
    pays_to:"→",

    b_sub:"Expense split statement", b_no:"Bill no.", b_noname:"Untitled group",
    bill_mark:"✦",
    b_legal:"A statement between friends · informal, not a tax invoice",
    b_total:"Total expenses",
    b_people:"People", b_count:"Expenses", b_avg:"Average each", b_moves:"Transfers",
    b_details:"Expense detail", b_items:n => `${n} item${n > 1 ? "s" : ""}`,
    b_hash:"#", b_desc:"Description", b_payer:"Paid by", b_among:"Split between",
    b_each:"Each", b_amount:"Amount",
    b_ledger:"Per person", b_ledger_c:"paid · share · balance",
    b_name:"Name", b_paid:"Paid", b_share:"Share", b_balance:"Balance",
    b_settle:"Transfers required", b_settle_c:n => `${n} transfer${n > 1 ? "s" : ""} clears everything`,
    b_pays:"pays",
    b_sign_from:"Payer's signature", b_sign_to:"Recipient's signature",
    b_made:"Made with", b_slogan:"Bills settled, friendships intact"
  }
};

let lang = "ar";

export const getLang = () => lang;
export const L = () => I18N[lang];
export const t = (key, ...args) => {
  const v = L()[key];
  return typeof v === "function" ? v(...args) : v;
};

export function setLang(next){
  if(!I18N[next]) return;
  lang = next;
  try{ localStorage.setItem("safi-lang", lang); }catch(e){}
}

export function restoreLang(){
  try{
    const saved = localStorage.getItem("safi-lang");
    if(saved && I18N[saved]) lang = saved;
  }catch(e){}
  return lang;
}

/* Swap every translatable node. Elements opt in with data-i18n (text),
   data-i18n-ph (placeholder) or data-i18n-aria (aria-label). */
export function paintStrings(){
  const d = L();
  document.documentElement.lang = d.lang;
  document.documentElement.dir  = d.dir;
  document.title = d.title;

  document.querySelectorAll("[data-i18n]").forEach(el => el.textContent = t(el.dataset.i18n));
  document.querySelectorAll("[data-i18n-ph]").forEach(el => el.placeholder = t(el.dataset.i18nPh));
  document.querySelectorAll("[data-i18n-aria]").forEach(el =>
    el.setAttribute("aria-label", t(el.dataset.i18nAria)));

  /* section numerals follow the script. Scoped to `.wrap >` so the generated
     settlement card — whose badge is a ✓ — is left alone. */
  document.querySelectorAll(".wrap > .card > h2 .n")
    .forEach((el, i) => el.textContent = d.nums[i] || String(i + 1));
}
