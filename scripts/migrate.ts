import "./env";
import { migrate } from "../lib/server/migrate";
import { getDb } from "../lib/server/database";
try {
  const applied = await migrate();
  console.log(
    applied.length
      ? `Migrações aplicadas: ${applied.join(", ")}`
      : "Banco atualizado. Nenhuma migração pendente.",
  );
  getDb().close();
} catch {
  console.error(
    "Não foi possível migrar o banco. Confira as variáveis, o acesso ao banco e os arquivos de migração.",
  );
  process.exitCode = 1;
}
