import { ValidationError } from 'class-validator';

export type FieldLabels = Record<string, string>;
export type ConstraintMessages = Record<string, (label: string) => string>;

// Canonical constraint-message table (class-validator). Union of the tables
// previously duplicated across the 5 app.modules: keys missing in one service
// fall back to the original message, as before — no behavior change.
export const DEFAULT_CONSTRAINT_MESSAGES: ConstraintMessages = {
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

// Translates ValidationPipe errors to Portuguese messages. `overrides` lets a
// service keep divergent messages (e.g. auth minLength); keys without a
// translator keep the original class-validator message.
export function translateValidationErrors(
  errors: ValidationError[],
  labels: FieldLabels,
  overrides: ConstraintMessages = {},
): string[] {
  const messages = { ...DEFAULT_CONSTRAINT_MESSAGES, ...overrides };
  return errors.map((error) => {
    if (!error.constraints)
      return `${labels[error.property] || error.property} inválido`;
    return Object.entries(error.constraints)
      .map(([key, msg]) => {
        // Safe: keys come from class-validator's fixed constraint names.
        // eslint-disable-next-line security/detect-object-injection
        const translator = messages[key];
        return translator
          ? translator(labels[error.property] || error.property)
          : msg;
      })
      .join('; ');
  });
}
