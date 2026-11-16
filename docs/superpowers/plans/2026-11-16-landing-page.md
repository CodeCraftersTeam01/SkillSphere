# SkillSphere AI Landing Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an aesthetic, high-converting, and smoothly animated landing page for SkillSphere AI adhering to Antislop Warm Paper aesthetics, tasteskill v2 art direction, and Jakub Krehel + Emil Kowalski motion principles.

**Architecture:** Implement a dedicated `views/landing.ejs` template rendered from the root route `/` (and `/landing`) in `routes/index.js`. Style using the established Claude Warm Paper design system (`claude-theme.css`) with dedicated landing motion styles, interactive Socratic AI Orion orb demo, career curriculum preview, and verified certification engine.

**Tech Stack:** Node.js, Express.js, EJS, Vanilla CSS (Claude Design Tokens & Organic Keyframes), Vanilla JavaScript (IntersectionObserver, Canvas/SVG Animator).

**Spec:** Antislop (Mode 1: During), tasteskill v2, design-motion-principles (Create Mode).

## Global Constraints
- Zero em dashes (`—`) in UI copy and templates. Use regular hyphens (`-`) or colons (`:`).
- WCAG AA contrast ratio >= 4.5:1 for all text in both Light Mode (`#FBF9F5`) and Dark Mode (`#18181B`).
- Zero horizontal overflow across all viewport widths (responsive down to 320px).
- Comprehensive `prefers-reduced-motion` compliance.
- Authentic Indonesian tech education context (no generic AI lorem ipsum).
- Git commits follow user identity rotation (Lanvry / CS-Orion / Satrio).

## Review Focus
1. Mobile responsive reflow: Navigation collapses cleanly, bento cards stack gracefully to 1 column without horizontal scrolling.
2. Motion elegance: Organic breathing aura (200-400ms duration, Jakub Krehel polish), Emil Kowalski restraint for interactive controls.
3. Theme synchronization: Instant, smooth toggle between Light Warm Paper and Dark Obsidian with zero contrast inversion artifacts.
4. Interactive Orion Assistant: Living SVG/Canvas eyes and mouth with blink, speaking pulse, and interactive Socratic guidance preview.
5. Robust routing: Visiting `/` renders the landing page seamlessly while preserving user session awareness in header actions.

---

### Task 1: Route Setup & Controller Integration
**Files:**
- Modify: `routes/index.js`
- Test: `tests/studentViewsCatalog.test.js`

- [ ] Update `routes/index.js` root route `router.get('/')` and `router.get('/landing')` to render `views/landing.ejs` with dynamic page metadata and auth context.
- [ ] Add `views/landing.ejs` to the EJS view validation list in `tests/studentViewsCatalog.test.js`.
- [ ] Verify test suite runs cleanly.

---

### Task 2: Landing Page Template Architecture (`views/landing.ejs`)
**Files:**
- Create: `views/landing.ejs`

- [ ] Structure the semantic HTML document:
  - Sticky glassmorphic navbar with logo, status badge ("AI-Powered v2.4"), nav links, theme toggle, and login/register buttons.
  - Hero Section: Editorial typography (*Newsreader*), badge pill, dual action buttons, student social proof badges, and interactive Orion AI Companion card.
  - Interactive Socratic AI Orion Showcase: Living SVG avatar (blinking eyes, responsive mouth wave), interactive prompt chips (e.g. "Normalisasi Database", "Microservices vs Monolith", "JWT Security"), and simulated live step-by-step guidance.
  - Bento Grid (Core Pillars): 5-step adaptive onboarding, WebP certificate validator with verification hash, HTTP 206 video streaming, 80/20 transparent tutor revenue model.
  - Curriculum & Tech Career Paths: Tabbed interactive course preview (Backend Cloud, AI & Machine Learning, Frontend Modern, Mobile App).
  - Metrics & Transparency Strip: 19 Relational Tables, 80% Tutor Revenue, 100% Verified Credentials.
  - Testimonial Carousel / Wall of Love: Authentic reviews from Indonesian students and lead tutors.
  - Final Editorial CTA & Comprehensive Footer: Links to roadmap, katalog, login, status server, terms, and privacy.

---

### Task 3: Motion & Visual Styling (Claude Warm Paper + Motion Principles)
**Files:**
- Modify/Create: `public/stylesheets/landing.css` (or embedded in `views/landing.ejs`)

- [ ] Implement Claude Warm Paper tokens for light mode (`#FBF9F5`) and dark mode (`#18181B`).
- [ ] Implement Jakub Krehel smooth transitions (`cubic-bezier(0.16, 1, 0.3, 1)`), staggered scroll entrance animations (`.reveal-on-scroll`), and floating orb glow.
- [ ] Add Emil Kowalski active click states (`transform: scale(0.98)`).
- [ ] Ensure full `@media (prefers-reduced-motion: reduce)` accessibility override.

---

### Task 4: Interactive Client Script (Living Orion AI Orb & Category Filters)
**Files:**
- Modify/Create: `public/javascripts/landing.js` (or embedded in `views/landing.ejs`)

- [ ] Implement living Orion AI Orb animation: periodic eye blinks, mouth audio wave animation during speaking states, and interactive prompt questions.
- [ ] Implement curriculum category tab filter switching with smooth active pill sliding.
- [ ] Implement theme switcher integration with `localStorage.getItem('skillsphere_theme')`.
- [ ] Implement mobile drawer menu toggle with body scroll locking and backdrop blur.

---

### Task 5: Testing, Linting & E2E Verification
**Files:**
- Test: `tests/studentViewsCatalog.test.js`
- Test: `tests/auth.test.js`

- [ ] Run `node tests/studentViewsCatalog.test.js` to ensure EJS compilation and HTML validity.
- [ ] Run full test suite `npm test`.
- [ ] Run `graphify update .` to synchronize knowledge graph.
- [ ] Commit with proper author identity and push to remote.
