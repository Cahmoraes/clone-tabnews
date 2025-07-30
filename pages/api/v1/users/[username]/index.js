import { createRouter } from "next-connect";
import { controller } from "infra/controller";
import user from "models/user";

const router = createRouter();

router.get(getHandler);
router.patch(patchHandler);

export default router.handler(controller.errorHandlers);

/**
 * Handles GET requests to retrieve user information by username.
 *
 * @param {Object} request - The HTTP request object.
 * @param {Object} request.query - The query parameters of the request.
 * @param {string} request.query.username - The username to search for.
 * @param {Object} response - The HTTP response object.
 * @returns {Promise<void>} - A promise that resolves when the response is sent.
 */
async function getHandler(request, response) {
  const username = request.query.username;
  const userFound = await user.findOneByUsername(username);
  return response.status(200).json(userFound);
}

/**
 * Handles PATCH requests to patch user information by username.
 *
 * @param {Object} request - The HTTP request object.
 * @param {Object} request.query - The query parameters of the request.
 * @param {string} request.query.username - The username to search for.
 * @param {Object} response - The HTTP response object.
 * @returns {Promise<void>} - A promise that resolves when the response is sent.
 */
async function patchHandler(request, response) {
  const username = request.query.username;
  const userInputValues = request.body;
  const updatedUser = await user.update(username, userInputValues);
  return response.status(200).json(updatedUser);
}
