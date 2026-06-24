import { cancelBlockNotifications, requestNotificationPermission, schedulePlanNotifications } from "./notifications";
import {
  clearPlannedBlockNotificationIds,
  getDailyPlan,
  getSetting,
  listPlannedBlocks,
  listRecordedPlannedBlockIds,
  updatePlannedBlockNotificationIds,
} from "./repository";
import { todayKey } from "./time";
import { PlannedBlock } from "./types";

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
  const recordedBlockIds = await listRecordedPlannedBlockIds(latestBlocks.map((block) => block.id));
  const pendingBlocks = latestBlocks.filter((block) => !recordedBlockIds.has(block.id));
  const scheduled = await schedulePlanNotifications(pendingBlocks, await getReminderLeadMinutes());
  for (const item of scheduled) {
    await updatePlannedBlockNotificationIds(item.blockId, item);
  }
};

export const cancelPlannedBlockNotification = async (block: PlannedBlock) => {
  await cancelBlockNotifications([block]);
  await updatePlannedBlockNotificationIds(block.id, {
    reminderNotificationId: null,
    startNotificationId: null,
    endNotificationId: null,
  });
};

export const initializePlanNotifications = async () => {
  await requestNotificationPermission();
  if (await getNotificationsPaused()) return;
  const todayPlan = await getDailyPlan(todayKey());
  if (todayPlan?.status === "active") {
    await reschedulePlanNotifications(todayPlan.id);
  }
};
