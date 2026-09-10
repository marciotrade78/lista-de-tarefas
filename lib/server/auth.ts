import "server-only";
import { cookies } from "next/headers";
import { sessionUser } from "./auth-core";
import { HttpError } from "./errors";

export const SESSION_COOKIE =
  process.env.NODE_ENV === "production"
    ? "__Host-tarefas-session"
    : "tarefas-session";
export const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};
export async function currentUser() {
  return sessionUser((await cookies()).get(SESSION_COOKIE)?.value);
}
export async function requireUser() {
  const user = await currentUser();
  if (!user) throw new HttpError(401, "Sua sessão terminou. Entre novamente.");
  return user;
}
