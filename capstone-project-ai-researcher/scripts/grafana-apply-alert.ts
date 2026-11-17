import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Provisiona o alerta de abuso do G.4/G.5 via API do Grafana Cloud — "alerta dispara em
// execução controlada", provisionado por arquivo, não clicado. Idempotente: pasta, contact
// point e regra têm nome/título fixos, então rodar de novo atualiza em vez de duplicar.
//
// Uso: pnpm grafana:alert
// Requer no ambiente:
//   GRAFANA_URL       — ex: https://suaorg.grafana.net
//   GRAFANA_CLOUD_DASH — Access Policy Token com permissão de escrever alerting/dashboard
//   ALERTA_EMAIL      — e-mail que recebe o alerta (não versionado, é dado pessoal, não
//                       segredo — mesmo motivo de nunca hardcodar credencial)

const NOME_PASTA = 'AI Researcher';
const NOME_CONTACT_POINT = 'ai-researcher-alertas';
const LABEL_ROTEAMENTO = { projeto: 'ai-researcher' };

interface Datasource {
  uid: string;
  type: string;
}

interface Folder {
  uid: string;
  title: string;
}

interface ContactPoint {
  uid?: string;
  name: string;
}

function lerConfiguracao(): { url: string; token: string; email: string } {
  const url = process.env.GRAFANA_URL;
  const token = process.env.GRAFANA_CLOUD_DASH;
  const email = process.env.ALERTA_EMAIL;

  if (!url || !token || !email) {
    console.error(
      'Uso: GRAFANA_URL, GRAFANA_CLOUD_DASH e ALERTA_EMAIL precisam estar no ambiente.\n' +
        'GRAFANA_URL: URL da sua stack, tipo https://suaorg.grafana.net\n' +
        'GRAFANA_CLOUD_DASH: Access Policy Token com permissão de escrever alerting/dashboard.\n' +
        'ALERTA_EMAIL: e-mail que recebe o alerta de abuso.',
    );
    process.exit(1);
  }

  return { url: url.replace(/\/$/, ''), token, email };
}

async function api<T>(url: string, token: string, path: string, init?: RequestInit): Promise<T> {
  const resposta = await fetch(`${url}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });

  if (!resposta.ok) {
    throw new Error(
      `${init?.method ?? 'GET'} ${path} falhou: ${resposta.status} ${await resposta.text()}`,
    );
  }

  return resposta.status === 204 ? (undefined as T) : ((await resposta.json()) as T);
}

async function buscarDatasourcePrometheus(url: string, token: string): Promise<string> {
  const datasources = await api<Datasource[]>(url, token, '/api/datasources');
  const prometheus = datasources.find((ds) => ds.type === 'prometheus');

  if (!prometheus) {
    throw new Error('Nenhum datasource do tipo "prometheus" encontrado na stack.');
  }

  return prometheus.uid;
}

async function garantirPasta(url: string, token: string): Promise<string> {
  const pastas = await api<Folder[]>(url, token, '/api/folders');
  const existente = pastas.find((p) => p.title === NOME_PASTA);
  if (existente) return existente.uid;

  const criada = await api<Folder>(url, token, '/api/folders', {
    method: 'POST',
    body: JSON.stringify({ title: NOME_PASTA }),
  });
  return criada.uid;
}

async function garantirContactPoint(url: string, token: string, email: string): Promise<void> {
  const existentes = await api<ContactPoint[]>(url, token, '/api/v1/provisioning/contact-points');
  const existente = existentes.find((cp) => cp.name === NOME_CONTACT_POINT);

  const payload = {
    name: NOME_CONTACT_POINT,
    type: 'email',
    settings: { addresses: email },
    disableResolveMessage: false,
  };

  if (existente?.uid) {
    await api(url, token, `/api/v1/provisioning/contact-points/${existente.uid}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  } else {
    await api(url, token, '/api/v1/provisioning/contact-points', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }
}

// PUT substitui a árvore de política inteira — por isso lê a atual e só adiciona/atualiza a
// rota deste projeto (por LABEL_ROTEAMENTO), preservando o receiver raiz e outras rotas que já
// existirem (de outros alertas, se algum dia houver).
async function garantirPoliticaDeRoteamento(url: string, token: string): Promise<void> {
  const atual = await api<Record<string, unknown>>(url, token, '/api/v1/provisioning/policies');
  const rotas = Array.isArray(atual.routes) ? (atual.routes as Record<string, unknown>[]) : [];

  const matchersDesta = [['projeto', '=', LABEL_ROTEAMENTO.projeto]];
  const semARotaAntiga = rotas.filter(
    (rota) => JSON.stringify(rota.object_matchers) !== JSON.stringify(matchersDesta),
  );

  await api(url, token, '/api/v1/provisioning/policies', {
    method: 'PUT',
    body: JSON.stringify({
      ...atual,
      routes: [
        ...semARotaAntiga,
        { receiver: NOME_CONTACT_POINT, object_matchers: matchersDesta, continue: false },
      ],
    }),
  });
}

interface AlertRule {
  uid?: string;
  title: string;
}

async function aplicarRegraDeAlerta(
  url: string,
  token: string,
  datasourceUid: string,
  folderUid: string,
): Promise<void> {
  const caminho = fileURLToPath(new URL('../infra/grafana/alert-rule.json', import.meta.url));
  const bruto = readFileSync(caminho, 'utf-8')
    .replaceAll('__DATASOURCE_UID__', datasourceUid)
    .replaceAll('__FOLDER_UID__', folderUid);
  const regra = JSON.parse(bruto) as Record<string, unknown> & { title: string };

  const existentes = await api<AlertRule[]>(
    url,
    token,
    `/api/v1/provisioning/folder/${folderUid}/rule-groups/${regra.ruleGroup as string}`,
  ).catch(() => [] as AlertRule[]);
  const listaExistentes = Array.isArray(existentes)
    ? existentes
    : ((existentes as unknown as { rules?: AlertRule[] })?.rules ?? []);
  const existente = listaExistentes.find((r) => r.title === regra.title);

  if (existente?.uid) {
    await api(url, token, `/api/v1/provisioning/alert-rules/${existente.uid}`, {
      method: 'PUT',
      body: JSON.stringify(regra),
    });
  } else {
    await api(url, token, '/api/v1/provisioning/alert-rules', {
      method: 'POST',
      body: JSON.stringify(regra),
    });
  }
}

async function main() {
  const { url, token, email } = lerConfiguracao();

  console.log('Buscando datasource Prometheus...');
  const datasourceUid = await buscarDatasourcePrometheus(url, token);

  console.log(`Garantindo pasta "${NOME_PASTA}"...`);
  const folderUid = await garantirPasta(url, token);

  console.log(`Garantindo contact point de e-mail (${email})...`);
  await garantirContactPoint(url, token, email);

  console.log('Garantindo rota de notificação...');
  await garantirPoliticaDeRoteamento(url, token);

  console.log('Aplicando infra/grafana/alert-rule.json...');
  await aplicarRegraDeAlerta(url, token, datasourceUid, folderUid);

  console.log(`Pronto: ${url}/alerting/list`);
}

main().catch((error) => {
  console.error((error as Error).message);
  process.exitCode = 1;
});
