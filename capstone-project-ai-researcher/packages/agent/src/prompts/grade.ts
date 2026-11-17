import type { RetrievedDoc } from '../db/retrieve-similar.js';
import { formatarContexto } from './contexto.js';

export function gradePrompt({
  question,
  documents,
}: {
  question: string;
  documents: RetrievedDoc[];
}): string {
  const contexto = formatarContexto(documents);

  return `Você avalia se o contexto abaixo é suficiente pra responder a pergunta do usuário.

Contexto recuperado (indicadores financeiros trimestrais, CVM):
${contexto || '(nenhum documento encontrado)'}

Pergunta: ${question}

O contexto é só numérico — indicadores como receita, lucro, ativo total, patrimônio líquido e caixa
operacional, por empresa e trimestre. Perguntas qualitativas (motivo por trás de um número, notícia,
fato relevante, guidance, posicionamento de mercado, previsão de preço futuro) nunca são respondidas só
com este contexto — considere insuficiente nesses casos, mesmo que o contexto tenha dados da empresa certa.
Responda se o contexto é suficiente e, se não for, liste os aspectos que faltam.`;
}
