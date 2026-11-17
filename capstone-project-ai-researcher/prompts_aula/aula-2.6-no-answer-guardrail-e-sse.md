# Aula 2.6 — O nó answer, citação obrigatória, guardrail por código e streaming SSE

## Cena 3 — O nó `answer`

Terminal em `packages/agent`.

```text
Crie o nó answer (packages/agent/src/nodes/answer.ts). Recebe question, documents e sufficient do estado, monta um prompt (packages/agent/src/prompts/answer.ts) que instrui o modelo a nunca recomendar decisão de investimento mesmo se a pergunta pedir diretamente, a responder só com base no contexto recuperado sem inventar número, e a avisar quando o contexto estiver incompleto. Depois de receber a resposta do LLM, passe por um filtro determinístico (packages/agent/src/answer/format-resposta.ts): se o texto contiver linguagem recomendatória — verbo em primeira pessoa tipo 'recomendo'/'sugiro'/'aconselho', ou construções como 'vale a pena comprar' —, substitua a resposta inteira por um aviso fixo de guardrail, mantendo as citações. Sempre anexe um bloco de fontes no final, um item por documento, deduplicado por sourceUrl — ticker+período+data-base pros documentos do corpus CVM, título pros documentos web. Teste com LLM fake: resposta normal com citação, resposta filtrada quando o LLM tenta recomendar, e um teste que confirma que o prompt em si já instrui a nunca recomendar.
```

## Cena 6 — `POST /api/chat` com streaming SSE

Terminal em `apps/api`.

```text
Exponha o grafo via POST /api/chat (apps/api/src/routes/chat.ts), como uma rota Fastify que recebe { question }, valida com o schema de @hero/contracts, e transmite a execução do grafo como Server-Sent Events — um evento por nó concluído, não por token. Escreva os headers manualmente com Cache-Control: no-cache, no-transform (sem isso o Cloud Run bufferiza a resposta inteira em vez de transmitir aos poucos) e Connection: keep-alive. Itere o graph.stream() e, pra cada chunk, traduza o nome do nó e o update dele num evento tipado (apps/api/src/routes/chat-event.ts) — documentos resumidos pro retrieve, sufficient/missingAspects/iterations pro grade, o texto final pro answer, só o nome pro webSearch, que não produz campo de estado novo. Se o grafo lançar erro no meio do stream, escreva um evento SSE de erro e encerre a conexão, nunca derrube o processo. Injete o grafo por interface mínima (GraphLike, só o método stream que a rota usa), não o tipo concreto do LangGraph, pra testar com um grafo fake sem LLM nem Postgres real.
```
