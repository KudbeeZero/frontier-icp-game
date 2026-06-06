# Frontier: Missile Horizon — Backend

> **Internet Computer Protocol (ICP) Motoko canister backend**  
> All game state, token economics, and treasury operations run fully on-chain.

---

## Directory Structure

```
src/backend/
├── main.mo                   # Game canister — composition root + all public game API
├── treasury.mo               # Treasury canister — revenue split, leaderboard, withdrawals
├── migration.mo              # One-time upgrade migration (PlayerState schema change)
├── caffeine.toml             # Canister build configuration
├── canister.yaml             # Canister deployment manifest
│
├── lib/                      # Domain logic modules (stateless, pure functions)
│   ├── core.mo               # Core tokenomics calculations (supply, emission, burn rates)
│   ├── game.mo               # Game logic (tier bonuses, costs, biome assignment)
│   ├── session.mo            # Principal display formatting
│   ├── stable-storage.mo     # Stable-to-heap loading helpers (legacy migration support)
│   ├── testnet.mo            # Testnet faucet grant builder and claim recording
│   └── treasury.mo           # Treasury utility helpers
│
├── mixins/                   # API endpoint modules (composed into main.mo)
│   ├── core-api.mo           # Global stats, emission, supply queries
│   ├── frntr-ledger-api.mo   # FRNTR ICRC-1 ledger principal management
│   ├── game-api.mo           # Plot seeding helpers
│   ├── stable-storage-api.mo # Stable-storage management endpoints
│   ├── testnet-api.mo        # Testnet-specific endpoints
│   └── treasury-api.mo       # Treasury query relay from game canister
│
├── types/                    # Type definition modules
│   ├── common.mo             # Shared types: PlotRarity, PlotPricing, biome constants
│   ├── core.mo               # Core tokenomics types
│   ├── game.mo               # Game types: GeneratorTier, Survey, UpgradeError, etc.
│   ├── session.mo            # Session/principal display types
│   ├── stable-storage.mo     # Stable-storage type definitions
│   ├── testnet.mo            # Testnet faucet/stress-test result types
│   └── treasury.mo           # Treasury-specific types
│
├── token/                    # ICRC-1 token canister (FRNTR)
│   └── types.mo              # ICRC-1 standard type definitions
│
└── system-idl/               # Compiled Candid IDL references
```

---

## Canisters

### 1. Game Canister (`main.mo`)

The main game canister. All player-facing interactions go through here.

**Responsibilities:**
- Player state management (plots owned, FRNTR balance, generator tiers)
- Plot ownership (purchase, pricing, H3 hex index registry)
- Generator upgrades (tier advancement, FRNTR burn, accrual rates)
- Token accrual (claim accumulated FRNTR based on plot ownership + tiers)
- Testnet faucet (5,000 FRNTR + 5 ICP per click, testnet only)
- Leaderboard query (player rankings)
- Survey system (paid survey unlock with timer)
- Admin controls (reset state, set principals, unlock all for admin)
- Treasury notification (notifies treasury canister after each purchase)

**Stable State (persists across upgrades via enhanced orthogonal persistence):**
- `stablePlots` — all seeded plot records
- `stablePlayers` — all player state records
- `stableGeneratorTiers` — per-plot generator tier upgrades
- `stableFaucetClaims` — testnet faucet claim counters
- `stableClaimTimes` — last token claim timestamp per player
- `stableUsernames` — principal to username registry
- `stableStatsState` — global counters (totalBurned, totalMined, activePlayers)
- `stablePlotSoldCount` — running count of plots sold
- `stableSubParcels` — sub-parcel records (deactivated for v1.0)
- `stableSurveys` — survey unlock records
- `subParcelAccumulationEnabled` — feature flag (false for v1.0)
- `commanderNFTEnabled` — feature flag (false for v1.0)

### 2. Treasury Canister (`treasury.mo`)

Handles all revenue routing and leaderboard prize pool management.

**Responsibilities:**
- Receive ICP from the game canister after each plot purchase
- Execute real ICP ledger transfers to three subaccounts (25/25/50 split)
- Track FRNTR fees (0.075% upgrade tax to liquidity pot)
- Leaderboard: username registry + balance ranking
- Liquidity pot: locked to a single pre-approved ICPSwap canister
- Admin: withdraw dev treasury, distribute leaderboard rewards
- Live pot balance queries (reads directly from ICP ledger subaccounts)

**Treasury Subaccounts (on the treasury canister's own principal):**

| Index | Subaccount | Purpose |
|-------|-----------|----------|
| 1 | Dev pot | 25% of every plot purchase |
| 2 | Leaderboard pot | 25% of every plot purchase |
| 3 | Liquidity pot | 50% of every plot purchase |

### 3. FRNTR Token Canister (`token/`)

Standard ICRC-1/ICRC-2 token canister for the FRNTR game token.

- **Name:** Frontier
- **Symbol:** FRNTR
- **Decimals:** 8
- **Total Supply:** 10,000,000,000 FRNTR (10B)
- **Pre-minted:** 5B to the game canister (for distribution)
- **Mineable:** 5B over 3-5 years via plot ownership and upgrades

---

## Public API Methods

### Game Canister — Player Actions

| Method | Type | Description |
|--------|------|-------------|
| `getPrincipal()` | query | Returns caller's principal display info |
| `getPlayerState()` | update | Full player state: balances, plots, tiers, resources |
| `getPlayerStateByPrincipal(p)` | update | Same as above for any principal |
| `testFaucetV2()` | update | Claim 5,000 FRNTR + 5 ICP (testnet only) |
| `claimAccumulatedTokens()` | update | Claim accrued FRNTR based on plots x rate x elapsed time |
| `purchasePlot(plotId)` | update | Buy a plot with ICP; atomic ICP transfer + ownership |
| `upgradeGenerator(plotId)` | update | Upgrade generator tier; burns FRNTR |
| `setUsername(username)` | update | Set a 3-16 char alphanumeric username |
| `mineResources(plotId)` | update | DISABLED — returns coming soon |

### Game Canister — Queries

| Method | Type | Description |
|--------|------|-------------|
| `getPlotCount()` | query | Total plots stored on-chain |
| `getAllPlotOwners()` | query | All (plotId, ownerText) pairs |
| `getLivePlotOwners()` | query | Alias for globe ownership sync |
| `getPlotsByOwner(owner)` | query | All plot IDs owned by a principal |
| `getPlotPriceById(plotId)` | query | ICP price in e8s for a plot |
| `getPlotPrice(h3Index)` | query | Same, by H3 index hash |
| `getFirstAvailablePlot()` | query | First unowned plot ID (for testing) |
| `getGeneratorTierCatalog()` | query | Tier index, bonus, and cost for all 6 tiers |
| `getPassiveIncome(plotId)` | query | Daily FRNTR rate for a specific plot |
| `getLeaderboard(limit)` | query | Top N players by FRNTR balance |
| `getLeaderboardStats()` | query | Global stats: sold plots, mined, burned, players |
| `getSubParcels(plotId)` | query | 7 sub-parcel records for a plot |
| `getSubParcelStatus(plotId)` | query | Sub-parcel lock status and cooldown |
| `isSubParcelLocked(plotId)` | query | Is sub-parcel in 4-hour cooldown? |

### Game Canister — Admin

| Method | Type | Description |
|--------|------|-------------|
| `getIsAdmin()` | query | Returns true if caller is the admin principal |
| `getAdminPrincipal()` | query | Returns current admin principal text |
| `setAdminPrincipal(p)` | update | Change admin principal |
| `setTreasuryPrincipal(p)` | update | Set treasury canister principal |
| `getTreasuryPrincipal()` | query | Get current treasury canister principal |
| `setGameCanisterPrincipal(p)` | update | Set self-principal for ICP transfers |
| `getGameCanisterPrincipal()` | query | Get current self-principal |
| `setSelfPrincipal()` | update | Auto-seed self-principal from first caller |
| `initPlots(plotData)` | update | Seed plot records from frontend (admin only) |
| `resetTestState()` | update | Clear caller's state (testnet only) |
| `resetAllData()` | update | Wipe all game state (admin + testnet only) |

### Treasury Canister — Public

| Method | Type | Description |
|--------|------|-------------|
| `notifyPlotPurchase(amount, buyer)` | update | Called by game canister; executes 25/25/50 ICP split |
| `notifyFRNTRFee(amount, actor)` | update | Records 0.075% upgrade liquidity tax |
| `getPotBalances()` | update | Live ICP balances for all three pots |
| `getTreasurySummary()` | update | Full treasury status for UNIVERSE panel |
| `getLeaderboard(limit)` | update | Top N players by FRNTR balance |
| `getUsername(p)` | query | Get username for a principal |
| `setUsername(username)` | update | Register a username |
| `usernameExists(username)` | query | Check if username is taken |
| `getApprovedLiquidityCanister()` | query | Get approved ICPSwap canister |
| `getCycleBalance()` | query | Canister cycle balance |

### Treasury Canister — Admin

| Method | Type | Description |
|--------|------|-------------|
| `setApprovedLiquidityCanister(id)` | update | Set the only allowed ICPSwap withdrawal target |
| `withdrawLiquidityPot(amount, to)` | update | Withdraw to pre-approved liquidity canister only |
| `withdrawDeveloperTreasuryICP(amount, to)` | update | Withdraw dev ICP to an account identifier |
| `withdrawDeveloperTreasuryFRNTR(amount, to)` | update | Withdraw dev FRNTR to a principal |
| `distributeLeaderboardReward(amount, to)` | update | Send leaderboard prize to winner principal |
| `updateFeePercentages(dev, lb, liq)` | update | Adjust split (must sum to 100) |
| `addApprovedDEXCanister(dexId)` | update | Add DEX to whitelist |
| `removeApprovedDEXCanister(dexId)` | update | Remove DEX from whitelist |
| `updateAdminPrincipal(newAdmin)` | update | Transfer admin control |
| `setFrntrLedgerPrincipal(p)` | update | Wire FRNTR ICRC-1 ledger |

---

## Treasury Split (25 / 25 / 50)

Every plot purchase automatically routes the ICP payment to three treasury subaccounts:

```
Purchase ICP amount
  +-- 25% --> Developer Treasury (subaccount index 1)
  |           For team operations, marketing, and development costs
  +-- 25% --> Leaderboard Prize Pool (subaccount index 2)
  |           Paid out after every 1,500 plots are minted
  +-- 50% --> Liquidity Pool (subaccount index 3)
              Reserved exclusively for seeding FRNTR/ICP on ICPSwap
              Can ONLY be withdrawn to the pre-approved ICPSwap canister
```

The split is executed via real `icrc1_transfer` calls to ICP ledger subaccounts. Each transfer deducts a 10,000 e8s (0.0001 ICP) ledger fee. If the total purchase amount is too small to cover fees on all three transfers, amounts are tracked in internal counters only.

### FRNTR Liquidity Tax (0.075%)

Every generator upgrade burns the full FRNTR cost from the token supply and sends 0.075% (`cost * 75 / 100_000`) to the treasury FRNTR liquidity pot for future DEX seeding.

---

## How Stable Storage Works

This project uses **enhanced orthogonal persistence (EOP)**. The Motoko runtime automatically persists all actor-level state across upgrades. You do NOT need `preupgrade`/`postupgrade` functions.

The `stable var` backing arrays (`stablePlots`, `stablePlayers`, etc.) support the legacy migration transition. The maps are loaded from them at actor initialization via `Map.fromIter(stableXxx.vals())`. After the first fresh deployment, EOP preserves the maps directly.

The `migration.mo` module handles the explicit schema migration for `PlayerState` (adding `lastClaimTime`).

---

## Deploying to Mainnet

### Wallet Setup — You Do NOT Need Separate Wallets

The treasury canister holds all ICP in subaccounts under its own canister principal. As admin, you interact with the treasury exclusively through canister calls. Your Internet Identity is both your player wallet and your admin credential.

ICP revenue flow:
```
Player Wallet --> ICP Ledger --> Game Canister --> Treasury Canister Subaccounts
                                                +-- Subaccount 1 (Dev 25%)
                                                +-- Subaccount 2 (Leaderboard 25%)
                                                +-- Subaccount 3 (Liquidity 50%)
```

### Loading ICP Into Your Wallet

1. Buy ICP on a centralized exchange (Coinbase, Kraken, Binance, etc.)
2. Withdraw ICP to your Internet Identity principal address
3. Your principal address is shown in the top bar after login (full address in hover tooltip)
4. Minimum recommended: 0.5 ICP for gas fees during setup

### Step-by-Step Mainnet Deploy

1. **Deploy the FRNTR token canister** — note the canister ID
2. **Deploy the treasury canister** — note the canister ID  
   - Call `setSelfPrincipal()` once immediately after deploy
3. **Deploy the game canister** — update admin principal first
   - Call `setSelfPrincipal()` once immediately after deploy
4. **Wire canisters together:**
   - `game.setTreasuryPrincipal(treasuryCanisterId)`
   - `game.setFrntrLedger(frntrCanisterId)`
   - `treasury.setFrntrLedgerPrincipal(frntrCanisterId)`
5. **Set ICPSwap liquidity canister:**
   - `treasury.setApprovedLiquidityCanister(icpswapCanisterId)`
6. **Verify treasury split:** make a test purchase and check `treasury.getPotBalances()`

---

## Plot Pricing

| Richness | Rarity | Price Range |
|----------|--------|-------------|
| 78-89 | Common | 2-3 ICP |
| 90-96 | Rare | 6-12 ICP |
| 97-98 | Epic | 20-40 ICP |

All prices are in ICP e8s (1 ICP = 100,000,000 e8s).

---

## Generator Tiers and Token Accrual

| Tier | Daily FRNTR | Upgrade Cost |
|------|------------|---------------|
| None | 7.0/day | — |
| I | 9.0/day | 500 FRNTR |
| II | 12.0/day | 1,500 FRNTR |
| III | 17.0/day | 4,000 FRNTR |
| IV | 25.0/day | 10,000 FRNTR |
| V | 37.0/day | 25,000 FRNTR |
| VI | 55.0/day | 60,000 FRNTR |

Players claim accrued tokens via `claimAccumulatedTokens()`. Accrual formula:
```
accrued_e8s = dailyRate_e8s * elapsedNs / (86400 * 1_000_000_000)
```

---

## Feature Flags

| Flag | Default | Description |
|------|---------|-------------|
| `TESTNET_MODE` | `false` | Enables faucet and bypasses ICP ledger for purchases |
| `subParcelAccumulationEnabled` | `false` | Re-enable for sub-parcel system (v2.0) |
| `commanderNFTEnabled` | `false` | Re-enable when Commander NFT system launches |

---

## Security Notes

- All admin functions require the caller to match `adminState.adminPrincipal`
- Liquidity pot withdrawals are restricted to a single pre-approved ICPSwap canister address
- Plot purchases verify ICP transfer via `icrc2_transfer_from` before assigning ownership
- If the ICP transfer fails, ownership is never assigned (atomic)
- The game canister never sends cycles to other canisters
- Anonymous callers are rejected from all state-modifying functions
