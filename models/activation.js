import database from "infra/database"
import { email } from "infra/email"
import { ForbiddenError, NotFoundError } from "infra/errors"
import { webserver } from "infra/webserver"
import { authorization } from "./authorization"
import user from "./user"

const EXPIRATION_IN_MILLISECONDS = 1000 * 60 * 15 // 15 minutos

async function create(userId) {
	const expiresAt = new Date(Date.now() + EXPIRATION_IN_MILLISECONDS)
	const newToken = await runInsertQuery(userId, expiresAt)
	return newToken

	async function runInsertQuery(userId, expiresAt) {
		const results = await database.query({
			text: /*SQL*/ `
        INSERT INTO
          user_activation_tokens (user_id, expires_at)
      VALUES
        ($1, $2)
      RETURNING
        *
      ;`,
			values: [userId, expiresAt],
		})
		return results.rows[0]
	}
}

async function sendEmailToUser(user, activationToken) {
	await email.send({
		from: "FinTab <contato@fintab.com.br>",
		to: user.email,
		subject: "Ative seu cadastro no FinTab!",
		text: `${user.username}, clique no link abaixo para ativar seu cadastro no FinTab!
  ${webserver.origin}/cadastro/ativar/${activationToken.id}
  
  Atenciosamente,
  Equipe FinTab`,
	})
}

async function findOneValidById(tokenId) {
	const activationTokenObject = await runSelectQuery(tokenId)
	return activationTokenObject

	async function runSelectQuery(tokenId) {
		const results = await database.query({
			text: /*SQL*/ `
        SELECT 
          * 
        FROM
          user_activation_tokens
        WHERE
          id = $1
          AND expires_at > NOW()
          AND used_at IS NULL
        LIMIT
          1
      ;`,
			values: [tokenId],
		})
		if (results.rowCount === 0) {
			throw new NotFoundError({
				message:
					"O token de ativação não foi encontrado no sistema ou expirou.",
				action: "Faça um novo cadastro.",
			})
		}
		return results.rows[0]
	}
}

async function markTokenAsUsed(activationTokenId) {
	const usedActivationToken = await runUpdateQuery(activationTokenId)
	return usedActivationToken

	async function runUpdateQuery(activationTokenId) {
		const results = await database.query({
			text: /*SQL*/ `
        UPDATE
          user_activation_tokens
        SET
          used_at = timezone('utc', now()),
          updated_at = timezone('utc', now())
        WHERE
          id = $1
        RETURNING
          *
      ;`,
			values: [activationTokenId],
		})
		return results.rows[0]
	}
}

/**
 * Activate a user by their user ID.
 *
 * This function finds the user by ID, verifies the user is allowed to use an activation token,
 * and updates the user's features to grant session-related permissions ("create:session",
 * "read:session").
 *
 * @async
 * @function activateUserByUserId
 * @param {string|number} userId - The identifier of the user to activate.
 * @returns {Promise<Object>} A promise that resolves to the updated user object with the new features.
 * @throws {ForbiddenError} If the user is not allowed to use activation tokens (authorization.cannot check fails).
 * @throws {Error} If the user cannot be found or if a database/operation error occurs.
 */
async function activateUserByUserId(userId) {
	const userToActive = await user.findOneById(userId)
	if (authorization.cannot(userToActive, "read:activation_token")) {
		throw new ForbiddenError({
			message: "Você nao pode mais utilizar tokens de ativação.",
			action: "Entre em contato com o suporte",
		})
	}
	const activatedUser = await user.setFeatures(userId, [
		"create:session",
		"read:session",
		"create:user",
	])
	return activatedUser
}

export const activation = {
	sendEmailToUser,
	create,
	findOneValidById,
	markTokenAsUsed,
	activateUserByUserId,
	EXPIRATION_IN_MILLISECONDS,
}
