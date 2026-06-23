import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Field } from "@/components/Field";
import { Screen } from "@/components/Screen";
import { colors } from "@/constants/theme";
import { cancelAllLocalNotifications, getNotificationStatus, requestNotificationPermission } from "@/lib/notifications";
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
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
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
    setNotificationsEnabled((await getSetting("notificationsEnabled", "true")) === "true");
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

  const saveNotificationSetting = async (enabled: boolean) => {
    setNotificationsEnabled(enabled);
    await saveSetting("notificationsEnabled", enabled ? "true" : "false");
    if (!enabled) {
      await cancelAllLocalNotifications();
    }
    await loadKeyState();
  };

  return (
    <Screen title="설정" subtitle="알림, 카테고리, API 키, 로컬 데이터를 관리합니다.">
      <Card>
        <Text style={styles.title}>알림</Text>
        <Text style={styles.muted}>{notificationStatus}</Text>
        <Pressable onPress={() => saveNotificationSetting(!notificationsEnabled)} style={styles.toggle}>
          <View style={[styles.checkbox, notificationsEnabled && styles.checkboxActive]} />
          <Text style={styles.primary}>계획 알림 사용</Text>
        </Pressable>
        <Button
          title="알림 권한 요청"
          onPress={async () => {
            await requestNotificationPermission();
            await loadKeyState();
          }}
        />
        <Button
          title="예약된 알림 모두 취소"
          onPress={async () => {
            await cancelAllLocalNotifications();
            await loadKeyState();
          }}
          variant="secondary"
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
        <Field label="이름" value={categoryName} onChangeText={setCategoryName} placeholder="독서" />
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
        <Field label="하루 시작 시간" value={dayStartTime} onChangeText={setDayStartTime} placeholder="05:00" />
        <Button title="하루 시작 시간 저장" onPress={saveDayStartTime} />
      </Card>

      <Card>
        <Text style={styles.title}>데이터</Text>
        <Text style={styles.muted}>로컬 계획, 기록, 분석, 템플릿, 피드백, 카테고리를 모두 지우려면 RESET을 입력하세요.</Text>
        <Field label="초기화 확인" value={resetPhrase} onChangeText={setResetPhrase} placeholder="RESET" autoCapitalize="characters" />
        <Pressable onPress={() => setResetApiKey((value) => !value)} style={styles.toggle}>
          <View style={[styles.checkbox, resetApiKey && styles.checkboxActive]} />
          <Text style={styles.primary}>OpenAI API 키도 함께 삭제</Text>
        </Pressable>
        <Button title="로컬 데이터 초기화" onPress={reset} variant="danger" disabled={resetPhrase !== "RESET"} />
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
});
