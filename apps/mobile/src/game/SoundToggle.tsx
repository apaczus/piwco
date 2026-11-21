// Small speaker icon: mutes / unmutes the game's sounds (decided: on the game screen and in the lesson).
import { StyleSheet } from "react-native";
import Svg, { Path } from "react-native-svg";
import { buzz, PressScale } from "../onboarding/anim";
import { setMuted, useMuted } from "../sound";
import { colors } from "../theme";

export function SoundToggle({ onPetrol }: { onPetrol?: boolean }) {
  const muted = useMuted();
  const ink = onPetrol ? colors.onPetrolSub : colors.petrol700;
  return (
    <PressScale
      accessibilityLabel={muted ? "Turn sounds on" : "Turn sounds off"}
      onPress={() => {
        setMuted(!muted);
        // Unmuting gives an audible confirmation (buzz plays "pop" for "light").
        buzz(muted ? "light" : "tick");
      }}
      style={[styles.button, { backgroundColor: onPetrol ? "rgba(255,255,255,0.1)" : colors.petrol100 }]}
    >
      <Svg width={20} height={20} viewBox="0 0 24 24">
        <Path d="M4 9h4l5-4v14l-5-4H4z" fill={ink} />
        {muted ? (
          <Path d="M16 9l5 6M21 9l-5 6" stroke={ink} strokeWidth={2} strokeLinecap="round" />
        ) : (
          <Path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" stroke={ink} strokeWidth={2} strokeLinecap="round" fill="none" />
        )}
      </Svg>
    </PressScale>
  );
}

const styles = StyleSheet.create({
  button: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
});
