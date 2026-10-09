# RPG Sandbox — Backlog Consolidado v2.2

> Atualização de 09/10/2026. O conteúdo integral do arquivo v2.1 está preservado abaixo, seguido da atualização v2.2.
> Para o estado vigente, prevalece a seção **ATUALIZAÇÃO v2.2 — P0.2: IDENTIDADE DURÁVEL DE EXTRAÇÃO E REVISÃO** ao final deste arquivo, inclusive sobre referências históricas anteriores.
> **P0.1 e P0.2: concluídos e validados. P1.11: parcialmente concluído.** As demais prioridades e pendências permanecem preservadas.

---

# RPG Sandbox — Backlog Consolidado v2.1

> Fonte de continuidade para o próximo chat.
> Este arquivo separa claramente: estado concluído, pendências reais e validações práticas.
> Não reabrir itens marcados como concluídos sem evidência de regressão.
> A seção **BACKLOG CANÔNICO v2.1** no fim do arquivo substitui as listas antigas de prioridade; as atualizações históricas permanecem preservadas como evidência.

# ESTADO CONSOLIDADO — CONCLUÍDO

## Arquitetura central
- Gemini atua como Narrador/Mestre; Game Engine é autoridade de estado, memória e resolução mecânica.
- Memória estruturada separada do chat: Campaign, NPC, Event, Knowledge, Relationship, Inventory, Quest.
- Retrieval híbrido: estado estruturado determinístico primeiro, depois candidatos semânticos via embeddings, filtro epistemológico, deduplicação/ranking.
- Persistência local JSON por campanha com restauração.
- Memory extraction por proposta estruturada -> validação -> persistência; Narrador não escreve diretamente no banco.
- Function Calling com separação de autoridade: Narrador recebe leitura + rolagem; mutações ficam no Engine.
- RNG server-side com `crypto.randomInt(1,21)`.
- Classificação de ações IMPOSSIBLE / TRIVIAL / UNCERTAIN.
- Forced roll server-side quando necessário; resultado mecânico é autoritativo.

## Epistemologia
- WORLD_TRUTH
- DIRECT_OBSERVATION
- REPORTED_INFORMATION
- RUMOR
- SUSPICION
- BELIEF
- FALSE_BELIEF
- DISPUTED
- UNKNOWN
- Cadeias de informação, observedBy / believedBy / disputedBy e isolamento cognitivo implementados.

## Narrador — refinamentos concluídos
- Voz, estilo, tom e naturalidade.
- Repetição e variedade.
- Ritmo e tamanho de resposta.
- Agência do jogador.
- Realismo material e causalidade.
- NPCs autônomos e diferenciados.
- Relações e interação social.
- Conhecimento e epistemologia.
- Uso do D20.
- Continuidade e anti-retcon.
- Mundo autônomo / anti-protagonismo / ritmo sandbox.
- Preferências narrativas sincronizadas entre abertura, turnos normais, Retry e Edit.
- Testes sintéticos dedicados adicionados para essas áreas.

## UI/UX v1
- Design System v1 concluído.
- Hierarquia geral concluída.
- Chat concluído.
- Onboarding principal concluído.
- Journal / Informações concluídos para v1.
- Biblioteca concluída para v1.
- Gestão de campanhas concluída para v1.
- Settings concluído para v1.
- Microinterações / loading / erro / transições concluídos.
- Mobile audit inicial concluído; resta validação em aparelhos reais.
- Auditoria visual final concluída para v1.

## Developer Mode
- `DeveloperPanel` criado com `DrawerShell`.
- `TechnicalDiagnostics` movido para Developer Mode.
- Diagnóstico técnico removido de Settings.
- Acesso por Sidebar e `Ctrl/Cmd + Shift + D`.
- Campos estruturados somente leitura e sem secrets.
- Technical Diagnostics concluído.

## Model Policy
- `gemini-3.8-flash` priorizado como modelo narrativo.
- Cadeia de fallback revisada.
- Direção atual: evitar aliases `*-latest` e previews quando estáveis forem suficientes.

## Criação de cenário — correções concluídas
- Geração estruturada de 3 cenários concretos.
- Constraints explícitos preservados e validados pós-geração.
- Double-submit corrigido com lock síncrono.
- Cards passaram a apenas selecionar cenário; Foundation só inicia em `Continuar com este cenário`.
- `Novas opções` virou ação terciária.
- `X` é cancelamento global.
- Redundâncias principais do rodapé foram removidas.
- Literal/artefatos `svg` deixaram de aparecer na UI.
- Criação livre + criação guiada + Surpreenda-me integradas no mesmo pipeline.

## Personagem
- Bug `Avançar personagem` corrigido.
- Causa raiz: step legado `experience_type`, lock residual e submit inconsistente.
- Fluxo atual: `character_identity -> character_appearance`.
- `characterAdvanceLockRef` dedicado.
- Testes de regressão cobrindo cliques concorrentes e drafts legados.

# PENDÊNCIAS REAIS — PRIORIDADE ALTA

## 1. Polida técnica da criação de campanha
- Revisar navegação e semântica de `Voltar`.
- Revisar `Mudar método` vs `Voltar`; hoje podem continuar contraintuitivos/próximos demais.
- Revisar loading e mensagens de erro em todas as transições.
- Garantir que cenário escolhido e Foundation não desapareçam ao voltar.
- Confirmar que `campaignId` só seja criado no momento correto, não prematuramente.
- Revisar estados vazios e recuperação após erro.
- Confirmar que todos os caminhos convergem corretamente:
  - Escrever minha ideia
  - Montar uma premissa
  - O mestre escolhe tudo
  - Surpreenda-me
- Preservar premissa e foco estruturado ao voltar.
- Validar reset/escopo correto de:
  - `selectionLockRef`
  - `characterAdvanceLockRef`
  - `creationLockRef`
- Revisar mobile do fluxo completo.
- Remover redundâncias restantes de tela/modal.

## 2. `O mestre escolhe tudo`
- Corrigir o bug funcional atual.
- Adicionar `Foco da premissa`.
- Se foco específico for escolhido, randomizar os demais detalhes dentro desse foco.
- Se `Foco = Aleatório`, permitir que o mestre escolha inclusive o foco.
- Não criar pipeline separado; convergir com a geração normal.

## 3. Foco da premissa / criação adaptativa
- Estruturar `Foco da premissa` como eixo da criação guiada.
- Opções possíveis:
  - Romance
  - Mistério / Investigação
  - Vida cotidiana
  - Drama social
  - Família
  - Carreira / Ambição
  - Crime
  - Sobrevivência
  - Aventura
  - Aleatório
- O foco deve mudar o schema mental da premissa, não apenas um chip visual.
- Campos condicionais devem se adaptar ao foco.
- Não reutilizar `relationshipDynamic` para sandboxes não relacionais.
- Usar `initialSituation` / `coreSetup` ou equivalente quando apropriado.
- O foco orienta a situação inicial, não o conteúdo obrigatório de toda a campanha.
- Regra conceitual: “A premissa determina por que a campanha começa interessante; não determina o assunto de todos os turnos futuros.”

## 4. Geração de cenário menos roteirizada
- Diferenciar `cenário como situação de vida` de `cenário como trama pronta`.
- Evitar transformar toda premissa em grande conflito, missão, disputa ou projeto.
- Reavaliar o uso universal de `Conflito Central`.
- Para romance / slice-of-life / cotidiano, considerar campos como:
  - Situação inicial
  - Fricção inicial
  - Vida ao redor
  - Contexto inicial
- Não inferir automaticamente que high school implica:
  - clube de debate
  - robótica
  - jornal
  - eleição
  - STEM
  - projeto obrigatório
  - disputa por liderança/prestígio
- Variar fontes de convivência/conflito:
  - grupos sociais
  - reputação
  - vizinhança
  - famílias
  - festas
  - trabalho de meio período
  - amizades em comum
  - transporte
  - sala de aula comum
  - redes sociais
  - rotina doméstica
  - eventos locais
- Preservar nuances banais fornecidas pelo usuário em vez de “sofisticá-las” à força.
- Validar diversidade semântica entre as 3 opções, não apenas troca de nomes/cidades.

## 5. Sandbox — banalidade e realismo cotidiano
- Garantir que o mundo não produza apenas acontecimentos de destaque.
- Permitir rotina, pequenos incômodos e eventos banais.
- Exemplos: trânsito, compras, mensagens, tarefas domésticas, filas, gastos pequenos, burocracia, clima, cansaço, conversas sem consequência importante.
- Não transformar toda cena em prenúncio, tensão ou oportunidade dramática.
- Em cenários realistas, eventos grandes devem ser proporcionalmente menos frequentes salvo contexto contrário.

# DEVELOPER MODE — PRÓXIMAS SEÇÕES

## Memory Inspector
- Integrar o `MemoryInspector` existente ao `DeveloperPanel`.
- Não reescrever a lógica de memória.
- Manter separação clara entre UI técnica e experiência normal do jogador.

## Depois do Memory Inspector
- Logs.
- Function Calls.
- Rolls.
- Retrieval.
- Epistemologia.
- Ocultação/isolamento de recursos técnicos da UI final.
- Avaliar uma estrutura de trace por turno para agrupar geração, tools, retrieval e roll sem dump bruto.

# MEMÓRIA / BACKEND — PENDÊNCIAS

## Persistência da extração
- Persistir `pendingExtractions` / `processedExtractions` em disco para sobreviver a restart.

## Eventos
- Reduzir event spam.
- Não persistir ações banais como eventos importantes.
- Refinar relevância de eventos/milestones.
- Garantir que banalidade do sandbox não vire excesso de eventos estruturados.

## Embeddings
- Reavaliar o modelo de embeddings estável em uso futuro.
- Manter embeddings como retrieval, não autoridade de merge/estado.

# RETRY / EDIT — PENDÊNCIAS

- Revisar Edit em casos em que ainda possa estar restritivo demais.
- Avaliar arquitetura futura com snapshot/rollback por turno.
- Confirmar manualmente comportamento de Retry em falha real.
- Revalidar Retry + D20 para garantir reutilização/consistência do resultado resolvido.
- Confirmar que Retry/Edit não criam conhecimento novo nem duplicam eventos.
- Testar regressões de “aba de pensamento”/blocos auxiliares se reaparecerem.

# NPC / RELAÇÕES / EPISTEMOLOGIA — VALIDAÇÃO REAL

- Testar drift de personalidade em campanhas longas reais.
- Testar vazamento de secrets.
- Testar múltiplas crenças conflitantes e cadeias longas de informação.
- Revalidar relações assimétricas e estados sociais contraditórios.
- Monitorar crescimento de `importantHistory`.
- Confirmar que romance/confiança continuam graduais e não viram medidor implícito.
- Testar multiculturalidade e variedade de nomes em campanhas longas.
- Confirmar que o blacklist de nomes/clichês não ficou rígido demais.

# D20 — VALIDAÇÃO REAL

- Revalidar repetição de ação sem mudança material.
- Confirmar Retry/Edit com testes já resolvidos.
- Validar `SUCCESS_WITH_COST` para que o custo seja concreto e proporcional, não punição aleatória.
- Confirmar que críticos respeitam limites físicos.
- Confirmar fallback forçado 429/503 sem contradição narrativa.

# CONTINUIDADE / SANDBOX — VALIDAÇÃO REAL

- Campanhas longas com múltiplos deslocamentos, ferimentos, quests e itens consumidos.
- Confirmar ausência de retcons silenciosos.
- Confirmar Retry/Edit idempotentes em campanha real.
- Testar conflito WORLD_TRUTH / Foundation / contexto recente.
- Validar que retrieval preserve continuidade sem inflar contexto.
- Confirmar que cenas quietas continuam quietas após muitos turnos.
- Confirmar que autonomia do mundo não vira event spam off-screen.
- Validar que oportunidades perdidas/NPCs indisponíveis pareçam consequência natural, não punição arbitrária.

# ONBOARDING / HOME / UI — VALIDAÇÃO PRÁTICA

## Mobile real
- Testar 320px, 375px e 430px.
- Testar iOS Safari e Chrome Android.
- Teclado virtual.
- `100dvh`.
- Composer multilinha.
- Drawers.
- Onboarding denso / Foundation.
- Touch targets.
- Selected/hover em touch.

## Home
- Testar 0 campanhas.
- Testar 1 campanha.
- Testar várias campanhas.
- Confirmar atalhos `Surpreenda-me` / `Tenho uma ideia`.

## Settings
- Revalidar controles segmentados em 320px.
- Revisar se botão `Concluído` é necessário.
- Revisar exibição de tamanhos exatos em px se ainda gerar ruído.

## Chat
- Testar 429/503 reais.
- Revisar se chip `Fallback` deve migrar totalmente para Developer Mode.
- Revisar linguagem de erros.
- Tornar opcional, se ainda desejado, itálico estilístico/cor narrativa e modo editorial neutro.

# BIBLIOTECA / CAMPANHAS — PENDÊNCIAS

## Biblioteca
- Revalidar fluxo de reutilização de premissas antigas.
- Revisar micro UX de tropes.
- Revisar truncamento de premissas longas.
- Validar ações em 320px.
- Revisar feedback de trope duplicado.

## Gestão de campanhas
- Duplicar campanha continua em standby.
- Antes de implementar, definir exatamente o que é clonado.
- Testar rename/delete em históricos grandes e títulos longos.

# JOURNAL / INFORMAÇÕES — PENDÊNCIAS LEVES

- Melhorar atualização de nomes/identidade de NPCs descobertos depois.
- Revalidar divergências Journal × Informações se reaparecerem.
- Confirmar que badges/estados qualitativos vêm de dados persistidos/autorizados.
- Evitar duplicidade entre “última ocorrência relevante” e Diário.
- Confirmar que clima/momento do dia só aparecem quando houver dados reais.

# MODELOS / BACKEND — VALIDAÇÃO

- Confirmar em execução real que Technical Diagnostics mostra o modelo realmente usado no turno, inclusive fallback.
- Revalidar cadeia 429/503 com `gemini-3.8-flash` como prioridade.
- Evitar aliases `*-latest` / previews salvo necessidade técnica comprovada.
- Validar Function Calling / Structured Outputs / thinking com a cadeia final.
- Revisar se fallback procedural deve ser sinalizado apenas em Developer Mode.

# AI STUDIO / AMBIENTE

- Preview do AI Studio pode pular foco para Build durante gerações longas.
- Confirmar se o comportamento desaparece fora do AI Studio/local.

# PRIORIDADE RECOMENDADA PARA O PRÓXIMO CHAT

1. Polida técnica da criação de campanha.
2. Corrigir `O mestre escolhe tudo`.
3. Projetar/implementar `Foco da premissa` + campos adaptativos.
4. Refino da geração de cenários menos roteirizados / mais cotidianos.
5. Integrar `MemoryInspector` ao Developer Mode.
6. Teste jogando real focado em:
   - repetição
   - variedade de nomes
   - ritmo
   - tamanho de respostas
   - NPCs
   - naturalidade
   - padrões de IA
   - banalidade/cotidiano
   - autonomia do mundo
7. Depois, atacar pendências encontradas em playtest.

# RELATO ATUAL — CRIAÇÃO DE CAMPANHA

- Falha funcional relatada em `Criar minha ideia` / `Escrever minha ideia`, além de `O mestre escolhe tudo`. Identificar em qual transição falha e a causa antes de alterar handlers ou locks; ainda sem evidência de execução/código nesta conversa.
- A ação com rótulo literal `Mudar cenário` continua aparecendo acima de `Voltar`. Revisar destino e redundância nessa etapa; não confundir automaticamente com `Mudar método`.
- Usuário relata duas barras de rolagem e conteúdo preso em uma caixa interna. Hipótese: rolagem aninhada; confirmar por inspeção visual/DOM. Preferência: uma única área principal de rolagem no fluxo, sem caixa interna rolável desnecessária, mantendo todo o conteúdo e as ações acessíveis.
- Priorizar esses três relatos na polida técnica da criação, antes de Foco da premissa.

# ATUALIZAÇÃO v51 — DETALHAMENTO DOS BUGS

- Regra de versionamento solicitada: incrementar a versão do backlog a cada atualização entregue (v51, v52, etc.), mantendo continuidade do arquivo.
- `Criar minha ideia`: entrada na etapa funciona; usuário preenche a ideia e, ao avançar, o fluxo trava sem feedback visível. Investigar submit, validação, estado assíncrono, loading, erro e transição; causa ainda não confirmada.
- `Voltar` no fluxo de ideia livre leva indevidamente à tela de três cenários/gerar opções. Revisar histórico/rota de retorno por método e etapa, preservando o texto informado. Não presumir que todo retorno deve ir à seleção de cenários.
- A ação de aceitar/avançar exige rolar todo o conteúdo. Preferência do usuário: ação principal no mesmo rodapé de `Voltar`, acessível sem chegar ao fim do conteúdo. Avaliar rodapé persistente e uma única área principal rolável, sem sobreposição nem conteúdo inacessível com teclado virtual.
- Usuário ofereceu link do GitHub para inspeção direta; aguardar link para confirmar causas no código.

# ATUALIZAÇÃO v52 — INSPEÇÃO DO CÓDIGO NO GITHUB

Repositório: bhasskr/RPG-Master, branch main. Arquivo: src/components/NewCampaignModal.tsx, blob 42cff07edce009fb819488eeb8d73e37d412f013. Diagnóstico estático; sem execução do app e sem alteração do repositório.

- Confirmado: `handleSubmitCustomIdea` apenas chama `setSelectedMode('generate_foundation')`; não envia `customIdeaText`, não chama geração e não prepara cenário/Foundation. A renderização sem dados cai em `null`, explicando o vazio após avançar.
- Confirmado: `handleBackNavigation` em `generate_foundation` retorna incondicionalmente para `generate_scenarios`, independentemente do método de origem.
- Confirmado: `Mudar cenário` existe dentro do corpo de Foundation além do `Voltar` global. Consolidar navegação respeitando origem.
- Confirmado: corpo do modal tem `overflow-y-auto`; diversas etapas também têm `sm:max-h-[50/60/62vh]` e `sm:overflow-y-auto`, criando rolagem aninhada.
- Confirmado: rodapé persistente só inclui ação primária em `generate_scenarios`. Foundation e várias outras etapas mantêm o avanço dentro do corpo rolável. Migrar ações primárias para o rodapé comum com validação/submit preservados.
- `O mestre escolhe tudo`: handler chama API, mas só entra em `master_proposal` após sucesso; loading/erro dessa proposta estão nessa tela. Verificar feedback no ponto de entrada e recuperação de falha. Não confundir com ausência de chamada no fluxo livre.
- Próxima correção localizada: ideia livre + retorno por origem; em seguida consolidar rolagem e rodapé. Validar manualmente após implementação e verificar dados antigos no draft.

# ATUALIZAÇÃO v53 — AUDITORIA DIRETA DO REPOSITÓRIO

## Escopo e evidência
- Snapshot main: e2cb52b69da635ee90987e815dad7b00445391b5.
- Leitura dirigida de NewCampaignModal, App, api.ts, server.ts, GameEngine, TurnProcessor, GameStateManager, trechos de MemoryManager/scenarioGenerator, modelPolicy, configuração Vite e testes custom_idea_flow/scenario_selection_ux.
- Executados métodos reais de GameEngine e api.ts em Node, removendo tipos/imports e injetando dependências simuladas. Nenhum Gemini chamado, nenhuma campanha real alterada, nenhum commit publicado.
- Esta é auditoria dirigida, não auditoria completa do projeto. Build, DOM/mobile, integração com Gemini, D20 e isolamento epistemológico integral ainda não foram validados nesta rodada.

## Alta prioridade — falhas reproduzidas isoladamente
1. Retry destrutivo em erro: GameEngine.retryLastPlayerAction apaga resposta anterior antes de retrieval/narração (linhas 335–337); falha simulada da narração deixou apenas a mensagem do usuário. Substituição deve ocorrer após sucesso, com preservação do estado anterior em falha.
2. Edit parcialmente aplicado em erro: GameEngine.editLastPlayerAction atualiza texto do jogador e apaga resposta antes da nova narração (465–473). Falha simulada deixou texto editado sem resposta. Necessita operação transacional/recuperação coerente; não marcar resolvido apenas por mudança visual.
3. Reenvio duplica ação/turno: processPlayerAction avança turno e persiste mensagem antes da narração (133–143); duas chamadas com falha simulada gravaram duas ações iguais em turnos diferentes. App.handleRetry reenvia via handleSendMessage. Rever identidade da operação e retomada de falha.
4. fetchWithRetry repete POST automaticamente em erro de rede: simulação do api.sendMessage produziu duas requisições. Se o servidor aceitou a primeira e a resposta se perdeu, pode haver dupla execução. Rotas e GameEngine inspecionados não recebem chave de idempotência. Incluir criação de campanha, envio, Retry/Edit na solução, sem concluir que duplicação ocorre em toda falha.

## Criação — confirmação e detalhamento
5. Ideia livre sem chamada: handler real executado apenas mudou modo; api.generateScenarioFromIdea e endpoint /api/scenarios/from-idea já existem. Conectar fluxo existente em vez de criar backend paralelo.
6. Origem não atualizada: setFoundationSourceMode só aparece na inicialização/reset e no caminho manual; ideia livre e mestre não registram sua origem. Além do retorno incondicional de Foundation, pode deixar origem manual antiga contaminando retornos seguintes.
7. Mestre: requisição existe, mas tela master_proposal só abre após sucesso; na entrada creation_method não há feedback correspondente nem bloqueio dos demais métodos. Respostas atrasadas também não têm invalidação após fechar/trocar fluxo. Confirmado por inspeção; reproduzir no componente após correção.
8. Foundation anterior não é invalidada de maneira consistente na troca de entrada; custom_idea pode exibir dados antigos porque somente muda a etapa. Associar resultado à entrada que o gerou e preservar apenas resultados ainda válidos.
9. Rolagem aninhada, ações no corpo e Mudar cenário duplicado: confirmados no v52; continuam abertos.

## Memória — integração faltante e janela de concorrência
10. Rota /api/message usa GameEngine.processPlayerAction, que extrai memória via processPostTurnMemoryExtraction. TurnProcessor possui pendingExtractions/processedExtractions, mas não é chamado por esse caminho. Falha no extractor principal é capturada e apenas registrada no console. A pendência existente deve incluir integrar recuperação ao caminho real, além de persistir a fila.
11. Extração é assíncrona e hasMutations é escrito depois de validar/aplicar. Retry/Edit consultam o marcador antes disso; existe janela em que o turno ainda parece editável, e a extração anterior pode continuar depois da troca de narrativa. Risco sustentado por ordem do código; exige teste de concorrência antes de fechar solução.

## Testes — cobertura insuficiente
12. custom_idea_flow.test.ts chama gerador diretamente, sem renderizar/clicar no modal; sua checagem de aderência só exige texto não vazio. Não detecta handler desconectado nem perda real de constraints.
13. scenario_selection_ux.test.ts usa buscas de strings e funções simuladas separadas do componente. Verificação de duplicidade procura outro rótulo, não Mudar cenário. Não comprova comportamento real de UI ou mobile. Substituir/complementar os casos críticos com integração do componente e requisições controladas.

## Ordem sugerida após auditoria
- Corrigir ideia livre + origem/retornos + feedback do mestre, em escopo localizado.
- Resolver perda de resposta e idempotência de envio/Retry/Edit antes de playtests longos com estado valioso.
- Consolidar rodapé/rolagem da criação.
- Integrar recuperação de extração ao caminho de produção e validar concorrência com Retry/Edit.
- Continuar foco da premissa, geração e Memory Inspector conforme backlog; sem declarar arquitetura inteira reaberta.

# ATUALIZAÇÃO v54 — MÉTODO PERMANENTE E PRIMEIRO PROMPT

- Regra permanente solicitada pelo usuário: antes de cada prompt técnico ou decisão de implementação, pesquisar métodos pertinentes ao assunto (UI, UX, programação, narrativa/sistemas de jogo etc.), priorizando documentação oficial e referências profissionais. Usar evidência para decidir abordagem; referências comunitárias são complementares, quando relevantes.
- Prompts médios e localizados: contexto mínimo → arquivos/seções prováveis → mudança exata → invariantes → testes → relatório esperado. Inspecionar código atual; separar achados reproduzidos, inspeção estática e hipóteses. Não inventar resultados de testes nem considerar testes que copiam lógica como prova de integração.
- Referências de prompting consultadas: https://ai.google.dev/gemini-api/docs/prompting-strategies ; https://ai.google.dev/gemini-api/docs/aistudio-build-mode ; https://code.claude.com/docs/en/best-practices ; https://openai.com/business/guides-and-resources/how-openai-uses-codex/
- Primeiro prompt preparado: preservação da resposta anterior em Retry; estado: pronto para implementação no AI Studio, NÃO corrigido/testado após mudança.
- Abordagem: gerar candidato sem apagar histórico, excluir resposta antiga somente do contexto temporário do narrador, confirmar substituição segura após sucesso e testar falha de geração/persistência; preservar regras mecânicas e metadados autoritativos.
- Novo achado de inspeção: FilePersistentMemoryStore.updateMessage/deleteMessage alteram cache antes de writeFile; saveMessage captura falha de gravação sem propagar. InMemoryStore.updateMessage substitui metadata por shallow merge, enquanto FilePersistentMemoryStore mescla metadata. Considerar essas diferenças nos testes do Retry.
- Pendência adicional de persistência geral: revisar escrita concorrente de JSON, propagação de erros e coerência cache/disco além do caminho de Retry. Fontes técnicas: https://nodejs.org/api/fs.html ; https://www.man7.org/linux/man-pages/man2/rename.2.html . Não prometer durabilidade contra queda de energia só por rename.
- Continuam pendentes: Edit, idempotência geral de POST, integração de extrações pendentes/concorrência, UI de criação e decomposição gradual de NewCampaignModal durante alterações pertinentes. Antes de mudanças externas, verificar branch sincronizada no AI Studio.

# ATUALIZAÇÃO v55 — RELACIONAMENTOS SEM EVIDÊNCIA REFERENCIADA

- Usuário trouxe teste falhando: delta de trust/hostility aceito sem evento associado, apenas reason. Conferência atual de memoryValidator.ts, extractor/types.ts e MemoryManager confirma ausência de validação de referência nesse caminho. Teste do usuário não foi reexecutado nesta rodada.
- ExtractedRelationshipChange nem possui eventId/sourceEventId no contrato atual. Correção exige alinhar proposta/schema, validação e persistência, não adicionar apenas um if a campo inexistente.
- reason também dispara atualização sem delta e é anexado a importantHistory. Deltas reaplicados podem somar novamente, pois não há identidade de efeito/evento aplicada neste bloco. Validar Replay/Retry com o mesmo efeito.
- Prioridade alta: Engine precisa exigir causa/evidência persistida e autorizada para mutação social; texto livre do extractor não é evidência independente. Existência de eventId não basta: mesma campanha, vínculo causal/atores relevantes, acesso epistemológico e efeito ainda não aplicado.
- Regra trazida pelo teste: Relationship só muda via Event referenciado. Preservar se canônica; confirmar desenho na implementação sem criar grandes eventos de Diário para toda interação banal. Evento técnico causal pode ter relevância de exibição separada; alternativa turn/message evidence só mediante decisão explícita de mudar contrato.
- Rumor/crença falsa pode causar reação social legítima quando NPC recebeu a informação; referência deve sustentar a aquisição/crença, sem converter conteúdo em WORLD_TRUTH.
- Achado adicional estático em updateRelationship: lookup considera A/B e B/A equivalentes; auditar compatibilidade com relações assimétricas antes de declarar suporte completo. Pendente, separado da correção causal.
- Manter rodada de Retry em andamento; tratar rastreabilidade/idempotência social em prompt próprio antes de playtest de relações. Sem nova implementação nesta rodada.
- Referência conceitual consultada: W3C PROV https://www.w3.org/TR/prov-overview/ — rastreabilidade descreve derivação/origem; não determina a regra específica de eventId do RPG.

# ATUALIZAÇÃO v56 — RELATÓRIO DE RETRY RECEBIDO, SINCRONIZAÇÃO PENDENTE

- Usuário trouxe relatório do AI Studio informando correção de Retry, replaceMessage, escrita temporária/rename, lock por campanha, controle de conflitos e 5 cenários aprovados, além de build/tsc/persistência. Resultados relatados, não reproduzidos nesta revisão.
- Conferência atual do GitHub: gameEngine.ts ainda apaga mensagem antes da geração (abertura e turno normal); FilePersistentMemoryStore ainda não contém replaceMessage e mantém escrita direta. tests/retry_preservation.test.ts retornou 404 na branch padrão.
- Status: implementação relatada no AI Studio, aguardando código sincronizado ou branch/commit correto para revisão independente. Não marcar correção como validada nem concluir que o relatório é falso.
- Próximo passo: sincronizar mudanças do AI Studio ao repositório e revisar implementação/testes reais, incluindo janela entre checagem de conflito e substituição protegida.

# ATUALIZAÇÃO v57 — REVISÃO DO COMMIT DE RETRY SINCRONIZADO

- Commit confirmado na branch `main`: `1f4990b64043827736e072158e5129f632440c64` (`feat(engine): implement atomic message replacement`), pai `e2cb52b...`.
- `replaceMessage` agora existe e os caminhos de Retry de abertura/turno normal usam substituição sem delete prematuro.
- Limitação confirmada: a checagem de conflito acontece fora de `executeWithCampaignWriteLock`; duas operações concorrentes podem ambas validar o mesmo estado e depois substituir sequencialmente. O lock serializa a escrita, mas não torna check+replace uma operação atômica. Necessário teste concorrente real e, se mantida a garantia, compare-and-swap dentro do lock.
- Limitação confirmada: `tests/retry_preservation.test.ts` simula falha de persistência substituindo `memoryStore.replaceMessage` por uma função que lança antes do store; isso testa propagação no Engine, mas não falha real de `writeFile`/`rename` nem a preservação do disco durante erro de I/O.
- Limitação confirmada: `saveSnapshot` continua atualizando cache antes de `fs.writeFile` e suprime erro. A correção de mensagem não corrige a durabilidade de snapshots estruturados.
- `retryLastPlayerAction` usa `freshRecentMessages` limitado a 12 mensagens para validar que a resposta continua sendo a última; campanhas com mais mensagens podem ter uma janela de leitura truncada. Verificar sem presumir bug até teste direcionado.
- Status do relatório: implementação sincronizada e parcialmente validada; não marcar garantias de atomicidade/conflito/durabilidade geral como completas até cobrir esses pontos.

# ATUALIZAÇÃO v58 — EDIT: AUDITORIA SINCRONIZADA COM GITHUB

- Sincronização confirmada com `main`: HEAD permanece em `1f4990b64043827736e072158e5129f632440c64`.
- `editLastPlayerAction` continua destrutivo: atualiza a mensagem do jogador e remove a resposta do Narrador antes de retrieval/geração.
- Se retrieval, Gemini ou persistência da nova resposta falhar depois disso, o histórico pode ficar parcialmente aplicado: ação editada persistida sem resposta correspondente.
- Edit continua bloqueando ações com `hasMutations` e com D20 resolvido; preservar essas invariantes nesta rodada.
- Próxima correção deve seguir o princípio do Retry: gerar candidato usando contexto temporário e só substituir o par user+assistant após sucesso.
- Como Edit altera duas mensagens relacionadas, preferir operação de commit/coerência do par dentro de uma única seção crítica por campanha; evitar `updateMessage` seguido de `replaceMessage` em locks separados.
- Exigir detecção de conflito antes do commit: IDs/conteúdo/turn/metadata relevantes ainda devem corresponder ao snapshot inicial e nenhuma nova mensagem pode ter entrado no histórico.
- Falha de geração deve preservar integralmente texto antigo do jogador + resposta antiga do Narrador.
- Falha de persistência durante commit não deve deixar apenas metade do par editado; adicionar teste específico do store/commit, além de teste no Engine.
- Preservar turn, IDs/posição do histórico quando apropriado e metadados mecânicos autorizados; não permitir reroll silencioso de D20.
- Não misturar esta rodada com UI, ideia livre, relacionamentos, idempotência geral de POST ou snapshot/rollback completo.
- Pesquisa de implementação: Node.js documenta que operações concorrentes de filesystem não são sincronizadas/thread-safe e requerem cuidado; prompt para Gemini deve ser curto, preciso e localizado.

# ATUALIZAÇÃO v59 — EDIT SINCRONIZADO E REVISADO

- Commit sincronizado na `main`: `1b8635a74301fc593f11f15935dd76d17f5b744a` (`feat(memory): add atomic turn replacement support`), um commit à frente de `1f4990b...`.
- Diff real confirmado: `gameEngine.ts`, `filePersistentStore.ts`, `inMemoryStore.ts`, `memoryManager.ts`, `types.ts` e novo `tests/edit_preservation.test.ts`.
- `editLastPlayerAction` agora gera usando contexto temporário sem persistir previamente a ação editada nem apagar a resposta antiga.
- Antes do commit há validação de conflito no Engine; o commit final usa `replaceTurnMessages`.
- `FilePersistentMemoryStore.replaceTurnMessages` faz validação de `ExpectedTurnState` dentro de `executeWithCampaignWriteLock`, grava uma cópia completa via arquivo temporário + `fs.rename` e só atualiza o cache após sucesso no disco.
- O par user+assistant é substituído como uma única operação lógica; falha de persistência não deve deixar metade do par no cache.
- Memory extraction é disparada somente após commit bem-sucedido.
- Teste `tests/edit_preservation.test.ts` existe no commit e usa `FilePersistentMemoryStore` real em diretório temporário; cobre sucesso, falha de Narrador, falha de retrieval, falha de persistência, conflito concorrente, `hasMutations`, D20, extração condicional e dois Edits concorrentes.
- Status: correção principal do Edit pode ser considerada concluída e sincronizada.
- Ressalva de follow-up: o CAS dentro do lock valida ID/conteúdo/turno e `hasMutations`, mas não valida `diceRolls` nem um fingerprint completo do metadata dentro da seção crítica. O Engine revalida D20 imediatamente antes, fora do lock. Não bloqueia o fechamento desta rodada, mas vale endurecer futuramente se metadata concorrente puder mudar entre pre-check e commit.
- Outra ressalva geral permanece separada: durabilidade/atomicidade de snapshots estruturados e idempotência geral de POST ainda não foram resolvidas por esta mudança.

# ATUALIZAÇÃO v60 — IDEMPOTÊNCIA DE POST / REENVIO

## Edit — concluído
- `editLastPlayerAction` marcado como concluído nesta rodada após implementação, sincronização e revisão do commit `1b8635a74301fc593f11f15935dd76d17f5b744a`.
- Follow-up separado permanece para endurecer CAS de metadata/D20 dentro do lock; não manter Edit como tarefa aberta por causa disso.

## Auditoria sincronizada de idempotência
- `main` confirmada em `1b8635a74301fc593f11f15935dd76d17f5b744a`.
- `src/services/api.ts`: `fetchWithRetry` repete `fetch()` em erro de rede sem distinguir método HTTP ou mutabilidade. O mesmo helper é usado por GET e por POSTs mutáveis.
- Rotas críticas afetadas incluem `/api/message`, `/api/message/retry`, `/api/message/edit` e `/api/campaign/new`; também há POSTs de geração que podem repetir custo/chamada mesmo sem duplicar estado persistido.
- `server.ts`: rotas mutáveis não recebem `Idempotency-Key`/operationId nem possuem camada de deduplicação.
- `GameEngine.processPlayerAction`: avança turno e grava a mensagem do jogador antes da chamada do Narrador. Se a requisição for processada e a resposta HTTP se perder, um retry indistinguível pode criar nova ação/novo turno.
- Próxima correção deve separar retry de transporte de replay de operação: POST mutável só pode ser repetido automaticamente se carregar a mesma chave de idempotência.
- Cliente deve gerar uma chave única por ação lógica e reutilizar a mesma chave apenas nas tentativas automáticas daquela ação. Novo clique/envio intencional deve gerar nova chave.
- Servidor deve comparar chave + rota/escopo + fingerprint do payload; mesma chave com payload diferente deve retornar conflito.
- Concorrência com a mesma chave deve compartilhar/aguardar uma única execução, não executar o Engine duas vezes.
- Para `/api/message`, preferir que a identidade da operação chegue ao Engine/persistência para que a proteção não dependa apenas de memória RAM do processo.
- Não prometer “exactly once” só com cache em memória. Testar resposta HTTP perdida após commit, duas requisições simultâneas, mesma chave/payload diferente e restart quando a solução escolhida afirmar sobrevivência a restart.
- Manter esta rodada separada de UI, relacionamentos, pending extractions e refino narrativo.

## Referências usadas
- Google Cloud: idempotency = retries com mesmo efeito; padrão com chave única no cliente e reconhecimento server-side.
- Google Cloud HTTP/retry guidance: POST não é naturalmente idempotente; retries dependem da semântica da operação.
- Stripe API: `Idempotency-Key`, replay da resposta e rejeição de mesma chave com parâmetros diferentes.
- Gemini 3 prompting: instruções concisas, diretas e específicas; evitar prompt excessivamente engenheirado.
- Anthropic prompting: contexto suficiente, sucesso explícito, passos apenas quando ordem/completude realmente importam.

# ATUALIZAÇÃO v61 — IDEMPOTÊNCIA SINCRONIZADA, DURABILIDADE COM RESSALVA

- Commit sincronizado na `main`: `c7ee84931cb8114d9660e04a3e0ce85db4a3f3bd` (`feat: implement idempotency service for API requests`).
- Implementação principal confirmada no código: `Idempotency-Key` por operação lógica no cliente, retry automático de métodos mutáveis somente com chave, deduplicação server-side por rota + escopo + chave, fingerprint SHA-256 canônico, conflito 409 para mesma chave/payload divergente, compartilhamento de request in-flight e replay de resposta concluída.
- Rotas mutáveis principais estão protegidas por `withIdempotency`: mensagem, Retry, Edit, criação de campanha, rename, delete e limpeza de logs.
- Persistência de registros concluídos em `data/rpg_idempotency` existe e o replay após restart bem-sucedido está coberto por `tests/idempotency.test.ts`.
- A suíte dedicada existe e cobre os 9 cenários relatados, inclusive concorrência, resposta perdida, conflito 409, nova chave, Retry, Edit, criação, política de `fetchWithRetry` e restart.
- Status funcional principal: implementado e sincronizado.

## Ressalva bloqueadora para declarar durabilidade completa
- `IdempotencyManager.saveRecord` atualmente chama `inMemoryCache.set(...)` ANTES de `writeFile + rename`.
- Erros de persistência são capturados e apenas logados; não são propagados.
- Consequência: a operação pode ser devolvida como concluída e replayar corretamente enquanto o processo está vivo, mesmo que o registro nunca tenha sido salvo em disco. Após restart, a proteção daquela operação pode desaparecer.
- A suíte atual testa restart depois de gravação bem-sucedida, mas não injeta falha real de `writeFile`/`rename` para validar essa propriedade.
- Próxima correção localizada: construir/escrever o registro em arquivo temporário, `rename`, e somente então atualizar cache; falha de persistência deve ser explicitamente tratada de acordo com a garantia escolhida, sem afirmar durabilidade se a gravação falhou.
- Adicionar teste de falha real/injetada de I/O que confirme que cache e disco não divergem silenciosamente e que o comportamento após restart é definido.
- Não reabrir a arquitetura geral de idempotência; corrigir apenas a durabilidade do registro.
- Follow-up não bloqueador: definir retenção/TTL/limpeza de registros para evitar crescimento indefinido de `data/rpg_idempotency`.

# ATUALIZAÇÃO v62 — DURABILIDADE CORRIGIDA, LIMPEZA DE ARTEFATOS AINDA PENDENTE

- O hash curto informado pelo AI Studio (`f6ca301`) não existe na `main`. O commit realmente sincronizado é `d23538445daac24b92f32921313e6c8561f11b58` (`fix(idempotency): ensure atomic persistence for records`).
- A correção de `saveRecord` está correta no código: `writeFile` -> `rename` -> `inMemoryCache.set`. Em falha, tenta remover o temporário, remove a chave do cache e propaga `IdempotencyPersistenceError`.
- A suíte `tests/idempotency.test.ts` foi ampliada com cenários de falha de `writeFile` e `rename`, além dos cenários anteriores.
- A pendência de durabilidade cache/disco pode ser considerada concluída funcionalmente.

## Problema de higiene do commit / testes
- O commit `d235384...` adicionou por engano dezenas de artefatos gerados pela própria suíte em `data/test_idem_...`.
- Entre eles há snapshots de GameState, arquivos de chat, registros de idempotência e pelo menos um arquivo `.tmp` do cenário de falha de `rename`.
- Isso contradiz a expectativa de que a suíte deixe o repositório limpo e indica que o cleanup do teste não removeu tudo antes do commit.
- `.gitignore` atual não ignora `data/test_*`, `data/test_idem_*` nem arquivos `*.tmp.*`.
- Próxima correção localizada: remover do repositório todos os artefatos de teste versionados por engano; garantir cleanup em `finally`/fim da suíte; adicionar ignore específico para diretórios/temporários de testes sem ignorar os dados persistentes reais necessários ao projeto.
- Reexecutar `tests/idempotency.test.ts` e confirmar `git status` limpo após a suíte.
- Não reabrir a lógica de idempotência; é uma correção de higiene/isolamento de testes e repositório.

## Status consolidado
- Retry: concluído.
- Edit: concluído.
- Idempotência funcional: concluída.
- Durabilidade de registro idempotente: concluída.
- Limpeza/isolamento dos artefatos da suíte de idempotência: pendente e deve ser feita antes de seguir.

# ATUALIZAÇÃO v63 — HIGIENE DA SUÍTE DE IDEMPOTÊNCIA CONCLUÍDA

- O hash curto informado pelo AI Studio (`3abb38e`) não existe na `main`. O commit realmente sincronizado é `949af1cdbb383535d78dd21354f3081f5cc15d09` (`test: improve isolation and cleanup`).
- `tests/idempotency.test.ts` agora cria `testBaseDir` com `fs.promises.mkdtemp(path.join(os.tmpdir(), 'rpg_idem_test_'))`, fora da árvore do projeto.
- A suíte envolve a execução em `try/finally` externo e remove o diretório inteiro com `fs.promises.rm(testBaseDir, { recursive: true, force: true })`.
- `globalThis.fetch`, `fs.promises.writeFile` e `fs.promises.rename` são restaurados em `finally`.
- Há validação pós-execução de que `testBaseDir` não existe mais e de que `data/` não contém `test_idem_*`/`idem_io_*`.
- `.gitignore` ganhou proteção específica para `data/test_*`, `data/test_idem_*` e `*.tmp.*`, sem ignorar toda a pasta `data/`.
- O commit removeu os artefatos efêmeros previamente versionados.
- Status: limpeza/isolamento da suíte de idempotência concluído e sincronizado.

## Estado consolidado do bloco backend recente
- Retry não destrutivo: concluído.
- Edit transacional: concluído.
- Idempotência de POST/reenvio: concluída.
- Durabilidade do registro idempotente em disco: concluída.
- Higiene/isolamento dos testes de idempotência: concluída.

## Próximos follow-ups separados
- CAS de Retry ainda pode ser endurecido para check+replace no mesmo lock.
- CAS de Edit pode futuramente incluir fingerprint mais completo de metadata/D20 dentro do lock.
- Definir retenção/TTL/limpeza de `data/rpg_idempotency` para evitar crescimento indefinido.
- Snapshots estruturados ainda têm pendência separada de cache antes da persistência.

# ATUALIZAÇÃO v64 — AUDITORIA DE SNAPSHOTS E CONSISTÊNCIA CACHE/DISCO

- `main` sincronizada em `949af1cdbb383535d78dd21354f3081f5cc15d09`.
- Problema confirmado em `FilePersistentMemoryStore.saveSnapshot`: o snapshot recebido é mutado (`updatedAt`), colocado em `snapshotCache` e só depois escrito diretamente no arquivo final; erro de escrita é apenas logado.
- `clearSnapshot` também remove o cache antes de confirmar a remoção em disco e não propaga falhas de `unlink` diferentes de ENOENT.
- Há um problema adicional de aliasing: `getSnapshot` devolve diretamente a mesma referência armazenada em `snapshotCache`. O `MemoryManager` modifica esse objeto in-place antes de `saveSnapshot`; portanto, apenas mover `snapshotCache.set` para depois do disco NÃO resolve a divergência.
- Correção deve usar snapshots destacados/copy-on-write: leituras não podem expor a referência interna do cache; mutações trabalham em uma cópia e o cache só recebe a versão confirmada após persistência.
- `saveSnapshot` deve seguir o padrão já usado nas mensagens: lock por campanha, serialização de uma cópia, arquivo temporário, `rename`, cache por último e erro propagado.
- `clearSnapshot` deve ser coerente: lock por campanha, remoção em disco primeiro (ENOENT pode ser tratado como estado já removido), cache removido somente depois; demais erros devem propagar.
- `MemoryManager.persistSnapshot` gera/atualiza `semanticRecords` dentro do próprio snapshot antes da gravação. Isso é aceitável se tudo ocorrer sobre uma cópia de trabalho que só vira estado autoritativo após `saveSnapshot` bem-sucedido.
- Não confundir embeddings/semanticRecords com autoridade: snapshot persistido continua sendo a fonte de verdade.
- Testes necessários: falha real/injetada em `writeFile`, falha em `rename`, falha em `unlink`, cache não muda em falha, disco não fica parcial, caller snapshot não deve contaminar cache antes do commit, leitura retornada não pode permitir mutação indireta do cache, restart lê última versão confirmada.
- Concorrência de dois read-modify-write estruturados pode ainda causar lost update mesmo com write lock apenas no `saveSnapshot`; avaliar no teste. Se confirmado, registrar como follow-up ou implementar serialização do ciclo de mutação sem ampliar desnecessariamente esta rodada.
- Referência técnica: Node alerta que múltiplas modificações concorrentes de filesystem não são sincronizadas; padrão interno já adotado no projeto é temp file + rename + cache após sucesso.

# ATUALIZAÇÃO v65 — CONSISTÊNCIA DE SNAPSHOT CONCLUÍDA, LOST UPDATE SEPARADO

- O hash curto informado pelo AI Studio (`e279fe9`) não existe na `main`. O commit realmente sincronizado é `ba35db504630173669ce81b7db8da4de8493cb64` (`fix(memory): prevent cache mutation via deep cloning`).
- `FilePersistentMemoryStore.getSnapshot` agora retorna cópia profunda destacada; o cache interno não é mais exposto por referência.
- `saveSnapshot` trabalha sobre `workingCopy`, executa sob lock por campanha, grava em arquivo temporário, faz `rename` e só depois atualiza `snapshotCache`.
- Falhas de `writeFile`/`rename` limpam temporário quando possível, propagam erro e preservam a última versão confirmada do cache.
- `clearSnapshot` agora executa sob lock, remove o disco primeiro, trata `ENOENT` como já removido e só então limpa o cache; demais erros propagam.
- Nova suíte `tests/snapshot_persistence.test.ts` foi adicionada no commit e cobre anti-aliasing, sucesso, falhas de I/O, clear, restart, concorrência física e integração com `MemoryManager`.
- Status: consistência física cache/disco e isolamento de referência dos snapshots concluídos e sincronizados.

## Follow-up separado — lost update lógico
- O lock atual serializa `saveSnapshot`, mas não o ciclo completo `getSnapshot -> mutate -> saveSnapshot`.
- Dois fluxos concorrentes podem ler a mesma versão base, aplicar mutações diferentes e o segundo commit sobrescrever a primeira alteração sem corromper o arquivo.
- Isso não reabre a correção de persistência física; é um problema distinto de controle de concorrência em nível de aplicação.
- Próxima solução a avaliar: versionamento otimista (`snapshotVersion`/`expectedVersion`) ou transação completa por campanha no `MemoryManager`.

# ATUALIZAÇÃO v66 — AUDITORIA TRANSVERSAL DE CÓDIGO + UI VISUAL + REPRIORIZAÇÃO

## Base auditada
- `main` sincronizada em `ba35db504630173669ce81b7db8da4de8493cb64`.
- Auditoria transversal dos fluxos centrais, não uma leitura linha-a-linha de todo o repositório:
  - `src/App.tsx`
  - `src/services/api.ts`
  - `src/components/ChatView.tsx`
  - `src/components/MessageInput.tsx`
  - `src/components/Sidebar.tsx`
  - `src/components/HomeView.tsx`
  - `src/components/NewCampaignModal.tsx`
  - `src/components/ui/DrawerShell.tsx`
  - `src/components/ui/Tabs.tsx`
  - `server/engine/gameEngine.ts`
  - `server/engine/gameState/gameStateManager.ts`
  - `server/engine/memory/filePersistentStore.ts`
  - `server/engine/memory/memoryManager.ts`
  - `server/engine/memory/extractor/memoryValidator.ts`
  - `server/engine/modelPolicy.ts`
  - suítes relevantes em `tests/` e `campaign_persistence_test.ts`.
- Auditoria visual baseada nas screenshots reais enviadas pelo usuário: Home com/sem sidebar, criação de campanha, cenário/Foundation em loading, chat em turno, chat em geração e chat com indicador D20.

# NOVA PRIORIDADE CRÍTICA — BACKEND

## P0 — GameStateManager: durabilidade e coerência ainda frágeis
Confirmado no código atual:
- `createCampaign` coloca o estado em `activeStates` antes de confirmar persistência.
- `getGameState` devolve diretamente a referência interna de `activeStates`.
- `saveGameState` muta `updatedAt`, atualiza o cache e chama `persistToDisk`.
- `persistToDisk` usa `fs.writeFileSync` diretamente no arquivo final e captura/loga erros sem propagá-los.
- `advanceTurn`, `updateWorldState`, `updateCampaignFoundation`, `upsertNPC` e `upsertQuest` mutam a referência obtida do cache antes da persistência.
- `deleteCampaign` remove do cache antes de tentar remover o arquivo e engole falhas.
Consequência:
- Em falha de I/O/crash, cache e resposta da operação podem refletir um estado que não está durável.
- Após restart, GameState pode regredir enquanto chat/memória/idempotency records permaneceram avançados.
- A idempotência HTTP pode replayar uma resposta concluída mesmo que a persistência interna do GameState tenha falhado silenciosamente.
Próxima correção deve aplicar o mesmo princípio já consolidado no memory store:
`cópia destacada -> temp file -> rename -> cache por último -> erro propagado`.
Adicionar testes de write/rename/delete failure, anti-aliasing, restart e consistência com turn/world state.
Não misturar com refino narrativo/UI.

## P0/P1 — Lost update lógico na memória estruturada
Confirmado:
- `processPostTurnMemoryExtraction` roda fire-and-forget após o turno.
- Um novo turno pode começar enquanto a extração anterior ainda executa.
- O validator aplica múltiplas operações estruturadas separadas (`createEvent`, knowledge, NPC, inventory, relationship, quest).
- Cada mutação do `MemoryManager` faz seu próprio ciclo read-modify-save.
- O lock atual de `saveSnapshot` serializa a gravação física, não a transação lógica completa.
Consequência:
- Dois fluxos concorrentes podem ler a mesma versão base e commits posteriores podem sobrescrever alterações válidas anteriores sem corromper JSON.
- Há concorrência plausível entre extração atrasada do turno N, aquisição automática de conhecimento e extração/alterações do turno N+1.
Direção:
- Preferir versionamento otimista (`snapshotVersion` + `expectedVersion`) ou uma transação/mutation lock por campanha no `MemoryManager`.
- O commit físico já está correto; não reabrir temp/rename/cache.
- Cobrir teste com duas mutações semânticas concorrentes que devem coexistir ou produzir conflito explícito, nunca overwrite silencioso.

# FRONTEND — BUGS FUNCIONAIS ANTES DE POLIMENTO

## P1 — Retry manual quebra identidade da operação
Confirmado:
- `api.sendMessage` permite `customIdempotencyKey`, mas gera nova chave quando omitida.
- `App.handleSendMessage` não preserva a chave lógica fora da chamada.
- Em erro, App guarda apenas `lastFailedMessage`.
- `ErrorBanner -> handleRetry -> handleSendMessage(lastFailedMessage)` cria uma nova operação e nova chave.
Risco:
- Se o servidor concluiu a operação, mas o cliente não recebeu nenhuma resposta após os retries de transporte, o retry manual pode criar um novo turno legítimo.
Correção:
- Persistir `{payload, idempotencyKey, operationType}` da operação falha até resolução explícita.
- Retry manual da mesma operação deve reutilizar a mesma chave.
- Novo envio intencional deve gerar nova chave.

## P1 — ErrorBanner não conhece a operação que falhou
Confirmado:
- O banner global recebe um único `handleRetry`.
- Falhas de rename/delete/load/create não têm ação de retry correspondente.
- Se existir `lastFailedMessage`, um erro posterior de outra operação pode reapresentar retry de mensagem antiga.
Direção:
- `AppError`/estado de recovery deve carregar callback/descriptor da operação falha ou o banner deve esconder retry quando não há recovery correto.
- Não rotular “Tentar novamente” se a UI não puder repetir exatamente a ação falha.

## P1 — Fluxo "Tenho uma ideia" continua incompleto
Confirmado:
- `handleSubmitCustomIdea` só muda para `generate_foundation`.
- Não chama `api.generateScenarioFromIdea`.
- O endpoint e API client existem.
- `tests/custom_idea_flow.test.ts` cobre o generator/backend, não o wiring real do componente React; portanto não detecta o bug da UI.
- Back de `generate_foundation` continua retornando incondicionalmente a `generate_scenarios`.
Direção:
- Conectar o fluxo existente sem criar pipeline paralelo.
- Registrar origem real (`foundationSourceMode`).
- Foundation deve voltar à etapa/método correto.
- Associar resultados async à entrada que os gerou e invalidar resposta atrasada quando fluxo muda/fecha.

# UI VISUAL — ACHADOS CONFIRMADOS POR SCREENSHOT + CÓDIGO

## Criação de campanha — P2 alta
- Modal desktop estreito para densidade de conteúdo; `sm:max-w-lg` comprime cards e review.
- Corpo principal já é rolável e várias etapas adicionam outro `overflow-y-auto` interno: scroll aninhado confirmado visualmente e no código.
- Foundation/proposta exige scroll para acessar parte importante do conteúdo.
- Ação principal nem sempre está no rodapé comum.
- “Conflito Central” recebe destaque estrutural forte mesmo em romance/cotidiano, reforçando geração plot-driven.
- “Criar nova campanha” mostra subtítulo com estado potencialmente prematuro (“Ficcional”) antes/ao redor da decisão correspondente.
Direção:
- Uma área principal de scroll por modal.
- Rodapé persistente para Voltar + ação primária.
- Desktop mais largo (`max-w-xl`/`max-w-2xl` conforme etapa) sem virar tela cheia.
- Preservar conteúdo ao voltar.
- Reavaliar `Conflito Central` por `Situação inicial` / `Fricção inicial` / `Contexto inicial` conforme foco.

## Chat — P2
- Narrativa visualmente estreita em desktop largo; muito espaço vazio quando sidebar está aberta.
- Composer ocupa faixa vertical relativamente pesada.
- Estado “Mestre está narrando...” tem pouca presença visual.
- Botão “Mais recente” pode sobrepor/interferir na leitura.
- Mensagem longa do jogador pode dominar visualmente o turno.
- Header usa `Turno Inicial` quando `timeOfDay` está vazio, mesmo com campanha já em turnos posteriores; rótulo não representa o turno real.
- `showRollIndicators` mostra `D20` para toda resposta quando a preferência está ativa, sem checar se houve roll.
- Mesmo quando há roll, UI mostra só “D20”, desperdiçando informação mecânica útil.
Direção:
- Mostrar indicador apenas quando `metadata.diceRolls.length > 0`.
- Exibir ao menos roll/total; opcionalmente dificuldade/outcome quando disponível.
- Header deve usar turno real ou omitir “Turno Inicial” após início.
- Ajustar largura editorial de forma responsiva; não redesenhar identidade.

## Home / Sidebar — P3
- Home funciona melhor com sidebar fechada; com sidebar aberta o hero parece pequeno demais para a área disponível.
- Empty state de “Recentes” fica solto.
- Título de campanha recente trunca cedo; ações de rename/delete competem com o título.
- Developer Mode chama atenção um pouco mais do que necessário para função técnica.
Direção:
- Ajustes leves de proporção e truncamento, sem redesign.
- Considerar duas linhas/tooltip/menu secundário para campanha ativa.
- Biblioteca deve ser visualmente distinguida dos atalhos de criação.

# ACESSIBILIDADE — P3
Confirmado no código:
- `DrawerShell`: role dialog + aria-modal + Escape existem, mas não há focus trap, foco inicial nem restauração ao invocador.
- `NewCampaignModal`: role dialog + Escape existem; falta completar semântica/foco modal.
- `Tabs`: tabs têm `role=tab`/`aria-selected`, mas container não é `tablist`, não há `tabpanel`/`aria-controls`, roving tabindex ou navegação por setas.
Referência oficial WAI-ARIA:
- Modal deve conter sequência de Tab, receber foco ao abrir e devolver foco ao invocador ao fechar.
- Tabs devem usar `tablist`/`tab`/`tabpanel` e navegação por setas.

# TESTES — QUALIDADE E COBERTURA

## Cobertura forte recente
- Retry preservation.
- Edit preservation.
- Idempotency.
- Snapshot persistence.

## Lacunas/revisões
- `campaign_persistence_test.ts` só cobre caminho feliz/restart; não cobre falha real de I/O, cache divergence ou atomicidade do `GameStateManager`.
- `custom_idea_flow.test.ts` testa `scenarioGenerator.generateScenarioFromIdea`, mas não o handler/wiring real de `NewCampaignModal`; nome da suíte sugere cobertura maior do que realmente oferece.
- Adicionar teste de frontend/estado para retry manual com mesma idempotency key.
- Adicionar teste operation-specific recovery do ErrorBanner.
- Adicionar teste de D20 indicator condicional.
- Adicionar teste de navegação por origem no wizard.

# ITENS QUE PERMANECEM CONCLUÍDOS
- Retry não destrutivo.
- Edit transacional.
- Idempotência server/client em retries automáticos.
- Durabilidade do registro idempotente.
- Higiene da suíte de idempotência.
- Snapshot memory store: anti-aliasing + temp/rename + cache após commit.
Não reabrir esses itens; novos problemas acima são camadas distintas.

# PRIORIDADE RECOMENDADA v66

1. **GameStateManager: atomicidade, anti-aliasing e propagação de falha.**
   Maior risco de inconsistência persistente entre GameState, mensagens e replay idempotente.

2. **Memória estruturada: impedir lost update no ciclo read-modify-write.**
   Risco real por extrações assíncronas sobrepostas entre turnos.

3. **Frontend: preservar a mesma Idempotency-Key no retry manual + recovery específico por operação.**
   Fecha a brecha que ainda pode transformar erro de rede em turno duplicado.

4. **Criação de campanha — correção funcional.**
   `Tenho uma ideia`, Back por origem, resposta async obsoleta, `O mestre escolhe tudo`.

5. **Criação de campanha — polimento estrutural/visual.**
   Modal mais largo, uma rolagem, footer persistente, remover redundâncias e reduzir framing plot-driven.

6. **Foco da premissa + geração adaptativa + cenários menos roteirizados.**
   Só depois que o fluxo base estiver funcional e estável.

7. **Chat — semântica mecânica e proporções.**
   D20 real, header de turno, loading, largura narrativa, composer, “Mais recente”.

8. **Acessibilidade de dialogs/tabs e validação mobile real.**

9. **Developer Mode: Memory Inspector e demais painéis técnicos.**

10. **Playtest longo e debts de relações/event spam/pending extractions**, reordenando conforme bugs observados em jogo real.

# REGRA DE EXECUÇÃO
- Funcional/durabilidade antes de cosmético.
- Um problema por rodada quando houver risco de regressão.
- Sincronizar GitHub antes de cada prompt/revisão.
- Não marcar item como concluído só porque existe teste com nome semelhante; confirmar que o teste cobre o fluxo real.

# ATUALIZAÇÃO v67 — NOVOS BUGS VISUAIS/FUNCIONAIS + GAMESTATEMANAGER COMO ALVO ATUAL

## Novos bugs reportados em uso real

### Chat — botão “Mais recente” sobrepondo narrativa
- Confirmado visualmente pelo usuário: a plaquinha flutuante “Mais recente” pode ficar sobre o texto narrativo e esconder conteúdo.
- Código atual posiciona o botão de forma absoluta dentro do `ChatView`, sobre a área de leitura.
- Correção futura: reposicionar para não ocupar a superfície do texto, preferencialmente próximo ao composer/rodapé do chat ou reservar espaço estrutural para ele.
- Não corrigir nesta rodada do GameStateManager.

### Diário — NPCs/personagens narrados não são registrados
- Sintoma real: personagens introduzidos na abertura, inclusive a personagem feminina inicial da campanha observada, não aparecem no Diário.
- Causa provável confirmada arquiteturalmente:
  - `startNewCampaign` gera e grava a mensagem de abertura, mas não executa `processPostTurnMemoryExtraction` para o turno 0.
  - NPCs inventados pelo Narrador na abertura não entram automaticamente em `gameState.npcs` nem no snapshot estruturado.
  - O Diário depende do estado/memória estruturados; portanto nomes existentes apenas na prosa podem nunca aparecer.
- Também deve ser auditado se NPCs apresentados em turnos normais estão sendo extraídos/criados corretamente e se o Journal lê a fonte esperada.
- Direção futura: extração estruturada segura da abertura e/ou mecanismo explícito de registro de NPC introduzido pelo Narrador, preservando anti-retcon e epistemologia.
- Não misturar com GameStateManager nesta rodada.

## Alvo atual: GameStateManager
- Mantida prioridade #1 da v66.
- Implementação deve preservar, se possível, a API síncrona atual para evitar refatoração ampla dos call sites.
- `getGameState` não deve expor a referência interna do cache.
- Toda mutação deve operar em cópia de trabalho.
- Persistência deve ser `working copy -> temp file -> rename -> cache`, com erro propagado.
- `deleteCampaign`: disco primeiro; cache só depois.
- Caminho síncrono é aceitável aqui (`writeFileSync` em temp + `renameSync`) porque a API atual já é síncrona e isso mantém a correção localizada. Não prometer proteção multi-processo/exactly-once.
- Adicionar suíte dedicada de falhas de I/O, anti-aliasing, restart e consistência de turno/world state.

# ATUALIZAÇÃO v68 — GAMESTATEMANAGER CONCLUÍDO

- O hash curto informado pelo AI Studio (`21c3495`) não existe na `main`. O commit realmente sincronizado é `4a34cd7074157b1fed2bf98891d13d1d0b7046c2` (`feat(persistence): implement atomic file saving for game states`).
- `GameStateManager` agora usa `cloneGameState` para evitar aliasing em leituras e escritas.
- `getGameState` não expõe mais a referência interna de `activeStates`.
- `createCampaign`, `saveGameState`, `advanceTurn`, `updateWorldState`, `updateCampaignFoundation`, `upsertNPC` e `upsertQuest` operam em cópia de trabalho e só atualizam o cache após persistência bem-sucedida.
- A persistência segue temp file -> `renameSync` -> cache.
- Falhas de `writeFileSync`/`renameSync` propagam erro e preservam a última versão confirmada em cache/disco.
- `deleteCampaign` agora remove disco primeiro, trata `ENOENT` como já removido e só depois limpa o cache.
- A API síncrona foi preservada.
- `tests/gamestate_persistence.test.ts` foi adicionada no commit com 11 cenários cobrindo anti-aliasing, sucesso, falhas de I/O, turn/world state, NPC/quest, delete, restart e ghost campaign.
- Status: GameStateManager concluído e sincronizado.
- O resultado de execução `11/11` e demais suítes passando foi reportado pelo AI Studio; o código/testes foram confirmados no GitHub, mas não houve execução independente/CI verificada nesta conversa.

## Próxima prioridade mantida
1. Lost update lógico da memória estruturada.
2. Retry/regenerar: substituição real da resposta + conflito com `hasMutations` durante geração.
3. NPCs introduzidos na abertura não registrados no Diário.
4. Retry manual com mesma Idempotency-Key / recovery específico.
5. Fluxo funcional da criação.
6. UI visual e acessibilidade.

## Bugs de uso real já registrados
- “Mais recente” pode sobrepor a narrativa.
- Regenerar às vezes aparenta criar nova resposta em vez de substituir a existente.
- Retry pode falhar com `Conflito detectado: o estado foi consolidado durante a geração...` quando a extração assíncrona consolida o turno durante a própria regeneração.
- Em alguns casos aparece narrativa genérica do tipo “O mundo ao seu redor silencia...” em vez de recovery/erro explícito.
- NPCs/personagens introduzidos na abertura podem existir apenas na prosa e não aparecer no Diário.

# ATUALIZAÇÃO v69 — BUGS DO DIÁRIO + ROADMAP CONSOLIDADO

## Novos bugs confirmados / fortemente sustentados

### Lugares aparecem sem terem sido descobertos pelo jogador
- `JournalModal.knownPlaces` agrega:
  - `snapshot.campaign.currentLocation`
  - todo `event.location`
  - todo `npc.location`
- Não existe filtro epistemológico/descoberta pelo jogador nessa composição.
- Consequência: localização interna de NPC ou evento pode aparecer no Diário mesmo sem o jogador tê-la visto, ouvido ou descoberto.
- Correção futura: o Diário deve exibir apenas locais autorizados para a perspectiva do jogador. Não usar `npc.location`/`event.location` como descoberta automática. Introduzir critério explícito de descoberta/evidência ou derivar apenas de eventos/conhecimento acessíveis ao jogador.

### `Quests (N)` pode mostrar contador com aba vazia
- O badge usa `(snapshot?.quests || []).length`.
- O conteúdo agrupa somente `active`, `completed` e `failed`.
- O tipo `Quest.status` aceita também `abandoned` e strings arbitrárias.
- Consequência: quests com status fora dos três grupos entram no contador mas não aparecem na aba.
- Correção futura:
  - normalizar/validar status persistidos;
  - renderizar grupo "Outras/Abandonadas" ou mapear statuses conhecidos;
  - contador deve refletir exatamente o conjunto renderizável;
  - investigar se o extractor está criando quests espúrias em cenas comuns.

## Roadmap consolidado — ordem atual

1. Lost update lógico na memória estruturada.
2. Retry/regenerar: substituição visual/semântica correta e conflito com `hasMutations` durante geração.
3. Registro de NPCs introduzidos na abertura e em cenas narrativas no Diário.
4. Epistemologia do Diário: locais descobertos, pessoas conhecidas, rumores/segredos e visibilidade por perspectiva.
5. Quests: corrigir contador/aba, normalizar statuses e impedir criação espúria.
6. Retry manual preservando a mesma `Idempotency-Key` + recovery específico por operação.
7. Criação de campanha — bugs funcionais: “Tenho uma ideia”, Back por origem, async stale results, “Mestre escolhe tudo”.
8. Criação de campanha — UX visual: modal mais largo, uma única rolagem, footer persistente, menos framing plot-driven.
9. Premise focus / adaptive generator / cenários menos roteirizados e mais slice-of-life quando apropriado.
10. Chat — “Mais recente” sem sobrepor texto, D20 condicional/real, header de turno, loading, largura narrativa, composer.
11. Acessibilidade de dialogs/tabs e validação mobile real.
12. Developer Mode: integrar Memory Inspector, Logs, Function Calls, Rolls, Retrieval e Epistemology.
13. Relationships: causa/evidência autorizada, assimetria e rumor/false-belief como influência legítima.
14. Event/extraction quality: reduzir event spam, banalidade virando “evento”, quests surgindo sem compromisso real.
15. Retenção/TTL de `data/rpg_idempotency`.
16. Hardening separado de CAS Retry/Edit para metadata/D20 quando necessário.
17. Playtest longo de campanhas reais e repriorização por bugs observados.

# ATUALIZAÇÃO v70 — LOST UPDATE DA MEMÓRIA: SOLUÇÃO DEFINIDA / PROMPT EMITIDO

## Base confirmada
- `main` verificada no commit `4a34cd7074157b1fed2bf98891d13d1d0b7046c2`.
- `MemoryManager` ainda executa mutações como `getOrCreateSnapshot -> mutação -> persistSnapshot`.
- `FilePersistentMemoryStore.saveSnapshot` adquire o lock somente na etapa de gravação; portanto duas operações podem ler a mesma base antes de entrarem na fila.
- A suíte `snapshot_persistence.test.ts` já reproduz explicitamente esse lost update no cenário 9.
- `persistSnapshot` também atualiza `semanticRecords` antes do commit, então a indexação derivada precisa permanecer coerente com a cópia efetivamente confirmada.

## Decisão técnica
- Implementar uma primitiva transacional de mutação de snapshot por campanha no contrato `IPersistentMemoryStore` e nas implementações File/InMemory.
- A mesma seção crítica deve abranger: obter o snapshot mais recente, criar uma cópia de trabalho, aplicar a intenção da mutação, atualizar os registros semânticos correspondentes, persistir por `temp -> rename` e publicar o cache por último.
- Refatorar todos os mutadores estruturados do `MemoryManager` para usar essa primitiva; nenhum deles deve fazer read-modify-write fora da seção crítica.
- Cálculos dependentes do estado, especialmente deltas de Relationship e Inventory e merges de Knowledge, devem acontecer sobre a versão atual dentro da transação. Não passar valor absoluto calculado sobre leitura antiga quando a intenção original era delta.
- Usar fila por `campaignId`, permitindo concorrência entre campanhas diferentes. A garantia desta rodada é para um único processo Node; não prometer coordenação multiprocesso.
- Manter a persistência física já corrigida, a autoridade do snapshot estruturado e embeddings apenas como índice derivado.

## Testes exigidos
- Duas criações concorrentes de entidades diferentes sobrevivem no mesmo snapshot e após restart.
- Dois incrementos concorrentes de Inventory preservam a soma.
- Dois deltas concorrentes de Relationship preservam ambos os efeitos.
- Merges concorrentes de `knownBy` preservam a união sem duplicação.
- Falha da função mutadora ou de I/O não altera cache/disco; a fila continua utilizável.
- Campanhas diferentes não ficam presas por lock global.
- Substituir o cenário 9 que documenta o bug por uma asserção de prevenção real do lost update.

## Escopo
- Não misturar com Retry/Regenerar, NPCs da abertura, epistemologia do Diário, quests, Relationships por Event, criação de campanha ou UI.
- Status: solução definida e prompt técnico preparado; aguarda implementação e sincronização para revisão.

# BACKLOG CANÔNICO v2.1 — CONSOLIDAÇÃO DA AUDITORIA CODEX MULTIAGENTE

## Regra desta consolidação
- Esta seção reorganiza as pendências atuais por risco e dependência técnica.
- Preserva todo o histórico v51–v70 acima.
- Não reabre itens concluídos sem evidência nova de regressão.
- Achados da auditoria estática do Codex ainda não reproduzidos em execução ficam marcados como **confirmado no código**, **inferido** ou **condicional**, conforme a evidência disponível.
- Um problema por rodada quando houver risco de regressão; mudança pequena deve incluir teste de regressão do fluxo real sempre que viável.

## P0 — integridade de save, concorrência e ciclo de vida do turno

### P0.1 — Lost update lógico da memória estruturada — CONCLUÍDO LOCALMENTE / COMMIT PENDENTE
- Revisão final aprovada sem bloqueadores no escopo de P0.1.
- Confirmado que todos os mutadores estruturados do `MemoryManager` já utilizam `mutateSnapshot`; nenhum ciclo externo `getSnapshot -> alterar -> saveSnapshot` permaneceu nos caminhos revisados.
- Causa 1 reproduzida e corrigida: `MemoryValidator` convertia deltas de Relationship em valores absolutos antes da transação, permitindo perda de incremento concorrente. O caso `10 + 2 + 3` terminava em `13`; após a correção termina em `15`.
- Causa 2 reproduzida e corrigida: leitura atrasada do disco podia publicar no cache bytes anteriores a um commit mais novo. Leituras pendentes agora não podem substituir uma versão mais recente já publicada.
- Preservadas: precedência de valores absolutos de Relationship, limites numéricos, deduplicação de `importantHistory`, APIs e formato de saves.
- Validação local: `memory_concurrency.test.ts` **21/21** e `snapshot_persistence.test.ts` **10/10**; validator, manager, stores e I/O reais, embeddings simulados, sem escrita em saves reais.
- Garantia explicitamente limitada a operações que compartilham a mesma instância do store em um processo Node; locks não são distribuídos nem reentrantes.
- Fechamento definitivo depende apenas de commit/push dos quatro arquivos da rodada e confirmação de sincronização.
- Não reabrir persistência física de snapshot, Retry/Edit ou outros itens para fechar P0.1.

### P0.2 — Identidade durável de extração e revisão de narrativa — CONCLUÍDO E VALIDADO LOCALMENTE / COMMIT PENDENTE
- **Concluído e validado em 09/10/2026.** Revisão técnica independente aprovada com 18 casos determinísticos em `tests/extraction_revision.test.ts` e 71 casos na base isolada total. Detalhes ao final deste documento.
- **Histórico e requisitos originais atendidos:**
  - Identidade persistente criada via `ChatMessage.revision` e `ExtractionSource { messageId, revision, turn }`.
  - Obsolescência validada via `commitExtraction` sob lock exclusivo de campanha, descartando extração antiga como `'stale'`.
  - Efeito duplicado prevenido via recibos duráveis em `snapshot.extractionReceipts[messageId]`, retornando `'duplicate'`.
  - Cobriu: edição enquanto extractor aguarda, retry enquanto extractor aguarda, duas extrações simultâneas, restart de store, falha na flag `hasMutations` e compatibilidade com saves legados.

### P0.3 — Unidade de commit/recuperação do turno
- **Confirmado no código.** Turno, chat, GameState, memória estruturada e recibo idempotente são persistidos em momentos diferentes; não existe transação única entre esses domínios.
- Mapear formalmente os pontos de commit do turno e o estado esperado após falha em cada etapa.
- Decidir a garantia do produto: rollback, resume/recovery ou estado parcial explicitamente recuperável.
- Não implementar um “transaction manager” amplo antes de testes de falha reproduzíveis.
- Testar falha antes/depois de: avanço de turno, save da mensagem do jogador, geração, save da resposta, extração e recibo idempotente.

### P0.4 — Erro de leitura não pode ser tratado como “arquivo ausente”
- **Confirmado no código.** Leitura corrompida/erro pode virar `null`/`[]`, permitindo que uma escrita posterior substitua um save ilegível como se fosse novo.
- Diferenciar `ENOENT` de corrupção/permissão/I/O.
- Em erro de leitura real, bloquear escrita destrutiva automática e expor erro recuperável/diagnóstico.
- Cobrir JSON inválido, permissão negada, arquivo truncado e restart.

### P0.5 — Exclusão + extração concorrente não pode recriar dados apagados
- **Confirmado parcialmente; reaparecimento é cenário inferido.** Delete de campanha/chat/snapshot ocorre em operações separadas e extrações em andamento não são canceladas/versionadas.
- Integrar delete com identidade de campanha/revisão para impedir persistência tardia após exclusão.
- Revisar `clearMessages` e operações de limpeza para seguir as mesmas garantias de fila/erro já adotadas nos stores corrigidos.
- Testar exclusão enquanto há extração pendente e falha de `unlink`.
- Novo follow-up confirmado por inspeção: uma leitura de snapshot iniciada antes de `clearSnapshot` pode terminar depois e repopular o cache. Cobrir esse race dentro de P0.5, não em P0.1.
- Auditar o cache de mensagens: `loadMessagesFromDisk` ainda publica resultado de leitura de forma incondicional e pode ter risco análogo de leitura atrasada; ainda não reproduzido.

## P1 — bugs determinísticos e contratos de domínio

### P1.1 — Fonte de verdade por domínio: GameState x memória estruturada
- **Confirmado.** Existem representações paralelas para NPCs, localização/mundo, Events, Relationships, Quests, Inventory e Knowledge, com consumidores diferentes na UI e no prompt.
- Produzir decisão explícita por domínio: fonte canônica, projeções derivadas e direção de sincronização.
- Evitar refactor total imediato; migrar domínio por domínio com compatibilidade de saves.
- Prioridade de decisão: NPCs/localização → Quests/Inventory → Relationships/Knowledge → Events/recentEvents.

### P1.2 — MemoryExtractor → MemoryValidator perde consequências
- **Confirmado.** `worldChanges` não são aplicados integralmente; campos epistemológicos podem ser descartados; conclusão de objetivo existente pode não marcar o objetivo correspondente.
- Fazer round-trip de contrato: extractor schema → validator → manager/store.
- Todo campo emitido deve ser aplicado, rejeitado explicitamente com motivo ou removido do contrato; nunca silenciosamente ignorado.
- Testes de round-trip para `worldChanges`, `observedBy`, `believedBy`, `informationChain` e objetivos de quest.

### P1.3 — Inventory aceita operações inválidas
- **Confirmado.** Há caminhos com `quantity || 1`, ausência de validação de finitude/positividade/saldo e ação desconhecida podendo cair em comportamento de ganho.
- Validar enum de ação, quantidade finita e positiva, identidade inequívoca do item e saldo suficiente para consumo.
- Operação inválida não deve mutar snapshot.
- Cobrir consumo maior que saldo, quantidade negativa/NaN/zero e ação desconhecida.

### P1.4 — Relationship: causalidade, idempotência e deltas
- Consolidar com a pendência v55.
- Relationship só deve mudar por evidência causal autorizada conforme a regra canônica definida para o projeto.
- `reason` textual não é evidência independente.
- Mesma extração/evento não pode aplicar o mesmo delta duas vezes.
- Deltas devem ser calculados dentro da transação de memória, não como valor absoluto derivado de leitura antiga.
- Rumor/false belief pode gerar reação social quando a aquisição de informação for válida, sem promover o rumor a WORLD_TRUTH.
- Auditar compatibilidade com relações assimétricas.

### P1.5 — D20: `success` x `SUCCESS_WITH_COST`
- **Bug concreto confirmado.** Determinadas rolagens podem produzir `success: false` com `outcome: 'SUCCESS_WITH_COST'`, enquanto o fallback narra sucesso.
- Definir regra mecânica canônica antes de editar: qual campo deriva do outro e qual é autoritativo.
- Corrigir em um único ponto de resolução, não com remendo narrativo.
- Testar 10–14 abaixo/acima da dificuldade, críticos e fallback procedural.

### P1.6 — Continuidade mecânica entre fallbacks/modelos
- **Confirmado no código; impacto narrativo inferido.** Um fallback/modelo subsequente pode receber contexto sem os resultados mecânicos já resolvidos, embora metadata local ainda exista.
- Preservar rolagens/ferramentas autoritativas entre tentativas e fallbacks.
- Se todos os modelos falharem após uma rolagem, o fallback procedural deve usar exatamente o resultado já resolvido.
- Testar modelo A rola e falha → modelo B responde; todos falham após roll.

### P1.7 — Retry manual deve reutilizar a mesma operação lógica
- Não reabrir a idempotência automática já concluída.
- Pendência específica: `ErrorBanner -> handleRetry -> handleSendMessage(lastFailedMessage)` pode gerar nova chave e novo turno.
- Persistir descriptor `{operationType, payload, idempotencyKey}` da operação falha e reutilizá-lo somente no retry da mesma operação.
- Novo envio intencional deve gerar nova chave.
- Recovery da UI deve ser específico por operação; não oferecer “Tentar novamente” para ação que não pode ser repetida exatamente.

### P1.8 — Retry: endurecer CAS dentro do lock
- Retry não destrutivo permanece concluído.
- Follow-up: check + replace deve ser atômico na mesma seção crítica, equivalente ao padrão mais forte já usado no Edit.
- Considerar metadata/D20 no fingerprint esperado quando puderem mudar concorrentemente.
- Cobrir duas regenerações concorrentes e mutação que ocorra entre pre-check e commit.

### P1.9 — Criação de campanha não pode sobrescrever ID existente
- **Confirmado no backend; UI normal não envia esse campo.** `createCampaign` aceita `campaignId` fornecido e o fluxo de nova campanha pode limpar memória associada.
- Rejeitar criação sobre ID existente, salvo operação explícita de reset/restore definida pelo produto.
- Adicionar teste de API direto, não apenas fluxo da UI.

### P1.10 — Contexto do narrador: Relationships e campos persistidos omitidos
- **Confirmado.** Filtro por `targetCharacter: 'narrator'` pode excluir relações normais entre jogador/NPC do bloco automático de contexto; alguns campos persistidos do personagem/mundo também não entram no prompt.
- Revisar política de contexto após definir fonte de verdade, sem despejar todo snapshot.
- Garantir que relações relevantes, `worldDetails`, perfil mecânico/stats/equipment necessários sejam incluídos por relevância e autoridade.
- Testar contexto real montado para player + NPC com relationship existente.

### P1.11 — Testes com falsa confiança
- **Confirmado.** Há asserções constantes, mocks que podem não interceptar o cliente real e suítes que exercitam `TurnProcessor` em vez do caminho HTTP/`GameEngine` de produção.
- Corrigir primeiro testes que poderiam “passar” com bug real.
- Criar harness isolado: diretórios temporários, IA simulada, servidor/rotas reais quando necessário.
- Nenhuma suíte deve escrever em `data/` real.
- Adicionar script `test` canônico em `package.json` quando a organização das suítes estiver definida.
- Fortalecer o teste de `importantHistory`: comparar também comprimento/array final; converter apenas para `Set` pode esconder duplicatas mesmo quando a implementação atual está correta.

## P2 — produto, narrativa e UX com impacto real

### P2.1 — NPCs da abertura não entram no Diário
- Mantém item v67/v69.
- A abertura deve passar por extração estruturada segura ou registrar explicitamente NPCs introduzidos pelo Narrador.
- Preservar epistemologia: existir na prosa não significa necessariamente ser conhecido pelo jogador em todos os detalhes.

### P2.2 — Epistemologia do Diário
- Mantém v69.
- Locais/pessoas/rumores/segredos devem ser exibidos somente quando autorizados para a perspectiva do jogador.
- Não considerar `npc.location`/`event.location` como descoberta automática.

### P2.3 — Quests: status, contador e criação espúria
- Mantém v69 e integra a falha de atualização de objetivo da auditoria.
- Normalizar statuses; contador deve refletir o que é renderizado; suportar `abandoned`/outras categorias definidas.
- Investigar extractor criando quest em cenas sem compromisso real.
- Conclusão de objetivo deve marcar o objetivo específico, não apenas mudar status geral.

### P2.4 — Journal: escala de familiaridade incorreta
- **Bug localizado confirmado.** `JournalModal.getQualitativeRelation` usa limiares incompatíveis com o domínio 0..10, tornando ao menos uma categoria inalcançável.
- Corrigir limiares e adicionar teste da classificação qualitativa.

### P2.5 — Criação de campanha: funcional antes de polimento
- Preservar pendências já detalhadas: “Tenho uma ideia”, origem/Back, stale async result, feedback de “O mestre escolhe tudo”, Foundation antiga, ação primária fora do footer.
- Depois corrigir scroll aninhado, largura do modal, footer persistente e framing excessivamente plot-driven.
- Só então avançar para `Foco da premissa` e geração adaptativa.

### P2.6 — Chat e semântica visual do D20
- “Mais recente” não pode sobrepor narrativa.
- Mostrar indicador D20 somente quando houver `metadata.diceRolls` real.
- Exibir roll/total e, quando apropriado, dificuldade/outcome.
- Corrigir header que usa “Turno Inicial” indevidamente; revisar loading, largura editorial e peso do composer.

### P2.7 — Qualidade da extração e event spam
- Não persistir ação banal como evento importante por padrão.
- Separar evento técnico causal de relevância de exibição no Diário quando necessário.
- Reduzir criação de quests/eventos artificiais em slice-of-life e cenas quietas.

### P2.8 — Anti-retcon e epistemologia heurística
- **Confirmado como heurístico; falsos positivos/negativos são inferidos.** Similaridade lexical/negações podem confundir crença falsa, contradição canônica e atualização legítima.
- Após estabilizar identidade/proveniência de extrações, revisar anti-retcon com casos de WORLD_TRUTH, rumor, suspicion, false belief e disputed.
- Não converter rumor em verdade só porque influencia comportamento.

## P3 — operação, escala e hardening condicional

### P3.1 — Autenticação/autorização da API — CONDICIONAL AO DEPLOYMENT
- Rotas não demonstram controle de acesso por campanha; snapshot completo e delete são sensíveis.
- Se o app sair do uso local/privado, definir autenticação, autorização por campanha e proteção de secrets antes de exposição pública.
- Se permanecer estritamente local, manter como risco documentado, não como bloqueador de v2.0.

### P3.2 — Retenção de idempotência
- Definir TTL/limpeza para `data/rpg_idempotency` para evitar crescimento indefinido.
- Não reabrir a durabilidade/atomicidade do registro já concluída.

### P3.3 — IDs sanitizados, múltiplos processos e locks locais
- Auditar colisão de nomes de arquivo após sanitização.
- Locks/cache atuais são por processo; coordenação multiprocesso só vira requisito se o deployment realmente usar mais de um processo/instância compartilhando os mesmos arquivos.
- Não ampliar escopo antes de confirmar requisito operacional.

### P3.4 — Performance de campanhas longas
- Medir antes de otimizar.
- Riscos: embeddings dentro de lock, snapshots JSON completos regravados, contexto crescente e conhecimento amplo enviado ao narrador.
- Criar benchmark de campanha longa com métricas de latência, tamanho de snapshot, tokens/contexto e tempo de indexação.
- Embeddings continuam índice derivado, nunca fonte canônica.

### P3.5 — Acessibilidade e mobile real
- Completar focus trap/foco inicial/restauração em dialogs/drawers.
- Completar semântica e teclado de Tabs (`tablist`, `tabpanel`, roving tabindex, setas).
- Validar 320/375/430px, iOS Safari e Chrome Android, teclado virtual, `100dvh`, drawers e wizard.

### P3.6 — Developer Mode
- Integrar Memory Inspector e depois Logs, Function Calls, Rolls, Retrieval e Epistemologia.
- Avaliar trace por turno que agrupe geração, ferramentas, retrieval, roll e extração sem expor secrets.

## DECISÕES ARQUITETURAIS v2.0 — NÃO IMPLEMENTAR EM PACOTE ÚNICO

### A1 — Autoridade de estado
- Definir por domínio a autoridade entre `GameState` e snapshot estruturado.
- Projeções secundárias devem ser deriváveis/reconciliáveis e nunca competir silenciosamente.

### A2 — Ciclo transacional do turno
- Definir a unidade de commit e o recovery esperado para turno/chat/GameState/memória/idempotência.
- Decidir quais etapas podem ser assíncronas sem tornar o turno semanticamente incompleto.

### A3 — Identidade/proveniência de consequências
- Toda consequência persistente deve apontar para uma origem estável: turno, mensagem/revisão, evento/evidência e identidade da extração/effect quando aplicável.
- Isso sustenta retry/edit, deduplicação, causalidade social e auditoria.

### A4 — `GameEngine` x `TurnProcessor`
- Decidir se `TurnProcessor` será incorporado ao fluxo real, reduzido a biblioteca de mecanismos úteis ou removido após migração.
- Evitar manter duas pipelines com garantias diferentes indefinidamente.

### A5 — Versionamento e recuperação de saves
- Introduzir schema/version quando houver primeira mudança incompatível real.
- Planejar validação estrutural, migração e política de recuperação de arquivo corrompido antes de evoluções maiores do formato.

### A6 — Índice semântico derivado
- Separar semanticamente “commit canônico” de “indexação para retrieval”.
- Índice atrasado pode ser aceitável; estado canônico atrasado/corrompido não.

### A7 — Autoridade mecânica
- Resultado de D20, modificadores, dificuldade e metadados resolvidos precisam de contrato único e persistente entre modelos/fallbacks/retry/edit.

## ORDEM DE EXECUÇÃO RECOMENDADA v2.1
1. **Confirmar commit/push de P0.1** e então marcar o item como concluído e sincronizado.
2. **P1.11 Harness/testes confiáveis mínimos** para os fluxos que serão mexidos em seguida.
3. **P0.2 Identidade de extração/revisão** + testes de extração antiga com Retry/Edit.
4. **P0.4 Erro de leitura ≠ ausência** e proteção de saves corrompidos.
5. **P0.5 Delete x extração concorrente**, incluindo leitura pendente após `clearSnapshot` e auditoria do cache de mensagens.
6. **P1.2 Contrato Extractor → Validator** + **P1.3 Inventory** + **P1.5 D20**, como correções pequenas e determinísticas separadas.
7. **P1.4 Relationships causal/idempotente**, reaproveitando a transação de memória já consolidada.
8. **P1.7 Retry manual com mesma chave** + recovery específico por operação.
9. **P1.1 Fonte de verdade por domínio**, documentar e migrar incrementalmente; daí atacar contexto (`P1.10`) e NPC/Journal (`P2.1–P2.4`).
10. **P2.5 Criação de campanha funcional**, depois UX/premise focus.
11. **P2.6 Chat/D20 visual**, **P2.7 event spam** e playtests longos.
12. **P3** conforme necessidade operacional e dados de uso.

## ITENS DA AUDITORIA CODEX — MAPEAMENTO R1–R19
- `R1` Fontes divergentes → **P1.1 / A1**.
- `R2` Turno parcialmente persistido → **P0.3 / A2**.
- `R3` Extração antiga após Edit/Retry → **P0.2 / A3**.
- `R4` Retry sem CAS forte → **P1.8**.
- `R5` Duplicação após falha/retry manual → **P1.7**; idempotência automática/durável anterior permanece concluída.
- `R6` Criação sobre ID existente → **P1.9**.
- `R7` Erro de leitura tratado como ausência → **P0.4 / A5**.
- `R8` Exclusão parcial/recriação tardia → **P0.5**.
- `R9` Consequências extraídas perdidas → **P1.2 / P2.3**.
- `R10` Deltas duplicados/perdidos → **P0.1 + P1.4 / A3**.
- `R11` Inventory inválido → **P1.3**.
- `R12` Contradição `success/outcome` → **P1.5 / A7**.
- `R13` Continuidade mecânica no fallback → **P1.6 / A7**.
- `R14` API sem auth → **P3.1**.
- `R15` Contexto incompleto/configuração omitida → **P1.10**.
- `R16` Epistemologia heurística → **P2.8 / A3**.
- `R17` Isolamento/IDs/locks locais → partes físicas já concluídas; restante em **P3.3**.
- `R18` Latência/contexto crescente → **P3.4 / A6**.
- `R19` Falsa confiança nos testes → **P1.11**.

## ITENS QUE CONTINUAM FECHADOS NO v2.1
- Retry não destrutivo da resposta anterior.
- Edit transacional do par user/assistant.
- Idempotência client/server para retries automáticos.
- Persistência/durabilidade do registro idempotente.
- Higiene/isolamento da suíte de idempotência.
- Snapshot memory store: anti-aliasing, temp/rename, cache após commit e clear coerente.
- GameStateManager: anti-aliasing, persistência atômica e propagação de falha.
- P0.1 lost update lógico da memória estruturada: implementação e testes locais aprovados; falta apenas sincronização do commit para fechamento definitivo.
- Não reabrir esses blocos para resolver follow-ups distintos; atacar somente a camada nova identificada.

## PRÓXIMA RODADA RECOMENDADA
- Fazer commit/push somente dos quatro arquivos de P0.1 e confirmar a sincronização no GitHub.
- Depois, iniciar **P1.11 — harness/testes confiáveis mínimos** como preparação para os próximos P0.
- Em seguida, atacar **P0.2 — identidade de extração/revisão** com testes determinísticos de extração antiga após Retry/Edit.
- Manter separados os follow-ups de P0.5: leitura pendente após `clearSnapshot` e possível publicação atrasada no cache de mensagens.


# ATUALIZAÇÃO v2.1 — P0.1: LOST UPDATE LÓGICO DA MEMÓRIA

- Status: implementado, validado localmente e aprovado em revisão final; commit/push ainda pendentes para fechamento sincronizado.
- Confirmado que todos os mutadores estruturados do `MemoryManager` já usam `mutateSnapshot`.
- Corrigido o `MemoryValidator` para preservar deltas de Relationship até a transação, mantendo precedência de valores absolutos, limites numéricos e histórico deduplicado.
- Corrigida corrida de leitura: bytes antigos do disco não podem substituir uma versão já publicada no cache.
- Ambas as falhas foram reproduzidas antes da correção; caso de Relationship `10 + 2 + 3` passou de resultado incorreto `13` para `15`.
- Validação: `memory_concurrency.test.ts` 21/21; `snapshot_persistence.test.ts` 10/10.
- Testes isolados, embeddings simulados, stores/validator/manager/I/O reais, sem escrita em saves reais.
- Revisão final: nenhum bloqueador, nenhum mutador fora de `mutateSnapshot`, nenhuma alteração acidental nos quatro arquivos da rodada.
- Follow-ups não bloqueadores registrados em P0.5/P1.11: leitura pendente após `clearSnapshot`, possível risco análogo no cache de mensagens e fortalecimento da asserção de `importantHistory`.
- Garantia limitada à mesma instância de store em um processo Node; locks não são reentrantes nem distribuídos.
- P0.2, P0.3 e demais pendências permanecem inalterados. Próxima etapa após sincronização: P1.11.

---

# ATUALIZAÇÃO v2.2 — P1.11: TESTES CONFIÁVEIS MÍNIMOS

- Status: parcialmente concluído; base isolada implementada e validada.
- Auditoria e matriz registradas em tests/TEST_AUDIT.md.
- Executor: tests/run-isolated.cjs; diretórios temporários do SO,
  sem rede, cleanup e propagação confiável de falhas.
- Base validada: 53 casos aprovados, zero falhas.
- Diagnósticos separados: 5 falhas reproduzidas em P0.2 (2),
  P0.4 (1), P0.5 (1) e P1.5 (1), com exit code 1.
- P0.3: injeção de falha disponível; recuperação permanece aberta.
- P1.7: reenvio com chave explícita coberto; comportamento da UI pendente.
- Pendências de P1.11: HTTP completo, UI crítica e consolidação
  da execução no ambiente oficial.
- Nenhuma lógica de produção foi alterada.
- P0.1 permanece concluído; as demais prioridades ficam preservadas.
- Próxima tarefa única recomendada: P0.2 — extração obsoleta após Retry/Edit.

## Estado vigente e preservação do histórico

- **P0.1 — Lost update lógico da memória: CONCLUÍDO E SINCRONIZADO.** A confirmação posterior registrada na conversa encerra a pendência histórica de commit/push da v2.1: correção validada localmente com 31 cenários, revisão final sem bloqueadores e commit/push concluídos na branch `codex/setup`.
- **P1.11 — Testes com falsa confiança / testes confiáveis mínimos: PARCIALMENTE CONCLUÍDO.** A base isolada foi entregue; isso não equivale à cobertura integral de HTTP, UI ou à consolidação no ambiente oficial.
- As referências anteriores a P0.1 aguardando sincronização e a P1.11 ainda por iniciar permanecem como histórico, superadas por esta atualização.
- P0.2, P0.3, P0.4, P0.5, P1.5, P1.7 e os demais itens não são encerrados pela entrega de testes. Preservam-se suas prioridades, escopos, critérios e decisões arquiteturais anteriores.
- A sequência canônica v2.1 fica preservada, considerando P0.1 concluído e a base mínima de P1.11 entregue. P0.2 é a próxima tarefa única recomendada; as pendências de P1.11 continuam abertas.

## Evidências da rodada P1.11

Resultados reportados na rodada de implementação; esta atualização documental não representa nova execução da suíte.

| Suíte | Aprovados | Falhas |
| --- | ---: | ---: |
| Concorrência de memória | 21 | 0 |
| Retry | 5 | 0 |
| Edit | 9 | 0 |
| Idempotência | 11 | 0 |
| Contratos e isolamento | 7 | 0 |
| **Base isolada** | **53** | **0** |
| Diagnósticos do backlog, executados separadamente | 0 | 5 |

- **Base isolada: exit code 0.**
- **Diagnósticos: exit code 1, falhando por design** para expor bugs ainda abertos. Não são testes aprovados nem falhas corrigidas nesta rodada.

| Item | Diagnósticos falhando | Comportamento reproduzido |
| --- | ---: | --- |
| P0.2 | 2 | Extração obsoleta após Retry e após Edit. |
| P0.4 | 1 | Corrupção de arquivo tratada como ausência. |
| P0.5 | 1 | Persistência de extração obsoleta após exclusão. |
| P1.5 | 1 | Inconsistência entre `success` e `SUCCESS_WITH_COST` no D20. |
| **Total** | **5** | **Bugs reproduzidos, ainda pendentes de correção.** |

## Arquivos da rodada

- Ajustados: `tests/memory_concurrency.test.ts`, `tests/retry_preservation.test.ts`, `tests/edit_preservation.test.ts` e `tests/idempotency.test.ts`.
- Adicionados: `tests/engine_contracts.test.ts`, `tests/backlog_risks.test.ts`, `tests/run-isolated.cjs` e `tests/TEST_AUDIT.md`.
- Adicionados em `tests/helpers/`: `engineHarness.ts`, `fake-genai.cjs`, `registeredRoutes.cjs`, `isolated-bootstrap.cjs` e `completion-fixture.cjs`.
- A rodada não alterou produção, não instalou dependências e não acessou Gemini.
- Conforme o relato da rodada, o diff foi revisado, `git diff --check` não apontou erros, temporários foram removidos e não surgiram artefatos de teste no repositório.
- Alterações preexistentes em `AGENTS.md`, o teste D20 não rastreado (`diceOutcomeConsistency.test.ts`) e `Microsoft/Windows/PowerShell/ModuleAnalysisCache` foram preservados.

## Limitações e pendências para concluir P1.11

- **HTTP completo:** as rotas executam handlers reais com transporte Express simulado. Falta validar o fluxo HTTP completo até `GameEngine` e persistência; o harness atual não comprova essa integração ponta a ponta.
- **UI crítica:** DOM e fluxos críticos da interface continuam sem cobertura nesta base. O reenvio manual foi testado com chave explicitamente fornecida; a preservação dessa chave pela UI ainda não foi comprovada e permanece vinculada a P1.7.
- **Consolidação no ambiente oficial:** permanece pendente consolidar a execução da base no ambiente oficial. Mantém-se a pendência canônica de definir a organização das suítes e o script `test` de `package.json`, distinguindo a base aprovada dos diagnósticos de bugs abertos.
- **P0.3:** o teste de commit parcial observa a falha e há injeção de falha disponível, mas isso não comprova rollback, retomada ou recuperação. A decisão e a validação da recuperação permanecem abertas nesse item.
- Os follow-ups de P0.5 — leitura pendente após `clearSnapshot` e possível publicação atrasada no cache de mensagens — continuam separados, sem reabrir P0.1.

Nenhum histórico foi removido. Os itens fechados e as demais prioridades da v2.1 permanecem preservados, com as atualizações de status explicitadas acima.

---

# ATUALIZAÇÃO v2.2 — P0.2: IDENTIDADE DURÁVEL DE EXTRAÇÃO E REVISÃO

- Status: concluído e validado; commit/push pendentes.
- Revisão técnica independente: aprovada sem bloqueadores arquiteturais ou funcionais.
- Identidade durável de revisão: implementada com `ChatMessage.revision?: number` (legado = 0) incrementado a cada nova narrativa por `replaceMessage`, `replaceTurnMessages` e `updateMessage` com alteração de conteúdo. Origem de extração tipada como `ExtractionSource { messageId, revision, turn }`.
- Verificação atômica de obsolescência: implementada via `commitExtraction` sob fila de escrita da campanha (`executeWithCampaignWriteLock`). Extrações de narrativas obsoletas após Retry ou Edit retornam status `'stale'` sem aplicar mutações.
- Deduplicação e recibos duráveis: persistidos no snapshot em `extractionReceipts[messageId] = { revision, turn, hasMutations }`. Extrações repetidas da mesma revisão retornam `'duplicate'`.
- Isolamento e atomicidade: o `MemoryValidator` opera em `draftStore` (`InMemoryStore`) isolado; falhas no validator descartam o draft sem tocar no snapshot persistente nem no disco.
- Tolerância a falhas na publicação de flags: `assertRevisable` consulta tanto `metadata.hasMutations` quanto o recibo persistido no snapshot; o bloqueio de Retry/Edit em narrativa consolidada opera mesmo se a gravação da flag no chat falhar.
- Compatibilidade: saves legados sem `revision` assumem 0; snapshots sem `extractionReceipts` são instanciados sem erro.
- Evidências e validação local:
  - `tests/extraction_revision.test.ts`: **18/18 casos aprovados**.
  - Base isolada completa: **71/71 casos aprovados**, 0 falhas (Retry 5, Edit 9, Concorrência 21, Idempotência 11, Contratos 7, Revisão 18).
  - Execução offline com Node v24.19.0 em sandbox isolado.
  - `git diff --check`: aprovado sem erros de formatação.
- Follow-ups técnicos (não bloqueadores):
  - Chamada de embeddings no `draft` ocorre sob lock da campanha; avaliar desacoplamento assíncrono em P3.4.
  - Normalização de CRLF/LF no ambiente Windows.
- Próxima prioridade recomendada: **P0.4 — Erro de leitura ≠ ausência e proteção de saves corrompidos** (conforme a ordem recomendada da v2.1) ou **P0.3 — Unidade de commit/recuperação do turno**.
