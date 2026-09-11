import { MemoryManager } from './memoryManager';
import { FilePersistentMemoryStore } from './filePersistentStore';
import path from 'path';
import fs from 'fs/promises';
import { Knowledge, NPC, Event, Relationship, InventoryItem } from './types';
import dotenv from 'dotenv';
dotenv.config();

interface TestReportItem {
  id: string;
  passed: boolean;
  message: string;
}

async function runSemanticRetrievalTests() {
  console.log('===============================================================');
  console.log('       INICIANDO TESTES DE MEMÓRIA SEMÂNTICA (ADITIVA)         ');
  console.log('===============================================================');

  const testDir = path.join(process.cwd(), 'data', 'test_semantic_memory');
  await fs.mkdir(testDir, { recursive: true });

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

  try {
    const campaignId = 'test_semantic_camp';
    await memoryManager.createCampaign({ campaignId, name: 'Campanha Semântica' });
    
    // Config NPCs
    await memoryManager.createNPC(campaignId, mockNPC({ name: 'João', location: 'Taverna' }));
    await memoryManager.createNPC(campaignId, mockNPC({ name: 'Marta', location: 'Taverna' }));
    await memoryManager.createNPC(campaignId, mockNPC({ name: 'Pedro', location: 'Taverna' }));

    // Memory 1: Secret weapons transport (semantic match for "espadas", "armas")
    const k1 = await memoryManager.createKnowledge(campaignId, {
      fact: 'O Duque ordenou o transporte secreto de armas durante a madrugada.',
      truthStatus: 'true',
      knownBy: ['Marta', 'Pedro'], // João does not know
      suspectedBy: [],
      source: 'Espionagem',
      reliability: 10,
      isWorldTruth: false
    });

    // Memory 2: World Truth
    const k2 = await memoryManager.createKnowledge(campaignId, {
      fact: 'O reino de Valoria está em guerra.',
      truthStatus: 'true',
      knownBy: [],
      suspectedBy: [],
      source: 'Cânone',
      reliability: 10,
      isWorldTruth: true
    });

    // Memory 3: Rumor
    const k3 = await memoryManager.createKnowledge(campaignId, {
      fact: 'Dizem que há um dragão dormindo sob o vulcão.',
      truthStatus: 'rumor',
      knownBy: ['João'],
      suspectedBy: [],
      source: 'Taverneiros',
      reliability: 2,
      isWorldTruth: false
    });

    // Memory 4: Suspicion
    const k4 = await memoryManager.createKnowledge(campaignId, {
      fact: 'O prefeito desvia fundos.',
      truthStatus: 'suspicion',
      knownBy: [],
      suspectedBy: ['Marta'],
      source: 'Livro caixa',
      reliability: 8,
      isWorldTruth: false
    });

    // Memory 5: Old Event
    const e1 = await memoryManager.createEvent(campaignId, {
      timestamp: Date.now() - 1000000000,
      location: 'Cripta',
      participants: ['Marta'],
      description: 'Marta encontrou um amuleto brilhante com formato de escorpião.',
      consequences: []
    });

    // Memory 6: Irrelevant Old Event
    const e2 = await memoryManager.createEvent(campaignId, {
      timestamp: Date.now() - 1000000000,
      location: 'Cripta',
      participants: ['Marta'],
      description: 'Marta bebeu água.',
      consequences: []
    });
    
    // Fill with multiple events to exceed recentEventsCount
    for(let i = 0; i < 10; i++) {
        await memoryManager.createEvent(campaignId, {
          timestamp: Date.now(),
          location: 'Taverna',
          participants: ['João'],
          description: `João tomou a caneca número ${i}.`,
          consequences: []
        });
    }

    // =================================================================
    // TESTE 1 & 2: Correspondência semântica e Sinônimos
    // =================================================================
    console.log('[TESTE 1 e 2] Busca semântica por sinônimos');
    const ctx1 = await memoryManager.getRelevantContext({
      campaignId,
      currentLocation: 'Taverna',
      presentNPCs: ['Marta'],
      conversationSubject: 'espadas enviadas à noite', // different words than "armas durante a madrugada"
      targetCharacter: 'Marta'
    });

    const hasK1 = ctx1.relevantKnowledge.some(k => k.id === k1.id);
    report.push({
      id: 'T1-T2',
      passed: hasK1,
      message: `Encontrou a memória de armas/madrugada usando a query "espadas enviadas à noite"? ${hasK1}`
    });

    // =================================================================
    // TESTE 3: Isolamento epistemológico
    // =================================================================
    console.log('[TESTE 3] Isolamento Epistemológico (João não sabe das armas)');
    const ctx3 = await memoryManager.getRelevantContext({
      campaignId,
      currentLocation: 'Taverna',
      presentNPCs: ['João'],
      conversationSubject: 'espadas enviadas à noite',
      targetCharacter: 'João'
    });
    const joaoHasK1 = ctx3.relevantKnowledge.some(k => k.id === k1.id);
    report.push({
      id: 'T3',
      passed: !joaoHasK1,
      message: `João NÃO recebeu a memória de Marta, apesar da alta relevância semântica? ${!joaoHasK1}`
    });

    // =================================================================
    // TESTE 4: World Truth
    // =================================================================
    console.log('[TESTE 4] World Truth');
    const ctx4 = await memoryManager.getRelevantContext({
      campaignId,
      conversationSubject: 'conflitos e batalhas do reino',
      targetCharacter: 'João'
    });
    const joaoHasWorldTruth = ctx4.relevantKnowledge.some(k => k.id === k2.id);
    report.push({
      id: 'T4',
      passed: joaoHasWorldTruth,
      message: `World Truth ("Valoria está em guerra") foi incluído para João? ${joaoHasWorldTruth}`
    });

    // =================================================================
    // TESTE 5 & 6: Rumores e Suspeitas
    // =================================================================
    console.log('[TESTE 5 e 6] Rumor e Suspeita');
    const rumorFact = ctx3.relevantKnowledge.find(k => k.id === k3.id); // Joao context
    
    const ctxMarta = await memoryManager.getRelevantContext({
      campaignId,
      conversationSubject: 'dinheiro e corrupção',
      targetCharacter: 'Marta'
    });
    const suspicionFact = ctxMarta.relevantKnowledge.find(k => k.id === k4.id);

    report.push({
      id: 'T5',
      passed: rumorFact?.truthStatus === 'rumor',
      message: `Rumor manteve status de rumor? ${rumorFact?.truthStatus === 'rumor'}`
    });
    report.push({
      id: 'T6',
      passed: suspicionFact?.truthStatus === 'suspicion',
      message: `Suspeita manteve status de suspicion? ${suspicionFact?.truthStatus === 'suspicion'}`
    });

    // =================================================================
    // TESTE 7: Deduplicação
    // =================================================================
    console.log('[TESTE 7] Deduplicação');
    const dupCount = ctxMarta.relevantKnowledge.filter(k => k.id === k4.id).length;
    report.push({
      id: 'T7',
      passed: dupCount === 1,
      message: `Memória recuperada apareceu apenas uma vez no contexto? ${dupCount === 1}`
    });

    // =================================================================
    // TESTE 10 & 11: Memória antiga
    // =================================================================
    console.log('[TESTE 10 e 11] Evento Antigo Relevante vs Irrelevante');
    const ctxOld = await memoryManager.getRelevantContext({
      campaignId,
      currentLocation: 'Taverna', // This forces the recent 10 Tavern events to match
      conversationSubject: 'o amuleto brilhante misterioso',
      targetCharacter: 'Marta',
      recentEventsCount: 2 
    });
    
    const hasOldRelevant = ctxOld.relevantEvents.some(e => e.id === e1.id);
    const hasOldIrrelevant = ctxOld.relevantEvents.some(e => e.id === e2.id);

    report.push({
      id: 'T10',
      passed: hasOldRelevant,
      message: `Evento antigo RELEVANTE foi recuperado ignorando o limite temporal? ${hasOldRelevant}`
    });
    report.push({
      id: 'T11',
      passed: !hasOldIrrelevant,
      message: `Evento antigo IRRELEVANTE ("bebeu água") foi ignorado? ${!hasOldIrrelevant}`
    });

    // =================================================================
    // TESTE 12 & 13: Atualização e Idempotência
    // =================================================================
    console.log('[TESTE 12 e 13] Atualização e Idempotência');
    const snapBefore = await memoryManager.getSnapshot(campaignId);
    const semanticCountBefore = snapBefore?.semanticRecords?.length || 0;
    
    // Atualiza um conhecimento existente
    await memoryManager.updateKnowledge(campaignId, k1.id, { fact: 'O Duque ordenou o transporte de machados' });
    
    const snapAfter = await memoryManager.getSnapshot(campaignId);
    const semanticCountAfter = snapAfter?.semanticRecords?.length || 0;
    
    const updatedRecord = snapAfter?.semanticRecords?.find(s => s.id === k1.id);
    const isTextUpdated = updatedRecord?.text.includes('machados');

    report.push({
      id: 'T12',
      passed: !!isTextUpdated,
      message: `Atualização de conhecimento refletiu no registro semântico? ${!!isTextUpdated}`
    });
    report.push({
      id: 'T13',
      passed: semanticCountBefore === semanticCountAfter,
      message: `Número de registros semânticos permaneceu o mesmo (Idempotência/Sem duplicação)? ${semanticCountBefore === semanticCountAfter} (${semanticCountBefore} -> ${semanticCountAfter})`
    });

    // =================================================================
    // TESTE 17: Vazamento Cruzado (3 personagens)
    // =================================================================
    console.log('[TESTE 17] Vazamento Cruzado');
    const qMarta = await memoryManager.getRelevantContext({ campaignId, conversationSubject: 'carregamento do Duque', targetCharacter: 'Marta' });
    const qPedro = await memoryManager.getRelevantContext({ campaignId, conversationSubject: 'carregamento do Duque', targetCharacter: 'Pedro' });
    const qJoao = await memoryManager.getRelevantContext({ campaignId, conversationSubject: 'carregamento do Duque', targetCharacter: 'João' });

    const martaHas = qMarta.relevantKnowledge.some(k => k.id === k1.id);
    const pedroHas = qPedro.relevantKnowledge.some(k => k.id === k1.id);
    const joaoHas = qJoao.relevantKnowledge.some(k => k.id === k1.id);

    const crossPassed = martaHas && pedroHas && !joaoHas;
    report.push({
      id: 'T17',
      passed: crossPassed,
      message: `Apenas Marta e Pedro lembraram do segredo (João ficou de fora)? Marta:${martaHas}, Pedro:${pedroHas}, João:${joaoHas}`
    });

    // RESUMO FINAL
    console.log('\n===============================================================');
    console.log('RESUMO FINAL DOS TESTES DE MEMÓRIA SEMÂNTICA');
    console.log('===============================================================');
    let allPassed = true;
    for (const r of report) {
      if (r.passed) {
        console.log(`[APROVADO] TESTE ${r.id} — ${r.message}`);
      } else {
        console.error(`[REPROVADO] TESTE ${r.id} — ${r.message}`);
        allPassed = false;
      }
    }
    console.log(allPassed ? '\nRESULTADO GERAL: TODOS OS TESTES APROVADOS COM SUCESSO' : '\nRESULTADO GERAL: TESTES FALHARAM');
    
    if (!allPassed) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Erro fatal nos testes:', err);
    process.exit(1);
  } finally {
    await fs.rm(testDir, { recursive: true, force: true }).catch(() => {});
  }
}

runSemanticRetrievalTests();
