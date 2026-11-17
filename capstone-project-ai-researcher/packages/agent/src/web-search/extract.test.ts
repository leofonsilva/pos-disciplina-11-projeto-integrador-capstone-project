import { describe, expect, it } from 'vitest';

import { extrairTexto } from './extract.js';

describe('extrairTexto', () => {
  it('extrai o texto legível e descarta tags de marcação', () => {
    const html = `
      <html>
        <body>
          <nav><a href="/x">Menu</a></nav>
          <article>
            <h1>Vale anuncia novo projeto</h1>
            <p>A Vale anunciou hoje um novo projeto de expansão em Carajás.</p>
          </article>
        </body>
      </html>
    `;

    const texto = extrairTexto(html);

    expect(texto.toLowerCase()).toContain('vale anuncia novo projeto');
    expect(texto).toContain('A Vale anunciou hoje um novo projeto de expansão em Carajás.');
    expect(texto).not.toContain('<p>');
  });

  it('devolve string vazia pra HTML sem conteúdo de texto', () => {
    expect(extrairTexto('<html><body><img src="x.png"/></body></html>')).toBe('');
  });
});
