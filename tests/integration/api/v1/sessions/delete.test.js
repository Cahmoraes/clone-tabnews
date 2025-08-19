import session from "models/session";
import orchestrator from "tests/orchestrator";
import setCookieParser from "set-cookie-parser";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("DELETE /api/v1/sessions", () => {
  describe("Default user", () => {
    test("With nonexistent session", async () => {
      const nonExistentToken =
        "fb69e9783b593d2bf27494a8d177cd4e4a232222ae67f85f9531a1b44075da9e7a228323261d085360c426a163d5a831";
      const response = await fetch("http://localhost:3000/api/v1/sessions", {
        method: "DELETE",
        headers: {
          Cookie: `session_id=${nonExistentToken}`,
        },
      });
      expect(response.status).toBe(401);
    });

    test("With expired session", async () => {
      vi.useFakeTimers({
        now: new Date(Date.now() - session.EXPIRATION_IN_MILLISECONDS),
      });
      const createdUser = await orchestrator.createUser();
      const sessionObject = await orchestrator.createSession(createdUser.id);
      vi.useRealTimers();
      const response = await fetch("http://localhost:3000/api/v1/sessions", {
        method: "delete",
        headers: {
          Cookie: `session_id=${sessionObject.token}`,
        },
      });
      expect(response.status).toBe(401);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "UnauthorizedError",
        action: "Verifique se este usuário está logado e tente novamente.",
        message: "Usuário não possui sessão ativa.",
        status_code: 401,
      });
    });

    test("With valid session", async () => {
      const createdUser = await orchestrator.createUser();
      const sessionObject = await orchestrator.createSession(createdUser.id);
      const response = await fetch("http://localhost:3000/api/v1/sessions", {
        method: "delete",
        headers: {
          Cookie: `session_id=${sessionObject.token}`,
        },
      });
      expect(response.status).toBe(200);
      const responseBody = await response.json();
      expect(responseBody).toMatchObject({
        id: sessionObject.id,
        token: sessionObject.token,
        user_id: sessionObject.user_id,
      });
      expect(
        responseBody.expires_at < sessionObject.expires_at.toISOString(),
      ).toBe(true);
      expect(responseBody.updated_at > sessionObject.updated_at.toISOString());
      // Set-Cookie assertions
      const parsedSetCookie = setCookieParser(response, {
        map: true,
      });
      expect(parsedSetCookie.session_id).toEqual({
        name: "session_id",
        value: "invalid",
        maxAge: -1,
        path: "/",
        httpOnly: true,
      });
      // Double check assertions
      const doubleCheckResponse = await fetch(
        "http://localhost:3000/api/v1/user",
        {
          headers: {
            Cookie: `session_id=${sessionObject.token}`,
          },
        },
      );
      expect(doubleCheckResponse.status).toBe(401);
    });
  });
});
