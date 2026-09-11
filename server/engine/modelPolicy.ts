/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type ModelTaskType =
  | 'NARRATOR'
  | 'WORLD_GENERATION'
  | 'MEMORY_EXTRACTION'
  | 'INTERNAL_LIGHTWEIGHT';

export interface ModelPolicyOptions {
  preferBestAvailableNarrator?: boolean;
}

export interface ModelPolicyLog {
  functionExecuted: string;
  modelAttempted: string;
  modelSucceeded?: string;
  fallbackUsed?: boolean;
  summarizedError?: string;
}

/**
 * 1. NARRADOR — PRIORIDADE MÁXIMA
 * O Narrador recebe prioridade de qualidade narrativa, coerência e raciocínio.
 *
 * Ordem padrão (Estáveis / Free Tier prioritário):
 * 1. gemini-3.8-flash (GA / Padrão oficial atual de qualidade e raciocínio)
 * 2. gemini-3.7-flash (Fallback estável robusto para ferramentas e narrativa)
 * 3. gemini-3.1-flash-lite (Fallback ultraleve e resiliente a exaustão de quota)
 */
const NARRATOR_MODELS_STANDARD = [
  'gemini-3.8-flash',
  'gemini-3.7-flash',
  'gemini-3.1-flash-lite',
] as const;

/**
 * 2. GEMINI 3.1 PRO (Opcional quando explicitamente preferido e chave permitir)
 * Nunca faz parte da cadeia padrão de API gratuita.
 */
const NARRATOR_MODELS_PREFER_PRO = [
  'gemini-3.1-pro-preview',
  'gemini-3.8-flash',
  'gemini-3.7-flash',
  'gemini-3.1-flash-lite',
] as const;

/**
 * 3. CENÁRIOS E FOUNDATION (WORLD_GENERATION)
 * Tarefas que demandam criatividade, coerência estética e worldbuilding rico.
 */
const WORLD_GENERATION_MODELS = [
  'gemini-3.8-flash',
  'gemini-3.7-flash',
  'gemini-3.1-flash-lite',
] as const;

/**
 * 4. MEMORY EXTRACTOR (MEMORY_EXTRACTION)
 * Tarefa estruturada, JSON rigoroso e frequente. Utiliza modelos mais leves para preservar
 * a cota dos modelos Flash maiores para as respostas narrativas do jogador.
 */
const MEMORY_EXTRACTION_MODELS = [
  'gemini-3.1-flash-lite',
  'gemini-3.8-flash',
  'gemini-3.7-flash',
] as const;

/**
 * 5. TAREFAS INTERNAS SIMPLES (INTERNAL_LIGHTWEIGHT)
 * Para classificação, JSON estruturado, transformações simples e análises curtas.
 */
const INTERNAL_LIGHTWEIGHT_MODELS = [
  'gemini-3.1-flash-lite',
  'gemini-3.8-flash',
] as const;

/**
 * Obtém a cadeia ordenada de modelos recomendada para cada tipo de tarefa.
 */
export function getModelChain(task: ModelTaskType, options?: ModelPolicyOptions): string[] {
  switch (task) {
    case 'NARRATOR':
      if (options?.preferBestAvailableNarrator) {
        return [...NARRATOR_MODELS_PREFER_PRO];
      }
      return [...NARRATOR_MODELS_STANDARD];

    case 'WORLD_GENERATION':
      return [...WORLD_GENERATION_MODELS];

    case 'MEMORY_EXTRACTION':
      return [...MEMORY_EXTRACTION_MODELS];

    case 'INTERNAL_LIGHTWEIGHT':
      return [...INTERNAL_LIGHTWEIGHT_MODELS];

    default:
      return [...INTERNAL_LIGHTWEIGHT_MODELS];
  }
}

/**
 * Normaliza e resume o erro da API em uma categoria limpa e estruturada,
 * evitando despejar payloads gigantes ou dados brutos no console.
 */
export function summarizeApiError(error: unknown): {
  errorType: string;
  isRateLimit: boolean;
  isBillingOrPermission: boolean;
  isTransient: boolean;
  message: string;
} {
  const rawMsg = (error as Error)?.message || String(error);

  const isRateLimit =
    rawMsg.includes('429') ||
    rawMsg.includes('RESOURCE_EXHAUSTED') ||
    rawMsg.includes('quota') ||
    rawMsg.includes('Rate limit') ||
    rawMsg.includes('Too Many Requests');

  const isBillingOrPermission =
    rawMsg.includes('403') ||
    rawMsg.includes('PERMISSION_DENIED') ||
    rawMsg.includes('billing') ||
    rawMsg.includes('not enabled') ||
    rawMsg.includes('ACCESS_TOKEN_SCOPE_INSUFFICIENT') ||
    rawMsg.includes('404') ||
    rawMsg.includes('NOT_FOUND') ||
    rawMsg.includes('unregistered') ||
    rawMsg.includes('API_KEY_INVALID');

  const isTransient =
    isRateLimit ||
    isBillingOrPermission ||
    rawMsg.includes('503') ||
    rawMsg.includes('UNAVAILABLE') ||
    rawMsg.includes('high demand') ||
    rawMsg.includes('timed out') ||
    rawMsg.includes('timeout') ||
    rawMsg.includes('fetch failed') ||
    rawMsg.includes('DEADLINE_EXCEEDED');

  let errorType = 'UNKNOWN_ERROR';
  if (isRateLimit) errorType = 'RATE_LIMIT_429';
  else if (isBillingOrPermission) errorType = 'BILLING_OR_PERMISSION';
  else if (rawMsg.includes('503') || rawMsg.includes('UNAVAILABLE')) errorType = 'SERVICE_UNAVAILABLE_503';
  else if (rawMsg.includes('timeout') || rawMsg.includes('timed out') || rawMsg.includes('DEADLINE_EXCEEDED')) errorType = 'TIMEOUT';
  else if (rawMsg.includes('fetch failed') || rawMsg.includes('network')) errorType = 'NETWORK_ERROR';

  let cleanSummary = rawMsg.replace(/[\n\r]+/g, ' ').trim();
  try {
    const jsonMatch = cleanSummary.match(/\{.*"message"\s*:\s*"([^"]+)".*\}/);
    if (jsonMatch && jsonMatch[1]) {
      cleanSummary = jsonMatch[1];
    }
  } catch {
    // fallback to slice
  }
  cleanSummary = cleanSummary.slice(0, 100);

  return {
    errorType,
    isRateLimit,
    isBillingOrPermission,
    isTransient,
    message: cleanSummary,
  };
}

/**
 * Registra logs resumidos sem poluir o console com payloads brutos da API.
 */
export function logModelExecution(log: ModelPolicyLog): void {
  if (log.fallbackUsed || log.summarizedError) {
    console.info(
      `[ModelPolicy] [${log.functionExecuted}] Modelo: ${log.modelAttempted} -> Erro: ${log.summarizedError || 'Falha'} -> Alternando para próximo modelo na cadeia.`
    );
  } else if (log.modelSucceeded) {
    console.info(
      `[ModelPolicy] [${log.functionExecuted}] Sucesso via modelo: ${log.modelSucceeded}`
    );
  }
}
