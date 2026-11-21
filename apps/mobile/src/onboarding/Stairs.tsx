// The 4-account "stairs" (Main Account -> Cushion -> Future -> Safety Package),
// arrows from the Main Account, the company house and the focus cards.
import type { AccountId } from "@piwco/content";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Animated, Easing, StyleSheet, Text, View, type LayoutRectangle } from "react-native";
import Svg, { Circle, Path, Rect, Text as SvgText } from "react-native-svg";
import { accountColors, colors, font, mix, shadow1, shadow2, springs } from "../theme";
import { DrawPath, PopG, useMountSpring } from "./anim";
import { accountById } from "./flow";

const WIDTHS: Record<AccountId, `${number}%`> = {
  main: "58%",
  cushion: "72%",
  future: "86%",
  protection: "100%",
};

const ARROW_TARGETS: AccountId[] = ["cushion", "future", "protection"];

// ---------- One block ----------

function Block({
  id,
  built,
  landDelay,
  compact,
  onLayout,
}: {
  id: AccountId;
  built: boolean;
  // When set, the block lands (slides in + shine) after this delay, on mount or when it gets built.
  landDelay: number | null;
  compact: boolean;
  onLayout: (l: LayoutRectangle) => void;
}) {
  const color = accountColors[id].color;
  const account = accountById(id);
  const isFoundation = id === "protection";
  const land = useRef(new Animated.Value(built && landDelay !== null ? 0 : 1)).current;
  const shine = useRef(new Animated.Value(0)).current;
  const wasBuilt = useRef<boolean | null>(null);

  useEffect(() => {
    const before = wasBuilt.current;
    wasBuilt.current = built;
    if (!built || landDelay === null || before === true) return;
    land.setValue(0);
    shine.setValue(0);
    const a = Animated.parallel([
      Animated.sequence([
        Animated.delay(landDelay),
        Animated.spring(land, { toValue: 1, ...springs.lively, useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.delay(landDelay + 220),
        Animated.timing(shine, {
          toValue: 1,
          duration: 900,
          easing: Easing.bezier(0.4, 0, 0.2, 1),
          useNativeDriver: true,
        }),
      ]),
    ]);
    a.start();
    return () => a.stop();
  }, [built, landDelay, land, shine]);

  const bg = !built ? colors.surface : isFoundation ? color : mix(color, colors.surface, 12);
  const titleColor = !built ? colors.muted : isFoundation ? "#FFFFFF" : colors.ink;
  const ruleColor = !built ? colors.muted : isFoundation ? "#BFD9DD" : colors.ink;
  const padV = compact ? (isFoundation ? 10 : 8) : isFoundation ? 14 : 10;

  return (
    <Animated.View
      onLayout={(e) => onLayout(e.nativeEvent.layout)}
      style={[
        styles.block,
        { width: WIDTHS[id], backgroundColor: bg },
        built ? (isFoundation ? shadow2 : shadow1) : styles.ghost,
        {
          opacity: land.interpolate({ inputRange: [0, 1], outputRange: [0, 1], extrapolate: "clamp" }),
          transform: [{ translateX: land.interpolate({ inputRange: [0, 1], outputRange: [34, 0] }) }],
        },
      ]}
    >
      <View style={[styles.blockInner, { paddingVertical: padV, paddingHorizontal: compact ? 12 : 13 }]}>
        {built ? (
          <View style={[styles.edge, { backgroundColor: isFoundation ? colors.yellow : color }]} />
        ) : null}
        <View style={{ opacity: built ? 1 : 0.35 }}>
          <Text style={[styles.blockTitle, { color: titleColor }]}>{account.name}</Text>
          {compact ? null : (
            <Text style={[styles.blockRule, { color: ruleColor }]}>{account.rule}</Text>
          )}
        </View>
        {/* Shine sweep: a fixed travel distance (wider than any block), clipped by the block. */}
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            { transform: [{ translateX: shine.interpolate({ inputRange: [0, 1], outputRange: [-460, 460] }) }] },
          ]}
        >
          <LinearGradient
            colors={["rgba(255,255,255,0)", "rgba(255,255,255,0.55)", "rgba(255,255,255,0)"]}
            locations={[0.3, 0.5, 0.7]}
            start={{ x: 0, y: 0.2 }}
            end={{ x: 1, y: 0.8 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      </View>
    </Animated.View>
  );
}

// ---------- Company house ----------

function House() {
  return (
    <Svg width={108} height={62} viewBox="0 0 108 62">
      <Path d="M8 25 54 4l46 21" fill="none" stroke={colors.petrol900} strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" />
      <Rect x={17} y={23} width={74} height={37} rx={6} fill="#fff" stroke={colors.petrol900} strokeWidth={2} />
      <Rect x={27} y={32} width={14} height={10} rx={2} fill={colors.yellow} />
      <Rect x={67} y={32} width={14} height={10} rx={2} fill={colors.yellow} />
      <Rect x={47} y={39} width={14} height={21} rx={2} fill={colors.petrol900} />
      <SvgText x={54} y={20} textAnchor="middle" fontFamily={font.extrabold} fontSize={8} letterSpacing={0.9} fill={colors.petrol900}>
        COMPANY
      </SvgText>
    </Svg>
  );
}

// The house's space is reserved from the start, so the stairs never move (no per-frame relayout of the
// blocks and arrows); only the house itself drops in, on the native thread.
function Firm({ on, animate }: { on: boolean; animate: boolean }) {
  const drop = useRef(new Animated.Value(on ? 1 : 0)).current;
  useEffect(() => {
    if (!on || !animate) return;
    const a = Animated.spring(drop, { toValue: 1, ...springs.lively, useNativeDriver: true });
    a.start();
    return () => a.stop();
  }, [on, animate, drop]);
  return (
    <Animated.View style={styles.firm}>
      <Animated.View
        style={{
          opacity: drop.interpolate({ inputRange: [0, 1], outputRange: [0, 1], extrapolate: "clamp" }),
          transform: [{ translateY: drop.interpolate({ inputRange: [0, 1], outputRange: [-70, 0] }) }],
        }}
      >
        <House />
      </Animated.View>
    </Animated.View>
  );
}

// ---------- Stairs ----------

export type ArrowsSpec = {
  ids: AccountId[];
  // Arrows to these accounts draw themselves; the rest appear instantly.
  animate: AccountId[];
  delay?: number;
};

export function Stairs({
  built,
  landDelays = {},
  compact = false,
  firm,
  arrows,
}: {
  built: AccountId[];
  landDelays?: Partial<Record<AccountId, number>>;
  compact?: boolean;
  firm?: { on: boolean; animate: boolean };
  arrows?: ArrowsSpec | null;
}) {
  const [layouts, setLayouts] = useState<Partial<Record<AccountId, LayoutRectangle>>>({});
  const setLayout = (id: AccountId) => (l: LayoutRectangle) =>
    setLayouts((prev) => {
      const p = prev[id];
      if (p && p.x === l.x && p.y === l.y && p.width === l.width && p.height === l.height) return prev;
      return { ...prev, [id]: l };
    });

  const k = layouts.main;
  const arrowEls: ReactNode[] = [];
  if (arrows && k) {
    const x0 = k.x;
    const y0 = k.y + k.height / 2;
    ARROW_TARGETS.forEach((id, i) => {
      const r = layouts[id];
      if (!arrows.ids.includes(id) || !r) return;
      const x1 = r.x;
      const y1 = r.y + r.height / 2;
      const cx = 6 - i * 3;
      const color = accountColors[id].color;
      const d = `M${x0} ${y0} C ${cx} ${y0}, ${cx} ${y1}, ${x1 - 2} ${y1}`;
      const head = `M${x1 - 7} ${y1 - 3.5} L${x1} ${y1} L${x1 - 7} ${y1 + 3.5} Z`;
      const common = { d, fill: "none", stroke: color, strokeWidth: 2.2, strokeLinecap: "round" as const };
      if (arrows.animate.includes(id)) {
        const only = arrows.animate.length === 1;
        const delay = (arrows.delay ?? 0) + (only ? 150 : i * 160);
        const length = Math.abs(x0 - cx) + Math.abs(x1 - cx) + Math.abs(y1 - y0) + 20;
        arrowEls.push(
          <DrawPath key={`a-${id}`} {...common} length={length} delay={delay} duration={800} />,
          <PopG key={`h-${id}`} delay={delay + 650}>
            <Path d={head} fill={color} />
          </PopG>,
        );
      } else {
        arrowEls.push(<Path key={`s-${id}`} {...common} />, <Path key={`sh-${id}`} d={head} fill={color} />);
      }
    });
  }

  return (
    <View>
      {firm ? (
        <View style={styles.firmRow}>
          <Firm on={firm.on} animate={firm.animate} />
        </View>
      ) : null}
      <View style={styles.stairs}>
        {(["main", "cushion", "future", "protection"] as AccountId[]).map((id) => (
          <Block
            key={id}
            id={id}
            built={built.includes(id)}
            landDelay={landDelays[id] ?? null}
            compact={compact}
            onLayout={setLayout(id)}
          />
        ))}
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <Svg width="100%" height="100%" style={{ overflow: "visible" }}>
            {arrowEls}
          </Svg>
        </View>
      </View>
      <Text style={styles.foundation}>FINANCIAL LIQUIDITY</Text>
    </View>
  );
}

// ---------- Focus cards ----------

function FocusIcon({ id, color }: { id: AccountId; color: string }) {
  const s = { fill: "none", stroke: color, strokeWidth: 2 } as const;
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24">
      {id === "main" ? (
        <>
          <Rect x={3} y={6} width={18} height={13} rx={3} {...s} />
          <Path d="M3 10h18M16 14.5h2" {...s} strokeLinecap="round" />
        </>
      ) : id === "cushion" ? (
        <>
          <Path d="M4 9c0-2 2-3 8-3s8 1 8 3v6c0 2-2 3-8 3s-8-1-8-3z" {...s} />
          <Path d="M8 12h8" {...s} strokeLinecap="round" />
        </>
      ) : id === "future" ? (
        <>
          <Path d="M4 18l5-5 4 3 7-8" {...s} strokeLinecap="round" strokeLinejoin="round" />
          <Path d="M15 8h5v5" {...s} strokeLinecap="round" strokeLinejoin="round" />
        </>
      ) : (
        <>
          <Path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" {...s} strokeLinejoin="round" />
          <Path d="M9 12l2 2 4-4" {...s} strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}
    </Svg>
  );
}

function FocusVisual({ id, color }: { id: AccountId; color: string }) {
  if (id === "main") {
    return (
      <Svg width={118} height={62} viewBox="0 0 118 62">
        <DrawPath length={40} delay={250} duration={700} d="M4 31 H40" stroke={color} strokeWidth={3} strokeLinecap="round" />
        <Path d="M34 25 l7 6 -7 6" fill="none" stroke={color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
        <PopG delay={520}>
          <Rect x={44} y={16} width={30} height={30} rx={8} fill={color} opacity={0.9} />
        </PopG>
        <DrawPath length={60} delay={370} duration={700} d="M74 31 C 92 31, 92 10, 112 10" fill="none" stroke="#22A088" strokeWidth={2.5} strokeLinecap="round" />
        <DrawPath length={40} delay={490} duration={700} d="M74 31 H112" fill="none" stroke="#2C7DA6" strokeWidth={2.5} strokeLinecap="round" />
        <DrawPath length={60} delay={610} duration={700} d="M74 31 C 92 31, 92 52, 112 52" fill="none" stroke="#0B4F5C" strokeWidth={2.5} strokeLinecap="round" />
      </Svg>
    );
  }
  if (id === "cushion") {
    return (
      <Svg width={118} height={62} viewBox="0 0 118 62">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <PopG key={i} delay={220 + i * 70}>
            <Rect x={4 + i * 19} y={50 - (i + 1) * 7} width={14} height={(i + 1) * 7} rx={3} fill={color} opacity={i >= 2 ? 1 : 0.3} />
          </PopG>
        ))}
        <Path d="M42 58 H116" stroke={color} strokeWidth={2} strokeLinecap="round" />
      </Svg>
    );
  }
  if (id === "future") {
    return (
      <Svg width={118} height={62} viewBox="0 0 118 62">
        <Path d="M4 44 H114" stroke="#9FB2B6" strokeWidth={2} strokeDasharray={[4, 5]} />
        <SvgText x={114} y={56} textAnchor="end" fontSize={9} fontFamily={font.bold} fill="#7A8E93">
          inflation
        </SvgText>
        <DrawPath length={140} delay={250} duration={700} d="M4 52 C 40 48, 70 34, 112 8" fill="none" stroke={color} strokeWidth={3.5} strokeLinecap="round" />
        <PopG delay={520}>
          <Circle cx={112} cy={8} r={5} fill={color} />
        </PopG>
      </Svg>
    );
  }
  const bars = [
    { x: 64, y: 4, w: 50, h: 10, rx: 3, fill: "#F2C200" },
    { x: 54, y: 17, w: 60, h: 10, rx: 3, fill: "#22A088" },
    { x: 44, y: 30, w: 70, h: 10, rx: 3, fill: "#2C7DA6" },
    { x: 4, y: 44, w: 110, h: 14, rx: 4, fill: color },
  ];
  return (
    <Svg width={118} height={62} viewBox="0 0 118 62">
      {bars.map((b, i) => (
        <PopG key={i} delay={220 + i * 70}>
          <Rect x={b.x} y={b.y} width={b.w} height={b.h} rx={b.rx} fill={b.fill} />
        </PopG>
      ))}
    </Svg>
  );
}

function CardShell({ barColor, children }: { barColor: string; children: ReactNode }) {
  const v = useMountSpring(springs.soft);
  return (
    <Animated.View
      style={[
        styles.cardShadow,
        {
          opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0, 1], extrapolate: "clamp" }),
          transform: [
            { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) },
            { scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) },
          ],
        },
      ]}
    >
      <View style={styles.card}>
        <View style={[styles.cardBar, { backgroundColor: barColor }]} />
        {children}
      </View>
    </Animated.View>
  );
}

export function FocusCard({ id }: { id: AccountId }) {
  const { color, ink } = accountColors[id];
  const account = accountById(id);
  const big = useMountSpring(springs.lively, 140);
  return (
    <CardShell barColor={color}>
      <View style={styles.fhead}>
        <View style={[styles.ficon, { backgroundColor: mix(color, "#FFFFFF", 16) }]}>
          <FocusIcon id={id} color={ink} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.fsmall}>{`ACCOUNT ${account.focusStep.toUpperCase()}`}</Text>
          <Text style={styles.fname}>{account.name}</Text>
        </View>
      </View>
      <View style={styles.fmid}>
        <Animated.View
          style={{
            flexShrink: 1,
            opacity: big.interpolate({ inputRange: [0, 1], outputRange: [0, 1], extrapolate: "clamp" }),
            transform: [{ translateY: big.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
          }}
        >
          <Text style={styles.fbig}>{account.focusBig}</Text>
          <Text style={styles.funit}>{account.focusUnit}</Text>
        </Animated.View>
        <FocusVisual id={id} color={color} />
      </View>
      <Text style={styles.ftext}>{account.explainText}</Text>
    </CardShell>
  );
}

export function FinalFocusCard() {
  const chips: { label: string; color: string }[] = [
    { label: "Income", color: accountColors.main.color },
    { label: "Main Account", color: accountColors.main.color },
    { label: "Cushion", color: accountColors.cushion.color },
    { label: "Future", color: accountColors.future.color },
    { label: "Package", color: "#0B4F5C" },
    { label: "rest to spend", color: colors.line },
  ];
  const arrowAfter = new Set([0, 1, 4]);
  return (
    <CardShell barColor={colors.petrol700}>
      <View style={styles.fhead}>
        <View style={[styles.ficon, { backgroundColor: mix(colors.yellow, "#FFFFFF", 16) }]}>
          <Svg width={22} height={22} viewBox="0 0 24 24">
            <Path d="M5 12h14M13 6l6 6-6 6" fill="none" stroke={colors.petrol800} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.fsmall}>HOW IT WORKS</Text>
          <Text style={styles.fname}>Money flows from the top down</Text>
        </View>
      </View>
      <View style={styles.fflow}>
        {chips.map((c, i) => (
          <View key={c.label} style={styles.fflowItem}>
            <View style={[styles.chip, { backgroundColor: mix(c.color, "#FFFFFF", 16) }]}>
              <Text style={styles.chipText}>{c.label}</Text>
            </View>
            {arrowAfter.has(i) ? <Text style={styles.chipArrow}>→</Text> : null}
          </View>
        ))}
      </View>
      <Text style={styles.ftext}>
        Right after money comes in, transfer fixed amounts from the Main Account to the other three. Only what's left
        is yours to spend. Everything stands on the foundation.
      </Text>
    </CardShell>
  );
}

const styles = StyleSheet.create({
  stairs: { gap: 6, paddingLeft: 30 },
  block: { alignSelf: "flex-end", borderRadius: 14, borderWidth: 1.5, borderColor: "transparent" },
  ghost: { borderStyle: "dashed", borderColor: colors.line },
  blockInner: { borderRadius: 13, overflow: "hidden" },
  edge: { position: "absolute", left: 0, top: 0, bottom: 0, width: 4 },
  blockTitle: { fontFamily: font.extrabold, fontSize: 15, lineHeight: 20 },
  blockRule: { fontFamily: font.regular, fontSize: 13, lineHeight: 17.5 },
  firmRow: { paddingLeft: 30, marginBottom: 6 },
  firm: { alignSelf: "flex-end", width: "58%", height: 66, alignItems: "center", justifyContent: "center" },
  foundation: {
    textAlign: "center",
    fontFamily: font.bold,
    fontSize: 11.5,
    letterSpacing: 1.15,
    color: colors.muted,
    paddingLeft: 30,
    marginTop: 6,
  },

  cardShadow: { borderRadius: 20, backgroundColor: colors.surface, ...shadow2 },
  card: { borderRadius: 20, overflow: "hidden", paddingTop: 16, paddingHorizontal: 16, paddingBottom: 15, gap: 10 },
  cardBar: { position: "absolute", left: 0, top: 0, right: 0, height: 4 },
  fhead: { flexDirection: "row", alignItems: "center", gap: 12 },
  ficon: { width: 42, height: 42, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  fsmall: { fontFamily: font.extrabold, fontSize: 11.5, letterSpacing: 0.9, color: colors.muted },
  fname: { fontFamily: font.extrabold, fontSize: 18, lineHeight: 23, color: colors.petrol950 },
  fmid: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 14 },
  fbig: { fontFamily: font.extrabold, fontSize: 40, lineHeight: 44, letterSpacing: -1.2, color: colors.petrol950 },
  funit: { fontFamily: font.semibold, fontSize: 13, color: colors.muted },
  ftext: { fontFamily: font.regular, fontSize: 14.5, lineHeight: 21, color: colors.muted },
  fflow: { flexDirection: "row", flexWrap: "wrap", gap: 6, alignItems: "center" },
  fflowItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  chip: { borderRadius: 99, paddingVertical: 4, paddingHorizontal: 9 },
  chipText: { fontFamily: font.bold, fontSize: 12.5, color: colors.ink },
  chipArrow: { fontFamily: font.bold, fontSize: 12.5, color: colors.muted },
});
