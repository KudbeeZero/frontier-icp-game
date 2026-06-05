# Design Brief

## Direction

Frontier: Missile Horizon — a dark military command HUD for a decentralized strategy game on ICP where players purchase land, accumulate tokens, and compete on-chain. Desktop-first, premium command center aesthetic with frosted glass layering and electric cyan accents.

## Tone

Uncompromising military command center aesthetic with frosted glass panels and cyan glowing accents; functional precision over decoration; high-contrast clarity optimized for tactical decision-making; premium and refined without ostentation.

## Differentiation

Every UI element serves gameplay clarity and real-time token flow visibility; frosted glass surfaces at multiple depth levels create visual hierarchy without distraction; cyan accents cut through dark HUD to signal critical interactions; top bar feels like a flagship control center with FRNTR ticker, ICP/USD price feed, and principal badge; treasury dashboard displays live pot balances with monospace precision.

## Color Palette

| Token      | OKLCH          | Role                             |
|:-----------|:---------------|:---------------------------------|
| background | 8% 0.025 240   | Primary dark HUD surface         |
| foreground | 93% 0.018 200  | Text and primary interactive     |
| card       | 13% 0.03 240   | Raised panels and tactical areas |
| primary    | 82% 0.19 195   | Cyan accent, highlights, CTAs    |
| secondary  | 52% 0.22 42    | Amber/gold for FRNTR token       |
| muted      | 22% 0.035 240  | Borders, subtle UI dividers      |
| border     | 32% 0.08 200   | Strong borders, section breaks   |

## Typography

- Display: BricolageGrotesque (medium/bold) — plot names, section headers, tactical labels, top bar title
- Body: GeneralSans (regular/medium) — UI labels, resource counts, balance display, leaderboard
- Mono: JetBrainsMono (600 weight) — price tickers, treasury balances, numerical data (right-aligned, 0.05em letter-spacing)
- Scale: hero `text-4xl font-bold`, h2 `text-2xl font-bold`, label `text-sm font-semibold uppercase`, body `text-base`, price `text-xs font-mono`

## Elevation & Depth

Three surface layers (base HUD, raised panels, floating modals) differentiated by frosted glass backdrop-filter blur radius (12px base, 16px panels) and border opacity; no soft shadows, only hard borders and transparency; cyan top borders on treasury cards create accent depth.

## Structural Zones

| Zone          | Background     | Border                          | Notes                                                    |
|:--------------|:---------------|:--------------------------------|:---------------------------------------------------------|
| Top bar       | `glass-dark`   | 1px cyan / 0.3 opacity          | FRONTIER logo, nav links, live price ticker (ICP/USD + FRNTR/ICP), FRNTR balance, principal badge at 56px height |
| Main Canvas   | base           | —                               | 3D globe with hex grid, no UI overlay                    |
| Left Sidebar  | `glass-dark`   | 1px cyan / 0.3 opacity          | Quick-links and tactical status, 180px, scrollable       |
| Right Panels  | `glass`        | 1px cyan / 0.5 opacity          | Live data (UNIVERSE, tokenomics, treasury dashboard), 2D sub-parcel view |
| Treasury Dashboard | `glass`  | Cyan top border 3px (80% opacity)  | Three pot cards (dev, leaderboard, liquidity) with monospace balances, right-aligned, cyan top accent |
| 2D Sub-Parcel Panel | `glass` | 1px cyan / 0.5 opacity | Top-right corner, 7-slice radial hex (center Nexus + 6 segments) |
| Bottom Nav    | `glass-dark`   | 1px cyan / 0.3 opacity (top)    | 6 menu icons (MAP, LEADERBOARD, INVENTORY, UNIVERSE, INTEL, COMMANDER); 64px fixed height |
| Modal Overlay | `glass` / 0.95 | 1px cyan / 0.6 opacity          | Leaderboard, inventory loadout, marketplace shells       |

## Spacing & Rhythm

Compact 8px grid; 16px section padding; 12px gaps between interactive elements; dense information layout supports real-time monitoring without visual clutter; treasury cards stack horizontally with consistent 12px spacing.

## Component Patterns

- Buttons: 8px roundness, cyan bg `bg-primary`, dark fg, no shadow, hover scales slightly
- Cards: 8px roundness, `bg-card`, 1px cyan/0.3 border, stacked vertically or grid-aligned
- Treasury Cards: 8px roundness, cyan top border 3px, `bg-card`, right-aligned monospace balances with 0.05em letter-spacing
- Price Ticker: inline flex, monospace 0.8125rem, cyan border/bg, compact 6px roundness, displayed in top bar
- Badges: 6px roundness, `bg-muted`, white fg, no fill on inactive
- Input: 6px roundness, `bg-input`, 1px border, cyan focus ring
- Tactical indicators: glowing cyan text or border highlight on active/focus; amber/gold for FRNTR balances; monospace precision for all token values

## Motion

- Entrance: fade in 200ms ease-out; modals slide up from bottom 300ms cubic-bezier; treasury pot cards stagger 50ms apart on load
- Hover: 0.2s color/scale transition; treasury cards brighten border/glow on hover; active elements pulse-glow on-chain state changes
- Decorative: subtle starfield twinkle in background (non-game areas); pulse-glow on selected plot; orbit animation on loading states; gentle price ticker refresh pulse when values update

## Constraints

- No shadows or soft effects — transparency and blur only
- No rounded corners >12px (military precision)
- No animations in game-critical HUD zones (only status/loading areas)
- Cyan accent must maintain ≥85% opacity to cut through dark background
- Amber/gold secondary accent for FRNTR balance display and token values
- Treasury pot cards must display balances in monospace (JetBrainsMono 600) right-aligned with 0.05em letter-spacing
- Price ticker in top bar must show both ICP/USD and FRNTR/ICP with compact styling and cyan accent
- All treasury balances show as zero when pool not seeded: "0.00 ICP / $0.00 USD"
- v1.0 minimal UI: MAP, LEADERBOARD, INVENTORY, UNIVERSE tabs only; no visible zones for commander NFTs, sub-plots, weapons, combat, factions
- Desktop-first responsive; bottom nav sticky at 64px; top bar fixed at 56px; canvas fills remaining space
- All balances display at 8 decimal precision; real-time ticking updates every 100ms
- Accessibility: all interactive elements ≥44px touch target; cyan accent has sufficient contrast against dark bg (14:1)

## Signature Detail

Frosted glass surfaces with variable blur depth and cyan glow-borders create a layered tactical interface that feels both tangible and ethereal — functional precision embedded in luxury translucence. Treasury pot cards feature a bold cyan top border (3px, 80% opacity) as the primary accent, while monospace numerical displays (right-aligned, 0.05em letter-spacing, 600 weight) convey financial precision and real-time token flow. The cyan accent acts as the only cold accent, commanding attention without screaming. FRNTR ticker and live price feed in the premium top bar signal financial flow and market conditions in real-time.
