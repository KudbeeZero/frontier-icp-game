# Frontier: Missile Horizon

## Current State
Commander NFT system has 8 commanders across 5 tiers (Common through Legendary) with generated character portrait art. Tiers: Common (Private, Specialist), Uncommon (Corporal, Sergeant), Rare (Sergeant First Class), Epic (Lieutenant, Captain), Legendary (Colonel, General). Purchase with ICP, upgrade with FRNTR. Assignment to plots and account-level Lieutenant rank system implemented.

## Requested Changes (Diff)

### Add
- **6 Military Archetypes** (chosen at purchase, like NBA 2K player build):
  1. **Army Infantry** — standard rank ladder, balanced stats
  2. **Army Ranger** — special ops, combat ATK bonus, unlocks Ranger tab/ability
  3. **Marine** — high DEF, amphibious assault bonus
  4. **Military Police (MP)** — territory enforcement, can lock/contest enemy plots
  5. **Warrant Officer** — technical specialist, boosts building efficiency and mineral output
  6. **Air Force Pilot** — earns wings on promotion, unlocks fighter plane (F-16) assignment
- **Full rank progression per archetype** (dynamic NFT upgrades on promotion):
  - Army/Ranger/Marine/MP Enlisted: E1 Private → E2 PFC → E3 SPC → E4 Corporal → E5 Sergeant → E6 Staff Sergeant → E7 SFC → E8 Master Sergeant/1SG → E9 SGM
  - Warrant Officers: WO1 → CW2 → CW3 → CW4 → CW5
  - Officers (all branches): O1 2LT → O2 1LT → O3 Captain → O4 Major → O5 LTC → O6 Colonel → O7 BG → O8 MG → O9 LTG → O10 General
  - Air Force: Airman Basic → Airman → A1C → SrA → SSgt → TSgt → MSgt → SMSgt → CMSgt → (Officer path same as above but with wings)
- **Air Force Wings unlock** — earning wings (at TSgt or O3 Captain equivalent) allows assignment to fighter planes on plots with an Airbase built
- **Rank insignia images** per archetype and tier group (replacing character portraits)
- **Archetype selection UI** on Commander purchase — shows branch, abilities unlocked at each rank tier, and starting stats
- **Promotion mechanic** — rank up by: launching missiles, owning plots, winning combat, completing missions. Each promotion upgrades the NFT image to the new rank insignia.

### Modify
- Replace all 8 current Commander NFT character portrait images with rank insignia images
- Commander card UI: show archetype badge + current rank insignia + rank name + branch + stats
- Pricing restructure: entry-level archetypes start at 0.1 ICP, higher archetypes (Ranger, AF Pilot) start at 0.5 ICP
- Upgrade cost (FRNTR) scales with rank tier, not commander type
- Commander store: grouped by archetype, not tier
- Account Lieutenant system: replaced by the archetype's rank progression (the Lieutenant panel becomes your current rank card within your archetype)

### Remove
- Old 8 named commander NFTs (Iron Claw, Void Hunter, Nova Prime, Phantom Ops, etc.)
- Generic character portrait images
- Fixed tier names (Common/Uncommon/Rare/Epic/Legendary) as primary grouping — replaced by archetype grouping with rank tiers within

## Implementation Plan
1. Define `CommanderArchetype` type and rank progression arrays per archetype in gameStore
2. Generate rank insignia images for each archetype's key tier groups
3. Update Commander store UI: archetype picker → rank card with insignia, branch name, abilities, stats
4. Update Commander card: show current rank insignia, archetype badge, rank name, ATK/DEF, FRNTR bonus
5. Update promotion logic: XP/stat thresholds trigger rank up, NFT image swaps to next insignia
6. Air Force pilot: add `hasWings` flag, unlock fighter plane assignment when wings earned
7. Keep ICP purchase flow and FRNTR upgrade flow intact, update prices per archetype
8. Replace account Lieutenant panel with archetype rank card
