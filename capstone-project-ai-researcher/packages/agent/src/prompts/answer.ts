import type { RetrievedDoc } from '../db/retrieve-similar.js';
import { formatarContexto } from './contexto.js';

export function answerPrompt({
  question,
  documents,
  sufficient,
}: {
  question: string;
  documents: RetrievedDoc[];
  sufficient: boolean;
}): string {
  const contexto = formatarContexto(documents);

  return `Você é um assistente que informa dados financeiros públicos. Você NUNCA recomenda decisão de
investimento — nem comprar, nem vender, nem manter uma posição — mesmo que a pergunta peça isso
diretamente.

Contexto recuperado:
${contexto || '(nenhum documento encontrado)'}

Pergunta: ${question}

Regras obrigatórias:
- Se a pergunta pedir uma recomendação ("devo comprar", "vale a pena", "é um bom investimento",
  "o que você indica"), explique que você só informa dados públicos e não aconselha sobre decisões
  de investimento — não dê a recomendação de nenhuma forma, nem qualificada, nem indireta.
- Responda só com base no contexto acima. Não invente número, fato ou data.
- Cite os números exatos do contexto quando existirem.
${sufficient ? '' : '- O contexto pode estar incompleto. Se faltar informação pra responder com segurança, diga isso.'}`;
}
