import { Alert, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { DateNavigator } from "@/components/DateNavigator";
import { Field } from "@/components/Field";
import { Screen } from "@/components/Screen";
import { TimeField } from "@/components/TimeField";
import { colors } from "@/constants/theme";
import { categoryLabel, sortCategoriesByPriority } from "@/lib/labels";
import { deleteActivityLog, startActivity, stopActiveActivity, updateActivityLog } from "@/lib/repository";
import { combineDateAndTime, formatDuration, localTime, minutesBetween, todayKey } from "@/lib/time";
import { activityLogEditInputSchema, manualActivityInputSchema, validationMessage } from "@/lib/validation";
import { ActivityLog, PlannedBlock } from "@/lib/types";
import { useAppStore } from "@/store/appStore";

export default function LoggerScreen() {
  const { date, plan, blocks, activeLog, logs, categories, refresh } = useAppStore();
  const isToday = date === todayKey();
  const isClosed = plan?.status === "closed";
  const [manualOpen, setManualOpen] = useState(false);
  const [manualTitle, setManualTitle] = useState("");
  const [categoryId, setCategoryId] = useState("other");
  const [editingLog, setEditingLog] = useState<ActivityLog | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editCategoryId, setEditCategoryId] = useState("other");
  const [editStartTime, setEditStartTime] = useState("09:00");
  const [editEndTime, setEditEndTime] = useState("");
  const [showAllPlans, setShowAllPlans] = useState(false);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  const sortedCategories = useMemo(() => sortCategoriesByPriority(categories), [categories]);
  const categoryById = useMemo(() => new Map(categories.map((category) => [category.id, category])), [categories]);
  const sortedBlocks = useMemo(
    () => [...blocks].sort((a, b) => new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime()),
    [blocks],
  );
  const recommendedBlocks = useMemo(() => {
    if (!isToday) return sortedBlocks.slice(0, 3);
    return [...sortedBlocks]
      .filter((block) => new Date(block.endDateTime).getTime() >= now - 30 * 60 * 1000)
      .sort((a, b) => Math.abs(new Date(a.startDateTime).getTime() - now) - Math.abs(new Date(b.startDateTime).getTime() - now))
      .slice(0, 3);
  }, [isToday, now, sortedBlocks]);
  const nearestBlock = recommendedBlocks[0] ?? sortedBlocks[0] ?? null;

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
      if (!isToday) {
        Alert.alert("실시간 기록은 오늘만 가능", "활동을 시작하려면 오늘 날짜로 이동해 주세요.");
        return;
      }
      const parsed = manualActivityInputSchema.parse({ title: manualTitle, categoryId });
      await startActivity({ date, title: parsed.title, categoryId: parsed.categoryId });
      setManualTitle("");
      setManualOpen(false);
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
    setEditingLog(null);
    await refresh(date);
  };

  const beginEdit = (log: ActivityLog) => {
    if (isClosed) {
      Alert.alert("마감된 계획", "기록을 수정하려면 리뷰에서 계획을 다시 열어 주세요.");
      return;
    }
    setEditingLog(log);
    setEditTitle(log.title);
    setEditCategoryId(log.categoryId ?? "other");
    setEditStartTime(localTime(log.startDateTime));
    setEditEndTime(log.endDateTime ? localTime(log.endDateTime) : "");
  };

  const saveEdit = async () => {
    if (!editingLog) return;
    try {
      const parsed = activityLogEditInputSchema.parse({
        title: editTitle,
        categoryId: editCategoryId,
        startTime: editStartTime,
        endTime: editEndTime,
      });
      await updateActivityLog(editingLog.id, {
        title: parsed.title,
        categoryId: parsed.categoryId,
        startDateTime: combineDateAndTime(date, parsed.startTime),
        endDateTime: parsed.endTime ? combineDateAndTime(date, parsed.endTime) : null,
      });
      setEditingLog(null);
      await refresh(date);
    } catch (error) {
      Alert.alert("기록을 저장할 수 없음", validationMessage(error));
    }
  };

  const activeMinutes = activeLog ? Math.max(0, Math.round((now - new Date(activeLog.startDateTime).getTime()) / 60000)) : 0;

  return (
    <Screen title="활동 기록" subtitle="지금 하는 활동을 빠르게 시작하고 종료합니다.">
      <CurrentActivityCard
        activeLog={activeLog}
        activeMinutes={activeMinutes}
        nearestBlock={nearestBlock}
        isToday={isToday}
        isClosed={isClosed}
        onStop={stop}
        onStartNearest={() => nearestBlock && startPlanned(nearestBlock.id)}
        onDirectStart={() => setManualOpen(true)}
      />

      <DateNavigator />

      <Card>
        <View style={styles.sectionHeader}>
          <Text style={styles.title}>추천 시작</Text>
          <Pressable onPress={() => setManualOpen(true)} disabled={!isToday || isClosed}>
            <Text style={[styles.linkText, (!isToday || isClosed) && styles.disabledText]}>직접 활동 시작</Text>
          </Pressable>
        </View>
        {recommendedBlocks.length ? (
          recommendedBlocks.map((block) => (
            <PlanListItem
              key={block.id}
              block={block}
              categoryName={categoryName(categoryById, block.categoryId)}
              onStart={() => startPlanned(block.id)}
              disabled={!isToday || isClosed}
            />
          ))
        ) : (
          <Text style={styles.muted}>현재 시각 근처에 추천할 계획이 없습니다.</Text>
        )}
      </Card>

      <Card>
        <View style={styles.sectionHeader}>
          <Text style={styles.title}>오늘 계획에서 선택</Text>
          <Pressable onPress={() => setShowAllPlans((value) => !value)}>
            <Text style={styles.linkText}>{showAllPlans ? "접기" : "전체 보기"}</Text>
          </Pressable>
        </View>
        {(showAllPlans ? sortedBlocks : sortedBlocks.slice(0, 3)).map((block) => (
          <PlanListItem
            key={block.id}
            block={block}
            categoryName={categoryName(categoryById, block.categoryId)}
            onStart={() => startPlanned(block.id)}
            disabled={!isToday || isClosed}
          />
        ))}
        {!sortedBlocks.length ? <Text style={styles.muted}>오늘 계획 블록이 없습니다.</Text> : null}
      </Card>

      <Card>
        <Text style={styles.title}>오늘 기록</Text>
        {logs.length ? (
          logs.map((log) => (
            <Pressable key={log.id} onPress={() => beginEdit(log)} style={styles.logItem}>
              <View style={styles.logMain}>
                <Text style={styles.primary}>{log.title}</Text>
                <Text style={styles.muted}>
                  {localTime(log.startDateTime)}-{log.endDateTime ? localTime(log.endDateTime) : "진행 중"}
                </Text>
              </View>
              <Text style={styles.logDuration}>{formatDuration(minutesBetween(log.startDateTime, log.endDateTime ?? new Date().toISOString()))}</Text>
            </Pressable>
          ))
        ) : (
          <Text style={styles.muted}>아직 기록이 없습니다.</Text>
        )}
      </Card>

      <ManualStartSheet
        visible={manualOpen}
        title={manualTitle}
        categoryId={categoryId}
        categories={sortedCategories}
        onTitleChange={setManualTitle}
        onCategoryChange={setCategoryId}
        onClose={() => setManualOpen(false)}
        onStart={startManual}
        disabled={!manualTitle.trim() || !isToday || isClosed}
      />

      <EditLogSheet
        log={editingLog}
        title={editTitle}
        categoryId={editCategoryId}
        startTime={editStartTime}
        endTime={editEndTime}
        categories={sortedCategories}
        onTitleChange={setEditTitle}
        onCategoryChange={setEditCategoryId}
        onStartTimeChange={setEditStartTime}
        onEndTimeChange={setEditEndTime}
        onClose={() => setEditingLog(null)}
        onSave={saveEdit}
        onDelete={() => editingLog && removeLog(editingLog.id)}
      />
    </Screen>
  );
}

function categoryName(categoryById: Map<string, any>, categoryId?: string | null) {
  const category = categoryId ? categoryById.get(categoryId) : null;
  return category ? categoryLabel(category) : "기타";
}

function CurrentActivityCard({
  activeLog,
  activeMinutes,
  nearestBlock,
  isToday,
  isClosed,
  onStop,
  onStartNearest,
  onDirectStart,
}: {
  activeLog: ActivityLog | null;
  activeMinutes: number;
  nearestBlock: PlannedBlock | null;
  isToday: boolean;
  isClosed: boolean;
  onStop: () => void;
  onStartNearest: () => void;
  onDirectStart: () => void;
}) {
  return (
    <Card>
      <Text style={styles.eyebrow}>Current Activity</Text>
      {activeLog ? (
        <>
          <Text style={styles.currentTitle}>{activeLog.title}</Text>
          <Text style={styles.currentMeta}>{localTime(activeLog.startDateTime)} 시작</Text>
          <Text style={styles.elapsed}>{formatDuration(activeMinutes)}</Text>
          <Button title="종료하기" onPress={onStop} variant="danger" style={styles.heroButton} disabled={!isToday || isClosed} />
        </>
      ) : (
        <>
          <Text style={styles.currentTitle}>진행 중인 활동 없음</Text>
          {nearestBlock ? (
            <>
              <Text style={styles.currentMeta}>
                가까운 계획: {localTime(nearestBlock.startDateTime)} {nearestBlock.title}
              </Text>
              <Button title="추천 계획 시작" onPress={onStartNearest} style={styles.heroButton} disabled={!isToday || isClosed} />
            </>
          ) : (
            <Text style={styles.currentMeta}>오늘 시작할 계획이 없습니다.</Text>
          )}
        </>
      )}
      <Button title="직접 활동 시작" onPress={onDirectStart} variant="secondary" disabled={!isToday || isClosed} />
    </Card>
  );
}

function PlanListItem({
  block,
  categoryName,
  onStart,
  disabled,
}: {
  block: PlannedBlock;
  categoryName: string;
  onStart: () => void;
  disabled?: boolean;
}) {
  return (
    <View style={styles.planItem}>
      <View style={styles.planTime}>
        <Text style={styles.timeText}>{localTime(block.startDateTime)}</Text>
        <Text style={styles.timeSub}>{localTime(block.endDateTime)}</Text>
      </View>
      <View style={styles.planBody}>
        <Text style={styles.primary} numberOfLines={1}>
          {block.title}
        </Text>
        <Text style={styles.muted}>{categoryName}</Text>
      </View>
      <Pressable onPress={onStart} disabled={disabled} style={[styles.startSmall, disabled && styles.disabledButton]}>
        <Text style={styles.startSmallText}>시작</Text>
      </Pressable>
    </View>
  );
}

function ManualStartSheet({
  visible,
  title,
  categoryId,
  categories,
  onTitleChange,
  onCategoryChange,
  onClose,
  onStart,
  disabled,
}: {
  visible: boolean;
  title: string;
  categoryId: string;
  categories: ReturnType<typeof sortCategoriesByPriority>;
  onTitleChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onClose: () => void;
  onStart: () => void;
  disabled?: boolean;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.sheetBackdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>직접 활동 시작</Text>
          <Field label="활동 이름" value={title} onChangeText={onTitleChange} placeholder="갑자기 생긴 일" />
          <CategoryChips categories={categories} selectedId={categoryId} onSelect={onCategoryChange} />
          <Button title="시작하기" onPress={onStart} disabled={disabled} />
          <Button title="닫기" onPress={onClose} variant="secondary" />
        </View>
      </View>
    </Modal>
  );
}

function EditLogSheet({
  log,
  title,
  categoryId,
  startTime,
  endTime,
  categories,
  onTitleChange,
  onCategoryChange,
  onStartTimeChange,
  onEndTimeChange,
  onClose,
  onSave,
  onDelete,
}: {
  log: ActivityLog | null;
  title: string;
  categoryId: string;
  startTime: string;
  endTime: string;
  categories: ReturnType<typeof sortCategoriesByPriority>;
  onTitleChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onStartTimeChange: (value: string) => void;
  onEndTimeChange: (value: string) => void;
  onClose: () => void;
  onSave: () => void;
  onDelete: () => void;
}) {
  return (
    <Modal visible={!!log} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.sheetBackdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>기록 수정</Text>
          <Field label="제목" value={title} onChangeText={onTitleChange} />
          <View style={styles.editTimeStack}>
            <TimeField label="시작" value={startTime} onChange={onStartTimeChange} />
            <TimeField label="종료" value={endTime} onChange={onEndTimeChange} allowEmpty emptyLabel="진행 중" defaultValue={startTime} />
          </View>
          <CategoryChips categories={categories} selectedId={categoryId} onSelect={onCategoryChange} />
          <Button title="기록 저장" onPress={onSave} disabled={!title.trim()} />
          <Button title="기록 삭제" onPress={onDelete} variant="danger" />
          <Button title="닫기" onPress={onClose} variant="secondary" />
        </View>
      </View>
    </Modal>
  );
}

function CategoryChips({
  categories,
  selectedId,
  onSelect,
}: {
  categories: ReturnType<typeof sortCategoriesByPriority>;
  selectedId: string;
  onSelect: (value: string) => void;
}) {
  return (
    <View style={styles.chips}>
      {categories.map((category) => (
        <Pressable key={category.id} onPress={() => onSelect(category.id)} style={[styles.chip, selectedId === category.id && styles.chipActive]}>
          <Text style={[styles.chipText, selectedId === category.id && styles.chipTextActive]}>{categoryLabel(category)}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  title: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "800",
  },
  eyebrow: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  currentTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "900",
  },
  currentMeta: {
    color: colors.muted,
    fontSize: 14,
  },
  elapsed: {
    color: colors.text,
    fontSize: 34,
    fontWeight: "900",
  },
  heroButton: {
    minHeight: 52,
  },
  primary: {
    color: colors.text,
    fontWeight: "800",
  },
  muted: {
    color: colors.muted,
  },
  disabledText: {
    opacity: 0.45,
  },
  disabledButton: {
    opacity: 0.45,
  },
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  linkText: {
    color: colors.primary,
    fontWeight: "900",
  },
  planItem: {
    alignItems: "center",
    borderTopColor: colors.line,
    borderTopWidth: 1,
    flexDirection: "row",
    gap: 10,
    minHeight: 58,
    paddingTop: 10,
  },
  planTime: {
    width: 52,
  },
  timeText: {
    color: colors.text,
    fontWeight: "900",
  },
  timeSub: {
    color: colors.muted,
    fontSize: 12,
  },
  planBody: {
    flex: 1,
    gap: 2,
  },
  startSmall: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 8,
    justifyContent: "center",
    minHeight: 36,
    paddingHorizontal: 12,
  },
  startSmallText: {
    color: "#fff",
    fontWeight: "900",
  },
  logItem: {
    alignItems: "center",
    borderTopColor: colors.line,
    borderTopWidth: 1,
    flexDirection: "row",
    gap: 10,
    minHeight: 56,
    paddingTop: 10,
  },
  logMain: {
    flex: 1,
    gap: 2,
  },
  logDuration: {
    color: colors.text,
    fontWeight: "900",
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
  editTimeStack: {
    gap: 10,
  },
  sheetBackdrop: {
    backgroundColor: "rgba(15,23,42,0.42)",
    flex: 1,
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    gap: 12,
    maxHeight: "88%",
    padding: 16,
  },
});
