# Autenticação e autorização

## Componentes

| Componente                    | Função                                                          |
| ----------------------------- | --------------------------------------------------------------- |
| `components/login-form.tsx`   | Coleta e-mail/senha e envia JSON ao servidor                    |
| `app/api/auth/login/route.ts` | Verifica origem, autentica e define o cookie                    |
| `lib/server/auth-core.ts`     | Limita tentativas, verifica senha, cria/consulta/revoga sessões |
| `lib/server/password.ts`      | Deriva e compara hashes de senha com scrypt                     |
| `lib/server/auth.ts`          | Lê cookie HttpOnly e exige usuário válido                       |
| `lib/server/http.ts`          | Verifica origem exata, tipo e tamanho do corpo; normaliza erros |
| `lib/server/tasks.ts`         | Restringe consultas e alterações ao ID autenticado              |
| `scripts/user.ts`             | Provisiona contas e redefine senhas de forma administrativa     |

## Fluxo de requisição

1. A página `/` consulta a sessão no servidor. Sem sessão válida, redireciona para `/login`.
2. O formulário envia `POST /api/auth/login` com e-mail e senha. `APP_URL` determina a única origem aceita para operações de escrita. Ausência de `Origin`, origem diferente ou `Sec-Fetch-Site: cross-site` resulta em rejeição.
3. Um contador atômico em `login_limits` permite até cinco tentativas por e-mail numa janela de quinze minutos, compartilhada entre instâncias. O endereço é normalizado, e a chave do contador guarda seu SHA-256.
4. A senha é comparada com o hash armazenado. Contas inexistentes executam a mesma derivação de senha; o erro de credenciais é genérico.
5. No sucesso, o servidor gera 32 bytes aleatórios e envia o token em cookie. Guarda apenas o SHA-256 do token, o ID do usuário e a expiração em `sessions`.
6. Nas requisições seguintes, o navegador envia o cookie automaticamente. O servidor calcula o hash e procura uma sessão ainda válida. Toda rota de tarefas exige essa verificação, inclusive leitura.
7. O servidor determina o proprietário pela sessão. Nenhum ID de usuário recebido no corpo é aceito. Consultas usam parâmetros, e alterações/exclusões exigem `id` da tarefa **e** `user_id` da sessão.
8. `POST /api/auth/logout` remove a sessão do banco e expira o cookie. A redefinição administrativa de senha revoga todas as sessões daquela conta.

## Credenciais e tokens

| Informação                  | Armazenamento e tratamento                                                                                               |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Senha                       | scrypt com salt aleatório de 16 bytes, N=131072, r=8, p=1, saída de 64 bytes; comparação em tempo constante              |
| Token de sessão             | 32 bytes aleatórios, codificados em base64url; somente o hash SHA-256 fica no banco                                      |
| Cookie                      | `HttpOnly`, `SameSite=Lax`, caminho `/`, validade fixa de 7 dias; `Secure` e prefixo `__Host-` em produção, sem `Domain` |
| Token do Turso              | `TURSO_AUTH_TOKEN`, consumido exclusivamente por código de servidor; nunca retornado pela API                            |
| Dados de usuário no cliente | ID, nome e e-mail; nunca hash da senha nem token de sessão                                                               |

Não há JWT de sessão, refresh token nem token persistido em `localStorage`. A sessão não é renovada por atividade: após sete dias, é necessário entrar novamente. Os cookies de desenvolvimento não usam `Secure`, para permitir localhost por HTTP. Produção exige HTTPS no navegador.

As APIs retornam `Cache-Control: no-store`. Corpo JSON limitado a 24 KiB e validação com Zod. Erros internos não retornam SQL, URLs de conexão, argumentos de consultas ou stacks. Cabeçalhos bloqueiam enquadramento da página, sniffing de conteúdo e uso de câmera/microfone/geolocalização. A política CSP é parcial, não uma política rigorosa de scripts com nonce.

## Concorrência e limites

As tarefas têm `version`. Atualização e exclusão usam essa versão no `WHERE`; uma edição desatualizada retorna 409 em vez de substituir dados de outra janela. O usuário deve fechar o formulário, atualizar a lista e refazer a alteração.

O limite de login é por e-mail; não é um serviço global de prevenção de abuso nem limitação por IP. Contas são criadas administrativamente. Não há verificação de e-mail, MFA, recuperação por e-mail ou cadastro público. Esta versão atende uso privado; exposição pública em escala requer uma revisão específica desses controles.

Testes: `tests/core.test.ts` cobre hashes, tokens, expiração, revogação, limite de tentativas, isolamento e conflitos. `tests/integration.test.ts` cobre cookies, origem, APIs privadas e operações HTTP.
