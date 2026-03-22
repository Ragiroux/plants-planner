# Design System — Plantes Planner

## Product Context
- **What this is:** AI-powered garden management platform for Quebec vegetable gardeners
- **Who it's for:** Quebec home gardeners (5-20 plant varieties), tech-savvy, want to optimize without it being a second job
- **Space/industry:** Garden planning apps (competitors: La Main Verte, GrowVeg, VegPlotter, Planter, Almanac)
- **Project type:** Web app (Next.js 15, shadcn/ui, responsive)

## Aesthetic Direction
- **Direction:** Organic/Natural meets Editorial
- **Decoration level:** Intentional — subtle warm texture on backgrounds, soft shadows, natural feeling without literal decoration (no leaf patterns, no stock photos)
- **Mood:** Artisanal garden shop, not hardware store garden section. The app should feel like holding a well-made object — warm, considered, professional. Think Aesop (skincare brand) aesthetic applied to gardening tools.
- **Reference sites:** La Main Verte (what to avoid — utilitarian, dated), GrowVeg (cluttered blog feel), VegPlotter (functional but forgettable)

## Typography
- **Display/Hero:** Fraunces (variable, optical-size) — Warm serif with personality. Gives the app an editorial, artisanal quality that no competitor has. Slightly quirky at display sizes.
- **Body:** Plus Jakarta Sans — Clean geometric sans with excellent readability at small sizes. Friendly without being childish.
- **UI/Labels:** Plus Jakarta Sans (same as body, weight 500-600)
- **Data/Tables:** Plus Jakarta Sans (tabular-nums) — Consistent with body, numbers align in columns
- **Code:** JetBrains Mono
- **Loading:** Google Fonts CDN — `https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;0,9..144,500;0,9..144,600;0,9..144,700;0,9..144,800;1,9..144,400;1,9..144,500&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap`
- **Scale:**
  - xs: 11px / 0.6875rem
  - sm: 13px / 0.8125rem
  - base: 16px / 1rem
  - lg: 18px / 1.125rem
  - xl: 22px / 1.375rem
  - 2xl: 28px / 1.75rem
  - 3xl: 36px / 2.25rem
  - 4xl: 48px / 3rem
  - 5xl: 56px / 3.5rem

## Color
- **Approach:** Restrained with warmth — 1 primary + 1 secondary accent, warm neutrals
- **Primary:** #2D5A3D — Deep forest green. NOT the bright lime every competitor uses. Evokes Quebec boreal forest.
  - Light: #3D7A52 (hover states)
  - Dark: #1E3D2A (pressed states)
- **Secondary:** #C4703F — Terracotta. Earthy warmth, used sparingly for CTAs and accents.
  - Light: #D4854F (hover)
  - Dark: #A45D33 (pressed)
- **Background:** #FAF8F5 — Warm cream, not pure white. Subconsciously organic.
- **Surface:** #FFFFFF — Cards and elevated elements float on cream.
- **Neutrals (warm grays):**
  - 50: #FAF8F5
  - 100: #F5F2EE
  - 200: #E8E4DE
  - 300: #D4CFC7
  - 400: #A9A29A
  - 500: #7D766E
  - 600: #5C5650
  - 700: #3D3832
  - 800: #2A2622
- **Semantic:**
  - Success: #3D8B5D
  - Warning: #D4973B
  - Error: #C4463A
  - Info: #4A7FA5
- **Calendar bars (Ecoumene):**
  - Semis interieur: #E8912D (orange)
  - Repiquage semis: #D45FA0 (pink)
  - Semis exterieur: #D4C24A (yellow)
  - Transplantation potager: #4A9E4A (green)
  - Recolte: #C0392B (red)
  - Today indicator: #E8A317 (gold)
- **Dark mode:** Invert neutrals, reduce color saturation 10-20%, surfaces become #242220, background #1A1816. Primary shifts to #5BA875 for contrast.

## Spacing
- **Base unit:** 4px
- **Density:** Comfortable (calendar timeline can be compact; rest of app breathes)
- **Scale:** 2xs(2) xs(4) sm(8) md(16) lg(24) xl(32) 2xl(48) 3xl(64)

## Layout
- **Approach:** Grid-disciplined — clean columns, predictable alignment, calendar as data-rich centerpiece
- **Grid:** 12 columns (desktop), 4 columns (mobile)
- **Max content width:** 1100px
- **Border radius:**
  - sm: 4px (small elements, tags, badges)
  - md: 8px (buttons, inputs, alerts)
  - lg: 12px (cards, dropdowns)
  - xl: 16px (dashboard container, modals)
  - full: 9999px (avatars, pills, badges)

## Motion
- **Approach:** Minimal-functional — smooth transitions for state changes. No bounce, no spring. The data is the star.
- **Easing:** enter(ease-out) exit(ease-in) move(ease-in-out)
- **Duration:** micro(50-100ms) short(150-250ms) medium(250-400ms) long(400-700ms)
- **Card hover:** translateY(-1px) + shadow elevation, 200ms ease-out

## Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-03-22 | Initial design system created | Created by /design-consultation based on office-hours product context + competitive research of La Main Verte, GrowVeg, VegPlotter |
| 2026-03-22 | Fraunces serif for display | Every garden app uses sans-serif. Serif gives editorial, artisanal premium feel — instant visual differentiation |
| 2026-03-22 | Deep forest green (#2D5A3D) over bright lime | Competitors all use bright lime/grass green. Deep forest evokes Quebec boreal landscape, feels premium |
| 2026-03-22 | Terracotta secondary (#C4703F) | Breaks the green-on-green pattern every competitor uses. Adds earth warmth, beautiful CTAs against forest green |
| 2026-03-22 | Warm cream background (#FAF8F5) | Not pure white. Subconsciously warmer, more organic. Cards (white) float with subtle distinction |
| 2026-03-22 | Ecoumene calendar colors preserved | Users familiar with Ecoumene PDFs expect these colors. Familiarity aids adoption |
| 2026-03-22 | Plus Jakarta Sans body | Clean geometric sans, friendly without childish. Excellent readability at small data sizes |
