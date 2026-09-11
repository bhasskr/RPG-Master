/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MemoryManager } from '../memoryManager';
import { FilePersistentMemoryStore } from '../filePersistentStore';
import { extractMemoryChanges, extractDeterministicMemoryChanges } from './memoryExtractor';
import { MemoryValidator } from './memoryValidator';
import { normalizeText } from '../knowledgeAcquisition';
import path from 'path';
import fs from 'fs/promises';

interface TestReportItem {
  id: number;
  name: string;
  passed: boolean;
  details: string;
}

async function runMemoryExtractorTests() {
  console.log('===============================================================');
  console.log('INICIANDO OS 11 TESTES OBRIGATÓRIOS DO MEMORY EXTRACTOR');
  console.log('===============================================================\n');

  const testDir = path.join(process.cwd(), 'data', 'test_extractor_memory');
  await fs.rm(testDir, { recursive: true, force: true }).catch(() => {});
  const store = new FilePersistentMemoryStore(testDir);
  const memoryManager = new MemoryManager(store);

  const report: TestReportItem[] = [];

  function mockNPC(data: { name: string; status?: string; location?: string }) {
    return {
      name: data.name,
      status: data.status || 'alive',
      location: data.location || 'Taverna',
      faction: '',
      personalityNotes: '',
      goals: [],
      secrets: [],
      inventory: [],
      relationships: {},
    };
  }

  // =================================================================
  // TESTE 1 — DESCOBERTA DE SEGREDO
  // =================================================================
  try {
    const campaignId = 'test_camp_t1';
    await memoryManager.createCampaign({ campaignId, name: 'Campanha T1' });
    await memoryManager.createNPC(campaignId, mockNPC({ name: 'João', status: 'alive', location: 'Taverna' }));
    await memoryManager.createNPC(campaignId, mockNPC({ name: 'Marta', status: 'alive', location: 'Floresta' }));

    const turnContext = {
      campaignId,
      turn: 1,
      playerAction: 'Investigo o fundo da gaveta trancada sozinho no sótão abandonado.',
      involvedNpcs: [], // Nenhum NPC presente
      currentLocation: 'Sótão Abandonado',
      finalNarrative: 'Você força o fundo falso da gaveta e descobre que o Duque enviou a carta ordenando o envenenamento do poço.',
      previousState: {
        npcs: await memoryManager.getAllNPCs(campaignId),
        knowledge: [],
        inventory: [],
        events: [],
      },
    };

    const extraction = await extractMemoryChanges(turnContext);
    const validated = await MemoryValidator.validateAndApply(campaignId, extraction, memoryManager, 1);

    const playerKnowledge = await memoryManager.getKnowledgeForCharacter(campaignId, 'player');
    const joaoKnowledge = await memoryManager.getKnowledgeForCharacter(campaignId, 'João');
    const martaKnowledge = await memoryManager.getKnowledgeForCharacter(campaignId, 'Marta');

    const hasSecret = playerKnowledge.some((k) => k.fact.toLowerCase().includes('duque') && k.knownBy.includes('player'));
    const joaoKnows = joaoKnowledge.some((k) => k.fact.toLowerCase().includes('duque'));
    const martaKnows = martaKnowledge.some((k) => k.fact.toLowerCase().includes('duque'));

    const passed = hasSecret && !joaoKnows && !martaKnows;
    report.push({
      id: 1,
      name: 'TESTE 1 — DESCOBERTA DE SEGREDO',
      passed,
      details: passed
        ? `Segredo registrado para o jogador (${playerKnowledge[0]?.fact.slice(0, 40)}...). João e Marta mantiveram 0 conhecimentos.`
        : `Falha: hasSecret=${hasSecret}, joaoKnows=${joaoKnows}, martaKnows=${martaKnows}`,
    });
    console.log(`[TESTE 1] ${passed ? '✓ APROVADO' : '✗ REPROVADO'}: ${report[report.length - 1].details}`);
  } catch (err: any) {
    report.push({ id: 1, name: 'TESTE 1 — DESCOBERTA DE SEGREDO', passed: false, details: err.message });
    console.error('[TESTE 1] Erro:', err);
  }

  // =================================================================
  // TESTE 2 — MORTE DE NPC
  // =================================================================
  try {
    const campaignId = 'test_camp_t2';
    await memoryManager.createCampaign({ campaignId, name: 'Campanha T2' });
    const npc = await memoryManager.createNPC(campaignId, mockNPC({ name: 'Capitão Valério', status: 'alive', location: 'Muralhas' }));

    const turnContext = {
      campaignId,
      turn: 2,
      playerAction: 'Ataque mortal com a espada no peito de Valério.',
      involvedNpcs: ['Capitão Valério'],
      currentLocation: 'Muralhas',
      finalNarrative: 'A lâmina atravessa a armadura. Capitão Valério cai morto nos paralelepípedos ensanguentados.',
      previousState: {
        npcs: [npc],
        knowledge: [],
        inventory: [],
        events: [],
      },
    };

    const extraction = await extractMemoryChanges(turnContext);
    await MemoryValidator.validateAndApply(campaignId, extraction, memoryManager, 2);

    const updatedNpc = await memoryManager.getNPC(campaignId, npc.id);
    const events = await memoryManager.getRelevantEvents(campaignId, { participant: 'Valério' });

    // Reprocessamento para testar persistência e idempotência
    const reExtraction = await extractMemoryChanges(turnContext);
    await MemoryValidator.validateAndApply(campaignId, reExtraction, memoryManager, 2);
    const reUpdatedNpc = await memoryManager.getNPC(campaignId, npc.id);
    const reEvents = await memoryManager.getRelevantEvents(campaignId, { participant: 'Valério' });

    const isDead = updatedNpc?.status === 'dead';
    const staysDead = reUpdatedNpc?.status === 'dead';
    const noDupEvents = reEvents.length === 1;

    const passed = isDead && staysDead && noDupEvents;
    report.push({
      id: 2,
      name: 'TESTE 2 — MORTE DE NPC',
      passed,
      details: passed
        ? `NPC Capitão Valério atualizado para status="dead". Eventos registrados: ${reEvents.length} (sem duplicações).`
        : `Falha: isDead=${isDead}, staysDead=${staysDead}, reEventsCount=${reEvents.length}`,
    });
    console.log(`[TESTE 2] ${passed ? '✓ APROVADO' : '✗ REPROVADO'}: ${report[report.length - 1].details}`);
  } catch (err: any) {
    report.push({ id: 2, name: 'TESTE 2 — MORTE DE NPC', passed: false, details: err.message });
    console.error('[TESTE 2] Erro:', err);
  }

  // =================================================================
  // TESTE 3 — MUDANÇA DE LOCALIZAÇÃO
  // =================================================================
  try {
    const campaignId = 'test_camp_t3';
    await memoryManager.createCampaign({ campaignId, name: 'Campanha T3' });
    const npc = await memoryManager.createNPC(campaignId, mockNPC({ name: 'Eldrin', status: 'alive', location: 'Taverna' }));

    const turnContext = {
      campaignId,
      turn: 3,
      playerAction: 'Digo a Eldrin para fugir para a Cripta dos Antigos.',
      involvedNpcs: ['Eldrin'],
      currentLocation: 'Taverna',
      finalNarrative: 'Eldrin recolhe seus pergaminhos com pressa e partiu para a Cripta dos Antigos.',
      previousState: {
        npcs: [npc],
        knowledge: [],
        inventory: [],
        events: [],
      },
    };

    const extraction = await extractMemoryChanges(turnContext);
    await MemoryValidator.validateAndApply(campaignId, extraction, memoryManager, 3);

    const updatedNpc = await memoryManager.getNPC(campaignId, npc.id);
    const passed = updatedNpc !== null && updatedNpc.location.toLowerCase().includes('cripta');

    report.push({
      id: 3,
      name: 'TESTE 3 — MUDANÇA DE LOCALIZAÇÃO',
      passed,
      details: passed
        ? `Localização anterior ("Taverna") substituída com sucesso por "${updatedNpc?.location}".`
        : `Falha: Localização atual é "${updatedNpc?.location}"`,
    });
    console.log(`[TESTE 3] ${passed ? '✓ APROVADO' : '✗ REPROVADO'}: ${report[report.length - 1].details}`);
  } catch (err: any) {
    report.push({ id: 3, name: 'TESTE 3 — MUDANÇA DE LOCALIZAÇÃO', passed: false, details: err.message });
    console.error('[TESTE 3] Erro:', err);
  }

  // =================================================================
  // TESTE 4 — INVENTÁRIO
  // =================================================================
  try {
    const campaignId = 'test_camp_t4';
    await memoryManager.createCampaign({ campaignId, name: 'Campanha T4' });

    // 1. Ganha o item
    const turnContext1 = {
      campaignId,
      turn: 4,
      playerAction: 'Abro o baú de prata.',
      involvedNpcs: [],
      currentLocation: 'Câmara Secreta',
      finalNarrative: 'No interior forrado de veludo, você encontra uma Poção de Invisibilidade brilhante.',
      previousState: { npcs: [], knowledge: [], inventory: [], events: [] },
    };
    const ext1 = await extractMemoryChanges(turnContext1);
    await MemoryValidator.validateAndApply(campaignId, ext1, memoryManager, 4);

    let inv = await memoryManager.getInventory(campaignId, 'player');
    const hasPotion = inv.some((i) => normalizeText(i.item).includes('pocao de invisibilidade') && i.quantity === 1);

    // 2. Perde / consome o item
    const turnContext2 = {
      campaignId,
      turn: 5,
      playerAction: 'Bebo a poção para escapar dos guardas.',
      involvedNpcs: [],
      currentLocation: 'Corredor',
      finalNarrative: 'Você bebe e consome a Poção de Invisibilidade, sentindo seu corpo sumir no ar.',
      previousState: { npcs: [], knowledge: [], inventory: inv, events: [] },
    };
    const ext2 = await extractMemoryChanges(turnContext2);
    await MemoryValidator.validateAndApply(campaignId, ext2, memoryManager, 5);

    inv = await memoryManager.getInventory(campaignId, 'player');
    const potionLeft = inv.find((i) => normalizeText(i.item).includes('pocao de invisibilidade'));
    const quantityZeroOrRemoved = !potionLeft || potionLeft.quantity === 0;

    const passed = hasPotion && quantityZeroOrRemoved;
    report.push({
      id: 4,
      name: 'TESTE 4 — INVENTÁRIO',
      passed,
      details: passed
        ? 'Item adquirido (+1) e posteriormente consumido/removido com persistência e quantidade exata.'
        : `Falha: hasPotion=${hasPotion}, quantityZeroOrRemoved=${quantityZeroOrRemoved}`,
    });
    console.log(`[TESTE 4] ${passed ? '✓ APROVADO' : '✗ REPROVADO'}: ${report[report.length - 1].details}`);
  } catch (err: any) {
    report.push({ id: 4, name: 'TESTE 4 — INVENTÁRIO', passed: false, details: err.message });
    console.error('[TESTE 4] Erro:', err);
  }

  // =================================================================
  // TESTE 5 — RELACIONAMENTO
  // =================================================================
  try {
    const campaignId = 'test_camp_t5';
    await memoryManager.createCampaign({ campaignId, name: 'Campanha T5' });
    await memoryManager.updateRelationship(campaignId, 'player', 'Garrick', { trust: 10, hostility: 0 });
    await memoryManager.updateRelationship(campaignId, 'player', 'Lyra', { trust: 50, hostility: 0 });

    const turnContext = {
      campaignId,
      turn: 6,
      playerAction: 'Apunhalo Garrick pelas costas e quebro nosso juramento.',
      involvedNpcs: ['Garrick'],
      currentLocation: 'Acampamento',
      finalNarrative: 'Garrick olha com horror ao perceber a traição nos olhos do jogador.',
      previousState: {
        npcs: [],
        knowledge: [],
        inventory: [],
        events: [],
        relationships: [
          (await memoryManager.getRelationship(campaignId, 'player', 'Garrick'))!,
          (await memoryManager.getRelationship(campaignId, 'player', 'Lyra'))!,
        ],
      },
    };

    const extraction = await extractMemoryChanges(turnContext);
    await MemoryValidator.validateAndApply(campaignId, extraction, memoryManager, 6);

    const relGarrick = await memoryManager.getRelationship(campaignId, 'player', 'Garrick');
    const relLyra = await memoryManager.getRelationship(campaignId, 'player', 'Lyra');

    const garrickChanged = relGarrick !== null && relGarrick.trust < 0 && relGarrick.hostility > 0;
    const lyraIntact = relLyra !== null && relLyra.trust === 50 && relLyra.hostility === 0;

    const passed = garrickChanged && lyraIntact;
    report.push({
      id: 5,
      name: 'TESTE 5 — RELACIONAMENTO',
      passed,
      details: passed
        ? `Relação com Garrick alterada (Confiança: ${relGarrick?.trust}, Hostilidade: ${relGarrick?.hostility}). Relação com Lyra permaneceu intacta (50/0).`
        : `Falha: garrickChanged=${garrickChanged}, lyraIntact=${lyraIntact}`,
    });
    console.log(`[TESTE 5] ${passed ? '✓ APROVADO' : '✗ REPROVADO'}: ${report[report.length - 1].details}`);
  } catch (err: any) {
    report.push({ id: 5, name: 'TESTE 5 — RELACIONAMENTO', passed: false, details: err.message });
    console.error('[TESTE 5] Erro:', err);
  }

  // =================================================================
  // TESTE 6 — TESTEMUNHA
  // =================================================================
  try {
    const campaignId = 'test_camp_t6';
    await memoryManager.createCampaign({ campaignId, name: 'Campanha T6' });
    await memoryManager.createNPC(campaignId, mockNPC({ name: 'Lucas', status: 'alive', location: 'Praça' }));
    await memoryManager.createNPC(campaignId, mockNPC({ name: 'Marta', status: 'alive', location: 'Templo' }));

    const turnContext = {
      campaignId,
      turn: 7,
      playerAction: 'Roubo o amuleto da estátua diante dos olhos de Lucas.',
      involvedNpcs: ['Lucas'],
      currentLocation: 'Praça',
      finalNarrative: 'Lucas testemunha diretamente e descobre que o jogador roubou o amuleto sagrado.',
      previousState: {
        npcs: await memoryManager.getAllNPCs(campaignId),
        knowledge: [],
        inventory: [],
        events: [],
      },
    };

    const extraction = await extractMemoryChanges(turnContext);
    await MemoryValidator.validateAndApply(campaignId, extraction, memoryManager, 7);

    const lucasKnowledge = await memoryManager.getKnowledgeForCharacter(campaignId, 'Lucas');
    const martaKnowledge = await memoryManager.getKnowledgeForCharacter(campaignId, 'Marta');

    const lucasKnows = lucasKnowledge.some((k) => k.fact.toLowerCase().includes('amuleto') || k.fact.toLowerCase().includes('roubou'));
    const martaKnows = martaKnowledge.length > 0;

    const passed = lucasKnows && !martaKnows;
    report.push({
      id: 6,
      name: 'TESTE 6 — TESTEMUNHA',
      passed,
      details: passed
        ? `Testemunha Lucas recebeu o conhecimento (${lucasKnowledge[0]?.fact.slice(0, 35)}...). Marta (ausente) não recebeu nenhum conhecimento.`
        : `Falha: lucasKnows=${lucasKnows}, martaKnows=${martaKnows}`,
    });
    console.log(`[TESTE 6] ${passed ? '✓ APROVADO' : '✗ REPROVADO'}: ${report[report.length - 1].details}`);
  } catch (err: any) {
    report.push({ id: 6, name: 'TESTE 6 — TESTEMUNHA', passed: false, details: err.message });
    console.error('[TESTE 6] Erro:', err);
  }

  // =================================================================
  // TESTE 7 — INFORMAÇÃO PRIVADA
  // =================================================================
  try {
    const campaignId = 'test_camp_t7';
    await memoryManager.createCampaign({ campaignId, name: 'Campanha T7' });
    await memoryManager.createNPC(campaignId, mockNPC({ name: 'Eldrin', status: 'alive', location: 'Torre' }));

    const turnContext = {
      campaignId,
      turn: 8,
      playerAction: 'Leio o diário secreto escondido nas catacumbas vazias.',
      involvedNpcs: [], // Privado
      currentLocation: 'Catacumbas Vazias',
      finalNarrative: 'Você abre o diário antigo e descobre que o feitiço primordial exige sangue de dragão.',
      previousState: {
        npcs: await memoryManager.getAllNPCs(campaignId),
        knowledge: [],
        inventory: [],
        events: [],
      },
    };

    const extraction = await extractMemoryChanges(turnContext);
    await MemoryValidator.validateAndApply(campaignId, extraction, memoryManager, 8);

    const playerKnow = await memoryManager.getKnowledgeForCharacter(campaignId, 'player');
    const eldrinKnow = await memoryManager.getKnowledgeForCharacter(campaignId, 'Eldrin');

    const playerHas = playerKnow.some((k) => normalizeText(k.fact).includes('sangue de dragao'));
    const eldrinHas = eldrinKnow.length > 0;

    const passed = playerHas && !eldrinHas;
    report.push({
      id: 7,
      name: 'TESTE 7 — INFORMAÇÃO PRIVADA',
      passed,
      details: passed
        ? `Informação gravada exclusivamente para o jogador. Eldrin manteve 0 registros de conhecimento.`
        : `Falha: playerHas=${playerHas}, eldrinHas=${eldrinHas}`,
    });
    console.log(`[TESTE 7] ${passed ? '✓ APROVADO' : '✗ REPROVADO'}: ${report[report.length - 1].details}`);
  } catch (err: any) {
    report.push({ id: 7, name: 'TESTE 7 — INFORMAÇÃO PRIVADA', passed: false, details: err.message });
    console.error('[TESTE 7] Erro:', err);
  }

  // =================================================================
  // TESTE 8 — RUMOR
  // =================================================================
  try {
    const campaignId = 'test_camp_t8';
    await memoryManager.createCampaign({ campaignId, name: 'Campanha T8' });

    const turnContext = {
      campaignId,
      turn: 9,
      playerAction: 'Pergunto sobre fofocas na taverna.',
      involvedNpcs: ['Taberneiro'],
      currentLocation: 'Taverna',
      finalNarrative: 'O taberneiro sussurra que corre o boato de que um monstro habita os esgotos da cidade.',
      previousState: { npcs: [], knowledge: [], inventory: [], events: [] },
    };

    const extraction = await extractMemoryChanges(turnContext);
    await MemoryValidator.validateAndApply(campaignId, extraction, memoryManager, 9);

    const snapshot = await memoryManager.getSnapshot(campaignId);
    const rumorFact = snapshot?.knowledge.find((k) => k.fact.toLowerCase().includes('esgotos') || k.truthStatus === 'rumor');

    const isRumor = rumorFact?.truthStatus === 'rumor' || rumorFact?.truthStatus === 'suspicion';
    const isNotAbsoluteTruth = rumorFact?.truthStatus !== 'true';

    const passed = Boolean(rumorFact && isRumor && isNotAbsoluteTruth);
    report.push({
      id: 8,
      name: 'TESTE 8 — RUMOR',
      passed,
      details: passed
        ? `Informação persistida corretamente com truthStatus="${rumorFact?.truthStatus}" (Confiabilidade: ${rumorFact?.reliability}/10).`
        : `Falha: rumorFact=${JSON.stringify(rumorFact)}`,
    });
    console.log(`[TESTE 8] ${passed ? '✓ APROVADO' : '✗ REPROVADO'}: ${report[report.length - 1].details}`);
  } catch (err: any) {
    report.push({ id: 8, name: 'TESTE 8 — RUMOR', passed: false, details: err.message });
    console.error('[TESTE 8] Erro:', err);
  }

  // =================================================================
  // TESTE 9 — DUPLICAÇÃO / IDEMPOTÊNCIA
  // =================================================================
  try {
    const campaignId = 'test_camp_t9';
    await memoryManager.createCampaign({ campaignId, name: 'Campanha T9' });

    const turnContext = {
      campaignId,
      turn: 10,
      playerAction: 'Investigo o altar sagrado.',
      involvedNpcs: [],
      currentLocation: 'Altar',
      finalNarrative: 'Você descobre que a relíquia foi forjada com prata estelar.',
      previousState: { npcs: [], knowledge: [], inventory: [], events: [] },
    };

    // 1ª Execução
    const ext1 = await extractMemoryChanges(turnContext);
    await MemoryValidator.validateAndApply(campaignId, ext1, memoryManager, 10);

    const snap1 = await memoryManager.getSnapshot(campaignId);
    const eventsCount1 = snap1?.events.length || 0;
    const knowledgeCount1 = snap1?.knowledge.length || 0;

    // 2ª Execução do mesmo turno (Retry / Reprocessamento)
    const ext2 = await extractMemoryChanges(turnContext);
    await MemoryValidator.validateAndApply(campaignId, ext2, memoryManager, 10);

    const snap2 = await memoryManager.getSnapshot(campaignId);
    const eventsCount2 = snap2?.events.length || 0;
    const knowledgeCount2 = snap2?.knowledge.length || 0;

    const passed = eventsCount1 === eventsCount2 && knowledgeCount1 === knowledgeCount2;
    report.push({
      id: 9,
      name: 'TESTE 9 — DUPLICAÇÃO / IDEMPOTÊNCIA',
      passed,
      details: passed
        ? `Reprocessamento idêntico não gerou duplicações (Eventos: ${eventsCount2}, Conhecimentos: ${knowledgeCount2}).`
        : `Falha: eventos ${eventsCount1}->${eventsCount2}, conhecimentos ${knowledgeCount1}->${knowledgeCount2}`,
    });
    console.log(`[TESTE 9] ${passed ? '✓ APROVADO' : '✗ REPROVADO'}: ${report[report.length - 1].details}`);
  } catch (err: any) {
    report.push({ id: 9, name: 'TESTE 9 — DUPLICAÇÃO / IDEMPOTÊNCIA', passed: false, details: err.message });
    console.error('[TESTE 9] Erro:', err);
  }

  // =================================================================
  // TESTE 10 — CONFLITO / ANTI-RETCON
  // =================================================================
  try {
    const campaignId = 'test_camp_t10';
    await memoryManager.createCampaign({ campaignId, name: 'Campanha T10' });
    await memoryManager.createKnowledge(campaignId, {
      fact: 'O Rei Arthur está vivo e governa Camelot.',
      truthStatus: 'true',
      knownBy: ['player'],
      suspectedBy: [],
      source: 'Cânone',
      reliability: 10,
    });

    const turnContext = {
      campaignId,
      turn: 11,
      playerAction: 'Converso com um viajante.',
      involvedNpcs: [],
      currentLocation: 'Estrada',
      finalNarrative: 'O viajante descobre que o Rei Arthur nunca existiu e não é verdade.',
      previousState: {
        npcs: [],
        knowledge: (await memoryManager.getSnapshot(campaignId))?.knowledge || [],
        inventory: [],
        events: [],
      },
    };

    const extraction = await extractMemoryChanges(turnContext);
    const validated = await MemoryValidator.validateAndApply(campaignId, extraction, memoryManager, 11);

    const snapshot = await memoryManager.getSnapshot(campaignId);
    const originalFactPreserved = snapshot?.knowledge.some((k) => k.fact.includes('Rei Arthur está vivo'));
    const conflictDetected = validated.conflicts.length > 0 || (extraction.conflicts && extraction.conflicts.length > 0);

    const passed = Boolean(conflictDetected && originalFactPreserved);
    report.push({
      id: 10,
      name: 'TESTE 10 — CONFLITO / ANTI-RETCON',
      passed,
      details: passed
        ? `Conflito detectado com sucesso. Estado anterior canônico ("Rei Arthur está vivo...") preservado sem retcon silencioso.`
        : `Falha: conflictDetected=${conflictDetected}, originalFactPreserved=${originalFactPreserved}`,
    });
    console.log(`[TESTE 10] ${passed ? '✓ APROVADO' : '✗ REPROVADO'}: ${report[report.length - 1].details}`);
  } catch (err: any) {
    report.push({ id: 10, name: 'TESTE 10 — CONFLITO / ANTI-RETCON', passed: false, details: err.message });
    console.error('[TESTE 10] Erro:', err);
  }

  // =================================================================
  // TESTE 11 — NARRATIVA SEM MUDANÇA
  // =================================================================
  try {
    const campaignId = 'test_camp_t11';
    await memoryManager.createCampaign({ campaignId, name: 'Campanha T11' });

    const turnContext = {
      campaignId,
      turn: 12,
      playerAction: 'Olho para a janela e aprecio a vista.',
      involvedNpcs: ['João'],
      currentLocation: 'Quarto da Taverna',
      finalNarrative: 'João olha pela janela enquanto a chuva bate no telhado. O vento sopra suavemente pelas frestas de madeira.',
      previousState: { npcs: [], knowledge: [], inventory: [], events: [] },
    };

    const extraction = await extractMemoryChanges(turnContext);

    const eventsEmpty = extraction.events.length === 0;
    const knowledgeEmpty = extraction.knowledgeChanges.length === 0;
    const relationshipEmpty = extraction.relationshipChanges.length === 0;
    const inventoryEmpty = extraction.inventoryChanges.length === 0;
    const questEmpty = extraction.questChanges.length === 0;
    const npcEmpty = extraction.npcChanges.length === 0;
    const worldEmpty = extraction.worldChanges.length === 0;

    const allEmpty =
      eventsEmpty &&
      knowledgeEmpty &&
      relationshipEmpty &&
      inventoryEmpty &&
      questEmpty &&
      npcEmpty &&
      worldEmpty;

    const passed = allEmpty;
    report.push({
      id: 11,
      name: 'TESTE 11 — NARRATIVA SEM MUDANÇA',
      passed,
      details: passed
        ? 'Todos os 7 arrays de mudanças retornaram estritamente vazios ([]). Nenhuma memória espúria criada.'
        : `Falha: events=${extraction.events.length}, knowledge=${extraction.knowledgeChanges.length}, inventory=${extraction.inventoryChanges.length}`,
    });
    console.log(`[TESTE 11] ${passed ? '✓ APROVADO' : '✗ REPROVADO'}: ${report[report.length - 1].details}`);
  } catch (err: any) {
    report.push({ id: 11, name: 'TESTE 11 — NARRATIVA SEM MUDANÇA', passed: false, details: err.message });
    console.error('[TESTE 11] Erro:', err);
  }

  // =================================================================
  // RESUMO FINAL
  // =================================================================
  console.log('\n===============================================================');
  console.log('RESUMO FINAL DOS TESTES DO MEMORY EXTRACTOR');
  console.log('===============================================================');
  const allPassed = report.every((r) => r.passed);
  report.forEach((r) => {
    console.log(`[${r.passed ? 'APROVADO' : 'REPROVADO'}] ${r.name}: ${r.details}`);
  });
  console.log(`\nRESULTADO GERAL: ${allPassed ? '11/11 TESTES APROVADOS COM SUCESSO' : 'TESTES FALHARAM'}`);
}

runMemoryExtractorTests().catch(console.error);
