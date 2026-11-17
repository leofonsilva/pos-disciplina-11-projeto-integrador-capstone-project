# Aula 2.2 — Os nós retrieve e grade

## Cena 2 — O nó `retrieve`

Terminal em `packages/agent`, Postgres local no ar.

```text
Crie o nó retrieve do grafo em packages/agent/src/nodes/retrieve.ts. Ele recebe a pergunta do estado, gera o embedding dela e busca os documentos mais próximos no Postgres, top-k com default 5. Siga a convenção do projeto: o nó não importa nenhum cliente global — ele é uma factory que recebe um cliente de embeddings e uma função de busca por parâmetro, pra ser testável com fake, sem chamada real de rede ou banco. Crie também a função de busca em packages/agent/src/db/retrieve-similar.ts, usando o operador de distância de cosseno do Drizzle.
```

## Cena 6 — O nó `grade`

```text
Crie o nó grade do grafo em packages/agent/src/nodes/grade.ts. Ele recebe question e documents do estado e usa saída estruturada do LLM — um schema zod com sufficient (boolean) e missingAspects (array de string) — pra classificar se o contexto encontrado responde a pergunta. Separe o prompt em packages/agent/src/prompts/grade.ts: o contexto é só numérico (indicadores financeiros por empresa e trimestre), então perguntas qualitativas — motivo por trás de um número, notícia, fato relevante, guidance, previsão de preço — devem ser sempre classificadas como insuficientes, mesmo que o documento seja da empresa certa. Siga a convenção do projeto: factory recebendo o cliente de LLM por parâmetro, sem importar client global, testável com fake.
```
