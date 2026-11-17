import type { SearchProvider } from '../search/types.js';
import { dividirEmChunks } from '../web-search/chunk.js';
import { extrairTexto } from '../web-search/extract.js';
import { paraLinhaWeb } from '../web-search/to-row.js';
import type { DocumentoWebInput } from '../web-search/to-row.js';

const RESULTADOS_POR_QUERY = 3;
const TTL_PADRAO_DIAS = 7;

export interface WebSearchState {
  question: string;
  missingAspects: string[];
}

// Estruturalmente compatível com VertexAIEmbeddings — mesmo contrato do nó retrieve.
export interface EmbeddingsClient {
  embedQuery(text: string): Promise<number[]>;
}

export type BuscarPagina = (url: string) => Promise<string>;
export type InserirDocumentoWeb = (linha: ReturnType<typeof paraLinhaWeb>) => Promise<void>;

export function makeWebSearchNode(
  searchProvider: SearchProvider,
  embeddings: EmbeddingsClient,
  buscarPagina: BuscarPagina,
  inserirDocumentoWeb: InserirDocumentoWeb,
  ttlDias = TTL_PADRAO_DIAS,
) {
  return async (state: WebSearchState): Promise<Record<string, never>> => {
    const queries =
      state.missingAspects.length > 0
        ? state.missingAspects.map((aspecto) => `${state.question} ${aspecto}`)
        : [state.question];

    for (const query of queries) {
      let resultados: Awaited<ReturnType<SearchProvider['search']>>;
      try {
        resultados = (await searchProvider.search(query)).slice(0, RESULTADOS_POR_QUERY);
      } catch {
        // SearchProvider fora do ar ou circuito aberto (ver resilient-search-provider.ts) —
        // segue pra próxima query. O grafo volta pro retrieve sem documento novo; se o guard
        // de iteração cortar o loop, o nó answer avisa que o contexto pode estar incompleto,
        // em vez da requisição inteira falhar. Degradação graciosa, não silêncio: a falha
        // deste search() específico não é escondida, só não propaga como erro fatal.
        continue;
      }

      for (const resultado of resultados) {
        try {
          const html = await buscarPagina(resultado.url);
          const texto = extrairTexto(html);
          if (!texto) continue;

          const chunks = await dividirEmChunks(texto);
          const fetchedAt = new Date();

          for (const chunk of chunks) {
            const embedding = await embeddings.embedQuery(chunk);
            const input: DocumentoWebInput = {
              query,
              title: resultado.title,
              content: chunk,
              sourceUrl: resultado.url,
              fetchedAt,
              ttlDias,
              embedding,
            };
            await inserirDocumentoWeb(paraLinhaWeb(input));
          }
        } catch {
          // Página fora do ar, timeout ou sem conteúdo útil — segue pro próximo resultado.
          continue;
        }
      }
    }

    // O efeito deste nó é a escrita no banco: o retrieve, no próximo passo do loop, encontra
    // os documentos pela busca por similaridade — não há campo de estado novo pra propagar.
    return {};
  };
}
