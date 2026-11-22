// present.js: present mode and a laser pointer, for every worksheet and walkthrough.
// Loaded by worksheet.js and walk.js; no page needs to include it. No build step, no dependencies.
//
//  - Present mode (worksheets): P, or the "Present" button. The page becomes slides, in order:
//    every h2 and h3 starts a slide, and the blocks after it are packed onto slides that fit the
//    screen. An element with data-slide always starts a new slide, and one with data-present="no"
//    is left out. ← → (or a clicker) move, Esc leaves.
//  - Laser: K toggles a red dot that follows the mouse.
(function () {
  if (window.DITPresent) return;

  const me = document.currentScript;
  const ROOT = me ? me.src.replace(/assets\/present\.js.*$/, '') : location.href.replace(/[^/]*$/, '');
  const T2 = (en, zh) => (typeof T === 'function' ? T(en, zh) : en);                 // HTML, both languages
  const TT = (en, zh) => (window.DIT && DIT.lang && DIT.lang() === 'zh' ? zh : en);  // plain text, for title=""
  const ss = {
    get(k) { try { return JSON.parse(sessionStorage.getItem('dit-present:' + k)); } catch (e) { return null; } },
    set(k, v) { try { if (v === null) sessionStorage.removeItem('dit-present:' + k); else sessionStorage.setItem('dit-present:' + k, JSON.stringify(v)); } catch (e) {} },
  };
  const qs = new URLSearchParams(location.search);

  const css = document.createElement('link');
  css.rel = 'stylesheet'; css.href = ROOT + 'assets/present.css';
  document.head.append(css);
  const cssReady = new Promise(r => { css.onload = css.onerror = r; });   // slides are measured with it

  const page = () => { const h = location.href.split('#')[0].split('?')[0]; return h.startsWith(ROOT) ? h.slice(ROOT.length) : location.pathname; };
  // a page whose .ws has data-present="no" (the home page) gets the laser, but no slides
  const ws0 = document.querySelector('.ws'), ws = ws0 && ws0.dataset.present !== 'no' ? ws0 : null;
  const isWalk = !ws && !!document.querySelector('script[src*="walk.js"]');
  const typing = ev => ev.target && /^(input|textarea|select)$/i.test(ev.target.tagName);

  /* ================= slides (worksheets) ================= */
  let blocks = [], slides = [], cur = 0, presenting = false;
  if (ws) {
    blocks = [...ws.children].filter(el => !el.matches('nav.map, footer, script, style, link'));
    blocks.forEach((el, i) => { el.dataset.pid = i; });
  }
  const isHead = el => el.tagName === 'H2' || el.tagName === 'H3';

  function outerH(el) {
    const r = el.getBoundingClientRect();
    if (!r.height) return 0;
    const cs = getComputedStyle(el);
    return r.height + parseFloat(cs.marginTop) + parseFloat(cs.marginBottom);
  }
  function build(keepPid) {
    document.documentElement.classList.add('p-measure');
    const room = ws.clientHeight - parseFloat(getComputedStyle(ws).paddingTop) - parseFloat(getComputedStyle(ws).paddingBottom);
    slides = [];
    let s = null, h = 0, part = null, sub = null;
    blocks.forEach(el => {
      const eh = outerH(el);
      if (el.tagName === 'H2') { part = el; sub = null; }
      if (el.tagName === 'H3') sub = el;
      const onlyHeads = s && s.items.every(x => isHead(x) || !outerH(x));
      const brk = !s || el.tagName === 'H2' || el.hasAttribute('data-slide') ||
        (el.tagName === 'H3' && !(onlyHeads && s.items.some(x => x.tagName === 'H2'))) ||
        (eh && h + eh > room && !onlyHeads);
      if (brk) { s = { items: [], part, sub }; slides.push(s); h = 0; }
      s.items.push(el); h += eh;
      if (el.tagName === 'H3') s.sub = el;
    });
    slides = slides.filter(x => x.items.some(el => outerH(el) > 0));
    // balance: a slide that holds only a small tail of its subsection takes one more block from the slide before
    const hOf = x => x.items.reduce((t, el) => t + outerH(el), 0);
    for (let k = 1; k < slides.length; k++) {
      const a = slides[k - 1], b = slides[k];
      if (isHead(b.items[0]) || b.items[0].hasAttribute('data-slide')) continue;   // b starts its own subsection
      const visA = a.items.filter(el => outerH(el) > 0);
      if (hOf(b) > room * 0.3 || visA.length < 2) continue;
      const last = visA[visA.length - 1];
      if (isHead(last) || hOf(b) + outerH(last) > room) continue;
      const cut = a.items.indexOf(last);
      b.items = a.items.slice(cut).concat(b.items); a.items = a.items.slice(0, cut);
    }
    document.documentElement.classList.remove('p-measure');
    cur = keepPid != null ? slideOf(keepPid) : Math.min(cur, slides.length - 1);
  }
  function slideOf(pid) {
    const k = slides.findIndex(x => x.items.some(el => +el.dataset.pid === +pid));
    return k < 0 ? 0 : k;
  }
  const label = el => { if (!el) return ''; const c = el.cloneNode(true); c.querySelectorAll('small').forEach(x => x.remove()); return c.innerHTML; };
  function show(k) {
    cur = Math.max(0, Math.min(slides.length - 1, k));
    const on = new Set(slides[cur].items);
    blocks.forEach(el => el.classList.toggle('p-on', on.has(el)));
    ws.scrollTop = 0;
    const s = slides[cur];
    const kick = s.part && s.part.querySelector('small') ? s.part.querySelector('small').innerHTML + ' · ' : '';
    bar.crumb.innerHTML = kick + label(s.sub || s.part);
    bar.no.textContent = `${cur + 1} / ${slides.length}`;
    bar.prev.disabled = cur === 0; bar.next.disabled = cur === slides.length - 1;
    ss.set('slide:' + page(), +s.items[0].dataset.pid);
  }
  function enter(pid) {
    if (!ws || presenting) return;
    presenting = true; ss.set('presenting', true);
    document.documentElement.classList.add('presenting');
    bar.el.hidden = false;
    build(pid != null ? pid : ss.get('slide:' + page()));
    show(cur); pill.paint();
  }
  function leave() {
    if (!presenting) return;
    const first = slides[cur] && slides[cur].items.find(el => outerH(el) > 0);
    presenting = false; ss.set('presenting', null);
    document.documentElement.classList.remove('presenting');
    blocks.forEach(el => el.classList.remove('p-on'));
    bar.el.hidden = true;
    if (first) first.scrollIntoView({ block: 'start' });
    pill.paint();
  }

  /* ================= the bar ================= */
  const bar = {};
  if (ws) {
    const el = document.createElement('div');
    el.className = 'p-bar'; el.hidden = true;
    el.innerHTML = `<button type="button" class="p-prev" title="${TT('Previous', '上一張')} (←)">‹</button>
      <span class="p-no"></span><button type="button" class="p-next" title="${TT('Next', '下一張')} (→)">›</button>
      <span class="p-crumb"></span>
      <button type="button" class="p-exit" title="Esc">${T2('Exit', '離開')}</button>`;
    document.body.append(el);
    Object.assign(bar, { el, prev: el.querySelector('.p-prev'), next: el.querySelector('.p-next'), no: el.querySelector('.p-no'), crumb: el.querySelector('.p-crumb') });
    bar.prev.onclick = () => show(cur - 1);
    bar.next.onclick = () => show(cur + 1);
    el.querySelector('.p-exit').onclick = () => leave();
    const start = document.createElement('button');
    start.type = 'button'; start.className = 'p-start';
    start.innerHTML = T2('Present', '簡報') + ' <kbd>P</kbd>';
    start.title = TT('Present this worksheet as slides (P)', '把這份學習單當簡報放映（P）');
    start.onclick = () => enter();
    document.body.append(start);
  }

  const pill = { el: document.createElement('div') };
  pill.el.className = 'p-pill';
  document.body.append(pill.el);
  // the laser button: in the bar while presenting, and floating on walkthroughs
  pill.paint = function () {
    const show = presenting || isWalk;
    pill.el.hidden = !show;
    if (!show) return;
    const home = presenting ? bar.el : document.body;
    if (pill.el.parentElement !== home) { if (presenting) bar.el.insertBefore(pill.el, bar.el.querySelector('.p-exit')); else document.body.append(pill.el); }
    pill.el.innerHTML = `<button type="button" class="p-laser ${laser.on ? 'on' : ''}" title="${TT('Laser pointer', '雷射筆')} (K)">●<span>${T2('Laser', '雷射筆')}</span></button>`;
    pill.el.querySelector('.p-laser').onclick = () => laser.toggle();
  };
  document.addEventListener('dit-lang', () => { pill.paint(); if (presenting) { const pid = slides[cur] && +slides[cur].items[0].dataset.pid; build(pid); show(cur); } });

  /* ================= laser ================= */
  const laser = { on: false, dot: document.createElement('div') };
  laser.dot.className = 'p-dot';
  document.body.append(laser.dot);
  laser.toggle = function () {
    laser.on = !laser.on;
    document.documentElement.classList.toggle('p-lasering', laser.on);
    laser.dot.style.display = 'none';
    pill.paint();
  };
  document.addEventListener('mousemove', ev => {
    if (!laser.on) return;
    laser.dot.style.display = 'block';
    laser.dot.style.transform = `translate(${ev.clientX}px, ${ev.clientY}px)`;
  });
  document.addEventListener('mouseleave', () => { if (laser.on) laser.dot.style.display = 'none'; });

  /* ================= keys ================= */
  document.addEventListener('keydown', ev => {
    if (typing(ev) || ev.ctrlKey || ev.metaKey || ev.altKey) return;
    const k = ev.key;
    if (k === 'k' || k === 'K') { laser.toggle(); return; }
    if (!ws) return;
    if (!presenting) { if (k === 'p' || k === 'P') enter(); return; }
    if (['ArrowRight', 'PageDown', ' ', 'ArrowDown'].includes(k) && !(k === 'ArrowDown' && ws.scrollHeight > ws.clientHeight + 4 && ws.scrollTop + ws.clientHeight < ws.scrollHeight - 4)) { ev.preventDefault(); show(cur + 1); }
    else if (['ArrowLeft', 'PageUp', 'ArrowUp'].includes(k) && !(k === 'ArrowUp' && ws.scrollTop > 4)) { ev.preventDefault(); show(cur - 1); }
    else if (k === 'Home') show(0);
    else if (k === 'End') show(slides.length - 1);
    else if (k === 'Escape' || k === 'p' || k === 'P') leave();
  }, true);
  // phones: swipe left for the next slide, right for the previous. On a phone held upright the slides
  // are turned 90° (present.css), so "left" on the slide is "up" on the glass.
  const turned = matchMedia('(orientation: portrait) and (max-width: 600px)');
  let touch = null;
  document.addEventListener('touchstart', ev => { if (presenting && ev.touches.length === 1) touch = [ev.touches[0].clientX, ev.touches[0].clientY]; }, { passive: true });
  document.addEventListener('touchend', ev => {
    if (!presenting || !touch) return;
    const t = ev.changedTouches[0], dx = t.clientX - touch[0], dy = t.clientY - touch[1]; touch = null;
    const along = turned.matches ? dy : dx, across = turned.matches ? dx : dy;   // along the slide's width
    if (Math.abs(along) > 50 && Math.abs(along) > 2 * Math.abs(across)) show(cur + (along < 0 ? 1 : -1));
  }, { passive: true });
  window.addEventListener('resize', () => { if (presenting) { const pid = +slides[cur].items[0].dataset.pid; build(pid); show(cur); } });

  /* ================= start ================= */
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (presenting) { const pid = +slides[cur].items[0].dataset.pid; build(pid); show(cur); } });
  window.DITPresent = { enter, leave, show: k => show(k), slides: () => slides };
  Promise.all([cssReady, document.fonts ? document.fonts.ready : null]).then(() => {   // slides are cut with the real fonts
    if (qs.has('present') && ws) enter(qs.get('slide') != null ? null : undefined);
    else if (ss.get('presenting') && ws) enter();
    if (qs.get('slide') != null && presenting) show((+qs.get('slide') || 1) - 1);
  });
  pill.paint();
})();
