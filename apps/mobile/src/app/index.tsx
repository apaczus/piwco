import { useState } from "react";
import { View } from "react-native";
import { BrandIntro } from "../onboarding/BrandIntro";
import { OnboardingFlow } from "../onboarding/OnboardingFlow";
import { colors } from "../theme";

// If the onboarding crashes, show the error on the phone (with "Retry") instead of failing silently.
export { ErrorBoundary } from "expo-router";

// The app opens on the PIWCO intro (Please Invest With Confidence, every start, tap to skip),
// then the onboarding analysis (the "Finance Quest" artifact design).
export default function IndexScreen() {
  const [onboarding, setOnboarding] = useState(false);
  const [intro, setIntro] = useState(true);
  return (
    <View style={{ flex: 1, backgroundColor: colors.petrol900 }}>
      {onboarding ? <OnboardingFlow /> : null}
      {intro ? <BrandIntro onReveal={() => setOnboarding(true)} onDone={() => setIntro(false)} /> : null}
    </View>
  );
}
