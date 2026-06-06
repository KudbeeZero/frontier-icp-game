# Frontier: Missile Horizon — Frontend

## Tech Stack

| Layer | Technology |
|---|---|
| UI Framework | React 18 + TypeScript |
| Build Tool | Vite |
| 3D Engine | React Three Fiber (R3F) + Three.js |
| Styling | Tailwind CSS + inline CSS-in-JS |
| State | Zustand (`gameStore`) |
| Server State | `@caffeineai/core-infrastructure` (`useActor`) |
| Routing | TanStack Router |
| Authentication | Internet Identity (`@dfinity/auth-client`) |
| Icons | Lucide React + React Icons |
| Notifications | Sonner (toast) |

---

## Directory Structure

```
src/frontend/
├── index.html                   # HTML entry point (title, meta)
├── package.json                 # Dependencies & scripts
├── vite.config.js               # Vite config (ICP env injection)
├── tailwind.config.js           # Tailwind theme tokens
├── tsconfig.json                # TypeScript config
├── biome.json                   # Linting/formatting
├── env.json                     # Runtime env vars (VITE_BACKEND_CANISTER_ID)
├── public/
│   └── assets/
│       ├── images/              # Earth textures, logos, generated images
│       └── generated/           # AI-generated images (hero, globe, etc.)
└── src/
    ├── main.tsx                 # App entry point (providers)
    ├── App.tsx                  # Router + QueryClientProvider
    ├── backend.ts               # Generated actor factory (createActor)
    ├── backend.d.ts             # Generated backend type declarations
    ├── index.css                # Global styles, design tokens, OKLCH palette
    ├── components/
    │   ├── Layout.tsx           # App shell (header, footer, bg)
    │   ├── BottomNav.tsx        # Persistent bottom tab bar
    │   ├── BottomSheet.tsx      # Slide-up panel container
    │   ├── GlobeCanvas.tsx      # R3F 3D globe with H3 hex grid
    │   ├── MapBottomSheet.tsx   # Plot info + purchase/upgrade actions
    │   ├── CommandCenter.tsx    # Player token economy dashboard
    │   ├── UniversePanel.tsx    # Global tokenomics + treasury
    │   ├── IntelTab.tsx         # Game lore, announcements, events
    │   ├── RoadmapTab.tsx       # In-game roadmap + mainnet checklist
    │   ├── AdminPanel.tsx       # Admin-only controls (mint, reset, reseed)
    │   ├── PlotHoverCard.tsx    # Hover tooltip for globe hex tiles
    │   ├── FaucetOverlay.tsx    # Testnet faucet (5000 FRNTR + 5 ICP)
    │   ├── PlayNowOverlay.tsx   # Full-screen intro + wallet connect
    │   └── ui/                  # shadcn/ui primitives (do not edit)
    ├── hooks/
    │   ├── useQueries.ts        # React Query hooks → backend actor calls
    │   ├── usePlayerSync.ts     # Syncs player state from canister on login
    │   ├── usePurchasePlot.ts   # Atomic ICP transfer → plot ownership
    │   └── useIcpBalance.ts     # Live ICP balance from ICRC-1 ledger
    ├── pages/
    │   └── Play.tsx             # Main game page (globe + HUD + menus)
    ├── store/
    │   └── gameStore.ts         # Zustand global state (player, plots, balances)
    └── types/
        └── index.ts             # Shared TypeScript types
```

---

## Getting Started

```bash
# Install dependencies
pnpm install

# Start dev server (requires backend canister running)
pnpm dev

# Type-check
pnpm typecheck

# Lint + format fix
pnpm fix

# Production build
pnpm build
```

---

## Globe & Hex Grid

The 3D globe uses a **geodesic icosphere grid** with **10,242 hex tiles** rendered via `InstancedMesh` for GPU-efficient rendering. Each tile maps to a unique plot on the planet surface.

- **H3 Indexing** — Uber's H3 geospatial grid system provides consistent, equal-area hex cell IDs used as canonical plot IDs both on-chain and on the globe.
- **InstancedMesh** — All 10,242 tiles are rendered in a single draw call; only the color/transform buffer is updated when ownership changes.
- **Raycast Selection** — Click events are resolved via Three.js raycasting to the nearest hex tile center.
- **Biomes** — 8 biome types (Temperate, Desert, Arctic, Tropical, Ocean, Deep Ocean, Volcanic, Asteroid Impact) are color-coded on the hex tiles based on real-world geographic coordinates.

---

## Authentication

Login is handled via **Internet Identity** using `@caffeineai/core-infrastructure`:

```ts
import { useInternetIdentity } from "@caffeineai/core-infrastructure";

const { isAuthenticated, login, clear, loginStatus, identity } = useInternetIdentity();
```

The caller's `principal` is used as the unique player ID stored on-chain.

---

## Backend Connection

The backend actor is generated at build time into `src/backend.ts` and `src/backend.d.ts`. All data operations go through the actor via React Query hooks:

```ts
import { createActor } from "../backend";
import { useActor } from "@caffeineai/core-infrastructure";

const { actor, isFetching } = useActor(createActor);
const result = await actor.purchasePlot(plotId);
```

**Never** bypass the actor with `localStorage`, `sessionStorage`, or mock data in production.

---

## Available Scripts

| Script | Command | Description |
|---|---|---|
| `dev` | `vite` | Start local dev server |
| `build` | `tsc && vite build` | Production build |
| `preview` | `vite preview` | Preview production build |
| `typecheck` | `tsc --noEmit` | TypeScript type checking |
| `fix` | `biome check --write .` | Lint + auto-fix |

---

## Design System

See `DESIGN.md` (root) and `src/index.css` for the full OKLCH token palette.

Key tokens:
- Primary accent: `#00ffcc` (cyan glow)
- Background: `oklch(9% 0.015 220)` (deep space navy)
- Text: `#e0f4ff` (cold white)
- Font: `Orbitron` (display) + `Inter` (body)

---

## Mainnet Notes

- Set `VITE_BACKEND_CANISTER_ID` in `env.json` to the deployed canister ID
- ICP Ledger canister: `ryjl3-tyaaa-aaaaa-aaaba-cai`
- Admin principal must be set in the backend before mainnet launch
- See root `MAINNET_CHECKLIST.md` for the full pre-launch checklist
