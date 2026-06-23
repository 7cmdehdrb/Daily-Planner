import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/constants/theme";

const icon = (name: keyof typeof Ionicons.glyphMap) =>
  function TabIcon({ color, size }: { color: string; size: number }) {
    return <Ionicons name={name} color={color} size={size} />;
  };

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { borderTopColor: colors.line },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "홈", tabBarIcon: icon("today-outline") }} />
      <Tabs.Screen name="plan" options={{ title: "계획", tabBarIcon: icon("calendar-outline") }} />
      <Tabs.Screen name="logger" options={{ title: "기록", tabBarIcon: icon("play-circle-outline") }} />
      <Tabs.Screen name="review" options={{ title: "리뷰", tabBarIcon: icon("stats-chart-outline") }} />
      <Tabs.Screen name="ai" options={{ title: "AI", tabBarIcon: icon("sparkles-outline") }} />
      <Tabs.Screen name="settings" options={{ title: "설정", tabBarIcon: icon("settings-outline") }} />
      <Tabs.Screen name="templates" options={{ href: null }} />
    </Tabs>
  );
}
