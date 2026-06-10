# Setup — the free live monitoring system

This turns your local tracker into a **live, always-updating** system: a free
scheduled job scrapes sources, Claude AI matches + analyzes new postings against
your profile, the website's **Live Feed** tab shows them, and you get **email
alerts** — all running on GitHub for **$0/month** (you only pay pennies for the
Claude API calls).

You don't need to code anything. Follow the steps in order.

---

## What you'll set up

| Piece | Free? | What you need |
|---|---|---|
| Scheduler + hosting (GitHub Actions + Pages) | ✅ Free | A free GitHub account |
| Federal postings (USAJOBS API) | ✅ Free | A free USAJOBS API key (email signup) |
| AI matching + analysis (Claude) | 💰 ~pennies/run | An Anthropic API key |
| Email alerts (Gmail) | ✅ Free | A Gmail App Password |

---

## Step 0 — Preview it locally first (no accounts needed)

```bash
pip install -r scraper/requirements.txt
python scraper/build_feed.py --sample      # writes a 2-item demo feed
```
Then open the site (via a local server, e.g. `python -m http.server`) and click
the **Live Feed** tab. You'll see how matched postings look. Now wire it up for real:

---

## Step 1 — Get your API keys (≈10 min)

**A. USAJOBS API key (free).**
1. Go to <https://developer.usajobs.gov/apirequest/> and request a key (instant, by email).
2. You'll get an **API key**; your **email** is also part of the credentials.

**B. Anthropic API key (Claude).**
1. Sign in at <https://console.anthropic.com> → **API Keys** → create a key.
2. Add a small amount of credit (a few dollars covers months at low volume).
   *Cost lever:* set the `MODEL` secret to `claude-haiku-4-5` to cut cost ~5×.

**C. Gmail App Password (free).**
1. Your Google account needs 2-Step Verification on.
2. Go to <https://myaccount.google.com/apppasswords>, create a password named
   "Internship Finder". You'll get a **16-character** password — copy it.
   (This is NOT your normal Gmail password; it's a one-purpose token.)

---

## Step 2 — Put the project on GitHub (≈5 min)

1. Create a free account at <https://github.com> if you don't have one.
2. Create a **new repository** (e.g. `internship-finder`). Public is fine and
   keeps GitHub Pages free.
3. Upload this project's files to it (drag-and-drop in the GitHub web UI works,
   or use `git`). Keep the folder structure intact.

---

## Step 3 — Add your secrets (≈5 min)

In your repo: **Settings → Secrets and variables → Actions → New repository secret.**
Add each of these (name on the left, your value on the right):

| Secret name | Value |
|---|---|
| `ANTHROPIC_API_KEY` | your Claude key from Step 1B |
| `USAJOBS_API_KEY` | your USAJOBS key from Step 1A |
| `USAJOBS_EMAIL` | the email you registered with USAJOBS |
| `GMAIL_ADDRESS` | your Gmail address |
| `GMAIL_APP_PASSWORD` | the 16-char app password from Step 1C |
| `NOTIFY_TO` *(optional)* | where to send alerts (defaults to `GMAIL_ADDRESS`) |
| `MODEL` *(optional)* | `claude-haiku-4-5` to save money (default `claude-opus-4-8`) |
| `SITE_URL` *(optional)* | your Pages URL, so emails can link to the feed |

Secrets are encrypted and never visible in the code or logs.

---

## Step 4 — Turn on the website (GitHub Pages) (≈2 min)

**Settings → Pages → Build and deployment → Source: "Deploy from a branch" →
Branch: `main` → Folder: `/ (root)` → Save.**

After a minute your site is live at
`https://<your-username>.github.io/<repo-name>/`.
(Put that URL in the `SITE_URL` secret so email alerts can link back to it.)

---

## Step 5 — Run it (≈3 min)

**Settings isn't enough — kick off the first run:**
**Actions tab → "Update internship feed" → Run workflow.**

Watch it run. When it finishes it will have:
- written `data/feed.json` (visible on your site's **Live Feed** tab),
- emailed you any new matches.

After this, it runs **automatically every day** (see the `cron:` line in
`.github/workflows/update.yml` — edit to change the time/frequency).

---

## Tuning it

- **What it looks for:** edit `scraper/config/profile.yaml` (your interests,
  keywords, and the `relevance_threshold`). This is what the AI matches against.
- **Where it looks:** edit `scraper/config/sources.yaml` (USAJOBS queries, RSS
  feeds, web pages). Add real think-tank/Congress career pages as you find them.
- **How often:** change the `cron` schedule in the workflow file.
- **Spend:** lower cost with `MODEL=claude-haiku-4-5`; raise the
  `relevance_threshold` to analyze/keep fewer postings.

## How the pieces fit

```
 cron (daily)                                   you
     │                                           │
     ▼                                           ▼
 GitHub Actions ──► fetch sources ──► Claude AI match+analyze
     │                                           │
     ├──► writes data/feed.json ──► GitHub Pages ──► "Live Feed" tab ──► Add to your tracker
     └──► emails new matches (Gmail) ───────────────────────────────────► your inbox
```

Honest caveats: **USAJOBS (federal)** coverage is reliable; **Congress, think
tanks, and startups** have no standard API, so those are best-effort page
scrapes — treat them as leads. Add good sources to `sources.yaml` over time.
