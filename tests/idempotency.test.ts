import path from 'path';
import fs from 'fs';
import os from 'os';
import { GameEngine } from '../server/engine/gameEngine';
import { GameStateManager } from '../server/engine/gameState/gameStateManager';
import { MemoryManager } from '../server/engine/memory/memoryManager';
import { FilePersistentMemoryStore } from '../server/engine/memory/filePersistentStore';
import { IdempotencyManager, withIdempotency, computePayloadFingerprint, IdempotencyPersistenceError } from '../server/engine/idempotency/idempotencyService';
import { fetchWithRetry, generateIdempotencyKey } from '../src/services/api';

async function runAllIdempotencyTests() {
  console.log('===============================================================');
  console.log('TESTES DE IDEMPOTÊNCIA: Deduplicação, Concorrência e Segurança');
  console.log('===============================================================\n');

  let passed = 0;
  let failed = 0;

  // Cria diretório temporário único no sistema operacional fora da pasta do projeto
  const testBaseDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'rpg_idem_test_'));
  const memoryDir = path.join(testBaseDir, 'memory');
  const stateDir = path.join(testBaseDir, 'gamestate');
  const idemDir = path.join(testBaseDir, 'idempotency');

  fs.mkdirSync(memoryDir, { recursive: true });
  fs.mkdirSync(stateDir, { recursive: true });
  fs.mkdirSync(idemDir, { recursive: true });

  const memoryStore = new FilePersistentMemoryStore(memoryDir);
  const memoryManager = new MemoryManager(memoryStore);
  const gameStateManager = new GameStateManager(stateDir);
  const idempotencyManager = new IdempotencyManager(idemDir);

  try {

  let narratorCallCount = 0;

  const mockNarratorService: any = {
    generateOpeningMessage: async (ctx: any) => {
      narratorCallCount++;
      return {
        text: 'Você acorda na encruzilhada de pedra cinzenta.',
        executedTools: [],
        diceRolls: [],
      };
    },
    generateMasterResponse: async (ctx: any) => {
      narratorCallCount++;
      return {
        text: `Narrador responde a: "${ctx.currentUserInput}" (Chamada #${narratorCallCount})`,
        executedTools: [],
        diceRolls: [],
      };
    },
  };

  const gameEngine = new GameEngine(memoryManager, gameStateManager, mockNarratorService);
  (gameEngine as any).processPostTurnMemoryExtraction = async () => {};

  // Mock de req/res Express para testar withIdempotency
  function createMockExpress(headers: Record<string, string>, body: any, params: Record<string, string> = {}) {
    let statusCode = 200;
    let responseBody: any = null;
    const responseHeaders: Record<string, string> = {};

    const req: any = {
      headers: { ...headers },
      header: (name: string) => {
        const lower = name.toLowerCase();
        for (const k of Object.keys(headers)) {
          if (k.toLowerCase() === lower) return headers[k];
        }
        return undefined;
      },
      body,
      params,
    };

    const res: any = {
      status: (code: number) => {
        statusCode = code;
        return res;
      },
      json: (data: any) => {
        responseBody = data;
        return res;
      },
      setHeader: (name: string, val: string) => {
        responseHeaders[name] = val;
        return res;
      },
      getStatusCode: () => statusCode,
      getBody: () => responseBody,
      getHeaders: () => responseHeaders,
    };

    const next = (err?: any) => {
      if (err) throw err;
    };

    return { req, res, next };
  }

  // =========================================================================
  // CENÁRIO 1: Concorrência in-flight com a mesma chave (executa exatamente 1 vez)
  // =========================================================================
  console.log('--- CENÁRIO 1: Concorrência in-flight com mesma chave ---');
  try {
    const campaignId = 'camp_flight_1';
    gameStateManager.createCampaign({ campaignId, title: 'Campanha Concorrente' });
    await memoryManager.recordMessage(campaignId, 'assistant', 'Abertura da sessão.', 0);

    const idempotencyKey = 'key_concurrent_flight_123';
    let engineExecutions = 0;

    const executeAction = async (msg: string) => {
      const { req, res, next } = createMockExpress(
        { 'Idempotency-Key': idempotencyKey },
        { campaignId, message: msg }
      );

      await withIdempotency(
        req,
        res,
        next,
        {
          route: '/api/message',
          getScope: (r) => campaignId,
          getPayload: (r) => ({ campaignId, message: r.body.message }),
          execute: async () => {
            engineExecutions++;
            // Pequeno delay artificial para simular processamento assíncrono
            await new Promise((r) => setTimeout(r, 40));
            const output = await gameEngine.processPlayerAction(campaignId, msg);
            return { statusCode: 200, body: { success: true, data: output } };
          },
        },
        idempotencyManager
      );

      return { statusCode: res.getStatusCode(), body: res.getBody(), headers: res.getHeaders() };
    };

    // Dispara 2 requisições concorrentes exatamente ao mesmo tempo
    const [res1, res2] = await Promise.all([
      executeAction('Avanço para a torre'),
      executeAction('Avanço para a torre'),
    ]);

    if (engineExecutions !== 1) {
      throw new Error(`Engine deveria ter executado exatamente 1 vez, mas executou ${engineExecutions} vezes.`);
    }

    if (res1.statusCode !== 200 || res2.statusCode !== 200) {
      throw new Error(`Status esperado 200, mas recebeu ${res1.statusCode} e ${res2.statusCode}`);
    }

    if (res1.body.data.turn !== 1 || res2.body.data.turn !== 1) {
      throw new Error(`Ambas as respostas deveriam refletir turno 1. Recebido: ${res1.body.data.turn} e ${res2.body.data.turn}`);
    }

    const messages = await memoryManager.getRecentMessages(campaignId, 10);
    // Esperado: 1 abertura + 1 mensagem jogador + 1 mensagem mestre = 3 mensagens no total
    if (messages.length !== 3) {
      throw new Error(`Esperado 3 mensagens no histórico, mas encontrou ${messages.length}`);
    }

    console.log('✅ Cenário 1 PASSOU: 2 requisições simultâneas executaram a lógica de negócio apenas UMA vez.');
    passed++;
  } catch (err: any) {
    console.error('❌ Cenário 1 FALHOU:', err.message);
    failed++;
  }

  // =========================================================================
  // CENÁRIO 2: Retry após perda simulada da resposta HTTP (sem novo turno)
  // =========================================================================
  console.log('\n--- CENÁRIO 2: Retry após perda de resposta de rede (replay idempotente) ---');
  try {
    const campaignId = 'camp_replay_2';
    gameStateManager.createCampaign({ campaignId, title: 'Campanha Replay' });
    await memoryManager.recordMessage(campaignId, 'assistant', 'Início da aventura.', 0);

    const idempotencyKey = 'key_lost_response_456';
    let engineExecutions = 0;

    const makeRequest = async () => {
      const { req, res, next } = createMockExpress(
        { 'Idempotency-Key': idempotencyKey },
        { campaignId, message: 'Examino os baús antigos' }
      );

      await withIdempotency(
        req,
        res,
        next,
        {
          route: '/api/message',
          getScope: (r) => campaignId,
          getPayload: (r) => ({ campaignId, message: r.body.message }),
          execute: async () => {
            engineExecutions++;
            const output = await gameEngine.processPlayerAction(campaignId, 'Examino os baús antigos');
            return { statusCode: 200, body: { success: true, data: output } };
          },
        },
        idempotencyManager
      );

      return { statusCode: res.getStatusCode(), body: res.getBody(), headers: res.getHeaders() };
    };

    // Primeira tentativa: processada com sucesso no servidor, mas supõe-se que a resposta se perdeu na rede
    const initialRes = await makeRequest();
    if (initialRes.statusCode !== 200) {
      throw new Error(`Primeira requisição falhou com status ${initialRes.statusCode}`);
    }
    const initialTurn = initialRes.body.data.turn;
    const initialMasterText = initialRes.body.data.masterMessage.text;

    // Segunda tentativa: cliente reenviando com a mesma Idempotency-Key
    const replayRes = await makeRequest();

    if (engineExecutions !== 1) {
      throw new Error(`Engine foi reexecutado indevidamente! Chamadas: ${engineExecutions}`);
    }

    if (replayRes.statusCode !== 200) {
      throw new Error(`Replay falhou com status ${replayRes.statusCode}`);
    }

    if (replayRes.body.data.turn !== initialTurn) {
      throw new Error(`Turno avançou no replay! Esperado ${initialTurn}, recebido ${replayRes.body.data.turn}`);
    }

    if (replayRes.body.data.masterMessage.text !== initialMasterText) {
      throw new Error('Texto da resposta do Narrador diverge no replay!');
    }

    if (replayRes.headers['X-Idempotent-Replay'] !== 'true') {
      throw new Error('Header X-Idempotent-Replay não foi sinalizado no replay!');
    }

    const messages = await memoryManager.getRecentMessages(campaignId, 10);
    // Deve ter apenas 1 par user+assistant adicional (total 3 mensagens: abertura + user + assistant)
    if (messages.length !== 3) {
      throw new Error(`Histórico duplicou mensagens! Esperava 3, tem ${messages.length}`);
    }

    console.log('✅ Cenário 2 PASSOU: Replay retornou o mesmo resultado sem avançar novo turno nem duplicar mensagens.');
    passed++;
  } catch (err: any) {
    console.error('❌ Cenário 2 FALHOU:', err.message);
    failed++;
  }

  // =========================================================================
  // CENÁRIO 3: Mesma chave com payload diferente recebe HTTP 409 Conflict
  // =========================================================================
  console.log('\n--- CENÁRIO 3: Mesma chave com payload diferente (conflito 409) ---');
  try {
    const campaignId = 'camp_conflict_3';
    gameStateManager.createCampaign({ campaignId, title: 'Campanha Conflito' });
    await memoryManager.recordMessage(campaignId, 'assistant', 'Abertura do templo.', 0);

    const idempotencyKey = 'key_conflict_789';
    let engineExecutions = 0;

    const callApi = async (messageText: string) => {
      const { req, res, next } = createMockExpress(
        { 'Idempotency-Key': idempotencyKey },
        { campaignId, message: messageText }
      );

      await withIdempotency(
        req,
        res,
        next,
        {
          route: '/api/message',
          getScope: (r) => campaignId,
          getPayload: (r) => ({ campaignId, message: r.body.message }),
          execute: async () => {
            engineExecutions++;
            const output = await gameEngine.processPlayerAction(campaignId, messageText);
            return { statusCode: 200, body: { success: true, data: output } };
          },
        },
        idempotencyManager
      );

      return { statusCode: res.getStatusCode(), body: res.getBody() };
    };

    // Primeira chamada legítima com texto A
    const resA = await callApi('Abro o portal da esquerda');
    if (resA.statusCode !== 200) {
      throw new Error(`Primeira chamada falhou com status ${resA.statusCode}`);
    }

    // Segunda chamada reusando a mesma chave mas com texto B diferente
    const resB = await callApi('Pulo pela janela dos fundos');

    if (resB.statusCode !== 409) {
      throw new Error(`Esperado status 409 para payload divergente, mas recebeu ${resB.statusCode}`);
    }

    if (resB.body.code !== 'IDEMPOTENCY_CONFLICT') {
      throw new Error(`Código de erro esperado IDEMPOTENCY_CONFLICT, mas recebeu ${resB.body.code}`);
    }

    if (engineExecutions !== 1) {
      throw new Error(`Engine executou na requisição conflitante! Execuções: ${engineExecutions}`);
    }

    console.log('✅ Cenário 3 PASSOU: Reutilização da mesma chave com payload diferente rejeitada com HTTP 409.');
    passed++;
  } catch (err: any) {
    console.error('❌ Cenário 3 FALHOU:', err.message);
    failed++;
  }

  // =========================================================================
  // CENÁRIO 4: Nova chave com mesmo texto avança legitimamente novo turno
  // =========================================================================
  console.log('\n--- CENÁRIO 4: Nova chave com mesmo texto cria novo turno legítimo ---');
  try {
    const campaignId = 'camp_new_action_4';
    gameStateManager.createCampaign({ campaignId, title: 'Campanha Ações Repetidas' });
    await memoryManager.recordMessage(campaignId, 'assistant', 'Você está na arena de treinamento.', 0);

    const sendActionWithKey = async (key: string, msg: string) => {
      const { req, res, next } = createMockExpress(
        { 'Idempotency-Key': key },
        { campaignId, message: msg }
      );

      await withIdempotency(
        req,
        res,
        next,
        {
          route: '/api/message',
          getScope: (r) => campaignId,
          getPayload: (r) => ({ campaignId, message: r.body.message }),
          execute: async () => {
            const output = await gameEngine.processPlayerAction(campaignId, msg);
            return { statusCode: 200, body: { success: true, data: output } };
          },
        },
        idempotencyManager
      );

      return { statusCode: res.getStatusCode(), body: res.getBody() };
    };

    // Ação 1 com chave 1
    const res1 = await sendActionWithKey('key_turn_1', 'Atacar o boneco de madeira');
    if (res1.statusCode !== 200 || res1.body.data.turn !== 1) {
      throw new Error(`Turno 1 falhou: turn=${res1.body.data.turn}`);
    }

    // Ação 2 (jogador repete a mesma frase intencionalmente, gerando nova chave única)
    const res2 = await sendActionWithKey('key_turn_2', 'Atacar o boneco de madeira');
    if (res2.statusCode !== 200 || res2.body.data.turn !== 2) {
      throw new Error(`Turno 2 falhou: turn=${res2.body.data.turn}`);
    }

    const messages = await memoryManager.getRecentMessages(campaignId, 10);
    // 1 abertura + 2 ações + 2 respostas = 5 mensagens
    if (messages.length !== 5) {
      throw new Error(`Esperado 5 mensagens no histórico, encontrado ${messages.length}`);
    }

    console.log('✅ Cenário 4 PASSOU: Nova chave representou nova ação legítima, avançando turno para 2.');
    passed++;
  } catch (err: any) {
    console.error('❌ Cenário 4 FALHOU:', err.message);
    failed++;
  }

  // =========================================================================
  // CENÁRIO 5: Retry duplicado executa exatamente uma vez
  // =========================================================================
  console.log('\n--- CENÁRIO 5: Retry duplicado (/api/message/retry) executa uma vez ---');
  try {
    const campaignId = 'camp_retry_dup_5';
    gameStateManager.createCampaign({ campaignId, title: 'Campanha Retry Dup' });
    await memoryManager.recordMessage(campaignId, 'assistant', 'Abertura.', 0);
    await memoryManager.recordMessage(campaignId, 'user', 'Tento arrombar a fechadura.', 1);
    await memoryManager.recordMessage(campaignId, 'assistant', 'A ganzua quebra na fechadura.', 1);

    const retryKey = 'key_retry_dup_999';
    let retryCalls = 0;

    const callRetry = async () => {
      const { req, res, next } = createMockExpress(
        { 'Idempotency-Key': retryKey },
        { campaignId }
      );

      await withIdempotency(
        req,
        res,
        next,
        {
          route: '/api/message/retry',
          getScope: (r) => campaignId,
          getPayload: () => ({ campaignId }),
          execute: async () => {
            retryCalls++;
            const output = await gameEngine.retryLastPlayerAction(campaignId);
            return { statusCode: 200, body: { success: true, data: output } };
          },
        },
        idempotencyManager
      );

      return { statusCode: res.getStatusCode(), body: res.getBody() };
    };

    const firstRetry = await callRetry();
    const secondRetry = await callRetry();

    if (retryCalls !== 1) {
      throw new Error(`Retry deveria ter chamado o engine 1 vez, mas chamou ${retryCalls} vezes.`);
    }

    if (firstRetry.statusCode !== 200 || secondRetry.statusCode !== 200) {
      throw new Error(`Status de retry inválido: ${firstRetry.statusCode} / ${secondRetry.statusCode}`);
    }

    if (firstRetry.body.data.masterMessage.id !== secondRetry.body.data.masterMessage.id) {
      throw new Error('IDs das mensagens divergem entre o retry original e o replay idempotente!');
    }

    console.log('✅ Cenário 5 PASSOU: Retry duplicado com a mesma chave executou exatamente uma vez.');
    passed++;
  } catch (err: any) {
    console.error('❌ Cenário 5 FALHOU:', err.message);
    failed++;
  }

  // =========================================================================
  // CENÁRIO 6: Edit duplicado executa exatamente uma vez
  // =========================================================================
  console.log('\n--- CENÁRIO 6: Edit duplicado (/api/message/edit) executa uma vez ---');
  try {
    const campaignId = 'camp_edit_dup_6';
    gameStateManager.createCampaign({ campaignId, title: 'Campanha Edit Dup' });
    await memoryManager.recordMessage(campaignId, 'assistant', 'Abertura.', 0);
    await memoryManager.recordMessage(campaignId, 'user', 'Grito com o guarda.', 1);
    await memoryManager.recordMessage(campaignId, 'assistant', 'O guarda desembainha a espada.', 1);

    const editKey = 'key_edit_dup_888';
    let editCalls = 0;

    const callEdit = async () => {
      const { req, res, next } = createMockExpress(
        { 'Idempotency-Key': editKey },
        { campaignId, message: 'Falo calmamente com o guarda oferecendo uma moeda.' }
      );

      await withIdempotency(
        req,
        res,
        next,
        {
          route: '/api/message/edit',
          getScope: (r) => campaignId,
          getPayload: (r) => ({ campaignId, message: r.body.message }),
          execute: async () => {
            editCalls++;
            const output = await gameEngine.editLastPlayerAction(
              campaignId,
              'Falo calmamente com o guarda oferecendo uma moeda.'
            );
            return { statusCode: 200, body: { success: true, data: output } };
          },
        },
        idempotencyManager
      );

      return { statusCode: res.getStatusCode(), body: res.getBody() };
    };

    const firstEdit = await callEdit();
    const secondEdit = await callEdit();

    if (editCalls !== 1) {
      throw new Error(`Edit executou mais de uma vez! Chamadas: ${editCalls}`);
    }

    if (firstEdit.statusCode !== 200 || secondEdit.statusCode !== 200) {
      throw new Error(`Status de edit inválido: ${firstEdit.statusCode} / ${secondEdit.statusCode}`);
    }

    if (firstEdit.body.data.playerMessage.id !== secondEdit.body.data.playerMessage.id) {
      throw new Error('ID da mensagem do jogador editada diverge no replay!');
    }

    console.log('✅ Cenário 6 PASSOU: Edit duplicado com a mesma chave executou exatamente uma vez.');
    passed++;
  } catch (err: any) {
    console.error('❌ Cenário 6 FALHOU:', err.message);
    failed++;
  }

  // =========================================================================
  // CENÁRIO 7: Criação de campanha duplicada não cria 2 campanhas
  // =========================================================================
  console.log('\n--- CENÁRIO 7: Criação duplicada de campanha (/api/campaign/new) ---');
  try {
    const creationKey = 'key_new_campaign_777';
    let creationCalls = 0;

    const callNewCampaign = async () => {
      const { req, res, next } = createMockExpress(
        { 'Idempotency-Key': creationKey },
        { title: 'Reinos Perdidos', genre: 'Alta Fantasia' }
      );

      await withIdempotency(
        req,
        res,
        next,
        {
          route: '/api/campaign/new',
          getScope: () => 'campaign_creation',
          getPayload: (r) => r.body || {},
          execute: async () => {
            creationCalls++;
            const result = await gameEngine.startNewCampaign({
              title: 'Reinos Perdidos',
              genre: 'Alta Fantasia',
            });
            return { statusCode: 200, body: { success: true, data: result } };
          },
        },
        idempotencyManager
      );

      return { statusCode: res.getStatusCode(), body: res.getBody() };
    };

    const res1 = await callNewCampaign();
    const res2 = await callNewCampaign();

    if (creationCalls !== 1) {
      throw new Error(`startNewCampaign executou ${creationCalls} vezes ao invés de 1!`);
    }

    if (res1.statusCode !== 200 || res2.statusCode !== 200) {
      throw new Error(`Status de criação inválido: ${res1.statusCode} / ${res2.statusCode}`);
    }

    const campaignId1 = res1.body.data.campaignId;
    const campaignId2 = res2.body.data.campaignId;

    if (campaignId1 !== campaignId2) {
      throw new Error(`Campanhas diferentes foram criadas! id1=${campaignId1}, id2=${campaignId2}`);
    }

    console.log('✅ Cenário 7 PASSOU: Criação duplicada retornou a mesma campanha sem criar registro duplicado.');
    passed++;
  } catch (err: any) {
    console.error('❌ Cenário 7 FALHOU:', err.message);
    failed++;
  }

  // =========================================================================
  // CENÁRIO 8: fetchWithRetry no cliente protege contra retry inseguro de POST sem chave
  // =========================================================================
  console.log('\n--- CENÁRIO 8: fetchWithRetry diferencia métodos seguros e mutáveis ---');
  try {
    const originalFetch = globalThis.fetch;
    try {
      // Subcenário 8.1: POST SEM Idempotency-Key -> NÃO deve retentar na falha de rede (1 tentativa)
      let postNoKeyAttempts = 0;
      globalThis.fetch = async () => {
        postNoKeyAttempts++;
        throw new Error('Simulated network drop');
      };

      let postNoKeyThrew = false;
      try {
        await fetchWithRetry('/api/message', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: 'teste' }),
        }, 3, 10);
      } catch {
        postNoKeyThrew = true;
      }

      if (!postNoKeyThrew || postNoKeyAttempts !== 1) {
        throw new Error(`POST sem Idempotency-Key deveria falhar imediatamente (1 tentativa), mas fez ${postNoKeyAttempts} tentativas.`);
      }

      // Subcenário 8.2: GET sem chave -> Pode retentar normalmente (3 tentativas)
      let getAttempts = 0;
      globalThis.fetch = async () => {
        getAttempts++;
        throw new Error('Simulated network drop');
      };

      let getThrew = false;
      try {
        await fetchWithRetry('/api/status', { method: 'GET' }, 3, 10);
      } catch {
        getThrew = true;
      }

      if (!getThrew || getAttempts !== 3) {
        throw new Error(`GET seguro deveria ter tentado 3 vezes, mas fez ${getAttempts} tentativas.`);
      }

      // Subcenário 8.3: POST COM Idempotency-Key -> Retenta com segurança mantendo a chave
      let postWithKeyAttempts = 0;
      const testKey = generateIdempotencyKey();
      let sentKeys: string[] = [];

      globalThis.fetch = async (url: any, opts: any) => {
        postWithKeyAttempts++;
        const headers = new Headers(opts?.headers || {});
        sentKeys.push(headers.get('Idempotency-Key') || '');
        if (postWithKeyAttempts < 3) {
          throw new Error('Simulated transient drop');
        }
        return new Response(JSON.stringify({ success: true }), { status: 200 });
      };

      const postWithKeyRes = await fetchWithRetry('/api/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': testKey,
        },
        body: JSON.stringify({ message: 'teste com chave' }),
      }, 3, 10);

      if (!postWithKeyRes.ok) {
        throw new Error('POST com chave deveria ter sido bem-sucedido na 3ª tentativa.');
      }

      if (postWithKeyAttempts !== 3) {
        throw new Error(`POST com chave deveria ter tentado 3 vezes até o sucesso, mas fez ${postWithKeyAttempts}.`);
      }

      // Verifica se TODAS as 3 tentativas usaram exatamente a MESMA chave de idempotência
      const allSameKey = sentKeys.every((k) => k === testKey);
      if (!allSameKey || sentKeys.length !== 3) {
        throw new Error(`Tentativas de retry alteraram a chave de idempotência indevidamente! Chaves: ${JSON.stringify(sentKeys)}`);
      }

      console.log('✅ Cenário 8 PASSOU: fetchWithRetry bloqueia retry cego de POST sem chave e retenta com segurança quando há chave.');
      passed++;
    } finally {
      // Restauração incondicional do fetch global
      globalThis.fetch = originalFetch;
    }
  } catch (err: any) {
    console.error('❌ Cenário 8 FALHOU:', err.message);
    failed++;
  }

  // =========================================================================
  // CENÁRIO 9: Persistência em disco sobrevive a restart do servidor
  // =========================================================================
  console.log('\n--- CENÁRIO 9: Persistência em disco sobrevive a restart do processo ---');
  try {
    const campaignId = 'camp_restart_9';
    gameStateManager.createCampaign({ campaignId, title: 'Campanha Restart Test' });
    await memoryManager.recordMessage(campaignId, 'assistant', 'Abertura persistida.', 0);

    const restartKey = 'key_restart_durable_101';
    let executions = 0;

    // 1. Executa na primeira instância do IdempotencyManager
    const { req: req1, res: res1, next: next1 } = createMockExpress(
      { 'Idempotency-Key': restartKey },
      { campaignId, message: 'Investigo as marcas no chão' }
    );

    await withIdempotency(
      req1,
      res1,
      next1,
      {
        route: '/api/message',
        getScope: (r) => campaignId,
        getPayload: (r) => ({ campaignId, message: r.body.message }),
        execute: async () => {
          executions++;
          const output = await gameEngine.processPlayerAction(campaignId, 'Investigo as marcas no chão');
          return { statusCode: 200, body: { success: true, data: output } };
        },
      },
      idempotencyManager
    );

    if (executions !== 1 || res1.getStatusCode() !== 200) {
      throw new Error(`Falha na primeira execução: status=${res1.getStatusCode()}, execs=${executions}`);
    }
    const savedTurn = res1.getBody().data.turn;
    const savedMasterText = res1.getBody().data.masterMessage.text;

    // 2. Simula RESTART DO SERVIDOR:
    // Cria uma NOVA instância de IdempotencyManager apontando para o mesmo diretório de dados em disco,
    // com a memória RAM completamente zerada (sem cache em memória)
    const freshManagerAfterRestart = new IdempotencyManager(idemDir);

    const { req: req2, res: res2, next: next2 } = createMockExpress(
      { 'Idempotency-Key': restartKey },
      { campaignId, message: 'Investigo as marcas no chão' }
    );

    await withIdempotency(
      req2,
      res2,
      next2,
      {
        route: '/api/message',
        getScope: (r) => campaignId,
        getPayload: (r) => ({ campaignId, message: r.body.message }),
        execute: async () => {
          executions++;
          const output = await gameEngine.processPlayerAction(campaignId, 'Investigo as marcas no chão');
          return { statusCode: 200, body: { success: true, data: output } };
        },
      },
      freshManagerAfterRestart
    );

    if (executions !== 1) {
      throw new Error(`Engine foi reexecutado após restart! Execuções: ${executions}`);
    }

    if (res2.getStatusCode() !== 200) {
      throw new Error(`Status pós-restart inválido: ${res2.getStatusCode()}`);
    }

    if (res2.getBody().data.turn !== savedTurn) {
      throw new Error(`Turno pós-restart divergiu: ${res2.getBody().data.turn} !== ${savedTurn}`);
    }

    if (res2.getBody().data.masterMessage.text !== savedMasterText) {
      throw new Error('Texto da resposta do Narrador divergiu após leitura do disco no restart!');
    }

    if (res2.getHeaders()['X-Idempotent-Replay'] !== 'true') {
      throw new Error('Header X-Idempotent-Replay não foi sinalizado após restart!');
    }

    console.log('✅ Cenário 9 PASSOU: Nova instância leu registro do disco com sucesso sem reexecutar a engine.');
    passed++;
  } catch (err: any) {
    console.error('❌ Cenário 9 FALHOU:', err.message);
    failed++;
  }

  // =========================================================================
  // CENÁRIO 10A: Falha controlada de writeFile na persistência
  // =========================================================================
  console.log('\n--- CENÁRIO 10A: Falha controlada de writeFile na persistência ---');
  try {
    const campaignId = 'camp_io_fail_write';
    const testWriteKey = 'key_fail_write_10a';
    const isolationDir = path.join(testBaseDir, 'idem_io_write');
    fs.mkdirSync(isolationDir, { recursive: true });
    const isolatedManager = new IdempotencyManager(isolationDir);

    const originalWriteFile = fs.promises.writeFile;
    let writeInduced = false;

    fs.promises.writeFile = async (file: any, data: any, options: any) => {
      if (typeof file === 'string' && file.includes('idem_io_write')) {
        writeInduced = true;
        throw new Error('EACCES: permission denied simulated on writeFile');
      }
      return originalWriteFile.call(fs.promises, file, data, options);
    };

    let caughtError: any = null;
    try {
      await isolatedManager.process({
        route: '/api/message',
        scope: campaignId,
        key: testWriteKey,
        payload: { campaignId, message: 'Tentativa com falha em writeFile' },
        execute: async () => {
          return { statusCode: 200, body: { success: true, data: { action: 'done' } } };
        },
      });
    } catch (err) {
      caughtError = err;
    } finally {
      fs.promises.writeFile = originalWriteFile;
    }

    if (!writeInduced) {
      throw new Error('A falha de writeFile não foi induzida no caminho esperado.');
    }

    // 1. O erro de persistência é observável pelo chamador
    if (!caughtError) {
      throw new Error('A falha de persistência foi engolida silenciosamente!');
    }
    if (!(caughtError instanceof IdempotencyPersistenceError)) {
      throw new Error(`Erro retornado não é IdempotencyPersistenceError: ${caughtError?.message || caughtError}`);
    }

    // 2. O registro não ficou disponível no cache em memória como concluído
    const compositeKey = isolatedManager.computeCompositeKey('/api/message', campaignId, testWriteKey);
    const cachedRecord = await isolatedManager.getRecord(compositeKey);
    if (cachedRecord !== null) {
      throw new Error('O registro ficou indevidamente disponível no cache após falha de persistência!');
    }

    // 3. Uma nova instância do manager não encontra o registro no disco
    const freshManager = new IdempotencyManager(isolationDir);
    const diskRecord = await freshManager.getRecord(compositeKey);
    if (diskRecord !== null) {
      throw new Error('Nova instância encontrou registro no disco após falha de gravação!');
    }

    // 4. Não existe arquivo final parcial ou corrompido, e arquivos temporários não restaram
    const filesInDir = fs.readdirSync(isolationDir);
    const relatedFiles = filesInDir.filter((f) => f.includes(testWriteKey));
    if (relatedFiles.length > 0) {
      throw new Error(`Arquivos residuais ou temporários encontrados no diretório: ${JSON.stringify(relatedFiles)}`);
    }

    console.log('✅ Cenário 10A PASSOU: Falha de writeFile propagou erro, cache permaneceu limpo e sem arquivos corrompidos.');
    passed++;
  } catch (err: any) {
    console.error('❌ Cenário 10A FALHOU:', err.message);
    failed++;
  }

  // =========================================================================
  // CENÁRIO 10B: Falha controlada de rename na persistência (limpeza de temporário)
  // =========================================================================
  console.log('\n--- CENÁRIO 10B: Falha controlada de rename na persistência ---');
  try {
    const campaignId = 'camp_io_fail_rename';
    const testRenameKey = 'key_fail_rename_10b';
    const isolationDir = path.join(testBaseDir, 'idem_io_rename');
    fs.mkdirSync(isolationDir, { recursive: true });
    const isolatedManager = new IdempotencyManager(isolationDir);

    const originalRename = fs.promises.rename;
    let renameInduced = false;

    fs.promises.rename = async (oldPath: any, newPath: any) => {
      if (typeof oldPath === 'string' && oldPath.includes('idem_io_rename')) {
        renameInduced = true;
        throw new Error('EXDEV: cross-device link simulated on rename');
      }
      return originalRename.call(fs.promises, oldPath, newPath);
    };

    let caughtError: any = null;
    try {
      await isolatedManager.process({
        route: '/api/message',
        scope: campaignId,
        key: testRenameKey,
        payload: { campaignId, message: 'Tentativa com falha em rename' },
        execute: async () => {
          return { statusCode: 200, body: { success: true, data: { action: 'rename_done' } } };
        },
      });
    } catch (err) {
      caughtError = err;
    } finally {
      fs.promises.rename = originalRename;
    }

    if (!renameInduced) {
      throw new Error('A falha de rename não foi induzida no caminho esperado.');
    }

    // 1. O erro de persistência é observável pelo chamador
    if (!caughtError) {
      throw new Error('A falha de rename foi engolida silenciosamente!');
    }
    if (!(caughtError instanceof IdempotencyPersistenceError)) {
      throw new Error(`Erro retornado não é IdempotencyPersistenceError: ${caughtError?.message || caughtError}`);
    }

    // 2. O registro não ficou disponível no cache em memória como concluído
    const compositeKey = isolatedManager.computeCompositeKey('/api/message', campaignId, testRenameKey);
    const cachedRecord = await isolatedManager.getRecord(compositeKey);
    if (cachedRecord !== null) {
      throw new Error('O registro ficou indevidamente disponível no cache após falha de rename!');
    }

    // 3. Uma nova instância do manager não encontra o registro no disco
    const freshManager = new IdempotencyManager(isolationDir);
    const diskRecord = await freshManager.getRecord(compositeKey);
    if (diskRecord !== null) {
      throw new Error('Nova instância encontrou registro no disco após falha de rename!');
    }

    // 4. Validação crucial: o arquivo temporário gerado pelo writeFile foi removido pelo unlink no bloco catch
    const filesInDir = fs.readdirSync(isolationDir);
    const tmpFiles = filesInDir.filter((f) => f.includes('.tmp.'));
    if (tmpFiles.length > 0) {
      throw new Error(`Arquivo temporário NÃO foi removido após falha de rename: ${JSON.stringify(tmpFiles)}`);
    }

    // 5. Nenhum arquivo final foi gerado
    const finalFiles = filesInDir.filter((f) => f.endsWith('.json') && f.includes(testRenameKey));
    if (finalFiles.length > 0) {
      throw new Error(`Arquivo final foi criado indevidamente: ${JSON.stringify(finalFiles)}`);
    }

    console.log('✅ Cenário 10B PASSOU: Falha de rename propagou erro, removeu arquivo temporário e manteve cache/disco consistentes.');
    passed++;
  } catch (err: any) {
    console.error('❌ Cenário 10B FALHOU:', err.message);
    failed++;
  }

  } finally {
    // Cleanup incondicional do diretório temporário raiz da suíte (sucesso ou falha)
    try {
      await fs.promises.rm(testBaseDir, { recursive: true, force: true });
    } catch (cleanupErr) {
      console.warn('Aviso ao remover testBaseDir temporário:', cleanupErr);
    }
  }

  // Validação explícita de higiene pós-execução:
  // 1. O diretório temporário não existe mais
  if (fs.existsSync(testBaseDir)) {
    throw new Error(`Falha de higiene: diretório temporário de testes ${testBaseDir} ainda existe após cleanup!`);
  }

  // 2. Não restaram arquivos de teste gerados dentro de data/
  const projectDataDir = path.join(process.cwd(), 'data');
  if (fs.existsSync(projectDataDir)) {
    const dataEntries = fs.readdirSync(projectDataDir);
    const testArtifacts = dataEntries.filter((name) => name.startsWith('test_idem_') || name.includes('idem_io_'));
    if (testArtifacts.length > 0) {
      throw new Error(`Falha de higiene: artefatos de teste encontrados em data/: ${JSON.stringify(testArtifacts)}`);
    }
  }

  console.log('\n===============================================================');
  console.log(`RESULTADO FINAL: ${passed} PASSOU | ${failed} FALHOU`);
  console.log('Higiene de persistência: testBaseDir removido e data/ limpo com sucesso.');
  console.log('===============================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runAllIdempotencyTests().catch((err) => {
  console.error('Erro fatal nos testes de idempotência:', err);
  process.exit(1);
});
