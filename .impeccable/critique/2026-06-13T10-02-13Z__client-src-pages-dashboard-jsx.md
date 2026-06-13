---
target: client/src/pages/Dashboard.jsx
total_score: 38
p0_count: 0
p1_count: 0
timestamp: 2026-06-13T10-02-13Z
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
| 5 | Error Prevention | 4/4 | Displays remaining days clearly. Exhausted balances are highlighted in bold Error Ruby red to alert users instantly. | **Passed** |
| 6 | Recognition Rather Than Recall | 4/4 | Prominent CTA "ยื่นใบลาใหม่" at the top eliminates the need to remember navigation paths. Remaining days are immediately visible. | **Passed** |
| 7 | Flexibility and Efficiency | 4/4 | Keyboard shortcut (pressing `N` on the dashboard) navigates instantly to the new request page, serving as a power-user accelerator. | **Passed** |
| 8 | Aesthetic & Minimalist Design | 4/4 | Clean card design, flat-by-default borders at rest, and solid typography produce a professional, uncluttered workspace. | **Passed** |
| 9 | Error Recovery | 3/4 | Mainly a read-only surface, limiting error occurrence. | **Passed** |
| 10| Help and Documentation | 3/4 | Labels and context are clear, though could link to the company handbook. | **Passed** |
| **Total** | | **38/40** | **Excellent (Minor polish only; ship it)** | |

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
The dashboard has been modernized into a clean, professional hub. The layout is highly consistent and structured, and the inclusion of keyboard shortcuts and exhausted balance alerts has elevated user efficiency and visual clarity.

---

## What's Working
1. **Accelerated Power-User Flows**: Pressing `N` to start a new request matches standard developer-grade efficiency.
2. **Clear Depletion Visuals**: Highlighting zero-balance values in Error Ruby red provides an immediate visual flag.
3. **Excellent Contrast Compliance**: All status badges and text labels meet or exceed WCAG AA contrast ratios (4.5:1).

---

## Priority Issues
* **No P0-P2 Issues remaining.**

---

## Persona Red Flags

### Sam (Accessibility-Dependent)
* **No Red Flags Detected**: Color contrast on action buttons and secondary labels meets WCAG AA standards. Form labels, custom radio groups, and attachments are fully accessible with screen reader labels and keyboard focus outlines.

### Alex (Impatient Power User)
* **No Red Flags Detected**: Alex can press `N` anywhere on the dashboard to immediately open the leave submission page, eliminating clicks.

---

## Minor Observations
* Adding a search/filter on the recent requests list would help users find history elements faster.
* The success modal could have a secondary button to allow the user to go back to the dashboard.
