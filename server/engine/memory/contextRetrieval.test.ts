import { MemoryManager } from './memoryManager';
import { FilePersistentMemoryStore } from './filePersistentStore';
import path from 'path';
import fs from 'fs/promises';
import { Knowledge, NPC, Event, Relationship, InventoryItem } from './types';

interface TestReportItem {
  id: string;
  passed: boolean;
  message: string;
}

async function runContextRetrievalTests() {
  console.log('===============================================================');
  console.log('    INICIANDO TESTES DE CONTEXT RETRIEVAL (EPISTEMOLÓGICO)     ');
  console.log('===============================================================');

  const testDir = path.join(process.cwd(), 'data', 'test_context_memory');
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
    const campaignId = 'test_context_camp';
    await memoryManager.createCampaign({ campaignId, name: 'Campanha de Contexto' });
    
    await memoryManager.createNPC(campaignId, mockNPC({ name: 'João', location: 'Taverna' }));
    await memoryManager.createNPC(campaignId, mockNPC({ name: 'Marta', location: 'Taverna' }));
    await memoryManager.createNPC(campaignId, mockNPC({ name: 'Duque', location: 'Castelo' }));

    // Conhecimentos
    // 1. World Truth (Público)
    await memoryManager.createKnowledge(campaignId, {
      fact: 'O Castelo fica na colina.',
      truthStatus: 'true',
      knownBy: [],
      suspectedBy: [],
      source: 'Cânone',
      reliability: 10,
      isWorldTruth: true,
      isPublicKnowledge: true
    });

    // 2. Conhecimento de Marta (João não sabe)
    await memoryManager.createKnowledge(campaignId, {
      fact: 'O Duque está envolvido em um esquema.',
      truthStatus: 'true',
      knownBy: ['Marta', 'player'],
      suspectedBy: [],
      source: 'Carta roubada',
      reliability: 9,
      isWorldTruth: false
    });

    // 3. Conhecimento do João (Marta não sabe)
    await memoryManager.createKnowledge(campaignId, {
      fact: 'João tem um filho secreto.',
      truthStatus: 'true',
      knownBy: ['João'],
      suspectedBy: [],
      source: 'Memória própria',
      reliability: 10,
      isWorldTruth: false
    });

    // 4. Suspeita do João
    await memoryManager.createKnowledge(campaignId, {
      fact: 'Marta esconde algo no porão.',
      truthStatus: 'suspicion',
      knownBy: [],
      suspectedBy: ['João'],
      source: 'Intuição',
      reliability: 3,
      isWorldTruth: false
    });

    // =================================================================
    // TESTE 1: Contexto para João
    // =================================================================
    console.log('[TESTE 1] Contexto para João (Marta presente)');
    const contextJoao = await memoryManager.getRelevantContext({
      campaignId,
      currentLocation: 'Taverna',
      presentNPCs: ['Marta', 'João'],
      playerCharacter: 'player',
      targetCharacter: 'João'
    });

    const joaoFacts = contextJoao.relevantKnowledge.map(k => k.fact);
    
    const joaoKnowsWorldTruth = joaoFacts.includes('O Castelo fica na colina.');
    const joaoKnowsMartaSecret = joaoFacts.includes('O Duque está envolvido em um esquema.');
    const joaoKnowsHisSecret = joaoFacts.includes('João tem um filho secreto.');
    const joaoKnowsHisSuspicion = joaoFacts.includes('Marta esconde algo no porão.');

    const t1Passed = joaoKnowsWorldTruth && !joaoKnowsMartaSecret && joaoKnowsHisSecret && joaoKnowsHisSuspicion;
    report.push({
      id: 'T1',
      passed: t1Passed,
      message: `João Context: WT(${joaoKnowsWorldTruth}), MartaSec(${joaoKnowsMartaSecret}=F), JoaoSec(${joaoKnowsHisSecret}), JoaoSusp(${joaoKnowsHisSuspicion})`
    });

    // =================================================================
    // TESTE 2: Contexto para Marta
    // =================================================================
    console.log('[TESTE 2] Contexto para Marta (João presente)');
    const contextMarta = await memoryManager.getRelevantContext({
      campaignId,
      currentLocation: 'Taverna',
      presentNPCs: ['Marta', 'João'],
      playerCharacter: 'player',
      targetCharacter: 'Marta'
    });

    const martaFacts = contextMarta.relevantKnowledge.map(k => k.fact);
    
    const martaKnowsWorldTruth = martaFacts.includes('O Castelo fica na colina.');
    const martaKnowsMartaSecret = martaFacts.includes('O Duque está envolvido em um esquema.');
    const martaKnowsJoaoSecret = martaFacts.includes('João tem um filho secreto.');
    const martaKnowsJoaoSuspicion = martaFacts.includes('Marta esconde algo no porão.');

    const t2Passed = martaKnowsWorldTruth && martaKnowsMartaSecret && !martaKnowsJoaoSecret && !martaKnowsJoaoSuspicion;
    report.push({
      id: 'T2',
      passed: t2Passed,
      message: `Marta Context: WT(${martaKnowsWorldTruth}), MartaSec(${martaKnowsMartaSecret}), JoaoSec(${martaKnowsJoaoSecret}=F), JoaoSusp(${martaKnowsJoaoSuspicion}=F)`
    });

    // =================================================================
    // TESTE 3: Contexto para o Jogador
    // =================================================================
    console.log('[TESTE 3] Contexto para o Jogador');
    const contextPlayer = await memoryManager.getRelevantContext({
      campaignId,
      currentLocation: 'Taverna',
      presentNPCs: ['Marta', 'João'],
      playerCharacter: 'player',
      targetCharacter: 'player'
    });

    const playerFacts = contextPlayer.relevantKnowledge.map(k => k.fact);
    const playerKnowsWorldTruth = playerFacts.includes('O Castelo fica na colina.');
    const playerKnowsMartaSecret = playerFacts.includes('O Duque está envolvido em um esquema.');
    const playerKnowsJoaoSecret = playerFacts.includes('João tem um filho secreto.');

    const t3Passed = playerKnowsWorldTruth && playerKnowsMartaSecret && !playerKnowsJoaoSecret;
    report.push({
      id: 'T3',
      passed: t3Passed,
      message: `Player Context: WT(${playerKnowsWorldTruth}), MartaSec(${playerKnowsMartaSecret}), JoaoSec(${playerKnowsJoaoSecret}=F)`
    });

    // =================================================================
    // TESTE 4: Contexto para Narrador (All-seeing)
    // =================================================================
    console.log('[TESTE 4] Contexto para Narrador');
    const contextNarrator = await memoryManager.getRelevantContext({
      campaignId,
      currentLocation: 'Taverna',
      presentNPCs: ['Marta', 'João'],
      playerCharacter: 'player',
      targetCharacter: 'narrator'
    });

    const narratorFacts = contextNarrator.relevantKnowledge.map(k => k.fact);
    const narratorKnowsWorldTruth = narratorFacts.includes('O Castelo fica na colina.');
    const narratorKnowsMartaSecret = narratorFacts.includes('O Duque está envolvido em um esquema.');
    const narratorKnowsJoaoSecret = narratorFacts.includes('João tem um filho secreto.');
    const narratorKnowsJoaoSuspicion = narratorFacts.includes('Marta esconde algo no porão.');

    const t4Passed = narratorKnowsWorldTruth && narratorKnowsMartaSecret && narratorKnowsJoaoSecret && narratorKnowsJoaoSuspicion;
    report.push({
      id: 'T4',
      passed: t4Passed,
      message: `Narrator Context: Tudo liberado`
    });

    // RESUMO FINAL
    console.log('\n===============================================================');
    console.log('RESUMO FINAL DOS TESTES DE CONTEXT RETRIEVAL');
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

runContextRetrievalTests();
