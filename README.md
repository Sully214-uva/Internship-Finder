# Internship Finder — personal application tracker

A small, local single-page app that tracks your target internships, their
deadlines, your application status, and the documents each one needs.
Tailored to a foreign-&-defense-policy + tech-in-governance + materials-science
trajectory (rising sophomore, UVA Foreign Affairs BA → Batten MPP).

## How to open it

**Double-click `index.html`.** It opens in your default browser. That's it —
no install, no server, no internet required.

Your data is saved automatically *inside the browser* (a feature called
`localStorage`). Close the tab, reopen later, your statuses and notes are still
there.

> ⚠️ Because the data lives in the browser, two things to know:
> 1. Use the same browser each time (data isn't shared between, say, Chrome and Safari).
> 2. Clearing your browser's site data would erase it — so use **Export** now and
>    then to save a `internship-finder-backup.json` file you can re-**Import** anytime.

## What each tab does

- **Dashboard** — your at-a-glance home. Stat tiles (how many tracked / in
  progress / submitted / not started) and a *reminders* list of the soonest
  upcoming openings and deadlines, color-coded by urgency (red ≤14 days,
  amber ≤45 days). Rolling opportunities get their own note.
- **Opportunities** — every internship as a card, grouped by **fit tier**
  (Top → Strong → Stretch → Fallback). Click any card to open its editor.
- **Timeline** — a month-by-month grid (Aug 2026 → May 2027) showing when each
  application window is open, with the closing month highlighted and a marker on
  the current month.
- **Documents** — a checklist matrix: opportunities down the side, materials
  across the top. ✅ ready · ⬜️ to do · — not required.

## Editing an opportunity

Click any card (or a name in the Timeline/Documents). The pop-up lets you set:
**status**, **deadline**, **window-opens date**, **date applied**, tick off
**documents**, and jot **notes**. There's also an **Open application ↗** button
that jumps to the real application page. Click **Save**.

## The files (and why it's split this way)

| File | Role | Analogy |
|------|------|---------|
| `index.html` | the **structure** (skeleton) | the nouns |
| `styles.css` | the **look** (colors, spacing) | the adjectives |
| `app.js`     | the **behavior** (all logic + data) | the verbs |

Splitting structure / style / behavior is called **separation of concerns**.
Each file does one job, so when you want to change a color you go to one place,
and when you want to change logic you go to another.

### How `app.js` is organized (read top to bottom)

1. **Seed data** — the starting opportunity list.
2. **Constants** — fixed lists (statuses, tiers, the timeline months).
3. **Persistence** — `loadData()` / `saveData()` talk to `localStorage`.
4. **State** — the data the app holds while running.
5. **Date helpers** — small functions like `daysUntil()`.
6. **Rendering** — one function per tab; each builds an HTML string.
7. **Modal editor** — the pop-up form.
8. **Toolbar** — Export / Import / Reset.
9. **Init** — wires up clicks and draws the first screen.

### JavaScript ↔ Python cheat-sheet (for CS 1110)

| JavaScript | Python |
|---|---|
| `const x = 5` / `let x = 5` | `x = 5` |
| `[1, 2, 3]` (array) | `[1, 2, 3]` (list) |
| `{ name: "DOE" }` (object) | `{ "name": "DOE" }` (dict) |
| `function f(a) { ... }` | `def f(a): ...` |
| `arr.map(x => x * 2)` | `[x * 2 for x in arr]` |
| `arr.filter(x => x > 0)` | `[x for x in arr if x > 0]` |
| `if (a) { } else { }` | `if a: \n else:` |

## Changing the data

- **Add or edit opportunities permanently:** edit the `SEED_OPPORTUNITIES`
  list near the top of `app.js`, then click **Reset** (this reloads the seed).
  Resetting erases your tracked statuses, so **Export a backup first** if you
  want to keep them.
- **Just tracking your progress?** Use the in-app editor — no code needed.

## Seeded opportunities

DOE Scholars · State Dept OES internship · Senate Foreign Relations Committee ·
CSIS · CNAS · Sen. Cornyn office · Sen. Cruz office · NIST SURF · UVA materials
lab RA. Application windows are **typical/approximate** — confirm exact dates on
each program's site (use the **Open application ↗** button) and update them in
the editor.
