import { requireUser } from "@/lib/server/auth";
import { updateTask, deleteTask } from "@/lib/server/tasks";
import { checkOrigin, failure, json, readJson } from "@/lib/server/http";
export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };
export async function PUT(request: Request, context: Context) {
  try {
    checkOrigin(request);
    const user = await requireUser();
    return json({
      task: await updateTask(
        user.id,
        (await context.params).id,
        await readJson(request),
      ),
    });
  } catch (error) {
    return failure(error);
  }
}
export async function DELETE(request: Request, context: Context) {
  try {
    checkOrigin(request);
    const user = await requireUser();
    await deleteTask(
      user.id,
      (await context.params).id,
      await readJson(request),
    );
    return json({ ok: true });
  } catch (error) {
    return failure(error);
  }
}
