```markdown
# Design System Specification: The Curated Canvas

## 1. Overview & Creative North Star
**Creative North Star: "The Digital Atelier"**

This design system is crafted to mirror the precision and tactile luxury of a high-end interior design studio. We are moving away from the "functional-only" aesthetic of standard SaaS platforms to create a "Digital Atelier"—a space that feels curated, architectural, and serene. 

To achieve this, the system breaks the traditional rigid grid. We embrace **intentional asymmetry**, where large editorial headlines counterbalance functional data tables. We utilize **layered depth** to simulate physical materials—fine paper, brushed metal, and frosted glass. The interface does not just manage tasks; it frames the beauty of the design work itself.

---

## 2. Colors & Surface Philosophy

The color palette is anchored in a sophisticated "Tuxedo" contrast: deep charcoal foundations paired with airy, off-white canvases and punctuated by muted gold accents.

### The "No-Line" Rule
**Explicit Instruction:** Designers are prohibited from using 1px solid borders to define sections or containers. 
Structure must be achieved through:
*   **Tonal Shifts:** Placing a `surface-container-low` component against a `surface` background.
*   **Whitespace:** Using the spacing scale to create mental boundaries.
*   **Depth:** Utilizing subtle shadows or glassmorphism to lift elements.

### Surface Hierarchy & Nesting
Treat the UI as a physical stack of materials.
1.  **Base Layer (`surface` / #f9f9f9):** The main stage.
2.  **Section Layer (`surface-container-low` / #f3f3f3):** Large grouping areas.
3.  **Component Layer (`surface-container-lowest` / #ffffff):** Individual cards or interactive units. This creates a "soft lift" that feels premium rather than clinical.

### The "Glass & Gold" Rule
*   **Glassmorphism:** For floating menus or high-level overlays (like a quick-view project drawer), use `surface-container-lowest` at 80% opacity with a `20px` backdrop-blur. 
*   **Signature Gradients:** Use a subtle linear gradient for primary CTAs: `primary` (#785600) to `primary_container` (#986d00) at a 135-degree angle. This adds a "metallic" sheen reminiscent of bronze hardware.

---

## 3. Typography

The typography strategy relies on a "High-Low" mix: **Manrope** for authoritative, geometric Hebrew headlines and **Inter** for high-performance, legible data.

*   **Display & Headlines (Manrope):** These are the "editorial" voice. Use `display-lg` and `headline-md` for project titles and high-level navigation. They should feel airy with increased letter-spacing (where applicable in Hebrew script).
*   **Body & Labels (Inter):** These are the "utility" voice. They provide clarity in dense management views.
*   **Hierarchy as Identity:** Use a significant scale jump between headlines and body text. A project name should feel like a title on a gallery wall, while task details feel like the fine print on a blueprint.

---

## 4. Elevation & Depth

We eschew traditional structural lines in favor of **Tonal Layering**.

*   **The Layering Principle:** Depth is achieved by stacking. A `surface-container-lowest` card placed on a `surface-container-high` background creates an immediate, natural focal point without a single pixel of border.
*   **Ambient Shadows:** For elements that require a "floating" state (e.g., active cards, dropdowns), use a custom shadow:
    *   `box-shadow: 0 12px 40px -10px rgba(26, 28, 28, 0.08);`
    *   Note the low opacity and high blur; it mimics natural light hitting a matte surface.
*   **The "Ghost Border" Fallback:** If a border is required for accessibility, use the `outline_variant` token at **15% opacity**. It should be felt, not seen.

---

## 5. Components

### Cards & Lists
*   **Strict Rule:** No divider lines. Separate list items using `8px` of vertical margin and a subtle background hover state (`surface-container-highest`).
*   **Radius:** All cards must use the `xl` (1.5rem / 24px) or `lg` (1rem / 16px) corner radius to soften the technical nature of the software.

### Buttons
*   **Primary:** A "Muted Gold" gradient (from `primary` to `primary_container`). Text is `on_primary`. High-gloss, high-impact.
*   **Secondary:** `surface-container-highest` background with `primary` text. No border.
*   **Tertiary:** Text-only using `primary` color, with a `surface-container-low` background appearing only on hover.

### Inputs & Selection
*   **Fields:** Background should be `surface-container-low`. On focus, the background shifts to `surface-container-lowest` with a subtle `primary` "Ghost Border."
*   **Pills (Status Badges):** Use highly desaturated versions of status colors. A "Completed" pill should be a very pale mint with dark forest-green text, ensuring the gold accent remains the only "vibrant" element on the page.

### Navigation Sidebar (Dark Navy/Charcoal)
*   **Background:** `secondary_fixed_variant` (#3c475a) or the specific dark navy (#1E293B).
*   **Active State:** Use a "cut-out" effect where the active tab takes the `surface` color (#f9f9f9), making the sidebar feel like it is physically tucked behind the main content area.

---

## 6. Do’s and Don'ts

### Do
*   **Do** use RTL-specific alignment for Manrope: ensure line-heights are generous (1.6+) to accommodate Hebrew diacritics without crowding.
*   **Do** lean into whitespace. If a layout feels "busy," increase the padding to the next tier in the scale rather than adding a border.
*   **Do** use Lucide icons with a thin `1.5px` stroke weight to maintain the "luxury line-art" feel.

### Don't
*   **Don't** use pure black (#000000) for text. Use `on_surface` (#1a1c1c) to maintain a soft, high-end print look.
*   **Don't** use high-saturation reds or greens for alerts. Stick to the muted, architectural palette even for error states (`error` / #ba1a1a).
*   **Don't** use "Monday.com style" bright primary blues. This system is grounded in earth tones (gold, charcoal, off-white).

---

## 7. Signature Layout Component: The "Architectural Drawer"
For project details, avoid standard modals. Use a full-height **Right-to-Left Slide-out Drawer** (aligned to the right for Hebrew) using `surface-container-lowest` and a `40%` backdrop-blur overlay. This maintains the user's context while providing a focused, paper-like surface for deep work.```