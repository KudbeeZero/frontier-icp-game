# Frontier ICP Game

## Current State
New project — no existing files.

## Requested Changes (Diff)

### Add
- Full multi-canister ICP strategy game with 3D hexagonal globe
- Token canister: ICRC-1/ICRC-2 FRNTR fungible token
- NFT canister: Plot NFTs + Commander avatar NFTs
- Game canister: 10,000 hex plots, 8 biomes, resource system, combat, AI factions, leaderboard, orbital events
- Frontend: Three.js hex globe, React UI, Internet Identity auth

### Modify
- Plot count changed from 21,000 to 10,000
- Plot geometry changed from point-based Fibonacci sphere to hexagon tiles on sphere surface

### Remove
- N/A

## Implementation Plan

### Backend (Motoko)
1. **Token canister** (`src/backend/token.mo`)
   - ICRC-1/ICRC-2 compliant FRNTR token
   - mint/burn callable only by game canister
   - Stable ledger, preupgrade/postupgrade

2. **NFT canister** (`src/backend/nft.mo`)
   - mintPlotNFT, mintCommanderNFT called by game canister
   - transfer on conquest
   - ownerOf, tokenMetadata queries
   - Stable storage, upgrade hooks

3. **Game canister** (`src/backend/main.mo`)
   - 10,000 hex plots in TrieMap, 8 biomes with resource rates
   - Hex adjacency computed via spherical neighbor lookup (each hex has ~6 neighbors)
   - Player registry with resources, FRNTR balance, commander
   - Resource tick timer (~60s): accumulate Iron/Fuel/Crystal per owned plot
   - AI faction timer (~5min): NEXUS-7, KRONOS, VANGUARD, SPECTRE actions
   - Orbital events timer (~2hr): Meteor Shower, Solar Flare, Void Rift, Cosmic Storm
   - purchasePlot, claimResources, attack, buildFacility, useAbility
   - Combat: ATK vs DEF+defenses, morale, 5min cooldown, NFT transfer on win
   - Leaderboard: top players by plots/FRNTR/victories
   - getPlot, getPlayer, getLeaderboard, getAdjacentPlots, getPlotRange
   - Inter-canister calls to token and NFT canisters
   - Stable memory with preupgrade/postupgrade

### Frontend (React/TypeScript)
1. **Globe** (`GlobeCanvas.tsx`)
   - Three.js WebGL, 10,000 hexagonal tiles on sphere surface
   - Each hex tile is a flat hexagon mesh extruded slightly from the sphere
   - Plot coloring by ownership/biome, raycasting click/hover on hex meshes
   - Orbital event visual overlays, particle systems
   - Smooth rotation, zoom, pan

2. **Pages**
   - `/` Landing: animated globe preview, Internet Identity login CTA
   - `/play` Main game: fullscreen globe + sidebars
   - `/inventory` Player assets: plots, commanders, resources, FRNTR
   - `/leaderboard` Top players table
   - `/manual` Game mechanics documentation

3. **UI Components**
   - PlotInfoPanel: biome, owner, resources, defenses, action buttons
   - PlayerHUD: FRNTR balance, resource counts, active commander
   - CombatLog: recent attacks feed
   - Notifications: Framer Motion toasts

4. **ICP Integration**
   - AuthClient for Internet Identity
   - Actor factory for game/token/nft canisters
   - TanStack Query polling every 5-10s
   - Loading states on all update calls
