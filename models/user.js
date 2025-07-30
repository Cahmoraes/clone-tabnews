import database from "infra/database";
import { ValidationError, NotFoundError } from "infra/errors";
import password from "models/password";

/**
 *
 * @param {String} username
 */
async function findOneByUsername(username) {
  const userFound = await runSelectQuery(username);
  return userFound;

  async function runSelectQuery(username) {
    const results = await database.query({
      text: `
        SELECT 
          *
        FROM 
          users
        WHERE 
          LOWER(username) = LOWER($1)
        LIMIT
          1
        ;`,
      values: [username],
    });
    if (results.rowCount === 0) {
      throw new NotFoundError({
        message: "O username informado não foi encontrado no sistema.",
        action: "Verifique se o username esta digitado corretamente.",
      });
    }
    return results.rows[0];
  }
}

/**
 *
 * @param {String} email
 */
async function findOneByEmail(email) {
  const userFound = await runSelectQuery(email);
  return userFound;

  async function runSelectQuery(email) {
    const results = await database.query({
      text: `
        SELECT 
          *
        FROM 
          users
        WHERE 
          LOWER(email) = LOWER($1)
        LIMIT
          1
        ;`,
      values: [email],
    });
    if (results.rowCount === 0) {
      throw new NotFoundError({
        message: "O email informado não foi encontrado no sistema.",
        action: "Verifique se o email esta digitado corretamente.",
      });
    }
    return results.rows[0];
  }
}

async function create(userInputValues) {
  await validateUniqueUsername(userInputValues.username);
  await validateUniqueEmail(userInputValues.email);
  await hashPasswordInObject(userInputValues);
  const newUser = await runInsertQuery(userInputValues);
  return newUser;

  async function runInsertQuery(userInputValues) {
    const result = await database.query({
      text: `
        INSERT INTO 
          users (username, email, password) 
        VALUES 
          ($1, $2, $3)
        RETURNING
          *
        ;`,
      values: [
        userInputValues.username,
        userInputValues.email,
        userInputValues.password,
      ],
    });
    return result.rows[0];
  }
}

/**
 * @typedef {Object} UserInputValues
 * @property {string} username - The user's username
 * @property {string} email - The user's email address
 * @property {string} password - The user's password
 */

/**
 * @param {string} username
 * @param {UserInputValues} userInputValues
 */
async function update(username, userInputValues) {
  const currentUser = await findOneByUsername(username);
  if (hasProperty("username")) {
    await validateUniqueUsername(userInputValues.username);
  }
  if (hasProperty("email")) {
    await validateUniqueEmail(userInputValues.email);
  }
  if (hasProperty("password")) {
    await hashPasswordInObject(userInputValues);
  }
  const userWithNewValues = {
    ...currentUser,
    ...userInputValues,
  };
  return runUpdateQuery(userWithNewValues);

  function hasProperty(property) {
    return userInputValues && Reflect.has(userInputValues, property);
  }

  async function runUpdateQuery(userWithNewValues) {
    const result = await database.query({
      text: `
        UPDATE
          users
        SET
          username = $2,
          email = $3,
          password = $4,
          updated_at = timezone('utc', now())
        WHERE
          id = $1
        RETURNING
          *
        ;`,
      values: [
        userWithNewValues.id,
        userWithNewValues.username,
        userWithNewValues.email,
        userWithNewValues.password,
      ],
    });
    return result.rows[0];
  }
}

async function validateUniqueUsername(username) {
  const results = await database.query({
    text: `
      SELECT 
        username
      FROM 
        users
      WHERE 
        LOWER(username) = LOWER($1)
      ;`,
    values: [username],
  });
  if (results.rowCount > 0) {
    throw new ValidationError({
      message: "O username informado já está sendo utilizado.",
      action: "Utilize outro username para realizar esta operação.",
    });
  }
}

async function validateUniqueEmail(email) {
  const results = await database.query({
    text: `
      SELECT 
        email
      FROM 
        users
      WHERE 
        LOWER(email) = LOWER($1)
      ;`,
    values: [email],
  });
  if (results.rowCount > 0) {
    throw new ValidationError({
      message: "O e-mail já está sendo utilizado.",
      action: "Utilize outro e-mail para realizar esta operação.",
    });
  }
}

async function hashPasswordInObject(userInputValues) {
  const hashedPassword = await password.hash(userInputValues.password);
  userInputValues.password = hashedPassword;
}

const user = {
  create,
  findOneByUsername,
  findOneByEmail,
  update,
};

export default user;
