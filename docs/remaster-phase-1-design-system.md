# Remaster Phase R1 — Design System 2.0 & Dashboard Overhaul

> **Phase:** R1 (after R0)
> **Theme:** Tokens, dark mode, Bangla-first typography, ⌘K, skeletons, redesigned dashboards.
> **Why:** the rest of the remaster assumes the design primitives exist. We do this *before* adding new features so live class, AI tutor, etc. look masterclass on day one.

Read `AGENTS.md`, `docs/MASTER_ROADMAP.md`, and `docs/MASTER_REMASTER.md` first.

---

## 1. Objectives

1. Centralize design tokens in `src/styles/tokens.css` with `@theme` directive (Tailwind v4). Color, spacing, typography, radius, shadow, motion, elevation.
2. Implement **dark mode** via `data-theme="dark"` on `<html>`, defaulting to `light` and respecting `prefers-color-scheme` first visit.
3. Add the **Hind Siliguri / Noto Sans Bengali** webfont, loaded once via `next/font/google` with `display: swap`, subset to Latin + Bengali.
4. Build a global **⌘K command palette** (`src/components/shared/command/`) with: jump-to-course, jump-to-lesson, jump-to-exam/assignment, jump-to-student (teacher), settings, language switch, sign-out.
5. Skeleton loaders for every dashboard route (replaces ad-hoc spinners).
6. Rebuild the three role dashboards (student / teacher / parent-placeholder) using the new `ResourceDirectory`, `ResourceFormShell`, `ResourceDetailShell` shells from R0.
7. Empty-state components: `<EmptyState icon title description action />` everywhere a list can be empty.
8. Toast system: `<ToastViewport />` at root, `useToast()` hook, persistent in localStorage for unread.
9. Enforce CSP (switch from RO to enforce) once R0 audit shows no violations in the report endpoint for a week.

---

## 2. Tokens & Theme

`src/styles/tokens.css` (Tailwind v4 `@theme`):

```css
@import "tailwindcss";

@theme {
  /* Surfaces — Academic Modernism, 5-step ramp */
  --color-surface-0: #ffffff;
  --color-surface-1: #f7f7f5;
  --color-surface-2: #efefec;
  --color-surface-3: #e7e7e3;
  --color-surface-4: #deded8;

  --color-ink-900: #0c0c0e;
  --color-ink-700: #2a2a2f;
  --color-ink-500: #56565e;
  --color-ink-300: #8a8a92;
  --color-ink-100: #c9c9cf;

  /* Role accents */
  --color-student: #0f8a5f;   /* emerald */
  --color-teacher: #4338ca;   /* indigo */
  --color-admin:   #1e293b;   /* slate */
  --color-parent:  #be185d;   /* rose */

  /* Semantic */
  --color-success: #0f8a5f;
  --color-warning: #b45309;
  --color-danger:  #b91c1c;
  --color-info:    #1d4ed8;

  /* Typography */
  --font-display: "Hind Siliguri", ui-sans-serif, system-ui, sans-serif;
  --font-body:    "Hind Siliguri", ui-sans-serif, system-ui, sans-serif;
  --font-mono:    "JetBrains Mono", ui-monospace, monospace;

  --text-display-1: 2.75rem;
  --text-display-2: 2rem;
  --text-h1: 1.5rem;
  --text-h2: 1.25rem;
  --text-body: 1rem;
  --text-small: 0.875rem;
  --text-micro: 0.75rem;

  --leading-tight: 1.2;
  --leading-normal: 1.5;
  --leading-relaxed: 1.7;

  /* Radii — gentle, not playful */
  --radius-xs: 4px;
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 16px;
  --radius-xl: 24px;

  /* Shadows — single-key low-blur */
  --shadow-1: 0 1px 0 0 rgba(0,0,0,.04);
  --shadow-2: 0 4px 14px -6px rgba(0,0,0,.08);
  --shadow-3: 0 12px 32px -10px rgba(0,0,0,.12);
  --shadow-4: 0 24px 64px -20px rgba(0,0,0,.18);

  /* Motion */
  --ease-standard: cubic-bezier(.2,0,0,1);
  --dur-fast: 120ms;
  --dur-base: 200ms;
  --dur-slow: 320ms;

  /* Spacing rhythm — 4px base */
  --space-1: 4px; --space-2: 8px; --space-3: 12px;
  --space-4: 16px; --space-6: 24px; --space-8: 32px;
  --space-10: 40px; --space-12: 48px; --space-16: 64px;
}

/* Dark theme — same tokens, different values */
[data-theme="dark"] {
  --color-surface-0: #0b0b0d;
  --color-surface-1: #131318;
  --color-surface-2: #1a1a20;
  --color-surface-3: #21212a;
  --color-surface-4: #2a2a34;

  --color-ink-900: #f5f5f7;
  --color-ink-700: #d1d1d8;
  --color-ink-500: #a1a1ad;
  --color-ink-300: #6f6f7a;
  --color-ink-100: #3a3a44;
}

/* Respect system on first paint, persist via cookie after toggle */
@media (prefers-color-scheme: dark) {
  html:not([data-theme]) { color-scheme: dark; }
}
```

The role group layouts inject `data-theme` and `data-role="student|teacher|admin|parent"` on the `<body>` so role-accent CSS variables apply without runtime checks.

---

## 3. Bangla Font & Numerals

- `src/app/layout.tsx` — load fonts via `next/font/google`:
  ```ts
  const display = Hind_Siliguri({ subsets: ["latin", "bengali"], weight: ["400","500","600","700"], display: "swap", variable: "--font-display" });
  const body    = Hind_Siliguri({ subsets: ["latin", "bengali"], weight: ["400","500","600"],     display: "swap", variable: "--font-body" });
  ```
- Bind to `<html className={`${display.variable} ${body.variable}`}>`.
- Locale-aware numerals: helper `formatNumber(n, locale)` in `src/lib/utils.ts` that uses `Intl.NumberFormat(locale, { useGrouping: true })`. Defaults to `bn` numerals when locale is `bn` (Bangladesh uses Western digits — but we support `bn-BD-u-nu-beng` for users who want Bengali numerals).
- BDT currency formatter `formatBDT(amount, locale)` uses `style: 'currency', currency: 'BDT'`.

---

## 4. Command Palette (⌘K)

- `src/components/shared/command/command-palette.tsx` — client component using `cmdk` (one allowed client dependency). Trigger:
  - `⌘K` / `Ctrl-K`
  - `/` on landing pages (non-input focus)
- Providers indexed via `useCommandItems()` aggregated from role-scoped providers:
  - `useNavigationCommands()` — courses, lessons, exams, assignments (role-scoped server queries)
  - `useGlobalCommands()` — settings, language, theme, sign-out
  - `useTeacherCommands()` — quick-create exam/assignment/announcement
- Server-side: a tiny `src/services/command/index.ts` returns typed command items, projected only.
- Implementation: `<CommandDialog open={open} onOpenChange={setOpen}>` mounted at role layout, portal-mounted, focus-trapped.
- Recent items stored in `localStorage` keyed per user.
- A `?` key opens a `<ShortcutsDialog />` listing every shortcut.

---

## 5. Skeleton & Empty States

- `src/components/shared/feedback/skeleton.tsx` — primitive that takes a width/height/variant (`line`, `block`, `circle`).
- `src/components/shared/feedback/empty-state.tsx` — `<EmptyState icon={…} title={t('…')} description={t('…')} action={…} />`.
- Every directory page (student/teacher/admin) uses them; existing `loading.tsx` files keep working but now also import skeletons for predicted layouts.

---

## 6. Dashboard Redesigns

These replace the current thin dashboard pages. They rely on the **shells from R0** and the **tokens from this phase**.

### 6.1 Student Dashboard `/student`
Hero card (top): "Today's routine" — next live class, today's assignment due, today's exam window, with primary CTA.
Below: 3-up grid of "Continue learning" (last 4 in-progress courses with progress ring), "Recent grades" (last 4 graded items), "Upcoming deadlines" (next 5 across enrolled courses).
Right rail (desktop only): streak flame + XP card + league rank.

### 6.2 Teacher Dashboard `/teacher`
Hero: "Today's classes" — next live class with start-now CTA if within 15 min of `scheduledAt`.
Below: 3-up — "Recent submissions" (5 most recent ungraded), "Course performance" (per-course avg grade spark), "Questions awaiting answer" (5 oldest un-answered Q&A from R4).
Right rail: monthly class hours, students taught count, AI tutor usage.

### 6.3 Parent Dashboard `/parent` *(placeholder for R7 — leave a `not-yet-available` empty state with roadmap link)*

### 6.4 Admin Dashboard `/admin` *(placeholder for R7 — same)*

The R7 phase will swap these placeholders with real dashboards.

---

## 7. Notifications Drawer → Toast Upgrade

Today the bell shows a dropdown. Add a real **toast system** for transient feedback:

- `<ToastViewport />` mounted at root layout (client).
- `useToast()` hook called from anywhere.
- Toasts queue, max 3, auto-dismiss 4s, `aria-live="polite"` on the region.
- On every mutation (publish exam, grade submission, etc.) a toast appears in the originating role's UI **and** an in-app notification persists (existing `notifications` table).
- Add `system.toast.success`, `system.toast.error`, `system.toast.warning` to dictionary.

---

## 8. Accessibility & Keyboard

- All buttons get a visible focus ring using `:focus-visible` with `outline: 2px solid var(--color-info)` + offset.
- Modals: focus trap, escape-to-close, return focus to opener, `aria-modal="true"`.
- Skeleton loaders use `aria-busy="true"` and announce completion via a `role="status"` element.
- `prefers-reduced-motion` reduces all transitions to `0ms`.

---

## 9. i18n Keys Required (R1)

- `command.*` (~30 keys: placeholders, empty, recent, suggestions)
- `shortcuts.*` (~10)
- `dashboard.student.*` (Continue learning, Recent grades, Upcoming deadlines, hero CTAs)
- `dashboard.teacher.*`
- `theme.light`, `theme.dark`, `theme.system`
- `empty.*` (5 generic + per-domain)
- `system.toast.*`
- `common.shortcut.*` (Cmd-K, etc.)

Run `npm run check:i18n` — parity required.

---

## 10. Verification Checklist

1. `npm run check:i18n`, `npx tsc --noEmit`, `npm run lint`, `npm run build` all green.
2. Visual regression: take a screenshot of every role dashboard before starting, compare after. Differences must be intentional.
3. Lighthouse desktop + mobile on `/`, `/student`, `/teacher`, `/courses` — Performance ≥ 90, Accessibility ≥ 95, Best Practices ≥ 95, SEO ≥ 95.
4. ⌘K opens within 100ms; commands resolve within 200ms of typing.
5. Theme toggle persists across reload via cookie.
6. CSP switched from RO to enforce; verify no console reports for a day.
7. All focus rings visible on Tab through `/student/exams/[id]`.
8. Bangla numerals render correctly; English strings fall back to Latin.

---

## 11. Copy-Paste Prompt

```markdown
# Phase R1 — Design System 2.0 & Dashboard Overhaul

Read `AGENTS.md`, `docs/MASTER_READMAP.md`, and `docs/MASTER_REMASTER.md` first.

## Tasks
1. Add `src/styles/tokens.css` per §2; remove existing ad-hoc Tailwind colors from `globals.css`.
2. Load Hind Siliguri via `next/font/google` in `app/layout.tsx`; bind to `<html>`.
3. Implement dark mode via cookie + `data-theme`; add toggle in nav.
4. Add `formatNumber` + `formatBDT` to `src/lib/utils.ts`.
5. Build command palette at `src/components/shared/command/` per §4 using `cmdk`.
6. Build skeleton + empty-state primitives at `src/components/shared/feedback/`.
7. Rebuild student + teacher dashboards per §6. Use R0 shells.
8. Build toast system; wire to `defineServerAction` from R0.
9. Add all i18n keys per §9.
10. Switch CSP from Report-Only to enforce.
11. Run §10 verification checklist.
12. Commit + push.
```
