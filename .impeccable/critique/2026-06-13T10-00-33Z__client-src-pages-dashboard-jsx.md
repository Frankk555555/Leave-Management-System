---
target: client/src/pages/Dashboard.jsx
total_score: 34
p0_count: 0
p1_count: 0
timestamp: 2026-06-13T10-00-33Z
slug: client-src-pages-dashboard-jsx
---
# UX Design Critique: Dashboard

A design heuristic and UX critique of the Dashboard interface ([Dashboard.jsx](file:///C:/PROJECT/leave_management/client/src/pages/Dashboard.jsx) and [Dashboard.css](file:///C:/PROJECT/leave_management/client/src/pages/Dashboard.css)).

---

## Design Health Score

| # | Heuristic | Score | Key Finding | Status |
|---|-----------|-------|-------------|--------|
| 1 | Visibility of System Status | 4/4 | Dashboard fetches live balances and recent request statuses dynamically. Status badges for requests are fully visible with high contrast. | **Passed** |
| 2 | Match System / Real World | 4/4 | High-fidelity Thai localization matches organizational norms. Icons for different leave types map naturally to real-world meanings. | **Passed** |
| 3 | User Control and Freedom | 3/4 | Quick CTA leads directly to request submission, and list items route to history, though direct cancellation or undo is handled on details screens. | **Passed** |
| 4 | Consistency and Standards | 4/4 | Layout spacing and card border-radii align perfectly with standard design system tokens. Button conforms to primary gradient call-to-actions. | **Passed** |
| 5 | Error Prevention | 3/4 | Displays remaining days clearly, which proactively stops invalid requests, but does not visually highlight exhausted (zero) balances. | **Passed** |
| 6 | Recognition Rather Than Recall | 4/4 | Prominent CTA "ยื่นใบลาใหม่" at the top eliminates the need to remember navigation paths. Remaining days are immediately visible. | **Passed** |
| 7 | Flexibility and Efficiency | 2/4 | Lacks accelerators (keyboard shortcuts, quick links) for power users to submit requests directly. | **Improve** |
| 8 | Aesthetic & Minimalist Design | 4/4 | Clean card design, flat-by-default borders at rest, and solid typography produce a professional, uncluttered workspace. | **Passed** |
| 9 | Error Recovery | 3/4 | Mainly a read-only surface, limiting error occurrence. | **Passed** |
| 10| Help and Documentation | 3/4 | Labels and context are clear, though could link to the company handbook. | **Passed** |
| **Total** | | **34/40** | **Good (Solid foundation, address weak areas)** | |

---

## Anti-Patterns Verdict
**PASS.** The dashboard has resolved all previous slop tells and banned styles:
* **Gradient text**: Resolved. The welcome header `สวัสดี, คุณ...` uses a solid, high-contrast `#2d3748` color.
* **Rainbow gradients**: Resolved. Leave cards utilize a clean, structured progress layout with subtle, solid colors matching their respective types.
* **Large floating shadows**: Resolved. Cards remain flat at rest with `2px solid #e2e8f0` borders.
* **Single metric card**: Resolved. The stats section is a balanced, responsive grid.
* **Deterministic Scan**: Clean. The automated detector (`detect.mjs`) returned zero findings.

---

## Overall Impression
The dashboard has been modernized into a clean, professional hub. The layout is highly consistent and structured, though it could benefit from quick-action enhancements for power users and better visual flags for depleted leave balances.

---

## What's Working
1. **Excellent Contrast Compliance**: All status badges and text labels meet or exceed WCAG AA contrast ratios (4.5:1).
2. **Clear Layout Groupings**: Using proximity and subtle card borders provides visual structure without resorting to heavy shadows.
3. **Responsive Grid Architecture**: Fluid columns stack cleanly and reflow elements logically on smaller viewports.

---

## Priority Issues

* **[P2] Lacks Power-User Accelerators**
  * *Why it matters*: Experienced users must rely entirely on mouse clicks to navigate or start requests.
  * *Fix*: Implement a keyboard listener to navigate to the new request page when pressing `N`.
  * *Suggested command*: `$impeccable polish client/src/pages/Dashboard.jsx`

* **[P2] Missing Exhausted Balance Alert**
  * *Why it matters*: When a leave balance reaches 0, it is displayed in the same neutral color as positive balances, making it harder to identify at a glance.
  * *Fix*: Style balances as red (`#dc2626` / Error Ruby) when remaining days are `0` or negative.
  * *Suggested command*: `$impeccable colorize client/src/pages/Dashboard.jsx`

* **[P3] Inline Hardcoded Icon Color**
  * *Why it matters*: The hand emoji icon uses a hardcoded inline hex color `#e6c314ff` instead of a CSS custom variable or design token.
  * *Fix*: Reference a standard color variable or define it cleanly.
  * *Suggested command*: `$impeccable polish client/src/pages/Dashboard.jsx`
