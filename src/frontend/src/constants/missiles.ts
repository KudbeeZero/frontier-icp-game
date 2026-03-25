export interface MissileVfx {
  // Launch plume
  launchType: "hot" | "cold";
  plumeColor: string;
  plumeScale: number;
  plumeLingerSeconds: number;

  // Exhaust flame (nozzle area)
  flameCoreColor: string;
  flameOuterColor: string;
  shockDiamondsEnabled: boolean;
  shockDiamondCount: number;
  flameLength: number;

  // Smoke trail layers
  layer1Color: string;
  layer1Opacity: number;
  layer1Size: number;
  layer2Color: string;
  layer2Opacity: number;
  layer2Size: number;
  layer2BillowFactor: number;
  layer3Color: string;
  layer3Opacity: number;
  layer3Size: number;
  trailSpiral: boolean;
  trailSpiralFreq: number;

  // Impact
  impactFlashColor: string;
  impactShockwaveColor: string;
  impactDebrisCount: number;
  impactFireballScale: number;
  mirvCount: number;

  // Vapor cone (supersonic)
  vaporConeEnabled: boolean;
  vaporConeColor: string;
}

export interface MissileConfig {
  id: string;
  name: string;
  class: "ICBM" | "CRUISE" | "AGM" | "ATGM" | "SAM" | "AAM";
  guidance: string;
  range: string;
  speed: string;
  warhead: string;
  launchType: "hot" | "cold";
  trajectory: "ballistic" | "cruise" | "top-attack" | "vertical-pop" | "direct";
  smokeColor: string;
  smokeDensity: number;
  speedMultiplier: number;
  cameraHeight: number;
  accentColor: string;
  description: string;
  audioPrompt: {
    launch: string;
    impact: string;
  };
  qty: number;
  vfx: MissileVfx;
}

export const MISSILE_CONFIGS: MissileConfig[] = [
  {
    id: "ICBM_PHANTOM",
    name: "ICBM-PHANTOM",
    class: "ICBM",
    guidance: "INS/Stellar/GPS",
    range: "13,000km",
    speed: "Mach 23",
    warhead: "MIRV (3–10 RVs)",
    launchType: "cold",
    trajectory: "ballistic",
    smokeColor: "#ff6600",
    smokeDensity: 1.0,
    speedMultiplier: 1.0,
    cameraHeight: 1.0,
    accentColor: "#ef4444",
    description:
      "Strategic ICBM with suborbital MIRV trajectory. Cold silo launch with massive steam cloud. 3–10 independently targetable reentry vehicles. Global strike capability.",
    audioPrompt: {
      launch:
        "Massive ICBM silo launch, thunderous rumbling ground shake, deafening roar building to earth-shattering rocket ignition, enormous steam cloud explosion, deep bass shockwave",
      impact:
        "Massive nuclear-scale explosion impact, earth-shattering detonation, deep bass shockwave rings, catastrophic destruction rumble",
    },
    qty: 2,
    vfx: {
      launchType: "cold",
      plumeColor: "#ffffff",
      plumeScale: 3.0,
      plumeLingerSeconds: 5,
      flameCoreColor: "#ffffff",
      flameOuterColor: "#ff8800",
      shockDiamondsEnabled: true,
      shockDiamondCount: 5,
      flameLength: 0.12,
      layer1Color: "#ff6600",
      layer1Opacity: 0.9,
      layer1Size: 0.014,
      layer2Color: "#ff9933",
      layer2Opacity: 0.65,
      layer2Size: 0.022,
      layer2BillowFactor: 0.012,
      layer3Color: "#ffcc88",
      layer3Opacity: 0.25,
      layer3Size: 0.04,
      trailSpiral: false,
      trailSpiralFreq: 0,
      impactFlashColor: "#ffffff",
      impactShockwaveColor: "#ff4400",
      impactDebrisCount: 40,
      impactFireballScale: 0.28,
      mirvCount: 5,
      vaporConeEnabled: false,
      vaporConeColor: "#ffffff",
    },
  },
  {
    id: "TOMAHAWK",
    name: "TOMAHAWK-BLK5",
    class: "CRUISE",
    guidance: "GPS/TERCOM/DSMAC",
    range: "1,600km",
    speed: "Mach 0.72",
    warhead: "450kg Blast-Frag",
    launchType: "cold",
    trajectory: "cruise",
    smokeColor: "#ffffff",
    smokeDensity: 0.4,
    speedMultiplier: 0.6,
    cameraHeight: 0.3,
    accentColor: "#f97316",
    description:
      "All-weather subsonic cruise missile. VLS cold launch from ship/silo. Terrain-hugging flight profile with GPS/TERCOM navigation. Near-invisible turbojet exhaust.",
    audioPrompt: {
      launch:
        "Cruise missile VLS launch, sharp gas ejection burst, then turbojet engine ignition, low sustained whoosh of subsonic cruise flight",
      impact:
        "Precision strike explosion, sharp detonation crack, building collapse rumble, fire crackling",
    },
    qty: 5,
    vfx: {
      launchType: "cold",
      plumeColor: "#ffffff",
      plumeScale: 1.5,
      plumeLingerSeconds: 3,
      flameCoreColor: "#ffffee",
      flameOuterColor: "#aaaaaa",
      shockDiamondsEnabled: false,
      shockDiamondCount: 0,
      flameLength: 0.03,
      layer1Color: "#ffffff",
      layer1Opacity: 0.5,
      layer1Size: 0.006,
      layer2Color: "#dddddd",
      layer2Opacity: 0.22,
      layer2Size: 0.01,
      layer2BillowFactor: 0.004,
      layer3Color: "#ffffff",
      layer3Opacity: 0.08,
      layer3Size: 0.018,
      trailSpiral: false,
      trailSpiralFreq: 0,
      impactFlashColor: "#ff8800",
      impactShockwaveColor: "#f97316",
      impactDebrisCount: 18,
      impactFireballScale: 0.12,
      mirvCount: 0,
      vaporConeEnabled: false,
      vaporConeColor: "#ffffff",
    },
  },
  {
    id: "HELLFIRE",
    name: "HELLFIRE-R",
    class: "AGM",
    guidance: "SAL/mmW Radar",
    range: "16km",
    speed: "Mach 1.3",
    warhead: "Multi-purpose HEAT",
    launchType: "hot",
    trajectory: "top-attack",
    smokeColor: "#eeeeee",
    smokeDensity: 0.8,
    speedMultiplier: 2.5,
    cameraHeight: 0.5,
    accentColor: "#eab308",
    description:
      "Precision anti-armor missile. Hot launch from helicopter/drone with violent white-orange blast. Top-attack mode climbs then dives onto thin tank roof armor.",
    audioPrompt: {
      launch:
        "Hellfire missile hot launch from helicopter, violent white-orange blast, rapid aggressive acceleration whoosh, sharp motor ignition crack",
      impact:
        "Anti-armor shaped charge detonation, sharp penetrating explosion, metal shrapnel ring, secondary fire ignition",
    },
    qty: 8,
    vfx: {
      launchType: "hot",
      plumeColor: "#ff8800",
      plumeScale: 1.2,
      plumeLingerSeconds: 2,
      flameCoreColor: "#ffffff",
      flameOuterColor: "#ff6600",
      shockDiamondsEnabled: true,
      shockDiamondCount: 3,
      flameLength: 0.06,
      layer1Color: "#ffffff",
      layer1Opacity: 0.85,
      layer1Size: 0.009,
      layer2Color: "#dddddd",
      layer2Opacity: 0.55,
      layer2Size: 0.016,
      layer2BillowFactor: 0.007,
      layer3Color: "#cccccc",
      layer3Opacity: 0.2,
      layer3Size: 0.028,
      trailSpiral: false,
      trailSpiralFreq: 0,
      impactFlashColor: "#ffdd00",
      impactShockwaveColor: "#eab308",
      impactDebrisCount: 22,
      impactFireballScale: 0.1,
      mirvCount: 0,
      vaporConeEnabled: false,
      vaporConeColor: "#ffffff",
    },
  },
  {
    id: "JAVELIN",
    name: "JAVELIN-F",
    class: "ATGM",
    guidance: "IIR Fire & Forget",
    range: "4.75km",
    speed: "Mach 0.9",
    warhead: "Tandem HEAT Top-Attack",
    launchType: "cold",
    trajectory: "top-attack",
    smokeColor: "#dddddd",
    smokeDensity: 0.5,
    speedMultiplier: 3.5,
    cameraHeight: 0.7,
    accentColor: "#22c55e",
    description:
      "Man-portable fire-and-forget ATGM. Soft cold launch ejects from tube — no back-blast. Characteristic inverted-U top-attack arc onto tank roof. Autonomous IIR seeker.",
    audioPrompt: {
      launch:
        "Javelin cold launch soft pop, ejection charge hiss, then motor ignition, rising arc trajectory whoosh, quiet precision launch",
      impact:
        "Tandem shaped charge top-attack detonation on tank, sharp armor-piercing explosion, secondary ammunition cook-off",
    },
    qty: 6,
    vfx: {
      launchType: "cold",
      plumeColor: "#cccccc",
      plumeScale: 0.8,
      plumeLingerSeconds: 2,
      flameCoreColor: "#ffeecc",
      flameOuterColor: "#cccccc",
      shockDiamondsEnabled: false,
      shockDiamondCount: 0,
      flameLength: 0.04,
      layer1Color: "#dddddd",
      layer1Opacity: 0.6,
      layer1Size: 0.007,
      layer2Color: "#cccccc",
      layer2Opacity: 0.3,
      layer2Size: 0.012,
      layer2BillowFactor: 0.005,
      layer3Color: "#bbbbbb",
      layer3Opacity: 0.1,
      layer3Size: 0.02,
      trailSpiral: false,
      trailSpiralFreq: 0,
      impactFlashColor: "#ffcc00",
      impactShockwaveColor: "#22c55e",
      impactDebrisCount: 12,
      impactFireballScale: 0.07,
      mirvCount: 0,
      vaporConeEnabled: false,
      vaporConeColor: "#ffffff",
    },
  },
  {
    id: "SENTINEL",
    name: "SENTINEL-400",
    class: "SAM",
    guidance: "ARH/SARH Active Radar",
    range: "400km",
    speed: "Mach 14",
    warhead: "Blast-Frag Proximity",
    launchType: "cold",
    trajectory: "vertical-pop",
    smokeColor: "#ffaa00",
    smokeDensity: 0.9,
    speedMultiplier: 4.0,
    cameraHeight: 1.2,
    accentColor: "#8b5cf6",
    description:
      "Long-range SAM system. Cold gas eject launches missile to 30m, then motor ignites with violent orange-white bloom. Mach 14 intercept with blast-frag proximity fuse.",
    audioPrompt: {
      launch:
        "Surface-to-air missile cold launch, explosive canister gas eject bang, then massive motor ignition bloom, screaming high-speed ascent",
      impact:
        "Air intercept proximity detonation, sharp fragmentation blast at altitude, debris scatter, distant boom",
    },
    qty: 4,
    vfx: {
      launchType: "cold",
      plumeColor: "#ffffff",
      plumeScale: 1.8,
      plumeLingerSeconds: 4,
      flameCoreColor: "#ffffff",
      flameOuterColor: "#ffaa00",
      shockDiamondsEnabled: true,
      shockDiamondCount: 4,
      flameLength: 0.09,
      layer1Color: "#ffaa00",
      layer1Opacity: 0.9,
      layer1Size: 0.011,
      layer2Color: "#ff8800",
      layer2Opacity: 0.6,
      layer2Size: 0.018,
      layer2BillowFactor: 0.008,
      layer3Color: "#ffdd88",
      layer3Opacity: 0.25,
      layer3Size: 0.032,
      trailSpiral: false,
      trailSpiralFreq: 0,
      impactFlashColor: "#ffffff",
      impactShockwaveColor: "#8b5cf6",
      impactDebrisCount: 30,
      impactFireballScale: 0.15,
      mirvCount: 0,
      vaporConeEnabled: true,
      vaporConeColor: "#aaddff",
    },
  },
  {
    id: "VIPER120",
    name: "VIPER-120",
    class: "AAM",
    guidance: "Active Radar ARH",
    range: "120km",
    speed: "Mach 4",
    warhead: "Blast-Frag 23kg",
    launchType: "hot",
    trajectory: "direct",
    smokeColor: "#aaddff",
    smokeDensity: 0.3,
    speedMultiplier: 3.0,
    cameraHeight: 0.8,
    accentColor: "#00bfff",
    description:
      "Beyond-visual-range air-to-air missile. Hot rail launch with thin minimum-smoke trail. Active radar guidance with INS mid-course. Lofted arc at launch then pitches down to intercept.",
    audioPrompt: {
      launch:
        "Air-to-air missile rail launch, sharp crack motor ignition, thin white trail, high-speed dart acceleration screech",
      impact:
        "Proximity fused air-to-air detonation, sharp fragmentation blast, high-altitude explosion crack",
    },
    qty: 10,
    vfx: {
      launchType: "hot",
      plumeColor: "#ff8800",
      plumeScale: 0.6,
      plumeLingerSeconds: 1,
      flameCoreColor: "#ffffff",
      flameOuterColor: "#aaddff",
      shockDiamondsEnabled: true,
      shockDiamondCount: 4,
      flameLength: 0.05,
      layer1Color: "#aaddff",
      layer1Opacity: 0.55,
      layer1Size: 0.005,
      layer2Color: "#88ccff",
      layer2Opacity: 0.2,
      layer2Size: 0.009,
      layer2BillowFactor: 0.003,
      layer3Color: "#cceeFF",
      layer3Opacity: 0.07,
      layer3Size: 0.016,
      trailSpiral: true,
      trailSpiralFreq: 8,
      impactFlashColor: "#88ccff",
      impactShockwaveColor: "#00bfff",
      impactDebrisCount: 15,
      impactFireballScale: 0.08,
      mirvCount: 0,
      vaporConeEnabled: true,
      vaporConeColor: "#ffffff",
    },
  },
];

export const CLASS_COLORS: Record<string, string> = {
  ICBM: "#ef4444",
  CRUISE: "#f97316",
  AGM: "#eab308",
  ATGM: "#22c55e",
  SAM: "#8b5cf6",
  AAM: "#00bfff",
};

export function getMissileById(id: string): MissileConfig | undefined {
  return MISSILE_CONFIGS.find((m) => m.id === id);
}
