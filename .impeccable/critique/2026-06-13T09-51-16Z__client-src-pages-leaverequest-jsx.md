---
target: client/src/pages/LeaveRequest.jsx
total_score: 37
p0_count: 0
p1_count: 0
timestamp: 2026-06-13T09-51-16Z
slug: client-src-pages-leaverequest-jsx
---
# UX Design Critique: Leave Request

A design heuristic and UX critique of the Leave Request interface ([LeaveRequest.jsx](file:///C:/PROJECT/leave_management/client/src/pages/LeaveRequest.jsx) and [LeaveRequest.css](file:///C:/PROJECT/leave_management/client/src/pages/LeaveRequest.css)).

---

## Design Health Score

| # | Heuristic | Score | Key Finding | Status |
|---|-----------|-------|-------------|--------|
| 1 | Visibility of System Status | 4/4 | Real-time day calculation works, and all input fields/buttons are successfully disabled during submission, preventing multi-click issues or in-flight edits. | **Passed** |
| 2 | Match System / Real World | 4/4 | Thai localized leave types match policies. Maternity leave calculates calendar days, aligning with labor law requirements. | **Passed** |
| 3 | User Control and Freedom | 4/4 | Cancel button redirects to the previous page. Success modal close button takes the user to history. File attachments can be easily added and removed. | **Passed** |
| 4 | Consistency and Standards | 4/4 | Gradient submit button matches the primary call-to-action branding. Layout border-radii conform to standard tokens (12px, 8px, 20px). | **Passed** |
| 5 | Error Prevention | 4/4 | All inputs are disabled during loading, date ranges prevent invalid end dates, and size check stops uploads exceeding 5MB. | **Passed** |
| 6 | Recognition Rather Than Recall | 4/4 | Balance cards and context-aware policy boxes are placed directly on the form canvas to minimize cognitive load. | **Passed** |
| 7 | Flexibility and Efficiency | 3/4 | Excellent keyboard navigation (including space/enter on upload area), though could still benefit from keyboard shortcuts (e.g. Ctrl+Enter to submit). | **Passed** |
| 8 | Aesthetic & Minimalist Design | 4/4 | Flat days-count badge, 1px border info box, and clear spacing provide a clean, uncluttered structure. | **Passed** |
| 9 | Error Recovery | 3/4 | Progress is preserved in the form state when API errors occur, though localized field-level error messages would improve recovery time. | **Passed** |
| 10| Help and Documentation | 3/4 | Contextual policy instructions offer direct support; adding a link to the main HR manual would complete the help system. | **Passed** |
| **Total** | | **37/40** | **Excellent (Minor polish only; ship it)** | |

---

## Anti-Patterns Verdict
**PASS.** The interface successfully resolves all key AI slop Tells:
* **The side-stripe border tell**: Resolved. The `.leave-info-box` has a uniform, soft 1px border.
* **Over-rounded elements**: Resolved. The success modal border-radius aligns perfectly to `20px` (`xl: 20px`).
* **Hero metric template**: Resolved. The days-count widget is flat and integrated cleanly.
* **Non-token spacing/rounding**: Resolved. Border-radii have been refactored from arbitrary `14px`/`10px` to standard `12px` (`lg`) and `8px` (`md`) tokens.
* **Deterministic Scan**: Clean. The automated detector (`detect.mjs`) returned zero findings.

---

## Overall Impression
The Leave Request interface has been hardened to production standards. Accessibility, visual hierarchy, security constraints during API flight, and Thai labor law alignments are fully resolved, making this a robust, high-fidelity experience for users.

---

## What's Working
1. **Comprehensive Loading Constraints**: Disabling the entire form during submission prevents race conditions and data corruption on slow networks.
2. **Standardized Token Hierarchy**: The entire interface is visually coherent with clean margins and precise border-radius alignment.
3. **Robust Screen Reader & Keyboard Access**: Radio groups hidden with `.sr-only` preserve keyboard flow and screen reader accessibility, while attachment controls support full keyboard interactions.

---

## Priority Issues
* **[P3] Lack of Submit Keyboard Shortcut**
  * *Why it matters*: Keyboard-centric users must shift to the mouse/trackpad to press "ยื่นคำขอลา".
  * *Fix*: Implement a `KeyDown` listener on the reason textarea or form to submit via `Ctrl + Enter`.
  * *Suggested command*: `$impeccable polish client/src/pages/LeaveRequest.jsx`

---

## Persona Red Flags

### Sam (Accessibility-Dependent)
* **No Red Flags Detected**: Color contrast on action buttons and secondary labels meets WCAG AA standards. Form labels, custom radio groups, and attachments are fully accessible with screen reader labels and keyboard focus outlines.

### Alex (Impatient Power User)
* **No Critical Red Flags**: Alex can quickly navigate, tab through the inputs, and submit the request. The disabled loading state clearly communicates system activity without trapping user focus.

---

## Minor Observations
* Adding a character count or limit indicator to the reason textarea would prevent database truncation errors.
* The success modal could have a secondary button to allow the user to go back to the dashboard.
