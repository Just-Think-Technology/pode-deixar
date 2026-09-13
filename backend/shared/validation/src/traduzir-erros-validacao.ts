// Validation error translator — Portuguese constraint messages

import { ValidationError } from 'class-validator';

export type RotulosCampos = Record<string, string>;
export type MensagensRestricao = Record<string, (rotulo: string) => string>;

// Canonical table of constraint messages (class-validator). It is the union
// of the tables previously duplicated across the 5 app.modules: missing
// keys in a service fall back to the original message, as before — without
// changing behavior.
export const MENSAGENS_RESTRICAO_PADRAO: MensagensRestricao = {
  isString: (r) => `${r} deve ser uma string`,
  isNotEmpty: (r) => `${r} não pode estar vazio`,
  isEmail: (r) => `${r} deve ser um email válido`,
  isNumber: (r) => `${r} deve ser um número`,
  isBoolean: (r) => `${r} deve ser verdadeiro ou falso`,
  isInt: (r) => `${r} deve ser um número inteiro`,
  isPositive: (r) => `${r} deve ser um número positivo`,
  isUrl: (r) => `${r} deve ser uma URL válida`,
  isEnum: (r) => `${r} deve ser um valor válido`,
  isArray: (r) => `${r} deve ser uma lista`,
  isUuid: (r) => `${r} deve ser um UUID válido`,
  min: (r) => `${r} não pode ser menor que 0`,
  max: (r) => `${r} não pode ser maior que o limite`,
  minLength: (r) => `${r} deve ter no mínimo 3 caracteres`,
  maxLength: (r) => `${r} está muito longo`,
  matches: (r) => `${r} contém caracteres inválidos`,
};

// Translate ValidationPipe errors to Portuguese messages. `overrides` allows
// the service to keep divergent messages (e.g.: minLength of auth);
// keys without a translator keep the original class-validator message.
export function traduzirErrosValidacao(
  errors: ValidationError[],
  rotulos: RotulosCampos,
  sobrescritas: MensagensRestricao = {},
): string[] {
  const mensagens = { ...MENSAGENS_RESTRICAO_PADRAO, ...sobrescritas };
  return errors.map((error) => {
    if (!error.constraints)
      return `${rotulos[error.property] || error.property} inválido`;
    return Object.entries(error.constraints)
      .map(([chave, msg]) => {
        // Safe: keys come from the fixed names of class-validator constraint.
        // eslint-disable-next-line security/detect-object-injection
        const tradutor = mensagens[chave];
        return tradutor
          ? tradutor(rotulos[error.property] || error.property)
          : msg;
      })
      .join('; ');
  });
}
