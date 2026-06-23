import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useMemo, useState } from "react";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { DateNavigator } from "@/components/DateNavigator";
import { Field } from "@/components/Field";
import { Screen } from "@/components/Screen";
import { colors } from "@/constants/theme";
import { categoryLabel, sortCategoriesByPriority } from "@/lib/labels";
import { deleteActivityLog, startActivity, stopActiveActivity, updateActivityLog } from "@/lib/repository";
import { combineDateAndRange, combineDateAndTime, localTime, todayKey } from "@/lib/time";
import { activityLogEditInputSchema, manualActivityInputSchema, validationMessage } from "@/lib/validation";
import { useAppStore } from "@/store/appStore";

export default function LoggerScreen() {
  const { date, plan, blocks, activeLog, logs, categories, refresh } = useAppStore();
  const isToday = date === todayKey();
  const isClosed = plan?.status === "closed";
  const [manualTitle, setManualTitle] = useState("");
  const [categoryId, setCategoryId] = useState("other");
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editCategoryId, setEditCategoryId] = useState("other");
  const [editStartTime, setEditStartTime] = useState("09:00");
  const [editEndTime, setEditEndTime] = useState("");
  const sortedCategories = useMemo(() => sortCategoriesByPriority(categories), [categories]);

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
    await refresh(date);
  };

  const startManual = async () => {
    try {
      if (isClosed) {
        Alert.alert("마감된 계획", "기록하려면 리뷰에서 계획을 다시 열어 주세요.");
        return;
      }
      const parsed = manualActivityInputSchema.parse({ title: manualTitle, categoryId });
      await startActivity({ date, title: parsed.title, categoryId: parsed.categoryId });
      setManualTitle("");
      await refresh(date);
    } catch (error) {
      Alert.alert("활동을 시작할 수 없음", validationMessage(error));
    }
  };

  const stop = async () => {
    if (isClosed) {
      Alert.alert("마감된 계획", "기록을 변경하려면 리뷰에서 계획을 다시 열어 주세요.");
      return;
    }
    if (!isToday) {
      Alert.alert("실시간 기록은 오늘만 가능", "활동을 종료하려면 오늘 날짜로 이동해 주세요.");
      return;
    }
    const stopped = await stopActiveActivity();
    if (!stopped) Alert.alert("진행 중인 활동 없음", "종료할 활동이 없습니다.");
    await refresh(date);
  };

  const removeLog = async (logId: string) => {
    if (isClosed) {
      Alert.alert("마감된 계획", "기록을 삭제하려면 리뷰에서 계획을 다시 열어 주세요.");
      return;
    }
    await deleteActivityLog(logId);
    await refresh(date);
  };

  const beginEdit = (logId: string) => {
    if (isClosed) {
      Alert.alert("마감된 계획", "기록을 수정하려면 리뷰에서 계획을 다시 열어 주세요.");
      return;
    }
    const log = logs.find((item) => item.id === logId);
    if (!log) return;
    setEditingLogId(log.id);
    setEditTitle(log.title);
    setEditCategoryId(log.categoryId ?? "other");
    setEditStartTime(localTime(log.startDateTime));
    setEditEndTime(log.endDateTime ? localTime(log.endDateTime) : "");
  };

  const cancelEdit = () => {
    setEditingLogId(null);
    setEditTitle("");
    setEditStartTime("09:00");
    setEditEndTime("");
    setEditCategoryId("other");
  };

  const saveEdit = async () => {
    if (!editingLogId) return;
    try {
      if (isClosed) {
        Alert.alert("마감된 계획", "기록을 수정하려면 리뷰에서 계획을 다시 열어 주세요.");
        return;
      }
      const parsed = activityLogEditInputSchema.parse({
        title: editTitle,
        categoryId: editCategoryId,
        startTime: editStartTime,
        endTime: editEndTime,
      });
      const startDateTime = combineDateAndTime(date, parsed.startTime);
      const endDateTime = parsed.endTime ? combineDateAndRange(date, parsed.startTime, parsed.endTime).endDateTime : null;
      await updateActivityLog(editingLogId, {
        title: parsed.title,
        categoryId: parsed.categoryId,
        startDateTime,
        endDateTime,
      });
      cancelEdit();
      await refresh(date);
    } catch (error) {
      Alert.alert("기록을 저장할 수 없음", validationMessage(error));
    }
  };

  return (
    <Screen title="활동 기록" subtitle="한 번에 하나의 활동을 시작하고 종료합니다.">
      <DateNavigator />
      <Card>
        <Text style={styles.title}>현재 활동</Text>
        {!isToday ? (
          <Text style={styles.muted}>시작과 종료는 현재 시간을 사용하므로 오늘 날짜에서만 가능합니다.</Text>
        ) : isClosed ? (
          <Text style={styles.muted}>마감된 계획입니다. 기록을 바꾸려면 리뷰에서 다시 열어 주세요.</Text>
        ) : activeLog ? (
          <>
            <Text style={styles.primary}>{activeLog.title}</Text>
            <Text style={styles.muted}>{localTime(activeLog.startDateTime)} 시작</Text>
            <Button title="현재 활동 종료" onPress={stop} variant="danger" />
          </>
        ) : (
          <Text style={styles.muted}>진행 중인 활동이 없습니다.</Text>
        )}
      </Card>

      <Card>
        <Text style={styles.title}>계획에서 시작</Text>
        {blocks.length ? (
          blocks.map((block) => (
            <Button
              key={block.id}
              title={`${localTime(block.startDateTime)} ${block.title}`}
              onPress={() => startPlanned(block.id)}
              variant="secondary"
              disabled={!isToday || isClosed}
            />
          ))
        ) : (
          <Text style={styles.muted}>먼저 계획 블록을 추가해 주세요.</Text>
        )}
      </Card>

      <Card>
        <Text style={styles.title}>직접 입력</Text>
        <Field label="제목" value={manualTitle} onChangeText={setManualTitle} placeholder="갑자기 생긴 일" />
        <View style={styles.chips}>
          {sortedCategories.map((category) => (
            <Pressable
              key={category.id}
              onPress={() => setCategoryId(category.id)}
              style={[styles.chip, categoryId === category.id && styles.chipActive]}
            >
              <Text style={[styles.chipText, categoryId === category.id && styles.chipTextActive]}>{categoryLabel(category)}</Text>
            </Pressable>
          ))}
        </View>
        <Button title="직접 입력한 활동 시작" onPress={startManual} disabled={!manualTitle.trim() || !isToday || isClosed} />
      </Card>

      <Card>
        <Text style={styles.title}>오늘 기록</Text>
        {logs.length ? (
          logs.map((log) => (
            <View key={log.id} style={styles.logLine}>
              {editingLogId === log.id ? (
                <>
                  <Field label="제목" value={editTitle} onChangeText={setEditTitle} />
                  <View style={styles.timeRow}>
                    <Field label="시작" value={editStartTime} onChangeText={setEditStartTime} placeholder="09:00" />
                    <Field label="종료" value={editEndTime} onChangeText={setEditEndTime} placeholder="비우면 진행 중" />
                  </View>
                  <View style={styles.chips}>
                    {sortedCategories.map((category) => (
                      <Pressable
                        key={category.id}
                        onPress={() => setEditCategoryId(category.id)}
                        style={[styles.chip, editCategoryId === category.id && styles.chipActive]}
                      >
                        <Text style={[styles.chipText, editCategoryId === category.id && styles.chipTextActive]}>{categoryLabel(category)}</Text>
                      </Pressable>
                    ))}
                  </View>
                  <Button title="기록 저장" onPress={saveEdit} disabled={!editTitle.trim()} />
                  <Button title="취소" onPress={cancelEdit} variant="secondary" />
                </>
              ) : (
                <>
                  <Text style={styles.primary}>{log.title}</Text>
                  <Text style={styles.muted}>
                    {localTime(log.startDateTime)}-{log.endDateTime ? localTime(log.endDateTime) : "진행 중"}
                  </Text>
                  <Button title="기록 수정" onPress={() => beginEdit(log.id)} variant="secondary" />
                  <Button title="기록 삭제" onPress={() => removeLog(log.id)} variant="secondary" />
                </>
              )}
            </View>
          ))
        ) : (
          <Text style={styles.muted}>아직 기록이 없습니다.</Text>
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
  logLine: {
    borderTopColor: colors.line,
    borderTopWidth: 1,
    gap: 4,
    paddingTop: 10,
  },
  timeRow: {
    flexDirection: "row",
    gap: 10,
  },
});
