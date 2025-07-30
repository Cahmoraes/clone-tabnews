import database from "infra/database";
import crypto from "node:crypto";

const EXPIRATION_IN_MILLISECONDS = 1000 * 60 * 60 * 24 * 30;
const NUMBER_OF_BYTES = 48;

async function create(userId) {
  try {
    const token = crypto.randomBytes(NUMBER_OF_BYTES).toString("hex");
    const expiresAt = new Date(Date.now() + EXPIRATION_IN_MILLISECONDS);
    const newSession = await runInsertQuery(token, userId, expiresAt);
    return newSession;
  } catch (e) {
    console.log(e);
  }

  async function runInsertQuery(token, userId, expiresAt) {
    const results = await database.query({
      text: `
        INSERT INTO
          sessions (token, user_id, expires_at)
        VALUES
          ($1, $2, $3)
        RETURNING
          *
      ;`,
      values: [token, userId, expiresAt],
    });
    return results.rows[0];
  }
}

const session = {
  create,
  EXPIRATION_IN_MILLISECONDS,
};

export default session;
