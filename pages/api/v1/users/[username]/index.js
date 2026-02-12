import { controller } from "infra/controller"
import { ForbiddenError } from "infra/errors"
import { authorization } from "models/authorization"
import user from "models/user"
import { createRouter } from "next-connect"

const router = createRouter()
router.use(controller.injectAnonymousOrUser)
router.get(getHandler)
router.patch(patchHandler)
export default router.handler(controller.errorHandlers)

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
	const username = request.query.username
	const userFound = await user.findOneByUsername(username)
	return response.status(200).json(userFound)
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
	const username = request.query.username
	const userInputValues = request.body
	const userTryingToPatch = request.context.user
	const targetUser = await user.findOneByUsername(username)
	if (authorization.cannot(userTryingToPatch, "update:user", targetUser)) {
		throw new ForbiddenError({
			message: "Você não possui permissão para atualizar outro usuário.",
			action:
				"Verifique se você possui a feature necessária para atualizar outro usuário.",
		})
	}
	const updatedUser = await user.update(username, userInputValues)
	if (userTryingToPatch.id !== targetUser.id) {
		return response.status(200).json(updatedUser)
	}
	const { features: _features, ...sanitizedUser } = updatedUser
	return response.status(200).json(sanitizedUser)
}
