import { calculateAnalysis } from "./analysis";
import { getOpenAiKey } from "./secureKey";
import { getDb } from "./db";
import { nowIso } from "./time";
import { AIFeedback } from "./types";

const id = () => `feedback-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

export const listFeedback = async (date: string): Promise<AIFeedback[]> => {
  const db = await getDb();
  return db.getAllAsync("SELECT * FROM ai_feedback WHERE date = ? ORDER BY createdAt DESC", date) as Promise<AIFeedback[]>;
};

export const deleteFeedback = async (feedbackId: string) => {
  const db = await getDb();
  await db.runAsync("DELETE FROM ai_feedback WHERE id = ?", feedbackId);
};

const classifyOpenAiError = async (response: Response) => {
  let detail = "";
  try {
    const payload = await response.json();
    detail = payload?.error?.message ? ` ${payload.error.message}` : "";
  } catch {
    detail = "";
  }

  if (response.status === 401) return `OpenAI API 키가 올바르지 않습니다.${detail}`;
  if (response.status === 403) return `OpenAI API 접근이 거부되었습니다.${detail}`;
  if (response.status === 429) return `OpenAI 사용량 또는 요청 한도를 초과했습니다.${detail}`;
  if (response.status >= 500) return `OpenAI 서비스가 일시적으로 불안정합니다.${detail}`;
  return `OpenAI 요청에 실패했습니다 (${response.status}).${detail}`;
};

const parseFeedbackJson = (text: string) => {
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("OpenAI 응답을 JSON으로 해석할 수 없습니다.");
  }

  const required = ["overallFeedback", "strengths", "problems", "suggestionsForTomorrow", "recommendedPlan"];
  const missing = required.filter((key) => !(key in parsed));
  if (missing.length) {
    throw new Error(`OpenAI 응답에 필요한 필드가 없습니다: ${missing.join(", ")}.`);
  }
  return parsed;
};

export const createAiFeedback = async (date: string) => {
  const apiKey = await getOpenAiKey();
  if (!apiKey) {
    throw new Error("OpenAI API 키가 필요합니다.");
  }
  const payload = await calculateAnalysis(date);
  const inputSummary = {
    date,
    analysis: payload.analysis,
    categorySummaries: payload.summaries.filter((item) => item.plannedMinutes || item.recordedMinutes),
  };

  let response: Response;
  try {
    response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "overallFeedback, strengths, problems, suggestionsForTomorrow, recommendedPlan 필드를 가진 JSON만 반환하세요. 모든 내용은 한국어로 작성하고, 요약 데이터에 근거한 실용적인 조언만 포함하세요.",
          },
          {
            role: "user",
            content: JSON.stringify(inputSummary),
          },
        ],
      }),
    });
  } catch {
    throw new Error("OpenAI 호출 중 네트워크 오류가 발생했습니다.");
  }

  if (!response.ok) {
    throw new Error(await classifyOpenAiError(response));
  }

  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error("OpenAI가 빈 응답을 반환했습니다.");
  parseFeedbackJson(text);

  const feedback: AIFeedback = {
    id: id(),
    date,
    inputSummaryJson: JSON.stringify(inputSummary),
    outputJson: text,
    createdAt: nowIso(),
  };
  const db = await getDb();
  await db.runAsync(
    "INSERT INTO ai_feedback (id, date, inputSummaryJson, outputJson, createdAt) VALUES (?, ?, ?, ?, ?)",
    feedback.id,
    feedback.date,
    feedback.inputSummaryJson,
    feedback.outputJson,
    feedback.createdAt,
  );
  return feedback;
};
