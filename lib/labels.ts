import { Category, CategoryType, DailyPlan } from "./types";

export const APP_NAME = "하루결";

export const planStatusLabel = (status?: DailyPlan["status"] | null) => {
  if (status === "draft") return "작성 중";
  if (status === "active") return "적용됨";
  if (status === "closed") return "마감됨";
  return "아직 없음";
};

export const categoryTypeLabels: Record<CategoryType, string> = {
  job: "일",
  work: "일",
  study: "공부",
  exercise: "운동",
  hobby: "취미",
  leisure: "취미",
  rest: "휴식",
  sleep: "수면",
  meal: "식사",
  transit: "이동",
  chores: "집안일",
  admin: "집안일",
  other: "기타",
  deep_work: "일",
  waste: "기타",
};

const categoryNames: Record<string, string> = {
  job: "일",
  work: "일",
  study: "공부",
  exercise: "운동",
  hobby: "취미",
  leisure: "취미",
  rest: "휴식",
  sleep: "수면",
  meal: "식사",
  transit: "이동",
  chores: "집안일",
  admin: "집안일",
  other: "기타",
  "deep-work": "일",
  waste: "기타",
};

export const categoryLabel = (category: Category) => categoryNames[category.id] ?? category.name;

const categoryPriority: Partial<Record<CategoryType, number>> = {
  job: 10,
  work: 10,
  deep_work: 10,
  study: 20,
  exercise: 30,
  chores: 40,
  admin: 40,
  meal: 50,
  transit: 60,
  hobby: 70,
  leisure: 70,
  rest: 80,
  sleep: 90,
  waste: 999,
  other: 999,
};

const categorySortValue = (category: Category) => {
  if (category.id === "other" || category.type === "other" || category.type === "waste") return 999;
  return categoryPriority[category.type] ?? 500;
};

export const sortCategoriesByPriority = (categories: Category[]) =>
  [...categories].sort((a, b) => {
    const priorityDiff = categorySortValue(a) - categorySortValue(b);
    if (priorityDiff !== 0) return priorityDiff;
    return categoryLabel(a).localeCompare(categoryLabel(b), "ko");
  });
