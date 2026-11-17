# Aula 2.5 — O grafo real: aresta condicional e o guard do loop

## Cena 2 — Montar o grafo com LangGraph

Terminal em `packages/agent`.

```text
Monte o grafo de verdade com @langchain/langgraph (StateGraph) em src/graph.ts, ligando os nós retrieve, grade e webSearch que já existem: START → retrieve → grade, e uma aresta condicional a partir de grade — se sufficient for true, termina (END); senão, se iterations já bateu MAX_ITERATIONS = 2, também termina; caso contrário, vai pro webSearch, que sempre volta pro retrieve. iterations é um campo do estado que soma 1 a cada passada por grade via reducer, sem contador externo. GraphDeps recebe as dependências de nó por função (buscar, inserirDocumentoWeb, etc.), não o cliente de banco direto, pra o grafo inteiro ser testável com fakes. Teste com app.stream(), coletando a sequência de nós visitados: caminho direto quando suficiente na primeira rodada, o loop completo quando insuficiente, e o guard cortando exatamente em MAX_ITERATIONS rodadas de grade mesmo que o LLM fake sempre devolva insuficiente.
```
