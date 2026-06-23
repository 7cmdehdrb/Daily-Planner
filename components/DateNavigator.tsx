import dayjs from "dayjs";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/constants/theme";
import { todayKey } from "@/lib/time";
import { useAppStore } from "@/store/appStore";

const weekdays = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"];

export function DateNavigator() {
  const date = useAppStore((state) => state.date);
  const refresh = useAppStore((state) => state.refresh);
  const isToday = date === todayKey();

  const move = (days: number) => {
    refresh(dayjs(date).add(days, "day").format("YYYY-MM-DD"));
  };

  return (
    <View style={styles.wrap}>
      <Pressable accessibilityRole="button" onPress={() => move(-1)} style={styles.iconButton}>
        <Ionicons name="chevron-back" color={colors.text} size={20} />
      </Pressable>
      <View style={styles.center}>
        <Text style={styles.date}>{dayjs(date).format("YYYY.MM.DD")}</Text>
        <Text style={styles.sub}>{isToday ? "오늘" : weekdays[dayjs(date).day()]}</Text>
      </View>
      <Pressable accessibilityRole="button" onPress={() => move(1)} style={styles.iconButton}>
        <Ionicons name="chevron-forward" color={colors.text} size={20} />
      </Pressable>
      {!isToday ? (
        <Pressable accessibilityRole="button" onPress={() => refresh(todayKey())} style={styles.todayButton}>
          <Text style={styles.todayText}>오늘</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    padding: 8,
  },
  iconButton: {
    alignItems: "center",
    backgroundColor: colors.chip,
    borderRadius: 8,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  center: {
    flex: 1,
  },
  date: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "800",
  },
  sub: {
    color: colors.muted,
    fontSize: 12,
  },
  todayButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  todayText: {
    color: "#fff",
    fontWeight: "800",
  },
});
