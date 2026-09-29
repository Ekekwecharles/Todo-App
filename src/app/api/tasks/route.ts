import { NextResponse } from "next/server";
import { authorizeRequest } from "@/lib/access";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  const access = await authorizeRequest();
  if (!access.user) return access.response;

  try {
    const tasks = await prisma.task.findMany({
      where: { userId: access.user.id },
      orderBy: [
        { completed: "asc" },
        { dueDate: "asc" },
        { createdAt: "desc" },
      ],
    });
    return NextResponse.json(tasks);
  } catch {
    return NextResponse.json(
      { error: "Couldn't reach the database. Check your DATABASE_URL." },
      { status: 503 },
    );
  }
}

export async function POST(request: Request) {
  const access = await authorizeRequest();
  if (!access.user) return access.response;

  const body = await request.json().catch(() => null);
  if (
    typeof body?.title !== "string" ||
    !body.title.trim() ||
    body.title.length > 200
  ) {
    return NextResponse.json(
      { error: "Add a task with a title under 200 characters." },
      { status: 400 },
    );
  }

  try {
    const task = await prisma.task.create({
      data: {
        userId: access.user.id,
        title: body.title.trim(),
        category:
          typeof body.category === "string"
            ? body.category.slice(0, 40)
            : "Personal",
        priority: ["low", "medium", "high"].includes(body.priority)
          ? body.priority
          : "medium",
        dueDate:
          typeof body.dueDate === "string" && body.dueDate
            ? new Date(`${body.dueDate}T12:00:00.000Z`)
            : null,
        description:
          typeof body.description === "string"
            ? body.description.slice(0, 2000)
            : "",
      },
    });
    return NextResponse.json(task, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Couldn't save your task. Check your database connection." },
      { status: 503 },
    );
  }
}
