import orchestrator from "tests/orchestrator";
import { version as uuidVersion } from "uuid";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("GET /api/v1/users/[username]", () => {
  describe("Anonymous user", () => {
    test("With exact case match", async () => {
      const response1 = await fetch("http://localhost:3000/api/v1/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: "MesmoCase",
          email: "mesmo.case@curso.dev",
          password: "senha123",
        }),
      });
      expect(response1.status).toBe(201);
      const response2 = await fetch(
        "http://localhost:3000/api/v1/users/MesmoCase",
      );
      expect(response2.status).toBe(200);
      const response2Body = await response2.json();
      expect(response2Body).toEqual({
        id: response2Body.id,
        email: "mesmo.case@curso.dev",
        password: "senha123",
        username: "MesmoCase",
        created_at: response2Body.created_at,
        updated_at: response2Body.updated_at,
      });
      expect(uuidVersion(response2Body.id)).toBe(4);
      expect(Date.parse(response2Body.created_at)).not.toBeNaN();
      expect(Date.parse(response2Body.updated_at)).not.toBeNaN();
    });

    test("With case mismatch", async () => {
      const response1 = await fetch("http://localhost:3000/api/v1/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: "CaseDiferente",
          email: "case.diferente@curso.dev",
          password: "senha123",
        }),
      });
      expect(response1.status).toBe(201);
      const response2 = await fetch(
        "http://localhost:3000/api/v1/users/casediferente",
      );
      expect(response2.status).toBe(200);
      const response2Body = await response2.json();
      expect(response2Body).toEqual({
        id: response2Body.id,
        email: "case.diferente@curso.dev",
        password: "senha123",
        username: "CaseDiferente",
        created_at: response2Body.created_at,
        updated_at: response2Body.updated_at,
      });
      expect(uuidVersion(response2Body.id)).toBe(4);
      expect(Date.parse(response2Body.created_at)).not.toBeNaN();
      expect(Date.parse(response2Body.updated_at)).not.toBeNaN();
    });

    test("With nonexisting username", async () => {
      const response = await fetch(
        "http://localhost:3000/api/v1/users/UsuarioInexistente",
      );
      expect(response.status).toBe(404);
      const response2Body = await response.json();
      expect(response2Body).toEqual({
        name: "NotFoundError",
        message: "O username informado não foi encontrado no sistema.",
        action: "Verifique se o username esta digitado corretamente.",
        status_code: 404,
      });
    });
  });
});
