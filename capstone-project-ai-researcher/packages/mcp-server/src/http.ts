import { registrarLangfuseTracing } from '@hero/agent';
import Fastify from 'fastify';

import mcpHttpRoute from './http-route.js';

registrarLangfuseTracing();

const app = Fastify({ logger: true });
app.register(mcpHttpRoute);

const port = Number(process.env.MCP_HTTP_PORT ?? 3100);
app.listen({ port, host: '0.0.0.0' }).catch((error) => {
  app.log.error(error);
  process.exit(1);
});
