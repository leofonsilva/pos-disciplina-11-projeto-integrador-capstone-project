import { expect, test } from '@playwright/test';

// Caminho feliz de ponta a ponta (F.7): Angular real, servido pelo dev server, conversando
// com apps/api real via SSE — não um mock de rota. O que torna isso reproduzível em CI é
// DEMO=true (playwright.config.ts, webServer), que tira Postgres e Vertex AI da equação sem
// tirar o grafo do caminho: retrieve/grade/answer rodam de verdade, só as chamadas externas é
// que são fixture (packages/agent/src/llm-demo.ts, db/retrieve-demo.ts).
test('pergunta, recebe a resposta em streaming com citação, e o painel do grafo conclui as etapas', async ({
  page,
}) => {
  await page.goto('/');

  await expect(page).toHaveTitle('AI Researcher');
  await expect(page.locator('.chat__disclaimer')).toContainText(
    'Este assistente apresenta informações públicas, não recomendação de investimento.',
  );

  const pergunta = 'Qual foi a receita líquida da Vale no 3T25?';
  await page.locator('.chat__input').fill(pergunta);
  await page.locator('.chat__send').click();

  await expect(page.locator('.bubble--user')).toHaveText(pergunta);

  const respostaFinal = page.locator('.bubble--assistant').last();
  await expect(respostaFinal).toContainText('R$ 56,7 bilhões', { timeout: 15_000 });
  // O streaming termina — o cursor some quando a mensagem está completa.
  await expect(respostaFinal.locator('.bubble__cursor')).toHaveCount(0);

  const citacao = respostaFinal.locator('.citation-pill');
  await expect(citacao).toHaveText('VALE (3T25)');
  await citacao.click();

  const painelCitacao = respostaFinal.locator('.citation-panel');
  await expect(painelCitacao).toContainText('2025-09-30');
  await expect(painelCitacao).toContainText('Base local (CVM)');
  await expect(painelCitacao.locator('.citation-panel__link')).toHaveAttribute(
    'href',
    'https://dados.cvm.gov.br/dados/CIA_ABERTA/DOC/ITR/DADOS/itr_cia_aberta_2025.zip',
  );

  // Contexto foi suficiente de primeira — o loop de fallback não deveria ter rodado.
  await expect(page.getByText('Search', { exact: true })).toHaveCount(0);
  const etapas = page.locator('.step');
  await expect(etapas).toHaveCount(3); // Retrieve, Grade, Answer
  await expect(page.getByText('Em execução')).toHaveCount(0);

  await expect(page.locator('.chat__disclaimer')).toBeVisible();
});
