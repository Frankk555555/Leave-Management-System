---
name: Leave Management System
description: Clean, high-utility leave management app for employees, supervisors, and HR
colors:
  primary: "#667eea"
  primary-gradient-start: "#667eea"
  primary-gradient-end: "#764ba2"
  neutral-bg: "#f5f7fa"
  neutral-text: "#2d3748"
  border: "#e2e8f0"
  success: "#059669"
  error: "#dc2626"
  submit: "#00d704"
  cancel: "#fd1313"
typography:
  display:
    fontFamily: "Sarabun, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 700
    lineHeight: 1.2
  headline:
    fontFamily: "Sarabun, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.3
  title:
    fontFamily: "Sarabun, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.4
  body:
    fontFamily: "Sarabun, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Sarabun, sans-serif"
    fontSize: "0.9rem"
    fontWeight: 500
    lineHeight: 1.4
rounded:
  sm: "4px"
  md: "8px"
  lg: "12px"
  xl: "20px"
spacing:
  xs: "0.25rem"
  sm: "0.5rem"
  md: "1rem"
  lg: "1.5rem"
  xl: "2rem"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
    padding: "0.75rem 1.5rem"
  button-submit:
    backgroundColor: "{colors.submit}"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
    padding: "0.875rem"
  button-cancel:
    backgroundColor: "{colors.cancel}"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
    padding: "0.875rem"
---

# Design System: Leave Management System

## 1. Overview

**Creative North Star: "The Structured Canvas"**

The Leave Management System is designed to provide clear, high-utility layouts that simplify the submission and approval of employee time-off requests. Grounded in the "Structured Canvas" metaphor, the design prioritizes clean grid structures, crisp typographic alignment using the Sarabun font, and highly accessible controls over decorative styling. 

To maintain low visual fatigue for repeated daily/weekly use, the interface rejects saturated SaaS clichés such as over-rounded borders, giant ambient glow effects, and gradient headers. Space is managed intentionally to separate functional areas—such as navigation, balance tracking, and request histories—enabling managers and employees to execute their workflows with expert confidence.

**Key Characteristics:**
- Typography-first hierarchy using the clean Sarabun font.
- Low-contrast, high-utility containers (borders rather than heavy shadows).
- Intentional, sparse color accents (gradients reserved strictly for navigation and primary action gates).
- Strict alignment to a vertical grid system to present data tables cleanly.

## 2. Colors

The color palette features professional corporate blues/purples for navigation, balanced by neutral slate and gray tones for high readability and low contrast fatigue.

### Primary
- **Corporate Royal Indigo** (#667eea): Used as the leading color for navigation highlights, active sidebar links, and focused input indicators.
- **Royal Velvet Purple** (#764ba2): Paired with Indigo to create a gradient accent, indicating primary headers and sidebar headers.

### Neutral
- **Slate Gray** (#2d3748): Canonical color for body text and headers, providing strong contrast while avoiding harsh solid black.
- **Office Mist** (#f5f7fa): Main body background color to provide a clean, soft canvas.
- **Light Border Gray** (#e2e8f0): Default border color for inputs, tables, and cards to structure layouts without adding visual weight.

### Alert / Status
- **Success Emerald** (#059669): Indicator color for approved leaves, successful status alerts, and positive confirmations.
- **Error Ruby** (#dc2626): Indicator color for rejected leaves, error states, and critical warnings.
- **Active Green** (#00d704): Color for standardized submit and save buttons.
- **Active Red** (#fd1313): Color for standardized cancel and reset buttons.

### Named Rules
**The Rarity of Royal Accent Rule.** The primary Corporate Royal Indigo gradient is reserved for navigation, sidebar header branding, page title text, and primary call-to-actions. It must occupy ≤15% of any given screen's total surface area.
**The Muted Table Rule.** All data tables and lists must use Light Border Gray (#e2e8f0) and neutral text. Saturated colors are reserved exclusively for status indicators (Success Emerald or Error Ruby).

## 3. Typography

**Display Font:** Sarabun (with system sans-serif fallback)
**Body Font:** Sarabun (with system sans-serif fallback)

The typography pairings focus on the Sarabun font family, which integrates corporate elegance with clean bilingual Thai/English legibility. Text wrapping, letter-spacing, and line-heights are set to maximize legibility of dense tabular information.

### Hierarchy
- **Display** (bold, 1.75rem, 1.2): Title headers for pages, styled with a Royal Indigo-to-Purple gradient clip.
- **Headline** (semibold, 1.5rem, 1.3): Major section headings and modal headers.
- **Title** (semibold, 1.25rem, 1.4): Card titles and sidebar category labels.
- **Body** (regular, 1rem, 1.5): Standard paragraphs, table content, and form instructions. Max line length is restricted to 65–75ch for optimal reading comfort.
- **Label** (medium, 0.9rem, 1.4): Form inputs, table header columns, and button labels.

### Named Rules
**The Readability Wrap Rule.** All description paragraphs and leave request notes must use `text-wrap: pretty` to eliminate orphans, with container widths capped at 75ch.
**Display Balance Rule.** Page headers and modal titles must use `text-wrap: balance` for uniform line lengths.

## 4. Elevation

The elevation system uses a flat-by-default hybrid structure. Background fills, light borders, and color contrasts denote layout hierarchy, while shadows are limited to active or floating states.

### Shadow Vocabulary
- **sidebar-shadow** (`4px 0 20px rgba(102, 126, 234, 0.25)`): Applied to the main sidebar to separate it from the content panel.
- **card-shadow** (`0 4px 20px rgba(0, 0, 0, 0.08)`): Diffuse shadow used for floating page sections and status cards.
- **modal-overlay** (`rgba(0, 0, 0, 0.5)`): Backdrop tint to emphasize active overlays.

### Named Rules
**The Flat-at-Rest Rule.** All cards, tables, and input forms remain flat at rest with a 2px solid border. Shadows are applied only on user hover or focus, or on transient elements like modal drop-downs.

## 5. Components

Components are styled with clear visual states and consistent border-radii depending on their function.

### Buttons
- **Shape:** Rounded corners with 8px radius (`cancel-btn`, `submit-btn`) or 10px radius (`add-btn`).
- **Primary:** Add buttons are styled with the Indigo-to-Purple gradient, padding `0.75rem 1.5rem`, minimum height 44px.
- **Submit / Save:** Standardized green button (#00d704) with hover transition to #30df2a and glow outline #b3f8a0.
- **Cancel / Reset:** Standardized red button (#fd1313) with hover transition to #f84040 and glow outline #ff88095f.

### Inputs / Fields
- **Style:** Border 2px solid #e2e8f0, border-radius 12px, padding `0.875rem 1rem`.
- **Focus:** Outlines are hidden; border-color shifts to Corporate Royal Indigo (#667eea) with a 4px soft Indigo glow.

### Cards / Containers
- **Corner Style:** Rounded corners with 20px radius (`empty-state`, `modal-content`).
- **Background:** Crisp white (#ffffff) to stand out from the Office Mist background.
- **Internal Padding:** Spaced generously at 2rem (32px) for cards, and 1.5rem (24px) for sections.

### Navigation
- **Style:** The sidebar is fixed (`width: 260px`, `height: 100vh`) with the Indigo-to-Purple gradient background and sidebar-shadow.
- **Hover/Active:** Active links use solid white backgrounds with #667eea text to declare current pages clearly.

## 6. Do's and Don'ts

### Do:
- **Do** maintain WCAG 2.1 AA compliant color contrast (minimum 4.5:1 ratio) for all body copy and placeholder text.
- **Do** limit card border-radii to a maximum of 20px for large sections and 8px/12px for interactive elements.
- **Do** ensure all form labels use the Sarabun font with a weight of 500 or higher.
- **Do** use `text-wrap: pretty` for long prose or notes submitted by users in tables.

### Don't:
- **Don't** use over-rounded card borders greater than 20px (e.g. 32px or 40px) as they read as an amateur AI scaffold.
- **Don't** combine a 1px solid border with a soft wide drop shadow (M ≥ 16px) on cards or buttons (avoid the "ghost-card" pattern).
- **Don't** use gradient text backgrounds, which reduce readability on high-utility admin views.
- **Don't** add tiny uppercase tracked kicker text (eyebrows) above every section heading as visual decoration.
- **Don't** use diagonal stripe backgrounds, sketchy SVG illustrations, or fake doodle assets.
