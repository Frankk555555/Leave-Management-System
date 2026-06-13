---
target: client/src/pages/LeaveRequest.jsx
total_score: 31
p0_count: 1
p1_count: 1
timestamp: 2026-06-13T09-29-32Z
slug: client-src-pages-leaverequest-jsx
---
# UX Design Critique: Leave Request

A design heuristic and UX critique of the Leave Request interface ([LeaveRequest.jsx](file:///C:/PROJECT/leave_management/client/src/pages/LeaveRequest.jsx) and [LeaveRequest.css](file:///C:/PROJECT/leave_management/client/src/pages/LeaveRequest.css)).

---

## Design Health Score

| # | Heuristic | Score | Key Finding | Status |
|---|-----------|-------|-------------|--------|
| 1 | Visibility of System Status | 3/4 | Real-time day calculation works, but date validity warnings are decoupled from the inputs (only visible via toast on submit). | **Passed** |
| 2 | Match System / Real World | 4/4 | Thai localized leave types and policy details match the corporate target environment. | **Passed** |
| 3 | User Control and Freedom | 2/4 | No cancel or return button on the form, trapping users unless they use browser-level back navigation. | **Improve** |
| 4 | Consistency and Standards | 3/4 | Styling aligns with typography and margin tokens, but submit button colors violate standard safety / contrast guidelines. | **Passed** |
| 5 | Error Prevention | 3/4 | Start date sets min limit on end date, but no client-side validation exists for file size limits. | **Passed** |
| 6 | Recognition Rather Than Recall | 4/4 | Outstanding inline display of remaining leave balances directly on selection cards and quick HR policy summaries. | **Passed** |
| 7 | Flexibility and Efficiency | 3/4 | Drag-and-drop file upload is supported, but there are no keyboard accelerators (e.g. Ctrl+Enter to submit) for power users. | **Passed** |
| 8 | Aesthetic & Minimalist Design | 3/4 | Layout is structured, but the heavy gradient background on the days count box and neon hover outlines cause visual noise. | **Passed** |
| 9 | Error Recovery | 3/4 | Errors are preserved inline without wiping form progress, but server validation errors are shown globally instead of next to fields. | **Passed** |
| 10| Help and Documentation | 3/4 | Excellent inline context policies serve as great documentation; could benefit from a direct link to the HR handbook. | **Passed** |
| **Total** | | **31/40** | **Good (Solid foundation, address weak areas)** | |

---

## Anti-Patterns Verdict
**FAIL.** The interface contains some notable AI-generated styling anti-patterns:
* **The side-stripe border tell**: The `.leave-info-box` uses a `border-left: 4px solid #667eea;` side-stripe accent border, which is an absolute ban under the design guidelines.
* **Over-rounded elements**: The `.success-modal` uses `border-radius: 24px`, exceeding the maximum token limit of `xl: 20px` defined in the design system.
* **Hero metric template**: The `.days-count` box uses a heavy purple-to-indigo gradient badge (`linear-gradient(135deg, #667eea, #764ba2)`) to highlight the day count, functioning as an over-styled hero metric on a clean form.
* **Gradient text / Glassmorphism**: Passed. Headings are solid and overlays use flat semi-translucent fills without unnecessary decorative blurs.
* **Deterministic scan**: The automated detector (`detect.mjs`) returned 0 findings on the JSX file. This is because the design system violations (like the side-stripe border and over-rounding) are defined in the CSS file (`LeaveRequest.css`), which the CLI detector ignores (it only scans markup files), and the JSX does not use inline styles or Tailwind classes. This highlights the importance of the combined manual and automated critique workflow.

---

## Overall Impression
The Leave Request interface is structurally solid, using modern React state handling, responsive media queries, and excellent progressive disclosure (conditional sections for different leave types). However, it exhibits a critical accessibility/contrast failure on the primary submit button, lacks an escape/cancel button for form aborts, and violates the design system's bans on side-stripe borders and excessive card rounding.

---

## What's Working
1. **Dynamic Progressive Disclosure**: Hiding complex conditional fields (like childbirth dates, ordination ceremony dates, and morning/afternoon time-slot options) until relevant keeps the form interface clean.
2. **Inline Balances and Policies**: The UI displays remaining balances directly on the leave cards and includes a helpful contextual tooltip box highlighting HR rules for the chosen leave category.
3. **Ergonomic Responsive Reflows**: Reflowing the 4-column leave grid into a single-column row format on mobile phones (≤480px) ensures readable balances and reachable touch targets.

---

## Priority Issues
* **[P0] Contrast Ratio Failure on Submit Button**
  * *Why it matters*: The white text on the bright green (`#00d704`) submit button yields a contrast ratio of ~1.73:1, which is practically unreadable and violates the WCAG 2.1 AA requirement (minimum 4.5:1).
  * *Fix*: Replace the active green `#00d704` with a darker green like Success Emerald `#059669` or `#166534`.
  * *Suggested command*: `$impeccable colorize client/src/pages/LeaveRequest.jsx`
* **[P1] Missing Cancel / Escape Button**
  * *Why it matters*: The form has no secondary action button to discard inputs and return. A user who entered the page by mistake must rely on browser navigation, violating user control standards.
  * *Fix*: Add a secondary "Cancel" button styled with the standard red/border next to the Submit button.
  * *Suggested command*: `$impeccable layout client/src/pages/LeaveRequest.jsx`
* **[P2] Banned Side-Stripe Border on Info Box**
  * *Why it matters*: The info box uses `border-left: 4px solid #667eea;` which is an absolute ban in `impeccable` guidelines as it reads as an amateur AI tell.
  * *Fix*: Remove the thick left border and style with a thin uniform border (e.g. `1px solid #e2e8f0`) and soft background tint.
  * *Suggested command*: `$impeccable quieter client/src/pages/LeaveRequest.css`
* **[P2] Visual Overloading of Days Count Badge**
  * *Why it matters*: The `.days-count` box uses a heavy gradient background (`linear-gradient(135deg, #667eea, #764ba2)`) right next to the date inputs. It steals focus from the actual input fields and the submit button.
  * *Fix*: Change the days count badge to a flat, neutral style (e.g., `#f7fafc` background with Slate `#2d3748` text).
  * *Suggested command*: `$impeccable layout client/src/pages/LeaveRequest.css`
* **[P3] Lack of File Size Validation**
  * *Why it matters*: Dragging or selecting very large files (e.g. 50MB+) will result in long network uploads and unhandled API crashes.
  * *Fix*: Add a 5MB size limit validation check in `handleFileChange`.
  * *Suggested command*: `$impeccable harden client/src/pages/LeaveRequest.jsx`

---

## Persona Red Flags

### Sam (Accessibility-Dependent)
* **Submit Button Contrast**: Sam will not be able to read "ยื่นคำขอลา" due to the 1.73:1 contrast ratio of white-on-green.
* **Custom Radio Card Semantics**: The hidden native radio buttons might prevent keyboard-only/screen-reader users from identifying these cards as radio controls unless correct ARIA attributes are attached.
* **Aria labels on Upload Area**: The drag-and-drop zone has no screen reader description for file uploading.

### Alex (Impatient Power User)
* **Grid Scanning**: Having 8 items in the leave type list demands high visual scanning time.
* **No Keyboard Submission**: Typing a reason in the textarea and pressing `Ctrl+Enter` does not submit the form. Alex must manually grab the mouse to click the button.
* **No Reason Templates**: Alex has to type recurring reasons (like "มีไข้ ท้องเสีย" or "พบแพทย์ตามนัด") completely from scratch.

---

## Minor Observations
* The default placeholder for the textarea uses browser defaults which often fail contrast requirements.
* The error banner is placed at the top of the form and is easily missed when scrolled down on smaller screens.

---

## Questions to Consider
* "What if we grouped the 8 leave types into categories (e.g., Medical, Personal, Regulatory) or used a clean select dropdown to reduce scanning load?"
* "Could the days-count display be integrated more subtly into the header or inline with the date labels instead of using a heavy purple-to-indigo gradient badge?"
* "What if the success modal button redirected directly to the history but had a secondary link to go back to the dashboard?"
