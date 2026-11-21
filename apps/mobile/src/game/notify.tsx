// Shared by the month's event (EventScreen) and the investing chapter: the push notification that slides in from
// the top, and the bordered "outcome" card style.
import { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { buzz, useReducedMotion } from "../onboarding/anim";
import type { SoundName } from "../sound";
import { colors, font, shadow2, springs } from "../theme";

export function Notification({
  title,
  text,
  delay = 0,
  sound = "pop",
}: {
  title: string;
  text: string;
  delay?: number;
  // Sound with the haptic when it lands (e.g. "error" for a market drop).
  sound?: SoundName;
}) {
  const reduced = useReducedMotion();
  const v = useRef(new Animated.Value(reduced ? 1 : 0)).current;
  useEffect(() => {
    const t = setTimeout(() => buzz("medium", sound), delay + 120);
    // Reduced motion: no slide-in, the notification is just there.
    if (!reduced) Animated.sequence([Animated.delay(delay), Animated.spring(v, { toValue: 1, ...springs.lively, useNativeDriver: true })]).start();
    return () => clearTimeout(t);
  }, [v, delay, sound, reduced]);
  return (
    <Animated.View
      style={[
        notifyStyles.notif,
        { opacity: v.interpolate({ inputRange: [0, 0.3], outputRange: [0, 1], extrapolate: "clamp" }), transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [-90, 0] }) }] },
      ]}
    >
      <View style={notifyStyles.notifHead}>
        <View style={notifyStyles.appIcon}>
          <View style={notifyStyles.appMark} />
        </View>
        <Text style={notifyStyles.notifApp}>PIWCO</Text>
        <Text style={notifyStyles.notifTime}>now</Text>
      </View>
      <Text style={notifyStyles.notifTitle}>{title}</Text>
      <Text style={notifyStyles.notifText}>{text}</Text>
    </Animated.View>
  );
}

export const notifyStyles = StyleSheet.create({
  notif: { backgroundColor: colors.surface, borderRadius: 20, padding: 14, gap: 4, ...shadow2 },
  notifHead: { flexDirection: "row", alignItems: "center", gap: 8 },
  appIcon: { width: 22, height: 22, borderRadius: 6, backgroundColor: colors.petrol900, alignItems: "center", justifyContent: "center" },
  appMark: { width: 8, height: 8, borderRadius: 2, backgroundColor: colors.yellow, transform: [{ rotate: "45deg" }] },
  notifApp: { flex: 1, fontFamily: font.bold, fontSize: 12, letterSpacing: 0.8, color: colors.muted },
  notifTime: { fontFamily: font.medium, fontSize: 12, color: colors.muted },
  notifTitle: { fontFamily: font.extrabold, fontSize: 18, lineHeight: 23, color: colors.petrol950, marginTop: 4 },
  notifText: { fontFamily: font.regular, fontSize: 14.5, lineHeight: 21, color: colors.ink },
  // Card with a coloured 2 px border (green = fine, red = debt / loss, yellow = wait).
  outcome: { backgroundColor: colors.surface, borderRadius: 16, borderWidth: 2, padding: 16, gap: 6, ...shadow2 },
  outcomeTitle: { fontFamily: font.extrabold, fontSize: 19, color: colors.petrol950 },
  outcomeText: { fontFamily: font.regular, fontSize: 14.5, lineHeight: 21, color: colors.ink },
});
