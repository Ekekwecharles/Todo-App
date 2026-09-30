import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import type { User } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const COOKIE_NAME = "daybook_session";
const SESSION_DURATION = 60 * 60 * 24 * 30;
const scryptAsync = promisify(scrypt);
export const DATABASE_UNAVAILABLE_MESSAGE =
  "Daybook is having trouble connecting right now. Please try again in a moment.";

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${salt}:${hash.toString("hex")}`;
}

export async function verifyPassword(password: string, passwordHash: string) {
  const [salt, storedHex] = passwordHash.split(":");
  if (!salt || !storedHex) return false;

  const stored = Buffer.from(storedHex, "hex");
  const supplied = (await scryptAsync(password, salt, stored.length)) as Buffer;
  return stored.length === supplied.length && timingSafeEqual(stored, supplied);
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DURATION * 1000);

  await prisma.session.create({
    data: { tokenHash: hashToken(token), userId, expiresAt },
  });

  (await cookies()).set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DURATION,
  });
}

export async function getCurrentUser(): Promise<User | null> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });
  if (!session) return null;

  if (session.expiresAt <= new Date()) {
    await prisma.session.delete({ where: { id: session.id } });
    return null;
  }

  return session.user;
}

export async function authorizeRequest(): Promise<
  { user: User; response: null } | { user: null; response: NextResponse }
> {
  try {
    const user = await getCurrentUser();
    return user
      ? { user, response: null }
      : {
          user: null,
          response: NextResponse.json(
            { error: "Sign in to continue." },
            { status: 401 },
          ),
        };
  } catch {
    return {
      user: null,
      response: NextResponse.json(
        { error: DATABASE_UNAVAILABLE_MESSAGE },
        { status: 503 },
      ),
    };
  }
}

export async function clearSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  cookieStore.delete(COOKIE_NAME);
  if (token) {
    await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  }
}
