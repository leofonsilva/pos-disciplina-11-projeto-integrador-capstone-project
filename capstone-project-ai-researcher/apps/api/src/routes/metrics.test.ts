import { describe, expect, it } from 'vitest';
import Fastify from 'fastify';

import metricsRoute from './metrics.js';
import type { MetricsRegistry } from './metrics.js';

function fakeRegistry(body: string): MetricsRegistry {
  return {
    contentType: 'text/plain; version=0.0.4; charset=utf-8',
    async metrics() {
      return body;
    },
  };
}

describe('GET /api/metrics', () => {
  it('devolve o corpo do registry com o content-type do Prometheus', async () => {
    const app = Fastify();
    await app.register(metricsRoute, {
      prefix: '/api',
      registry: fakeRegistry(
        'llm_cost_usd_total{node="grade",model="gemini-3.5-flash-lite"} 0.001\n',
      ),
    });

    const response = await app.inject({ method: 'GET', url: '/api/metrics' });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toBe('text/plain; version=0.0.4; charset=utf-8');
    expect(response.payload).toContain('llm_cost_usd_total');
  });
});
