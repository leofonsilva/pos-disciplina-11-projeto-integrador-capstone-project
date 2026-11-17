import { convert } from 'html-to-text';

// Determinístico — HTML entra, texto sai. Sem chamada de rede, testável sem fixture.
export function extrairTexto(html: string): string {
  return convert(html, {
    wordwrap: false,
    selectors: [
      { selector: 'a', options: { ignoreHref: true } },
      { selector: 'img', format: 'skip' },
    ],
  }).trim();
}

const TIMEOUT_MS = 10_000;

export async function buscarPagina(url: string): Promise<string> {
  const response = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });

  if (!response.ok) {
    throw new Error(`Falha ao buscar ${url}: HTTP ${response.status}`);
  }

  return response.text();
}
