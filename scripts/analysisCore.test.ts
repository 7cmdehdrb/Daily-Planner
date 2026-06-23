import assert from "node:assert/strict";
import { computeDailyAnalysis } from "../lib/analysisCore";
import { ActivityLog, Category, PlannedBlock } from "../lib/types";

const date = "2026-06-23";
const categories: Category[] = [
  { id: "study", name: "Study", type: "study", isSelfInvestment: true },
  { id: "work", name: "Work", type: "work", isSelfInvestment: false },
];

const blocks: PlannedBlock[] = [
  {
    id: "block-1",
    dailyPlanId: "plan-1",
    startDateTime: "2026-06-23T00:00:00.000Z",
    endDateTime: "2026-06-23T01:00:00.000Z",
    title: "Study block",
    categoryId: "study",
    notificationEnabled: true,
  },
  {
    id: "block-2",
    dailyPlanId: "plan-1",
    startDateTime: "2026-06-23T01:00:00.000Z",
    endDateTime: "2026-06-23T02:00:00.000Z",
    title: "Work block",
    categoryId: "work",
    notificationEnabled: true,
  },
];

const logs: ActivityLog[] = [
  {
    id: "log-1",
    date,
    plannedBlockId: "block-1",
    title: "Actual study",
    categoryId: "study",
    startDateTime: "2026-06-23T00:15:00.000Z",
    endDateTime: "2026-06-23T00:45:00.000Z",
    source: "planned",
    createdAt: "2026-06-23T00:15:00.000Z",
    updatedAt: "2026-06-23T00:15:00.000Z",
  },
  {
    id: "log-2",
    date,
    plannedBlockId: null,
    title: "Manual study",
    categoryId: "study",
    startDateTime: "2026-06-23T00:30:00.000Z",
    endDateTime: "2026-06-23T01:15:00.000Z",
    source: "manual",
    createdAt: "2026-06-23T00:30:00.000Z",
    updatedAt: "2026-06-23T00:30:00.000Z",
  },
];

const { analysis, summaries } = computeDailyAnalysis({
  date,
  categories,
  blocks,
  logs,
  createdAt: "2026-06-23T02:00:00.000Z",
});

assert.equal(analysis.totalPlannedMinutes, 120);
assert.equal(analysis.totalRecordedMinutes, 75);
assert.equal(analysis.matchedMinutes, 60);
assert.equal(analysis.planMatchRate, 0.5);
assert.equal(analysis.unplannedMinutes, 45);
assert.equal(analysis.selfInvestmentMinutes, 75);
assert.equal(analysis.unrecordedMinutes, 1365);
assert.equal(summaries.find((item) => item.categoryId === "study")?.plannedMinutes, 60);
assert.equal(summaries.find((item) => item.categoryId === "study")?.recordedMinutes, 75);

const overnight = computeDailyAnalysis({
  date,
  categories,
  blocks: [
    {
      id: "sleep-block",
      dailyPlanId: "plan-1",
      startDateTime: "2026-06-23T14:00:00.000Z",
      endDateTime: "2026-06-23T22:00:00.000Z",
      title: "Overnight local block",
      categoryId: "work",
      notificationEnabled: true,
    },
  ],
  logs: [
    {
      id: "overnight-log",
      date,
      plannedBlockId: "sleep-block",
      title: "Overnight actual",
      categoryId: "work",
      startDateTime: "2026-06-23T15:00:00.000Z",
      endDateTime: "2026-06-23T17:30:00.000Z",
      source: "planned",
      createdAt: "2026-06-23T15:00:00.000Z",
      updatedAt: "2026-06-23T15:00:00.000Z",
    },
  ],
  createdAt: "2026-06-23T23:00:00.000Z",
});

assert.equal(overnight.analysis.totalPlannedMinutes, 480);
assert.equal(overnight.analysis.totalRecordedMinutes, 150);
assert.equal(overnight.analysis.matchedMinutes, 150);

const windowed = computeDailyAnalysis({
  date,
  categories,
  blocks: [],
  logs: [
    {
      id: "window-log",
      date,
      plannedBlockId: null,
      title: "Boundary log",
      categoryId: "study",
      startDateTime: "2026-06-23T02:00:00.000Z",
      endDateTime: "2026-06-23T05:00:00.000Z",
      source: "manual",
      createdAt: "2026-06-23T02:00:00.000Z",
      updatedAt: "2026-06-23T02:00:00.000Z",
    },
  ],
  createdAt: "2026-06-23T06:00:00.000Z",
  windowStartIso: "2026-06-23T03:00:00.000Z",
  windowEndIso: "2026-06-24T03:00:00.000Z",
});

assert.equal(windowed.analysis.totalRecordedMinutes, 120);
assert.equal(windowed.analysis.unplannedMinutes, 120);

const noPlan = computeDailyAnalysis({
  date,
  categories,
  blocks: [],
  logs: [
    {
      id: "free-log",
      date,
      plannedBlockId: null,
      title: "Free work",
      categoryId: "work",
      startDateTime: "2026-06-23T03:00:00.000Z",
      endDateTime: "2026-06-23T04:00:00.000Z",
      source: "manual",
      createdAt: "2026-06-23T03:00:00.000Z",
      updatedAt: "2026-06-23T03:00:00.000Z",
    },
  ],
  createdAt: "2026-06-23T04:00:00.000Z",
});

assert.equal(noPlan.analysis.totalPlannedMinutes, 0);
assert.equal(noPlan.analysis.planMatchRate, 0);
assert.equal(noPlan.analysis.unplannedMinutes, 60);

const categoryMismatch = computeDailyAnalysis({
  date,
  categories,
  blocks: [
    {
      id: "study-plan",
      dailyPlanId: "plan-1",
      startDateTime: "2026-06-23T05:00:00.000Z",
      endDateTime: "2026-06-23T06:00:00.000Z",
      title: "Study",
      categoryId: "study",
      notificationEnabled: true,
    },
  ],
  logs: [
    {
      id: "work-manual",
      date,
      plannedBlockId: null,
      title: "Manual work",
      categoryId: "work",
      startDateTime: "2026-06-23T05:00:00.000Z",
      endDateTime: "2026-06-23T06:00:00.000Z",
      source: "manual",
      createdAt: "2026-06-23T05:00:00.000Z",
      updatedAt: "2026-06-23T05:00:00.000Z",
    },
  ],
  createdAt: "2026-06-23T06:00:00.000Z",
});

assert.equal(categoryMismatch.analysis.matchedMinutes, 0);
assert.equal(categoryMismatch.analysis.planMatchRate, 0);

console.log("analysisCore checks passed");
