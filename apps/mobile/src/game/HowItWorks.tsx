// "How Piwco works" (decided 2026-11-21): before the first mission of a player who rated themselves 3–5.
// Problem → Decide → Learn (problem-based learning), then the 12 months: the basics they skip ("You know this"),
// August ("Start here"), the rest later. Night screen, like "Welcome to the game". Texts in tutorial.json.
import { levels, tutorial } from "@piwco/content";
import { useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { buzz, Enter, useReducedMotion } from "../onboarding/anim";
import { ScreenLayout, type Dir } from "../onboarding/screens";
import { Cta, Eyebrow, Sub, Title } from "../onboarding/ui";
import { colors, font, mix } from "../theme";

export function HowItWorks({
  dir,
  startMonth,
  skipped,
  done = [],
  canStart,
  onStart,
  businessOnly,
}: {
  // Private persons: months that are a company simulation ("For entrepreneurs", locked).
  businessOnly?: (month: number) => boolean;
  // Months the player can start from now (for the others the button shows "still being built").
  canStart: (month: number) => boolean;
  // Lessons already finished here (✓ on the tile).
  done?: number[];
  // The button was pressed with a month that can be started.
  onStart: (month: number) => void;
  dir: Dir;
  // The month the player starts with (8 = investing).
  startMonth: number;
  skipped: (month: number) => boolean;
}) {
  const t = tutorial.howItWorks;
  const p = tutorial.privatePlayer;
  const forBusiness = (m: number) => !!businessOnly?.(m);
  const reduced = useReducedMotion();
  // The picked month (starts on the start month); the button below says what happens, or that it's locked.
  const [picked, setPicked] = useState(startMonth);
  const shake = useRef(new Animated.Value(0)).current;
  const pickedLevel = levels.find((l) => l.month === picked);
  const pickedName = pickedLevel?.monthName ?? "";
  const open = canStart(picked);
  const ctaLabel = !open
    ? forBusiness(picked)
      ? p.businessCta
      : t.lockedCta
    : picked === startMonth
      ? t.cta
      : pickedLevel?.lessonOnly
        ? t.lessonCta
        : t.startCta;
  const tap = (month: number) => {
    if (month === picked) return;
    // Tick for a month that opens, a short "no" for one still being built.
    if (canStart(month)) buzz("tick");
    else buzz("medium", "error");
    setPicked(month);
  };
  const go = () => {
    if (open) {
      buzz("light");
      onStart(picked);
      return;
    }
    buzz("medium", "error");
    if (!reduced) {
      shake.setValue(0);
      Animated.sequence([8, -7, 5, -3, 0].map((x) => Animated.timing(shake, { toValue: x, duration: 55, useNativeDriver: true }))).start();
    }
  };
  return (
    <ScreenLayout
      dir={dir}
      footer={
        <Animated.View style={{ transform: [{ translateX: shake }] }}>
          <Cta label={ctaLabel.replace("{month}", pickedName)} onPress={go} onPetrol appear locked={!open} />
        </Animated.View>
      }
    >
      <Eyebrow>{t.eyebrow}</Eyebrow>
      <Title>{t.title}</Title>
      <Sub>{t.sub}</Sub>
      <View style={styles.steps}>
        {t.steps.map((s, i) => (
          <Enter key={s.title} from="below" delay={150 + i * 160}>
            <View style={styles.step}>
              <View style={styles.no}>
                <Text style={styles.noText}>{i + 1}</Text>
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.stepTitle}>{s.title}</Text>
                <Text style={styles.stepText}>{s.text}</Text>
              </View>
            </View>
          </Enter>
        ))}
      </View>
      <Enter from="below" delay={700}>
        <View style={{ gap: 10 }}>
          <Text style={styles.yearTitle}>{t.yearTitle}</Text>
          <Text style={styles.note}>{t.tapHint}</Text>
          <View style={styles.grid}>
            {levels.map((l) => {
              const start = l.month === startMonth;
              const finished = !start && done.includes(l.month);
              const business = !start && forBusiness(l.month);
              const known = !start && !finished && !business && skipped(l.month);
              // A lesson-only month that opens from here.
              const lesson = !start && !finished && !!l.lessonOnly && !!l.lesson;
              return (
                // Plain Pressable (PressScale would size the cell to its content): a third of the row.
                <Pressable
                  key={l.id}
                  onPress={() => tap(l.month)}
                  accessibilityRole="button"
                  accessibilityLabel={canStart(l.month) ? `Start ${l.monthName}` : `${l.monthName}: ${business ? p.businessOnly : "coming soon"}`}
                  style={({ pressed }) => [styles.monthCell, pressed ? { transform: [{ scale: 0.965 }] } : null]}
                >
                <View
                  style={[
                    styles.month,
                    start ? styles.monthStart : known || finished ? styles.monthKnown : lesson ? styles.monthLesson : null,
                    !canStart(l.month) && !start && !known && l.month !== picked ? { opacity: 0.6 } : null,
                    // The picked month: a white frame on top of its own look.
                    l.month === picked ? styles.monthPicked : null,
                  ]}
                >
                  <Text style={[styles.monthName, start ? { color: colors.petrol950 } : null]}>{l.monthName.slice(0, 3)}</Text>
                  <Text
                    style={[styles.monthState, start ? { color: colors.petrol950 } : known || finished ? { color: colors.success } : lesson ? { color: colors.yellow } : null]}
                    numberOfLines={1}
                  >
                    {start ? t.start.toUpperCase() : finished ? "✓ Lesson done" : business ? p.businessOnly : known ? `✓ ${t.known}` : lesson ? "LESSON ›" : l.title}
                  </Text>
                </View>
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.note}>{businessOnly ? p.knownNote : t.knownNote}</Text>
        </View>
      </Enter>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  steps: { gap: 8 },
  step: { flexDirection: "row", gap: 12, alignItems: "flex-start", backgroundColor: colors.surface, borderRadius: 16, padding: 14 },
  no: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.yellow, alignItems: "center", justifyContent: "center" },
  noText: { fontFamily: font.extrabold, fontSize: 15, color: colors.petrol950 },
  stepTitle: { fontFamily: font.extrabold, fontSize: 16, color: colors.petrol950 },
  stepText: { fontFamily: font.regular, fontSize: 13.5, lineHeight: 19, color: colors.ink },
  yearTitle: { fontFamily: font.extrabold, fontSize: 14, color: colors.onPetrol },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  monthCell: { width: "31.6%" },
  monthPicked: { borderWidth: 2, borderColor: colors.onPetrol },
  month: {
    borderRadius: 10,
    paddingVertical: 7,
    paddingHorizontal: 8,
    backgroundColor: mix(colors.onPetrol, colors.petrol900, 8),
    gap: 1,
  },
  monthKnown: { backgroundColor: mix(colors.success, colors.petrol900, 22) },
  monthStart: { backgroundColor: colors.yellow },
  monthLesson: { borderWidth: 1.5, borderColor: colors.yellow },
  monthName: { fontFamily: font.extrabold, fontSize: 13, color: colors.onPetrol },
  monthState: { fontFamily: font.semibold, fontSize: 10.5, color: colors.onPetrolMuted },
  note: { fontFamily: font.regular, fontSize: 13, lineHeight: 19, color: colors.onPetrolSub },
});
