import dayjs from "dayjs";
import { useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { DateNavigator } from "@/components/DateNavigator";
import { Meter } from "@/components/Meter";
import { Screen } from "@/components/Screen";
import { TextRow } from "@/components/TextRow";
import { colors } from "@/constants/theme";
import { calculateAnalysis } from "@/lib/analysis";
import { closePlan, getSetting, reopenPlan } from "@/lib/repository";
import { combineDateAndTime, formatDuration, localTime, timeTextToMinutes } from "@/lib/time";
import { useAppStore } from "@/store/appStore";
import { ActivityLog, CategorySummary, PlannedBlock } from "@/lib/types";
import { categoryLabel } from "@/lib/labels";

const minuteHeight = 1.15;
const dayMinutes = 24 * 60;
const blockGapPx = 4;

const categoryColors: Record<string, { accent: string; fill: string }> = {
  job: { accent: "#4F46E5", fill: "#EEF2FF" },
  study: { accent: "#7C3AED", fill: "#F3E8FF" },
  exercise: { accent: "#059669", fill: "#D1FAE5" },
  hobby: { accent: "#DB2777", fill: "#FCE7F3" },
  rest: { accent: "#6B7280", fill: "#F3F4F6" },
  sleep: { accent: "#334155", fill: "#E2E8F0" },
  meal: { accent: "#D97706", fill: "#FEF3C7" },
  transit: { accent: "#2563EB", fill: "#DBEAFE" },
  chores: { accent: "#0F766E", fill: "#CCFBF1" },
  other: { accent: "#64748B", fill: "#F1F5F9" },
};

type TimelineItem = {
  id: string;
  title: string;
  categoryId?: string | null;
  categoryName: string;
  startMinute: number;
  endMinute: number;
  startTime: string;
  endTime: string;
  isActive?: boolean;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const formatAxisMinute = (minute: number, dayStartTime: string) => {
  const total = (timeTextToMinutes(dayStartTime) + minute) % dayMinutes;
  const hour = Math.floor(total / 60);
  const mins = total % 60;
  return `${String(hour).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
};

const minutesFromWindowStart = (iso: string, windowStartIso: string) => {
  return Math.round(dayjs(iso).diff(dayjs(windowStartIso), "minute", true));
};

export default function ReviewScreen() {
  const { date, analysis, refresh, plan, categories } = useAppStore();
  const [summaries, setSummaries] = useState<CategorySummary[]>([]);
  const [blocks, setBlocks] = useState<PlannedBlock[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [dayStartTime, setDayStartTime] = useState("05:00");

  const load = useCallback(async () => {
    const nextDayStartTime = await getSetting("dayStartTime", "05:00");
    const result = await calculateAnalysis(date);
    setDayStartTime(nextDayStartTime);
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

  const timelineData = useMemo(() => {
    const windowStartIso = combineDateAndTime(date, dayStartTime);
    const categoryName = (categoryId?: string | null) => {
      const category = categories.find((item) => item.id === categoryId);
      return category ? categoryLabel(category) : "기타";
    };
    const toItem = ({
      id,
      title,
      categoryId,
      startIso,
      endIso,
      isActive,
    }: {
      id: string;
      title: string;
      categoryId?: string | null;
      startIso: string;
      endIso?: string | null;
      isActive?: boolean;
    }): TimelineItem | null => {
      const startMinute = clamp(minutesFromWindowStart(startIso, windowStartIso), 0, dayMinutes);
      const rawEndMinute = clamp(minutesFromWindowStart(endIso ?? new Date().toISOString(), windowStartIso), 0, dayMinutes);
      if (rawEndMinute <= startMinute) return null;
      return {
        id,
        title,
        categoryId,
        categoryName: categoryName(categoryId),
        startMinute,
        endMinute: rawEndMinute,
        startTime: localTime(startIso),
        endTime: endIso ? localTime(endIso) : "진행 중",
        isActive,
      };
    };

    return {
      planned: blocks
        .map((block) =>
          toItem({
            id: block.id,
            title: block.title,
            categoryId: block.categoryId,
            startIso: block.startDateTime,
            endIso: block.endDateTime,
          }),
        )
        .filter((item): item is TimelineItem => Boolean(item))
        .sort((a, b) => a.startMinute - b.startMinute),
      actual: logs
        .map((log) =>
          toItem({
            id: log.id,
            title: log.title,
            categoryId: log.categoryId,
            startIso: log.startDateTime,
            endIso: log.endDateTime,
            isActive: !log.endDateTime,
          }),
        )
        .filter((item): item is TimelineItem => Boolean(item))
        .sort((a, b) => a.startMinute - b.startMinute),
    };
  }, [blocks, categories, date, dayStartTime, logs]);

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
        <TimelineCompare
          planned={timelineData.planned}
          actual={timelineData.actual}
          dayStartTime={dayStartTime}
        />
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

function TimelineCompare({
  planned,
  actual,
  dayStartTime,
}: {
  planned: TimelineItem[];
  actual: TimelineItem[];
  dayStartTime: string;
}) {
  return (
    <View style={styles.compareWrap}>
      <View style={styles.compareHeader}>
        <View style={styles.axisSpacer} />
        <View style={styles.laneHeader}>
          <View style={[styles.laneDot, { backgroundColor: colors.primary }]} />
          <Text style={styles.laneHeaderText}>계획</Text>
        </View>
        <View style={styles.laneHeader}>
          <View style={[styles.laneDot, { backgroundColor: colors.success }]} />
          <Text style={styles.laneHeaderText}>실제</Text>
        </View>
      </View>
      <View style={[styles.compareTimeline, { height: dayMinutes * minuteHeight }]}>
        {Array.from({ length: 25 }).map((_, index) => {
          const minute = index * 60;
          return (
            <View key={minute} pointerEvents="none" style={[styles.hourLine, { top: minute * minuteHeight }]}>
              <Text style={styles.hourText}>{formatAxisMinute(minute, dayStartTime)}</Text>
              <View style={styles.hourRule} />
            </View>
          );
        })}
        <View style={styles.compareLanes}>
          <View style={styles.compareLane}>
            {planned.map((item) => (
              <TimelineVisualBlock key={item.id} item={item} tone="planned" />
            ))}
          </View>
          <View style={styles.compareLane}>
            {actual.map((item) => (
              <TimelineVisualBlock key={item.id} item={item} tone="actual" />
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}

function TimelineVisualBlock({ item, tone }: { item: TimelineItem; tone: "planned" | "actual" }) {
  const palette = categoryColors[item.categoryId ?? "other"] ?? categoryColors.other;
  const top = item.startMinute * minuteHeight + blockGapPx / 2;
  const rawHeight = (item.endMinute - item.startMinute) * minuteHeight;
  const height = Math.max(30, rawHeight - blockGapPx);
  const accent = tone === "planned" ? palette.accent : colors.success;
  const fill = tone === "planned" ? palette.fill : "#DCFCE7";
  const showMeta = height >= 52;

  return (
    <View style={[styles.visualBlock, { top, height, backgroundColor: fill, borderColor: accent }]}>
      <View style={[styles.visualBar, { backgroundColor: accent }]} />
      <Text style={styles.visualTitle} numberOfLines={1}>
        {item.title}
      </Text>
      {showMeta ? (
        <>
          <Text style={styles.visualTime} numberOfLines={1}>
            {item.startTime}-{item.endTime}
          </Text>
          <Text style={[styles.visualCategory, { color: accent }]} numberOfLines={1}>
            {item.isActive ? "진행 중 / " : ""}
            {item.categoryName}
          </Text>
        </>
      ) : null}
    </View>
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
  compareWrap: {
    gap: 8,
  },
  compareHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  axisSpacer: {
    width: 50,
  },
  laneHeader: {
    alignItems: "center",
    backgroundColor: colors.chip,
    borderRadius: 8,
    flex: 1,
    flexDirection: "row",
    gap: 6,
    justifyContent: "center",
    minHeight: 34,
  },
  laneDot: {
    borderRadius: 999,
    height: 8,
    width: 8,
  },
  laneHeaderText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "800",
  },
  compareTimeline: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 8,
    borderWidth: 1,
    overflow: "hidden",
    position: "relative",
  },
  hourLine: {
    alignItems: "center",
    flexDirection: "row",
    left: 0,
    position: "absolute",
    right: 0,
  },
  hourText: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "700",
    paddingLeft: 8,
    width: 50,
  },
  hourRule: {
    backgroundColor: colors.line,
    flex: 1,
    height: 1,
  },
  compareLanes: {
    bottom: 0,
    flexDirection: "row",
    gap: 8,
    left: 50,
    position: "absolute",
    right: 8,
    top: 0,
  },
  compareLane: {
    flex: 1,
    position: "relative",
  },
  visualBlock: {
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: "center",
    left: 0,
    overflow: "hidden",
    paddingLeft: 10,
    paddingRight: 7,
    position: "absolute",
    right: 0,
  },
  visualBar: {
    bottom: 0,
    left: 0,
    position: "absolute",
    top: 0,
    width: 4,
  },
  visualTitle: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "800",
  },
  visualTime: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: "700",
  },
  visualCategory: {
    fontSize: 10,
    fontWeight: "800",
  },
});
