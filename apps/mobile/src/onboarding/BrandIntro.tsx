// App start: PIWCO = Please Invest With Confidence. ~2.6 s on the dark petrol background, tap to skip.
//  1. the letters P·I·W·C·O pop in one by one (springs, haptic ticks);
//  2. the four words slide in underneath, each lighting up its letter(s) in PIWCO ("Confidence" lights C and O);
//  3. a warm glow blooms behind the word, success haptic + chime; then the intro fades into the onboarding.
// Reduced motion: everything shown at once, short fade.
import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Defs, RadialGradient, Stop } from "react-native-svg";
import { preloadSounds } from "../sound";
import { colors, font, springs } from "../theme";
import { buzz, useReducedMotion } from "./anim";
import { WelcomeBackground } from "./Hud";

const LETTERS = ["P", "I", "W", "C", "O"];
// Each word and which PIWCO letters it lights up.
const WORDS: { word: string; initials: number; letters: number[] }[] = [
  { word: "Please", initials: 1, letters: [0] },
  { word: "Invest", initials: 1, letters: [1] },
  { word: "With", initials: 1, letters: [2] },
  { word: "Confidence", initials: 2, letters: [3, 4] },
];

const LETTER_START = 150;
const LETTER_STAGGER = 110;
const WORDS_START = 850;
const WORD_STAGGER = 260;
const BLOOM_AT = WORDS_START + WORDS.length * WORD_STAGGER + 150;
const END_AT = BLOOM_AT + 900;
const FADE_MS = 450;

export function BrandIntro({ onReveal, onDone }: { onReveal: () => void; onDone: () => void }) {
  const reduced = useReducedMotion();
  const letters = useRef(LETTERS.map(() => new Animated.Value(0))).current;
  const lit = useRef(LETTERS.map(() => new Animated.Value(0))).current;
  const words = useRef(WORDS.map(() => new Animated.Value(0))).current;
  const bloom = useRef(new Animated.Value(0)).current;
  const out = useRef(new Animated.Value(1)).current;
  const [leaving, setLeaving] = useState(false);
  const done = useRef(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const finish = () => {
    if (done.current) return;
    done.current = true;
    timers.current.forEach(clearTimeout);
    setLeaving(true);
    // Mount the onboarding underneath now, so its entrance plays while the intro fades away.
    onReveal();
    Animated.timing(out, { toValue: 0, duration: FADE_MS, easing: Easing.out(Easing.quad), useNativeDriver: true }).start(() => onDone());
  };

  useEffect(() => {
    preloadSounds();
    const at = (ms: number, f: () => void) => timers.current.push(setTimeout(f, ms));
    if (reduced) {
      [...letters, ...lit, ...words, bloom].forEach((v) => v.setValue(1));
      at(1600, finish);
      return () => timers.current.forEach(clearTimeout);
    }
    letters.forEach((v, i) =>
      at(LETTER_START + i * LETTER_STAGGER, () => {
        buzz("tick");
        Animated.spring(v, { toValue: 1, ...springs.lively, useNativeDriver: true }).start();
      }),
    );
    WORDS.forEach((w, i) =>
      at(WORDS_START + i * WORD_STAGGER, () => {
        buzz("tick");
        Animated.spring(words[i]!, { toValue: 1, ...springs.snappy, useNativeDriver: true }).start();
        w.letters.forEach((li) =>
          Animated.sequence([
            Animated.timing(lit[li]!, { toValue: 1.25, duration: 140, easing: Easing.out(Easing.quad), useNativeDriver: true }),
            Animated.spring(lit[li]!, { toValue: 1, ...springs.lively, useNativeDriver: true }),
          ]).start(),
        );
      }),
    );
    at(BLOOM_AT, () => {
      buzz("success");
      Animated.timing(bloom, { toValue: 1, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    });
    at(END_AT, finish);
    return () => timers.current.forEach(clearTimeout);
    // Runs once; `reduced` only changes the first frame.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced]);

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.root, { opacity: out }]} pointerEvents={leaving ? "none" : "auto"}>
      <WelcomeBackground />
      <Pressable style={styles.center} onPress={finish} accessibilityLabel="PIWCO: Please Invest With Confidence. Tap to continue">
        <View style={styles.wordBox}>
          <Animated.View
            pointerEvents="none"
            style={[
              styles.bloom,
              { opacity: bloom, transform: [{ scale: bloom.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }] },
            ]}
          >
            <Svg width={320} height={320}>
              <Defs>
                <RadialGradient id="introBloom" cx="50%" cy="50%" r="50%">
                  <Stop offset="0" stopColor={colors.yellow} stopOpacity={0.4} />
                  <Stop offset="0.5" stopColor={colors.yellow} stopOpacity={0.1} />
                  <Stop offset="1" stopColor={colors.yellow} stopOpacity={0} />
                </RadialGradient>
              </Defs>
              <Circle cx={160} cy={160} r={160} fill="url(#introBloom)" />
            </Svg>
          </Animated.View>
          <View style={styles.letters}>
            {LETTERS.map((l, i) => (
              <Animated.Text
                key={l + i}
                style={[
                  styles.letter,
                  {
                    opacity: letters[i]!.interpolate({ inputRange: [0, 0.3], outputRange: [0, 1], extrapolate: "clamp" }),
                    color: colors.onPetrol,
                    transform: [
                      { translateY: letters[i]!.interpolate({ inputRange: [0, 1], outputRange: [26, 0] }) },
                      { scale: Animated.multiply(letters[i]!, lit[i]!.interpolate({ inputRange: [0, 1, 1.25], outputRange: [1, 1, 1.25] })) },
                    ],
                  },
                ]}
              >
                {l}
              </Animated.Text>
            ))}
            {/* Yellow copies on top light up as their word arrives. */}
            <View style={[StyleSheet.absoluteFill, styles.letters]} pointerEvents="none">
              {LETTERS.map((l, i) => (
                <Animated.Text
                  key={`lit${i}`}
                  style={[
                    styles.letter,
                    {
                      color: colors.yellow,
                      opacity: lit[i]!.interpolate({ inputRange: [0, 1], outputRange: [0, 1], extrapolate: "clamp" }),
                      transform: [{ scale: lit[i]!.interpolate({ inputRange: [0, 1, 1.25], outputRange: [1, 1, 1.25] }) }],
                    },
                  ]}
                >
                  {l}
                </Animated.Text>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.words}>
          {WORDS.map((w, i) => (
            <Animated.View
              key={w.word}
              style={{
                opacity: words[i]!.interpolate({ inputRange: [0, 0.4], outputRange: [0, 1], extrapolate: "clamp" }),
                transform: [{ translateX: words[i]!.interpolate({ inputRange: [0, 1], outputRange: [-28, 0] }) }],
              }}
            >
              <Text style={styles.word}>
                <Text style={styles.initial}>{w.word.slice(0, w.initials)}</Text>
                {w.word.slice(w.initials)}
              </Text>
            </Animated.View>
          ))}
        </View>

      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: colors.petrol900, zIndex: 100 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 28, paddingHorizontal: 24 },
  wordBox: { alignItems: "center", justifyContent: "center" },
  bloom: { position: "absolute" },
  letters: { flexDirection: "row", justifyContent: "center", gap: 4 },
  letter: { fontFamily: font.extrabold, fontSize: 68, lineHeight: 78, letterSpacing: 2 },
  words: { alignItems: "flex-start", gap: 2 },
  word: { fontFamily: font.bold, fontSize: 30, lineHeight: 38, color: colors.onPetrolSub, letterSpacing: 0.3 },
  initial: { fontFamily: font.extrabold, color: colors.yellow },
});
