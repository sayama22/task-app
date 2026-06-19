"use client";

import { useState, useEffect, useCallback } from "react";
import { Category, Task, NavContext } from "@/types";
import { LeftPane } from "@/components/task/LeftPane";
import { CenterPane } from "@/components/task/CenterPane";
import { RightPane } from "@/components/task/RightPane";
import { TaskForm, TaskFormData } from "@/components/task/TaskForm";

export default function Home() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [context, setContext] = useState<NavContext>({ type: "smart", filter: "today" });
  const [formOpen, setFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch categories
  const fetchCategories = useCallback(async () => {
    const res = await fetch("/api/categories");
    if (res.ok) setCategories(await res.json());
  }, []);

  // Fetch tasks based on context
  const fetchTasks = useCallback(async () => {
    let url = "/api/tasks";
    if (context.type === "smart") {
      url = `/api/tasks?filter=${context.filter}`;
    } else if (context.type === "project") {
      url = `/api/tasks?projectId=${context.projectId}`;
    }
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      setTasks(data);
      // Keep selectedTask in sync
      setSelectedTask((prev) =>
        prev ? data.find((t: Task) => t.id === prev.id) ?? null : null
      );
    }
  }, [context]);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchCategories(), fetchTasks()]).finally(() =>
      setLoading(false)
    );
  }, [fetchCategories, fetchTasks]);

  // --- Category/Project mutations ---
  const handleAddCategory = async (name: string) => {
    const res = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, sortOrder: categories.length }),
    });
    if (res.ok) {
      const cat = await res.json();
      setCategories((prev) => [...prev, cat]);
    }
  };

  const handleRenameCategory = async (id: string, name: string) => {
    const res = await fetch(`/api/categories/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (res.ok) {
      setCategories((prev) =>
        prev.map((c) => (c.id === id ? { ...c, name } : c))
      );
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm("このカテゴリとすべてのプロジェクトを削除しますか?")) return;
    await fetch(`/api/categories/${id}`, { method: "DELETE" });
    setCategories((prev) => prev.filter((c) => c.id !== id));
    if (context.type === "project") {
      const cat = categories.find((c) => c.id === id);
      if (cat?.projects?.some((p) => p.id === context.projectId)) {
        setContext({ type: "smart", filter: "today" });
      }
    }
  };

  const handleAddProject = async (categoryId: string, name: string) => {
    const cat = categories.find((c) => c.id === categoryId);
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        categoryId,
        name,
        sortOrder: cat?.projects?.length ?? 0,
      }),
    });
    if (res.ok) {
      const proj = await res.json();
      setCategories((prev) =>
        prev.map((c) =>
          c.id === categoryId
            ? { ...c, projects: [...(c.projects ?? []), proj] }
            : c
        )
      );
    }
  };

  const handleRenameProject = async (id: string, name: string) => {
    await fetch(`/api/projects/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    setCategories((prev) =>
      prev.map((c) => ({
        ...c,
        projects: c.projects?.map((p) => (p.id === id ? { ...p, name } : p)),
      }))
    );
  };

  const handleDeleteProject = async (id: string) => {
    if (!confirm("このプロジェクトとすべてのタスクを削除しますか?")) return;
    await fetch(`/api/projects/${id}`, { method: "DELETE" });
    setCategories((prev) =>
      prev.map((c) => ({
        ...c,
        projects: c.projects?.filter((p) => p.id !== id),
      }))
    );
    if (context.type === "project" && context.projectId === id) {
      setContext({ type: "smart", filter: "today" });
    }
  };

  // --- Task mutations ---
  const handleToggleDone = async (task: Task) => {
    const res = await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done: !task.done }),
    });
    if (res.ok) {
      const updated = await res.json();
      setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      if (selectedTask?.id === updated.id) setSelectedTask(updated);
      fetchCategories(); // refresh progress
    }
  };

  const handleSaveTask = async (data: TaskFormData) => {
    if (editingTask) {
      const res = await fetch(`/api/tasks/${editingTask.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const updated = await res.json();
        setTasks((prev) =>
          prev.map((t) => (t.id === updated.id ? updated : t))
        );
        if (selectedTask?.id === updated.id) setSelectedTask(updated);
        fetchCategories();
      }
    } else {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          projectId:
            data.projectId ||
            (context.type === "project" ? context.projectId : null),
        }),
      });
      if (res.ok) {
        await fetchTasks();
        fetchCategories();
      }
    }
    setEditingTask(null);
  };

  const handleDeleteTask = async (task: Task) => {
    if (!confirm(`「${task.title}」を削除しますか?`)) return;
    await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
    setTasks((prev) => prev.filter((t) => t.id !== task.id));
    if (selectedTask?.id === task.id) setSelectedTask(null);
    fetchCategories();
  };

  const handleToggleSubtask = async (
    taskId: string,
    subtaskId: string,
    done: boolean
  ) => {
    const res = await fetch(`/api/tasks/${taskId}/subtasks`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subtaskId, done }),
    });
    if (res.ok) {
      // Refresh full task
      const taskRes = await fetch(`/api/tasks/${taskId}`);
      if (taskRes.ok) {
        const updated = await taskRes.json();
        setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
        if (selectedTask?.id === taskId) setSelectedTask(updated);
        fetchCategories();
      }
    }
  };

  const handleUploadAttachment = async (taskId: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`/api/tasks/${taskId}/attachments`, {
      method: "POST",
      body: formData,
    });
    if (res.ok) {
      const taskRes = await fetch(`/api/tasks/${taskId}`);
      if (taskRes.ok) {
        const updated = await taskRes.json();
        setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
        if (selectedTask?.id === taskId) setSelectedTask(updated);
      }
    }
  };

  const handleDeleteAttachment = async (
    taskId: string,
    attachmentId: string
  ) => {
    await fetch(
      `/api/tasks/${taskId}/attachments?attachmentId=${attachmentId}`,
      { method: "DELETE" }
    );
    const taskRes = await fetch(`/api/tasks/${taskId}`);
    if (taskRes.ok) {
      const updated = await taskRes.json();
      setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
      if (selectedTask?.id === taskId) setSelectedTask(updated);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 font-sans">
      {/* Left pane */}
      <LeftPane
        categories={categories}
        context={context}
        onSelect={setContext}
        onAddCategory={handleAddCategory}
        onRenameCategory={handleRenameCategory}
        onDeleteCategory={handleDeleteCategory}
        onAddProject={handleAddProject}
        onRenameProject={handleRenameProject}
        onDeleteProject={handleDeleteProject}
      />

      {/* Center pane */}
      <div className="flex-1 min-w-0">
        <CenterPane
          tasks={tasks}
          selectedTaskId={selectedTask?.id ?? null}
          context={context}
          onSelectTask={setSelectedTask}
          onToggleDone={handleToggleDone}
          onAddTask={() => {
            setEditingTask(null);
            setFormOpen(true);
          }}
        />
      </div>

      {/* Right pane */}
      <div className="w-80 shrink-0 border-l border-gray-100">
        <RightPane
          task={selectedTask}
          onEdit={(t) => {
            setEditingTask(t);
            setFormOpen(true);
          }}
          onDelete={handleDeleteTask}
          onToggleSubtask={handleToggleSubtask}
          onUploadAttachment={handleUploadAttachment}
          onDeleteAttachment={handleDeleteAttachment}
        />
      </div>

      {/* Task form modal */}
      <TaskForm
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditingTask(null);
        }}
        onSave={handleSaveTask}
        task={editingTask}
        categories={categories}
        defaultProjectId={
          !editingTask && context.type === "project" ? context.projectId : undefined
        }
        defaultDueDate={
          !editingTask && context.type === "smart" && context.filter === "today"
            ? new Date().toISOString().split("T")[0]
            : undefined
        }
      />
    </div>
  );
}
