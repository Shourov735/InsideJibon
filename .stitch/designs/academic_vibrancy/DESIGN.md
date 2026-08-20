---
name: Academic Vibrancy
colors:
  surface: '#fff8f7'
  surface-dim: '#f0d3d4'
  surface-bright: '#fff8f7'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#fff0f0'
  surface-container: '#ffe9e9'
  surface-container-high: '#fee1e2'
  surface-container-highest: '#f8dcdd'
  on-surface: '#271719'
  on-surface-variant: '#5a4042'
  inverse-surface: '#3d2c2d'
  inverse-on-surface: '#ffeced'
  outline: '#8e6f71'
  outline-variant: '#e3bebf'
  surface-tint: '#bb103e'
  primary: '#b70b3c'
  on-primary: '#ffffff'
  primary-container: '#da2f53'
  on-primary-container: '#fffbff'
  inverse-primary: '#ffb2b8'
  secondary: '#3f49d5'
  on-secondary: '#ffffff'
  secondary-container: '#5964ef'
  on-secondary-container: '#fffbff'
  tertiary: '#006a39'
  on-tertiary: '#ffffff'
  tertiary-container: '#008649'
  on-tertiary-container: '#f6fff4'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdadb'
  primary-fixed-dim: '#ffb2b8'
  on-primary-fixed: '#40000f'
  on-primary-fixed-variant: '#91002d'
  secondary-fixed: '#e0e0ff'
  secondary-fixed-dim: '#bec2ff'
  on-secondary-fixed: '#00036b'
  on-secondary-fixed-variant: '#252fc0'
  tertiary-fixed: '#7afca8'
  tertiary-fixed-dim: '#5cde8e'
  on-tertiary-fixed: '#00210e'
  on-tertiary-fixed-variant: '#00522b'
  background: '#fff8f7'
  on-background: '#271719'
  surface-variant: '#f8dcdd'
  surface-dark: '#1a1a1a'
  soft-pink-bg: '#fff5f6'
  soft-blue-bg: '#f0f4ff'
  gradient-start: '#ff4b6b'
  gradient-end: '#ff8e6e'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 48px
    fontWeight: '800'
    lineHeight: 56px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '800'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 30px
    fontWeight: '700'
    lineHeight: 38px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.03em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  section-gap: 80px
  card-padding: 24px
  container-max: 1200px
  gutter: 24px
---

## Brand & Style

This design system shifts the "Academic Modernism" philosophy toward a more energetic, high-impact aesthetic. It blends the structural reliability of educational platforms with the dynamic visual language of modern EdTech. The tone is motivating and "pro-active," designed to inspire students through vibrant color pops and soft, welcoming geometries.

The visual style is **Corporate / Modern** with a strong infusion of **Glassmorphism** and soft gradients. It maintains trust through precise typography and clean grids but differentiates itself with fluid, organic background elements and highly tactile, rounded components. The result is an interface that feels like a premium digital campus—structured enough for serious study, but lively enough to keep users engaged.

## Colors

The palette is defined by high-energy brand colors set against ultra-clean or deep-contrast surfaces.

- **Primary:** A vibrant Coral/Pink (#ff4b6b) used for primary calls to action, progress indicators, and key brand highlights. It should often be applied as a linear gradient (moving toward a softer orange-pink) to add depth.
- **Secondary:** A soft Indigo/Blue (#5c67f2) acts as a functional secondary color, used for informational tags, links, and "softer" interactions.
- **Surface & Neutrals:** Deep surfaces use a dark indigo-tinted black (#1a1a1a) for a premium, focused feel. Light surfaces utilize off-whites with extremely subtle pink or blue tints (#fff5f6 or #f0f4ff) to create distinct section pacing.
- **Gradients:** Use soft radial and linear gradients for section backgrounds to break up the vertical flow, mimicking the "glow" seen in the reference imagery.

## Typography

The system utilizes **Plus Jakarta Sans** exclusively across all roles to maintain a cohesive, "academic-modern" aesthetic.

- **Weight Strategy:** Headings utilize ExtraBold (800) and Bold (700) weights to create a strong visual hierarchy against the vibrant background colors.
- **Body Content:** Body text is set in Regular (400) weight with generous line-height to ensure readability during long reading sessions.
- **Contrast:** On dark surfaces (#1a1a1a), use pure white or very high-contrast grey for body text, while maintaining primary coral for key headlines.

## Layout & Spacing

The layout follows a **Fixed Grid** model for desktop to ensure content remains centered and readable, moving to a fluid model for mobile.

- **Sectioning:** Use large vertical gaps (80px+) between major landing sections. Background color shifts (from white to soft-pink-bg) should be used to delineate different functional areas.
- **Grid:** A 12-column grid is standard. Cards typically span 3 columns (4 per row) or 4 columns (3 per row) depending on the content density.
- **Mobile Adaptation:** On mobile, margins reduce to 16px. Cards should stack vertically with a minimum spacing of 16px between them.

## Elevation & Depth

Hierarchy is established through a mix of **Tonal Layers** and **Ambient Shadows**.

- **Level 1 (Default):** Flat surfaces with subtle 1px borders in very light grey or tinted pink.
- **Level 2 (Cards):** Use extremely soft, wide-spread shadows to create a "floating" effect: `0px 10px 30px rgba(0, 0, 0, 0.04)`.
- **Level 3 (Interactive):** On hover, cards should slightly scale up (1.02x) and the shadow should deepen to `0px 20px 40px rgba(255, 75, 107, 0.1)`, introducing a brand-colored tint to the elevation.
- **Backdrop Blurs:** Use subtle blurs (8px to 12px) for sticky navigation bars and modal overlays to maintain context while focusing user attention.

## Shapes

The shape language is "Rounded," emphasizing friendliness and accessibility.

- **Cards:** Use the `rounded-xl` (1.5rem / 24px) setting for all primary course and content cards.
- **Buttons:** Buttons should use a high roundedness (1rem or full pill) to feel tactile and "clickable."
- **Icons:** Icons should follow the geometric language of the brand mark—using thick strokes, rounded ends, and enclosed shapes.

## Components

- **Buttons:** Primary buttons use a linear gradient (#ff4b6b to #ff8e6e) with a subtle drop shadow. Secondary buttons are ghost-style with a 2px primary-colored border.
- **Cards:** Content cards feature a white background, `rounded-xl` corners, and a 1px soft-grey border. The top section often houses a 16:9 image with its own internal rounding (12px).
- **Chips:** Used for category tags. These should have a pill shape, a very light tint of the primary color, and bolded label-sm text in the primary color.
- **Input Fields:** Use a 50px height for standard inputs with a 12px corner radius. On focus, the border should transition to the primary coral with a 3px soft-glow outer ring.
- **Course Progress:** Use a thick (8px) progress bar with rounded ends. The unfilled portion should be a very light grey (#eee), and the filled portion should use the brand gradient.
- **Navigation:** The top bar should be sticky, featuring a blurred background and a primary-colored "Join/Login" button as the clear end-action.