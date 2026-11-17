# Aula 4.3 — Painel de estado do grafo em tempo real

## Cena 3 — `GraphStore`

```text
Crie GraphStore em apps/web/src/app/state/graph-store.ts. A cada evento do stream, marca a última etapa da lista como concluída e prevê a próxima: depois de retrieve vem sempre grade; depois de webSearch vem sempre retrieve; depois de grade, se sufficient for verdadeiro vai pra answer, senão volta pra webSearch — a não ser que já tenha rodado o número máximo de iterações do grafo, aí vai direto pra answer. Espelhe o limite de iterações do packages/agent/src/graph.ts, mas não importe o pacote @hero/agent aqui — ele carrega LangGraph, Vertex AI e Postgres, dependências de servidor que não pertencem ao bundle do navegador.
```

## Cena 6 — `GraphPanelComponent`

```text
Crie GraphPanelComponent em apps/web/src/app/graph/graph-panel/. Lista as etapas de GraphStore como uma timeline vertical — círculo com spinner girando enquanto running, check quando concluída, com rótulo, descrição e a duração formatada. Quando alguma etapa for webSearch, mostra um banner explicando que o contexto local foi insuficiente. Use a skill frontend-design pra cor e forma. No final verifique no navegador se tudo esta funcionando corretamente
```
