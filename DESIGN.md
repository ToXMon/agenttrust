# AgentTrust Design System

> Visual language and component specification for the AgentTrust frontend.
> Derived from the Stripe design system, adapted for Web3 agent commerce on Base.

**Reference preview:** `docs/reference/stripe-preview.html`

---

## Table of Contents

1. [Visual Theme and Atmosphere](#1-visual-theme-and-atmosphere)
2. [Color Palette and Roles](#2-color-palette-and-roles)
3. [Typography Rules](#3-typography-rules)
4. [Component Styling](#4-component-styling)
5. [Layout Principles](#5-layout-principles)
6. [Depth and Elevation](#6-depth-and-elevation)
7. [Responsive Behavior](#7-responsive-behavior)
8. [Agent Prompt Guide](#8-agent-prompt-guide)

---

## 1. Visual Theme and Atmosphere

### Overall Impression

AgentTrust communicates **institutional trust meets Web3 innovation**. The interface should feel like a premium fintech dashboard -- clean, precise, and confidence-inspiring -- while embracing the decentralized identity and on-chain verification that sets it apart.

### Atmosphere Keywords

- **Precise** -- Every pixel is intentional. Generous whitespace, sharp borders, no visual clutter.
- **Trustworthy** -- Purple as the anchor color evokes reliability. No playful gradients or noise.
- **Technical** -- Monospace fonts for on-chain data (ENS names, tx hashes, trust scores) signal blockchain-native design.
- **Layered** -- Subtle elevation through shadows creates depth without heaviness. Cards float, never sink.

### Design Principles

1. **Trust is visual** -- Trust scores, verification badges, and agent reputation are the primary visual hierarchy. They should be the first thing a user sees and understands.
2. **Data is first-class** -- Transaction feeds, on-chain events, and agent messages use monospace typography with semantic colors. Technical data is beautiful, not hidden.
3. **Progressive disclosure** -- Cards show summaries. Detail views show everything. Never overwhelm the initial view.
4. **Stripe-grade polish** -- Every hover state, focus ring, shadow transition, and loading skeleton must feel intentional and smooth.

### What to Avoid

- Dark mode (not in scope for hackathon MVP)
- Gradient backgrounds (flat white only)
- Rounded/cute illustration style
- Neon colors or saturated accents beyond the defined palette
- Playful typefaces

---

## 2. Color Palette and Roles

### CSS Custom Properties

```css
:root {
  /* Primary Brand */
  --purple: #533afd;
  --purple-hover: #4434d4;
  --purple-deep: #2e2b8c;
  --purple-light: #b9b9f9;
  --purple-mid: #665efd;

  /* Neutral & Text */
  --navy: #061b31;
  --dark-navy: #0d253d;
  --brand-dark: #1c1e54;
  --white: #ffffff;
  --slate: #64748d;
  --dark-slate: #273951;

  /* Semantic */
  --ruby: #ea2261;
  --magenta: #f96bee;
  --magenta-light: #ffd7ef;
  --success: #15be53;
  --success-text: #108c3d;
  --lemon: #9b6829;

  /* Borders */
  --border: #e5edf5;
  --border-purple: #b9b9f9;
  --border-soft: #d6d9fc;
}
```

### Color Roles

| Role | Token | Hex | Usage |
|------|-------|-----|-------|
| **Primary CTA** | `--purple` | `#533afd` | Primary buttons, links, active states, trust indicators |
| **Primary Hover** | `--purple-hover` | `#4434d4` | Button hover states |
| **Brand Deep** | `--purple-deep` | `#2e2b8c` | Headlines on dark backgrounds, footer |
| **Brand Light** | `--purple-light` | `#b9b9f9` | Borders on ghost buttons, trust score medium fill |
| **Brand Mid** | `--purple-mid` | `#665efd` | Gradients, secondary accents |
| **Body Text** | `--navy` | `#061b31` | All primary body text, headings |
| **Dark Background** | `--dark-navy` | `#0d253d` | Dark sections, code blocks |
| **Secondary Text** | `--slate` | `#64748d` | Descriptions, metadata, timestamps |
| **Label Text** | `--dark-slate` | `#273951` | Form labels, nav items |
| **Error / Destructive** | `--ruby` | `#ea2261` | Error states, failed transactions, revocation |
| **Success / On-Chain** | `--success` | `#15be53` | Verified badges, successful transactions, Base chain indicator |
| **Success Text** | `--success-text` | `#108c3d` | Success badge text, positive amounts |
| **Warning / Pending** | `--lemon` | `#9b6829` | Pending states, caution indicators |
| **Accent** | `--magenta` | `#f96bee` | Maximum trust gradient endpoint, special highlights |
| **Border Default** | `--border` | `#e5edf5` | Card borders, dividers, input borders |
| **Border Purple** | `--border-purple` | `#b9b9f9` | Ghost button borders, purple-themed borders |
| **Background** | `--white` | `#ffffff` | Page background, card backgrounds |

### AgentTrust-Specific Color Usage

#### Trust Score Gradient

Trust scores use a purple gradient scale to communicate agent reliability at a glance:

| Score Range | Color | Token | CSS |
|-------------|-------|-------|-----|
| 0-25 (Low) | Slate gray | `--slate` | `background: var(--slate)` |
| 26-55 (Medium) | Light purple | `--purple-light` | `background: var(--purple-light)` |
| 56-85 (High) | Purple | `--purple` | `background: var(--purple)` |
| 86-100 (Maximum) | Purple to Magenta gradient | `--purple` to `--magenta` | `background: linear-gradient(90deg, var(--purple), var(--magenta))` |

#### Base Chain Indicator

Base chain integration is shown with the success green badge:

```html
<span class="badge badge-success">On Base</span>
```

#### ENS Name Styling

ENS names are always displayed in monospace with purple accent:

```css
.ens-name {
  font-family: var(--font-mono);
  color: var(--purple);
  font-size: 13px;
}
```

---

## 3. Typography Rules

### Font Families

```css
:root {
  --font-primary: 'Sohne', 'SF Pro Display', -apple-system, system-ui, sans-serif;
  --font-mono: 'Source Code Pro', SFMono-Regular, ui-monospace, Menlo, monospace;
}
```

- **Primary** -- Used for all UI text: headings, body, buttons, labels, navigation.
- **Mono** -- Used exclusively for on-chain data: ENS names, transaction hashes, trust scores, block numbers, contract addresses, gas amounts.

### Font Loading

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Source+Code+Pro:wght@400;500&display=swap" rel="stylesheet">
```

> **Note:** Sohne is Stripe's proprietary typeface. The fallback stack (`SF Pro Display -> system-ui -> sans-serif`) provides equivalent visual quality on all platforms. For the hackathon, we use the fallback stack.

### Type Scale

| Element | Size | Weight | Line Height | Letter Spacing | Font | Usage |
|---------|------|--------|-------------|----------------|------|-------|
| **H1** | 48px | 300 | 1.15 | -0.96px | Primary | Hero headlines, page titles |
| **H2** | 32px | 300 | 1.10 | -0.64px | Primary | Section headings |
| **H3** | 22px | 300 | -- | -0.22px | Primary | Card titles, subsection heads |
| **Body Large** | 18px | 300 | 1.40 | -- | Primary | Hero descriptions, section intros |
| **Body** | 16px | 300 | 1.40 | -- | Primary | Standard paragraphs, descriptions |
| **Body Small** | 14px | 300 | 1.50 | -- | Primary | Card body text, secondary info |
| **Nav / Label** | 14px | 400 | -- | -- | Primary | Navigation items, form labels |
| **Mono Label** | 12px | 500 | -- | 0.5px | Mono, uppercase | Badges, tags, status indicators |
| **Mono Data** | 13px | 400 | -- | -- | Mono | Transaction hashes, ENS names, scores |
| **Mono Small** | 12px | 400 | -- | -- | Mono | Timestamps, secondary on-chain data |

### Font Feature Settings

```css
body {
  font-feature-settings: "ss01" 1;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
```

The `ss01` (Stylistic Set 1) feature enables alternate character forms for improved readability in the Sohne/SF Pro typeface.

### Typographic Rules

1. **Never use font-weight above 500.** The design relies on light weights (300) with size contrast for hierarchy.
2. **Negative letter-spacing only on headings.** Body text uses default tracking.
3. **Monospace for all blockchain data.** If it's an address, hash, score, or chain identifier, it's mono.
4. **Uppercase only for badges/tags.** Never use all-caps for headings or body text.
5. **Line-height of 1.40 for body text.** Tighter (1.10-1.15) for headings to maintain compact heading appearance.

---

## 4. Component Styling

### 4.1 Buttons

#### Primary Button

The main call-to-action. Used for "Connect Wallet", "Execute Agreement", "Register Agent".

```css
.btn-primary {
  background: #533afd;
  color: #ffffff;
  padding: 10px 20px;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 400;
  border: none;
  cursor: pointer;
  transition: background 0.15s ease;
}
.btn-primary:hover {
  background: #4434d4;
}
.btn-primary:active {
  transform: scale(0.98);
}
.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
```

#### Ghost Button

Secondary action with purple outline. Used for "Read Docs", "View Details", navigation CTAs.

```css
.btn-ghost {
  background: transparent;
  color: #533afd;
  padding: 10px 20px;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 400;
  border: 1px solid #b9b9f9;
  cursor: pointer;
  transition: background 0.15s ease;
}
.btn-ghost:hover {
  background: rgba(83, 58, 253, 0.04);
}
```

#### Info Button

Contextual information action. Used for "Learn More", "View on Explorer".

```css
.btn-info {
  background: transparent;
  color: #2874ad;
  padding: 10px 20px;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 400;
  border: 1px solid rgba(43, 145, 223, 0.2);
  cursor: pointer;
  transition: background 0.15s ease;
}
.btn-info:hover {
  background: rgba(43, 145, 223, 0.04);
}
```

#### Neutral Button

Tertiary/disabled-looking action. Used for "Cancel", "Dismiss", non-critical actions.

```css
.btn-neutral {
  background: transparent;
  color: rgba(16, 16, 16, 0.3);
  padding: 8px 16px;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 400;
  outline: 1px solid rgb(212, 222, 233);
  cursor: pointer;
  transition: background 0.15s ease;
}
.btn-neutral:hover {
  background: rgba(16, 16, 16, 0.02);
}
```

#### Size Variants

| Size | Padding | Font Size | Usage |
|------|---------|-----------|-------|
| **Large (default)** | 10px 20px | 14px | Standalone CTAs, hero buttons |
| **Medium** | 8px 16px | 13px | In-card actions, table actions |
| **Small** | 6px 12px | 12px | Inline actions, icon buttons |

### 4.2 Cards

Cards are the primary content container for agents, agreements, and features.

#### Default Card (Resting)

```css
.card {
  background: #ffffff;
  border-radius: 6px;
  padding: 24px;
  border: 1px solid #e5edf5;
  box-shadow: rgba(23, 23, 23, 0.06) 0px 3px 6px 0px;
  transition: box-shadow 0.25s ease, transform 0.25s ease;
  cursor: pointer;
}
```

#### Card Hover (Elevated)

```css
.card:hover {
  box-shadow:
    rgba(50, 50, 93, 0.25) 0px 30px 45px -30px,
    rgba(0, 0, 0, 0.1) 0px 18px 36px -18px;
  transform: translateY(-2px);
}
```

#### Agent Card (AgentTrust Specific)

Agent cards extend the base card pattern with trust badges and ENS identity:

```html
<div class="card agent-card">
  <div class="card-icon">...</div>
  <h3>Agent Name</h3>
  <p class="ens-name">agent.alice.eth</p>
  <p class="card-description">Data analysis and ML model training specialist.</p>
  <div class="trust-bar">
    <div class="trust-fill trust-high" style="width: 85%;"></div>
  </div>
  <div class="card-badges">
    <span class="badge badge-success">Verified</span>
    <span class="badge badge-purple">ERC-7857</span>
    <span class="badge badge-success">On Base</span>
  </div>
</div>
```

```css
.agent-card .ens-name {
  font-family: var(--font-mono);
  color: var(--purple);
  font-size: 13px;
  margin: 4px 0 12px;
}
.agent-card .card-description {
  color: var(--slate);
  font-size: 14px;
  line-height: 1.50;
  margin-bottom: 16px;
}
.agent-card .card-badges {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 16px;
}
```

#### Card Grid

```css
.card-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}
```

### 4.3 Badges

Badges indicate status, verification, and sponsor integrations. Always monospace, uppercase, pill-shaped.

```css
.badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 100px;
  font-size: 12px;
  font-weight: 500;
  font-family: var(--font-mono);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
```

| Variant | Background | Text Color | Usage |
|---------|-----------|------------|-------|
| **Purple** | `rgba(83,58,253,0.08)` | `#533afd` | ERC-7857, ENS, AXL P2P, sponsor tags |
| **Success** | `rgba(21,190,83,0.08)` | `#108c3d` | Verified, On Base, Confirmed |
| **Error** | `rgba(234,34,97,0.08)` | `#ea2261` | Revoked, Failed, Rejected |
| **Warning** | `rgba(155,104,41,0.08)` | `#9b6829` | Pending, Awaiting, Expiring |
| **Muted** | `rgba(100,116,141,0.08)` | `#64748d` | Expired, Inactive, Default |

### 4.4 Forms

#### Text Input

```css
.form-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #e5edf5;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 300;
  color: #061b31;
  background: #ffffff;
  outline: none;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}
```

#### Input States

| State | Border | Box Shadow | Description |
|-------|--------|------------|-------------|
| **Default** | `#e5edf5` | none | Resting state |
| **Focus** | `#533afd` | `0 0 0 1px #533afd` | Purple ring indicates active input |
| **Error** | `#ea2261` | `0 0 0 1px #ea2261` | Ruby ring indicates validation failure |
| **Disabled** | `#e5edf5` | none | 50% opacity, no interaction |

#### Form Labels

```css
.form-label {
  display: block;
  font-size: 14px;
  font-weight: 400;
  color: #273951;
  margin-bottom: 6px;
}
```

### 4.5 Navigation

Sticky top navigation with frosted-glass backdrop blur.

```css
.nav {
  position: sticky;
  top: 0;
  z-index: 100;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  background: rgba(255, 255, 255, 0.90);
  border-bottom: 1px solid #e5edf5;
  border-radius: 0 0 6px 6px;
  padding: 12px 32px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
```

Nav links:

```css
.nav-links a {
  font-size: 14px;
  font-weight: 400;
  color: #273951;
  text-decoration: none;
  transition: color 0.15s ease;
}
.nav-links a:hover {
  color: #533afd;
}
.nav-links a.active {
  color: #533afd;
  font-weight: 500;
}
```

### 4.6 Transaction Feed

Monospace data table for on-chain events. Semantic colors indicate transaction status.

```css
.tx-feed {
  font-family: var(--font-mono);
  font-size: 13px;
  background: #fafbfc;
  border-radius: 6px;
  border: 1px solid #e5edf5;
  overflow: hidden;
}
.tx-row {
  display: flex;
  align-items: center;
  padding: 10px 16px;
  border-bottom: 1px solid #e5edf5;
}
.tx-row:last-child {
  border-bottom: none;
}
.tx-hash {
  color: #533afd;
  font-family: var(--font-mono);
  font-size: 12px;
}
.tx-amount.positive {
  color: #108c3d;
}
.tx-amount.negative {
  color: #ea2261;
}
```

### 4.7 Trust Score Bar

Progress bar with purple gradient scale:

```css
.trust-bar {
  width: 100%;
  height: 6px;
  background: #e5edf5;
  border-radius: 3px;
  overflow: hidden;
}
.trust-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.5s ease;
}
```

| Level | Fill Color | Width |
|-------|-----------|-------|
| Low (0-25) | `#64748d` (slate) | 25% |
| Medium (26-55) | `#b9b9f9` (purple-light) | 55% |
| High (56-85) | `#533afd` (purple) | 85% |
| Max (86-100) | `linear-gradient(90deg, #533afd, #f96bee)` | 98% |

### 4.8 Message Log

Real-time P2P message display between agents:

```css
.message-log {
  font-family: var(--font-mono);
  font-size: 13px;
  background: #fafbfc;
  border-radius: 6px;
  border: 1px solid #e5edf5;
}
.message-row {
  padding: 12px 16px;
  border-bottom: 1px solid #e5edf5;
}
.message-sender {
  color: #533afd;
  font-weight: 500;
}
.message-timestamp {
  color: #64748d;
  font-size: 11px;
}
.message-content {
  color: #061b31;
  margin-top: 4px;
}
```

---

## 5. Layout Principles

### Page Structure

```
+------------------------------------------+
|  Navigation (sticky, blur backdrop)       |
+------------------------------------------+
|  Hero (96px top / 80px bottom padding)    |
+------------------------------------------+
|  Section (64px vertical padding)          |
|  +--------+ +--------+ +--------+        |
|  | Card   | | Card   | | Card   |        |
|  +--------+ +--------+ +--------+        |
+------------------------------------------+
|  Section (64px vertical padding)          |
|  Transaction Feed / Message Log           |
+------------------------------------------+
|  Footer                                   |
+------------------------------------------+
```

### Max Widths

| Container | Max Width | Padding |
|-----------|-----------|---------|
| Page content | 1200px | 32px horizontal |
| Hero text | 800px | 64px horizontal |
| Form container | 480px | -- |
| Transaction feed | 600px | -- |

### Grid System

```css
/* Card grid -- 3 columns */
.card-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}

/* Agent detail -- 2 columns */
.detail-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 24px;
}

/* Dashboard -- sidebar + main */
.dashboard-grid {
  display: grid;
  grid-template-columns: 240px 1fr;
  gap: 0;
}
```

### Spacing Scale

| Token | Value | Usage |
|-------|-------|-------|
| `--space-xs` | 4px | Badge padding, tight gaps |
| `--space-sm` | 8px | Icon margins, inline spacing |
| `--space-md` | 12px | Nav vertical padding, form label margin |
| `--space-lg` | 16px | Card internal spacing, section gaps |
| `--space-xl` | 20px | Card grid gap, button groups |
| `--space-2xl` | 24px | Card padding, form groups |
| `--space-3xl` | 32px | Nav horizontal padding, page horizontal padding |
| `--space-4xl` | 48px | Section vertical padding (mobile) |
| `--space-5xl` | 64px | Section vertical padding (desktop) |
| `--space-6xl` | 80px | Hero bottom padding |
| `--space-7xl` | 96px | Hero top padding |

### Border Radius Scale

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-sm` | 2px | Small elements, tags |
| `--radius-md` | 4px | Buttons, inputs |
| `--radius-lg` | 6px | Cards, sections, nav bottom |
| `--radius-xl` | 8px | Card icons, modals |
| `--radius-pill` | 100px | Badges, chips |

---

## 6. Depth and Elevation

### Shadow Tokens

```css
:root {
  --shadow-blue: rgba(50, 50, 93, 0.25);
  --shadow-dark-blue: rgba(3, 3, 39, 0.25);
  --shadow-black: rgba(0, 0, 0, 0.1);
  --shadow-ambient: rgba(23, 23, 23, 0.08);
  --shadow-soft: rgba(23, 23, 23, 0.06);
}
```

### Elevation Levels

| Level | Shadow | CSS | Usage |
|-------|--------|-----|-------|
| **0 -- Flat** | none | `box-shadow: none` | Page background, flat sections |
| **1 -- Subtle** | Soft ambient | `box-shadow: rgba(23,23,23,0.06) 0px 3px 6px 0px` | Cards at rest, inputs |
| **2 -- Raised** | Ambient card | `box-shadow: rgba(23,23,23,0.08) 0px 15px 35px 0px` | Dropdowns, popovers |
| **3 -- Elevated** | Full card shadow | `box-shadow: rgba(50,50,93,0.25) 0px 30px 45px -30px, rgba(0,0,0,0.1) 0px 18px 36px -18px` | Card hover, modals |
| **4 -- Floating** | Multiple layers | Combine elevated + ambient | Sticky nav, toasts |

### Transition Rules

```css
/* Standard card elevation transition */
.card {
  transition: box-shadow 0.25s ease, transform 0.25s ease;
}

/* Hover lift */
.card:hover {
  transform: translateY(-2px);
}

/* Input focus ring */
.form-input {
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

/* Button press */
.btn:active {
  transform: scale(0.98);
}
```

### Navigation Elevation

The sticky nav uses backdrop-filter blur (frosted glass) instead of heavy shadow:

```css
.nav {
  backdrop-filter: blur(12px);
  background: rgba(255, 255, 255, 0.90);
  border-bottom: 1px solid #e5edf5;
}
```

---

## 7. Responsive Behavior

### Breakpoints

| Breakpoint | Width | Target |
|------------|-------|--------|
| **Mobile** | < 768px | Phones |
| **Tablet** | 768px - 1024px | iPads, small laptops |
| **Desktop** | > 1024px | Laptops, monitors |

### Mobile Adaptations (< 768px)

```css
@media (max-width: 768px) {
  /* Typography scale down */
  h1 { font-size: 32px; letter-spacing: -0.64px; }
  h2 { font-size: 24px; letter-spacing: -0.48px; }

  /* Layout */
  .card-grid { grid-template-columns: 1fr; }
  .detail-grid { grid-template-columns: 1fr; }
  .dashboard-grid { grid-template-columns: 1fr; }

  /* Spacing */
  .hero { padding: 48px 20px; }
  .section { padding: 48px 20px; }

  /* Navigation */
  .nav-links { display: none; }  /* Replace with hamburger menu */
  .nav { padding: 12px 16px; }

  /* Cards */
  .card { padding: 20px; }
}
```

### Tablet Adaptations (768px - 1024px)

```css
@media (min-width: 768px) and (max-width: 1024px) {
  .card-grid { grid-template-columns: repeat(2, 1fr); }
  .hero { padding: 64px 32px 56px; }
  h1 { font-size: 40px; }
}
```

### Touch Targets

- Minimum tap target: **44px x 44px** (WCAG guidelines)
- Button padding: minimum 10px vertical
- Card tap targets: full card area
- Badge tap targets: add 8px padding around visible badge

### Responsive Component Behavior

| Component | Desktop | Tablet | Mobile |
|-----------|---------|--------|--------|
| Card Grid | 3 columns | 2 columns | 1 column |
| Navigation | Full links | Full links | Hamburger menu |
| Hero | 48px H1, 96px/80px padding | 40px H1, 64px/56px padding | 32px H1, 48px/20px padding |
| Transaction Feed | Full width | Full width | Full width, horizontal scroll |
| Trust Score Bar | Full width | Full width | Full width |
| Forms | 480px max | 480px max | Full width |

---

## 8. Agent Prompt Guide

### Quick Reference

When building AgentTrust UI components, follow these rules:

- **Colors:** Purple (#533afd) for primary, Slate (#64748d) for secondary, Ruby (#ea2261) for errors, Green (#15be53) for success
- **Typography:** Primary font for UI, Mono font for blockchain data
- **Components:** Cards with hover elevation, badges for status, mono feed for transactions
- **Layout:** 3-column grid, 1200px max-width, 64px section padding
- **Spacing:** 20px grid gap, 24px card padding, 4px border radius on buttons

### Ready-to-Use Prompts

#### Prompt: Agent Discovery Page

```
Build the /agents page for AgentTrust. Use a 3-column card grid showing agent cards.
Each agent card has:
- Purple icon (40x40, rounded 8px, rgba(83,58,253,0.08) background)
- Agent name as H3 (22px, weight 300)
- ENS name in mono font (13px, purple #533afd)
- Description in slate (#64748d, 14px)
- Trust score bar (6px height, purple gradient based on score)
- Badges row: Verified (green), ERC-7857 (purple), On Base (green)
Cards use white bg, 6px radius, 24px padding, 1px border #e5edf5.
Hover: translateY(-2px) with full card shadow.
Include a sticky nav with backdrop blur and "Connect Wallet" primary button.
```

#### Prompt: Trust Score Dashboard

```
Build the /trust page for AgentTrust. Show a trust score dashboard with:
- H1 hero: "Trust Verification" with purple accent on key word
- Body large (18px) description in slate
- Trust score breakdown section with 4 trust levels:
  - Low (0-25): slate gray bar
  - Medium (26-55): light purple bar
  - High (56-85): purple bar
  - Max (86-100): purple-to-magenta gradient bar
- Each level shows: label (14px), score in mono (12px), 6px progress bar
- Below: verification cards in 3-column grid showing ERC-7857 iNFT details
- Cards use standard card pattern with badges for verification status
Use DESIGN.md color tokens, typography scale, and elevation system.
```

#### Prompt: Transaction Feed Component

```
Build a TransactionFeed component for AgentTrust. Requirements:
- Container: mono font (Source Code Pro), 13px, #fafbfc background, 6px radius
- Each row: flex layout with badge + tx hash + sender info + amount
- Tx hash: purple (#533afd), mono, 12px, truncated (0x3a7f...c4e2)
- Sender info: slate (#64748d), 12px, format "agent.alice -> agent.bob"
- Amount: aligned right, mono, 500 weight
  - Positive: success-text (#108c3d), prefix "+"
  - Negative: ruby (#ea2261), prefix "-"
  - Pending: purple (#533afd), no prefix
- Row border-bottom: 1px solid #e5edf5, last row no border
- Badge variants: Success (green), Failed (ruby), Pending (purple), Expired (slate)
```

#### Prompt: Agent Message Log

```
Build a MessageLog component for AgentTrust P2P messaging. Requirements:
- Container matches transaction feed style: mono, #fafbfc, 6px radius, border
- Each message row shows:
  - Sender ENS name (purple, mono, 500 weight)
  - Timestamp (slate, 11px, right-aligned)
  - Message content (navy #061b31, 13px, below sender)
  - Protocol badge: "AXL P2P" (purple badge) or "ENS" (purple badge)
- Messages from current agent: left-aligned with purple-tinted background
- Messages from other agent: right-aligned with white background
- Include typing indicator: 3 bouncing dots in slate
```

#### Prompt: Navigation Component

```
Build the AgentTrust navigation bar. Requirements:
- Position: sticky top, z-index 100
- Background: rgba(255,255,255,0.90) with backdrop-filter blur(12px)
- Border: 1px bottom #e5edf5, 6px bottom radius
- Layout: flex, space-between, 12px vertical / 32px horizontal padding
- Left: "AgentTrust" logo text (500 weight, 18px, purple)
- Center: nav links (14px, 400 weight, dark-slate, 24px gap)
  - Links: Dashboard, Agents, Trust, Messages, Audit
  - Active link: purple color, 500 weight
  - Hover: purple color, 0.15s transition
- Right: "Connect Wallet" primary button (small size)
- Mobile: hide nav links, add hamburger icon
```

#### Prompt: Full Dashboard Page

```
Build the AgentTrust dashboard (/) page. Layout:
1. Sticky nav with frosted glass effect (see nav component)
2. Hero section: "Trust-scored agent commerce on Base" (H1, purple accent on "agent commerce")
   - Body large description in slate
   - Two buttons: "Explore Agents" (primary), "Read Docs" (ghost)
   - Padding: 96px top, 80px bottom
3. Agent Discovery section: 3-column card grid with agent cards
   - Each card: icon, name, ENS, description, trust bar, badges
   - Hover elevation effect
4. Active Agreements section: transaction feed with recent on-chain events
5. Trust Overview section: 2-column layout with score breakdown + verification status
Use all DESIGN.md tokens. Responsive: single column on mobile, 2-col on tablet.
```

---

## Appendix: Tailwind CSS Configuration

For the Next.js 14 frontend using TailwindCSS, map design tokens to the config:

```javascript
// tailwind.config.ts
module.exports = {
  theme: {
    extend: {
      colors: {
        purple: {
          DEFAULT: '#533afd',
          hover: '#4434d4',
          deep: '#2e2b8c',
          light: '#b9b9f9',
          mid: '#665efd',
        },
        navy: {
          DEFAULT: '#061b31',
          dark: '#0d253d',
        },
        brand: {
          dark: '#1c1e54',
        },
        slate: {
          DEFAULT: '#64748d',
          dark: '#273951',
        },
        ruby: '#ea2261',
        magenta: {
          DEFAULT: '#f96bee',
          light: '#ffd7ef',
        },
        success: {
          DEFAULT: '#15be53',
          text: '#108c3d',
        },
        lemon: '#9b6829',
        border: {
          DEFAULT: '#e5edf5',
          purple: '#b9b9f9',
          soft: '#d6d9fc',
        },
      },
      fontFamily: {
        primary: ['Sohne', 'SF Pro Display', '-apple-system', 'system-ui', 'sans-serif'],
        mono: ['Source Code Pro', 'SFMono-Regular', 'ui-monospace', 'Menlo', 'monospace'],
      },
      borderRadius: {
        sm: '2px',
        md: '4px',
        lg: '6px',
        xl: '8px',
        pill: '100px',
      },
      boxShadow: {
        subtle: 'rgba(23,23,23,0.06) 0px 3px 6px 0px',
        'ambient-card': 'rgba(23,23,23,0.08) 0px 15px 35px 0px',
        card: 'rgba(50,50,93,0.25) 0px 30px 45px -30px, rgba(0,0,0,0.1) 0px 18px 36px -18px',
      },
      fontSize: {
        'mono-label': ['12px', { fontWeight: '500', letterSpacing: '0.5px' }],
        'mono-data': ['13px', { fontWeight: '400' }],
      },
    },
  },
};
```

---

## Appendix: Design Token CSS File

For direct CSS import without Tailwind:

```css
/* tokens.css -- AgentTrust Design Tokens */
:root {
  /* Colors */
  --purple: #533afd;
  --purple-hover: #4434d4;
  --purple-deep: #2e2b8c;
  --purple-light: #b9b9f9;
  --purple-mid: #665efd;
  --navy: #061b31;
  --dark-navy: #0d253d;
  --brand-dark: #1c1e54;
  --white: #ffffff;
  --slate: #64748d;
  --dark-slate: #273951;
  --ruby: #ea2261;
  --magenta: #f96bee;
  --magenta-light: #ffd7ef;
  --success: #15be53;
  --success-text: #108c3d;
  --lemon: #9b6829;
  --border: #e5edf5;
  --border-purple: #b9b9f9;
  --border-soft: #d6d9fc;

  /* Shadows */
  --shadow-subtle: rgba(23,23,23,0.06) 0px 3px 6px 0px;
  --shadow-ambient-card: rgba(23,23,23,0.08) 0px 15px 35px 0px;
  --shadow-card: rgba(50,50,93,0.25) 0px 30px 45px -30px,
                 rgba(0,0,0,0.1) 0px 18px 36px -18px;

  /* Typography */
  --font-primary: 'Sohne', 'SF Pro Display', -apple-system, system-ui, sans-serif;
  --font-mono: 'Source Code Pro', SFMono-Regular, ui-monospace, Menlo, monospace;

  /* Spacing */
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 12px;
  --space-lg: 16px;
  --space-xl: 20px;
  --space-2xl: 24px;
  --space-3xl: 32px;
  --space-4xl: 48px;
  --space-5xl: 64px;
  --space-6xl: 80px;
  --space-7xl: 96px;

  /* Border Radius */
  --radius-sm: 2px;
  --radius-md: 4px;
  --radius-lg: 6px;
  --radius-xl: 8px;
  --radius-pill: 100px;
}
```

---

*AgentTrust Design System v1.0 -- ETHGlobal Open Agents Hackathon 2026*
*Derived from Stripe design language. Reference: docs/reference/stripe-preview.html*
