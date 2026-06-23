import { StyleSheet, Text, View } from "react-native";
import { colors } from "@/constants/theme";

type Props = {
  label: string;
  value: string;
};

export function TextRow({ label, value }: Props) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  label: {
    color: colors.muted,
    flex: 1,
  },
  value: {
    color: colors.text,
    fontWeight: "700",
    textAlign: "right",
  },
});
