# Aula 5.1 — Langfuse: tour e instrumentação por nó

## Cena 3 — Instrumentar o grafo

Antes do prompt, `LANGFUSE_PUBLIC_KEY`, `LANGFUSE_SECRET_KEY` e `LANGFUSE_BASE_URL` precisam estar no `~/.zshrc` (Cena 2).

```text
Instrumente o grafo do agente com Langfuse. Registre um NodeTracerProvider do OpenTelemetry com LangfuseSpanProcessor (@langfuse/otel) uma vez no boot de cada processo que pode invocar o grafo — apps/api e os dois transportes do packages/mcp-server. Crie um CallbackHandler (@langfuse/langchain) a cada chamada de graph.stream()/graph.invoke(). Sem as chaves configuradas, nada disso deve registrar nada nem impedir o processo de subir.
```
