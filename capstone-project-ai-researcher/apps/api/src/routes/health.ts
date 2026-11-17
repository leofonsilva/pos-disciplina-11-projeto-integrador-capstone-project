import type { FastifyPluginAsync } from 'fastify';
import { healthResponseSchema } from '@hero/contracts';

export interface HealthRouteOptions {
  checkDatabase: () => Promise<boolean>;
}

const healthRoute: FastifyPluginAsync<HealthRouteOptions> = async (app, { checkDatabase }) => {
  // Sem rate limit (G.4): é a rota que o próprio Cloud Run e o capstone:check batem com
  // frequência, e é barata (só um SELECT), sem custo de LLM pra proteger.
  app.get('/health', { config: { rateLimit: false } }, async () => {
    const databaseOk = await checkDatabase();

    return healthResponseSchema.parse({
      status: databaseOk ? 'ok' : 'degraded',
      database: databaseOk ? 'ok' : 'error',
    });
  });
};

export default healthRoute;
