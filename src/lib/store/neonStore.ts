/**
 * Drizzle ORM + Neon serverless driver implementation.
 * Used when DATABASE_URL is set.
 */

import { getDb } from "@/db";
import { nextDueDate } from "@/lib/recurrence";
import {
  categories,
  projects,
  tasks,
  subtasks,
  attachments,
  tags,
  taskTags,
} from "@/db/schema";
import { asc, eq, and, gte, lte, inArray, count } from "drizzle-orm";

// ─── helpers ─────────────────────────────────────────────────────────────────

function localDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getDateRange(filter: string): { from: string; to: string } {
  const today = new Date();
  if (filter === "today") {
    const s = localDateStr(today);
    return { from: s, to: s };
  }
  if (filter === "week") {
    const day = today.getDay();
    const mon = new Date(today);
    mon.setDate(today.getDate() - ((day + 6) % 7));
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    return { from: localDateStr(mon), to: localDateStr(sun) };
  }
  // month
  return {
    from: localDateStr(new Date(today.getFullYear(), today.getMonth(), 1)),
    to: localDateStr(new Date(today.getFullYear(), today.getMonth() + 1, 0)),
  };
}

type TaskTagRow = { tag: { id: string; name: string } };

function normalizeTags(taskTagRows: TaskTagRow[]) {
  return taskTagRows?.map((tt) => tt.tag) ?? [];
}

async function calcProjectProgress(projectId: string): Promise<number> {
  const db = getDb();
  const [total] = await db
    .select({ count: count() })
    .from(tasks)
    .where(eq(tasks.projectId, projectId));
  const [done] = await db
    .select({ count: count() })
    .from(tasks)
    .where(and(eq(tasks.projectId, projectId), eq(tasks.done, true)));
  return total.count > 0 ? Math.round((done.count / total.count) * 100) : 0;
}

// ─── Categories ──────────────────────────────────────────────────────────────

export async function getCategories() {
  const db = getDb();
  const cats = await db.query.categories.findMany({
    orderBy: [asc(categories.sortOrder), asc(categories.createdAt)],
    with: { projects: { orderBy: [asc(projects.sortOrder)] } },
  });

  return Promise.all(
    cats.map(async (cat) => {
      const enrichedProjects = await Promise.all(
        cat.projects.map(async (proj) => ({
          ...proj,
          progress: await calcProjectProgress(proj.id),
        }))
      );
      const catProgress =
        enrichedProjects.length > 0
          ? Math.round(
              enrichedProjects.reduce((s, p) => s + p.progress, 0) /
                enrichedProjects.length
            )
          : 0;
      return { ...cat, progress: catProgress, projects: enrichedProjects };
    })
  );
}

export async function createCategory(name: string, sortOrder = 0) {
  const db = getDb();
  const [cat] = await db
    .insert(categories)
    .values({ name, sortOrder })
    .returning();
  return { ...cat, progress: 0, projects: [] };
}

export async function updateCategory(
  id: string,
  data: Partial<{ name: string; sort_order: number }>
) {
  const db = getDb();
  const [updated] = await db
    .update(categories)
    .set({ name: data.name, sortOrder: data.sort_order })
    .where(eq(categories.id, id))
    .returning();
  return updated;
}

export async function deleteCategory(id: string) {
  const db = getDb();
  await db.delete(categories).where(eq(categories.id, id));
}

// ─── Projects ────────────────────────────────────────────────────────────────

export async function createProject(
  categoryId: string,
  name: string,
  sortOrder = 0
) {
  const db = getDb();
  const [proj] = await db
    .insert(projects)
    .values({ categoryId, name, sortOrder })
    .returning();
  return { ...proj, progress: 0 };
}

export async function updateProject(
  id: string,
  data: Partial<{ name: string; sort_order: number; category_id: string }>
) {
  const db = getDb();
  const [updated] = await db
    .update(projects)
    .set({
      name: data.name,
      sortOrder: data.sort_order,
      categoryId: data.category_id,
    })
    .where(eq(projects.id, id))
    .returning();
  const progress = await calcProjectProgress(id);
  return { ...updated, progress };
}

export async function deleteProject(id: string) {
  const db = getDb();
  await db.delete(projects).where(eq(projects.id, id));
}

// ─── Tasks ───────────────────────────────────────────────────────────────────

async function fetchFullTask(id: string) {
  const db = getDb();
  const task = await db.query.tasks.findFirst({
    where: eq(tasks.id, id),
    with: {
      subtasks: { orderBy: [asc(subtasks.sortOrder)] },
      attachments: true,
      taskTags: { with: { tag: true } },
      project: { with: { category: true } },
    },
  });
  if (!task) return null;
  return { ...task, tags: normalizeTags(task.taskTags as TaskTagRow[]) };
}

export async function getTasks(
  options: { projectId?: string; filter?: string } = {}
) {
  const db = getDb();

  if (options.filter) {
    const { from, to } = getDateRange(options.filter);

    const tasksInRange = await db.query.tasks.findMany({
      where: and(gte(tasks.dueDate, from), lte(tasks.dueDate, to)),
      with: {
        subtasks: { orderBy: [asc(subtasks.sortOrder)] },
        attachments: true,
        taskTags: { with: { tag: true } },
        project: { with: { category: true } },
      },
      orderBy: [asc(tasks.sortOrder), asc(tasks.createdAt)],
    });

    const existingIds = new Set(tasksInRange.map((t) => t.id));
    const subsInRange = await db.query.subtasks.findMany({
      where: and(gte(subtasks.dueDate, from), lte(subtasks.dueDate, to)),
    });

    const extraIds = [
      ...new Set(
        subsInRange.map((s) => s.taskId).filter((id) => !existingIds.has(id))
      ),
    ];

    let extraTasks: typeof tasksInRange = [];
    if (extraIds.length > 0) {
      extraTasks = await db.query.tasks.findMany({
        where: inArray(tasks.id, extraIds),
        with: {
          subtasks: { orderBy: [asc(subtasks.sortOrder)] },
          attachments: true,
          taskTags: { with: { tag: true } },
          project: { with: { category: true } },
        },
      });
    }

    const annotated = extraTasks.map((t) => {
      const hint = subsInRange.find((s) => s.taskId === t.id);
      return { ...t, subtaskDueSoon: hint?.title, tags: normalizeTags(t.taskTags as TaskTagRow[]) };
    });

    return [
      ...tasksInRange.map((t) => ({
        ...t,
        tags: normalizeTags(t.taskTags as TaskTagRow[]),
      })),
      ...annotated,
    ];
  }

  const where = options.projectId
    ? eq(tasks.projectId, options.projectId)
    : undefined;

  const list = await db.query.tasks.findMany({
    where,
    with: {
      subtasks: { orderBy: [asc(subtasks.sortOrder)] },
      attachments: true,
      taskTags: { with: { tag: true } },
      project: { with: { category: true } },
    },
    orderBy: [asc(tasks.sortOrder), asc(tasks.createdAt)],
  });

  return list.map((t) => ({
    ...t,
    tags: normalizeTags(t.taskTags as TaskTagRow[]),
  }));
}

export async function getTask(id: string) {
  return fetchFullTask(id);
}

export async function createTask(data: {
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
  const db = getDb();
  const [task] = await db
    .insert(tasks)
    .values({
      projectId: data.projectId ?? null,
      title: data.title,
      type: data.type ?? "task",
      dueDate: data.dueDate ?? null,
      priority: data.priority ?? "medium",
      progress: data.progress ?? 0,
      memo: data.memo ?? null,
      done: false,
      recurrence: data.recurrence ?? "none",
    })
    .returning();

  if (data.subtasks?.length) {
    await db.insert(subtasks).values(
      data.subtasks.map((s, i) => ({
        taskId: task.id,
        title: s.title,
        dueDate: s.dueDate ?? null,
        done: s.done ?? false,
        sortOrder: i,
      }))
    );
  }

  if (data.tags?.length) {
    for (const name of data.tags) {
      let [tag] = await db
        .select()
        .from(tags)
        .where(eq(tags.name, name))
        .limit(1);
      if (!tag) {
        [tag] = await db.insert(tags).values({ name }).returning();
      }
      await db.insert(taskTags).values({ taskId: task.id, tagId: tag.id });
    }
  }

  return fetchFullTask(task.id);
}

export async function updateTask(
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
  const db = getDb();

  // 繰り返しロジック: done=true かつ recurrence != none → 次回日付にロールオーバー
  const current = await db.query.tasks.findFirst({ where: eq(tasks.id, id) });
  const recurrence = (data.recurrence ?? current?.recurrence ?? "none") as import("@/types").Recurrence;

  const update: Partial<typeof tasks.$inferInsert> = { updatedAt: new Date() };
  if (data.title !== undefined) update.title = data.title;
  if (data.type !== undefined) update.type = data.type;
  if (data.projectId !== undefined) update.projectId = data.projectId;
  if (data.dueDate !== undefined) update.dueDate = data.dueDate;
  if (data.priority !== undefined) update.priority = data.priority;
  if (data.progress !== undefined) update.progress = data.progress;
  if (data.memo !== undefined) update.memo = data.memo;
  if (data.recurrence !== undefined) update.recurrence = data.recurrence;

  if (data.done === true && recurrence !== "none") {
    // ロールオーバー: 次回日付に進め、done をリセット
    update.dueDate = nextDueDate(current?.dueDate ?? null, recurrence);
    update.done = false;
    update.progress = 0;
  } else if (data.done !== undefined) {
    update.done = data.done;
  }

  await db.update(tasks).set(update).where(eq(tasks.id, id));

  if (data.subtasks !== undefined) {
    await db.delete(subtasks).where(eq(subtasks.taskId, id));
    if (data.subtasks.length) {
      await db.insert(subtasks).values(
        data.subtasks.map((s, i) => ({
          taskId: id,
          title: s.title,
          dueDate: s.dueDate ?? null,
          done: s.done ?? false,
          sortOrder: i,
        }))
      );
    }
    // ロールオーバー時はサブタスクも未完了にリセット
    if (data.done === true && recurrence !== "none") {
      await db.update(subtasks).set({ done: false }).where(eq(subtasks.taskId, id));
    }
  }

  if (data.tags !== undefined) {
    await db.delete(taskTags).where(eq(taskTags.taskId, id));
    for (const name of data.tags) {
      let [tag] = await db.select().from(tags).where(eq(tags.name, name)).limit(1);
      if (!tag) [tag] = await db.insert(tags).values({ name }).returning();
      await db.insert(taskTags).values({ taskId: id, tagId: tag.id });
    }
  }

  // Recalculate progress from subtasks
  const subs = await db.select().from(subtasks).where(eq(subtasks.taskId, id));
  if (subs.length > 0) {
    const progress = Math.round((subs.filter((s) => s.done).length / subs.length) * 100);
    await db.update(tasks).set({ progress }).where(eq(tasks.id, id));
  } else if (update.done) {
    await db.update(tasks).set({ progress: 100 }).where(eq(tasks.id, id));
  }

  return fetchFullTask(id);
}

export async function deleteTask(id: string) {
  const db = getDb();
  await db.delete(tasks).where(eq(tasks.id, id));
}

// ─── Subtasks ────────────────────────────────────────────────────────────────

export async function toggleSubtask(
  taskId: string,
  subtaskId: string,
  done: boolean
) {
  const db = getDb();
  await db.update(subtasks).set({ done }).where(eq(subtasks.id, subtaskId));
  const subs = await db.select().from(subtasks).where(eq(subtasks.taskId, taskId));
  const progress =
    subs.length > 0
      ? Math.round((subs.filter((s) => s.done).length / subs.length) * 100)
      : 0;
  await db.update(tasks).set({ progress, updatedAt: new Date() }).where(eq(tasks.id, taskId));
  return { progress };
}

// ─── Attachments ─────────────────────────────────────────────────────────────

export async function createAttachment(data: {
  taskId: string;
  fileName: string;
  fileType: string;
  blobUrl: string;
}) {
  const db = getDb();
  const [att] = await db.insert(attachments).values(data).returning();
  return { id: att.id, taskId: att.taskId, fileName: att.fileName, fileType: att.fileType, blobUrl: att.blobUrl };
}

export async function deleteAttachment(id: string) {
  const db = getDb();
  await db.delete(attachments).where(eq(attachments.id, id));
}

// ─── Tags ─────────────────────────────────────────────────────────────────────

export async function getTags() {
  const db = getDb();
  return db.select({ id: tags.id, name: tags.name }).from(tags).orderBy(asc(tags.name));
}
