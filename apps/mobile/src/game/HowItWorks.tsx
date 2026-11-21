// "How Piwco works" (decided 2026-11-21): before the first mission of a player who rated themselves 3–5.
// Problem → Decide → Learn (problem-based learning), then the 12 months: the basics they skip ("You know this"),
// August ("Start here"), the rest later. Night screen, like "Welcome to the game". Texts in tutorial.json.
import { levels, tutorial } from "@piwco/content";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { buzz, Enter } from "../onboarding/anim";
import { Notification } from "./notify";
import { ScreenLayout, type Dir } from "../onboarding/screens";
import { Cta, Eyebrow, Sub, Title } from "../onboarding/ui";
import { colors, font, mix } from "../theme";

export function HowItWorks({
  dir,
  startMonth,
  skipped,
  canStart,
  onStart,
}: {
  // Months the player can start from now (the others show a "still being built" notification).
  canStart: (month: number) => boolean;
  // A playable month was tapped, or the CTA (= the start month).
  onStart: (month: number) => void;
  dir: Dir;
  // The month the player starts with (8 = investing).
  startMonth: number;
  skipped: (month: number) => boolean;
}) {
  const t = tutorial.howItWorks;
  // The last month tapped that can't be played yet (a new tap re-shows the notification).
  const [notReady, setNotReady] = useState<{ month: number; n: number } | null>(null);
  const tap = (month: number) => {
    if (canStart(month)) {
      buzz("light");
      onStart(month);
    } else {
      setNotReady((p) => ({ month, n: (p?.n ?? 0) + 1 }));
    }
  };
  // The notification hides by itself after a moment (it floats over the months).
  useEffect(() => {
    if (!notReady) return;
    const id = setTimeout(() => setNotReady(null), 2600);
    return () => clearTimeout(id);
  }, [notReady]);
  const notReadyName = notReady ? (levels.find((l) => l.month === notReady.month)?.monthName ?? "") : "";
  return (
    <ScreenLayout dir={dir} footer={<Cta label={t.cta} onPress={() => onStart(startMonth)} onPetrol appear />}>
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
              const known = !start && skipped(l.month);
              return (
                // Plain Pressable (PressScale would size the cell to its content): a third of the row.
                <Pressable
                  key={l.id}
                  onPress={() => tap(l.month)}
                  accessibilityRole="button"
                  accessibilityLabel={canStart(l.month) ? `Start ${l.monthName}` : `${l.monthName}: coming soon`}
                  style={({ pressed }) => [styles.monthCell, pressed ? { transform: [{ scale: 0.965 }] } : null]}
                >
                <View style={[styles.month, start ? styles.monthStart : known ? styles.monthKnown : null, !canStart(l.month) && !start && !known ? { opacity: 0.6 } : null]}>
                  <Text style={[styles.monthName, start ? { color: colors.petrol950 } : null]}>{l.monthName.slice(0, 3)}</Text>
                  <Text
                    style={[styles.monthState, start ? { color: colors.petrol950 } : known ? { color: colors.success } : null]}
                    numberOfLines={1}
                  >
                    {start ? t.start.toUpperCase() : known ? `✓ ${t.known}` : l.title}
                  </Text>
                </View>
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.note}>{t.knownNote}</Text>
          {notReady ? (
            // Floats over the months (no layout jump); slides in again on every tap.
            <View pointerEvents="none" style={styles.notice}>
              <Notification
                key={notReady.n}
                title={t.notReadyTitle.replace("{month}", notReadyName)}
                text={t.notReadyText}
                sound="error"
              />
            </View>
          ) : null}
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
  notice: { position: "absolute", left: 0, right: 0, top: 26 },
  month: {
    borderRadius: 10,
    paddingVertical: 7,
    paddingHorizontal: 8,
    backgroundColor: mix(colors.onPetrol, colors.petrol900, 8),
    gap: 1,
  },
  monthKnown: { backgroundColor: mix(colors.success, colors.petrol900, 22) },
  monthStart: { backgroundColor: colors.yellow },
  monthName: { fontFamily: font.extrabold, fontSize: 13, color: colors.onPetrol },
  monthState: { fontFamily: font.semibold, fontSize: 10.5, color: colors.onPetrolMuted },
  note: { fontFamily: font.regular, fontSize: 13, lineHeight: 19, color: colors.onPetrolSub },
});
