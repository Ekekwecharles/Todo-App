import { NextResponse } from "next/server";
import {
  clearSession,
  createSession,
  getCurrentUser,
  hashPassword,
  verifyPassword,
} from "@/lib/access";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  try {
    const user = await getCurrentUser();
    return NextResponse.json({
      authenticated: Boolean(user),
      email: user?.email ?? null,
    });
  } catch {
    return NextResponse.json(
      { error: "Couldn't reach the database. Check your DATABASE_URL." },
      { status: 503 },
    );
  }
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const email =
    typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return NextResponse.json(
      { error: "Enter a valid email address." },
      { status: 400 },
    );
  }
  if (
    password.length > 128 ||
    (body.mode === "register" && password.length < 4)
  ) {
    return NextResponse.json(
      { error: "Use a password between 4 and 128 characters." },
      { status: 400 },
    );
  }

  try {
    let user;

    if (body.mode === "register") {
      try {
        user = await prisma.$transaction(async (transaction) => {
          const isFirstAccount = (await transaction.user.count()) === 0;
          const created = await transaction.user.create({
            data: { email, passwordHash: await hashPassword(password) },
          });

          if (isFirstAccount) {
            await transaction.task.updateMany({
              where: { userId: null },
              data: { userId: created.id },
            });
            await transaction.note.updateMany({
              where: { userId: null },
              data: { userId: created.id },
            });
          }

          return created;
        });
      } catch (error) {
        if (
          typeof error === "object" &&
          error !== null &&
          "code" in error &&
          error.code === "P2002"
        ) {
          return NextResponse.json(
            { error: "An account with that email already exists." },
            { status: 409 },
          );
        }
        throw error;
      }
    } else if (body.mode === "login") {
      const existing = await prisma.user.findUnique({ where: { email } });
      if (
        !existing ||
        !(await verifyPassword(password, existing.passwordHash))
      ) {
        return NextResponse.json(
          { error: "That email and password don't match." },
          { status: 401 },
        );
      }
      user = existing;
    } else {
      return NextResponse.json(
        { error: "Choose sign in or create account." },
        { status: 400 },
      );
    }

    await createSession(user.id);
    return NextResponse.json({ authenticated: true, email: user.email });
  } catch {
    return NextResponse.json(
      { error: "Couldn't reach the database. Check your DATABASE_URL." },
      { status: 503 },
    );
  }
}

export async function DELETE() {
  await clearSession().catch(() => undefined);
  return NextResponse.json({ authenticated: false });
}
