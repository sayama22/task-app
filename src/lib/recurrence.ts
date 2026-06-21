import { Recurrence } from "@/types";

/** 繰り返し設定に基づき次の期限日を計算する (YYYY-MM-DD) */
export function nextDueDate(current: string | null, recurrence: Recurrence): string {
  const base = current ? new Date(current + "T00:00:00") : new Date();
  const next = new Date(base);

  if (recurrence === "daily") {
    next.setDate(base.getDate() + 1);
  } else if (recurrence === "weekly") {
    next.setDate(base.getDate() + 7);
  } else if (recurrence === "monthly") {
    next.setMonth(base.getMonth() + 1);
  }

  const y = next.getFullYear();
  const m = String(next.getMonth() + 1).padStart(2, "0");
  const d = String(next.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export const recurrenceLabel: Record<Recurrence, string> = {
  none: "繰り返しなし",
  daily: "毎日",
  weekly: "毎週",
  monthly: "毎月",
};

export const recurrenceIcon: Record<Recurrence, string> = {
  none: "",
  daily: "↻ 毎日",
  weekly: "↻ 毎週",
  monthly: "↻ 毎月",
};
