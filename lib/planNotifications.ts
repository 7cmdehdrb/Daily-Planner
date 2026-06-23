import { cancelBlockNotifications, schedulePlanNotifications } from "./notifications";
import { clearPlannedBlockNotificationIds, getSetting, listPlannedBlocks, updatePlannedBlockNotificationIds } from "./repository";

export const reschedulePlanNotifications = async (dailyPlanId: string) => {
  const blocks = await listPlannedBlocks(dailyPlanId);
  await cancelBlockNotifications(blocks);
  await clearPlannedBlockNotificationIds(dailyPlanId);
  const notificationsEnabled = (await getSetting("notificationsEnabled", "true")) === "true";
  if (!notificationsEnabled) return;
  const latestBlocks = await listPlannedBlocks(dailyPlanId);
  const scheduled = await schedulePlanNotifications(latestBlocks);
  for (const item of scheduled) {
    await updatePlannedBlockNotificationIds(item.blockId, item);
  }
};
