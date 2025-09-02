import { email } from "infra/email";
import orchestrator from "tests/orchestrator";

describe("infra/email.js", () => {
  beforeAll(async () => {
    await orchestrator.waitForAllServices();
  });

  test("send()", async () => {
    await orchestrator.deleteAllEmails();
    await email.send({
      from: "FinTab <contato@fintab.com.br>",
      to: "contato@curso.dev",
      subject: "Teste de assunto",
      text: "Teste de corpo.",
    });
    await email.send({
      from: "FinTab <contato@fintab.com.br>",
      to: "contato@curso.dev",
      subject: "Último e-mail enviado",
      text: "Corpo do último e-mail.",
    });
    const lastEmail = await orchestrator.getLastEmail();
    expect(lastEmail.sender).toBe("<contato@fintab.com.br>");
    expect(lastEmail.recipients[0]).toBe("<contato@curso.dev>");
    expect(lastEmail.subject).toBe("Último e-mail enviado");
    expect(lastEmail.text).toBe("Corpo do último e-mail.\r\n");
  });
});
