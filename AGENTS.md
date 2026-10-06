# RPG-Master Agent Instructions

## Objetivo do projeto
Construir e manter um RPG narrativo com IA, preservando consistência de estado, continuidade narrativa e segurança das campanhas existentes.

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

## Processo esperado
1. Entender o problema.
2. Identificar arquivos envolvidos.
3. Listar invariantes.
4. Propor a menor mudança possível.
5. Implementar.
6. Executar testes relevantes.
7. Revisar diff.
8. Entregar relatório técnico curto.

## Quando usar subagentes
Use subagentes apenas quando a tarefa puder ser separada em análises independentes.
Prefira dividir por responsabilidade, por exemplo:
- persistência;
- memória;
- regras/validators;
- testes;
- revisão do diff.

Não use múltiplos agentes para editar os mesmos arquivos em paralelo.