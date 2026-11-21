// Tutorial after the survey (before "Welcome to the game"), also opened from the "?" on the game screen:
// 5 swipeable slides on the night sky (how PIWCO works, a month, the city, lessons, what you get), each with a small
// animated illustration (app Text over shapes, no SVG text). "Skip" in the corner; the last slide starts the game.
import { tutorial, type TutorialSlide } from "@piwco/content";
import type { CityView } from "@piwco/engine";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Animated, Easing, Pressable, StyleSheet, Text, View, type LayoutChangeEvent, type ScrollViewInstance } from "react-native";
import { CityScene } from "../city/CityScene";
import { buzz, Enter, useReducedMotion } from "../onboarding/anim";
import { Cta } from "../onboarding/ui";
import { accountColors, colors, font, springs } from "../theme";

// ---- Illustrations (one per slide id) ----

function Pop({ delay, children, style }: { delay: number; children?: ReactNode; style?: object }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.sequence([Animated.delay(delay), Animated.spring(v, { toValue: 1, ...springs.lively, useNativeDriver: true })]).start();
  }, [v, delay]);
  return <Animated.View style={[style, { opacity: v, transform: [{ scale: v }] }]}>{children}</Animated.View>;
}

function YearArt() {
  return (
    <View style={art.grid}>
      {Array.from({ length: 12 }, (_, i) => (
        <Pop key={i} delay={150 + i * 70} style={[art.month, i === 0 ? art.monthNow : null]}>
          <Text style={[art.monthText, i === 0 ? { color: colors.petrol950 } : null]}>{i + 1}</Text>
        </Pop>
      ))}
    </View>
  );
}

function MonthArt() {
  const reduced = useReducedMotion();
  const shake = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduced) return;
    const kick = (a: number) => Animated.timing(shake, { toValue: a, duration: 50, useNativeDriver: true });
    const loop = Animated.loop(Animated.sequence([Animated.delay(1300), kick(6), kick(-6), kick(4), kick(-4), kick(0)]));
    loop.start();
    return () => loop.stop();
  }, [shake, reduced]);
  const steps = [
    { label: "Mission", mark: "✓", bg: colors.yellow, ink: colors.petrol950 },
    { label: "Alarm", mark: "!", bg: "#D62828", ink: "#FFFFFF" },
    { label: "Decide", mark: "?", bg: colors.surface, ink: colors.petrol950 },
    { label: "Receipt", mark: "=", bg: accountColors.cushion.color, ink: "#FFFFFF" },
  ];
  return (
    <View style={art.row}>
      {steps.map((s, i) => (
        <Pop key={s.label} delay={150 + i * 220} style={{ alignItems: "center", gap: 6 }}>
          <Animated.View style={[art.step, { backgroundColor: s.bg }, s.mark === "!" ? { transform: [{ translateX: shake }] } : null]}>
            <Text style={[art.stepMark, { color: s.ink }]}>{s.mark}</Text>
          </Animated.View>
          <Text style={art.stepLabel}>{s.label}</Text>
        </Pop>
      ))}
    </View>
  );
}

const DEMO_CITY: CityView = {
  levels: { home: 2, firm: 2, vault: 1, shield: 1, future: 0 },
  clouds: { home: false, firm: false },
  damaged: { home: false, firm: true },
  rentedHome: false,
};

function CityArt() {
  return (
    <Enter from="below" delay={120} distance={16}>
      <View style={{ width: "100%" }}>
        <CityScene city={DEMO_CITY} night />
      </View>
    </Enter>
  );
}

function LessonArt() {
  const reduced = useReducedMotion();
  const x = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduced) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(700),
        Animated.timing(x, { toValue: -26, duration: 380, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(x, { toValue: 26, duration: 620, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.spring(x, { toValue: 0, ...springs.lively, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [x, reduced]);
  return (
    <View style={{ alignItems: "center", gap: 14 }}>
      <Animated.View
        style={[art.card, { transform: [{ translateX: x }, { rotate: x.interpolate({ inputRange: [-26, 26], outputRange: ["-5deg", "5deg"] }) }] }]}
      >
        <Text style={art.cardText}>“A cushion is money you don't have yet.”</Text>
      </Animated.View>
      <View style={art.row}>
        <View style={[art.pill, { backgroundColor: colors.danger }]}>
          <Text style={art.pillText}>‹ MYTH</Text>
        </View>
        <View style={[art.pill, { backgroundColor: colors.success }]}>
          <Text style={art.pillText}>FACT ›</Text>
        </View>
      </View>
    </View>
  );
}

function GainArt() {
  const bars = [
    { c: accountColors.main.color, h: 0.55 },
    { c: accountColors.cushion.color, h: 0.75 },
    { c: accountColors.future.color, h: 0.95 },
    { c: accountColors.protection.color, h: 0.65 },
  ];
  return (
    <View style={[art.row, { alignItems: "flex-end", height: 130 }]}>
      {bars.map((b, i) => (
        <Grow key={i} delay={150 + i * 160} height={130 * b.h} color={b.c} />
      ))}
    </View>
  );
}

function Grow({ delay, height, color }: { delay: number; height: number; color: string }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.sequence([Animated.delay(delay), Animated.spring(v, { toValue: 1, ...springs.bar, useNativeDriver: true })]).start();
  }, [v, delay]);
  return (
    <View style={{ height, width: 40, justifyContent: "flex-end" }}>
      <Animated.View
        style={{
          height,
          borderRadius: 10,
          backgroundColor: color,
          transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [height / 2, 0] }) }, { scaleY: v }],
        }}
      />
    </View>
  );
}

const ART: Record<string, () => ReactNode> = {
  year: () => <YearArt />,
  month: () => <MonthArt />,
  city: () => <CityArt />,
  lessons: () => <LessonArt />,
  gain: () => <GainArt />,
};

// ---- Slides ----

function Slide({ slide, visible }: { slide: TutorialSlide; visible: boolean }) {
  // The illustration (re)mounts when its slide comes into view, so its animation plays then.
  return (
    <View style={styles.slide}>
      <View style={styles.art}>{visible ? ART[slide.id]?.() ?? null : null}</View>
      <Text style={styles.eyebrow}>{slide.eyebrow.toUpperCase()}</Text>
      <Text style={styles.title}>{slide.title}</Text>
      <Text style={styles.text}>{slide.text}</Text>
      <View style={styles.points}>
        {slide.points.map((p, i) => (
          <View key={i} style={styles.point}>
            <View style={styles.diamond} />
            <Text style={styles.pointText}>{p}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export function Tutorial({ finishLabel = "Let's play ›", onDone }: { finishLabel?: string; onDone: () => void }) {
  const slides = tutorial.slides;
  const [width, setWidth] = useState(0);
  const [page, setPage] = useState(0);
  const scroll = useRef<ScrollViewInstance>(null);
  const x = useRef(new Animated.Value(0)).current;
  const last = page >= slides.length - 1;

  const go = (p: number) => {
    scroll.current?.scrollTo({ x: p * width, animated: true });
    setPage(p);
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.head}>
        <Text style={styles.count}>{`${page + 1} / ${slides.length}`}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Skip the tutorial" hitSlop={12} onPress={() => { buzz("light"); onDone(); }}>
          <Text style={styles.skip}>Skip</Text>
        </Pressable>
      </View>
      <View style={{ flex: 1, marginHorizontal: -18 }} onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}>
        {width > 0 ? (
          <Animated.ScrollView
            ref={scroll}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            scrollEventThrottle={16}
            onScroll={Animated.event([{ nativeEvent: { contentOffset: { x } } }], { useNativeDriver: true })}
            onMomentumScrollEnd={(e) => {
              const p = Math.round(e.nativeEvent.contentOffset.x / width);
              if (p !== page) {
                buzz("tick");
                setPage(p);
              }
            }}
          >
            {slides.map((s, i) => (
              <View key={s.id} style={{ width, paddingHorizontal: 18 }}>
                <Slide slide={s} visible={Math.abs(i - page) <= 0} />
              </View>
            ))}
          </Animated.ScrollView>
        ) : null}
      </View>
      <View style={styles.dots}>
        {slides.map((_, i) => {
          const w = width || 1;
          const range = [(i - 1) * w, i * w, (i + 1) * w];
          return (
            <Animated.View
              key={i}
              style={[
                styles.dot,
                {
                  opacity: x.interpolate({ inputRange: range, outputRange: [0.35, 1, 0.35], extrapolate: "clamp" }),
                  transform: [{ scaleX: x.interpolate({ inputRange: range, outputRange: [1, 2.6, 1], extrapolate: "clamp" }) }],
                },
              ]}
            />
          );
        })}
      </View>
      <Cta
        label={last ? finishLabel : "Next ›"}
        onPress={() => {
          if (last) {
            buzz("success");
            onDone();
          } else {
            buzz("tick");
            go(page + 1);
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 6 },
  count: { fontFamily: font.bold, fontSize: 13, color: colors.onPetrolMuted },
  skip: { fontFamily: font.extrabold, fontSize: 14, color: colors.onPetrolSub },
  slide: { flex: 1, justifyContent: "center", gap: 10 },
  art: { minHeight: 170, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  eyebrow: { fontFamily: font.extrabold, fontSize: 12, letterSpacing: 1.1, color: colors.yellow },
  title: { fontFamily: font.extrabold, fontSize: 28, lineHeight: 34, color: colors.onPetrol },
  text: { fontFamily: font.regular, fontSize: 16, lineHeight: 24, color: colors.onPetrolSub },
  points: { gap: 8, marginTop: 6 },
  point: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  diamond: { width: 8, height: 8, marginTop: 7, backgroundColor: colors.yellow, transform: [{ rotate: "45deg" }] },
  pointText: { flex: 1, fontFamily: font.semibold, fontSize: 15, lineHeight: 22, color: colors.onPetrol },
  dots: { flexDirection: "row", justifyContent: "center", gap: 10, paddingVertical: 12 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.yellow },
});

const art = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", width: 6 * 44, gap: 8, justifyContent: "center" },
  month: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
  },
  monthNow: { backgroundColor: colors.yellow, borderColor: colors.yellow },
  monthText: { fontFamily: font.extrabold, fontSize: 14, color: colors.onPetrol },
  row: { flexDirection: "row", gap: 14, justifyContent: "center" },
  step: { width: 54, height: 54, borderRadius: 27, alignItems: "center", justifyContent: "center" },
  stepMark: { fontFamily: font.extrabold, fontSize: 24 },
  stepLabel: { fontFamily: font.bold, fontSize: 12, color: colors.onPetrolSub },
  card: { width: 230, backgroundColor: colors.surface, borderRadius: 18, padding: 18 },
  cardText: { fontFamily: font.bold, fontSize: 16, lineHeight: 22, color: colors.petrol950, textAlign: "center" },
  pill: { borderRadius: 99, paddingVertical: 7, paddingHorizontal: 14 },
  pillText: { fontFamily: font.extrabold, fontSize: 12.5, letterSpacing: 0.8, color: "#FFFFFF" },
});
