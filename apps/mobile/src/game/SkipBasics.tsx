// "You skip the first 3 months" (user, 2026-11-21): for a player who rated themselves 3–5. The basic months
// (January–March) come in one by one, then each gets a "✓ SKIPPED" stamp (tick haptic each), then "You can go
// further". Tap = show everything at once. Reduced motion: the end state at once. Night screen. Texts in tutorial.json.
import { levels, tutorial } from "@piwco/content";
import { useEffect, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { buzz, Enter, useReducedMotion } from "../onboarding/anim";
import { ScreenLayout, type Dir } from "../onboarding/screens";
import { Cta, Eyebrow, Sub, Title } from "../onboarding/ui";
import { colors, font, mix, springs } from "../theme";

const FIRST_STAMP = 1100;
const STAMP_EVERY = 480;

function Stamp({ label, reduced }: { label: string; reduced: boolean }) {
  const v = useRef(new Animated.Value(reduced ? 1 : 0)).current;
  useEffect(() => {
    if (!reduced) Animated.spring(v, { toValue: 1, ...springs.lively, useNativeDriver: true }).start();
  }, [v, reduced]);
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.stamp,
        {
          opacity: v.interpolate({ inputRange: [0, 0.3], outputRange: [0, 1], extrapolate: "clamp" }),
          transform: [{ rotate: "-8deg" }, { scale: v.interpolate({ inputRange: [0, 1], outputRange: [1.7, 1] }) }],
        },
      ]}
    >
      <Text style={styles.stampText}>{`✓ ${label.toUpperCase()}`}</Text>
    </Animated.View>
  );
}

export function SkipBasics({ dir, skipped, onNext }: { dir: Dir; skipped: (month: number) => boolean; onNext: () => void }) {
  const t = tutorial.skipBasics;
  const reduced = useReducedMotion();
  const months = levels.filter((l) => skipped(l.month)).slice(0, 3);
  const [stamped, setStamped] = useState(reduced ? months.length : 0);
  const done = stamped >= months.length;

  useEffect(() => {
    if (reduced || stamped >= months.length) return;
    const id = setTimeout(
      () => {
        buzz("tick");
        setStamped((n) => n + 1);
      },
      stamped === 0 ? FIRST_STAMP : STAMP_EVERY,
    );
    return () => clearTimeout(id);
  }, [stamped, months.length, reduced]);

  useEffect(() => {
    if (done && !reduced) buzz("success");
  }, [done, reduced]);

  return (
    <ScreenLayout dir={dir} footer={done ? <Cta label={t.cta} onPress={onNext} onPetrol appear /> : <View style={{ height: 58 }} />}>
      <Eyebrow>{t.eyebrow}</Eyebrow>
      <Title>{t.title}</Title>
      <Sub>{t.sub}</Sub>
      <Pressable onPress={() => setStamped(months.length)} accessibilityLabel="Show all" style={styles.list}>
        {months.map((l, i) => (
          <Enter key={l.id} from="below" delay={reduced ? 0 : 200 + i * 180}>
            <View style={[styles.card, i < stamped ? styles.cardDone : null]}>
              <View style={styles.no}>
                <Text style={styles.noText}>{l.monthName.slice(0, 3)}</Text>
              </View>
              {/* Room on the right for the stamp (no jump when it lands). */}
              <View style={{ flex: 1, gap: 2, paddingRight: 92 }}>
                <Text style={styles.cardTitle}>{l.title}</Text>
                <Text style={styles.cardSub}>{l.subtitle}</Text>
              </View>
              {i < stamped ? (
                <View pointerEvents="none" style={styles.stampSlot}>
                  <Stamp label={t.stamp} reduced={reduced} />
                </View>
              ) : null}
            </View>
          </Enter>
        ))}
      </Pressable>
      {done ? (
        <Enter from="below" delay={reduced ? 0 : 150}>
          <View style={{ gap: 6 }}>
            <Text style={styles.goOn}>{t.goOn}</Text>
            <Text style={styles.note}>{t.note}</Text>
          </View>
        </Enter>
      ) : null}
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  list: { gap: 10 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 2,
    borderColor: colors.surface,
  },
  cardDone: { borderColor: colors.success, backgroundColor: mix(colors.success, colors.surface, 8) },
  no: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.petrol900, alignItems: "center", justifyContent: "center" },
  noText: { fontFamily: font.extrabold, fontSize: 13, color: colors.yellow },
  cardTitle: { fontFamily: font.extrabold, fontSize: 16, color: colors.petrol950 },
  cardSub: { fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: colors.muted },
  stampSlot: { position: "absolute", right: 12, top: 0, bottom: 0, justifyContent: "center" },
  stamp: {
    borderWidth: 2.5,
    borderColor: colors.success,
    borderRadius: 8,
    paddingVertical: 3,
    paddingHorizontal: 8,
    backgroundColor: colors.surface,
  },
  stampText: { fontFamily: font.extrabold, fontSize: 12, letterSpacing: 1, color: colors.success },
  goOn: { fontFamily: font.extrabold, fontSize: 18, lineHeight: 24, color: colors.yellow },
  note: { fontFamily: font.regular, fontSize: 13.5, lineHeight: 19, color: colors.onPetrolSub },
});
