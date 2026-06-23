import { ActivityLog, Category, CategorySummary, DailyAnalysis, PlannedBlock } from "./types";

const minutesBetween = (startIso: string, endIso?: string | null) => {
  if (!endIso) return 0;
  return Math.max(0, Math.round((new Date(endIso).getTime() - new Date(startIso).getTime()) / 60000));
};

const overlapMinutes = (
  aStartIso: string,
  aEndIso: string | null | undefined,
  bStartIso: string,
  bEndIso: string | null | undefined,
) => {
  if (!aEndIso || !bEndIso) return 0;
  const start = Math.max(new Date(aStartIso).getTime(), new Date(bStartIso).getTime());
  const end = Math.min(new Date(aEndIso).getTime(), new Date(bEndIso).getTime());
  if (end <= start) return 0;
  return Math.round((end - start) / 60000);
};

const clampLogToWindow = (log: ActivityLog, windowStartIso?: string, windowEndIso?: string): ActivityLog => {
  if (!windowStartIso || !windowEndIso || !log.endDateTime) return log;
  const start = Math.max(new Date(log.startDateTime).getTime(), new Date(windowStartIso).getTime());
  const end = Math.min(new Date(log.endDateTime).getTime(), new Date(windowEndIso).getTime());
  const startIso = new Date(start).toISOString();
  return {
    ...log,
    startDateTime: startIso,
    endDateTime: end > start ? new Date(end).toISOString() : startIso,
  };
};

export const computeDailyAnalysis = ({
  date,
  categories,
  blocks,
  logs,
  createdAt,
  dayLengthMinutes = 24 * 60,
  windowStartIso,
  windowEndIso,
}: {
  date: string;
  categories: Category[];
  blocks: PlannedBlock[];
  logs: ActivityLog[];
  createdAt: string;
  dayLengthMinutes?: number;
  windowStartIso?: string;
  windowEndIso?: string;
}): { analysis: DailyAnalysis; summaries: CategorySummary[] } => {
  const categoryById = new Map(categories.map((category) => [category.id, category]));
  const completedLogs = logs
    .filter((log) => log.endDateTime)
    .map((log) => clampLogToWindow(log, windowStartIso, windowEndIso))
    .filter((log) => minutesBetween(log.startDateTime, log.endDateTime) > 0);

  const totalPlannedMinutes = blocks.reduce((total, block) => total + minutesBetween(block.startDateTime, block.endDateTime), 0);
  const totalRecordedMinutes = completedLogs.reduce((total, log) => total + minutesBetween(log.startDateTime, log.endDateTime), 0);

  let matchedMinutes = 0;
  for (const block of blocks) {
    for (const log of completedLogs) {
      const directMatch = log.plannedBlockId === block.id;
      const categoryMatch = !log.plannedBlockId && log.categoryId && log.categoryId === block.categoryId;
      if (directMatch || categoryMatch) {
        matchedMinutes += overlapMinutes(block.startDateTime, block.endDateTime, log.startDateTime, log.endDateTime);
      }
    }
  }

  const unplannedMinutes = completedLogs
    .filter((log) => !log.plannedBlockId)
    .reduce((total, log) => total + minutesBetween(log.startDateTime, log.endDateTime), 0);
  const selfInvestmentMinutes = completedLogs.reduce((total, log) => {
    const category = log.categoryId ? categoryById.get(log.categoryId) : null;
    return category?.isSelfInvestment ? total + minutesBetween(log.startDateTime, log.endDateTime) : total;
  }, 0);

  const analysis: DailyAnalysis = {
    id: `analysis-${date}`,
    date,
    totalPlannedMinutes,
    totalRecordedMinutes,
    matchedMinutes,
    planMatchRate: totalPlannedMinutes > 0 ? matchedMinutes / totalPlannedMinutes : 0,
    selfInvestmentMinutes,
    unplannedMinutes,
    unrecordedMinutes: Math.max(0, dayLengthMinutes - totalRecordedMinutes),
    createdAt,
  };

  const summaries = categories.map((category) => ({
    categoryId: category.id,
    name: category.name,
    plannedMinutes: blocks
      .filter((block) => block.categoryId === category.id)
      .reduce((total, block) => total + minutesBetween(block.startDateTime, block.endDateTime), 0),
    recordedMinutes: completedLogs
      .filter((log) => log.categoryId === category.id)
      .reduce((total, log) => total + minutesBetween(log.startDateTime, log.endDateTime), 0),
  }));

  return { analysis, summaries };
};
