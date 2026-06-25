import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { DateNavigator } from "@/components/DateNavigator";
import { Field } from "@/components/Field";
import { Screen } from "@/components/Screen";
import { TimeField } from "@/components/TimeField";
import { EditableTimeBlock, TimeTableEditor } from "@/components/TimeTableEditor";
import { colors } from "@/constants/theme";
import { categoryLabel, planStatusLabel } from "@/lib/labels";
import { cancelBlockNotifications } from "@/lib/notifications";
import { reschedulePlanNotifications } from "@/lib/planNotifications";
import {
  activatePlan,
  applyTemplateToPlan,
  createTemplateFromPlan,
  deletePlannedBlock,
  getOrCreateDailyPlan,
  getSetting,
  listTemplates,
  replaceTemplateFromPlan,
  upsertPlannedBlock,
} from "@/lib/repository";
import {
  combineDateAndRange,
  formatDuration,
  localTime,
  minutesBetween,
  minutesFromDayStart,
  timeFromDayStartMinutes,
  timeTextToMinutes,
} from "@/lib/time";
import { planBlockInputSchema, validationMessage } from "@/lib/validation";
import { Category, Template } from "@/lib/types";
import { useAppStore } from "@/store/appStore";

type EditDraft = {
  id: string | null;
  title: string;
  startTime: string;
  endTime: string;
  memo: string;
  categoryId: string;
  notificationEnabled: boolean;
};

const emptyDraft = (categoryId = "job"): EditDraft => ({
  id: null,
  title: "",
  startTime: "09:00",
  endTime: "10:00",
  memo: "",
  categoryId,
  notificationEnabled: false,
});

const blockEndMinute = (startMinute: number, endMinute: number) => (endMinute <= startMinute ? endMinute + 24 * 60 : endMinute);

const useAndroidKeyboardInset = () => {
  const [keyboardInset, setKeyboardInset] = useState(0);

  useEffect(() => {
    if (Platform.OS !== "android") return;
    const show = Keyboard.addListener("keyboardDidShow", (event) => {
      setKeyboardInset(event.endCoordinates.height);
    });
    const hide = Keyboard.addListener("keyboardDidHide", () => {
      setKeyboardInset(0);
    });
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return keyboardInset;
};

export default function PlanScreen() {
  const { date, plan, blocks, categories, refresh } = useAppStore();
  const [dayStartTime, setDayStartTime] = useState("05:00");
  const [templates, setTemplates] = useState<Template[]>([]);
  const [editDraft, setEditDraft] = useState<EditDraft | null>(null);
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);
  const [saveTemplateOpen, setSaveTemplateOpen] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const scrollViewRef = useRef<ScrollView | null>(null);
  const isClosed = plan?.status === "closed";
  const totalPlannedMinutes = blocks.reduce((total, block) => total + minutesBetween(block.startDateTime, block.endDateTime), 0);

  const load = useCallback(async () => {
    setDayStartTime(await getSetting("dayStartTime", "05:00"));
    setTemplates(await listTemplates());
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const editableBlocks: EditableTimeBlock[] = blocks.map((block) => {
    const startMinute = minutesFromDayStart(localTime(block.startDateTime), dayStartTime);
    const rawEndMinute = minutesFromDayStart(localTime(block.endDateTime), dayStartTime);
    const category = categories.find((item) => item.id === block.categoryId);
    return {
      id: block.id,
      title: block.title,
      categoryId: block.categoryId,
      categoryName: category ? categoryLabel(category) : "기타",
      startMinute,
      endMinute: Math.min(24 * 60, blockEndMinute(startMinute, rawEndMinute)),
      memo: block.memo,
    };
  });

  const openDraft = (blockId: string) => {
    const block = blocks.find((item) => item.id === blockId);
    if (!block) return;
    setEditDraft({
      id: block.id,
      title: block.title,
      startTime: localTime(block.startDateTime),
      endTime: localTime(block.endDateTime),
      memo: block.memo ?? "",
      categoryId: block.categoryId,
      notificationEnabled: block.notificationEnabled,
    });
  };

  const createAt = (minute: number) => {
    if (isClosed) {
      Alert.alert("마감된 계획", "수정하려면 리뷰에서 계획을 다시 열어 주세요.");
      return;
    }
    setEditDraft({
      ...emptyDraft(categories[0]?.id ?? "job"),
      startTime: timeFromDayStartMinutes(minute, dayStartTime),
      endTime: timeFromDayStartMinutes(Math.min(minute + 60, 24 * 60), dayStartTime),
    });
  };

  const saveDraft = async () => {
    if (!editDraft) return;
    try {
      if (isClosed) {
        Alert.alert("마감된 계획", "수정하려면 리뷰에서 계획을 다시 열어 주세요.");
        return;
      }
      const parsed = planBlockInputSchema.parse({ ...editDraft, dayStartTime });
      const activePlan = plan ?? (await getOrCreateDailyPlan(date));
      const range = combineDateAndRange(date, parsed.startTime, parsed.endTime, dayStartTime);
      await upsertPlannedBlock({
        id: editDraft.id ?? undefined,
        dailyPlanId: activePlan.id,
        startDateTime: range.startDateTime,
        endDateTime: range.endDateTime,
        title: parsed.title,
        categoryId: parsed.categoryId,
        memo: parsed.memo?.trim() || null,
        notificationEnabled: editDraft.notificationEnabled,
      });
      if (activePlan.status === "active") await reschedulePlanNotifications(activePlan.id);
      setEditDraft(null);
      await refresh(date);
    } catch (error) {
      Alert.alert("저장할 수 없음", validationMessage(error));
    }
  };

  const moveBlock = async (blockId: string, startMinute: number, endMinute: number) => {
    if (isClosed) {
      Alert.alert("마감된 계획", "수정하려면 리뷰에서 계획을 다시 열어 주세요.");
      return;
    }
    const block = blocks.find((item) => item.id === blockId);
    if (!block || !plan) return;
    try {
      const range = combineDateAndRange(
        date,
        timeFromDayStartMinutes(startMinute, dayStartTime),
        timeFromDayStartMinutes(endMinute, dayStartTime),
        dayStartTime,
      );
      await upsertPlannedBlock({ ...block, startDateTime: range.startDateTime, endDateTime: range.endDateTime });
      if (plan.status === "active") await reschedulePlanNotifications(plan.id);
      await refresh(date);
    } catch (error) {
      Alert.alert("시간을 변경할 수 없음", validationMessage(error));
      await refresh(date);
    }
  };

  const removeBlock = async (blockId: string) => {
    if (isClosed) {
      Alert.alert("마감된 계획", "수정하려면 리뷰에서 계획을 다시 열어 주세요.");
      return;
    }
    const block = blocks.find((item) => item.id === blockId);
    if (block) await cancelBlockNotifications([block]);
    await deletePlannedBlock(blockId);
    if (plan?.status === "active") await reschedulePlanNotifications(plan.id);
    await refresh(date);
  };

  const applyTemplate = async (templateId: string) => {
    if (isClosed) {
      Alert.alert("마감된 계획", "템플릿을 불러오려면 리뷰에서 계획을 다시 열어 주세요.");
      return;
    }
    await cancelBlockNotifications(blocks);
    await applyTemplateToPlan(templateId, date);
    setTemplatePickerOpen(false);
    await refresh(date);
  };

  const applyPlan = async () => {
    if (isClosed) {
      Alert.alert("마감된 계획", "적용하려면 리뷰에서 계획을 다시 열어 주세요.");
      return;
    }
    const nextPlan = await activatePlan(date);
    await reschedulePlanNotifications(nextPlan.id);
    await refresh(nextPlan.date);
    Alert.alert("계획 적용 완료", "오늘 계획을 적용했습니다.");
  };

  const saveAsNewTemplate = async () => {
    const activePlan = plan ?? (await getOrCreateDailyPlan(date));
    if (!blocks.length) {
      Alert.alert("저장할 블록 없음", "템플릿으로 저장할 계획 블록이 없습니다.");
      return;
    }
    await createTemplateFromPlan(activePlan.id, templateName.trim() || `${date} 계획`);
    setTemplateName("");
    setSaveTemplateOpen(false);
    await load();
    Alert.alert("템플릿 저장 완료", "현재 계획을 새 템플릿으로 저장했습니다.");
  };

  const overwriteTemplate = async (templateId: string) => {
    const activePlan = plan ?? (await getOrCreateDailyPlan(date));
    if (!blocks.length) {
      Alert.alert("저장할 블록 없음", "템플릿에 저장할 계획 블록이 없습니다.");
      return;
    }
    await replaceTemplateFromPlan(templateId, activePlan.id);
    setSaveTemplateOpen(false);
    await load();
    Alert.alert("템플릿 덮어쓰기 완료", "현재 계획으로 템플릿을 갱신했습니다.");
  };

  const openTemplateManager = () => {
    setTemplatePickerOpen(false);
    setSaveTemplateOpen(false);
    router.push("/templates");
  };

  const setTimelineScrollEnabled = (enabled: boolean) => {
    scrollViewRef.current?.setNativeProps({ scrollEnabled: enabled });
    setScrollEnabled(enabled);
  };

  return (
    <Screen title="하루 계획" subtitle="템플릿을 불러오고 시간표를 직접 조정합니다." scrollEnabled={scrollEnabled} scrollViewRef={scrollViewRef}>
      <DateNavigator />
      <Card>
        <Text style={styles.sectionTitle}>오늘 계획</Text>
        <Text style={styles.muted}>상태: {planStatusLabel(plan?.status)}</Text>
        <Text style={styles.muted}>계획 시간: {formatDuration(totalPlannedMinutes)}</Text>
        <Text style={styles.muted}>기준 시간: {dayStartTime}부터 24시간</Text>
      </Card>
      <View style={styles.actionRow}>
        <Button title="템플릿 불러오기" onPress={() => setTemplatePickerOpen(true)} variant="secondary" disabled={isClosed} style={styles.actionButton} />
        <Button title="템플릿으로 저장" onPress={() => setSaveTemplateOpen(true)} variant="secondary" disabled={!blocks.length} style={styles.actionButton} />
      </View>
      <Button title="오늘 계획으로 적용" onPress={applyPlan} disabled={!blocks.length || isClosed} />
      {isClosed ? <Text style={styles.muted}>마감된 계획입니다. 수정하려면 리뷰에서 다시 열어 주세요.</Text> : null}

      <TimeTableEditor
        blocks={editableBlocks}
        dayStartMinute={timeTextToMinutes(dayStartTime)}
        onCreateAt={createAt}
        onBlockPress={() => undefined}
        onBlockLongPress={openDraft}
        onBlockChange={moveBlock}
        onBlockDelete={removeBlock}
        onGestureStart={() => setTimelineScrollEnabled(false)}
        onGestureEnd={() => setTimelineScrollEnabled(true)}
      />

      <BlockEditModal draft={editDraft} categories={categories} onChange={setEditDraft} onClose={() => setEditDraft(null)} onSave={saveDraft} />
      <TemplatePickerModal visible={templatePickerOpen} templates={templates} onClose={() => setTemplatePickerOpen(false)} onManage={openTemplateManager} onSelect={applyTemplate} />
      <SaveTemplateModal
        visible={saveTemplateOpen}
        templates={templates}
        name={templateName}
        onNameChange={setTemplateName}
        onClose={() => setSaveTemplateOpen(false)}
        onManage={openTemplateManager}
        onSaveNew={saveAsNewTemplate}
        onOverwrite={overwriteTemplate}
      />
    </Screen>
  );
}

function BlockEditModal({
  draft,
  categories,
  onChange,
  onClose,
  onSave,
}: {
  draft: EditDraft | null;
  categories: Category[];
  onChange: (draft: EditDraft | null) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  const insets = useSafeAreaInsets();
  const keyboardInset = useAndroidKeyboardInset();
  const { height: windowHeight } = useWindowDimensions();
  const cardMaxHeight = keyboardInset ? windowHeight - keyboardInset - Math.max(insets.top, 12) - 12 : windowHeight * 0.88;
  if (!draft) return null;
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior="padding" enabled={Platform.OS === "ios"} style={styles.modalBackdrop}>
        <View
          style={[
            styles.modalCard,
            {
              marginBottom: Platform.OS === "android" ? keyboardInset : 0,
              maxHeight: cardMaxHeight,
              paddingBottom: Math.max(insets.bottom, 16),
            },
          ]}
        >
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.modalScrollContent}>
          <Text style={styles.sectionTitle}>{draft.id ? "계획 블록 편집" : "새 계획 블록"}</Text>
          <Field label="제목" value={draft.title} onChangeText={(title) => onChange({ ...draft, title })} placeholder="업무 정리" />
          <View style={styles.timeRow}>
            <TimeField label="시작" value={draft.startTime} onChange={(startTime) => onChange({ ...draft, startTime })} />
            <TimeField label="종료" value={draft.endTime} onChange={(endTime) => onChange({ ...draft, endTime })} defaultValue="10:00" />
          </View>
          <Field label="메모" value={draft.memo} onChangeText={(memo) => onChange({ ...draft, memo })} placeholder="필요한 내용을 적어 주세요" />
          <Text style={styles.label}>카테고리</Text>
          <View style={styles.chips}>
            {categories.map((category) => (
              <Pressable key={category.id} onPress={() => onChange({ ...draft, categoryId: category.id })} style={[styles.chip, draft.categoryId === category.id && styles.chipActive]}>
                <Text style={[styles.chipText, draft.categoryId === category.id && styles.chipTextActive]}>{categoryLabel(category)}</Text>
              </Pressable>
            ))}
          </View>
          <Pressable onPress={() => onChange({ ...draft, notificationEnabled: !draft.notificationEnabled })} style={styles.toggle}>
            <View style={[styles.checkbox, draft.notificationEnabled && styles.checkboxActive]} />
            <Text style={styles.primary}>알림 사용</Text>
          </Pressable>
          <Button title="저장" onPress={onSave} disabled={!draft.title.trim()} />
          <Button title="닫기" onPress={onClose} variant="secondary" />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function TemplatePickerModal({
  visible,
  templates,
  onClose,
  onManage,
  onSelect,
}: {
  visible: boolean;
  templates: Template[];
  onClose: () => void;
  onManage: () => void;
  onSelect: (templateId: string) => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={[styles.modalCard, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.sectionTitle}>템플릿 불러오기</Text>
              <Text style={styles.muted}>오늘 계획에 적용할 루틴을 선택하세요.</Text>
            </View>
            <Pressable onPress={onManage} style={styles.manageAction}>
              <Ionicons name="settings-outline" color={colors.primary} size={18} />
              <Text style={styles.manageText}>관리</Text>
            </Pressable>
          </View>
          <View style={styles.templateList}>
            {templates.length ? (
              templates.map((template) => (
                <Pressable key={template.id} onPress={() => onSelect(template.id)} style={styles.templateCard}>
                  <View style={styles.templateIcon}>
                    <Ionicons name="calendar-outline" color={colors.primary} size={20} />
                  </View>
                  <View style={styles.templateBody}>
                    <Text style={styles.templateTitle}>{template.name}</Text>
                    <Text style={styles.templateMeta}>탭하면 오늘 계획 초안으로 불러옵니다.</Text>
                  </View>
                  <Ionicons name="chevron-forward" color={colors.muted} size={18} />
                </Pressable>
              ))
            ) : (
              <Text style={styles.muted}>저장된 템플릿이 없습니다.</Text>
            )}
          </View>
          <Button title="닫기" onPress={onClose} variant="secondary" />
        </View>
      </View>
    </Modal>
  );
}

function SaveTemplateModal({
  visible,
  templates,
  name,
  onNameChange,
  onClose,
  onManage,
  onSaveNew,
  onOverwrite,
}: {
  visible: boolean;
  templates: Template[];
  name: string;
  onNameChange: (value: string) => void;
  onClose: () => void;
  onManage: () => void;
  onSaveNew: () => void;
  onOverwrite: (templateId: string) => void;
}) {
  const insets = useSafeAreaInsets();
  const keyboardInset = useAndroidKeyboardInset();
  const { height: windowHeight } = useWindowDimensions();
  const cardMaxHeight = keyboardInset ? windowHeight - keyboardInset - Math.max(insets.top, 12) - 12 : windowHeight * 0.88;
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior="padding" enabled={Platform.OS === "ios"} style={styles.modalBackdrop}>
        <View
          style={[
            styles.modalCard,
            {
              marginBottom: Platform.OS === "android" ? keyboardInset : 0,
              maxHeight: cardMaxHeight,
              paddingBottom: Math.max(insets.bottom, 16),
            },
          ]}
        >
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.modalScrollContent}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.sectionTitle}>템플릿으로 저장</Text>
              <Text style={styles.muted}>현재 계획을 재사용 가능한 루틴으로 저장합니다.</Text>
            </View>
            <Pressable onPress={onManage} style={styles.manageAction}>
              <Ionicons name="settings-outline" color={colors.primary} size={18} />
              <Text style={styles.manageText}>관리</Text>
            </Pressable>
          </View>
          <Field label="새 템플릿 이름" value={name} onChangeText={onNameChange} placeholder="기본 하루 일정" />
          <Button title="새 템플릿으로 저장" onPress={onSaveNew} />
          <Text style={styles.label}>기존 템플릿에 덮어쓰기</Text>
          <View style={styles.templateList}>
            {templates.length ? (
              templates.map((template) => (
                <Pressable key={template.id} onPress={() => onOverwrite(template.id)} style={styles.overwriteRow}>
                  <Text style={styles.templateTitle}>{template.name}</Text>
                  <Text style={styles.overwriteText}>덮어쓰기</Text>
                </Pressable>
              ))
            ) : (
              <Text style={styles.muted}>덮어쓸 템플릿이 없습니다.</Text>
            )}
          </View>
          <Button title="닫기" onPress={onClose} variant="secondary" />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
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
  actionRow: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    flex: 1,
  },
  modalBackdrop: {
    backgroundColor: "rgba(0,0,0,0.35)",
    flex: 1,
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    gap: 12,
    maxHeight: "88%",
    padding: 16,
  },
  modalScrollContent: {
    gap: 12,
    paddingBottom: 8,
  },
  modalHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  manageAction: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  manageText: {
    color: colors.primary,
    fontWeight: "800",
  },
  templateList: {
    gap: 8,
  },
  templateCard: {
    alignItems: "center",
    borderColor: colors.line,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    padding: 12,
  },
  templateIcon: {
    alignItems: "center",
    backgroundColor: colors.chip,
    borderRadius: 8,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  templateBody: {
    flex: 1,
    gap: 3,
  },
  templateTitle: {
    color: colors.text,
    fontWeight: "800",
  },
  templateMeta: {
    color: colors.muted,
    fontSize: 12,
  },
  overwriteRow: {
    alignItems: "center",
    borderColor: colors.line,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 12,
  },
  overwriteText: {
    color: colors.primary,
    fontWeight: "800",
  },
  timeRow: {
    flexDirection: "row",
    gap: 10,
  },
  label: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700",
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
  toggle: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
  },
  checkbox: {
    borderColor: colors.line,
    borderRadius: 4,
    borderWidth: 2,
    height: 20,
    width: 20,
  },
  checkboxActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
});
