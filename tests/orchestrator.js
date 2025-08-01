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

async function clearDatabase() {
  await database.query("drop schema public cascade; create schema public;");
}

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
