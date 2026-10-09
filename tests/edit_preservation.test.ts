import path from 'path';
import fs from 'fs';
import os from 'os';
import { SemanticMemoryManager } from '../server/engine/memory/semanticMemory';
import { GameEngine } from '../server/engine/gameEngine';
import { GameStateManager } from '../server/engine/gameState/gameStateManager';
import { MemoryManager } from '../server/engine/memory/memoryManager';
import { FilePersistentMemoryStore } from '../server/engine/memory/filePersistentStore';
import { ChatMessage } from '../server/engine/memory/types';

async function runAllEditTests() {
  console.log('===============================================================');
  console.log('TESTES DE EDIT: Preservação, Atomicidade e Não-Destrutividade');
  console.log('===============================================================\n');

  let passed = 0;
  let failed = 0;

  const testBaseDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rpg_edit_'));
  const memoryDir = path.join(testBaseDir, 'memory');
  const stateDir = path.join(testBaseDir, 'gamestate');

  fs.mkdirSync(memoryDir, { recursive: true });
  fs.mkdirSync(stateDir, { recursive: true });

  const memoryStore = new FilePersistentMemoryStore(memoryDir);
  const memoryManager = new MemoryManager(memoryStore);
  const gameStateManager = new GameStateManager(stateDir);

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

  // Intercepta processPostTurnMemoryExtraction para auditoria determinística sem chamadas de API externas
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

  const originalEmbedding = SemanticMemoryManager.prototype.generateEmbedding;
  SemanticMemoryManager.prototype.generateEmbedding = async () => [1, 0];
  try {
    // -------------------------------------------------------------
    // CENÁRIO 1: Edit bem-sucedido
    // -------------------------------------------------------------
    console.log('[CENÁRIO 1] Testando Edit Bem-Sucedido (Preservação de IDs, Turno e Par Coerente)...');
    {
      const campaign = await gameEngine.startNewCampaign({
        title: 'Campanha Teste Edit Sucesso',
        startingLocation: 'Portão da Fortaleza',
        playerName: 'Eldrin',
      });
      const cid = campaign.campaignId;

      mockGenerateMaster = async () => ({
        text: 'Resposta Original: O guarda bloqueia sua passagem com uma lança.',
        executedTools: [],
        diceRolls: [],
      });

      const turn1 = await gameEngine.processPlayerAction(cid, 'Avanço com espada em punho.');
      const initialUserMsg = turn1.playerMessage;
      const initialAssistantMsg = turn1.masterMessage;
      const initialUserId = initialUserMsg.id;
      const initialAssistantId = initialAssistantMsg.id;

      extractionCalls.length = 0; // zera contagem de extração

      mockGenerateMaster = async (ctx: any) => {
        if (ctx.currentUserInput !== 'Cumprimento o guarda educadamente e mostro meu salvo-conduto.') {
          throw new Error(`Contexto recebeu input inesperado: ${ctx.currentUserInput}`);
        }
        return {
          text: 'Nova Resposta: O guarda examina o selo do documento e abre o portão com reverência.',
          executedTools: [{ name: 'inspect_pass', args: {}, result: { valid: true } }],
          diceRolls: [],
        };
      };

      const editResult = await gameEngine.editLastPlayerAction(cid, 'Cumprimento o guarda educadamente e mostro meu salvo-conduto.');

      // Validações
      if (editResult.playerMessage.id !== initialUserId) {
        throw new Error(`ID do jogador foi alterado! Esperava ${initialUserId}, obteve ${editResult.playerMessage.id}`);
      }
      if (editResult.playerMessage.content !== 'Cumprimento o guarda educadamente e mostro meu salvo-conduto.') {
        throw new Error(`Conteúdo do jogador incorreto: ${editResult.playerMessage.content}`);
      }
      if (editResult.playerMessage.turn !== 1) {
        throw new Error(`Turno do jogador alterado: esperado 1, obteve ${editResult.playerMessage.turn}`);
      }

      if (editResult.masterMessage.id !== initialAssistantId) {
        throw new Error(`ID do narrador foi alterado! Esperava ${initialAssistantId}, obteve ${editResult.masterMessage.id}`);
      }
      if (!editResult.masterMessage.content.includes('O guarda examina o selo')) {
        throw new Error(`Nova resposta do narrador incorreta: ${editResult.masterMessage.content}`);
      }
      if (editResult.masterMessage.turn !== 1) {
        throw new Error(`Turno do narrador alterado: esperado 1, obteve ${editResult.masterMessage.turn}`);
      }

      // Verifica histórico em cache e disco: exatamente 1 par no turno 1
      const messagesAfterEdit = await memoryManager.getRecentMessages(cid, 10);
      if (messagesAfterEdit.length !== 3) {
        throw new Error(`Esperava 3 mensagens no histórico (Abertura, User 1, Assistant 1), encontrou ${messagesAfterEdit.length}`);
      }
      if (messagesAfterEdit[1].id !== initialUserId || messagesAfterEdit[1].content !== 'Cumprimento o guarda educadamente e mostro meu salvo-conduto.') {
        throw new Error('Mensagem do usuário não foi atualizada corretamente no histórico.');
      }
      if (messagesAfterEdit[2].id !== initialAssistantId || !messagesAfterEdit[2].content.includes('O guarda examina o selo')) {
        throw new Error('Mensagem do narrador não foi atualizada corretamente no histórico.');
      }

      // Leitura direta do disco
      const diskFilePath = path.join(memoryDir, `chat_${cid}.json`);
      const diskMessages: ChatMessage[] = JSON.parse(fs.readFileSync(diskFilePath, 'utf-8'));
      if (diskMessages.length !== 3 || diskMessages[1].content !== 'Cumprimento o guarda educadamente e mostro meu salvo-conduto.') {
        throw new Error('Persistência em disco não reflete o par editado coerentemente.');
      }

      console.log(' -> PASSED: Edit bem-sucedido com preservação de IDs, turno mantido e exatamente 1 par no histórico.');
      passed++;
    }

    // -------------------------------------------------------------
    // CENÁRIO 2: Falha do Narrador (Estado intacto)
    // -------------------------------------------------------------
    console.log('\n[CENÁRIO 2] Testando Falha do Narrador no Edit...');
    {
      const campaign = await gameEngine.startNewCampaign({
        title: 'Campanha Teste Falha Narrador',
        startingLocation: 'Ruínas Antigas',
        playerName: 'Kael',
      });
      const cid = campaign.campaignId;

      mockGenerateMaster = async () => ({
        text: 'Resposta Original: O chão cede sob seus passos.',
        executedTools: [],
        diceRolls: [],
      });

      const turn1 = await gameEngine.processPlayerAction(cid, 'Piso na laje de pedra central.');
      const initialUserContent = turn1.playerMessage.content;
      const initialAssistantContent = turn1.masterMessage.content;

      // Configura narrador para falhar durante a edição
      mockGenerateMaster = async () => {
        throw new Error('Falha de IA: Modelo indisponível (503 Service Unavailable)');
      };

      let threw = false;
      try {
        await gameEngine.editLastPlayerAction(cid, 'Salto por cima da laje de pedra.');
      } catch (err: any) {
        threw = true;
        if (!err.message.includes('Modelo indisponível')) {
          throw new Error(`Erro inesperado: ${err.message}`);
        }
      }

      if (!threw) {
        throw new Error('editLastPlayerAction deveria ter propagado a falha do Narrador.');
      }

      // Verificação em cache e em disco: tudo permaneceu com o texto original
      const messagesAfterFailedEdit = await memoryManager.getRecentMessages(cid, 10);
      if (messagesAfterFailedEdit[1].content !== initialUserContent) {
        throw new Error(`Texto do jogador foi corrompido ou alterado prematuramente! Esperava "${initialUserContent}", obteve "${messagesAfterFailedEdit[1].content}"`);
      }
      if (messagesAfterFailedEdit[2].content !== initialAssistantContent) {
        throw new Error(`Resposta do narrador foi perdida ou alterada prematuramente! Esperava "${initialAssistantContent}", obteve "${messagesAfterFailedEdit[2].content}"`);
      }

      const freshStore = new FilePersistentMemoryStore(memoryDir);
      const diskMessages = await freshStore.getMessages(cid, 10);
      if (diskMessages[1].content !== initialUserContent || diskMessages[2].content !== initialAssistantContent) {
        throw new Error('O disco foi alterado prematuramente antes do sucesso da geração!');
      }

      console.log(' -> PASSED: Texto original do jogador e resposta original do narrador preservados integralmente.');
      passed++;
    }

    // -------------------------------------------------------------
    // CENÁRIO 3: Falha de retrieval (Estado totalmente intacto)
    // -------------------------------------------------------------
    console.log('\n[CENÁRIO 3] Testando Falha de Retrieval no Edit...');
    {
      const campaign = await gameEngine.startNewCampaign({
        title: 'Campanha Teste Falha Retrieval',
        startingLocation: 'Torre Arcana',
        playerName: 'Vespera',
      });
      const cid = campaign.campaignId;

      mockGenerateMaster = async () => ({
        text: 'Resposta Original: As estantes de livros flutuam lentamente.',
        executedTools: [],
        diceRolls: [],
      });

      const turn1 = await gameEngine.processPlayerAction(cid, 'Puxo um livro flutuante.');
      const initialUserContent = turn1.playerMessage.content;
      const initialAssistantContent = turn1.masterMessage.content;

      // Injeta falha temporária no getRelevantContext
      const originalGetRelevantContext = memoryManager.getRelevantContext.bind(memoryManager);
      memoryManager.getRelevantContext = async () => {
        throw new Error('Vector database index connection timeout');
      };

      let threw = false;
      try {
        await gameEngine.editLastPlayerAction(cid, 'Lanço um feitiço de detecção de magia.');
      } catch (err: any) {
        threw = true;
        if (!err.message.includes('Vector database')) {
          throw new Error(`Erro inesperado: ${err.message}`);
        }
      } finally {
        memoryManager.getRelevantContext = originalGetRelevantContext;
      }

      if (!threw) {
        throw new Error('editLastPlayerAction deveria ter lançado exceção ao falhar o retrieval.');
      }

      const messagesAfter = await memoryManager.getRecentMessages(cid, 10);
      if (messagesAfter[1].content !== initialUserContent || messagesAfter[2].content !== initialAssistantContent) {
        throw new Error('Histórico foi alterado durante falha de retrieval!');
      }

      console.log(' -> PASSED: Histórico permaneceu totalmente intacto após falha de retrieval.');
      passed++;
    }

    // -------------------------------------------------------------
    // CENÁRIO 4: Falha durante persistência do commit
    // -------------------------------------------------------------
    console.log('\n[CENÁRIO 4] Testando Falha durante Persistência do Commit (Sem Par Parcial)...');
    {
      const campaign = await gameEngine.startNewCampaign({
        title: 'Campanha Teste Falha Persistência Commit',
        startingLocation: 'Taverna do Javali',
        playerName: 'Boran',
      });
      const cid = campaign.campaignId;

      mockGenerateMaster = async () => ({
        text: 'Resposta Original: O taverneiro limpa o balcão com um pano encardido.',
        executedTools: [],
        diceRolls: [],
      });

      const turn1 = await gameEngine.processPlayerAction(cid, 'Peço uma caneca de cerveja escura.');
      const initialUserContent = turn1.playerMessage.content;
      const initialAssistantContent = turn1.masterMessage.content;

      mockGenerateMaster = async () => ({
        text: 'Nova Resposta Candidata: O taverneiro assente e serve hidromel perfumado.',
        executedTools: [],
        diceRolls: [],
      });

      // Simula falha de gravação no store persistente
      const originalReplaceTurnMessages = memoryStore.replaceTurnMessages.bind(memoryStore);
      let attempts = 0;
      memoryStore.replaceTurnMessages = async (targetCid, userMsg, assistantMsg, expected) => {
        attempts++;
        if (targetCid === cid) {
          throw new Error('EACCES: disk write permission denied on chat file');
        }
        return originalReplaceTurnMessages(targetCid, userMsg, assistantMsg, expected);
      };

      let threw = false;
      try {
        await gameEngine.editLastPlayerAction(cid, 'Peço o melhor hidromel da casa.');
      } catch (err: any) {
        threw = true;
        if (!err.message.includes('disk write permission denied')) {
          throw new Error(`Erro inesperado: ${err.message}`);
        }
      } finally {
        memoryStore.replaceTurnMessages = originalReplaceTurnMessages;
      }

      if (!threw) {
        throw new Error('editLastPlayerAction deveria ter propagado a falha de persistência.');
      }
      if (attempts === 0) {
        throw new Error('replaceTurnMessages não chegou a ser chamado.');
      }

      // Verificação crítica: NENHUM par parcial. O cache e o disco devem conter o par original!
      const cachedMessages = await memoryStore.getMessages(cid, 10);
      if (cachedMessages[1].content !== initialUserContent) {
        throw new Error(`Cache ficou com usuário novo ou inconsistente! Encontrado: "${cachedMessages[1].content}"`);
      }
      if (cachedMessages[2].content !== initialAssistantContent) {
        throw new Error(`Cache ficou com resposta nova ou inconsistente! Encontrado: "${cachedMessages[2].content}"`);
      }

      const freshStore = new FilePersistentMemoryStore(memoryDir);
      const diskMessages = await freshStore.getMessages(cid, 10);
      if (diskMessages[1].content !== initialUserContent || diskMessages[2].content !== initialAssistantContent) {
        throw new Error('Disco gravou estado parcial ou corrompido durante falha de persistência!');
      }

      console.log(' -> PASSED: Sem par parcial; par antigo intacto e coerente em cache e disco.');
      passed++;
    }

    // -------------------------------------------------------------
    // CENÁRIO 5: Conflito concorrente durante a geração
    // -------------------------------------------------------------
    console.log('\n[CENÁRIO 5] Testando Conflito Concorrente Durante a Geração...');
    {
      const campaign = await gameEngine.startNewCampaign({
        title: 'Campanha Teste Conflito Concorrente',
        startingLocation: 'Masmorra Sombria',
        playerName: 'Thorne',
      });
      const cid = campaign.campaignId;

      mockGenerateMaster = async () => ({
        text: 'Resposta Original: Correntes chacoalham no corredor escuro.',
        executedTools: [],
        diceRolls: [],
      });

      const turn1 = await gameEngine.processPlayerAction(cid, 'Acendo uma tocha.');
      const assistantId = turn1.masterMessage.id;

      // Durante a geração do Narrador para o Edit, simulamos que outra operação
      // concorrente modificou a mensagem original do assistente
      let conflictSimulated = false;
      mockGenerateMaster = async () => {
        await memoryManager.updateMessage(cid, assistantId, {
          content: 'Mensagem alterada concorrentemente por outra aba/sessão!',
        });
        conflictSimulated = true;
        return {
          text: 'Nova Resposta Candidata que não deve ser aplicada.',
          executedTools: [],
          diceRolls: [],
        };
      };

      let conflictDetected = false;
      try {
        await gameEngine.editLastPlayerAction(cid, 'Lanço a magia Luz.');
      } catch (err: any) {
        if (err.message.includes('Conflito detectado')) {
          conflictDetected = true;
        } else {
          throw new Error(`Erro inesperado: ${err.message}`);
        }
      }

      if (!conflictSimulated) {
        throw new Error('Falha no setup da simulação de conflito.');
      }
      if (!conflictDetected) {
        throw new Error('O GameEngine falhou em detectar o conflito concorrente antes de sobrescrever!');
      }

      // Verifica que a mudança concorrente foi preservada e a nova resposta não foi aplicada
      const messagesAfterConflict = await memoryManager.getRecentMessages(cid, 10);
      if (messagesAfterConflict[2].content !== 'Mensagem alterada concorrentemente por outra aba/sessão!') {
        throw new Error('A alteração concorrente foi indevidamente sobrescrita!');
      }

      console.log(' -> PASSED: Conflito detectado com sucesso; mudança concorrente preservada e Edit abortado.');
      passed++;
    }

    // -------------------------------------------------------------
    // CENÁRIO 6: hasMutations bloqueia Edit
    // -------------------------------------------------------------
    console.log('\n[CENÁRIO 6] Testando Bloqueio de hasMutations...');
    {
      const campaign = await gameEngine.startNewCampaign({
        title: 'Campanha Teste hasMutations',
        startingLocation: 'Altar de Sangue',
        playerName: 'Seraphina',
      });
      const cid = campaign.campaignId;

      mockGenerateMaster = async () => ({
        text: 'Resposta com mutação consolidada.',
        executedTools: [],
        diceRolls: [],
      });

      const turn1 = await gameEngine.processPlayerAction(cid, 'Bebo da taça do altar.');
      // Marca hasMutations na mensagem
      await memoryManager.updateMessage(cid, turn1.masterMessage.id, {
        metadata: { ...turn1.masterMessage.metadata, hasMutations: true },
      });

      let blocked = false;
      try {
        await gameEngine.editLastPlayerAction(cid, 'Recuso beber da taça.');
      } catch (err: any) {
        if (err.message.includes('Mudanças de estado irreversíveis já foram consolidadas')) {
          blocked = true;
        } else {
          throw new Error(`Mensagem de erro inesperada: ${err.message}`);
        }
      }

      if (!blocked) {
        throw new Error('hasMutations deveria ter bloqueado a edição imediatamente!');
      }

      console.log(' -> PASSED: hasMutations bloqueou a edição sem chamar narrador ou alterar dados.');
      passed++;
    }

    // -------------------------------------------------------------
    // CENÁRIO 7: D20 existente bloqueia Edit
    // -------------------------------------------------------------
    console.log('\n[CENÁRIO 7] Testando Bloqueio de D20 Existente...');
    {
      const campaign = await gameEngine.startNewCampaign({
        title: 'Campanha Teste D20',
        startingLocation: 'Ponte Pênsil',
        playerName: 'Roric',
      });
      const cid = campaign.campaignId;

      mockGenerateMaster = async () => ({
        text: 'Você se equilibra na ponte de cordas.',
        executedTools: [],
        diceRolls: [{ roll: 16, total: 20, outcome: 'SUCCESS' }],
      });

      await gameEngine.processPlayerAction(cid, 'Atravesso correndo pela ponte.');

      let blocked = false;
      try {
        await gameEngine.editLastPlayerAction(cid, 'Atravesso devagar.');
      } catch (err: any) {
        if (err.message.includes('Ação já resolveu rolagens de dados (D20)')) {
          blocked = true;
        } else {
          throw new Error(`Mensagem de erro inesperada: ${err.message}`);
        }
      }

      if (!blocked) {
        throw new Error('D20 existente deveria ter bloqueado a edição imediatamente!');
      }

      console.log(' -> PASSED: D20 existente bloqueou a edição com segurança.');
      passed++;
    }

    // -------------------------------------------------------------
    // CENÁRIO 8: Memory Extraction disparada apenas no sucesso
    // -------------------------------------------------------------
    console.log('\n[CENÁRIO 8] Testando Disparo Condicional de Memory Extraction...');
    {
      const campaign = await gameEngine.startNewCampaign({
        title: 'Campanha Teste Extração',
        startingLocation: 'Jardim Secreto',
        playerName: 'Iris',
      });
      const cid = campaign.campaignId;

      mockGenerateMaster = async () => ({
        text: 'Resposta Original: As flores emitem um brilho suave.',
        executedTools: [],
        diceRolls: [],
      });

      await gameEngine.processPlayerAction(cid, 'Toco nas pétalas azuis.');

      extractionCalls.length = 0; // zera extrações

      // 8.1: Falha no Narrador -> Extração NÃO pode ser chamada
      mockGenerateMaster = async () => {
        throw new Error('Simulated LLM Error');
      };

      try {
        await gameEngine.editLastPlayerAction(cid, 'Apenas observo à distância.');
      } catch {
        // esperado
      }

      if (extractionCalls.length > 0) {
        throw new Error(`Memory extraction foi executada indevidamente em caso de falha! Chamadas: ${extractionCalls.length}`);
      }

      // 8.2: Sucesso no Edit -> Extração DEVE ser chamada exatamente uma vez
      mockGenerateMaster = async () => ({
        text: 'Nova Resposta: À distância, você nota que o pólen forma runas no ar.',
        executedTools: [],
        diceRolls: [],
      });

      const successEdit = await gameEngine.editLastPlayerAction(cid, 'Apenas observo à distância.');

      if (extractionCalls.length !== 1) {
        throw new Error(`Memory extraction deveria ter sido chamada exatamente 1 vez, mas foi chamada ${extractionCalls.length} vezes.`);
      }

      const call = extractionCalls[0];
      if (call.campaignId !== cid || call.playerActionText !== 'Apenas observo à distância.' || call.masterMessageId !== successEdit.masterMessage.id) {
        throw new Error('Parâmetros repassados à memory extraction estão incorretos.');
      }

      console.log(' -> PASSED: Extração de memória não executa em falha e executa exatamente 1 vez com sucesso.');
      passed++;
    }

    // -------------------------------------------------------------
    // CENÁRIO 9: Dois Edits concorrentes sobre o mesmo turno
    // -------------------------------------------------------------
    console.log('\n[CENÁRIO 9] Testando Dois Edits Concorrentes Sobre o Mesmo Turno...');
    {
      const campaign = await gameEngine.startNewCampaign({
        title: 'Campanha Concorrência Turno',
        startingLocation: 'Câmara do Trono',
        playerName: 'Arthur',
      });
      const cid = campaign.campaignId;

      mockGenerateMaster = async () => ({
        text: 'Resposta Original: O rei escuta em silêncio.',
        executedTools: [],
        diceRolls: [],
      });

      await gameEngine.processPlayerAction(cid, 'Faço uma reverência solene.');

      // Dois edits concorrentes: Edit 1 e Edit 2 iniciam geração com base no mesmo estado
      let edit1InGeneration: () => void;
      const edit1Ready = new Promise<void>((resolve) => {
        edit1InGeneration = resolve;
      });

      let edit2InGeneration: () => void;
      const edit2Ready = new Promise<void>((resolve) => {
        edit2InGeneration = resolve;
      });

      let allowEdit1ToCommit: () => void;
      const waitEdit1Commit = new Promise<void>((resolve) => {
        allowEdit1ToCommit = resolve;
      });
      let edit1Committed!: () => void;
      const waitEdit1Committed = new Promise<void>((resolve) => { edit1Committed = resolve; });

      mockGenerateMaster = async (ctx: any) => {
        if (ctx.currentUserInput === 'Peço autorização para cruzar a fronteira.') {
          // Edit 1 está gerando; avisa que leu o estado inicial e espera Edit 2 também iniciar
          edit1InGeneration();
          await edit2Ready;
          // Agora Edit 1 espera permissão para commitar
          await waitEdit1Commit;
          return {
            text: 'Resposta Edit 1: O rei sorri e concede a permissão.',
            executedTools: [],
            diceRolls: [],
          };
        } else {
          // Edit 2 está gerando com base no mesmo estado inicial
          edit2InGeneration();
          // Esperar o commit observado, não uma estimativa de duração do I/O.
          await waitEdit1Committed;
          return {
            text: 'Resposta Edit 2: O rei franze o cenho e nega o pedido.',
            executedTools: [],
            diceRolls: [],
          };
        }
      };

      // Disparamos ambos concorrentemente
      const promise1 = gameEngine.editLastPlayerAction(cid, 'Peço autorização para cruzar a fronteira.');
      const promise2 = gameEngine.editLastPlayerAction(cid, 'Desafio o campeão do rei.');

      // Aguarda ambos entrarem na geração (ambos leram o estado inicial)
      await edit1Ready;
      await edit2Ready;

      // Permite que Edit 1 complete e commite primeiro
      allowEdit1ToCommit!();
      try { await promise1; }
      finally { edit1Committed(); }

      let p2Error: any = null;
      try {
        await promise2;
      } catch (err: any) {
        p2Error = err;
      }

      if (!p2Error) {
        throw new Error('O segundo Edit concorrente deveria ter falhado com conflito de concorrência!');
      }
      if (!p2Error.message.includes('Conflito detectado')) {
        throw new Error(`Esperava erro de conflito, obteve: ${p2Error.message}`);
      }

      // Confirma que o Edit 1 prevaleceu com integridade
      const messagesFinal = await memoryManager.getRecentMessages(cid, 10);
      if (messagesFinal[1].content !== 'Peço autorização para cruzar a fronteira.') {
        throw new Error(`Texto do jogador esperado: Edit 1. Encontrado: ${messagesFinal[1].content}`);
      }
      if (!messagesFinal[2].content.includes('O rei sorri')) {
        throw new Error(`Resposta esperada: Edit 1. Encontrado: ${messagesFinal[2].content}`);
      }

      console.log(' -> PASSED: Exatamente 1 dos dois Edits concorrentes obteve sucesso; o outro recebeu conflito.');
      passed++;
    }

  } catch (err) {
    console.error('\n[ERRO NO TESTE]:', err);
    failed++;
  } finally {
    SemanticMemoryManager.prototype.generateEmbedding = originalEmbedding;
    try {
      fs.rmSync(testBaseDir, { recursive: true, force: true });
    } catch (error) {
      throw error;
    }
  }

  console.log('\n===============================================================');
  console.log(`RESULTADO DOS TESTES DE EDIT: ${passed} APROVADOS, ${failed} FALHAS`);
  console.log('===============================================================');

  (globalThis as any).__RPG_SUITE_COMPLETE__ = true;
  if (failed > 0) {
    process.exit(1);
  }
}

runAllEditTests().catch((err) => {
  console.error('Falha fatal na execução do teste:', err);
  process.exit(1);
});
