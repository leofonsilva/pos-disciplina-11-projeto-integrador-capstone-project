import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

// Só o formato mínimo que a tool usa do grafo — permite fake em teste, mesmo espírito do
// GraphLike em apps/api/src/routes/chat.ts.
export interface GraphLike {
  invoke(input: { question: string }): Promise<{ answerText: string }>;
}

// Descrição lida pelo cliente MCP (Claude Desktop etc.) pra decidir quando chamar a tool —
// é prompt, não documentação pra humano. Precisa deixar claro o domínio (20 empresas da B3,
// dados da CVM) e o guardrail (nunca recomenda), pra o cliente não tratar isso como consultoria.
const DESCRICAO = `Responde perguntas sobre indicadores financeiros trimestrais (receita, lucro,
ativo total, patrimônio líquido, caixa operacional) de 20 empresas da B3, com base em dados
oficiais da CVM. Também busca na web quando a pergunta é qualitativa (notícia, motivo de um
resultado, fato relevante) e o corpus não tem a resposta. Toda resposta cita a fonte e o
período do dado. NUNCA recomenda comprar, vender ou manter uma posição — só informa dados
públicos, mesmo que a pergunta peça uma recomendação diretamente.`;

export const perguntarInputSchema = {
  question: z
    .string()
    .min(1)
    .describe('A pergunta sobre uma das 20 empresas da B3 cobertas, em português.'),
};

export const perguntarConfig = {
  title: 'Perguntar ao AI Researcher',
  description: DESCRICAO,
  inputSchema: perguntarInputSchema,
};

export function makePerguntarTool(graph: GraphLike) {
  return async function perguntar({ question }: { question: string }): Promise<CallToolResult> {
    try {
      const estadoFinal = await graph.invoke({ question });
      return { content: [{ type: 'text', text: estadoFinal.answerText }] };
    } catch (error) {
      // Mesma filosofia de degradação graciosa do resto do projeto (E.6): a tool nunca
      // deixa a exceção crua vazar pro cliente MCP, devolve isError com uma mensagem clara.
      const detalhe = error instanceof Error ? error.message : String(error);
      return {
        content: [{ type: 'text', text: `Não foi possível responder agora: ${detalhe}` }],
        isError: true,
      };
    }
  };
}
