export type PlanStatus = "draft" | "active" | "closed";
export type ActivitySource = "planned" | "manual";

export type CategoryType =
  | "deep_work"
  | "job"
  | "study"
  | "work"
  | "exercise"
  | "hobby"
  | "meal"
  | "rest"
  | "sleep"
  | "leisure"
  | "transit"
  | "chores"
  | "admin"
  | "waste"
  | "other";

export type Category = {
  id: string;
  name: string;
  type: CategoryType;
  isSelfInvestment: boolean;
};

export type Template = {
  id: string;
  name: string;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TemplateBlock = {
  id: string;
  templateId: string;
  startTime: string;
  endTime: string;
  title: string;
  categoryId: string;
  memo?: string | null;
  orderIndex: number;
};

export type DailyPlan = {
  id: string;
  date: string;
  sourceTemplateId?: string | null;
  status: PlanStatus;
  createdAt: string;
  updatedAt: string;
};

export type PlannedBlock = {
  id: string;
  dailyPlanId: string;
  startDateTime: string;
  endDateTime: string;
  title: string;
  categoryId: string;
  memo?: string | null;
  notificationEnabled: boolean;
  reminderNotificationId?: string | null;
  startNotificationId?: string | null;
  endNotificationId?: string | null;
};

export type ActivityLog = {
  id: string;
  date: string;
  plannedBlockId?: string | null;
  title: string;
  categoryId?: string | null;
  startDateTime: string;
  endDateTime?: string | null;
  source: ActivitySource;
  memo?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DailyAnalysis = {
  id: string;
  date: string;
  totalPlannedMinutes: number;
  totalRecordedMinutes: number;
  matchedMinutes: number;
  planMatchRate: number;
  selfInvestmentMinutes: number;
  unplannedMinutes: number;
  unrecordedMinutes: number;
  createdAt: string;
};

export type CategorySummary = {
  categoryId: string;
  name: string;
  plannedMinutes: number;
  recordedMinutes: number;
};

export type AIFeedback = {
  id: string;
  date: string;
  inputSummaryJson: string;
  outputJson: string;
  createdAt: string;
};

export type DashboardState = {
  plan: DailyPlan | null;
  plannedBlocks: PlannedBlock[];
  activeLog: ActivityLog | null;
  logs: ActivityLog[];
  analysis: DailyAnalysis | null;
};
