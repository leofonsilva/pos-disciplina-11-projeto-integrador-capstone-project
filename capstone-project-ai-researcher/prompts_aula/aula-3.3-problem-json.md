# Aula 3.3 — Erros padronizados em application/problem+json

## Cena 3 — Error handler central

Terminal na raiz do repositório.

```text
Hoje cada rota da API trata erro do seu próprio jeito, sem padrão. Quero um error handler central, registrado uma única vez com app.setErrorHandler() — nenhuma rota deve tratar erro por conta própria. Mapeia ZodError pra 400, CircuitoAbertoError (do SearchProvider, já existe em @hero/agent) pra 503, e qualquer outro erro pra 500 genérico, sem vazar detalhe interno tipo stack trace. O formato da resposta é RFC 7807 — application/problem+json, com type/title/status/detail — define esse schema em packages/contracts, porque o frontend também vai precisar dele quando chegar a hora de mostrar erro na tela.
```
