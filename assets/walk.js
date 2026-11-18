/* walk.js: the step engine for every DIT walkthrough. No build step, no dependencies.

   Load this file FIRST, then the page's own <script>. The engine starts when the page has loaded.

   The page gives <body class="walk" data-title="..." data-sub="..." data-back="../index.html#part3">
   and a <main> with its own panels. walk.js adds the header, the progress bar, the footer and the
   arrow layer. The page's script defines:

     initialState()            -> the model s: plain data that describes the whole picture
     STEPS = [{ part, title, narr, apply(s) -> H }]
     renderPanels(s, H)        draws every panel from s (and nothing else)
     structuralArrows(s, H)    optional: arrows that follow from the model; return arrow(...) strings
     GUESSES = { id: { q, choices: [...], right: index, answer } }   optional

   H says what this step points at:
     { hot: [ids], arrows: [[fromId, toId, cls, label]], call: { who, act, ret, bad, note } }
   who is a key of ACTORS ('a', 'b', 'exec', 'mw', 'os', 'hw') or { label, color }.

   To show step i, the engine runs apply() for steps 0..i on a fresh initialState(). So the
   panels always agree with the model, and any step opens directly from its URL (page.html#7).

   Keys: → Space PageDown next · ← PageUp back · Home End · E explanation.
   (Presentation clickers send PageUp and PageDown, so a clicker works too.) */

/* ---------- helpers a page can use ---------- */
const $ = (id) => document.getElementById(id);
const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const ACTORS = {
  a:    { label: 'your node',    color: 'var(--a)' },
  b:    { label: 'other node',   color: 'var(--b)' },
  exec: { label: 'executor',     color: 'var(--exec)' },
  mw:   { label: 'DDS',          color: 'var(--mw)' },
  os:   { label: 'Linux kernel', color: 'var(--os)' },
  hw:   { label: 'hardware',     color: 'var(--hw)' },
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

/* The guess card. Ask on one step (guessCard(id)), reveal on a later one (guessCard(id, true)).
   The reader's pick is kept for this browser session, so going back and forth keeps it. */
const guessKey = (id) => 'dit-guess:' + location.pathname + ':' + id;
function guessPick(id) { try { const v = sessionStorage.getItem(guessKey(id)); return v == null ? -1 : +v; } catch (e) { return -1; } }
function guessCard(id, reveal) {
  const G = GUESSES[id], p = guessPick(id);
  if (!reveal) {
    return `<div class="guess" id="guess-${id}"><span class="gh">Your guess</span><p>${G.q}</p><div class="opts">${G.choices.map((c, i) =>
      `<button type="button" data-g="${id}" data-i="${i}" class="${p === i ? 'pick' : ''}">${c}</button>`).join('')}</div>
      <div class="gn">${p < 0 ? 'Pick one, then press Next ▶.' : 'Now press Next ▶ and watch.'}</div></div>`;
  }
  const head = p < 0 ? 'You did not guess.' : p === G.right ? '✓ Your guess was right.' : '✗ Not what you guessed.';
  return `<div class="guess done" id="guess-${id}"><span class="gh">Your guess</span> <span class="gn">${head}</span><br>
    <span class="ans right"><small>answer</small>${G.answer || G.choices[G.right]}</span>${p >= 0 && p !== G.right ? `<span class="ans wrong"><small>your guess</small>${G.choices[p]}</span>` : ''}</div>`;
}
document.addEventListener('click', (ev) => {
  const b = ev.target.closest && ev.target.closest('.guess button[data-g]'); if (!b) return;
  try { sessionStorage.setItem(guessKey(b.dataset.g), b.dataset.i); } catch (e) {}
  b.parentElement.querySelectorAll('button').forEach(x => x.classList.toggle('pick', x === b));
  const gn = b.closest('.guess').querySelector('.gn'); if (gn) gn.textContent = 'Now press Next ▶ and watch.';
});

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
    header.innerHTML = `${b.dataset.back ? `<a class="back" href="${b.dataset.back}">← Worksheet</a>` : ''}
      <div class="title">${b.dataset.title || document.title}${b.dataset.sub ? `<span>${b.dataset.sub}</span>` : ''}</div>
      <div class="stepno"><span class="part" id="part"></span> · step <b id="stepno">1</b> / <span id="steptotal"></span></div>
      <nav><button id="explain" type="button" title="Show or hide the explanation (E)"></button>
        <button id="prev" type="button" title="← or PageUp">◀ Prev</button>
        <button id="next" type="button" title="→, Space or PageDown">Next ▶</button></nav>`;
    const bar = document.createElement('div'); bar.className = 'progress'; bar.id = 'bar';
    bar.innerHTML = STEPS.map((st, k) => `<i data-k="${k}" class="${k > 0 && st.part !== STEPS[k - 1].part ? 'sec' : ''}" title="Step ${k + 1}: ${esc(st.part)}"></i>`).join('');
    bar.onclick = (ev) => { const k = ev.target.dataset && ev.target.dataset.k; if (k != null) go(+k); };
    const footer = document.createElement('footer'); footer.innerHTML = '<div class="call" id="call"></div><div class="narr" id="narr"></div>';
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.id = 'arrows';
    const main = document.querySelector('main');
    b.insertBefore(header, main); b.insertBefore(bar, main); main.after(footer); b.append(svg);
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
    let out = `<span class="who" style="--c:${who.color}">${esc(who.label)}</span>`;
    if (c.act) out += `<span class="act">${esc(c.act)}</span>`;
    if (c.ret) out += `<span class="ret ${c.bad ? 'bad' : ''}">${esc(c.ret)}</span>`;
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
    $('narr').innerHTML = `<h3>${st.title}</h3>${/^<(ul|ol|table|p)\b/.test(body) ? body : '<p>' + body + '</p>'}`;
    $('part').textContent = st.part;
    $('stepno').textContent = current + 1; $('steptotal').textContent = STEPS.length;
    [...$('bar').children].forEach((el, k) => { el.classList.toggle('done', k < current); el.classList.toggle('cur', k === current); });
    $('prev').disabled = current === 0; $('next').disabled = current === STEPS.length - 1;
    document.querySelector('body > footer').classList.toggle('collapsed', !explain);
    const tb = $('explain'); tb.textContent = explain ? 'Hide explanation' : 'Explain (E)'; tb.setAttribute('aria-pressed', explain ? 'true' : 'false');
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
    });
    window.addEventListener('resize', drawArrows);
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
