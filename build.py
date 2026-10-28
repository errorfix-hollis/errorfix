#!/usr/bin/env python3
"""Static site generator for errorfix."""
import os, re, json, shutil, html, datetime, glob
import markdown, yaml

BASE = os.environ.get("BASE_URL", "https://errorfix.surge.sh")
SITE = "errorfix"
ROOT = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(ROOT, "public")
CATS = {
 "git": "Git", "npm": "npm & Node.js", "python": "Python", "docker": "Docker",
 "ssh": "SSH", "linux": "Linux & shell", "javascript": "JavaScript", "java": "Java",
 "database": "Databases", "web": "Web & HTTP", "rust": "Rust", "go": "Go", "kubernetes": "Kubernetes",
}
ANALYTICS = os.environ.get("CF_BEACON", "")

def esc(s): return html.escape(s, quote=True)

def layout(title, desc, body, path, extra_head=""):
    canon = BASE + path
    beacon = (f'<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon=\'{{"token": "{ANALYTICS}"}}\'></script>' if ANALYTICS else "")
    beacon += '<script data-goatcounter="https://errorfix.goatcounter.com/count" async src="//gc.zgo.at/count.js"></script>
    nav = "".join(f'<a href="/{k}/">{esc(v)}</a>' for k, v in CATS.items() if k in USED)
    return f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{esc(title)}</title>
<meta name="description" content="{esc(desc)}">
<link rel="canonical" href="{canon}">
<meta property="og:title" content="{esc(title)}"><meta property="og:description" content="{esc(desc)}">
<meta property="og:url" content="{canon}"><meta property="og:type" content="article"><meta property="og:site_name" content="{SITE}">
<link rel="stylesheet" href="/style.css"><link rel="icon" href="/favicon.svg" type="image/svg+xml">
{extra_head}</head><body>
<header><div class="wrap"><a class="logo" href="/">error<b>fix</b></a>
<form class="search" action="/search/" role="search"><input name="q" type="search" placeholder="Paste an error message…" aria-label="Search errors"></form></div>
<nav class="wrap cats">{nav}</nav></header>
<main class="wrap">{body}</main>
<footer><div class="wrap"><p>errorfix — plain fixes for confusing error messages. No ads, no tracking cookies. <a href="/about/">About</a> · <a href="/all/">All errors</a></p></div></footer>
<script src="/app.js" defer></script>{beacon}
</body></html>"""

def load():
    pages = []
    for f in sorted(glob.glob(os.path.join(ROOT, "content", "*.md"))):
        raw = open(f, encoding="utf-8").read()
        mm = re.match(r"^---\n(.*?)\n---\n(.*)$", raw, re.S)
        if not mm: raise SystemExit(f"bad front matter: {f}")
        fm, body = mm.group(1), mm.group(2)
        meta = yaml.safe_load(fm)
        for k in ("error", "cat", "description", "tldr"):
            if k not in meta: raise SystemExit(f"{f}: missing {k}")
        meta["slug"] = os.path.basename(f)[:-3]
        meta["body"] = body.strip()
        meta.setdefault("updated", datetime.date.fromtimestamp(os.path.getmtime(f)).isoformat())
        pages.append(meta)
    return pages

def render_md(text):
    return markdown.markdown(text, extensions=["fenced_code", "tables", "toc", "sane_lists"])

def main():
    global USED
    pages = load()
    USED = {p["cat"] for p in pages}
    if os.path.exists(OUT): shutil.rmtree(OUT)
    shutil.copytree(os.path.join(ROOT, "static"), OUT)
    bycat = {}
    for p in pages: bycat.setdefault(p["cat"], []).append(p)
    urls = [("/", None)]
    for p in pages:
        path = f"/{p['cat']}/{p['slug']}/"
        p["path"] = path
    for p in pages:
        path = p["path"]
        catname = CATS[p["cat"]]
        rel = [q for q in bycat[p["cat"]] if q is not p]
        if p.get("related"):
            pr = [q for q in pages if q["slug"] in p["related"]]
            rel = pr + [q for q in rel if q not in pr]
        rel = rel[:6]
        relhtml = "".join(f'<li><a href="{q["path"]}">{esc(q["error"])}</a></li>' for q in rel)
        ttl = p.get("title") or f'{p["error"]} — how to fix'
        ld = {"@context": "https://schema.org", "@type": "TechArticle", "headline": ttl,
              "description": p["description"], "dateModified": p["updated"], "url": BASE + path,
              "author": {"@type": "Organization", "name": SITE}}
        crumbs = {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": SITE, "item": BASE + "/"},
            {"@type": "ListItem", "position": 2, "name": catname, "item": f"{BASE}/{p['cat']}/"},
            {"@type": "ListItem", "position": 3, "name": p["error"], "item": BASE + path}]}
        head = f'<script type="application/ld+json">{json.dumps(ld)}</script><script type="application/ld+json">{json.dumps(crumbs)}</script>'
        body = f"""<p class="crumbs"><a href="/">Home</a> › <a href="/{p['cat']}/">{esc(catname)}</a></p>
<article><h1>{esc(p.get('h1') or ttl)}</h1>
<pre class="err"><code>{esc(p['error_full'] if p.get('error_full') else p['error'])}</code></pre>
<p class="tldr"><strong>Quick fix:</strong> {render_md(p['tldr'])[3:-4]}</p>
{render_md(p['body'])}
<p class="upd">Last updated {p['updated']}.</p></article>
<aside><h2>Related errors</h2><ul class="list">{relhtml}</ul></aside>"""
        write(path, layout(ttl, p["description"], body, path, head))
        urls.append((path, p["updated"]))
    for c, items in bycat.items():
        items.sort(key=lambda q: q["error"].lower())
        li = "".join(f'<li><a href="{q["path"]}">{esc(q["error"])}</a><span>{esc(q["description"])}</span></li>' for q in items)
        path = f"/{c}/"
        write(path, layout(f"{CATS[c]} errors and how to fix them — {SITE}", f"Fixes for common {CATS[c]} error messages, explained in plain language with copy-paste commands.",
            f"<h1>{esc(CATS[c])} errors</h1><ul class='list big'>{li}</ul>", path))
        urls.append((path, None))
    allli = "".join(f'<li><a href="{q["path"]}">{esc(q["error"])}</a> <small>{esc(CATS[q["cat"]])}</small></li>' for q in sorted(pages, key=lambda q: q["error"].lower()))
    write("/all/", layout(f"All error messages — {SITE}", "Every error message covered on errorfix, A to Z.", f"<h1>All errors ({len(pages)})</h1><ul class='list'>{allli}</ul>", "/all/"))
    urls.append(("/all/", None))
    recent = sorted(pages, key=lambda q: q["updated"], reverse=True)[:12]
    catcards = "".join(f'<a class="card" href="/{c}/"><b>{esc(CATS[c])}</b><span>{len(bycat[c])} errors</span></a>' for c in CATS if c in bycat)
    rec = "".join(f'<li><a href="{q["path"]}">{esc(q["error"])}</a></li>' for q in recent)
    home = f"""<section class="hero"><h1>Fix that error message.</h1>
<p>Short, tested explanations of confusing errors from Git, npm, Python, Docker, SSH, Linux and more. What it means, why it happens, and the exact commands that fix it.</p>
<form action="/search/"><input name="q" type="search" placeholder="e.g. permission denied (publickey)" autofocus><button>Search</button></form></section>
<div class="cards">{catcards}</div><h2>Recently updated</h2><ul class="list">{rec}</ul>"""
    write("/", layout(f"{SITE} — plain-English fixes for developer error messages", "Clear fixes for common developer error messages from Git, npm, Python, Docker, SSH and Linux, with copy-paste commands.", home, "/"))
    write("/search/", layout(f"Search — {SITE}", "Search error messages.", '<h1>Search</h1><div id="results"><noscript>Search needs JavaScript. Browse <a href="/all/">all errors</a>.</noscript></div>', "/search/"))
    about = render_md(open(os.path.join(ROOT, "about.md")).read())
    write("/about/", layout(f"About — {SITE}", "About errorfix.", about, "/about/")); urls.append(("/about/", None))
    idx = [{"e": p["error"], "d": p["description"], "u": p["path"], "k": p.get("keywords", "")} for p in pages]
    json.dump(idx, open(os.path.join(OUT, "index.json"), "w"))
    today = datetime.date.today().isoformat()
    sm = "".join(f"<url><loc>{BASE}{u}</loc><lastmod>{d or today}</lastmod></url>" for u, d in urls)
    open(os.path.join(OUT, "sitemap.xml"), "w").write(f'<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">{sm}</urlset>')
    open(os.path.join(OUT, "robots.txt"), "w").write(f"User-agent: *\nAllow: /\nSitemap: {BASE}/sitemap.xml\n")
    write404()
    print(f"built {len(pages)} pages, {len(urls)} urls")

def write404():
    open(os.path.join(OUT, "404.html"), "w").write(layout(f"Not found — {SITE}", "Page not found.", '<h1>Page not found</h1><p>Try the search above or browse <a href="/all/">all errors</a>.</p>', "/404"))

def write(path, content):
    d = os.path.join(OUT, path.strip("/"))
    os.makedirs(d, exist_ok=True)
    open(os.path.join(d, "index.html"), "w", encoding="utf-8").write(content)

USED = set()
if __name__ == "__main__": main()
