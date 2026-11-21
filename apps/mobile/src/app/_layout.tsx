import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
  useFonts,
} from "@expo-google-fonts/manrope";
import { Stack } from "expo-router";
import { View } from "react-native";
import { colors } from "../theme";

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
  });

  // Plain petrol screen (same as the first welcome slide) until the font is ready.
  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: colors.petrol900 }} />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
