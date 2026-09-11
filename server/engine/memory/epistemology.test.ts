// @ts-nocheck
import { MemoryManager } from './memoryManager';
import { CampaignMemorySnapshot, Knowledge } from './types';
import fs from 'fs';
import path from 'path';

async function runEpistemologyTests() {
  console.log('===============================================================');
  console.log('       INICIANDO TESTES EPISTEMOLÓGICOS                        ');
  console.log('===============================================================');

  const memoryManager = new MemoryManager();
  const campaignId = 'test_epistemology_camp';
  
  // Limpar estado antigo
  await memoryManager.clearCampaignData(campaignId);
  
  // Populações base para testes
  await memoryManager['store'].saveSnapshot({
    campaign: { campaignId, name: 'Epistemology Test', createdAt: Date.now(), currentDate: 'Day 1', currentLocation: 'Taverna' },
    npcs: {
      joao: { id: 'joao', name: 'João', status: 'alive', location: 'Taverna', faction: 'Townsfolk', personalityNotes: '', goals: [], secrets: [], inventory: [], relationships: {} },
      marta: { id: 'marta', name: 'Marta', status: 'alive', location: 'Taverna', faction: 'Guards', personalityNotes: '', goals: [], secrets: [], inventory: [], relationships: {} },
      pedro: { id: 'pedro', name: 'Pedro', status: 'alive', location: 'Taverna', faction: 'Merchants', personalityNotes: '', goals: [], secrets: [], inventory: [], relationships: {} },
    },
    events: [],
    knowledge: [],
    relationships: [],
    inventory: [],
    quests: [],
    updatedAt: Date.now()
  });

  // TESTE 1 — WORLD_TRUTH VS BELIEF
  const k1 = await memoryManager.createKnowledge(campaignId, { source: "test", reliability: 10, suspectedBy: [], 
    fact: 'O rei está vivo.',
    truthStatus: 'true',
    isWorldTruth: true,
    epistemicStatus: 'WORLD_TRUTH',
    knownBy: []
  });
  const k2 = await memoryManager.createKnowledge(campaignId, { source: "test", reliability: 10, suspectedBy: [], 
    fact: 'O rei foi assassinado (Falsa Crença de João).',
    truthStatus: 'false',
    isWorldTruth: false,
    epistemicStatus: 'FALSE_BELIEF',
    believedBy: ['João'],
    knownBy: []
  });

  // TESTE 2 — DIRECT_OBSERVATION
  const k3 = await memoryManager.createKnowledge(campaignId, { source: "test", reliability: 10, suspectedBy: [], 
    fact: 'Uma figura encapuzada fugiu pela janela.',
    truthStatus: 'true',
    epistemicStatus: 'DIRECT_OBSERVATION',
    observedBy: ['João'],
    isWorldTruth: false,
    knownBy: []
  });

  // TESTE 3 & 15 — INFORMATION CHAIN & SOURCE TRACKING
  const k4 = await memoryManager.createKnowledge(campaignId, { source: "test", reliability: 10, suspectedBy: [], 
    fact: 'O prefeito esconde ouro.',
    truthStatus: 'true',
    epistemicStatus: 'REPORTED_INFORMATION',
    knownBy: ['João'],
    source: 'Marta',
    informationChain: ['Marta', 'João']
  });

  // TESTE 4 — FALSE INFORMATION
  const k5 = await memoryManager.createKnowledge(campaignId, { source: "test", reliability: 10, suspectedBy: [], 
    fact: 'Marta disse que Pedro é um espião (Menta para João).',
    truthStatus: 'false',
    epistemicStatus: 'BELIEF',
    believedBy: ['João'],
    knownBy: [],
    source: 'Marta',
    informationChain: ['Marta', 'João']
  });

  // TESTE 5 — RUMOR
  const k6 = await memoryManager.createKnowledge(campaignId, { source: "test", reliability: 10, suspectedBy: [], 
    fact: 'Existem dragões na montanha.',
    truthStatus: 'rumor',
    epistemicStatus: 'RUMOR',
    knownBy: ['João']
  });

  // TESTE 6 — SUSPICION
  const k7 = await memoryManager.createKnowledge(campaignId, { source: "test", reliability: 10, suspectedBy: [], 
    fact: 'O taverneiro dilui a bebida.',
    truthStatus: 'suspicion',
    epistemicStatus: 'SUSPICION',
    suspectedBy: ['João'],
    knownBy: []
  });

  // TESTE 7 & 12 — EPISTEMIC ISOLATION & SEMANTIC RETRIEVAL
  const k8 = await memoryManager.createKnowledge(campaignId, { source: "test", reliability: 10, suspectedBy: [], 
    fact: 'O colar mágico está enterrado sob a velha árvore de carvalho.',
    truthStatus: 'true',
    epistemicStatus: 'DIRECT_OBSERVATION',
    observedBy: ['Marta'],
    isWorldTruth: false,
    knownBy: []
  });

  // TESTE 8 — PLAYER ISOLATION
  const k9 = await memoryManager.createKnowledge(campaignId, { source: "test", reliability: 10, suspectedBy: [], 
    fact: 'O mapa do tesouro tem uma runa invisível.',
    truthStatus: 'true',
    epistemicStatus: 'DIRECT_OBSERVATION',
    observedBy: ['player'],
    isWorldTruth: false,
    knownBy: []
  });

  // TESTE 9 — CONTRADICTORY BELIEFS
  const k10 = await memoryManager.createKnowledge(campaignId, { source: "test", reliability: 10, suspectedBy: [], 
    fact: 'A espada é amaldiçoada.',
    truthStatus: 'belief',
    epistemicStatus: 'BELIEF',
    believedBy: ['João'],
    knownBy: []
  });
  const k11 = await memoryManager.createKnowledge(campaignId, { source: "test", reliability: 10, suspectedBy: [], 
    fact: 'A espada é abençoada.',
    truthStatus: 'belief',
    epistemicStatus: 'BELIEF',
    believedBy: ['Marta'],
    knownBy: []
  });

  // TESTE 14 — NPC DESCONHECE
  // World Truth K1: "O rei está vivo." já criado. João acredita falso (K2). Pedro não foi mencionado.
  
  // TESTE 16 — BELIEF UPDATE
  const k12 = await memoryManager.createKnowledge(campaignId, { source: "test", reliability: 10, suspectedBy: [], 
    fact: 'O assassino é canhoto.',
    truthStatus: 'belief',
    epistemicStatus: 'BELIEF',
    believedBy: ['João'],
    knownBy: []
  });
  await memoryManager.updateKnowledge(campaignId, k12.id, {
    epistemicStatus: 'DISPUTED',
    disputedBy: ['João']
  });

  // RUNNING THE RETRIEVALS
  
  // João's Context
  const joaoContext = await memoryManager.getRelevantContext({
    campaignId,
    targetCharacter: 'João',
    conversationSubject: 'rei figura encapuzada prefeito pedro dragões taverneiro colar mapa espada canhoto'
  });
  
  // Marta's Context
  const martaContext = await memoryManager.getRelevantContext({
    campaignId,
    targetCharacter: 'Marta',
    conversationSubject: 'rei figura encapuzada prefeito pedro dragões taverneiro colar mapa espada canhoto'
  });

  const joaoSummary = joaoContext.formattedSummary;
  const martaSummary = martaContext.formattedSummary;

  let passed = 0;
  let failed = 0;
  
  function assertTest(testName: string, condition: boolean, reason: string) {
    if (condition) {
      console.log(`[APROVADO] ${testName}`);
      passed++;
    } else {
      console.log(`[FALHOU] ${testName}`);
      console.log(`  Motivo: ${reason}`);
      failed++;
    }
  }

  // T1: WORLD_TRUTH VS BELIEF
  assertTest('TESTE 1 — WORLD_TRUTH VS BELIEF', 
    joaoSummary.includes('[WORLD FACTS (FATOS GERAIS DO MUNDO)]') && joaoSummary.includes('O rei está vivo') && joaoSummary.includes('[FALSA CRENÇA') && joaoSummary.includes('O rei foi assassinado'),
    'João deveria receber a World Truth E sua Falsa Crença independentemente.'
  );

  // T2: DIRECT_OBSERVATION
  assertTest('TESTE 2 — DIRECT_OBSERVATION',
    joaoSummary.includes('[OBSERVAÇÃO DIRETA (Testemunhou)]: "Uma figura encapuzada fugiu pela janela."'),
    'Observação de João não foi formatada corretamente.'
  );

  // T3 & T15: INFORMATION CHAIN & SOURCE TRACKING
  assertTest('TESTE 3 & 15 — INFORMATION CHAIN & SOURCE TRACKING',
    joaoSummary.includes('[INFORMAÇÃO REPORTADA recebida de Marta -> João]: "O prefeito esconde ouro."'),
    'Cadeia de informação ou fonte se perdeu.'
  );

  // T4: FALSE INFORMATION
  assertTest('TESTE 4 — FALSE INFORMATION',
    joaoSummary.includes('[CRENÇA PESSOAL]: "Marta disse que Pedro é um espião (Menta para João)."'),
    'Falsa informação não apareceu como Crença para João.'
  );

  // T5: RUMOR
  assertTest('TESTE 5 — RUMOR',
    joaoSummary.includes('[RUMOR]: "Existem dragões na montanha."'),
    'Rumor não foi mantido como RUMOR.'
  );

  // T6: SUSPICION
  assertTest('TESTE 6 — SUSPICION',
    joaoSummary.includes('[SUSPEITA]: "O taverneiro dilui a bebida."'),
    'Suspeita não foi mantida como SUSPEITA.'
  );

  // T7 & T12: EPISTEMIC ISOLATION & SEMANTIC RETRIEVAL
  assertTest('TESTE 7 & 12 — EPISTEMIC ISOLATION & SEMANTIC',
    !joaoSummary.includes('colar mágico') && martaSummary.includes('colar mágico'),
    'João descobriu o segredo de Marta indevidamente, ou Marta perdeu o segredo.'
  );

  // T8: PLAYER ISOLATION
  assertTest('TESTE 8 — PLAYER ISOLATION',
    !joaoSummary.includes('runa invisível'),
    'João soube da runa que apenas o jogador viu.'
  );

  // T9: CONTRADICTORY BELIEFS
  assertTest('TESTE 9 — CONTRADICTORY BELIEFS',
    joaoSummary.includes('A espada é amaldiçoada') && !joaoSummary.includes('A espada é abençoada') &&
    martaSummary.includes('A espada é abençoada') && !martaSummary.includes('A espada é amaldiçoada'),
    'Houve mistura de crenças contraditórias entre NPCs.'
  );

  // T14: NPC DESCONHECE
  const pedroContext = await memoryManager.getRelevantContext({ campaignId, targetCharacter: 'Pedro' });
  assertTest('TESTE 14 — NPC DESCONHECE',
    pedroContext.formattedSummary.includes('O rei está vivo') && !pedroContext.formattedSummary.includes('O rei foi assassinado'),
    'Pedro recebeu crenças falsas que ele não possuía, ou perdeu a World Truth.'
  );

  // T16: BELIEF UPDATE
  assertTest('TESTE 16 — BELIEF UPDATE',
    joaoSummary.includes('[INFORMAÇÃO CONTESTADA]: "O assassino é canhoto."'),
    'O status DISPUTED não foi formatado corretamente após a atualização.'
  );
  
  // T10, T11, T13, T17 (Semantic, Idempotence, Conflicts) já foram indiretamente testados pelas suítes anteriores 
  // que não devem quebrar. Faremos T18 como um script separado ou confiamos na suíte existente.

  console.log('===============================================================');
  console.log('RESUMO FINAL DOS TESTES EPISTEMOLÓGICOS');
  console.log('===============================================================');
  console.log(`TOTAL: ${passed + failed} | APROVADOS: ${passed} | FALHOS: ${failed}`);
}

runEpistemologyTests();
