# Email KB Assistant — UI Redesign Plan v2

> **Purpose**: Complete visual redesign from flat Tailwind UI to glassmorphism aesthetic
> **Design Source**: 7 Stitch mockup screens + 2 Project Briefs
> **CRITICAL**: This is a VISUAL-ONLY redesign — do NOT change any functionality, IPC handlers, services, or business logic.
> **Read CLAUDE.md first.**

---

## Reference Images

The following mockup images are in the project root directory. Study ALL of them before starting:

| File | Screen | Key Elements to Extract |
|:-----|:-------|:----------------------|
| `mockup-splash.png` | Splash/Setup Wizard | Dark gradient bg, centered gold-bordered frosted card, gold italic title, "Get Started" gold button |
| `mockup-compose.png` | Compose (original) | Left sidebar nav, two-panel layout (Drafting + Output), frosted glass cards, channel toggles, Generate/Polish buttons |
| `mockup-compose-fetch.png` | Compose with Gmail Fetch | Three-section vertical layout: Gmail Fetch panel (top), Drafting (middle), Output (bottom). "Fetch Today" gold button, email list with avatar+name+subject+gold dot, "Today" dropdown |
| `mockup-contacts.png` | Contact Directory | Pinned Contacts in gold-bordered card, All Contacts below, avatar circles, name+email+badge per row, search bar |
| `mockup-settings.png` | Application Settings | Stacked frosted cards, gold italic headings, "Connect Gmail" maroon button, language selector |
| `mockup-templates.png` | Template Library | 2-column grid of frosted cards, template name bold, task type badges (gold/blue), "STRICT" maroon badge, Edit/Delete icons, "+ New Template" gold button |
| `mockup-kb.png` | Knowledge Base | Upload Zone (dashed border, folder icon), Fetch Web Page card, File List table with doc icons, size, Indexed/Pending badges |

---

## Design System (extracted from mockups)

### Background

```css
/* App-wide background: deep maroon-to-black gradient */
.app-bg {
  background: linear-gradient(160deg, #5C1530 0%, #2A0E1A 40%, #0D0508 100%);
  min-height: 100vh;
}
```

### Frosted Glass Cards

```css
/* Standard card (used for all panels and sections) */
.glass-card {
  background: rgba(140, 29, 64, 0.2);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 20px;
  padding: 20px;
}

/* Gold-accented card (Pinned Contacts, active sections, splash card) */
.glass-card-gold {
  background: rgba(255, 198, 39, 0.08);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1.5px solid rgba(255, 198, 39, 0.4);
  border-radius: 20px;
  padding: 20px;
}

/* Nested lighter card (input areas, contact rows, template cards, file rows) */
.glass-card-inner {
  background: rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 14px;
  padding: 14px;
}

/* Upload zone (dashed border) */
.glass-upload-zone {
  background: rgba(140, 29, 64, 0.15);
  border: 2px dashed rgba(255, 198, 39, 0.5);
  border-radius: 16px;
  padding: 30px;
  text-align: center;
}
```

### Colors

```css
:root {
  /* Primary */
  --maroon: #8C1D40;
  --gold: #FFC627;

  /* Background gradient stops */
  --bg-start: #5C1530;
  --bg-mid: #2A0E1A;
  --bg-end: #0D0508;

  /* Neutrals */
  --white: #FAFAFA;
  --gray-light: #BFBFBF;
  --gray-dark: #484848;

  /* Accents */
  --blue: #00A3E0;
  --turquoise: #4AB7C4;

  /* Text */
  --text-primary: #FAFAFA;
  --text-heading: #FFC627;
  --text-label: #BFBFBF;
  --text-placeholder: rgba(255, 255, 255, 0.35);

  /* Badges */
  --badge-faculty: #8C1D40;
  --badge-student: #FFC627;
  --badge-admin: #00A3E0;
  --badge-external: #4AB7C4;
  --badge-strict: #8C1D40;
  --badge-indexed: #4AB7C4;
  --badge-pending: #FFC627;
  --badge-fund: #FFC627;
  --badge-student-comm: #00A3E0;
}
```

### Typography

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  color: var(--text-primary);
}

/* Page titles: gold, italic, large */
.page-title {
  color: var(--gold);
  font-style: italic;
  font-weight: 700;
  font-size: 1.75rem;
}

/* Section headings inside cards: gold, italic */
.section-heading {
  color: var(--gold);
  font-style: italic;
  font-weight: 600;
  font-size: 1.2rem;
}

/* Field labels: muted gray, regular weight */
.field-label {
  color: var(--text-label);
  font-weight: 400;
  font-size: 0.85rem;
}

/* Body text: white/near-white */
.body-text {
  color: var(--text-primary);
  font-weight: 400;
  font-size: 0.95rem;
  line-height: 1.5;
}
```

### Buttons

```css
/* Primary: solid gold bg, maroon text (Generate, Fetch Today, Get Started, + New Template) */
.btn-gold {
  background: var(--gold);
  color: var(--maroon);
  font-weight: 600;
  border: none;
  border-radius: 12px;
  padding: 12px 28px;
  cursor: pointer;
}
.btn-gold:hover {
  background: #e6b220;
}

/* Secondary: gold outline, gold text (Polish, Browse) */
.btn-gold-outline {
  background: transparent;
  color: var(--gold);
  border: 1.5px solid var(--gold);
  border-radius: 12px;
  padding: 12px 28px;
  cursor: pointer;
}

/* Accent: maroon bg, white text (Connect Gmail, Fetch & Add, Polish in new mockup) */
.btn-maroon {
  background: var(--maroon);
  color: white;
  font-weight: 600;
  border: none;
  border-radius: 12px;
  padding: 12px 28px;
  cursor: pointer;
}
```

### Form Inputs

```css
input, textarea, select {
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 10px;
  color: var(--text-primary);
  padding: 10px 14px;
  font-size: 0.95rem;
}
input::placeholder, textarea::placeholder {
  color: var(--text-placeholder);
}
input:focus, textarea:focus, select:focus {
  border-color: var(--gold);
  outline: none;
  box-shadow: 0 0 0 2px rgba(255, 198, 39, 0.2);
}
```

### Channel Toggles

```css
/* Toggle switch: gold circle on maroon track when active, gray circle on dark track when inactive */
/* Reference: Compose screen (mockup-compose.png) Email/WeChat/Slack toggles */
```

### Contact Badges

```css
.badge {
  display: inline-block;
  padding: 3px 12px;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
}
.badge-faculty   { background: rgba(140,29,64,0.7); color: white; }
.badge-student   { background: rgba(255,198,39,0.7); color: #1A0A10; }
.badge-admin     { background: rgba(0,163,224,0.6); color: white; }
.badge-external  { background: rgba(74,183,196,0.6); color: white; }
.badge-strict    { background: rgba(140,29,64,0.8); color: white; font-size: 0.7rem; }
.badge-indexed   { background: rgba(74,183,196,0.7); color: white; }
.badge-pending   { background: rgba(255,198,39,0.7); color: #1A0A10; }
```

### Left Sidebar Navigation

```css
/* Fixed left sidebar: ~80px wide, semi-transparent dark maroon */
.sidebar {
  width: 80px;
  background: rgba(30, 8, 18, 0.85);
  backdrop-filter: blur(16px);
  border-right: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 20px;
  gap: 24px;
}

/* Nav item: icon + label stacked vertically */
.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.7rem;
  cursor: pointer;
}
.nav-item.active {
  color: var(--gold);
}
.nav-item .icon {
  width: 24px;
  height: 24px;
}
/* Active item has gold icon and gold text label */
```

---

## Screen-by-Screen Implementation

### 1. SPLASH / SETUP WIZARD
**Reference**: `mockup-splash.png`

- Full-screen dark gradient background (no sidebar)
- Centered frosted card with gold border (glass-card-gold)
- Title "Email KB Assistant" in gold, italic, large
- Language dropdown (frosted input)
- Storage Path input + "Browse" button (btn-gold-outline)
- "Get Started" button: full-width btn-gold
- Below the card: dark empty space

### 2. COMPOSE SCREEN (Desktop Layout)
**Reference**: `mockup-compose.png` + `mockup-compose-fetch.png`

Desktop layout (1280x800) — adapt the mobile vertical layout to horizontal:

```
┌──────┬─────────────────┬──────────────────┬──────────────────┐
│      │  Gmail Fetch     │  Drafting         │  Output          │
│ Side │  ┌────────────┐ │  ┌─────────────┐  │  ┌────────────┐ │
│ bar  │  │Fetch Today │ │  │Contact      │  │  │Subject:... │ │
│      │  │email list  │ │  │Channel      │  │  │Dear Dr...  │ │
│      │  │with avatars│ │  │Core Content │  │  │body text   │ │
│      │  │& gold dots │ │  │             │  │  │            │ │
│      │  └────────────┘ │  │Generate|Polish│ │  │            │ │
│      │                  │  └─────────────┘  │  └────────────┘ │
└──────┴─────────────────┴──────────────────┴──────────────────┘
```

- Left sidebar with Compose highlighted in gold
- **Gmail Fetch panel** (left column, ~25% width): glass-card with gold border
  - "Gmail Fetch" heading in gold italic
  - "Fetch Today" btn-gold + "Today" dropdown (top right of card)
  - Email list: each row is glass-card-inner with avatar circle + sender name + truncated subject + gold unread dot
- **Drafting panel** (center column, ~35% width): glass-card
  - "Drafting" heading in gold italic
  - Contact dropdown (frosted select)
  - Channel: "Email | WeChat | Slack" toggle row
  - Core Content textarea (large, frosted)
  - Generate (btn-gold) and Polish (btn-maroon) buttons side by side below
- **Output panel** (right column, ~40% width): glass-card
  - "Output" heading in gold italic
  - "Subject:" label in gold, subject text in white
  - Email body in white text
  - Action buttons below (Copy, Edit, Save, etc.)

### 3. CONTACTS SCREEN
**Reference**: `mockup-contacts.png`

- Left sidebar with Contacts highlighted
- Search bar at top (frosted input with search icon)
- **Pinned Contacts** section: glass-card-gold container
  - Each contact: glass-card-inner row with avatar circle + name (white bold) + email (gray) + badge
- **All Contacts** section: heading "All Contacts" in white
  - Same row style, but without gold border container
  - Each row: glass-card-inner

### 4. SETTINGS SCREEN
**Reference**: `mockup-settings.png`

- Left sidebar with Settings highlighted (or back arrow + title as shown)
- Title "Application Settings" in gold italic
- Stacked glass-card sections:

  **AI Provider card**: gold heading, dropdown select for provider
  **Gmail Connection card**: gold heading, "Connect Gmail" btn-maroon with Google icon, status text
  **Language Preference card**: gold heading, language selector
  **My Profile card**: gold heading, textarea
  **Writing Style card**: gold heading, style list
  **IMAP card**: gold heading (simplified since OAuth replaces password fields)
  **Keyboard Shortcuts card**: gold heading, shortcuts list
  **About card**: gold heading, version info

### 5. TEMPLATES SCREEN
**Reference**: `mockup-templates.png`

- Left sidebar with Templates highlighted
- Title "Templates" in white/bold + "+ New Template" btn-gold (top right)
- 2-column grid of template cards (glass-card-inner with gold border)
- Each card:
  - Template name: bold white, large
  - Task type badge: "Fund Approval" (badge in gold), "Student Communication" (badge in blue)
  - "STRICT" badge (maroon badge) if applicable
  - Content preview: 2 lines of gray text
  - Bottom: Edit icon (pencil) + Delete icon (trash), both in gold/muted

### 6. KNOWLEDGE BASE SCREEN
**Reference**: `mockup-kb.png`

- Left sidebar with KB highlighted
- Title "Knowledge Base" in gold italic
- Top section: two cards side by side
  - **Upload Zone** (left): glass-upload-zone with folder icon + "Drop files here or browse" text
  - **Fetch Web Page** (right): glass-card-inner with URL input + "Fetch & Add" btn-maroon
- Bottom section: **File List** glass-card
  - "File List" heading in white bold
  - Table headers: Document Name, Size, Status (in gray)
  - Each row: file type icon (PDF red, DOC blue) + filename + size + status badge (Indexed=turquoise, Pending=gold)

### 7. OTHER PAGES (Search, Drafts, Projects, Analytics, Help)

Apply the same visual system:
- Dark gradient background
- Left sidebar navigation
- Content in glass-card containers
- Gold italic headings
- White body text, gray labels
- Frosted inputs and buttons following the established patterns

---

## Implementation Phases

### Phase A: Global Foundation (do first)

1. **Create `src/renderer/styles/glassmorphism.css`** with all CSS from this plan (variables, card classes, button classes, input overrides, badge classes, sidebar styles, typography)
2. **Import in `src/renderer/main.tsx`**: `import './styles/glassmorphism.css'`
3. **Add Inter font**: In `index.html` add `<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">`
4. **Update root layout**: Change the app shell from top-header + content to left-sidebar + content
   - Current: horizontal header bar with nav tabs across the top
   - New: vertical sidebar (80px wide, left side) with icon+label nav items
   - Main content area fills remaining width
5. **Apply dark gradient background** to root container
6. **Override Tailwind defaults**: Any `bg-white`, `bg-gray-*`, `text-gray-*` classes that conflict with the dark theme must be replaced

After Phase A: run `npm run dev` and verify the app has dark background + left sidebar. Content will look broken — that's expected.

### Phase B: Screen-by-Screen Restyling (do in this order)

1. **SetupWizard.tsx** — Splash screen (simplest, standalone)
2. **Sidebar/Header navigation** — Convert top tabs to left sidebar
3. **Compose page components**: InputPanel, OutputPanel, ModeToggle, ChannelSelector, ContactSelector, BackgroundBox, CoreContentBox, AttachmentArea, RevisionBox, ActionButtons, EmailFetchPanel
4. **ContactsPage.tsx** + ContactInfoPanel + HistoryPanel
5. **SettingsPage.tsx** + all settings sub-pages (General, MyProfile, WritingStyle, Templates, Skills, KB, IMAP, About)
6. **Templates page** (within Settings or standalone)
7. **Knowledge Base page** (within Settings)
8. **Other pages**: SearchPage, DraftsPage, ProjectsPage, AnalyticsPage, HelpPage
9. **Dialog components**: ThreadSaveDialog, NewContactDialog, DraggableDialog, FeatureTooltip
10. **StatusBar.tsx**

After each group: run `npm run dev` and verify visually.

### Phase C: Polish

1. Verify all 3 languages (EN/ZH/ES) — text readable on dark backgrounds
2. Check WCAG AA contrast for all text elements
3. Test all buttons, toggles, dropdowns, dialogs function correctly
4. Verify no functionality is broken
5. `npx tsc --noEmit` — must pass clean
6. `npm run build` — no build errors

---

## Critical Rules

1. **VISUAL ONLY** — do NOT change any TypeScript logic, IPC handlers, services, or business logic
2. **Do NOT change component props or state logic** — only className, style, and CSS
3. **Do NOT remove any functionality** — every button, input, and feature must still work
4. **The app is DESKTOP (1280x800+)** — the Stitch mockups are mobile proportions. Adapt to desktop: wider panels, horizontal multi-column layouts where the mockups show vertical stacking
5. **Compose page must be 3-column on desktop** (Gmail Fetch | Drafting | Output) — not vertically stacked as in the mobile mockup
6. **Templates page must be 2-column grid on desktop** — matching the mockup but wider cards
7. **Knowledge Base upload + fetch must be side-by-side on desktop** — not stacked
8. **Keep all i18n translations working** — t() calls unchanged
9. **Use Tailwind utility classes where possible** — supplement with custom CSS only for backdrop-filter and glassmorphism effects
10. **Test after each Phase B group** — run `npm run dev` and visually inspect

---

## Instructions for Claude Code

```
Read CLAUDE.md first, then read UI-REDESIGN-PLAN.md.
Look at ALL 7 mockup images in the project root for visual reference:
- mockup-splash.png
- mockup-compose.png
- mockup-compose-fetch.png
- mockup-contacts.png
- mockup-settings.png
- mockup-templates.png
- mockup-kb.png

This is a VISUAL-ONLY redesign. Do NOT change any functionality.

Start with Phase A: Global Foundation.
1. Create glassmorphism.css
2. Add Inter font to index.html
3. Convert top header nav to left sidebar
4. Apply dark gradient background
5. Run npm run dev and describe what the app looks like

Then Phase B: screen by screen, in order listed.
After each group, run npm run dev and report visual status.

Finally Phase C: polish and verify.
Run npx tsc --noEmit at the end.

CRITICAL DESKTOP ADAPTATION:
- Compose = 3-column horizontal layout (fetch | draft | output)
- Templates = 2-column card grid
- KB = upload zone + fetch side by side
- All mockups are mobile — stretch to fill 1280x800 desktop
```
