// Interactive lesson: a full-screen stack of cards. Three kinds (same card, background, progress and buttons):
// - "myth or fact?": swipe left = MYTH, right = FACT, or tap the two symmetric buttons (they react to the drag);
// - info: an explanation (+ optional visual and "Read more ▾"); swipe either way or "Got it" = next, no score;
// - choice: two options on the card's left / right half; swipe towards one or tap it.
// Every answer gets an explanation; no penalty. Ends with a "Lesson complete" screen.
import type { ChoiceLessonCard, InfoLessonCard, SwipeCard } from "@piwco/content";
import { ScrollView } from "react-native";
import { LevelBars } from "../invest/LevelBars";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Animated,
  Easing,
  PanResponder,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { buzz, Enter, PressScale, useMountSpring, useReducedMotion } from "../onboarding/anim";
import { Cta, SkyToneContext } from "../onboarding/ui";
import { colors, font, mix, springs } from "../theme";
import { Confetti } from "./Confetti";
import { SoundToggle } from "./SoundToggle";

type Stage = "card" | "feedback" | "done";
// Per card: right / wrong answer, "seen" (info card), or not reached yet.
type Res = boolean | "seen" | null;

const graded = (c: SwipeCard) => c.kind !== "info";
// Swiped / tapped towards the right?
function isCorrect(c: SwipeCard, right: boolean): boolean {
  if (c.kind === "choice") return (c.correct === "right") === right;
  if (c.kind === "info") return true;
  return c.isFact === right;
}

// Pops in with a springy scale (used for segments, verdict marks, the final check).
function Pop({ children, delay = 0, style }: { children?: ReactNode; delay?: number; style?: object }) {
  const v = useMountSpring(springs.lively, delay);
  return (
    <Animated.View style={[style, { opacity: v.interpolate({ inputRange: [0, 0.3], outputRange: [0, 1], extrapolate: "clamp" }), transform: [{ scale: v }] }]}>
      {children}
    </Animated.View>
  );
}

// One segment per card: answered right (green), wrong (orange), current (white outline), upcoming (dim).
function Progress({ results, index }: { results: Res[]; index: number }) {
  return (
    <View style={styles.progress}>
      {results.map((r, i) => (
        <View key={i} style={[styles.segment, i === index && r === null ? styles.segmentCurrent : null]}>
          {r !== null ? (
            <Pop style={[StyleSheet.absoluteFill, { borderRadius: 4, backgroundColor: r === "seen" ? colors.yellow : r ? colors.success : colors.danger }]} />
          ) : null}
        </View>
      ))}
    </View>
  );
}

function statementSize(text: string): { fontSize: number; lineHeight: number } {
  if (text.length <= 70) return { fontSize: 31, lineHeight: 39 };
  if (text.length <= 110) return { fontSize: 27, lineHeight: 35 };
  return { fontSize: 24, lineHeight: 31 };
}

// The card being swiped. The drag value lives in the parent so the buttons and edge glows react too.
function CardFace({
  card,
  number,
  pan,
  width,
  threshold,
  reduced,
  panHandlers,
  onPick,
}: {
  card: SwipeCard;
  number: number;
  pan: Animated.Value;
  width: number;
  threshold: number;
  reduced: boolean;
  panHandlers: object;
  // Choice card: a half was tapped (true = right).
  onPick: (right: boolean) => void;
}) {
  const enter = useMountSpring(springs.lively);
  const rotate = pan.interpolate({
    inputRange: [-width, 0, width],
    outputRange: reduced ? ["0deg", "0deg", "0deg"] : ["-16deg", "0deg", "16deg"],
  });
  const fact = pan.interpolate({ inputRange: [0, threshold], outputRange: [0, 1], extrapolate: "clamp" });
  const myth = pan.interpolate({ inputRange: [-threshold, 0], outputRange: [1, 0], extrapolate: "clamp" });
  return (
    <Animated.View
      {...panHandlers}
      style={[
        styles.card,
        StyleSheet.absoluteFill,
        {
          opacity: enter.interpolate({ inputRange: [0, 0.4], outputRange: [0, 1], extrapolate: "clamp" }),
          transform: [
            { translateX: pan },
            { translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) },
            { rotate },
            { scale: enter.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) },
          ],
        },
      ]}
    >
      {card.kind === "info" ? (
        <InfoFace card={card} number={number} />
      ) : card.kind === "choice" ? (
        <ChoiceFace card={card} number={number} right={fact} left={myth} onPick={onPick} />
      ) : (
        <>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.tint, { backgroundColor: colors.success, opacity: Animated.multiply(fact, 0.14) }]} />
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.tint, { backgroundColor: colors.danger, opacity: Animated.multiply(myth, 0.14) }]} />
      <View style={styles.cardTop}>
        <View style={styles.chip}>
          <Text style={styles.chipText}>MYTH OR FACT?</Text>
        </View>
        <Text style={styles.cardNo}>{`#${number}`}</Text>
      </View>
      <View style={styles.cardMiddle}>
        <Text style={[styles.statement, statementSize(card.statement)]}>{card.statement}</Text>
      </View>
      <Text style={styles.swipeHint}>← swipe or tap →</Text>
      <Animated.View pointerEvents="none" style={[styles.stamp, styles.stampFact, { opacity: fact, transform: [{ rotate: "-12deg" }, { scale: fact.interpolate({ inputRange: [0, 1], outputRange: [1.4, 1] }) }] }]}>
        <Text style={[styles.stampText, { color: colors.success }]}>FACT</Text>
      </Animated.View>
      <Animated.View pointerEvents="none" style={[styles.stamp, styles.stampMyth, { opacity: myth, transform: [{ rotate: "12deg" }, { scale: myth.interpolate({ inputRange: [0, 1], outputRange: [1.4, 1] }) }] }]}>
        <Text style={[styles.stampText, { color: colors.danger }]}>MYTH</Text>
      </Animated.View>
        </>
      )}
    </Animated.View>
  );
}

function CardTop({ chip, number }: { chip: string; number: number }) {
  return (
    <View style={styles.cardTop}>
      <View style={styles.chip}>
        <Text style={styles.chipText}>{chip}</Text>
      </View>
      <Text style={styles.cardNo}>{`#${number}`}</Text>
    </View>
  );
}

function InfoVisual({ visual }: { visual: NonNullable<InfoLessonCard["visual"]> }) {
  if (visual.type === "bars") {
    return (
      <View style={styles.visual}>
        <LevelBars big label="Return" value={visual.returnLevel} color={colors.success} />
        <LevelBars big label="Risk" value={visual.riskLevel} color={colors.danger} />
      </View>
    );
  }
  if (visual.type === "number") {
    return (
      <View style={[styles.visual, { alignItems: "flex-start" }]}>
        <Text style={styles.visualNumber}>{visual.value}</Text>
        <Text style={styles.visualLabel}>{visual.label}</Text>
      </View>
    );
  }
  return (
    <View style={[styles.visual, { gap: 8 }]}>
      {visual.rows.map((r) => (
        <View key={r.label} style={styles.visualRow}>
          <Text style={styles.visualRowLabel}>{r.label}</Text>
          <Text style={styles.visualRowText}>{r.text}</Text>
        </View>
      ))}
    </View>
  );
}

// Info card: title, 2–3 sentences, optional visual, optional "Read more ▾" (scrolls inside the card when open).
function InfoFace({ card, number }: { card: InfoLessonCard; number: number }) {
  const [more, setMore] = useState(false);
  return (
    <>
      <CardTop chip="GOOD TO KNOW" number={number} />
      <ScrollView style={{ flex: 1, marginVertical: 12 }} contentContainerStyle={styles.infoBody} showsVerticalScrollIndicator={false}>
        <Text style={styles.infoTitle}>{card.title}</Text>
        <Text style={styles.infoText}>{card.text}</Text>
        {card.visual ? <InfoVisual visual={card.visual} /> : null}
        {card.readMore ? (
          <SkyToneContext.Provider value="day">
            <PressScale
              onPress={() => {
                buzz("tick");
                setMore((m) => !m);
              }}
              accessibilityLabel={more ? "Read less" : "Read more"}
              style={{ alignSelf: "flex-start", paddingVertical: 6 }}
            >
              <Text style={styles.readMore}>{more ? "Read less ▴" : "Read more ▾"}</Text>
            </PressScale>
            {more ? (
              <Enter from="below" distance={8}>
                <Text style={styles.readMoreText}>{card.readMore}</Text>
              </Enter>
            ) : null}
          </SkyToneContext.Provider>
        ) : null}
      </ScrollView>
      <Text style={styles.swipeHint}>← swipe to continue →</Text>
    </>
  );
}

// Choice card: the question, then option A (left half) and B (right half); the half the card is dragged towards lights up.
function ChoiceFace({
  card,
  number,
  left,
  right,
  onPick,
}: {
  card: ChoiceLessonCard;
  number: number;
  left: Animated.AnimatedInterpolation<number>;
  right: Animated.AnimatedInterpolation<number>;
  onPick: (right: boolean) => void;
}) {
  const half = (side: "left" | "right") => {
    const o = card[side];
    const glow = side === "right" ? right : left;
    return (
      <PressScale key={side} onPress={() => onPick(side === "right")} accessibilityLabel={o.title} style={styles.half}>
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.halfGlow, { opacity: glow }]} />
        <Text style={styles.halfTag}>{side === "left" ? "← A" : "B →"}</Text>
        <Text style={styles.halfTitle}>{o.title}</Text>
        <Text style={styles.halfText}>{o.text}</Text>
      </PressScale>
    );
  };
  return (
    <>
      <CardTop chip="WHICH ONE?" number={number} />
      <Text style={styles.question}>{card.question}</Text>
      <View style={styles.halves}>
        {half("left")}
        {half("right")}
      </View>
      <Text style={styles.swipeHint}>← swipe or tap →</Text>
    </>
  );
}

// Cards waiting behind the current one; the first rises as the top card is dragged away.
function Ghosts({ count, pan, width }: { count: number; pan: Animated.Value; width: number }) {
  const lift = pan.interpolate({ inputRange: [-width, 0, width], outputRange: [1, 0, 1], extrapolate: "clamp" });
  return (
    <>
      {count >= 2 ? (
        <View style={[styles.card, StyleSheet.absoluteFill, styles.ghost, { opacity: 0.22, transform: [{ translateY: 26 }, { scale: 0.88 }] }]} />
      ) : null}
      {count >= 1 ? (
        <Animated.View
          style={[
            styles.card,
            StyleSheet.absoluteFill,
            styles.ghost,
            {
              opacity: lift.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0.85] }),
              transform: [
                { translateY: lift.interpolate({ inputRange: [0, 1], outputRange: [13, 0] }) },
                { scale: lift.interpolate({ inputRange: [0, 1], outputRange: [0.94, 0.99] }) },
              ],
            },
          ]}
        />
      ) : null}
    </>
  );
}

// One of the two symmetric answer buttons. Fills and grows while the card is dragged towards its side.
function AnswerButton({
  side,
  pan,
  threshold,
  onPress,
  label,
  color,
}: {
  side: "myth" | "fact";
  pan: Animated.Value;
  threshold: number;
  onPress: () => void;
  // Choice cards: the option's name and a neutral colour (the button mustn't give the answer away).
  label?: string;
  color?: string;
}) {
  const tint = color ?? (side === "fact" ? colors.success : colors.danger);
  const pull =
    side === "fact"
      ? pan.interpolate({ inputRange: [0, threshold], outputRange: [0, 1], extrapolate: "clamp" })
      : pan.interpolate({ inputRange: [-threshold, 0], outputRange: [1, 0], extrapolate: "clamp" });
  return (
    <Animated.View style={{ flex: 1, transform: [{ scale: pull.interpolate({ inputRange: [0, 1], outputRange: [1, 1.07] }) }] }}>
      <PressScale onPress={onPress} accessibilityLabel={label ?? (side === "fact" ? "Fact" : "Myth")} style={[styles.answer, { borderColor: mix(tint, colors.petrol900, 70) }]}>
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: tint, opacity: pull }]} />
        <Text style={[styles.answerText, label ? styles.answerTextSmall : null]} numberOfLines={1} adjustsFontSizeToFit>
          {label ? (side === "fact" ? `${label}  →` : `←  ${label}`) : side === "fact" ? "FACT  →" : "←  MYTH"}
        </Text>
      </PressScale>
    </Animated.View>
  );
}

// Shown in place of the card after an answer: right or wrong, the real answer and why.
function Feedback({ card, correct, reduced }: { card: SwipeCard; correct: boolean; reduced: boolean }) {
  const choice = card.kind === "choice" ? card : null;
  const fact = card.kind !== "info" && card.kind !== "choice" && card.isFact;
  const chipTint = choice || fact ? colors.success : colors.danger;
  const chipText = choice ? `ANSWER: ${choice[choice.correct].title.toUpperCase()}` : fact ? "IT'S A FACT" : "IT'S A MYTH";
  const quoted = card.kind === "choice" ? card.question : card.kind === "info" ? card.title : card.statement;
  const tint = correct ? colors.success : colors.danger;
  const shake = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (correct || reduced) return;
    const a = Animated.sequence([
      Animated.delay(260),
      ...[10, -9, 7, -5, 3, 0].map((x) => Animated.timing(shake, { toValue: x, duration: 55, useNativeDriver: true })),
    ]);
    a.start();
    return () => a.stop();
  }, [correct, reduced, shake]);
  return (
    <Enter from="below" spring={springs.lively} style={StyleSheet.absoluteFill}>
      <View style={[styles.card, styles.feedback]}>
        <View style={[styles.feedbackBand, { backgroundColor: tint }]} />
        <View style={styles.verdictRow}>
          <Animated.View style={{ transform: [{ translateX: shake }] }}>
            <Pop delay={80} style={[styles.verdictMark, { backgroundColor: tint }]}>
              <Text style={styles.verdictMarkText}>{correct ? "✓" : "✕"}</Text>
            </Pop>
            {correct && !reduced ? <Confetti count={28} delay={120} spread={0.8} /> : null}
          </Animated.View>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={[styles.verdict, { color: tint }]}>{correct ? "Correct!" : "Not quite"}</Text>
            <View style={[styles.answerChip, { backgroundColor: mix(chipTint, colors.surface, 14) }]}>
              <Text style={[styles.answerChipText, { color: chipTint }]}>{chipText}</Text>
            </View>
          </View>
        </View>
        <Text style={styles.quoted}>{`“${quoted}”`}</Text>
        <View style={styles.divider} />
        <Text style={styles.explain}>{card.kind === "info" ? card.text : card.explain}</Text>
      </View>
    </Enter>
  );
}

function Done({ results, sub, reduced }: { results: boolean[]; sub: string; reduced: boolean }) {
  useEffect(() => {
    const t = setTimeout(() => buzz("success"), 250);
    return () => clearTimeout(t);
  }, []);
  return (
    <View style={styles.done}>
      <View>
        <Pop delay={100} style={styles.doneCheck}>
          <Text style={styles.doneCheckText}>✓</Text>
        </Pop>
        {!reduced ? <Confetti count={56} delay={250} /> : null}
      </View>
      <Enter from="below" delay={260}>
        <Text style={styles.doneTitle}>Lesson complete!</Text>
      </Enter>
      <Enter from="below" delay={340}>
        <Text style={styles.doneSub}>{sub}</Text>
      </Enter>
      <View style={styles.doneDots}>
        {results.map((r, i) => (
          <Pop key={i} delay={420 + i * 70} style={[styles.doneDot, { backgroundColor: r ? colors.success : colors.danger }]}>
            <Text style={styles.doneDotText}>{r ? "✓" : "✕"}</Text>
          </Pop>
        ))}
      </View>
    </View>
  );
}

export function SwipeLesson({
  title,
  monthName,
  cards,
  onDone,
  eyebrow,
  doneSub,
  doneLabel = "See your year",
}: {
  title: string;
  monthName: string;
  cards: SwipeCard[];
  onDone: () => void;
  // Defaults: the month's lesson ("LESSON · JANUARY", "See your year").
  eyebrow?: string;
  doneSub?: string;
  doneLabel?: string;
}) {
  const { width } = useWindowDimensions();
  const reduced = useReducedMotion();
  const threshold = width * 0.26;
  const [index, setIndex] = useState(0);
  const [stage, setStage] = useState<Stage>("card");
  const [results, setResults] = useState<Res[]>(() => cards.map(() => null));
  const pan = useRef(new Animated.Value(0)).current;

  // Refs so the (created once) pan responder always sees the current card.
  const live = useRef({ index, stage, cards, width, threshold, reduced });
  live.current = { index, stage, cards, width, threshold, reduced };
  const busy = useRef(false);
  const side = useRef(0);
  const nudge = useRef<Animated.CompositeAnimation | null>(null);

  const answer = useRef((pickedFact: boolean) => {
    const l = live.current;
    if (busy.current || l.stage !== "card") return;
    busy.current = true;
    nudge.current?.stop();
    buzz("light", "whoosh");
    Animated.timing(pan, {
      toValue: (pickedFact ? 1 : -1) * l.width * 1.5,
      duration: l.reduced ? 120 : 240,
      easing: Easing.bezier(0.4, 0, 1, 1),
      useNativeDriver: true,
    }).start(() => {
      const card = l.cards[l.index];
      if (!card) return;
      // Info card: no score, straight to the next card.
      if (!graded(card)) {
        setResults((rs) => rs.map((r, i) => (i === l.index ? "seen" : r)));
        pan.setValue(0);
        goNext.current();
        return;
      }
      const correct = isCorrect(card, pickedFact);
      buzz(correct ? "success" : "medium", correct ? "success" : "error");
      setResults((rs) => rs.map((r, i) => (i === l.index ? correct : r)));
      setStage("feedback");
      pan.setValue(0);
    });
  }).current;

  const responder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        !busy.current && live.current.stage === "card" && Math.abs(g.dx) > 6 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderGrant: () => {
        nudge.current?.stop();
        pan.stopAnimation();
        side.current = 0;
      },
      onPanResponderTerminationRequest: () => false,
      onPanResponderMove: (_, g) => {
        pan.setValue(g.dx);
        // A tick when the card crosses the "answer" line, either way.
        const t = live.current.threshold;
        const s = g.dx > t ? 1 : g.dx < -t ? -1 : 0;
        if (s !== side.current) {
          side.current = s;
          if (s !== 0) buzz("tick");
        }
      },
      onPanResponderRelease: (_, g) => {
        const t = live.current.threshold;
        if (g.dx > t || g.vx > 0.8) answer(true);
        else if (g.dx < -t || g.vx < -0.8) answer(false);
        else Animated.spring(pan, { toValue: 0, ...springs.snappy, useNativeDriver: true }).start();
      },
      onPanResponderTerminate: () => Animated.spring(pan, { toValue: 0, ...springs.snappy, useNativeDriver: true }).start(),
    }),
  ).current;

  // First card: a small wiggle that teaches the swipe (skipped with reduced motion or once touched).
  useEffect(() => {
    if (reduced) return;
    const a = Animated.sequence([
      Animated.delay(1100),
      Animated.timing(pan, { toValue: -34, duration: 230, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(pan, { toValue: 34, duration: 330, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      Animated.spring(pan, { toValue: 0, ...springs.lively, useNativeDriver: true }),
    ]);
    nudge.current = a;
    a.start();
    return () => a.stop();
  }, [pan, reduced]);

  const card = cards[index];
  const last = index === cards.length - 1;
  // Latest `next` for the (created once) answer callback.
  const goNext = useRef(() => {});
  goNext.current = next;
  if (!card) return null;

  function next() {
    if (last) {
      buzz("light");
      setStage("done");
      return;
    }
    buzz("tick");
    busy.current = false;
    setIndex((i) => i + 1);
    setStage("card");
  }

  const glowFact = pan.interpolate({ inputRange: [0, threshold], outputRange: [0, 1], extrapolate: "clamp" });
  const glowMyth = pan.interpolate({ inputRange: [-threshold, 0], outputRange: [1, 0], extrapolate: "clamp" });

  if (stage === "done") {
    return (
      <View style={{ flex: 1 }}>
        <Done
          results={results.filter((_, i) => graded(cards[i]!)).map((r) => r === true)}
          sub={doneSub ?? `${monthName}'s lesson is yours. You know where the cash goes.`}
          reduced={reduced}
        />
        <Cta appear label={doneLabel} onPress={onDone} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {/* Edge glows (myth / fact only): the side the card is dragged towards lights up. */}
      {card.kind !== "info" && card.kind !== "choice" ? (
        <>
          <Animated.View pointerEvents="none" style={[styles.glow, { left: -18, opacity: glowMyth }]}>
            <LinearGradient colors={[mix(colors.danger, colors.petrol900, 75), "transparent"]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill} />
          </Animated.View>
          <Animated.View pointerEvents="none" style={[styles.glow, { right: -18, opacity: glowFact }]}>
            <LinearGradient colors={["transparent", mix(colors.success, colors.petrol900, 75)]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill} />
          </Animated.View>
        </>
      ) : null}

      <View style={styles.header}>
        <Text style={styles.eyebrow}>{eyebrow ?? `LESSON · ${monthName.toUpperCase()}`}</Text>
        <View style={styles.headerRight}>
          <Text style={styles.counter}>{`${Math.min(index + 1, cards.length)} / ${cards.length}`}</Text>
          <SoundToggle onPetrol />
        </View>
      </View>
      <Text style={styles.title}>{title}</Text>
      <Progress results={results} index={index} />

      <View style={styles.stage}>
        {stage === "card" ? (
          <>
            <Ghosts count={Math.min(2, cards.length - index - 1)} pan={pan} width={width} />
            <CardFace
              key={index}
              card={card}
              number={index + 1}
              pan={pan}
              width={width}
              threshold={threshold}
              reduced={reduced}
              panHandlers={responder.panHandlers}
              onPick={answer}
            />
          </>
        ) : (
          <Feedback key={`f${index}`} card={card} correct={results[index] === true} reduced={reduced} />
        )}
      </View>

      <View style={styles.footer}>
        {stage === "card" && card.kind === "info" ? (
          <Cta label="Got it" onPress={() => answer(true)} />
        ) : stage === "card" && card.kind === "choice" ? (
          <View style={styles.answers}>
            <AnswerButton side="myth" pan={pan} threshold={threshold} onPress={() => answer(false)} label={card.left.title} color={colors.petrol700} />
            <AnswerButton side="fact" pan={pan} threshold={threshold} onPress={() => answer(true)} label={card.right.title} color={colors.petrol700} />
          </View>
        ) : stage === "card" ? (
          <View style={styles.answers}>
            <AnswerButton side="myth" pan={pan} threshold={threshold} onPress={() => answer(false)} />
            <AnswerButton side="fact" pan={pan} threshold={threshold} onPress={() => answer(true)} />
          </View>
        ) : (
          <Cta appear label={last ? "Finish lesson" : "Next card"} onPress={next} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 6 },
  eyebrow: { fontFamily: font.extrabold, fontSize: 12, letterSpacing: 1.1, color: colors.yellow },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  counter: { fontFamily: font.extrabold, fontSize: 13, color: colors.onPetrolSub },
  title: { fontFamily: font.extrabold, fontSize: 24, lineHeight: 30, color: colors.onPetrol, marginTop: 6 },
  progress: { flexDirection: "row", gap: 6, marginTop: 12 },
  segment: { flex: 1, height: 8, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.14)", overflow: "hidden" },
  segmentCurrent: { borderWidth: 1.5, borderColor: colors.onPetrol, backgroundColor: "rgba(255,255,255,0.22)" },
  stage: { flex: 1, marginTop: 18, marginBottom: 30 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 28,
    padding: 24,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 14 },
    elevation: 10,
  },
  ghost: { elevation: 2, shadowOpacity: 0 },
  tint: { borderRadius: 28 },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  chip: { backgroundColor: colors.petrol100, borderRadius: 99, paddingVertical: 6, paddingHorizontal: 12 },
  chipText: { fontFamily: font.extrabold, fontSize: 11.5, letterSpacing: 1, color: colors.petrol800 },
  cardNo: { fontFamily: font.extrabold, fontSize: 14, color: colors.muted },
  cardMiddle: { flex: 1, justifyContent: "center" },
  statement: { fontFamily: font.extrabold, color: colors.petrol950 },
  swipeHint: { fontFamily: font.bold, fontSize: 13, color: colors.muted, textAlign: "center", letterSpacing: 0.4 },
  stamp: {
    position: "absolute",
    top: 70,
    borderWidth: 4,
    borderRadius: 14,
    paddingVertical: 6,
    paddingHorizontal: 14,
    backgroundColor: colors.surface,
  },
  stampFact: { left: 22, borderColor: colors.success },
  stampMyth: { right: 22, borderColor: colors.danger },
  stampText: { fontFamily: font.extrabold, fontSize: 34, letterSpacing: 2 },
  glow: { position: "absolute", top: 0, bottom: 0, width: 140 },
  footer: { minHeight: 68, justifyContent: "flex-end" },
  answers: { flexDirection: "row", gap: 14 },
  answer: {
    height: 68,
    borderRadius: 20,
    borderWidth: 2,
    backgroundColor: colors.petrol800,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  answerText: { fontFamily: font.extrabold, fontSize: 18, letterSpacing: 1.6, color: colors.onPetrol },
  answerTextSmall: { fontSize: 15, letterSpacing: 0.4, paddingHorizontal: 10 },
  infoBody: { gap: 12, flexGrow: 1, justifyContent: "center" },
  infoTitle: { fontFamily: font.extrabold, fontSize: 27, lineHeight: 34, color: colors.petrol950 },
  infoText: { fontFamily: font.medium, fontSize: 17, lineHeight: 25, color: colors.ink },
  visual: { backgroundColor: colors.surface2, borderRadius: 16, padding: 14, gap: 10 },
  visualNumber: { fontFamily: font.extrabold, fontSize: 34, color: colors.petrol950, fontVariant: ["tabular-nums"] },
  visualLabel: { fontFamily: font.semibold, fontSize: 14, lineHeight: 20, color: colors.muted },
  visualRow: { gap: 1 },
  visualRowLabel: { fontFamily: font.extrabold, fontSize: 15, color: colors.petrol900 },
  visualRowText: { fontFamily: font.medium, fontSize: 14, color: colors.muted },
  readMore: { fontFamily: font.extrabold, fontSize: 14.5, color: colors.petrol700 },
  readMoreText: { fontFamily: font.regular, fontSize: 14.5, lineHeight: 21, color: colors.ink },
  question: { fontFamily: font.extrabold, fontSize: 24, lineHeight: 31, color: colors.petrol950, marginTop: 14 },
  halves: { flex: 1, flexDirection: "row", gap: 10, marginVertical: 14 },
  half: { flex: 1, borderRadius: 18, borderWidth: 1.5, borderColor: colors.line, padding: 12, gap: 6, overflow: "hidden" },
  halfGlow: { backgroundColor: colors.petrol100 },
  halfTag: { fontFamily: font.extrabold, fontSize: 12, letterSpacing: 1, color: colors.petrol700 },
  halfTitle: { fontFamily: font.extrabold, fontSize: 18, lineHeight: 23, color: colors.petrol950 },
  halfText: { fontFamily: font.medium, fontSize: 13.5, lineHeight: 19, color: colors.muted },
  feedback: { flex: 1, overflow: "hidden", gap: 16, paddingTop: 30 },
  feedbackBand: { position: "absolute", left: 0, right: 0, top: 0, height: 8 },
  verdictRow: { flexDirection: "row", alignItems: "center", gap: 16 },
  verdictMark: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center" },
  verdictMarkText: { fontFamily: font.extrabold, fontSize: 36, color: colors.surface },
  verdict: { fontFamily: font.extrabold, fontSize: 30, lineHeight: 36 },
  answerChip: { alignSelf: "flex-start", borderRadius: 99, paddingVertical: 4, paddingHorizontal: 10 },
  answerChipText: { fontFamily: font.extrabold, fontSize: 12, letterSpacing: 1 },
  quoted: { fontFamily: font.semibold, fontSize: 15, lineHeight: 22, color: colors.muted },
  divider: { height: 1.5, backgroundColor: colors.line },
  explain: { fontFamily: font.medium, fontSize: 18, lineHeight: 27, color: colors.ink },
  done: { flex: 1, alignItems: "center", justifyContent: "center", gap: 14, paddingHorizontal: 8 },
  doneCheck: { width: 112, height: 112, borderRadius: 56, backgroundColor: colors.yellow, alignItems: "center", justifyContent: "center" },
  doneCheckText: { fontFamily: font.extrabold, fontSize: 56, color: colors.petrol950 },
  doneTitle: { fontFamily: font.extrabold, fontSize: 34, color: colors.onPetrol, textAlign: "center", marginTop: 10 },
  doneSub: { fontFamily: font.medium, fontSize: 16, lineHeight: 23, color: colors.onPetrolSub, textAlign: "center" },
  doneDots: { flexDirection: "row", gap: 8, marginTop: 8 },
  doneDot: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  doneDotText: { fontFamily: font.extrabold, fontSize: 14, color: colors.surface },
});
