import Fastify from 'fastify';
import rateLimit from '@fastify/rate-limit';
import {
  buildGraph,
  buscarDocumentosSimilares,
  criarEmbeddings,
  criarGraphDepsPadrao,
  criarLangfuseCallbacks,
  criarMetricsCallback,
  db,
  metricsRegistry,
} from '@hero/agent';
import type { Buscar, EmbeddingsClient } from '@hero/agent';
import { mcpHttpRoute } from '@hero/mcp-server';
import type { GraphLike as McpGraphLike } from '@hero/mcp-server';
import healthRoute from './routes/health.js';
import debugRetrieveRoute from './routes/debug-retrieve.js';
import chatRoute from './routes/chat.js';
import type { GraphLike as ChatGraphLike } from './routes/chat.js';
import metricsRoute from './routes/metrics.js';
import type { MetricsRegistry } from './routes/metrics.js';
import { otelHttpMetricsPlugin } from './observability/otel-metrics.js';
import { criarRateLimitOptions } from './rate-limit.js';
import { checkDatabase as defaultCheckDatabase } from './db.js';
import { errorHandler } from './error-handler.js';

// Constrói o grafo real só no primeiro uso (POST /chat ou tool perguntar via /api/mcp), não
// na inicialização do app — assim build() continua seguro em teste, sem exigir
// SERPER_API_KEY/GOOGLE_CUSTOM_SEARCH_* (a própria criarSearchProvider() lança erro síncrono
// se a variável faltar). Instância única compartilhada entre os dois pontos de entrada — evita
// duas instâncias de SearchProvider (e dois circuit breakers independentes) pra mesma API.
function criarObterGrafo(): () => ReturnType<typeof buildGraph> {
  let grafoReal: ReturnType<typeof buildGraph> | undefined;
  return () => (grafoReal ??= buildGraph(criarGraphDepsPadrao()));
}

export interface BuildOptions {
  checkDatabase?: () => Promise<boolean>;
  debugRoutes?: boolean;
  embeddings?: EmbeddingsClient;
  buscar?: Buscar;
  graph?: ChatGraphLike;
  mcpGraph?: McpGraphLike;
  metrics?: MetricsRegistry;
}

export function build({
  checkDatabase = defaultCheckDatabase,
  debugRoutes = process.env.DEBUG_ROUTES === 'true',
  embeddings,
  buscar,
  graph,
  mcpGraph,
  metrics,
}: BuildOptions = {}) {
  const app = Fastify({ logger: true });
  app.setErrorHandler(errorHandler);
  // Latência/status por rota (G.3), incluindo 404 — registrado na raiz do app, não dentro do
  // prefixo /api: um 404 pra rota inexistente nunca entra no contexto encapsulado de /api
  // (não bate com nenhuma rota lá dentro), então um hook registrado só dentro daquele prefixo
  // nunca dispararia pra ele. Sem OTEL_EXPORTER_OTLP_ENDPOINT configurado, é um no-op (ver
  // otel-metrics.ts), então isso nunca precisa de branch condicional aqui.
  app.register(otelHttpMetricsPlugin);
  // Global por padrão (G.4) — /health e /metrics desligam via config: { rateLimit: false }
  // nas próprias rotas, porque são baratas e batidas com frequência por infra, não usuário
  // final. RATE_LIMIT_MAX/RATE_LIMIT_WINDOW configuráveis por env var (rate-limit.ts). Estado
  // em memória por instância do Cloud Run — com mais de uma instância, o limite é por
  // instância, não global (mesma limitação do budget de tokens abaixo).
  app.register(rateLimit, criarRateLimitOptions());

  const obterGrafo = criarObterGrafo();

  app.register(
    async (api) => {
      api.register(healthRoute, { checkDatabase });
      // Custo real por nó/modelo (G.2) — o callback de metrics.ts é passado junto com o do
      // Langfuse (callbacks: [...]) em toda chamada de graph.stream()/invoke() abaixo, nunca
      // dentro de llm.ts (ver comentário lá — passar callbacks no invoke() de dentro do nó
      // substitui o callback manager ambiente em vez de somar a ele, e quebra o Langfuse
      // junto). Prometheus faz o scrape e agrega no tempo; esta rota só expõe o snapshot
      // atual do processo.
      api.register(metricsRoute, { registry: metrics ?? metricsRegistry });
      // callbacks: criarLangfuseCallbacks() — G.1. Array vazio quando LANGFUSE_PUBLIC_KEY/
      // LANGFUSE_SECRET_KEY não estão configuradas, então isso nunca precisa de branch
      // condicional aqui; o trace simplesmente não é enviado.
      api.register(chatRoute, {
        graph: graph ?? {
          stream: (input) =>
            obterGrafo().stream(input, {
              callbacks: [...criarLangfuseCallbacks(), criarMetricsCallback()],
            }),
        },
      });

      // Gateway MCP pro Angular (e qualquer outro cliente HTTP) — mesmas tools do transporte
      // stdio (packages/mcp-server), só o transporte muda. A rota já se chama /mcp dentro do
      // plugin (ver http-route.ts), então isso vira /api/mcp — sem prefixo extra aqui.
      // Mesmo grafo do /chat: ver comentário de criarObterGrafo.
      api.register(mcpHttpRoute, {
        graph: mcpGraph ?? {
          invoke: (input) =>
            obterGrafo().invoke(input, {
              callbacks: [...criarLangfuseCallbacks(), criarMetricsCallback()],
            }),
        },
      });

      // Rota de debug: nunca sobe em produção — DEBUG_ROUTES não é setada no Cloud Run.
      if (debugRoutes) {
        api.register(debugRetrieveRoute, {
          embeddings: embeddings ?? criarEmbeddings(),
          buscar: buscar ?? ((embedding, k) => buscarDocumentosSimilares(db, embedding, k)),
        });
      }
    },
    { prefix: '/api' },
  );

  return app;
}
