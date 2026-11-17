import { afterEach, describe, expect, it, vi } from 'vitest';
import { HealthService } from './health.service';

describe('HealthService', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('faz GET /api/health e devolve o status validado', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ status: 'ok', database: 'ok' }), { status: 200 }),
        ),
    );

    const health = await new HealthService().fetchHealth();

    expect(health).toEqual({ status: 'ok', database: 'ok' });
  });

  it('lança erro quando a resposta HTTP não é ok', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 500 })));

    await expect(new HealthService().fetchHealth()).rejects.toThrow('status 500');
  });
});
