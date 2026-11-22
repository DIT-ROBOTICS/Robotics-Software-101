// present.js: present mode, a laser pointer, and live sessions, for every worksheet and walkthrough.
// Loaded by worksheet.js and walk.js; no page needs to include it. No build step, no dependencies.
//
//  - Present mode (worksheets): P, or the "Present" button. The page becomes slides, in order:
//    every h2 and h3 starts a slide, and the blocks after it are packed onto slides that fit the
//    screen. An element with data-slide always starts a new slide. ← → (or a clicker) move, Esc leaves.
//  - Laser: K toggles a red dot that follows the mouse. In a live session, followers see it too.
//  - Live: the presenter starts a session and gets a 4-digit PIN. Anyone who enters present mode and
//    joins with that PIN follows along: their page moves to the presenter's slide, opens the same
//    walkthrough step, and goes to other pages with them. Scrolling or pressing a key pauses following;
//    "Follow" catches up again. Messages go through a small relay (relay/ in this repo); only slide
//    positions and the laser are sent, nothing typed or personal.
(function () {
  if (window.DITPresent) return;

  // The relay (relay/ in this repo, see its README). Served by relay/server.mjs, the pages and the
  // relay share one address, so the default is "the server this page came from". Set RELAY_DEFAULT
  // only if the relay lives elsewhere (e.g. the Cloudflare Worker: 'wss://dit-live.<you>.workers.dev').
  // For testing, open any page with ?relay=ws://localhost:8080 once (kept for this tab).
  const RELAY_DEFAULT = '';
  const SAME_ORIGIN = /^https?:$/.test(location.protocol) && !/\.github\.io$/.test(location.hostname)
    ? (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host : '';

  const me = document.currentScript;
  const ROOT = me ? me.src.replace(/assets\/present\.js.*$/, '') : location.href.replace(/[^/]*$/, '');
  const T2 = (en, zh) => (typeof T === 'function' ? T(en, zh) : en);                 // HTML, both languages
  const TT = (en, zh) => (window.DIT && DIT.lang && DIT.lang() === 'zh' ? zh : en);  // plain text, for title=""
  const ss = {
    get(k) { try { return JSON.parse(sessionStorage.getItem('dit-live:' + k)); } catch (e) { return null; } },
    set(k, v) { try { if (v === null) sessionStorage.removeItem('dit-live:' + k); else sessionStorage.setItem('dit-live:' + k, JSON.stringify(v)); } catch (e) {} },
  };
  const qs = new URLSearchParams(location.search);
  if (qs.get('relay')) ss.set('relay', qs.get('relay'));
  const RELAY = (ss.get('relay') || RELAY_DEFAULT || SAME_ORIGIN).replace(/\/$/, '');

  const css = document.createElement('link');
  css.rel = 'stylesheet'; css.href = ROOT + 'assets/present.css';
  document.head.append(css);
  const cssReady = new Promise(r => { css.onload = css.onerror = r; });   // slides are measured with it

  const page = () => { const h = location.href.split('#')[0].split('?')[0]; return h.startsWith(ROOT) ? h.slice(ROOT.length) : location.pathname; };
  // a page whose .ws has data-present="no" (the home page) gets the laser and live pill, but no slides
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
  function show(k, quiet) {
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
    if (!quiet) hostSend();
  }
  function enter(pid) {
    if (!ws || presenting) return;
    presenting = true; ss.set('presenting', true);
    document.documentElement.classList.add('presenting');
    bar.el.hidden = false;
    build(pid != null ? pid : ss.get('slide:' + page()));
    show(cur, true); hostSend(); pill.paint();
  }
  function leave() {
    if (!presenting) return;
    const first = slides[cur] && slides[cur].items.find(el => outerH(el) > 0);
    presenting = false; ss.set('presenting', null);
    document.documentElement.classList.remove('presenting');
    blocks.forEach(el => el.classList.remove('p-on'));
    bar.el.hidden = true;
    if (first) first.scrollIntoView({ block: 'start' });
    hostSend(); pill.paint();
  }

  /* ================= the bar and the live pill ================= */
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
    bar.prev.onclick = () => { local(); show(cur - 1); };
    bar.next.onclick = () => { local(); show(cur + 1); };
    el.querySelector('.p-exit').onclick = () => { local(); leave(); };
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
  pill.paint = function () {
    const r = live.role, pin = live.pin;
    const show = presenting || r || isWalk;
    pill.el.hidden = !show;
    if (!show) return;
    const home = presenting ? bar.el : document.body;
    if (pill.el.parentElement !== home) { if (presenting) bar.el.insertBefore(pill.el, bar.el.querySelector('.p-exit')); else document.body.append(pill.el); }
    const laserBtn = `<button type="button" class="p-laser ${laser.on ? 'on' : ''}" title="${TT('Laser pointer', '雷射筆')} (K)">●<span>${T2('Laser', '雷射筆')}</span></button>`;
    let main;
    if (r === 'host') {
      main = `<span class="p-live on">${T2('Live', '直播中')} · PIN <b>${pin}</b> · ${T2(`${live.n} watching`, `${live.n} 人在看`)}</span>
        <button type="button" class="p-stop">${T2('End', '結束')}</button>`;
    } else if (r === 'guest') {
      const st = live.state === 'ended' ? T2('Session ended', '直播已結束') : live.state === 'wait' ? T2('Connecting…', '連線中…') :
        live.paused ? T2('Paused', '已暫停') : T2('Following', '跟隨中');
      main = `<span class="p-live ${live.paused || live.state !== 'ok' ? '' : 'on'}">${st} · PIN <b>${pin}</b></span>
        ${live.paused && live.state === 'ok' ? `<button type="button" class="p-follow">${T2('Follow', '跟上')}</button>` : ''}
        <button type="button" class="p-stop">${T2('Leave', '離開')}</button>`;
    } else if (!RELAY) {
      main = isWalk ? '' : `<span class="p-live">${T2('Live sessions: relay not set up', '直播：relay 尚未設定')}</span>`;
    } else {
      main = `<button type="button" class="p-host">${T2('Start live', '開始直播')}</button>
        <form class="p-join"><input inputmode="numeric" pattern="[0-9]{4}" maxlength="4" placeholder="PIN" aria-label="PIN"><button>${T2('Join', '加入')}</button></form>`;
    }
    pill.el.innerHTML = (live.err ? `<span class="p-err">${live.err}</span>` : '') + main + laserBtn;
    const q = s => pill.el.querySelector(s);
    if (q('.p-host')) q('.p-host').onclick = () => live.host();
    if (q('.p-join')) q('.p-join').onsubmit = ev => { ev.preventDefault(); const v = q('.p-join input').value.trim(); if (/^\d{4}$/.test(v)) live.join(v); };
    if (q('.p-stop')) q('.p-stop').onclick = () => live.stop();
    if (q('.p-follow')) q('.p-follow').onclick = () => live.resume();
    q('.p-laser').onclick = () => laser.toggle();
  };
  document.addEventListener('dit-lang', () => { pill.paint(); if (presenting) { const pid = slides[cur] && +slides[cur].items[0].dataset.pid; build(pid); show(cur, true); } });

  /* ================= laser ================= */
  const laser = { on: false, dot: document.createElement('div'), far: document.createElement('div'), last: 0 };
  laser.dot.className = 'p-dot'; laser.far.className = 'p-dot far';
  document.body.append(laser.dot, laser.far);
  laser.toggle = function () {
    laser.on = !laser.on;
    document.documentElement.classList.toggle('p-lasering', laser.on);
    laser.dot.style.display = 'none';
    if (!laser.on) send({ t: 'laser', off: 1 });
    pill.paint();
  };
  // a point is sent relative to the block under it, so it lands on the same thing on any screen size
  function anchorOf(x, y) {
    const el = document.elementFromPoint(x, y);
    const b = el && el.closest('[data-pid]');
    if (b) { const r = b.getBoundingClientRect(); return { pid: +b.dataset.pid, fx: (x - r.left) / r.width, fy: (y - r.top) / r.height }; }
    return { fx: x / innerWidth, fy: y / innerHeight };
  }
  function pointOf(a) {
    if (a.pid != null && ws) {
      const b = ws.querySelector(`[data-pid="${a.pid}"]`);
      if (b && b.getBoundingClientRect().height) { const r = b.getBoundingClientRect(); return [r.left + a.fx * r.width, r.top + a.fy * r.height]; }
    }
    return [a.fx * innerWidth, a.fy * innerHeight];
  }
  document.addEventListener('mousemove', ev => {
    if (!laser.on) return;
    laser.dot.style.display = 'block';
    laser.dot.style.transform = `translate(${ev.clientX}px, ${ev.clientY}px)`;
    const now = performance.now();
    if (now - laser.last > 50) { laser.last = now; send({ t: 'laser', ...anchorOf(ev.clientX, ev.clientY) }); }
  });
  document.addEventListener('mouseleave', () => { if (laser.on) { laser.dot.style.display = 'none'; send({ t: 'laser', off: 1 }); } });

  /* ================= live sessions ================= */
  const live = { role: null, pin: null, sock: null, n: 0, paused: false, state: 'off', last: null, err: '', key: null, tries: 0 };
  function send(msg) { if (live.role === 'host' && live.sock && live.sock.readyState === 1) live.sock.send(JSON.stringify(msg)); }
  function where() {
    if (presenting) return { t: 'at', page: page(), pid: +slides[cur].items[0].dataset.pid, present: true };
    if (isWalk) return { t: 'at', page: page(), step: (parseInt(location.hash.slice(1), 10) || 1) - 1 };
    return { t: 'at', page: page() };
  }
  function hostSend() { send(where()); }
  live.connect = function () {
    const url = `${RELAY}/room/${live.pin}` + (live.role === 'host' ? `?role=host&key=${live.key}` : '');
    let sock;
    try { sock = new WebSocket(url); } catch (e) { live.err = T2('Cannot reach the live server', '連不上直播伺服器'); pill.paint(); return; }
    live.sock = sock; live.state = 'wait'; pill.paint();
    sock.onopen = () => { live.state = 'ok'; live.tries = 0; live.err = ''; if (live.role === 'host') hostSend(); pill.paint(); };
    sock.onmessage = ev => {
      let m; try { m = JSON.parse(ev.data); } catch (e) { return; }
      if (m.t === 'taken') { live.role = null; ss.set('live', null); sock.close(); live.host(); return; }  // PIN in use: pick another
      if (m.t === 'n') { live.n = m.n; pill.paint(); return; }
      if (live.role !== 'guest') return;
      if (m.t === 'end') { live.state = 'ended'; laser.far.style.display = 'none'; pill.paint(); return; }
      if (m.t === 'laser') {
        if (m.off || live.paused) { laser.far.style.display = 'none'; return; }
        const [x, y] = pointOf(m);
        laser.far.style.display = 'block'; laser.far.style.transform = `translate(${x}px, ${y}px)`;
        return;
      }
      if (m.t === 'at') { live.last = m; if (!live.paused) follow(m); }
    };
    sock.onclose = () => {
      if (live.sock !== sock || !live.role) return;
      live.state = 'wait'; pill.paint();
      setTimeout(() => { if (live.role && live.sock === sock) live.connect(); }, Math.min(10000, 1000 * 2 ** live.tries++));
    };
  };
  live.host = function () {
    live.role = 'host'; live.pin = String(Math.floor(1000 + Math.random() * 9000));
    live.key = [...crypto.getRandomValues(new Uint8Array(12))].map(b => b.toString(16).padStart(2, '0')).join('');
    ss.set('live', { role: 'host', pin: live.pin, key: live.key });
    live.connect();
  };
  live.join = function (pin) {
    live.role = 'guest'; live.pin = pin; live.paused = false;
    ss.set('live', { role: 'guest', pin });
    if (ws && !presenting) enter();
    live.connect();
  };
  live.stop = function () {
    if (live.role === 'host') send({ t: 'end' });
    const s = live.sock; live.role = null; live.sock = null; live.state = 'off'; live.err = '';
    ss.set('live', null); ss.set('paused', null);
    if (s) setTimeout(() => s.close(), 100);
    laser.far.style.display = 'none'; pill.paint();
  };
  live.resume = function () { live.paused = false; ss.set('paused', null); if (live.last) follow(live.last); pill.paint(); };
  function local() { if (live.role === 'guest' && !live.paused) { live.paused = true; ss.set('paused', true); laser.far.style.display = 'none'; pill.paint(); } }

  function follow(m) {
    if (m.page !== page()) {                        // the presenter moved to another page: go there too
      ss.set('presenting', m.present ? true : null);
      if (m.pid != null) ss.set('slide:' + m.page, m.pid);
      location.href = ROOT + m.page + (m.step != null ? '#' + (m.step + 1) : '');
      return;
    }
    if (isWalk && m.step != null) { const h = '#' + (m.step + 1); if (location.hash !== h) location.hash = h; return; }
    if (!ws) return;
    if (m.pid != null) {
      if (!presenting) enter(m.pid); else { const k = slideOf(m.pid); if (k !== cur) show(k, true); }
    } else if (presenting) leave();
  }

  /* ================= keys, and walkthrough steps ================= */
  document.addEventListener('keydown', ev => {
    if (typing(ev) || ev.ctrlKey || ev.metaKey || ev.altKey) return;
    const k = ev.key;
    if (k === 'k' || k === 'K') { laser.toggle(); return; }
    if (isWalk) { if (['ArrowRight', 'ArrowLeft', ' ', 'PageDown', 'PageUp', 'Home', 'End'].includes(k)) local(); return; }
    if (!ws) return;
    if (!presenting) { if (k === 'p' || k === 'P') enter(); return; }
    if (['ArrowRight', 'PageDown', ' ', 'ArrowDown'].includes(k) && !(k === 'ArrowDown' && ws.scrollHeight > ws.clientHeight + 4 && ws.scrollTop + ws.clientHeight < ws.scrollHeight - 4)) { ev.preventDefault(); local(); show(cur + 1); }
    else if (['ArrowLeft', 'PageUp', 'ArrowUp'].includes(k) && !(k === 'ArrowUp' && ws.scrollTop > 4)) { ev.preventDefault(); local(); show(cur - 1); }
    else if (k === 'Home') { local(); show(0); }
    else if (k === 'End') { local(); show(slides.length - 1); }
    else if (k === 'Escape' || k === 'p' || k === 'P') { local(); leave(); }
  }, true);
  if (ws) ws.addEventListener('wheel', () => { if (presenting) local(); }, { passive: true });
  window.addEventListener('wheel', () => { if (!presenting && live.role === 'guest') local(); }, { passive: true });
  window.addEventListener('resize', () => { if (presenting) { const pid = +slides[cur].items[0].dataset.pid; build(pid); show(cur, true); } });
  document.addEventListener('dit-step', () => hostSend());

  /* ================= start ================= */
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (presenting) { const pid = +slides[cur].items[0].dataset.pid; build(pid); show(cur, true); } });
  window.DITPresent = { enter, leave, show: k => show(k), slides: () => slides, live };
  const saved = ss.get('live');
  if (saved) { Object.assign(live, saved); live.paused = !!ss.get('paused'); }
  cssReady.then(() => {
    if (qs.has('present') && ws) enter(qs.get('slide') != null ? null : undefined);
    else if (ss.get('presenting') && ws) enter();
    if (qs.get('slide') != null && presenting) show((+qs.get('slide') || 1) - 1, true);
    if (qs.get('join') && /^\d{4}$/.test(qs.get('join')) && live.role !== 'guest') live.join(qs.get('join'));
    else if (live.role) live.connect();
  });
  pill.paint();
})();
