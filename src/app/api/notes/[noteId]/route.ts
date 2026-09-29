import { NextResponse } from "next/server";
import { isAuthorized } from "@/lib/access";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ noteId: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  if (!(await isAuthorized()))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const data: {
    title?: string;
    content?: string;
    color?: string;
    pinned?: boolean;
  } = {};
  if (
    typeof body?.title === "string" &&
    body.title.trim() &&
    body.title.length <= 120
  )
    data.title = body.title.trim();
  if (typeof body?.content === "string")
    data.content = body.content.slice(0, 5000);
  if (["butter", "sage", "rose", "lavender", "sky"].includes(body?.color))
    data.color = body.color;
  if (typeof body?.pinned === "boolean") data.pinned = body.pinned;

  try {
    const { noteId } = await context.params;
    const note = await prisma.note.update({ where: { id: noteId }, data });
    return NextResponse.json(note);
  } catch {
    return NextResponse.json(
      { error: "Couldn't update this note." },
      { status: 404 },
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  if (!(await isAuthorized()))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { noteId } = await context.params;
    await prisma.note.delete({ where: { id: noteId } });
    return NextResponse.json({ deleted: true });
  } catch {
    return NextResponse.json(
      { error: "Couldn't delete this note." },
      { status: 404 },
    );
  }
}
