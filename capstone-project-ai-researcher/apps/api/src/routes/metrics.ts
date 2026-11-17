import type { FastifyPluginAsync } from 'fastify';

// Só o formato mínimo que a rota usa do Registry do prom-client — mesmo padrão de GraphLike
// em chat.ts: permite fake em teste sem trazer prom-client pra apps/api.
export interface MetricsRegistry {
  contentType: string;
  metrics(): Promise<string>;
}

export interface MetricsRouteOptions {
  registry: MetricsRegistry;
}

const metricsRoute: FastifyPluginAsync<MetricsRouteOptions> = async (app, { registry }) => {
  // Sem rate limit (G.4): é o endpoint que o Prometheus/Grafana Cloud faz scrape em
  // intervalo fixo, não algo exposto a abuso de usuário final.
  app.get('/metrics', { config: { rateLimit: false } }, async (request, reply) => {
    reply.header('Content-Type', registry.contentType);
    return registry.metrics();
  });
};

export default metricsRoute;
