import { InternalServerError } from "infra/errors"

const availableFeatures = [
	// USER
	"create:user",
	"read:user",
	"read:user:self",
	"update:user",
	"update:user:others",
	// SESSION
	"create:session",
	"read:session",
	// ACTIVATION_TOKEN
	"read:activation_token",
	// MIGRATION
	"create:migration",
	"read:migration",
	// STATUS
	"read:status",
	"read:status:all",
]

/**
 * Check whether a user is authorized for a specific feature.
 *
 * @param {Object} user - The user object.
 * @param {Array<string>} user.features - Array of feature identifiers the user has access to.
 * @param {string} feature - The feature identifier to check.
 * @returns {boolean} True if the user's features include the specified feature, otherwise false.
 */
function can(user, feature, resource) {
	validateUser(user)
	validateFeature(feature)
	let authorized = false
	if (user.features.includes(feature)) {
		authorized = true
	}
	if (feature === "update:user" && resource) {
		authorized = false
		if (user.id === resource.id || can(user, "update:user:others")) {
			authorized = true
		}
	}
	return authorized
}

/**
 * Determine whether a user lacks permission for a given feature.
 *
 * Delegates to the corresponding `can` check and returns its negation.
 *
 * @param {Object|string|number} user - The user (object or identifier) to evaluate.
 * @param {string} feature - The feature name or permission to check.
 * @returns {boolean} True if the user does not have access to the feature; otherwise false.
 * @see can
 */
function cannot(user, feature, resource) {
	return !can(user, feature, resource)
}

function filterOutput(user, feature, resource) {
	validateUser(user)
	validateFeature(feature)
	validateResource(resource)
	if (feature === "read:user") {
		return {
			id: resource.id,
			username: resource.username,
			features: resource.features,
			created_at: resource.created_at,
			updated_at: resource.updated_at,
		}
	}
	if (feature === "read:user:self") {
		if (user.id === resource.id) {
			return {
				id: resource.id,
				username: resource.username,
				email: resource.email,
				features: resource.features,
				created_at: resource.created_at,
				updated_at: resource.updated_at,
			}
		}
	}
	if (feature === "read:session") {
		if (user.id === resource.user_id) {
			return {
				id: resource.id,
				token: resource.token,
				user_id: resource.user_id,
				created_at: resource.created_at,
				updated_at: resource.updated_at,
				expires_at: resource.expires_at,
			}
		}
	}
	if (feature === "read:activation_token") {
		return {
			id: resource.id,
			user_id: resource.user_id,
			created_at: resource.created_at,
			updated_at: resource.updated_at,
			expires_at: resource.expires_at,
			used_at: resource.used_at,
		}
	}
	if (feature === "read:migration") {
		return resource.map((migration) => {
			return {
				path: migration.path,
				name: migration.name,
				timestamp: migration.timestamp,
			}
		})
	}
	if (feature === "read:status") {
		const output = {
			updated_at: resource.updated_at,
			dependencies: {
				database: {
					max_connections: resource.dependencies.database.max_connections,
					opened_connections: resource.dependencies.database.opened_connections,
				},
			},
		}
		if (can(user, "read:status:all")) {
			output.dependencies.database.version =
				resource.dependencies.database.version
		}
		return output
	}
}

function validateUser(user) {
	if (!user || !user.features) {
		throw new InternalServerError({
			cause: "É necessário fornecer `user` no model `authorization`.",
		})
	}
}

function validateFeature(feature) {
	if (!feature || !availableFeatures.includes(feature)) {
		throw new InternalServerError({
			cause:
				"É necessário fornecer uma `feature` conhecida no model `authorization`.",
		})
	}
}

function validateResource(resource) {
	if (!resource) {
		throw new InternalServerError({
			cause: "É necessário fornecer um `resource` no model `authorization`.",
		})
	}
}

export const authorization = {
	can,
	cannot,
	filterOutput,
}
