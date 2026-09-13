# TarefasPro

A interface usa a lista da segunda referência visual e as telas de início, calendário, estatísticas, categorias e configurações da primeira. No desktop há navegação lateral e tabela; no celular, cartões e navegação inferior.

## Funcionalidades

- Tarefas: filtros Todas/Hoje/Pendentes/Concluídas, busca, ordenação, criação, edição e exclusão confirmada.
- Detalhes: horário, subtarefas, estimativa em minutos, lembrete interno e repetição diária/semanal/mensal.
- Recorrência: concluir cria a próxima ocorrência na mesma transação. Reabrir e concluir novamente não duplica a ocorrência. Em meses curtos, usa o último dia disponível.
- Calendário: seleção de dia, navegação de mês e agenda real.
- Estatísticas: conclusões registradas no período, pendências com prazo no período, estimativa e distribuição total por categoria. Conclusões legadas sem data não entram no gráfico histórico.
- Categorias personalizadas e preferências salvas por conta.
- Perfil: nome/e-mail, tema claro/escuro/automático, tela inicial e lembretes. Exportação JSON das tarefas e preferências.
- Os lembretes são exibidos dentro do aplicativo. Não há envio push com o aplicativo fechado, importação de backups ou sincronização offline.

## Banco e publicação

A migração 004 preserva as tarefas, versões e proprietários existentes e acrescenta os detalhes, datas de conclusão, categorias e preferências. A troca de tabela ocorre dentro da transação do migrador; falhas causam rollback.

Na Vercel, vercel.json executa db:migrate antes do build usando as variáveis do ambiente da implantação. Não é necessário baixar credenciais. Configure um banco separado em Preview para isolar esse ambiente. Localmente, use npm run db:migrate antes de iniciar.

## Verificação

npm test cobre autenticação, propriedade dos dados, migração com tarefa existente, detalhes, recorrência, categorias e preferências. npm run test:integration verifica a API com servidor de produção. Os comandos habilitam GC para liberar handles nativos de SQLite antes da limpeza no Windows.

Também foram verificados, em Chromium, as sete telas em 320, 375, 390, 768, 1024 e 1440 px e o fluxo de criar categoria/tarefa, recarregar, salvar subtarefas, concluir recorrência, salvar perfil/tema, exportar e sair.
