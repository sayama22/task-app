import { NextResponse } from "next/server";
import { store } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId") ?? undefined;
    const filter = searchParams.get("filter") ?? undefined;
    const s = await store();
    return NextResponse.json(await s.getTasks({ projectId, filter }));
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const s = await store();
    const task = await s.createTask({
      projectId: body.projectId ?? null,
      title: body.title,
      type: body.type ?? "task",
      dueDate: body.dueDate ?? null,
      priority: body.priority ?? "medium",
      progress: body.progress ?? 0,
      memo: body.memo ?? null,
      subtasks: body.subtasks ?? [],
      tags: body.tags ?? [],
    });
    return NextResponse.json(task);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
