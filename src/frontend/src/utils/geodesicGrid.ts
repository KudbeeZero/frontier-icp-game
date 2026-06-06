/**
 * Icosahedral geodesic grid generator for the Frontier globe.
 *
 * Subdivides a regular icosahedron at frequency `freq` and projects all
 * vertices onto the unit sphere. The result is a Goldberg-polyhedron-style
 * grid of 10*freq²+2 near-equal-area tiles:
 *   freq=32  →  10,242 tiles  (12 pentagons + 10,230 hexagons)
 *
 * All tile positions are stored as normalized (unit) 3-D vectors so we can
 * use the fast max-dot-product search for pixel-perfect hit detection.
 */

import * as THREE from "three";

// ---------------------------------------------------------------------------
// Icosahedron topology
// ---------------------------------------------------------------------------

const PHI = (1 + Math.sqrt(5)) / 2; // golden ratio

/** 12 icosahedron vertices — will be normalised at build time */
const ICO_VERTS_RAW: [number, number, number][] = [
  [0, 1, PHI],
  [0, -1, PHI],
  [0, 1, -PHI],
  [0, -1, -PHI],
  [1, PHI, 0],
  [-1, PHI, 0],
  [1, -PHI, 0],
  [-1, -PHI, 0],
  [PHI, 0, 1],
  [-PHI, 0, 1],
  [PHI, 0, -1],
  [-PHI, 0, -1],
];

/** 20 icosahedron faces as vertex-index triples */
const ICO_FACES: [number, number, number][] = [
  [0, 1, 8],
  [0, 8, 4],
  [0, 4, 5],
  [0, 5, 9],
  [0, 9, 1],
  [1, 8, 6],
  [8, 4, 10],
  [4, 5, 2],
  [5, 9, 11],
  [9, 1, 7],
  [3, 6, 10],
  [3, 10, 2],
  [3, 2, 11],
  [3, 11, 7],
  [3, 7, 6],
  [6, 7, 1],
  [10, 6, 8],
  [2, 10, 4],
  [11, 2, 5],
  [7, 11, 9],
];

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface GeodesicTile {
  id: number;
  /** Geographic latitude in degrees  [-90, 90]  (for backward-compat with PlotData) */
  lat: number;
  /** Geographic longitude in degrees [-180, 180] (for backward-compat with PlotData) */
  lng: number;
  /** Normalised x component of the tile centre on the unit sphere */
  nx: number;
  /** Normalised y component */
  ny: number;
  /** Normalised z component */
  nz: number;
}

// ---------------------------------------------------------------------------
// Core generator
// ---------------------------------------------------------------------------

/**
 * Build a geodesic tile grid at the given subdivision frequency.
 *
 * @param freq  Subdivision frequency.  freq=32 → 10,242 tiles.
 * @returns     Array of GeodesicTile in insertion order (stable IDs).
 */
export function buildGeodesicGrid(freq: number): GeodesicTile[] {
  // Normalise the 12 base icosahedron vertices to the unit sphere
  const V = ICO_VERTS_RAW.map(([x, y, z]) => {
    const len = Math.sqrt(x * x + y * y + z * z);
    return new THREE.Vector3(x / len, y / len, z / len);
  });

  /**
   * Deduplication precision: round each component to 4 decimal places.
   * Shared icosahedron edges are re-computed from different faces and can
   * drift by ~1e-15 due to floating point; 1e-4 snapping absorbs that while
   * keeping distinct tiles separate (smallest inter-tile angle ~0.6° ≈ 0.01 rad
   * → delta component ~0.01 ≫ 1e-4).
   */
  const PREC = 1e4;
  const seen = new Map<string, GeodesicTile>();

  for (const [i0, i1, i2] of ICO_FACES) {
    const a = V[i0];
    const b = V[i1];
    const c = V[i2];

    for (let s = 0; s <= freq; s++) {
      for (let t = 0; t <= freq - s; t++) {
        const u = freq - s - t;

        // Barycentric interpolation then project to unit sphere
        const rx = (a.x * s + b.x * t + c.x * u) / freq;
        const ry = (a.y * s + b.y * t + c.y * u) / freq;
        const rz = (a.z * s + b.z * t + c.z * u) / freq;
        const rLen = Math.sqrt(rx * rx + ry * ry + rz * rz);
        const nx = rx / rLen;
        const ny = ry / rLen;
        const nz = rz / rLen;

        const key = `${Math.round(nx * PREC)},${Math.round(ny * PREC)},${Math.round(nz * PREC)}`;

        if (!seen.has(key)) {
          /**
           * Convert unit-sphere (nx, ny, nz) → geographic (lat, lng).
           *
           * Convention matches the existing latLngToXYZ in GlobeCanvas:
           *   x = -r·sin(ϕ)·cos(θ)
           *   y =  r·cos(ϕ)
           *   z =  r·sin(ϕ)·sin(θ)
           * where ϕ = polar angle from +Y, θ = azimuth
           *
           * Inverse:
           *   lat = 90 - ϕ·(180/π)  = asin(ny)·(180/π)
           *   lng = atan2(nz, -nx)·(180/π)
           */
          const lat =
            Math.asin(Math.max(-1, Math.min(1, ny))) * (180 / Math.PI);
          const lng = Math.atan2(nz, -nx) * (180 / Math.PI);

          seen.set(key, { id: seen.size, lat, lng, nx, ny, nz });
        }
      }
    }
  }

  return Array.from(seen.values());
}

// ---------------------------------------------------------------------------
// Position cache for fast hit detection
// ---------------------------------------------------------------------------

/**
 * Pack normalised tile positions into a flat Float32Array:
 *   [ nx0, ny0, nz0,  nx1, ny1, nz1, ... ]
 *
 * Used by findNearestTile for a branch-free dot-product scan.
 */
export function buildPositionCache(tiles: GeodesicTile[]): Float32Array {
  const arr = new Float32Array(tiles.length * 3);
  for (let i = 0; i < tiles.length; i++) {
    arr[i * 3] = tiles[i].nx;
    arr[i * 3 + 1] = tiles[i].ny;
    arr[i * 3 + 2] = tiles[i].nz;
  }
  return arr;
}

// ---------------------------------------------------------------------------
// Hit detection
// ---------------------------------------------------------------------------

/**
 * Find the tile whose centre is closest to the query point on the unit sphere.
 *
 * The caller MUST pass a point that has already been
 *   1. transformed into the globe GROUP’s local space, and
 *   2. normalised to unit length.
 *
 * "Closest tile" ≡ maximum dot product (minimum great-circle angle).
 *
 * Complexity: O(n) over ~10K tiles ≈ 0.05–0.15 ms — acceptable for
 * click events and 50 ms-throttled hover.
 *
 * @param nx   x of the normalised query point in globe-local space
 * @param ny   y
 * @param nz   z
 * @param cache  Float32Array from buildPositionCache()
 * @returns    Tile index (= tile.id)
 */
export function findNearestTile(
  nx: number,
  ny: number,
  nz: number,
  cache: Float32Array,
): number {
  const n = (cache.length / 3) | 0;
  let best = 0;
  let bestDot = Number.NEGATIVE_INFINITY;
  for (let i = 0; i < n; i++) {
    const dot =
      cache[i * 3] * nx + cache[i * 3 + 1] * ny + cache[i * 3 + 2] * nz;
    if (dot > bestDot) {
      bestDot = dot;
      best = i;
    }
  }
  return best;
}

// ---------------------------------------------------------------------------
// Module-level singletons (built once, never rebuilt)
// ---------------------------------------------------------------------------

/**
 * All 10,242 geodesic tiles (freq=32).  Built once when the module loads.
 * Cost: ~60 ms on a mid-range device; happens before the canvas is painted.
 */
export const GEODESIC_TILES: GeodesicTile[] = buildGeodesicGrid(32);

/**
 * Pre-packed position cache for findNearestTile.
 * 10,242 × 3 floats = ~120 KB.
 */
export const PLOT_POSITION_CACHE: Float32Array =
  buildPositionCache(GEODESIC_TILES);

// ---------------------------------------------------------------------------
// Ocean detection via lat/lng bounding boxes
// ---------------------------------------------------------------------------

/**
 * Returns true if the given lat/lng coordinates fall within known ocean
 * bounding boxes. Used by assignBiome to accurately reflect real-world
 * geography — ocean tiles produce Fuel and Rare Earth resources.
 */
export function isOceanTile(lat: number, lng: number): boolean {
  // Pacific: lat -60 to 65, lng 120 to 180 or -180 to -70
  if (lat >= -60 && lat <= 65) {
    if (lng >= 120 && lng <= 180) return true;
    if (lng >= -180 && lng <= -70) return true;
  }
  // Atlantic: lat -60 to 70, lng -70 to 20
  if (lat >= -60 && lat <= 70 && lng >= -70 && lng <= 20) return true;
  // Indian: lat -60 to 30, lng 20 to 120
  if (lat >= -60 && lat <= 30 && lng >= 20 && lng <= 120) return true;
  // Arctic: lat > 70
  if (lat > 70) return true;
  // Antarctic: lat < -60
  if (lat < -60) return true;
  return false;
}

/**
 * Assign one of the 8 canonical biomes based on lat/lng.
 * Biomes: Temperate, Desert, Arctic, Tropical, Ocean, DeepOcean, Volcanic, AsteroidImpact
 * AsteroidImpact is rare (~10% of land tiles) — assigned deterministically from tile position.
 */
export function assignBiomeForTile(lat: number, lng: number): string {
  // Deep ocean: poles and far Pacific
  if (lat < -65 || lat > 75) return "Arctic";
  if (lat < -55 || lat > 65) return "DeepOcean";

  // Ocean regions
  if (lat >= -60 && lat <= 65) {
    if (lng >= 120 && lng <= 180) return "Ocean";
    if (lng >= -180 && lng <= -70) return "Ocean";
  }
  if (lat >= -60 && lat <= 70 && lng >= -70 && lng <= 20) return "Ocean";
  if (lat >= -60 && lat <= 30 && lng >= 20 && lng <= 120) return "Ocean";

  // Arctic band
  if (lat > 60) return "Arctic";

  // Tropical band (equatorial)
  if (lat >= -10 && lat <= 15) {
    // Amazon / Congo / SE Asia
    if (
      (lng >= -80 && lng <= -45) ||
      (lng >= 10 && lng <= 50) ||
      (lng >= 95 && lng <= 155)
    ) {
      return "Tropical";
    }
  }

  // Volcanic hotspots: Iceland, Hawaii band, Ring of Fire edges
  const latRound = Math.round(lat / 5) * 5;
  const lngRound = Math.round(lng / 5) * 5;
  const volcHash = Math.abs(latRound * 73 + lngRound * 31) % 100;
  if (
    (lat >= 60 && lat <= 67 && lng >= -25 && lng <= -13) || // Iceland
    (lat >= 18 && lat <= 22 && lng >= -160 && lng <= -154) || // Hawaii
    (lat >= -10 && lat <= 5 && lng >= 95 && lng <= 112) || // Sumatra
    (lat >= 35 && lat <= 40 && lng >= 138 && lng <= 142) || // Japan
    volcHash < 4 // ~4% random volcanic
  )
    return "Volcanic";

  // Asteroid impact: ~10% of remaining land tiles, deterministic
  const astHash = Math.abs(Math.round(lat * 13 + lng * 7)) % 10;
  if (astHash === 0) return "AsteroidImpact";

  // Desert: Sahara, Middle East, central Asia, Australia interior
  if (lat >= 15 && lat <= 35 && lng >= -18 && lng <= 60) return "Desert";
  if (lat >= -35 && lat <= -20 && lng >= 115 && lng <= 150) return "Desert";
  if (lat >= 35 && lat <= 50 && lng >= 60 && lng <= 100) return "Desert";
  if (lat >= -5 && lat <= 15 && lng >= -18 && lng <= 20) return "Desert";

  // Temperate: everything else
  return "Temperate";
}

/**
 * Assign a biome based on latitude and longitude (legacy alias).
 */
export function assignBiome(lat: number, lng: number): string {
  return assignBiomeForTile(lat, lng);
}
