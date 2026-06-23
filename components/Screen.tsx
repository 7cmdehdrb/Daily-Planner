import { PropsWithChildren, RefObject } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "@/constants/theme";

type Props = PropsWithChildren<{
  title: string;
  subtitle?: string;
  scrollEnabled?: boolean;
  scrollViewRef?: RefObject<ScrollView | null>;
}>;

export function Screen({ title, subtitle, scrollEnabled = true, scrollViewRef, children }: Props) {
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.content}
        disableScrollViewPanResponder={!scrollEnabled}
        scrollEnabled={scrollEnabled}
      >
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    backgroundColor: colors.bg,
    flex: 1,
  },
  content: {
    gap: 14,
    padding: 16,
    paddingBottom: 36,
  },
  header: {
    gap: 4,
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: "800",
  },
  subtitle: {
    color: colors.muted,
    fontSize: 14,
  },
});
