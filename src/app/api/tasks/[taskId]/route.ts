import { NextResponse } from "next/server";
import { authorizeRequest } from "@/lib/access";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ taskId: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const access = await authorizeRequest();
  if (!access.user) return access.response;

  const body = await request.json().catch(() => null);
  const data: {
    title?: string;
    category?: string;
    priority?: string;
    dueDate?: Date | null;
    description?: string;
    completed?: boolean;
  } = {};

  if (
    typeof body?.title === "string" &&
    body.title.trim() &&
    body.title.length <= 200
  )
    data.title = body.title.trim();
  if (typeof body?.category === "string")
    data.category = body.category.slice(0, 40);
  if (["low", "medium", "high"].includes(body?.priority))
    data.priority = body.priority;
  if (typeof body?.dueDate === "string")
    data.dueDate = body.dueDate
      ? new Date(`${body.dueDate}T12:00:00.000Z`)
      : null;
  if (typeof body?.description === "string")
    data.description = body.description.slice(0, 2000);
  if (typeof body?.completed === "boolean") data.completed = body.completed;

  try {
    const { taskId } = await context.params;
    const result = await prisma.task.updateMany({
      where: { id: taskId, userId: access.user.id },
      data,
    });
    if (result.count === 0) {
      return NextResponse.json({ error: "Task not found." }, { status: 404 });
    }
    const task = await prisma.task.findFirst({
      where: { id: taskId, userId: access.user.id },
    });
    return NextResponse.json(task);
  } catch {
    return NextResponse.json(
      { error: "Couldn't update this task." },
      { status: 404 },
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const access = await authorizeRequest();
  if (!access.user) return access.response;

  try {
    const { taskId } = await context.params;
    const result = await prisma.task.deleteMany({
      where: { id: taskId, userId: access.user.id },
    });
    if (result.count === 0) {
      return NextResponse.json({ error: "Task not found." }, { status: 404 });
    }
    return NextResponse.json({ deleted: true });
  } catch {
    return NextResponse.json(
      { error: "Couldn't delete this task." },
      { status: 404 },
    );
  }
}
