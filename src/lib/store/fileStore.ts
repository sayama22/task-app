/**
 * Simple JSON file-based store for local development.
 * Activated when DATABASE_URL is not set.
 * Data is persisted to .data/db.json in the project root.
 */

import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { nextDueDate } from "@/lib/recurrence";

const DATA_DIR = path.join(process.cwd(), ".data");
const DB_PATH = path.join(DATA_DIR, "db.json");

interface DbData {
  categories: CategoryRow[];
  projects: ProjectRow[];
  tasks: TaskRow[];
  subtasks: SubtaskRow[];
  attachments: AttachmentRow[];
  tags: TagRow[];
  taskTags: TaskTagRow[];
}

interface CategoryRow {
  id: string;
  name: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

interface ProjectRow {
  id: string;
  category_id: string;
  name: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

interface TaskRow {
  id: string;
  project_id: string | null;
  title: string;
  type: string;
  due_date: string | null;
  priority: string;
  progress: number;
  memo: string | null;
  done: boolean;
  recurrence: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

interface SubtaskRow {
  id: string;
  task_id: string;
  title: string;
  due_date: string | null;
  done: boolean;
  sort_order: number;
  created_at: string;
}

interface AttachmentRow {
  id: string;
  task_id: string;
  file_name: string;
  file_type: string;
  blob_url: string;
  created_at: string;
}

interface TagRow {
  id: string;
  name: string;
  created_at: string;
}

interface TaskTagRow {
  task_id: string;
  tag_id: string;
}

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readDb(): DbData {
  ensureDir();
  if (!fs.existsSync(DB_PATH)) {
    return {
      categories: [],
      projects: [],
      tasks: [],
      subtasks: [],
      attachments: [],
      tags: [],
      taskTags: [],
    };
  }
  return JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
}

function writeDb(data: DbData) {
  ensureDir();
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), "utf-8");
}

function now() {
  return new Date().toISOString();
}

// ─── Categories ──────────────────────────────────────────────────────────────

function calcProjectProgress(db: DbData, projectId: string): number {
  const projectTasks = db.tasks.filter((t) => t.project_id === projectId);
  if (projectTasks.length === 0) return 0;
  const done = projectTasks.filter((t) => t.done).length;
  return Math.round((done / projectTasks.length) * 100);
}

function enrichProject(db: DbData, proj: ProjectRow) {
  return {
    id: proj.id,
    categoryId: proj.category_id,
    name: proj.name,
    sortOrder: proj.sort_order,
    progress: calcProjectProgress(db, proj.id),
    createdAt: proj.created_at,
    updatedAt: proj.updated_at,
  };
}

export function getCategories() {
  const db = readDb();
  return db.categories
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((cat) => {
      const projects = db.projects
        .filter((p) => p.category_id === cat.id)
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((p) => enrichProject(db, p));

      const catProgress =
        projects.length > 0
          ? Math.round(
              projects.reduce((s, p) => s + p.progress, 0) / projects.length
            )
          : 0;

      return {
        id: cat.id,
        name: cat.name,
        sortOrder: cat.sort_order,
        progress: catProgress,
        projects,
        createdAt: cat.created_at,
        updatedAt: cat.updated_at,
      };
    });
}

export function createCategory(name: string, sortOrder = 0) {
  const db = readDb();
  const cat: CategoryRow = {
    id: randomUUID(),
    name,
    sort_order: sortOrder,
    created_at: now(),
    updated_at: now(),
  };
  db.categories.push(cat);
  writeDb(db);
  return { ...cat, progress: 0, projects: [] };
}

export function updateCategory(id: string, data: Partial<{ name: string; sort_order: number }>) {
  const db = readDb();
  const idx = db.categories.findIndex((c) => c.id === id);
  if (idx < 0) return null;
  db.categories[idx] = { ...db.categories[idx], ...data, updated_at: now() };
  writeDb(db);
  return db.categories[idx];
}

export function deleteCategory(id: string) {
  const db = readDb();
  // cascade: delete projects and their tasks
  const projectIds = db.projects.filter((p) => p.category_id === id).map((p) => p.id);
  for (const pid of projectIds) deleteProjectCascade(db, pid);
  db.categories = db.categories.filter((c) => c.id !== id);
  writeDb(db);
}

// ─── Projects ────────────────────────────────────────────────────────────────

function deleteProjectCascade(db: DbData, projectId: string) {
  const taskIds = db.tasks.filter((t) => t.project_id === projectId).map((t) => t.id);
  for (const tid of taskIds) deleteTaskCascade(db, tid);
  db.projects = db.projects.filter((p) => p.id !== projectId);
}

export function createProject(categoryId: string, name: string, sortOrder = 0) {
  const db = readDb();
  const proj: ProjectRow = {
    id: randomUUID(),
    category_id: categoryId,
    name,
    sort_order: sortOrder,
    created_at: now(),
    updated_at: now(),
  };
  db.projects.push(proj);
  writeDb(db);
  return enrichProject(db, proj);
}

export function updateProject(
  id: string,
  data: Partial<{ name: string; sort_order: number; category_id: string }>
) {
  const db = readDb();
  const idx = db.projects.findIndex((p) => p.id === id);
  if (idx < 0) return null;
  db.projects[idx] = { ...db.projects[idx], ...data, updated_at: now() };
  writeDb(db);
  return enrichProject(db, db.projects[idx]);
}

export function deleteProject(id: string) {
  const db = readDb();
  deleteProjectCascade(db, id);
  writeDb(db);
}

// ─── Tasks ───────────────────────────────────────────────────────────────────

function deleteTaskCascade(db: DbData, taskId: string) {
  db.subtasks = db.subtasks.filter((s) => s.task_id !== taskId);
  db.attachments = db.attachments.filter((a) => a.task_id !== taskId);
  db.taskTags = db.taskTags.filter((tt) => tt.task_id !== taskId);
  db.tasks = db.tasks.filter((t) => t.id !== taskId);
}

function enrichTask(db: DbData, task: TaskRow) {
  const subtasks = db.subtasks
    .filter((s) => s.task_id === task.id)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((s) => ({
      id: s.id,
      taskId: s.task_id,
      title: s.title,
      dueDate: s.due_date,
      done: s.done,
      sortOrder: s.sort_order,
    }));

  const attachments = db.attachments
    .filter((a) => a.task_id === task.id)
    .map((a) => ({
      id: a.id,
      taskId: a.task_id,
      fileName: a.file_name,
      fileType: a.file_type,
      blobUrl: a.blob_url,
    }));

  const tags = db.taskTags
    .filter((tt) => tt.task_id === task.id)
    .map((tt) => db.tags.find((t) => t.id === tt.tag_id))
    .filter(Boolean)
    .map((t) => ({ id: t!.id, name: t!.name }));

  const project = task.project_id
    ? db.projects.find((p) => p.id === task.project_id)
    : null;
  const category = project
    ? db.categories.find((c) => c.id === project.category_id)
    : null;

  // Recalculate progress
  let progress = task.progress;
  if (subtasks.length > 0) {
    progress = Math.round((subtasks.filter((s) => s.done).length / subtasks.length) * 100);
  } else if (task.done) {
    progress = 100;
  }

  return {
    id: task.id,
    projectId: task.project_id,
    title: task.title,
    type: task.type,
    dueDate: task.due_date,
    priority: task.priority,
    progress,
    memo: task.memo,
    done: task.done,
    recurrence: (task.recurrence ?? "none") as import("@/types").Recurrence,
    sortOrder: task.sort_order,
    createdAt: task.created_at,
    updatedAt: task.updated_at,
    subtasks,
    attachments,
    tags,
    project: project
      ? {
          id: project.id,
          categoryId: project.category_id,
          name: project.name,
          sortOrder: project.sort_order,
          category: category
            ? { id: category.id, name: category.name, sortOrder: category.sort_order }
            : undefined,
        }
      : undefined,
  };
}

function isInRange(dateStr: string | null, from: string, to: string): boolean {
  if (!dateStr) return false;
  return dateStr >= from && dateStr <= to;
}

/** Format a Date as YYYY-MM-DD using LOCAL timezone (not UTC) */
function localDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function getTasks(options: { projectId?: string; filter?: string } = {}) {
  const db = readDb();
  let taskList = db.tasks.sort((a, b) => a.sort_order - b.sort_order);

  if (options.filter) {
    const today = new Date();

    let from: string, to: string;
    if (options.filter === "today") {
      from = to = localDateStr(today);
    } else if (options.filter === "week") {
      const day = today.getDay();
      const mon = new Date(today);
      mon.setDate(today.getDate() - ((day + 6) % 7));
      const sun = new Date(mon);
      sun.setDate(mon.getDate() + 6);
      from = localDateStr(mon);
      to = localDateStr(sun);
    } else {
      // month
      from = localDateStr(new Date(today.getFullYear(), today.getMonth(), 1));
      to = localDateStr(new Date(today.getFullYear(), today.getMonth() + 1, 0));
    }

    const enriched: ReturnType<typeof enrichTask>[] = [];
    const seen = new Set<string>();

    for (const t of taskList) {
      if (isInRange(t.due_date, from, to)) {
        enriched.push(enrichTask(db, t));
        seen.add(t.id);
      }
    }

    // tasks via subtask due date
    for (const s of db.subtasks) {
      if (isInRange(s.due_date, from, to) && !seen.has(s.task_id)) {
        const t = db.tasks.find((tt) => tt.id === s.task_id);
        if (t) {
          const e = enrichTask(db, t) as ReturnType<typeof enrichTask> & { subtaskDueSoon?: string };
          e.subtaskDueSoon = s.title;
          enriched.push(e);
          seen.add(t.id);
        }
      }
    }

    return enriched;
  }

  if (options.projectId) {
    taskList = taskList.filter((t) => t.project_id === options.projectId);
  }

  return taskList.map((t) => enrichTask(db, t));
}

export function getTask(id: string) {
  const db = readDb();
  const task = db.tasks.find((t) => t.id === id);
  if (!task) return null;
  return enrichTask(db, task);
}

export function createTask(data: {
  projectId?: string | null;
  title: string;
  type?: string;
  dueDate?: string | null;
  priority?: string;
  progress?: number;
  memo?: string | null;
  recurrence?: string;
  subtasks?: { title: string; dueDate?: string | null; done?: boolean }[];
  tags?: string[];
}) {
  const db = readDb();
  const task: TaskRow = {
    id: randomUUID(),
    project_id: data.projectId ?? null,
    title: data.title,
    type: data.type ?? "task",
    due_date: data.dueDate ?? null,
    priority: data.priority ?? "medium",
    progress: data.progress ?? 0,
    memo: data.memo ?? null,
    done: false,
    recurrence: data.recurrence ?? "none",
    sort_order: db.tasks.length,
    created_at: now(),
    updated_at: now(),
  };
  db.tasks.push(task);

  if (data.subtasks?.length) {
    data.subtasks.forEach((s, i) => {
      db.subtasks.push({
        id: randomUUID(),
        task_id: task.id,
        title: s.title,
        due_date: s.dueDate ?? null,
        done: s.done ?? false,
        sort_order: i,
        created_at: now(),
      });
    });
  }

  if (data.tags?.length) {
    for (const name of data.tags) {
      let tag = db.tags.find((t) => t.name === name);
      if (!tag) {
        tag = { id: randomUUID(), name, created_at: now() };
        db.tags.push(tag);
      }
      db.taskTags.push({ task_id: task.id, tag_id: tag.id });
    }
  }

  writeDb(db);
  return enrichTask(db, task);
}

export function updateTask(
  id: string,
  data: {
    title?: string;
    type?: string;
    projectId?: string | null;
    dueDate?: string | null;
    priority?: string;
    progress?: number;
    memo?: string | null;
    done?: boolean;
    recurrence?: string;
    subtasks?: { id?: string; title: string; dueDate?: string | null; done?: boolean }[];
    tags?: string[];
  }
) {
  const db = readDb();
  const idx = db.tasks.findIndex((t) => t.id === id);
  if (idx < 0) return null;

  const task = db.tasks[idx];
  if (data.title !== undefined) task.title = data.title;
  if (data.type !== undefined) task.type = data.type;
  if (data.projectId !== undefined) task.project_id = data.projectId;
  if (data.dueDate !== undefined) task.due_date = data.dueDate;
  if (data.priority !== undefined) task.priority = data.priority;
  if (data.progress !== undefined) task.progress = data.progress;
  if (data.memo !== undefined) task.memo = data.memo;
  if (data.recurrence !== undefined) task.recurrence = data.recurrence;
  task.updated_at = now();

  // 繰り返しロジック: done=true かつ recurrence != none → 次回日付にロールオーバー
  const recurrence = (task.recurrence ?? "none") as import("@/types").Recurrence;
  if (data.done === true && recurrence !== "none") {
    task.due_date = nextDueDate(task.due_date, recurrence);
    task.done = false; // リセット
    // サブタスクも未完了にリセット
    db.subtasks.filter((s) => s.task_id === id).forEach((s) => { s.done = false; });
    task.progress = 0;
  } else {
    if (data.done !== undefined) task.done = data.done;
  }

  if (data.subtasks !== undefined) {
    db.subtasks = db.subtasks.filter((s) => s.task_id !== id);
    data.subtasks.forEach((s, i) => {
      db.subtasks.push({
        id: randomUUID(),
        task_id: id,
        title: s.title,
        due_date: s.dueDate ?? null,
        done: s.done ?? false,
        sort_order: i,
        created_at: now(),
      });
    });
  }

  if (data.tags !== undefined) {
    db.taskTags = db.taskTags.filter((tt) => tt.task_id !== id);
    for (const name of data.tags) {
      let tag = db.tags.find((t) => t.name === name);
      if (!tag) {
        tag = { id: randomUUID(), name, created_at: now() };
        db.tags.push(tag);
      }
      db.taskTags.push({ task_id: id, tag_id: tag.id });
    }
  }

  // Recalculate progress
  const subs = db.subtasks.filter((s) => s.task_id === id);
  if (subs.length > 0) {
    task.progress = Math.round((subs.filter((s) => s.done).length / subs.length) * 100);
  } else if (task.done) {
    task.progress = 100;
  }

  writeDb(db);
  return enrichTask(db, task);
}

export function deleteTask(id: string) {
  const db = readDb();
  deleteTaskCascade(db, id);
  writeDb(db);
}

// ─── Subtasks ────────────────────────────────────────────────────────────────

export function toggleSubtask(taskId: string, subtaskId: string, done: boolean) {
  const db = readDb();
  const sub = db.subtasks.find((s) => s.id === subtaskId);
  if (sub) sub.done = done;

  const subs = db.subtasks.filter((s) => s.task_id === taskId);
  const task = db.tasks.find((t) => t.id === taskId);
  if (task && subs.length > 0) {
    task.progress = Math.round((subs.filter((s) => s.done).length / subs.length) * 100);
    task.updated_at = now();
  }
  writeDb(db);
  return { progress: task?.progress ?? 0 };
}

// ─── Attachments ─────────────────────────────────────────────────────────────

export function createAttachment(data: {
  taskId: string;
  fileName: string;
  fileType: string;
  blobUrl: string;
}) {
  const db = readDb();
  const att: AttachmentRow = {
    id: randomUUID(),
    task_id: data.taskId,
    file_name: data.fileName,
    file_type: data.fileType,
    blob_url: data.blobUrl,
    created_at: now(),
  };
  db.attachments.push(att);
  writeDb(db);
  return { id: att.id, taskId: att.task_id, fileName: att.file_name, fileType: att.file_type, blobUrl: att.blob_url };
}

export function deleteAttachment(id: string) {
  const db = readDb();
  db.attachments = db.attachments.filter((a) => a.id !== id);
  writeDb(db);
}

// ─── Tags ─────────────────────────────────────────────────────────────────────

export function getTags() {
  const db = readDb();
  return db.tags.map((t) => ({ id: t.id, name: t.name }));
}
