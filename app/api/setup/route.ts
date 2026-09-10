import { completeSetup } from "@/lib/server/setup";
import { setupAccess } from "@/lib/server/setup-config";
import { checkOrigin, failure, json, readJson } from "@/lib/server/http";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    await completeSetup(await readJson(request), setupAccess);
    return json({ ok: true }, 201);
  } catch (error) {
    return failure(error);
  }
}
