#!/usr/bin/env python3
"""Genera il sito a più pagine di «Lore di Aniimo».

Come funziona
  contenuti/capitoli.json     elenco e metadati delle pagine (titolo, numero, descrizione)
  contenuti/nomi.json         nomi propri inglesi da mettere in grassetto
  contenuti/<pagina>.html     testo e immagini di ogni pagina (solo il corpo, senza menu)
  strumenti/genera_sito.py    questo script: unisce testi e modello
  docs/                       il sito pubblicato da GitHub Pages (pagine generate, stile, script, immagini, musica)

Per modificare un testo: cambia il file in contenuti/ e lancia
  python3 strumenti/genera_sito.py
Le pagine in docs/ e docs/assets/js/ricerca.json vengono riscritte: non modificarle a mano.
Serve solo Python 3; Pillow, se presente, prepara le anteprime piccole delle schede.
"""
import html
import json
import math
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SITO_DIR = ROOT / "docs"  # cartella pubblicata da GitHub Pages
DATA = json.loads((ROOT / "contenuti" / "capitoli.json").read_text(encoding="utf-8"))
SITO = DATA["sito"]
PAGINE = DATA["pagine"]
BASE = SITO["url"]

SOCIAL = [
    ("Instagram", "https://www.instagram.com/nickdelfra/"),
    ("Facebook", "https://www.facebook.com/nicola.delfrancia/"),
    ("TikTok", "https://www.tiktok.com/@nickdelfra"),
    ("Twitch", "https://www.twitch.tv/exohunter2118"),
    ("Discord", "https://discord.com/users/371274185206398977"),
    ("Steam", "https://steamcommunity.com/profiles/76561198320526546/"),
]
PAYPAL = "https://paypal.me/nickdelfra"
INTRO = (
    "Il mondo di gioco poggia su due mondi sovrapposti: Astra, la città fluttuante costruita dagli umani dopo "
    "aver lasciato la Terra, e Idyll, il continente selvaggio sottostante dove vivono gli Aniimo. Secondo la "
    "leggenda Idyll fu creato da nove Aeon, ciascuno a guardia di un dominio. Sotto il suolo scorrono le Vene, "
    "la rete di energia vitale che spiega gran parte delle meccaniche: Rami, Fioriture, Ambra Lumin e Flusso Prismana."
)
HERO_IMG = "assets/img/00-prologo/astra-e-idyll.jpeg"
# Gli sfondi sono scritti direttamente nella pagina: così il percorso dell'immagine è relativo alla pagina, non al CSS.
SFONDO_HOME = "linear-gradient(180deg,rgba(10,19,34,.62) 0%,rgba(10,19,34,.5) 45%,#0a1322 100%)"
SFONDO_CAPITOLO = "linear-gradient(180deg,rgba(10,19,34,.62) 0%,rgba(10,19,34,.86) 65%,#0a1322 100%)"
FONTS = ("https://fonts.googleapis.com/css2?family=Cinzel:wght@500;600;700"
         "&family=EB+Garamond:ital,wght@0,400;0,500;0,600;1,400&display=swap")
FAVICON = ("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Ccircle cx='16' cy='16' r='15' "
           "fill='%230a1322' stroke='%23d3b36a' stroke-width='2'/%3E%3Cpath d='M16 6l2.6 7.4L26 16l-7.4 2.6L16 26l-2.6-7.4L6 "
           "16l7.4-2.6z' fill='%23d3b36a'/%3E%3C/svg%3E")

e = html.escape


NOMI = json.loads((ROOT / "contenuti" / "nomi.json").read_text(encoding="utf-8"))
_alt = "|".join(re.escape(n) for n in sorted(NOMI["nomi"], key=len, reverse=True))
RE_NOMI = re.compile(r"(?<![\w-])(" + _alt + r")(?![\w-])")


def testo(s):
    s = re.sub(r"<[^>]+>", "", s)
    return re.sub(r"\s+", " ", html.unescape(s)).strip()


def didascalia(s):
    return testo(s.replace("</strong>", ": "))


def grassetto(corpo):
    """Mette in grassetto i nomi propri inglesi nei paragrafi (non nelle avvertenze, nei link o nel corsivo)."""
    visti = set()
    tutte = NOMI.get("modo") == "tutte"

    def paragrafo(m):
        if 'class="callout"' in m.group(1):
            return m.group(0)
        out, chiuso = [], 0
        for tok in re.split(r"(<[^>]+>)", m.group(2)):
            if tok.startswith("<"):
                if re.match(r"<(a|em|strong)[\s>]", tok):
                    chiuso += 1
                elif re.match(r"</(a|em|strong)>", tok):
                    chiuso -= 1
                out.append(tok)
                continue
            if chiuso:
                out.append(tok)
                continue

            def nome(n):
                if not tutte and n.group(1) in visti:
                    return n.group(0)
                visti.add(n.group(1))
                return f'<strong class="nome">{n.group(1)}</strong>'
            out.append(RE_NOMI.sub(nome, tok))
        return m.group(1) + "".join(out) + "</p>"

    return re.sub(r"(<p\b[^>]*>)(.*?)</p>", paragrafo, corpo, flags=re.S)


def etichetta(p):
    n = p["numero"]
    if n == "Prologo":
        return "Pr"
    if n == "Introduzione":
        return "In"
    m = re.match(r"Capitolo (\d+)", n)
    return m.group(1) if m else "—"


def crumb_di(p):
    return p["breve"] if p["numero"] == p["breve"] else f"{p['numero']} · {p['breve']}"


def prepara(p):
    """Legge il frammento, assegna un id a paragrafi/figure/voci e ricava testo per la ricerca."""
    raw = (ROOT / "contenuti" / f"{p['slug']}.html").read_text(encoding="utf-8")
    n = [0]

    def rep(m):
        n[0] += 1
        if m.group(1):
            return f'<{m.group(1)} id="b{n[0]}"{m.group(2)}>'
        return f'<div id="b{n[0]}">'

    corpo = re.sub(r"<(p|li|figure)(?=[\s>])([^>]*)>|<div>(?=<dt>)", rep, raw)
    if p["gruppo"] == "racconto":  # capolettera sul primo paragrafo (non sulle avvertenze)
        corpo = re.sub(r'<p id="(b\d+)">', r'<p id="\1" class="dropcap">', corpo, count=1)
        corpo = grassetto(corpo)

    righe = []
    for m in re.finditer(r'<p id="(b\d+)"[^>]*>(.*?)</p>|<li id="(b\d+)"[^>]*>(.*?)</li>|'
                         r'<figure id="(b\d+)"[^>]*>.*?<figcaption>(.*?)</figcaption>|'
                         r'<div id="(b\d+)"><dt>(.*?)</dt><dd>(.*?)</dd></div>', corpo, re.S):
        g = m.groups()
        if g[0]:
            i, t = g[0], testo(g[1])
        elif g[2]:
            i, t = g[2], testo(g[3])
        elif g[4]:
            i, t = g[4], didascalia(g[5])
        else:
            i, t = g[6], testo(g[7]) + ": " + testo(g[8])
        if t:
            righe.append({"s": p["slug"], "t": p["titolo"], "n": p["numero"], "i": i, "x": t})

    img = re.search(r'<img src="([^"]+)"', raw)
    p["cover"] = img.group(1) if img else p.get("copertina")
    p["corpo"] = corpo
    p["parole"] = len(testo(raw).split())
    p["minuti"] = max(1, math.ceil(p["parole"] / 200))
    p["figure"] = len(re.findall(r"<figure", raw))
    p["ricerca"] = righe


def anteprima(p):
    """Anteprima piccola per le schede della pagina iniziale (se Pillow non c'è, usa l'originale)."""
    if not p["cover"]:
        return None
    out = SITO_DIR / "assets" / "img" / "anteprime" / f"{p['slug']}.jpg"
    if out.exists() and out.stat().st_mtime >= (SITO_DIR / p["cover"]).stat().st_mtime:
        return out.relative_to(SITO_DIR).as_posix()
    try:
        from PIL import Image
        out.parent.mkdir(parents=True, exist_ok=True)
        im = Image.open(SITO_DIR / p["cover"]).convert("RGB")
        w = 720
        im = im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
        im.save(out, "JPEG", quality=80, optimize=True, progressive=True)
        return out.relative_to(SITO_DIR).as_posix()
    except Exception:
        return p["cover"]


ICON_SEARCH = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>'
ICON_MENU = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>'
ICON_CLOSE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>'


def indice():
    def voci(gruppo):
        return "".join(
            f'<li><a href="{p["slug"]}.html" data-slug="{p["slug"]}"><span class="n">{etichetta(p)}</span>'
            f'<span>{e(p["titolo"])}</span></a></li>' for p in PAGINE if p["gruppo"] == gruppo)
    return (
        '<aside id="drawer" aria-label="Indice dei capitoli" aria-hidden="true">'
        f'<div class="drawer-head"><h2>Indice</h2><button class="iconbtn" id="tocClose" aria-label="Chiudi l\'indice">{ICON_CLOSE}</button></div>'
        '<nav class="drawer-body">'
        '<ol class="toc"><li><a href="index.html" data-slug="home"><span class="n">⌂</span><span>Pagina iniziale</span></a></li></ol>'
        f'<h3>Il racconto</h3><ol class="toc">{voci("racconto")}</ol>'
        f'<h3>Approfondimenti</h3><ol class="toc">{voci("extra")}</ol>'
        '</nav></aside>')


def pagina(titolo, descrizione, url, immagine, kind, main, crumb):
    social = " · ".join(f'<a href="{u}" target="_blank" rel="noopener">{n}</a>' for n, u in SOCIAL)
    return f"""<!DOCTYPE html>
<html lang="it" data-modo="scuro">
<head>
<script>try{{if(localStorage.getItem('aniimo-modo')==='chiaro')document.documentElement.dataset.modo='chiaro'}}catch(e){{}}</script>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{e(titolo)}</title>
<meta name="description" content="{e(descrizione)}">
<meta name="author" content="Nicola del Francia">
<meta name="theme-color" content="#0a1322">
<meta property="og:type" content="website">
<meta property="og:locale" content="it_IT">
<meta property="og:title" content="{e(titolo)}">
<meta property="og:description" content="{e(descrizione)}">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{BASE}{immagine}">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="{FAVICON}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="{FONTS}" rel="stylesheet">
<link rel="stylesheet" href="assets/css/style.css">
</head>
<body data-page="{kind}">
<div id="sky" aria-hidden="true"><div class="strato notte"></div><div class="strato giorno"></div><canvas id="stars"></canvas><div class="orb"></div></div>
<a class="skip" href="#page">Vai al testo</a>
<div id="scrollProgress"></div>

<header class="topbar">
  <a class="brand" href="index.html" aria-label="Lore di Aniimo, pagina iniziale">ANIIMO</a>
  <span class="crumb" id="crumb">{e(crumb)}</span>
  <div class="tools">
    <button class="switch" id="modeBtn" role="switch" aria-checked="false" aria-label="Tema chiaro"><span class="fill"></span><span class="knob"><span class="icon moon"></span><span class="icon sun"></span></span></button>
    <button class="iconbtn" id="searchBtn" aria-label="Cerca nel testo (tasto /)">{ICON_SEARCH}</button>
    <button class="iconbtn txt" id="tocBtn" aria-expanded="false" aria-controls="drawer">{ICON_MENU}<span>Indice</span></button>
  </div>
</header>

<div id="scrim" hidden></div>
{indice()}
<div id="search" role="dialog" aria-modal="true" aria-label="Cerca nel testo">
  <div class="search-panel">
    <div class="search-row">{ICON_SEARCH}<input id="q" type="search" placeholder="Cerca un nome, un luogo, una parola…" autocomplete="off" aria-label="Cerca nel testo"><span class="kbd">Esc</span></div>
    <ul id="results" aria-live="polite"></ul>
  </div>
</div>

{main}

<footer class="site-footer">
  <div class="brandline">Lore di Aniimo · versione 2.0 in italiano</div>
  <div>Testo ricostruito e tradotto da <strong>Nicola del Francia</strong></div>
  <div class="socials">{social}</div>
  <div class="support"><a href="{PAYPAL}" target="_blank" rel="noopener">Sostieni il progetto con PayPal</a></div>
</footer>

<audio id="bgAudio" src="assets/musica/march-of-progress.mp3" preload="metadata" loop></audio>
<aside class="player" id="player" aria-label="Lettore musicale">
  <button class="play" id="playBtn" aria-label="Riproduci"></button>
  <span class="eq" aria-hidden="true"><i></i><i></i><i></i></span>
  <div class="player-body">
    <div class="track-row"><span class="track-title">March of Progress <span>· MALO</span></span><span class="time" id="timeLabel">0:00</span></div>
    <input type="range" id="seek" value="0" min="0" max="100" step="0.1" aria-label="Posizione nel brano">
    <div class="ctrl-row"><div>
      <button class="ctl" id="muteBtn" aria-label="Disattiva l'audio"></button>
      <input type="range" id="volume" min="0" max="1" step="0.01" value="0.15" aria-label="Volume">
      <span class="vol-val" id="volVal">15%</span>
      <button class="ctl on" id="loopBtn" aria-label="Ripeti il brano" aria-pressed="true"></button>
    </div></div>
    <p class="hint" id="hint">La musica parte al primo tocco sulla pagina.</p>
  </div>
  <button class="ctl" id="volBtn" aria-label="Volume e ripetizione" aria-expanded="false"></button>
  <button class="ctl" id="minBtn" aria-label="Riduci il lettore" aria-expanded="true"></button>
</aside>

<script src="assets/js/app.js" defer></script>
</body>
</html>
"""


def main_capitolo(i, p):
    prec = PAGINE[i - 1] if i > 0 else None
    succ = PAGINE[i + 1] if i < len(PAGINE) - 1 else None
    casa = PAGINE[0].get("anteprima")

    def scheda_pager(cls, href, rel, sopra, titolo, img):
        th = f'<span class="pthumb"><img src="{img}" alt="" loading="lazy" decoding="async"></span>' if img else ""
        r = f' rel="{rel}"' if rel else ""
        return (f'<a class="{cls}" href="{href}"{r}>{th}<span class="ptext"><small>{sopra}</small>'
                f'<b>{titolo}</b></span></a>')
    if prec:
        pr = scheda_pager("prev", f'{prec["slug"]}.html', "prev", f'← {e(prec["numero"])}', e(prec["titolo"]), prec.get("anteprima"))
    else:
        pr = scheda_pager("prev", "index.html", "", "← Indice", "Pagina iniziale", casa)
    if succ:
        nx = scheda_pager("next", f'{succ["slug"]}.html', "next", f'{e(succ["numero"])} →', e(succ["titolo"]), succ.get("anteprima"))
    else:
        nx = scheda_pager("next", "index.html", "", "Fine →", "Torna alla pagina iniziale", casa)
    extra = p.get("extra", "")
    meta = f'{p["minuti"]} min di lettura'
    if p["figure"]:
        meta += f' · {p["figure"]} illustrazion{"e" if p["figure"] == 1 else "i"}'
    if p["cover"]:
        hero = (f'<header class="chapter-hero"><div class="hero-bg" '
                f'style="background-image:{SFONDO_CAPITOLO},url(\'{p["cover"]}\')"></div>')
    else:
        hero = '<header class="chapter-hero no-cover">'
    return f"""<main id="page" class="chapter-page" data-slug="{p['slug']}" data-indice="{i + 1}" data-totale="{len(PAGINE)}" data-crumb="{e(crumb_di(p))}" tabindex="-1">
  {hero}
    <div class="inner">
      <p class="chapter-label">{e(p['numero'])}</p>
      <h1 class="chapter-title">{p['titolo']}</h1>
      <p class="chapter-meta">{meta}</p>
    </div>
  </header>
  <article class="prose {extra}">
{p['corpo']}
  </article>
  <nav class="pager" aria-label="Capitolo precedente e successivo">
    {pr}
    {nx}
  </nav>
  <p class="back-index"><a href="index.html#capitoli">Tutti i capitoli</a></p>
</main>"""


def scheda(p, first=False):
    thumb = ""
    if p.get("anteprima"):
        thumb = f'<div class="thumb"><img src="{p["anteprima"]}" width="720" height="405" loading="lazy" decoding="async" alt=""></div>'
    meta = f'{p["minuti"]} min di lettura'
    return (f'<a class="card{" first" if first else ""}" href="{p["slug"]}.html">{thumb}'
            f'<div class="body"><span class="num">{e(p["numero"])}</span><h3>{p["titolo"]}</h3>'
            f'<p>{e(p["descrizione"])}</p><span class="meta">{meta}</span></div></a>')


def main_home():
    racconto = [p for p in PAGINE if p["gruppo"] == "racconto"]
    extra = [p for p in PAGINE if p["gruppo"] == "extra"]
    schede = "".join(scheda(p, first=(k == 0)) for k, p in enumerate(racconto))
    schede2 = "".join(scheda(p) for p in extra)
    return f"""<main id="page" class="home" data-slug="home" data-indice="0" data-totale="{len(PAGINE)}" data-crumb="" tabindex="-1">
  <section class="home-hero"><div class="hero-bg" style="background-image:{SFONDO_HOME},url('{HERO_IMG}')"></div>
    <div class="inner">
      <p class="kicker">Raccolta in italiano della lore e della storia del gioco</p>
      <h1 class="display">Lore di Aniimo</h1>
      <p class="subtitle">I capitoli del mondo di gioco</p>
      <div class="cta">
        <a class="btn primary" href="introduzione.html">Inizia a leggere</a>
        <a class="btn" href="#capitoli">Sfoglia i capitoli</a>
      </div>
    </div>
  </section>
  <p class="intro">{INTRO}</p>
  <div class="section-head" id="capitoli">
    <h2>Il racconto</h2>
    <p>Un'introduzione, un prologo e nove capitoli, dalla fine della Terra alla storia che vive il giocatore.</p>
  </div>
  <div class="cards">{schede}</div>
  <div class="section-head">
    <h2>Approfondimenti</h2>
    <p>Per ritrovare una parola, chiudere il racconto o controllare le fonti.</p>
  </div>
  <div class="cards slim">{schede2}</div>
</main>"""


def collega(p, per_slug):
    """Link «@pagina#Nome» → paragrafo della pagina in cui il nome compare per la prima volta."""
    def rep(m):
        dest, nome = m.group(1), html.unescape(m.group(2))
        q = per_slug.get(dest)
        if q:
            for b in re.finditer(r'<(p|figure|li|div) id="(b\d+)"[^>]*>(.*?)</\1>', q["corpo"], re.S):
                if nome in testo(b.group(3)):
                    return f'href="{dest}.html#{b.group(2)}"'
        print(f"  attenzione: «{nome}» non trovato in {dest}, collego la pagina")
        return f'href="{dest}.html"'
    p["corpo"] = re.sub(r'href="@([\w-]+)#([^"]+)"', rep, p["corpo"])


def scrivi(nome, contenuto):
    (SITO_DIR / nome).write_text(contenuto, encoding="utf-8")


def main():
    for p in PAGINE:
        prepara(p)
        p["anteprima"] = anteprima(p)
    per_slug = {p["slug"]: p for p in PAGINE}
    for p in PAGINE:
        collega(p, per_slug)

    scrivi("index.html", pagina(
        f"{SITO['nome']} — La storia e i capitoli del mondo di gioco", SITO["descrizione"], BASE, HERO_IMG,
        "home", main_home(), ""))

    ricerca = []
    for i, p in enumerate(PAGINE):
        scrivi(f"{p['slug']}.html", pagina(
            f"{testo(p['titolo'])} — {SITO['nome']}", p["descrizione"], f"{BASE}{p['slug']}.html",
            p["cover"] or HERO_IMG, "capitolo", main_capitolo(i, p), crumb_di(p)))
        ricerca.extend(p["ricerca"])

    (SITO_DIR / "assets" / "js").mkdir(parents=True, exist_ok=True)
    (SITO_DIR / "assets" / "js" / "ricerca.json").write_text(
        json.dumps(ricerca, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"Generate {len(PAGINE) + 1} pagine e {len(ricerca)} voci di ricerca.")
    for p in PAGINE:
        print(f"  {p['slug']:<22} {p['parole']:>5} parole  {p['minuti']:>2} min  {p['figure']} fig.")


if __name__ == "__main__":
    main()
