import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { BIOME_COLORS, FACTION_COLORS, useGameStore } from "../store/gameStore";

const FACTION_KEYS = Object.keys(FACTION_COLORS);

function latLngToXYZ(lat: number, lng: number, r: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(theta),
  );
}

function getPlotColor(
  owner: string | null,
  biome: string,
  playerPrincipal: string | null,
  playerPlots: number[],
  plotId: number,
): THREE.Color {
  if (owner === null) {
    const biomeHex =
      BIOME_COLORS[biome as keyof typeof BIOME_COLORS] ?? "#1a2030";
    const c = new THREE.Color(biomeHex);
    c.multiplyScalar(0.4);
    return c;
  }
  if (FACTION_KEYS.includes(owner)) {
    return new THREE.Color(FACTION_COLORS[owner]);
  }
  if (owner === playerPrincipal || playerPlots.includes(plotId)) {
    return new THREE.Color("#35E7FF");
  }
  return new THREE.Color("#334455");
}

export default function GlobeCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const plots = useGameStore((s) => s.plots);
  const player = useGameStore((s) => s.player);
  const selectPlot = useGameStore((s) => s.selectPlot);
  const selectedPlotId = useGameStore((s) => s.selectedPlotId);

  // Keep refs for live state access inside animation loop
  const playerRef = useRef(player);
  const selectedRef = useRef(selectedPlotId);
  playerRef.current = player;
  selectedRef.current = selectedPlotId;

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    renderer.setClearColor(0x04070d, 1);

    // Scene & camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      60,
      canvas.clientWidth / canvas.clientHeight,
      0.1,
      1000,
    );
    camera.position.set(0, 0, 2.8);

    // Controls
    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 1.5;
    controls.maxDistance = 5;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.3;

    // Stars
    {
      const geo = new THREE.BufferGeometry();
      const positions = new Float32Array(4000 * 3);
      for (let i = 0; i < 4000; i++) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const r = 30 + Math.random() * 70;
        positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = r * Math.cos(phi);
        positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
      }
      geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      const mat = new THREE.PointsMaterial({
        color: 0xaaccff,
        size: 0.08,
        sizeAttenuation: true,
      });
      scene.add(new THREE.Points(geo, mat));
    }

    // Globe group
    const globeGroup = new THREE.Group();
    scene.add(globeGroup);

    // Planet sphere
    const planetGeo = new THREE.SphereGeometry(1, 64, 64);
    const planetMat = new THREE.MeshStandardMaterial({
      color: 0x0a1628,
      roughness: 0.8,
      metalness: 0.2,
    });
    const planet = new THREE.Mesh(planetGeo, planetMat);
    globeGroup.add(planet);

    // Atmosphere
    const atmosGeo = new THREE.SphereGeometry(1.02, 32, 32);
    const atmosMat = new THREE.MeshBasicMaterial({
      color: 0x1a4080,
      transparent: true,
      opacity: 0.12,
      side: THREE.BackSide,
    });
    globeGroup.add(new THREE.Mesh(atmosGeo, atmosMat));

    // Glow halo
    const haloGeo = new THREE.SphereGeometry(1.08, 32, 32);
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0x2288aa,
      transparent: true,
      opacity: 0.04,
      side: THREE.BackSide,
    });
    globeGroup.add(new THREE.Mesh(haloGeo, haloMat));

    // Orbital rings
    for (let i = 0; i < 2; i++) {
      const ringGeo = new THREE.TorusGeometry(1.3 + i * 0.15, 0.002, 8, 128);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0x2244aa,
        transparent: true,
        opacity: 0.3,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI / 2 + i * 0.4;
      ring.rotation.y = i * 0.3;
      globeGroup.add(ring);
    }

    // Ambient + directional light
    scene.add(new THREE.AmbientLight(0x112244, 1.5));
    const dirLight = new THREE.DirectionalLight(0x88ccff, 2);
    dirLight.position.set(5, 3, 5);
    scene.add(dirLight);

    // Hex tiles (instanced)
    const HEX_RADIUS = 0.022;
    const HEX_HEIGHT = 0.007;
    const hexGeo = new THREE.CylinderGeometry(
      HEX_RADIUS,
      HEX_RADIUS,
      HEX_HEIGHT,
      6,
    );
    // Close the top/bottom faces
    const hexMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.5,
      metalness: 0.4,
    });

    const COUNT = plots.length;
    const instancedMesh = new THREE.InstancedMesh(hexGeo, hexMat, COUNT);
    instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    globeGroup.add(instancedMesh);

    const dummy = new THREE.Object3D();
    const color = new THREE.Color();

    for (let i = 0; i < COUNT; i++) {
      const plot = plots[i];
      const pos = latLngToXYZ(plot.lat, plot.lng, 1.0);

      dummy.position.copy(pos);
      dummy.lookAt(pos.clone().multiplyScalar(2));
      dummy.rotateX(Math.PI / 2);
      dummy.updateMatrix();
      instancedMesh.setMatrixAt(i, dummy.matrix);

      const c = getPlotColor(
        plot.owner,
        plot.biome,
        playerRef.current.principal,
        playerRef.current.plotsOwned,
        plot.id,
      );
      instancedMesh.setColorAt(i, c);
    }

    instancedMesh.instanceMatrix.needsUpdate = true;
    if (instancedMesh.instanceColor)
      instancedMesh.instanceColor.needsUpdate = true;

    // Raycasting
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handleClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObject(instancedMesh);
      if (intersects.length > 0 && intersects[0].instanceId !== undefined) {
        selectPlot(intersects[0].instanceId);
      } else {
        // Check if click was on planet (not on a hex)
        const planetIntersects = raycaster.intersectObject(planet);
        if (planetIntersects.length > 0) {
          // deselect or do nothing
        }
      }
    };

    canvas.addEventListener("click", handleClick);

    // Highlight hovered hex
    let hoveredId = -1;
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObject(instancedMesh);
      if (intersects.length > 0 && intersects[0].instanceId !== undefined) {
        const newId = intersects[0].instanceId;
        if (newId !== hoveredId) {
          // Restore old
          if (hoveredId >= 0 && hoveredId !== selectedRef.current) {
            const p = plots[hoveredId];
            const c = getPlotColor(
              p.owner,
              p.biome,
              playerRef.current.principal,
              playerRef.current.plotsOwned,
              p.id,
            );
            instancedMesh.setColorAt(hoveredId, c);
            if (instancedMesh.instanceColor)
              instancedMesh.instanceColor.needsUpdate = true;
          }
          hoveredId = newId;
          // Set hover color
          instancedMesh.setColorAt(newId, color.set(0xffffff));
          if (instancedMesh.instanceColor)
            instancedMesh.instanceColor.needsUpdate = true;
          canvas.style.cursor = "pointer";
        }
      } else {
        if (hoveredId >= 0) {
          const p = plots[hoveredId];
          const c = getPlotColor(
            p.owner,
            p.biome,
            playerRef.current.principal,
            playerRef.current.plotsOwned,
            p.id,
          );
          instancedMesh.setColorAt(hoveredId, c);
          if (instancedMesh.instanceColor)
            instancedMesh.instanceColor.needsUpdate = true;
          hoveredId = -1;
          canvas.style.cursor = "default";
        }
      }
    };

    canvas.addEventListener("mousemove", handleMouseMove);

    // Highlight selected
    let prevSelected = -1;
    const updateSelected = (selId: number | null) => {
      if (prevSelected >= 0) {
        const p = plots[prevSelected];
        const c = getPlotColor(
          p.owner,
          p.biome,
          playerRef.current.principal,
          playerRef.current.plotsOwned,
          p.id,
        );
        instancedMesh.setColorAt(prevSelected, c);
        if (instancedMesh.instanceColor)
          instancedMesh.instanceColor.needsUpdate = true;
      }
      if (selId !== null && selId >= 0) {
        instancedMesh.setColorAt(selId, color.set(0x00ffff));
        if (instancedMesh.instanceColor)
          instancedMesh.instanceColor.needsUpdate = true;
      }
      prevSelected = selId ?? -1;
    };

    // Resize
    const handleResize = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    window.addEventListener("resize", handleResize);

    // Animation loop
    let rafId: number;
    let lastSelected = selectedRef.current;

    const animate = () => {
      rafId = requestAnimationFrame(animate);
      controls.update();

      // Sync selected highlight
      if (selectedRef.current !== lastSelected) {
        updateSelected(selectedRef.current);
        lastSelected = selectedRef.current;
      }

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(rafId);
      canvas.removeEventListener("click", handleClick);
      canvas.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("resize", handleResize);
      controls.dispose();
      renderer.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full block"
      style={{ background: "#04070d" }}
    />
  );
}
