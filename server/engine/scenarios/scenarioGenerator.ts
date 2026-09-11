/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, Type } from '@google/genai';
import { getModelChain, summarizeApiError, logModelExecution } from '../modelPolicy';

export interface ScenarioOption {
  id: string;
  title: string;
  genre: string;
  worldIdentity: string;
  description: string;
  startingLocation: string;
  tone?: string;
  themeTags?: string[];
  premise?: string;
  setting?: string;
  coreConflict?: string;
  core_conflict?: string;
}

export interface GuidedPremiseInput {
  focus?: 'romance' | 'drama' | 'investigation' | 'adventure' | 'survival' | 'intrigue' | string;
  dynamics?: string;
  lifeStage?: string;
  socioeconomic?: string;
  location?: string;
  customLocation?: string;
  realism?: string;
  additionalDetails?: string;
}

export interface GenerateScenariosOptions {
  format?: 'sandbox' | 'focused';
  worldBasis?: 'real_world' | 'fictional';
  premise?: string;
  guidedPremise?: GuidedPremiseInput;
}

export interface ExtractedConstraints {
  originalPremise: string;
  hasHighSchool: boolean;
  hasUniversity: boolean;
  hasMiddleClass: boolean;
  hasElite: boolean;
  hasUSA: boolean;
  hasBrazil: boolean;
  hasJapan: boolean;
  hasEurope: boolean;
  hasEnemiesToLovers: boolean;
  hasFriendsToLovers: boolean;
  hasForcedProximity: boolean;
  hasRomance: boolean;
  hasRomanceFocus: boolean;
  hasInvestigation: boolean;
  hasMedievalFantasy: boolean;
  hasMerchant: boolean;
  hasPortCity: boolean;
  hasSciFi: boolean;
  hasHospital: boolean;
  hasJournalism: boolean;
  focus?: string;
  locationName?: string;
}

export function normalizePremiseInput(
  input?: string | GuidedPremiseInput,
  options?: { worldBasis?: 'real_world' | 'fictional'; format?: 'sandbox' | 'focused' }
): {
  premiseText: string;
  constraints: ExtractedConstraints;
  guidedData?: GuidedPremiseInput;
} {
  if (!input) {
    return {
      premiseText: '',
      constraints: extractPremiseConstraints(''),
    };
  }

  if (typeof input === 'string') {
    const trimmed = input.trim();
    return {
      premiseText: trimmed,
      constraints: extractPremiseConstraints(trimmed),
    };
  }

  // Objeto estruturado GuidedPremiseInput
  const g = input;
  const parts: string[] = [];

  const focusMap: Record<string, string> = {
    romance: 'Romance',
    drama: 'Drama Cotidiano & Conflitos Pessoais',
    investigation: 'Investigação e Mistério',
    adventure: 'Aventura e Exploração',
    survival: 'Sobrevivência e Desafio',
    intrigue: 'Intriga e Relações de Poder',
  };

  const dynamicsMap: Record<string, string> = {
    enemies_to_lovers: 'Rivais a amantes (Enemies to lovers com rivalidade inicial e atrito)',
    friends_to_lovers: 'Amigos de infância / longa data (Friends to lovers)',
    forced_proximity: 'Proximidade forçada / Parceria de trabalho ou estudo obrigatória',
    convenience: 'Aliança / Parceria de conveniência',
    second_chance: 'Reencontro do passado / Segundas chances',
    forbidden_love: 'Círculos sociais ou interesses opostos (Amor proibido)',
    slow_burn: 'Convivência cotidiana e desenvolvimento gradual',
    rivalry: 'Rivalidade e competição declarada',
    professional_rivalry: 'Rivalidade profissional / acadêmica por vaga ou projeto',
    unsolved_case: 'Caso não resolvido / Apuração de segredos locais',
    new_beginning: 'Herança / Recomeço em novo ambiente',
    strangers: 'Encontro de estranhos em circunstâncias incomuns',
    expedition: 'Expedição arriscada a território desconhecido',
    power_struggle: 'Disputa de influência e liderança',
    isolation: 'Sobrevivência e cooperação em isolamento',
  };

  const lifeStageMap: Record<string, string> = {
    high_school: 'Ensino Médio (High School / 15-18 anos)',
    university: 'Universidade / Campus (College / 18-24 anos)',
    college: 'Faculdade / Campus universitário',
    young_adult: 'Jovens Adultos / Início de carreira (20-30 anos)',
    adult: 'Vida Adulta / Profissionais',
    career_adult: 'Adultos / Carreira consolidada (30-50 anos)',
    small_town: 'Comunidade local / Pequena cidade',
    metropolis: 'Metrópole urbana contemporânea',
  };

  const socioeconomicMap: Record<string, string> = {
    working_class: 'classe trabalhadora / vida modesta',
    middle_class: 'classe média / subúrbio residencial',
    upper_middle_class: 'classe média-alta / profissionais liberais',
    elite: 'elite / alta sociedade',
    varied: 'diversidade socioeconômica',
  };

  const locationMap: Record<string, string> = {
    usa: 'Estados Unidos (EUA)',
    brazil: 'Brasil',
    japan: 'Japão',
    europe: 'Europa',
    uk_europe: 'Reino Unido / Europa',
    fictional: 'Mundo Ficcional',
    surprise: 'Surpreenda-me na localização',
  };

  const realismMap: Record<string, string> = {
    realistic: 'Realista / Contemporâneo',
    grounded: 'Realista e Pé no chão',
    atmospheric_mystery: 'Realista com atmosfera de mistério',
    light_fantasy: 'Fantasia leve',
    full_fiction: 'Ficcional completo',
  };

  if (g.focus && focusMap[g.focus]) parts.push(`Foco: ${focusMap[g.focus]}`);
  else if (g.focus) parts.push(`Foco: ${g.focus}`);

  if (g.dynamics && dynamicsMap[g.dynamics]) parts.push(`Dinâmica: ${dynamicsMap[g.dynamics]}`);
  else if (g.dynamics) parts.push(`Dinâmica: ${g.dynamics}`);

  if (g.lifeStage && lifeStageMap[g.lifeStage]) parts.push(`Contexto: ${lifeStageMap[g.lifeStage]}`);
  else if (g.lifeStage) parts.push(`Contexto: ${g.lifeStage}`);

  if (g.socioeconomic && socioeconomicMap[g.socioeconomic]) parts.push(`Ambiente social: ${socioeconomicMap[g.socioeconomic]}`);
  else if (g.socioeconomic) parts.push(`Ambiente social: ${g.socioeconomic}`);

  if (g.customLocation && g.customLocation.trim()) {
    if (g.location === 'brazil' && !/brasil/i.test(g.customLocation)) {
      parts.push(`Localização: ${g.customLocation.trim()}, Brasil`);
    } else if (g.location === 'japan' && !/jap[aã]o|japan/i.test(g.customLocation)) {
      parts.push(`Localização: ${g.customLocation.trim()}, Japão`);
    } else {
      parts.push(`Localização: ${g.customLocation.trim()}`);
    }
  } else if (g.location && g.location !== 'surprise' && locationMap[g.location]) {
    parts.push(`Localização: ${locationMap[g.location]}`);
  }

  if (g.realism && realismMap[g.realism]) parts.push(`Tom: ${realismMap[g.realism]}`);
  else if (g.realism) parts.push(`Tom: ${g.realism}`);

  if (g.additionalDetails && g.additionalDetails.trim()) {
    parts.push(`Detalhes adicionais: ${g.additionalDetails.trim()}`);
  }

  const generatedPremiseText = parts.join(', ');
  const constraints = extractPremiseConstraints(generatedPremiseText);

  // Forçar flags estruturadas explicitamente com base no input guiado
  if (g.lifeStage === 'high_school') constraints.hasHighSchool = true;
  if (g.lifeStage === 'university' || g.lifeStage === 'college') constraints.hasUniversity = true;
  if (g.socioeconomic === 'middle_class' || g.socioeconomic === 'upper_middle_class') constraints.hasMiddleClass = true;
  if (g.socioeconomic === 'elite') constraints.hasElite = true;
  if (g.location === 'usa') {
    constraints.hasUSA = true;
    constraints.hasBrazil = false;
    constraints.hasJapan = false;
    constraints.hasEurope = false;
  }
  if (g.location === 'brazil' || (g.customLocation && /brasil|curitiba|são paulo|rio/i.test(g.customLocation))) {
    constraints.hasBrazil = true;
    constraints.hasUSA = false;
    constraints.hasJapan = false;
  }
  if (g.location === 'japan' || (g.customLocation && /japão|japan|tóquio|tokyo/i.test(g.customLocation))) {
    constraints.hasJapan = true;
    constraints.hasUSA = false;
    constraints.hasBrazil = false;
  }
  if (g.location === 'europe' || g.location === 'uk_europe') {
    constraints.hasEurope = true;
    constraints.hasUSA = false;
  }
  if (g.dynamics === 'enemies_to_lovers') constraints.hasEnemiesToLovers = true;
  if (g.dynamics === 'friends_to_lovers') constraints.hasFriendsToLovers = true;
  if (g.dynamics === 'forced_proximity') constraints.hasForcedProximity = true;
  if (g.focus === 'romance') {
    constraints.hasRomance = true;
    constraints.hasRomanceFocus = true;
  }
  if (g.focus === 'investigation') {
    constraints.hasInvestigation = true;
  }
  if (g.focus) constraints.focus = g.focus;

  return {
    premiseText: generatedPremiseText,
    constraints,
    guidedData: g,
  };
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
 * Cenários procedurais de alta qualidade para fallback imediato quando a API Gemini
 * estiver indisponível ou sem chave configurada no ambiente.
 */
const PROCEDURAL_SANDBOX_PRESETS: ScenarioOption[][] = [
  [
    {
      id: 'scen_dark_fantasy',
      title: 'A Fronteira das Cinzas Eternas',
      genre: 'Dark Fantasy & Sobrevivência',
      worldIdentity: 'Ruínas góticas, magia decadente e noites perpétuas sob uma lua fraturada.',
      premise: 'Sobrevivência e exploração em um reino devastado por uma névoa mágica que corrompe memórias.',
      setting: 'Reino de Pedra-Negra, fortalezas isoladas protegidas por faróis de chama estelar.',
      coreConflict: 'Faróis estelares estão se apagando e guildas de mineradores disputam os últimos fragmentos de pedra pura contra criaturas da névoa.',
      description: 'Um reino ancestral devastado por uma névoa mágica que consome memórias e corrompe as leis da física. As cidades remanescentes sobrevivem protegidas por gigantescos faróis de chama estelar.',
      startingLocation: 'O Último Baluarte de Pedra-Negra',
      tone: 'Sombrio, misterioso e épico',
      themeTags: ['Mundo Aberto', 'Névoa Corrosiva', 'Sobrevivência'],
    },
    {
      id: 'scen_cyber_solar',
      title: 'Neon Valles: O Subsolo de Titã',
      genre: 'Cyberpunk & Ficção Científica',
      worldIdentity: 'Colônia subterrânea vertical escavada no gelo de Titã, governada por sindicatos hidropônicos e contrabandistas de oxigênio.',
      premise: 'Disputa de sobrevivência e poder no subterrâneo gelado da lua de Titã.',
      setting: 'Complexo subterrâneo Neon Valles, níveis criogênicos e distritos hidropônicos.',
      coreConflict: 'Megacorporações de terraformação cortaram a cota de oxigênio do setor operário, deflagrando sabotagens contra os dutos térmicos.',
      description: 'Entre labirintos de tubulações congeladas e mercados clandestinos iluminados por mercúrio líquido, facções corporativas e insurgentes disputam o controle do reator geotérmico central.',
      startingLocation: 'Distrito Submerso 07 (Nível Criogênico)',
      tone: 'Distópico, tenso e acelerado',
      themeTags: ['Megacorporações', 'Subterrâneo', 'Exploração Livre'],
    },
    {
      id: 'scen_mythic_ocean',
      title: 'O Mar das Mil Tempestades',
      genre: 'Alta Fantasia & Exploração Naval',
      worldIdentity: 'Arquipélagos flutuantes e correntes marinhas mágicas povoadas por leviatãs e ruínas da Primeira Era.',
      premise: 'Navegação e expedições místicas através de rotas marítimas e arquipélagos desconhecidos.',
      setting: 'Arquipélago dos Ventos Cruzados, atóis de coral luminoso e canais fluviais aéreos.',
      coreConflict: 'As marés arcanas estão engolindo as rotas de comércio tradicionais, forçando capitães e exploradores a desbravar recifes proibidos.',
      description: 'Um mundo onde os continentes se partiram em milhares de ilhas místicas ligadas por rotas celestes e marítimas. Navegadores e exploradores buscam as Chaves do Firmamento para impedir que as marés engulam o restante das terras.',
      startingLocation: 'Porto dos Ventos Cruzados',
      tone: 'Aventureiro, deslumbrante e mitológico',
      themeTags: ['Navegação', 'Ilhas Voadoras', 'Mistérios Oceânicos'],
    },
  ],
];

const PROCEDURAL_REAL_SANDBOX_PRESETS: ScenarioOption[][] = [
  [
    {
      id: 'scen_real_arctic',
      title: 'Expedição Paralelo 78: Calotas de Svalbard',
      genre: 'Sobrevivência Realista & Exploração Polar',
      worldIdentity: 'Ermos árticos implacáveis, estações de pesquisa isoladas e noites polares de meses sob o magnetismo da aurora.',
      premise: 'Trabalho de campo e exploração científica extrema no arquipélago ártico norueguês.',
      setting: 'Longyearbyen e geleiras de Svalbard, Noruega (estações de pesquisa e minas desativadas).',
      coreConflict: 'Uma tempestade polar bloqueia o reabastecimento marítimo da base e pesquisadores precisam resgatar instrumentos de campo vitais em terreno instável.',
      description: 'Nos confins do Mar da Noruega, uma equipe de especialistas e aventureiros navega fiordes congelados e minas abandonadas. Recursos limitados, clima extremo e rotas marítimas imprevisíveis exigem planejamento rigoroso.',
      startingLocation: 'Base Científica de Longyearbyen',
      tone: 'Realista, desafiador e imersivo',
      themeTags: ['Mundo Real', 'Sobrevivência Ártica', 'Exploração Livre'],
    },
    {
      id: 'scen_real_megacity',
      title: 'Metrópole Sem Fim: As Rotas do Porto de Santos',
      genre: 'Investigação Urbana & Operações Reais',
      worldIdentity: 'Complexo portuário monumental, armazéns alfandegários, tráfego pesado e redes de comércio internacional.',
      premise: 'Disputas logísticas, fiscalização aduaneira e apurações no maior porto da América Latina.',
      setting: 'Cais e armazéns aduaneiros de Santos, São Paulo.',
      coreConflict: 'Cargas não declaradas retidas na alfândega geram atritos imediatos entre operadores logísticos, sindicatos portuários e fiscais da Receita Federal.',
      description: 'Entre o vaivém de cargueiros transatlânticos e avenidas industriais, empresas de logística, agentes federais e sindicatos disputam contratos e rotas estratégicas em um ecossistema urbano autêntico.',
      startingLocation: 'Cais do Armazém 12',
      tone: 'Urbano, dinâmico e realista',
      themeTags: ['Mundo Real', 'Logística Global', 'Mundo Aberto Urbano'],
    },
    {
      id: 'scen_real_amazon',
      title: 'Trilhas do Alto Xingu: Fronteira Fluvial',
      genre: 'Expedição Geográfica & Sobrevivência em Selva',
      worldIdentity: 'Bacia fluvial densa, comunidades ribeirinhas, postos de fiscalização ambiental e rotas de barco a motor.',
      premise: 'Mapeamento fluvial e apoio a comunidades isoladas na floresta amazônica.',
      setting: 'Bacia do Alto Xingu, postos fluviais e canais de várzea no Mato Grosso/Pará.',
      coreConflict: 'A seca sazonal baixa os leitos fluviais e isola postos médicos, exigindo rotas arriscadas por igarapés pouco documentados.',
      description: 'Uma vasta região de rios caudalosos e floresta tropical preservada onde a navegação e o conhecimento do terreno determinam o sucesso de qualquer viagem, expedição científica ou trabalho de campo.',
      startingLocation: 'Vila Fluvial de Porto Esperança',
      tone: 'Autêntico, contemplativo e aventureiro',
      themeTags: ['Mundo Real', 'Expedição Fluvial', 'Ermos Reais'],
    },
  ],
];

const PROCEDURAL_FOCUSED_PRESETS: ScenarioOption[][] = [
  [
    {
      id: 'scen_focused_conclave',
      title: 'O Conclave dos Sete Espelhos',
      genre: 'Intriga Nobiliárquica & Fantasia Política',
      worldIdentity: 'Palácio de vidro e mármore suspenso sobre uma garganta tempestuosa, repleto de embaixadores mascarados e segredos perigosos.',
      premise: 'Investigação diplomática e disputa de poder após a misteriosa petrificação do Grande Chanceler.',
      setting: 'Palácio Solar da Garganta dos Murmúrios, câmara das dinastias e galerias de audiência.',
      coreConflict: 'Três casas nobiliárquicas rivais acusam umas às outras pelo crime enquanto tentam forçar uma votação de emergência para assumir a regência.',
      description: 'Durante a assembleia anual dos herdeiros da dinastia solar, o Grande Chanceler foi encontrado petrificado em sua câmara privada. Tensões entre as três grandes casas nobiliárquicas ameaçam explodir em conflito aberto nas próximas semanas.',
      startingLocation: 'A Galeria dos Murmúrios do Palácio Solar',
      tone: 'Tenso, diplomático e sofisticado',
      themeTags: ['Intriga Política', 'Relações de Poder', 'Mistério de Corte'],
    },
  ],
];

const PROCEDURAL_REAL_FOCUSED_PRESETS: ScenarioOption[][] = [
  [
    {
      id: 'scen_real_hospital',
      title: 'Plantão Noturno: Hospital Universitário Central',
      genre: 'Drama Humano & Medicina de Emergência',
      worldIdentity: 'Pronto-socorro movimentado no centro metropolitano, sirenes, corredores clínicos e rotinas de alta pressão.',
      premise: 'Rotina de alta intensidade médica e dilemas profissionais no pronto-socorro de um grande hospital universitário.',
      setting: 'Chicago, Illinois - Pronto-socorro do Hospital Universitário Central.',
      coreConflict: 'Superlotação de leitos e divergência clínica aguda entre a chefia cirúrgica e os médicos plantonistas sobre um protocolo de emergência.',
      description: 'Durante uma das noites mais movimentadas do ano, médicos residentes, enfermeiros, chefes de equipe e pacientes transitam por dilemas éticos, diagnósticos urgentes e decisões imediatas sob escassez de leitos.',
      startingLocation: 'Recepção da Emergência do Hospital Central',
      tone: 'Realista, intenso e empático',
      themeTags: ['Mundo Real', 'Relações Profissionais', 'Dilemas Éticos'],
    },
    {
      id: 'scen_real_journalism',
      title: 'A Redação do Correio da Tarde',
      genre: 'Jornalismo Investigativo & Drama Social',
      worldIdentity: 'Redação de jornal tradicional no centro histórico, telefones tocando, prazos de fechamento e arquivos confidenciais.',
      premise: 'Investigação jornalística sobre fraudes em contratos públicos enfrentando prazos e pressões editoriais.',
      setting: 'Boston, Massachusetts - Redação central do Correio da Tarde.',
      coreConflict: 'A diretoria do jornal quer adiar uma matéria investigativa crucial por causa de patrocinadores enquanto os repórteres precisam confirmar uma fonte antes do fechamento.',
      description: 'Uma apuração sobre irregularidades em obras públicas coloca repórteres, editores e fontes anônimas em cheque diante de pressões editoriais, prazos iminentes e dilemas sobre o interesse público.',
      startingLocation: 'Mesa de Pauta da Redação Principal',
      tone: 'Crível, investigativo e dinâmico',
      themeTags: ['Mundo Real', 'Investigação', 'Tensão Profissional'],
    },
    {
      id: 'scen_real_neighborhood',
      title: 'Bairro Santa Tereza: As Portas da Cidade Velha',
      genre: 'Slice of Life & Conflito Comunitário',
      worldIdentity: 'Bairro tradicional de ruas de paralelepípedo, comércio familiar, ateliês e moradores com histórias entrelaçadas.',
      premise: 'Dilema comunitário entre a preservação cultural de uma vizinhança histórica e um megaprojeto imobiliário.',
      setting: 'Bairro histórico de Santa Tereza, praças, pequenos cafés e ateliês locais.',
      coreConflict: 'A associação de moradores entra em atrito com investidores imobiliários que compraram imóveis tombados para demolição comercial.',
      description: 'O anúncio de um projeto imobiliário de grande porte divide os antigos moradores, pequenos comerciantes e novos residentes da vizinhança entre a preservação cultural e a promessa de revitalização.',
      startingLocation: 'A Praça Central e o Café da Esquina',
      tone: 'Cotidiano, caloroso e relacional',
      themeTags: ['Mundo Real', 'Comunidade', 'Relações Sociais'],
    },
  ],
];

export function cleanOutputText(text?: string): string {
  if (!text) return '';
  return String(text)
    .replace(/<svg[^>]*>.*?<\/svg>/gi, '')
    .replace(/^\[?svg\]?[:\s\-_]*/i, '')
    .replace(/^svg\s+/i, '')
    .trim();
}

export function extractPremiseConstraints(premise?: string): ExtractedConstraints {
  if (!premise || !premise.trim()) {
    return {
      originalPremise: '',
      hasHighSchool: false,
      hasUniversity: false,
      hasMiddleClass: false,
      hasElite: false,
      hasUSA: false,
      hasBrazil: false,
      hasJapan: false,
      hasEurope: false,
      hasEnemiesToLovers: false,
      hasFriendsToLovers: false,
      hasForcedProximity: false,
      hasRomance: false,
      hasRomanceFocus: false,
      hasInvestigation: false,
      hasMedievalFantasy: false,
      hasMerchant: false,
      hasPortCity: false,
      hasSciFi: false,
      hasHospital: false,
      hasJournalism: false,
    };
  }

  const lower = premise.toLowerCase();

  const hasHighSchool = /\b(high\s*school|ensino\s*m[eé]dio|colegial|escola\s*secund[aá]ria|secundarista)\b/i.test(lower);
  const hasUniversity = /\b(universit[aá]ri[ao]|faculdade|college|campus|gradua[çc][aã]o|p[oó]s-gradua[çc][aã]o|doutorado|mestrado)\b/i.test(lower);
  const hasMiddleClass = /\b(classe\s*m[eé]dia|classe-m[eé]dia|sub[uú]rbi[ao]|suburbano|fam[ií]lia\s*trabalhadora)\b/i.test(lower);
  const hasElite = /\b(elite|classe\s*alta|milion[aá]ri[ao]|bilion[aá]ri[ao]|herdeir[ao]|aristocracia|mans[aã]o)\b/i.test(lower);
  const hasUSA = /\b(eua|estados\s*unidos|usa|united\s*states|am[eé]rica|norte-american[ao]|chicago|texas|austin|calif[oó]rnia|boston|illinois|new\s*york|nova\s*york|seattle)\b/i.test(lower);
  const hasBrazil = /\b(brasil|brazil|brasileir[ao]|s[aã]o\s*paulo|rio\s*de\s*janeiro|curitiba|porto\s*alegre|salvador|recife|florian[oó]polis|belo\s*horizonte|minas\s*gerais|bahia)\b/i.test(lower);
  const hasJapan = /\b(jap[aã]o|japan|t[oó]quio|tokyo|kyoto|quioto|osaka|japones[ae])\b/i.test(lower);
  const hasEurope = /\b(europa|europe|reino\s*unido|uk|londres|london|inglaterra|fran[çc]a|paris|it[aá]lia|roma|espanha|madrid|alemanha|berlim)\b/i.test(lower);
  const hasEnemiesToLovers = /\b(enemies\s*to\s*lovers|inimigos\s*a\s*amantes|de\s*inimigos\s*a\s*amantes|rivais\s*a\s*amantes|inimigos\s*para\s*amantes|de\s*inimigos\s*para\s*amantes|rivalidade\s*inicial)\b/i.test(lower);
  const hasFriendsToLovers = /\b(friends\s*to\s*lovers|amigos\s*a\s*amantes|amigos\s*de\s*inf[aâ]ncia|amizade\s*de\s*longa\s*data)\b/i.test(lower);
  const hasForcedProximity = /\b(proximidade\s*for[çc]ada|parceria\s*obrigat[oó]ria|trabalho\s*em\s*dupla|dupla\s*obrigat[oó]ria|forced\s*proximity)\b/i.test(lower);
  const hasRomance = /\b(romance|rom[aâ]ntic[ao]|lovers|namor[ao]|casal|paix[aã]o|afeto|relacionamento\s*amoroso)\b/i.test(lower) || hasEnemiesToLovers || hasFriendsToLovers;
  const hasRomanceFocus = /\b(romance|lovers|enemies\s*to\s*lovers|friends\s*to\s*lovers)\b/i.test(lower);
  const hasInvestigation = /\b(investiga[çc][aã]o|mist[eé]rio|caso|apuração|perícia|detetive)\b/i.test(lower);
  const hasMedievalFantasy = /\b(fantasia\s*medieval|medieval\s*fantasy|medieval|idade\s*m[eé]dia|feudo|feudal|castelo|cavaleiro)\b/i.test(lower);
  const hasMerchant = /\b(mercador|comerciante|merchant|com[eé]rcio|guilda\s*mercantil|caravana|emporio|emp[oó]rio)\b/i.test(lower);
  const hasPortCity = /\b(cidade\s*portu[aá]ria|porto|portu[aá]ri[ao]|port\s*city|cais|ba[ií]a|costeir[ao]|mar[ií]tim[ao])\b/i.test(lower);
  const hasSciFi = /\b(sci-fi|fic[çc][aã]o\s*cient[ií]fica|espa[çc]o|asteroide|col[oó]nia\s*espacial|cyberpunk)\b/i.test(lower);
  const hasHospital = /\b(hospital|m[eé]dic[ao]|pronto-socorro|cirurgi[aã]o|cl[ií]nica)\b/i.test(lower);
  const hasJournalism = /\b(jornal|jornalism[ao]|redac[çc][aã]o|rep[oó]rter|investiga[çc][aã]o\s*jornal[ií]stica)\b/i.test(lower);

  return {
    originalPremise: premise,
    hasHighSchool,
    hasUniversity,
    hasMiddleClass,
    hasElite,
    hasUSA,
    hasBrazil,
    hasJapan,
    hasEurope,
    hasEnemiesToLovers,
    hasFriendsToLovers,
    hasForcedProximity,
    hasRomance,
    hasRomanceFocus,
    hasInvestigation,
    hasMedievalFantasy,
    hasMerchant,
    hasPortCity,
    hasSciFi,
    hasHospital,
    hasJournalism,
  };
}

/**
 * Valida programaticamente se um cenário gerado respeita os constraints explícitos da premissa original.
 */
export function validateScenarioConstraints(
  scenario: ScenarioOption,
  constraints: ExtractedConstraints
): { isValid: boolean; reason?: string } {
  if (!constraints.originalPremise) {
    return { isValid: true };
  }

  const text = `${scenario.title} ${scenario.genre} ${scenario.worldIdentity} ${scenario.premise || ''} ${scenario.setting || ''} ${scenario.description} ${scenario.startingLocation} ${scenario.coreConflict || ''} ${(scenario.themeTags || []).join(' ')}`.toLowerCase();

  // 1. Constraint: High School
  if (constraints.hasHighSchool) {
    const matchesSchool = /\b(high\s*school|escola|ensino\s*m[eé]dio|colegial|estudante|alun[ao]|gr[eê]mio|professor|sala\s*de\s*aula|recreio|formatura|vestibular|aula)\b/i.test(text);
    const matchesCorporateOrAdult = /\b(advocaci[ao]|s[oó]cio\s*s[eê]nior|cirurgi[aã]o|pronto-socorro|megacorpora[çc][aã]o|firma\s*de\s*arquitetura|doutorado|p[oó]s-gradua[çc][aã]o|empresa\s*de\s*tecnologia)\b/i.test(text);

    if (!matchesSchool || matchesCorporateOrAdult) {
      return { isValid: false, reason: 'High school violado: cenário ambientado fora do contexto escolar' };
    }
  }

  // 2. Constraint: USA / Estados Unidos
  if (constraints.hasUSA && !constraints.hasBrazil && !constraints.hasJapan) {
    const matchesUSA = /\b(eua|estados\s*unidos|usa|illinois|texas|chicago|austin|ohio|calif[oó]rnia|new\s*york|nova\s*york|massachusetts|boston|new\s*jersey|florida|fl[oó]rida|washington|seattle|georgia|atlanta|michigan|colorado|connecticut|pennsylvania|indiana|oregon|portland|minnesota|wisconsin|maine)\b/i.test(text);
    if (!matchesUSA) {
      return { isValid: false, reason: 'EUA violado: localização fora dos Estados Unidos' };
    }
  }

  // 2.1 Constraint: Brasil
  if (constraints.hasBrazil) {
    const matchesBrazil = /\b(brasil|brazil|s[aã]o\s*paulo|rio\s*de\s*janeiro|curitiba|porto\s*alegre|salvador|recife|florian[oó]polis|belo\s*horizonte|minas|paran[aá]|ga[uú]ch[ao]|brasileir[ao]|paulist[ao]|carioca)\b/i.test(text);
    if (!matchesBrazil) {
      return { isValid: false, reason: 'Brasil violado: localização fora do Brasil' };
    }
  }

  // 2.2 Constraint: Japão
  if (constraints.hasJapan) {
    const matchesJapan = /\b(jap[aã]o|japan|t[oó]quio|tokyo|kyoto|osaka|shibuya|shinjuku|japones[ae])\b/i.test(text);
    if (!matchesJapan) {
      return { isValid: false, reason: 'Japão violado: localização fora do Japão' };
    }
  }

  // 3. Constraint: Classe média (não pode ser mansões bilionárias a menos que explicitamente pedido elite)
  if (constraints.hasMiddleClass && !constraints.hasElite) {
    const matchesBillionaireElite = /\b(bilion[aá]ri[ao]|super-ricos|mans[aã]o\s*de\s*luxo|iate\s*privad[ao]|dinastia\s*milion[aá]ria|herdeiros\s*da\s*alta\s*sociedade)\b/i.test(text);
    if (matchesBillionaireElite) {
      return { isValid: false, reason: 'Classe média violado: cenário ambientado em elite multimilionária' };
    }
  }

  // 4. Constraint: Fantasia Medieval
  if (constraints.hasMedievalFantasy) {
    const matchesModern = /\b(computador|celular|smartphone|internet|carro|avi[aã]o|arranha-c[eé]u|neon|sat[eé]lite|submarino\s*nuclear)\b/i.test(text);
    if (matchesModern) {
      return { isValid: false, reason: 'Fantasia medieval violado: elementos modernos detectados' };
    }
  }

  // 5. Constraint: Protagonista Mercador
  if (constraints.hasMerchant) {
    const matchesTrade = /\b(mercador|com[eé]rcio|comerciante|mercadoria|guilda|caravana|emporio|emp[oó]rio|venda|cargas|feiras?|moedas?|rotas?\s*comercia(l|is)|tributos?|fretes?)\b/i.test(text);
    if (!matchesTrade) {
      return { isValid: false, reason: 'Protagonista mercador violado: falta contexto comercial/mercantil' };
    }
  }

  // 6. Constraint: Cidade Portuária
  if (constraints.hasPortCity) {
    const matchesPort = /\b(porto|portu[aá]ri[ao]|cais|mar[ií]tim[ao]|ba[ií]a|costeir[ao]|ancoradouro|navio|docas?|mar[eé]s?|oceano|embarca[çc][oõ]es)\b/i.test(text);
    if (!matchesPort) {
      return { isValid: false, reason: 'Cidade portuária violado: falta contexto portuário/marítimo' };
    }
  }

  return { isValid: true };
}

let presetIndex = 0;

/**
 * Gerador procedural inteligente de cenários baseado na premissa do usuário.
 * Preserva 100% dos constraints explícitos (high school, classe média, EUA, fantasia medieval, etc.)
 * e diversifica apenas as circunstâncias, sem inventar romances forçados ou retirar requisitos.
 */
export function generateProceduralPremiseScenarios(
  premise: string,
  options?: GenerateScenariosOptions
): ScenarioOption[] {
  const isFocused = options?.format === 'focused';
  const isRealWorld = options?.worldBasis === 'real_world';
  const constraints = extractPremiseConstraints(premise);
  const timestamp = Date.now();

  // 1. High School (Ensino Médio) + EUA / Classe Média / Enemies to Lovers
  if (constraints.hasHighSchool) {
    return [
      {
        id: `scen_hs_oakridge_${timestamp}_1`,
        title: 'A Disputa do Grêmio em Oakridge',
        genre: 'Drama Escolar & Romance de Ensino Médio',
        worldIdentity: 'Subúrbio residencial de classe média em Illinois, escola pública tradicional, armários metálicos e reuniões estudantis após a aula.',
        premise: 'Dois estudantes dedicados de famílias trabalhadoras que disputam a liderança do grêmio estudantil são obrigados a organizar juntos o festival anual de primavera.',
        setting: 'Oakridge High School, subúrbio de classe média de Chicago, Illinois.',
        coreConflict: 'Após um empate na eleição para presidente do grêmio, a diretoria exige que os dois rivais compartilhem a comissão organizadora para não cancelar as verbas dos clubes escolares.',
        description: 'Nos corredores movimentados de uma escola pública de subúrbio em Illinois, dois alunos com visões opostas sobre as prioridades do último ano travam uma rivalidade acirrada por notas e cartas de recomendação, enfrentando a pressão familiar para conseguir bolsas em faculdades estaduais.',
        startingLocation: 'Sala do Grêmio Estudantil após o sinal da última aula',
        tone: 'Competitivo, sarcástico e dinâmico',
        themeTags: ['High School', 'Enemies to Lovers', 'Classe Média', 'EUA'],
      },
      {
        id: `scen_hs_westlake_${timestamp}_2`,
        title: 'O Laboratório de Westlake',
        genre: 'Drama de Ensino Médio & Competição Juvenil',
        worldIdentity: 'Escola de bairro arborizado em Austin, laboratórios de ciências, oficinas de robótica e tardes quentes de estudo coletivo.',
        premise: 'Dois competidores acadêmicos históricos são colocados como dupla obrigatória na feira regional de ciências valendo vaga no campeonato estadual.',
        setting: 'Austin, Texas - Westlake High School e feira regional de ciências.',
        coreConflict: 'O professor de química impõe o trabalho em dupla entre os dois maiores rivais da turma, ameaçando reprová-los na nota prática caso não apresentem um protótipo funcional integrado.',
        description: 'Em uma escola pública de classe média no Texas, dois adolescentes com metodologias de estudo totalmente conflitantes precisam dividir a bancada do laboratório pós-aula para construir um projeto conjunto, enquanto os amigos de ambos acompanham a disputa diária de argumentos.',
        startingLocation: 'Laboratório de Química 3B da Westlake High durante o horário de estudo pós-aula',
        tone: 'Espirituoso, tenso e envolvente',
        themeTags: ['High School', 'Ciências', 'Enemies to Lovers', 'Texas'],
      },
      {
        id: `scen_hs_maplewood_${timestamp}_3`,
        title: 'A Pauta do Tribuno de Maplewood',
        genre: 'Drama Juvenil & Romance Contemporâneo',
        worldIdentity: 'Cidade de subúrbio em Nova Jersey, redação do jornal escolar com computadores antigos, teatro da escola e arquibancadas de futebol americano.',
        premise: 'O editor do jornal da escola e a diretora do clube de teatro entram em confronto após uma crítica ácida sobre a peça do semestre.',
        setting: 'Maplewood, New Jersey - Maplewood High School e redação do jornal estudantil.',
        coreConflict: 'A direção escolar condiciona a verba dos dois clubes a uma cobertura colaborativa dos bastidores da produção artística, forçando a convivência diária dos dois líderes estudantis.',
        description: 'No ambiente agitado de uma escola tradicional de bairro em New Jersey, o atrito público entre o redator do jornal e a organizadora das artes cênicas obriga os dois jovens de classe média a negociarem horários de ensaio e entrevistas exclusivas sem cederem um milímetro de suas convicções.',
        startingLocation: 'Sala da Redação do Jornal Escolar ao lado do auditório principal',
        tone: 'Irônico, tenso e autêntico',
        themeTags: ['High School', 'Jornal Escolar', 'Enemies to Lovers', 'Nova Jersey'],
      },
    ];
  }

  // 2. Fantasia Medieval + Mercador / Comércio / Cidade Portuária
  if (constraints.hasMedievalFantasy && (constraints.hasMerchant || constraints.hasPortCity)) {
    return [
      {
        id: `scen_med_portosal_${timestamp}_1`,
        title: 'O Empório de Porto-do-Sal',
        genre: 'Fantasia Medieval & Comércio Marítimo',
        worldIdentity: 'Cidade portuária de muralhas de pedra calcária, docas de madeira cobertas de salitre, armazéns alfandegários e feiras de especiarias marinhas.',
        premise: 'Gestão de uma casa de comércio naval em expansão disputando licenças da frota mercantil real e rotas marítimas seguras.',
        setting: 'Cais dos Três Mastros e Entreposto Aduaneiro de Porto-do-Sal.',
        coreConflict: 'A guilda oficial de navegadores impôs uma taxa extraordinária sobre cargas independentes, forçando mercadores a negociar alianças arriscadas com armadores e capitães livres.',
        description: 'No maior porto comercial da costa oriental, comerciantes, capitães de caravela e cobradores de impostos da coroa disputam a compra de carregamentos de especiarias e madeira naval, enquanto rumores de bloqueios navais no estreito ameaçam fechar as rotas de exportação.',
        startingLocation: 'Balcão de pesagem da Feira Livre do Cais Velho',
        tone: 'Pragmático, negociador e expansivo',
        themeTags: ['Fantasia Medieval', 'Mercador', 'Cidade Portuária', 'Comércio'],
      },
      {
        id: `scen_med_enseada_${timestamp}_2`,
        title: 'As Docas da Enseada Negra',
        genre: 'Fantasia Medieval & Negócios Fluviais',
        worldIdentity: 'Baía costeira com estaleiros rústicos, tavernas de pescadores, barcaças de carga e entrepostos mercantis de pedras preciosas.',
        premise: 'Condução de rotas de suprimentos e contratos de frete entre o litoral e as fortalezas do interior em tempos de trégua frágil.',
        setting: 'Enseada das Marés e armazéns da Companhia Fluvial de Val-Frio.',
        coreConflict: 'Um consórcio de nobres proprietários de minas ameaça cancelar os contratos de transporte caso as mercadorias continuem sofrendo atrasos nos pontos de pedágio costeiro.',
        description: 'Em uma baía mercantil movimentada onde desembocam os grandes rios continentais, mercadores independentes e donos de armazéns equilibram negociações financeiras, abastecimento de armadas e disputas por monopólios de carga.',
        startingLocation: 'Escritório de fretes da Companhia Marítima, sobre a água do ancoradouro',
        tone: 'Tenso, rústico e mercantil',
        themeTags: ['Fantasia Medieval', 'Cidade Portuária', 'Rotas de Carga', 'Guildas'],
      },
      {
        id: `scen_med_valmarinho_${timestamp}_3`,
        title: 'A Feira das Velas Livres',
        genre: 'Fantasia Feudal & Economia Portuária',
        worldIdentity: 'Distrito mercantil construído sobre pontões de carvalho, feiras de tecidos arcanos, alfândegas do conde e ancoradouros profundos.',
        premise: 'Um mercador em ascensão tenta estabelecer um entreposto permanente na feira portuária sem ceder às exigências abusivas do bailio local.',
        setting: 'Distrito das Velas e Praça da Balança de Val-Marinho.',
        coreConflict: 'O bailio municipal ameaça confiscar os armazéns da orla se os mercadores não pagarem um tributo adiantado antes da chegada da grande frota de outono.',
        description: 'Entre o barulho de cordames e o vaivém de carregadores de carga, armadores e mercadores negociam contratos de importação e tentam formar uma liga comercial independente para proteger suas mercadorias contra a tirania tributária dos lordes costeiros.',
        startingLocation: 'Pátio da Balança Real no centro da Feira das Velas',
        tone: 'Estratégico, dinâmico e medieval',
        themeTags: ['Fantasia Medieval', 'Porto', 'Mercador', 'Negociação'],
      },
    ];
  }

  // 3. Cenários ambientados no Brasil
  if (constraints.hasBrazil) {
    return [
      {
        id: `scen_brazil_curitiba_${timestamp}_1`,
        title: 'O Coletivo do Batel: Curitiba Urbana',
        genre: 'Drama Contemporâneo & Relações Urbanas',
        worldIdentity: 'Curitiba de parques frios, cafés do Batel, ruas de paralelepípedo de São Francisco e polos de inovação tecnológica.',
        premise: 'Disputa de projetos e convivência em um estúdio colaborativo de arquitetura e design no centro cívico.',
        setting: 'Curitiba, Paraná, Brasil - Bairro Batel e Centro Histórico de São Francisco.',
        coreConflict: 'Dois profissionais com métodos e históricos divergentes precisam liderar juntos o projeto de revitalização de uma antiga fábrica têxtil.',
        description: 'Entre manhãs enevoadas nos parques e noites movimentadas no bairro Batel, jovens arquitetos e urbanistas equilibram prazos rigorosos, disputas de autoria e debates acalorados sobre o futuro do espaço urbano.',
        startingLocation: 'Mesa de desenho do estúdio colaborativo no Batel',
        tone: 'Elegante, realista e relacional',
        themeTags: ['Brasil', 'Curitiba', 'Relações', 'Mundo Real'],
      },
      {
        id: `scen_brazil_sp_${timestamp}_2`,
        title: 'Luzes da Paulista: Noite e Apuração',
        genre: 'Jornalismo Investigativo & Drama Paulistano',
        worldIdentity: 'São Paulo de arranha-céus na Avenida Paulista, cafés 24h na Consolação, trânsito incessante e redações de grandes portais.',
        premise: 'Apuração conjunta de um esquema de especulação em patrimônios históricos tombados na região central de São Paulo.',
        setting: 'São Paulo, SP, Brasil - Avenida Paulista, Consolação e Centro Velho.',
        coreConflict: 'Um repórter investigativo veterano e uma jovem analista de dados precisam checar fontes anônimas antes de uma audiência pública decisiva.',
        description: 'No ritmo frenético da maior metrópole do país, jornalistas e pesquisadores enfrentam pressões corporativas e prazos implacáveis enquanto desvendam interesses ocultos por trás de leilões imobiliários no centro histórico.',
        startingLocation: 'Redação de jornal na Avenida Paulista, vista para o vão do MASP',
        tone: 'Ágil, urbano e tenso',
        themeTags: ['São Paulo', 'Brasil', 'Investigação', 'Mundo Real'],
      },
      {
        id: `scen_brazil_rio_${timestamp}_3`,
        title: 'As Ondas do Arpoador: O Ateliê da Zona Sul',
        genre: 'Slice of Life & Conflito Artístico',
        worldIdentity: 'Rio de Janeiro de brisa do mar em Ipanema, ateliês em Santa Teresa, livrarias de rua e noites boêmias.',
        premise: 'Gestão compartilhada de uma galeria independente de fotografia e artes visuais à beira-mar.',
        setting: 'Rio de Janeiro, RJ, Brasil - Arpoador, Ipanema e ladeiras de Santa Teresa.',
        coreConflict: 'Dois curadores com visões artísticas opostas tentam evitar o despejo da galeria organizando uma mostra comemorativa em menos de um mês.',
        description: 'Sob o sol do litoral carioca e a atmosfera cultural de Santa Teresa, artistas e gestores culturais negociam com colecionadores e enfrentam a especulação imobiliária para manter viva uma galeria independente.',
        startingLocation: 'Terraço da galeria de arte no Arpoador com vista para o mar',
        tone: 'Solar, autêntico e expressivo',
        themeTags: ['Rio de Janeiro', 'Brasil', 'Cultura', 'Mundo Real'],
      },
    ];
  }

  // 3.1 Cenários ambientados no Japão
  if (constraints.hasJapan) {
    return [
      {
        id: `scen_japan_tokyo_${timestamp}_1`,
        title: 'Noites de Shibuya: O Gabinete Privado',
        genre: 'Investigação Urbana & Suspense Noturno',
        worldIdentity: 'Tóquio de cruzamentos iluminados por neon, becos com lanternas de papel em Shinjuku e escritórios em arranha-céus de vidro.',
        premise: 'Investigação sobre o sumiço repentino de arquivos confidenciais em uma consultoria internacional.',
        setting: 'Tóquio, Japão - Shibuya, Shinjuku e distrito de negócios de Marunouchi.',
        coreConflict: 'Dois auditores independentes com abordagens de trabalho opostas são forçados a compartilhar o mesmo escritório e interrogar executivos suspeitos.',
        description: 'Entre o vaivém de multidões nas estações e a quietude dos templos escondidos no meio dos arranha-céus, especialistas em investigação apuram pistas discretas enquanto navegam a etiqueta e as pressões corporativas de Tóquio.',
        startingLocation: 'Escritório no 14º andar em Shibuya com vista para a estação',
        tone: 'Contemplativo, metropolitano e intrigante',
        themeTags: ['Japão', 'Tóquio', 'Investigação', 'Mundo Real'],
      },
      {
        id: `scen_japan_kyoto_${timestamp}_2`,
        title: 'As Oficinas de Gion: Kyoto Tradicional',
        genre: 'Drama de Tradição & Restauração',
        worldIdentity: 'Kyoto de ruas de madeira em Gion, jardins de pedra zen, oficinas de tecelagem e ateliês de cerâmica centenários.',
        premise: 'Restauração de peças históricas e preservação de uma tradicional casa de artesãos ameaçada de venda.',
        setting: 'Kyoto, Japão - Distrito de Gion e templos históricos de Higashiyama.',
        coreConflict: 'O mestre artesão e uma jovem designer contemporânea entram em atrito sobre modernizar ou preservar as técnicas seculares da família.',
        description: 'Nas margens serenas do rio Kamo e entre os pátios de casarões antigos, artesãos e pesquisadores buscam equilíbrio entre o rigor das técnicas ancestrais japonesas e as demandas de um mercado global em transformação.',
        startingLocation: 'Ateliê de madeira e cerâmica nos fundos de uma machiya em Gion',
        tone: 'Profundo, calmo e detalhista',
        themeTags: ['Japão', 'Kyoto', 'Arte', 'Tradição'],
      },
      {
        id: `scen_japan_osaka_${timestamp}_3`,
        title: 'Os Canais de Dotonbori: A Cozinha de Osaka',
        genre: 'Drama Culinário & Negócios Noturnos',
        worldIdentity: 'Osaka de canais reluzentes, mercados gastronômicos barulhentos, placas luminosas gigantes e hospitalidade calorosa.',
        premise: 'Competição gastronômica e gestão de um restaurante tradicional nas ruelas de Dotonbori.',
        setting: 'Osaka, Japão - Ruelas de Dotonbori e mercado de peixes de Kuromon.',
        coreConflict: 'Dois chefs rivais disputam a preferência do júri de um guia internacional sem perder a clientela de bairro.',
        description: 'No centro da capital gastronômica do Japão, cozinheiros e fornecedores navegam a agitação dos mercados matinais e o calor das cozinhas abertas, defendendo suas receitas originais contra franquias comerciais.',
        startingLocation: 'Balcão de preparo do restaurante à beira do canal de Dotonbori',
        tone: 'Enérgico, caloroso e dinâmico',
        themeTags: ['Japão', 'Osaka', 'Culinária', 'Mundo Real'],
      },
    ];
  }

  // 3.2 Romance Corporativo / Adultos / Direito / Medicina (quando NÃO for High School)
  if (
    constraints.hasEnemiesToLovers ||
    constraints.hasElite ||
    premise.toLowerCase().includes('advocacia') ||
    premise.toLowerCase().includes('corporativo')
  ) {
    return [
      {
        id: `scen_romance_boston_${timestamp}_1`,
        title: 'Rivalidade em Beacon Hill',
        genre: 'Romance Contemporâneo & Drama Corporativo',
        worldIdentity: 'Boston de prédios de tijolos vermelhos, escritórios de advocacia de elite, clubes náuticos e reuniões de gala de caridade.',
        premise: 'Dois advogados brilhantes de famílias tradicionais e rivais disputam a liderança de uma prestigiosa fundação filantrópica.',
        setting: 'Boston, Massachusetts - Bairro de Beacon Hill e escritórios da Financial District.',
        coreConflict: 'Ambos foram colocados como co-responsáveis pelo mesmo caso pro bono de grande visibilidade, com históricos de atrito desde a faculdade de Direito.',
        description: 'Em meio a escritórios de alto padrão e jantares beneficentes em Beacon Hill, dois jovens advogados de famílias influentes e historicamente rivais são forçados a cooperar na gestão de um fundo milionário, disputando a cadeira de sócio sênior enquanto mantêm as aparências perante a elite local.',
        startingLocation: 'Sala de reuniões principal do escritório na State Street, 28º andar',
        tone: 'Competitivo, sarcástico e tenso',
        themeTags: ['Enemies to Lovers', 'Classe Média-Alta', 'Advocacia', 'Boston'],
      },
      {
        id: `scen_romance_chicago_${timestamp}_2`,
        title: 'Disputa Cirúrgica no Northwestern',
        genre: 'Drama Médico & Romance Rival',
        worldIdentity: 'Chicago de ventos frios, hospitais universitários de referência mundial, cafeterias de plantão e apartamentos em Gold Coast.',
        premise: 'Dois cirurgiões de famílias influentes disputam a chefia da clínica cirúrgica pediátrica.',
        setting: 'Chicago, Illinois - Hospital Memorial Northwestern e região de Streeterville.',
        coreConflict: 'A chefia do hospital exige que ambos dividam o mesmo laboratório de pesquisa e aprovem em conjunto os novos procedimentos cirúrgicos.',
        description: 'No centro médico de alta tecnologia de Chicago, dois médicos ambiciosos travam uma disputa velada por prestígio acadêmico e reconhecimento familiar, sendo obrigados a compartilhar turnos de emergência e publicar um artigo científico conjunto.',
        startingLocation: 'Laboratório de Pesquisa Clínica do Hospital Northwestern, Ala Sul',
        tone: 'Intenso, dinâmico e provocativo',
        themeTags: ['Enemies to Lovers', 'Medicina', 'Chicago', 'Competição'],
      },
      {
        id: `scen_romance_california_${timestamp}_3`,
        title: 'O Conflito de Cypress Point',
        genre: 'Drama Imobiliário & Romance Costeiro',
        worldIdentity: 'Costa de Carmel e Monterey na Califórnia, galerias de arte, arquitetura costeira e clubes de golfe exclusivos.',
        premise: 'Dois arquitetos com conceitos opostos disputam o projeto de expansão do clube náutico da baía.',
        setting: 'Carmel-by-the-Sea / Monterey, Califórnia - Distrito costeiro e marinas privadas.',
        coreConflict: 'Um deles defende modernização comercial sustentável, enquanto o outro lidera a preservação histórica do condomínio.',
        description: 'Nas colinas arborizadas e praias exclusivas de Carmel, designers de famílias tradicionais entram em choque após a compra de um terreno compartilhado na orla, onde antigas desavenças e visões opostas tornam cada audiência um duelo de ideias.',
        startingLocation: 'Galeria do Clube Náutico de Cypress Point durante o coquetel de abertura',
        tone: 'Elegante, irônico e envolvente',
        themeTags: ['Enemies to Lovers', 'Califórnia', 'Arquitetura', 'Costa'],
      },
    ];
  }

  // 4. Mistério Universitário / Campus / Investigação Realista
  if (constraints.hasUniversity) {
    return [
      {
        id: `scen_univ_yale_${timestamp}_1`,
        title: 'O Arquivo da Biblioteca Sterling',
        genre: 'Mistério Acadêmico & Investigação Realista',
        worldIdentity: 'Campus universitário histórico, bibliotecas monumentais, arquivos raros e repúblicas tradicionais.',
        premise: 'Investigação do sumiço inexplicável de um bolsista de pós-graduação e de relatórios confidenciais sobre doações institucionais.',
        setting: 'New Haven, Connecticut - Campus Universitário e Biblioteca de Obras Raras.',
        coreConflict: 'A reitoria tenta abafar o caso para não afastar patronos enquanto amigos e pesquisadores buscam as últimas anotações deixadas pelo estudante.',
        description: 'Nas vésperas da semana de exames em uma das universidades mais antigas do país, o desaparecimento repentino de um pesquisador bolsista expõe segredos institucionais e anotações guardadas nos cofres da biblioteca histórica.',
        startingLocation: 'Sala de estudos do subsolo da Biblioteca Central de Pesquisa',
        tone: 'Misterioso, erudito e realista',
        themeTags: ['Investigação', 'Campus', 'Universidade', 'Mundo Real'],
      },
      {
        id: `scen_univ_mit_${timestamp}_2`,
        title: 'O Enigma do Laboratório Kendall',
        genre: 'Suspense Tecnológico & Apuração Forense',
        worldIdentity: 'Cambridge de laboratórios de tecnologia aplicada, incubadoras de startups e centros de inovação.',
        premise: 'Apuração do furto de dados de pesquisa quântica de um centro de ponta antes do registro de patente internacional.',
        setting: 'Cambridge, Massachusetts - Kendall Square e laboratórios de tecnologia aplicada.',
        coreConflict: 'A segurança corporativa suspeita de membros da equipe de doutorado, gerando desconfiança mútua entre pesquisadores outrora inseparáveis.',
        description: 'Após a invasão física de um servidor isolado no polo de biotecnologia e engenharia, pesquisadores e auditores externos correm contra o tempo para descobrir quem transferiu o código confidencial.',
        startingLocation: 'Bancada do Laboratório de Sistemas Avançados na Kendall Square',
        tone: 'Ágil, analítico e tenso',
        themeTags: ['Tecnologia', 'Investigação', 'Cambridge', 'Suspense'],
      },
      {
        id: `scen_univ_dartmouth_${timestamp}_3`,
        title: 'O Caso do Grêmio de Hanover',
        genre: 'Drama de Campus & Investigação Privada',
        worldIdentity: 'Cidade universitária de inverno no norte, alojamentos de madeira e clubes esportivos tradicionais.',
        premise: 'Investigação discreta sobre um incidente grave ocorrido na cabana de inverno da associação atlética.',
        setting: 'Hanover, New Hampshire - Cabana de campo nas montanhas e alojamentos do campus.',
        coreConflict: 'Testemunhas relutam em depor por lealdade à equipe esportiva, enquanto pistas contraditórias colocam a diretoria do grêmio sob suspeita.',
        description: 'Em meio ao isolamento do inverno em New Hampshire, uma denúncia anônima obriga a apuração interna de eventos ocorridos durante uma celebração privada de atletas veteranos.',
        startingLocation: 'Sede da Associação Atlética de Hanover, sala dos troféus',
        tone: 'Frio, claustrofóbico e tenso',
        themeTags: ['Mistério', 'Clube Universitário', 'Inverno', 'Mundo Real'],
      },
    ];
  }

  // 4. Cenários ambientados no Brasil
  if (constraints.hasBrazil) {
    return [
      {
        id: `scen_brazil_curitiba_${timestamp}_1`,
        title: 'O Coletivo do Batel: Curitiba Urbana',
        genre: 'Drama Contemporâneo & Relações Urbanas',
        worldIdentity: 'Curitiba de parques frios, cafés do Batel, ruas de paralelepípedo de São Francisco e polos de inovação tecnológica.',
        premise: 'Disputa de projetos e convivência em um estúdio colaborativo de arquitetura e design no centro cívico.',
        setting: 'Curitiba, Paraná, Brasil - Bairro Batel e Centro Histórico de São Francisco.',
        coreConflict: 'Dois profissionais com métodos e históricos divergentes precisam liderar juntos o projeto de revitalização de uma antiga fábrica têxtil.',
        description: 'Entre manhãs enevoadas nos parques e noites movimentadas no bairro Batel, jovens arquitetos e urbanistas equilibram prazos rigorosos, disputas de autoria e debates acalorados sobre o futuro do espaço urbano.',
        startingLocation: 'Mesa de desenho do estúdio colaborativo no Batel',
        tone: 'Elegante, realista e relacional',
        themeTags: ['Brasil', 'Curitiba', 'Relações', 'Mundo Real'],
      },
      {
        id: `scen_brazil_sp_${timestamp}_2`,
        title: 'Luzes da Paulista: Noite e Apuração',
        genre: 'Jornalismo Investigativo & Drama Paulistano',
        worldIdentity: 'São Paulo de arranha-céus na Avenida Paulista, cafés 24h na Consolação, trânsito incessante e redações de grandes portais.',
        premise: 'Apuração conjunta de um esquema de especulação em patrimônios históricos tombados na região central de São Paulo.',
        setting: 'São Paulo, SP, Brasil - Avenida Paulista, Consolação e Centro Velho.',
        coreConflict: 'Um repórter investigativo veterano e uma jovem analista de dados precisam checar fontes anônimas antes de uma audiência pública decisiva.',
        description: 'No ritmo frenético da maior metrópole do país, jornalistas e pesquisadores enfrentam pressões corporativas e prazos implacáveis enquanto desvendam interesses ocultos por trás de leilões imobiliários no centro histórico.',
        startingLocation: 'Redação de jornal na Avenida Paulista, vista para o vão do MASP',
        tone: 'Ágil, urbano e tenso',
        themeTags: ['São Paulo', 'Brasil', 'Investigação', 'Mundo Real'],
      },
      {
        id: `scen_brazil_rio_${timestamp}_3`,
        title: 'As Ondas do Arpoador: O Ateliê da Zona Sul',
        genre: 'Slice of Life & Conflito Artístico',
        worldIdentity: 'Rio de Janeiro de brisa do mar em Ipanema, ateliês em Santa Teresa, livrarias de rua e noites boêmias.',
        premise: 'Gestão compartilhada de uma galeria independente de fotografia e artes visuais à beira-mar.',
        setting: 'Rio de Janeiro, RJ, Brasil - Arpoador, Ipanema e ladeiras de Santa Teresa.',
        coreConflict: 'Dois curadores com visões artísticas opostas tentam evitar o despejo da galeria organizando uma mostra comemorativa em menos de um mês.',
        description: 'Sob o sol do litoral carioca e a atmosfera cultural de Santa Teresa, artistas e gestores culturais negociam com colecionadores e enfrentam a especulação imobiliária para manter viva uma galeria independente.',
        startingLocation: 'Terraço da galeria de arte no Arpoador com vista para o mar',
        tone: 'Solar, autêntico e expressivo',
        themeTags: ['Rio de Janeiro', 'Brasil', 'Cultura', 'Mundo Real'],
      },
    ];
  }

  // 4.1 Cenários ambientados no Japão
  if (constraints.hasJapan) {
    return [
      {
        id: `scen_japan_tokyo_${timestamp}_1`,
        title: 'Noites de Shibuya: O Gabinete Privado',
        genre: 'Investigação Urbana & Suspense Noturno',
        worldIdentity: 'Tóquio de cruzamentos iluminados por neon, becos com lanternas de papel em Shinjuku e escritórios em arranha-céus de vidro.',
        premise: 'Investigação sobre o sumiço repentino de arquivos confidenciais em uma consultoria internacional.',
        setting: 'Tóquio, Japão - Shibuya, Shinjuku e distrito de negócios de Marunouchi.',
        coreConflict: 'Dois auditores independentes com abordagens de trabalho opostas são forçados a compartilhar o mesmo escritório e interrogar executivos suspeitos.',
        description: 'Entre o vaivém de multidões nas estações e a quietude dos templos escondidos no meio dos arranha-céus, especialistas em investigação apuram pistas discretas enquanto navegam a etiqueta e as pressões corporativas de Tóquio.',
        startingLocation: 'Escritório no 14º andar em Shibuya com vista para a estação',
        tone: 'Contemplativo, metropolitano e intrigante',
        themeTags: ['Japão', 'Tóquio', 'Investigação', 'Mundo Real'],
      },
      {
        id: `scen_japan_kyoto_${timestamp}_2`,
        title: 'As Oficinas de Gion: Kyoto Tradicional',
        genre: 'Drama de Tradição & Restauração',
        worldIdentity: 'Kyoto de ruas de madeira em Gion, jardins de pedra zen, oficinas de tecelagem e ateliês de cerâmica centenários.',
        premise: 'Restauração de peças históricas e preservação de uma tradicional casa de artesãos ameaçada de venda.',
        setting: 'Kyoto, Japão - Distrito de Gion e templos históricos de Higashiyama.',
        coreConflict: 'O mestre artesão e uma jovem designer contemporânea entram em atrito sobre modernizar ou preservar as técnicas seculares da família.',
        description: 'Nas margens serenas do rio Kamo e entre os pátios de casarões antigos, artesãos e pesquisadores buscam equilíbrio entre o rigor das técnicas ancestrais japonesas e as demandas de um mercado global em transformação.',
        startingLocation: 'Ateliê de madeira e cerâmica nos fundos de uma machiya em Gion',
        tone: 'Profundo, calmo e detalhista',
        themeTags: ['Japão', 'Kyoto', 'Arte', 'Tradição'],
      },
      {
        id: `scen_japan_osaka_${timestamp}_3`,
        title: 'Os Canais de Dotonbori: A Cozinha de Osaka',
        genre: 'Drama Culinário & Negócios Noturnos',
        worldIdentity: 'Osaka de canais reluzentes, mercados gastronômicos barulhentos, placas luminosas gigantes e hospitalidade calorosa.',
        premise: 'Competição gastronômica e gestão de um restaurante tradicional nas ruelas de Dotonbori.',
        setting: 'Osaka, Japão - Ruelas de Dotonbori e mercado de peixes de Kuromon.',
        coreConflict: 'Dois chefs rivais disputam a preferência do júri de um guia internacional sem perder a clientela de bairro.',
        description: 'No centro da capital gastronômica do Japão, cozinheiros e fornecedores navegam a agitação dos mercados matinais e o calor das cozinhas abertas, defendendo suas receitas originais contra franquias comerciais.',
        startingLocation: 'Balcão de preparo do restaurante à beira do canal de Dotonbori',
        tone: 'Enérgico, caloroso e dinâmico',
        themeTags: ['Japão', 'Osaka', 'Culinária', 'Mundo Real'],
      },
    ];
  }

  // 4.2 Sandbox Medieval / Feudal
  if (constraints.hasMedievalFantasy) {
    return [
      {
        id: `scen_med_pontes_${timestamp}_1`,
        title: 'O Ducado das Três Pontes',
        genre: 'Sandbox Medieval & Intriga Feudal',
        worldIdentity: 'Vales fluviais com pontes de pedágio fortificadas, feiras de lã, mosteiros nas colinas e vilas de camponeses organizadas.',
        premise: 'Disputa de rotas mercantis e jurisdição de pedágio entre dois baronatos rivais às margens do Rio Cinzento.',
        setting: 'Bacia do Rio Cinzento, feudos de Ponte-Alta e Mosteiro de Santa Brígida.',
        coreConflict: 'O Duque faleceu sem herdeiro direto e os barões locais começaram a cobrar taxas dobradas sobre carroças mercantis, ameaçando a segurança das feiras.',
        description: 'Em um vale fértil cortado por rotas de comércio fluviais, nobres locais, guildas de barqueiros e ordens monásticas disputam o controle das passagens fortificadas enquanto mercenários e viajantes buscam trabalho nas guarnições de fronteira.',
        startingLocation: 'Pátio da Estalagem da Ponte Velha, junto ao posto de pedágio',
        tone: 'Pragmático, histórico e expansivo',
        themeTags: ['Medieval', 'Comércio Feudal', 'Mundo Aberto', 'Sandbox'],
      },
      {
        id: `scen_med_minas_${timestamp}_2`,
        title: 'As Minas da Serra Quebrada',
        genre: 'Sobrevivência Medieval & Economia de Fronteira',
        worldIdentity: 'Montanhas escarpadas ricas em ferro e prata, forjas a carvão, trilhas de mulas e povoados mineiros rudes.',
        premise: 'Exploração de jazidas minerais em uma cordilheira remota disputada por consórcios de forjadores e a coroa.',
        setting: 'Serra Quebrada, vilarejo de Forja-Baixa e minas das fendas altas.',
        coreConflict: 'A chegada de coletores de impostos reais com soldados armados deflagra greves entre mineradores e forjadores independentes.',
        description: 'Nos contrafortes de uma cadeia montanhosa rica em minérios, aventureiros, ferreiros e forasteiros negociam proteção, ferramentas e contratos de escolta em um ambiente rústico onde a lei da montanha prevalece sobre os decretos reais.',
        startingLocation: 'Praça da Fundição de Forja-Baixa',
        tone: 'Áspero, desafiador e realista',
        themeTags: ['Mineração', 'Fronteira Feudal', 'Sandbox'],
      },
      {
        id: `scen_med_bosque_${timestamp}_3`,
        title: 'A Charneca dos Cavaleiros Renegados',
        genre: 'Aventura Medieval & Exploração',
        worldIdentity: 'Charnecas brumosas, torreões de vigia em ruínas, bosques de carvalhos e estradas antigas de peregrinação.',
        premise: 'Exploração e sobrevivência em uma vasta terra de ninguém entre dois reinos que firmaram trégua recente.',
        setting: 'Charnecas de Valdor e ruínas da Fortaleza dos Três Cisnes.',
        coreConflict: 'Ex-combatentes sem terra e companhias livres formaram pequenos bandos armados que controlam passos estratégicos e exigem resgates.',
        description: 'Uma vasta extensão de charnecas e fortalezas arruinadas serve de refúgio para viajantes, comerciantes e veteranos de guerra que buscam recomeçar ou conquistar suas próprias terras à margem dos tratados da corte.',
        startingLocation: 'Acampamento da Encruzilhada dos Peregrinos',
        tone: 'Aventureiro, rústico e livre',
        themeTags: ['Exploração', 'Cavaleiros', 'Mundo Aberto'],
      },
    ];
  }

  // 6. Ficção Científica / Espaço / Asteroides
  if (constraints.hasSciFi) {
    return [
      {
        id: `scen_scifi_ceres_${timestamp}_1`,
        title: 'O Cinturão de Mineração de Ceres',
        genre: 'Ficção Científica Hard & Sobrevivência Espacial',
        worldIdentity: 'Estações tubulares pressurizadas escavadas em rocha de asteroides, trajes de vácuo reforçados, reatores de fusão e manobras orbitais calculadas.',
        premise: 'Rotina de extração de água e metais raros em asteroides enfrentando racionamento severo e quebras de contrato corporativo.',
        setting: 'Complexo de Mineração Ceres-4 e docas de acoplagem orbital.',
        coreConflict: 'A corporação transportadora atrasou os módulos de purificação de oxigênio, forçando a tripulação a decidir entre paralisar a produção ou negociar com contrabandistas do cinturão.',
        description: 'Nos confins do cinturão de asteroides, mineradores e engenheiros de voo operam sondas de perfuração em gravidade zero sob constante vigilância de inteligências de auditoria corporativa e escassez de suprimentos vitais.',
        startingLocation: 'Eclusa de descompressão do Módulo Operacional 03 em Ceres',
        tone: 'Claustrofóbico, técnico e realista',
        themeTags: ['Ficção Científica', 'Espaço', 'Mineração', 'Hard Sci-Fi'],
      },
      {
        id: `scen_scifi_ganymede_${timestamp}_2`,
        title: 'Domos Hidropônicos de Ganimedes',
        genre: 'Sci-Fi Colonial & Intriga Corporativa',
        worldIdentity: 'Cidades sob cúpulas translúcidas na lua joviana, campos agrícolas verticais iluminados por radiação ultravioleta e trens maglev no gelo.',
        premise: 'Gestão de biossistemas e abastecimento alimentar para as colônias exteriores do sistema solar.',
        setting: 'Ganimedes, Domo Agrícola New Leyden e rede de transporte criogênico.',
        coreConflict: 'Uma contaminação na safra principal de algas nutritivas gera suspeitas de sabotagem entre bioengenheiros concorrentes.',
        description: 'Na maior lua de Júpiter, pesquisadores agrícolas, operadores de logística e colonos mantêm o delicado equilíbrio dos domos alimentares que sustentam milhões de vidas em estações vizinhas.',
        startingLocation: 'Centro de Controle Ambiental do Domo New Leyden',
        tone: 'Científico, tenso e imersivo',
        themeTags: ['Colônia Espacial', 'Biotecnologia', 'Júpiter'],
      },
      {
        id: `scen_scifi_lagrange_${timestamp}_3`,
        title: 'Estação de Trânsito Lagrange 4',
        genre: 'Sci-Fi Espacial & Hub Comercial',
        worldIdentity: 'Estação rotacional de gravidade artificial em formato toroidal, hangares repletos de cargueiros, alfândegas e docas mecânicas.',
        premise: 'Manutenção, contrabando e operações logísticas no principal ponto de conexão entre a Terra e as colônias externas.',
        setting: 'Ponto Lagrange L4 Terra-Lua, Estação Nexus Orbital.',
        coreConflict: 'Uma greve dos estivadores espaciais bloqueia o desembarque de peças de reposição críticas para cargueiros em quarentena.',
        description: 'Um polo comercial monumental em órbita onde frotas cargueiras, pilotos independentes e agentes governamentais cruzam caminhos em meio a docas mecânicas e restaurantes com vista para a curvatura da Terra.',
        startingLocation: 'Concourse Central de Passageiros, Nível Gravidade 0.8g',
        tone: 'Cosmopolita, acelerado e dinâmico',
        themeTags: ['Estação Espacial', 'Comércio Orbital', 'Mundo Aberto'],
      },
    ];
  }

  // 7. Premissa Geral / Vaga / Recomeço e Ambição
  return [
    {
      id: `scen_vague_ny_${timestamp}_1`,
      title: 'O Bistrô da Rua 9: Greenwich Village',
      genre: 'Drama Culinário & Negócios Urbanos',
      worldIdentity: 'Nova York de cozinhas industriais aquecidas, salões intimistas de tijolos aparentes, fornecedores locais e críticos gastronômicos afiados.',
      premise: 'Recuperação e relançamento de um restaurante tradicional em Manhattan sob forte concorrência e especulação imobiliária.',
      setting: 'Nova York, NY - West Village e mercado de alimentos de Chelsea.',
      coreConflict: 'O novo proprietário precisa renovar o cardápio e manter as contas no azul em 90 dias antes que o senhorio rescinda o contrato de aluguel.',
      description: 'Nas ruas arborizadas do West Village, sócios, chefs e garçons enfrentam a pressão implacável do mercado gastronômico nova-iorquino para reerguer um estabelecimento icônico sem perder a autenticidade.',
      startingLocation: 'Cozinha principal do Bistrô durante o pré-preparo do almoço',
      tone: 'Ágil, dinâmico e focado em superação',
      themeTags: ['Culinária', 'Nova York', 'Negócios', 'Mundo Real'],
    },
    {
      id: `scen_vague_austin_${timestamp}_2`,
      title: 'A Redação da Austin Dispatch',
      genre: 'Jornalismo Investigativo & Tensão Urbana',
      worldIdentity: 'Austin contemporânea de festivais de música, centros de inovação tecnológica, bairros em transformação e redações independentes.',
      premise: 'Fundação de um veículo de notícias independente cobrindo o impacto do boom imobiliário e tecnológico na cidade.',
      setting: 'Austin, Texas - Redação da South Congress e prefeitura municipal.',
      coreConflict: 'Repórteres investigam irregularidades no zoneamento urbano enquanto grandes investidores tentam comprar o controle acionário do portal.',
      description: 'Em uma das cidades de crescimento mais rápido do país, repórteres e fotógrafos independentes trabalham sob prazos exíguos para revelar histórias de interesse público que a grande mídia hesita em publicar.',
      startingLocation: 'Mesa de pauta da redação compartilhada na South Congress Avenue',
      tone: 'Investigativo, contemporâneo e dinâmico',
      themeTags: ['Jornalismo', 'Texas', 'Investigação', 'Mundo Real'],
    },
    {
      id: `scen_vague_maine_${timestamp}_3`,
      title: 'O Estaleiro da Baía de Casco',
      genre: 'Drama de Ofício & Tradição Marítima',
      worldIdentity: 'Costa rochosa do Maine, oficinas de carpintaria naval com cheiro de cedro e verniz, portos de pesca de lagosta e névoa marinha matinal.',
      premise: 'Restauração de embarcações clássicas em uma oficina familiar que luta contra a automatização industrial dos grandes estaleiros.',
      setting: 'Portland e Baía de Casco, Maine - Galpões de carpintaria naval e cais de pescadores.',
      coreConflict: 'Uma encomenda de reforma de um veleiro centenário pode salvar a empresa da falência, mas peças sobressalentes raras foram retidas por um fornecedor rival.',
      description: 'Na costa ventosa do Maine, artesãos navais e marinheiros locais dedicam-se à construção e restauração de barcos de madeira tradicionais, desafiando a pressão de grandes corporações industriais da baía.',
      startingLocation: 'Galpão de marcenaria naval à beira da Baía de Casco',
      tone: 'Humano, autêntico e focado em ofício',
      themeTags: ['Marítimo', 'Maine', 'Ofício', 'Mundo Real'],
    },
  ];
}

/**
 * Gera exatamente 3 conceitos de mundo/cenário adaptados ao formato e premissa.
 */
export async function generateThreeScenarios(options?: GenerateScenariosOptions): Promise<ScenarioOption[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  const isFocused = options?.format === 'focused';
  const isRealWorld = options?.worldBasis === 'real_world';
  const rawInput = options?.guidedPremise || options?.premise;
  const normalized = normalizePremiseInput(rawInput, { worldBasis: options?.worldBasis, format: options?.format });
  const premise = normalized.premiseText;
  const constraints = normalized.constraints;

  if (apiKey && apiKey.trim() !== '' && apiKey !== 'MY_GEMINI_API_KEY') {
    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      let prompt = '';

      const geoGuidelineWithPremise = (isFocused && isRealWorld)
        ? `\nDIRETRIZ GEOGRÁFICA (EUA COMO PADRÃO):\nSe a premissa NÃO mencionar explicitamente outro país, cidade ou região, você DEVE priorizar cenários realistas ambientados nos Estados Unidos (variando entre cidades grandes, médias, pequenas, subúrbios, áreas universitárias e contextos profissionais diversos). Se a premissa mencionar outro país ou localidade, RESPEITE a escolha do jogador e ignore esta regra.\n`
        : '';

      const geoGuidelineNoPremise = (isFocused && isRealWorld)
        ? `\nDIRETRIZ GEOGRÁFICA (EUA):\nPriorize cenários realistas ambientados nos Estados Unidos. Varie amplamente entre cidades grandes, cidades médias, pequenas cidades, subúrbios, áreas universitárias e contextos profissionais diversos para não ficar repetitivo.\n`
        : '';

      if (premise) {
        prompt = `
Você é um especialista em Design de Cenários e Narrativa de RPG.
Sua tarefa é transformar a premissa do jogador em EXATAMENTE 3 PROPOSTAS CONCRETAS, DISTINTAS E DIRETAMENTE JOGÁVEIS de cenários de RPG.

REGRA SUPREMA DE CONSTRAINTS:
Todas as 3 opções são variações da MESMA premissa do usuário. Preserve todos os requisitos explícitos. Diversifique circunstâncias, não os requisitos.

PREMISSA DO JOGADOR (FONTE ÚNICA DE VERDADE):
"${premise}"

FORMATO DA CAMPANHA:
${isFocused ? 'CENÁRIO FOCADO (foco em situação inicial concreta, relações sociais/profissionais densas, elenco de figuras-chave e conflito humano tangível, sem história linear)' : 'RPG SANDBOX (foco em mundo aberto, exploração de regiões específicas, recursos, facções e acontecimentos independentes)'}

AMBIENTAÇÃO DO MUNDO:
${isRealWorld ? 'BASEADO NO MUNDO REAL (estritamente mundo real contemporâneo/histórico; SEM magia, SEM forças ocultas, SEM criaturas fantásticas, SEM tecnologia impossível)' : 'FICCIONAL (fantasia, ficção científica, mundos alternativos ou ambientações inventadas; respeite o subgênero indicado na ideia)'}
${geoGuidelineWithPremise}

REGRAS DE CONCRETUDE E REALISMO (OBRIGATÓRIO):
1. PRESERVAÇÃO INTEGRAL DE REQUISITOS EXPLÍCITOS:
   - Se a premissa contiver 'high school', 'ensino médio' ou equivalente, TODAS as 3 opções DEVEM ser ambientadas em High School / Ensino Médio com contexto escolar. Nenhuma opção pode ser universidade, escritório corporativo, hospital ou adultos profissionais.
   - Se a premissa contiver 'classe média', TODAS as 3 opções DEVEM refletir contexto socioeconômico de classe média (escolas públicas de subúrbio, famílias trabalhadoras). Não transforme em elite milionária de mansões sem pedido.
   - Se a premissa contiver 'EUA' ou localização geográfica, TODAS as 3 opções DEVEM se situar nos Estados Unidos (varie cidades/estados dos EUA).
   - Se a premissa contiver 'enemies to lovers', construa uma situação inicial com atrito ou rivalidade plausível no ambiente (competição acadêmica, projetos obrigatórios, clubes escolares rivais), SEM forçar romance antecipado, SEM determinar sentimentos do jogador e SEM garantir reciprocidade futura (a agência e o desenvolvimento continuam abertos).
   - Se a premissa for fantasia medieval portuária com mercador, TODAS as 3 opções devem preservar fantasia medieval, porto e foco em comércio/mercadorias.
2. DIVERSIFIQUE CIRCUNSTÂNCIAS DENTRO DOS CONSTRAINTS:
   - Varie: cidade/estado, tipo de escola ou instituição, atividade extracurricular ou foco do projeto, origem concreta da rivalidade/atrito, círculo social e situação inicial exata.
3. BANIMENTO TOTAL DE CLICHÊS DE IA E LINGUAGEM ÉPICA:
   - PROIBIDO usar títulos genéricos ou poéticos como "Sombras e Segredos", "Alianças e Fronteiras", "O Despertar do Desconhecido", "Ecos do Passado", etc. Crie títulos plausíveis, específicos e com personalidade (ex: "A Disputa do Grêmio em Oakridge", "O Laboratório de Westlake").
   - PROIBIDO usar expressões como "equilíbrio de poder", "forças ocultas", "despertar", "fronteiras do destino", "sombras", "segredos obscuros".
   - NÃO transformar qualquer premissa em "guerra de facções" ou conspiração apocalíptica.
   - NÃO repita a frase do usuário como se fosse a descrição do cenário.
4. FORMATO E HIGIENE DE TEXTO:
   - Retorne APENAS texto simples nos campos. NUNCA inclua tags HTML, markdown, emojis ou prefixos como 'svg:' ou '[svg]'.
   - NÃO crie ficha, nome ou história prévia para o personagem do jogador.

ESTRUTURA DE CADA CENÁRIO (retorne um JSON Array com exatamente 3 objetos):
- title: Título específico, marcante e plausível (sem clichés genéricos de IA).
- premise: Pitch/resumo direto da premissa específica desta opção (1 a 2 frases).
- setting: Localização geográfica concreta (cidade/bairro/instituição) + contexto social/profissional (somente texto limpo).
- coreConflict: Situação inicial imediata + motivo tangível de atrito/conflito + espaço para evolução da campanha.
- genre: Gênero específico (ex: "Drama Escolar & Romance de Ensino Médio", "Drama Corporativo & Romance Contemporâneo").
- worldIdentity: Frase síntese da atmosfera e do microcosmo onde a campanha se passa.
- description: Descrição concisa, rica e atraente do cenário (2 a 4 frases) integrando local, personagens e situação inicial.
- startingLocation: Local físico inicial exato onde a primeira cena começa (ex: "Sala do Grêmio Estudantil após o sinal da última aula").
- tone: Tom da narrativa (ex: "Competitivo, sarcástico e tenso", "Elegante e dramático").
- themeTags: 2 a 4 tags temáticas curtas.
`;
      } else {
        prompt = `
Você é um especialista em Worldbuilding e Game Design de RPG.
Sua tarefa é gerar EXATAMENTE 3 conceitos de mundos/cenários SUBSTANCIALMENTE DIFERENTES entre si para uma nova campanha de RPG interativa.

FORMATO DA CAMPANHA ESCOLHIDO:
${isFocused ? 'CENÁRIO FOCADO (foco em uma premissa forte, situação ou elenco específico, maior peso em relações, dilemas sociais e acontecimentos daquele contexto)' : 'RPG SANDBOX (foco em mundo, exploração, liberdade, recursos, riscos, quests e acontecimentos independentes)'}

AMBIENTAÇÃO DO MUNDO ESCOLHIDA:
${isRealWorld ? 'BASEADO NO MUNDO REAL (lugares, cultura, rotina e contexto estritamente compatíveis com a nossa realidade; NÃO inventar magia, espécies fantásticas, poderes sobrenaturais ou tecnologias impossíveis sem pedido explícito)' : 'FICCIONAL (total liberdade para fantasia, ficção científica, mundos alternativos ou ambientações inventadas; sem obrigar fantasia genérica)'}
${geoGuidelineNoPremise}

DIRETRIZES FUNDAMENTAIS:
1. Variedade Extrema: Os 3 cenários devem apresentar recortes e dinâmicas ${isRealWorld ? 'do mundo real com temas distintos (ex: investigação urbana, drama hospitalar/acadêmico, sobrevivência em ermos reais, grandes expedições)' : 'completamente distintas entre si (ex: um Sci-Fi/Cyberpunk, um Dark Fantasy/Gótico, um Mistério/Sobrenatural/Weird West)'}.
2. Formato: ${isFocused ? 'Apresente cenários ricos em premissa dramática, núcleos relacionais e situações locais envolventes, garantindo que o mundo e os NPCs continuem autônomos sem roteiro linear.' : 'Apresente mundos vastos, com geografia instigante, facções/forças em disputa e liberdade total de ação e exploração.'}
3. Títulos Plausíveis e Específicos: Evite títulos genéricos de IA como "Sombras e Segredos" ou "Alianças e Fronteiras".
4. PROIBIÇÕES RÍGIDAS:
   - NÃO crie nome, classe, história ou ficha para o personagem do jogador.
   - NÃO crie companheiros (companions) ou aliados pré-definidos para o jogador.
   - NÃO defina o destino ou a personalidade do jogador.
   - ${isRealWorld ? 'NÃO invente magia, feitiços ou espécies míticas quando a escolha for Mundo Real.' : ''}
   - Retorne APENAS texto simples nos campos. NUNCA use tags HTML, markdown, emojis ou a palavra 'svg'.
   - O foco é 100% no cenário de partida.

ESTRUTURA DE CADA CENÁRIO (retorne um JSON Array com exatamente 3 objetos):
- title: Título específico e impactante do cenário.
- premise: Pitch/resumo direto da premissa específica desta opção.
- setting: Localização geográfica concreta + contexto social/profissional (somente texto limpo).
- coreConflict: Situação inicial imediata + motivo tangível de atrito/conflito + espaço para evolução.
- genre: Gênero da ambientação.
- worldIdentity: Frase síntese da identidade estética e atmosfera do mundo.
- description: Descrição concisa e instigante do universo e da tensão/situação principal (2 a 4 frases).
- startingLocation: Nome do local inicial exato onde a campanha começa.
- tone: Tom da narrativa.
- themeTags: Lista de 2 a 4 tags temáticas curtas.
`;
      }

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
                  type: Type.ARRAY,
                  description: 'Lista com exatamente 3 conceitos de mundos/cenários diferentes',
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      title: { type: Type.STRING, description: 'Título específico do cenário' },
                      genre: { type: Type.STRING, description: 'Gênero e ambientação' },
                      premise: { type: Type.STRING, description: 'Resumo direto da premissa desta opção' },
                      setting: { type: Type.STRING, description: 'Localização geográfica concreta e contexto social/profissional' },
                      coreConflict: { type: Type.STRING, description: 'Situação inicial e motivo de conflito/atrito' },
                      worldIdentity: { type: Type.STRING, description: 'Identidade estética e atmosfera' },
                      description: { type: Type.STRING, description: 'Descrição rica de 2 a 4 frases do mundo' },
                      startingLocation: { type: Type.STRING, description: 'Local inicial exato marcante' },
                      tone: { type: Type.STRING, description: 'Tom narrativo predominante' },
                      themeTags: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING },
                        description: 'Tags temáticas do cenário',
                      },
                    },
                    required: ['title', 'genre', 'worldIdentity', 'description', 'startingLocation'],
                  },
                },
              },
            }),
            12000,
            `Scenario generation timed out on model ${model} (12s)`
          );

          const rawText = response.text?.trim() || '';
          if (rawText) {
            const parsed = JSON.parse(rawText);
            if (Array.isArray(parsed) && parsed.length >= 3) {
              logModelExecution({
                functionExecuted: 'WORLD_GENERATION/generateThreeScenarios',
                modelAttempted: model,
                modelSucceeded: model,
              });

              // Gerar opções procedurais de segurança para substituição precisa caso algum item gerado viole constraints
              const proceduralFallbacks = premise
                ? generateProceduralPremiseScenarios(premise, options)
                : (isRealWorld
                    ? (isFocused ? PROCEDURAL_REAL_FOCUSED_PRESETS[0] : PROCEDURAL_REAL_SANDBOX_PRESETS[0])
                    : (isFocused ? PROCEDURAL_FOCUSED_PRESETS[0] : PROCEDURAL_SANDBOX_PRESETS[0]));

              const validThree = parsed.slice(0, 3).map((item, idx) => {
                const titleStr = cleanOutputText(String(item.title || `Cenário ${idx + 1}`));
                const genreStr = cleanOutputText(String(item.genre || (isRealWorld ? (isFocused ? 'Drama Realista' : 'Exploração Real') : (isFocused ? 'Drama & Mistério' : 'Aventura Sandbox'))));
                const premiseStr = cleanOutputText(item.premise ? String(item.premise) : (premise || titleStr));
                const settingStr = cleanOutputText(item.setting ? String(item.setting) : String(item.startingLocation || 'Local Principal'));
                const coreConflictStr = cleanOutputText(item.coreConflict ? String(item.coreConflict) : (item.core_conflict ? String(item.core_conflict) : String(item.description || 'Dilema inicial da campanha')));
                const worldIdentityStr = cleanOutputText(String(item.worldIdentity || 'Mundo rico e autônomo aguardando suas decisões.'));
                const descriptionStr = cleanOutputText(String(item.description || (premiseStr ? `${premiseStr} ${coreConflictStr}` : 'Um universo imersivo e repleto de possibilidades.')));
                const startingLocationStr = cleanOutputText(String(item.startingLocation || settingStr));

                const candidateScenario: ScenarioOption = {
                  id: `scen_gen_${Date.now()}_${idx + 1}`,
                  title: titleStr,
                  genre: genreStr,
                  premise: premiseStr,
                  setting: settingStr,
                  coreConflict: coreConflictStr,
                  core_conflict: coreConflictStr,
                  worldIdentity: worldIdentityStr,
                  description: descriptionStr,
                  startingLocation: startingLocationStr,
                  tone: item.tone ? cleanOutputText(String(item.tone)) : (isFocused ? 'Imersivo e tenso' : 'Misterioso e instigante'),
                  themeTags: Array.isArray(item.themeTags) ? item.themeTags.map((t) => cleanOutputText(String(t))) : [isRealWorld ? 'Mundo Real' : 'Ficção', isFocused ? 'Relações' : 'Exploração', 'RPG'],
                };

                // Validação semântica pós-geração: se violar os constraints obrigatórios da premissa, substitui pela opção procedural alinhada
                if (premise) {
                  const validation = validateScenarioConstraints(candidateScenario, constraints);
                  if (!validation.isValid) {
                    const fallbackOption = proceduralFallbacks[idx] || proceduralFallbacks[0];
                    return {
                      ...fallbackOption,
                      id: `scen_fallback_${Date.now()}_${idx + 1}`,
                    };
                  }
                }

                return candidateScenario;
              });

              return validThree;
            }
          }
        } catch (modelErr) {
          const summarized = summarizeApiError(modelErr);
          logModelExecution({
            functionExecuted: 'WORLD_GENERATION/generateThreeScenarios',
            modelAttempted: model,
            fallbackUsed: true,
            summarizedError: `${summarized.errorType}: ${summarized.message}`,
          });
        }
      }
    } catch (genErr) {
      console.info('[ScenarioGenerator] Modelos remotos indisponíveis, acionando gerador procedural determinístico.');
    }
  }

  // Fallback Procedural Determinístico com contextualização inteligente
  if (premise) {
    return generateProceduralPremiseScenarios(premise, options);
  }

  let pool: ScenarioOption[][];
  if (isRealWorld) {
    pool = isFocused ? PROCEDURAL_REAL_FOCUSED_PRESETS : PROCEDURAL_REAL_SANDBOX_PRESETS;
  } else {
    pool = isFocused ? PROCEDURAL_FOCUSED_PRESETS : PROCEDURAL_SANDBOX_PRESETS;
  }

  const selected = pool[presetIndex % pool.length];
  presetIndex++;
  return selected.map((item, idx) => ({
    ...item,
    id: `scen_preset_${isRealWorld ? 'real_' : ''}${isFocused ? 'foc' : 'snd'}_${Date.now()}_${idx + 1}`,
  }));
}

export async function generateScenarioFromIdea(
  idea: string,
  options?: GenerateScenariosOptions
): Promise<ScenarioOption> {
  const apiKey = process.env.GEMINI_API_KEY;
  const isFocused = options?.format === 'focused';
  const isRealWorld = options?.worldBasis === 'real_world';

  if (apiKey && apiKey.trim() !== '' && apiKey !== 'MY_GEMINI_API_KEY') {
    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const prompt = `
Você é um especialista em Worldbuilding de RPG.
Transforme a ideia do jogador em uma premissa de Cenário (ScenarioOption).

IDEIA DO JOGADOR:
"${idea}"

FORMATO: ${isFocused ? 'Cenário Focado' : 'RPG Sandbox'}
AMBIENTAÇÃO: ${isRealWorld ? 'Baseado no Mundo Real (lugares, rotina, instituições e cultura realistas; sem magia ou tecnologias impossíveis sem pedido explícito)' : 'Ficcional (total liberdade para fantasia, sci-fi ou ambientações inventadas)'}

DIRETRIZES:
1. TRATE A IDEIA COMO FONTE DE VERDADE ABSOLUTA. Aprofunde-a sem descaracterizar.
2. ${isRealWorld ? 'Mantenha a coerência com a realidade humana e física do mundo real.' : 'Não adicione guerra, monarquia, profecia, crise ou facções se não fizerem sentido para a ideia original.'}
3. Não crie personagem do jogador, classe, personalidade ou destino.
4. Não crie companion obrigatório.
5. Evite nomes clichês de fantasia de IA.

ESTRUTURA (retorne um objeto JSON):
- title: Título curto para o cenário.
- genre: Gênero da ambientação baseado na ideia.
- worldIdentity: Frase síntese da identidade estética do mundo.
- description: Descrição curta do mundo, integrando e respeitando totalmente a ideia (2-3 frases).
- startingLocation: Local inicial sugerido, autêntico ao mundo.
- tone: Tom narrativo.
- themeTags: 2 a 4 tags temáticas.
`;

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
                  description: 'Cenário estruturado a partir da ideia do usuário',
                  properties: {
                    title: { type: Type.STRING },
                    genre: { type: Type.STRING },
                    worldIdentity: { type: Type.STRING },
                    description: { type: Type.STRING },
                    startingLocation: { type: Type.STRING },
                    tone: { type: Type.STRING },
                    themeTags: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                    },
                  },
                  required: ['title', 'genre', 'worldIdentity', 'description', 'startingLocation'],
                },
              },
            }),
            12000,
            `Scenario custom generation timed out on model ${model} (12s)`
          );

          const rawText = response.text?.trim() || '';
          if (rawText) {
            const parsed = JSON.parse(rawText);
            if (parsed && parsed.title) {
              logModelExecution({
                functionExecuted: 'WORLD_GENERATION/generateScenarioFromIdea',
                modelAttempted: model,
                modelSucceeded: model,
              });
              return {
                id: `scen_custom_gen_${Date.now()}`,
                title: String(parsed.title),
                genre: String(parsed.genre || (isRealWorld ? 'Realismo Contemporâneo' : 'Desconhecido')),
                worldIdentity: String(parsed.worldIdentity || (isRealWorld ? 'Mundo Real e Autêntico' : 'Mundo Customizado')),
                description: String(parsed.description || idea),
                startingLocation: String(parsed.startingLocation || 'Ponto de Origem'),
                tone: parsed.tone ? String(parsed.tone) : 'Misterioso',
                themeTags: Array.isArray(parsed.themeTags) ? parsed.themeTags.map(String) : [isRealWorld ? 'Mundo Real' : 'Personalizado'],
              };
            }
          }
        } catch (modelErr) {
          const summarized = summarizeApiError(modelErr);
          logModelExecution({
            functionExecuted: 'WORLD_GENERATION/generateScenarioFromIdea',
            modelAttempted: model,
            fallbackUsed: true,
            summarizedError: `${summarized.errorType}: ${summarized.message}`,
          });
        }
      }
    } catch (genErr) {
      console.info('[ScenarioGenerator/Custom] Modelos remotos indisponíveis, acionando fallback.');
    }
  }

  // Fallback Procedural
  return {
    id: `scen_custom_${Date.now()}`,
    title: 'Campanha Personalizada',
    genre: isRealWorld ? 'Mundo Real Personalizado' : 'Mundo Personalizado',
    worldIdentity: idea.length > 50 ? idea.substring(0, 50) + '...' : idea,
    description: idea,
    startingLocation: 'O Ponto de Partida',
    tone: 'Livre',
    themeTags: ['Custom', isRealWorld ? 'Mundo Real' : 'Ficção', isFocused ? 'Cenário Focado' : 'Sandbox'],
  };
}
export interface CharacterConceptSuggestion {
  id: string;
  concept: string;
  suggestedRole: string;
  hook: string;
  suggestedEquipment?: string;
  suggestedStats?: string;
}

/**
 * Modo "Mestre Escolhe Tudo":
 * Gera automaticamente uma proposta de cenário completa e coerente com Foundation adaptativa.
 */
export async function generateMasterProposal(
  format: 'sandbox' | 'focused',
  worldBasis: 'real_world' | 'fictional' = 'fictional'
): Promise<{
  scenario: ScenarioOption;
  foundation: import('./foundationGenerator').FoundationDetails;
}> {
  const { generateFoundation } = await import('./foundationGenerator');
  const isFocused = format === 'focused';
  const isRealWorld = worldBasis === 'real_world';
  const apiKey = process.env.GEMINI_API_KEY;

  let chosenScenario: ScenarioOption | null = null;

  if (apiKey && apiKey.trim() !== '' && apiKey !== 'MY_GEMINI_API_KEY') {
    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const geoGuidelineMaster = (isFocused && isRealWorld)
        ? `\nDIRETRIZ GEOGRÁFICA (EUA):\nPriorize cenários realistas ambientados nos Estados Unidos. Varie amplamente entre cidades grandes, cidades médias, pequenas cidades, subúrbios, áreas universitárias e contextos profissionais diversos para não ficar repetitivo.\n`
        : '';

      const prompt = isFocused
        ? `
Você é o Mestre de Jogo criando uma proposta completa de CENÁRIO FOCADO sob medida.
Gere uma premissa envolvente, autêntica e madura para um Cenário Focado (drama, suspense, investigação, slice-of-life ou relações interpessoais).

AMBIENTAÇÃO DO MUNDO ESCOLHIDA:
${isRealWorld ? 'BASEADO NO MUNDO REAL (lugares, cultura, rotina e contexto estritamente compatíveis com o mundo real, usando cidades, hospitais, redações, bairros, empresas ou comunidades reais; NÃO inventar magia ou tecnologias impossíveis)' : 'FICCIONAL (fantasia, ficção científica, mundos alternativos ou ambientações inventadas)'}
${geoGuidelineMaster}
DIRETRIZES:
1. FOCO: Premissa central, contexto social, ambientação, local principal e situação inicial rica.
2. Não crie um roteiro pré-determinado ou linear. O mundo e os NPCs devem ter vida própria e autonomia.
3. Não decida sentimentos, atração ou reciprocidade pelo jogador.
4. PROIBIÇÕES RÍGIDAS:
   - NÃO crie personagem do jogador, nem mencione "o jogador".
   - NÃO crie companheiros (companions) obrigatórios.
   - NÃO imponha destino ou profecia.
   - ${isRealWorld ? 'NÃO invente magia ou espécies fantásticas.' : ''}

ESTRUTURA JSON (um objeto):
- title: Título evocativo e original do cenário.
- genre: Gênero da ambientação.
- worldIdentity: Frase síntese da atmosfera social e estética.
- description: Descrição da premissa central e situação inicial (3 a 5 frases).
- startingLocation: Local principal de convivência ou ponto de partida.
- tone: Tom narrativo.
- themeTags: 3 a 5 tags temáticas.
`
        : `
Você é o Mestre de Jogo criando uma proposta completa de RPG SANDBOX sob medida.
Gere um mundo aberto vasto, instigante e consistente, com alto grau de liberdade e exploração.

AMBIENTAÇÃO DO MUNDO ESCOLHIDA:
${isRealWorld ? 'BASEADO NO MUNDO REAL (sobrevivência em ermos reais, exploração ártica/amazônica, grandes centros urbanos, investigações ou expedições autênticas da Terra; sem magia ou tecnologias fictícias)' : 'FICCIONAL (alta fantasia, sci-fi, cyberpunk, distopias ou mundos inventados)'}

DIRETRIZES:
1. FOCO: Conceito de mundo rico, gênero/ambientação, premissa inicial, regiões/local inicial, forças/facções e perigos/oportunidades.
2. Liberdade absoluta: sem missões pré-roteirizadas ou trilhos narrativos.
3. PROIBIÇÕES RÍGIDAS:
   - NÃO crie personagem do jogador, nem mencione "o jogador".
   - NÃO crie companheiros (companions) obrigatórios.
   - NÃO imponha destino ou profecia.
   - ${isRealWorld ? 'NÃO invente magia ou criaturas mitológicas.' : ''}

ESTRUTURA JSON (um objeto):
- title: Título evocativo e original do mundo.
- genre: Gênero da ambientação.
- worldIdentity: Frase síntese da identidade estética e atmosfera.
- description: Descrição da premissa e estado do mundo (3 a 5 frases).
- startingLocation: Local ou região inicial marcante.
- tone: Tom narrativo.
- themeTags: 3 a 5 tags temáticas.
`;

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
                  description: 'Proposta completa de cenário pelo Mestre',
                  properties: {
                    title: { type: Type.STRING },
                    genre: { type: Type.STRING },
                    worldIdentity: { type: Type.STRING },
                    description: { type: Type.STRING },
                    startingLocation: { type: Type.STRING },
                    tone: { type: Type.STRING },
                    themeTags: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                    },
                  },
                  required: ['title', 'genre', 'worldIdentity', 'description', 'startingLocation'],
                },
              },
            }),
            12000,
            `Master proposal generation timed out on model ${model} (12s)`
          );

          const rawText = response.text?.trim() || '';
          if (rawText) {
            const parsed = JSON.parse(rawText);
            if (parsed && parsed.title) {
              logModelExecution({
                functionExecuted: 'WORLD_GENERATION/generateMasterProposal',
                modelAttempted: model,
                modelSucceeded: model,
              });
              chosenScenario = {
                id: `scen_master_${Date.now()}`,
                title: String(parsed.title),
                genre: String(parsed.genre || (isRealWorld ? (isFocused ? 'Drama Realista' : 'Exploração Realista') : (isFocused ? 'Drama Social' : 'Alta Fantasia'))),
                worldIdentity: String(parsed.worldIdentity || (isRealWorld ? 'Mundo Real Autêntico' : 'Mundo Vivo e Autônomo')),
                description: String(parsed.description),
                startingLocation: String(parsed.startingLocation || 'Ponto de Partida'),
                tone: parsed.tone ? String(parsed.tone) : 'Imersivo',
                themeTags: Array.isArray(parsed.themeTags) ? parsed.themeTags.map(String) : ['Mestre', format, isRealWorld ? 'Mundo Real' : 'Ficção'],
              };
              break;
            }
          }
        } catch (modelErr) {
          const summarized = summarizeApiError(modelErr);
          logModelExecution({
            functionExecuted: 'WORLD_GENERATION/generateMasterProposal',
            modelAttempted: model,
            fallbackUsed: true,
            summarizedError: `${summarized.errorType}: ${summarized.message}`,
          });
        }
      }
    } catch (genErr) {
      console.info('[ScenarioGenerator/MasterProposal] Fallback acionado.');
    }
  }

  // Fallback se a IA não responder
  if (!chosenScenario) {
    let pool: ScenarioOption[][];
    if (isRealWorld) {
      pool = isFocused ? PROCEDURAL_REAL_FOCUSED_PRESETS : PROCEDURAL_REAL_SANDBOX_PRESETS;
    } else {
      pool = isFocused ? PROCEDURAL_FOCUSED_PRESETS : PROCEDURAL_SANDBOX_PRESETS;
    }
    const selectedList = pool[presetIndex % pool.length];
    presetIndex++;
    const pick = selectedList[Math.floor(Math.random() * selectedList.length)];
    chosenScenario = {
      ...pick,
      id: `scen_master_proc_${Date.now()}`,
    };
  }

  // Gera Foundation usando o FoundationGenerator atual com o respectivo worldBasis
  const foundation = await generateFoundation(chosenScenario, { format, worldBasis });

  return {
    scenario: chosenScenario,
    foundation,
  };
}

/**
 * Sugere exatamente 3 conceitos abertos de personagem baseados no cenário gerado.
 * NUNCA impõe personagens obrigatórios nem define sentimentos/destinos.
 */
export async function generateCharacterConcepts(
  scenario: ScenarioOption,
  format: 'sandbox' | 'focused',
  worldBasis: 'real_world' | 'fictional' = 'fictional'
): Promise<CharacterConceptSuggestion[]> {
  const isFocused = format === 'focused';
  const isRealWorld = worldBasis === 'real_world';
  const apiKey = process.env.GEMINI_API_KEY;

  if (apiKey && apiKey.trim() !== '' && apiKey !== 'MY_GEMINI_API_KEY') {
    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const prompt = `
Você é um especialista em RPG auxiliando o jogador a vislumbrar possibilidades de personagens.
Com base no cenário abaixo, sugira EXATAMENTE 3 CONCEITOS INSPIRADORES E DISTINTOS de personagens.

CENÁRIO:
Título: ${scenario.title}
Gênero: ${scenario.genre}
Descrição: ${scenario.description}
Local Inicial: ${scenario.startingLocation}
Formato: ${isFocused ? 'Cenário Focado' : 'RPG Sandbox'}
Ambientação: ${isRealWorld ? 'Baseado no Mundo Real' : 'Ficcional'}

DIRETRIZES:
1. As sugestões são APENAS CONCEITOS e ganchos iniciais, sem obrigação ou imposição.
2. NÃO defina sentimentos pré-estabelecidos, atração, reciprocidade ou relacionamentos fechados.
3. NÃO crie profecias, escolhidos do destino ou companheiros obrigatórios.
4. ${isRealWorld ? 'Sugira ocupações, profissões, equipamentos e motivações plausíveis no mundo real (sem magia, superpoderes ou raças fictícias).' : (isFocused ? 'Foque em papéis sociais, ocupações críveis, rotinas e motivações cotidianas/pessoais no cenário.' : 'Foque em arquétipos livres, motivações de exploração, perícias úteis e histórico no mundo aberto.')}

ESTRUTURA JSON (um array com exatamente 3 objetos):
- concept: Frase síntese do conceito (ex: "${isRealWorld ? (isFocused ? 'Médico residente recém-transferido se adaptando à rotina de plantões' : 'Geólogo de campo com experiência em climas extremos') : (isFocused ? 'Jornalista freelancer recém-transferido buscando matérias locais' : 'Caçador veterano que conhece os passos secretos da serra')}").
- suggestedRole: Ocupação / papel sugerido.
- hook: Motivação ou objetivo pessoal aberto.
- suggestedEquipment: Pertences ou equipamentos cotidianos condizentes.
- suggestedStats: (Opcional) Competências ou perícias sugeridas.
`;

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
                  type: Type.ARRAY,
                  description: '3 conceitos sugeridos de personagem',
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      concept: { type: Type.STRING },
                      suggestedRole: { type: Type.STRING },
                      hook: { type: Type.STRING },
                      suggestedEquipment: { type: Type.STRING },
                      suggestedStats: { type: Type.STRING },
                    },
                    required: ['concept', 'suggestedRole', 'hook'],
                  },
                },
              },
            }),
            10000,
            `Character concepts generation timed out on model ${model}`
          );

          const rawText = response.text?.trim() || '';
          if (rawText) {
            const parsed = JSON.parse(rawText);
            if (Array.isArray(parsed) && parsed.length >= 3) {
              logModelExecution({
                functionExecuted: 'WORLD_GENERATION/generateCharacterConcepts',
                modelAttempted: model,
                modelSucceeded: model,
              });
              return parsed.slice(0, 3).map((item, idx) => ({
                id: `concept_sug_${Date.now()}_${idx + 1}`,
                concept: String(item.concept),
                suggestedRole: String(item.suggestedRole),
                hook: String(item.hook),
                suggestedEquipment: item.suggestedEquipment ? String(item.suggestedEquipment) : undefined,
                suggestedStats: item.suggestedStats ? String(item.suggestedStats) : undefined,
              }));
            }
          }
        } catch (modelErr) {
          const summarized = summarizeApiError(modelErr);
          logModelExecution({
            functionExecuted: 'WORLD_GENERATION/generateCharacterConcepts',
            modelAttempted: model,
            fallbackUsed: true,
            summarizedError: `${summarized.errorType}: ${summarized.message}`,
          });
        }
      }
    } catch (err) {
      console.info('[ScenarioGenerator/CharacterConcepts] Fallback acionado.');
    }
  }

  // Fallback Procedural de Conceitos
  if (isRealWorld) {
    if (isFocused) {
      return [
        {
          id: `concept_real_foc_1_${Date.now()}`,
          concept: 'Profissional dedicado recém-chegado ao setor, buscando entender a dinâmica da equipe.',
          suggestedRole: 'Especialista / Consultor / Analista',
          hook: 'Conquistar autonomia profissional e construir relações sólidas no ambiente de trabalho.',
          suggestedEquipment: 'Notebook corporativo, smartphone, crachá de identificação, pasta executiva.',
        },
        {
          id: `concept_real_foc_2_${Date.now()}`,
          concept: 'Morador atuante na comunidade local que conhece o histórico do bairro e de seus residentes.',
          suggestedRole: 'Comerciante local / Professor / Assistente Social',
          hook: 'Proteger o patrimônio comunitário e encontrar equilíbrio entre o trabalho e a vida pessoal.',
          suggestedEquipment: 'Chaves do local de trabalho, carteira, agenda, telefone com contatos úteis.',
        },
        {
          id: `concept_real_foc_3_${Date.now()}`,
          concept: 'Pessoa reservada em busca de um recomeço discreto após mudanças em sua vida pessoal.',
          suggestedRole: 'Técnico autônomo / Pesquisador / Estudante de pós-graduação',
          hook: 'Estabelecer uma rotina tranquila e construir laços genuínos aos poucos.',
          suggestedEquipment: 'Mochila casual, fones de ouvido, carteira, livro de anotações.',
        },
      ];
    }

    return [
      {
        id: `concept_real_snd_1_${Date.now()}`,
        concept: 'Especialista de campo em logística e expedições em terrenos remotos.',
        suggestedRole: 'Guia de Expedição / Piloto Fluvial / Geólogo',
        hook: 'Mapear e documentar rotas desafiadoras enquanto apoia iniciativas de campo.',
        suggestedEquipment: 'GPS de navegação, canivete multiferramenta, rádio comunicador, kit de primeiros socorros.',
        suggestedStats: 'Orientação Espacial, Sobrevivência em Campo, Primeiros Socorros.',
      },
      {
        id: `concept_real_snd_2_${Date.now()}`,
        concept: 'Investigador ou jornalista focado em apurações complexas e operações de grande escala.',
        suggestedRole: 'Repórter Investigativo / Perito Técnico',
        hook: 'Reunir fatos e documentar acontecimentos cruciais na região.',
        suggestedEquipment: 'Gravador de voz, câmera digital, documentos, laptop resistente.',
        suggestedStats: 'Investigação, Análise Forense/Documental, Comunicação.',
      },
      {
        id: `concept_real_snd_3_${Date.now()}`,
        concept: 'Profissional autônomo versátil habituado a trabalhos sob pressão e negociações de campo.',
        suggestedRole: 'Operador de Logística / Mecânico de Máquinas Pesadas / Segurança Privado',
        hook: 'Prestar serviços confiáveis, acumular recursos e expandir sua rede de contatos.',
        suggestedEquipment: 'Caixa de ferramentas ou kit tático civil, roupas reforçadas, celular por satélite.',
        suggestedStats: 'Manutenção Mecânica, Negociação Pragmática, Resistência Física.',
      },
    ];
  }

  if (isFocused) {
    return [
      {
        id: `concept_foc_1_${Date.now()}`,
        concept: 'Profissional autônomo recém-chegado buscando se estabelecer e entender o ritmo do lugar.',
        suggestedRole: 'Fotógrafo / Jornalista / Pesquisador Independente',
        hook: 'Construir estabilidade e descobrir as histórias não contadas do ambiente local.',
        suggestedEquipment: 'Caderno de notas, smartphone/câmera, chaves, mochila prática.',
      },
      {
        id: `concept_foc_2_${Date.now()}`,
        concept: 'Morador de longa data que conhece a rotina da comunidade e mantém laços discretos com todos.',
        suggestedRole: 'Dono de comércio local / Assistente / Artesão',
        hook: 'Preservar seu espaço e ajudar conhecidos enquanto busca um novo rumo pessoal.',
        suggestedEquipment: 'Chaves do estabelecimento, agenda pessoal, itens de trabalho diário.',
      },
      {
        id: `concept_foc_3_${Date.now()}`,
        concept: 'Figura reservada que busca um recomeço pacífico longe de complicações do passado.',
        suggestedRole: 'Consultor / Estudante / Trabalhador Noturno',
        hook: 'Manter a discrição enquanto encontra pessoas de confiança e um propósito genuíno.',
        suggestedEquipment: 'Agasalho confortável, carteira, fones de ouvido, livro de leitura.',
      },
    ];
  }

  return [
    {
      id: `concept_snd_1_${Date.now()}`,
      concept: 'Explorador experiente e cartógrafo que mapeia trilhas esquecidas e ruínas de fronteira.',
      suggestedRole: 'Batedor / Navegador',
      hook: 'Descobrir o que existe além dos limites do mapa oficial da região.',
      suggestedEquipment: 'Instrumentos de medição, bússola, faca de caça, mochila de viagem.',
      suggestedStats: 'Sobrevivência, Percepção, Furtividade.',
    },
    {
      id: `concept_snd_2_${Date.now()}`,
      concept: 'Estudioso pragmático de relíquias antigas e tecnologias esquecidas em busca de conhecimento prático.',
      suggestedRole: 'Erudito / Alquimista / Arcanista de Campo',
      hook: 'Decifrar os segredos fundamentais que movem os fenômenos deste mundo.',
      suggestedEquipment: 'Grimório de anotações, kit de reagentes, lanterna a óleo.',
      suggestedStats: 'Conhecimento Arcano/Científico, Investigação, Medicina.',
    },
    {
      id: `concept_snd_3_${Date.now()}`,
      concept: 'Andarilho versátil habituado a negociar entre facções e sobreviver nos caminhos perigosos.',
      suggestedRole: 'Mercenário Diplomata / Guarda de Caravana',
      hook: 'Acumular recursos e reputação enquanto decide a que causa vale a pena se aliar.',
      suggestedEquipment: 'Arma de defesa pessoal, armadura leve de couro, corda, rações.',
      suggestedStats: 'Persuasão, Atletismo, Percepção.',
    },
  ];
}

