import { OrbitControls, useTexture } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Suspense, useMemo, useRef } from "react";
import * as THREE from "three";
import { useGameStore } from "../store/gameStore";

function latLngToXYZ(lat: number, lng: number, r: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(theta),
  );
}

function getHexCorners(center: THREE.Vector3, radius: number): THREE.Vector3[] {
  const up = center.clone().normalize();
  let right = new THREE.Vector3(0, 1, 0).cross(up).normalize();
  if (right.lengthSq() < 0.001) right = new THREE.Vector3(1, 0, 0);
  const fwd = up.clone().cross(right).normalize();
  const corners: THREE.Vector3[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    corners.push(
      center
        .clone()
        .add(right.clone().multiplyScalar(Math.cos(angle) * radius))
        .add(fwd.clone().multiplyScalar(Math.sin(angle) * radius))
        .normalize(),
    );
  }
  return corners;
}

function buildFilledHexGeometry(
  plotId: number,
  plots: ReturnType<typeof useGameStore.getState>["plots"],
): THREE.BufferGeometry {
  const HEX_RADIUS = 0.018;
  const plot = plots[plotId];
  const center = latLngToXYZ(plot.lat, plot.lng, 1.002);
  const corners = getHexCorners(center, HEX_RADIUS);
  // Triangle fan: 6 triangles
  const positions = new Float32Array(6 * 3 * 3);
  let idx = 0;
  for (let i = 0; i < 6; i++) {
    const a = corners[i];
    const b = corners[(i + 1) % 6];
    positions[idx++] = center.x;
    positions[idx++] = center.y;
    positions[idx++] = center.z;
    positions[idx++] = a.x;
    positions[idx++] = a.y;
    positions[idx++] = a.z;
    positions[idx++] = b.x;
    positions[idx++] = b.y;
    positions[idx++] = b.z;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  return geo;
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

function HexGrid() {
  const plots = useGameStore((s) => s.plots);
  const { camera } = useThree();
  const lineRef = useRef<THREE.LineSegments>(null);

  const geometry = useMemo(() => {
    const HEX_RADIUS = 0.018;
    const positions = new Float32Array(plots.length * 6 * 2 * 3);
    let idx = 0;
    for (const plot of plots) {
      const center = latLngToXYZ(plot.lat, plot.lng, 1.001);
      const corners = getHexCorners(center, HEX_RADIUS);
      for (let e = 0; e < 6; e++) {
        const a = corners[e];
        const b = corners[(e + 1) % 6];
        positions[idx++] = a.x;
        positions[idx++] = a.y;
        positions[idx++] = a.z;
        positions[idx++] = b.x;
        positions[idx++] = b.y;
        positions[idx++] = b.z;
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return geo;
  }, [plots]);

  useFrame(() => {
    if (!lineRef.current) return;
    const dist = camera.position.length();
    const mat = lineRef.current.material as THREE.LineBasicMaterial;
    mat.opacity = dist < 2.2 ? 0.5 : 0.15;
  });

  return (
    <lineSegments ref={lineRef} geometry={geometry}>
      <lineBasicMaterial
        color={0x00ffcc}
        transparent
        opacity={0.15}
        depthWrite={false}
      />
    </lineSegments>
  );
}

function HexHighlights() {
  const plots = useGameStore((s) => s.plots);
  const hoveredPlotId = useGameStore((s) => s.hoveredPlotId);
  const selectedPlotId = useGameStore((s) => s.selectedPlotId);
  const ownedPlots = useGameStore((s) => s.player.plotsOwned);

  const meshes = useMemo(() => {
    const items: {
      geo: THREE.BufferGeometry;
      color: string;
      opacity: number;
      key: string;
    }[] = [];
    const rendered = new Set<number>();

    // Owned plots — green
    for (const pid of ownedPlots) {
      if (pid >= 0 && pid < plots.length) {
        rendered.add(pid);
        items.push({
          geo: buildFilledHexGeometry(pid, plots),
          color: "#22c55e",
          opacity: 0.25,
          key: `owned-${pid}`,
        });
      }
    }

    // Selected plot — cyan (on top of owned if overlap)
    if (
      selectedPlotId !== null &&
      selectedPlotId >= 0 &&
      selectedPlotId < plots.length
    ) {
      items.push({
        geo: buildFilledHexGeometry(selectedPlotId, plots),
        color: "#00ffcc",
        opacity: 0.35,
        key: `selected-${selectedPlotId}`,
      });
      rendered.add(selectedPlotId);
    }

    // Hovered plot — gold (skip if same as selected)
    if (
      hoveredPlotId !== null &&
      hoveredPlotId !== selectedPlotId &&
      hoveredPlotId >= 0 &&
      hoveredPlotId < plots.length
    ) {
      items.push({
        geo: buildFilledHexGeometry(hoveredPlotId, plots),
        color: "#ffd700",
        opacity: 0.28,
        key: `hovered-${hoveredPlotId}`,
      });
    }

    return items;
  }, [hoveredPlotId, selectedPlotId, ownedPlots, plots]);

  return (
    <>
      {meshes.map(({ geo, color, opacity, key }) => (
        <mesh key={key} geometry={geo}>
          <meshBasicMaterial
            color={color}
            transparent
            opacity={opacity}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </>
  );
}

function EarthSphere() {
  const dayTex = useTexture("/assets/generated/earth-day.dim_4096x2048.jpg");
  const cloudsTex = useTexture(
    "/assets/generated/earth-clouds.dim_2048x1024.jpg",
  );
  const globeRef = useRef<THREE.Group>(null);
  const cloudsRef = useRef<THREE.Mesh>(null);
  const selectPlot = useGameStore((s) => s.selectPlot);
  const setHoveredPlotId = useGameStore((s) => s.setHoveredPlotId);
  const plots = useGameStore((s) => s.plots);
  const lastMoveTime = useRef(0);

  const atmosphereUniforms = useMemo(
    () => ({ glowColor: { value: new THREE.Color(0.1, 0.5, 1.0) } }),
    [],
  );

  useFrame(() => {
    if (globeRef.current) globeRef.current.rotation.y += 0.0001;
    if (cloudsRef.current) cloudsRef.current.rotation.y += 0.0003;
  });

  function findNearestPlot(point: THREE.Vector3): number {
    const n = point.clone().normalize();
    const phi = Math.acos(n.y);
    const theta = Math.atan2(n.z, -n.x);
    const lat = 90 - (phi * 180) / Math.PI;
    const lng = (theta * 180) / Math.PI - 180;
    let nearest = 0;
    let minDist = Number.POSITIVE_INFINITY;
    for (let i = 0; i < plots.length; i++) {
      const p = plots[i];
      const d = Math.hypot(p.lat - lat, p.lng - lng);
      if (d < minDist) {
        minDist = d;
        nearest = i;
      }
    }
    return nearest;
  }

  // biome-ignore lint/a11y/useKeyWithClickEvents: 3D canvas object
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

      <HexGrid />
      <HexHighlights />
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

interface MissileProps {
  active: boolean;
  onComplete: () => void;
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

function MissileAnimation({ active, onComplete }: MissileProps) {
  const progressRef = useRef(0);
  const completedRef = useRef(false);
  const missileRef = useRef<THREE.Mesh>(null);
  const exhaustRef = useRef<THREE.Points>(null);
  const shockwaveRef = useRef<THREE.Mesh>(null);
  const flashRef = useRef<THREE.Mesh>(null);
  const shockwaveStartRef = useRef(0);
  const postImpactTimerRef = useRef(0);

  const srcPlot = useMemo(() => latLngToXYZ(40.7, -74, 1.0), []);
  const dstPlot = useMemo(() => latLngToXYZ(51.5, 0.0, 1.0), []);
  const ctrlPt = useMemo(
    () => srcPlot.clone().lerp(dstPlot, 0.5).normalize().multiplyScalar(2.5),
    [srcPlot, dstPlot],
  );

  // Build exhaust particle geometry once
  const exhaustGeo = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const N = 20;
    const positions = new Float32Array(N * 3);
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return geo;
  }, []);

  const exhaustMat = useMemo(
    () =>
      new THREE.PointsMaterial({
        color: 0xff6600,
        size: 0.008,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
        sizeAttenuation: true,
      }),
    [],
  );

  useFrame((state, delta) => {
    if (!active) {
      progressRef.current = 0;
      completedRef.current = false;
      postImpactTimerRef.current = 0;
      shockwaveStartRef.current = 0;
      if (missileRef.current) missileRef.current.visible = false;
      if (exhaustRef.current) exhaustRef.current.visible = false;
      if (shockwaveRef.current) shockwaveRef.current.visible = false;
      if (flashRef.current) flashRef.current.visible = false;
      return;
    }

    const t = progressRef.current;

    // ── Speed multiplier per phase ───────────────────────────────────
    let speed: number;
    if (t < 0.8) {
      speed = 1.0 / 6.0; // normal arc phase
    } else if (t < 0.95) {
      speed = 0.2 / 6.0; // terminal slow-down
    } else {
      speed = 1.5 / 6.0; // snap to impact
    }

    if (t < 1.0) {
      progressRef.current = Math.min(t + delta * speed, 1.0);
    }

    const pos = bezierPoint(srcPlot, ctrlPt, dstPlot, t);

    // ── LAUNCH corkscrew (0–15%) ────────────────────────────────────
    if (t <= 0.15 && missileRef.current) {
      const spiralOffset = new THREE.Vector3(
        Math.sin(t * 80) * 0.012 * (1 - t / 0.15),
        0,
        Math.cos(t * 80) * 0.012 * (1 - t / 0.15),
      );
      missileRef.current.visible = true;
      missileRef.current.position.copy(pos.clone().add(spiralOffset));
      const mat = missileRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 2.0;
    }

    // ── ARC + TERMINAL phases (15–95%) ─────────────────────────────
    if (t > 0.15 && t < 0.95 && missileRef.current) {
      missileRef.current.visible = true;
      missileRef.current.position.copy(pos);
      const mat = missileRef.current.material as THREE.MeshStandardMaterial;
      // Heat buildup in terminal phase
      mat.emissiveIntensity = t > 0.8 ? 2.0 + (t - 0.8) * 30 : 2.5;
    }

    // ── Exhaust trail ───────────────────────────────────────────────
    if (t < 0.95 && exhaustRef.current) {
      exhaustRef.current.visible = true;
      const attr = exhaustGeo.getAttribute("position") as THREE.BufferAttribute;
      const arr = attr.array as Float32Array;
      const N = 20;
      for (let i = 0; i < N; i++) {
        const backT = Math.max(0, t - i * 0.008);
        const bp = bezierPoint(srcPlot, ctrlPt, dstPlot, backT);
        const jitter = (Math.random() - 0.5) * 0.004;
        arr[i * 3] = bp.x + jitter;
        arr[i * 3 + 1] = bp.y + jitter;
        arr[i * 3 + 2] = bp.z + jitter;
      }
      attr.needsUpdate = true;
      exhaustRef.current.geometry = exhaustGeo;
      const age = 1 - t / 0.95;
      exhaustMat.color.setHex(t < 0.15 ? 0xffffff : 0xff6600);
      exhaustMat.opacity = 0.7 * age + 0.3;
    }

    // ── IMPACT (95–100%) ────────────────────────────────────────────
    if (t >= 0.95) {
      if (missileRef.current) missileRef.current.visible = false;
      if (exhaustRef.current) exhaustRef.current.visible = false;

      // Shockwave
      if (shockwaveRef.current) {
        if (shockwaveStartRef.current === 0) {
          shockwaveStartRef.current = state.clock.getElapsedTime();
        }
        const elapsed =
          state.clock.getElapsedTime() - shockwaveStartRef.current;
        shockwaveRef.current.visible = elapsed < 1.0;
        const s = Math.min(elapsed * 3.5, 3.0);
        shockwaveRef.current.position.copy(dstPlot);
        shockwaveRef.current.lookAt(0, 0, 0);
        shockwaveRef.current.scale.setScalar(s);
        const swMat = shockwaveRef.current.material as THREE.MeshBasicMaterial;
        swMat.opacity = Math.max(0, 1 - elapsed * 1.5);
      }

      // Flash sphere
      if (flashRef.current) {
        if (shockwaveStartRef.current > 0) {
          const elapsed =
            state.clock.getElapsedTime() - shockwaveStartRef.current;
          flashRef.current.visible = elapsed < 0.5;
          flashRef.current.position.copy(dstPlot);
          const s = Math.min(elapsed * 3, 0.5);
          flashRef.current.scale.setScalar(s);
          const fm = flashRef.current.material as THREE.MeshBasicMaterial;
          fm.opacity = Math.max(0, 1 - elapsed * 4);
        }
      }
    }

    // ── Post-impact → call onComplete after 1.5s ────────────────────
    if (t >= 1.0 && !completedRef.current) {
      postImpactTimerRef.current += delta;
      if (postImpactTimerRef.current >= 1.5) {
        completedRef.current = true;
        onComplete();
      }
    }

    // ── Camera tracking ─────────────────────────────────────────────
    // This is handled by CameraAnimator; nothing extra needed here
  });

  if (!active) return null;

  return (
    <group>
      {/* Missile body */}
      <mesh ref={missileRef}>
        <cylinderGeometry args={[0.006, 0.003, 0.04, 6]} />
        <meshStandardMaterial
          color={0xffffff}
          emissive={0xffffff}
          emissiveIntensity={2.5}
        />
      </mesh>

      {/* Exhaust particles */}
      <points ref={exhaustRef} geometry={exhaustGeo} material={exhaustMat} />

      {/* Shockwave ring */}
      <mesh ref={shockwaveRef}>
        <torusGeometry args={[0.05, 0.005, 6, 32]} />
        <meshBasicMaterial
          color={0xff4400}
          transparent
          opacity={1}
          depthWrite={false}
        />
      </mesh>

      {/* Impact flash */}
      <mesh ref={flashRef}>
        <sphereGeometry args={[0.05, 12, 12]} />
        <meshBasicMaterial
          color={0xffffff}
          transparent
          opacity={1}
          depthWrite={false}
        />
      </mesh>
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

  // When selectedPlotId changes, compute new target
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

    // Stop animating when close enough
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
}

function GlobeScene({
  controlsRef,
  missileActive,
  onMissileComplete,
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

      <MissileAnimation active={missileActive} onComplete={onMissileComplete} />
    </>
  );
}

interface GlobeCanvasProps {
  controlsRef: React.MutableRefObject<any>;
  missileActive?: boolean;
  onMissileComplete?: () => void;
}

export default function GlobeCanvas({
  controlsRef,
  missileActive = false,
  onMissileComplete = () => {},
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
      />
    </Canvas>
  );
}
