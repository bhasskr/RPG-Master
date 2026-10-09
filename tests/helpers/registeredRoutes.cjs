// Integração PARCIAL: executa handlers de server.ts, sem copiar seu código.
// Transporte/registro Express simulados: não prova parser HTTP, sockets ou DOM.
const Module = require('node:module');
const path = require('node:path');
module.exports = async function registeredRoutes(engine) {
  const serverPath = path.join(process.env.RPG_TEST_REPO, 'server.ts');
  const routes = new Map();
  let errorHandler;
  let ready;
  const started = new Promise((resolve) => { ready = resolve; });
  const app = {
    use(handler) { if (typeof handler === 'function' && handler.length === 4) errorHandler = handler; },
    listen() { ready(); },
  };
  for (const method of ['get', 'post', 'put', 'delete', 'all']) {
    app[method] = (url, handler) => routes.set(`${method.toUpperCase()} ${url}`, handler);
  }
  const express = () => app;
  express.json = express.urlencoded = express.static = () => (_req, _res, next) => next();
  const originalLoad = Module._load;
  Module._load = function (id, parent, isMain) {
    if (parent?.filename === serverPath) {
      if (id === 'express') return express;
      if (id === 'dotenv') return { config() {} };
      if (id === 'vite') return { createServer: async () => ({ middlewares() {} }) };
      if (id === './server/engine/gameEngine') return { gameEngine: engine };
    }
    return originalLoad.call(this, id, parent, isMain);
  };
  try {
    delete require.cache[serverPath];
    require(serverPath);
    await started;
  } finally { Module._load = originalLoad; delete require.cache[serverPath]; }
  return async (method, url, body, key) => {
    const handler = routes.get(`${method} ${url}`);
    if (!handler) throw new Error(`Rota real não registrada: ${method} ${url}`);
    const req = { body, params: {}, query: {}, headers: { 'idempotency-key': key },
      header: (name) => name.toLowerCase() === 'idempotency-key' ? key : undefined };
    const result = { status: 200, body: undefined, headers: {} };
    const res = {
      status(code) { result.status = code; return res; },
      json(data) { result.body = data; return res; },
      setHeader(name, value) { result.headers[name] = value; },
    };
    const next = (error) => {
      if (!error) return;
      if (!errorHandler) throw error;
      errorHandler(error, req, res, () => { throw error; });
    };
    await handler(req, res, next);
    if (result.body === undefined) throw new Error('Handler não enviou resposta');
    return result;
  };
};
