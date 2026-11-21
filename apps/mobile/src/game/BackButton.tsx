// "‹" back button for the screens after the month (and the welcome screen). Light on the night sky.
import Svg, { Path } from "react-native-svg";
import { buzz, PressScale } from "../onboarding/anim";
import { colors } from "../theme";

export function BackButton({ onPress, night }: { onPress: () => void; night: boolean }) {
  const ink = night ? colors.onPetrol : colors.petrol800;
  return (
    <PressScale
      accessibilityLabel="Back"
      onPress={() => {
        buzz("tick");
        onPress();
      }}
      style={{
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: night ? "rgba(255,255,255,0.1)" : colors.surface,
        borderWidth: night ? 0 : 1.5,
        borderColor: colors.line,
      }}
    >
      <Svg width={18} height={18} viewBox="0 0 24 24">
        <Path d="M15 5l-7 7 7 7" fill="none" stroke={ink} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    </PressScale>
  );
}
