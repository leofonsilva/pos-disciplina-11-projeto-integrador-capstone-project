---
name: frontend-design
description: Use ao escrever ou revisar qualquer CSS/SCSS/estilo inline do frontend (apps/web) — tokens de cor, tipografia e forma, e as regras de fidelidade ao protótipo do F.1. Complementa angular-component, que cobre arquitetura, não aparência.
---

# Design visual do AI Researcher

A fonte de verdade visual é o protótipo do F.1, exportado do Claude Design:
`docs/design/prototype/ai-researcher-chat.dc.html` (e `design-tokens-used.md`, que documenta a origem de cada token). Esta skill não repete a marcação do protótipo — ela traduz o que já foi decidido lá em tokens e regras para o código Angular. Em caso de dúvida sobre como algo deve se comportar visualmente, abra o `.dc.html` antes de inventar.

## Tokens

Nunca use um hex, nome de fonte ou valor de px direto no template ou no SCSS de um componente — sempre a variável. Declare estes tokens como custom properties CSS globais (`apps/web/src/styles.scss`) na primeira vez que um componente precisar deles; não hardcode em cada componente.

### Cor

| Token | Valor | Papel |
|---|---|---|
| `--bg` | `#080909` | fundo geral |
| `--surface` | `#141517` | nav, card de mensagem do assistente, sidebar do pipeline |
| `--surface-2` | `#1c1e21` | faixa de disclaimer, bolha do usuário, input, painel de citação |
| `--border` | `#2b2e32` | divisórias, bordas de card/input, linha do timeline |
| `--text` | `#f2f3f4` | texto principal |
| `--text-muted` | `#95999e` | legendas, labels secundárias, disclaimer |
| `--cyan` | `#14fefe` | accent — ícones, links, citações, estado "em execução"/"concluído" |
| `--cyan-dim` | `#0d8f8f` | bordas sutis em accent |
| `--cyan-tint` | `rgba(20,254,254,0.1)` | fundo tintado de estado ativo/fallback |
| `--lime` | `#a3ea1f` | **só** o botão primário "Enviar" |

**Regra de domínio, não só de estilo:** `--cyan` é a única cor de estado (pendente/em execução/concluído/fallback) do painel do grafo e das citações. Nunca use verde ou vermelho em dado financeiro, badge de variação ou estado do pipeline — o sistema informa, não recomenda, e uma seta ou pílula verde/vermelha em cima de um número lê como sinal de compra/venda. `--lime` existe só porque é a cor do CTA da UNIPDS; fica restrita ao único botão de ação, nunca em dado ou estado.

### Tipografia

| Token | Valor | Uso |
|---|---|---|
| `--font-display` | `"Anton", sans-serif` | **só** o wordmark "AI RESEARCHER" no header |
| `--font-body` | `"Poppins", sans-serif` | todo o resto |

Números monetários: `font-weight: 700` + `font-variant-numeric: tabular-nums`, sempre em `--text` (nunca em `--cyan` — accent é para interação, não para dado).

### Forma e espaçamento

Sem escala de tokens dedicada ainda — o protótipo usa valores diretos. Ao portar para Angular, mantenha as proporções observadas em vez de arredondar por conta própria:

- Raio: `6px` em botões/inputs, `8px` em painéis (citação, banner de fallback), `10px` nas bolhas de mensagem, `999px` (pill) em tags e citações, `50%` em avatares e círculos de etapa do pipeline.
- Espaçamento: `10–24px` para gaps e padding internos; densidade compacta, não arejada.
- Bordas de 1px em `--border` delimitam área, nunca `box-shadow` pesado.

## Padrões de componente

Cada linha aponta para onde o comportamento exato — estados, transições, markup — está definido no protótipo. Leia o trecho antes de implementar; não adivinhe o estado a partir só desta tabela.

| Componente | Estados que importam | Onde olhar no protótipo |
|---|---|---|
| Bolha de mensagem | usuário (direita, `surface-2`) vs. assistente (esquerda, `surface`, com avatar + label) | `ai-researcher-chat.dc.html`, bloco `displayMessages` |
| Texto em streaming | token a token; cursor piscando (`animation: blink`) enquanto `!done`; números em tabular-nums | mesmo arquivo, `visibleTokens` / `startReveal` |
| Citação inline | pílula `[n]`: borda `cyan-dim` parada, preenchida em `cyan` quando aberta, tinta `cyan-tint` no hover | `tok.isCite`, `toggleCitation` |
| Painel de fonte da citação | abre inline sob o parágrafo, não em popover/modal; mostra data-base e origem lado a lado, link "Abrir documento original" | `msg.hasOpenCitation` |
| Painel do pipeline | 4 etapas (`retrieve`, `grade`, `search`, `answer`) em timeline vertical; círculo com ícone por estado (pendente = contorno, em execução = anel girando, concluído = check); tag de status ao lado do nome | `stepStyle()`, `STEP_KEYS` |
| Banner de fallback | só aparece quando `search` deixa de estar pendente; mesma paleta `cyan-tint`/`cyan-dim` do resto — fallback não é erro, é um caminho normal do grafo | `fallbackActive` |
| Faixa de disclaimer | sempre visível, entre o header e a lista de mensagens; nunca em modal dispensável | bloco logo após `<nav>` |
| Botão "Enviar" | `--lime` sólido quando há texto no input, `surface-2`/`text-muted` e `cursor: default` quando vazio — nunca cinza-desabilitado genérico | `sendBtnStyle` |

## Ícones

Contorno (`stroke`, sem preenchimento), `stroke-width` entre 1.6 e 2, cantos arredondados (`stroke-linecap="round"`). O protótipo usa SVG inline, não uma biblioteca de ícones — siga o mesmo padrão visual se adicionar um ícone novo (não precisa ser Phosphor; o design system Nocturne usa Phosphor, mas este não é o Nocturne).

## Duas variantes existem — use a certa

`docs/design/prototype/` tem `ai-researcher-chat.dc.html` (canônica, tokens acima) e `ai-researcher-chat-nocturne.dc.html` (skin alternativa do design system Nocturne, roxo/Inter). Os componentes Angular seguem a **canônica**. A variante Nocturne fica versionada só como referência — não misture os dois vocabulários de token num mesmo componente.
