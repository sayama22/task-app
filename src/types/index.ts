export type Priority = "high" | "medium" | "low";
export type TaskType = "task" | "todo";
export type SmartFilter = "today" | "week" | "month";
export type Recurrence = "none" | "daily" | "weekly" | "monthly";

export interface Category {
  id: string;
  name: string;
  sortOrder: number;
  progress?: number;
  projects?: Project[];
}

export interface Project {
  id: string;
  categoryId: string;
  name: string;
  sortOrder: number;
  progress?: number;
  tasks?: Task[];
}

export interface Subtask {
  id: string;
  taskId: string;
  title: string;
  dueDate: string | null;
  done: boolean;
  sortOrder: number;
}

export interface Attachment {
  id: string;
  taskId: string;
  fileName: string;
  fileType: string;
  blobUrl: string;
}

export interface Tag {
  id: string;
  name: string;
}

export interface Task {
  id: string;
  projectId: string | null;
  title: string;
  type: TaskType;
  dueDate: string | null;
  priority: Priority;
  progress: number;
  memo: string | null;
  done: boolean;
  recurrence: Recurrence;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  subtasks?: Subtask[];
  attachments?: Attachment[];
  tags?: Tag[];
  project?: Project & { category?: Category };
  subtaskDueSoon?: string;
}

export type NavContext =
  | { type: "smart"; filter: SmartFilter }
  | { type: "project"; projectId: string }
  | { type: "all" };
