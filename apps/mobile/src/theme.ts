// Design tokens ported from the "Finance Quest" onboarding artifact.

export const colors = {
  petrol950: "#00262D",
  petrol900: "#003A44",
  petrol800: "#004B57",
  petrol700: "#0B5E6B",
  petrol100: "#E2EEEF",
  yellow: "#FFD400",
  yellow700: "#D9B300",
  bg: "#F2F5F5",
  surface: "#FFFFFF",
  surface2: "#EDF2F2",
  ink: "#0D2A30",
  muted: "#5B7076",
  line: "#DAE3E4",
  // Game states: something unpaid / everything fine.
  danger: "#C2410C",
  dangerBg: "#FDF0E8",
  success: "#22A088",
  // Text colors on the dark petrol welcome background.
  onPetrol: "#FFFFFF",
  onPetrolSub: "#C3D9DC",
  onPetrolMuted: "#A9C7CC",
  onPetrolPill: "#D8E8EA",
} as const;

// The 4 accounts. Ids match the onboarding content.
export const accountColors = {
  main: { color: "#F2C200", ink: "#8A6E00" },
  cushion: { color: "#22A088", ink: "#22A088" },
  future: { color: "#2C7DA6", ink: "#2C7DA6" },
  protection: { color: "#0B4F5C", ink: "#0B4F5C" },
} as const;

// Manrope weights (Android ignores fontWeight for custom fonts, so each weight is its own family).
export const font = {
  regular: "Manrope_400Regular",
  medium: "Manrope_500Medium",
  semibold: "Manrope_600SemiBold",
  bold: "Manrope_700Bold",
  extrabold: "Manrope_800ExtraBold",
} as const;

// Springs from the artifact: { stiffness, damping } with mass 1.
export const springs = {
  soft: { stiffness: 170, damping: 24, mass: 1 }, // element entrances
  snappy: { stiffness: 320, damping: 26, mass: 1 }, // buttons, selections
  lively: { stiffness: 240, damping: 17, mass: 1 }, // slight overshoot: landings
  bar: { stiffness: 140, damping: 22, mass: 1 }, // progress bar
} as const;

export const shadow1 = {
  shadowColor: "#00262D",
  shadowOpacity: 0.08,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 3 },
  elevation: 2,
} as const;

export const shadow2 = {
  shadowColor: "#00262D",
  shadowOpacity: 0.12,
  shadowRadius: 16,
  shadowOffset: { width: 0, height: 8 },
  elevation: 5,
} as const;

// CSS color-mix(in srgb, color pct%, base) for #RRGGBB colors.
export function mix(color: string, base: string, pct: number): string {
  const parse = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const a = parse(color);
  const b = parse(base);
  const out = a.map((v, i) => Math.round(v * (pct / 100) + (b[i] ?? 0) * (1 - pct / 100)));
  return "#" + out.map((v) => v.toString(16).padStart(2, "0")).join("");
}
