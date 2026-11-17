# Aula 4.1 — Do protótipo no Claude Design à skill frontend-design

## Cena 3 — Protótipo inicial (Claude Design)

Enviado no **Claude Design** (`claude.ai/design`), num projeto novo.

```text
Desenhe a tela de um chat consultor de investimentos, ChatGPT-like. Paleta extraída da página da UNIPDS (unipds.com.br/gads_pos_ia): fundo quase-preto, accent ciano, um único botão em verde-limão pro envio da mensagem. Preciso de: bolha de mensagem do usuário à direita e do assistente à esquerda com avatar; texto do assistente aparecendo token a token, com um cursor piscando enquanto ainda está 'digitando'; um painel lateral mostrando o pipeline de raciocínio em 4 etapas — Retrieve, Grade, Search, Answer — cada uma com estado pendente/em execução/concluído; e citação clicável abaixo da resposta, abrindo um painel com data-base, origem e link pro documento original.
```

## Cena 4 — Iteração do protótipo (Claude Design)

```text
A pílula de citação deve ter borda ciano parada quando fechada, e preencher em ciano quando aberta. Quando o pipeline cair no fallback de busca web, mostre um banner explicando que o contexto local foi insuficiente — na mesma paleta ciano, não em vermelho ou amarelo de alerta: fallback é um caminho normal do sistema, não um erro.
```

## Cena 6 — Criar a skill `frontend-design` (Claude Code)

```text
Leia docs/design/prototype/ai-researcher-chat.dc.html e design-tokens-used.md. Crie uma skill em .claude/skills/frontend-design/ que traduza os tokens de cor, tipografia e forma, e os padrões de componente (bolha de mensagem, citação, painel do pipeline, disclaimer, botão de envio) em regras pro código Angular. Inclua a regra de nunca usar verde ou vermelho em dado financeiro ou estado do pipeline — só ciano é cor de estado.
```

## Cena 8 — Tokens globais e a casca do componente Chat (Claude Code)

```text
Usando a skill frontend-design, declare os tokens de cor e tipografia como custom properties globais em styles.scss, e gere a casca estática do componente Chat — header com o wordmark, faixa de disclaimer, área de mensagens vazia e composer com input e botão Enviar. Sem lógica de streaming ainda.
```
