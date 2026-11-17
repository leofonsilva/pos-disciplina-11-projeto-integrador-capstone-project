import type { SearchProvider, SearchResult } from './types.js';

export class CircuitoAbertoError extends Error {
  constructor() {
    super('SearchProvider indisponível — circuito aberto após falhas consecutivas.');
    this.name = 'CircuitoAbertoError';
  }
}

export interface OpcoesResiliencia {
  /** Tentativas totais por chamada a search(), incluindo a primeira. */
  maxTentativas?: number;
  /** Base do backoff exponencial entre tentativas, em ms — dobra a cada retry. */
  backoffBaseMs?: number;
  /** Falhas consecutivas (search() esgotando as tentativas) que abrem o circuito. */
  limiarCircuito?: number;
  /** Quanto tempo o circuito fica aberto, rejeitando sem chamar o provider. */
  tempoResfriamentoMs?: number;
  /** Injetáveis pra teste determinístico — nunca esperam de verdade nem leem o relógio real. */
  esperar?: (ms: number) => Promise<void>;
  agora?: () => number;
}

const esperarPadrao = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

// Decora qualquer SearchProvider com retry+backoff e circuit breaker — nem Serper nem Google
// Custom Search precisam saber disso, é a mesma lógica pros dois. Falha transitória (uma
// chamada ruim isolada) é absorvida pelo retry e nunca propaga; falha persistente propaga o
// último erro, e falhas consecutivas o bastante abrem o circuito pra parar de martelar um
// serviço fora do ar.
export function comResiliencia(
  provider: SearchProvider,
  opcoes: OpcoesResiliencia = {},
): SearchProvider {
  const maxTentativas = opcoes.maxTentativas ?? 3;
  const backoffBaseMs = opcoes.backoffBaseMs ?? 200;
  const limiarCircuito = opcoes.limiarCircuito ?? 3;
  const tempoResfriamentoMs = opcoes.tempoResfriamentoMs ?? 30_000;
  const esperar = opcoes.esperar ?? esperarPadrao;
  const agora = opcoes.agora ?? Date.now;

  let falhasConsecutivas = 0;
  let abertoAte: number | undefined;

  return {
    async search(query: string): Promise<SearchResult[]> {
      if (abertoAte !== undefined && agora() < abertoAte) {
        throw new CircuitoAbertoError();
      }

      let ultimoErro: unknown;
      for (let tentativa = 1; tentativa <= maxTentativas; tentativa++) {
        try {
          const resultado = await provider.search(query);
          falhasConsecutivas = 0;
          abertoAte = undefined;
          return resultado;
        } catch (erro) {
          ultimoErro = erro;
          if (tentativa < maxTentativas) {
            await esperar(backoffBaseMs * 2 ** (tentativa - 1));
          }
        }
      }

      falhasConsecutivas += 1;
      if (falhasConsecutivas >= limiarCircuito) {
        abertoAte = agora() + tempoResfriamentoMs;
      }
      throw ultimoErro;
    },
  };
}
