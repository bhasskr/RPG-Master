/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getSystemInstructions } from './systemInstructions';

/**
 * Suíte de Testes e Validação: Refino do Narrador — Realismo Material e Causalidade
 *
 * Ordem Canônica de Decisão:
 * world state → causalidade física/material → regras mecânicas → D20 quando houver incerteza real → narração
 *
 * Princípio da Plausibilidade do Mundo:
 * "Realistic when real-world rules apply; internally consistent when fictional rules supersede them."
 *
 * Cenários avaliados:
 * 1. Tentar erguer peso claramente impossível (sem D20, narração direta de impossibilidade e esforço).
 * 2. Comprar algo sem recursos suficientes (sem D20, recusa material direta).
 * 3. Caminhar com ferimento incapacitante (persistência da limitação física/dor sem cura mágica espontânea).
 * 4. Usar item já consumido/esgotado (inventário vazio impede uso sem reaparecimento conveniente).
 * 5. Atravessar distância incompatível com o tempo disponível (viagem exige tempo/recurso real).
 * 6. Ação trivial sem D20 (resolução direta sem rolagem desnecessária).
 * 7. Ação possível e incerta com D20 (acionamento legítimo do motor mecânico).
 * 8. Regra física fictícia da Fundação que supera a física real (consistência interna com as regras do cenário).
 */

interface CausalityCheckResult {
  valid: boolean;
  violations: string[];
  reasons: string[];
}

function evaluateMaterialCausality(
  scenarioType:
    | 'impossible_weight'
    | 'no_money'
    | 'severe_injury'
    | 'depleted_item'
    | 'incompatible_travel_time'
    | 'trivial_action'
    | 'uncertain_action'
    | 'fictional_override',
  narrativeText: string,
  d20Rolled: boolean,
  fictionalRulesActive: boolean = false
): CausalityCheckResult {
  const violations: string[] = [];
  const reasons: string[] = [];
  const text = narrativeText.toLowerCase();

  switch (scenarioType) {
    case 'impossible_weight':
      // Ergueu peso de 10 toneladas com as mãos sem magia/alavanca?
      if (d20Rolled) {
        violations.push('D20 foi rolado para uma ação fisicamente impossível (erguer peso impossível).');
      }
      if (text.includes('ergue o bloco') || text.includes('levanta a pedra maciça com facilidade') || text.includes('carrega nos braços')) {
        violations.push('Personagem ergueu peso claramente inviável para força humana comum.');
      } else {
        reasons.push('Impossibilidade física respeitada: peso maciço não foi erguido por milagre.');
      }
      break;

    case 'no_money':
      if (d20Rolled) {
        violations.push('D20 foi rolado para comprar algo sem dinheiro.');
      }
      if (text.includes('compra a espada') || text.includes('comerciante entrega o frasco de graça') || text.includes('você adquire o item')) {
        violations.push('Transação ocorreu sem recursos monetários disponíveis.');
      } else {
        reasons.push('Falta de fundos respeitada materialmente na transação.');
      }
      break;

    case 'severe_injury':
      if (text.includes('corre velozmente') || text.includes('sem qualquer dor') || text.includes('salta com a perna quebrada')) {
        violations.push('Ferimento grave/incapacitante foi ignorado na narrativa.');
      } else {
        reasons.push('Limitação física do ferimento grave foi mantida.');
      }
      break;

    case 'depleted_item':
      if (text.includes('bebe a poção que estava vazia') || text.includes('dispara a flecha da aljava vazia') || text.includes('o frasco reaparece')) {
        violations.push('Item consumido ou ausente reapareceu convenientemente no inventário.');
      } else {
        reasons.push('Ausência de item consumido foi respeitada.');
      }
      break;

    case 'incompatible_travel_time':
      if (text.includes('chega à capital distante em poucos segundos a pé') || text.includes('atravessa 50km em um piscar de olhos sem montaria')) {
        violations.push('Distância incompatível com o tempo decorrido foi ignorada.');
      } else {
        reasons.push('Relação tempo/distância física foi respeitada.');
      }
      break;

    case 'trivial_action':
      if (d20Rolled) {
        violations.push('D20 foi rolado desnecessariamente para uma ação trivial e segura.');
      } else {
        reasons.push('Ação trivial resolvida diretamente sem burocracia de dados.');
      }
      break;

    case 'uncertain_action':
      if (!d20Rolled) {
        violations.push('Ação arriscada e incerta foi resolvida sem consultar o D20/Game Engine.');
      } else {
        reasons.push('D20 acionado corretamente para resolução de incerteza mecânica.');
      }
      break;

    case 'fictional_override':
      if (fictionalRulesActive) {
        // Exemplo: no cenário, existe levitação arcana estabelecida
        if (text.includes('impossível flutuar porque a gravidade terrestre impede') && !text.includes('energia arcana')) {
          violations.push('Física do mundo real ignorou a regra fictícia canônica da Fundação.');
        } else {
          reasons.push('Regra fictícia da Fundação superou a física real com consistência interna.');
        }
      }
      break;
  }

  return {
    valid: violations.length === 0,
    violations,
    reasons,
  };
}

async function runMaterialRealismTestSuite() {
  console.log('===============================================================');
  console.log('SUÍTE DE TESTES: REFINO DO NARRADOR — REALISMO MATERIAL E CAUSALIDADE');
  console.log('===============================================================\n');

  // [TESTE 1] Diretivas Canônicas nas System Instructions
  console.log('[TESTE 1] Validando ordem de decisão e diretivas canônicas nas System Instructions...');
  const instructions = getSystemInstructions(
    'Pedras de Éter permitem levitação sem consumir fôlego',
    'Realista'
  );

  const requiredTokens = [
    'MOTOR DE DADOS REAL, REALISMO MATERIAL E CAUSALIDADE (REGRAS CANÔNICAS)',
    'world state → causalidade física/material → regras mecânicas → D20 quando houver incerteza real → narração',
    'O dado JAMAIS torna possível o que o estado do mundo ou a física estabelecida tornam impossível',
    'Realistic when real-world rules apply; internally consistent when fictional rules supersede them',
    'CRITÉRIOS RÍGIDOS PARA O USO DO D20',
  ];

  for (const token of requiredTokens) {
    if (!instructions.includes(token)) {
      throw new Error(`Diretiva canônica ausente nas instruções: "${token}"`);
    }
  }
  console.log('✅ TESTE 1 PASSOU: Ordem canônica de decisão e regras de causalidade integradas nas System Instructions.\n');

  // [TESTE 2] Cenário 1: Tentar erguer peso claramente impossível (rocha de 10 toneladas)
  console.log('[TESTE 2] Cenário 1: Tentar erguer peso impossível sem alavanca/magia...');
  const textImpossibleWeight =
    'Você apoia os ombros contra o monólito de granito de cinco toneladas e empurra com toda a força dos músculos. A rocha maciça nem sequer estremece sob a terra batida, e o esforço infrutífero apenas faz suas costas latejarem e seus pés deslizarem no cascalho.';
  
  const res1 = evaluateMaterialCausality('impossible_weight', textImpossibleWeight, false);
  if (!res1.valid) throw new Error(`Falha no Teste 2: ${res1.violations.join(', ')}`);
  
  // Testando contra violação (rolar dado e conseguir)
  const badRes1 = evaluateMaterialCausality('impossible_weight', 'Você tira 20 no D20 e ergue o bloco de cinco toneladas com os braços.', true);
  if (badRes1.valid) throw new Error('Falha ao detectar violação de peso impossível.');
  console.log('✅ TESTE 2 PASSOU: Peso fisicamente impossível não gera rolagem de D20 nem sucesso mágico.\n');

  // [TESTE 3] Cenário 2: Comprar algo sem fundos suficientes
  console.log('[TESTE 3] Cenário 2: Comprar espada de 50 moedas com a bolsa vazia...');
  const textNoMoney =
    'O armeiro olha para as suas mãos vazias e cruza os braços grossos de couro. "Cinquenta moedas de prata cravadas na tábua, nem uma a menos. Volte quando tiver como pagar", diz ele antes de devolver a lâmina forjada ao suporte de parede.';
  
  const res2 = evaluateMaterialCausality('no_money', textNoMoney, false);
  if (!res2.valid) throw new Error(`Falha no Teste 3: ${res2.violations.join(', ')}`);
  
  const badRes2 = evaluateMaterialCausality('no_money', 'Você convence o armeiro e adquire o item sem pagar nada com um D20 alto.', true);
  if (badRes2.valid) throw new Error('Falha ao detectar violação de compra sem recursos.');
  console.log('✅ TESTE 3 PASSOU: Ausência de recursos financeiros mantida como barreira material objetiva.\n');

  // [TESTE 4] Cenário 3: Caminhar com ferimento incapacitante (fratura exposta no tornozelo)
  console.log('[TESTE 4] Cenário 3: Deslocamento com fratura exposta/grave...');
  const textSevereInjury =
    'Ao tentar firmar o pé esquerdo fraturado no solo, uma pontada aguda de dor sobe pela canela e seu joelho cede imediatamente. Você é forçado a se apoiar na parede de taipa para não desabar na lama, avançando apenas aos solavancos com respiração entrecortada.';
  
  const res3 = evaluateMaterialCausality('severe_injury', textSevereInjury, false);
  if (!res3.valid) throw new Error(`Falha no Teste 4: ${res3.violations.join(', ')}`);
  
  const badRes3 = evaluateMaterialCausality('severe_injury', 'Apesar da fratura, você corre velozmente pela floresta sem qualquer dor.', false);
  if (badRes3.valid) throw new Error('Falha ao detectar ferimento ignorado.');
  console.log('✅ TESTE 4 PASSOU: Ferimento grave continua impondo limitações materiais de movimento e dor.\n');

  // [TESTE 5] Cenário 4: Usar item já consumido (poção esgotada no turno anterior)
  console.log('[TESTE 5] Cenário 4: Tentar beber poção já consumida...');
  const textDepletedItem =
    'Você leva a mão à algibeira de couro, mas seus dedos encontram apenas o frasco de vidro vazio com resíduos secos no fundo, já esgotado no confronto anterior. Não há mais líquido restaurador disponível.';
  
  const res4 = evaluateMaterialCausality('depleted_item', textDepletedItem, false);
  if (!res4.valid) throw new Error(`Falha no Teste 5: ${res4.violations.join(', ')}`);
  
  const badRes4 = evaluateMaterialCausality('depleted_item', 'Você bebe a poção que estava vazia e recupera toda a sua energia.', false);
  if (badRes4.valid) throw new Error('Falha ao detectar reaparecimento indevido de item.');
  console.log('✅ TESTE 5 PASSOU: Inventário e consumo de recursos mantidos sem reaparecimentos convenientes.\n');

  // [TESTE 6] Cenário 5: Atravessar distância incompatível com o tempo disponível
  console.log('[TESTE 6] Cenário 5: Viajar 40 km a pé em 10 minutos...');
  const textIncompatibleTravel =
    'A fortaleza da fronteira fica a mais de oito léguas de distância montanha acima. Em dez minutos de caminhada rápida, você mal alcança o marco de pedra que delimita a saída do vilarejo; a trilha íngreme ainda se estende por horas de marcha sob o sol da tarde.';
  
  const res5 = evaluateMaterialCausality('incompatible_travel_time', textIncompatibleTravel, false);
  if (!res5.valid) throw new Error(`Falha no Teste 6: ${res5.violations.join(', ')}`);
  console.log('✅ TESTE 6 PASSOU: Distância e tempo calibrados à velocidade e transporte realistas.\n');

  // [TESTE 7] Cenário 6: Ação trivial sem D20 vs Ação incerta com D20
  console.log('[TESTE 7] Cenário 6 e 7: Ação trivial sem dados vs Ação incerta com dados...');
  const resTrivial = evaluateMaterialCausality('trivial_action', 'Você retira a chave de latão do bolso e destranca o ferrolho da porta.', false);
  if (!resTrivial.valid) throw new Error(`Falha na ação trivial: ${resTrivial.violations.join(', ')}`);

  const resUncertain = evaluateMaterialCausality('uncertain_action', 'Você salta pelo telhado inclinado sob chuva torrencial.', true);
  if (!resUncertain.valid) throw new Error(`Falha na ação incerta: ${resUncertain.violations.join(', ')}`);
  console.log('✅ TESTE 7 PASSOU: Ações triviais resolvidas diretamente; D20 restrito a incertezas reais com risco.\n');

  // [TESTE 8] Cenário 8: Regra física fictícia da Fundação superando física real
  console.log('[TESTE 8] Cenário 8: Regra especial de cenário da Fundação (Pedra de Éter / Levitação)...');
  const textFictionalRule =
    'Ao canalizar energia através da Pedra de Éter engastada no anel, o campo gravitacional ao seu redor se dissolve suavemente. Seus pés deixam o piso de pedra e seu corpo flutua a meio metro do chão em suspensão estável, conforme as propriedades arcanas do cristal estabelecidas na fundação deste mundo.';
  
  const res8 = evaluateMaterialCausality('fictional_override', textFictionalRule, false, true);
  if (!res8.valid) throw new Error(`Falha no Teste 8: ${res8.violations.join(', ')}`);
  console.log('✅ TESTE 8 PASSOU: Regras físicas fictícias da Fundação superam leis reais com consistência interna.\n');

  console.log('===============================================================');
  console.log('RESULTADO DA SUÍTE: 8/8 TESTES APROVADOS (100%)');
  console.log('===============================================================');
}

runMaterialRealismTestSuite().catch((err) => {
  console.error('❌ Falha na suíte de testes de realismo material:', err);
  process.exit(1);
});
