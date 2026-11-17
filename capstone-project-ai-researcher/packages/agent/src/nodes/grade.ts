import { z } from 'zod';

import type { RetrievedDoc } from '../db/retrieve-similar.js';
import { gradePrompt } from '../prompts/grade.js';

const gradeResultSchema = z.object({
  sufficient: z.boolean(),
  missingAspects: z.array(z.string()),
});

type GradeResult = z.infer<typeof gradeResultSchema>;

export interface GradeState {
  question: string;
  documents: RetrievedDoc[];
}

// Estruturalmente compatível com BaseChatModel.withStructuredOutput() — o nó nunca
// importa o cliente concreto, só a operação de que precisa. Permite fake sem rede em teste.
export interface GradeLlmClient {
  withStructuredOutput(schema: typeof gradeResultSchema): {
    invoke(prompt: string): Promise<GradeResult>;
  };
}

export function makeGradeNode(llm: GradeLlmClient) {
  return async (state: GradeState) => {
    const structured = llm.withStructuredOutput(gradeResultSchema);
    const result = await structured.invoke(
      gradePrompt({ question: state.question, documents: state.documents }),
    );

    return {
      sufficient: result.sufficient,
      missingAspects: result.missingAspects,
      iterations: 1,
    };
  };
}
