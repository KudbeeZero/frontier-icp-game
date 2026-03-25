# Frontier: Missile Horizon

## Current State
- Factions (`/factions`) and Marketplace (`/marketplace`) nav links exist but routes are missing from App.tsx — clicking them goes nowhere
- PURCHASE button inside MapBottomSheet decision layer is not visible/tappable; the flexbox height chain from BottomSheet → content wrapper → MapBottomSheet breaks down because `height: 100%` on a flex child without `min-height: 0` collapses the layout, pushing the decision layer out of view
- Left sidebar (CommandCenter or LeftSidebarHUD) shows resource rows but they are not wired to the mineral system
- Mineral system is defined but biome-to-tier mapping and per-mineral drip rates are not implemented

## Requested Changes (Diff)

### Add
- `src/frontend/src/pages/Factions.tsx` — full page showing 4 AI factions (NEXUS-7, KRONOS, VANGUARD, SPECTRE) with: faction name, lore blurb, territory count from gameStore plots, strength bar, player allegiance button ("JOIN FACTION" / "ALLIED" if already joined); uses same dark glassmorphic style as Play
- `src/frontend/src/pages/Marketplace.tsx` — two-tab page: PLOTS tab (list of unowned plots for sale with biome, tier, price in FRNTR, BUY button calling purchasePlot) and WEAPONS tab (weapon cards with name, qty, FRNTR cost, BUY button updating player inventory); mock data for now, same glassmorphic style
- Biome-to-tier and mineral rate table in gameStore or a constants file:
  - T1: Wasteland (Iron 8, Fuel 2, Crystal 1, slow=1/tick), Tundra (5,3,2, slow)
  - T2: Forest (6,4,3, medium=2/tick), Desert (4,8,2, medium)
  - T3: Coastal (6,5,6, fast=3/tick), Volcanic (10,6,4, fast)
  - T4: Equatorial (8,8,8, veryfast=5/tick), Deep Ocean (5,10,9, veryfast)
  - T5: Nexus (12,12,12, maximum=10/tick)
  - Map existing biomes: Arctic→Tundra, Desert→Desert, Forest→Forest, Ocean→Deep Ocean, Mountain→Wasteland, Volcanic→Volcanic, Grassland→Forest, Toxic→Wasteland
- Mineral drip logic: sum iron/fuel/crystal rates across player's owned plots (only plots with a CYCLES_REACTOR sub-parcel building count toward drip; if no reactor, rate = 0 for that plot)
- 3 mineral rows in the left panel (CommandCenter or LeftSidebarHUD): ⚙ IRON, ⛽ FUEL, 💎 CRYSTAL — each showing balance, +rate/tick, animated fill bar (0→current on open), label "USED FOR: [purpose]".
  Iron bar = gray, Fuel bar = orange, Crystal bar = cyan

### Modify
- `src/frontend/src/App.tsx` — add factionsRoute (`/factions`) and marketplaceRoute (`/marketplace`) to routeTree
- `src/frontend/src/components/MapBottomSheet.tsx` — fix flexbox height: add `minHeight: 0` to the scrollable body div so the flex layout correctly fills the parent and the decision layer (PURCHASE/BUILD/SET AS TARGET) stays pinned at the bottom and is always visible and tappable
- `src/frontend/src/components/BottomSheet` section in `Play.tsx` — ensure the map content wrapper passes proper height to MapBottomSheet (add `height: '100%'` and `minHeight: 0` to the flex:1 content wrapper)
- `src/frontend/src/store/gameStore.ts` — add `CYCLES_REACTOR` as a valid buildingType; add `mineralDrip` selector logic; update player iron/fuel/crystal to accumulate over time based on owned plots with reactors

### Remove
- Nothing removed

## Implementation Plan
1. Fix MapBottomSheet + BottomSheet flex layout so PURCHASE button is always visible at the sheet bottom
2. Add mineral constants (biome tier map + mineral rates per tier)
3. Add mineral drip rows to CommandCenter (left slide-out panel) with animated bars
4. Add CYCLES_REACTOR to BuildingPicker options
5. Create Factions.tsx page with faction cards, territory counts, join mechanic
6. Create Marketplace.tsx page with Plots tab and Weapons tab
7. Register /factions and /marketplace routes in App.tsx
