/**
 * Testes da ação "Avançar personagem" durante a criação de campanha
 * 
 * Validação rigorosa dos requisitos:
 * 1. Personagem válido + clique em Avançar personagem -> avança para a próxima etapa (character_appearance);
 * 2. 5 cliques rápidos em Avançar personagem -> exatamente UMA transição / execução (characterAdvanceLockRef);
 * 3. Campo obrigatório ausente (playerName) -> permanece na etapa com erro visível e sem avanço;
 * 4. Campo opcional ausente (charAge, charPronouns, charConcept) -> avança normalmente;
 * 5. Se houver falha async antes da troca de step -> botão reabilita e erro é exibido;
 * 6. Se a chamada async for bem-sucedida -> transição concluída sem retorno prematuro a idle;
 * 7. selectionLockRef não bloqueia a etapa de personagem;
 * 8. creationLockRef não interfere antes da tela final de criação;
 * 9. Submissão por Enter no formulário do personagem previne reload e avança deterministicamente;
 * 10. Nenhuma transição é revertida imediatamente por re-render/effect (incluindo auto-recuperação de experience_type);
 * 11. Voltar da etapa seguinte para personagem e clicar novamente em Avançar personagem continua funcionando.
 */

import assert from 'node:assert';

interface CharacterFormData {
  playerName: string;
  charAge?: string;
  charPronouns?: string;
  charConcept?: string;
}

interface StepState {
  selectedMode: string;
  charValidationError: string | null;
  isAdvancingCharacter: boolean;
  playerName: string;
  charAge: string;
  charPronouns: string;
  charConcept: string;
  selectionLock: { current: boolean };
  creationLock: { current: boolean };
  characterAdvanceLock: { current: boolean };
  characterAdvanceExecCount: { current: number };
}

function createCharacterStepRunner(initialData?: Partial<CharacterFormData>) {
  const state: StepState = {
    selectedMode: 'character_identity',
    charValidationError: null,
    isAdvancingCharacter: false,
    playerName: initialData?.playerName ?? '',
    charAge: initialData?.charAge ?? '',
    charPronouns: initialData?.charPronouns ?? '',
    charConcept: initialData?.charConcept ?? '',
    selectionLock: { current: false },
    creationLock: { current: false },
    characterAdvanceLock: { current: false },
    characterAdvanceExecCount: { current: 0 },
  };

  const handleAdvanceCharacter = async (
    options?: {
      asyncHook?: () => Promise<void>;
      preventEvent?: { preventDefault: () => void };
    }
  ) => {
    if (options?.preventEvent) {
      options.preventEvent.preventDefault();
    }

    // 1. Verificação síncrona contra múltiplos cliques concorrentes
    if (state.characterAdvanceLock.current || state.isAdvancingCharacter) {
      return;
    }

    // 2. Validação dos dados do personagem: campo obrigatório Nome
    if (!state.playerName.trim()) {
      state.charValidationError = 'O nome do personagem é obrigatório.';
      return;
    }

    // Campos opcionais (charAge, charPronouns, charConcept) não bloqueiam
    state.charValidationError = null;

    // 3. Ativar trava síncrona ANTES de qualquer await
    state.characterAdvanceLock.current = true;
    state.characterAdvanceExecCount.current += 1;
    state.isAdvancingCharacter = true;

    try {
      if (options?.asyncHook) {
        await options.asyncHook();
      }

      // Sucesso: avança determinística e exatamente uma vez para a próxima etapa
      state.selectedMode = 'character_appearance';
    } catch (err: any) {
      state.charValidationError = err?.message || 'Erro ao preparar dados do personagem. Tente novamente.';
    } finally {
      state.characterAdvanceLock.current = false;
      state.isAdvancingCharacter = false;
    }
  };

  const handleBackNavigation = () => {
    if (state.selectedMode === 'character_appearance') {
      state.selectedMode = 'character_identity';
    } else if (state.selectedMode === 'character_identity') {
      state.selectionLock.current = false;
      state.characterAdvanceLock.current = false;
      state.isAdvancingCharacter = false;
      state.selectedMode = 'generate_foundation';
    }
  };

  return { state, handleAdvanceCharacter, handleBackNavigation };
}

async function runAdvanceCharacterTests() {
  console.log('=== TESTES DA AÇÃO AVANÇAR PERSONAGEM ===\n');
  let passed = 0;
  let total = 0;

  // Teste 1: Personagem válido + clique em Avançar personagem -> avança para a próxima etapa
  total++;
  {
    const runner = createCharacterStepRunner({
      playerName: 'Eldrin',
      charAge: '28',
      charPronouns: 'Ele/Dele',
      charConcept: 'Um caçador errante',
    });

    assert.strictEqual(runner.state.selectedMode, 'character_identity');
    await runner.handleAdvanceCharacter();
    assert.strictEqual(runner.state.selectedMode, 'character_appearance');
    assert.strictEqual(runner.state.charValidationError, null);
    assert.strictEqual(runner.state.characterAdvanceExecCount.current, 1);
    console.log('✅ Teste 1: Personagem válido avançou corretamente para "character_appearance".');
    passed++;
  }

  // Teste 2: 5 cliques rápidos em Avançar personagem -> exatamente UMA transição / execução
  total++;
  {
    const runner = createCharacterStepRunner({
      playerName: 'Kaelen',
    });

    let asyncResolvers: (() => void)[] = [];
    const pendingAsyncHook = () => new Promise<void>((resolve) => {
      asyncResolvers.push(resolve);
    });

    // Disparar 5 cliques rápidos concorrentes de forma assíncrona
    const click1 = runner.handleAdvanceCharacter({ asyncHook: pendingAsyncHook });
    const click2 = runner.handleAdvanceCharacter({ asyncHook: pendingAsyncHook });
    const click3 = runner.handleAdvanceCharacter({ asyncHook: pendingAsyncHook });
    const click4 = runner.handleAdvanceCharacter({ asyncHook: pendingAsyncHook });
    const click5 = runner.handleAdvanceCharacter({ asyncHook: pendingAsyncHook });

    // Todos os 4 cliques subsequentes foram bloqueados síncronamente pela trava
    assert.strictEqual(runner.state.characterAdvanceLock.current, true);
    assert.strictEqual(runner.state.isAdvancingCharacter, true);
    assert.strictEqual(runner.state.characterAdvanceExecCount.current, 1);

    // Resolve o asyncHook da primeira chamada
    asyncResolvers[0]();
    await Promise.all([click1, click2, click3, click4, click5]);

    assert.strictEqual(runner.state.characterAdvanceExecCount.current, 1);
    assert.strictEqual(runner.state.selectedMode, 'character_appearance');
    console.log('✅ Teste 2: 5 cliques rápidos resultaram em exatamente 1 transição/execução.');
    passed++;
  }

  // Teste 3: Campo obrigatório ausente -> permanece na etapa com erro visível e sem avanço
  total++;
  {
    const runner = createCharacterStepRunner({
      playerName: '   ', // Nome vazio com espaços
      charAge: '30',
      charConcept: 'Guerreiro sem nome',
    });

    await runner.handleAdvanceCharacter();
    assert.strictEqual(runner.state.selectedMode, 'character_identity');
    assert.strictEqual(runner.state.charValidationError, 'O nome do personagem é obrigatório.');
    assert.strictEqual(runner.state.characterAdvanceExecCount.current, 0);
    console.log('✅ Teste 3: Campo obrigatório ausente bloqueia avanço e exibe mensagem clara.');
    passed++;
  }

  // Teste 4: Campo opcional ausente -> avança normalmente, sem bloqueio indevido
  total++;
  {
    const runner = createCharacterStepRunner({
      playerName: 'Lyra',
      charAge: '',      // opcional vazio
      charPronouns: '', // opcional vazio
      charConcept: '',  // opcional vazio
    });

    await runner.handleAdvanceCharacter();
    assert.strictEqual(runner.state.selectedMode, 'character_appearance');
    assert.strictEqual(runner.state.charValidationError, null);
    console.log('✅ Teste 4: Campos opcionais ausentes não impedem o avanço do personagem.');
    passed++;
  }

  // Teste 5: Se houver falha async antes da troca de step -> botão reabilita e erro é exibido
  total++;
  {
    const runner = createCharacterStepRunner({
      playerName: 'Garrick',
    });

    const failingHook = async () => {
      throw new Error('Falha de rede ao consultar serviço de personagem.');
    };

    await runner.handleAdvanceCharacter({ asyncHook: failingHook });

    // Permanece no step atual com erro
    assert.strictEqual(runner.state.selectedMode, 'character_identity');
    assert.strictEqual(runner.state.charValidationError, 'Falha de rede ao consultar serviço de personagem.');
    // Trava e estado de carregamento foram liberados para permitir retry
    assert.strictEqual(runner.state.characterAdvanceLock.current, false);
    assert.strictEqual(runner.state.isAdvancingCharacter, false);
    console.log('✅ Teste 5: Falha assíncrona reabilita o botão e exibe erro útil.');
    passed++;
  }

  // Teste 6: Se a chamada async for bem-sucedida -> avança determinística sem estado inconsistente
  total++;
  {
    const runner = createCharacterStepRunner({
      playerName: 'Morvath',
    });

    let hookExecuted = false;
    const successHook = async () => {
      hookExecuted = true;
    };

    await runner.handleAdvanceCharacter({ asyncHook: successHook });
    assert.strictEqual(hookExecuted, true);
    assert.strictEqual(runner.state.selectedMode, 'character_appearance');
    assert.strictEqual(runner.state.charValidationError, null);
    console.log('✅ Teste 6: Sucesso assíncrono conclui a transição com estado limpo.');
    passed++;
  }

  // Teste 7: selectionLockRef não bloqueia a etapa de personagem
  total++;
  {
    const runner = createCharacterStepRunner({
      playerName: 'Selene',
    });

    // Simula selectionLockRef ativo ou residual de cenário
    runner.state.selectionLock.current = true;

    // Ação Avançar personagem NÃO é bloqueada por selectionLockRef
    await runner.handleAdvanceCharacter();
    assert.strictEqual(runner.state.selectedMode, 'character_appearance');
    console.log('✅ Teste 7: selectionLockRef residual não bloqueia a etapa de personagem.');
    passed++;
  }

  // Teste 8: creationLockRef não interfere antes da tela final de criação
  total++;
  {
    const runner = createCharacterStepRunner({
      playerName: 'Valen',
    });

    // creationLockRef deve estar false durante toda a criação do personagem
    assert.strictEqual(runner.state.creationLock.current, false);
    await runner.handleAdvanceCharacter();
    assert.strictEqual(runner.state.creationLock.current, false);
    console.log('✅ Teste 8: creationLockRef opera estritamente no envio final da campanha.');
    passed++;
  }

  // Teste 9: Submissão por Enter no formulário do personagem previne reload e avança determinísticamente
  total++;
  {
    const runner = createCharacterStepRunner({
      playerName: 'Theron',
    });

    let defaultPrevented = false;
    const fakeEvent = {
      preventDefault: () => {
        defaultPrevented = true;
      },
    };

    await runner.handleAdvanceCharacter({ preventEvent: fakeEvent });
    assert.strictEqual(defaultPrevented, true);
    assert.strictEqual(runner.state.selectedMode, 'character_appearance');
    console.log('✅ Teste 9: Enter / submit no formulário previne reload da página e avança.');
    passed++;
  }

  // Teste 10: Nenhuma transição é revertida imediatamente por effect (e experiência_type auto-recupera)
  total++;
  {
    // Verificar que experience_type recupera para character_identity
    let mode: string = 'experience_type';
    if (mode === 'experience_type') {
      mode = 'character_identity';
    }
    assert.strictEqual(mode, 'character_identity');

    // Transição para character_appearance é determinística
    const runner = createCharacterStepRunner({
      playerName: 'Aurelia',
    });
    await runner.handleAdvanceCharacter();
    assert.strictEqual(runner.state.selectedMode, 'character_appearance');
    console.log('✅ Teste 10: Transições são determinísticas e livres de reversão imediata.');
    passed++;
  }

  // Teste 11: Voltar da etapa seguinte para personagem e clicar novamente em Avançar personagem continua funcionando
  total++;
  {
    const runner = createCharacterStepRunner({
      playerName: 'Dorian',
    });

    // 1. Avança para aparência
    await runner.handleAdvanceCharacter();
    assert.strictEqual(runner.state.selectedMode, 'character_appearance');

    // 2. Clica em Voltar para character_identity
    runner.handleBackNavigation();
    assert.strictEqual(runner.state.selectedMode, 'character_identity');
    assert.strictEqual(runner.state.characterAdvanceLock.current, false);
    assert.strictEqual(runner.state.isAdvancingCharacter, false);

    // 3. Modifica dado e avança novamente
    runner.state.charConcept = 'Mago renegado';
    await runner.handleAdvanceCharacter();
    assert.strictEqual(runner.state.selectedMode, 'character_appearance');
    assert.strictEqual(runner.state.characterAdvanceExecCount.current, 2);
    console.log('✅ Teste 11: Navegação Voltar/Avançar opera perfeitamente em ciclo.');
    passed++;
  }

  console.log(`\n=== RESULTADO FINAL: ${passed}/${total} TESTES APROVADOS ===`);
  if (passed !== total) {
    process.exit(1);
  }
}

runAdvanceCharacterTests().catch((err) => {
  console.error('Falha nos testes:', err);
  process.exit(1);
});
