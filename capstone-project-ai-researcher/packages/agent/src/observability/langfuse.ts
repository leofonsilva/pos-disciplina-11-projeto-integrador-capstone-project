import { CallbackHandler } from '@langfuse/langchain';
import { LangfuseSpanProcessor } from '@langfuse/otel';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';

let tracerRegistrado = false;

function configurado(): boolean {
  return Boolean(process.env.LANGFUSE_PUBLIC_KEY && process.env.LANGFUSE_SECRET_KEY);
}

// Chamado uma vez no boot do processo (apps/api/src/index.ts, packages/mcp-server/src/stdio.ts
// e http.ts). Sem LANGFUSE_PUBLIC_KEY/LANGFUSE_SECRET_KEY, não registra nada — trace fica
// desligado, não impede o processo de subir (mesmo espírito de SERPER_API_KEY: credencial
// pendente não é motivo pra derrubar o serviço). Idempotente: seguro chamar mais de uma vez.
export function registrarLangfuseTracing(): void {
  if (tracerRegistrado || !configurado()) return;

  new NodeTracerProvider({
    spanProcessors: [new LangfuseSpanProcessor()],
  }).register();
  tracerRegistrado = true;
}

// Passado em graph.stream(input, { callbacks: criarLangfuseCallbacks() }) — array vazio (não
// undefined) quando o Langfuse não está configurado, então quem chama nunca precisa checar
// condicionalmente antes de espalhar. Cada chamada gera um CallbackHandler novo: são baratos
// (sem I/O síncrono) e o Langfuse os associa por trace, não por processo.
export function criarLangfuseCallbacks(): CallbackHandler[] {
  return configurado() ? [new CallbackHandler()] : [];
}
