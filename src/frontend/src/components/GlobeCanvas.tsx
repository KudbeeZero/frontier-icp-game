import { OrbitControls, useTexture } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import type React from "react";
import { Suspense, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { MissileConfig } from "../constants/missiles";
import { useGameStore } from "../store/gameStore";
import {
  GEODESIC_TILES,
  PLOT_POSITION_CACHE,
  findNearestTile,
} from "../utils/geodesicGrid";

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
// Hex tile geometry — flat hexagon in XZ plane, Y = outward normal
// ---------------------------------------------------------------------------
const HEX_R = 0.021;
function makeHexGeometry(): THREE.BufferGeometry {
  const positions = new Float32Array(6 * 3 * 3);
  let idx = 0;
  for (let i = 0; i < 6; i++) {
    const a0 = (i / 6) * Math.PI * 2;
    const a1 = ((i + 1) / 6) * Math.PI * 2;
    positions[idx++] = 0;
    positions[idx++] = 0;
    positions[idx++] = 0;
    positions[idx++] = Math.cos(a0) * HEX_R;
    positions[idx++] = 0;
    positions[idx++] = Math.sin(a0) * HEX_R;
    positions[idx++] = Math.cos(a1) * HEX_R;
    positions[idx++] = 0;
    positions[idx++] = Math.sin(a1) * HEX_R;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.computeVertexNormals();
  return geo;
}

// Ring outline geometry for selection — hexagonal ring
function makeHexRingGeometry(
  inner: number,
  outer: number,
): THREE.BufferGeometry {
  const positions: number[] = [];
  for (let i = 0; i < 6; i++) {
    const a0 = (i / 6) * Math.PI * 2;
    const a1 = ((i + 1) / 6) * Math.PI * 2;
    const ix0 = Math.cos(a0) * inner;
    const iz0 = Math.sin(a0) * inner;
    const ix1 = Math.cos(a1) * inner;
    const iz1 = Math.sin(a1) * inner;
    const ox0 = Math.cos(a0) * outer;
    const oz0 = Math.sin(a0) * outer;
    const ox1 = Math.cos(a1) * outer;
    const oz1 = Math.sin(a1) * outer;
    // two triangles per segment
    positions.push(ix0, 0, iz0, ox0, 0, oz0, ix1, 0, iz1);
    positions.push(ox0, 0, oz0, ox1, 0, oz1, ix1, 0, iz1);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute(
    "position",
    new THREE.BufferAttribute(new Float32Array(positions), 3),
  );
  geo.computeVertexNormals();
  return geo;
}

const HEX_GEO = makeHexGeometry();
const HEX_RING_GEO = makeHexRingGeometry(HEX_R * 0.78, HEX_R * 1.22);

// Pre-allocated scratch objects
const _mat4 = new THREE.Matrix4();
const _quat = new THREE.Quaternion();
const _pos = new THREE.Vector3();
const _Y = new THREE.Vector3(0, 1, 0);

// State colours
const COL_BASE = new THREE.Color(0.05, 0.07, 0.07);
const COL_OWNED = new THREE.Color(0.45, 1.0, 0.8);
const COL_HOVER = new THREE.Color(1.0, 1.0, 1.0);
const COL_SELECTED = new THREE.Color(1.0, 1.0, 1.0);
const COL_FACTION: Record<string, THREE.Color> = {
  "NEXUS-7": new THREE.Color(0xef4444),
  KRONOS: new THREE.Color(0x8b5cf6),
  VANGUARD: new THREE.Color(0x22c3c9),
  SPECTRE: new THREE.Color(0xf59e0b),
};

// ---------------------------------------------------------------------------
// GlobeHexGrid — single InstancedMesh draw call for all ~10k tiles
// ---------------------------------------------------------------------------
function GlobeHexGrid() {
  const plots = useGameStore((s) => s.plots);
  const hoveredId = useGameStore((s) => s.hoveredPlotId);
  const selectedId = useGameStore((s) => s.selectedPlotId);
  const ownedPlots = useGameStore((s) => s.player.plotsOwned);
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const { camera } = useThree();
  const count = plots.length;

  // One-time matrix setup — use GEODESIC_TILES directly (no lat/lng conversion)
  // biome-ignore lint/correctness/useExhaustiveDependencies: runs once; tiles are static
  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    for (let i = 0; i < count; i++) {
      const tile = GEODESIC_TILES[i];
      if (!tile) continue;
      _pos.set(tile.nx, tile.ny, tile.nz);
      _quat.setFromUnitVectors(_Y, _pos);
      _mat4.makeRotationFromQuaternion(_quat);
      _mat4.setPosition(_pos.clone().multiplyScalar(1.001));
      mesh.setMatrixAt(i, _mat4);
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
  }, []);

  // Colour updates
  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    for (let i = 0; i < count; i++) mesh.setColorAt(i, COL_BASE);
    for (const p of plots) {
      if (p.owner && COL_FACTION[p.owner])
        mesh.setColorAt(p.id, COL_FACTION[p.owner]);
    }
    for (const pid of ownedPlots) {
      if (pid >= 0 && pid < count) mesh.setColorAt(pid, COL_OWNED);
    }
    if (hoveredId !== null && hoveredId >= 0 && hoveredId < count) {
      mesh.setColorAt(hoveredId, COL_HOVER);
    }
    if (selectedId !== null && selectedId >= 0 && selectedId < count) {
      mesh.setColorAt(selectedId, COL_SELECTED);
    }
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [plots, hoveredId, selectedId, ownedPlots, count]);

  // Distance-based opacity fade (tiles — not the selection ring)
  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const dist = camera.position.length();
    const mat = mesh.material as THREE.MeshBasicMaterial;
    mat.opacity = THREE.MathUtils.clamp(
      THREE.MathUtils.mapLinear(dist, 1.4, 2.5, 0.35, 0.06),
      0.04,
      0.38,
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
        opacity={0.35}
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </instancedMesh>
  );
}

// ---------------------------------------------------------------------------
// SelectedTileHighlight — bright hexagonal ring at the selected tile
// Always full opacity regardless of camera distance.
// ---------------------------------------------------------------------------
const _selY = new THREE.Vector3(0, 1, 0);
const _selPos = new THREE.Vector3();
const _selQ = new THREE.Quaternion();

function SelectedTileHighlight() {
  const selectedId = useGameStore((s) => s.selectedPlotId);
  const hoveredId = useGameStore((s) => s.hoveredPlotId);

  const selMeshRef = useRef<THREE.Mesh>(null);
  const hoverMeshRef = useRef<THREE.Mesh>(null);

  function positionAt(mesh: THREE.Mesh, plotId: number) {
    const tile = GEODESIC_TILES[plotId];
    if (!tile) {
      mesh.visible = false;
      return;
    }
    _selPos.set(tile.nx, tile.ny, tile.nz);
    _selQ.setFromUnitVectors(_selY, _selPos);
    mesh.quaternion.copy(_selQ);
    mesh.position.copy(_selPos).multiplyScalar(1.003);
    mesh.visible = true;
  }

  // Update selection ring
  useEffect(() => {
    const mesh = selMeshRef.current;
    if (!mesh) return;
    if (selectedId !== null) positionAt(mesh, selectedId);
    else mesh.visible = false;
  });

  // Update hover ring
  useEffect(() => {
    const mesh = hoverMeshRef.current;
    if (!mesh) return;
    if (hoveredId !== null && hoveredId !== selectedId)
      positionAt(mesh, hoveredId);
    else mesh.visible = false;
  });

  // Pulse animation on selection ring
  useFrame(({ clock }) => {
    const mesh = selMeshRef.current;
    if (!mesh || !mesh.visible) return;
    const mat = mesh.material as THREE.MeshBasicMaterial;
    mat.opacity = 0.75 + Math.sin(clock.getElapsedTime() * 4) * 0.2;
  });

  return (
    <>
      {/* Selection ring — pulsing bright cyan */}
      <mesh ref={selMeshRef} visible={false} geometry={HEX_RING_GEO}>
        <meshBasicMaterial
          color={0xffffff}
          transparent
          opacity={0.9}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Hover ring — gold, no pulse */}
      <mesh ref={hoverMeshRef} visible={false} geometry={HEX_RING_GEO}>
        <meshBasicMaterial
          color={0xcccccc}
          transparent
          opacity={0.5}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
    </>
  );
}

// ---------------------------------------------------------------------------
// Atmosphere shaders
// ---------------------------------------------------------------------------
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
    float intensity = pow(0.65 - dot(vNormal, vec3(0.0,0.0,1.0)), 3.0);
    intensity = clamp(intensity, 0.0, 1.0);
    gl_FragColor = vec4(glowColor * intensity, intensity * 0.8);
  }
`;

// ---------------------------------------------------------------------------
// Day/Night Earth shaders — world-space normals so sun stays fixed
// ---------------------------------------------------------------------------
const earthDayNightVert = /* glsl */ `
  varying vec3 vWorldNormal;
  varying vec2 vUv;
  void main() {
    vWorldNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const earthDayNightFrag = /* glsl */ `
  uniform sampler2D dayMap;
  varying vec2 vUv;
  void main() {
    gl_FragColor = texture2D(dayMap, vUv);
  }
`;

// ---------------------------------------------------------------------------
// EarthSphere — globe mesh + hex grid + click handling
// ---------------------------------------------------------------------------
function EarthSphere() {
  const [dayTex, cloudsTex] = useTexture([
    "/assets/generated/earth-day.dim_4096x2048.jpg",
    "/assets/generated/earth-clouds.dim_2048x1024.jpg",
  ]);
  const globeRef = useRef<THREE.Group>(null);
  const cloudsRef = useRef<THREE.Mesh>(null);

  const selectPlot = useGameStore((s) => s.selectPlot);
  const setSelectedWorldPoint = useGameStore((s) => s.setSelectedWorldPoint);
  const setHoveredPlotId = useGameStore((s) => s.setHoveredPlotId);
  const compareModeActive = useGameStore((s) => s.compareModeActive);
  const setComparePlotId = useGameStore((s) => s.setComparePlotId);
  // setCompareModeActive available via store if needed
  const lastMoveTime = useRef(0);

  const atmosphereUniforms = useMemo(
    () => ({ glowColor: { value: new THREE.Color(0.1, 0.5, 1.0) } }),
    [],
  );

  const earthUniforms = useMemo(
    () => ({
      dayMap: { value: dayTex },
    }),
    [dayTex],
  );

  useFrame(() => {
    if (globeRef.current) globeRef.current.rotation.y += 0.0001;
    if (cloudsRef.current) cloudsRef.current.rotation.y += 0.0003;
  });

  /**
   * findNearestPlot
   * ───────────────
   * 1. Transform world-space hit into the GLOBE GROUP's local space.
   *    Critical: globe rotates continuously — raw world point maps to wrong tile.
   * 2. Normalize to unit sphere direction.
   * 3. Max-dot-product search over pre-built cache (~0.05 ms, O(n)).
   */
  function findNearestPlot(worldPoint: THREE.Vector3): number {
    const local = worldPoint.clone();
    if (globeRef.current) globeRef.current.worldToLocal(local);
    const len = local.length();
    if (len < 1e-9) return 0;
    local.divideScalar(len);
    return findNearestTile(local.x, local.y, local.z, PLOT_POSITION_CACHE);
  }

  const handleClick = (e: any) => {
    e.stopPropagation();
    const nearest = findNearestPlot(e.point);
    if (compareModeActive) {
      // In compare mode: set the compare plot and exit compare mode selection
      setComparePlotId(nearest);
      return;
    }
    selectPlot(nearest);
    // Store the actual world-space click direction × orbit distance.
    // CameraAnimator uses this directly — no lat/lng recomputation needed,
    // so the globe rotation is already baked in.
    const dir = e.point.clone().normalize().multiplyScalar(2.0);
    setSelectedWorldPoint([dir.x, dir.y, dir.z]);
  };

  const handlePointerMove = (e: any) => {
    const now = performance.now();
    if (now - lastMoveTime.current < 50) return;
    lastMoveTime.current = now;
    setHoveredPlotId(findNearestPlot(e.point));
  };

  const handlePointerLeave = () => setHoveredPlotId(null);

  return (
    <group ref={globeRef}>
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: 3D canvas mesh */}
      <mesh
        onClick={handleClick}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
      >
        <sphereGeometry args={[1, 64, 64]} />
        <shaderMaterial
          vertexShader={earthDayNightVert}
          fragmentShader={earthDayNightFrag}
          uniforms={earthUniforms}
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
      <SelectedTileHighlight />
    </group>
  );
}

// ---------------------------------------------------------------------------
// Starfield
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Missile helpers
// ---------------------------------------------------------------------------
function bezierPoint(
  p0: THREE.Vector3,
  p1: THREE.Vector3,
  p2: THREE.Vector3,
  t: number,
): THREE.Vector3 {
  return p0.clone().lerp(p1, t).lerp(p1.clone().lerp(p2, t), t);
}
function hexColorToInt(hex: string): number {
  return Number.parseInt(hex.replace("#", ""), 16);
}

const _scratchVec = new THREE.Vector3();
const _scratchVec2 = new THREE.Vector3();

interface MissileProps {
  active: boolean;
  onComplete: () => void;
  missileConfig?: MissileConfig;
}

function MissileAnimation({ active, onComplete, missileConfig }: MissileProps) {
  const progressRef = useRef(0);
  const completedRef = useRef(false);
  const postImpactTimerRef = useRef(0);
  const impactStartRef = useRef(0);
  const plumeStartRef = useRef(0);

  const missileRef = useRef<THREE.Mesh>(null);

  const TRAIL_POINTS = 30;
  const trail1Ref = useRef<THREE.Points>(null);
  const trail2Ref = useRef<THREE.Points>(null);
  const trail3Ref = useRef<THREE.Points>(null);
  const trail1Pos = useRef(new Float32Array(TRAIL_POINTS * 3));
  const trail2Pos = useRef(new Float32Array(TRAIL_POINTS * 3));
  const trail3Pos = useRef(new Float32Array(TRAIL_POINTS * 3));
  const trailWriteIdx = useRef(0);
  const trailFilled = useRef(false);

  const plumeRef = useRef<THREE.Mesh>(null);
  const plumeMushroomRef = useRef<THREE.Mesh>(null);
  const scorchRef = useRef<THREE.Mesh>(null);
  const flameRef = useRef<THREE.Points>(null);
  const flamePosArr = useRef(new Float32Array(8 * 3));
  const shockDiamondRefs = useRef<(THREE.Mesh | null)[]>([]);
  const vaporConeRef = useRef<THREE.Mesh>(null);

  const MIRV_COUNT = 5;
  const mirvRefs = useRef<(THREE.Mesh | null)[]>([]);
  const mirvTrailRefs = useRef<(THREE.Points | null)[]>([]);
  const mirvTrailPos = useRef<Float32Array[]>(
    Array.from({ length: MIRV_COUNT }, () => new Float32Array(12 * 3)),
  );

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

  const ctrlPt = useMemo(() => {
    const mid = srcPlot.clone().lerp(dstPlot, 0.5).normalize();
    return mid.multiplyScalar(1 + arcHeight);
  }, [srcPlot, dstPlot, arcHeight]);

  const diveCtrlPt = useMemo(() => {
    if (trajectory === "top-attack")
      return ctrlPt.clone().lerp(dstPlot, 0.5).normalize().multiplyScalar(1.6);
    return ctrlPt;
  }, [ctrlPt, dstPlot, trajectory]);

  const vertPopCtrl = useMemo(() => {
    if (trajectory === "vertical-pop")
      return srcPlot
        .clone()
        .normalize()
        .multiplyScalar(1 + arcHeight);
    return ctrlPt;
  }, [srcPlot, ctrlPt, arcHeight, trajectory]);

  const mirvTargets = useMemo(() => {
    const targets: THREE.Vector3[] = [];
    for (let i = 0; i < MIRV_COUNT; i++) {
      const angle = (i / MIRV_COUNT) * Math.PI * 2;
      targets.push(
        dstPlot
          .clone()
          .add(
            new THREE.Vector3(
              Math.cos(angle) * 0.04,
              Math.sin(angle) * 0.02,
              Math.sin(angle) * 0.04,
            ),
          )
          .normalize(),
      );
    }
    return targets;
  }, [dstPlot]);

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
      if (t < 0.5) return bezierPoint(srcPlot, ctrlPt, diveCtrlPt, t * 2);
      return bezierPoint(
        diveCtrlPt,
        dstPlot.clone().lerp(diveCtrlPt, 0.1),
        dstPlot,
        (t - 0.5) * 2,
      );
    }
    if (trajectory === "vertical-pop") {
      if (t < 0.2)
        return bezierPoint(srcPlot, vertPopCtrl, vertPopCtrl, t / 0.2);
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
      for (const sd of shockDiamondRefs.current) if (sd) sd.visible = false;
      return;
    }

    const t = progressRef.current;
    const clock = state.clock.getElapsedTime();
    const baseSpeed = speedMultiplier / 6.0;
    let speed =
      t < 0.8 ? baseSpeed : t < 0.95 ? 0.2 * baseSpeed : 1.5 * baseSpeed;
    if (t < 1.0) progressRef.current = Math.min(t + delta * speed, 1.0);

    const pos = getMissilePosition(t);

    // Launch plume
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
        const sc =
          Math.min(elapsed * (isHot ? 8 : 3), 1.0) *
          plumeScale *
          (isHot ? 0.08 : 0.1);
        plumeRef.current.scale.setScalar(sc);
        (plumeRef.current.material as THREE.MeshBasicMaterial).opacity =
          plumeAlpha * (isHot ? 0.9 : 0.7);
      }
      if (plumeMushroomRef.current) {
        plumeMushroomRef.current.visible = !isHot;
        if (!isHot) {
          plumeMushroomRef.current.position.copy(
            srcPlot.clone().multiplyScalar(1.03),
          );
          const msc = Math.min(elapsed * 2.5, 1.0) * plumeScale * 0.14;
          plumeMushroomRef.current.scale.set(msc, msc * 0.4, msc);
          (
            plumeMushroomRef.current.material as THREE.MeshBasicMaterial
          ).opacity = plumeAlpha * 0.5;
        }
      }
      if (scorchRef.current) {
        scorchRef.current.visible = isHot;
        if (isHot) {
          scorchRef.current.position.copy(srcPlot);
          scorchRef.current.lookAt(0, 0, 0);
          scorchRef.current.scale.setScalar(Math.min(elapsed * 4, 1.0) * 0.06);
          (scorchRef.current.material as THREE.MeshBasicMaterial).opacity =
            Math.max(0, 0.6 - elapsed * 0.2);
        }
      }
    } else {
      if (plumeRef.current) {
        const elapsed =
          plumeStartRef.current > 0 ? clock - plumeStartRef.current : 999;
        const lingerSec = vfx?.plumeLingerSeconds ?? 2;
        if (elapsed > lingerSec) {
          plumeRef.current.visible = false;
          if (plumeMushroomRef.current)
            plumeMushroomRef.current.visible = false;
        } else
          (plumeRef.current.material as THREE.MeshBasicMaterial).opacity =
            Math.max(0, 1 - elapsed / lingerSec) * 0.5;
      }
      if (scorchRef.current) scorchRef.current.visible = false;
    }

    // Missile body
    if (t < 0.95 && missileRef.current) {
      missileRef.current.visible = true;
      missileRef.current.position.copy(pos);
      const nextPos = getMissilePosition(Math.min(t + 0.005, 1.0));
      _scratchVec.subVectors(nextPos, pos).normalize();
      missileRef.current.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        _scratchVec,
      );
      (
        missileRef.current.material as THREE.MeshStandardMaterial
      ).emissiveIntensity = t > 0.8 ? 2.0 + (t - 0.8) * 30 : 2.5;
    } else if (missileRef.current) missileRef.current.visible = false;

    // Exhaust flame + shock diamonds
    if (t < 0.95 && t > 0.01) {
      if (flameRef.current) {
        flameRef.current.visible = true;
        const fl = vfx?.flameLength ?? 0.05;
        const nextPos = getMissilePosition(Math.min(t + 0.002, 1.0));
        _scratchVec2.subVectors(pos, nextPos).normalize();
        for (let i = 0; i < 8; i++) {
          const frac = i / 7;
          flamePosArr.current[i * 3] =
            pos.x + _scratchVec2.x * fl * frac + (Math.random() - 0.5) * 0.002;
          flamePosArr.current[i * 3 + 1] =
            pos.y + _scratchVec2.y * fl * frac + (Math.random() - 0.5) * 0.002;
          flamePosArr.current[i * 3 + 2] =
            pos.z + _scratchVec2.z * fl * frac + (Math.random() - 0.5) * 0.002;
        }
        const fAttr = flameRef.current.geometry.getAttribute(
          "position",
        ) as THREE.BufferAttribute;
        (fAttr.array as Float32Array).set(flamePosArr.current);
        fAttr.needsUpdate = true;
      }
      if (vfx?.shockDiamondsEnabled) {
        const sdCount = vfx.shockDiamondCount;
        const fl = vfx.flameLength;
        const nextPos = getMissilePosition(Math.min(t + 0.002, 1.0));
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
            (sd.material as THREE.MeshBasicMaterial).opacity =
              (Math.sin(clock * 20 + i * 1.3) * 0.5 + 0.5) * 0.9;
          }
        }
      }
    } else {
      if (flameRef.current) flameRef.current.visible = false;
      for (const sd of shockDiamondRefs.current) if (sd) sd.visible = false;
    }

    // Smoke trail
    if (t > 0.01 && t < 0.98) {
      const wIdx = trailWriteIdx.current;
      const spiral = vfx?.trailSpiral ?? false;
      const spiralFreq = vfx?.trailSpiralFreq ?? 0;
      const billow = vfx?.layer2BillowFactor ?? 0.006;
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
      const setTrail = (
        ref: React.MutableRefObject<THREE.Points | null>,
        buf: Float32Array,
        opacity: number,
      ) => {
        if (!ref.current) return;
        ref.current.visible = true;
        const a = ref.current.geometry.getAttribute(
          "position",
        ) as THREE.BufferAttribute;
        (a.array as Float32Array).set(buf);
        a.needsUpdate = true;
        (ref.current.material as THREE.PointsMaterial).opacity =
          opacity * (1 - t * 0.3);
      };
      setTrail(trail1Ref, trail1Pos.current, vfx?.layer1Opacity ?? 0.8);
      setTrail(trail2Ref, trail2Pos.current, vfx?.layer2Opacity ?? 0.4);
      setTrail(
        trail3Ref,
        trail3Pos.current,
        ((vfx?.layer3Opacity ?? 0.15) * (1 - t * 0.4)) / (1 - t * 0.3 + 0.001),
      );
    } else if (t >= 0.98) {
      if (trail1Ref.current) trail1Ref.current.visible = false;
      if (trail2Ref.current) trail2Ref.current.visible = false;
      if (trail3Ref.current) trail3Ref.current.visible = false;
    }

    // Vapor cone
    if (vfx?.vaporConeEnabled && speedMultiplier >= 3 && t > 0.05 && t < 0.95) {
      if (vaporConeRef.current) {
        vaporConeRef.current.visible = true;
        vaporConeRef.current.position.copy(pos);
        vaporConeRef.current.lookAt(
          getMissilePosition(Math.min(t + 0.01, 1.0)),
        );
        (vaporConeRef.current.material as THREE.MeshBasicMaterial).opacity =
          0.25 + Math.sin(clock * 15) * 0.05;
      }
    } else if (vaporConeRef.current) vaporConeRef.current.visible = false;

    // MIRV fan
    const mirvCount = vfx?.mirvCount ?? 0;
    if (mirvCount > 0 && t >= 0.85 && t < 0.98) {
      for (let i = 0; i < MIRV_COUNT; i++) {
        const mirvMesh = mirvRefs.current[i];
        const mirvTrail = mirvTrailRefs.current[i];
        if (!mirvMesh || !mirvTrail) continue;
        const mirvT = (t - 0.85) / 0.13;
        const mt = mirvTargets[i];
        const peak = dstPlot
          .clone()
          .lerp(mt, 0.5)
          .normalize()
          .multiplyScalar(1.2);
        const mirvPos = bezierPoint(dstPlot, peak, mt, Math.min(mirvT, 1.0));
        mirvMesh.visible = true;
        mirvMesh.position.copy(mirvPos);
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

    // Impact
    if (t >= 0.95) {
      if (missileRef.current) missileRef.current.visible = false;
      if (flameRef.current) flameRef.current.visible = false;
      if (vaporConeRef.current) vaporConeRef.current.visible = false;
      if (impactStartRef.current === 0) {
        impactStartRef.current = clock;
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
      if (shockwaveRef.current) {
        shockwaveRef.current.visible = elapsed < 1.2;
        if (elapsed < 1.2) {
          shockwaveRef.current.position.copy(dstPlot);
          shockwaveRef.current.lookAt(0, 0, 0);
          shockwaveRef.current.scale.setScalar(Math.min(elapsed * 4, 4.0));
          const m = shockwaveRef.current.material as THREE.MeshBasicMaterial;
          m.color.setHex(swColor);
          m.opacity = Math.max(0, 1 - elapsed * 1.2);
        }
      }
      if (fireballRef.current) {
        fireballRef.current.visible = elapsed < 1.0;
        if (elapsed < 1.0) {
          fireballRef.current.position.copy(dstPlot);
          fireballRef.current.scale.setScalar(
            Math.min(elapsed * 5, 1.0) * fbScale,
          );
          const m = fireballRef.current.material as THREE.MeshBasicMaterial;
          m.color.setHex(elapsed < 0.3 ? flashColor : 0xff4400);
          m.opacity = Math.max(0, 1 - elapsed * 1.5);
        }
      }
      if (groundFlashRef.current) {
        groundFlashRef.current.visible = elapsed < 0.4;
        if (elapsed < 0.4) {
          groundFlashRef.current.position.copy(dstPlot);
          groundFlashRef.current.lookAt(0, 0, 0);
          groundFlashRef.current.scale.setScalar(
            Math.min(elapsed * 6, 1.0) * fbScale * 1.5,
          );
          const m = groundFlashRef.current.material as THREE.MeshBasicMaterial;
          m.color.setHex(flashColor);
          m.opacity = Math.max(0, 1 - elapsed * 4);
        }
      }
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
          (dAttr.array as Float32Array).set(debrisPosArr.current);
          dAttr.needsUpdate = true;
          const m = debrisRef.current.material as THREE.PointsMaterial;
          m.color.setHex(flashColor);
          m.opacity = Math.max(0, 1 - elapsed * 0.8);
        }
      }
    }

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

  const trail1InitPos = new Float32Array(TRAIL_POINTS * 3);
  const trail2InitPos = new Float32Array(TRAIL_POINTS * 3);
  const trail3InitPos = new Float32Array(TRAIL_POINTS * 3);
  const flameInitPos = new Float32Array(8 * 3);
  const debrisInitPos = new Float32Array(40 * 3);
  const mirvTrailInitPos = new Float32Array(12 * 3);

  return (
    <group>
      <mesh ref={missileRef} visible={false}>
        <cylinderGeometry args={[0.004, 0.002, 0.045, 6]} />
        <meshStandardMaterial
          color={0xffffff}
          emissive={0xffffff}
          emissiveIntensity={2.5}
        />
      </mesh>
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
      <mesh ref={plumeMushroomRef} visible={false}>
        <sphereGeometry args={[1, 12, 8]} />
        <meshBasicMaterial
          color={plumeColorInt}
          transparent
          opacity={0.45}
          depthWrite={false}
        />
      </mesh>
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
      {mirvCountVal > 0 &&
        Array.from({ length: MIRV_COUNT }, (_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: stable VFX array
          <group key={`mirv-${i}`}>
            <mesh
              visible={false}
              ref={(el) => {
                mirvRefs.current[i] = el;
              }}
            >
              <cylinderGeometry args={[0.002, 0.001, 0.02, 4]} />
              <meshBasicMaterial color={0xff4400} />
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

// ---------------------------------------------------------------------------
// CameraAnimator — moves camera to face the clicked tile
// Uses world-space click point from store, NOT lat/lng recomputation.
// This is the critical fix: lat/lng → world space ignores globe rotation.
// ---------------------------------------------------------------------------
interface CameraAnimatorProps {
  controlsRef: React.MutableRefObject<any>;
}

function CameraAnimator({ controlsRef }: CameraAnimatorProps) {
  const { camera } = useThree();
  const selectedWorldPoint = useGameStore((s) => s.selectedWorldPoint);
  const targetPosRef = useRef<THREE.Vector3 | null>(null);
  const prevWorldPointRef = useRef<[number, number, number] | null>(null);
  const animatingRef = useRef(false);

  // Detect change
  if (selectedWorldPoint !== prevWorldPointRef.current) {
    prevWorldPointRef.current = selectedWorldPoint;
    if (selectedWorldPoint) {
      targetPosRef.current = new THREE.Vector3(...selectedWorldPoint);
      animatingRef.current = true;
      if (controlsRef.current) controlsRef.current.autoRotate = false;
    }
  }

  useFrame((_, delta) => {
    if (!animatingRef.current || !targetPosRef.current) return;
    camera.position.lerp(targetPosRef.current, 3 * delta);
    if (controlsRef.current) controlsRef.current.update();
    if (camera.position.distanceTo(targetPosRef.current) < 0.005) {
      camera.position.copy(targetPosRef.current);
      animatingRef.current = false;
    }
  });

  return null;
}

// ---------------------------------------------------------------------------
// Scene + Canvas
// ---------------------------------------------------------------------------
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
      <ambientLight color={0xffffff} intensity={2.5} />
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
