// Image file validator — extension and magic-byte checks

import { BadRequestException } from '@nestjs/common';
import { extname } from 'path';

// Allowed extensions for image upload (lowercase, with dot).
const EXTENSOES_PERMITIDAS = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.gif',
]);

// Expected extensions for each type detected by magic bytes.
const EXTENSOES_POR_TIPO: Record<string, string[]> = {
  jpeg: ['.jpg', '.jpeg'],
  png: ['.png'],
  webp: ['.webp'],
  gif: ['.gif'],
};

// Client-supplied mimetype/extension are forgeable, so sniff the real type.
function detectarTipoPorMagicBytes(
  buffer: Buffer,
): 'jpeg' | 'png' | 'webp' | 'gif' | null {
  if (!buffer || buffer.length < 3) {
    return null;
  }
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'jpeg';
  }
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

// Validate file extension (allowlist) and real content (magic bytes).
// Rejects when the extension is not allowed, the content is not a supported
// image, or the content does not match the informed extension.
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
  // Safe: the key is the validated union returned by magic bytes detection.
  // eslint-disable-next-line security/detect-object-injection
  if (!tipo || !EXTENSOES_POR_TIPO[tipo].includes(ext)) {
    throw new BadRequestException(
      'Conteúdo do arquivo não corresponde a uma imagem válida',
    );
  }
}
