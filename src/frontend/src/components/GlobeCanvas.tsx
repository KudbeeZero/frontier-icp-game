import { OrbitControls, useTexture } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import type React from "react";
import { Suspense, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { MissileConfig } from "../constants/missiles";
import { useGameStore } from "../store/gameStore";
import { PLOT_POSITION_CACHE, findNearestTile } from "../utils/geodesicGrid";

function latLngToXYZ(lat: number, lng: number, r: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(theta),
  );
}

// ---------------------------------------------------------------------------
// Hex tile geometry (created once – shared across all instances)
// ---------------------------------------------------------------------------
//   Flat hexagon in the XZ plane (Y = 0 = outward-facing normal)
//   Circumradius 0.0195 → leaves ~4% gap between adjacent tiles at 10 K count
const HEX_R = 0.0195;
function makeHexGeometry(): THREE.BufferGeometry {
  const positions = new Float32Array(6 * 3 * 3); // 6 triangles × 3 verts × 3 floats
  let idx = 0;
  for (let i = 0; i < 6; i++) {
    const a0 = (i / 6) * Math.PI * 2;
    const a1 = ((i + 1) / 6) * Math.PI * 2;
    // center
    positions[idx++] = 0;
    positions[idx++] = 0;
    positions[idx++] = 0;
    // corner i
    positions[idx++] = Math.cos(a0) * HEX_R;
    positions[idx++] = 0;
    positions[idx++] = Math.sin(a0) * HEX_R;
    // corner i+1
    positions[idx++] = Math.cos(a1) * HEX_R;
    positions[idx++] = 0;
    positions[idx++] = Math.sin(a1) * HEX_R;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.computeVertexNormals();
  return geo;
}
const HEX_GEO = makeHexGeometry();

// Pre-allocated scratch objects – avoids per-frame allocations
const _mat4 = new THREE.Matrix4();
const _quat = new THREE.Quaternion();
const _pos = new THREE.Vector3();
const _Y = new THREE.Vector3(0, 1, 0);

// State colors
const COL_BASE = new THREE.Color(0x00ccaa); // dim teal grid fill
const COL_OWNED = new THREE.Color(0x22c55e); // green
const COL_HOVER = new THREE.Color(0xffd700); // gold
const COL_SELECTED = new THREE.Color(0x00ffff); // bright cyan
const COL_FACTION: Record<string, THREE.Color> = {
  "NEXUS-7": new THREE.Color(0xef4444),
  KRONOS: new THREE.Color(0x8b5cf6),
  VANGUARD: new THREE.Color(0x22c3c9),
  SPECTRE: new THREE.Color(0xf59e0b),
};

/**
 * GlobeHexGrid
 * ============
 * Renders all ~10,242 geodesic hex tiles as a single InstancedMesh draw call.
 * Selection / hover state is expressed via per-instance vertex colours
 * (no geometry rebuilds, no separate meshes per tile).
 */
function GlobeHexGrid() {
  const plots = useGameStore((s) => s.plots);
  const hoveredId = useGameStore((s) => s.hoveredPlotId);
  const selectedId = useGameStore((s) => s.selectedPlotId);
  const ownedPlots = useGameStore((s) => s.player.plotsOwned);
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const { camera } = useThree();

  const count = plots.length;

  // ── One-time matrix setup ────────────────────────────────────────────────
  // Run after first render when meshRef is populated.
  // Each instance: flat hex face oriented toward the tile's surface normal.
  // biome-ignore lint/correctness/useExhaustiveDependencies: runs once on mount; plots and count are stable references from the store
  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    for (let i = 0; i < count; i++) {
      const p = plots[i];
      _pos.set(p.id, 0, 0); // temp reuse
      // Build normal from stored lat/lng (matches latLngToXYZ convention)
      const phi = (90 - p.lat) * (Math.PI / 180);
      const theta = (p.lng + 180) * (Math.PI / 180);
      _pos.set(
        -Math.sin(phi) * Math.cos(theta),
        Math.cos(phi),
        Math.sin(phi) * Math.sin(theta),
      );
      // Rotate flat hex (+Y normal) to face outward along _pos
      _quat.setFromUnitVectors(_Y, _pos);
      _mat4.makeRotationFromQuaternion(_quat);
      _mat4.setPosition(_pos.clone().multiplyScalar(1.001)); // 0.1% above surface
      mesh.setMatrixAt(i, _mat4);
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
    // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally runs once
  }, []);

  // ── Colour updates on state change ──────────────────────────────────────
  // Writes only the changed colour slots then flips needsUpdate.
  // Writing 30 KB Float32Array is negligible; no matrix re-upload needed.
  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    // 1. Reset all to base
    for (let i = 0; i < count; i++) {
      mesh.setColorAt(i, COL_BASE);
    }

    // 2. AI / faction owned
    for (const p of plots) {
      if (p.owner && COL_FACTION[p.owner]) {
        mesh.setColorAt(p.id, COL_FACTION[p.owner]);
      }
    }

    // 3. Player-owned (overrides faction)
    for (const pid of ownedPlots) {
      if (pid >= 0 && pid < count) mesh.setColorAt(pid, COL_OWNED);
    }

    // 4. Hovered
    if (hoveredId !== null && hoveredId >= 0 && hoveredId < count) {
      mesh.setColorAt(hoveredId, COL_HOVER);
    }

    // 5. Selected (overrides hover)
    if (selectedId !== null && selectedId >= 0 && selectedId < count) {
      mesh.setColorAt(selectedId, COL_SELECTED);
    }

    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [plots, hoveredId, selectedId, ownedPlots, count]);

  // ── Distance-based opacity fade ─────────────────────────────────────────
  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const dist = camera.position.length();
    const mat = mesh.material as THREE.MeshBasicMaterial;
    // More transparent when zoomed out (full globe view), more visible when
    // zoomed in (plot-level interaction)
    mat.opacity = THREE.MathUtils.clamp(
      THREE.MathUtils.mapLinear(dist, 1.4, 2.5, 0.32, 0.08),
      0.05,
      0.35,
    );
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[HEX_GEO, undefined, count]}
      frustumCulled={false}
    >
      <meshBasicMaterial
        vertexColors
        transparent
        opacity={0.18}
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </instancedMesh>
  );
}

const atmosphereVert = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vViewPosition = -mvPosition.xyz;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const atmosphereFrag = /* glsl */ `
  uniform vec3 glowColor;
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  void main() {
    float intensity = pow(0.65 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 3.0);
    intensity = clamp(intensity, 0.0, 1.0);
    gl_FragColor = vec4(glowColor * intensity, intensity * 0.8);
  }
`;

function EarthSphere() {
  const dayTex = useTexture("/assets/generated/earth-day.dim_4096x2048.jpg");
  const cloudsTex = useTexture(
    "/assets/generated/earth-clouds.dim_2048x1024.jpg",
  );
  const globeRef = useRef<THREE.Group>(null);
  const cloudsRef = useRef<THREE.Mesh>(null);
  const selectPlot = useGameStore((s) => s.selectPlot);
  const setHoveredPlotId = useGameStore((s) => s.setHoveredPlotId);
  const lastMoveTime = useRef(0);

  const atmosphereUniforms = useMemo(
    () => ({ glowColor: { value: new THREE.Color(0.1, 0.5, 1.0) } }),
    [],
  );

  useFrame(() => {
    if (globeRef.current) globeRef.current.rotation.y += 0.0001;
    if (cloudsRef.current) cloudsRef.current.rotation.y += 0.0003;
  });

  /**
   * findNearestPlot — pixel-perfect hit detection
   * ──────────────────────────────────────────────
   * 1. Transform the world-space hit point into the GLOBE GROUP's local space.
   *    This is the critical fix: the globe rotates continuously, so a raw
   *    world-space point maps to the wrong tile once the globe has moved.
   * 2. Normalize to a unit direction on the sphere.
   * 3. Use max-dot-product search over the pre-built position cache.
   *    O(n) over 10,242 tiles ≈ 0.05–0.1 ms — negligible for click/hover.
   */
  function findNearestPlot(worldPoint: THREE.Vector3): number {
    // Step 1: world → globe-local space
    const local = worldPoint.clone();
    if (globeRef.current) {
      // worldToLocal is equivalent to applying the inverse of matrixWorld
      globeRef.current.worldToLocal(local);
    }
    // Step 2: normalize to unit sphere direction
    const len = local.length();
    if (len < 1e-9) return 0;
    local.divideScalar(len);
    // Step 3: max dot-product search using the pre-cached tile positions
    return findNearestTile(local.x, local.y, local.z, PLOT_POSITION_CACHE);
  }

  const handleClick = (e: any) => {
    e.stopPropagation();
    const nearest = findNearestPlot(e.point);
    selectPlot(nearest);
  };

  const handlePointerMove = (e: any) => {
    const now = performance.now();
    if (now - lastMoveTime.current < 50) return;
    lastMoveTime.current = now;
    const nearest = findNearestPlot(e.point);
    setHoveredPlotId(nearest);
  };

  const handlePointerLeave = () => {
    setHoveredPlotId(null);
  };

  return (
    <group ref={globeRef}>
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: 3D canvas mesh */}
      <mesh
        onClick={handleClick}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
      >
        <sphereGeometry args={[1, 64, 64]} />
        <meshPhongMaterial
          map={dayTex}
          shininess={15}
          specular={new THREE.Color(0x333333)}
        />
      </mesh>

      <mesh ref={cloudsRef}>
        <sphereGeometry args={[1.008, 64, 64]} />
        <meshPhongMaterial
          map={cloudsTex}
          transparent
          opacity={0.4}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      <mesh>
        <sphereGeometry args={[1.15, 32, 32]} />
        <shaderMaterial
          vertexShader={atmosphereVert}
          fragmentShader={atmosphereFrag}
          uniforms={atmosphereUniforms}
          side={THREE.BackSide}
          transparent
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      <GlobeHexGrid />
    </group>
  );
}

function Starfield() {
  const tex = useTexture(
    "/assets/generated/starfield-nebula.dim_2048x1024.jpg",
  );
  return (
    <mesh>
      <sphereGeometry args={[90, 32, 32]} />
      <meshBasicMaterial map={tex} side={THREE.BackSide} />
    </mesh>
  );
}

function bezierPoint(
  p0: THREE.Vector3,
  p1: THREE.Vector3,
  p2: THREE.Vector3,
  t: number,
): THREE.Vector3 {
  const q0 = p0.clone().lerp(p1, t);
  const q1 = p1.clone().lerp(p2, t);
  return q0.lerp(q1, t);
}

function hexColorToInt(hex: string): number {
  return Number.parseInt(hex.replace("#", ""), 16);
}

interface MissileProps {
  active: boolean;
  onComplete: () => void;
  missileConfig?: MissileConfig;
}

// Pre-allocated scratchpad vectors to avoid per-frame allocations
const _scratchVec = new THREE.Vector3();
const _scratchVec2 = new THREE.Vector3();

function MissileAnimation({ active, onComplete, missileConfig }: MissileProps) {
  const progressRef = useRef(0);
  const completedRef = useRef(false);
  const postImpactTimerRef = useRef(0);
  const impactStartRef = useRef(0);
  const plumeStartRef = useRef(0);

  // Missile body
  const missileRef = useRef<THREE.Mesh>(null);

  // Smoke trail layers (ring buffer approach)
  const TRAIL_POINTS = 30;
  const trail1Ref = useRef<THREE.Points>(null);
  const trail2Ref = useRef<THREE.Points>(null);
  const trail3Ref = useRef<THREE.Points>(null);
  const trail1Pos = useRef(new Float32Array(TRAIL_POINTS * 3));
  const trail2Pos = useRef(new Float32Array(TRAIL_POINTS * 3));
  const trail3Pos = useRef(new Float32Array(TRAIL_POINTS * 3));
  const trailWriteIdx = useRef(0);
  const trailFilled = useRef(false);

  // Launch plume
  const plumeRef = useRef<THREE.Mesh>(null);
  const plumeMushroomRef = useRef<THREE.Mesh>(null);
  const scorchRef = useRef<THREE.Mesh>(null);

  // Exhaust flame + shock diamonds
  const flameRef = useRef<THREE.Points>(null);
  const flamePosArr = useRef(new Float32Array(8 * 3));
  const shockDiamondRefs = useRef<(THREE.Mesh | null)[]>([]);

  // Vapor cone
  const vaporConeRef = useRef<THREE.Mesh>(null);

  // MIRV sub-missiles
  const MIRV_COUNT = 5;
  const mirvRefs = useRef<(THREE.Mesh | null)[]>([]);
  const mirvTrailRefs = useRef<(THREE.Points | null)[]>([]);
  const mirvTrailPos = useRef<Float32Array[]>(
    Array.from({ length: MIRV_COUNT }, () => new Float32Array(12 * 3)),
  );

  // Impact
  const shockwaveRef = useRef<THREE.Mesh>(null);
  const fireballRef = useRef<THREE.Mesh>(null);
  const debrisRef = useRef<THREE.Points>(null);
  const groundFlashRef = useRef<THREE.Mesh>(null);
  const debrisPosArr = useRef(new Float32Array(40 * 3));
  const debrisVelArr = useRef(new Float32Array(40 * 3));

  const srcPlot = useMemo(() => latLngToXYZ(40.7, -74, 1.0), []);
  const dstPlot = useMemo(() => latLngToXYZ(51.5, 0.0, 1.0), []);

  const vfx = missileConfig?.vfx;
  const trajectory = missileConfig?.trajectory ?? "ballistic";
  const speedMultiplier = missileConfig?.speedMultiplier ?? 1.0;

  const arcHeight = useMemo(() => {
    switch (trajectory) {
      case "cruise":
        return 0.12;
      case "top-attack":
        return 0.8;
      case "vertical-pop":
        return 2.0;
      case "direct":
        return 0.15;
      default:
        return 2.5;
    }
  }, [trajectory]);

  // For top-attack: two bezier segments — ascent then dive
  const ctrlPt = useMemo(() => {
    const mid = srcPlot.clone().lerp(dstPlot, 0.5).normalize();
    if (trajectory === "top-attack") {
      return mid.multiplyScalar(1 + arcHeight);
    }
    return mid.multiplyScalar(1 + arcHeight);
  }, [srcPlot, dstPlot, arcHeight, trajectory]);

  // Top-attack dive control point: starts from peak, dives to dest
  const diveCtrlPt = useMemo(() => {
    if (trajectory === "top-attack") {
      return ctrlPt.clone().lerp(dstPlot, 0.5).normalize().multiplyScalar(1.6);
    }
    return ctrlPt;
  }, [ctrlPt, dstPlot, trajectory]);

  // Vertical-pop: shoot up first then arc
  const vertPopCtrl = useMemo(() => {
    if (trajectory === "vertical-pop") {
      const up = srcPlot
        .clone()
        .normalize()
        .multiplyScalar(1 + arcHeight);
      return up;
    }
    return ctrlPt;
  }, [srcPlot, ctrlPt, arcHeight, trajectory]);

  // MIRV target offsets
  const mirvTargets = useMemo(() => {
    const targets: THREE.Vector3[] = [];
    for (let i = 0; i < MIRV_COUNT; i++) {
      const angle = (i / MIRV_COUNT) * Math.PI * 2;
      const offset = new THREE.Vector3(
        Math.cos(angle) * 0.05,
        Math.sin(angle) * 0.02,
        Math.sin(angle) * 0.05,
      );
      targets.push(dstPlot.clone().add(offset).normalize());
    }
    return targets;
  }, [dstPlot]);

  // Initialize debris velocities once
  useMemo(() => {
    const vel = debrisVelArr.current;
    for (let i = 0; i < 40; i++) {
      vel[i * 3] = (Math.random() - 0.5) * 0.4;
      vel[i * 3 + 1] = (Math.random() - 0.5) * 0.4;
      vel[i * 3 + 2] = (Math.random() - 0.5) * 0.4;
    }
  }, []);

  function getMissilePosition(t: number): THREE.Vector3 {
    if (trajectory === "top-attack") {
      if (t < 0.5) {
        return bezierPoint(srcPlot, ctrlPt, diveCtrlPt, t * 2);
      }
      return bezierPoint(
        diveCtrlPt,
        dstPlot.clone().lerp(diveCtrlPt, 0.1),
        dstPlot,
        (t - 0.5) * 2,
      );
    }
    if (trajectory === "vertical-pop") {
      if (t < 0.2) {
        return bezierPoint(srcPlot, vertPopCtrl, vertPopCtrl, t / 0.2);
      }
      return bezierPoint(vertPopCtrl, ctrlPt, dstPlot, (t - 0.2) / 0.8);
    }
    return bezierPoint(srcPlot, ctrlPt, dstPlot, t);
  }

  useFrame((state, delta) => {
    if (!active) {
      progressRef.current = 0;
      completedRef.current = false;
      postImpactTimerRef.current = 0;
      impactStartRef.current = 0;
      plumeStartRef.current = 0;
      trailWriteIdx.current = 0;
      trailFilled.current = false;
      // Zero out trail buffers
      trail1Pos.current.fill(0);
      trail2Pos.current.fill(0);
      trail3Pos.current.fill(0);

      if (missileRef.current) missileRef.current.visible = false;
      if (trail1Ref.current) trail1Ref.current.visible = false;
      if (trail2Ref.current) trail2Ref.current.visible = false;
      if (trail3Ref.current) trail3Ref.current.visible = false;
      if (plumeRef.current) plumeRef.current.visible = false;
      if (plumeMushroomRef.current) plumeMushroomRef.current.visible = false;
      if (scorchRef.current) scorchRef.current.visible = false;
      if (flameRef.current) flameRef.current.visible = false;
      if (vaporConeRef.current) vaporConeRef.current.visible = false;
      if (shockwaveRef.current) shockwaveRef.current.visible = false;
      if (fireballRef.current) fireballRef.current.visible = false;
      if (debrisRef.current) debrisRef.current.visible = false;
      if (groundFlashRef.current) groundFlashRef.current.visible = false;
      for (let i = 0; i < MIRV_COUNT; i++) {
        if (mirvRefs.current[i])
          (mirvRefs.current[i] as THREE.Mesh).visible = false;
        if (mirvTrailRefs.current[i])
          (mirvTrailRefs.current[i] as THREE.Points).visible = false;
      }
      for (const sd of shockDiamondRefs.current) {
        if (sd) sd.visible = false;
      }
      return;
    }

    const t = progressRef.current;
    const clock = state.clock.getElapsedTime();
    const baseSpeed = speedMultiplier / 6.0;

    let speed: number;
    if (t < 0.8) {
      speed = baseSpeed;
    } else if (t < 0.95) {
      speed = 0.2 * baseSpeed;
    } else {
      speed = 1.5 * baseSpeed;
    }

    if (t < 1.0) {
      progressRef.current = Math.min(t + delta * speed, 1.0);
    }

    const pos = getMissilePosition(t);

    // ── LAUNCH PLUME (t < 0.15) ──────────────────────────────────
    if (t < 0.15) {
      if (plumeStartRef.current === 0) plumeStartRef.current = clock;
      const elapsed = clock - plumeStartRef.current;
      const plumeScale = vfx?.plumeScale ?? 1.0;
      const isHot = vfx?.launchType === "hot";
      const lingerSec = vfx?.plumeLingerSeconds ?? 2;
      const plumeAlpha = Math.max(0, 1 - elapsed / lingerSec);

      if (plumeRef.current) {
        plumeRef.current.visible = true;
        plumeRef.current.position.copy(srcPlot);
        if (isHot) {
          // Hot: fast violent expand then shrink
          const hotScale = Math.min(elapsed * 8, 1.0) * plumeScale * 0.08;
          plumeRef.current.scale.setScalar(hotScale);
        } else {
          // Cold: slower expand, lingers
          const coldScale = Math.min(elapsed * 3, 1.0) * plumeScale * 0.1;
          plumeRef.current.scale.setScalar(coldScale);
        }
        const pm = plumeRef.current.material as THREE.MeshBasicMaterial;
        pm.opacity = plumeAlpha * (isHot ? 0.9 : 0.7);
      }

      // Mushroom / steam cap (cold only)
      if (plumeMushroomRef.current) {
        plumeMushroomRef.current.visible = !isHot;
        if (!isHot) {
          plumeMushroomRef.current.position.copy(
            srcPlot.clone().multiplyScalar(1.03),
          );
          const mScale = Math.min(elapsed * 2.5, 1.0) * plumeScale * 0.14;
          plumeMushroomRef.current.scale.set(mScale, mScale * 0.4, mScale);
          const mm = plumeMushroomRef.current
            .material as THREE.MeshBasicMaterial;
          mm.opacity = plumeAlpha * 0.5;
        }
      }

      // Ground scorch (hot only)
      if (scorchRef.current) {
        scorchRef.current.visible = isHot;
        if (isHot) {
          scorchRef.current.position.copy(srcPlot);
          scorchRef.current.lookAt(0, 0, 0);
          const scScale = Math.min(elapsed * 4, 1.0) * 0.06;
          scorchRef.current.scale.setScalar(scScale);
          const scm = scorchRef.current.material as THREE.MeshBasicMaterial;
          scm.opacity = Math.max(0, 0.6 - elapsed * 0.2);
        }
      }
    } else {
      // Fade out plume after launch
      if (plumeRef.current) {
        const elapsed =
          plumeStartRef.current > 0 ? clock - plumeStartRef.current : 999;
        const lingerSec = vfx?.plumeLingerSeconds ?? 2;
        if (elapsed > lingerSec) {
          plumeRef.current.visible = false;
          if (plumeMushroomRef.current)
            plumeMushroomRef.current.visible = false;
        } else {
          const pm = plumeRef.current.material as THREE.MeshBasicMaterial;
          pm.opacity = Math.max(0, 1 - elapsed / lingerSec) * 0.5;
        }
      }
      if (scorchRef.current) scorchRef.current.visible = false;
    }

    // ── MISSILE BODY (t < 0.95) ──────────────────────────────────
    if (t < 0.95) {
      if (missileRef.current) {
        missileRef.current.visible = true;
        missileRef.current.position.copy(pos);
        // Orient along direction of travel
        const nextT = Math.min(t + 0.005, 1.0);
        const nextPos = getMissilePosition(nextT);
        _scratchVec.subVectors(nextPos, pos).normalize();
        missileRef.current.quaternion.setFromUnitVectors(
          new THREE.Vector3(0, 1, 0),
          _scratchVec,
        );
        const mat = missileRef.current.material as THREE.MeshStandardMaterial;
        mat.emissiveIntensity = t > 0.8 ? 2.0 + (t - 0.8) * 30 : 2.5;
      }
    } else {
      if (missileRef.current) missileRef.current.visible = false;
    }

    // ── EXHAUST FLAME + SHOCK DIAMONDS (t < 0.95) ────────────────
    if (t < 0.95 && t > 0.01) {
      if (flameRef.current) {
        flameRef.current.visible = true;
        const flameArr = flamePosArr.current;
        const fl = vfx?.flameLength ?? 0.05;
        const nextT = Math.min(t + 0.002, 1.0);
        const nextPos = getMissilePosition(nextT);
        _scratchVec2.subVectors(pos, nextPos).normalize();

        for (let i = 0; i < 8; i++) {
          const frac = i / 7;
          const fx =
            pos.x + _scratchVec2.x * fl * frac + (Math.random() - 0.5) * 0.002;
          const fy =
            pos.y + _scratchVec2.y * fl * frac + (Math.random() - 0.5) * 0.002;
          const fz =
            pos.z + _scratchVec2.z * fl * frac + (Math.random() - 0.5) * 0.002;
          flameArr[i * 3] = fx;
          flameArr[i * 3 + 1] = fy;
          flameArr[i * 3 + 2] = fz;
        }
        const fAttr = flameRef.current.geometry.getAttribute(
          "position",
        ) as THREE.BufferAttribute;
        (fAttr.array as Float32Array).set(flameArr);
        fAttr.needsUpdate = true;
      }

      // Shock diamonds
      if (vfx?.shockDiamondsEnabled) {
        const sdCount = vfx.shockDiamondCount;
        const fl = vfx.flameLength;
        const nextT = Math.min(t + 0.002, 1.0);
        const nextPos = getMissilePosition(nextT);
        _scratchVec2.subVectors(pos, nextPos).normalize();
        for (let i = 0; i < sdCount; i++) {
          const sd = shockDiamondRefs.current[i];
          if (sd) {
            sd.visible = true;
            const frac = (i + 0.5) / sdCount;
            sd.position.set(
              pos.x + _scratchVec2.x * fl * frac,
              pos.y + _scratchVec2.y * fl * frac,
              pos.z + _scratchVec2.z * fl * frac,
            );
            const sdMat = sd.material as THREE.MeshBasicMaterial;
            sdMat.opacity = (Math.sin(clock * 20 + i * 1.3) * 0.5 + 0.5) * 0.9;
          }
        }
      }
    } else {
      if (flameRef.current) flameRef.current.visible = false;
      for (const sd of shockDiamondRefs.current) {
        if (sd) sd.visible = false;
      }
    }

    // ── SMOKE TRAIL (ring buffer, t > 0.01 && t < 0.95) ──────────
    if (t > 0.01 && t < 0.98) {
      const wIdx = trailWriteIdx.current;
      const spiral = vfx?.trailSpiral ?? false;
      const spiralFreq = vfx?.trailSpiralFreq ?? 0;
      const billow = vfx?.layer2BillowFactor ?? 0.006;

      // Write current position into ring buffer
      trail1Pos.current[wIdx * 3] =
        pos.x + (spiral ? Math.sin(t * spiralFreq * 50) * 0.008 : 0);
      trail1Pos.current[wIdx * 3 + 1] = pos.y;
      trail1Pos.current[wIdx * 3 + 2] =
        pos.z + (spiral ? Math.cos(t * spiralFreq * 50) * 0.008 : 0);

      trail2Pos.current[wIdx * 3] = pos.x + (Math.random() - 0.5) * billow;
      trail2Pos.current[wIdx * 3 + 1] = pos.y + (Math.random() - 0.5) * billow;
      trail2Pos.current[wIdx * 3 + 2] = pos.z + (Math.random() - 0.5) * billow;

      trail3Pos.current[wIdx * 3] =
        pos.x + (Math.random() - 0.5) * billow * 2.5;
      trail3Pos.current[wIdx * 3 + 1] =
        pos.y + (Math.random() - 0.5) * billow * 2.5;
      trail3Pos.current[wIdx * 3 + 2] =
        pos.z + (Math.random() - 0.5) * billow * 2.5;

      trailWriteIdx.current = (wIdx + 1) % TRAIL_POINTS;
      if (!trailFilled.current && wIdx === TRAIL_POINTS - 1)
        trailFilled.current = true;

      if (trail1Ref.current) {
        trail1Ref.current.visible = true;
        const a1 = trail1Ref.current.geometry.getAttribute(
          "position",
        ) as THREE.BufferAttribute;
        (a1.array as Float32Array).set(trail1Pos.current);
        a1.needsUpdate = true;
        const m1 = trail1Ref.current.material as THREE.PointsMaterial;
        m1.opacity = (vfx?.layer1Opacity ?? 0.8) * (1 - t * 0.3);
      }
      if (trail2Ref.current) {
        trail2Ref.current.visible = true;
        const a2 = trail2Ref.current.geometry.getAttribute(
          "position",
        ) as THREE.BufferAttribute;
        (a2.array as Float32Array).set(trail2Pos.current);
        a2.needsUpdate = true;
        const m2 = trail2Ref.current.material as THREE.PointsMaterial;
        m2.opacity = (vfx?.layer2Opacity ?? 0.4) * (1 - t * 0.3);
      }
      if (trail3Ref.current) {
        trail3Ref.current.visible = true;
        const a3 = trail3Ref.current.geometry.getAttribute(
          "position",
        ) as THREE.BufferAttribute;
        (a3.array as Float32Array).set(trail3Pos.current);
        a3.needsUpdate = true;
        const m3 = trail3Ref.current.material as THREE.PointsMaterial;
        m3.opacity = (vfx?.layer3Opacity ?? 0.15) * (1 - t * 0.4);
      }
    } else if (t >= 0.98) {
      if (trail1Ref.current) trail1Ref.current.visible = false;
      if (trail2Ref.current) trail2Ref.current.visible = false;
      if (trail3Ref.current) trail3Ref.current.visible = false;
    }

    // ── VAPOR CONE (supersonic, speedMultiplier >= 3) ─────────────
    if (vfx?.vaporConeEnabled && speedMultiplier >= 3 && t > 0.05 && t < 0.95) {
      if (vaporConeRef.current) {
        vaporConeRef.current.visible = true;
        vaporConeRef.current.position.copy(pos);
        const nextT = Math.min(t + 0.01, 1.0);
        const nextPos = getMissilePosition(nextT);
        vaporConeRef.current.lookAt(nextPos);
        const vcMat = vaporConeRef.current.material as THREE.MeshBasicMaterial;
        vcMat.opacity = 0.25 + Math.sin(clock * 15) * 0.05;
      }
    } else {
      if (vaporConeRef.current) vaporConeRef.current.visible = false;
    }

    // ── MIRV FAN (ICBM only, t = 0.85-0.98) ─────────────────────
    const mirvCount = vfx?.mirvCount ?? 0;
    if (mirvCount > 0 && t >= 0.85 && t < 0.98) {
      for (let i = 0; i < MIRV_COUNT; i++) {
        const mirvMesh = mirvRefs.current[i];
        const mirvTrail = mirvTrailRefs.current[i];
        if (!mirvMesh || !mirvTrail) continue;

        const mirvT = (t - 0.85) / 0.13;
        const mirvTarget = mirvTargets[i];
        const peakCtrl = dstPlot
          .clone()
          .lerp(mirvTarget, 0.5)
          .normalize()
          .multiplyScalar(1.2);
        const mirvPos = bezierPoint(
          dstPlot,
          peakCtrl,
          mirvTarget,
          Math.min(mirvT, 1.0),
        );

        mirvMesh.visible = true;
        mirvMesh.position.copy(mirvPos);

        // Update MIRV trail
        const tp = mirvTrailPos.current[i];
        for (let j = 11; j > 0; j--) {
          tp[j * 3] = tp[(j - 1) * 3];
          tp[j * 3 + 1] = tp[(j - 1) * 3 + 1];
          tp[j * 3 + 2] = tp[(j - 1) * 3 + 2];
        }
        tp[0] = mirvPos.x;
        tp[1] = mirvPos.y;
        tp[2] = mirvPos.z;

        mirvTrail.visible = true;
        const mta = mirvTrail.geometry.getAttribute(
          "position",
        ) as THREE.BufferAttribute;
        (mta.array as Float32Array).set(tp);
        mta.needsUpdate = true;
      }
    } else if (t < 0.85 || t >= 0.98) {
      for (let i = 0; i < MIRV_COUNT; i++) {
        if (mirvRefs.current[i])
          (mirvRefs.current[i] as THREE.Mesh).visible = false;
        if (mirvTrailRefs.current[i])
          (mirvTrailRefs.current[i] as THREE.Points).visible = false;
      }
    }

    // ── IMPACT EXPLOSION (t >= 0.95) ─────────────────────────────
    if (t >= 0.95) {
      if (missileRef.current) missileRef.current.visible = false;
      if (flameRef.current) flameRef.current.visible = false;
      if (vaporConeRef.current) vaporConeRef.current.visible = false;

      if (impactStartRef.current === 0) {
        impactStartRef.current = clock;
        // Initialize debris velocities from impact point
        const dp = debrisPosArr.current;
        for (let i = 0; i < 40; i++) {
          dp[i * 3] = dstPlot.x;
          dp[i * 3 + 1] = dstPlot.y;
          dp[i * 3 + 2] = dstPlot.z;
        }
      }

      const elapsed = clock - impactStartRef.current;
      const flashColor = hexColorToInt(vfx?.impactFlashColor ?? "#ffffff");
      const swColor = hexColorToInt(vfx?.impactShockwaveColor ?? "#ff4400");
      const fbScale = vfx?.impactFireballScale ?? 0.15;
      const debrisCount = Math.min(vfx?.impactDebrisCount ?? 20, 40);

      // Shockwave ring
      if (shockwaveRef.current) {
        shockwaveRef.current.visible = elapsed < 1.2;
        if (elapsed < 1.2) {
          shockwaveRef.current.position.copy(dstPlot);
          shockwaveRef.current.lookAt(0, 0, 0);
          const s = Math.min(elapsed * 4, 4.0);
          shockwaveRef.current.scale.setScalar(s);
          const swMat = shockwaveRef.current
            .material as THREE.MeshBasicMaterial;
          swMat.color.setHex(swColor);
          swMat.opacity = Math.max(0, 1 - elapsed * 1.2);
        }
      }

      // Fireball
      if (fireballRef.current) {
        fireballRef.current.visible = elapsed < 1.0;
        if (elapsed < 1.0) {
          fireballRef.current.position.copy(dstPlot);
          const fbS = Math.min(elapsed * 5, 1.0) * fbScale;
          fireballRef.current.scale.setScalar(fbS);
          const fbMat = fireballRef.current.material as THREE.MeshBasicMaterial;
          fbMat.color.setHex(elapsed < 0.3 ? flashColor : 0xff4400);
          fbMat.opacity = Math.max(0, 1 - elapsed * 1.5);
        }
      }

      // Ground flash
      if (groundFlashRef.current) {
        groundFlashRef.current.visible = elapsed < 0.4;
        if (elapsed < 0.4) {
          groundFlashRef.current.position.copy(dstPlot);
          groundFlashRef.current.lookAt(0, 0, 0);
          const gfs = Math.min(elapsed * 6, 1.0) * fbScale * 1.5;
          groundFlashRef.current.scale.setScalar(gfs);
          const gfm = groundFlashRef.current
            .material as THREE.MeshBasicMaterial;
          gfm.color.setHex(flashColor);
          gfm.opacity = Math.max(0, 1 - elapsed * 4);
        }
      }

      // Debris sparks
      if (debrisRef.current) {
        debrisRef.current.visible = elapsed < 1.5;
        if (elapsed < 1.5) {
          const dp = debrisPosArr.current;
          const dv = debrisVelArr.current;
          for (let i = 0; i < debrisCount; i++) {
            dp[i * 3] += dv[i * 3] * delta * 0.5;
            dp[i * 3 + 1] += dv[i * 3 + 1] * delta * 0.5;
            dp[i * 3 + 2] += dv[i * 3 + 2] * delta * 0.5;
          }
          const dAttr = debrisRef.current.geometry.getAttribute(
            "position",
          ) as THREE.BufferAttribute;
          (dAttr.array as Float32Array).set(dp);
          dAttr.needsUpdate = true;
          const dbMat = debrisRef.current.material as THREE.PointsMaterial;
          dbMat.color.setHex(flashColor);
          dbMat.opacity = Math.max(0, 1 - elapsed * 0.8);
        }
      }
    }

    // Post-impact -> onComplete after 2s
    if (t >= 1.0 && !completedRef.current) {
      postImpactTimerRef.current += delta;
      if (postImpactTimerRef.current >= 2.0) {
        completedRef.current = true;
        onComplete();
      }
    }
  });

  if (!active) return null;

  const vfxData = vfx;
  const layer1ColorInt = hexColorToInt(vfxData?.layer1Color ?? "#ffffff");
  const layer2ColorInt = hexColorToInt(vfxData?.layer2Color ?? "#dddddd");
  const layer3ColorInt = hexColorToInt(vfxData?.layer3Color ?? "#cccccc");
  const flameCoreInt = hexColorToInt(vfxData?.flameCoreColor ?? "#ffffff");
  const plumeColorInt = hexColorToInt(vfxData?.plumeColor ?? "#ffffff");
  const vaporColorInt = hexColorToInt(vfxData?.vaporConeColor ?? "#aaddff");
  const sdCount = vfxData?.shockDiamondCount ?? 0;
  const mirvCountVal = vfxData?.mirvCount ?? 0;

  // Pre-allocate geometry arrays
  const trail1InitPos = new Float32Array(TRAIL_POINTS * 3);
  const trail2InitPos = new Float32Array(TRAIL_POINTS * 3);
  const trail3InitPos = new Float32Array(TRAIL_POINTS * 3);
  const flameInitPos = new Float32Array(8 * 3);
  const debrisInitPos = new Float32Array(40 * 3);
  const mirvTrailInitPos = new Float32Array(12 * 3);

  return (
    <group>
      {/* Missile body */}
      <mesh ref={missileRef} visible={false}>
        <cylinderGeometry args={[0.004, 0.002, 0.045, 6]} />
        <meshStandardMaterial
          color={0xffffff}
          emissive={0xffffff}
          emissiveIntensity={2.5}
        />
      </mesh>

      {/* Smoke trail Layer 1 — core ribbon */}
      <points ref={trail1Ref} visible={false}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[trail1InitPos, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          color={layer1ColorInt}
          size={vfxData?.layer1Size ?? 0.008}
          transparent
          opacity={vfxData?.layer1Opacity ?? 0.8}
          depthWrite={false}
          sizeAttenuation
        />
      </points>

      {/* Smoke trail Layer 2 — billow */}
      <points ref={trail2Ref} visible={false}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[trail2InitPos, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          color={layer2ColorInt}
          size={vfxData?.layer2Size ?? 0.015}
          transparent
          opacity={vfxData?.layer2Opacity ?? 0.4}
          depthWrite={false}
          sizeAttenuation
        />
      </points>

      {/* Smoke trail Layer 3 — outer haze */}
      <points ref={trail3Ref} visible={false}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[trail3InitPos, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          color={layer3ColorInt}
          size={vfxData?.layer3Size ?? 0.025}
          transparent
          opacity={vfxData?.layer3Opacity ?? 0.12}
          depthWrite={false}
          sizeAttenuation
        />
      </points>

      {/* Launch plume sphere */}
      <mesh ref={plumeRef} visible={false}>
        <sphereGeometry args={[1, 12, 12]} />
        <meshBasicMaterial
          color={plumeColorInt}
          transparent
          opacity={0.7}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Mushroom steam cap (cold launch) */}
      <mesh ref={plumeMushroomRef} visible={false}>
        <sphereGeometry args={[1, 12, 8]} />
        <meshBasicMaterial
          color={plumeColorInt}
          transparent
          opacity={0.45}
          depthWrite={false}
        />
      </mesh>

      {/* Ground scorch (hot launch) */}
      <mesh ref={scorchRef} visible={false}>
        <circleGeometry args={[1, 16]} />
        <meshBasicMaterial
          color={0x111111}
          transparent
          opacity={0.6}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Exhaust flame core */}
      <points ref={flameRef} visible={false}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[flameInitPos, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          color={flameCoreInt}
          size={0.007}
          transparent
          opacity={0.95}
          depthWrite={false}
          sizeAttenuation
          blending={THREE.AdditiveBlending}
        />
      </points>

      {/* Shock diamonds */}
      {Array.from({ length: sdCount }, (_, i) => (
        <mesh
          // biome-ignore lint/suspicious/noArrayIndexKey: stable fixed-length VFX array
          key={`sd-${i}`}
          visible={false}
          ref={(el) => {
            shockDiamondRefs.current[i] = el;
          }}
        >
          <sphereGeometry args={[0.003, 6, 6]} />
          <meshBasicMaterial
            color={hexColorToInt(vfxData?.flameCoreColor ?? "#ffffff")}
            transparent
            opacity={0.9}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      ))}

      {/* Vapor cone */}
      {vfxData?.vaporConeEnabled && (
        <mesh ref={vaporConeRef} visible={false}>
          <coneGeometry args={[0.025, 0.08, 16, 1, true]} />
          <meshBasicMaterial
            color={vaporColorInt}
            transparent
            opacity={0.3}
            depthWrite={false}
            side={THREE.DoubleSide}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      )}

      {/* MIRV sub-missiles */}
      {mirvCountVal > 0 &&
        Array.from({ length: MIRV_COUNT }, (_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: stable fixed-length VFX array
          <group key={`mirv-${i}`}>
            <mesh
              visible={false}
              ref={(el) => {
                mirvRefs.current[i] = el;
              }}
            >
              <cylinderGeometry args={[0.002, 0.001, 0.02, 4]} />
              <meshBasicMaterial color={0xff4400} transparent={false} />
            </mesh>
            <points
              visible={false}
              ref={(el: THREE.Points | null) => {
                mirvTrailRefs.current[i] = el;
              }}
            >
              <bufferGeometry>
                <bufferAttribute
                  attach="attributes-position"
                  args={[mirvTrailInitPos.slice(), 3]}
                />
              </bufferGeometry>
              <pointsMaterial
                color={0xff6600}
                size={0.005}
                transparent
                opacity={0.8}
                depthWrite={false}
                sizeAttenuation
                blending={THREE.AdditiveBlending}
              />
            </points>
          </group>
        ))}

      {/* Impact — Shockwave ring */}
      <mesh ref={shockwaveRef} visible={false}>
        <torusGeometry args={[0.04, 0.004, 6, 32]} />
        <meshBasicMaterial
          color={0xff4400}
          transparent
          opacity={1}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Impact — Fireball */}
      <mesh ref={fireballRef} visible={false}>
        <sphereGeometry args={[1, 12, 12]} />
        <meshBasicMaterial
          color={0xff4400}
          transparent
          opacity={1}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Impact — Ground flash */}
      <mesh ref={groundFlashRef} visible={false}>
        <circleGeometry args={[1, 16]} />
        <meshBasicMaterial
          color={0xffffff}
          transparent
          opacity={1}
          depthWrite={false}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Impact — Debris sparks */}
      <points ref={debrisRef} visible={false}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[debrisInitPos, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          color={0xffffff}
          size={0.006}
          transparent
          opacity={1}
          depthWrite={false}
          sizeAttenuation
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  );
}

interface CameraAnimatorProps {
  controlsRef: React.MutableRefObject<any>;
}

function CameraAnimator({ controlsRef }: CameraAnimatorProps) {
  const { camera } = useThree();
  const selectedPlotId = useGameStore((s) => s.selectedPlotId);
  const plots = useGameStore((s) => s.plots);

  const targetPosRef = useRef<THREE.Vector3 | null>(null);
  const prevPlotIdRef = useRef<number | null>(null);
  const animatingRef = useRef(false);

  if (selectedPlotId !== prevPlotIdRef.current) {
    prevPlotIdRef.current = selectedPlotId;
    if (selectedPlotId !== null && plots[selectedPlotId]) {
      const plot = plots[selectedPlotId];
      const dir = latLngToXYZ(plot.lat, plot.lng, 1.0).normalize();
      targetPosRef.current = dir.multiplyScalar(2.0);
      animatingRef.current = true;
      if (controlsRef.current) {
        controlsRef.current.autoRotate = false;
      }
    }
  }

  useFrame((_, delta) => {
    if (!animatingRef.current || !targetPosRef.current) return;

    const target = targetPosRef.current;
    const speed = 3 * delta;
    camera.position.lerp(target, speed);

    if (controlsRef.current) {
      controlsRef.current.update();
    }

    if (camera.position.distanceTo(target) < 0.005) {
      camera.position.copy(target);
      animatingRef.current = false;
    }
  });

  return null;
}

interface SceneProps {
  controlsRef: React.MutableRefObject<any>;
  missileActive: boolean;
  onMissileComplete: () => void;
  missileConfig?: MissileConfig;
}

function GlobeScene({
  controlsRef,
  missileActive,
  onMissileComplete,
  missileConfig,
}: SceneProps) {
  return (
    <>
      <ambientLight color={0x223344} intensity={0.8} />
      <directionalLight color={0xffffff} intensity={1.5} position={[5, 3, 5]} />
      <directionalLight
        color={0x1144aa}
        intensity={0.3}
        position={[-3, -1, -2]}
      />

      <Suspense fallback={null}>
        <Starfield />
        <EarthSphere />
      </Suspense>

      <OrbitControls
        ref={controlsRef}
        enableDamping
        dampingFactor={0.05}
        minDistance={1.5}
        maxDistance={5}
        autoRotate
        autoRotateSpeed={0.2}
      />

      <CameraAnimator controlsRef={controlsRef} />

      <MissileAnimation
        active={missileActive}
        onComplete={onMissileComplete}
        missileConfig={missileConfig}
      />
    </>
  );
}

interface GlobeCanvasProps {
  controlsRef: React.MutableRefObject<any>;
  missileActive?: boolean;
  onMissileComplete?: () => void;
  missileConfig?: MissileConfig;
}

export default function GlobeCanvas({
  controlsRef,
  missileActive = false,
  onMissileComplete = () => {},
  missileConfig,
}: GlobeCanvasProps) {
  return (
    <Canvas
      camera={{ fov: 60, position: [0, 0, 2.8], near: 0.1, far: 200 }}
      gl={{ antialias: true, alpha: false }}
      style={{ background: "#020509", touchAction: "none" }}
    >
      <GlobeScene
        controlsRef={controlsRef}
        missileActive={missileActive}
        onMissileComplete={onMissileComplete}
        missileConfig={missileConfig}
      />
    </Canvas>
  );
}
