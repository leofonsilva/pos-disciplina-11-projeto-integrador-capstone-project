import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { buscarPagina as buscarPaginaReal } from './extract.js';
import { criarBuscarPagina, criarSearchProviderFixture } from './fixtures.js';

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe('criarSearchProviderFixture', () => {
  it('casa a fixture pelo ticker/nome da empresa, sem depender de rede', async () => {
    const provider = criarSearchProviderFixture();

    const resultados = await provider.search('Por que a receita da Vale caiu no 1T26?');

    expect(resultados).toHaveLength(1);
    expect(resultados[0].url).toContain('vale.com');
  });

  it('a busca é case-insensitive', async () => {
    const provider = criarSearchProviderFixture();

    const resultados = await provider.search('VALE anunciou algo recente?');

    expect(resultados[0].url).toContain('vale.com');
  });

  it('cai na fixture genérica quando nenhuma palavra-chave bate', async () => {
    const provider = criarSearchProviderFixture();

    const resultados = await provider.search('pergunta sem nenhuma empresa conhecida');

    expect(resultados[0].url).toBe('https://example.com/demo-sem-fixture');
  });
});

describe('criarBuscarPagina', () => {
  beforeEach(() => {
    delete process.env.DEMO;
  });

  it('com DEMO=true, devolve a página fixture correspondente à URL', async () => {
    process.env.DEMO = 'true';
    const buscarPagina = criarBuscarPagina();

    const html = await buscarPagina('https://vale.com/noticias/vale-explica-queda-receita-1t26');

    expect(html).toContain('Vale explica queda na receita do 1T26');
  });

  it('com DEMO=true, cai na página genérica pra URL desconhecida', async () => {
    process.env.DEMO = 'true';
    const buscarPagina = criarBuscarPagina();

    const html = await buscarPagina('https://nao-existe.example.com/pagina');

    expect(html).toContain('Modo demo');
  });

  it('sem DEMO=true, devolve a função real (que faz fetch de verdade)', () => {
    expect(process.env.DEMO).toBeUndefined();

    // Compara identidade, sem invocar — a real faz fetch de rede, não roda em teste.
    expect(criarBuscarPagina()).toBe(buscarPaginaReal);
  });
});
