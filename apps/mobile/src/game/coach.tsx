// Coach tips on the real game screen (after the tutorial slides): the screen dims, one element is cut out and
// outlined (mission, actions + HUD, the Year · Learn · City switch), with a card explaining it. "Next" / "Skip".
// Elements register themselves with <CoachTarget id>; the overlay measures them in window coordinates (a Modal
// covers the whole window, so the numbers match).
import { tutorial } from "@piwco/content";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Animated, Modal, Pressable, StyleSheet, Text, useWindowDimensions, View, type ViewInstance } from "react-native";
import { buzz } from "../onboarding/anim";
import { colors, font, shadow2, springs } from "../theme";

type Registry = Map<string, ViewInstance>;
const CoachContext = createContext<Registry | null>(null);

export type CoachRegistry = Registry;

export function CoachProvider({ registry, children }: { registry: Registry; children: ReactNode }) {
  return <CoachContext.Provider value={registry}>{children}</CoachContext.Provider>;
}

export function CoachTarget({ id, children }: { id: string; children: ReactNode }) {
  const registry = useContext(CoachContext);
  return (
    <View
      collapsable={false}
      ref={(v) => {
        if (!registry) return;
        if (v) registry.set(id, v);
        else registry.delete(id);
      }}
    >
      {children}
    </View>
  );
}

type Rect = { x: number; y: number; w: number; h: number };

function measure(v: ViewInstance | undefined): Promise<Rect | null> {
  return new Promise((resolve) => {
    if (!v) return resolve(null);
    v.measureInWindow((x: number, y: number, w: number, h: number) => resolve(w > 0 && h > 0 ? { x, y, w, h } : null));
  });
}

const PAD = 8;
const DIM = "rgba(0,20,25,0.72)";

export function CoachOverlay({ registry, onDone }: { registry: Registry | null; onDone: () => void }) {
  const tips = tutorial.tips;
  const { width: W, height: H } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const fade = useRef(new Animated.Value(0)).current;
  const pop = useRef(new Animated.Value(0)).current;
  const tip = tips[index];

  useEffect(() => {
    let alive = true;
    if (!tip) return;
    measure(registry?.get(tip.id)).then((r) => {
      if (!alive) return;
      setRect(r);
      pop.setValue(0);
      Animated.spring(pop, { toValue: 1, ...springs.snappy, useNativeDriver: true }).start();
    });
    return () => {
      alive = false;
    };
  }, [tip, registry, pop]);

  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 260, useNativeDriver: true }).start();
  }, [fade]);

  if (!tip) return null;
  const next = () => {
    if (index >= tips.length - 1) {
      buzz("success");
      onDone();
    } else {
      buzz("tick");
      setIndex(index + 1);
    }
  };

  const r = rect ? { x: rect.x - PAD, y: rect.y - PAD, w: rect.w + 2 * PAD, h: rect.h + 2 * PAD } : null;
  // Card below the highlight when there is room, otherwise above it.
  const below = !r || r.y + r.h + 200 < H;
  const cardTop = r ? (below ? r.y + r.h + 12 : undefined) : H * 0.4;
  const cardBottom = r && !below ? H - r.y + 12 : undefined;

  return (
    <Modal transparent visible animationType="none" statusBarTranslucent onRequestClose={onDone}>
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: fade }]}>
        {r ? (
          <>
            <View style={[styles.dim, { left: 0, top: 0, width: W, height: Math.max(0, r.y) }]} />
            <View style={[styles.dim, { left: 0, top: r.y + r.h, width: W, height: Math.max(0, H - r.y - r.h) }]} />
            <View style={[styles.dim, { left: 0, top: r.y, width: Math.max(0, r.x), height: r.h }]} />
            <View style={[styles.dim, { left: r.x + r.w, top: r.y, width: Math.max(0, W - r.x - r.w), height: r.h }]} />
            <Animated.View
              pointerEvents="none"
              style={[styles.ring, { left: r.x, top: r.y, width: r.w, height: r.h, transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [1.08, 1] }) }] }]}
            />
          </>
        ) : (
          <View style={[styles.dim, StyleSheet.absoluteFill]} />
        )}
        <Animated.View
          style={[
            styles.card,
            { top: cardTop, bottom: cardBottom, opacity: pop, transform: [{ translateY: pop.interpolate({ inputRange: [0, 1], outputRange: [below ? 12 : -12, 0] }) }] },
          ]}
        >
          <View style={styles.cardHead}>
            <Text style={styles.count}>{`TIP ${index + 1} / ${tips.length}`}</Text>
            <Pressable hitSlop={10} onPress={() => { buzz("light"); onDone(); }} accessibilityRole="button" accessibilityLabel="Skip the tips">
              <Text style={styles.skip}>Skip</Text>
            </Pressable>
          </View>
          <Text style={styles.title}>{tip.title}</Text>
          <Text style={styles.text}>{tip.text}</Text>
          <Pressable onPress={next} style={styles.btn} accessibilityRole="button">
            <Text style={styles.btnText}>{index >= tips.length - 1 ? "Got it ✓" : "Next ›"}</Text>
          </Pressable>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  dim: { position: "absolute", backgroundColor: DIM },
  ring: { position: "absolute", borderRadius: 18, borderWidth: 3, borderColor: colors.yellow },
  card: { position: "absolute", left: 18, right: 18, backgroundColor: colors.surface, borderRadius: 18, padding: 16, gap: 6, ...shadow2 },
  cardHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  count: { fontFamily: font.extrabold, fontSize: 11.5, letterSpacing: 0.9, color: colors.petrol700 },
  skip: { fontFamily: font.bold, fontSize: 13, color: colors.muted },
  title: { fontFamily: font.extrabold, fontSize: 19, color: colors.petrol950 },
  text: { fontFamily: font.regular, fontSize: 14.5, lineHeight: 21, color: colors.ink },
  btn: { alignSelf: "flex-end", marginTop: 6, backgroundColor: colors.yellow, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 18 },
  btnText: { fontFamily: font.extrabold, fontSize: 14.5, color: colors.petrol950 },
});
