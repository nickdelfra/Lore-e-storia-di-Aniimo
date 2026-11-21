/* Lore di Aniimo — script condiviso: navigazione fluida, indice, ricerca, lettore musicale */
(function () {
  'use strict';
  document.documentElement.classList.add('js');

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const store = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (e) {} };
  const read = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const reduced = window.matchMedia('(prefers-reduced-motion:reduce)').matches;
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  let page = $('#page');
  const crumb = $('#crumb');
  const bar = $('#scrollProgress');

  /* ---------- Barra di avanzamento ---------- */
  function progress() {
    const h = document.documentElement;
    const max = h.scrollHeight - h.clientHeight;
    bar.style.width = (max > 0 ? h.scrollTop / max * 100 : 0) + '%';
  }
  window.addEventListener('scroll', progress, { passive: true });
  window.addEventListener('resize', progress);

  /* ---------- Immagini che non si caricano ---------- */
  document.addEventListener('error', e => {
    const img = e.target;
    if (!(img instanceof HTMLImageElement) || !img.closest('figure.illustration')) return;
    const ph = document.createElement('div');
    ph.className = 'img-ph';
    ph.textContent = img.alt;
    img.replaceWith(ph);
  }, true);

  /* ---------- Comparsa graduale di immagini e riquadri ---------- */
  const io = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (!en.isIntersecting) return;
      const el = en.target;
      el.classList.add('in');
      io.unobserve(el);
      setTimeout(() => el.classList.remove('reveal', 'in'), 900); // a fine animazione l'elemento torna normale (utile per l'effetto al passaggio del mouse)
    });
  }, { rootMargin: '0px 0px -8% 0px' }) : null;
  function reveal(root) {
    $$('figure.illustration, .card, .pager a', root).forEach(el => {
      if (!io || reduced) { el.classList.add('in'); return; }
      el.classList.add('reveal');
      io.observe(el);
    });
  }

  /* ---------- Indice dei capitoli ---------- */
  const drawer = $('#drawer');
  const scrim = $('#scrim');
  const tocBtn = $('#tocBtn');
  let lastFocus = null;

  function setOpen(el, on) {
    el.classList.toggle('open', on);
  }
  function openToc() {
    closeSearch(true);
    lastFocus = document.activeElement;
    setOpen(drawer, true);
    scrim.hidden = false;
    requestAnimationFrame(() => scrim.classList.add('on'));
    tocBtn.setAttribute('aria-expanded', 'true');
    drawer.setAttribute('aria-hidden', 'false');
    const cur = $('[aria-current=page]', drawer) || $('.toc a', drawer);
    if (cur) { cur.focus({ preventScroll: true }); cur.scrollIntoView({ block: 'center' }); }
  }
  function closeToc(silent) {
    if (!drawer.classList.contains('open')) return;
    setOpen(drawer, false);
    scrim.classList.remove('on');
    setTimeout(() => { if (!drawer.classList.contains('open')) scrim.hidden = true; }, 260);
    tocBtn.setAttribute('aria-expanded', 'false');
    drawer.setAttribute('aria-hidden', 'true');
    if (!silent && lastFocus) lastFocus.focus({ preventScroll: true });
  }
  tocBtn.addEventListener('click', () => drawer.classList.contains('open') ? closeToc() : openToc());
  $('#tocClose').addEventListener('click', () => closeToc());
  scrim.addEventListener('click', () => { closeToc(); closeSearch(); });

  function markCurrent() {
    const slug = page.dataset.slug || '';
    $$('.toc a', drawer).forEach(a => {
      if (a.dataset.slug === slug) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
    if (crumb) crumb.textContent = page.dataset.crumb || '';
  }

  /* ---------- Ricerca nel testo ---------- */
  const searchBox = $('#search');
  const qInput = $('#q');
  const resultsEl = $('#results');
  let index = null;
  let indexLoading = null;

  const fold = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function loadIndex() {
    if (index) return Promise.resolve(index);
    if (!indexLoading) {
      indexLoading = fetch('assets/js/ricerca.json').then(r => r.json()).then(j => {
        index = j.map(x => Object.assign(x, { f: fold(x.x) }));
        return index;
      }).catch(() => { indexLoading = null; return []; });
    }
    return indexLoading;
  }
  function openSearch() {
    closeToc(true);
    lastFocus = document.activeElement;
    searchBox.classList.add('open');
    scrim.hidden = true;
    qInput.focus();
    loadIndex();
  }
  function closeSearch(silent) {
    if (!searchBox.classList.contains('open')) return;
    searchBox.classList.remove('open');
    if (!silent && lastFocus) lastFocus.focus({ preventScroll: true });
  }
  function snippet(text, folded, terms) {
    let pos = -1;
    for (const t of terms) { const p = folded.indexOf(t); if (p !== -1 && (pos === -1 || p < pos)) pos = p; }
    const start = Math.max(0, pos - 60);
    const end = Math.min(text.length, pos + 140);
    let out = esc(text.slice(start, end));
    terms.forEach(t => {
      const re = new RegExp('(' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
      out = out.replace(re, '<mark>$1</mark>');
    });
    return (start > 0 ? '… ' : '') + out + (end < text.length ? ' …' : '');
  }
  async function runSearch() {
    const raw = qInput.value.trim();
    if (raw.length < 2) { resultsEl.innerHTML = ''; return; }
    const data = await loadIndex();
    const terms = fold(raw).split(/\s+/).filter(Boolean);
    const hits = [];
    data.forEach(row => {
      if (terms.every(t => row.f.includes(t))) {
        const score = terms.reduce((s, t) => s + (row.f.split(t).length - 1), 0) + (row.k ? 2 : 0);
        hits.push({ row, score });
      }
    });
    hits.sort((a, b) => b.score - a.score);
    if (!hits.length) { resultsEl.innerHTML = '<li class="search-empty">Nessun risultato per «' + esc(raw) + '».</li>'; return; }
    resultsEl.innerHTML = hits.slice(0, 14).map(h =>
      '<li><a href="' + h.row.s + '.html#' + h.row.i + '"><span class="where">' + esc(h.row.n) + ' · ' + esc(h.row.t) +
      '</span><span class="snip">' + snippet(h.row.x, h.row.f, terms) + '</span></a></li>').join('');
  }
  $('#searchBtn').addEventListener('click', () => searchBox.classList.contains('open') ? closeSearch() : openSearch());
  qInput.addEventListener('input', runSearch);
  searchBox.addEventListener('click', e => { if (e.target === searchBox) closeSearch(); });
  resultsEl.addEventListener('click', () => closeSearch(true));
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closeToc(); closeSearch(); }
    else if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey && !/^(INPUT|TEXTAREA|SELECT)$/.test((document.activeElement || {}).tagName || '')) {
      e.preventDefault(); openSearch();
    }
  });

  /* ---------- Navigazione fluida tra le pagine (il lettore musicale non si interrompe) ---------- */
  const cache = new Map();
  async function fetchPage(url) {
    if (cache.has(url)) return cache.get(url);
    const r = await fetch(url, { credentials: 'same-origin' });
    if (!r.ok) throw new Error(r.status);
    const doc = new DOMParser().parseFromString(await r.text(), 'text/html');
    if (!doc.getElementById('page')) throw new Error('no page');
    cache.set(url, doc);
    return doc;
  }
  const key = u => u.pathname + u.search;
  function internal(a) {
    if (!a || !a.href || a.target || a.hasAttribute('download')) return null;
    const u = new URL(a.href, location.href);
    if (u.origin !== location.origin) return null;
    if (!(u.pathname.endsWith('.html') || u.pathname.endsWith('/'))) return null;
    return u;
  }
  function setMeta(doc) {
    document.title = doc.title;
    ['meta[name=description]', 'meta[property="og:title"]', 'meta[property="og:description"]', 'meta[property="og:url"]', 'meta[property="og:image"]'].forEach(sel => {
      const a = $(sel), b = doc.querySelector(sel);
      if (a && b) a.setAttribute('content', b.getAttribute('content'));
    });
    document.body.dataset.page = doc.body.dataset.page || '';
  }
  function jumpToHash(hash) {
    if (hash && hash.length > 1) {
      const t = document.getElementById(decodeURIComponent(hash.slice(1)));
      if (t) {
        t.scrollIntoView({ block: 'center', behavior: 'auto' });
        t.classList.remove('flash'); void t.offsetWidth; t.classList.add('flash');
        return true;
      }
    }
    return false;
  }
  function afterSwap() {
    $$('.reveal', page).forEach(el => el.classList.remove('reveal'));
    reveal(page);
    markCurrent();
    homeRedirect();
    progress();
  }
  let navigating = false;
  let shown = location.pathname; // pagina attualmente mostrata
  async function go(href, push) {
    const u = new URL(href, location.href);
    if (navigating) return;
    navigating = true;
    try {
      const doc = await fetchPage(key(u));
      if (push) history.replaceState({ y: window.scrollY }, '');
      closeToc(true); closeSearch(true);
      page.classList.add('leaving');
      await sleep(reduced ? 0 : 140);
      const next = doc.getElementById('page');
      page.innerHTML = next.innerHTML;
      page.className = next.className;
      Object.keys(page.dataset).forEach(k => delete page.dataset[k]);
      Object.keys(next.dataset).forEach(k => { page.dataset[k] = next.dataset[k]; });
      setMeta(doc);
      if (push) history.pushState({ y: 0 }, '', u.href);
      shown = u.pathname;
      window.scrollTo(0, 0);
      afterSwap();
      if (u.hash) jumpToHash(u.hash);
      page.classList.remove('leaving');
      if (!reduced) { page.classList.add('enter'); setTimeout(() => page.classList.remove('enter'), 400); }
      page.focus({ preventScroll: true });
    } catch (err) {
      location.href = u.href;
    } finally {
      navigating = false;
    }
  }
  document.addEventListener('click', e => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest('a');
    const u = internal(a);
    if (!u) return;
    if (u.pathname === location.pathname && u.search === location.search) {
      if (u.hash) return; // ancora nella stessa pagina: ci pensa il browser
      e.preventDefault(); window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' }); return;
    }
    e.preventDefault();
    go(u.href, true);
  });
  const warm = e => {
    const u = internal(e.target.closest && e.target.closest('a'));
    if (u && u.pathname !== location.pathname) fetchPage(key(u)).catch(() => {});
  };
  document.addEventListener('mouseover', warm, { passive: true });
  document.addEventListener('touchstart', warm, { passive: true });
  document.addEventListener('focusin', warm);
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.addEventListener('popstate', e => {
    const y = e.state && typeof e.state.y === 'number' ? e.state.y : 0;
    if (location.pathname === shown) { jumpToHash(location.hash); return; } // cambia solo l'ancora
    go(location.href, false).then(() => { if (!location.hash) window.scrollTo(0, y); });
  });

  /* Vecchi indirizzi con ancora (#cap3, #prologo...) → nuove pagine */
  const OLD = { prologo: 'prologo', cap1: 'astra', cap2: 'idyll', cap3: 'aniimo', cap4: 'pathfinder', cap5: 'twine', cap6: 'vene', cap7: 'costa-dello-zefiro', cap8: 'leggende', cap9: 'storia-principale', glossario: 'glossario', conclusione: 'conclusione', fonti: 'fonti' };
  function homeRedirect() {
    if (document.body.dataset.page !== 'home') return;
    const slug = OLD[location.hash.slice(1)];
    if (slug) location.replace(slug + '.html');
  }

  /* ---------- Lettore musicale ---------- */
  const audio = $('#bgAudio');
  const player = $('#player');
  const playBtn = $('#playBtn');
  const seek = $('#seek');
  const volume = $('#volume');
  const timeLabel = $('#timeLabel');
  const muteBtn = $('#muteBtn');
  const loopBtn = $('#loopBtn');
  const minBtn = $('#minBtn');
  const hint = $('#hint');
  const svg = d => '<svg viewBox="0 0 24 24" aria-hidden="true">' + d + '</svg>';
  const ICON = {
    play: svg('<path d="M8 5v14l11-7z"/>'),
    pause: svg('<path d="M7 5h4v14H7zM13 5h4v14h-4z"/>'),
    vol: svg('<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16 8.5a5 5 0 0 1 0 7" fill="none" stroke="currentColor" stroke-width="2"/>'),
    mute: svg('<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16 9.5l5 5m0-5l-5 5" fill="none" stroke="currentColor" stroke-width="2"/>'),
    loop: svg('<path d="M4 11V9a3 3 0 0 1 3-3h11M15 3l3 3-3 3M20 13v2a3 3 0 0 1-3 3H6M9 21l-3-3 3-3" fill="none" stroke="currentColor" stroke-width="2"/>'),
    min: svg('<path d="M5 12h14" fill="none" stroke="currentColor" stroke-width="2"/>'),
    note: svg('<path d="M9 17V5l11-2v12" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="6.5" cy="17" r="2.5"/><circle cx="17.5" cy="15" r="2.5"/>')
  };
  const PREF = 'aniimo-musica';
  const POS = 'aniimo-musica-pos';
  let started = false;

  const fmt = t => {
    if (!isFinite(t)) return '0:00';
    return Math.floor(t / 60) + ':' + Math.floor(t % 60).toString().padStart(2, '0');
  };
  function paint() {
    playBtn.innerHTML = audio.paused ? ICON.play : ICON.pause;
    playBtn.setAttribute('aria-label', audio.paused ? 'Riproduci' : 'Metti in pausa');
    muteBtn.innerHTML = (audio.muted || audio.volume === 0) ? ICON.mute : ICON.vol;
    muteBtn.setAttribute('aria-label', audio.muted ? "Riattiva l'audio" : "Disattiva l'audio");
  }
  let lastSave = 0;
  function updateTime() {
    if (audio.duration) seek.value = (audio.currentTime / audio.duration) * 100;
    timeLabel.textContent = fmt(audio.currentTime) + ' / ' + fmt(audio.duration);
    const now = Date.now();
    if (now - lastSave > 1500 && audio.currentTime > 0) { lastSave = now; store(POS, audio.currentTime.toFixed(1)); }
  }

  loopBtn.innerHTML = ICON.loop;
  minBtn.innerHTML = ICON.min;
  audio.volume = volume.value;
  paint();

  audio.addEventListener('play', () => { started = true; player.classList.add('started'); paint(); });
  audio.addEventListener('pause', paint);
  audio.addEventListener('volumechange', paint);
  audio.addEventListener('timeupdate', updateTime);
  audio.addEventListener('loadedmetadata', () => {
    const p = parseFloat(read(POS));
    if (p > 0 && p < audio.duration - 2) audio.currentTime = p; // riprende da dove era rimasta, se la pagina viene ricaricata
    updateTime();
  }, { once: true });
  audio.addEventListener('error', () => player.classList.add('off'));
  window.addEventListener('pagehide', () => { if (audio.currentTime > 0) store(POS, audio.currentTime.toFixed(1)); });

  playBtn.addEventListener('click', () => {
    started = true;
    if (audio.paused) { audio.play().catch(() => {}); store(PREF, null); }
    else { audio.pause(); store(PREF, 'off'); }
  });
  seek.addEventListener('input', () => { if (audio.duration) audio.currentTime = (seek.value / 100) * audio.duration; });
  volume.addEventListener('input', () => { audio.volume = volume.value; audio.muted = false; });
  muteBtn.addEventListener('click', () => { audio.muted = !audio.muted; });
  loopBtn.addEventListener('click', () => {
    audio.loop = !audio.loop;
    loopBtn.classList.toggle('on', audio.loop);
    loopBtn.setAttribute('aria-pressed', audio.loop);
  });
  function setMini(mini) {
    player.classList.toggle('mini', mini);
    minBtn.innerHTML = mini ? ICON.note : ICON.min;
    minBtn.setAttribute('aria-label', mini ? 'Apri il lettore' : 'Riduci il lettore');
    minBtn.setAttribute('aria-expanded', !mini);
  }
  minBtn.addEventListener('click', () => setMini(!player.classList.contains('mini')));
  if (window.matchMedia('(max-width:560px)').matches) setMini(true);

  // Avvio al primo tocco: i browser non permettono l'audio prima di un gesto di chi legge.
  // Chi aveva messo in pausa nella visita precedente non viene disturbato.
  const GESTURES = ['pointerup', 'touchend', 'keydown'];
  const stopListening = () => GESTURES.forEach(g => document.removeEventListener(g, firstTouch, true));
  function firstTouch(e) {
    if (started || player.contains(e.target)) { stopListening(); return; }
    audio.play().then(stopListening).catch(() => {});
  }
  if (read(PREF) === 'off') {
    hint.textContent = 'Musica in pausa: premi ▶ per riascoltarla.';
  } else {
    GESTURES.forEach(g => document.addEventListener(g, firstTouch, true));
  }

  /* ---------- Avvio ---------- */
  history.replaceState({ y: 0 }, '');
  afterSwap();
  if (location.hash) setTimeout(() => jumpToHash(location.hash), 60);
})();
