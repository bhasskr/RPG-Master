// Fake somente da fronteira externa. Nunca substitui extractor/validator/engine.
const emptyExtraction = () => ({
  events: [], knowledgeChanges: [], relationshipChanges: [], inventoryChanges: [],
  questChanges: [], npcChanges: [], worldChanges: [], conflicts: [],
});
const calls = [];
const handlers = {};
function reset() {
  calls.length = 0;
  handlers.chat = async () => ({ text: 'O salão permanece tranquilo.' });
  handlers.generate = async () => ({ text: JSON.stringify(emptyExtraction()) });
  handlers.embed = async () => ({ embeddings: [{ values: [1, 0] }] });
}
async function invoke(kind, request) {
  calls.push({ kind, request });
  return handlers[kind](request);
}
class GoogleGenAI {
  chats = { create: (config) => ({
    sendMessage: (request) => invoke('chat', { ...request, config }),
  }) };
  models = {
    generateContent: (request) => invoke('generate', request),
    embedContent: (request) => invoke('embed', request),
  };
}
reset();
module.exports = {
  GoogleGenAI, calls, handlers, reset, emptyExtraction,
  Type: Object.fromEntries(['STRING', 'NUMBER', 'INTEGER', 'BOOLEAN', 'ARRAY', 'OBJECT', 'NULL']
    .map((key) => [key, key])),
};
