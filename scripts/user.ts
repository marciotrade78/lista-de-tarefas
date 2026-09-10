import "./env";
import { createInterface } from "node:readline/promises";
import { Writable } from "node:stream";
import { ZodError } from "zod";
import { provisionUser, resetPassword } from "../lib/server/users";
import { getDb } from "../lib/server/database";
import { HttpError } from "../lib/server/errors";

if (!process.stdin.isTTY) {
  console.error(
    "Execute este comando em um terminal interativo. A senha será solicitada sem eco e não deve ser passada como argumento.",
  );
  process.exit(1);
}
let muted = false;
const output = new Writable({
  write(chunk, _encoding, callback) {
    if (!muted) process.stdout.write(chunk);
    callback();
  },
});
const terminal = createInterface({
  input: process.stdin,
  output,
  terminal: true,
});
terminal.on("SIGINT", () => {
  process.stdout.write("\nOperação cancelada.\n");
  terminal.close();
  process.exit(130);
});
async function hidden(question: string) {
  process.stdout.write(question);
  muted = true;
  try {
    return await terminal.question("");
  } finally {
    muted = false;
    process.stdout.write("\n");
  }
}
try {
  const action = process.argv[2];
  if (action !== "create" && action !== "reset")
    throw new Error("Comando inválido.");
  const email = (await terminal.question("E-mail: ")).trim();
  const name =
    action === "create" ? (await terminal.question("Nome: ")).trim() : "";
  const password = await hidden("Senha (12 a 128 caracteres): ");
  if (password !== (await hidden("Repita a senha: ")))
    throw new HttpError(400, "As senhas não coincidem.");
  if (action === "create") {
    await provisionUser({ email, name, password });
    console.log(
      "Conta criada. Entre no aplicativo com o e-mail e a senha informados.",
    );
  } else {
    if (
      (await terminal.question(
        "Todas as sessões desta conta serão encerradas. Digite REDEFINIR: ",
      )) !== "REDEFINIR"
    )
      throw new HttpError(400, "Operação cancelada.");
    await resetPassword(email, password);
    console.log("Senha redefinida e sessões anteriores encerradas.");
  }
} catch (error) {
  console.error(
    error instanceof ZodError
      ? error.issues[0].message
      : error instanceof HttpError
        ? error.message
        : "Não foi possível concluir. Confira a configuração e execute npm run db:migrate antes de criar a conta.",
  );
  process.exitCode = 1;
} finally {
  terminal.close();
  try {
    getDb().close();
  } catch {
    /* Configuration may be missing. */
  }
}
