import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { DateNavigator } from "@/components/DateNavigator";
import { Meter } from "@/components/Meter";
import { Screen } from "@/components/Screen";
import { TextRow } from "@/components/TextRow";
import { colors } from "@/constants/theme";
import { calculateAnalysis } from "@/lib/analysis";
import { closePlan, reopenPlan } from "@/lib/repository";
import { formatDuration, localTime } from "@/lib/time";
import { useAppStore } from "@/store/appStore";
import { ActivityLog, CategorySummary, PlannedBlock } from "@/lib/types";
import { categoryLabel } from "@/lib/labels";

export default function ReviewScreen() {
  const { date, analysis, refresh, plan, categories } = useAppStore();
  const [summaries, setSummaries] = useState<CategorySummary[]>([]);
  const [blocks, setBlocks] = useState<PlannedBlock[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);

  const load = useCallback(async () => {
    const result = await calculateAnalysis(date);
    setSummaries(result.summaries.filter((item) => item.plannedMinutes || item.recordedMinutes));
    setBlocks(result.blocks);
    setLogs(result.logs);
    await refresh(date);
  }, [date, refresh]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const recalculate = async () => {
    await load();
  };

  const closeCurrentPlan = async () => {
    await calculateAnalysis(date);
    await closePlan(date);
    await refresh(date);
  };

  const reopenCurrentPlan = async () => {
    await reopenPlan(date);
    await refresh(date);
  };

  return (
    <Screen title="하루 리뷰" subtitle="계획과 실제 기록을 분 단위로 비교합니다.">
      <DateNavigator />
      <Button title="분석 다시 계산" onPress={recalculate} />
      {plan?.status === "closed" ? (
        <Button title="계획 다시 열기" onPress={reopenCurrentPlan} variant="secondary" />
      ) : (
        <Button title="하루 리뷰 마감" onPress={closeCurrentPlan} disabled={!plan} />
      )}
      {analysis ? (
        <Card>
          <Text style={styles.title}>요약</Text>
          <Meter
            label="계획 일치율"
            value={analysis.planMatchRate}
            detail={`${Math.round(analysis.planMatchRate * 100)}%`}
          />
          <Meter
            label="기록된 하루"
            value={analysis.totalRecordedMinutes / (24 * 60)}
            detail={formatDuration(analysis.totalRecordedMinutes)}
          />
          <Meter
            label="자기계발"
            value={analysis.totalRecordedMinutes > 0 ? analysis.selfInvestmentMinutes / analysis.totalRecordedMinutes : 0}
            detail={formatDuration(analysis.selfInvestmentMinutes)}
          />
          <TextRow label="전체 계획" value={formatDuration(analysis.totalPlannedMinutes)} />
          <TextRow label="전체 기록" value={formatDuration(analysis.totalRecordedMinutes)} />
          <TextRow label="일치 시간" value={formatDuration(analysis.matchedMinutes)} />
          <TextRow label="계획 일치율" value={`${Math.round(analysis.planMatchRate * 100)}%`} />
          <TextRow label="계획 밖 활동" value={formatDuration(analysis.unplannedMinutes)} />
          <TextRow label="미기록 계획" value={formatDuration(analysis.unrecordedMinutes)} />
          <TextRow label="자기계발" value={formatDuration(analysis.selfInvestmentMinutes)} />
        </Card>
      ) : (
        <Card>
          <Text style={styles.muted}>아직 분석이 없습니다. 계획과 기록을 추가한 뒤 다시 계산해 주세요.</Text>
        </Card>
      )}

      <Card>
        <Text style={styles.title}>타임라인</Text>
        {[...blocks.map((block) => ({ type: "계획" as const, start: block.startDateTime, end: block.endDateTime, title: block.title })),
          ...logs.map((log) => ({
            type: "실제" as const,
            start: log.startDateTime,
            end: log.endDateTime,
            title: log.title,
          })),
        ]
          .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
          .map((item, index) => (
            <View key={`${item.type}-${item.start}-${index}`} style={styles.timelineLine}>
              <Text style={item.type === "계획" ? styles.planBadge : styles.actualBadge}>{item.type}</Text>
              <View style={styles.timelineBody}>
                <Text style={styles.primary}>{item.title}</Text>
                <Text style={styles.muted}>
                  {localTime(item.start)}-{item.end ? localTime(item.end) : "진행 중"}
                </Text>
              </View>
            </View>
          ))}
        {!blocks.length && !logs.length ? <Text style={styles.muted}>이 날짜에는 계획 블록이나 활동 기록이 없습니다.</Text> : null}
      </Card>

      <Card>
        <Text style={styles.title}>카테고리</Text>
        {summaries.length ? (
          summaries.map((item) => (
            <View key={item.categoryId} style={styles.categoryLine}>
              <Text style={styles.primary}>{categoryLabel(categories.find((category) => category.id === item.categoryId) ?? { id: item.categoryId, name: item.name, type: "other", isSelfInvestment: false })}</Text>
              <Text style={styles.muted}>
                계획 {formatDuration(item.plannedMinutes)} / 실제 {formatDuration(item.recordedMinutes)}
              </Text>
            </View>
          ))
        ) : (
          <Text style={styles.muted}>카테고리 합계를 보려면 분석을 다시 계산해 주세요.</Text>
        )}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "800",
  },
  primary: {
    color: colors.text,
    fontWeight: "700",
  },
  muted: {
    color: colors.muted,
  },
  categoryLine: {
    borderTopColor: colors.line,
    borderTopWidth: 1,
    gap: 4,
    paddingTop: 10,
  },
  timelineLine: {
    alignItems: "center",
    borderTopColor: colors.line,
    borderTopWidth: 1,
    flexDirection: "row",
    gap: 10,
    paddingTop: 10,
  },
  timelineBody: {
    flex: 1,
    gap: 3,
  },
  planBadge: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    color: "#fff",
    fontSize: 12,
    fontWeight: "800",
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 5,
    width: 58,
    textAlign: "center",
  },
  actualBadge: {
    backgroundColor: colors.success,
    borderRadius: 8,
    color: "#fff",
    fontSize: 12,
    fontWeight: "800",
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 5,
    width: 58,
    textAlign: "center",
  },
});
