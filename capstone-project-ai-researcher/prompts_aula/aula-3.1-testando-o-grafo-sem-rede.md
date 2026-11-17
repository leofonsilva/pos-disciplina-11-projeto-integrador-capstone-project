# Aula 3.1 — Testando o grafo sem rede

## Cena 5 — Testes do coletor CVM

Terminal na raiz do repositório.

```text
O parser do coletor CVM (packages/corpus/src/collect/parse-csv.ts) não tem nenhum teste — os CSVs da CVM vêm em ISO-8859-1, não UTF-8, e preciso confirmar que a decodificação de acento funciona de verdade, com uma fixture de bytes latin1 reais, não uma string reescrita em UTF-8. Também cobre select-quarters.ts — é o arquivo mais frágil do coletor (posição de conta por setor, fallback consolidado/individual, seleção de versão retificada, subtração YTD do 4º trimestre, matemática de data incluindo ano bissexto) e hoje não tem nenhum teste. Exporte só o necessário pra testar as funções puras, sem mudar comportamento nenhum.
```

## Cena 8 — Fixtures de busca web + `DEMO=true`

```text
Preciso gravar uma demonstração do fallback de busca web sem depender do Serper estar no ar. Cria fixtures pro SearchProvider e pro fetch de página, cobrindo pelo menos três perguntas reais do grupo B do evals/dataset.json (Vale, Petrobras, Klabin), casando por substring do ticker ou nome da empresa na query — pergunta sem fixture cadastrada cai numa fixture genérica, nunca lança erro. Isso deve ligar numa variável de ambiente DEMO=true, lida num único lugar por dependência, sem o SearchProvider real ou o buscarPagina real saberem que o modo demo existe. grade, answer e os embeddings continuam batendo na Vertex AI de verdade — o escopo é só busca web.
```
