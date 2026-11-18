// worksheet.js: shared behavior for every DIT worksheet page. No build step, no dependencies.
//  - Session map: <nav class="map" data-home="../index.html"></nav> is filled from the h2s that have
//    an id. On a wide screen it is a rail on the left, and it marks the Part the reader is in.
//    Kicker and time come from the h2's <small>, e.g. <small>Part 2 · 20 min</small>.
//    An h2 with class "deeper" is listed as Go deeper and not counted in the session time;
//    an h2 with data-map="no" (credits) is left out.
//  - "Think first" cards: <div class="quiz"><button>question<span class="ans">answer</span></button></div>
//  - Take home: <ul class="goals"><li>I can ...</li></ul>; ticks are saved in this browser only.
//  - Code: <pre data-lang="py|cpp|sh"> gets light syntax colouring; <span class="hl" data-note="...">
//    lines light up on hover and show their note.
(function () {
  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
  };

  /* ---------- session map ---------- */
  document.querySelectorAll('nav.map').forEach(nav => {
    const rows = [], heads = [];
    let total = 0;
    document.querySelectorAll('.ws h2[id]').forEach(h => {
      if (h.dataset.map === 'no') return;
      const small = h.querySelector('small');
      const kick = small ? small.textContent.trim() : '';
      const [mk, tm] = kick.split('·').map(x => (x || '').trim());
      const title = [...h.childNodes].filter(n => n !== small).map(n => n.textContent).join('').trim();
      const deeper = h.classList.contains('deeper');
      const min = parseInt(tm, 10);
      if (!deeper && min) total += min;
      const part = /^Part\s+(\d+)/i.exec(mk);
      const no = part ? part[1].padStart(2, '0') : '–';
      heads.push(h);
      rows.push(`<li class="${deeper ? 'deeper' : ''}"><a href="#${h.id}"><span class="mk">${no}</span><span>${title}</span><span class="tm">${tm || ''}</span></a></li>`);
    });
    const time = total >= 60 ? Math.floor(total / 60) + ' h' + (total % 60 ? ' ' + total % 60 + ' min' : '') : total + ' min';
    const foot = total ? `<div class="total">Core parts: <b>${time}</b><br>not counting breaks and questions</div>` : '';
    const home = nav.dataset.home ? `<a class="brand" href="${nav.dataset.home}"><b>DIT</b><span>Robotics<br>Software courses</span></a>` : '';
    nav.innerHTML = `${home}<div class="mt">${nav.dataset.label || 'Session map'}</div><ol>${rows.join('')}</ol>${foot}`;
    document.body.classList.add('has-rail');
    // mark the Part the reader is in
    const items = [...nav.querySelectorAll('li')];
    const spy = () => {
      let cur = -1;
      heads.forEach((h, i) => { if (h.getBoundingClientRect().top < window.innerHeight * 0.35) cur = i; });
      items.forEach((li, i) => li.classList.toggle('cur', i === cur));
    };
    window.addEventListener('scroll', spy, { passive: true });
    window.addEventListener('resize', spy);
    spy();
  });

  /* ---------- think-first cards ---------- */
  document.querySelectorAll('.quiz button').forEach(b => b.addEventListener('click', () => b.classList.toggle('open')));

  /* ---------- take home ---------- */
  document.querySelectorAll('ul.goals').forEach((list, n) => {
    const key = 'dit-goals:' + location.pathname + ':' + n;
    let saved = store.get(key) || {};
    const bar = document.createElement('div');
    bar.className = 'goalbar'; bar.innerHTML = '<i></i>';
    list.before(bar);
    const boxes = [];
    list.querySelectorAll('li').forEach((li, i) => {
      const box = document.createElement('input');
      box.type = 'checkbox'; box.id = `goal-${n}-${i}`; box.checked = !!saved[i];
      const label = document.createElement('label');
      label.htmlFor = box.id; label.append(...li.childNodes);
      li.append(box, label);
      box.addEventListener('change', () => { saved[i] = box.checked; store.set(key, saved); paint(); });
      boxes.push(box);
    });
    function paint() {
      let on = 0;
      boxes.forEach(b => { b.parentElement.classList.toggle('on', b.checked); if (b.checked) on++; });
      bar.firstChild.style.width = (100 * on / boxes.length) + '%';
    }
    const p = document.createElement('p');
    p.innerHTML = '<button type="button" class="goalreset">Reset checklist</button> <span class="muted" style="font-size:.88rem">Ticks are saved only in this browser.</span>';
    p.querySelector('button').addEventListener('click', () => { saved = {}; store.set(key, saved); boxes.forEach(b => { b.checked = false; }); paint(); });
    list.after(p);
    paint();
  });

  /* ---------- code: a .hl is a block, so drop the newline right after it (authors write one line per row) ---------- */
  document.querySelectorAll('pre .hl').forEach(hl => {
    // drop exactly one newline: the one at the end of the .hl, or else the one right after it
    const lt = hl.lastChild, nx = hl.nextSibling;
    if (lt && lt.nodeType === 3 && lt.textContent.endsWith('\n')) lt.textContent = lt.textContent.slice(0, -1);
    else if (nx && nx.nodeType === 3 && nx.textContent.startsWith('\n')) nx.textContent = nx.textContent.slice(1);
  });

  /* ---------- code: syntax colours ---------- */
  const KW = {
    py: 'and as assert async await break class continue def del elif else except False finally for from global if import in is lambda None nonlocal not or pass raise return True try while with yield self',
    cpp: 'auto bool break case catch char class const constexpr continue default delete do double else enum explicit false float for if include int long namespace new nullptr private protected public return shared_ptr short static struct switch template this throw true try typename unsigned using virtual void while',
    sh: 'cd export source sudo docker ros2 colcon python3 then fi do done for in if',
  };
  const RULES = {
    py: /(#.*$)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|\b(\d+(?:\.\d+)?)\b|\b([A-Za-z_]\w*)(?=\()|\b([A-Za-z_]\w*)\b/gm,
    cpp: /(\/\/.*$)|("(?:[^"\\]|\\.)*")|\b(\d+(?:\.\d+)?)\b|\b([A-Za-z_]\w*)(?=\()|\b([A-Za-z_]\w*)\b/gm,
    sh: /(#.*$)|("(?:[^"\\]|\\.)*"|'[^']*')|\b(\d+(?:\.\d+)?)\b|()\b([A-Za-z_][\w-]*)\b/gm,
  };
  function colour(text, lang) {
    const kw = new Set(KW[lang].split(' '));
    const frag = document.createDocumentFragment();
    let last = 0;
    text.replace(RULES[lang], (m, cm, str, num, fn, word, off) => {
      let cls = cm ? 'cm' : str ? 'str' : num ? 'num' : fn ? (kw.has(fn) ? 'kw' : 'fn') : (word && kw.has(word)) ? 'kw' : '';
      if (!cls) return m;
      if (off > last) frag.append(text.slice(last, off));
      const s = document.createElement('span'); s.className = cls; s.textContent = m; frag.append(s);
      last = off + m.length;
      return m;
    });
    if (last < text.length) frag.append(text.slice(last));
    return frag;
  }
  document.querySelectorAll('pre[data-lang]').forEach(pre => {
    const lang = pre.dataset.lang; if (!RULES[lang]) return;
    const walker = document.createTreeWalker(pre, NodeFilter.SHOW_TEXT);
    const nodes = []; while (walker.nextNode()) if (!walker.currentNode.parentElement.closest('.m')) nodes.push(walker.currentNode);
    nodes.forEach(t => t.replaceWith(colour(t.textContent, lang)));
  });

  /* ---------- code: hover notes ---------- */
  document.querySelectorAll('pre').forEach(pre => {
    if (!pre.querySelector('.hl')) return;
    pre.classList.add('notes');
    let cur = null;
    const set = el => { if (el === cur) return; if (cur) cur.classList.remove('on'); cur = el; if (cur) cur.classList.add('on'); };
    pre.addEventListener('mouseover', ev => { const el = ev.target.closest('.hl'); set(el && pre.contains(el) ? el : null); });
    pre.addEventListener('mouseleave', () => set(null));
    pre.addEventListener('click', ev => { const el = ev.target.closest('.hl'); set(el === cur ? null : el); }); // touch screens
  });
})();
