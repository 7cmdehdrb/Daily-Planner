import { z } from "zod";

export const timeTextSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "HH:mm 형식으로 입력해 주세요.");

export const planBlockInputSchema = z.object({
  title: z.string().trim().min(1, "제목을 입력해 주세요."),
  startTime: timeTextSchema,
  endTime: timeTextSchema,
  categoryId: z.string().trim().min(1, "카테고리를 선택해 주세요."),
  memo: z.string().optional(),
});

export const templateBlockInputSchema = z.object({
  title: z.string().trim().min(1, "제목을 입력해 주세요."),
  startTime: timeTextSchema,
  endTime: timeTextSchema,
  categoryId: z.string().trim().min(1, "카테고리를 선택해 주세요."),
  memo: z.string().optional(),
});

export const manualActivityInputSchema = z.object({
  title: z.string().trim().min(1, "제목을 입력해 주세요."),
  categoryId: z.string().trim().min(1, "카테고리를 선택해 주세요."),
});

export const activityLogEditInputSchema = z.object({
  title: z.string().trim().min(1, "제목을 입력해 주세요."),
  categoryId: z.string().trim().min(1, "카테고리를 선택해 주세요."),
  startTime: timeTextSchema,
  endTime: z.union([timeTextSchema, z.literal("")]),
});

export const categoryInputSchema = z.object({
  name: z.string().trim().min(1, "이름을 입력해 주세요."),
  type: z.string().trim().min(1, "유형을 선택해 주세요."),
  isSelfInvestment: z.boolean(),
});

export const validationMessage = (error: unknown) => {
  if (error instanceof z.ZodError) {
    return error.issues.map((issue) => issue.message).join("\n");
  }
  return error instanceof Error ? error.message : "입력값을 확인해 주세요.";
};
