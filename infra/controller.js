import * as cookie from "cookie"
import { authorization } from "models/authorization"
import session from "models/session"
import user from "models/user"
import {
	ForbiddenError,
	InternalServerError,
	MethodNotAllowedError,
	NotFoundError,
	UnauthorizedError,
	ValidationError,
} from "./errors"

function onNoMatchHandler(_request, response) {
	const publicErrorObject = new MethodNotAllowedError()
	response.status(publicErrorObject.statusCode).json(publicErrorObject)
}

function onErrorHandler(error, _request, response) {
	if (
		error instanceof ValidationError ||
		error instanceof NotFoundError ||
		error instanceof ForbiddenError
	) {
		return response.status(error.statusCode).json(error)
	}
	if (error instanceof UnauthorizedError) {
		clearSessionCookie(response)
		return response.status(error.statusCode).json(error)
	}
	const publicErrorObject = new InternalServerError({
		cause: error,
	})
	console.log("\n Error dentro do catch do next-connect:")
	console.error(publicErrorObject)
	response.status(publicErrorObject.statusCode).json(publicErrorObject)
}

function setSessionCookie(sessionToken, response) {
	const setCookie = cookie.serialize("session_id", sessionToken, {
		path: `/`,
		maxAge: session.EXPIRATION_IN_MILLISECONDS / 1000,
		secure: process.env.NODE_ENV === "production",
		httpOnly: true,
		sameSite: "lax",
	})
	response.setHeader("Set-Cookie", setCookie)
}

function clearSessionCookie(response) {
	const setCookie = cookie.serialize("session_id", "invalid", {
		path: `/`,
		maxAge: -1,
		secure: process.env.NODE_ENV === "production",
		httpOnly: true,
		sameSite: "lax",
	})
	response.setHeader("Set-Cookie", setCookie)
}

async function injectAnonymousOrUser(request, _response, next) {
	// 1. Se o cookie `session_id` existe, injetar o usuário
	if (request.cookies?.session_id) {
		await injectAuthenticatedUser(request)
		return next()
	}
	// 2. Se não existir, injetar usuário anônimo.
	injectAnonymousUser(request)
	return next()
}

async function injectAuthenticatedUser(request) {
	const sessionToken = request.cookies.session_id
	const sessionObject = await session.findOneValidByToken(sessionToken)
	const userObject = await user.findOneById(sessionObject.user_id)
	request.context = {
		...request.context,
		user: userObject,
	}
}

function injectAnonymousUser(request) {
	const anonymousUserObject = {
		features: ["read:activation_token", "create:session", "create:user"],
	}
	request.context = {
		...request.context,
		user: anonymousUserObject,
	}
}

/**
 * Creates a middleware function that checks if a user has permission to access a specific feature.
 *
 * @param {string} feature - The feature name to check authorization for
 * @returns {Function} An Express middleware function that validates user permissions
 * @throws {ForbiddenError} When the user doesn't have permission for the specified feature
 *
 * @example
 * Usage in an Express route
 * app.get('/admin', canRequest('admin_access'), (req, res) => {
 *   res.json({ message: 'Admin panel' });
 * });
 */
function canRequest(feature) {
	return async function canRequestMiddleware(request, _response, next) {
		const userTryingToRequest = request.context.user
		if (authorization.can(userTryingToRequest, feature)) {
			return next()
		}
		throw new ForbiddenError({
			message: "Você não possui permissão para executar esta ação.",
			action: `Verifique se o seu usuário possui a feature: "${feature}"`,
		})
	}
}

export const controller = {
	errorHandlers: {
		onNoMatch: onNoMatchHandler,
		onError: onErrorHandler,
	},
	setSessionCookie,
	clearSessionCookie,
	injectAnonymousOrUser,
	canRequest,
}
