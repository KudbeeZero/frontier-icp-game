# Frontier: Missile Horizon

## Current State
- Navbar.tsx has FRNTR balance from mock gameStore, nav links: Home/Universe/Inventory/Leaderboard. Not rendered on Play page.
- CombatLog.tsx is a horizontal bottom ticker using mock data from gameStore.
- Play.tsx has inline TopBar (tactical HUD strip) but no Navbar or CombatLog rendered.
- Backend declarations only have getAdjacentPlots and purchasePlot. No getCombatLog or ICRC-1 balance.

## Requested Changes (Diff)

### Add
- useTokenBalance hook: minimal ICRC-1 actor for icrc1_balance_of, returns formatted balance or dash if unauthenticated/failed.
- useCombatLog hook: minimal actor for getCombatLog, polls every 5s, falls back to store mock data on error.
- Updated Navbar.tsx: hide entirely on mobile (<768px), nav links become Home/Universe/Factions/Marketplace, FRNTR balance from useTokenBalance.
- Redesigned CombatLog.tsx: fixed bottom-left overlay panel (~280px wide), close X button, timestamped rows (attacks red, colonize green), auto-scroll, uses useCombatLog hook.

### Modify
- Play.tsx: render Navbar and redesigned CombatLog.

### Remove
- Old horizontal ticker CombatLog behavior.

## Implementation Plan
1. Create hooks/useTokenBalance.ts
2. Create hooks/useCombatLog.ts
3. Rewrite Navbar.tsx
4. Rewrite CombatLog.tsx as bottom-left overlay
5. Update Play.tsx to render both
6. Validate
