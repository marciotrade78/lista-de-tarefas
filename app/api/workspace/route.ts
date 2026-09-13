import { requireUser } from "@/lib/server/auth";
import { getWorkspace, addCategory, saveProfile } from "@/lib/server/workspace";
import { checkOrigin, failure, json, readJson } from "@/lib/server/http";
export const runtime = "nodejs";
export async function GET() {
  try {
    return json(await getWorkspace((await requireUser()).id));
  } catch (e) {
    return failure(e);
  }
}
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    return json(
      {
        name: await addCategory(
          (await requireUser()).id,
          await readJson(request),
        ),
      },
      201,
    );
  } catch (e) {
    return failure(e);
  }
}
export async function PUT(request: Request) {
  try {
    checkOrigin(request);
    return json({
      user: await saveProfile(
        (await requireUser()).id,
        await readJson(request),
      ),
    });
  } catch (e) {
    return failure(e);
  }
}
