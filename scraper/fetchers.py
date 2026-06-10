"""
fetchers.py — pull raw postings from the web.

Each function returns a list of "raw posting" dicts with a common shape so the
rest of the pipeline doesn't care where a posting came from:

    {
        "id":       stable unique string (used to detect new vs. seen),
        "title":    job title,
        "org":      organization / agency,
        "location": location text (may be ""),
        "url":      where to apply / read more,
        "summary":  a paragraph of description (may be ""),
        "source":   the human-readable source name from sources.yaml,
    }

Network failures never crash the run — a failed source logs a warning and
returns []. That way one dead URL can't stop the whole feed from building.
"""

import html
import re
import sys

import requests

# A short, honest User-Agent. USAJOBS asks for your email here.
DEFAULT_UA = "InternshipFinder/1.0"


def _log(msg):
    """Print to stderr so it shows up in GitHub Actions logs."""
    print(msg, file=sys.stderr)


# ===================================================================
# USAJOBS — the official federal jobs API.
# Docs: https://developer.usajobs.gov/  (free API key by email signup)
# Auth headers required: Host, User-Agent (your email), Authorization-Key.
# ===================================================================
def fetch_usajobs(query, email, api_key):
    if not (email and api_key):
        _log("  [usajobs] skipped — no USAJOBS_EMAIL / USAJOBS_API_KEY set.")
        return []

    headers = {
        "Host": "data.usajobs.gov",
        "User-Agent": email,          # USAJOBS uses your email as the UA
        "Authorization-Key": api_key,
    }
    params = {
        "Keyword": query.get("keyword", ""),
        "ResultsPerPage": query.get("results", 25),
    }
    if query.get("hiring_path"):
        params["HiringPath"] = query["hiring_path"]   # e.g. "student"
    if query.get("organization"):
        params["Organization"] = query["organization"]

    try:
        resp = requests.get(
            "https://data.usajobs.gov/api/search",
            headers=headers, params=params, timeout=30,
        )
        resp.raise_for_status()
        items = resp.json()["SearchResult"]["SearchResultItems"]
    except Exception as e:
        _log(f"  [usajobs] '{query.get('name')}' failed: {e}")
        return []

    postings = []
    for item in items:
        d = item["MatchedObjectDescriptor"]
        details = d.get("UserArea", {}).get("Details", {})
        locs = d.get("PositionLocationDisplay") or ", ".join(
            l.get("LocationName", "") for l in d.get("PositionLocation", [])
        )
        postings.append({
            "id": "usajobs:" + str(d.get("PositionID", d.get("PositionURI", ""))),
            "title": d.get("PositionTitle", "Untitled"),
            "org": d.get("OrganizationName", "Federal government"),
            "location": locs or "",
            "url": d.get("PositionURI", ""),
            "summary": (details.get("JobSummary")
                        or d.get("QualificationSummary", "") or "")[:1500],
            "source": query.get("name", "USAJOBS"),
        })
    _log(f"  [usajobs] '{query.get('name')}' → {len(postings)} postings")
    return postings


# ===================================================================
# RSS / Atom — uses feedparser if available, else a tiny regex fallback.
# ===================================================================
def fetch_rss(source):
    url = source["url"]
    try:
        import feedparser  # optional dependency
        feed = feedparser.parse(url)
        postings = []
        for entry in feed.entries:
            summary = html.unescape(re.sub("<[^<]+?>", "", entry.get("summary", "")))
            postings.append({
                "id": "rss:" + (entry.get("id") or entry.get("link", "")),
                "title": entry.get("title", "Untitled"),
                "org": feed.feed.get("title", source["name"]),
                "location": "",
                "url": entry.get("link", ""),
                "summary": summary[:1500],
                "source": source["name"],
            })
        _log(f"  [rss] '{source['name']}' → {len(postings)} entries")
        return postings
    except Exception as e:
        _log(f"  [rss] '{source['name']}' failed: {e}")
        return []


# ===================================================================
# Generic webpage — fetch HTML, keep links that look like internships.
# Best-effort: returns "leads" the AI then judges. Brittle by design.
# ===================================================================
_LINK_RE = re.compile(r'<a\s+[^>]*href=["\']([^"\']+)["\'][^>]*>(.*?)</a>',
                       re.IGNORECASE | re.DOTALL)
_INTERN_WORDS = ("intern", "fellow", "student", "career", "opportunit")


def fetch_webpage(source):
    url = source["url"]
    try:
        resp = requests.get(url, headers={"User-Agent": DEFAULT_UA}, timeout=30)
        resp.raise_for_status()
        html_text = resp.text
    except Exception as e:
        _log(f"  [webpage] '{source['name']}' failed: {e}")
        return []

    postings, seen = [], set()
    for href, inner in _LINK_RE.findall(html_text):
        text = html.unescape(re.sub("<[^<]+?>", "", inner)).strip()
        if not text or len(text) < 4:
            continue
        haystack = (text + " " + href).lower()
        if not any(word in haystack for word in _INTERN_WORDS):
            continue
        # Resolve relative links against the page's origin.
        if href.startswith("/"):
            m = re.match(r"(https?://[^/]+)", url)
            href = (m.group(1) if m else "") + href
        if not href.startswith("http") or href in seen:
            continue
        seen.add(href)
        postings.append({
            "id": "web:" + href,
            "title": text[:140],
            "org": source["name"],
            "location": "",
            "url": href,
            "summary": "",
            "source": source["name"],
        })
    _log(f"  [webpage] '{source['name']}' → {len(postings)} candidate links")
    return postings


# ===================================================================
# Orchestrator — run every source listed in sources.yaml.
# ===================================================================
def fetch_all(sources, usajobs_email, usajobs_key):
    results = []
    for query in sources.get("usajobs", []):
        results += fetch_usajobs(query, usajobs_email, usajobs_key)
    for source in sources.get("rss", []):
        results += fetch_rss(source)
    for source in sources.get("webpage", []):
        results += fetch_webpage(source)

    # De-duplicate by id (the same posting can show up via two sources).
    by_id = {}
    for p in results:
        if p["id"] and p["id"] not in by_id:
            by_id[p["id"]] = p
    return list(by_id.values())
