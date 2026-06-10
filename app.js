/* =====================================================================
   app.js — ALL of the app's behavior.

   How to read this file (top to bottom):
     1. SEED DATA      — the starting list of opportunities.
     2. CONSTANTS      — fixed reference lists (statuses, tiers, months).
     3. PERSISTENCE    — load/save your data to the browser (localStorage).
     4. STATE          — the data the app holds in memory while running.
     5. DATE HELPERS   — small functions for working with dates.
     6. RENDERING      — functions that build the HTML for each view.
     7. MODAL EDITOR   — the pop-up form for editing one opportunity.
     8. TOOLBAR        — Export / Import / Reset buttons.
     9. INIT           — wiring it all together when the page loads.

   A note on JS-vs-Python for your CS 1110 brain:
     - JS "const/let"      ≈ Python variable assignment.
     - JS array  [ ... ]   ≈ Python list.
     - JS object { k: v }  ≈ Python dict.
     - "function name(){}" ≈ Python "def name():".
     - "arr.map(x => ...)" ≈ Python list comprehension.
   ===================================================================== */


/* =====================================================================
   1. SEED DATA
   ---------------------------------------------------------------------
   This is the starting database. It loads only the first time you open
   the app (after that, your saved data is used instead).

   Each opportunity is an object (a dict). Fields:
     id          unique short name used internally
     name        the internship's title
     organization who runs it
     category    federal | legislative | think tank | research
     fitTier     top | strong | stretch | fallback
     applyUrl    where you apply
     fitNotes    why it fits YOU (shown in the detail panel)
     rolling     true if applications are accepted on a rolling basis
     windowOpen  approx date the application window opens  (YYYY-MM-DD)
     windowClose approx date it closes                     (YYYY-MM-DD)
     documents   the materials this application needs

   Dates are TYPICAL/approximate for the Summer-2027 cycle. Edit any
   opportunity to set exact dates once a program publishes them.
   ===================================================================== */
const SEED_OPPORTUNITIES = [
  {
    id: "doe-scholars",
    name: "DOE Scholars Program",
    organization: "U.S. Dept. of Energy (via ORISE)",
    category: "federal",
    fitTier: "top",
    applyUrl: "https://www.zintellect.com/Opportunity/Details/DOE-Scholars-2024",
    fitNotes: "The cleanest materials-science ↔ policy bridge on your list. Places you inside DOE program offices that fund materials/energy research — exactly your 'materials-science data infrastructure as a policy domain' angle. Federal experience + a foot in the agency that writes the checks for the science you care about.",
    rolling: false,
    windowOpen:  "2026-10-01",
    windowClose: "2026-12-15",
    documents: ["Resume", "Transcript", "Statement of interest", "Recommendation letters"],
  },
  {
    id: "state-oes",
    name: "Student Internship — OES Bureau",
    organization: "U.S. Dept. of State (Oceans, Environment & Science)",
    category: "federal",
    fitTier: "top",
    applyUrl: "https://careers.state.gov/interns-fellows/student-internship-program/",
    fitNotes: "Science & tech diplomacy at the source. OES is where foreign policy meets technical/research issues — squarely your Foreign Affairs + tech-in-governance lane. NOTE: requires a security clearance with a long lead time, so the real deadline is effectively earlier than it looks. Apply as early as the window opens.",
    rolling: false,
    windowOpen:  "2026-08-01",
    windowClose: "2026-09-30",
    documents: ["Resume", "Transcript", "Statement of interest", "References"],
  },
  {
    id: "sfrc",
    name: "Internship — Senate Foreign Relations Committee",
    organization: "U.S. Senate (SFRC)",
    category: "legislative",
    fitTier: "strong",
    applyUrl: "https://www.foreign.senate.gov/about/internships",
    fitNotes: "The premier legislative perch for U.S. foreign policy and exactly the 'legislative / cabinet-advisory' track you're aiming at. Committee (not personal-office) experience signals seriousness. Competitive, so lean on your GPA, a sharp writing sample, and any home-state senator connection.",
    rolling: false,
    windowOpen:  "2026-11-01",
    windowClose: "2027-02-01",
    documents: ["Resume", "Cover letter", "Writing sample", "Transcript", "References"],
  },
  {
    id: "csis",
    name: "Internship — Tech / Security programs",
    organization: "Center for Strategic & International Studies (CSIS)",
    category: "think tank",
    fitTier: "strong",
    applyUrl: "https://www.csis.org/programs/about-us/internships-and-jobs",
    fitNotes: "Think-tank credibility in the tech-and-security space you care about. Rolling applications mean you control timing — apply early. Strong feeder into both policy careers and grad-school networks; pairs well with your Batten MPP trajectory.",
    rolling: true,
    windowOpen:  "2026-12-01",
    windowClose: "2027-03-15",
    documents: ["Resume", "Cover letter", "Writing sample", "Transcript", "References"],
  },
  {
    id: "cnas",
    name: "Internship — Defense programs",
    organization: "Center for a New American Security (CNAS)",
    category: "think tank",
    fitTier: "strong",
    applyUrl: "https://www.cnas.org/careers",
    fitNotes: "The defense-policy counterpart to CSIS, heavy on national security and emerging tech. Rolling, so apply early. Excellent for the defense side of your foreign-and-defense-policy goal and for building a writing portfolio.",
    rolling: true,
    windowOpen:  "2026-12-01",
    windowClose: "2027-03-15",
    documents: ["Resume", "Cover letter", "Writing sample", "References"],
  },
  {
    id: "cornyn",
    name: "DC Office Internship — Sen. Cornyn",
    organization: "Office of Sen. John Cornyn (R-TX)",
    category: "legislative",
    fitTier: "strong",
    applyUrl: "https://www.cornyn.senate.gov/services/internships/",
    fitNotes: "Home-state advantage: Texas constituency makes you a preferred applicant. Direct legislative exposure and a Hill network. Good complement to the committee track — a personal office teaches the constituent-and-floor side of policymaking.",
    rolling: false,
    windowOpen:  "2026-10-01",
    windowClose: "2027-01-31",
    documents: ["Resume", "Cover letter", "References"],
  },
  {
    id: "cruz",
    name: "DC Office Internship — Sen. Cruz",
    organization: "Office of Sen. Ted Cruz (R-TX)",
    category: "legislative",
    fitTier: "strong",
    applyUrl: "https://www.cruz.senate.gov/services/internships",
    fitNotes: "Second home-state Senate option — apply to both Cornyn and Cruz to maximize your odds. Texas tie is your edge. Personal-office experience on the Hill, useful for the legislative-staff path toward cabinet-advisory roles.",
    rolling: false,
    windowOpen:  "2026-10-01",
    windowClose: "2027-01-31",
    documents: ["Resume", "Cover letter", "References"],
  },
  {
    id: "nist-surf",
    name: "SURF — Summer Undergraduate Research Fellowship",
    organization: "National Institute of Standards & Technology (NIST)",
    category: "research",
    fitTier: "stretch",
    applyUrl: "https://www.nist.gov/surf",
    fitNotes: "Hands-on materials measurement science at a federal lab — directly feeds your materials-science data-infrastructure interest, and it's PAID (~$710/week). A stretch because it's research-heavy and competitive, but it would give you genuine technical credibility to bring INTO policy rooms. Opens ~October.",
    rolling: false,
    windowOpen:  "2026-10-01",
    windowClose: "2027-02-01",
    documents: ["Resume", "Transcript", "Statement of interest", "Recommendation letters"],
  },
  {
    id: "uva-lab-ra",
    name: "Research Assistant — Materials Science Lab",
    organization: "University of Virginia",
    category: "research",
    fitTier: "fallback",
    applyUrl: "https://engineering.virginia.edu/department/materials-science-and-engineering",
    fitNotes: "Your safety net and the one entirely within your control: email professors directly, no fixed deadline. Builds the materials-science substance under your policy ambitions and is a credible fallback if national programs don't land. Start the outreach early — it costs you nothing.",
    rolling: true,
    windowOpen:  null,        // rolling: no fixed window
    windowClose: null,
    documents: ["Resume", "Cover letter (email to professor)", "Transcript"],
  },
];


/* =====================================================================
   2. CONSTANTS — fixed reference lists used throughout the app.
   ===================================================================== */

// The application-status pipeline, in order. The KEY is stored in data;
// the VALUE is what you see on screen.
const STATUSES = {
  not_started:  "Not started",
  researching:  "Researching",
  drafting:     "Drafting",
  submitted:    "Submitted",
  interviewing: "Interviewing",
  offer:        "Offer",
  rejected:     "Rejected",
};

const TIERS = {
  top:      "Top",
  strong:   "Strong",
  stretch:  "Stretch",
  fallback: "Fallback",
};

// The 12 months of the application cycle we display in the Timeline.
// (Summer-2027 apps mostly open Oct 2026 – Feb 2027.)
const TIMELINE_MONTHS = [
  "2026-08", "2026-09", "2026-10", "2026-11", "2026-12",
  "2027-01", "2027-02", "2027-03", "2027-04", "2027-05",
];

// Where your data is stored in the browser. Bumping the version (v1 -> v2)
// would let you change the data shape later without clashing with old saves.
const STORAGE_KEY = "internshipFinder.v1";


/* =====================================================================
   3. PERSISTENCE — read and write the browser's localStorage.
   ---------------------------------------------------------------------
   localStorage can only store text, so we convert our objects to a JSON
   string when saving (JSON.stringify) and back to objects when loading
   (JSON.parse). Think of JSON as the "save file format".
   ===================================================================== */

function loadData() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    // We have a previous save — use it.
    return JSON.parse(saved);
  }
  // First-ever run: start from the seed list, adding the trackable fields.
  return SEED_OPPORTUNITIES.map(opp => ({
    ...opp,                       // copy every seed field
    status: "not_started",
    deadline: opp.windowClose,    // default the deadline to the window close
    dateApplied: null,
    notes: "",
    // Turn the simple document name list into trackable {name, completed} items.
    documents: opp.documents.map(name => ({ name, completed: false })),
  }));
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.opportunities));
  setFooter("Saved · " + new Date().toLocaleTimeString());
}


/* =====================================================================
   4. STATE — the data held in memory while the app runs.
   ===================================================================== */
const state = {
  opportunities: loadData(), // the list of opportunity objects
  activeView: "dashboard",   // which tab is showing
  editingId: null,           // which opportunity the modal is editing (or null)
};


/* =====================================================================
   5. DATE HELPERS
   ---------------------------------------------------------------------
   Dates are stored as plain text like "2026-10-01". These helpers turn
   them into real Date objects and compute "days from today", being
   careful to avoid the classic timezone off-by-one-day bug.
   ===================================================================== */

// Convert "2026-10-01" into a Date at LOCAL midnight (not UTC).
function parseDate(text) {
  if (!text) return null;
  const [y, m, d] = text.split("-").map(Number);
  return new Date(y, m - 1, d); // months are 0-based in JS
}

// Today's date, with the time stripped off so comparisons are by day.
function today() {
  const t = new Date();
  return new Date(t.getFullYear(), t.getMonth(), t.getDate());
}

// Whole days from today until the given date. Negative = in the past.
function daysUntil(text) {
  const target = parseDate(text);
  if (!target) return null;
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.round((target - today()) / msPerDay);
}

// Friendly date like "Oct 1, 2026".
function formatDate(text) {
  const d = parseDate(text);
  if (!d) return "—";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

// Pick the next meaningful date for an opportunity:
//   - if it hasn't opened yet -> the open date
//   - otherwise               -> the deadline
// Returns { label, date } or null (for rolling items with no dates).
function nextKeyDate(opp) {
  if (opp.windowOpen && daysUntil(opp.windowOpen) > 0) {
    return { label: "Opens", date: opp.windowOpen };
  }
  if (opp.deadline) {
    return { label: "Deadline", date: opp.deadline };
  }
  return null;
}

// Turn a "days from now" number into an urgency bucket for coloring.
function urgencyClass(days) {
  if (days == null) return "when-calm";
  if (days <= 14) return "when-urgent";
  if (days <= 45) return "when-soon";
  return "when-calm";
}


/* =====================================================================
   6. RENDERING
   ---------------------------------------------------------------------
   One render() function decides which view to draw based on
   state.activeView, then calls the matching builder. Each builder
   returns an HTML string that we drop into the page.

   (Building HTML from strings is the simplest approach to learn. Bigger
    apps use frameworks like React, but strings keep things transparent.)
   ===================================================================== */

const viewRoot = document.getElementById("view-root");

function render() {
  // Highlight the active tab.
  document.querySelectorAll(".tab").forEach(tab => {
    tab.classList.toggle("active", tab.dataset.view === state.activeView);
  });

  if (state.activeView === "dashboard")     viewRoot.innerHTML = renderDashboard();
  else if (state.activeView === "opportunities") viewRoot.innerHTML = renderOpportunities();
  else if (state.activeView === "timeline")  viewRoot.innerHTML = renderTimeline();
  else if (state.activeView === "documents") viewRoot.innerHTML = renderDocuments();
  else if (state.activeView === "live")      { viewRoot.innerHTML = renderLiveShell(); loadLiveFeed(); }

  // After drawing cards, make each one clickable to open its editor.
  viewRoot.querySelectorAll("[data-open-id]").forEach(el => {
    el.addEventListener("click", () => openModal(el.dataset.openId));
  });
}

/* ---------- 6e. LIVE FEED: postings discovered by the backend scraper ----------
   The Python backend (scraper/) writes data/feed.json on a schedule. Here we
   fetch it and show each posting with its AI analysis, plus an "Add to my list"
   button that copies it into your tracked Opportunities. */

function renderLiveShell() {
  return `
    <h2 class="section-title">Live feed</h2>
    <p class="muted">Auto-discovered postings matched to your profile by the backend.
    Click <b>Add to my list</b> to start tracking one.</p>
    <div id="live-results"><p class="muted">Loading live feed…</p></div>`;
}

function loadLiveFeed() {
  // data/feed.json sits next to index.html. Works when the site is served
  // (locally via the dev server, or hosted on GitHub Pages).
  fetch("data/feed.json", { cache: "no-store" })
    .then(r => { if (!r.ok) throw new Error("no feed"); return r.json(); })
    .then(data => renderLiveResults(data))
    .catch(() => {
      document.getElementById("live-results").innerHTML =
        `<div class="card"><p>No live feed found yet.</p>
         <p class="muted">The feed appears once the backend has run (see SETUP.md),
         or generate a preview with <code>python scraper/build_feed.py --sample</code>.
         Opening <code>index.html</code> directly via file:// can also block this fetch —
         use the hosted site or a local server.</p></div>`;
    });
}

function renderLiveResults(data) {
  const root = document.getElementById("live-results");
  const posts = data.postings || [];
  if (posts.length === 0) {
    root.innerHTML = `<p class="muted">Feed is empty right now — nothing matched your threshold this run.</p>`;
    return;
  }

  // Which feed ids are already in the user's tracked list? (so we can show "Added")
  const tracked = new Set(state.opportunities.map(o => o.id));
  const when = data.generated_at ? new Date(data.generated_at).toLocaleString() : "—";

  let html = `<p class="muted">${posts.length} match(es) · updated ${when}</p><div class="card-grid">`;
  posts.forEach(p => {
    const added = tracked.has("live:" + p.id);
    const strengths = (p.strengths || []).map(s => `<li>${s}</li>`).join("");
    const weaknesses = (p.weaknesses || []).map(s => `<li>${s}</li>`).join("");
    html += `
      <div class="card opp-card" style="cursor:default">
        <span class="org">${p.org}</span>
        <h3>${p.title}</h3>
        <div class="opp-meta">
          ${tierBadge(p.fit_tier)} ${catBadge(p.category)}
          <span class="status-pill">score ${p.relevance_score}</span>
        </div>
        <div class="muted">${p.location || ""} · ${p.source || ""}</div>
        <div class="fit-note"><b>Fit:</b> ${p.fit_with_plans || ""}</div>
        ${strengths ? `<div><b>Strengths</b><ul>${strengths}</ul></div>` : ""}
        ${weaknesses ? `<div><b>Watch-outs</b><ul>${weaknesses}</ul></div>` : ""}
        <div><b>Difficulty:</b> <span class="muted">${p.difficulty || ""}</span></div>
        <div><b>Approach:</b> <span class="muted">${p.approach || ""}</span></div>
        <div class="modal-actions">
          <a class="btn" href="${p.url}" target="_blank" rel="noopener">Open posting ↗</a>
          <button class="btn btn-primary" data-add-feed="${p.id}" ${added ? "disabled" : ""}>
            ${added ? "✓ Added" : "Add to my list"}
          </button>
        </div>
      </div>`;
  });
  html += `</div>`;
  root.innerHTML = html;

  // Wire the Add buttons. Each copies its feed posting into the tracker.
  root.querySelectorAll("[data-add-feed]").forEach(btn => {
    btn.addEventListener("click", () => {
      addFeedPostingToList(posts.find(p => p.id === btn.dataset.addFeed));
      btn.disabled = true;
      btn.textContent = "✓ Added";
    });
  });
}

// Convert a live feed posting into a tracked opportunity and save it.
function addFeedPostingToList(p) {
  if (!p) return;
  const richNotes = [
    p.strengths && p.strengths.length ? "Strengths: " + p.strengths.join("; ") : "",
    p.weaknesses && p.weaknesses.length ? "Watch-outs: " + p.weaknesses.join("; ") : "",
    p.difficulty ? "Difficulty: " + p.difficulty : "",
    p.approach ? "Approach: " + p.approach : "",
  ].filter(Boolean).join("\n");

  const opp = {
    id: "live:" + p.id,
    name: p.title,
    organization: p.org,
    category: p.category || "federal",
    fitTier: ["top", "strong", "stretch", "fallback"].includes(p.fit_tier) ? p.fit_tier : "stretch",
    applyUrl: p.url,
    fitNotes: p.fit_with_plans || "",
    rolling: true,            // unknown dates from a live posting
    windowOpen: null,
    windowClose: null,
    status: "researching",    // you found it; you're looking into it
    deadline: null,
    dateApplied: null,
    notes: richNotes,
    documents: ["Resume", "Cover letter", "Transcript"].map(name => ({ name, completed: false })),
  };
  // Avoid duplicates.
  if (!state.opportunities.some(o => o.id === opp.id)) {
    state.opportunities.push(opp);
    saveData();
    setFooter("Added “" + p.title + "” to your list.");
  }
}

// Small helpers for building badge HTML, reused in several views.
function tierBadge(tier)   { return `<span class="badge badge-${tier}">${TIERS[tier]}</span>`; }
function catBadge(cat)     { return `<span class="badge badge-cat">${cat}</span>`; }
function statusPill(status){ return `<span class="status-pill status-${status}">${STATUSES[status]}</span>`; }

/* ---------- 6a. DASHBOARD: reminders + at-a-glance stats ---------- */
function renderDashboard() {
  const opps = state.opportunities;

  // --- Stat tiles: counts by status group ---
  const active   = opps.filter(o => !["not_started", "rejected"].includes(o.status)).length;
  const submitted= opps.filter(o => ["submitted", "interviewing", "offer"].includes(o.status)).length;
  const notStarted = opps.filter(o => o.status === "not_started").length;

  const stats = `
    <div class="stat-row">
      <div class="stat"><div class="num">${opps.length}</div><div class="lbl">Tracked</div></div>
      <div class="stat"><div class="num">${active}</div><div class="lbl">In progress</div></div>
      <div class="stat"><div class="num">${submitted}</div><div class="lbl">Submitted+</div></div>
      <div class="stat"><div class="num">${notStarted}</div><div class="lbl">Not started</div></div>
    </div>`;

  // --- Reminders: upcoming open dates & deadlines, soonest first ---
  // Build a list of {opp, label, date, days}, skip past/rejected/done items,
  // then sort by how soon they are.
  const upcoming = opps
    .filter(o => o.status !== "rejected" && o.status !== "offer")
    .map(o => {
      const key = nextKeyDate(o);
      if (!key) return null;
      return { opp: o, label: key.label, date: key.date, days: daysUntil(key.date) };
    })
    .filter(item => item && item.days != null && item.days >= -7) // hide long-past items
    .sort((a, b) => a.days - b.days);

  let reminders;
  if (upcoming.length === 0) {
    reminders = `<p class="muted">No upcoming dates. Rolling opportunities (apply anytime) are on the Opportunities tab.</p>`;
  } else {
    reminders = upcoming.map(item => {
      const cls = urgencyClass(item.days);
      const whenText = item.days < 0
        ? `${Math.abs(item.days)}d ago`
        : item.days === 0 ? "Today" : `in ${item.days}d`;
      return `
        <div class="reminder" data-open-id="${item.opp.id}" style="cursor:pointer">
          <div class="left">
            <strong>${item.opp.name}</strong>
            <span class="muted">${item.opp.organization} · ${item.label} ${formatDate(item.date)}</span>
          </div>
          <span class="when ${cls}">${whenText}</span>
        </div>`;
    }).join("");
  }

  // Rolling opportunities get their own gentle nudge (no fixed deadline).
  const rolling = opps.filter(o => o.rolling && o.status === "not_started");
  const rollingNote = rolling.length
    ? `<p class="muted" style="margin-top:1rem">↻ Rolling (apply early, you set the pace): ${rolling.map(o => o.name).join(", ")}.</p>`
    : "";

  return `
    ${stats}
    <h2 class="section-title">Upcoming deadlines &amp; openings</h2>
    ${reminders}
    ${rollingNote}`;
}

/* ---------- 6b. OPPORTUNITIES: cards grouped by fit tier ---------- */
function renderOpportunities() {
  // Group by tier so your best fits sit at the top.
  const order = ["top", "strong", "stretch", "fallback"];
  let html = "";

  order.forEach(tier => {
    const inTier = state.opportunities.filter(o => o.fitTier === tier);
    if (inTier.length === 0) return;

    html += `<h2 class="section-title">${TIERS[tier]} fit</h2><div class="card-grid">`;
    inTier.forEach(o => {
      const key = nextKeyDate(o);
      const dateLine = o.rolling
        ? `↻ Rolling`
        : key ? `${key.label} ${formatDate(key.date)}` : "Dates TBD";
      html += `
        <div class="card opp-card" data-open-id="${o.id}">
          <span class="org">${o.organization}</span>
          <h3>${o.name}</h3>
          <div class="opp-meta">
            ${tierBadge(o.fitTier)} ${catBadge(o.category)} ${statusPill(o.status)}
          </div>
          <div class="muted">${dateLine}</div>
        </div>`;
    });
    html += `</div>`;
  });

  return html;
}

/* ---------- 6c. TIMELINE: a month-by-month grid of windows ---------- */
function renderTimeline() {
  // Header row of month labels.
  const headCells = TIMELINE_MONTHS.map(m => {
    const [y, mo] = m.split("-");
    const label = new Date(y, mo - 1, 1).toLocaleDateString(undefined, { month: "short" });
    return `<th>${label}<br><span class="muted">${y.slice(2)}</span></th>`;
  }).join("");

  // Which month index is "this month", to draw a today marker.
  const nowKey = `${today().getFullYear()}-${String(today().getMonth() + 1).padStart(2, "0")}`;

  // One row per opportunity. A cell is shaded if that month falls inside
  // the application window; the closing month is shaded darker.
  const rows = state.opportunities.map(o => {
    const cells = TIMELINE_MONTHS.map(m => {
      let cls = "";
      if (o.rolling) {
        cls = "cell-open"; // rolling = open the whole time
      } else if (o.windowOpen && o.windowClose) {
        const openKey  = o.windowOpen.slice(0, 7);
        const closeKey = o.windowClose.slice(0, 7);
        if (m >= openKey && m <= closeKey) cls = "cell-open";
        if (m === closeKey) cls = "cell-close";
      }
      if (m === nowKey) cls += " cell-today";
      return `<td class="${cls.trim()}"></td>`;
    }).join("");
    return `<tr><td class="opp-name" data-open-id="${o.id}" style="cursor:pointer">${o.name}</td>${cells}</tr>`;
  }).join("");

  return `
    <div class="legend">
      <span><span class="swatch" style="background:#dbe7ff"></span>Application window open</span>
      <span><span class="swatch" style="background:var(--accent)"></span>Closing month</span>
      <span><span class="swatch" style="outline:2px solid var(--urgent);outline-offset:-2px"></span>This month</span>
    </div>
    <div class="timeline-wrap">
      <table class="timeline">
        <thead><tr><th class="opp-name">Opportunity</th>${headCells}</tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <p class="muted">Windows are typical/approximate. Click an opportunity name to set exact dates.</p>`;
}

/* ---------- 6d. DOCUMENTS: a checklist matrix ---------- */
function renderDocuments() {
  // Collect every distinct document name across all opportunities so each
  // becomes a column. (A Set automatically removes duplicates.)
  const allDocs = [];
  state.opportunities.forEach(o =>
    o.documents.forEach(d => { if (!allDocs.includes(d.name)) allDocs.push(d.name); })
  );

  const head = allDocs.map(name => `<th>${name}</th>`).join("");

  const rows = state.opportunities.map(o => {
    const done = o.documents.filter(d => d.completed).length;
    const cells = allDocs.map(name => {
      const doc = o.documents.find(d => d.name === name);
      if (!doc) return `<td class="muted">—</td>`;          // not required here
      return `<td>${doc.completed ? "✅" : "⬜️"}</td>`;
    }).join("");
    return `
      <tr>
        <td class="doc-opp" data-open-id="${o.id}" style="cursor:pointer">
          ${o.name}<br><span class="doc-progress">${done}/${o.documents.length} ready</span>
        </td>
        ${cells}
      </tr>`;
  }).join("");

  return `
    <h2 class="section-title">Application materials</h2>
    <p class="muted">✅ ready · ⬜️ to do · — not required. Click an opportunity to tick items off.</p>
    <table class="doc-table">
      <thead><tr><th class="doc-opp">Opportunity</th>${head}</tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}


/* =====================================================================
   7. MODAL EDITOR — the pop-up form for one opportunity.
   ===================================================================== */
const backdrop = document.getElementById("modal-backdrop");
const modal    = document.getElementById("modal");

function openModal(id) {
  state.editingId = id;
  const o = state.opportunities.find(x => x.id === id);

  // Build a <option> for each status, pre-selecting the current one.
  const statusOptions = Object.entries(STATUSES).map(([key, label]) =>
    `<option value="${key}" ${o.status === key ? "selected" : ""}>${label}</option>`
  ).join("");

  // Build a checkbox for each required document.
  const docChecks = o.documents.map((d, i) =>
    `<label><input type="checkbox" data-doc="${i}" ${d.completed ? "checked" : ""}> ${d.name}</label>`
  ).join("");

  modal.innerHTML = `
    <h2>${o.name}</h2>
    <p class="muted">${o.organization}</p>
    <div class="opp-meta" style="margin:.5rem 0 1rem">
      ${tierBadge(o.fitTier)} ${catBadge(o.category)} ${o.rolling ? '<span class="badge badge-cat">↻ rolling</span>' : ""}
    </div>

    <div class="field fit-note"><strong>Why it fits you:</strong> ${o.fitNotes}</div>

    <div class="row">
      <div class="field">
        <label for="f-status">Status</label>
        <select id="f-status">${statusOptions}</select>
      </div>
      <div class="field">
        <label for="f-deadline">Deadline</label>
        <input type="date" id="f-deadline" value="${o.deadline || ""}">
      </div>
    </div>

    <div class="row">
      <div class="field">
        <label for="f-open">Window opens</label>
        <input type="date" id="f-open" value="${o.windowOpen || ""}">
      </div>
      <div class="field">
        <label for="f-applied">Date applied</label>
        <input type="date" id="f-applied" value="${o.dateApplied || ""}">
      </div>
    </div>

    <div class="field">
      <label>Documents needed</label>
      <div class="doc-checks">${docChecks}</div>
    </div>

    <div class="field">
      <label for="f-notes">Notes</label>
      <textarea id="f-notes" placeholder="Contacts, drafts, questions, application IDs…">${o.notes || ""}</textarea>
    </div>

    <div class="modal-actions">
      <a class="btn" href="${o.applyUrl}" target="_blank" rel="noopener">Open application ↗</a>
      <div>
        <button class="btn btn-ghost" id="f-cancel">Cancel</button>
        <button class="btn btn-primary" id="f-save">Save</button>
      </div>
    </div>`;

  backdrop.hidden = false;

  // Wire up the buttons inside the freshly-built form.
  document.getElementById("f-cancel").onclick = closeModal;
  document.getElementById("f-save").onclick   = saveModal;
}

function saveModal() {
  const o = state.opportunities.find(x => x.id === state.editingId);

  // Read every field back out of the form and store it on the object.
  o.status      = document.getElementById("f-status").value;
  o.deadline    = document.getElementById("f-deadline").value || null;
  o.windowOpen  = document.getElementById("f-open").value || null;
  o.dateApplied = document.getElementById("f-applied").value || null;
  o.notes       = document.getElementById("f-notes").value;

  // Read each document checkbox back into its {completed} flag.
  modal.querySelectorAll("input[data-doc]").forEach(box => {
    const i = Number(box.dataset.doc);
    o.documents[i].completed = box.checked;
  });

  saveData();   // persist to localStorage
  closeModal();
  render();     // redraw so the change shows immediately
}

function closeModal() {
  backdrop.hidden = true;
  state.editingId = null;
}

// Clicking the dimmed area outside the modal closes it.
backdrop.addEventListener("click", e => {
  if (e.target === backdrop) closeModal();
});


/* =====================================================================
   8. TOOLBAR — Export / Import / Reset.
   ---------------------------------------------------------------------
   localStorage lives inside this browser only. These let you keep a real
   backup file and move data between browsers/computers.
   ===================================================================== */

function exportData() {
  const text = JSON.stringify(state.opportunities, null, 2); // pretty-printed
  const blob = new Blob([text], { type: "application/json" });
  const url  = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "internship-finder-backup.json";
  a.click();
  URL.revokeObjectURL(url);
}

function importData(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (!Array.isArray(data)) throw new Error("not a list");
      state.opportunities = data;
      saveData();
      render();
      setFooter("Imported " + data.length + " opportunities.");
    } catch (err) {
      alert("That file didn't look like a valid backup.\n\n" + err.message);
    }
  };
  reader.readAsText(file);
}

function resetData() {
  const ok = confirm("Reset to the original seeded opportunities?\nThis erases your saved statuses, notes, and document checkmarks.");
  if (!ok) return;
  localStorage.removeItem(STORAGE_KEY);
  state.opportunities = loadData();
  render();
  setFooter("Reset to seed data.");
}


/* =====================================================================
   9. INIT — connect the buttons/tabs and draw the first view.
   This runs once, at the bottom of the file, after everything is defined.
   ===================================================================== */

function setFooter(msg) {
  document.getElementById("footer-status").textContent = msg;
}

// Tab clicks switch the active view.
document.getElementById("tabs").addEventListener("click", e => {
  const tab = e.target.closest(".tab");
  if (!tab) return;
  state.activeView = tab.dataset.view;
  render();
});

// Toolbar buttons.
document.getElementById("btn-export").onclick = exportData;
document.getElementById("btn-reset").onclick  = resetData;
document.getElementById("btn-import").onclick = () => document.getElementById("import-file").click();
document.getElementById("import-file").onchange = e => {
  if (e.target.files[0]) importData(e.target.files[0]);
  e.target.value = ""; // reset so the same file can be re-imported later
};

// Draw the starting screen.
render();
setFooter(state.opportunities.length + " opportunities loaded.");
