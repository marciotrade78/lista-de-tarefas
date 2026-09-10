import "./env";
import { createInvite, revokeInvite } from "../lib/server/invite";
import { getDb } from "../lib/server/database";

try {
  const action = process.argv[2];
  if (action !== "create" && action !== "revoke")
    throw new Error("Comando inválido. Use create ou revoke.");
  if (action === "create") {
    const token = await createInvite();
    const base = (process.env.APP_URL || "http://localhost:3000").replace(
      /\/$/,
      "",
    );
    console.log("Convite criado. Compartilhe este link com quem você quiser:");
    console.log(`${base}/cadastro#convite=${token}`);
    console.log(
      "Qualquer link de convite anterior parou de funcionar. Para desativar este, execute npm run invite:revoke.",
    );
  } else {
    await revokeInvite();
    console.log("Convite desativado. Ninguém mais consegue se cadastrar com o link antigo.");
  }
} catch (error) {
  console.error(
    error instanceof Error
      ? error.message
      : "Não foi possível concluir. Confira a configuração e execute npm run db:migrate primeiro.",
  );
  process.exitCode = 1;
} finally {
  try {
    getDb().close();
  } catch {
    /* Configuration may be missing. */
  }
}
