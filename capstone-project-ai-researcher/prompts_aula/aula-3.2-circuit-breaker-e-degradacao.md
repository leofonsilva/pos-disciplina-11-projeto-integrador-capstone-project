# Aula 3.2 — Circuit breaker, retry e degradação graciosa

## Cena 3 — Resiliência no `SearchProvider`

Terminal na raiz do repositório.

```text
O SearchProvider (Serper e Google Custom Search) não tem nenhuma proteção contra falha externa hoje — se a API travar, o fetch espera pra sempre. Adiciona timeout explícito de 10 segundos no fetch dos dois providers. Depois, cria um decorador comResiliencia() que envolve qualquer SearchProvider com retry e backoff exponencial, mais um circuit breaker: falhas consecutivas o bastante abrem o circuito, e chamadas seguintes falham na hora, sem chamar o provider, até um tempo de resfriamento passar. criarSearchProvider() aplica isso por padrão pro Serper e pro Google — a fixture do modo DEMO não passa por essa camada, porque não tem rede ali pra proteger. Tempo de espera e relógio precisam ser injetáveis, pra dar pra testar sem esperar de verdade os segundos de backoff ou o resfriamento do circuito.
```

## Cena 8 — Degradação graciosa no nó `web_search`

```text
Hoje, se searchProvider.search() lançar erro dentro do nó web_search — Serper fora do ar, ou o circuito aberto — o erro propaga pra fora do nó e derruba o grafo inteiro, mesmo quando o corpus da CVM sozinho já dava pra responder algo. Quero que cada query tenha seu próprio try/catch em volta da chamada a search(): se uma query falhar, segue pra próxima, sem propagar. Se nenhuma query render documento novo, o nó simplesmente não adiciona nada — o grafo volta pro retrieve de mãos vazias, o guard de iteração eventualmente corta o loop, e o answer já sabe avisar que o contexto pode estar incompleto. Escreve um teste de ponta a ponta no graph.test.ts provando isso: SearchProvider sempre falhando, e o grafo ainda assim termina em answer com uma resposta real.
```
