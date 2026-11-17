import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { documentosArraySchema, type Documento } from './documento.js';

export function lerDocumentos(dir: string): Documento[] {
  const arquivos = readdirSync(dir).filter((arquivo) => arquivo.endsWith('.json'));

  return arquivos.flatMap((arquivo) => {
    const conteudo = JSON.parse(readFileSync(path.join(dir, arquivo), 'utf-8'));
    return documentosArraySchema.parse(conteudo);
  });
}
