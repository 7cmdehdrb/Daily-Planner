import { getDb, mapCategory, migrateLegacyDefaultCategories, seedDefaultCategories, seedDefaultTemplates } from "./db";
import dayjs from "dayjs";
import { combineDateAndRange, hasTimeConflict, localTimePart, nowIso } from "./time";
import {
  ActivityLog,
  Category,
  DailyAnalysis,
  DailyPlan,
  PlannedBlock,
  Template,
  TemplateBlock,
} from "./types";

const id = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const boolToInt = (value: boolean) => (value ? 1 : 0);

const mapPlan = (row: any): DailyPlan => ({
  id: row.id,
  date: row.date,
  sourceTemplateId: row.sourceTemplateId,
  status: row.status,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

const mapBlock = (row: any): PlannedBlock => ({
  id: row.id,
  dailyPlanId: row.dailyPlanId,
  startDateTime: row.startDateTime,
  endDateTime: row.endDateTime,
  title: row.title,
  categoryId: row.categoryId,
  memo: row.memo,
  notificationEnabled: Boolean(row.notificationEnabled),
  reminderNotificationId: row.reminderNotificationId,
  startNotificationId: row.startNotificationId,
  endNotificationId: row.endNotificationId,
});

const mapLog = (row: any): ActivityLog => ({
  id: row.id,
  date: row.date,
  plannedBlockId: row.plannedBlockId,
  title: row.title,
  categoryId: row.categoryId,
  startDateTime: row.startDateTime,
  endDateTime: row.endDateTime,
  source: row.source,
  memo: row.memo,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

const activityLogsOverlap = (aStart: string, aEnd: string | null | undefined, bStart: string, bEnd: string | null | undefined) => {
  if (!aEnd || !bEnd) return false;
  return dayjs(aStart).isBefore(dayjs(bEnd)) && dayjs(bStart).isBefore(dayjs(aEnd));
};

export const getCategories = async (): Promise<Category[]> => {
  const db = await getDb();
  const rows = await db.getAllAsync("SELECT * FROM categories ORDER BY name");
  return rows.map(mapCategory);
};

export const saveCategory = async (category: Category) => {
  const db = await getDb();
  await db.runAsync(
    "INSERT OR REPLACE INTO categories (id, name, type, isSelfInvestment) VALUES (?, ?, ?, ?)",
    category.id,
    category.name,
    category.type,
    boolToInt(category.isSelfInvestment),
  );
};

export const deleteCategory = async (categoryId: string) => {
  const db = await getDb();
  const usage = await db.getFirstAsync<{ count: number }>(
    `SELECT
      (SELECT COUNT(*) FROM planned_blocks WHERE categoryId = ?) +
      (SELECT COUNT(*) FROM template_blocks WHERE categoryId = ?) +
      (SELECT COUNT(*) FROM activity_logs WHERE categoryId = ?) AS count`,
    categoryId,
    categoryId,
    categoryId,
  );
  if ((usage?.count ?? 0) > 0) {
    throw new Error("계획, 템플릿, 기록에서 사용 중인 카테고리입니다.");
  }
  await db.runAsync("DELETE FROM categories WHERE id = ?", categoryId);
};

export const getOrCreateDailyPlan = async (date: string): Promise<DailyPlan> => {
  const db = await getDb();
  const existing = await db.getFirstAsync("SELECT * FROM daily_plans WHERE date = ?", date);
  if (existing) return mapPlan(existing);
  const createdAt = nowIso();
  const plan: DailyPlan = {
    id: id("plan"),
    date,
    status: "draft",
    createdAt,
    updatedAt: createdAt,
  };
  await db.runAsync(
    "INSERT INTO daily_plans (id, date, sourceTemplateId, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)",
    plan.id,
    plan.date,
    null,
    plan.status,
    plan.createdAt,
    plan.updatedAt,
  );
  return plan;
};

export const getDailyPlan = async (date: string): Promise<DailyPlan | null> => {
  const db = await getDb();
  const row = await db.getFirstAsync("SELECT * FROM daily_plans WHERE date = ?", date);
  return row ? mapPlan(row) : null;
};

export const listPlannedBlocks = async (dailyPlanId: string): Promise<PlannedBlock[]> => {
  const db = await getDb();
  const rows = await db.getAllAsync("SELECT * FROM planned_blocks WHERE dailyPlanId = ? ORDER BY startDateTime", dailyPlanId);
  return rows.map(mapBlock);
};

export const upsertPlannedBlock = async (
  block: Omit<PlannedBlock, "id" | "notificationEnabled"> & { id?: string; notificationEnabled?: boolean },
) => {
  const db = await getDb();
  if (!dayjs(block.endDateTime).isAfter(dayjs(block.startDateTime))) {
    throw new Error("종료 시간은 시작 시간보다 뒤여야 합니다.");
  }
  const existing = await listPlannedBlocks(block.dailyPlanId);
  if (hasTimeConflict(block.startDateTime, block.endDateTime, existing, block.id)) {
    throw new Error("기존 계획 블록과 시간이 겹칩니다.");
  }
  const next: PlannedBlock = {
    id: block.id ?? id("block"),
    dailyPlanId: block.dailyPlanId,
    startDateTime: block.startDateTime,
    endDateTime: block.endDateTime,
    title: block.title,
    categoryId: block.categoryId,
    memo: block.memo ?? null,
    notificationEnabled: block.notificationEnabled ?? true,
    reminderNotificationId: null,
    startNotificationId: null,
    endNotificationId: null,
  };
  await db.runAsync(
    `INSERT OR REPLACE INTO planned_blocks
     (id, dailyPlanId, startDateTime, endDateTime, title, categoryId, memo, notificationEnabled)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    next.id,
    next.dailyPlanId,
    next.startDateTime,
    next.endDateTime,
    next.title,
    next.categoryId,
    next.memo ?? null,
    boolToInt(next.notificationEnabled),
  );
  return next;
};

export const updatePlannedBlockNotificationIds = async (
  blockId: string,
  ids: {
    reminderNotificationId?: string | null;
    startNotificationId?: string | null;
    endNotificationId?: string | null;
  },
) => {
  const db = await getDb();
  await db.runAsync(
    `UPDATE planned_blocks
     SET reminderNotificationId = ?, startNotificationId = ?, endNotificationId = ?
     WHERE id = ?`,
    ids.reminderNotificationId ?? null,
    ids.startNotificationId ?? null,
    ids.endNotificationId ?? null,
    blockId,
  );
};

export const clearPlannedBlockNotificationIds = async (dailyPlanId: string) => {
  const db = await getDb();
  await db.runAsync(
    `UPDATE planned_blocks
     SET reminderNotificationId = NULL, startNotificationId = NULL, endNotificationId = NULL
     WHERE dailyPlanId = ?`,
    dailyPlanId,
  );
};

export const deletePlannedBlock = async (blockId: string) => {
  const db = await getDb();
  await db.runAsync("DELETE FROM planned_blocks WHERE id = ?", blockId);
};

export const activatePlan = async (date: string) => {
  const db = await getDb();
  const plan = await getOrCreateDailyPlan(date);
  await db.runAsync("UPDATE daily_plans SET status = ?, updatedAt = ? WHERE id = ?", "active", nowIso(), plan.id);
  return { ...plan, status: "active" as const, updatedAt: nowIso() };
};

export const closePlan = async (date: string) => {
  const db = await getDb();
  const plan = await getOrCreateDailyPlan(date);
  const updatedAt = nowIso();
  await db.runAsync("UPDATE daily_plans SET status = ?, updatedAt = ? WHERE id = ?", "closed", updatedAt, plan.id);
  return { ...plan, status: "closed" as const, updatedAt };
};

export const reopenPlan = async (date: string) => {
  const db = await getDb();
  const plan = await getOrCreateDailyPlan(date);
  const updatedAt = nowIso();
  await db.runAsync("UPDATE daily_plans SET status = ?, updatedAt = ? WHERE id = ?", "draft", updatedAt, plan.id);
  return { ...plan, status: "draft" as const, updatedAt };
};

export const listActivityLogs = async (date: string): Promise<ActivityLog[]> => {
  const db = await getDb();
  const rows = await db.getAllAsync("SELECT * FROM activity_logs WHERE date = ? ORDER BY startDateTime", date);
  return rows.map(mapLog);
};

export const listActivityLogsInRange = async (startIso: string, endIso: string): Promise<ActivityLog[]> => {
  const db = await getDb();
  const rows = await db.getAllAsync(
    `SELECT * FROM activity_logs
     WHERE startDateTime < ?
       AND (endDateTime IS NULL OR endDateTime > ?)
     ORDER BY startDateTime`,
    endIso,
    startIso,
  );
  return rows.map(mapLog);
};

export const getActiveLog = async (): Promise<ActivityLog | null> => {
  const db = await getDb();
  const row = await db.getFirstAsync("SELECT * FROM activity_logs WHERE endDateTime IS NULL ORDER BY startDateTime DESC LIMIT 1");
  return row ? mapLog(row) : null;
};

export const startActivity = async ({
  date,
  title,
  categoryId,
  plannedBlockId,
}: {
  date: string;
  title: string;
  categoryId?: string | null;
  plannedBlockId?: string | null;
}) => {
  const db = await getDb();
  const timestamp = nowIso();
  const active = await getActiveLog();
  if (active) {
    await db.runAsync("UPDATE activity_logs SET endDateTime = ?, updatedAt = ? WHERE id = ?", timestamp, timestamp, active.id);
  }
  const log: ActivityLog = {
    id: id("log"),
    date,
    plannedBlockId: plannedBlockId ?? null,
    title,
    categoryId: categoryId ?? null,
    startDateTime: timestamp,
    endDateTime: null,
    source: plannedBlockId ? "planned" : "manual",
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  await db.runAsync(
    `INSERT INTO activity_logs
     (id, date, plannedBlockId, title, categoryId, startDateTime, endDateTime, source, memo, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    log.id,
    log.date,
    log.plannedBlockId ?? null,
    log.title,
    log.categoryId ?? null,
    log.startDateTime,
    null,
    log.source,
    null,
    log.createdAt,
    log.updatedAt,
  );
  return log;
};

export const stopActiveActivity = async () => {
  const db = await getDb();
  const active = await getActiveLog();
  if (!active) return null;
  const timestamp = nowIso();
  await db.runAsync("UPDATE activity_logs SET endDateTime = ?, updatedAt = ? WHERE id = ?", timestamp, timestamp, active.id);
  return { ...active, endDateTime: timestamp, updatedAt: timestamp };
};

export const deleteActivityLog = async (logId: string) => {
  const db = await getDb();
  await db.runAsync("DELETE FROM activity_logs WHERE id = ?", logId);
};

export const updateActivityLog = async (
  logId: string,
  patch: {
    title: string;
    categoryId?: string | null;
    startDateTime?: string;
    endDateTime?: string | null;
    memo?: string | null;
  },
) => {
  const db = await getDb();
  const timestamp = nowIso();
  const current = await db.getFirstAsync<ActivityLog>("SELECT * FROM activity_logs WHERE id = ?", logId);
  if (!current) {
    throw new Error("활동 기록을 찾을 수 없습니다.");
  }
  const nextStart = patch.startDateTime ?? current.startDateTime;
  const nextEnd = patch.endDateTime === undefined ? current.endDateTime : patch.endDateTime;
  if (nextEnd && !dayjs(nextEnd).isAfter(dayjs(nextStart))) {
    throw new Error("종료 시간은 시작 시간보다 뒤여야 합니다.");
  }
  if (nextEnd) {
    const rows = await db.getAllAsync("SELECT * FROM activity_logs WHERE date = ? AND id != ? AND endDateTime IS NOT NULL", current.date, logId);
    const conflicts = rows.map(mapLog).some((log) => activityLogsOverlap(nextStart, nextEnd, log.startDateTime, log.endDateTime));
    if (conflicts) {
      throw new Error("다른 활동 기록과 시간이 겹칩니다.");
    }
  }
  if (patch.endDateTime === null) {
    await db.runAsync("UPDATE activity_logs SET endDateTime = ?, updatedAt = ? WHERE endDateTime IS NULL AND id != ?", timestamp, timestamp, logId);
  }
  await db.runAsync(
    `UPDATE activity_logs
     SET title = ?,
         categoryId = ?,
         startDateTime = COALESCE(?, startDateTime),
         endDateTime = ?,
         memo = ?,
         updatedAt = ?
     WHERE id = ?`,
    patch.title,
    patch.categoryId ?? null,
    patch.startDateTime ?? null,
    patch.endDateTime ?? null,
    patch.memo ?? null,
    timestamp,
    logId,
  );
};

export const saveAnalysis = async (analysis: DailyAnalysis) => {
  const db = await getDb();
  await db.runAsync(
    `INSERT OR REPLACE INTO daily_analysis
     (id, date, totalPlannedMinutes, totalRecordedMinutes, matchedMinutes, planMatchRate, selfInvestmentMinutes, unplannedMinutes, unrecordedMinutes, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    analysis.id,
    analysis.date,
    analysis.totalPlannedMinutes,
    analysis.totalRecordedMinutes,
    analysis.matchedMinutes,
    analysis.planMatchRate,
    analysis.selfInvestmentMinutes,
    analysis.unplannedMinutes,
    analysis.unrecordedMinutes,
    analysis.createdAt,
  );
};

export const getAnalysis = async (date: string): Promise<DailyAnalysis | null> => {
  const db = await getDb();
  const row = await db.getFirstAsync("SELECT * FROM daily_analysis WHERE date = ?", date);
  return row as DailyAnalysis | null;
};

export const listTemplates = async (): Promise<Template[]> => {
  const db = await getDb();
  return db.getAllAsync("SELECT * FROM templates ORDER BY updatedAt DESC") as Promise<Template[]>;
};

export const createTemplate = async (name: string, description?: string | null) => {
  const db = await getDb();
  const timestamp = nowIso();
  const template: Template = {
    id: id("template"),
    name,
    description: description ?? null,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  await db.runAsync(
    "INSERT INTO templates (id, name, description, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)",
    template.id,
    template.name,
    template.description ?? null,
    template.createdAt,
    template.updatedAt,
  );
  return template;
};

export const createTemplateFromPlan = async (dailyPlanId: string, name: string, description?: string) => {
  const db = await getDb();
  const blocks = await listPlannedBlocks(dailyPlanId);
  const timestamp = nowIso();
  const template: Template = {
    id: id("template"),
    name,
    description: description ?? null,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  await db.runAsync(
    "INSERT INTO templates (id, name, description, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)",
    template.id,
    template.name,
    template.description ?? null,
    template.createdAt,
    template.updatedAt,
  );
  for (const [index, block] of blocks.entries()) {
    await db.runAsync(
      `INSERT INTO template_blocks (id, templateId, startTime, endTime, title, categoryId, memo, orderIndex)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      id("template-block"),
      template.id,
      localTimePart(block.startDateTime),
      localTimePart(block.endDateTime),
      block.title,
      block.categoryId,
      block.memo ?? null,
      index,
    );
  }
  return template;
};

export const replaceTemplateFromPlan = async (templateId: string, dailyPlanId: string, name?: string) => {
  const db = await getDb();
  const template = (await db.getFirstAsync("SELECT * FROM templates WHERE id = ?", templateId)) as Template | null;
  if (!template) throw new Error("템플릿을 찾을 수 없습니다.");
  const blocks = await listPlannedBlocks(dailyPlanId);
  const timestamp = nowIso();
  await db.runAsync(
    "UPDATE templates SET name = ?, updatedAt = ? WHERE id = ?",
    name?.trim() || template.name,
    timestamp,
    templateId,
  );
  await db.runAsync("DELETE FROM template_blocks WHERE templateId = ?", templateId);
  for (const [index, block] of blocks.entries()) {
    await db.runAsync(
      `INSERT INTO template_blocks (id, templateId, startTime, endTime, title, categoryId, memo, orderIndex)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      id("template-block"),
      templateId,
      localTimePart(block.startDateTime),
      localTimePart(block.endDateTime),
      block.title,
      block.categoryId,
      block.memo ?? null,
      index,
    );
  }
};

export const renameTemplate = async (templateId: string, name: string, description?: string | null) => {
  const db = await getDb();
  await db.runAsync(
    "UPDATE templates SET name = ?, description = ?, updatedAt = ? WHERE id = ?",
    name,
    description ?? null,
    nowIso(),
    templateId,
  );
};

export const listTemplateBlocks = async (templateId: string): Promise<TemplateBlock[]> => {
  const db = await getDb();
  return db.getAllAsync("SELECT * FROM template_blocks WHERE templateId = ? ORDER BY orderIndex", templateId) as Promise<TemplateBlock[]>;
};

export const upsertTemplateBlock = async (
  block: Omit<TemplateBlock, "id" | "orderIndex"> & { id?: string; orderIndex?: number },
) => {
  const db = await getDb();
  const existing = await listTemplateBlocks(block.templateId);
  const nextRange = combineDateAndRange("2000-01-01", block.startTime, block.endTime);
  const conflicts = existing.some((item) => {
    if (block.id && item.id === block.id) return false;
    const itemRange = combineDateAndRange("2000-01-01", item.startTime, item.endTime);
    return hasTimeConflict(nextRange.startDateTime, nextRange.endDateTime, [
      {
        id: item.id,
        startDateTime: itemRange.startDateTime,
        endDateTime: itemRange.endDateTime,
      },
    ]);
  });
  if (conflicts) {
    throw new Error("템플릿 블록 시간이 다른 블록과 겹칩니다.");
  }
  const next: TemplateBlock = {
    id: block.id ?? id("template-block"),
    templateId: block.templateId,
    startTime: block.startTime,
    endTime: block.endTime,
    title: block.title,
    categoryId: block.categoryId,
    memo: block.memo ?? null,
    orderIndex: block.orderIndex ?? existing.length,
  };
  await db.runAsync(
    `INSERT OR REPLACE INTO template_blocks (id, templateId, startTime, endTime, title, categoryId, memo, orderIndex)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    next.id,
    next.templateId,
    next.startTime,
    next.endTime,
    next.title,
    next.categoryId,
    next.memo ?? null,
    next.orderIndex,
  );
  await db.runAsync("UPDATE templates SET updatedAt = ? WHERE id = ?", nowIso(), next.templateId);
  return next;
};

export const deleteTemplateBlock = async (blockId: string) => {
  const db = await getDb();
  const block = await db.getFirstAsync<{ templateId: string }>("SELECT templateId FROM template_blocks WHERE id = ?", blockId);
  await db.runAsync("DELETE FROM template_blocks WHERE id = ?", blockId);
  if (block?.templateId) {
    await db.runAsync("UPDATE templates SET updatedAt = ? WHERE id = ?", nowIso(), block.templateId);
  }
};

export const applyTemplateToPlan = async (templateId: string, date: string) => {
  const db = await getDb();
  const plan = await getOrCreateDailyPlan(date);
  const blocks = await listTemplateBlocks(templateId);
  await db.runAsync("DELETE FROM planned_blocks WHERE dailyPlanId = ?", plan.id);
  for (const [index, block] of blocks.entries()) {
    const range = combineDateAndRange(date, block.startTime, block.endTime);
    await upsertPlannedBlock({
      id: id(`block-${index}`),
      dailyPlanId: plan.id,
      startDateTime: range.startDateTime,
      endDateTime: range.endDateTime,
      title: block.title,
      categoryId: block.categoryId,
      memo: block.memo,
      notificationEnabled: true,
    });
  }
  await db.runAsync("UPDATE daily_plans SET sourceTemplateId = ?, status = ?, updatedAt = ? WHERE id = ?", templateId, "draft", nowIso(), plan.id);
  return plan;
};

export const copyTemplate = async (templateId: string) => {
  const db = await getDb();
  const template = (await db.getFirstAsync("SELECT * FROM templates WHERE id = ?", templateId)) as Template | null;
  if (!template) throw new Error("템플릿을 찾을 수 없습니다.");
  const blocks = await listTemplateBlocks(templateId);
  const timestamp = nowIso();
  const next: Template = {
    id: id("template"),
    name: `${template.name} 복사본`,
    description: template.description,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  await db.runAsync(
    "INSERT INTO templates (id, name, description, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)",
    next.id,
    next.name,
    next.description ?? null,
    next.createdAt,
    next.updatedAt,
  );
  for (const block of blocks) {
    await db.runAsync(
      `INSERT INTO template_blocks (id, templateId, startTime, endTime, title, categoryId, memo, orderIndex)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      id("template-block"),
      next.id,
      block.startTime,
      block.endTime,
      block.title,
      block.categoryId,
      block.memo ?? null,
      block.orderIndex,
    );
  }
  return next;
};

export const deleteTemplate = async (templateId: string) => {
  const db = await getDb();
  await db.runAsync("DELETE FROM templates WHERE id = ?", templateId);
};

export const resetAllData = async () => {
  const db = await getDb();
  await db.execAsync(`
    DELETE FROM ai_feedback;
    DELETE FROM daily_analysis;
    DELETE FROM activity_logs;
    DELETE FROM planned_blocks;
    DELETE FROM daily_plans;
    DELETE FROM template_blocks;
    DELETE FROM templates;
    DELETE FROM categories;
  `);
  await seedDefaultCategories();
  await migrateLegacyDefaultCategories();
  await seedDefaultTemplates();
};

export const getSetting = async (key: string, fallback: string) => {
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string }>("SELECT value FROM app_settings WHERE key = ?", key);
  return row?.value ?? fallback;
};

export const saveSetting = async (key: string, value: string) => {
  const db = await getDb();
  await db.runAsync("INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)", key, value);
};
