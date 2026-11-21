import { OnboardingFlow } from "../onboarding/OnboardingFlow";

// If the onboarding crashes, show the error on the phone (with "Retry") instead of failing silently.
export { ErrorBoundary } from "expo-router";

// The app opens on the onboarding analysis (the "Finance Quest" artifact design).
export default function IndexScreen() {
  return <OnboardingFlow />;
}
