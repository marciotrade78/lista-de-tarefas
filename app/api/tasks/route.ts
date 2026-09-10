import { requireUser } from "@/lib/server/auth";
import { listTasks, createTask } from "@/lib/server/tasks";
import { checkOrigin, failure, json, readJson } from "@/lib/server/http";
export const runtime = "nodejs";
export async function GET() {
  try {
    return json({ tasks: await listTasks((await requireUser()).id) });
  } catch (error) {
    return failure(error);
  }
}
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const user = await requireUser();
    return json(
      { task: await createTask(user.id, await readJson(request)) },
      201,
    );
  } catch (error) {
    return failure(error);
  }
}
