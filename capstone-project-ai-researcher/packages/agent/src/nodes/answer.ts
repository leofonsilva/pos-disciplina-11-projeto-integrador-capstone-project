import { montarResposta } from '../answer/format-resposta.js';
import type { RetrievedDoc } from '../db/retrieve-similar.js';
import { answerPrompt } from '../prompts/answer.js';

export interface AnswerState {
  question: string;
  documents: RetrievedDoc[];
  sufficient: boolean;
}

// Estruturalmente compatível com BaseChatModel.invoke() — o nó nunca importa o cliente
// concreto, só a operação de que precisa. Permite fake sem rede em teste.
export interface AnswerLlmClient {
  invoke(prompt: string): Promise<{ content: string }>;
}

export function makeAnswerNode(llm: AnswerLlmClient) {
  return async (state: AnswerState): Promise<{ answerText: string }> => {
    const resposta = await llm.invoke(
      answerPrompt({
        question: state.question,
        documents: state.documents,
        sufficient: state.sufficient,
      }),
    );

    return { answerText: montarResposta(resposta.content, state.documents, state.sufficient) };
  };
}
