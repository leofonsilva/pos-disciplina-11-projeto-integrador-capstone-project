# Aula 1.6 — Fundação GCP

Antes dos prompts, rode os dois logins direto no terminal, fora do Claude Code:

```bash
gcloud auth login
gcloud auth application-default login
```

## Cena 3 — Projeto, billing e APIs

```text
Seguindo o infra/README.md, crie o projeto GCP ai-researcher-capstone, vincule à billing account e habilite as APIs necessárias: Cloud Run, Cloud SQL Admin, Artifact Registry, Secret Manager e IAM Credentials. Rode um comando por vez e espere minha aprovação antes de cada execução.
```

## Cena 4 — Artifact Registry

```text
Crie o repositório Docker do Artifact Registry pra este projeto, seguindo o infra/README.md.
```

## Cena 5 — Cloud SQL + pgvector

```text
Provisione o Cloud SQL Postgres 16 com pgvector, seguindo o infra/README.md: instância ai-researcher-db, tier db-f1-micro, região us-central1. Depois crie o banco ai_researcher, habilite a extensão vector, e crie o usuário app_user com senha gerada de forma segura.
```

## Cena 6 — Secret `database-url`

```text
Monte a connection string do app_user no formato de socket Unix que o Cloud Run usa em produção, e salve no Secret Manager como database-url — sem escrever em nenhum arquivo local.
```

## Cena 7 — Workload Identity Federation

```text
Crie a Workload Identity Federation pra este repositório GitHub, seguindo o infra/README.md: pool, provider restrito por attribute.repository a unipds-engenharia-de-ia-aplicada/capstone-project-ai-researcher, a service account github-actions-deployer com as roles listadas no README, e o binding que autoriza o WIF a se passar por ela.
```

## Cena 8 — Variáveis de ambiente (local e GitHub)

```text
O projeto, a Workload Identity Federation e a service account de deploy existem agora. Configure o que falta pra nenhuma dessas informações ficar fixa em código: exporte GOOGLE_CLOUD_PROJECT_ID no meu ~/.zshrc, e crie as variáveis GCP_PROJECT_ID, GCP_WIF_PROVIDER e GCP_DEPLOY_SERVICE_ACCOUNT no repositório do GitHub, seguindo o infra/README.md.
```

## Cena 9 — Firebase Hosting

```text
Inicialize o Firebase Hosting neste projeto, seguindo o infra/README.md.
```
