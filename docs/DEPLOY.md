# Configuração do banco e deploy

## 1. O papel de cada serviço

| Serviço                | O que guarda ou executa                      |
| ---------------------- | -------------------------------------------- |
| GitHub                 | Código, histórico e testes automatizados     |
| Vercel                 | Interface e rotas de servidor do aplicativo  |
| Turso Cloud com libSQL | Usuários, hashes de senha, sessões e tarefas |

SQLite tradicional grava em um arquivo. As funções da Vercel não fornecem um arquivo compartilhado e permanente para esse uso. O aplicativo consulta um banco remoto libSQL usando `@libsql/client`. Localmente, o mesmo cliente usa um arquivo SQLite.

O Turso também oferece um motor chamado Turso Database. **Este projeto foi escrito para libSQL**: ao provisionar, escolha um banco compatível com `@libsql/client`, conforme a documentação do provedor. Não altere o motor sem validar a compatibilidade.

Referências oficiais: [SQLite na Vercel](https://vercel.com/kb/guide/is-sqlite-supported-in-vercel), [SDK do Turso e diferenças entre os clientes](https://docs.turso.tech/sdk/ts/reference).

## 2. Criar o banco remoto

Na sua conta do Turso, crie o banco libSQL do projeto e obtenha a URL e um token com permissão de leitura e escrita para esse banco. A criação também está documentada na [CLI oficial](https://docs.turso.tech/cli/db/create). O comando para gerar token e as opções de validade estão em [db tokens create](https://docs.turso.tech/cli/db/tokens/create).

Guarde URL e token em `.env.local` no seu computador:

```dotenv
TURSO_DATABASE_URL=libsql://URL-DO-SEU-BANCO
TURSO_AUTH_TOKEN=TOKEN-DO-SEU-BANCO
APP_URL=http://localhost:3000
```

Os valores acima são marcadores, não credenciais funcionais. O arquivo `.env.local` e os arquivos do banco são ignorados pelo Git.

Com a configuração apontando para o banco remoto:

```bash
npm ci
npm run db:migrate
npm run user:create
```

Como alternativa na instalação inicial, use o link privado `/configurar` entregue ao proprietário após o deploy. O formulário aplica as migrações e cria a primeira conta com a senha escolhida pelo usuário, sem compartilhar a senha no chat. O link exige chave válida e deixa de funcionar após a configuração.

Esses comandos criam as tabelas e a sua conta **no banco indicado**. Dados do `local.db` não são copiados automaticamente. Não importe banco de testes em produção. Não compartilhe tokens, senhas ou o arquivo `.env.local` no repositório.

## 3. Importar na Vercel

1. Na Vercel, importe `marciotrade78/lista-de-tarefas` como projeto Next.js.
2. Use a raiz do repositório, Node.js 22.x, instalação `npm ci` e build `npm run build`. Deixe o diretório de saída no padrão do Next.js.
3. Defina `TURSO_DATABASE_URL` e `TURSO_AUTH_TOKEN` no ambiente Production.
4. Defina `APP_URL` com a origem HTTPS de produção, sem caminho. Exemplo: `https://seu-projeto.vercel.app`. Use o endereço atribuído ao seu projeto, não o exemplo.
5. Faça o deploy e abra exatamente a origem configurada. Se o endereço definitivo só estiver disponível após o primeiro deploy, atualize `APP_URL` e faça um novo deploy antes de testar o login.
6. Entre com a conta provisionada; crie uma tarefa, recarregue a página, altere seu status e teste a saída da conta.

Não use `file:./local.db` nem `/tmp` para persistência na Vercel. O código rejeita banco local quando detecta a Vercel. As migrações são uma etapa administrativa explícita, não parte do build.

Se adicionar domínio próprio, atualize `APP_URL` para a origem que será utilizada e faça novo deploy. Por segurança, o aplicativo aceita escritas apenas dessa origem; outros aliases não servirão para login ou alterações. Para Preview, use um banco separado e a origem correspondente, sem compartilhar o banco de produção. Não há liberação automática de qualquer domínio `vercel.app`.

Referência: [variáveis de ambiente da Vercel](https://vercel.com/docs/environment-variables).

## 4. Operação

- Para criar outra conta, execute `npm run user:create` com a configuração do banco correto. Cada conta terá sua própria lista.
- Para trocar uma senha, execute `npm run user:reset-password`; as sessões anteriores dessa conta são revogadas.
- Migrações aplicadas têm checksum. Adicione novos arquivos numerados para mudanças futuras; não edite uma migração já aplicada.
- Antes de mudanças de esquema, mantenha backup e confirme as opções de recuperação disponíveis no plano contratado.
- Monitore validade do token e consumo do banco. Ao trocar o token, atualize a variável na Vercel e faça novo deploy. Ao revogar tokens, avalie o impacto nos demais consumidores desse banco.
- A limitação de login desta versão é por e-mail e persiste no banco. Para abrir o serviço a um público amplo, acrescente controles de tráfego no provedor, revisão de segurança e um fluxo de recuperação de conta adequado.

## 5. Custos e pendências

Os preços e limites dos planos podem mudar. Consulte [Turso](https://turso.tech/pricing) e [Vercel](https://vercel.com/pricing) antes de contratar. Este projeto não presume gratuidade ilimitada e não realiza contratação automática.

Antes de disponibilizar o aplicativo: banco remoto provisionado, migração aplicada, conta criada, variáveis configuradas e teste real na URL implantada. A validação local com SQLite não substitui essa verificação no ambiente remoto.
