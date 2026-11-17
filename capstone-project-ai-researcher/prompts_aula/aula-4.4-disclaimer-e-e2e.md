# Aula 4.4 — Disclaimer, guardrail visual e o E2E no CI

## Cena 3 — Faixa de disclaimer

```text
Adicione uma faixa de disclaimer fixa em Chat, entre o header e a lista de mensagens, renderizada incondicionalmente — sem @if, sem botão de fechar, sem modal. Texto: 'Este assistente apresenta informações públicas, não recomendação de investimento.'
```

## Cena 6 — `DEMO=true` no grafo inteiro

```text
Estenda DEMO=true pro grafo inteiro. criarEmbeddings() deve devolver um vetor de zeros quando em modo demo — o valor não importa, porque a busca por similaridade também vai ser fixture. Crie criarBuscarDemo() que sempre devolve o mesmo documento real da Vale 3T25, congelado do corpus. Crie criarGradeLlmDemo() que sempre considera o contexto suficiente, e criarAnswerLlmDemo() com uma resposta fixa. Isole o embedDocuments() em lote — usado só pelo seed real — numa função separada, criarEmbeddingsReal(), porque o seed nunca deve rodar em modo demo.
```

## Cena 9 — Teste Playwright do caminho feliz

```text
Crie apps/web/e2e/chat-happy-path.spec.ts com Playwright. Sobe os dois servidores reais via webServer do playwright.config.ts — apps/api com DEMO=true e apps/web com ng serve. O teste: disclaimer sempre visível, envia a pergunta 'Qual foi a receita líquida da Vale no 3T25?', espera a resposta completa em streaming conter 'R$ 56,7 bilhões', clica na citação e confirma data-base '2025-09-30', origem 'Base local (CVM)' e o link pro ZIP da CVM, e confirma que o painel do grafo terminou em 3 etapas — sem passar por Search.No final execute o teste pelo playwrite
```
