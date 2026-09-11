/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Database,
  X,
  RefreshCw,
  Users,
  Calendar,
  BookOpen,
  HeartHandshake,
  Package,
  Scroll,
  Terminal,
  CheckCircle2,
  AlertCircle,
  Clock,
  MapPin,
  Shield,
  Search,
  Trash2,
  Code2
} from 'lucide-react';
import { api } from '../services/api';
import {
  CampaignMemorySnapshot,
  MemoryOperationLog,
} from '../types';

interface MemoryInspectorProps {
  isOpen: boolean;
  onClose: () => void;
  campaignId: string;
}

type InspectorTab =
  | 'campaign'
  | 'npcs'
  | 'events'
  | 'knowledge'
  | 'relationships'
  | 'inventory'
  | 'quests'
  | 'logs';

export function MemoryInspector({ isOpen, onClose, campaignId }: MemoryInspectorProps) {
  const [activeTab, setActiveTab] = useState<InspectorTab>('campaign');
  const [snapshot, setSnapshot] = useState<CampaignMemorySnapshot | null>(null);
  const [logs, setLogs] = useState<MemoryOperationLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState('');
  const [showRawJson, setShowRawJson] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const fetchDirectMemory = useCallback(async () => {
    if (!campaignId) return;
    setIsLoading(true);
    setError(null);
    try {
      const [snapData, logsData] = await Promise.all([
        api.getMemorySnapshot(campaignId),
        api.getMemoryLogs(campaignId, 100),
      ]);
      setSnapshot(snapData || null);
      setLogs(logsData || []);
    } catch (err: unknown) {
      const msg = (err as Error)?.message || 'Erro ao carregar dados da Memory Layer.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    if (isOpen) {
      fetchDirectMemory();
    }
  }, [isOpen, fetchDirectMemory]);

  useEffect(() => {
    if (!isOpen || !autoRefresh) return;
    const interval = setInterval(() => {
      fetchDirectMemory();
    }, 4000);
    return () => clearInterval(interval);
  }, [isOpen, autoRefresh, fetchDirectMemory]);

  const handleClearLogs = async () => {
    try {
      await api.clearMemoryLogs(campaignId);
      setLogs([]);
    } catch (err) {
      console.error('Falha ao limpar logs:', err);
    }
  };

  if (!isOpen) return null;

  const npcsList = snapshot?.npcs ? Object.values(snapshot.npcs) : [];
  const eventsList = snapshot?.events || [];
  const knowledgeList = snapshot?.knowledge || [];
  const relationshipsList = snapshot?.relationships || [];
  const inventoryList = snapshot?.inventory || [];
  const questsList = snapshot?.quests || [];

  return (
    <div
      id="memory-inspector-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-6"
    >
      <div className="bg-[#121216] border border-white/15 rounded-2xl w-full max-w-5xl h-[90vh] flex flex-col shadow-2xl overflow-hidden text-gray-200">
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/10 bg-[#16161b] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/40 text-indigo-400 flex items-center justify-center">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-semibold text-white tracking-tight">
                  Memory Inspector
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                  DEV TOOL
                </span>
                <span className="text-xs text-gray-400 font-mono hidden sm:inline">
                  [{campaignId}]
                </span>
              </div>
              <p className="text-xs text-gray-400">
                Consulta determinística direta ao banco da Memory Layer (sem filtro narrativo de IA)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowRawJson((prev) => !prev)}
              className={`p-2 rounded-lg text-xs font-medium border transition-colors flex items-center gap-1.5 cursor-pointer ${
                showRawJson
                  ? 'bg-indigo-600 text-white border-indigo-500'
                  : 'bg-white/5 hover:bg-white/10 text-gray-300 border-white/10'
              }`}
              title="Alternar visualização JSON bruto"
            >
              <Code2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">JSON</span>
            </button>

            <button
              onClick={() => setAutoRefresh((prev) => !prev)}
              className={`p-2 rounded-lg text-xs font-medium border transition-colors flex items-center gap-1.5 cursor-pointer ${
                autoRefresh
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-white/5 hover:bg-white/10 text-gray-300 border-white/10'
              }`}
              title="Auto-atualizar a cada 4 segundos"
            >
              <div className={`w-2 h-2 radius-full ${autoRefresh ? 'bg-emerald-400 animate-ping' : 'bg-gray-500'}`} />
              <span className="hidden sm:inline">Auto-Sync</span>
            </button>

            <button
              onClick={fetchDirectMemory}
              disabled={isLoading}
              className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-medium text-gray-200 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Atualizar dados agora"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-indigo-400' : ''}`} />
              <span className="hidden sm:inline">Atualizar</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-red-500/10 border-b border-red-500/20 px-4 py-2 text-xs text-red-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Category Navigation Bar */}
        <div className="px-4 border-b border-white/10 bg-[#16161b]/60 flex items-center gap-1 overflow-x-auto no-scrollbar shrink-0 py-2">
          <button
            onClick={() => setActiveTab('campaign')}
            className={`px-3 py-1.5 radius-medium text-xs font-medium transition-colors duration-150 motion-reduce:transition-none flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'campaign'
                ? 'bg-surface-elevated text-text-primary border border-border-default'
                : 'text-text-muted hover:text-text-primary hover:bg-surface-hover/60'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Campaign</span>
          </button>

          <button
            onClick={() => setActiveTab('npcs')}
            className={`px-3 py-1.5 radius-medium text-xs font-medium transition-colors duration-150 motion-reduce:transition-none flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'npcs'
                ? 'bg-surface-elevated text-text-primary border border-border-default'
                : 'text-text-muted hover:text-text-primary hover:bg-surface-hover/60'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>NPCs</span>
            <span className="ml-1 text-xs px-1.5 py-0.2 radius-full bg-white/10">{npcsList.length}</span>
          </button>

          <button
            onClick={() => setActiveTab('events')}
            className={`px-3 py-1.5 radius-medium text-xs font-medium transition-colors duration-150 motion-reduce:transition-none flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'events'
                ? 'bg-surface-elevated text-text-primary border border-border-default'
                : 'text-text-muted hover:text-text-primary hover:bg-surface-hover/60'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Events</span>
            <span className="ml-1 text-xs px-1.5 py-0.2 radius-full bg-white/10">{eventsList.length}</span>
          </button>

          <button
            onClick={() => setActiveTab('knowledge')}
            className={`px-3 py-1.5 radius-medium text-xs font-medium transition-colors duration-150 motion-reduce:transition-none flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'knowledge'
                ? 'bg-surface-elevated text-text-primary border border-border-default'
                : 'text-text-muted hover:text-text-primary hover:bg-surface-hover/60'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Knowledge</span>
            <span className="ml-1 text-xs px-1.5 py-0.2 radius-full bg-white/10">{knowledgeList.length}</span>
          </button>

          <button
            onClick={() => setActiveTab('relationships')}
            className={`px-3 py-1.5 radius-medium text-xs font-medium transition-colors duration-150 motion-reduce:transition-none flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'relationships'
                ? 'bg-surface-elevated text-text-primary border border-border-default'
                : 'text-text-muted hover:text-text-primary hover:bg-surface-hover/60'
            }`}
          >
            <HeartHandshake className="w-3.5 h-3.5" />
            <span>Relationships</span>
            <span className="ml-1 text-xs px-1.5 py-0.2 radius-full bg-white/10">{relationshipsList.length}</span>
          </button>

          <button
            onClick={() => setActiveTab('inventory')}
            className={`px-3 py-1.5 radius-medium text-xs font-medium transition-colors duration-150 motion-reduce:transition-none flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'inventory'
                ? 'bg-surface-elevated text-text-primary border border-border-default'
                : 'text-text-muted hover:text-text-primary hover:bg-surface-hover/60'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>Inventory</span>
            <span className="ml-1 text-xs px-1.5 py-0.2 radius-full bg-white/10">{inventoryList.length}</span>
          </button>

          <button
            onClick={() => setActiveTab('quests')}
            className={`px-3 py-1.5 radius-medium text-xs font-medium transition-colors duration-150 motion-reduce:transition-none flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'quests'
                ? 'bg-surface-elevated text-text-primary border border-border-default'
                : 'text-text-muted hover:text-text-primary hover:bg-surface-hover/60'
            }`}
          >
            <Scroll className="w-3.5 h-3.5" />
            <span>Quests</span>
            <span className="ml-1 text-xs px-1.5 py-0.2 radius-full bg-white/10">{questsList.length}</span>
          </button>

          <div className="h-4 w-px bg-white/10 mx-1" />

          <button
            onClick={() => setActiveTab('logs')}
            className={`px-3 py-1.5 radius-medium text-xs font-medium transition-colors duration-150 motion-reduce:transition-none flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'logs'
                ? 'bg-surface-elevated text-text-primary border border-border-default'
                : 'text-text-muted hover:text-text-primary hover:bg-surface-hover/60'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Dev Logs</span>
            <span className="ml-1 text-xs px-1.5 py-0.2 radius-full bg-white/10 font-mono">{logs.length}</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#0f0f13]">
          {showRawJson ? (
            <div className="h-full flex flex-col">
              <div className="flex items-center justify-between pb-2 text-xs text-gray-400">
                <span>Raw Snapshot da Memory Layer (JSON):</span>
                <span>Atualizado: {snapshot?.updatedAt ? new Date(snapshot.updatedAt).toLocaleTimeString() : 'N/A'}</span>
              </div>
              <pre className="flex-1 bg-black/60 p-4 rounded-xl border border-white/10 text-xs font-mono text-emerald-400/90 overflow-auto">
                {JSON.stringify(snapshot, null, 2)}
              </pre>
            </div>
          ) : (
            <>
              {/* 1. CAMPAIGN TAB */}
              {activeTab === 'campaign' && (
                <div className="space-y-6">
                  <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-4">
                    <h3 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-2">
                      <Shield className="w-4 h-4 text-indigo-400" />
                      Metadados da Campanha (Memory Layer)
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      <div className="bg-black/30 p-3 rounded-lg border border-white/5">
                        <span className="text-gray-400 block mb-1">Campaign ID:</span>
                        <span className="font-mono text-indigo-300 text-sm">{snapshot?.campaign?.campaignId || campaignId}</span>
                      </div>

                      <div className="bg-black/30 p-3 rounded-lg border border-white/5">
                        <span className="text-gray-400 block mb-1">Nome da Campanha:</span>
                        <span className="font-medium text-white text-sm">{snapshot?.campaign?.name || '(Não definido)'}</span>
                      </div>

                      <div className="bg-black/30 p-3 rounded-lg border border-white/5">
                        <span className="text-gray-400 block mb-1">Data / Calendário no Mundo:</span>
                        <span className="font-medium text-white">{snapshot?.campaign?.currentDate || '(Não definido)'}</span>
                      </div>

                      <div className="bg-black/30 p-3 rounded-lg border border-white/5">
                        <span className="text-gray-400 block mb-1">Localização Atual:</span>
                        <span className="font-medium text-emerald-400 flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5" />
                          {snapshot?.campaign?.currentLocation || '(Não definida)'}
                        </span>
                      </div>

                      <div className="bg-black/30 p-3 rounded-lg border border-white/5">
                        <span className="text-gray-400 block mb-1">Criada em:</span>
                        <span className="text-gray-300">
                          {snapshot?.campaign?.createdAt ? new Date(snapshot.campaign.createdAt).toLocaleString() : 'N/A'}
                        </span>
                      </div>

                      <div className="bg-black/30 p-3 rounded-lg border border-white/5">
                        <span className="text-gray-400 block mb-1">Última Atualização no Banco:</span>
                        <span className="text-gray-300">
                          {snapshot?.updatedAt ? new Date(snapshot.updatedAt).toLocaleString() : 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Resumo Quantitativo */}
                  <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
                    <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
                      <span className="text-[11px] text-gray-400 block">NPCs</span>
                      <span className="text-xl font-bold text-white">{npcsList.length}</span>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
                      <span className="text-[11px] text-gray-400 block">Events</span>
                      <span className="text-xl font-bold text-white">{eventsList.length}</span>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
                      <span className="text-[11px] text-gray-400 block">Knowledge</span>
                      <span className="text-xl font-bold text-white">{knowledgeList.length}</span>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
                      <span className="text-[11px] text-gray-400 block">Relations</span>
                      <span className="text-xl font-bold text-white">{relationshipsList.length}</span>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
                      <span className="text-[11px] text-gray-400 block">Inventory</span>
                      <span className="text-xl font-bold text-white">{inventoryList.length}</span>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
                      <span className="text-[11px] text-gray-400 block">Quests</span>
                      <span className="text-xl font-bold text-white">{questsList.length}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* 2. NPCS TAB */}
              {activeTab === 'npcs' && (
                <div className="space-y-4">
                  {npcsList.length === 0 ? (
                    <div className="text-center py-12 text-gray-500 text-xs">
                      Nenhum NPC registrado na Memory Layer para esta campanha.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {npcsList.map((npc) => (
                        <div key={npc.id} className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="text-sm font-semibold text-white">{npc.name || 'Sem nome'}</h4>
                              <p className="text-[11px] font-mono text-gray-400">ID: {npc.id}</p>
                            </div>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                              npc.status === 'alive'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : 'bg-red-500/20 text-red-300 border border-red-500/30'
                            }`}>
                              {npc.status}
                            </span>
                          </div>

                          <div className="text-xs space-y-1.5 text-gray-300">
                            <div><span className="text-gray-400">Local:</span> {npc.location || '(Indefinido)'}</div>
                            <div><span className="text-gray-400">Facção:</span> {npc.faction || '(Nenhuma)'}</div>
                            <div><span className="text-gray-400">Personalidade:</span> {npc.personalityNotes || '(Nenhuma nota)'}</div>
                          </div>

                          {npc.goals && npc.goals.length > 0 && (
                            <div className="text-xs">
                              <span className="text-gray-400 block mb-1">Objetivos:</span>
                              <ul className="list-disc list-inside text-gray-300 space-y-0.5">
                                {npc.goals.map((g, idx) => (
                                  <li key={idx}>{g}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {npc.secrets && npc.secrets.length > 0 && (
                            <div className="text-xs bg-amber-500/10 p-2 rounded-lg border border-amber-500/20">
                              <span className="text-amber-400 font-medium block mb-1">Segredos:</span>
                              <ul className="list-disc list-inside text-amber-200/90 space-y-0.5">
                                {npc.secrets.map((s, idx) => (
                                  <li key={idx}>{s}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* 3. EVENTS TAB */}
              {activeTab === 'events' && (
                <div className="space-y-4">
                  {eventsList.length === 0 ? (
                    <div className="text-center py-12 text-gray-500 text-xs">
                      Nenhum evento registrado no histórico determinístico da campanha.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {eventsList.map((evt) => (
                        <div key={evt.id} className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-2">
                          <div className="flex items-center justify-between text-xs text-gray-400">
                            <span className="flex items-center gap-1 text-emerald-400">
                              <MapPin className="w-3.5 h-3.5" />
                              {evt.location || 'Local desconhecido'}
                            </span>
                            <span className="flex items-center gap-1 font-mono text-[11px]">
                              <Clock className="w-3 h-3" />
                              {new Date(evt.timestamp).toLocaleString()}
                            </span>
                          </div>

                          <p className="text-xs sm:text-sm text-gray-100 font-medium leading-relaxed">
                            {evt.description}
                          </p>

                          {evt.participants && evt.participants.length > 0 && (
                            <div className="flex items-center gap-1.5 flex-wrap pt-1">
                              <span className="text-[11px] text-gray-400">Participantes:</span>
                              {evt.participants.map((p, idx) => (
                                <span key={idx} className="px-2 py-0.5 bg-white/10 rounded text-[11px] text-indigo-300">
                                  {p}
                                </span>
                              ))}
                            </div>
                          )}

                          {evt.consequences && evt.consequences.length > 0 && (
                            <div className="text-xs bg-black/30 p-2.5 rounded-lg border border-white/5">
                              <span className="text-indigo-400 font-medium block mb-1">Consequências:</span>
                              <ul className="list-disc list-inside text-gray-300 space-y-0.5">
                                {evt.consequences.map((c, idx) => (
                                  <li key={idx}>{c}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* 4. KNOWLEDGE TAB */}
              {activeTab === 'knowledge' && (
                <div className="space-y-4">
                  {knowledgeList.length === 0 ? (
                    <div className="text-center py-12 text-gray-500 text-xs">
                      Nenhum fato ou conhecimento registrado na Memory Layer.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {knowledgeList.map((k) => (
                        <div key={k.id} className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
                          <div className="flex items-start justify-between">
                            <span className="text-[10px] font-mono text-gray-400">ID: {k.id}</span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                              k.truthStatus === 'true'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : k.truthStatus === 'rumor'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : k.truthStatus === 'unverified'
                                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                                : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                            }`}>
                              Status: {k.truthStatus} (Confiança: {k.reliability}/10)
                            </span>
                          </div>

                          <p className="text-xs text-gray-200 leading-relaxed font-medium">
                            "{k.fact}"
                          </p>

                          <div className="text-xs space-y-1 text-gray-400 border-t border-white/5 pt-2">
                            {k.source && <div><span className="text-gray-500">Fonte:</span> {k.source}</div>}
                            {k.knownBy && k.knownBy.length > 0 && (
                              <div><span className="text-gray-500">Conhecido por:</span> {k.knownBy.join(', ')}</div>
                            )}
                            {k.suspectedBy && k.suspectedBy.length > 0 && (
                              <div><span className="text-gray-500">Suspeitado por:</span> {k.suspectedBy.join(', ')}</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* 5. RELATIONSHIPS TAB */}
              {activeTab === 'relationships' && (
                <div className="space-y-4">
                  {relationshipsList.length === 0 ? (
                    <div className="text-center py-12 text-gray-500 text-xs">
                      Nenhum relacionamento interpessoal registrado.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {relationshipsList.map((rel, idx) => (
                        <div key={idx} className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-semibold text-indigo-300">
                              {rel.characterA} <span className="text-gray-500">↔</span> {rel.characterB}
                            </h4>
                            <span className="text-[10px] text-gray-400">Familiaridade: {rel.familiarity}/10</span>
                          </div>

                          <div className="space-y-2 text-xs">
                            <div>
                              <div className="flex justify-between text-[11px] mb-1">
                                <span className="text-gray-400">Confiança:</span>
                                <span className={rel.trust >= 0 ? 'text-emerald-400' : 'text-red-400'}>{rel.trust}</span>
                              </div>
                              <div className="w-full bg-black/40 h-1.5 radius-full overflow-hidden">
                                <div
                                  className={`h-full ${rel.trust >= 0 ? 'bg-emerald-500' : 'bg-red-500'}`}
                                  style={{ width: `${Math.min(Math.abs(rel.trust), 100)}%` }}
                                />
                              </div>
                            </div>

                            <div>
                              <div className="flex justify-between text-[11px] mb-1">
                                <span className="text-gray-400">Hostilidade:</span>
                                <span className={rel.hostility > 0 ? 'text-red-400' : 'text-gray-400'}>{rel.hostility}</span>
                              </div>
                              <div className="w-full bg-black/40 h-1.5 radius-full overflow-hidden">
                                <div
                                  className="h-full bg-rose-500"
                                  style={{ width: `${Math.min(Math.max(rel.hostility, 0), 100)}%` }}
                                />
                              </div>
                            </div>
                          </div>

                          {rel.importantHistory && rel.importantHistory.length > 0 && (
                            <div className="text-xs bg-black/30 p-2 rounded-lg border border-white/5">
                              <span className="text-gray-400 block mb-1 text-[11px]">Histórico Importante:</span>
                              <ul className="list-disc list-inside text-gray-300 space-y-0.5 text-[11px]">
                                {rel.importantHistory.map((h, hIdx) => (
                                  <li key={hIdx}>{h}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* 6. INVENTORY TAB */}
              {activeTab === 'inventory' && (
                <div className="space-y-4">
                  {inventoryList.length === 0 ? (
                    <div className="text-center py-12 text-gray-500 text-xs">
                      Nenhum item registrado nos inventários da campanha.
                    </div>
                  ) : (
                    <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-[#18181f] text-gray-400 border-b border-white/10">
                          <tr>
                            <th className="py-2.5 px-4 font-medium">Proprietário / Local</th>
                            <th className="py-2.5 px-4 font-medium">Item</th>
                            <th className="py-2.5 px-4 font-medium text-right">Quantidade</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {inventoryList.map((inv, idx) => (
                            <tr key={idx} className="hover:bg-white/5">
                              <td className="py-2.5 px-4 font-medium text-indigo-300">{inv.owner}</td>
                              <td className="py-2.5 px-4 text-gray-200">{inv.item}</td>
                              <td className="py-2.5 px-4 text-right font-mono font-bold text-white">x{inv.quantity}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* 7. QUESTS TAB */}
              {activeTab === 'quests' && (
                <div className="space-y-4">
                  {questsList.length === 0 ? (
                    <div className="text-center py-12 text-gray-500 text-xs">
                      Nenhuma quest ou objetivo persistido.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {questsList.map((q) => (
                        <div key={q.id} className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="text-sm font-semibold text-white">{q.title}</h4>
                              <span className="text-[10px] font-mono text-gray-400">ID: {q.id}</span>
                            </div>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                              q.status === 'active' || q.status === 'in_progress'
                                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                                : q.status === 'completed'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : 'bg-red-500/20 text-red-300 border border-red-500/30'
                            }`}>
                              {q.status}
                            </span>
                          </div>

                          {q.participants && q.participants.length > 0 && (
                            <div className="text-xs text-gray-400">
                              <span>Envolvidos: </span>
                              <span className="text-gray-300">{q.participants.join(', ')}</span>
                            </div>
                          )}

                          {q.objectives && q.objectives.length > 0 && (
                            <div className="text-xs bg-black/30 p-2.5 rounded-lg border border-white/5 space-y-1">
                              <span className="text-indigo-400 font-medium block">Objetivos:</span>
                              <div className="space-y-1">
                                {q.objectives.map((obj, idx) => {
                                  const isObjObject = typeof obj === 'object' && obj !== null;
                                  const desc = isObjObject ? obj.description : String(obj);
                                  const done = isObjObject ? Boolean(obj.isCompleted) : false;
                                  return (
                                    <div key={idx} className="flex items-center gap-1.5 text-gray-300">
                                      <div className={`w-3 h-3 radius-full border flex items-center justify-center ${
                                        done ? 'border-emerald-500 bg-emerald-500/20' : 'border-gray-500'
                                      }`}>
                                        {done && <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />}
                                      </div>
                                      <span className={done ? 'line-through text-gray-500' : ''}>{desc}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* 8. DEV AUDIT LOGS TAB */}
              {activeTab === 'logs' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 relative">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                      <input
                        type="text"
                        placeholder="Filtrar logs por operação, função ou entidade..."
                        value={searchFilter}
                        onChange={(e) => setSearchFilter(e.target.value)}
                        className="w-full pl-9 pr-3 py-1.5 bg-black/40 border border-white/10 rounded-lg text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <button
                      onClick={handleClearLogs}
                      className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-lg text-xs text-red-300 transition-colors flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Limpar Logs</span>
                    </button>
                  </div>

                  {logs.length === 0 ? (
                    <div className="text-center py-12 text-gray-500 text-xs">
                      Nenhuma operação registrada no log de auditoria.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {logs
                        .filter((l) => {
                          if (!searchFilter.trim()) return true;
                          const q = searchFilter.toLowerCase();
                          return (
                            l.operation.toLowerCase().includes(q) ||
                            l.functionName.toLowerCase().includes(q) ||
                            l.entity.toLowerCase().includes(q) ||
                            (l.details && l.details.toLowerCase().includes(q))
                          );
                        })
                        .map((l) => (
                          <div
                            key={l.id}
                            className={`p-3 rounded-xl border text-xs font-mono space-y-1.5 ${
                              l.status === 'success'
                                ? 'bg-white/[0.02] border-white/10'
                                : 'bg-red-500/[0.08] border-red-500/30'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                  l.operation === 'CREATE'
                                    ? 'bg-emerald-500/20 text-emerald-300'
                                    : l.operation === 'UPDATE'
                                    ? 'bg-blue-500/20 text-blue-300'
                                    : l.operation === 'READ'
                                    ? 'bg-gray-500/20 text-gray-300'
                                    : l.operation === 'QUERY_CONTEXT'
                                    ? 'bg-purple-500/20 text-purple-300'
                                    : 'bg-rose-500/20 text-rose-300'
                                }`}>
                                  {l.operation}
                                </span>
                                <span className="text-indigo-400 font-semibold">{l.functionName}()</span>
                                <span className="text-gray-300 font-sans text-xs">→ {l.entity}</span>
                              </div>

                              <div className="flex items-center gap-2 text-[11px] text-gray-500">
                                <span className={l.status === 'success' ? 'text-emerald-400' : 'text-red-400 font-bold'}>
                                  {l.status.toUpperCase()}
                                </span>
                                <span>{new Date(l.timestamp).toLocaleTimeString()}</span>
                              </div>
                            </div>

                            {l.details && (
                              <div className="text-gray-400 text-[11px] font-sans pl-1">
                                {l.details}
                              </div>
                            )}

                            {l.error && (
                              <div className="text-red-400 text-[11px] font-sans bg-red-950/40 p-2 rounded border border-red-500/20">
                                ⚠ Erro: {l.error}
                              </div>
                            )}
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
