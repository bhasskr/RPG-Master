import path from 'path';
import fs from 'fs';
import { GameEngine } from '../server/engine/gameEngine';
import { GameStateManager } from '../server/engine/gameState/gameStateManager';
import { MemoryManager } from '../server/engine/memory/memoryManager';
import { FilePersistentMemoryStore } from '../server/engine/memory/filePersistentStore';
import { ChatMessage } from '../server/engine/memory/types';

async function runAllRetryTests() {
  console.log('===============================================================');
  console.log('TESTES DE RETRY: Preservação, Atomicidade e Não-Destrutividade');
  console.log('===============================================================\n');

  let passed = 0;
  let failed = 0;

  const testBaseDir = path.join(process.cwd(), 'data', 'test_retry_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6));
  const memoryDir = path.join(testBaseDir, 'memory');
  const stateDir = path.join(testBaseDir, 'gamestate');

  fs.mkdirSync(memoryDir, { recursive: true });
  fs.mkdirSync(stateDir, { recursive: true });

  const memoryStore = new FilePersistentMemoryStore(memoryDir);
  const memoryManager = new MemoryManager(memoryStore);
  const gameStateManager = new GameStateManager(stateDir);

  // Controlled Mock Narrator
  let mockGenerateOpening: (ctx: any) => Promise<any> = async () => ({
    text: 'Abertura inicial padrão.',
    executedTools: [],
    diceRolls: [],
  });

  let mockGenerateMaster: (ctx: any) => Promise<any> = async (ctx: any) => ({
    text: `Resposta padrão para: ${ctx.currentUserInput}`,
    executedTools: [],
    diceRolls: [],
  });

  const mockNarratorService: any = {
    generateOpeningMessage: (ctx: any) => mockGenerateOpening(ctx),
    generateMasterResponse: (ctx: any) => mockGenerateMaster(ctx),
  };

  const gameEngine = new GameEngine(memoryManager, gameStateManager, mockNarratorService);

  // Intercepta processPostTurnMemoryExtraction para auditoria determinística sem chamadas externas de LLM
  const extractionCalls: any[] = [];
  (gameEngine as any).processPostTurnMemoryExtraction = async (
    campaignId: string,
    turn: number,
    gameState: any,
    playerActionText: string,
    narratorResponse: any,
    masterMessageId: string
  ) => {
    extractionCalls.push({
      campaignId,
      turn,
      playerActionText,
      narratorResponse,
      masterMessageId,
    });
  };

  try {
    // -------------------------------------------------------------
    // CENÁRIO 1: Falha de geração: resposta anterior intacta
    // -------------------------------------------------------------
    console.log('[CENÁRIO 1] Testando Falha de Geração no Retry...');
    {
      const campaign = await gameEngine.startNewCampaign({
        title: 'Campanha Teste Falha de Geração',
        startingLocation: 'Cripta dos Ancestrais',
        playerName: 'Valerius',
      });
      const cid = campaign.campaignId;

      // Executa Turno 1 normalmente
      mockGenerateMaster = async () => ({
        text: 'Resposta A: O guardião espectral ergue sua espada de gelo.',
        executedTools: [],
        diceRolls: [{ roll: 14, total: 16, outcome: 'SUCCESS' }],
      });

      const turn1 = await gameEngine.processPlayerAction(cid, 'Desembainho minha espada e avanço com cautela.');
      const originalAssistantMsg = turn1.masterMessage;
      const originalMsgId = originalAssistantMsg.id;
      const originalContent = originalAssistantMsg.content;

      // Agora configuramos o Narrador para FALHAR durante o Retry
      mockGenerateMaster = async () => {
        throw new Error('LLM Provider Unavailable: 503 Service Unavailable');
      };

      let threw = false;
      try {
        await gameEngine.retryLastPlayerAction(cid);
      } catch (err: any) {
        threw = true;
        if (!err.message.includes('LLM Provider Unavailable')) {
          throw new Error(`Erro inesperado capturado: ${err.message}`);
        }
      }

      if (!threw) {
        throw new Error('retryLastPlayerAction deveria ter lançado exceção ao falhar o Narrador.');
      }

      // Verificação 1: Mensagens em cache/memória continuam intactas
      const messagesAfterFailedRetry = await memoryManager.getRecentMessages(cid, 10);
      if (messagesAfterFailedRetry.length !== 3) {
        throw new Error(`Esperava 3 mensagens no histórico (Abertura, Jogador, Resposta A), mas encontrou ${messagesAfterFailedRetry.length}`);
      }

      const lastMsg = messagesAfterFailedRetry[messagesAfterFailedRetry.length - 1];
      if (lastMsg.id !== originalMsgId) {
        throw new Error(`ID da mensagem foi corrompido! Esperava ${originalMsgId}, obteve ${lastMsg.id}`);
      }
      if (lastMsg.content !== originalContent) {
        throw new Error(`Conteúdo da resposta anterior foi perdido ou alterado! Esperava "${originalContent}", obteve "${lastMsg.content}"`);
      }

      // Verificação 2: Leitura direta do arquivo no disco confirma que a Resposta A permanece salva
      const diskFilePath = path.join(memoryDir, `chat_${cid}.json`);
      const diskContentRaw = fs.readFileSync(diskFilePath, 'utf-8');
      const diskMessages: ChatMessage[] = JSON.parse(diskContentRaw);
      const diskLastMsg = diskMessages[diskMessages.length - 1];
      if (diskLastMsg.id !== originalMsgId || diskLastMsg.content !== originalContent) {
        throw new Error(`Persistência em disco foi corrompida durante falha de geração!`);
      }

      console.log(' -> PASSED: Resposta anterior A permaneceu intacta no cache e no disco após falha de geração.');
      passed++;
    }

    // -------------------------------------------------------------
    // CENÁRIO 2: Falha de persistência: erro propagado; cache e disco preservam a resposta anterior
    // -------------------------------------------------------------
    console.log('\n[CENÁRIO 2] Testando Falha de Persistência (I/O) no Retry...');
    {
      const campaign = await gameEngine.startNewCampaign({
        title: 'Campanha Teste Falha de I/O',
        startingLocation: 'Torre Alta',
        playerName: 'Lyra',
      });
      const cid = campaign.campaignId;

      mockGenerateMaster = async () => ({
        text: 'Resposta A Original: O vento uiva pelas frestas das pedras antigas.',
        executedTools: [],
        diceRolls: [],
      });

      const turn1 = await gameEngine.processPlayerAction(cid, 'Olho pela janela da torre.');
      const originalAssistantMsg = turn1.masterMessage;
      const originalMsgId = originalAssistantMsg.id;
      const originalContent = originalAssistantMsg.content;

      // Narrador gera nova resposta válida
      mockGenerateMaster = async () => ({
        text: 'Resposta B Candidata: Raios cortam o céu tempestuoso além da torre.',
        executedTools: [],
        diceRolls: [],
      });

      // Forçamos falha na camada de escrita em disco (simula I/O failure ou permissão negada)
      const originalReplaceMessage = memoryStore.replaceMessage.bind(memoryStore);
      let writeAttempts = 0;
      memoryStore.replaceMessage = async (targetCid: string, targetMsgId: string, newMsg: ChatMessage) => {
        writeAttempts++;
        if (targetCid === cid) {
          throw new Error('EACCES: permission denied / disk I/O failure');
        }
        return originalReplaceMessage(targetCid, targetMsgId, newMsg);
      };

      let threw = false;
      try {
        await gameEngine.retryLastPlayerAction(cid);
      } catch (err: any) {
        threw = true;
        if (!err.message.includes('permission denied')) {
          throw new Error(`Erro inesperado: ${err.message}`);
        }
      }

      // Restaura método original do store
      memoryStore.replaceMessage = originalReplaceMessage;

      if (!threw) {
        throw new Error('retryLastPlayerAction deveria ter propagado o erro de persistência.');
      }
      if (writeAttempts === 0) {
        throw new Error('A operação de substituição não chegou a ser chamada.');
      }

      // Verificação 1: O cache da store ainda possui a Resposta A Original
      const cachedMessages = await memoryStore.getMessages(cid, 10);
      const cachedLast = cachedMessages[cachedMessages.length - 1];
      if (cachedLast.content !== originalContent) {
        throw new Error(`O cache foi corrompido prematuramente antes da persistência! Continha: "${cachedLast.content}"`);
      }

      // Verificação 2: Um novo store instanciado do zero lendo do disco ainda encontra a Resposta A
      const freshStore = new FilePersistentMemoryStore(memoryDir);
      const diskMessages = await freshStore.getMessages(cid, 10);
      const diskLast = diskMessages[diskMessages.length - 1];
      if (diskLast.id !== originalMsgId || diskLast.content !== originalContent) {
        throw new Error(`O disco foi modificado incorretamente durante falha de persistência!`);
      }

      console.log(' -> PASSED: Erro de persistência foi propagado e a Resposta A foi 100% preservada em cache e disco.');
      passed++;
    }

    // -------------------------------------------------------------
    // CENÁRIO 3: Sucesso: exatamente uma resposta substituta, sem mudar turno ou duplicar usuário
    // -------------------------------------------------------------
    console.log('\n[CENÁRIO 3] Testando Sucesso no Retry (Substituição Atômica)...');
    {
      const campaign = await gameEngine.startNewCampaign({
        title: 'Campanha Teste Sucesso',
        startingLocation: 'Floresta Prateada',
        playerName: 'Garrick',
      });
      const cid = campaign.campaignId;

      mockGenerateMaster = async () => ({
        text: 'Resposta A: Você ouve folhas secas quebrando atrás dos arbustos.',
        executedTools: [],
        diceRolls: [],
      });

      const turn1 = await gameEngine.processPlayerAction(cid, 'Preparo meu arco e miro na direção do som.');
      const originalAssistantMsg = turn1.masterMessage;
      const originalMsgId = originalAssistantMsg.id;

      const stateBeforeRetry = gameStateManager.getGameState(cid)!;
      const turnBeforeRetry = stateBeforeRetry.turn;

      // Narrador gera nova resposta B no Retry
      mockGenerateMaster = async () => ({
        text: 'Resposta B: Um cervo com galhadas de prata surge calmamente entre os troncos.',
        executedTools: [],
        diceRolls: [],
      });

      const retryResult = await gameEngine.retryLastPlayerAction(cid);

      // Verificações
      if (retryResult.masterMessage.content !== 'Resposta B: Um cervo com galhadas de prata surge calmamente entre os troncos.') {
        throw new Error(`Conteúdo não corresponde à nova resposta B! Obteve: ${retryResult.masterMessage.content}`);
      }
      if (retryResult.masterMessage.id !== originalMsgId) {
        throw new Error(`ID da mensagem deveria ser preservado na substituição! Esperava ${originalMsgId}, obteve ${retryResult.masterMessage.id}`);
      }
      if (retryResult.turn !== turnBeforeRetry) {
        throw new Error(`O turno foi incrementado no retry! Era ${turnBeforeRetry}, virou ${retryResult.turn}`);
      }

      const stateAfterRetry = gameStateManager.getGameState(cid)!;
      if (stateAfterRetry.turn !== turnBeforeRetry) {
        throw new Error(`O estado do jogo teve seu turno incrementado indevidamente! Era ${turnBeforeRetry}, virou ${stateAfterRetry.turn}`);
      }

      const allMessages = await memoryManager.getRecentMessages(cid, 20);
      if (allMessages.length !== 3) {
        throw new Error(`Histórico tem número incorreto de mensagens: esperado 3, encontrado ${allMessages.length}`);
      }

      const userMessages = allMessages.filter((m) => m.role === 'user');
      if (userMessages.length !== 1) {
        throw new Error(`Mensagem do jogador foi duplicada! Quantidade encontrada: ${userMessages.length}`);
      }

      const assistantMessagesTurn1 = allMessages.filter((m) => m.role === 'assistant' && m.turn === 1);
      if (assistantMessagesTurn1.length !== 1) {
        throw new Error(`Esperava exatamente 1 resposta do assistente no turno 1, encontrou ${assistantMessagesTurn1.length}`);
      }

      console.log(' -> PASSED: Exatamente uma resposta substituta B, ID preservado, turno mantido, usuário não duplicado.');
      passed++;
    }

    // -------------------------------------------------------------
    // CENÁRIO 4: Retry da abertura e ação sem resposta anterior
    // -------------------------------------------------------------
    console.log('\n[CENÁRIO 4] Testando Retry da Abertura e Ação sem Resposta Anterior...');
    {
      // 4A: Abertura
      mockGenerateOpening = async () => ({
        text: 'Abertura Original: Sob as estrelas do deserto, as dunas sussurram segredos.',
        executedTools: [],
        diceRolls: [],
      });

      const campaign = await gameEngine.startNewCampaign({
        title: 'Campanha Deserto',
        startingLocation: 'Oásis Escondido',
        playerName: 'Sariyah',
      });
      const cid = campaign.campaignId;

      const openingMessages = await memoryManager.getRecentMessages(cid, 10);
      const originalOpeningId = openingMessages[0].id;
      const originalOpeningText = openingMessages[0].content;

      // 4A.1: Falha na regeneração da abertura
      mockGenerateOpening = async () => {
        throw new Error('Erro temporário ao gerar abertura');
      };

      let threwOpening = false;
      try {
        await gameEngine.retryLastPlayerAction(cid);
      } catch (err: any) {
        threwOpening = true;
      }
      if (!threwOpening) {
        throw new Error('Deveria ter falhado e preservado a abertura original.');
      }

      const afterFailedRetryOpening = await memoryManager.getRecentMessages(cid, 10);
      if (afterFailedRetryOpening.length !== 1 || afterFailedRetryOpening[0].content !== originalOpeningText) {
        throw new Error('Abertura original foi perdida ou alterada após falha no retry!');
      }

      // 4A.2: Sucesso na regeneração da abertura
      mockGenerateOpening = async () => ({
        text: 'Abertura Refeita: Ao amanhecer no deserto, o vento desenha novas rotas na areia.',
        executedTools: [],
        diceRolls: [],
      });

      const successOpeningRetry = await gameEngine.retryLastPlayerAction(cid);
      if (successOpeningRetry.masterMessage.id !== originalOpeningId) {
        throw new Error('ID da abertura deveria ser preservado no retry!');
      }
      if (!successOpeningRetry.masterMessage.content.includes('Abertura Refeita')) {
        throw new Error('Abertura refeita não foi persistida corretamente!');
      }

      const finalOpeningMessages = await memoryManager.getRecentMessages(cid, 10);
      if (finalOpeningMessages.length !== 1) {
        throw new Error(`Esperava 1 única mensagem no turno 0, encontrou ${finalOpeningMessages.length}`);
      }

      console.log(' -> PASSED (4A): Retry da abertura seguro contra falhas e atômico no sucesso.');

      // 4B: Ação sem resposta anterior (jogador enviou, mas narrador não concluiu anteriormente)
      await memoryManager.recordMessage(cid, 'user', 'Caminho em direção às dunas ao leste.', 1);
      
      const msgsBeforeRetry = await memoryManager.getRecentMessages(cid, 10);
      if (msgsBeforeRetry.length !== 2 || msgsBeforeRetry[1].role !== 'user') {
        throw new Error('Setup do cenário 4B falhou.');
      }

      mockGenerateMaster = async () => ({
        text: 'Resposta gerada para a ação que estava sem resposta.',
        executedTools: [],
        diceRolls: [],
      });

      const actionWithoutResponseRetry = await gameEngine.retryLastPlayerAction(cid);
      if (actionWithoutResponseRetry.turn !== 1) {
        throw new Error(`Turno incorreto: esperava 1, obteve ${actionWithoutResponseRetry.turn}`);
      }

      const msgsAfterRetry = await memoryManager.getRecentMessages(cid, 10);
      if (msgsAfterRetry.length !== 3) {
        throw new Error(`Esperava 3 mensagens (Abertura, User 1, Assistant 1), encontrou ${msgsAfterRetry.length}`);
      }
      if (msgsAfterRetry[2].content !== 'Resposta gerada para a ação que estava sem resposta.') {
        throw new Error('Resposta para a ação pendente não foi gravada corretamente.');
      }

      console.log(' -> PASSED (4B): Ação sem resposta anterior processada corretamente no Retry.');
      passed++;
    }

    // -------------------------------------------------------------
    // CENÁRIO 5: Metadados/D20 preservados e conflito detectado antes de sobrescrever
    // -------------------------------------------------------------
    console.log('\n[CENÁRIO 5] Testando Preservação de Metadados/D20 e Detecção de Conflitos...');
    {
      const campaign = await gameEngine.startNewCampaign({
        title: 'Campanha Metadados e Conflito',
        startingLocation: 'Biblioteca Proibida',
        playerName: 'Morvath',
      });
      const cid = campaign.campaignId;

      // 5A: Preservação de D20 e cache de ferramentas
      mockGenerateMaster = async () => ({
        text: 'Resposta A: Você decifra as runas gravadas na estátua.',
        executedTools: [{ name: 'inspect_runes', args: { type: 'ancient' }, result: { decoded: true } }],
        diceRolls: [{ roll: 19, total: 24, outcome: 'CRITICAL_SUCCESS' }],
      });

      const turn1 = await gameEngine.processPlayerAction(cid, 'Tento ler as inscrições no pedestal.');
      const originalAssistantMsg = turn1.masterMessage;
      const originalMsgId = originalAssistantMsg.id;

      // No Retry, o narrador gera nova narrativa sem alterar as rolagens resolvidas
      let toolCacheReceived = false;
      mockGenerateMaster = async (ctx: any) => {
        if (ctx.turnExecutionCache && ctx.turnExecutionCache.size > 0) {
          toolCacheReceived = true;
        }
        return {
          text: 'Resposta B Refinada: As runas brilham em azul safira enquanto seu significado se revela.',
          executedTools: [], // narrador não chamou ferramentas adicionais
          diceRolls: [],     // narrador não jogou novos dados
        };
      };

      const retryResult = await gameEngine.retryLastPlayerAction(cid);

      if (!toolCacheReceived) {
        throw new Error('O turnExecutionCache com o resultado das ferramentas executadas não foi repassado ao Narrador!');
      }

      // Verifica se as rolagens autoritativas D20 da mensagem A foram preservadas
      const preservedRolls = retryResult.masterMessage.metadata?.diceRolls;
      if (!preservedRolls || preservedRolls.length === 0 || preservedRolls[0].outcome !== 'CRITICAL_SUCCESS') {
        throw new Error('Rolagens D20 autoritativas da resposta anterior foram perdidas no Retry!');
      }

      // Verifica se as ferramentas anteriores continuam registradas nos metadados
      const preservedTools = retryResult.masterMessage.metadata?.executedTools;
      if (!preservedTools || preservedTools.length === 0 || preservedTools[0].name !== 'inspect_runes') {
        throw new Error('Metadados de ferramentas executadas foram perdidos!');
      }

      console.log(' -> PASSED (5A): Metadados de ferramentas e resultados de D20 autoritativos preservados com sucesso.');

      // 5B: Detecção de Conflito Concorrente
      // Simulamos que, enquanto o Narrador estava gerando a nova resposta do retry,
      // outra operação modificou a mensagem anterior ou o histórico avançou.
      let conflictSimulated = false;
      mockGenerateMaster = async () => {
        // Antes de retornar a resposta, simulamos uma alteração concorrente na mensagem original
        await memoryManager.updateMessage(cid, originalMsgId, {
          content: 'Mensagem alterada concorrentemente por outra aba/operação!',
        });
        conflictSimulated = true;
        return {
          text: 'Resposta B Stale que não deve sobrescrever o conflito.',
          executedTools: [],
          diceRolls: [],
        };
      };

      let conflictDetected = false;
      try {
        await gameEngine.retryLastPlayerAction(cid);
      } catch (err: any) {
        if (err.message.includes('Conflito detectado')) {
          conflictDetected = true;
        } else {
          throw new Error(`Erro inesperado capturado: ${err.message}`);
        }
      }

      if (!conflictSimulated) {
        throw new Error('Falha no setup da simulação de conflito.');
      }
      if (!conflictDetected) {
        throw new Error('O GameEngine falhou em detectar o conflito concorrente antes de sobrescrever!');
      }

      // Verifica que a mensagem alterada concorrentemente permaneceu e a resposta stale não foi gravada
      const messagesAfterConflict = await memoryManager.getRecentMessages(cid, 10);
      const currentLastMsg = messagesAfterConflict[messagesAfterConflict.length - 1];
      if (currentLastMsg.content !== 'Mensagem alterada concorrentemente por outra aba/operação!') {
        throw new Error('O estado concorrente foi indevidamente sobrescrito!');
      }

      console.log(' -> PASSED (5B): Conflito detectado com sucesso; estado concorrente preservado e sobrescrita bloqueada.');
      passed++;
    }

  } catch (err) {
    console.error('\n[ERRO NO TESTE]:', err);
    failed++;
  } finally {
    // Limpa diretório temporário de testes
    try {
      fs.rmSync(testBaseDir, { recursive: true, force: true });
    } catch (e) {
      // ignore cleanup error
    }
  }

  console.log('\n===============================================================');
  console.log(`RESULTADO DOS TESTES DE RETRY: ${passed} APROVADOS, ${failed} FALHAS`);
  console.log('===============================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runAllRetryTests().catch((err) => {
  console.error('Falha fatal na execução do teste:', err);
  process.exit(1);
});
