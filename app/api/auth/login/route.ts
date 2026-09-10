import { cookies } from "next/headers";
import { login, SESSION_SECONDS } from "@/lib/server/auth-core";
import { SESSION_COOKIE, cookieOptions } from "@/lib/server/auth";
import { checkOrigin, failure, json, readJson } from "@/lib/server/http";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const result = await login(await readJson(request));
    (await cookies()).set(SESSION_COOKIE, result.token, {
      ...cookieOptions,
      maxAge: SESSION_SECONDS,
    });
    return json({ user: result.user });
  } catch (error) {
    return failure(error);
  }
}
