import { controller } from "infra/controller"
import { ForbiddenError } from "infra/errors"
import authentication from "models/authentication"
import { authorization } from "models/authorization"
import session from "models/session"
import { createRouter } from "next-connect"

export default createRouter()
	.use(controller.injectAnonymousOrUser)
	.post(controller.canRequest("create:session"), postHandler)
	.delete(deleteHandler)
	.handler(controller.errorHandlers)

async function postHandler(request, response) {
	const userInputValues = request.body
	const authenticatedUser = await authentication.getUser(
		userInputValues.email,
		userInputValues.password,
	)
	if (authorization.cannot(authenticatedUser, "create:session")) {
		throw new ForbiddenError({
			message: "Você não possui permissão para fazer login.",
			action: "Contate o suporte caso você acredite que isto seja um erro.",
		})
	}
	const newSession = await session.create(authenticatedUser.id)
	controller.setSessionCookie(newSession.token, response)
	const secureOutputValues = authorization.filterOutput(
		authenticatedUser,
		"read:session",
		newSession,
	)
	return response.status(201).json(secureOutputValues)
}

async function deleteHandler(request, response) {
	const userTryingToDelete = request.context.user
	const sessionToken = request.cookies.session_id
	const sessionObject = await session.findOneValidByToken(sessionToken)
	const expiredSession = await session.expireById(sessionObject.id)
	controller.clearSessionCookie(response)
	const secureOutputValues = authorization.filterOutput(
		userTryingToDelete,
		"read:session",
		expiredSession,
	)
	return response.status(200).json(secureOutputValues)
}
