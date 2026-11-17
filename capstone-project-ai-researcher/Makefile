.PHONY: destroy

# Remove os recursos GCP do Bloco A, Cloud SQL primeiro (H.2) — pede confirmação interativa.
# Lógica em scripts/destroy.ts, não aqui: mesmo padrão de scripts/rollback.ts e
# scripts/grafana-apply-*.ts, um script TS por operação, o Makefile só é a porta de entrada
# que o critério do H.2 pede ("make destroy").
destroy:
	pnpm destroy
