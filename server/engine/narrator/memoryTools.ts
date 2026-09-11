/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { FunctionDeclaration, Type } from '@google/genai';
import { MemoryManager } from '../memory/memoryManager';
import { GameStateManager } from '../gameState/gameStateManager';
import { calculateFactSimilarity } from '../memory/knowledgeAcquisition';
import { Knowledge, NPC, Event, Quest, Relationship, InventoryItem } from '../memory/types';
import { executeRollD20, executeRollCheck } from '../dice/diceEngine';

/**
 * Declaração formal das ferramentas de leitura (Read Tools) expostas ao Gemini / NarratorService.
 */
export const NARRATOR_READ_FUNCTION_DECLARATIONS: FunctionDeclaration[] = [
  {
    name: 'get_npc',
    description: 'Consulta a ficha e dados completos de um NPC cadastrado na Memory Layer (status, localização, facção, traços, objetivos, segredos e inventário).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        npcIdOrName: {
          type: Type.STRING,
          description: 'Nome ou ID do NPC que deseja consultar (ex: "João", "Marta", "Eldrin").',
        },
      },
      required: ['npcIdOrName'],
    },
  },
  {
    name: 'get_location',
    description: 'Consulta informações e estado de uma localização geográfica (NPCs presentes no local, acontecimentos recentes e missões ativas relacionadas).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        locationName: {
          type: Type.STRING,
          description: 'Nome da localização (ex: "Mercado Velho", "Brasen", "Taverna do Javali").',
        },
      },
      required: ['locationName'],
    },
  },
  {
    name: 'get_relevant_events',
    description: 'Consulta a linha do tempo e acontecimentos passados registrados na Memory Layer por local ou participante.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        location: {
          type: Type.STRING,
          description: 'Filtrar por nome do local onde o evento ocorreu.',
        },
        participant: {
          type: Type.STRING,
          description: 'Filtrar por nome do participante envolvido.',
        },
        limit: {
          type: Type.NUMBER,
          description: 'Quantidade máxima de eventos a retornar (padrão: 10).',
        },
      },
    },
  },
  {
    name: 'get_character_knowledge',
    description: 'Consulta ESTRITAMENTE os fatos, segredos, suspeitas e boatos que um determinado personagem conhece ou suspeita. NÃO retorna conhecimentos exclusivos ou segredos pertencentes a outros NPCs.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        characterName: {
          type: Type.STRING,
          description: 'Nome do personagem ou NPC a consultar (ex: "João", "Marta", "Jogador").',
        },
      },
      required: ['characterName'],
    },
  },
  {
    name: 'get_relationship',
    description: 'Consulta o relacionamento registrado entre dois personagens (níveis de confiança de -100 a 100, hostilidade de -100 a 100, familiaridade de 0 a 10 e histórico).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        characterA: {
          type: Type.STRING,
          description: 'Nome do primeiro personagem (ex: "Jogador", "João").',
        },
        characterB: {
          type: Type.STRING,
          description: 'Nome do segundo personagem (ex: "Marta", "Eldrin").',
        },
      },
      required: ['characterA', 'characterB'],
    },
  },
  {
    name: 'get_inventory',
    description: 'Consulta a lista de itens no inventário pertencente a um personagem (Jogador ou NPC) ou guardado em um recipiente/local.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        owner: {
          type: Type.STRING,
          description: 'Nome do proprietário do inventário (ex: "Jogador", "João", "Baú da Taverna").',
        },
      },
      required: ['owner'],
    },
  },
  {
    name: 'get_quest',
    description: 'Consulta os detalhes, objetivos, participantes e status de uma missão/quest na campanha pelo ID ou título.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        questIdOrTitle: {
          type: Type.STRING,
          description: 'ID ou Título da quest a consultar.',
        },
      },
      required: ['questIdOrTitle'],
    },
  },
  {
    name: 'get_campaign',
    description: 'Consulta os metadados da campanha atual gravados na memória persistente.',
    parameters: {
      type: Type.OBJECT,
      properties: {},
    },
  },
];

/**
 * Declaração formal das ferramentas de motor de dados / resolução mecânica de incerteza (Dice Engine).
 */
export const NARRATOR_DICE_FUNCTION_DECLARATIONS: FunctionDeclaration[] = [
  {
    name: 'roll_d20',
    description: 'Rola um dado de 20 faces (D20) pelo Game Engine para resolução de eventos aleatórios. O número é gerado com autoridade pelo servidor (1 a 20). O Gemini nunca deve inventar o resultado.',
    parameters: {
      type: Type.OBJECT,
      properties: {},
    },
  },
  {
    name: 'roll_check',
    description: 'Executa um teste formal de perícia, atributo ou ação (D20 + modificador vs dificuldade) pelo Game Engine para jogador, aliados ou NPCs em situações com risco ou incerteza. O servidor gera o D20 e calcula o resultado mecânico. O Gemini interpreta e narra o resultado fornecido pelo servidor sem alterá-lo.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        skill: {
          type: Type.STRING,
          description: 'Nome da perícia, atributo ou tipo de ação (ex: "sword_attack", "lockpicking", "atletismo", "percepção", "furtividade").',
        },
        difficulty: {
          type: Type.STRING,
          description: 'Dificuldade do teste: "LOW" (8), "MEDIUM" (13), "HIGH" (18), "EXTREME" (23) ou número inteiro. Padrão: "MEDIUM".',
        },
        modifier: {
          type: Type.NUMBER,
          description: 'Modificador numérico do personagem (ex: -1, 0, 2, 3, 5). Padrão: 0.',
        },
        actor: {
          type: Type.STRING,
          description: 'Personagem realizando a ação (ex: "Jogador", "Capitão Valério", "Guarda"). Padrão: "Jogador".',
        },
      },
    },
  },
];

/**
 * Ferramentas de alteração / mutação internas do Game Engine (NÃO expostas ao NarratorService).
 * Mantidas no sistema para uso autorizado de componentes internos (GameEngine, TurnProcessor, MemoryValidator, testes).
 */
export const ENGINE_MUTATION_FUNCTION_DECLARATIONS: FunctionDeclaration[] = [
  {
    name: 'create_event',
    description: 'Registra um acontecimento histórico ou encontro relevante ocorrido no mundo para a linha do tempo cronológica da campanha.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        location: {
          type: Type.STRING,
          description: 'Local exato onde o evento ocorreu (ex: "Mercado Velho", "Cripta dos Antigos").',
        },
        participants: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: 'Lista de nomes dos personagens ou entidades participantes (ex: ["João", "Jogador"]).',
        },
        description: {
          type: Type.STRING,
          description: 'Descrição clara e concisa do acontecimento no mundo.',
        },
        consequences: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: 'Desdobramentos ou consequências do acontecimento.',
        },
      },
      required: ['location', 'participants', 'description'],
    },
  },
  {
    name: 'update_npc',
    description: 'Atualiza informações persistentes de um NPC existente (status vital, localização, facção, traços de personalidade, objetivos, segredos ou inventário).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        npcIdOrName: {
          type: Type.STRING,
          description: 'Nome ou ID do NPC a ser atualizado (ex: "João", "Marta").',
        },
        name: {
          type: Type.STRING,
          description: 'Novo nome do NPC, se aplicável.',
        },
        status: {
          type: Type.STRING,
          description: 'Novo status vital (ex: "alive", "injured", "deceased", "missing", "captured").',
        },
        location: {
          type: Type.STRING,
          description: 'Nova localização onde o NPC se encontra (ex: "Mercado Velho").',
        },
        faction: {
          type: Type.STRING,
          description: 'Nova ocupação, guilda ou facção.',
        },
        personalityNotes: {
          type: Type.STRING,
          description: 'Anotações atualizadas de comportamento e personalidade.',
        },
        goals: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: 'Lista atualizada de motivações e objetivos.',
        },
        secrets: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: 'Segredos atualizados associados ao NPC.',
        },
        inventory: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: 'Itens atualizados em posse do NPC.',
        },
      },
      required: ['npcIdOrName'],
    },
  },
  {
    name: 'add_knowledge',
    description: 'Registra um novo conhecimento, fato, segredo ou boato e associa aos personagens que o conhecem. Se já existir fato similar, atualiza os conhecedores sem duplicar.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        fact: {
          type: Type.STRING,
          description: 'O fato ou informação específica a registrar (ex: "Existe uma passagem secreta atrás da padaria").',
        },
        characterId: {
          type: Type.STRING,
          description: 'Nome ou ID do personagem que detém esse conhecimento (ex: "joao", "João", "Marta").',
        },
        knownBy: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: 'Lista de personagens que conhecem esse fato (ex: ["João", "Jogador"]).',
        },
        truthStatus: {
          type: Type.STRING,
          description: 'Classificação: "true" (fato canônico estabelecido), "suspicion" (suspeita), "rumor" (boato), "belief" (crença pessoal), "false" (mentira/engano).',
        },
        source: {
          type: Type.STRING,
          description: 'Origem ou fonte da informação (ex: "Jogador", "Observação direta", "Boato de taverna").',
        },
        reliability: {
          type: Type.NUMBER,
          description: 'Grau de confiabilidade de 1 a 10 (10 = certeza absoluta, 5 = relato informal, 2 = rumor incerto).',
        },
        isWorldTruth: {
          type: Type.BOOLEAN,
          description: 'Se é um fato objetivo e canônico do mundo (padrão: false para relatos particulares de personagens).',
        },
      },
      required: ['fact'],
    },
  },
  {
    name: 'add_suspicion',
    description: 'Registra uma suspeita ou dúvida levantada por um personagem (salva como truthStatus "suspicion", sem promover a fato canônico do mundo).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        characterId: {
          type: Type.STRING,
          description: 'Nome ou ID do personagem que tem a suspeita (ex: "joao", "João", "Marta").',
        },
        suspectedBy: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: 'Lista de personagens que suspeitam desse fato.',
        },
        fact: {
          type: Type.STRING,
          description: 'A hipótese ou suspeita formulada.',
        },
        source: {
          type: Type.STRING,
          description: 'Origem da suspeita (ex: "Dedução do personagem", "Comportamento estranho").',
        },
        reliability: {
          type: Type.NUMBER,
          description: 'Grau de convicção na suspeita de 1 a 10 (padrão: 5).',
        },
      },
      required: ['fact'],
    },
  },
  {
    name: 'update_relationship',
    description: 'Atualiza os níveis de confiança (-100 a 100), hostilidade (-100 a 100) ou familiaridade (0 a 10) entre dois personagens.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        characterA: {
          type: Type.STRING,
          description: 'Nome do primeiro personagem (ex: "Jogador", "João").',
        },
        characterB: {
          type: Type.STRING,
          description: 'Nome do segundo personagem (ex: "Marta", "Eldrin").',
        },
        trust: {
          type: Type.NUMBER,
          description: 'Nível de confiança entre eles (-100 a 100).',
        },
        hostility: {
          type: Type.NUMBER,
          description: 'Nível de hostilidade/inimizade entre eles (-100 a 100).',
        },
        familiarity: {
          type: Type.NUMBER,
          description: 'Grau de familiaridade de 0 a 10.',
        },
        importantHistory: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: 'Marcos históricos de interação entre esses personagens.',
        },
      },
      required: ['characterA', 'characterB'],
    },
  },
  {
    name: 'update_inventory',
    description: 'Adiciona, altera ou remove itens do inventário de um personagem (Jogador ou NPC) ou de um local/recipiente.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        owner: {
          type: Type.STRING,
          description: 'Dono do inventário (ex: "Jogador", "João", "Baú da Taverna").',
        },
        item: {
          type: Type.STRING,
          description: 'Nome do item (ex: "Poção de Cura", "Mapa Antigo", "Moedas de Ouro").',
        },
        quantity: {
          type: Type.NUMBER,
          description: 'Quantidade do item.',
        },
        mode: {
          type: Type.STRING,
          description: '"add" para somar/subtrair da quantidade existente, ou "set" para definir o total exato.',
        },
      },
      required: ['owner', 'item', 'quantity'],
    },
  },
  {
    name: 'update_quest',
    description: 'Cria ou atualiza uma missão/quest ativa ou concluída na Memory Layer com status, objetivos e participantes.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        questIdOrTitle: {
          type: Type.STRING,
          description: 'ID ou Título da quest (ex: "O Mistério da Padaria", "quest_123").',
        },
        title: {
          type: Type.STRING,
          description: 'Título da quest se for nova ou alterada.',
        },
        status: {
          type: Type.STRING,
          description: 'Status da quest: "active" | "completed" | "failed" | "abandoned".',
        },
        participants: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: 'Personagens envolvidos na missão.',
        },
        objectives: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: 'Lista de etapas ou objetivos da quest.',
        },
        consequences: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: 'Recompensas ou repercussões.',
        },
      },
      required: ['questIdOrTitle'],
    },
  },
  {
    name: 'create_npc',
    description: 'Registra um novo NPC de forma persistente na Memory Layer.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING, description: 'Nome do NPC.' },
        status: { type: Type.STRING, description: 'Condição vital (ex: "alive").' },
        location: { type: Type.STRING, description: 'Local onde reside.' },
        faction: { type: Type.STRING, description: 'Ocupação ou facção.' },
        personalityNotes: { type: Type.STRING, description: 'Traços de comportamento.' },
      },
      required: ['name'],
    },
  },
  {
    name: 'create_campaign',
    description: 'Cria ou inicializa formalmente o registro de uma campanha no mundo persistente.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING, description: 'Nome da campanha.' },
        currentLocation: { type: Type.STRING, description: 'Localização inicial.' },
        currentDate: { type: Type.STRING, description: 'Data no calendário do mundo.' },
      },
      required: ['name'],
    },
  },
  {
    name: 'update_campaign',
    description: 'Atualiza os metadados da campanha atual (nome, localização geral ou data).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING, description: 'Novo nome.' },
        currentLocation: { type: Type.STRING, description: 'Nova localização.' },
        currentDate: { type: Type.STRING, description: 'Nova data.' },
      },
    },
  },
];

/**
 * Conjunto estrito de ferramentas expostas ao NarratorService / Gemini via Function Calling.
 * Contém EXCLUSIVAMENTE ferramentas de leitura, consulta e motor de dados (roll_check / roll_d20).
 * Mutações persistentes são estritamente proibidas para o Gemini.
 */
export const NARRATOR_FUNCTION_DECLARATIONS: FunctionDeclaration[] = [
  ...NARRATOR_READ_FUNCTION_DECLARATIONS,
  ...NARRATOR_DICE_FUNCTION_DECLARATIONS,
];

/**
 * Alias de compatibilidade: exporta estritamente as ferramentas expostas ao Narrador.
 */
export const MEMORY_FUNCTION_DECLARATIONS: FunctionDeclaration[] = NARRATOR_FUNCTION_DECLARATIONS;

/**
 * Catálogo completo de todas as ferramentas do Game Engine (incluindo mutações internas).
 */
export const ALL_ENGINE_FUNCTION_DECLARATIONS: FunctionDeclaration[] = [
  ...NARRATOR_READ_FUNCTION_DECLARATIONS,
  ...NARRATOR_DICE_FUNCTION_DECLARATIONS,
  ...ENGINE_MUTATION_FUNCTION_DECLARATIONS,
];

export interface ToolExecutionResult {
  success: boolean;
  action?: 'created' | 'updated' | 'read' | 'rejected' | 'not_found' | 'error';
  data?: any;
  message?: string;
  error?: string;
  tool?: string;
}

/**
 * Normaliza qualquer formato de nome de ferramenta (camelCase, PascalCase, snake_case, etc.)
 * para o nome canônico em snake_case.
 */
export function canonicalizeToolName(rawName: string | unknown): string | null {
  if (!rawName || typeof rawName !== 'string') return null;
  const clean = rawName.trim().toLowerCase().replace(/[^a-z0-9]/g, '');

  switch (clean) {
    case 'rolld20':
    case 'd20':
      return 'roll_d20';
    case 'rollcheck':
    case 'check':
      return 'roll_check';
    case 'getnpc':
      return 'get_npc';
    case 'getlocation':
      return 'get_location';
    case 'getrelevantevents':
      return 'get_relevant_events';
    case 'getcharacterknowledge':
    case 'getknowledgeforcharacter':
    case 'getknowledge':
      return 'get_character_knowledge';
    case 'getrelationship':
      return 'get_relationship';
    case 'getinventory':
      return 'get_inventory';
    case 'getquest':
      return 'get_quest';
    case 'createevent':
    case 'addevent':
      return 'create_event';
    case 'updatenpc':
      return 'update_npc';
    case 'addknowledge':
    case 'createknowledge':
      return 'add_knowledge';
    case 'addsuspicion':
    case 'createsuspicion':
      return 'add_suspicion';
    case 'updaterelationship':
    case 'setrelationship':
      return 'update_relationship';
    case 'updateinventory':
    case 'setinventory':
    case 'addinventory':
      return 'update_inventory';
    case 'updatequest':
      return 'update_quest';
    case 'createquest':
      return 'create_quest';
    case 'createnpc':
    case 'addnpc':
      return 'create_npc';
    case 'createcampaign':
      return 'create_campaign';
    case 'updatecampaign':
      return 'update_campaign';
    case 'getcampaign':
      return 'get_campaign';
    default:
      return null;
  }
}

/**
 * Normaliza strings removendo acentos e convertendo para minúsculas.
 */
function normalizeStr(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Resolve o nome canônico do personagem a partir de um identificador ou nome parcial.
 */
function resolveCharacterName(input: string, npcs: Record<string, NPC> = {}): string {
  const trimmed = input.trim();
  if (!trimmed) return trimmed;

  const normalizedInput = normalizeStr(trimmed);
  for (const npc of Object.values(npcs)) {
    if (normalizeStr(npc.id) === normalizedInput || normalizeStr(npc.name) === normalizedInput) {
      return npc.name;
    }
    const firstName = npc.name.split(/[,–—\s]+/)[0];
    if (firstName && normalizeStr(firstName) === normalizedInput) {
      return npc.name;
    }
  }

  return trimmed;
}

/**
 * Valida argumentos e executa de forma segura e determinística as operações solicitadas pelo Gemini na Memory Layer.
 * O Game Engine é a autoridade máxima e retorna confirmação formal (created, updated, rejected, etc.).
 */
export async function executeMemoryToolCall(
  toolName: string,
  args: Record<string, any>,
  campaignId: string,
  memoryManager: MemoryManager,
  gameStateManager?: GameStateManager,
  executionCache?: Map<string, ToolExecutionResult>,
  caller: 'narrator' | 'engine' | 'validator' = 'engine'
): Promise<ToolExecutionResult> {
  const startTime = performance.now();
  let result: ToolExecutionResult;

  try {
    const canonicalToolName = canonicalizeToolName(toolName);

    if (!canonicalToolName) {
      result = {
        success: false,
        action: 'rejected',
        error: 'UNKNOWN_TOOL',
        tool: toolName || 'unknown',
        message: `Ferramenta desconhecida "${toolName}". Use apenas ferramentas disponibilizadas pelo Game Engine.`,
      };

      const durationMs = (performance.now() - startTime).toFixed(2);
      console.warn([
        '==================================================',
        `[Game Engine -> Function Calling] Tool: ${toolName} (UNKNOWN)`,
        `Arguments: ${JSON.stringify(args)}`,
        'Status: REJECTED',
        'Error: UNKNOWN_TOOL',
        `Duration: ${durationMs}ms`,
        '==================================================',
      ].join('\n'));

      return result;
    }

    // Identificação de operações mutantes
    const isMutation =
      canonicalToolName.startsWith('create_') ||
      canonicalToolName.startsWith('update_') ||
      canonicalToolName.startsWith('add_');

    // Se o solicitante for o Narrator/Gemini, rejeita qualquer tentativa de mutação
    if (caller === 'narrator' && isMutation) {
      result = {
        success: false,
        action: 'rejected',
        error: 'UNAUTHORIZED_MUTATION',
        tool: canonicalToolName,
        message: `Mutações diretas não são autorizadas para o Narrador. A autoridade de alteração e persistência pertence exclusivamente ao Game Engine via Memory Extractor e Memory Validator.`,
      };

      const durationMs = (performance.now() - startTime).toFixed(2);
      console.warn([
        '==================================================',
        `[Game Engine -> Security Guard] Tool: ${canonicalToolName} (BLOCKED FOR NARRATOR)`,
        `Arguments: ${JSON.stringify(args)}`,
        'Status: REJECTED',
        'Error: UNAUTHORIZED_MUTATION',
        `Duration: ${durationMs}ms`,
        '==================================================',
      ].join('\n'));

      return result;
    }

    // Idempotência / Deduplicação de mutações e rolagens em retries e fallbacks de modelos
    const cacheKey = `${canonicalToolName}:${JSON.stringify(args || {}, Object.keys(args || {}).sort())}`;

    if (executionCache && executionCache.has(cacheKey)) {
      const cached = executionCache.get(cacheKey)!;
      console.log(`[Game Engine -> Idempotência] Operação "${canonicalToolName}" já executada neste turno. Retornando resultado prévio com segurança.`);
      return cached;
    }

    switch (canonicalToolName) {
      // =============================================================
      // 1. LEITURA: GET_NPC
      // =============================================================
      case 'get_npc': {
        const identifier = (args.npcIdOrName || args.name || args.id || args.characterId || '').toString().trim();
        if (!identifier) {
          result = {
            success: false,
            action: 'rejected',
            error: 'INVALID_ARGUMENTS',
            tool: canonicalToolName,
            message: 'O parâmetro "npcIdOrName" é obrigatório para get_npc.',
          };
          break;
        }

        const snapshot = await memoryManager.getSnapshot(campaignId);
        const npcs = snapshot?.npcs || {};
        let foundNPC: NPC | null = null;

        // Busca exata ou por ID
        foundNPC = await memoryManager.getNPC(campaignId, identifier);

        // Busca flexível se não encontrado imediatamente
        if (!foundNPC && snapshot) {
          const lower = identifier.toLowerCase();
          for (const npc of Object.values(npcs)) {
            if (npc.name.toLowerCase() === lower || npc.id.toLowerCase() === lower || npc.name.toLowerCase().includes(lower)) {
              foundNPC = npc;
              break;
            }
          }
        }

        if (foundNPC) {
          result = {
            success: true,
            action: 'read',
            tool: canonicalToolName,
            data: foundNPC,
            message: `NPC "${foundNPC.name}" encontrado com sucesso.`,
          };
        } else {
          result = {
            success: false,
            action: 'not_found',
            tool: canonicalToolName,
            error: `NPC com identificador "${identifier}" não foi encontrado na Memory Layer.`,
            message: `NPC com identificador "${identifier}" não foi encontrado na Memory Layer.`,
          };
        }
        break;
      }

      // =============================================================
      // 2. LEITURA: GET_LOCATION
      // =============================================================
      case 'get_location': {
        const locationName = (args.locationName || args.name || args.location || '').toString().trim();
        if (!locationName) {
          result = {
            success: false,
            action: 'rejected',
            error: 'INVALID_ARGUMENTS',
            tool: canonicalToolName,
            message: 'O parâmetro "locationName" é obrigatório para get_location.',
          };
          break;
        }

        const snapshot = await memoryManager.getSnapshot(campaignId);
        const locLower = locationName.toLowerCase();

        const npcsPresent = snapshot
          ? Object.values(snapshot.npcs).filter((npc) => npc.location && npc.location.toLowerCase().includes(locLower))
          : [];

        const eventsAtLocation = snapshot
          ? snapshot.events.filter((e) => e.location && e.location.toLowerCase().includes(locLower))
          : [];

        const relatedQuests = snapshot
          ? snapshot.quests.filter((q) =>
              q.title.toLowerCase().includes(locLower) ||
              q.objectives.some((obj) => obj.toLowerCase().includes(locLower))
            )
          : [];

        const isCurrentLocation = snapshot
          ? snapshot.campaign.currentLocation.toLowerCase().includes(locLower) ||
            locLower.includes(snapshot.campaign.currentLocation.toLowerCase())
          : false;

        result = {
          success: true,
          action: 'read',
          tool: canonicalToolName,
          data: {
            location: locationName,
            isCurrentLocation,
            npcsPresent: npcsPresent.map((n) => ({ id: n.id, name: n.name, status: n.status, faction: n.faction })),
            eventsAtLocation: eventsAtLocation.slice(0, 5),
            relatedQuests: relatedQuests.map((q) => ({ id: q.id, title: q.title, status: q.status })),
          },
          message: `Dados da localização "${locationName}" recuperados com sucesso.`,
        };
        break;
      }

      // =============================================================
      // 3. LEITURA: GET_RELEVANT_EVENTS
      // =============================================================
      case 'get_relevant_events': {
        const events = await memoryManager.getRelevantEvents(campaignId, {
          location: args.location,
          participant: args.participant,
          limit: typeof args.limit === 'number' ? args.limit : 10,
        });

        result = {
          success: true,
          action: 'read',
          tool: canonicalToolName,
          data: events,
          message: `${events.length} evento(s) relevante(s) encontrado(s).`,
        };
        break;
      }

      // =============================================================
      // 4. LEITURA: GET_CHARACTER_KNOWLEDGE (ISOLAMENTO EPISTEMOLÓGICO)
      // =============================================================
      case 'get_character_knowledge': {
        const rawName = (args.characterName || args.characterId || args.name || '').toString().trim();
        if (!rawName) {
          result = {
            success: false,
            action: 'rejected',
            error: 'INVALID_ARGUMENTS',
            tool: canonicalToolName,
            message: 'O parâmetro "characterName" é obrigatório para get_character_knowledge.',
          };
          break;
        }

        const snapshot = await memoryManager.getSnapshot(campaignId);
        const resolvedName = resolveCharacterName(rawName, snapshot?.npcs || {});

        // Consulta estrita: fatos autorizados para esse personagem
        const facts = await memoryManager.getKnowledgeForCharacter(campaignId, resolvedName);

        result = {
          success: true,
          action: 'read',
          tool: canonicalToolName,
          data: {
            character: resolvedName,
            authorizedFactsCount: facts.length,
            knowledge: facts,
          },
          message: `Conhecimento autorizado de "${resolvedName}" retornado (${facts.length} registro(s)).`,
        };
        break;
      }

      // =============================================================
      // 5. LEITURA: GET_RELATIONSHIP
      // =============================================================
      case 'get_relationship': {
        const charA = (args.characterA || '').toString().trim();
        const charB = (args.characterB || '').toString().trim();

        if (!charA || !charB) {
          result = {
            success: false,
            action: 'rejected',
            error: 'INVALID_ARGUMENTS',
            tool: canonicalToolName,
            message: '"characterA" e "characterB" são obrigatórios para get_relationship.',
          };
          break;
        }

        const snapshot = await memoryManager.getSnapshot(campaignId);
        const resolvedA = resolveCharacterName(charA, snapshot?.npcs || {});
        const resolvedB = resolveCharacterName(charB, snapshot?.npcs || {});

        const rel = await memoryManager.getRelationship(campaignId, resolvedA, resolvedB);

        result = {
          success: true,
          action: 'read',
          tool: canonicalToolName,
          data: rel || {
            characterA: resolvedA,
            characterB: resolvedB,
            trust: 0,
            hostility: 0,
            familiarity: 0,
            importantHistory: [],
          },
          message: rel ? `Relacionamento entre "${resolvedA}" e "${resolvedB}" recuperado.` : 'Relacionamento padrão (neutro).',
        };
        break;
      }

      // =============================================================
      // 6. LEITURA: GET_INVENTORY
      // =============================================================
      case 'get_inventory': {
        const owner = (args.owner || args.characterName || args.name || '').toString().trim();
        if (!owner) {
          result = {
            success: false,
            action: 'rejected',
            error: 'INVALID_ARGUMENTS',
            tool: canonicalToolName,
            message: 'O parâmetro "owner" é obrigatório para get_inventory.',
          };
          break;
        }

        const snapshot = await memoryManager.getSnapshot(campaignId);
        const resolvedOwner = resolveCharacterName(owner, snapshot?.npcs || {});
        const items = await memoryManager.getInventory(campaignId, resolvedOwner);

        result = {
          success: true,
          action: 'read',
          tool: canonicalToolName,
          data: items,
          message: `Inventário de "${resolvedOwner}" possui ${items.length} item(ns).`,
        };
        break;
      }

      // =============================================================
      // 7. LEITURA: GET_QUEST
      // =============================================================
      case 'get_quest': {
        const questIdOrTitle = (args.questIdOrTitle || args.title || args.id || '').toString().trim();
        if (!questIdOrTitle) {
          result = {
            success: false,
            action: 'rejected',
            error: 'INVALID_ARGUMENTS',
            tool: canonicalToolName,
            message: 'O parâmetro "questIdOrTitle" é obrigatório para get_quest.',
          };
          break;
        }

        const quest = await memoryManager.getQuest(campaignId, questIdOrTitle);
        if (quest) {
          result = {
            success: true,
            action: 'read',
            tool: canonicalToolName,
            data: quest,
            message: `Quest "${quest.title}" encontrada com sucesso.`,
          };
        } else {
          result = {
            success: false,
            action: 'not_found',
            tool: canonicalToolName,
            error: `Quest "${questIdOrTitle}" não foi encontrada.`,
            message: `Quest "${questIdOrTitle}" não foi encontrada.`,
          };
        }
        break;
      }

      // =============================================================
      // 8. ALTERAÇÃO: CREATE_EVENT
      // =============================================================
      case 'create_event': {
        const location = (args.location || '').toString().trim();
        const description = (args.description || '').toString().trim();
        const rawParticipants = Array.isArray(args.participants)
          ? args.participants
          : typeof args.participants === 'string'
          ? [args.participants]
          : [];

        if (!location || !description) {
          result = {
            success: false,
            action: 'rejected',
            error: 'INVALID_ARGUMENTS',
            tool: canonicalToolName,
            message: '"location" e "description" são parâmetros obrigatórios para create_event.',
          };
          break;
        }

        const snapshot = await memoryManager.getSnapshot(campaignId);
        const npcs = snapshot?.npcs || {};
        const participants = rawParticipants.map((p: any) => resolveCharacterName(String(p), npcs));

        const event = await memoryManager.createEvent(campaignId, {
          location,
          participants,
          description,
          consequences: Array.isArray(args.consequences) ? args.consequences.map(String) : [],
        });

        result = {
          success: true,
          action: 'created',
          tool: canonicalToolName,
          data: event,
          message: `Evento persistido com sucesso na linha do tempo da campanha (ID: ${event.id}).`,
        };
        break;
      }

      // =============================================================
      // 9. ALTERAÇÃO: UPDATE_NPC
      // =============================================================
      case 'update_npc': {
        const npcIdOrName = (args.npcIdOrName || args.name || args.id || '').toString().trim();
        if (!npcIdOrName) {
          result = {
            success: false,
            action: 'rejected',
            error: 'INVALID_ARGUMENTS',
            tool: canonicalToolName,
            message: 'O parâmetro "npcIdOrName" é obrigatório para update_npc.',
          };
          break;
        }

        const updates: Record<string, any> = {};
        if (args.name) updates.name = String(args.name).trim();
        if (args.status) updates.status = String(args.status).trim();
        if (args.location) updates.location = String(args.location).trim();
        if (args.faction) updates.faction = String(args.faction).trim();
        if (args.personalityNotes) updates.personalityNotes = String(args.personalityNotes).trim();
        if (Array.isArray(args.goals)) updates.goals = args.goals.map(String);
        if (Array.isArray(args.secrets)) updates.secrets = args.secrets.map(String);
        if (Array.isArray(args.inventory)) updates.inventory = args.inventory.map(String);

        const updatedNPC = await memoryManager.updateNPC(campaignId, npcIdOrName, updates);

        if (updatedNPC) {
          if (gameStateManager) {
            gameStateManager.upsertNPC(campaignId, {
              id: updatedNPC.id,
              name: updatedNPC.name,
              role: updatedNPC.faction || 'NPC',
              status: updatedNPC.status,
              description: updatedNPC.personalityNotes,
              location: updatedNPC.location,
            });
          }

          result = {
            success: true,
            action: 'updated',
            tool: canonicalToolName,
            data: updatedNPC,
            message: `NPC "${updatedNPC.name}" atualizado com sucesso.`,
          };
        } else {
          result = {
            success: false,
            action: 'not_found',
            tool: canonicalToolName,
            error: `NPC "${npcIdOrName}" não foi encontrado para atualização.`,
            message: `NPC "${npcIdOrName}" não foi encontrado para atualização.`,
          };
        }
        break;
      }

      // =============================================================
      // 10. ALTERAÇÃO: ADD_KNOWLEDGE (ANTI-DUPLICAÇÃO & DEDUPLICAÇÃO)
      // =============================================================
      case 'add_knowledge': {
        const fact = (args.fact || '').toString().trim();
        if (!fact) {
          result = {
            success: false,
            action: 'rejected',
            error: 'INVALID_ARGUMENTS',
            tool: canonicalToolName,
            message: 'O parâmetro "fact" é obrigatório para add_knowledge.',
          };
          break;
        }

        const snapshot = await memoryManager.getSnapshot(campaignId);
        const npcs = snapshot?.npcs || {};

        // Extrair e normalizar knownBy
        const rawKnown = Array.isArray(args.knownBy)
          ? args.knownBy
          : args.characterId
          ? [args.characterId]
          : args.characterName
          ? [args.characterName]
          : [];

        const normalizedKnownBy = rawKnown.map((k: any) => resolveCharacterName(String(k), npcs)).filter(Boolean);

        const truthStatus = typeof args.truthStatus === 'string' ? args.truthStatus : 'true';
        const source = args.source || 'Declaração ou Observação';
        const reliability = typeof args.reliability === 'number' ? args.reliability : (truthStatus === 'true' ? 10 : 5);
        const isWorldTruth = typeof args.isWorldTruth === 'boolean' ? args.isWorldTruth : (truthStatus === 'true' && normalizedKnownBy.length === 0);

        // Anti-duplicação: verificar similaridade com registros existentes
        const existingList = snapshot?.knowledge || [];
        let existingMatch: Knowledge | null = null;

        for (const k of existingList) {
          const sim = calculateFactSimilarity(k.fact, fact);
          if (sim > 0.65) {
            existingMatch = k;
            break;
          }
        }

        if (existingMatch) {
          // Atualizar o registro existente
          const mergedKnown = Array.from(new Set([...(existingMatch.knownBy || []), ...normalizedKnownBy]));
          const updated = await memoryManager.updateKnowledge(campaignId, existingMatch.id, {
            knownBy: mergedKnown,
            reliability: Math.max(existingMatch.reliability, reliability),
          });

          result = {
            success: true,
            action: 'updated',
            tool: canonicalToolName,
            data: updated || existingMatch,
            message: `Registro de conhecimento existente (ID: ${existingMatch.id}) atualizado com novos conhecedores: [${mergedKnown.join(', ')}]. Nenhuma duplicação criada.`,
          };
        } else {
          // Criar novo registro
          const created = await memoryManager.createKnowledge(campaignId, {
            fact,
            truthStatus: truthStatus as any,
            knownBy: normalizedKnownBy,
            suspectedBy: [],
            source,
            reliability,
            isWorldTruth,
          });

          result = {
            success: true,
            action: 'created',
            tool: canonicalToolName,
            data: created,
            message: `Novo conhecimento persistido com sucesso (ID: ${created.id}). Conhecido por: [${normalizedKnownBy.join(', ')}].`,
          };
        }
        break;
      }

      // =============================================================
      // 11. ALTERAÇÃO: ADD_SUSPICION
      // =============================================================
      case 'add_suspicion': {
        const fact = (args.fact || args.suspicion || '').toString().trim();
        if (!fact) {
          result = {
            success: false,
            action: 'rejected',
            error: 'INVALID_ARGUMENTS',
            tool: canonicalToolName,
            message: 'O parâmetro "fact" é obrigatório para add_suspicion.',
          };
          break;
        }

        const snapshot = await memoryManager.getSnapshot(campaignId);
        const npcs = snapshot?.npcs || {};

        const rawSuspected = Array.isArray(args.suspectedBy)
          ? args.suspectedBy
          : args.characterId
          ? [args.characterId]
          : args.characterName
          ? [args.characterName]
          : [];

        const suspectedBy = rawSuspected.map((s: any) => resolveCharacterName(String(s), npcs)).filter(Boolean);
        const source = args.source || 'Suspeita de personagem';
        const reliability = typeof args.reliability === 'number' ? args.reliability : 5;

        // Verificar duplicata
        const existingList = snapshot?.knowledge || [];
        let existingMatch: Knowledge | null = null;

        for (const k of existingList) {
          const sim = calculateFactSimilarity(k.fact, fact);
          if (sim > 0.65) {
            existingMatch = k;
            break;
          }
        }

        if (existingMatch) {
          const mergedSuspected = Array.from(new Set([...(existingMatch.suspectedBy || []), ...suspectedBy]));
          const updated = await memoryManager.updateKnowledge(campaignId, existingMatch.id, {
            suspectedBy: mergedSuspected,
          });

          result = {
            success: true,
            action: 'updated',
            tool: canonicalToolName,
            data: updated || existingMatch,
            message: `Suspeita associada ao conhecimento existente (ID: ${existingMatch.id}). Suspeitado por: [${mergedSuspected.join(', ')}].`,
          };
        } else {
          const created = await memoryManager.createKnowledge(campaignId, {
            fact,
            truthStatus: 'suspicion',
            knownBy: [],
            suspectedBy,
            source,
            reliability,
            isWorldTruth: false,
          });

          result = {
            success: true,
            action: 'created',
            tool: canonicalToolName,
            data: created,
            message: `Nova suspeita registrada na memória (ID: ${created.id}). Suspeitado por: [${suspectedBy.join(', ')}].`,
          };
        }
        break;
      }

      // =============================================================
      // 12. ALTERAÇÃO: UPDATE_RELATIONSHIP
      // =============================================================
      case 'update_relationship': {
        const charA = (args.characterA || '').toString().trim();
        const charB = (args.characterB || '').toString().trim();

        if (!charA || !charB) {
          result = {
            success: false,
            action: 'rejected',
            error: 'INVALID_ARGUMENTS',
            tool: canonicalToolName,
            message: '"characterA" e "characterB" são obrigatórios para update_relationship.',
          };
          break;
        }

        const snapshot = await memoryManager.getSnapshot(campaignId);
        const resolvedA = resolveCharacterName(charA, snapshot?.npcs || {});
        const resolvedB = resolveCharacterName(charB, snapshot?.npcs || {});

        const updates: Record<string, any> = {};
        if (typeof args.trust === 'number') updates.trust = Math.max(-100, Math.min(100, args.trust));
        if (typeof args.hostility === 'number') updates.hostility = Math.max(-100, Math.min(100, args.hostility));
        if (typeof args.familiarity === 'number') updates.familiarity = Math.max(0, Math.min(10, args.familiarity));
        if (Array.isArray(args.importantHistory)) updates.importantHistory = args.importantHistory.map(String);

        const rel = await memoryManager.updateRelationship(campaignId, resolvedA, resolvedB, updates);

        result = {
          success: true,
          action: 'updated',
          tool: canonicalToolName,
          data: rel,
          message: `Relacionamento entre "${resolvedA}" e "${resolvedB}" atualizado com sucesso.`,
        };
        break;
      }

      // =============================================================
      // 13. ALTERAÇÃO: UPDATE_INVENTORY
      // =============================================================
      case 'update_inventory': {
        const owner = (args.owner || '').toString().trim();
        const item = (args.item || '').toString().trim();
        const quantity = typeof args.quantity === 'number' ? args.quantity : 1;
        const mode = args.mode === 'add' ? 'add' : 'set';

        if (!owner || !item) {
          result = {
            success: false,
            action: 'rejected',
            error: 'INVALID_ARGUMENTS',
            tool: canonicalToolName,
            message: '"owner" e "item" são obrigatórios para update_inventory.',
          };
          break;
        }

        const snapshot = await memoryManager.getSnapshot(campaignId);
        const resolvedOwner = resolveCharacterName(owner, snapshot?.npcs || {});

        const currentItems = await memoryManager.updateInventory(campaignId, resolvedOwner, item, quantity, mode);

        result = {
          success: true,
          action: 'updated',
          tool: canonicalToolName,
          data: currentItems,
          message: `Inventário de "${resolvedOwner}" atualizado (${item}: ${quantity} [modo: ${mode}]).`,
        };
        break;
      }

      // =============================================================
      // 14. ALTERAÇÃO: UPDATE_QUEST / CREATE_QUEST
      // =============================================================
      case 'update_quest':
      case 'create_quest': {
        const questIdOrTitle = (args.questIdOrTitle || args.title || args.id || '').toString().trim();
        if (!questIdOrTitle) {
          result = {
            success: false,
            action: 'rejected',
            error: 'INVALID_ARGUMENTS',
            tool: canonicalToolName,
            message: '"questIdOrTitle" é obrigatório para update_quest.',
          };
          break;
        }

        const updates: Partial<Quest> = {};
        if (args.title) updates.title = String(args.title).trim();
        if (args.status) updates.status = args.status as any;
        if (Array.isArray(args.participants)) updates.participants = args.participants.map(String);
        if (Array.isArray(args.objectives)) updates.objectives = args.objectives.map(String);
        if (Array.isArray(args.consequences)) updates.consequences = args.consequences.map(String);

        const quest = await memoryManager.updateQuest(campaignId, questIdOrTitle, updates);

        if (quest && gameStateManager) {
          gameStateManager.upsertQuest(campaignId, {
            id: quest.id,
            title: quest.title,
            description: Array.isArray(quest.objectives) ? quest.objectives.join('; ') : '',
            status: quest.status as any,
          });
        }

        result = {
          success: true,
          action: 'updated',
          tool: canonicalToolName,
          data: quest,
          message: `Quest "${quest?.title || questIdOrTitle}" persistida na memória da campanha.`,
        };
        break;
      }

      // =============================================================
      // 15. AUXILIAR: CREATE_NPC
      // =============================================================
      case 'create_npc': {
        const name = (args.name || '').toString().trim();
        if (!name) {
          result = {
            success: false,
            action: 'rejected',
            error: 'INVALID_ARGUMENTS',
            tool: canonicalToolName,
            message: 'O parâmetro "name" é obrigatório para create_npc.',
          };
          break;
        }

        const npc = await memoryManager.createNPC(campaignId, {
          name,
          status: args.status || 'alive',
          location: args.location || '',
          faction: args.faction || '',
          personalityNotes: args.personalityNotes || '',
          goals: Array.isArray(args.goals) ? args.goals.map(String) : [],
          secrets: Array.isArray(args.secrets) ? args.secrets.map(String) : [],
          inventory: Array.isArray(args.inventory) ? args.inventory.map(String) : [],
          relationships: typeof args.relationships === 'object' && args.relationships ? args.relationships : {},
        });

        if (gameStateManager) {
          gameStateManager.upsertNPC(campaignId, {
            id: npc.id,
            name: npc.name,
            role: npc.faction || 'NPC',
            status: npc.status,
            description: npc.personalityNotes,
            location: npc.location,
          });
        }

        result = {
          success: true,
          action: 'created',
          tool: canonicalToolName,
          data: npc,
          message: `NPC "${npc.name}" criado com sucesso na Memory Layer (ID: ${npc.id}).`,
        };
        break;
      }

      // =============================================================
      // 16. AUXILIAR: CREATE_CAMPAIGN
      // =============================================================
      case 'create_campaign': {
        const name = (args.name || args.title || '').toString().trim();
        if (!name) {
          result = {
            success: false,
            action: 'rejected',
            error: 'INVALID_ARGUMENTS',
            tool: canonicalToolName,
            message: 'O parâmetro "name" é obrigatório para create_campaign.',
          };
          break;
        }
        const campaign = await memoryManager.updateCampaign(campaignId, {
          name,
          currentLocation: args.currentLocation || '',
          currentDate: args.currentDate || '',
        });
        if (gameStateManager) {
          gameStateManager.updateCampaignFoundation(campaignId, { title: name });
          if (args.currentLocation) {
            gameStateManager.updateWorldState(campaignId, { currentLocation: args.currentLocation });
          }
        }
        result = { success: true, action: 'created', tool: canonicalToolName, data: campaign };
        break;
      }

      // =============================================================
      // 17. AUXILIAR: UPDATE_CAMPAIGN
      // =============================================================
      case 'update_campaign': {
        const updates: Record<string, any> = {};
        if (args.name) updates.name = String(args.name).trim();
        if (args.currentLocation) updates.currentLocation = String(args.currentLocation).trim();
        if (args.currentDate) updates.currentDate = String(args.currentDate).trim();

        const updated = await memoryManager.updateCampaign(campaignId, updates);
        if (gameStateManager) {
          if (updates.name) gameStateManager.updateCampaignFoundation(campaignId, { title: updates.name });
          if (updates.currentLocation) gameStateManager.updateWorldState(campaignId, { currentLocation: updates.currentLocation });
        }
        result = { success: true, action: 'updated', tool: canonicalToolName, data: updated };
        break;
      }

      // =============================================================
      // 18. AUXILIAR: GET_CAMPAIGN
      // =============================================================
      case 'get_campaign': {
        const campaign = await memoryManager.getCampaign(campaignId);
        result = { success: true, action: 'read', tool: canonicalToolName, data: campaign };
        break;
      }

      // =============================================================
      // 19. MOTOR DE DADOS: ROLL_D20
      // =============================================================
      case 'roll_d20': {
        const rollResult = executeRollD20();
        result = {
          success: true,
          action: 'read',
          tool: canonicalToolName,
          data: rollResult,
          message: `D20 rolado pelo Game Engine com autoridade: ${rollResult.roll} (1 a 20).`,
        };
        break;
      }

      // =============================================================
      // 20. MOTOR DE DADOS: ROLL_CHECK
      // =============================================================
      case 'roll_check': {
        const checkResult = executeRollCheck({
          skill: args.skill,
          difficulty: args.difficulty,
          modifier: args.modifier,
          actor: args.actor,
          contextDescription: args.contextDescription,
        });

        const modFormatted = checkResult.modifier >= 0 ? `+${checkResult.modifier}` : `${checkResult.modifier}`;
        result = {
          success: true,
          action: 'read',
          tool: canonicalToolName,
          data: checkResult,
          message: `Teste mecânico realizado pelo Game Engine para ${checkResult.actor} [${checkResult.skill}]. D20: ${checkResult.roll}, Mod: ${modFormatted}, Total: ${checkResult.total}, Dificuldade: ${checkResult.difficultyLevel} (${checkResult.difficulty}), Resultado: ${checkResult.outcome}, Sucesso: ${checkResult.success}.`,
        };
        break;
      }

      default: {
        result = {
          success: false,
          action: 'rejected',
          error: 'UNKNOWN_TOOL',
          tool: toolName,
          message: `Ferramenta desconhecida "${toolName}". Use apenas ferramentas disponibilizadas pelo Game Engine.`,
        };
        break;
      }
    }

    // Salva no cache de idempotência se a operação foi bem-sucedida
    if (executionCache && result.success) {
      executionCache.set(cacheKey, result);
    }
  } catch (err: unknown) {
    const errMsg = (err as Error)?.message || String(err);
    result = {
      success: false,
      action: 'error',
      error: `Erro ao executar ferramenta ${toolName}: ${errMsg}`,
      tool: toolName,
      message: errMsg,
    };
  }

  // =================================================================
  // LOGS DE DESENVOLVIMENTO (INTERNOS - NÃO EXPOSTOS NA UI DO JOGADOR)
  // =================================================================
  const durationMs = (performance.now() - startTime).toFixed(2);
  console.log([
    '==================================================',
    `[Game Engine -> Function Calling] Tool: ${toolName}`,
    `Arguments: ${JSON.stringify(args)}`,
    `Status: ${result.success ? 'SUCCESS' : 'ERROR'}`,
    `Action: ${result.action || (result.success ? 'executed' : 'failed')}`,
    `Duration: ${durationMs}ms`,
    `Result: ${JSON.stringify(result.data ? (result.data.id ? { id: result.data.id, name: result.data.name || result.data.title || result.data.fact } : result.data) : result.error || result.message)}`,
    '==================================================',
  ].join('\n'));

  return result;
}

