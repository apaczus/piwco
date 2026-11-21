// YEAR page of the game pager (left of LEARN): the 12 months = 12 levels, read only. Completed months ✓, the
// current one highlighted ("You are here"), playable ones ahead "Soon", the rest locked. Progress of the year on top.
import { levels } from "@piwco/content";
import { useEffect, useRef } from "react";
import { Animated, ScrollView, StyleSheet, Text, View } from "react-native";
import { BackToMonth } from "../city/BackToMonth";
import { Eyebrow } from "../onboarding/ui";
import { colors, font, mix, shadow2, springs } from "../theme";
import { LockIcon, SkippedBadge } from "./MonthResult";
import { CoachTarget } from "./coach";

export function YearPage({
  completedMonth,
  currentMonth,
  backLabel,
  skipped = () => false,
}: {
  skipped?: (month: number) => boolean;
  completedMonth: number;
  // The month being played (null between months).
  currentMonth: number | null;
  backLabel?: string;
}) {
  const bar = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(bar, { toValue: completedMonth / 12, ...springs.bar, useNativeDriver: false }).start();
  }, [bar, completedMonth]);
  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <BackToMonth side="right" label={backLabel} />
      <Eyebrow>Your year</Eyebrow>
      <CoachTarget id="year">
      <View style={{ gap: 12 }}>
      <View style={styles.head}>
        <Text style={styles.title}>{currentMonth ? `Level ${currentMonth} of 12` : `${completedMonth} of 12 done`}</Text>
        <Text style={styles.done}>{`${completedMonth} / 12 ✓`}</Text>
      </View>
      <View style={styles.track}>
        <Animated.View style={[styles.fill, { width: bar.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }) }]} />
      </View>
      </View>
      </CoachTarget>
      <View style={{ gap: 6 }}>
        {levels.map((l) => {
          const done = l.month <= completedMonth;
          const current = l.month === currentMonth;
          return (
            <View
              key={l.id}
              style={[
                styles.month,
                done ? styles.monthDone : null,
                current ? styles.monthCurrent : null,
                !done && !current && !l.playable ? { opacity: 0.55 } : null,
              ]}
            >
              <Text style={[styles.no, current ? { color: colors.petrol950 } : null]}>{String(l.month).padStart(2, "0")}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{l.monthName}</Text>
                <Text style={styles.topic}>{l.title}</Text>
              </View>
              {done ? (
                <Text style={styles.check}>✓</Text>
              ) : current ? (
                <View style={styles.here}>
                  <Text style={styles.hereText}>YOU ARE HERE</Text>
                </View>
              ) : skipped(l.month) ? (
                <SkippedBadge />
              ) : l.playable ? (
                <Text style={styles.soon}>SOON</Text>
              ) : (
                <LockIcon />
              )}
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, marginHorizontal: -18 },
  content: { paddingHorizontal: 18, paddingTop: 12, paddingBottom: 24, gap: 12 },
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
  title: { fontFamily: font.extrabold, fontSize: 26, color: colors.petrol950 },
  done: { fontFamily: font.extrabold, fontSize: 14, color: colors.success },
  track: { height: 10, borderRadius: 5, backgroundColor: colors.line, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 5, backgroundColor: colors.success },
  month: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1.5,
    borderColor: colors.line,
  },
  monthDone: { borderColor: colors.success, backgroundColor: mix(colors.success, colors.surface, 8) },
  monthCurrent: { borderColor: colors.petrol900, borderWidth: 2, backgroundColor: mix(colors.yellow, colors.surface, 22), ...shadow2 },
  no: { fontFamily: font.extrabold, fontSize: 13, color: colors.muted, width: 22 },
  name: { fontFamily: font.extrabold, fontSize: 14, color: colors.ink },
  topic: { fontFamily: font.regular, fontSize: 13, color: colors.muted },
  check: { fontFamily: font.extrabold, fontSize: 18, color: colors.success },
  here: { backgroundColor: colors.petrol900, borderRadius: 99, paddingVertical: 4, paddingHorizontal: 9 },
  hereText: { fontFamily: font.extrabold, fontSize: 10, letterSpacing: 0.8, color: colors.yellow },
  soon: { fontFamily: font.extrabold, fontSize: 10.5, letterSpacing: 0.8, color: colors.muted },
});
