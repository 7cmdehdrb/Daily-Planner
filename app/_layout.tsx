import { useEffect } from "react";
import { Stack } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { colors } from "@/constants/theme";
import { useAppStore } from "@/store/appStore";

export default function RootLayout() {
  const ready = useAppStore((state) => state.ready);
  const init = useAppStore((state) => state.init);

  useEffect(() => {
    init();
  }, [init]);

  if (!ready) {
    return (
      <View style={{ alignItems: "center", backgroundColor: colors.bg, flex: 1, justifyContent: "center" }}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}
