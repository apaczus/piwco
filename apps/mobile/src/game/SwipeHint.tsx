// "Swipe left to see your city" with a hand that nudges left (shown until the player opens CITY once).
import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { useReducedMotion } from "../onboarding/anim";
import { colors, font } from "../theme";

export function SwipeHint() {
  const reduced = useReducedMotion();
  const x = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduced) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(900),
        Animated.timing(x, { toValue: -12, duration: 420, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(x, { toValue: 0, duration: 420, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [reduced, x]);
  return (
    <View style={styles.row}>
      <Animated.View style={{ transform: [{ translateX: x }] }}>
        <Svg width={22} height={22} viewBox="0 0 24 24">
          <Path
            d="M9 11V5.5a1.5 1.5 0 0 1 3 0V11m0-1.5a1.5 1.5 0 0 1 3 0V11m0-.5a1.5 1.5 0 0 1 3 0V15a6 6 0 0 1-6 6h-1a6 6 0 0 1-4.6-2.2L4 15.5a1.6 1.6 0 0 1 2.4-2.1L9 15"
            fill="none"
            stroke={colors.petrol700}
            strokeWidth={1.7}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      </Animated.View>
      <Text style={styles.text}>Swipe left to see your city</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 4 },
  text: { fontFamily: font.bold, fontSize: 13.5, color: colors.petrol700 },
});
