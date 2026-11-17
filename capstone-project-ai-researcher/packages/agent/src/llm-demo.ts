import type { AnswerLlmClient } from './nodes/answer.js';
import type { GradeLlmClient } from './nodes/grade.js';

// DEMO=true não chama a Vertex AI — sempre considera o contexto suficiente. O objetivo é um
// caminho feliz determinístico (F.7), não reproduzir o loop de fallback; esse comportamento já
// é coberto por teste com fake em packages/agent/src/graph.test.ts.
export function criarGradeLlmDemo(): GradeLlmClient {
  return {
    withStructuredOutput: () => ({
      async invoke() {
        return { sufficient: true, missingAspects: [] };
      },
    }),
  };
}

const RESPOSTA_DEMO =
  'A receita líquida da Vale S.A. no 3T25 foi de R$ 56,7 bilhões, uma alta de 7,0% frente ao 3T24.';

export function criarAnswerLlmDemo(): AnswerLlmClient {
  return {
    async invoke() {
      return { content: RESPOSTA_DEMO };
    },
  };
}
