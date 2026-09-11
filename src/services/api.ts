/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ChatMessage, GameState, ApiStatusData } from '../types';

export interface NewCampaignPayload {
  title?: string;
  genre?: string;
  premise?: string;
  tone?: string;
  rulesOfUniverse?: string;
  worldDetails?: FoundationDetails;
  startingLocation?: string;
  campaignFormat?: 'sandbox' | 'focused';
  worldBasis?: 'real_world' | 'fictional';
  playerName?: string;
  playerArchetype?: string;
  playerDescription?: string;
  playerBackstory?: string;
  charAge?: string;
  charPronouns?: string;
  charConcept?: string;
  charAppearance?: string;
  charFeatures?: string;
  charOrigin?: string;
  charOccupation?: string;
  charRoutine?: string;
  charRelationships?: string;
  charGoals?: string;
  charStats?: string;
  charEquipment?: string;
  experienceType?: string;
  customExperienceText?: string;
  mechanicalProfile?: string;
  customMechanicalText?: string;
  masterResponseLength?: string;
  masterPacing?: string;
  masterDescriptionLevel?: string;
  masterFocus?: string;
  masterTone?: string;
}

export interface FoundationDetails {
  identityAndState: string;
  geography: string;
  everydayLife: string;
  magicAndTechnology: string;
  economyAndLogistics: string;
  factionsAndPower: string;
  dangersAndOpportunities: string;
  currentEvents: string;
}

export interface ScenarioOption {
  id: string;
  title: string;
  genre: string;
  worldIdentity: string;
  description: string;
  startingLocation: string;
  tone?: string;
  themeTags?: string[];
  premise?: string;
  setting?: string;
  coreConflict?: string;
  core_conflict?: string;
}

export interface GuidedPremiseInput {
  focus?: 'romance' | 'drama' | 'investigation' | 'adventure' | 'survival' | 'intrigue' | string;
  dynamics?: string;
  lifeStage?: string;
  socioeconomic?: string;
  location?: string;
  customLocation?: string;
  realism?: string;
  additionalDetails?: string;
}

export interface CharacterConceptSuggestion {
  id: string;
  concept: string;
  suggestedRole: string;
  hook: string;
  suggestedEquipment?: string;
  suggestedStats?: string;
}

export interface NewCampaignResponse {
  success: boolean;
  data: {
    campaignId: string;
    gameState: GameState;
    openingMessage?: ChatMessage;
  };
}

export interface SendMessageResponse {
  success: boolean;
  data: {
    playerMessage: ChatMessage;
    masterMessage: ChatMessage;
    gameState: GameState;
    turn: number;
    campaignId?: string;
  };
}

export interface CampaignDetailsResponse {
  success: boolean;
  data: {
    gameState: GameState;
    messages: ChatMessage[];
    recentMemories: unknown[];
  };
}

export class ApiError extends Error {
  constructor(
    message: string,
    public code?: string,
    public status?: number,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function fetchWithRetry(url: string, options: RequestInit = {}, maxRetries = 2, delayMs = 500): Promise<Response> {
  let attempt = 0;
  let delay = delayMs;

  while (attempt < maxRetries) {
    attempt++;
    try {
      return await fetch(url, options);
    } catch (err: unknown) {
      if (attempt >= maxRetries) {
        const message = (err as Error)?.message || 'Falha de conexão com o servidor.';
        throw new ApiError(message, 'NETWORK_ERROR');
      }
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay *= 1.5;
    }
  }

  throw new ApiError('Falha ao conectar com o servidor após múltiplas tentativas.', 'NETWORK_ERROR');
}

async function handleResponse<T>(res: Response): Promise<T> {
  let json: Record<string, unknown> | null = null;
  const text = await res.text();

  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  if (!res.ok) {
    const errorMsg = (json && typeof json.error === 'string')
      ? json.error
      : (text && text.length < 200 && !text.includes('<!DOCTYPE') ? text : `Erro na requisição (${res.status} ${res.statusText})`);
    const errorCode = (json && typeof json.code === 'string')
      ? json.code
      : 'HTTP_ERROR';
    throw new ApiError(errorMsg, errorCode, res.status, json?.details);
  }

  if (!json) {
    throw new ApiError('Resposta vazia ou inválida do servidor.', 'EMPTY_RESPONSE', res.status);
  }

  return json as T;
}

export const api = {
  async generateScenarios(options?: {
    format?: 'sandbox' | 'focused';
    worldBasis?: 'real_world' | 'fictional';
    premise?: string;
    guidedPremise?: GuidedPremiseInput;
  }): Promise<ScenarioOption[]> {
    const res = await fetchWithRetry('/api/scenarios/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options || {}),
    });
    const result = await handleResponse<{ success: boolean; data: { scenarios: ScenarioOption[] } }>(res);
    if (!result || !result.data || !result.data.scenarios) {
      throw new ApiError('Não foi possível gerar cenários.', 'INVALID_RESPONSE');
    }
    return result.data.scenarios;
  },

  async generateScenarioFromIdea(
    idea: string,
    options?: { format?: 'sandbox' | 'focused'; worldBasis?: 'real_world' | 'fictional' }
  ): Promise<ScenarioOption> {
    const res = await fetchWithRetry('/api/scenarios/from-idea', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idea, format: options?.format, worldBasis: options?.worldBasis }),
    });
    const result = await handleResponse<{ success: boolean; data: { scenario: ScenarioOption } }>(res);
    if (!result || !result.data || !result.data.scenario) {
      throw new ApiError('Não foi possível interpretar sua ideia.', 'INVALID_RESPONSE');
    }
    return result.data.scenario;
  },

  async generateFoundation(
    scenario: ScenarioOption,
    options?: {
      format?: 'sandbox' | 'focused';
      worldBasis?: 'real_world' | 'fictional';
      premise?: string;
      guidedPremise?: GuidedPremiseInput;
    }
  ): Promise<FoundationDetails> {
    const res = await fetchWithRetry('/api/scenarios/foundation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scenario,
        format: options?.format,
        worldBasis: options?.worldBasis,
        premise: options?.premise,
        guidedPremise: options?.guidedPremise,
      }),
    });
    const result = await handleResponse<{ success: boolean; data: { foundation: FoundationDetails } }>(res);
    if (!result || !result.data || !result.data.foundation) {
      throw new ApiError('Não foi possível expandir a fundação do mundo.', 'INVALID_RESPONSE');
    }
    return result.data.foundation;
  },

  async generateMasterProposal(
    format: 'sandbox' | 'focused',
    worldBasis?: 'real_world' | 'fictional'
  ): Promise<{
    scenario: ScenarioOption;
    foundation: FoundationDetails;
  }> {
    const res = await fetchWithRetry('/api/scenarios/master-proposal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ format, worldBasis }),
    });
    const result = await handleResponse<{
      success: boolean;
      data: { scenario: ScenarioOption; foundation: FoundationDetails };
    }>(res);
    if (!result || !result.data || !result.data.scenario || !result.data.foundation) {
      throw new ApiError('Não foi possível gerar a proposta do Mestre.', 'INVALID_RESPONSE');
    }
    return result.data;
  },

  async generateCharacterConcepts(
    scenario: ScenarioOption,
    format: 'sandbox' | 'focused',
    worldBasis?: 'real_world' | 'fictional'
  ): Promise<CharacterConceptSuggestion[]> {
    const res = await fetchWithRetry('/api/scenarios/character-concepts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenario, format, worldBasis }),
    });
    const result = await handleResponse<{
      success: boolean;
      data: { concepts: CharacterConceptSuggestion[] };
    }>(res);
    if (!result || !result.data || !result.data.concepts) {
      throw new ApiError('Não foi possível sugerir conceitos de personagem.', 'INVALID_RESPONSE');
    }
    return result.data.concepts;
  },

  async getStatus(): Promise<ApiStatusData> {
    const res = await fetchWithRetry('/api/status');
    const result = await handleResponse<{ status: string; engine: string; data: ApiStatusData }>(res);
    if (!result || !result.data) {
      throw new ApiError('Dados de status indisponíveis.', 'INVALID_RESPONSE');
    }
    return result.data;
  },

  async startNewCampaign(payload: NewCampaignPayload = {}): Promise<NewCampaignResponse['data']> {
    const res = await fetchWithRetry('/api/campaign/new', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const result = await handleResponse<NewCampaignResponse>(res);
    if (!result || !result.data) {
      throw new ApiError('Não foi possível carregar a narrativa inicial da campanha.', 'INVALID_RESPONSE');
    }
    return result.data;
  },

  async getCampaignDetails(campaignId: string): Promise<CampaignDetailsResponse['data']> {
    const res = await fetchWithRetry(`/api/campaign/${campaignId}`);
    const result = await handleResponse<CampaignDetailsResponse>(res);
    if (!result || !result.data) {
      throw new ApiError('Detalhes da campanha indisponíveis.', 'INVALID_RESPONSE');
    }
    return result.data;
  },

  async renameCampaign(campaignId: string, title: string): Promise<void> {
    const res = await fetchWithRetry(`/api/campaign/${campaignId}/title`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    });
    await handleResponse<{success: boolean}>(res);
  },

  async deleteCampaign(campaignId: string): Promise<void> {
    const res = await fetchWithRetry(`/api/campaign/${campaignId}`, {
      method: 'DELETE',
    });
    await handleResponse<{success: boolean}>(res);
  },

  async listCampaigns(): Promise<Array<{
    id: string;
    title: string;
    location?: string;
    lastPlayed: number;
    turnCount: number;
    genre?: string;
    playerName?: string;
  }>> {
    const res = await fetchWithRetry('/api/campaigns');
    const result = await handleResponse<{ success: boolean; data: any[] }>(res);
    return result?.data || [];
  },

  async sendMessage(campaignId: string, message: string): Promise<SendMessageResponse['data']> {
    const res = await fetchWithRetry('/api/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ campaignId, message }),
    });
    const result = await handleResponse<SendMessageResponse>(res);
    if (!result || !result.data) {
      throw new ApiError('Resposta do Mestre indisponível.', 'INVALID_RESPONSE');
    }
    return result.data;
  },

  async retryLastAction(campaignId: string): Promise<SendMessageResponse['data']> {
    const res = await fetchWithRetry('/api/message/retry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ campaignId }),
    });
    const result = await handleResponse<SendMessageResponse>(res);
    if (!result || !result.data) {
      throw new ApiError('Resposta do Mestre indisponível ao tentar novamente.', 'INVALID_RESPONSE');
    }
    return result.data;
  },

  async editLastAction(campaignId: string, message: string): Promise<SendMessageResponse['data']> {
    const res = await fetchWithRetry('/api/message/edit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ campaignId, message }),
    });
    const result = await handleResponse<SendMessageResponse>(res);
    if (!result || !result.data) {
      throw new ApiError('Resposta do Mestre indisponível ao editar a ação.', 'INVALID_RESPONSE');
    }
    return result.data;
  },

  async getMemorySnapshot(campaignId: string) {
    const res = await fetchWithRetry(`/api/campaign/${campaignId}/memory`);
    const result = await handleResponse<{ success: boolean; data: import('../types').CampaignMemorySnapshot }>(res);
    return result?.data;
  },

  async getMemoryLogs(campaignId: string, limit: number = 60) {
    const res = await fetchWithRetry(`/api/campaign/${campaignId}/memory/logs?limit=${limit}`);
    const result = await handleResponse<{ success: boolean; data: import('../types').MemoryOperationLog[] }>(res);
    return result?.data || [];
  },

  async clearMemoryLogs(campaignId: string) {
    const res = await fetchWithRetry(`/api/campaign/${campaignId}/memory/logs/clear`, {
      method: 'POST',
    });
    return await handleResponse<{ success: boolean }>(res);
  },
};
