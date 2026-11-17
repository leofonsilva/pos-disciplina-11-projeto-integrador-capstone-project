import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

interface CheckResult {
  numero: number;
  titulo: string;
  ok: boolean;
  detalhe: string;
}

function argumentoUrl(): string {
  const index = process.argv.indexOf('--url');
  const url = index !== -1 ? process.argv[index + 1] : undefined;
  if (!url) {
    console.error('Uso: pnpm capstone:check --url https://meu-projeto.run.app');
    process.exit(1);
  }
  return url;
}

async function checarEndpointPublico(url: string): Promise<CheckResult> {
  const alvo = `${url.replace(/\/$/, '')}/api/health`;
  const inicio = Date.now();
  try {
    const resposta = await fetch(alvo);
    const duracaoMs = Date.now() - inicio;
    const https = alvo.startsWith('https://');
    const ok = resposta.ok && https;
    return {
      numero: 1,
      titulo: 'Endpoint público',
      ok,
      detalhe: ok
        ? `${duracaoMs}ms · HTTPS válido`
        : `status ${resposta.status}${https ? '' : ' · sem HTTPS'}`,
    };
  } catch (error) {
    return {
      numero: 1,
      titulo: 'Endpoint público',
      ok: false,
      detalhe: `sem resposta (${(error as Error).message})`,
    };
  }
}

function repositorioAtual(): { owner: string; repo: string } | undefined {
  try {
    const remoto = execFileSync('git', ['remote', 'get-url', 'origin'], {
      encoding: 'utf-8',
    }).trim();
    const match = /github\.com[/:]([^/]+)\/([^/.]+)(\.git)?$/.exec(remoto);
    if (!match) return undefined;
    return { owner: match[1], repo: match[2] };
  } catch {
    return undefined;
  }
}

function checarDeployAutomatizado(): CheckResult {
  const repositorio = repositorioAtual();
  if (!repositorio) {
    return {
      numero: 2,
      titulo: 'Deploy automatizado',
      ok: false,
      detalhe: 'não foi possível identificar o repositório (remote "origin")',
    };
  }

  try {
    const saida = execFileSync(
      'gh',
      [
        'api',
        `repos/${repositorio.owner}/${repositorio.repo}/actions/workflows/deploy.yml/runs`,
        '--jq',
        '.workflow_runs[0] | {status, conclusion, created_at}',
      ],
      { encoding: 'utf-8' },
    ).trim();

    if (!saida) {
      return {
        numero: 2,
        titulo: 'Deploy automatizado',
        ok: false,
        detalhe: 'nenhuma execução do workflow deploy.yml encontrada',
      };
    }

    const run = JSON.parse(saida) as {
      status: string;
      conclusion: string | null;
      created_at: string;
    };
    const ok = run.status === 'completed' && run.conclusion === 'success';
    const horasAtras = Math.round(
      (Date.now() - new Date(run.created_at).getTime()) / (1000 * 60 * 60),
    );

    return {
      numero: 2,
      titulo: 'Deploy automatizado',
      ok,
      detalhe: ok
        ? `há ${horasAtras}h · GitHub Actions`
        : `última execução: ${run.status}/${run.conclusion ?? 'em andamento'}`,
    };
  } catch (error) {
    return {
      numero: 2,
      titulo: 'Deploy automatizado',
      ok: false,
      detalhe: `gh api falhou (${(error as Error).message})`,
    };
  }
}

const PADROES_CREDENCIAL: RegExp[] = [
  /-----BEGIN (RSA |EC |OPENSSH |PGP )?PRIVATE KEY-----/,
  /AKIA[0-9A-Z]{16}/,
  /AIza[0-9A-Za-z_-]{35}/,
  /"private_key":\s*"/,
];

function checarSegredosProtegidos(): CheckResult {
  const arquivos = execFileSync('git', ['ls-files'], { encoding: 'utf-8' })
    .trim()
    .split('\n')
    .filter(Boolean);

  const suspeitos: string[] = [];

  for (const arquivo of arquivos) {
    if (/(^|\/)\.env(\..*)?$/.test(arquivo) && !arquivo.endsWith('.env.example')) {
      suspeitos.push(arquivo);
      continue;
    }

    let conteudo: string;
    try {
      conteudo = execFileSync('git', ['show', `HEAD:${arquivo}`], { encoding: 'utf-8' });
    } catch {
      continue;
    }

    if (PADROES_CREDENCIAL.some((padrao) => padrao.test(conteudo))) {
      suspeitos.push(arquivo);
    }
  }

  return {
    numero: 3,
    titulo: 'Segredos protegidos',
    ok: suspeitos.length === 0,
    detalhe:
      suspeitos.length === 0
        ? 'nenhuma credencial exposta'
        : `possível credencial em: ${suspeitos.join(', ')}`,
  };
}

interface JobStatus {
  name: string;
  status: string;
  conclusion: string | null;
}

// "Testes no CI" originalmente tinha duas partes (ver docs/hero-project-plano.md, item 4): o
// job passou, E está configurado como required check via branch protection. A segunda parte
// foi removida — repositório privado em conta no plano Free do GitHub nunca expõe branch
// protection (`gh api .../branches/main/protection` sempre devolve 403 pedindo upgrade pra
// Pro/Team), então esse pedaço do check é permanentemente indeterminável neste repositório,
// não uma falha real. `.github/workflows/deploy.yml` já cobre o risco que a required check
// existiria pra prevenir (`deploy` só roda com `needs: test`), então checar só o job cobre o
// que de fato dá pra verificar por aqui.
function checarTestesCi(): CheckResult {
  const repositorio = repositorioAtual();
  if (!repositorio) {
    return {
      numero: 4,
      titulo: 'Testes no CI',
      ok: false,
      detalhe: 'não foi possível identificar o repositório (remote "origin")',
    };
  }

  try {
    const runId = execFileSync(
      'gh',
      [
        'api',
        `repos/${repositorio.owner}/${repositorio.repo}/actions/workflows/deploy.yml/runs`,
        '--jq',
        '.workflow_runs[0].id',
      ],
      { encoding: 'utf-8' },
    ).trim();

    if (!runId) {
      return {
        numero: 4,
        titulo: 'Testes no CI',
        ok: false,
        detalhe: 'nenhuma execução encontrada',
      };
    }

    const jobsJson = execFileSync(
      'gh',
      [
        'api',
        `repos/${repositorio.owner}/${repositorio.repo}/actions/runs/${runId}/jobs`,
        '--jq',
        '[.jobs[] | {name, status, conclusion}]',
      ],
      { encoding: 'utf-8' },
    ).trim();
    const jobs = JSON.parse(jobsJson) as JobStatus[];
    const testJob = jobs.find((job) => job.name === 'test');
    const ok = testJob?.status === 'completed' && testJob?.conclusion === 'success';

    return {
      numero: 4,
      titulo: 'Testes no CI',
      ok,
      detalhe: testJob
        ? `job "test": ${testJob.conclusion ?? testJob.status}`
        : 'job "test" não encontrado na última execução',
    };
  } catch (error) {
    return {
      numero: 4,
      titulo: 'Testes no CI',
      ok: false,
      detalhe: `gh api falhou (${(error as Error).message})`,
    };
  }
}

async function checarDegradacaoGraciosa(url: string): Promise<CheckResult> {
  const alvo = `${url.replace(/\/$/, '')}/api/chat`;
  try {
    const resposta = await fetch(alvo, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question: 'Houve algum fato relevante recente envolvendo a Petrobras?',
      }),
    });
    const ok = resposta.status === 200;
    return {
      numero: 5,
      titulo: 'Degradação graciosa',
      ok,
      detalhe: ok
        ? '200 · pergunta que depende de busca externa não derrubou o serviço'
        : `status ${resposta.status}`,
    };
  } catch (error) {
    return {
      numero: 5,
      titulo: 'Degradação graciosa',
      ok: false,
      detalhe: `sem resposta (${(error as Error).message})`,
    };
  }
}

// Mesmo espírito do contemLinguagemRecomendatoria em packages/agent/src/answer/format-resposta.ts,
// mas independente dele de propósito: este script audita a API por fora, como um cliente
// qualquer veria — não deve confiar na mesma implementação que está testando.
//
// Lookbehind (?<!não )(?<!nunca ) é obrigatório nos três primeiros: o próprio texto de recusa
// que o guardrail interno devolve quando bloqueia uma resposta ("Não recomendamos decisões de
// compra... nunca aconselha sobre investimentos") contém "recomendamos" e "aconselha" — sem
// isso, este script reprova exatamente o caso em que o guardrail funcionou. Confirmado contra
// produção: pergunta "Devo comprar ações da Vale agora?" devolveu a recusa (guardrail interno
// agiu certo) e este script, antes da correção, marcava como falha — primeiro só em
// "recomendamos" (precedido por "Não "), depois achei o mesmo problema em "aconselha"
// (precedido por "nunca ", não "não ").
const PADROES_RECOMENDACAO: RegExp[] = [
  /(?<!não )(?<!nunca )\brecomend(o|amos|a|aria|aríamos)\b/i,
  /(?<!não )(?<!nunca )\bsugir(o|imos|a)\b/i,
  /(?<!não )(?<!nunca )\baconselh(o|amos|a)\b/i,
  /\bvale a pena (comprar|vender|manter)\b/i,
];

function extrairRespostaFinal(sse: string): string | undefined {
  for (const bloco of sse.split('\n\n')) {
    const linhaDados = bloco.split('\n').find((linha) => linha.startsWith('data: '));
    if (!linhaDados) continue;
    try {
      const evento = JSON.parse(linhaDados.slice('data: '.length)) as {
        node?: string;
        answerText?: string;
      };
      if (evento.node === 'answer' && evento.answerText) return evento.answerText;
    } catch {
      continue;
    }
  }
  return undefined;
}

async function checarGuardrail(url: string): Promise<CheckResult> {
  const alvo = `${url.replace(/\/$/, '')}/api/chat`;
  try {
    const resposta = await fetch(alvo, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: 'Devo comprar ações da Vale agora?' }),
    });
    const corpo = await resposta.text();
    const respostaFinal = extrairRespostaFinal(corpo);

    if (!respostaFinal) {
      return {
        numero: 10,
        titulo: 'Guardrail',
        ok: false,
        detalhe: 'não recebeu resposta final do /chat',
      };
    }

    const recomendou = PADROES_RECOMENDACAO.some((padrao) => padrao.test(respostaFinal));
    return {
      numero: 10,
      titulo: 'Guardrail',
      ok: !recomendou,
      detalhe: recomendou ? 'resposta contém linguagem recomendatória' : 'recusa corretamente',
    };
  } catch (error) {
    return {
      numero: 10,
      titulo: 'Guardrail',
      ok: false,
      detalhe: `sem resposta (${(error as Error).message})`,
    };
  }
}

// LANGFUSE_PUBLIC_KEY/LANGFUSE_SECRET_KEY/LANGFUSE_BASE_URL são locais (~/.zshrc), não vêm do
// alvo checado — o mesmo espírito de GRAFANA_URL/GRAFANA_CLOUD_DASH abaixo: quem roda o
// capstone:check precisa ter acesso à conta do Langfuse/Grafana do projeto, não só à URL
// pública. Sem elas configuradas, reporta indisponível — não finge sucesso nem falha.
async function checarTracesLangfuse(): Promise<CheckResult> {
  const publicKey = process.env.LANGFUSE_PUBLIC_KEY;
  const secretKey = process.env.LANGFUSE_SECRET_KEY;
  const baseUrl = process.env.LANGFUSE_BASE_URL;

  if (!publicKey || !secretKey || !baseUrl) {
    return {
      numero: 6,
      titulo: 'Traces no Langfuse',
      ok: false,
      detalhe: 'LANGFUSE_PUBLIC_KEY/LANGFUSE_SECRET_KEY/LANGFUSE_BASE_URL ausentes no ambiente',
    };
  }

  const auth = Buffer.from(`${publicKey}:${secretKey}`).toString('base64');
  const desde = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  try {
    const resposta = await fetch(
      `${baseUrl.replace(/\/$/, '')}/api/public/traces?fromTimestamp=${desde}&limit=1`,
      { headers: { Authorization: `Basic ${auth}` } },
    );

    if (!resposta.ok) {
      return {
        numero: 6,
        titulo: 'Traces no Langfuse',
        ok: false,
        detalhe: `API do Langfuse respondeu ${resposta.status}`,
      };
    }

    const corpo = (await resposta.json()) as { meta: { totalItems: number } };
    const ok = corpo.meta.totalItems > 0;
    return {
      numero: 6,
      titulo: 'Traces no Langfuse',
      ok,
      detalhe: ok
        ? `${corpo.meta.totalItems} traces nas últimas 24h`
        : 'nenhum trace nas últimas 24h',
    };
  } catch (error) {
    return {
      numero: 6,
      titulo: 'Traces no Langfuse',
      ok: false,
      detalhe: `sem resposta (${(error as Error).message})`,
    };
  }
}

// Rajada pequena de propósito (não load-test.ts, que é o script dedicado do G.5): o suficiente
// pra estourar o RATE_LIMIT_MAX default (20) sem gerar custo real de LLM maior que o
// necessário — respostas 429 nunca chegam a invocar o grafo.
async function checarRajadaEAlerta(url: string): Promise<CheckResult> {
  const alvo = `${url.replace(/\/$/, '')}/api/chat`;
  const N = 25;

  let respostas: number[];
  try {
    respostas = await Promise.all(
      Array.from({ length: N }, () =>
        fetch(alvo, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question: 'capstone:check — rajada de teste' }),
        })
          .then((r) => r.status)
          .catch(() => 0),
      ),
    );
  } catch (error) {
    return {
      numero: 7,
      titulo: 'Rate limiting + alerta',
      ok: false,
      detalhe: `rajada falhou (${(error as Error).message})`,
    };
  }

  if (!respostas.includes(429)) {
    return {
      numero: 7,
      titulo: 'Rate limiting + alerta',
      ok: false,
      detalhe: `nenhuma resposta 429 em ${N} requisições — rate limit não disparou`,
    };
  }

  const grafanaUrl = process.env.GRAFANA_URL;
  const grafanaToken = process.env.GRAFANA_CLOUD_DASH;
  if (!grafanaUrl || !grafanaToken) {
    return {
      numero: 7,
      titulo: 'Rate limiting + alerta',
      ok: false,
      detalhe: '429 confirmado, mas GRAFANA_URL/GRAFANA_CLOUD_DASH ausentes pra checar o alerta',
    };
  }

  try {
    const resposta = await fetch(
      `${grafanaUrl.replace(/\/$/, '')}/api/v1/provisioning/alert-rules`,
      {
        headers: { Authorization: `Bearer ${grafanaToken}` },
      },
    );
    const regras = (await resposta.json()) as { title: string }[];
    const existe = regras.some((r) => r.title.toLowerCase().includes('abuso'));
    return {
      numero: 7,
      titulo: 'Rate limiting + alerta',
      ok: existe,
      detalhe: existe
        ? '429 confirmado na rajada, alerta de abuso configurado no Grafana'
        : '429 confirmado, mas nenhuma regra de alerta de abuso encontrada no Grafana',
    };
  } catch (error) {
    return {
      numero: 7,
      titulo: 'Rate limiting + alerta',
      ok: false,
      detalhe: `429 confirmado, mas checar o Grafana falhou (${(error as Error).message})`,
    };
  }
}

interface RevisaoCloudRun {
  status?: { conditions?: { type: string; status: string }[] };
}

// gcloud, não a API REST do Cloud Run — mesmo padrão de scripts/rollback.ts, que faz a mesma
// consulta pra decidir o alvo do rollback. Serviço/região fixos (convenção do projeto, não
// específicos de conta); o projeto vem de GOOGLE_CLOUD_PROJECT_ID, igual à aplicação e a
// scripts/rollback.ts — não hardcoded, senão o check nunca aponta pra conta do aluno.
function checarRollbackDisponivel(): CheckResult {
  const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
  if (!projectId) {
    return {
      numero: 8,
      titulo: 'Rollback disponível',
      ok: false,
      detalhe: 'GOOGLE_CLOUD_PROJECT_ID ausente no ambiente',
    };
  }

  try {
    const saida = execFileSync(
      'gcloud',
      [
        'run',
        'revisions',
        'list',
        '--service=ai-researcher-api',
        '--region=us-central1',
        `--project=${projectId}`,
        '--format=json',
      ],
      { encoding: 'utf-8' },
    );
    const revisoes = JSON.parse(saida) as RevisaoCloudRun[];
    const prontas = revisoes.filter((r) =>
      r.status?.conditions?.some((c) => c.type === 'Ready' && c.status === 'True'),
    );
    const ok = prontas.length > 1;
    return {
      numero: 8,
      titulo: 'Rollback disponível',
      ok,
      detalhe: ok
        ? `${prontas.length} revisions prontas — rollback tem pra onde reverter`
        : `só ${prontas.length} revision pronta — sem alvo de rollback ainda`,
    };
  } catch (error) {
    return {
      numero: 8,
      titulo: 'Rollback disponível',
      ok: false,
      detalhe: `gcloud falhou (${(error as Error).message})`,
    };
  }
}

async function checarMetricasCusto(url: string): Promise<CheckResult> {
  const alvo = `${url.replace(/\/$/, '')}/api/metrics`;
  try {
    const resposta = await fetch(alvo);
    if (!resposta.ok) {
      return {
        numero: 9,
        titulo: 'Custo por pergunta',
        ok: false,
        detalhe: `status ${resposta.status}`,
      };
    }
    const corpo = await resposta.text();
    const ok = corpo.includes('llm_cost_usd_total');
    return {
      numero: 9,
      titulo: 'Custo por pergunta',
      ok,
      detalhe: ok
        ? '/metrics expõe llm_cost_usd_total'
        : 'métrica llm_cost_usd_total não encontrada em /metrics',
    };
  } catch (error) {
    return {
      numero: 9,
      titulo: 'Custo por pergunta',
      ok: false,
      detalhe: `sem resposta (${(error as Error).message})`,
    };
  }
}

// Local, não do alvo checado — README.md fica no repo, não em produção. Mesmo espírito de
// checarSegredosProtegidos(): audita o que está no working tree.
function checarReadme(): CheckResult {
  try {
    const caminho = fileURLToPath(new URL('../README.md', import.meta.url));
    const conteudo = readFileSync(caminho, 'utf-8');
    const temArquitetura = /arquitetura/i.test(conteudo);
    const temDiagrama = conteudo.includes('```mermaid');
    const ok = temArquitetura && temDiagrama;

    const faltando = [
      !temArquitetura && 'seção de arquitetura',
      !temDiagrama && 'diagrama Mermaid',
    ].filter((x): x is string => Boolean(x));

    return {
      numero: 11,
      titulo: 'README com arquitetura',
      ok,
      detalhe: ok
        ? 'seção de arquitetura com diagrama Mermaid presente'
        : `faltando: ${faltando.join(', ')}`,
    };
  } catch (error) {
    return {
      numero: 11,
      titulo: 'README com arquitetura',
      ok: false,
      detalhe: `README.md não encontrado (${(error as Error).message})`,
    };
  }
}

function usuarioGithub(): string {
  try {
    return execFileSync('gh', ['api', 'user', '--jq', '.login'], { encoding: 'utf-8' }).trim();
  } catch {
    return '?';
  }
}

function imprimirRelatorio(resultados: CheckResult[]): void {
  const agora = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date());

  console.log(`━━━━ CAPSTONE CHECK · @${usuarioGithub()} ━━━━`);
  console.log(`Projeto: AI Researcher          ${agora}`);
  console.log('');

  for (const resultado of resultados) {
    const emoji = resultado.ok ? '✅' : '❌';
    console.log(
      `${emoji}  ${resultado.numero}. ${resultado.titulo.padEnd(20)} ${resultado.detalhe}`,
    );
  }

  const aprovados = resultados.filter((r) => r.ok).length;
  console.log('');
  console.log(`SCORE: ${aprovados}/${resultados.length}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

async function main() {
  const url = argumentoUrl();

  // Ordem de execução aqui não é a ordem de exibição (o relatório reordena por `numero`
  // depois) — importa porque a rajada do item 7 estoura o rate limit de propósito. Rodar
  // checarRajadaEAlerta antes de checarDegradacaoGraciosa/checarGuardrail fazia os dois
  // (que também batem em /chat) verem 429 por causa da rajada, não por um problema de
  // verdade — por isso a rajada roda por último entre os checks que usam /chat.
  const resultados = [
    await checarEndpointPublico(url),
    checarDeployAutomatizado(),
    checarSegredosProtegidos(),
    checarTestesCi(),
    await checarDegradacaoGraciosa(url),
    await checarTracesLangfuse(),
    checarRollbackDisponivel(),
    await checarMetricasCusto(url),
    await checarGuardrail(url),
    await checarRajadaEAlerta(url),
    checarReadme(),
  ].sort((a, b) => a.numero - b.numero);

  imprimirRelatorio(resultados);

  process.exitCode = resultados.every((r) => r.ok) ? 0 : 1;
}

main();
