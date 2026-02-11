/**
 * Check whether a user is authorized for a specific feature.
 *
 * @param {Object} user - The user object.
 * @param {Array<string>} user.features - Array of feature identifiers the user has access to.
 * @param {string} feature - The feature identifier to check.
 * @returns {boolean} True if the user's features include the specified feature, otherwise false.
 */
function can(user, feature) {
	let authorized = false
	if (user.features.includes(feature)) {
		authorized = true
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
function cannot(user, feature) {
	return !can(user, feature)
}

export const authorization = {
	can,
	cannot,
}
