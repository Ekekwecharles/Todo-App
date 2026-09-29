import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "daybook_access";

function sessionToken(password: string) {
  return createHmac("sha256", password).update("daybook-session").digest("hex");
}

export async function isAuthorized() {
  const password = process.env.APP_PASSWORD;
  if (!password) return true;

  const cookie = (await cookies()).get(COOKIE_NAME)?.value;
  if (!cookie) return false;

  const expected = Buffer.from(sessionToken(password));
  const supplied = Buffer.from(cookie);
  return (
    supplied.length === expected.length && timingSafeEqual(supplied, expected)
  );
}

export async function setAccessCookie() {
  const password = process.env.APP_PASSWORD;
  if (!password) return;

  (await cookies()).set(COOKIE_NAME, sessionToken(password), {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearAccessCookie() {
  (await cookies()).delete(COOKIE_NAME);
}
