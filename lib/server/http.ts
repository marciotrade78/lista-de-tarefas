import "server-only";
import { ZodError } from "zod";
import { HttpError } from "./errors";

export function json(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}
export function failure(error: unknown) {
  if (error instanceof HttpError)
    return json({ error: error.message }, error.status);
  if (error instanceof ZodError)
    return json({ error: error.issues[0]?.message ?? "Dados inválidos." }, 400);
  // Do not expose database URLs, tokens, query arguments, or stack traces.
  console.error("Falha interna ao processar solicitação.");
  return json(
    { error: "Não foi possível concluir agora. Tente novamente em instantes." },
    500,
  );
}
export function checkOrigin(request: Request) {
  const expected =
    process.env.APP_URL ||
    (process.env.NODE_ENV !== "production" ? "http://localhost:3000" : "");
  if (!expected)
    throw new HttpError(503, "Aplicativo aguardando configuração.");
  let origin: string;
  try {
    origin = new URL(expected).origin;
  } catch {
    throw new HttpError(503, "Aplicativo aguardando configuração.");
  }
  if (process.env.VERCEL && !origin.startsWith("https://"))
    throw new HttpError(503, "Aplicativo aguardando configuração.");
  if (
    request.headers.get("origin") !== origin ||
    request.headers.get("sec-fetch-site") === "cross-site"
  ) {
    throw new HttpError(403, "Origem da solicitação não permitida.");
  }
}
export async function readJson(request: Request): Promise<unknown> {
  if (
    request.headers.get("content-type")?.split(";")[0].trim() !==
    "application/json"
  )
    throw new HttpError(415, "Formato de solicitação inválido.");
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, "Dados ausentes.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 24 * 1024) {
        await reader.cancel();
        throw new HttpError(413, "Solicitação muito grande.");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new HttpError(400, "Dados inválidos.");
  }
}
