import { describe, expect, it } from 'vitest';

import { criarMetricsCallback, registry } from './metrics.js';

describe('criarMetricsCallback', () => {
  it('acumula tokens e custo por nó/modelo, correlacionando start e end pelo runId', async () => {
    const callback = criarMetricsCallback();

    callback.handleChatModelStart(undefined, undefined, 'run-1', undefined, undefined, undefined, {
      langgraph_node: 'grade',
      ls_model_name: 'gemini-3.5-flash-lite',
    });
    callback.handleLLMEnd(
      { llmOutput: { usage_metadata: { input_tokens: 100, output_tokens: 20 } } },
      'run-1',
    );

    const custo = await registry.getSingleMetric('llm_cost_usd_total')?.get();
    const valor = custo?.values.find(
      (v) => v.labels.node === 'grade' && v.labels.model === 'gemini-3.5-flash-lite',
    );

    expect(valor?.value).toBeCloseTo((100 / 1_000_000) * 0.3 + (20 / 1_000_000) * 2.5);
  });

  it('não vaza estado entre execuções: cada runId só é usado uma vez', async () => {
    const callback = criarMetricsCallback();

    callback.handleChatModelStart(undefined, undefined, 'run-2', undefined, undefined, undefined, {
      langgraph_node: 'answer',
      ls_model_name: 'gemini-3.6-flash',
    });
    callback.handleLLMEnd(
      { llmOutput: { usage_metadata: { input_tokens: 10, output_tokens: 10 } } },
      'run-2',
    );
    // Segunda vez com o mesmo runId (não deveria acontecer na prática) não deve incrementar
    // de novo — a entrada já foi consumida e removida do Map.
    const antes = await registry.getSingleMetric('llm_tokens_total')?.get();
    callback.handleLLMEnd(
      { llmOutput: { usage_metadata: { input_tokens: 10, output_tokens: 10 } } },
      'run-2',
    );
    const depois = await registry.getSingleMetric('llm_tokens_total')?.get();

    expect(depois?.values).toEqual(antes?.values);
  });

  it('ignora silenciosamente respostas sem usage_metadata', () => {
    const callback = criarMetricsCallback();

    expect(() => callback.handleLLMEnd({}, 'run-sem-usage')).not.toThrow();
  });

  it('limpa o estado pendente em handleLLMError, sem vazar memória', () => {
    const callback = criarMetricsCallback();

    callback.handleChatModelStart(
      undefined,
      undefined,
      'run-erro',
      undefined,
      undefined,
      undefined,
      {
        langgraph_node: 'grade',
        ls_model_name: 'gemini-3.5-flash-lite',
      },
    );

    expect(() =>
      callback.handleLLMError(new Error('Vertex AI indisponível'), 'run-erro'),
    ).not.toThrow();
  });
});
