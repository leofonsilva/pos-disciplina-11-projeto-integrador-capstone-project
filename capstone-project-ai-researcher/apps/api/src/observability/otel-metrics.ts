import { metrics } from '@opentelemetry/api';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-proto';
import { resourceFromAttributes } from '@opentelemetry/resources';
import {
  ATTR_HTTP_REQUEST_METHOD,
  ATTR_HTTP_RESPONSE_STATUS_CODE,
  ATTR_HTTP_ROUTE,
  ATTR_SERVICE_NAME,
} from '@opentelemetry/semantic-conventions';
import { MeterProvider, PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import type { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';

let meterProviderRegistrado = false;

function configurado(): boolean {
  return Boolean(process.env.OTEL_EXPORTER_OTLP_ENDPOINT);
}

// Chamado uma vez no boot (src/index.ts), antes de build() — mesmo padrão de
// registrarLangfuseTracing() em packages/agent: sem OTEL_EXPORTER_OTLP_ENDPOINT/
// OTEL_EXPORTER_OTLP_HEADERS no ambiente, não registra nada e não impede o processo de subir.
// Foco aqui é o que o Langfuse (G.1) não cobre — saúde HTTP operacional (latência, taxa de
// erro por rota) — não chamada de LLM, que já tem trace e custo (G.1/G.2). O exporter lê
// OTEL_EXPORTER_OTLP_ENDPOINT/HEADERS diretamente do ambiente, sem código nosso pra isso.
export function registrarOtelMetrics(): void {
  if (meterProviderRegistrado || !configurado()) return;

  const meterProvider = new MeterProvider({
    resource: resourceFromAttributes({ [ATTR_SERVICE_NAME]: 'ai-researcher-api' }),
    readers: [new PeriodicExportingMetricReader({ exporter: new OTLPMetricExporter() })],
  });

  metrics.setGlobalMeterProvider(meterProvider);
  meterProviderRegistrado = true;
}

// Hook onResponse aplicado a toda rota registrada depois dele — grava latência e status por
// rota. request.routeOptions.url é o padrão da rota ("/chat"), não a URL com valores reais,
// então não vira alta cardinalidade nem loga query string.
//
// getMeter()/createHistogram() só podem ser chamados DEPOIS de registrarOtelMetrics() ter
// rodado — diferente da API de trace (que usa um proxy com bind tardio), a API de métricas
// resolve o MeterProvider no momento da criação do instrumento, não no record(). Chamar isso
// no carregamento do módulo (fora da função do plugin) prende o instrumento no
// NoopMeterProvider pra sempre, mesmo que setGlobalMeterProvider() rode depois — confirmado
// isolando o cenário: os dados nunca chegam no Grafana, sem nenhum erro visível. Por isso a
// criação do histograma mora dentro do plugin, que só executa quando Fastify processa
// api.register() no boot — depois de registrarOtelMetrics() em index.ts.
//
// fastify-plugin (fp) é obrigatório aqui: sem ele, api.register(otelHttpMetricsPlugin) cria um
// contexto de encapsulamento próprio, e o addHook('onResponse', ...) só valeria dentro desse
// contexto — nenhuma rota real está registrada nele, então o hook nunca dispararia pra
// health/chat/metrics/mcp (todos plugins irmãos). fp() marca o plugin como "não encapsulado",
// anexando o hook no escopo pai (o prefixo /api), onde as rotas de fato vivem. Confirmado
// isolando o bug: sem fp(), o export OTLP funciona (nenhum erro, nenhum log), só que o
// histograma nunca é preenchido porque o hook nunca roda.
export const otelHttpMetricsPlugin: FastifyPluginAsync = fp(async (app) => {
  const meter = metrics.getMeter('ai-researcher-api-http');
  const duracaoRequisicao = meter.createHistogram('http.server.request.duration', {
    description: 'Duração de requisições HTTP, em segundos',
    unit: 's',
  });

  app.addHook('onResponse', async (request, reply) => {
    duracaoRequisicao.record(reply.elapsedTime / 1000, {
      [ATTR_HTTP_ROUTE]: request.routeOptions?.url ?? 'desconhecida',
      [ATTR_HTTP_REQUEST_METHOD]: request.method,
      [ATTR_HTTP_RESPONSE_STATUS_CODE]: reply.statusCode,
    });
  });
});
