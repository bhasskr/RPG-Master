/**
 * Testes do fluxo de Geração de Cenários na Nova Campanha:
 * 
 * 1. Testar o endpoint de geração (garantir retorno de 3 cenários diferentes sem criar campaignId).
 * 2. Garantir persistência de zero campanhas (Game Engine intocado).
 * 3. Simular escolha de um cenário.
 * 4. Confirmar que o payload final da campanha contém as descrições base do cenário.
 */

import { gameEngine } from '../server/engine/gameEngine';
import { generateThreeScenarios } from '../server/engine/scenarios/scenarioGenerator';

async function runScenarioGenerationTests() {
  console.log('=== INICIANDO TESTES DE GERAÇÃO DE CENÁRIOS ===\n');

  let passed = 0;
  let total = 0;

  const initialCount = gameEngine.listAllCampaigns().length;

  // 1. Gerar 3 cenários
  total++;
  console.log('Gerando cenários via fallback procedural...');
  const scenarios = await generateThreeScenarios();

  if (scenarios && scenarios.length === 3 && scenarios[0].title !== scenarios[1].title) {
    console.log('✅ Teste 1: Exatamente 3 cenários distintos gerados com sucesso.');
    passed++;
  } else {
    console.error('❌ Teste 1: Falha na geração dos 3 cenários.');
  }

  // 2. Confirmar que nenhum campaignId foi criado
  total++;
  const countAfterGen = gameEngine.listAllCampaigns().length;
  if (countAfterGen === initialCount) {
    console.log('✅ Teste 2: Nenhum campaignId fantasma foi criado no Game Engine durante a geração.');
    passed++;
  } else {
    console.error('❌ Teste 2: Criação indevida de campanha detectada durante a geração.');
  }

  // 3. Gerar novamente
  total++;
  console.log('Gerando novamente...');
  const scenariosBatch2 = await generateThreeScenarios();
  const countAfterGen2 = gameEngine.listAllCampaigns().length;

  if (scenariosBatch2.length === 3 && countAfterGen2 === initialCount) {
    console.log('✅ Teste 3: Nova geração realizada e Game Engine permanece intacto.');
    passed++;
  } else {
    console.error('❌ Teste 3: Falha ao gerar novamente ou detecção de vazamento de campanha.');
  }

  // 4. Simular escolha de um cenário e confirmar progressão
  total++;
  const chosenScenario = scenariosBatch2[0];
  const newCampId = `camp_chosen_scen_${Date.now()}`;
  
  const createdCamp = gameEngine.gameStateManager.createCampaign({
    campaignId: newCampId,
    title: chosenScenario.title,
    genre: chosenScenario.genre,
    startingLocation: chosenScenario.startingLocation,
    premise: chosenScenario.description,
    tone: chosenScenario.tone,
    rulesOfUniverse: chosenScenario.worldIdentity,
  });

  const listFinal = gameEngine.listAllCampaigns();
  const found = listFinal.find(c => c.id === newCampId);

  if (
    found &&
    listFinal.length === initialCount + 1 &&
    createdCamp.foundation.title === chosenScenario.title &&
    createdCamp.foundation.premise === chosenScenario.description
  ) {
    console.log('✅ Teste 4: Campanha criada com sucesso a partir do cenário escolhido.');
    passed++;
  } else {
    console.error('❌ Teste 4: Falha na vinculação dos dados do cenário à campanha.');
  }

  console.log(`\n=== RESULTADO FINAL: ${passed}/${total} TESTES APROVADOS ===`);
  if (passed === total) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runScenarioGenerationTests().catch((err) => {
  console.error('Erro ao executar testes:', err);
  process.exit(1);
});
