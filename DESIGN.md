# Design Brief

## Direction

Frontier: Missile Horizon — a dark military command HUD for a decentralized strategy game on ICP where players purchase land, accumulate tokens, and compete on-chain.

## Tone

Uncompromising military command center aesthetic with frosted glass panels and cyan glowing accents; functional precision over decoration; high-contrast clarity optimized for tactical decision-making.

## Differentiation

Every UI element serves gameplay clarity and real-time token flow visibility; frosted glass surfaces at multiple depth levels create visual hierarchy without distraction; cyan accents cut through dark HUD to signal critical interactions.

## Color Palette

| Token      | OKLCH          | Role                             |
|:-----------|:---------------|:---------------------------------|
| background | 8% 0.025 240   | Primary dark HUD surface         |
| foreground | 93% 0.018 200  | Text and primary interactive     |
| card       | 13% 0.03 240   | Raised panels and tactical areas |
| primary    | 82% 0.19 195   | Cyan accent, highlights, CTAs    |
| accent     | 68% 0.185 185  | Secondary cyan, ring/focus       |
| muted      | 22% 0.035 240  | Borders, subtle UI dividers      |
| border     | 32% 0.08 200   | Strong borders, section breaks   |

## Typography

- Display: BricolageGrotesque (medium/bold) — plot names, section headers, tactical labels
- Body: GeneralSans (regular/medium) — UI labels, resource counts, balance display, leaderboard
- Scale: hero `text-4xl font-bold`, h2 `text-2xl font-bold`, label `text-sm font-semibold uppercase`, body `text-base`

## Elevation & Depth

Three surface layers (base HUD, raised panels, floating modals) differentiated by frosted glass backdrop-filter blur radius (12px base, 16px panels) and border opacity; no soft shadows, only hard borders and transparency.

## Structural Zones

| Zone          | Background     | Border                          | Notes                                                    |
|:--------------|:---------------|:--------------------------------|:---------------------------------------------------------|
| Top HUD       | `glass-dark`   | 1px cyan / 0.3 opacity          | Real-time balance ticker, FRNTR + 4 resources at 8 decimals |
| Main Canvas   | base           | —                               | 3D globe with hex grid, no UI overlay                    |
| Tactical Panel | `glass`        | 1px cyan / 0.5 opacity          | Plot stats, defense, formation selector when plot selected |
| Bottom Nav    | `glass-dark`   | 1px cyan / 0.3 opacity (top)    | LAND, LEADERBOARD, INVENTORY tabs; 44px fixed height     |
| Modal Overlay | `glass` / 0.95 | 1px cyan / 0.6 opacity          | Leaderboard, inventory loadout, marketplace shells       |

## Spacing & Rhythm

Compact 8px grid; 16px section padding; 12px gaps between interactive elements; dense information layout supports real-time monitoring without visual clutter.

## Component Patterns

- Buttons: 8px roundness, cyan bg `bg-primary`, dark fg, no shadow, hover scales slightly
- Cards: 8px roundness, `bg-card`, 1px cyan/0.3 border, stacked vertically or grid-aligned
- Badges: 6px roundness, `bg-muted`, white fg, no fill on inactive
- Input: 6px roundness, `bg-input`, 1px border, cyan focus ring
- Tactical indicators: glowing cyan text or border highlight on active/focus

## Motion

- Entrance: fade in 200ms ease-out; modals slide up from bottom 300ms cubic-bezier
- Hover: 0.2s color/scale transition; active elements pulse-glow on-chain state changes
- Decorative: subtle starfield twinkle in background (non-game areas); pulse-glow on selected plot; orbit animation on loading states

## Constraints

- No shadows or soft effects — transparency and blur only
- No rounded corners >12px (military precision)
- No animations in game-critical HUD zones (only status/loading areas)
- Cyan accent must maintain ≥85% opacity to cut through dark background
- v1.0 minimal UI: LAND, LEADERBOARD, INVENTORY tabs only; no visible zones for commander NFTs, sub-plots, weapons, combat, factions
- Mobile-first responsive; bottom nav sticky at 44px; canvas scales to fill remaining space
- All balances display at 8 decimal precision; real-time ticking updates every 100ms
- Accessibility: all interactive elements ≥44px touch target; cyan accent has sufficient contrast against dark bg (14:1)

## Signature Detail

Frosted glass surfaces with variable blur depth and cyan glow-borders create a layered tactical interface that feels both tangible and ethereal — functional precision embedded in luxury translucence. The cyan accent acts as the only "warm" element, commanding attention without screaming.
