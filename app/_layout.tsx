import { useEffect, useState } from "react";
import { Stack } from "expo-router";
import { ActivityIndicator, Image, Pressable, Text, View } from "react-native";
import { colors } from "@/constants/theme";
import { initializePlanNotifications } from "@/lib/planNotifications";
import { useAppStore } from "@/store/appStore";

export default function RootLayout() {
  const ready = useAppStore((state) => state.ready);
  const init = useAppStore((state) => state.init);
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    init().catch((error) => {
      const message = error instanceof Error ? error.message : "앱 초기화 중 알 수 없는 오류가 발생했습니다.";
      console.error("App init failed", error);
      setInitError(message);
    });
  }, [init]);

  useEffect(() => {
    if (!ready) return;
    initializePlanNotifications().catch((error) => {
      console.warn("Notification initialization failed", error);
    });
  }, [ready]);

  if (initError) {
    return (
      <View style={{ backgroundColor: colors.bg, flex: 1, justifyContent: "center", padding: 24, gap: 14 }}>
        <Text style={{ color: colors.text, fontSize: 20, fontWeight: "900" }}>앱을 시작할 수 없음</Text>
        <Text style={{ color: colors.muted, lineHeight: 20 }}>{initError}</Text>
        <Pressable
          onPress={() => {
            setInitError(null);
            init().catch((error) => {
              const message = error instanceof Error ? error.message : "앱 초기화 중 알 수 없는 오류가 발생했습니다.";
              console.error("App init retry failed", error);
              setInitError(message);
            });
          }}
          style={{ alignItems: "center", backgroundColor: colors.primary, borderRadius: 8, minHeight: 44, justifyContent: "center" }}
        >
          <Text style={{ color: "#fff", fontWeight: "900" }}>다시 시도</Text>
        </Pressable>
      </View>
    );
  }

  if (!ready) {
    return (
      <View style={{ alignItems: "center", backgroundColor: colors.bg, flex: 1, gap: 18, justifyContent: "center" }}>
        <Image source={require("../assets/splash-icon.png")} style={{ height: 128, width: 128 }} resizeMode="contain" />
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
