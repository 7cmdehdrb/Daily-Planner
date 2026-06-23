import * as SQLite from "expo-sqlite";
import { Category, CategoryType } from "./types";

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export const defaultCategories: Category[] = [
  { id: "job", name: "일", type: "job", isSelfInvestment: false },
  { id: "study", name: "공부", type: "study", isSelfInvestment: true },
  { id: "exercise", name: "운동", type: "exercise", isSelfInvestment: true },
  { id: "hobby", name: "취미", type: "hobby", isSelfInvestment: false },
  { id: "rest", name: "휴식", type: "rest", isSelfInvestment: false },
  { id: "sleep", name: "수면", type: "sleep", isSelfInvestment: false },
  { id: "meal", name: "식사", type: "meal", isSelfInvestment: false },
  { id: "transit", name: "이동", type: "transit", isSelfInvestment: false },
  { id: "chores", name: "집안일", type: "chores", isSelfInvestment: false },
  { id: "other", name: "기타", type: "other", isSelfInvestment: false },
];

type SeedTemplateBlock = {
  startTime: string;
  endTime: string;
  categoryId: string;
  title: string;
};

const seedTemplates: { id: string; name: string; blocks: SeedTemplateBlock[] }[] = [
  {
    id: "sample-high-school-weekday",
    name: "평일 고등학생 루틴",
    blocks: [
      { startTime: "05:30", endTime: "06:00", categoryId: "other", title: "기상 및 세면" },
      { startTime: "06:00", endTime: "06:40", categoryId: "study", title: "영어 단어 암기" },
      { startTime: "06:40", endTime: "07:20", categoryId: "meal", title: "아침 식사 및 등교 준비" },
      { startTime: "07:20", endTime: "08:00", categoryId: "transit", title: "등교" },
      { startTime: "08:00", endTime: "12:30", categoryId: "study", title: "학교 오전 수업" },
      { startTime: "12:30", endTime: "13:20", categoryId: "meal", title: "점심 식사" },
      { startTime: "13:20", endTime: "16:00", categoryId: "study", title: "학교 오후 수업" },
      { startTime: "16:00", endTime: "17:00", categoryId: "study", title: "자습 또는 방과후 수업" },
      { startTime: "17:00", endTime: "18:00", categoryId: "transit", title: "하교 및 휴식" },
      { startTime: "18:00", endTime: "18:40", categoryId: "meal", title: "저녁 식사" },
      { startTime: "18:40", endTime: "20:30", categoryId: "study", title: "수학 문제풀이" },
      { startTime: "20:30", endTime: "20:50", categoryId: "rest", title: "짧은 휴식" },
      { startTime: "20:50", endTime: "22:00", categoryId: "study", title: "국어/영어 복습" },
      { startTime: "22:00", endTime: "22:30", categoryId: "other", title: "샤워 및 정리" },
      { startTime: "22:30", endTime: "23:00", categoryId: "rest", title: "자유 시간" },
      { startTime: "23:00", endTime: "05:30", categoryId: "sleep", title: "수면" },
    ],
  },
  {
    id: "sample-college-weekday",
    name: "평일 대학생 루틴",
    blocks: [
      { startTime: "07:30", endTime: "08:00", categoryId: "other", title: "기상 및 준비" },
      { startTime: "08:00", endTime: "08:40", categoryId: "meal", title: "아침 식사" },
      { startTime: "08:40", endTime: "09:30", categoryId: "transit", title: "학교 이동" },
      { startTime: "09:30", endTime: "12:00", categoryId: "study", title: "전공 수업" },
      { startTime: "12:00", endTime: "13:00", categoryId: "meal", title: "점심 식사" },
      { startTime: "13:00", endTime: "15:00", categoryId: "study", title: "과제 및 팀플 작업" },
      { startTime: "15:00", endTime: "16:30", categoryId: "study", title: "도서관 자습" },
      { startTime: "16:30", endTime: "17:30", categoryId: "exercise", title: "헬스장 운동" },
      { startTime: "17:30", endTime: "18:30", categoryId: "meal", title: "저녁 식사" },
      { startTime: "18:30", endTime: "20:00", categoryId: "study", title: "강의 복습" },
      { startTime: "20:00", endTime: "21:30", categoryId: "hobby", title: "동아리 또는 개인 취미" },
      { startTime: "21:30", endTime: "22:00", categoryId: "transit", title: "귀가" },
      { startTime: "22:00", endTime: "23:00", categoryId: "rest", title: "자유 시간" },
      { startTime: "23:00", endTime: "23:30", categoryId: "other", title: "내일 일정 정리" },
      { startTime: "23:30", endTime: "07:30", categoryId: "sleep", title: "수면" },
    ],
  },
  {
    id: "sample-worker-weekday",
    name: "평일 직장인 루틴",
    blocks: [
      { startTime: "06:30", endTime: "07:00", categoryId: "other", title: "기상 및 세면" },
      { startTime: "07:00", endTime: "07:40", categoryId: "meal", title: "아침 식사 및 출근 준비" },
      { startTime: "07:40", endTime: "08:40", categoryId: "transit", title: "출근" },
      { startTime: "08:40", endTime: "09:00", categoryId: "job", title: "업무 준비 및 메일 확인" },
      { startTime: "09:00", endTime: "12:00", categoryId: "job", title: "오전 집중 업무" },
      { startTime: "12:00", endTime: "13:00", categoryId: "meal", title: "점심 식사" },
      { startTime: "13:00", endTime: "15:00", categoryId: "job", title: "회의 및 협업 업무" },
      { startTime: "15:00", endTime: "15:20", categoryId: "rest", title: "커피 및 짧은 휴식" },
      { startTime: "15:20", endTime: "18:00", categoryId: "job", title: "오후 업무 정리" },
      { startTime: "18:00", endTime: "19:00", categoryId: "transit", title: "퇴근" },
      { startTime: "19:00", endTime: "19:50", categoryId: "meal", title: "저녁 식사" },
      { startTime: "19:50", endTime: "20:40", categoryId: "exercise", title: "가벼운 운동" },
      { startTime: "20:40", endTime: "21:30", categoryId: "chores", title: "샤워 및 집안일" },
      { startTime: "21:30", endTime: "22:30", categoryId: "hobby", title: "독서 또는 개인 프로젝트" },
      { startTime: "22:30", endTime: "23:00", categoryId: "rest", title: "휴식" },
      { startTime: "23:00", endTime: "06:30", categoryId: "sleep", title: "수면" },
    ],
  },
];

export const getDb = () => {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync("cplan.db");
  }
  return dbPromise;
};

export const initDb = async () => {
  const db = await getDb();
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      isSelfInvestment INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS templates (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS template_blocks (
      id TEXT PRIMARY KEY NOT NULL,
      templateId TEXT NOT NULL,
      startTime TEXT NOT NULL,
      endTime TEXT NOT NULL,
      title TEXT NOT NULL,
      categoryId TEXT NOT NULL,
      memo TEXT,
      orderIndex INTEGER NOT NULL,
      FOREIGN KEY (templateId) REFERENCES templates(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS daily_plans (
      id TEXT PRIMARY KEY NOT NULL,
      date TEXT NOT NULL UNIQUE,
      sourceTemplateId TEXT,
      status TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS planned_blocks (
      id TEXT PRIMARY KEY NOT NULL,
      dailyPlanId TEXT NOT NULL,
      startDateTime TEXT NOT NULL,
      endDateTime TEXT NOT NULL,
      title TEXT NOT NULL,
      categoryId TEXT NOT NULL,
      memo TEXT,
      notificationEnabled INTEGER NOT NULL DEFAULT 1,
      reminderNotificationId TEXT,
      startNotificationId TEXT,
      endNotificationId TEXT,
      FOREIGN KEY (dailyPlanId) REFERENCES daily_plans(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS activity_logs (
      id TEXT PRIMARY KEY NOT NULL,
      date TEXT NOT NULL,
      plannedBlockId TEXT,
      title TEXT NOT NULL,
      categoryId TEXT,
      startDateTime TEXT NOT NULL,
      endDateTime TEXT,
      source TEXT NOT NULL,
      memo TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS daily_analysis (
      id TEXT PRIMARY KEY NOT NULL,
      date TEXT NOT NULL UNIQUE,
      totalPlannedMinutes INTEGER NOT NULL,
      totalRecordedMinutes INTEGER NOT NULL,
      matchedMinutes INTEGER NOT NULL,
      planMatchRate REAL NOT NULL,
      selfInvestmentMinutes INTEGER NOT NULL,
      unplannedMinutes INTEGER NOT NULL,
      unrecordedMinutes INTEGER NOT NULL,
      createdAt TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS ai_feedback (
      id TEXT PRIMARY KEY NOT NULL,
      date TEXT NOT NULL,
      inputSummaryJson TEXT NOT NULL,
      outputJson TEXT NOT NULL,
      createdAt TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );
  `);

  await migrateDb();
  await seedDefaultCategories();
  await migrateLegacyDefaultCategories();
  await seedDefaultTemplates();
};

const hasColumn = async (tableName: string, columnName: string) => {
  const db = await getDb();
  const rows = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${tableName})`);
  return rows.some((row) => row.name === columnName);
};

const addColumnIfMissing = async (tableName: string, columnName: string, definition: string) => {
  const db = await getDb();
  if (!(await hasColumn(tableName, columnName))) {
    await db.execAsync(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
  }
};

const migrateDb = async () => {
  await addColumnIfMissing("planned_blocks", "notificationEnabled", "INTEGER NOT NULL DEFAULT 1");
  await addColumnIfMissing("planned_blocks", "reminderNotificationId", "TEXT");
  await addColumnIfMissing("planned_blocks", "startNotificationId", "TEXT");
  await addColumnIfMissing("planned_blocks", "endNotificationId", "TEXT");
  await addColumnIfMissing("template_blocks", "memo", "TEXT");
  await addColumnIfMissing("activity_logs", "memo", "TEXT");
};

export const seedDefaultCategories = async () => {
  const db = await getDb();
  for (const category of defaultCategories) {
    await db.runAsync(
      "INSERT OR IGNORE INTO categories (id, name, type, isSelfInvestment) VALUES (?, ?, ?, ?)",
      category.id,
      category.name,
      category.type,
      category.isSelfInvestment ? 1 : 0,
    );
  }
};

const legacyCategoryIdMap: Record<string, string> = {
  "deep-work": "job",
  work: "job",
  leisure: "hobby",
  admin: "chores",
  waste: "other",
};

export const migrateLegacyDefaultCategories = async () => {
  const db = await getDb();
  for (const [legacyId, nextId] of Object.entries(legacyCategoryIdMap)) {
    await db.runAsync("UPDATE planned_blocks SET categoryId = ? WHERE categoryId = ?", nextId, legacyId);
    await db.runAsync("UPDATE template_blocks SET categoryId = ? WHERE categoryId = ?", nextId, legacyId);
    await db.runAsync("UPDATE activity_logs SET categoryId = ? WHERE categoryId = ?", nextId, legacyId);
    await db.runAsync("DELETE FROM categories WHERE id = ?", legacyId);
  }
  const defaultIds = defaultCategories.map((category) => category.id);
  const placeholders = defaultIds.map(() => "?").join(", ");
  await db.runAsync(`UPDATE planned_blocks SET categoryId = 'other' WHERE categoryId NOT IN (${placeholders})`, ...defaultIds);
  await db.runAsync(`UPDATE template_blocks SET categoryId = 'other' WHERE categoryId NOT IN (${placeholders})`, ...defaultIds);
  await db.runAsync(`UPDATE activity_logs SET categoryId = 'other' WHERE categoryId NOT IN (${placeholders})`, ...defaultIds);
  await db.runAsync(`DELETE FROM categories WHERE id NOT IN (${placeholders})`, ...defaultIds);
};

export const seedDefaultTemplates = async () => {
  const db = await getDb();
  const timestamp = new Date().toISOString();
  for (const template of seedTemplates) {
    const existing = await db.getFirstAsync<{ id: string }>("SELECT id FROM templates WHERE id = ?", template.id);
    if (existing) continue;
    await db.runAsync(
      "INSERT INTO templates (id, name, description, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)",
      template.id,
      template.name,
      "기본 제공 샘플 템플릿",
      timestamp,
      timestamp,
    );
    for (const [index, block] of template.blocks.entries()) {
      await db.runAsync(
        `INSERT INTO template_blocks (id, templateId, startTime, endTime, title, categoryId, memo, orderIndex)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        `${template.id}-block-${index}`,
        template.id,
        block.startTime,
        block.endTime,
        block.title,
        block.categoryId,
        null,
        index,
      );
    }
  }
};

export const mapCategory = (row: any): Category => ({
  id: row.id,
  name: row.name,
  type: row.type as CategoryType,
  isSelfInvestment: Boolean(row.isSelfInvestment),
});
