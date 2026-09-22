#!/usr/bin/env python3
"""Check the URLs in the README actually resolve.

Usage:  python3 scripts/check_links.py [README.md ...]
        python3 scripts/check_links.py --added origin/main README.md

Exit code 1 only when a server answers that the page is gone (404 or 410).
A host that refuses the request, rate limits it or drops the connection is
reported as unchecked, because that is what it is: from a data centre IP half
the web says no to a script. Those lines are printed so a human can glance at
them, and they do not fail the run. shields.io badge images are skipped.

--added <ref> narrows the run to the URLs a branch introduces, which is what a
pull request needs: adding one entry should not re-probe two hundred URLs.
"""
import concurrent.futures as cf
import re
import subprocess
import sys
import threading
import time
import urllib.error
import urllib.request

SKIP_HOSTS = ("img.shields.io", "awesome.re", "api.star-history.com", "contrib.rocks")
# Hosts already known to refuse automated requests. The URLs are real; the site
# answers 403/405 to anything that is not a browser. Listing one here only
# changes how its line reads; no host can fail the run on a refusal.
BOT_BLOCKED = (
    "openai.com", "openalex.org", "materialsproject.org", "encodeproject.org",
    "earthdata.nasa.gov", "data.gesis.org", "ai.nejm.org", "icpsr.umich.edu",
    "ai.meta.com", "opentrons.com", "nearhere.events", "openai.com", "datacamp.com",
)

# documentation placeholders, not real targets
SKIP_SUBSTRINGS = ("OWNER/REPO", "example.com", "example.org", "PAPER_OR_PREPRINT_URL", "OFFICIAL_")
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
URL_RE = re.compile(r'https?://[^\s\)\]\}"\'<>]+')

# GitHub answers 404 to anonymous /stargazers; probe the repo root instead.
NORMALIZE = ((("/stargazers"), ""), (("/network/members"), ""))


def normalize(url):
    for suffix, repl in NORMALIZE:
        if url.endswith(suffix):
            return url[: -len(suffix)] + repl
    return url


# These hosts answer 200 to a single request and 429 to a burst. Give each one
# its own lock so requests to it are paced and serialized, while other hosts
# keep running in parallel.
THROTTLED = ("huggingface.co", "news.ycombinator.com")
_LOCKS = {h: threading.Lock() for h in THROTTLED}
_DELAY = 2.0
_RETRY_429 = 3


def probe(url):
    clean = normalize(url.rstrip('.,;:'))
    host = next((h for h in THROTTLED if h in clean), None)
    if host:
        with _LOCKS[host]:
            for attempt in range(_RETRY_429):
                time.sleep(_DELAY * (attempt + 1))
                result = _probe(clean)
                if result[1] != 429:
                    return result
            return result
    return _probe(clean)


def _doi_registered(clean):
    """doi.org blocks bots; ask the DOI registries whether the DOI is real.

    Crossref covers journal articles, DataCite covers Zenodo, figshare and
    other data/software DOIs.
    """
    doi = clean.split("doi.org/", 1)[1]
    for api in ("https://api.crossref.org/works/" + doi,
                "https://api.datacite.org/dois/" + doi):
        req = urllib.request.Request(api, headers={"User-Agent": UA})
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                if r.status == 200:
                    return True
        except Exception:
            continue
    return False


def _probe(clean):
    for method in ("HEAD", "GET"):
        req = urllib.request.Request(clean, method=method, headers={"User-Agent": UA})
        try:
            with urllib.request.urlopen(req, timeout=25) as r:
                return clean, r.status, ""
        except urllib.error.HTTPError as e:
            if e.code in (403, 405, 429) and method == "HEAD":
                continue
            if method == "GET":
                if e.code in (403, 429) and "doi.org/" in clean and _doi_registered(clean):
                    return clean, 200, "verified via DOI registry"
                return clean, e.code, e.reason
        except Exception as e:
            if method == "GET":
                return clean, 0, type(e).__name__ + ": " + str(e)[:80]
    return clean, 0, "unreachable"


# A server that answers 404 or 410 has told us the page is gone. Everything
# else, a refusal, a rate limit, a dropped connection, a DNS hiccup, means the
# check did not get an answer, which is not the same as a dead link.
GONE = (404, 410)


def wanted(url):
    return not (any(h in url for h in SKIP_HOSTS) or any(x in url for x in SKIP_SUBSTRINGS))


def urls_in(paths):
    urls = []
    for p in paths:
        with open(p, encoding="utf-8") as fh:
            for u in URL_RE.findall(fh.read()):
                u = u.rstrip('.,;:')
                if wanted(u) and u not in urls:
                    urls.append(u)
    return urls


def urls_added(ref, paths):
    """The URLs this branch introduces, read from the diff against ref."""
    try:
        diff = subprocess.run(["git", "diff", "--unified=0", f"{ref}...HEAD", "--", *paths],
                              capture_output=True, text=True, check=True).stdout
    except (subprocess.CalledProcessError, FileNotFoundError) as e:
        print(f"cannot diff against {ref} ({e}); checking every url instead\n", flush=True)
        return urls_in(paths)
    out = []
    for line in diff.splitlines():
        if line.startswith("+") and not line.startswith("+++"):
            for u in URL_RE.findall(line):
                u = u.rstrip('.,;:')
                if wanted(u) and u not in out:
                    out.append(u)
    return out


def main(argv):
    ref = None
    if argv and argv[0] == "--added":
        ref, argv = argv[1], argv[2:]
    paths = argv or ["README.md"]
    urls = urls_added(ref, paths) if ref else urls_in(paths)
    if ref:
        print(f"checking the {len(urls)} urls this branch adds, against {ref}\n", flush=True)
        if not urls:
            print("no new urls")
            return 0
    else:
        print(f"checking {len(urls)} unique urls\n", flush=True)

    gone, unchecked = [], []
    done = 0
    with cf.ThreadPoolExecutor(max_workers=12) as ex:
        for url, code, msg in ex.map(probe, urls):
            done += 1
            ok = 200 <= code < 400
            if ok:
                mark = "ok "
            elif code in GONE:
                mark = "GONE"
                gone.append((url, code, msg))
            else:
                mark = "??? "
                known = any(h in url for h in BOT_BLOCKED)
                unchecked.append((url, code, "refuses scripts" if known else msg))
            print(f"[{done:>3}/{len(urls)}] {mark} {code:>3}  {url}", flush=True)

    print("\n" + "=" * 70)
    if unchecked:
        print(f"{len(unchecked)} not checked from here (refused, rate limited or unreachable);")
        print("the URL may well be fine, open it in a browser if it matters:")
        for url, code, msg in unchecked:
            print(f"  {code:>3}  {url}  {msg}")
        print()
    if gone:
        print(f"{len(gone)} DEAD LINKS, the server says the page is gone:")
        for url, code, msg in gone:
            print(f"  {code:>3}  {url}  {msg}")
        return 1
    print("no dead links")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
