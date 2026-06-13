---
target: client/src/pages/Dashboard.jsx
total_score: 20
p0_count: 0
p1_count: 2
timestamp: 2026-06-13T07-52-36Z
slug: client-src-pages-dashboard-jsx
---
# Design Critique: client/src/pages/Dashboard.jsx

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 1/4 | Recent requests do not display their status badge (Pending, Approved, Rejected). |
| 2 | Match System / Real World | 3/4 | Uses familiar terminology and Thai language, but icon groupings are arbitrary. |
| 3 | User Control and Freedom | 2/4 | No shortcut navigation to start requests or undo from the dashboard. |
| 4 | Consistency and Standards | 2/4 | Diverges into 8 different custom gradient color palettes for leave icons. |
| 5 | Error Prevention | 3/4 | Read-only surface, but no warnings on zero or negative leave balances. |
| 6 | Recognition Rather Than Recall | 2/4 | No primary actions visible; user must recall sidebar routes to submit leaves. |
| 7 | Flexibility and Efficiency | 1/4 | No keyboard shortcuts, bulk actions, or quick links. |
| 8 | Aesthetic and Minimalist Design | 2/4 | Massive visual clutter from progress bars and banned gradient header text. |
| 9 | Error Recovery | 3/4 | Read-only surface. |
| 10 | Help and Documentation | 1/4 | No inline descriptions of leave limits or rules. |
| **Total** | | **20/40** | **Acceptable** |

## Anti-Patterns Verdict

**LLM Assessment:**
The dashboard looks partially AI-generated due to several visual tells:
- **Gradient Text Clip:** The welcome header (`สวัสดี, คุณ...`) uses a text gradient, which is an absolute ban in the design system as it looks decorative without carrying meaning.
- **Rainbow Gradients:** The 8 leave balance cards use 8 different saturated gradients, creating a chaotic "rainbow" layout that violates the Restrained color principle.
- **Large Floating Shadows:** Cards have 20px blur shadows at rest instead of staying flat-by-default with defined borders.
- **Single Metric Card:** The "บันทึกการลาทั้งหมด" stats card is a lone card in a stats grid, showing a SaaS-style cliché of a giant number with a small label.

**Deterministic Scan:**
The automated design detector ran on `client/src/pages/Dashboard.jsx` and found **0 syntax warnings or mechanical violations**. 

**Visual Overlays:**
No interactive browser visualization was executed. No overlays were injected.

## Overall Impression
The dashboard has a solid structure with a clear sidebar layout and responsive panels, but it suffers from visual over-decoration and a lack of clear call-to-actions. The primary opportunity is to declutter the leave balances into a clean, low-fatigue overview, and to add immediate functional value by exposing action items and request statuses.

## What's Working
- **Responsive Flex/Grid Structure:** The dashboard content splits cleanly into a two-column grid that stacks on smaller screens.
- **Clear Information Density:** The lists and balance cards display essential numbers clearly, avoiding overly long text.

## Priority Issues

### [P1] Missing Request Status in Recent Activity
- **Why it matters:** Users looking at the dashboard cannot tell if their recent leave requests were approved, rejected, or are still pending, forcing them to navigate to the Leave History page just to check the status.
- **Fix:** Add a status badge (Pending, Approved, Rejected) using the Success Emerald (#059669) and Error Ruby (#dc2626) tokens.
- **Suggested command:** `$impeccable clarify`

### [P1] Lack of Primary Call-to-Actions (CTCs)
- **Why it matters:** The dashboard is the landing hub, yet it contains zero buttons to actually perform actions, requiring the user to recall and click sidebar navigation items to submit requests.
- **Fix:** Add a primary action button like "ยื่นใบลาใหม่" (Submit Leave Request) in the page header.
- **Suggested command:** `$impeccable layout`

### [P2] Rainbow Gradient Clutter in Leave Balances
- **Why it matters:** Having 8 different custom color gradients side-by-side creates high cognitive load and visual fatigue, violating the "Rarity of Royal Accent" rule.
- **Fix:** Use soft, single-tone background borders or standard Slate gray icons, reserving saturated accent colors for highlights.
- **Suggested command:** `$impeccable colorize`

### [P2] Saturated SaaS Clichés and Banned Styles
- **Why it matters:** The welcome header uses gradient text clipping (an absolute ban), and the cards use heavy 20px shadows instead of the flat-by-default 2px border system.
- **Fix:** Remove the gradient text-clip from the header and apply flat borders to cards at rest.
- **Suggested command:** `$impeccable quieter`

## Persona Red Flags

### Alex (Power User)
- **Keyboard Shortcuts:** No keyboard navigation or quick shortcuts are supported on the dashboard.
- **Recall Overhead:** Exposing only reading views with zero quick action triggers forces Alex to make multiple clicks to navigate to form routes.

### Jordan (First-Timer)
- **Status Uncertainty:** The recent requests show dates and days but no status, leaving Jordan guessing if their submitted leave has been processed.
- **Terminology:** The balance list does not explain what "carried over days" means or how balances are calculated.

## Minor Observations
- The hand waving emoji/icon (`FaHandPaper`) uses a hardcoded color value `#e6c314ff` instead of a token.
- The progress bar for military service is hardcoded to 100% since it has no numeric denominator.

## Questions to Consider
- What if the dashboard header included a quick balance summary widget alongside a primary "Request Leave" button?
- Does the user really need to see all 8 leave types at once, or should we group them (e.g., active vs. inactive types)?
- What would a confident, typography-first version of the recent requests list look like if we removed card structures entirely?
