"use client";

import { NavContext, Category } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { LeftPane } from "./LeftPane";
import { Menu, Plus, CheckSquare } from "lucide-react";

interface MobileHeaderProps {
  context: NavContext;
  categories: Category[];
  onSelect: (ctx: NavContext) => void;
  onAddTask: () => void;
  onAddCategory: (name: string) => void;
  onRenameCategory: (id: string, name: string) => void;
  onDeleteCategory: (id: string) => void;
  onAddProject: (categoryId: string, name: string) => void;
  onRenameProject: (id: string, name: string) => void;
  onDeleteProject: (id: string) => void;
  navOpen: boolean;
  setNavOpen: (open: boolean) => void;
}

function contextTitle(ctx: NavContext, categories: Category[]): string {
  if (ctx.type === "smart") {
    return ctx.filter === "today" ? "今日" : ctx.filter === "week" ? "今週" : "今月";
  }
  if (ctx.type === "project") {
    for (const cat of categories) {
      const proj = cat.projects?.find((p) => p.id === ctx.projectId);
      if (proj) return proj.name;
    }
  }
  return "タスク一覧";
}

export function MobileHeader({
  context,
  categories,
  onSelect,
  onAddTask,
  onAddCategory,
  onRenameCategory,
  onDeleteCategory,
  onAddProject,
  onRenameProject,
  onDeleteProject,
  navOpen,
  setNavOpen,
}: MobileHeaderProps) {
  return (
    <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-background shrink-0 md:hidden">
      {/* Hamburger → Left pane sheet */}
      <Sheet open={navOpen} onOpenChange={setNavOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-64">
          <SheetHeader className="px-4 py-3 border-b border-border">
            <SheetTitle className="flex items-center gap-2 text-sm">
              <CheckSquare className="h-4 w-4" />
              TaskFlow
            </SheetTitle>
          </SheetHeader>
          <div className="h-full overflow-y-auto">
            <LeftPane
              categories={categories}
              context={context}
              onSelect={(ctx) => {
                onSelect(ctx);
                setNavOpen(false);
              }}
              onAddCategory={onAddCategory}
              onRenameCategory={onRenameCategory}
              onDeleteCategory={onDeleteCategory}
              onAddProject={onAddProject}
              onRenameProject={onRenameProject}
              onDeleteProject={onDeleteProject}
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* Title */}
      <h1 className="text-sm font-semibold">{contextTitle(context, categories)}</h1>

      {/* Add task button */}
      <Button size="sm" onClick={onAddTask} className="h-9">
        <Plus className="h-4 w-4" />
        追加
      </Button>
    </header>
  );
}
