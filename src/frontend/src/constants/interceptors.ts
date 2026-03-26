export interface InterceptorConfig {
  id: string;
  name: string;
  category: "INTERCEPTOR";
  interceptChance: number;
  range: string;
  speed: string;
  guidance: string;
  warhead: string;
  frntrPerIntercept: number;
  accentColor: string;
  description: string;
  qty: number;
  launchType: "hot" | "cold";
  smokeColor: string;
}

export const INTERCEPTOR_CONFIGS: InterceptorConfig[] = [
  {
    id: "IRON_DOME_F",
    name: "IRON-DOME-F",
    category: "INTERCEPTOR",
    interceptChance: 0.7,
    range: "70km",
    speed: "Mach 2.2",
    guidance: "Active Radar Proximity",
    warhead: "Blast-Fragmentation Proximity",
    frntrPerIntercept: 40,
    accentColor: "#00bfff",
    description:
      "Short-range area defense. Passive auto-intercept when assigned to silo. 70% success rate vs rockets and cruise missiles.",
    qty: 10,
    launchType: "cold",
    smokeColor: "#88ddff",
  },
  {
    id: "THAAD_X",
    name: "THAAD-X",
    category: "INTERCEPTOR",
    interceptChance: 0.85,
    range: "200km",
    speed: "Mach 8",
    guidance: "Hit-to-Kill Terminal",
    warhead: "Kinetic Kill Vehicle",
    frntrPerIntercept: 80,
    accentColor: "#8b5cf6",
    description:
      "High-altitude terminal defense. Intercepts ballistic missiles mid-flight. 85% success rate. FRNTR consumed per successful intercept.",
    qty: 5,
    launchType: "cold",
    smokeColor: "#aa88ff",
  },
  {
    id: "AEGIS_S",
    name: "AEGIS-S",
    category: "INTERCEPTOR",
    interceptChance: 0.9,
    range: "500km",
    speed: "Mach 12",
    guidance: "Multi-Mode SM-3",
    warhead: "Exoatmospheric Kinetic",
    frntrPerIntercept: 120,
    accentColor: "#a855f7",
    description:
      "Naval-derived long-range interceptor. Engages hypersonic threats. Highest success rate at 90%. Premium FRNTR cost per intercept.",
    qty: 3,
    launchType: "cold",
    smokeColor: "#cc88ff",
  },
];

export function getInterceptorById(id: string): InterceptorConfig | undefined {
  return INTERCEPTOR_CONFIGS.find((i) => i.id === id);
}
