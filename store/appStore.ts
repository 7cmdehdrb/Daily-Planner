import { create } from "zustand";
import { calculateAnalysis } from "@/lib/analysis";
import { initDb } from "@/lib/db";
import {
  getActiveLog,
  getAnalysis,
  getCategories,
  getDailyPlan,
  getOrCreateDailyPlan,
  listActivityLogs,
  listPlannedBlocks,
} from "@/lib/repository";
import { todayKey } from "@/lib/time";
import { ActivityLog, Category, DailyAnalysis, DailyPlan, PlannedBlock } from "@/lib/types";

type AppStore = {
  ready: boolean;
  date: string;
  categories: Category[];
  plan: DailyPlan | null;
  blocks: PlannedBlock[];
  logs: ActivityLog[];
  activeLog: ActivityLog | null;
  analysis: DailyAnalysis | null;
  init: () => Promise<void>;
  refresh: (date?: string) => Promise<void>;
};

export const useAppStore = create<AppStore>((set, get) => ({
  ready: false,
  date: todayKey(),
  categories: [],
  plan: null,
  blocks: [],
  logs: [],
  activeLog: null,
  analysis: null,
  init: async () => {
    await initDb();
    set({ ready: true });
    await get().refresh(todayKey());
  },
  refresh: async (nextDate) => {
    const date = nextDate ?? get().date;
    const categories = await getCategories();
    const plan = await getDailyPlan(date);
    const [logs, activeLog, analysis] = await Promise.all([listActivityLogs(date), getActiveLog(), getAnalysis(date)]);
    const blocks = plan ? await listPlannedBlocks(plan.id) : [];
    set({ date, categories, plan, blocks, logs, activeLog, analysis });
  },
}));

export const ensureTodayPlan = async () => {
  const date = todayKey();
  await getOrCreateDailyPlan(date);
  await useAppStore.getState().refresh(date);
};

export const recalculateToday = async () => {
  const date = useAppStore.getState().date;
  await calculateAnalysis(date);
  await useAppStore.getState().refresh(date);
};
