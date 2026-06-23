import dayjs from "dayjs";
import { getCategories, getDailyPlan, getSetting, listActivityLogsInRange, listPlannedBlocks, saveAnalysis } from "./repository";
import { nowIso } from "./time";
import { combineDateAndTime } from "./time";
import { computeDailyAnalysis } from "./analysisCore";

export const calculateAnalysis = async (date: string) => {
  const plan = await getDailyPlan(date);
  const [categories, dayStartTime] = await Promise.all([getCategories(), getSetting("dayStartTime", "05:00")]);
  const windowStartIso = combineDateAndTime(date, dayStartTime);
  const windowEndIso = dayjs(windowStartIso).add(1, "day").toISOString();
  const logs = await listActivityLogsInRange(windowStartIso, windowEndIso);
  const blocks = plan ? await listPlannedBlocks(plan.id) : [];

  const { analysis, summaries } = computeDailyAnalysis({
    date,
    createdAt: nowIso(),
    categories,
    blocks,
    logs,
    dayLengthMinutes: 24 * 60,
    windowStartIso,
    windowEndIso,
  });

  await saveAnalysis(analysis);
  return { analysis, summaries, blocks, logs };
};
