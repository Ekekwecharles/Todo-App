import { NextResponse } from "next/server";
import { isAuthorized } from "@/lib/access";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  if (!(await isAuthorized()))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const notes = await prisma.note.findMany({
      orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }],
    });
    return NextResponse.json(notes);
  } catch {
    return NextResponse.json(
      { error: "Couldn't reach the database. Check your DATABASE_URL." },
      { status: 503 },
    );
  }
}

export async function POST(request: Request) {
  if (!(await isAuthorized()))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
      { error: "Couldn't save your note. Check your database connection." },
      { status: 503 },
    );
  }
}
