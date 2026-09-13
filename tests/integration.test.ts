import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn, type ChildProcess } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { once } from "node:events";
import { getDb } from "../lib/server/database";
import { migrate } from "../lib/server/migrate";
import { provisionUser } from "../lib/server/users";

const base = "http://localhost:3217";
const password = "integration-only-password-123";
let directory: string;
let server: ChildProcess;
let cookie: string;
let taskId: string;
const input = {
  title: "Organizar compromissos",
  description: "Teste de ponta a ponta da API",
  category: "Pessoal",
  priority: "medium",
  status: "pending",
  dueDate: "2028-01-20",
};
async function request(
  path: string,
  method = "GET",
  data?: unknown,
  custom: Record<string, string> = {},
) {
  return fetch(`${base}${path}`, {
    method,
    redirect: "manual",
    signal: AbortSignal.timeout(15000),
    headers: {
      origin: base,
      "content-type": "application/json",
      ...(cookie ? { cookie } : {}),
      ...custom,
    },
    ...(data !== undefined ? { body: JSON.stringify(data) } : {}),
  });
}
before(async () => {
  directory = await mkdtemp(join(tmpdir(), "tarefas-http-"));
  process.env.TURSO_DATABASE_URL = `file:${join(directory, "test.db")}`;
  delete process.env.VERCEL;
  await migrate();
  await provisionUser({
    name: "Teste",
    email: "integration@example.test",
    password,
  });
  server = spawn(
    process.execPath,
    [
      "node_modules/next/dist/bin/next",
      "start",
      "-p",
      "3217",
      "-H",
      "localhost",
    ],
    {
      env: {
        ...process.env,
        NODE_ENV: "production",
        APP_URL: base,
        NEXT_TELEMETRY_DISABLED: "1",
      },
      stdio: ["ignore", "ignore", "inherit"],
    },
  );
  let ready = false;
  for (let attempt = 0; attempt < 30; attempt++) {
    if (server.exitCode !== null || server.signalCode !== null)
      throw new Error("Servidor encerrou antes de iniciar.");
    try {
      if (
        (await fetch(`${base}/login`, { signal: AbortSignal.timeout(1000) }))
          .status === 200
      ) {
        ready = true;
        break;
      }
    } catch {
      /* Wait until the server is listening. */
    }
    await delay(200);
  }
  assert.ok(ready, "Servidor precisa iniciar.");
});
after(async () => {
  if (server && server.exitCode === null && server.signalCode === null) {
    const stopped = once(server, "exit");
    server.kill("SIGTERM");
    await stopped;
  }
  getDb().close();
  // Release native SQLite statement handles before deleting files on Windows.
  global.gc?.();
  if (directory)
    await rm(directory, {
      recursive: true,
      force: true,
      maxRetries: 3,
      retryDelay: 100,
    });
});
test("private pages and API reject anonymous access", async () => {
  const home = await request("/");
  // Next.js may send the redirect as a meta refresh after the loading boundary starts streaming.
  if (home.status === 307) assert.equal(home.headers.get("location"), "/login");
  else {
    assert.equal(home.status, 200);
    assert.match(await home.text(), /http-equiv="refresh"[^>]*url=\/login/);
  }
  assert.equal((await request("/api/tasks")).status, 401);
  const page = await request("/login");
  assert.match(await page.text(), /Seu dia começa aqui/);
  assert.equal(page.headers.get("x-frame-options"), "DENY");
});
test("login rejects cross-origin requests and creates a secure cookie without returning the token", async () => {
  assert.equal(
    (
      await request(
        "/api/auth/login",
        "POST",
        { email: "integration@example.test", password },
        { origin: "https://attacker.example" },
      )
    ).status,
    403,
  );
  const response = await request("/api/auth/login", "POST", {
    email: "integration@example.test",
    password,
  });
  assert.equal(response.status, 200);
  const header = response.headers.get("set-cookie")!;
  assert.match(header, /HttpOnly/i);
  assert.match(header, /Secure/i);
  assert.match(header, /SameSite=lax/i);
  assert.match(header, /__Host-tarefas-session/);
  cookie = header.split(";")[0];
  const body = await response.json();
  assert.equal(body.token, undefined);
  assert.equal(body.user.email, "integration@example.test");
});
test("authenticated task creation, reload, update and conflicts work over HTTP", async () => {
  assert.equal((await request("/")).status, 200);
  const created = await request("/api/tasks", "POST", input);
  assert.equal(created.status, 201);
  taskId = (await created.json()).task.id;
  const list = await request("/api/tasks");
  assert.equal(list.headers.get("cache-control"), "no-store");
  assert.equal((await list.json()).tasks[0].title, input.title);
  const updated = await request(`/api/tasks/${taskId}`, "PUT", {
    ...input,
    status: "completed",
    version: 0,
  });
  assert.equal(updated.status, 200);
  assert.equal((await updated.json()).task.status, "completed");
  assert.equal(
    (await request(`/api/tasks/${taskId}`, "PUT", { ...input, version: 0 }))
      .status,
    409,
  );
});
test("mutation guards reject invalid input, foreign origins, and oversized bodies", async () => {
  assert.equal(
    (await request("/api/tasks", "POST", { ...input, title: " " })).status,
    400,
  );
  assert.equal(
    (
      await request("/api/tasks", "POST", input, {
        origin: "https://attacker.example",
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await request("/api/tasks", "POST", {
        ...input,
        description: "x".repeat(26000),
      })
    ).status,
    413,
  );
  assert.equal(
    (
      await request("/api/tasks", "POST", input, {
        "content-type": "text/plain",
      })
    ).status,
    415,
  );
});
test("delete persists and logout revokes access", async () => {
  assert.equal(
    (await request(`/api/tasks/${taskId}`, "DELETE", { version: 1 })).status,
    200,
  );
  assert.deepEqual((await (await request("/api/tasks")).json()).tasks, []);
  assert.equal((await request("/api/auth/logout", "POST")).status, 200);
  assert.equal((await request("/api/tasks")).status, 401);
});
