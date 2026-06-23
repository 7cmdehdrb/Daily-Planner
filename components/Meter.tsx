import { StyleSheet, Text, View } from "react-native";
import type { DimensionValue } from "react-native";
import { colors } from "@/constants/theme";

type Props = {
  label: string;
  value: number;
  detail: string;
};

export function Meter({ label, value, detail }: Props) {
  const width = `${Math.max(0, Math.min(100, Math.round(value * 100)))}%` as DimensionValue;
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.detail}>{detail}</Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 6,
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  label: {
    color: colors.text,
    fontWeight: "800",
  },
  detail: {
    color: colors.muted,
    fontWeight: "700",
  },
  track: {
    backgroundColor: colors.chip,
    borderRadius: 8,
    height: 10,
    overflow: "hidden",
  },
  fill: {
    backgroundColor: colors.success,
    height: "100%",
  },
});
