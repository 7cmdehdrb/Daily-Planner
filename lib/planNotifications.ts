import { cancelBlockNotifications, requestNotificationPermission, schedulePlanNotifications } from "./notifications";
import { clearPlannedBlockNotificationIds, getDailyPlan, getSetting, listPlannedBlocks, updatePlannedBlockNotificationIds } from "./repository";
import { todayKey } from "./time";

const getNotificationsPaused = async () => {
  const paused = (await getSetting("notificationsPaused", "false")) === "true";
  const legacyDisabled = (await getSetting("notificationsEnabled", "true")) === "false";
  return paused || legacyDisabled;
};

const getReminderLeadMinutes = async () => {
  const value = Number(await getSetting("reminderLeadMinutes", "10"));
  if (!Number.isFinite(value)) return 10;
  return Math.max(0, Math.min(30, Math.round(value)));
};

export const reschedulePlanNotifications = async (dailyPlanId: string) => {
  const blocks = await listPlannedBlocks(dailyPlanId);
  await cancelBlockNotifications(blocks);
  await clearPlannedBlockNotificationIds(dailyPlanId);
  if (await getNotificationsPaused()) return;
  const latestBlocks = await listPlannedBlocks(dailyPlanId);
  const scheduled = await schedulePlanNotifications(latestBlocks, await getReminderLeadMinutes());
  for (const item of scheduled) {
    await updatePlannedBlockNotificationIds(item.blockId, item);
  }
};

export const initializePlanNotifications = async () => {
  await requestNotificationPermission();
  if (await getNotificationsPaused()) return;
  const todayPlan = await getDailyPlan(todayKey());
  if (todayPlan?.status === "active") {
    await reschedulePlanNotifications(todayPlan.id);
  }
};
