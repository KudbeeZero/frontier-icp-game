# Frontier: Missile Horizon

## Current State
The project has a basic Three.js globe (raw canvas, no textures) with a dark sci-fi HUD using a top Navbar and left/right sidebars. The globe renders colored hex cylinders over a plain dark sphere with a simple atmospheric glow. No mobile layout. No bottom navigation. No FIRE button or joystick.

## Requested Changes (Diff)

### Add
- Photorealistic Earth globe: day texture map (continents/oceans), specular map, cloud layer (animated rotation), blue Fresnel atmospheric rim shader, star field + faint nebula background
- Hex grid wireframe overlay: neon-cyan glowing lines always visible, thickens and shows ownership color on zoom-in
- Full mobile-first HUD overlay:
  - Left sliding panel: scrollable weapon/missile selection cards (icon, name, quantity, EQUIP button)
  - Right panel: Quick Inventory grid of missile/drone icons
  - Bottom navigation bar: 7 icons — Resources, Inventory, Build, Map, Combat, Shop/Parts, Settings (glowing cyan/blue, active tab highlighted), each tapping slides up a bottom sheet panel covering 40-60% of screen with globe dimmed behind
  - Central area: large circular red/gold FIRE button with "TARGET IN FORMATION" and "LOCK" labels
  - Left virtual joystick for globe orbit control
  - Right circular control buttons (Scope, Devices, Radar)
  - Top bar: mini-map thumbnail + "QUICK INVENTORY" label
- App.tsx: default route renders Play directly (no splash/landing screen)
- Missile launch animation: ballistic arc with contrail particle trail and explosion flash at impact

### Modify
- GlobeCanvas.tsx: completely rewrite using React Three Fiber + @react-three/drei for texture loading, atmosphere shader, cloud mesh, and hex wireframe grid
- Play.tsx: restructure layout for horizontal mobile, integrate new HUD components
- App.tsx: set "/" route to Play component directly
- index.css: add touch-action none on canvas, prevent scroll bounce

### Remove
- Old Navbar.tsx top nav (replaced by top bar in HUD)
- Old left/right sidebar layout in Play.tsx
- Landing page as default route

## Implementation Plan
1. Rewrite GlobeCanvas as a React Three Fiber Canvas with: EarthGlobe mesh (sphere + day texture + specular + normal), CloudLayer (slightly larger sphere, cloud texture, slow rotation), AtmosphereGlow (custom ShaderMaterial with Fresnel), StarField (Points geometry), NebulaBackground (large inverted sphere with gradient texture or vertex colors), HexGrid (LineSegments over sphere surface for all 10,000 plots)
2. Build HUD overlay components:
   - TopBar: mini-map + QUICK INVENTORY label
   - LeftWeaponPanel: slide-in from left, weapon cards
   - RightInventoryPanel: grid of icons
   - CentralFireButton: large circle, glowing red/gold, TARGET/LOCK labels
   - VirtualJoystick: touch-controlled left side
   - RightControlButtons: Scope/Devices/Radar circles
   - BottomNavBar: 7 icon tabs with labels
   - BottomSheet: animated slide-up panel per tab
3. Update App.tsx so "/" renders Play directly
4. Wire joystick to camera orbit controls via ref
5. Add basic ballistic missile animation (Three.js arc path + particle contrail)
