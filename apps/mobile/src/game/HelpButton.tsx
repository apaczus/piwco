// "?" on the game screen header: opens the tutorial again.
import { StyleSheet, Text } from "react-native";
import { buzz, PressScale } from "../onboarding/anim";
import { colors, font } from "../theme";

export function HelpButton({ onPress }: { onPress: () => void }) {
  return (
    <PressScale
      accessibilityLabel="How to play"
      onPress={() => {
        buzz("light");
        onPress();
      }}
      style={styles.button}
    >
      <Text style={styles.text}>?</Text>
    </PressScale>
  );
}

const styles = StyleSheet.create({
  button: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: colors.petrol100 },
  text: { fontFamily: font.extrabold, fontSize: 18, color: colors.petrol700 },
});
