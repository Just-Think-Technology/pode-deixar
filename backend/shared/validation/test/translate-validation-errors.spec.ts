import { ValidationError } from 'class-validator';
import {
  translateValidationErrors,
  DEFAULT_CONSTRAINT_MESSAGES,
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

describe('translateValidationErrors', () => {
  it('retorna "<rótulo> inválido" quando não há constraints', () => {
    expect(translateValidationErrors([erro('email')], { email: 'Email' })).toEqual([
      'Email inválido',
    ]);
  });

  it('usa a propriedade quando não há rótulo', () => {
    expect(translateValidationErrors([erro('xyz')], {})).toEqual(['xyz inválido']);
  });

  it('traduz chaves conhecidas com o rótulo do campo', () => {
    const out = translateValidationErrors(
      [erro('password', { minLength: 'original', isString: 'original' })],
      { password: 'Senha' },
    );
    expect(out).toEqual([
      'Senha deve ter no mínimo 3 caracteres; Senha deve ser uma string',
    ]);
  });

  it('mantém a mensagem original em chaves sem tradutor', () => {
    const out = translateValidationErrors(
      [erro('code', { isChaveInexistente: 'mensagem original' })],
      {},
    );
    expect(out).toEqual(['mensagem original']);
  });

  it('sobrescritas do serviço vencem o padrão (ex.: minLength do auth)', () => {
    const out = translateValidationErrors(
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
      expect(typeof DEFAULT_CONSTRAINT_MESSAGES[chave]).toBe('function');
    }
  });
});
