export interface UsoTokens {
  input_tokens: number;
  output_tokens: number;
}

interface PrecoPorMilhao {
  input: number;
  output: number;
}

// USD por 1 milhão de tokens, tier padrão (não Flex/Batch), conferido em ago/2026 em
// https://cloud.google.com/gemini-enterprise-agent-platform/generative-ai/pricing.
// gemini-embedding-001 não cobra output — preço em
// https://ai.google.dev/gemini-api/docs/pricing (Vertex AI não lista esse modelo
// separadamente; usa o mesmo preço da Gemini Developer API).
// Preço só existe pros três modelos deste projeto (ver MODEL_GRADE/MODEL_ANSWER/
// MODEL_EMBEDDING no CLAUDE.md) — trocar de modelo sem atualizar esta tabela derruba o
// custo calculado pra zero, não pra uma estimativa errada.
const PRECOS: Record<string, PrecoPorMilhao> = {
  'gemini-3.5-flash-lite': { input: 0.3, output: 2.5 },
  'gemini-3.6-flash': { input: 1.5, output: 7.5 },
  'gemini-embedding-001': { input: 0.15, output: 0 },
};

const modelosSemPrecoAvisados = new Set<string>();

// Número conhecido, não estimado: usa sempre o usage_metadata real devolvido pela Vertex AI
// (ver observability/metrics.ts), nunca contagem de token por heurística.
export function custoUsd(model: string, uso: UsoTokens): number {
  const preco = PRECOS[model];
  if (!preco) {
    if (!modelosSemPrecoAvisados.has(model)) {
      modelosSemPrecoAvisados.add(model);
      console.warn(
        `[metrics] Sem preço cadastrado pra "${model}" em observability/pricing.ts — custo computado como 0.`,
      );
    }
    return 0;
  }

  return (
    (uso.input_tokens / 1_000_000) * preco.input + (uso.output_tokens / 1_000_000) * preco.output
  );
}
