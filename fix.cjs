const fs = require('fs');
const file = 'src/components/NewCampaignModal.tsx';
let content = fs.readFileSync(file, 'utf8');

const regexForm = /<form onSubmit=\{handleManualSubmit\} className="space-y-3\.5">[\s\S]*?<\/form>/;
const formNew = `<form onSubmit={handleManualSubmit} className="space-y-3.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                      Título da Campanha (Opcional)
                    </label>
                    <input
                      id="new-campaign-title-input"
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Ex: O Segredo da Cidadela"
                      className="w-full h-9 px-3 bg-zinc-900/80 border border-zinc-750 focus:border-zinc-500 rounded-xl text-xs text-zinc-100 placeholder-zinc-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                      Gênero / Ambientação
                    </label>
                    <select
                      id="new-campaign-genre-select"
                      value={genre}
                      onChange={(e) => setGenre(e.target.value)}
                      className="w-full h-9 px-2.5 bg-zinc-900/80 border border-zinc-750 focus:border-zinc-500 rounded-xl text-xs text-zinc-100 outline-none cursor-pointer"
                    >
                      <option value="Alta Fantasia">Alta Fantasia</option>
                      <option value="Dark Fantasy">Dark Fantasy</option>
                      <option value="Cyberpunk">Cyberpunk</option>
                      <option value="Ficção Científica">Ficção Científica</option>
                      <option value="Investigação / Horror">Investigação / Horror</option>
                      <option value="Mundo Aberto Livre">Mundo Aberto Livre</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                    Premissa
                  </label>
                  <textarea
                    value={premise}
                    onChange={(e) => setPremise(e.target.value)}
                    placeholder="Ex: O império caiu há cem anos. Magia está proibida."
                    className="w-full h-16 p-3 bg-zinc-900/80 border border-zinc-750 focus:border-zinc-500 rounded-xl text-xs text-zinc-100 placeholder-zinc-500 outline-none resize-none"
                  />
                </div>
                
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                    Observações Livres do Mundo (Opcional)
                  </label>
                  <textarea
                    value={rulesOfUniverse}
                    onChange={(e) => setRulesOfUniverse(e.target.value)}
                    placeholder="Ex: Dragões são comuns. A moeda principal é a prata."
                    className="w-full h-16 p-3 bg-zinc-900/80 border border-zinc-750 focus:border-zinc-500 rounded-xl text-xs text-zinc-100 placeholder-zinc-500 outline-none resize-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                    Local Inicial (Opcional)
                  </label>
                  <input
                    id="new-campaign-location-input"
                    type="text"
                    value={startingLocation}
                    onChange={(e) => setStartingLocation(e.target.value)}
                    placeholder="Ex: Taverna do Javali Saltitante"
                    className="w-full h-9 px-3 bg-zinc-900/80 border border-zinc-750 focus:border-zinc-500 rounded-xl text-xs text-zinc-100 placeholder-zinc-500 outline-none"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedMode('selection')}
                    className="px-4 py-2 bg-zinc-850 hover:bg-zinc-800 text-zinc-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Voltar às opções
                  </button>
                  <button
                    id="btn-confirm-create-campaign"
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-zinc-200 hover:bg-white active:bg-zinc-300 text-zinc-900 rounded-xl text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? 'Confirmando...' : 'Confirmar Criação de Mundo'}
                  </button>
                </div>
              </form>`;
content = content.replace(regexForm, formNew);
fs.writeFileSync(file, content);
