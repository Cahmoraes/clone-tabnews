import retry from "async-retry";
import database from "infra/database";
import migrator from "models/migrator";
import user from "models/user";
import { faker } from "@faker-js/faker";
import session from "models/session";

async function waitForAllServices() {
  await waitForWebServer();

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

const orchestrator = {
  waitForAllServices,
  clearDatabase,
  runPendingMigrations,
  createUser,
  createSession,
};

export default orchestrator;
