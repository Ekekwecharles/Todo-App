import { NextResponse } from "next/server";
import {
  authorizeRequest,
  DATABASE_UNAVAILABLE_MESSAGE,
} from "@/lib/access";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  const access = await authorizeRequest();
  if (!access.user) return access.response;

  try {
    const notes = await prisma.note.findMany({
      where: { userId: access.user.id },
      orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }],
    });
    return NextResponse.json(notes);
  } catch {
    return NextResponse.json(
      { error: DATABASE_UNAVAILABLE_MESSAGE },
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
    body.title.length > 120
  ) {
    return NextResponse.json(
      { error: "Give your note a title under 120 characters." },
      { status: 400 },
    );
  }

  try {
    const note = await prisma.note.create({
      data: {
        userId: access.user.id,
        title: body.title.trim(),
        content:
          typeof body.content === "string" ? body.content.slice(0, 5000) : "",
        color: ["butter", "sage", "rose", "lavender", "sky"].includes(
          body.color,
        )
          ? body.color
          : "butter",
      },
    });
    return NextResponse.json(note, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: DATABASE_UNAVAILABLE_MESSAGE },
      { status: 503 },
    );
  }
}
