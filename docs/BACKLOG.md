# RPG-Master — Backlog Canônico e Permanente

> **Documento Canônico de Rastreamento e Continuidade do RPG-Master**  
> Última consolidação: 09/10/2026.  
> Este documento substitui a criação de novos arquivos de backlog versionados (`v2.0`, `v2.1`, `v2.2`, etc.) e atua como a fonte única da verdade para pendências, decisões arquiteturais, histórico de correções e validações do projeto.  
> Os arquivos legados em `backlog/` (`rpg_sandbox_backlog_v2.0.md`, `rpg_sandbox_backlog_v2.1.md`, `rpg_sandbox_backlog_v2.2.md`) são preservados de forma imutável como arquivo histórico de evidências.

---

## 1. Status Executivo e Prioridades Vigentes

### Prioridade Atual Imediata
- **P0.4 — Erro de leitura de arquivo não pode ser tratado como ausência** (ou alternativamente **P0.3 — Unidade de commit e recuperação do turno**).

### Matriz Geral de Tarefas

| Identificador | Título Resumido | Status | Evidência / Bloqueador |
| :--- | :--- | :--- | :--- |
| **P0.1** | Lost update lógico da memória estruturada | **Concluído** | Validado localmente e comitado no Git (`5f008a6`). |
| **P0.2** | Identidade durável de extração e revisão | **Concluído** | Validado localmente (18 testes) e comitado no Git (`4f4d97c`). |
| **P0.3** | Unidade de commit e recuperação do turno | **Aberto** | Falha de commit observada em teste; decisão de rollback/recovery pendente. |
| **P0.4** | Erro de leitura de save ≠ ausência de arquivo | **Aberto** | Falha confirmada em teste (`tests/backlog_risks.test.ts`). |
| **P0.5** | Exclusão + extração concorrente não pode recriar dados | **Aberto** | Delete simples prevenido por ausência de mensagem; race com `clearSnapshot` aberto. |
| **P1.1** | Fonte de verdade por domínio: GameState vs Memória | **Aberto** | Projeções paralelas em NPCs, mundo, Quests e Inventory. |
| **P1.2** | Contrato MemoryExtractor → MemoryValidator | **Aberto** | Campos ignorados silenciosamente (`worldChanges`, etc.). |
| **P1.3** | Validações e integridade do inventário | **Aberto** | Quantidades negativas/NaN e ações inválidas aceitas sem rejeição. |
| **P1.4** | Relationship: causalidade, deltas e idempotência | **Aberto** | `reason` textual sem evento causal formal persistido. |
| **P1.5** | D20: inconsistência `success` vs `outcome` | **Aberto** | Falha confirmada em teste (`tests/backlog_risks.test.ts`). |
| **P1.6** | Continuidade mecânica entre fallbacks de IA | **Aberto** | Resultados de dados e ferramentas resolvidos perdidos na troca de modelo. |
| **P1.7** | Retry manual na UI preservando a mesma operação lógica | **Aberto** | Reenvio com chave manual coberto; preservação no botão da UI pendente. |
| **P1.8** | Endurecimento do CAS de Retry dentro do lock | **Aberto** | Checagem de concorrência e substituição atômica no mesmo lock. |
| **P1.9** | Prevenção de sobrescrita de campanha existente | **Aberto** | API aceita `campaignId` arbitrário na criação. |
| **P1.10** | Contexto do Narrador: inclusão de relações e stats | **Aberto** | Filtro `targetCharacter: 'narrator'` exclui relações válidas. |
| **P1.11** | Base de testes confiáveis e isolamento do harness | **Parcial** | Harness isolado e **71 testes aprovados** entregues; HTTP ponta a ponta e UI pendentes. |
| **P2.1** | Registro no Diário de NPCs introduzidos na abertura | **Aberto** | Abertura (Turno 0) não dispara extração nem persiste NPCs criados na narrativa. |
| **P2.2** | Epistemologia do Diário: descoberta real de locais/fatos | **Aberto** | `knownPlaces` agrega locais de NPCs e eventos sem checagem de conhecimento do jogador. |
| **P2.3** | Quests: contadores, status desconhecidos e criação espúria | **Aberto** | Badge diverge de abas renderizadas; quests triviais criadas pelo extractor. |
| **P2.4** | Escala de familiaridade qualitativa no Journal | **Aberto** | Limiares de relacionamento incompatíveis com o domínio 0..10. |
| **P2.5** | Criação de campanha: polimento funcional e navegação | **Aberto** | "Tenho uma ideia" desconectado da UI; Back incondicional; scroll aninhado. |
| **P2.6** | Chat e interface do D20: semântica e layout | **Aberto** | Botão "Mais recente" sobrepõe prosa; badge D20 exibido sem rolagem real. |
| **P2.7** | Qualidade da extração e mitigação de event spam | **Aberto** | Ações banais persistem como marcos e eventos estruturados. |
| **P2.8** | Refinamento heurístico de anti-retcon | **Aberto** | Similaridade lexical pode confundir crença falsa com contradição factual. |
| **P3.1** | Autenticação e autorização na API | **Bloqueado/Cond.** | Condicional a deployment público; risco aceito em execução puramente local. |
| **P3.2** | Política de retenção e TTL de registros de idempotência | **Aberto** | Diretório `data/rpg_idempotency` cresce indefinidamente sem cleanup periódico. |
| **P3.3** | Sanitização de IDs e preparação para múltiplos processos | **Aberto** | Locks atuais são locais ao processo Node.js. |
| **P3.4** | Otimização de performance para campanhas longas | **Aberto** | Embeddings calculados sob o lock da campanha; reescrita completa de JSON. |
| **P3.5** | Acessibilidade completa (WAI-ARIA) e mobile real | **Aberto** | Focus trap em modais, roving tabindex em tabs, teste em iOS/Android. |
| **P3.6** | Developer Mode: Memory Inspector e diagnósticos | **Aberto** | Integrar `MemoryInspector`, logs, function calls e rolls ao drawer técnico. |

---

## 2. Toolchain Oficial e Ambiente de Validação

A partir da padronização recente, a infraestrutura de desenvolvimento do RPG-Master adota:

- **Gerenciador de Dependências**: **Bun** (`bun.exe` v1.4.2 instalado via WinGet). Utilizado para instalação de pacotes e scripts rápidos de build.
- **Ambiente de Execução**: **Node.js** (`node.exe` v22/v24). Utilizado para executar o servidor de desenvolvimento, testes e execução em produção.
- **Script Canônico de Testes**:
  ```bash
  npm test
  # ou diretamente:
  node tests/run-isolated.cjs
  ```
  Executa em sandbox temporário isolado por suíte, sem rede, com fake SDK do Gemini e barreiras determinísticas.
  - **Status atual**: **71 testes aprovados (0 falhas)** nas 6 suítes confiáveis.
  - Diagnósticos separados de regressões em aberto:
    ```bash
    node tests/run-isolated.cjs --risks
    ```
    (Atualmente acusa 1 aprovado e 2 falhas esperadas correspondentes a P0.4 e P1.5).
- **Typecheck**:
  ```bash
  node node_modules/typescript/bin/tsc --noEmit
  # ou: npm run lint
  ```
  - **Status atual**: **0 erros de tipagem**.
- **Build de Produção**:
  ```bash
  npm run build
  # executa: vite build && esbuild server.ts --bundle --platform=node --format=cjs --packages=external --sourcemap --outfile=dist/server.cjs
  ```
  - **Status atual**: Build executado com sucesso gerando `dist/index.html`, `dist/assets/*` e `dist/server.cjs`.

### Pendência Futura: Reprodutibilidade e CI Automatizado
- **Justificativa**: Atualmente a validação depende do ambiente local do desenvolvedor (Windows com Bun + Node.js em paths específicos ou variáveis de ambiente locais).
- **Ação futura planejada**: Configurar pipeline de CI (GitHub Actions ou similar) com matrix cross-platform, garantindo que o comando oficial de teste, typecheck e build sejam executados e validados automaticamente em cada pull request.

---

## 3. Histórico Consolidado de Correções Concluídas

Os itens abaixo foram implementados, testados com suítes de regressão e sincronizados no Git. **Não devem ser reabertos sem evidência concreta de regressão.**

### P0.1 — Prevenção de Lost Update Lógico na Memória Estruturada
- **Commit**: `5f008a6` (`fix(memory): prevent logical lost updates`).
- **Problema**: O `MemoryManager` realizava ciclos independentes de `getSnapshot -> mutação -> saveSnapshot` fora de uma transação por campanha. Dois fluxos concorrentes (como extrações assíncronas consecutivas) podiam sobrescrever o estado sem corromper o arquivo JSON. Adicionalmente, o `MemoryValidator` convertia deltas sociais em valores absolutos antes da persistência (ex: `10 + 2 + 3` resultava incorretamente em `13`).
- **Solução implementada**:
  - Primitiva transacional `mutateSnapshot` no contrato `IPersistentMemoryStore` e implementações `FilePersistentMemoryStore` e `InMemoryStore`.
  - Mutação sob lock exclusivo de fila por campanha (`executeWithCampaignWriteLock`).
  - Atualização dos registros semânticos realizada dentro da mesma transação antes da gravação atômica.
  - O `MemoryValidator` foi corrigido para preservar deltas de Relationship até o momento da aplicação transacional (o caso `10 + 2 + 3` agora resulta deterministicamente em `15`).
  - Prevenção de corrida de leitura no disco: leituras pendentes não podem sobrepor uma versão de cache mais recente já publicada.
- **Validação**: Suíte `tests/memory_concurrency.test.ts` (21 casos) e `tests/snapshot_persistence.test.ts` (10 casos).

### P0.2 — Identidade Durável de Extração e Revisão de Narrativa
- **Commit**: `4f4d97c` (`fix(memory): prevent stale extraction after narrative revisions`).
- **Problema**: Durante operações de Retry ou Edit da resposta do Mestre, a extração de memória da resposta anterior ainda podia estar em execução em segundo plano. Ao concluir, aplicava mutações de uma versão descartada da narrativa no snapshot consolidado, corrompendo a continuidade.
- **Solução implementada**:
  - Identidade de versão de mensagem via `ChatMessage.revision?: number` (legado assume 0), incrementada a cada nova narrativa por `replaceMessage`, `replaceTurnMessages` ou edição de conteúdo em `updateMessage`.
  - Origem da extração tipada como `ExtractionSource { messageId, revision, turn }`.
  - Verificação atômica de obsolescência via `commitExtraction` sob fila de escrita da campanha. Se a narrativa atual tiver revisão diferente ou mensagem ausente, o commit retorna status `'stale'` e nenhuma alteração é aplicada.
  - Recibos duráveis no snapshot em `extractionReceipts[messageId] = { revision, turn, hasMutations }`. Extrações repetidas da mesma revisão retornam status `'duplicate'`.
  - O `MemoryValidator` opera em `draftStore` (`InMemoryStore`) isolado; falhas no validator descartam o draft sem alterar o disco.
  - A guarda `assertRevisable` consulta tanto a flag de chat quanto o recibo persistido no snapshot, garantindo bloqueio de substituição mesmo em caso de falha de persistência da flag no chat.
- **Validação**: Suíte `tests/extraction_revision.test.ts` (18 casos aprovados). Total da base isolada elevado para 71 casos.

### P0.0 / Entregas Anteriores Consolidadas
1. **Retry Não Destrutivo da Resposta Anterior**:
   - Commit `1f4990b` (`feat(engine): implement atomic message replacement`).
   - `replaceMessage` atômico; a resposta anterior do Mestre é preservada caso a nova chamada de geração falhe.
2. **Edit Transacional do Par Jogador/Mestre**:
   - Commit `1b8635a` (`feat(memory): add atomic turn replacement support`).
   - `replaceTurnMessages` substitui o par jogador + assistente como uma única unidade lógica em disco com validação de conflito concorrente (`ExpectedTurnState`).
3. **Idempotência de Requisições HTTP**:
   - Commits `c7ee849` (`feat: implement idempotency service for API requests`), `d235384` (`fix(idempotency): ensure atomic persistence for records`) e `949af1c` (`test: improve isolation and cleanup`).
   - Middleware `withIdempotency` protegendo todas as rotas mutáveis (`/api/message`, `/api/message/retry`, `/api/message/edit`, `/api/campaign/new`, etc.).
   - Hashing determinístico SHA-256 de payloads canônicos, deduplicação de requisições in-flight e persistência atômica de registros concluídos em `data/rpg_idempotency`.
4. **Isolamento de Snapshots e Consistência de Cache**:
   - Commit `ba35db5` (`fix(memory): prevent cache mutation via deep cloning`).
   - `FilePersistentMemoryStore.getSnapshot` retorna clones profundos destacados, eliminando mutações in-place no cache de memória.
   - Padrão atômico de persistência: arquivo temporário `.tmp` -> `fs.rename` -> atualização de cache por último -> propagação de erros.
5. **GameStateManager: Persistência Atômica e Imutabilidade de Referência**:
   - Commit `4a34cd7` (`feat(persistence): implement atomic file saving for game states`).
   - `GameStateManager` refatorado com `cloneGameState`, gravação atômica via arquivo temporário + `renameSync`, garantindo coerência entre disco e cache.

---

## 4. Detalhamento das Tarefas Abertas e Parciais

### Bloco P0 — Integridade de Save, Concorrência e Transações

#### P0.3 — Unidade de Commit e Recuperação do Turno
- **Status**: Aberto.
- **Descrição**: No fluxo de `processPlayerAction`, múltiplos domínios são persistidos em momentos distintos: avanço de turno no GameState, gravação da mensagem do jogador no chat, gravação da resposta do narrador, extração assíncrona de memória e registro de idempotência.
- **Risco**: Uma falha de rede ou processo entre essas etapas resulta em turno parcialmente gravado (ex: jogador gravado sem resposta do Mestre, ou resposta gravada sem GameState atualizado).
- **Critérios de Resolução**:
  1. Definir formalmente a semântica do turno em falha: rollback para o estado anterior, resume automático ou estado parcial explicitamente recuperável.
  2. Implementar rotina de recuperação no carregamento da campanha que identifique turnos truncados.
  3. Adicionar testes de injeção de falha cobrindo interrupções antes e após cada ponto de persistência.

#### P0.4 — Erro de Leitura de Save Não Pode Ser Tratado como Ausência de Arquivo
- **Status**: Aberto (prioridade imediata).
- **Descrição**: Em `FilePersistentMemoryStore.internalGetSnapshot`, blocos `try/catch` tratam erros de `JSON.parse` ou falhas de permissão de I/O apenas logando aviso e retornando `null` (comportamento equivalente a `ENOENT` / arquivo inexistente).
- **Risco**: Se um arquivo de save estiver temporariamente truncado ou corrompido, uma operação posterior de gravação criará um snapshot padrão vazio, sobrescrevendo e destruindo os dados históricos da campanha.
- **Critérios de Resolução**:
  1. Diferenciar estritamente `ENOENT` (arquivo não existe, retorna `null`) de outros erros (`SyntaxError`, `EACCES`, `EIO`, etc.).
  2. Em caso de erro real de leitura, propagar erro explícito (`CorruptMemoryError` ou similar) e bloquear escritas destrutivas automáticas.
  3. Validar contra o diagnóstico em `tests/backlog_risks.test.ts`.

#### P0.5 — Exclusão + Extração Concorrente Não Pode Recriar Dados
- **Status**: Aberto.
- **Descrição**: A exclusão de uma campanha (`deleteCampaign`) apaga arquivos no disco e limpa caches em memória. No entanto, se houver uma extração de turno ou aquisição de conhecimento ainda em execução assíncrona, ela pode tentar persistir novos dados após a remoção.
- **Critérios de Resolução**:
  1. O caso simples de ausência de mensagem já foi mitigado pela checagem de revisão de P0.2.
  2. Resta fechar o race condition em que uma leitura de snapshot iniciada antes de `clearSnapshot` termina após a limpeza e repopula o cache em memória.
  3. Auditar `loadMessagesFromDisk` para garantir que leituras concorrentes com limpeza não revivam mensagens apagadas.

---

### Bloco P1 — Contratos de Domínio, Regras e Testes

#### P1.1 — Fonte de Verdade por Domínio: GameState vs Memória Estruturada
- **Status**: Aberto.
- **Descrição**: O RPG-Master mantém representações paralelas para NPCs, localização/mundo, eventos, relacionamentos, quests e inventário: uma no `GameState` (usada pelo motor e frontend) e outra no snapshot de memória estruturada (usada pelo retrieval do narrador).
- **Critérios de Resolução**:
  1. Estabelecer matriz formal de autoridade canônica por domínio (qual é o mestre e qual é a projeção derivada).
  2. Ordem de transição: NPCs/localização -> Quests/Inventory -> Relationships/Knowledge -> Events.
  3. Implementar rotina de sincronização determinística preservando compatibilidade com saves existentes.

#### P1.2 — Contrato MemoryExtractor → MemoryValidator sem Perda de Consequências
- **Status**: Aberto.
- **Descrição**: O schema de saída do `MemoryExtractor` propõe alterações (`worldChanges`, campos de observação/crença epistemológica, atualização de objetivos de quests) que o `MemoryValidator` ignora silenciosamente ou descarta.
- **Critérios de Resolução**:
  1. Garantir round-trip completo de contrato: schema do extractor -> validador -> aplicação no store.
  2. Todo campo proposto deve ser aplicado com sucesso ou rejeitado com log explícito justificando a recusa; nunca ignorado silenciosamente.

#### P1.3 — Validação e Integridade de Operações no Inventário
- **Status**: Aberto.
- **Descrição**: Mutações de inventário aceitam quantidades indefinidas (caindo em fallback `quantity || 1`), não validam finitude ou positividade de números, e ações desconhecidas podem se comportar indevidamente como aquisição.
- **Critérios de Resolução**:
  1. Validar enum estrito de ações (`acquired`, `consumed`, `lost`, `transferred`, `equipped`, `unequipped`).
  2. Exigir quantidade finita, inteira e positiva; rejeitar saldo negativo em consumo/perda.
  3. Operações inválidas devem falhar sem mutar o snapshot.

#### P1.4 — Relationship: Causalidade Formal, Deltas e Idempotência
- **Status**: Aberto.
- **Descrição**: Mutações em relacionamentos sociais são disparadas com base em um campo textual livre `reason`, sem referência formal a um evento ocorrido e autorizado.
- **Critérios de Resolução**:
  1. Exigir vínculo causal com `eventId` persistido ou ação de turno autorizada.
  2. Assegurar que deltas de confiança/hostilidade não se multipliquem em repetições.
  3. Auditar e suportar relações assimétricas (NPC A confia em B, mas B desconfia de A).

#### P1.5 — D20: Resolução Inconsistente entre `success` e `outcome`
- **Status**: Aberto.
- **Descrição**: Em `executeRollCheck` (`server/engine/dice/diceEngine.ts`), uma rolagem com total inferior à dificuldade pode gerar `success: false` conjuntamente com `outcome: 'SUCCESS_WITH_COST'`, confundindo a narração subsequente.
- **Critérios de Resolução**:
  1. Definir regra matemática e mecânica canônica em um único ponto da engine.
  2. Rolagens que não atingem a margem de sucesso com custo devem resultar inequivocamente em `outcome: 'FAILURE'`.
  3. Validar aprovação do caso no diagnóstico `tests/backlog_risks.test.ts`.

#### P1.6 — Continuidade Mecânica entre Fallbacks de IA
- **Status**: Aberto.
- **Descrição**: Quando o modelo primário (`gemini-3.8-flash`) executa uma rolagem de dados ou chamada de ferramenta e falha antes de completar a narrativa, a requisição é redirecionada ao modelo de fallback sem que os resultados mecânicos resolvidos sejam preservados no contexto.
- **Critérios de Resolução**:
  1. Preservar o estado mecânico gerado (rolagens, ferramentas já validadas) no payload de retry do fallback.
  2. Se todos os modelos falharem, o gerador procedural deve utilizar exatamente os valores de dados já sorteados.

#### P1.7 — Retry Manual na UI Preservando a Idempotência da Operação
- **Status**: Aberto.
- **Descrição**: A infraestrutura de idempotência do servidor suporta repetição com a mesma chave. Porém, na interface (`App.tsx`), quando uma mensagem falha e o usuário clica no botão "Tentar novamente" do `ErrorBanner`, uma nova chave de idempotência é gerada, permitindo duplicação de turno se a requisição original tiver sido processada no servidor.
- **Critérios de Resolução**:
  1. Armazenar o descritor `{ payload, idempotencyKey, operationType }` da operação que falhou.
  2. O clique de retry deve reutilizar explicitamente a mesma chave original.
  3. Novo envio intencional pelo composer deve gerar nova chave.

#### P1.8 — Endurecer CAS de Retry dentro da Seção Crítica
- **Status**: Aberto.
- **Descrição**: A verificação de conflitos de `retryLastPlayerAction` ocorre antes de obter o lock de gravação (`executeWithCampaignWriteLock`). Duas regenerações concorrentes podem validar o mesmo estado e substituir sequencialmente.
- **Critérios de Resolução**:
  - Implementar compare-and-swap atômico dentro do lock, alinhando ao padrão rigoroso já utilizado em `editLastPlayerAction`.

#### P1.9 — Prevenção de Sobrescrita de Campanha Existente
- **Status**: Aberto.
- **Descrição**: `GameStateManager.createCampaign` aceita um `campaignId` fornecido no payload sem verificar se o arquivo já existe no disco, permitindo sobrescrita inadvertida.
- **Critérios de Resolução**:
  - Rejeitar criação caso o `campaignId` já exista, exigindo identificador exclusivo.

#### P1.10 — Contexto do Narrador: Inclusão de Relações e Detalhes do Mundo
- **Status**: Aberto.
- **Descrição**: Ao compor o prompt do Narrador, filtros como `targetCharacter: 'narrator'` excluem relacionamentos entre jogador e NPCs presentes do bloco automático de contexto injetado.
- **Critérios de Resolução**:
  - Ajustar `getRelevantContext` para selecionar relacionamentos relevantes aos participantes da cena ativa sem inflar desnecessariamente a janela de contexto.

#### P1.11 — Base Mínima de Testes Confiáveis e Isolamento do Harness
- **Status**: Parcialmente Concluído.
- **Concluído**: Executor isolado `run-isolated.cjs`, sandboxes temporários por suíte, harness com bloqueio de rede e simulação do SDK Gemini, 71 testes aprovados em 6 suítes (`memory_concurrency`, `retry_preservation`, `edit_preservation`, `idempotency`, `engine_contracts`, `extraction_revision`).
- **Lacunas para conclusão total**:
  1. Testes de integração HTTP cobrindo o ciclo real de middlewares do Express até a persistência (atualmente usa handlers reais com transporte simulado).
  2. Testes de interface e componentes críticos (DOM, NewCampaignModal, ChatView, fluxo de Retry manual).
  3. Execução consolidada e documentada na toolchain oficial do projeto.

---

### Bloco P2 — Narrativa, Produto e Experiência de Usuário (UX)

#### P2.1 — Registro no Diário de NPCs Introduzidos na Abertura
- **Status**: Aberto.
- **Descrição**: Ao iniciar nova campanha (`startNewCampaign`), a mensagem de abertura (Turno 0) é gerada e salva, mas não passa pelo processo de extração de memória. Personagens introduzidos pelo Mestre na abertura nunca são registrados na lista de NPCs estruturada e não aparecem no Diário.
- **Critérios de Resolução**:
  - Disparar extração estruturada segura para a abertura ou registrar explicitamente os NPCs apresentados na fundação da campanha.

#### P2.2 — Epistemologia do Diário: Descoberta Real de Locais e Informações
- **Status**: Aberto.
- **Descrição**: `JournalModal.knownPlaces` lista locais obtidos de `npc.location` e `event.location` sem verificar se o jogador esteve presente ou tomou conhecimento desses locais.
- **Critérios de Resolução**:
  - Filtrar locais e entidades para exibir apenas elementos com evidência de observação direta ou relato comprovado ao jogador.

#### P2.3 — Quests: Sincronização de Contadores e Prevenção de Criação Espúria
- **Status**: Aberto.
- **Descrição**: O contador da aba de Quests no Diário conta todas as quests no snapshot, mas a renderização filtra apenas `active`, `completed` e `failed`, deixando contadores com abas vazias quando há status como `abandoned`. Adicionalmente, o extrator tende a criar quests em cenas banais.
- **Critérios de Resolução**:
  - Alinhar contadores à renderização real e refinar o prompt do extractor para evitar criação de missões sem compromisso explícito do jogador.

#### P2.4 — Escala de Familiaridade Qualitativa no Diário
- **Status**: Aberto.
- **Descrição**: `JournalModal.getQualitativeRelation` utiliza limiares matemáticos inconsistentes com o intervalo 0..10 de relacionamentos, tornando certas faixas inatingíveis.
- **Critérios de Resolução**:
  - Ajustar faixas de classificação e adicionar teste unitário de categorização.

#### P2.5 — Criação de Campanha: Fluxos Funcionais e Navegação
- **Status**: Aberto.
- **Descrição**: "Escrever minha ideia" muda o modo sem disparar geração; o botão Voltar na etapa de Foundation retorna incondicionalmente para seleção de cenários; o modal sofre de barras de rolagem aninhadas.
- **Critérios de Resolução**:
  1. Conectar `api.generateScenarioFromIdea` ao submit de ideia livre.
  2. Registrar modo de origem (`foundationSourceMode`) para garantir que Voltar retorne à tela correspondente.
  3. Unificar a rolagem do modal em um container principal único com rodapé persistente para ações de navegação.

#### P2.6 — Chat e Indicadores Visuais: D20 e Layout
- **Status**: Aberto.
- **Descrição**: O botão flutuante "Mais recente" sobrepõe a leitura do texto narrativo; o chip "D20" aparece em todas as mensagens mesmo quando não houve rolagem mecânica.
- **Critérios de Resolução**:
  1. Reposicionar "Mais recente" para área estrutural reservada junto ao rodapé.
  2. Exibir badge de D20 somente quando `metadata.diceRolls` contiver rolagens reais, apresentando dados mecânicos úteis (resultado e modificador).

#### P2.7 — Qualidade da Extração e Redução de Event Spam
- **Status**: Aberto.
- **Descrição**: Ações cotidianas (ex: comprar um café, caminhar na rua) são salvas como eventos marcantes no histórico da campanha, inflando o snapshot de memória.
- **Critérios de Resolução**:
  - Refinar o prompt e as diretrizes do extrator para diferenciar eventos estruturais de detalhes de cena banais.

#### P2.8 — Refinamento de Anti-Retcon e Epistemologia Heurística
- **Status**: Aberto.
- **Descrição**: A validação léxica de contradições pode classificar rumores ou crenças falsas legítimas de NPCs como violações da verdade do mundo (`WORLD_TRUTH`).
- **Critérios de Resolução**:
  - Ajustar validações epistemológicas para permitir circulação social de desinformação sem corromper fatos canônicos.

---

### Bloco P3 — Operação, Desempenho e Hardening Futuro

#### P3.1 — Autenticação e Autorização da API (Condicional)
- **Status**: Bloqueado / Condicional ao deployment.
- **Descrição**: As rotas Express não exigem autenticação de usuário nem isolamento de campanhas por perfil. Aceitável exclusivamente enquanto a aplicação for executada em localhost monousuário.
- **Critério**: Obrigatório implementar antes de qualquer deploy em rede pública.

#### P3.2 — Retenção e Limpeza de Registros de Idempotência
- **Status**: Aberto.
- **Descrição**: Arquivos em `data/rpg_idempotency` são gravados atomicamente, mas nunca removidos.
- **Critério**: Implementar rotina de TTL ou expiração periódica (ex: 7 dias) para evitar consumo excessivo de disco.

#### P3.3 — Sanitização de Identificadores e Múltiplos Processos
- **Status**: Aberto.
- **Descrição**: Nomes de arquivo utilizam sanitização básica por regex; locks de escrita são locais à memória do processo Node.
- **Critério**: Se o servidor evoluir para cluster ou múltiplos workers, substituir locks locais por mecanismos distribuídos.

#### P3.4 — Otimização de Performance para Campanhas Longas
- **Status**: Aberto.
- **Descrição**: A geração de embeddings durante a validação de memória ocorre dentro do lock da campanha, e o snapshot JSON inteiro é regravado a cada turno.
- **Critério**: Medir latência em campanhas com mais de 100 turnos e avaliar desacoplamento assíncrono do cálculo de embeddings.

#### P3.5 — Acessibilidade Completa (WAI-ARIA) e Testes em Mobile Real
- **Status**: Aberto.
- **Descrição**: Completar focus trap e restauração de foco em diálogos (`DrawerShell`, `NewCampaignModal`); implementar roving tabindex e setas em `Tabs.tsx`; validar viewport em dispositivos móveis reais (iOS Safari e Android).

#### P3.6 — Developer Mode: Painéis Técnicos e Traces
- **Status**: Aberto.
- **Descrição**: Integrar o `MemoryInspector` ao `DeveloperPanel` com visualização de logs, rolagens, chamadas de ferramentas e árvore de contexto de IA.

---

## 5. Mapeamento de Rastreabilidade e Auditorias

### Matriz de Mapeamento dos Achados da Auditoria Codex (R1–R19)

| Código | Descrição do Achado Original | Item Canônico no Backlog | Decisão Arquitetural Vinculada |
| :--- | :--- | :--- | :--- |
| **R1** | Fontes de dados divergentes entre GameState e memória | **P1.1** | **A1** (Autoridade de Estado) |
| **R2** | Turno parcialmente persistido após falha intermediária | **P0.3** | **A2** (Ciclo Transacional do Turno) |
| **R3** | Extração de memória obsoleta após Retry ou Edit | **P0.2** (Concluído) | **A3** (Identidade de Consequências) |
| **R4** | Retry sem compare-and-swap atômico no lock | **P1.8** | **A2** (Ciclo Transacional do Turno) |
| **R5** | Duplicação de turno após retry manual do usuário | **P1.7** | **A2** (Idempotência de Operação) |
| **R6** | Criação de campanha sobrepondo ID preexistente | **P1.9** | **A5** (Versionamento e Integridade de Saves) |
| **R7** | Erro de leitura de arquivo corrompido tratado como ausência | **P0.4** | **A5** (Versionamento e Integridade de Saves) |
| **R8** | Exclusão parcial de dados e recriação por extração concorrente | **P0.5** | **A3** (Identidade de Consequências) |
| **R9** | Consequências extraídas descartadas pelo validador | **P1.2** & **P2.3** | **A3** (Proveniência de Consequências) |
| **R10** | Deltas sociais e de inventário perdidos ou duplicados | **P0.1** (Concluído) & **P1.4** | **A3** (Proveniência de Consequências) |
| **R11** | Operações de inventário inválidas aceitas sem rejeição | **P1.3** | **A1** (Autoridade Mecânica) |
| **R12** | Inconsistência mecânica entre `success` e `outcome` no D20 | **P1.5** | **A7** (Autoridade Mecânica) |
| **R13** | Perda de continuidade mecânica em fallbacks de IA | **P1.6** | **A7** (Autoridade Mecânica) |
| **R14** | Rotas de API mutáveis sem autenticação ou autorização | **P3.1** | Condicional a deployment |
| **R15** | Contexto do narrador omitindo relacionamentos persistidos | **P1.10** | **A1** (Autoridade de Estado) |
| **R16** | Heurística de anti-retcon confundindo crença e contradição | **P2.8** | **A3** (Proveniência de Consequências) |
| **R17** | Falta de coordenação multiprocesso e IDs sanitizados | **P3.3** | **A5** (Integridade de Saves) |
| **R18** | Latência e crescimento desmedido de contexto em campanhas longas | **P3.4** | **A6** (Índice Semântico Derivado) |
| **R19** | Testes automatizados com falsa confiança e sem isolamento | **P1.11** (Parcial) | Padronização da Toolchain |

### Decisões Arquiteturais Fundamentadas (A1–A7)

- **A1 — Autoridade de Estado**: O `GameState` é a autoridade central para regras do jogo, status de mundo, combate e inventário operacional. A Memory Layer estruturada é a autoridade histórica para epistemologia, relacionamentos e contexto narrativo.
- **A2 — Ciclo Transacional do Turno**: Cada turno deve ser indivisível ou ter um protocolo determinístico de recuperação. Uma resposta ao usuário só deve ser consolidada se o estado subjacente puder ser reconstruído de forma idêntica.
- **A3 — Identidade e Proveniência de Consequências**: Toda alteração persistente deve referenciar explicitamente sua fonte geradora (`turn`, `messageId`, `revision`). Consequências derivadas de narrativas que foram editadas ou repetidas devem ser invalidadas automaticamente (`stale`).
- **A4 — Unificação do Pipeline de Execução**: `GameEngine` é a arquitetura canônica de produção. O componente alternativo `TurnProcessor` não deve ser mantido como rota paralela e será gradualmente consolidado ou deprecado.
- **A5 — Integridade e Recuperação de Saves**: Saves corrompidos devem emitir alerta técnico explícito e impedir sobrescrita acidental. Saves devem utilizar versionamento estrutural explícito.
- **A6 — Índice Semântico como Dado Derivado**: Embeddings e registros semânticos são índices de aceleração de busca e recuperação; jamais devem atuar como fontes primárias de verdade de estado.
- **A7 — Autoridade Mecânica Determinística**: Resoluções de regras (rolagens de D20, modificadores, consumo de itens) são estritamente executadas no servidor pela Game Engine; o modelo de IA atua apenas como intérprete descritivo do resultado mecânico já decidido.

---

## 6. Histórico das Versões e Relatos Anteriores (Arquivo Consolidado)

Para referência contínua, os marcos e apontamentos técnicos registrados nos ciclos históricos anteriores permanecem preservados abaixo:

### Ciclo de Relatos e Refinamentos v51 a v70
- **v51 a v53 (Inspeção de UI e Geração de Cenários)**: Diagnóstico de bugs em `NewCampaignModal.tsx`. Identificação de rolagem aninhada (`overflow-y-auto` duplo em desktop e mobile), ausência de chamada à API em `handleSubmitCustomIdea`, navegação de retorno incondicional para `generate_scenarios`, e falta de feedback de carregamento em "O mestre escolhe tudo".
- **v54 a v57 (Retry e Persistência Atômica de Mensagens)**: Eliminação do delete prematuro de mensagens de abertura e turnos normais antes da chamada à IA. Introdução de `replaceMessage` e proteção atômica de arquivos via arquivos temporários `.tmp` e `rename`.
- **v58 a v59 (Edit Transacional)**: Eliminação da exclusão assíncrona parcial na edição da ação do jogador. Criação de `replaceTurnMessages`, assegurando a substituição do par jogador/assistente em transação única no disco.
- **v60 a v63 (Idempotência e Higiene de Testes)**: Introdução do serviço de idempotência com chave no cliente, canonicalização SHA-256 e persistência em disco. Correção do isolamento dos testes de idempotência para evitar versionamento de arquivos `.tmp` residuais no repositório.
- **v64 a v65 (Snapshots de Memória e Anti-Aliasing)**: Eliminação do vazamento de referências em `getSnapshot` via clonagem profunda (`cloneSnapshot`), gravação atômica sob lock de campanha e suíte dedicada de persistência de snapshots.
- **v66 a v68 (Consistência do GameStateManager)**: Correção de mutações diretas em `activeStates` no `GameStateManager`. Implementação de `cloneGameState` e persistência atômica síncrona com `fs.writeFileSync` em temporário + `renameSync`.
- **v69 a v70 (Lost Update e Epistemologia)**: Detalhamento da solução transacional `mutateSnapshot` para impedir que mutações concorrentes na memória estruturada se sobrescrevessem sem erro, preparando o terreno para o fechamento definitivo de P0.1 e P0.2.
