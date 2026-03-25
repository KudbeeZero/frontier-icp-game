# Frontier: Missile Horizon

## Current State

- `generatePlots()` in `gameStore.ts` generates only 200 random lat/lng points using a phyllotaxis spiral — not a proper geodesic grid.
- `HexGrid` component renders `LineSegments` outlines derived from those 200 points. With only 200 tiles the globe surface is mostly empty.
- `HexHighlights` rebuilds a `BufferGeometry` per hover/selection event — no InstancedMesh.
- `findNearestPlot(worldPoint)` in `EarthSphere` converts the world-space hit point to lat/lng, then searches by Euclidean lat/lng distance. It does NOT transform the hit point into the globe group's local space before searching, so every click is wrong once the globe has rotated.
- Globe radius is 1.0. HexGrid tiles render at radius 1.001–1.002.

## Requested Changes (Diff)

### Add
- `src/frontend/src/utils/geodesicGrid.ts` — new utility module:
  - `buildGeodesicGrid(freq: number): GeodesicTile[]` — icosahedral subdivision at frequency `freq`, returns ~`10*freq²+2` tiles (freq=32 → 10,242 tiles). Each tile: `{ id, lat, lng, nx, ny, nz }` (nx/ny/nz are normalized sphere coordinates).
  - `buildPositionCache(tiles: GeodesicTile[]): Float32Array` — flat packed `[x,y,z, x,y,z, ...]` for fast dot-product search.
  - `findNearestTile(nx: number, ny: number, nz: number, cache: Float32Array): number` — linear scan with max dot product, returns tile index. O(n) over 10K items ~0.1ms, acceptable for click/throttled hover events.
- `PLOT_POSITION_CACHE` exported from `gameStore.ts` — the `Float32Array` for use by the globe component.

### Modify
- **`src/frontend/src/store/gameStore.ts`**:
  - Replace `generatePlots()` body: import and call `buildGeodesicGrid(32)`, map each `GeodesicTile` to `PlotData` (preserving all existing PlotData fields). AI faction owners should be assigned every ~853rd and ~787th tile so density is proportional.
  - Export `PLOT_POSITION_CACHE = buildPositionCache(GEODESIC_TILES)` at module level.
- **`src/frontend/src/components/GlobeCanvas.tsx`**:
  - Replace `HexGrid` (LineSegments) and `HexHighlights` (per-event geometry rebuild) with a single **`GlobeHexGrid`** component using `THREE.InstancedMesh`.
  - Replace `findNearestPlot` inside `EarthSphere`: transform `e.point` (world space) into globe-local space via `globeRef.current.worldToLocal(point.clone())`, normalize it, then call `findNearestTile` with `PLOT_POSITION_CACHE`.

### Remove
- Old `HexGrid` function (LineSegments, 200-plot based).
- Old `HexHighlights` function (per-event BufferGeometry rebuild).
- Old `buildFilledHexGeometry` helper (no longer needed).
- Old `generatePlots()` body content (200-plot random loop).

## Implementation Plan

### 1. `src/frontend/src/utils/geodesicGrid.ts` (new file)

```
const PHI = (1+sqrt(5))/2
ICO_VERTS: 12 normalized icosahedron vertices
ICO_FACES: 20 triangle face index triples

buildGeodesicGrid(freq):
  for each ICO_FACE [a,b,c]:
    for s in [0..freq], t in [0..freq-s]:
      u = freq-s-t
      p = (Va*s + Vb*t + Vc*u) / freq  → normalize → project to unit sphere
      key = round(nx*1e4) + ',' + round(ny*1e4) + ',' + round(nz*1e4)
      deduplicate via Map<string, GeodesicTile>
  return Array.from(seen.values())
  → produces 10,242 unique tile positions for freq=32

buildPositionCache(tiles):
  Float32Array of length tiles.length*3
  tiles[i] → [nx, ny, nz] at offset i*3

findNearestTile(nx, ny, nz, cache):
  linear scan: dot = cache[i*3]*nx + cache[i*3+1]*ny + cache[i*3+2]*nz
  return index of maximum dot (= minimum angle from query point)
```

### 2. `gameStore.ts` changes

```
import { buildGeodesicGrid, buildPositionCache } from '../utils/geodesicGrid'

const GEODESIC_TILES = buildGeodesicGrid(32)  // 10,242 tiles, runs once at module load
export const PLOT_POSITION_CACHE = buildPositionCache(GEODESIC_TILES)

function generatePlots(): PlotData[] {
  return GEODESIC_TILES.map((tile, i) => ({
    id: i,
    lat: tile.lat,
    lng: tile.lng,
    biome: randomBiome(i),
    richness: 1 + (i % 5),
    owner: i % 853 === 0 ? 'NEXUS-7' : i % 787 === 0 ? 'KRONOS' : null,
    iron: 0, fuel: 0, crystal: 0,
    defenses: { turrets: 0, shields: 0, walls: 0 },
  }))
}
```

### 3. `GlobeCanvas.tsx` — `GlobeHexGrid` InstancedMesh

Hex geometry (created once with useMemo):
- Flat hexagon in XZ plane (y=0), +Y is outward normal
- 6 triangles: center + 2 adjacent corners per triangle
- Circumradius HEX_R = 0.0195 (sized for 10K tiles on unit sphere, ~4% gap)
- Slightly offset above sphere: position radius = 1.001

Instance matrix setup (runs once in useEffect after mount):
```
for each tile i:
  normal = new Vector3(nx, ny, nz)
  quat.setFromUnitVectors(Y_AXIS, normal)  // rotate flat hex face to point outward
  matrix.makeRotationFromQuaternion(quat)
  matrix.setPosition(normal * 1.001)
  mesh.setMatrixAt(i, matrix)
  mesh.setColorAt(i, BASE_COLOR)  // dim cyan-teal, opacity handled by material
mesh.instanceMatrix.needsUpdate = true
mesh.instanceColor.needsUpdate = true
```

Color update (useEffect on [hoveredPlotId, selectedPlotId, ownedPlots]):
```
reset all to BASE_COLOR
for owned: setColorAt(id, OWNED_COLOR)   // green
if hovered: setColorAt(id, HOVER_COLOR)  // gold
if selected: setColorAt(id, SELECTED_COLOR) // cyan
mesh.instanceColor.needsUpdate = true
```

Material: `MeshBasicMaterial` with `transparent: true`, `opacity: 0.18`, `vertexColors: true`, `depthWrite: false`, `side: DoubleSide`.

This replaces both old `HexGrid` and `HexHighlights` with one InstancedMesh draw call.

### 4. Fix `findNearestPlot` in `EarthSphere`

```typescript
import { findNearestTile, PLOT_POSITION_CACHE } from '../utils/geodesicGrid'
// ... (PLOT_POSITION_CACHE from gameStore or geodesicGrid)

function findNearestPlot(worldPoint: THREE.Vector3): number {
  // CRITICAL: transform world-space hit point into globe-local space
  // This accounts for the globe's current rotation
  const local = globeRef.current
    ? worldPoint.clone().applyMatrix4(
        new THREE.Matrix4().copy(globeRef.current.matrixWorld).invert()
      )
    : worldPoint.clone()
  // Normalize to unit direction on sphere
  local.normalize()
  return findNearestTile(local.x, local.y, local.z, PLOT_POSITION_CACHE)
}
```

Alternatively use `globeRef.current.worldToLocal(point.clone())` then `.normalize()`.

### Performance Notes
- `buildGeodesicGrid(32)` runs once at module load (~50ms), result is frozen.
- `findNearestTile` at 10K tiles: ~0.1ms per call. Hover is already throttled to 50ms intervals in the existing code — fine.
- InstancedMesh: single draw call for all 10,242 tiles vs 10,242 separate mesh calls.
- Color updates: writing 30KB Float32Array + GPU upload every 50ms hover tick is acceptable.
- `instanceMatrix.needsUpdate` is only set in the one-time setup effect, NOT in the color update effect — avoids expensive matrix re-upload on every hover.
