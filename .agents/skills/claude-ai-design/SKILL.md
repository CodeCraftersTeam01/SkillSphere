---
name: claude-ai-design
description: Guidelines and design system tokens for building web interfaces with the Claude.ai (Anthropic) aesthetic—featuring warm paper backgrounds, editorial serif typography, monochrome high-contrast accents (black in light mode, white in dark mode), and clean minimalist conversational UI.
---

# Claude.ai Design System & UI Skill

This skill provides comprehensive guidelines, design tokens, and reusable component patterns to craft web applications with the signature **Claude.ai** aesthetic created by Anthropic, customized with clean monochrome high-contrast accents.

---

## 🎨 Core Design Philosophy

Claude's interface is designed around the feeling of a **warm, thoughtful, editorial notebook**:
- **Warm Paper Tones**: Soft ivory/linen and stone backgrounds instead of cold, clinical pure white or harsh blues.
- **Editorial Typography**: Elegant serif headings paired with clean, ultra-readable modern sans-serif body text.
- **Monochrome Accent Contrast**: Crisp **Black** (`#000000` / `#1F1E1D`) in light mode and Pure **White** (`#FFFFFF`) in dark mode for primary CTAs, active states, and focus rings.
- **Clean Minimalist Surfaces**: Thin, subtle borders with faint natural shadows, generous breathing room, and rounded pill elements.
- **Calm, Human-Centric Micro-interactions**: Smooth, gentle transitions (150ms–200ms ease-out) without jarring animations.

---

## 📐 Design Tokens (CSS Variables)

Use these variables in your root CSS / Tailwind config:

```css
:root {
  /* --- Light Theme (Warm Paper / Stone with Black Accent) --- */
  --bg-app: #FBF9F5;               /* Warm ivory paper */
  --bg-surface: #FFFFFF;           /* Card & panel surface */
  --bg-surface-subtle: #F3EFEA;    /* Hover & subtle button background */
  --bg-sidebar: #F5F2EB;           /* Sidebar warm stone */
  
  /* Text Colors */
  --text-primary: #1F1E1D;         /* High-contrast deep warm charcoal */
  --text-secondary: #6B665F;       /* Muted label / helper text */
  --text-tertiary: #9C968D;        /* Placeholder / subtle icons */
  
  /* Accent & Brand Colors (Black in Light Mode) */
  --accent-primary: #000000;       /* Signature Black accent in light mode */
  --accent-primary-hover: #2D2B28; /* Charcoal hover */
  --accent-primary-light: #EFECE6; /* Light stone tint for active pills/badges */
  --accent-text: #FFFFFF;          /* Text color on primary accent buttons */
  --accent-amber: #D97706;
  
  /* Borders & Dividers */
  --border-subtle: #E8E2D9;        /* Input, card, divider border */
  --border-strong: #D5CDC0;        /* Hover / active border */
  
  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(45, 41, 38, 0.04);
  --shadow-md: 0 4px 12px rgba(45, 41, 38, 0.06), 0 1px 3px rgba(45, 41, 38, 0.04);
  --shadow-floating: 0 8px 24px rgba(45, 41, 38, 0.08), 0 2px 6px rgba(45, 41, 38, 0.04);

  /* Radii */
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 16px;
  --radius-xl: 24px;
  --radius-full: 9999px;

  /* Fonts */
  --font-serif: "Newsreader", "Source Serif 4", "Copernicus", "Georgia", serif;
  --font-sans: "Plus Jakarta Sans", "Inter", -apple-system, BlinkMacSystemFont, sans-serif;
  --font-mono: "JetBrains Mono", "Fira Code", monospace;
}

/* --- Dark Theme (Dark Zinc with White Accent) --- */
[data-theme="dark"] {
  --bg-app: #18181B;               /* Deep warm zinc */
  --bg-surface: #242220;           /* Elevated card surface */
  --bg-surface-subtle: #2D2B28;    /* Hover / secondary button */
  --bg-sidebar: #1F1E1D;           /* Dark sidebar */
  
  --text-primary: #F5F3EF;
  --text-secondary: #A8A29A;
  --text-tertiary: #6E6962;
  
  /* Accent & Brand Colors (White in Dark Mode) */
  --accent-primary: #FFFFFF;       /* Signature White accent in dark mode */
  --accent-primary-hover: #E4E4E7; /* Light off-white hover */
  --accent-primary-light: #2D2B28; /* Dark subtle tint for active pills/badges */
  --accent-text: #000000;          /* Text color on primary accent buttons */
  
  --border-subtle: #33302C;
  --border-strong: #45413B;
  
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.3);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.4);
  --shadow-floating: 0 8px 24px rgba(0, 0, 0, 0.5);
}
```

---

## 🔤 Typography & Font Setup

Add Google Fonts to the HTML head:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;0,6..72,600;1,6..72,400&family=Plus+Jakarta+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
```

### Typography Hierarchy
- **Page Titles / Hero Greeting**: `font-serif font-normal text-3xl md:text-4xl text-[var(--text-primary)] leading-tight` (e.g. *"Good morning, Arjuna"* or *"Talk with Claude"*).
- **Section Headings**: `font-serif font-medium text-xl md:text-2xl text-[var(--text-primary)]`.
- **Body & Chat Text**: `font-sans text-[15px] leading-relaxed text-[var(--text-primary)]`.
- **Labels, Badges, Tabs**: `font-sans text-xs md:text-sm font-medium text-[var(--text-secondary)]`.
- **Code & Prompts**: `font-mono text-xs md:text-[13px]`.

---

## 🧩 Key Component Patterns

### 1. Claude Greeting & Hero
```html
<div class="greeting-container">
  <div class="claude-star-icon">
    <svg width="32" height="32" viewBox="0 0 24 24" fill="var(--accent-primary)">
      <!-- 8-pointed warm star/sun logo -->
      <path d="M12 0L13.8 8.2L22 10L13.8 11.8L12 20L10.2 11.8L2 10L10.2 8.2L12 0Z" />
    </svg>
  </div>
  <h1 class="greeting-title">How can I help you today?</h1>
</div>
```

### 2. Claude Floating Chat Input Bar
The centerpiece of Claude's interface:
```html
<div class="chat-input-wrapper">
  <textarea 
    class="chat-input-field" 
    placeholder="Reply to Claude..." 
    rows="1"
  ></textarea>
  <div class="chat-input-actions">
    <div class="left-actions">
      <button class="icon-btn" title="Add attachment">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
        </svg>
      </button>
      <button class="model-badge">
        <span>Claude 3.7 Sonnet</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M6 9l6 6 6-6"/></svg>
      </button>
    </div>
    <div class="right-actions">
      <button class="send-btn" aria-label="Send message">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
        </svg>
      </button>
    </div>
  </div>
</div>
```

**Styling:**
```css
.chat-input-wrapper {
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-md);
  padding: 14px 18px 10px;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}
.chat-input-wrapper:focus-within {
  border-color: var(--border-strong);
  box-shadow: var(--shadow-floating);
}
.chat-input-field {
  width: 100%;
  border: none;
  outline: none;
  background: transparent;
  font-family: var(--font-sans);
  font-size: 15px;
  color: var(--text-primary);
  resize: none;
}
.chat-input-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 10px;
}
.send-btn {
  background: var(--accent-primary);
  color: var(--accent-text, #ffffff);
  border: none;
  width: 32px;
  height: 32px;
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.15s ease, transform 0.1s ease;
}
.send-btn:hover {
  background: var(--accent-primary-hover);
  transform: scale(1.04);
}
```

### 3. Starter Prompt Pills (Cards)
```html
<div class="prompt-grid">
  <button class="prompt-card">
    <span class="prompt-text">Write an essay explaining quantum computing</span>
    <span class="prompt-icon">→</span>
  </button>
  <button class="prompt-card">
    <span class="prompt-text">Help me debug a Node.js express route</span>
    <span class="prompt-icon">→</span>
  </button>
</div>
```

**Styling:**
```css
.prompt-card {
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  padding: 14px 18px;
  text-align: left;
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: var(--text-primary);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}
.prompt-card:hover {
  background: var(--bg-surface-subtle);
  border-color: var(--border-strong);
  transform: translateY(-1px);
}
```

### 4. Claude Collapsible "Thinking" Block
```html
<details class="thinking-block">
  <summary class="thinking-summary">
    <svg class="thinking-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="10"></circle>
      <path d="M12 6v6l4 2"></path>
    </svg>
    <span>Thought for 5 seconds</span>
  </summary>
  <div class="thinking-content">
    The user is asking for architectural guidance on database scaling...
  </div>
</details>
```

---

## 📋 Checklist for Claude.ai Aesthetic

When designing a website in this style:
1. [ ] **Background**: Never pure `#FFFFFF` across the entire viewport. Use `#FBF9F5` or `#F7F5EE` for the light theme background.
2. [ ] **Typography**: Use high-quality serif for main titles (`Newsreader`, `Source Serif 4`) and crisp geometric/neo-grotesque sans (`Plus Jakarta Sans`, `Inter`) for body copy.
3. [ ] **Accent Color**: Use `#000000` (Black) in light mode and `#FFFFFF` (White) in dark mode for high-contrast primary actions, buttons, and focus rings.
4. [ ] **Borders & Radii**: Use soft pill curves (`rounded-2xl` or `border-radius: 16px - 24px`) with warm gray/sand borders (`#E8E2D9`).
5. [ ] **Content Width**: Max-width of centered reading area should be `768px` (`max-w-3xl`) to `896px` (`max-w-4xl`) for optimal editorial reading comfort.
6. [ ] **Minimalist Chrome**: Keep navigation and toolbars lightweight, understated, and non-distracting.
