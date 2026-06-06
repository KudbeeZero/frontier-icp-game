# Frontier: Missile Horizon

> **Planetary Warfare Strategy on the Internet Computer**

Frontier: Missile Horizon is a fully decentralized, persistent planetary warfare strategy game built on the Internet Computer Protocol (ICP). Players log in with Internet Identity, purchase hex-grid land plots using real ICP, accumulate FRNTR tokens passively, and upgrade their generators — all fully on-chain with no off-chain servers or databases.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite, React Three Fiber, Tailwind CSS |
| 3D Globe | Three.js geodesic grid (10,242 tiles), InstancedMesh, raycast selection |
| Backend | Motoko multi-canister (Game, Treasury, Token) |
| Token | FRNTR ICRC-1 standard on-chain token |
| Auth | Internet Identity (decentralized login) |
| ICP Ledger | `ryjl3-tyaaa-aaaaa-aaaba-cai` (native ICP transfers) |

---

## Directory Structure

```
frontier-icp-game/
├── src/
│   ├── frontend/           # React app with 3D globe and all UI
│   │   ├── src/
│   │   │   ├── components/ # Shared UI components (Globe, HUD, panels)
│   │   │   ├── hooks/      # React Query hooks wired to canister
│   │   │   ├── pages/      # Route pages (Play, etc.)
│   │   │   ├── store/      # Zustand global state
│   │   │   ├── types/      # Shared TypeScript types
│   │   │   └── App.tsx     # Router + providers
│   │   └── public/         # Static assets (earth textures, etc.)
│   ├── backend/            # Motoko canisters
│   │   ├── main.mo         # Game canister (plots, players, upgrades)
│   │   ├── treasury.mo     # Treasury canister (25/25/50 split)
│   │   ├── token.mo        # FRNTR ICRC-1 token canister
│   │   └── lib/            # Stable storage, biome utils, hex grid
│   ├── shared/             # Shared types and Candid interfaces
│   └── declarations/       # Auto-generated frontend bindings
├── dfx.json                # Canister config
├── mops.toml               # Motoko package manager config
└── README.md
```

---

## Running Locally

### Prerequisites

- Node.js ≥ 18
- `pnpm` (`npm install -g pnpm`)
- DFX SDK (`sh -ci "$(curl -fsSL https://internetcomputer.org/install.sh)"`)
- Mops (`npm install -g ic-mops`)

### Frontend Development

```bash
cd src/frontend
pnpm install
pnpm dev
```

### Backend (Motoko Canisters)

```bash
cd src/backend
mops install
mops check --fix   # typecheck
mops build         # compile
```

### Generate Frontend Bindings

After any backend change, regenerate the TypeScript bindings:

```bash
pnpm bindgen
```

---

## Deploying

Deployment is managed through [Caffeine](https://caffeine.ai/) which handles cycle top-ups and canister lifecycle automatically. The frontend and backend are deployed independently:

- **Backend deploy** — triggers only on Motoko code changes; preserves canister state via stable variables
- **Frontend deploy** — can redeploy UI changes without touching backend state

To promote a draft preview to live, use the Caffeine dashboard.

---

## Mainnet Launch Guide

See [`src/backend/MAINNET_CHECKLIST.md`](src/backend/MAINNET_CHECKLIST.md) for the full step-by-step mainnet launch checklist including:

- Setting real admin principal
- Deploying FRNTR ICRC-1 canister on mainnet
- Setting treasury canister principal
- Approving the ICPSwap liquidity canister
- Verifying 25/25/50 treasury split with real ICP
- Confirming all testnet stress tests pass

---

## In-Game Roadmap

The full game roadmap is available in the **INFO tab** inside the game. It covers all planned phases from MVP to full planetary warfare.

---

## Security

- **Fully on-chain** — all game logic runs inside ICP canisters; no off-chain servers or external databases
- **Internet Identity** — players authenticate with a decentralized, phishing-resistant identity; no passwords or email addresses
- **Atomic transactions** — plot ownership is only assigned after an ICP ledger transfer is verified; if the transfer fails, nothing changes
- **Stable memory** — all player data (plots, balances, generator tiers, usernames) is written to stable variables and survives every canister upgrade
- **Admin controls** — treasury withdrawals are restricted; liquidity pot can only be released to the pre-approved ICPSwap canister

---

## Tokenomics

| Parameter | Value |
|---|---|
| Token Name | Frontier (FRNTR) |
| Standard | ICRC-1 |
| Total Supply | 10,000,000,000 FRNTR |
| Pre-minted (game canister) | 5,000,000,000 FRNTR |
| Mineable by landowners | 5,000,000,000 FRNTR over 3–5 years |
| Decimals | 8 |

**Generator tiers** (FRNTR/day per plot):

| Tier | Rate | Upgrade Cost |
|---|---|---|
| 1 | 7 FRNTR/day | — |
| 2 | 10 FRNTR/day | 500 FRNTR |
| 3 | 15 FRNTR/day | 1,500 FRNTR |
| 4 | 22 FRNTR/day | 4,000 FRNTR |
| 5 | 32 FRNTR/day | 10,000 FRNTR |
| 6 | 45 FRNTR/day | 25,000 FRNTR |
| 7 | 63 FRNTR/day | 60,000 FRNTR |

---

## Treasury (25 / 25 / 50 Split)

Every plot purchase in ICP is automatically split three ways:

| Pot | Share | Purpose |
|---|---|---|
| Developer Treasury | 25% | Project funding and operations |
| Leaderboard Pot | 25% | Paid out to top FRNTR holders after every 1,500 plots minted |
| Liquidity Pot | 50% | Reserved exclusively for seeding the FRNTR/ICP pool on ICPSwap |

The liquidity pot is locked — withdrawals are restricted to a single pre-approved ICPSwap canister address.

---

## Plot Pricing

| Rarity | ICP Range | Notes |
|---|---|---|
| Common | 2–3 ICP | Majority of land |
| Rare | 6–12 ICP | Higher resource potential |
| Epic | 20–40 ICP | Volcanic, Asteroid Impact biomes |

**Biomes:** Temperate, Desert, Arctic, Tropical, Ocean, Deep Ocean (Shipping Lane), Volcanic, Asteroid Impact

---

## V1.0 Features

- **Login** — Internet Identity, principal ID displayed in top bar
- **Faucet** — testnet FRNTR + ICP for testing
- **Globe** — interactive 3D Earth with 10,242 hex plots, color-coded by biome
- **Plot Purchase** — buy land with ICP; atomic on-chain transfer
- **Generator Upgrades** — 7 tiers, FRNTR burned on upgrade
- **Survey Reports** — paid unlock (FRNTR), time-based reveal
- **UNIVERSE Panel** — live global tokenomics, treasury balances, ICP/USD price
- **Command Center** — player-specific economy dashboard
- **Leaderboard** — ranked by FRNTR balance, username-gated
- **Inventory** — owned plots with biome, efficiency, upgrade status

---

## Future Phases

| Phase | Features |
|---|---|
| Phase 2 | Sub-parcels (7 per plot), resource mining, mineral accumulation |
| Phase 3 | Commander NFTs, faction system, defensive structures |
| Phase 4 | Weapon systems, combat mechanics, territory control |
| Phase 5 | Marketplace (plot trading, resource exchange), DEX integration |
| Phase 6 | Player-generated content, faction wars, alliance system |

---

## Contributing

This project is in active development. Bug reports and feature suggestions can be directed to the project team. All smart contract upgrades follow ICP canister upgrade safety guidelines to ensure player data is never lost.

## License

Proprietary — all rights reserved. Built with [Caffeine](https://caffeine.ai/).

