import type { RetrievedDoc } from '../db/retrieve-similar.js';

// Usado pelos prompts de grade e answer — ambos precisam da mesma visão do contexto recuperado.
export function formatarContexto(documents: RetrievedDoc[]): string {
  return documents
    .map((doc) =>
      doc.ticker
        ? `- [${doc.ticker} ${doc.period}] ${doc.paragraph}`
        : `- [web: ${doc.title}] ${doc.paragraph}`,
    )
    .join('\n');
}
