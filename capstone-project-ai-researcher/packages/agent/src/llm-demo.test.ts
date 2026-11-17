import { describe, expect, it } from 'vitest';
import { criarAnswerLlmDemo, criarGradeLlmDemo } from './llm-demo.js';

describe('criarGradeLlmDemo', () => {
  it('sempre considera o contexto suficiente, sem aspectos faltando', async () => {
    const llm = criarGradeLlmDemo();
    const resultado = await llm.withStructuredOutput({} as never).invoke('qualquer prompt');

    expect(resultado).toEqual({ sufficient: true, missingAspects: [] });
  });
});

describe('criarAnswerLlmDemo', () => {
  it('devolve sempre a mesma resposta determinística, sem chamar a Vertex AI', async () => {
    const llm = criarAnswerLlmDemo();
    const resposta = await llm.invoke('qualquer prompt');

    expect(resposta.content).toContain('Vale S.A.');
    expect(resposta.content).toContain('3T25');
  });
});
