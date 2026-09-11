/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';

export interface IdempotencyRecord {
  key: string;
  route: string;
  scope: string;
  compositeKey: string;
  payloadFingerprint: string;
  status: 'completed';
  statusCode: number;
  responseData: any;
  createdAt: number;
  completedAt: number;
}

export interface InFlightEntry {
  promise: Promise<IdempotencyExecutionResult>;
  fingerprint: string;
  createdAt: number;
}

export interface IdempotencyExecutionResult {
  statusCode: number;
  body: any;
  cached: boolean;
  replay: boolean;
}

export interface IdempotentHandlerResult {
  statusCode?: number;
  body: any;
}

/**
 * Normaliza e canoniza estruturas JSON recursivamente (ordenando chaves alfabeticamente)
 * para garantir hashing determinístico e estável de payloads equivalentes.
 */
export function canonicalizeJson(obj: unknown): string {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return '[' + obj.map(canonicalizeJson).join(',') + ']';
  }
  const record = obj as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  const pairs = keys.map((k) => `${JSON.stringify(k)}:${canonicalizeJson(record[k])}`);
  return '{' + pairs.join(',') + '}';
}

export function computePayloadFingerprint(payload: unknown): string {
  const canonical = canonicalizeJson(payload || {});
  return crypto.createHash('sha256').update(canonical, 'utf8').digest('hex');
}

export class IdempotencyPersistenceError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = 'IdempotencyPersistenceError';
  }
}

export class IdempotencyManager {
  private inMemoryCache: Map<string, IdempotencyRecord> = new Map();
  private inFlightRequests: Map<string, InFlightEntry> = new Map();
  private dataDir: string;

  constructor(dataDir?: string) {
    this.dataDir = dataDir || path.join(process.cwd(), 'data', 'rpg_idempotency');
    this.ensureDataDir();
  }

  private ensureDataDir(): void {
    try {
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
      }
    } catch (err) {
      console.error('[IdempotencyManager] Falha ao criar diretório de idempotência:', err);
    }
  }

  public computeCompositeKey(route: string, scope: string, key: string): string {
    const cleanRoute = route.toLowerCase().replace(/\/+/g, '/').replace(/\/$/, '');
    const cleanScope = (scope || 'global').trim();
    const cleanKey = key.trim();
    return `${cleanRoute}:${cleanScope}:${cleanKey}`;
  }

  private getFilePath(compositeKey: string): string {
    const hash = crypto.createHash('sha256').update(compositeKey).digest('hex').substring(0, 32);
    const cleanPrefix = compositeKey.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 40);
    return path.join(this.dataDir, `idem_${cleanPrefix}_${hash}.json`);
  }

  public async getRecord(compositeKey: string): Promise<IdempotencyRecord | null> {
    // 1. Busca em memória RAM
    if (this.inMemoryCache.has(compositeKey)) {
      return this.inMemoryCache.get(compositeKey)!;
    }

    // 2. Busca no disco persistente (sobrevive a restarts)
    const filePath = this.getFilePath(compositeKey);
    try {
      if (fs.existsSync(filePath)) {
        const raw = await fs.promises.readFile(filePath, 'utf-8');
        const record = JSON.parse(raw) as IdempotencyRecord;
        if (record && record.status === 'completed') {
          this.inMemoryCache.set(compositeKey, record);
          return record;
        }
      }
    } catch (err) {
      console.warn(`[IdempotencyManager] Falha ao ler registro de idempotência do disco (${compositeKey}):`, err);
    }

    return null;
  }

  /**
   * Persiste o registro de idempotência garantindo a sequência estrita:
   * construir registro -> escrever arquivo temporário -> rename bem-sucedido -> atualizar cache.
   * Se writeFile ou rename falhar, remove o temporário, garante que o cache não é alterado e propaga a falha.
   */
  public async saveRecord(record: IdempotencyRecord): Promise<void> {
    const filePath = this.getFilePath(record.compositeKey);
    const tempPath = `${filePath}.tmp.${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    try {
      await fs.promises.writeFile(tempPath, JSON.stringify(record, null, 2), 'utf-8');
      await fs.promises.rename(tempPath, filePath);
      // O cache só é atualizado APÓS a confirmação de escrita durável no disco
      this.inMemoryCache.set(record.compositeKey, record);
    } catch (err) {
      // Limpeza segura do arquivo temporário se criado
      try {
        await fs.promises.unlink(tempPath);
      } catch {
        // Arquivo temporário pode não ter sido criado se writeFile falhou
      }
      // Garante que o registro NÃO fica disponível no cache em memória
      this.inMemoryCache.delete(record.compositeKey);

      throw new IdempotencyPersistenceError(
        `Falha ao persistir registro de idempotência em disco para chave ${record.compositeKey}: ${(err as Error)?.message || err}`,
        err
      );
    }
  }

  public async process(params: {
    route: string;
    scope: string;
    key?: string | null;
    payload: unknown;
    execute: () => Promise<IdempotentHandlerResult>;
  }): Promise<IdempotencyExecutionResult> {
    const rawKey = params.key;
    if (!rawKey || typeof rawKey !== 'string' || rawKey.trim().length === 0) {
      // Sem chave de idempotência: executa diretamente sem deduplicação
      const directResult = await params.execute();
      return {
        statusCode: directResult.statusCode || 200,
        body: directResult.body,
        cached: false,
        replay: false,
      };
    }

    const key = rawKey.trim();
    const compositeKey = this.computeCompositeKey(params.route, params.scope, key);
    const fingerprint = computePayloadFingerprint(params.payload);

    // 1. Verificar se já foi concluído anteriormente (replay)
    const existing = await this.getRecord(compositeKey);
    if (existing) {
      if (existing.payloadFingerprint !== fingerprint) {
        return {
          statusCode: 409,
          body: {
            success: false,
            error: 'Conflito de idempotência: a mesma chave foi reutilizada com parâmetros diferentes.',
            code: 'IDEMPOTENCY_CONFLICT',
          },
          cached: false,
          replay: false,
        };
      }

      return {
        statusCode: existing.statusCode,
        body: existing.responseData,
        cached: true,
        replay: true,
      };
    }

    // 2. Verificar se existe requisição in-flight simultânea com a mesma chave
    const inFlight = this.inFlightRequests.get(compositeKey);
    if (inFlight) {
      if (inFlight.fingerprint !== fingerprint) {
        return {
          statusCode: 409,
          body: {
            success: false,
            error: 'Conflito de idempotência: requisição concorrente com a mesma chave e payload diferente.',
            code: 'IDEMPOTENCY_CONFLICT',
          },
          cached: false,
          replay: false,
        };
      }

      // Reutiliza o resultado da requisição em voo
      const inFlightResult = await inFlight.promise;
      return {
        statusCode: inFlightResult.statusCode,
        body: inFlightResult.body,
        cached: true,
        replay: true,
      };
    }

    // 3. Primeira execução: registra in-flight e executa a lógica de negócio
    let resolvePromise!: (val: IdempotencyExecutionResult) => void;
    let rejectPromise!: (err: any) => void;
    const inFlightPromise = new Promise<IdempotencyExecutionResult>((resolve, reject) => {
      resolvePromise = resolve;
      rejectPromise = reject;
    });
    // Evita UnhandledPromiseRejection se a requisição principal falhar sem requisições concorrentes aguardando
    inFlightPromise.catch(() => {});

    this.inFlightRequests.set(compositeKey, {
      promise: inFlightPromise,
      fingerprint,
      createdAt: Date.now(),
    });

    try {
      const execResult = await params.execute();
      const statusCode = execResult.statusCode || 200;
      const body = execResult.body;

      const finalResult: IdempotencyExecutionResult = {
        statusCode,
        body,
        cached: false,
        replay: false,
      };

      // Só persiste se for um status de sucesso ou erro de validação controlado (não 500)
      if (statusCode >= 200 && statusCode < 500) {
        const record: IdempotencyRecord = {
          key,
          route: params.route,
          scope: params.scope,
          compositeKey,
          payloadFingerprint: fingerprint,
          status: 'completed',
          statusCode,
          responseData: body,
          createdAt: Date.now(),
          completedAt: Date.now(),
        };
        await this.saveRecord(record);
      }

      resolvePromise(finalResult);
      return finalResult;
    } catch (err) {
      rejectPromise(err);
      throw err;
    } finally {
      this.inFlightRequests.delete(compositeKey);
    }
  }

  public clear(): void {
    this.inMemoryCache.clear();
    this.inFlightRequests.clear();
  }
}

export const defaultIdempotencyManager = new IdempotencyManager();

/**
 * Express Helper / Middleware wrapper para encapsular chamadas a rotas mutáveis
 * com garantia atômica de idempotência.
 */
export async function withIdempotency(
  req: Request,
  res: Response,
  next: NextFunction,
  options: {
    route: string;
    getScope: (req: Request) => string;
    getPayload?: (req: Request) => unknown;
    execute: () => Promise<IdempotentHandlerResult>;
  },
  manager: IdempotencyManager = defaultIdempotencyManager
): Promise<void> {
  const rawKey = req.header('idempotency-key') || req.header('Idempotency-Key');
  const key = typeof rawKey === 'string' ? rawKey.trim() : '';

  if (!key) {
    try {
      const result = await options.execute();
      res.status(result.statusCode || 200).json(result.body);
    } catch (err) {
      next(err);
    }
    return;
  }

  try {
    const route = options.route;
    const scope = options.getScope(req);
    const payload = options.getPayload ? options.getPayload(req) : req.body;

    const result = await manager.process({
      route,
      scope,
      key,
      payload,
      execute: options.execute,
    });

    if (result.replay) {
      res.setHeader('X-Idempotent-Replay', 'true');
    }
    res.setHeader('Idempotency-Key', key);

    res.status(result.statusCode).json(result.body);
  } catch (err) {
    next(err);
  }
}
