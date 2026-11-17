# Aula 1.7 — Walking Skeleton e Deploy Zero

## Cena 2 — `apps/api` com `/api/health`

```text
Crie apps/api com Fastify e TypeScript. Uma rota GET /api/health que checa o Postgres de verdade via pg — consulta simples tipo SELECT 1, com timeout curto, e nunca derruba o processo se o banco estiver fora do ar, só reporta degraded. A resposta segue um schema zod em packages/contracts, compartilhado entre API e frontend. Deixe pronto também o jeito de rodar isso localmente contra o Postgres do docker-compose: um .env na raiz (gitignorado) com a DATABASE_URL apontando pra localhost — não pro nome do serviço do docker-compose, que só resolve dentro da rede do Docker —, um .env.example versionado documentando a variável, e o script dev da API carregando esse .env automaticamente (sem quebrar produção, que continua vindo do Secret Manager).
```

## Cena 3 — `apps/web` com Angular

```text
Crie apps/web com a skill oficial angular-new-app. Angular 22, standalone, signals. Um componente que consome /api/health via resource() e mostra o status na tela. Depois de gerar o projeto, desligue o prompt de coleta de analytics do Angular CLI (ng analytics off) — sem isso, a primeira vez que o ng serve roda dentro do pnpm dev/turbo, ele trava esperando uma resposta interativa que nunca chega, e a tela nunca sobe.
```

## Cena 5 — `docker-compose.yml`

```text
Crie docker-compose.yml na raiz subindo Postgres com pgvector, a API e o Web, usando turbo prune --docker nos Dockerfiles pra build eficiente em monorepo. O Postgres do compose é efêmero, só pra desenvolvimento — nunca é o Cloud SQL.
```

## Cena 6 — Workflow de deploy

```text
Crie .github/workflows/deploy.yml. Um job test que builda, testa e faz lint em todo PR. Um job deploy, que só roda em push pra main e só depois do test passar, autenticado via a Workload Identity Federation que já existe no GCP — sem chave de service account. Ele builda e sobe a imagem Docker da API pro Artifact Registry, faz deploy no Cloud Run com acesso ao Cloud SQL e ao secret database-url, builda o Angular e publica no Firebase Hosting.
```

## Cena 7 — Investigar falhas do deploy

Usado a cada falha real do primeiro deploy (permissão do bucket do Cloud Build, `secretAccessor` da service account de execução, build do Angular fora do Turborepo):

```text
O deploy falhou no build — aqui está o log de erro. Investigue e proponha uma correção.
```

## Cena 9 — Liberar acesso público ao Cloud Run

```text
O Cloud Run está privado. Pra este endpoint (/api/health, sem custo de LLM ainda) ficar acessível publicamente, preciso liberar allUsers com roles/run.invoker. Antes de rodar, confirme comigo que entendo que isso expõe o serviço pra internet inteira.
```
