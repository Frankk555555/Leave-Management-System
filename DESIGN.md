---
name: Leave Management System
description: Clean, high-utility leave management app for employees, supervisors, and HR
colors:
  primary: "#667eea"
  primary-gradient-start: "#667eea"
  primary-gradient-end: "#764ba2"
  accent-amethyst: "#a855f7"
  neutral-bg: "#f5f7fa"
  neutral-text: "#2d3748"
  neutral-secondary: "#4a5568"
  neutral-muted: "#6c757d"
  neutral-placeholder: "#a0aec0"
  border: "#e2e8f0"
  success: "#059669"
  success-toast: "#10b981"
  error: "#dc2626"
  error-toast: "#ef4444"
  warning: "#f59e0b"
  info: "#3b82f6"
  submit: "#059669"
  cancel: "#dc2626"
  notification-badge: "#ff6b6b"
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
  default: "10px"
  lg: "12px"
  card-inner: "14px"
  card: "16px"
  xl: "20px"
spacing:
  xs: "0.25rem"
  sm: "0.5rem"
  md: "1rem"
  lg: "1.5rem"
  xl: "2rem"
  section-padding: "2.5rem 3.5rem"
components:
  button-primary:
    backgroundColor: "linear-gradient(135deg, {colors.primary} 0%, {colors.primary-gradient-end} 100%)"
    textColor: "#ffffff"
    rounded: "{rounded.default}"
    padding: "0.75rem 1.5rem"
    minHeight: "44px"
  button-submit:
    backgroundColor: "{colors.submit}"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
    padding: "0.875rem"
    height: "45px"
  button-cancel:
    backgroundColor: "{colors.cancel}"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
    padding: "0.875rem"
    height: "45px"
breakpoints:
  mobile: "480px"
  tablet: "768px"
  sidebar-collapse: "1024px"
---

# Design System: Leave Management System

## 1. Overview

**Creative North Star: "The Structured Canvas"**

The Leave Management System is designed to provide clear, high-utility layouts that simplify the submission and approval of employee time-off requests. Grounded in the "Structured Canvas" metaphor, the design prioritizes clean grid structures, crisp typographic alignment using the Sarabun font, and highly accessible controls over decorative styling.

To maintain low visual fatigue for repeated daily/weekly use, the interface rejects saturated SaaS clichés such as over-rounded borders, giant ambient glow effects, and gradient headers. Space is managed intentionally to separate functional areas—such as navigation, balance tracking, and request histories—enabling managers and employees to execute their workflows with expert confidence.

**Key Characteristics:**
- Typography-first hierarchy using the clean Sarabun font.
- Low-contrast, high-utility containers (borders rather than heavy shadows).
- Intentional, sparse color accents (gradients reserved strictly for navigation, mobile header, and primary action gates).
- Strict alignment to a vertical grid system to present data tables cleanly.
- Responsive sidebar-to-mobile-header layout that collapses at 1024px.

## 2. Colors

The color palette features professional corporate blues/purples for navigation, balanced by neutral slate and gray tones for high readability and low contrast fatigue.

### Primary

- **Corporate Royal Indigo** (#667eea): Used as the leading color for navigation highlights, active sidebar links, spinner accents, loading text, input focus states, and the scrollbar thumb gradient.
- **Royal Velvet Purple** (#764ba2): Paired with Indigo to create a gradient accent for the sidebar background, mobile header, scrollbar thumb, page-loader spinner middle ring, and notification dropdown header.
- **Amethyst Purple** (#a855f7): Used as the third ring color in triple-ring loading spinners (PageLoader, Loading component, and inline loading-spinner).

### Neutral

- **Slate Gray** (#2d3748): Canonical color for body text, page headers, card titles, and notification titles. Provides strong contrast while avoiding harsh solid black.
- **Medium Slate** (#4a5568): Secondary text color used for stat descriptions, form labels, balance info, notification messages, and dashboard subtitles. Better contrast than Bootstrap gray.
- **Dim Gray** (#6c757d): Used sparingly for page header subtitles and empty notification states.
- **Silver Mist** (#a0aec0): Muted placeholder color for empty-state descriptions and notification timestamps.
- **Office Mist** (#f5f7fa): Main body and layout background color to provide a clean, soft canvas.
- **Soft Canvas** (#e4e8ec): Paired with Office Mist in a 135° gradient for full-page loading backgrounds.
- **Light Border Gray** (#e2e8f0): Default border color for inputs, tables, stat-cards, dashboard cards, and skeleton table rows to structure layouts without adding visual weight.
- **Skeleton Base** (#f0f0f0 → #e0e0e0): Shimmer gradient for skeleton loading placeholders.
- **Subtle Background** (#f7fafc): Used for skeleton card headers, request item backgrounds, and table header rows.
- **Light Separator** (#e9ecef): Used for notification item borders and notification dropdown header dividers.

### Alert / Status

- **Success Emerald** (#059669): Indicator color for approved leaves, inline alert-success messages, and positive confirmations.
- **Toast Success Green** (#10b981): Left-border accent for toast success notifications.
- **Error Ruby** (#dc2626): Indicator color for rejected leaves, inline alert-error messages, and critical warnings.
- **Toast Error Red** (#ef4444): Left-border accent for toast error notifications.
- **Warning Amber** (#f59e0b): Left-border accent for toast warning notifications. Also used for pending/vacation status badges and gradient status indicators (paired with #d97706 or #fbbf24).
- **Info Blue** (#3b82f6): Left-border accent for toast info notifications. Also used for military leave type indicators and vacation balance badges.
- **Confirmed Green** (#047857): Background text for confirmed status badges (paired with #d1fae5 background).
- **Notification Badge Red** (#ff6b6b → #ee5a5a): Gradient background for the unread notification count badge on the bell icon.
- **Active Green** (#00d704): Background for standardized submit, save, and confirm-ok buttons.
- **Active Red** (#fd1313): Background for standardized cancel, reset, and confirm-cancel buttons.

### Named Rules

**The Rarity of Royal Accent Rule.** The primary Corporate Royal Indigo gradient is reserved for the sidebar, mobile header, notification dropdown header, scrollbar thumb, primary call-to-action buttons (`.add-btn`), page-title gradient text, and the full-page Login screen background. It must occupy ≤15% of any given screen's total surface area (with the exception of the Login screen).

**The Muted Table Rule.** All data tables and lists must use Light Border Gray (#e2e8f0) and neutral text. Saturated colors are reserved exclusively for status indicators (Success Emerald, Error Ruby, Warning Amber, or Info Blue).

## 3. Typography

**Display Font:** Sarabun (with `"Segoe UI", Tahoma, Geneva, Verdana, sans-serif` fallback stack)
**Body Font:** Sarabun (with system sans-serif fallback)

The typography pairings focus on the Sarabun font family, which integrates corporate elegance with clean bilingual Thai/English legibility. The font is loaded via Google Fonts (`wght@300;400;500;600;700`). Text rendering is enhanced with `-webkit-font-smoothing: antialiased` and `-moz-osx-font-smoothing: grayscale`.

### Hierarchy

- **Display** (bold, 1.75rem, 1.2): Title headers for pages, styled with a Royal Indigo-to-Purple gradient clip via `-webkit-background-clip: text`.
- **Headline** (semibold, 1.5rem, 1.3): Major section headings and modal headers. Scales down to 1.5rem on tablets.
- **Title** (semibold, 1.25rem, 1.4): Card titles (`h2` in `.leave-balance-card`, `.recent-requests-card`), modal content headings, and sidebar category labels.
- **Body** (regular, 1rem, 1.5): Standard paragraphs, table content, form instructions, and confirm modal messages.
- **Label** (medium, 0.9rem, 1.4): Form input labels, table header columns, button labels, sidebar link text, toast messages, and alert text.

### Responsive Scaling

The base `html` font-size scales down at responsive breakpoints:
- **Desktop**: 16px (default)
- **Tablet** (≤768px): 15px
- **Mobile** (≤480px): 14px

## 4. Elevation

The elevation system uses a flat-by-default hybrid structure. Background fills, light borders, and color contrasts denote layout hierarchy, while shadows are limited to active or floating states.

### Shadow Vocabulary

- **sidebar-shadow** (`4px 0 20px rgba(102, 126, 234, 0.25)`): Applied to the main sidebar to separate it from the content panel.
- **mobile-header-shadow** (`0 2px 10px rgba(102, 126, 234, 0.25)`): Applied to the sticky mobile header bar.
- **card-shadow** (`0 4px 20px rgba(0, 0, 0, 0.08)`): Diffuse shadow used for floating page sections, empty-state cards, and status cards.
- **card-shadow-light** (`0 4px 20px rgba(0, 0, 0, 0.05)`): Lighter variant used for skeleton placeholder cards and stat cards.
- **toast-shadow** (`0 10px 40px rgba(0, 0, 0, 0.15)`): Applied to toast notification cards and notification dropdown panels.
- **confirm-modal-shadow** (`0 25px 80px rgba(0, 0, 0, 0.2)`): Deep shadow for confirm dialog modals to establish strong depth hierarchy.
- **notification-dropdown-shadow** (`0 -10px 40px rgba(0, 0, 0, 0.2)`): Upward shadow for the notification dropdown when expanded from the sidebar footer.
- **mobile-sidebar-shadow** (`10px 0 30px rgba(0, 0, 0, 0.25)`): Applied to the sidebar when opened as an overlay on mobile/tablet.
- **modal-overlay** (`rgba(0, 0, 0, 0.5)`): Backdrop tint for standard modals.
- **confirm-overlay** (`rgba(0, 0, 0, 0.5)` with `backdrop-filter: blur(4px)`): Blurred backdrop for confirm dialogs.
- **loading-overlay** (`rgba(255, 255, 255, 0.9)` with `backdrop-filter: blur(4px)`): Semi-transparent white overlay for loading states.
- **sidebar-mobile-overlay** (`rgba(0, 0, 0, 0.55)` with `backdrop-filter: blur(2px)`): Backdrop tint when the sidebar is open on mobile/tablet.

### Named Rules

**The Flat-at-Rest Rule.** All stat-cards, dashboard cards, and form containers remain flat at rest with a `2px solid #e2e8f0` border and no shadow. Shadows are applied only on transient/floating elements like modals, toasts, notification dropdowns, and the sidebar.

## 5. Layout

### Desktop Layout (>1024px)

The desktop view uses a **fixed sidebar + scrollable content** layout:

- **Sidebar**: Fixed position, `width: 260px`, `height: 100vh`, with the Indigo-to-Purple gradient background.
- **Main Content**: `margin-left: 260px`, `width: calc(100% - 260px)`, transitions smoothly with `cubic-bezier(0.4, 0, 0.2, 1)`.
- **Content Padding**: Page content views receive `padding: 2.5rem 3.5rem` when inside the layout.
- **Form-heavy pages** (LeaveRequest, Profile) have their inner containers constrained to `max-width: 1000px` and centered with `margin: 0 auto`.

### Mobile / Tablet Layout (≤1024px)

At the sidebar-collapse breakpoint (≤1024px), the layout switches to a **mobile header + slide-in sidebar** pattern:

- **Mobile Header**: Sticky top bar (`height: 60px`) with the Indigo-to-Purple gradient, containing a hamburger button, brand logo/title, and notification bell.
- **Sidebar**: Slides in from the left (`transform: translateX(-100%)` → `translateX(0)`), `width: 280px`, `z-index: 1100`, with a dark backdrop overlay behind it.
- **Main Content**: Expands to full width (`margin-left: 0`, `width: 100%`).
- **Mobile Header** shrinks to `height: 56px` on phones (≤480px).

### Responsive Breakpoints

| Breakpoint | Target | Key Changes |
|---|---|---|
| `>1024px` | Desktop | Fixed sidebar, full content padding |
| `≤1024px` | Tablet / Small desktop | Sidebar collapses to slide-in drawer, mobile header appears |
| `≤768px` | Tablet | Font-size scales to 15px, modals reduce padding, modal actions stack vertically |
| `≤480px` | Mobile phone | Font-size scales to 14px, modals bottom-sheet style (`border-radius: 20px 20px 0 0`), form inputs use `16px` to prevent iOS zoom |
| `(hover: none) and (pointer: coarse)` | Touch devices | Hover transforms disabled, replaced with `:active` press effects (`scale(0.97)`), `touch-action: manipulation` on buttons |
| `(orientation: landscape)` + `≤768px` | Landscape phones | Modal `max-height` reduced to 85vh |

## 6. Components

Components are styled with clear visual states and consistent border-radii depending on their function.

### Buttons

- **Primary / Add** (`.add-btn`): Indigo-to-Purple gradient background, `border-radius: 10px`, `padding: 0.75rem 1.5rem`, `min-height: 44px`. Hover: `translateY(-2px)` lift with `0 5px 15px rgba(102, 126, 234, 0.4)` shadow. Focus-visible: `0 0 0 4px rgba(102, 126, 234, 0.4)` ring.
- **Submit / Save** (`.submit-btn`, `.save-btn-standard`, `.confirm-ok-btn`): Green (#00d704) background, `border-radius: 8px`, `padding: 0.875rem`, `height: 45px`. Hover: background shifts to #30df2a with `0 0 0 5px #b3f8a0` glow ring.
- **Cancel / Reset** (`.cancel-btn`, `.confirm-cancel-btn-pass`): Red (#fd1313) background, `border-radius: 8px`, `padding: 0.875rem`, `height: 45px`. Hover: background shifts to #f84040 with `0 0 0 5px #ff88095f` glow ring.
- **Sidebar Logout** (`.sidebar-logout-btn`): Translucent white (`rgba(255,255,255,0.12)`) background, `border-radius: 8px`, `min-height: 40px`. Hover: shifts to red (`rgba(239, 68, 68, 0.85)`) with red shadow.
- **Disabled State**: `opacity: 0.6`, `cursor: not-allowed`.

### Inputs / Fields

- **Style:** Border `2px solid #e2e8f0`, `border-radius: 12px`, `padding: 0.875rem 1rem`.
- **Focus:** Outlines are hidden; border-color shifts to Corporate Royal Indigo (#667eea) with a `0 0 0 4px rgba(102, 126, 234, 0.1)` soft glow.
- **Mobile (≤480px):** Padding reduces to `0.75rem`, font-size forced to `16px` to prevent iOS auto-zoom.
- **Inheritance:** All `button`, `input`, `select`, `textarea` elements inherit `font-family` from the body.

### Cards / Containers

- **Large Sections** (empty-state, modal-content, confirm-modal): `border-radius: 20px`.
- **Standard Cards** (stat-card, leave-balance-card, recent-requests-card, section cards): `border-radius: 16px`, `border: 2px solid #e2e8f0`, white background, no shadow at rest.
- **Stat Icon Container**: `border-radius: 14px`.
- **Internal Padding:** Cards use `padding: 2rem` (32px) for main containers, `padding: 1.5rem` (24px) for sections and stat-cards.
- **Skeleton Cards:** Follow the same 16px radius, use `box-shadow: 0 4px 20px rgba(0,0,0,0.05)` as lightweight placeholders.

### Navigation (Sidebar)

- **Container:** Fixed sidebar, `width: 260px`, `height: 100vh`, `background: linear-gradient(135deg, #667eea 0%, #764ba2 100%)`, `box-shadow: 4px 0 20px rgba(102, 126, 234, 0.25)`.
- **Links:** `border-radius: 10px`, `padding: 0.75rem 1rem`, white text at `rgba(255,255,255,0.85)`.
- **Hover:** Background shifts to `rgba(255,255,255,0.12)`, text becomes fully white.
- **Active:** Background `rgba(255,255,255,0.22)`, fully white text, `font-weight: 500`, subtle `box-shadow: 0 4px 12px rgba(0,0,0,0.08)`.
- **Sub-links:** `border-radius: 8px`, `font-size: 0.85rem`, active state uses `rgba(255,255,255,0.18)`.
- **Dropdown Accordion:** Uses `max-height` transition with `cubic-bezier(0.4, 0, 0.2, 1)` for smooth expand/collapse. Arrow icon rotates 180° when open.
- **Footer:** Contains user profile link, notification bell (desktop only), and logout button. Separated by a `1px solid rgba(255,255,255,0.12)` top border with `rgba(0,0,0,0.08)` background tint.

### Mobile Header

- **Container:** Sticky top, `height: 60px`, `background: linear-gradient(135deg, #667eea 0%, #764ba2 100%)`, `box-shadow: 0 2px 10px rgba(102, 126, 234, 0.25)`. Hidden on desktop (>1024px).
- **Hamburger Button:** `40px × 40px`, `border-radius: 8px`, `background: rgba(255,255,255,0.15)`.
- **Brand:** Logo image (`32px × 32px`) + title text (`font-weight: 700`, `font-size: 1.05rem`).
- **Actions:** Right-aligned notification bell.

### Toast Notifications

- **Container:** Fixed, `top: 20px`, `right: 20px`, `z-index: 10000`, `max-width: 400px`.
- **Card:** White background, `border-radius: 12px`, `box-shadow: 0 10px 40px rgba(0,0,0,0.15)`, `min-width: 280px`. Slides in from the right (`translateX(100%)` → `translateX(0)`).
- **Variants:** Differentiated by a `4px` left border:
  - **Success:** border #10b981, gradient background `#ecfdf5 → #d1fae5`.
  - **Error:** border #ef4444, gradient background `#fef2f2 → #fecaca`.
  - **Warning:** border #f59e0b, gradient background `#fffbeb → #fef3c7`.
  - **Info:** border #3b82f6, gradient background `#eff6ff → #dbeafe`.

### Confirm Modal

- **Overlay:** Full-screen inset, `rgba(0,0,0,0.5)` with `backdrop-filter: blur(4px)`, `z-index: 10001`.
- **Modal:** White background, `border-radius: 20px`, `padding: 30px`, `max-width: 400px`, `box-shadow: 0 25px 80px rgba(0,0,0,0.2)`. Enters with scale animation (`scale(0.9)` → `scale(1)`).

### Inline Alerts

- **Style:** `padding: 1rem`, `border-radius: 12px`, `font-size: 0.9rem`.
- **Error:** Background gradient `#fee2e2 → #fecaca`, text color #dc2626.
- **Success:** Background gradient `#d1fae5 → #a7f3d0`, text color #059669.

### Loading States

The system has multiple loading patterns:

- **PageLoader** (Suspense fallback): Full-viewport centered, gradient background `#f5f7fa → #e4e8ec`, triple-ring spinner (60px).
- **Loading Component** (reusable): Supports `small` (30px), `medium` (50px), `large` (70px), `fullpage` (60px), and `overlay` variants. Triple-ring design using Indigo / Purple / Amethyst colors.
- **Inline Spinner** (`.spinner-simple`): 20px circle, `2px` border, for buttons and inline contexts.
- **Loading Text:** Indigo-colored (#667eea), `font-weight: 500`, pulsing opacity animation (`1 → 0.5 → 1` over 1.5s).

### Skeleton Loading

- **Base:** Shimmer animation using a 90° gradient (`#f0f0f0 → #e0e0e0 → #f0f0f0`), `background-size: 200%`, animates over 1.5s.
- **Variants:** `.skeleton.circle` (50% radius), `.skeleton.text` (4px radius), `.skeleton.title` (6px radius), `.skeleton.badge` (20px radius), `.skeleton.button` (10px radius).
- **Composite Skeletons:** Dashboard, table, card-grid, stat-card, balance-item, request-item, leave-card, and approval-card skeletons that mirror the layout of their real counterparts.

### Notification Bell

- **Bell Button:** `font-size: 1.5rem`, scales to 1.1× on hover.
- **Badge:** Absolute-positioned, gradient background (`#ff6b6b → #ee5a5a`), `border-radius: 10px`, `font-size: 0.7rem`.
- **Dropdown:** `width: 350px`, `max-height: 450px`, `border-radius: 12px`, white background, `box-shadow: 0 10px 40px rgba(0,0,0,0.15)`. Header uses the Indigo-to-Purple gradient. Slides down from top (`translateY(-10px)` → `translateY(0)`).
- **Sidebar variant:** Dropdown opens upward from the sidebar footer, repositioned with `bottom: calc(100% + 12px)`.
- **Mobile variant (≤768px):** Dropdown becomes full-width fixed overlay at `top: 60px`.

### Scrollbar

- **Track:** `width: 8px`, `background: #f1f1f1`, `border-radius: 4px`.
- **Thumb:** Indigo-to-Purple gradient, `border-radius: 4px`. Hover: solid `#5a67d8`.
- **Sidebar Menu Scrollbar:** Slim `4px` width, transparent track, `rgba(255,255,255,0.2)` thumb.

## 7. Animations

All animations use performance-safe properties (`transform`, `opacity`) and follow consistent timing conventions.

| Name | Duration | Easing | Usage |
|---|---|---|---|
| `slideUp` | 0.3s | `ease` | Modal content entry (translateY 20px → 0) |
| `slideIn` | 0.3s | `ease-out` | Toast notification entry (translateX 100% → 0) |
| `slideDown` | 0.2s | `ease` | Notification dropdown entry (translateY -10px → 0) |
| `slideUpAcc` | 0.25s | `cubic-bezier(0.4,0,0.2,1)` | Sidebar notification dropdown upward entry |
| `scaleIn` | 0.3s | `ease-out` | Confirm modal entry (scale 0.9 → 1) |
| `fadeIn` | 0.2s | `ease` | Sidebar overlay, confirm overlay backdrop |
| `spin` / `spinner-rotate` / `unified-spin` | 0.8s–1.2s | `linear` / `cubic-bezier(0.5,0,0.5,1)` | Triple-ring spinners and inline spinners |
| `pulse` / `text-pulse` / `pulse-text` | 1.5s | `ease-in-out`, infinite | Loading text opacity pulse |
| `shimmer` | 1.5s | `ease-in-out`, infinite | Skeleton loading gradient sweep |

### Transition Defaults

- **Buttons:** `transition: all 0.3s` or `transition: transform 0.2s, box-shadow 0.2s`.
- **Sidebar links:** `transition: all 0.25s ease`.
- **Form inputs:** `transition: all 0.2s`.
- **Sidebar collapse:** `transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)`.

## 8. Do's and Don'ts

### Do:

- **Do** maintain WCAG 2.1 AA compliant color contrast (minimum 4.5:1 ratio) for all body copy and placeholder text.
- **Do** use the documented border-radius scale: 8px for buttons, 10px for interactive elements and nav links, 12px for inputs/alerts/toast/dropdowns, 14px for icon containers, 16px for standard cards, 20px for large sections and modals.
- **Do** ensure all form labels use the Sarabun font with a weight of 500 or higher.
- **Do** use `2px solid #e2e8f0` borders for cards and containers at rest instead of shadows (Flat-at-Rest Rule).
- **Do** use the triple-ring spinner (Indigo → Purple → Amethyst) consistently for all loading states.
- **Do** use `backdrop-filter: blur()` only on overlays (confirm dialog, loading overlay, sidebar mobile backdrop).
- **Do** ensure the sidebar notification dropdown opens upward on desktop and converts to a fixed full-width panel on mobile.
- **Do** prevent iOS auto-zoom by setting `font-size: 16px` on form inputs at the ≤480px breakpoint.

### Don't:

- **Don't** use over-rounded card borders greater than 20px (e.g. 32px or 40px) as they read as an amateur AI scaffold.
- **Don't** combine a 1px solid border with a soft wide drop shadow (M ≥ 16px) on cards or buttons (avoid the "ghost-card" pattern).
- **Don't** use gradient text backgrounds on dense admin views—gradient text is reserved only for `.page-header h1` display titles.
- **Don't** add tiny uppercase tracked kicker text (eyebrows) above every section heading as visual decoration.
- **Don't** use diagonal stripe backgrounds, sketchy SVG illustrations, or fake doodle assets.
- **Don't** apply hover lift transforms (`translateY(-2px)`) on touch devices; use `:active` scale effects instead.
- **Don't** use `box-shadow` on stat-cards or dashboard content cards at rest—these should stay flat with borders only.
