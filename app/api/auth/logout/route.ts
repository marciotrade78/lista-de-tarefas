import { cookies } from "next/headers";
import { revokeSession } from "@/lib/server/auth-core";
import { SESSION_COOKIE, cookieOptions } from "@/lib/server/auth";
import { checkOrigin, failure, json } from "@/lib/server/http";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const jar = await cookies();
    await revokeSession(jar.get(SESSION_COOKIE)?.value);
    jar.set(SESSION_COOKIE, "", { ...cookieOptions, maxAge: 0 });
    return json({ ok: true });
  } catch (error) {
    return failure(error);
  }
}
