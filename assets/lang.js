/* lang.js: the English / 中文 switch on every DIT page. No build step, no dependencies.

   Load it in <head>, before anything else, so the page paints in the right language at once:
     <script src="../assets/lang.js"></script>

   English is the main text. The Traditional Chinese text sits right next to it, in the same file:
     <p lang="en">The executor runs one callback at a time.</p>
     <p lang="zh-Hant">executor 一次只跑一個 callback。</p>
   Anything with lang="en" shows in English, anything with lang="zh-Hant" shows in Chinese, and
   anything without a lang shows in both: code, terminal output, numbers.

   In a script:
     T('English', '中文')   both, as HTML (a <span> pair, or a <div> pair if either holds a block)
     L('English', '中文')   only the current one, as plain text (for SVG labels and attributes)
     DIT.lang()             'en' or 'zh'
   When the reader switches, the document gets a 'dit-lang' event.

   The choice is kept in this browser. ?lang=zh (or ?lang=en) in a link overrides it. */
(function () {
  const KEY = 'dit-lang';
  let lang = 'en';
  try { if (localStorage.getItem(KEY) === 'zh') lang = 'zh'; } catch (e) {}
  const q = /[?&]lang=(en|zh)\b/.exec(location.search);
  if (q) lang = q[1];

  const root = document.documentElement;
  function apply() {
    root.classList.toggle('zh', lang === 'zh');
    root.lang = lang === 'zh' ? 'zh-Hant' : 'en';
  }
  apply();

  function sync() {
    document.querySelectorAll('button.langswitch').forEach(b => {
      b.textContent = lang === 'zh' ? 'English' : '中文';
      b.title = lang === 'zh' ? 'Switch to English (L)' : '切換成中文 (L)';
    });
  }

  window.DIT = window.DIT || {};
  DIT.lang = () => lang;
  DIT.setLang = (l) => {
    lang = l === 'zh' ? 'zh' : 'en';
    try { localStorage.setItem(KEY, lang); } catch (e) {}
    apply(); sync();
    document.dispatchEvent(new CustomEvent('dit-lang', { detail: lang }));
  };
  DIT.toggleLang = () => DIT.setLang(lang === 'zh' ? 'en' : 'zh');
  /* a switch button; worksheet.js and walk.js place it */
  DIT.langButton = (cls) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'langswitch' + (cls ? ' ' + cls : '');
    b.onclick = DIT.toggleLang;
    b.textContent = lang === 'zh' ? 'English' : '中文';
    b.title = lang === 'zh' ? 'Switch to English (L)' : '切換成中文 (L)';
    return b;
  };
})();

function T(en, zh) {
  const tag = /<(ul|ol|p|div|table|pre|h\d)\b/i.test(en + zh) ? 'div' : 'span';
  return `<${tag} lang="en">${en}</${tag}><${tag} lang="zh-Hant">${zh}</${tag}>`;
}
function L(en, zh) { return DIT.lang() === 'zh' ? zh : en; }
