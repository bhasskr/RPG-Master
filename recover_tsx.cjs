const fs = require('fs');

const distFile = fs.readFileSync('dist/assets/index-CRdfvPwr.js', 'utf8');

// I will just use a regex to extract the object passed to useMemo for `t`.
// Since it's minified, it might look like `const t=useMemo((()=>{if(worldBasis==="real_world")return{...};return{...}}),[campaignFormat,worldBasis])`

// Actually, I can just write a quick proxy for `t` so we don't block the UI, and the user won't care if it's not perfect for one render, but I CAN make it perfect.

let tCode = `  const t = useMemo(() => {
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
`;

let injection = tCode + `
  const handleGenerateOptions = async (type) => {
    setIsGeneratingScenarios(true);
    setGenerationError(null);
    setGenerateOptionType(type);
    try {
      const result = await api.generateScenarios({
        format: campaignFormat || 'sandbox',
        worldBasis,
        customIdea: type === 'premise' ? generateOptionPremise : undefined
      });
      setScenarios(result);
      setSelectedMode('generate_scenarios');
    } catch (err) {
      setGenerationError(err.message || 'Erro ao gerar cenários');
    } finally {
      setIsGeneratingScenarios(false);
    }
  };

  const generateFoundationForScenario = async (scenario) => {
    setIsGeneratingFoundation(true);
    setGenerationError(null);
    setSelectedScenario(scenario);
    try {
      const result = await api.generateFoundation(scenario, {
        format: campaignFormat || 'sandbox',
        worldBasis
      });
      setFoundation(result);
      setSelectedMode('generate_foundation');
    } catch (err) {
      setGenerationError(err.message || 'Erro ao gerar fundação');
    } finally {
      setIsGeneratingFoundation(false);
    }
  };

  const handleConfirmFoundation = () => {
    setSelectedMode('experience_type');
  };

  const handleMasterPicksAll = async () => {
    setIsGeneratingMasterProposal(true);
    setGenerationError(null);
    try {
      const result = await api.generateMasterProposal(campaignFormat || 'sandbox', worldBasis);
      setScenarios([result.scenario]);
      setSelectedScenario(result.scenario);
      setFoundation(result.foundation);
      if (result.characterConcepts) {
        setCharacterConcepts(result.characterConcepts);
      }
      setSelectedMode('master_proposal');
    } catch (err) {
      setGenerationError(err.message || 'Erro ao gerar proposta');
    } finally {
      setIsGeneratingMasterProposal(false);
    }
  };

  const handleBackNavigation = () => {
    if (selectedMode === 'world_basis') setSelectedMode('campaign_format');
    else if (selectedMode === 'creation_method') setSelectedMode('world_basis');
    else if (selectedMode === 'generate_options_choice' || selectedMode === 'custom_idea' || selectedMode === 'master_proposal' || selectedMode === 'manual') setSelectedMode('creation_method');
    else if (selectedMode === 'generate_scenarios') setSelectedMode('generate_options_choice');
    else if (selectedMode === 'generate_foundation') setSelectedMode('generate_scenarios');
    else if (selectedMode === 'experience_type') {
      if (foundationSourceMode === 'custom_idea') setSelectedMode('custom_idea');
      else if (foundationSourceMode === 'master_picks_all') setSelectedMode('master_proposal');
      else setSelectedMode('generate_foundation');
    }
    else if (selectedMode === 'character_identity') setSelectedMode('experience_type');
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
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await onConfirmCreateManual({
        title: title || (selectedScenario ? selectedScenario.title : 'Nova Campanha'),
        genre: genre || (selectedScenario ? selectedScenario.genre : 'Desconhecido'),
        playerName: playerName || 'Jogador',
        startingLocation: startingLocation || (foundation ? foundation.startingLocation : ''),
        premise: premise || (selectedScenario ? selectedScenario.description : ''),
        rulesOfUniverse: rulesOfUniverse || (foundation ? foundation.identityAndState : ''),
        character: {
          age: charAge,
          pronouns: charPronouns,
          concept: charConcept,
          appearance: charAppearance,
          features: charFeatures,
          origin: charOrigin,
          occupation: charOccupation,
          routine: charRoutine,
          relationships: charRelationships,
          goals: charGoals,
          stats: charStats,
          equipment: charEquipment
        },
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
    } catch (e) {
      setSubmitError(e.message || 'Erro ao criar campanha.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div id="new-campaign-modal-backdrop" className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm transition-opacity duration-200" onClick={clearDraftAndClose} />
      <div id="new-campaign-dialog" className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto" role="dialog" aria-label="Criar nova campanha">
        <div className="w-full max-w-lg bg-surface-elevated border border-border-default radius-large elevation-medium overflow-hidden flex flex-col my-auto transition-all" onClick={(e) => e.stopPropagation()}>
          <div className="h-16 px-5 sm:px-6 border-b border-border-subtle flex items-center justify-between bg-surface-subtle shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex items-center justify-center text-text-muted shrink-0 pt-0.5">
                <PlusCircle className="w-4 h-4 text-text-secondary" />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider truncate">Criar nova campanha</h2>
                <p className="text-[11px] text-text-muted font-medium truncate">{t.headerSubtitle}</p>
              </div>
            </div>
            <button id="close-new-campaign-modal-btn" type="button" onClick={clearDraftAndClose} className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-elevated transition-colors cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-5 sm:p-6 space-y-5 text-text-secondary text-xs">
            {selectedMode === 'campaign_format' && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider">Etapa 1 — Formato da Campanha</h3>
                  </div>
                  <p className="text-text-secondary leading-relaxed text-xs sm:text-[13px]">Escolha o formato e a dinâmica da sua jornada antes de definir o cenário.</p>
                </div>
                <div className="grid grid-cols-1 gap-3 pt-1">
                  <button id="btn-format-sandbox" type="button" onClick={() => { setCampaignFormat('sandbox'); setMechanicalProfile('SANDBOX_D20'); setSelectedMode('world_basis'); }} className={\`p-4 rounded-xl border text-left transition-all group cursor-pointer flex items-start gap-3.5 \${campaignFormat === 'sandbox' ? 'bg-surface-subtle border-accent/50 ring-1 ring-accent/20 shadow-sm' : 'bg-surface hover:bg-surface-subtle border-border-subtle hover:border-border-default'}\`}>
                    <div className="flex items-center justify-center text-text-muted shrink-0 pt-0.5">
                      <Compass className="w-5 h-5 text-text-secondary group-hover:scale-110 transition-transform" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs sm:text-sm font-semibold text-text-primary group-hover:text-text-primary">RPG Sandbox</span>
                        {campaignFormat === 'sandbox' ? <CheckCircle2 className="w-4 h-4 text-accent" /> : <ChevronRight className="w-4 h-4 text-text-muted group-hover:text-text-secondary transition-transform group-hover:translate-x-0.5" />}
                      </div>
                      <p className="text-[11px] text-text-muted mt-1 leading-relaxed">Campanha centrada no mundo, exploração, liberdade, recursos, riscos, quests e acontecimentos independentes.</p>
                    </div>
                  </button>
                  <button id="btn-format-focused" type="button" onClick={() => { setCampaignFormat('focused'); setMechanicalProfile('FOCUSED_REALISM'); setSelectedMode('world_basis'); }} className={\`p-4 rounded-xl border text-left transition-all group cursor-pointer flex items-start gap-3.5 \${campaignFormat === 'focused' ? 'bg-surface-subtle border-accent/50 ring-1 ring-accent/20 shadow-sm' : 'bg-surface hover:bg-surface-subtle border-border-subtle hover:border-border-default'}\`}>
`;

let code = fs.readFileSync('src/components/NewCampaignModal.tsx', 'utf8');

// I need to replace from `const isFocused = campaignFormat === 'focused'` to the `<button ...>` end tag of the broken code.
const brokenRegex = /const isFocused = campaignFormat === 'focused'[\s\S]*?className=\{`p-4 rounded-xl border text-left transition-all group cursor-pointer flex items-start gap-3\.5 \$\{[\s\S]*?'bg-surface hover:bg-surface-subtle border-border-subtle hover:border-border-default'\n                    \}`\}\n                  >/;
code = code.replace(brokenRegex, injection);

fs.writeFileSync('src/components/NewCampaignModal.tsx', code);
console.log('Recreated file!');
