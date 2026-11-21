// "Back to the month" pill on the side pages of the game pager (YEAR on the left, CITY on the right): scrolls back
// to LEARN, the main page. The arrow points to where LEARN is.
import { StyleSheet, Text } from "react-native";
import { buzz, PressScale } from "../onboarding/anim";
import { colors, font, shadow1 } from "../theme";
import { LEARN_PAGE, usePager } from "./GamePager";

export function BackToMonth({ side, label = "Back to the month" }: { side: "left" | "right"; label?: string }) {
  const pager = usePager();
  if (!pager) return null;
  return (
    <PressScale
      accessibilityLabel={label}
      onPress={() => {
        buzz("light");
        pager.goTo(LEARN_PAGE);
      }}
      style={[styles.pill, { alignSelf: side === "left" ? "flex-start" : "flex-end" }]}
    >
      <Text style={styles.text}>{side === "left" ? `‹ ${label}` : `${label} ›`}</Text>
    </PressScale>
  );
}

const styles = StyleSheet.create({
  pill: {
    backgroundColor: colors.surface,
    borderRadius: 99,
    borderWidth: 1.5,
    borderColor: colors.line,
    paddingVertical: 8,
    paddingHorizontal: 14,
    ...shadow1,
  },
  text: { fontFamily: font.extrabold, fontSize: 13.5, color: colors.petrol900 },
});
