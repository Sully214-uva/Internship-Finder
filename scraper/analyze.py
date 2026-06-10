"""
analyze.py — the AI brain.

Given your profile and one raw posting, ask Claude to judge:
  • is this RELEVANT to you, and how strongly (0-100)?
  • which category and fit tier?
  • STRENGTHS / WEAKNESSES of the opportunity for you
  • how it FITS your plans
  • how HARD it is to get + the APPROACH to take

We use the official Anthropic SDK with `messages.parse()` and a Pydantic model,
so Claude's answer comes back as a validated Python object — no fragile string
parsing. Model defaults to claude-opus-4-8 (most capable); override with the
MODEL env var (e.g. claude-haiku-4-5 to cut cost ~5x).

Cost note: each posting is one short request. At low volume this is pennies.
Already-analyzed postings are cached by build_feed.py and never re-sent.
"""

import os
from typing import List

import anthropic
from pydantic import BaseModel, Field


# ---- The exact shape we want Claude to return ----
class Analysis(BaseModel):
    relevant: bool = Field(description="True if worth showing to this person at all.")
    relevance_score: int = Field(description="0-100; how well it matches their goals.")
    category: str = Field(description="One of: federal, legislative, think tank, research, private.")
    fit_tier: str = Field(description="One of: top, strong, stretch, fallback.")
    strengths: List[str] = Field(description="2-4 concrete strengths of this role FOR THEM.")
    weaknesses: List[str] = Field(description="1-3 honest drawbacks or risks FOR THEM.")
    fit_with_plans: str = Field(description="1-2 sentences: how it fits their stated career plans.")
    difficulty: str = Field(description="1 sentence on how hard it is to land, + why.")
    approach: str = Field(description="1-2 sentences of concrete advice on how to pursue it.")


SYSTEM = """You are a sharp career advisor for a specific undergraduate. \
You will be given the student's profile and a single internship/job posting. \
Judge the posting ONLY for THIS student. Be honest and concrete — no generic \
filler. Enforce eligibility (e.g. don't rate a role they can't hold as relevant). \
Use their fit-tier definitions. If the posting is clearly irrelevant to their \
goals, set relevant=false and a low score; we will drop it."""


def _profile_text(profile: dict) -> str:
    """Flatten the profile dict into a compact prompt block."""
    import yaml
    return yaml.safe_dump(profile, sort_keys=False, allow_unicode=True)


def analyze_posting(client: anthropic.Anthropic, model: str,
                    profile: dict, posting: dict) -> Analysis | None:
    """Return an Analysis for one posting, or None if the AI call fails."""
    user_content = (
        "STUDENT PROFILE:\n"
        f"{_profile_text(profile)}\n\n"
        "POSTING TO JUDGE:\n"
        f"Title: {posting['title']}\n"
        f"Organization: {posting['org']}\n"
        f"Location: {posting.get('location', '')}\n"
        f"Source: {posting.get('source', '')}\n"
        f"Description: {posting.get('summary', '') or '(no description available)'}\n"
    )
    try:
        # messages.parse validates the response against the Analysis schema.
        resp = client.messages.parse(
            model=model,
            max_tokens=1200,
            system=SYSTEM,
            messages=[{"role": "user", "content": user_content}],
            output_format=Analysis,
        )
        return resp.parsed_output
    except Exception as e:
        print(f"  [analyze] failed for {posting['title'][:50]!r}: {e}")
        return None
