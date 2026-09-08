import { HttpException, HttpStatus } from "@nestjs/common";
import { GlobalExceptionFilter } from "../src/global-exception.filter";

function montarHost(url = "/recurso", method = "GET") {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const host = {
    switchToHttp: () => ({
      getResponse: () => ({ status }),
      getRequest: () => ({ url, method }),
    }),
  } as never;
  return { host, status, json };
}

describe("GlobalExceptionFilter", () => {
  it("responde HttpException com mensagem string", () => {
    const filtro = new GlobalExceptionFilter();
    const { host, status, json } = montarHost();
    filtro.catch(new HttpException("Não encontrado", 404), host);
    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 404, message: "Não encontrado" }),
    );
  });

  it("responde HttpException com vetor de erros", () => {
    const filtro = new GlobalExceptionFilter();
    const { host, status, json } = montarHost("/x", "POST");
    filtro.catch(
      new HttpException(
        { message: ["campo inválido", "outro erro"], error: "Bad Request" },
        400,
      ),
      host,
    );
    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        errors: ["campo inválido", "outro erro"],
      }),
    );
  });

  it("mapeia P2002 para 409 sem expor detalhe interno", () => {
    const filtro = new GlobalExceptionFilter();
    const { host, status, json } = montarHost();
    const erro = Object.assign(
      new Error("Unique constraint failed on the fields: (`email`)"),
      { code: "P2002" },
    );
    filtro.catch(erro, host);
    expect(status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Registro já existe" }),
    );
    expect(JSON.stringify(json.mock.calls[0][0])).not.toContain("email");
  });

  it("mascara erro desconhecido como 500 genérico", () => {
    const filtro = new GlobalExceptionFilter();
    const { host, status, json } = montarHost();
    filtro.catch(new Error("segredo interno do banco"), host);
    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Erro interno do servidor" }),
    );
    expect(JSON.stringify(json.mock.calls[0][0])).not.toContain(
      "segredo interno",
    );
  });
});
