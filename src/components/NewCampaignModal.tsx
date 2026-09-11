/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  PlusCircle,
  Sparkles,
  Edit3,
  ArrowLeft,
  BookOpen,
  Compass,
  User,
  ShieldAlert,
  ChevronRight,
  Info,
  Loader2,
  RefreshCw,
  CheckCircle2,
  Check,
  Lightbulb,
  PenLine,
  Shuffle,
  Globe,
  Landmark,
  MapPin,
  SlidersHorizontal,
  Heart,
  Search,
  Building2,
  GraduationCap,
  Users,
  Briefcase,
  Swords,
  Flame,
} from 'lucide-react';
import { api, ScenarioOption, FoundationDetails, CharacterConceptSuggestion } from '../services/api';
import { saveToLibrary } from '../utils/libraryStore';
import { BookMarked } from 'lucide-react';
import { Button, IconButton, Badge, Input, Tabs, Divider, Textarea, Spinner, LoadingState } from './ui';

interface NewCampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmCreateManual: (options?: { 
    title?: string; 
    genre?: string; 
    playerName?: string; 
    startingLocation?: string; 
    premise?: string; 
    tone?: string; 
    rulesOfUniverse?: string;
    worldDetails?: FoundationDetails;
    campaignFormat?: 'sandbox' | 'focused';
    worldBasis?: 'real_world' | 'fictional';
    experienceType?: string;
    customExperienceText?: string;
    charAge?: string;
    charPronouns?: string;
    charConcept?: string;
    charAppearance?: string;
    charFeatures?: string;
    charOrigin?: string;
    charOccupation?: string;
    charRoutine?: string;
    charRelationships?: string;
    charGoals?: string;
    charStats?: string;
    charEquipment?: string;
    mechanicalProfile?: string;
    customMechanicalText?: string;
    masterResponseLength?: string;
    masterPacing?: string;
    masterDescriptionLevel?: string;
    masterFocus?: string;
    masterTone?: string;
  }) => Promise<void> | void;
  onAdvanceCharacter?: (data: {
    playerName: string;
    charAge?: string;
    charPronouns?: string;
    charConcept?: string;
  }) => Promise<void> | void;
}

type WizardMode = 
  | 'campaign_format'
  | 'world_basis'
  | 'creation_method'
  | 'generate_options_choice'
  | 'manual'
  | 'generate_scenarios'
  | 'generate_foundation'
  | 'master_proposal'
  | 'custom_idea'
  | 'experience_type'
  | 'character_identity'
  | 'character_appearance'
  | 'character_origin'
  | 'character_stats'
  | 'character_equipment'
  | 'character_review'
  | 'mechanical_profile'
  | 'master_preferences'
  | 'campaign_review';

const loadDraft = <T,>(key: string, defaultVal: T): T => {
  try {
    const raw = sessionStorage.getItem('rpg_new_campaign_draft');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed[key] !== undefined) return parsed[key];
    }
  } catch(e) {}
  return defaultVal;
};

export function NewCampaignModal({
  isOpen,
  onClose,
  onConfirmCreateManual,
  onAdvanceCharacter,
}: NewCampaignModalProps) {
  const [selectedMode, setSelectedMode] = useState<WizardMode>(() => {
    const mode = loadDraft<string>('selectedMode', 'campaign_format');
    if (mode === 'selection') return 'campaign_format';
    if (mode === 'experience_type') return 'character_identity';
    return mode as WizardMode;
  });
  const [campaignFormat, setCampaignFormat] = useState<'sandbox' | 'focused' | null>(() => loadDraft('campaignFormat', null));
  const [worldBasis, setWorldBasis] = useState<'real_world' | 'fictional'>(() => loadDraft('worldBasis', 'fictional'));
  const [clickedOption, setClickedOption] = useState<string | null>(null);

  useEffect(() => {
    setClickedOption(null);
  }, [selectedMode]);

  // Auto-recuperação se o estado cair no modo legado experience_type
  useEffect(() => {
    if (selectedMode === 'experience_type') {
      setSelectedMode('character_identity');
    }
  }, [selectedMode]);

  const [foundationSourceMode, setFoundationSourceMode] = useState<'generate_scenarios' | 'custom_idea' | 'master_picks_all' | 'manual'>(() => loadDraft('foundationSourceMode', 'generate_scenarios'));
  const [customIdeaText, setCustomIdeaText] = useState(() => loadDraft('customIdeaText', ''));
  
  // Premissa e Opções de Geração
  const [premiseInputMode, setPremiseInputMode] = useState<'write' | 'guided' | 'surprise'>(() => loadDraft('premiseInputMode', 'write'));
  const [generateOptionPremise, setGenerateOptionPremise] = useState(() => loadDraft('generateOptionPremise', ''));
  const [generateOptionType, setGenerateOptionType] = useState<'premise' | 'guided' | 'surprise' | null>(() => loadDraft('generateOptionType', null));
  
  // Guided Premise Fields
  const [guidedFocus, setGuidedFocus] = useState<string>(() => loadDraft('guidedFocus', 'romance'));
  const [guidedDynamics, setGuidedDynamics] = useState<string>(() => loadDraft('guidedDynamics', 'enemies_to_lovers'));
  const [guidedLifeStage, setGuidedLifeStage] = useState<string>(() => loadDraft('guidedLifeStage', 'high_school'));
  const [guidedSocioeconomic, setGuidedSocioeconomic] = useState<string>(() => loadDraft('guidedSocioeconomic', 'middle_class'));
  const [guidedLocation, setGuidedLocation] = useState<string>(() => loadDraft('guidedLocation', 'usa'));
  const [guidedCustomLocation, setGuidedCustomLocation] = useState<string>(() => loadDraft('guidedCustomLocation', ''));
  const [guidedAdditionalDetails, setGuidedAdditionalDetails] = useState<string>(() => loadDraft('guidedAdditionalDetails', ''));
  
  // Trava síncrona com useRef e instrumentação de desenvolvimento
  const selectionLockRef = useRef<boolean>(false);
  const selectionExecCountRef = useRef<number>(0);
  const creationLockRef = useRef<boolean>(false);

  // Trava síncrona com useRef para Avançar Personagem
  const characterAdvanceLockRef = useRef<boolean>(false);
  const characterAdvanceExecCountRef = useRef<number>(0);
  const [isAdvancingCharacter, setIsAdvancingCharacter] = useState<boolean>(false);

  // Estados de seleção de cenário com feedback visual imediato
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null);
  const [isSelectingScenario, setIsSelectingScenario] = useState<boolean>(false);

  const [title, setTitle] = useState(() => loadDraft('title', ''));
  const [genre, setGenre] = useState(() => loadDraft('genre', ''));
  const [premise, setPremise] = useState(() => loadDraft('premise', ''));
  const [rulesOfUniverse, setRulesOfUniverse] = useState(() => loadDraft('rulesOfUniverse', ''));
  const [startingLocation, setStartingLocation] = useState(() => loadDraft('startingLocation', ''));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [savedToLibraryIds, setSavedToLibraryIds] = useState<Record<string, boolean>>({});
  const [manualValidationError, setManualValidationError] = useState<string | null>(null);
  const [experienceType, setExperienceType] = useState<'sandbox' | 'romance' | 'custom' | null>(() => loadDraft('experienceType', null));
  const [customExperienceText, setCustomExperienceText] = useState(() => loadDraft('customExperienceText', ''));
  const [experienceValidationError, setExperienceValidationError] = useState<string | null>(null);
  const [charAge, setCharAge] = useState(() => loadDraft('charAge', ''));
  const [charPronouns, setCharPronouns] = useState(() => loadDraft('charPronouns', ''));
  const [charConcept, setCharConcept] = useState(() => loadDraft('charConcept', ''));
  const [charAppearance, setCharAppearance] = useState(() => loadDraft('charAppearance', ''));
  const [charFeatures, setCharFeatures] = useState(() => loadDraft('charFeatures', ''));
  const [charOrigin, setCharOrigin] = useState(() => loadDraft('charOrigin', ''));
  const [charOccupation, setCharOccupation] = useState(() => loadDraft('charOccupation', ''));
  const [charRoutine, setCharRoutine] = useState(() => loadDraft('charRoutine', ''));
  const [charRelationships, setCharRelationships] = useState(() => loadDraft('charRelationships', ''));
  const [charGoals, setCharGoals] = useState(() => loadDraft('charGoals', ''));
  const [charStats, setCharStats] = useState(() => loadDraft('charStats', ''));
  const [charEquipment, setCharEquipment] = useState(() => loadDraft('charEquipment', ''));
  const [charValidationError, setCharValidationError] = useState<string | null>(null);
  const [mechanicalProfile, setMechanicalProfile] = useState<string | null>(() => {
    const saved = loadDraft<string | null>('mechanicalProfile', null);
    if (saved) return saved;
    const format = loadDraft<'sandbox' | 'focused' | null>('campaignFormat', null);
    if (format === 'focused') return 'FOCUSED_REALISM';
    if (format === 'sandbox') return 'SANDBOX_D20';
    return null;
  });
  const [customMechanicalText, setCustomMechanicalText] = useState(() => loadDraft('customMechanicalText', ''));
  const [mechValidationError, setMechValidationError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [masterResponseLength, setMasterResponseLength] = useState<'short' | 'medium' | 'long' | null>(() => loadDraft('masterResponseLength', null));
  const [masterPacing, setMasterPacing] = useState<'slow' | 'balanced' | 'fast' | null>(() => loadDraft('masterPacing', null));
  const [masterDescriptionLevel, setMasterDescriptionLevel] = useState<'low' | 'medium' | 'high' | null>(() => loadDraft('masterDescriptionLevel', null));
  const [masterFocus, setMasterFocus] = useState<'balanced' | 'exploration' | 'relationships' | 'survival' | 'intrigue' | 'action' | null>(() => loadDraft('masterFocus', null));
  const [masterTone, setMasterTone] = useState<'neutral' | 'dark' | 'adventurous' | 'contemplative' | 'realistic' | null>(() => loadDraft('masterTone', null));
  const [playerName, setPlayerName] = useState(() => loadDraft('playerName', ''));

  // Estados para Geração de Cenários
  const [scenarios, setScenarios] = useState<ScenarioOption[]>(() => loadDraft('scenarios', []));
  const [isGeneratingScenarios, setIsGeneratingScenarios] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  // Estados para Geração de Foundation
  const [selectedScenario, setSelectedScenario] = useState<ScenarioOption | null>(() => loadDraft('selectedScenario', null));
  const [foundation, setFoundation] = useState<FoundationDetails | null>(() => loadDraft('foundation', null));
  const [isGeneratingFoundation, setIsGeneratingFoundation] = useState(false);

  // Estados para Modo "Mestre Escolhe Tudo" & Sugestões de Personagem
  const [isGeneratingMasterProposal, setIsGeneratingMasterProposal] = useState(false);
  const [characterConcepts, setCharacterConcepts] = useState<CharacterConceptSuggestion[]>(() => loadDraft('characterConcepts', []));
  const [isGeneratingConcepts, setIsGeneratingConcepts] = useState(false);
  const [conceptsError, setConceptsError] = useState<string | null>(null);

  // Persistência automática no rascunho de sessão
  useEffect(() => {
    const draft = {
      selectedMode,
      campaignFormat,
      worldBasis,
      foundationSourceMode,
      customIdeaText,
      premiseInputMode,
      generateOptionPremise,
      generateOptionType,
      guidedFocus,
      guidedDynamics,
      guidedLifeStage,
      guidedSocioeconomic,
      guidedLocation,
      guidedCustomLocation,
      guidedAdditionalDetails,
      title,
      genre,
      premise,
      rulesOfUniverse,
      startingLocation,
      scenarios,
      selectedScenario,
      foundation,
      characterConcepts,
      experienceType,
      customExperienceText,
      charAge, charPronouns, charConcept, charAppearance, charFeatures,
      charOrigin, charOccupation, charRoutine, charRelationships, charGoals, charStats, charEquipment, playerName,
      mechanicalProfile, customMechanicalText,
      masterResponseLength, masterPacing, masterDescriptionLevel, masterFocus, masterTone
    };
    sessionStorage.setItem('rpg_new_campaign_draft', JSON.stringify(draft));
  }, [selectedMode, campaignFormat, worldBasis, foundationSourceMode, customIdeaText, premiseInputMode, generateOptionPremise, generateOptionType, guidedFocus, guidedDynamics, guidedLifeStage, guidedSocioeconomic, guidedLocation, guidedCustomLocation, guidedAdditionalDetails, title, genre, premise, rulesOfUniverse, startingLocation, scenarios, selectedScenario, foundation, characterConcepts, experienceType, customExperienceText, charAge, charPronouns, charConcept, charAppearance, charFeatures, charOrigin, charOccupation, charRoutine, charRelationships, charGoals, charStats, charEquipment, playerName, mechanicalProfile, customMechanicalText, masterResponseLength, masterPacing, masterDescriptionLevel, masterFocus, masterTone]);

  const clearDraftAndClose = () => {
    sessionStorage.removeItem('rpg_new_campaign_draft');
    setSelectedMode('campaign_format');
    setCampaignFormat(null);
    setWorldBasis('fictional');
    setFoundationSourceMode('generate_scenarios');
    setCustomIdeaText('');
    setPremiseInputMode('write');
    setGenerateOptionPremise('');
    setGenerateOptionType(null);
    setGuidedFocus('romance');
    setGuidedDynamics('enemies_to_lovers');
    setGuidedLifeStage('high_school');
    setGuidedSocioeconomic('middle_class');
    setGuidedLocation('usa');
    setGuidedCustomLocation('');
    setGuidedAdditionalDetails('');
    selectionLockRef.current = false;
    selectionExecCountRef.current = 0;
    creationLockRef.current = false;
    characterAdvanceLockRef.current = false;
    characterAdvanceExecCountRef.current = 0;
    setIsAdvancingCharacter(false);
    setSelectedScenarioId(null);
    setIsSelectingScenario(false);
    setTitle('');
    setGenre('');
    setPremise('');
    setRulesOfUniverse('');
    setStartingLocation('');
    setManualValidationError(null);
    setScenarios([]);
    setSelectedScenario(null);
    setFoundation(null);
    setCharacterConcepts([]);
    setConceptsError(null);
    setExperienceType(null);
    setCustomExperienceText('');
    setExperienceValidationError(null);
    setCharAge(''); setCharPronouns(''); setCharConcept(''); setCharAppearance(''); setCharFeatures('');
    setCharOrigin(''); setCharOccupation(''); setCharRoutine(''); setCharRelationships(''); setCharGoals(''); setCharStats(''); setCharEquipment('');
    setCharValidationError(null);
    setPlayerName('');
    setMechanicalProfile(null);
    setCustomMechanicalText('');
    setMechValidationError(null);
    setMasterResponseLength(null);
    setMasterPacing(null);
    setMasterDescriptionLevel(null);
    setMasterFocus(null);
    setMasterTone(null);
    setSubmitError(null);
    onClose();
  };

  // Fecha com ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        clearDraftAndClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Textos adaptativos para Onboarding conforme campaignFormat e worldBasis
    const t = useMemo(() => {
    if (worldBasis === 'real_world') {
      return {
        headerSubtitle: "Configure sua aventura",
        basisBadge: "Mundo Real",
        formatBadge: "Formato",
        generateOptionsSubtitle: "Como deseja que o Gemini crie as propostas?",
        premiseOptionDesc: "Descreva a premissa. O Gemini gerará 3 variações.",
        surpriseOptionDesc: "Sem campos obrigatórios. O Gemini gerará 3 propostas.",
        premiseOptionTitle: "Com minha premissa",
        surpriseOptionTitle: "Surpreenda-me",
        surpriseOptionBtn: "Gerar 3 opções surpresa",
        generateWithPremiseBtn: "Gerar com premissa",
        customIdeaSubtitle: "Descreva a região, contexto ou jornada pelo mundo real.",
        customIdeaPlaceholder: "Ex: Uma expedição científica...",
        scenariosTitle: "Opções de Região / Contexto",
        scenariosSubtitlePremise: "3 variações preservando a região informada",
        scenariosSubtitleSurprise: "3 propostas de regiões geradas pelo Gemini",
        scenariosLoadingPremise: "Mapeando 3 variações a partir da sua premissa...",
        scenariosLoadingSurprise: "Mapeando 3 regiões e premissas no mundo real...",
        scenarioCardAction: "Escolher",
        foundationLoading: "Mapeando geografia, rotinas e contexto...",
        foundationHeaderTitle: "Fundação da Região",
        foundationIdentityTitle: "Região / Contexto e Estado Atual",
        foundationGeographyTitle: "Geografia e Áreas de Interesse",
        foundationEverydayTitle: "Vida Cotidiana e Cultura Local",
        foundationMagicTitle: "Tecnologia, Infraestrutura e Comunicação",
        foundationEconomyTitle: "Economia e Logística",
        foundationFactionsTitle: "Organizações e Estruturas de Poder",
        foundationDangersTitle: "Perigos, Desafios e Oportunidades",
        foundationEventsTitle: "Acontecimentos em Andamento",
        masterProposalLoading: "O Mestre está delineando uma região...",
        masterProposalLoadingSub: "Definindo geografia, logística, organizações...",
        masterProposalPremiseLabel: "Premissa:",
        masterProposalLocationLabel: "Área Inicial:",
        manualTitlePlaceholder: "Ex: Expedição Patagônia",
        manualGenreLabel: "Região / Contexto",
        manualPremiseLabel: "Premissa",
        manualPremisePlaceholder: "Ex.: interior do Brasil, investigação urbana.",
        manualRulesLabel: "Particularidades da Região",
        manualRulesPlaceholder: "Ex.: Clima severo, cobertura de celular intermitente",
        manualLocationLabel: "Área Inicial",
        manualLocationPlaceholder: "Ex: Rodoviária de Curitiba",
        charIdentitySubtitle: "Defina quem é você nesta jornada.",
        charNamePlaceholder: "Ex: Rodrigo Prado",
        charConceptPlaceholder: "Ex: Fotógrafo documental",
        charAppearanceSubtitle: "Vestimenta, trajes práticos e aparência.",
        charAppearancePlaceholder: "Ex: Botas de trilha gastas, jaqueta impermeável",
        charFeaturesPlaceholder: "Ex: Câmera sempre ao pescoço",
        charOriginTitle: "Origem e História",
        charOriginSubtitle: "De onde você veio, sua bagagem e o que te impulsiona.",
        charOccupationPlaceholder: "Ex: Fotógrafo, biólogo, caminhoneiro",
        charOriginPlaceholder: "Qual sua cidade natal, histórico?",
        charRoutinePlaceholder: "Como costuma planejar seus dias de estrada?",
        charRelationshipsPlaceholder: "Contatos locais, guias conhecidos...",
        charEquipmentLabel: "Equipamento e Bagagem",
        charEquipmentSubtitle: "Mochila, ferramentas práticas.",
        charEquipmentPlaceholder: "Ex: Mochila cargueira 60L, câmera",
        reviewSectionTitle: "Mundo & Fundação",
        methodStepTitle: "Etapa 3 — Como criar",
        methodSubtitle: "Escolha a forma que deseja usar para definir o cenário.",
        methodGenerateOptionsDesc: "Abre opções geradas pelo Gemini.",
        methodCustomIdeaDesc: "Usa o fluxo de ideia livre para interpretar seu universo.",
        methodManualDesc: "Preencha você mesmo cada detalhe.",
        methodMasterDesc: "O Mestre gera uma proposta completa e coerente.",
        generateOptionsTitle: "Gerar Opções",
        premisePlaceholder: "Ex: Expedição na selva..."
      };
    }
    return {
      headerSubtitle: "Inicie uma nova aventura no RPG Sandbox (Ficcional)",
      basisBadge: "Ficcional",
      formatBadge: "Formato",
      generateOptionsSubtitle: "Escolha como deseja que o Gemini crie as propostas.",
      premiseOptionDesc: "Descreva a premissa central. O Gemini gerará 3 variações.",
      surpriseOptionDesc: "Sem campos obrigatórios. O Gemini gerará 3 opções ricas.",
      premiseOptionTitle: "Com minha premissa",
      surpriseOptionTitle: "Surpreenda-me",
      surpriseOptionBtn: "Gerar 3 opções surpresa",
      generateWithPremiseBtn: "Gerar 3 variações com premissa",
      customIdeaSubtitle: "Descreva livremente o mundo ou a campanha que deseja jogar.",
      customIdeaPlaceholder: "Ex: Quero um mundo onde a magia acabou há 100 anos...",
      scenariosTitle: "Opções de Gênero / Ambientação",
      scenariosSubtitlePremise: "3 variações preservando o núcleo da sua premissa",
      scenariosSubtitleSurprise: "3 propostas distintas geradas pelo Gemini",
      scenariosLoadingPremise: "Criando 3 variações a partir da sua premissa...",
      scenariosLoadingSurprise: "Consultando os astros e forjando 3 novos mundos...",
      scenarioCardAction: "Escolher este cenário",
      foundationLoading: "Construindo o mundo sandbox...",
      foundationHeaderTitle: "Fundação do Mundo",
      foundationIdentityTitle: "Identidade do Mundo e Estado Atual",
      foundationGeographyTitle: "Regiões e Geografia",
      foundationEverydayTitle: "Vida Cotidiana e Cultura",
      foundationMagicTitle: "Magia, Ciência ou Tecnologia",
      foundationEconomyTitle: "Economia e Logística",
      foundationFactionsTitle: "Facções e Estruturas de Poder",
      foundationDangersTitle: "Perigos e Oportunidades",
      foundationEventsTitle: "Acontecimentos em Andamento",
      masterProposalLoading: "O Mestre está forjando uma proposta...",
      masterProposalLoadingSub: "Definindo conceito do mundo, geografia, facções...",
      masterProposalPremiseLabel: "Mundo / Premissa:",
      masterProposalLocationLabel: "Região Inicial:",
      manualTitlePlaceholder: "Ex: O Segredo da Cidadela",
      manualGenreLabel: "Gênero / Ambientação",
      manualPremiseLabel: "Premissa",
      manualPremisePlaceholder: "Ex.: fantasia de fronteira, ficção científica.",
      manualRulesLabel: "Observações Livres do Mundo",
      manualRulesPlaceholder: "Ex: Dragões são comuns.",
      manualLocationLabel: "Região Inicial",
      manualLocationPlaceholder: "Ex: Taverna do Javali Saltitante",
      charIdentitySubtitle: "Defina quem é você neste mundo.",
      charNamePlaceholder: "Ex: Valério O Bravo",
      charConceptPlaceholder: "Ex: Um ex-soldado em busca de redenção",
      charAppearanceSubtitle: "Como os outros o veem durante a aventura?",
      charAppearancePlaceholder: "Ex: Alto, cicatriz no queixo, capa desgastada...",
      charFeaturesPlaceholder: "Ex: Uma cicatriz no olho esquerdo",
      charOriginTitle: "Origem e História",
      charOriginSubtitle: "De onde você veio e qual o seu papel no mundo.",
      charOccupationPlaceholder: "Ex: Mercenário, Arcanista, Ferreiro...",
      charOriginPlaceholder: "De onde você veio? Qual o seu passado?",
      charRoutinePlaceholder: "Como costuma planejar suas jornadas?",
      charRelationshipsPlaceholder: "Guildas, mestres, aliados ou contatos...",
      charEquipmentLabel: "Equipamento Inicial",
      charEquipmentSubtitle: "Itens, armas, armaduras ou suprimentos.",
      charEquipmentPlaceholder: "Ex: Roupas de viagem, espada curta...",
      reviewSectionTitle: "Mundo & Fundação",
      methodStepTitle: "Etapa 3 — Como criar",
      methodSubtitle: "Escolha a forma que deseja usar para definir o cenário.",
      methodGenerateOptionsDesc: "Abre opções de mundos geradas pelo Gemini.",
      methodCustomIdeaDesc: "Usa o fluxo de ideia livre para interpretar seu universo.",
      methodManualDesc: "Preencha você mesmo cada detalhe do contexto.",
      methodMasterDesc: "O Mestre gera uma proposta completa e coerente.",
      generateOptionsTitle: "Gerar Opções",
      premisePlaceholder: "Ex.: fantasia de fronteira, arquipélago mercantil."
    };
  }, [campaignFormat, worldBasis]);

  const handleGenerateOptions = async (type: 'premise' | 'guided' | 'surprise') => {
    if (isGeneratingScenarios) return;
    setIsGeneratingScenarios(true);
    setGenerationError(null);
    setGenerateOptionType(type);
    // Limpar seleção anterior e destravar lock
    selectionLockRef.current = false;
    setIsSelectingScenario(false);
    setSelectedScenarioId(null);
    setSelectedScenario(null);
    try {
      let premiseParam: string | undefined = undefined;
      let guidedParam: any = undefined;

      if (type === 'premise') {
        premiseParam = generateOptionPremise.trim();
      } else if (type === 'guided') {
        guidedParam = {
          focus: guidedFocus,
          dynamics: guidedDynamics,
          lifeStage: guidedLifeStage,
          socioeconomic: guidedSocioeconomic,
          location: guidedLocation,
          customLocation: guidedCustomLocation.trim() || undefined,
          additionalDetails: guidedAdditionalDetails.trim() || undefined,
        };
      }

      const result = await api.generateScenarios({
        format: campaignFormat || 'sandbox',
        worldBasis,
        premise: premiseParam,
        guidedPremise: guidedParam,
      });
      setScenarios(result);
      setSelectedMode('generate_scenarios');
    } catch (err: any) {
      setGenerationError(err.message || 'Erro ao gerar cenários');
    } finally {
      setIsGeneratingScenarios(false);
    }
  };

  const generateFoundationForScenario = async (scenario: ScenarioOption) => {
    if (isGeneratingFoundation) return;
    setIsGeneratingFoundation(true);
    setGenerationError(null);
    setSelectedScenario(scenario);
    try {
      let premiseParam: string | undefined = undefined;
      let guidedParam: any = undefined;

      if (generateOptionType === 'premise') {
        premiseParam = generateOptionPremise.trim();
      } else if (generateOptionType === 'guided') {
        guidedParam = {
          focus: guidedFocus,
          dynamics: guidedDynamics,
          lifeStage: guidedLifeStage,
          socioeconomic: guidedSocioeconomic,
          location: guidedLocation,
          customLocation: guidedCustomLocation.trim() || undefined,
          additionalDetails: guidedAdditionalDetails.trim() || undefined,
        };
      }

      const result = await api.generateFoundation(scenario, {
        format: campaignFormat || 'sandbox',
        worldBasis,
        premise: premiseParam || scenario.premise || scenario.description,
        guidedPremise: guidedParam,
      });
      setFoundation(result);
      setSelectedMode('generate_foundation');
    } catch (err: any) {
      setGenerationError(err.message || 'Erro ao gerar fundação');
    } finally {
      setIsGeneratingFoundation(false);
    }
  };

  const handleConfirmFoundation = () => {
    selectionLockRef.current = false;
    setIsSelectingScenario(false);
    setIsGeneratingFoundation(false);
    setSelectedMode('character_identity');
  };

  const handleMasterPicksAll = async () => {
    if (isGeneratingMasterProposal) return;
    setIsGeneratingMasterProposal(true);
    setGenerationError(null);
    try {
      const result = await api.generateMasterProposal(campaignFormat || 'sandbox', worldBasis);
      setScenarios([result.scenario]);
      setSelectedScenario(result.scenario);
      setFoundation(result.foundation);
      
      setSelectedMode('master_proposal');
    } catch (err: any) {
      setGenerationError(err.message || 'Erro ao gerar proposta');
    } finally {
      setIsGeneratingMasterProposal(false);
    }
  };

  
  const isFocused = campaignFormat === 'focused';
  const isRealWorld = worldBasis === 'real_world';

  const handleGenerateScenariosWithOptions = handleGenerateOptions;

  const handleSubmitCustomIdea = () => {
    setSelectedMode('generate_foundation');
  };

  const handleSelectScenarioCard = (scenario: ScenarioOption) => {
    // Se o usuário já iniciou a preparação pesada, ignora
    if (isSelectingScenario || isGeneratingFoundation || selectionLockRef.current) return;
    setSelectedScenarioId(scenario.id);
    setSelectedScenario(scenario);
    setGenerationError(null);
  };

  const handleContinueWithSelectedScenario = async () => {
    if (!selectedScenario || !selectedScenarioId) return;

    // 1. Verificação síncrona com useRef: se já estiver travado, retorna imediatamente
    if (selectionLockRef.current) {
      if (process.env.NODE_ENV !== 'production' || (typeof window !== 'undefined' && localStorage.getItem('rpg_developer_mode') === 'true')) {
        console.debug('[handleContinueWithSelectedScenario] Bloqueado por selectionLockRef síncrono. Ignorando clique concorrente.');
      }
      return;
    }

    // 2. Definir true síncronamente ANTES de qualquer await
    selectionLockRef.current = true;
    selectionExecCountRef.current += 1;

    // Log de desenvolvimento instrumentado
    if (process.env.NODE_ENV !== 'production' || (typeof window !== 'undefined' && localStorage.getItem('rpg_developer_mode') === 'true')) {
      console.debug(`handleContinueWithSelectedScenario execution count = ${selectionExecCountRef.current}`);
    }

    // 3. Atualizar estado visual imediatamente
    setIsSelectingScenario(true);
    setIsGeneratingFoundation(true);
    setGenerationError(null);

    // 4. Disparar geração da fundação
    try {
      let premiseParam: string | undefined = undefined;
      let guidedParam: any = undefined;

      if (generateOptionType === 'premise') {
        premiseParam = generateOptionPremise.trim();
      } else if (generateOptionType === 'guided') {
        guidedParam = {
          focus: guidedFocus,
          dynamics: guidedDynamics,
          lifeStage: guidedLifeStage,
          socioeconomic: guidedSocioeconomic,
          location: guidedLocation,
          customLocation: guidedCustomLocation.trim() || undefined,
          additionalDetails: guidedAdditionalDetails.trim() || undefined,
        };
      }

      const result = await api.generateFoundation(selectedScenario, {
        format: campaignFormat || 'sandbox',
        worldBasis,
        premise: premiseParam || selectedScenario.premise || selectedScenario.description,
        guidedPremise: guidedParam,
      });

      setFoundation(result);
      // Sucesso: avança a etapa
      setSelectedMode('generate_foundation');
      setIsGeneratingFoundation(false);
      selectionLockRef.current = false;
      setIsSelectingScenario(false);
    } catch (err: any) {
      // SOMENTE se houver erro real:
      selectionLockRef.current = false;
      setIsSelectingScenario(false);
      setIsGeneratingFoundation(false);
      setGenerationError(err.message || 'Erro ao preparar cenário. Tente novamente.');
    }
  };

  const handleSelectScenario = async (scenario: ScenarioOption) => {
    handleSelectScenarioCard(scenario);
    await handleContinueWithSelectedScenario();
  };

  const handleSuggestCharacterConcepts = async () => {
    setIsGeneratingConcepts(true);
    setConceptsError(null);
    try {
      const concepts = await api.generateCharacterConcepts(selectedScenario!, campaignFormat || 'sandbox', worldBasis);
      setCharacterConcepts(concepts);
    } catch (err) {
      setConceptsError(err.message || 'Erro ao gerar conceitos.');
    } finally {
      setIsGeneratingConcepts(false);
    }
  };

  const handleApplyCharacterConcept = (concept: any) => {
    if (concept.name) setPlayerName(concept.name);
    setCharConcept(concept.concept || concept.name);
    setCharOrigin(concept.origin || concept.hook || '');
    setCharOccupation(concept.occupation || concept.suggestedRole || '');
    setCharGoals(concept.goals || concept.hook || '');
    if (concept.suggestedEquipment) setCharEquipment(concept.suggestedEquipment);
    if (concept.suggestedStats) setCharStats(concept.suggestedStats);
    if (concept.routine) setCharRoutine(concept.routine);
    if (concept.relationships) setCharRelationships(concept.relationships);
  };

  const handleAdvanceCharacter = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }

    const isDev = process.env.NODE_ENV !== 'production' || 
      (typeof window !== 'undefined' && localStorage.getItem('rpg_developer_mode') === 'true');

    if (isDev) {
      console.debug('[handleAdvanceCharacter] Disparado', {
        step: selectedMode,
        playerName: playerName.trim(),
        characterAdvanceLock: characterAdvanceLockRef.current,
        isAdvancingCharacter,
        selectionLock: selectionLockRef.current,
        creationLock: creationLockRef.current,
      });
    }

    // 1. Verificação síncrona contra múltiplos cliques concorrentes
    if (characterAdvanceLockRef.current || isAdvancingCharacter) {
      if (isDev) {
        console.debug('[handleAdvanceCharacter] Bloqueado por characterAdvanceLockRef síncrono. Ignorando clique concorrente.');
      }
      return;
    }

    // 2. Validação dos dados do personagem: campo obrigatório Nome
    if (!playerName.trim()) {
      setCharValidationError('O nome do personagem é obrigatório.');
      if (isDev) {
        console.debug('[handleAdvanceCharacter] Validação falhou: Nome ausente.');
      }
      return;
    }

    // Campos opcionais (charAge, charPronouns, charConcept) não bloqueiam o avanço
    setCharValidationError(null);

    // 3. Ativar trava síncrona ANTES de qualquer await
    characterAdvanceLockRef.current = true;
    characterAdvanceExecCountRef.current += 1;
    setIsAdvancingCharacter(true);

    if (isDev) {
      console.debug(`[handleAdvanceCharacter] Execução autorizada count = ${characterAdvanceExecCountRef.current}`);
    }

    try {
      if (onAdvanceCharacter) {
        await onAdvanceCharacter({
          playerName: playerName.trim(),
          charAge: charAge.trim() || undefined,
          charPronouns: charPronouns.trim() || undefined,
          charConcept: charConcept.trim() || undefined,
        });
      }

      // Sucesso: avança determinística e exatamente uma vez para a próxima etapa
      setSelectedMode('character_appearance');
      if (isDev) {
        console.debug('[handleAdvanceCharacter] Avançado com sucesso para: character_appearance');
      }
    } catch (err: any) {
      setCharValidationError(err?.message || 'Erro ao preparar dados do personagem. Tente novamente.');
      if (isDev) {
        console.error('[handleAdvanceCharacter] Erro capturado:', err);
      }
    } finally {
      characterAdvanceLockRef.current = false;
      setIsAdvancingCharacter(false);
    }
  };

  const handleManualSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!premise.trim()) {
      setManualValidationError('A premissa é obrigatória para definir o mundo.');
      return;
    }
    setManualValidationError(null);
    setFoundationSourceMode('manual');
    setSelectedMode('character_identity');
  };

  const handleBackNavigation = () => {
    if (selectedMode === 'world_basis') setSelectedMode('campaign_format');
    else if (selectedMode === 'creation_method') setSelectedMode('world_basis');
    else if (selectedMode === 'generate_options_choice' || selectedMode === 'custom_idea' || selectedMode === 'master_proposal' || selectedMode === 'manual') setSelectedMode('creation_method');
    else if (selectedMode === 'generate_scenarios') {
      selectionLockRef.current = false;
      setIsSelectingScenario(false);
      setSelectedScenarioId(null);
      setSelectedScenario(null);
      setSelectedMode('generate_options_choice');
    }
    else if (selectedMode === 'generate_foundation') {
      selectionLockRef.current = false;
      setIsSelectingScenario(false);
      setSelectedScenarioId(null);
      setSelectedMode('generate_scenarios');
    }
    else if (selectedMode === 'experience_type') {
      setSelectedMode('character_identity');
    }
    else if (selectedMode === 'character_identity') {
      selectionLockRef.current = false;
      characterAdvanceLockRef.current = false;
      setIsAdvancingCharacter(false);
      if (foundationSourceMode === 'custom_idea') setSelectedMode('custom_idea');
      else if (foundationSourceMode === 'master_picks_all') setSelectedMode('master_proposal');
      else if (foundationSourceMode === 'manual') setSelectedMode('manual');
      else setSelectedMode('generate_foundation');
    }
    else if (selectedMode === 'character_appearance') setSelectedMode('character_identity');
    else if (selectedMode === 'character_origin') setSelectedMode('character_appearance');
    else if (selectedMode === 'character_stats') setSelectedMode('character_origin');
    else if (selectedMode === 'character_equipment') setSelectedMode('character_stats');
    else if (selectedMode === 'character_review') setSelectedMode('character_equipment');
    else if (selectedMode === 'mechanical_profile') setSelectedMode('character_review');
    else if (selectedMode === 'master_preferences') setSelectedMode('mechanical_profile');
    else if (selectedMode === 'campaign_review') setSelectedMode('master_preferences');
  };

  const handleConfirmCreation = async () => {
    if (creationLockRef.current || isSubmitting) return;
    creationLockRef.current = true;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await onConfirmCreateManual({
        title: title || (selectedScenario ? selectedScenario.title : 'Nova Campanha'),
        genre: genre || (selectedScenario ? selectedScenario.genre : 'Desconhecido'),
        playerName: playerName || 'Jogador',
        startingLocation: startingLocation || (foundation ? '' : ''),
        premise: premise || (selectedScenario ? selectedScenario.description : ''),
        rulesOfUniverse: rulesOfUniverse || (foundation ? foundation.identityAndState : ''),
        charAge, charPronouns, charConcept, charAppearance, charFeatures, charOrigin, charOccupation, charRoutine, charRelationships, charGoals, charStats, charEquipment,
        mechanicalProfile: mechanicalProfile || 'SANDBOX_D20',
        customMechanicalText: customMechanicalText,
        masterTone: masterTone || 'neutral',
        masterPacing: masterPacing || 'balanced',
        masterFocus: masterFocus || 'balanced',
        masterDescriptionLevel: masterDescriptionLevel || 'medium',
        masterResponseLength: masterResponseLength || 'medium',
        experienceType: experienceType || 'custom',
        customExperienceText: customExperienceText
      });
      clearDraftAndClose();
    } catch (e: any) {
      creationLockRef.current = false;
      setIsSubmitting(false);
      setSubmitError(e.message || 'Erro ao criar campanha.');
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div id="new-campaign-modal-backdrop" className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm transition-opacity duration-200" onClick={clearDraftAndClose} />
      <div id="new-campaign-dialog" className="fixed inset-0 z-50 flex flex-col sm:items-center sm:justify-center p-0 sm:p-6 overflow-hidden" role="dialog" aria-label="Criar nova campanha">
        <div className="w-full h-full sm:h-auto sm:max-w-lg bg-background sm:bg-surface-elevated sm:border sm:border-border-default sm:radius-large sm:elevation-medium flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
          <div className="h-14 sm:h-16 px-4 sm:px-6 border-b border-border-subtle flex items-center justify-between bg-surface-subtle shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex items-center justify-center text-text-muted shrink-0 pt-0.5">
                <PlusCircle className="w-4 h-4 text-text-secondary" />
              </div>
              <div className="min-w-0">
                <h2 className="typo-heading text-text-primary truncate">Criar nova campanha</h2>
                <p className="typo-caption text-text-muted truncate">{t.headerSubtitle}</p>
              </div>
            </div>
            <button id="close-new-campaign-modal-btn" type="button" onClick={clearDraftAndClose} title="Fechar modal de nova campanha" aria-label="Fechar modal de nova campanha" className="p-2 sm:p-1.5 min-w-[36px] min-h-[36px] flex items-center justify-center radius-medium text-text-muted hover:text-text-primary hover:bg-surface-elevated transition-colors duration-150 motion-reduce:transition-none cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 text-text-secondary typo-secondary">
                        {selectedMode === 'campaign_format' && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <h3 className="typo-section-heading text-text-primary">Etapa 1 — Formato da Campanha</h3>
                  </div>
                  <p className="text-text-secondary leading-relaxed typo-body">Escolha o formato e a dinâmica da sua jornada antes de definir o cenário.</p>
                </div>
                <div className="grid grid-cols-1 gap-3 pt-1">
                  <button id="btn-format-sandbox" type="button" onClick={() => { setClickedOption('sandbox'); setCampaignFormat('sandbox'); setMechanicalProfile('SANDBOX_D20'); setTimeout(() => setSelectedMode('world_basis'), 150); }} className={`p-4 radius-large border text-left transition-colors duration-150 motion-reduce:transition-none group cursor-pointer flex items-start gap-3.5 ${clickedOption === 'sandbox' ? 'bg-surface-elevated border-border-strong ring-1 ring-border-strong' : 'bg-surface active:bg-surface-active active:border-border-strong sm:hover:bg-surface-hover sm:hover:border-border-strong border-border-subtle'}`}>
                    <div className="flex items-center justify-center text-text-muted shrink-0 pt-0.5">
                      <Compass className="w-5 h-5 text-text-secondary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="typo-secondary font-medium text-text-primary group-hover:text-text-primary">RPG Sandbox</span>
                        {clickedOption === 'sandbox' ? <Check className="w-4 h-4 text-text-primary" /> : <ChevronRight className="w-4 h-4 text-text-muted group-hover:text-text-primary transition-transform duration-150 motion-reduce:transition-none group-hover:translate-x-0.5" />}
                      </div>
                      <p className="typo-caption text-text-muted mt-1 leading-relaxed">Campanha centrada no mundo, exploração, liberdade, recursos, riscos, quests e acontecimentos independentes.</p>
                    </div>
                  </button>
                  <button id="btn-format-focused" type="button" onClick={() => { setClickedOption('focused'); setCampaignFormat('focused'); setMechanicalProfile('FOCUSED_REALISM'); setTimeout(() => setSelectedMode('world_basis'), 150); }} className={`p-4 radius-large border text-left transition-colors duration-150 motion-reduce:transition-none group cursor-pointer flex items-start gap-3.5 ${clickedOption === 'focused' ? 'bg-surface-elevated border-border-strong ring-1 ring-border-strong' : 'bg-surface active:bg-surface-active active:border-border-strong sm:hover:bg-surface-hover sm:hover:border-border-strong border-border-subtle'}`}>
                    <div className="flex items-center justify-center text-text-muted shrink-0 pt-0.5">
                      <BookOpen className="w-5 h-5 text-text-secondary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="typo-secondary font-medium text-text-primary group-hover:text-text-primary">Cenário Focado</span>
                        {clickedOption === 'focused' ? <Check className="w-4 h-4 text-text-primary" /> : <ChevronRight className="w-4 h-4 text-text-muted group-hover:text-text-primary transition-transform duration-150 motion-reduce:transition-none group-hover:translate-x-0.5" />}
                      </div>
                      <p className="typo-caption text-text-muted mt-1 leading-relaxed">Campanha centrada em uma premissa, situação ou elenco específico, com maior peso em relações e acontecimentos daquele contexto.</p>
                    </div>
                  </button>
                </div>
                {/* Nota explicativa de Cenário Focado */}
                <div className="p-3 radius-medium bg-surface flex items-start gap-2.5 text-text-muted border border-border-subtle">
                  <Info className="w-4 h-4 text-text-muted shrink-0 mt-0.5" />
                  <p className="typo-caption leading-relaxed">
                    <strong className="text-text-secondary">Importante:</strong> “Cenário Focado” não significa mundo fechado ou história linear. O mundo continua existindo e os NPCs continuam autônomos.
                  </p>
                </div>
              </div>
            )}

            {selectedMode === 'world_basis' && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <h3 className="typo-section-heading text-text-primary">
                      Etapa 2 — Ambientação do Mundo
                    </h3>
                    <span className="typo-caption text-text-muted">
                      {campaignFormat === 'focused' ? 'Cenário Focado' : 'RPG Sandbox'}
                    </span>
                  </div>
                  <p className="text-text-secondary leading-relaxed typo-body">
                    Escolha a base do universo antes de definir o cenário e premissas.
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-3 pt-1">
                  {/* Opção Baseado no Mundo Real */}
                  <button
                    id="btn-world-basis-real-world"
                    type="button"
                    onClick={() => { setClickedOption('real_world'); setWorldBasis('real_world'); setTimeout(() => setSelectedMode('creation_method'), 150); }}
                    className={`p-4 radius-large border text-left transition-colors duration-150 motion-reduce:transition-none group cursor-pointer flex items-start gap-3.5 ${clickedOption === 'real_world' ? 'bg-surface-elevated border-border-strong ring-1 ring-border-strong' : 'bg-surface active:bg-surface-active active:border-border-strong sm:hover:bg-surface-hover sm:hover:border-border-strong border-border-subtle'}`}
                  >
                    <div className="flex items-center justify-center text-text-muted shrink-0 pt-0.5">
                      <Landmark className="w-5 h-5 text-text-secondary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="typo-secondary font-medium text-text-primary group-hover:text-text-primary">
                          Baseado no mundo real
                        </span>
                        {clickedOption === 'real_world' ? <Check className="w-4 h-4 text-text-primary" /> : <ChevronRight className="w-4 h-4 text-text-muted group-hover:text-text-primary transition-transform duration-150 motion-reduce:transition-none group-hover:translate-x-0.5" />}
                      </div>
                      <p className="typo-caption text-text-muted mt-1 leading-relaxed">
                        Lugares, cultura, rotina e contexto compatíveis com o mundo real. Sem magia, raças fantásticas ou tecnologias impossíveis sem pedido explícito.
                      </p>
                    </div>
                  </button>
                  {/* Opção Ficcional */}
                  <button
                    id="btn-world-basis-fictional"
                    type="button"
                    onClick={() => { setClickedOption('fictional'); setWorldBasis('fictional'); setTimeout(() => setSelectedMode('creation_method'), 150); }}
                    className={`p-4 radius-large border text-left transition-colors duration-150 motion-reduce:transition-none group cursor-pointer flex items-start gap-3.5 ${
                      clickedOption === 'fictional' ? 'bg-surface-elevated border-border-strong ring-1 ring-border-strong' : 'bg-surface active:bg-surface-active active:border-border-strong sm:hover:bg-surface-hover sm:hover:border-border-strong border-border-subtle'
                    }`}
                  >
                    <div className="flex items-center justify-center text-text-muted shrink-0 pt-0.5">
                      <Globe className="w-5 h-5 text-text-secondary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="typo-secondary font-medium text-text-primary group-hover:text-text-primary">
                          Ficcional
                        </span>
                        {clickedOption === 'fictional' ? <Check className="w-4 h-4 text-text-primary" /> : <ChevronRight className="w-4 h-4 text-text-muted group-hover:text-text-primary transition-transform duration-150 motion-reduce:transition-none group-hover:translate-x-0.5" />}
                      </div>
                      <p className="typo-caption text-text-muted mt-1 leading-relaxed">
                        Fantasia, ficção científica, mundos alternativos ou ambientações inventadas com total liberdade de elementos narrativos.
                      </p>
                    </div>
                  </button>
                </div>

                {/* Nota explicativa de World Basis */}
                <div className="p-3 radius-medium bg-surface flex items-start gap-2.5 text-text-muted border border-border-subtle">
                  <Info className="w-4 h-4 text-text-muted shrink-0 mt-0.5" />
                  <p className="typo-caption leading-relaxed">
                    <strong className="text-text-secondary">Nota:</strong> Tanto Cenário Focado quanto RPG Sandbox podem se passar no mundo real (cidades, hospitais, empresas, universidades) ou em cenários ficcionais.
                  </p>
                </div>
              </div>
            )}

            {/* ETAPA 3 — Como criar */}
            {selectedMode === 'creation_method' && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <h3 className="typo-section-heading text-text-primary">
                      {t.methodStepTitle}
                    </h3>
                    <div className="flex items-center gap-1.5 typo-caption text-text-muted">
                      <span>{t.formatBadge}</span>
                      <span>•</span>
                      <span>{t.basisBadge}</span>
                    </div>
                  </div>
                  <p className="text-text-secondary leading-relaxed typo-body">
                    {t.methodSubtitle}
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-2.5 pt-1">
                  {/* 1. Gerar opções */}
                  <button
                    id="btn-generate-scenarios"
                    type="button"
                    onClick={() => {
                      setSelectedMode('generate_options_choice');
                    }}
                    className="p-4 radius-large border text-left transition-colors duration-150 motion-reduce:transition-none group cursor-pointer flex items-start gap-3.5 bg-surface active:bg-surface-active active:border-border-strong sm:hover:bg-surface-hover sm:hover:border-border-strong border-border-subtle"
                  >
                    <div className="flex items-center justify-center text-text-muted shrink-0 pt-0.5">
                      <Sparkles className="w-5 h-5 text-text-secondary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="typo-secondary font-medium text-text-primary group-hover:text-text-primary">
                          Gerar opções
                        </span>
                        <ChevronRight className="w-4 h-4 text-text-muted group-hover:text-text-secondary transition-transform duration-150 motion-reduce:transition-none group-hover:translate-x-0.5" />
                      </div>
                      <p className="typo-caption text-text-muted mt-0.5 leading-normal">
                        {t.methodGenerateOptionsDesc}
                      </p>
                    </div>
                  </button>

                  {/* 2. Tenho uma ideia */}
                  <button
                    id="btn-custom-idea"
                    type="button"
                    onClick={() => setSelectedMode('custom_idea')}
                    className="p-4 radius-large border text-left transition-colors duration-150 motion-reduce:transition-none group cursor-pointer flex items-start gap-3.5 bg-surface active:bg-surface-active active:border-border-strong sm:hover:bg-surface-hover sm:hover:border-border-strong border-border-subtle"
                  >
                    <div className="flex items-center justify-center text-text-muted shrink-0 pt-0.5">
                      <Lightbulb className="w-5 h-5 text-text-secondary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="typo-secondary font-medium text-text-primary group-hover:text-text-primary">
                          Tenho uma ideia
                        </span>
                        <ChevronRight className="w-4 h-4 text-text-muted group-hover:text-text-secondary transition-transform duration-150 motion-reduce:transition-none group-hover:translate-x-0.5" />
                      </div>
                      <p className="typo-caption text-text-muted mt-0.5 leading-normal">
                        {t.methodCustomIdeaDesc}
                      </p>
                    </div>
                  </button>

                  {/* 3. Criar manualmente */}
                  <button
                    id="btn-create-manually"
                    type="button"
                    onClick={() => setSelectedMode('manual')}
                    className="p-4 radius-large border text-left transition-colors duration-150 motion-reduce:transition-none group cursor-pointer flex items-start gap-3.5 bg-surface active:bg-surface-active active:border-border-strong sm:hover:bg-surface-hover sm:hover:border-border-strong border-border-subtle"
                  >
                    <div className="flex items-center justify-center text-text-muted shrink-0 pt-0.5">
                      <Edit3 className="w-5 h-5 text-text-secondary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="typo-secondary font-medium text-text-primary group-hover:text-text-primary">
                          Criar manualmente
                        </span>
                        <ChevronRight className="w-4 h-4 text-text-muted group-hover:text-text-secondary transition-transform duration-150 motion-reduce:transition-none group-hover:translate-x-0.5" />
                      </div>
                      <p className="typo-caption text-text-muted mt-0.5 leading-normal">
                        {t.methodManualDesc}
                      </p>
                    </div>
                  </button>

                  {/* 4. Mestre escolhe tudo */}
                  <button
                    id="btn-master-picks-all"
                    type="button"
                    onClick={handleMasterPicksAll}
                    className="p-4 radius-large border text-left transition-colors duration-150 motion-reduce:transition-none group cursor-pointer flex items-start gap-3.5 bg-surface active:bg-surface-active active:border-border-strong sm:hover:bg-surface-hover sm:hover:border-border-strong border-border-subtle"
                  >
                    <div className="flex items-center justify-center text-text-muted shrink-0 pt-0.5">
                      <Compass className="w-5 h-5 text-text-secondary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="typo-secondary font-medium text-text-primary group-hover:text-text-primary">
                          Mestre escolhe tudo
                        </span>
                        <ChevronRight className="w-4 h-4 text-text-muted group-hover:text-text-secondary transition-transform duration-150 motion-reduce:transition-none group-hover:translate-x-0.5" />
                      </div>
                      <p className="typo-caption text-text-muted mt-0.5 leading-normal">
                        {t.methodMasterDesc}
                      </p>
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* ETAPA 2.1 — Gerar Opções: Escrever Ideia, Montar Premissa ou Surpresa */}
            {selectedMode === 'generate_options_choice' && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <h3 className="typo-section-heading text-text-primary">
                      Gerar Cenário
                    </h3>
                    <div className="flex items-center gap-1.5 typo-caption text-text-muted">
                      <span>{t.formatBadge}</span>
                      <span>•</span>
                      <span>{t.basisBadge}</span>
                    </div>
                  </div>
                  <p className="text-text-secondary leading-relaxed typo-body">
                    Defina o ponto de partida do universo através de escrita livre, opções guiadas ou geração espontânea.
                  </p>
                </div>

                {/* Seletor de Modo de Criação */}
                <div className="flex flex-wrap gap-1.5 p-1 radius-large bg-surface-subtle border border-border-subtle">
                  <button
                    type="button"
                    onClick={() => setPremiseInputMode('write')}
                    className={`flex-1 min-w-[120px] py-2 px-3 radius-medium typo-caption font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer ${
                      premiseInputMode === 'write'
                        ? 'bg-surface border border-border-strong text-text-primary shadow-xs'
                        : 'text-text-secondary hover:text-text-primary hover:bg-surface/50 border border-transparent'
                    }`}
                  >
                    <PenLine className="w-3.5 h-3.5 text-text-secondary" />
                    <span>Escrever minha ideia</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPremiseInputMode('guided')}
                    className={`flex-1 min-w-[120px] py-2 px-3 radius-medium typo-caption font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer ${
                      premiseInputMode === 'guided'
                        ? 'bg-surface border border-border-strong text-text-primary shadow-xs'
                        : 'text-text-secondary hover:text-text-primary hover:bg-surface/50 border border-transparent'
                    }`}
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5 text-text-secondary" />
                    <span>Montar uma premissa</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPremiseInputMode('surprise')}
                    className={`py-2 px-3 radius-medium typo-caption font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer ${
                      premiseInputMode === 'surprise'
                        ? 'bg-surface border border-border-strong text-text-primary shadow-xs'
                        : 'text-text-secondary hover:text-text-primary hover:bg-surface/50 border border-transparent'
                    }`}
                  >
                    <Shuffle className="w-3.5 h-3.5 text-text-secondary" />
                    <span>Surpreenda-me</span>
                  </button>
                </div>

                {/* MODO 1: Escrever minha ideia */}
                {premiseInputMode === 'write' && (
                  <div className="p-4 radius-large bg-surface-subtle border border-border-subtle flex flex-col gap-3">
                    <div className="space-y-1">
                      <h4 className="typo-secondary font-medium text-text-primary flex items-center gap-2">
                        <PenLine className="w-4 h-4 text-text-secondary" />
                        <span>Descreva o conceito da sua campanha</span>
                      </h4>
                      <p className="typo-caption text-text-muted leading-normal">
                        Você pode informar temas, dinâmicas interpessoais, locais, profissões ou estilo de mundo.
                      </p>
                    </div>

                    <div className="space-y-2 pt-0.5">
                      <textarea
                        id="input-premise-text"
                        value={generateOptionPremise}
                        onChange={(e) => setGenerateOptionPremise(e.target.value)}
                        placeholder={
                          isRealWorld
                            ? 'Ex.: Enemies to lovers realista de classe média-alta em high school nos Estados Unidos'
                            : 'Ex.: Fantasia de fronteira com rivalidade entre duas famílias de alquimistas mercantes'
                        }
                        className="w-full h-28 p-3 bg-surface border border-border-default focus:border-border-strong radius-medium typo-body text-text-primary placeholder:text-text-muted outline-none resize-none leading-relaxed transition-colors"
                      />
                      <div className="flex justify-between items-center pt-1">
                        <span className="typo-caption text-text-muted text-[11px]">
                          O Gemini preservará todos os requisitos especificados.
                        </span>
                        <Button
                          id="btn-generate-with-premise"
                          type="button"
                          variant="primary"
                          size="compact"
                          onClick={() => handleGenerateOptions('premise')}
                          disabled={!generateOptionPremise.trim() || isGeneratingScenarios}
                        >
                          {isGeneratingScenarios ? (
                            <Spinner size="xs" variant="primary" />
                          ) : (
                            <Sparkles className="w-4 h-4 mr-1.5" />
                          )}
                          <span>{isGeneratingScenarios ? 'Gerando variações...' : 'Gerar 3 variações'}</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* MODO 2: Montar uma premissa (Estruturado) */}
                {premiseInputMode === 'guided' && (
                  <div className="p-4 radius-large bg-surface-subtle border border-border-subtle space-y-4 max-h-none sm:max-h-[62vh] overflow-y-visible sm:overflow-y-auto pr-1">
                    <div className="space-y-0.5">
                      <h4 className="typo-secondary font-medium text-text-primary flex items-center gap-2">
                        <SlidersHorizontal className="w-4 h-4 text-text-secondary" />
                        <span>Combine os blocos da história</span>
                      </h4>
                      <p className="typo-caption text-text-muted">
                        Escolha os elementos fundamentais para que as 3 opções mantenham coesão e especificidade.
                      </p>
                    </div>

                    {/* 1. Foco / Tema da Premissa */}
                    <div className="space-y-1.5">
                      <label className="typo-caption font-semibold text-text-secondary uppercase tracking-wider block text-[11px]">
                        1. Foco da Premissa
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                        {[
                          { id: 'romance', label: 'Romance & Afeto', icon: Heart },
                          { id: 'investigation', label: 'Investigação / Mistério', icon: Search },
                          { id: 'drama', label: 'Drama & Convivência', icon: Users },
                          { id: 'career', label: 'Ambição & Carreira', icon: Briefcase },
                          { id: 'survival', label: 'Sobrevivência & Desafio', icon: Flame },
                          { id: 'adventure', label: 'Aventura & Exploração', icon: Swords },
                        ].map((item) => {
                          const IconComp = item.icon;
                          const isSelected = guidedFocus === item.id;
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => setGuidedFocus(item.id)}
                              className={`p-2.5 radius-medium border text-left flex items-center gap-2 transition-colors cursor-pointer ${
                                isSelected
                                  ? 'bg-surface border-border-strong text-text-primary shadow-xs'
                                  : 'bg-surface/60 border-border-subtle text-text-secondary hover:border-border-default hover:text-text-primary'
                              }`}
                            >
                              <IconComp className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-primary' : 'text-text-muted'}`} />
                              <span className="typo-caption font-medium truncate">{item.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* 2. Dinâmica / Relação Inicial */}
                    <div className="space-y-1.5">
                      <label className="typo-caption font-semibold text-text-secondary uppercase tracking-wider block text-[11px]">
                        2. Dinâmica Inicial
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                        {[
                          { id: 'enemies_to_lovers', label: 'Inimigos / Rivalidade', desc: 'Rivalidade inicial com atrito' },
                          { id: 'friends_to_lovers', label: 'Amigos de Longa Data', desc: 'Cumplicidade e proximidade' },
                          { id: 'forced_proximity', label: 'Parceria / Convivência', desc: 'Forçados a cooperar' },
                          { id: 'rivalry', label: 'Concorrência Direta', desc: 'Disputando a mesma meta' },
                          { id: 'strangers', label: 'Forasteiros em Choque', desc: 'Dois mundos opostos' },
                          { id: 'allies', label: 'Aliança de Interesse', desc: 'Pacto estratégico' },
                        ].map((item) => {
                          const isSelected = guidedDynamics === item.id;
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => setGuidedDynamics(item.id)}
                              className={`p-2.5 radius-medium border text-left flex flex-col gap-0.5 transition-colors cursor-pointer ${
                                isSelected
                                  ? 'bg-surface border-border-strong text-text-primary shadow-xs'
                                  : 'bg-surface/60 border-border-subtle text-text-secondary hover:border-border-default hover:text-text-primary'
                              }`}
                            >
                              <span className="typo-caption font-medium text-text-primary truncate">{item.label}</span>
                              <span className="typo-caption text-text-muted text-[10px] truncate">{item.desc}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* 3. Fase de Vida / Contexto */}
                    <div className="space-y-1.5">
                      <label className="typo-caption font-semibold text-text-secondary uppercase tracking-wider block text-[11px]">
                        3. Contexto & Fase de Vida
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                        {[
                          { id: 'high_school', label: 'Ensino Médio (High School)', icon: GraduationCap },
                          { id: 'college', label: 'Campus Universitário', icon: Landmark },
                          { id: 'young_adult', label: 'Jovens Adultos / Início', icon: User },
                          { id: 'career', label: 'Profissionais Estabelecidos', icon: Briefcase },
                          { id: 'guild', label: 'Guilda / Corporação', icon: Building2 },
                        ].map((item) => {
                          const IconComp = item.icon;
                          const isSelected = guidedLifeStage === item.id;
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => setGuidedLifeStage(item.id)}
                              className={`p-2.5 radius-medium border text-left flex items-center gap-2 transition-colors cursor-pointer ${
                                isSelected
                                  ? 'bg-surface border-border-strong text-text-primary shadow-xs'
                                  : 'bg-surface/60 border-border-subtle text-text-secondary hover:border-border-default hover:text-text-primary'
                              }`}
                            >
                              <IconComp className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-primary' : 'text-text-muted'}`} />
                              <span className="typo-caption font-medium truncate">{item.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* 4. Ambiente Social / Econômico */}
                    <div className="space-y-1.5">
                      <label className="typo-caption font-semibold text-text-secondary uppercase tracking-wider block text-[11px]">
                        4. Ambiente Socioeconômico
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                        {[
                          { id: 'middle_class', label: 'Classe Média / Subúrbio' },
                          { id: 'elite', label: 'Alta Sociedade / Elite' },
                          { id: 'working_class', label: 'Bairro Trabalhador' },
                          { id: 'metropolitan', label: 'Metrópole Agitada' },
                          { id: 'coastal', label: 'Cidade Costeira / Portuária' },
                        ].map((item) => {
                          const isSelected = guidedSocioeconomic === item.id;
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => setGuidedSocioeconomic(item.id)}
                              className={`p-2 radius-medium border text-center transition-colors cursor-pointer ${
                                isSelected
                                  ? 'bg-surface border-border-strong text-text-primary shadow-xs'
                                  : 'bg-surface/60 border-border-subtle text-text-secondary hover:border-border-default hover:text-text-primary'
                              }`}
                            >
                              <span className="typo-caption font-medium truncate block">{item.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* 5. Localização */}
                    <div className="space-y-1.5">
                      <label className="typo-caption font-semibold text-text-secondary uppercase tracking-wider block text-[11px]">
                        5. Região Geográfica
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                        {[
                          { id: 'usa', label: '🇺🇸 Estados Unidos' },
                          { id: 'brazil', label: '🇧🇷 Brasil' },
                          { id: 'japan', label: '🇯🇵 Japão' },
                          { id: 'europe', label: '🇪🇺 Europa' },
                          { id: 'medieval', label: '🏰 Fantasia / Medieval' },
                          { id: 'custom', label: '✏️ Outro Personalizado' },
                        ].map((item) => {
                          const isSelected = guidedLocation === item.id;
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => setGuidedLocation(item.id)}
                              className={`p-2 radius-medium border text-center transition-colors cursor-pointer ${
                                isSelected
                                  ? 'bg-surface border-border-strong text-text-primary shadow-xs'
                                  : 'bg-surface/60 border-border-subtle text-text-secondary hover:border-border-default hover:text-text-primary'
                              }`}
                            >
                              <span className="typo-caption font-medium truncate block">{item.label}</span>
                            </button>
                          );
                        })}
                      </div>

                      {guidedLocation === 'custom' && (
                        <div className="pt-1">
                          <input
                            type="text"
                            value={guidedCustomLocation}
                            onChange={(e) => setGuidedCustomLocation(e.target.value)}
                            placeholder="Digite a cidade, país ou região específica (ex: Londres, Reino Unido)"
                            className="w-full p-2.5 radius-medium bg-surface border border-border-default focus:border-border-strong typo-caption text-text-primary placeholder:text-text-muted outline-none transition-colors"
                          />
                        </div>
                      )}
                    </div>

                    {/* 6. Detalhes Adicionais Opcionais */}
                    <div className="space-y-1.5">
                      <label className="typo-caption font-semibold text-text-secondary uppercase tracking-wider block text-[11px]">
                        6. Nuance Específica (Opcional)
                      </label>
                      <input
                        type="text"
                        value={guidedAdditionalDetails}
                        onChange={(e) => setGuidedAdditionalDetails(e.target.value)}
                        placeholder="Ex: trabalham na mesma cafeteria; clube de robótica; rivalidade esportiva"
                        className="w-full p-2.5 radius-medium bg-surface border border-border-default focus:border-border-strong typo-caption text-text-primary placeholder:text-text-muted outline-none transition-colors"
                      />
                    </div>

                    {/* Prévia & Ação */}
                    <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-border-subtle">
                      <div className="text-[11px] text-text-muted leading-tight">
                        <span className="font-semibold text-text-secondary">Premissa: </span>
                        <span>
                          {guidedDynamics === 'enemies_to_lovers' ? 'Inimigos a amantes' : guidedDynamics === 'friends_to_lovers' ? 'Amigos de infância' : 'Parceria forçada'} •{' '}
                          {guidedLifeStage === 'high_school' ? 'High School' : guidedLifeStage === 'college' ? 'Faculdade' : 'Jovens adultos'} •{' '}
                          {guidedSocioeconomic === 'middle_class' ? 'Classe média' : 'Elite'} •{' '}
                          {guidedLocation === 'usa' ? 'EUA' : guidedLocation === 'brazil' ? 'Brasil' : guidedLocation === 'japan' ? 'Japão' : guidedLocation === 'custom' ? (guidedCustomLocation || 'Personalizado') : 'Europa'}
                        </span>
                      </div>

                      <Button
                        id="btn-generate-guided-premise"
                        type="button"
                        variant="primary"
                        size="compact"
                        onClick={() => handleGenerateOptions('guided')}
                        disabled={isGeneratingScenarios}
                      >
                        {isGeneratingScenarios ? (
                          <Spinner size="xs" variant="primary" />
                        ) : (
                          <Sparkles className="w-4 h-4 mr-1.5" />
                        )}
                        <span>{isGeneratingScenarios ? 'Gerando variações...' : 'Gerar 3 variações'}</span>
                      </Button>
                    </div>
                  </div>
                )}

                {/* MODO 3: Surpreenda-me */}
                {premiseInputMode === 'surprise' && (
                  <div className="p-4 radius-large bg-surface-subtle border border-border-subtle flex flex-col gap-3">
                    <div className="flex items-start gap-3">
                      <div className="flex items-center justify-center text-text-muted shrink-0 pt-0.5">
                        <Shuffle className="w-4 h-4 text-text-secondary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="typo-secondary font-medium text-text-primary">
                          Geração Espontânea
                        </h4>
                        <p className="typo-caption text-text-muted mt-0.5 leading-normal">
                          O Gemini criará 3 opções de universos e situações ricas e distintas, explorando caminhos variados para o formato escolhido.
                        </p>
                      </div>
                    </div>

                    <div className="flex justify-end pt-1">
                      <Button
                        id="btn-generate-surprise"
                        type="button"
                        variant="primary"
                        size="compact"
                        onClick={() => handleGenerateOptions('surprise')}
                        disabled={isGeneratingScenarios}
                      >
                        {isGeneratingScenarios ? (
                          <Spinner size="xs" variant="primary" />
                        ) : (
                          <Shuffle className="w-4 h-4 mr-1.5" />
                        )}
                        <span>{isGeneratingScenarios ? 'Gerando opções...' : 'Gerar 3 opções variadas'}</span>
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Modo: Ideia Customizada */}
            {selectedMode === 'custom_idea' && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <p className="text-text-secondary leading-relaxed typo-body">
                    {t.customIdeaSubtitle}
                  </p>
                </div>
                <Textarea
                  value={customIdeaText}
                  onChange={(e) => setCustomIdeaText(e.target.value)}
                  placeholder={t.customIdeaPlaceholder}
                  className="h-32 resize-none"
                />
                <div className="flex justify-end items-center pt-2">
                  <Button variant="primary" onClick={handleSubmitCustomIdea} disabled={!customIdeaText.trim() || isGeneratingFoundation}>Criar a partir da ideia</Button>
                </div>
              </div>
            )}

            {/* Modo: Gerar Cenários (Lista das 3 Opções Selecionáveis) */}
            {selectedMode === 'generate_scenarios' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="typo-section-heading text-text-primary">
                      Escolha um cenário
                    </h3>
                    <p className="typo-caption text-text-muted mt-0.5">
                      {generateOptionType === 'premise' || generateOptionType === 'guided'
                        ? '3 variações preservando com precisão os requisitos da sua premissa'
                        : '3 propostas distintas geradas pelo Gemini'}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 typo-caption text-text-muted">
                    <span>{t.formatBadge}</span>
                    <span>•</span>
                    <span>{t.basisBadge}</span>
                  </div>
                </div>

                {isGeneratingScenarios ? (
                  <LoadingState
                    message={
                      generateOptionType === 'premise' || generateOptionType === 'guided'
                        ? 'Gerando cenários a partir da premissa...'
                        : 'Gerando opções de cenários...'
                    }
                    size="md"
                    minHeight="min-h-[220px]"
                  />
                ) : generationError && scenarios.length === 0 ? (
                  <div
                    role="alert"
                    aria-live="polite"
                    className="p-3.5 radius-large bg-danger/10 border border-danger/30 flex items-start gap-3 text-xs"
                  >
                    <ShieldAlert className="w-4 h-4 text-danger shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <span className="font-semibold text-danger">Não foi possível gerar os cenários</span>
                      <p className="typo-caption text-text-secondary leading-relaxed">{generationError}</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {generationError && (
                      <div
                        role="alert"
                        aria-live="polite"
                        className="p-3.5 radius-large bg-danger/10 border border-danger/30 flex items-start gap-3 text-xs"
                      >
                        <ShieldAlert className="w-4 h-4 text-danger shrink-0 mt-0.5" />
                        <div className="space-y-0.5">
                          <span className="font-semibold text-danger">Erro ao preparar o cenário</span>
                          <p className="typo-caption text-text-secondary leading-relaxed">{generationError}</p>
                        </div>
                      </div>
                    )}
                    <div
                      role="radiogroup"
                      aria-label="Cenários disponíveis"
                      className="grid grid-cols-1 gap-4 max-h-none sm:max-h-[60vh] overflow-y-visible sm:overflow-y-auto pr-1"
                    >
                      {scenarios.map((scenario) => {
                        const isThisSelected = selectedScenarioId === scenario.id;
                        const isProcessing = isSelectingScenario || isGeneratingFoundation;

                        return (
                          <div
                            key={scenario.id}
                            id={`scenario-card-${scenario.id}`}
                            role="radio"
                            aria-checked={isThisSelected ? 'true' : 'false'}
                            tabIndex={isProcessing ? -1 : 0}
                            onClick={() => handleSelectScenarioCard(scenario)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                handleSelectScenarioCard(scenario);
                              }
                            }}
                            className={`p-4 radius-large bg-surface border transition-all flex flex-col gap-3 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-hidden select-none ${
                              isThisSelected
                                ? 'border-primary ring-2 ring-primary/40 bg-surface-elevated shadow-xs'
                                : isProcessing
                                  ? 'border-border-subtle opacity-60 pointer-events-none cursor-not-allowed'
                                  : 'border-border-subtle hover:border-border-strong hover:bg-surface-hover/40 cursor-pointer'
                            }`}
                            style={{ touchAction: 'manipulation' }}
                          >
                            <div className="space-y-2">
                              <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
                                <h3 className="typo-secondary font-semibold text-text-primary">{scenario.title}</h3>
                                {scenario.genre && (
                                  <span className="typo-caption text-text-muted text-xs shrink-0">
                                    {scenario.genre}
                                  </span>
                                )}
                              </div>

                              {scenario.setting && (
                                <div className="flex items-start gap-1.5 typo-caption text-text-secondary">
                                  <MapPin className="w-3.5 h-3.5 text-text-muted shrink-0 mt-0.5" />
                                  <span className="font-medium text-text-primary">{scenario.setting}</span>
                                </div>
                              )}

                              <p className="typo-caption text-text-secondary leading-relaxed">{scenario.description || scenario.premise}</p>

                              {(scenario.coreConflict || scenario.core_conflict) && (
                                <div className="p-2.5 radius-medium bg-surface-subtle border border-border-subtle typo-caption text-text-secondary space-y-0.5">
                                  <span className="font-semibold text-text-primary block text-[11px] uppercase tracking-wider">Conflito Central</span>
                                  <p className="text-text-secondary leading-relaxed">{scenario.coreConflict || scenario.core_conflict}</p>
                                </div>
                              )}
                            </div>

                            <div className="flex items-center justify-between gap-2 mt-auto pt-2">
                              {isThisSelected ? (
                                <div
                                  id={`badge-selected-${scenario.id}`}
                                  className="flex items-center gap-1.5 text-xs font-semibold text-primary px-3 py-1.5 radius-medium bg-primary/10 border border-primary/20"
                                >
                                  <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                                  <span>Selecionado</span>
                                </div>
                              ) : (
                                <Button
                                  id={`btn-select-scenario-${scenario.id}`}
                                  variant="secondary"
                                  size="compact"
                                  className="text-xs transition-colors"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSelectScenarioCard(scenario);
                                  }}
                                  disabled={isProcessing}
                                  aria-pressed={false}
                                >
                                  Selecionar
                                </Button>
                              )}

                              <IconButton 
                                variant="secondary"
                                title="Salvar na Biblioteca"
                                aria-label="Salvar na Biblioteca"
                                disabled={isProcessing || savedToLibraryIds[scenario.id]}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  saveToLibrary({
                                    title: scenario.title,
                                    premise: scenario.description || scenario.premise || '',
                                    description: scenario.description || scenario.premise || '',
                                    campaignFormat: campaignFormat!,
                                    worldBasis: worldBasis,
                                    genre: scenario.genre
                                  });
                                  setSavedToLibraryIds(prev => ({ ...prev, [scenario.id]: true }));
                                }}
                              >
                                {savedToLibraryIds[scenario.id] ? <CheckCircle2 className="w-4 h-4 text-success" /> : <BookMarked className="w-4 h-4 text-text-secondary" />}
                              </IconButton>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Ação Terciária: Novas Opções */}
                    <div className="pt-1 flex items-center justify-start">
                      <Button
                        id="btn-regenerate-scenarios"
                        variant="ghost"
                        size="compact"
                        className="text-text-muted hover:text-text-primary gap-1.5 font-normal"
                        onClick={() => {
                          if (isGeneratingScenarios || isGeneratingFoundation || isSelectingScenario) return;
                          handleGenerateOptions(generateOptionType || 'surprise');
                        }}
                        disabled={isGeneratingScenarios || isGeneratingFoundation || isSelectingScenario || selectionLockRef.current}
                      >
                        {isGeneratingScenarios ? (
                          <Spinner size="xs" variant="secondary" />
                        ) : (
                          <RefreshCw className="w-3.5 h-3.5 text-text-muted" />
                        )}
                        <span>{isGeneratingScenarios ? 'Gerando novas opções...' : 'Novas opções'}</span>
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Modo: Gerar Foundation */}
            {selectedMode === 'generate_foundation' && (
              <div className="space-y-4">
                {isGeneratingFoundation ? (
                  <LoadingState
                    message="Preparando detalhes do mundo..."
                    size="md"
                    minHeight="min-h-[220px]"
                  />
                ) : generationError ? (
                  <div
                    role="alert"
                    aria-live="polite"
                    className="p-3.5 radius-large bg-danger/10 border border-danger/30 flex items-start gap-3 text-xs"
                  >
                    <ShieldAlert className="w-4 h-4 text-danger shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <span className="font-semibold text-danger">Não foi possível preparar o mundo</span>
                      <p className="typo-caption text-text-secondary leading-relaxed">{generationError}</p>
                    </div>
                  </div>
                ) : foundation && selectedScenario ? (
                  <div className="flex flex-col gap-4 max-h-none sm:max-h-[60vh] overflow-y-visible sm:overflow-y-auto pr-1">
                    <div className="pb-4">
                      <div className="flex justify-between items-start gap-2 mb-2">
                        <div>
                          <h3 className="typo-secondary font-bold text-text-primary">{t.foundationHeaderTitle}: {selectedScenario.title}</h3>
                          <p className="text-xs text-text-muted italic mt-0.5">"{selectedScenario.worldIdentity}"</p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0 typo-caption text-text-muted">
                          <span>{t.formatBadge}</span>
                          <span>•</span>
                          <span>{t.basisBadge}</span>
                        </div>
                      </div>
                      
                      <div className="space-y-6 mt-6">
                        <div>
                          <h4 className="typo-secondary font-bold text-text-primary mb-1.5">
                            {t.foundationIdentityTitle}
                          </h4>
                          <p className="text-xs text-text-secondary leading-relaxed">{foundation.identityAndState}</p>
                        </div>
                        <div>
                          <h4 className="typo-secondary font-bold text-text-primary mb-1.5">
                            {t.foundationGeographyTitle}
                          </h4>
                          <p className="text-xs text-text-secondary leading-relaxed">{foundation.geography}</p>
                        </div>
                        <div>
                          <h4 className="typo-secondary font-bold text-text-primary mb-1.5">
                            {t.foundationEverydayTitle}
                          </h4>
                          <p className="text-xs text-text-secondary leading-relaxed">{foundation.everydayLife}</p>
                        </div>
                        <div>
                          <h4 className="typo-secondary font-bold text-text-primary mb-1.5">
                            {t.foundationMagicTitle}
                          </h4>
                          <p className="text-xs text-text-secondary leading-relaxed">{foundation.magicAndTechnology}</p>
                        </div>
                        <div>
                          <h4 className="typo-secondary font-bold text-text-primary mb-1.5">
                            {t.foundationEconomyTitle}
                          </h4>
                          <p className="text-xs text-text-secondary leading-relaxed">{foundation.economyAndLogistics}</p>
                        </div>
                        <div>
                          <h4 className="typo-secondary font-bold text-text-primary mb-1.5">
                            {t.foundationFactionsTitle}
                          </h4>
                          <p className="text-xs text-text-secondary leading-relaxed">{foundation.factionsAndPower}</p>
                        </div>
                        <div>
                          <h4 className="typo-secondary font-bold text-text-primary mb-1.5">
                            {t.foundationDangersTitle}
                          </h4>
                          <p className="text-xs text-text-secondary leading-relaxed">{foundation.dangersAndOpportunities}</p>
                        </div>
                        <div>
                          <h4 className="typo-secondary font-bold text-text-primary mb-1.5">
                            {t.foundationEventsTitle}
                          </h4>
                          <p className="text-xs text-text-secondary leading-relaxed">{foundation.currentEvents}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}

                <div className="flex flex-col-reverse sm:flex-row sm:justify-between sm:items-center gap-3 pt-2">
                  <Button
                    variant="ghost"
                    size="compact"
                    onClick={() => {
                      selectionLockRef.current = false;
                      setIsSelectingScenario(false);
                      setSelectedScenarioId(null);
                      if (foundationSourceMode === 'custom_idea') setSelectedMode('custom_idea');
                      else setSelectedMode('generate_scenarios');
                    }}
                    disabled={isGeneratingFoundation}
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Mudar cenário</span>
                  </Button>

                  {foundation && (
                    <div className="flex gap-2">
                      <Button variant="secondary" onClick={() => generateFoundationForScenario(selectedScenario!)} disabled={isGeneratingFoundation}>
                        Gerar novamente
                      </Button>
                      <Button
                        variant="primary"
                        onClick={handleConfirmFoundation}
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? 'Confirmando...' : 'Avançar para personagem'}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ETAPA — Modo: Mestre Escolhe Tudo (Proposta Completa + Foundation + Sugestões) */}
            {selectedMode === 'master_proposal' && (
              <div className="space-y-4">
                {isGeneratingMasterProposal ? (
                  <LoadingState
                    message="Preparando proposta de campanha..."
                    size="md"
                    minHeight="min-h-[220px]"
                  />
                ) : generationError ? (
                  <div
                    role="alert"
                    aria-live="polite"
                    className="p-3.5 radius-large bg-danger/10 border border-danger/30 flex flex-col gap-3 text-xs"
                  >
                    <div className="flex items-start gap-3">
                      <ShieldAlert className="w-4 h-4 text-danger shrink-0 mt-0.5" />
                      <div className="space-y-0.5">
                        <span className="font-semibold text-danger">Não foi possível gerar a proposta</span>
                        <p className="typo-caption text-text-secondary leading-relaxed">{generationError}</p>
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <Button
                        type="button"
                        variant="secondary"
                        size="compact"
                        onClick={handleMasterPicksAll}
                      >
                        Tentar novamente
                      </Button>
                    </div>
                  </div>
                ) : foundation && selectedScenario ? (
                  <div className="flex flex-col gap-4 max-h-none sm:max-h-[60vh] overflow-y-visible sm:overflow-y-auto pr-1">
                    {/* Header da Proposta */}
                    <div className="p-4 radius-large bg-surface-subtle border border-border-subtle">
                      <div className="flex justify-between items-start gap-2 mb-2">
                        <div>
                          <div className="flex items-center gap-2 mb-1 typo-caption text-text-muted">
                            <span>{t.formatBadge}</span>
                            <span>•</span>
                            <span>{t.basisBadge}</span>
                            {selectedScenario.tone && (
                              <>
                                <span>•</span>
                                <span>Tom: {selectedScenario.tone}</span>
                              </>
                            )}
                          </div>
                          <h3 className="typo-heading text-text-primary">{selectedScenario.title}</h3>
                          <p className="typo-caption text-text-muted italic mt-0.5">"{selectedScenario.worldIdentity}"</p>
                        </div>
                      </div>

                      <div className="mt-3 p-3 radius-medium bg-background/60 border border-border-subtle typo-secondary text-text-secondary leading-relaxed">
                        <strong>Premissa:</strong> {selectedScenario.description}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 mt-3 typo-caption text-text-muted">
                        <span><strong>Gênero:</strong> {selectedScenario.genre}</span>
                        <span>•</span>
                        <span><strong>{t.masterProposalLocationLabel}</strong> {selectedScenario.startingLocation}</span>
                      </div>

                      {selectedScenario.themeTags && selectedScenario.themeTags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2.5">
                          {selectedScenario.themeTags.map((tag) => (
                            <span key={tag} className="typo-caption px-1.5 py-0.5 bg-surface-elevated/60 text-text-muted radius-small">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Botão de Salvar na Biblioteca - Mestre Escolhe Tudo */}
                    <div className="flex justify-end mt-1 mb-2">
                      <button
                        type="button"
                        onClick={() => {
                          saveToLibrary({
                            title: selectedScenario.title,
                            premise: selectedScenario.description,
                            description: selectedScenario.description,
                            campaignFormat: campaignFormat!,
                            worldBasis: worldBasis,
                            genre: selectedScenario.genre,
                            foundation: foundation
                          });
                          setSavedToLibraryIds(prev => ({ ...prev, ['master_proposal']: true }));
                        }}
                        disabled={savedToLibraryIds['master_proposal']}
                        className="px-3 py-1.5 bg-surface-elevated hover:bg-surface-hover disabled:opacity-50 disabled:cursor-not-allowed text-text-secondary radius-medium typo-caption font-medium transition-colors flex items-center gap-2"
                      >
                        {savedToLibraryIds['master_proposal'] ? <CheckCircle2 className="w-4 h-4 text-success" /> : <BookMarked className="w-4 h-4" />}
                        {savedToLibraryIds['master_proposal'] ? 'Salvo na Biblioteca' : 'Salvar na Biblioteca'}
                      </button>
                    </div>

                    {/* Detalhes da Foundation Adaptativa */}
                    <div className="p-4 radius-large bg-surface-subtle border border-border-subtle space-y-4">
                      <h4 className="typo-section-heading text-text-secondary">
                        {t.foundationHeaderTitle}
                      </h4>

                      <div className="space-y-3.5">
                        <div>
                          <h5 className="typo-caption font-medium text-text-secondary mb-0.5">
                            {t.foundationIdentityTitle}
                          </h5>
                          <p className="typo-secondary text-text-secondary leading-relaxed">{foundation.identityAndState}</p>
                        </div>

                        <div>
                          <h5 className="typo-caption font-medium text-text-secondary mb-0.5">
                            {t.foundationGeographyTitle}
                          </h5>
                          <p className="typo-secondary text-text-secondary leading-relaxed">{foundation.geography}</p>
                        </div>

                        <div>
                          <h5 className="typo-caption font-medium text-text-secondary mb-0.5">
                            {t.foundationEverydayTitle}
                          </h5>
                          <p className="typo-secondary text-text-secondary leading-relaxed">{foundation.everydayLife}</p>
                        </div>

                        <div>
                          <h5 className="typo-caption font-medium text-text-secondary mb-0.5">
                            {t.foundationMagicTitle}
                          </h5>
                          <p className="typo-secondary text-text-secondary leading-relaxed">{foundation.magicAndTechnology}</p>
                        </div>

                        <div>
                          <h5 className="typo-caption font-medium text-text-secondary mb-0.5">
                            {t.foundationEconomyTitle}
                          </h5>
                          <p className="typo-secondary text-text-secondary leading-relaxed">{foundation.economyAndLogistics}</p>
                        </div>

                        <div>
                          <h5 className="typo-caption font-medium text-text-secondary mb-0.5">
                            {t.foundationFactionsTitle}
                          </h5>
                          <p className="typo-secondary text-text-secondary leading-relaxed">{foundation.factionsAndPower}</p>
                        </div>

                        <div>
                          <h5 className="typo-caption font-medium text-text-secondary mb-0.5">
                            {t.foundationDangersTitle}
                          </h5>
                          <p className="typo-secondary text-text-secondary leading-relaxed">{foundation.dangersAndOpportunities}</p>
                        </div>

                        <div>
                          <h5 className="typo-caption font-medium text-text-secondary mb-0.5">
                            {t.foundationEventsTitle}
                          </h5>
                          <p className="typo-secondary text-text-secondary leading-relaxed">{foundation.currentEvents}</p>
                        </div>
                      </div>
                    </div>

                    {/* Seção de Personagem — Escolha do Jogador */}
                    <div className="p-4 radius-large bg-surface-subtle/90 border border-border-strong space-y-3">
                      <div>
                        <h4 className="typo-section-heading text-text-primary flex items-center gap-2">
                          <User className="w-4 h-4 text-text-secondary" />
                          Personagem do Jogador
                        </h4>
                        <p className="typo-caption text-text-muted mt-1 leading-relaxed">
                          O Mestre não impõe um personagem pronto. Você mantém total agência. Escolha como prefere prosseguir:
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                        <Button
                          type="button"
                          variant="primary"
                          onClick={() => setSelectedMode('character_identity')}
                          className="flex items-center justify-center gap-1.5"
                        >
                          <Edit3 className="w-4 h-4" />
                          <span>Criar meu personagem</span>
                        </Button>

                        <Button
                          type="button"
                          variant="secondary"
                          onClick={handleSuggestCharacterConcepts}
                          disabled={isGeneratingConcepts}
                          className="flex items-center justify-center gap-1.5"
                        >
                          {isGeneratingConcepts ? (
                            <Spinner size="xs" variant="secondary" />
                          ) : (
                            <Sparkles className="w-4 h-4 text-text-secondary" />
                          )}
                          <span>{isGeneratingConcepts ? 'Sugerindo conceitos...' : 'Sugerir 3 conceitos'}</span>
                        </Button>
                      </div>

                      {conceptsError && (
                        <div
                          role="alert"
                          aria-live="polite"
                          className="p-2 radius-medium bg-danger/10 border border-danger/30 typo-caption text-danger mt-1 flex items-center justify-between"
                        >
                          <span>{conceptsError}</span>
                          <button
                            onClick={() => setConceptsError(null)}
                            className="text-text-muted hover:text-danger typo-caption"
                          >
                            Fechar
                          </button>
                        </div>
                      )}

                      {/* Lista de Conceitos Sugeridos */}
                      {characterConcepts.length > 0 && (
                        <div className="space-y-2.5 pt-2 border-t border-border-subtle mt-3">
                          <div className="flex items-center justify-between">
                            <span className="typo-caption font-medium text-text-secondary">
                              3 Conceitos Sugeridos (Opcionais)
                            </span>
                            <span className="typo-caption text-text-muted">
                              Clique para usar como base
                            </span>
                          </div>

                          <div className="grid grid-cols-1 gap-2.5">
                            {characterConcepts.map((item, idx) => (
                              <div
                                key={item.id || idx}
                                className="p-4 radius-large bg-surface border border-border-subtle hover:border-border-strong transition-colors duration-150 motion-reduce:transition-none flex flex-col gap-3 group cursor-default"
                              >
                                <div>
                                  <span className="typo-secondary font-medium text-text-primary">{item.suggestedRole}</span>
                                  <p className="typo-caption text-text-secondary mt-0.5 leading-relaxed">{item.concept}</p>
                                </div>
                                <div className="typo-caption text-text-muted space-y-0.5 bg-surface-subtle/60 p-2 radius-medium border border-border-subtle/60">
                                  <p><strong>Motivação:</strong> {item.hook}</p>
                                  {item.suggestedEquipment && (
                                    <p><strong>Pertences:</strong> {item.suggestedEquipment}</p>
                                  )}
                                  {item.suggestedStats && (
                                    <p><strong>Competências:</strong> {item.suggestedStats}</p>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleApplyCharacterConcept(item)}
                                  className="w-full py-1.5 px-3 bg-surface-elevated hover:bg-surface-hover text-text-secondary radius-medium typo-caption font-medium transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5 text-text-secondary" />
                                  Usar este conceito como ponto de partida
                                </button>
                              </div>
                            ))}
                          </div>
                          <p className="typo-caption text-text-muted italic text-center pt-1">
                            Você poderá alterar nome, detalhes e qualquer campo na etapa seguinte.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : null}

                {/* Ações inferiores */}
                <div className="flex flex-col-reverse sm:flex-row sm:justify-between sm:items-center gap-3 pt-2">
                  <Button variant="ghost" size="compact" onClick={() => setSelectedMode('creation_method')} disabled={isGeneratingMasterProposal}>
                    <ArrowLeft className="w-4 h-4" />
                    <span>Mudar método</span>
                  </Button>

                  {foundation && (
                    <div className="flex gap-2">
                      <Button variant="secondary" onClick={handleMasterPicksAll} disabled={isGeneratingMasterProposal}>
                        {isGeneratingMasterProposal ? (
                          <Spinner size="xs" variant="secondary" />
                        ) : (
                          <RefreshCw className="w-4 h-4" />
                        )}
                        <span>{isGeneratingMasterProposal ? 'Gerando...' : 'Gerar novamente'}</span>
                      </Button>
                      <Button
                        variant="primary"
                        onClick={() => setSelectedMode('character_identity')}
                        disabled={isSubmitting}
                      >
                        Criar meu personagem
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Modo: Criar Manualmente Form */}
            {selectedMode === 'manual' && (
              <form onSubmit={handleManualSubmit} className="space-y-3.5">
                {manualValidationError && (
                  <div className="flex items-center gap-2 text-danger text-xs font-medium bg-danger/10 p-2.5 radius-medium border border-danger/20">
                    <ShieldAlert className="w-4 h-4 shrink-0" />
                    <span>{manualValidationError}</span>
                  </div>
                )}
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    id="new-campaign-title-input"
                    label={<span>Título <span className="font-normal text-text-muted">(opcional)</span></span>}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={t.manualTitlePlaceholder}
                  />
                  <div>
                    <label className="typo-caption font-medium text-text-muted ml-0.5">
                      {t.manualGenreLabel} <span className="font-normal text-text-muted">(opcional)</span>
                    </label>
                    <select
                      id="new-campaign-genre-select"
                      value={genre}
                      onChange={(e) => {
                        setGenre(e.target.value);
                        if (manualValidationError) setManualValidationError(null);
                      }}
                      className="w-full h-10 px-2.5 mt-1.5 bg-surface-subtle border border-border-strong focus:border-accent radius-large typo-secondary text-text-primary outline-none cursor-pointer"
                    >
                      <option value="">Selecione um gênero (opcional)</option>
                      <option value="Alta Fantasia">Alta Fantasia</option>
                      <option value="Dark Fantasy">Dark Fantasy</option>
                      <option value="Cyberpunk">Cyberpunk</option>
                      <option value="Ficção Científica">Ficção Científica</option>
                      <option value="Investigação / Horror">Investigação / Horror</option>
                      <option value="Mundo Aberto Livre">Mundo Aberto Livre</option>
                      {isRealWorld && (
                        <>
                          <option value="Vida Real Urbana">Vida Real Urbana</option>
                          <option value="Drama Médico">Drama Médico</option>
                          <option value="Sobrevivência Moderna">Sobrevivência Moderna</option>
                          <option value="Exploração Documental">Exploração Documental</option>
                        </>
                      )}
                    </select>
                  </div>
                </div>

                <Textarea
                  label={t.manualPremiseLabel}
                  value={premise}
                  onChange={(e) => {
                    setPremise(e.target.value);
                    if (manualValidationError) setManualValidationError(null);
                  }}
                  placeholder={t.manualPremisePlaceholder}
                  className="h-20 resize-none"
                />
                
                <Textarea
                  label={<span>{t.manualRulesLabel} <span className="font-normal text-text-muted">(opcional)</span></span>}
                  value={rulesOfUniverse}
                  onChange={(e) => setRulesOfUniverse(e.target.value)}
                  placeholder={t.manualRulesPlaceholder}
                  className="h-20 resize-none"
                />

                <div>
                  <label className="block typo-caption font-medium text-text-muted mb-1">
                    {t.manualLocationLabel}
                  </label>
                  <input
                    id="new-campaign-location-input"
                    type="text"
                    value={startingLocation}
                    onChange={(e) => setStartingLocation(e.target.value)}
                    placeholder={t.manualLocationPlaceholder}
                    className="w-full h-9 px-3 bg-surface-subtle/80 border border-border-strong focus:border-accent radius-large text-xs text-text-primary placeholder:text-text-muted outline-none"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <Button
                    id="btn-manual-advance-to-character"
                    type="submit"
                    variant="primary"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Avançando...' : 'Definir personagem'}
                  </Button>
                </div>
              </form>
            )}

            {/* Modo: Criação de Personagem - Identidade */}
            {selectedMode === 'character_identity' && (
              <form onSubmit={handleAdvanceCharacter} className="space-y-4">
                <div className="space-y-1.5">
                  <h3 className="typo-section-heading text-text-primary">Personagem: Identidade</h3>
                  <p className="text-text-secondary leading-relaxed typo-body">
                    {t.charIdentitySubtitle}
                  </p>
                </div>
                {charValidationError && (
                  <div
                    id="character-validation-error"
                    role="alert"
                    aria-live="polite"
                    className="p-3 radius-large bg-danger-subtle border border-danger/30 flex items-start gap-2 text-xs"
                  >
                    <span className="font-semibold text-danger">{charValidationError}</span>
                  </div>
                )}
                <div className="space-y-3">
                  <div>
                    <label htmlFor="char-name-input" className="block typo-caption font-medium text-text-muted mb-1">
                      Nome *
                    </label>
                    <input 
                      id="char-name-input"
                      type="text" 
                      value={playerName} 
                      onChange={(e) => {
                        setPlayerName(e.target.value);
                        if (charValidationError) setCharValidationError(null);
                      }} 
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAdvanceCharacter();
                        }
                      }}
                      placeholder={t.charNamePlaceholder} 
                      className="w-full h-10 px-3 bg-surface-subtle border border-border-default focus:border-border-strong radius-medium typo-body text-text-primary outline-none transition-colors" 
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="char-age-input" className="block typo-caption font-medium text-text-muted mb-1">
                        Idade (Opcional)
                      </label>
                      <input 
                        id="char-age-input"
                        type="text" 
                        value={charAge} 
                        onChange={(e) => setCharAge(e.target.value)} 
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAdvanceCharacter();
                          }
                        }}
                        placeholder="Ex: 28" 
                        className="w-full h-10 px-3 bg-surface-subtle border border-border-default focus:border-border-strong radius-medium typo-body text-text-primary outline-none transition-colors" 
                      />
                    </div>
                    <div>
                      <label htmlFor="char-pronouns-input" className="block typo-caption font-medium text-text-muted mb-1">
                        Gênero/Pronomes (Opcional)
                      </label>
                      <input 
                        id="char-pronouns-input"
                        type="text" 
                        value={charPronouns} 
                        onChange={(e) => setCharPronouns(e.target.value)} 
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAdvanceCharacter();
                          }
                        }}
                        placeholder="Ex: Ele/Dele, Ela/Dela" 
                        className="w-full h-10 px-3 bg-surface-subtle border border-border-default focus:border-border-strong radius-medium typo-body text-text-primary outline-none transition-colors" 
                      />
                    </div>
                  </div>
                  <Input
                    id="char-concept-input"
                    label={<span>Conceito Curto <span className="font-normal text-text-muted">(opcional)</span></span>}
                    value={charConcept}
                    onChange={(e) => setCharConcept(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAdvanceCharacter();
                      }
                    }}
                    placeholder={t.charConceptPlaceholder}
                  />
                </div>
                <div className="flex justify-end pt-2">
                  <Button 
                    id="btn-advance-character"
                    data-testid="btn-advance-character"
                    type="submit" 
                    variant="primary" 
                    disabled={isAdvancingCharacter}
                    aria-busy={isAdvancingCharacter ? 'true' : 'false'}
                    className="min-w-[170px]"
                  >
                    {isAdvancingCharacter ? (
                      <>
                        <Spinner size="xs" variant="primary" className="mr-1.5" />
                        <span>Preparando personagem...</span>
                      </>
                    ) : (
                      'Avançar personagem'
                    )}
                  </Button>
                </div>
              </form>
            )}

            {/* Modo: Criação de Personagem - Aparência */}
            {selectedMode === 'character_appearance' && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <h3 className="typo-section-heading text-text-primary">Personagem: Aparência</h3>
                  <p className="text-text-secondary leading-relaxed typo-body">
                    {t.charAppearanceSubtitle}
                  </p>
                </div>
                <div className="space-y-3">
                  <Textarea
                    label={<span>Descrição Física Livre <span className="font-normal text-text-muted">(opcional)</span></span>}
                    value={charAppearance}
                    onChange={(e) => setCharAppearance(e.target.value)}
                    placeholder={t.charAppearancePlaceholder}
                    className="h-20 resize-none"
                  />
                  <Input
                    label={<span>Características Marcantes <span className="font-normal text-text-muted">(opcional)</span></span>}
                    value={charFeatures}
                    onChange={(e) => setCharFeatures(e.target.value)}
                    placeholder={t.charFeaturesPlaceholder}
                  />
                </div>
                <div className="flex justify-end pt-2">
                  <Button variant="primary" onClick={() => setSelectedMode('character_origin')}>Avançar para origem</Button>
                </div>
              </div>
            )}

            {/* Modo: Criação de Personagem - Origem e Contexto */}
            {selectedMode === 'character_origin' && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <h3 className="typo-section-heading text-text-primary">
                    {t.charOriginTitle}
                  </h3>
                  <p className="text-text-secondary leading-relaxed typo-body">
                    {t.charOriginSubtitle}
                  </p>
                </div>

                <div className="space-y-3 max-h-none sm:max-h-[50vh] overflow-y-visible sm:overflow-y-auto pr-1">
                  <Input
                    label={<span>Ocupação / Papel no Cenário <span className="font-normal text-text-muted">(opcional)</span></span>}
                    value={charOccupation}
                    onChange={(e) => setCharOccupation(e.target.value)}
                    placeholder={t.charOccupationPlaceholder}
                  />
                  <Textarea
                    label={<span>Origem / Histórico <span className="font-normal text-text-muted">(opcional)</span></span>}
                    value={charOrigin}
                    onChange={(e) => setCharOrigin(e.target.value)}
                    placeholder={t.charOriginPlaceholder}
                    className="h-16 resize-none"
                  />
                  <Textarea
                    label={<span>Rotina / Planejamento <span className="font-normal text-text-muted">(opcional)</span></span>}
                    value={charRoutine}
                    onChange={(e) => setCharRoutine(e.target.value)}
                    placeholder={t.charRoutinePlaceholder}
                    className="h-16 resize-none"
                  />
                  <Textarea
                    label={<span>Relações Pré-existentes / Contatos <span className="font-normal text-text-muted">(opcional)</span></span>}
                    value={charRelationships}
                    onChange={(e) => setCharRelationships(e.target.value)}
                    placeholder={t.charRelationshipsPlaceholder}
                    className="h-16 resize-none"
                  />
                  <Textarea
                    label={<span>Objetivos Pessoais <span className="font-normal text-text-muted">(opcional)</span></span>}
                    value={charGoals}
                    onChange={(e) => setCharGoals(e.target.value)}
                    placeholder="O que você busca alcançar no momento? Qual a sua meta na jornada?"
                    className="h-14 resize-none"
                  />
                  
                  {isFocused && (
                    <p className="typo-caption text-text-secondary leading-relaxed border-l-2 border-border-default pl-3 py-1">
                      <strong className="text-text-primary font-medium">Nota:</strong> Relações prévias e contexto estabelecem o ponto de partida. Sentimentos, atração, confiança ou reciprocidade não são decididos por dados ou automatismos — eles se desenvolvem organicamente pelas escolhas do jogador.
                    </p>
                  )}
                </div>

                <div className="flex justify-end pt-2">
                  <Button 
                    type="button" 
                    variant="primary"
                    onClick={() => { 
                      if (campaignFormat === 'focused') {
                        setSelectedMode('character_equipment');
                      } else {
                        setSelectedMode('character_stats');
                      }
                    }} 
                  >
                    {campaignFormat === 'focused' ? 'Avançar para pertences' : 'Avançar para competências'}
                  </Button>
                </div>
              </div>
            )}

            {/* Modo: Criação de Personagem - Atributos e Perícias (Apenas Sandbox) */}
            {selectedMode === 'character_stats' && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <h3 className="typo-section-heading text-text-primary">Personagem: Atributos e Perícias</h3>
                  <p className="text-text-secondary leading-relaxed typo-body">
                    Como o formato é Sandbox / D20, você pode listar as competências e capacidades do seu personagem.
                  </p>
                </div>
                <div className="space-y-3">
                  <Textarea
                    label={<span>Atributos ou Perícias Principais <span className="font-normal text-text-muted">(opcional)</span></span>}
                    value={charStats}
                    onChange={(e) => setCharStats(e.target.value)}
                    placeholder="Ex: Força Alta, Furtividade excelente, Percepção apurada. Ou se preferir numérico: FOR 16, DES 14, SAB 12..."
                    className="h-28 resize-none"
                  />
                </div>
                <div className="flex justify-end pt-2">
                  <Button variant="primary" onClick={() => setSelectedMode('character_equipment')}>Avançar para pertences</Button>
                </div>
              </div>
            )}

            {/* Modo: Criação de Personagem - Equipamento / Pertences */}
            {selectedMode === 'character_equipment' && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <h3 className="typo-section-heading text-text-primary">
                    {t.charEquipmentLabel}
                  </h3>
                  <p className="text-text-secondary leading-relaxed typo-body">
                    {t.charEquipmentSubtitle}
                  </p>
                </div>
                <div className="space-y-3">
                  <Textarea
                    label={<span>{t.charEquipmentLabel}</span>}
                    value={charEquipment}
                    onChange={(e) => setCharEquipment(e.target.value)}
                    placeholder={t.charEquipmentPlaceholder}
                    className="h-28 resize-none"
                  />
                </div>
                <div className="flex justify-end pt-2">
                  <Button variant="primary" onClick={() => setSelectedMode('character_review')}>Revisar personagem</Button>
                </div>
              </div>
            )}

            {/* Modo: Criação de Personagem - Revisão */}
            {selectedMode === 'character_review' && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <h3 className="typo-section-heading text-text-primary">Resumo do Personagem</h3>
                  <p className="text-text-secondary leading-relaxed typo-body">
                    Confira os detalhes de {playerName} ({t.formatBadge}).
                  </p>
                </div>
                
                <div className="space-y-4 max-h-none sm:max-h-[50vh] overflow-y-visible sm:overflow-y-auto">
                  <div className="space-y-2">
                    <h4 className="typo-section-heading text-text-primary">Identidade do Personagem</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-4 typo-secondary">
                      <div className="col-span-1 sm:col-span-2"><span className="text-text-muted">Nome:</span> <span className="text-text-primary font-medium">{playerName}</span></div>
                      <div><span className="text-text-muted">Idade:</span> <span className="text-text-primary font-medium">{charAge || '-'}</span></div>
                      <div><span className="text-text-muted">Pronomes:</span> <span className="text-text-primary font-medium">{charPronouns || '-'}</span></div>
                      <div className="col-span-1 sm:col-span-2"><span className="text-text-muted">Conceito:</span> <span className="text-text-primary font-medium">{charConcept || '-'}</span></div>
                    </div>
                  </div>
                  <Divider />
                  <div className="space-y-2">
                    <h4 className="typo-section-heading text-text-primary">Detalhes</h4>
                    <div className="space-y-2 typo-secondary">
                      <div><span className="text-text-muted">Aparência:</span> <span className="text-text-primary font-medium">{charAppearance || '-'}</span></div>
                      <div><span className="text-text-muted">Personalidade:</span> <span className="text-text-primary font-medium">{charFeatures || '-'}</span></div>
                      <div><span className="text-text-muted">Equipamento:</span> <span className="text-text-primary font-medium">{charEquipment || '-'}</span></div>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col-reverse sm:flex-row sm:justify-between gap-3 pt-2">
                  <Button variant="ghost" onClick={() => setSelectedMode('character_equipment')}>
                    Voltar
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    onClick={() => {
                      if (!mechanicalProfile) {
                        if (campaignFormat === 'focused') setMechanicalProfile('FOCUSED_REALISM');
                        else setMechanicalProfile('SANDBOX_D20');
                      }
                      
                      if (!masterResponseLength) setMasterResponseLength('medium');
                      if (!masterPacing) setMasterPacing(campaignFormat === 'focused' ? 'slow' : 'balanced');
                      if (!masterDescriptionLevel) setMasterDescriptionLevel('medium');
                      if (!masterFocus) setMasterFocus(campaignFormat === 'focused' ? 'relationships' : 'exploration');
                      if (!masterTone) setMasterTone(campaignFormat === 'focused' ? 'realistic' : 'adventurous');

                      setSelectedMode('master_preferences');
                    }}
                  >
                    Concluir Personagem
                  </Button>
                </div>
              </div>
            )}
            
            {/* Modo: Perfil Mecânico */}
            {selectedMode === 'mechanical_profile' && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <h3 className="typo-section-heading text-text-primary">Perfil Mecânico</h3>
                  <p className="text-text-secondary leading-relaxed typo-body">
                    Defina as regras mecânicas da sua campanha.
                  </p>
                </div>

                {mechValidationError && (
                  <div className="p-3 radius-large bg-danger-subtle border border-danger/30 flex items-start gap-2 text-xs">
                    <span className="font-semibold text-danger">{mechValidationError}</span>
                  </div>
                )}

                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => { setMechanicalProfile('SANDBOX_D20'); setMechValidationError(null); }}
                    className={`w-full p-4 radius-large border text-left transition-colors duration-150 motion-reduce:transition-none cursor-pointer ${
                      mechanicalProfile === 'SANDBOX_D20' || mechanicalProfile === 'd20'
                        ? 'bg-surface-elevated border-border-strong ring-1 ring-border-strong'
                        : 'bg-surface-subtle border-border-subtle hover:border-border-default'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="typo-secondary font-medium text-text-primary">Sandbox / D20</span>
                      {(mechanicalProfile === 'SANDBOX_D20' || mechanicalProfile === 'd20') && (
                        <Check className="w-4 h-4 text-text-primary shrink-0" />
                      )}
                    </div>
                    <ul className="typo-caption text-text-secondary leading-relaxed list-disc list-inside space-y-1">
                      <li>Testes com D20 para ações incertas e desafiadoras.</li>
                      <li>Ações triviais têm sucesso automático; impossíveis não ganham chance por rolagem.</li>
                    </ul>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setMechanicalProfile('FOCUSED_REALISM'); setMechValidationError(null); }}
                    className={`w-full p-4 radius-large border text-left transition-colors duration-150 motion-reduce:transition-none cursor-pointer ${
                      mechanicalProfile === 'FOCUSED_REALISM' || mechanicalProfile === 'realistic'
                        ? 'bg-surface-elevated border-border-strong ring-1 ring-border-strong'
                        : 'bg-surface-subtle border-border-subtle hover:border-border-default'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="typo-secondary font-medium text-text-primary">Focado / Realismo</span>
                      {(mechanicalProfile === 'FOCUSED_REALISM' || mechanicalProfile === 'realistic') && (
                        <Check className="w-4 h-4 text-text-primary shrink-0" />
                      )}
                    </div>
                    <ul className="typo-caption text-text-secondary leading-relaxed list-disc list-inside space-y-1">
                      <li>Diálogos, relações, atração e confiança dependem puramente das escolhas e contexto.</li>
                      <li>D20 reservado para testes físicos de risco real e imprevisibilidade.</li>
                    </ul>
                  </button>

                  <div className={`w-full p-4 radius-large border transition-colors duration-150 motion-reduce:transition-none ${
                    mechanicalProfile === 'custom'
                      ? 'bg-surface-elevated border-border-strong ring-1 ring-border-strong'
                      : 'bg-surface-subtle border-border-subtle'
                  }`}>
                    <button
                      type="button"
                      onClick={() => { setMechanicalProfile('custom'); setMechValidationError(null); }}
                      className="w-full text-left cursor-pointer"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="typo-secondary font-medium text-text-primary">Personalizado</span>
                        {mechanicalProfile === 'custom' && (
                          <Check className="w-4 h-4 text-text-primary shrink-0" />
                        )}
                      </div>
                      <p className="typo-caption text-text-secondary leading-relaxed">
                        Descreva as regras mecânicas e critérios de resolução para a sua campanha.
                      </p>
                    </button>
                    {mechanicalProfile === 'custom' && (
                      <textarea
                        value={customMechanicalText}
                        onChange={(e) => { setCustomMechanicalText(e.target.value); setMechValidationError(null); }}
                        placeholder="Ex: Todas as rolagens devem ser feitas baseadas em 3d6..."
                        className="mt-3 w-full h-20 p-3 bg-surface-subtle border border-border-default focus:border-border-strong radius-medium typo-body text-text-primary placeholder:text-text-muted outline-none resize-none leading-relaxed transition-colors"
                      />
                    )}
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    type="button"
                    variant="primary"
                    onClick={() => {
                      if (!mechanicalProfile) {
                        setMechValidationError('Por favor, selecione um perfil mecânico.');
                        return;
                      }
                      if (mechanicalProfile === 'custom' && !customMechanicalText.trim()) {
                        setMechValidationError('Por favor, descreva as regras personalizadas.');
                        return;
                      }
                      
                      // Definir valores padrão caso o usuário ainda não tenha acessado
                      if (!masterResponseLength) setMasterResponseLength('medium');
                      if (!masterPacing) setMasterPacing(campaignFormat === 'focused' ? 'slow' : 'balanced');
                      if (!masterDescriptionLevel) setMasterDescriptionLevel('medium');
                      if (!masterFocus) setMasterFocus(campaignFormat === 'focused' ? 'relationships' : 'exploration');
                      if (!masterTone) setMasterTone(campaignFormat === 'focused' ? 'realistic' : 'adventurous');

                      setSelectedMode('master_preferences');
                    }}
                  >
                    Definir estilo do Mestre
                  </Button>
                </div>
              </div>
            )}

            
            {/* Modo: Preferências do Mestre */}
            {selectedMode === 'master_preferences' && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <h3 className="typo-section-heading text-text-primary">Preferências Narrativas</h3>
                  <p className="text-text-secondary leading-relaxed typo-body">
                    Ajuste o estilo de narração e o comportamento do Mestre.
                  </p>
                </div>

                <div className="space-y-3 max-h-none sm:max-h-[50vh] overflow-y-visible sm:overflow-y-auto pr-1">
                  <div>
                    <label className="block typo-caption font-medium text-text-muted mb-1.5">Tamanho da Resposta</label>
                    <Tabs
                      fullWidth
                      activeTab={masterResponseLength || 'medium'}
                      onChange={(id) => setMasterResponseLength(id as any)}
                      tabs={[
                        { id: 'short', label: 'Curta' },
                        { id: 'medium', label: 'Média' },
                        { id: 'long', label: 'Longa' }
                      ]}
                    />
                  </div>
                  <div>
                    <label className="block typo-caption font-medium text-text-muted mb-1.5">Ritmo</label>
                    <Tabs
                      fullWidth
                      activeTab={masterPacing || 'balanced'}
                      onChange={(id) => setMasterPacing(id as any)}
                      tabs={[
                        { id: 'slow', label: 'Lento' },
                        { id: 'balanced', label: 'Equilibrado' },
                        { id: 'fast', label: 'Rápido' }
                      ]}
                    />
                  </div>
                  <div>
                    <label className="block typo-caption font-medium text-text-muted mb-1.5">Nível de Descrição</label>
                    <Tabs
                      fullWidth
                      activeTab={masterDescriptionLevel || 'medium'}
                      onChange={(id) => setMasterDescriptionLevel(id as any)}
                      tabs={[
                        { id: 'low', label: 'Baixo' },
                        { id: 'medium', label: 'Médio' },
                        { id: 'high', label: 'Alto' }
                      ]}
                    />
                  </div>
                  <div>
                    <label className="block typo-caption font-medium text-text-muted mb-1.5">Foco Narrativo</label>
                    <Tabs
                      fullWidth
                      activeTab={masterFocus || 'balanced'}
                      onChange={(id) => setMasterFocus(id as any)}
                      tabs={[
                        { id: 'exploration', label: 'Exploração' },
                        { id: 'combat', label: 'Ação/Combate' },
                        { id: 'relationships', label: 'Relações' },
                        { id: 'balanced', label: 'Equilíbrio' }
                      ]}
                    />
                  </div>
                  <div>
                    <label className="block typo-caption font-medium text-text-muted mb-1.5">Tom</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {[
                        { id: 'neutral', label: 'Neutro' },
                        { id: 'realistic', label: 'Realista' },
                        { id: 'adventurous', label: 'Aventureiro' },
                        { id: 'dark', label: 'Sombrio' },
                        { id: 'comedic', label: 'Cômico' }
                      ].map(option => (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => setMasterTone(option.id as any)}
                          className={`px-3 py-1.5 typo-caption font-medium radius-medium transition-colors border ${masterTone === option.id ? 'bg-surface-elevated text-text-primary border-border-strong' : 'bg-surface-subtle text-text-secondary border-border-subtle hover:bg-surface-hover hover:text-text-primary hover:border-border-default'}`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    type="button"
                    variant="primary"
                    onClick={() => setSelectedMode('campaign_review')}
                  >
                    Revisar campanha
                  </Button>
                </div>
              </div>
            )}

            
            {/* Modo: Revisão Final da Campanha */}
            {selectedMode === 'campaign_review' && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  
                {submitError && (
                  <div
                    role="alert"
                    aria-live="polite"
                    className="p-3 radius-large bg-danger/10 border border-danger/30 flex items-start gap-2 text-xs mb-4"
                  >
                    <ShieldAlert className="w-4 h-4 text-danger shrink-0 mt-0.5" />
                    <span className="font-medium text-danger">{submitError}</span>
                  </div>
                )}

                  <h3 className="typo-section-heading text-text-primary">Revisão Final da Campanha</h3>
                  <p className="text-text-secondary leading-relaxed typo-body">
                    Confira todas as escolhas do seu mundo antes de gerar a campanha.
                  </p>
                </div>
                
                <div className="space-y-5 max-h-none sm:max-h-[50vh] overflow-y-visible sm:overflow-y-auto pr-2">
                  <div className="space-y-2">
                    <h4 className="typo-section-heading text-text-primary">Aventura & Mundo</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-4 typo-secondary">
                      <div><span className="text-text-muted">Título:</span> <span className="text-text-primary font-medium">{title || selectedScenario?.title || 'Personalizado'}</span></div>
                      <div><span className="text-text-muted">Gênero:</span> <span className="text-text-primary font-medium">{genre || selectedScenario?.genre || 'N/A'}</span></div>
                      <div><span className="text-text-muted">Formato:</span> <span className="text-text-primary font-medium">{t.formatBadge}</span></div>
                      <div><span className="text-text-muted">Ambientação:</span> <span className="text-text-primary font-medium">{t.basisBadge}</span></div>
                      <div className="col-span-1 sm:col-span-2"><span className="text-text-muted">Local Inicial:</span> <span className="text-text-primary font-medium">{startingLocation || selectedScenario?.startingLocation || 'A definir'}</span></div>
                    </div>
                  </div>
                  
                  <Divider />

                  <div className="space-y-2">
                    <h4 className="typo-section-heading text-text-primary">Identidade do Personagem</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-4 typo-secondary">
                      <div className="col-span-1 sm:col-span-2"><span className="text-text-muted">Nome:</span> <span className="text-text-primary font-medium">{playerName}</span></div>
                      <div><span className="text-text-muted">Idade:</span> <span className="text-text-primary font-medium">{charAge || '-'}</span></div>
                      <div><span className="text-text-muted">Pronomes:</span> <span className="text-text-primary font-medium">{charPronouns || '-'}</span></div>
                      <div className="col-span-1 sm:col-span-2"><span className="text-text-muted">Conceito:</span> <span className="text-text-primary font-medium">{charConcept || '-'}</span></div>
                    </div>
                  </div>

                  <Divider />
                  
                  <div className="space-y-2">
                    <h4 className="typo-section-heading text-text-primary">Sistema & Mestre</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-4 typo-secondary">
                      <div className="col-span-1 sm:col-span-2">
                        <span className="text-text-muted">Perfil Mecânico:</span>{' '}
                        <span className="text-text-primary font-medium">
                          {mechanicalProfile === 'FOCUSED_REALISM' || mechanicalProfile === 'realistic' || (!mechanicalProfile && campaignFormat === 'focused') ? 'Focado / Realismo' : mechanicalProfile === 'custom' ? 'Personalizado' : 'Sandbox / D20'}
                        </span>
                      </div>
                      <div><span className="text-text-muted">Foco:</span> <span className="text-text-primary font-medium capitalize">{masterFocus || 'balanced'}</span></div>
                      <div><span className="text-text-muted">Tom:</span> <span className="text-text-primary font-medium capitalize">{masterTone || 'neutral'}</span></div>
                      <div><span className="text-text-muted">Ritmo:</span> <span className="text-text-primary font-medium capitalize">{masterPacing || 'balanced'}</span></div>
                      <div><span className="text-text-muted">Descrição:</span> <span className="text-text-primary font-medium capitalize">{masterDescriptionLevel || 'medium'}</span></div>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end pt-2">
                  <Button
                    variant="primary"
                    onClick={handleConfirmCreation}
                    disabled={isSubmitting}
                    className="min-w-[140px] gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <Spinner size="sm" variant="current" />
                        <span>Criando...</span>
                      </>
                    ) : (
                      'Criar Campanha'
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Footer com Botão Voltar e Ação Primária */}
          <div className="min-h-14 py-2 px-4 sm:px-6 border-t border-border-subtle bg-surface flex items-center justify-between gap-3 shrink-0">
            {selectedMode !== 'campaign_format' ? (
              <Button
                id="btn-back-to-selection"
                variant="ghost"
                size="compact"
                disabled={isSubmitting || isGeneratingFoundation || isSelectingScenario || isAdvancingCharacter}
                onClick={handleBackNavigation}
                className="gap-2 text-text-secondary hover:text-text-primary"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar
              </Button>
            ) : (
              <span className="typo-caption text-text-muted">
                Nenhuma alteração é salva até confirmar
              </span>
            )}

            {selectedMode === 'generate_scenarios' && (
              <Button
                id="btn-continue-scenario"
                variant="primary"
                size="compact"
                disabled={!selectedScenarioId || isGeneratingScenarios || isGeneratingFoundation || isSelectingScenario || selectionLockRef.current}
                onClick={handleContinueWithSelectedScenario}
                aria-busy={isSelectingScenario || isGeneratingFoundation ? 'true' : 'false'}
                className="min-w-[190px] gap-2 font-medium"
              >
                {isSelectingScenario || isGeneratingFoundation ? (
                  <>
                    <Spinner size="xs" variant="primary" className="mr-1.5" />
                    <span>Preparando cenário...</span>
                  </>
                ) : (
                  <span>Continuar com este cenário</span>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
