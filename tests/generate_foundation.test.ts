/**
 * Testes do fluxo de Geração de Foundation na Nova Campanha:
 * 
 * 1. Testar o endpoint de geração de foundation com um cenário fixo.
 * 2. Confirmar a presença de todas as chaves de FoundationDetails.
 */

import { generateFoundation } from '../server/engine/scenarios/foundationGenerator';
import { ScenarioOption } from '../src/services/api';

async function runFoundationGenerationTests() {
  console.log('=== INICIANDO TESTES DE GERAÇÃO DE FOUNDATION ===\n');

  let passed = 0;
  let total = 0;

  const mockScenario: ScenarioOption = {
    id: 'test_scen_1',
    title: 'A Fronteira do Vazio',
    genre: 'Fantasia Sombria',
    worldIdentity: 'Um mundo arruinado pela extração desenfreada de minério místico.',
    description: 'Após a queda do império minerador, os reinos divididos lutam pela sobrevivência em planícies estéreis.',
    startingLocation: 'Acampamento da Borda',
    tone: 'Tenso e de sobrevivência',
    themeTags: ['Magia e Indústria', 'Ruínas', 'Escassez'],
  };

  // 1. Gerar Foundation
  total++;
  console.log('Gerando foundation via fallback procedural...');
  const foundation = await generateFoundation(mockScenario);

  if (
    foundation &&
    foundation.identityAndState &&
    foundation.geography &&
    foundation.everydayLife &&
    foundation.magicAndTechnology &&
    foundation.economyAndLogistics &&
    foundation.factionsAndPower &&
    foundation.dangersAndOpportunities &&
    foundation.currentEvents
  ) {
    console.log('✅ Teste 1: Foundation gerada com sucesso e com todas as chaves exigidas.');
    passed++;
  } else {
    console.error('❌ Teste 1: Falha na geração da Foundation ou chaves ausentes.', foundation);
  }

  console.log(`\n=== RESULTADO FINAL: ${passed}/${total} TESTES APROVADOS ===`);
  if (passed === total) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runFoundationGenerationTests().catch((err) => {
  console.error('Erro ao executar testes:', err);
  process.exit(1);
});
