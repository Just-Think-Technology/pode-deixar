import { ValidationError } from 'class-validator';

export type RotulosCampos = Record<string, string>;
export type MensagensRestricao = Record<string, (rotulo: string) => string>;

// Tabela canônica de mensagens de restrição (class-validator). É a união das
// tabelas antes duplicadas nos 5 app.modules: chaves ausentes num serviço
// caem no fallback da mensagem original, como antes — sem mudar comportamento.
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

// Traduz erros do ValidationPipe para mensagens em português. `sobrescritas`
// permite ao serviço manter mensagens divergentes (ex.: minLength do auth);
// chaves sem tradutor mantêm a mensagem original do class-validator.
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
        // Seguro: chaves vêm dos nomes fixos de restrição do class-validator.
        // eslint-disable-next-line security/detect-object-injection
        const tradutor = mensagens[chave];
        return tradutor
          ? tradutor(rotulos[error.property] || error.property)
          : msg;
      })
      .join('; ');
  });
}
