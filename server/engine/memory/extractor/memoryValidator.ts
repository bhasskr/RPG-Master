/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MemoryManager } from '../memoryManager';
import {
  MemoryExtractionResult,
  ValidatedMemoryChanges,
  ExtractedEvent,
  ExtractedKnowledgeChange,
  ExtractedRelationshipChange,
  ExtractedInventoryChange,
  ExtractedQuestChange,
  ExtractedNPCChange,
  ExtractedWorldChange,
  MemoryConflict,
} from './types';
import { calculateFactSimilarity, normalizeText, extractKeyTokens } from '../knowledgeAcquisition';
import { CampaignMemorySnapshot } from '../types';

export class MemoryValidator {
  /**
   * Valida minuciosamente as alterações propostas pelo Memory Extractor contra o snapshot atual
   * e persiste somente as modificações válidas e autorizadas na Memory Layer.
   */
  public static async validateAndApply(
    campaignId: string,
    proposedChanges: MemoryExtractionResult,
    memoryManager: MemoryManager,
    turn: number
  ): Promise<ValidatedMemoryChanges> {
    const snapshot = (await memoryManager.getSnapshot(campaignId)) || {
      campaign: { campaignId, name: '', createdAt: Date.now(), currentDate: '', currentLocation: '' },
      npcs: {},
      events: [],
      knowledge: [],
      relationships: [],
      inventory: [],
      quests: [],
      updatedAt: Date.now(),
    };

    const validated: ValidatedMemoryChanges = {
      validEvents: [],
      validKnowledge: [],
      validRelationships: [],
      validInventoryChanges: [],
      validQuests: [],
      validNPCUpdates: [],
      rejectedChanges: [],
      conflicts: [...(proposedChanges.conflicts || [])],
    };

    // =================================================================
    // 1. VALIDAÇÃO DE CONFLITOS E ANTI-RETCON
    // =================================================================
    for (const proposedKnow of proposedChanges.knowledgeChanges || []) {
      const tokensProposed = extractKeyTokens(proposedKnow.fact);
      const normP = normalizeText(proposedKnow.fact);

      for (const existingKnow of snapshot.knowledge) {
        const tokensExisting = extractKeyTokens(existingKnow.fact);
        const normE = normalizeText(existingKnow.fact);
        const sim = calculateFactSimilarity(proposedKnow.fact, existingKnow.fact);

        const commonTokens = tokensProposed.filter((t) => tokensExisting.includes(t));
        const sharedSubject = commonTokens.length >= 2 || sim > 0.35;

        // Detecção de contradição direta (negação explícita de fato canônico)
        const negProposed = normP.includes('nao') || normP.includes('nunca') || normP.includes('falso') || normP.includes('mentira');
        const negExisting = normE.includes('nao') || normE.includes('nunca') || normE.includes('falso') || normE.includes('mentira');

        const hasContradiction = sharedSubject && ((negProposed && !negExisting) || (!negProposed && negExisting));

        if (hasContradiction && existingKnow.truthStatus === 'true') {
          const conflict: MemoryConflict = {
            type: 'KNOWLEDGE_CONFLICT',
            existing: existingKnow.fact,
            proposed: proposedKnow.fact,
            reason: `Tentativa de retcon não autorizado sobre fato canônico persistido (ID: ${existingKnow.id}).`,
          };
          if (!validated.conflicts.some((c) => c.existing === conflict.existing && c.proposed === conflict.proposed)) {
            validated.conflicts.push(conflict);
          }
        }
      }
    }

    // =================================================================
    // 2. VALIDAÇÃO E PERSISTÊNCIA DE EVENTOS (COM IDEMPOTÊNCIA)
    // =================================================================
    for (const eventProp of proposedChanges.events || []) {
      if (!eventProp.description || eventProp.description.trim().length === 0) {
        validated.rejectedChanges.push({ item: eventProp, reason: 'Evento com descrição vazia' });
        continue;
      }

      // Checagem de duplicação / Idempotência
      const isDuplicate = snapshot.events.some((existingEvt) => {
        const sim = calculateFactSimilarity(existingEvt.description, eventProp.description);
        const sameLoc = normalizeText(existingEvt.location) === normalizeText(eventProp.location);
        return sim > 0.8 && sameLoc;
      });

      if (isDuplicate) {
        validated.rejectedChanges.push({ item: eventProp, reason: 'Evento duplicado ou já persistido' });
        continue;
      }

      // Persistir evento aprovado
      const createdEvent = await memoryManager.createEvent(campaignId, {
        location: eventProp.location || snapshot.campaign.currentLocation,
        participants: eventProp.participants || ['player'],
        description: eventProp.description,
        consequences: eventProp.consequences || [],
      });
      validated.validEvents.push(createdEvent);
    }

    // =================================================================
    // 3. VALIDAÇÃO E PERSISTÊNCIA DE CONHECIMENTO (ISOLAMENTO EPISTEMOLÓGICO)
    // =================================================================
    for (const knowProp of proposedChanges.knowledgeChanges || []) {
      if (!knowProp.fact || knowProp.fact.trim().length < 3) {
        validated.rejectedChanges.push({ item: knowProp, reason: 'Fato com conteúdo insuficiente' });
        continue;
      }

      // Se houver conflito ativo contra este fato, não persistir
      const isConflicted = validated.conflicts.some((c) => c.proposed === knowProp.fact);
      if (isConflicted) {
        validated.rejectedChanges.push({ item: knowProp, reason: 'Rejeitado devido a conflito de conhecimento detectado (Anti-Retcon)' });
        continue;
      }

      // Checar se já existe fato idêntico ou similar
      const existingFact = snapshot.knowledge.find((k) => calculateFactSimilarity(k.fact, knowProp.fact) > 0.85);

      if (existingFact) {
        // Idempotência: Se já existe exatamente com os mesmos conhecedores, não duplicar
        const newKnownBy = (knowProp.knownBy || []).filter((name) => !existingFact.knownBy.includes(name));
        const newSuspectedBy = (knowProp.suspectedBy || []).filter((name) => !existingFact.suspectedBy?.includes(name));

        if (newKnownBy.length === 0 && newSuspectedBy.length === 0) {
          validated.rejectedChanges.push({ item: knowProp, reason: 'Conhecimento já persistido com os mesmos conhecedores (Idempotência)' });
          continue;
        }

        // Atualizar conhecedores autorizados sem recriar
        const updated = await memoryManager.updateKnowledge(campaignId, existingFact.id, {
          knownBy: newKnownBy,
          suspectedBy: newSuspectedBy,
        });
        if (updated) validated.validKnowledge.push(updated);
      } else {
        // Criar novo registro de conhecimento isolado
        const truthStatus = knowProp.truthStatus || 'true';
        const isWorldTruth = knowProp.isWorldTruth ?? (truthStatus === 'true' && (knowProp.knownBy || []).length === 0);

        const created = await memoryManager.createKnowledge(campaignId, {
          fact: knowProp.fact,
          truthStatus,
          knownBy: knowProp.knownBy || ['player'],
          suspectedBy: knowProp.suspectedBy || [],
          source: knowProp.source || `Turno ${turn}`,
          reliability: knowProp.reliability ?? (truthStatus === 'rumor' ? 4 : 10),
          isWorldTruth,
          isPublicKnowledge: knowProp.isPublicKnowledge || false,
        });
        validated.validKnowledge.push(created);
      }
    }

    // =================================================================
    // 4. VALIDAÇÃO E PERSISTÊNCIA DE NPCS
    // =================================================================
    for (const npcChange of proposedChanges.npcChanges || []) {
      const npcNameOrId = npcChange.npcIdOrName;
      if (!npcNameOrId) continue;

      let targetNpc = await memoryManager.getNPC(campaignId, npcNameOrId);
      const updates: Partial<any> = {};

      if (npcChange.statusChange) {
        // Se NPC já está morto, manter morto (não reviver acidentalmente)
        if (targetNpc?.status === 'dead' && npcChange.statusChange !== 'dead') {
          validated.conflicts.push({
            type: 'NPC_STATE_CONFLICT',
            existing: `${targetNpc.name} está morto`,
            proposed: `Status ${npcChange.statusChange}`,
            reason: 'Tentativa de alterar o estado de um NPC já falecido sem ressurreição canônica.',
          });
          continue;
        }
        updates.status = npcChange.statusChange;
      }

      if (npcChange.locationChange) {
        updates.location = npcChange.locationChange;
      }

      if (npcChange.factionChange) {
        updates.faction = npcChange.factionChange;
      }

      if (Object.keys(updates).length > 0) {
        if (!targetNpc) {
          targetNpc = await memoryManager.createNPC(campaignId, {
            name: npcNameOrId,
            status: updates.status || 'alive',
            location: updates.location || snapshot.campaign.currentLocation,
            faction: updates.faction || '',
            personalityNotes: npcChange.notes || '',
            goals: [],
            secrets: [],
            inventory: [],
            relationships: {},
          });
        } else {
          await memoryManager.updateNPC(campaignId, targetNpc.id, updates);
        }

        validated.validNPCUpdates.push({
          id: targetNpc.id,
          updates,
        });
      }
    }

    // =================================================================
    // 5. VALIDAÇÃO E PERSISTÊNCIA DE INVENTÁRIO
    // =================================================================
    for (const invChange of proposedChanges.inventoryChanges || []) {
      if (!invChange.item || invChange.item.trim().length === 0) continue;
      const owner = invChange.owner || 'player';
      const item = invChange.item;
      const qty = invChange.quantity || 1;

      if (invChange.action === 'lost' || invChange.action === 'consumed' || invChange.action === 'broken' || invChange.action === 'stolen') {
        const currentItems = await memoryManager.getInventory(campaignId, owner);
        const normTarget = normalizeText(item);
        const existingItem = currentItems.find((i) => {
          const normI = normalizeText(i.item);
          return normI === normTarget || normI.includes(normTarget) || normTarget.includes(normI);
        });

        if (!existingItem) {
          validated.conflicts.push({
            type: 'INVENTORY_CONFLICT',
            existing: `${owner} não possui o item "${item}"`,
            proposed: `Remover ${qty}x ${item}`,
            reason: 'Tentativa de remover um item que não existe no inventário do proprietário.',
          });
          continue;
        }

        await memoryManager.updateInventory(campaignId, owner, existingItem.item, -qty, 'add');
        validated.validInventoryChanges.push({ owner, item: existingItem.item, quantity: -qty, mode: 'add' });
      } else {
        await memoryManager.updateInventory(campaignId, owner, item, qty, 'add');
        validated.validInventoryChanges.push({ owner, item, quantity: qty, mode: 'add' });
      }
    }

    // =================================================================
    // 6. VALIDAÇÃO E PERSISTÊNCIA DE RELACIONAMENTOS
    // =================================================================
    for (const relChange of proposedChanges.relationshipChanges || []) {
      if (!relChange.characterA || !relChange.characterB) continue;

      const existingRel = await memoryManager.getRelationship(campaignId, relChange.characterA, relChange.characterB);
      const currentTrust = existingRel ? existingRel.trust : 0;
      const currentHostility = existingRel ? existingRel.hostility : 0;
      const currentFamiliarity = existingRel ? existingRel.familiarity : 0;

      const newTrust = relChange.trust !== undefined ? relChange.trust : currentTrust + (relChange.trustChange || 0);
      const newHostility = relChange.hostility !== undefined ? relChange.hostility : currentHostility + (relChange.hostilityChange || 0);
      const newFamiliarity = relChange.familiarity !== undefined ? relChange.familiarity : currentFamiliarity + (relChange.familiarityChange || 0);

      // Apenas atualiza se houver alteração numérica ou de histórico
      if (newTrust !== currentTrust || newHostility !== currentHostility || newFamiliarity !== currentFamiliarity || relChange.reason) {
        const historyUpdates = relChange.reason ? [relChange.reason] : [];
        const updated = await memoryManager.updateRelationship(campaignId, relChange.characterA, relChange.characterB, {
          // Preservar a intenção: o manager soma e limita sobre o snapshot atual,
          // dentro de mutateSnapshot. Valor absoluto explícito mantém precedência.
          ...(relChange.trust !== undefined
            ? { trust: relChange.trust }
            : { trustChange: relChange.trustChange || 0 }),
          ...(relChange.hostility !== undefined
            ? { hostility: relChange.hostility }
            : { hostilityChange: relChange.hostilityChange || 0 }),
          ...(relChange.familiarity !== undefined
            ? { familiarity: relChange.familiarity }
            : { familiarityChange: relChange.familiarityChange || 0 }),
          importantHistory: historyUpdates,
        });
        validated.validRelationships.push(updated);
      }
    }

    // =================================================================
    // 7. VALIDAÇÃO E PERSISTÊNCIA DE QUESTS
    // =================================================================
    for (const questChange of proposedChanges.questChanges || []) {
      if (!questChange.title) continue;

      let quest = await memoryManager.getQuest(campaignId, questChange.questId || questChange.title);
      if (!quest) {
        quest = await memoryManager.createQuest(campaignId, {
          title: questChange.title,
          status: questChange.status || 'active',
          participants: questChange.participants || ['player'],
          objectives: questChange.objectiveDescription ? [{ description: questChange.objectiveDescription, isCompleted: questChange.action === 'objective_completed' }] : [],
          consequences: questChange.consequences || [],
        });
      } else {
        if (quest.status === 'completed' && questChange.status && questChange.status !== 'completed') {
          validated.conflicts.push({
            type: 'QUEST_STATE_CONFLICT',
            existing: `Missão "${quest.title}" já está concluída`,
            proposed: `Status ${questChange.status}`,
            reason: 'Tentativa de reabrir ou desmarcar missão já finalizada sem justificativa narrativa explícita (Anti-Retcon).',
          });
          continue;
        }

        if (questChange.status || questChange.action === 'objective_completed') {
          quest = await memoryManager.updateQuest(campaignId, quest.id, {
            status: questChange.status || quest.status,
          });
        }
      }

      if (quest) validated.validQuests.push(quest);
    }

    return validated;
  }
}
