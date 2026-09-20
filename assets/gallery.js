(function () {
  const DATA = JSON.parse(document.getElementById('data').textContent);
  const ALL = DATA.entries;
  const SEC = Object.fromEntries(DATA.sections.map((s) => [s.key, s]));
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  };

  // ---------- state
  function colKey() { return 'jev-cols-' + (window.innerWidth < 640 ? 'm' : window.innerWidth < 1100 ? 't' : 'd'); }
  const state = {
    q: '', sec: '', sort: store.get('jev-sort', 'curated'),
    cols: store.get(colKey(), Math.max(2, Math.min(6, Math.round(window.innerWidth / 360)))),
    seed: Math.random(),
  };
  let shown = [];
  const hay = new Map(ALL.map((c) => [c.key, [c.name, c.sub, c.why, c.org, c.venue, c.year, SEC[c.section].label, c.repo, c.hf].join('\n').toLowerCase()]));

  // ---------- helpers
  function rng(seed) { let s = Math.floor(seed * 2 ** 31) || 1; return () => { s = (s * 48271) % 2147483647; return s / 2147483647; }; }
  const stars = (n) => n >= 1000 ? (n / 1000).toFixed(1) + 'k' : String(n);
  const I_GH = '<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.012 8.012 0 0 0 16 8c0-4.42-3.58-8-8-8z"/></svg>';
  const I_HF = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2.6A9.4 9.4 0 1 0 21.4 12 9.4 9.4 0 0 0 12 2.6Zm-3.4 6.9a1.3 1.3 0 1 1 0 2.6 1.3 1.3 0 0 1 0-2.6Zm6.8 0a1.3 1.3 0 1 1 0 2.6 1.3 1.3 0 0 1 0-2.6ZM12 18a4.6 4.6 0 0 1-4.4-3.2h8.8A4.6 4.6 0 0 1 12 18Z"/></svg>';
  const I_GLOBE = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="8" cy="8" r="6.2"/><path d="M1.8 8h12.4M8 1.8c1.7 1.9 2.5 4 2.5 6.2S9.7 12.3 8 14.2C6.3 12.3 5.5 10.2 5.5 8S6.3 3.7 8 1.8Z"/></svg>';
  const I_DOC = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9.5 1.5H4a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V5z"/><path d="M9.5 1.5V5H13"/></svg>';
  const I_STAR = '<svg width="11" height="11" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M8 1.6l1.9 3.9 4.3.6-3.1 3 .7 4.3L8 11.4l-3.8 2 .7-4.3-3.1-3 4.3-.6Z"/></svg>';
  const I_HEART = '<svg width="11" height="11" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M8 14.2 2.6 8.9a3.3 3.3 0 0 1 4.7-4.7L8 4.9l.7-.7a3.3 3.3 0 0 1 4.7 4.7Z"/></svg>';

  // ---------- filter + sort
  function compute() {
    const terms = state.q.toLowerCase().split(/\s+/).filter(Boolean);
    let list = ALL.filter((c) => (!state.sec || c.section === state.sec) && (!terms.length || terms.every((w) => hay.get(c.key).includes(w))));
    if (state.sort === 'random') { const r = rng(state.seed); list = list.map((c) => [r(), c]).sort((a, b) => a[0] - b[0]).map((x) => x[1]); }
    else if (state.sort === 'stars') { list = list.slice().sort((a, b) => ((b.stars || b.likes || 0) - (a.stars || a.likes || 0)) || (a.order - b.order)); }
    else if (state.sort === 'newest') { list = list.slice().sort((a, b) => ((b.date || '').localeCompare(a.date || '')) || (a.order - b.order)); }
    shown = list;
  }
  const domain = (u) => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return ''; } };
  function cardHTML(c) {
    const s = SEC[c.section];
    const why = c.why ? c.why[0].toUpperCase() + c.why.slice(1) : '';
    const n = c.stars ? `<span class="n">${I_STAR} ${stars(c.stars)}</span>`
      : c.likes ? `<span class="n">${I_HEART} ${stars(c.likes)}</span>` : '';
    // who made it: the GitHub avatar when we have one, else the site's own mark
    const who = c.repo ? `${c.avatar ? `<img src="${esc(c.avatar)}" alt="">` : I_GH}${esc(c.org)}`
      : c.hf ? `${I_HF}${esc(c.hf.split('/')[0])}`
      : c.arxiv ? `${I_DOC}${esc(c.venue || 'arXiv')}`
      : `${I_GLOBE}${esc(domain(c.url))}`;
    const meta = who + (c.year ? ` · ${c.year}` : '');
    return `<a class="card" href="${esc(c.url)}" target="_blank" rel="noopener" data-key="${esc(c.key)}" style="--sc:var(--s-${c.section})">
      <div class="head"><span class="t" title="${esc(c.name)}">${esc(c.name)}</span>${n}</div>
      <div class="ph"><img loading="lazy" src="${esc(c.thumb)}" width="800" height="500" alt=""></div>
      <div class="why">${esc(why)}</div>
      <div class="foot"><span class="sec" title="${esc(s.label)}"><i></i>${esc(s.chip)}</span><span class="meta">${meta}</span></div>
    </a>`;
  }
  function render() {
    compute();
    $('#grid').style.setProperty('--cols', state.cols);
    $('#grid').innerHTML = shown.map(cardHTML).join('');
    $('#empty').hidden = shown.length > 0;
    $('#count').textContent = shown.length === ALL.length ? `${ALL.length}` : `${shown.length} / ${ALL.length}`;
    $('#reshuffle').style.display = state.sort === 'random' ? '' : 'none';
  }
  function applyCols() { $('#colN').textContent = state.cols; store.set(colKey(), state.cols); render(); }

  // ---------- category pills (one at a time; the active one again = all)
  $('#pills').addEventListener('click', (e) => {
    const b = e.target.closest('.pill'); if (!b) return;
    state.sec = (b.dataset.sec === state.sec) ? '' : b.dataset.sec;
    document.querySelectorAll('#pills .pill').forEach((p) => p.classList.toggle('on', p.dataset.sec === state.sec));
    history.replaceState(null, '', state.sec ? '?sec=' + state.sec : location.pathname);
    render();
  });

  // ---------- toolbar
  let qT; $('#q').addEventListener('input', (e) => { clearTimeout(qT); qT = setTimeout(() => { state.q = e.target.value.trim(); render(); }, 150); });
  $('#sort').addEventListener('change', (e) => { state.sort = e.target.value; store.set('jev-sort', state.sort); render(); });
  $('#reshuffle').addEventListener('click', () => { state.seed = Math.random(); render(); });
  $('#colDec').addEventListener('click', () => { state.cols = Math.max(1, state.cols - 1); applyCols(); });
  $('#colInc').addEventListener('click', () => { state.cols = Math.min(6, state.cols + 1); applyCols(); });
  const root = document.documentElement, tb = $('#theme');
  function theme() { return root.getAttribute('data-theme') || 'light'; }
  if (store.get('jev-theme', null)) root.setAttribute('data-theme', store.get('jev-theme'));
  tb.addEventListener('click', () => { const t = theme() === 'dark' ? 'light' : 'dark'; root.setAttribute('data-theme', t); store.set('jev-theme', t); });
  document.addEventListener('keydown', (e) => {
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName);
    if (e.key === 'Escape' && typing) { document.activeElement.blur(); return; }
    if (e.key === '/' && !typing) { e.preventDefault(); $('#q').focus(); $('#q').select(); }
  });

  // ---------- init
  const m = location.search.match(/[?&]q=([^&]+)/);
  if (m) { $('#q').value = decodeURIComponent(m[1].replace(/\+/g, ' ')); state.q = $('#q').value.trim(); }
  const ms = location.search.match(/[?&]sec=([a-z]+)/);
  if (ms && SEC[ms[1]]) { state.sec = ms[1]; document.querySelectorAll('#pills .pill').forEach((p) => p.classList.toggle('on', p.dataset.sec === state.sec)); }
  $('#sort').value = state.sort;
  applyCols();
})();
