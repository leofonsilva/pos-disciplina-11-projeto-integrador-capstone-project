import { execFileSync } from 'node:child_process';

// Reverte 100% do tráfego do Cloud Run pra revisão anterior (ou uma revisão específica) em um
// único comando (G.6, critério "revision defeituosa revertida em um comando").
//
// Uso:
//   pnpm rollback                     — reverte pra revisão anterior à mais recente
//   pnpm rollback --revision <nome>   — reverte pra uma revisão específica

const SERVICE = 'ai-researcher-api';
const REGION = 'us-central1';

// Mesma variável usada pela aplicação e por deploy.yml — cada aluno roda isso contra o
// próprio projeto GCP.
const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT_ID;
if (!PROJECT_ID) {
  console.error('GOOGLE_CLOUD_PROJECT_ID não configurada. Ver infra/README.md.');
  process.exit(1);
}

interface Revision {
  metadata: { name: string; creationTimestamp: string };
}

function argumento(nome: string): string | undefined {
  const index = process.argv.indexOf(`--${nome}`);
  return index !== -1 ? process.argv[index + 1] : undefined;
}

function revisoesPorDataDesc(): Revision[] {
  const saida = execFileSync(
    'gcloud',
    [
      'run',
      'revisions',
      'list',
      `--service=${SERVICE}`,
      `--region=${REGION}`,
      `--project=${PROJECT_ID}`,
      '--format=json',
    ],
    { encoding: 'utf-8' },
  );
  const revisoes = JSON.parse(saida) as Revision[];
  return revisoes.sort(
    (a, b) =>
      new Date(b.metadata.creationTimestamp).getTime() -
      new Date(a.metadata.creationTimestamp).getTime(),
  );
}

function main() {
  const revisaoExplicita = argumento('revision');
  const revisoes = revisoesPorDataDesc();

  // revisoes[0] é a mais recente (a que presumivelmente está com problema); revisoes[1] é a
  // anterior, o alvo natural de rollback sem precisar informar o nome.
  const alvo = revisaoExplicita ?? revisoes[1]?.metadata.name;

  if (!alvo) {
    console.error('Não há revisão anterior pra reverter — só existe uma revisão no serviço.');
    process.exit(1);
  }

  console.log(`Revertendo 100% do tráfego de ${SERVICE} pra ${alvo}...`);
  execFileSync(
    'gcloud',
    [
      'run',
      'services',
      'update-traffic',
      SERVICE,
      `--region=${REGION}`,
      `--project=${PROJECT_ID}`,
      `--to-revisions=${alvo}=100`,
    ],
    { stdio: 'inherit' },
  );

  console.log(`Pronto: 100% do tráfego em ${alvo}.`);
}

main();
