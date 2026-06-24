import { useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Alert, Pressable, Text, View, StyleSheet } from "react-native";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { DateNavigator } from "@/components/DateNavigator";
import { Field } from "@/components/Field";
import { Screen } from "@/components/Screen";
import { TextRow } from "@/components/TextRow";
import { colors } from "@/constants/theme";
import { APP_NAME, categoryLabel, planStatusLabel, sortCategoriesByPriority } from "@/lib/labels";
import { cancelPlannedBlockNotification } from "@/lib/planNotifications";
import { startActivity, stopActiveActivity } from "@/lib/repository";
import { formatDuration, localTime, todayKey } from "@/lib/time";
import { manualActivityInputSchema, validationMessage } from "@/lib/validation";
import { useAppStore } from "@/store/appStore";

export default function HomeScreen() {
  const { date, plan, blocks, activeLog, analysis, refresh, categories } = useAppStore();
  const [manualTitle, setManualTitle] = useState("");
  const [manualCategoryId, setManualCategoryId] = useState("other");
  const isToday = date === todayKey();
  const isClosed = plan?.status === "closed";
  const now = Date.now();
  const currentBlock = blocks.find(
    (block) => new Date(block.startDateTime).getTime() <= now && new Date(block.endDateTime).getTime() > now,
  );
  const nextBlock = blocks.find((block) => new Date(block.startDateTime).getTime() > now);
  const sortedCategories = useMemo(() => sortCategoriesByPriority(categories), [categories]);

  useFocusEffect(
    useCallback(() => {
      refresh(date);
    }, [date, refresh]),
  );

  const cancelActivePlannedNotification = async () => {
    if (!activeLog?.plannedBlockId) return;
    const activeBlock = blocks.find((item) => item.id === activeLog.plannedBlockId);
    if (activeBlock) await cancelPlannedBlockNotification(activeBlock);
  };

  const stop = async () => {
    if (isClosed) {
      Alert.alert("마감된 계획", "기록을 수정하려면 리뷰에서 계획을 다시 열어 주세요.");
      return;
    }
    if (!isToday) {
      Alert.alert("실시간 기록은 오늘만 가능", "활동을 종료하려면 오늘 날짜로 이동해 주세요.");
      return;
    }
    await stopActiveActivity();
    await cancelActivePlannedNotification();
    await refresh(date);
  };

  const startPlanned = async (blockId: string) => {
    if (isClosed) {
      Alert.alert("마감된 계획", "기록하려면 리뷰에서 계획을 다시 열어 주세요.");
      return;
    }
    if (!isToday) {
      Alert.alert("실시간 기록은 오늘만 가능", "활동을 시작하려면 오늘 날짜로 이동해 주세요.");
      return;
    }
    const block = blocks.find((item) => item.id === blockId);
    if (!block) return;
    await startActivity({ date, title: block.title, categoryId: block.categoryId, plannedBlockId: block.id });
    await cancelActivePlannedNotification();
    await cancelPlannedBlockNotification(block);
    await refresh(date);
  };

  const startManual = async () => {
    try {
      if (!isToday) {
        Alert.alert("실시간 기록은 오늘만 가능", "활동을 시작하려면 오늘 날짜로 이동해 주세요.");
        return;
      }
      if (isClosed) {
        Alert.alert("마감된 계획", "기록하려면 리뷰에서 계획을 다시 열어 주세요.");
        return;
      }
      const parsed = manualActivityInputSchema.parse({ title: manualTitle, categoryId: manualCategoryId });
      await startActivity({ date, title: parsed.title, categoryId: parsed.categoryId });
      await cancelActivePlannedNotification();
      setManualTitle("");
      await refresh(date);
    } catch (error) {
      Alert.alert("활동을 시작할 수 없음", validationMessage(error));
    }
  };

  return (
    <Screen title={APP_NAME} subtitle={date}>
      <DateNavigator />
      <Card>
        <Text style={styles.sectionTitle}>오늘</Text>
        <TextRow label="계획 상태" value={planStatusLabel(plan?.status)} />
        <TextRow label="계획 블록" value={`${blocks.length}개`} />
        <TextRow label="일치율" value={analysis ? `${Math.round(analysis.planMatchRate * 100)}%` : "계산 전"} />
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>지금</Text>
        {activeLog ? (
          <>
            <Text style={styles.primaryText}>{activeLog.title}</Text>
            <Text style={styles.muted}>{localTime(activeLog.startDateTime)} 시작</Text>
            <Button title="활동 종료" onPress={stop} variant="danger" disabled={isClosed} />
          </>
        ) : (
          <Text style={styles.muted}>진행 중인 활동이 없습니다.</Text>
        )}
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>빠른 시작</Text>
        {isClosed ? <Text style={styles.muted}>마감된 계획입니다. 더 기록하려면 리뷰에서 다시 열어 주세요.</Text> : null}
        {currentBlock ? (
          <Button title={`현재 계획 시작: ${currentBlock.title}`} onPress={() => startPlanned(currentBlock.id)} disabled={!isToday || isClosed} />
        ) : null}
        {nextBlock ? (
          <Button title={`다음 계획 시작: ${nextBlock.title}`} onPress={() => startPlanned(nextBlock.id)} variant="secondary" disabled={!isToday || isClosed} />
        ) : null}
        <Field label="직접 입력" value={manualTitle} onChangeText={setManualTitle} placeholder="할 일 정리" />
        <View style={styles.chips}>
          {sortedCategories.map((category) => (
            <Pressable
              key={category.id}
              onPress={() => setManualCategoryId(category.id)}
              style={[styles.chip, manualCategoryId === category.id && styles.chipActive]}
            >
              <Text style={[styles.chipText, manualCategoryId === category.id && styles.chipTextActive]}>{categoryLabel(category)}</Text>
            </Pressable>
          ))}
        </View>
        <Button title="직접 입력한 활동 시작" onPress={startManual} disabled={!manualTitle.trim() || !isToday || isClosed} />
        {!isToday ? <Text style={styles.muted}>빠른 시작은 현재 시간을 사용하므로 오늘 날짜에서만 사용할 수 있습니다.</Text> : null}
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>현재 계획</Text>
        {currentBlock ? (
          <View style={styles.blockLine}>
            <Text style={styles.primaryText}>{currentBlock.title}</Text>
            <Text style={styles.muted}>
              {localTime(currentBlock.startDateTime)}-{localTime(currentBlock.endDateTime)}
            </Text>
          </View>
        ) : (
          <Text style={styles.muted}>현재 시간에 진행 중인 계획이 없습니다.</Text>
        )}
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>다음 계획</Text>
        {nextBlock ? (
          <View style={styles.blockLine}>
            <Text style={styles.primaryText}>{nextBlock.title}</Text>
            <Text style={styles.muted}>
              {localTime(nextBlock.startDateTime)}-{localTime(nextBlock.endDateTime)}
            </Text>
          </View>
        ) : (
          <Text style={styles.muted}>예정된 다음 계획이 없습니다.</Text>
        )}
      </Card>

      {analysis ? (
        <Card>
          <Text style={styles.sectionTitle}>최근 리뷰</Text>
          <TextRow label="계획" value={formatDuration(analysis.totalPlannedMinutes)} />
          <TextRow label="기록" value={formatDuration(analysis.totalRecordedMinutes)} />
          <TextRow label="일치" value={formatDuration(analysis.matchedMinutes)} />
        </Card>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "800",
  },
  primaryText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "700",
  },
  muted: {
    color: colors.muted,
  },
  blockLine: {
    gap: 4,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    backgroundColor: colors.chip,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  chipActive: {
    backgroundColor: colors.primary,
  },
  chipText: {
    color: colors.text,
    fontWeight: "700",
  },
  chipTextActive: {
    color: "#fff",
  },
});
