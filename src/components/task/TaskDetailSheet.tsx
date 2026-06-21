"use client";

import { Task } from "@/types";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { RightPane } from "./RightPane";

interface TaskDetailSheetProps {
  task: Task | null;
  open: boolean;
  onClose: () => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onToggleSubtask: (taskId: string, subtaskId: string, done: boolean) => void;
  onUploadAttachment: (taskId: string, file: File) => void;
  onDeleteAttachment: (taskId: string, attachmentId: string) => void;
}

export function TaskDetailSheet({
  task,
  open,
  onClose,
  onEdit,
  onDelete,
  onToggleSubtask,
  onUploadAttachment,
  onDeleteAttachment,
}: TaskDetailSheetProps) {
  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="h-[85vh] p-0 rounded-t-xl">
        <SheetHeader className="px-4 py-3 border-b border-border">
          <SheetTitle className="text-sm truncate text-left">
            {task?.title ?? "詳細"}
          </SheetTitle>
        </SheetHeader>
        <div className="h-[calc(85vh-57px)] overflow-y-auto">
          <RightPane
            task={task}
            onEdit={(t) => { onEdit(t); onClose(); }}
            onDelete={(t) => { onDelete(t); onClose(); }}
            onToggleSubtask={onToggleSubtask}
            onUploadAttachment={onUploadAttachment}
            onDeleteAttachment={onDeleteAttachment}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
