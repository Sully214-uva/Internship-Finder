"""
notify.py — email you when new matching postings appear.

Uses Gmail SMTP with an "App Password" (a 16-char password you generate once;
see SETUP.md). Reads credentials from environment variables so no secret is
ever written into the code or the repo:

    GMAIL_ADDRESS       the Gmail you send FROM (and, by default, TO)
    GMAIL_APP_PASSWORD  the 16-char app password (NOT your normal password)
    NOTIFY_TO           optional; comma-separated recipients (defaults to GMAIL_ADDRESS)

If credentials are missing, this no-ops with a log line — the feed still builds.
"""

import os
import smtplib
import sys
from email.message import EmailMessage


def _log(msg):
    print(msg, file=sys.stderr)


def send_new_postings(new_items, site_url=""):
    """Email a digest of newly-found postings. `new_items` are feed entries."""
    if not new_items:
        _log("  [notify] no new postings; no email sent.")
        return

    sender = os.environ.get("GMAIL_ADDRESS")
    app_pw = os.environ.get("GMAIL_APP_PASSWORD")
    if not (sender and app_pw):
        _log("  [notify] skipped — GMAIL_ADDRESS / GMAIL_APP_PASSWORD not set.")
        return
    recipients = [r.strip() for r in
                  os.environ.get("NOTIFY_TO", sender).split(",") if r.strip()]

    # Sort best matches first.
    items = sorted(new_items, key=lambda x: x.get("relevance_score", 0), reverse=True)

    # Plain-text body.
    lines = [f"{len(items)} new internship match(es) found:\n"]
    for it in items:
        lines.append(f"• [{it.get('fit_tier','?').upper()} · "
                     f"score {it.get('relevance_score','?')}] {it['title']}")
        lines.append(f"  {it['org']} — {it.get('location','')}".rstrip(" —"))
        lines.append(f"  Fit: {it.get('fit_with_plans','')}")
        lines.append(f"  Apply: {it['url']}\n")
    if site_url:
        lines.append(f"Full feed: {site_url}")
    text_body = "\n".join(lines)

    # Simple HTML body.
    rows = ""
    for it in items:
        rows += (
            f"<li style='margin-bottom:12px'>"
            f"<b>{it['title']}</b> "
            f"<span style='color:#888'>[{it.get('fit_tier','?')} · {it.get('relevance_score','?')}]</span><br>"
            f"<span style='color:#555'>{it['org']} — {it.get('location','')}</span><br>"
            f"<i>{it.get('fit_with_plans','')}</i><br>"
            f"<a href='{it['url']}'>Open posting →</a></li>"
        )
    link = f"<p><a href='{site_url}'>Open the full feed</a></p>" if site_url else ""
    html_body = f"<h3>{len(items)} new internship match(es)</h3><ul>{rows}</ul>{link}"

    msg = EmailMessage()
    msg["Subject"] = f"[Internship Finder] {len(items)} new match(es)"
    msg["From"] = sender
    msg["To"] = ", ".join(recipients)
    msg.set_content(text_body)
    msg.add_alternative(html_body, subtype="html")

    try:
        with smtplib.SMTP("smtp.gmail.com", 587) as smtp:
            smtp.starttls()
            smtp.login(sender, app_pw)
            smtp.send_message(msg)
        _log(f"  [notify] emailed {len(items)} new posting(s) to {recipients}.")
    except Exception as e:
        _log(f"  [notify] email failed: {e}")
