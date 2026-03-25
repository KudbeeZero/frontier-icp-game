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

function EarthSphere() {
  const dayTex = useTexture("/assets/generated/earth-day.dim_4096x2048.jpg");
  const cloudsTex = useTexture(
    "/assets/generated/earth-clouds.dim_2048x1024.jpg",
  );
  const globeRef = useRef<THREE.Group>(null);
  const cloudsRef = useRef<THREE.Mesh>(null);
  const selectPlot = useGameStore((s) => s.selectPlot);
  const setTargetPlotId = useGameStore((s) => s.setTargetPlotId);
  const plots = useGameStore((s) => s.plots);

  const atmosphereUniforms = useMemo(
    () => ({ glowColor: { value: new THREE.Color(0.1, 0.5, 1.0) } }),
    [],
  );

  useFrame(() => {
    if (globeRef.current) globeRef.current.rotation.y += 0.0001;
    if (cloudsRef.current) cloudsRef.current.rotation.y += 0.0003;
  });

  const handleClick = (e: any) => {
    e.stopPropagation();
    const point: THREE.Vector3 = e.point;
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
    selectPlot(nearest);
    setTargetPlotId(nearest);
  };

  return (
    <group ref={globeRef}>
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: 3D canvas mesh */}
      <mesh onClick={handleClick}>
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
  fromLat: number;
  fromLng: number;
  toLat: number;
  toLng: number;
}

function MissileAnimation({
  active,
  onComplete,
  fromLat,
  fromLng,
  toLat,
  toLng,
}: MissileProps) {
  const progressRef = useRef(0);
  const headRef = useRef<THREE.Mesh>(null);
  const flashRef = useRef<THREE.Mesh>(null);
  const completedRef = useRef(false);

  const srcPlot = useMemo(
    () => latLngToXYZ(fromLat, fromLng, 1.0),
    [fromLat, fromLng],
  );
  const dstPlot = useMemo(() => latLngToXYZ(toLat, toLng, 1.0), [toLat, toLng]);

  useFrame((_, delta) => {
    if (!active) {
      progressRef.current = 0;
      completedRef.current = false;
      if (headRef.current) headRef.current.visible = false;
      if (flashRef.current) flashRef.current.visible = false;
      return;
    }

    progressRef.current = Math.min(progressRef.current + delta / 3.0, 1.0);
    const t = progressRef.current;

    const mid = srcPlot
      .clone()
      .lerp(dstPlot, 0.5)
      .normalize()
      .multiplyScalar(1.5);
    const p1 = new THREE.Vector3().lerpVectors(srcPlot, mid, t);
    const p2 = new THREE.Vector3().lerpVectors(mid, dstPlot, t);
    const pos = new THREE.Vector3().lerpVectors(p1, p2, t);

    if (headRef.current) {
      headRef.current.visible = t < 0.95;
      headRef.current.position.copy(pos);
    }

    if (flashRef.current) {
      if (t >= 0.95) {
        flashRef.current.visible = true;
        flashRef.current.position.copy(dstPlot);
        flashRef.current.scale.setScalar((t - 0.95) * 6);
        const mat = flashRef.current.material as THREE.MeshBasicMaterial;
        mat.opacity = Math.max(0, 1 - (t - 0.95) * 20);
      } else {
        flashRef.current.visible = false;
      }
    }

    if (t >= 1.0 && !completedRef.current) {
      completedRef.current = true;
      onComplete();
    }
  });

  if (!active) return null;

  return (
    <group>
      <mesh ref={headRef}>
        <sphereGeometry args={[0.012, 8, 8]} />
        <meshBasicMaterial color={0xff8800} />
      </mesh>
      <mesh ref={flashRef}>
        <sphereGeometry args={[0.05, 12, 12]} />
        <meshBasicMaterial color={0xff4400} transparent opacity={1} />
      </mesh>
    </group>
  );
}

interface SceneProps {
  controlsRef: React.MutableRefObject<any>;
  missileActive: boolean;
  onMissileComplete: () => void;
  missileFrom: { lat: number; lng: number };
  missileTo: { lat: number; lng: number };
}

function GlobeScene({
  controlsRef,
  missileActive,
  onMissileComplete,
  missileFrom,
  missileTo,
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

      <MissileAnimation
        active={missileActive}
        onComplete={onMissileComplete}
        fromLat={missileFrom.lat}
        fromLng={missileFrom.lng}
        toLat={missileTo.lat}
        toLng={missileTo.lng}
      />
    </>
  );
}

interface GlobeCanvasProps {
  controlsRef: React.MutableRefObject<any>;
  missileActive?: boolean;
  onMissileComplete?: () => void;
  missileFrom?: { lat: number; lng: number };
  missileTo?: { lat: number; lng: number };
}

export default function GlobeCanvas({
  controlsRef,
  missileActive = false,
  onMissileComplete = () => {},
  missileFrom = { lat: 40.7, lng: -74 },
  missileTo = { lat: 51.5, lng: 0 },
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
        missileFrom={missileFrom}
        missileTo={missileTo}
      />
    </Canvas>
  );
}
