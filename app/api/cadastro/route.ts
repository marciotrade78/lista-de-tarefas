import { registerWithInvite } from "@/lib/server/invite";
import { checkOrigin, failure, json, readJson } from "@/lib/server/http";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    await registerWithInvite(await readJson(request));
    return json({ ok: true }, 201);
  } catch (error) {
    return failure(error);
  }
}
