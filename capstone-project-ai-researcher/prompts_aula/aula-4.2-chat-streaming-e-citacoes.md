# Aula 4.2 — Chat com streaming e citações clicáveis

## Cena 3 — Roteamento: Chat na raiz, health check em `/health`

```text
No projeto Angular já existente em apps/web, adicione roteamento com @angular/router (já é dependência). Crie src/app/app.routes.ts com duas rotas: '' aponta pro componente Chat, e 'health' aponta pra um componente novo Health em src/app/health/, reaproveitando o HealthService que já existe desde o Bloco C pra mostrar o texto de status que hoje está solto em app.html. Registre as rotas em app.config.ts com provideRouter. Troque app.html pra só <router-outlet />, e app.ts pra importar RouterOutlet em vez do Chat direto.
```

## Cena 4 — Um único grafo real para `/chat` e `/mcp`

```text
apps/api/src/routes/chat.ts ainda recebe graph: GraphLike já resolvido. Troque pra receber getGraph: GetGraph, resolvendo com await getGraph() dentro do handler, do mesmo jeito que packages/mcp-server já faz. Em apps/api/src/app.ts, renomeie as opções de build() pra getChatGraph e getMcpGraph. Em apps/api/src/index.ts, passe getRealGraph (de @hero/agent) pras duas — a mesma função memoizada, senão /api/chat e /api/mcp acabam com Postgres/Vertex AI/circuit breaker duplicados.
```

## Cena 5 — `ChatService`

```text
No projeto Angular já existente em apps/web, crie um ChatService em src/app/api/chat.service.ts. Um método ask(question) que faz POST /api/chat, lê o ReadableStream do corpo da resposta e produz um AsyncGenerator dos eventos do grafo (retrieve, grade, webSearch, answer). O formato dos frames é o mesmo que apps/api/src/routes/chat.ts escreve: blocos separados por linha em branco, data: com o JSON do evento. Se o evento for error, lance uma exceção com a mensagem.
```

## Cena 8 — `ChatStore`

```text
Crie um ChatStore em src/app/state/chat-store.ts. send(question) adiciona a mensagem do usuário e um placeholder do assistente, chama ChatService.ask, e quando chegar o evento do nó answer, revela o texto palavra por palavra (70ms por palavra) — com um helper tokenize separado. Se a chamada falhar, mostra uma mensagem de erro fixa, sem streaming. Limpe qualquer timer pendente ao destruir o store.
```

## Cena 11 — `parseAnswer`

```text
Em apps/web/src/app/state/citation.ts, crie parseAnswer. Recebe o answerText, separa o corpo do bloco Fontes: no final, e extrai uma Citation por linha (rótulo + URL). Se o rótulo tiver o formato TICKER · período (data-base X), extraia essa parte como o período e marque a origem como 'Base local (CVM)'; senão, use o hostname da URL.
```

## Cena 13 — Ligar tudo no componente Chat

```text
O componente Chat (src/app/chat/) ainda é a casca estática da 4.1 — nada nele usa ChatStore, ChatService ou parseAnswer, que já existem e já têm teste. Injete ChatStore, ligue a textarea a um signal local com (input)/(keydown) (Enter envia, Shift+Enter quebra linha), e o botão .chat__send a store.send(question) (desabilitado enquanto vazio ou enquanto a última resposta ainda não chegou). Renderize store.messages() em .chat__messages: mensagem do usuário como bolha à direita, mensagem do assistente passando por parseAnswer — corpo do texto, e a lista de citações (link + data-base) quando houver.
```
