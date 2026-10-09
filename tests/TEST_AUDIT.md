# P1.11 — auditoria e base mínima de testes

Escopo: testes apenas. Nenhuma correção de produção ou instalação de dependências.
Referência canônica: backlog v2.1. Esta análise não reabre P0.1.
As classificações abaixo vêm da leitura do código; somente as suítes explicitadas
em Resultados foram executadas nesta rodada. Uma integração real de camada não
equivale a um teste ponta a ponta da aplicação.

## Matriz dos testes anteriores

Caminhos abreviados: T = `tests/`, E = `server/engine/`, M = `E/memory/`,
N = `E/narrator/`. Classificações descrevem a garantia realmente exercitada,
não necessariamente a anunciada pelo nome do arquivo.

| Arquivo | Classificação | Garantia / limitação confirmada no código |
| --- | --- | --- |
| T/memory_concurrency.test.ts | Integração real de camada | Manager/validator, stores e filesystem reais; concorrência, rollback, isolamento, restart. Asserção de histórico fortalecida nesta rodada. |
| T/snapshot_persistence.test.ts | Integração real de camada | Persistência física, falhas e anti-aliasing; preservado, não reexecutado. |
| T/gamestate_persistence.test.ts | Integração real de camada | Persistência de GameState; preservado, não reexecutado. |
| T/retry_preservation.test.ts | Integração parcial | Engine e disco reais; narrador fake e extração substituída. Não prova invalidação de extração antiga. Diretório agora temporário. |
| T/edit_preservation.test.ts | Integração parcial | Mesmo limite; cobre par de mensagens e conflitos. Sleep de ordenação substituído por barreira. |
| T/idempotency.test.ts | Integração parcial / unitário válido | Middleware, engine e registro real; req/res fake, extração substituída. Cliente retry testado com fetch fake. Agora observa explicitamente entrada in-flight. |
| T/scenario_1.test.ts | Integração parcial | Manager/validator reais; store padrão pode escrever em data real. Fora do executor. |
| T/scenario_2.test.ts | Integração parcial | Mesma restrição de isolamento. |
| T/scenario_3.test.ts | Integração parcial | Mesma restrição de isolamento. |
| T/scenario_4.test.ts | Integração parcial | Mesma restrição de isolamento. |
| T/narrator_resilience.test.ts | Unitário válido + integração frágil | Helpers de fallback válidos; engine com dependências padrão; duração apenas impressa não prova resposta imediata. |
| T/new_campaign_flow.test.ts | Potencialmente enganoso | Booleano local simula modal; GameState direto não prova criação pela UI/API. |
| T/custom_idea_flow.test.ts | Potencialmente enganoso | Gerador real, possível IA externa; texto não vazio não prova aderência à ideia. |
| T/generate_scenarios.test.ts | Integração parcial | Gerador direto, dependência externa/fallback; não cobre rota. |
| T/generate_foundation.test.ts | Integração parcial | Gerador/engine, possível IA externa; não comprova UI. |
| T/scenario_selection_lock.test.ts | Mock/simulação útil | Reproduz handlers; não protege o componente real contra regressão. |
| T/advance_character_action.test.ts | Mock/simulação útil | Lógica copiada; não executa o componente. |
| T/scenario_selection_ux.test.ts | Superficial / frágil | Strings de fonte, handlers copiados e sleeps; não há DOM. |
| T/draft_persistence.test.ts | Potencialmente enganoso | Apenas comentário e impressão de conclusão; nenhuma asserção. |
| T/ui_settings.test.ts | Unitário válido + afirmação excessiva | Preferências com storage fake; checar nome/gênero não prova preservação de RNG/memória. |
| T/history_recents.test.ts | Integração parcial | Engine direto com stores padrão; não testa tela. |
| E/campaign_persistence_test.ts | Integração parcial | Engine/stores reais, narrador fake; cria data/test_rpg_* no cwd. |
| E/__tests__/developer_mode_diagnostics.test.ts | Integração parcial | Dependências injetadas; não testa UI de diagnóstico. |
| E/__tests__/scenarioGenerator.test.ts | Unitário válido | Normalização/regras puras; não prova comportamento de modelo. |
| E/__tests__/modelPolicy.test.ts | Unitário válido | Política/erros, não disponibilidade real de modelos. |
| E/turn/fullTurnLifecycle.test.ts | Potencialmente enganoso | Usa TurnProcessor, enquanto API usa GameEngine; erros acumulados só impressos; stores padrão e possível IA real. |
| M/extractor/pending_extraction_retry.test.ts | Mock/simulação útil | TurnProcessor com extração simulada; não prova segurança de Retry/Edit via API. |
| M/extractor/memoryExtractor.test.ts | Integração parcial / enganoso como gate | Diretório data/test_extractor_memory; falhas impressas/catch(console.error), sem exit confiável nem cleanup global. |
| M/extractor/upsertSim.test.ts | Potencialmente enganoso | Stores padrão, resultados impressos; não é gate confiável. |
| M/extractor/upsertE2E.test.ts | Potencialmente enganoso | Mesmo problema de exit/isolation; nome E2E não prova caminho da API. |
| M/longCampaign.test.ts | Potencialmente enganoso | assertTest com true literal; referência a persistSnapshot removido; mock semanticManager.ai não intercepta aiClient/getClient. |
| M/epistemology.test.ts | Potencialmente enganoso como gate | Store padrão e limpeza inicial; falhas contadas/impressas sem exit confiável. |
| M/audit100Turns.test.ts | Potencialmente enganoso como gate | Store padrão e relatório de erros sem exit de falha garantido. |
| M/memoryLayer.test.ts | Integração real de camada, higiene frágil | Diretório no projeto; process.exit pode impedir cleanup. |
| M/contextRetrieval.test.ts | Integração real de camada, higiene frágil | Diretório no projeto; process.exit dentro do fluxo pode impedir finally. |
| M/semanticRetrieval.test.ts | Integração parcial / frágil | Possível Gemini via dotenv, diretório no projeto e exit antes de cleanup. |
| E/dice/diceEngine.test.ts | Unitário válido + integração frágil | Regras mecânicas puras misturadas com engine/stores/narrador padrão. |
| E/dice/diceOutcomeConsistency.test.ts | Unitário válido | Regressão determinística success/outcome preexistente e não rastreada; não alterada nesta rodada. |
| N/anti_repetition_variety.test.ts | Superficial para comportamento | Contratos de prompt/fixtures; não comprovam variedade de respostas. |
| N/pacing_and_length.test.ts | Superficial para comportamento | Strings/simulação não comprovam tamanho real da resposta. |
| N/player_agency_protection.test.ts | Superficial para comportamento | Instruções/fixtures não comprovam agência na execução. |
| N/npc_autonomy_behavior.test.ts | Superficial para comportamento | Mesmo limite. |
| N/material_realism_causality.test.ts | Superficial para comportamento | Mesmo limite. |
| N/social_relations_behavior.test.ts | Superficial para comportamento | Mesmo limite. |
| N/epistemic_knowledge_behavior.test.ts | Superficial para comportamento | Mesmo limite. |
| N/world_autonomy_sandbox.test.ts | Integração parcial | InMemory/manager e buildPrompt reais, misturados com contratos textuais. |
| N/narrative_continuity_anti_retcon.test.ts | Integração parcial | InMemory/validator/buildPrompt reais; não prova anti-retcon do modelo. |
| N/mutation_restriction_verification.test.ts | Integração parcial | Ferramentas/validator reais; não constitui fluxo HTTP isolado. |
| N/function_calling.test.ts | Integração parcial / frágil | Ferramentas reais; paths no projeto e dependências padrão; não é E2E isolado de function calling. |
| N/fallback_dice_narrative.test.ts | Unitário válido / simulação útil | Helpers reais e orquestração reproduzida; não prova toda a integração do fallback. |
| N/d20_mechanical_obedience.test.ts | Unitário válido + superficial | Regras puras e contratos de prompt; não prova obediência de IA. |

Scripts soltos da raiz não foram incluídos como suíte: `test.cjs` inspeciona
trechos de UI e `rewrite_test.cjs` contém geração de código de testes. Nenhum
desses scripts foi executado; os demais scripts avulsos não foram certificados.

## Base mínima implementada

- `run-isolated.cjs`: allowlist explícita, subprocesso por suíte, cwd/TEMP/TMP/TMPDIR
  em diretório temporário do SO, timeout de segurança, cleanup em finally,
  erro/timeout/exit não zero propagados. Não baixa dependências.
- `helpers/isolated-bootstrap.cjs`: TypeScript já disponível, SDK Gemini fake,
  bloqueio de fetch/conexões/listen e das APIs de escrita usadas pelas suítes.
  Exige confirmação explícita de conclusão: promessa abandonada não vira aprovação.
  É defesa de teste, não sandbox de segurança do SO: não intercepta todas as APIs
  possíveis de filesystem/rede e não deve executar código desconhecido.
- `helpers/engineHarness.ts`: GameEngine, NarratorService, extractor, validator,
  stores e disco reais. Observa o término da extração sem substituir sua execução.
- `helpers/registeredRoutes.cjs`: carrega os handlers de server.ts; simula
  registro/transporte Express. Não copia handlers. Não prova parser/middleware HTTP.
- `engine_contracts.test.ts`: 7 garantias: turno real e restart; extração suspensa;
  handlers reais/replay/conflito; cliente com chave manual explícita; injeção de
  falha no commit; proteções do harness; exit confiável (fixture em subprocesso).
- `backlog_risks.test.ts`: 5 asserções de garantias ainda ausentes, sem expected-fail.
  Retry/Edit/delete usam barreiras na fronteira do SDK; narrativa antiga e nova
  são diferentes. Corrupção e D20 também exercitam implementação real.
- Quatro suítes existentes receberam ajustes focados; as demais foram preservadas.

Os timeouts detectam travamento; não estabelecem ordenação. A ordenação nova usa
barreiras/observação da entrada pendente. Os delays do teste de política de retry
do cliente são parte da política exercitada. O transpiler não substitui typecheck.

## Execução

Com Node e TypeScript já disponíveis, executar da raiz:

```powershell
node tests/run-isolated.cjs
node tests/run-isolated.cjs --risks
```

Se TypeScript não estiver instalado no projeto, definir `TYPESCRIPT_PATH` para
o arquivo `typescript.js` de um runtime existente; usar o caminho completo do Node
se ele não estiver no PATH. Nesta rodada foram usados runtimes locais existentes,
sem instalação. Também é possível selecionar nomes exatos de suítes da allowlist.
Não executar as suítes legadas indiscriminadamente contra o cwd do projeto.

## Resultados e lacunas

Base: memória 21, Retry 5, Edit 9, idempotência 11, contratos 7: **53 passam**.
Diagnóstico separado: **5 falham**, exit 1, correspondentes a P0.2 (2), P0.4 (1),
P0.5 (1), P1.5 (1). Não fechar esses itens por ter adicionado testes.

P0.3: a injeção confirma propagação da falha e igualdade cache/disco. Observou-se
turno 1 com abertura+mensagem do jogador, sem resposta. Não é prova de atomicidade
do turno nem define política de rollback/recovery; essa decisão permanece aberta.

P1.7: comprovado reenvio pelo cliente quando o chamador fornece a mesma chave.
Preservação automática da chave pelo botão de retry manual/UI continua descoberta.

HTTP completo e DOM continuam lacunas. Sem dependências Express instaladas e sem
mudar a inicialização de produção, a rodada usa handlers reais com transporte fake.
Uma futura rodada deve exercitar Express/parser/middleware reais e componentes UI,
sem confundir essa futura cobertura com a integração parcial entregue aqui.

Outras lacunas: erro EACCES/EIO distinto de ausência; crash real entre commits;
matriz de falhas entre GameState/chat/memória/idempotência; recuperação após falha;
clear concorrente com leitura/cache de mensagens. Não foram corrigidas nem simuladas
como garantias aprovadas. P1.11 permanece parcialmente concluído até fechar as lacunas
necessárias de HTTP/UI e consolidar a execução no ambiente oficial do projeto.

Próxima implementação única recomendada: P0.2, usando os dois diagnósticos de extração
obsoleta como regressões. Preservar a ordem e o histórico do backlog canônico.
