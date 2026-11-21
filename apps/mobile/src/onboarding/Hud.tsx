// Top bar: back button, progress bar, "n / total" question counter. Plus the welcome background.
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Defs, Path, RadialGradient, Stop } from "react-native-svg";
import { colors, font, shadow1, springs } from "../theme";
import { Enter, PressScale } from "./anim";

export function Hud({
  petrol,
  backHidden,
  onBack,
  fraction,
  counter,
  onSkipToGame,
  onSkipToInvest,
}: {
  petrol: boolean;
  backHidden: boolean;
  onBack: () => void;
  fraction: number;
  counter: string;
  // TEMPORARY (devFlags.DEV_SKIP_TO_GAME): jump straight into the game.
  onSkipToGame?: () => void;
  // TEMPORARY (devFlags.DEV_SKIP_TO_INVEST): jump straight into the investing chapter.
  onSkipToInvest?: () => void;
}) {
  // The fill is a full-width bar slid in from the left (translateX), so it animates on the native thread.
  const bar = useRef(new Animated.Value(fraction)).current;
  const [trackWidth, setTrackWidth] = useState(0);
  useEffect(() => {
    Animated.spring(bar, { toValue: fraction, ...springs.bar, useNativeDriver: true }).start();
  }, [fraction, bar]);

  return (
    <View style={styles.hud}>
      <View style={{ opacity: backHidden ? 0 : 1 }} pointerEvents={backHidden ? "none" : "auto"}>
        <PressScale
          onPress={onBack}
          accessibilityLabel="Back"
          style={[styles.back, petrol ? styles.backPetrol : shadow1]}
        >
          <Svg width={20} height={20} viewBox="0 0 20 20">
            <Path
              d="M12.5 4.5 7 10l5.5 5.5"
              fill="none"
              stroke={petrol ? "#FFFFFF" : colors.petrol900}
              strokeWidth={2.2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </PressScale>
      </View>
      <View
        style={[styles.bar, { opacity: petrol ? 0 : 1 }]}
        onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
      >
        {trackWidth > 0 ? (
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              {
                transform: [
                  {
                    translateX: bar.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-trackWidth, 0],
                      extrapolate: "clamp",
                    }),
                  },
                ],
              },
            ]}
          >
            <LinearGradient
              colors={[colors.petrol800, colors.petrol700]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[StyleSheet.absoluteFill, { borderRadius: 99 }]}
            />
          </Animated.View>
        ) : null}
      </View>
      <View style={[styles.count, { opacity: petrol ? 0 : 1 }]}>
        {counter ? (
          <Enter key={counter} from="below" distance={10} spring={springs.snappy}>
            <Text style={styles.countText}>{counter}</Text>
          </Enter>
        ) : null}
      </View>
      {onSkipToGame ? (
        <PressScale
          onPress={onSkipToGame}
          accessibilityLabel="Skip to game"
          style={[styles.skip, petrol ? styles.skipPetrol : null]}
        >
          <Text style={[styles.skipText, petrol ? { color: "#FFFFFF" } : null]}>Skip to game ›</Text>
        </PressScale>
      ) : null}
      {onSkipToInvest ? (
        <PressScale
          onPress={onSkipToInvest}
          accessibilityLabel="Skip to the investing chapter"
          style={[styles.skip, petrol ? styles.skipPetrol : null]}
        >
          <Text style={[styles.skipText, petrol ? { color: "#FFFFFF" } : null]}>Invest ›</Text>
        </PressScale>
      ) : null}
    </View>
  );
}

// Two soft, slowly drifting circles behind the welcome slides (the artifact's blurred .bgfx).
function useDrift(duration: number) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const ease = Easing.inOut(Easing.ease);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration, easing: ease, useNativeDriver: true }),
        Animated.timing(v, { toValue: 0, duration, easing: ease, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [v, duration]);
  return v;
}

function SoftCircle({ size, color, opacity }: { size: number; color: string; opacity: number }) {
  return (
    <Svg width={size} height={size}>
      <Defs>
        <RadialGradient id={`g-${color}`} cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor={color} stopOpacity={opacity} />
          <Stop offset="0.55" stopColor={color} stopOpacity={opacity * 0.7} />
          <Stop offset="1" stopColor={color} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Circle cx={size / 2} cy={size / 2} r={size / 2} fill={`url(#g-${color})`} />
    </Svg>
  );
}

// Rendered inside the petrol layer, which fades in/out as a whole.
export function WelcomeBackground() {
  const d1 = useDrift(18000);
  const d2 = useDrift(22000);
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { overflow: "hidden" }]}>
      <Animated.View
        style={{
          position: "absolute",
          left: -180,
          top: -140,
          transform: [
            { translateX: d1.interpolate({ inputRange: [0, 1], outputRange: [0, 60] }) },
            { translateY: d1.interpolate({ inputRange: [0, 1], outputRange: [0, 80] }) },
            { scale: d1.interpolate({ inputRange: [0, 1], outputRange: [1, 1.15] }) },
          ],
        }}
      >
        <SoftCircle size={500} color="#0B6A78" opacity={0.9} />
      </Animated.View>
      <Animated.View
        style={{
          position: "absolute",
          right: -170,
          bottom: 0,
          transform: [
            { translateX: d2.interpolate({ inputRange: [0, 1], outputRange: [0, -50] }) },
            { translateY: d2.interpolate({ inputRange: [0, 1], outputRange: [0, -70] }) },
            { scale: d2.interpolate({ inputRange: [0, 1], outputRange: [1, 1.2] }) },
          ],
        }}
      >
        <SoftCircle size={420} color="#FFD400" opacity={0.15} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  hud: { flexDirection: "row", alignItems: "center", gap: 12, height: 40 },
  back: {
    width: 38,
    height: 38,
    marginLeft: -6,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
  },
  backPetrol: { backgroundColor: "rgba(255,255,255,0.1)" },
  bar: { flex: 1, height: 6, backgroundColor: colors.line, borderRadius: 99, overflow: "hidden" },
  count: { minWidth: 46, height: 20, overflow: "hidden", alignItems: "flex-end" },
  countText: { fontFamily: font.bold, fontSize: 13, color: colors.muted, fontVariant: ["tabular-nums"] },
  // Dashed border = clearly a temporary developer button.
  skip: {
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: colors.petrol700,
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  skipPetrol: { borderColor: "rgba(255,255,255,0.6)" },
  skipText: { fontFamily: font.extrabold, fontSize: 12, color: colors.petrol700 },
});
