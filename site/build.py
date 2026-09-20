#!/usr/bin/env python3
"""Render the Awesome JEV gallery from the files in this directory.

    python3 site/build.py            -> site/dist/ (index.html, assets/)

entries.json holds the entries that have a picture (one card each), sections.json the section
labels and hues, tiles/ the 16:10 pictures, avatars/ the owners' GitHub avatars. Star counts are
read from the GitHub API at build time (GITHUB_TOKEN or GH_TOKEN raises the rate limit; without one
the anonymous limit of 60 requests an hour still covers a build) and the footer says when. The
GitHub Actions workflow in .github/workflows/site.yml runs this daily and on every push to main.
Only the standard library is needed.
"""
import datetime, html, json, os, shutil, sys, time, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "dist")
REPO = "https://github.com/OmniJev/awesome-jev-gallery"
SITE = "https://omnijev.github.io/awesome-jev-gallery/"
TAGLINE = "Papers, open models and evaluations behind System One models and Jev."
FONTS = ("https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700"
         "&family=Chakra+Petch:wght@500;600;700&display=swap")
BRAND = ('<svg width="18" height="18" viewBox="0 0 32 32" aria-hidden="true">'
         '<rect x="1.5" y="1.5" width="29" height="29" rx="7" fill="#2F80ED"/>'
         '<path d="M17.8 5.5 9.5 18h6l-1.3 8.5L22.5 14h-6z" fill="#fff"/></svg>')
I_GH = ('<svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">'
        '<path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-'
        '.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.'
        '63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.'
        '64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27'
        ' 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27'
        '.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15'
        '.46.55.38A8.012 8.012 0 0 0 16 8c0-4.42-3.58-8-8-8z"/></svg>')
I_MOON = ('<svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" '
          'stroke-width="1.4" stroke-linejoin="round" aria-hidden="true">'
          '<path d="M13.5 9.6A6 6 0 0 1 6.4 2.5a6 6 0 1 0 7.1 7.1Z"/></svg>')


def esc(s):
    return html.escape(s or "", quote=True)


def live_stars(repos, max_age=3600):
    """Star counts from the GitHub API, cached for an hour in stars.json next to this file."""
    path = os.path.join(HERE, "stars.json")
    cache = json.load(open(path)) if os.path.exists(path) else {}
    tok = os.environ.get("GH_TOKEN") or os.environ.get("GITHUB_TOKEN") or ""
    now = time.time()
    out, fetched = {}, 0
    for repo in repos:
        c = cache.get(repo)
        if c and now - c["t"] < max_age:
            out[repo] = c["stars"]
            continue
        try:
            req = urllib.request.Request(f"https://api.github.com/repos/{repo}", headers={
                "Accept": "application/vnd.github+json", "User-Agent": "awesome-jev-gallery",
                **({"Authorization": "Bearer " + tok} if tok else {})})
            r = json.load(urllib.request.urlopen(req, timeout=30))
            out[repo] = r["stargazers_count"]
            cache[repo] = {"stars": r["stargazers_count"], "t": now}
            fetched += 1
        except Exception as ex:
            print(f"  stars {repo}: {ex}")
            out[repo] = c["stars"] if c else None
    json.dump(cache, open(path, "w"), indent=1)
    print(f"stars: {fetched} fetched, {len(repos) - fetched} from cache")
    return out


def build():
    entries = json.load(open(os.path.join(HERE, "entries.json"), encoding="utf-8"))
    sections = json.load(open(os.path.join(HERE, "sections.json"), encoding="utf-8"))
    meta = json.load(open(os.path.join(HERE, "meta.json"), encoding="utf-8"))
    fresh = live_stars(sorted({e["repo"] for e in entries if e.get("repo")}))
    for e in entries:
        if e.get("repo") and fresh.get(e["repo"]) is not None:
            e["stars"] = fresh[e["repo"]]
    counts = {}
    for e in entries:
        counts[e["section"]] = counts.get(e["section"], 0) + 1
    for s in sections:
        s["n"] = counts.get(s["key"], 0)
    sections = [s for s in sections if s["n"]]

    if os.path.exists(OUT):
        shutil.rmtree(OUT)
    os.makedirs(os.path.join(OUT, "assets"))
    for d in ("tiles", "avatars"):
        shutil.copytree(os.path.join(HERE, d), os.path.join(OUT, "assets", d))
    for f in ("gallery.css", "gallery.js", "favicon.svg", "og.png"):
        shutil.copy(os.path.join(HERE, f), os.path.join(OUT, "assets", f))
    hues = ("\n:root{" + "".join(f"--s-{s['key']}:{s['hue'][0]};" for s in sections) + "}"
            "\n:root[data-theme=\"dark\"]{" + "".join(f"--s-{s['key']}:{s['hue'][1]};" for s in sections) + "}\n")
    with open(os.path.join(OUT, "assets", "gallery.css"), "a", encoding="utf-8") as f:
        f.write(hues)

    n_readme = meta["readme_entries"]
    built = datetime.datetime.now(datetime.timezone.utc)
    data = {"built": built.isoformat(timespec="minutes"), "sections": sections, "entries": entries}
    pills = ('<button class="pill on" data-sec="">All <span>%d</span></button>' % len(entries)) + "".join(
        f'<button class="pill" data-sec="{s["key"]}" style="--sc:var(--s-{s["key"]})"><i></i>{esc(s["chip"])} <span>{s["n"]}</span></button>'
        for s in sections)
    body = f"""<header>
  <div class="bar">
    <a class="brand" href="{SITE}">{BRAND}Awesome JEV <small id="count"></small></a>
    <input type="search" id="q" placeholder="Search  (press /)" aria-label="Search">
    <div class="grp"><label>Sort</label>
      <select id="sort"><option value="curated">Curated</option><option value="stars">Stars</option><option value="newest">Newest</option><option value="random">Random</option></select>
      <button id="reshuffle" title="Shuffle again" style="display:none">🎲</button>
    </div>
    <div class="grp cols"><label>Per row</label><button id="colDec">−</button><span id="colN">4</span><button id="colInc">+</button></div>
    <div class="spacer"></div>
    <a class="chip" href="{REPO}#readme" target="_blank" rel="noopener">Full list, {n_readme} entries ↗</a>
    <button class="icon" id="theme" type="button" aria-label="Switch colour theme">{I_MOON}</button>
    <a class="icon" href="{REPO}" target="_blank" rel="noopener" aria-label="Repository on GitHub">{I_GH}</a>
  </div>
</header>
<div class="intro"><h1>Awesome JEV</h1><p>{esc(TAGLINE)} Every card opens its source; the full list of {n_readme} entries is in the <a href="{REPO}#readme">README</a>.</p>
<div class="pills" id="pills">{pills}</div></div>
<main><div id="grid"></div><div class="empty" id="empty" hidden>Nothing matches.</div></main>
<footer>{meta["readme_line"]} Curated at <a href="{REPO}">OmniJev/awesome-jev-gallery</a>, CC BY 4.0. Star counts read from GitHub when the page was built, {built:%d %B %Y %H:%M} UTC.</footer>
<script id="data" type="application/json">{json.dumps(data, ensure_ascii=False).replace("</", "<\\/")}</script>"""

    desc = (f"System One models and typed decisions: {n_readme} papers, open-source rebuilds, independent "
            "evaluations and software built on Jev, each card with a picture of what is behind the link.")
    ld = json.dumps({"@context": "https://schema.org", "@type": "CollectionPage", "name": "Awesome JEV",
                     "description": desc, "url": SITE, "isPartOf": {"@type": "WebSite", "name": "Awesome JEV", "url": SITE}})
    page = f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Awesome JEV: System One models and typed decisions</title>
<meta name="description" content="{esc(desc)}">
<link rel="canonical" href="{SITE}">
<meta property="og:type" content="website">
<meta property="og:title" content="Awesome JEV">
<meta property="og:description" content="{esc(desc)}">
<meta property="og:url" content="{SITE}">
<meta property="og:image" content="{SITE}assets/og.png">
<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="{SITE}assets/og.png">
<meta name="theme-color" content="#ffffff">
<link rel="icon" href="assets/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="{FONTS}">
<link rel="stylesheet" href="assets/gallery.css">
<script type="application/ld+json">{ld}</script>
</head>
<body>
{body}
<script src="assets/gallery.js"></script>
</body>
</html>
"""
    open(os.path.join(OUT, "index.html"), "w", encoding="utf-8").write(page)
    open(os.path.join(OUT, ".nojekyll"), "w").write("")
    open(os.path.join(OUT, "robots.txt"), "w").write(f"User-agent: *\nAllow: /\n\nSitemap: {SITE}sitemap.xml\n")
    open(os.path.join(OUT, "sitemap.xml"), "w").write(
        '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        f'  <url><loc>{SITE}</loc><lastmod>{built:%Y-%m-%d}</lastmod><changefreq>daily</changefreq><priority>1.0</priority></url>\n'
        "</urlset>\n")
    print(f"{OUT}/index.html: {len(entries)} cards, {len(sections)} sections")


if __name__ == "__main__":
    build()
