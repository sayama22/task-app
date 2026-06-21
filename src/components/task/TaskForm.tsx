"use client";

import { useState, useEffect } from "react";
import { Task, Category, Priority, TaskType, Recurrence } from "@/types";
import { recurrenceLabel } from "@/lib/recurrence";
import { RefreshCw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { Plus, Trash2, X } from "lucide-react";

interface TaskFormProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: TaskFormData) => Promise<void>;
  task?: Task | null;
  categories: Category[];
  defaultProjectId?: string;
  defaultDueDate?: string;
}

export interface TaskFormData {
  title: string;
  type: TaskType;
  projectId: string | null;
  dueDate: string | null;
  priority: Priority;
  recurrence: Recurrence;
  memo: string | null;
  tags: string[];
  subtasks: { id?: string; title: string; dueDate: string | null; done: boolean }[];
}

const defaultForm = (): TaskFormData => ({
  title: "",
  type: "task",
  projectId: null,
  dueDate: null,
  priority: "medium",
  recurrence: "none",
  memo: null,
  tags: [],
  subtasks: [],
});

function toFormData(task: Task): TaskFormData {
  return {
    title: task.title,
    type: task.type,
    projectId: task.projectId,
    dueDate: task.dueDate ?? null,
    priority: task.priority,
    recurrence: task.recurrence ?? "none",
    memo: task.memo ?? null,
    tags: task.tags?.map((t) => t.name) ?? [],
    subtasks:
      task.subtasks?.map((s) => ({
        id: s.id,
        title: s.title,
        dueDate: s.dueDate,
        done: s.done,
      })) ?? [],
  };
}

export function TaskForm({
  open,
  onClose,
  onSave,
  task,
  categories,
  defaultProjectId,
  defaultDueDate,
}: TaskFormProps) {
  const [form, setForm] = useState<TaskFormData>(defaultForm());
  const [saving, setSaving] = useState(false);
  const [tagInput, setTagInput] = useState("");

  useEffect(() => {
    if (open) {
      if (task) {
        setForm(toFormData(task));
      } else {
        setForm({
          ...defaultForm(),
          projectId: defaultProjectId ?? null,
          dueDate: defaultDueDate ?? null,
        });
      }
      setTagInput("");
    }
  }, [open, task, defaultProjectId, defaultDueDate]);

  const progress =
    form.subtasks.length > 0
      ? Math.round(
          (form.subtasks.filter((s) => s.done).length / form.subtasks.length) * 100
        )
      : 0;

  const handleSave = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      await onSave(form);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const addSubtask = () =>
    setForm((f) => ({
      ...f,
      subtasks: [...f.subtasks, { title: "", dueDate: null, done: false }],
    }));

  const removeSubtask = (i: number) =>
    setForm((f) => ({ ...f, subtasks: f.subtasks.filter((_, idx) => idx !== i) }));

  const addTag = (tag: string) => {
    const t = tag.trim();
    if (t && !form.tags.includes(t)) setForm((f) => ({ ...f, tags: [...f.tags, t] }));
    setTagInput("");
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{task ? "タスクを編集" : "タスクを作成"}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 pt-2">
          {/* Title */}
          <div className="grid gap-1.5">
            <Label htmlFor="title">
              タイトル <span className="text-destructive">*</span>
            </Label>
            <Input
              id="title"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="タスクのタイトル"
              autoFocus
            />
          </div>

          {/* Type + Project */}
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="type">種別</Label>
              <select
                id="type"
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as TaskType }))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <option value="task">タスク</option>
                <option value="todo">ToDo</option>
              </select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="project">プロジェクト</Label>
              <select
                id="project"
                value={form.projectId ?? ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, projectId: e.target.value || null }))
                }
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <option value="">プロジェクトなし</option>
                {categories.map((cat) =>
                  cat.projects?.map((proj) => (
                    <option key={proj.id} value={proj.id}>
                      {cat.name} / {proj.name}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          {/* Due date + Priority + Recurrence */}
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="dueDate">期限</Label>
              <Input
                id="dueDate"
                type="date"
                value={form.dueDate ?? ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, dueDate: e.target.value || null }))
                }
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="priority">優先度</Label>
              <select
                id="priority"
                value={form.priority}
                onChange={(e) =>
                  setForm((f) => ({ ...f, priority: e.target.value as Priority }))
                }
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <option value="high">高</option>
                <option value="medium">中</option>
                <option value="low">低</option>
              </select>
            </div>
          </div>

          {/* Recurrence */}
          <div className="grid gap-1.5">
            <Label htmlFor="recurrence" className="flex items-center gap-1.5">
              <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
              繰り返し
            </Label>
            <select
              id="recurrence"
              value={form.recurrence}
              onChange={(e) =>
                setForm((f) => ({ ...f, recurrence: e.target.value as Recurrence }))
              }
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              {(Object.entries(recurrenceLabel) as [Recurrence, string][]).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
            {form.recurrence !== "none" && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <RefreshCw className="h-3 w-3" />
                完了すると自動で次回日付に更新されます
              </p>
            )}
          </div>

          {/* Progress (readonly when subtasks exist) */}
          {form.subtasks.length > 0 && (
            <div className="grid gap-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-muted-foreground text-xs">
                  進捗（サブタスクから自動計算）
                </Label>
                <span className="text-xs text-muted-foreground">{progress}%</span>
              </div>
              <Progress value={progress} className="h-1.5" />
            </div>
          )}

          {/* Tags */}
          <div className="grid gap-1.5">
            <Label>タグ</Label>
            <div className="flex flex-wrap gap-1.5 min-h-6">
              {form.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="gap-1 pr-1">
                  {tag}
                  <button
                    type="button"
                    onClick={() =>
                      setForm((f) => ({ ...f, tags: f.tags.filter((t) => t !== tag) }))
                    }
                    className="rounded-full hover:bg-muted-foreground/20 p-0.5"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder="タグを入力してEnter"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTag(tagInput);
                  }
                }}
              />
              <Button type="button" variant="outline" size="sm" onClick={() => addTag(tagInput)}>
                追加
              </Button>
            </div>
          </div>

          <Separator />

          {/* Subtasks */}
          <div className="grid gap-2">
            <Label>サブタスク</Label>
            {form.subtasks.map((sub, i) => (
              <div key={i} className="flex items-center gap-2">
                <Checkbox
                  checked={sub.done}
                  onCheckedChange={(checked) =>
                    setForm((f) => ({
                      ...f,
                      subtasks: f.subtasks.map((s, idx) =>
                        idx === i ? { ...s, done: !!checked } : s
                      ),
                    }))
                  }
                />
                <Input
                  value={sub.title}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      subtasks: f.subtasks.map((s, idx) =>
                        idx === i ? { ...s, title: e.target.value } : s
                      ),
                    }))
                  }
                  placeholder="サブタスクのタイトル"
                  className={cn("flex-1", sub.done && "line-through text-muted-foreground")}
                />
                <Input
                  type="date"
                  value={sub.dueDate ?? ""}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      subtasks: f.subtasks.map((s, idx) =>
                        idx === i ? { ...s, dueDate: e.target.value || null } : s
                      ),
                    }))
                  }
                  className="w-36"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeSubtask(i)}
                  className="shrink-0 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={addSubtask}
              className="self-start"
            >
              <Plus className="mr-1 h-3.5 w-3.5" />
              サブタスクを追加
            </Button>
          </div>

          <Separator />

          {/* Memo */}
          <div className="grid gap-1.5">
            <Label htmlFor="memo">メモ</Label>
            <Textarea
              id="memo"
              rows={3}
              value={form.memo ?? ""}
              onChange={(e) =>
                setForm((f) => ({ ...f, memo: e.target.value || null }))
              }
              placeholder="メモを入力..."
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              キャンセル
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={saving || !form.title.trim()}
            >
              {saving ? "保存中..." : "保存"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
