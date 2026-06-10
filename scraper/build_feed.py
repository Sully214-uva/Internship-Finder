"""
build_feed.py — the pipeline that ties everything together.

Run order:
  1. Load profile.yaml + sources.yaml.
  2. Fetch every source (fetchers.fetch_all) → raw postings.
  3. Load the previous feed (data/feed.json) so we know which postings we've
     ALREADY analyzed — we never pay to re-analyze the same posting.
  4. For each NEW posting, ask Claude to judge it (analyze.analyze_posting).
  5. Keep postings at/above the relevance threshold; write data/feed.json.
  6. Email a digest of the newly-added matches (notify.send_new_postings).

This is what the GitHub Actions cron runs on a schedule, and what writes the
feed.json that the website's "Live" tab reads.

Usage:
  python build_feed.py            # real run (needs API keys; see SETUP.md)
  python build_feed.py --sample   # write 2 fake postings so you can see the UI
                                   # without any API keys or network.
"""

import datetime
import json
import os
import sys
from pathlib import Path

import yaml

import fetchers
import notify

# Paths are relative to the repo root (scraper/ lives one level down).
ROOT = Path(__file__).resolve().parent.parent
SCRAPER = ROOT / "scraper"
DATA = ROOT / "data"
FEED_PATH = DATA / "feed.json"


def load_yaml(path):
    with open(path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def load_existing_feed():
    """Return {id: feed_entry} from the last run, or {} on first run."""
    if FEED_PATH.exists():
        try:
            data = json.loads(FEED_PATH.read_text(encoding="utf-8"))
            return {entry["id"]: entry for entry in data.get("postings", [])}
        except Exception:
            return {}
    return {}


def write_feed(postings):
    """Write data/feed.json, newest/best first."""
    DATA.mkdir(exist_ok=True)
    postings = sorted(postings, key=lambda p: p.get("relevance_score", 0), reverse=True)
    payload = {
        "generated_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "count": len(postings),
        "postings": postings,
    }
    FEED_PATH.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(f"Wrote {len(postings)} postings → {FEED_PATH}")


def sample_run():
    """Write a couple of fake analyzed postings so the UI is viewable offline."""
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    postings = [
        {
            "id": "sample:1", "title": "Science & Technology Policy Intern",
            "org": "U.S. Department of State — OES", "location": "Washington, DC",
            "url": "https://careers.state.gov/", "source": "Sample data",
            "first_seen": now, "relevant": True, "relevance_score": 92,
            "category": "federal", "fit_tier": "top",
            "strengths": ["Science diplomacy at the source",
                          "Federal credential on your exact lane"],
            "weaknesses": ["Clearance lead time pushes the real deadline earlier"],
            "fit_with_plans": "Squarely on your foreign-policy + tech-in-governance track.",
            "difficulty": "Competitive; clearance timeline is the main hurdle.",
            "approach": "Apply the day the window opens; lead with your GPA and a STEM-policy writing sample.",
        },
        {
            "id": "sample:2", "title": "Defense Acquisition Research Intern",
            "org": "Center for a New American Security", "location": "Washington, DC",
            "url": "https://www.cnas.org/careers", "source": "Sample data",
            "first_seen": now, "relevant": True, "relevance_score": 81,
            "category": "think tank", "fit_tier": "strong",
            "strengths": ["Defense-procurement focus matches your interest",
                          "Strong writing portfolio builder"],
            "weaknesses": ["Rolling apps mean you must move early"],
            "fit_with_plans": "Builds the defense-policy side of your goal and a think-tank network.",
            "difficulty": "Moderately competitive; rolling basis rewards early applicants.",
            "approach": "Submit a sharp writing sample on defense tech now; don't wait for a deadline.",
        },
    ]
    write_feed(postings)
    print("Sample feed written. Open the website's Live tab to view it.")


def main():
    if "--sample" in sys.argv:
        sample_run()
        return

    profile = load_yaml(SCRAPER / "config" / "profile.yaml")
    sources = load_yaml(SCRAPER / "config" / "sources.yaml")
    threshold = profile.get("relevance_threshold", 55)

    # --- 1-2. Fetch everything ---
    print("Fetching sources…")
    # .strip() guards against a stray space/newline picked up when pasting the
    # value into a GitHub secret — those make API headers illegal and surface as
    # confusing "Connection error" failures.
    raw = fetchers.fetch_all(
        sources,
        usajobs_email=(os.environ.get("USAJOBS_EMAIL") or "").strip(),
        usajobs_key=(os.environ.get("USAJOBS_API_KEY") or "").strip(),
    )
    print(f"Fetched {len(raw)} unique postings.")

    # --- 3. What did we already analyze? ---
    existing = load_existing_feed()

    # --- 4. Analyze only the new ones (lazy import so --sample needs no SDK) ---
    import anthropic
    import analyze
    api_key = (os.environ.get("ANTHROPIC_API_KEY") or "").strip()
    if not api_key:
        print("ERROR: ANTHROPIC_API_KEY not set — cannot run AI matching.\n"
              "       (Use `python build_feed.py --sample` to preview the UI.)")
        sys.exit(1)
    client = anthropic.Anthropic(api_key=api_key)
    model = (os.environ.get("MODEL") or "claude-opus-4-8").strip()
    print(f"anthropic SDK {getattr(anthropic, '__version__', '?')} · model {model} · "
          f"key length {len(api_key)}")

    feed, new_items = [], []
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()

    # Cost guardrail: analyze at most MAX_NEW brand-new postings per run. Any
    # extras wait for the next run. (Already-analyzed postings are free to keep.)
    max_new = int(os.environ.get("MAX_NEW") or "50")
    analyzed = 0

    for posting in raw:
        if posting["id"] in existing:
            feed.append(existing[posting["id"]])      # reuse prior analysis (free)
            continue

        if analyzed >= max_new:
            continue   # hit the per-run budget; leave the rest for next time

        analyzed += 1
        result = analyze.analyze_posting(client, model, profile, posting)
        if result is None:
            continue
        if not result.relevant or result.relevance_score < threshold:
            continue   # drop irrelevant / below-threshold postings

        entry = {**posting, "first_seen": now, **result.model_dump()}
        feed.append(entry)
        new_items.append(entry)
        print(f"  + [{result.fit_tier} {result.relevance_score}] {posting['title'][:60]}")

    print(f"Analyzed {analyzed} new posting(s) this run (cap {max_new}).")

    # --- 5. Write the feed ---
    write_feed(feed)

    # --- 6. Email the new matches ---
    notify.send_new_postings(new_items, site_url=os.environ.get("SITE_URL", ""))
    print(f"Done. {len(new_items)} new match(es) this run.")


if __name__ == "__main__":
    main()
