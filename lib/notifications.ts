import Constants, { ExecutionEnvironment } from "expo-constants";
import dayjs from "dayjs";
import { Platform } from "react-native";
import { ActivityLog, PlannedBlock } from "./types";

type NotificationsModule = typeof import("expo-notifications");

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
let notificationsModule: NotificationsModule | null | undefined;

const getNotifications = async () => {
  if (isExpoGo) return null;
  if (notificationsModule !== undefined) return notificationsModule;
  try {
    notificationsModule = await import("expo-notifications");
    notificationsModule.setNotificationHandler({
      handleNotification: async (notification) => {
        const isActiveActivity = notification.request.content.data?.kind === "active-activity";
        return {
          shouldShowBanner: !isActiveActivity,
          shouldShowList: true,
          shouldPlaySound: !isActiveActivity,
          shouldSetBadge: false,
        };
      },
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
    importance: Notifications.AndroidImportance.HIGH,
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
    content: { title, body, sound: true },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date },
  });
};

export const cancelAllLocalNotifications = async () => {
  const Notifications = await getNotifications();
  if (!Notifications) return;
  await Notifications.cancelAllScheduledNotificationsAsync();
};

const activeActivityNotificationId = "active-activity-notification";

export const showActiveActivityNotification = async (log: ActivityLog) => {
  const granted = await requestNotificationPermission();
  if (!granted) return null;
  const Notifications = await getNotifications();
  if (!Notifications || Platform.OS !== "android") return null;
  await Notifications.dismissNotificationAsync(activeActivityNotificationId).catch(() => undefined);
  return Notifications.scheduleNotificationAsync({
    identifier: activeActivityNotificationId,
    content: {
      title: "활동 기록 중",
      body: `${log.title} · ${dayjs(log.startDateTime).format("HH:mm")} 시작`,
      sound: false,
      sticky: true,
      autoDismiss: false,
      priority: Notifications.AndroidNotificationPriority.DEFAULT,
      color: "#2563eb",
      data: {
        kind: "active-activity",
        activityLogId: log.id,
      },
    },
    trigger: null,
  });
};

export const dismissActiveActivityNotification = async () => {
  const Notifications = await getNotifications();
  if (!Notifications || Platform.OS !== "android") return;
  await Notifications.dismissNotificationAsync(activeActivityNotificationId).catch(() => undefined);
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

export const schedulePlanNotifications = async (blocks: PlannedBlock[], reminderLeadMinutes: number) => {
  const granted = await requestNotificationPermission();
  if (!granted) return [];
  const leadMinutes = Math.max(0, Math.min(30, Math.round(reminderLeadMinutes)));
  const scheduled: {
    blockId: string;
    reminderNotificationId: string | null;
    startNotificationId: string | null;
    endNotificationId: string | null;
  }[] = [];
  for (const block of blocks.filter((item) => item.notificationEnabled)) {
    const date = dayjs(block.startDateTime).subtract(leadMinutes, "minute").toISOString();
    const body = leadMinutes === 0 ? `${block.title} 일정이 지금 시작됩니다.` : `${block.title} 시작 ${leadMinutes}분 전입니다.`;
    const reminderId = await schedule("계획 알림", body, date);
    scheduled.push({
      blockId: block.id,
      reminderNotificationId: reminderId,
      startNotificationId: null,
      endNotificationId: null,
    });
  }
  return scheduled;
};
