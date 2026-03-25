# Frontier: Missile Horizon

## Current State
- `gameStore.ts`: Has `selectedPlotId` but no `activeWeapon` or `targetPlotId`. The `attack()` method is fully local/mock — no backend call.
- `Play.tsx`: `handleFire` only sets local `missileActive=true`. `selectedWeapon` is local component state (not in store). No error banners. LOCK label is static.
- `GlobeCanvas.tsx`: `MissileAnimation` uses hardcoded NYC→London coords. Hex grid is all-cyan — no ownership coloring.
- `backend.d.ts`: Only exposes `getAdjacentPlots` and `purchasePlot`. No `launchMissile` typed.

## Requested Changes (Diff)

### Add
- `activeWeapon: string | null` and `targetPlotId: number | null` to gameStore state
- `setActiveWeapon(weapon: string)` and `setTargetPlotId(id: number | null)` actions in gameStore
- `launchMissile(fromPlotId: number, toPlotId: number, weaponType: string)` async action in gameStore that calls backend (falls back to mock if backend unavailable)
- `launchMissile` method signature in `backend.d.ts`
- Error banner state in Play.tsx (`NO SILO`, `ON COOLDOWN`, generic error) — shows for 3s then auto-dismisses
- LOCK label turns yellow when targetPlotId is set, dim when not
- "TARGET IN FORMATION" text pulses when target is locked

### Modify
- `Play.tsx` EQUIP button: calls `setActiveWeapon(weapon.name)` in store instead of local state
- `Play.tsx` FIRE button (`handleFire`): reads `activeWeapon` + `targetPlotId` from store, calls `store.launchMissile`, on success triggers missile animation with real plot coords
- `GlobeCanvas.tsx` `MissileAnimation`: accept `fromLat/fromLng/toLat/toLng` as props instead of hardcoded values
- `GlobeCanvas.tsx` globe click: calls `store.setTargetPlotId(plotId)` in addition to `store.selectPlot(plotId)`
- `Play.tsx`: pass real from/to coords to `GlobeCanvas` when firing (derive from plot data using plotId → lat/lng)

### Remove
- Hardcoded NYC/London coordinates from `MissileAnimation`

## Implementation Plan
1. Update `backend.d.ts` — add `launchMissile(fromPlotId: bigint, toPlotId: bigint, weaponType: string): Promise<{__kind__: 'ok', ok: string} | {__kind__: 'err', err: string}>`
2. Update `gameStore.ts` — add `activeWeapon`, `targetPlotId`, `setActiveWeapon`, `setTargetPlotId`, `launchMissile` async action (try backend call, catch and use local mock fallback)
3. Update `GlobeCanvas.tsx` — parameterize `MissileAnimation` coords via props; globe click sets targetPlotId in store
4. Update `Play.tsx` — wire EQUIP to store, FIRE to store action with real coords, add error banners, update LOCK label reactivity
