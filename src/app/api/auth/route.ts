import { NextResponse } from "next/server";
import { clearAccessCookie, isAuthorized, setAccessCookie } from "@/lib/access";

export async function GET() {
  return NextResponse.json({
    protected: Boolean(process.env.APP_PASSWORD),
    authenticated: await isAuthorized(),
  });
}

export async function POST(request: Request) {
  const password = process.env.APP_PASSWORD;
  if (!password) return NextResponse.json({ authenticated: true });

  const body = await request.json().catch(() => null);
  if (typeof body?.password !== "string" || body.password !== password) {
    return NextResponse.json(
      { error: "That password doesn't match." },
      { status: 401 },
    );
  }

  await setAccessCookie();
  return NextResponse.json({ authenticated: true });
}

export async function DELETE() {
  await clearAccessCookie();
  return NextResponse.json({ authenticated: false });
}
