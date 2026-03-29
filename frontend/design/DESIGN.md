# Design System Specification: High-Density Market Intelligence

## 1. Overview & Creative North Star
The "Creative North Star" for this design system is **The Financial Architect**. This system rejects the cluttered, "spreadsheet-gray" aesthetic of traditional data tools in favor of a sophisticated, editorial-inspired environment. It treats market data not as a series of rows, but as a landscape of intelligence.

To move beyond a generic "SaaS dashboard," this system utilizes **intentional asymmetry** and **tonal layering**. Large-scale `display-lg` typography is used for macro-indicators, creating a high-contrast relationship with the `body-sm` data density. Elements should overlap slightly or use nested background shifts to create a sense of architectural depth, ensuring the professional "Emerald" palette feels premium and curated rather than merely functional.

---

## 2. Colors & Surface Philosophy
The palette is rooted in a deep, authoritative emerald base, supported by high-vibrancy mint accents for data visualization and action.

### The "No-Line" Rule
To achieve a high-end editorial feel, **1px solid borders are strictly prohibited for sectioning.** Boundaries must be defined through tonal shifts. For example, a `surface-container-low` component should sit directly on a `background` surface without a stroke. Separation is achieved through the Spacing Scale (the "Void") rather than physical lines.

### Surface Hierarchy & Nesting
Use the `surface-container` tiers to create a "stacked paper" effect. 
- **Base Level:** `background` (#f7f9fb)
- **Primary Layout Sections:** `surface-container-low` (#f2f4f6)
- **Interactive Cards:** `surface-container-lowest` (#ffffff) to create a subtle pop of "white" against the neutral base.
- **Active States/Overlays:** `surface-container-highest` (#e0e3e5)

### The "Glass & Gradient" Rule
For floating panels (e.g., filter drawers or hover states), utilize **Glassmorphism**. Apply `surface-container-lowest` with an 85% opacity and a `20px` backdrop-blur. 
For primary CTAs and high-level trend visualizations, use a linear gradient: `primary-container` (#114f11) to `primary` (#003703) at a 135-degree angle. This adds "soul" and prevents the interface from looking flat.

---

## 3. Typography
We use a dual-font strategy to balance legibility with professional authority. 

*   **Manrope (Display & Headlines):** Used for macro-data and section titles. Its geometric nature provides a modern, "architectural" feel.
*   **Inter (Title, Body, Labels):** Used for micro-data and navigation. Its high X-height ensures legibility in dense tables.

| Role | Font | Size | Weight | Usage |
| :--- | :--- | :--- | :--- | :--- |
| `display-lg` | Manrope | 3.5rem | 700 | Primary Market KPI |
| `headline-sm` | Manrope | 1.5rem | 600 | Section Headers |
| `title-sm` | Inter | 1.0rem | 600 | Card Titles / Field Labels |
| `body-md` | Inter | 0.875rem | 400 | Data Table Rows |
| `label-sm` | Inter | 0.6875rem | 500 | Metadata / Micro-caps |

---

## 4. Elevation & Depth
This design system avoids traditional drop shadows in favor of **Tonal Layering**.

*   **The Layering Principle:** Place a `surface-container-lowest` card on a `surface-container-low` background. The slight shift in hex value provides a natural "lift" that is easier on the eye during long analytical sessions.
*   **Ambient Shadows:** Use only for floating elements (Modals, Popovers). Use a large blur (`32px`) and very low opacity (`4-6%`). The shadow color must be a tinted version of `on-surface` (#191c1e) to mimic natural light.
*   **The Ghost Border:** If a visual boundary is required for accessibility in dense tables, use the `outline-variant` token at **15% opacity**. Never use a 100% opaque border.

---

## 5. Components

### Buttons
*   **Primary:** Gradient from `primary-container` to `primary`. Text in `on-primary`. Roundedness: `DEFAULT` (8px).
*   **Secondary:** Ghost style. No background, `outline-variant` (20% opacity) border. Text in `primary_container`.
*   **Tertiary:** No border, no background. Text in `secondary` (#006e20) for "Actionable" intelligence.

### Cards & Data Lists
*   **Forbid Divider Lines:** Use `Spacing 4` (0.9rem) or `Spacing 5` (1.1rem) to separate list items. 
*   **Data Density:** Use `body-sm` for table content to maximize information density. Use `surface-container-low` for alternating "zebra" stripes instead of lines.

### Input Fields
*   **Styling:** Fill with `surface-container-lowest`. Bottom-only "Ghost Border" using `outline-variant` at 20% opacity. On focus, transition the border to `secondary` (#006e20) and add a subtle glow.

### Signature Component: The Intelligence Chip
*   **Function:** Used for market sentiment (Bullish/Bearish).
*   **Style:** `tertiary-fixed` background with `on-tertiary-fixed-variant` text. High roundedness (`full`).

---

## 6. Do’s and Don’ts

### Do
*   **Do** use asymmetrical margins. If a left-hand column is `Spacing 8`, consider making the right-hand column `Spacing 12` to create a professional, editorial rhythm.
*   **Do** use `secondary_fixed` (#98f897) for positive delta movements in charts.
*   **Do** embrace white space. "High Density" does not mean "Cramped." Use the `Spacing Scale` religiously.

### Don't
*   **Don't** use pure black (#000000) for text. Always use `on-surface` (#191c1e) to maintain the "Emerald" tonal harmony.
*   **Don't** use standard Material Design shadows. They are too heavy for a data-heavy dashboard. Stick to Tonal Layering.
*   **Don't** use more than two levels of nesting. If you need a third level of depth, use a `backdrop-blur` overlay instead of another background color shift.

---

## 7. Tokens Reference Summary

*   **Corner Radius:** `DEFAULT: 0.5rem (8px)` for all primary containers.
*   **Spacing Base:** `0.2rem` (all margins/padding must be multiples of this).
*   **Core Neutral:** `surface: #f7f9fb`.
*   **Core Action:** `primary_container: #114f11`.