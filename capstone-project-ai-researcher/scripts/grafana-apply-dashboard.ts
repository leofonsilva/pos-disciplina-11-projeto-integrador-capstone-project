import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Aplica infra/grafana/dashboard.json via API do Grafana Cloud — "provisionado por arquivo,
// não clicado" (G.3). Idempotente: o dashboard tem uid fixo, então rodar de novo atualiza o
// mesmo dashboard em vez de criar um novo.
//
// Uso: pnpm grafana:dashboard
// Requer no ambiente:
//   GRAFANA_URL           — ex: https://suaorg.grafana.net
//   GRAFANA_CLOUD_DASH     — Access Policy Token do Grafana Cloud, com permissão de escrever
//                            dashboard (Grafana Cloud → Administration → Access Policies).
//                            Diferente do header usado por OTEL_EXPORTER_OTLP_HEADERS, que só
//                            serve pra ingestão de telemetria, não pra API de dashboards.

interface Datasource {
  uid: string;
  type: string;
  name: string;
}

function lerConfiguracao(): { url: string; token: string } {
  const url = process.env.GRAFANA_URL;
  const token = process.env.GRAFANA_CLOUD_DASH;

  if (!url || !token) {
    console.error(
      'Uso: GRAFANA_URL e GRAFANA_CLOUD_DASH precisam estar no ambiente (ex: ~/.zshrc).\n' +
        'GRAFANA_URL: URL da sua stack, tipo https://suaorg.grafana.net\n' +
        'GRAFANA_CLOUD_DASH: Access Policy Token com permissão de escrever dashboard.',
    );
    process.exit(1);
  }

  return { url: url.replace(/\/$/, ''), token };
}

async function buscarDatasourcePrometheus(url: string, token: string): Promise<string> {
  const resposta = await fetch(`${url}/api/datasources`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!resposta.ok) {
    throw new Error(`GET /api/datasources falhou: ${resposta.status} ${await resposta.text()}`);
  }

  const datasources = (await resposta.json()) as Datasource[];
  const prometheus = datasources.find((ds) => ds.type === 'prometheus');

  if (!prometheus) {
    throw new Error(
      'Nenhum datasource do tipo "prometheus" encontrado na stack — o Grafana Cloud deveria ' +
        'provisionar um automaticamente (o Mimir hospedado) junto com a stack.',
    );
  }

  return prometheus.uid;
}

function carregarDashboard(datasourceUid: string): Record<string, unknown> {
  const caminho = fileURLToPath(new URL('../infra/grafana/dashboard.json', import.meta.url));
  const bruto = readFileSync(caminho, 'utf-8');
  const substituido = bruto.replaceAll('__DATASOURCE_UID__', datasourceUid);
  return JSON.parse(substituido) as Record<string, unknown>;
}

async function aplicarDashboard(
  url: string,
  token: string,
  dashboard: Record<string, unknown>,
): Promise<string> {
  const resposta = await fetch(`${url}/api/dashboards/db`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      dashboard,
      overwrite: true,
      message: 'Atualizado via scripts/grafana-apply-dashboard.ts',
    }),
  });

  if (!resposta.ok) {
    throw new Error(`POST /api/dashboards/db falhou: ${resposta.status} ${await resposta.text()}`);
  }

  const corpo = (await resposta.json()) as { url: string };
  return corpo.url;
}

async function main() {
  const { url, token } = lerConfiguracao();

  console.log(`Buscando datasource Prometheus em ${url}...`);
  const datasourceUid = await buscarDatasourcePrometheus(url, token);
  console.log(`Datasource encontrado: ${datasourceUid}`);

  const dashboard = carregarDashboard(datasourceUid);

  console.log('Aplicando infra/grafana/dashboard.json...');
  const caminhoDashboard = await aplicarDashboard(url, token, dashboard);

  console.log(`Pronto: ${url}${caminhoDashboard}`);
}

main().catch((error) => {
  console.error((error as Error).message);
  process.exitCode = 1;
});
