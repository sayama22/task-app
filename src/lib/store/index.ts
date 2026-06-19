/**
 * Unified data store.
 * - DATABASE_URL が設定されていれば Neon (Drizzle ORM) を使用
 * - 設定されていなければ ローカル JSON ファイルにフォールバック
 */

const useNeon = !!process.env.DATABASE_URL;

// ─── Dynamic imports to avoid top-level Neon initialization ──────────────────

async function store() {
  if (useNeon) {
    return import("./neonStore");
  }
  // fileStore is sync, wrap in async-compatible shape
  const fs = await import("./fileStore");
  return {
    getCategories: async () => fs.getCategories(),
    createCategory: async (name: string, sortOrder?: number) =>
      fs.createCategory(name, sortOrder),
    updateCategory: async (
      id: string,
      data: Partial<{ name: string; sort_order: number }>
    ) => fs.updateCategory(id, data),
    deleteCategory: async (id: string) => fs.deleteCategory(id),
    createProject: async (
      categoryId: string,
      name: string,
      sortOrder?: number
    ) => fs.createProject(categoryId, name, sortOrder),
    updateProject: async (
      id: string,
      data: Partial<{ name: string; sort_order: number; category_id: string }>
    ) => fs.updateProject(id, data),
    deleteProject: async (id: string) => fs.deleteProject(id),
    getTasks: async (opts?: { projectId?: string; filter?: string }) =>
      fs.getTasks(opts),
    getTask: async (id: string) => fs.getTask(id),
    createTask: async (data: Parameters<typeof fs.createTask>[0]) =>
      fs.createTask(data),
    updateTask: async (
      id: string,
      data: Parameters<typeof fs.updateTask>[1]
    ) => fs.updateTask(id, data),
    deleteTask: async (id: string) => fs.deleteTask(id),
    toggleSubtask: async (
      taskId: string,
      subtaskId: string,
      done: boolean
    ) => fs.toggleSubtask(taskId, subtaskId, done),
    createAttachment: async (
      data: Parameters<typeof fs.createAttachment>[0]
    ) => fs.createAttachment(data),
    deleteAttachment: async (id: string) => fs.deleteAttachment(id),
    getTags: async () => fs.getTags(),
  };
}

export { store };
