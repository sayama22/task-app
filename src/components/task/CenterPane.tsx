"use client";

import { Task, NavContext } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn, formatDate, isOverdue, priorityLabel } from "@/lib/utils";
import {
  CheckSquare2,
  Square,
  Plus,
  AlertCircle,
  Clock,
  Folder,
  ListTodo,
  RefreshCw,
} from "lucide-react";
import { recurrenceIcon } from "@/lib/recurrence";

interface CenterPaneProps {
  tasks: Task[];
  selectedTaskId: string | null;
  context: NavContext;
  onSelectTask: (task: Task) => void;
  onToggleDone: (task: Task) => void;
  onAddTask: () => void;
}

function contextLabel(ctx: NavContext): string {
  if (ctx.type === "smart") {
    return ctx.filter === "today" ? "今日" : ctx.filter === "week" ? "今週" : "今月";
  }
  return "タスク一覧";
}

export function CenterPane({
  tasks,
  selectedTaskId,
  context,
  onSelectTask,
  onToggleDone,
  onAddTask,
}: CenterPaneProps) {
  const activeTasks = tasks.filter((t) => !t.done);
  const doneTasks = tasks.filter((t) => t.done);

  const renderTask = (task: Task) => {
    const overdue = isOverdue(task.dueDate) && !task.done;
    const isSelected = selectedTaskId === task.id;

    return (
      <div
        key={task.id}
        role="button"
        tabIndex={0}
        onClick={() => onSelectTask(task)}
        onKeyDown={(e) => e.key === "Enter" && onSelectTask(task)}
        className={cn(
          "flex items-start gap-2.5 px-3 py-2.5 rounded-lg border transition-all cursor-pointer select-none",
          isSelected
            ? "bg-accent border-accent-foreground/20 shadow-sm"
            : "bg-card border-transparent hover:bg-accent/40 hover:border-border",
          task.done && "opacity-60"
        )}
      >
        {/* Checkbox */}
        <div
          role="checkbox"
          aria-checked={task.done}
          tabIndex={0}
          onClick={(e) => { e.stopPropagation(); onToggleDone(task); }}
          onKeyDown={(e) => {
            if (e.key === " " || e.key === "Enter") {
              e.stopPropagation();
              onToggleDone(task);
            }
          }}
          className={cn(
            "mt-0.5 shrink-0 cursor-pointer transition-colors",
            task.done ? "text-primary" : "text-muted-foreground/40 hover:text-muted-foreground"
          )}
        >
          {task.done ? <CheckSquare2 size={16} /> : <Square size={16} />}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className={cn(
                "text-sm font-medium leading-snug",
                task.done ? "line-through text-muted-foreground" : "text-foreground"
              )}
            >
              {task.title}
            </span>
            <Badge
              variant={
                task.priority === "high"
                  ? "destructive"
                  : task.priority === "low"
                  ? "outline"
                  : "secondary"
              }
              className="text-[10px] px-1.5 py-0"
            >
              {priorityLabel(task.priority)}
            </Badge>
            {task.type === "todo" && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">ToDo</Badge>
            )}
          </div>

            {task.recurrence && task.recurrence !== "none" && (
              <span className="inline-flex items-center gap-0.5 text-[10px] text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded-full">
                <RefreshCw className="h-2.5 w-2.5" />
                {recurrenceIcon[task.recurrence]}
              </span>
            )}

            {task.subtaskDueSoon && (
            <p className="text-xs text-orange-500 mt-0.5 flex items-center gap-1">
              <AlertCircle size={10} />
              サブタスク「{task.subtaskDueSoon}」が締切
            </p>
          )}

          <div className="flex items-center gap-3 mt-1 flex-wrap">
            {task.project && (
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <Folder size={10} />
                {task.project.category?.name
                  ? `${task.project.category.name} / ${task.project.name}`
                  : task.project.name}
              </span>
            )}
            {task.dueDate && (
              <span
                className={cn(
                  "flex items-center gap-1 text-[11px]",
                  overdue ? "text-destructive font-medium" : "text-muted-foreground"
                )}
              >
                <Clock size={10} />
                {formatDate(task.dueDate)}
                {overdue && " 期限切れ"}
              </span>
            )}
            {task.progress > 0 && !task.done && (
              <span className="text-[11px] text-muted-foreground">{task.progress}%</span>
            )}
          </div>

          {task.progress > 0 && !task.done && (
            <Progress value={task.progress} className="mt-1.5 h-1" />
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-muted/30">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border bg-background flex items-center justify-between shrink-0">
        <h2 className="text-sm font-semibold">{contextLabel(context)}</h2>
        <Button size="sm" onClick={onAddTask}>
          <Plus className="h-3.5 w-3.5" />
          追加
        </Button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-1.5">
        {activeTasks.length === 0 && doneTasks.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
            <ListTodo size={40} strokeWidth={1} />
            <p className="text-sm">タスクがありません</p>
            <Button variant="outline" size="sm" onClick={onAddTask}>
              <Plus className="h-3.5 w-3.5" />
              タスクを追加
            </Button>
          </div>
        )}

        {activeTasks.map(renderTask)}

        {doneTasks.length > 0 && (
          <>
            <div className="flex items-center gap-2 mt-2">
              <Separator className="flex-1" />
              <span className="text-xs text-muted-foreground shrink-0">
                完了済み ({doneTasks.length})
              </span>
              <Separator className="flex-1" />
            </div>
            {doneTasks.map(renderTask)}
          </>
        )}
      </div>
    </div>
  );
}
