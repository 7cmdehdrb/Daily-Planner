import { Alert, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { DateNavigator } from "@/components/DateNavigator";
import { Screen } from "@/components/Screen";
import { colors } from "@/constants/theme";
import { createAiFeedback, deleteFeedback, listFeedback } from "@/lib/ai";
import { hasOpenAiKey } from "@/lib/secureKey";
import { localTime } from "@/lib/time";
import { AIFeedback } from "@/lib/types";
import { useAppStore } from "@/store/appStore";

const parseFeedback = (feedback: AIFeedback | null) => {
  if (!feedback) return null;
  try {
    return JSON.parse(feedback.outputJson) as Record<string, unknown>;
  } catch {
    return {
      overallFeedback: "저장된 피드백을 JSON으로 해석할 수 없습니다.",
      strengths: [],
      problems: ["JSON 해석에 실패했습니다."],
      suggestionsForTomorrow: [],
      recommendedPlan: [],
    };
  }
};

export default function AiScreen() {
  const { date } = useAppStore();
  const [hasKey, setHasKey] = useState(false);
  const [feedbackList, setFeedbackList] = useState<AIFeedback[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const selectedFeedback = feedbackList.find((item) => item.id === selectedId) ?? feedbackList[0] ?? null;
  const parsed = parseFeedback(selectedFeedback);

  const load = useCallback(async () => {
    setHasKey(await hasOpenAiKey());
    const rows = await listFeedback(date);
    setFeedbackList(rows);
    setSelectedId((current) => (current && rows.some((row) => row.id === current) ? current : rows[0]?.id ?? null));
  }, [date]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const generate = async () => {
    try {
      setBusy(true);
      const result = await createAiFeedback(date);
      await load();
      setSelectedId(result.id);
    } catch (error) {
      Alert.alert("AI 피드백 실패", error instanceof Error ? error.message : "API 키와 네트워크 상태를 확인해 주세요.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (feedbackId: string) => {
    await deleteFeedback(feedbackId);
    await load();
  };

  return (
    <Screen title="AI 피드백" subtitle="OpenAI API 키를 저장한 경우에만 사용할 수 있습니다.">
      <DateNavigator />
      <Card>
        <Text style={styles.title}>API 키</Text>
        <Text style={styles.muted}>{hasKey ? "OpenAI API 키가 SecureStore에 저장되어 있습니다." : "저장된 OpenAI API 키가 없습니다."}</Text>
      </Card>
      {!hasKey ? (
        <Card>
          <Text style={styles.muted}>설정에서 OpenAI API 키를 입력하면 AI 피드백을 사용할 수 있습니다.</Text>
        </Card>
      ) : (
        <>
          <Button title={busy ? "생성 중..." : feedbackList.length ? "피드백 다시 생성" : "피드백 생성"} onPress={generate} disabled={busy} />
          {feedbackList.length ? (
            <Card>
              <Text style={styles.title}>저장된 피드백</Text>
              {feedbackList.map((item) => (
                <View key={item.id} style={styles.feedbackRow}>
                  <Text style={styles.body}>{localTime(item.createdAt)}</Text>
                  <Button title={selectedFeedback?.id === item.id ? "선택됨" : "보기"} onPress={() => setSelectedId(item.id)} variant="secondary" />
                  <Button title="삭제" onPress={() => remove(item.id)} variant="secondary" />
                </View>
              ))}
            </Card>
          ) : null}
          {parsed ? (
            <Card>
              <Text style={styles.title}>종합 의견</Text>
              <Text style={styles.body}>{String(parsed.overallFeedback ?? "")}</Text>
              <Text style={styles.title}>잘한 점</Text>
              <Text style={styles.body}>{Array.isArray(parsed.strengths) ? parsed.strengths.join("\n") : String(parsed.strengths ?? "")}</Text>
              <Text style={styles.title}>문제점</Text>
              <Text style={styles.body}>{Array.isArray(parsed.problems) ? parsed.problems.join("\n") : String(parsed.problems ?? "")}</Text>
              <Text style={styles.title}>내일 제안</Text>
              <Text style={styles.body}>
                {Array.isArray(parsed.suggestionsForTomorrow)
                  ? parsed.suggestionsForTomorrow.join("\n")
                  : String(parsed.suggestionsForTomorrow ?? "")}
              </Text>
              <Text style={styles.title}>추천 계획</Text>
              <Text style={styles.body}>
                {Array.isArray(parsed.recommendedPlan) ? parsed.recommendedPlan.join("\n") : String(parsed.recommendedPlan ?? "")}
              </Text>
            </Card>
          ) : (
            <Card>
              <Text style={styles.muted}>이 날짜에 저장된 피드백이 없습니다.</Text>
            </Card>
          )}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "800",
  },
  body: {
    color: colors.text,
    lineHeight: 20,
  },
  muted: {
    color: colors.muted,
  },
  feedbackRow: {
    alignItems: "center",
    borderTopColor: colors.line,
    borderTopWidth: 1,
    flexDirection: "row",
    gap: 8,
    paddingTop: 10,
  },
});
