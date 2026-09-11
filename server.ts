/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { gameEngine } from './server/engine/gameEngine';
import { NarratorError } from './server/engine/narrator/narratorService';
import { withIdempotency } from './server/engine/idempotency/idempotencyService';

dotenv.config();

const app = express();
const PORT = 3000;

// Body parsers
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

// ==========================================
// API ROUTES: Sandbox RPG Engine
// ==========================================

// 1. Status da Game Engine e Verificação de Conexão
app.get('/api/status', (req: Request, res: Response) => {
  const status = gameEngine.getStatus();
  res.json({
    status: 'online',
    engine: 'Sandbox RPG Engine v1.0',
    data: {
      ...status,
      status: 'online',
      engine: 'Sandbox RPG Engine v1.0',
      environment: process.env.NODE_ENV || 'development',
    },
  });
});

// 2. Iniciar Nova Campanha (Nova Sessão / Reset)
app.post('/api/campaign/new', async (req: Request, res: Response, next: NextFunction) => {
  await withIdempotency(req, res, next, {
    route: '/api/campaign/new',
    getScope: () => 'campaign_creation',
    getPayload: (r) => r.body || {},
    execute: async () => {
      const result = await gameEngine.startNewCampaign(req.body || {});
      return {
        statusCode: 200,
        body: {
          success: true,
          data: result,
        },
      };
    },
  });
});

// 2.1. Listar Todas as Campanhas Salvas (Histórico)
app.get('/api/campaigns', (req: Request, res: Response) => {
  const campaigns = gameEngine.listAllCampaigns();
  res.json({
    success: true,
    data: campaigns,
  });
});

app.put('/api/campaign/:id/title', async (req: Request, res: Response, next: NextFunction) => {
  await withIdempotency(req, res, next, {
    route: '/api/campaign/:id/title',
    getScope: (r) => r.params.id,
    getPayload: (r) => ({ title: r.body?.title }),
    execute: async () => {
      const campaignId = req.params.id;
      const { title } = req.body;
      
      if (!title || typeof title !== 'string' || title.trim().length === 0) {
        return {
          statusCode: 400,
          body: { success: false, error: 'Título inválido' },
        };
      }
      
      gameEngine.gameStateManager.updateCampaignFoundation(campaignId, { title: title.trim() });
      
      return {
        statusCode: 200,
        body: { success: true },
      };
    },
  });
});

app.delete('/api/campaign/:id', async (req: Request, res: Response, next: NextFunction) => {
  await withIdempotency(req, res, next, {
    route: '/api/campaign/:id',
    getScope: (r) => r.params.id,
    getPayload: () => ({}),
    execute: async () => {
      const campaignId = req.params.id;
      await gameEngine.deleteCampaign(campaignId);
      return {
        statusCode: 200,
        body: { success: true },
      };
    },
  });
});

// 3. Obter Detalhes da Campanha Atual
app.get('/api/campaign/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const campaignId = req.params.id;
    const details = await gameEngine.getCampaignDetails(campaignId);

    if (!details.gameState) {
      res.status(404).json({
        success: false,
        error: 'Campanha não encontrada.',
        code: 'NOT_FOUND',
      });
      return;
    }

    res.json({
      success: true,
      data: details,
    });
  } catch (error: unknown) {
    next(error);
  }
});

// 4. Obter Snapshot da Memory Layer Estruturada (Direto do store sem passar por IA)
app.get('/api/campaign/:id/memory', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const campaignId = req.params.id;
    const snapshot = await gameEngine.memoryManager.getStore().getSnapshot(campaignId);
    res.json({
      success: true,
      data: snapshot || {
        campaign: {
          campaignId,
          name: '',
          createdAt: Date.now(),
          currentDate: '',
          currentLocation: '',
        },
        npcs: {},
        events: [],
        knowledge: [],
        relationships: [],
        inventory: [],
        quests: [],
        updatedAt: Date.now(),
      },
    });
  } catch (error: unknown) {
    next(error);
  }
});

// 4.1. Obter Logs de Auditoria da Memory Layer
app.get('/api/campaign/:id/memory/logs', (req: Request, res: Response) => {
  const campaignId = req.params.id;
  const limit = parseInt(req.query.limit as string, 10) || 50;
  const logs = gameEngine.memoryManager.getLogs(campaignId, limit);
  res.json({
    success: true,
    data: logs,
  });
});

// 4.2. Limpar Logs de Auditoria
app.post('/api/campaign/:id/memory/logs/clear', async (req: Request, res: Response, next: NextFunction) => {
  const campaignId = req.params.id;
  await withIdempotency(req, res, next, {
    route: '/api/campaign/:id/memory/logs/clear',
    getScope: () => campaignId,
    getPayload: () => ({ campaignId }),
    execute: async () => {
      gameEngine.memoryManager.clearLogs();
      return {
        statusCode: 200,
        body: {
          success: true,
          message: 'Logs limpos com sucesso.',
        },
      };
    },
  });
});

// 5. Consultar Contexto Relevante Determinístico (getRelevantContext)
app.get('/api/campaign/:id/context', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const campaignId = req.params.id;
    const { currentLocation, npcsPresent, conversationTopic, characterInvolved } = req.query;

    const npcsList = typeof npcsPresent === 'string'
      ? npcsPresent.split(',').map((s) => s.trim())
      : Array.isArray(npcsPresent)
      ? (npcsPresent as string[])
      : [];

    const context = await gameEngine.memoryManager.getRelevantContext({
      campaignId,
      currentLocation: typeof currentLocation === 'string' ? currentLocation : undefined,
      presentNPCs: npcsList,
      conversationSubject: typeof conversationTopic === 'string' ? conversationTopic : undefined,
      playerCharacter: typeof characterInvolved === 'string' ? characterInvolved : undefined,
    });

    res.json({
      success: true,
      data: context,
    });
  } catch (error: unknown) {
    next(error);
  }
});

// 6. Enviar Mensagem / Ação do Jogador
app.post('/api/message', async (req: Request, res: Response, next: NextFunction) => {
  const rawCampaignId = req.body?.campaignId;
  const targetCampaignId = (rawCampaignId && typeof rawCampaignId === 'string' && rawCampaignId.trim().length > 0)
    ? rawCampaignId.trim()
    : 'session_main';

  await withIdempotency(req, res, next, {
    route: '/api/message',
    getScope: () => targetCampaignId,
    getPayload: (r) => ({
      campaignId: targetCampaignId,
      message: typeof r.body?.message === 'string' ? r.body.message.trim() : '',
    }),
    execute: async () => {
      const { message } = req.body;

      if (!message || typeof message !== 'string' || message.trim().length === 0) {
        return {
          statusCode: 400,
          body: {
            success: false,
            error: 'A mensagem do jogador é obrigatória.',
            code: 'INVALID_INPUT',
          },
        };
      }

      const output = await gameEngine.processPlayerAction(targetCampaignId, message.trim());

      return {
        statusCode: 200,
        body: {
          success: true,
          data: output,
        },
      };
    },
  });
});

// 6.5. Retry da última ação
app.post('/api/message/retry', async (req: Request, res: Response, next: NextFunction) => {
  const rawCampaignId = req.body?.campaignId;
  const targetCampaignId = (rawCampaignId && typeof rawCampaignId === 'string' && rawCampaignId.trim().length > 0)
    ? rawCampaignId.trim()
    : 'session_main';

  await withIdempotency(req, res, next, {
    route: '/api/message/retry',
    getScope: () => targetCampaignId,
    getPayload: () => ({
      campaignId: targetCampaignId,
    }),
    execute: async () => {
      const output = await gameEngine.retryLastPlayerAction(targetCampaignId);

      return {
        statusCode: 200,
        body: {
          success: true,
          data: output,
        },
      };
    },
  });
});

// 6.6. Editar última ação do jogador
app.post('/api/message/edit', async (req: Request, res: Response, next: NextFunction) => {
  const rawCampaignId = req.body?.campaignId;
  const targetCampaignId = (rawCampaignId && typeof rawCampaignId === 'string' && rawCampaignId.trim().length > 0)
    ? rawCampaignId.trim()
    : 'session_main';

  await withIdempotency(req, res, next, {
    route: '/api/message/edit',
    getScope: () => targetCampaignId,
    getPayload: (r) => ({
      campaignId: targetCampaignId,
      message: typeof r.body?.message === 'string' ? r.body.message.trim() : '',
    }),
    execute: async () => {
      const { message } = req.body;

      if (!message || typeof message !== 'string' || message.trim().length === 0) {
        return {
          statusCode: 400,
          body: {
            success: false,
            error: 'A mensagem do jogador é obrigatória.',
            code: 'INVALID_INPUT',
          },
        };
      }

      const output = await gameEngine.editLastPlayerAction(targetCampaignId, message.trim());

      return {
        statusCode: 200,
        body: {
          success: true,
          data: output,
        },
      };
    },
  });
});

// 7. Gerar Cenários (Sem criar campaignId)
app.all('/api/scenarios/generate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { generateThreeScenarios } = await import('./server/engine/scenarios/scenarioGenerator');
    const format = (req.body?.format || req.query?.format) as 'sandbox' | 'focused' | undefined;
    const worldBasis = (req.body?.worldBasis || req.query?.worldBasis) as 'real_world' | 'fictional' | undefined;
    const premise = (req.body?.premise || req.query?.premise) as string | undefined;
    const guidedPremise = req.body?.guidedPremise;

    const scenarios = await generateThreeScenarios({
      format: format === 'focused' ? 'focused' : 'sandbox',
      worldBasis: worldBasis === 'real_world' ? 'real_world' : 'fictional',
      premise: typeof premise === 'string' && premise.trim().length > 0 ? premise.trim() : undefined,
      guidedPremise: guidedPremise && typeof guidedPremise === 'object' ? guidedPremise : undefined,
    });
    res.json({
      success: true,
      data: { scenarios },
    });
  } catch (error: unknown) {
    next(error);
  }
});

// 8. Gerar Foundation para o cenário
app.post('/api/scenarios/foundation', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { generateFoundation } = await import('./server/engine/scenarios/foundationGenerator');
    const scenario = req.body.scenario;
    const format = (req.body.format || req.query.format) as 'sandbox' | 'focused' | undefined;
    const worldBasis = (req.body.worldBasis || req.query.worldBasis) as 'real_world' | 'fictional' | undefined;
    const premise = (req.body.premise || req.query.premise) as string | undefined;
    const guidedPremise = req.body.guidedPremise;

    if (!scenario) {
      res.status(400).json({ success: false, error: 'Cenário não fornecido.' });
      return;
    }
    const foundation = await generateFoundation(scenario, {
      format: format === 'focused' ? 'focused' : 'sandbox',
      worldBasis: worldBasis === 'real_world' ? 'real_world' : 'fictional',
      premise: typeof premise === 'string' && premise.trim().length > 0 ? premise.trim() : undefined,
      guidedPremise: guidedPremise && typeof guidedPremise === 'object' ? guidedPremise : undefined,
    });
    res.json({
      success: true,
      data: { foundation },
    });
  } catch (error: unknown) {
    next(error);
  }
});

// 9. Gerar Cenário a partir de Ideia Customizada
app.post('/api/scenarios/from-idea', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { generateScenarioFromIdea } = await import('./server/engine/scenarios/scenarioGenerator');
    const idea = req.body.idea;
    const format = (req.body.format || req.query.format) as 'sandbox' | 'focused' | undefined;
    const worldBasis = (req.body.worldBasis || req.query.worldBasis) as 'real_world' | 'fictional' | undefined;
    if (!idea || typeof idea !== 'string') {
      res.status(400).json({ success: false, error: 'Ideia não fornecida ou inválida.' });
      return;
    }
    const scenario = await generateScenarioFromIdea(idea, {
      format: format === 'focused' ? 'focused' : 'sandbox',
      worldBasis: worldBasis === 'real_world' ? 'real_world' : 'fictional',
    });
    res.json({
      success: true,
      data: { scenario },
    });
  } catch (error: unknown) {
    next(error);
  }
});

// 10. Mestre Escolhe Tudo (Proposta Completa + Foundation Adaptativa)
app.post('/api/scenarios/master-proposal', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { generateMasterProposal } = await import('./server/engine/scenarios/scenarioGenerator');
    const format = (req.body?.format || req.query?.format) as 'sandbox' | 'focused' | undefined;
    const worldBasis = (req.body?.worldBasis || req.query?.worldBasis) as 'real_world' | 'fictional' | undefined;
    const result = await generateMasterProposal(
      format === 'focused' ? 'focused' : 'sandbox',
      worldBasis === 'real_world' ? 'real_world' : 'fictional'
    );
    res.json({
      success: true,
      data: result,
    });
  } catch (error: unknown) {
    next(error);
  }
});

// 11. Sugerir 3 Conceitos Abertos de Personagem (Sem Imposição)
app.post('/api/scenarios/character-concepts', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { generateCharacterConcepts } = await import('./server/engine/scenarios/scenarioGenerator');
    const { scenario, format, worldBasis } = req.body || {};
    if (!scenario) {
      res.status(400).json({ success: false, error: 'Cenário não fornecido.' });
      return;
    }
    const concepts = await generateCharacterConcepts(
      scenario,
      format === 'focused' ? 'focused' : 'sandbox',
      worldBasis === 'real_world' ? 'real_world' : 'fictional'
    );
    res.json({
      success: true,
      data: { concepts },
    });
  } catch (error: unknown) {
    next(error);
  }
});

// ==========================================
// Tratamento Centralizado de Erros
// ==========================================
app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
  console.error('[RPG Engine Server Error]:', err);

  if (err instanceof NarratorError) {
    const statusMap: Record<string, number> = {
      MISSING_API_KEY: 503,
      API_ERROR: 502,
      TIMEOUT: 504,
      INVALID_RESPONSE: 502,
      UNKNOWN: 500,
    };
    const statusCode = statusMap[err.code] || 500;

    const formattedDetails = err.details
      ? (err.details instanceof Error ? err.details.message : typeof err.details === 'object' ? JSON.stringify(err.details) : String(err.details))
      : null;

    res.status(statusCode).json({
      success: false,
      error: err.message,
      code: err.code,
      details: formattedDetails,
    });
    return;
  }

  const errorMessage = (err as Error)?.message || 'Ocorreu um erro interno no servidor.';
  res.status(500).json({
    success: false,
    error: errorMessage,
    code: 'INTERNAL_SERVER_ERROR',
  });
});

// ==========================================
// Inicialização do Servidor com Vite
// ==========================================
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Sandbox RPG Engine] Servidor ativo em http://0.0.0.0:${PORT}`);
  });
}

startServer();
