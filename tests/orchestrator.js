import retry from "async-retry";
import database from "infra/database";
import migrator from "models/migrator";
import user from "models/user";
import { faker } from "@faker-js/faker";
import session from "models/session";

const EMAIL_HTTP_URL = `http://${process.env.EMAIL_HTTP_HOST}:${process.env.EMAIL_HTTP_PORT}`;

async function waitForAllServices() {
  await waitForWebServer();
  await waitForEmailServer();

  async function waitForWebServer() {
    return retry(fetchStatusPage, {
      retries: 100,
      maxTimeout: 1000,
    });

    async function fetchStatusPage() {
      const response = await fetch("http://localhost:3000/api/v1/status");
      if (response.status !== 200) throw new Error();
    }
  }

  async function waitForEmailServer() {
    return retry(fetchEmailPage, {
      retries: 100,
      maxTimeout: 1000,
    });

    async function fetchEmailPage() {
      const response = await fetch(EMAIL_HTTP_URL);
      if (response.status !== 200) throw new Error();
    }
  }
}

/**
 * Drop and recreate the "public" schema on the connected database.
 *
 * This is a destructive operation intended for test/orchestration environments:
 * it removes all objects (tables, sequences, functions, types, etc.) in the
 * "public" schema and then creates a fresh, empty "public" schema.
 *
 * Use with caution — do not run against production databases.
 *
 * @async
 * @function clearDatabase
 * @returns {Promise<void>} Resolves when the schema has been dropped and recreated.
 * @throws {Error} If the underlying database query fails.
 */
async function clearDatabase() {
  await database.query("drop schema public cascade; create schema public;");
}

/**
 * Runs all pending migrations using the configured migrator.
 *
 * This asynchronous helper delegates to `migrator.runPendingMigrations()` and
 * resolves when all pending migrations have been executed. Running this may
 * modify the application's persistent state (for example, database schema or data).
 *
 * @async
 * @function runPendingMigrations
 * @returns {Promise<void>} Resolves when migrations complete.
 * @throws {Error} If migration execution fails, the promise will reject with the underlying error.
 *
 * @example
 * // Ensure migrations are applied before starting the app
 * await runPendingMigrations();
 */
async function runPendingMigrations() {
  await migrator.runPendingMigrations();
}

/**
 * Creates a user with provided information or generates random values for missing properties.
 *
 * @param {Object} userObject - The user data object
 * @param {string} [userObject.username] - Username for the new user (auto-generated if omitted)
 * @param {string} [userObject.email] - Email for the new user (auto-generated if omitted)
 * @param {string} [userObject.password='validPassword'] - Password for the new user
 *
 * @returns {Promise<Object>} A promise that resolves to the created user object
 */
async function createUser(userObject = {}) {
  return user.create({
    username:
      userObject.username ?? faker.internet.username().replace(/[_.-]/g, ""),
    email: userObject.email ?? faker.internet.email(),
    password: userObject.password ?? "validPassword",
  });
}

/**
 * Creates a new session for a given user
 * @param {string} userId - The ID of the user for whom to create a session
 * @returns {Promise<Object>} A promise that resolves to the created session object
 */
async function createSession(userId) {
  return session.create(userId);
}

/**
 * Sends an HTTP DELETE request to the configured email service to remove all messages.
 *
 * The target host and port are read from the EMAIL_HTTP_HOST and EMAIL_HTTP_PORT environment variables,
 * and the request is made to the /messages endpoint (http://{host}:{port}/messages).
 *
 * The function awaits the fetch call and resolves when the HTTP request completes. It will reject if
 * the fetch call fails (for example, due to network errors). This function does not perform additional
 * validation of the HTTP response status.
 *
 * @async
 * @function deleteAllEmails
 * @returns {Promise<void>} Resolves when the DELETE request completes.
 * @throws {TypeError|Error} If global fetch is not available or the network request fails.
 * @example
 * // Ensure EMAIL_HTTP_HOST and EMAIL_HTTP_PORT are set, then:
 * await deleteAllEmails();
 */
async function deleteAllEmails() {
  await fetch(`${EMAIL_HTTP_URL}/messages`, {
    method: "DELETE",
  });
}

/**
 * Fetches the most recent email from the configured HTTP email service and returns it
 * with its plain-text body attached.
 *
 * The function performs the following steps:
 *  1. Requests the list of messages from `${EMAIL_HTTP_URL}/messages`.
 *  2. Selects the last item from the returned list.
 *  3. Requests the plain-text body for that message from
 *     `${EMAIL_HTTP_URL}/messages/{id}.plain`.
 *  4. Attaches the retrieved text to the selected message object as the `text` property
 *     and returns that object.
 *
 * @async
 * @returns {Promise<Object>} A promise that resolves to the last email item augmented
 * with a `text` property containing the plain-text body. The returned object typically
 * includes at least `{ id: string, ... }` plus `text: string`.
 * @throws {Error} If the message list is empty or if any network/fetch operation fails.
 */
async function getLastEmail() {
  const emailListResponse = await fetch(`${EMAIL_HTTP_URL}/messages`);
  const emailListBody = await emailListResponse.json();
  const lastEmailItem = emailListBody.pop();
  const emailTextResponse = await fetch(
    `${EMAIL_HTTP_URL}/messages/${lastEmailItem.id}.plain`,
  );
  const emailTextBody = await emailTextResponse.text();
  lastEmailItem.text = emailTextBody;
  return lastEmailItem;
}

const orchestrator = {
  waitForAllServices,
  clearDatabase,
  runPendingMigrations,
  createUser,
  createSession,
  deleteAllEmails,
  getLastEmail,
};

export default orchestrator;
