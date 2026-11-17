import { registrarLangfuseTracing } from '@hero/agent';
import { build } from './app.js';
import { registrarOtelMetrics } from './observability/otel-metrics.js';

registrarLangfuseTracing();
registrarOtelMetrics();

const app = build();

app.listen({ port: Number(process.env.PORT ?? 3000), host: '0.0.0.0' }).catch((error) => {
  app.log.error(error);
  process.exit(1);
});
