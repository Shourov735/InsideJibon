---
name: Academic Modernism
colors:
  surface: '#f9f9fd'
  surface-dim: '#d9dade'
  surface-bright: '#f9f9fd'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f3f7'
  surface-container: '#edeef1'
  surface-container-high: '#e7e8ec'
  surface-container-highest: '#e2e2e6'
  on-surface: '#191c1f'
  on-surface-variant: '#41474e'
  inverse-surface: '#2e3134'
  inverse-on-surface: '#f0f0f4'
  outline: '#72787f'
  outline-variant: '#c1c7cf'
  surface-tint: '#2e628c'
  primary: '#003555'
  on-primary: '#ffffff'
  primary-container: '#0f4c75'
  on-primary-container: '#8bbceb'
  inverse-primary: '#9acbfb'
  secondary: '#4f6072'
  on-secondary: '#ffffff'
  secondary-container: '#d2e4fa'
  on-secondary-container: '#556678'
  tertiary: '#4b2a00'
  on-tertiary: '#ffffff'
  tertiary-container: '#6a3e00'
  on-tertiary-container: '#eaab66'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#cee5ff'
  primary-fixed-dim: '#9acbfb'
  on-primary-fixed: '#001d32'
  on-primary-fixed-variant: '#0b4a73'
  secondary-fixed: '#d2e4fa'
  secondary-fixed-dim: '#b6c8dd'
  on-secondary-fixed: '#0a1d2c'
  on-secondary-fixed-variant: '#37485a'
  tertiary-fixed: '#ffdcbc'
  tertiary-fixed-dim: '#fbba74'
  on-tertiary-fixed: '#2c1700'
  on-tertiary-fixed-variant: '#683d00'
  background: '#f9f9fd'
  on-background: '#191c1f'
  surface-variant: '#e2e2e6'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 60px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 30px
    fontWeight: '600'
    lineHeight: 38px
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  xs: 4px
  sm: 12px
  md: 16px
  lg: 24px
  xl: 32px
  xxl: 48px
  container-max: 1280px
  gutter: 24px
  margin-mobile: 16px
---

## Brand & Style

The design system is rooted in the "Academic Modernism" philosophy. It balances the rigor of traditional educational institutions with the streamlined efficiency of modern SaaS. The aesthetic is clean, professional, and trustworthy, aimed at fostering a calm environment conducive to deep learning and administrative focus.

The visual style follows a **Corporate / Modern** approach with high-end editorial influences. It prioritizes clarity through generous whitespace, a restricted color palette, and subtle tactile cues. We avoid decorative flourishes, favoring functional elements that communicate hierarchy and progress intuitively. The interface should feel "premium" through precision and typographic excellence rather than visual excess.

## Colors

The palette is restrained to maintain an academic atmosphere. 
- **Primary:** A deep, sophisticated blue serves as the foundation for trust and authority. Use it for primary actions, navigation headers, and active states.
- **Secondary:** A soft gold is used sparingly as an "achievement" or "highlight" color (e.g., badges, gold stars, premium features).
- **Neutral Scale:** We utilize a cool grey scale to define structure without adding visual noise. The background is a very soft off-white to reduce eye strain during long study sessions.
- **Semantic:** Standard colors for feedback are tuned to be legible but not neon, ensuring they blend into the professional environment.

## Typography

This design system uses a dual-font pairing to distinguish between brand presence and functional content. 
- **Plus Jakarta Sans** is used for headings and display text. Its slightly soft terminals provide a friendly, modern touch to the academic rigor.
- **Inter** is used for all body text, inputs, and UI labels. Its high x-height and exceptional legibility make it ideal for data-heavy dashboards and long-form educational content.

Large display headings should use tighter letter spacing to maintain a "lock-up" feel, while labels can benefit from slight tracking for better readability at small sizes.

## Layout & Spacing

The layout utilizes a **12-column fluid grid** for desktop and a **4-column grid** for mobile. 
- **Whitespace:** Use generous margins (24px+) between major sections to allow the content to "breathe." Education platforms often feel cluttered; this system fights that by enforcing strict vertical rhythm based on 8px increments.
- **Mobile-First:** On mobile devices, the sidebar transitions into a bottom-sheet navigation or a clean hamburger menu. Full-width cards are preferred over multi-column layouts on screens smaller than 768px.
- **Alignment:** Content should predominantly be left-aligned to assist with reading flow. Dashboards should use "contained" widths (1280px max) to prevent line lengths from becoming too long for comfortable reading.

## Elevation & Depth

Hierarchy is established primarily through **Tonal Layers** and **Low-contrast outlines** rather than heavy shadows.

- **Level 0 (Background):** #F8FAFC. The base layer for the application.
- **Level 1 (Cards/Surface):** #FFFFFF with a 1px border (#E2E8F0). No shadow. This is the standard for course cards and list items.
- **Level 2 (Active/Hover):** #FFFFFF with a very soft, diffused shadow: `0px 4px 12px rgba(15, 76, 117, 0.05)`. This adds a subtle "lift" when interacting with elements.
- **Level 3 (Modals/Popovers):** #FFFFFF with a more pronounced shadow: `0px 12px 32px rgba(0, 0, 0, 0.1)`. 

Avoid any background blurs or frosted glass effects to maintain a crisp, professional aesthetic.

## Shapes

The shape language is "Rounded" to strike a balance between professional discipline and approachable warmth.
- **Standard (8px):** Used for buttons, input fields, and small cards.
- **Large (16px):** Used for main container areas, large course thumbnails, and featured banners.
- **Pill:** Reserved strictly for "Status Badges" (e.g., "Completed", "In Progress") and secondary tags.

## Components

- **Buttons:** Primary buttons use a solid fill of the primary blue with white text. Secondary buttons use a transparent background with the primary blue border and text. Ghost buttons are reserved for tertiary actions or "Cancel" buttons.
- **Course Cards:** Should feature a 16:9 image ratio at the top, followed by a title in `headline-sm`, a progress bar, and a "last accessed" label in `body-sm`.
- **Sidebars:** Use a "Collapsed" state for experts and an "Expanded" state for new users. Use `text-secondary` for nav items, switching to `primary` with a subtle left-edge accent bar for the active state.
- **Inputs:** Clean, 1px bordered boxes. Focus states should use a 2px primary blue ring with a slight offset. Placeholder text should use `text-muted`.
- **Progress Indicators:** Linear bars are preferred for course progress. Use a 4px height with a light grey background and the primary blue or success green for the fill.
- **Badges/Chips:** Small, uppercase labels with a light tinted background of the semantic color (e.g., Success = Light Green background with Dark Green text).
- **Tables:** Minimalist design with no vertical borders. Use `body-sm` for row content and `label-sm` for headers. Rows should have a subtle hover highlight (#F1F5F9).