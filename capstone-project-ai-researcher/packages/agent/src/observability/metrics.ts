import { Counter, Registry } from 'prom-client';

import { registrarConsumoDeTokens } from './budget.js';
import { custoUsd, type UsoTokens } from './pricing.js';

// Registry próprio, não o default global de prom-client — evita coletar métricas de
// processo (default do prom-client) misturadas com as nossas sem essa decisão ser
// explícita aqui. Se um dia quisermos métricas de processo (heap, event loop), isso entra
// com collectDefaultMetrics({ register }) explicitamente.
export const registry = new Registry();

const tokensTotal = new Counter({
  name: 'llm_tokens_total',
  help: 'Tokens consumidos por nó do grafo, modelo e tipo (input/output), a partir do usage_metadata real de cada chamada',
  labelNames: ['node', 'model', 'kind'] as const,
  registers: [registry],
});

const custoTotalUsd = new Counter({
  name: 'llm_cost_usd_total',
  help: 'Custo acumulado em USD por nó do grafo e modelo, calculado a partir do usage_metadata real de cada chamada',
  labelNames: ['node', 'model'] as const,
  registers: [registry],
});

interface ChatModelStartMetadata {
  langgraph_node?: string;
  ls_model_name?: string;
}

interface LlmEndOutput {
  llmOutput?: {
    usage_metadata?: UsoTokens;
  };
}

// Callback LangChain (CallbackHandlerMethods), passado em graph.stream()/graph.invoke()
// junto com criarLangfuseCallbacks() — nunca dentro de llm.ts (ver comentário lá). Node e
// model não são conhecidos estaticamente aqui: vêm do metadata que o LangGraph já anexa a
// toda chamada de chat model dentro de um nó (`langgraph_node`) e que o LangChain anexa a
// toda chamada de chat model (`ls_model_name`, convenção "LangSmith" que independe de
// LangSmith estar em uso) — é o mesmo par de campos que @langfuse/langchain lê internamente
// pra atribuir a generation ao nó certo no trace.
// Uma instância nova por chamada (ver criarLangfuseCallbacks(), mesmo padrão): o Map local
// correlaciona handleChatModelStart → handleLLMEnd por runId dentro de uma única execução do
// grafo, sem estado compartilhado entre requests concorrentes.
export function criarMetricsCallback() {
  const infoPorRun = new Map<string, { node: string; model: string }>();

  function registrarInicio(runId: string, metadata?: ChatModelStartMetadata) {
    infoPorRun.set(runId, {
      node: metadata?.langgraph_node ?? 'desconhecido',
      model: metadata?.ls_model_name ?? 'desconhecido',
    });
  }

  return {
    handleChatModelStart(
      _llm: unknown,
      _messages: unknown,
      runId: string,
      _parentRunId?: string,
      _extraParams?: unknown,
      _tags?: string[],
      metadata?: ChatModelStartMetadata,
    ) {
      registrarInicio(runId, metadata);
    },
    handleLLMEnd(output: LlmEndOutput, runId: string) {
      const info = infoPorRun.get(runId);
      infoPorRun.delete(runId);

      const uso = output.llmOutput?.usage_metadata;
      if (!uso || !info) return;

      tokensTotal.inc({ node: info.node, model: info.model, kind: 'input' }, uso.input_tokens);
      tokensTotal.inc({ node: info.node, model: info.model, kind: 'output' }, uso.output_tokens);
      custoTotalUsd.inc({ node: info.node, model: info.model }, custoUsd(info.model, uso));
      registrarConsumoDeTokens(uso.input_tokens + uso.output_tokens);
    },
    // Sem isso, uma chamada que falha (erro da Vertex AI, quota, etc.) nunca dispara
    // handleLLMEnd e a entrada de infoPorRun vaza pela vida inteira do processo.
    handleLLMError(_error: unknown, runId: string) {
      infoPorRun.delete(runId);
    },
  };
}
