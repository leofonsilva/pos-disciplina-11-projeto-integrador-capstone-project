export class OrcamentoDiarioExcedidoError extends Error {
  constructor(limite: number) {
    super(`Orçamento diário de tokens excedido (limite: ${limite}).`);
    this.name = 'OrcamentoDiarioExcedidoError';
  }
}

function diaDeHoje(): string {
  return new Date().toISOString().slice(0, 10);
}

let diaAtual = diaDeHoje();
let tokensHoje = 0;

// Zera na virada do dia (UTC), não por job de limpeza — mesmo espírito do TTL em
// documentos_web (D.7): checado na leitura, não por cron. Em memória por processo: com mais
// de uma instância do Cloud Run, cada uma tem seu próprio contador (limitação documentada no
// CLAUDE.md, aceitável pro escopo didático — sem Redis/banco extra só pra isso).
function garantirDiaAtual(): void {
  const hoje = diaDeHoje();
  if (hoje !== diaAtual) {
    diaAtual = hoje;
    tokensHoje = 0;
  }
}

// Chamado de dentro de criarMetricsCallback() (metrics.ts) — mesma fonte de tokens que
// alimenta llm_tokens_total (G.2), não um segundo lugar reimplementando a mesma contagem.
export function registrarConsumoDeTokens(tokens: number): void {
  garantirDiaAtual();
  tokensHoje += tokens;
}

export function tokensConsumidosHoje(): number {
  garantirDiaAtual();
  return tokensHoje;
}

// Sem TOKEN_BUDGET_DIARIO configurada, não há limite — mesmo padrão de
// LANGFUSE_PUBLIC_KEY/OTEL_EXPORTER_OTLP_ENDPOINT: falta de configuração nunca bloqueia o
// serviço, só desliga a funcionalidade opcional.
export function verificarOrcamento(): void {
  const limite = process.env.TOKEN_BUDGET_DIARIO;
  if (!limite) return;

  const limiteNumero = Number(limite);
  if (tokensConsumidosHoje() >= limiteNumero) {
    throw new OrcamentoDiarioExcedidoError(limiteNumero);
  }
}
