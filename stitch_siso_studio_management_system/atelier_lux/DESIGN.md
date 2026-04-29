# Design System Strategy: The Curated Canvas

## 1. Overview & Creative North Star
**Creative North Star: "The Curated Canvas"**
This design system is not merely a utility; it is a high-end editorial environment designed to mirror the precision and elegance of a world-class interior design studio. We are moving away from the "grid-of-boxes" aesthetic typical of SaaS. Instead, the UI acts as a sophisticated backdrop—a canvas—where projects are showcased with architectural clarity. 

By leveraging **Manrope’s** geometric yet humanistic qualities and a palette of deep obsidian and muted gold, we create a sense of "Quiet Luxury." We break the template look through **Tonal Layering** and **Intentional Asymmetry**, ensuring that the software feels as bespoke as the interiors our users create.

---

## 2. Colors & Surface Architecture
The color strategy relies on depth and atmosphere rather than structural lines.

### Color Tokens
- **Primary (Deep Obsidian):** `#091426` (`primary`) – Used for the core structural sidebar and high-authority actions.
- **Secondary (Muted Gold):** `#7B5800` (`secondary`) – Our "Signature Accent." Use this sparingly for moments of delight, luxury status indicators, or primary CTA highlights.
- **Neutral Base:** `#F9F9F9` (`surface`) – A warm off-white that prevents screen fatigue and feels more "paper-like" than pure white.

### The "No-Line" Rule
**Explicit Instruction:** Prohibit the use of 1px solid borders for sectioning or containers. 
- **Definition by Tone:** Define boundaries solely through background shifts. For example, a `surface-container-low` card sitting on a `surface` background provides enough contrast to be felt without being "boxed in."
- **Nesting Hierarchy:** Treat the UI as physical layers. 
    - **Level 0 (Base):** `surface` (#F9F9F9)
    - **Level 1 (Sections):** `surface-container-low` (#F3F3F3)
    - **Level 2 (Active Cards):** `surface-container-lowest` (#FFFFFF)

### Glassmorphism & Signature Textures
To elevate the "Premium" feel, use **Backdrop Blurs** (20px–30px) on floating elements like navigation bars or modal overlays. 
- Use a semi-transparent `surface-container-lowest` (80% opacity) with a blur.
- **CTA Soul:** Main buttons should use a subtle vertical gradient from `primary` (#091426) to `primary-container` (#1E293B) to add a three-dimensional, "tactile" quality.

---

## 3. Typography
The typography is the voice of the brand: authoritative, clean, and spacious.

- **Display & Headlines (Manrope):** Use bold weights and tight letter-spacing (-0.02em). Headlines should feel like title cards in a gallery.
- **Body (Manrope):** Use `body-md` (0.875rem) for most data-heavy areas to maintain a "breathable" density.
- **Labels (Inter):** We switch to **Inter** for micro-copy and functional labels (`label-md`). Its higher x-height ensures legibility at small sizes (11px-12px) without competing with the editorial feel of Manrope.

**Hierarchy Note:** Use high contrast between `headline-lg` and `body-sm`. Don't be afraid of large white spaces—luxury is defined by the space you *don't* fill.

---

## 4. Elevation & Depth
Depth is achieved through "Atmospheric Perspective," not structural geometry.

- **The Layering Principle:** Stack `surface-container` tiers to create natural lift. A white card on a light grey background is our standard for "elevated" content.
- **Ambient Shadows:** When a component must float (e.g., a dropdown or modal), use an ultra-diffused shadow:
    - **Shadow:** `0 20px 40px rgba(26, 28, 28, 0.06)`
    - **Color:** The shadow should be a tinted version of `on-surface` (#1A1C1C), never pure black.
- **The Ghost Border:** If accessibility requires a stroke (e.g., in high-contrast modes), use `outline-variant` at **15% opacity**. It should be a suggestion of a line, not a boundary.

---

## 5. Components

### Buttons
- **Primary:** Manrope Bold, `primary` to `primary-container` gradient. 16px (xl) corner radius.
- **Secondary:** Transparent background with a `secondary` (Gold) text color. No border.
- **States:** On hover, primary buttons should subtly scale (1.02x) rather than just changing color.

### Cards & Lists
- **Rule:** **No Divider Lines.** 
- Separate list items using `12px` of vertical whitespace or by alternating background tones (`surface` to `surface-container-low`). 
- **Cards:** Always use `1.0rem` (lg) or `1.5rem` (xl) corner radius. Content inside cards should have generous padding (min 24px).

### Input Fields
- Avoid the "box" look. Use a `surface-container-highest` background with a bottom-only focus indicator in `secondary` (Gold).
- Labels should be `label-sm` in `on-surface-variant`, sitting 8px above the input.

### Soft Pill Badges
- Used for project status (e.g., "In Concept," "Sourcing"). 
- Use `secondary-fixed-dim` background with `on-secondary-fixed` text. The lack of harsh borders makes these feel integrated into the editorial flow.

### Studio-Specific Components
- **Moodboard Tiles:** Asymmetrical image containers with `16px` rounding and a "Ghost Border" on hover.
- **Timeline Scrubber:** A minimal horizontal line using `outline-variant` with a `secondary` gold handle to indicate project progress.

---

## 6. Do’s and Don’ts

### Do:
- **Do** use whitespace as a functional element. If an interface feels crowded, increase the padding, don't add a border.
- **Do** use "Optical Alignment." Sometimes a gold accent needs to be nudged 1px to feel centered in a high-end layout.
- **Do** mix Manrope Bold headlines with very light, high-spaced Inter labels for an "Architectural" feel.

### Don't:
- **Don't** use pure black (#000000). Use our `primary` (#091426) for depth.
- **Don't** use standard 1px dividers. They break the "Canvas" flow. Use tonal shifts or space.
- **Don't** use aggressive animations. Transitions should be slow and easing (e.g., `cubic-bezier(0.4, 0, 0.2, 1)` over 300ms).
- **Don't** crowd the sidebar. The Dark Navy sidebar should feel like a premium leather-bound folder—functional but prestigious.