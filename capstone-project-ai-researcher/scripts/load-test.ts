// Script de carga do G.5 — dispara N requisições rápidas contra /api/chat pra estourar o
// rate limit de propósito (G.4) e confirmar, numa execução controlada, que o alerta de abuso
// (G.5, scripts/grafana-apply-alert.ts) realmente dispara a partir do tráfego real.
//
// Uso: pnpm load:test --url http://127.0.0.1:3000 [--n 40]
//
// Requisições que passam do rate limit (429) nunca chegam a invocar o grafo — sem custo de
// LLM. As que passam do limite geram custo real (poucas, N é pequeno de propósito).

interface Resultado {
  status: number;
}

function argumento(nome: string): string | undefined {
  const index = process.argv.indexOf(`--${nome}`);
  return index !== -1 ? process.argv[index + 1] : undefined;
}

async function dispararRequisicao(url: string): Promise<Resultado> {
  try {
    const resposta = await fetch(`${url.replace(/\/$/, '')}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: 'teste de carga — G.5' }),
    });
    return { status: resposta.status };
  } catch {
    return { status: 0 };
  }
}

async function main() {
  const url = argumento('url');
  const n = Number(argumento('n') ?? 40);

  if (!url) {
    console.error('Uso: pnpm load:test --url http://127.0.0.1:3000 [--n 40]');
    process.exit(1);
  }

  console.log(`Disparando ${n} requisições contra ${url}/api/chat...`);
  const resultados = await Promise.all(Array.from({ length: n }, () => dispararRequisicao(url)));

  const porStatus = new Map<number, number>();
  for (const { status } of resultados) {
    porStatus.set(status, (porStatus.get(status) ?? 0) + 1);
  }

  console.log('Resultado:');
  for (const [status, quantidade] of [...porStatus.entries()].sort((a, b) => a[0] - b[0])) {
    console.log(`  ${status || 'erro de rede'}: ${quantidade}`);
  }

  const total429 = porStatus.get(429) ?? 0;
  console.log(
    total429 > 0
      ? `\n${total429} respostas 429 — rate limit disparou. Se o alerta (G.5) estiver aplicado, ele deve entrar em "Pending"/"Alerting" nos próximos minutos.`
      : '\nNenhuma resposta 429 — aumente --n ou confira RATE_LIMIT_MAX no servidor alvo.',
  );
}

main();
