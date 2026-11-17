import { ChatVertexAI } from '@langchain/google-vertexai';

import { criarAnswerLlmDemo, criarGradeLlmDemo } from './llm-demo.js';
import type { AnswerLlmClient } from './nodes/answer.js';
import type { GradeLlmClient } from './nodes/grade.js';

function criarChatModel(model: string): ChatVertexAI {
  const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
  if (!projectId) {
    throw new Error(
      'GOOGLE_CLOUD_PROJECT_ID não configurada — necessária pra autenticar na Vertex AI. Ver infra/README.md.',
    );
  }

  return new ChatVertexAI({
    model,
    // gemini-3.5-flash-lite e gemini-3.6-flash só respondem em "global" nesse projeto —
    // us-central1 devolve 404 ("model was not found or your project does not have access")
    // pra esses dois, confirmado testando publishers/google/models direto contra a API.
    // Embeddings continuam em us-central1 (embeddings.ts) — gemini-embedding-001 funciona
    // nas duas regiões, então não tem motivo pra mudar o que já está indexado.
    location: process.env.GOOGLE_CLOUD_LOCATION ?? 'global',
    // Mesmo motivo do embeddings.ts: GOOGLE_API_KEY no ambiente quebra a autenticação da
    // Vertex AI, que só aceita OAuth2/ADC. Ver infra/README.md.
    apiKey: '',
    authOptions: { projectId },
  });
}

// ChatVertexAI já implementa withStructuredOutput().invoke() nativamente — satisfaz
// GradeLlmClient sem adaptação. Nunca passe { callbacks: [...] } explícito num invoke() aqui
// dentro: isso substitui o callback manager ambiente que o LangGraph propaga via
// AsyncLocalStorage (é o que faz o Langfuse e o metrics.ts capturarem a chamada da Vertex AI
// como filha do nó certo, sem esse arquivo saber nada de tracing) — confirmado comparando um
// trace real com e sem esse parâmetro: com ele, a chamada de LLM some do Langfuse, sobra só
// o span do nó. Quem precisa de um callback adicional aqui passa por
// graph.stream()/graph.invoke({ callbacks }), nunca por aqui.
export function criarGradeLlm(): GradeLlmClient {
  if (process.env.DEMO === 'true') return criarGradeLlmDemo();
  return criarChatModel(process.env.MODEL_GRADE ?? 'gemini-3.5-flash-lite');
}

// AnswerLlmClient espera invoke(): Promise<{ content: string }>, mas o content de
// ChatVertexAI é MessageContent (string | partes complexas) — normaliza aqui, uma vez,
// em vez de o nó answer ter que lidar com os dois formatos.
export function criarAnswerLlm(): AnswerLlmClient {
  if (process.env.DEMO === 'true') return criarAnswerLlmDemo();
  const chatModel = criarChatModel(process.env.MODEL_ANSWER ?? 'gemini-3.6-flash');

  return {
    async invoke(prompt: string) {
      const resposta = await chatModel.invoke(prompt);
      const content =
        typeof resposta.content === 'string' ? resposta.content : String(resposta.content);
      return { content };
    },
  };
}
