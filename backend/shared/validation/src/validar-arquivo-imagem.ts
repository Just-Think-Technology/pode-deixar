import { BadRequestException } from '@nestjs/common';
import { extname } from 'path';

// Extensões permitidas para upload de imagem (minúsculas, com ponto).
const EXTENSOES_PERMITIDAS = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.gif',
]);

// Extensões esperadas para cada tipo detectado pelos magic bytes.
const EXTENSOES_POR_TIPO: Record<string, string[]> = {
  jpeg: ['.jpg', '.jpeg'],
  png: ['.png'],
  webp: ['.webp'],
  gif: ['.gif'],
};

// Detecta o tipo real do arquivo pelos magic bytes (não confia no
// mimetype/extensão enviados pelo cliente, que são falsificáveis).
function detectarTipoPorMagicBytes(
  buffer: Buffer,
): 'jpeg' | 'png' | 'webp' | 'gif' | null {
  if (!buffer || buffer.length < 3) {
    return null;
  }
  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'jpeg';
  }
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return 'png';
  }
  // GIF87a / GIF89a
  if (
    buffer.length >= 6 &&
    buffer[0] === 0x47 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x38 &&
    (buffer[4] === 0x37 || buffer[4] === 0x39) &&
    buffer[5] === 0x61
  ) {
    return 'gif';
  }
  // WebP: "RIFF" + 4 bytes de tamanho + "WEBP"
  if (
    buffer.length >= 12 &&
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return 'webp';
  }
  return null;
}

// Valida extensão (allowlist) e conteúdo real (magic bytes) do arquivo.
// Rejeita quando a extensão não é permitida, o conteúdo não é uma imagem
// suportada ou o conteúdo não corresponde à extensão informada.
export function validarArquivoImagem(
  originalname: string,
  buffer: Buffer,
): void {
  const ext = extname(originalname || '').toLowerCase();
  if (!EXTENSOES_PERMITIDAS.has(ext)) {
    throw new BadRequestException(
      'Formato de imagem inválido. Permitidos: JPEG, PNG, WebP, GIF',
    );
  }
  const tipo = detectarTipoPorMagicBytes(buffer);
  // Seguro: chave é a união validada retornada pela detecção de magic bytes.
  // eslint-disable-next-line security/detect-object-injection
  if (!tipo || !EXTENSOES_POR_TIPO[tipo].includes(ext)) {
    throw new BadRequestException(
      'Conteúdo do arquivo não corresponde a uma imagem válida',
    );
  }
}
