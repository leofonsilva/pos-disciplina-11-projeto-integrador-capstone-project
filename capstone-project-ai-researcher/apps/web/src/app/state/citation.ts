export interface Citation {
  readonly label: string;
  readonly periodEnd?: string;
  readonly origem: string;
  readonly sourceUrl: string;
}

// O answerText real (packages/agent/src/answer/format-resposta.ts, formatarCitacoes) não marca
// posição de citação no meio do texto — ele termina com um bloco "Fontes:\n- rótulo: url", um
// item por documento deduplicado. O protótipo do F.1 imaginou citações [n] inline; adaptamos
// pro formato real: separa o corpo da lista de fontes, e a lista vira os "cartões" clicáveis.
const MARCADOR_FONTES = '\n\nFontes:\n';
const LINHA_CITACAO = /^- (.+): (https?:\/\/\S+)$/;
const ROTULO_COM_PERIODO = /^(.+) \((.+), data-base (.+)\)$/;

export interface RespostaParseada {
  readonly body: string;
  readonly citations: Citation[];
}

export function parseAnswer(fullText: string): RespostaParseada {
  const indice = fullText.indexOf(MARCADOR_FONTES);
  if (indice === -1) return { body: fullText, citations: [] };

  const body = fullText.slice(0, indice);
  const bloco = fullText.slice(indice + MARCADOR_FONTES.length);
  const citations = bloco
    .split('\n')
    .map((linha) => parseLinhaCitacao(linha))
    .filter((citacao): citacao is Citation => citacao !== null);

  return { body, citations };
}

function parseLinhaCitacao(linha: string): Citation | null {
  const match = LINHA_CITACAO.exec(linha);
  if (!match) return null;
  const [, rotulo, sourceUrl] = match;

  const comPeriodo = ROTULO_COM_PERIODO.exec(rotulo);
  if (comPeriodo) {
    const [, ticker, period, periodEnd] = comPeriodo;
    return { label: `${ticker} (${period})`, periodEnd, origem: 'Base local (CVM)', sourceUrl };
  }

  return { label: rotulo, origem: hostnameOuFallback(sourceUrl), sourceUrl };
}

function hostnameOuFallback(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return 'Busca web';
  }
}
