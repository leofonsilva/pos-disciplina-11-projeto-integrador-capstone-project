import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';

const TAMANHO_CHUNK = 1000;
const SOBREPOSICAO_CHUNK = 100;

export async function dividirEmChunks(texto: string): Promise<string[]> {
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: TAMANHO_CHUNK,
    chunkOverlap: SOBREPOSICAO_CHUNK,
  });

  return splitter.splitText(texto);
}
