---
name: UXISM Design System
description: >
  Design language manifesto, engineering specification, and AI generation doctrine
  for the UXISM interface ecosystem. Use this skill whenever generating UI components,
  layouts, screens, interactions, or animations within this design system. Encodes
  color tokens, typography rules, spatial philosophy, motion principles, component
  construction rules, anti-patterns, and a QA checklist. The system is built on a
  dark-first philosophy: darkness is the medium, content emerges from it.
version: 1.0.0
triggers:
  - uxism
  - design system
  - dark UI
  - coral lime accent
  - accordion navigation
  - engineering aesthetic
  - technical drawing UI
  - DEF767
  - ff6a6a accent
  - GROZEN MEDICAL
---


# uxism Design System — SKILL

**Core:** Darkness is the medium. Content emerges from it. Restraint is the brand value. Default state is sparse — density is earned.

---

## Colors
| Token | Hex | Role |
|---|---|---|
| Base BG | `#181818` | Default surface |
| Deep BG | `#171717` | Inset/depressed surface |
| Border | `#2e2e2e` | All structural borders |
| Muted | `#5b5b5b` | De-emphasized text, inactive icons |
| Secondary | `#929292` | Nav labels, supporting text |
| Primary | `#ffffff` | High-emphasis text |
| Lime | `#DEF767` | Active FAB border only — binary |
| Coral | `#ff6a6a` | Selected nav flood only — binary |

**Rules:** No elevation or shadows — use border contrast only. Two surfaces max. Lime and coral are fully on or fully off — never tinted, gradient, or decorative. Hierarchy = luminance, not size or weight.

---

## Typography
| Role | Typeface | Use |
|---|---|---|
| Display / nav labels | GROZEN MEDICAL (serif) | Wordmark, headings, nav items |
| Body copy | Onest / Cygre (humanist sans) | All body text |
| Metadata | Geist Mono | Coordinates, labels, meta |

Never swap roles. Active state = color change (`#ff6a6a`), never bold or size increase. Nav: `16px uppercase, letter-spacing 0.04em`. Body: `13px, #929292, line-height 1.5`. Max 3 info pieces per row: label → icon state → body.

---

## Layout
- Content: `x=20px` to `x≈75%` width.
- Right 25% rail: **FABs only. Sacred. Nothing else.**
- Dot grid: full-bleed underlay, `25% opacity`. Structure, not decoration.
- Splash content: exact `50% x/y`. Surrounding void is intentional.
- Corner `+` crosshairs frame the viewport — no full borders.
- When in doubt, add space.

---

## Navigation
- No tab bar, no sidebar. Hamburger triggers full-screen accordion.
- Touch targets: `90px` rows. Items share `-1px` borders (unified slab, not cards).
- Selected state (3 simultaneous signals): background floods `#ff6a6a` / text inverts to `#171717` / icon rotates 45° (`+` → `×`).
- No underline, bold, or scale for selection. Flood only.

---

## FABs (Right Rail)
- Two only: Recenter (top) + Explore (bottom), `16px` apart, bottom-right fixed.
- Size: `40×40px`, `24px` radius, no label.
- Active border: `rgba(222,247,103,0.5)`. Inactive: `#5b5b5b`. Background always `#181818`.
- Border is the affordance. Nothing else changes.

---

## Spectral Blob
- The only emotional element (multi-color radial: blue→purple→magenta→yellow).
- Splash/hero layer only. New screens may carry a subtle version (glow, gradient node).
- Never competes with interactive content. Background layer only.

---

## Interactions
- Every tappable element gets lime OR coral on active — binary, nothing between.
- Icon rotation (`+`→`×`) is the primary micro-animation.
- No elevation transitions, no card lift, no shadow animation.

---

## The 6 Laws
1. Darkness is the content — nothing sits *on* it, everything emerges *from* it.
2. Accents are binary — lime and coral fully on or fully off, never decorative.
3. Technical drawing aesthetic — crosshairs, coordinates, dot grid signal precision.
4. Blob = emotional counterweight — carry subtly; never let it dominate.
5. Nav hides until invoked — only FABs are always visible.
6. Generous by default, tight under pressure — sparse is the resting state.

---

## Never Do
- Box shadows or elevation
- Accent colors at partial opacity or decoratively
- More than 2 FABs
- Anything in the right 25% rail except FABs
- Bold/size to signal importance — use color
- Font role swapping
- Blob in foreground or competing with UI
- More than 3 info pieces per row
- Full viewport borders (corner brackets only)
