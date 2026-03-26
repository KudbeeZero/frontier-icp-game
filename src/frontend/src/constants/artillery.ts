import type { MissileVfx } from "./missiles";

export interface ArtilleryConfig {
  id: string;
  name: string;
  category: "ARTILLERY";
  class: string;
  guidance: string;
  range: string;
  speed: string;
  warhead: string;
  launchType: "hot" | "cold";
  trajectory: string;
  smokeColor: string;
  smokeDensity: number;
  speedMultiplier: number;
  cameraHeight: number;
  accentColor: string;
  description: string;
  qty: number;
  audioPrompt: { launch: string; impact: string };
  vfx: MissileVfx;
}

export const ARTILLERY_CONFIGS: ArtilleryConfig[] = [
  {
    id: "HIMARS_R",
    name: "HIMARS-R",
    category: "ARTILLERY",
    class: "MLRS",
    guidance: "GPS/INS Guided Rockets",
    range: "80km",
    speed: "Mach 2.5",
    warhead: "Area-Saturation Cluster",
    launchType: "hot",
    trajectory: "ballistic arc, rapid ripple of 4 projectiles",
    smokeColor: "#ffaa44",
    smokeDensity: 0.85,
    speedMultiplier: 2.2,
    cameraHeight: 0.6,
    accentColor: "#f97316",
    description:
      "GPS-guided multiple launch rocket system. Rapid ripple-fire salvo saturates target area. Each pod fires 4 rockets in 2-second sequence.",
    qty: 4,
    audioPrompt: {
      launch:
        "MLRS ripple fire salvo launch, four rapid rocket ignitions in quick succession, thunderous grouped blast, dense yellow-orange smoke plume",
      impact:
        "Cluster artillery impact, multiple staggered detonations, area saturation explosions, ground shaking rumble",
    },
    vfx: {
      launchType: "hot",
      plumeColor: "#ff8800",
      plumeScale: 1.6,
      plumeLingerSeconds: 4,
      flameCoreColor: "#ffffff",
      flameOuterColor: "#ff6600",
      shockDiamondsEnabled: true,
      shockDiamondCount: 3,
      flameLength: 0.07,
      layer1Color: "#ffaa44",
      layer1Opacity: 0.88,
      layer1Size: 0.013,
      layer2Color: "#ff8833",
      layer2Opacity: 0.6,
      layer2Size: 0.02,
      layer2BillowFactor: 0.009,
      layer3Color: "#ffcc88",
      layer3Opacity: 0.28,
      layer3Size: 0.036,
      trailSpiral: false,
      trailSpiralFreq: 0,
      impactFlashColor: "#ffaa00",
      impactShockwaveColor: "#f97316",
      impactDebrisCount: 32,
      impactFireballScale: 0.18,
      mirvCount: 4,
      vaporConeEnabled: false,
      vaporConeColor: "#ffffff",
    },
  },
  {
    id: "PALADIN_H",
    name: "PALADIN-H",
    category: "ARTILLERY",
    class: "SPH",
    guidance: "GPS-Guided 155mm",
    range: "30km",
    speed: "Mach 1.8",
    warhead: "155mm Precision Shell",
    launchType: "hot",
    trajectory: "high arc ballistic",
    smokeColor: "#ccaa44",
    smokeDensity: 0.65,
    speedMultiplier: 2.8,
    cameraHeight: 0.55,
    accentColor: "#eab308",
    description:
      "Self-propelled artillery with GPS-guided munitions. Single precision shell with low FRNTR cost and high single-target damage.",
    qty: 8,
    audioPrompt: {
      launch:
        "155mm howitzer cannon fire, thunderous sharp crack, single powerful boom, gun recoil shockwave, shell whistling away",
      impact:
        "Precision artillery shell impact, sharp detonation, concentrated blast crater, earth eruption",
    },
    vfx: {
      launchType: "hot",
      plumeColor: "#ddaa22",
      plumeScale: 1.0,
      plumeLingerSeconds: 2,
      flameCoreColor: "#ffffff",
      flameOuterColor: "#ddaa22",
      shockDiamondsEnabled: false,
      shockDiamondCount: 0,
      flameLength: 0.05,
      layer1Color: "#ccaa44",
      layer1Opacity: 0.75,
      layer1Size: 0.01,
      layer2Color: "#bbaa33",
      layer2Opacity: 0.45,
      layer2Size: 0.017,
      layer2BillowFactor: 0.006,
      layer3Color: "#ddcc88",
      layer3Opacity: 0.18,
      layer3Size: 0.03,
      trailSpiral: false,
      trailSpiralFreq: 0,
      impactFlashColor: "#ffdd00",
      impactShockwaveColor: "#eab308",
      impactDebrisCount: 20,
      impactFireballScale: 0.12,
      mirvCount: 0,
      vaporConeEnabled: false,
      vaporConeColor: "#ffffff",
    },
  },
  {
    id: "MLRS_X",
    name: "MLRS-X",
    category: "ARTILLERY",
    class: "UNGUIDED",
    guidance: "Unguided Ballistic",
    range: "45km",
    speed: "Mach 1.2",
    warhead: "Unguided Area Saturation",
    launchType: "hot",
    trajectory: "ballistic saturation",
    smokeColor: "#ff8844",
    smokeDensity: 1.0,
    speedMultiplier: 1.5,
    cameraHeight: 0.7,
    accentColor: "#ef4444",
    description:
      "Unguided multiple rocket salvo for area denial. Low precision but overwhelming volume. Dense yellow-gray smoke trails.",
    qty: 3,
    audioPrompt: {
      launch:
        "Mass rocket barrage launch, continuous rapid-fire thunder of multiple rockets igniting, overwhelming roar, dense billowing smoke",
      impact:
        "Area saturation barrage impact, rapid overlapping explosions, fire and smoke saturation, earth-shattering destruction",
    },
    vfx: {
      launchType: "hot",
      plumeColor: "#ff6600",
      plumeScale: 2.2,
      plumeLingerSeconds: 5,
      flameCoreColor: "#ffaa00",
      flameOuterColor: "#ff4400",
      shockDiamondsEnabled: true,
      shockDiamondCount: 2,
      flameLength: 0.08,
      layer1Color: "#ff8844",
      layer1Opacity: 0.92,
      layer1Size: 0.015,
      layer2Color: "#ff6622",
      layer2Opacity: 0.7,
      layer2Size: 0.025,
      layer2BillowFactor: 0.012,
      layer3Color: "#ffaa66",
      layer3Opacity: 0.32,
      layer3Size: 0.044,
      trailSpiral: false,
      trailSpiralFreq: 0,
      impactFlashColor: "#ff6600",
      impactShockwaveColor: "#ef4444",
      impactDebrisCount: 45,
      impactFireballScale: 0.24,
      mirvCount: 8,
      vaporConeEnabled: false,
      vaporConeColor: "#ffffff",
    },
  },
  {
    id: "EXCALIBUR_P",
    name: "EXCALIBUR-P",
    category: "ARTILLERY",
    class: "PRECISION",
    guidance: "GPS/INS Precision Shell",
    range: "70km",
    speed: "Mach 2.2",
    warhead: "GPS-Guided 155mm",
    launchType: "cold",
    trajectory: "precision ballistic",
    smokeColor: "#88ffaa",
    smokeDensity: 0.3,
    speedMultiplier: 2.5,
    cameraHeight: 0.6,
    accentColor: "#22c55e",
    description:
      "Long-range GPS-guided artillery shell. Near-surgical precision at extended ranges. Minimum smoke — GPS-guided round.",
    qty: 3,
    audioPrompt: {
      launch:
        "Precision artillery cold fire, quiet charge ignition, high-velocity shell leaving barrel, minimal smoke, sharp supersonic crack",
      impact:
        "Precision surgical strike, sharp concentrated detonation, minimal collateral explosion, clean impact",
    },
    vfx: {
      launchType: "cold",
      plumeColor: "#88ffaa",
      plumeScale: 0.7,
      plumeLingerSeconds: 2,
      flameCoreColor: "#aaffcc",
      flameOuterColor: "#22c55e",
      shockDiamondsEnabled: false,
      shockDiamondCount: 0,
      flameLength: 0.04,
      layer1Color: "#88ffaa",
      layer1Opacity: 0.5,
      layer1Size: 0.007,
      layer2Color: "#66dd88",
      layer2Opacity: 0.25,
      layer2Size: 0.012,
      layer2BillowFactor: 0.004,
      layer3Color: "#aaffcc",
      layer3Opacity: 0.1,
      layer3Size: 0.02,
      trailSpiral: false,
      trailSpiralFreq: 0,
      impactFlashColor: "#88ffaa",
      impactShockwaveColor: "#22c55e",
      impactDebrisCount: 14,
      impactFireballScale: 0.09,
      mirvCount: 0,
      vaporConeEnabled: false,
      vaporConeColor: "#ffffff",
    },
  },
];

export function getArtilleryById(id: string): ArtilleryConfig | undefined {
  return ARTILLERY_CONFIGS.find((a) => a.id === id);
}
