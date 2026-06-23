import { useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Alert, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Field } from "@/components/Field";
import { Screen } from "@/components/Screen";
import { EditableTimeBlock, TimeTableEditor } from "@/components/TimeTableEditor";
import { colors } from "@/constants/theme";
import { categoryLabel } from "@/lib/labels";
import {
  copyTemplate,
  createTemplate,
  deleteTemplate,
  deleteTemplateBlock,
  getSetting,
  listTemplateBlocks,
  listTemplates,
  renameTemplate,
  upsertTemplateBlock,
} from "@/lib/repository";
import { minutesFromDayStart, timeFromDayStartMinutes, timeTextToMinutes } from "@/lib/time";
import { templateBlockInputSchema, validationMessage } from "@/lib/validation";
import { Category, Template, TemplateBlock } from "@/lib/types";
import { useAppStore } from "@/store/appStore";

type TemplateDraft = {
  id: string | null;
  title: string;
  startTime: string;
  endTime: string;
  memo: string;
  categoryId: string;
};

const emptyDraft = (categoryId = "job"): TemplateDraft => ({
  id: null,
  title: "",
  startTime: "09:00",
  endTime: "10:00",
  memo: "",
  categoryId,
});

const blockEndMinute = (startMinute: number, endMinute: number) => (endMinute <= startMinute ? endMinute + 24 * 60 : endMinute);

export default function TemplatesScreen() {
  const { categories } = useAppStore();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [blocks, setBlocks] = useState<TemplateBlock[]>([]);
  const [dayStartTime, setDayStartTime] = useState("05:00");
  const [newName, setNewName] = useState("");
  const [renameText, setRenameText] = useState("");
  const [draft, setDraft] = useState<TemplateDraft | null>(null);
  const [scrollEnabled, setScrollEnabled] = useState(true);

  const selectedTemplate = templates.find((template) => template.id === selectedTemplateId) ?? null;

  const loadTemplates = useCallback(async () => {
    const [nextTemplates, nextDayStart] = await Promise.all([listTemplates(), getSetting("dayStartTime", "05:00")]);
    setTemplates(nextTemplates);
    setDayStartTime(nextDayStart);
    setSelectedTemplateId((current) => current ?? nextTemplates[0]?.id ?? null);
  }, []);

  const loadBlocks = useCallback(async () => {
    if (!selectedTemplateId) {
      setBlocks([]);
      return;
    }
    setBlocks(await listTemplateBlocks(selectedTemplateId));
  }, [selectedTemplateId]);

  useFocusEffect(
    useCallback(() => {
      loadTemplates();
    }, [loadTemplates]),
  );

  useFocusEffect(
    useCallback(() => {
      loadBlocks();
    }, [loadBlocks]),
  );

  const editableBlocks: EditableTimeBlock[] = useMemo(
    () =>
      blocks.map((block) => {
        const startMinute = minutesFromDayStart(block.startTime, dayStartTime);
        const rawEndMinute = minutesFromDayStart(block.endTime, dayStartTime);
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
      }),
    [blocks, categories, dayStartTime],
  );

  const createBlankTemplate = async () => {
    if (!newName.trim()) return;
    const template = await createTemplate(newName.trim());
    setNewName("");
    await loadTemplates();
    setSelectedTemplateId(template.id);
  };

  const renameSelected = async () => {
    if (!selectedTemplate || !renameText.trim()) return;
    await renameTemplate(selectedTemplate.id, renameText.trim(), selectedTemplate.description);
    setRenameText("");
    await loadTemplates();
  };

  const copySelected = async () => {
    if (!selectedTemplate) return;
    const template = await copyTemplate(selectedTemplate.id);
    await loadTemplates();
    setSelectedTemplateId(template.id);
  };

  const deleteSelected = async () => {
    if (!selectedTemplate) return;
    await deleteTemplate(selectedTemplate.id);
    setSelectedTemplateId(null);
    await loadTemplates();
  };

  const openDraft = (blockId: string) => {
    const block = blocks.find((item) => item.id === blockId);
    if (!block) return;
    setDraft({
      id: block.id,
      title: block.title,
      startTime: block.startTime,
      endTime: block.endTime,
      memo: block.memo ?? "",
      categoryId: block.categoryId,
    });
  };

  const createAt = (minute: number) => {
    setDraft({
      ...emptyDraft(categories[0]?.id ?? "job"),
      startTime: timeFromDayStartMinutes(minute, dayStartTime),
      endTime: timeFromDayStartMinutes(Math.min(minute + 60, 24 * 60), dayStartTime),
    });
  };

  const saveDraft = async () => {
    if (!draft || !selectedTemplateId) return;
    try {
      const parsed = templateBlockInputSchema.parse(draft);
      const current = blocks.find((block) => block.id === draft.id);
      await upsertTemplateBlock({
        id: draft.id ?? undefined,
        templateId: selectedTemplateId,
        startTime: parsed.startTime,
        endTime: parsed.endTime,
        title: parsed.title,
        categoryId: parsed.categoryId,
        memo: parsed.memo?.trim() || null,
        orderIndex: current?.orderIndex,
      });
      setDraft(null);
      await loadBlocks();
      await loadTemplates();
    } catch (error) {
      Alert.alert("템플릿 블록을 저장할 수 없음", validationMessage(error));
    }
  };

  const moveBlock = async (blockId: string, startMinute: number, endMinute: number) => {
    const block = blocks.find((item) => item.id === blockId);
    if (!block || !selectedTemplateId) return;
    try {
      await upsertTemplateBlock({
        ...block,
        startTime: timeFromDayStartMinutes(startMinute, dayStartTime),
        endTime: timeFromDayStartMinutes(endMinute, dayStartTime),
      });
      await loadBlocks();
    } catch (error) {
      Alert.alert("시간을 변경할 수 없음", validationMessage(error));
      await loadBlocks();
    }
  };

  const removeBlock = async (blockId: string) => {
    await deleteTemplateBlock(blockId);
    await loadBlocks();
    await loadTemplates();
  };

  return (
    <Screen title="템플릿 관리" subtitle="오늘 계획 화면에서 불러올 하루 시간표를 관리합니다." scrollEnabled={scrollEnabled}>
      <Card>
        <Text style={styles.title}>새 템플릿</Text>
        <Field label="이름" value={newName} onChangeText={setNewName} placeholder="평일 루틴" />
        <Button title="빈 템플릿 만들기" onPress={createBlankTemplate} disabled={!newName.trim()} />
      </Card>

      <Card>
        <Text style={styles.title}>템플릿 목록</Text>
        {templates.length ? (
          <View style={styles.chips}>
            {templates.map((template) => (
              <Pressable
                key={template.id}
                onPress={() => setSelectedTemplateId(template.id)}
                style={[styles.chip, selectedTemplateId === template.id && styles.chipActive]}
              >
                <Text style={[styles.chipText, selectedTemplateId === template.id && styles.chipTextActive]}>{template.name}</Text>
              </Pressable>
            ))}
          </View>
        ) : (
          <Text style={styles.muted}>저장된 템플릿이 없습니다.</Text>
        )}
      </Card>

      {selectedTemplate ? (
        <>
          <Card>
            <Text style={styles.title}>{selectedTemplate.name}</Text>
            <Field label="이름 변경" value={renameText} onChangeText={setRenameText} placeholder={selectedTemplate.name} />
            <Button title="이름 변경" onPress={renameSelected} disabled={!renameText.trim()} variant="secondary" />
            <View style={styles.actionRow}>
              <Button title="복사" onPress={copySelected} variant="secondary" style={styles.actionButton} />
              <Button title="삭제" onPress={deleteSelected} variant="danger" style={styles.actionButton} />
            </View>
          </Card>
          <TimeTableEditor
            blocks={editableBlocks}
            dayStartMinute={timeTextToMinutes(dayStartTime)}
            onCreateAt={createAt}
            onBlockPress={() => undefined}
            onBlockLongPress={openDraft}
            onBlockChange={moveBlock}
            onBlockDelete={removeBlock}
            onGestureStart={() => setScrollEnabled(false)}
            onGestureEnd={() => setScrollEnabled(true)}
          />
          <TemplateBlockModal
            draft={draft}
            categories={categories}
            onChange={setDraft}
            onClose={() => setDraft(null)}
            onSave={saveDraft}
          />
        </>
      ) : null}
    </Screen>
  );
}

function TemplateBlockModal({
  draft,
  categories,
  onChange,
  onClose,
  onSave,
}: {
  draft: TemplateDraft | null;
  categories: Category[];
  onChange: (draft: TemplateDraft | null) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  if (!draft) return null;
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <Text style={styles.title}>{draft.id ? "템플릿 블록 편집" : "새 템플릿 블록"}</Text>
          <Field label="제목" value={draft.title} onChangeText={(title) => onChange({ ...draft, title })} placeholder="TOEFL RC 문제풀이" />
          <View style={styles.timeRow}>
            <Field label="시작" value={draft.startTime} onChangeText={(startTime) => onChange({ ...draft, startTime })} placeholder="09:00" />
            <Field label="종료" value={draft.endTime} onChangeText={(endTime) => onChange({ ...draft, endTime })} placeholder="10:00" />
          </View>
          <Field label="메모" value={draft.memo} onChangeText={(memo) => onChange({ ...draft, memo })} placeholder="선택 입력" />
          <Text style={styles.label}>카테고리</Text>
          <View style={styles.chips}>
            {categories.map((category) => (
              <Pressable
                key={category.id}
                onPress={() => onChange({ ...draft, categoryId: category.id })}
                style={[styles.chip, draft.categoryId === category.id && styles.chipActive]}
              >
                <Text style={[styles.chipText, draft.categoryId === category.id && styles.chipTextActive]}>{categoryLabel(category)}</Text>
              </Pressable>
            ))}
          </View>
          <Button title="저장" onPress={onSave} disabled={!draft.title.trim()} />
          <Button title="닫기" onPress={onClose} variant="secondary" />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  title: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "800",
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
  modalBackdrop: {
    backgroundColor: "rgba(0,0,0,0.35)",
    flex: 1,
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    gap: 10,
    maxHeight: "88%",
    padding: 16,
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
});
