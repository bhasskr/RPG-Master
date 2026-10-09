# RPG-Master Agent Instructions

## Objetivo do projeto
Construir e manter um RPG narrativo com IA, preservando consistência de estado, continuidade narrativa e segurança das campanhas existentes.

## Meta principal
Evoluir o RPG-Master para um RPG de IA robusto, coerente e seguro para campanhas longas.

Prioridades:
1. preservar integridade de saves e continuidade;
2. evitar retcons, lost updates e duplicação de efeitos;
3. manter GameState, memória e narrativa consistentes;
4. garantir Retry/Edit/idempotência corretos;
5. melhorar qualidade narrativa sem enfraquecer as regras determinísticas;
6. preferir correções pequenas, testáveis e compatíveis com campanhas existentes.

## Regras de trabalho
- Antes de alterar código, localizar os arquivos relevantes e explicar o plano.
- Fazer mudanças pequenas e focadas.
- Não fazer refactors fora do escopo sem autorização.
- Não alterar APIs públicas sem necessidade explícita.
- Não remover validações apenas para fazer testes passarem.
- Toda correção de bug deve incluir teste de regressão quando possível.
- Preservar compatibilidade com saves existentes.
- Revisar o git diff antes de concluir uma tarefa.
- Relatar arquivos alterados, testes executados e riscos restantes.

## Estado e memória
- Tratar consistência entre GameState e memória estruturada como crítica.
- Evitar mutações persistentes fora dos caminhos oficiais.
- Respeitar mecanismos atômicos e de idempotência existentes.
- Não introduzir caminhos que possam gerar retcon ou perda de atualização.
- Relationship, Quest, Inventory, Events e conhecimento devem manter invariantes explícitos.

## Consulta a documentos canônicos
- Para pequenas correções ou tarefas pontuais, consulte apenas os arquivos de código diretamente envolvidos e o status em [PROJECT_STATE.md](PROJECT_STATE.md); não é obrigatório ler a íntegra de todos os documentos.
- Consulte [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) obrigatoriamente quando a tarefa envolver fronteiras entre módulos, ciclo de vida do turno, concorrência, persistência em disco ou mudanças estruturais.
- Consulte [docs/BACKLOG.md](docs/BACKLOG.md) para verificar dependências, critérios de resolução e histórico técnico do item trabalhado.

## Processo esperado
1. Entender o problema.
2. Identificar arquivos envolvidos.
3. Listar invariantes.
4. Propor a menor mudança possível.
5. Implementar.
6. Executar testes relevantes (`npm test`).
7. Revisar diff.
8. Atualizar documentação canônica de estado.
9. Entregar relatório técnico curto.

## Quando usar subagentes
Use subagentes apenas quando a tarefa puder ser separada em análises independentes.
Prefira dividir por responsabilidade, por exemplo:
- persistência;
- memória;
- regras/validators;
- testes;
- revisão do diff.

Não use múltiplos agentes para editar os mesmos arquivos em paralelo.

## Atualização de estado do projeto
Ao final de cada rodada de implementação:

1. Não altere documentação de estado antes da implementação e validação terminarem.
2. Se a tarefa tiver sido concluída e validada:
   - atualizar [PROJECT_STATE.md](PROJECT_STATE.md);
   - atualizar [docs/BACKLOG.md](docs/BACKLOG.md) movendo o item para o estado concluído com suas evidências;
   - registrar novos bugs, riscos ou follow-ups encontrados;
   - atualizar a próxima prioridade.
3. Se a tarefa estiver apenas parcialmente concluída:
   - marcar explicitamente como parcial em [docs/BACKLOG.md](docs/BACKLOG.md) e [PROJECT_STATE.md](PROJECT_STATE.md);
   - registrar o que foi concluído e o que ainda falta;
   - não declarar o item encerrado.
4. Se testes falharem ou a implementação não puder ser validada:
   - manter o item aberto;
   - registrar o bloqueio;
   - não alterar o estado para concluído.
5. Nunca remover histórico técnico relevante.
6. Nunca reabrir item concluído sem evidência de regressão.
7. `PROJECT_STATE.md` deve permanecer curto e representar apenas o estado operacional atual.
8. `docs/BACKLOG.md` contém o backlog canônico, o histórico detalhado e as pendências permanentes.
9. Os arquivos legados em `backlog/` são preservados de forma imutável como arquivo histórico de evidências.