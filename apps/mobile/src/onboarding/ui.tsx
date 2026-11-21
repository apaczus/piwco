// Shared visual pieces of the onboarding, ported from the artifact's CSS.
import { createContext, useContext, useEffect, useRef, type ReactNode } from "react";
import { Animated, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { colors, font, mix, shadow1, shadow2, springs } from "../theme";
import { DrawPath, Enter, PressScale } from "./anim";

// ---------- Text ----------

// Time of day behind the screen (game day/night cycle). "night" switches titles, subtitles and links to light
// colours; cards keep their own colours. Default "day" (the onboarding never sets it).
export type SkyTone = "day" | "night";
export const SkyToneContext = createContext<SkyTone>("day");
const useNight = () => useContext(SkyToneContext) === "night";

// Orange text reads poorly on the night sky; a lighter one is used there.
const nightInk = (c: string) => (c === colors.danger ? "#FF9A6B" : c === colors.petrol700 ? colors.yellow : c);

export function Eyebrow({ children, color, ink }: { children: ReactNode; color?: string; ink?: string }) {
  const night = useNight();
  const mark = color ?? colors.petrol700;
  const text = ink ?? color ?? colors.petrol700;
  return (
    <View style={styles.eyebrow}>
      <View style={[styles.diamond, { backgroundColor: night ? nightInk(mark) : mark }]} />
      <Text style={[styles.eyebrowText, { color: night ? nightInk(text) : text }]}>{children}</Text>
    </View>
  );
}

export function Title({ children }: { children: ReactNode }) {
  return <Text style={[styles.title, useNight() ? { color: colors.onPetrol } : null]}>{children}</Text>;
}

export function Sub({ children }: { children: ReactNode }) {
  return <Text style={[styles.sub, useNight() ? { color: colors.onPetrolSub } : null]}>{children}</Text>;
}

function InfoIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 16 16">
      <Circle cx={8} cy={8} r={6.5} fill="none" stroke={colors.petrol700} strokeWidth={1.6} />
      <Path d="M8 7v4M8 4.6v.1" stroke={colors.petrol700} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

// "How we use it" line under a question.
export function Why({ children }: { children: ReactNode }) {
  return (
    <View style={styles.why}>
      <View style={{ paddingTop: 3 }}>
        <InfoIcon />
      </View>
      <Text style={[styles.whyText, useNight() ? { color: colors.onPetrolSub } : null]}>{children}</Text>
    </View>
  );
}

// ---------- Tiles ----------

// Round (single choice) or rounded-square (multi-select) check mark.
export function Mark({ on, multi }: { on: boolean; multi?: boolean }) {
  const scale = useRef(new Animated.Value(1)).current;
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (on) {
      scale.setValue(0.6);
      Animated.spring(scale, { toValue: 1, ...springs.lively, useNativeDriver: true }).start();
    }
  }, [on, scale]);
  const fill = on ? colors.petrol800 : "none";
  const stroke = on ? colors.petrol800 : colors.line;
  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Svg width={24} height={24} viewBox="0 0 24 24">
        {multi ? (
          <Rect x={2} y={2} width={20} height={20} rx={6} fill={fill} stroke={stroke} strokeWidth={1.6} />
        ) : (
          <Circle cx={12} cy={12} r={10} fill={fill} stroke={stroke} strokeWidth={1.6} />
        )}
        {on ? (
          <DrawPath
            length={16}
            duration={280}
            delay={50}
            d="M7.5 12.5l3 3 6-6.5"
            fill="none"
            stroke={colors.yellow}
            strokeWidth={2.6}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : null}
      </Svg>
    </Animated.View>
  );
}

export function Tile({
  label,
  hint,
  on = false,
  dim = false,
  disabled = false,
  mark = "none",
  icon,
  locked = false,
  onPress,
  style,
}: {
  label: string;
  hint?: string;
  on?: boolean;
  dim?: boolean;
  disabled?: boolean;
  mark?: "none" | "single" | "multi";
  // Big tile with an icon box on the left (the "Who are you?" screen).
  icon?: ReactNode;
  locked?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <PressScale
      onPress={onPress}
      disabled={disabled || locked}
      accessibilityLabel={label}
      style={[
        styles.tile,
        icon ? styles.tileBig : null,
        on ? styles.tileOn : null,
        dim || locked ? styles.tileDim : null,
        style,
      ]}
    >
      {icon ? <View style={styles.tileIcon}>{icon}</View> : null}
      <View style={{ flex: 1 }}>
        <Text style={[styles.tileLabel, icon ? styles.tileLabelBig : null]}>{label}</Text>
        {hint ? <Text style={styles.tileHint}>{hint}</Text> : null}
      </View>
      {locked ? (
        <View style={styles.soon}>
          <Text style={styles.soonText}>SOON</Text>
        </View>
      ) : mark !== "none" ? (
        <Mark on={on} multi={mark === "multi"} />
      ) : null}
    </PressScale>
  );
}

// Grid of tiles: staggered entrance (140 ms + 45 ms per tile), one or two columns.
export function Tiles({ children, twoColumns }: { children: ReactNode[]; twoColumns?: boolean }) {
  return (
    <View style={[styles.tiles, twoColumns ? styles.tilesTwo : null]}>
      {children.map((child, i) => (
        <Enter key={i} from="below" delay={140 + i * 45} style={twoColumns ? styles.tileHalf : null}>
          {child}
        </Enter>
      ))}
    </View>
  );
}

// ---------- Buttons ----------

export function Cta({
  label,
  onPress,
  onPetrol,
  appear,
}: {
  label: string;
  onPress: () => void;
  onPetrol?: boolean;
  // Springy appearance (used when the button shows up after an animation).
  appear?: boolean;
}) {
  const button = (
    <PressScale onPress={onPress} accessibilityLabel={label} style={[styles.cta, onPetrol ? styles.ctaOnPetrol : null]}>
      <Text style={styles.ctaText}>{label}</Text>
    </PressScale>
  );
  if (!appear) return button;
  return (
    <Enter from="below" distance={16} spring={springs.lively}>
      {button}
    </Enter>
  );
}

export function LinkButton({
  label,
  onPress,
  onPetrol,
  hidden,
}: {
  label: string;
  onPress: () => void;
  onPetrol?: boolean;
  hidden?: boolean;
}) {
  const night = useNight();
  const light = onPetrol || night;
  return (
    <View style={{ opacity: hidden ? 0 : 1, alignItems: "center" }} pointerEvents={hidden ? "none" : "auto"}>
      <PressScale onPress={onPress} accessibilityLabel={label} style={{ padding: 10 }}>
        <Text style={[styles.link, light ? { color: colors.onPetrolMuted } : null]}>{label}</Text>
      </PressScale>
    </View>
  );
}

// ---------- Panels ----------

export function Panel({
  title,
  text,
  tint,
  children,
  style,
}: {
  title?: string;
  text?: string;
  // Account color: light tinted background.
  tint?: string;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.panel, tint ? { backgroundColor: mix(tint, colors.surface, 9) } : null, style]}>
      {title ? <Text style={styles.panelTitle}>{title}</Text> : null}
      {text ? <Text style={styles.panelText}>{text}</Text> : null}
      {children}
    </View>
  );
}

// Panel with a yellow left edge and a small uppercase label ("In the game", "What's next").
export function InGamePanel({ label, text }: { label: string; text: string }) {
  return (
    <View style={[styles.panel, styles.inGame]}>
      <Text style={styles.inGameLabel}>{label.toUpperCase()}</Text>
      <Text style={styles.panelText}>{text}</Text>
    </View>
  );
}

export function KeyValue({ k, v, tint }: { k: string; v: string; tint: string }) {
  return (
    <View style={[styles.kv, { borderTopColor: mix(tint, colors.surface, 22) }]}>
      <Text style={styles.kvKey}>{k}</Text>
      <Text style={styles.kvValue}>{v}</Text>
    </View>
  );
}

export const styles = StyleSheet.create({
  eyebrow: { flexDirection: "row", alignItems: "center", gap: 8 },
  diamond: { width: 8, height: 8, borderRadius: 2, transform: [{ rotate: "45deg" }] },
  eyebrowText: { fontFamily: font.extrabold, fontSize: 12, letterSpacing: 1, textTransform: "uppercase" },
  title: { fontFamily: font.extrabold, fontSize: 27, lineHeight: 31, color: colors.petrol950, letterSpacing: -0.5 },
  sub: { fontFamily: font.regular, fontSize: 15, lineHeight: 22, color: colors.muted },
  why: { flexDirection: "row", gap: 8, marginTop: -4 },
  whyText: { flex: 1, fontFamily: font.regular, fontSize: 14.5, lineHeight: 21, color: colors.muted },

  tiles: { gap: 10, marginTop: 6 },
  tilesTwo: { flexDirection: "row", flexWrap: "wrap" },
  tileHalf: { width: "48.5%" },
  tile: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: 16,
    paddingVertical: 16,
    paddingLeft: 16,
    paddingRight: 14,
    minHeight: 62,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    shadowColor: "#00262D",
    shadowOpacity: 0.05,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  tileBig: { padding: 18, gap: 14 },
  tileOn: { borderColor: colors.petrol800, backgroundColor: "#F7FBFB", ...shadow2 },
  tileDim: { opacity: 0.45 },
  tileIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.petrol100,
    alignItems: "center",
    justifyContent: "center",
  },
  tileLabel: { fontFamily: font.bold, fontSize: 16, lineHeight: 22, color: colors.ink },
  tileLabelBig: { fontFamily: font.extrabold, fontSize: 18, lineHeight: 24 },
  tileHint: { fontFamily: font.medium, fontSize: 13, lineHeight: 18, color: colors.muted, marginTop: 2 },
  soon: { backgroundColor: colors.surface2, borderRadius: 99, paddingHorizontal: 8, paddingVertical: 3 },
  soonText: { fontFamily: font.extrabold, fontSize: 10.5, letterSpacing: 0.8, color: colors.muted },

  cta: {
    backgroundColor: colors.yellow,
    borderRadius: 16,
    padding: 17,
    alignItems: "center",
    shadowColor: colors.yellow700,
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  ctaOnPetrol: { shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: 24, shadowOffset: { width: 0, height: 8 } },
  ctaText: { fontFamily: font.extrabold, fontSize: 17, color: colors.petrol950 },
  link: {
    fontFamily: font.semibold,
    fontSize: 14,
    color: colors.muted,
    textDecorationLine: "underline",
  },

  panel: { backgroundColor: colors.surface, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 16, gap: 4, ...shadow1 },
  panelTitle: { fontFamily: font.extrabold, fontSize: 16, lineHeight: 22, color: colors.ink },
  panelText: { fontFamily: font.regular, fontSize: 14.5, lineHeight: 21, color: colors.muted },
  inGame: { borderLeftWidth: 4, borderLeftColor: colors.yellow },
  inGameLabel: { fontFamily: font.extrabold, fontSize: 11.5, letterSpacing: 0.9, color: colors.petrol700 },
  kv: { flexDirection: "row", justifyContent: "space-between", gap: 12, borderTopWidth: 1, paddingTop: 6 },
  kvKey: { fontFamily: font.regular, fontSize: 14, color: colors.muted },
  kvValue: { flexShrink: 1, fontFamily: font.bold, fontSize: 14, color: colors.ink, textAlign: "right" },
});
