// The month's event lesson (end of the month, after the result): 3 swipeable info cards ("What happened",
// "What is X", "The math") → 2–3 "myth or fact?" cards → "Add to my plan" (a real-world step; scaffolding on the
// building while its debt is paid off). A prepared event (covered by a policy) shows only "The math".
import { useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, Text, View, type LayoutChangeEvent, type ScrollViewInstance, type NativeScrollEvent, type NativeSyntheticEvent } from "react-native";
import { buzz, Enter, useReducedMotion } from "../onboarding/anim";
import { Cta, LinkButton } from "../onboarding/ui";
import { colors, font, mix, shadow2, springs } from "../theme";
import { Confetti } from "./Confetti";
import type { BuiltEventLesson, InfoCard } from "./eventLesson";
import { SwipeLesson } from "./SwipeLesson";

type Stage = "info" | "quiz" | "plan";

export function EventLesson({
  lesson,
  monthName,
  damaged,
  onDone,
}: {
  lesson: BuiltEventLesson;
  monthName: string;
  // The plan's building has loan debt now (cracks): adding the plan puts up scaffolding.
  damaged: boolean;
  // `added` = the player tapped "Add to my plan".
  onDone: (added: boolean) => void;
}) {
  const [stage, setStage] = useState<Stage>("info");
  if (stage === "info") {
    const finish = () => {
      if (lesson.quiz.length > 0) setStage("quiz");
      else if (lesson.plan) setStage("plan");
      else onDone(false);
    };
    return <InfoCards cards={lesson.cards} monthName={monthName} prepared={lesson.prepared} onDone={finish} />;
  }
  if (stage === "quiz") {
    return (
      <SwipeLesson
        title="Myth or fact?"
        monthName={monthName}
        cards={lesson.quiz}
        eyebrow={`QUIZ · ${lesson.cards[0]?.title.toUpperCase() ?? monthName.toUpperCase()}`}
        doneSub="You know what to do next time. One step left: make it real."
        doneLabel="Make it real ›"
        onDone={() => (lesson.plan ? setStage("plan") : onDone(false))}
      />
    );
  }
  return lesson.plan ? <PlanCard plan={lesson.plan} building={lesson.building} damaged={damaged} onDone={onDone} /> : null;
}

function InfoCards({
  cards,
  monthName,
  prepared,
  onDone,
}: {
  cards: InfoCard[];
  monthName: string;
  prepared: boolean;
  onDone: () => void;
}) {
  const [width, setWidth] = useState(0);
  const [page, setPage] = useState(0);
  const scroll = useRef<ScrollViewInstance>(null);
  const x = useRef(new Animated.Value(0)).current;
  const last = page >= cards.length - 1;

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);
  const onEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (width <= 0) return;
    const p = Math.round(e.nativeEvent.contentOffset.x / width);
    if (p !== page) {
      buzz("tick");
      setPage(p);
    }
  };
  const next = () => {
    if (last) {
      buzz("light");
      onDone();
      return;
    }
    buzz("tick");
    scroll.current?.scrollTo({ x: (page + 1) * width, animated: true });
    setPage(page + 1);
  };

  return (
    <View style={{ flex: 1 }}>
      <Enter from="below" distance={8}>
        <Text style={styles.eyebrow}>{prepared ? `PREPARED · ${monthName.toUpperCase()}` : `WHAT HAPPENED THIS MONTH · ${monthName.toUpperCase()}`}</Text>
      </Enter>
      <Enter from="below" delay={60} distance={8}>
        <Text style={styles.title}>{prepared ? "This one didn't hurt" : "Let's look back at it"}</Text>
      </Enter>
      <View style={styles.pager} onLayout={onLayout}>
        {width > 0 ? (
          <Animated.ScrollView
            ref={scroll}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={onEnd}
            onScroll={Animated.event([{ nativeEvent: { contentOffset: { x } } }], { useNativeDriver: true })}
            scrollEventThrottle={16}
          >
            {cards.map((c, i) => (
              <View key={i} style={{ width, paddingHorizontal: 4, paddingVertical: 10 }}>
                <Enter from="right" delay={120 + i * 80} distance={24}>
                  <Card card={c} n={i + 1} total={cards.length} />
                </Enter>
              </View>
            ))}
          </Animated.ScrollView>
        ) : null}
      </View>
      {cards.length > 1 ? (
        <View style={styles.dots}>
          {cards.map((_, i) => {
            const w = width || 1;
            const scale = x.interpolate({ inputRange: [(i - 1) * w, i * w, (i + 1) * w], outputRange: [1, 2.6, 1], extrapolate: "clamp" });
            const opacity = x.interpolate({ inputRange: [(i - 1) * w, i * w, (i + 1) * w], outputRange: [0.4, 1, 0.4], extrapolate: "clamp" });
            return <Animated.View key={i} style={[styles.dot, { opacity, transform: [{ scaleX: scale }] }]} />;
          })}
        </View>
      ) : null}
      <Cta appear label={last ? (prepared ? "Nice, continue" : "Quiz time ›") : "Next ›"} onPress={next} />
    </View>
  );
}

function Card({ card, n, total }: { card: InfoCard; n: number; total: number }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <Text style={styles.kicker}>{card.kicker.toUpperCase()}</Text>
        {total > 1 ? <Text style={styles.count}>{`${n} / ${total}`}</Text> : null}
      </View>
      <Text style={styles.cardTitle}>{card.title}</Text>
      <Text style={styles.cardText}>{card.text}</Text>
      {card.lines && card.lines.length > 0 ? (
        <View style={styles.lines}>
          {card.lines.map((l, i) => (
            <Text key={i} style={[styles.line, l.startsWith("Borrowed") || l.startsWith("Unpaid") ? { color: colors.danger } : null]}>
              {`• ${l}`}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function PlanCard({
  plan,
  building,
  damaged,
  onDone,
}: {
  plan: { title: string; detail: string };
  building: "home" | "firm";
  damaged: boolean;
  onDone: (added: boolean) => void;
}) {
  const reduced = useReducedMotion();
  const [added, setAdded] = useState(false);
  const check = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!added) return;
    Animated.spring(check, { toValue: 1, ...springs.lively, useNativeDriver: true }).start();
    const t = setTimeout(() => onDone(true), reduced ? 500 : 1300);
    return () => clearTimeout(t);
  }, [added, check, onDone, reduced]);

  const name = building === "home" ? "Home" : "Company";
  const cityLine = damaged
    ? `Your ${name} gets scaffolding: repairs start now. The cracks go away once the loan is paid off.`
    : `It goes on "My plan" in your city.`;

  return (
    <View style={{ flex: 1 }}>
      <Enter from="below" distance={8}>
        <Text style={styles.eyebrow}>ADD TO MY PLAN</Text>
      </Enter>
      <Enter from="below" delay={60} distance={8}>
        <Text style={styles.title}>One step for your real life</Text>
      </Enter>
      <View style={styles.planWrap}>
        <Enter from="below" delay={140} distance={18}>
          <View style={[styles.card, added ? { borderColor: colors.success } : null]}>
            <View style={styles.planRow}>
              <View style={[styles.box, added ? { borderColor: colors.success } : null]}>
                <Animated.View style={[styles.boxFill, { opacity: check, transform: [{ scale: check }] }]}>
                  <Text style={styles.boxTick}>✓</Text>
                </Animated.View>
              </View>
              <Text style={[styles.cardTitle, { flex: 1 }]}>{plan.title}</Text>
            </View>
            <Text style={styles.cardText}>{plan.detail}</Text>
            <View style={styles.cityNote}>
              <Text style={styles.cityNoteText}>{cityLine}</Text>
            </View>
          </View>
        </Enter>
        {added && !reduced ? <Confetti count={40} /> : null}
      </View>
      <View style={{ gap: 4 }}>
        <Cta
          appear
          label={added ? "Added to my plan ✓" : "Add to my plan"}
          onPress={() => {
            if (added) return;
            buzz("success");
            setAdded(true);
          }}
        />
        <LinkButton label="Not now" hidden={added} onPress={() => onDone(false)} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  eyebrow: { fontFamily: font.extrabold, fontSize: 12, letterSpacing: 1.1, color: colors.yellow, paddingTop: 6 },
  title: { fontFamily: font.extrabold, fontSize: 26, lineHeight: 32, color: colors.onPetrol, marginTop: 6 },
  pager: { flex: 1, marginHorizontal: -4, justifyContent: "center" },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: "transparent",
    padding: 22,
    gap: 10,
    ...shadow2,
  },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  kicker: { fontFamily: font.extrabold, fontSize: 11.5, letterSpacing: 1, color: colors.petrol700 },
  count: { fontFamily: font.bold, fontSize: 12, color: colors.muted },
  cardTitle: { fontFamily: font.extrabold, fontSize: 22, lineHeight: 28, color: colors.petrol950 },
  cardText: { fontFamily: font.regular, fontSize: 16, lineHeight: 24, color: colors.ink },
  lines: { marginTop: 4, gap: 4, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.line },
  line: { fontFamily: font.semibold, fontSize: 14, lineHeight: 20, color: colors.ink },
  dots: { flexDirection: "row", justifyContent: "center", gap: 10, paddingVertical: 12 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.yellow },
  planWrap: { flex: 1, justifyContent: "center" },
  planRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  box: { width: 32, height: 32, borderRadius: 9, borderWidth: 2, borderColor: colors.line, alignItems: "center", justifyContent: "center" },
  boxFill: { position: "absolute", left: 0, top: 0, right: 0, bottom: 0, borderRadius: 7, backgroundColor: colors.success, alignItems: "center", justifyContent: "center" },
  boxTick: { fontFamily: font.extrabold, fontSize: 18, color: "#FFFFFF" },
  cityNote: { backgroundColor: mix(colors.yellow, colors.surface, 18), borderRadius: 12, padding: 12, marginTop: 2 },
  cityNoteText: { fontFamily: font.semibold, fontSize: 13.5, lineHeight: 19, color: colors.petrol950 },
});
