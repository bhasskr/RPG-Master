/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getModelChain, summarizeApiError } from '../modelPolicy';

function runTests() {
  console.log('===============================================================');
  console.log('TESTE: Revisão e Auditoria da Política de Modelos Gemini');
  console.log('===============================================================\n');

  let passed = 0;
  let total = 0;

  // 1. Narrador padrão: gemini-3.8-flash -> gemini-3.7-flash -> gemini-3.1-flash-lite
  total++;
  console.log('[TESTE 1] Validando cadeia padrão do Narrador (Free Tier / Estável)...');
  const narratorChain = getModelChain('NARRATOR');
  console.log(' -> Cadeia do Narrador:', narratorChain);

  if (
    narratorChain.length === 3 &&
    narratorChain[0] === 'gemini-3.8-flash' &&
    narratorChain[1] === 'gemini-3.7-flash' &&
    narratorChain[2] === 'gemini-3.1-flash-lite'
  ) {
    console.log(' -> PASSED: Cadeia padrão do Narrador configurada perfeitamente com gemini-3.8-flash prioritário e fallbacks estáveis.\n');
    passed++;
  } else {
    console.error(' -> FAILED: Cadeia padrão do Narrador incorreta:', narratorChain);
  }

  // 2. Garantir que gemini-flash-latest e modelos deprecados foram completamente removidos
  total++;
  console.log('[TESTE 2] Validando ausência de aliases dinâmicos e modelos deprecados...');
  const allTasks = ['NARRATOR', 'WORLD_GENERATION', 'MEMORY_EXTRACTION', 'INTERNAL_LIGHTWEIGHT'] as const;
  let hasForbiddenModels = false;

  for (const task of allTasks) {
    const chain = getModelChain(task);
    if (
      chain.includes('gemini-flash-latest') ||
      chain.includes('gemini-1.5-flash') ||
      chain.includes('gemini-1.5-pro') ||
      chain.includes('gemini-2.0-flash') ||
      chain.includes('gemini-2.0-pro')
    ) {
      hasForbiddenModels = true;
      console.error(` -> Modelo proibido/alias encontrado na tarefa ${task}:`, chain);
    }
  }

  if (!hasForbiddenModels) {
    console.log(' -> PASSED: Nenhum modelo deprecado ou alias dinâmico presente nas cadeias de modelo.\n');
    passed++;
  } else {
    console.error(' -> FAILED: Modelos proibidos/aliases encontrados.\n');
  }

  // 3. Narrador com preferBestAvailableNarrator = true (Pro Preview opcional no topo)
  total++;
  console.log('[TESTE 3] Validando modo opcional preferBestAvailableNarrator...');
  const narratorProChain = getModelChain('NARRATOR', { preferBestAvailableNarrator: true });
  console.log(' -> Cadeia com preferência Pro:', narratorProChain);

  if (
    narratorProChain[0] === 'gemini-3.1-pro-preview' &&
    narratorProChain[1] === 'gemini-3.8-flash' &&
    narratorProChain[2] === 'gemini-3.7-flash' &&
    narratorProChain[3] === 'gemini-3.1-flash-lite'
  ) {
    console.log(' -> PASSED: preferBestAvailableNarrator insere gemini-3.1-pro-preview no topo sem corromper a ordem de fallback.\n');
    passed++;
  } else {
    console.error(' -> FAILED: Cadeia Pro incorreta:', narratorProChain);
  }

  // 4. Geração de Mundo (Cenários e Fundação)
  total++;
  console.log('[TESTE 4] Validando cadeia de WORLD_GENERATION...');
  const worldGenChain = getModelChain('WORLD_GENERATION');
  console.log(' -> Cadeia de World Gen:', worldGenChain);

  if (
    worldGenChain[0] === 'gemini-3.8-flash' &&
    worldGenChain[1] === 'gemini-3.7-flash' &&
    worldGenChain[2] === 'gemini-3.1-flash-lite' &&
    !worldGenChain.includes('gemini-3.1-pro-preview')
  ) {
    console.log(' -> PASSED: WORLD_GENERATION utiliza gemini-3.8-flash como primário e não usa Pro por padrão.\n');
    passed++;
  } else {
    console.error(' -> FAILED: Cadeia de WORLD_GENERATION incorreta:', worldGenChain);
  }

  // 5. Memory Extractor (Cadeia otimizada para preservar cota do narrador)
  total++;
  console.log('[TESTE 5] Validando cadeia de MEMORY_EXTRACTION...');
  const extractorChain = getModelChain('MEMORY_EXTRACTION');
  console.log(' -> Cadeia de Memory Extraction:', extractorChain);

  if (
    extractorChain[0] === 'gemini-3.1-flash-lite' &&
    extractorChain[1] === 'gemini-3.8-flash' &&
    extractorChain[2] === 'gemini-3.7-flash'
  ) {
    console.log(' -> PASSED: MEMORY_EXTRACTION utiliza gemini-3.1-flash-lite prioritário para economizar cota e gemini-3.8-flash como fallback.\n');
    passed++;
  } else {
    console.error(' -> FAILED: Cadeia de MEMORY_EXTRACTION incorreta:', extractorChain);
  }

  // 6. Tarefas Internas Leves
  total++;
  console.log('[TESTE 6] Validando cadeia de INTERNAL_LIGHTWEIGHT...');
  const internalChain = getModelChain('INTERNAL_LIGHTWEIGHT');
  console.log(' -> Cadeia de Tarefas Internas:', internalChain);

  if (
    internalChain[0] === 'gemini-3.1-flash-lite' &&
    internalChain[1] === 'gemini-3.8-flash'
  ) {
    console.log(' -> PASSED: INTERNAL_LIGHTWEIGHT utiliza flash-lite como primário e 3.8-flash como fallback.\n');
    passed++;
  } else {
    console.error(' -> FAILED: Cadeia de INTERNAL_LIGHTWEIGHT incorreta:', internalChain);
  }

  // 7. Testes de tratamento de 429 (Rate Limit) e 503 (Service Unavailable)
  total++;
  console.log('[TESTE 7] Validando detecção e classificação de 429/503 e erros transientes...');
  const error429 = summarizeApiError(new Error('HTTP 429 Too Many Requests: RESOURCE_EXHAUSTED quota exceeded'));
  const error503 = summarizeApiError(new Error('503 Service Unavailable: Model is overloaded on gemini-3.8-flash'));
  const errorTimeout = summarizeApiError(new Error('DEADLINE_EXCEEDED: request timed out'));

  if (
    error429.isRateLimit &&
    error429.isTransient &&
    error429.errorType === 'RATE_LIMIT_429' &&
    error503.isTransient &&
    error503.errorType === 'SERVICE_UNAVAILABLE_503' &&
    errorTimeout.isTransient &&
    errorTimeout.errorType === 'TIMEOUT'
  ) {
    console.log(' -> PASSED: Erros de rate limit 429, indisponibilidade 503 e timeout classificados corretamente para disparo de fallback.\n');
    passed++;
  } else {
    console.error(' -> FAILED: Classificação de erros inconsistente.');
  }

  console.log('===============================================================');
  console.log(`RESULTADO DOS TESTES: ${passed}/${total} APROVADOS`);
  console.log('===============================================================');

  if (passed !== total) {
    process.exit(1);
  }
}

runTests();
