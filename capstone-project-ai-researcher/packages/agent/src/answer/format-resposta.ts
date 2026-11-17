import type { RetrievedDoc } from '../db/retrieve-similar.js';

// O prompt já proíbe recomendação (ver prompts/answer.ts), mas instrução de prompt não é
// garantia — o modelo pode ignorá-la. Este filtro é a segunda linha de defesa, determinística
// e testável, do "o sistema informa, nunca recomenda" (ver CLAUDE.md, seção de domínio).
// Os padrões miram a forma de recomendação (verbo em 1ª pessoa, ou imperativo com objeto de
// investimento), não palavras isoladas — "venda" sozinha aparece o tempo todo em contexto
// financeiro legítimo ("receita de vendas") e não pode disparar o filtro.
const PADROES_RECOMENDACAO = [
  /\brecomend(o|amos|a|aria|aríamos)\b/i,
  /\bsugir(o|imos|a)\b/i,
  /\baconselh(o|amos|a)\b/i,
  /\bvale a pena (comprar|vender|manter)\b/i,
  /\b(compre|venda|mantenha)\s+(essa|esta|a)\s*(ação|posição|papel)/i,
  // Sem \b antes de "é": a letra acentuada não conta como caractere de palavra no \b padrão
  // do JS, então a fronteira nunca bate e o padrão nunca casava no início da frase.
  /é\s+(um\s+)?(bom|ótimo)\s+(momento|investimento)\s+para\s+(comprar|vender)/i,
];

export function contemLinguagemRecomendatoria(texto: string): boolean {
  return PADROES_RECOMENDACAO.some((padrao) => padrao.test(texto));
}

const RESPOSTA_GUARDRAIL =
  'Não recomendamos decisões de compra, venda ou manutenção de posição — este assistente só ' +
  'informa dados públicos, nunca aconselha sobre investimentos.';

// Cada documento cita sua fonte e o período do dado — corpus CVM tem ticker+period+periodEnd,
// documento web só tem título. Deduplicado por sourceUrl: vários chunks da mesma página não
// viram citações repetidas.
export function formatarCitacoes(documents: RetrievedDoc[]): string {
  const vistos = new Set<string>();
  const linhas: string[] = [];

  for (const doc of documents) {
    if (vistos.has(doc.sourceUrl)) continue;
    vistos.add(doc.sourceUrl);

    const rotulo = doc.ticker
      ? `${doc.ticker} (${doc.period}, data-base ${doc.periodEnd})`
      : (doc.title ?? 'fonte web');

    linhas.push(`- ${rotulo}: ${doc.sourceUrl}`);
  }

  return linhas.join('\n');
}

export function montarResposta(
  textoLlm: string,
  documents: RetrievedDoc[],
  sufficient: boolean,
): string {
  const texto = contemLinguagemRecomendatoria(textoLlm) ? RESPOSTA_GUARDRAIL : textoLlm.trim();

  const aviso = sufficient
    ? ''
    : '\n\n_O contexto disponível pode estar incompleto para responder com certeza._';

  const citacoes = formatarCitacoes(documents);
  const fontes = citacoes ? `\n\nFontes:\n${citacoes}` : '';

  return `${texto}${aviso}${fontes}`;
}
