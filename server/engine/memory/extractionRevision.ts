import { CampaignMemorySnapshot, ChatMessage, ExtractionSource } from './types';

export function extractionStatus(
  message: ChatMessage | undefined, snapshot: CampaignMemorySnapshot | null, source: ExtractionSource
): 'stale' | 'duplicate' | undefined {
  if (!message || message.role !== 'assistant' || message.turn !== source.turn ||
      (message.revision ?? 0) !== source.revision) return 'stale';
  const receipt = snapshot?.extractionReceipts?.[source.messageId];
  if ((receipt?.revision === source.revision && receipt.turn === source.turn) ||
      message.metadata?.hasMutations) return 'duplicate';
}

export function assertRevisable(
  message: ChatMessage, snapshot: CampaignMemorySnapshot | null, expectedRevision?: number
): void {
  if (expectedRevision !== undefined && (message.revision ?? 0) !== expectedRevision) {
    throw new Error('Conflito detectado: a revisão da mensagem foi substituída durante a geração.');
  }
  const receipt = snapshot?.extractionReceipts?.[message.id];
  if (message.metadata?.hasMutations || (receipt?.revision === (message.revision ?? 0) &&
      receipt.turn === message.turn && receipt.hasMutations)) {
    throw new Error('Conflito detectado: o estado foi consolidado e a narrativa não pode ser substituída.');
  }
}

export function revisesNarrative(current: ChatMessage, updates: Partial<ChatMessage>): boolean {
  return (updates.content !== undefined && updates.content !== current.content) ||
    (updates.role !== undefined && updates.role !== current.role) ||
    (updates.turn !== undefined && updates.turn !== current.turn);
}
