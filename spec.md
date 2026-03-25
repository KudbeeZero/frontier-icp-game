# Frontier: Missile Horizon

## Current State
The Commander NFT system has 4 commanders (NOVA PRIME-LEGENDARY, IRON CLAW-EPIC, PHANTOM OPS-LEGENDARY, VOID HUNTER-RARE) in `src/frontend/src/constants/commanders.ts`. The Commander tab in the bottom nav shows these NFT cards. There is no purchase flow — commanders are not purchasable. Pricing was previously in FRNTR tokens. The `commanderAssignments` in gameStore tracks plot assignments. The `LieutenantRankCard` handles account-level rank progression (Lieutenant→Captain→Colonel→General).

## Requested Changes (Diff)

### Add
- 4 new commander NFTs with military rank names at lower tiers:
  - Private (COMMON, 0.1 ICP)
  - Specialist (COMMON, 0.15 ICP)
  - Corporal (UNCOMMON, 0.3 ICP)
  - Sergeant (UNCOMMON, 0.5 ICP)
  - Sergeant First Class (RARE, 0.75 ICP) — 5th addition to get to 9 total / ~one per sub-parcel
- ICP-based purchase flow for all commander NFTs (mock in testing)
- `ownedCommanderIds` array in gameStore to track purchased commanders
- `purchaseCommander(commanderId)` action in gameStore that deducts mock ICP and adds to owned list
- Commander purchase modal/card with ICP price, stats, rarity badge, and BUY button
- Stats scaling by tier: higher rarity = higher ATK/DEF/FRNTR bonus
- FRNTR token upgrade flow: owned commanders can be upgraded using FRNTR to boost stats
- Rarity tier badge images for all 9 commanders (new badge images for Private, Specialist, Corporal, Sergeant, SFC)

### Modify
- `commanders.ts` — expand from 4 to 9 commanders, add `icpPrice`, `tier`, `upgradeLevel`, `owned` fields; add COMMON and UNCOMMON rarity types
- `gameStore.ts` — add `ownedCommanderIds: string[]`, `purchaseCommander(id)`, `upgradeCommander(id, frntrCost)` actions; all pricing now in ICP
- Commander tab in Play.tsx/bottom nav — show owned vs available, purchase button with ICP price, upgrade button with FRNTR cost
- `attack()` in gameStore — include all 9 commanders in COMMANDERS_DATA lookup
- Rarity color mapping — add COMMON (#6b7280 silver-gray) and UNCOMMON (#22c55e green)

### Remove
- Old FRNTR-based commander pricing from Inventory.tsx (Sentinel/Phantom/Reaper mock data)

## Implementation Plan
1. Update `constants/commanders.ts` with all 9 commanders, ICP prices, tier stats, badge images
2. Update `gameStore.ts` with `ownedCommanderIds`, `purchaseCommander`, `upgradeCommander`, mock ICP balance field, wire all 9 commanders into attack logic
3. Update the Commander tab (in CommandPanel or Play.tsx) with: owned commanders grid, store grid for unowned, purchase flow with mock ICP deduction, upgrade button with FRNTR cost
4. Update `Inventory.tsx` to remove old Sentinel/Phantom/Reaper data, show real commander ownership
5. Wire stats: commander ATK/DEF bonuses apply in combat, FRNTR generation bonus from rarity applies in CommandCenter
