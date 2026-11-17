import type { BuscarPagina } from '../nodes/web-search.js';
import type { SearchProvider, SearchResult } from '../search/types.js';
import { buscarPagina } from './extract.js';

interface FixtureEntry {
  palavraChave: string;
  resultados: SearchResult[];
  paginas: Record<string, string>;
}

const URL_GENERICA = 'https://example.com/demo-sem-fixture';

const FIXTURE_GENERICA: FixtureEntry = {
  palavraChave: '',
  resultados: [
    {
      title: 'Modo demo — sem fixture pra essa busca',
      snippet:
        'Nenhuma fixture cadastrada corresponde a essa pergunta. Rode com DEMO desligado e SEARCH_PROVIDER configurado pra busca real.',
      url: URL_GENERICA,
    },
  ],
  paginas: {
    [URL_GENERICA]:
      '<html><body><p>Modo demo — sem fixture cadastrada pra essa busca.</p></body></html>',
  },
};

// Cada entrada cobre uma das perguntas do grupo B do evals/dataset.json (fallback de busca
// web) — o suficiente pra gravar uma demo sem depender de Serper/Google/Vertex AI estarem no
// ar. Casa por substring da query (case-insensitive) com o ticker/nome da empresa.
const FIXTURES: FixtureEntry[] = [
  {
    palavraChave: 'vale',
    resultados: [
      {
        title: 'Vale explica queda na receita do 1T26',
        snippet:
          'Em comunicado ao mercado, a Vale atribuiu a queda de receita entre o 4T25 e o 1T26 à sazonalidade das chuvas no Sistema Norte e a uma manutenção programada em Carajás.',
        url: 'https://vale.com/noticias/vale-explica-queda-receita-1t26',
      },
    ],
    paginas: {
      'https://vale.com/noticias/vale-explica-queda-receita-1t26': `<html><body>
        <article>
          <h1>Vale explica queda na receita do 1T26</h1>
          <p>A Vale S.A. informou que a queda de receita entre o 4T25 e o 1T26 decorre
          principalmente da sazonalidade das chuvas no Sistema Norte, que reduz temporariamente
          o volume de embarques de minério de ferro, e de uma manutenção programada em
          instalações de Carajás.</p>
        </article>
      </body></html>`,
    },
  },
  {
    palavraChave: 'petrobras',
    resultados: [
      {
        title: 'Petrobras revisa plano de investimentos no pré-sal',
        snippet:
          'A Petrobras divulgou fato relevante sobre a revisão do plano estratégico de investimentos em exploração no pré-sal para os próximos cinco anos.',
        url: 'https://petrobras.com.br/fatos-relevantes/plano-investimentos',
      },
    ],
    paginas: {
      'https://petrobras.com.br/fatos-relevantes/plano-investimentos': `<html><body>
        <article>
          <h1>Petrobras revisa plano de investimentos no pré-sal</h1>
          <p>A Petróleo Brasileiro S.A. — Petrobras comunicou ao mercado a revisão do seu plano
          estratégico de investimentos, com foco ampliado em exploração no pré-sal pelos
          próximos cinco anos.</p>
        </article>
      </body></html>`,
    },
  },
  {
    palavraChave: 'klabin',
    resultados: [
      {
        title: 'Klabin comenta prejuízo do 1T26',
        snippet:
          'A Klabin atribuiu o prejuízo do 1T26 a efeitos cambiais sobre a dívida em dólar e à queda no preço internacional de celulose no período.',
        url: 'https://klabin.com.br/relacoes-investidores/comentario-1t26',
      },
    ],
    paginas: {
      'https://klabin.com.br/relacoes-investidores/comentario-1t26': `<html><body>
        <article>
          <h1>Klabin comenta prejuízo do 1T26</h1>
          <p>A Klabin S.A. informou que o prejuízo registrado no 1T26 decorre principalmente do
          efeito cambial sobre a dívida denominada em dólar e da queda no preço internacional da
          celulose no período.</p>
        </article>
      </body></html>`,
    },
  },
];

function encontrarFixture(query: string): FixtureEntry {
  const queryLower = query.toLowerCase();
  return FIXTURES.find((fixture) => queryLower.includes(fixture.palavraChave)) ?? FIXTURE_GENERICA;
}

export function criarSearchProviderFixture(): SearchProvider {
  return {
    async search(query: string): Promise<SearchResult[]> {
      return encontrarFixture(query).resultados;
    },
  };
}

async function buscarPaginaFixture(url: string): Promise<string> {
  for (const fixture of [...FIXTURES, FIXTURE_GENERICA]) {
    const pagina = fixture.paginas[url];
    if (pagina) return pagina;
  }
  return FIXTURE_GENERICA.paginas[URL_GENERICA];
}

// DEMO=true troca busca e fetch de página por fixture, em um único lugar — nem o
// SearchProvider nem o buscarPagina de verdade precisam saber que o modo demo existe.
export function criarBuscarPagina(): BuscarPagina {
  return process.env.DEMO === 'true' ? buscarPaginaFixture : buscarPagina;
}
