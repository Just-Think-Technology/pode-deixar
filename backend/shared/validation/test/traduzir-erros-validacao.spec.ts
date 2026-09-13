// Error translation tests — Portuguese validation messages

import { ValidationError } from 'class-validator';
import {
  traduzirErrosValidacao,
  MENSAGENS_RESTRICAO_PADRAO,
} from '../index';

function erro(
  property: string,
  constraints?: Record<string, string>,
): ValidationError {
  const e = new ValidationError();
  e.property = property;
  e.constraints = constraints;
  return e;
}

// --- Tests ---

describe('traduzirErrosValidacao', () => {
  it('retorna "<rótulo> inválido" quando não há constraints', () => {
    expect(traduzirErrosValidacao([erro('email')], { email: 'Email' })).toEqual([
      'Email inválido',
    ]);
  });

  it('usa a propriedade quando não há rótulo', () => {
    expect(traduzirErrosValidacao([erro('xyz')], {})).toEqual(['xyz inválido']);
  });

  it('traduz chaves conhecidas com o rótulo do campo', () => {
    const out = traduzirErrosValidacao(
      [erro('password', { minLength: 'original', isString: 'original' })],
      { password: 'Senha' },
    );
    expect(out).toEqual([
      'Senha deve ter no mínimo 3 caracteres; Senha deve ser uma string',
    ]);
  });

  it('mantém a mensagem original em chaves sem tradutor', () => {
    const out = traduzirErrosValidacao(
      [erro('code', { isChaveInexistente: 'mensagem original' })],
      {},
    );
    expect(out).toEqual(['mensagem original']);
  });

  it('sobrescritas do serviço vencem o padrão (ex.: minLength do auth)', () => {
    const out = traduzirErrosValidacao(
      [erro('password', { minLength: 'x', maxLength: 'y' })],
      { password: 'Senha' },
      {
        minLength: (r) => `${r} deve ter no mínimo 8 caracteres`,
        maxLength: (r) => `${r} deve ter no máximo 200 caracteres`,
      },
    );
    expect(out).toEqual([
      'Senha deve ter no mínimo 8 caracteres; Senha deve ter no máximo 200 caracteres',
    ]);
  });

  it('expõe a tabela padrão com as chaves da união dos serviços', () => {
    for (const chave of [
      'isString',
      'isNotEmpty',
      'isEmail',
      'isNumber',
      'isBoolean',
      'isInt',
      'isPositive',
      'isUrl',
      'isEnum',
      'isArray',
      'isUuid',
      'min',
      'max',
      'minLength',
      'maxLength',
      'matches',
    ]) {
      expect(typeof MENSAGENS_RESTRICAO_PADRAO[chave]).toBe('function');
    }
  });
});
