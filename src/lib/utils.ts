import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { Priority } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function calcProgress(
  subtasks: { done: boolean }[],
  manualProgress: number,
  done: boolean
): number {
  if (subtasks.length === 0) {
    return done ? 100 : manualProgress;
  }
  const completed = subtasks.filter((s) => s.done).length;
  return Math.round((completed / subtasks.length) * 100);
}

export function priorityLabel(p: Priority): string {
  return p === "high" ? "高" : p === "medium" ? "中" : "低";
}

export function priorityColor(p: Priority): string {
  return p === "high"
    ? "bg-red-100 text-red-700"
    : p === "medium"
    ? "bg-yellow-100 text-yellow-700"
    : "bg-green-100 text-green-700";
}

export function formatDate(d: string | null | undefined): string {
  if (!d) return "";
  const date = new Date(d);
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

export function isOverdue(dueDate: string | null): boolean {
  if (!dueDate) return false;
  return new Date(dueDate) < new Date(new Date().toDateString());
}

export function fileTypeIcon(fileType: string): string {
  if (fileType.startsWith("image/") || fileType === "image") return "image";
  if (fileType === "application/pdf" || fileType === "pdf") return "pdf";
  if (
    fileType.includes("spreadsheet") ||
    fileType.includes("excel") ||
    fileType === "excel"
  )
    return "excel";
  return "file";
}
