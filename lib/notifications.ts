import Constants, { ExecutionEnvironment } from "expo-constants";
import dayjs from "dayjs";
import { Platform } from "react-native";
import { PlannedBlock } from "./types";

type NotificationsModule = typeof import("expo-notifications");

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
let notificationsModule: NotificationsModule | null | undefined;

const getNotifications = async () => {
  if (isExpoGo) return null;
  if (notificationsModule !== undefined) return notificationsModule;
  try {
    notificationsModule = await import("expo-notifications");
    notificationsModule.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
  } catch {
    notificationsModule = null;
  }
  return notificationsModule;
};

export const requestNotificationPermission = async () => {
  const Notifications = await getNotifications();
  if (!Notifications) return false;
  await ensureNotificationChannel();
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
};

export const ensureNotificationChannel = async () => {
  const Notifications = await getNotifications();
  if (!Notifications) return;
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync("planned-blocks", {
    name: "계획 알림",
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: "#2563eb",
  });
};

export const getNotificationStatus = async () => {
  const Notifications = await getNotifications();
  if (!Notifications) {
    return {
      granted: false,
      status: isExpoGo ? "expo-go-unsupported" : "unavailable",
      scheduledCount: 0,
    };
  }
  const permissions = await Notifications.getPermissionsAsync();
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  return {
    granted: permissions.granted,
    status: permissions.status,
    scheduledCount: scheduled.length,
  };
};

const schedule = async (title: string, body: string, dateIso: string) => {
  const Notifications = await getNotifications();
  if (!Notifications) return null;
  const date = new Date(dateIso);
  if (date.getTime() <= Date.now()) return null;
  return Notifications.scheduleNotificationAsync({
    content: { title, body },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date },
  });
};

export const cancelAllLocalNotifications = async () => {
  const Notifications = await getNotifications();
  if (!Notifications) return;
  await Notifications.cancelAllScheduledNotificationsAsync();
};

export const cancelBlockNotifications = async (blocks: PlannedBlock[]) => {
  const Notifications = await getNotifications();
  if (!Notifications) return;
  const ids = blocks.flatMap((block) => [
    block.reminderNotificationId,
    block.startNotificationId,
    block.endNotificationId,
  ]);
  for (const notificationId of ids) {
    if (notificationId) {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
    }
  }
};

export const schedulePlanNotifications = async (blocks: PlannedBlock[]) => {
  const granted = await requestNotificationPermission();
  if (!granted) return [];
  const scheduled: {
    blockId: string;
    reminderNotificationId: string | null;
    startNotificationId: string | null;
    endNotificationId: string | null;
  }[] = [];
  for (const block of blocks.filter((item) => item.notificationEnabled)) {
    const before = dayjs(block.startDateTime).subtract(10, "minute").toISOString();
    const reminderId = await schedule("곧 시작할 계획", `${block.title} 시작 10분 전입니다.`, before);
    const startId = await schedule("계획 시작", block.title, block.startDateTime);
    const endId = await schedule("계획 종료", block.title, block.endDateTime);
    scheduled.push({
      blockId: block.id,
      reminderNotificationId: reminderId,
      startNotificationId: startId,
      endNotificationId: endId,
    });
  }
  return scheduled;
};
