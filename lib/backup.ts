import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { defaultCategories } from "./db";
import { cancelAllLocalNotifications } from "./notifications";
import { resetAllData } from "./repository";
import { getDb } from "./db";

const BACKUP_SCHEMA_VERSION = 1;
const BACKUP_MIME_TYPE = "application/json";

type BackupPayload = {
  format: "daily-planner-backup";
  schemaVersion: number;
  exportedAt: string;
  tables: Record<string, unknown[]>;
};

const defaultCategoryIds = new Set(defaultCategories.map((category) => category.id));
const defaultTemplateIds = new Set(["sample-high-school-weekday", "sample-college-weekday", "sample-worker-weekday"]);

const tableNames = [
  "categories",
  "templates",
  "template_blocks",
  "daily_plans",
  "planned_blocks",
  "activity_logs",
  "daily_analysis",
  "ai_feedback",
  "app_settings",
] as const;

type TableName = (typeof tableNames)[number];

const tableColumns: Record<TableName, string[]> = {
  categories: ["id", "name", "type", "isSelfInvestment"],
  templates: ["id", "name", "description", "createdAt", "updatedAt"],
  template_blocks: ["id", "templateId", "startTime", "endTime", "title", "categoryId", "memo", "orderIndex"],
  daily_plans: ["id", "date", "sourceTemplateId", "status", "createdAt", "updatedAt"],
  planned_blocks: [
    "id",
    "dailyPlanId",
    "startDateTime",
    "endDateTime",
    "title",
    "categoryId",
    "memo",
    "notificationEnabled",
    "reminderNotificationId",
    "startNotificationId",
    "endNotificationId",
  ],
  activity_logs: ["id", "date", "plannedBlockId", "title", "categoryId", "startDateTime", "endDateTime", "source", "memo", "createdAt", "updatedAt"],
  daily_analysis: [
    "id",
    "date",
    "totalPlannedMinutes",
    "totalRecordedMinutes",
    "matchedMinutes",
    "planMatchRate",
    "selfInvestmentMinutes",
    "unplannedMinutes",
    "unrecordedMinutes",
    "createdAt",
  ],
  ai_feedback: ["id", "date", "inputSummaryJson", "outputJson", "createdAt"],
  app_settings: ["key", "value"],
};

const isRecord = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);

const bindValue = (value: unknown) => {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value;
  return JSON.stringify(value);
};

const backupFileName = () => {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `daily-planner-backup-${stamp}.json`;
};

const rows = async (table: TableName) => {
  const db = await getDb();
  return db.getAllAsync<Record<string, unknown>>(`SELECT * FROM ${table}`);
};

const buildPayload = async (): Promise<BackupPayload> => {
  const categories = (await rows("categories")).filter((item) => !defaultCategoryIds.has(String(item.id)));
  const templates = (await rows("templates")).filter((item) => !defaultTemplateIds.has(String(item.id)));
  const templateIds = new Set(templates.map((item) => String(item.id)));
  const templateBlocks = (await rows("template_blocks")).filter((item) => templateIds.has(String(item.templateId)));

  return {
    format: "daily-planner-backup",
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    tables: {
      categories,
      templates,
      template_blocks: templateBlocks,
      daily_plans: await rows("daily_plans"),
      planned_blocks: await rows("planned_blocks"),
      activity_logs: await rows("activity_logs"),
      daily_analysis: await rows("daily_analysis"),
      ai_feedback: await rows("ai_feedback"),
      app_settings: await rows("app_settings"),
    },
  };
};

export const exportUserData = async () => {
  const payload = await buildPayload();
  const uri = `${FileSystem.documentDirectory}${backupFileName()}`;
  await FileSystem.writeAsStringAsync(uri, JSON.stringify(payload, null, 2), {
    encoding: FileSystem.EncodingType.UTF8,
  });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: BACKUP_MIME_TYPE,
      dialogTitle: "데이터 내보내기",
    });
  }

  return uri;
};

const normalizeRows = (payload: BackupPayload, table: TableName) => {
  const value = payload.tables?.[table];
  if (!Array.isArray(value)) return [];
  return value.filter(isRecord).map((row) => {
    const next: Record<string, unknown> = {};
    for (const column of tableColumns[table]) {
      if (column in row) next[column] = row[column] ?? null;
    }
    return next;
  });
};

const insertRows = async (table: TableName, values: Record<string, unknown>[]) => {
  if (!values.length) return;
  const db = await getDb();
  const columns = tableColumns[table];
  const placeholders = columns.map(() => "?").join(", ");
  const sql = `INSERT OR REPLACE INTO ${table} (${columns.join(", ")}) VALUES (${placeholders})`;
  for (const row of values) {
    await db.runAsync(sql, ...columns.map((column) => bindValue(row[column])));
  }
};

const parsePayload = (text: string): BackupPayload => {
  const parsed = JSON.parse(text) as unknown;
  if (!isRecord(parsed) || parsed.format !== "daily-planner-backup" || !isRecord(parsed.tables)) {
    throw new Error("지원하지 않는 백업 파일입니다.");
  }
  return parsed as BackupPayload;
};

export const importUserDataFromUri = async (uri: string) => {
  const text = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.UTF8 });
  const payload = parsePayload(text);
  await cancelAllLocalNotifications();
  await resetAllData();
  for (const table of tableNames) {
    await insertRows(table, normalizeRows(payload, table));
  }
  return payload;
};

export const pickAndImportUserData = async () => {
  const result = await DocumentPicker.getDocumentAsync({
    type: [BACKUP_MIME_TYPE, "text/plain", "*/*"],
    copyToCacheDirectory: true,
  });
  if (result.canceled) return null;
  const asset = result.assets[0];
  if (!asset?.uri) return null;
  return importUserDataFromUri(asset.uri);
};
