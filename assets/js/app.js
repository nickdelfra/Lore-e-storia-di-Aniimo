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
    queueSky();
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
  const volVal = $('#volVal');
  const timeLabel = $('#timeLabel');
  const muteBtn = $('#muteBtn');
  const loopBtn = $('#loopBtn');
  const volBtn = $('#volBtn');
  const minBtn = $('#minBtn');
  const hint = $('#hint');
  const svg = d => '<svg viewBox="0 0 24 24" aria-hidden="true">' + d + '</svg>';
  const ICON = {
    play: svg('<path d="M8.5 5.6v12.8a1 1 0 0 0 1.5.86l10.2-6.4a1 1 0 0 0 0-1.72L10 4.74a1 1 0 0 0-1.5.86z"/>'),
    pause: svg('<rect x="6.5" y="5" width="4" height="14" rx="1.6"/><rect x="13.5" y="5" width="4" height="14" rx="1.6"/>'),
    vol: svg('<path d="M4 9.5v5a1 1 0 0 0 1 1h3l4.4 3.6a.6.6 0 0 0 1-.47V5.37a.6.6 0 0 0-1-.47L8 8.5H5a1 1 0 0 0-1 1z"/><path d="M16.5 8.5a5 5 0 0 1 0 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'),
    mute: svg('<path d="M4 9.5v5a1 1 0 0 0 1 1h3l4.4 3.6a.6.6 0 0 0 1-.47V5.37a.6.6 0 0 0-1-.47L8 8.5H5a1 1 0 0 0-1 1z"/><path d="M16.5 9.5l4.5 5m0-5l-4.5 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'),
    loop: svg('<path d="M4 11V9.5A3.5 3.5 0 0 1 7.5 6H18M15 3l3 3-3 3M20 13v1.5a3.5 3.5 0 0 1-3.5 3.5H6M9 21l-3-3 3-3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'),
    min: svg('<path d="M7 10l5 5 5-5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>'),
    max: svg('<path d="M7 14l5-5 5 5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>')
  };
  const PREF = 'aniimo-musica';
  const POS = 'aniimo-musica-pos';
  const VOL = 0.15; // volume di partenza
  let started = false;

  const fmt = t => {
    if (!isFinite(t)) return '0:00';
    return Math.floor(t / 60) + ':' + Math.floor(t % 60).toString().padStart(2, '0');
  };
  const fill = el => el.style.setProperty('--p', ((el.value - el.min) / (el.max - el.min) * 100) + '%');
  function paint() {
    playBtn.innerHTML = audio.paused ? ICON.play : ICON.pause;
    playBtn.setAttribute('aria-label', audio.paused ? 'Riproduci' : 'Metti in pausa');
    player.classList.toggle('playing', !audio.paused);
    const silent = audio.muted || audio.volume === 0;
    muteBtn.innerHTML = silent ? ICON.mute : ICON.vol;
    volBtn.innerHTML = silent ? ICON.mute : ICON.vol;
    muteBtn.setAttribute('aria-label', audio.muted ? "Riattiva l'audio" : "Disattiva l'audio");
    volVal.textContent = Math.round((audio.muted ? 0 : audio.volume) * 100) + '%';
    fill(volume);
  }
  let lastSave = 0;
  function updateTime() {
    if (audio.duration) { seek.value = (audio.currentTime / audio.duration) * 100; fill(seek); }
    timeLabel.textContent = fmt(audio.currentTime) + (audio.duration ? ' / ' + fmt(audio.duration) : '');
    const now = Date.now();
    if (now - lastSave > 1500 && audio.currentTime > 0) { lastSave = now; store(POS, audio.currentTime.toFixed(1)); }
  }

  loopBtn.innerHTML = ICON.loop;
  minBtn.innerHTML = ICON.min;
  volume.value = VOL;
  audio.volume = VOL;
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
  seek.addEventListener('input', () => { fill(seek); if (audio.duration) audio.currentTime = (seek.value / 100) * audio.duration; });
  volume.addEventListener('input', () => { audio.volume = volume.value; audio.muted = false; });
  muteBtn.addEventListener('click', () => { audio.muted = !audio.muted; });
  loopBtn.addEventListener('click', () => {
    audio.loop = !audio.loop;
    loopBtn.classList.toggle('on', audio.loop);
    loopBtn.setAttribute('aria-pressed', audio.loop);
  });
  volBtn.addEventListener('click', () => {
    const open = !player.classList.contains('open');
    player.classList.toggle('open', open);
    volBtn.setAttribute('aria-expanded', open);
  });
  function setMini(mini) {
    player.classList.toggle('mini', mini);
    if (mini) { player.classList.remove('open'); volBtn.setAttribute('aria-expanded', 'false'); }
    minBtn.innerHTML = mini ? ICON.max : ICON.min;
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
    if (started || player.contains(e.target) || e.target.closest('#modeBtn')) { if (started) stopListening(); return; }
    audio.play().then(stopListening).catch(() => {});
  }
  if (read(PREF) === 'off') {
    hint.textContent = 'Musica in pausa: premi ▶ per riascoltarla.';
  } else {
    GESTURES.forEach(g => document.addEventListener(g, firstTouch, true));
  }

  /* ---------- Cielo: notte → alba scorrendo (tema scuro), giorno caldo (tema chiaro) ---------- */
  const root = document.documentElement;
  // [posizione nella pagina, colore in alto, colore in basso]
  const NOTTE = [[0, '#070f1d', '#0d1a2e'], [.45, '#0d1533', '#241e48'], [.75, '#191736', '#4e2a3e'], [1, '#2a1a33', '#8a4322']];
  const GIORNO = [[0, '#fff8ea', '#ffeccf'], [.5, '#fff1d9', '#ffdcab'], [1, '#ffe6be', '#ffbd7a']];
  const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const mix = (a, b, k) => { const A = Array.isArray(a) ? a : hex(a), B = Array.isArray(b) ? b : hex(b); return A.map((v, i) => Math.round(v + (B[i] - v) * k)); };
  const rgb = (c, al) => al == null ? `rgb(${c.join(',')})` : `rgba(${c.join(',')},${al})`;
  const smooth = (a, b, x) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); };
  const chiaro = () => root.dataset.modo === 'chiaro';
  function at(P, t) {
    let i = 0;
    while (i < P.length - 2 && t > P[i + 1][0]) i++;
    const [p0, top0, bot0] = P[i], [p1, top1, bot1] = P[i + 1];
    const k = Math.min(1, Math.max(0, (t - p0) / (p1 - p0)));
    return [mix(top0, top1, k), mix(bot0, bot1, k)];
  }
  let skyT = 0, dawn = 0, skyQueued = false;
  function sky() {
    skyQueued = false;
    const h = document.documentElement;
    const max = h.scrollHeight - h.clientHeight;
    skyT = max > 0 ? Math.min(1, h.scrollTop / max) : 0;
    dawn = smooth(.45, 1, skyT);
    const [nt, nb] = at(NOTTE, skyT), [gt, gb] = at(GIORNO, skyT);
    const s = root.style, day = chiaro(), w = smooth(.35, 1, skyT);
    s.setProperty('--n-top', rgb(nt)); s.setProperty('--n-bot', rgb(nb));
    s.setProperty('--g-top', rgb(gt)); s.setProperty('--g-bot', rgb(gb));
    s.setProperty('--dawn', dawn.toFixed(3));
    s.setProperty('--bar', day ? rgb(gt, .84) : rgb(nt, .82));
    s.setProperty('--gold', rgb(day ? mix('#8a5a12', '#9c4612', w) : mix('#d3b36a', '#f2b56c', w)));
    s.setProperty('--gold-soft', rgb(day ? mix('#a87b3a', '#b0602a', w) : mix('#8d7239', '#b8743f', w)));
  }
  const queueSky = () => { if (!skyQueued) { skyQueued = true; requestAnimationFrame(sky); } };
  window.addEventListener('scroll', queueSky, { passive: true });
  window.addEventListener('resize', queueSky);

  /* Stelle: tante, di luminosità e ritmo diversi, con qualche stella cadente; svaniscono verso l'alba */
  const canvas = $('#stars');
  const ctx = canvas && canvas.getContext ? canvas.getContext('2d') : null;
  const TINTE = ['255,255,255', '255,255,255', '214,226,255', '255,236,190', '196,214,255'];
  let stars = [], W = 0, H = 0, shoot = null, nextShoot = 0, running = false, starVis = 1;
  function makeStars() {
    if (!ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = Math.min(420, Math.round(W * H / 3600));
    stars = Array.from({ length: n }, () => {
      const r = Math.random(), big = r > .94, mid = r > .75;
      return {
        x: Math.random() * W, y: Math.random() * H * 1.5,
        r: big ? 1.3 + Math.random() * 1.1 : mid ? .8 + Math.random() * .5 : .3 + Math.random() * .5,
        a: big ? .75 + Math.random() * .25 : mid ? .45 + Math.random() * .4 : .15 + Math.random() * .45,
        sp: .3 + Math.random() * 2.4, ph: Math.random() * 6.283, tw: .25 + Math.random() * .6,
        c: TINTE[(Math.random() * TINTE.length) | 0], d: .15 + Math.random() * .85
      };
    });
  }
  function drawStars(ts) {
    ctx.clearRect(0, 0, W, H);
    const vis = starVis * (1 - smooth(.55, .97, skyT));
    if (vis < .01) return;
    const off = window.scrollY * .05, span = H * 1.5;
    for (const s of stars) {
      const tw = 1 - s.tw + s.tw * (.5 + .5 * Math.sin(ts / 1000 * s.sp + s.ph));
      const al = s.a * tw * vis;
      if (al < .02) continue;
      let y = (s.y - off * s.d) % span; if (y < 0) y += span;
      if (y > H + 4) continue;
      ctx.fillStyle = 'rgb(' + s.c + ')';
      ctx.globalAlpha = al;
      ctx.beginPath(); ctx.arc(s.x, y, s.r, 0, 6.283); ctx.fill();
      if (s.r > 1.25) { // stelle più grandi: alone e piccola croce di luce
        ctx.globalAlpha = al * .18; ctx.beginPath(); ctx.arc(s.x, y, s.r * 3.4, 0, 6.283); ctx.fill();
        ctx.globalAlpha = al * .45; ctx.fillRect(s.x - s.r * 4.5, y - .35, s.r * 9, .7); ctx.fillRect(s.x - .35, y - s.r * 4.5, .7, s.r * 9);
      }
    }
    if (!shoot && ts > nextShoot && vis > .35 && !reduced) {
      const dir = Math.random() < .5 ? -1 : 1;
      shoot = { x: W * (.15 + Math.random() * .7), y: H * (.05 + Math.random() * .3), vx: dir * (5 + Math.random() * 4), vy: 2.2 + Math.random() * 1.8, life: 0, max: 45 + Math.random() * 30 };
    }
    if (shoot) {
      shoot.life++; shoot.x += shoot.vx; shoot.y += shoot.vy;
      const k = shoot.life / shoot.max, al = Math.sin(k * Math.PI) * vis;
      const tx = shoot.x - shoot.vx * 14, ty = shoot.y - shoot.vy * 14;
      const g = ctx.createLinearGradient(shoot.x, shoot.y, tx, ty);
      g.addColorStop(0, `rgba(255,248,230,${al})`); g.addColorStop(1, 'rgba(255,248,230,0)');
      ctx.globalAlpha = 1; ctx.strokeStyle = g; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(shoot.x, shoot.y); ctx.lineTo(tx, ty); ctx.stroke();
      ctx.fillStyle = `rgba(255,252,240,${al})`; ctx.beginPath(); ctx.arc(shoot.x, shoot.y, 1.4, 0, 6.283); ctx.fill();
      if (shoot.life >= shoot.max) { shoot = null; nextShoot = ts + 4000 + Math.random() * 9000; }
    }
    ctx.globalAlpha = 1;
  }
  function loop(ts) {
    if (!running) return;
    drawStars(ts);
    requestAnimationFrame(loop);
  }
  function starsOn() {
    if (!ctx) return;
    const want = !chiaro() && !document.hidden;
    if (reduced) { if (want) drawStars(0); else ctx.clearRect(0, 0, W, H); return; }
    if (want && !running) { running = true; requestAnimationFrame(loop); }
    if (!want) running = false;
  }
  makeStars();
  window.addEventListener('resize', () => { makeStars(); if (reduced) starsOn(); });
  document.addEventListener('visibilitychange', starsOn);
  if (reduced) window.addEventListener('scroll', () => requestAnimationFrame(() => starsOn()), { passive: true });

  /* ---------- Interruttore giorno / notte ---------- */
  const modeBtn = $('#modeBtn');
  function pixelIcon(el, map) {
    const rows = map.trim().split('\n').map(r => r.trim());
    let rects = '';
    rows.forEach((r, y) => [...r].forEach((c, x) => { if (c === '#') rects += `<rect x="${x}" y="${y}" width="1" height="1"/>`; }));
    el.innerHTML = `<svg viewBox="0 0 ${rows[0].length} ${rows.length}" aria-hidden="true">${rects}</svg>`;
  }
  pixelIcon($('.icon.moon', modeBtn), `
    ....####...#
    ..#####...##
    .#####..#.#.
    .####.......
    #####..#....
    #####.......
    #####.......
    .#####...#..
    .######.##..
    ..#########.
    ....#####...`);
  pixelIcon($('.icon.sun', modeBtn), `
    ....#...#....
    .#...#.#...#.
    ..#.......#..
    ...#######...
    ...#######...
    #..#######..#
    ...#######...
    ...#######...
    ..#.......#..
    .#...#.#...#.
    ....#...#....`);
  function burst() {
    if (reduced) return;
    const r = $('.knob', modeBtn).getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const col = chiaro() ? '#ff8a1f' : '#4da3ff';
    for (let i = 0; i < 16; i++) {
      const p = document.createElement('i');
      p.className = 'px';
      p.style.cssText = `left:${cx}px;top:${cy}px;background:${col}`;
      document.body.appendChild(p);
      const a = Math.random() * Math.PI * 2, d = 26 + Math.random() * 46;
      p.animate([
        { transform: 'translate(0,0) scale(1) rotate(0)', opacity: 1 },
        { transform: `translate(${Math.cos(a) * d}px, ${Math.sin(a) * d}px) scale(0) rotate(180deg)`, opacity: 0 }
      ], { duration: 600 + Math.random() * 450, easing: 'cubic-bezier(.2,.8,.3,1)' }).onfinish = () => p.remove();
    }
  }
  function setModo(day, anim) {
    if (anim) { root.classList.add('cambio'); setTimeout(() => root.classList.remove('cambio'), 900); }
    root.dataset.modo = day ? 'chiaro' : 'scuro';
    modeBtn.setAttribute('aria-checked', day);
    modeBtn.setAttribute('aria-label', day ? 'Passa al tema scuro' : 'Passa al tema chiaro');
    modeBtn.title = day ? 'Tema chiaro: tocca per la notte' : 'Tema scuro: tocca per il giorno';
    const tc = $('meta[name=theme-color]'); if (tc) tc.setAttribute('content', day ? '#fff3e0' : '#0a1322');
    sky(); starsOn();
    if (anim) burst();
  }
  modeBtn.addEventListener('click', () => {
    const day = !chiaro();
    store('aniimo-modo', day ? 'chiaro' : null);
    setModo(day, true);
  });
  setModo(chiaro(), false);

  /* ---------- Pulsanti: onda di luce al tocco ---------- */
  document.addEventListener('pointerdown', e => {
    const el = e.target.closest('.btn, .iconbtn, .pager a, .support a, .player .play, .player .ctl');
    if (!el || reduced) return;
    const r = el.getBoundingClientRect();
    const d = Math.max(r.width, r.height) * 2.2;
    const w = document.createElement('span');
    w.className = 'ripple';
    w.style.cssText = `width:${d}px;height:${d}px;left:${e.clientX - r.left - d / 2}px;top:${e.clientY - r.top - d / 2}px`;
    el.appendChild(w);
    setTimeout(() => w.remove(), 650);
  });

  /* ---------- Avvio ---------- */
  history.replaceState({ y: 0 }, '');
  afterSwap();
  if (location.hash) setTimeout(() => jumpToHash(location.hash), 60);
})();
