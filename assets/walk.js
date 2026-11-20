/* walk.js: the step engine for every DIT walkthrough. No build step, no dependencies.

   Load assets/lang.js in <head>, then this file, then the page's own <script>. The engine starts
   when the page has loaded.

   The page gives <body class="walk" data-title="..." data-title-zh="..." data-sub="..."
   data-sub-zh="..." data-back="../index.html#part3">
   and a <main> with its own panels. walk.js adds the header, the progress bar, the footer and the
   arrow layer. The page's script defines:

     initialState()            -> the model s: plain data that describes the whole picture
     STEPS = [{ part, title, narr, apply(s) -> H }]
     PARTS = { A: { title, kind, intro }, ... }   the sections; a step's part is a key of PARTS.
        kind is 'before' (the normal run, before the bug shows up), 'bug', 'fix' or 'recap'. It colours the section bar under the header,
        the progress bar and the header label, so the room sees at once when the story moves
        from the bug to the fix. intro is one line shown in the section bar.
        (Without PARTS, part is shown as plain text and has no colour.)
     renderPanels(s, H)        draws every panel from s (and nothing else)
     structuralArrows(s, H)    optional: arrows that follow from the model; return arrow(...) strings

   H says what this step points at:
     { hot: [ids], arrows: [[fromId, toId, cls, label]], call: { who, act, ret, bad, note } }
   who is a key of ACTORS ('a', 'b', 'exec', 'mw', 'os', 'hw') or { label, color }.

   To show step i, the engine runs apply() for steps 0..i on a fresh initialState(). So the
   panels always agree with the model, and any step opens directly from its URL (page.html#7).

   Every text a reader sees is in English and Chinese: write it as T('English', '中文') (lang.js).
   An arrow label can be ['English', '中文'].

   Keys: → Space PageDown next · ← PageUp back · Home End · E explanation · L English/中文.
   (Presentation clickers send PageUp and PageDown, so a clicker works too.) */

/* ---------- helpers a page can use ---------- */
const $ = (id) => document.getElementById(id);
const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const ACTORS = {
  a:    { label: T('your node', '你的 node'),      color: 'var(--a)' },
  b:    { label: T('other node', '另一個 node'),   color: 'var(--b)' },
  exec: { label: 'executor',                       color: 'var(--exec)' },
  mw:   { label: 'DDS',                            color: 'var(--mw)' },
  os:   { label: T('Linux kernel', 'Linux 核心'), color: 'var(--os)' },
  hw:   { label: T('hardware', '硬體'),           color: 'var(--hw)' },
};
/* an actor chip for titles and narration: actor('exec', 'The executor') */
const actor = (k, label) => `<span class="actor ${k}">${label || ACTORS[k].label}</span>`;

/* split "code  # comment" so the comment can be drawn grey (Python # and C++ //) */
function splitComment(t) {
  const m = t.match(/^(\s*)((?:#|\/\/).*)$/);
  if (m) return [m[1], '', m[2]];
  const k = t.search(/\s{2,}(?:#|\/\/) /);
  const lead = t.match(/^\s*/)[0];
  if (k < 0) return [lead, t.slice(lead.length), ''];
  return [lead, t.slice(lead.length, k), t.slice(k)];
}

/* Syntax colours for a line of code, as HTML. The same rules and colours as worksheet.js. */
const HL_KW = {
  py: 'and as assert async await break class continue def del elif else except False finally for from global if import in is lambda None nonlocal not or pass raise return True try while with yield self',
  cpp: 'auto bool break case catch char class const constexpr continue default delete do double else enum explicit false float for if include int long namespace new nullptr private protected public return shared_ptr short static struct switch template this throw true try typename unsigned using virtual void while',
  sh: 'cd export source sudo docker ros2 colcon python3 then fi do done for in if',
};
const HL_RULES = {
  py: /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|\b(\d+(?:\.\d+)?)\b|\b([A-Za-z_]\w*)(?=\()|\b([A-Za-z_]\w*)\b/g,
  cpp: /("(?:[^"\\]|\\.)*")|\b(\d+(?:\.\d+)?)\b|\b([A-Za-z_]\w*)(?=\()|\b([A-Za-z_]\w*)\b/g,
  sh: /("(?:[^"\\]|\\.)*"|'[^']*')|\b(\d+(?:\.\d+)?)\b|()\b([A-Za-z_][\w-]*)\b/g,
};
const langOf = (name) => /\.py$/.test(name) ? 'py' : /\.(cpp|hpp|cc|c|h)$/.test(name) ? 'cpp' : /\.(sh|bash)$/.test(name) ? 'sh' : '';
function highlight(code, lang) {
  if (!HL_RULES[lang]) return esc(code);
  const kw = new Set(HL_KW[lang].split(' '));
  let out = '', last = 0;
  code.replace(HL_RULES[lang], (m, str, num, fn, word, off) => {
    const cls = str ? 'str' : num ? 'num' : fn ? (kw.has(fn) ? 'kw' : 'fn') : (word && kw.has(word)) ? 'kw' : '';
    if (!cls) return m;
    out += esc(code.slice(last, off)) + `<span class="${cls}">${esc(m)}</span>`;
    last = off + m.length;
    return m;
  });
  return out + esc(code.slice(last));
}

/* A code listing. rows: ['line', ...] numbered from 1, or [[lineNo, 'line'], ...] to keep the
   file's real line numbers (a jump in numbers shows a ⋮ row). cur: a line number or an array.
   The language comes from the file name in title or sub (.py, .cpp, .sh), or pass lang. */
function listing(id, title, sub, rows, cur, lang) {
  lang = lang || langOf(title) || langOf(sub || '');
  const on = new Set([].concat(cur || []));
  const rs = rows.map((r, i) => Array.isArray(r) ? r : [i + 1, r]);
  const li = rs.map(([n, t], k) => {
    const gap = k > 0 && n > rs[k - 1][0] + 1 ? `<li class="gap"><span class="ln">⋮</span><span class="tx"></span></li>` : '';
    const [lead, code, cm] = splitComment(t);
    return gap + `<li id="${id}-ln-${n}" class="${on.has(n) ? 'cur' : ''}"><span class="ln">${n}</span><span class="tx">${lead}${highlight(code, lang)}${cm ? `<span class="c">${esc(cm)}</span>` : ''}</span></li>`;
  }).join('');
  return `<div class="panel prog" id="${id}"><div class="ph">${title}<small>${esc(sub || '')}</small></div><ol>${li}</ol></div>`;
}

/* key/value rows: [{ k, v, id }] */
const kv = (rows) => `<div class="kv">${rows.map(r => `<span class="k">${r.k}</span><span class="v" ${r.id ? `id="${r.id}"` : ''}>${r.v}</span>`).join('')}</div>`;

/* a panel with a header: panel('thread', 'The thread', 'one per executor', html) */
const panel = (id, title, sub, body) => `<div class="panel" id="${id}"><div class="ph">${title}<small>${sub || ''}</small></div><div class="pb">${body}</div></div>`;

/* ---------- sections ---------- */
const KINDS = { before: T('Before the bug', '問題出現前'), bug: T('The bug', '問題'), fix: T('The fix', '修正'), recap: T('Recap', '重點回顧') };
function partInfo(st) {
  const P = typeof PARTS === 'object' && PARTS ? PARTS[st.part] : null;
  if (!P) return { key: '', label: st.part || '', kind: '', intro: '' };
  return { key: st.part, label: (/^[A-Z]$/.test(st.part) && P.kind !== 'recap' ? st.part + ' · ' : '') + P.title, kind: P.kind || '', intro: P.intro || '', tag: P.tag || KINDS[P.kind] || '' };
}

/* ---------- arrows between two elements, by id ---------- */
function anchor(r, side) {
  if (side === 'left') return { x: r.left, y: r.top + r.height / 2 };
  if (side === 'right') return { x: r.right, y: r.top + r.height / 2 };
  if (side === 'top') return { x: r.left + r.width / 2, y: r.top };
  return { x: r.left + r.width / 2, y: r.bottom };
}
function arrow(fromId, toId, cls, label) {
  const a = $(fromId), b = $(toId); if (!a || !b) return '';
  const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
  if (!ra.width || !rb.width) return '';
  const dxc = (rb.left + rb.width / 2) - (ra.left + ra.width / 2), dyc = (rb.top + rb.height / 2) - (ra.top + ra.height / 2);
  // side by side (no horizontal overlap): a horizontal arrow; stacked: a vertical one
  const sideBySide = ra.right <= rb.left || rb.right <= ra.left;
  const vertical = !sideBySide, hw = 7;
  let p0, p3, c1, c2, end, head;
  if (!vertical) {
    const d = dxc >= 0 ? 1 : -1;
    p0 = anchor(ra, d > 0 ? 'right' : 'left'); p3 = anchor(rb, d > 0 ? 'left' : 'right');
    const k = Math.max(30, Math.abs(p3.x - p0.x) * .45) * d;
    end = { x: p3.x - d * 10, y: p3.y }; c1 = { x: p0.x + k, y: p0.y }; c2 = { x: end.x - k, y: end.y };
    head = `${p3.x},${p3.y} ${p3.x - d * 12},${p3.y - hw} ${p3.x - d * 12},${p3.y + hw}`;
  } else {
    const d = dyc >= 0 ? 1 : -1;
    p0 = anchor(ra, d > 0 ? 'bottom' : 'top'); p3 = anchor(rb, d > 0 ? 'top' : 'bottom');
    const k = Math.max(30, Math.abs(p3.y - p0.y) * .45) * d;
    end = { x: p3.x, y: p3.y - d * 10 }; c1 = { x: p0.x, y: p0.y + k }; c2 = { x: end.x, y: end.y - k };
    head = `${p3.x},${p3.y} ${p3.x - hw},${p3.y - d * 12} ${p3.x + hw},${p3.y - d * 12}`;
  }
  if (Array.isArray(label)) label = L(label[0], label[1]);
  const c = cls || 'flow';
  let out = `<path class="${c}" d="M${p0.x},${p0.y} C${c1.x},${c1.y} ${c2.x},${c2.y} ${end.x},${end.y}"/><polygon class="${c}" points="${head}"/>`;
  if (label) {
    const mx = (p0.x + 3 * c1.x + 3 * c2.x + end.x) / 8, my = (p0.y + 3 * c1.y + 3 * c2.y + end.y) / 8;
    out += `<text x="${mx}" y="${my - 6}" text-anchor="middle" class="${c}">${esc(label)}</text>`;
  }
  return out;
}

/* ---------- the engine ---------- */
(function () {
  let current = 0, state = null, H = null;
  let explain = false;
  try { explain = sessionStorage.getItem('dit-explain') === '1'; } catch (e) {}

  function buildChrome() {
    const b = document.body;
    const header = document.createElement('header');
    const both = (k) => b.dataset[k] ? T(b.dataset[k], b.dataset[k + 'Zh'] || b.dataset[k]) : '';
    header.innerHTML = `${b.dataset.back ? `<a class="back" href="${b.dataset.back}">${T('← Worksheet', '← 學習單')}</a>` : ''}
      <div class="title">${both('title') || document.title}${b.dataset.sub ? `<span class="sub">${both('sub')}</span>` : ''}</div>
      <div class="stepno"><span class="part" id="part"></span> · ${T('step', '步驟')} <b id="stepno">1</b> / <span id="steptotal"></span></div>
      <nav><button id="explain" type="button" title="E"></button>
        <button id="prev" type="button" title="← PageUp">${T('◀ Prev', '◀ 上一步')}</button>
        <button id="next" type="button" title="→ Space PageDown">${T('Next ▶', '下一步 ▶')}</button></nav>`;
    if (window.DIT && DIT.langButton) header.querySelector('nav').prepend(DIT.langButton());
    const bar = document.createElement('div'); bar.className = 'progress'; bar.id = 'bar';
    bar.innerHTML = STEPS.map((st, k) => { const p = partInfo(st);
      return `<i data-k="${k}" class="k-${p.kind} ${k > 0 && st.part !== STEPS[k - 1].part ? 'sec' : ''}" title="${k + 1}"></i>`; }).join('');
    bar.onclick = (ev) => { const k = ev.target.dataset && ev.target.dataset.k; if (k != null) go(+k); };
    const footer = document.createElement('footer'); footer.innerHTML = '<div class="call" id="call"></div><div class="narr" id="narr"></div>';
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.id = 'arrows';
    const main = document.querySelector('main');
    const sec = document.createElement('div'); sec.className = 'section'; sec.id = 'section';
    b.insertBefore(header, main); b.insertBefore(bar, main); b.insertBefore(sec, main); main.after(footer); b.append(svg);
    $('prev').onclick = () => go(current - 1);
    $('next').onclick = () => go(current + 1);
    $('explain').onclick = () => setExplain(!explain);
  }

  function setExplain(on) {
    explain = on;
    try { sessionStorage.setItem('dit-explain', on ? '1' : '0'); } catch (e) {}
    chrome();
  }

  function compute(i) {
    const s = initialState(); let h = {};
    for (let k = 0; k <= i; k++) { s.ghosts = []; h = STEPS[k].apply(s) || {}; }
    h.hot = h.hot || []; h.arrows = h.arrows || [];
    return { s, h };
  }

  function renderCall(c) {
    if (!c) return '';
    const who = typeof c.who === 'string' ? ACTORS[c.who] : (c.who || ACTORS.exec);
    let out = `<span class="who" style="--c:${who.color}">${who.label}</span>`;
    if (c.act) out += `<span class="act">${esc(c.act)}</span>`;
    if (c.ret) out += `<span class="ret ${c.bad ? 'bad' : ''}">${c.ret}</span>`;   // HTML: may be T(...)
    if (c.note) out += `<span class="note">${c.note}</span>`;
    return out;
  }

  function drawArrows() {
    const svg = $('arrows'); if (!svg || !state) return;
    let out = typeof structuralArrows === 'function' ? (structuralArrows(state, H) || '') : '';
    for (const [f, t, cls, label] of H.arrows) out += arrow(f, t, cls, label);
    svg.innerHTML = out;
  }

  function chrome() {
    const st = STEPS[current];
    $('call').innerHTML = renderCall(H.call);
    const body = st.narr.trim();
    const hint = `<span class="hint">${T('press E for the explanation', '按 E 看說明')}</span>`;
    $('narr').innerHTML = `<h3>${st.title}${hint}</h3>${/^<(ul|ol|table|p|div)\b/.test(body) ? body : '<p>' + body + '</p>'}`;
    const p = partInfo(st), entering = current === 0 || st.part !== STEPS[current - 1].part;
    $('part').innerHTML = p.label; $('part').className = 'part k-' + p.kind;
    document.body.dataset.kind = p.kind;
    const sec = $('section');
    sec.innerHTML = p.kind ? `<span class="sk">${p.tag}</span><b>${p.label}</b>${p.intro ? `<span class="si">${p.intro}</span>` : ''}` : '';
    sec.className = 'section k-' + p.kind;
    if (entering && p.kind && current > 0) { void sec.offsetWidth; sec.classList.add('enter'); }
    $('stepno').textContent = current + 1; $('steptotal').textContent = STEPS.length;
    [...$('bar').children].forEach((el, k) => { el.classList.toggle('done', k < current); el.classList.toggle('cur', k === current); });
    $('prev').disabled = current === 0; $('next').disabled = current === STEPS.length - 1;
    document.querySelector('body > footer').classList.toggle('collapsed', !explain);
    const tb = $('explain'); tb.innerHTML = explain ? T('Hide explanation', '隱藏說明') : T('Explain (E)', '說明 (E)'); tb.setAttribute('aria-pressed', explain ? 'true' : 'false');
    const h3 = document.querySelector('#narr h3'); if (h3 && !explain) h3.onclick = () => setExplain(true);
    drawArrows();
  }

  function render() {
    renderPanels(state, H);
    for (const id of H.hot) { const el = $(id); if (el) el.classList.add('hot'); }
    chrome();
  }

  function go(i) {
    current = Math.max(0, Math.min(STEPS.length - 1, i));
    ({ s: state, h: H } = compute(current));
    render();
    history.replaceState(null, '', '#' + (current + 1));
  }

  function start() {
    buildChrome();
    document.addEventListener('keydown', (ev) => {
      if (ev.target && /^(input|textarea|select|button)$/i.test(ev.target.tagName) && ev.key === ' ') return;
      if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
      if (['ArrowRight', ' ', 'PageDown'].includes(ev.key)) { ev.preventDefault(); go(current + 1); }
      else if (['ArrowLeft', 'PageUp'].includes(ev.key)) { ev.preventDefault(); go(current - 1); }
      else if (ev.key === 'Home') go(0);
      else if (ev.key === 'End') go(STEPS.length - 1);
      else if (ev.key === 'e' || ev.key === 'E') setExplain(!explain);
      else if ((ev.key === 'l' || ev.key === 'L') && window.DIT) DIT.toggleLang();
    });
    window.addEventListener('resize', drawArrows);
    document.addEventListener('dit-lang', () => requestAnimationFrame(drawArrows));
    document.addEventListener('scroll', drawArrows, true);
    window.addEventListener('hashchange', () => {
      const want = (parseInt(location.hash.slice(1), 10) || 1) - 1;
      if (want !== current) go(want);
    });
    go((parseInt(location.hash.slice(1), 10) || 1) - 1);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(drawArrows);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
