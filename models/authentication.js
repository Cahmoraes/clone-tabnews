import { NotFoundError, UnauthorizedError } from "infra/errors";
import password from "./password";
import user from "./user";

/**
 * Authenticates a user by validating the provided email and password.
 *
 * @async
 * @function getAuthenticatedUser
 * @param {string} providedEmail - The email address provided by the user attempting to authenticate.
 * @param {string} providedPassword - The password provided by the user attempting to authenticate.
 * @returns {Promise<Object>} The user object if authentication is successful, containing user information like id, email, name, etc.
 * @throws {UnauthorizedError} Thrown when the email doesn't exist or the password doesn't match.
 * @throws {Error} Propagates any other errors that might occur during the authentication process.
 */
async function getAuthenticatedUser(providedEmail, providedPassword) {
  try {
    const storedUser = await findUserByEmail(providedEmail);
    await validatePassword(providedPassword, storedUser.password);
    return storedUser;
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      throw new UnauthorizedError({
        message: "Dados de autenticação não conferem.",
        action: "Verifique se os dados enviados estão corretos.",
      });
    }
    throw error;
  }

  async function findUserByEmail(providedEmail) {
    try {
      return await user.findOneByEmail(providedEmail);
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw new UnauthorizedError({
          message: "Email não confere.",
          action: "Verifique se este dado está correto.",
        });
      }
      throw error;
    }
  }

  async function validatePassword(providedPassword, storedPassword) {
    const correctPasswordMatch = await password.compare(
      providedPassword,
      storedPassword,
    );
    if (!correctPasswordMatch) {
      throw new UnauthorizedError({
        message: "Dados de autenticação não conferem.",
        action: "Verifique se este dado está correto.",
      });
    }
  }
}

const authentication = {
  getAuthenticatedUser,
};

export default authentication;
