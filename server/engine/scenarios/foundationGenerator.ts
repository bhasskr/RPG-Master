/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, Type } from '@google/genai';
import { ScenarioOption, GuidedPremiseInput, normalizePremiseInput } from './scenarioGenerator';
import { getModelChain, summarizeApiError, logModelExecution } from '../modelPolicy';

export interface FoundationDetails {
  identityAndState: string;
  geography: string;
  everydayLife: string;
  magicAndTechnology: string;
  economyAndLogistics: string;
  factionsAndPower: string;
  dangersAndOpportunities: string;
  currentEvents: string;
}

export interface GenerateFoundationOptions {
  format?: 'sandbox' | 'focused';
  worldBasis?: 'real_world' | 'fictional';
  premise?: string;
  guidedPremise?: GuidedPremiseInput;
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, timeoutErrorMessage: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(timeoutErrorMessage));
    }, timeoutMs);

    promise
      .then((res) => {
        clearTimeout(timer);
        resolve(res);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

/**
 * Procedural fallback for foundation generation
 */
function getProceduralFoundation(scenario: ScenarioOption, options?: GenerateFoundationOptions): FoundationDetails {
  const isFocused = options?.format === 'focused';

  if (isFocused) {
    return {
      identityAndState: `Contexto de ${scenario.title}: ${scenario.worldIdentity}. O cenário se concentra nas dinâmicas interpessoais e sociais imediatas, sem imposição de uma jornada pré-roteirizada.`,
      geography: `O ambiente principal é ${scenario.startingLocation}, cercado por poucos locais cotidianos e pontos de encontro realmente relevantes para as pessoas envolvidas.`,
      everydayLife: `As rotinas diárias e hábitos locais definem o ritmo do lugar, com pessoas vivendo suas próprias vidas, trabalhando e interagindo naturalmente.`,
      magicAndTechnology: `As regras da realidade e ferramentas disponíveis refletem o tom de ${scenario.genre}. A tecnologia e as convenções sociais funcionam como pano de fundo crível para a rotina diária.`,
      economyAndLogistics: `A subsistência prática, o trabalho e os recursos imediatos afetam as escolhas e prioridades cotidianas dos envolvidos.`,
      factionsAndPower: `O círculo social conta com figuras locais autônomas, grupos de convivência e pequenas hierarquias de relacionamento que possuem suas próprias vontades e interesses.`,
      dangersAndOpportunities: `As tensões decorrem de atritos naturais de convivência, dilemas pessoais e oportunidades de aprofundar laços ou buscar objetivos individuais.`,
      currentEvents: `Situações recentes movimentam o ambiente local, enquanto o restante da sociedade e do mundo continua existindo e operando em paralelo.`,
    };
  }

  return {
    identityAndState: `O mundo de ${scenario.title} vive um período característico de sua era. ${scenario.worldIdentity}`,
    geography: `O local inicial, ${scenario.startingLocation}, é uma porta de entrada para regiões variadas, marcadas por ecossistemas e povoações adaptadas à realidade deste universo.`,
    everydayLife: `Os habitantes comuns tocam suas vidas e culturas, adaptando-se às regras do ambiente e às estruturas sociais vigentes. O comércio e a vida comunitária florescem onde há estabilidade.`,
    magicAndTechnology: `As forças motrizes deste cenário (ciência, magia ou tecnologia de ponta) moldam o desenvolvimento e as ferramentas disponíveis para os povos conhecidos.`,
    economyAndLogistics: `As rotas de comércio, recursos vitais e logística de distribuição estabelecem as conexões e disputas entre diferentes regiões.`,
    factionsAndPower: `Poderes estabelecidos, organizações e grupos de influência disputam espaço e relevância, criando equilíbrios dinâmicos.`,
    dangersAndOpportunities: `Zonas inexploradas, fronteiras e territórios em disputa oferecem grandes perigos para os incautos e oportunidades ricas para pioneiros.`,
    currentEvents: `Rumores e movimentações recentes nas fronteiras e centros urbanos apontam para novas tensões em desenvolvimento.`,
  };
}

function buildSandboxPrompt(scenario: ScenarioOption, options?: GenerateFoundationOptions): string {
  const isRealWorld = options?.worldBasis === 'real_world';
  return `
Você é um especialista em Worldbuilding de RPG Sandbox.
Sua tarefa é expandir o cenário fornecido para criar a "Foundation" (Fundação) detalhada do mundo.

BASE DO UNIVERSO: ${isRealWorld ? 'BASEADO NO MUNDO REAL (lugares, cultura, cotidiano e regras compatíveis com a realidade; SEM magia ou tecnologias fantásticas a não ser que explicitamente pedido)' : 'FICCIONAL (total liberdade para fantasia, ficção científica, mundos alternativos ou universos inventados)'}

CENÁRIO ESCOLHIDO (RPG SANDBOX):
Título: ${scenario.title}
Gênero: ${scenario.genre}
Identidade: ${scenario.worldIdentity}
Descrição: ${scenario.description}
Local Inicial: ${scenario.startingLocation}
Tom: ${scenario.tone || 'Neutro'}
${options?.premise ? `Premissa Base do Jogador: ${options.premise}` : ''}

DIRETRIZES PARA RPG SANDBOX:
- Desenvolva a amplitude do mundo quando aplicável: identidade do mundo, regiões e geografia, vida cotidiana, economia e logística, magia/tecnologia, facções e poderes, perigos e oportunidades, acontecimentos em andamento e locais iniciais possíveis.
- ${isRealWorld ? 'Mundo Real: assuma instituições, geografia, infraestrutura, leis e cotidiano do mundo real contemporâneo ou histórico pertinente.' : 'Não force categorias que não combinam com o cenário (ex: não force magia em ficção científica pura, nem impérios em um ermo isolado).'}
- Use o cenário como FONTE ABSOLUTA DE VERDADE. Expanda com profundidade e coerência.
- PROIBIÇÕES RÍGIDAS: 
  - NÃO crie personagem do jogador, nem mencione "o jogador".
  - NÃO defina classe, personalidade, destino, missões predestinadas ou profecia de salvador.
  - NÃO crie companheiros (companions) obrigatórios.
  - Evite nomes clichês genéricos de fantasia se não pertencerem ao gênero.

Retorne EXATAMENTE UM JSON object com os seguintes campos (strings descrevendo as áreas):
- identityAndState: Identidade e estado atual do mundo (1-2 parágrafos).
- geography: Geografia e regiões relevantes do mundo conhecido.
- everydayLife: Vida cotidiana e cultura dos habitantes comuns.
- magicAndTechnology: Magia, ciência e/ou tecnologia deste universo.
- economyAndLogistics: Economia, comércio e logística de recursos.
- factionsAndPower: Facções, organizações e estruturas de poder.
- dangersAndOpportunities: Perigos predominantes e oportunidades para aventureiros/exploradores.
- currentEvents: Acontecimentos ou tensões recentes em andamento no mundo.
`;
}

function buildFocusedPrompt(scenario: ScenarioOption, options?: GenerateFoundationOptions): string {
  const isRealWorld = options?.worldBasis === 'real_world';
  
  const geoGuideline = (isRealWorld)
    ? `\nDIRETRIZ GEOGRÁFICA (EUA COMO PADRÃO):\nSe o cenário ou premissa não mencionar explicitamente outro país, assuma que a história se passa nos Estados Unidos. Crie nomes de cidades, bairros, instituições, profissões e elementos do cotidiano condizentes com a realidade sociogeográfica americana. Se outro país for mencionado na premissa ou cenário, respeite-o.\n`
    : '';

  return `
Você é um especialista em Worldbuilding e Cenários Narrativos Focados.
Sua tarefa é expandir o cenário fornecido para criar a "Foundation" (Fundação) de um CENÁRIO FOCADO.

BASE DO UNIVERSO: ${isRealWorld ? 'BASEADO NO MUNDO REAL (cidades, hospitais, empresas, universidades, bairros e situações realistas cotidianas; SEM magia ou tecnologias fantásticas)' : 'FICCIONAL (liberdade para fantasia, sci-fi ou universos fictícios)'}

CENÁRIO ESCOLHIDO (CENÁRIO FOCADO):
Título: ${scenario.title}
Gênero: ${scenario.genre}
Identidade: ${scenario.worldIdentity}
Descrição: ${scenario.description}
Local Inicial / Ponto de Partida: ${scenario.startingLocation}
Tom: ${scenario.tone || 'Neutro'}
${options?.premise ? `Premissa Fornecida: ${options.premise}` : ''}
${geoGuideline}
DIRETRIZES CRÍTICAS PARA CENÁRIO FOCADO:
- Priorize a escala humana/local: contexto da premissa, ambiente social imediato, locais realmente relevantes, rotina e vida cotidiana, elenco/NPCs necessários, relações pré-existentes quando fizer sentido, circunstâncias atuais, conflitos e tensões naturais, oportunidades para desenvolvimento e acontecimentos paralelos do mundo.
- ${isRealWorld ? 'Mundo Real: utilize dinâmicas interpessoais autênticas, rotinas profissionais, acadêmicas ou comunitárias realistas.' : ''}
- IMPORTANTE:
  * Cenário Focado NÃO é uma história linear nem um roteiro pré-escrito.
  * NPCs são indivíduos autônomos com suas próprias rotinas, desejos e personalidades.
  * O mundo continua existindo e respirando além da premissa imediata.
  * NÃO forçar D20, quests artificiais, guerras de facções épicas ou magia se o cenário for contemporâneo, slice-of-life, romance, drama ou investigação íntima.
  * Romance ou drama interpessoal NUNCA deve virar roteiro predeterminado.
  * NÃO criar companion obrigatório.
  * NÃO definir ações, pensamentos, personalidade ou destino do jogador.

Retorne EXATAMENTE UM JSON object com os seguintes campos (strings descrevendo as áreas no contexto focado):
- identityAndState: Contexto da premissa e atmosfera social atual.
- geography: O ambiente social principal e os locais específicos realmente relevantes para a convivência.
- everydayLife: Rotina, estilo de vida e costumes cotidianos das pessoas nesse círculo.
- magicAndTechnology: As regras da realidade, convenções sociais e tecnologia do dia a dia (sem forçar magia em cenários realistas).
- economyAndLogistics: Circunstâncias práticas imediatas, trabalho, sustento e recursos no cotidiano.
- factionsAndPower: Elenco de NPCs chave, pequenos círculos sociais, figuras locais e relações pré-existentes relevantes.
- dangersAndOpportunities: Conflitos, atritos interpessoais e tensões naturais, acompanhados de oportunidades de desenvolvimento.
- currentEvents: Acontecimentos recentes no ambiente e eventos paralelos que ocorrem no restante do mundo.
`;
}

export async function generateFoundation(
  scenario: ScenarioOption,
  options?: GenerateFoundationOptions
): Promise<FoundationDetails> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey.trim() === '' || apiKey === 'MY_GEMINI_API_KEY') {
    return getProceduralFoundation(scenario, options);
  }

  const isFocused = options?.format === 'focused';

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const prompt = isFocused
      ? buildFocusedPrompt(scenario, options)
      : buildSandboxPrompt(scenario, options);

    const modelChain = getModelChain('WORLD_GENERATION');

    for (const model of modelChain) {
      try {
        const response = await withTimeout(
          ai.models.generateContent({
            model,
            contents: prompt,
            config: {
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.OBJECT,
                description: isFocused ? 'Focused Scenario Foundation details' : 'World Foundation details',
                properties: {
                  identityAndState: { type: Type.STRING },
                  geography: { type: Type.STRING },
                  everydayLife: { type: Type.STRING },
                  magicAndTechnology: { type: Type.STRING },
                  economyAndLogistics: { type: Type.STRING },
                  factionsAndPower: { type: Type.STRING },
                  dangersAndOpportunities: { type: Type.STRING },
                  currentEvents: { type: Type.STRING },
                },
                required: [
                  'identityAndState',
                  'geography',
                  'everydayLife',
                  'magicAndTechnology',
                  'economyAndLogistics',
                  'factionsAndPower',
                  'dangersAndOpportunities',
                  'currentEvents'
                ],
              },
            },
          }),
          16000,
          `Foundation generation timed out on model ${model} (16s)`
        );

        const rawText = response.text?.trim() || '';
        if (rawText) {
          const parsed = JSON.parse(rawText);
          if (parsed.identityAndState && parsed.geography) {
            logModelExecution({
              functionExecuted: `WORLD_GENERATION/generateFoundation[${isFocused ? 'FOCUSED' : 'SANDBOX'}]`,
              modelAttempted: model,
              modelSucceeded: model,
            });
            return {
              identityAndState: String(parsed.identityAndState),
              geography: String(parsed.geography),
              everydayLife: String(parsed.everydayLife),
              magicAndTechnology: String(parsed.magicAndTechnology),
              economyAndLogistics: String(parsed.economyAndLogistics),
              factionsAndPower: String(parsed.factionsAndPower),
              dangersAndOpportunities: String(parsed.dangersAndOpportunities),
              currentEvents: String(parsed.currentEvents),
            };
          }
        }
      } catch (modelErr) {
        const summarized = summarizeApiError(modelErr);
        logModelExecution({
          functionExecuted: `WORLD_GENERATION/generateFoundation[${isFocused ? 'FOCUSED' : 'SANDBOX'}]`,
          modelAttempted: model,
          fallbackUsed: true,
          summarizedError: `${summarized.errorType}: ${summarized.message}`,
        });
      }
    }
  } catch (genErr) {
    console.info('[FoundationGenerator] Modelos remotos indisponíveis, acionando gerador procedural.');
  }

  return getProceduralFoundation(scenario, options);
}
