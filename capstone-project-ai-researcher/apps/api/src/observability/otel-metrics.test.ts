import { metrics } from '@opentelemetry/api';
import {
  AggregationTemporality,
  InMemoryMetricExporter,
  MeterProvider,
  PeriodicExportingMetricReader,
} from '@opentelemetry/sdk-metrics';
import Fastify from 'fastify';
import { afterEach, describe, expect, it } from 'vitest';

import { otelHttpMetricsPlugin, registrarOtelMetrics } from './otel-metrics.js';

afterEach(() => {
  delete process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
});

describe('registrarOtelMetrics', () => {
  it('sem OTEL_EXPORTER_OTLP_ENDPOINT, não troca o MeterProvider global', () => {
    const antes = metrics.getMeterProvider();

    registrarOtelMetrics();

    expect(metrics.getMeterProvider()).toBe(antes);
  });
});

describe('otelHttpMetricsPlugin', () => {
  // Um único teste, não dois: metrics.setGlobalMeterProvider() só tem efeito na primeira
  // chamada por processo (mesmo comportamento do resto da API global do OpenTelemetry —
  // chamadas seguintes são ignoradas, sem erro) — dois testes tentando registrar dois
  // MeterProviders diferentes fariam o segundo gravar silenciosamente no exporter do
  // primeiro. Duas requisições na mesma execução evitam o problema.
  //
  // Este teste existe porque uma versão anterior tinha dois bugs reais, só visíveis contra o
  // Grafana Cloud de verdade (sem nenhum erro no log): 1) o histograma era criado no
  // carregamento do módulo, antes do MeterProvider global existir, e a API de métricas do
  // OpenTelemetry (diferente da de trace) não faz bind tardio — os dados nunca chegavam a
  // lugar nenhum; 2) sem fastify-plugin, o addHook('onResponse', ...) ficava preso no
  // contexto encapsulado do próprio plugin, sem nenhuma rota real registrada nele, e por isso
  // nunca disparava. Este teste falha se qualquer um dos dois voltar.
  it('grava latência e status por rota, usando o padrão da rota (não a URL real, nem em 404)', async () => {
    const exporter = new InMemoryMetricExporter(AggregationTemporality.CUMULATIVE);
    const provider = new MeterProvider({
      readers: [new PeriodicExportingMetricReader({ exporter, exportIntervalMillis: 60_000 })],
    });
    metrics.setGlobalMeterProvider(provider);

    const app = Fastify();
    await app.register(otelHttpMetricsPlugin);
    app.get('/rota/:id', async () => ({ ok: true }));

    const resposta = await app.inject({ method: 'GET', url: '/rota/123' });
    expect(resposta.statusCode).toBe(200);
    await app.inject({ method: 'GET', url: '/nao-existe/qualquer-coisa' });

    await provider.forceFlush();
    const [resourceMetrics] = exporter.getMetrics();
    const duracao = resourceMetrics?.scopeMetrics[0]?.metrics.find(
      (m) => m.descriptor.name === 'http.server.request.duration',
    );

    expect(duracao?.dataPoints).toHaveLength(2);

    const rotaConhecida = duracao?.dataPoints.find(
      (p) => p.attributes['http.route'] === '/rota/:id',
    );
    expect(rotaConhecida?.attributes['http.request.method']).toBe('GET');
    expect(rotaConhecida?.attributes['http.response.status_code']).toBe(200);

    // Rota inexistente usa "desconhecida" em vez da URL real, pra não virar alta cardinalidade.
    const rotaDesconhecida = duracao?.dataPoints.find(
      (p) => p.attributes['http.route'] === 'desconhecida',
    );
    expect(rotaDesconhecida?.attributes['http.response.status_code']).toBe(404);
  });
});
