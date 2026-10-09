# Estado Atual do RPG-Master

Documentos canônicos de referência:
- Backlog Canônico Permanente: [docs/BACKLOG.md](docs/BACKLOG.md)
- Arquitetura do Sistema: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)

Prioridade atual:
- P0.4 — Erro de leitura de save ≠ ausência de arquivo (ou P0.3 — Unidade de commit/recuperação do turno)

Próximas tarefas prioritárias:
1. P0.4 — Tratar corrupção/permissão de I/O como erro recuperável e não como ENOENT
2. P0.3 — Unidade de commit e recuperação/resumo de turnos parciais
3. P0.5 — Exclusão + extração concorrente (fechar race de leitura após clear)
4. P1.5 — D20: resolver inconsistência entre `success: false` e `outcome: 'SUCCESS_WITH_COST'`

Últimos itens concluídos e sincronizados no Git:
- P0.2 — Identidade durável de extração e revisão (commit `4f4d97c`, 18 testes de revisão aprovados)
- P0.1 — Prevenção de lost update lógico na memória estruturada (commit `5f008a6`, transação por campanha)

Item parcialmente concluído:
- P1.11 — Base de testes isolados e seguros (harness isolado entregue e 71 testes aprovados; cobertura de HTTP completo e UI permanecem pendentes)

Estado da validação técnica e toolchain:
- Toolchain: Bun para gestão de pacotes, Node.js para execução oficial
- Testes: 71 casos aprovados, 0 falhas (`npm test` / `node tests/run-isolated.cjs`)
- Diagnósticos de risco: 1 aprovado, 2 falhas esperadas (`node tests/run-isolated.cjs --risks`)
- Typecheck: 0 erros (`node node_modules/typescript/bin/tsc --noEmit`)
- Build: Produção validada sem erros (`bun run build`)

Regras operacionais:
- Não reabrir itens concluídos sem evidência empírica de regressão.
- Consultar [docs/BACKLOG.md](docs/BACKLOG.md) e [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) antes de alterações estruturais.
- Seguir estritamente as diretrizes em [AGENTS.md](AGENTS.md).