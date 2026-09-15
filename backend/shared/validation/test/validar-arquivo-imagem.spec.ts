// Image validation tests — file type and content checks

import { BadRequestException } from '@nestjs/common';
import { validarArquivoImagem } from '../index';

// Valid 1x1 PNG (real magic bytes).
const PNG_REAL = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
]);

// --- Tests ---

describe('validarArquivoImagem', () => {
  it('aceita imagem com extensão permitida e magic bytes correspondentes', () => {
    expect(() => validarArquivoImagem('foto.png', PNG_REAL)).not.toThrow();
  });

  it('rejeita extensão fora da allowlist', () => {
    expect(() => validarArquivoImagem('foto.svg', PNG_REAL)).toThrow(
      BadRequestException,
    );
    expect(() => validarArquivoImagem('foto.svg', PNG_REAL)).toThrow(
      'Formato de imagem inválido',
    );
  });

  it('rejeita conteúdo falso com extensão válida', () => {
    expect(() =>
      validarArquivoImagem('foto.png', Buffer.from('fake-content')),
    ).toThrow('Conteúdo do arquivo não corresponde a uma imagem válida');
  });

  it('rejeita magic bytes que não correspondem à extensão', () => {
    expect(() => validarArquivoImagem('foto.jpg', PNG_REAL)).toThrow(
      BadRequestException,
    );
  });

  it('rejeita buffer vazio', () => {
    expect(() =>
      validarArquivoImagem('foto.png', Buffer.alloc(0)),
    ).toThrow(BadRequestException);
  });
});
