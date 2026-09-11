/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Knowledge, NPC } from './types';
import { MemoryManager } from './memoryManager';

export interface KnowledgeAcquisitionDetection {
  detected: boolean;
  recipientNpcName?: string;
  recipientNpcId?: string;
  extractedFact?: string;
  isSpeculation?: boolean;
  action?: 'created' | 'updated';
  knowledgeId?: string;
  knowledge?: Knowledge;
  logSummary?: string;
}

export interface DetectKnowledgeAcquisitionParams {
  campaignId: string;
  playerActionText: string;
  currentLocation?: string;
  activeNpcs?: Array<{ id: string; name: string }>;
  memoryManager: MemoryManager;
}

const STOP_WORDS_PT = new Set([
  'a', 'o', 'as', 'os', 'um', 'uma', 'uns', 'umas',
  'de', 'do', 'da', 'dos', 'das',
  'em', 'no', 'na', 'nos', 'nas',
  'por', 'pela', 'pelo', 'pelas', 'pelos',
  'para', 'pra', 'pro', 'pras', 'pros',
  'com', 'sem', 'sob', 'sobre', 'atras', 'frente',
  'e', 'ou', 'mas', 'se', 'que', 'como', 'onde', 'quando',
  'meu', 'minha', 'meus', 'minhas', 'seu', 'sua', 'seus', 'suas',
  'este', 'esta', 'estes', 'estas', 'esse', 'essa', 'esses', 'essas',
  'aquele', 'aquela', 'aqueles', 'aquelas', 'isto', 'isso', 'aquilo',
  'ele', 'ela', 'eles', 'elas', 'eu', 'voce', 'tu', 'nos', 'eles',
  'ja', 'logo', 'entao', 'assim', 'muito', 'pouco', 'mais', 'menos',
  'ha', 'tem', 'existe', 'existem', 'foi', 'era', 'sao', 'e', 'esta', 'estao', 'fica', 'ficam'
]);

/**
 * Remove acentos e caracteres especiais para comparação normalizada.
 */
export function normalizeText(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extrai tokens semânticos chave de um texto.
 */
export function extractKeyTokens(text: string): string[] {
  const norm = normalizeText(text);
  if (!norm) return [];
  const words = norm.split(' ');
  return words.filter((w) => w.length > 2 && !STOP_WORDS_PT.has(w));
}

/**
 * Calcula a similaridade semântica / lexical entre duas proposições factuais.
 */
export function calculateFactSimilarity(factA: string, factB: string): number {
  const normA = normalizeText(factA);
  const normB = normalizeText(factB);

  if (normA === normB) return 1.0;
  if (normA.includes(normB) || normB.includes(normA)) return 0.85;

  const tokensA = extractKeyTokens(factA);
  const tokensB = extractKeyTokens(factB);

  if (tokensA.length === 0 || tokensB.length === 0) return 0;

  const setA = new Set(tokensA);
  const setB = new Set(tokensB);

  let intersectionCount = 0;
  for (const t of setA) {
    if (setB.has(t)) intersectionCount++;
  }

  const minLen = Math.min(setA.size, setB.size);
  const overlapRatio = intersectionCount / minLen;

  const unionSize = new Set([...tokensA, ...tokensB]).size;
  const jaccardRatio = intersectionCount / unionSize;

  return Math.max(overlapRatio * 0.8 + jaccardRatio * 0.2, jaccardRatio);
}

/**
 * Expressões que denotam pura incerteza, dúvida ou hipótese não factual do jogador.
 */
const SPECULATION_PATTERNS = [
  /\b(?:eu\s+)?acho\s+que\s+talvez\b/i,
  /\b(?:eu\s+)?suponho\s+que\b/i,
  /\btalvez\s+(?:haja|exista|tenha|seja|esteja)\b/i,
  /\bpode\s+ser\s+que\b/i,
  /\bn[aã]o\s+tenho\s+certeza\b/i,
  /\bser[aá]\s+que\b/i,
  /\bquem\s+sabe\s+se\b/i,
  /\bdesconfio\s+apenas\b/i,
  /\bminha\s+teoria\s+[eé]\s+que\b/i,
];

/**
 * Padrões de verbos de fala e comunicação direcionada.
 */
const SPEECH_VERBS = [
  'digo',
  'diz',
  'falo',
  'fala',
  'conto',
  'conta',
  'informo',
  'informa',
  'aviso',
  'avisa',
  'revelo',
  'revela',
  'explico',
  'explica',
  'sussurro',
  'sussurra',
  'relato',
  'relata',
  'adverto',
  'converto',
  'comunico',
  'confidencio',
];

/**
 * Identifica o NPC destinatário com base no texto e nos NPCs presentes.
 */
export function identifyRecipientNPC(
  text: string,
  npcs: Array<{ id: string; name: string }>,
  allRegisteredNpcs: Record<string, NPC> = {}
): { name: string; id?: string } | null {
  const normText = text.trim();

  // 1. Tentar encontrar por vocativo inicial direto: "João, ..." ou "João: ..." ou "João! ..."
  const vocativeMatch = normText.match(/^([a-zA-Z\u00C0-\u024F\s]{2,25})[,:!-]\s+(.*)$/);
  if (vocativeMatch) {
    const candidate = vocativeMatch[1].trim();
    for (const npc of npcs) {
      if (normalizeText(npc.name) === normalizeText(candidate) || npc.name.toLowerCase().startsWith(candidate.toLowerCase())) {
        return { name: npc.name, id: npc.id };
      }
    }
    for (const npc of Object.values(allRegisteredNpcs)) {
      if (normalizeText(npc.name) === normalizeText(candidate) || npc.name.toLowerCase().startsWith(candidate.toLowerCase())) {
        return { name: npc.name, id: npc.id };
      }
    }
  }

  // 2. Tentar encontrar por padrão de fala: "Digo para João...", "Falo ao João...", "Conto a Marta que..."
  const speechRegex = new RegExp(
    `(?:${SPEECH_VERBS.join('|')})\\s+(?:a|ao|para|com|para\\s+o|para\\s+a|com\\s+o|com\\s+a)\\s+([a-zA-Z\\u00C0-\\u024F]+)`,
    'i'
  );
  const speechMatch = normText.match(speechRegex);
  if (speechMatch) {
    const candidate = speechMatch[1].trim();
    for (const npc of npcs) {
      if (normalizeText(npc.name) === normalizeText(candidate) || npc.name.toLowerCase().startsWith(candidate.toLowerCase())) {
        return { name: npc.name, id: npc.id };
      }
    }
    for (const npc of Object.values(allRegisteredNpcs)) {
      if (normalizeText(npc.name) === normalizeText(candidate) || npc.name.toLowerCase().startsWith(candidate.toLowerCase())) {
        return { name: npc.name, id: npc.id };
      }
    }
  }

  // 3. Menção nominal explícita a qualquer NPC ativo no texto
  for (const npc of npcs) {
    const firstName = npc.name.split(/[,–—\s]+/)[0];
    if (firstName && firstName.length > 2) {
      const nameRegex = new RegExp(`\\b${firstName}\\b`, 'i');
      if (nameRegex.test(normText)) {
        return { name: npc.name, id: npc.id };
      }
    }
  }

  // 4. Se houver apenas 1 NPC presente na cena e o jogador não estiver falando em 3ª pessoa
  if (npcs.length === 1) {
    return { name: npcs[0].name, id: npcs[0].id };
  }

  return null;
}

/**
 * Extrai a proposição factual limpa do enunciado do jogador.
 */
export function extractFactualStatement(
  text: string,
  recipientName?: string
): { fact: string; isInformative: boolean; isSpeculation: boolean } {
  const trimmed = text.trim();

  // 1. Filtrar perguntas puras
  if (trimmed.endsWith('?')) {
    // Apenas perguntas diretas sem asserção informativa
    if (!trimmed.toLowerCase().includes('sabia que') && !trimmed.toLowerCase().includes('você sabe que')) {
      return { fact: '', isInformative: false, isSpeculation: false };
    }
  }

  // 2. Verificar se é puramente especulativo / incerto
  let isSpeculation = false;
  for (const pattern of SPECULATION_PATTERNS) {
    if (pattern.test(trimmed)) {
      isSpeculation = true;
      break;
    }
  }

  // 3. Filtrar ações mecânicas ou físicas que não transmitem fatos
  const actionRegex = /^(?:puxo|saco|ataco|corro|abro|fecho|procuro|vasculho|tomo|bebo|escondo|ando|caminho|guardo|tiro|jogo|rolo)\b/i;
  if (actionRegex.test(trimmed) && !trimmed.includes('"') && !trimmed.includes('digo') && !trimmed.includes('falo') && !trimmed.includes('conto')) {
    return { fact: '', isInformative: false, isSpeculation: false };
  }

  // 4. Extrair citação entre aspas se houver (ex: Digo a João: "Existe uma passagem...")
  const quoteMatch = trimmed.match(/["'“«]([^"'”»]{8,})["'”»]/);
  let coreStatement = quoteMatch ? quoteMatch[1].trim() : trimmed;

  if (!quoteMatch) {
    // Remover vocativo no início se presente (ex: "João, ")
    if (recipientName) {
      const firstName = recipientName.split(/[,–—\s]+/)[0];
      const vocativePrefixRegex = new RegExp(`^(?:${recipientName}|${firstName})[,:!-–—]\\s*`, 'i');
      coreStatement = coreStatement.replace(vocativePrefixRegex, '').trim();
    } else {
      coreStatement = coreStatement.replace(/^[a-zA-Z\u00C0-\u024F]{2,20}[:!,-]\s*/, '').trim();
    }

    // Remover enquadramentos de fala (ex: "Digo para João que ", "Falo que ")
    const framingRegex = new RegExp(
      `^(?:${SPEECH_VERBS.join('|')})\\s+(?:a|ao|para|com|para\\s+o|para\\s+a)?\\s*(?:[a-zA-Z\\u00C0-\\u024F]+)?\\s*(?:que|sobre|:\\s*|[,\\s]+)?\\s*`,
      'i'
    );
    coreStatement = coreStatement.replace(framingRegex, '').trim();

    // Remover "você sabia que" ou "sabia que"
    coreStatement = coreStatement.replace(/^(?:voc[eê]\s+)?sabia\s+que\s+/i, '').trim();
  }

  // Limpar pontuação final redundante ou aspas residuais
  coreStatement = coreStatement.replace(/^["'“«]+|["'”»?]+$/g, '').trim();

  // Validar se há conteúdo factual mínimo (ao menos 3 palavras e verbo/conceito de estado)
  const words = coreStatement.split(/\s+/);
  if (words.length < 3) {
    return { fact: '', isInformative: false, isSpeculation };
  }

  // Garantir que a primeira letra seja maiúscula e termine com ponto final
  const cleanFact = coreStatement.charAt(0).toUpperCase() + coreStatement.slice(1);
  const finalFact = cleanFact.endsWith('.') ? cleanFact : `${cleanFact}.`;

  return {
    fact: finalFact,
    isInformative: true,
    isSpeculation,
  };
}

/**
 * Executa a detecção de aquisição de conhecimento e atualiza a Memory Layer se aplicável.
 */
export async function detectAndProcessKnowledgeAcquisition(
  params: DetectKnowledgeAcquisitionParams
): Promise<KnowledgeAcquisitionDetection> {
  const { campaignId, playerActionText, currentLocation, activeNpcs = [], memoryManager } = params;

  const snapshot = await memoryManager.getSnapshot(campaignId);
  const registeredNpcs = snapshot?.npcs || {};

  // 1. Identificar NPC destinatário
  const recipient = identifyRecipientNPC(playerActionText, activeNpcs, registeredNpcs);
  if (!recipient) {
    return { detected: false };
  }

  // 2. Extrair proposição factual
  const { fact, isInformative, isSpeculation } = extractFactualStatement(playerActionText, recipient.name);
  if (!isInformative || !fact) {
    return { detected: false };
  }

  // Se for pura especulação ("Eu acho que talvez..."), não registrar como fato objetivo
  if (isSpeculation) {
    return {
      detected: true,
      recipientNpcName: recipient.name,
      recipientNpcId: recipient.id,
      extractedFact: fact,
      isSpeculation: true,
      logSummary: `Especulação / hipótese levantada pelo jogador para ${recipient.name}, não gravada como fato canônico.`,
    };
  }

  // 3. Verificar se a informação já existe na memória da campanha (similaridade determinística)
  const existingKnowledgeList = snapshot?.knowledge || [];
  let existingMatch: Knowledge | null = null;
  let highestSim = 0;

  for (const k of existingKnowledgeList) {
    const sim = calculateFactSimilarity(k.fact, fact);
    if (sim > 0.65 && sim > highestSim) {
      highestSim = sim;
      existingMatch = k;
    }
  }

  let action: 'created' | 'updated' = 'created';
  let savedKnowledge: Knowledge;

  if (existingMatch) {
    // 4A. Atualizar Knowledge existente
    action = 'updated';
    const currentKnownBy = existingMatch.knownBy || [];
    const alreadyKnows = currentKnownBy.some((name) =>
      memoryManager.matchesCharacter(name, recipient.name, registeredNpcs)
    );

    const updatedKnownBy = alreadyKnows ? currentKnownBy : [...currentKnownBy, recipient.name];
    
    // Atualizar registro preservando histórico
    const updated = await memoryManager.updateKnowledge(campaignId, existingMatch.id, {
      knownBy: updatedKnownBy,
    });

    savedKnowledge = updated || existingMatch;
  } else {
    // 4B. Criar novo registro de Knowledge
    action = 'created';
    // truthStatus como 'suspicion' ou 'rumor' para permitir que o NPC não considere imediatamente verdade absoluta
    const truthStatus = 'suspicion';
    const reliability = 5; // Confiança moderada de relato de terceiro

    savedKnowledge = await memoryManager.createKnowledge(campaignId, {
      fact,
      truthStatus,
      knownBy: [recipient.name],
      suspectedBy: [],
      source: 'Jogador',
      reliability,
      isWorldTruth: false,
      isPublicKnowledge: false,
    });
  }

  // 5. Formatar e emitir os logs claros solicitados
  const logBlock = [
    '==================================================',
    'Knowledge acquisition detected',
    `NPC: ${recipient.name}`,
    'Source: Player',
    `Fact: ${savedKnowledge.fact}`,
    `Action: ${action}`,
    `Knowledge ID: ${savedKnowledge.id}`,
    '==================================================',
  ].join('\n');

  console.log(`\n${logBlock}\n`);

  memoryManager.recordLog({
    operation: action === 'created' ? 'CREATE' : 'UPDATE',
    functionName: 'detectAndProcessKnowledgeAcquisition',
    entity: `Knowledge: ${savedKnowledge.id}`,
    campaignId,
    status: 'success',
    details: `Knowledge acquisition detected | NPC: ${recipient.name} | Source: Player | Action: ${action} | Fact: "${savedKnowledge.fact}"`,
  });

  return {
    detected: true,
    recipientNpcName: recipient.name,
    recipientNpcId: recipient.id,
    extractedFact: savedKnowledge.fact,
    isSpeculation: false,
    action,
    knowledgeId: savedKnowledge.id,
    knowledge: savedKnowledge,
    logSummary: logBlock,
  };
}
