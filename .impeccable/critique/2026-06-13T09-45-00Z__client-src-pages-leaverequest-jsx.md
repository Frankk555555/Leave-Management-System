---
target: client/src/pages/LeaveRequest.jsx
total_score: 32
p0_count: 0
p1_count: 2
timestamp: 2026-06-13T09-45-00Z
slug: client-src-pages-leaverequest-jsx
---
# UX Design Critique: Leave Request

A design heuristic and UX critique of the Leave Request interface ([LeaveRequest.jsx](file:///C:/PROJECT/leave_management/client/src/pages/LeaveRequest.jsx) and [LeaveRequest.css](file:///C:/PROJECT/leave_management/client/src/pages/LeaveRequest.css)).

---

## Design Health Score

| # | Heuristic | Score | Key Finding | Status |
|---|-----------|-------|-------------|--------|
| 1 | Visibility of System Status | 3/4 | Real-time day calculation works, but input fields are not disabled during submission, allowing data manipulation in flight. | **Passed** |
| 2 | Match System / Real World | 4/4 | Thai localized leave types and policy details match the corporate environment. | **Passed** |
| 3 | User Control and Freedom | 3/4 | Cancel button is now present next to Submit, but it is disabled during submission. | **Passed** |
| 4 | Consistency and Standards | 3/4 | Styling aligns with main tokens, but submit button uses gradient violating the solid green spec, and there are minor border-radius token deviations (14px, 10px). | **Passed** |
| 5 | Error Prevention | 3/4 | Start date limits end date, and 5MB file size limit is implemented, but inputs are editable during API flight. | **Passed** |
| 6 | Recognition Rather Than Recall | 4/4 | Direct display of remaining balances on cards and inline HR policies simplifies user memory load. | **Passed** |
| 7 | Flexibility and Efficiency | 2/4 | No keyboard shortcuts (like Ctrl+Enter to submit) or text templates for common reasons. | **Improve** |
| 8 | Aesthetic & Minimalist Design | 4/4 | Cleaned up successfully: days-count gradient badge is flat/neutral, and the info box uses a clean 1px border. | **Passed** |
| 9 | Error Recovery | 3/4 | Errors are preserved inline without wiping form progress, but server validation errors are shown globally instead of next to fields. | **Passed** |
| 10| Help and Documentation | 3/4 | Good inline policy summaries serve as great documentation; could benefit from a direct link to the HR handbook. | **Passed** |
| **Total** | | **32/40** | **Good (Solid foundation, address weak areas)** | |

---

## Anti-Patterns Verdict
**PASS.** The interface has cleaned up the major AI slop Tells:
* **The side-stripe border tell**: Fixed. The `.leave-info-box` now uses a clean, uniform 1px border.
* **Over-rounded elements**: Fixed. The `.success-modal` uses `border-radius: 20px`, which matches the `xl: 20px` token.
* **Hero metric template**: Fixed. The `.days-count` box has been replaced with a clean, flat slate box.
* **Minor tells remaining**: Some non-token border-radii (`14px` on `.conditional-section` and `.file-upload-area`, and `10px` on `.checkbox-label` and `.file-item`) deviate from the design system's `xl: 20px` / `lg: 12px` / `md: 8px` hierarchy.

---

## Overall Impression
The Leave Request interface has improved significantly by fixing the missing cancel button, correcting the over-rounded modal and gradient days-count badge, removing the side-stripe border on the info box, and adding file size checks. However, a contrast failure still exists on the red Cancel button and secondary text labels, and form fields remain editable during active submission.

---

## What's Working
1. **Dynamic Progressive Disclosure**: Hiding childbirth/ceremony dates and morning/afternoon options unless relevant keeps the interface simple and focused.
2. **Inline Balances and Policies**: The remaining leave days display inline on cards, and contextual HR policies show up dynamically, minimizing cognitive load.
3. **Ergonomic Responsive Reflows**: Converting the 4-column leave grid into a single-column layout on mobile ensures legible text and touch-friendly controls.

---

## Priority Issues

* **[P1] Contrast Ratio Failures on Cancel Button and Secondary Text**
  * *Why it matters*: The cancel button (`#fd1313` text on white background) yields a contrast ratio of **3.97:1**, which fails the WCAG 2.1 AA requirement of **4.5:1** for regular text. Additionally, the light gray text color `#718096` used for secondary labels (e.g. `.days-label`, `.file-upload-area span`) on light backgrounds has a contrast ratio of **3.4:1** to **3.98:1**, also failing the AA standard.
  * *Fix*: Change the Cancel button color to a darker red (e.g., `#dc2626` or matching the Error Ruby token). Change secondary text `#718096` on light backgrounds to a darker slate (e.g., `#4a5568` or `#5a6a80`).
  * *Suggested command*: `$impeccable colorize client/src/pages/LeaveRequest.css`

* **[P1] Form Inputs Editable During Active Submission**
  * *Why it matters*: While the form is submitting (`loading` is true), the buttons are disabled, but all form input fields (leave type, dates, reason, file upload) remain fully editable. A user can change inputs mid-flight, creating potential data mismatches and submission errors.
  * *Fix*: Disable all form controls (inputs, textarea, radio buttons, file uploader) when `loading` is true.
  * *Suggested command*: `$impeccable harden client/src/pages/LeaveRequest.jsx`

* **[P2] Missing Accessibility Attributes (ARIA Roles and Labels)**
  * *Why it matters*: Screen reader users cannot easily navigate or understand the custom controls. The file delete buttons (`.remove-file`) only contain the visual `<FaTimes />` icon with no textual description, meaning a screen reader will announce it simply as "button". The drag-and-drop file upload area has no ARIA role or label, and the custom radio buttons (`.leave-type-card`) hide native input fields completely using absolute positioning and zero width/height, which can cause reading and focus failures.
  * *Fix*: Add `aria-label="ลบไฟล์"` to the remove buttons, `role="button"` and `aria-label="อัปโหลดเอกสารแนบ"` to the upload area, and use a standard accessible class (`.sr-only`) to hide radio inputs instead of custom `width: 0; height: 0; opacity: 0;`.
  * *Suggested command*: `$impeccable audit client/src/pages/LeaveRequest.jsx`

* **[P2] Design System Token Deviations in Layout**
  * *Why it matters*: The layout uses non-token dimensions for rounded corners, such as `border-radius: 14px` on `.conditional-section` and `.file-upload-area`, and `border-radius: 10px` on `.checkbox-label` and `.file-item`. This violates consistency and dilutes the design system.
  * *Fix*: Refactor these classes to use standard token border-radius values (`md: 8px` or `lg: 12px`).
  * *Suggested command*: `$impeccable layout client/src/pages/LeaveRequest.css`

* **[P3] Headings Hierarchy Jump**
  * *Why it matters*: The main page title is an `h1` ("ยื่นคำขอลา"), and section headers are `h3` ("ประเภทการลา", "ช่วงวันที่ลา", etc.), completely skipping the `h2` heading level. This incorrect hierarchy violates semantic structure guidelines.
  * *Fix*: Change section headers in the main form from `h3` to `h2` to maintain a linear hierarchy.
  * *Suggested command*: `$impeccable typeset client/src/pages/LeaveRequest.jsx`

---

## Persona Red Flags

### Sam (Accessibility-Dependent)
* **Text contrast**: The Cancel button (`#fd1313` red text on white bg) and the secondary text `#718096` fail the WCAG AA minimum 4.5:1 ratio.
* **Screen reader gaps**: The file attachment list has delete buttons (`.remove-file`) styled with a simple `FaTimes` icon but no `aria-label`, so Sam's screen reader won't read what the button does. The custom radio cards hide native controls using zero dimensions and do not provide ARIA attributes (`aria-checked`), risking focus loss.

### Alex (Impatient Power User)
* **High cognitive scanning**: The leave type grid has 8 choices all with the same visual style, causing visual scanning delay.
* **No keyboard shortcuts**: Pressing `Ctrl + Enter` in the reason textarea doesn't submit the form, forcing Alex to switch to the mouse.
* **Inputs editable during slow loading**: When submitting on a slow connection, Alex is trapped looking at a disabled submit button but can still edit form fields, which can lead to frustration and accidental input alterations.

---

## Minor Observations
* The default placeholder for the textarea uses browser defaults which often fail contrast requirements.
* The error banner is placed at the top of the form and is easily missed when scrolled down on smaller screens.
* **Maternity leave working days check**: Maternity leave is in `WORKING_DAYS_ONLY` (line 79 of JSX). If maternity leave is taken, it should be calculated in calendar days (including weekends) in Thailand, but the current code only counts Mon-Fri, leading to incorrect duration outputs.

---

## Questions to Consider
* "What if we grouped the 8 leave types into categories (e.g., Medical, Personal, Regulatory) or used a clean select dropdown to reduce scanning load?"
* "Could the days-count display be integrated more subtly into the header or inline with the date labels instead of using a heavy purple-to-indigo gradient badge?"
* "What if the success modal button redirected directly to the history but had a secondary link to go back to the dashboard?"
