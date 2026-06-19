"use client";

import { useState } from "react";
import {
  Sun,
  CalendarDays,
  CalendarRange,
  Folder,
  Plus,
  ChevronDown,
  ChevronRight,
  Trash2,
  Check,
} from "lucide-react";
import { Category, NavContext } from "@/types";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface LeftPaneProps {
  categories: Category[];
  context: NavContext;
  onSelect: (ctx: NavContext) => void;
  onAddCategory: (name: string) => void;
  onRenameCategory: (id: string, name: string) => void;
  onDeleteCategory: (id: string) => void;
  onAddProject: (categoryId: string, name: string) => void;
  onRenameProject: (id: string, name: string) => void;
  onDeleteProject: (id: string) => void;
}

function InlineEdit({ value, onSave }: { value: string; onSave: (v: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(value);

  if (!editing) {
    return (
      <span
        className="cursor-pointer truncate"
        onDoubleClick={(e) => {
          e.stopPropagation();
          setText(value);
          setEditing(true);
        }}
        title="ダブルクリックで編集"
      >
        {value}
      </span>
    );
  }

  return (
    <form
      className="flex items-center gap-1 flex-1"
      onSubmit={(e) => {
        e.preventDefault();
        if (text.trim()) onSave(text.trim());
        setEditing(false);
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <input
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="flex-1 text-sm border border-ring rounded px-1 py-0.5 outline-none bg-background"
        onBlur={() => setEditing(false)}
        onKeyDown={(e) => e.key === "Escape" && setEditing(false)}
      />
    </form>
  );
}

export function LeftPane({
  categories,
  context,
  onSelect,
  onAddCategory,
  onRenameCategory,
  onDeleteCategory,
  onAddProject,
  onRenameProject,
  onDeleteProject,
}: LeftPaneProps) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [addingProject, setAddingProject] = useState<string | null>(null);
  const [newProjectName, setNewProjectName] = useState("");
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  const isSmartActive = (f: string) => context.type === "smart" && context.filter === f;
  const isProjectActive = (id: string) => context.type === "project" && context.projectId === id;

  const smartFilters = [
    { id: "today", label: "今日", icon: <Sun size={14} /> },
    { id: "week", label: "今週", icon: <CalendarDays size={14} /> },
    { id: "month", label: "今月", icon: <CalendarRange size={14} /> },
  ] as const;

  return (
    <aside className="w-56 shrink-0 bg-sidebar border-r border-sidebar-border flex flex-col h-full overflow-y-auto">
      {/* Smart Filters */}
      <div className="p-2 flex flex-col gap-0.5">
        {smartFilters.map(({ id, label, icon }) => (
          <button
            key={id}
            onClick={() => onSelect({ type: "smart", filter: id })}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors w-full text-left",
              isSmartActive(id)
                ? "bg-accent text-accent-foreground font-medium"
                : "text-sidebar-foreground hover:bg-accent/50"
            )}
          >
            {icon}
            {label}
          </button>
        ))}
      </div>

      <div className="border-t border-sidebar-border flex-1 overflow-y-auto pt-1">
        {categories.map((cat) => (
          <div key={cat.id} className="mb-1">
            {/* Category header */}
            <div className="flex items-center gap-1 px-2 py-1 group">
              <div
                role="button"
                tabIndex={0}
                onClick={() => setCollapsed((c) => ({ ...c, [cat.id]: !c[cat.id] }))}
                onKeyDown={(e) =>
                  e.key === "Enter" && setCollapsed((c) => ({ ...c, [cat.id]: !c[cat.id] }))
                }
                className="text-muted-foreground shrink-0 cursor-pointer p-0.5"
              >
                {collapsed[cat.id] ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
              </div>
              <div className="flex-1 min-w-0 flex items-center justify-between gap-1">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider truncate">
                  <InlineEdit value={cat.name} onSave={(v) => onRenameCategory(cat.id, v)} />
                </span>
                <span className="text-[11px] text-muted-foreground/60 shrink-0">
                  {cat.progress ?? 0}%
                </span>
              </div>
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <button
                  onClick={() => { setAddingProject(cat.id); setNewProjectName(""); }}
                  className="p-0.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground"
                  title="プロジェクトを追加"
                >
                  <Plus size={12} />
                </button>
                <button
                  onClick={() => onDeleteCategory(cat.id)}
                  className="p-0.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                  title="削除"
                >
                  <Trash2 size={11} />
                </button>
              </div>
            </div>

            {/* Projects */}
            {!collapsed[cat.id] && (
              <div className="ml-4 mr-2 flex flex-col gap-0.5">
                {cat.projects?.map((proj) => (
                  <div
                    key={proj.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => onSelect({ type: "project", projectId: proj.id })}
                    onKeyDown={(e) =>
                      e.key === "Enter" && onSelect({ type: "project", projectId: proj.id })
                    }
                    className={cn(
                      "group flex flex-col px-2 py-1.5 rounded-md transition-colors cursor-pointer",
                      isProjectActive(proj.id)
                        ? "bg-accent text-accent-foreground"
                        : "hover:bg-accent/50"
                    )}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Folder
                          size={12}
                          className={cn(
                            isProjectActive(proj.id) ? "text-foreground" : "text-muted-foreground"
                          )}
                        />
                        <span className="text-sm truncate">
                          <InlineEdit
                            value={proj.name}
                            onSave={(v) => onRenameProject(proj.id, v)}
                          />
                        </span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-[11px] text-muted-foreground">
                          {proj.progress ?? 0}%
                        </span>
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={(e) => { e.stopPropagation(); onDeleteProject(proj.id); }}
                          onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); onDeleteProject(proj.id); } }}
                          className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive cursor-pointer"
                        >
                          <Trash2 size={10} />
                        </div>
                      </div>
                    </div>
                    <Progress
                      value={proj.progress ?? 0}
                      className="mt-1 h-1 bg-muted"
                    />
                  </div>
                ))}

                {addingProject === cat.id ? (
                  <form
                    className="flex items-center gap-1 px-1 py-1"
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (newProjectName.trim()) {
                        onAddProject(cat.id, newProjectName.trim());
                        setAddingProject(null);
                        setNewProjectName("");
                      }
                    }}
                  >
                    <input
                      autoFocus
                      value={newProjectName}
                      onChange={(e) => setNewProjectName(e.target.value)}
                      placeholder="プロジェクト名"
                      className="flex-1 text-sm border border-ring rounded px-1.5 py-0.5 outline-none bg-background"
                      onBlur={() => setAddingProject(null)}
                      onKeyDown={(e) => e.key === "Escape" && setAddingProject(null)}
                    />
                    <button type="submit" className="p-0.5 rounded bg-primary text-primary-foreground">
                      <Check size={12} />
                    </button>
                  </form>
                ) : (
                  <button
                    onClick={() => { setAddingProject(cat.id); setNewProjectName(""); }}
                    className="flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground hover:text-foreground w-full text-left"
                  >
                    <Plus size={11} />
                    プロジェクトを追加
                  </button>
                )}
              </div>
            )}
          </div>
        ))}

        {/* Add category */}
        <div className="px-3 py-2">
          {addingCategory ? (
            <form
              className="flex items-center gap-1"
              onSubmit={(e) => {
                e.preventDefault();
                if (newCategoryName.trim()) {
                  onAddCategory(newCategoryName.trim());
                  setAddingCategory(false);
                  setNewCategoryName("");
                }
              }}
            >
              <input
                autoFocus
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="カテゴリ名"
                className="flex-1 text-sm border border-ring rounded px-1.5 py-0.5 outline-none bg-background"
                onBlur={() => setAddingCategory(false)}
                onKeyDown={(e) => e.key === "Escape" && setAddingCategory(false)}
              />
              <button type="submit" className="p-0.5 rounded bg-primary text-primary-foreground">
                <Check size={12} />
              </button>
            </form>
          ) : (
            <button
              onClick={() => { setAddingCategory(true); setNewCategoryName(""); }}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <Plus size={12} />
              カテゴリを追加
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
