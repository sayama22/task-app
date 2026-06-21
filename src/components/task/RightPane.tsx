"use client";

import { Task } from "@/types";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn, formatDate, priorityLabel, fileTypeIcon } from "@/lib/utils";
import {
  Calendar,
  Flag,
  Folder,
  FileText,
  FileSpreadsheet,
  Image as ImageIcon,
  File,
  Plus,
  Pencil,
  Trash2,
  X,
  PanelRight,
  RefreshCw,
} from "lucide-react";
import { recurrenceLabel } from "@/lib/recurrence";

interface RightPaneProps {
  task: Task | null;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onToggleSubtask: (taskId: string, subtaskId: string, done: boolean) => void;
  onUploadAttachment: (taskId: string, file: File) => void;
  onDeleteAttachment: (taskId: string, attachmentId: string) => void;
}

function AttachmentIcon({ type }: { type: string }) {
  const t = fileTypeIcon(type);
  if (t === "image") return <ImageIcon className="h-5 w-5 text-blue-400" />;
  if (t === "pdf") return <FileText className="h-5 w-5 text-red-400" />;
  if (t === "excel") return <FileSpreadsheet className="h-5 w-5 text-green-500" />;
  return <File className="h-5 w-5 text-muted-foreground" />;
}

export function RightPane({
  task,
  onEdit,
  onDelete,
  onToggleSubtask,
  onUploadAttachment,
  onDeleteAttachment,
}: RightPaneProps) {
  if (!task) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3 bg-background">
        <PanelRight size={40} strokeWidth={1} />
        <p className="text-sm">タスクを選択してください</p>
      </div>
    );
  }

  const priorityVariant =
    task.priority === "high"
      ? "destructive"
      : task.priority === "low"
      ? "outline"
      : "secondary";

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border shrink-0">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-semibold leading-snug flex-1">{task.title}</h3>
          <div className="flex items-center gap-1 shrink-0">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(task)}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              onClick={() => onDelete(task)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
        {task.type === "todo" && (
          <Badge variant="outline" className="mt-1 text-xs">ToDo</Badge>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="px-4 py-4 flex flex-col gap-4">
          {/* Progress */}
          <div>
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
              <span>進捗</span>
              <span className="font-medium tabular-nums">{task.progress}%</span>
            </div>
            <Progress value={task.progress} className="h-2" />
          </div>

          {/* Meta */}
          <div className="flex flex-col gap-2">
            {task.dueDate && (
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  期限
                </span>
                <span>{formatDate(task.dueDate)}</span>
              </div>
            )}
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Flag className="h-3.5 w-3.5" />
                優先度
              </span>
              <Badge variant={priorityVariant} className="text-xs">
                {priorityLabel(task.priority)}
              </Badge>
            </div>
            {task.recurrence && task.recurrence !== "none" && (
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <RefreshCw className="h-3.5 w-3.5" />
                  繰り返し
                </span>
                <span className="text-blue-600 font-medium text-xs bg-blue-50 px-2 py-0.5 rounded-full">
                  {recurrenceLabel[task.recurrence]}
                </span>
              </div>
            )}

          {task.project && (
              <div className="flex items-center justify-between text-sm gap-2">
                <span className="flex items-center gap-1.5 text-muted-foreground shrink-0">
                  <Folder className="h-3.5 w-3.5" />
                  プロジェクト
                </span>
                <span className="text-right text-xs truncate">
                  {task.project.category?.name
                    ? `${task.project.category.name} / ${task.project.name}`
                    : task.project.name}
                </span>
              </div>
            )}
          </div>

          {/* Tags */}
          {task.tags && task.tags.length > 0 && (
            <>
              <Separator />
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1.5">タグ</p>
                <div className="flex flex-wrap gap-1.5">
                  {task.tags.map((tag) => (
                    <Badge key={tag.id} variant="secondary" className="text-xs">
                      {tag.name}
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Subtasks */}
          {task.subtasks && task.subtasks.length > 0 && (
            <>
              <Separator />
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">
                  サブタスク ({task.subtasks.filter((s) => s.done).length}/{task.subtasks.length})
                </p>
                <div className="flex flex-col gap-2">
                  {task.subtasks.map((sub) => (
                    <div key={sub.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`sub-${sub.id}`}
                        checked={sub.done}
                        onCheckedChange={(checked) =>
                          onToggleSubtask(task.id, sub.id, !!checked)
                        }
                      />
                      <label
                        htmlFor={`sub-${sub.id}`}
                        className={cn(
                          "text-sm flex-1 cursor-pointer",
                          sub.done && "line-through text-muted-foreground"
                        )}
                      >
                        {sub.title}
                      </label>
                      {sub.dueDate && (
                        <span className="text-xs text-muted-foreground shrink-0">
                          {formatDate(sub.dueDate)}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Memo */}
          {task.memo && (
            <>
              <Separator />
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1.5">メモ</p>
                <div className="bg-muted/50 rounded-md px-3 py-2.5 text-sm whitespace-pre-wrap leading-relaxed">
                  {task.memo}
                </div>
              </div>
            </>
          )}

          {/* Attachments */}
          <Separator />
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">添付ファイル</p>
            <div className="flex flex-wrap gap-2">
              {task.attachments?.map((att) => (
                <div key={att.id} className="relative group">
                  <a
                    href={att.blobUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col items-center justify-center w-14 h-14 bg-muted rounded-lg border border-border hover:border-primary/40 hover:bg-accent transition-colors"
                    title={att.fileName}
                  >
                    {att.fileType === "image" ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={att.blobUrl}
                        alt={att.fileName}
                        className="w-full h-full object-cover rounded-lg"
                      />
                    ) : (
                      <AttachmentIcon type={att.fileType} />
                    )}
                  </a>
                  <button
                    onClick={() => onDeleteAttachment(task.id, att.id)}
                    className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </div>
              ))}

              <label className="flex flex-col items-center justify-center w-14 h-14 border border-dashed border-border rounded-lg hover:border-primary/60 hover:bg-accent/50 transition-colors cursor-pointer">
                <Plus className="h-4 w-4 text-muted-foreground" />
                <input
                  type="file"
                  className="hidden"
                  accept="image/*,.pdf,.xlsx,.xls"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) onUploadAttachment(task.id, file);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
