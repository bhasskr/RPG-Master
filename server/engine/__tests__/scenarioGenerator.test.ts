/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  cleanOutputText,
  extractPremiseConstraints,
  validateScenarioConstraints,
  generateProceduralPremiseScenarios,
  normalizePremiseInput,
  GuidedPremiseInput,
  ScenarioOption,
} from '../scenarios/scenarioGenerator';

function runTests() {
  console.log('===============================================================');
  console.log('TESTES ABRANGENTES: Normalização, Constraints e Geração de Cenários');
  console.log('===============================================================\n');

  let passed = 0;
  let total = 0;

  function assert(name: string, condition: boolean, details?: any) {
    total++;
    if (condition) {
      console.log(`[PASS] ${name}`);
      passed++;
    } else {
      console.error(`[FAIL] ${name}`, details ? JSON.stringify(details, null, 2) : '');
    }
  }

  // 1. Limpeza de texto (remoção de "svg", tags e prefixos)
  const clean1 = cleanOutputText('svg Oakridge High School, subúrbio de Chicago');
  const clean2 = cleanOutputText('[svg] Oakridge High School, Illinois');
  const clean3 = cleanOutputText('<svg xmlns="http://www.w3.org/2000/svg"></svg>Oakridge High School');
  const clean4 = cleanOutputText('svg: Austin, Texas');
  assert(
    '1. Limpeza de formatação e prefixos "svg"',
    clean1 === 'Oakridge High School, subúrbio de Chicago' &&
    clean2 === 'Oakridge High School, Illinois' &&
    clean3 === 'Oakridge High School' &&
    clean4 === 'Austin, Texas'
  );

  // 2. Extração de constraints em texto livre (High School + EUA + Enemies to Lovers)
  const premiseText = 'enemies to lovers, classe média, high school, EUA';
  const constraintsHS = extractPremiseConstraints(premiseText);
  assert(
    '2. Extração de constraints de texto livre (HS + EUA + Enemies to Lovers)',
    constraintsHS.hasHighSchool &&
    constraintsHS.hasMiddleClass &&
    constraintsHS.hasUSA &&
    constraintsHS.hasEnemiesToLovers &&
    !constraintsHS.hasMedievalFantasy
  );

  // 3. Normalização de GuidedPremiseInput (Romance + Enemies to Lovers + HS + Classe Média + EUA)
  const guidedRomanceHS: GuidedPremiseInput = {
    focus: 'romance',
    dynamics: 'enemies_to_lovers',
    lifeStage: 'high_school',
    socioeconomic: 'middle_class',
    location: 'usa',
    realism: 'grounded',
  };
  const normRomanceHS = normalizePremiseInput(guidedRomanceHS, { format: 'focused', worldBasis: 'real_world' });
  assert(
    '3. Normalização estruturada de Romance Enemies to Lovers em High School nos EUA',
    normRomanceHS.constraints.hasHighSchool &&
    normRomanceHS.constraints.hasUSA &&
    normRomanceHS.constraints.hasEnemiesToLovers &&
    normRomanceHS.constraints.hasRomanceFocus &&
    normRomanceHS.constraints.hasMiddleClass
  );

  // 4. Normalização de GuidedPremiseInput com Brasil
  const guidedBrazil: GuidedPremiseInput = {
    focus: 'drama',
    dynamics: 'rivalry',
    lifeStage: 'college',
    location: 'brazil',
    customLocation: 'Curitiba, PR',
  };
  const normBrazil = normalizePremiseInput(guidedBrazil, { format: 'focused', worldBasis: 'real_world' });
  assert(
    '4. Normalização estruturada com localização no Brasil',
    normBrazil.constraints.hasBrazil &&
    !normBrazil.constraints.hasUSA &&
    normBrazil.premiseText.toLowerCase().includes('brasil')
  );

  // 5. Normalização de GuidedPremiseInput com Japão
  const guidedJapan: GuidedPremiseInput = {
    focus: 'investigation',
    dynamics: 'forced_proximity',
    lifeStage: 'adult',
    location: 'japan',
    customLocation: 'Tóquio',
  };
  const normJapan = normalizePremiseInput(guidedJapan, { format: 'focused', worldBasis: 'real_world' });
  assert(
    '5. Normalização estruturada com localização no Japão',
    normJapan.constraints.hasJapan &&
    normJapan.constraints.hasInvestigation &&
    !normJapan.constraints.hasUSA
  );

  // 6. Normalização de GuidedPremiseInput com Europa
  const guidedEurope: GuidedPremiseInput = {
    focus: 'intrigue',
    dynamics: 'strangers',
    lifeStage: 'adult',
    location: 'europe',
  };
  const normEurope = normalizePremiseInput(guidedEurope, { format: 'focused', worldBasis: 'real_world' });
  assert(
    '6. Normalização estruturada com localização na Europa',
    normEurope.constraints.hasEurope &&
    !normEurope.constraints.hasUSA
  );

  // 7. Normalização de Fantasia Medieval + Mercador + Porto
  const medPremise = 'fantasia medieval, protagonista mercador, cidade portuária';
  const normMed = normalizePremiseInput(medPremise, { format: 'sandbox', worldBasis: 'fictional' });
  assert(
    '7. Normalização de Fantasia Medieval com Mercador em Cidade Portuária',
    normMed.constraints.hasMedievalFantasy &&
    normMed.constraints.hasMerchant &&
    normMed.constraints.hasPortCity
  );

  // 8. Rejeição de cenário corporativo quando exigido High School
  const invalidCorp: ScenarioOption = {
    id: 'scen_invalid_1',
    title: 'Rivalidade na Firma de Arquitetura em Seattle',
    genre: 'Drama Corporativo',
    worldIdentity: 'Escritório de arquitetura de luxo',
    premise: 'Dois sócios seniores disputam um contrato',
    setting: 'Seattle, Washington - Firma de arquitetura',
    coreConflict: 'Disputa de projeto',
    description: 'Dois arquitetos competem em uma firma corporativa',
    startingLocation: 'Sala de reuniões',
  };
  const valCorpForHS = validateScenarioConstraints(invalidCorp, normRomanceHS.constraints);
  assert(
    '8. Rejeição de cenário corporativo quando constraint é High School',
    !valCorpForHS.isValid
  );

  // 9. Aprovação de cenário High School compatível
  const validHS: ScenarioOption = {
    id: 'scen_valid_1',
    title: 'A Disputa do Grêmio em Oakridge',
    genre: 'Drama Escolar',
    worldIdentity: 'Subúrbio residencial de classe média em Illinois, escola pública tradicional',
    premise: 'Dois estudantes disputam o grêmio estudantil',
    setting: 'Oakridge High School, subúrbio de Chicago, Illinois, EUA',
    coreConflict: 'Empate na eleição estudantil',
    description: 'Nos corredores de uma escola pública de subúrbio em Illinois, dois alunos competem.',
    startingLocation: 'Sala do Grêmio Estudantil',
  };
  const valHS = validateScenarioConstraints(validHS, normRomanceHS.constraints);
  assert(
    '9. Aprovação de cenário High School compatível com constraints',
    valHS.isValid
  );

  // 10. Rejeição de cenário dos EUA quando pedido Brasil
  const invalidUSForBrazil: ScenarioOption = {
    id: 'scen_invalid_geo',
    title: 'Mistério em Nova York',
    genre: 'Drama Urbano',
    worldIdentity: 'Nova York urbana',
    premise: 'Dois investigadores em NY',
    setting: 'Manhattan, Nova York, EUA',
    coreConflict: 'Investigação de caso',
    description: 'Investigadores em Manhattan.',
    startingLocation: 'Delegacia central',
  };
  const valUSForBrazil = validateScenarioConstraints(invalidUSForBrazil, normBrazil.constraints);
  assert(
    '10. Rejeição de cenário americano quando constraint é Brasil',
    !valUSForBrazil.isValid
  );

  // 11. Rejeição de cenário dos EUA quando pedido Japão
  const valUSForJapan = validateScenarioConstraints(invalidUSForBrazil, normJapan.constraints);
  assert(
    '11. Rejeição de cenário americano quando constraint é Japão',
    !valUSForJapan.isValid
  );

  // 12. Geração procedural para High School + Romance Enemies to Lovers
  const procHS = generateProceduralPremiseScenarios(normRomanceHS.premiseText, { format: 'focused', worldBasis: 'real_world' });
  assert(
    '12. Geração procedural para High School Enemies to Lovers (3 opções válidas e distintas)',
    procHS.length === 3 &&
    procHS.every((opt) => validateScenarioConstraints(opt, normRomanceHS.constraints).isValid) &&
    procHS[0].title !== procHS[1].title &&
    procHS[1].title !== procHS[2].title
  );

  // 13. Geração procedural para Brasil
  const procBrazil = generateProceduralPremiseScenarios(normBrazil.premiseText, { format: 'focused', worldBasis: 'real_world' });
  assert(
    '13. Geração procedural para cenário ambientado no Brasil (3 opções)',
    procBrazil.length === 3 &&
    procBrazil.every((opt) => validateScenarioConstraints(opt, normBrazil.constraints).isValid)
  );

  // 14. Geração procedural para Japão
  const procJapan = generateProceduralPremiseScenarios(normJapan.premiseText, { format: 'focused', worldBasis: 'real_world' });
  assert(
    '14. Geração procedural para cenário ambientado no Japão (3 opções)',
    procJapan.length === 3 &&
    procJapan.every((opt) => validateScenarioConstraints(opt, normJapan.constraints).isValid)
  );

  // 15. Geração procedural para Fantasia Medieval Portuária
  const procMed = generateProceduralPremiseScenarios(normMed.premiseText, { format: 'sandbox', worldBasis: 'fictional' });
  assert(
    '15. Geração procedural para Fantasia Medieval Portuária (3 opções)',
    procMed.length === 3 &&
    procMed.every((opt) => validateScenarioConstraints(opt, normMed.constraints).isValid)
  );

  // 16. Romance como ponto de partida sem imposição de destino
  const hasNoTeleologicalRomance = procHS.every((opt) => {
    const text = `${opt.premise} ${opt.description} ${opt.coreConflict}`.toLowerCase();
    return !text.includes('irão se apaixonar obrigatoriamente') &&
           !text.includes('destinados a ficar juntos') &&
           !text.includes('garantia de casamento');
  });
  assert(
    '16. Cenários de romance mantêm agência aberta sem forçar sentimentos predeterminados',
    hasNoTeleologicalRomance
  );

  console.log('\n===============================================================');
  console.log(`RESULTADO FINAL: ${passed}/${total} TESTES APROVADOS`);
  console.log('===============================================================');

  if (passed !== total) {
    process.exit(1);
  }
}

runTests();
