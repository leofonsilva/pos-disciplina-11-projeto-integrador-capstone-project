# Aula 1.5 — Corpus CVM

## Cena 3 — Criar o pacote `packages/corpus`

Terminal na raiz do repositório, branch `starter`.

```text
Crie o pacote packages/corpus. Ele lê a lista de 20 empresas da B3 em data/empresas.csv (ticker, razão social, código CVM, setor), baixa os arquivos ITR e DFP mais recentes direto de dados.cvm.gov.br, e extrai de cada um dos últimos 4 trimestres: receita líquida, lucro bruto, lucro líquido, ativo total, patrimônio líquido e caixa operacional. A CVM publica em milhares de reais — normalize para reais. Gere um arquivo JSON por empresa em data/documentos/{TICKER}.json, um item por trimestre, cada um com um parágrafo de texto gerado por template determinístico — nunca por LLM. Cada documento precisa ter ticker, company_name, setor, period, period_end, source_url e fetched_at.
```
