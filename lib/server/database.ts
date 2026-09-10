import { createClient, type Client } from "@libsql/client";

let client: Client | undefined;
export function getDb(): Client {
  if (client) return client;
  const url = process.env.TURSO_DATABASE_URL;
  if (!url) throw new Error("TURSO_DATABASE_URL precisa ser configurada.");
  if (
    process.env.VERCEL &&
    !url.startsWith("libsql://") &&
    !url.startsWith("https://")
  ) {
    throw new Error("Na Vercel, use um banco remoto libSQL com TLS.");
  }
  if (
    !url.startsWith("file:") &&
    !url.startsWith("libsql://") &&
    !url.startsWith("https://")
  ) {
    throw new Error("Protocolo de banco não permitido.");
  }
  if (!url.startsWith("file:") && !process.env.TURSO_AUTH_TOKEN) {
    throw new Error(
      "TURSO_AUTH_TOKEN precisa ser configurado para o banco remoto.",
    );
  }
  client = createClient({
    url,
    authToken: process.env.TURSO_AUTH_TOKEN || undefined,
    intMode: "number",
  });
  return client;
}
