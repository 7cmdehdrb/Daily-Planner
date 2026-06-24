import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import Constants from "expo-constants";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Field } from "@/components/Field";
import { Screen } from "@/components/Screen";
import { TimeField } from "@/components/TimeField";
import { colors } from "@/constants/theme";
import { exportUserData, pickAndImportUserData } from "@/lib/backup";
import { cancelAllLocalNotifications, getNotificationStatus, requestNotificationPermission } from "@/lib/notifications";
import { initializePlanNotifications } from "@/lib/planNotifications";
import { deleteCategory, getSetting, resetAllData, saveCategory, saveSetting } from "@/lib/repository";
import { deleteOpenAiKey, hasOpenAiKey, saveOpenAiKey } from "@/lib/secureKey";
import { CategoryType } from "@/lib/types";
import { categoryInputSchema, timeTextSchema, validationMessage } from "@/lib/validation";
import { useAppStore } from "@/store/appStore";
import { categoryLabel, categoryTypeLabels } from "@/lib/labels";

const categoryTypeOptions: CategoryType[] = [
  "job",
  "study",
  "exercise",
  "hobby",
  "rest",
  "sleep",
  "meal",
  "transit",
  "chores",
  "other",
];

const reminderLeadOptions = [0, 5, 10, 15, 20, 30];
const appVersion = Constants.expoConfig?.version ?? "1.0.6";

export default function SettingsScreen() {
  const { date, categories, refresh } = useAppStore();
  const [apiKey, setApiKey] = useState("");
  const [keySaved, setKeySaved] = useState(false);
  const [categoryName, setCategoryName] = useState("");
  const [categoryType, setCategoryType] = useState<CategoryType>("other");
  const [selfInvestment, setSelfInvestment] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState("");
  const [editingCategoryType, setEditingCategoryType] = useState<CategoryType>("other");
  const [editingSelfInvestment, setEditingSelfInvestment] = useState(false);
  const [notificationStatus, setNotificationStatus] = useState("알 수 없음");
  const [notificationsPaused, setNotificationsPaused] = useState(false);
  const [reminderLeadMinutes, setReminderLeadMinutes] = useState(10);
  const [reminderLeadText, setReminderLeadText] = useState("10");
  const [dayStartTime, setDayStartTime] = useState("05:00");
  const [resetPhrase, setResetPhrase] = useState("");
  const [resetApiKey, setResetApiKey] = useState(false);

  const loadKeyState = useCallback(async () => {
    setKeySaved(await hasOpenAiKey());
    const status = await getNotificationStatus();
    setNotificationStatus(
      status.status === "expo-go-unsupported"
        ? "Expo Go에서는 알림 예약을 지원하지 않습니다. 알림은 개발 빌드에서 확인해 주세요."
        : `${status.granted ? "권한 허용" : "권한 없음"} / 예약 ${status.scheduledCount}개`,
    );
    const paused = (await getSetting("notificationsPaused", "false")) === "true";
    const legacyDisabled = (await getSetting("notificationsEnabled", "true")) === "false";
    setNotificationsPaused(paused || legacyDisabled);
    const lead = Number(await getSetting("reminderLeadMinutes", "10"));
    const normalizedLead = Number.isFinite(lead) ? Math.max(0, Math.min(30, Math.round(lead))) : 10;
    setReminderLeadMinutes(normalizedLead);
    setReminderLeadText(String(normalizedLead));
    setDayStartTime(await getSetting("dayStartTime", "05:00"));
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadKeyState();
    }, [loadKeyState]),
  );

  const saveKey = async () => {
    await saveOpenAiKey(apiKey);
    setApiKey("");
    await loadKeyState();
  };

  const removeKey = async () => {
    await deleteOpenAiKey();
    await loadKeyState();
  };

  const addCategory = async () => {
    try {
      const parsed = categoryInputSchema.parse({
        name: categoryName,
        type: categoryType,
        isSelfInvestment: selfInvestment,
      });
      await saveCategory({
        id: `cat-${Date.now()}`,
        name: parsed.name,
        type: parsed.type as CategoryType,
        isSelfInvestment: parsed.isSelfInvestment,
      });
      setCategoryName("");
      setCategoryType("other");
      setSelfInvestment(false);
      await refresh(date);
    } catch (error) {
      Alert.alert("카테고리를 저장할 수 없음", validationMessage(error));
    }
  };

  const beginCategoryEdit = (categoryId: string) => {
    const category = categories.find((item) => item.id === categoryId);
    if (!category) return;
    setEditingCategoryId(category.id);
    setEditingCategoryName(category.name);
    setEditingCategoryType(category.type);
    setEditingSelfInvestment(category.isSelfInvestment);
  };

  const saveCategoryEdit = async () => {
    const category = categories.find((item) => item.id === editingCategoryId);
    if (!category) return;
    try {
      const parsed = categoryInputSchema.parse({
        name: editingCategoryName,
        type: editingCategoryType,
        isSelfInvestment: editingSelfInvestment,
      });
      await saveCategory({
        ...category,
        name: parsed.name,
        type: parsed.type as CategoryType,
        isSelfInvestment: parsed.isSelfInvestment,
      });
      setEditingCategoryId(null);
      setEditingCategoryName("");
      setEditingCategoryType("other");
      await refresh(date);
    } catch (error) {
      Alert.alert("카테고리를 저장할 수 없음", validationMessage(error));
    }
  };

  const removeCategory = async (categoryId: string) => {
    try {
      await deleteCategory(categoryId);
      await refresh(date);
    } catch (error) {
      Alert.alert("카테고리를 삭제할 수 없음", error instanceof Error ? error.message : "이 카테고리가 아직 사용 중일 수 있습니다.");
    }
  };

  const reset = async () => {
    await cancelAllLocalNotifications();
    await resetAllData();
    if (resetApiKey) {
      await deleteOpenAiKey();
    }
    setResetPhrase("");
    setResetApiKey(false);
    await loadKeyState();
    await refresh(date);
    Alert.alert("데이터 초기화 완료", resetApiKey ? "로컬 데이터와 API 키를 삭제했습니다." : "계획, 기록, 분석, 템플릿, 피드백을 삭제했습니다.");
  };

  const saveDayStartTime = async () => {
    try {
      const parsed = timeTextSchema.parse(dayStartTime);
      await saveSetting("dayStartTime", parsed);
      Alert.alert("저장 완료", "하루 시작 시간을 변경했습니다.");
    } catch (error) {
      Alert.alert("하루 시작 시간을 저장할 수 없음", validationMessage(error));
    }
  };

  const saveNotificationPause = async (paused: boolean) => {
    setNotificationsPaused(paused);
    await saveSetting("notificationsPaused", paused ? "true" : "false");
    await saveSetting("notificationsEnabled", paused ? "false" : "true");
    if (paused) {
      await cancelAllLocalNotifications();
    } else {
      await initializePlanNotifications();
    }
    await loadKeyState();
  };

  const saveReminderLeadMinutes = async (minutes: number) => {
    const next = Math.max(0, Math.min(30, Math.round(minutes)));
    setReminderLeadMinutes(next);
    setReminderLeadText(String(next));
    await saveSetting("reminderLeadMinutes", String(next));
    if (!notificationsPaused) {
      await initializePlanNotifications();
    }
    await loadKeyState();
  };

  const commitReminderLeadText = async () => {
    if (!reminderLeadText.trim()) {
      setReminderLeadText(String(reminderLeadMinutes));
      return;
    }
    const next = Number(reminderLeadText);
    if (!Number.isFinite(next)) {
      setReminderLeadText(String(reminderLeadMinutes));
      return;
    }
    await saveReminderLeadMinutes(next);
  };

  const exportData = async () => {
    try {
      const uri = await exportUserData();
      Alert.alert("내보내기 완료", `백업 파일을 만들었습니다.\n${uri}`);
    } catch (error) {
      Alert.alert("내보내기 실패", error instanceof Error ? error.message : "백업 파일을 만들 수 없습니다.");
    }
  };

  const importData = async () => {
    Alert.alert(
      "데이터 불러오기",
      "현재 로컬 계획, 기록, 분석, 템플릿, 피드백은 백업 파일의 내용으로 교체됩니다. OpenAI API 키는 변경하지 않습니다. 계속할까요?",
      [
        { text: "취소", style: "cancel" },
        {
          text: "불러오기",
          style: "destructive",
          onPress: async () => {
            try {
              const payload = await pickAndImportUserData();
              if (!payload) return;
              await loadKeyState();
              await refresh(date);
              Alert.alert("불러오기 완료", `백업 데이터를 복원했습니다.\n버전: ${payload.schemaVersion}`);
            } catch (error) {
              Alert.alert("불러오기 실패", error instanceof Error ? error.message : "백업 파일을 읽을 수 없습니다.");
            }
          },
        },
      ],
    );
  };

  return (
    <Screen title="설정" subtitle="알림, 카테고리, API 키, 로컬 데이터를 관리합니다.">
      <Card>
        <Text style={styles.title}>알림</Text>
        <Text style={styles.muted}>{notificationStatus}</Text>
        <Pressable onPress={() => saveNotificationPause(!notificationsPaused)} style={styles.toggle}>
          <View style={[styles.checkbox, notificationsPaused && styles.checkboxActive]} />
          <Text style={styles.primary}>알림 일시중지</Text>
        </Pressable>
        <Text style={styles.muted}>켜져 있으면 새 알림을 보내지 않습니다. 꺼져 있으면 알림이 켜진 일정 블록만 예약합니다.</Text>
        <Text style={styles.muted}>알림 시점</Text>
        <View style={styles.chips}>
          {reminderLeadOptions.map((minutes) => (
            <Pressable
              key={minutes}
              onPress={() => saveReminderLeadMinutes(minutes)}
              style={[styles.chip, reminderLeadMinutes === minutes && styles.chipActive]}
            >
              <Text style={[styles.chipText, reminderLeadMinutes === minutes && styles.chipTextActive]}>
                {minutes === 0 ? "시작 시각" : `${minutes}분 전`}
              </Text>
            </Pressable>
          ))}
        </View>
        <Field
          label="직접 입력"
          value={reminderLeadText}
          onChangeText={(text) => setReminderLeadText(text.replace(/[^\d]/g, "").slice(0, 2))}
          onEndEditing={commitReminderLeadText}
          onSubmitEditing={commitReminderLeadText}
          keyboardType="number-pad"
          placeholder="0-30"
        />
        <Text style={styles.muted}>0-30분 사이로 저장되며, 각 일정마다 시작 전 1회만 울립니다.</Text>
        <Button
          title="알림 권한 요청"
          onPress={async () => {
            await requestNotificationPermission();
            if (!notificationsPaused) {
              await initializePlanNotifications();
            }
            await loadKeyState();
          }}
        />
      </Card>

      <Card>
        <Text style={styles.title}>OpenAI API 키</Text>
        <Text style={styles.muted}>{keySaved ? "API 키가 SecureStore에 저장되어 있습니다." : "저장된 API 키가 없습니다."}</Text>
        <Field label="API 키" value={apiKey} onChangeText={setApiKey} secureTextEntry placeholder="sk-..." />
        <Button title="API 키 저장" onPress={saveKey} disabled={!apiKey.trim()} />
        <Button title="API 키 삭제" onPress={removeKey} variant="secondary" disabled={!keySaved} />
      </Card>

      <Card>
        <Text style={styles.title}>카테고리</Text>
        <Field label="이름" value={categoryName} onChangeText={setCategoryName} placeholder="개인 업무" />
        <Text style={styles.muted}>유형</Text>
        <View style={styles.chips}>
          {categoryTypeOptions.map((type) => (
            <Pressable
              key={type}
              onPress={() => setCategoryType(type)}
              style={[styles.chip, categoryType === type && styles.chipActive]}
            >
              <Text style={[styles.chipText, categoryType === type && styles.chipTextActive]}>{categoryTypeLabels[type]}</Text>
            </Pressable>
          ))}
        </View>
        <Pressable onPress={() => setSelfInvestment((value) => !value)} style={styles.toggle}>
          <View style={[styles.checkbox, selfInvestment && styles.checkboxActive]} />
          <Text style={styles.primary}>자기계발로 계산</Text>
        </Pressable>
        <Button title="카테고리 추가" onPress={addCategory} disabled={!categoryName.trim()} />
        {categories.map((category) => (
          <View key={category.id} style={styles.categoryLine}>
            {editingCategoryId === category.id ? (
              <>
                <Field label="이름 수정" value={editingCategoryName} onChangeText={setEditingCategoryName} />
                <Text style={styles.muted}>유형</Text>
                <View style={styles.chips}>
                  {categoryTypeOptions.map((type) => (
                    <Pressable
                      key={type}
                      onPress={() => setEditingCategoryType(type)}
                      style={[styles.chip, editingCategoryType === type && styles.chipActive]}
                    >
                      <Text style={[styles.chipText, editingCategoryType === type && styles.chipTextActive]}>{categoryTypeLabels[type]}</Text>
                    </Pressable>
                  ))}
                </View>
                <Pressable onPress={() => setEditingSelfInvestment((value) => !value)} style={styles.toggle}>
                  <View style={[styles.checkbox, editingSelfInvestment && styles.checkboxActive]} />
                  <Text style={styles.primary}>자기계발로 계산</Text>
                </Pressable>
                <Button title="카테고리 저장" onPress={saveCategoryEdit} disabled={!editingCategoryName.trim()} />
                <Button title="취소" onPress={() => setEditingCategoryId(null)} variant="secondary" />
              </>
            ) : (
              <>
                <Text style={styles.muted}>
                  {categoryLabel(category)} / {categoryTypeLabels[category.type]} {category.isSelfInvestment ? "(자기계발)" : ""}
                </Text>
                <Button title="수정" onPress={() => beginCategoryEdit(category.id)} variant="secondary" />
                <Button title="삭제" onPress={() => removeCategory(category.id)} variant="secondary" />
              </>
            )}
          </View>
        ))}
      </Card>

      <Card>
        <Text style={styles.title}>하루 기준</Text>
        <TimeField label="하루 시작 시간" value={dayStartTime} onChange={setDayStartTime} defaultValue="05:00" />
        <Button title="하루 시작 시간 저장" onPress={saveDayStartTime} />
      </Card>

      <Card>
        <Text style={styles.title}>데이터</Text>
        <Text style={styles.muted}>계획, 기록, 분석, 직접 만든 템플릿, AI 피드백, 앱 설정을 백업합니다. 기본 제공 카테고리와 기본 템플릿은 앱이 다시 생성합니다.</Text>
        <Button title="데이터 내보내기" onPress={exportData} />
        <Button title="데이터 불러오기" onPress={importData} variant="secondary" />
        <Text style={styles.muted}>로컬 계획, 기록, 분석, 템플릿, 피드백, 카테고리를 모두 지우려면 RESET을 입력하세요.</Text>
        <Field label="초기화 확인" value={resetPhrase} onChangeText={setResetPhrase} placeholder="RESET" autoCapitalize="characters" />
        <Pressable onPress={() => setResetApiKey((value) => !value)} style={styles.toggle}>
          <View style={[styles.checkbox, resetApiKey && styles.checkboxActive]} />
          <Text style={styles.primary}>OpenAI API 키도 함께 삭제</Text>
        </Pressable>
        <Button title="로컬 데이터 초기화" onPress={reset} variant="danger" disabled={resetPhrase !== "RESET"} />
      </Card>
      <View style={styles.footer}>
        <Text style={styles.footerText}>Developed by 소유아이</Text>
        <Text style={styles.footerText}>Version {appVersion}</Text>
      </View>
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
  categoryLine: {
    borderTopColor: colors.line,
    borderTopWidth: 1,
    gap: 8,
    paddingTop: 10,
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
  footer: {
    alignItems: "center",
    gap: 4,
    paddingBottom: 12,
    paddingTop: 4,
  },
  footerText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700",
  },
});
