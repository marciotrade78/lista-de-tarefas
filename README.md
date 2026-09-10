# Em dia · Lista de tarefas

Aplicativo pessoal em português para organizar tarefas e compromissos. Código preparado para Next.js na Vercel e banco remoto **libSQL no Turso Cloud**. Também funciona com arquivo SQLite no desenvolvimento local.

## Funcionalidades

- Login por e-mail e senha, com contas provisionadas pelo responsável pelo aplicativo.
- Criar, editar, concluir, reabrir e excluir tarefas com confirmação.
- Título, descrição, categoria, prioridade, status e prazo opcional.
- Visões Minhas tarefas, Meu dia, Próximos dias, Concluídas e Atrasadas.
- Categorias Pessoal, Trabalho, Família e Estudos.
- Busca no título e na descrição; filtros de status e prioridade; ordenação por prazo, prioridade ou criação.
- Indicadores calculados com os dados da conta e paginação visual de 20 itens.
- Interface responsiva em modo claro; navegação por teclado e formulários com rótulos.
- Persistência no banco, isolamento entre usuários e controle de conflitos de edição.

Minhas tarefas mostra itens ainda abertos. Meu dia mostra tarefas abertas com prazo no dia corrente; Próximos dias mostra todos os prazos futuros. Datas são dias de calendário, sem horário, interpretados no fuso do dispositivo. Os contadores do resumo consideram todas as tarefas da conta, independentemente do filtro atual.

## Executar localmente

Requisitos: Node.js 22 ou 24 e npm. Não é necessário criar uma conta Turso para testar localmente.

```bash
git clone https://github.com/marciotrade78/lista-de-tarefas.git
cd lista-de-tarefas
npm ci
```

Copie `.env.example` para `.env.local`. No PowerShell:

```powershell
Copy-Item .env.example .env.local
```

No macOS/Linux:

```bash
cp .env.example .env.local
```

Mantenha `TURSO_DATABASE_URL=file:./local.db` e `APP_URL=http://localhost:3000`. Depois:

```bash
npm run db:migrate
npm run user:create
npm run dev
```

Abra [localhost:3000](http://localhost:3000) e entre com a conta criada. O comando de criação solicita e-mail, nome e senha no terminal. A senha não aparece enquanto é digitada. Não existe conta ou senha padrão, nem cadastro público. A instalação inicial também pode ser concluída pelo link privado de configuração, conforme descrito abaixo.

Para redefinir uma senha e encerrar todas as sessões da conta:

```bash
npm run user:reset-password
```

Os scripts administrativos carregam `.env.local` e `.env`, respeitando variáveis já definidas no processo. Execute-os somente com acesso confiável ao banco correto.

## Preparar o Turso e a Vercel

Veja o passo a passo em [docs/DEPLOY.md](docs/DEPLOY.md). As três variáveis são:

| Variável             | Uso                                                               |
| -------------------- | ----------------------------------------------------------------- |
| `TURSO_DATABASE_URL` | URL do banco libSQL remoto; `file:` apenas fora da Vercel         |
| `TURSO_AUTH_TOKEN`   | Token de acesso ao banco, exclusivo do servidor                   |
| `APP_URL`            | Origem exata do aplicativo, como `https://seu-projeto.vercel.app` |

O build não conecta ao banco e não executa migrações. Aplique as migrações e crie a conta antes de utilizar a instalação. Na Vercel, URLs locais de banco são rejeitadas para evitar perda de dados. Nunca coloque tokens em variáveis `NEXT_PUBLIC_*`.

## Validação

```bash
npm run typecheck
npm test
npm run build
npm run test:integration
```

Os testes de integração precisam do build e iniciam temporariamente o servidor de produção na porta 3217. Utilizam banco SQLite temporário, sem acessar o banco real. Os testes verificam autenticação, expiração/revogação, limite de tentativas, isolamento entre usuários, conflitos de edição, validação de datas, consultas parametrizadas e fluxos HTTP. O workflow em `.github/workflows/ci.yml` executa essa sequência no GitHub Actions.

## Estrutura

| Caminho                   | Responsabilidade                                    |
| ------------------------- | --------------------------------------------------- |
| `app/`                    | Páginas, estilos e rotas HTTP                       |
| `components/`             | Painel, login e diálogos                            |
| `lib/server/auth-core.ts` | Login, sessões e limite de tentativas               |
| `lib/server/auth.ts`      | Cookie e autorização nas rotas Next.js              |
| `lib/server/tasks.ts`     | Persistência das tarefas e checagem de proprietário |
| `lib/server/database.ts`  | Conexão SQLite/libSQL                               |
| `migrations/`             | Esquema versionado                                  |
| `scripts/`                | Migração, criação de conta e redefinição de senha   |
| `tests/`                  | Testes de banco e API                               |

Detalhes de credenciais e fluxo de requisição: [docs/AUTHENTICATION.md](docs/AUTHENTICATION.md).

## Escopo desta versão

Aplicativo privado, com criação de contas pelo terminal. Não inclui cadastro público, envio de e-mails, recuperação automática de senha, login social, MFA, notificações, recorrência, colaboração entre contas ou sincronização offline. Todas as tarefas da conta são carregadas para busca e filtros locais; a paginação é visual, não uma paginação de banco para grandes volumes. Atualize a lista para buscar alterações feitas em outro dispositivo. A interface foi escrita para celular e computador; o workflow cobre lógica e HTTP, não inspeção visual no navegador.

O código não cria automaticamente contas Turso/Vercel, recursos pagos, banco remoto ou implantação. Esses recursos serão configurados na etapa de deploy.

## Configuração inicial pelo navegador

A página `/configurar` permite ao proprietário criar a primeira conta com um link privado de uso único. Uma chave aleatória de 256 bits é enviada no fragmento do link e mantida apenas em memória no navegador; o repositório guarda somente seu SHA-256 e a validade de 48 horas em `lib/server/setup-config.ts`. A API valida a chave e a origem antes de aplicar as migrações e criar a conta. A chave nunca deve ser adicionada ao repositório. Após a criação, um bloqueio persistente em `app_setup` impede nova configuração, mesmo que as contas sejam removidas. Instalações com usuários existentes também bloqueiam esse fluxo. A autenticação normal continua em `/login`; contas adicionais continuam sendo criadas pelo administrador. Novas instalações independentes precisam de uma nova chave privada e seu hash, não do link de outra instalação.
