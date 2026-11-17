import { execFileSync } from 'node:child_process';
import { createInterface } from 'node:readline/promises';

// Remove todos os recursos GCP provisionados no Bloco A (infra/README.md), nessa ordem —
// Cloud SQL primeiro porque é o único custo fixo do projeto (~US$ 10-15/mês, plano.md), então
// é o que mais importa parar de cobrar rápido, mesmo que os passos seguintes demorem ou falhem.
//
// Uso: make destroy  (chama este script — ver Makefile)
//
// Exige digitar o PROJECT_ID de volta pra confirmar. Sem --yes, nenhum comando roda.
//
// Lê o projeto de GOOGLE_CLOUD_PROJECT_ID (mesma variável usada pela aplicação e por
// deploy.yml) em vez de um valor fixo — cada aluno roda isso contra o próprio projeto GCP.

const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT_ID;
if (!PROJECT_ID) {
  console.error('GOOGLE_CLOUD_PROJECT_ID não configurada. Ver infra/README.md.');
  process.exit(1);
}

const REGION = 'us-central1';
const CLOUD_SQL_INSTANCE = 'ai-researcher-db';
const CLOUD_RUN_SERVICE = 'ai-researcher-api';
const ARTIFACT_REPO = 'ai-researcher';
const WIF_POOL = 'github-actions-pool';
const DEPLOY_SERVICE_ACCOUNT = `github-actions-deployer@${PROJECT_ID}.iam.gserviceaccount.com`;
const SECRETS = [
  'database-url',
  'langfuse-public-key',
  'langfuse-secret-key',
  'serper-api-key',
  'otel-exporter-otlp-headers',
];

interface Passo {
  titulo: string;
  comando: string[];
}

const passos: Passo[] = [
  {
    titulo: `Cloud SQL (${CLOUD_SQL_INSTANCE}) — único custo fixo, primeiro de propósito`,
    comando: ['sql', 'instances', 'delete', CLOUD_SQL_INSTANCE, '--project', PROJECT_ID, '--quiet'],
  },
  {
    titulo: `Cloud Run (${CLOUD_RUN_SERVICE})`,
    comando: [
      'run',
      'services',
      'delete',
      CLOUD_RUN_SERVICE,
      '--region',
      REGION,
      '--project',
      PROJECT_ID,
      '--quiet',
    ],
  },
  {
    titulo: `Artifact Registry (${ARTIFACT_REPO})`,
    comando: [
      'artifacts',
      'repositories',
      'delete',
      ARTIFACT_REPO,
      '--location',
      REGION,
      '--project',
      PROJECT_ID,
      '--quiet',
    ],
  },
  ...SECRETS.map((nome) => ({
    titulo: `Secret Manager (${nome})`,
    comando: ['secrets', 'delete', nome, '--project', PROJECT_ID, '--quiet'],
  })),
  {
    titulo: `Workload Identity Pool (${WIF_POOL}) — cascade sobre o provider`,
    comando: [
      'iam',
      'workload-identity-pools',
      'delete',
      WIF_POOL,
      '--location=global',
      '--project',
      PROJECT_ID,
      '--quiet',
    ],
  },
  {
    titulo: `Service account de deploy (${DEPLOY_SERVICE_ACCOUNT})`,
    comando: [
      'iam',
      'service-accounts',
      'delete',
      DEPLOY_SERVICE_ACCOUNT,
      '--project',
      PROJECT_ID,
      '--quiet',
    ],
  },
];

async function confirmar(): Promise<boolean> {
  if (process.argv.includes('--yes')) return true;

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  console.log(
    `Isso remove TODOS os recursos GCP do projeto "${PROJECT_ID}", começando pelo Cloud SQL.`,
  );
  console.log('Não tem desfazer. Digite o project id pra confirmar:');
  const resposta = await rl.question('> ');
  rl.close();
  return resposta.trim() === PROJECT_ID;
}

async function main() {
  const confirmado = await confirmar();
  if (!confirmado) {
    console.log('Cancelado — não digitou o project id corretamente.');
    process.exit(1);
  }

  const falhas: string[] = [];

  for (const passo of passos) {
    console.log(`\n→ ${passo.titulo}`);
    try {
      execFileSync('gcloud', passo.comando, { stdio: 'inherit' });
      console.log(`  ✓ removido`);
    } catch (error) {
      console.log(`  ✗ falhou: ${(error as Error).message}`);
      falhas.push(passo.titulo);
    }
  }

  console.log('\n' + '─'.repeat(40));
  if (falhas.length === 0) {
    console.log('Tudo removido.');
  } else {
    console.log(
      `${falhas.length} passo(s) falharam (pode já estar removido, ou precisa de retry):`,
    );
    for (const f of falhas) console.log(`  - ${f}`);
    process.exitCode = 1;
  }

  console.log(
    '\nFirebase Hosting e o projeto GCP em si não são removidos por este script — ' +
      `rode "firebase hosting:disable --project ${PROJECT_ID}" e/ou ` +
      `"gcloud projects delete ${PROJECT_ID}" manualmente se quiser remover tudo mesmo, ` +
      'incluindo o projeto (isso também derruba qualquer recurso que este script não conheça).',
  );
}

main();
