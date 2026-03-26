# Frontier: Missile Horizon

## Current State
- SubParcelPanel has a hex flower layout (center + 6 edge cells) shown as a slide-up panel
- MapBottomSheet shows sub-parcels as a list but has no pie-slice zoom view
- CommandCenter has a MiningTable showing owned plots but no MINE button and no live accumulation counter
- gameStore has `tickPassiveIncome` and `tickMineralDrip` already implemented but balances render as integers/2-decimal numbers
- No token burn tracking or burn counter exists
- Resources (iron, fuel, crystal, rareEarth) tick up passively but aren't shown with high precision

## Requested Changes (Diff)

### Add
- **Sub-Parcel Pie-Slice Zoom View**: A "VIEW SUB-PARCELS" button in MapBottomSheet that triggers a full-screen overlay showing a pie-slice visualization. Center circle = owner portrait/principal. 6 colored pie segments for edge sub-parcels, each colored by specialization type (Armory=red, Resources=green, Energy & Tech=blue, Trading Depot=gold, empty=semi-transparent grey). Tapping a segment highlights it with a glow ring (no required action).
- **MINE button in CommandCenter**: Below the MiningTable in CommandCenter, add a MINE button that calls `mineResources` on all owned plots at once and shows a yield popup.
- **Live Accumulation Window in CommandCenter**: A dedicated section showing FRNTR, Iron, Fuel, Crystal, Rare Earth ticking up in real time with 8 decimal places of precision. Uses `setInterval` at 500ms refresh. Values shown in monospace font with live animation.
- **Token Burn Tracker**: Add `totalFrntrBurned: number` to gameStore. Deduct from it whenever FRNTR is spent (purchasePlot, buildStructure, activateRegenBoost, fireArsenalMissile, fireArtillery, buyWeapon, upgradeStorage, upgradeElectricity, promoteCommander). Display burned tokens in CommandCenter Token Economy section and as a separate "BURNED" stat card.

### Modify
- **CommandCenter**: Add live accumulation section above MiningTable. Add MINE ALL button below table. Add BURNED tokens stat card to the Token Economy cards row.
- **gameStore**: Add `totalFrntrBurned` field, increment it on every FRNTR spend action.
- **MapBottomSheet**: Add "VIEW SUB-PARCELS" button near the sub-parcel list header that opens the pie-slice overlay.

### Remove
- Nothing removed

## Implementation Plan
1. Update `gameStore.ts` — add `totalFrntrBurned: number` (starts at 0), increment in all spend actions
2. Create `SubParcelPieView.tsx` — full-screen frosted overlay with SVG pie slices + center circle owner display, close button, tap-to-highlight per slice
3. Update `MapBottomSheet.tsx` — add VIEW SUB-PARCELS button that sets `showPieView: boolean` state, render `<SubParcelPieView>` when active
4. Update `CommandCenter.tsx` — add live accumulation window with 8-decimal ticking counters, add MINE ALL button, add BURNED stat card
5. Ensure the `tickPassiveIncome` and `tickMineralDrip` are called from `Play.tsx` or `App.tsx` on a 1-second interval (verify this is already wired, add if missing)
